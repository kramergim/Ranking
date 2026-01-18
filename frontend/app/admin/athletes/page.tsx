import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus, Upload } from 'lucide-react';
import AthletesTable from './AthletesTable';

export default async function AthletesPage() {
  const supabase = createClient();

  const { data: athletes, error } = await supabase
    .from('athletes')
    .select('*')
    .order('last_name', { ascending: true });

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Athlètes</h1>
        <p className="text-red-600">Erreur lors du chargement des athlètes.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Athlètes</h1>
        <div className="flex space-x-3">
          <Link
            href="/admin/athletes/upload"
            className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition"
          >
            <Upload className="w-5 h-5 mr-2" />
            Import en masse
          </Link>
          <Link
            href="/admin/athletes/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouvel athlète
          </Link>
        </div>
      </div>

      {!athletes || athletes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">Aucun athlète enregistré</p>
          <Link
            href="/admin/athletes/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Ajouter le premier athlète
          </Link>
        </div>
      ) : (
        <AthletesTable athletes={athletes} />
      )}
    </div>
  );
}
