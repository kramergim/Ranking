-- Drop existing view if it exists
DROP VIEW IF EXISTS public_athlete_results;

-- Create simplified public view for athlete results detail
CREATE OR REPLACE VIEW public_athlete_results AS
SELECT
  -- Athlete info
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.athlete_club AS club,
  rsd.athlete_age_category AS age_category,
  rsd.athlete_weight_category AS weight_category,
  rsd.athlete_gender AS gender,

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
  r.calculation_explanation

FROM ranking_snapshots rs
-- Join snapshot data
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id
-- Join results for this athlete (using athlete_id from snapshot data)
LEFT JOIN results r ON rsd.athlete_id = r.athlete_id
-- Join events
LEFT JOIN events e ON r.event_id = e.id

WHERE
  -- Only published snapshots
  rs.is_published = true
  -- Only results that happened before or at the snapshot date
  AND (e.event_date IS NULL OR e.event_date <= rs.snapshot_date)

ORDER BY
  rs.snapshot_date DESC,
  rsd.athlete_name,
  e.event_date DESC;

-- Grant SELECT to public roles
GRANT SELECT ON public_athlete_results TO anon;
GRANT SELECT ON public_athlete_results TO authenticated;
