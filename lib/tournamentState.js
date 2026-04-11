/**
 * Tournament state derivation — single source of truth for every
 * time-dependent UI decision across the app.
 *
 * All values are computed from data already in golferStats (which comes
 * from the golfer_leaderboard table), so there's no extra Supabase query.
 *
 * Usage (client component):
 *   const ts = deriveTournamentState(golferStats, liveMode);
 *
 * Returned shape:
 * {
 *   currentRound,        // 1–4
 *   cutLine,             // integer or null
 *   r2InProgress,        // true during R2 before the cut is finalized
 *   cutFinalized,        // true once R2 is fully done (round > 2, or all active thru 18)
 *   showCutLine,         // true from R2 onward when cutLine is known
 *   showBubble,          // true only during R2 in-progress
 *   showBelowCut,        // true once cut is finalized
 *   cutLabel,            // "Projected Cut" during R2 in-progress, "Cut" after
 *   tournamentComplete,  // true after R4 is done
 *   showCutFeatures,     // master gate: liveMode && cutLine != null && round >= 2
 * }
 *
 * WEATHER DELAY / SUSPENDED ROUND HANDLING
 * -----------------------------------------
 * ESPN can report non-standard `thru` values during weather suspensions:
 *   "S"  — suspended (play stopped for the day)
 *   "--" — no data / not started yet today
 *   null / undefined — tee time hasn't arrived
 *
 * To determine whether a round is fully complete, we ONLY look at golfers
 * whose status is "active" (still in the tournament — not cut, withdrawn,
 * or disqualified). A golfer counts as "round finished" when their thru
 * value is exactly "18" or "F". Any other value (including "S", a number
 * less than 18, or null) means they haven't finished the round yet.
 *
 * This means a weather-suspended R2 where some golfers are mid-round will
 * correctly keep cutFinalized = false until play resumes and everyone
 * finishes their 18 holes. Once ESPN updates their thru to "18"/"F", the
 * flag flips automatically.
 *
 * SAFETY OVERRIDE: if current_round >= 3, we force cutFinalized = true
 * regardless of any thru values. This protects against a delayed R2 that
 * doesn't resolve cleanly in the DB (e.g. ESPN reports round 3 but some
 * R2 thru values linger) — R3+ features are never blocked.
 */

/**
 * Checks whether a golfer has completed their current round.
 * Only "18" and "F" (finished) count — suspended ("S"), partial holes,
 * tee times, null, and undefined all return false.
 */
function isRoundComplete(thru) {
  const t = String(thru || '').trim().toUpperCase();
  return t === '18' || t === 'F';
}

export function deriveTournamentState(golferStats, liveMode) {
  const vals = Object.values(golferStats || {});

  // Extract the shared per-row values (every row has the same current_round and cut_line).
  const currentRound = vals.find(v => v.current_round != null)?.current_round ?? 1;
  const cutLine = vals.find(v => v.cut_line != null)?.cut_line ?? null;

  // Only consider golfers still actively playing the tournament.
  // Cut, withdrawn, and disqualified golfers are excluded from the
  // "has everyone finished?" checks — they can't play more holes.
  const activeGolfers = vals.filter(
    v => v.status === 'active',
  );

  // R2 completion: every active golfer has thru 18 or F.
  const allActiveFinishedR2 =
    currentRound === 2 &&
    activeGolfers.length > 0 &&
    activeGolfers.every(v => isRoundComplete(v.thru));

  // SAFETY OVERRIDE: if we're in R3 or beyond, the cut is finalized
  // regardless of what thru values say. This prevents a stale R2 thru
  // value from blocking R3+ UI features after a weather delay.
  const cutFinalized = currentRound >= 3 || allActiveFinishedR2;
  const r2InProgress = currentRound === 2 && !cutFinalized;

  // Tournament completion: every active golfer has finished R4.
  const allFinishedR4 =
    currentRound === 4 &&
    activeGolfers.length > 0 &&
    activeGolfers.every(v => isRoundComplete(v.thru));
  const tournamentComplete = currentRound > 4 || allFinishedR4;

  // Derived UI flags
  const showCutLine = liveMode && currentRound >= 2 && cutLine != null;
  const showBubble = showCutLine && r2InProgress;
  const showBelowCut = showCutLine && cutFinalized;
  const cutLabel = cutFinalized ? 'Cut' : 'Projected Cut';
  const showCutFeatures = showCutLine; // master gate

  return {
    currentRound,
    cutLine,
    r2InProgress,
    cutFinalized,
    tournamentComplete,
    showCutLine,
    showBubble,
    showBelowCut,
    cutLabel,
    showCutFeatures,
  };
}
