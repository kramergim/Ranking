import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

// Revalidate every 60 seconds (ISR)
export const revalidate = 60;

// Generate static params for all published selections
export async function generateStaticParams() {
  const supabase = createClient();
  const { data: selections } = await supabase
    .from('public_selections_list')
    .select('selection_event_id');

  return (selections || []).map((selection) => ({
    id: selection.selection_event_id,
  }));
}

interface PageProps {
  params: {
    id: string;
  };
}

export default async function SelectionDetailPage({ params }: PageProps) {
  const { id } = params;
  const supabase = createClient();

  // Fetch selection event details
  const { data: eventData, error: eventError } = await supabase
    .from('public_selections_list')
    .select('*')
    .eq('selection_event_id', id)
    .single();

  if (eventError || !eventData) {
    console.error('Error fetching selection event:', eventError);
    notFound();
  }

  // Fetch selected athletes
  const { data: decisions, error: decisionsError } = await supabase
    .from('public_selections')
    .select('*')
    .eq('selection_event_id', id)
    .order('athlete_name', { ascending: true });

  if (decisionsError) {
    console.error('Error fetching decisions:', decisionsError);
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50/70 backdrop-blur-lg border border-red-200 rounded-2xl p-6 shadow-lg">
            <p className="text-red-800 text-lg">Error loading selection decisions.</p>
          </div>
        </div>
      </div>
    );
  }

  const displayDate = new Date(eventData.event_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Event Header */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-4 sm:p-6 md:p-10 shadow-xl border border-white/30">
            <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 md:mb-3">
              {eventData.event_name}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-2">{displayDate}</p>
            {eventData.description && (
              <div className="mt-4 mb-6 bg-gray-50/50 backdrop-blur-sm rounded-2xl p-3 md:p-6 border border-gray-200/50">
                <p className="text-gray-700 text-xs sm:text-sm md:text-base leading-relaxed whitespace-pre-line">
                  {eventData.description}
                </p>
              </div>
            )}
            <div className="inline-flex items-center px-4 py-2 bg-blue-50/70 backdrop-blur-sm border border-blue-200/50 rounded-xl shadow-sm">
              <p className="text-sm font-semibold text-blue-900">
                {eventData.total_selected} athlete{eventData.total_selected > 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
        </div>

        {!decisions || decisions.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/40 shadow-lg">
            <p className="text-gray-600 text-lg">No selection decisions published yet.</p>
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="md:hidden space-y-3">
              {decisions.map((decision) => (
                <div
                  key={decision.athlete_id}
                  className="bg-white/80 backdrop-blur-lg rounded-xl p-3 shadow-lg border border-white/40"
                >
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                      {decision.athlete_name}
                    </h3>
                    <span
                      className={`inline-flex px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full backdrop-blur-sm flex-shrink-0 ${
                        decision.decision_status === 'selected'
                          ? 'bg-green-100/70 text-green-800 border border-green-200/50'
                          : decision.decision_status === 'reserve'
                          ? 'bg-yellow-100/70 text-yellow-800 border border-yellow-200/50'
                          : 'bg-gray-100/70 text-gray-800 border border-gray-200/50'
                      }`}
                    >
                      {decision.decision_status === 'selected'
                        ? 'Selected'
                        : decision.decision_status === 'reserve'
                        ? 'Reserve'
                        : decision.decision_status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <div className="bg-gray-50/50 rounded-lg p-1.5 text-center">
                      <p className="text-gray-500 text-[10px] mb-0.5">Category</p>
                      <p className="font-medium text-gray-900 text-xs">{decision.age_category || '-'}</p>
                    </div>
                    <div className="bg-gray-50/50 rounded-lg p-1.5 text-center">
                      <p className="text-gray-500 text-[10px] mb-0.5">Weight</p>
                      <p className="font-medium text-gray-900 text-xs">{decision.weight_category || '-'}</p>
                    </div>
                    <div className="bg-gray-50/50 rounded-lg p-1.5 text-center">
                      <p className="text-gray-500 text-[10px] mb-0.5">Gender</p>
                      <p className="font-medium text-gray-900 text-xs">
                        {decision.gender === 'M' ? 'M' : decision.gender === 'F' ? 'F' : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block bg-white/80 backdrop-blur-lg shadow-xl overflow-hidden rounded-2xl border border-white/40">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-white/50 backdrop-blur-sm border-b border-white/40">
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                        Athlete
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                        Weight
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                        Gender
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {decisions.map((decision) => (
                      <tr
                        key={decision.athlete_id}
                        className="hover:bg-white/60 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {decision.athlete_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {decision.age_category || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {decision.weight_category || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {decision.gender === 'M' ? 'Male' : decision.gender === 'F' ? 'Female' : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${
                              decision.decision_status === 'selected'
                                ? 'bg-green-100/70 text-green-800 border border-green-200/50'
                                : decision.decision_status === 'reserve'
                                ? 'bg-yellow-100/70 text-yellow-800 border border-yellow-200/50'
                                : 'bg-gray-100/70 text-gray-800 border border-gray-200/50'
                            }`}
                          >
                            {decision.decision_status === 'selected'
                              ? 'Selected'
                              : decision.decision_status === 'reserve'
                              ? 'Reserve'
                              : decision.decision_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
