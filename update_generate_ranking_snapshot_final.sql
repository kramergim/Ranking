-- Drop and recreate generate_ranking_snapshot function to include last_year_pts
-- and use 'ranking_position' instead of 'rank'
DROP FUNCTION IF EXISTS generate_ranking_snapshot(UUID);

CREATE OR REPLACE FUNCTION generate_ranking_snapshot(p_snapshot_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete existing data for this snapshot (if regenerating)
  DELETE FROM ranking_snapshot_data WHERE snapshot_id = p_snapshot_id;

  -- Insert ranking data with last_year_pts included
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
    ranking_position  -- Changed from 'rank' to 'ranking_position'
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
END;
$$ LANGUAGE plpgsql;
