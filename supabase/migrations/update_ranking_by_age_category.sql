-- Update generate_ranking_snapshot to rank ONLY within age_category
-- No more global ranking!

CREATE OR REPLACE FUNCTION generate_ranking_snapshot(
  p_snapshot_month INT,
  p_snapshot_year INT,
  p_title TEXT DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_id uuid;
  v_snapshot_date date;
BEGIN
  -- Calculate snapshot date (last day of the month)
  v_snapshot_date := (DATE_TRUNC('month', make_date(p_snapshot_year, p_snapshot_month, 1)) + INTERVAL '1 month - 1 day')::date;

  -- Create snapshot
  INSERT INTO ranking_snapshots (
    snapshot_date,
    snapshot_month,
    snapshot_year,
    title,
    is_published
  ) VALUES (
    v_snapshot_date,
    p_snapshot_month,
    p_snapshot_year,
    p_title,
    false  -- Not published by default
  )
  RETURNING id INTO v_snapshot_id;

  -- Generate ranking data with rank WITHIN age_category
  INSERT INTO ranking_snapshot_data (
    snapshot_id,
    athlete_id,
    athlete_name,
    athlete_age_category,
    athlete_weight_category,
    athlete_gender,
    athlete_club,
    ranking_position,  -- Rank within age_category
    total_points,
    current_year_points,
    last_year_pts,
    tournaments_count,
    best_result_rank,
    best_result_event,
    last_event_date,
    age_category,
    weight_category,
    gender,
    club
  )
  SELECT
    v_snapshot_id,
    rl.athlete_id,
    rl.athlete_name,
    rl.age_category,
    rl.weight_category,
    rl.gender,
    rl.club,
    -- CRITICAL: Rank within age_category, not global
    ROW_NUMBER() OVER (
      PARTITION BY rl.age_category
      ORDER BY rl.total_points DESC, rl.athlete_name ASC
    ) as ranking_position,
    rl.total_points,
    rl.current_year_points,
    rl.last_year_pts,
    rl.tournaments_count,
    rl.best_result_rank,
    rl.best_result_event,
    rl.last_event_date,
    rl.age_category,
    rl.weight_category,
    rl.gender,
    rl.club
  FROM ranking_live rl
  WHERE rl.age_category IS NOT NULL  -- Only athletes with age category
  ORDER BY rl.age_category, ranking_position;

  RETURN v_snapshot_id;
END;
$$;
