-- Manual test to insert data into ranking_snapshot_data
-- This will show us the EXACT error preventing insertion

DO $$
DECLARE
  test_snapshot_id UUID;
  insert_count INTEGER;
  rec RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Manual snapshot insertion test';
  RAISE NOTICE '========================================';

  -- Create a test snapshot
  INSERT INTO ranking_snapshots (
    snapshot_date,
    snapshot_year,
    snapshot_month,
    title,
    is_published
  ) VALUES (
    CURRENT_DATE,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    'Manual Test',
    false
  ) RETURNING id INTO test_snapshot_id;

  RAISE NOTICE 'Created test snapshot: %', test_snapshot_id;

  -- Try manual INSERT with detailed error handling
  BEGIN
    RAISE NOTICE 'Attempting to insert data...';

    INSERT INTO ranking_snapshot_data (
      snapshot_id,
      athlete_id,
      athlete_name,
      age_category,
      weight_category,
      gender,
      club,
      total_points,
      current_year_points,
      last_year_pts,
      tournaments_count,
      last_event_date,
      ranking_position
    )
    SELECT
      test_snapshot_id,
      athlete_id,
      athlete_name,
      age_category,
      weight_category,
      gender,
      club,
      total_points,
      current_year_points,
      last_year_pts,
      tournaments_count,
      last_event_date,
      ROW_NUMBER() OVER (ORDER BY total_points DESC) AS ranking_position
    FROM ranking_live
    WHERE total_points > 0;

    GET DIAGNOSTICS insert_count = ROW_COUNT;
    RAISE NOTICE '✓ SUCCESS: Inserted % rows', insert_count;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ ERROR during insert: %', SQLERRM;
    RAISE NOTICE 'Error detail: %', SQLSTATE;
  END;

  -- Verify insertion
  SELECT COUNT(*) INTO insert_count
  FROM ranking_snapshot_data
  WHERE snapshot_id = test_snapshot_id;

  RAISE NOTICE 'Records in snapshot: %', insert_count;

  -- Show the data if successful
  IF insert_count > 0 THEN
    RAISE NOTICE 'Sample data:';
    FOR rec IN
      SELECT athlete_name, total_points, ranking_position
      FROM ranking_snapshot_data
      WHERE snapshot_id = test_snapshot_id
      ORDER BY ranking_position
    LOOP
      RAISE NOTICE '  % - % pts (rank %)', rec.athlete_name, rec.total_points, rec.ranking_position;
    END LOOP;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test snapshot kept with ID: %', test_snapshot_id;
  RAISE NOTICE 'Check it in the admin interface!';
END $$;

-- Show the test snapshot (FIXED: rs.id instead of rs.snapshot_id)
SELECT
  rs.id,
  rs.title,
  rs.snapshot_date,
  COUNT(rsd.id) AS athlete_count
FROM ranking_snapshots rs
LEFT JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id
WHERE rs.title = 'Manual Test'
GROUP BY rs.id, rs.title, rs.snapshot_date
ORDER BY rs.created_at DESC
LIMIT 1;
