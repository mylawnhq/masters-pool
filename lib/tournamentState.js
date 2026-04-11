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
 */

export function deriveTournamentState(golferStats, liveMode) {
  const vals = Object.values(golferStats || {});

  // Extract the shared per-row values (every row has the same current_round and cut_line).
  const currentRound = vals.find(v => v.current_round != null)?.current_round ?? 1;
  const cutLine = vals.find(v => v.cut_line != null)?.cut_line ?? null;

  // R2 in-progress: we're in round 2 and not everyone has finished.
  // "Finished" = thru is "18" or "F" for active golfers, or status is cut/withdrawn.
  const activeGolfers = vals.filter(
    v => v.status !== 'cut' && v.status !== 'withdrawn',
  );
  const allActiveFinishedR2 =
    currentRound === 2 &&
    activeGolfers.length > 0 &&
    activeGolfers.every(v => {
      const thru = String(v.thru || '').toUpperCase();
      return thru === '18' || thru === 'F';
    });

  // Cut is finalized when we're past R2, or when R2 is done and everyone
  // has either been marked cut or finished 18 holes.
  const cutFinalized = currentRound > 2 || allActiveFinishedR2;
  const r2InProgress = currentRound === 2 && !cutFinalized;

  // Tournament is complete after R4 finishes.
  const allFinishedR4 =
    currentRound === 4 &&
    activeGolfers.length > 0 &&
    activeGolfers.every(v => {
      const thru = String(v.thru || '').toUpperCase();
      return thru === '18' || thru === 'F';
    });
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
