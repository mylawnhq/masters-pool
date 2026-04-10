'use client';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logEvent } from '@/lib/analytics';
import TickerBar from './TickerBar';
import MastersLeaderboardOverlay from './MastersLeaderboardOverlay';

const fmt = n => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${n.toLocaleString()}`;
const fmtFull = n => `$${n.toLocaleString()}`;
const medal = r => r === 1 ? '🏆' : r === 2 ? '🥈' : r === 3 ? '🥉' : null;
const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";

// Score-to-par formatting and color used by the live aggregate UI.
const fmtPar = n => {
  if (n == null) return '—';
  if (n === 0) return 'E';
  return n > 0 ? `+${n}` : `${n}`;
};
const parColor = n => {
  if (n == null) return '#8b7d6b';
  if (n < 0) return '#006B54';
  if (n > 0) return '#c0392b';
  return '#1a2e1a';
};
// Pick-card top bar color, keyed off golfer status / score-to-par.
const cardBarColor = (stat) => {
  if (!stat) return '#d9d3c7';
  if (stat.status === 'cut' || stat.status === 'withdrawn') return '#c0392b';
  const s = stat.score_to_par;
  if (s == null) return '#d9d3c7';
  if (s <= -8) return '#006B54';
  if (s <= -3) return '#2a9d6e';
  if (s <= 2)  return '#8bb89e';
  return '#d9d3c7';
};

function timeAgo(iso) {
  if (!iso) return null;
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m === 1) return '1 minute ago';
  if (m < 60) return `${m} minutes ago`;
  const h = Math.floor(m / 60);
  if (h === 1) return '1 hour ago';
  if (h < 24) return `${h} hours ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? '1 day ago' : `${d} days ago`;
}

const FAVORITES_KEY = 'masters-pool-favorites';

