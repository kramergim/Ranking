'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Download, Upload } from 'lucide-react';

export default function UploadAthletesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const downloadTemplate = () => {
    const csvContent = `first_name,last_name,date_of_birth,gender,age_category,weight_category,license_number,club,hub_level,email,phone,last_year_pts
John,Doe,2000-01-15,M,Senior,-68kg,LIC001,Club Geneva,High Performance,john.doe@example.com,+41791234567,150
Jane,Smith,2005-03-20,F,U18,-57kg,LIC002,Club Lausanne,Development,jane.smith@example.com,+41791234568,75`;

    // Add UTF-8 BOM for proper encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'athletes_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());

      const athletes = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < headers.length) continue;

        const athlete: any = {};
        headers.forEach((header, index) => {
          const value = values[index];
          athlete[header] = value || null;
        });

        // Convert gender to uppercase
        if (athlete.gender) {
          athlete.gender = athlete.gender.toUpperCase();
        }

        // Convert last_year_pts to number
        if (athlete.last_year_pts) {
          athlete.last_year_pts = parseInt(athlete.last_year_pts, 10) || 0;
        }

        // Set is_active to true by default
        athlete.is_active = true;

        athletes.push(athlete);
      }

      if (athletes.length === 0) {
        throw new Error('Aucun athlète valide trouvé dans le fichier');
      }

      // Insert athletes
      const { data, error: insertError } = await supabase
        .from('athletes')
        .insert(athletes);

      if (insertError) throw insertError;

      setSuccess(`${athletes.length} athlète(s) importé(s) avec succès!`);
      setTimeout(() => {
        router.push('/admin/athletes');
        router.refresh();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

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
          Import en masse d'athlètes
        </h1>
      </div>

      <div className="space-y-6">
        {/* Template Download */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Étape 1: Télécharger le template</h2>
          <p className="text-sm text-gray-600 mb-4">
            Téléchargez le fichier template CSV, remplissez-le avec vos données, puis importez-le ci-dessous.
          </p>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger le template CSV
          </button>

          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2">Colonnes du template:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>first_name</strong> (requis): Prénom</li>
              <li>• <strong>last_name</strong> (requis): Nom</li>
              <li>• <strong>date_of_birth</strong> (requis): Date de naissance (format: YYYY-MM-DD)</li>
              <li>• <strong>gender</strong> (requis): M ou F</li>
              <li>• <strong>age_category</strong>: Ex: Senior, U21, U18</li>
              <li>• <strong>weight_category</strong>: Ex: -68kg, +80kg</li>
              <li>• <strong>license_number</strong>: Numéro de licence</li>
              <li>• <strong>club</strong>: Nom du club</li>
              <li>• <strong>hub_level</strong>: High Performance, Development, ou Foundation</li>
              <li>• <strong>email</strong>: Email</li>
              <li>• <strong>phone</strong>: Téléphone</li>
              <li>• <strong>last_year_pts</strong>: Points de l'année précédente</li>
            </ul>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Étape 2: Importer le fichier CSV</h2>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4 mb-4">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <label className="cursor-pointer">
              <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Upload className="w-4 h-4 mr-2" />
                Sélectionner un fichier CSV
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">
              Formats acceptés: CSV uniquement
            </p>
          </div>

          {loading && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">Import en cours...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
