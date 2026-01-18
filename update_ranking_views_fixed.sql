-- Drop and recreate ranking_live view with last_year_pts
DROP VIEW IF EXISTS ranking_live CASCADE;

CREATE VIEW ranking_live AS
SELECT
  a.id AS athlete_id,
  a.first_name || ' ' || a.last_name AS athlete_name,
  a.age_category,
  a.weight_category,
  a.gender,
  a.club,
  a.last_year_pts,
  COALESCE(SUM(r.points_earned), 0) AS current_year_points,
  COALESCE(SUM(r.points_earned), 0) + COALESCE(a.last_year_pts, 0) AS total_points,
  COUNT(r.id) AS tournaments_count,
  MAX(e.event_date) AS last_event_date
FROM athletes a
LEFT JOIN results r ON a.id = r.athlete_id
LEFT JOIN events e ON r.event_id = e.id
GROUP BY a.id, a.first_name, a.last_name, a.age_category, a.weight_category, a.gender, a.club, a.last_year_pts
ORDER BY total_points DESC;

-- Drop and recreate ranking_by_category view with last_year_pts
DROP VIEW IF EXISTS ranking_by_category CASCADE;

CREATE VIEW ranking_by_category AS
SELECT
  a.id AS athlete_id,
  a.first_name || ' ' || a.last_name AS athlete_name,
  a.age_category,
  a.weight_category,
  a.gender,
  a.club,
  a.last_year_pts,
  COALESCE(SUM(r.points_earned), 0) AS current_year_points,
  COALESCE(SUM(r.points_earned), 0) + COALESCE(a.last_year_pts, 0) AS total_points,
  COUNT(r.id) AS tournaments_count,
  MAX(e.event_date) AS last_event_date,
  ROW_NUMBER() OVER (
    PARTITION BY a.age_category, a.weight_category, a.gender
    ORDER BY (COALESCE(SUM(r.points_earned), 0) + COALESCE(a.last_year_pts, 0)) DESC
  ) AS category_rank
FROM athletes a
LEFT JOIN results r ON a.id = r.athlete_id
LEFT JOIN events e ON r.event_id = e.id
GROUP BY a.id, a.first_name, a.last_name, a.age_category, a.weight_category, a.gender, a.club, a.last_year_pts
ORDER BY a.age_category, a.weight_category, a.gender, total_points DESC;

-- Recreate dependent views
DROP VIEW IF EXISTS public_snapshots_list CASCADE;
DROP VIEW IF EXISTS public_rankings CASCADE;

CREATE VIEW public_snapshots_list AS
SELECT
  id,
  title,
  description,
  snapshot_date,
  snapshot_month,
  snapshot_year,
  is_published
FROM ranking_snapshots
WHERE is_published = true
ORDER BY snapshot_date DESC;

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
  rsd."rank",  -- Escaped with double quotes to avoid conflict with rank() function
  rs.title AS snapshot_title,
  rs.snapshot_date,
  rs.snapshot_month,
  rs.snapshot_year
FROM ranking_snapshot_data rsd
JOIN ranking_snapshots rs ON rsd.snapshot_id = rs.id
WHERE rs.is_published = true
ORDER BY rs.snapshot_date DESC, rsd."rank" ASC;
