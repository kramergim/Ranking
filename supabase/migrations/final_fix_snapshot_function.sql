-- =====================================================
-- Final Fix: generate_ranking_snapshot function
-- Maps correctly from ranking_live to ranking_snapshot_data
-- =====================================================

-- Function 1: Create new snapshot (month, year, title)
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
  -- Calculate last day of the month
  v_snapshot_date := (DATE_TRUNC('month', make_date(p_snapshot_year, p_snapshot_month, 1)) + INTERVAL '1 month - 1 day')::date;

  -- Create snapshot record
  INSERT INTO ranking_snapshots (snapshot_date, snapshot_month, snapshot_year, title, is_published)
  VALUES (v_snapshot_date, p_snapshot_month, p_snapshot_year, p_title, false)
  RETURNING id INTO v_snapshot_id;

  -- Generate snapshot data from ranking_live
  INSERT INTO ranking_snapshot_data (
    snapshot_id,
    athlete_id,
    athlete_name,           -- Maps from full_name
    athlete_age_category,   -- Maps from age_category
    athlete_weight_category,-- Maps from weight_category
    athlete_gender,         -- Maps from gender
    athlete_club,           -- Maps from club
    athlete_photo_url,      -- Maps from photo_url
    athlete_hub_level,      -- Maps from hub_level
    rank_position,          -- Calculated ROW_NUMBER
    total_points,
    tournaments_count,
    best_result_rank,       -- Maps from best_rank
    best_result_event
  )
  SELECT
    v_snapshot_id,
    rl.athlete_id,
    rl.full_name,           -- ✅ CORRECTED: use full_name not athlete_name
    rl.age_category,
    rl.weight_category,
    rl.gender,
    rl.club,
    rl.photo_url,           -- ✅ Directly from ranking_live (added in earlier migration)
    rl.hub_level,           -- ✅ Directly from ranking_live (added in earlier migration)
    ROW_NUMBER() OVER (
      PARTITION BY rl.age_category
      ORDER BY rl.total_points DESC, rl.full_name ASC  -- ✅ CORRECTED: use full_name
    ) as rank_position,
    rl.total_points,
    rl.tournaments_count,
    rl.best_rank,           -- ✅ CORRECTED: use best_rank not best_result_rank
    rl.best_result_event
  FROM ranking_live rl
  WHERE rl.age_category IS NOT NULL;

  RETURN v_snapshot_id;
END;
$$;

COMMENT ON FUNCTION generate_ranking_snapshot(INT, INT, TEXT) IS 'Creates a new ranking snapshot for the specified month/year (includes photo and hub level)';

-- Function 2: Regenerate existing snapshot (snapshot_id)
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
  -- Check if snapshot exists
  IF NOT EXISTS (
    SELECT 1 FROM ranking_snapshots WHERE id = p_snapshot_id
  ) THEN
    RAISE EXCEPTION 'Snapshot % not found', p_snapshot_id;
  END IF;

  -- Delete old data
  DELETE FROM ranking_snapshot_data WHERE snapshot_id = p_snapshot_id;

  -- Regenerate from ranking_live
  INSERT INTO ranking_snapshot_data (
    snapshot_id,
    athlete_id,
    athlete_name,           -- Maps from full_name
    athlete_age_category,   -- Maps from age_category
    athlete_weight_category,-- Maps from weight_category
    athlete_gender,         -- Maps from gender
    athlete_club,           -- Maps from club
    athlete_photo_url,      -- Maps from photo_url
    athlete_hub_level,      -- Maps from hub_level
    rank_position,          -- Calculated ROW_NUMBER
    total_points,
    tournaments_count,
    best_result_rank,       -- Maps from best_rank
    best_result_event
  )
  SELECT
    p_snapshot_id,
    rl.athlete_id,
    rl.full_name,           -- ✅ CORRECTED: use full_name not athlete_name
    rl.age_category,
    rl.weight_category,
    rl.gender,
    rl.club,
    rl.photo_url,           -- ✅ Directly from ranking_live
    rl.hub_level,           -- ✅ Directly from ranking_live
    ROW_NUMBER() OVER (
      PARTITION BY rl.age_category
      ORDER BY rl.total_points DESC, rl.full_name ASC  -- ✅ CORRECTED: use full_name
    ) as rank_position,
    rl.total_points,
    rl.tournaments_count,
    rl.best_rank,           -- ✅ CORRECTED: use best_rank not best_result_rank
    rl.best_result_event
  FROM ranking_live rl
  WHERE rl.age_category IS NOT NULL;

  -- Calculate statistics
  SELECT
    COUNT(*),
    COALESCE(MAX(total_points), 0),
    COALESCE(MIN(total_points), 0)
  INTO v_athletes_count, v_max_points, v_min_points
  FROM ranking_snapshot_data
  WHERE snapshot_id = p_snapshot_id;

  -- Return results
  RETURN QUERY
  SELECT v_athletes_count, v_max_points, v_min_points;
END;
$$;

COMMENT ON FUNCTION generate_ranking_snapshot(UUID) IS 'Regenerates data for an existing snapshot (includes photo and hub level)';

-- Verification
SELECT 'Both generate_ranking_snapshot functions fixed and restored successfully!' as status;
