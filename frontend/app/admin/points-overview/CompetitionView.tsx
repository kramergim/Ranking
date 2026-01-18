'use client';

import { useState, useMemo } from 'react';
import { Calendar, Trophy, Award, TrendingUp } from 'lucide-react';

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

interface Event {
  id: string;
  name: string;
  start_date: string;
  coefficient: number;
  level: string;
}

interface CompetitionViewProps {
  results: Result[];
  events: Event[];
  onAthleteClick: (athleteId: string) => void;
}

export default function CompetitionView({
  results,
  events,
  onAthleteClick,
}: CompetitionViewProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Get events that have results
  const eventsWithResults = useMemo(() => {
    const eventIds = new Set(results.map((r) => r.event_id));
    return events
      .filter((e) => eventIds.has(e.id))
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  }, [results, events]);

  // Get results for selected event
  const eventResults = useMemo(() => {
    if (!selectedEventId) return [];
    return results
      .filter((r) => r.event_id === selectedEventId)
      .sort((a, b) => a.final_rank - b.final_rank);
  }, [results, selectedEventId]);

  // Auto-select first event
  if (!selectedEventId && eventsWithResults.length > 0) {
    setSelectedEventId(eventsWithResults[0].id);
  }

  const selectedEvent = eventsWithResults.find((e) => e.id === selectedEventId);

  const getCoefficientColor = (coefficient: number) => {
    if (coefficient >= 5) return 'bg-red-100 text-red-800 border-red-200';
    if (coefficient >= 4) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (coefficient >= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (coefficient >= 2) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank === 2) return 'bg-gray-200 text-gray-700 border-gray-300';
    if (rank === 3) return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  if (eventsWithResults.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">No competitions found with current filters</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Events List */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Competitions ({eventsWithResults.length})
            </h2>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-200">
            {eventsWithResults.map((event) => {
              const eventResultsCount = results.filter((r) => r.event_id === event.id).length;
              const isSelected = selectedEventId === event.id;

              return (
                <button
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                    {event.name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                    <span>{new Date(event.start_date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${getCoefficientColor(
                        event.coefficient
                      )}`}
                    >
                      <TrendingUp className="w-3 h-3" />
                      Coef {event.coefficient}
                    </span>
                    <span className="text-xs text-gray-500">
                      {eventResultsCount} athlete{eventResultsCount > 1 ? 's' : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event Results */}
      <div className="lg:col-span-2">
        {selectedEvent && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Event Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white mb-2">{selectedEvent.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-white/90 text-sm">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedEvent.start_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  {selectedEvent.level}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Coefficient {selectedEvent.coefficient}
                </span>
              </div>
            </div>

            {/* Results Table */}
            <div className="divide-y divide-gray-200">
              {eventResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => onAthleteClick(result.athlete_id)}
                  className="w-full px-6 py-4 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    {/* Rank Badge */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border-2 ${getMedalColor(
                        result.final_rank
                      )}`}
                    >
                      {result.final_rank}
                    </div>

                    {/* Athlete Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">
                        {result.athletes.first_name} {result.athletes.last_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-1">
                        {result.athletes.club && (
                          <>
                            <span>{result.athletes.club}</span>
                            <span className="text-gray-400">•</span>
                          </>
                        )}
                        <span>{result.athletes.age_category}</span>
                        <span className="text-gray-400">•</span>
                        <span>{result.athletes.gender === 'M' ? 'Male' : 'Female'}</span>
                        <span className="text-gray-400">•</span>
                        <span>{result.athletes.weight_category}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {result.matches_won} win{result.matches_won !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Points */}
                    <div className="flex-shrink-0">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl px-4 py-2 text-center">
                        <div className="text-xl font-bold text-blue-900">
                          {Math.round(result.points_earned)}
                        </div>
                        <div className="text-xs text-blue-700">pts</div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
