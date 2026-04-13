'use client';
/**
 * Day 4 recap — reads data from data/recap-r4.json.
 * Final round results with earnings-based standings.
 */
import RecapCard from './RecapCard';
import data from '../data/recap-r4.json';

export default function Day4Recap() {
  return <RecapCard data={data} />;
}
