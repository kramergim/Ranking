import { createClient } from '@/lib/supabase/server';

export default async function SettingsPage() {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Paramètres</h1>

      <div className="space-y-6">
        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Informations utilisateur</h2>
          <dl className="grid grid-cols-1 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{user?.email || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Rôle</dt>
              <dd className="mt-1">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {profile?.role || 'public'}
                </span>
              </dd>
            </div>
            {profile?.full_name && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Nom complet</dt>
                <dd className="mt-1 text-sm text-gray-900">{profile.full_name}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Informations système</h2>
          <dl className="grid grid-cols-1 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Version</dt>
              <dd className="mt-1 text-sm text-gray-900">1.0.0</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Environnement</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {process.env.NODE_ENV || 'development'}
              </dd>
            </div>
          </dl>
        </div>

        {/* About */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">À propos</h2>
          <p className="text-sm text-gray-600">
            Système de gestion des rankings et sélections Swiss Taekwondo.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Développé avec Next.js 14 et Supabase.
          </p>
        </div>
      </div>
    </div>
  );
}
