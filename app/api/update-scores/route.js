import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateEarnings } from '../../../lib/payouts.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 10;

const MASTERS_URL = 'https://www.masters.com/en_US/scores/feeds/2026/scores.json';
const FETCH_TIMEOUT_MS = 5000;

function normalizeStatus(raw) {
  // masters.com: 'A' = active on course, 'X' = active/not started yet,
  // 'C' = cut, 'W' = withdrawn
  const s = String(raw || '').toUpperCase();
  if (s === 'C') return 'cut';
  if (s === 'W' || s === 'D') return 'withdrawn';
  return 'active';
}

function parseTopar(val) {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (s === '' || s === 'E' || s === 'e') return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

function parseToday(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (s === '' || s === '-' || s === '--') return null;
  if (s === 'E' || s === 'e') return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

async function fetchFromMasters() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(MASTERS_URL, {
      headers: { 'User-Agent': 'masters-pool-scraper/1.0' },
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`masters.com fetch timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw new Error(`masters.com fetch failed: ${err.message || err}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new Error(`masters.com fetch failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const players = json?.data?.player;

  if (!Array.isArray(players) || players.length === 0) {
    throw new Error('No players found in masters.com response');
  }

  return players.map(p => {
    const name = p.full_name || 'Unknown';
    const pos = p.pos || '';
    const thruRaw = p.thru != null ? String(p.thru).trim() : '';
    const thru = thruRaw !== '' ? thruRaw : (p.teetime ? String(p.teetime) : '');

    return {
      golfer_name: name,
      position: pos || null,
      score_to_par: parseTopar(p.topar),
      today_score: parseToday(p.today),
      thru: thru || null,
      status: normalizeStatus(p.status),
    };
  });
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (process.env.NEXT_PUBLIC_SCORES_LIVE !== 'true') {
    return NextResponse.json({ message: 'Scores not live yet' });
  }

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    const purse = parseInt(process.env.MASTERS_PURSE || '21000000', 10);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const leaderboard = await fetchFromMasters();
    const source = 'masters.com';

    const earnings = calculateEarnings(leaderboard, purse);

    const now = new Date().toISOString();
    const lbRows = leaderboard.map(g => ({ ...g, updated_at: now }));

    const { error: lbErr } = await supabase
      .from('golfer_leaderboard')
      .upsert(lbRows, { onConflict: 'golfer_name' });
    if (lbErr) throw new Error(`golfer_leaderboard upsert failed: ${lbErr.message}`);

    const { error: delErr } = await supabase
      .from('golfer_earnings')
      .delete()
      .gte('id', 0);
    if (delErr) throw new Error(`golfer_earnings clear failed: ${delErr.message}`);

    const earningsRows = Object.entries(earnings).map(([golfer_name, val]) => ({
      golfer_name,
      earnings: val,
    }));
    const { error: insErr } = await supabase
      .from('golfer_earnings')
      .insert(earningsRows);
    if (insErr) throw new Error(`golfer_earnings insert failed: ${insErr.message}`);

    const leader =
      [...leaderboard]
        .filter(g => g.status === 'active' && g.score_to_par != null)
        .sort((a, b) => a.score_to_par - b.score_to_par)[0] || null;

    return NextResponse.json({
      success: true,
      source,
      golfersUpdated: leaderboard.length,
      leader: leader
        ? {
            name: leader.golfer_name,
            score_to_par: leader.score_to_par,
            position: leader.position,
          }
        : null,
      timestamp: now,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
