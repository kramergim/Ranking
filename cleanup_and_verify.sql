-- Cleanup test snapshots and verify everything works

-- Step 1: Delete test snapshots
DELETE FROM ranking_snapshots
WHERE title LIKE 'Manual Test%'
   OR title LIKE 'Simple Test%'
   OR title = 'Test Snapshot - DEBUG';

SELECT 'Test snapshots cleaned up' AS status;

-- Step 2: Show remaining snapshots
SELECT
  rs.id,
  rs.title,
  rs.snapshot_date,
  rs.is_published,
  COUNT(rsd.id) AS athlete_count
FROM ranking_snapshots rs
LEFT JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id
GROUP BY rs.id, rs.title, rs.snapshot_date, rs.is_published
ORDER BY rs.created_at DESC;

-- Step 3: Verify ranking_live has data
SELECT
  'Athletes in ranking_live:' AS info,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE total_points > 0) AS with_points
FROM ranking_live;

-- Step 4: Show current ranking
SELECT
  athlete_name,
  total_points,
  current_year_points,
  last_year_pts,
  tournaments_count
FROM ranking_live
WHERE total_points > 0
ORDER BY total_points DESC;
