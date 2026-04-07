# Mendoza's Masters Pool — 2026

A live leaderboard for a Masters Tournament pool. Built with Next.js + Supabase.

## Architecture

- **Frontend**: Next.js App Router, server-side rendering with 60s revalidation
- **Database**: Supabase (Postgres) with two tables: `entries` and `golfer_earnings`
- **Hosting**: Vercel (free tier)
- **Design**: Masters.com-inspired light mode — Pantone 342 green (#006B54), cream backgrounds, Libre Baskerville italic serif

## Project Structure

```
masters-pool/
├── app/
│   ├── globals.css          # Global styles + font imports
│   ├── layout.js            # Root layout with metadata
│   └── page.js              # Server component — fetches from Supabase
├── components/
│   └── Leaderboard.jsx      # Client component — full UI
├── lib/
│   └── supabase.js          # Supabase client
├── scripts/
│   ├── import-entries.mjs   # CSV → Supabase entries importer
│   └── import-earnings.mjs  # CSV → Supabase earnings importer
├── .env.local               # Supabase keys (not committed)
├── package.json
└── next.config.js
```

## Setup

1. `npm install`
2. Add your `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (get from Supabase Dashboard → Settings → API → service_role secret)
3. `npm run dev` to preview locally

## Import Entries (Thursday morning)

```bash
npm run import-csv -- path/to/responses.csv
```

This reads the Google Form CSV export and pushes all entries into Supabase.

## Import Earnings (Sunday evening)

Create a CSV with two columns: `Golfer Name, Earnings` and run:

```bash
npm run import-earnings -- path/to/earnings.csv
```

The leaderboard auto-updates within 60 seconds.

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## Supabase Details

- **URL**: https://rnmdjckzmeojionmrflu.supabase.co
- **Tables**: `entries`, `golfer_earnings`
- **RLS**: Public read, admin write (service_role key for imports)

## Key Features

- Search by person name OR golfer name
- Golfer search shows count of how many people picked that golfer
- Accordion dropdown shows all 6 picks in a 3×2 grid
- Tiebreakers displayed side by side
- Pre-earnings: entries sorted A–Z, no rankings shown
- Post-earnings: entries ranked by total combined earnings with medals for top 3
- 60-second ISR revalidation — edit data in Supabase, site updates automatically
