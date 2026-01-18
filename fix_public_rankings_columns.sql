-- Fix public_rankings view to include year and month aliases

DROP VIEW IF EXISTS public_rankings CASCADE;

CREATE VIEW public_rankings AS
SELECT
  rsd.snapshot_id,
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.age_category,
  rsd.weight_category,
  rsd.gender,
  rsd.club,
  rsd.total_points,
  rsd.current_year_points,
  rsd.last_year_pts,
  rsd.tournaments_count,
  rsd.last_event_date,
  rsd.ranking_position AS rank,
  rsd.ranking_position,
  rs.title AS snapshot_title,
  rs.snapshot_date,
  rs.snapshot_month AS month,          -- Alias for frontend compatibility
  rs.snapshot_year AS year,            -- Alias for frontend compatibility
  rs.snapshot_month,                    -- Keep original names too
  rs.snapshot_year
FROM ranking_snapshot_data rsd
JOIN ranking_snapshots rs ON rsd.snapshot_id = rs.id
WHERE rs.is_published = true
ORDER BY rs.snapshot_date DESC, rsd.ranking_position ASC;

-- Test the view
SELECT
  'Testing public_rankings with year/month filter:' AS info,
  year,
  month,
  athlete_name,
  rank,
  total_points
FROM public_rankings
LIMIT 5;
