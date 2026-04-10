'use client';
import { useState } from 'react';
import { HISTORICAL_DATA } from '@/lib/historicalData';

const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";

const YEARS = ['2025', '2024', '2023', '2021', '2020'];

// Derive metadata from the data file itself — pool stats + winner from 1st-place finisher
const YEAR_META = {};
YEARS.forEach(y => {
  const entry = HISTORICAL_DATA.years?.[y];
  const pool = entry?.pool || {};
  const results = entry?.results || [];
  const winner = results.find(r => r.finish === 1);
  YEAR_META[y] = {
    entries: pool.entries || results.length,
    purse:   pool.purse || 0,
    first:   pool.first || 0,
    second:  pool.second || 0,
    third:   pool.third || 0,
    winner:  winner?.name || '—',
  };
});

// Helper to get results array for a given year
function getResults(year) {
  return HISTORICAL_DATA.years?.[year]?.results || [];
}

const fmt$ = (n) => '$' + n.toLocaleString();
const fmtE = (n) => '$' + (n / 1000000).toFixed(2) + 'M';

function generateCSV(selectedYears) {
  const multi = selectedYears.length > 1;
  const header = multi
    ? 'Year,Finish,Patron,Tournament Earnings'
    : 'Finish,Patron,Tournament Earnings';
  const lines = [header];
  const sorted = [...selectedYears].sort();
  sorted.forEach(y => {
    const results = getResults(y);
    results.forEach(r => {
      const name = `"${(r.name || '').replace(/"/g, '""')}"`;
      const earnings = r.earnings || 0;
      if (multi) {
        lines.push(`${y},${r.finish},${name},${earnings}`);
      } else {
        lines.push(`${r.finish},${name},${earnings}`);
      }
    });
  });
  return lines.join('\n');
}

