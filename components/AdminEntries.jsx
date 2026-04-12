'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const G   = '#006B54';
const GLD = '#d4af37';
const DK  = '#1a2e1a';
const MT  = '#8b7d6b';
const LM  = '#b5a999';
const BD  = '#e0dbd2';
const RD  = '#c0392b';
const WH  = '#ffffff';

const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";

function StatusBadge({ status }) {
  const isPending = status === 'pending_payment';
  return (
    <span style={{
      display: 'inline-block', padding: '3px 8px', borderRadius: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      background: isPending ? '#fffbea' : '#f0faf5',
      color: isPending ? '#b8860b' : G,
      border: `1px solid ${isPending ? '#f0d060' : 'rgba(0,107,84,0.25)'}`,
    }}>
      {isPending ? 'Pending' : 'Confirmed'}
    </span>
  );
}

export default function AdminEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const fileRef = useRef(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('entries')
      .select('id, name, email, phone, venmo, group1, group2a, group2b, group3a, group3b, group4, low_amateur, winning_score, status, submitted_at, confirmed_at')
      .order('submitted_at', { ascending: false });
    setEntries(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const markPaid = async (id) => {
    const { error } = await supabase
      .from('entries')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) fetchEntries();
  };

  const removeEntry = async (id, name) => {
    if (!confirm(`Remove entry for "${name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (!error) fetchEntries();
  };

  const filtered = entries.filter(e => {
    if (filter === 'pending') return e.status === 'pending_payment';
    if (filter === 'confirmed') return e.status === 'confirmed';
    return true;
  });

  const confirmedCount = entries.filter(e => e.status === 'confirmed').length;
  const pendingCount = entries.filter(e => e.status === 'pending_payment').length;

  // ── CSV Import for patrons ────────────────────────────────────────────

  const handlePatronImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg(null);

    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { setImportMsg({ ok: false, msg: 'CSV has no data rows' }); return; }

    // Parse CSV (skip header)
    const rows = lines.slice(1).map(line => {
      const cols = [];
      let col = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === ',' && !inQ) { cols.push(col.trim()); col = ''; continue; }
        col += ch;
      }
      cols.push(col.trim());
      return cols;
    });

    // Expected: name, email, phone, venmo
    const patrons = rows
      .filter(r => r[0] && r[1])
      .map(r => ({
        name: r[0],
        email: r[1].toLowerCase(),
        phone: r[2] || null,
        venmo: r[3] || null,
      }));

    if (patrons.length === 0) { setImportMsg({ ok: false, msg: 'No valid rows found' }); return; }

    const { error } = await supabase.from('patrons').upsert(patrons, { onConflict: 'email' });
    if (error) {
      setImportMsg({ ok: false, msg: `Import failed: ${error.message}` });
    } else {
      setImportMsg({ ok: true, msg: `Imported ${patrons.length} patrons` });
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', fontFamily: sans }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: bask, fontStyle: 'italic', fontSize: 22, color: DK, marginBottom: 4 }}>Entry Management</div>
          <div style={{ fontSize: 13, color: MT }}>Review submissions, confirm payments, manage the field</div>
        </div>
        <button onClick={fetchEntries} style={{
          padding: '7px 14px', borderRadius: 6, border: `1px solid ${BD}`, background: WH,
          color: G, fontSize: 11, fontWeight: 600, fontFamily: sans, cursor: 'pointer',
        }}>
          {'\u21bb'} Refresh
        </button>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { lbl: 'Total Submitted', val: entries.length },
          { lbl: 'Confirmed', val: confirmedCount, color: G },
          { lbl: 'Pending Payment', val: pendingCount, color: '#b8860b' },
        ].map(({ lbl, val, color }) => (
          <div key={lbl} style={{ background: WH, border: `1px solid ${BD}`, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT, marginBottom: 4 }}>{lbl}</div>
            <div style={{ fontFamily: bask, fontWeight: 700, fontSize: 24, color: color || DK }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Filter toggles */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { id: 'all', label: `All (${entries.length})` },
          { id: 'pending', label: `Pending (${pendingCount})` },
          { id: 'confirmed', label: `Confirmed (${confirmedCount})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: sans, cursor: 'pointer',
              background: filter === f.id ? G : WH,
              color: filter === f.id ? WH : MT,
              border: `1px solid ${filter === f.id ? G : BD}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Entry rows */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: MT, fontStyle: 'italic' }}>Loading entries\u2026</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: MT }}>No entries match this filter.</div>
      ) : (
        <div>
          {filtered.map(e => {
            const isOpen = expanded === e.id;
            const picks = `${e.group1?.split(' ').pop()} \u00b7 ${e.group2a?.split(' ').pop()} \u00b7 ${e.group2b?.split(' ').pop()} \u00b7 ${e.group3a?.split(' ').pop()} \u00b7 ${e.group3b?.split(' ').pop()} \u00b7 ${e.group4?.split(' ').pop()}`;
            return (
              <div key={e.id} style={{ marginBottom: 6 }}>
                <div onClick={() => setExpanded(isOpen ? null : e.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr auto auto',
                    alignItems: 'center', gap: 10, padding: '11px 14px',
                    background: isOpen ? '#f0ede5' : WH, border: `1px solid ${BD}`,
                    borderRadius: isOpen ? '8px 8px 0 0' : 8, cursor: 'pointer',
                  }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: DK }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: LM, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{picks}</div>
                  </div>
                  <StatusBadge status={e.status} />
                  <span style={{ fontSize: 11, color: LM }}>{isOpen ? '\u25B2' : '\u25BC'}</span>
                </div>

                {isOpen && (
                  <div style={{ background: '#faf8f4', border: `1px solid ${BD}`, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '14px 16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      {[
                        ['Email', e.email], ['Phone', e.phone], ['Venmo', e.venmo],
                        ['Submitted', e.submitted_at ? new Date(e.submitted_at).toLocaleString() : '\u2014'],
                        ['Low Amateur', e.low_amateur], ['Winning Score', e.winning_score],
                      ].map(([lbl, val]) => (
                        <div key={lbl}>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT }}>{lbl}</div>
                          <div style={{ fontSize: 13, color: DK, marginTop: 2 }}>{val || '\u2014'}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT, marginBottom: 6 }}>Picks</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
                      {[['G1', e.group1], ['G2A', e.group2a], ['G2B', e.group2b], ['G3A', e.group3a], ['G3B', e.group3b], ['G4', e.group4]].map(([lbl, val]) => (
                        <div key={lbl} style={{ background: WH, border: `1px solid ${BD}`, borderRadius: 6, padding: '6px 8px' }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: G, letterSpacing: '0.08em' }}>{lbl}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: DK, marginTop: 2 }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {e.status === 'pending_payment' && (
                        <button onClick={() => markPaid(e.id)}
                          style={{ flex: 1, padding: '8px', background: G, border: 'none', borderRadius: 6, color: WH, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          {'\u2713'} Mark as Paid
                        </button>
                      )}
                      {e.status === 'confirmed' && (
                        <div style={{ flex: 1, padding: '8px', background: '#f0faf5', border: `1px solid rgba(0,107,84,0.2)`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: G, textAlign: 'center' }}>
                          {'\u2713'} Confirmed {e.confirmed_at ? new Date(e.confirmed_at).toLocaleDateString() : ''}
                        </div>
                      )}
                      <button onClick={() => removeEntry(e.id, e.name)}
                        style={{ padding: '8px 14px', background: WH, border: `1px solid ${RD}`, borderRadius: 6, color: RD, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Import Patrons section */}
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${BD}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: G, marginBottom: 10 }}>Import Patrons</div>
        <div style={{ fontSize: 13, color: MT, marginBottom: 12, lineHeight: 1.5 }}>
          Upload a CSV with columns: <strong>name, email, phone, venmo</strong>. Imported patrons are used for returning entrant lookup on the entry form. Duplicate emails are updated.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="file" accept=".csv" ref={fileRef} onChange={handlePatronImport}
            style={{ fontSize: 13, fontFamily: sans }} />
        </div>
        {importMsg && (
          <div style={{
            marginTop: 8, padding: '8px 12px', borderRadius: 6, fontSize: 12,
            background: importMsg.ok ? '#f0faf5' : '#fdecea',
            color: importMsg.ok ? G : RD,
            border: `1px solid ${importMsg.ok ? 'rgba(0,107,84,0.25)' : RD}`,
          }}>
            {importMsg.msg}
          </div>
        )}
      </div>
    </div>
  );
}
