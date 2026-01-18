# Architecture Swiss Taekwondo - Ranking & Sélection

## Synthèse des choix architecturaux

- **Ranking** : Global unique (avec filtres catégorie/âge/poids/genre)
- **Période** : Continue (pas de saisons, un seul ranking actif)
- **Règles de calcul** : Versionnées avec recalcul possible
- **Sélections** : Par événement spécifique
- **Coefficients** : Définis par tournoi individuel
- **Résultats** : Détails complets des matchs
- **Critères d'éligibilité** : Configurables par événement de sélection

---

## 1. Schéma de base de données

### 1.1 Authentification et rôles

```sql
-- Supabase Auth gère auth.users
-- Extension avec profil et rôle
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'selector', 'public')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
```

### 1.2 Athlètes

```sql
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),

  -- Catégories actuelles (peuvent changer avec l'âge)
  age_category TEXT, -- 'Minimes', 'Cadets', 'Juniors', 'Seniors'
  weight_category TEXT, -- '-45kg', '-55kg', '-68kg', etc.

  license_number TEXT UNIQUE,
  club TEXT,
  email TEXT,
  phone TEXT,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_athletes_active ON athletes(is_active) WHERE is_active = true;
CREATE INDEX idx_athletes_category ON athletes(age_category, weight_category);
CREATE INDEX idx_athletes_name ON athletes(last_name, first_name);
```

### 1.3 Événements (tournois)

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  location TEXT,

  -- Type et niveau
  event_type TEXT NOT NULL, -- 'National', 'International', 'Open', etc.
  level TEXT, -- 'G1', 'G2', 'Championship', etc.

  -- Coefficient pour calcul points (individuel par tournoi)
  coefficient DECIMAL(3,2) NOT NULL DEFAULT 1.0,

  description TEXT,
  is_published BOOLEAN DEFAULT false, -- Visible au public ?

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_date ON events(event_date DESC);
CREATE INDEX idx_events_published ON events(is_published) WHERE is_published = true;
```

### 1.4 Résultats et matchs

```sql
-- Table principale des résultats (participation à un tournoi)
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Catégorie du tournoi (peut différer de la catégorie actuelle de l'athlète)
  age_category TEXT NOT NULL,
  weight_category TEXT NOT NULL,

  -- Place finale
  final_rank INTEGER NOT NULL CHECK (final_rank > 0),

  -- Nombre total de matchs gagnés (calculé automatiquement depuis matches)
  matches_won INTEGER DEFAULT 0,

  -- Points calculés (NULL = pas encore calculé)
  points_earned DECIMAL(10,2),

  -- Règle utilisée pour le calcul
  scoring_rule_id UUID REFERENCES scoring_rules(id),

  -- Métadonnées
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(athlete_id, event_id, age_category, weight_category)
);

CREATE INDEX idx_results_athlete ON results(athlete_id);
CREATE INDEX idx_results_event ON results(event_id);
CREATE INDEX idx_results_points ON results(points_earned DESC NULLS LAST);

-- Table détaillée des matchs
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,

  -- Ordre du match (1/8, 1/4, 1/2, finale, etc.)
  round_name TEXT NOT NULL, -- 'Round of 32', 'Round of 16', 'Quarter-final', etc.
  match_order INTEGER, -- Ordre chronologique

  -- Adversaire
  opponent_name TEXT,
  opponent_id UUID REFERENCES athletes(id), -- Si athlète Suisse

  -- Résultat
  outcome TEXT NOT NULL CHECK (outcome IN ('win', 'loss', 'bye')),
  score_athlete INTEGER,
  score_opponent INTEGER,

  -- Métadonnées
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_result ON matches(result_id);
CREATE INDEX idx_matches_outcome ON matches(result_id, outcome);
```

### 1.5 Règles de calcul (versionnées)

```sql
CREATE TABLE scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_name TEXT NOT NULL UNIQUE, -- 'v1.0', 'v2.0-2024', etc.

  -- Formule de calcul (JSONB pour flexibilité)
  -- Exemple : { "base_points": { "1": 100, "2": 70, "3": 50 }, "match_bonus": 5, "min_matches_medal": 3 }
  formula JSONB NOT NULL,

  -- Description lisible
  description TEXT,

  -- Période de validité
  valid_from DATE,
  valid_until DATE,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_scoring_rules_active ON scoring_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_scoring_rules_dates ON scoring_rules(valid_from, valid_until);
