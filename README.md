# Swiss Taekwondo - Système de Ranking et Sélection

Application mobile (PWA) pour la gestion du ranking national et des sélections d'athlètes pour Swiss Taekwondo.

---

## 🎯 Objectifs

- **Saisie résultats** : Tournois, catégories, places, matchs gagnés
- **Calcul automatique** : Points selon règles configurables, coefficients, contraintes
- **Ranking live** : Classement temps réel pour admin/selector
- **Snapshots mensuels** : Rankings publiés (tableaux interactifs + PDF) accessibles au public
- **Gestion sélections** : Critères d'éligibilité, évaluation automatique, décisions finales

---

## 🏗️ Architecture

### Stack technique

**Backend** : Supabase (PostgreSQL + Auth + RLS + Storage + Edge Functions)

**Frontend** : React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui

**PWA** : Application mobile-friendly avec manifest et service worker

### Rôles utilisateurs

1. **admin** : Accès total (gestion athlètes, événements, règles, snapshots, sélections)
2. **selector** : Gestion résultats, rankings, éligibilité, décisions (pas d'administration globale)
3. **public** : Lecture uniquement des snapshots publiés et décisions finales

---

## 📁 Structure du projet

```
ranking/
├── supabase/
│   ├── schema.sql              # Schéma complet (13 tables)
│   ├── rls-policies.sql        # Policies par rôle
│   ├── views.sql               # Vues SQL (ranking_live, public_rankings, etc.)
│   ├── functions.sql           # Fonctions SQL utilitaires
│   ├── edge-functions-plan.md  # Plan détaillé des Edge Functions
│   └── functions/              # Edge Functions (Deno)
│       ├── calculate-points/
│       ├── publish-ranking-snapshot/
│       ├── generate-snapshot-data/
│       ├── evaluate-eligibility/
│       └── publish-selection/
├── frontend/                   # Application React (à créer)
├── ARCHITECTURE.md             # Documentation architecture complète
├── IMPLEMENTATION-GUIDE.md     # Guide de déploiement étape par étape
└── README.md                   # Ce fichier
```

---

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+
- Compte Supabase (https://app.supabase.com)
- Supabase CLI : `npm install -g supabase`

### Installation

```bash
# 1. Cloner le projet
cd C:\Users\krasn\ranking

# 2. Lier au projet Supabase
supabase link --project-ref YOUR_PROJECT_REF

# 3. Appliquer les migrations
supabase db push

# 4. Créer seed data initial
psql -c "SELECT seed_initial_data();"

# 5. Déployer Edge Functions
supabase functions deploy calculate-points
supabase functions deploy publish-ranking-snapshot
supabase functions deploy generate-snapshot-data
supabase functions deploy evaluate-eligibility
supabase functions deploy publish-selection

# 6. Installer frontend (à créer)
cd frontend
npm install
npm run dev
```

**Voir `IMPLEMENTATION-GUIDE.md` pour les instructions détaillées.**

---

## 📊 Schéma de données

### Tables principales

1. **profiles** : Utilisateurs avec rôles (admin, selector, public)
2. **athletes** : Athlètes (nom, catégories, club, statut)
3. **events** : Tournois (nom, date, type, coefficient, année)
4. **results** : Résultats bruts (place finale, matchs gagnés) + points calculés
5. **matches** : Détails des matchs (adversaires, scores, rounds)
6. **scoring_rules** : Règles de calcul versionnées (formule JSONB)
7. **ranking_snapshots** : Métadonnées snapshots mensuels
8. **ranking_snapshot_data** : Données figées du ranking (immuables après publication)
9. **selection_events** : Événements de sélection (Euro, Worlds, etc.)
10. **eligibility_criteria** : Critères configurables par sélection
11. **eligible_athletes** : Évaluation automatique (interne)
12. **selection_decisions** : Décisions finales (sélectionné, réserve, etc.)
13. **audit_log** : Historique des modifications

### Vues principales

- **ranking_live** : Ranking temps réel (admin/selector uniquement)
- **public_rankings** : Snapshots publiés (accessible au public)
- **public_selections** : Décisions finales publiées
- **selection_eligibility_summary** : Synthèse éligibilité (admin/selector)

**Voir `ARCHITECTURE.md` pour le schéma détaillé.**

---

## 🔐 Sécurité (RLS)

### Règles générales

- **Public** : Accès UNIQUEMENT aux snapshots publiés (`ranking_snapshots.is_published = true`) et décisions finales publiées (`selection_events.is_published = true`)
- **Selector** : Accès à tous les résultats, rankings live, éligibilité, décisions (mais pas aux règles de calcul ou audit)
- **Admin** : Accès total

### Données visibles par rôle

| Table                    | Public                    | Selector | Admin |
|--------------------------|---------------------------|----------|-------|
| athletes                 | Actifs uniquement         | Tous     | Tous  |
| events                   | ❌ Non                     | Tous     | Tous  |
| results                  | ❌ Non                     | Tous     | Tous  |
| matches                  | ❌ Non                     | Tous     | Tous  |
| scoring_rules            | ❌ Non                     | ❌ Non    | Tous  |
| ranking_snapshots        | Publiés uniquement        | Tous     | Tous  |
| ranking_snapshot_data    | Publiés uniquement        | Tous     | Tous  |
| selection_events         | Publiés uniquement        | Tous     | Tous  |
| eligibility_criteria     | Si sélection publiée      | Tous     | Tous  |
| eligible_athletes        | ❌ Non                     | Tous     | Tous  |
| selection_decisions      | Si sélection publiée      | Tous     | Tous  |
| audit_log                | ❌ Non                     | Lecture  | Tous  |

**Voir `supabase/rls-policies.sql` pour les policies complètes.**

---

## 🧮 Calcul des points

### Formule par défaut (v1.0)

```json
{
  "base_points": {
    "1": 100,  // 1ère place
    "2": 70,   // 2e place
    "3": 50,   // 3e place
    "5": 30,   // 5e place
    "7": 20,   // 7e place
    "9": 10    // 9e place
  },
  "match_bonus_per_win": 5,      // Bonus par victoire
  "min_matches_for_medal": 3,    // Minimum 3 victoires pour valider une médaille
  "apply_coefficient": true      // Appliquer coefficient du tournoi
}
```

### Exemple de calcul

**Athlète** : Marie Martin
**Tournoi** : Swiss Championships 2024 (coefficient 1.5)
**Résultat** : 2e place, 4 victoires

**Calcul** :
1. Points de base : 70 pts (2e place)
2. Bonus matchs : 4 × 5 = 20 pts
3. Sous-total : 70 + 20 = 90 pts
4. Coefficient : 90 × 1.5 = **135 pts**

**Explication stockée** :
`"70 pts (2e place) + 20 pts (4 victoires × 5) × 1.5 (coeff.) = 135 pts | Swiss Championships 2024 (National)"`

**Voir `edge-functions-plan.md` pour la logique complète.**

---

## 📱 Écrans de l'application

### Écrans publics (non authentifiés)

1. **Home** : Aperçu dernier ranking + actualités
2. **Rankings mensuels** : Liste des snapshots publiés
3. **Détail ranking** : Tableau interactif avec filtres (âge/poids/genre/club)
4. **Sélections** : Liste des sélections publiées
5. **Détail sélection** : Liste des athlètes sélectionnés + réserves

### Écrans admin/selector (authentifiés)

6. **Dashboard** : Statistiques + actions rapides
7. **Gestion athlètes** : CRUD athlètes + recherche/filtres
8. **Gestion événements** : CRUD tournois + publication
9. **Saisie résultats** : Formulaire résultat + matchs détaillés
10. **Ranking live** : Tableau temps réel + explication calcul
11. **Gestion règles** : Versions de règles + recalcul massif
12. **Snapshots mensuels** : Créer, générer données, publier
13. **Gestion sélections** : CRUD sélections + critères
14. **Détail sélection (admin)** : Critères, éligibilité, décisions
15. **Audit** : Logs des modifications

**Voir `ARCHITECTURE.md` section 6 pour les wireframes.**

---

## 🔧 Edge Functions

### 1. calculate-points
**Rôle** : Calcul déterministe des points après saisie résultat

**Trigger** : Automatique (webhook) ou manuel (bouton "Recalculer")

**Logique** :
- Récupérer résultat + règle de calcul active
- Valider contraintes (ex: min 3 matchs pour médaille)
- Calculer points (base + bonus matchs × coefficient)
- Générer explication textuelle
- Mettre à jour `results.points_earned` et `calculation_explanation`

### 2. publish-ranking-snapshot
**Rôle** : Génération et publication d'un snapshot mensuel

**Logique** :
- Vérifier snapshot non publié
- Générer PDF (jsPDF + tableau ranking)
- Upload vers Supabase Storage
- Marquer `is_published = true` (immuable)

### 3. generate-snapshot-data
**Rôle** : Copier ranking live vers snapshot_data (avant publication)

**Logique** :
- Supprimer anciennes données si existantes
- Copier vue `ranking_live` vers `ranking_snapshot_data`
- Retourner statistiques (nombre d'athlètes, points min/max)

### 4. evaluate-eligibility
**Rôle** : Évaluation automatique de l'éligibilité pour une sélection

**Logique** :
- Récupérer critères de la sélection (JSONB)
- Pour chaque athlète : évaluer chaque critère
- Stocker résultat dans `eligible_athletes` (interne)

### 5. publish-selection
**Rôle** : Publication finale d'une sélection

**Logique** :
- Vérifier décisions finales complètes
- Marquer `is_published = true`
- Déclencher notifications (futur)

**Voir `edge-functions-plan.md` pour les détails complets.**

---

## 🧪 Tests

### Vérifier intégrité des données

```sql
SELECT * FROM check_data_integrity();
```

Retourne :
- Résultats sans points calculés
- Athlètes actifs sans catégorie
- Événements sans coefficient
- Matchs orphelins
- Snapshots publiés sans PDF

### Tests fonctionnels

**Flux 1 : Saisie résultat → Calcul points**
1. Créer événement
2. Créer résultat (athlète, place finale)
3. Ajouter matchs détaillés
4. Déclencher `calculate-points`
5. Vérifier `results.points_earned` et `calculation_explanation`
6. Vérifier ranking live mis à jour

**Flux 2 : Publication snapshot**
1. Créer snapshot (mois/année)
2. Générer données (`generate-snapshot-data`)
3. Publier (`publish-ranking-snapshot`)
4. Vérifier `is_published = true` et PDF généré
5. Vérifier visibilité publique (via RLS)

**Flux 3 : Gestion sélection**
1. Créer événement de sélection
2. Configurer critères d'éligibilité
3. Évaluer éligibilité (`evaluate-eligibility`)
4. Ajouter décisions finales
5. Publier sélection (`publish-selection`)
6. Vérifier visibilité publique

---

## 📚 Documentation

- **ARCHITECTURE.md** : Vue d'ensemble complète (10 sections, 500+ lignes)
- **IMPLEMENTATION-GUIDE.md** : Guide de déploiement étape par étape
- **edge-functions-plan.md** : Plan détaillé des Edge Functions avec logique complète
- **supabase/schema.sql** : Schéma SQL commenté (13 tables + triggers)
- **supabase/rls-policies.sql** : Policies RLS par table et par rôle
- **supabase/views.sql** : 9 vues SQL (ranking_live, public_rankings, etc.)
- **supabase/functions.sql** : 7 fonctions SQL utilitaires

---

## 🛠️ Maintenance

### Recalcul massif des points

```sql
-- Reset tous les points (admin uniquement)
SELECT recalculate_all_points();

-- Puis appeler Edge Function calculate-points pour chaque résultat
```

### Backup database

```bash
supabase db dump -f backup-$(date +%Y%m%d).sql
```

### Nettoyage données de test (développement uniquement)

```sql
SELECT cleanup_test_data();
-- ⚠️ ATTENTION : Supprime TOUTES les données sauf profils
```

---

## 🚧 Roadmap

### Phase 1 : MVP (4-6 semaines)
- [x] Architecture complète
- [x] Schéma SQL + RLS + Vues + Fonctions
- [x] Plan Edge Functions
- [ ] Déploiement backend Supabase
- [ ] Implémentation Edge Functions
- [ ] Frontend React (15 écrans)
- [ ] PWA configuration
- [ ] Tests + déploiement production

### Phase 2 : Améliorations (post-MVP)
- [ ] Notifications push (emails athlètes)
- [ ] Statistiques avancées (graphiques évolution)
- [ ] Import/Export CSV
- [ ] Multi-langue (FR/DE/IT/EN)
- [ ] Mobile app native (React Native)
- [ ] API publique pour intégrations

---

## 📞 Support

- **Documentation** : Voir fichiers `ARCHITECTURE.md` et `IMPLEMENTATION-GUIDE.md`
- **Supabase** : https://supabase.com/docs
- **Contact** : admin@swisstk.ch

---

## 📝 License

© 2024 Swiss Taekwondo. Tous droits réservés.

---

**Prochaine étape** : Suivre `IMPLEMENTATION-GUIDE.md` pour déployer le backend Supabase.
