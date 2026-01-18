'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewResultPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    athlete_id: '',
    event_id: '',
    age_category: '',
    weight_category: '',
    final_rank: 1,
    matches_won: 0,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [athletesRes, eventsRes] = await Promise.all([
      supabase.from('athletes').select('*').eq('is_active', true).order('last_name'),
      supabase.from('events').select('*').order('event_date', { ascending: false }),
    ]);

    if (athletesRes.data) setAthletes(athletesRes.data);
    if (eventsRes.data) setEvents(eventsRes.data);
  };

  const handleAthleteChange = (athleteId: string) => {
    const athlete = athletes.find((a) => a.id === athleteId);
    if (athlete) {
      setFormData({
        ...formData,
        athlete_id: athleteId,
        age_category: athlete.age_category || '',
        weight_category: athlete.weight_category || '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: insertError } = await supabase.from('results').insert([
        {
          ...formData,
          notes: formData.notes || null,
        },
      ]);

      if (insertError) throw insertError;

      router.push('/admin/results');
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
          href="/admin/results"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la liste
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">
          Nouveau résultat
        </h1>
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
                Athlète *
              </label>
              <select
                required
                value={formData.athlete_id}
                onChange={(e) => handleAthleteChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Sélectionner un athlète --</option>
                {athletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.first_name} {athlete.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Événement *
              </label>
              <select
                required
                value={formData.event_id}
                onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Sélectionner un événement --</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({new Date(event.event_date).toLocaleDateString('fr-CH')})
                  </option>
                ))}
              </select>
            </div>

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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 Les points seront calculés automatiquement selon les règles de scoring en vigueur.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link
              href="/admin/results"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer le résultat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
