-- Update generate_ranking_snapshot function with working INSERT

DROP FUNCTION IF EXISTS generate_ranking_snapshot(UUID);

CREATE OR REPLACE FUNCTION generate_ranking_snapshot(p_snapshot_id UUID)
RETURNS VOID AS $$
DECLARE
  rows_inserted INTEGER;
BEGIN
  -- Delete existing data for this snapshot (if regenerating)
  DELETE FROM ranking_snapshot_data WHERE snapshot_id = p_snapshot_id;

  -- Insert ranking data from ranking_live
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
    p_snapshot_id,
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
    ROW_NUMBER() OVER (ORDER BY total_points DESC) AS ranking_position
  FROM ranking_live
  WHERE total_points > 0
  ORDER BY total_points DESC;

  -- Get count of inserted rows
  GET DIAGNOSTICS rows_inserted = ROW_COUNT;

  -- Raise notice for debugging
  RAISE NOTICE 'Snapshot % generated: % athletes inserted', p_snapshot_id, rows_inserted;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT 'Function updated successfully!' AS status;
