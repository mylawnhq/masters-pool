'use client';
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ENTRY_CONFIG } from '@/data/entryConfig';

// ── Design tokens (matching leaderboard) ────────────────────────────────
const G   = '#006B54';
const GD  = '#004d3d';
const CR  = '#f7f4ef';
const GLD = '#d4af37';
const DK  = '#1a2e1a';
const MT  = '#8b7d6b';
const LM  = '#b5a999';
const BD  = '#e0dbd2';
const RD  = '#c0392b';
const WH  = '#ffffff';

const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";

const STEPS = ['Your Info', 'Make Picks', 'Tiebreakers', 'Pay & Submit'];
const PICK_COLS = ['g1', 'g2a', 'g2b', 'g3a', 'g3b', 'g4'];

const {
  groups: GROUPS,
  amateurs: AMATEURS,
  winningScoreRange,
  entryFee,
  venmoHandle,
  venmoAmount,
  poolPurse,
  deadline,
  tournament,
  course,
  dates,
  year,
} = ENTRY_CONFIG;

// Winning score options from max down to min
const WINNING_SCORES = (() => {
  const opts = [];
  for (let i = winningScoreRange.max; i >= winningScoreRange.min; i--) {
    if (i > 0) opts.push({ val: `+${i}`, label: `+${i}` });
    else if (i === 0) opts.push({ val: 'E', label: 'Even (E)' });
    else opts.push({ val: `${i}`, label: `${i}` });
  }
  return opts;
})();

// ── Shared UI components ────────────────────────────────────────────────

function StepBar({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done || active ? G : WH,
                border: `2px solid ${done || active ? G : BD}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: done || active ? WH : LM,
              }}>
                {done ? '\u2713' : i + 1}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: active ? G : done ? G : LM, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ width: 44, height: 2, background: done ? G : BD, margin: '0 4px', marginBottom: 18 }} />}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT, marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 12px', border: `1px solid ${BD}`, borderRadius: 7, fontSize: 14, color: DK, fontFamily: sans, background: WH, outline: 'none', boxSizing: 'border-box' }} />
      {hint && <div style={{ fontSize: 11, color: LM, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Sel({ label, value, onChange, options, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT, marginBottom: 6 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', border: `1px solid ${value ? G : BD}`, borderRadius: 7, fontSize: 14, color: value ? DK : LM, fontFamily: sans, background: WH, outline: 'none', boxSizing: 'border-box' }}>
        <option value="">Select a player...</option>
        {options.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      {hint && <div style={{ fontSize: 11, color: LM, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Card({ children, title }) {
  return (
    <div style={{ background: WH, border: `1px solid ${BD}`, borderRadius: 10, padding: '18px 20px', marginBottom: 14 }}>
      {title && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: G, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${BD}` }}>{title}</div>}
      {children}
    </div>
  );
}

function Btn({ children, onClick, secondary, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: '12px 24px', borderRadius: 8,
        background: disabled ? BD : secondary ? WH : G,
        border: secondary ? `1px solid ${BD}` : 'none',
        color: disabled ? LM : secondary ? DK : WH,
        fontSize: 14, fontWeight: 700, fontFamily: sans,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: secondary ? 'auto' : '100%',
      }}>
      {children}
    </button>
  );
}

// ── Step 1: Your Info ───────────────────────────────────────────────────

