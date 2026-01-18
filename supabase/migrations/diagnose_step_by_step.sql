-- Step 1: Check if there are published snapshots
SELECT COUNT(*) as published_snapshots_count
FROM ranking_snapshots
WHERE is_published = true;

-- Step 2: Check if ranking_snapshot_data has any rows
SELECT COUNT(*) as snapshot_data_count
FROM ranking_snapshot_data;

-- Step 3: Check if there's data in ranking_snapshot_data for published snapshots
SELECT
  rs.id as snapshot_id,
  rs.snapshot_month,
  rs.snapshot_year,
  rs.is_published,
  COUNT(rsd.athlete_id) as athlete_count
FROM ranking_snapshots rs
LEFT JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id
WHERE rs.is_published = true
GROUP BY rs.id, rs.snapshot_month, rs.snapshot_year, rs.is_published;

-- Step 4: Sample data from ranking_snapshot_data (if any)
SELECT
  snapshot_id,
  athlete_id,
  athlete_name,
  ranking_position,
  total_points
FROM ranking_snapshot_data
LIMIT 5;

-- Step 5: Check what columns ranking_snapshot_data actually has
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ranking_snapshot_data'
ORDER BY ordinal_position;
