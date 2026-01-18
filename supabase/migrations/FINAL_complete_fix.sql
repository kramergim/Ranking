-- =====================================================
-- FINAL COMPLETE FIX
-- Fixes: triggers, missing columns, and snapshot generation
-- =====================================================

-- =====================================================
-- PART 1: Add missing columns to ranking_snapshot_data
-- =====================================================

-- Add year-based point columns if they don't exist
ALTER TABLE ranking_snapshot_data
ADD COLUMN IF NOT EXISTS current_year_points DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_year_pts DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS age_category TEXT,
ADD COLUMN IF NOT EXISTS weight_category TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS club TEXT,
ADD COLUMN IF NOT EXISTS last_event_date DATE,
ADD COLUMN IF NOT EXISTS athlete_photo_url TEXT,
ADD COLUMN IF NOT EXISTS athlete_hub_level TEXT,
ADD COLUMN IF NOT EXISTS ranking_position INTEGER;

-- Rename rank_position to match what functions expect
-- (This is safe because both columns will exist temporarily)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'ranking_snapshot_data'
             AND column_name = 'rank_position'
             AND column_name != 'ranking_position') THEN
    -- Copy data from rank_position to ranking_position if needed
    UPDATE ranking_snapshot_data SET ranking_position = rank_position WHERE ranking_position IS NULL;
  END IF;
END $$;

COMMENT ON COLUMN ranking_snapshot_data.current_year_points IS 'Points earned in current year at time of snapshot';
COMMENT ON COLUMN ranking_snapshot_data.last_year_pts IS 'Points from previous year at time of snapshot';

-- =====================================================
-- PART 2: Fix trigger functions
-- =====================================================

-- Trigger 1: For ranking_snapshots table
-- This trigger checks OLD.is_published (NOT snapshot_id!)
CREATE OR REPLACE FUNCTION prevent_snapshot_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow bypass if session flag is set (for admin operations)
  IF current_setting('app.bypass_snapshot_lock', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Check if OLD snapshot is published
  IF OLD.is_published = true THEN
    RAISE EXCEPTION 'Cannot modify a published ranking snapshot';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_snapshot_modification IS 'Prevents modification of published snapshots on ranking_snapshots table';

-- Trigger 2: For ranking_snapshot_data table
-- This trigger checks if the PARENT snapshot is published
CREATE OR REPLACE FUNCTION prevent_snapshot_data_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow bypass if session flag is set (for admin operations)
  IF current_setting('app.bypass_snapshot_lock', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Check if parent snapshot is published
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

COMMENT ON FUNCTION prevent_snapshot_data_modification IS 'Prevents modification of data from published snapshots on ranking_snapshot_data table';

-- =====================================================
-- PART 3: Ensure ranking_live has all needed columns
-- =====================================================

DROP VIEW IF EXISTS ranking_live CASCADE;

CREATE OR REPLACE VIEW ranking_live AS
WITH yearly_points AS (
  SELECT
    r.athlete_id,
    SUM(CASE WHEN EXTRACT(YEAR FROM e.event_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        THEN r.points_earned ELSE 0 END) AS current_year_points,
    SUM(CASE WHEN EXTRACT(YEAR FROM e.event_date) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
        THEN r.points_earned ELSE 0 END) AS last_year_pts
  FROM results r
  JOIN events e ON e.id = r.event_id
  WHERE r.points_earned IS NOT NULL
  GROUP BY r.athlete_id
)
SELECT
  a.id AS athlete_id,
  a.first_name,
  a.last_name,
  a.first_name || ' ' || a.last_name AS full_name,
  a.first_name || ' ' || a.last_name AS athlete_name,  -- Alias for compatibility
  a.date_of_birth,
  a.gender,
  a.age_category,
  a.weight_category,
  a.club,
  a.license_number,
  a.photo_url,
  a.hub_level,

  -- Points
  COALESCE(SUM(r.points_earned), 0) AS total_points,
  COALESCE(yp.current_year_points, 0) AS current_year_points,
  COALESCE(yp.last_year_pts, 0) AS last_year_pts,

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
LEFT JOIN yearly_points yp ON yp.athlete_id = a.id
WHERE a.is_active = true
GROUP BY
  a.id, a.first_name, a.last_name, a.date_of_birth, a.gender,
  a.age_category, a.weight_category, a.club, a.license_number,
  a.photo_url, a.hub_level, yp.current_year_points, yp.last_year_pts
ORDER BY rank_position;

COMMENT ON VIEW ranking_live IS 'Live ranking with all fields including year-based points, photo, and hub level';

-- =====================================================
-- PART 4: Update snapshot generation functions
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
    rl.current_year_points,
    rl.last_year_pts,
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
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ranking_snapshots WHERE id = p_snapshot_id) THEN
    RAISE EXCEPTION 'Snapshot % not found', p_snapshot_id;
  END IF;

  DELETE FROM ranking_snapshot_data WHERE snapshot_id = p_snapshot_id;

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
    rl.current_year_points,
    rl.last_year_pts,
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

-- Function 3: Admin regenerate with bypass
CREATE OR REPLACE FUNCTION admin_regenerate_snapshot(
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
BEGIN
  -- Set bypass flag
  PERFORM set_config('app.bypass_snapshot_lock', 'on', true);

  -- Call the standard regenerate function
  RETURN QUERY SELECT * FROM generate_ranking_snapshot(p_snapshot_id);
END;
$$;

COMMENT ON FUNCTION admin_regenerate_snapshot IS 'Admin function to regenerate published snapshots (bypasses protection)';

-- =====================================================
-- Verification
-- =====================================================

SELECT 'FINAL FIX COMPLETE! Triggers fixed, columns added, functions updated.' as status;
