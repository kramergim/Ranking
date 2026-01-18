'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Users, Trophy, Grid3x3 } from 'lucide-react';
import AthleteListView from './AthleteListView';
import CompetitionView from './CompetitionView';
import MatrixView from './MatrixView';
import AthletePointsDrawer from './AthletePointsDrawer';

type ViewMode = 'athletes' | 'competitions' | 'matrix';

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

interface PointsOverviewClientProps {
  initialResults: Result[];
  initialAthletes: Athlete[];
  initialEvents: Event[];
}

export default function PointsOverviewClient({
  initialResults,
  initialAthletes,
  initialEvents,
}: PointsOverviewClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [ageCategory, setAgeCategory] = useState<string>('all');
  const [weightCategory, setWeightCategory] = useState<string>('all');
  const [gender, setGender] = useState<string>('all');
  const [club, setClub] = useState<string>('all');
  const [year, setYear] = useState<string>('all');
  const [coefficient, setCoefficient] = useState<string>('all');

  // Extract unique filter values
  const filterOptions = useMemo(() => {
    const ageCategories = new Set<string>();
    const weights = new Set<string>();
    const genders = new Set<string>();
    const clubs = new Set<string>();
    const years = new Set<string>();
    const coefficients = new Set<number>();

    initialResults.forEach((result) => {
      if (result.athletes.age_category) ageCategories.add(result.athletes.age_category);
      if (result.athletes.weight_category) weights.add(result.athletes.weight_category);
      if (result.athletes.gender) genders.add(result.athletes.gender);
      if (result.athletes.club) clubs.add(result.athletes.club);
      if (result.events.start_date) {
        years.add(new Date(result.events.start_date).getFullYear().toString());
      }
      if (result.events.coefficient) coefficients.add(result.events.coefficient);
    });

    return {
      ageCategories: Array.from(ageCategories).sort(),
      weights: Array.from(weights).sort(),
      genders: Array.from(genders).sort(),
      clubs: Array.from(clubs).sort(),
      years: Array.from(years).sort((a, b) => parseInt(b) - parseInt(a)),
      coefficients: Array.from(coefficients).sort((a, b) => b - a),
    };
  }, [initialResults]);

  // Filter results based on selected filters
  const filteredResults = useMemo(() => {
    return initialResults.filter((result) => {
      // Search filter
      const athleteName = `${result.athletes.first_name} ${result.athletes.last_name}`.toLowerCase();
      const eventName = result.events.name.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || athleteName.includes(searchLower) || eventName.includes(searchLower) || result.athletes.club?.toLowerCase().includes(searchLower);

      // Other filters
      const matchesAge = ageCategory === 'all' || result.athletes.age_category === ageCategory;
      const matchesWeight = weightCategory === 'all' || result.athletes.weight_category === weightCategory;
      const matchesGender = gender === 'all' || result.athletes.gender === gender;
      const matchesClub = club === 'all' || result.athletes.club === club;
      const matchesYear = year === 'all' || new Date(result.events.start_date).getFullYear().toString() === year;
      const matchesCoef = coefficient === 'all' || result.events.coefficient.toString() === coefficient;

      return matchesSearch && matchesAge && matchesWeight && matchesGender && matchesClub && matchesYear && matchesCoef;
    });
  }, [initialResults, searchTerm, ageCategory, weightCategory, gender, club, year, coefficient]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Points Overview</h1>
          <p className="text-gray-600 mt-1">
            View and analyze athlete performance across all competitions
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-200">
          <button
            onClick={() => setViewMode('athletes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'athletes'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Athletes</span>
          </button>
          <button
            onClick={() => setViewMode('competitions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'competitions'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Competitions</span>
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'matrix'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
            <span className="hidden sm:inline">Matrix</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search athlete, competition, club..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Age Category */}
          <select
            value={ageCategory}
            onChange={(e) => setAgeCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Age Categories</option>
            {filterOptions.ageCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Gender */}
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Genders</option>
            {filterOptions.genders.map((g) => (
              <option key={g} value={g}>{g === 'M' ? 'Male' : 'Female'}</option>
            ))}
          </select>

          {/* Weight */}
          <select
            value={weightCategory}
            onChange={(e) => setWeightCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Weights</option>
            {filterOptions.weights.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>

          {/* Club */}
          <select
            value={club}
            onChange={(e) => setClub(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Clubs</option>
            {filterOptions.clubs.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Year */}
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Years</option>
            {filterOptions.years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Coefficient */}
          <select
            value={coefficient}
            onChange={(e) => setCoefficient(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Coefficients</option>
            {filterOptions.coefficients.map((c) => (
              <option key={c} value={c}>Coefficient {c}</option>
            ))}
          </select>
        </div>

        {/* Active filters count */}
        {(searchTerm || ageCategory !== 'all' || weightCategory !== 'all' || gender !== 'all' || club !== 'all' || year !== 'all' || coefficient !== 'all') && (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setAgeCategory('all');
                setWeightCategory('all');
                setGender('all');
                setClub('all');
                setYear('all');
                setCoefficient('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
            <span className="text-sm text-gray-500">
              ({filteredResults.length} results)
            </span>
          </div>
        )}
      </div>

      {/* View Content */}
      <div>
        {viewMode === 'athletes' && (
          <AthleteListView
            results={filteredResults}
            athletes={initialAthletes}
            onAthleteClick={setSelectedAthleteId}
          />
        )}
        {viewMode === 'competitions' && (
          <CompetitionView
            results={filteredResults}
            events={initialEvents}
            onAthleteClick={setSelectedAthleteId}
          />
        )}
        {viewMode === 'matrix' && (
          <MatrixView
            results={filteredResults}
            athletes={initialAthletes}
            events={initialEvents}
            onAthleteClick={setSelectedAthleteId}
          />
        )}
      </div>

      {/* Athlete Details Drawer */}
      {selectedAthleteId && (
        <AthletePointsDrawer
          athleteId={selectedAthleteId}
          results={initialResults.filter((r) => r.athlete_id === selectedAthleteId)}
          onClose={() => setSelectedAthleteId(null)}
        />
      )}
    </div>
  );
}
