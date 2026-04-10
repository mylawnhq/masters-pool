'use client';
import { useEffect, useMemo, useState } from 'react';

const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";

// localStorage key for pinned golfer favorites. Stored as a JSON array of
// golfer names.
const FAVORITES_KEY = 'masters-golfer-favorites';

// Row grid: star (22px) | position (40px) | name (1fr) | score (54px) | thru (54px)
const ROW_GRID = '22px 40px 1fr 54px 54px';

// Augusta National front 9 + back 9 par values, holes 1–18.
const AUGUSTA_PARS = [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4];
const PAR_OUT = AUGUSTA_PARS.slice(0, 9).reduce((a, b) => a + b, 0); // 36
const PAR_IN = AUGUSTA_PARS.slice(9).reduce((a, b) => a + b, 0);    // 36
const PAR_TOTAL = PAR_OUT + PAR_IN;                                  // 72

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

// Render a single hole stroke value with the appropriate Masters-style shape
// drawn around it: birdie green circle, eagle gold double circle, bogey green
// square, double-bogey-or-worse red double square. Pars and unplayed holes
// render plain.
function HoleCell({ strokes, par }) {
  if (strokes == null) {
    return <span style={{ color: '#d9d3c7', fontSize: 12 }}>—</span>;
  }
  const diff = strokes - par;
  let shape = null;
  if (diff <= -2) shape = 'eagle';        // double circle gold
  else if (diff === -1) shape = 'birdie'; // circle green
  else if (diff === 1) shape = 'bogey';   // square green
  else if (diff >= 2) shape = 'double';   // double square red

  const SIZE = 22;
  const numberSpan = (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: '#1a2e1a',
        fontFamily: bask,
        lineHeight: 1,
      }}
    >
      {strokes}
    </span>
  );

  if (!shape) {
    // No shape — render the number in a fixed-size flex box so unwrapped
    // cells line up vertically with the wrapped ones above and below.
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: SIZE,
          height: SIZE,
        }}
      >
        {numberSpan}
      </span>
    );
  }

  const stroke =
    shape === 'eagle' ? '#d4af37'
    : shape === 'double' ? '#c0392b'
    : '#006B54';
  const isCircle = shape === 'eagle' || shape === 'birdie';
  const isDouble = shape === 'eagle' || shape === 'double';

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: SIZE,
        height: SIZE,
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          border: `1.4px solid ${stroke}`,
          borderRadius: isCircle ? '50%' : 2,
          pointerEvents: 'none',
        }}
      />
      {isDouble && (
        <span
          style={{
            position: 'absolute',
            inset: 3,
            border: `1.4px solid ${stroke}`,
            borderRadius: isCircle ? '50%' : 1,
            pointerEvents: 'none',
          }}
        />
      )}
      {numberSpan}
    </span>
  );
}

function sumStrokes(holes, from, to) {
  let total = 0;
  let any = false;
  for (let i = from; i < to; i++) {
    if (holes[i] != null) {
      total += holes[i];
      any = true;
    }
  }
  return any ? total : null;
}

