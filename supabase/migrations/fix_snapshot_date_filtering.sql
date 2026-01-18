-- =====================================================
-- FIX: Snapshot with Correct Previous Year Points
-- =====================================================
-- This migration fixes snapshot generation to:
-- 1. Use athletes.last_year_pts for carryover (40%)
-- 2. Calculate current year points from results
-- 3. Only include events on or before snapshot_date
-- =====================================================

-- Ensure last_year_pts column exists on athletes table
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS last_year_pts DECIMAL DEFAULT 0;

-- Drop old functions first to avoid ambiguity
DROP FUNCTION IF EXISTS generate_ranking_snapshot(UUID);
DROP FUNCTION IF EXISTS generate_ranking_snapshot(INT, INT, TEXT);

-- =====================================================
-- VERSION 1: UUID-based (regenerate existing snapshot)
-- =====================================================

CREATE FUNCTION generate_ranking_snapshot(
  p_snapshot_id UUID
) RETURNS TABLE (
  athletes_count INTEGER,
  max_points DECIMAL,
  min_points DECIMAL
) AS $$
DECLARE
  v_snapshot_date DATE;
  v_snapshot_year INT;
  v_athletes_count INTEGER;
  v_max_points DECIMAL;
  v_min_points DECIMAL;
BEGIN
  -- Get snapshot date and year
  SELECT snapshot_date, snapshot_year INTO v_snapshot_date, v_snapshot_year
  FROM ranking_snapshots
  WHERE id = p_snapshot_id AND is_published = false;

  IF v_snapshot_date IS NULL THEN
    RAISE EXCEPTION 'Snapshot not found or already published';
  END IF;

  -- Delete old data if exists
  DELETE FROM ranking_snapshot_data WHERE snapshot_id = p_snapshot_id;

  -- Generate ranking with date filtering
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
    a.id,
    a.first_name || ' ' || a.last_name,
    a.age_category,
    a.weight_category,
    a.gender,
    a.club,
    ROW_NUMBER() OVER (
      ORDER BY
        (COALESCE(SUM(r.points_earned), 0) + COALESCE(a.last_year_pts, 0) * 0.4) DESC,
        a.last_name,
        a.first_name
    ),
    COALESCE(SUM(r.points_earned), 0) + COALESCE(a.last_year_pts, 0) * 0.4,
    COUNT(DISTINCT r.event_id),
    MIN(r.final_rank),
    (
      SELECT e2.name
      FROM results r2
      JOIN events e2 ON e2.id = r2.event_id
      WHERE r2.athlete_id = a.id
        AND r2.final_rank = MIN(r.final_rank)
        AND e2.event_date <= v_snapshot_date
      LIMIT 1
    )
  FROM athletes a
  LEFT JOIN results r ON r.athlete_id = a.id AND r.points_earned IS NOT NULL
  LEFT JOIN events e ON e.id = r.event_id
  WHERE a.is_active = true
    AND (e.event_date IS NULL OR e.event_date <= v_snapshot_date)
    AND (e.event_date IS NULL OR EXTRACT(YEAR FROM e.event_date) = v_snapshot_year)
  GROUP BY a.id, a.first_name, a.last_name, a.age_category, a.weight_category, a.gender, a.club, a.last_year_pts
  HAVING (COALESCE(SUM(r.points_earned), 0) + COALESCE(a.last_year_pts, 0) * 0.4) > 0
  ORDER BY
    (COALESCE(SUM(r.points_earned), 0) + COALESCE(a.last_year_pts, 0) * 0.4) DESC,
    a.last_name,
    a.first_name;

  -- Calculate statistics
  SELECT
    COUNT(*),
    MAX(total_points),
    MIN(total_points)
  INTO v_athletes_count, v_max_points, v_min_points
  FROM ranking_snapshot_data
  WHERE snapshot_id = p_snapshot_id;

  -- Return result
  RETURN QUERY SELECT v_athletes_count, v_max_points, v_min_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_ranking_snapshot(UUID) IS 'Generates snapshot using athletes.last_year_pts for carryover (40%)';

-- =====================================================
-- VERSION 2: Month/Year-based (create new snapshot)
-- =====================================================

