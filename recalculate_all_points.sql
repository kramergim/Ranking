-- Recalculate points for all existing results
-- This will use the new calculate_result_points() function

DO $$
DECLARE
  result_record RECORD;
  points_calculated DECIMAL;
BEGIN
  FOR result_record IN SELECT id FROM results ORDER BY created_at
  LOOP
    -- Calculate points for each result
    SELECT calculate_result_points(result_record.id) INTO points_calculated;
    RAISE NOTICE 'Recalculated points for result %: % points', result_record.id, points_calculated;
  END LOOP;
END $$;

-- Show summary of updated results
SELECT
  e.name AS event_name,
  e.coefficient,
  a.first_name || ' ' || a.last_name AS athlete_name,
  r.final_rank,
  r.matches_won,
  r.points_earned,
  r.calculation_explanation
FROM results r
JOIN athletes a ON r.athlete_id = a.id
JOIN events e ON r.event_id = e.id
ORDER BY e.event_date DESC, r.points_earned DESC;
