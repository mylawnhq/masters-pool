'use client';
/**
 * Day 2 recap — same RecapCard template as Day 1, just different data.
 * See components/recap-template.md for the props contract.
 */
import RecapCard from './RecapCard';

const DAY_2 = {
  day: 2,
  subtitle: 'Mendoza\u2019s Masters Pool \u2014 Round 2',

  top5: [
    {
      rank: '1',
      name: 'Mason Colling',
      score: -27,
      picks: ['McIlroy', 'Young', 'Rose', 'Burns', 'H\u00f8jgaard', 'Cabrera'],
      highlighted: true,
    },
    {
      rank: '2',
      name: 'Jen Moore',
      score: -25,
      picks: ['McIlroy', 'Day', 'Matsuyama', 'Lowry', 'Homa', 'Singh'],
    },
    {
      rank: '3',
      name: 'Keith Mefford',
      score: -24,
      picks: ['McIlroy', 'Schauffele', 'Fleetwood', 'Lowry', 'Spaun', 'Couples'],
    },
    {
      rank: 'T4',
      name: 'Joe Gillin',
      score: -22,
      picks: ['McIlroy', '\u00c5berg', 'Young', 'Burns', 'Spaun', 'Z. Johnson'],
    },
    {
      rank: 'T4',
      name: 'Ian Edwards',
      score: -22,
      picks: ['McIlroy', 'Rose', 'MacIntyre', 'English', 'Lowry', 'Johnson'],
    },
  ],

  highlights: [
    {
      label: 'Best Golfer for the Pool',
      name: 'Rory McIlroy',
      detail: '65 (-7) in R2 \u2014 picked by 34 teams',
      detailColor: '#006B54',
    },
    {
      label: 'Worst Golfer for the Pool',
      name: 'Scottie Scheffler',
      detail: '74 (+2) \u2014 hurt 93 teams, dropped to T24',
      detailColor: '#c0392b',
    },
    {
      label: 'Biggest Sleeper',
      name: 'Rory McIlroy',
      detail: '-12, leads tournament \u2014 only 34 of 300 picked him',
      detailColor: '#006B54',
    },
    {
      label: 'Most Unique Team in Top 10',
      name: 'Art Wilkerson (T8)',
      detail: 'Only 9% pick overlap with the field',
      detailColor: '#8b7d6b',
    },
  ],

  chalk: {
    left:  { name: 'Scheffler (31%)', score: '74 (+2)', color: '#c0392b' },
    right: { name: 'McIlroy (11%)',   score: '65 (-7)', color: '#006B54' },
  },
};

export default function Day2Recap() {
  return <RecapCard data={DAY_2} />;
}
