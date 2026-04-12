'use client';
/**
 * Day 3 recap — Moving Day. Rankings switch to estimated earnings mode.
 * Uses the same RecapCard template with scoreLabel for dollar formatting.
 */
import RecapCard from './RecapCard';

const DAY_3 = {
  day: 3,
  subtitle: 'Mendoza\u2019s Masters Pool \u2014 Round 3',
  standingsTitle: 'Estimated Earnings After R3',

  top5: [
    {
      rank: '1',
      name: 'Mason Colling',
      score: 9315000,
      scoreLabel: '$9.31M',
      picks: ['McIlroy', 'Young', 'Rose', 'Burns', 'H\u00f8jgaard', 'Cabrera'],
      highlighted: true,
    },
    {
      rank: '2',
      name: 'Joe Gillin',
      score: 8671094,
      scoreLabel: '$8.67M',
      picks: ['McIlroy', '\u00c5berg', 'Young', 'Burns', 'Spaun', 'Z. Johnson'],
    },
    {
      rank: '3',
      name: 'Cody Briscoe',
      score: 7841700,
      scoreLabel: '$7.84M',
      picks: ['McIlroy', 'Rose', 'Young', 'Woodland', 'Watson', 'Willett'],
    },
    {
      rank: '4',
      name: 'Cecil Gant',
      score: 7546544,
      scoreLabel: '$7.55M',
      picks: ['McIlroy', 'Fleetwood', 'Young', 'Woodland', 'Homa', 'Z. Johnson'],
    },
    {
      rank: '5',
      name: 'Vincent Gallo',
      score: 7352188,
      scoreLabel: '$7.35M',
      picks: ['McIlroy', 'Young', 'Fitzpatrick', 'H\u00f8jgaard', 'Homa', 'Z. Johnson'],
    },
  ],

  highlights: [
    {
      label: 'Best Golfer R3',
      name: 'Scottie Scheffler',
      detail: '-7 in R3 \u2014 93 teams picked \u2014 surged to T7',
      detailColor: '#006B54',
    },
    {
      label: 'Worst Golfer R3',
      name: 'Gary Woodland',
      detail: '+4 in R3 \u2014 hurt 33 teams \u2014 dropped to 51st',
      detailColor: '#c0392b',
    },
    {
      label: 'Comeback Kid (Patron)',
      name: 'CJ Exford',
      detail: 'Jumped 176 spots \u2014 266th \u2192 90th',
      detailColor: '#006B54',
    },
    {
      label: 'Reverse Comeback (Patron)',
      name: 'Tyler Wild',
      detail: 'Fell 159 spots \u2014 86th \u2192 245th',
      detailColor: '#c0392b',
    },
  ],

  extraHighlights: [
    {
      label: 'Most Birdies (R1+R2+R3)',
      name: 'Rory McIlroy',
      detail: '19 birdies through 54 holes \u2014 34 teams picked',
      detailColor: '#d4af37',
    },
    {
      label: '3+ Golfers in Top 10',
      name: '22 of 300 teams',
      detail: '4 teams have 4 golfers in the top 10 heading into Sunday',
      detailColor: '#006B54',
    },
  ],
};

export default function Day3Recap() {
  return <RecapCard data={DAY_3} />;
}
