'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Pencil, ChevronUp, ChevronDown } from 'lucide-react';

type Athlete = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  age_category: string | null;
  weight_category: string | null;
  license_number: string | null;
  club: string | null;
  hub_level: string | null;
  is_active: boolean | null;
};

type SortField = 'name' | 'date_of_birth' | 'gender' | 'age_category' | 'weight_category' | 'club' | 'is_active';

export default function AthletesTable({ athletes }: { athletes: Athlete[] }) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAthletes = useMemo(() => {
    return [...athletes].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = `${a.last_name} ${a.first_name}`.toLowerCase();
          bValue = `${b.last_name} ${b.first_name}`.toLowerCase();
          break;
        case 'date_of_birth':
          aValue = new Date(a.date_of_birth).getTime();
          bValue = new Date(b.date_of_birth).getTime();
          break;
        case 'gender':
          aValue = a.gender;
          bValue = b.gender;
          break;
        case 'age_category':
          aValue = a.age_category || '';
          bValue = b.age_category || '';
          break;
        case 'weight_category':
          aValue = a.weight_category || '';
          bValue = b.weight_category || '';
          break;
        case 'club':
          aValue = a.club || '';
          bValue = b.club || '';
          break;
        case 'is_active':
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [athletes, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              onClick={() => handleSort('name')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Nom <SortIcon field="name" />
            </th>
            <th
              onClick={() => handleSort('date_of_birth')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Date de naissance <SortIcon field="date_of_birth" />
            </th>
            <th
              onClick={() => handleSort('gender')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Genre <SortIcon field="gender" />
            </th>
            <th
              onClick={() => handleSort('age_category')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Catégorie <SortIcon field="age_category" />
            </th>
            <th
              onClick={() => handleSort('weight_category')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Poids <SortIcon field="weight_category" />
            </th>
            <th
              onClick={() => handleSort('club')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Club <SortIcon field="club" />
            </th>
            <th
              onClick={() => handleSort('is_active')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Statut <SortIcon field="is_active" />
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedAthletes.map((athlete) => (
            <tr key={athlete.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {athlete.first_name} {athlete.last_name}
                </div>
                {athlete.license_number && (
                  <div className="text-sm text-gray-500">
                    Licence: {athlete.license_number}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(athlete.date_of_birth).toLocaleDateString('fr-CH')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {athlete.gender === 'M' ? 'Homme' : 'Femme'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {athlete.age_category || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {athlete.weight_category || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {athlete.club || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    athlete.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {athlete.is_active ? 'Actif' : 'Inactif'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  href={`/admin/athletes/${athlete.id}/edit`}
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