```

### 1.6 Snapshots mensuels (rankings publiés)

```sql
CREATE TABLE ranking_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Période
  snapshot_date DATE NOT NULL, -- Premier jour du mois (ex: 2024-12-01)
  snapshot_month INTEGER NOT NULL, -- 12
  snapshot_year INTEGER NOT NULL, -- 2024

  -- Titre et description
  title TEXT NOT NULL, -- 'Ranking Décembre 2024'
  description TEXT,

  -- Statut
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id),

  -- PDF généré (stocké dans Supabase Storage)
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(snapshot_year, snapshot_month)
);

CREATE INDEX idx_snapshots_date ON ranking_snapshots(snapshot_date DESC);
CREATE INDEX idx_snapshots_published ON ranking_snapshots(is_published) WHERE is_published = true;

-- Données figées du ranking
CREATE TABLE ranking_snapshot_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES ranking_snapshots(id) ON DELETE CASCADE,

  -- Athlète (données figées)
  athlete_id UUID NOT NULL REFERENCES athletes(id),
  athlete_name TEXT NOT NULL,
  athlete_age_category TEXT,
  athlete_weight_category TEXT,
  athlete_club TEXT,

  -- Position et points
  rank_position INTEGER NOT NULL,
  total_points DECIMAL(10,2) NOT NULL,

  -- Détails (nombre de tournois, meilleur résultat, etc.)
  tournaments_count INTEGER DEFAULT 0,
  best_result_rank INTEGER,
  best_result_event TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(snapshot_id, athlete_id)
);

CREATE INDEX idx_snapshot_data_snapshot ON ranking_snapshot_data(snapshot_id);
CREATE INDEX idx_snapshot_data_rank ON ranking_snapshot_data(snapshot_id, rank_position);
```

### 1.7 Sélections

```sql
-- Événements de sélection (Championnats, JO, etc.)
CREATE TABLE selection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL, -- 'Championnat d'Europe 2026'
  event_date DATE, -- Date de la compétition
  location TEXT,

  -- Dates clés
  selection_deadline DATE NOT NULL, -- Date limite pour finaliser la sélection
  announcement_date DATE, -- Date de publication de la liste

  description TEXT,

  -- Statut
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'finalized', 'published')),

  is_published BOOLEAN DEFAULT false, -- Visible au public ?
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_selection_events_status ON selection_events(status);
CREATE INDEX idx_selection_events_published ON selection_events(is_published) WHERE is_published = true;

-- Critères d'éligibilité configurables par sélection
CREATE TABLE eligibility_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_event_id UUID NOT NULL REFERENCES selection_events(id) ON DELETE CASCADE,

  -- Critère (JSONB pour flexibilité)
  -- Exemple : { "type": "min_points", "value": 150, "description": "Minimum 150 points" }
  -- Exemple : { "type": "mandatory_event", "event_id": "...", "description": "Participation obligatoire au National" }
  criterion JSONB NOT NULL,

  -- Ordre d'affichage
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eligibility_criteria_selection ON eligibility_criteria(selection_event_id, display_order);

-- Athlètes éligibles (calculé automatiquement)
CREATE TABLE eligible_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_event_id UUID NOT NULL REFERENCES selection_events(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

  -- Éligibilité
  is_eligible BOOLEAN NOT NULL,
  eligibility_details JSONB, -- Détails par critère

  -- Points au moment de l'évaluation
  total_points DECIMAL(10,2),
  rank_position INTEGER,

  -- Métadonnées
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(selection_event_id, athlete_id)
);

CREATE INDEX idx_eligible_athletes_selection ON eligible_athletes(selection_event_id);
CREATE INDEX idx_eligible_athletes_eligible ON eligible_athletes(selection_event_id, is_eligible) WHERE is_eligible = true;

-- Décisions finales de sélection
CREATE TABLE selection_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_event_id UUID NOT NULL REFERENCES selection_events(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

  -- Statut de la décision
  status TEXT NOT NULL CHECK (status IN ('selected', 'reserve', 'declined', 'test_match_required')),

  -- Notes et justification
  notes TEXT,
  test_match_result TEXT, -- Si test match requis

  -- Traçabilité
  decided_by UUID REFERENCES profiles(id),
  decided_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(selection_event_id, athlete_id)
);

