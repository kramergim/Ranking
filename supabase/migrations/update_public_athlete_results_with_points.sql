-- =====================================================
-- Update public_athlete_results view to include year-based points
-- =====================================================

DROP VIEW IF EXISTS public_athlete_results;

CREATE OR REPLACE VIEW public_athlete_results AS
SELECT
  -- Athlete info
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.club,
  rsd.age_category,
  rsd.weight_category,
  rsd.gender,
  rsd.athlete_photo_url AS photo_url,
  rsd.athlete_hub_level AS hub_level,

  -- Snapshot info
  rs.id AS snapshot_id,
  rs.snapshot_date,
  rs.snapshot_month,
  rs.snapshot_year,

  -- Points (INCLUDING YEAR-BASED POINTS!)
  rsd.total_points,
  rsd.current_year_points,     -- ✅ Added
  rsd.last_year_pts,            -- ✅ Added
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

WHERE rs.is_published = true

ORDER BY
  rs.snapshot_date DESC,
  rsd.athlete_name,
  e.event_date DESC NULLS LAST;

GRANT SELECT ON public_athlete_results TO anon;
GRANT SELECT ON public_athlete_results TO authenticated;

COMMENT ON VIEW public_athlete_results IS 'Public view of athlete results with year-based points, photo, and hub level';

-- =====================================================
-- Also update public_rankings view
-- =====================================================

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

  -- Athlete info
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.club,
  rsd.age_category,
  rsd.weight_category,
  rsd.gender,

  -- Ranking info
  rsd.ranking_position,
  rsd.total_points,
  rsd.current_year_points,     -- ✅ Added
  rsd.last_year_pts,            -- ✅ Added
  rsd.tournaments_count,
  rsd.best_result_rank,
  rsd.best_result_event

FROM ranking_snapshots rs
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id

WHERE rs.is_published = true
  AND rsd.age_category IS NOT NULL

ORDER BY rs.snapshot_date DESC, rsd.ranking_position;

GRANT SELECT ON public_rankings TO anon;
GRANT SELECT ON public_rankings TO authenticated;

COMMENT ON VIEW public_rankings IS 'Public rankings with year-based points';

-- =====================================================
-- Verification queries
-- =====================================================

-- Check public_athlete_results
-- SELECT athlete_name, total_points, current_year_points, last_year_pts, photo_url, hub_level
-- FROM public_athlete_results
-- LIMIT 10;

-- Check public_rankings
-- SELECT athlete_name, ranking_position, total_points, current_year_points, last_year_pts
-- FROM public_rankings
-- WHERE snapshot_id = (SELECT id FROM ranking_snapshots WHERE is_published = true ORDER BY snapshot_date DESC LIMIT 1)
-- LIMIT 10;
