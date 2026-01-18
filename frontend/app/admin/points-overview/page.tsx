import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/serverAuth';
import PointsOverviewClient from './PointsOverviewClient';

export const metadata = {
  title: 'Points Overview (Global) | Admin',
  description: 'Global points overview for all athletes',
};

export default async function PointsOverviewPage() {
  // Require admin authentication only
  await requireAuth(['admin']);

  const supabase = createClient();

  // Fetch all results with athlete and event info
  const { data: results, error: resultsError } = await supabase
    .from('results')
    .select(
      `
      id,
      athlete_id,
      event_id,
      final_rank,
      matches_won,
      points_earned,
      age_category,
      weight_category,
      athletes!inner (
        first_name,
        last_name,
        club,
        gender,
        age_category,
        weight_category,
        photo_url,
        hub_level
      ),
      events!inner (
        name,
        event_date,
        start_date,
        coefficient,
        level
      )
    `
    )
    .not('points_earned', 'is', null)
    .order('events(start_date)', { ascending: false });

  if (resultsError) {
    console.error('Error fetching results:', resultsError);
  }

  // Transform results to flatten the nested arrays from Supabase
  const transformedResults = (results || []).map((result: any) => ({
    ...result,
    athletes: Array.isArray(result.athletes) ? result.athletes[0] : result.athletes,
    events: Array.isArray(result.events) ? result.events[0] : result.events,
  }));

  // Fetch all active athletes
  const { data: athletes, error: athletesError } = await supabase
    .from('athletes')
    .select('*')
    .eq('is_active', true)
    .order('last_name', { ascending: true });

  if (athletesError) {
    console.error('Error fetching athletes:', athletesError);
  }

  // Fetch all events
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: false });

  if (eventsError) {
    console.error('Error fetching events:', eventsError);
  }

  return (
    <PointsOverviewClient
      initialResults={transformedResults}
      initialAthletes={athletes || []}
      initialEvents={events || []}
    />
  );
}
