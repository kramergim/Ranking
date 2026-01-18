'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Banner = {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
};

export default function BannersTable({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [activating, setActivating] = useState<string | null>(null);

  const handleToggleActive = async (bannerId: string, currentStatus: boolean) => {
    setActivating(bannerId);

    try {
      const { error } = await supabase
        .from('hero_banners')
        .update({ is_active: !currentStatus })
        .eq('id', bannerId);

      if (error) throw error;

      router.refresh();
    } catch (err) {
      console.error('Error toggling banner:', err);
      alert('Erreur lors de la mise à jour du statut');
    } finally {
      setActivating(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Aperçu
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Titre
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Statut
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Créé le
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {banners.map((banner) => (
            <tr key={banner.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                {banner.image_url ? (
                  <img
                    src={banner.image_url}
                    alt="Aperçu"
                    className="w-20 h-12 object-cover rounded border border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                    <span className="text-xs text-gray-400">Aucune image</span>
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 max-w-xs truncate">
                  {banner.title || (
                    <span className="italic text-gray-400">Titre par défaut</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-500 max-w-xs truncate">
                  {banner.description || (
                    <span className="italic text-gray-400">Description par défaut</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => handleToggleActive(banner.id, banner.is_active)}
                  disabled={activating === banner.id}
                  className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition ${
                    banner.is_active
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  } ${activating === banner.id ? 'opacity-50' : ''}`}
                >
                  {banner.is_active ? 'Actif' : 'Inactif'}
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(banner.created_at).toLocaleDateString('fr-CH')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  href={`/admin/banners/${banner.id}/edit`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-900"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Modifier
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
