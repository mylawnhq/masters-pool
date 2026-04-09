// Adds the round1_scores jsonb column to golfer_leaderboard.
// Idempotent — safe to run multiple times. Requires SUPABASE_SERVICE_ROLE_KEY
// and NEXT_PUBLIC_SUPABASE_URL to be set in .env.local.
import { config } from 'dotenv';
config({ path: '.env.local' });

const SQL = `ALTER TABLE golfer_leaderboard ADD COLUMN IF NOT EXISTS round1_scores jsonb DEFAULT null;`;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Try via the SQL HTTP endpoint exposed by supabase-js's PostgREST.
// PostgREST itself can't run DDL, so we use the management API's `query`
// endpoint via the database URL. The simplest portable approach is to
// dispatch through pg via a small fetch to the supabase REST `rpc` if
// the project has a `query` function — but we don't. Instead, prefer the
// supabase-js client and an `rpc('exec', { sql })` if available, otherwise
// fall back to printing the SQL and instructions.
try {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, key);
  // Try a stored function named `exec_sql` (common helper in self-managed
  // projects). If it doesn't exist, we'll fall through to manual instructions.
  const { error } = await supabase.rpc('exec_sql', { sql: SQL });
  if (error) throw error;
  console.log('✔ round1_scores column ensured via exec_sql RPC');
} catch (err) {
  console.log('Could not run DDL automatically:', err?.message || err);
  console.log('\nRun this SQL in the Supabase SQL editor:\n');
  console.log('  ' + SQL + '\n');
  process.exit(2);
}
