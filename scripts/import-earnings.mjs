/**
 * Import golfer earnings into Supabase after tournament
 * 
 * Usage:
 *   node scripts/import-earnings.mjs path/to/earnings.csv
 * 
 * CSV format (two columns):
 *   Golfer Name, Earnings
 *   Scottie Scheffler, 4200000
 *   Bryson DeChambeau, 2268000
 *   ...
 * 
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node scripts/import-earnings.mjs <path-to-csv>');
    console.error('\nCSV format (two columns):');
    console.error('  Golfer Name, Earnings');
    console.error('  Scottie Scheffler, 4200000');
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'your-service-role-key-here') {
    console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const text = readFileSync(csvPath, 'utf-8');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Detect if first row is a header
  const firstVal = lines[0].split(',')[1]?.trim().replace(/[$,]/g, '');
  const start = isNaN(parseFloat(firstVal)) ? 1 : 0;

  const earnings = [];
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const name = parts[0]?.trim();
    const val = parseFloat((parts[1] || '').trim().replace(/[$,]/g, ''));
    if (name && !isNaN(val)) {
      earnings.push({ golfer_name: name, earnings: val });
    }
  }

  console.log(`Found ${earnings.length} golfer earnings`);

  // Clear existing earnings
  const { error: deleteErr } = await supabase.from('golfer_earnings').delete().gte('id', 0);
  if (deleteErr) {
    console.error('Error clearing table:', deleteErr.message);
    process.exit(1);
  }

  // Insert all
  const { error } = await supabase.from('golfer_earnings').insert(earnings);
  if (error) {
    console.error('Error inserting:', error.message);
    process.exit(1);
  }

  console.log(`\n✅ Done! ${earnings.length} golfer earnings imported.`);
  console.log('The leaderboard will auto-update within 60 seconds.');
  console.log('To force immediate update, redeploy on Vercel or visit the site.');
}

main();
