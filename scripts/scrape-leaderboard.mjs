/**
 * Scrape the ESPN Masters leaderboard, calculate projected earnings,
 * and upsert into Supabase.
 *
 * Usage:
 *   node scripts/scrape-leaderboard.mjs                    # default purse 21M
 *   node scripts/scrape-leaderboard.mjs --purse 21000000
 *
 * Writes to:
 *   - golfer_leaderboard  (positions, scores, status)
 *   - golfer_earnings     (projected $ — source of truth for the frontend)
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Note: ESPN serves the leaderboard data via a JSON endpoint that the
 * web page itself calls. Using that endpoint is far more reliable than
 * scraping HTML, and is what this script does.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { calculateEarnings } from '../lib/payouts.js';

config({ path: '.env.local' });

// ESPN's Masters-only leaderboard JSON feed.
const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf/mast/leaderboard';

function parseArgs() {
  let purse = 21_000_000;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--purse' && argv[i + 1]) {
      purse = parseInt(argv[i + 1].replace(/[$,_]/g, ''), 10);
      i++;
    }
  }
  if (!Number.isFinite(purse) || purse <= 0) {
    console.error('Invalid --purse value');
    process.exit(1);
  }
  return { purse };
}

function normalizeStatus(raw) {
  if (!raw) return 'active';
  const s = String(raw).toLowerCase();
  if (s.includes('cut') || s === 'mc') return 'cut';
  if (s.includes('withdraw') || s === 'wd') return 'withdrawn';
  if (s.includes('disqualified') || s === 'dq') return 'withdrawn';
  return 'active';
}

function parseScore(val) {
  if (val == null || val === '' || val === 'E' || val === 'e') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (s === '-' || s === '--') return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

async function fetchLeaderboard() {
  const res = await fetch(ESPN_URL, {
    headers: { 'User-Agent': 'masters-pool-scraper/1.0' },
  });
  if (!res.ok) throw new Error(`ESPN fetch failed: ${res.status} ${res.statusText}`);
  const json = await res.json();

  const event = json.events?.[0];
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];

  if (competitors.length === 0) {
    throw new Error('No competitors found in ESPN response — tournament may not be live yet.');
  }

  return competitors.map(c => {
    const name = c.athlete?.displayName || c.athlete?.fullName || 'Unknown';
    const positionDisplay =
      c.status?.position?.displayName || c.status?.position?.id || '';
    const thru = c.status?.thru != null ? String(c.status.thru) : (c.status?.teeTime ? 'TEE' : '');
    const rawStatus = c.status?.type?.name || c.status?.displayValue || '';

    // ESPN exposes score as either total to par (status.position?) or
    // via statistics. Check a few common spots.
    let scoreToPar = parseScore(c.score);
    if (scoreToPar == null) scoreToPar = parseScore(c.status?.position?.id);
    if (scoreToPar == null) {
      const stat = (c.statistics || []).find(s =>
        ['scoreToPar', 'overall', 'totalScore'].includes(s?.name) ||
        ['scoreToPar', 'TO PAR', 'Total'].includes(s?.displayName)
      );
      if (stat) scoreToPar = parseScore(stat.displayValue ?? stat.value);
    }

    let todayScore = null;
    const todayStat = (c.statistics || []).find(s =>
      s?.name === 'today' || s?.displayName === 'Today' || s?.shortDisplayName === 'TODAY'
    );
    if (todayStat) todayScore = parseScore(todayStat.displayValue ?? todayStat.value);

    return {
      golfer_name: name,
      position: positionDisplay || null,
      score_to_par: scoreToPar,
      today_score: todayScore,
      thru: thru || null,
      status: normalizeStatus(rawStatus),
    };
  });
}

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY === 'your-service-role-key-here') {
    console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const { purse } = parseArgs();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log(`Fetching ESPN Masters leaderboard…`);
  const leaderboard = await fetchLeaderboard();
  console.log(`  parsed ${leaderboard.length} golfers`);

  const earnings = calculateEarnings(leaderboard, purse);
  const totalDistributed = Object.values(earnings).reduce((s, v) => s + v, 0);
  console.log(`Calculated earnings (purse $${purse.toLocaleString()}): $${totalDistributed.toLocaleString()} distributed`);

  // Upsert into golfer_leaderboard
  const now = new Date().toISOString();
  const lbRows = leaderboard.map(g => ({ ...g, updated_at: now }));
  const { error: lbErr } = await supabase
    .from('golfer_leaderboard')
    .upsert(lbRows, { onConflict: 'golfer_name' });
  if (lbErr) {
    console.error('golfer_leaderboard upsert failed:', lbErr.message);
    process.exit(1);
  }
  console.log(`✓ golfer_leaderboard updated (${lbRows.length} rows)`);

  // Replace golfer_earnings (source of truth for the frontend)
  const { error: delErr } = await supabase.from('golfer_earnings').delete().gte('id', 0);
  if (delErr) {
    console.error('golfer_earnings clear failed:', delErr.message);
    process.exit(1);
  }
  const earningsRows = Object.entries(earnings).map(([golfer_name, val]) => ({
    golfer_name,
    earnings: val,
  }));
  const { error: insErr } = await supabase.from('golfer_earnings').insert(earningsRows);
  if (insErr) {
    console.error('golfer_earnings insert failed:', insErr.message);
    process.exit(1);
  }
  console.log(`✓ golfer_earnings updated (${earningsRows.length} rows)`);

  console.log('\nDone. Frontend will pick up the new data on next poll / revalidate.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
