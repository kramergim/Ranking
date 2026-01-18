'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Pencil, ChevronUp, ChevronDown } from 'lucide-react';

type Selection = {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  location: string | null;
  status: string | null;
  is_published: boolean | null;
};

type SortField = 'name' | 'date' | 'location' | 'status' | 'is_published';

export default function SelectionsTable({ selections }: { selections: Selection[] }) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedSelections = useMemo(() => {
    return [...selections].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.event_date).getTime();
          bValue = new Date(b.event_date).getTime();
          break;
        case 'location':
          aValue = a.location || '';
          bValue = b.location || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'is_published':
          aValue = a.is_published ? 1 : 0;
          bValue = b.is_published ? 1 : 0;
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [selections, sortField, sortDirection]);

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
              onClick={() => handleSort('date')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Date <SortIcon field="date" />
            </th>
            <th
              onClick={() => handleSort('location')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Lieu <SortIcon field="location" />
            </th>
            <th
              onClick={() => handleSort('status')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Statut <SortIcon field="status" />
            </th>
            <th
              onClick={() => handleSort('is_published')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Publication <SortIcon field="is_published" />
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedSelections.map((selection) => (
            <tr key={selection.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">
                  {selection.name}
                </div>
                {selection.description && (
                  <div className="text-sm text-gray-500 line-clamp-1">
                    {selection.description}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(selection.event_date).toLocaleDateString('fr-CH')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {selection.location || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {selection.status || 'Brouillon'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selection.is_published
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {selection.is_published ? 'Publié' : 'Brouillon'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  href={`/admin/selections/${selection.id}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-900"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Gérer
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
