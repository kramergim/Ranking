'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Calendar, MapPin, Award, TrendingUp, Search, ExternalLink, Info, Grid3X3 } from 'lucide-react';
import DefaultBannerBackground from '@/app/components/DefaultBannerBackground';
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

export default function CompetitionsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBanner, setActiveBanner] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Load banner and events on mount
  useEffect(() => {
    loadBanner();
    loadEvents();
  }, []);

  // Filter events when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEvents(events);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = events.filter(
        (event) =>
          event.name?.toLowerCase().includes(term) ||
          event.city?.toLowerCase().includes(term) ||
          event.country?.toLowerCase().includes(term) ||
          event.level?.toLowerCase().includes(term)
      );
      setFilteredEvents(filtered);
    }
  }, [searchTerm, events]);

  const loadBanner = async () => {
    try {
      const { data } = await supabase
        .from('hero_banners')
        .select('*')
        .eq('is_active', true)
        .single();

      if (data) {
        setActiveBanner(data);
      }
    } catch (err) {
      console.log('No active banner');
    }
  };

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_published', true)
        .order('start_date', { ascending: true });

      if (error) throw error;

      setEvents(data || []);
      setFilteredEvents(data || []);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError('Error loading competitions.');
    } finally {
      setLoading(false);
    }
  };

  // Default content
  const defaultTitle = 'Official Competitions';
  const defaultDescription = 'Upcoming and past competitions with coefficients and levels';

  const heroTitle = activeBanner?.title || defaultTitle;
  const heroDescription = activeBanner?.description || defaultDescription;
  const heroBackground = activeBanner?.image_url;

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50/70 backdrop-blur-lg border border-red-200 rounded-2xl p-6 shadow-lg">
            <p className="text-red-800 text-lg">{error}</p>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen">
      {/* Hero Section with Dynamic Background */}
      <section className="relative py-8 md:py-12 overflow-hidden mb-12">
        {/* Background Layer */}
        {heroBackground ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroBackground})` }}
          >
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/20"></div>
          </div>
        ) : (
          <DefaultBannerBackground />
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-10 border border-white/20 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                  {heroTitle}
                </h1>
              </div>
            </div>
            <p className="text-xl text-white/90 max-w-3xl">
              {heroDescription}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg border border-white/40 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, city, country, or level..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-12 text-center">
            <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-700 text-lg">Loading competitions...</p>
          </div>
        ) : !filteredEvents || filteredEvents.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/40 shadow-lg">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              {searchTerm ? 'No competitions found matching your search.' : 'No competitions published at the moment.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
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
                  className="bg-white/70 backdrop-blur-lg border border-white/40 rounded-2xl p-6 md:p-8 shadow-lg hover:bg-white/80 hover:shadow-xl transition-all cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left side - Event info */}
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-3">
                        {event.name}
                      </h2>

                      {/* Location */}
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">
                          {event.city}
                          {event.country && `, ${event.country}`}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2 text-gray-600 mb-4">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <span>
                          {displayDate}
                          {endDate && ` - ${endDate}`}
                        </span>
                      </div>

                    </div>

                    {/* Right side - Level & Coefficient */}
                    <div className="flex md:flex-col gap-3 md:items-end">
                      {/* Level Badge */}
                      {event.level && (
                        <div
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border-2 shadow-md ${getLevelColor(
                            event.level
                          )}`}
                        >
                          <Award className="w-4 h-4" />
                          {event.level}
                        </div>
                      )}

                      {/* Coefficient Badge */}
                      {event.coefficient && (
                        <div
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-lg border-2 shadow-md ${getCoefficientColor(
                            event.coefficient
                          )}`}
                        >
                          <TrendingUp className="w-5 h-5" />
                          Coef {event.coefficient}
                        </div>
                      )}

                      {/* URL Links */}
                      {(event.info_url || event.draws_url) && (
                        <div className="flex gap-2 mt-2">
                          {event.info_url && (
                            <a
                              href={event.info_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                            >
                              <Info className="w-4 h-4" />
                              Info
                            </a>
                          )}
                          {event.draws_url && (
                            <a
                              href={event.draws_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                            >
                              <Grid3X3 className="w-4 h-4" />
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
      </div>

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
    </div>
  );
}
