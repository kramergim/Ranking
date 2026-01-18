'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Upload, X } from 'lucide-react';

export default function NewBannerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_active: false,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Veuillez sélectionner une image');
        return;
      }
      // Validate file size (max 10MB for banners)
      if (file.size > 10 * 1024 * 1024) {
        setError('L\'image doit faire moins de 10MB');
        return;
      }
      setImageFile(file);
      setError(null);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (bannerId: string): Promise<string | null> => {
    if (!imageFile) return null;

    setUploadingImage(true);
    try {
      // Create unique filename
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${bannerId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('hero-banners')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        throw new Error(`Erreur upload: ${uploadError.message}`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('hero-banners').getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Image upload error:', err);
      throw err;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Insert banner first
      const { data: banner, error: insertError } = await supabase
        .from('hero_banners')
        .insert([
          {
            title: formData.title || null,
            description: formData.description || null,
            image_url: null, // Will update after upload
            is_active: formData.is_active,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload image if provided and update banner
      if (imageFile && banner) {
        const imageUrl = await uploadImage(banner.id);
        if (imageUrl) {
          const { error: updateError } = await supabase
            .from('hero_banners')
            .update({ image_url: imageUrl })
            .eq('id', banner.id);

          if (updateError)
            console.warn('Could not update image URL:', updateError);
        }
      }

      router.push('/admin/banners');
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
          href="/admin/banners"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la liste
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">
          Nouvelle bannière
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image de fond *
              </label>

              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-4 relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Aperçu"
                    className="w-full max-w-2xl rounded-xl object-cover border-4 border-blue-100 shadow-lg"
                    style={{ maxHeight: '300px' }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 shadow-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Upload Button */}
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  <Upload className="w-4 h-4" />
                  {imagePreview ? 'Changer l\'image' : 'Télécharger une image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {imageFile && (
                  <span className="text-sm text-gray-600">{imageFile.name}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Formats acceptés: JPG, PNG, WEBP. Taille max: 10MB. Recommandé:
                1920x600px
              </p>
            </div>

            {/* Title Override */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre (optionnel)
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Performance tracking for athlete selection"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Laissez vide pour utiliser le titre par défaut
              </p>
            </div>

            {/* Description Override */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optionnel)
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="A transparent ranking system based on tournament results and objective criteria."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Laissez vide pour utiliser la description par défaut
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Activer immédiatement cette bannière
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link
              href="/admin/banners"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={loading || uploadingImage || !imageFile}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingImage
                ? 'Téléchargement...'
                : loading
                ? 'Création...'
                : 'Créer la bannière'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
