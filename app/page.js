import { createClient } from '@supabase/supabase-js';
import Leaderboard from '@/components/Leaderboard';

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: entries, error: entriesErr } = await supabase
    .from('entries')
    .select('id, name, group1, group2a, group2b, group3a, group3b, group4, low_amateur, winning_score, status')
    .eq('status', 'confirmed')
    .order('name');

  const { data: earningsData, error: earningsErr } = await supabase
    .from('golfer_earnings')
    .select('golfer_name, earnings');

  const earnings = {};
  (earningsData || []).forEach(row => {
    earnings[row.golfer_name] = Number(row.earnings);
  });

  return {
    entries: entries || [],
    earnings,
  };
}

// Revalidate every 60 seconds so new data shows without redeploy
export const revalidate = 60;

export default async function Home() {
  const { entries, earnings } = await getData();
  return <Leaderboard entries={entries} earnings={earnings} />;
}
