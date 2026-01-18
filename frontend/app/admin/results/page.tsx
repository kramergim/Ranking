import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus } from 'lucide-react';
import ResultsTable from './ResultsTable';

export default async function ResultsPage() {
  const supabase = createClient();

  const { data: results, error } = await supabase
    .from('results')
    .select(`
      *,
      athletes (first_name, last_name),
      events (name, event_date)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Résultats</h1>
        <p className="text-red-600">Erreur lors du chargement des résultats.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Résultats</h1>
        <Link
          href="/admin/results/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouveau résultat
        </Link>
      </div>

      {!results || results.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">Aucun résultat enregistré</p>
          <Link
            href="/admin/results/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Ajouter le premier résultat
          </Link>
        </div>
      ) : (
        <ResultsTable results={results} />
      )}
    </div>
  );
}
