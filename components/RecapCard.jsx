'use client';
/**
 * RecapCard — shared template for Day 1 / Day 2 / Day 3 / Day 4 recap graphics.
 *
 * Each day's recap is just a thin wrapper around <RecapCard /> that passes a
 * data object describing that day's content. The visual design — header band,
 * standing rows (with green highlight for leaders), 2×2 highlight grid, chalk
 * vs contrarian comparison, footer button, and the "Copy as Image" capture
 * flow — all live here so future days inherit any tweaks automatically.
 *
 * Props
 * -----
 *  data: {
 *    day:      number               // 1-4
 *    title:    string               // e.g. "Day 1 Recap" — optional, defaults to `Day {N} Recap`
 *    subtitle: string               // e.g. "Mendoza's Masters Pool — Round 1"
 *    standingsTitle: string         // e.g. "Pool Standings After R1" — optional, defaults to `Pool Standings After R{N}`
 *    highlightsTitle: string        // optional, defaults to `Day {N} Highlights`
 *    top5: Array<{
 *      rank:        string          // "1" | "T1" | "T3" | etc
 *      name:        string          // entry name (the player in the pool)
 *      score:       number          // aggregate team score-to-par (negative is good)
 *      picks:       string[]        // 6 last names, joined with " · " in the row
 *      highlighted: boolean         // true → green/gold leader treatment
 *    }>
 *    highlights: Array<{            // 4 cards rendered in a 2×2 grid
 *      label:       string          // small uppercase eyebrow
 *      name:        string          // big bold name
 *      detail:      string          // one-line detail under the name
 *      detailColor: string          // CSS color for the detail line
 *    }>
 *    chalk: {
 *      left:  { name: string, score: string, color: string }   // chalk pick
 *      right: { name: string, score: string, color: string }   // contrarian pick
 *    }
 *    footerHint: string             // optional, defaults to the standard tagline
 *    siteUrl:    string             // optional, defaults to the production URL
 *  }
 */

import { useRef, useState } from 'react';

const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";

const HTML2CANVAS_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

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
          <div style={{ fontFamily: bask, fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.15 }}>
            {entry.name}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(240,228,190,.78)', marginTop: 6, letterSpacing: 0.2 }}>
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
          {entry.scoreLabel || fmtPar(entry.score)}
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
        <div style={{ fontFamily: bask, fontSize: 22, fontWeight: 700, color: '#1a2e1a', lineHeight: 1.15 }}>
          {entry.name}
        </div>
        <div style={{ fontSize: 12.5, color: '#a5998a', marginTop: 6, letterSpacing: 0.2 }}>
          {entry.picks.join(' · ')}
        </div>
      </div>
      <div
        style={{
          fontFamily: bask,
          fontSize: entry.scoreLabel ? 28 : 34,
          fontWeight: 700,
          color: '#406154',
          textAlign: 'right',
          lineHeight: 1,
        }}
      >
        {entry.scoreLabel || fmtPar(entry.score)}
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

function ChalkVsContrarian({ chalk }) {
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
            {chalk.left.name}
          </div>
          <div
            style={{
              fontFamily: bask,
              fontWeight: 700,
              fontSize: 18,
              color: chalk.left.color,
              marginTop: 8,
            }}
          >
            {chalk.left.score}
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
            {chalk.right.name}
          </div>
          <div
            style={{
              fontFamily: bask,
              fontWeight: 700,
              fontSize: 18,
              color: chalk.right.color,
              marginTop: 8,
            }}
          >
            {chalk.right.score}
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_FOOTER_HINT = 'Track live standings, scorecards, and picks';
const DEFAULT_SITE_URL = 'https://mendozas-masters-pool.vercel.app';
const DEFAULT_SITE_LABEL = 'mendozas-masters-pool.vercel.app';

export default function RecapCard({ data }) {
  const cardRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | working | copied | downloaded | error
  const [errorMsg, setErrorMsg] = useState('');

  const day = data.day;
  const title = data.title || `Day ${day} Recap`;
  const subtitle = data.subtitle;
  const standingsTitle = data.standingsTitle || `Pool Standings After R${day}`;
  const highlightsTitle = data.highlightsTitle || `Day ${day} Highlights`;
  const footerHint = data.footerHint || DEFAULT_FOOTER_HINT;
  const siteUrl = data.siteUrl || DEFAULT_SITE_URL;
  const siteLabel = data.siteLabel || DEFAULT_SITE_LABEL;

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
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas blob failed'))),
          'image/png',
        );
      });

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
        downloadBlob(blob, `masters-pool-day-${day}-recap.png`);
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
            {title}
          </h1>
          {subtitle && (
            <div
              style={{
                fontFamily: bask,
                fontStyle: 'italic',
                fontSize: 18,
                color: 'rgba(255,255,255,.72)',
                marginTop: 14,
              }}
            >
              {subtitle}
            </div>
          )}
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
            {standingsTitle}
          </div>

          <div>
            {data.top5.map((entry, i) => (
              <StandingRow key={i} entry={entry} />
            ))}
          </div>

          {/* Section divider: Day N Highlights */}
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
              {highlightsTitle}
            </div>
            <div
              style={{
                flex: 1,
                height: 1,
                background: 'linear-gradient(270deg, transparent, #c5b683)',
              }}
            />
          </div>

          {/* Highlight grid — renders all highlights in rows of 2. Supports
              4 (Day 1 pattern) or 6 (Day 2 pattern with extraHighlights). */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 14,
              marginBottom: 14,
            }}
          >
            {data.highlights.map((h, i) => (
              <HighlightCard key={i} {...h} />
            ))}
            {(data.extraHighlights || []).map((h, i) => (
              <HighlightCard key={`extra-${i}`} {...h} />
            ))}
          </div>

          {/* Chalk vs Contrarian — optional, only renders when data.chalk is provided */}
          {data.chalk && <ChalkVsContrarian chalk={data.chalk} />}
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
              {footerHint}
            </div>
            <a
              href={siteUrl}
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
              {siteLabel}
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
