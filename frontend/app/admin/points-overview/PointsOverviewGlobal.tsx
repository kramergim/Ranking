'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Calendar, Users } from 'lucide-react';
import AthletePointsDrawer from './AthletePointsDrawer';
import Image from 'next/image';

interface Athlete {
  athlete_id: string;
  first_name: string;
  last_name: string;
  athlete_name: string;
  photo_url?: string;
  age_category: string;
  weight_category: string;
  gender: string;
  club: string;
  last_year_pts: number;
  total_points: number;
  competitions_count: number;
  last_competition_date: string;
}

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
    event_date: string;
    start_date: string;
    coefficient: number;
    level: string;
  };
}

interface PointsOverviewGlobalProps {
  athletes: Athlete[];
  results: Result[];
  clubs: string[];
  ageCategories: string[];
  years: number[];
  coefficients: number[];
}

export default function PointsOverviewGlobal({
  athletes,
  results,
  clubs,
  ageCategories,
  years,
  coefficients,
}: PointsOverviewGlobalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(
    years.length > 0 ? years[0] : 'all'
  );
  const [asOfDate, setAsOfDate] = useState<string>('');
  const [selectedClub, setSelectedClub] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedAgeCategory, setSelectedAgeCategory] = useState<string>('all');
  const [selectedCoefficient, setSelectedCoefficient] = useState<number | 'all'>('all');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter results based on criteria
  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      const eventDate = new Date(result.events.event_date);
      const eventYear = eventDate.getFullYear();

      // Year filter
      if (selectedYear !== 'all' && eventYear !== selectedYear) return false;

      // As-of-date filter
      if (asOfDate && eventDate > new Date(asOfDate)) return false;

      // Coefficient filter
      if (selectedCoefficient !== 'all' && result.events.coefficient !== selectedCoefficient)
        return false;

      return true;
    });
  }, [results, selectedYear, asOfDate, selectedCoefficient]);

  // Calculate athlete points based on filtered results
  const filteredAthletes = useMemo(() => {
    const athletePointsMap = new Map<string, number>();
    const athleteCompetitionsMap = new Map<string, Set<string>>();
    const athleteLastDateMap = new Map<string, Date>();

    // Aggregate points from filtered results
    filteredResults.forEach((result) => {
      const athleteId = result.athlete_id;
      const currentPoints = athletePointsMap.get(athleteId) || 0;
      athletePointsMap.set(athleteId, currentPoints + (result.points_earned || 0));

      if (!athleteCompetitionsMap.has(athleteId)) {
        athleteCompetitionsMap.set(athleteId, new Set());
      }
      athleteCompetitionsMap.get(athleteId)!.add(result.event_id);

      const eventDate = new Date(result.events.event_date);
      const currentLastDate = athleteLastDateMap.get(athleteId);
      if (!currentLastDate || eventDate > currentLastDate) {
        athleteLastDateMap.set(athleteId, eventDate);
      }
    });

    return athletes
      .map((athlete) => {
        const currentYearPoints = athletePointsMap.get(athlete.athlete_id) || 0;
        const carryoverPoints = (athlete.last_year_pts || 0) * 0.4;
        const totalPoints = currentYearPoints + carryoverPoints;

        return {
          ...athlete,
          total_points: totalPoints,
          current_year_points: currentYearPoints,
          competitions_count: athleteCompetitionsMap.get(athlete.athlete_id)?.size || 0,
          last_competition_date: athleteLastDateMap.get(athlete.athlete_id)?.toISOString() || null,
        };
      })
      .filter((athlete) => {
        // Search filter
        if (
          searchTerm &&
          !athlete.athlete_name.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }

        // Club filter
        if (selectedClub !== 'all' && athlete.club !== selectedClub) return false;

        // Gender filter
        if (selectedGender !== 'all' && athlete.gender !== selectedGender) return false;

        // Age category filter
        if (selectedAgeCategory !== 'all' && athlete.age_category !== selectedAgeCategory)
          return false;

        // Only show athletes with points
        return athlete.total_points > 0;
      })
      .sort((a, b) => b.total_points - a.total_points);
  }, [
    athletes,
    filteredResults,
    searchTerm,
    selectedClub,
    selectedGender,
    selectedAgeCategory,
  ]);

  const athleteResultsForDrawer = useMemo(() => {
    if (!selectedAthleteId) return [];
    return results.filter((r) => r.athlete_id === selectedAthleteId);
  }, [selectedAthleteId, results]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Points Overview (Global)</h1>
          <p className="text-gray-600 mt-1">
            All athletes, all competitions - {filteredAthletes.length} athletes with points
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden text-sm text-blue-600 hover:text-blue-700"
          >
            {showFilters ? 'Hide' : 'Show'}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search athlete..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 ${showFilters ? '' : 'hidden md:grid'}`}>
          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) =>
                setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* As of Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Club */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Club</label>
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Clubs</option>
              {clubs.map((club) => (
                <option key={club} value={club}>
                  {club}
                </option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>

          {/* Age Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age Category</label>
            <select
              value={selectedAgeCategory}
              onChange={(e) => setSelectedAgeCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {ageCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Coefficient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coefficient</label>
            <select
              value={selectedCoefficient}
              onChange={(e) =>
                setSelectedCoefficient(
                  e.target.value === 'all' ? 'all' : Number(e.target.value)
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              {coefficients.map((coef) => (
                <option key={coef} value={coef}>
                  {coef}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Athletes Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Athlete
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Club
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Points
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Competitions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Last Competition
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAthletes.map((athlete, index) => (
                <tr
                  key={athlete.athlete_id}
                  onClick={() => setSelectedAthleteId(athlete.athlete_id)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {athlete.photo_url ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                          <Image
                            src={athlete.photo_url}
                            alt={athlete.athlete_name}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{athlete.athlete_name}</div>
                        <div className="text-sm text-gray-500 md:hidden">
                          {athlete.age_category} • {athlete.weight_category} • {athlete.gender}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="text-sm text-gray-900">{athlete.age_category}</div>
                    <div className="text-sm text-gray-500">
                      {athlete.weight_category} • {athlete.gender}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 hidden lg:table-cell">
                    {athlete.club || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(athlete.total_points)}
                      </div>
                      {index < 3 && (
                        <div className="text-xs font-medium mt-1">
                          {index === 0 && (
                            <span className="text-yellow-600">🥇 1st</span>
                          )}
                          {index === 1 && (
                            <span className="text-gray-400">🥈 2nd</span>
                          )}
                          {index === 2 && (
                            <span className="text-orange-600">🥉 3rd</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center hidden md:table-cell">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {athlete.competitions_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 hidden lg:table-cell">
                    {athlete.last_competition_date
                      ? new Date(athlete.last_competition_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAthletes.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No athletes found with the selected filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Athlete Drawer */}
      {selectedAthleteId && (
        <AthletePointsDrawer
          athleteId={selectedAthleteId}
          results={athleteResultsForDrawer}
          onClose={() => setSelectedAthleteId(null)}
        />
      )}
    </div>
  );
}
