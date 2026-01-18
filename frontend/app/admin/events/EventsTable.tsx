'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Pencil, ChevronUp, ChevronDown } from 'lucide-react';

type Event = {
  id: string;
  name: string;
  event_date: string;
  start_date: string | null;
  end_date: string | null;
  event_type: string;
  level: string | null;
  coefficient: number;
  location: string | null;
  city: string | null;
  country: string | null;
  is_published: boolean | null;
};

type SortField = 'name' | 'date' | 'event_type' | 'level' | 'coefficient' | 'location' | 'is_published';

export default function EventsTable({ events }: { events: Event[] }) {
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

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.start_date || a.event_date).getTime();
          bValue = new Date(b.start_date || b.event_date).getTime();
          break;
        case 'event_type':
          aValue = a.event_type;
          bValue = b.event_type;
          break;
        case 'level':
          aValue = a.level || '';
          bValue = b.level || '';
          break;
        case 'coefficient':
          aValue = a.coefficient;
          bValue = b.coefficient;
          break;
        case 'location':
          aValue = a.city || a.location || '';
          bValue = b.city || b.location || '';
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
  }, [events, sortField, sortDirection]);

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
              onClick={() => handleSort('event_type')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Type <SortIcon field="event_type" />
            </th>
            <th
              onClick={() => handleSort('level')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Niveau <SortIcon field="level" />
            </th>
            <th
              onClick={() => handleSort('coefficient')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Coefficient <SortIcon field="coefficient" />
            </th>
            <th
              onClick={() => handleSort('location')}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
            >
              Lieu <SortIcon field="location" />
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
          {sortedEvents.map((event) => (
            <tr key={event.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {event.name}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(event.start_date || event.event_date).toLocaleDateString('fr-CH')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {event.event_type}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {event.level || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {event.coefficient}×
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {event.city || event.location || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    event.is_published
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {event.is_published ? 'Publié' : 'Brouillon'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  href={`/admin/events/${event.id}/edit`}
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
