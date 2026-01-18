'use client';

import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, Calendar, TrendingUp, Award, User } from 'lucide-react';
import Image from 'next/image';

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
    photo_url?: string | null;
    hub_level?: string | null;
  };
  events: {
    name: string;
    start_date: string;
    coefficient: number;
    level: string;
  };
}

interface AthletePointsDrawerProps {
  athleteId: string;
  results: Result[];
  onClose: () => void;
}

export default function AthletePointsDrawer({
  athleteId,
  results,
  onClose,
}: AthletePointsDrawerProps) {
  const athleteData = useMemo(() => {
    if (results.length === 0) return null;

    const firstResult = results[0];
    const athlete = firstResult.athletes;

    const totalPoints = results.reduce((sum, r) => sum + (r.points_earned || 0), 0);
    const sortedResults = [...results].sort(
      (a, b) => new Date(b.events.start_date).getTime() - new Date(a.events.start_date).getTime()
    );

    return {
      name: `${athlete.first_name} ${athlete.last_name}`,
      club: athlete.club,
      gender: athlete.gender,
      ageCategory: athlete.age_category,
      weightCategory: athlete.weight_category,
      photoUrl: athlete.photo_url,
      hubLevel: athlete.hub_level,
      totalPoints,
      competitions: sortedResults.length,
      results: sortedResults,
    };
  }, [results]);

  if (!athleteData) return null;

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank === 2) return 'bg-gray-200 text-gray-700 border-gray-300';
    if (rank === 3) return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const getCoefficientColor = (coefficient: number) => {
    if (coefficient >= 5) return 'bg-red-100 text-red-800 border-red-200';
    if (coefficient >= 4) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (coefficient >= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (coefficient >= 2) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const content = (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 w-full md:w-3/4 lg:w-2/3 xl:w-1/2 bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 p-6 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {/* Athlete Photo */}
                {athleteData.photoUrl ? (
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/30 flex-shrink-0">
                    <Image
                      src={athleteData.photoUrl}
                      alt={athleteData.name}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {athleteData.name}
                  </h2>
                  {/* Hub Level Badge */}
                  {athleteData.hubLevel && (
                    <div className="inline-flex items-center gap-1 bg-yellow-400/90 text-yellow-900 px-2 py-0.5 rounded-md font-bold text-xs mt-1">
                      <Award className="w-3 h-3" />
                      {athleteData.hubLevel}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-white/90 text-sm ml-15">
                {athleteData.club && (
                  <span>{athleteData.club}</span>
                )}
                <span>•</span>
                <span>{athleteData.ageCategory}</span>
                <span>•</span>
                <span>{athleteData.gender === 'M' ? 'Male' : 'Female'}</span>
                <span>•</span>
                <span>{athleteData.weightCategory}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="text-white/70 text-sm mb-1">Total Points</div>
              <div className="text-3xl font-bold text-white">
                {Math.round(athleteData.totalPoints)}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="text-white/70 text-sm mb-1">Competitions</div>
              <div className="text-3xl font-bold text-white">
                {athleteData.competitions}
              </div>
            </div>
          </div>
        </div>

        {/* Results History */}
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Competition History
          </h3>

          <div className="space-y-4">
            {athleteData.results.map((result) => (
              <div
                key={result.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                {/* Competition Name */}
                <h4 className="font-bold text-gray-900 mb-3">
                  {result.events.name}
                </h4>

                {/* Event Details */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(result.events.start_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    {result.events.level}
                  </span>
                  <span>•</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border ${getCoefficientColor(
                      result.events.coefficient
                    )}`}
                  >
                    <TrendingUp className="w-3 h-3" />
                    Coef {result.events.coefficient}
                  </span>
                </div>

                {/* Results */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Final Rank */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Placement</div>
                    <div
                      className={`inline-flex items-center justify-center w-12 h-12 rounded-lg font-bold text-lg border-2 ${getMedalColor(
                        result.final_rank
                      )}`}
                    >
                      {result.final_rank}
                    </div>
                  </div>

                  {/* Matches Won */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Wins</div>
                    <div className="text-2xl font-bold text-green-700">
                      {result.matches_won}
                    </div>
                  </div>

                  {/* Points Earned */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Points</div>
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg px-3 py-1 inline-block">
                      <div className="text-xl font-bold text-blue-900">
                        {Math.round(result.points_earned)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(content, document.body) : null;
}
