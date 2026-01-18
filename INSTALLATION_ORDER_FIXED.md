# Ordre d'exécution corrigé des scripts SQL

## ⚠️ IMPORTANT: Exécutez dans CET ORDRE EXACT

### Étape 1: Nouvelle fonction de calcul des points
```bash
Fichier: new_points_calculation.sql
```

### Étape 2: Ajouter last_year_pts aux athlètes
```bash
Fichier: add_last_year_pts.sql
```

### Étape 3A: Corriger la structure de ranking_snapshot_data
```bash
Fichier: fix_snapshot_data_structure.sql
```
⚠️ **NOUVEAU SCRIPT** - À exécuter AVANT update_ranking_views.sql

### Étape 3B: Mettre à jour la table ranking_snapshot_data (optionnel si déjà fait)
```bash
Fichier: update_snapshot_data_table.sql
```

### Étape 4: Mettre à jour les vues de ranking
```bash
Fichier: update_ranking_views.sql
```

### Étape 5: Mettre à jour la fonction generate_ranking_snapshot
```bash
Fichier: update_generate_ranking_snapshot.sql
```

### Étape 6: Recalculer tous les points existants
```bash
Fichier: recalculate_all_points.sql
```

---

## Si vous avez déjà une erreur à l'étape 4:

1. Exécutez d'abord: `fix_snapshot_data_structure.sql`
2. Puis réexécutez: `update_ranking_views.sql`
