import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus } from 'lucide-react';
import SelectionsTable from './SelectionsTable';

export default async function AdminSelectionsPage() {
  const supabase = createClient();

  const { data: selections, error } = await supabase
    .from('selection_events')
    .select('*')
    .order('event_date', { ascending: false });

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Sélections</h1>
        <p className="text-red-600">Erreur lors du chargement des sélections.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Sélections</h1>
        <Link
          href="/admin/selections/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouvelle sélection
        </Link>
      </div>

      {!selections || selections.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">Aucune sélection créée</p>
          <Link
            href="/admin/selections/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Créer la première sélection
          </Link>
        </div>
      ) : (
        <SelectionsTable selections={selections} />
      )}
    </div>
  );
}
