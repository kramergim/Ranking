-- Diagnostic script to identify why points are not being calculated

-- 1. Check if the calculate_result_points function exists
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'calculate_result_points';

-- 2. Check if events have coefficients
SELECT
  id,
  name,
  coefficient,
  event_date
FROM events
ORDER BY event_date DESC
LIMIT 5;

-- 3. Check results with their event coefficients
SELECT
  r.id AS result_id,
  a.first_name || ' ' || a.last_name AS athlete,
  e.name AS event,
  e.coefficient AS event_coefficient,
  r.final_rank,
  r.matches_won,
  r.points_earned
FROM results r
JOIN athletes a ON r.athlete_id = a.id
JOIN events e ON r.event_id = e.id
ORDER BY r.created_at DESC
LIMIT 10;

-- 4. Test the function on ONE result manually
DO $$
DECLARE
  test_result_id UUID;
  calculated_points DECIMAL;
BEGIN
  -- Get the first result ID
  SELECT id INTO test_result_id FROM results LIMIT 1;

  IF test_result_id IS NOT NULL THEN
    RAISE NOTICE 'Testing calculation for result: %', test_result_id;

    -- Try to calculate points
    BEGIN
      SELECT calculate_result_points(test_result_id) INTO calculated_points;
      RAISE NOTICE 'Calculation successful! Points: %', calculated_points;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR during calculation: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'No results found in database';
  END IF;
END $$;
