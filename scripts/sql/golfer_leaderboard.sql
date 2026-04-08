-- Run this in the Supabase SQL Editor.
-- Mirrors the RLS pattern used by the existing entries / golfer_earnings tables.

create table if not exists public.golfer_leaderboard (
  id            bigserial primary key,
  golfer_name   text unique not null,
  position      text,
  score_to_par  integer,
  today_score   integer,
  thru          text,
  status        text default 'active' check (status in ('active', 'cut', 'withdrawn')),
  updated_at    timestamptz default now()
);

create index if not exists golfer_leaderboard_score_idx
  on public.golfer_leaderboard (score_to_par);

alter table public.golfer_leaderboard enable row level security;

-- Public read
drop policy if exists "golfer_leaderboard_public_read" on public.golfer_leaderboard;
create policy "golfer_leaderboard_public_read"
  on public.golfer_leaderboard for select
  using (true);

-- Service-role write (insert/update/delete)
drop policy if exists "golfer_leaderboard_service_write" on public.golfer_leaderboard;
create policy "golfer_leaderboard_service_write"
  on public.golfer_leaderboard for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
