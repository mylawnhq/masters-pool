/**
 * Auto-recap computation engine.
 *
 * Shared logic used by both scripts/auto-recap.mjs (CLI) and
 * app/api/auto-recap/route.js (cron). Computes the RecapCard data
 * object for each completed round and returns it ready to write to
 * data/recap-r{N}.json.
 *
 * Design: pure functions that accept pre-fetched data so the caller
 * controls where data comes from (Supabase, ESPN, etc.).
 */

import { getPayoutForPosition } from './mastersPayout.js';

const PICK_COLS = ['group1', 'group2a', 'group2b', 'group3a', 'group3b', 'group4'];
const AUGUSTA_PARS = [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4];

// ── Helpers ──────────────────────────────────────────────────────────────

function lastName(f) {
  const p = (f || '').split(' ');
  return p[p.length - 1];
}

function fmtM(n) {
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`;
}

function fmtPar(n) {
  if (n === 0) return 'E';
  return n > 0 ? `+${n}` : `${n}`;
}

function parseVsPar(s) {
  if (s == null || s === '-' || s === '--') return null;
  if (s === 'E' || s === 'e') return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function isMC(g) {
  return g.status === 'cut' || g.status === 'withdrawn';
}

function parsePosNum(posStr) {
  if (!posStr) return null;
  const n = parseInt(String(posStr).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

// ── Round completion detection ──────────────────────────────────────────

function isThruComplete(thru) {
  const t = String(thru || '').trim().toUpperCase();
  return t === '18' || t === 'F';
}

/**
 * Detect which rounds are complete.
 * Returns an array of round numbers (1, 2, 3) that are done.
 */
export function detectCompletedRounds(golferRows) {
  const activeGolfers = golferRows.filter(g => g.status === 'active');
  const currentRound = golferRows.find(g => g.current_round != null)?.current_round ?? 1;
  const anyCut = golferRows.some(g => g.status === 'cut');

  const completed = [];

  // R1 is complete if current_round >= 2
  if (currentRound >= 2) completed.push(1);

  // R2 is complete if current_round >= 3, OR if current_round === 2 and
  // all active golfers finished, OR any golfer is cut
  if (currentRound >= 3) {
    completed.push(2);
  } else if (currentRound === 2 && activeGolfers.length > 0) {
    const allDone = activeGolfers.every(g => isThruComplete(g.thru));
    if (allDone || anyCut) completed.push(2);
  }

  // R3 is complete if current_round >= 4, OR if current_round === 3 and
  // all active golfers finished
  if (currentRound >= 4) {
    completed.push(3);
  } else if (currentRound === 3 && activeGolfers.length > 0) {
    const allDone = activeGolfers.every(g => isThruComplete(g.thru));
    if (allDone) completed.push(3);
  }

  return completed;
}

// ── ESPN round score parsing ────────────────────────────────────────────

export function parseESPNRoundScores(competitors) {
  const roundScores = new Map();

  (competitors || []).forEach(c => {
    const name = c.athlete?.displayName;
    if (!name) return;
    const linescores = c.linescores || [];

    function countBirdies(round) {
      let birdies = 0, eagles = 0;
      (round?.linescores || []).forEach(h => {
        if (h?.value != null && h.period >= 1 && h.period <= 18) {
          const par = AUGUSTA_PARS[h.period - 1];
          if (h.value < par) {
            if (h.value <= par - 2) eagles++;
            else birdies++;
          }
        }
      });
      return { birdies, eagles };
    }

    const scores = {};
    const birdies = {};
    for (let r = 0; r < 4; r++) {
      const round = linescores[r];
      const rKey = `r${r + 1}`;
      scores[rKey] = parseVsPar(round?.displayValue);
      const b = countBirdies(round);
      birdies[`${rKey}Birdies`] = b.birdies;
      birdies[`${rKey}Eagles`] = b.eagles;
    }

    roundScores.set(name, { ...scores, ...birdies });
  });

  return roundScores;
}

// ── Pick counts ─────────────────────────────────────────────────────────

export function buildPickCounts(entries) {
  const pickCount = new Map();
  entries.forEach(e => {
    PICK_COLS.forEach(col => {
      const g = e[col];
      if (g) pickCount.set(g, (pickCount.get(g) || 0) + 1);
    });
  });
  return pickCount;
}

// ── Earnings-based ranking ──────────────────────────────────────────────

function buildPositionCounts(golfers) {
  const counts = {};
  for (const g of golfers.values()) {
    if (isMC(g)) continue;
    const num = parsePosNum(g.position);
    if (num != null) counts[num] = (counts[num] || 0) + 1;
  }
  return counts;
}

function teamEarnings(e, golfers, posCounts) {
  let total = 0;
  for (const col of PICK_COLS) {
    const g = golfers.get(e[col]);
    if (!g || isMC(g)) continue;
    const posNum = parsePosNum(g.position);
    if (posNum == null) continue;
    total += getPayoutForPosition(posNum, posCounts[posNum] || 1);
  }
  return total;
}

function rankByEarnings(entries, golfers, posCounts) {
  const scored = entries.map(e => ({
    ...e,
    earnings: teamEarnings(e, golfers, posCounts),
  }));
  scored.sort((a, b) => b.earnings - a.earnings);
  let cr = 1;
  scored.forEach((e, i) => {
    if (i > 0 && e.earnings < scored[i - 1].earnings) cr = i + 1;
    e.rank = cr;
  });
  const rc = {};
  scored.forEach(e => { rc[e.rank] = (rc[e.rank] || 0) + 1; });
  scored.forEach(e => { e.posLabel = (rc[e.rank] > 1 ? 'T' : '') + e.rank; });
  return scored;
}

// ── Score-to-par ranking (for R1 standings) ─────────────────────────────

function teamScoreVsPar(e, golfers, roundScores, roundKey) {
  let s = 0;
  for (const col of PICK_COLS) {
    const g = golfers.get(e[col]);
    if (!g) continue;
    if (isMC(g)) continue;
    // Sum the specific round's score for each golfer
    const rs = roundScores.get(e[col]);
    const roundScore = rs?.[roundKey];
    if (roundScore != null) {
      s += roundScore;
    } else {
      // Fallback: use overall score_to_par (only works for R1 before R2 starts)
      s += g.score_to_par || 0;
    }
  }
  return s;
}

function rankByScore(entries, scoreFn) {
  const scored = entries.map(e => ({ ...e, teamScore: scoreFn(e) }));
  scored.sort((a, b) => a.teamScore - b.teamScore);
  let cr = 1;
  scored.forEach((e, i) => {
    if (i > 0 && e.teamScore > scored[i - 1].teamScore) cr = i + 1;
    e.rank = cr;
  });
  const rc = {};
  scored.forEach(e => { rc[e.rank] = (rc[e.rank] || 0) + 1; });
  scored.forEach(e => { e.posLabel = (rc[e.rank] > 1 ? 'T' : '') + e.rank; });
  return scored;
}

// ── Hypothetical previous-round standings ───────────────────────────────

function buildHypotheticalPrevRound(golfers, roundScores, roundKey) {
  // Subtract current round score from total to get previous-round-end score
  const hypothetical = new Map();
  for (const [name, g] of golfers) {
    const h = { ...g };
    if (!isMC(g)) {
      const roundScore = roundScores.get(name)?.[roundKey];
      if (roundScore != null) {
        h.score_to_par_prev = (g.score_to_par || 0) - roundScore;
      } else {
        h.score_to_par_prev = g.score_to_par;
      }
    } else {
      h.score_to_par_prev = g.score_to_par;
    }
    hypothetical.set(name, h);
  }

  // Sort active golfers by prev score to assign positions
  const sorted = [...hypothetical.values()]
    .filter(g => !isMC(g) && g.score_to_par_prev != null)
    .sort((a, b) => a.score_to_par_prev - b.score_to_par_prev);

  let pos = 1;
  sorted.forEach((g, i) => {
    if (i > 0 && g.score_to_par_prev > sorted[i - 1].score_to_par_prev) pos = i + 1;
    g.hypotheticalPos = pos;
  });
  const posCounts = {};
  sorted.forEach(g => { posCounts[g.hypotheticalPos] = (posCounts[g.hypotheticalPos] || 0) + 1; });

  const posMap = new Map();
  sorted.forEach(g => posMap.set(g.golfer_name, { pos: g.hypotheticalPos, tied: posCounts[g.hypotheticalPos] || 1 }));
  return posMap;
}

function rankByHypotheticalEarnings(entries, golfers, posMap) {
  const scored = entries.map(e => {
    let total = 0;
    for (const col of PICK_COLS) {
      const g = golfers.get(e[col]);
      if (!g || isMC(g)) continue;
      const info = posMap.get(e[col]);
      if (!info) continue;
      total += getPayoutForPosition(info.pos, info.tied);
    }
    return { ...e, earnings: total };
  });
  scored.sort((a, b) => b.earnings - a.earnings);
  let cr = 1;
  scored.forEach((e, i) => {
    if (i > 0 && e.earnings < scored[i - 1].earnings) cr = i + 1;
    e.rank = cr;
  });
  return scored;
}

// ── Main recap builder ──────────────────────────────────────────────────

/**
 * Compute the RecapCard data for a specific round.
 *
 * @param {number} round - 1, 2, or 3
 * @param {Map} golfers - Map<name, golfer_leaderboard row>
 * @param {Array} entries - confirmed entries from DB
 * @param {Map} roundScores - from parseESPNRoundScores()
 * @param {Map} pickCount - from buildPickCounts()
 * @param {object} analytics - { todayVisits, uniqueVisitors }
 * @returns {object} RecapCard-ready data object
 */
export function computeRecapData(round, golfers, entries, roundScores, pickCount, analytics) {
  const roundKey = `r${round}`;
  const golferArr = [...golfers.values()];
  const totalEntries = entries.length;

  // ── Current standings (earnings-based) ──────────────────────────────
  const posCounts = buildPositionCounts(golfers);
  const currentRanked = rankByEarnings(entries, golfers, posCounts);

  const top5 = currentRanked.slice(0, 5).map(e => ({
    rank: e.posLabel,
    name: e.name,
    score: e.earnings,
    scoreLabel: fmtM(e.earnings),
    picks: PICK_COLS.map(col => lastName(e[col])),
    highlighted: e.rank === 1,
  }));

  // For R1, use score-to-par instead of earnings (pre-cut, no earnings yet)
  if (round === 1) {
    const r1Ranked = rankByScore(entries, e => teamScoreVsPar(e, golfers, roundScores, 'r1'));
    top5.length = 0;
    r1Ranked.slice(0, 5).forEach(e => {
      top5.push({
        rank: e.posLabel,
        name: e.name,
        score: e.teamScore,
        picks: PICK_COLS.map(col => lastName(e[col])),
        highlighted: e.rank === 1,
      });
    });
  }

  // ── Previous round standings for comeback calculations ─────────────
  let prevRankMap = new Map();
  if (round >= 2) {
    const prevPosMap = buildHypotheticalPrevRound(golfers, roundScores, roundKey);
    const prevRanked = rankByHypotheticalEarnings(entries, golfers, prevPosMap);
    prevRanked.forEach(e => prevRankMap.set(e.name, e.rank));
  } else {
    // R1 has no previous round — use alphabetical as "pre-tournament" position
    const alpha = [...entries].sort((a, b) => a.name.localeCompare(b.name));
    alpha.forEach((e, i) => prevRankMap.set(e.name, i + 1));
  }

  // ── Comeback / Reverse Comeback ────────────────────────────────────
  const rankedForDeltas = round === 1
    ? rankByScore(entries, e => teamScoreVsPar(e, golfers, roundScores, 'r1'))
    : currentRanked;

  const deltas = rankedForDeltas.map(e => ({
    name: e.name,
    prevPos: prevRankMap.get(e.name) || 999,
    curPos: e.rank,
    delta: (prevRankMap.get(e.name) || 999) - e.rank,
  }));
  const comebackKid = [...deltas].sort((a, b) => b.delta - a.delta)[0];
  const reverseComeback = [...deltas].sort((a, b) => a.delta - b.delta)[0];

  // ── Best / Worst golfer this round ─────────────────────────────────
  const activeWithScore = golferArr
    .filter(g => !isMC(g))
    .map(g => ({
      ...g,
      roundScore: roundScores.get(g.golfer_name)?.[roundKey] ?? g.today_score,
    }))
    .filter(g => g.roundScore != null)
    .filter(g => (pickCount.get(g.golfer_name) || 0) >= 10);

  const bestGolfer = [...activeWithScore].sort((a, b) => a.roundScore - b.roundScore)[0] || null;
  const worstGolfer = [...activeWithScore].sort((a, b) => {
    const ad = a.roundScore * (pickCount.get(a.golfer_name) || 0);
    const bd = b.roundScore * (pickCount.get(b.golfer_name) || 0);
    return bd - ad;
  })[0] || null;

  // ── Cumulative birdies ─────────────────────────────────────────────
  const birdieBoard = [...roundScores.entries()]
    .filter(([name]) => {
      const g = golfers.get(name);
      return g && !isMC(g);
    })
    .map(([name, rs]) => {
      let totalB = 0, totalE = 0;
      for (let r = 1; r <= round; r++) {
        totalB += rs[`r${r}Birdies`] || 0;
        totalE += rs[`r${r}Eagles`] || 0;
      }
      return { name, birdies: totalB, eagles: totalE, total: totalB + totalE, picks: pickCount.get(name) || 0 };
    })
    .sort((a, b) => b.total - a.total);

  const topBirdie = birdieBoard[0] || null;

  // ── Round-specific extra stats ─────────────────────────────────────

  // R2: All 6 Alive
  let all6Alive = null;
  if (round === 2) {
    const count = entries.filter(e =>
      PICK_COLS.every(col => {
        const g = golfers.get(e[col]);
        return g && !isMC(g);
      })
    ).length;
    all6Alive = { count, outOf: totalEntries };
  }

  // R3: Teams with 3+ golfers in top 10
  let teams3PlusTop10 = null;
  if (round === 3) {
    const top10Names = new Set();
    for (const g of golfers.values()) {
      if (isMC(g)) continue;
      const posNum = parsePosNum(g.position);
      if (posNum != null && posNum <= 10) top10Names.add(g.golfer_name);
    }
    const qualifying = entries.filter(e =>
      PICK_COLS.filter(col => top10Names.has(e[col])).length >= 3
    ).length;
    teams3PlusTop10 = { count: qualifying, outOf: totalEntries };
  }

  // ── Build highlights array ─────────────────────────────────────────
  const roundLabel = `R${round}`;

  const highlights = [
    {
      label: `Best Golfer ${roundLabel}`,
      name: bestGolfer?.golfer_name || 'TBD',
      detail: bestGolfer
        ? `${fmtPar(bestGolfer.roundScore)} in ${roundLabel} \u2014 ${pickCount.get(bestGolfer.golfer_name) || 0} teams picked \u2014 at ${bestGolfer.position || '?'}`
        : 'Data pending',
      detailColor: '#006B54',
    },
    {
      label: `Worst Golfer ${roundLabel}`,
      name: worstGolfer?.golfer_name || 'TBD',
      detail: worstGolfer
        ? `${fmtPar(worstGolfer.roundScore)} in ${roundLabel} \u2014 hurt ${pickCount.get(worstGolfer.golfer_name) || 0} teams \u2014 at ${worstGolfer.position || '?'}`
        : 'Data pending',
      detailColor: '#c0392b',
    },
    {
      label: 'Comeback Kid (Patron)',
      name: comebackKid?.name || 'TBD',
      detail: comebackKid && comebackKid.delta > 0
        ? `Jumped ${comebackKid.delta} spots \u2014 ${comebackKid.prevPos}${getOrdSuffix(comebackKid.prevPos)} \u2192 ${comebackKid.curPos}${getOrdSuffix(comebackKid.curPos)}`
        : 'No movement yet',
      detailColor: '#006B54',
    },
    {
      label: 'Reverse Comeback (Patron)',
      name: reverseComeback?.name || 'TBD',
      detail: reverseComeback && reverseComeback.delta < 0
        ? `Fell ${Math.abs(reverseComeback.delta)} spots \u2014 ${reverseComeback.prevPos}${getOrdSuffix(reverseComeback.prevPos)} \u2192 ${reverseComeback.curPos}${getOrdSuffix(reverseComeback.curPos)}`
        : 'No movement yet',
      detailColor: '#c0392b',
    },
  ];

  // R1: chalk vs contrarian instead of extraHighlights
  let chalk = null;
  let extraHighlights = null;

  if (round === 1) {
    // Most-picked golfer vs best low-picked golfer
    const sortedByPicks = golferArr
      .filter(g => !isMC(g))
      .map(g => ({
        ...g,
        picks: pickCount.get(g.golfer_name) || 0,
        roundScore: roundScores.get(g.golfer_name)?.[roundKey],
      }))
      .filter(g => g.roundScore != null);

    const chalkGolfer = [...sortedByPicks].sort((a, b) => b.picks - a.picks)[0];
    const contrarian = sortedByPicks
      .filter(g => g.picks < totalEntries * 0.15 && g.picks > 0)
      .sort((a, b) => a.roundScore - b.roundScore)[0];

    if (chalkGolfer && contrarian) {
      chalk = {
        left: {
          name: `${chalkGolfer.golfer_name} (${Math.round(chalkGolfer.picks / totalEntries * 100)}%)`,
          score: `${72 + chalkGolfer.roundScore} (${fmtPar(chalkGolfer.roundScore)})`,
          color: chalkGolfer.roundScore <= 0 ? '#006B54' : '#c0392b',
        },
        right: {
          name: `${contrarian.golfer_name} (${Math.round(contrarian.picks / totalEntries * 100)}%)`,
          score: `${72 + contrarian.roundScore} (${fmtPar(contrarian.roundScore)})`,
          color: contrarian.roundScore <= 0 ? '#006B54' : '#c0392b',
        },
      };
    }
  } else {
    // R2/R3: extra highlight tiles
    const throughHoles = round * 18;
    extraHighlights = [
      {
        label: `Most Birdies (R1${round >= 2 ? '+R2' : ''}${round >= 3 ? '+R3' : ''})`,
        name: topBirdie?.name || 'TBD',
        detail: topBirdie
          ? `${topBirdie.birdies} birdies${topBirdie.eagles > 0 ? ` + ${topBirdie.eagles} eagles` : ''} through ${throughHoles} holes \u2014 ${topBirdie.picks} teams picked`
          : 'Data pending',
        detailColor: '#d4af37',
      },
    ];

    if (round === 2 && all6Alive) {
      extraHighlights.push({
        label: 'All 6 Alive',
        name: `${all6Alive.count} of ${all6Alive.outOf} teams`,
        detail: 'All 6 golfers survived the cut',
        detailColor: '#006B54',
      });
    }

    if (round === 3 && teams3PlusTop10) {
      extraHighlights.push({
        label: '3+ Golfers in Top 10',
        name: `${teams3PlusTop10.count} of ${teams3PlusTop10.outOf} teams`,
        detail: 'Multiple golfers positioned for a Sunday charge',
        detailColor: '#006B54',
      });
    }
  }

  // ── Assemble final data object ─────────────────────────────────────
  const data = {
    day: round,
    subtitle: `Mendoza\u2019s Masters Pool \u2014 Round ${round}`,
    top5,
    highlights,
  };

  if (round >= 2) {
    data.standingsTitle = `Estimated Earnings After R${round}`;
  }

  if (chalk) data.chalk = chalk;
  if (extraHighlights) data.extraHighlights = extraHighlights;

  return data;
}

function getOrdSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