// Inline scorecard expansion: front 9 stacked over back 9, both as
// table-layout: fixed so cells are equal width and seamless.
function ScorecardExpanded({ holes, currentRound }) {
  // Normalize incoming current_round_scores into a flat 18-length stroke array.
  // Accepts either { strokes, scoreType } objects or raw stroke numbers, so
  // older snapshots without the wrapper still render.
  const strokes = useMemo(() => {
    const out = new Array(18).fill(null);
    if (!Array.isArray(holes)) return out;
    holes.slice(0, 18).forEach((h, i) => {
      if (h == null) return;
      if (typeof h === 'number') {
        out[i] = Number.isFinite(h) ? h : null;
      } else if (typeof h === 'object' && Number.isFinite(h.strokes)) {
        out[i] = h.strokes;
      }
    });
    return out;
  }, [holes]);

  const outStrokes = sumStrokes(strokes, 0, 9);
  const inStrokes = sumStrokes(strokes, 9, 18);
  const totalStrokes =
    outStrokes != null && inStrokes != null
      ? outStrokes + inStrokes
      : outStrokes ?? inStrokes;

  // Total is only meaningful relative to par for the holes actually played.
  const playedPar = strokes.reduce(
    (sum, s, i) => (s != null ? sum + AUGUSTA_PARS[i] : sum),
    0,
  );
  const totalDiff =
    totalStrokes != null && playedPar > 0 ? totalStrokes - playedPar : null;
  const totalDiffLabel =
    totalDiff == null
      ? '—'
      : totalDiff === 0
      ? 'E'
      : totalDiff > 0
      ? `+${totalDiff}`
      : `${totalDiff}`;
  const totalDiffColor =
    totalDiff == null
      ? '#8b7d6b'
      : totalDiff < 0
      ? '#006B54'
      : totalDiff > 0
      ? '#c0392b'
      : '#1a2e1a';

  const allBlank = strokes.every(s => s == null);

  const cellBase = {
    border: '1px solid #e8e3d6',
    padding: '6px 0',
    textAlign: 'center',
    fontSize: 11,
  };
  const headBase = {
    ...cellBase,
    background: '#f0ede5',
    color: '#8b7d6b',
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontSize: 9,
  };
  const totalCell = {
    ...cellBase,
    background: '#f7f4ef',
    fontFamily: bask,
    fontWeight: 700,
    fontSize: 12,
    color: '#1a2e1a',
  };

  const renderNine = (start, label, totalForNine, parForNine) => (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
        marginTop: start === 0 ? 0 : 4,
      }}
    >
      <colgroup>
        <col style={{ width: '13%' }} />
        {Array.from({ length: 9 }).map((_, i) => (
          <col key={i} />
        ))}
        <col style={{ width: '13%' }} />
      </colgroup>
      <thead>
        <tr>
          <th style={headBase}>Hole</th>
          {Array.from({ length: 9 }).map((_, i) => (
            <th key={i} style={headBase}>
              {start + i + 1}
            </th>
          ))}
          <th style={headBase}>{label}</th>
        </tr>
        <tr>
          <th style={headBase}>Par</th>
          {AUGUSTA_PARS.slice(start, start + 9).map((p, i) => (
            <th key={i} style={headBase}>
              {p}
            </th>
          ))}
          <th style={headBase}>{parForNine}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ ...cellBase, background: '#f0ede5', color: '#8b7d6b', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Score
          </td>
          {Array.from({ length: 9 }).map((_, i) => {
            const hi = start + i;
            return (
              <td key={i} style={{ ...cellBase, background: '#fff', height: 30 }}>
                <HoleCell strokes={strokes[hi]} par={AUGUSTA_PARS[hi]} />
              </td>
            );
          })}
          <td style={totalCell}>
            {totalForNine != null ? totalForNine : ''}
          </td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div
      style={{
        background: '#faf8f4',
        borderTop: '1px solid #eee9e0',
        borderBottom: '1px solid #eee9e0',
        padding: '12px 14px',
      }}
    >
      {allBlank ? (
        <div
          style={{
            textAlign: 'center',
            color: '#8b7d6b',
            fontStyle: 'italic',
            fontSize: 12,
            padding: '4px 0',
          }}
        >
          No Round {currentRound || 1} holes recorded yet
        </div>
      ) : (
        <>
          {renderNine(0, 'Out', outStrokes, PAR_OUT)}
          {renderNine(9, 'In', inStrokes, PAR_IN)}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              padding: '8px 12px',
              background: '#fff',
              border: '1px solid #e8e3d6',
              borderRadius: 4,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: '#8b7d6b',
                fontWeight: 700,
              }}
            >
              Round {currentRound || 1} Total
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span
                style={{
                  fontFamily: bask,
                  fontWeight: 700,
                  fontSize: 16,
                  color: '#1a2e1a',
                }}
              >
                {totalStrokes != null ? totalStrokes : '—'}
              </span>
              <span
                style={{
                  fontFamily: bask,
                  fontWeight: 700,
                  fontSize: 13,
                  color: totalDiffColor,
                }}
              >
                {totalDiffLabel}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function MastersLeaderboardOverlay({ open, onClose, golferStats }) {
  const [expanded, setExpanded] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);
  const [search, setSearch] = useState('');

  // Hydrate favorites from localStorage once on mount (client-only).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(FAVORITES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setFavorites(parsed.filter(n => typeof n === 'string'));
        }
      }
    } catch {
      // Corrupt value — ignore and start empty.
    }
    setFavoritesHydrated(true);
  }, []);

  // Persist favorites whenever they change (after initial hydration).
  useEffect(() => {
    if (!favoritesHydrated) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // Storage full / disabled — swallow.
    }
  }, [favorites, favoritesHydrated]);

  const toggleFavorite = (name) => {
    setFavorites(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  // Set for O(1) lookup inside the row renderer and filter.
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  // Reset expansion + search when the overlay closes so reopening is clean.
  useEffect(() => {
    if (!open) {
      setExpanded(null);
      setSearch('');
    }
  }, [open]);

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
        current_round_scores: s?.current_round_scores ?? null,
        current_round: s?.current_round ?? 1,
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
              gridTemplateColumns: ROW_GRID,
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
            <div />
            <div>Pos</div>
            <div>Player</div>
            <div style={{ textAlign: 'right' }}>Score</div>
            <div style={{ textAlign: 'right' }}>Thru</div>
          </div>

          {/* Search input — filters the list by golfer name. Compact version
              of the main leaderboard search bar. */}
          <div style={{ padding: '10px 14px 8px', background: '#fff', borderBottom: '1px solid #f0ede5' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search golfer…"
              aria-label="Search golfers"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontFamily: sans,
                fontSize: 13,
                color: '#1a2e1a',
                background: '#fff',
                border: '1px solid #d9d3c7',
                borderRadius: 6,
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: '0 1px 2px rgba(0,0,0,.03)',
              }}
            />
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

          {/* Row renderer shared by My Golfers and the full-field list. */}
          {(() => {
            const query = search.trim().toLowerCase();
            const isSearching = query.length > 0;
            const favGolfers = list.filter(g => favoritesSet.has(g.name));
            const filtered = isSearching
              ? list.filter(g => g.name.toLowerCase().includes(query))
              : list;

            const renderRow = (g, i, section) => {
              const posNum = parseInt(
                String(g.position || '').replace(/[^\d]/g, ''),
                10,
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
              // Expansion state is keyed by name only so tapping a favorite in
              // the My Golfers section also reveals the scorecard if the same
              // player is viewed in the main list (and vice versa).
              const isExpanded = expanded === g.name;
              const isFav = favoritesSet.has(g.name);

              return (
                <div key={`${section}-${g.name}`}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => setExpanded(isExpanded ? null : g.name)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpanded(isExpanded ? null : g.name);
                      }
                    }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: ROW_GRID,
                      gap: 8,
                      padding: '10px 14px',
                      alignItems: 'center',
                      borderLeft: `3px solid ${isTop3 ? '#d4af37' : 'transparent'}`,
                      borderBottom: '1px solid #f0ede5',
                      background: isExpanded
                        ? '#f7f4ef'
                        : i % 2 === 0 ? '#fff' : '#faf8f4',
                      opacity: isOut ? 0.55 : 1,
                      cursor: 'pointer',
                      textAlign: 'left',
                      outline: 'none',
                    }}
                  >
                    {/* Star — toggles favorite, stopPropagation so it doesn't expand the row */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={isFav}
                      aria-label={isFav ? `Remove ${g.name} from My Golfers` : `Add ${g.name} to My Golfers`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(g.name);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(g.name);
                        }
                      }}
                      style={{
                        fontSize: 16,
                        lineHeight: 1,
                        color: isFav ? '#d4af37' : '#d9d3c7',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 24,
                        width: 22,
                        userSelect: 'none',
                      }}
                    >
                      {isFav ? '★' : '☆'}
                    </div>

                    {/* Position */}
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

                    {/* Name + tap hint */}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#1a2e1a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {g.name}
                      </div>
                      {!isOut && (
                        <div
                          style={{
                            fontSize: 9,
                            color: '#b5a999',
                            marginTop: 2,
                            letterSpacing: 0.3,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {isExpanded ? 'Tap to close' : 'Tap for scorecard'}
                        </div>
                      )}
                    </div>

                    {/* Score */}
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

                    {/* Thru */}
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
                  {isExpanded && <ScorecardExpanded holes={g.current_round_scores} currentRound={g.current_round} />}
                </div>
              );
            };

            return (
              <>
                {/* My Golfers pinned section — hidden during search */}
                {!isSearching && favGolfers.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 14px 6px',
                        fontSize: 10,
                        letterSpacing: 1.8,
                        textTransform: 'uppercase',
                        color: '#d4af37',
                        fontWeight: 700,
                      }}
                    >
                      <span>★</span>
                      <span>My Golfers ({favGolfers.length})</span>
                      <div
                        style={{
                          flex: 1,
                          height: 1,
                          background: 'linear-gradient(90deg, #e8dcc0, transparent)',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        border: '1px solid #e8dcc0',
                        borderRadius: 6,
                        margin: '0 10px 10px',
                        overflow: 'hidden',
                        background: '#fdfcf6',
                      }}
                    >
                      {favGolfers.map((g, i) => renderRow(g, i, 'fav'))}
                    </div>
                  </div>
                )}

                {/* Full field (or flat filtered results while searching) */}
                {filtered.map((g, i) => renderRow(g, i, 'main'))}

                {isSearching && filtered.length === 0 && (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      color: '#8b7d6b',
                      fontStyle: 'italic',
                      fontSize: 13,
                    }}
                  >
                    No golfers match “{search}”
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
