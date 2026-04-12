import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import https from 'https';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Import payout logic
const { getPayoutForPosition } = await import(resolve(__dirname, '..', 'lib', 'mastersPayout.js'));

const PICK_COLS = ['group1', 'group2a', 'group2b', 'group3a', 'group3b', 'group4'];
const AUGUSTA_PARS = [4,5,4,3,4,3,4,5,4,4,4,3,5,4,5,3,4,4];

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'masters-pool/1.0' } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

// ── Fetch all data in parallel ───────────────────────────────────────────

const [golfersRes, entriesRes, pvTodayRes, pvAllRes, espnData] = await Promise.all([
  supabase.from('golfer_leaderboard')
    .select('golfer_name, position, score_to_par, today_score, status, thru, current_round_scores, current_round'),
  supabase.from('entries')
    .select('id, name, group1, group2a, group2b, group3a, group3b, group4, status')
    .eq('status', 'confirmed'),
  supabase.from('page_views')
    .select('id', { count: 'exact', head: true })
    .gte('timestamp', new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString())
    .eq('event_type', 'pageview'),
  supabase.from('page_views').select('visitor_id').eq('event_type', 'pageview'),
  httpGet('https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?event=401811941').catch(() => null),
]);

const golfers = new Map();
(golfersRes.data || []).forEach(g => golfers.set(g.golfer_name, g));
const entries = entriesRes.data || [];

// ── Parse ESPN round-by-round scores for all 3 rounds ─────────────────

const roundScores = new Map(); // name → { r1, r2, r3, birdies per round }

// Try ESPN scoreboard for per-round data
const competitors = espnData?.events?.[0]?.competitions?.[0]?.competitors
  || espnData?.competitions?.[0]?.competitors
  || [];

competitors.forEach(c => {
  const name = c.athlete?.displayName;
  if (!name) return;
  const linescores = c.linescores || [];
  const r1 = linescores[0]; const r2 = linescores[1]; const r3 = linescores[2];

  function parseVsPar(s) {
    if (s == null || s === '-' || s === '--') return null;
    if (s === 'E' || s === 'e') return 0;
    const n = parseInt(s, 10); return Number.isFinite(n) ? n : null;
  }

  function countBirdiesFromHoles(round) {
    let birdies = 0, eagles = 0;
    (round?.linescores || []).forEach(h => {
      if (h?.value != null && h.period >= 1 && h.period <= 18) {
        const par = AUGUSTA_PARS[h.period - 1];
        if (h.value < par) {
          if (h.value <= par - 2) eagles++; else birdies++;
        }
      }
    });
    return { birdies, eagles };
  }

  const r1b = countBirdiesFromHoles(r1);
  const r2b = countBirdiesFromHoles(r2);
  const r3b = countBirdiesFromHoles(r3);

  roundScores.set(name, {
    r1: parseVsPar(r1?.displayValue),
    r2: parseVsPar(r2?.displayValue),
    r3: parseVsPar(r3?.displayValue),
    r1Birdies: r1b.birdies, r1Eagles: r1b.eagles,
    r2Birdies: r2b.birdies, r2Eagles: r2b.eagles,
    r3Birdies: r3b.birdies, r3Eagles: r3b.eagles,
    totalBirdies: r1b.birdies + r2b.birdies + r3b.birdies,
    totalEagles: r1b.eagles + r2b.eagles + r3b.eagles,
  });
});

// Fallback: count birdies from current_round_scores in DB (R3 only) for golfers
// not found in ESPN data
for (const [name, g] of golfers) {
  if (!roundScores.has(name) && g.current_round_scores) {
    const holes = g.current_round_scores;
    let birdies = 0, eagles = 0;
    (Array.isArray(holes) ? holes : []).forEach((h, i) => {
      if (!h) return;
      const strokes = typeof h === 'number' ? h : h?.strokes;
      if (strokes != null && i < 18) {
        const par = AUGUSTA_PARS[i];
        if (strokes < par) { if (strokes <= par - 2) eagles++; else birdies++; }
      }
    });
    roundScores.set(name, {
      r1: null, r2: null, r3: g.today_score,
      r1Birdies: 0, r2Birdies: 0, r3Birdies: birdies,
      r1Eagles: 0, r2Eagles: 0, r3Eagles: eagles,
      totalBirdies: birdies, totalEagles: eagles,
    });
  }
}

// ── Pick counts ──────────────────────────────────────────────────────────

const pickCount = new Map();
entries.forEach(e => { PICK_COLS.forEach(col => { const g = e[col]; if (g) pickCount.set(g, (pickCount.get(g) || 0) + 1); }); });

// ── Helpers ──────────────────────────────────────────────────────────────

