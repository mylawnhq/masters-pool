import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  detectCompletedRounds,
  parseESPNRoundScores,
  buildPickCounts,
  computeRecapData,
} from '../../../lib/autoRecap.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 15;

const ESPN_EVENT_ID = '401811941';
const ESPN_URL = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?event=${ESPN_EVENT_ID}`;

export async function GET(request) {
  // Auth: same CRON_SECRET pattern as update-scores
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    // Fetch all data in parallel
    const espnFetch = fetch(ESPN_URL, {
      headers: { 'User-Agent': 'masters-pool/1.0' },
    }).then(r => r.json()).catch(() => null);

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
      espnFetch,
    ]);

    const golferRows = golfersRes.data || [];
    const entries = entriesRes.data || [];

    const golfers = new Map();
    golferRows.forEach(g => golfers.set(g.golfer_name, g));

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

    // Detect completed rounds
    const completedRounds = detectCompletedRounds(golferRows);

    // Check for ?force=N query param
    const url = new URL(request.url);
    const forceRound = url.searchParams.get('force');
    const roundsToCompute = forceRound
      ? [parseInt(forceRound, 10)]
      : completedRounds;

    if (roundsToCompute.length === 0) {
      return NextResponse.json({
        message: 'No completed rounds detected',
        currentRound: golferRows[0]?.current_round || null,
        espnCompetitors: competitors.length,
      });
    }

    // Compute recap data for each round
    const results = {};
    for (const round of roundsToCompute) {
      const data = computeRecapData(round, golfers, entries, roundScores, pickCount, analytics);
      results[`round${round}`] = data;
    }

    // Store computed recaps in Supabase kv-style table if it exists,
    // otherwise just return the data. The CLI script handles file writes.
    // Callers (GitHub Actions, manual) can read the response and commit
    // the JSON files to the repo.

    return NextResponse.json({
      message: `Computed recaps for rounds: [${roundsToCompute.join(', ')}]`,
      currentRound: golferRows[0]?.current_round || null,
      completedRounds,
      espnCompetitors: competitors.length,
      roundScoresLoaded: roundScores.size,
      totalEntries: entries.length,
      recaps: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Auto-recap error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 },
    );
  }
}
