# Swiss Taekwondo - Guide d'implémentation

## Vue d'ensemble

Ce guide détaille l'ordre de déploiement et les prochaines étapes pour implémenter le système de ranking et sélection.

---

## 1. Prérequis

### Compte Supabase
1. Créer un projet Supabase sur https://app.supabase.com
2. Noter les credentials :
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Outils locaux
```bash
# Installer Supabase CLI
npm install -g supabase

# Vérifier installation
supabase --version

# Se connecter
supabase login
```

---

## 2. Initialisation du projet Supabase

### Étape 1: Lier le projet local
```bash
cd C:\Users\krasn\ranking

# Lier au projet Supabase
supabase link --project-ref YOUR_PROJECT_REF

# Initialiser la structure
supabase init
```

### Étape 2: Structure des fichiers
```
ranking/
├── supabase/
│   ├── migrations/
│   │   ├── 00000000000001_schema.sql
│   │   ├── 00000000000002_rls-policies.sql
│   │   ├── 00000000000003_views.sql
│   │   └── 00000000000004_functions.sql
│   ├── functions/
│   │   ├── calculate-points/
│   │   ├── publish-ranking-snapshot/
│   │   ├── generate-snapshot-data/
│   │   ├── evaluate-eligibility/
│   │   ├── publish-selection/
│   │   └── _shared/
│   └── config.toml
├── ARCHITECTURE.md
├── IMPLEMENTATION-GUIDE.md
└── README.md
```

---

## 3. Déploiement de la base de données

### Étape 1: Créer les migrations

```bash
# Migration 1: Schéma de base
supabase migration new schema
# Copier le contenu de supabase/schema.sql

# Migration 2: RLS policies
supabase migration new rls_policies
# Copier le contenu de supabase/rls-policies.sql

# Migration 3: Vues
supabase migration new views
# Copier le contenu de supabase/views.sql

# Migration 4: Fonctions SQL
supabase migration new functions
# Copier le contenu de supabase/functions.sql
```

### Étape 2: Appliquer les migrations

```bash
# Développement local (avec Docker)
supabase start
supabase db push

# Production (Supabase cloud)
supabase db push --linked
```

### Étape 3: Vérifier le déploiement

```bash
# Se connecter à la DB
supabase db reset

# Vérifier tables
psql postgresql://postgres:postgres@localhost:54322/postgres
\dt

# Vérifier RLS
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

# Vérifier vues
\dv
```

---

## 4. Configuration du Storage (PDFs)

### Créer le bucket pour les PDFs

```sql
-- Via Supabase Dashboard > Storage > Create bucket
-- OU via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-documents', 'public-documents', true);

-- Policies pour le bucket
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public-documents');

CREATE POLICY "Admin/Selector upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public-documents'
  AND (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) IN ('admin', 'selector')
);
```

---

## 5. Seed data initial

### Créer profils admin et selector

```sql
-- 1. Créer utilisateurs dans Supabase Dashboard > Authentication
-- Email: admin@swisstk.ch, mot de passe temporaire
-- Email: selector@swisstk.ch, mot de passe temporaire

-- 2. Créer profils (remplacer les UUIDs par les vrais IDs)
INSERT INTO profiles (id, email, role, full_name)
VALUES
  ('UUID_FROM_AUTH_USERS', 'admin@swisstk.ch', 'admin', 'Admin Swiss TKD'),
  ('UUID_FROM_AUTH_USERS', 'selector@swisstk.ch', 'selector', 'Selector Swiss TKD');

-- 3. Créer règle de calcul par défaut
SELECT seed_initial_data();
```

### Créer données de test (optionnel)

```sql
-- Quelques athlètes de test
INSERT INTO athletes (first_name, last_name, date_of_birth, gender, age_category, weight_category, club, is_active)
VALUES
  ('Jean', 'Dupont', '2005-03-15', 'M', 'Juniors', '-68kg', 'Geneva TKD', true),
  ('Marie', 'Martin', '2006-07-22', 'F', 'Juniors', '-55kg', 'Lausanne TKD', true),
  ('Pierre', 'Bernard', '2004-11-08', 'M', 'Juniors', '-73kg', 'Zurich TKD', true);

-- Événement de test
INSERT INTO events (name, event_date, year, event_type, level, coefficient)
VALUES
  ('Open de Genève 2024', '2024-10-15', 2024, 'National', 'Open', 1.0),
  ('Swiss Championships 2024', '2024-11-20', 2024, 'National', 'Championship', 1.5);
```

