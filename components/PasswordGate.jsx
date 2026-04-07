'use client';
import { useState, useEffect } from 'react';

const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";
const STORAGE_KEY = 'mmp2026_unlocked';
const PASSWORD = 'augusta2026';

export default function PasswordGate({ children }) {
  const [hydrated, setHydrated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1') {
      setUnlocked(true);
      setSplashVisible(false);
      setContentVisible(true);
    }
  }, []);

  const submit = e => {
    e.preventDefault();
    if (value.trim().toLowerCase() === PASSWORD) {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
      setError(false);
      setUnlocked(true);
      // Fade splash out, then fade content in
      setTimeout(() => setSplashVisible(false), 50);
      setTimeout(() => setContentVisible(true), 750);
    } else {
      setError(true);
    }
  };

  // Avoid SSR/CSR mismatch flash — render nothing until hydrated
  if (!hydrated) {
    return <div style={{ minHeight: '100vh', background: '#f7f4ef' }} />;
  }

  return (
    <>
      {/* Content layer */}
      <div
        style={{
          opacity: contentVisible ? 1 : 0,
          transition: 'opacity 700ms ease',
          pointerEvents: contentVisible ? 'auto' : 'none',
        }}
      >
        {children}
      </div>

      {/* Splash overlay */}
      {splashVisible && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#f7f4ef',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            opacity: unlocked ? 0 : 1,
            transition: 'opacity 700ms ease',
            pointerEvents: unlocked ? 'none' : 'auto',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 460,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              flex: '0 0 auto',
              margin: 'auto 0',
            }}
          >
            {/* Decorative divider: line-dot-line */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 22 }}>
              <div style={{ height: 1, width: 60, background: 'linear-gradient(90deg, transparent, #006B54)' }} />
              <div style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid #006B54' }} />
              <div style={{ height: 1, width: 60, background: 'linear-gradient(270deg, transparent, #006B54)' }} />
            </div>

            {/* Title */}
            <h1
              style={{
                fontFamily: bask,
                fontStyle: 'italic',
                fontWeight: 400,
                color: '#006B54',
                fontSize: 'clamp(30px, 6.5vw, 50px)',
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              Mendoza&rsquo;s Masters Pool
            </h1>

            {/* Subtitle */}
            <div
              style={{
                fontFamily: bask,
                fontStyle: 'italic',
                fontSize: 'clamp(15px, 2.6vw, 18px)',
                color: '#1a2e1a',
                marginTop: 14,
                opacity: 0.85,
              }}
            >
              Augusta National Golf Club
            </div>

            {/* Date */}
            <div
              style={{
                fontFamily: sans,
                fontSize: 11,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: '#7a6f5e',
                marginTop: 10,
                fontWeight: 500,
              }}
            >
              April 2026
            </div>

            {/* Password form */}
            <form
              onSubmit={submit}
              style={{
                marginTop: 38,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <input
                type="password"
                value={value}
                onChange={e => { setValue(e.target.value); if (error) setError(false); }}
                placeholder="Access Code"
                autoFocus
                aria-label="Access code"
                style={{
                  width: '100%',
                  maxWidth: 320,
                  padding: '14px 18px',
                  fontFamily: sans,
                  fontSize: 15,
                  textAlign: 'center',
                  letterSpacing: 2,
                  color: '#1a2e1a',
                  background: '#fff',
                  border: '1px solid #d9d3c7',
                  borderRadius: 2,
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  width: '100%',
                  maxWidth: 320,
                  padding: '14px 18px',
                  fontFamily: sans,
                  fontSize: 12,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  color: '#fff',
                  background: '#006B54',
                  border: 'none',
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'background 200ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#005a47')}
                onMouseLeave={e => (e.currentTarget.style.background = '#006B54')}
              >
                Enter the Clubhouse
              </button>

              {/* Error message */}
              <div
                style={{
                  minHeight: 20,
                  fontFamily: bask,
                  fontStyle: 'italic',
                  fontSize: 13,
                  color: '#a64545',
                  opacity: error ? 1 : 0,
                  transition: 'opacity 400ms ease',
                  marginTop: 4,
                }}
                aria-live="polite"
              >
                Invalid code &mdash; contact The Chairman
              </div>
            </form>

            {/* Tradition tagline with side lines */}
            <div
              style={{
                marginTop: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                width: '100%',
              }}
            >
              <div style={{ height: 1, flex: 1, maxWidth: 70, background: 'linear-gradient(90deg, transparent, #c5bba8)' }} />
              <div
                style={{
                  fontFamily: bask,
                  fontStyle: 'italic',
                  fontSize: 'clamp(12px, 2.2vw, 14px)',
                  color: '#7a6f5e',
                  whiteSpace: 'nowrap',
                }}
              >
                A Tradition Unlike Any Other
              </div>
              <div style={{ height: 1, flex: 1, maxWidth: 70, background: 'linear-gradient(270deg, transparent, #c5bba8)' }} />
            </div>
          </div>

          {/* Est. 2025 badge */}
          <div
            style={{
              position: 'absolute',
              bottom: 32,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontFamily: sans,
                fontSize: 9,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: '#7a6f5e',
                fontWeight: 600,
                padding: '6px 14px',
                border: '1px solid #c5bba8',
                borderRadius: 2,
              }}
            >
              Est. 2017
            </div>
          </div>
        </div>
      )}
    </>
  );
}
