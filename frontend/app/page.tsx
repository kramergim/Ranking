import Link from 'next/link';
import { TrendingUp, FileText, Trophy, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import DefaultBannerBackground from './components/DefaultBannerBackground';

export default async function HomePage() {
  // Fetch active banner
  const supabase = createClient();
  const { data: activeBanner } = await supabase
    .from('hero_banners')
    .select('*')
    .eq('is_active', true)
    .single();

  // Default content
  const defaultTitle = 'Performance tracking for athlete selection';
  const defaultDescription =
    'A transparent system based on tournament results and objective criteria.';

  const heroTitle = activeBanner?.title || defaultTitle;
  const heroDescription = activeBanner?.description || defaultDescription;
  const heroBackground = activeBanner?.image_url;

  return (
    <div className="min-h-screen">
      {/* Hero - Glass Panel with Dynamic Background */}
      <section className="relative py-24 md:py-32">
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

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl bg-white/70 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-xl shadow-blue-500/10 border border-white/20">
            {/* Main headline - Direct and clear */}
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              {heroTitle}
            </h1>

            <p className="text-xl text-gray-700 mb-10 leading-relaxed">
              {heroDescription}
            </p>

            {/* Primary CTA */}
            <Link
              href="/rankings"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-900 to-rose-900 text-white px-8 py-4 rounded-xl font-medium hover:from-red-950 hover:to-rose-950 transition-all shadow-lg hover:shadow-xl"
            >
              View Athlete Performances
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl bg-white/60 backdrop-blur-lg rounded-2xl p-8 border border-white/30 shadow-lg">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How it works</h2>

            <div className="grid md:grid-cols-3 gap-4">
            {/* Card 1: Performance Tracking */}
            <Link href="/rankings" className="group">
              <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 border border-white/30 shadow-lg hover:shadow-xl hover:bg-white/70 transition-all">
                <div className="mb-3 w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Performance Tracking
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  View athlete results filtered by category. Each competition weighted by importance.
                </p>
                <div className="text-red-900 font-medium text-sm group-hover:underline">
                  View rankings →
                </div>
              </div>
            </Link>

            {/* Card 2: Selection Criteria */}
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 border border-white/30 shadow-lg hover:shadow-xl hover:bg-white/70 transition-all">
              <div className="mb-3 w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Selection Criteria
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Transparent rules based on tournament coefficients, placement, and wins.
              </p>
            </div>

            {/* Card 3: Official Selections */}
            <Link href="/selections" className="group">
              <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 border border-white/30 shadow-lg hover:shadow-xl hover:bg-white/70 transition-all">
                <div className="mb-3 w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Official Selections
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  Selection decisions for major events based on defined criteria.
                </p>
                <div className="text-red-900 font-medium text-sm group-hover:underline">
                  View selections →
                </div>
              </div>
            </Link>
          </div>
        </div>
        </div>
      </section>

      {/* Points System - Simplified */}
      <section className="pt-8 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl bg-white/60 backdrop-blur-lg rounded-2xl p-8 border border-white/30 shadow-lg">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Points System</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Athlete Performances are calculated using tournament coefficients (1-5 based on importance),
              placement points, and match wins. A minimum of 2 wins is required for medals to count.
              Previous year results contribute to overall scoring for continuity.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-red-900 to-rose-950 opacity-90"></div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
            <p className="text-white/90 text-lg leading-relaxed">
              An objective and transparent system for performance evaluation.
              All criteria and results are publicly accessible.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
