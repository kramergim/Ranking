-- =====================================================
-- AUTOMATIC AGE CATEGORY & CARRY-OVER RULES
-- =====================================================
-- Implements:
-- 1. Automatic age category computation (birth-year based)
-- 2. First-year detection (birth-year based)
-- 3. Conditional carry-over rules (40%, 20%, or 0%)
-- 4. Audit logging for transparency
-- 5. Read-only computed fields for selectors/admins
-- =====================================================

-- =====================================================
-- STEP 1: Create audit log table
-- =====================================================

CREATE TABLE IF NOT EXISTS ranking_calculation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id),
  snapshot_id UUID REFERENCES ranking_snapshots(id),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Input data
  birth_year INT NOT NULL,
  last_year_pts DECIMAL(10,2) NOT NULL,

  -- Computed values
  age_category TEXT NOT NULL,
  is_first_year BOOLEAN NOT NULL,
  eligible_points DECIMAL(10,2) NOT NULL,

  -- Carry-over calculation
  carryover_rate DECIMAL(5,4) NOT NULL,
  carryover_applied DECIMAL(10,2) NOT NULL,

  -- Metadata
  calculation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_athlete ON ranking_calculation_audit(athlete_id);
CREATE INDEX idx_audit_snapshot ON ranking_calculation_audit(snapshot_id);
CREATE INDEX idx_audit_date ON ranking_calculation_audit(calculated_at);

COMMENT ON TABLE ranking_calculation_audit IS 'Audit log for age category and carry-over calculations';

-- =====================================================
-- STEP 2: Function to compute age category from birth year
-- =====================================================

