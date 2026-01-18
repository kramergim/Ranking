-- Create dedicated view for rankings BY age category
-- This makes it explicit that ranking_position is within age_category, not global

DROP VIEW IF EXISTS public_rankings_by_age_category CASCADE;

CREATE OR REPLACE VIEW public_rankings_by_age_category AS
SELECT
  rs.id AS snapshot_id,
  rs.snapshot_date,
  rs.snapshot_month,
  rs.snapshot_year,
  rs.title AS snapshot_title,

  -- Athlete info
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.club,
  rsd.age_category,
  rsd.weight_category,
  rsd.gender,

  -- Ranking info (WITHIN age_category)
  rsd.ranking_position AS rank_in_category,
  rsd.total_points,
  rsd.current_year_points,
  rsd.last_year_pts,
  rsd.tournaments_count,
  rsd.last_event_date

FROM ranking_snapshots rs
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id

WHERE
  rs.is_published = true
  AND rsd.age_category IS NOT NULL  -- Only athletes with age category

ORDER BY
  rs.snapshot_date DESC,
  rsd.age_category,
  rsd.ranking_position;

-- Grant access
GRANT SELECT ON public_rankings_by_age_category TO anon;
GRANT SELECT ON public_rankings_by_age_category TO authenticated;

-- Also update the existing public_rankings to make it clear
DROP VIEW IF EXISTS public_rankings CASCADE;

CREATE OR REPLACE VIEW public_rankings AS
SELECT
  rs.id AS snapshot_id,
  rs.snapshot_date,
  rs.snapshot_month AS month,
  rs.snapshot_year AS year,
  rs.snapshot_month,
  rs.snapshot_year,

  -- Athlete info
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.club,
  rsd.age_category,
  rsd.weight_category,
  rsd.gender,

  -- Ranking info (rank within age_category)
  rsd.ranking_position,
  rsd.total_points,
  rsd.current_year_points,
  rsd.last_year_pts

FROM ranking_snapshots rs
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id

WHERE
  rs.is_published = true
  AND rsd.age_category IS NOT NULL

ORDER BY
  rs.snapshot_date DESC,
  rsd.age_category,
  rsd.ranking_position;

GRANT SELECT ON public_rankings TO anon;
GRANT SELECT ON public_rankings TO authenticated;
