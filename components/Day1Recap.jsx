'use client';
/**
 * Day 1 recap. The visual design lives in <RecapCard />; this file is just
 * the data payload for Round 1. Copy this file to Day2Recap.jsx, change the
 * day number and the data, and you'll get an identical-looking recap for
 * Round 2 — see RecapCard.jsx for the full props contract.
 */
import RecapCard from './RecapCard';

const DAY_1 = {
  day: 1,
  subtitle: 'Mendoza\u2019s Masters Pool — Round 1',

  top5: [
    {
      rank: 'T1',
      name: 'David Shenosky',
      score: -8,
      picks: ['Scheffler', 'Matsuyama', 'Day', 'Burns', 'Conners', 'Campbell'],
      highlighted: true,
    },
    {
      rank: 'T1',
      name: 'Justin Dean',
      score: -8,
      picks: ['Scheffler', 'Fleetwood', 'Rose', 'Lowry', 'Burns', 'Willett'],
      highlighted: true,
    },
    {
      rank: 'T3',
      name: 'Ben Edwards',
      score: -6,
      picks: ['McIlroy', 'Åberg', 'Reed', 'Conners', 'Lowry', 'Campbell'],
    },
    {
      rank: 'T3',
      name: 'Joey Woodman',
      score: -6,
      picks: ['Scheffler', 'Åberg', 'Schauffele', 'Lowry', 'Burns', 'Z. Johnson'],
    },
    {
      rank: '5',
      name: 'Trenton Edwards',
      score: -5,
      picks: ['Scheffler', 'Rose', 'Schauffele', 'Spaun', 'Griffin', 'Campbell'],
    },
  ],

  highlights: [
    {
      label: 'Best Golfer for the Pool',
      name: 'Sam Burns',
      detail: '67 (-5) — picked by 29 teams',
      detailColor: '#006B54',
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

  chalk: {
    left:  { name: 'DeChambeau (42%)', score: '76 (+4)', color: '#c0392b' },
    right: { name: 'McIlroy (11%)',    score: '67 (-5)', color: '#006B54' },
  },
};

export default function Day1Recap() {
  return <RecapCard data={DAY_1} />;
}
