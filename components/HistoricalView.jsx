'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { HISTORICAL_DATA } from '@/lib/historicalData';

const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";

const CURRENT_YEAR = new Date().getFullYear();
const fmt$ = (n) => '$' + n.toLocaleString();
const fmtE = (n) => '$' + (n / 1000000).toFixed(2) + 'M';

// ─── CSV helpers (unchanged) ─────────────────────────────────────────────

function generateCSV(allData, selectedYears) {
  const multi = selectedYears.length > 1;
  const header = multi
    ? 'Year,Finish,Patron,Tournament Earnings'
    : 'Finish,Patron,Tournament Earnings';
  const lines = [header];
  [...selectedYears].sort().forEach(y => {
    (allData[y] || []).forEach(r => {
      const name = `"${(r.name || '').replace(/"/g, '""')}"`;
      if (multi) lines.push(`${y},${r.finish},${name},${r.earnings || 0}`);
      else lines.push(`${r.finish},${name},${r.earnings || 0}`);
    });
  });
  return lines.join('\n');
}

function downloadBlob(csv, years) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const sorted = [...years].sort();
  a.href = url;
  a.download = sorted.length === 1
    ? `masters-pool-${sorted[0]}.csv`
    : `masters-pool-${sorted[0]}-${sorted[sorted.length - 1]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Download modal ──────────────────────────────────────────────────────

function DownloadModal({ open, onClose, allData, years, yearMeta }) {
  const [selected, setSelected] = useState(new Set(years));
  if (!open) return null;
  const allSelected = selected.size === years.length;
  const toggleYear = (y) => setSelected(p => { const n = new Set(p); n.has(y) ? n.delete(y) : n.add(y); return n; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(years));
  const count = selected.size;
  const label = count === 0 ? 'Select years to download' : count === years.length ? 'Download all years → CSV' : count === 1 ? `Download ${[...selected][0]} → CSV` : `Download ${count} years → CSV`;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(26,46,26,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 360, maxWidth: '100%', background: '#fff', borderRadius: 12, border: '1px solid #e0dbd2', boxShadow: '0 20px 50px rgba(0,0,0,.2)', overflow: 'hidden', fontFamily: sans }}>
        <div style={{ padding: '18px 20px 14px', position: 'relative' }}>
          <div style={{ fontFamily: bask, fontStyle: 'italic', fontSize: 18, color: '#1a2e1a', marginBottom: 2 }}>Download Results</div>
          <div style={{ fontSize: 12, color: '#8b7d6b' }}>Select years to export as CSV</div>
          <button type="button" onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', fontSize: 16, color: '#8b7d6b', cursor: 'pointer', padding: 4 }}>✕</button>
        </div>
        <div style={{ padding: '0 20px 12px' }}>
          <button type="button" onClick={toggleAll} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${allSelected ? '#006B54' : '#e0dbd2'}`, background: allSelected ? '#f0faf5' : '#fff', color: allSelected ? '#006B54' : '#8b7d6b', fontSize: 12, fontWeight: 600, fontFamily: sans, cursor: 'pointer', textAlign: 'left' }}>
            {allSelected ? '✓ All years selected' : 'Select all years'}
          </button>
        </div>
        <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {years.map(y => {
            const m = yearMeta[y] || {};
            const checked = selected.has(y);
            return (
              <div key={y} onClick={() => toggleYear(y)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${checked ? '#006B54' : '#e0dbd2'}`, background: checked ? '#f0faf5' : '#fff' }}>
                <div style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${checked ? '#006B54' : '#d9d3c7'}`, background: checked ? '#006B54' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {checked && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2e1a' }}>{y}</div>
                  <div style={{ fontSize: 10, color: '#8b7d6b', marginTop: 1 }}>
                    {m.entries || 0} entries · {fmt$(m.purse || 0)} purse · 🏆 {m.winner || '—'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '0 20px 18px' }}>
          <button type="button" disabled={count === 0} onClick={() => { downloadBlob(generateCSV(allData, [...selected]), [...selected]); onClose(); }} style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none', background: count === 0 ? '#e0dbd2' : '#006B54', color: count === 0 ? '#8b7d6b' : '#fff', fontSize: 13, fontWeight: 700, fontFamily: sans, cursor: count === 0 ? 'not-allowed' : 'pointer', letterSpacing: 0.3 }}>
            {label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Finish badge ────────────────────────────────────────────────────────

function FinishBadge({ n }) {
  const colors = { 1: '#d4af37', 2: '#8b7d6b', 3: '#9a7c2f' };
  const isTop3 = n <= 3;
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: isTop3 ? colors[n] : '#f0ede5', border: isTop3 ? 'none' : '1px solid #e0dbd2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: bask, color: isTop3 ? '#fff' : '#8b7d6b' }}>{n}</span>
    </div>
  );
}

// ─── Year card ───────────────────────────────────────────────────────────

function YearCard({ year, rows, setRows, meta }) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [savedId, setSavedId] = useState(null);
  const [saving, setSaving] = useState(false);

  const filtered = search.trim()
    ? rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditDraft({ finish: row.finish, name: row.name, earnings: row.earnings });
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft({}); };

  const saveEdit = async () => {
    if (saving) return;
    setSaving(true);
    const newFinish = parseInt(editDraft.finish) || 1;
    const newName = editDraft.name;
    const newEarnings = parseInt(editDraft.earnings) || 0;

    // Persist to Supabase
    if (editingId && typeof editingId === 'string' && editingId.length > 10) {
      await supabase.from('historical_results').update({
        finish: newFinish,
        patron_name: newName,
        earnings: newEarnings,
      }).eq('id', editingId);
    }

    const updated = rows.map(r =>
      r.id === editingId ? { ...r, finish: newFinish, name: newName, earnings: newEarnings } : r
    );
    updated.sort((a, b) => a.finish - b.finish);
    setRows(year, updated);
    setSavedId(editingId);
    setEditingId(null);
    setEditDraft({});
    setSaving(false);
    setTimeout(() => setSavedId(null), 2000);
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e0dbd2', borderRadius: 10, overflow: 'hidden', fontFamily: sans }}>
      {/* Green header */}
      <div style={{ background: '#006B54', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: bask, fontStyle: 'italic', fontSize: 22, fontWeight: 700, color: '#fff' }}>{year} Masters Pool</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>🏆 {meta.winner}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Entries', val: meta.entries },
            { label: 'Purse', val: fmt$(meta.purse) },
            { label: '1st', val: fmt$(meta.first), gold: true },
          ].map(({ label, val, gold }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: gold ? '#d4af37' : '#fff' }}>{val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout row */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e0dbd2', background: '#faf8f4' }}>
        {[
          { place: '1st Place', pct: '60%', amt: fmt$(meta.first), color: '#d4af37' },
          { place: '2nd Place', pct: '30%', amt: fmt$(meta.second), color: '#8b7d6b' },
          { place: '3rd Place', pct: '10%', amt: fmt$(meta.third), color: '#9a7c2f' },
        ].map(({ place, pct, amt, color }, i) => (
          <div key={place} style={{ flex: 1, padding: '10px 14px', textAlign: 'center', borderRight: i < 2 ? '1px solid #e0dbd2' : 'none' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#8b7d6b' }}>{place}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: bask, marginTop: 2 }}>{amt}</div>
            <div style={{ fontSize: 11, color: '#b5a999', marginTop: 1 }}>{pct} of purse</div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #e0dbd2', background: '#f7f4ef' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#b5a999', pointerEvents: 'none' }}>🔍</span>
          <input type="text" placeholder="Search patron name..." value={search} onChange={e => { setSearch(e.target.value); cancelEdit(); }} style={{ width: '100%', padding: '8px 32px', border: '1px solid #e0dbd2', borderRadius: 6, fontSize: 13, color: '#1a2e1a', fontFamily: sans, background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
          {search && <button onClick={() => setSearch('')} type="button" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#b5a999', padding: 0, lineHeight: 1 }}>✕</button>}
        </div>
        {search && <div style={{ fontSize: 11, color: '#8b7d6b', marginTop: 6 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;</div>}
      </div>

      {/* Column headers */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '7px 16px', background: '#f7f4ef', borderBottom: '1px solid #e0dbd2', position: 'sticky', top: 0, zIndex: 1 }}>
        <div style={{ width: 38 }} />
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#8b7d6b' }}>Patron</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#8b7d6b', minWidth: 120, textAlign: 'right' }}>Tournament Earnings</span>
        <div style={{ width: 56 }} />
      </div>

      {/* Scrollable list */}
      <div style={{ maxHeight: 440, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: '#b5a999', fontSize: 13 }}>
            {search ? <>No results for &ldquo;{search}&rdquo;</> : 'No data for this year.'}
          </div>
        ) : filtered.map((row) => {
          const isEditing = editingId === row.id;
          const isSaved = savedId === row.id;
          return (
            <div key={row.id} style={{
              display: 'flex', alignItems: 'center',
              padding: isEditing ? '7px 16px' : '10px 16px',
              borderBottom: '1px solid #f0ede5',
              background: isEditing ? '#fffef0' : isSaved ? '#f0faf5' : row.finish <= 3 ? '#fdfcf6' : '#fff',
              borderLeft: row.finish === 1 ? '3px solid #d4af37' : row.finish <= 3 ? '3px solid #e0dbd2' : '3px solid transparent',
              transition: 'background 0.4s',
            }}>
              <div style={{ width: 38, display: 'flex', alignItems: 'center' }}>
                {isEditing ? (
                  <input type="number" value={editDraft.finish} onChange={e => setEditDraft(d => ({ ...d, finish: e.target.value }))} style={{ width: 34, padding: '3px 2px', textAlign: 'center', border: '1px solid #d4af37', borderRadius: 4, fontSize: 12, fontWeight: 700, fontFamily: bask }} />
                ) : <FinishBadge n={row.finish} />}
              </div>
              {isEditing ? (
                <input type="text" value={editDraft.name} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} style={{ flex: 1, padding: '5px 8px', marginRight: 8, border: '1px solid #d4af37', borderRadius: 4, fontSize: 13, fontFamily: sans }} />
              ) : (
                <span style={{ flex: 1, fontSize: 14, fontWeight: row.finish <= 3 ? 600 : 400, color: isSaved ? '#006B54' : '#1a2e1a' }}>
                  {row.name}
                  {isSaved && <span style={{ fontSize: 11, color: '#006B54', marginLeft: 6, fontWeight: 400 }}>✓ saved</span>}
                </span>
              )}
              {isEditing ? (
                <input type="number" value={editDraft.earnings} onChange={e => setEditDraft(d => ({ ...d, earnings: e.target.value }))} style={{ width: 110, padding: '5px 8px', textAlign: 'right', border: '1px solid #d4af37', borderRadius: 4, fontSize: 13, fontFamily: sans }} />
              ) : (
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: bask, color: '#006B54', minWidth: 120, textAlign: 'right' }}>{fmtE(row.earnings)}</span>
              )}
              <div style={{ width: 56, display: 'flex', justifyContent: 'flex-end', gap: 4, marginLeft: 8 }}>
                {isEditing ? (
                  <>
                    <button onClick={saveEdit} disabled={saving} title="Save" type="button" style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: '#006B54', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓</button>
                    <button onClick={cancelEdit} title="Cancel" type="button" style={{ padding: '4px 7px', borderRadius: 4, border: '1px solid #e0dbd2', background: '#fff', color: '#8b7d6b', fontSize: 12, cursor: 'pointer' }}>✕</button>
                  </>
                ) : (
                  <button onClick={() => startEdit(row)} type="button" style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #e0dbd2', background: '#f7f4ef', color: '#8b7d6b', fontSize: 11, fontWeight: 600, fontFamily: sans, cursor: 'pointer' }}>Edit</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────

export default function HistoricalView() {
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState({});    // { year: [{ id, finish, name, earnings }] }
  const [yearMeta, setYearMeta] = useState({});  // { year: { entries, purse, first, second, third, winner } }
  const [activeYear, setActiveYear] = useState(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [has2026, setHas2026] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | done | error
  const [saveMsg, setSaveMsg] = useState('');

  // Fetch all historical results from Supabase on mount.
  // Falls back to lib/historicalData.js if the table is empty or missing.
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('historical_results')
          .select('id, year, finish, patron_name, earnings, entries, pool_purse')
          .order('year', { ascending: false })
          .order('finish', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          // Group by year
          const grouped = {};
          data.forEach(r => {
            const y = String(r.year);
            if (!grouped[y]) grouped[y] = [];
            grouped[y].push({ id: r.id, finish: r.finish, name: r.patron_name, earnings: r.earnings });
          });
          setAllData(grouped);

          // Build meta per year
          const meta = {};
          Object.entries(grouped).forEach(([y, rows]) => {
            const first = data.find(r => String(r.year) === y);
            const purse = first?.pool_purse || 0;
            const entries = first?.entries || rows.length;
            const winner = rows.find(r => r.finish === 1);
            meta[y] = {
              entries,
              purse,
              first: Math.round(purse * 0.6),
              second: Math.round(purse * 0.3),
              third: Math.round(purse * 0.1),
              winner: winner?.name || '—',
            };
          });
          setYearMeta(meta);
          setHas2026(!!grouped[String(CURRENT_YEAR)]);

          const sortedYears = Object.keys(grouped).sort((a, b) => b - a);
          setActiveYear(sortedYears[0] || '2025');
        } else {
          // Fallback to static JS data
          const jsYears = HISTORICAL_DATA.years || {};
          const grouped = {};
          const meta = {};
          Object.entries(jsYears).forEach(([y, entry]) => {
            const results = entry?.results || [];
            const pool = entry?.pool || {};
            grouped[y] = results.map((r, i) => ({ id: `js-${y}-${i}`, finish: r.finish, name: r.name, earnings: r.earnings }));
            const winner = results.find(r => r.finish === 1);
            meta[y] = {
              entries: pool.entries || results.length,
              purse: pool.purse || 0,
              first: pool.first || 0,
              second: pool.second || 0,
              third: pool.third || 0,
              winner: winner?.name || '—',
            };
          });
          setAllData(grouped);
          setYearMeta(meta);
          const sortedYears = Object.keys(grouped).sort((a, b) => b - a);
          setActiveYear(sortedYears[0] || '2025');
        }
      } catch {
        // If table doesn't exist, fall back silently
        setAllData({});
        setYearMeta({});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const years = useMemo(() =>
    Object.keys(yearMeta).filter(y => y !== '2022').sort((a, b) => b - a),
    [yearMeta],
  );

  const setRowsForYear = useCallback((year, rows) => {
    setAllData(prev => ({ ...prev, [year]: rows }));
  }, []);

  // Save current year's final results
  const save2026 = async () => {
    if (saveStatus === 'saving' || has2026) return;
    setSaveStatus('saving');
    setSaveMsg('');

    try {
      // Pull entries + earnings from Supabase
      const [{ data: entries, error: e1 }, { data: earningsData, error: e2 }] = await Promise.all([
        supabase.from('entries').select('id, name, status').eq('status', 'confirmed'),
        supabase.from('golfer_earnings').select('golfer_name, earnings'),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      const allEntries = entries || [];
      const earningsMap = {};
      (earningsData || []).forEach(r => { earningsMap[r.golfer_name] = Number(r.earnings); });

      // Load each entry's picks to compute total earnings
      const { data: fullEntries, error: e3 } = await supabase
        .from('entries')
        .select('name, group1, group2a, group2b, group3a, group3b, group4')
        .eq('status', 'confirmed');
      if (e3) throw e3;

      const PICK_COLS = ['group1', 'group2a', 'group2b', 'group3a', 'group3b', 'group4'];
      const ranked = (fullEntries || []).map(e => {
        const total = PICK_COLS.reduce((s, col) => s + (earningsMap[e[col]] || 0), 0);
        return { name: e.name, total };
      }).sort((a, b) => b.total - a.total);

      // Assign finish positions (handle ties)
      let currentRank = 1;
      ranked.forEach((r, i) => {
        if (i > 0 && r.total < ranked[i - 1].total) currentRank = i + 1;
        r.finish = currentRank;
      });

      const poolPurse = allEntries.length * 25;
      const rows = ranked.map(r => ({
        year: CURRENT_YEAR,
        finish: r.finish,
        patron_name: r.name,
        earnings: r.total,
        entries: allEntries.length,
        pool_purse: poolPurse,
      }));

      const { error: insertErr } = await supabase.from('historical_results').insert(rows);
      if (insertErr) throw insertErr;

      setSaveStatus('done');
      setSaveMsg(`${CURRENT_YEAR} results saved — ${rows.length} entries recorded`);
      setHas2026(true);

      // Refresh data
      const grouped = rows.map((r, i) => ({
        id: `new-${i}`,
        finish: r.finish,
        name: r.patron_name,
        earnings: r.earnings,
      })).sort((a, b) => a.finish - b.finish);
      setAllData(prev => ({ ...prev, [String(CURRENT_YEAR)]: grouped }));
      const winner = grouped.find(r => r.finish === 1);
      setYearMeta(prev => ({
        ...prev,
        [String(CURRENT_YEAR)]: {
          entries: allEntries.length,
          purse: poolPurse,
          first: Math.round(poolPurse * 0.6),
          second: Math.round(poolPurse * 0.3),
          third: Math.round(poolPurse * 0.1),
          winner: winner?.name || '—',
        },
      }));
      setActiveYear(String(CURRENT_YEAR));
    } catch (err) {
      setSaveStatus('error');
      setSaveMsg(err?.message || 'Failed to save results');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 16px', textAlign: 'center', color: '#8b7d6b', fontStyle: 'italic' }}>
        Loading historical data…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header row */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: bask, fontStyle: 'italic', fontSize: 22, color: '#1a2e1a', marginBottom: 4 }}>Pool History</div>
          <div style={{ fontSize: 13, color: '#8b7d6b' }}>Year-by-year results, payouts, and tournament earnings. No 2022 — Alex was in Brazil.</div>
        </div>
        <button type="button" onClick={() => setDownloadOpen(true)} style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 6, border: '1px solid #e0dbd2', background: '#fff', color: '#006B54', fontSize: 11, fontWeight: 600, fontFamily: sans, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
          ↓ Download CSV
        </button>
      </div>

      <DownloadModal open={downloadOpen} onClose={() => setDownloadOpen(false)} allData={allData} years={years} yearMeta={yearMeta} />

      {/* Save Current Year card */}
      <div style={{
        background: '#fff', border: '1px solid #e0dbd2', borderRadius: 10,
        padding: '16px 18px', marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2e1a', marginBottom: 3 }}>
              Save Current Year Results
            </div>
            <div style={{ fontSize: 11, color: '#8b7d6b', lineHeight: 1.4 }}>
              Once the tournament is complete and final earnings are locked, click to save {CURRENT_YEAR} standings to the historical record.
            </div>
          </div>
          <button
            type="button"
            disabled={has2026 || saveStatus === 'saving'}
            onClick={save2026}
            style={{
              flexShrink: 0, padding: '10px 18px', borderRadius: 6,
              border: 'none',
              background: has2026 ? '#e0dbd2' : saveStatus === 'saving' ? '#8bb89e' : '#006B54',
              color: has2026 ? '#8b7d6b' : '#fff',
              fontSize: 12, fontWeight: 700, fontFamily: sans,
              cursor: has2026 || saveStatus === 'saving' ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', letterSpacing: 0.3,
            }}
          >
            {has2026 ? `${CURRENT_YEAR} Already Saved` : saveStatus === 'saving' ? 'Saving…' : `Save ${CURRENT_YEAR} Final Results`}
          </button>
        </div>
        {saveMsg && (
          <div style={{
            marginTop: 10, fontSize: 12, fontWeight: 500,
            color: saveStatus === 'error' ? '#c0392b' : '#006B54',
          }}>
            {saveStatus === 'done' ? '✓ ' : ''}{saveMsg}
          </div>
        )}
      </div>

      {/* Year selector tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(years.length + 1, 6)}, 1fr)`, gap: 8, marginBottom: 20 }}>
        {years.map(y => {
          const m = yearMeta[y] || {};
          const isActive = y === activeYear;
          return (
            <div key={y} onClick={() => setActiveYear(y)} style={{
              background: isActive ? '#006B54' : '#fff',
              border: `1px solid ${isActive ? '#006B54' : '#e0dbd2'}`,
              borderRadius: 8, padding: '10px 8px', textAlign: 'center', cursor: 'pointer',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: isActive ? 'rgba(255,255,255,0.7)' : '#8b7d6b', marginBottom: 4 }}>{y}</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: bask, color: isActive ? '#fff' : '#1a2e1a' }}>{m.entries || 0}</div>
              <div style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,0.6)' : '#b5a999', marginTop: 2 }}>entries</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#d4af37' : '#006B54', marginTop: 4 }}>{fmt$(m.purse || 0)}</div>
            </div>
          );
        })}
        {/* 2022 no-pool tile */}
        <div style={{ background: 'transparent', border: '1px dashed #e0dbd2', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#d9d3c7', marginBottom: 4 }}>2022</div>
          <div style={{ fontSize: 11, color: '#d9d3c7', marginTop: 10, lineHeight: 1.3 }}>No pool</div>
          <div style={{ fontSize: 10, color: '#d9d3c7', marginTop: 3 }}>Alex in Brazil</div>
        </div>
      </div>

      {activeYear && yearMeta[activeYear] && (
        <YearCard
          key={activeYear}
          year={activeYear}
          rows={allData[activeYear] || []}
          setRows={setRowsForYear}
          meta={yearMeta[activeYear]}
        />
      )}
    </div>
  );
}