function lastName(f) { const p = (f || '').split(' '); return p[p.length - 1]; }
function fmtM(n) { return n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${n}`; }

// ── Earnings-based ranking ──────────────────────────────────────────────

function buildPositionCounts() {
  const positionCounts = {};
  for (const g of golfers.values()) {
    if (g.status === 'cut' || g.status === 'withdrawn') continue;
    const pos = g.position;
    if (!pos) continue;
    const num = parseInt(String(pos).replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(num)) positionCounts[num] = (positionCounts[num] || 0) + 1;
  }
  return positionCounts;
}

function teamEarnings(e, positionCounts) {
  let total = 0;
  for (const col of PICK_COLS) {
    const g = golfers.get(e[col]);
    if (!g) continue;
    if (g.status === 'cut' || g.status === 'withdrawn') continue;
    const posStr = g.position;
    const posNum = posStr ? parseInt(String(posStr).replace(/[^\d]/g, ''), 10) : null;
    if (!Number.isFinite(posNum)) continue;
    const tied = positionCounts[posNum] || 1;
    total += getPayoutForPosition(posNum, tied);
  }
  return total;
}

function rankByEarnings(entries, positionCounts) {
  const scored = entries.map(e => ({ ...e, earnings: teamEarnings(e, positionCounts) }));
  scored.sort((a, b) => b.earnings - a.earnings);
  let cr = 1;
  scored.forEach((e, i) => {
    if (i > 0 && e.earnings < scored[i - 1].earnings) cr = i + 1;
    e.rank = cr;
  });
  const rc = {}; scored.forEach(e => { rc[e.rank] = (rc[e.rank] || 0) + 1; });
  scored.forEach(e => { e.posLabel = (rc[e.rank] > 1 ? 'T' : '') + e.rank; });
  return scored;
}

// Current R3 standings
const posCounts = buildPositionCounts();
const r3Ranked = rankByEarnings(entries, posCounts);

// ── 1. Top 5 pool standings after R3 ────────────────────────────────────

const top5 = r3Ranked.slice(0, 5).map(e => ({
  rank: e.posLabel,
  name: e.name,
  picks: PICK_COLS.map(col => lastName(e[col])).join(' · '),
  totalEarnings: e.earnings,
  totalEarningsFmt: fmtM(e.earnings),
}));

// ── R2 standings (simulate by removing R3 scores) ───────────────────────
// We rebuild a "what-if" leaderboard without R3 scores to derive R2 positions.
// Use ESPN R3 round score when available, fall back to DB today_score.

// Build hypothetical R2-end golfer data
const r2Golfers = new Map();
for (const [name, g] of golfers) {
  const r2g = { ...g };
  if (g.status !== 'cut' && g.status !== 'withdrawn') {
    // Prefer ESPN R3 score, fall back to DB today_score
    const r3Score = roundScores.get(name)?.r3 ?? g.today_score;
    if (r3Score != null) {
      r2g.score_to_par_r2 = (g.score_to_par || 0) - r3Score;
    } else {
      r2g.score_to_par_r2 = g.score_to_par;
    }
  } else {
    r2g.score_to_par_r2 = g.score_to_par;
  }
  r2Golfers.set(name, r2g);
}

// Sort active golfers by R2 score to assign hypothetical R2 positions
const r2ActiveSorted = [...r2Golfers.values()]
  .filter(g => g.status !== 'cut' && g.status !== 'withdrawn' && g.score_to_par_r2 != null)
  .sort((a, b) => a.score_to_par_r2 - b.score_to_par_r2);

// Assign hypothetical positions with ties
let pos = 1;
r2ActiveSorted.forEach((g, i) => {
  if (i > 0 && g.score_to_par_r2 > r2ActiveSorted[i - 1].score_to_par_r2) pos = i + 1;
  g.hypotheticalPos = pos;
});
const r2PosCounts = {};
r2ActiveSorted.forEach(g => { r2PosCounts[g.hypotheticalPos] = (r2PosCounts[g.hypotheticalPos] || 0) + 1; });

// Store hypothetical positions back
const r2PosMap = new Map();
r2ActiveSorted.forEach(g => r2PosMap.set(g.golfer_name, { pos: g.hypotheticalPos, tied: r2PosCounts[g.hypotheticalPos] || 1 }));

function teamEarningsR2(e) {
  let total = 0;
  for (const col of PICK_COLS) {
    const g = golfers.get(e[col]);
    if (!g) continue;
    if (g.status === 'cut' || g.status === 'withdrawn') continue;
    const r2Info = r2PosMap.get(e[col]);
    if (!r2Info) continue;
    total += getPayoutForPosition(r2Info.pos, r2Info.tied);
  }
  return total;
}

function rankByEarningsR2(entries) {
  const scored = entries.map(e => ({ ...e, earnings: teamEarningsR2(e) }));
  scored.sort((a, b) => b.earnings - a.earnings);
  let cr = 1;
  scored.forEach((e, i) => {
    if (i > 0 && e.earnings < scored[i - 1].earnings) cr = i + 1;
    e.rank = cr;
  });
  return scored;
}

const r2Ranked = rankByEarningsR2(entries);
const r2RankMap = new Map(); r2Ranked.forEach(e => r2RankMap.set(e.name, e.rank));

// ── 4/5. Comeback Kid & Reverse Comeback ────────────────────────────────

const deltas = r3Ranked.map(e => ({
  name: e.name,
  r2Pos: r2RankMap.get(e.name) || 999,
  r3Pos: e.rank,
  delta: (r2RankMap.get(e.name) || 999) - e.rank,
}));
deltas.sort((a, b) => b.delta - a.delta);
const comebackKid = deltas[0];
deltas.sort((a, b) => a.delta - b.delta);
const reverseComeback = deltas[0];

// ── 2. Best golfer R3 ──────────────────────────────────────────────────

const golferArr = [...golfers.values()];
// Use ESPN R3 score, fall back to DB today_score
const activeR3 = golferArr
  .filter(g => g.status !== 'cut' && g.status !== 'withdrawn')
  .map(g => ({ ...g, r3Score: roundScores.get(g.golfer_name)?.r3 ?? g.today_score }))
  .filter(g => g.r3Score != null)
  .filter(g => (pickCount.get(g.golfer_name) || 0) >= 10);

const bestR3 = [...activeR3].sort((a, b) => a.r3Score - b.r3Score)[0] || null;

// ── 3. Worst golfer R3 (weighted by teams picked) ──────────────────────

const worstR3 = [...activeR3].sort((a, b) => {
  const ad = a.r3Score * (pickCount.get(a.golfer_name) || 0);
  const bd = b.r3Score * (pickCount.get(b.golfer_name) || 0);
  return bd - ad;
})[0] || null;

// ── 6. Most birdies R1+R2+R3 ───────────────────────────────────────────

const birdieBoard = [...roundScores.entries()]
  .filter(([name]) => { const g = golfers.get(name); return g && g.status !== 'cut' && g.status !== 'withdrawn'; })
  .map(([name, rs]) => ({
    name,
    r1Birdies: rs.r1Birdies, r2Birdies: rs.r2Birdies, r3Birdies: rs.r3Birdies,
    totalBirdies: rs.totalBirdies, totalEagles: rs.totalEagles,
    total: rs.totalBirdies + rs.totalEagles,
    picks: pickCount.get(name) || 0,
  }))
  .sort((a, b) => b.total - a.total);

// ── 7. Teams with 3+ golfers in top 10 ─────────────────────────────────

const top10Golfers = new Set();
for (const g of golfers.values()) {
  if (g.status === 'cut' || g.status === 'withdrawn') continue;
  const posNum = g.position ? parseInt(String(g.position).replace(/[^\d]/g, ''), 10) : null;
  if (Number.isFinite(posNum) && posNum <= 10) top10Golfers.add(g.golfer_name);
}

const teamsWith3PlusTop10 = entries.map(e => {
  const inTop10 = PICK_COLS
    .filter(col => top10Golfers.has(e[col]))
    .map(col => {
      const g = golfers.get(e[col]);
      return { golfer: e[col], position: g?.position };
    });
  return { name: e.name, count: inTop10.length, golfers: inTop10 };
}).filter(e => e.count >= 3).sort((a, b) => b.count - a.count);

// ── 8. Analytics ────────────────────────────────────────────────────────

const todayVisits = pvTodayRes.count || 0;
const uniqueVisitors = new Set((pvAllRes.data || []).map(r => r.visitor_id)).size;

// ── Output ──────────────────────────────────────────────────────────────

const output = {
  _meta: {
    generatedAt: new Date().toISOString(),
    round: 3,
    totalEntries: entries.length,
    totalGolfers: golfers.size,
    golfersMadeCut: golferArr.filter(g => g.status !== 'cut' && g.status !== 'withdrawn').length,
    golfersMissedCut: golferArr.filter(g => g.status === 'cut').length,
    espnCompetitorsFound: competitors.length,
    roundScoresLoaded: roundScores.size,
  },

  top5PoolStandings: top5,

  bestGolferR3: bestR3 ? {
    name: bestR3.golfer_name,
    r3Score: bestR3.r3Score,
    totalScoreToPar: bestR3.score_to_par,
    position: bestR3.position,
    teamsPicked: pickCount.get(bestR3.golfer_name) || 0,
  } : null,

  worstGolferR3: worstR3 ? {
    name: worstR3.golfer_name,
    r3Score: worstR3.r3Score,
    totalScoreToPar: worstR3.score_to_par,
    position: worstR3.position,
    teamsPicked: pickCount.get(worstR3.golfer_name) || 0,
  } : null,

  comebackKid: comebackKid ? {
    name: comebackKid.name,
    r2Pos: comebackKid.r2Pos,
    r3Pos: comebackKid.r3Pos,
    delta: comebackKid.delta,
  } : null,

  reverseComeback: reverseComeback ? {
    name: reverseComeback.name,
    r2Pos: reverseComeback.r2Pos,
    r3Pos: reverseComeback.r3Pos,
    delta: reverseComeback.delta,
  } : null,

  mostBirdiesR1R2R3: birdieBoard.slice(0, 5),

  teamsWith3PlusGolfersInTop10: {
    count: teamsWith3PlusTop10.length,
    entries: teamsWith3PlusTop10,
  },

  analytics: {
    todayVisits,
    uniqueVisitorsAllTime: uniqueVisitors,
  },
};

console.log(JSON.stringify(output, null, 2));
