#!/usr/bin/env node
/**
 * Verify 2026 Masters payouts: cross-reference official posted earnings
 * against both payout systems in the codebase.
 *
 * System 1: lib/mastersPayout.js — fixed dollar table + getPayoutForPosition()
 * System 2: lib/payouts.js       — percentage-based calculateEarnings()
 *
 * Then recalculate all 300 pool entry earnings and output the top 10 standings.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { MASTERS_PAYOUTS, getPayoutForPosition, PURSE_2026 } from '../lib/mastersPayout.js';
import { calculateEarnings, PAYOUT_PCT } from '../lib/payouts.js';

config({ path: '.env.local' });

// ─── Official 2026 Masters results (posted by Augusta National) ───────────
const OFFICIAL = [
  { pos: 1,  name: 'Rory McIlroy',        score: -12, earnings: 4500000,  tied: 1 },
  { pos: 2,  name: 'Scottie Scheffler',    score: -11, earnings: 2430000,  tied: 1 },
  { pos: 3,  name: 'Tyrrell Hatton',       score: -10, earnings: 1080000,  tied: 4 },
  { pos: 3,  name: 'Russell Henley',       score: -10, earnings: 1080000,  tied: 4 },
  { pos: 3,  name: 'Justin Rose',          score: -10, earnings: 1080000,  tied: 4 },
  { pos: 3,  name: 'Cameron Young',        score: -10, earnings: 1080000,  tied: 4 },
  { pos: 7,  name: 'Collin Morikawa',      score: -9,  earnings: 725625,   tied: 2 },
  { pos: 7,  name: 'Sam Burns',            score: -9,  earnings: 725625,   tied: 2 },
  { pos: 9,  name: 'Max Homa',             score: -8,  earnings: 630000,   tied: 2 },
  { pos: 9,  name: 'Xander Schauffele',    score: -8,  earnings: 630000,   tied: 2 },
  { pos: 11, name: 'Jake Knapp',           score: -7,  earnings: 562500,   tied: 1 },
  { pos: 12, name: 'Jordan Spieth',        score: -5,  earnings: 427500,   tied: 6 },
  { pos: 12, name: 'Hideki Matsuyama',     score: -5,  earnings: 427500,   tied: 6 },
  { pos: 12, name: 'Brooks Koepka',        score: -5,  earnings: 427500,   tied: 6 },
  { pos: 12, name: 'Patrick Reed',         score: -5,  earnings: 427500,   tied: 6 },
  { pos: 12, name: 'Patrick Cantlay',      score: -5,  earnings: 427500,   tied: 6 },
  { pos: 12, name: 'Jason Day',            score: -5,  earnings: 427500,   tied: 6 },
  { pos: 18, name: 'Viktor Hovland',       score: -4,  earnings: 315000,   tied: 3 },
  { pos: 18, name: 'Maverick McNealy',     score: -4,  earnings: 315000,   tied: 3 },
  { pos: 18, name: 'Matt Fitzpatrick',     score: -4,  earnings: 315000,   tied: 3 },
  { pos: 21, name: 'Keegan Bradley',       score: -3,  earnings: 252000,   tied: 3 },
  { pos: 21, name: 'Ludvig Aberg',         score: -3,  earnings: 252000,   tied: 3 },
  { pos: 21, name: 'Wyndham Clark',        score: -3,  earnings: 252000,   tied: 3 },
  { pos: 24, name: 'Matt McCarty',         score: -2,  earnings: 178071,   tied: 7 },
  { pos: 24, name: 'Adam Scott',           score: -2,  earnings: 178071,   tied: 7 },
  { pos: 24, name: 'Sam Stevens',          score: -2,  earnings: 178071,   tied: 7 },
  { pos: 24, name: 'Chris Gotterup',       score: -2,  earnings: 178071,   tied: 7 },
  { pos: 24, name: 'Michael Brennan',      score: -2,  earnings: 178071,   tied: 7 },
  { pos: 24, name: 'Brian Campbell',       score: -2,  earnings: 178071,   tied: 7 },
  { pos: 24, name: 'Shane Lowry',          score: -2,  earnings: 178071,   tied: 7 },
  { pos: 31, name: 'Alex Noren',           score: -1,  earnings: 142875,   tied: 2 },
  { pos: 31, name: 'Harris English',       score: -1,  earnings: 142875,   tied: 2 },
  { pos: 33, name: 'Gary Woodland',        score: 0,   earnings: 121500,   tied: 5 },
  { pos: 33, name: 'Dustin Johnson',       score: 0,   earnings: 121500,   tied: 5 },
  { pos: 33, name: 'Brian Harman',         score: 0,   earnings: 121500,   tied: 5 },
  { pos: 33, name: 'Tommy Fleetwood',      score: 0,   earnings: 121500,   tied: 5 },
  { pos: 33, name: 'Ben Griffin',          score: 0,   earnings: 121500,   tied: 5 },
  { pos: 38, name: 'Jon Rahm',             score: 1,   earnings: 101250,   tied: 3 },
  { pos: 38, name: 'Ryan Gerard',          score: 1,   earnings: 101250,   tied: 3 },
  { pos: 38, name: 'Haotong Li',           score: 1,   earnings: 101250,   tied: 3 },
  { pos: 41, name: 'Justin Thomas',        score: 2,   earnings: 83250,    tied: 5 },
  { pos: 41, name: 'Sepp Straka',          score: 2,   earnings: 83250,    tied: 5 },
  { pos: 41, name: 'Jacob Bridgeman',      score: 2,   earnings: 83250,    tied: 5 },
  { pos: 41, name: 'Kristoffer Reitan',    score: 2,   earnings: 83250,    tied: 5 },
  { pos: 41, name: 'Nick Taylor',          score: 2,   earnings: 83250,    tied: 5 },
  { pos: 46, name: 'Sungjae Im',           score: 3,   earnings: 69750,    tied: 1 },
  { pos: 47, name: 'Si Woo Kim',           score: 4,   earnings: 65250,    tied: 1 },
  { pos: 48, name: 'Aaron Rai',            score: 5,   earnings: 61650,    tied: 1 },
  { pos: 49, name: 'Corey Conners',        score: 6,   earnings: 57600,    tied: 2 },
  { pos: 49, name: 'Marco Penge',          score: 6,   earnings: 57600,    tied: 2 },
  { pos: 51, name: 'Kurt Kitayama',        score: 7,   earnings: 55350,    tied: 1 },
  { pos: 52, name: 'Sergio Garcia',        score: 8,   earnings: 54000,    tied: 1 },
  { pos: 53, name: 'Rasmus Hojgaard',      score: 10,  earnings: 52650,    tied: 1 },
  { pos: 54, name: 'Charl Schwartzel',     score: 12,  earnings: 51300,    tied: 1 },
];

const fmt = (n) => '$' + n.toLocaleString();
const DIVIDER = '─'.repeat(90);

// ════════════════════════════════════════════════════════════════════════════
// STEP 1: Verify MASTERS_PAYOUTS table (getPayoutForPosition) — System 1
// ════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(90));
console.log('  SYSTEM 1: lib/mastersPayout.js — getPayoutForPosition(pos, tiedCount)');
console.log('═'.repeat(90));

let sys1Matches = 0;
let sys1Mismatches = 0;
let sys1TotalDiff = 0;
const sys1Issues = [];

// Check unique groups
const groups = new Map();
for (const g of OFFICIAL) {
  const key = `${g.pos}-${g.tied}`;
  if (!groups.has(key)) groups.set(key, g);
}

for (const [, g] of groups) {
  const calculated = getPayoutForPosition(g.pos, g.tied);
  const diff = calculated - g.earnings;
  const unique = OFFICIAL.filter(x => x.pos === g.pos);
  const label = g.tied > 1
    ? `T${g.pos} (${g.tied}-way tie, pos ${g.pos}–${g.pos + g.tied - 1})`
    : `Pos ${g.pos}`;

  if (diff === 0) {
    sys1Matches += unique.length;
  } else {
    sys1Mismatches += unique.length;
    sys1TotalDiff += Math.abs(diff) * unique.length;
    sys1Issues.push({ label, calculated, official: g.earnings, diff, count: unique.length });
  }
}

if (sys1Issues.length === 0) {
  console.log(`\n  ✅ ALL ${sys1Matches} golfers match exactly. No discrepancies.\n`);
} else {
  console.log(`\n  ⚠️  ${sys1Mismatches} golfers have discrepancies:\n`);
  console.log('  ' + 'Position'.padEnd(42) + 'Calculated'.padStart(14) + 'Official'.padStart(14) + 'Diff'.padStart(14));
  console.log('  ' + DIVIDER);
  for (const d of sys1Issues) {
    console.log(
      '  ' +
      d.label.padEnd(42) +
      fmt(d.calculated).padStart(14) +
      fmt(d.official).padStart(14) +
      (d.diff > 0 ? '+' : '') + fmt(d.diff).padStart(13)
    );
  }
  console.log(`\n  Total dollar difference: ${fmt(sys1TotalDiff)}`);
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 2: Verify percentage-based system — lib/payouts.js calculateEarnings()
// ════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(90));
console.log('  SYSTEM 2: lib/payouts.js — calculateEarnings(leaderboard, purse)');
console.log('═'.repeat(90));

// Build a leaderboard array from official data
const leaderboard = OFFICIAL.map(g => ({
  golfer_name: g.name,
  score_to_par: g.score,
  position: g.tied > 1 ? `T${g.pos}` : String(g.pos),
  status: 'active',
}));
const sys2Earnings = calculateEarnings(leaderboard, PURSE_2026);

let sys2Matches = 0;
let sys2Mismatches = 0;
let sys2TotalDiff = 0;
const sys2Issues = [];

for (const g of OFFICIAL) {
  const calculated = sys2Earnings[g.name] || 0;
  const diff = calculated - g.earnings;
  if (diff === 0) {
    sys2Matches++;
  } else {
    sys2Mismatches++;
    sys2TotalDiff += Math.abs(diff);
    sys2Issues.push({ name: g.name, pos: g.pos, calculated, official: g.earnings, diff });
  }
}

if (sys2Issues.length === 0) {
  console.log(`\n  ✅ ALL ${sys2Matches} golfers match exactly. No discrepancies.\n`);
} else {
  console.log(`\n  ⚠️  ${sys2Mismatches} golfer(s) have discrepancies:\n`);
  console.log('  ' + 'Golfer'.padEnd(25) + 'Pos'.padStart(5) + 'Calculated'.padStart(14) + 'Official'.padStart(14) + 'Diff'.padStart(14));
  console.log('  ' + DIVIDER);
  for (const d of sys2Issues) {
    console.log(
      '  ' +
      d.name.padEnd(25) +
      String(d.pos).padStart(5) +
      fmt(d.calculated).padStart(14) +
      fmt(d.official).padStart(14) +
      ((d.diff > 0 ? '+' : '') + fmt(d.diff)).padStart(14)
    );
  }
  console.log(`\n  Total dollar difference: ${fmt(sys2TotalDiff)}`);
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 3: Show what the corrected payout table says for positions 49-54
//         (verifying pos 27 fix, and positions beyond MAX_POS=50)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(90));
console.log('  PAYOUT TABLE COVERAGE CHECK — positions near/beyond MAX_POS=50');
console.log('═'.repeat(90));

console.log(`\n  Position 27 in table: ${fmt(MASTERS_PAYOUTS[27])} (should be $173,250 after fix)`);
for (let p = 49; p <= 54; p++) {
  const inTable = MASTERS_PAYOUTS[p];
  const officialG = OFFICIAL.find(g => g.pos === p && g.tied === 1);
  console.log(`  Position ${p}: table=${inTable != null ? fmt(inTable) : 'MISSING'}` +
    (officialG ? `, official=${fmt(officialG.earnings)}` : ''));
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 4: Fetch entries from Supabase and recalculate pool standings
// ════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(90));
console.log('  POOL STANDINGS — recalculated using getPayoutForPosition (System 1)');
console.log('═'.repeat(90));

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('\n  ⚠️  Supabase env vars not set — skipping entry recalculation.\n');
  process.exit(0);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Build golfer → earnings map from official data using System 1 (getPayoutForPosition)
const golferEarnings = {};
for (const g of OFFICIAL) {
  golferEarnings[g.name] = getPayoutForPosition(g.pos, g.tied);
}
// Also build from System 2 for comparison
const golferEarningsSys2 = {};
for (const g of OFFICIAL) {
  golferEarningsSys2[g.name] = sys2Earnings[g.name] || 0;
}

const { data: entries, error: entErr } = await supabase
  .from('entries')
  .select('id, name, group1, group2a, group2b, group3a, group3b, group4, status')
  .eq('status', 'confirmed')
  .order('name');

if (entErr) {
  console.error('  Failed to fetch entries:', entErr.message);
  process.exit(1);
}

console.log(`\n  Fetched ${entries.length} confirmed entries.`);

const pickCols = ['group1', 'group2a', 'group2b', 'group3a', 'group3b', 'group4'];

const standings = entries.map(e => {
  const total = pickCols.reduce((s, col) => s + (golferEarnings[e[col]] || 0), 0);
  return { name: e.name, total, id: e.id };
});

standings.sort((a, b) => b.total - a.total);

// Assign ranks with ties
standings.forEach((e, i) => {
  e.rank = (i > 0 && e.total === standings[i - 1].total) ? standings[i - 1].rank : i + 1;
});

console.log(`\n  ${'Rank'.padStart(6)}  ${'Entry Name'.padEnd(30)}  ${'Earnings'.padStart(14)}`);
console.log('  ' + DIVIDER);

const top = standings.slice(0, 10);
for (const e of top) {
  const rkLabel = (standings.filter(x => x.rank === e.rank).length > 1 ? 'T' : '') + e.rank;
  console.log(`  ${rkLabel.padStart(6)}  ${e.name.padEnd(30)}  ${fmt(e.total).padStart(14)}`);
}

// Summary stats
const totalDistributed = standings.reduce((s, e) => s + e.total, 0);
const uniqueTotals = new Set(standings.map(e => e.total));
console.log(`\n  Total entries: ${entries.length}`);
console.log(`  Total earnings distributed across all entries: ${fmt(totalDistributed)}`);
console.log(`  Unique earning totals: ${uniqueTotals.size}`);
console.log(`  Pool purse (${entries.length} × $25): ${fmt(entries.length * 25)}`);

// ════════════════════════════════════════════════════════════════════════════
// STEP 5: Check system consistency — do both systems agree?
// ════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(90));
console.log('  CROSS-SYSTEM CONSISTENCY — System 1 vs System 2 per golfer');
console.log('═'.repeat(90));

let crossMatches = 0;
let crossMismatches = 0;
const crossIssues = [];

for (const g of OFFICIAL) {
  const s1 = golferEarnings[g.name] || 0;
  const s2 = golferEarningsSys2[g.name] || 0;
  if (s1 === s2) {
    crossMatches++;
  } else {
    crossMismatches++;
    crossIssues.push({ name: g.name, pos: g.pos, sys1: s1, sys2: s2, diff: s1 - s2 });
  }
}

if (crossIssues.length === 0) {
  console.log(`\n  ✅ Both systems agree for all ${crossMatches} golfers.\n`);
} else {
  console.log(`\n  ⚠️  ${crossMismatches} golfer(s) differ between systems:\n`);
  console.log('  ' + 'Golfer'.padEnd(25) + 'System1'.padStart(14) + 'System2'.padStart(14) + 'Diff'.padStart(14));
  console.log('  ' + DIVIDER);
  for (const d of crossIssues) {
    console.log(
      '  ' + d.name.padEnd(25) + fmt(d.sys1).padStart(14) + fmt(d.sys2).padStart(14) +
      ((d.diff > 0 ? '+' : '') + fmt(d.diff)).padStart(14)
    );
  }
}

console.log('\n' + '═'.repeat(90));
console.log('  VERIFICATION COMPLETE');
console.log('═'.repeat(90) + '\n');
