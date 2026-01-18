'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase/client';
import { X, Trophy, User, Award, TrendingUp, Info, Grid3X3 } from 'lucide-react';

interface Result {
  id: string;
  athlete_id: string;
  final_rank: number;
  matches_won: number;
  points_earned: number;
  calculation_explanation: string;
  athlete_name: string;
  club: string;
  age_category: string;
  weight_category: string;
  gender: string;
}

interface CompetitionResultsPanelProps {
  eventId: string;
  eventName: string;
  infoUrl?: string | null;
  drawsUrl?: string | null;
  onClose: () => void;
}

export default function CompetitionResultsPanel({
  eventId,
  eventName,
  infoUrl,
  drawsUrl,
  onClose,
}: CompetitionResultsPanelProps) {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, [eventId]);

  const loadResults = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('results')
        .select(`
          id,
          athlete_id,
          final_rank,
          matches_won,
          points_earned,
          athletes!inner (
            first_name,
            last_name,
            club,
            age_category,
            weight_category,
            gender
          )
        `)
        .eq('event_id', eventId)
        .order('final_rank', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Transform data to flat structure
      const transformedResults = (data || []).map((result: any) => ({
        id: result.id,
        athlete_id: result.athlete_id,
        final_rank: result.final_rank,
        matches_won: result.matches_won || 0,
        points_earned: result.points_earned || 0,
        calculation_explanation: '',
        athlete_name: result.athletes
          ? `${result.athletes.first_name} ${result.athletes.last_name}`
          : 'Unknown',
        club: result.athletes?.club || '',
        age_category: result.athletes?.age_category || '',
        weight_category: result.athletes?.weight_category || '',
        gender: result.athletes?.gender || '',
      }));

      setResults(transformedResults);
    } catch (err: any) {
      console.error('Error loading results:', err);
      setError(err.message || 'Error loading competition results');
    } finally {
      setLoading(false);
    }
  };

  // Get medal color for top 3
  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank === 2) return 'bg-gray-200 text-gray-700 border-gray-300';
    if (rank === 3) return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const content = (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute inset-y-0 right-0 w-full md:w-3/4 lg:w-2/3 xl:w-1/2 bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-red-950 via-red-900 to-rose-950 p-6 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Competition Results</h2>
              </div>
              <p className="text-white/90 text-lg">{eventName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* URL Links */}
          {(infoUrl || drawsUrl) && (
            <div className="flex gap-3 mb-6">
              {infoUrl && (
                <a
                  href={infoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-100 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-200 transition-colors border border-blue-200"
                >
                  <Info className="w-5 h-5" />
                  Competition Info
                </a>
              )}
              {drawsUrl && (
                <a
                  href={drawsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-100 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-200 transition-colors border border-purple-200"
                >
                  <Grid3X3 className="w-5 h-5" />
                  Draws
                </a>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading results...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-800">{error}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No results recorded for this competition yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Results count */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-blue-900 font-semibold">
                  {results.length} athlete{results.length > 1 ? 's' : ''} competed
                </p>
              </div>

              {/* Results list */}
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Rank badge */}
                      <div
                        className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg border-2 ${getMedalColor(
                          result.final_rank
                        )}`}
                      >
                        {result.final_rank}
                      </div>

                      {/* Athlete info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {result.athlete_name}
                        </h3>
                        {result.club && (
                          <p className="text-sm text-gray-600 mb-2">{result.club}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
                          <span className="inline-flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {result.age_category}
                          </span>
                          <span>•</span>
                          <span>{result.gender === 'M' ? 'Male' : 'Female'}</span>
                          <span>•</span>
                          <span>{result.weight_category}</span>
                        </div>

                        {/* Match record */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-700 font-medium">
                            {result.matches_won} {result.matches_won === 1 ? 'win' : 'wins'}
                          </span>
                        </div>
                      </div>

                      {/* Points badge */}
                      <div className="flex-shrink-0">
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl px-4 py-2 text-center">
                          <div className="flex items-center gap-1 text-blue-900 font-bold text-lg">
                            <TrendingUp className="w-4 h-4" />
                            {Math.round(result.points_earned)}
                          </div>
                          <div className="text-xs text-blue-700">points</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render portal
  return typeof window !== 'undefined'
    ? createPortal(content, document.body)
    : null;
}
