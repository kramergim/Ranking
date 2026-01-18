'use client';

import { useMemo } from 'react';
import { Grid3x3, TrendingUp } from 'lucide-react';

interface Result {
  id: string;
  athlete_id: string;
  event_id: string;
  final_rank: number;
  matches_won: number;
  points_earned: number;
  age_category: string;
  weight_category: string;
  athletes: {
    first_name: string;
    last_name: string;
    club: string;
    gender: string;
    age_category: string;
    weight_category: string;
  };
  events: {
    name: string;
    start_date: string;
    coefficient: number;
    level: string;
  };
}

interface Athlete {
  id: string;
  first_name: string;
  last_name: string;
  club: string;
  gender: string;
  age_category: string;
  weight_category: string;
  is_active: boolean;
}

interface Event {
  id: string;
  name: string;
  start_date: string;
  coefficient: number;
  level: string;
}

interface MatrixViewProps {
  results: Result[];
  athletes: Athlete[];
  events: Event[];
  onAthleteClick: (athleteId: string) => void;
}

export default function MatrixView({
  results,
  athletes,
  events,
  onAthleteClick,
}: MatrixViewProps) {
  // Build matrix data structure
  const matrixData = useMemo(() => {
    // Get unique athletes from results
    const athleteIds = new Set(results.map((r) => r.athlete_id));
    const matrixAthletes = athletes
      .filter((a) => athleteIds.has(a.id))
      .sort((a, b) => {
        const aLastName = a.last_name.toLowerCase();
        const bLastName = b.last_name.toLowerCase();
        return aLastName.localeCompare(bLastName);
      });

    // Get unique events from results
    const eventIds = new Set(results.map((r) => r.event_id));
    const matrixEvents = events
      .filter((e) => eventIds.has(e.id))
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
      .slice(0, 20); // Limit to 20 most recent events for performance

    // Build points matrix
    const pointsMap = new Map<string, number>();
    const totalPointsMap = new Map<string, number>();

    results.forEach((result) => {
      const key = `${result.athlete_id}-${result.event_id}`;
      pointsMap.set(key, result.points_earned || 0);

      const currentTotal = totalPointsMap.get(result.athlete_id) || 0;
      totalPointsMap.set(result.athlete_id, currentTotal + (result.points_earned || 0));
    });

    // Sort athletes by total points
    const sortedAthletes = matrixAthletes.sort((a, b) => {
      const aTotal = totalPointsMap.get(a.id) || 0;
      const bTotal = totalPointsMap.get(b.id) || 0;
      return bTotal - aTotal;
    });

    return {
      athletes: sortedAthletes,
      events: matrixEvents,
      pointsMap,
      totalPointsMap,
    };
  }, [results, athletes, events]);

  const getCoefficientColor = (coefficient: number) => {
    if (coefficient >= 5) return 'bg-red-100';
    if (coefficient >= 4) return 'bg-orange-100';
    if (coefficient >= 3) return 'bg-yellow-100';
    if (coefficient >= 2) return 'bg-blue-100';
    return 'bg-gray-100';
  };

  const getPointsColor = (points: number) => {
    if (points >= 30) return 'bg-green-600 text-white';
    if (points >= 20) return 'bg-green-500 text-white';
    if (points >= 10) return 'bg-blue-500 text-white';
    if (points >= 5) return 'bg-blue-400 text-white';
    if (points > 0) return 'bg-gray-300 text-gray-800';
    return 'bg-gray-100 text-gray-400';
  };

  if (matrixData.athletes.length === 0 || matrixData.events.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
        <Grid3x3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">
          Not enough data to display matrix view
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Try adjusting your filters or switch to another view
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Grid3x3 className="w-5 h-5" />
          Matrix View ({matrixData.athletes.length} athletes × {matrixData.events.length} competitions)
        </h2>
        <p className="text-white/90 text-sm mt-1">
          Showing up to 20 most recent competitions. Horizontal scroll enabled.
        </p>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0">
            <tr>
              {/* Athlete column header */}
              <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r-2 border-gray-200 min-w-[200px]">
                Athlete
              </th>

              {/* Event column headers */}
              {matrixData.events.map((event) => (
                <th
                  key={event.id}
                  className={`px-3 py-3 text-center text-xs font-semibold text-gray-700 min-w-[120px] ${getCoefficientColor(
                    event.coefficient
                  )}`}
                  title={event.name}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="font-bold truncate max-w-[100px]">
                      {event.name.length > 20
                        ? event.name.substring(0, 20) + '...'
                        : event.name}
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(event.start_date).toLocaleDateString('fr-FR', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-full text-xs font-bold">
                      <TrendingUp className="w-3 h-3" />
                      {event.coefficient}
                    </div>
                  </div>
                </th>
              ))}

              {/* Total column header */}
              <th className="sticky right-0 z-20 bg-blue-600 px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider border-l-2 border-blue-700 min-w-[100px]">
                Total
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {matrixData.athletes.map((athlete, athleteIndex) => {
              const totalPoints = matrixData.totalPointsMap.get(athlete.id) || 0;

              return (
                <tr
                  key={athlete.id}
                  className={athleteIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  {/* Athlete name (sticky left) */}
                  <td className="sticky left-0 z-10 bg-inherit px-4 py-3 border-r-2 border-gray-200">
                    <button
                      onClick={() => onAthleteClick(athlete.id)}
                      className="text-left hover:text-blue-600 transition-colors"
                    >
                      <div className="font-semibold text-gray-900 text-sm">
                        {athlete.first_name} {athlete.last_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {athlete.club && `${athlete.club} • `}
                        {athlete.age_category}
                      </div>
                    </button>
                  </td>

                  {/* Points cells */}
                  {matrixData.events.map((event) => {
                    const key = `${athlete.id}-${event.id}`;
                    const points = matrixData.pointsMap.get(key);

                    return (
                      <td
                        key={event.id}
                        className="px-3 py-3 text-center"
                      >
                        {points !== undefined ? (
                          <div
                            className={`inline-flex items-center justify-center px-2 py-1 rounded-lg text-sm font-bold min-w-[50px] ${getPointsColor(
                              points
                            )}`}
                          >
                            {Math.round(points)}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Total points (sticky right) */}
                  <td className="sticky right-0 z-10 bg-blue-600 px-4 py-3 text-center border-l-2 border-blue-700">
                    <div className="text-xl font-bold text-white">
                      {Math.round(totalPoints)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="font-semibold text-gray-700">Points:</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-5 bg-green-600 rounded"></div>
            <span className="text-gray-600">30+</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-5 bg-green-500 rounded"></div>
            <span className="text-gray-600">20-29</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-5 bg-blue-500 rounded"></div>
            <span className="text-gray-600">10-19</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-5 bg-blue-400 rounded"></div>
            <span className="text-gray-600">5-9</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-5 bg-gray-300 rounded"></div>
            <span className="text-gray-600">1-4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