CREATE INDEX idx_selection_decisions_event ON selection_decisions(selection_event_id);
CREATE INDEX idx_selection_decisions_status ON selection_decisions(selection_event_id, status);
```

### 1.8 Audit et historique

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Action
  table_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id UUID,

  -- Données
  old_data JSONB,
  new_data JSONB,

  -- Traçabilité
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_table ON audit_log(table_name, performed_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(performed_by);
```

---

## 2. Stratégie RLS (Row Level Security)

### 2.1 Activation RLS sur toutes les tables

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_snapshot_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligible_athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
```

### 2.2 Fonction helper pour récupérer le rôle

```sql
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;
```

### 2.3 Policies par table

#### Profiles
```sql
-- Lecture : chacun voit son propre profil, admin/selector voient tout
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid() OR get_user_role() IN ('admin', 'selector')
);

-- Modification : admin uniquement
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
  get_user_role() = 'admin'
);

CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (
  get_user_role() = 'admin'
);
```

#### Athletes
```sql
-- Lecture : public voit tous les athlètes actifs
CREATE POLICY athletes_select ON athletes FOR SELECT USING (
  is_active = true OR get_user_role() IN ('admin', 'selector')
);

-- Écriture : admin et selector
CREATE POLICY athletes_insert ON athletes FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY athletes_update ON athletes FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY athletes_delete ON athletes FOR DELETE USING (
  get_user_role() = 'admin'
);
```

#### Events
```sql
-- Lecture : public voit uniquement les événements publiés
CREATE POLICY events_select ON events FOR SELECT USING (
  is_published = true OR get_user_role() IN ('admin', 'selector')
);

-- Écriture : admin et selector
CREATE POLICY events_insert ON events FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY events_update ON events FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY events_delete ON events FOR DELETE USING (
  get_user_role() = 'admin'
);
```

#### Results & Matches
```sql
-- Lecture : public voit résultats des événements publiés uniquement
CREATE POLICY results_select ON results FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM events e WHERE e.id = results.event_id AND e.is_published = true
  ) OR get_user_role() IN ('admin', 'selector')
);

-- Écriture : admin et selector
CREATE POLICY results_insert ON results FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY results_update ON results FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY results_delete ON results FOR DELETE USING (
  get_user_role() = 'admin'
);

-- Matches : mêmes règles que results
CREATE POLICY matches_select ON matches FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM results r
    JOIN events e ON e.id = r.event_id
    WHERE r.id = matches.result_id AND (e.is_published = true OR get_user_role() IN ('admin', 'selector'))
  )
);

CREATE POLICY matches_insert ON matches FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY matches_update ON matches FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY matches_delete ON matches FOR DELETE USING (
  get_user_role() = 'admin'
);
```

#### Scoring Rules
```sql
-- Lecture : tout le monde (pour transparence)
CREATE POLICY scoring_rules_select ON scoring_rules FOR SELECT USING (true);

-- Écriture : admin uniquement
CREATE POLICY scoring_rules_insert ON scoring_rules FOR INSERT WITH CHECK (
  get_user_role() = 'admin'
);

CREATE POLICY scoring_rules_update ON scoring_rules FOR UPDATE USING (
  get_user_role() = 'admin'
);
```

#### Ranking Snapshots
```sql
-- Lecture : public voit uniquement snapshots publiés
CREATE POLICY ranking_snapshots_select ON ranking_snapshots FOR SELECT USING (
  is_published = true OR get_user_role() IN ('admin', 'selector')
);

CREATE POLICY ranking_snapshot_data_select ON ranking_snapshot_data FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM ranking_snapshots rs
    WHERE rs.id = ranking_snapshot_data.snapshot_id
    AND (rs.is_published = true OR get_user_role() IN ('admin', 'selector'))
  )
);

-- Écriture : admin et selector
CREATE POLICY ranking_snapshots_insert ON ranking_snapshots FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY ranking_snapshots_update ON ranking_snapshots FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY ranking_snapshot_data_insert ON ranking_snapshot_data FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);
```

#### Selection Events & Decisions
```sql
-- Lecture : public voit uniquement sélections publiées
CREATE POLICY selection_events_select ON selection_events FOR SELECT USING (
  is_published = true OR get_user_role() IN ('admin', 'selector')
);

