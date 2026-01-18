-- Test 1: Check if the view exists
SELECT EXISTS (
  SELECT FROM information_schema.views
  WHERE table_name = 'public_athlete_results'
) AS view_exists;

-- Test 2: Check what columns the view has
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'public_athlete_results'
ORDER BY ordinal_position;

-- Test 3: Try to select from the view (limit 5 rows)
SELECT *
FROM public_athlete_results
LIMIT 5;

-- Test 4: Count total rows
SELECT COUNT(*) as total_rows
FROM public_athlete_results;
