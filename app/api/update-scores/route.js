import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateEarnings } from '../../../lib/payouts.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf/mast/leaderboard';
const MASTERS_URL = 'https://www.masters.com/en_US/scores/feeds/2026/scores.json';

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

async function fetchFromMasters() {
  const res = await fetch(MASTERS_URL, {
    headers: { 'User-Agent': 'masters-pool-scraper/1.0' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`masters.com fetch failed: ${res.status} ${res.statusText}`);
  const json = await res.json();

  // The feed structure may vary; try common shapes.
  const players =
    json?.data?.player ||
    json?.data?.players ||
    (Array.isArray(json?.data) ? json.data : null) ||
    json?.players ||
    json?.player ||
    [];

  if (!Array.isArray(players) || players.length === 0) {
    throw new Error('No players found in masters.com response');
  }

  const mapped = players.map(p => {
    const name =
      p.display_name ||
      p.displayName ||
      p.full_name ||
      [p.first_name, p.last_name].filter(Boolean).join(' ').trim() ||
      'Unknown';

    const rawStatus = p.status || p.player_status || '';
    const pos = p.pos || p.position || '';
    const thru = p.thru != null ? String(p.thru) : (p.tee_time ? 'TEE' : '');

    let scoreToPar = parseScore(p.topar ?? p.toPar ?? p.to_par ?? p.score);
    let todayScore = parseScore(p.today ?? p.round_score);

    return {
      golfer_name: name,
      position: pos || null,
      score_to_par: scoreToPar,
      today_score: todayScore,
      thru: thru || null,
      status: normalizeStatus(rawStatus),
    };
  });

  // Sanity check: must have at least some recognizable scoring data.
  const withScores = mapped.filter(g => g.score_to_par != null);
  if (withScores.length === 0) {
    throw new Error('masters.com data parsed but contained no scores');
  }

  return mapped;
}

async function fetchFromESPN() {
  const res = await fetch(ESPN_URL, {
    headers: { 'User-Agent': 'masters-pool-scraper/1.0' },
    cache: 'no-store',
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

    let leaderboard;
    let source;
    let mastersError = null;
    try {
      leaderboard = await fetchFromMasters();
      source = 'masters.com';
    } catch (err) {
      mastersError = err.message || String(err);
      leaderboard = await fetchFromESPN();
      source = 'espn';
    }

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
      mastersError,
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
