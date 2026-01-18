'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Eye, ChevronUp, ChevronDown } from 'lucide-react';

type Snapshot = {
  id: string;
  snapshot_date: string;
  title: string | null;
  description: string | null;
  snapshot_month: number;
  snapshot_year: number;
  is_published: boolean | null;
  ranking_snapshot_data?: Array<{ count: number }>;
};

type SortField = 'date' | 'title' | 'period' | 'athletes' | 'is_published';

export default function RankingsTable({ snapshots }: { snapshots: Snapshot[] }) {
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

  const sortedSnapshots = useMemo(() => {
    return [...snapshots].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.snapshot_date).getTime();
          bValue = new Date(b.snapshot_date).getTime();
          break;
        case 'title':
          aValue = (a.title || '').toLowerCase();
          bValue = (b.title || '').toLowerCase();
          break;
        case 'period':
          aValue = a.snapshot_year * 100 + a.snapshot_month;
          bValue = b.snapshot_year * 100 + b.snapshot_month;
          break;
        case 'athletes':
          aValue = a.ranking_snapshot_data?.[0]?.count || 0;
          bValue = b.ranking_snapshot_data?.[0]?.count || 0;
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
  }, [snapshots, sortField, sortDirection]);

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
              onClick={() => handleSort('date')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Date <SortIcon field="date" />
            </th>
            <th
              onClick={() => handleSort('title')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Titre <SortIcon field="title" />
            </th>
            <th
              onClick={() => handleSort('period')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Période <SortIcon field="period" />
            </th>
            <th
              onClick={() => handleSort('athletes')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Athlètes <SortIcon field="athletes" />
            </th>
            <th
              onClick={() => handleSort('is_published')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Statut <SortIcon field="is_published" />
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedSnapshots.map((snapshot) => (
            <tr key={snapshot.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {new Date(snapshot.snapshot_date).toLocaleDateString('fr-CH')}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">
                  {snapshot.title || '-'}
                </div>
                {snapshot.description && (
                  <div className="text-sm text-gray-500">{snapshot.description}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {snapshot.snapshot_month}/{snapshot.snapshot_year}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {snapshot.ranking_snapshot_data?.[0]?.count || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    snapshot.is_published
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {snapshot.is_published ? 'Publié' : 'Brouillon'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <Link
                  href={`/admin/rankings/${snapshot.id}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-900"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Voir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
