'use client';
/**
 * Day 2 recap — reads data from data/recap-r2.json (auto-populated by
 * scripts/auto-recap.mjs). The JSON can also be manually edited to
 * override any auto-computed value.
 */
import RecapCard from './RecapCard';
import data from '../data/recap-r2.json';

export default function Day2Recap() {
  return <RecapCard data={data} />;
}