CREATE POLICY eligibility_criteria_select ON eligibility_criteria FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM selection_events se
    WHERE se.id = eligibility_criteria.selection_event_id
    AND (se.is_published = true OR get_user_role() IN ('admin', 'selector'))
  )
);

-- Eligible athletes : visible uniquement pour admin/selector
CREATE POLICY eligible_athletes_select ON eligible_athletes FOR SELECT USING (
  get_user_role() IN ('admin', 'selector')
);

-- Décisions finales : public voit uniquement si sélection publiée
CREATE POLICY selection_decisions_select ON selection_decisions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM selection_events se
    WHERE se.id = selection_decisions.selection_event_id
    AND (se.is_published = true OR get_user_role() IN ('admin', 'selector'))
  )
);

-- Écriture : admin et selector
CREATE POLICY selection_events_insert ON selection_events FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY selection_events_update ON selection_events FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY eligibility_criteria_insert ON eligibility_criteria FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY eligible_athletes_insert ON eligible_athletes FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY eligible_athletes_update ON eligible_athletes FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY selection_decisions_insert ON selection_decisions FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY selection_decisions_update ON selection_decisions FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);
```

#### Audit Log
```sql
-- Lecture : admin et selector uniquement
CREATE POLICY audit_log_select ON audit_log FOR SELECT USING (
  get_user_role() IN ('admin', 'selector')
);

-- Écriture : via triggers uniquement (pas de policy INSERT manuelle)
```

---

## 3. Vues SQL - Ranking Live

### 3.1 Vue principale : ranking en temps réel

```sql
CREATE OR REPLACE VIEW ranking_live AS
SELECT
  a.id AS athlete_id,
  a.first_name,
  a.last_name,
  a.date_of_birth,
  a.gender,
  a.age_category,
  a.weight_category,
  a.club,

  -- Calcul des points totaux
  COALESCE(SUM(r.points_earned), 0) AS total_points,

  -- Nombre de tournois
  COUNT(DISTINCT r.event_id) AS tournaments_count,

  -- Meilleur résultat
  MIN(r.final_rank) AS best_rank,

  -- Nombre de médailles
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank <= 3) AS medals_count,

  -- Total matchs gagnés
  SUM(r.matches_won) AS total_matches_won,

  -- Dernière participation
  MAX(e.event_date) AS last_event_date,

  -- Rang calculé (partitionné global)
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(r.points_earned), 0) DESC, a.last_name, a.first_name) AS rank_position

FROM athletes a
LEFT JOIN results r ON r.athlete_id = a.id AND r.points_earned IS NOT NULL
LEFT JOIN events e ON e.id = r.event_id
WHERE a.is_active = true
GROUP BY a.id, a.first_name, a.last_name, a.date_of_birth, a.gender, a.age_category, a.weight_category, a.club
ORDER BY rank_position;
```

### 3.2 Vue détaillée par athlète (pour page profil)

```sql
CREATE OR REPLACE VIEW athlete_ranking_details AS
SELECT
  a.id AS athlete_id,
  a.first_name || ' ' || a.last_name AS athlete_name,
  a.age_category,
  a.weight_category,
  a.club,

  e.id AS event_id,
  e.name AS event_name,
  e.event_date,
  e.event_type,
  e.coefficient,

  r.final_rank,
  r.matches_won,
  r.points_earned,

  sr.version_name AS scoring_rule_version

FROM athletes a
JOIN results r ON r.athlete_id = a.id
JOIN events e ON e.id = r.event_id
LEFT JOIN scoring_rules sr ON sr.id = r.scoring_rule_id
WHERE a.is_active = true
ORDER BY a.last_name, a.first_name, e.event_date DESC;
```

### 3.3 Vue pour sélections (athlètes éligibles avec détails)

```sql
CREATE OR REPLACE VIEW selection_eligibility_summary AS
SELECT
  se.id AS selection_event_id,
  se.name AS selection_event_name,
  se.status AS selection_status,

  ea.athlete_id,
  a.first_name || ' ' || a.last_name AS athlete_name,
  a.age_category,
  a.weight_category,
  a.club,

  ea.is_eligible,
  ea.total_points,
  ea.rank_position,
  ea.eligibility_details,

  sd.status AS decision_status,
  sd.notes AS decision_notes

