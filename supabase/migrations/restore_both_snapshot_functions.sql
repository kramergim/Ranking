-- =====================================================
-- Restore Both generate_ranking_snapshot Functions
-- =====================================================
-- Function 1: Create new snapshots (p_snapshot_month, p_snapshot_year, p_title)
-- Function 2: Regenerate existing snapshots (p_snapshot_id)
-- PostgreSQL supports function overloading, so both can coexist
-- =====================================================

-- =====================================================
-- FUNCTION 1: Create new snapshot (original signature)
-- =====================================================

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
    athlete_name,
    athlete_age_category,
    athlete_weight_category,
    athlete_gender,
    athlete_club,
    athlete_hub_level,      -- ✅ Hub level
    athlete_photo_url,      -- ✅ Photo URL
    rank_position,
    total_points,
    current_year_points,
    last_year_pts,
    tournaments_count,
    age_category,
    weight_category,
    gender,
    club,
    last_event_date
  )
  SELECT
    v_snapshot_id,
    rl.athlete_id,
    rl.athlete_name,
    rl.age_category,
    rl.weight_category,
    rl.gender,
    rl.club,
    a.hub_level,           -- ✅ From athletes table
    a.photo_url,           -- ✅ From athletes table
    ROW_NUMBER() OVER (
      PARTITION BY rl.age_category
      ORDER BY rl.total_points DESC, rl.athlete_name ASC
    ) as rank_position,
    rl.total_points,
    rl.current_year_points,
    rl.last_year_pts,
    rl.tournaments_count,
    rl.age_category,
    rl.weight_category,
    rl.gender,
    rl.club,
    rl.last_event_date
  FROM ranking_live rl
  LEFT JOIN athletes a ON a.id = rl.athlete_id
  WHERE rl.age_category IS NOT NULL;

  RETURN v_snapshot_id;
END;
$$;

COMMENT ON FUNCTION generate_ranking_snapshot(INT, INT, TEXT) IS 'Creates a new ranking snapshot for the specified month/year (includes photo and hub level)';

-- =====================================================
-- FUNCTION 2: Regenerate existing snapshot (for admin)
-- =====================================================

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
  v_snapshot_month INT;
  v_snapshot_year INT;
BEGIN
  -- Get snapshot month/year
  SELECT snapshot_month, snapshot_year
  INTO v_snapshot_month, v_snapshot_year
  FROM ranking_snapshots
  WHERE id = p_snapshot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Snapshot % not found', p_snapshot_id;
  END IF;

  -- Delete old data
  DELETE FROM ranking_snapshot_data WHERE snapshot_id = p_snapshot_id;

  -- Regenerate from ranking_live
  INSERT INTO ranking_snapshot_data (
    snapshot_id,
    athlete_id,
    athlete_name,
    athlete_age_category,
    athlete_weight_category,
    athlete_gender,
    athlete_club,
    athlete_hub_level,      -- ✅ Hub level
    athlete_photo_url,      -- ✅ Photo URL
    rank_position,
    total_points,
    current_year_points,
    last_year_pts,
    tournaments_count,
    age_category,
    weight_category,
    gender,
    club,
    last_event_date
  )
  SELECT
    p_snapshot_id,
    rl.athlete_id,
    rl.athlete_name,
    rl.age_category,
    rl.weight_category,
    rl.gender,
    rl.club,
    a.hub_level,           -- ✅ From athletes table
    a.photo_url,           -- ✅ From athletes table
    ROW_NUMBER() OVER (
      PARTITION BY rl.age_category
      ORDER BY rl.total_points DESC, rl.athlete_name ASC
    ) as rank_position,
    rl.total_points,
    rl.current_year_points,
    rl.last_year_pts,
    rl.tournaments_count,
    rl.age_category,
    rl.weight_category,
    rl.gender,
    rl.club,
    rl.last_event_date
  FROM ranking_live rl
  LEFT JOIN athletes a ON a.id = rl.athlete_id
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

-- =====================================================
-- Verification
-- =====================================================

SELECT 'Both generate_ranking_snapshot functions restored successfully!' as status;
