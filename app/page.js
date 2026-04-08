import { createClient } from '@supabase/supabase-js';
import Leaderboard from '@/components/Leaderboard';
import PasswordGate from '@/components/PasswordGate';

const SCORES_LIVE = process.env.NEXT_PUBLIC_SCORES_LIVE === 'true';

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: entries } = await supabase
    .from('entries')
    .select('id, name, group1, group2a, group2b, group3a, group3b, group4, low_amateur, winning_score, status')
    .eq('status', 'confirmed')
    .order('name');

  // When the feature flag is off, the site behaves exactly as it did pre-tournament:
  // entries A–Z, no earnings, no rankings, no timestamp, no polling.
  if (!SCORES_LIVE) {
    return { entries: entries || [], earnings: {}, lastUpdated: null };
  }

  const { data: earningsData } = await supabase
    .from('golfer_earnings')
    .select('golfer_name, earnings');

  const earnings = {};
  (earningsData || []).forEach(row => {
    earnings[row.golfer_name] = Number(row.earnings);
  });

  // Most recent leaderboard write — drives the "Scores updated…" timestamp.
  const { data: latest } = await supabase
    .from('golfer_leaderboard')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1);
  const lastUpdated = latest?.[0]?.updated_at || null;

  return { entries: entries || [], earnings, lastUpdated };
}

// Revalidate every 60 seconds so new data shows without redeploy
export const revalidate = 60;

export default async function Home() {
  const { entries, earnings, lastUpdated } = await getData();
  return (
    <PasswordGate>
      <Leaderboard
        entries={entries}
        earnings={earnings}
        lastUpdated={lastUpdated}
        scoresLive={SCORES_LIVE}
      />
    </PasswordGate>
  );
}
