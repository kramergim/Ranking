-- Add photo_url and hub_level to public_athlete_results view
-- This allows the public athlete detail panel to display athlete photos and performance hub badges

DROP VIEW IF EXISTS public_athlete_results;

CREATE OR REPLACE VIEW public_athlete_results AS
SELECT
  -- Athlete info (using columns WITHOUT athlete_ prefix)
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.club,           -- NOT athlete_club
  rsd.age_category,   -- NOT athlete_age_category
  rsd.weight_category,-- NOT athlete_weight_category
  rsd.gender,         -- NOT athlete_gender
  rsd.athlete_photo_url AS photo_url,      -- ✅ Added from ranking_snapshot_data
  rsd.athlete_hub_level AS hub_level,      -- ✅ Added from ranking_snapshot_data

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
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id
LEFT JOIN results r ON rsd.athlete_id = r.athlete_id
LEFT JOIN events e ON r.event_id = e.id

WHERE
  rs.is_published = true

ORDER BY
  rs.snapshot_date DESC,
  rsd.athlete_name,
  e.event_date DESC NULLS LAST;

GRANT SELECT ON public_athlete_results TO anon;
GRANT SELECT ON public_athlete_results TO authenticated;
