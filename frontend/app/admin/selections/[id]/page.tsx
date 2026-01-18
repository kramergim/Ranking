'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, FileCheck, Trash2, Plus } from 'lucide-react';

interface PageProps {
  params: {
    id: string;
  };
}

export default function ManageSelectionPage({ params }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<any>(null);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);

  // Form for editing selection
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    event_date: '',
    location: '',
    description: '',
    status: 'draft',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [selectionRes, decisionsRes, athletesRes] = await Promise.all([
        supabase.from('selection_events').select('*').eq('id', params.id).single(),
        supabase
          .from('selection_decisions')
          .select('*, athletes(first_name, last_name, age_category, weight_category)')
          .eq('selection_event_id', params.id),
        supabase.from('athletes').select('*').eq('is_active', true).order('last_name'),
      ]);

      if (selectionRes.error) throw selectionRes.error;

      setSelection(selectionRes.data);
      setFormData({
        name: selectionRes.data.name,
        event_date: selectionRes.data.event_date,
        location: selectionRes.data.location || '',
        description: selectionRes.data.description || '',
        status: selectionRes.data.status || 'draft',
      });

      if (decisionsRes.data) setDecisions(decisionsRes.data);
      if (athletesRes.data) setAthletes(athletesRes.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error: updateError } = await supabase
        .from('selection_events')
        .update({
          ...formData,
          location: formData.location || null,
          description: formData.description || null,
        })
        .eq('id', params.id);

      if (updateError) throw updateError;

      setEditMode(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Publier cette sélection ? Elle sera visible par le public.')) return;

    try {
      const { error: updateError } = await supabase
        .from('selection_events')
        .update({ is_published: true, published_at: new Date().toISOString() })
        .eq('id', params.id);

      if (updateError) throw updateError;

      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cette sélection ?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('selection_events')
        .delete()
        .eq('id', params.id);

      if (deleteError) throw deleteError;

      router.push('/admin/selections');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddAthlete = async (athleteId: string) => {
    try {
      const { error: insertError } = await supabase.from('selection_decisions').insert([
        {
          selection_event_id: params.id,
          athlete_id: athleteId,
          status: 'selected',
        },
      ]);

      if (insertError) throw insertError;

      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateDecision = async (decisionId: string, status: string) => {
    try {
      const { error: updateError } = await supabase
        .from('selection_decisions')
        .update({ status })
        .eq('id', decisionId);

      if (updateError) throw updateError;

      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveDecision = async (decisionId: string) => {
    if (!confirm('Retirer cet athlète de la sélection ?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('selection_decisions')
        .delete()
        .eq('id', decisionId);

      if (deleteError) throw deleteError;

      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  if (!selection) {
    return <div className="text-center py-8 text-red-600">Sélection non trouvée</div>;
  }

  const availableAthletes = athletes.filter(
    (a) => !decisions.find((d) => d.athlete_id === a.id)
  );

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/selections"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la liste
        </Link>
        <div className="flex justify-between items-center mt-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{selection.name}</h1>
            <p className="text-gray-600 mt-1">
              {new Date(selection.event_date).toLocaleDateString('fr-CH')} - {decisions.length}{' '}
              athlète{decisions.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex space-x-2">
            {!selection.is_published && (
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

      {/* Selection Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Informations</h2>
          <button
            onClick={() => setEditMode(!editMode)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {editMode ? 'Annuler' : 'Modifier'}
          </button>
        </div>

        {editMode ? (
          <form onSubmit={handleUpdateSelection} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Enregistrer
            </button>
          </form>
        ) : (
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Statut</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selection.is_published
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {selection.is_published ? 'Publié' : 'Brouillon'}
                </span>
              </dd>
            </div>
            {selection.location && (
              <div>
                <dt className="text-sm text-gray-500">Lieu</dt>
                <dd className="mt-1 text-sm text-gray-900">{selection.location}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {/* Add Athlete */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Ajouter un athlète</h2>
        <select
          onChange={(e) => {
            if (e.target.value) {
              handleAddAthlete(e.target.value);
              e.target.value = '';
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Sélectionner un athlète --</option>
          {availableAthletes.map((athlete) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.first_name} {athlete.last_name}
            </option>
          ))}
        </select>
      </div>

      {/* Decisions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Athlètes sélectionnés</h2>
        </div>
        {decisions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Aucun athlète sélectionné
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Athlète
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Catégories
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {decisions.map((decision: any) => (
                <tr key={decision.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {decision.athletes?.first_name} {decision.athletes?.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {decision.athletes?.age_category} / {decision.athletes?.weight_category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={decision.status}
                      onChange={(e) => handleUpdateDecision(decision.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="selected">Sélectionné</option>
                      <option value="reserve">Réserve</option>
                      <option value="declined">Refusé</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleRemoveDecision(decision.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