FROM selection_events se
LEFT JOIN eligible_athletes ea ON ea.selection_event_id = se.id
LEFT JOIN athletes a ON a.id = ea.athlete_id
LEFT JOIN selection_decisions sd ON sd.selection_event_id = se.id AND sd.athlete_id = ea.athlete_id
ORDER BY se.selection_deadline DESC, ea.rank_position NULLS LAST;
```

---

## 4. Stratégie Snapshots Mensuels

### 4.1 Principe

1. **Création du snapshot** : Admin/selector crée un snapshot pour un mois donné (ex: Décembre 2024)
2. **Génération des données** : Edge Function copie l'état actuel du ranking live vers `ranking_snapshot_data`
3. **Validation** : Admin/selector valide les données
4. **Publication** :
   - Génération du PDF (via Edge Function + librairie PDF)
   - Upload vers Supabase Storage
   - Flag `is_published = true`
5. **Accès public** : Le snapshot devient visible pour tous

### 4.2 Fonction SQL de génération snapshot

```sql
CREATE OR REPLACE FUNCTION generate_ranking_snapshot(
  p_snapshot_id UUID,
  p_snapshot_date DATE
) RETURNS VOID AS $$
BEGIN
  -- Copier l'état actuel du ranking vers snapshot_data
  INSERT INTO ranking_snapshot_data (
    snapshot_id,
    athlete_id,
    athlete_name,
    athlete_age_category,
    athlete_weight_category,
    athlete_club,
    rank_position,
    total_points,
    tournaments_count,
    best_result_rank
  )
  SELECT
    p_snapshot_id,
    rl.athlete_id,
    rl.first_name || ' ' || rl.last_name,
    rl.age_category,
    rl.weight_category,
    rl.club,
    rl.rank_position,
    rl.total_points,
    rl.tournaments_count,
    rl.best_rank
  FROM ranking_live rl
  WHERE rl.total_points > 0 -- Seulement athlètes avec des points
  ORDER BY rl.rank_position;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. Plan des Edge Functions

### 5.1 `calculate-points`

**Trigger** : Après insertion/update de `results` ou `matches`

**Rôle** :
1. Récupérer la règle de calcul active (ou celle spécifiée)
2. Calculer les points selon la formule :
   - Points de base selon place finale
   - Bonus par match gagné
   - Application coefficient du tournoi
   - Vérification contraintes (ex: minimum 3 matchs gagnés pour médaille)
3. Mettre à jour `results.points_earned` et `results.scoring_rule_id`

**Exemple de formule** (stockée dans `scoring_rules.formula`) :
```json
{
  "base_points": {
    "1": 100,
    "2": 70,
    "3": 50,
    "5": 30,
    "7": 20,
    "9": 10
  },
  "match_bonus_per_win": 5,
  "min_matches_for_medal": 3,
  "coefficient_multiplier": true
}
```

**Logique** :
```typescript
// Pseudo-code
function calculatePoints(result, matches, event, scoringRule) {
  const formula = scoringRule.formula;
  const basePoints = formula.base_points[result.final_rank] || 0;

  // Vérifier contrainte médaille
  if (result.final_rank <= 3 && result.matches_won < formula.min_matches_for_medal) {
    return 0; // Médaille invalidée
  }

  // Bonus matchs
  const matchBonus = result.matches_won * formula.match_bonus_per_win;

  // Total avant coefficient
  let total = basePoints + matchBonus;

  // Appliquer coefficient tournoi
  if (formula.coefficient_multiplier) {
    total *= event.coefficient;
  }

  return total;
}
```

### 5.2 `publish-ranking-snapshot`

**Trigger** : Appel manuel (bouton admin "Publier ranking mensuel")

**Paramètres** : `snapshot_id`

**Rôle** :
1. Générer le snapshot data (appel fonction SQL `generate_ranking_snapshot`)
2. Générer le PDF :
   - Récupérer les données de `ranking_snapshot_data`
   - Créer PDF avec titre, date, tableau ranking
   - Librairie : `pdfkit` ou `jspdf`
3. Upload PDF vers Supabase Storage (`rankings/2024-12-ranking.pdf`)
4. Mettre à jour `ranking_snapshots` :
   - `pdf_url`
   - `pdf_generated_at`
   - `is_published = true`
   - `published_at`

### 5.3 `evaluate-eligibility`

**Trigger** : Appel manuel ou automatique (cron quotidien)

**Paramètres** : `selection_event_id`

