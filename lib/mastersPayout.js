// lib/mastersPayout.js
// SOURCE: Official 2026 Masters payout — Augusta National, confirmed April 12, 2026. $22.5M purse.

export const PURSE_2026 = 22_500_000;
export const PURSE_2025 = 21000000;  // confirmed

export const MASTERS_PAYOUTS = {
  1  : 4500000,
  2  : 2430000,
  3  : 1530000,
  4  : 1080000,
  5  :  900000,
  6  :  810000,
  7  :  753750,
  8  :  697500,
  9  :  652500,
  10 :  607500,
  11 :  562500,
  12 :  517500,
  13 :  472500,
  14 :  427500,
  15 :  405000,
  16 :  382500,
  17 :  360000,
  18 :  337500,
  19 :  315000,
  20 :  292500,
  21 :  270000,
  22 :  252000,
  23 :  234000,
  24 :  216000,
  25 :  198000,
  26 :  180000,
  27 :  173250,
  28 :  166500,
  29 :  159750,
  30 :  153000,
  31 :  146250,
  32 :  139500,
  33 :  132750,
  34 :  127125,
  35 :  121500,
  36 :  115875,
  37 :  110250,
  38 :  105750,
  39 :  101250,
  40 :   96750,
  41 :   92250,
  42 :   87750,
  43 :   83250,
  44 :   78750,
  45 :   74250,
  46 :   69750,
  47 :   65250,
  48 :   61650,
  49 :   58500,
  50 :   56700,
  missed_cut: 0,
};

// Tie-splitting: average the payouts for tied positions
// e.g. T3 with 3 players = avg of positions 3+4+5, split evenly
// MC, WD, DQ golfers contribute $0 to their team's earnings — they are excluded entirely
// Max keyed position in the payout table — positions beyond this still earn
// (active weekend golfers) and receive the last-place payout as a floor.
const MAX_POS = 50;

export function getPayoutForPosition(finish, totalTied = 1) {
  if (!finish || finish === 'MC' || finish === 'WD' || finish === 'DQ' || finish === 'CUT') {
    return 0;  // Pool rule: missed cut = $0, no consolation payout applied
  }
  const pos = parseInt(finish);
  if (isNaN(pos)) return 0;
  if (totalTied === 1) return MASTERS_PAYOUTS[pos] ?? MASTERS_PAYOUTS[MAX_POS] ?? 0;
  // Tie-splitting: average the payouts across tied positions
  let total = 0;
  for (let i = pos; i < pos + totalTied; i++) {
    total += MASTERS_PAYOUTS[i] ?? MASTERS_PAYOUTS[MAX_POS] ?? 0;
  }
  return Math.round(total / totalTied);
}
