-- Fix: Add photo_url and hub_level to ranking_live view and snapshot generation
-- This ensures athlete photos and performance hub badges are included in snapshots

-- =====================================================
-- Step 1: Update ranking_live view to include photo_url and hub_level
-- =====================================================

DROP VIEW IF EXISTS ranking_live CASCADE;

CREATE OR REPLACE VIEW ranking_live AS
SELECT
  a.id AS athlete_id,
  a.first_name,
  a.last_name,
  a.first_name || ' ' || a.last_name AS full_name,
  a.date_of_birth,
  a.gender,
  a.age_category,
  a.weight_category,
  a.club,
  a.license_number,
  a.photo_url,      -- ✅ Added
  a.hub_level,      -- ✅ Added

  -- Calcul des points totaux
  COALESCE(SUM(r.points_earned), 0) AS total_points,

  -- Nombre de tournois
  COUNT(DISTINCT r.event_id) AS tournaments_count,

  -- Meilleur résultat (rang le plus bas = meilleur)
  MIN(r.final_rank) AS best_rank,

  -- Nom du meilleur résultat
  (
    SELECT e.name
    FROM results r2
    JOIN events e ON e.id = r2.event_id
    WHERE r2.athlete_id = a.id AND r2.final_rank = MIN(r.final_rank)
    LIMIT 1
  ) AS best_result_event,

  -- Nombre de médailles (1er, 2e, 3e)
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 1) AS gold_medals,
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 2) AS silver_medals,
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 3) AS bronze_medals,

  -- Total matchs gagnés
  COALESCE(SUM(r.matches_won), 0) AS total_matches_won,

  -- Dernière participation
  MAX(e.event_date) AS last_event_date,

  -- Rang calculé (global)
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(SUM(r.points_earned), 0) DESC, a.last_name, a.first_name
  ) AS rank_position

FROM athletes a
LEFT JOIN results r ON r.athlete_id = a.id AND r.points_earned IS NOT NULL
LEFT JOIN events e ON e.id = r.event_id
WHERE a.is_active = true
GROUP BY
  a.id, a.first_name, a.last_name, a.date_of_birth, a.gender,
  a.age_category, a.weight_category, a.club, a.license_number,
  a.photo_url, a.hub_level  -- ✅ Added to GROUP BY
ORDER BY rank_position;

COMMENT ON VIEW ranking_live IS 'Ranking en temps réel (admin/selector uniquement) avec photo et hub level. RLS: pas accessible au public.';

-- =====================================================
-- Step 2: Update generate_ranking_snapshot function
-- =====================================================

-- Drop ALL existing versions of the function
DROP FUNCTION IF EXISTS generate_ranking_snapshot(UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_ranking_snapshot(p_snapshot_id UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_ranking_snapshot CASCADE;

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
    athlete_photo_url,      -- ✅ Added
    athlete_hub_level,      -- ✅ Added
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
    rl.photo_url,          -- ✅ Added
    rl.hub_level,          -- ✅ Added
    rl.rank_position,
    rl.total_points,
    rl.tournaments_count,
    rl.best_rank,
    rl.best_result_event
  FROM ranking_live rl;

  -- Calculer statistiques
  SELECT
    COUNT(*),
    COALESCE(MAX(total_points), 0),
    COALESCE(MIN(total_points), 0)
  INTO v_athletes_count, v_max_points, v_min_points
  FROM ranking_snapshot_data
  WHERE snapshot_id = p_snapshot_id;

  -- Retourner résultats
  RETURN QUERY
  SELECT v_athletes_count, v_max_points, v_min_points;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_ranking_snapshot IS 'Génère les données de ranking pour un snapshot (inclut photo et hub level)';
