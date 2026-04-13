/**
 * One-time seed: inserts all data from lib/historicalData.js into the
 * historical_results Supabase table. Skips if the table already has data
 * to avoid duplicates. Safe to re-run.
 *
 * Usage: node scripts/seed-historical.mjs
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { HISTORICAL_DATA } from '../lib/historicalData.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function main() {
  // Check which years already exist in the table
  const { data: existingRows, error: countErr } = await supabase
    .from('historical_results')
    .select('year');

  if (countErr) {
    console.error('Error checking table:', countErr.message);
    console.log('\nMake sure you\'ve run the migration SQL first:');
    console.log('  scripts/migrations/2026-04-10-historical-results.sql\n');
    process.exit(1);
  }

  const existingYears = new Set((existingRows || []).map(r => String(r.year)));
  console.log('Existing years in DB:', [...existingYears].sort().join(', ') || '(none)');

  const years = Object.keys(HISTORICAL_DATA.years || {});
  let total = 0;

  for (const year of years) {
    if (existingYears.has(year)) {
      console.log(`  ${year}: already in DB, skipping`);
      continue;
    }

    const entry = HISTORICAL_DATA.years[year];
    const pool = entry?.pool || {};
    const results = entry?.results || [];

    if (results.length === 0) {
      console.log(`  ${year}: no results, skipping`);
      continue;
    }

    const rows = results.map(r => ({
      year: parseInt(year),
      finish: r.finish,
      patron_name: r.name,
      earnings: r.earnings,
      entries: pool.entries || results.length,
      pool_purse: pool.purse || 0,
    }));

    // Insert in batches of 500 to stay within Supabase limits
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await supabase.from('historical_results').insert(batch);
      if (error) {
        console.error(`Error inserting ${year} batch ${i}:`, error.message);
        process.exit(1);
      }
    }

    console.log(`  ${year}: ${rows.length} rows inserted`);
    total += rows.length;
  }

  // Verify final state
  const { data: finalRows } = await supabase
    .from('historical_results')
    .select('year');
  const byYear = {};
  (finalRows || []).forEach(r => { byYear[r.year] = (byYear[r.year] || 0) + 1; });
  console.log('\nFinal row counts:');
  Object.entries(byYear).sort(([a], [b]) => a - b).forEach(([y, c]) => {
    console.log(`  ${y}: ${c} rows`);
  });

  console.log(`\n✔ Seeded ${total} new rows. Previous data untouched.`);
}

main();
