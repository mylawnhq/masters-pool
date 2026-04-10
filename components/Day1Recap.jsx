'use client';
import { useState, useRef } from 'react';

const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";

const HTML2CANVAS_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

// Load html2canvas from a CDN exactly once per page lifetime and cache the
// resulting promise. Returns window.html2canvas when ready.
let html2canvasPromise = null;
function loadHtml2Canvas() {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (html2canvasPromise) return html2canvasPromise;
  html2canvasPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${HTML2CANVAS_CDN}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.html2canvas));
      existing.addEventListener('error', () => reject(new Error('html2canvas load failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = HTML2CANVAS_CDN;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (window.html2canvas) resolve(window.html2canvas);
      else reject(new Error('html2canvas loaded but window.html2canvas is missing'));
    };
    script.onerror = () => {
      html2canvasPromise = null;
      reject(new Error('html2canvas CDN fetch failed'));
    };
    document.head.appendChild(script);
  });
  return html2canvasPromise;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const TOP_5 = [
  {
    rank: 'T1',
    name: 'David Shenosky',
    score: -8,
    picks: ['Scheffler', 'Matsuyama', 'Day', 'Burns', 'Conners', 'Campbell'],
    highlighted: true,
  },
  {
    rank: 'T1',
    name: 'Justin Dean',
    score: -8,
    picks: ['Scheffler', 'Fleetwood', 'Rose', 'Lowry', 'Burns', 'Willett'],
    highlighted: true,
  },
  {
    rank: 'T3',
    name: 'Ben Edwards',
    score: -6,
    picks: ['McIlroy', 'Åberg', 'Reed', 'Conners', 'Lowry', 'Campbell'],
  },
  {
    rank: 'T3',
    name: 'Joey Woodman',
    score: -6,
    picks: ['Scheffler', 'Åberg', 'Schauffele', 'Lowry', 'Burns', 'Z. Johnson'],
  },
  {
    rank: '5',
    name: 'Trenton Edwards',
    score: -5,
    picks: ['Scheffler', 'Rose', 'Schauffele', 'Spaun', 'Griffin', 'Campbell'],
  },
];

function fmtPar(n) {
  if (n === 0) return 'E';
  return n > 0 ? `+${n}` : `${n}`;
}

function StandingRow({ entry }) {
  const highlighted = entry.highlighted;

  const wrap = {
    display: 'grid',
    gridTemplateColumns: '56px 1fr auto',
    alignItems: 'center',
    columnGap: 18,
    borderRadius: 14,
    padding: '22px 26px',
    marginBottom: 14,
  };

  if (highlighted) {
    return (
      <div
        style={{
          ...wrap,
          background: '#006B54',
          boxShadow: '0 4px 14px rgba(0,107,84,.22)',
        }}
      >
        <div
          style={{
            fontFamily: bask,
            fontStyle: 'italic',
            fontSize: 32,
            fontWeight: 700,
            color: '#d4af37',
            textAlign: 'center',
            lineHeight: 1,
          }}
        >
          {entry.rank}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: bask,
              fontSize: 22,
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.15,
            }}
          >
            {entry.name}
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: 'rgba(240,228,190,.78)',
              marginTop: 6,
              letterSpacing: 0.2,
            }}
          >
            {entry.picks.join(' · ')}
          </div>
        </div>
        <div
          style={{
            fontFamily: bask,
            fontSize: 34,
            fontWeight: 700,
            color: '#d4af37',
            textAlign: 'right',
            lineHeight: 1,
          }}
        >
          {fmtPar(entry.score)}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...wrap,
        background: '#fff',
        border: '1px solid #e8e3d6',
        boxShadow: '0 1px 2px rgba(0,0,0,.03)',
      }}
    >
      <div
        style={{
          fontFamily: bask,
          fontStyle: 'italic',
          fontSize: 32,
          fontWeight: 700,
          color: '#c5a959',
          textAlign: 'center',
          lineHeight: 1,
        }}
      >
        {entry.rank}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: bask,
            fontSize: 22,
            fontWeight: 700,
            color: '#1a2e1a',
            lineHeight: 1.15,
          }}
        >
          {entry.name}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: '#a5998a',
            marginTop: 6,
            letterSpacing: 0.2,
          }}
        >
          {entry.picks.join(' · ')}
        </div>
      </div>
      <div
        style={{
          fontFamily: bask,
          fontSize: 34,
          fontWeight: 700,
          color: '#406154',
          textAlign: 'right',
          lineHeight: 1,
        }}
      >
        {fmtPar(entry.score)}
      </div>
    </div>
  );
}

