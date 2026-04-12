/**
 * Tournament entry configuration — update this ONE file each year.
 *
 * Everything the /enter form needs: golfer groups, amateurs, deadline,
 * fees, venmo info. The entry flow and admin views read from here so
 * next year's setup is just editing these values.
 */

export const ENTRY_CONFIG = {
  // ── Tournament info ─────────────────────────────────────────────────
  tournament: 'Masters 2026',
  course: 'Augusta National Golf Club',
  dates: 'April 9\u201312, 2026',
  year: 2026,

  // ── Entry deadline — form locks after this moment ───────────────────
  deadline: '2026-04-09T08:00:00-04:00', // 8:00 AM ET, Thursday R1

  // ── Fees & payment ──────────────────────────────────────────────────
  entryFee: 28,           // $26 pool + $2 tech fee
  venmoHandle: 'alexmendoza',
  venmoAmount: 28,
  poolPurse: 7500,

  // ── Golfer groups — update each year with the actual field ──────────
  groups: {
    g1: [
      'Scottie Scheffler',
      'Rory McIlroy',
      'Bryson DeChambeau',
      'Jon Rahm',
    ],
    g2: [
      'Xander Schauffele',
      'Collin Morikawa',
      'Viktor Hovland',
      'Ludvig \u00c5berg',
      'Tommy Fleetwood',
      'Robert MacIntyre',
      'Hideki Matsuyama',
    ],
    g3: [
      'Justin Rose',
      'Shane Lowry',
      'Sam Burns',
      'Tyrrell Hatton',
      'Patrick Reed',
      'Russell Henley',
      'Rasmus H\u00f8jgaard',
      'Matt Fitzpatrick',
      'Max Homa',
      'Cameron Young',
      'Scottie Scheffler',
    ],
    g4: [
      'Jason Day',
      'Brian Campbell',
      'Corey Conners',
      'Zach Johnson',
      'Danny Willett',
      'Angel Cabrera',
      'Gary Woodland',
      'Bubba Watson',
      'Vijay Singh',
      'Fred Couples',
    ],
  },

  // ── Amateurs in the field — update each year ────────────────────────
  amateurs: [
    'Santiago de la Fuente',
    'Christo Lamprecht',
    'Gordon Sargent',
    'Nick Dunlap',
    'Jasper Stubbs',
    'Frederik Kjettrup',
    'Hiroshi Tai',
    'Ethan Fang',
    'Austin Greaser',
    'Luke Clanton',
  ],

  // ── Winning score range for tiebreaker dropdown ─────────────────────
  winningScoreRange: { min: -30, max: 10 },
};
