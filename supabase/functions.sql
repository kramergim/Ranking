-- =====================================================
-- SWISS TAEKWONDO - FONCTIONS SQL
-- =====================================================
-- Fonctions utilitaires pour génération snapshots et calculs
-- =====================================================

-- =====================================================
-- 1. GÉNÉRATION SNAPSHOT DATA (APPELÉE PAR EDGE FUNCTION)
-- =====================================================

CREATE OR REPLACE FUNCTION generate_ranking_snapshot(
  p_snapshot_id UUID
) RETURNS TABLE (
  athletes_count INTEGER,
  max_points DECIMAL,
  min_points DECIMAL
) AS $$
DECLARE
  v_athletes_count INTEGER;
  v_max_points DECIMAL;
  v_min_points DECIMAL;
BEGIN
  -- Vérifier que le snapshot existe et n'est pas publié
  IF NOT EXISTS (
    SELECT 1 FROM ranking_snapshots
    WHERE id = p_snapshot_id AND is_published = false
  ) THEN
    RAISE EXCEPTION 'Snapshot non trouvé ou déjà publié';
  END IF;

  -- Supprimer anciennes données si existantes
  DELETE FROM ranking_snapshot_data WHERE snapshot_id = p_snapshot_id;

  -- Copier ranking live vers snapshot_data
  INSERT INTO ranking_snapshot_data (
    snapshot_id,
    athlete_id,
    athlete_name,
    athlete_age_category,
    athlete_weight_category,
    athlete_gender,
    athlete_club,
    rank_position,
    total_points,
    tournaments_count,
    best_result_rank,
    best_result_event
  )
  SELECT
    p_snapshot_id,
    rl.athlete_id,
    rl.full_name,
    rl.age_category,
    rl.weight_category,
    rl.gender,
    rl.club,
    rl.rank_position,
    rl.total_points,
    rl.tournaments_count,
    rl.best_rank,
    rl.best_result_event
  FROM ranking_live rl
  WHERE rl.total_points > 0 -- Seulement athlètes avec des points
  ORDER BY rl.rank_position;

  -- Calculer statistiques
  SELECT
    COUNT(*),
    MAX(total_points),
    MIN(total_points)
  INTO v_athletes_count, v_max_points, v_min_points
  FROM ranking_snapshot_data
  WHERE snapshot_id = p_snapshot_id;

  -- Retourner résultat
  RETURN QUERY SELECT v_athletes_count, v_max_points, v_min_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_ranking_snapshot IS 'Génère les données d''un snapshot mensuel à partir du ranking live actuel';

-- =====================================================
-- 2. RECALCUL MASSIF DES POINTS (ADMIN UNIQUEMENT)
-- =====================================================

CREATE OR REPLACE FUNCTION recalculate_all_points(
  p_scoring_rule_id UUID DEFAULT NULL -- Si NULL, utilise règle active
) RETURNS TABLE (
  results_updated INTEGER,
  total_results INTEGER
) AS $$
DECLARE
  v_results_updated INTEGER := 0;
  v_total_results INTEGER;
BEGIN
  -- Compter total résultats
  SELECT COUNT(*) INTO v_total_results FROM results;

  -- Note: Le recalcul effectif sera fait par l'Edge Function calculate-points
  -- Cette fonction SQL sert juste de placeholder pour reset les points
  -- et forcer le recalcul via Edge Function

  UPDATE results
  SET
    points_earned = NULL,
    calculation_explanation = NULL,
    scoring_rule_id = NULL,
    updated_at = NOW();

  GET DIAGNOSTICS v_results_updated = ROW_COUNT;

  RETURN QUERY SELECT v_results_updated, v_total_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION recalculate_all_points IS 'Reset tous les points pour forcer recalcul via Edge Function (admin uniquement)';

-- =====================================================
-- 3. STATISTIQUES PAR ATHLÈTE
-- =====================================================

