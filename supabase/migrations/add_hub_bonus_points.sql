-- =====================================================
-- HUB BONUS POINTS MIGRATION
-- =====================================================
-- Business Rule: Athletes with non-null hub_level receive +5 bonus points
-- These points are permanent and included in all ranking calculations
-- =====================================================

-- =====================================================
-- PART 1: Add hub_bonus_points column to ranking_snapshot_data
-- =====================================================

ALTER TABLE ranking_snapshot_data
ADD COLUMN IF NOT EXISTS hub_bonus_points DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN ranking_snapshot_data.hub_bonus_points IS 'Bonus points for athletes in HUB program (+5 if hub_level is not null)';

-- =====================================================
-- PART 2: Update ranking_live view with HUB bonus
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
  a.first_name || ' ' || a.last_name AS athlete_name,
  a.date_of_birth,
  a.gender,
  a.age_category,
  a.weight_category,
  a.club,
  a.license_number,
  a.photo_url,
  a.hub_level,

  -- Year-based points
  COALESCE(yp.current_year_points, 0) AS current_year_points,
  COALESCE(yp.last_year_pts, 0) AS last_year_pts,

  -- HUB Bonus: +5 points if hub_level is not null
  CASE WHEN a.hub_level IS NOT NULL THEN 5 ELSE 0 END AS hub_bonus_points,

  -- Total points = current_year + carryover (40% of last year) + hub_bonus
  COALESCE(yp.current_year_points, 0)
    + COALESCE(yp.last_year_pts, 0) * 0.4
    + CASE WHEN a.hub_level IS NOT NULL THEN 5 ELSE 0 END
  AS total_points,

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

  -- Global rank (by total_points including HUB bonus)
  ROW_NUMBER() OVER (
    ORDER BY (
      COALESCE(yp.current_year_points, 0)
      + COALESCE(yp.last_year_pts, 0) * 0.4
      + CASE WHEN a.hub_level IS NOT NULL THEN 5 ELSE 0 END
    ) DESC, a.last_name, a.first_name
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

COMMENT ON VIEW ranking_live IS 'Live ranking with HUB bonus points (+5 for athletes with hub_level)';

-- =====================================================
-- PART 3: Update snapshot generation functions
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
    athlete_gender, athlete_club, athlete_photo_url, athlete_hub_level,
    ranking_position, total_points, current_year_points, last_year_pts, hub_bonus_points,
    tournaments_count, age_category, weight_category, gender, club, last_event_date,
    best_result_rank, best_result_event
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
    RANK() OVER (
      PARTITION BY rl.age_category
      ORDER BY rl.total_points DESC, rl.athlete_name ASC
    ) as ranking_position,
    rl.total_points,
    rl.current_year_points,
    rl.last_year_pts,
    rl.hub_bonus_points,
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

COMMENT ON FUNCTION generate_ranking_snapshot(INT, INT, TEXT) IS 'Creates a new ranking snapshot with HUB bonus points';

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
    athlete_gender, athlete_club, athlete_photo_url, athlete_hub_level,
    ranking_position, total_points, current_year_points, last_year_pts, hub_bonus_points,
    tournaments_count, age_category, weight_category, gender, club, last_event_date,
    best_result_rank, best_result_event
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
    RANK() OVER (
      PARTITION BY rl.age_category
      ORDER BY rl.total_points DESC, rl.athlete_name ASC
    ) as ranking_position,
    rl.total_points,
    rl.current_year_points,
    rl.last_year_pts,
    rl.hub_bonus_points,
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

COMMENT ON FUNCTION generate_ranking_snapshot(UUID) IS 'Regenerates snapshot with HUB bonus points';

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
  PERFORM set_config('app.bypass_snapshot_lock', 'on', true);
  RETURN QUERY SELECT * FROM generate_ranking_snapshot(p_snapshot_id);
END;
$$;

COMMENT ON FUNCTION admin_regenerate_snapshot IS 'Admin function to regenerate snapshots with HUB bonus (bypasses protection)';

-- =====================================================
-- PART 4: Update public views to include hub_bonus_points
-- =====================================================

DROP VIEW IF EXISTS public_athlete_results;

CREATE OR REPLACE VIEW public_athlete_results AS
SELECT
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.club,
  rsd.age_category,
  rsd.weight_category,
  rsd.gender,
  rsd.athlete_photo_url AS photo_url,
  rsd.athlete_hub_level AS hub_level,

  rs.id AS snapshot_id,
  rs.snapshot_date,
  rs.snapshot_month,
  rs.snapshot_year,

  rsd.total_points,
  rsd.current_year_points,
  rsd.last_year_pts,
  rsd.hub_bonus_points,
  rsd.ranking_position,

  e.id AS event_id,
  e.name AS event_name,
  e.event_date,
  e.coefficient AS event_coefficient,

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

COMMENT ON VIEW public_athlete_results IS 'Public view with HUB bonus points';

-- Update public_rankings
DROP VIEW IF EXISTS public_rankings;

CREATE OR REPLACE VIEW public_rankings AS
SELECT
  rs.id AS snapshot_id,
  rs.snapshot_date,
  rs.snapshot_month AS month,
  rs.snapshot_year AS year,
  rs.snapshot_month,
  rs.snapshot_year,
  rs.title,
  rs.description,
  rs.published_at,
  rs.pdf_url,

  rsd.athlete_id,
  rsd.athlete_name,
  rsd.club,
  rsd.age_category,
  rsd.weight_category,
  rsd.gender,
  rsd.athlete_hub_level AS hub_level,

  rsd.ranking_position,
  rsd.total_points,
  rsd.current_year_points,
  rsd.last_year_pts,
  rsd.hub_bonus_points,
  rsd.tournaments_count,
  rsd.best_result_rank,
  rsd.best_result_event

FROM ranking_snapshots rs
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id

WHERE rs.is_published = true
  AND rsd.age_category IS NOT NULL

ORDER BY rs.snapshot_date DESC, rsd.age_category, rsd.ranking_position;

GRANT SELECT ON public_rankings TO anon;
GRANT SELECT ON public_rankings TO authenticated;

COMMENT ON VIEW public_rankings IS 'Public rankings with HUB bonus points';

-- Update public_rankings_by_age_category
DROP VIEW IF EXISTS public_rankings_by_age_category CASCADE;

CREATE OR REPLACE VIEW public_rankings_by_age_category AS
SELECT
  rs.id AS snapshot_id,
  rs.snapshot_date,
  rs.snapshot_month,
  rs.snapshot_year,
  rs.title AS snapshot_title,

  rsd.athlete_id,
  rsd.athlete_name,
  rsd.club,
  rsd.age_category,
  rsd.weight_category,
  rsd.gender,
  rsd.athlete_hub_level AS hub_level,

  rsd.ranking_position AS rank_in_category,
  rsd.total_points,
  rsd.current_year_points,
  rsd.last_year_pts,
  rsd.hub_bonus_points,
  rsd.tournaments_count,
  rsd.last_event_date

FROM ranking_snapshots rs
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id

WHERE
  rs.is_published = true
  AND rsd.age_category IS NOT NULL

ORDER BY
  rs.snapshot_date DESC,
  rsd.age_category,
  rsd.ranking_position;

GRANT SELECT ON public_rankings_by_age_category TO anon;
GRANT SELECT ON public_rankings_by_age_category TO authenticated;

COMMENT ON VIEW public_rankings_by_age_category IS 'Rankings by age category with HUB bonus';

-- =====================================================
-- PART 5: Update existing snapshot data to include hub_bonus_points
-- =====================================================

-- Backfill hub_bonus_points for existing snapshot data
-- Must bypass the snapshot lock trigger for published snapshots
DO $$
BEGIN
  -- Enable bypass for this transaction
  PERFORM set_config('app.bypass_snapshot_lock', 'on', true);

  -- Update hub_bonus_points based on athlete_hub_level
  UPDATE ranking_snapshot_data rsd
  SET hub_bonus_points = CASE WHEN rsd.athlete_hub_level IS NOT NULL THEN 5 ELSE 0 END
  WHERE rsd.hub_bonus_points IS NULL OR rsd.hub_bonus_points = 0;

  -- Also update total_points to include hub bonus (recalculate)
  UPDATE ranking_snapshot_data rsd
  SET total_points = COALESCE(rsd.current_year_points, 0)
                   + COALESCE(rsd.last_year_pts, 0) * 0.4
                   + COALESCE(rsd.hub_bonus_points, 0);
END $$;

-- =====================================================
-- VERIFICATION QUERIES (run after migration)
-- =====================================================

-- Query 1: Athletes with hub level
-- SELECT first_name, last_name, hub_level
-- FROM athletes
-- WHERE hub_level IS NOT NULL;

-- Query 2: Snapshot includes hub bonus
-- SELECT
--   athlete_name,
--   hub_bonus_points,
--   total_points
-- FROM ranking_snapshot_data
-- ORDER BY total_points DESC
-- LIMIT 10;

-- Query 3: Live ranking with hub bonus
-- SELECT athlete_name, hub_level, hub_bonus_points, total_points
-- FROM ranking_live
-- WHERE hub_level IS NOT NULL
-- ORDER BY total_points DESC
-- LIMIT 10;

SELECT 'HUB Bonus Points migration complete!' AS status;
