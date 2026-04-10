'use client';

const bask = "'Libre Baskerville', Georgia, serif";
const sans = "'Source Sans 3', 'Helvetica Neue', sans-serif";

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

const HIGHLIGHTS = [
  {
    label: 'Best Golfer for the Pool',
    name: 'Sam Burns',
    primary: '67',
    primaryNote: '(-5)',
    detail: 'picked by 29 teams',
    accent: '#006B54',
  },
  {
    label: 'Worst Golfer for the Pool',
    name: 'Bryson DeChambeau',
    primary: '76',
    primaryNote: '(+4)',
    detail: 'hurt 126 teams',
    accent: '#c0392b',
  },
  {
    label: 'Biggest Sleeper',
    name: 'Rory McIlroy',
    primary: '67',
    primaryNote: '(-5)',
    detail: 'only picked by 34',
    accent: '#d4af37',
  },
  {
    label: 'Most Unique Team in Top 10',
    name: 'Cecil Gant',
    primary: 'T9',
    primaryNote: '',
    detail: 'low overlap with field',
    accent: '#006B54',
  },
];

function fmtPar(n) {
  if (n === 0) return 'E';
  return n > 0 ? `+${n}` : `${n}`;
}

function StandingRow({ entry }) {
  const highlighted = entry.highlighted;
  const bg = highlighted ? '#006B54' : '#fff';
  const nameColor = highlighted ? '#fff' : '#1a2e1a';
  const rankColor = highlighted ? '#d4af37' : '#8b7d6b';
  const scoreColor = highlighted ? '#d4af37' : '#006B54';
  const picksColor = highlighted ? 'rgba(255,255,255,.78)' : '#8b7d6b';
  const border = highlighted ? 'none' : '1px solid #e0dbd2';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '46px 1fr 62px',
        gap: 14,
        alignItems: 'center',
        background: bg,
        border,
        borderRadius: 8,
        padding: '14px 18px',
        marginBottom: 10,
        boxShadow: highlighted
          ? '0 3px 10px rgba(0,107,84,.18)'
          : '0 1px 3px rgba(0,0,0,.04)',
      }}
    >
      <div
        style={{
          fontFamily: bask,
          fontStyle: 'italic',
          fontSize: 22,
          fontWeight: 700,
          color: rankColor,
          textAlign: 'center',
        }}
      >
        {entry.rank}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: bask,
            fontSize: 17,
            fontWeight: 700,
            color: nameColor,
            lineHeight: 1.2,
          }}
        >
          {entry.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: picksColor,
            marginTop: 4,
            fontWeight: 500,
            letterSpacing: 0.2,
          }}
        >
          {entry.picks.join(' · ')}
        </div>
      </div>
      <div
        style={{
          fontFamily: bask,
          fontSize: 26,
          fontWeight: 700,
          color: scoreColor,
          textAlign: 'right',
          lineHeight: 1,
        }}
      >
        {fmtPar(entry.score)}
      </div>
    </div>
  );
}

function HighlightCard({ item }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e0dbd2',
        borderRadius: 10,
        padding: '16px 18px',
        boxShadow: '0 1px 3px rgba(0,0,0,.05)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 132,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#8b7d6b',
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        {item.label}
      </div>
      <div
        style={{
          fontFamily: bask,
          fontSize: 18,
          fontWeight: 700,
          color: '#1a2e1a',
          marginBottom: 6,
          lineHeight: 1.2,
        }}
      >
        {item.name}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          marginTop: 'auto',
        }}
      >
        <span
          style={{
            fontFamily: bask,
            fontSize: 32,
            fontWeight: 700,
            color: item.accent,
            lineHeight: 1,
          }}
        >
          {item.primary}
        </span>
        {item.primaryNote && (
          <span
            style={{
              fontFamily: bask,
              fontSize: 14,
              fontWeight: 700,
              color: item.accent,
            }}
          >
            {item.primaryNote}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 11,
          color: '#8b7d6b',
          marginTop: 6,
          fontStyle: 'italic',
        }}
      >
        {item.detail}
      </div>
    </div>
  );
}

