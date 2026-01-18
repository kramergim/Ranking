'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';

interface PageProps {
  params: {
    id: string;
  };
}

export default function EditResultPage({ params }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    age_category: '',
    weight_category: '',
    final_rank: 1,
    matches_won: 0,
    notes: '',
  });

  const [resultInfo, setResultInfo] = useState<any>(null);

  useEffect(() => {
    loadResult();
  }, []);

  const loadResult = async () => {
    try {
      const { data, error } = await supabase
        .from('results')
        .select(`
          *,
          athletes (first_name, last_name),
          events (name, event_date)
        `)
        .eq('id', params.id)
        .single();

      if (error) throw error;
      if (data) {
        setResultInfo(data);
        setFormData({
          age_category: data.age_category,
          weight_category: data.weight_category,
          final_rank: data.final_rank,
          matches_won: data.matches_won || 0,
          notes: data.notes || '',
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('results')
        .update({
          ...formData,
          notes: formData.notes || null,
        })
        .eq('id', params.id);

      if (updateError) throw updateError;

      router.push('/admin/results');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce résultat ?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('results')
        .delete()
        .eq('id', params.id);

      if (deleteError) throw deleteError;

      router.push('/admin/results');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/results"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la liste
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">
          Modifier le résultat
        </h1>
        {resultInfo && (
          <p className="text-gray-600 mt-1">
            {resultInfo.athletes?.first_name} {resultInfo.athletes?.last_name} - {resultInfo.events?.name}
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie d'âge *
              </label>
              <input
                type="text"
                required
                value={formData.age_category}
                onChange={(e) => setFormData({ ...formData, age_category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie de poids *
              </label>
              <input
                type="text"
                required
                value={formData.weight_category}
                onChange={(e) => setFormData({ ...formData, weight_category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Place finale *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.final_rank}
                onChange={(e) => setFormData({ ...formData, final_rank: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de victoires
              </label>
              <input
                type="number"
                min="0"
                value={formData.matches_won}
                onChange={(e) => setFormData({ ...formData, matches_won: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </button>

            <div className="flex space-x-3">
              <Link
                href="/admin/results"
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
