-- =====================================================
-- CARRYOVER POINTS FIX
-- =====================================================
-- Problem: Snapshot ignores athletes.last_year_pts (manual admin field)
-- Solution:
--   - current_year_points = sum of events in snapshot_year <= snapshot_date
--   - last_year_pts = copied from athlete profile (manual field)
--   - carryover = last_year_pts * 0.4
--   - total_points = current_year_points + carryover
-- =====================================================

-- =====================================================
-- STEP 1: Ensure athletes.last_year_pts exists
-- =====================================================

ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS last_year_pts DECIMAL(10,2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN athletes.last_year_pts IS 'Manual admin input: athlete points from previous year (for carryover calculation)';

-- =====================================================
-- STEP 2: Ensure ranking_snapshot_data has needed columns
-- =====================================================

ALTER TABLE ranking_snapshot_data
ADD COLUMN IF NOT EXISTS current_year_points DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_year_pts DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN ranking_snapshot_data.current_year_points IS 'Points earned in snapshot year (up to snapshot date)';
COMMENT ON COLUMN ranking_snapshot_data.last_year_pts IS 'Copied from athlete profile - manual admin input for carryover';

-- =====================================================
-- STEP 3: Update snapshot generation function
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
  -- Calculate snapshot date (last day of month)
  v_snapshot_date := (DATE_TRUNC('month', make_date(p_snapshot_year, p_snapshot_month, 1)) + INTERVAL '1 month - 1 day')::date;

  -- Create snapshot record
  INSERT INTO ranking_snapshots (snapshot_date, snapshot_month, snapshot_year, title, is_published)
  VALUES (v_snapshot_date, p_snapshot_month, p_snapshot_year, p_title, false)
  RETURNING id INTO v_snapshot_id;

  -- Generate snapshot data with carryover calculation
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
    ranking_position,
    current_year_points,
    last_year_pts,
    total_points,
    tournaments_count,
    age_category,
    weight_category,
    gender,
    club,
    last_event_date,
    best_result_rank,
    best_result_event
  )
  SELECT
    v_snapshot_id,
    a.id,
    a.first_name || ' ' || a.last_name,
    a.age_category,
    a.weight_category,
    a.gender,
    a.club,
    a.photo_url,
    a.hub_level,

    -- Ranking position (calculated per age_category, ordered by total_points)
    ROW_NUMBER() OVER (
      PARTITION BY a.age_category
      ORDER BY (
        -- Current year points
        COALESCE((
          SELECT SUM(r.points_earned)
          FROM results r
          JOIN events e ON e.id = r.event_id
          WHERE r.athlete_id = a.id
            AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
            AND e.event_date <= v_snapshot_date
            AND r.points_earned IS NOT NULL
        ), 0)
        +
        -- Carryover from last year
        (COALESCE(a.last_year_pts, 0) * 0.4)
      ) DESC,
      a.last_name,
      a.first_name
    ) as ranking_position,

    -- Current year points (events in snapshot_year, on or before snapshot_date)
    COALESCE((
      SELECT SUM(r.points_earned)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = a.id
        AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
        AND e.event_date <= v_snapshot_date
        AND r.points_earned IS NOT NULL
    ), 0) as current_year_points,

    -- Last year points (copied from athlete profile - manual admin input)
    COALESCE(a.last_year_pts, 0) as last_year_pts,

    -- Total points = current_year + carryover
    COALESCE((
      SELECT SUM(r.points_earned)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = a.id
        AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
        AND e.event_date <= v_snapshot_date
        AND r.points_earned IS NOT NULL
    ), 0) + (COALESCE(a.last_year_pts, 0) * 0.4) as total_points,

    -- Tournament count
    COALESCE((
      SELECT COUNT(DISTINCT r.event_id)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = a.id
        AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
        AND e.event_date <= v_snapshot_date
        AND r.points_earned IS NOT NULL
    ), 0) as tournaments_count,

    -- Duplicate category fields for compatibility
    a.age_category,
    a.weight_category,
    a.gender,
    a.club,

    -- Last event date
    (
      SELECT MAX(e.event_date)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = a.id
        AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
        AND e.event_date <= v_snapshot_date
        AND r.points_earned IS NOT NULL
    ) as last_event_date,

    -- Best rank
    (
      SELECT MIN(r.final_rank)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = a.id
        AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
        AND e.event_date <= v_snapshot_date
        AND r.points_earned IS NOT NULL
    ) as best_result_rank,

    -- Best result event name
    (
      SELECT e.name
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = a.id
        AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
        AND e.event_date <= v_snapshot_date
        AND r.points_earned IS NOT NULL
      ORDER BY r.final_rank ASC
      LIMIT 1
    ) as best_result_event

  FROM athletes a
  WHERE a.is_active = true
    AND a.age_category IS NOT NULL;

  RETURN v_snapshot_id;
