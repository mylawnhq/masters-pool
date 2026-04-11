// lib/mastersPayout.js
// 2026 estimated payouts — based on 2025 actual payout distribution ($21M purse)
// SOURCE: Golf Digest / Augusta National 2025 official payout table
// UPDATE: Replace with official 2026 numbers when released Sunday
// To update: just replace the values below with the official amounts

export const PURSE_2026 = 21000000;  // same as 2025 — update when confirmed
export const PURSE_2025 = 21000000;  // confirmed

export const MASTERS_PAYOUTS = {
  1  :   4200000,  // 20.00% of purse
  2  :   2268000,  // 10.80% of purse
  3  :   1428000,  // 6.80% of purse
  4  :   1008000,  // 4.80% of purse
  5  :    840000,  // 4.00% of purse
  6  :    756000,  // 3.60% of purse
  7  :    703500,  // 3.35% of purse
  8  :    651000,  // 3.10% of purse
  9  :    609000,  // 2.90% of purse
  10 :    567000,  // 2.70% of purse
  11 :    525000,  // 2.50% of purse
  12 :    483000,  // 2.30% of purse
  13 :    441000,  // 2.10% of purse
  14 :    399000,  // 1.90% of purse
  15 :    378000,  // 1.80% of purse
  16 :    357000,  // 1.70% of purse
  17 :    336000,  // 1.60% of purse
  18 :    315000,  // 1.50% of purse
  19 :    294000,  // 1.40% of purse
  20 :    273000,  // 1.30% of purse
  21 :    252000,  // 1.20% of purse
  22 :    235200,  // 1.12% of purse
  23 :    218400,  // 1.04% of purse
  24 :    201600,  // 0.96% of purse
  25 :    184800,  // 0.88% of purse
  26 :    168000,  // 0.80% of purse
  27 :    161700,  // 0.77% of purse
  28 :    155400,  // 0.74% of purse
  29 :    149100,  // 0.71% of purse
  30 :    142800,  // 0.68% of purse
  31 :    136500,  // 0.65% of purse
  32 :    130200,  // 0.62% of purse
  33 :    123900,  // 0.59% of purse
  34 :    117600,  // 0.56% of purse  (was 0.5619%)
  35 :    113400,  // 0.54% of purse
  36 :    109200,  // 0.52% of purse  (was 0.5148%)
  37 :    102900,  // 0.49% of purse
  38 :     98700,  // 0.47% of purse
  39 :     94500,  // 0.45% of purse
  40 :     90300,  // 0.43% of purse
  41 :     86100,  // 0.41% of purse
  42 :     81900,  // 0.39% of purse
  43 :     77700,  // 0.37% of purse
  44 :     73500,  // 0.35% of purse
  45 :     69300,  // 0.33% of purse
  46 :     65100,  // 0.31% of purse
  47 :     60900,  // 0.29% of purse
  // missed_cut: not used — MC golfers contribute $0 per pool rules
};

// Tie-splitting: average the payouts for tied positions
// e.g. T3 with 3 players = avg of positions 3+4+5, split evenly
// MC, WD, DQ golfers contribute $0 to their team's earnings — they are excluded entirely
export function getPayoutForPosition(finish, totalTied = 1) {
  if (!finish || finish === 'MC' || finish === 'WD' || finish === 'DQ' || finish === 'CUT') {
    return 0;  // Pool rule: missed cut = $0, no consolation payout applied
  }
  const pos = parseInt(finish);
  if (isNaN(pos)) return 0;
  if (totalTied === 1) return MASTERS_PAYOUTS[pos] ?? 0;
  // Tie-splitting: average the payouts across tied positions
  let total = 0;
  for (let i = pos; i < pos + totalTied; i++) {
    total += MASTERS_PAYOUTS[i] ?? MASTERS_PAYOUTS[47] ?? 0;
  }
  return Math.round(total / totalTied);
}
