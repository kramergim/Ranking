-- =====================================================
-- SWISS TAEKWONDO - VUES SQL
-- =====================================================
-- Vues pour ranking live, snapshots publics, sélections
-- =====================================================

-- =====================================================
-- 1. RANKING LIVE (ADMIN/SELECTOR UNIQUEMENT)
-- =====================================================

CREATE OR REPLACE VIEW ranking_live AS
SELECT
  a.id AS athlete_id,
  a.first_name,
  a.last_name,
  a.first_name || ' ' || a.last_name AS full_name,
  a.date_of_birth,
  a.gender,
  a.age_category,
  a.weight_category,
  a.club,
  a.license_number,

  -- Calcul des points totaux
  COALESCE(SUM(r.points_earned), 0) AS total_points,

  -- Nombre de tournois
  COUNT(DISTINCT r.event_id) AS tournaments_count,

  -- Meilleur résultat (rang le plus bas = meilleur)
  MIN(r.final_rank) AS best_rank,

  -- Nom du meilleur résultat
  (
    SELECT e.name
    FROM results r2
    JOIN events e ON e.id = r2.event_id
    WHERE r2.athlete_id = a.id AND r2.final_rank = MIN(r.final_rank)
    LIMIT 1
  ) AS best_result_event,

  -- Nombre de médailles (1er, 2e, 3e)
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 1) AS gold_medals,
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 2) AS silver_medals,
  COUNT(DISTINCT r.id) FILTER (WHERE r.final_rank = 3) AS bronze_medals,

  -- Total matchs gagnés
  COALESCE(SUM(r.matches_won), 0) AS total_matches_won,

  -- Dernière participation
  MAX(e.event_date) AS last_event_date,

  -- Rang calculé (global)
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(SUM(r.points_earned), 0) DESC, a.last_name, a.first_name
  ) AS rank_position

FROM athletes a
LEFT JOIN results r ON r.athlete_id = a.id AND r.points_earned IS NOT NULL
LEFT JOIN events e ON e.id = r.event_id
WHERE a.is_active = true
GROUP BY
  a.id, a.first_name, a.last_name, a.date_of_birth, a.gender,
  a.age_category, a.weight_category, a.club, a.license_number
ORDER BY rank_position;

COMMENT ON VIEW ranking_live IS 'Ranking en temps réel (admin/selector uniquement). RLS: pas accessible au public.';

-- =====================================================
-- 2. DÉTAILS RANKING PAR ATHLÈTE (ADMIN/SELECTOR)
-- =====================================================

CREATE OR REPLACE VIEW athlete_ranking_details AS
SELECT
  a.id AS athlete_id,
  a.first_name || ' ' || a.last_name AS athlete_name,
  a.age_category,
  a.weight_category,
  a.club,

  e.id AS event_id,
  e.name AS event_name,
  e.event_date,
  e.event_type,
  e.level,
  e.coefficient,
  e.year AS event_year,

  r.id AS result_id,
  r.age_category AS competition_age_category,
  r.weight_category AS competition_weight_category,
  r.final_rank,
  r.matches_won,
  r.points_earned,
  r.calculation_explanation,

  sr.version_name AS scoring_rule_version

FROM athletes a
JOIN results r ON r.athlete_id = a.id
JOIN events e ON e.id = r.event_id
LEFT JOIN scoring_rules sr ON sr.id = r.scoring_rule_id
WHERE a.is_active = true
ORDER BY a.last_name, a.first_name, e.event_date DESC;

COMMENT ON VIEW athlete_ranking_details IS 'Détails complets par athlète (tous les résultats). Admin/selector uniquement.';

-- =====================================================
-- 3. VUE PUBLIQUE: RANKINGS PUBLIÉS (SNAPSHOTS)
-- =====================================================

CREATE OR REPLACE VIEW public_rankings AS
SELECT
  rs.id AS snapshot_id,
  rs.snapshot_year AS year,
  rs.snapshot_month AS month,
  rs.snapshot_date,
  rs.title,
  rs.description,
  rs.published_at,
  rs.pdf_url,

  rsd.athlete_id,
  rsd.athlete_name,
  rsd.athlete_age_category,
  rsd.athlete_weight_category,
  rsd.athlete_gender,
  rsd.athlete_club,

  rsd.rank_position,
  rsd.total_points,
  rsd.tournaments_count,
  rsd.best_result_rank,
  rsd.best_result_event