END;
$$;

COMMENT ON FUNCTION generate_ranking_snapshot(INT, INT, TEXT) IS 'Creates snapshot with carryover from athlete.last_year_pts (manual field)';

-- =====================================================
-- STEP 4: Update regenerate function (same logic)
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
  v_snapshot_year INT;
  v_snapshot_date DATE;
BEGIN
  -- Get snapshot year and date
  SELECT snapshot_year, snapshot_date
  INTO v_snapshot_year, v_snapshot_date
  FROM ranking_snapshots
  WHERE id = p_snapshot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Snapshot % not found', p_snapshot_id;
  END IF;

  -- Delete existing data
  DELETE FROM ranking_snapshot_data WHERE snapshot_id = p_snapshot_id;

  -- Regenerate with same logic as create
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
    ranking_position,
    current_year_points,
    last_year_pts,
    total_points,
    tournaments_count,
    age_category,
    weight_category,
    gender,
    club,
    last_event_date,
    best_result_rank,
    best_result_event
  )
  SELECT
    p_snapshot_id,
    a.id,
    a.first_name || ' ' || a.last_name,
    a.age_category,
    a.weight_category,
    a.gender,
    a.club,
    a.photo_url,
    a.hub_level,

    ROW_NUMBER() OVER (
      PARTITION BY a.age_category
      ORDER BY (
        COALESCE((
          SELECT SUM(r.points_earned)
          FROM results r
          JOIN events e ON e.id = r.event_id
          WHERE r.athlete_id = a.id
            AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year
            AND e.event_date <= v_snapshot_date
            AND r.points_earned IS NOT NULL
        ), 0)
        +
        (COALESCE(a.last_year_pts, 0) * 0.4)
      ) DESC,
      a.last_name,
      a.first_name
    ) as ranking_position,

    COALESCE((
      SELECT SUM(r.points_earned)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = a.id
        AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year
        AND e.event_date <= v_snapshot_date
        AND r.points_earned IS NOT NULL
    ), 0) as current_year_points,

    COALESCE(a.last_year_pts, 0) as last_year_pts,

    COALESCE((
      SELECT SUM(r.points_earned)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = a.id
        AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year
        AND e.event_date <= v_snapshot_date
        AND r.points_earned IS NOT NULL
    ), 0) + (COALESCE(a.last_year_pts, 0) * 0.4) as total_points,

    COALESCE((
      SELECT COUNT(DISTINCT r.event_id)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = a.id
        AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year
        AND e.event_date <= v_snapshot_date
        AND r.points_earned IS NOT NULL
    ), 0) as tournaments_count,

    a.age_category,
    a.weight_category,
    a.gender,
    a.club,

    (
      SELECT MAX(e.event_date)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = a.id
        AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year
        AND e.event_date <= v_snapshot_date
        AND r.points_earned IS NOT NULL
    ) as last_event_date,

    (
      SELECT MIN(r.final_rank)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = a.id
        AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year
        AND e.event_date <= v_snapshot_date
        AND r.points_earned IS NOT NULL
    ) as best_result_rank,

    (
      SELECT e.name
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = a.id
        AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year
        AND e.event_date <= v_snapshot_date
        AND r.points_earned IS NOT NULL
      ORDER BY r.final_rank ASC
      LIMIT 1
    ) as best_result_event

  FROM athletes a
  WHERE a.is_active = true
    AND a.age_category IS NOT NULL;

  -- Calculate stats
  SELECT COUNT(*), COALESCE(MAX(total_points), 0), COALESCE(MIN(total_points), 0)
  INTO v_athletes_count, v_max_points, v_min_points
  FROM ranking_snapshot_data
  WHERE snapshot_id = p_snapshot_id;

  RETURN QUERY SELECT v_athletes_count, v_max_points, v_min_points;
END;
$$;

COMMENT ON FUNCTION generate_ranking_snapshot(UUID) IS 'Regenerates snapshot with carryover from athlete.last_year_pts';

-- =====================================================
-- VALIDATION QUERIES
-- =====================================================

-- Query 1: Check if athletes have last_year_pts
-- SELECT id, first_name, last_name, last_year_pts
-- FROM athletes
-- WHERE last_year_pts > 0
-- LIMIT 5;

-- Query 2: After creating snapshot, verify carryover calculation
-- SELECT
--   athlete_name,
--   current_year_points,
--   last_year_pts,
--   (last_year_pts * 0.4) as carryover,
--   total_points,
--   (current_year_points + (last_year_pts * 0.4)) as expected_total
-- FROM ranking_snapshot_data
-- WHERE snapshot_id = 'YOUR_SNAPSHOT_ID'
-- ORDER BY total_points DESC
-- LIMIT 10;

SELECT 'Carryover points fix applied successfully!' as status;