CREATE FUNCTION generate_ranking_snapshot(
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
  -- Calculate snapshot date (last day of the month)
  v_snapshot_date := (DATE_TRUNC('month', make_date(p_snapshot_year, p_snapshot_month, 1)) + INTERVAL '1 month - 1 day')::date;

  -- Create snapshot
  INSERT INTO ranking_snapshots (
    snapshot_date,
    snapshot_month,
    snapshot_year,
    title,
    is_published
  ) VALUES (
    v_snapshot_date,
    p_snapshot_month,
    p_snapshot_year,
    p_title,
    false
  )
  RETURNING id INTO v_snapshot_id;

  -- Generate ranking data with rank WITHIN age_category
  -- Current year points + athletes.last_year_pts * 0.4
  INSERT INTO ranking_snapshot_data (
    snapshot_id,
    athlete_id,
    athlete_name,
    athlete_age_category,
    athlete_weight_category,
    athlete_gender,
    athlete_club,
    ranking_position,
    total_points,
    current_year_points,
    last_year_pts,
    tournaments_count,
    best_result_rank,
    best_result_event,
    last_event_date,
    age_category,
    weight_category,
    gender,
    club
  )
  SELECT
    v_snapshot_id,
    a.id,
    a.first_name || ' ' || a.last_name,
    a.age_category,
    a.weight_category,
    a.gender,
    a.club,
    -- Rank within age_category using total_points
    ROW_NUMBER() OVER (
      PARTITION BY a.age_category
      ORDER BY
        (COALESCE(SUM(r.points_earned), 0) + COALESCE(a.last_year_pts, 0) * 0.4) DESC,
        a.last_name ASC,
        a.first_name ASC
    ),
    -- Total points = current year + carryover (40% of last_year_pts)
    COALESCE(SUM(r.points_earned), 0) + COALESCE(a.last_year_pts, 0) * 0.4,
    -- Current year points only
    COALESCE(SUM(r.points_earned), 0),
    -- Previous year points from athlete record (before 40% reduction)
    COALESCE(a.last_year_pts, 0),
    -- Tournament count
    COUNT(DISTINCT r.event_id),
    -- Best result rank
    MIN(r.final_rank),
    -- Best result event name
    (
      SELECT e2.name
      FROM results r2
      JOIN events e2 ON e2.id = r2.event_id
      WHERE r2.athlete_id = a.id
        AND r2.final_rank = MIN(r.final_rank)
        AND e2.event_date <= v_snapshot_date
        AND EXTRACT(YEAR FROM e2.event_date) = p_snapshot_year
      LIMIT 1
    ),
    -- Last event date
    MAX(e.event_date),
    -- Repeat for output columns
    a.age_category,
    a.weight_category,
    a.gender,
    a.club
  FROM athletes a
  LEFT JOIN results r ON r.athlete_id = a.id AND r.points_earned IS NOT NULL
  LEFT JOIN events e ON e.id = r.event_id
  WHERE a.is_active = true
    AND a.age_category IS NOT NULL
    -- Only include events on or before snapshot date
    AND (e.event_date IS NULL OR e.event_date <= v_snapshot_date)
    -- Only include events from current year
    AND (e.event_date IS NULL OR EXTRACT(YEAR FROM e.event_date) = p_snapshot_year)
  GROUP BY a.id, a.first_name, a.last_name, a.age_category, a.weight_category, a.gender, a.club, a.last_year_pts
  HAVING
    -- Only include athletes with points (current year + carryover)
    (COALESCE(SUM(r.points_earned), 0) + COALESCE(a.last_year_pts, 0) * 0.4) > 0
  ORDER BY
    a.age_category,
    (COALESCE(SUM(r.points_earned), 0) + COALESCE(a.last_year_pts, 0) * 0.4) DESC,
    a.last_name ASC,
    a.first_name ASC;

  RETURN v_snapshot_id;
END;
$$;

COMMENT ON FUNCTION generate_ranking_snapshot(INT, INT, TEXT) IS 'Creates ranking snapshot: current_year_points + (athletes.last_year_pts * 0.4)';

-- =====================================================
-- End of migration
-- =====================================================
