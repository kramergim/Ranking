-- =====================================================
-- DIAGNOSTIC QUERIES - Pour identifier le problème
-- =====================================================

-- QUERY 1: Vérifier si les colonnes existent dans ranking_snapshot_data
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ranking_snapshot_data'
AND column_name IN ('current_year_points', 'last_year_pts', 'athlete_photo_url', 'athlete_hub_level')
ORDER BY column_name;

-- RÉSULTAT ATTENDU: 4 lignes (current_year_points, last_year_pts, athlete_photo_url, athlete_hub_level)
-- Si moins de 4 lignes → Les colonnes n'ont pas été créées


-- QUERY 2: Vérifier les données dans le snapshot publié actuel
SELECT
  snapshot_id,
  athlete_name,
  total_points,
  current_year_points,
  last_year_pts,
  athlete_photo_url,
  athlete_hub_level
FROM ranking_snapshot_data
WHERE snapshot_id IN (
  SELECT id FROM ranking_snapshots
  WHERE is_published = true
  ORDER BY snapshot_date DESC
  LIMIT 1
)
ORDER BY ranking_position
LIMIT 5;

-- RÉSULTAT ATTENDU: 5 athlètes avec leurs points
-- Si current_year_points et last_year_pts sont NULL/0 → Le snapshot a été créé avant la migration


-- QUERY 3: Vérifier ce que ranking_live calcule
SELECT
  athlete_id,
  athlete_name,
  total_points,
  current_year_points,
  last_year_pts,
  photo_url,
  hub_level
FROM ranking_live
WHERE age_category IS NOT NULL
ORDER BY total_points DESC
LIMIT 5;

-- RÉSULTAT ATTENDU: 5 athlètes avec current_year_points > 0
-- Si current_year_points = 0 pour tous → Le calcul dans ranking_live est incorrect


-- QUERY 4: Vérifier ce que public_athlete_results retourne
SELECT
  athlete_id,
  athlete_name,
  total_points,
  current_year_points,
  last_year_pts,
  photo_url,
  hub_level
FROM public_athlete_results
WHERE snapshot_id IN (
  SELECT id FROM ranking_snapshots
  WHERE is_published = true
  ORDER BY snapshot_date DESC
  LIMIT 1
)
GROUP BY athlete_id, athlete_name, total_points, current_year_points, last_year_pts, photo_url, hub_level
ORDER BY total_points DESC
LIMIT 5;

-- RÉSULTAT ATTENDU: 5 athlètes avec leurs points
-- Si cette requête échoue → La vue n'a pas été mise à jour


-- QUERY 5: Vérifier les résultats par année pour un athlète spécifique
SELECT
  a.first_name || ' ' || a.last_name as athlete_name,
  e.event_date,
  EXTRACT(YEAR FROM e.event_date) as year,
  r.points_earned,
  CASE
    WHEN EXTRACT(YEAR FROM e.event_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN 'Current Year'
    WHEN EXTRACT(YEAR FROM e.event_date) = EXTRACT(YEAR FROM CURRENT_DATE) - 1 THEN 'Last Year'
    ELSE 'Older'
  END as year_category
FROM results r
JOIN athletes a ON a.id = r.athlete_id
JOIN events e ON e.id = r.event_id
WHERE r.points_earned IS NOT NULL
  AND r.points_earned > 0
ORDER BY a.last_name, e.event_date DESC
LIMIT 20;

-- RÉSULTAT ATTENDU: Voir des résultats avec différentes années
-- Cela permet de vérifier si des points existent pour l'année en cours et l'année passée
