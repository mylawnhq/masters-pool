'use client';
import { useState, useMemo } from 'react';

const fmt = n => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${n.toLocaleString()}`;
const fmtFull = n => `$${n.toLocaleString()}`;
const medal = r => r === 1 ? '🏆' : r === 2 ? '🥈' : r === 3 ? '🥉' : null;
const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";

export default function Leaderboard({ entries, earnings }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const hasEarnings = Object.keys(earnings).length > 0;
  const totalEntries = entries.length;
  const poolPurse = totalEntries * 25;

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
      return { ...e, picks, total };
    });

    if (hasEarnings) {
      list.sort((a, b) => b.total - a.total);
      let r = 1;
      list.forEach((e, i) => {
        e.rank = (i > 0 && e.total === list[i - 1].total) ? list[i - 1].rank : r;
        r = i + 2;
      });
    } else {
      list.forEach(e => { e.rank = null; });
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [entries, earnings, hasEarnings]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search) return ranked;
    const q = search.toLowerCase();
    return ranked.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.picks.some(p => p.golfer.toLowerCase().includes(q))
    );
  }, [ranked, search]);

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
    <div style={{ minHeight: '100vh', overflowX: 'hidden', maxWidth: '100vw' }}>
      {/* STICKY HEADER */}
      <div className="sticky-header">
        {/* Top bar */}
        <div style={{ background: '#006B54', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>
            Mendoza's Masters Pool • 2026
          </div>
          {hasEarnings && (
            <span style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#d4af37', fontWeight: 600 }}>
              ✦ Results Posted
            </span>
          )}
        </div>

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

          {/* Stats bar */}
          <div style={{ padding: '14px 0 0' }}>
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
            gridTemplateColumns: hasEarnings ? 'minmax(36px,48px) 1fr minmax(74px,108px) minmax(48px,68px) 24px' : '1fr 24px',
            padding: '12px 0', fontSize: 9, letterSpacing: 2.5,
            textTransform: 'uppercase', color: '#8b7d6b', fontWeight: 700,
            borderBottom: '1px solid #e0dbd2', marginTop: 14,
          }}>
            {hasEarnings && <div>Pos</div>}
            <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hasEarnings ? 'Name' : 'Name (A–Z)'}
            </div>
            {hasEarnings && <div style={{ textAlign: 'right' }}>Earnings</div>}
            {hasEarnings && <div style={{ textAlign: 'right' }}>Score</div>}
            <div />
          </div>
        </div>
      </div>

      {/* SCROLLING BODY */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px' }}>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map((entry, idx) => {
            const open = expanded === entry.id;
            const top3 = hasEarnings && entry.rank <= 3;
            const m = hasEarnings ? medal(entry.rank) : null;

            return (
              <div key={entry.id}>
                {/* Row */}
                <div
                  onClick={() => setExpanded(open ? null : entry.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: hasEarnings ? 'minmax(36px,48px) 1fr minmax(74px,108px) minmax(48px,68px) 24px' : '1fr 24px',
                    alignItems: 'center', padding: '13px 0', cursor: 'pointer',
                    userSelect: 'none', transition: 'background .12s',
                    background: open ? '#f0ede5' : top3 ? '#fdfcf8' : idx % 2 === 0 ? '#fff' : '#faf8f4',
                    borderBottom: open ? 'none' : '1px solid #eee9e0',
                    borderLeft: top3 ? `3px solid ${entry.rank === 1 ? '#d4af37' : entry.rank === 2 ? '#a0a0a0' : '#b87333'}` : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#f5f2eb'; }}
                  onMouseLeave={e => { if (!open) e.currentTarget.style.background = open ? '#f0ede5' : top3 ? '#fdfcf8' : idx % 2 === 0 ? '#fff' : '#faf8f4'; }}
                >
                  {hasEarnings && (
                    <div style={{
                      fontSize: m ? 19 : 15, fontWeight: 700, fontFamily: bask,
                      color: entry.rank === 1 ? '#d4af37' : entry.rank === 2 ? '#777' : entry.rank === 3 ? '#b87333' : '#8b7d6b',
                    }}>{m || entry.rank}</div>
                  )}
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontSize: 14, fontWeight: top3 ? 700 : 500, color: top3 ? '#006B54' : '#1a2e1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</div>
                    <div style={{ fontSize: 11, color: '#a09888', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.picks[0].golfer} • {entry.picks[1].golfer} • +4 more
                    </div>
                  </div>
                  {hasEarnings && (
                    <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 700, fontFamily: bask, color: top3 ? '#006B54' : '#1a2e1a' }}>
                      {fmt(entry.total)}
                    </div>
                  )}
                  {hasEarnings && (
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
                  maxHeight: open ? 520 : 0, opacity: open ? 1 : 0, overflow: 'hidden',
                  transition: 'max-height .4s cubic-bezier(.4,0,.2,1), opacity .3s ease',
                }}>
                  <div style={{
                    background: 'linear-gradient(180deg, #f0ede5 0%, #f7f4ef 100%)',
                    borderBottom: '1px solid #e0dbd2', padding: '20px 20px 24px',
                  }}>
                    {/* Earnings summary */}
                    {hasEarnings && (
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

                    {!hasEarnings && (
                      <div style={{
                        marginBottom: 16, padding: '10px 14px', background: '#fff8e1',
                        border: '1px solid #ffe082', borderRadius: 6, fontSize: 12,
                        color: '#f57f17', textAlign: 'center',
                      }}>
                        Earnings will populate after the tournament concludes Sunday
                      </div>
                    )}

                    {/* Pick grid (3 cols → 2 cols ≤640 → 1 col ≤400) */}
                    <div className="picks-grid">
                      {entry.picks.map((p, i) => {
                        const pe = hasEarnings ? (earnings[p.golfer] || 0) : null;
                        return (
                          <div key={i} style={{
                            background: '#fff', borderRadius: 8,
                            border: '1px solid #e0dbd2', padding: '14px 14px 12px',
                            boxShadow: '0 1px 4px rgba(0,0,0,.04)',
                            position: 'relative', overflow: 'hidden',
                          }}>
                            <div style={{
                              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                              background: !hasEarnings ? '#006B54' : pe >= 1e6 ? '#006B54' : pe >= 4e5 ? '#2a9d6e' : pe >= 1e5 ? '#8bb89e' : '#d9d3c7',
                            }} />
                            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#006B54', fontWeight: 700, marginBottom: 6 }}>
                              {p.group}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2e1a', marginBottom: hasEarnings ? 8 : 0, lineHeight: 1.2 }}>
                              {p.golfer}
                            </div>
                            {hasEarnings && (
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
                      <div style={{
                        background: '#fff', borderRadius: 8, border: '1px solid #e0dbd2',
                        padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,.04)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#8b7d6b', fontWeight: 700, marginBottom: 2 }}>Tiebreaker 1</div>
                          <div style={{ fontSize: 10, color: '#a09888' }}>Low Amateur</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#006B54', fontFamily: bask, textAlign: 'right' }}>{entry.low_amateur}</div>
                      </div>
                      <div style={{
                        background: '#fff', borderRadius: 8, border: '1px solid #e0dbd2',
                        padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,.04)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#8b7d6b', fontWeight: 700, marginBottom: 2 }}>Tiebreaker 2</div>
                          <div style={{ fontSize: 10, color: '#a09888' }}>Winning Score</div>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#006B54', fontFamily: bask }}>{entry.winning_score}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#b5a999', fontSize: 14 }}>
              {search ? `No entries match "${search}"` : 'No entries loaded yet'}
            </div>
          )}
        </div>

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
    </div>
  );
}
