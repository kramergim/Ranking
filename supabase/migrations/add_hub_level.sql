-- ============================================================================
-- Add HUB Level and Photo Support
-- HUB Level is an informational field indicating athlete development level
-- Photo URL for athlete profile picture
-- ============================================================================

-- Step 1: Add hub_level and photo_url to athletes table
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS hub_level TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN athletes.hub_level IS 'Swiss Taekwondo HUB development level (informational only)';
COMMENT ON COLUMN athletes.photo_url IS 'URL to athlete profile photo';

-- Step 2: Add hub_level and photo_url to ranking_snapshot_data
ALTER TABLE ranking_snapshot_data
ADD COLUMN IF NOT EXISTS athlete_hub_level TEXT,
ADD COLUMN IF NOT EXISTS athlete_photo_url TEXT;

COMMENT ON COLUMN ranking_snapshot_data.athlete_hub_level IS 'Athlete HUB level at time of snapshot';
COMMENT ON COLUMN ranking_snapshot_data.athlete_photo_url IS 'Athlete photo URL at time of snapshot';

-- Step 3: Update generate_ranking_snapshot to include hub_level
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
    athlete_gender, athlete_club, athlete_hub_level, athlete_photo_url, ranking_position,
    total_points, current_year_points, last_year_pts, tournaments_count, age_category,
    weight_category, gender, club, last_event_date
  )
  SELECT
    v_snapshot_id,
    rl.athlete_id,
    rl.athlete_name,
    rl.age_category,
    rl.weight_category,
    rl.gender,
    rl.club,
    a.hub_level, -- Include HUB level from athletes table
    a.photo_url, -- Include photo URL from athletes table
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
    rl.last_event_date
  FROM ranking_live rl
  LEFT JOIN athletes a ON a.id = rl.athlete_id
  WHERE rl.age_category IS NOT NULL;

  RETURN v_snapshot_id;
END;
$$;

-- Step 4: Update public_athlete_results view to include hub_level
-- Drop the view first to avoid column ordering issues
DROP VIEW IF EXISTS public_athlete_results;

CREATE VIEW public_athlete_results AS
SELECT
  -- Athlete info
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.club,
  rsd.age_category,
  rsd.weight_category,
  rsd.gender,

  -- Snapshot info
  rs.id AS snapshot_id,
  rs.snapshot_date,
  rs.snapshot_month,
  rs.snapshot_year,

  -- Result from snapshot data
  rsd.total_points,
  rsd.current_year_points,
  rsd.last_year_pts,
  rsd.ranking_position,

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
  r.calculation_explanation,

  -- Additional athlete info - added at the end to avoid column ordering issues
  rsd.athlete_hub_level AS hub_level,
  rsd.athlete_photo_url AS photo_url

FROM ranking_snapshots rs
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id
LEFT JOIN results r ON r.athlete_id = rsd.athlete_id
LEFT JOIN events e ON e.id = r.event_id

WHERE rs.is_published = true;

GRANT SELECT ON public_athlete_results TO anon;
GRANT SELECT ON public_athlete_results TO authenticated;

-- Verification
SELECT 'HUB Level and Photo support added successfully!' as status;
