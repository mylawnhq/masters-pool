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
  // current_round_scores / current_round feed the expandable scorecard inside
  // the leaderboard overlay. The select is wrapped so a missing column
  // (pre-migration) doesn't break SSR.
  let golferRows = null;
  try {
    const res = await supabase
      .from('golfer_leaderboard')
      .select('golfer_name, position, score_to_par, thru, status, current_round_scores, current_round, updated_at');
    if (res.error && /current_round/i.test(res.error.message || '')) {
      const retry = await supabase
        .from('golfer_leaderboard')
        .select('golfer_name, position, score_to_par, thru, status, updated_at');
      golferRows = retry.data;
    } else {
      golferRows = res.data;
    }
  } catch {
    golferRows = null;
  }

  const golferStats = {};
  let lastUpdated = null;
  (golferRows || []).forEach(row => {
    golferStats[row.golfer_name] = {
      position: row.position,
      score_to_par: row.score_to_par,
      thru: row.thru,
      status: row.status,
      current_round_scores: row.current_round_scores ?? null,
      current_round: row.current_round ?? 1,
    };
    if (row.updated_at && (!lastUpdated || row.updated_at > lastUpdated)) {
      lastUpdated = row.updated_at;
    }
  });

  return { entries: entries || [], earnings, golferStats, lastUpdated, pickCounts };
}

// Render dynamically on every request so PWAs added to a phone home screen
// always pull the latest HTML + bundles. Combined with no-store headers in
// next.config.js, this prevents iOS WebKit from serving stale shell content.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
