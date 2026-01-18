-- =====================================================
-- Complete Photo + Hub Level Solution for Published Snapshots
-- =====================================================
-- This migration:
-- 1. Updates the trigger to allow bypass via session flag
-- 2. Creates a SECURITY DEFINER admin function to regenerate published snapshots
-- 3. Ensures all views/functions include photo_url and hub_level
-- =====================================================

-- =====================================================
-- STEP 1: Update trigger to allow bypass
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_snapshot_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow bypass if session flag is set (admin regeneration)
  IF current_setting('app.bypass_snapshot_lock', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Normal protection: prevent modification of published snapshots
  IF EXISTS (
    SELECT 1 FROM ranking_snapshots
    WHERE id = COALESCE(NEW.snapshot_id, OLD.snapshot_id)
    AND is_published = true
  ) THEN
    RAISE EXCEPTION 'Cannot modify a published ranking snapshot';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_snapshot_modification IS 'Prevents modification of published snapshots unless app.bypass_snapshot_lock session flag is set';

-- =====================================================
-- STEP 2: Ensure ranking_live view includes photo + hub
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
  a.photo_url,      -- ✅ Photo field
  a.hub_level,      -- ✅ Hub level field

  COALESCE(SUM(r.points_earned), 0) AS total_points,
  COUNT(DISTINCT r.event_id) AS tournaments_count,
  MIN(r.final_rank) AS best_rank,
  (
    SELECT e.name
    FROM results r2
    JOIN events e ON e.id = r2.event_id
    WHERE r2.athlete_id = a.id AND r2.final_rank = MIN(r.final_rank)
    LIMIT 1
  ) AS best_result_event,
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 1) AS gold_medals,
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 2) AS silver_medals,
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 3) AS bronze_medals,
  COALESCE(SUM(r.matches_won), 0) AS total_matches_won,
  MAX(e.event_date) AS last_event_date,
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

COMMENT ON VIEW ranking_live IS 'Live ranking with photo_url and hub_level (admin/selector only)';

-- =====================================================
-- STEP 3: Update generate_ranking_snapshot function
-- =====================================================

