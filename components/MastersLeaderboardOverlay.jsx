'use client';
import { useEffect, useMemo } from 'react';

const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";

function posSortKey(pos) {
  if (pos == null) return 9999;
  const s = String(pos).trim();
  if (!s || s === '-' || s === '--') return 9999;
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : 9999;
}

function fmtScore(n) {
  if (n == null) return '—';
  if (n === 0) return 'E';
  return n > 0 ? `+${n}` : `${n}`;
}

function scoreColor(n, status) {
  if (status === 'cut' || status === 'withdrawn') return '#8b7d6b';
  if (n == null) return '#8b7d6b';
  if (n < 0) return '#006B54';
  if (n > 0) return '#c0392b';
  return '#1a2e1a';
}

export default function MastersLeaderboardOverlay({ open, onClose, golferStats }) {
  // Lock body scroll while open, close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const list = useMemo(() => {
    return Object.entries(golferStats || {})
      .map(([name, s]) => ({
        name,
        position: s?.position ?? null,
        score_to_par: s?.score_to_par ?? null,
        thru: s?.thru ?? null,
        status: s?.status ?? 'active',
      }))
      .sort((a, b) => {
        const aOut = a.status === 'cut' || a.status === 'withdrawn';
        const bOut = b.status === 'cut' || b.status === 'withdrawn';
        if (aOut !== bOut) return aOut ? 1 : -1;
        const pa = posSortKey(a.position);
        const pb = posSortKey(b.position);
        if (pa !== pb) return pa - pb;
        const sa = a.score_to_par == null ? 999 : a.score_to_par;
        const sb = b.score_to_par == null ? 999 : b.score_to_par;
        return sa - sb;
      });
  }, [golferStats]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Masters Leaderboard"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(12, 20, 14, 0.72)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'calc(100% - 32px)',
          maxWidth: 480,
          maxHeight: '70vh',
          background: '#fff',
          borderRadius: '0 0 12px 12px',
          boxShadow: '0 24px 50px rgba(0,0,0,.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: sans,
        }}
      >
        {/* Panel header */}
        <div
          style={{
            background: '#006B54',
            color: '#fff',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 6px rgba(74, 222, 128, .8)',
                animation: 'ticker-dot-pulse 1.6s ease-in-out infinite',
              }}
            />
            Masters Leaderboard
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255,255,255,.12)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              width: 28,
              height: 28,
              borderRadius: '50%',
              fontSize: 14,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Sticky column header */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              background: '#f7f4ef',
              display: 'grid',
              gridTemplateColumns: '44px 1fr 54px 54px',
              gap: 8,
              padding: '10px 16px',
              fontSize: 9,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#8b7d6b',
              fontWeight: 700,
              borderBottom: '1px solid #e0dbd2',
            }}
          >
            <div>Pos</div>
            <div>Name</div>
            <div style={{ textAlign: 'right' }}>Score</div>
            <div style={{ textAlign: 'right' }}>Thru</div>
          </div>

          {list.length === 0 && (
            <div
              style={{
                padding: 24,
                textAlign: 'center',
                color: '#8b7d6b',
                fontStyle: 'italic',
                fontSize: 13,
              }}
            >
              No golfer data yet
            </div>
          )}

          {list.map((g, i) => {
            const posNum = parseInt(
              String(g.position || '').replace(/[^\d]/g, ''),
              10
            );
            const isOut = g.status === 'cut' || g.status === 'withdrawn';
            const isTop3 =
              !isOut &&
              Number.isFinite(posNum) &&
              posNum > 0 &&
              posNum <= 3;
            const posLabel = isOut
              ? g.status === 'cut'
                ? 'CUT'
                : 'WD'
              : g.position || '—';
            return (
              <div
                key={`${g.name}-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr 54px 54px',
                  gap: 8,
                  padding: '10px 16px',
                  alignItems: 'center',
                  borderLeft: `3px solid ${isTop3 ? '#d4af37' : 'transparent'}`,
                  borderBottom: '1px solid #f0ede5',
                  background: i % 2 === 0 ? '#fff' : '#faf8f4',
                  opacity: isOut ? 0.55 : 1,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isTop3 ? '#d4af37' : '#8b7d6b',
                    fontFamily: bask,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {posLabel}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1a2e1a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 0,
                  }}
                >
                  {g.name}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: scoreColor(g.score_to_par, g.status),
                    fontFamily: bask,
                    textAlign: 'right',
                  }}
                >
                  {g.score_to_par == null ? '—' : fmtScore(g.score_to_par)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#8b7d6b',
                    textAlign: 'right',
                  }}
                >
                  {g.thru || '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
