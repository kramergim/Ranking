import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Weight, User, Award, Trophy, Target, Hash } from 'lucide-react';

interface PageProps {
  params: { athleteId: string };
  searchParams: { snapshot?: string };
}

interface AthleteResult {
  event_id: string;
  event_name: string;
  event_date: string;
  event_coefficient: number;
  result_id: string;
  final_rank: number;
  matches_won: number;
  points_earned: number;
  calculation_explanation: string | null;
}

interface AthleteDetail {
  athlete_id: string;
  athlete_name: string;
  club: string;
  age_category: string;
  weight_category: string;
  gender: string;
  hub_level: string | null;
  photo_url: string | null;
  date_of_birth: string | null;
  total_points: number;
  current_year_points: number;
  last_year_pts: number;
  ranking_position: number;
  results: AthleteResult[];
}

export default async function AthleteDetailPage({ params, searchParams }: PageProps) {
  const { athleteId } = params;
  const snapshotId = searchParams.snapshot;
  const supabase = createClient();

  // Fetch athlete data
  const { data, error } = await supabase
    .from('public_athlete_results')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('snapshot_id', snapshotId || '');

  if (error || !data || data.length === 0) {
    notFound();
  }

  // Fetch date of birth
  const { data: athleteData } = await supabase
    .from('athletes')
    .select('date_of_birth')
    .eq('id', athleteId)
    .single();

  // Group results
  const firstRow = data[0];
  const results: AthleteResult[] = data
    .filter((row) => row.result_id)
    .map((row) => ({
      event_id: row.event_id,
      event_name: row.event_name,
      event_date: row.event_date,
      event_coefficient: row.event_coefficient,
      result_id: row.result_id,
      final_rank: row.final_rank,
      matches_won: row.matches_won,
      points_earned: row.points_earned,
      calculation_explanation: row.calculation_explanation,
    }));

  const athleteDetail: AthleteDetail = {
    athlete_id: firstRow.athlete_id,
    athlete_name: firstRow.athlete_name,
    club: firstRow.club,
    age_category: firstRow.age_category,
    weight_category: firstRow.weight_category,
    gender: firstRow.gender,
    hub_level: firstRow.hub_level,
    photo_url: firstRow.photo_url,
    date_of_birth: athleteData?.date_of_birth || null,
    total_points: firstRow.total_points,
    current_year_points: firstRow.current_year_points,
    last_year_pts: firstRow.last_year_pts,
    ranking_position: firstRow.ranking_position,
    results,
  };

  const getOrdinal = (rank: number) => {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Navigation Header */}
      <header className="sticky top-0 bg-white border-b z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href={`/rankings${snapshotId ? `?snapshot=${snapshotId}` : ''}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <p className="font-bold text-gray-900">{athleteDetail.athlete_name}</p>
            <p className="text-sm text-gray-500">Athlete Profile</p>
          </div>
        </div>
      </header>

      {/* HERO SECTION - Massive Numbers with Swiss Red */}
      <section className="bg-gradient-to-br from-red-600 to-red-700 text-white py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm md:text-base uppercase tracking-wide opacity-90 mb-3">Total Points</p>
          <p className="text-7xl md:text-8xl lg:text-9xl font-black mb-8 tracking-tight">
            {Math.round(athleteDetail.total_points)}
          </p>

          <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/30">
            <Hash className="w-6 h-6" />
            <span className="text-2xl md:text-3xl font-bold">Rank {athleteDetail.ranking_position}</span>
            <span className="text-lg md:text-xl opacity-90">in {athleteDetail.age_category}</span>
          </div>
        </div>
      </section>

      {/* IDENTITY SECTION - Photo + Name + Club */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            {/* Photo */}
            <div className="flex-shrink-0">
              {athleteDetail.photo_url ? (
                <img
                  src={athleteDetail.photo_url}
                  alt={athleteDetail.athlete_name}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover border-4 border-gray-100 shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-gray-100 shadow-lg flex items-center justify-center">
                  <User className="w-16 h-16 md:w-20 md:h-20 text-gray-400" />
                </div>
              )}
            </div>

            {/* Name and Club */}
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-3">
                {athleteDetail.athlete_name}
              </h1>
              <p className="text-xl md:text-2xl text-gray-500">
                {athleteDetail.club || 'No club specified'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* KEY STATS GRID */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {/* Age Category */}
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <Calendar className="w-8 h-8 text-red-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">Age Category</p>
              <p className="text-lg font-bold text-gray-900">{athleteDetail.age_category}</p>
            </div>

            {/* Weight */}
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <Weight className="w-8 h-8 text-red-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">Weight</p>
              <p className="text-lg font-bold text-gray-900">{athleteDetail.weight_category || '-'}</p>
            </div>

            {/* Gender */}
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <User className="w-8 h-8 text-red-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">Gender</p>
              <p className="text-lg font-bold text-gray-900">
                {athleteDetail.gender === 'M' ? 'Male' : 'Female'}
              </p>
            </div>

            {/* HUB Level */}
            {athleteDetail.hub_level ? (
              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <Award className="w-8 h-8 text-red-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-1">HUB Level</p>
                <p className="text-lg font-bold text-gray-900">{athleteDetail.hub_level}</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <Calendar className="w-8 h-8 text-red-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-1">Birth Date</p>
                <p className="text-lg font-bold text-gray-900">
                  {athleteDetail.date_of_birth
                    ? new Date(athleteDetail.date_of_birth).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                      })
                    : '-'}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* POINTS BREAKDOWN - Visual Split */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Points Breakdown</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Current Year Points */}
            <div className="p-8 md:p-10 bg-blue-50 rounded-2xl text-center border-2 border-blue-100">
              <p className="text-sm md:text-base text-blue-600 font-semibold mb-3 uppercase tracking-wide">
                Current Year
              </p>
              <p className="text-5xl md:text-6xl font-black text-blue-900">
                {Math.round(athleteDetail.current_year_points)}
              </p>
            </div>

            {/* Previous Year Points */}
            <div className="p-8 md:p-10 bg-gray-100 rounded-2xl text-center border-2 border-gray-200">
              <p className="text-sm md:text-base text-gray-600 font-semibold mb-3 uppercase tracking-wide">
                Previous Year
              </p>
              <p className="text-5xl md:text-6xl font-black text-gray-900">
                {Math.round(athleteDetail.last_year_pts)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TOURNAMENT RESULTS */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Tournament Results</h2>
            <span className="px-4 py-2 bg-white rounded-lg text-sm font-semibold text-gray-700 shadow-sm border border-gray-200">
              {athleteDetail.results.length} {athleteDetail.results.length === 1 ? 'tournament' : 'tournaments'}
            </span>
          </div>

          {athleteDetail.results.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No tournament results recorded</p>
            </div>
          ) : (
            <div className="space-y-4">
              {athleteDetail.results.map((result) => (
                <div
                  key={result.result_id}
                  className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  {/* Event Header */}
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 mb-6">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg md:text-xl text-gray-900 mb-2">
                        {result.event_name}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(result.event_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    {result.event_coefficient && (
                      <span className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm font-bold shadow-sm">
                        Coef {result.event_coefficient}
                      </span>
                    )}
                  </div>

                  {/* Result Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {/* Place */}
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 text-center">
                      <Trophy className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                      <p className="text-xs text-yellow-700 font-semibold mb-1 uppercase">Place</p>
                      <p className="font-black text-yellow-900 text-2xl">
                        {result.final_rank}
                        <span className="text-sm">{getOrdinal(result.final_rank)}</span>
                      </p>
                    </div>

                    {/* Wins */}
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
                      <Target className="w-6 h-6 text-green-600 mx-auto mb-2" />
                      <p className="text-xs text-green-700 font-semibold mb-1 uppercase">Wins</p>
                      <p className="font-black text-green-900 text-2xl">{result.matches_won}</p>
                    </div>

                    {/* Points */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
                      <Award className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-xs text-blue-700 font-semibold mb-1 uppercase">Points</p>
                      <p className="font-black text-blue-900 text-2xl">{Math.round(result.points_earned)}</p>
                    </div>
                  </div>

                  {/* Calculation Explanation */}
                  {result.calculation_explanation && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                        Points Calculation
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {result.calculation_explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer with Swiss TKD Attribution */}
      <footer className="py-8 bg-white border-t">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            Swiss Taekwondo Federation • Official Performance Tracking System
          </p>
        </div>
      </footer>
    </div>
  );
}
