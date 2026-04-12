#!/usr/bin/env node
/**
 * Auto-recap pipeline — detects completed rounds and writes RecapCard
 * data to data/recap-r{N}.json. Idempotent: safe to run repeatedly.
 *
 * Usage:
 *   node scripts/auto-recap.mjs            # auto-detect completed rounds
 *   node scripts/auto-recap.mjs --force 3  # force recompute round 3
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
config({ path: resolve(ROOT, '.env.local') });

import { createClient } from '@supabase/supabase-js';

const {
  detectCompletedRounds,
  parseESPNRoundScores,
  buildPickCounts,
  computeRecapData,
} = await import(resolve(ROOT, 'lib', 'autoRecap.js'));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const ESPN_EVENT_ID = '401811941';
const ESPN_URL = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?event=${ESPN_EVENT_ID}`;

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'masters-pool/1.0' } }, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// ── Parse CLI args ──────────────────────────────────────────────────────

let forceRound = null;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--force' && args[i + 1]) {
    forceRound = parseInt(args[i + 1], 10);
    i++;
  }
}

// ── Fetch all data ──────────────────────────────────────────────────────

console.log('Fetching data from Supabase + ESPN...');

const [golfersRes, entriesRes, pvTodayRes, pvAllRes, espnData] = await Promise.all([
  supabase
    .from('golfer_leaderboard')
    .select('golfer_name, position, score_to_par, today_score, status, thru, current_round_scores, current_round'),
  supabase
    .from('entries')
    .select('id, name, group1, group2a, group2b, group3a, group3b, group4, status')
    .eq('status', 'confirmed'),
  supabase
    .from('page_views')
    .select('id', { count: 'exact', head: true })
    .gte('timestamp', new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString())
    .eq('event_type', 'pageview'),
  supabase.from('page_views').select('visitor_id').eq('event_type', 'pageview'),
  httpGet(ESPN_URL).catch(err => {
    console.warn('ESPN fetch failed, birdie data may be incomplete:', err.message);
    return null;
  }),
]);

const golferRows = golfersRes.data || [];
const entries = entriesRes.data || [];

const golfers = new Map();
golferRows.forEach(g => golfers.set(g.golfer_name, g));

// Parse ESPN competitors
const competitors =
  espnData?.events?.[0]?.competitions?.[0]?.competitors ||
  espnData?.competitions?.[0]?.competitors ||
  [];

const roundScores = parseESPNRoundScores(competitors);
const pickCount = buildPickCounts(entries);

const analytics = {
  todayVisits: pvTodayRes.count || 0,
  uniqueVisitors: new Set((pvAllRes.data || []).map(r => r.visitor_id)).size,
};

// ── Detect which rounds to compute ──────────────────────────────────────

const completedRounds = forceRound
  ? [forceRound]
  : detectCompletedRounds(golferRows);

console.log(`Current round: ${golferRows[0]?.current_round || '?'}`);
console.log(`Completed rounds detected: [${completedRounds.join(', ')}]`);
console.log(`ESPN competitors loaded: ${competitors.length}`);
console.log(`Round scores parsed: ${roundScores.size}`);

if (completedRounds.length === 0) {
  console.log('No completed rounds detected. Nothing to write.');
  process.exit(0);
}

// ── Compute and write each round ────────────────────────────────────────

mkdirSync(resolve(ROOT, 'data'), { recursive: true });

const summary = {};

for (const round of completedRounds) {
  console.log(`\nComputing recap for Round ${round}...`);
  const data = computeRecapData(round, golfers, entries, roundScores, pickCount, analytics);

  const outPath = resolve(ROOT, 'data', `recap-r${round}.json`);
  writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`  Written to ${outPath}`);

  summary[`round${round}`] = {
    written: true,
    leader: data.top5[0]?.name || 'unknown',
    leaderScore: data.top5[0]?.scoreLabel || data.top5[0]?.score,
  };
}

console.log('\nSummary:', JSON.stringify(summary, null, 2));
