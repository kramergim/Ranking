'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, FileCheck, Trash2 } from 'lucide-react';

interface PageProps {
  params: {
    id: string;
  };
}

export default function ViewSnapshotPage({ params }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [rankings, setRankings] = useState<any[]>([]);

  useEffect(() => {
    loadSnapshot();
  }, []);

  const loadSnapshot = async () => {
    try {
      const [snapshotRes, rankingsRes] = await Promise.all([
        supabase.from('ranking_snapshots').select('*').eq('id', params.id).single(),
        supabase
          .from('ranking_snapshot_data')
          .select('*')
          .eq('snapshot_id', params.id)
          .order('ranking_position'),
      ]);

      if (snapshotRes.error) throw snapshotRes.error;
      if (rankingsRes.error) throw rankingsRes.error;

      setSnapshot(snapshotRes.data);
      setRankings(rankingsRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Publier ce snapshot ? Il sera visible par le public.')) return;

    try {
      const { error: updateError } = await supabase
        .from('ranking_snapshots')
        .update({ is_published: true, published_at: new Date().toISOString() })
        .eq('id', params.id);

      if (updateError) throw updateError;

      loadSnapshot();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce snapshot ?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('ranking_snapshots')
        .delete()
        .eq('id', params.id);

      if (deleteError) throw deleteError;

      router.push('/admin/rankings');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  if (!snapshot) {
    return <div className="text-center py-8 text-red-600">Snapshot non trouvé</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/rankings"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la liste
        </Link>
        <div className="flex justify-between items-center mt-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Snapshot du {new Date(snapshot.snapshot_date).toLocaleDateString('fr-CH')}
            </h1>
            <p className="text-gray-600 mt-1">
              {snapshot.snapshot_month}/{snapshot.snapshot_year} - {rankings.length} athlètes
            </p>
          </div>
          <div className="flex space-x-2">
            {!snapshot.is_published && (
              <button
                onClick={handlePublish}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <FileCheck className="w-4 h-4 mr-2" />
                Publier
              </button>
            )}
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Informations</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">Statut</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  snapshot.is_published
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {snapshot.is_published ? 'Publié' : 'Brouillon'}
              </span>
            </dd>
          </div>
          {snapshot.title && (
            <div>
              <dt className="text-sm text-gray-500">Titre</dt>
              <dd className="mt-1 text-sm text-gray-900">{snapshot.title}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Rankings</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rang
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Athlète
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Catégories
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Points
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rankings.map((ranking) => (
              <tr key={ranking.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {ranking.rank_position}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {ranking.athlete_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {ranking.athlete_age_category} / {ranking.athlete_weight_category} ({ranking.athlete_gender})
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                  {parseFloat(ranking.total_points).toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
