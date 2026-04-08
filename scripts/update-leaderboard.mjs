/**
 * Manual fallback: update the leaderboard from a CSV file.
 *
 * Usage:
 *   node scripts/update-leaderboard.mjs --purse 21000000 path/to/leaderboard.csv
 *
 * CSV format (header optional):
 *   Golfer Name, Position, Score to Par
 *   Scottie Scheffler, 1, -14
 *   Bryson DeChambeau, T2, -11
 *   Rory McIlroy, T2, -11
 *   Some Cut Guy, MC, +6
 *
 * Position rules:
 *   - "MC", "CUT", "WD", "DQ" → status set to cut/withdrawn (gets $0)
 *   - "T2", "2", "T15" → active
 *
 * Score:
 *   - "E" / blank / "0" → 0
 *   - "+5", "5"          → 5
 *   - "-12"              → -12
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { calculateEarnings } from '../lib/payouts.js';

config({ path: '.env.local' });

function parseArgs() {
  let purse = 21_000_000;
  let csvPath = null;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--purse' && argv[i + 1]) {
      purse = parseInt(argv[i + 1].replace(/[$,_]/g, ''), 10);
      i++;
    } else if (!argv[i].startsWith('--')) {
      csvPath = argv[i];
    }
  }
  if (!csvPath) {
    console.error('Usage: node scripts/update-leaderboard.mjs --purse 21000000 path/to/leaderboard.csv');
    process.exit(1);
  }
  if (!Number.isFinite(purse) || purse <= 0) {
    console.error('Invalid --purse value');
    process.exit(1);
  }
  return { purse, csvPath };
}

function parseScore(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === '' || s === '-' || s === '--') return null;
  if (s.toUpperCase() === 'E') return 0;
  const cleaned = s.replace(/^\+/, '');
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

function statusFromPosition(pos) {
  if (!pos) return 'active';
  const p = String(pos).trim().toUpperCase();
  if (p === 'MC' || p === 'CUT' || p === 'C') return 'cut';
  if (p === 'WD' || p === 'DQ') return 'withdrawn';
  return 'active';
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detect header — if first row has non-numeric position
  const firstCells = lines[0].split(',').map(c => c.trim());
  const looksLikeHeader = /name/i.test(firstCells[0] || '') || /pos/i.test(firstCells[1] || '');
  const start = looksLikeHeader ? 1 : 0;

  const rows = [];
  for (let i = start; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim());
    const name = cells[0];
    const position = cells[1] || '';
    const scoreToPar = parseScore(cells[2]);
    if (!name) continue;

    rows.push({
      golfer_name: name,
      position: position || null,
      score_to_par: scoreToPar,
      today_score: null,
      thru: null,
      status: statusFromPosition(position),
    });
  }
  return rows;
}

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY === 'your-service-role-key-here') {
    console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const { purse, csvPath } = parseArgs();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const text = readFileSync(csvPath, 'utf-8');
  const leaderboard = parseCsv(text);
  console.log(`Parsed ${leaderboard.length} golfers from ${csvPath}`);
  if (leaderboard.length === 0) {
    console.error('No rows parsed.');
    process.exit(1);
  }

  const earnings = calculateEarnings(leaderboard, purse);
  const totalDistributed = Object.values(earnings).reduce((s, v) => s + v, 0);
  console.log(`Calculated earnings (purse $${purse.toLocaleString()}): $${totalDistributed.toLocaleString()} distributed`);

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

  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
