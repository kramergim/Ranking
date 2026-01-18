import { createClient } from '@/lib/supabase/server';
import { Users, Calendar, Trophy, Award } from 'lucide-react';

export default async function AdminDashboard() {
  const supabase = createClient();

  // Fetch statistics
  const [athletesCount, eventsCount, resultsCount, selectionsCount] = await Promise.all([
    supabase.from('athletes').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('results').select('*', { count: 'exact', head: true }),
    supabase.from('selection_events').select('*', { count: 'exact', head: true }),
  ]);

  const stats = [
    {
      name: 'Athlètes',
      value: athletesCount.count || 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'Événements',
      value: eventsCount.count || 0,
      icon: Calendar,
      color: 'bg-green-500',
    },
    {
      name: 'Résultats',
      value: resultsCount.count || 0,
      icon: Trophy,
      color: 'bg-yellow-500',
    },
    {
      name: 'Sélections',
      value: selectionsCount.count || 0,
      icon: Award,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            href="/admin/athletes/new"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
          >
            <p className="font-medium text-gray-900">Ajouter un athlète</p>
          </a>
          <a
            href="/admin/events/new"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
          >
            <p className="font-medium text-gray-900">Créer un événement</p>
          </a>
          <a
            href="/admin/results/new"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
          >
            <p className="font-medium text-gray-900">Ajouter un résultat</p>
          </a>
          <a
            href="/admin/rankings"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
          >
            <p className="font-medium text-gray-900">Gérer les rankings</p>
          </a>
          <a
            href="/admin/selections"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
          >
            <p className="font-medium text-gray-900">Gérer les sélections</p>
          </a>
        </div>
      </div>
    </div>
  );
}