function ChalkContrarianCard() {
  const Side = ({ tag, name, pct, score, scoreLabel, color, tagColor, tagBg }) => (
    <div
      style={{
        flex: 1,
        padding: '14px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 8,
          letterSpacing: 2,
          textTransform: 'uppercase',
          fontWeight: 700,
          color: tagColor,
          background: tagBg,
          padding: '3px 10px',
          borderRadius: 999,
          marginBottom: 10,
        }}
      >
        {tag}
      </div>
      <div
        style={{
          fontFamily: bask,
          fontSize: 15,
          fontWeight: 700,
          color: '#1a2e1a',
          lineHeight: 1.2,
          marginBottom: 4,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontSize: 10,
          color: '#8b7d6b',
          marginBottom: 10,
          fontWeight: 600,
        }}
      >
        {pct} picked
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
        }}
      >
        <span
          style={{
            fontFamily: bask,
            fontSize: 30,
            fontWeight: 700,
            color,
            lineHeight: 1,
          }}
        >
          {score}
        </span>
        <span
          style={{
            fontFamily: bask,
            fontSize: 13,
            fontWeight: 700,
            color,
          }}
        >
          {scoreLabel}
        </span>
      </div>
    </div>
  );

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e0dbd2',
        borderRadius: 10,
        padding: '18px 16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,.05)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 2.5,
          textTransform: 'uppercase',
          color: '#006B54',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: 14,
        }}
      >
        Chalk vs Contrarian
      </div>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
        <Side
          tag="The Chalk"
          name="Bryson DeChambeau"
          pct="42%"
          score="76"
          scoreLabel="(+4)"
          color="#c0392b"
          tagColor="#8b7d6b"
          tagBg="#f0ede5"
        />
        <div
          style={{
            width: 1,
            alignSelf: 'stretch',
            background: 'linear-gradient(180deg, transparent, #e0dbd2, transparent)',
          }}
        />
        <Side
          tag="The Contrarian"
          name="Rory McIlroy"
          pct="11%"
          score="67"
          scoreLabel="(-5)"
          color="#006B54"
          tagColor="#d4af37"
          tagBg="rgba(212,175,55,.12)"
        />
      </div>
      <div
        style={{
          marginTop: 14,
          padding: '10px 14px',
          background: '#f0ede5',
          borderRadius: 6,
          fontSize: 11,
          fontStyle: 'italic',
          color: '#8b7d6b',
          textAlign: 'center',
        }}
      >
        The field&rsquo;s most popular pick cost teams 9 strokes against the sleeper.
      </div>
    </div>
  );
}

export default function Day1Recap() {
  return (
    <div
      style={{
        background: '#f7f4ef',
        padding: '20px 0 32px',
        fontFamily: sans,
        color: '#1a2e1a',
      }}
    >
      <div
        id="day1-recap-card"
        style={{
          maxWidth: 680,
          margin: '0 auto',
          background: '#f7f4ef',
          border: '1px solid #e0dbd2',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 8px 28px rgba(0,0,0,.08)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#006B54',
            padding: '22px 24px 20px',
            color: '#fff',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                height: 1,
                width: 40,
                background: 'linear-gradient(90deg, transparent, #d4af37)',
              }}
            />
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                border: '1.5px solid #d4af37',
              }}
            />
            <div
              style={{
                height: 1,
                width: 40,
                background: 'linear-gradient(270deg, transparent, #d4af37)',
              }}
            />
          </div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,.6)',
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Mendoza&rsquo;s Masters Pool
          </div>
          <h1
            style={{
              fontFamily: bask,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 32,
              margin: '0 0 4px',
              color: '#fff',
              lineHeight: 1.1,
            }}
          >
            Day 1 Recap
          </h1>
          <div
            style={{
              fontFamily: bask,
              fontStyle: 'italic',
              fontSize: 13,
              color: '#d4af37',
              opacity: 0.9,
            }}
          >
            Round 1 · Thursday
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 20px 20px' }}>
          {/* Section: Top 5 */}
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              color: '#006B54',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: 4,
            }}
          >
            Pool Standings After R1
          </div>
          <div
            style={{
              fontFamily: bask,
              fontStyle: 'italic',
              fontSize: 13,
              color: '#8b7d6b',
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            The Top Five
          </div>
          <div>
            {TOP_5.map((entry, i) => (
              <StandingRow key={i} entry={entry} />
            ))}
          </div>

          {/* Decorative divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              margin: '24px 0 18px',
            }}
          >
            <div
              style={{
                height: 1,
                flex: 1,
                background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
              }}
            />
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#d4af37',
              }}
            />
            <div
              style={{
                height: 1,
                flex: 1,
                background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
              }}
            />
          </div>

          {/* Section: Highlights */}
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              color: '#006B54',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: 4,
            }}
          >
            Day 1 Highlights
          </div>
          <div
            style={{
              fontFamily: bask,
              fontStyle: 'italic',
              fontSize: 13,
              color: '#8b7d6b',
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            Heroes and villains of Round 1
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 18,
            }}
          >
            {HIGHLIGHTS.map((h, i) => (
              <HighlightCard key={i} item={h} />
            ))}
          </div>

          {/* Chalk vs Contrarian */}
          <ChalkContrarianCard />
        </div>

        {/* Footer */}
        <div
          style={{
            background: '#1a2e1a',
            color: '#fff',
            padding: '18px 20px 20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: bask,
              fontStyle: 'italic',
              fontSize: 13,
              color: '#d4af37',
              marginBottom: 8,
            }}
          >
            &ldquo;A Tradition Unlike Any Other&rdquo;
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,.7)',
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            mendozas-masters-pool.vercel.app
          </div>
          <div
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,.45)',
              fontWeight: 500,
              letterSpacing: 0.3,
            }}
          >
            592 visits · 267 unique visitors · Day 1
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: 680,
          margin: '14px auto 0',
          textAlign: 'center',
          fontSize: 11,
          color: '#8b7d6b',
          fontStyle: 'italic',
        }}
      >
        Screenshot this card and send it to the group.
      </div>
    </div>
  );
}
