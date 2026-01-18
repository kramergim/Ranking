-- Check if there is published data for the public page

-- 1. Check published snapshots
SELECT
  'Published snapshots:' AS info,
  id,
  title,
  snapshot_date,
  is_published
FROM ranking_snapshots
WHERE is_published = true
ORDER BY snapshot_date DESC;

-- 2. Check public_snapshots_list view
SELECT
  'public_snapshots_list view:' AS info,
  *
FROM public_snapshots_list
LIMIT 5;

-- 3. Check public_rankings view
SELECT
  'public_rankings view:' AS info,
  *
FROM public_rankings
LIMIT 5;

-- 4. If no published snapshots, show unpublished ones
SELECT
  'Unpublished snapshots (need to publish one):' AS info,
  id,
  title,
  snapshot_date,
  is_published,
  (SELECT COUNT(*) FROM ranking_snapshot_data WHERE snapshot_id = rs.id) AS athlete_count
FROM ranking_snapshots rs
WHERE is_published = false
ORDER BY created_at DESC;
