-- Rename the round-specific column to a generic one that tracks whichever
-- round is currently in progress. Idempotent — safe to re-run.

-- Step 1: rename round1_scores → current_round_scores
ALTER TABLE golfer_leaderboard
  RENAME COLUMN round1_scores TO current_round_scores;

-- Step 2: add the round number column (defaults to 1)
ALTER TABLE golfer_leaderboard
  ADD COLUMN IF NOT EXISTS current_round smallint DEFAULT 1;
