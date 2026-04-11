// lib/mastersPayout.js
// 2026 estimated payouts — based on 2025 % distribution scaled to assumed $22M purse
// SOURCE: Golf Digest 2025 payout table × (22/21) scale factor
// UPDATE: Replace with official Augusta numbers when released Sunday
// To update: change PURSE_2026 and re-run the scale, or just replace values below

export const PURSE_2026 = 22000000;  // assumed — update when confirmed
export const PURSE_2025 = 21000000;       // confirmed

export const MASTERS_PAYOUTS = {
  1  :   4400000,  // 20.00% of purse
  2  :   2376000,  // 10.80% of purse
  3  :   1496000,  // 6.80% of purse
  4  :   1056000,  // 4.80% of purse
  5  :    880000,  // 4.00% of purse
  6  :    792000,  // 3.60% of purse
  7  :    737000,  // 3.35% of purse
  8  :    682000,  // 3.10% of purse
  9  :    638000,  // 2.90% of purse
  10 :    594000,  // 2.70% of purse
  11 :    550000,  // 2.50% of purse
  12 :    506000,  // 2.30% of purse
  13 :    462000,  // 2.10% of purse
  14 :    418000,  // 1.90% of purse
  15 :    396000,  // 1.80% of purse
  16 :    374000,  // 1.70% of purse
  17 :    352000,  // 1.60% of purse
  18 :    330000,  // 1.50% of purse
  19 :    308000,  // 1.40% of purse
  20 :    286000,  // 1.30% of purse
  21 :    264000,  // 1.20% of purse
  22 :    246400,  // 1.12% of purse
  23 :    228800,  // 1.04% of purse
  24 :    211200,  // 0.96% of purse
  25 :    193600,  // 0.88% of purse
  26 :    176000,  // 0.80% of purse
  27 :    169400,  // 0.77% of purse
  28 :    162800,  // 0.74% of purse
  29 :    156200,  // 0.71% of purse
  30 :    149600,  // 0.68% of purse
  31 :    143000,  // 0.65% of purse
  32 :    136400,  // 0.62% of purse
  33 :    129800,  // 0.59% of purse
  34 :    124300,  // 0.56% of purse
  35 :    118800,  // 0.54% of purse
  36 :    113300,  // 0.52% of purse
  37 :    107800,  // 0.49% of purse
  38 :    103400,  // 0.47% of purse
  39 :     99000,  // 0.45% of purse
  40 :     94600,  // 0.43% of purse
  41 :     90200,  // 0.41% of purse
  42 :     85800,  // 0.39% of purse
  43 :     81400,  // 0.37% of purse
  44 :     77000,  // 0.35% of purse
  45 :     72600,  // 0.33% of purse
  46 :     68200,  // 0.31% of purse
  47 :     63800,  // 0.29% of purse
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