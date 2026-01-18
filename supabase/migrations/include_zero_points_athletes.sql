-- =====================================================
-- Include athletes with 0 points in ranking snapshots
-- =====================================================

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
  v_athlete_record RECORD;
  v_birth_year INT;
  v_age_category TEXT;
  v_is_first_year BOOLEAN;
  v_eligible_points DECIMAL(10,2);
  v_carryover_rate DECIMAL(5,4);
  v_carryover_applied DECIMAL(10,2);
  v_current_year_points DECIMAL(10,2);
  v_total_points DECIMAL(10,2);
BEGIN
  -- Calculate snapshot date (last day of month)
  v_snapshot_date := (DATE_TRUNC('month', make_date(p_snapshot_year, p_snapshot_month, 1)) + INTERVAL '1 month - 1 day')::date;

  -- Create snapshot record
  INSERT INTO ranking_snapshots (snapshot_date, snapshot_month, snapshot_year, title, is_published)
  VALUES (v_snapshot_date, p_snapshot_month, p_snapshot_year, p_title, false)
  RETURNING id INTO v_snapshot_id;

  -- Process each active athlete
  FOR v_athlete_record IN
    SELECT
      a.id,
      a.first_name,
      a.last_name,
      a.age_category,
      a.weight_category,
      a.gender,
      a.club,
      a.photo_url,
      a.hub_level,
      a.birth_year,
      a.last_year_pts
    FROM athletes a
    WHERE a.is_active = true
      AND a.date_of_birth IS NOT NULL
      AND a.age_category IS NOT NULL
  LOOP
    -- Step 1: Compute age category (should match stored value)
    v_age_category := compute_age_category(v_athlete_record.birth_year);

    -- Step 2: Detect first-year status
    v_is_first_year := is_first_year_in_category(v_athlete_record.birth_year, v_age_category);

    -- Step 3: Compute eligible points (coefficient >= 2, current season)
    v_eligible_points := compute_eligible_points(
      v_athlete_record.id,
      p_snapshot_year,
      v_snapshot_date
    );

    -- Step 4: Compute carry-over rate
    v_carryover_rate := compute_carryover_rate(v_is_first_year, v_eligible_points);

    -- Step 5: Apply carry-over
    v_carryover_applied := COALESCE(v_athlete_record.last_year_pts, 0) * v_carryover_rate;

    -- Step 6: Compute current year points
    v_current_year_points := COALESCE((
      SELECT SUM(r.points_earned)
      FROM results r
      JOIN events e ON e.id = r.event_id
      WHERE r.athlete_id = v_athlete_record.id
        AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
        AND e.event_date <= v_snapshot_date
        AND r.points_earned IS NOT NULL
    ), 0);

    -- Step 7: Compute total points
    v_total_points := v_current_year_points + v_carryover_applied;

    -- Step 8: Log to audit table
    INSERT INTO ranking_calculation_audit (
      athlete_id,
      snapshot_id,
      birth_year,
      last_year_pts,
      age_category,
      is_first_year,
      eligible_points,
      carryover_rate,
      carryover_applied,
      calculation_reason
    ) VALUES (
      v_athlete_record.id,
      v_snapshot_id,
      v_athlete_record.birth_year,
      COALESCE(v_athlete_record.last_year_pts, 0),
      v_age_category,
      v_is_first_year,
      v_eligible_points,
      v_carryover_rate,
      v_carryover_applied,
      'Snapshot generation: ' || p_snapshot_year || '-' || p_snapshot_month
    );

    -- REMOVED: Skip condition for athletes with no points
    -- Now include ALL active athletes regardless of points

    -- Step 9: Insert into ranking_snapshot_data (will be ranked later)
    INSERT INTO ranking_snapshot_data (
      snapshot_id,
      athlete_id,
      athlete_name,
      athlete_age_category,
      athlete_weight_category,
      athlete_gender,
      athlete_club,
      athlete_photo_url,
      athlete_hub_level,
      current_year_points,
      last_year_pts,
      total_points,
      tournaments_count,
      age_category,
      weight_category,
      gender,
      club,
      last_event_date,
      best_result_rank,
      best_result_event
    ) VALUES (
      v_snapshot_id,
      v_athlete_record.id,
      v_athlete_record.first_name || ' ' || v_athlete_record.last_name,
      v_age_category,
      v_athlete_record.weight_category,
      v_athlete_record.gender,
      v_athlete_record.club,
      v_athlete_record.photo_url,
      v_athlete_record.hub_level,
      v_current_year_points,
      COALESCE(v_athlete_record.last_year_pts, 0),
      v_total_points,
      (
        SELECT COUNT(DISTINCT r.event_id)
        FROM results r
        JOIN events e ON e.id = r.event_id
        WHERE r.athlete_id = v_athlete_record.id
          AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
          AND e.event_date <= v_snapshot_date
          AND r.points_earned IS NOT NULL
      ),
      v_age_category,
      v_athlete_record.weight_category,
      v_athlete_record.gender,
      v_athlete_record.club,
      (
        SELECT MAX(e.event_date)
        FROM results r
        JOIN events e ON e.id = r.event_id
        WHERE r.athlete_id = v_athlete_record.id
          AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
          AND e.event_date <= v_snapshot_date
          AND r.points_earned IS NOT NULL
      ),
      (
        SELECT MIN(r.final_rank)
        FROM results r
        JOIN events e ON e.id = r.event_id
        WHERE r.athlete_id = v_athlete_record.id
          AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
          AND e.event_date <= v_snapshot_date
          AND r.points_earned IS NOT NULL
      ),
      (
        SELECT e.name
        FROM results r
        JOIN events e ON e.id = r.event_id
        WHERE r.athlete_id = v_athlete_record.id
          AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
          AND e.event_date <= v_snapshot_date
          AND r.points_earned IS NOT NULL
        ORDER BY r.final_rank ASC
        LIMIT 1
      )
    );
  END LOOP;

  -- Step 10: Update ranking positions per age category
  -- Using RANK() so athletes with same points get the same rank
  WITH ranked AS (
    SELECT
      id,
      RANK() OVER (
        PARTITION BY age_category
        ORDER BY total_points DESC
      ) as new_rank
    FROM ranking_snapshot_data
    WHERE snapshot_id = v_snapshot_id
  )
  UPDATE ranking_snapshot_data rsd
  SET ranking_position = ranked.new_rank,
      rank_position = ranked.new_rank
  FROM ranked
  WHERE rsd.id = ranked.id;

  RETURN v_snapshot_id;
END;
$$;

COMMENT ON FUNCTION generate_ranking_snapshot(INT, INT, TEXT) IS 'Generates snapshot with all active athletes including those with 0 points';

SELECT 'Snapshot function updated to include athletes with 0 points!' as status;
