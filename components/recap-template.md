# Daily Recap Template

The visual design lives in `components/RecapCard.jsx`. Each day is a thin
data wrapper that renders `<RecapCard data={...} />` — Day 1 lives in
`components/Day1Recap.jsx` and is the canonical example.

## Adding Day 2 / 3 / 4

1. Copy `components/Day1Recap.jsx` to `components/Day{N}Recap.jsx`.
2. Update the `DAY_{N}` payload (see schema below).
3. Wire it into the admin dashboard tab strip in `components/AdminDashboard.jsx`
   alongside the existing `Day1Recap` import.

That's it. The header band, standing rows, highlight grid, chalk vs
contrarian, footer button, and the "Copy as Image" capture flow all come from
`RecapCard` automatically — any tweak to the design propagates to every day.

## Data shape

```js
{
  day: 1,                                  // 1–4 — drives default titles + filename
  subtitle: "Mendoza's Masters Pool — Round 1",

  // Optional overrides — defaults are derived from `day`:
  // title:           "Day 1 Recap"
  // standingsTitle:  "Pool Standings After R1"
  // highlightsTitle: "Day 1 Highlights"
  // footerHint:      "Track live standings, scorecards, and picks"
  // siteUrl:         "https://mendozas-masters-pool.vercel.app"
  // siteLabel:       "mendozas-masters-pool.vercel.app"

  top5: [
    {
      rank: 'T1',                          // "1" | "T1" | "T3" | "5" — string
      name: 'David Shenosky',              // pool entry name
      score: -8,                           // aggregate team score-to-par (negative is good)
      picks: [                             // 6 last names rendered with " · " between
        'Scheffler', 'Matsuyama', 'Day',
        'Burns', 'Conners', 'Campbell',
      ],
      highlighted: true,                   // true → green/gold leader treatment
    },
    // ...4 more entries
  ],

  highlights: [                            // EXACTLY 4 cards (rendered 2×2)
    {
      label: 'Best Golfer for the Pool',   // small uppercase eyebrow
      name: 'Sam Burns',                   // big bold name
      detail: '67 (-5) — picked by 29 teams',
      detailColor: '#006B54',              // green for good, red for bad, muted for neutral
    },
    {
      label: 'Worst Golfer for the Pool',
      name: 'Bryson DeChambeau',
      detail: '76 (+4) — hurt 126 teams',
      detailColor: '#c0392b',
    },
    {
      label: 'Biggest Sleeper',
      name: 'Rory McIlroy',
      detail: '67 (-5) — only picked by 34',
      detailColor: '#006B54',
    },
    {
      label: 'Most Unique Team in Top 10',
      name: 'Cecil Gant (T9)',
      detail: 'Low overlap with field',
      detailColor: '#8b7d6b',
    },
  ],

  chalk: {                                 // chalk vs contrarian comparison
    left:  { name: 'DeChambeau (42%)', score: '76 (+4)', color: '#c0392b' },
    right: { name: 'McIlroy (11%)',    score: '67 (-5)', color: '#006B54' },
  },
}
```

## Color tokens

| Token        | Hex       | Use                                    |
|--------------|-----------|----------------------------------------|
| Green        | `#006B54` | Header band, leader rows, accents      |
| Gold         | `#d4af37` | Leader rank/score, ranks for non-leaders (lighter `#c5a959`) |
| Cream        | `#f7f4ef` | Card body background                   |
| Surround     | `#e8e2d4` | Outside the card (visible during copy) |
| Ink          | `#1a2e1a` | Primary text                           |
| Muted        | `#8b7d6b` | Secondary text                         |
| Pale muted   | `#a5998a` | Picks list under names                 |
| Hairline     | `#e0dbd2` | Borders + dividers                     |
| Score green  | `#406154` | Non-leader score                       |
| Red (bad)    | `#c0392b` | Worst-pick / over-par highlight color  |

## Sourcing the data each day

Use `scripts/day1-dump.mjs` (already on disk) as a reference for the kinds of
queries that produce this content. For Days 2–4 you'll typically need:

- `entries` × `golfer_leaderboard` joined to compute aggregate team score
- Per-golfer pick counts across the six `groupX` columns
- Round score from the `round{N}_scores` jsonb column when available

A future commit should generalize the dump script into
`scripts/day-recap-stats.mjs` that takes a `--day` flag.
