-- Diagnostic: Check what's in the view
SELECT COUNT(*) as total_rows FROM public_athlete_results;

-- Check distinct snapshots
SELECT DISTINCT snapshot_id, snapshot_month, snapshot_year
FROM public_athlete_results
ORDER BY snapshot_year DESC, snapshot_month DESC;

-- Check distinct athletes
SELECT DISTINCT athlete_id, athlete_name
FROM public_athlete_results
ORDER BY athlete_name
LIMIT 10;

-- Check a sample of data
SELECT
  athlete_id,
  athlete_name,
  snapshot_id,
  snapshot_month,
  snapshot_year,
  ranking_position,
  total_points,
  event_name,
  result_id
FROM public_athlete_results
LIMIT 10;

-- Check if there are any NULL athlete_ids or snapshot_ids
SELECT
  COUNT(*) as total_rows,
  COUNT(athlete_id) as rows_with_athlete_id,
  COUNT(snapshot_id) as rows_with_snapshot_id,
  COUNT(result_id) as rows_with_result_id
FROM public_athlete_results;
