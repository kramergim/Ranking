-- =====================================================
-- FIX: Year-based points calculation
-- Problem: Events are in 2026, but code was using CURRENT_DATE (2025)
-- Solution: Calculate year-based points at snapshot creation time
-- =====================================================

-- Drop the ranking_live view (we'll recreate it without year-based points)
DROP VIEW IF EXISTS ranking_live CASCADE;

CREATE OR REPLACE VIEW ranking_live AS
SELECT
  a.id AS athlete_id,
  a.first_name,
  a.last_name,
  a.first_name || ' ' || a.last_name AS full_name,
  a.first_name || ' ' || a.last_name AS athlete_name,
  a.date_of_birth,
  a.gender,
  a.age_category,
  a.weight_category,
  a.club,
  a.license_number,
  a.photo_url,
  a.hub_level,

  -- Total points (all time)
  COALESCE(SUM(r.points_earned), 0) AS total_points,

  -- Tournament stats
  COUNT(DISTINCT r.event_id) AS tournaments_count,
  MIN(r.final_rank) AS best_rank,
  (
    SELECT e.name
    FROM results r2
    JOIN events e ON e.id = r2.event_id
    WHERE r2.athlete_id = a.id AND r2.final_rank = MIN(r.final_rank)
    LIMIT 1
  ) AS best_result_event,

  -- Medals
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 1) AS gold_medals,
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 2) AS silver_medals,
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 3) AS bronze_medals,

  -- Other stats
  COALESCE(SUM(r.matches_won), 0) AS total_matches_won,
  MAX(e.event_date) AS last_event_date,

  -- Global rank
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
  a.photo_url, a.hub_level
ORDER BY rank_position;

COMMENT ON VIEW ranking_live IS 'Live ranking without year-based points (calculated at snapshot time)';

-- =====================================================
-- Update snapshot generation to calculate year-based points
-- =====================================================

-- Function 1: Create new snapshot
CREATE OR REPLACE FUNCTION generate_ranking_snapshot(
  p_snapshot_month INT,
  p_snapshot_year INT,
  p_title TEXT DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_id uuid;
  v_snapshot_date date;
BEGIN
  v_snapshot_date := (DATE_TRUNC('month', make_date(p_snapshot_year, p_snapshot_month, 1)) + INTERVAL '1 month - 1 day')::date;

  INSERT INTO ranking_snapshots (snapshot_date, snapshot_month, snapshot_year, title, is_published)
  VALUES (v_snapshot_date, p_snapshot_month, p_snapshot_year, p_title, false)
  RETURNING id INTO v_snapshot_id;

  -- Generate snapshot data with year-based points calculated relative to snapshot year
  INSERT INTO ranking_snapshot_data (
    snapshot_id, athlete_id, athlete_name, athlete_age_category, athlete_weight_category,
    athlete_gender, athlete_club, athlete_photo_url, athlete_hub_level, ranking_position,
    total_points, current_year_points, last_year_pts, tournaments_count,
    age_category, weight_category, gender, club, last_event_date, best_result_rank, best_result_event
  )
  SELECT
    v_snapshot_id,
    rl.athlete_id,
    rl.athlete_name,
    rl.age_category,
    rl.weight_category,
    rl.gender,
    rl.club,
    rl.photo_url,
    rl.hub_level,
    ROW_NUMBER() OVER (
      PARTITION BY rl.age_category
      ORDER BY rl.total_points DESC, rl.athlete_name ASC
    ) as ranking_position,
    rl.total_points,

    -- Calculate current year points (events in snapshot year)
    COALESCE((
      SELECT SUM(r.points_earned)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = rl.athlete_id
        AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
        AND r.points_earned IS NOT NULL
    ), 0) as current_year_points,

    -- Calculate last year points (events in snapshot year - 1)
    COALESCE((
      SELECT SUM(r.points_earned)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = rl.athlete_id
        AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year - 1
        AND r.points_earned IS NOT NULL
    ), 0) as last_year_pts,

    rl.tournaments_count,
    rl.age_category,
    rl.weight_category,
    rl.gender,
    rl.club,
    rl.last_event_date,
    rl.best_rank,
    rl.best_result_event
  FROM ranking_live rl
  WHERE rl.age_category IS NOT NULL;

  RETURN v_snapshot_id;
END;
$$;

COMMENT ON FUNCTION generate_ranking_snapshot(INT, INT, TEXT) IS 'Creates snapshot with year-based points calculated relative to snapshot year';

-- Function 2: Regenerate existing snapshot
CREATE OR REPLACE FUNCTION generate_ranking_snapshot(
  p_snapshot_id UUID
)
RETURNS TABLE (
  athletes_count INTEGER,
  max_points DECIMAL,
  min_points DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_athletes_count INTEGER;
  v_max_points DECIMAL;
  v_min_points DECIMAL;
  v_snapshot_year INT;
BEGIN
  -- Get snapshot year
  SELECT snapshot_year INTO v_snapshot_year
  FROM ranking_snapshots
  WHERE id = p_snapshot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Snapshot % not found', p_snapshot_id;
  END IF;

  DELETE FROM ranking_snapshot_data WHERE snapshot_id = p_snapshot_id;

  -- Regenerate with year-based points calculated relative to snapshot year
  INSERT INTO ranking_snapshot_data (
    snapshot_id, athlete_id, athlete_name, athlete_age_category, athlete_weight_category,
    athlete_gender, athlete_club, athlete_photo_url, athlete_hub_level, ranking_position,
    total_points, current_year_points, last_year_pts, tournaments_count,
    age_category, weight_category, gender, club, last_event_date, best_result_rank, best_result_event
  )
  SELECT
    p_snapshot_id,
    rl.athlete_id,
    rl.athlete_name,
    rl.age_category,
    rl.weight_category,
    rl.gender,
    rl.club,
    rl.photo_url,
    rl.hub_level,
    ROW_NUMBER() OVER (
      PARTITION BY rl.age_category
      ORDER BY rl.total_points DESC, rl.athlete_name ASC
    ) as ranking_position,
    rl.total_points,

    -- Calculate current year points relative to snapshot year
    COALESCE((
      SELECT SUM(r.points_earned)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = rl.athlete_id
        AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year
        AND r.points_earned IS NOT NULL
    ), 0) as current_year_points,

    -- Calculate last year points relative to snapshot year
    COALESCE((
      SELECT SUM(r.points_earned)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = rl.athlete_id
        AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year - 1
        AND r.points_earned IS NOT NULL
    ), 0) as last_year_pts,

    rl.tournaments_count,
    rl.age_category,
    rl.weight_category,
    rl.gender,
    rl.club,
    rl.last_event_date,
    rl.best_rank,
    rl.best_result_event
  FROM ranking_live rl
  WHERE rl.age_category IS NOT NULL;

  SELECT COUNT(*), COALESCE(MAX(total_points), 0), COALESCE(MIN(total_points), 0)
  INTO v_athletes_count, v_max_points, v_min_points
  FROM ranking_snapshot_data
  WHERE snapshot_id = p_snapshot_id;

  RETURN QUERY SELECT v_athletes_count, v_max_points, v_min_points;
END;
$$;

COMMENT ON FUNCTION generate_ranking_snapshot(UUID) IS 'Regenerates snapshot with year-based points relative to snapshot year';

-- =====================================================
-- Verification
-- =====================================================

SELECT 'Year-based points calculation fixed! Points are now calculated relative to snapshot year.' as status;

-- To test: Create a snapshot for 2026 and it will calculate:
-- - current_year_points = sum of points from events in 2026
-- - last_year_pts = sum of points from events in 2025
