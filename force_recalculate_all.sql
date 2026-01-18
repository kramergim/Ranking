-- Force recalculate points for ALL existing results
-- This script will update every result in the database

-- Method 1: Using a simple UPDATE to trigger the auto-calculation
-- (This only works if the trigger is already created)
UPDATE results SET updated_at = NOW();

-- Method 2: Direct calculation for each result (use if trigger doesn't work)
DO $$
DECLARE
  result_record RECORD;
  calculated_points DECIMAL;
BEGIN
  RAISE NOTICE 'Starting recalculation of all results...';

  FOR result_record IN
    SELECT r.id, a.first_name || ' ' || a.last_name AS athlete, e.name AS event
    FROM results r
    JOIN athletes a ON r.athlete_id = a.id
    JOIN events e ON r.event_id = e.id
    ORDER BY r.created_at
  LOOP
    -- Calculate points for this result
    SELECT calculate_result_points(result_record.id) INTO calculated_points;

    RAISE NOTICE 'Recalculated: % - % = % points',
      result_record.athlete,
      result_record.event,
      calculated_points;
  END LOOP;

  RAISE NOTICE 'Recalculation complete!';
END $$;

-- Verify the results
SELECT
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
WHERE r.points_earned IS NOT NULL
ORDER BY r.points_earned DESC
LIMIT 20;
