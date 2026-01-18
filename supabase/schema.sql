-- =====================================================
-- SWISS TAEKWONDO - SCHEMA SUPABASE COMPLET
-- =====================================================
-- Version: 1.0
-- Description: Système de ranking et sélection
-- Rôles: admin, selector, public
-- =====================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. AUTHENTIFICATION & PROFILS
-- =====================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'selector', 'public')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);

COMMENT ON TABLE profiles IS 'Profils utilisateurs avec rôles (admin, selector, public)';
COMMENT ON COLUMN profiles.role IS 'Rôle: admin (accès total), selector (gestion résultats/sélections), public (lecture snapshots publiés uniquement)';

-- =====================================================
-- 2. ATHLÈTES
-- =====================================================

CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identité
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),

  -- Catégories actuelles (évoluent avec l'âge)
  age_category TEXT, -- 'Minimes', 'Cadets', 'Juniors', 'Seniors', etc.
  weight_category TEXT, -- '-45kg', '-55kg', '-68kg', '+80kg', etc.

  -- Informations administratives
  license_number TEXT UNIQUE,
  club TEXT,
  email TEXT,
  phone TEXT,

  -- Statut
  is_active BOOLEAN DEFAULT true,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_athletes_active ON athletes(is_active) WHERE is_active = true;
CREATE INDEX idx_athletes_category ON athletes(age_category, weight_category);
CREATE INDEX idx_athletes_name ON athletes(last_name, first_name);
CREATE INDEX idx_athletes_gender ON athletes(gender);

COMMENT ON TABLE athletes IS 'Athlètes Swiss Taekwondo';
COMMENT ON COLUMN athletes.is_active IS 'false = athlète inactif/retraité (ne participe plus aux rankings)';

-- =====================================================
-- 3. RÈGLES DE CALCUL (VERSIONNÉES)
-- =====================================================

CREATE TABLE scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Version
  version_name TEXT NOT NULL UNIQUE, -- 'v1.0', 'v2.0-2024', etc.
  description TEXT,

  -- Formule de calcul (JSONB pour stockage, mais calcul déterministe via fonction SQL/Edge)
  -- Exemple: { "base_points": { "1": 100, "2": 70, "3": 50, "5": 30, "7": 20 }, "match_bonus": 5, "min_matches_medal": 3 }
  formula JSONB NOT NULL,

  -- Période de validité (optionnel)
  valid_from DATE,
  valid_until DATE,

  -- Statut
  is_active BOOLEAN DEFAULT true,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_scoring_rules_active ON scoring_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_scoring_rules_dates ON scoring_rules(valid_from, valid_until);

COMMENT ON TABLE scoring_rules IS 'Règles de calcul des points (versionnées pour recalcul historique)';
COMMENT ON COLUMN scoring_rules.formula IS 'Formule stockée en JSONB. Calcul effectué par fonction déterministe (Edge Function ou SQL)';

-- =====================================================
-- 4. ÉVÉNEMENTS (TOURNOIS)
-- =====================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  location TEXT,

  -- Saison (archivage)
  year INTEGER NOT NULL, -- Année de saison (ex: 2024)

  -- Type et niveau
  event_type TEXT NOT NULL, -- 'National', 'International', 'Open', 'Championship', etc.
  level TEXT, -- 'G1', 'G2', 'G4', etc.

  -- Coefficient pour calcul points (individuel par tournoi)
  coefficient DECIMAL(4,2) NOT NULL DEFAULT 1.0,

  -- Description
  description TEXT,

  -- Visibilité
  is_published BOOLEAN DEFAULT false, -- Si true, visible au public via résultats

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_date ON events(event_date DESC);
CREATE INDEX idx_events_year ON events(year DESC);
CREATE INDEX idx_events_published ON events(is_published) WHERE is_published = true;

COMMENT ON TABLE events IS 'Événements/tournois de Taekwondo';
COMMENT ON COLUMN events.year IS 'Année de saison pour archivage (ex: 2024)';
COMMENT ON COLUMN events.coefficient IS 'Coefficient multiplicateur pour calcul points (défini individuellement par tournoi)';
COMMENT ON COLUMN events.is_published IS 'Si true, événement visible au public (via résultats publiés dans snapshots)';

-- =====================================================
-- 5. RÉSULTATS (DONNÉES BRUTES)
-- =====================================================

CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Références
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Catégorie du tournoi (peut différer de la catégorie actuelle de l'athlète)
  age_category TEXT NOT NULL,
  weight_category TEXT NOT NULL,

  -- Place finale (donnée brute)
  final_rank INTEGER NOT NULL CHECK (final_rank > 0),

  -- Nombre total de matchs gagnés (calculé automatiquement depuis table matches)
  matches_won INTEGER DEFAULT 0,

  -- Points calculés
  points_earned DECIMAL(10,2),

  -- Explication textuelle du calcul (pour audit/transparence)
  calculation_explanation TEXT,

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
CREATE INDEX idx_results_athlete_points ON results(athlete_id, points_earned DESC NULLS LAST);

COMMENT ON TABLE results IS 'Résultats de tournois (données brutes: place, matchs gagnés) + points calculés';
COMMENT ON COLUMN results.calculation_explanation IS 'Explication textuelle du calcul (ex: "70 pts (2e place) + 15 pts (3 victoires) × 1.5 (coeff) = 127.5 pts")';
COMMENT ON COLUMN results.points_earned IS 'Points calculés par Edge Function (NULL = pas encore calculé)';

-- =====================================================
-- 6. MATCHS (DÉTAILS)
-- =====================================================

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Référence au résultat
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,

  -- Ordre du match
  round_name TEXT NOT NULL, -- 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final', etc.
  match_order INTEGER, -- Ordre chronologique (1, 2, 3, ...)

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
CREATE INDEX idx_matches_order ON matches(result_id, match_order);

COMMENT ON TABLE matches IS 'Détails des matchs (adversaires, scores, rounds)';
COMMENT ON COLUMN matches.outcome IS 'win = victoire, loss = défaite, bye = exempt';

-- =====================================================
-- 7. SNAPSHOTS MENSUELS (RANKINGS PUBLIÉS)
-- =====================================================

CREATE TABLE ranking_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Période
  snapshot_date DATE NOT NULL, -- Premier jour du mois (ex: 2024-12-01)
  snapshot_month INTEGER NOT NULL CHECK (snapshot_month BETWEEN 1 AND 12),
  snapshot_year INTEGER NOT NULL, -- Année (ex: 2024)

  -- Titre et description
  title TEXT NOT NULL, -- 'Ranking Décembre 2024'
  description TEXT,

  -- Statut de publication
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id),

  -- PDF généré (optionnel, stocké dans Supabase Storage)
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(snapshot_year, snapshot_month)
);