export default function Leaderboard({ entries, earnings: initialEarnings, golferStats: initialGolferStats, lastUpdated: initialLastUpdated, pickCounts = {}, scoresLive }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [earnings, setEarnings] = useState(initialEarnings || {});
  const [golferStats, setGolferStats] = useState(initialGolferStats || {});
  const [lastUpdated, setLastUpdated] = useState(initialLastUpdated || null);
  const [, setTick] = useState(0); // re-render so "X minutes ago" stays fresh
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const handleShare = (entry) => {
    logEvent({ eventType: 'share' });
    const pickLines = entry.picks.map(p => `${p.group}: ${p.golfer}`).join('\n');
    const text = `${entry.name}'s Masters Pool Picks:\n${pickLines}\nLow Amateur: ${entry.low_amateur}\nWinning Score: ${entry.winning_score}`;
    const done = () => {
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(c => (c === entry.id ? null : c)), 2000);
    };
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        // Fallback for older browsers
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          done();
        } catch (e) { /* swallow */ }
      });
    }
  };

  // Analytics: log a pageview once per mount.
  useEffect(() => {
    logEvent({ eventType: 'pageview' });
  }, []);

  // Analytics: debounced search logging — only fires after the user stops
  // typing for 1s, and only when the query is 3+ characters.
  useEffect(() => {
    const q = search.trim();
    if (q.length < 3) return;
    const id = setTimeout(() => {
      logEvent({ eventType: 'search', searchQuery: q });
    }, 1000);
    return () => clearTimeout(id);
  }, [search]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(FAVORITES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setFavorites(parsed);
      }
    } catch (e) {
      // ignore corrupt storage
    }
    setFavoritesLoaded(true);
  }, []);

  // Persist favorites whenever they change (after initial load)
  useEffect(() => {
    if (!favoritesLoaded || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) {
      // ignore quota errors
    }
  }, [favorites, favoritesLoaded]);

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const hasEarnings = Object.keys(earnings).length > 0;
  const hasLiveScores = Object.keys(golferStats).length > 0;
  // Live aggregate-score mode: T–Sat, ranking by sum of golfer score_to_par.
  // Earnings mode is intentionally not surfaced yet — it'll be flipped on Sunday.
  const liveMode = scoresLive && hasLiveScores;

  // Derive cut-line values from any row in golferStats (every row carries the
  // same value per cron cycle). These drive the cut line visuals across the
  // mobile header, ticker, overlay, and pick cards.
  const { cutLine, currentRound, showCutFeatures } = useMemo(() => {
    const vals = Object.values(golferStats);
    const cl = vals.find(v => v.cut_line != null)?.cut_line ?? null;
    const cr = vals.find(v => v.current_round != null)?.current_round ?? 1;
    return {
      cutLine: cl,
      currentRound: cr,
      showCutFeatures: liveMode && cr >= 2 && cl != null,
    };
  }, [golferStats, liveMode]);

  const totalEntries = entries.length;
  const poolPurse = totalEntries * 25;

  // Live polling: every 2 minutes whenever the tournament is live.
  // Pulls golfer_leaderboard for aggregate scoring; earnings come along for
  // free so the Sunday flip-over doesn't need a code change here.
  useEffect(() => {
    if (!scoresLive) return;
    if (typeof window === 'undefined') return;

    let cancelled = false;
    async function refresh() {
      try {
        const fetchGolfers = async () => {
          const res = await supabase
            .from('golfer_leaderboard')
            .select('golfer_name, position, score_to_par, thru, status, current_round_scores, current_round, cut_line, updated_at');
          if (res.error && /current_round|cut_line/i.test(res.error.message || '')) {
            return supabase
              .from('golfer_leaderboard')
              .select('golfer_name, position, score_to_par, thru, status, updated_at');
          }
          return res;
        };
        const [{ data: golferRows }, { data: earningsData }] = await Promise.all([
          fetchGolfers(),
          supabase.from('golfer_earnings').select('golfer_name, earnings'),
        ]);
        if (cancelled) return;
        if (golferRows) {
          const nextStats = {};
          let newest = null;
          golferRows.forEach(r => {
            nextStats[r.golfer_name] = {
              position: r.position,
              score_to_par: r.score_to_par,
              thru: r.thru,
              status: r.status,
              current_round_scores: r.current_round_scores ?? null,
              current_round: r.current_round ?? 1,
              cut_line: r.cut_line ?? null,
            };
            if (r.updated_at && (!newest || r.updated_at > newest)) newest = r.updated_at;
          });
          setGolferStats(nextStats);
          if (newest) setLastUpdated(newest);
        }
        if (earningsData) {
          const next = {};
          earningsData.forEach(r => { next[r.golfer_name] = Number(r.earnings); });
          setEarnings(next);
        }
      } catch (e) {
        // swallow — we'll try again on the next tick
      }
    }
    const id = setInterval(refresh, 120_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [scoresLive]);

  // Tick once a minute so the "X minutes ago" label stays current.
  useEffect(() => {
    if (!lastUpdated) return;
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  const updatedLabel = lastUpdated ? timeAgo(lastUpdated) : null;

  // Build ranked list
  const ranked = useMemo(() => {
    const list = entries.map(e => {
      const picks = [
        { group: 'Group 1', golfer: e.group1 },
        { group: 'Group 2', golfer: e.group2a },
        { group: 'Group 2', golfer: e.group2b },
        { group: 'Group 3', golfer: e.group3a },
        { group: 'Group 3', golfer: e.group3b },
        { group: 'Group 4', golfer: e.group4 },
      ];
      const total = hasEarnings
        ? picks.reduce((s, p) => s + (earnings[p.golfer] || 0), 0)
        : null;
      // Aggregate team score-to-par. Cut/withdrawn golfers contribute 0.
      let aggregate = null;
      if (liveMode) {
        aggregate = picks.reduce((s, p) => {
          const stat = golferStats[p.golfer];
          if (!stat) return s;
          if (stat.status === 'cut' || stat.status === 'withdrawn') return s;
          return s + (stat.score_to_par || 0);
        }, 0);
      }
      return { ...e, picks, total, aggregate };
    });

    if (liveMode) {
      // Lower aggregate = better. Tied entries share a rank ("T2"); the
      // displayed tiebreakers (low am, winning score) are resolved by humans
      // until the tournament concludes.
      list.sort((a, b) => a.aggregate - b.aggregate);
      list.forEach((e, i) => {
        e.rank = (i > 0 && e.aggregate === list[i - 1].aggregate) ? list[i - 1].rank : i + 1;
      });
      const rankCounts = {};
      list.forEach(e => { rankCounts[e.rank] = (rankCounts[e.rank] || 0) + 1; });
      list.forEach(e => { e.posLabel = (rankCounts[e.rank] > 1 ? 'T' : '') + e.rank; });
    } else if (hasEarnings) {
      list.sort((a, b) => b.total - a.total);
      let r = 1;
      list.forEach((e, i) => {
        e.rank = (i > 0 && e.total === list[i - 1].total) ? list[i - 1].rank : r;
        r = i + 2;
      });
    } else {
      list.forEach(e => { e.rank = null; e.posLabel = null; });
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [entries, earnings, hasEarnings, golferStats, liveMode]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search) return ranked;
    const q = search.toLowerCase();
    return ranked.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.picks.some(p => p.golfer.toLowerCase().includes(q))
    );
  }, [ranked, search]);

  // Watching list — favorites in their current ranked order, hidden during search
  const watching = useMemo(() => {
    if (search || favorites.length === 0) return [];
    return ranked.filter(e => favSet.has(e.id));
  }, [ranked, favSet, search, favorites.length]);

  // Golfer search counter
  const golferCount = useMemo(() => {
    if (!search) return null;
    const q = search.toLowerCase();
    const allPicks = entries.flatMap(e => [e.group1, e.group2a, e.group2b, e.group3a, e.group3b, e.group4]);
    const matchGolfer = allPicks.find(g => g.toLowerCase().includes(q));
    if (!matchGolfer) return null;
    const isNameSearch = entries.some(e => e.name.toLowerCase().includes(q));
    if (isNameSearch && !matchGolfer) return null;
    const count = entries.filter(e =>
      [e.group1, e.group2a, e.group2b, e.group3a, e.group3b, e.group4]
        .some(g => g.toLowerCase().includes(q))
    ).length;
    return count > 0 && !isNameSearch ? { count, name: matchGolfer } : null;
  }, [search, entries]);

  const stats = [
    { l: 'Entries',    v: totalEntries,                                            cls: 'stat-entries' },
    { l: 'Pool Purse', v: `$${poolPurse.toLocaleString()}`,                        cls: 'stat-purse' },
    { l: '1st Place',  v: `$${Math.round(poolPurse * 0.6).toLocaleString()}`,      cls: 'stat-1st highlight' },
    { l: '2nd',        v: `$${Math.round(poolPurse * 0.3).toLocaleString()}`,      cls: 'stat-2nd' },
    { l: '3rd',        v: `$${Math.round(poolPurse * 0.1).toLocaleString()}`,      cls: 'stat-3rd' },
  ];

  return (
    <div style={{ minHeight: '100vh', overflowX: 'clip', maxWidth: '100vw' }}>
      {/* STICKY HEADER */}
      <div className="sticky-header">
        {/* Top bar — desktop */}
        <div className="desktop-only" style={{ position: 'relative', background: '#006B54', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>
            Mendoza's Masters Pool • <a href="/admin" style={{ color: 'inherit', textDecoration: 'none' }}>2026</a>
          </div>
          {liveMode && (
            <button
              type="button"
              onClick={() => setLeaderboardOpen(true)}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255,255,255,.1)',
                border: '1px solid rgba(255,255,255,.15)',
                borderRadius: 5,
                padding: '5px 14px',
                color: '#fff',
                fontFamily: sans,
                fontSize: 10,
                letterSpacing: 2,
                textTransform: 'uppercase',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#4ade80',
                  boxShadow: '0 0 6px rgba(74, 222, 128, .8)',
                  animation: 'ticker-dot-pulse 1.6s ease-in-out infinite',
                }}
              />
              Masters Leaderboard
              <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
            </button>
          )}
          {(liveMode || hasEarnings) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {updatedLabel && (
                <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,.6)', fontWeight: 500 }}>
                  Scores updated {updatedLabel}
                </span>
              )}
              <span style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#d4af37', fontWeight: 600 }}>
                {liveMode && !hasEarnings ? '● Live Scoring' : '✦ Results Posted'}
              </span>
            </div>
          )}
        </div>

        {/* Top bar — mobile */}
        <div className="mobile-only" style={{ background: '#006B54', padding: '12px 16px 14px' }}>
          {/* Row 1: brand + year */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>
              Mendoza's Masters Pool
            </div>
            <div style={{ fontSize: 10, letterSpacing: 2.5, color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>
              <a href="/admin" style={{ color: 'inherit', textDecoration: 'none' }}>2026</a>
            </div>
          </div>

          {/* Row 2: two big tiles (entries + pool purse) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <div style={{
              background: 'rgba(255,255,255,.08)', borderRadius: 6,
              padding: '8px 10px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: bask, fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                {totalEntries}
              </div>
              <div style={{
                fontSize: 7, letterSpacing: 1.5, textTransform: 'uppercase',
                color: 'rgba(255,255,255,.55)', fontWeight: 700, marginTop: 4,
              }}>
                Entries
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,.08)', borderRadius: 6,
              padding: '8px 10px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: bask, fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                ${poolPurse.toLocaleString()}
              </div>
              <div style={{
                fontSize: 7, letterSpacing: 1.5, textTransform: 'uppercase',
                color: 'rgba(255,255,255,.55)', fontWeight: 700, marginTop: 4,
              }}>
                Pool Purse
              </div>
            </div>
          </div>

          {/* Row 3: small tiles (1st/2nd/3rd + optional projected cut) */}
          <div style={{ display: 'grid', gridTemplateColumns: cutLine != null ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 6, marginTop: 8 }}>
            {[
              { amt: Math.round(poolPurse * 0.6), label: '1st', color: '#d4af37' },
              { amt: Math.round(poolPurse * 0.3), label: '2nd', color: 'rgba(255,255,255,.6)' },
              { amt: Math.round(poolPurse * 0.1), label: '3rd', color: 'rgba(255,255,255,.6)' },
            ].map((p, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,.05)', borderRadius: 6,
                padding: '6px 6px', textAlign: 'center', minWidth: 0,
              }}>
                <div style={{
                  fontFamily: bask, fontSize: 13, fontWeight: 700, color: p.color, lineHeight: 1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  ${p.amt.toLocaleString()}
                </div>
                <div style={{
                  fontSize: 6, letterSpacing: 1.5, textTransform: 'uppercase',
                  color: 'rgba(255,255,255,.5)', fontWeight: 700, marginTop: 3,
                }}>
                  {p.label}
                </div>
              </div>
            ))}
            {cutLine != null && (
              <div style={{
                background: '#c0392b', borderRadius: 6,
                padding: '6px 6px', textAlign: 'center', minWidth: 0,
              }}>
                <div style={{
                  fontFamily: bask, fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1,
                }}>
                  {cutLine > 0 ? `+${cutLine}` : cutLine === 0 ? 'E' : `${cutLine}`}
                </div>
                <div style={{
                  fontSize: 6, letterSpacing: 1.5, textTransform: 'uppercase',
                  color: 'rgba(255,255,255,.7)', fontWeight: 700, marginTop: 3,
                }}>
                  Proj. Cut
                </div>
              </div>
            )}
          </div>

          {/* Row 4: Masters Leaderboard button — only when scores are live */}
          {liveMode && (
            <button
              type="button"
              onClick={() => setLeaderboardOpen(true)}
              style={{
                marginTop: 10,
                width: '100%',
                background: 'rgba(255,255,255,.08)',
                border: 'none',
                borderRadius: 6,
                padding: '11px 12px',
                color: '#fff',
                fontFamily: sans,
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
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
              <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
            </button>
          )}
        </div>

        {/* Live golfer ticker — only renders when scores are live */}
        <TickerBar golferStats={golferStats} show={liveMode} cutLine={cutLine} currentRound={currentRound} />

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px' }}>
          {/* Title block — hidden on mobile */}
          <header className="mobile-hide" style={{ textAlign: 'center', padding: '28px 0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ height: 1, width: 50, background: 'linear-gradient(90deg, transparent, #006B54)' }} />
              <div style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid #006B54' }} />
              <div style={{ height: 1, width: 50, background: 'linear-gradient(270deg, transparent, #006B54)' }} />
            </div>
            <h1 style={{
              fontFamily: bask, fontSize: 'clamp(26px,5vw,44px)',
              fontWeight: 400, fontStyle: 'italic', color: '#006B54',
              margin: '0 0 4px', lineHeight: 1.15,
            }}>
              Mendoza's Masters Pool
            </h1>
            <div style={{ fontFamily: bask, fontSize: 13, fontStyle: 'italic', color: '#8b7d6b', letterSpacing: 0.5 }}>
              Augusta National Golf Club — April 2026
            </div>
          </header>

          {/* Stats bar — desktop only */}
          <div className="desktop-only" style={{ padding: '14px 0 0' }}>
            <div className="stats-bar">
              {stats.map((s, i) => (
                <div key={i} className={`stat-cell ${s.cls}`}>
                  <div style={{
                    fontSize: 'clamp(13px, 3.6vw, 17px)',
                    fontWeight: 700,
                    color: s.cls.includes('highlight') ? '#d4af37' : '#fff',
                    fontFamily: bask,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>{s.v}</div>
                  <div style={{
                    fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase',
                    color: 'rgba(255,255,255,.55)', marginTop: 2, fontWeight: 600,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {totalEntries === 0 && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <div style={{ display: 'inline-block', padding: '8px 16px', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 6, fontSize: 12, color: '#f57f17' }}>
                Entries will be loaded before the tournament begins Thursday
              </div>
            </div>
          )}

          {/* Search */}
          <div style={{ maxWidth: 440, margin: '14px auto 0' }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or golfer…"
              style={{
                width: '100%', padding: '12px 16px',
                background: '#fff', border: '1px solid #d9d3c7', borderRadius: 8,
                color: '#1a2e1a', fontFamily: sans, fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
                boxShadow: '0 1px 3px rgba(0,0,0,.04)',
              }} />
          </div>
          {golferCount && (
            <div style={{
              maxWidth: 440, margin: '0 auto', padding: '10px 16px',
              background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '0 0 8px 8px',
              fontSize: 13, color: '#2e7d32', textAlign: 'center',
            }}>
              <strong>{golferCount.count}</strong> {golferCount.count === 1 ? 'person' : 'people'} picked <strong>{golferCount.name}</strong>
            </div>
          )}

          {/* Column header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: liveMode
              ? '28px minmax(38px,52px) 1fr minmax(64px,88px) 24px'
              : hasEarnings
                ? '28px minmax(36px,48px) 1fr minmax(74px,108px) minmax(48px,68px) 24px'
                : '28px 1fr 24px',
            padding: '12px 0', fontSize: 9, letterSpacing: 2.5,
            textTransform: 'uppercase', color: '#8b7d6b', fontWeight: 700,
            borderBottom: '1px solid #e0dbd2', marginTop: 14,
          }}>
            <div />
            {(liveMode || hasEarnings) && <div>Pos</div>}
            <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {liveMode ? 'Name' : hasEarnings ? 'Name' : 'Name (A–Z)'}
            </div>
            {liveMode && <div style={{ textAlign: 'right' }}>Team Score</div>}
            {!liveMode && hasEarnings && <div style={{ textAlign: 'right' }}>Earnings</div>}
            {!liveMode && hasEarnings && <div style={{ textAlign: 'right' }}>Score</div>}
            <div />
          </div>

          {/* Live scoring disclaimer — only while in live score-to-par mode */}
          {liveMode && (
            <div
              style={{
                background: '#f0ede5',
                borderBottom: '1px solid #e0dbd2',
                padding: '7px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: '#8b7d6b',
                fontStyle: 'italic',
                fontFamily: sans,
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#d4af37',
                  flexShrink: 0,
                }}
              />
              <span className="desktop-only" style={{ fontSize: 11 }}>
                Current rankings based on aggregate team score · Final results determined by combined tournament earnings
              </span>
              <span className="mobile-only" style={{ fontSize: 9 }}>
                Current rankings by team score · Final results by tournament earnings
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SCROLLING BODY */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px' }}>
        {(() => {
        const renderRow = (entry, idx, section) => {
          const expandKey = `${section}:${entry.id}`;
          const open = expanded === expandKey;
          const ranked3 = (liveMode || hasEarnings) && entry.rank <= 3;
          const top3 = hasEarnings && !liveMode && entry.rank <= 3;
          const m = hasEarnings && !liveMode ? medal(entry.rank) : null;
          const isFav = favSet.has(entry.id);
          const baseBg = ranked3 ? '#fdfcf8' : idx % 2 === 0 ? '#fff' : '#faf8f4';
          const leftBorderColor = isFav
            ? '#d4af37'
            : ranked3
              ? (entry.rank === 1 ? '#d4af37' : entry.rank === 2 ? '#a0a0a0' : '#b87333')
              : 'transparent';
          const gridCols = liveMode
            ? '28px minmax(38px,52px) 1fr minmax(64px,88px) 24px'
            : hasEarnings
              ? '28px minmax(36px,48px) 1fr minmax(74px,108px) minmax(48px,68px) 24px'
              : '28px 1fr 24px';

          return (
            <div key={`${section}-${entry.id}`}>
              {/* Row */}
              <div
                onClick={() => setExpanded(open ? null : expandKey)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  alignItems: 'center', padding: '13px 0', cursor: 'pointer',
                  userSelect: 'none', transition: 'background .12s',
                  background: open ? '#f0ede5' : baseBg,
                  borderBottom: open ? 'none' : '1px solid #eee9e0',
                  borderLeft: `3px solid ${leftBorderColor}`,
                }}
                onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#f5f2eb'; }}
                onMouseLeave={e => { if (!open) e.currentTarget.style.background = open ? '#f0ede5' : baseBg; }}
              >
                <div
                  onClick={e => { e.stopPropagation(); toggleFavorite(entry.id); }}
                  role="button"
                  aria-label={isFav ? 'Remove from Watching' : 'Add to Watching'}
                  aria-pressed={isFav}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: 44, width: 28, marginLeft: -2,
                    fontSize: 18, lineHeight: 1,
                    color: isFav ? '#d4af37' : '#d9d3c7',
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  {isFav ? '★' : '☆'}
                </div>
                {liveMode && (
                  <div style={{
                    fontSize: 15, fontWeight: 700, fontFamily: bask,
                    color: entry.rank === 1 ? '#d4af37' : entry.rank === 2 ? '#777' : entry.rank === 3 ? '#b87333' : '#8b7d6b',
                  }}>{entry.posLabel}</div>
                )}
                {!liveMode && hasEarnings && (
                    <div style={{
                      fontSize: m ? 19 : 15, fontWeight: 700, fontFamily: bask,
                      color: entry.rank === 1 ? '#d4af37' : entry.rank === 2 ? '#777' : entry.rank === 3 ? '#b87333' : '#8b7d6b',
                    }}>{m || entry.rank}</div>
                  )}
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontSize: 14, fontWeight: ranked3 ? 700 : 500, color: ranked3 ? '#006B54' : '#1a2e1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</div>
                    <div style={{ fontSize: 11, color: '#a09888', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.picks[0].golfer}
                      <span className="row-sub-second-golfer"> • {entry.picks[1].golfer}</span>
                      <span style={{ color: '#b5a999' }}> · View picks →</span>
                    </div>
                  </div>
                  {liveMode && (
                    <div style={{
                      textAlign: 'right', fontSize: 16, fontWeight: 700, fontFamily: bask,
                      color: parColor(entry.aggregate),
                    }}>
                      {fmtPar(entry.aggregate)}
                    </div>
                  )}
                  {!liveMode && hasEarnings && (
                    <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 700, fontFamily: bask, color: top3 ? '#006B54' : '#1a2e1a' }}>
                      {fmt(entry.total)}
                    </div>
                  )}
                  {!liveMode && hasEarnings && (
                    <div style={{ textAlign: 'right', fontSize: 12, color: '#8b7d6b', fontStyle: 'italic' }}>{entry.winning_score}</div>
                  )}
                  <div style={{
                    textAlign: 'center', fontSize: 12, color: '#a09888',
                    transform: open ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform .25s',
                  }}>▾</div>
                </div>

                {/* Accordion dropdown */}
                <div style={{
                  maxHeight: open ? 1200 : 0, opacity: open ? 1 : 0, overflow: 'hidden',
                  transition: 'max-height .4s cubic-bezier(.4,0,.2,1), opacity .3s ease',
                }}>
                  <div style={{
                    background: 'linear-gradient(180deg, #f0ede5 0%, #f7f4ef 100%)',
                    borderBottom: '1px solid #e0dbd2', padding: '20px 20px 24px',
                  }}>
                    {/* Live aggregate hero + mini golfer leaderboard */}
                    {liveMode && (
                      <>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #e0dbd2',
                        }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#8b7d6b', fontWeight: 700 }}>Aggregate Team Score</div>
                            <div style={{
                              fontSize: 36, fontWeight: 700, fontFamily: bask,
                              color: parColor(entry.aggregate), marginTop: 2, lineHeight: 1.05,
                            }}>{fmtPar(entry.aggregate)}</div>
                          </div>
                          <div style={{
                            width: 52, height: 52, borderRadius: '50%',
                            background: entry.rank === 1 ? 'linear-gradient(135deg,#d4af37,#f0d060)' : entry.rank === 2 ? 'linear-gradient(135deg,#999,#ccc)' : entry.rank === 3 ? 'linear-gradient(135deg,#b87333,#daa06d)' : '#006B54',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 18,
                            fontWeight: 700, fontFamily: bask, boxShadow: '0 2px 8px rgba(0,0,0,.12)',
                            flexShrink: 0,
                          }}>{entry.posLabel}</div>
                        </div>

                        {/* Mini golfer leaderboard — golfers sorted by score, best first */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{
                            fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                            color: '#8b7d6b', fontWeight: 700, marginBottom: 8,
                          }}>Your golfers — by tournament position</div>
                          <div style={{
                            background: '#fff', borderRadius: 8, border: '1px solid #e0dbd2',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(34px,42px) 1fr minmax(40px,52px) minmax(34px,44px)',
                              padding: '7px 10px', fontSize: 8, letterSpacing: 1.5,
                              textTransform: 'uppercase', color: '#8b7d6b', fontWeight: 700,
                              borderBottom: '1px solid #eee9e0', background: '#faf8f4',
                            }}>
                              <div>Pos</div>
                              <div>Golfer</div>
                              <div style={{ textAlign: 'right' }}>Score</div>
                              <div style={{ textAlign: 'right' }}>Thru</div>
                            </div>
                            {[...entry.picks]
                              .map(p => ({ p, stat: golferStats[p.golfer] }))
                              .sort((a, b) => {
                                const aCut = a.stat?.status === 'cut' || a.stat?.status === 'withdrawn';
                                const bCut = b.stat?.status === 'cut' || b.stat?.status === 'withdrawn';
                                if (aCut !== bCut) return aCut ? 1 : -1;
                                const av = a.stat?.score_to_par ?? 999;
                                const bv = b.stat?.score_to_par ?? 999;
                                return av - bv;
                              })
                              .map(({ p, stat }, gi) => {
                                const isCut = stat?.status === 'cut' || stat?.status === 'withdrawn';
                                const score = stat?.score_to_par;
                                const gBubble = showCutFeatures && !isCut && score != null && score === cutLine;
                                const gBelowCut = showCutFeatures && !isCut && score != null && score > cutLine;
                                return (
                                  <div key={gi} style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(34px,42px) 1fr minmax(40px,52px) minmax(34px,44px)',
                                    padding: '8px 10px', fontSize: 12,
                                    background: isCut ? '#fdecea' : 'transparent',
                                    color: isCut ? '#c0392b' : '#1a2e1a',
                                    borderBottom: gi < 5 ? '1px solid #f3efe6' : 'none',
                                    alignItems: 'center',
                                    opacity: isCut || gBelowCut ? 0.4 : 1,
                                  }}>
                                    <div style={{ fontFamily: bask, fontWeight: 700, fontSize: 12 }}>
                                      {isCut ? 'MC' : (stat?.position || '—')}
                                    </div>
                                    <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <span>{p.golfer}</span>
                                      {gBubble && (
                                        <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', background: '#d4af37', color: '#fff', padding: '1px 4px', borderRadius: 2, flexShrink: 0 }}>
                                          Bubble
                                        </span>
                                      )}
                                      {gBelowCut && (
                                        <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', background: '#c0392b', color: '#fff', padding: '1px 4px', borderRadius: 2, flexShrink: 0 }}>
                                          Below cut
                                        </span>
                                      )}
                                    </div>
                                    <div style={{
                                      textAlign: 'right', fontFamily: bask, fontWeight: 700,
                                      color: isCut ? '#c0392b' : parColor(score),
                                    }}>
                                      {isCut ? 'MC' : fmtPar(score)}
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: 11, color: isCut ? '#c0392b' : '#8b7d6b' }}>
                                      {isCut ? '—' : (stat?.thru || '—')}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </>
                    )}

                    {!liveMode && hasEarnings && (
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #e0dbd2',
                      }}>
                        <div>
                          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#8b7d6b', fontWeight: 700 }}>Combined Earnings</div>
                          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: bask, color: '#006B54', marginTop: 2 }}>{fmtFull(entry.total)}</div>
                        </div>
                        <div style={{
                          width: 52, height: 52, borderRadius: '50%',
                          background: entry.rank === 1 ? 'linear-gradient(135deg,#d4af37,#f0d060)' : entry.rank === 2 ? 'linear-gradient(135deg,#999,#ccc)' : entry.rank === 3 ? 'linear-gradient(135deg,#b87333,#daa06d)' : '#006B54',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: entry.rank <= 3 ? 22 : 16,
                          fontWeight: 700, fontFamily: bask, boxShadow: '0 2px 8px rgba(0,0,0,.12)',
                        }}>{m || entry.rank}</div>
                      </div>
                    )}

                    {!liveMode && !hasEarnings && (
                      <div style={{
                        marginBottom: 16, padding: '10px 14px', background: '#fff8e1',
                        border: '1px solid #ffe082', borderRadius: 6, fontSize: 12,
                        color: '#f57f17', textAlign: 'center',
                      }}>
                        Live scores will populate when the tournament begins Thursday
                      </div>
                    )}

                    {/* Pick grid (3 cols → 2 cols ≤640 → 1 col ≤400) */}
                    <div className="picks-grid">
                      {entry.picks.map((p, i) => {
                        const pe = hasEarnings ? (earnings[p.golfer] || 0) : null;
                        const stat = liveMode ? golferStats[p.golfer] : null;
                        const isCut = stat && (stat.status === 'cut' || stat.status === 'withdrawn');
                        const gBubble = showCutFeatures && stat && !isCut && stat.score_to_par != null && stat.score_to_par === cutLine;
                        const gBelowCut = showCutFeatures && stat && !isCut && stat.score_to_par != null && stat.score_to_par > cutLine;
                        const spaceIdx = p.golfer.indexOf(' ');
                        const firstName = spaceIdx === -1 ? p.golfer : p.golfer.slice(0, spaceIdx);
                        const lastName = spaceIdx === -1 ? '' : p.golfer.slice(spaceIdx + 1);
                        const count = pickCounts[p.golfer] || 0;
                        const barColor = gBubble
                          ? '#d4af37'
                          : gBelowCut
                            ? '#c0392b'
                            : liveMode
                              ? cardBarColor(stat)
                              : !hasEarnings ? '#006B54'
                                : pe >= 1e6 ? '#006B54'
                                : pe >= 4e5 ? '#2a9d6e'
                                : pe >= 1e5 ? '#8bb89e'
                                : '#d9d3c7';
                        const cardBadge = isCut ? 'MC' : gBubble ? 'BUBBLE' : gBelowCut ? 'BELOW CUT' : null;
                        const badgeBg = isCut ? '#c0392b' : gBubble ? '#d4af37' : '#c0392b';
                        return (
                          <div key={i} className="pick-card" style={{
                            background: gBubble ? '#fdfcf6' : '#fff',
                            borderRadius: 8,
                            border: `1px solid ${gBubble ? '#e8dcc0' : '#e0dbd2'}`,
                            padding: '14px 14px 12px',
                            boxShadow: '0 1px 4px rgba(0,0,0,.04)',
                            position: 'relative', overflow: 'hidden', minWidth: 0,
                            opacity: isCut || gBelowCut ? 0.4 : 1,
                          }}>
                            <div style={{
                              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                              background: barColor,
                            }} />
                            {cardBadge && (
                              <div style={{
                                position: 'absolute', top: 6, right: 6,
                                fontSize: 5, fontWeight: 700, letterSpacing: 0.5,
                                textTransform: 'uppercase', color: '#fff',
                                background: badgeBg, padding: '2px 4px',
                                borderRadius: 2, lineHeight: 1,
                                maxWidth: 'calc(100% - 70px)',
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {cardBadge}
                              </div>
                            )}
                            <div className="pick-group" style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: gBubble ? '#d4af37' : '#006B54', fontWeight: 700, marginBottom: 6 }}>
                              {p.group}
                            </div>
                            <div className="pick-name" style={{ color: '#1a2e1a', marginBottom: 4, lineHeight: 1.2 }}>
                              <div style={{ fontSize: 12, fontWeight: 500 }}>{firstName}</div>
                              {lastName && <div style={{ fontSize: 13, fontWeight: 700 }}>{lastName}</div>}
                            </div>
                            <div style={{ fontSize: 10, color: '#b5a999', marginBottom: (liveMode || hasEarnings) ? 8 : 0 }}>
                              #{count} picked
                            </div>
                            {liveMode && (
                              <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                                gap: 6, marginTop: 2,
                              }}>
                                <span style={{
                                  fontSize: 11, fontFamily: bask, fontWeight: 700,
                                  color: isCut ? '#c0392b' : '#8b7d6b',
                                }}>
                                  {isCut ? 'MC' : (stat?.position || '—')}
                                </span>
                                <span style={{
                                  fontSize: 14, fontWeight: 700, fontFamily: bask,
                                  color: isCut ? '#c0392b' : parColor(stat?.score_to_par),
                                }}>
                                  {isCut ? 'MC' : fmtPar(stat?.score_to_par)}
                                </span>
                              </div>
                            )}
                            {!liveMode && hasEarnings && (
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: bask, color: pe >= 5e5 ? '#006B54' : '#1a2e1a' }}>
                                  {pe > 0 ? fmt(pe) : '$0'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Tiebreakers */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                      <div className="tiebreaker-card" style={{
                        background: '#fff', borderRadius: 8, border: '1px solid #e0dbd2',
                        padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,.04)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        minWidth: 0,
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#8b7d6b', fontWeight: 700, marginBottom: 2 }}>Tiebreaker 1</div>
                          <div style={{ fontSize: 10, color: '#a09888' }}>Low Amateur</div>
                        </div>
                        <div className="tb-value" style={{ fontSize: 13, fontWeight: 700, color: '#006B54', fontFamily: bask, textAlign: 'right', wordBreak: 'break-word' }}>{entry.low_amateur}</div>
                      </div>
                      <div className="tiebreaker-card" style={{
                        background: '#fff', borderRadius: 8, border: '1px solid #e0dbd2',
                        padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,.04)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        minWidth: 0,
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#8b7d6b', fontWeight: 700, marginBottom: 2 }}>Tiebreaker 2</div>
                          <div style={{ fontSize: 10, color: '#a09888' }}>Winning Score</div>
                        </div>
                        <div className="tb-value" style={{ fontSize: 20, fontWeight: 700, color: '#006B54', fontFamily: bask }}>{entry.winning_score}</div>
                      </div>
                    </div>

                    {/* Share button */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                      {(() => {
                        const isCopied = copiedId === entry.id;
                        return (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleShare(entry); }}
                            style={{
                              background: isCopied ? '#006B54' : '#fff',
                              border: '1px solid #d9d3c7',
                              color: isCopied ? '#fff' : '#006B54',
                              borderRadius: 6,
                              padding: '8px 16px',
                              fontSize: 12,
                              fontWeight: 600,
                              fontFamily: sans,
                              letterSpacing: 0.3,
                              cursor: 'pointer',
                              transition: 'background .15s, color .15s',
                            }}
                          >
                            {isCopied ? '✓ Copied!' : 'Share picks'}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            );
          };

          return (
            <>
              {watching.length > 0 && (
                <div style={{
                  background: '#fdfcf6',
                  border: '1px solid #d4af37',
                  borderRadius: 8,
                  marginTop: 6,
                  marginBottom: 18,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(212, 175, 55, 0.08)',
                    borderBottom: '1px solid rgba(212, 175, 55, 0.4)',
                    fontSize: 10,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: '#8a6d1a',
                    fontWeight: 700,
                    fontFamily: sans,
                  }}>
                    ★ Watching ({watching.length})
                  </div>
                  <div style={{ padding: '0 14px' }}>
                    {watching.map((entry, idx) => renderRow(entry, idx, 'watching'))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filtered.map((entry, idx) => renderRow(entry, idx, 'main'))}
                {filtered.length === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: '#b5a999', fontSize: 14 }}>
                    {search ? `No entries match "${search}"` : 'No entries loaded yet'}
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '36px 0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(90deg, transparent, #c5bba8)' }} />
            <div style={{ fontFamily: bask, fontStyle: 'italic', color: '#8b7d6b', fontSize: 11 }}>"A Tradition Unlike Any Other"</div>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(270deg, transparent, #c5bba8)' }} />
          </div>
          <div style={{ fontSize: 9, color: '#b5a999', letterSpacing: 1.5 }}>
            MENDOZA'S MASTERS POOL © 2026 — THE CHAIRMAN RESERVES ALL RIGHTS
          </div>
        </footer>
      </div>

      {/* Masters golfer leaderboard overlay — shared across desktop + mobile */}
      <MastersLeaderboardOverlay
        open={leaderboardOpen && liveMode}
        onClose={() => setLeaderboardOpen(false)}
        golferStats={golferStats}
        cutLine={cutLine}
        currentRound={currentRound}
      />
    </div>
  );
}