CREATE OR REPLACE FUNCTION compute_age_category(p_birth_year INT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Cadets: born 2012-2014
  IF p_birth_year >= 2012 AND p_birth_year <= 2014 THEN
    RETURN 'Cadet';
  -- Juniors: born 2009-2011
  ELSIF p_birth_year >= 2009 AND p_birth_year <= 2011 THEN
    RETURN 'Junior';
  -- Seniors: born ≤2008
  ELSIF p_birth_year <= 2008 THEN
    RETURN 'Senior';
  ELSE
    -- Future birth years (shouldn't happen)
    RETURN 'Unknown';
  END IF;
END;
$$;

COMMENT ON FUNCTION compute_age_category IS 'Computes age category from birth year (Cadet: 2012-2014, Junior: 2009-2011, Senior: ≤2008)';

-- =====================================================
-- STEP 3: Function to detect first year in category
-- =====================================================

CREATE OR REPLACE FUNCTION is_first_year_in_category(p_birth_year INT, p_age_category TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- First-year Cadet: birth year 2014
  IF p_age_category = 'Cadet' AND p_birth_year = 2014 THEN
    RETURN TRUE;
  -- First-year Junior: birth year 2011
  ELSIF p_age_category = 'Junior' AND p_birth_year = 2011 THEN
    RETURN TRUE;
  -- First-year Senior: birth year 2008
  ELSIF p_age_category = 'Senior' AND p_birth_year = 2008 THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

COMMENT ON FUNCTION is_first_year_in_category IS 'Detects if athlete is in first year of category (Cadet: 2014, Junior: 2011, Senior: 2008)';

-- =====================================================
-- STEP 4: Function to compute eligible points (coefficient ≥ 2)
-- =====================================================

CREATE OR REPLACE FUNCTION compute_eligible_points(
  p_athlete_id UUID,
  p_snapshot_year INT,
  p_snapshot_date DATE
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_eligible_points DECIMAL(10,2);
BEGIN
  -- Sum points from tournaments with coefficient ≥ 2 in current season
  SELECT COALESCE(SUM(r.points_earned), 0)
  INTO v_eligible_points
  FROM results r
  JOIN events e ON e.id = r.event_id
  WHERE r.athlete_id = p_athlete_id
    AND EXTRACT(YEAR FROM e.event_date) = p_snapshot_year
    AND e.event_date <= p_snapshot_date
    AND e.coefficient >= 2
    AND r.points_earned IS NOT NULL;

  RETURN v_eligible_points;
END;
$$;

COMMENT ON FUNCTION compute_eligible_points IS 'Computes sum of points from tournaments with coefficient ≥ 2 in current season';

-- =====================================================
-- STEP 5: Function to compute carry-over rate
-- =====================================================

CREATE OR REPLACE FUNCTION compute_carryover_rate(
  p_is_first_year BOOLEAN,
  p_eligible_points DECIMAL(10,2)
)
RETURNS DECIMAL(5,4)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Standard carry-over (not first-year): 40%
  IF p_is_first_year = FALSE THEN
    RETURN 0.40;
  END IF;

  -- First-year: 20% IF eligible_points ≥ 5, otherwise 0%
  IF p_eligible_points >= 5 THEN
    RETURN 0.20;
  ELSE
    RETURN 0.00;
  END IF;
END;
$$;

COMMENT ON FUNCTION compute_carryover_rate IS 'Computes carry-over rate: 40% (standard), 20% (first-year with ≥5 eligible pts), 0% (first-year with <5 pts)';

-- =====================================================
-- STEP 6: Update athletes table to auto-compute age category
-- =====================================================

-- Add computed column for birth year (if not exists)
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS birth_year INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM date_of_birth)::INT) STORED;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_athletes_birth_year ON athletes(birth_year);

COMMENT ON COLUMN athletes.birth_year IS 'Computed from date_of_birth - used for age category calculation';

-- Update existing age_category values to match computed values
-- (This is a one-time migration step)
UPDATE athletes
SET age_category = compute_age_category(EXTRACT(YEAR FROM date_of_birth)::INT)
WHERE date_of_birth IS NOT NULL;

-- =====================================================
-- STEP 7: Create trigger to auto-update age_category
-- =====================================================

CREATE OR REPLACE FUNCTION update_age_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.age_category := compute_age_category(EXTRACT(YEAR FROM NEW.date_of_birth)::INT);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_age_category ON athletes;

CREATE TRIGGER trigger_update_age_category
  BEFORE INSERT OR UPDATE OF date_of_birth ON athletes
  FOR EACH ROW
  EXECUTE FUNCTION update_age_category();

COMMENT ON FUNCTION update_age_category IS 'Auto-updates age_category when date_of_birth changes';

-- =====================================================
-- STEP 8: Create view for athlete calculated fields (transparency)
-- =====================================================

CREATE OR REPLACE VIEW athlete_category_info AS
SELECT
  a.id AS athlete_id,
  a.first_name,
  a.last_name,
  a.first_name || ' ' || a.last_name AS full_name,
  a.date_of_birth,
  a.birth_year,

  -- Computed age category (READ-ONLY)
  compute_age_category(a.birth_year) AS age_category_computed,
  a.age_category AS age_category_stored,

  -- First-year status (READ-ONLY)
  is_first_year_in_category(a.birth_year, compute_age_category(a.birth_year)) AS is_first_year,

  -- Previous season points (manual input)
  a.last_year_pts,

  -- Eligible points will be computed at snapshot time (season-specific)
  a.is_active

FROM athletes a
WHERE a.date_of_birth IS NOT NULL;

GRANT SELECT ON athlete_category_info TO authenticated;

COMMENT ON VIEW athlete_category_info IS 'Exposes computed age category and first-year status for transparency';

-- =====================================================
-- STEP 9: Update snapshot generation with new carry-over rules
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

    -- Step 3: Compute eligible points (coefficient ≥ 2, current season)
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

    -- Skip athletes with no points
    IF v_total_points <= 0 THEN
      CONTINUE;
    END IF;

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
  WITH ranked AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
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

COMMENT ON FUNCTION generate_ranking_snapshot(INT, INT, TEXT) IS 'Generates snapshot with automatic age category and conditional carry-over rules';

-- =====================================================
-- STEP 10: Create admin view for transparency
-- =====================================================

CREATE OR REPLACE VIEW admin_athlete_carryover_details AS
SELECT
  a.id AS athlete_id,
  a.first_name || ' ' || a.last_name AS athlete_name,
  a.date_of_birth,
  a.birth_year,

  -- Computed fields (READ-ONLY)
  compute_age_category(a.birth_year) AS computed_age_category,
  is_first_year_in_category(a.birth_year, compute_age_category(a.birth_year)) AS is_first_year,

  -- Manual input
  a.last_year_pts AS previous_season_points,

  -- Most recent audit entry
  (
    SELECT eligible_points
    FROM ranking_calculation_audit
    WHERE athlete_id = a.id
    ORDER BY calculated_at DESC
    LIMIT 1
  ) AS last_eligible_points,

  (
    SELECT carryover_rate
    FROM ranking_calculation_audit
    WHERE athlete_id = a.id
    ORDER BY calculated_at DESC
    LIMIT 1
  ) AS last_carryover_rate,

  (
    SELECT carryover_applied
    FROM ranking_calculation_audit
    WHERE athlete_id = a.id
    ORDER BY calculated_at DESC
    LIMIT 1
  ) AS last_carryover_applied,

  (
    SELECT calculated_at
    FROM ranking_calculation_audit
    WHERE athlete_id = a.id
    ORDER BY calculated_at DESC
    LIMIT 1
  ) AS last_calculation_date

FROM athletes a
WHERE a.is_active = true
  AND a.date_of_birth IS NOT NULL
ORDER BY a.last_name, a.first_name;

GRANT SELECT ON admin_athlete_carryover_details TO authenticated;

COMMENT ON VIEW admin_athlete_carryover_details IS 'Admin view showing computed age category, first-year status, and carry-over calculation details';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Query 1: Check age category computation
-- SELECT
--   first_name,
--   last_name,
--   birth_year,
--   compute_age_category(birth_year) AS computed_category,
--   age_category AS stored_category
-- FROM athletes
-- WHERE date_of_birth IS NOT NULL
-- LIMIT 10;

-- Query 2: Check first-year detection
-- SELECT
--   first_name,
--   last_name,
--   birth_year,
--   compute_age_category(birth_year) AS category,
--   is_first_year_in_category(birth_year, compute_age_category(birth_year)) AS is_first_year
-- FROM athletes
-- WHERE date_of_birth IS NOT NULL
-- ORDER BY birth_year DESC
-- LIMIT 20;

-- Query 3: View admin transparency
-- SELECT * FROM admin_athlete_carryover_details LIMIT 10;

-- Query 4: View audit log
-- SELECT
--   a.first_name || ' ' || a.last_name AS athlete,
--   audit.age_category,
--   audit.is_first_year,
--   audit.eligible_points,
--   audit.carryover_rate,
--   audit.last_year_pts,
--   audit.carryover_applied,
--   audit.calculated_at
-- FROM ranking_calculation_audit audit
-- JOIN athletes a ON a.id = audit.athlete_id
-- ORDER BY audit.calculated_at DESC
-- LIMIT 20;

SELECT 'Automatic age category and carry-over rules implemented successfully!' as status;