CREATE INDEX idx_snapshots_date ON ranking_snapshots(snapshot_date DESC);
CREATE INDEX idx_snapshots_year ON ranking_snapshots(snapshot_year DESC, snapshot_month DESC);
CREATE INDEX idx_snapshots_published ON ranking_snapshots(is_published) WHERE is_published = true;

COMMENT ON TABLE ranking_snapshots IS 'Snapshots mensuels publiés (source officielle publique)';
COMMENT ON COLUMN ranking_snapshots.is_published IS 'Si true, visible au public (immuable après publication)';

-- Trigger pour empêcher modification après publication
CREATE OR REPLACE FUNCTION prevent_snapshot_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_published = true THEN
    RAISE EXCEPTION 'Cannot modify a published ranking snapshot';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_snapshot_modification
  BEFORE UPDATE ON ranking_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION prevent_snapshot_modification();

-- =====================================================
-- 8. DONNÉES SNAPSHOTS (FIGÉES)
-- =====================================================

CREATE TABLE ranking_snapshot_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Référence au snapshot
  snapshot_id UUID NOT NULL REFERENCES ranking_snapshots(id) ON DELETE CASCADE,

  -- Données athlète (figées au moment du snapshot)
  athlete_id UUID NOT NULL REFERENCES athletes(id),
  athlete_name TEXT NOT NULL,
  athlete_age_category TEXT,
  athlete_weight_category TEXT,
  athlete_gender TEXT,
  athlete_club TEXT,

  -- Position et points
  rank_position INTEGER NOT NULL,
  total_points DECIMAL(10,2) NOT NULL,

  -- Détails complémentaires
  tournaments_count INTEGER DEFAULT 0,
  best_result_rank INTEGER,
  best_result_event TEXT,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(snapshot_id, athlete_id)
);

