'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Trash2, Upload, X } from 'lucide-react';

interface PageProps {
  params: {
    id: string;
  };
}

export default function EditAthletePage({ params }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'M',
    age_category: '',
    weight_category: '',
    license_number: '',
    club: '',
    hub_level: '',
    photo_url: '',
    email: '',
    phone: '',
    last_year_pts: 0,
    is_active: true,
  });

  useEffect(() => {
    loadAthlete();
  }, []);

  const loadAthlete = async () => {
    try {
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          first_name: data.first_name,
          last_name: data.last_name,
          date_of_birth: data.date_of_birth,
          gender: data.gender,
          age_category: data.age_category || '',
          weight_category: data.weight_category || '',
          license_number: data.license_number || '',
          club: data.club || '',
          hub_level: data.hub_level || '',
          photo_url: data.photo_url || '',
          email: data.email || '',
          phone: data.phone || '',
          last_year_pts: data.last_year_pts || 0,
          is_active: data.is_active ?? true,
        });
        // Set initial photo preview if exists
        if (data.photo_url) {
          setPhotoPreview(data.photo_url);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Veuillez sélectionner une image');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('La photo doit faire moins de 5MB');
        return;
      }
      setPhotoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(formData.photo_url || null);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return formData.photo_url || null;

    setUploadingPhoto(true);
    try {
      // Create unique filename
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${params.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('athlete-photos')
        .upload(filePath, photoFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Photo upload error:', uploadError);
        throw new Error(`Erreur upload: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('athlete-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Photo upload error:', err);
      throw err;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Upload photo first if a new one was selected
      let photoUrl = formData.photo_url;
      if (photoFile) {
        const uploadedUrl = await uploadPhoto();
        if (uploadedUrl) photoUrl = uploadedUrl;
      }

      const { error: updateError } = await supabase
        .from('athletes')
        .update({
          ...formData,
          email: formData.email || null,
          phone: formData.phone || null,
          license_number: formData.license_number || null,
          club: formData.club || null,
          hub_level: formData.hub_level || null,
          photo_url: photoUrl || null,
          // age_category is NOT sent - will be auto-updated by trigger when date_of_birth changes
          weight_category: formData.weight_category || null,
        })
        .eq('id', params.id);

      if (updateError) throw updateError;

      router.push('/admin/athletes');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet athlète ?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('athletes')
        .delete()
        .eq('id', params.id);

      if (deleteError) throw deleteError;

      router.push('/admin/athletes');
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
          href="/admin/athletes"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la liste
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">
          Modifier l'athlète
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
                Prénom *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de naissance *
              </label>
              <input
                type="date"
                required
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Genre *
              </label>
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="M">Homme</option>
                <option value="F">Femme</option>
              </select>
            </div>

            {/* Age Category - Auto-calculated (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie d'âge
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                {formData.age_category || (
                  <span className="text-gray-400 italic">
                    Calculée automatiquement
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ⚡ Auto-calculée • Cadet (2012-2014) • Junior (2009-2011) • Senior (≤2008)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie de poids
              </label>
              <input
                type="text"
                value={formData.weight_category}
                onChange={(e) => setFormData({ ...formData, weight_category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de licence
              </label>
              <input
                type="text"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Club
              </label>
              <input
                type="text"
                value={formData.club}
                onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HUB Level
              </label>
              <select
                value={formData.hub_level}
                onChange={(e) => setFormData({ ...formData, hub_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Sélectionner --</option>
                <option value="High Performance">High Performance</option>
                <option value="Development">Development</option>
                <option value="Foundation">Foundation</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo de profil
              </label>

              {/* Photo Preview */}
              {photoPreview && (
                <div className="mb-4 relative inline-block">
                  <img
                    src={photoPreview}
                    alt="Aperçu"
                    className="w-32 h-32 rounded-xl object-cover border-4 border-blue-100 shadow-lg"
                  />
                  {photoFile && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Upload Button */}
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  <Upload className="w-4 h-4" />
                  {photoPreview ? 'Changer la photo' : 'Télécharger une photo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                {photoFile && (
                  <span className="text-sm text-gray-600">{photoFile.name}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Formats acceptés: JPG, PNG, WEBP. Taille max: 5MB
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Points année précédente
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.last_year_pts}
                onChange={(e) => setFormData({ ...formData, last_year_pts: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Points reportés de l'année précédente</p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Athlète actif
              </label>
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
                href="/admin/athletes"
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={saving || uploadingPhoto}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploadingPhoto ? 'Téléchargement photo...' : saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
