'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Day1Recap from './Day1Recap';
import HistoricalView from './HistoricalView';

const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";

const ADMIN_KEY = 'mmp2026_admin_unlocked';
const ADMIN_PASSWORD = 'chairman2026';

export default function AdminDashboard() {
  const [hydrated, setHydrated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (typeof window !== 'undefined' && localStorage.getItem(ADMIN_KEY) === '1') {
      setUnlocked(true);
    }
  }, []);

  const submit = e => {
    e.preventDefault();
    if (value.trim().toLowerCase() === ADMIN_PASSWORD) {
      try { localStorage.setItem(ADMIN_KEY, '1'); } catch {}
      setError(false);
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  if (!hydrated) {
    return <div style={{ minHeight: '100vh', background: '#f7f4ef' }} />;
  }

  if (!unlocked) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f7f4ef',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 22 }}>
            <div style={{ height: 1, width: 60, background: 'linear-gradient(90deg, transparent, #006B54)' }} />
            <div style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid #006B54' }} />
            <div style={{ height: 1, width: 60, background: 'linear-gradient(270deg, transparent, #006B54)' }} />
          </div>
          <h1 style={{
            fontFamily: bask, fontStyle: 'italic', fontWeight: 400,
            color: '#006B54', fontSize: 32, margin: 0,
          }}>
            Chairman&rsquo;s Office
          </h1>
          <div style={{
            fontFamily: sans, fontSize: 11, letterSpacing: 3,
            textTransform: 'uppercase', color: '#7a6f5e', marginTop: 10, fontWeight: 500,
          }}>
            Restricted Access
          </div>
          <form onSubmit={submit} style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            <input
              type="password"
              value={value}
              onChange={e => { setValue(e.target.value); if (error) setError(false); }}
              placeholder="Access Code"
              autoFocus
              aria-label="Admin access code"
              style={{
                width: '100%', maxWidth: 320, padding: '14px 18px',
                fontFamily: sans, fontSize: 15, textAlign: 'center', letterSpacing: 2,
                color: '#1a2e1a', background: '#fff',
                border: '1px solid #d9d3c7', borderRadius: 2, outline: 'none',
              }}
            />
            <button type="submit" style={{
              width: '100%', maxWidth: 320, padding: '14px 18px',
              fontFamily: sans, fontSize: 12, letterSpacing: 3,
              textTransform: 'uppercase', fontWeight: 600, color: '#fff',
              background: '#006B54', border: 'none', borderRadius: 2, cursor: 'pointer',
            }}>
              Enter
            </button>
            <div style={{
              minHeight: 20, fontFamily: bask, fontStyle: 'italic', fontSize: 13,
              color: '#a64545', opacity: error ? 1 : 0, transition: 'opacity 400ms ease',
            }}>
              Invalid code
            </div>
          </form>
          <div style={{ marginTop: 32 }}>
            <a href="/" style={{
              fontFamily: sans, fontSize: 11, letterSpacing: 2,
              textTransform: 'uppercase', color: '#7a6f5e', textDecoration: 'none',
            }}>
              ← Back to Leaderboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <AdminShell />;
}

function AdminShell() {
  const [tab, setTab] = useState('analytics');

  const tabs = [
    { id: 'analytics',  label: 'Analytics' },
    { id: 'recap',      label: 'Day 1 Recap' },
    { id: 'historical', label: 'Historical' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f7f4ef', fontFamily: sans, color: '#1a2e1a' }}>
      {/* Header bar */}
      <div style={{ background: '#006B54', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>
          Mendoza&apos;s Masters Pool • Admin
        </div>
        <a href="/" style={{
          fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
          color: '#d4af37', fontWeight: 600, textDecoration: 'none',
        }}>
          ← Back to Leaderboard
        </a>
      </div>

      {/* Tab strip */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e0dbd2',
        display: 'flex',
        justifyContent: 'center',
        gap: 0,
      }}>
        <div style={{
          display: 'flex',
          gap: 4,
          maxWidth: 1000,
          width: '100%',
          padding: '0 16px',
        }}>
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '14px 22px',
                  cursor: 'pointer',
                  fontFamily: sans,
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: active ? '#006B54' : '#8b7d6b',
                  borderBottom: active ? '2px solid #006B54' : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'color 150ms ease',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab body */}
      {tab === 'analytics' && <AnalyticsView />}
      {tab === 'recap' && <Day1Recap />}
      {tab === 'historical' && <HistoricalView />}
    </div>
  );
}

function AnalyticsView() {
  const [rows, setRows] = useState(null);
  const [totalShareCount, setTotalShareCount] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Pull the most recent 50k rows for the detail breakdowns (devices,
      // hourly traffic, top searches, etc). This window can drop older
      // share rows as pageviews accumulate, so the total share count is
      // fetched separately below with a server-side exact count that
      // ignores the row-fetch limit entirely.
      const [rowsResult, sharesResult] = await Promise.all([
        supabase
          .from('page_views')
          .select('visitor_id, timestamp, device, search_query, event_type')
          .order('timestamp', { ascending: false })
          .limit(50000),
        supabase
          .from('page_views')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'share'),
      ]);
      if (cancelled) return;
      if (rowsResult.error) {
        setErr(rowsResult.error.message);
      } else {
        setRows(rowsResult.data || []);
      }
      if (!sharesResult.error && typeof sharesResult.count === 'number') {
        setTotalShareCount(sharesResult.count);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    if (!rows) return null;
    const pageviews = rows.filter(r => r.event_type === 'pageview');
    // Shares inside the 50k row window are only used as a fallback if the
    // server-side exact count hasn't loaded yet.
    const sharesInWindow = rows.filter(r => r.event_type === 'share');
    const searches = rows.filter(r => r.event_type === 'search' && r.search_query);

    const totalVisits = pageviews.length;
    const uniqueVisitors = new Set(pageviews.map(r => r.visitor_id)).size;

    // "Today" is local-day based.
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todayPV = pageviews.filter(r => new Date(r.timestamp).getTime() >= startOfDay);
    const todayVisits = todayPV.length;
    const todayUnique = new Set(todayPV.map(r => r.visitor_id)).size;

    // Hourly traffic — 24 buckets for today.
    const hourly = Array.from({ length: 24 }, () => 0);
    todayPV.forEach(r => {
      const h = new Date(r.timestamp).getHours();
      hourly[h] += 1;
    });

    // Device breakdown (from all pageviews).
    const deviceCounts = {};
    pageviews.forEach(r => {
      const d = r.device || 'Unknown';
      deviceCounts[d] = (deviceCounts[d] || 0) + 1;
    });
    const deviceTotal = Object.values(deviceCounts).reduce((a, b) => a + b, 0) || 1;
    const devices = Object.entries(deviceCounts)
      .map(([name, count]) => ({ name, count, pct: (count / deviceTotal) * 100 }))
      .sort((a, b) => b.count - a.count);

    // Top search queries.
    const queryCounts = {};
    searches.forEach(r => {
      const q = r.search_query.trim().toLowerCase();
      if (!q) return;
      queryCounts[q] = (queryCounts[q] || 0) + 1;
    });
    const topQueries = Object.entries(queryCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalVisits,
      uniqueVisitors,
      todayVisits,
      todayUnique,
      hourly,
      devices,
      topQueries,
      // Prefer the server-side exact count (not bounded by the 50k row
      // fetch). Fall back to the in-window count if that query hasn't
      // resolved yet.
      totalShares: totalShareCount != null ? totalShareCount : sharesInWindow.length,
    };
  }, [rows, totalShareCount]);

  return (
    <div>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 16px 48px' }}>
        {/* Title */}
        <header style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{ height: 1, width: 50, background: 'linear-gradient(90deg, transparent, #006B54)' }} />
            <div style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid #006B54' }} />
            <div style={{ height: 1, width: 50, background: 'linear-gradient(270deg, transparent, #006B54)' }} />
          </div>
          <h1 style={{
            fontFamily: bask, fontSize: 'clamp(26px,5vw,40px)',
            fontWeight: 400, fontStyle: 'italic', color: '#006B54',
            margin: '0 0 4px', lineHeight: 1.15,
          }}>
            Analytics
          </h1>
          <div style={{ fontFamily: bask, fontSize: 13, fontStyle: 'italic', color: '#8b7d6b' }}>
            A view from the Chairman&rsquo;s desk
          </div>
        </header>

        {err && (
          <div style={{
            padding: 16, background: '#fdecea', border: '1px solid #f5c6c0',
            borderRadius: 8, color: '#a64545', textAlign: 'center',
          }}>
            Couldn&rsquo;t load analytics: {err}
          </div>
        )}

        {!rows && !err && (
          <div style={{ textAlign: 'center', padding: 40, color: '#8b7d6b', fontStyle: 'italic' }}>
            Loading…
          </div>
        )}

        {stats && (
          <>
            {/* Summary stat cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              marginBottom: 24,
            }}>
              <StatCard label="Total Visits" value={stats.totalVisits} />
              <StatCard label="Unique Visitors" value={stats.uniqueVisitors} />
              <StatCard label="Today's Visits" value={stats.todayVisits} />
              <StatCard label="Today's Unique" value={stats.todayUnique} />
              <StatCard label="Total Shares" value={stats.totalShares} accent />
            </div>

            {/* Hourly bar chart */}
            <Panel title="Hourly Traffic — Today">
              <HourlyChart data={stats.hourly} />
            </Panel>

            {/* Device breakdown */}
            <Panel title="Device Breakdown">
              {stats.devices.length === 0 ? (
                <EmptyNote>No device data yet</EmptyNote>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stats.devices.map(d => (
                    <DeviceRow key={d.name} {...d} />
                  ))}
                </div>
              )}
            </Panel>

            {/* Top searches */}
            <Panel title="Top 10 Searches">
              {stats.topQueries.length === 0 ? (
                <EmptyNote>No searches logged yet</EmptyNote>
              ) : (
                <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {stats.topQueries.map((q, i) => (
                    <li key={q.query} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: i < stats.topQueries.length - 1 ? '1px solid #eee9e0' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
                        <span style={{
                          fontFamily: bask, fontSize: 14, color: '#8b7d6b',
                          width: 20, flexShrink: 0,
                        }}>{i + 1}</span>
                        <span style={{
                          fontSize: 14, color: '#1a2e1a',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{q.query}</span>
                      </div>
                      <span style={{
                        fontFamily: bask, fontWeight: 700, fontSize: 16, color: '#006B54',
                        flexShrink: 0, marginLeft: 12,
                      }}>{q.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = false }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${accent ? '#d4af37' : '#e0dbd2'}`,
      borderRadius: 8,
      padding: '16px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,.04)',
    }}>
      <div style={{
        fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
        color: '#8b7d6b', fontWeight: 700, marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontFamily: bask, fontSize: 28, fontWeight: 700,
        color: accent ? '#d4af37' : '#006B54', lineHeight: 1,
      }}>{value.toLocaleString()}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section style={{
      background: '#fff', border: '1px solid #e0dbd2', borderRadius: 8,
      padding: '18px 20px 20px', marginBottom: 18,
      boxShadow: '0 1px 3px rgba(0,0,0,.04)',
    }}>
      <h2 style={{
        fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase',
        color: '#006B54', fontWeight: 700, margin: '0 0 14px',
        paddingBottom: 10, borderBottom: '1px solid #eee9e0',
      }}>{title}</h2>
      {children}
    </section>
  );
}

function EmptyNote({ children }) {
  return (
    <div style={{ color: '#a09888', fontStyle: 'italic', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
      {children}
    </div>
  );
}

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function HourlyChart({ data }) {
  const rawMax = Math.max(...data);
  const max = Math.max(1, rawMax);
  const peakIndex = rawMax > 0 ? data.indexOf(rawMax) : -1;
  const [hovered, setHovered] = useState(null);
  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)',
        gap: 3, alignItems: 'end', height: 140, marginBottom: 6,
      }}>
        {data.map((v, h) => {
          const pct = (v / max) * 100;
          const isHovered = hovered === h;
          const isPeak = h === peakIndex;
          const opacity = isPeak ? 1 : 0.4 + 0.6 * (v / max);
          return (
            <div
              key={h}
              onMouseEnter={() => setHovered(h)}
              onMouseLeave={() => setHovered(c => (c === h ? null : c))}
              style={{
                height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                position: 'relative', cursor: 'default',
              }}
            >
              {isHovered && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translate(-50%, -6px)',
                  background: '#1a2e1a',
                  color: '#fff',
                  fontSize: 11,
                  fontFamily: sans,
                  padding: '5px 9px',
                  borderRadius: 5,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 2,
                  boxShadow: '0 2px 6px rgba(0,0,0,.15)',
                }}>
                  {formatHour(h)} — {v} visit{v === 1 ? '' : 's'}
                </div>
              )}
              <div style={{
                height: `${pct}%`,
                minHeight: 3,
                background: isPeak ? '#d4af37' : '#006B54',
                opacity,
                borderRadius: '2px 2px 0 0',
                transition: 'height .3s ease, opacity .3s ease',
              }} />
            </div>
          );
        })}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 3,
        fontSize: 9, color: '#8b7d6b', textAlign: 'center',
      }}>
        {data.map((_, h) => (
          <div key={h}>{h % 3 === 0 ? h : ''}</div>
        ))}
      </div>
    </div>
  );
}

function DeviceRow({ name, count, pct }) {
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2e1a' }}>{name}</div>
        <div>
          <span style={{ fontFamily: bask, fontWeight: 700, color: '#006B54', fontSize: 15 }}>
            {count.toLocaleString()}
          </span>
          <span style={{ color: '#8b7d6b', fontSize: 12, marginLeft: 8 }}>
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
      <div style={{ height: 8, background: '#f0ede5', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #006B54, #2a9d6e)',
          transition: 'width .3s ease',
        }} />
      </div>
    </div>
  );
}
