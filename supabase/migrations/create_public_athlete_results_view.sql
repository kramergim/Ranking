-- Create public view for athlete results detail
-- This view exposes athlete tournament results for published snapshots only
-- Used in public rankings page to show athlete detail panels

CREATE OR REPLACE VIEW public_athlete_results AS
SELECT
  -- Athlete info
  a.id AS athlete_id,
  a.first_name || ' ' || a.last_name AS athlete_name,
  a.club,
  a.age_category,
  a.weight_category,
  a.gender,

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
-- Join snapshot data to get athlete rankings in this snapshot
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id
-- Join athlete
INNER JOIN athletes a ON rsd.athlete_id = a.id
-- Join results for this athlete
LEFT JOIN results r ON a.id = r.athlete_id
-- Join events
LEFT JOIN events e ON r.event_id = e.id

WHERE
  -- Only published snapshots
  rs.is_published = true
  -- Only results that happened before or at the snapshot date
  AND (e.event_date IS NULL OR e.event_date <= rs.snapshot_date)

ORDER BY
  rs.snapshot_date DESC,
  a.last_name,
  a.first_name,
  e.event_date DESC;

-- Grant SELECT to public (anon role)
GRANT SELECT ON public_athlete_results TO anon;
GRANT SELECT ON public_athlete_results TO authenticated;
