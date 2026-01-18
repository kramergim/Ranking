'use client';

import { Info } from 'lucide-react';

export default function PointsAllocationTable() {
  const pointsData = [
    {
      coefficient: 'Coef. 1',
      first: '5 pts',
      second: '3 pts',
      third: '1 pt',
      additional: '—',
    },
    {
      coefficient: 'Coef. 2',
      first: '10 pts',
      second: '6 pts',
      third: '3 pts',
      additional: '+1 pt per match won',
    },
    {
      coefficient: 'Coef. 3',
      first: '20 pts',
      second: '12 pts',
      third: '6 pts',
      additional: '+2 pts per match won',
    },
    {
      coefficient: 'Coef. 4',
      first: '30 pts',
      second: '18 pts',
      third: '10 pts',
      additional: '+3 pts per match won',
    },
    {
      coefficient: 'Coef. 5',
      first: '40 pts',
      second: '34 pts',
      third: '26 pts',
      additional: '+5 pts per match won',
    },
  ];

  return (
    <div className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-200/50">
      <h4 className="font-semibold text-gray-900 mb-3">Points Allocation Table</h4>

      {/* Table Container - Horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 mb-4">
        <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Coefficient
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                1st Place
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                2nd Place
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                3rd Place
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Additional Points
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pointsData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                  {row.coefficient}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap">
                  {row.first}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap">
                  {row.second}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap">
                  {row.third}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap">
                  {row.additional}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Important Note */}
      <div className="bg-yellow-50/70 border border-yellow-200/50 rounded-lg p-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-yellow-700 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-gray-700 leading-relaxed">
          <span className="font-semibold">Important:</span> Only medals earned after winning a minimum of two (2) matches are counted.
        </p>
      </div>
    </div>
  );
}
