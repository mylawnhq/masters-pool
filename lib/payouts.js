/**
 * Masters payout calculator
 *
 * Standard Masters payout percentages for positions 1–50.
 * Source: PGA Tour distribution tables.
 */
export const PAYOUT_PCT = [
  20.00, 10.80, 6.80, 4.80, 4.00, 3.60, 3.35, 3.10, 2.90, 2.70,
  2.50,  2.30,  2.10, 1.90, 1.80, 1.70, 1.60, 1.50, 1.40, 1.30,
  1.20,  1.12,  1.04, 0.96, 0.88, 0.80, 0.77, 0.74, 0.71, 0.68,
  0.65,  0.62,  0.59, 0.57, 0.54, 0.52, 0.49, 0.47, 0.45, 0.43,
  0.41,  0.39,  0.37, 0.35, 0.33, 0.31, 0.29, 0.27, 0.26, 0.25,
];

/**
 * Calculate projected earnings for every golfer in the field.
 *
 * @param {Array<{golfer_name: string, score_to_par?: number, position?: string, status?: string}>} leaderboard
 * @param {number} purse  total tournament purse in dollars
 * @returns {Object<string, number>}  map of golfer_name → earnings (rounded)
 *
 * Tie-split logic: when N golfers share a position, pool the percentages
 * for the N consecutive positions they occupy and split equally.
 *   e.g. 3 golfers tied for 2nd → (10.80 + 6.80 + 4.80) / 3 = 7.467% each.
 * The next golfer down the board starts at 2nd + 3 = 5th place.
 *
 * Cut / withdrawn golfers always get $0.
 */
export function calculateEarnings(leaderboard, purse) {
  const earnings = {};
  for (const g of leaderboard) earnings[g.golfer_name] = 0;

  const active = leaderboard.filter(g => {
    const s = (g.status || 'active').toLowerCase();
    return s !== 'cut' && s !== 'withdrawn' && s !== 'wd' && s !== 'mc';
  });

  // Sort by score to par ascending (best first). Missing scores sink to bottom.
  active.sort((a, b) => {
    const sa = a.score_to_par ?? 999;
    const sb = b.score_to_par ?? 999;
    return sa - sb;
  });

  let i = 0;
  let pos = 1;
  while (i < active.length) {
    let j = i;
    while (j < active.length && active[j].score_to_par === active[i].score_to_par) j++;
    const groupSize = j - i;

    let pctSum = 0;
    for (let k = 0; k < groupSize; k++) {
      const idx = pos - 1 + k;
      if (idx < PAYOUT_PCT.length) pctSum += PAYOUT_PCT[idx];
    }
    const share = Math.round((pctSum / groupSize / 100) * purse);

    for (let k = i; k < j; k++) earnings[active[k].golfer_name] = share;

    pos += groupSize;
    i = j;
  }

  return earnings;
}
