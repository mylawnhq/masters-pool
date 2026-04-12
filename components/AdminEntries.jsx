'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ENTRY_CONFIG } from '@/data/entryConfig';

const G   = '#006B54';
const GLD = '#d4af37';
const DK  = '#1a2e1a';
const CR  = '#f7f4ef';
const WH  = '#ffffff';
const BD  = '#e0dbd2';
const MT  = '#8b7d6b';
const LM  = '#b5a999';
const RD  = '#c0392b';
const AM  = '#d4830a';
const GN  = '#27ae60';

const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";

const STATUS = {
  confirmed:       { label: 'Confirmed', bg: '#e8f8f0', color: GN, border: 'rgba(39,174,96,0.3)' },
  pending_payment: { label: 'Pending',   bg: '#fffbea', color: AM, border: 'rgba(212,131,10,0.3)' },
  removed:         { label: 'Removed',   bg: '#fde8e8', color: RD, border: 'rgba(192,57,43,0.3)' },
};

function Badge({ status }) {
  const s = STATUS[status] || STATUS.pending_payment;
  return (
    <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function Tile({ label, value, sub, color }) {
  return (
    <div style={{ background: WH, border: `1px solid ${BD}`, borderRadius: 10, padding: '12px 14px', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MT, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: bask, fontWeight: 700, fontSize: 24, color: color || DK }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: LM, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const COL = '28px 1fr 1.6fr 1.2fr 1.1fr 1fr 0.7fr 0.6fr 1.3fr';

export default function AdminEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [noteId, setNoteId] = useState(null);
  const [noteVal, setNoteVal] = useState('');
  const [deadlineOverride, setDeadlineOverride] = useState('');
  const [copied, setCopied] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const fileRef = useRef(null);

  // ── Fetch entries ─────────────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('entries')
      .select('id, name, email, phone, venmo, group1, group2a, group2b, group3a, group3b, group4, low_amateur, winning_score, status, submitted_at, confirmed_at, payment_note')
      .order('submitted_at', { ascending: false });
    setEntries((data || []).map(e => ({
      ...e,
      note: e.payment_note || '',
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // ── Actions ───────────────────────────────────────────────────────────

  const setStatus = async (id, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'confirmed') updates.confirmed_at = new Date().toISOString();
    await supabase.from('entries').update(updates).eq('id', id);
    setEntries(es => es.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const saveNote = async (id) => {
    await supabase.from('entries').update({ payment_note: noteVal }).eq('id', id);
    setEntries(es => es.map(e => e.id === id ? { ...e, note: noteVal, payment_note: noteVal } : e));
    setNoteId(null);
  };

  const toggleSel = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  // ── Derived ───────────────────────────────────────────────────────────

  const confirmed = entries.filter(e => e.status === 'confirmed').length;
  const pending = entries.filter(e => e.status === 'pending_payment').length;
  const removed = entries.filter(e => e.status === 'removed').length;
  // Detect duplicates: entries sharing the same name (case-insensitive)
  const nameCounts = {};
  entries.forEach(e => { const k = e.name?.toLowerCase(); nameCounts[k] = (nameCounts[k] || 0) + 1; });
  const isDup = (e) => (nameCounts[e.name?.toLowerCase()] || 0) > 1;
  const dups = entries.filter(isDup).length;

  const visible = entries.filter(e => {
    if (filter === 'confirmed' && e.status !== 'confirmed') return false;
    if (filter === 'pending' && e.status !== 'pending_payment') return false;
    if (filter === 'removed' && e.status !== 'removed') return false;
    if (filter === 'duplicates' && !isDup(e)) return false;
    const q = search.toLowerCase();
    if (q && !e.name?.toLowerCase().includes(q) && !e.email?.toLowerCase().includes(q) && !e.venmo?.toLowerCase().includes(q)) return false;
    return true;
  });

  const toggleAll = () => setSelected(s => s.length === visible.length ? [] : visible.map(e => e.id));

  // ── Deadline logic ────────────────────────────────────────────────────

  const effectiveDeadline = deadlineOverride || ENTRY_CONFIG.deadline;
  const isOpen = new Date() < new Date(effectiveDeadline);

  // ── Copy to clipboard ─────────────────────────────────────────────────

  const copyLink = (url, key) => {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // ── CSV Export ─────────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Venmo', 'Group 1', 'Group 2A', 'Group 2B', 'Group 3A', 'Group 3B', 'Group 4', 'Low Amateur', 'Winning Score', 'Status', 'Submitted', 'Note'];
    const rows = visible.map(e => [
      e.name, e.email, e.phone, e.venmo,
      e.group1, e.group2a, e.group2b, e.group3a, e.group3b, e.group4,
      e.low_amateur, e.winning_score, e.status,
      e.submitted_at ? new Date(e.submitted_at).toLocaleString() : '',
      e.note || '',
    ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── CSV Import patrons ────────────────────────────────────────────────

  const handleImport = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setImportMsg(null);
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { setImportMsg({ ok: false, msg: 'CSV has no data rows' }); return; }
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
    const patrons = rows.filter(r => r[0] && r[1]).map(r => ({
      name: r[0], email: r[1].toLowerCase(), phone: r[2] || null, venmo: r[3] || null,
    }));
    if (!patrons.length) { setImportMsg({ ok: false, msg: 'No valid rows found' }); return; }
    const { error } = await supabase.from('patrons').upsert(patrons, { onConflict: 'email' });
    setImportMsg(error ? { ok: false, msg: `Import failed: ${error.message}` } : { ok: true, msg: `Imported ${patrons.length} patrons` });
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Render ────────────────────────────────────────────────────────────

  const cell = (extra) => ({ padding: '0 6px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: MT, ...extra });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', fontFamily: sans }}>

      {/* ── Entry Form Settings card ─────────────────────────────────── */}
      <div style={{ background: WH, border: `1px solid ${BD}`, borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: G, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${BD}` }}>Entry Form Settings</div>

        {/* Status + Deadline row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
          {/* Status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: isOpen ? GN : RD }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: isOpen ? GN : RD }}>{isOpen ? 'Open' : 'Closed'}</span>
          </div>

          {/* Deadline display */}
          <div style={{ fontSize: 12, color: MT, flex: 1 }}>
            Deadline: <strong style={{ color: DK }}>{new Date(effectiveDeadline).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</strong>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <input type="datetime-local" value={deadlineOverride} onChange={e => setDeadlineOverride(e.target.value)}
              style={{ padding: '6px 8px', border: `1px solid ${BD}`, borderRadius: 6, fontSize: 12, fontFamily: sans, color: DK, background: WH, outline: 'none' }} />
            <button onClick={() => setDeadlineOverride(new Date(Date.now() - 60000).toISOString().slice(0, 16))}
              style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${RD}`, background: WH, color: RD, fontSize: 11, fontWeight: 700, fontFamily: sans, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Close Now
            </button>
            <button onClick={() => setDeadlineOverride('')}
              style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${G}`, background: WH, color: G, fontSize: 11, fontWeight: 700, fontFamily: sans, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Open Form
            </button>
          </div>
        </div>

        {/* Links row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* Patron entry link */}
          <div style={{ flex: 1, minWidth: 240, background: CR, border: `1px solid ${BD}`, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MT, marginBottom: 4 }}>Patron entry link</div>
            <div style={{ fontSize: 11, color: LM, marginBottom: 6 }}>Share in Alex's email blast</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <code style={{ flex: 1, fontSize: 12, color: G, background: WH, padding: '5px 8px', borderRadius: 4, border: `1px solid ${BD}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{siteOrigin}/enter</code>
              <button onClick={() => copyLink(`${siteOrigin}/enter`, 'enter')}
                style={{ padding: '5px 10px', borderRadius: 5, border: `1px solid ${BD}`, background: WH, color: copied === 'enter' ? GN : DK, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {copied === 'enter' ? '\u2713 Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Preview link */}
          <div style={{ flex: 1, minWidth: 240, background: CR, border: `1px solid ${BD}`, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MT, marginBottom: 4 }}>Entry flow preview</div>
            <div style={{ fontSize: 11, color: LM, marginBottom: 6 }}>Share with Alex for review</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <code style={{ flex: 1, fontSize: 12, color: G, background: WH, padding: '5px 8px', borderRadius: 4, border: `1px solid ${BD}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{siteOrigin}/enter-preview</code>
              <button onClick={() => copyLink(`${siteOrigin}/enter-preview`, 'preview')}
                style={{ padding: '5px 10px', borderRadius: 5, border: `1px solid ${BD}`, background: WH, color: copied === 'preview' ? GN : DK, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {copied === 'preview' ? '\u2713 Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Page title + actions ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: bask, fontStyle: 'italic', fontSize: 22, color: DK, marginBottom: 4 }}>Entrant Dashboard</div>
          <div style={{ fontSize: 13, color: MT }}>Manage entries · Confirm payments · Activate picks on the live site</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ padding: '9px 14px', background: WH, border: `1px solid ${BD}`, borderRadius: 7, fontSize: 12, fontWeight: 600, color: DK, fontFamily: sans, cursor: 'pointer' }}>
            ↑ Import CSV
            <input type="file" accept=".csv" ref={fileRef} onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <button onClick={exportCSV} style={{ padding: '9px 14px', background: WH, border: `1px solid ${BD}`, borderRadius: 7, fontSize: 12, fontWeight: 600, color: DK, fontFamily: sans, cursor: 'pointer' }}>↓ Export CSV</button>
          <button onClick={fetchEntries} style={{ padding: '9px 14px', background: WH, border: `1px solid ${BD}`, borderRadius: 7, fontSize: 12, fontWeight: 600, color: G, fontFamily: sans, cursor: 'pointer' }}>↻ Refresh</button>
        </div>
      </div>

      {importMsg && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, fontSize: 12, background: importMsg.ok ? '#f0faf5' : '#fdecea', color: importMsg.ok ? G : RD, border: `1px solid ${importMsg.ok ? 'rgba(0,107,84,0.25)' : RD}` }}>
          {importMsg.msg}
        </div>
      )}

      {/* ── Stat tiles ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        <Tile label="Total Submitted" value={entries.length} sub="all entries" />
        <Tile label="Confirmed Active" value={confirmed} sub="live on leaderboard" color={G} />
        <Tile label="Pending Payment" value={pending} sub="awaiting confirmation" color={AM} />
        <Tile label="Duplicates" value={dups} sub="need review" color={dups > 0 ? RD : MT} />
        <Tile label="Pool Money In" value={'$' + (confirmed * ENTRY_CONFIG.entryFee).toLocaleString()} sub={`${confirmed} \u00d7 $${ENTRY_CONFIG.entryFee} entry fee`} color={G} />
        <Tile label="Removed / Invalid" value={removed} sub="not on leaderboard" color={MT} />
        <Tile label="Deadline" value={new Date(effectiveDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} sub={isOpen ? 'Entry is open' : 'Entry is closed'} color={isOpen ? GN : RD} />
        <Tile label="Entry Fee" value={`$${ENTRY_CONFIG.entryFee}`} sub={`Pool purse: $${ENTRY_CONFIG.poolPurse.toLocaleString()}`} color={GLD} />
      </div>

      {/* Picks visibility notice */}
      <div style={{ background: '#f0faf5', border: '1px solid rgba(0,107,84,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: DK }}>
        <strong style={{ color: G }}>{'\u26A1'} Picks visibility:</strong> Only <strong>Confirmed</strong> entries appear on the public leaderboard. Pending = invisible to patrons.
      </div>

      {/* ── Filter tabs ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BD}`, marginBottom: 12 }}>
        {[
          { id: 'all', label: `All (${entries.length})` },
          { id: 'confirmed', label: `Confirmed (${confirmed})` },
          { id: 'pending', label: `Pending (${pending})` },
          { id: 'duplicates', label: `Duplicates (${dups})`, warn: dups > 0 },
          { id: 'removed', label: `Removed (${removed})` },
        ].map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{
            padding: '8px 14px', background: 'none', border: 'none',
            borderBottom: filter === t.id ? `2px solid ${G}` : '2px solid transparent',
            color: filter === t.id ? G : t.warn ? RD : MT,
            fontSize: 12, fontWeight: filter === t.id ? 700 : 500,
            fontFamily: sans, cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: LM, pointerEvents: 'none' }}>{'\uD83D\uDD0D'}</span>
        <input placeholder="Search name, email, or Venmo..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '9px 12px 9px 32px', border: `1px solid ${BD}`, borderRadius: 7, fontSize: 13, fontFamily: sans, background: WH, outline: 'none', boxSizing: 'border-box' }} />
        {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: LM }}>{'\u2715'}</button>}
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div style={{ background: DK, borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{selected.length} selected</span>
          <button onClick={() => { selected.forEach(id => setStatus(id, 'confirmed')); setSelected([]); }} style={{ padding: '6px 14px', background: G, border: 'none', borderRadius: 6, color: WH, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{'\u2713'} Confirm All</button>
          <button onClick={() => { selected.forEach(id => setStatus(id, 'removed')); setSelected([]); }} style={{ padding: '6px 14px', background: RD, border: 'none', borderRadius: 6, color: WH, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Remove All</button>
          <button onClick={() => setSelected([])} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: WH, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: MT, fontStyle: 'italic' }}>Loading entries…</div>
      ) : (
        <div style={{ background: WH, border: `1px solid ${BD}`, borderRadius: 10, overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '8px 12px', background: '#f0ede5', borderBottom: `1px solid ${BD}`, alignItems: 'center' }}>
            <input type="checkbox" checked={selected.length === visible.length && visible.length > 0} onChange={toggleAll} style={{ cursor: 'pointer' }} />
            {['Status', 'Name', 'Email', 'Venmo', 'Phone', 'Submitted', 'Picks', 'Actions'].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT, textAlign: 'center', padding: '0 6px' }}>{h}</div>
            ))}
          </div>

          {/* Data rows */}
          {visible.map((e, i) => {
            const dup = isDup(e);
            return (
              <div key={e.id}>
                <div style={{
                  display: 'grid', gridTemplateColumns: COL, padding: '9px 12px', alignItems: 'center',
                  background: dup ? '#fffbf0' : i % 2 === 0 ? WH : '#faf8f4',
                  borderBottom: `1px solid ${BD}`,
                  borderLeft: dup ? `3px solid ${AM}` : '3px solid transparent',
                }}>
                  <input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggleSel(e.id)} style={{ cursor: 'pointer' }} />
                  <div style={{ textAlign: 'center', padding: '0 4px' }}><Badge status={e.status} /></div>
                  <div style={{ ...cell({ color: DK, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }) }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                    {dup && <span style={{ fontSize: 9, fontWeight: 700, color: AM, background: '#fff3cd', padding: '1px 4px', borderRadius: 3, flexShrink: 0 }}>DUP</span>}
                  </div>
                  <div style={cell()}>{e.email}</div>
                  <div style={cell({ color: G, fontWeight: 600 })}>{e.venmo}</div>
                  <div style={cell()}>{e.phone}</div>
                  <div style={cell({ color: LM, fontSize: 11 })}>{e.submitted_at ? new Date(e.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '\u2014'}</div>
                  <div style={{ textAlign: 'center', padding: '0 4px' }}>
                    <button onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                      style={{ padding: '3px 10px', background: expanded === e.id ? G : '#f0ede5', border: `1px solid ${expanded === e.id ? G : BD}`, borderRadius: 5, fontSize: 10, fontWeight: 700, color: expanded === e.id ? WH : MT, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {expanded === e.id ? '\u25B2 Hide' : '\u25BC View'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0 4px' }}>
                    {noteId === e.id ? (
                      <>
                        <input value={noteVal} onChange={ev => setNoteVal(ev.target.value)} autoFocus
                          style={{ width: 70, padding: '2px 5px', border: `1px solid ${G}`, borderRadius: 4, fontSize: 10, fontFamily: sans, outline: 'none' }} />
                        <button onClick={() => saveNote(e.id)} style={{ padding: '2px 6px', background: G, border: 'none', borderRadius: 4, color: WH, fontSize: 10, cursor: 'pointer' }}>{'\u2713'}</button>
                        <button onClick={() => setNoteId(null)} style={{ padding: '2px 6px', background: '#eee', border: 'none', borderRadius: 4, color: MT, fontSize: 10, cursor: 'pointer' }}>{'\u2715'}</button>
                      </>
                    ) : (
                      <>
                        {e.status === 'pending_payment' && (
                          <button onClick={() => setStatus(e.id, 'confirmed')} style={{ padding: '3px 8px', background: '#e8f8f0', border: '1px solid rgba(39,174,96,0.4)', borderRadius: 4, color: GN, fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{'\u2713'} Confirm</button>
                        )}
                        {e.status === 'confirmed' && (
                          <button onClick={() => setStatus(e.id, 'pending_payment')} style={{ padding: '3px 8px', background: '#f5f5f5', border: `1px solid ${BD}`, borderRadius: 4, color: MT, fontSize: 10, cursor: 'pointer' }}>Undo</button>
                        )}
                        {e.status !== 'removed' && (
                          <button onClick={() => setStatus(e.id, 'removed')} style={{ padding: '3px 8px', background: '#fde8e8', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 4, color: RD, fontSize: 10, cursor: 'pointer' }}>{'\u2715'}</button>
                        )}
                        <button onClick={() => { setNoteId(e.id); setNoteVal(e.note || ''); }} style={{ padding: '3px 6px', background: '#f5f5f5', border: `1px solid ${BD}`, borderRadius: 4, color: MT, fontSize: 10, cursor: 'pointer' }}>{'\uD83D\uDCDD'}</button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded patron card */}
                {expanded === e.id && (
                  <div style={{ background: '#faf8f4', borderBottom: `1px solid ${BD}`, padding: '16px 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                      {/* CRM Info */}
                      <div style={{ background: WH, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: G, marginBottom: 10 }}>Patron Info</div>
                        {[['Full Name', e.name], ['Email', e.email], ['Phone', e.phone], ['Venmo', e.venmo], ['Submitted', e.submitted_at ? new Date(e.submitted_at).toLocaleString() : '\u2014'], ['Status', STATUS[e.status]?.label]].map(([lbl, val]) => (
                          <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${BD}`, fontSize: 12 }}>
                            <span style={{ color: MT }}>{lbl}</span>
                            <span style={{ fontWeight: 600, color: DK }}>{val}</span>
                          </div>
                        ))}
                        {e.note && <div style={{ marginTop: 8, fontSize: 11, color: MT, fontStyle: 'italic' }}>{'\uD83D\uDCDD'} {e.note}</div>}
                      </div>

                      {/* Picks */}
                      <div style={{ background: WH, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: G, marginBottom: 10 }}>Picks</div>
                        {[['Group 1', e.group1], ['Group 2A', e.group2a], ['Group 2B', e.group2b], ['Group 3A', e.group3a], ['Group 3B', e.group3b], ['Group 4', e.group4]].map(([grp, player]) => (
                          <div key={grp} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${BD}`, fontSize: 12 }}>
                            <span style={{ color: MT }}>{grp}</span>
                            <span style={{ fontWeight: 600, color: DK }}>{player}</span>
                          </div>
                        ))}
                      </div>

                      {/* Tiebreakers + Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ background: WH, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: G, marginBottom: 10 }}>Tiebreakers</div>
                          {[['Low Amateur', e.low_amateur], ['Winning Score', e.winning_score]].map(([lbl, val]) => (
                            <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${BD}`, fontSize: 12 }}>
                              <span style={{ color: MT }}>{lbl}</span>
                              <span style={{ fontWeight: 600, color: DK }}>{val || '\u2014'}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ background: WH, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: G, marginBottom: 10 }}>Actions</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {e.status === 'pending_payment' && (
                              <button onClick={() => setStatus(e.id, 'confirmed')} style={{ padding: '8px', background: '#e8f8f0', border: '1px solid rgba(39,174,96,0.4)', borderRadius: 6, color: GN, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{'\u2713'} Confirm Payment</button>
                            )}
                            {e.status === 'confirmed' && (
                              <button onClick={() => setStatus(e.id, 'pending_payment')} style={{ padding: '8px', background: '#f5f5f5', border: `1px solid ${BD}`, borderRadius: 6, color: MT, fontSize: 12, cursor: 'pointer' }}>Undo Confirmation</button>
                            )}
                            {e.status !== 'removed' && (
                              <button onClick={() => setStatus(e.id, 'removed')} style={{ padding: '8px', background: '#fde8e8', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 6, color: RD, fontSize: 12, cursor: 'pointer' }}>Remove Entry</button>
                            )}
                            <button onClick={() => { setNoteId(e.id); setNoteVal(e.note || ''); setExpanded(null); }} style={{ padding: '8px', background: '#f5f5f5', border: `1px solid ${BD}`, borderRadius: 6, color: MT, fontSize: 12, cursor: 'pointer' }}>{'\uD83D\uDCDD'} Edit Note</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {visible.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: LM, fontSize: 13 }}>No entries match your search or filter.</div>
          )}
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 12, color: LM, textAlign: 'center' }}>
        Showing {visible.length} of {entries.length} entries · {confirmed} confirmed and live on the leaderboard
      </div>
    </div>
  );
}
