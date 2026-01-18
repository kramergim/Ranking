-- Test the EXACT query that the frontend is making

-- First, get the year and month from your published snapshot
SELECT
  'Your published snapshot has:' AS info,
  snapshot_year AS year,
  snapshot_month AS month,
  title,
  snapshot_date
FROM ranking_snapshots
WHERE is_published = true
ORDER BY created_at DESC
LIMIT 1;

-- Now test if public_rankings returns data for those values
-- This simulates exactly what the frontend is doing
WITH snapshot_info AS (
  SELECT snapshot_year, snapshot_month
  FROM ranking_snapshots
  WHERE is_published = true
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT
  'Query result (what frontend should see):' AS info,
  pr.*
FROM public_rankings pr
CROSS JOIN snapshot_info si
WHERE pr.year = si.snapshot_year
  AND pr.month = si.snapshot_month
ORDER BY pr.ranking_position;

-- Also check if the columns exist
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'public_rankings' AND column_name = 'year'
    ) THEN '✓ year column exists'
    ELSE '✗ year column MISSING'
  END AS year_check,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'public_rankings' AND column_name = 'month'
    ) THEN '✓ month column exists'
    ELSE '✗ month column MISSING'
  END AS month_check;
