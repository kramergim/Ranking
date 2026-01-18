-- =====================================================
-- Admin Points Overview (Global)
-- =====================================================
-- Creates a view for global points overview with filtering
-- Admin-only access via RLS
-- =====================================================

-- Create view for global points overview
CREATE OR REPLACE VIEW admin_points_overview_global AS
SELECT
  a.id AS athlete_id,
  a.first_name,
  a.last_name,
  a.first_name || ' ' || a.last_name AS athlete_name,
  a.photo_url,
  a.age_category,
  a.weight_category,
  a.gender,
  a.club,
  a.last_year_pts,
  COALESCE(SUM(r.points_earned), 0) AS total_points,
  COUNT(DISTINCT r.event_id) AS competitions_count,
  MAX(e.event_date) AS last_competition_date,
  ARRAY_AGG(DISTINCT EXTRACT(YEAR FROM e.event_date)::INT ORDER BY EXTRACT(YEAR FROM e.event_date)::INT DESC) FILTER (WHERE e.event_date IS NOT NULL) AS years,
  ARRAY_AGG(DISTINCT e.coefficient) FILTER (WHERE e.coefficient IS NOT NULL) AS coefficients
FROM athletes a
LEFT JOIN results r ON r.athlete_id = a.id AND r.points_earned IS NOT NULL
LEFT JOIN events e ON e.id = r.event_id
WHERE a.is_active = true
GROUP BY
  a.id,
  a.first_name,
  a.last_name,
  a.photo_url,
  a.age_category,
  a.weight_category,
  a.gender,
  a.club,
  a.last_year_pts;

-- Enable RLS on the view
ALTER VIEW admin_points_overview_global SET (security_invoker = true);

-- Grant access to authenticated users (RLS on underlying tables will handle admin-only)
GRANT SELECT ON admin_points_overview_global TO authenticated;

COMMENT ON VIEW admin_points_overview_global IS 'Global points overview for admin, aggregating all athlete points across all competitions';

-- =====================================================
-- End of migration
-- =====================================================