CREATE INDEX idx_snapshot_data_snapshot ON ranking_snapshot_data(snapshot_id);
CREATE INDEX idx_snapshot_data_rank ON ranking_snapshot_data(snapshot_id, rank_position);
CREATE INDEX idx_snapshot_data_category ON ranking_snapshot_data(snapshot_id, athlete_age_category, athlete_weight_category);
CREATE INDEX idx_snapshot_data_gender ON ranking_snapshot_data(snapshot_id, athlete_gender);

COMMENT ON TABLE ranking_snapshot_data IS 'Données figées du ranking mensuel (immuables après publication du snapshot)';

-- Trigger pour empêcher modification/suppression si snapshot publié
CREATE OR REPLACE FUNCTION prevent_snapshot_data_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM ranking_snapshots
    WHERE id = COALESCE(NEW.snapshot_id, OLD.snapshot_id)
    AND is_published = true
  ) THEN
    RAISE EXCEPTION 'Cannot modify ranking data of a published snapshot';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_snapshot_data_modification
  BEFORE UPDATE OR DELETE ON ranking_snapshot_data
  FOR EACH ROW
  EXECUTE FUNCTION prevent_snapshot_data_modification();

-- =====================================================
-- 9. ÉVÉNEMENTS DE SÉLECTION
-- =====================================================

CREATE TABLE selection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name TEXT NOT NULL, -- 'Championnat d'Europe 2026', 'EYOF 2025', etc.
  event_date DATE, -- Date de la compétition
  location TEXT,

  -- Dates clés
  selection_deadline DATE NOT NULL, -- Date limite pour finaliser la sélection
  announcement_date DATE, -- Date de publication de la liste

  -- Description
  description TEXT,

  -- Statut du processus de sélection
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'finalized', 'published')),

  -- Visibilité publique
  is_published BOOLEAN DEFAULT false, -- Si true, décisions finales visibles au public
  published_at TIMESTAMPTZ,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_selection_events_status ON selection_events(status);
CREATE INDEX idx_selection_events_deadline ON selection_events(selection_deadline DESC);
CREATE INDEX idx_selection_events_published ON selection_events(is_published) WHERE is_published = true;

COMMENT ON TABLE selection_events IS 'Événements de sélection (Euro, Worlds, EYOF, etc.)';
COMMENT ON COLUMN selection_events.is_published IS 'Si true, décisions finales visibles au public (données internes restent masquées)';

-- =====================================================
-- 10. CRITÈRES D'ÉLIGIBILITÉ (CONFIGURABLES)
-- =====================================================

CREATE TABLE eligibility_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Référence à l'événement de sélection
  selection_event_id UUID NOT NULL REFERENCES selection_events(id) ON DELETE CASCADE,

  -- Critère (JSONB pour flexibilité, évalué par Edge Function)
  -- Exemples:
  -- { "type": "min_points", "value": 150 }
  -- { "type": "min_tournaments", "value": 3 }
  -- { "type": "mandatory_event", "event_id": "...", "event_name": "National Championship" }
  -- { "type": "max_age", "value": 18 }
  criterion JSONB NOT NULL,

  -- Ordre d'affichage
  display_order INTEGER DEFAULT 0,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eligibility_criteria_selection ON eligibility_criteria(selection_event_id, display_order);

COMMENT ON TABLE eligibility_criteria IS 'Critères d''éligibilité configurables par événement de sélection';
COMMENT ON COLUMN eligibility_criteria.criterion IS 'Critère en JSONB (type + value), évalué par Edge Function';

