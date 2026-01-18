-- Test snapshot creation manually with detailed output

DO $$
DECLARE
  test_snapshot_id UUID;
  athlete_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Testing snapshot creation...';
  RAISE NOTICE '========================================';

  -- Create a test snapshot
  INSERT INTO ranking_snapshots (
    snapshot_date,
    snapshot_year,
    snapshot_month,
    title,
    description,
    is_published
  ) VALUES (
    CURRENT_DATE,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    'Test Snapshot - DEBUG',
    'Test snapshot for debugging',
    false
  ) RETURNING id INTO test_snapshot_id;

  RAISE NOTICE 'Test snapshot created with ID: %', test_snapshot_id;

  -- Try to generate the snapshot data
  BEGIN
    RAISE NOTICE 'Calling generate_ranking_snapshot...';
    PERFORM generate_ranking_snapshot(test_snapshot_id);
    RAISE NOTICE '✓ Function executed successfully';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ ERROR in generate_ranking_snapshot: %', SQLERRM;
  END;

  -- Check how many records were inserted
  SELECT COUNT(*) INTO athlete_count
  FROM ranking_snapshot_data
  WHERE snapshot_id = test_snapshot_id;

  RAISE NOTICE 'Athletes inserted into snapshot: %', athlete_count;

  -- Show sample data
  IF athlete_count > 0 THEN
    RAISE NOTICE 'Sample data from snapshot:';
    FOR i IN 1..LEAST(athlete_count, 5) LOOP
      RAISE NOTICE '  - Record %', i;
    END LOOP;
  ELSE
    RAISE NOTICE '⚠️ WARNING: No data inserted into snapshot!';
    RAISE NOTICE 'Checking ranking_live for data...';

    SELECT COUNT(*) INTO athlete_count FROM ranking_live WHERE total_points > 0;
    RAISE NOTICE 'Athletes in ranking_live with points > 0: %', athlete_count;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test complete!';
  RAISE NOTICE '========================================';

  -- Clean up test snapshot
  DELETE FROM ranking_snapshot_data WHERE snapshot_id = test_snapshot_id;
  DELETE FROM ranking_snapshots WHERE id = test_snapshot_id;
  RAISE NOTICE 'Test snapshot cleaned up';
END $$;

-- Show what's in ranking_live
SELECT
  athlete_name,
  total_points,
  current_year_points,
  last_year_pts
FROM ranking_live
WHERE total_points > 0
ORDER BY total_points DESC
LIMIT 10;
