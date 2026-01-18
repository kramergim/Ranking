-- =====================================================
-- SWISS TAEKWONDO - RLS POLICIES
-- =====================================================
-- Rôles: admin, selector, public
-- Règle générale: public voit UNIQUEMENT snapshots publiés + décisions finales publiées
-- =====================================================

-- =====================================================
-- FONCTION HELPER: Récupérer le rôle de l'utilisateur
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- =====================================================
-- ACTIVATION RLS SUR TOUTES LES TABLES
-- =====================================================

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

-- =====================================================
-- 1. PROFILES
-- =====================================================

-- Lecture: chacun voit son propre profil, admin/selector voient tous
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid() OR get_user_role() IN ('admin', 'selector')
);

-- Modification: admin uniquement
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
  get_user_role() = 'admin'
);

CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (
  get_user_role() = 'admin'
);

CREATE POLICY profiles_delete ON profiles FOR DELETE USING (
  get_user_role() = 'admin'
);

-- =====================================================
-- 2. ATHLETES
-- =====================================================

-- Lecture: PUBLIC voit tous les athlètes actifs (pour affichage rankings publiés)
-- admin/selector voient tout
CREATE POLICY athletes_select ON athletes FOR SELECT USING (
  (is_active = true) OR get_user_role() IN ('admin', 'selector')
);

-- Écriture: admin et selector uniquement
CREATE POLICY athletes_insert ON athletes FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY athletes_update ON athletes FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY athletes_delete ON athletes FOR DELETE USING (
  get_user_role() = 'admin'
);

-- =====================================================
-- 3. EVENTS
-- =====================================================

-- Lecture: PUBLIC ne voit AUCUN événement directement
-- (les événements sont visibles indirectement via snapshots publiés)
-- admin/selector voient tout
CREATE POLICY events_select ON events FOR SELECT USING (
  get_user_role() IN ('admin', 'selector')
);

-- Écriture: admin et selector
CREATE POLICY events_insert ON events FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY events_update ON events FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY events_delete ON events FOR DELETE USING (
  get_user_role() = 'admin'
);

-- =====================================================
-- 4. RESULTS (DONNÉES BRUTES)
-- =====================================================

-- Lecture: PUBLIC ne voit AUCUN résultat brut
-- admin/selector voient tout
CREATE POLICY results_select ON results FOR SELECT USING (
  get_user_role() IN ('admin', 'selector')
);

-- Écriture: admin et selector
CREATE POLICY results_insert ON results FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY results_update ON results FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY results_delete ON results FOR DELETE USING (
  get_user_role() = 'admin'
);

-- =====================================================
-- 5. MATCHES (DÉTAILS)
-- =====================================================

-- Lecture: PUBLIC ne voit AUCUN détail de match
-- admin/selector voient tout
CREATE POLICY matches_select ON matches FOR SELECT USING (
  get_user_role() IN ('admin', 'selector')
);

-- Écriture: admin et selector
CREATE POLICY matches_insert ON matches FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY matches_update ON matches FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY matches_delete ON matches FOR DELETE USING (
  get_user_role() = 'admin'
);

-- =====================================================
-- 6. SCORING RULES
-- =====================================================

-- Lecture: PUBLIC ne voit AUCUNE règle de calcul
-- (transparence via calculation_explanation dans snapshots)
-- admin/selector voient tout
CREATE POLICY scoring_rules_select ON scoring_rules FOR SELECT USING (
  get_user_role() IN ('admin', 'selector')
);

-- Écriture: admin uniquement
CREATE POLICY scoring_rules_insert ON scoring_rules FOR INSERT WITH CHECK (
  get_user_role() = 'admin'
);

CREATE POLICY scoring_rules_update ON scoring_rules FOR UPDATE USING (
  get_user_role() = 'admin'
);

CREATE POLICY scoring_rules_delete ON scoring_rules FOR DELETE USING (
  get_user_role() = 'admin'
);

-- =====================================================
-- 7. RANKING SNAPSHOTS
-- =====================================================

-- Lecture: PUBLIC voit UNIQUEMENT snapshots publiés
-- admin/selector voient tout
CREATE POLICY ranking_snapshots_select ON ranking_snapshots FOR SELECT USING (
  is_published = true OR get_user_role() IN ('admin', 'selector')
);

-- Écriture: admin et selector
CREATE POLICY ranking_snapshots_insert ON ranking_snapshots FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY ranking_snapshots_update ON ranking_snapshots FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY ranking_snapshots_delete ON ranking_snapshots FOR DELETE USING (
  get_user_role() = 'admin'
);

