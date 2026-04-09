-- Adds the per-hole round 1 scores column used by the live scorecard overlay.
-- Idempotent — safe to re-run.
ALTER TABLE golfer_leaderboard
  ADD COLUMN IF NOT EXISTS round1_scores jsonb DEFAULT null;
