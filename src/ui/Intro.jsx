import { profile } from '../data/profile';

/**
 * The page opens on the most characteristic object in the subject's world: a
 * job you can hold. Eighty columns, twelve rows, one program, and no way to
 * find out whether it worked until tomorrow.
 */

const COLS = 80;
const ROWS = 12;

// A fixed, deterministic punch pattern. Deliberately not random — a card that
// re-shuffles on every render would be a decoration; this one is an artifact.
function punches() {
  const out = [];
  for (let c = 0; c < COLS; c++) {
    const n = (c * 37 + 11) % 97;
    if (n % 5 === 0) continue;
    out.push([c, n % ROWS]);
    if (n % 11 === 0) out.push([c, (n + 5) % ROWS]);
  }
  return out;
}

const HOLES = punches();

function PunchCard() {
  const w = 900;
  const h = 260;
  const padX = 26;
  const padY = 44;
  const cw = (w - padX * 2) / COLS;
  const ch = (h - padY - 22) / ROWS;

  return (
    <svg className="card-art" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="An IBM punch card holding a single job.">
      <path d={`M0 22 L22 0 L${w} 0 L${w} ${h} L0 ${h} Z`} className="card-body" />
      <text x={padX} y={30} className="card-print">JOB ACCT (SHIP,SOFTWARE),CLASS=A</text>
      {HOLES.map(([c, r], i) => (
        <rect
          key={i}
          x={padX + c * cw + cw * 0.22}
          y={padY + r * ch + ch * 0.2}
          width={cw * 0.56}
          height={ch * 0.6}
          rx={0.8}
          className="card-hole"
        />
      ))}
      {Array.from({ length: COLS }, (_, c) => (
        <text key={c} x={padX + c * cw + cw / 2} y={h - 8} className="card-col">
          {(c + 1) % 10}
        </text>
      ))}
    </svg>
  );
}

export function Intro({ onBegin }) {
  return (
    <header className="intro">
      <div className="intro-grid">
        <div className="intro-copy">
          <p className="eyebrow">A scrolling history of shipping software</p>
          <h1 className="intro-title">
            <span>The</span>
            <span>Operator</span>
          </h1>
          <p className="intro-stand">{profile.standfirst}</p>
          <p className="intro-byline">
            <b>{profile.name}</b>
            <span>{profile.role}</span>
          </p>
          <div className="intro-actions">
            <button type="button" className="btn btn-primary" onClick={() => onBegin(0)}>
              Start in 1964
            </button>
            <a className="btn" href="#dossier">Skip to the engineer</a>
          </div>
        </div>

        <figure className="intro-art">
          <PunchCard />
          <figcaption>
            One job, punched into eighty columns. Submitted this evening.
            Result tomorrow, if the deck stays in order.
          </figcaption>
        </figure>
      </div>

      <p className="intro-cue" aria-hidden="true">
        <span className="cue-line" />
        Scroll — he learns as you go
      </p>
    </header>
  );
}