-- =====================================================
-- 8. RANKING SNAPSHOT DATA
-- =====================================================

-- Lecture: PUBLIC voit UNIQUEMENT données des snapshots publiés
-- admin/selector voient tout
CREATE POLICY ranking_snapshot_data_select ON ranking_snapshot_data FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM ranking_snapshots rs
    WHERE rs.id = ranking_snapshot_data.snapshot_id
    AND (rs.is_published = true OR get_user_role() IN ('admin', 'selector'))
  )
);

-- Écriture: admin et selector
-- Note: automatiquement bloqué par trigger si snapshot déjà publié
CREATE POLICY ranking_snapshot_data_insert ON ranking_snapshot_data FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY ranking_snapshot_data_update ON ranking_snapshot_data FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY ranking_snapshot_data_delete ON ranking_snapshot_data FOR DELETE USING (
  get_user_role() = 'admin'
);

-- =====================================================
-- 9. SELECTION EVENTS
-- =====================================================

-- Lecture: PUBLIC voit UNIQUEMENT sélections publiées
-- admin/selector voient tout
CREATE POLICY selection_events_select ON selection_events FOR SELECT USING (
  is_published = true OR get_user_role() IN ('admin', 'selector')
);

-- Écriture: admin et selector
CREATE POLICY selection_events_insert ON selection_events FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY selection_events_update ON selection_events FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY selection_events_delete ON selection_events FOR DELETE USING (
  get_user_role() = 'admin'
);

-- =====================================================
-- 10. ELIGIBILITY CRITERIA
-- =====================================================

-- Lecture: PUBLIC voit critères UNIQUEMENT si sélection publiée
-- admin/selector voient tout
CREATE POLICY eligibility_criteria_select ON eligibility_criteria FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM selection_events se
    WHERE se.id = eligibility_criteria.selection_event_id
    AND (se.is_published = true OR get_user_role() IN ('admin', 'selector'))
  )
);

-- Écriture: admin et selector
CREATE POLICY eligibility_criteria_insert ON eligibility_criteria FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY eligibility_criteria_update ON eligibility_criteria FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY eligibility_criteria_delete ON eligibility_criteria FOR DELETE USING (
  get_user_role() = 'admin'
);

-- =====================================================
-- 11. ELIGIBLE ATHLETES (INTERNE)
-- =====================================================

-- Lecture: PUBLIC ne voit AUCUNE donnée d'éligibilité (processus interne)
-- admin/selector voient tout
CREATE POLICY eligible_athletes_select ON eligible_athletes FOR SELECT USING (
  get_user_role() IN ('admin', 'selector')
);

-- Écriture: admin et selector
CREATE POLICY eligible_athletes_insert ON eligible_athletes FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY eligible_athletes_update ON eligible_athletes FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY eligible_athletes_delete ON eligible_athletes FOR DELETE USING (
  get_user_role() = 'admin'
);

-- =====================================================
-- 12. SELECTION DECISIONS (DÉCISIONS FINALES)
-- =====================================================

-- Lecture: PUBLIC voit décisions finales UNIQUEMENT si sélection publiée
-- Notes internes (notes, test_match_result) restent masquées pour public via vue
-- admin/selector voient tout
CREATE POLICY selection_decisions_select ON selection_decisions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM selection_events se
    WHERE se.id = selection_decisions.selection_event_id
    AND (se.is_published = true OR get_user_role() IN ('admin', 'selector'))
  )
);

-- Écriture: admin et selector
CREATE POLICY selection_decisions_insert ON selection_decisions FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY selection_decisions_update ON selection_decisions FOR UPDATE USING (
  get_user_role() IN ('admin', 'selector')
);

CREATE POLICY selection_decisions_delete ON selection_decisions FOR DELETE USING (
  get_user_role() = 'admin'
);

-- =====================================================
-- 13. AUDIT LOG
-- =====================================================

-- Lecture: admin et selector uniquement
CREATE POLICY audit_log_select ON audit_log FOR SELECT USING (
  get_user_role() IN ('admin', 'selector')
);

-- Écriture: via triggers uniquement (pas de policy INSERT manuelle)
-- Pas de modification/suppression de l'audit
CREATE POLICY audit_log_no_modify ON audit_log FOR UPDATE USING (false);
CREATE POLICY audit_log_no_delete ON audit_log FOR DELETE USING (false);

-- =====================================================
-- FIN DES RLS POLICIES
-- =====================================================
