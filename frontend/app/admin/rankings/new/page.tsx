'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewSnapshotPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    snapshot_date: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const snapshotDate = new Date(formData.snapshot_date);
      const year = snapshotDate.getFullYear();
      const month = snapshotDate.getMonth() + 1;

      // Call the function directly with correct parameters
      // The function creates the snapshot AND generates the ranking data
      const { data: snapshotId, error: generateError } = await supabase.rpc('generate_ranking_snapshot', {
        p_snapshot_month: month,
        p_snapshot_year: year,
        p_title: formData.title || null,
      });

      if (generateError) throw generateError;

      // If description was provided, update the snapshot
      if (formData.description && snapshotId) {
        const { error: updateError } = await supabase
          .from('ranking_snapshots')
          .update({ description: formData.description })
          .eq('id', snapshotId);

        if (updateError) console.warn('Could not update description:', updateError);
      }

      router.push('/admin/rankings');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création');
      setLoading(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900 mt-2">
          Créer un snapshot de ranking
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date du snapshot *
              </label>
              <input
                type="date"
                required
                value={formData.snapshot_date}
                onChange={(e) => setFormData({ ...formData, snapshot_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cette date détermine la période (mois/année) du snapshot
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Ranking mensuel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 Le snapshot sera créé en mode brouillon. Il calculera automatiquement les rankings
              par catégorie basés sur les résultats actuels. Vous pourrez le publier après vérification.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link
              href="/admin/rankings"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer le snapshot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
