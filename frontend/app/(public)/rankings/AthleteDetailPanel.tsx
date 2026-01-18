'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Trophy, Target, Award, User, Users, Weight, Hash } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

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

interface AthleteDetailPanelProps {
  athleteId: string;
  snapshotId: string;
  onClose: () => void;
}

export default function AthleteDetailPanel({
  athleteId,
  snapshotId,
  onClose,
}: AthleteDetailPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [athleteDetail, setAthleteDetail] = useState<AthleteDetail | null>(null);
  const [mounted, setMounted] = useState(false);

  // Handle mounting for SSR safety
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    loadAthleteDetail();
  }, [athleteId, snapshotId]);

  const loadAthleteDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('public_athlete_results')
        .select('*')
        .eq('athlete_id', athleteId)
        .eq('snapshot_id', snapshotId);

      if (error) throw error;

      if (!data || data.length === 0) {
        setError('No data found for this athlete.');
        setLoading(false);
        return;
      }

      // Fetch date_of_birth from athletes table
      const { data: athleteData } = await supabase
        .from('athletes')
        .select('date_of_birth')
        .eq('id', athleteId)
        .single();

      // Group results
      const firstRow = data[0];
      const results: AthleteResult[] = data
        .filter((row) => row.result_id) // Only rows with results
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

      setAthleteDetail({
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
      });
    } catch (err: any) {
      console.error('Error loading athlete detail:', err);
      setError('Error loading details.');
    } finally {
      setLoading(false);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Don't render on server (SSR safety)
  if (!mounted) return null;

  const drawerContent = (
    <>
      {/* Backdrop with fade-in animation */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel - Slide-over drawer */}
      <div
        className="fixed inset-y-0 right-0 z-[9999] w-full sm:max-w-md md:max-w-lg lg:max-w-xl bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="athlete-detail-title"
      >
        {/* Header - Sticky */}
        <div className="sticky top-0 bg-gradient-to-r from-red-950 via-red-900 to-rose-950 text-white px-6 py-5 flex items-center justify-between z-10 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <h2 id="athlete-detail-title" className="text-xl font-bold">
              Athlete Profile
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-all"
            aria-label="Close athlete profile"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-8">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-700 text-lg">Loading...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50/70 backdrop-blur-lg border border-red-200 rounded-2xl p-6 shadow-lg">
              <p className="text-red-800 text-lg">{error}</p>
            </div>
          ) : athleteDetail ? (
            <>
              {/* HERO: Total Points - Glass Panel on Gradient */}
              <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-red-900 to-rose-950"></div>

                {/* Glass Overlay */}
                <div className="relative bg-white/10 backdrop-blur-xl p-8 md:p-10 text-white border border-white/20">
                  <div className="text-center mb-6">
                    <p className="text-white/80 text-sm font-medium uppercase tracking-wide mb-2">
                      Total Points
                    </p>
                    <p className="text-7xl md:text-8xl font-black mb-2 tracking-tight">
                      {Math.round(athleteDetail.total_points)}
                    </p>
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30">
                      <Hash className="w-4 h-4" />
                      <span className="font-bold">Rank {athleteDetail.ranking_position}</span>
                      <span className="text-white/80">in {athleteDetail.age_category}</span>
                    </div>
                  </div>

                  {/* Points Breakdown */}
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/30">
                    <div className="text-center">
                      <p className="text-white/80 text-sm mb-1">Current Year</p>
                      <p className="text-3xl font-bold">{Math.round(athleteDetail.current_year_points)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/80 text-sm mb-1">Previous Year</p>
                      <p className="text-3xl font-bold">{Math.round(athleteDetail.last_year_pts)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Athlete Identity Card */}
              <div className="bg-white/70 backdrop-blur-lg border border-white/40 rounded-2xl p-6 md:p-8 shadow-xl">
                {/* Photo and Name Section */}
                <div className="flex items-start gap-6 mb-8 pb-6 border-b border-white/40">
                  {/* Photo */}
                  <div className="flex-shrink-0">
                    {athleteDetail.photo_url ? (
                      <img
                        src={athleteDetail.photo_url}
                        alt={athleteDetail.athlete_name}
                        className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-blue-100 shadow-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-gray-100 shadow-lg flex items-center justify-center">
                        <User className="w-12 h-12 md:w-16 md:h-16 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                      {athleteDetail.athlete_name}
                    </h3>
                    <p className="text-gray-500 text-sm mb-2">
                      {athleteDetail.club || 'Not specified'}
                    </p>
                    {athleteDetail.hub_level && (
                      <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg font-bold text-sm border border-yellow-200 shadow-sm">
                        <Award className="w-4 h-4" />
                        {athleteDetail.hub_level}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Date of Birth */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 font-medium">Date of Birth</p>
                      <p className="text-base font-semibold text-gray-900">
                        {athleteDetail.date_of_birth
                          ? new Date(athleteDetail.date_of_birth).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'Not specified'}
                      </p>
                    </div>
                  </div>

                  {/* Age Category */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 font-medium">Age Category</p>
                      <p className="text-base font-semibold text-gray-900">
                        {athleteDetail.age_category || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Weight Category */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Weight className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 font-medium">Weight Category</p>
                      <p className="text-base font-semibold text-gray-900">
                        {athleteDetail.weight_category || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 font-medium">Gender</p>
                      <p className="text-base font-semibold text-gray-900">
                        {athleteDetail.gender === 'M' ? 'Male' : 'Female'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tournament Results */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-2xl font-bold text-gray-900">
                    Tournament Results
                  </h4>
                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white/60 backdrop-blur-sm border border-white/40 text-gray-700 font-semibold text-sm shadow-md">
                    {athleteDetail.results.length} {athleteDetail.results.length > 1 ? 'tournaments' : 'tournament'}
                  </span>
                </div>

                {athleteDetail.results.length === 0 ? (
                  <div className="text-center py-12 bg-white/50 backdrop-blur-lg rounded-2xl border border-white/40 shadow-lg">
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No results recorded</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {athleteDetail.results.map((result) => (
                      <div
                        key={result.result_id}
                        className="bg-white/70 backdrop-blur-lg border border-white/40 rounded-2xl p-5 md:p-6 hover:bg-white/80 hover:shadow-xl transition-all duration-200"
                      >
                        {/* Event Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h5 className="font-bold text-gray-900 text-lg mb-2">
                              {result.event_name}
                            </h5>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {new Date(result.event_date).toLocaleDateString(
                                  'en-US',
                                  {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                          {result.event_coefficient && (
                            <div className="bg-purple-100 text-purple-800 px-3 py-2 rounded-xl font-bold text-sm">
                              Coef {result.event_coefficient}
                            </div>
                          )}
                        </div>

                        {/* Result Stats - Grid */}
                        <div className="grid grid-cols-3 gap-4">
                          {/* Rank */}
                          <div className="bg-yellow-50/70 backdrop-blur-sm border border-yellow-200/50 rounded-xl p-3 text-center shadow-sm">
                            <Trophy className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                            <p className="text-xs text-yellow-700 font-medium mb-1">Place</p>
                            <p className="font-black text-yellow-900 text-xl">
                              {result.final_rank}
                              {result.final_rank === 1 ? 'st' : result.final_rank === 2 ? 'nd' : result.final_rank === 3 ? 'rd' : 'th'}
                            </p>
                          </div>

                          {/* Wins */}
                          <div className="bg-green-50/70 backdrop-blur-sm border border-green-200/50 rounded-xl p-3 text-center shadow-sm">
                            <Target className="w-5 h-5 text-green-600 mx-auto mb-1" />
                            <p className="text-xs text-green-700 font-medium mb-1">Wins</p>
                            <p className="font-black text-green-900 text-xl">
                              {result.matches_won}
                            </p>
                          </div>

                          {/* Points */}
                          <div className="bg-blue-50/70 backdrop-blur-sm border border-blue-200/50 rounded-xl p-3 text-center shadow-sm">
                            <Award className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                            <p className="text-xs text-blue-700 font-medium mb-1">Points</p>
                            <p className="font-black text-blue-900 text-xl">
                              {Math.round(result.points_earned)}
                            </p>
                          </div>
                        </div>

                        {/* Calculation Explanation */}
                        {result.calculation_explanation && (
                          <div className="mt-4 bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl p-3 shadow-sm">
                            <p className="text-xs text-gray-600 font-medium mb-1">Points Calculation:</p>
                            <p className="text-sm text-gray-700">
                              {result.calculation_explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );

  // Render drawer content to document.body using portal
  return createPortal(drawerContent, document.body);
}
