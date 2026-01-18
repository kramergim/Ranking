'use client';

import { useMemo } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';

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

interface AthleteListViewProps {
  results: Result[];
  athletes: Athlete[];
  onAthleteClick: (athleteId: string) => void;
}

interface AthleteWithPoints {
  id: string;
  first_name: string;
  last_name: string;
  club: string;
  gender: string;
  age_category: string;
  weight_category: string;
  total_points: number;
  competitions_count: number;
  best_result: number;
}

export default function AthleteListView({
  results,
  athletes,
  onAthleteClick,
}: AthleteListViewProps) {
  // Calculate total points per athlete
  const athletesWithPoints = useMemo(() => {
    const athleteMap = new Map<string, AthleteWithPoints>();

    // Initialize with all athletes
    athletes.forEach((athlete) => {
      athleteMap.set(athlete.id, {
        id: athlete.id,
        first_name: athlete.first_name,
        last_name: athlete.last_name,
        club: athlete.club,
        gender: athlete.gender,
        age_category: athlete.age_category,
        weight_category: athlete.weight_category,
        total_points: 0,
        competitions_count: 0,
        best_result: 0,
      });
    });

    // Add points from results
    results.forEach((result) => {
      const athlete = athleteMap.get(result.athlete_id);
      if (athlete) {
        athlete.total_points += result.points_earned || 0;
        athlete.competitions_count += 1;
        athlete.best_result = Math.max(athlete.best_result, result.points_earned || 0);
      }
    });

    // Convert to array and sort by total points
    return Array.from(athleteMap.values())
      .filter((a) => a.competitions_count > 0) // Only show athletes with results
      .sort((a, b) => b.total_points - a.total_points);
  }, [results, athletes]);

  if (athletesWithPoints.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
        <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">No results found with current filters</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Athletes Ranking ({athletesWithPoints.length})
        </h2>
      </div>

      {/* Athletes List */}
      <div className="divide-y divide-gray-200">
        {athletesWithPoints.map((athlete, index) => (
          <button
            key={athlete.id}
            onClick={() => onAthleteClick(athlete.id)}
            className="w-full px-6 py-4 hover:bg-blue-50 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              {/* Rank */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                  index === 0
                    ? 'bg-yellow-100 text-yellow-800'
                    : index === 1
                    ? 'bg-gray-200 text-gray-700'
                    : index === 2
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {index + 1}
              </div>

              {/* Athlete Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-lg truncate">
                  {athlete.first_name} {athlete.last_name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {athlete.club && (
                    <span className="text-sm text-gray-600">{athlete.club}</span>
                  )}
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">{athlete.age_category}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">
                    {athlete.gender === 'M' ? 'M' : 'F'}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">{athlete.weight_category}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {athlete.competitions_count} competition{athlete.competitions_count > 1 ? 's' : ''}
                  {' • '}Best: {Math.round(athlete.best_result)} pts
                </div>
              </div>

              {/* Total Points - Emphasized */}
              <div className="flex-shrink-0 text-right">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-xl">
                  <div className="text-2xl font-bold">
                    {Math.round(athlete.total_points)}
                  </div>
                  <div className="text-xs opacity-90">points</div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
