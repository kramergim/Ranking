-- Recalculate all points with detailed debugging information

DO $$
DECLARE
  result_record RECORD;
  calculated_points DECIMAL;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  error_message TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting detailed recalculation process';
  RAISE NOTICE '========================================';

  FOR result_record IN
    SELECT
      r.id,
      a.first_name || ' ' || a.last_name AS athlete_name,
      e.name AS event_name,
      e.coefficient,
      r.final_rank,
      r.matches_won
    FROM results r
    JOIN athletes a ON r.athlete_id = a.id
    JOIN events e ON r.event_id = e.id
    ORDER BY r.created_at
  LOOP
    BEGIN
      RAISE NOTICE '---';
      RAISE NOTICE 'Processing: % at % (Coef: %, Rank: %, Wins: %)',
        result_record.athlete_name,
        result_record.event_name,
        result_record.coefficient,
        result_record.final_rank,
        result_record.matches_won;

      -- Calculate points
      SELECT calculate_result_points(result_record.id) INTO calculated_points;

      success_count := success_count + 1;
      RAISE NOTICE '✓ SUCCESS: % points calculated', calculated_points;

    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      error_message := SQLERRM;
      RAISE NOTICE '✗ ERROR: %', error_message;
    END;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Recalculation complete!';
  RAISE NOTICE 'Successful: %', success_count;
  RAISE NOTICE 'Errors: %', error_count;
  RAISE NOTICE '========================================';
END $$;

-- Show updated results
SELECT
  a.first_name || ' ' || a.last_name AS athlete,
  e.name AS event,
  e.coefficient,
  r.final_rank,
  r.matches_won,
  r.points_earned,
  LEFT(r.calculation_explanation, 100) AS explanation
FROM results r
JOIN athletes a ON r.athlete_id = a.id
JOIN events e ON r.event_id = e.id
ORDER BY r.points_earned DESC NULLS LAST
LIMIT 20;