function Step1({ data, setData, onNext }) {
  const [email, setEmail] = useState(data.email || '');
  const [looked, setLooked] = useState(!!data.email);
  const [found, setFound] = useState(data._lookupResult ?? null);
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const q = email.toLowerCase().trim();

      // 1. Check patrons table first (seeded historical data)
      const { data: patronRows } = await supabase
        .from('patrons')
        .select('name, email, phone, venmo')
        .ilike('email', q)
        .limit(1);

      // 2. Check entries from previous/current year
      const { data: entryRows } = await supabase
        .from('entries')
        .select('name, email, phone, venmo, group1, group2a, group2b, group3a, group3b, group4')
        .ilike('email', q)
        .order('id', { ascending: false })
        .limit(1);

      // 3. Fetch pool history from historical_results
      const { data: historyRows } = await supabase
        .from('historical_results')
        .select('year, finish')
        .ilike('patron_name', patronRows?.[0]?.name || entryRows?.[0]?.name || '__none__')
        .order('year');

      const patron = patronRows?.[0];
      const entry = entryRows?.[0];
      const source = patron || entry;

      if (source) {
        const history = {};
        (historyRows || []).forEach(r => { history[r.year] = String(r.finish); });

        const lastPicks = entry ? {
          g1: entry.group1, g2a: entry.group2a, g2b: entry.group2b,
          g3a: entry.group3a, g3b: entry.group3b, g4: entry.group4,
        } : null;

        const result = {
          name: source.name,
          phone: source.phone || '',
          venmo: source.venmo || '',
          history,
          lastPicks,
        };

        setFound(result);
        setData(d => ({
          ...d,
          email: q,
          name: source.name,
          phone: source.phone || '',
          venmo: source.venmo || '',
          history,
          lastPicks,
          _lookupResult: result,
        }));
      } else {
        setFound(false);
        setData(d => ({ ...d, email: q, _lookupResult: false }));
      }
    } catch (err) {
      console.error('Lookup error:', err);
      setFound(false);
      setData(d => ({ ...d, email: email.toLowerCase().trim(), _lookupResult: false }));
    }
    setLooked(true);
    setLoading(false);
  };

  return (
    <div>
      <Card title="Let's start with your email">
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT, marginBottom: 6 }}>Email Address</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="email" value={email}
              onChange={e => { setEmail(e.target.value); setLooked(false); setFound(null); }}
              onKeyDown={e => { if (e.key === 'Enter') lookup(); }}
              placeholder="your@email.com"
              style={{ flex: 1, padding: '10px 12px', border: `1px solid ${BD}`, borderRadius: 7, fontSize: 14, color: DK, fontFamily: sans, background: WH, outline: 'none' }} />
            <button onClick={lookup} disabled={loading}
              style={{ padding: '10px 16px', background: G, border: 'none', borderRadius: 7, color: WH, fontSize: 13, fontWeight: 700, fontFamily: sans, cursor: loading ? 'wait' : 'pointer', whiteSpace: 'nowrap', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Looking up\u2026' : 'Look up \u2192'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: LM, marginTop: 4 }}>Use the same email as previous years to auto-fill your info</div>
        </div>

        {looked && found && typeof found === 'object' && (
          <div style={{ background: '#f0faf5', border: '1px solid rgba(0,107,84,0.25)', borderRadius: 8, padding: '14px 16px', marginTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G, marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{'\uD83D\uDC4B'} Welcome back!</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: DK, marginBottom: 10 }}>{found.name}</div>
            {Object.keys(found.history || {}).length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {Object.entries(found.history).map(([yr, place]) => (
                  <div key={yr} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: place !== '-' && parseInt(place) <= 25 ? 'rgba(0,107,84,0.1)' : '#f0ede8',
                    border: `1px solid ${place !== '-' && parseInt(place) <= 25 ? 'rgba(0,107,84,0.25)' : BD}`,
                    borderRadius: 6, padding: '4px 8px', minWidth: 36,
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: MT, letterSpacing: '0.08em' }}>'{String(yr).slice(2)}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: place !== '-' ? (parseInt(place) <= 10 ? G : DK) : LM }}>{place !== '-' ? place : '\u2014'}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 12, color: MT, marginBottom: found.lastPicks ? 10 : 0 }}>Your info has been pre-filled below.</div>
            {found.lastPicks && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setData(d => ({ ...d, useLast: true }))}
                  style={{ flex: 1, padding: '8px', background: G, border: 'none', borderRadius: 6, color: WH, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Start with last year's picks \u2192
                </button>
                <button onClick={() => setData(d => ({ ...d, useLast: false }))}
                  style={{ flex: 1, padding: '8px', background: WH, border: `1px solid ${BD}`, borderRadius: 6, color: DK, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Start fresh
                </button>
              </div>
            )}
          </div>
        )}

        {looked && found === false && (
          <div style={{ background: '#faf8f4', border: `1px solid ${BD}`, borderRadius: 8, padding: '12px 14px', marginTop: 4, fontSize: 13, color: MT }}>
            No previous entries found \u2014 fill in your info below. Welcome to the pool! {'\uD83C\uDF89'}
          </div>
        )}
      </Card>

      {looked && (
        <Card title="Your details">
          <Field label="Full Name" value={data.name || ''} onChange={v => setData(d => ({ ...d, name: v }))} placeholder="First and Last Name" />
          <Field label="Phone Number" value={data.phone || ''} onChange={v => setData(d => ({ ...d, phone: v }))} type="tel" placeholder="555-867-5309" hint="For payout coordination only" />
          <Field label="Venmo Username" value={data.venmo || ''} onChange={v => setData(d => ({ ...d, venmo: v }))} placeholder="@yourvenmo" hint="We use this to confirm payment and send winnings" />
        </Card>
      )}

      {looked && <Btn onClick={onNext} disabled={!data.name || !data.phone || !data.venmo}>Continue to Picks \u2192</Btn>}
    </div>
  );
}

// ── Step 2: Make Picks ──────────────────────────────────────────────────

function Step2({ data, setData, onNext, onBack }) {
  const set = (k, v) => setData(d => ({ ...d, picks: { ...(d.picks || {}), [k]: v } }));
  const p = data.picks || (data.useLast && data.lastPicks ? { ...data.lastPicks } : {});
  const done = p.g1 && p.g2a && p.g2b && p.g3a && p.g3b && p.g4;

  // Ensure picks are initialized from lastPicks if useLast
  if (data.useLast && data.lastPicks && !data.picks) {
    // Defer to avoid render loop
    setTimeout(() => setData(d => ({ ...d, picks: { ...d.lastPicks } })), 0);
  }

  const allPicked = (key) => Object.entries(p)
    .filter(([k, v]) => k !== key && v)
    .map(([, v]) => v);

  const opts = (group, key, alsoExclude = []) =>
    GROUPS[group].filter(x => !allPicked(key).includes(x) && !alsoExclude.includes(x));

  return (
    <div>
      {data.useLast && (
        <div style={{ background: '#fffbea', border: '1px solid #f0d060', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#7a5c00' }}>
          {'\uD83D\uDCCB'} Loaded last year's picks \u2014 review and adjust as needed.
        </div>
      )}

      <div style={{ background: WH, border: `1px solid ${BD}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: MT }}>{Object.values(p).filter(Boolean).length} of 6 picks made</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {PICK_COLS.map(k => (
            <div key={k} style={{ width: 10, height: 10, borderRadius: '50%', background: p[k] ? G : BD }} />
          ))}
        </div>
      </div>

      <Card title="Group 1 \u2014 Pick one">
        <Sel label="Your pick" value={p.g1 || ''} onChange={v => set('g1', v)} options={opts('g1', 'g1')} />
      </Card>

      <Card title="Group 2 \u2014 Pick two different players">
        <Sel label="First pick" value={p.g2a || ''} onChange={v => set('g2a', v)} options={opts('g2', 'g2a', [p.g2b])} />
        <Sel label="Second pick" value={p.g2b || ''} onChange={v => set('g2b', v)} options={opts('g2', 'g2b', [p.g2a])} hint="Must differ from your first pick" />
      </Card>

      <Card title="Group 3 \u2014 Pick two different players">
        <Sel label="First pick" value={p.g3a || ''} onChange={v => set('g3a', v)} options={opts('g3', 'g3a', [p.g3b])} />
        <Sel label="Second pick" value={p.g3b || ''} onChange={v => set('g3b', v)} options={opts('g3', 'g3b', [p.g3a])} hint="Must differ from your first pick" />
      </Card>

      <Card title="Group 4 \u2014 Pick one">
        <Sel label="Your pick" value={p.g4 || ''} onChange={v => set('g4', v)} options={opts('g4', 'g4')} />
      </Card>

      <div style={{ display: 'flex', gap: 10 }}>
        <Btn secondary onClick={onBack}>{'\u2190'} Back</Btn>
        <Btn onClick={onNext} disabled={!done}>Continue to Tiebreakers \u2192</Btn>
      </div>
    </div>
  );
}

// ── Step 3: Tiebreakers ─────────────────────────────────────────────────

function Step3({ data, setData, onNext, onBack }) {
  const tb = data.tiebreakers || {};
  const set = (k, v) => setData(d => ({ ...d, tiebreakers: { ...(d.tiebreakers || {}), [k]: v } }));
  const ready = tb.lowAmateur && tb.winningScore;

  return (
    <div>
      <Card title="Tiebreakers">
        <div style={{ fontSize: 13, color: MT, marginBottom: 16, lineHeight: 1.5 }}>
          Used only if two or more teams finish with identical aggregate earnings. No effect on your primary ranking.
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT, marginBottom: 6 }}>Tiebreaker 1 \u2014 Low Amateur</label>
          <select value={tb.lowAmateur || ''} onChange={e => set('lowAmateur', e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: `1px solid ${tb.lowAmateur ? G : BD}`, borderRadius: 7, fontSize: 14, color: tb.lowAmateur ? DK : LM, fontFamily: sans, background: WH, outline: 'none', boxSizing: 'border-box' }}>
            <option value="">Select the low amateur...</option>
            {AMATEURS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <div style={{ fontSize: 11, color: LM, marginTop: 4 }}>Pick the golfer you think will be the low amateur finisher</div>
        </div>

        <div style={{ marginBottom: 4 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MT, marginBottom: 6 }}>Tiebreaker 2 \u2014 Winning Score</label>
          <select value={tb.winningScore || ''} onChange={e => set('winningScore', e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: `1px solid ${tb.winningScore ? G : BD}`, borderRadius: 7, fontSize: 14, color: tb.winningScore ? DK : LM, fontFamily: sans, background: WH, outline: 'none', boxSizing: 'border-box' }}>
            <option value="">Select predicted winning score...</option>
            {WINNING_SCORES.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
          </select>
          <div style={{ fontSize: 11, color: LM, marginTop: 4 }}>Predicted winning score in relation to par</div>
        </div>
      </Card>
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn secondary onClick={onBack}>{'\u2190'} Back</Btn>
        <Btn onClick={onNext} disabled={!ready}>Review & Pay \u2192</Btn>
      </div>
    </div>
  );
}

// ── Step 4: Pay & Submit ────────────────────────────────────────────────

function Step4({ data, onBack }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const p = data.picks || {};

  const venmoNote = encodeURIComponent(`Masters Pool ${year} - ${data.name}`);
  const venmoDeepLink = `venmo://paycharge?txn=pay&recipients=${venmoHandle}&amount=${venmoAmount}&note=${venmoNote}`;
  const venmoWebUrl = `https://venmo.com/${venmoHandle}?txn=pay&amount=${venmoAmount}&note=${venmoNote}`;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const entry = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        venmo: data.venmo,
        group1: p.g1,
        group2a: p.g2a,
        group2b: p.g2b,
        group3a: p.g3a,
        group3b: p.g3b,
        group4: p.g4,
        low_amateur: data.tiebreakers?.lowAmateur,
        winning_score: data.tiebreakers?.winningScore,
        status: 'pending_payment',
        submitted_at: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase.from('entries').insert(entry);
      if (insertErr) throw insertErr;

      // Try to send confirmation email (non-blocking)
      try {
        await fetch('/api/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.name, email: data.email, picks: p, tiebreakers: data.tiebreakers }),
        });
      } catch {
        // Email is optional — silently ignore
      }

      setDone(true);
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to submit entry. Please try again.');
    }
    setSubmitting(false);
  };

  if (done) return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>{'\uD83C\uDF89'}</div>
      <div style={{ fontFamily: bask, fontStyle: 'italic', fontSize: 24, color: DK, marginBottom: 8 }}>You're in!</div>
      <div style={{ fontSize: 14, color: MT, marginBottom: 24, lineHeight: 1.6 }}>
        Picks saved. Alex will confirm your ${entryFee} Venmo payment and you'll receive a confirmation email once you're an official entrant.
      </div>
      <Card title="Your Picks">
        {[['Group 1', p.g1], ['Group 2A', p.g2a], ['Group 2B', p.g2b], ['Group 3A', p.g3a], ['Group 3B', p.g3b], ['Group 4', p.g4]].map(([lbl, val]) => (
          <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${BD}` }}>
            <span style={{ fontSize: 12, color: MT }}>{lbl}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: DK }}>{val}</span>
          </div>
        ))}
      </Card>
      <a href={venmoDeepLink}
        onClick={e => {
          // Try deep link first, fall back to web after short delay
          setTimeout(() => { window.location.href = venmoWebUrl; }, 1500);
        }}
        style={{ display: 'block', padding: '14px', borderRadius: 8, background: '#3D95CE', color: WH, fontSize: 15, fontWeight: 700, textDecoration: 'none', fontFamily: sans, marginBottom: 10 }}>
        Pay ${venmoAmount} on Venmo \u2192
      </a>
      <div style={{ fontSize: 11, color: LM }}>Venmo @{venmoHandle} \u00b7 your name is pre-filled in the memo</div>
    </div>
  );

  return (
    <div>
      <Card title="Review your picks">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[['Group 1', p.g1], ['Group 2A', p.g2a], ['Group 2B', p.g2b], ['Group 3A', p.g3a], ['Group 3B', p.g3b], ['Group 4', p.g4]].map(([lbl, val]) => (
            <div key={lbl} style={{ background: CR, border: `1px solid ${BD}`, borderTop: `3px solid ${G}`, borderRadius: 7, padding: '10px 10px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: G, marginBottom: 4 }}>{lbl}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: DK, lineHeight: 1.3 }}>
                {val?.split(' ')[0]}<br /><span style={{ fontWeight: 900 }}>{val?.split(' ').slice(1).join(' ')}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Entry details">
        {[['Name', data.name], ['Email', data.email], ['Venmo', data.venmo], ['Entry Fee', `$${entryFee}.00`], ['Low Amateur', data.tiebreakers?.lowAmateur], ['Winning Score', data.tiebreakers?.winningScore]].map(([lbl, val]) => (
          <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${BD}` }}>
            <span style={{ fontSize: 13, color: MT }}>{lbl}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: DK }}>{val}</span>
          </div>
        ))}
      </Card>

      <div style={{ background: '#f0faf5', border: '1px solid rgba(0,107,84,0.2)', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: G, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{'\uD83D\uDCB3'} Payment \u2014 ${entryFee} via Venmo</div>
        <div style={{ fontSize: 13, color: DK, lineHeight: 1.6, marginBottom: 10 }}>
          After submitting, you'll be taken to Venmo to send ${entryFee} to <strong>@{venmoHandle}</strong>. Your name will be pre-filled in the memo. Alex confirms payment within 24 hours and you'll get a confirmation email.
        </div>
        <div style={{ fontSize: 11, color: MT }}>{'\u26A0\uFE0F'} Entry is not confirmed until payment is received and approved.</div>
      </div>

      {error && (
        <div style={{ background: '#fdecea', border: `1px solid ${RD}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: RD }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <Btn secondary onClick={onBack}>{'\u2190'} Back</Btn>
        <Btn onClick={submit} disabled={submitting}>{submitting ? 'Submitting\u2026' : 'Submit Picks & Pay on Venmo \u2192'}</Btn>
      </div>
    </div>
  );
}

// ── Deadline check ──────────────────────────────────────────────────────

function DeadlineClosed() {
  return (
    <div style={{ fontFamily: sans, background: CR, minHeight: '100vh' }}>
      <div style={{ background: G, padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>Mendoza's Masters Pool \u00b7 {year}</div>
        <div style={{ fontFamily: bask, fontStyle: 'italic', fontWeight: 700, fontSize: 26, color: WH, marginBottom: 4 }}>Entry is Closed</div>
        <div style={{ fontFamily: bask, fontStyle: 'italic', fontSize: 14, color: GLD }}>{course} \u00b7 {dates}</div>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>{'\u26F3'}</div>
        <div style={{ fontFamily: bask, fontStyle: 'italic', fontSize: 20, color: DK, marginBottom: 12 }}>The field is set!</div>
        <div style={{ fontSize: 14, color: MT, lineHeight: 1.6, marginBottom: 24 }}>
          Entry closed on {new Date(deadline).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {new Date(deadline).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}.
        </div>
        <a href="/" style={{ display: 'inline-block', padding: '12px 24px', background: G, color: WH, borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontFamily: sans, fontSize: 14 }}>
          View the Leaderboard \u2192
        </a>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────

export default function EntryFlow() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});

  // Deadline enforcement
  const isPastDeadline = useMemo(() => new Date() > new Date(deadline), []);
  if (isPastDeadline) return <DeadlineClosed />;

  return (
    <div style={{ fontFamily: sans, background: CR, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: G, padding: '20px 24px 18px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, maxWidth: 60, height: 1, background: 'rgba(212,175,55,0.4)' }} />
          <span style={{ color: GLD, fontSize: 12 }}>{'\u2605'}</span>
          <div style={{ flex: 1, maxWidth: 60, height: 1, background: 'rgba(212,175,55,0.4)' }} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Mendoza's Masters Pool \u00b7 {year}</div>
        <div style={{ fontFamily: bask, fontStyle: 'italic', fontWeight: 700, fontSize: 26, color: WH, marginBottom: 4 }}>Enter the Pool</div>
        <div style={{ fontFamily: bask, fontStyle: 'italic', fontSize: 14, color: GLD }}>{course} \u00b7 {dates}</div>
      </div>

      {/* Info strip */}
      <div style={{ background: DK, padding: '8px 24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Entry fee: <strong style={{ color: GLD }}>${entryFee}</strong></span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>\u00b7</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Pool purse: <strong style={{ color: GLD }}>${poolPurse.toLocaleString()}</strong></span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>\u00b7</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Deadline: <strong style={{ color: WH }}>Apr 9 \u00b7 8am ET</strong></span>
      </div>

      {/* Form content */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 16px 60px' }}>
        <StepBar current={step} />
        {step === 0 && <Step1 data={data} setData={setData} onNext={() => setStep(1)} />}
        {step === 1 && <Step2 data={data} setData={setData} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <Step3 data={data} setData={setData} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Step4 data={data} onBack={() => setStep(2)} />}
      </div>
    </div>
  );
}