**Rôle** :
1. Récupérer critères d'éligibilité de la sélection
2. Pour chaque athlète actif :
   - Évaluer chaque critère (points min, tournois obligatoires, etc.)
   - Calculer `is_eligible` (ET logique de tous les critères)
   - Stocker détails dans `eligibility_details` (JSONB)
3. Insérer/update dans `eligible_athletes`

**Exemple de critères** :
```json
[
  { "type": "min_points", "value": 150 },
  { "type": "min_tournaments", "value": 3 },
  { "type": "mandatory_event", "event_id": "..." }
]
```

### 5.4 `publish-selection`

**Trigger** : Appel manuel (bouton "Publier sélection")

**Paramètres** : `selection_event_id`

**Rôle** :
1. Vérifier que toutes les décisions sont finalisées
2. Mettre à jour `selection_events` :
   - `status = 'published'`
   - `is_published = true`
   - `published_at`
3. Optionnel : Générer PDF de la liste finale
4. Notification (email aux athlètes ?)

---

## 6. Recommandations Structure Frontend

### 6.1 Architecture générale

**Framework** : React + TypeScript (NextJS ou Vite)
**State** : React Query (tanstack/query) pour cache Supabase
**UI** : TailwindCSS + shadcn/ui (composants accessibles)
**Routing** : React Router ou NextJS App Router

### 6.2 Écrans minimum

#### A. Écrans publics (non authentifiés)

1. **Home** (`/`)
   - Aperçu du dernier ranking publié
   - Liens vers rankings mensuels
   - Actualités/événements à venir

2. **Rankings mensuels** (`/rankings`)
   - Liste des snapshots publiés (par mois/année)
   - Clic → détail du ranking avec téléchargement PDF

3. **Détail ranking mensuel** (`/rankings/:year/:month`)
   - Tableau complet du ranking
   - Filtres : catégorie d'âge, poids, genre, club
   - Bouton téléchargement PDF

4. **Sélections publiées** (`/selections`)
   - Liste des événements de sélection publiés
   - Clic → détail avec liste des sélectionnés

5. **Détail sélection** (`/selections/:id`)
   - Nom de l'événement, date, lieu
   - Liste des athlètes sélectionnés (+ réserves)
   - Critères d'éligibilité appliqués

#### B. Écrans admin/selector (authentifiés)

6. **Dashboard** (`/admin`)
   - Statistiques : nombre d'athlètes actifs, résultats en attente, prochaines sélections
   - Ranking live (top 20)
   - Actions rapides

7. **Gestion athlètes** (`/admin/athletes`)
   - Liste avec recherche/filtres
   - CRUD : créer/modifier/désactiver athlète
   - Import CSV ?

8. **Gestion événements/tournois** (`/admin/events`)
   - Liste avec recherche/filtres
   - CRUD : créer/modifier événement
   - Flag "publié" pour visibilité publique

9. **Saisie résultats** (`/admin/results`)
   - Sélection tournoi → liste des participations
   - Formulaire : athlète, catégorie, place finale
   - Saisie détaillée des matchs (adversaires, scores)
   - Calcul automatique points (bouton "Recalculer")

10. **Ranking live** (`/admin/ranking-live`)
    - Tableau complet temps réel
    - Filtres avancés
    - Export CSV
    - Explication détaillée du calcul par athlète (drill-down)

11. **Gestion règles de calcul** (`/admin/scoring-rules`)
    - Liste des versions de règles
    - Création nouvelle version (formulaire formule)
    - Activation/désactivation
    - Bouton "Recalculer tous les résultats"

12. **Snapshots mensuels** (`/admin/snapshots`)
    - Liste des snapshots (publiés + brouillons)
    - Créer nouveau snapshot (mois/année)
    - Bouton "Générer données" → appel Edge Function
    - Bouton "Publier" → génération PDF + flag publié

13. **Gestion sélections** (`/admin/selections`)
    - Liste des événements de sélection
    - CRUD sélection
    - Configuration critères d'éligibilité

14. **Détail sélection (admin)** (`/admin/selections/:id`)
    - Onglet 1 : Critères d'éligibilité (configuration)
    - Onglet 2 : Évaluation éligibilité (liste athlètes avec statut)
    - Onglet 3 : Décisions finales (sélection/réserve/test match)
    - Bouton "Évaluer éligibilité" → appel Edge Function
    - Bouton "Publier sélection" → appel Edge Function

