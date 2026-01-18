import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus } from 'lucide-react';
import BannersTable from './BannersTable';

export default async function BannersPage() {
  const supabase = createClient();

  const { data: banners, error } = await supabase
    .from('hero_banners')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Bannières Hero</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Erreur lors du chargement des bannières.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Bannières Hero</h1>
        <Link
          href="/admin/banners/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouvelle bannière
        </Link>
      </div>

      {!banners || banners.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">Aucune bannière créée</p>
          <Link
            href="/admin/banners/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Créer la première bannière
          </Link>
        </div>
      ) : (
        <BannersTable banners={banners} />
      )}
    </div>
  );
}
