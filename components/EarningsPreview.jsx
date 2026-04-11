'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MASTERS_PAYOUTS, getPayoutForPosition } from '@/lib/mastersPayout';

const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";

const G  = '#006B54';
const GD = '#d4af37';
const DK = '#1a2e1a';
const CR = '#f7f4ef';
const BD = '#e0dbd2';
const MT = '#8b7d6b';
const LM = '#b5a999';
const RD = '#c0392b';

const fmtM    = n => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
const fmtFull = n => '$' + n.toLocaleString();
const fmtScore = n => n == null ? '—' : n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`;
const scoreColor = (n, mc) => mc ? LM : n < 0 ? G : n > 0 ? RD : DK;

const PICK_COLS = ['group1', 'group2a', 'group2b', 'group3a', 'group3b', 'group4'];

function EarningsRow({ entry, rank, expanded, onToggle }) {
  const isTop3 = rank <= 3;
  const badgeColors = { 1: GD, 2: '#8b7d6b', 3: '#9a7c2f' };
  return (
    <div style={{ marginBottom: 6 }}>
      <div onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', padding: '11px 14px',
        background: isTop3 ? '#fdfcf6' : '#fff',
        border: `1px solid ${BD}`,
        borderLeft: isTop3 ? `3px solid ${badgeColors[rank] ?? BD}` : '3px solid transparent',
        borderRadius: expanded ? '8px 8px 0 0' : 8,
        cursor: 'pointer', gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: isTop3 ? badgeColors[rank] : '#f0ede5',
          border: isTop3 ? 'none' : `1px solid ${BD}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: bask, color: isTop3 ? '#fff' : MT }}>{rank}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: DK }}>{entry.name}</div>
          <div style={{ fontSize: 11, color: LM, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.breakdown.map(g => g.golfer.split(' ').slice(-1)[0]).join(' · ')}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: bask, fontWeight: 700, fontSize: 16, color: G }}>{fmtM(entry.total)}</div>
          <div style={{ fontSize: 10, color: LM }}>{fmtFull(entry.total)}</div>
        </div>
        <span style={{ fontSize: 11, color: LM, marginLeft: 4 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ background: '#faf8f4', border: `1px solid ${BD}`, borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', padding: '6px 14px', background: '#f0ede5', borderBottom: `1px solid ${BD}` }}>
            <span style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT }}>Golfer</span>
            <span style={{ width: 40, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT, textAlign: 'center' }}>Pos</span>
            <span style={{ width: 44, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT, textAlign: 'center' }}>Score</span>
            <span style={{ width: 90, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT, textAlign: 'right' }}>Earnings</span>
          </div>
          {entry.breakdown.map(g => {
            const isMC = g.status === 'cut' || g.status === 'withdrawn';
            return (
              <div key={g.golfer} style={{
                display: 'flex', alignItems: 'center', padding: '8px 14px',
                borderBottom: `1px solid ${BD}`, opacity: isMC ? 0.45 : 1,
              }}>
                <span style={{ flex: 1, fontSize: 13, color: DK, fontWeight: g.earnings > 500000 ? 600 : 400 }}>{g.golfer}</span>
                <span style={{ width: 40, fontSize: 12, color: MT, textAlign: 'center', fontFamily: bask }}>
                  {isMC ? 'MC' : (g.pos || '—')}
                </span>
                <span style={{ width: 44, fontSize: 12, textAlign: 'center', fontFamily: bask, fontWeight: 700, color: scoreColor(g.score, isMC) }}>
                  {isMC ? '—' : fmtScore(g.score)}
                </span>
                <span style={{ width: 90, fontSize: 13, fontWeight: 600, fontFamily: bask, color: isMC ? LM : G, textAlign: 'right' }}>
                  {isMC ? '$0 (MC)' : fmtFull(g.earnings)}
                </span>
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', background: '#f0ede5' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: MT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Team Total</span>
            <span style={{ fontFamily: bask, fontWeight: 700, fontSize: 15, color: G }}>{fmtFull(entry.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EarningsPreview() {
  const [golferData, setGolferData] = useState(null);
  const [entriesData, setEntriesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [gRes, eRes] = await Promise.all([
      supabase.from('golfer_leaderboard').select('golfer_name, position, score_to_par, status'),
      supabase.from('entries').select('name, group1, group2a, group2b, group3a, group3b, group4, status').eq('status', 'confirmed'),
    ]);
    setGolferData(gRes.data || []);
    setEntriesData(eRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const results = useMemo(() => {
    if (!golferData || !entriesData) return [];

    const golferMap = new Map();
    golferData.forEach(g => golferMap.set(g.golfer_name, g));

    // Build position → count map for tie-splitting
    const positionCounts = {};
    golferData.forEach(g => {
      if (g.status === 'cut' || g.status === 'withdrawn') return;
      const pos = g.position;
      if (!pos) return;
      // Parse numeric position from "T14" or "14"
      const num = parseInt(String(pos).replace(/[^\d]/g, ''), 10);
      if (Number.isFinite(num)) {
        positionCounts[num] = (positionCounts[num] || 0) + 1;
      }
    });

    const ranked = entriesData.map(e => {
      const breakdown = PICK_COLS.map(col => {
        const golferName = e[col];
        const g = golferMap.get(golferName);
        const isMC = g && (g.status === 'cut' || g.status === 'withdrawn');
        const posStr = g?.position;
        const posNum = posStr ? parseInt(String(posStr).replace(/[^\d]/g, ''), 10) : null;
        const tied = Number.isFinite(posNum) ? (positionCounts[posNum] || 1) : 1;
        const earnings = isMC || !Number.isFinite(posNum)
          ? 0
          : getPayoutForPosition(posNum, tied);
        return {
          golfer: golferName,
          pos: posStr || null,
          score: g?.score_to_par ?? null,
          status: g?.status ?? 'active',
          earnings,
        };
      });
      const total = breakdown.reduce((s, g) => s + g.earnings, 0);
      return { name: e.name, total, breakdown };
    });

    ranked.sort((a, b) => b.total - a.total);
    let cr = 1;
    ranked.forEach((r, i) => {
      if (i > 0 && r.total < ranked[i - 1].total) cr = i + 1;
      r.rank = cr;
    });

    return ranked;
  }, [golferData, entriesData]);

  const cutMakers = golferData ? golferData.filter(g => g.status !== 'cut' && g.status !== 'withdrawn').length : 0;
  const mcCount = golferData ? golferData.filter(g => g.status === 'cut' || g.status === 'withdrawn').length : 0;

  const filtered = search
    ? results.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    : results;

  if (loading) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 16px', textAlign: 'center', color: MT, fontStyle: 'italic' }}>
        Loading earnings data…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px', fontFamily: sans }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: bask, fontStyle: 'italic', fontSize: 22, color: DK, marginBottom: 4 }}>
            2026 Earnings Preview
          </div>
          <div style={{ fontSize: 13, color: MT }}>
            Estimated standings based on current tournament positions · Not visible to patrons
          </div>
        </div>
        <button type="button" onClick={fetchData} style={{
          flexShrink: 0, padding: '7px 14px', borderRadius: 6,
          border: `1px solid ${BD}`, background: '#fff', color: G,
          fontSize: 11, fontWeight: 600, fontFamily: sans, cursor: 'pointer',
          whiteSpace: 'nowrap', letterSpacing: 0.3,
        }}>
          ↻ Refresh
        </button>
      </div>

      {/* Disclaimer */}
      <div style={{
        background: '#fffbea', border: '1px solid #f0d060',
        borderRadius: 8, padding: '10px 14px', marginBottom: 16,
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#7a5c00', marginBottom: 2 }}>Estimated earnings — not official</div>
          <div style={{ fontSize: 12, color: '#9a7a20', lineHeight: 1.5 }}>
            Based on 2025 payout % distribution scaled to an assumed <strong>$22M purse</strong>.
            MC golfers contribute $0. Tie positions use current leaderboard — may shift as rounds complete.
            Augusta will release official 2026 payouts after Sunday&rsquo;s round.
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { lbl: 'Assumed Purse', val: '$22M', sub: '+$1M vs 2025' },
          { lbl: 'Cut Makers', val: String(cutMakers), sub: 'earning players' },
          { lbl: 'MC = $0', val: String(mcCount), sub: 'contribute nothing' },
          { lbl: 'Winner Est.', val: '$4.4M', sub: 'was $4.2M in 2025' },
        ].map(({ lbl, val, sub }) => (
          <div key={lbl} style={{
            background: '#fff', border: `1px solid ${BD}`, borderRadius: 8,
            padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT, marginBottom: 4 }}>{lbl}</div>
            <div style={{ fontFamily: bask, fontWeight: 700, fontSize: 18, color: DK }}>{val}</div>
            <div style={{ fontSize: 10, color: LM, marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: LM, pointerEvents: 'none' }}>🔍</span>
        <input
          placeholder="Search patron name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '9px 12px 9px 32px',
            border: `1px solid ${BD}`, borderRadius: 7,
            fontSize: 13, fontFamily: sans, background: '#fff',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} type="button" style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: LM,
          }}>✕</button>
        )}
      </div>

      {/* Column headers */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '5px 14px', marginBottom: 6 }}>
        <div style={{ width: 38 }} />
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT }}>Patron</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT, textAlign: 'right' }}>Est. Team Earnings</span>
        <div style={{ width: 28 }} />
      </div>

      {/* Results */}
      {filtered.map(entry => (
        <EarningsRow
          key={entry.name}
          entry={entry}
          rank={entry.rank}
          expanded={expanded === entry.name}
          onToggle={() => setExpanded(expanded === entry.name ? null : entry.name)}
        />
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: LM, fontSize: 13 }}>
          No results for &ldquo;{search}&rdquo;
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 20, padding: '12px 14px', background: '#fff',
        border: `1px solid ${BD}`, borderRadius: 8,
        fontSize: 12, color: MT, textAlign: 'center',
      }}>
        Rankings update on manual refresh · Switch to official earnings mode Sunday after R4 completes
      </div>
    </div>
  );
}
