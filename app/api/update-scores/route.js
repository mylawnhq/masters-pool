import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateEarnings } from '../../../lib/payouts.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 10;

// ESPN's Masters leaderboard feed. The event query pins it to the 2026 Masters.
const ESPN_EVENT_ID = '401811941';
const ESPN_URL = `https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?event=${ESPN_EVENT_ID}`;
// ESPN's hole-by-hole scorecard endpoint. The player ID in the path is a no-op
// for this endpoint — the response contains every competitor in the field, so
// one fetch covers the whole leaderboard.
const ESPN_SCORECARDS_URL = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard/players/10046/scorecard?event=${ESPN_EVENT_ID}`;
const FETCH_TIMEOUT_MS = 7000;

function normalizeStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (!s) return 'active';
  if (s.includes('cut') || s === 'mc') return 'cut';
  if (s.includes('withdraw') || s === 'wd') return 'withdrawn';
  if (s.includes('disqualif') || s === 'dq') return 'withdrawn';
  return 'active';
}

function parseScore(val) {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (s === '' || s === '-' || s === '--') return null;
  if (s === 'E' || s === 'e') return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function formatTeeTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  // Convert UTC to US Eastern (Masters is in GA). April = EDT, UTC-4.
  const easternHours = (hours - 4 + 24) % 24;
  const period = easternHours >= 12 ? 'PM' : 'AM';
  const displayHour = easternHours % 12 === 0 ? 12 : easternHours % 12;
  const mm = String(minutes).padStart(2, '0');
  return `${displayHour}:${mm} ${period}`;
}

// Detect the current round number from the ESPN leaderboard competition status.
// ESPN returns status.type.detail like "Round 2 - In Progress" or
// "Round 1 - Complete". We parse the round number out of it. Falls back to 1
// if the field doesn't match.
function detectCurrentRound(competition) {
  const detail =
    competition?.status?.type?.detail ||
    competition?.status?.type?.shortDetail ||
    '';
  const match = detail.match(/Round\s+(\d)/i);
  return match ? parseInt(match[1], 10) : 1;
}

// Fetches hole-by-hole scores for all competitors in one shot. `activeRound`
// (1-based) controls which round's inner linescores[] are extracted so the
// scorecard tracks the live round, not just Round 1. Returns a Map keyed by
// lowercased golfer name → 18-element array of { strokes, scoreType } | null,
// or `null` if the call fails.
async function fetchScorecardsFromESPN(activeRound) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(ESPN_SCORECARDS_URL, {
      headers: { 'User-Agent': 'masters-pool-scraper/1.0' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`ESPN scorecard fetch failed: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    const competitors = json?.competitions?.[0]?.competitors || [];
    if (competitors.length === 0) return null;

    const roundIndex = (activeRound || 1) - 1; // 0-based

    const map = new Map();
    competitors.forEach(c => {
      const name = c?.athlete?.displayName || c?.athlete?.fullName;
      if (!name) return;

      // Pick the active round's data. ESPN populates linescores as an array
      // with one entry per round (period 1-4). Index into it with the
      // detected round.
      const roundData = c?.linescores?.[roundIndex];
      const holeEntries = Array.isArray(roundData?.linescores) ? roundData.linescores : [];

      // Build a fixed-length 18-slot array. Each slot is either null
      // (hole not yet played) or { strokes, scoreType } where scoreType is
      // the par-relative string ESPN returns ("E", "-1", "+1", "+2", ...).
      const holes = new Array(18).fill(null);
      holeEntries.forEach(h => {
        const idx = (typeof h?.period === 'number' ? h.period : parseInt(h?.period, 10)) - 1;
        if (idx < 0 || idx >= 18) return;
        const strokes = typeof h?.value === 'number'
          ? h.value
          : (h?.displayValue != null ? parseInt(h.displayValue, 10) : null);
        if (!Number.isFinite(strokes)) return;
        holes[idx] = {
          strokes,
          scoreType: h?.scoreType?.displayValue ?? null,
        };
      });

      map.set(name.toLowerCase(), holes);
    });
    return map;
  } catch (err) {
    // Swallow — caller will treat as "no scorecards this cycle".
    console.warn('[update-scores] scorecards fetch failed:', err?.message || err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Returns { leaderboard, currentRound } where currentRound is 1-4.
async function fetchFromESPN() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(ESPN_URL, {
      headers: { 'User-Agent': 'masters-pool-scraper/1.0' },
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`ESPN fetch timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw new Error(`ESPN fetch failed: ${err.message || err}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new Error(`ESPN fetch failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const event = json?.events?.[0];
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];

  if (competitors.length === 0) {
    throw new Error('No competitors found in ESPN response');
  }

  const currentRound = detectCurrentRound(competition);

  // ESPN publishes the live projected cut score at tournament level.
  // It's an integer representing score-to-par (e.g. 3 means +3).
  const cutScore =
    typeof event?.tournament?.cutScore === 'number'
      ? event.tournament.cutScore
      : null;

  const leaderboard = competitors.map(c => {
    const name = c.athlete?.displayName || c.athlete?.fullName || 'Unknown';

    const positionDisplay =
      c.status?.position?.displayName ||
      c.status?.position?.id ||
      '';
    const position = positionDisplay && positionDisplay !== '-' ? positionDisplay : null;

    // score_to_par: prefer c.score, fall back to statistics.scoreToPar.
    let scoreToPar = parseScore(c.score);
    if (scoreToPar == null) {
      const stp = (c.statistics || []).find(
        s => s?.name === 'scoreToPar' || s?.displayName === 'To Par'
      );
      if (stp) scoreToPar = parseScore(stp.displayValue ?? stp.value);
    }

    // today's score
    let todayScore = null;
    const todayStat = (c.statistics || []).find(
      s =>
        s?.name === 'today' ||
        s?.displayName === 'Today' ||
        s?.shortDisplayName === 'TODAY'
    );
    if (todayStat) todayScore = parseScore(todayStat.displayValue ?? todayStat.value);

    // thru: integer holes played; 0 with teeTime means not started yet.
    const thruVal = c.status?.thru;
    let thru = null;
    if (thruVal != null && thruVal !== 0 && thruVal !== '0') {
      thru = String(thruVal);
    } else if (c.status?.teeTime) {
      thru = formatTeeTime(c.status.teeTime) || 'TEE';
    }

    const rawStatus =
      c.status?.type?.name ||
      c.status?.type?.description ||
      c.status?.displayValue ||
      '';

    return {
      golfer_name: name,
      position,
      score_to_par: scoreToPar,
      today_score: todayScore,
      thru,
      status: normalizeStatus(rawStatus),
    };
  });

  return { leaderboard, currentRound, cutScore };
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

    // Fetch leaderboard first to detect the current round, then pass it to
    // the scorecard parser so it pulls the right round's hole data.
    const { leaderboard, currentRound, cutScore } = await fetchFromESPN();

    // Scorecard fetch uses the detected round — best-effort, failures don't
    // break the main upsert.
    const scorecards = await fetchScorecardsFromESPN(currentRound);
    const source = 'espn';

    const earnings = calculateEarnings(leaderboard, purse);

    const now = new Date().toISOString();
    // Only stamp current_round_scores / current_round when the scorecard
    // fetch succeeded — otherwise we leave the existing column values alone
    // instead of nuking them to null.
    const lbRows = leaderboard.map(g => {
      const row = { ...g, updated_at: now, cut_line: cutScore };
      if (scorecards) {
        row.current_round_scores = scorecards.get(g.golfer_name.toLowerCase()) ?? null;
        row.current_round = currentRound;
      }
      return row;
    });

    let { error: lbErr } = await supabase
      .from('golfer_leaderboard')
      .upsert(lbRows, { onConflict: 'golfer_name' });
    // If the new columns haven't been migrated yet, retry without them so
    // live scoring keeps working until the DDL is applied.
    if (lbErr && /current_round|cut_line/i.test(lbErr.message || '')) {
      const slim = lbRows.map(({ current_round_scores, current_round, cut_line, ...rest }) => rest);
      const retry = await supabase
        .from('golfer_leaderboard')
        .upsert(slim, { onConflict: 'golfer_name' });
      lbErr = retry.error;
    }
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
      currentRound,
      cutScore,
      golfersUpdated: leaderboard.length,
      scorecardsLoaded: scorecards ? scorecards.size : 0,
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