15. **Historique/Audit** (`/admin/audit`)
    - Log des modifications (qui a fait quoi, quand)
    - Filtres par table, utilisateur, date

#### C. Navigation

**Menu public** :
- Accueil
- Rankings mensuels
- Sélections
- [Connexion]

**Menu admin/selector** :
- Dashboard
- Athlètes
- Événements
- Résultats
- Ranking live
- Snapshots
- Sélections
- [Règles de calcul] (admin only)
- [Audit] (admin only)
- [Déconnexion]

### 6.3 Composants clés réutilisables

- `AthleteCard` : Carte athlète (nom, catégorie, club, points)
- `RankingTable` : Tableau ranking avec tri/filtres
- `EventCard` : Carte événement (nom, date, lieu, coefficient)
- `ResultForm` : Formulaire saisie résultat + matchs
- `EligibilityBadge` : Badge statut éligibilité (éligible/non éligible)
- `DecisionSelector` : Sélecteur décision (sélectionné/réserve/test match)
- `RoleGuard` : HOC pour protéger routes par rôle

### 6.4 Exemple de flux utilisateur

**Flux 1 : Selector saisit un résultat de tournoi**
1. `/admin/events` → Sélectionne "Open de Genève 2024"
2. Clic "Ajouter résultat" → `/admin/results/new?event_id=...`
3. Formulaire :
   - Sélection athlète (autocomplete)
   - Catégorie d'âge, poids
   - Place finale : 2
   - Matchs :
     - Round of 16 : win vs. Martin (10-5)
     - Quarter-final : win vs. Dupont (12-8)
     - Semi-final : win vs. Lopez (9-7)
     - Final : loss vs. Kim (6-12)
4. Submit → Insertion `results` + 4 rows `matches`
5. Trigger Edge Function `calculate-points` :
   - Place 2 = 70 points base
   - 3 matchs gagnés × 5 = 15 points
   - Total = 85 × coefficient 1.5 (tournoi international) = **127.5 points**
6. Redirection `/admin/ranking-live` → Athlète monte en position

**Flux 2 : Admin publie un ranking mensuel**
1. `/admin/snapshots` → Clic "Créer snapshot"
2. Modal : Sélection mois (Décembre 2024), titre "Ranking Décembre 2024"
3. Submit → Création row `ranking_snapshots` (status draft)
4. Redirection `/admin/snapshots/:id`
5. Clic "Générer données" → Appel Edge Function → Copie ranking live vers `ranking_snapshot_data`
6. Preview du ranking figé
7. Clic "Publier" → Edge Function :
   - Génère PDF
   - Upload Storage
   - `is_published = true`
8. Snapshot apparaît sur `/rankings` (public)

**Flux 3 : Selector gère une sélection**
1. `/admin/selections` → Clic "Créer sélection"
2. Formulaire : "Championnat d'Europe 2026", date, lieu, deadline
3. Submit → Création row `selection_events`
4. Redirection `/admin/selections/:id`
5. Onglet "Critères" : Ajout critères :
   - Min 150 points
   - Min 3 tournois
   - Participation obligatoire "National Championship 2025"
6. Clic "Évaluer éligibilité" → Edge Function `evaluate-eligibility`
7. Onglet "Éligibilité" : Liste athlètes avec statut (12 éligibles, 8 non éligibles)
8. Onglet "Décisions" : Pour chaque éligible, sélectionner statut (sélectionné/réserve/test match)
9. Clic "Publier sélection" → Edge Function `publish-selection`
10. Sélection apparaît sur `/selections` (public)

---

## 7. Technologies recommandées

### Backend (Supabase)
- **Database** : PostgreSQL 15+
- **Auth** : Supabase Auth (email/password, magic link)
- **Storage** : Supabase Storage (PDFs rankings)
- **Edge Functions** : Deno runtime
  - `supabase/functions/calculate-points`
  - `supabase/functions/publish-ranking-snapshot`
  - `supabase/functions/evaluate-eligibility`
  - `supabase/functions/publish-selection`

### Frontend
- **Framework** : React 18 + TypeScript + Vite (ou NextJS 14 si SEO important)
- **State** : TanStack Query (React Query) pour cache Supabase
- **UI** : TailwindCSS + shadcn/ui
- **Forms** : React Hook Form + Zod (validation)
- **Tables** : TanStack Table (tri/filtres/pagination)
- **PDF Client** : jspdf ou react-pdf (si preview client-side)
- **Date** : date-fns ou dayjs

