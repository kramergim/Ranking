-- Step 3: Update the generate_ranking_snapshot function
-- Run this AFTER checking step2 results

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
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ranking_snapshots
    WHERE id = p_snapshot_id AND is_published = false
  ) THEN
    RAISE EXCEPTION 'Snapshot not found or already published';
  END IF;

  DELETE FROM ranking_snapshot_data WHERE snapshot_id = p_snapshot_id;

  INSERT INTO ranking_snapshot_data (
    snapshot_id,
    athlete_id,
    athlete_name,
    athlete_age_category,
    athlete_weight_category,
    athlete_gender,
    athlete_club,
    athlete_photo_url,
    athlete_hub_level,
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
    rl.photo_url,
    rl.hub_level,
    rl.rank_position,
    rl.total_points,
    rl.tournaments_count,
    rl.best_rank,
    rl.best_result_event
  FROM ranking_live rl;

  SELECT
    COUNT(*),
    COALESCE(MAX(total_points), 0),
    COALESCE(MIN(total_points), 0)
  INTO v_athletes_count, v_max_points, v_min_points
  FROM ranking_snapshot_data
  WHERE snapshot_id = p_snapshot_id;

  RETURN QUERY
  SELECT v_athletes_count, v_max_points, v_min_points;
END;
$$;
