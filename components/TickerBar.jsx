'use client';
import { useMemo } from 'react';

// Infer the current tournament round from the date in Eastern time.
// Masters 2026: Thu Apr 9 (R1) through Sun Apr 12 (R4).
function detectRound() {
  const now = new Date();
  // EDT is UTC-4 in April.
  const eastern = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const y = eastern.getUTCFullYear();
  const m = eastern.getUTCMonth() + 1;
  const d = eastern.getUTCDate();
  if (y !== 2026 || m !== 4) return null;
  if (d === 9) return 1;
  if (d === 10) return 2;
  if (d === 11) return 3;
  if (d === 12) return 4;
  return null;
}

function posSortKey(pos) {
  if (pos == null) return 9999;
  const s = String(pos).trim();
  if (s === '' || s === '-' || s === '--') return 9999;
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : 9999;
}

function lastNameOf(full) {
  if (!full) return '';
  const parts = String(full).trim().split(/\s+/);
  return parts[parts.length - 1];
}

function fmtScore(n) {
  if (n == null) return '—';
  if (n === 0) return 'E';
  return n > 0 ? `+${n}` : `${n}`;
}

function scoreColor(n) {
  if (n == null) return '#8b7d6b';
  if (n < 0) return '#006B54';
  if (n > 0) return '#c0392b';
  return '#8b7d6b';
}

function TickerItem({ golfer, dimmed }) {
  const { name, position, score_to_par, thru } = golfer;
  const hasStarted =
    position != null &&
    String(position).trim() !== '' &&
    String(position).trim() !== '-' &&
    score_to_par != null;

  const posNum = parseInt(String(position || '').replace(/[^\d]/g, ''), 10);
  const isTop3 = hasStarted && Number.isFinite(posNum) && posNum > 0 && posNum <= 3;

  return (
    <div className="ticker-item" style={dimmed ? { opacity: 0.4 } : undefined}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: isTop3 ? '#d4af37' : '#8b7d6b',
          letterSpacing: 0.5,
        }}
      >
        {hasStarted ? position : '—'}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2e1a' }}>
        {lastNameOf(name)}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: scoreColor(hasStarted ? score_to_par : null),
        }}
      >
        {hasStarted ? fmtScore(score_to_par) : '—'}
      </span>
      {thru && (
        <span style={{ fontSize: 10, color: '#b5a999' }}>{thru}</span>
      )}
    </div>
  );
}

function TickerBadge({ label }) {
  return (
    <div className="ticker-badge">
      <span className="ticker-dot" />
      <span>{label}</span>
    </div>
  );
}

function CutBadge({ cutLine }) {
  return (
    <div
      className="ticker-item"
      style={{
        background: '#c0392b',
        color: '#fff',
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: 1,
        padding: '8px 12px',
        whiteSpace: 'nowrap',
      }}
    >
      CUT {fmtScore(cutLine)}
    </div>
  );
}

export default function TickerBar({ golferStats, show, cutLine, currentRound }) {
  const round = useMemo(() => detectRound(), []);
  const badgeLabel = round ? `R${round} Live` : 'Live';
  const showCut = (currentRound ?? 0) >= 2 && cutLine != null;

  const list = useMemo(() => {
    const all = Object.entries(golferStats || {}).map(([name, s]) => ({
      name,
      position: s?.position ?? null,
      score_to_par: s?.score_to_par ?? null,
      thru: s?.thru ?? null,
      status: s?.status ?? 'active',
    }));
    return all
      // Keep withdrawn out, but keep cut golfers during R2+ so they show dimmed
      .filter(g => g.status !== 'withdrawn')
      .sort((a, b) => {
        // Push officially cut golfers to the end
        const aCut = a.status === 'cut';
        const bCut = b.status === 'cut';
        if (aCut !== bCut) return aCut ? 1 : -1;
        const pa = posSortKey(a.position);
        const pb = posSortKey(b.position);
        if (pa !== pb) return pa - pb;
        const sa = a.score_to_par == null ? 999 : a.score_to_par;
        const sb = b.score_to_par == null ? 999 : b.score_to_par;
        return sa - sb;
      });
  }, [golferStats]);

  if (!show || list.length === 0) return null;

  // Find index where the CUT badge should be inserted: the first non-cut
  // golfer whose score > cutLine. Golfers at exactly cutLine are "on the
  // bubble" and render above the line.
  const cutInsertIdx = showCut
    ? list.findIndex(g => g.status !== 'cut' && g.score_to_par != null && g.score_to_par > cutLine)
    : -1;

  const group = (
    <div className="ticker-group">
      <TickerBadge label={badgeLabel} />
      {list.map((g, i) => {
        const isCut = g.status === 'cut';
        const isBelowCut = showCut && !isCut && g.score_to_par != null && g.score_to_par > cutLine;
        return (
          <span key={`${g.name}-${i}`} style={{ display: 'contents' }}>
            {i === cutInsertIdx && <CutBadge cutLine={cutLine} />}
            <TickerItem golfer={g} dimmed={isCut || isBelowCut} />
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="ticker-bar" aria-label="Live golfer leaderboard">
      <div className="ticker-track">
        {group}
        {group}
      </div>
    </div>
  );
}
