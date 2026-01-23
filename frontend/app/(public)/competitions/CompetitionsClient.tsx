'use client';

import { useState, useEffect } from 'react';
import { Calendar, MapPin, Award, TrendingUp, Search, Info, Grid3X3 } from 'lucide-react';
import CompetitionResultsPanel from './CompetitionResultsPanel';

interface Event {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  city: string;
  country: string | null;
  level: string | null;
  coefficient: number | null;
  event_type: string | null;
  info_url: string | null;
  draws_url: string | null;
}

interface CompetitionsClientProps {
  initialEvents: Event[];
}

export default function CompetitionsClient({ initialEvents }: CompetitionsClientProps) {
  const [filteredEvents, setFilteredEvents] = useState<Event[]>(initialEvents);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Filter events when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEvents(initialEvents);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = initialEvents.filter(
        (event) =>
          event.name?.toLowerCase().includes(term) ||
          event.city?.toLowerCase().includes(term) ||
          event.country?.toLowerCase().includes(term) ||
          event.level?.toLowerCase().includes(term)
      );
      setFilteredEvents(filtered);
    }
  }, [searchTerm, initialEvents]);

  // Helper function to get level badge color
  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'international':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'continental':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'national':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'regional':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper function to get coefficient badge color
  const getCoefficientColor = (coefficient: number) => {
    if (coefficient >= 5) return 'bg-red-100 text-red-800 border-red-200';
    if (coefficient >= 4) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (coefficient >= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (coefficient >= 2) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <>
      {/* Search Bar */}
      <div className="mb-4 md:mb-6">
        <div className="bg-white/70 backdrop-blur-lg rounded-xl md:rounded-2xl shadow-lg border border-white/40 p-3 md:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
            <input
              type="text"
              placeholder="Search by name, city, country, or level..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base bg-white/50 border border-gray-200 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {!filteredEvents || filteredEvents.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-8 md:p-12 text-center border border-white/40 shadow-lg">
          <Calendar className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-sm md:text-lg">
            {searchTerm ? 'No competitions found matching your search.' : 'No competitions published at the moment.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {filteredEvents.map((event) => {
            const displayDate = new Date(event.start_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            const endDate = event.end_date
              ? new Date(event.end_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : null;

            return (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="bg-white/70 backdrop-blur-lg border border-white/40 rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 shadow-lg hover:bg-white/80 hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
                  {/* Left side - Event info */}
                  <div className="flex-1">
                    <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-2 md:mb-3">
                      {event.name}
                    </h2>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-gray-600 mb-1 md:mb-2">
                      <MapPin className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                      <span className="font-medium text-xs sm:text-sm md:text-base">
                        {event.city}
                        {event.country && `, ${event.country}`}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                      <span className="text-xs sm:text-sm md:text-base">
                        {displayDate}
                        {endDate && ` - ${endDate}`}
                      </span>
                    </div>
                  </div>

                  {/* Right side - Level & Coefficient */}
                  <div className="flex flex-wrap md:flex-col gap-2 md:gap-3 md:items-end mt-2 md:mt-0">
                    {/* Level Badge */}
                    {event.level && (
                      <div
                        className={`inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl font-bold text-xs md:text-sm border-2 shadow-sm ${getLevelColor(
                          event.level
                        )}`}
                      >
                        <Award className="w-3 h-3 md:w-4 md:h-4" />
                        {event.level}
                      </div>
                    )}

                    {/* Coefficient Badge */}
                    {event.coefficient && (
                      <div
                        className={`inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl font-bold text-sm md:text-lg border-2 shadow-sm ${getCoefficientColor(
                          event.coefficient
                        )}`}
                      >
                        <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
                        Coef {event.coefficient}
                      </div>
                    )}

                    {/* URL Links */}
                    {(event.info_url || event.draws_url) && (
                      <div className="flex gap-2">
                        {event.info_url && (
                          <a
                            href={event.info_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs md:text-sm font-medium hover:bg-blue-200 transition-colors"
                          >
                            <Info className="w-3 h-3 md:w-4 md:h-4" />
                            Info
                          </a>
                        )}
                        {event.draws_url && (
                          <a
                            href={event.draws_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs md:text-sm font-medium hover:bg-purple-200 transition-colors"
                          >
                            <Grid3X3 className="w-3 h-3 md:w-4 md:h-4" />
                            Draws
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Competition Results Panel */}
      {selectedEvent && (
        <CompetitionResultsPanel
          eventId={selectedEvent.id}
          eventName={selectedEvent.name}
          infoUrl={selectedEvent.info_url}
          drawsUrl={selectedEvent.draws_url}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}
