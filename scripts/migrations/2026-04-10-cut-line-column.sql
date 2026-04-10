-- Adds the projected cut line column used by the cut-line UI features.
-- Idempotent — safe to re-run.
ALTER TABLE golfer_leaderboard
  ADD COLUMN IF NOT EXISTS cut_line smallint DEFAULT null;
