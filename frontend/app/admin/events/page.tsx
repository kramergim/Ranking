import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus } from 'lucide-react';
import EventsTable from './EventsTable';

export default async function EventsPage() {
  const supabase = createClient();

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false });

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Événements</h1>
        <p className="text-red-600">Erreur lors du chargement des événements.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Événements</h1>
        <Link
          href="/admin/events/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouvel événement
        </Link>
      </div>

      {!events || events.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">Aucun événement enregistré</p>
          <Link
            href="/admin/events/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Créer le premier événement
          </Link>
        </div>
      ) : (
        <EventsTable events={events} />
      )}
    </div>
  );
}
