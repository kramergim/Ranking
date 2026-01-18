-- Fix public_rankings view for the public page

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
  rsd.ranking_position AS rank,  -- Alias for compatibility
  rsd.ranking_position,           -- Keep both for flexibility
  rs.title AS snapshot_title,
  rs.snapshot_date,
  rs.snapshot_month,
  rs.snapshot_year
FROM ranking_snapshot_data rsd
JOIN ranking_snapshots rs ON rsd.snapshot_id = rs.id
WHERE rs.is_published = true
ORDER BY rs.snapshot_date DESC, rsd.ranking_position ASC;

-- Verify the view
SELECT * FROM public_rankings LIMIT 5;
