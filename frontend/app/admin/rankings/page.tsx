import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus } from 'lucide-react';
import RankingsTable from './RankingsTable';

export default async function AdminRankingsPage() {
  const supabase = createClient();

  const { data: snapshots, error } = await supabase
    .from('ranking_snapshots')
    .select('*, ranking_snapshot_data(count)')
    .order('snapshot_date', { ascending: false });

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Rankings</h1>
        <p className="text-red-600">Erreur lors du chargement des snapshots.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Rankings</h1>
        <Link
          href="/admin/rankings/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouveau snapshot
        </Link>
      </div>

      {!snapshots || snapshots.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">Aucun snapshot créé</p>
          <Link
            href="/admin/rankings/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Créer le premier snapshot
          </Link>
        </div>
      ) : (
        <RankingsTable snapshots={snapshots} />
      )}
    </div>
  );
}