CREATE OR REPLACE FUNCTION get_athlete_statistics(
  p_athlete_id UUID
) RETURNS TABLE (
  total_points DECIMAL,
  tournaments_count INTEGER,
  gold_medals INTEGER,
  silver_medals INTEGER,
  bronze_medals INTEGER,
  total_matches_won INTEGER,
  last_event_date DATE,
  current_rank INTEGER,
  avg_points_per_tournament DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rl.total_points,
    rl.tournaments_count,
    rl.gold_medals,
    rl.silver_medals,
    rl.bronze_medals,
    rl.total_matches_won,
    rl.last_event_date,
    rl.rank_position,
    CASE
      WHEN rl.tournaments_count > 0 THEN ROUND(rl.total_points / rl.tournaments_count, 2)
      ELSE 0
    END AS avg_points_per_tournament
  FROM ranking_live rl
  WHERE rl.athlete_id = p_athlete_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_athlete_statistics IS 'Retourne statistiques complètes d''un athlète';

-- =====================================================
-- 4. COMPARAISON ENTRE DEUX SNAPSHOTS
-- =====================================================

CREATE OR REPLACE FUNCTION compare_snapshots(
  p_snapshot_id_1 UUID,
  p_snapshot_id_2 UUID
) RETURNS TABLE (
  athlete_id UUID,
  athlete_name TEXT,
  rank_1 INTEGER,
  points_1 DECIMAL,
  rank_2 INTEGER,
  points_2 DECIMAL,
  rank_change INTEGER,
  points_change DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(s1.athlete_id, s2.athlete_id) AS athlete_id,
    COALESCE(s1.athlete_name, s2.athlete_name) AS athlete_name,
    s1.rank_position AS rank_1,
    s1.total_points AS points_1,
    s2.rank_position AS rank_2,
    s2.total_points AS points_2,
    (s1.rank_position - s2.rank_position) AS rank_change, -- Positif = progression
    (s2.total_points - s1.total_points) AS points_change
  FROM ranking_snapshot_data s1
  FULL OUTER JOIN ranking_snapshot_data s2
    ON s1.athlete_id = s2.athlete_id AND s2.snapshot_id = p_snapshot_id_2
  WHERE s1.snapshot_id = p_snapshot_id_1
  ORDER BY COALESCE(s2.rank_position, 999999);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION compare_snapshots IS 'Compare deux snapshots mensuels (évolution du ranking)';

-- =====================================================
-- 5. VÉRIFICATION INTÉGRITÉ DONNÉES
-- =====================================================

CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check 1: Résultats sans points calculés
  RETURN QUERY
  SELECT
    'results_without_points'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
    COUNT(*)::TEXT || ' résultat(s) sans points calculés'
  FROM results WHERE points_earned IS NULL;

  -- Check 2: Athlètes sans catégorie
  RETURN QUERY
  SELECT
    'athletes_without_category'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
    COUNT(*)::TEXT || ' athlète(s) actif(s) sans catégorie'
  FROM athletes
  WHERE is_active = true
    AND (age_category IS NULL OR weight_category IS NULL);

  -- Check 3: Événements futurs sans coefficient
  RETURN QUERY
  SELECT
    'events_without_coefficient'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
    COUNT(*)::TEXT || ' événement(s) sans coefficient défini'
  FROM events
  WHERE coefficient IS NULL OR coefficient <= 0;

  -- Check 4: Matchs sans résultat parent
  RETURN QUERY
  SELECT
    'orphan_matches'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END,
    COUNT(*)::TEXT || ' match(s) orphelin(s)'
  FROM matches m
  WHERE NOT EXISTS (SELECT 1 FROM results r WHERE r.id = m.result_id);

  -- Check 5: Snapshots publiés sans PDF
  RETURN QUERY
  SELECT
    'published_snapshots_without_pdf'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
    COUNT(*)::TEXT || ' snapshot(s) publié(s) sans PDF'
  FROM ranking_snapshots
  WHERE is_published = true AND pdf_url IS NULL;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_data_integrity IS 'Vérifie l''intégrité des données (diagnostics)';

-- =====================================================
-- 6. NETTOYAGE DONNÉES DE TEST (DÉVELOPPEMENT UNIQUEMENT)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_test_data()
RETURNS TEXT AS $$
BEGIN
  -- ATTENTION: Cette fonction supprime TOUTES les données
  -- À utiliser UNIQUEMENT en développement

  DELETE FROM audit_log;
  DELETE FROM selection_decisions;
  DELETE FROM eligible_athletes;
  DELETE FROM eligibility_criteria;
  DELETE FROM selection_events;
  DELETE FROM ranking_snapshot_data;
  DELETE FROM ranking_snapshots;
  DELETE FROM matches;
  DELETE FROM results;
  DELETE FROM events;
  DELETE FROM scoring_rules;
  DELETE FROM athletes WHERE id NOT IN (SELECT id FROM profiles); -- Garde athlètes liés à des profils

  RETURN 'Toutes les données de test ont été supprimées';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_test_data IS 'DANGER: Supprime toutes les données (développement uniquement)';

-- =====================================================
-- 7. SEED DATA INITIAL (PREMIÈRE INSTALLATION)
-- =====================================================

CREATE OR REPLACE FUNCTION seed_initial_data()
RETURNS TEXT AS $$
DECLARE
  v_scoring_rule_id UUID;
BEGIN
  -- Créer règle de calcul par défaut (v1.0)
  INSERT INTO scoring_rules (
    version_name,
    description,
    formula,
    is_active,
    valid_from
  ) VALUES (
    'v1.0',
    'Règle de calcul standard Swiss Taekwondo',
    '{
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
      "apply_coefficient": true
    }'::jsonb,
    true,
    CURRENT_DATE
  ) RETURNING id INTO v_scoring_rule_id;

  RETURN 'Données initiales créées avec succès. Scoring rule ID: ' || v_scoring_rule_id::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION seed_initial_data IS 'Créer données initiales (première installation)';

-- =====================================================
-- FIN DES FONCTIONS SQL
-- =====================================================
