-- Diagnostic script for empty snapshots

-- 1. Check if ranking_live view has data
SELECT 'Checking ranking_live view...' AS step;
SELECT COUNT(*) AS total_athletes FROM ranking_live;
SELECT * FROM ranking_live ORDER BY total_points DESC LIMIT 5;

-- 2. Check if there are athletes with points > 0
SELECT COUNT(*) AS athletes_with_points
FROM ranking_live
WHERE total_points > 0;

-- 3. Check existing snapshots
SELECT
  id,
  title,
  snapshot_date,
  is_published,
  (SELECT COUNT(*) FROM ranking_snapshot_data WHERE snapshot_id = rs.id) AS athlete_count
FROM ranking_snapshots rs
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check if ranking_snapshot_data table has any data
SELECT COUNT(*) AS total_snapshot_records FROM ranking_snapshot_data;

-- 5. Check the most recent snapshot data
SELECT
  rsd.*
FROM ranking_snapshot_data rsd
JOIN ranking_snapshots rs ON rsd.snapshot_id = rs.id
ORDER BY rs.created_at DESC, rsd.ranking_position
LIMIT 10;
