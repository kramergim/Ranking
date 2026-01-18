'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import SnapshotSelect from './SnapshotSelect';
import RankingTable from './RankingTable';
import { TrendingUp, Info } from 'lucide-react';
import DefaultBannerBackground from '@/app/components/DefaultBannerBackground';

interface Snapshot {
  id: string;
  title: string;
  snapshot_date: string;
  snapshot_month: number;
  snapshot_year: number;
}

interface Ranking {
  athlete_id: string;
  ranking_position: number;
  athlete_name: string;
  total_points: number;
  current_year_points: number;
  last_year_pts: number;
  age_category: string;
  weight_category: string;
  gender: string;
  club: string;
}

export default function RankingsPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBanner, setActiveBanner] = useState<any>(null);

  // Load banner and snapshots on mount
  useEffect(() => {
    loadBanner();
    loadSnapshots();
  }, []);

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
      // Banner is optional, ignore errors
      console.log('No active banner');
    }
  };

  // Load rankings when snapshot changes
  useEffect(() => {
    if (selectedSnapshotId) {
      loadRankings(selectedSnapshotId);
    }
  }, [selectedSnapshotId]);

  const loadSnapshots = async () => {
    try {
      const { data, error } = await supabase
        .from('public_snapshots_list')
        .select('*')
        .order('snapshot_date', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setSnapshots(data);
        // Default to most recent snapshot
        setSelectedSnapshotId(data[0].id);
      } else {
        setError('No rankings available at the moment.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error loading snapshots:', err);
      setError('Error loading rankings.');
      setLoading(false);
    }
  };

  const loadRankings = async (snapshotId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('public_rankings')
        .select('*')
        .eq('snapshot_id', snapshotId)
        .order('ranking_position', { ascending: true });

      if (error) throw error;

      setRankings(data || []);
    } catch (err: any) {
      console.error('Error loading rankings:', err);
      setError('Error loading ranking.');
      setRankings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSnapshotChange = (snapshotId: string) => {
    setSelectedSnapshotId(snapshotId);
  };

  if (error && snapshots.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50/70 backdrop-blur-lg border border-red-200 rounded-2xl p-6 shadow-lg">
            <p className="text-red-800 text-lg">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Default content
  const defaultTitle = 'Athlete Performances';
  const defaultDescription = 'View Athlete Performances by age category. Click on a name to see detailed results.';

  const heroTitle = activeBanner?.title || defaultTitle;
  const heroDescription = activeBanner?.description || defaultDescription;
  const heroBackground = activeBanner?.image_url;

  return (
    <div className="min-h-screen">
      {/* Hero Section with Dynamic Background */}
      <section className="relative py-8 md:py-12 overflow-hidden">
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
                <TrendingUp className="w-6 h-6 text-white" />
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

      {/* Info Notice */}
      <section className="relative mt-0 md:-mt-8 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/30">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-red-900" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">
                  How to use this page
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
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
        {snapshots.length > 0 && (
          <>
            {/* Snapshot Selection - Prominent Card */}
            <div className="mb-8">
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-6">
                <SnapshotSelect
                  snapshots={snapshots}
                  selectedSnapshotId={selectedSnapshotId}
                  onSelect={handleSnapshotChange}
                />
              </div>
            </div>

            {/* Rankings Section */}
            {loading ? (
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-12 text-center">
                <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-700 text-lg">Loading rankings...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50/70 backdrop-blur-lg border border-red-200 rounded-2xl p-6">
                <p className="text-red-800 text-lg">{error}</p>
              </div>
            ) : (
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-6 md:p-8">
                <RankingTable rankings={rankings} snapshotId={selectedSnapshotId} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
