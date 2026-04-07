/**
 * Import entries from Google Form CSV into Supabase
 * 
 * Usage:
 *   node scripts/import-entries.mjs path/to/responses.csv
 * 
 * Or with npm:
 *   npm run import-csv -- path/to/responses.csv
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

function parseCSV(text) {
  const lines = [];
  let current = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === '\n' && !inQ) { if (current.trim()) lines.push(current); current = ''; continue; }
    if (ch === '\r' && !inQ) continue;
    current += ch;
  }
  if (current.trim()) lines.push(current);

  return lines.map(line => {
    const cols = []; let col = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { q = !q; continue; }
      if (c === ',' && !q) { cols.push(col.trim()); col = ''; continue; }
      col += c;
    }
    cols.push(col.trim());
    return cols;
  });
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node scripts/import-entries.mjs <path-to-csv>');
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'your-service-role-key-here') {
    console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY in .env.local');
    console.error('Find it at: Supabase Dashboard → Settings → API → service_role (secret)');
    process.exit(1);
  }

  const text = readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(text);
  
  if (rows.length < 2) {
    console.error('CSV has no data rows');
    process.exit(1);
  }

  // Skip header row
  const dataRows = rows.slice(1);
  console.log(`Found ${dataRows.length} rows in CSV`);

  // Map CSV columns to database fields
  const entries = dataRows
    .map(r => ({
      name: (r[2] || '').trim(),
      email: (r[1] || '').trim(),
      phone: (r[3] || '').trim(),
      group1: (r[4] || '').trim(),
      group2a: (r[5] || '').trim(),
      group2b: (r[6] || '').trim(),
      group3a: (r[7] || '').trim(),
      group3b: (r[8] || '').trim(),
      group4: (r[9] || '').trim(),
      low_amateur: (r[10] || '').trim(),
      winning_score: (r[11] || '').trim(),
      venmo: (r[12] || '').trim(),
      status: 'confirmed',
      submitted_at: r[0] ? new Date(r[0]).toISOString() : null,
    }))
    .filter(e => e.name && !e.name.toLowerCase().startsWith('test'));

  console.log(`${entries.length} valid entries after filtering`);

  // Clear existing entries (fresh import)
  const { error: deleteErr } = await supabase.from('entries').delete().gte('id', 0);
  if (deleteErr) {
    console.error('Error clearing table:', deleteErr.message);
    process.exit(1);
  }
  console.log('Cleared existing entries');

  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const { error } = await supabase.from('entries').insert(batch);
    if (error) {
      console.error(`Error inserting batch at row ${i}:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${entries.length}`);
  }

  console.log(`\n✅ Done! ${inserted} entries imported into Supabase.`);
  console.log('Verify at: https://supabase.com/dashboard → Table Editor → entries');
}

main();