FROM ranking_snapshots rs
JOIN ranking_snapshot_data rsd ON rsd.snapshot_id = rs.id
WHERE rs.is_published = true
ORDER BY rs.snapshot_date DESC, rsd.rank_position;

COMMENT ON VIEW public_rankings IS 'Rankings mensuels publiés (accessible au public via RLS)';

-- =====================================================
-- 4. VUE PUBLIQUE: SÉLECTIONS PUBLIÉES
-- =====================================================

CREATE OR REPLACE VIEW public_selections AS
SELECT
  se.id AS selection_event_id,
  se.name AS selection_name,
  se.event_date,
  se.location,
  se.announcement_date,
  se.description,
  se.published_at,

  a.id AS athlete_id,
  a.first_name || ' ' || a.last_name AS athlete_name,
  a.age_category,
  a.weight_category,
  a.club,
  a.gender,

  sd.status, -- 'selected', 'reserve', etc.
  sd.decided_at

  -- IMPORTANT: notes et test_match_result sont EXCLUS (données internes)

FROM selection_events se
JOIN selection_decisions sd ON sd.selection_event_id = se.id
JOIN athletes a ON a.id = sd.athlete_id
WHERE se.is_published = true
ORDER BY se.event_date DESC, sd.status, a.last_name, a.first_name;

COMMENT ON VIEW public_selections IS 'Décisions finales de sélection publiées (accessible au public). Notes internes exclues.';

-- =====================================================
-- 5. VUE INTERNE: ÉLIGIBILITÉ PAR SÉLECTION (ADMIN/SELECTOR)
-- =====================================================

CREATE OR REPLACE VIEW selection_eligibility_summary AS
SELECT
  se.id AS selection_event_id,
  se.name AS selection_name,
  se.event_date,
  se.selection_deadline,
  se.status AS selection_status,

  ea.athlete_id,
  a.first_name || ' ' || a.last_name AS athlete_name,
  a.age_category,
  a.weight_category,
  a.club,
  a.gender,

  ea.is_eligible,
  ea.total_points,
  ea.rank_position,
  ea.eligibility_details, -- JSONB avec détails par critère
  ea.evaluated_at,

  sd.status AS decision_status,
  sd.notes AS decision_notes,
  sd.test_match_result,
  sd.decided_at

FROM selection_events se
LEFT JOIN eligible_athletes ea ON ea.selection_event_id = se.id
LEFT JOIN athletes a ON a.id = ea.athlete_id
LEFT JOIN selection_decisions sd ON sd.selection_event_id = se.id AND sd.athlete_id = ea.athlete_id
ORDER BY se.selection_deadline DESC, ea.rank_position NULLS LAST;

COMMENT ON VIEW selection_eligibility_summary IS 'Synthèse éligibilité et décisions par sélection (admin/selector uniquement)';

-- =====================================================
-- 6. VUE: STATISTIQUES GLOBALES (ADMIN/SELECTOR)
-- =====================================================

CREATE OR REPLACE VIEW global_statistics AS
SELECT
  -- Athlètes
  (SELECT COUNT(*) FROM athletes WHERE is_active = true) AS active_athletes_count,
  (SELECT COUNT(*) FROM athletes WHERE is_active = false) AS inactive_athletes_count,

  -- Événements
  (SELECT COUNT(*) FROM events) AS total_events_count,
  (SELECT COUNT(*) FROM events WHERE is_published = true) AS published_events_count,
  (SELECT COUNT(*) FROM events WHERE event_date >= CURRENT_DATE) AS upcoming_events_count,

  -- Résultats
  (SELECT COUNT(*) FROM results) AS total_results_count,
  (SELECT COUNT(*) FROM results WHERE points_earned IS NULL) AS results_pending_calculation,

  -- Snapshots
  (SELECT COUNT(*) FROM ranking_snapshots WHERE is_published = true) AS published_snapshots_count,
  (SELECT COUNT(*) FROM ranking_snapshots WHERE is_published = false) AS draft_snapshots_count,

  -- Sélections
  (SELECT COUNT(*) FROM selection_events WHERE is_published = true) AS published_selections_count,
  (SELECT COUNT(*) FROM selection_events WHERE status = 'in_progress') AS active_selections_count,

  -- Dernière mise à jour
  (SELECT MAX(created_at) FROM results) AS last_result_added_at,
  (SELECT MAX(published_at) FROM ranking_snapshots WHERE is_published = true) AS last_snapshot_published_at;

