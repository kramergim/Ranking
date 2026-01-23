'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import SnapshotSelect from './SnapshotSelect';
import RankingTable from './RankingTable';
import CarryOverInfoPopup from './CarryOverInfoPopup';

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

interface RankingsClientProps {
  initialSnapshots: Snapshot[];
}

export default function RankingsClient({ initialSnapshots }: RankingsClientProps) {
  const [snapshots] = useState<Snapshot[]>(initialSnapshots);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>(
    initialSnapshots.length > 0 ? initialSnapshots[0].id : ''
  );
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCarryOverPopup, setShowCarryOverPopup] = useState(true);

  // Load rankings when snapshot changes
  useEffect(() => {
    if (selectedSnapshotId) {
      loadRankings(selectedSnapshotId);
    }
  }, [selectedSnapshotId]);

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

  if (snapshots.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-8 md:p-12 text-center border border-white/40 shadow-lg">
        <p className="text-gray-600 text-sm md:text-lg">No rankings available at the moment.</p>
      </div>
    );
  }

  return (
    <>
      {/* Snapshot Selection - Prominent Card */}
      <div className="mb-4 md:mb-8">
        <div className="bg-white/70 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-xl border border-white/30 p-4 md:p-6">
          <SnapshotSelect
            snapshots={snapshots}
            selectedSnapshotId={selectedSnapshotId}
            onSelect={handleSnapshotChange}
          />
        </div>
      </div>

      {/* Rankings Section */}
      {loading ? (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-8 md:p-12 text-center">
          <div className="inline-block w-10 h-10 md:w-12 md:h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-700 text-sm md:text-lg">Loading rankings...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50/70 backdrop-blur-lg border border-red-200 rounded-2xl p-6">
          <p className="text-red-800 text-sm md:text-lg">{error}</p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-xl border border-white/30 p-4 md:p-6 lg:p-8">
          <RankingTable rankings={rankings} snapshotId={selectedSnapshotId} />
        </div>
      )}

      {/* Carry-Over Info Popup */}
      {showCarryOverPopup && (
        <CarryOverInfoPopup onClose={() => setShowCarryOverPopup(false)} />
      )}
    </>
  );
}