function HighlightCard({ label, name, detail, detailColor }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e8e3d6',
        borderRadius: 14,
        padding: '22px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 132,
        boxShadow: '0 1px 2px rgba(0,0,0,.03)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 2,
          textTransform: 'uppercase',
          fontWeight: 700,
          color: '#006B54',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: bask,
          fontWeight: 700,
          fontSize: 22,
          color: '#1a2e1a',
          lineHeight: 1.15,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontSize: 13,
          color: detailColor || '#8b7d6b',
          fontWeight: 500,
          marginTop: 'auto',
        }}
      >
        {detail}
      </div>
    </div>
  );
}

function ChalkVsContrarian() {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e8e3d6',
        borderRadius: 14,
        padding: '22px 26px 26px',
        boxShadow: '0 1px 2px rgba(0,0,0,.03)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 2,
          textTransform: 'uppercase',
          fontWeight: 700,
          color: '#006B54',
          marginBottom: 18,
        }}
      >
        Chalk vs Contrarian
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          columnGap: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: bask,
              fontWeight: 700,
              fontSize: 22,
              color: '#1a2e1a',
              lineHeight: 1.1,
            }}
          >
            DeChambeau (42%)
          </div>
          <div
            style={{
              fontFamily: bask,
              fontWeight: 700,
              fontSize: 18,
              color: '#c0392b',
              marginTop: 8,
            }}
          >
            76 (+4)
          </div>
        </div>
        <div
          style={{
            fontFamily: bask,
            fontStyle: 'italic',
            fontSize: 15,
            color: '#8b7d6b',
          }}
        >
          vs
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: bask,
              fontWeight: 700,
              fontSize: 22,
              color: '#1a2e1a',
              lineHeight: 1.1,
            }}
          >
            McIlroy (11%)
          </div>
          <div
            style={{
              fontFamily: bask,
              fontWeight: 700,
              fontSize: 18,
              color: '#006B54',
              marginTop: 8,
            }}
          >
            67 (-5)
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Day1Recap() {
  const cardRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | working | copied | downloaded | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleCopy = async () => {
    if (status === 'working') return;
    setStatus('working');
    setErrorMsg('');
    try {
      const node = cardRef.current;
      if (!node) throw new Error('Recap card not mounted');

      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(node, {
        backgroundColor: '#e8e2d4',
        scale: Math.min(3, (window.devicePixelRatio || 1) * 2),
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas blob failed'))), 'image/png');
      });

      // Try the async Clipboard API first. Many browsers (especially Safari
      // and any non-secure context) refuse this, so the catch falls through
      // to a PNG download instead.
      let clipboardOk = false;
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof window.ClipboardItem === 'function' &&
        typeof navigator.clipboard.write === 'function'
      ) {
        try {
          await navigator.clipboard.write([
            new window.ClipboardItem({ 'image/png': blob }),
          ]);
          clipboardOk = true;
        } catch {
          clipboardOk = false;
        }
      }

      if (clipboardOk) {
        setStatus('copied');
      } else {
        downloadBlob(blob, 'masters-pool-day-1-recap.png');
        setStatus('downloaded');
      }
      setTimeout(() => setStatus('idle'), 2400);
    } catch (err) {
      setErrorMsg(err?.message || 'Something went wrong');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3500);
    }
  };

  const buttonLabel =
    status === 'working' ? 'Rendering…'
    : status === 'copied' ? '✓ Copied!'
    : status === 'downloaded' ? '✓ Downloaded'
    : status === 'error' ? 'Try again'
    : 'Copy as Image';

  return (
    <div
      style={{
        background: '#e8e2d4',
        padding: '28px 16px 40px',
        fontFamily: sans,
        color: '#1a2e1a',
      }}
    >
      {/* Copy button — sits above the card, hidden from the screenshot. */}
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto 18px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={handleCopy}
          disabled={status === 'working'}
          style={{
            background: status === 'error' ? '#c0392b' : '#006B54',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '11px 22px',
            fontFamily: sans,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            cursor: status === 'working' ? 'wait' : 'pointer',
            boxShadow: '0 3px 10px rgba(0,107,84,.22)',
            transition: 'transform 120ms ease, background 120ms ease',
            opacity: status === 'working' ? 0.7 : 1,
          }}
        >
          {buttonLabel}
        </button>
        {status === 'error' && errorMsg && (
          <div style={{ fontSize: 11, color: '#c0392b', fontStyle: 'italic' }}>
            {errorMsg}
          </div>
        )}
      </div>

      <div
        id="day1-recap-card"
        ref={cardRef}
        style={{
          maxWidth: 720,
          margin: '0 auto',
          background: '#f7f4ef',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,.12)',
          border: '1px solid #e0dbd2',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#006B54',
            padding: '56px 24px 44px',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontFamily: bask,
              fontStyle: 'italic',
              fontWeight: 400,
              color: '#fff',
              fontSize: 64,
              margin: 0,
              lineHeight: 1,
              letterSpacing: -0.5,
            }}
          >
            Day 1 Recap
          </h1>
          <div
            style={{
              fontFamily: bask,
              fontStyle: 'italic',
              fontSize: 18,
              color: 'rgba(255,255,255,.72)',
              marginTop: 14,
            }}
          >
            Mendoza&rsquo;s Masters Pool &mdash; Round 1
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '40px 30px 34px' }}>
          {/* Section: Pool Standings */}
          <div
            style={{
              fontSize: 12,
              letterSpacing: 3,
              textTransform: 'uppercase',
              fontWeight: 700,
              color: '#006B54',
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            Pool Standings After R1
          </div>

          <div>
            {TOP_5.map((entry, i) => (
              <StandingRow key={i} entry={entry} />
            ))}
          </div>

          {/* Section divider: Day 1 Highlights */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              margin: '38px 0 24px',
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                background: 'linear-gradient(90deg, transparent, #c5b683)',
              }}
            />
            <div
              style={{
                fontSize: 12,
                letterSpacing: 3,
                textTransform: 'uppercase',
                fontWeight: 700,
                color: '#006B54',
                whiteSpace: 'nowrap',
              }}
            >
              Day 1 Highlights
            </div>
            <div
              style={{
                flex: 1,
                height: 1,
                background: 'linear-gradient(270deg, transparent, #c5b683)',
              }}
            />
          </div>

          {/* 2x2 Highlight grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 14,
              marginBottom: 14,
            }}
          >
            <HighlightCard
              label="Best Golfer for the Pool"
              name="Sam Burns"
              detail="67 (-5) — picked by 29 teams"
              detailColor="#006B54"
            />
            <HighlightCard
              label="Worst Golfer for the Pool"
              name="Bryson DeChambeau"
              detail="76 (+4) — hurt 126 teams"
              detailColor="#c0392b"
            />
            <HighlightCard
              label="Biggest Sleeper"
              name="Rory McIlroy"
              detail="67 (-5) — only picked by 34"
              detailColor="#006B54"
            />
            <HighlightCard
              label="Most Unique Team in Top 10"
              name="Cecil Gant (T9)"
              detail="Low overlap with field"
              detailColor="#8b7d6b"
            />
          </div>

          {/* Chalk vs Contrarian */}
          <ChalkVsContrarian />
        </div>

        {/* Footer */}
        <div style={{ padding: '0 30px 36px' }}>
          <div
            style={{
              borderTop: '1px solid #e0dbd2',
              paddingTop: 24,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontStyle: 'italic',
                color: '#8b7d6b',
                fontSize: 15,
                marginBottom: 18,
                fontFamily: bask,
              }}
            >
              Track live standings, scorecards, and picks
            </div>
            <a
              href="https://mendozas-masters-pool.vercel.app"
              style={{
                display: 'block',
                background: '#006B54',
                color: '#fff',
                fontWeight: 700,
                padding: '18px 24px',
                borderRadius: 12,
                textDecoration: 'none',
                fontSize: 15,
                letterSpacing: 0.3,
                textAlign: 'center',
                boxShadow: '0 4px 14px rgba(0,107,84,.25)',
              }}
            >
              mendozas-masters-pool.vercel.app
            </a>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: 720,
          margin: '16px auto 0',
          textAlign: 'center',
          fontSize: 12,
          color: '#8b7d6b',
          fontStyle: 'italic',
        }}
      >
        Tap “Copy as Image” above to grab the recap card.
      </div>
    </div>
  );
}
