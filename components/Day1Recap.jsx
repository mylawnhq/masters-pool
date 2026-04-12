'use client';
/**
 * Day 1 recap — reads data from data/recap-r1.json (auto-populated by
 * scripts/auto-recap.mjs). The JSON can also be manually edited to
 * override any auto-computed value.
 */
import RecapCard from './RecapCard';
import data from '../data/recap-r1.json';

export default function Day1Recap() {
  return <RecapCard data={data} />;
}