-- =====================================================
-- 11. ATHLÈTES ÉLIGIBLES (CALCUL AUTOMATIQUE, INTERNE)
-- =====================================================

CREATE TABLE eligible_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Références
  selection_event_id UUID NOT NULL REFERENCES selection_events(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

  -- Éligibilité (calculée automatiquement)
  is_eligible BOOLEAN NOT NULL,

  -- Détails par critère (JSONB)
  -- Exemple: { "min_points": { "met": true, "value": 180, "required": 150 }, "mandatory_event": { "met": false } }
  eligibility_details JSONB,

  -- Points et rang au moment de l'évaluation
  total_points DECIMAL(10,2),
  rank_position INTEGER,

  -- Métadonnées
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(selection_event_id, athlete_id)
);

CREATE INDEX idx_eligible_athletes_selection ON eligible_athletes(selection_event_id);
CREATE INDEX idx_eligible_athletes_eligible ON eligible_athletes(selection_event_id, is_eligible) WHERE is_eligible = true;
CREATE INDEX idx_eligible_athletes_rank ON eligible_athletes(selection_event_id, rank_position);

COMMENT ON TABLE eligible_athletes IS 'Évaluation automatique de l''éligibilité (INTERNE, non visible au public)';
COMMENT ON COLUMN eligible_athletes.eligibility_details IS 'Détails de l''évaluation par critère (JSONB)';

-- =====================================================
-- 12. DÉCISIONS FINALES DE SÉLECTION
-- =====================================================

CREATE TABLE selection_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Références
  selection_event_id UUID NOT NULL REFERENCES selection_events(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

  -- Statut de la décision
  status TEXT NOT NULL CHECK (status IN ('selected', 'reserve', 'declined', 'test_match_required')),

  -- Notes et justification (interne)
  notes TEXT,
  test_match_result TEXT, -- Si test match requis

  -- Traçabilité
  decided_by UUID REFERENCES profiles(id),
  decided_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(selection_event_id, athlete_id)
);

CREATE INDEX idx_selection_decisions_event ON selection_decisions(selection_event_id);
CREATE INDEX idx_selection_decisions_status ON selection_decisions(selection_event_id, status);

COMMENT ON TABLE selection_decisions IS 'Décisions finales de sélection (visible au public SI selection_event.is_published = true)';
COMMENT ON COLUMN selection_decisions.notes IS 'Notes internes (non visibles au public)';

-- =====================================================
-- 13. AUDIT LOG
-- =====================================================

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
CREATE INDEX idx_audit_log_date ON audit_log(performed_at DESC);

COMMENT ON TABLE audit_log IS 'Historique des modifications (audit trail)';

-- =====================================================
-- TRIGGERS AUDIT (AUTOMATIQUES)
-- =====================================================

-- Fonction générique d'audit
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    action,
    record_id,
    old_data,
    new_data,
    performed_by
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Appliquer trigger audit sur tables critiques
CREATE TRIGGER audit_athletes AFTER INSERT OR UPDATE OR DELETE ON athletes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_events AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_results AFTER INSERT OR UPDATE OR DELETE ON results
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_scoring_rules AFTER INSERT OR UPDATE OR DELETE ON scoring_rules
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_selection_decisions AFTER INSERT OR UPDATE OR DELETE ON selection_decisions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- TRIGGERS AUTOMATIQUES (CALCULS)
-- =====================================================

-- Trigger: Recalculer matches_won après insertion/update/delete de matches
CREATE OR REPLACE FUNCTION update_matches_won()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE results
  SET matches_won = (
    SELECT COUNT(*)
    FROM matches
    WHERE matches.result_id = COALESCE(NEW.result_id, OLD.result_id)
    AND matches.outcome = 'win'
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.result_id, OLD.result_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_matches_won
  AFTER INSERT OR UPDATE OR DELETE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_matches_won();

-- =====================================================
-- FIN DU SCHÉMA DE BASE
-- =====================================================
