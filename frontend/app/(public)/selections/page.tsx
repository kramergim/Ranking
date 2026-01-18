import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Award } from 'lucide-react';
import SelectionCriteria from './SelectionCriteria';
import DefaultBannerBackground from '@/app/components/DefaultBannerBackground';

export default async function SelectionsPage() {
  const supabase = createClient();

  // Fetch active banner
  const { data: activeBanner } = await supabase
    .from('hero_banners')
    .select('*')
    .eq('is_active', true)
    .single();

  // Default content
  const defaultTitle = 'Published Selections';
  const defaultDescription = 'Official athlete selections for major events';

  const heroTitle = activeBanner?.title || defaultTitle;
  const heroDescription = activeBanner?.description || defaultDescription;
  const heroBackground = activeBanner?.image_url;

  // Fetch published selections using public_selections_list view
  const { data: selections, error } = await supabase
    .from('public_selections_list')
    .select('*')
    .order('event_date', { ascending: false });

  if (error) {
    console.error('Error fetching selections:', error);
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50/70 backdrop-blur-lg border border-red-200 rounded-2xl p-6 shadow-lg">
            <p className="text-red-800 text-lg">Error loading selections.</p>
          </div>
        </div>
      </div>
    );
  }

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
                <Award className="w-6 h-6 text-white" />
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
        {/* Selection Events */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Published Selection Events
          </h3>
        </div>

        {!selections || selections.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/40 shadow-lg">
            <p className="text-gray-600 text-lg">No selections published at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {selections.map((selection) => {
              const displayDate = new Date(selection.event_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });

              return (
                <Link
                  key={selection.selection_event_id}
                  href={`/selections/${selection.selection_event_id}`}
                  className="block p-6 bg-white/70 backdrop-blur-lg border border-white/40 rounded-2xl shadow-lg hover:bg-white/80 hover:shadow-xl transition-all"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {selection.event_name}
                  </h2>
                  <p className="text-sm text-gray-600 mb-2">{displayDate}</p>
                  {selection.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {selection.description}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-blue-600">
                    {selection.total_selected} athlete{selection.total_selected > 1 ? 's' : ''} selected
                  </p>
                </Link>
              );
            })}
          </div>
        )}

        {/* Selection Criteria & Eligibility Section */}
        <div className="mt-12">
          <SelectionCriteria />
        </div>
      </div>
    </div>
  );
}
