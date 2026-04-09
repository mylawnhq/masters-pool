-- Run this in the Supabase SQL Editor.
-- Lightweight analytics table for the pool site.

create table if not exists public.page_views (
  id            bigserial primary key,
  visitor_id    text not null,
  timestamp     timestamptz not null default now(),
  device        text,
  search_query  text,
  event_type    text not null default 'pageview'
                check (event_type in ('pageview', 'search', 'share'))
);

create index if not exists page_views_timestamp_idx
  on public.page_views (timestamp desc);
create index if not exists page_views_visitor_idx
  on public.page_views (visitor_id);
create index if not exists page_views_event_type_idx
  on public.page_views (event_type);

alter table public.page_views enable row level security;

-- Public insert — so the client can log events
drop policy if exists "page_views_public_insert" on public.page_views;
create policy "page_views_public_insert"
  on public.page_views for insert
  with check (true);

-- Public read — so the /admin page (also using the anon key) can query
drop policy if exists "page_views_public_read" on public.page_views;
create policy "page_views_public_read"
  on public.page_views for select
  using (true);

-- Service-role full access
drop policy if exists "page_views_service_all" on public.page_views;
create policy "page_views_service_all"
  on public.page_views for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
