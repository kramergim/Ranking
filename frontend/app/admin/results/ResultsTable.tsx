'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Pencil, ChevronUp, ChevronDown } from 'lucide-react';

type Result = {
  id: string;
  athlete_id: string;
  event_id: string;
  age_category: string;
  weight_category: string;
  final_rank: number;
  matches_won: number | null;
  points_earned: string | null;
  athletes?: {
    first_name: string;
    last_name: string;
  };
  events?: {
    name: string;
    event_date: string;
  };
};

type SortField = 'athlete' | 'event' | 'category' | 'rank' | 'wins' | 'points';

export default function ResultsTable({ results }: { results: Result[] }) {
  const [sortField, setSortField] = useState<SortField>('event');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'athlete':
          aValue = `${a.athletes?.last_name} ${a.athletes?.first_name}`.toLowerCase();
          bValue = `${b.athletes?.last_name} ${b.athletes?.first_name}`.toLowerCase();
          break;
        case 'event':
          aValue = a.events?.event_date || '';
          bValue = b.events?.event_date || '';
          break;
        case 'category':
          aValue = `${a.age_category} ${a.weight_category}`.toLowerCase();
          bValue = `${b.age_category} ${b.weight_category}`.toLowerCase();
          break;
        case 'rank':
          aValue = a.final_rank;
          bValue = b.final_rank;
          break;
        case 'wins':
          aValue = a.matches_won || 0;
          bValue = b.matches_won || 0;
          break;
        case 'points':
          aValue = parseFloat(a.points_earned || '0');
          bValue = parseFloat(b.points_earned || '0');
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [results, sortField, sortDirection]);

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
              onClick={() => handleSort('athlete')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Athlète <SortIcon field="athlete" />
            </th>
            <th
              onClick={() => handleSort('event')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Événement <SortIcon field="event" />
            </th>
            <th
              onClick={() => handleSort('category')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Catégories <SortIcon field="category" />
            </th>
            <th
              onClick={() => handleSort('rank')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Place <SortIcon field="rank" />
            </th>
            <th
              onClick={() => handleSort('wins')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Victoires <SortIcon field="wins" />
            </th>
            <th
              onClick={() => handleSort('points')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Points <SortIcon field="points" />
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedResults.map((result) => (
            <tr key={result.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {result.athletes?.first_name} {result.athletes?.last_name}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">{result.events?.name}</div>
                <div className="text-sm text-gray-500">
                  {result.events?.event_date && new Date(result.events.event_date).toLocaleDateString('fr-CH')}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {result.age_category} / {result.weight_category}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {result.final_rank}
                  {result.final_rank === 1 ? 'er' : 'e'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {result.matches_won || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                {result.points_earned ? parseFloat(result.points_earned).toFixed(1) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  href={`/admin/results/${result.id}/edit`}
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
