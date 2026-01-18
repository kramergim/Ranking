'use client';

import { useState, useMemo, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import AthleteDetailPanel from './AthleteDetailPanel';

interface Ranking {
  athlete_id: string;
  ranking_position: number;
  athlete_name: string;
  total_points: number;
  current_year_points: number;
  last_year_pts: number;
  age_category: string;
  weight_category: string;
  gender: string;
  club: string;
}

interface RankingTableProps {
  rankings: Ranking[];
  snapshotId: string;
}

export default function RankingTable({ rankings, snapshotId }: RankingTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract unique filter values (no 'all' for age category - it's mandatory)
  // Sort in order: Cadet, Junior, Senior
  const categoryOrder = ['Cadet', 'Junior', 'Senior'];
  const categories = useMemo(
    () => Array.from(new Set(rankings.map((r) => r.age_category).filter(Boolean)))
      .sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        // If not in predefined order, put at the end
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      }),
    [rankings]
  );

  // Determine default category: Cadet > Junior > Senior > first available
  const defaultCategory = useMemo(() => {
    if (categories.includes('Cadet')) return 'Cadet';
    if (categories.includes('Junior')) return 'Junior';
    if (categories.includes('Senior')) return 'Senior';
    return categories[0] || 'Senior';
  }, [categories]);

  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory);
  const [selectedWeight, setSelectedWeight] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  // Update selected category if default changes (when rankings change)
  useEffect(() => {
    setSelectedCategory(defaultCategory);
  }, [defaultCategory]);

  const weights = useMemo(
    () => ['all', ...Array.from(new Set(
      rankings
        .filter((r) => r.age_category === selectedCategory)
        .map((r) => r.weight_category)
        .filter(Boolean)
    )).sort()],
    [rankings, selectedCategory]
  );

  // Reset weight filter when category changes if current weight is not available
  useEffect(() => {
    if (selectedWeight !== 'all' && !weights.includes(selectedWeight)) {
      setSelectedWeight('all');
    }
  }, [weights, selectedWeight]);

  const genders = useMemo(
    () => ['all', ...Array.from(new Set(rankings.map((r) => r.gender).filter(Boolean)))],
    [rankings]
  );

  // Check URL parameter on mount to open drawer if athlete is specified
  useEffect(() => {
    const athleteId = searchParams.get('athlete');
    if (athleteId) {
      setSelectedAthleteId(athleteId);
    }
  }, [searchParams]);

  // Handler to open athlete drawer with shallow routing
  const handleOpenAthleteDrawer = (athleteId: string) => {
    setSelectedAthleteId(athleteId);
    // Update URL with shallow routing (doesn't cause page reload)
    const params = new URLSearchParams(searchParams.toString());
    params.set('athlete', athleteId);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Handler to close drawer
  const handleCloseDrawer = () => {
    setSelectedAthleteId(null);
    // Remove athlete param from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('athlete');
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.push(newUrl, { scroll: false });
  };

  // Apply filters
  const filteredRankings = useMemo(() => {
    return rankings.filter((ranking) => {
      // Age category is mandatory - no 'all' option
      const matchesCategory = ranking.age_category === selectedCategory;

      const matchesWeight =
        selectedWeight === 'all' || ranking.weight_category === selectedWeight;

      const matchesGender =
        selectedGender === 'all' || ranking.gender === selectedGender;

      return matchesCategory && matchesWeight && matchesGender;
    });
  }, [rankings, selectedCategory, selectedWeight, selectedGender]);

  return (
    <div className="space-y-6">
      {/* Guided Filters Panel */}
      <div className="space-y-6">
        {/* Primary Filter: Age Category - LARGE and VISUAL */}
        <div className="bg-white/50 backdrop-blur-lg rounded-2xl p-6 border border-white/40 shadow-lg">
          <label className="block text-sm font-semibold text-red-900 mb-3 uppercase tracking-wide">
            Age Category
          </label>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-3 rounded-xl font-semibold text-base transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-red-900 to-rose-900 text-white shadow-xl scale-105 border border-red-800/50'
                    : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-white/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Gender Filter */}
          <div>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full px-4 py-3 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm shadow-md appearance-none cursor-pointer hover:shadow-lg transition-shadow"
            >
              {genders.map((gender) => (
                <option key={gender} value={gender}>
                  {gender === 'all'
                    ? 'All genders'
                    : gender === 'M'
                    ? 'Male'
                    : 'Female'}
                </option>
              ))}
            </select>
          </div>

          {/* Weight Filter */}
          <div>
            <select
              value={selectedWeight}
              onChange={(e) => setSelectedWeight(e.target.value)}
              className="w-full px-4 py-3 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm shadow-md appearance-none cursor-pointer hover:shadow-lg transition-shadow"
            >
              {weights.map((weight) => (
                <option key={weight} value={weight}>
                  {weight === 'all' ? 'All weights' : weight}
                </option>
              ))}
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-end">
            <div className="bg-blue-50/70 backdrop-blur-sm border border-blue-200/50 rounded-xl px-4 py-3 w-full shadow-md">
              <p className="text-sm font-semibold text-blue-900">
                {filteredRankings.length} athlete{filteredRankings.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Table */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-white/50 backdrop-blur-sm border-b border-white/40">
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Rank
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Athlete
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Club
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                  Points
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                  Gender
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">
                  Weight
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRankings.map((ranking, index) => (
                <tr
                  key={`${ranking.ranking_position}-${ranking.athlete_name}`}
                  className="hover:bg-blue-50/30 transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                        ranking.ranking_position === 1
                          ? 'bg-yellow-100 text-yellow-800'
                          : ranking.ranking_position === 2
                          ? 'bg-gray-200 text-gray-700'
                          : ranking.ranking_position === 3
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-50 text-gray-600'
                      }`}>
                        {ranking.ranking_position}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenAthleteDrawer(ranking.athlete_id)}
                      className="text-base font-semibold text-red-900 hover:text-red-950 hover:underline transition-colors cursor-pointer text-left"
                    >
                      {ranking.athlete_name}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {ranking.club || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 text-blue-900 font-bold text-sm">
                      {Math.round(ranking.total_points)} pts
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                    {ranking.gender === 'M' ? 'Male' : ranking.gender === 'F' ? 'Female' : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                    {ranking.weight_category || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRankings.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/60 backdrop-blur-md rounded-full mb-4 shadow-md">
                <Filter className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-1">No results found</p>
              <p className="text-sm text-gray-600">Try modifying your filter criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Athlete Detail Drawer */}
      {selectedAthleteId && (
        <AthleteDetailPanel
          athleteId={selectedAthleteId}
          snapshotId={snapshotId}
          onClose={handleCloseDrawer}
        />
      )}
    </div>
  );
}
