-- Historical results table for the Pool History admin tab.
-- Each row is one entry's final standing for a given year.
create table if not exists historical_results (
  id uuid primary key default gen_random_uuid(),
  year smallint not null,
  finish integer not null,
  patron_name text not null,
  earnings bigint not null,
  entries integer,
  pool_purse integer,
  created_at timestamptz default now()
);

-- Index for fast year-based queries and ordering.
create index if not exists idx_historical_year_finish
  on historical_results (year, finish);
