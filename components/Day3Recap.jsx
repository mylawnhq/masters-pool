'use client';
/**
 * Day 3 recap — reads data from data/recap-r3.json (auto-populated by
 * scripts/auto-recap.mjs). The JSON can also be manually edited to
 * override any auto-computed value.
 */
import RecapCard from './RecapCard';
import data from '../data/recap-r3.json';

export default function Day3Recap() {
  return <RecapCard data={data} />;
}
