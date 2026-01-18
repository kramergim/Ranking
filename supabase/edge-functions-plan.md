# Swiss Taekwondo - Plan détaillé des Edge Functions

## Vue d'ensemble

4 Edge Functions principales pour automatiser les calculs et publications :

1. **calculate-points** : Calcul déterministe des points après saisie résultats
2. **publish-ranking-snapshot** : Génération et publication d'un snapshot mensuel
3. **evaluate-eligibility** : Évaluation automatique de l'éligibilité pour une sélection
4. **publish-selection** : Publication finale d'une sélection

---

## 1. Edge Function: `calculate-points`

### Trigger
- Appelée automatiquement via webhook Supabase après INSERT/UPDATE sur table `results`
- OU appelée manuellement (bouton "Recalculer" dans l'interface admin)

### Paramètres d'entrée
```typescript
interface CalculatePointsRequest {
  result_id: string; // ID du résultat à calculer
  scoring_rule_id?: string; // Optionnel: forcer une règle spécifique (sinon règle active)
}
```

### Logique détaillée

#### Étape 1: Récupération des données
```typescript
// 1. Récupérer le résultat
const result = await supabase
  .from('results')
  .select('*, event:events(*), matches(*)')
  .eq('id', result_id)
  .single();

// 2. Récupérer la règle de calcul
const scoringRule = scoring_rule_id
  ? await supabase.from('scoring_rules').select('*').eq('id', scoring_rule_id).single()
  : await supabase.from('scoring_rules').select('*').eq('is_active', true).single();

const formula = scoringRule.formula;
```

#### Étape 2: Validation des contraintes
```typescript
// Exemple de formule:
// {
//   "base_points": { "1": 100, "2": 70, "3": 50, "5": 30, "7": 20, "9": 10 },
//   "match_bonus_per_win": 5,
//   "min_matches_for_medal": 3,
//   "apply_coefficient": true
// }

// Vérifier contrainte "minimum de matchs pour médaille"
const isMedal = result.final_rank <= 3;
const minMatchesForMedal = formula.min_matches_for_medal || 0;

if (isMedal && result.matches_won < minMatchesForMedal) {
  // Médaille invalidée
  return {
    points: 0,
    explanation: `Médaille ${result.final_rank}e invalidée : seulement ${result.matches_won} victoire(s), minimum ${minMatchesForMedal} requis.`
  };
}
```

#### Étape 3: Calcul des points
```typescript
// Points de base selon place finale
const basePoints = formula.base_points[result.final_rank.toString()] || 0;

// Bonus par match gagné
const matchBonus = result.matches_won * (formula.match_bonus_per_win || 0);

// Total avant coefficient
let totalPoints = basePoints + matchBonus;

// Appliquer coefficient du tournoi si activé
if (formula.apply_coefficient && result.event.coefficient) {
  totalPoints *= result.event.coefficient;
}

// Arrondir à 2 décimales
totalPoints = Math.round(totalPoints * 100) / 100;
```

#### Étape 4: Génération de l'explication textuelle
```typescript
// Construire explication lisible pour audit
let explanation = '';

if (isMedal && result.matches_won < minMatchesForMedal) {
  explanation = `Médaille ${result.final_rank}e invalidée : ${result.matches_won} victoire(s) < ${minMatchesForMedal} requis → 0 pt`;
} else {
  const parts = [];

  if (basePoints > 0) {
    parts.push(`${basePoints} pts (${result.final_rank}e place)`);
  }

  if (matchBonus > 0) {
    parts.push(`${matchBonus} pts (${result.matches_won} victoires × ${formula.match_bonus_per_win})`);
  }

  let subtotal = basePoints + matchBonus;
  explanation = parts.join(' + ');

  if (formula.apply_coefficient && result.event.coefficient !== 1) {
    explanation += ` × ${result.event.coefficient} (coeff.) = ${totalPoints} pts`;
  } else {
    explanation += ` = ${totalPoints} pts`;
  }

  // Ajouter contexte événement
  explanation += ` | ${result.event.name} (${result.event.event_type})`;
}
```

#### Étape 5: Mise à jour de la base de données
```typescript
await supabase
  .from('results')
  .update({
    points_earned: totalPoints,
    calculation_explanation: explanation,
    scoring_rule_id: scoringRule.id,
    updated_at: new Date().toISOString()
  })
  .eq('id', result_id);
```

### Réponse
```typescript
interface CalculatePointsResponse {
  success: boolean;
  result_id: string;
  points_earned: number;
  calculation_explanation: string;
  scoring_rule_version: string;
}
```

### Cas limites à gérer
- **Résultat sans matchs** : Si `matches_won = 0`, appliquer quand même points de base (sauf si médaille et contrainte active)
- **Place finale hors barème** : Si `final_rank` non trouvé dans `base_points`, retourner 0
- **Coefficient invalide** : Si `event.coefficient` est NULL ou <= 0, traiter comme 1.0
- **Règle de calcul manquante** : Retourner erreur explicite

---

## 2. Edge Function: `publish-ranking-snapshot`

### Trigger
- Appelée manuellement (bouton "Publier snapshot" dans l'interface admin)

### Paramètres d'entrée
```typescript
interface PublishSnapshotRequest {
  snapshot_id: string; // ID du snapshot à publier
  generate_pdf?: boolean; // Optionnel: générer le PDF (défaut: true)
}
```

### Logique détaillée

#### Étape 1: Vérifications préalables
```typescript
// 1. Vérifier que snapshot existe et n'est pas déjà publié
const snapshot = await supabase
  .from('ranking_snapshots')
  .select('*')
  .eq('id', snapshot_id)
  .single();

if (snapshot.is_published) {
  throw new Error('Ce snapshot est déjà publié et immuable');
}

// 2. Vérifier que les données snapshot existent déjà
const existingData = await supabase
  .from('ranking_snapshot_data')
  .select('id')
  .eq('snapshot_id', snapshot_id);

if (existingData.length === 0) {
  throw new Error('Aucune donnée générée. Générer les données du snapshot d\'abord.');
}
```

#### Étape 2: Génération du PDF (optionnel)
```typescript
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Récupérer les données du snapshot
const snapshotData = await supabase
  .from('ranking_snapshot_data')
  .select('*')
  .eq('snapshot_id', snapshot_id)
  .order('rank_position', { ascending: true });

// Créer le PDF
const doc = new jsPDF();

// En-tête
doc.setFontSize(18);
doc.text(snapshot.title, 20, 20);
doc.setFontSize(12);
doc.text(`Publié le ${new Date().toLocaleDateString('fr-CH')}`, 20, 30);

// Tableau
const tableData = snapshotData.map(row => [
  row.rank_position,
  row.athlete_name,
  row.athlete_age_category || '-',
  row.athlete_weight_category || '-',
  row.athlete_club || '-',
  row.total_points.toFixed(2),
  row.tournaments_count,
  row.best_result_rank || '-'
]);

doc.autoTable({
  startY: 40,
  head: [['#', 'Athlète', 'Âge', 'Poids', 'Club', 'Points', 'Tournois', 'Meilleur']],
  body: tableData,
  theme: 'striped',
  styles: { fontSize: 9 }
});

// Générer le buffer PDF
const pdfBuffer = doc.output('arraybuffer');
```

#### Étape 3: Upload du PDF vers Supabase Storage
```typescript
const fileName = `${snapshot.snapshot_year}-${snapshot.snapshot_month.toString().padStart(2, '0')}-ranking.pdf`;
const filePath = `rankings/${fileName}`;

const { data: uploadData, error: uploadError } = await supabase.storage
  .from('public-documents')
  .upload(filePath, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true
  });

if (uploadError) throw uploadError;

// Récupérer l'URL publique
const { data: { publicUrl } } = supabase.storage
  .from('public-documents')
  .getPublicUrl(filePath);
```

#### Étape 4: Publication du snapshot
```typescript
await supabase
  .from('ranking_snapshots')
  .update({
    is_published: true,
    published_at: new Date().toISOString(),
    published_by: userId, // ID de l'utilisateur (récupéré du contexte)
    pdf_url: publicUrl,
    pdf_generated_at: new Date().toISOString()
  })
  .eq('id', snapshot_id);
```

### Réponse
```typescript
interface PublishSnapshotResponse {
  success: boolean;
  snapshot_id: string;
  pdf_url: string;
  athletes_count: number;
  published_at: string;
}
```

---

## 3. Edge Function: `generate-snapshot-data`

### Trigger
- Appelée manuellement (bouton "Générer données" avant publication)

### Paramètres d'entrée
```typescript
interface GenerateSnapshotDataRequest {
  snapshot_id: string;
}
```

### Logique détaillée

#### Étape 1: Vérifications
```typescript
const snapshot = await supabase
  .from('ranking_snapshots')
  .select('*')
  .eq('id', snapshot_id)
  .single();

if (snapshot.is_published) {
  throw new Error('Snapshot déjà publié, impossible de régénérer les données');
}

// Supprimer anciennes données si existantes
await supabase
  .from('ranking_snapshot_data')
  .delete()
  .eq('snapshot_id', snapshot_id);
```

#### Étape 2: Copie du ranking live
```typescript
// Récupérer le ranking live actuel
const rankingLive = await supabase
  .from('ranking_live')
  .select('*')
  .order('rank_position', { ascending: true });

// Insérer dans snapshot_data
const snapshotData = rankingLive.map(row => ({
  snapshot_id: snapshot_id,
  athlete_id: row.athlete_id,
  athlete_name: row.full_name,
  athlete_age_category: row.age_category,
  athlete_weight_category: row.weight_category,
  athlete_gender: row.gender,
  athlete_club: row.club,
  rank_position: row.rank_position,
  total_points: row.total_points,
  tournaments_count: row.tournaments_count,
  best_result_rank: row.best_rank,
  best_result_event: row.best_result_event
}));

await supabase
  .from('ranking_snapshot_data')
  .insert(snapshotData);
```

### Réponse
```typescript
interface GenerateSnapshotDataResponse {
  success: boolean;
  snapshot_id: string;
  athletes_count: number;
  generated_at: string;
}
```

---

## 4. Edge Function: `evaluate-eligibility`

### Trigger
- Appelée manuellement (bouton "Évaluer éligibilité" dans l'interface sélection)
- OU via cron quotidien pour mise à jour automatique

### Paramètres d'entrée
```typescript
interface EvaluateEligibilityRequest {
  selection_event_id: string;
}
```

### Logique détaillée

#### Étape 1: Récupération des critères
```typescript
const selectionEvent = await supabase
  .from('selection_events')
  .select('*')
  .eq('id', selection_event_id)
  .single();

const criteria = await supabase
  .from('eligibility_criteria')
  .select('*')
  .eq('selection_event_id', selection_event_id)
  .order('display_order', { ascending: true });
```

#### Étape 2: Récupération des athlètes actifs + ranking
```typescript
const athletes = await supabase
  .from('ranking_live')
  .select('*')
  .order('rank_position', { ascending: true });
```

#### Étape 3: Évaluation de chaque athlète
```typescript
for (const athlete of athletes) {
  let isEligible = true;
  const eligibilityDetails = {};

  for (const criterion of criteria) {
    const criterionData = criterion.criterion;
    const result = await evaluateCriterion(athlete, criterionData);

    eligibilityDetails[criterion.id] = result;

    if (!result.met) {
      isEligible = false;
    }
  }

  // Insérer ou mettre à jour dans eligible_athletes
  await supabase
    .from('eligible_athletes')
    .upsert({
      selection_event_id: selection_event_id,
      athlete_id: athlete.athlete_id,
      is_eligible: isEligible,
      eligibility_details: eligibilityDetails,
      total_points: athlete.total_points,
      rank_position: athlete.rank_position,
      evaluated_at: new Date().toISOString()
    });
}
```

#### Étape 4: Fonction d'évaluation par type de critère
```typescript
async function evaluateCriterion(athlete, criterionData) {
  switch (criterionData.type) {
    case 'min_points':
      return {
        type: 'min_points',
        met: athlete.total_points >= criterionData.value,
        value: athlete.total_points,
        required: criterionData.value,
        description: `${athlete.total_points} / ${criterionData.value} points min`
      };

    case 'min_tournaments':
      return {
        type: 'min_tournaments',
        met: athlete.tournaments_count >= criterionData.value,
        value: athlete.tournaments_count,
        required: criterionData.value,
        description: `${athlete.tournaments_count} / ${criterionData.value} tournois min`
      };

    case 'mandatory_event':
      // Vérifier participation à un événement spécifique
      const participation = await supabase
        .from('results')
        .select('id')
        .eq('athlete_id', athlete.athlete_id)
        .eq('event_id', criterionData.event_id)
        .single();

      return {
        type: 'mandatory_event',
        met: !!participation,
        event_name: criterionData.event_name,
        description: participation
          ? `✓ Participation à ${criterionData.event_name}`
          : `✗ Participation requise à ${criterionData.event_name}`
      };

    case 'max_age':
      const age = calculateAge(athlete.date_of_birth);
      return {
        type: 'max_age',
        met: age <= criterionData.value,
        value: age,
        required: criterionData.value,
        description: `${age} / ${criterionData.value} ans max`
      };

    default:
      return {
        type: 'unknown',
        met: false,
        description: 'Critère non reconnu'
      };
  }
}
```

### Réponse
```typescript
interface EvaluateEligibilityResponse {
  success: boolean;
  selection_event_id: string;
  total_athletes_evaluated: number;
  eligible_count: number;
  not_eligible_count: number;
  evaluated_at: string;
}
```

---

## 5. Edge Function: `publish-selection`

### Trigger
- Appelée manuellement (bouton "Publier sélection" dans l'interface admin)

### Paramètres d'entrée
```typescript
interface PublishSelectionRequest {
  selection_event_id: string;
}
```

### Logique détaillée

#### Étape 1: Vérifications
```typescript
const selectionEvent = await supabase
  .from('selection_events')
  .select('*')
  .eq('id', selection_event_id)
  .single();

if (selectionEvent.is_published) {
  throw new Error('Cette sélection est déjà publiée');
}

// Vérifier qu'il y a des décisions finales
const decisions = await supabase
  .from('selection_decisions')
  .select('id')
  .eq('selection_event_id', selection_event_id);

if (decisions.length === 0) {
  throw new Error('Aucune décision finale enregistrée');
}
```

#### Étape 2: Publication
```typescript
await supabase
  .from('selection_events')
  .update({
    status: 'published',
    is_published: true,
    published_at: new Date().toISOString()
  })
  .eq('id', selection_event_id);
```

#### Étape 3: Notifications (optionnel, futur)
```typescript
// TODO: Envoyer emails aux athlètes sélectionnés
// TODO: Générer PDF de la liste finale
```

### Réponse
```typescript
interface PublishSelectionResponse {
  success: boolean;
  selection_event_id: string;
  selected_count: number;
  reserve_count: number;
  published_at: string;
}
```

---

## 6. Fonctions utilitaires partagées

### `calculateAge`
```typescript
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}
```

### `getUserRole`
```typescript
async function getUserRole(supabase, userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return data?.role || 'public';
}
```

### `requireRole`
```typescript
function requireRole(userRole: string, allowedRoles: string[]) {
  if (!allowedRoles.includes(userRole)) {
    throw new Error(`Accès refusé. Rôle requis: ${allowedRoles.join(' ou ')}`);
  }
}
```

---

## 7. Sécurité et validation

### Authentification
Toutes les Edge Functions doivent :
1. Vérifier la présence d'un token JWT valide
2. Récupérer le rôle de l'utilisateur
3. Valider les permissions selon le rôle

```typescript
// Début de chaque fonction
const authHeader = req.headers.get('Authorization');
if (!authHeader) throw new Error('Non authentifié');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: authHeader } } }
);

const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error('Non authentifié');

const userRole = await getUserRole(supabase, user.id);
requireRole(userRole, ['admin', 'selector']); // Selon la fonction
```

### Validation des entrées
```typescript
function validateCalculatePointsRequest(body: any): CalculatePointsRequest {
  if (!body.result_id || typeof body.result_id !== 'string') {
    throw new Error('result_id requis et doit être une string');
  }

  if (body.scoring_rule_id && typeof body.scoring_rule_id !== 'string') {
    throw new Error('scoring_rule_id doit être une string');
  }

  return body as CalculatePointsRequest;
}
```

---

## 8. Déploiement

### Structure des fichiers
```
supabase/
  functions/
    calculate-points/
      index.ts
    publish-ranking-snapshot/
      index.ts
    generate-snapshot-data/
      index.ts
    evaluate-eligibility/
      index.ts
    publish-selection/
      index.ts
    _shared/
      utils.ts
      types.ts
      validators.ts
```

### Commandes Supabase CLI
```bash
# Déployer toutes les fonctions
supabase functions deploy calculate-points
supabase functions deploy publish-ranking-snapshot
supabase functions deploy generate-snapshot-data
supabase functions deploy evaluate-eligibility
supabase functions deploy publish-selection

# Définir secrets (si nécessaire pour PDF, emails, etc.)
supabase secrets set SENDGRID_API_KEY=xxx
```

---

## 9. Tests

### Tests unitaires (Deno)
```typescript
// calculate-points.test.ts
Deno.test('calculatePoints - médaille avec matchs insuffisants', () => {
  const result = {
    final_rank: 1,
    matches_won: 2
  };

  const formula = {
    base_points: { "1": 100 },
    min_matches_for_medal: 3
  };

  const { points, explanation } = calculatePoints(result, formula);

  assertEquals(points, 0);
  assertStringIncludes(explanation, 'invalidée');
});
```

### Tests d'intégration (appels HTTP)
```bash
# Tester calculate-points localement
supabase functions serve calculate-points

curl -i --location --request POST 'http://localhost:54321/functions/v1/calculate-points' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"result_id":"123-456-789"}'
```

---

## 10. Monitoring et logs

### Logging structuré
```typescript
console.log(JSON.stringify({
  level: 'info',
  function: 'calculate-points',
  result_id: result_id,
  points_earned: totalPoints,
  timestamp: new Date().toISOString()
}));
```

### Supabase Dashboard
- Vérifier logs dans Supabase Dashboard > Edge Functions
- Monitorer erreurs et temps d'exécution
- Alertes si taux d'erreur > 5%

---

## Conclusion

Ces Edge Functions constituent le cœur de la logique métier du système :
- **Calcul déterministe** des points (transparent et auditable)
- **Snapshots immuables** (garantie d'intégrité)
- **Évaluation automatisée** de l'éligibilité (gain de temps)
- **Publication sécurisée** des données publiques

Prochaines étapes :
1. Implémenter les fonctions dans `supabase/functions/`
2. Tester unitairement chaque fonction
3. Déployer sur Supabase
4. Intégrer dans le frontend (appels via `supabase.functions.invoke()`)
