-- Check if results have points calculated
SELECT
  r.id,
  a.first_name || ' ' || a.last_name AS athlete,
  e.name AS event,
  e.coefficient,
  r.final_rank,
  r.matches_won,
  r.points_earned,
  r.calculation_explanation
FROM results r
JOIN athletes a ON r.athlete_id = a.id
JOIN events e ON r.event_id = e.id
ORDER BY r.created_at DESC
LIMIT 10;
