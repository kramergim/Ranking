-- Comprehensive diagnosis of the public_rankings view

-- 1. Check the structure of public_rankings
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'public_rankings'
ORDER BY ordinal_position;

-- 2. Check if there is any data in public_rankings
SELECT COUNT(*) AS total_records FROM public_rankings;

-- 3. Show all data in public_rankings
SELECT * FROM public_rankings;

-- 4. Show published snapshots with their year/month
SELECT
  id,
  title,
  snapshot_date,
  snapshot_year,
  snapshot_month,
  is_published,
  (SELECT COUNT(*) FROM ranking_snapshot_data WHERE snapshot_id = rs.id) AS athlete_count
FROM ranking_snapshots rs
WHERE is_published = true;

-- 5. Test the exact query the frontend uses
-- Replace YEAR and MONTH with actual values from your published snapshot
SELECT
  'This is what the frontend should get:' AS info,
  *
FROM public_rankings
WHERE year = 2025 AND month = 12  -- Adjust these values based on your snapshot
ORDER BY ranking_position;
