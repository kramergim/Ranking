# Guide d'installation des nouvelles règles de calcul des points

## Résumé des changements

### 1️⃣ Nouvelles règles de calcul par coefficient

- **Coefficient 1**: 1er=5pts, 2e=3pts, 3e=1pt, ❌ pas de bonus victoire
- **Coefficient 2**: 1er=10pts, 2e=6pts, 3e=3pts, +1pt par victoire
- **Coefficient 3**: 1er=20pts, 2e=12pts, 3e=6pts, +2pts par victoire
- **Coefficient 4**: 1er=30pts, 2e=18pts, 3e=10pts, +3pts par victoire
- **Coefficient 5**: 1er=40pts, 2e=34pts, 3e=26pts, +5pts par victoire

### 2️⃣ Condition obligatoire sur les médailles

⚠️ Une médaille (1er/2e/3e place) ne compte **que si l'athlète a gagné minimum 2 matchs**.

- Si `final_rank ∈ (1,2,3)` ET `matches_won < 2` → points de podium = 0
- Les points par victoire restent comptabilisés
- Cette règle est expliquée dans `calculation_explanation`

### 3️⃣ Ajout du champ "Last Year Pts"

- Nouveau champ: `athletes.last_year_pts` (DECIMAL, default 0)
- Représente les points reportés de l'année précédente
- Ajoutés au total du ranking
- Inclus dans les vues et snapshots

**Formule finale:** `total_points = SUM(results.points_earned) + athletes.last_year_pts`

---

## Instructions d'installation

### ⚠️ IMPORTANT: Exécutez les scripts dans l'ordre indiqué ci-dessous

Ouvrez le **SQL Editor** de Supabase et exécutez les scripts suivants **dans cet ordre précis**:

### Étape 1: Mettre à jour la fonction de calcul des points

```bash
Fichier: new_points_calculation.sql
```

Ce script va:
- Supprimer l'ancienne fonction `calculate_result_points()`
- Créer la nouvelle fonction avec les règles par coefficient
- Appliquer la condition des 2 victoires minimum pour les médailles
- Générer des explications de calcul automatiques

### Étape 2: Ajouter le champ last_year_pts aux athlètes

```bash
Fichier: add_last_year_pts.sql
```

Ce script va:
- Ajouter la colonne `last_year_pts` à la table `athletes`
- Définir la valeur par défaut à 0

### Étape 3: Mettre à jour la table ranking_snapshot_data

```bash
Fichier: update_snapshot_data_table.sql
```

Ce script va:
- Ajouter les colonnes `current_year_points` et `last_year_pts` à `ranking_snapshot_data`
- Initialiser les valeurs existantes

### Étape 4: Mettre à jour les vues de ranking

```bash
Fichier: update_ranking_views.sql
```

Ce script va:
- Recréer `ranking_live` avec `last_year_pts` et `current_year_points`
- Recréer `ranking_by_category` avec les mêmes champs
- Recréer `public_snapshots_list` et `public_rankings`
- Le calcul devient: `total_points = current_year_points + last_year_pts`

### Étape 5: Mettre à jour la fonction generate_ranking_snapshot

```bash
Fichier: update_generate_ranking_snapshot.sql
```

Ce script va:
- Mettre à jour la fonction pour inclure `last_year_pts` dans les snapshots
- Inclure `current_year_points` séparément

### Étape 6: Recalculer tous les points existants

```bash
Fichier: recalculate_all_points.sql
```

Ce script va:
- Recalculer les points pour TOUS les résultats existants
- Appliquer les nouvelles règles de calcul
- Afficher un résumé des points mis à jour

---

## Vérification

Après avoir exécuté tous les scripts, vérifiez:

1. **Points recalculés**: Consultez la table `results` pour voir les nouveaux points et explications
2. **Vues mises à jour**:
   ```sql
   SELECT * FROM ranking_live LIMIT 5;
   SELECT * FROM ranking_by_category LIMIT 5;
   ```
3. **Champ last_year_pts**:
   ```sql
   SELECT first_name, last_name, last_year_pts FROM athletes LIMIT 5;
   ```

## Utilisation frontend

Les formulaires d'athlètes (création et édition) ont été mis à jour avec un nouveau champ:

- **"Points année précédente"**: Pour saisir les points reportés de l'année précédente
- Valeur par défaut: 0
- Accepte des décimales (ex: 125.5)

## Impact sur les rankings

Les rankings affichent maintenant:
- **Points année en cours**: Somme des points gagnés cette année
- **Points année précédente**: Points reportés
- **Total**: Somme des deux

Cette information sera visible dans:
- Les vues live du ranking
- Les snapshots publiés
- L'interface publique

---

## Support

Si vous rencontrez des erreurs lors de l'exécution:
1. Vérifiez l'ordre d'exécution des scripts
2. Consultez les messages d'erreur dans le SQL Editor
3. Vérifiez que toutes les tables existent avant d'exécuter les scripts
