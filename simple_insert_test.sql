-- Simple test that shows results directly with SELECT

-- Step 1: Create test snapshot
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
  'Simple Test ' || NOW()::TEXT,
  false
) RETURNING id, title, 'Snapshot created' AS status;

-- Step 2: Get the snapshot ID
WITH last_snapshot AS (
  SELECT id FROM ranking_snapshots WHERE title LIKE 'Simple Test%' ORDER BY created_at DESC LIMIT 1
)
-- Step 3: Show what we're trying to insert FROM ranking_live
SELECT
  'FROM ranking_live (what we want to insert):' AS info,
  athlete_id,
  athlete_name,
  age_category,
  weight_category,
  gender,
  club,
  total_points,
  current_year_points,
  last_year_pts
FROM ranking_live
WHERE total_points > 0;

-- Step 4: Attempt the actual INSERT
WITH last_snapshot AS (
  SELECT id FROM ranking_snapshots WHERE title LIKE 'Simple Test%' ORDER BY created_at DESC LIMIT 1
)
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
  (SELECT id FROM last_snapshot),
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
  ROW_NUMBER() OVER (ORDER BY total_points DESC)
FROM ranking_live
WHERE total_points > 0
RETURNING
  'INSERT successful!' AS status,
  athlete_name,
  total_points,
  ranking_position;

-- Step 5: Verify what was inserted
WITH last_snapshot AS (
  SELECT id FROM ranking_snapshots WHERE title LIKE 'Simple Test%' ORDER BY created_at DESC LIMIT 1
)
SELECT
  'Verification - What is now in ranking_snapshot_data:' AS info,
  rsd.*
FROM ranking_snapshot_data rsd
WHERE snapshot_id = (SELECT id FROM last_snapshot);
