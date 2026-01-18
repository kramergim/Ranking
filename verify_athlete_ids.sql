-- Verify that athlete_id in ranking_live matches actual athletes

-- Check if athlete_id from ranking_live exists in athletes table
SELECT
  rl.athlete_id,
  rl.athlete_name,
  rl.total_points,
  CASE
    WHEN a.id IS NOT NULL THEN '✓ Valid'
    ELSE '✗ INVALID - Athlete does not exist!'
  END AS validity
FROM ranking_live rl
LEFT JOIN athletes a ON rl.athlete_id = a.id
WHERE rl.total_points > 0
ORDER BY rl.total_points DESC;

-- Show athletes table for comparison
SELECT
  id,
  first_name || ' ' || last_name AS full_name,
  last_year_pts,
  is_active
FROM athletes
ORDER BY first_name, last_name;
