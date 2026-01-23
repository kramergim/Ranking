import { createClient } from '@/lib/supabase/server';
import { Calendar } from 'lucide-react';
import DefaultBannerBackground from '@/app/components/DefaultBannerBackground';
import CompetitionsClient from './CompetitionsClient';

// Revalidate every 60 seconds (ISR)
export const revalidate = 60;

export default async function CompetitionsPage() {
  const supabase = createClient();

  // Fetch active banner
  const { data: activeBanner } = await supabase
    .from('hero_banners')
    .select('*')
    .eq('is_active', true)
    .single();

  // Fetch published events
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_published', true)
    .order('start_date', { ascending: true });

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
            <p className="text-red-800 text-sm md:text-lg">Error loading competitions.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section with Dynamic Background */}
      <section className="relative py-6 md:py-12 overflow-hidden mb-6 md:mb-12">
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
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-10 border border-white/20 shadow-2xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 md:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-white">
                  {heroTitle}
                </h1>
              </div>
            </div>
            <p className="text-sm sm:text-base md:text-xl text-white/90 max-w-3xl">
              {heroDescription}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <CompetitionsClient initialEvents={events || []} />
      </div>
    </div>
  );
}