### DevOps
- **Hosting Frontend** : Vercel, Netlify, ou Cloudflare Pages
- **CI/CD** : GitHub Actions
- **Tests** : Vitest (unit) + Playwright (e2e)

---

## 8. Migration et déploiement

### 8.1 Ordre de création

1. Schéma de base : `profiles`, `athletes`, `events`, `scoring_rules`
2. Résultats : `results`, `matches`
3. Snapshots : `ranking_snapshots`, `ranking_snapshot_data`
4. Sélections : `selection_events`, `eligibility_criteria`, `eligible_athletes`, `selection_decisions`
5. Audit : `audit_log`
6. Vues : `ranking_live`, `athlete_ranking_details`, `selection_eligibility_summary`
7. RLS policies pour toutes les tables
8. Edge Functions

### 8.2 Seed data initial

- 1 admin : `admin@swisstk.ch` (role: admin)
- 1 selector : `selector@swisstk.ch` (role: selector)
- 1 scoring rule active (v1.0)
- Quelques athlètes de test
- 2-3 événements de test

### 8.3 Migrations Supabase

Utiliser `supabase/migrations/` avec fichiers SQL numérotés :
- `20240101000000_create_base_schema.sql`
- `20240101000001_create_results_schema.sql`
- `20240101000002_create_snapshots_schema.sql`
- `20240101000003_create_selections_schema.sql`
- `20240101000004_create_views.sql`
- `20240101000005_enable_rls.sql`
- `20240101000006_seed_initial_data.sql`

---

## 9. Améliorations futures (post-MVP)

- **Notifications** : Email/push aux athlètes (nouveau ranking, sélection publiée)
- **Statistiques avancées** : Graphiques évolution points, comparaisons inter-athlètes
- **Import/Export** : Import CSV résultats tournois, export Excel rankings
- **Multi-langue** : FR/DE/IT/EN
- **Mobile App** : React Native ou PWA améliorée
- **API publique** : Pour clubs/fédérations (lecture rankings publiés)
- **Webhooks** : Intégrations externes (site web Swiss Taekwondo)

---

## 10. Points d'attention et risques

### 10.1 Performance

- **Ranking live** : Si +1000 athlètes et +10000 résultats, indexer correctement (`athlete_id`, `event_id`, `points_earned`)
- **Calcul points** : Éviter recalcul complet à chaque modification → calcul incrémental ou batch
- **Vues matérialisées** : Si ranking live trop lent, envisager `MATERIALIZED VIEW` avec refresh périodique

### 10.2 Auditabilité

- **Trigger audit** : Créer trigger PostgreSQL pour logger automatiquement INSERT/UPDATE/DELETE dans `audit_log`
- **Versioning règles** : JAMAIS supprimer une version de `scoring_rules` → soft delete uniquement

### 10.3 Sécurité

- **RLS strict** : Toujours tester policies avec différents rôles
- **Validation Edge Functions** : Valider inputs côté serveur (ne jamais faire confiance au client)
- **Secrets** : Utiliser Supabase Vault pour stocker clés API tierces (email, etc.)

### 10.4 UX

- **Feedback temps réel** : Lors du calcul de points (spinner, notification succès)
- **Explications claires** : Pour chaque calcul, afficher détails (base + bonus + coefficient)
- **Gestion d'erreurs** : Messages explicites si contrainte non respectée (ex: "Médaille invalidée : moins de 3 matchs gagnés")

---

## Conclusion

Cette architecture propose une solution **complète, évolutive et auditable** pour la gestion du ranking et des sélections Swiss Taekwondo.

**Points forts** :
- Séparation claire données internes vs publiques (RLS)
- Règles de calcul versionnées et recalculables
- Snapshots mensuels figés avec PDF
- Gestion granulaire des critères de sélection
- Auditabilité complète (logs + versioning)

**Prochaines étapes** :
1. Valider cette architecture avec vous
2. Créer le projet Supabase
3. Appliquer les migrations SQL
4. Développer les Edge Functions
5. Bootstrapper le frontend (composants de base)
6. Tests utilisateurs avec données réelles

N'hésitez pas si vous avez des questions ou souhaitez ajuster certains aspects !
