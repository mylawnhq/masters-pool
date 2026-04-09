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

  // Pick counts: how many entries chose each golfer (across all six pick columns).
  const pickCounts = {};
  (entries || []).forEach(e => {
    ['group1', 'group2a', 'group2b', 'group3a', 'group3b', 'group4'].forEach(k => {
      const g = e[k];
      if (g) pickCounts[g] = (pickCounts[g] || 0) + 1;
    });
  });

  // When the feature flag is off, the site behaves exactly as it did pre-tournament:
  // entries A–Z, no earnings, no rankings, no timestamp, no polling.
  if (!SCORES_LIVE) {
    return { entries: entries || [], earnings: {}, golferStats: {}, lastUpdated: null, pickCounts };
  }

  // Earnings: still fetched so the calculation pipeline keeps working,
  // but the UI is on aggregate-score mode for now and ignores this.
  const { data: earningsData } = await supabase
    .from('golfer_earnings')
    .select('golfer_name, earnings');
  const earnings = {};
  (earningsData || []).forEach(row => {
    earnings[row.golfer_name] = Number(row.earnings);
  });

  // Live golfer stats — drives aggregate score-to-par ranking T–Sat.
  const { data: golferRows } = await supabase
    .from('golfer_leaderboard')
    .select('golfer_name, position, score_to_par, thru, status, updated_at');

  const golferStats = {};
  let lastUpdated = null;
  (golferRows || []).forEach(row => {
    golferStats[row.golfer_name] = {
      position: row.position,
      score_to_par: row.score_to_par,
      thru: row.thru,
      status: row.status,
    };
    if (row.updated_at && (!lastUpdated || row.updated_at > lastUpdated)) {
      lastUpdated = row.updated_at;
    }
  });

  return { entries: entries || [], earnings, golferStats, lastUpdated, pickCounts };
}

// Revalidate every 60 seconds so new data shows without redeploy
export const revalidate = 60;

export default async function Home() {
  const { entries, earnings, golferStats, lastUpdated, pickCounts } = await getData();
  return (
    <PasswordGate>
      <Leaderboard
        entries={entries}
        earnings={earnings}
        golferStats={golferStats}
        lastUpdated={lastUpdated}
        pickCounts={pickCounts}
        scoresLive={SCORES_LIVE}
      />
    </PasswordGate>
  );
}
