-- =====================================================
-- FINAL POINTS CALCULATION - COMPLETE IMPLEMENTATION
-- =====================================================
-- Implements the authoritative Swiss Taekwondo points rules:
-- total_points = current_year_points + carry_over_points + hub_bonus_points
-- =====================================================

-- =====================================================
-- STEP 0: Clean invalid hub_level values in athletes table
-- =====================================================

UPDATE athletes
SET hub_level = NULL
WHERE hub_level IS NULL
   OR hub_level = ''
   OR hub_level = '-'
   OR hub_level LIKE '%--%'
   OR hub_level = 'null';

-- =====================================================
-- STEP 1: Add carry_over_points column to ranking_snapshot_data
-- =====================================================

ALTER TABLE ranking_snapshot_data
ADD COLUMN IF NOT EXISTS carry_over_points DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN ranking_snapshot_data.carry_over_points IS 'Calculated carry-over from last_year_pts (40% or 20% based on rules)';

-- =====================================================
-- STEP 2: Update ranking_live view with correct logic
-- =====================================================

DROP VIEW IF EXISTS ranking_live CASCADE;

CREATE OR REPLACE VIEW ranking_live AS
WITH current_year_results AS (
  SELECT
    r.athlete_id,
    SUM(r.points_earned) AS current_year_points,
    COUNT(DISTINCT r.event_id) AS tournaments_count,
    MIN(r.final_rank) AS best_rank,
    MAX(e.event_date) AS last_event_date,
    SUM(r.matches_won) AS total_matches_won,
    COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 1) AS gold_medals,
    COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 2) AS silver_medals,
    COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 3) AS bronze_medals
  FROM results r
  JOIN events e ON e.id = r.event_id
  WHERE r.points_earned IS NOT NULL
    AND EXTRACT(YEAR FROM e.event_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  GROUP BY r.athlete_id
),
eligible_points AS (
  -- Points from Coefficient >= 2 tournaments (for first-year carry-over eligibility)
  SELECT
    r.athlete_id,
    SUM(r.points_earned) AS coef2_points
  FROM results r
  JOIN events e ON e.id = r.event_id
  WHERE r.points_earned IS NOT NULL
    AND EXTRACT(YEAR FROM e.event_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND e.coefficient >= 2
  GROUP BY r.athlete_id
)
SELECT
  a.id AS athlete_id,
  a.first_name,
  a.last_name,
  a.first_name || ' ' || a.last_name AS full_name,
  a.first_name || ' ' || a.last_name AS athlete_name,
  a.date_of_birth,
  a.gender,
  a.age_category,
  a.weight_category,
  a.club,
  a.license_number,
  a.photo_url,
  a.hub_level,
  a.birth_year,
  COALESCE(a.last_year_pts, 0) AS last_year_pts,

  -- Current year points (from results only)
  COALESCE(cyr.current_year_points, 0) AS current_year_points,

  -- Carry-over calculation
  CASE
    -- Case A: Not first year in category -> 40%
    WHEN NOT is_first_year_in_category(a.birth_year, a.age_category) THEN
      COALESCE(a.last_year_pts, 0) * 0.4
    -- Case B: First year AND earned >= 5 pts in Coef 2+ -> 20%
    WHEN is_first_year_in_category(a.birth_year, a.age_category)
         AND COALESCE(ep.coef2_points, 0) >= 5 THEN
      COALESCE(a.last_year_pts, 0) * 0.2
    -- Case B (not eligible): First year but < 5 pts in Coef 2+ -> 0%
    ELSE 0
  END AS carry_over_points,

  -- HUB Bonus: +5 if hub_level is valid (not null, empty, '-', or '--')
  CASE
    WHEN a.hub_level IS NOT NULL
         AND a.hub_level != ''
         AND a.hub_level != '-'
         AND a.hub_level NOT LIKE '%--%'
    THEN 5
    ELSE 0
  END AS hub_bonus_points,

  -- Total points = current_year + carry_over + hub_bonus
  COALESCE(cyr.current_year_points, 0)
  + CASE
      WHEN NOT is_first_year_in_category(a.birth_year, a.age_category) THEN
        COALESCE(a.last_year_pts, 0) * 0.4
      WHEN is_first_year_in_category(a.birth_year, a.age_category)
           AND COALESCE(ep.coef2_points, 0) >= 5 THEN
        COALESCE(a.last_year_pts, 0) * 0.2
      ELSE 0
    END
  + CASE
      WHEN a.hub_level IS NOT NULL
           AND a.hub_level != ''
           AND a.hub_level != '-'
           AND a.hub_level NOT LIKE '%--%'
      THEN 5
      ELSE 0
    END
  AS total_points,

  -- Tournament stats
  COALESCE(cyr.tournaments_count, 0) AS tournaments_count,
  cyr.best_rank,
  cyr.last_event_date,
  COALESCE(cyr.total_matches_won, 0) AS total_matches_won,
  COALESCE(cyr.gold_medals, 0) AS gold_medals,
  COALESCE(cyr.silver_medals, 0) AS silver_medals,
  COALESCE(cyr.bronze_medals, 0) AS bronze_medals,

  -- Best result event name
  (
    SELECT e.name
    FROM results r2
    JOIN events e ON e.id = r2.event_id
    WHERE r2.athlete_id = a.id
      AND EXTRACT(YEAR FROM e.event_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND r2.final_rank = cyr.best_rank
    LIMIT 1
  ) AS best_result_event,

  -- Global rank
  ROW_NUMBER() OVER (
    ORDER BY (
      COALESCE(cyr.current_year_points, 0)
      + CASE
          WHEN NOT is_first_year_in_category(a.birth_year, a.age_category) THEN
            COALESCE(a.last_year_pts, 0) * 0.4
          WHEN is_first_year_in_category(a.birth_year, a.age_category)
               AND COALESCE(ep.coef2_points, 0) >= 5 THEN
            COALESCE(a.last_year_pts, 0) * 0.2
          ELSE 0
        END
      + CASE
          WHEN a.hub_level IS NOT NULL
               AND a.hub_level != ''
               AND a.hub_level != '-'
               AND a.hub_level NOT LIKE '%--%'
          THEN 5
          ELSE 0
        END
    ) DESC, a.last_name, a.first_name
  ) AS rank_position

FROM athletes a
LEFT JOIN current_year_results cyr ON cyr.athlete_id = a.id
LEFT JOIN eligible_points ep ON ep.athlete_id = a.id
WHERE a.is_active = true
  AND a.date_of_birth IS NOT NULL
ORDER BY rank_position;

COMMENT ON VIEW ranking_live IS 'Live ranking with correct carry-over rules and HUB bonus';

-- =====================================================
-- STEP 3: Update snapshot generation function
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
  v_age_category TEXT;
  v_is_first_year BOOLEAN;
  v_eligible_points DECIMAL(10,2);
  v_carryover_rate DECIMAL(5,4);
  v_carry_over_points DECIMAL(10,2);
  v_hub_bonus_points DECIMAL(10,2);
  v_current_year_points DECIMAL(10,2);
  v_total_points DECIMAL(10,2);
  v_clean_hub_level TEXT;
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
      COALESCE(a.last_year_pts, 0) AS last_year_pts
    FROM athletes a
    WHERE a.is_active = true
      AND a.date_of_birth IS NOT NULL
      AND a.age_category IS NOT NULL
  LOOP
    -- Step 1: Get age category
    v_age_category := v_athlete_record.age_category;

    -- Step 2: Detect first-year status
    v_is_first_year := is_first_year_in_category(v_athlete_record.birth_year, v_age_category);

    -- Step 3: Compute eligible points (coefficient >= 2, current year, before snapshot date)
    SELECT COALESCE(SUM(r.points_earned), 0)
    INTO v_eligible_points
    FROM results r
    JOIN events e ON e.id = r.event_id
    WHERE r.athlete_id = v_athlete_record.id
      AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
      AND e.event_date <= v_snapshot_date
      AND e.coefficient >= 2
      AND r.points_earned IS NOT NULL;

    -- Step 4: Compute carry-over rate and points
    IF v_is_first_year = FALSE THEN
      -- Case A: Same category -> 40%
      v_carryover_rate := 0.40;
      v_carry_over_points := v_athlete_record.last_year_pts * 0.40;
    ELSIF v_eligible_points >= 5 THEN
      -- Case B: First year with >= 5 pts in Coef 2+ -> 20%
      v_carryover_rate := 0.20;
      v_carry_over_points := v_athlete_record.last_year_pts * 0.20;
    ELSE
      -- Case B (not eligible): First year with < 5 pts -> 0%
      v_carryover_rate := 0.00;
      v_carry_over_points := 0;
    END IF;

    -- Step 5: Clean hub_level and compute HUB bonus
    -- NULL if empty, '-', or contains '--'
    v_clean_hub_level := CASE
      WHEN v_athlete_record.hub_level IS NULL THEN NULL
      WHEN v_athlete_record.hub_level = '' THEN NULL
      WHEN v_athlete_record.hub_level = '-' THEN NULL
      WHEN v_athlete_record.hub_level LIKE '%--%' THEN NULL
      ELSE v_athlete_record.hub_level
    END;

    IF v_clean_hub_level IS NOT NULL THEN
      v_hub_bonus_points := 5;
    ELSE
      v_hub_bonus_points := 0;
    END IF;

    -- Step 6: Compute current year points (all results up to snapshot date)
    SELECT COALESCE(SUM(r.points_earned), 0)
    INTO v_current_year_points
    FROM results r
    JOIN events e ON e.id = r.event_id
    WHERE r.athlete_id = v_athlete_record.id
      AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
      AND e.event_date <= v_snapshot_date
      AND r.points_earned IS NOT NULL;

    -- Step 7: Compute total points
    v_total_points := v_current_year_points + v_carry_over_points + v_hub_bonus_points;

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
      v_athlete_record.last_year_pts,
      v_age_category,
      v_is_first_year,
      v_eligible_points,
      v_carryover_rate,
      v_carry_over_points,
      'Snapshot ' || p_snapshot_year || '-' || p_snapshot_month || ' | HUB bonus: ' || v_hub_bonus_points
    );

    -- Step 9: Insert into ranking_snapshot_data (include athletes with 0 points)
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
      carry_over_points,
      hub_bonus_points,
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
      v_clean_hub_level,
      v_current_year_points,
      v_athlete_record.last_year_pts,
      v_carry_over_points,
      v_hub_bonus_points,
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

  -- Step 10: Update ranking positions per age category using RANK()
  WITH ranked AS (
    SELECT
      id,
      RANK() OVER (
        PARTITION BY age_category
        ORDER BY total_points DESC, athlete_name ASC
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

COMMENT ON FUNCTION generate_ranking_snapshot(INT, INT, TEXT) IS 'Generates snapshot with carry-over rules and HUB bonus';

-- =====================================================
-- STEP 4: Update regenerate snapshot function
-- =====================================================

CREATE OR REPLACE FUNCTION generate_ranking_snapshot(
  p_snapshot_id UUID
)
RETURNS TABLE (
  athletes_count INTEGER,
  max_points DECIMAL,
  min_points DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_athletes_count INTEGER;
  v_max_points DECIMAL;
  v_min_points DECIMAL;
  v_snapshot_month INT;
  v_snapshot_year INT;
  v_snapshot_date DATE;
  v_athlete_record RECORD;
  v_age_category TEXT;
  v_is_first_year BOOLEAN;
  v_eligible_points DECIMAL(10,2);
  v_carry_over_points DECIMAL(10,2);
  v_hub_bonus_points DECIMAL(10,2);
  v_current_year_points DECIMAL(10,2);
  v_total_points DECIMAL(10,2);
  v_clean_hub_level TEXT;
BEGIN
  -- Get snapshot info
  SELECT snapshot_month, snapshot_year, snapshot_date
  INTO v_snapshot_month, v_snapshot_year, v_snapshot_date
  FROM ranking_snapshots
  WHERE id = p_snapshot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Snapshot % not found', p_snapshot_id;
  END IF;

  -- Delete old data
  DELETE FROM ranking_snapshot_data WHERE snapshot_id = p_snapshot_id;

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
      COALESCE(a.last_year_pts, 0) AS last_year_pts
    FROM athletes a
    WHERE a.is_active = true
      AND a.date_of_birth IS NOT NULL
      AND a.age_category IS NOT NULL
  LOOP
    v_age_category := v_athlete_record.age_category;
    v_is_first_year := is_first_year_in_category(v_athlete_record.birth_year, v_age_category);

    -- Eligible points (Coef >= 2)
    SELECT COALESCE(SUM(r.points_earned), 0)
    INTO v_eligible_points
    FROM results r
    JOIN events e ON e.id = r.event_id
    WHERE r.athlete_id = v_athlete_record.id
      AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year
      AND e.event_date <= v_snapshot_date
      AND e.coefficient >= 2
      AND r.points_earned IS NOT NULL;

    -- Carry-over calculation
    IF v_is_first_year = FALSE THEN
      v_carry_over_points := v_athlete_record.last_year_pts * 0.40;
    ELSIF v_eligible_points >= 5 THEN
      v_carry_over_points := v_athlete_record.last_year_pts * 0.20;
    ELSE
      v_carry_over_points := 0;
    END IF;

    -- Clean hub_level and compute HUB bonus
    v_clean_hub_level := CASE
      WHEN v_athlete_record.hub_level IS NULL THEN NULL
      WHEN v_athlete_record.hub_level = '' THEN NULL
      WHEN v_athlete_record.hub_level = '-' THEN NULL
      WHEN v_athlete_record.hub_level LIKE '%--%' THEN NULL
      ELSE v_athlete_record.hub_level
    END;
    v_hub_bonus_points := CASE WHEN v_clean_hub_level IS NOT NULL THEN 5 ELSE 0 END;

    -- Current year points
    SELECT COALESCE(SUM(r.points_earned), 0)
    INTO v_current_year_points
    FROM results r
    JOIN events e ON e.id = r.event_id
    WHERE r.athlete_id = v_athlete_record.id
      AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year
      AND e.event_date <= v_snapshot_date
      AND r.points_earned IS NOT NULL;

    -- Total
    v_total_points := v_current_year_points + v_carry_over_points + v_hub_bonus_points;

    -- Insert
    INSERT INTO ranking_snapshot_data (
      snapshot_id, athlete_id, athlete_name, athlete_age_category, athlete_weight_category,
      athlete_gender, athlete_club, athlete_photo_url, athlete_hub_level,
      current_year_points, last_year_pts, carry_over_points, hub_bonus_points, total_points,
      tournaments_count, age_category, weight_category, gender, club, last_event_date,
      best_result_rank, best_result_event
    ) VALUES (
      p_snapshot_id,
      v_athlete_record.id,
      v_athlete_record.first_name || ' ' || v_athlete_record.last_name,
      v_age_category,
      v_athlete_record.weight_category,
      v_athlete_record.gender,
      v_athlete_record.club,
      v_athlete_record.photo_url,
      v_clean_hub_level,
      v_current_year_points,
      v_athlete_record.last_year_pts,
      v_carry_over_points,
      v_hub_bonus_points,
      v_total_points,
      (SELECT COUNT(DISTINCT r.event_id) FROM results r JOIN events e ON e.id = r.event_id
       WHERE r.athlete_id = v_athlete_record.id AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year
       AND e.event_date <= v_snapshot_date AND r.points_earned IS NOT NULL),
      v_age_category,
      v_athlete_record.weight_category,
      v_athlete_record.gender,
      v_athlete_record.club,
      (SELECT MAX(e.event_date) FROM results r JOIN events e ON e.id = r.event_id
       WHERE r.athlete_id = v_athlete_record.id AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year
       AND e.event_date <= v_snapshot_date AND r.points_earned IS NOT NULL),
      (SELECT MIN(r.final_rank) FROM results r JOIN events e ON e.id = r.event_id
       WHERE r.athlete_id = v_athlete_record.id AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year
       AND e.event_date <= v_snapshot_date AND r.points_earned IS NOT NULL),
      (SELECT e.name FROM results r JOIN events e ON e.id = r.event_id
       WHERE r.athlete_id = v_athlete_record.id AND EXTRACT(YEAR FROM e.event_date) = v_snapshot_year
       AND e.event_date <= v_snapshot_date AND r.points_earned IS NOT NULL
       ORDER BY r.final_rank ASC LIMIT 1)
    );
  END LOOP;

  -- Update ranking positions using RANK()
  WITH ranked AS (
    SELECT id, RANK() OVER (PARTITION BY age_category ORDER BY total_points DESC, athlete_name ASC) as new_rank
    FROM ranking_snapshot_data WHERE snapshot_id = p_snapshot_id
  )
  UPDATE ranking_snapshot_data rsd SET ranking_position = ranked.new_rank, rank_position = ranked.new_rank
  FROM ranked WHERE rsd.id = ranked.id;

  -- Stats
  SELECT COUNT(*), COALESCE(MAX(total_points), 0), COALESCE(MIN(total_points), 0)
  INTO v_athletes_count, v_max_points, v_min_points
  FROM ranking_snapshot_data WHERE snapshot_id = p_snapshot_id;

  RETURN QUERY SELECT v_athletes_count, v_max_points, v_min_points;
END;
$$;

-- Admin regenerate with bypass
CREATE OR REPLACE FUNCTION admin_regenerate_snapshot(p_snapshot_id UUID)
RETURNS TABLE (athletes_count INTEGER, max_points DECIMAL, min_points DECIMAL)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM set_config('app.bypass_snapshot_lock', 'on', true);
  RETURN QUERY SELECT * FROM generate_ranking_snapshot(p_snapshot_id);
END;
$$;

-- =====================================================
-- STEP 5: Update public views
-- =====================================================

DROP VIEW IF EXISTS public_athlete_results;

CREATE OR REPLACE VIEW public_athlete_results AS
SELECT
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.club,
  rsd.age_category,
  rsd.weight_category,
  rsd.gender,
  rsd.athlete_photo_url AS photo_url,
  rsd.athlete_hub_level AS hub_level,
  rs.id AS snapshot_id,
  rs.snapshot_date,
  rs.snapshot_month,
  rs.snapshot_year,
  rsd.current_year_points,
  rsd.carry_over_points,
  rsd.hub_bonus_points,
  rsd.total_points,
  rsd.ranking_position,
  e.id AS event_id,
  e.name AS event_name,
  e.event_date,
  e.coefficient AS event_coefficient,
  r.id AS result_id,
  r.final_rank,
  r.matches_won,
  r.points_earned,
  r.calculation_explanation
FROM ranking_snapshots rs
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id
LEFT JOIN results r ON rsd.athlete_id = r.athlete_id
LEFT JOIN events e ON r.event_id = e.id
WHERE rs.is_published = true
ORDER BY rs.snapshot_date DESC, rsd.athlete_name, e.event_date DESC NULLS LAST;

GRANT SELECT ON public_athlete_results TO anon;
GRANT SELECT ON public_athlete_results TO authenticated;

DROP VIEW IF EXISTS public_rankings;

CREATE OR REPLACE VIEW public_rankings AS
SELECT
  rs.id AS snapshot_id,
  rs.snapshot_date,
  rs.snapshot_month AS month,
  rs.snapshot_year AS year,
  rs.snapshot_month,
  rs.snapshot_year,
  rs.title,
  rs.description,
  rs.published_at,
  rs.pdf_url,
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.club,
  rsd.age_category,
  rsd.weight_category,
  rsd.gender,
  rsd.athlete_hub_level AS hub_level,
  rsd.ranking_position,
  rsd.current_year_points,
  rsd.carry_over_points,
  rsd.hub_bonus_points,
  rsd.total_points,
  rsd.tournaments_count,
  rsd.best_result_rank,
  rsd.best_result_event
FROM ranking_snapshots rs
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id
WHERE rs.is_published = true AND rsd.age_category IS NOT NULL
ORDER BY rs.snapshot_date DESC, rsd.age_category, rsd.ranking_position;

GRANT SELECT ON public_rankings TO anon;
GRANT SELECT ON public_rankings TO authenticated;

DROP VIEW IF EXISTS public_rankings_by_age_category CASCADE;

CREATE OR REPLACE VIEW public_rankings_by_age_category AS
SELECT
  rs.id AS snapshot_id,
  rs.snapshot_date,
  rs.snapshot_month,
  rs.snapshot_year,
  rs.title AS snapshot_title,
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.club,
  rsd.age_category,
  rsd.weight_category,
  rsd.gender,
  rsd.athlete_hub_level AS hub_level,
  rsd.ranking_position AS rank_in_category,
  rsd.current_year_points,
  rsd.carry_over_points,
  rsd.hub_bonus_points,
  rsd.total_points,
  rsd.tournaments_count,
  rsd.last_event_date
FROM ranking_snapshots rs
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id
WHERE rs.is_published = true AND rsd.age_category IS NOT NULL
ORDER BY rs.snapshot_date DESC, rsd.age_category, rsd.ranking_position;

GRANT SELECT ON public_rankings_by_age_category TO anon;
GRANT SELECT ON public_rankings_by_age_category TO authenticated;

-- =====================================================
-- STEP 6: Backfill existing snapshot data
-- =====================================================

DO $$
BEGIN
  PERFORM set_config('app.bypass_snapshot_lock', 'on', true);

  -- Clean invalid hub_level values in snapshot data
  UPDATE ranking_snapshot_data
  SET athlete_hub_level = NULL
  WHERE athlete_hub_level IS NULL
     OR athlete_hub_level = ''
     OR athlete_hub_level = '-'
     OR athlete_hub_level LIKE '%--%';

  -- Update carry_over_points and hub_bonus_points for existing data
  UPDATE ranking_snapshot_data rsd
  SET
    carry_over_points = COALESCE(rsd.last_year_pts, 0) * 0.4,  -- Default to 40% for existing
    hub_bonus_points = CASE WHEN rsd.athlete_hub_level IS NOT NULL THEN 5 ELSE 0 END;

  -- Recalculate total_points
  UPDATE ranking_snapshot_data rsd
  SET total_points = COALESCE(rsd.current_year_points, 0)
                   + COALESCE(rsd.carry_over_points, 0)
                   + COALESCE(rsd.hub_bonus_points, 0);
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'Final points calculation migration complete!' AS status;