---

## 6. Déploiement des Edge Functions

### Étape 1: Créer la structure

```bash
cd supabase/functions

# Créer chaque fonction
supabase functions new calculate-points
supabase functions new publish-ranking-snapshot
supabase functions new generate-snapshot-data
supabase functions new evaluate-eligibility
supabase functions new publish-selection
```

### Étape 2: Implémenter les fonctions

Référence : `edge-functions-plan.md`

**Exemple pour `calculate-points/index.ts`** :

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // Auth
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    // Récupérer rôle
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!['admin', 'selector'].includes(profile?.role)) {
      throw new Error('Accès refusé');
    }

    // Body
    const { result_id, scoring_rule_id } = await req.json();

    // TODO: Implémenter logique de calcul (voir edge-functions-plan.md)

    return new Response(
      JSON.stringify({ success: true, result_id }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### Étape 3: Déployer les fonctions

```bash
# Déployer toutes les fonctions
supabase functions deploy calculate-points
supabase functions deploy publish-ranking-snapshot
supabase functions deploy generate-snapshot-data
supabase functions deploy evaluate-eligibility
supabase functions deploy publish-selection

# Vérifier déploiement
supabase functions list
```

### Étape 4: Tester les fonctions

```bash
# Test local
supabase functions serve calculate-points

# Test production
curl -i --location --request POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/calculate-points' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"result_id":"123-456-789"}'
```

---

## 7. Frontend (Application mobile PWA)

### Stack recommandé
- **Framework** : React 18 + TypeScript + Vite
- **UI** : TailwindCSS + shadcn/ui
- **State** : TanStack Query (React Query)
- **Routing** : React Router v6
- **Forms** : React Hook Form + Zod
- **Tables** : TanStack Table

### Initialisation

```bash
# Créer projet React
npm create vite@latest frontend -- --template react-ts
cd frontend

# Installer dépendances
npm install @supabase/supabase-js
npm install @tanstack/react-query
npm install react-router-dom
npm install react-hook-form zod @hookform/resolvers
npm install @tanstack/react-table
npm install tailwindcss postcss autoprefixer
npm install -D @types/node

# Initialiser Tailwind
npx tailwindcss init -p
```

### Configuration Supabase client

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Structure de base

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Pages publiques
import HomePage from './pages/public/HomePage';
import RankingsPage from './pages/public/RankingsPage';
import RankingDetailPage from './pages/public/RankingDetailPage';
import SelectionsPage from './pages/public/SelectionsPage';

// Pages admin
import DashboardPage from './pages/admin/DashboardPage';
import AthletesPage from './pages/admin/AthletesPage';
import EventsPage from './pages/admin/EventsPage';
import ResultsPage from './pages/admin/ResultsPage';
import RankingLivePage from './pages/admin/RankingLivePage';
import SnapshotsPage from './pages/admin/SnapshotsPage';
import SelectionsManagementPage from './pages/admin/SelectionsManagementPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/rankings/:year/:month" element={<RankingDetailPage />} />
          <Route path="/selections" element={<SelectionsPage />} />

          {/* Admin/Selector */}
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/athletes" element={<AthletesPage />} />
          <Route path="/admin/events" element={<EventsPage />} />
          <Route path="/admin/results" element={<ResultsPage />} />
          <Route path="/admin/ranking-live" element={<RankingLivePage />} />
          <Route path="/admin/snapshots" element={<SnapshotsPage />} />
          <Route path="/admin/selections" element={<SelectionsManagementPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

### Exemple de hook pour ranking live

```typescript
// src/hooks/useRankingLive.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRankingLive() {
  return useQuery({
    queryKey: ['ranking-live'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ranking_live')
        .select('*')
        .order('rank_position', { ascending: true });

      if (error) throw error;
      return data;
    }
  });
}
```

---

## 8. PWA Configuration

### Manifest.json

```json
{
  "name": "Swiss Taekwondo Ranking",
  "short_name": "Swiss TKD",
  "description": "Système de ranking et sélection Swiss Taekwondo",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1e40af",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker (avec Vite PWA)

```bash
npm install -D vite-plugin-pwa
```

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Swiss Taekwondo Ranking',
        short_name: 'Swiss TKD',
        theme_color: '#1e40af',
      }
    })
  ]
});
```

---

## 9. Checklist de déploiement

### Backend (Supabase)
- [ ] Projet Supabase créé
- [ ] Migrations SQL appliquées (schema, RLS, vues, fonctions)
- [ ] Storage bucket `public-documents` créé avec policies
- [ ] Profils admin/selector créés
- [ ] Règle de calcul v1.0 créée (seed_initial_data)
- [ ] Edge Functions déployées et testées
- [ ] Variables d'environnement configurées

### Frontend
- [ ] Projet React + TypeScript initialisé
- [ ] Supabase client configuré
- [ ] Routing configuré (routes publiques + admin)
- [ ] Authentification implémentée
- [ ] Pages principales créées (15 écrans minimum)
- [ ] PWA configurée (manifest + service worker)
- [ ] Tests end-to-end (Playwright)

### Sécurité
- [ ] RLS activée sur toutes les tables
- [ ] Policies testées pour les 3 rôles (admin, selector, public)
- [ ] Edge Functions protégées (auth + rôles)
- [ ] Triggers audit actifs
- [ ] Snapshots immuables après publication

### Tests
- [ ] Flux utilisateur 1: Saisie résultat → Calcul points → Ranking live
- [ ] Flux utilisateur 2: Génération snapshot → Publication → Affichage public
- [ ] Flux utilisateur 3: Création sélection → Évaluation éligibilité → Publication
- [ ] Tests de performance (>1000 athlètes, >10000 résultats)
- [ ] Tests d'intégrité des données (check_data_integrity)

---

## 10. Prochaines étapes

### Phase 1: MVP (4-6 semaines)
1. **Semaine 1-2** : Déploiement backend (DB + Edge Functions)
2. **Semaine 2-3** : Frontend core (auth, layout, navigation)
3. **Semaine 3-4** : Pages admin (athlètes, événements, résultats)
4. **Semaine 4-5** : Ranking live + snapshots mensuels
5. **Semaine 5-6** : Sélections + pages publiques
6. **Semaine 6** : Tests + déploiement production

### Phase 2: Améliorations (post-MVP)
- Notifications push (athlètes sélectionnés)
- Statistiques avancées (graphiques évolution)
- Import/Export CSV
- Multi-langue (FR/DE/IT/EN)
- Mobile app native (React Native)
- API publique pour intégrations

---

## 11. Support et documentation

### Documentation
- `ARCHITECTURE.md` : Vue d'ensemble architecture
- `edge-functions-plan.md` : Détails Edge Functions
- `IMPLEMENTATION-GUIDE.md` : Ce guide

### Ressources Supabase
- Docs : https://supabase.com/docs
- Dashboard : https://app.supabase.com
- Discord : https://discord.supabase.com

### Contact projet
- Admin : admin@swisstk.ch
- Support technique : [À définir]

---

## 12. Commandes utiles

### Développement local

```bash
# Démarrer Supabase local
supabase start

# Appliquer migrations
supabase db reset

# Démarrer frontend
cd frontend && npm run dev

# Servir Edge Functions localement
supabase functions serve

# Arrêter Supabase local
supabase stop
```

### Production

```bash
# Push migrations vers production
supabase db push --linked

# Déployer Edge Functions
supabase functions deploy <function-name>

# Déployer frontend (Vercel/Netlify)
npm run build
vercel deploy --prod
```

### Maintenance

```bash
# Vérifier intégrité données
psql -c "SELECT * FROM check_data_integrity();"

# Backup database
supabase db dump -f backup.sql

# Logs Edge Functions
supabase functions logs calculate-points --tail
```

---

## Conclusion

Ce guide fournit une roadmap complète pour implémenter le système Swiss Taekwondo.

**Points clés** :
- Architecture solide et évolutive
- Séparation stricte données internes/publiques (RLS)
- Calcul transparent et auditable
- PWA mobile-friendly

**Prochaine étape** : Déployer le backend (migrations SQL) puis implémenter les Edge Functions.

Bonne chance ! 🥋
