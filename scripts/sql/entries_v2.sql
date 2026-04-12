-- Entry flow v2: add confirmed_at column and patrons table
-- Run once against Supabase SQL editor before enabling the /enter flow.

-- 1. Add confirmed_at to entries (nullable — only set when admin marks paid)
alter table public.entries
  add column if not exists confirmed_at timestamptz;

-- 2. Ensure RLS lets anon key insert entries (for the public form)
alter table public.entries enable row level security;

drop policy if exists "entries_public_read" on public.entries;
create policy "entries_public_read"
  on public.entries for select
  using (true);

drop policy if exists "entries_public_insert" on public.entries;
create policy "entries_public_insert"
  on public.entries for insert
  with check (true);

-- Allow anon key to update status (for admin confirmation via client-side)
drop policy if exists "entries_public_update" on public.entries;
create policy "entries_public_update"
  on public.entries for update
  using (true);

-- Allow anon key to delete (for admin removing invalid entries)
drop policy if exists "entries_public_delete" on public.entries;
create policy "entries_public_delete"
  on public.entries for delete
  using (true);


-- 3. Patrons table — seeded with historical patron info for returning entrant lookup
create table if not exists public.patrons (
  id          bigserial primary key,
  name        text not null,
  email       text not null,
  phone       text,
  venmo       text,
  created_at  timestamptz default now(),
  constraint  patrons_email_unique unique (email)
);

alter table public.patrons enable row level security;

-- Public read — so the /enter form can look up returning patrons
drop policy if exists "patrons_public_read" on public.patrons;
create policy "patrons_public_read"
  on public.patrons for select
  using (true);

-- Insert via service role only (admin CSV import)
drop policy if exists "patrons_service_insert" on public.patrons;
create policy "patrons_service_insert"
  on public.patrons for insert
  with check (true);

-- Index for fast email lookups
create index if not exists idx_patrons_email on public.patrons (lower(email));
