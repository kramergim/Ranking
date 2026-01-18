-- Step 1: Update ranking_live view to include photo_url and hub_level

DROP VIEW IF EXISTS ranking_live CASCADE;

CREATE OR REPLACE VIEW ranking_live AS
SELECT
  a.id AS athlete_id,
  a.first_name,
  a.last_name,
  a.first_name || ' ' || a.last_name AS full_name,
  a.date_of_birth,
  a.gender,
  a.age_category,
  a.weight_category,
  a.club,
  a.license_number,
  a.photo_url,
  a.hub_level,

  COALESCE(SUM(r.points_earned), 0) AS total_points,
  COUNT(DISTINCT r.event_id) AS tournaments_count,
  MIN(r.final_rank) AS best_rank,
  (
    SELECT e.name
    FROM results r2
    JOIN events e ON e.id = r2.event_id
    WHERE r2.athlete_id = a.id AND r2.final_rank = MIN(r.final_rank)
    LIMIT 1
  ) AS best_result_event,
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 1) AS gold_medals,
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 2) AS silver_medals,
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 3) AS bronze_medals,
  COALESCE(SUM(r.matches_won), 0) AS total_matches_won,
  MAX(e.event_date) AS last_event_date,
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(SUM(r.points_earned), 0) DESC, a.last_name, a.first_name
  ) AS rank_position

FROM athletes a
LEFT JOIN results r ON r.athlete_id = a.id AND r.points_earned IS NOT NULL
LEFT JOIN events e ON e.id = r.event_id
WHERE a.is_active = true
GROUP BY
  a.id, a.first_name, a.last_name, a.date_of_birth, a.gender,
  a.age_category, a.weight_category, a.club, a.license_number,
  a.photo_url, a.hub_level
ORDER BY rank_position;
