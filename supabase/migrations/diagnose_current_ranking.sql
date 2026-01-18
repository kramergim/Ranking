-- Check current ranking_position logic
-- Is it global or by age_category?

-- Test 1: See current rankings with age categories
SELECT
  ranking_position,
  athlete_name,
  age_category,
  total_points
FROM ranking_snapshot_data
WHERE snapshot_id = (
  SELECT id FROM ranking_snapshots
  WHERE is_published = true
  ORDER BY snapshot_date DESC
  LIMIT 1
)
ORDER BY ranking_position;

-- Test 2: Check if ranking_position resets per age_category
SELECT
  age_category,
  MIN(ranking_position) as min_rank,
  MAX(ranking_position) as max_rank,
  COUNT(*) as athlete_count
FROM ranking_snapshot_data
WHERE snapshot_id = (
  SELECT id FROM ranking_snapshots
  WHERE is_published = true
  ORDER BY snapshot_date DESC
  LIMIT 1
)
GROUP BY age_category
ORDER BY age_category;

-- Test 3: See if ranks are continuous within each category
SELECT
  ranking_position,
  athlete_name,
  age_category,
  total_points,
  ROW_NUMBER() OVER (PARTITION BY age_category ORDER BY total_points DESC) as expected_rank_in_category
FROM ranking_snapshot_data
WHERE snapshot_id = (
  SELECT id FROM ranking_snapshots
  WHERE is_published = true
  ORDER BY snapshot_date DESC
  LIMIT 1
)
ORDER BY age_category, total_points DESC;