COMMENT ON VIEW global_statistics IS 'Statistiques globales pour dashboard admin/selector';

-- =====================================================
-- 7. VUE: TOP RANKINGS PAR CATÉGORIE (ADMIN/SELECTOR)
-- =====================================================

CREATE OR REPLACE VIEW ranking_by_category AS
SELECT
  a.age_category,
  a.weight_category,
  a.gender,

  a.id AS athlete_id,
  a.first_name || ' ' || a.last_name AS athlete_name,
  a.club,

  COALESCE(SUM(r.points_earned), 0) AS total_points,
  COUNT(DISTINCT r.event_id) AS tournaments_count,

  -- Rang par catégorie
  ROW_NUMBER() OVER (
    PARTITION BY a.age_category, a.weight_category, a.gender
    ORDER BY COALESCE(SUM(r.points_earned), 0) DESC, a.last_name, a.first_name
  ) AS rank_in_category

FROM athletes a
LEFT JOIN results r ON r.athlete_id = a.id AND r.points_earned IS NOT NULL
WHERE a.is_active = true
  AND a.age_category IS NOT NULL
  AND a.weight_category IS NOT NULL
GROUP BY
  a.id, a.first_name, a.last_name, a.age_category, a.weight_category, a.gender, a.club
ORDER BY a.age_category, a.weight_category, a.gender, rank_in_category;

COMMENT ON VIEW ranking_by_category IS 'Ranking segmenté par catégorie (âge/poids/genre). Admin/selector uniquement.';

-- =====================================================
-- 8. VUE PUBLIQUE: LISTE DES SNAPSHOTS DISPONIBLES
-- =====================================================

CREATE OR REPLACE VIEW public_snapshots_list AS
SELECT
  rs.id AS snapshot_id,
  rs.snapshot_year AS year,
  rs.snapshot_month AS month,
  rs.snapshot_date,
  rs.title,
  rs.description,
  rs.published_at,
  rs.pdf_url,

  -- Statistiques du snapshot
  COUNT(rsd.id) AS athletes_count,
  MAX(rsd.total_points) AS max_points,
  MIN(rsd.total_points) AS min_points

FROM ranking_snapshots rs
LEFT JOIN ranking_snapshot_data rsd ON rsd.snapshot_id = rs.id
WHERE rs.is_published = true
GROUP BY rs.id, rs.snapshot_year, rs.snapshot_month, rs.snapshot_date, rs.title, rs.description, rs.published_at, rs.pdf_url
ORDER BY rs.snapshot_date DESC;

COMMENT ON VIEW public_snapshots_list IS 'Liste des snapshots publiés avec statistiques (accessible au public)';

-- =====================================================
-- 9. VUE PUBLIQUE: LISTE DES SÉLECTIONS PUBLIÉES
-- =====================================================

CREATE OR REPLACE VIEW public_selections_list AS
SELECT
  se.id AS selection_event_id,
  se.name AS selection_name,
  se.event_date,
  se.location,
  se.announcement_date,
  se.description,
  se.published_at,

  -- Statistiques
  COUNT(sd.id) FILTER (WHERE sd.status = 'selected') AS selected_count,
  COUNT(sd.id) FILTER (WHERE sd.status = 'reserve') AS reserve_count,
  COUNT(sd.id) AS total_decisions_count

FROM selection_events se
LEFT JOIN selection_decisions sd ON sd.selection_event_id = se.id
WHERE se.is_published = true
GROUP BY se.id, se.name, se.event_date, se.location, se.announcement_date, se.description, se.published_at
ORDER BY se.event_date DESC;

COMMENT ON VIEW public_selections_list IS 'Liste des sélections publiées avec statistiques (accessible au public)';

-- =====================================================
-- FIN DES VUES
-- =====================================================