function downloadCSV(selectedYears) {
  const csv = generateCSV(selectedYears);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  let filename;
  if (selectedYears.length === YEARS.length) {
    filename = 'masters-pool-all-years.csv';
  } else if (selectedYears.length === 1) {
    filename = `masters-pool-${selectedYears[0]}.csv`;
  } else {
    const sorted = [...selectedYears].sort();
    filename = `masters-pool-${sorted[0]}-${sorted[sorted.length - 1]}.csv`;
  }

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DownloadModal({ open, onClose }) {
  const [selected, setSelected] = useState(new Set(YEARS));

  if (!open) return null;

  const allSelected = selected.size === YEARS.length;

  const toggleYear = (y) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(y)) next.delete(y); else next.add(y);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(YEARS));
  };

  const count = selected.size;
  const buttonLabel = count === 0
    ? 'Select years to download'
    : count === YEARS.length
      ? 'Download all years → CSV'
      : count === 1
        ? `Download ${[...selected][0]} → CSV`
        : `Download ${count} years → CSV`;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(26,46,26,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 360, maxWidth: '100%',
          background: '#fff', borderRadius: 12,
          border: '1px solid #e0dbd2',
          boxShadow: '0 20px 50px rgba(0,0,0,.2)',
          overflow: 'hidden', fontFamily: sans,
        }}
      >
        {/* Modal header */}
        <div style={{ padding: '18px 20px 14px', position: 'relative' }}>
          <div style={{
            fontFamily: bask, fontStyle: 'italic', fontSize: 18,
            color: '#1a2e1a', marginBottom: 2,
          }}>Download Results</div>
          <div style={{ fontSize: 12, color: '#8b7d6b' }}>
            Select years to export as CSV
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'none', border: 'none', fontSize: 16,
              color: '#8b7d6b', cursor: 'pointer', padding: 4,
            }}
          >✕</button>
        </div>

        {/* Toggle all */}
        <div style={{ padding: '0 20px 12px' }}>
          <button
            type="button"
            onClick={toggleAll}
            style={{
              width: '100%', padding: '8px 12px',
              borderRadius: 6, border: `1px solid ${allSelected ? '#006B54' : '#e0dbd2'}`,
              background: allSelected ? '#f0faf5' : '#fff',
              color: allSelected ? '#006B54' : '#8b7d6b',
              fontSize: 12, fontWeight: 600, fontFamily: sans,
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            {allSelected ? '✓ All years selected' : 'Select all years'}
          </button>
        </div>

        {/* Year checkboxes */}
        <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {YEARS.map(y => {
            const m = YEAR_META[y];
            const checked = selected.has(y);
            return (
              <div
                key={y}
                onClick={() => toggleYear(y)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${checked ? '#006B54' : '#e0dbd2'}`,
                  background: checked ? '#f0faf5' : '#fff',
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: 16, height: 16, borderRadius: 3,
                  border: `1.5px solid ${checked ? '#006B54' : '#d9d3c7'}`,
                  background: checked ? '#006B54' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {checked && (
                    <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2e1a' }}>{y}</div>
                  <div style={{ fontSize: 10, color: '#8b7d6b', marginTop: 1 }}>
                    {m.entries} entries · {fmt$(m.purse)} purse · 🏆 {m.winner}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Download button */}
        <div style={{ padding: '0 20px 18px' }}>
          <button
            type="button"
            disabled={count === 0}
            onClick={() => {
              downloadCSV([...selected]);
              onClose();
            }}
            style={{
              width: '100%', padding: '12px 16px',
              borderRadius: 8, border: 'none',
              background: count === 0 ? '#e0dbd2' : '#006B54',
              color: count === 0 ? '#8b7d6b' : '#fff',
              fontSize: 13, fontWeight: 700, fontFamily: sans,
              cursor: count === 0 ? 'not-allowed' : 'pointer',
              letterSpacing: 0.3,
            }}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FinishBadge({ n }) {
  const colors = { 1: '#d4af37', 2: '#8b7d6b', 3: '#9a7c2f' };
  const isTop3 = n <= 3;
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: isTop3 ? colors[n] : '#f0ede5',
      border: isTop3 ? 'none' : '1px solid #e0dbd2',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{
        fontSize: 12, fontWeight: 700, fontFamily: bask,
        color: isTop3 ? '#fff' : '#8b7d6b',
      }}>{n}</span>
    </div>
  );
}

function YearCard({ year }) {
  const meta = YEAR_META[year];
  const [rows, setRows] = useState(getResults(year));
  const [search, setSearch] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [savedIdx, setSavedIdx] = useState(null);

  // Re-initialize rows when the year changes
  const [prevYear, setPrevYear] = useState(year);
  if (year !== prevYear) {
    setPrevYear(year);
    setRows(getResults(year));
    setSearch('');
    setEditingIdx(null);
    setEditDraft({});
    setSavedIdx(null);
  }

  const filtered = search.trim()
    ? rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const startEdit = (row) => {
    const idx = rows.indexOf(row);
    setEditingIdx(idx);
    setEditDraft({ finish: row.finish, name: row.name, earnings: row.earnings });
  };

  const cancelEdit = () => { setEditingIdx(null); setEditDraft({}); };

  const saveEdit = () => {
    const updated = rows.map((r, i) =>
      i === editingIdx
        ? {
            finish: parseInt(editDraft.finish) || r.finish,
            name: editDraft.name,
            earnings: parseInt(editDraft.earnings) || r.earnings,
          }
        : r
    );
    updated.sort((a, b) => a.finish - b.finish);
    setRows(updated);
    setSavedIdx(editingIdx);
    setEditingIdx(null);
    setEditDraft({});
    setTimeout(() => setSavedIdx(null), 2000);
  };

  return (
    <div style={{
      background: '#fff', border: '1px solid #e0dbd2',
      borderRadius: 10, overflow: 'hidden', fontFamily: sans,
    }}>
      {/* Green header */}
      <div style={{
        background: '#006B54', padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: bask, fontStyle: 'italic', fontSize: 22,
            fontWeight: 700, color: '#fff',
          }}>{year} Masters Pool</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
            🏆 {meta.winner}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Entries', val: meta.entries },
            { label: 'Purse', val: fmt$(meta.purse) },
            { label: '1st', val: fmt$(meta.first), gold: true },
          ].map(({ label, val, gold }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.1)', borderRadius: 6,
              padding: '6px 12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: gold ? '#d4af37' : '#fff' }}>{val}</div>
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.6)',
                textTransform: 'uppercase', letterSpacing: 1, marginTop: 1,
              }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout row */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e0dbd2', background: '#faf8f4' }}>
        {[
          { place: '1st Place', pct: '60%', amt: fmt$(meta.first),  color: '#d4af37' },
          { place: '2nd Place', pct: '30%', amt: fmt$(meta.second), color: '#8b7d6b' },
          { place: '3rd Place', pct: '10%', amt: fmt$(meta.third),  color: '#9a7c2f' },
        ].map(({ place, pct, amt, color }, i) => (
          <div key={place} style={{
            flex: 1, padding: '10px 14px', textAlign: 'center',
            borderRight: i < 2 ? '1px solid #e0dbd2' : 'none',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
              textTransform: 'uppercase', color: '#8b7d6b',
            }}>{place}</div>
            <div style={{
              fontSize: 16, fontWeight: 700, color,
              fontFamily: bask, marginTop: 2,
            }}>{amt}</div>
            <div style={{ fontSize: 11, color: '#b5a999', marginTop: 1 }}>{pct} of purse</div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid #e0dbd2',
        background: '#f7f4ef',
      }}>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', fontSize: 13,
            color: '#b5a999', pointerEvents: 'none',
          }}>🔍</span>
          <input
            type="text"
            placeholder="Search patron name..."
            value={search}
            onChange={e => { setSearch(e.target.value); cancelEdit(); }}
            style={{
              width: '100%', padding: '8px 32px 8px 32px',
              border: '1px solid #e0dbd2', borderRadius: 6,
              fontSize: 13, color: '#1a2e1a', fontFamily: sans,
              background: '#fff', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              type="button"
              style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', fontSize: 13,
                color: '#b5a999', padding: 0, lineHeight: 1,
              }}
            >✕</button>
          )}
        </div>
        {search && (
          <div style={{ fontSize: 11, color: '#8b7d6b', marginTop: 6 }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
          </div>
        )}
      </div>

      {/* Column headers — sticky within scroll */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '7px 16px',
        background: '#f7f4ef', borderBottom: '1px solid #e0dbd2',
        position: 'sticky', top: 0, zIndex: 1,
      }}>
        <div style={{ width: 38 }} />
        <span style={{
          flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
          textTransform: 'uppercase', color: '#8b7d6b',
        }}>Patron</span>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
          textTransform: 'uppercase', color: '#8b7d6b',
          minWidth: 120, textAlign: 'right',
        }}>Tournament Earnings</span>
        <div style={{ width: 56 }} />
      </div>

      {/* Scrollable list */}
      <div style={{ maxHeight: 440, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: '#b5a999', fontSize: 13 }}>
            No results found for &ldquo;{search}&rdquo;
          </div>
        ) : filtered.map((row) => {
          const globalIdx = rows.indexOf(row);
          const isEditing = editingIdx === globalIdx;
          const isSaved = savedIdx === globalIdx;

          return (
            <div key={globalIdx} style={{
              display: 'flex', alignItems: 'center',
              padding: isEditing ? '7px 16px' : '10px 16px',
              borderBottom: '1px solid #f0ede5',
              background: isEditing
                ? '#fffef0'
                : isSaved ? '#f0faf5'
                : row.finish <= 3 ? '#fdfcf6'
                : '#fff',
              borderLeft: row.finish === 1
                ? '3px solid #d4af37'
                : row.finish <= 3 ? '3px solid #e0dbd2'
                : '3px solid transparent',
              transition: 'background 0.4s',
            }}>
              {/* Finish badge / input */}
              <div style={{ width: 38, display: 'flex', alignItems: 'center' }}>
                {isEditing ? (
                  <input
                    type="number"
                    value={editDraft.finish}
                    onChange={e => setEditDraft(d => ({ ...d, finish: e.target.value }))}
                    style={{
                      width: 34, padding: '3px 2px', textAlign: 'center',
                      border: '1px solid #d4af37', borderRadius: 4,
                      fontSize: 12, fontWeight: 700, fontFamily: bask,
                    }}
                  />
                ) : (
                  <FinishBadge n={row.finish} />
                )}
              </div>

              {/* Name */}
              {isEditing ? (
                <input
                  type="text"
                  value={editDraft.name}
                  onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                  style={{
                    flex: 1, padding: '5px 8px', marginRight: 8,
                    border: '1px solid #d4af37', borderRadius: 4,
                    fontSize: 13, fontFamily: sans,
                  }}
                />
              ) : (
                <span style={{
                  flex: 1, fontSize: 14,
                  fontWeight: row.finish <= 3 ? 600 : 400,
                  color: isSaved ? '#006B54' : '#1a2e1a',
                }}>
                  {row.name}
                  {isSaved && (
                    <span style={{ fontSize: 11, color: '#006B54', marginLeft: 6, fontWeight: 400 }}>
                      ✓ saved
                    </span>
                  )}
                </span>
              )}

              {/* Earnings */}
              {isEditing ? (
                <input
                  type="number"
                  value={editDraft.earnings}
                  onChange={e => setEditDraft(d => ({ ...d, earnings: e.target.value }))}
                  style={{
                    width: 110, padding: '5px 8px', textAlign: 'right',
                    border: '1px solid #d4af37', borderRadius: 4,
                    fontSize: 13, fontFamily: sans,
                  }}
                />
              ) : (
                <span style={{
                  fontSize: 13, fontWeight: 600, fontFamily: bask,
                  color: '#006B54', minWidth: 120, textAlign: 'right',
                }}>
                  {fmtE(row.earnings)}
                </span>
              )}

              {/* Action buttons */}
              <div style={{ width: 56, display: 'flex', justifyContent: 'flex-end', gap: 4, marginLeft: 8 }}>
                {isEditing ? (
                  <>
                    <button onClick={saveEdit} title="Save" type="button" style={{
                      padding: '4px 8px', borderRadius: 4, border: 'none',
                      background: '#006B54', color: '#fff',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>✓</button>
                    <button onClick={cancelEdit} title="Cancel" type="button" style={{
                      padding: '4px 7px', borderRadius: 4,
                      border: '1px solid #e0dbd2', background: '#fff',
                      color: '#8b7d6b', fontSize: 12, cursor: 'pointer',
                    }}>✕</button>
                  </>
                ) : (
                  <button onClick={() => startEdit(row)} type="button" style={{
                    padding: '4px 10px', borderRadius: 4,
                    border: '1px solid #e0dbd2', background: '#f7f4ef',
                    color: '#8b7d6b', fontSize: 11, fontWeight: 600,
                    fontFamily: sans, cursor: 'pointer',
                  }}>Edit</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HistoricalView() {
  const [activeYear, setActiveYear] = useState('2025');
  const [downloadOpen, setDownloadOpen] = useState(false);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{
        marginBottom: 20, display: 'flex',
        alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      }}>
        <div>
          <div style={{
            fontFamily: bask, fontStyle: 'italic', fontSize: 22,
            color: '#1a2e1a', marginBottom: 4,
          }}>Pool History</div>
          <div style={{ fontSize: 13, color: '#8b7d6b' }}>
            Year-by-year results, payouts, and tournament earnings. No 2022 — Alex was in Brazil.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDownloadOpen(true)}
          style={{
            flexShrink: 0, padding: '7px 14px',
            borderRadius: 6, border: '1px solid #e0dbd2',
            background: '#fff', color: '#006B54',
            fontSize: 11, fontWeight: 600, fontFamily: sans,
            cursor: 'pointer', whiteSpace: 'nowrap',
            letterSpacing: 0.3,
          }}
        >
          ↓ Download CSV
        </button>
      </div>

      <DownloadModal open={downloadOpen} onClose={() => setDownloadOpen(false)} />

      {/* Year selector tiles */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 8, marginBottom: 20,
      }}>
        {YEARS.map(y => {
          const m = YEAR_META[y];
          const isActive = y === activeYear;
          return (
            <div
              key={y}
              onClick={() => setActiveYear(y)}
              style={{
                background: isActive ? '#006B54' : '#fff',
                border: `1px solid ${isActive ? '#006B54' : '#e0dbd2'}`,
                borderRadius: 8, padding: '10px 8px', textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: isActive ? 'rgba(255,255,255,0.7)' : '#8b7d6b',
                marginBottom: 4,
              }}>{y}</div>
              <div style={{
                fontSize: 18, fontWeight: 700, fontFamily: bask,
                color: isActive ? '#fff' : '#1a2e1a',
              }}>{m.entries}</div>
              <div style={{
                fontSize: 10,
                color: isActive ? 'rgba(255,255,255,0.6)' : '#b5a999',
                marginTop: 2,
              }}>entries</div>
              <div style={{
                fontSize: 12, fontWeight: 600,
                color: isActive ? '#d4af37' : '#006B54',
                marginTop: 4,
              }}>{fmt$(m.purse)}</div>
            </div>
          );
        })}
        {/* 2022 no-pool tile */}
        <div style={{
          background: 'transparent', border: '1px dashed #e0dbd2',
          borderRadius: 8, padding: '10px 8px', textAlign: 'center',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
            textTransform: 'uppercase', color: '#d9d3c7', marginBottom: 4,
          }}>2022</div>
          <div style={{ fontSize: 11, color: '#d9d3c7', marginTop: 10, lineHeight: 1.3 }}>
            No pool
          </div>
          <div style={{ fontSize: 10, color: '#d9d3c7', marginTop: 3 }}>
            Alex in Brazil
          </div>
        </div>
      </div>

      <YearCard key={activeYear} year={activeYear} />
    </div>
  );
}
