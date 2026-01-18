-- ============================================================================
-- MIGRATION: Ranking par catégorie d'âge uniquement
-- Description: Supprime le classement général et implémente un ranking
--              uniquement par catégorie d'âge (Cadet, Junior, Senior)
-- ============================================================================

-- STEP 1: Update generate_ranking_snapshot function
-- Rank athletes within their age_category, not globally
-- ============================================================================

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
    false
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
  WHERE rl.age_category IS NOT NULL
  ORDER BY rl.age_category, ranking_position;

  RETURN v_snapshot_id;
END;
$$;


-- STEP 2: Update public views
-- ============================================================================

-- Drop and recreate public_rankings view
DROP VIEW IF EXISTS public_rankings CASCADE;

CREATE OR REPLACE VIEW public_rankings AS
SELECT
  rs.id AS snapshot_id,
  rs.snapshot_date,
  rs.snapshot_month AS month,
  rs.snapshot_year AS year,
  rs.snapshot_month,
  rs.snapshot_year,

  -- Athlete info
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.club,
  rsd.age_category,
  rsd.weight_category,
  rsd.gender,

  -- Ranking info (rank within age_category)
  rsd.ranking_position,
  rsd.total_points,
  rsd.current_year_points,
  rsd.last_year_pts

FROM ranking_snapshots rs
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id

WHERE
  rs.is_published = true
  AND rsd.age_category IS NOT NULL

ORDER BY
  rs.snapshot_date DESC,
  rsd.age_category,
  rsd.ranking_position;

GRANT SELECT ON public_rankings TO anon;
GRANT SELECT ON public_rankings TO authenticated;


-- Create dedicated view for clarity
DROP VIEW IF EXISTS public_rankings_by_age_category CASCADE;

CREATE OR REPLACE VIEW public_rankings_by_age_category AS
SELECT
  rs.id AS snapshot_id,
  rs.snapshot_date,
  rs.snapshot_month,
  rs.snapshot_year,
  rs.title AS snapshot_title,

  -- Athlete info
  rsd.athlete_id,
  rsd.athlete_name,
  rsd.club,
  rsd.age_category,
  rsd.weight_category,
  rsd.gender,

  -- Ranking info (WITHIN age_category)
  rsd.ranking_position AS rank_in_category,
  rsd.total_points,
  rsd.current_year_points,
  rsd.last_year_pts,
  rsd.tournaments_count,
  rsd.last_event_date

FROM ranking_snapshots rs
INNER JOIN ranking_snapshot_data rsd ON rs.id = rsd.snapshot_id

WHERE
  rs.is_published = true
  AND rsd.age_category IS NOT NULL

ORDER BY
  rs.snapshot_date DESC,
  rsd.age_category,
  rsd.ranking_position;

GRANT SELECT ON public_rankings_by_age_category TO anon;
GRANT SELECT ON public_rankings_by_age_category TO authenticated;


-- STEP 3: Verification queries
-- ============================================================================

-- Verify the changes
SELECT 'Migration completed successfully!' as status;

-- Show current rankings by age_category
SELECT
  age_category,
  ranking_position as rank_in_category,
  athlete_name,
  total_points
FROM ranking_snapshot_data
WHERE snapshot_id = (
  SELECT id FROM ranking_snapshots
  WHERE is_published = true
  ORDER BY snapshot_date DESC
  LIMIT 1
)
ORDER BY age_category, ranking_position
LIMIT 10;