-- Drop all existing versions
DROP FUNCTION IF EXISTS generate_ranking_snapshot(UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_ranking_snapshot(p_snapshot_id UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_ranking_snapshot CASCADE;

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
  -- Verify snapshot exists and is not published
  IF NOT EXISTS (
    SELECT 1 FROM ranking_snapshots
    WHERE id = p_snapshot_id AND is_published = false
  ) THEN
    RAISE EXCEPTION 'Snapshot not found or already published';
  END IF;

  -- Delete old data if exists
  DELETE FROM ranking_snapshot_data WHERE snapshot_id = p_snapshot_id;

  -- Copy from ranking_live to snapshot_data
  INSERT INTO ranking_snapshot_data (
    snapshot_id,
    athlete_id,
    athlete_name,
    athlete_age_category,
    athlete_weight_category,
    athlete_gender,
    athlete_club,
    athlete_photo_url,      -- ✅ Photo field
    athlete_hub_level,      -- ✅ Hub level field
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
    rl.photo_url,          -- ✅ Photo from ranking_live
    rl.hub_level,          -- ✅ Hub level from ranking_live
    rl.rank_position,
    rl.total_points,
    rl.tournaments_count,
    rl.best_rank,
    rl.best_result_event
  FROM ranking_live rl;

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

COMMENT ON FUNCTION generate_ranking_snapshot IS 'Generates snapshot data from ranking_live (includes photo and hub level)';

-- =====================================================
-- STEP 4: Ensure public_athlete_results view includes photo + hub
-- =====================================================

DROP VIEW IF EXISTS public_athlete_results;

CREATE OR REPLACE VIEW public_athlete_results AS
SELECT
  -- Athlete info
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.athlete_club AS club,
  rsd.athlete_age_category AS age_category,
  rsd.athlete_weight_category AS weight_category,
  rsd.athlete_gender AS gender,
  rsd.athlete_photo_url AS photo_url,      -- ✅ Photo field
  rsd.athlete_hub_level AS hub_level,      -- ✅ Hub level field

  -- Snapshot info
  rs.id AS snapshot_id,
  rs.snapshot_date,
  rs.snapshot_month,
  rs.snapshot_year,

  -- Ranking data
  rsd.total_points,
  rsd.current_year_points,
  rsd.last_year_pts,
  rsd.rank_position AS ranking_position,

  -- Event info
  e.id AS event_id,
  e.name AS event_name,
  e.event_date,
  e.coefficient AS event_coefficient,

  -- Result details
  r.id AS result_id,
  r.final_rank,
  r.matches_won,
  r.points_earned,
  r.calculation_explanation

FROM ranking_snapshots rs
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id
LEFT JOIN results r ON rsd.athlete_id = r.athlete_id
LEFT JOIN events e ON r.event_id = e.id

WHERE rs.is_published = true

ORDER BY
  rs.snapshot_date DESC,
  rsd.athlete_name,
  e.event_date DESC NULLS LAST;

GRANT SELECT ON public_athlete_results TO anon;
GRANT SELECT ON public_athlete_results TO authenticated;

COMMENT ON VIEW public_athlete_results IS 'Public view of athlete results from published snapshots (includes photo and hub level)';

-- =====================================================
-- STEP 5: Create admin function to regenerate published snapshots
-- =====================================================

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
DECLARE
  v_athletes_count INTEGER;
  v_max_points DECIMAL;
  v_min_points DECIMAL;
  v_is_published BOOLEAN;
BEGIN
  -- Check if snapshot exists
  SELECT is_published INTO v_is_published
  FROM ranking_snapshots
  WHERE id = p_snapshot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Snapshot % not found', p_snapshot_id;
  END IF;

  -- Set bypass flag for this transaction
  PERFORM set_config('app.bypass_snapshot_lock', 'on', true);

  -- Delete existing data
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
    athlete_photo_url,      -- ✅ Photo field
    athlete_hub_level,      -- ✅ Hub level field
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
    rl.photo_url,          -- ✅ Photo from ranking_live
    rl.hub_level,          -- ✅ Hub level from ranking_live
    rl.rank_position,
    rl.total_points,
    rl.tournaments_count,
    rl.best_rank,
    rl.best_result_event
  FROM ranking_live rl;

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

COMMENT ON FUNCTION admin_regenerate_snapshot IS 'Admin-only function to regenerate snapshot data (bypasses published snapshot protection)';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Query 1: Check if ranking_live includes photo and hub
-- SELECT athlete_id, full_name, photo_url, hub_level FROM ranking_live LIMIT 5;

-- Query 2: Check snapshot data before regeneration
-- SELECT athlete_id, athlete_name, athlete_photo_url, athlete_hub_level
-- FROM ranking_snapshot_data
-- WHERE snapshot_id = 'cc4af567-f40f-42bf-a373-5cb52bbfda22'
-- LIMIT 5;

-- Query 3: Regenerate first snapshot
-- SELECT * FROM admin_regenerate_snapshot('cc4af567-f40f-42bf-a373-5cb52bbfda22');

-- Query 4: Regenerate second snapshot
-- SELECT * FROM admin_regenerate_snapshot('611fb4cd-b380-418e-a634-06867f0baa6d');

-- Query 5: Verify data after regeneration
-- SELECT athlete_id, athlete_name, athlete_photo_url, athlete_hub_level
-- FROM ranking_snapshot_data
-- WHERE snapshot_id = 'cc4af567-f40f-42bf-a373-5cb52bbfda22'
-- LIMIT 5;

-- Query 6: Check public view
-- SELECT athlete_id, athlete_name, photo_url, hub_level
-- FROM public_athlete_results
-- WHERE athlete_name LIKE '%Bashkim%'
-- LIMIT 5;

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

-- 1. Run this migration file to update all views, functions, and triggers
-- 2. Regenerate both published snapshots:
--    SELECT * FROM admin_regenerate_snapshot('cc4af567-f40f-42bf-a373-5cb52bbfda22');
--    SELECT * FROM admin_regenerate_snapshot('611fb4cd-b380-418e-a634-06867f0baa6d');
-- 3. Verify data is populated:
--    SELECT athlete_name, athlete_photo_url, athlete_hub_level
--    FROM ranking_snapshot_data
--    WHERE athlete_name LIKE '%Bashkim%';
-- 4. Test in browser: Click athlete name from public rankings
--    - Should see photo (if exists) or fallback icon
--    - Should see "Performance Hub" badge with hub_level
