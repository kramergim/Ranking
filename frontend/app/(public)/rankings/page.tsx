import { createClient } from '@/lib/supabase/server';
import { TrendingUp, Info } from 'lucide-react';
import DefaultBannerBackground from '@/app/components/DefaultBannerBackground';
import RankingsClient from './RankingsClient';

// Revalidate every 60 seconds (ISR)
export const revalidate = 60;

export default async function RankingsPage() {
  const supabase = createClient();

  // Fetch active banner
  const { data: activeBanner } = await supabase
    .from('hero_banners')
    .select('*')
    .eq('is_active', true)
    .single();

  // Fetch snapshots
  const { data: snapshots, error } = await supabase
    .from('public_snapshots_list')
    .select('*')
    .order('snapshot_date', { ascending: false });

  // Default content
  const defaultTitle = 'Athlete Performances';
  const defaultDescription = 'View Athlete Performances by age category. Click on a name to see detailed results.';

  const heroTitle = activeBanner?.title || defaultTitle;
  const heroDescription = activeBanner?.description || defaultDescription;
  const heroBackground = activeBanner?.image_url;

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50/70 backdrop-blur-lg border border-red-200 rounded-2xl p-6 shadow-lg">
            <p className="text-red-800 text-sm md:text-lg">Error loading rankings.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section with Dynamic Background */}
      <section className="relative py-6 md:py-12 overflow-hidden">
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
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
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

      {/* Info Notice */}
      <section className="relative mt-4 md:-mt-8 mb-4 md:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/70 backdrop-blur-xl rounded-xl md:rounded-2xl p-4 md:p-6 shadow-xl border border-white/30">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 md:w-5 md:h-5 text-red-900" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1 text-sm md:text-base">
                  How to use this page
                </h3>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  First select a period, then choose an age category (Cadet, Junior, Senior).
                  Use filters to refine your search.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <RankingsClient initialSnapshots={snapshots || []} />
      </div>
    </div>
  );
}
