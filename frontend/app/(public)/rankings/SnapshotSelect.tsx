'use client';

import { Calendar } from 'lucide-react';

interface Snapshot {
  id: string;
  title: string;
  snapshot_date: string;
  snapshot_month: number;
  snapshot_year: number;
}

interface SnapshotSelectProps {
  snapshots: Snapshot[];
  selectedSnapshotId: string;
  onSelect: (snapshotId: string) => void;
}

export default function SnapshotSelect({
  snapshots,
  selectedSnapshotId,
  onSelect,
}: SnapshotSelectProps) {
  const formatSnapshotLabel = (snapshot: Snapshot, index: number) => {
    const date = new Date(snapshot.snapshot_date);
    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const baseLabel = snapshot.title || monthName;
    // Add "Latest" label to the first (most recent) snapshot
    return index === 0 ? `${baseLabel} (Latest)` : baseLabel;
  };

  return (
    <div>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-100/70 backdrop-blur-sm rounded-lg flex items-center justify-center pointer-events-none z-10 shadow-sm">
          <Calendar className="h-5 w-5 text-blue-600" />
        </div>
        <select
          id="snapshot-select"
          value={selectedSnapshotId}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full pl-16 pr-12 py-4 border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm text-gray-900 font-semibold text-base appearance-none cursor-pointer hover:bg-white hover:shadow-lg transition-all shadow-md"
        >
          {snapshots.map((snapshot, index) => (
            <option key={snapshot.id} value={snapshot.id}>
              {formatSnapshotLabel(snapshot, index)}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
