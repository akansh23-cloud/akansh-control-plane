/**
 * What the Operator is holding, station by station.
 *
 * All coordinates in this file are relative to the shoulder joint, so a tool
 * stays correctly in hand as the figure straightens up over the journey.
 *
 * `hands` are IK targets. The arm solver in Operator.jsx reaches for them, which
 * is why the pose reads as "holding this thing" rather than "posed next to it".
 */

export { TOOL_RIG } from './rig-hands.mjs';

/* Shared bits ------------------------------------------------------------- */

const Ink = (p) => <g className="tool-ink" {...p} />;

/** A short mono label used on several tools. */
const Tag = ({ x, y, children, size = 7 }) => (
  <text x={x} y={y} className="tool-tag" style={{ fontSize: size }}>{children}</text>
);

/* 01 — a tray of punch cards ---------------------------------------------- */

function Cards() {
  const cards = [];
  for (let i = 0; i < 9; i++) cards.push(-52 + i * 9);
  return (
    <Ink>
      {/* cards escaping upward: the deck was always one trip away from disaster */}
      <g className="tool-float">
        <rect x={-70} y={-6} width={30} height={13} rx={1} transform="rotate(-19 -55 0)" className="fill-accent" opacity=".55" />
        <rect x={-84} y={22} width={30} height={13} rx={1} transform="rotate(11 -69 28)" className="fill-accent" opacity=".3" />
      </g>
      <path d="M-58 84 L38 84 L34 60 L-54 60 Z" className="stroke" />
      <path d="M-58 84 L38 84 L38 92 L-58 92 Z" className="fill-ink" opacity=".9" />
      {cards.map((x, i) => (
        <line key={i} x1={x} y1={62} x2={x + 3} y2={82} className="stroke-thin" opacity={0.75} />
      ))}
      <rect x={-54} y={64} width={18} height={5} className="fill-accent" opacity=".8" />
      <Tag x={-58} y={104}>80 COL · ONE JOB</Tag>
    </Ink>
  );
}

/* 02 — glass teletype ------------------------------------------------------ */

function Teletype() {
  return (
    <Ink>
      <rect x={30} y={2} width={92} height={70} rx={7} className="stroke" />
      <rect x={38} y={10} width={76} height={48} rx={3} className="fill-accent" opacity=".13" />
      {[20, 28, 36, 44].map((y, i) => (
        <line key={y} x1={44} y1={y} x2={44 + [40, 26, 34, 14][i]} y2={y} className="stroke-accent" opacity=".85" />
      ))}
      <rect x={44} y={49} width={9} height={7} className="fill-accent tool-blink" />
      <path d="M50 72 L102 72 L110 84 L42 84 Z" className="stroke" />
      <path d="M-16 86 L64 86 L68 94 L-20 94 Z" className="stroke" />
      {[-10, 2, 14, 26, 38, 50].map((x) => (
        <line key={x} x1={x} y1={88} x2={x + 4} y2={92} className="stroke-thin" opacity=".7" />
      ))}
      <Tag x={30} y={108}>$ ↑ ENTER</Tag>
    </Ink>
  );
}

/* 03 — rack and pager ------------------------------------------------------ */

function Rack() {
  const units = [];
  for (let i = 0; i < 9; i++) units.push(-74 + i * 17);
  return (
    <Ink>
      <rect x={54} y={-78} width={68} height={168} rx={3} className="stroke" />
      {units.map((y, i) => (
        <g key={y}>
          <line x1={58} y1={y + 82} x2={118} y2={y + 82} className="stroke-thin" opacity=".55" />
          <circle
            cx={112} cy={y + 78} r={2.6}
            className={i % 3 === 1 ? 'fill-accent tool-blink' : 'fill-ink'}
            opacity={i % 3 === 1 ? 1 : 0.35}
          />
        </g>
      ))}
      {/* the pager: the actual interface to production for fifteen years */}
      <g className="tool-shake">
        <rect x={-40} y={38} width={30} height={20} rx={3} className="stroke" />
        <rect x={-36} y={42} width={22} height={8} className="fill-accent" opacity=".75" />
        <circle cx={-25} cy={54} r={1.8} className="fill-accent" />
      </g>
      <Tag x={54} y={104}>P1 · PAGE 03:14</Tag>
    </Ink>
  );
}

/* 04 — the handoff --------------------------------------------------------- */

function Wall() {
  return (
    <Ink>
      {/* a change request going over, and a stack of them not coming back */}
      <g transform="rotate(-14 52 24)">
        <rect x={40} y={12} width={38} height={48} rx={2} className="stroke" />
        {[22, 30, 38, 46].map((y) => (
          <line key={y} x1={46} y1={y} x2={y === 46 ? 62 : 72} y2={y} className="stroke-thin" opacity=".6" />
        ))}
        <rect x={46} y={50} width={16} height={5} className="fill-accent" opacity=".85" />
      </g>
      <g opacity=".75">
        {[0, 5, 10].map((o, i) => (
          <rect key={i} x={-78 + o} y={44 - o} width={34} height={44} rx={2} className="stroke-thin" opacity={1 - i * 0.25} />
        ))}
      </g>
      <Tag x={-80} y={104}>CAB · QUEUED ×41</Tag>
    </Ink>
  );
}

/* 05 — elastic capacity ---------------------------------------------------- */

function Elastic() {
  const boxes = [
    [40, -76, 22, 0], [70, -58, 18, 0.15], [34, -44, 16, 0.3],
    [72, -24, 20, 0.45], [42, -14, 14, 0.6],
  ];
  return (
    <Ink>
      <g className="tool-float">
        {boxes.map(([x, y, s, d], i) => (
          <rect
            key={i} x={x} y={y} width={s} height={s} rx={2}
            className={i % 2 ? 'stroke-accent' : 'fill-accent'}
            opacity={i % 2 ? 0.9 : 0.35}
            style={{ animationDelay: `${d}s` }}
          />
        ))}
      </g>
      <path d="M46 -6 L58 -18" className="stroke-accent" opacity=".6" />
      <rect x={-46} y={58} width={34} height={26} rx={2} className="stroke" />
      <Tag x={-48} y={100}>RUN · TERMINATE</Tag>
    </Ink>
  );
}

/* 06 — the word ------------------------------------------------------------ */

function Word() {
  return (
    <Ink>
      <line x1={-14} y1={4} x2={-14} y2={30} className="stroke-thin" opacity=".5" />
      <line x1={14} y1={4} x2={14} y2={30} className="stroke-thin" opacity=".5" />
      <rect x={-42} y={28} width={84} height={40} rx={3} className="stroke" />
      <rect x={-42} y={28} width={84} height={11} className="fill-accent" opacity=".8" />
      <text x={0} y={54} className="tool-tag tool-tag-mid" style={{ fontSize: 11 }}>devops</text>
      <text x={0} y={64} className="tool-tag tool-tag-mid" style={{ fontSize: 5.5 }}>GHENT · OCT 2009</text>
      {/* two hands, one badge */}
      <path d="M-52 40 L-42 40 M42 40 L52 40" className="stroke-accent" />
    </Ink>
  );
}

/* 07 — infrastructure as text ---------------------------------------------- */

function Iac() {
  const rows = [
    [0, 30], [8, 44], [8, 38], [16, 26], [8, 40], [0, 34],
  ];
  return (
    <Ink>
      <g className="tool-float">
        <rect x={-46} y={-16} width={96} height={64} rx={4} className="stroke" />
        {rows.map(([ind, w], i) => (
          <g key={i}>
            <circle cx={-38} cy={-4 + i * 10} r={1.2} className="fill-ink" opacity=".4" />
            <line
              x1={-32 + ind} y1={-4 + i * 10} x2={-32 + ind + w} y2={-4 + i * 10}
              className={i % 3 === 0 ? 'stroke-accent' : 'stroke-thin'}
              opacity={i % 3 === 0 ? 0.95 : 0.55}
            />
          </g>
        ))}
      </g>
      <path d="M-34 54 L36 54 L40 62 L-38 62 Z" className="stroke" />
      <Tag x={-46} y={80}>PLAN · APPLY · DIFF</Tag>
    </Ink>
  );
}

/* 08 — the sealed unit ----------------------------------------------------- */

function Container({ iso }) {
  return (
    <Ink>
      <g transform="translate(-4 34)">
        {iso}
      </g>
      <g opacity=".55" transform="translate(48 6) scale(.6)">{iso}</g>
      <g opacity=".3" transform="translate(60 -34) scale(.42)">{iso}</g>
      <Tag x={-46} y={104}>SHA256 · IMMUTABLE</Tag>
    </Ink>
  );
}

const isoCube = (
  <g>
    <path d="M-40 12 L0 -8 L40 12 L0 32 Z" className="stroke" />
    <path d="M-40 12 L-40 44 L0 64 L0 32 Z" className="stroke" />
    <path d="M40 12 L40 44 L0 64 L0 32 Z" className="fill-accent" opacity=".22" />
    <path d="M40 12 L40 44 L0 64 L0 32 Z" className="stroke" />
    {[-28, -18, -8].map((x, i) => (
      <line key={i} x1={x} y1={22 + i * 0} x2={x} y2={50} className="stroke-thin" opacity=".45" transform={`translate(0 ${i * 0})`} />
    ))}
    <circle cx={0} cy={2} r={4} className="fill-accent" />
  </g>
);

/* 09 — desired state ------------------------------------------------------- */

function Desired() {
  const pods = [0, 60, 120, 180, 240, 300];
  return (
    <Ink>
      <g transform="translate(58 -46)">
        <g className="tool-spin">
          <circle r={40} className="stroke" fill="none" />
          {pods.map((a, i) => {
            const r = (a * Math.PI) / 180;
            return (
              <rect
                key={a} x={Math.cos(r) * 40 - 5} y={Math.sin(r) * 40 - 5} width={10} height={10} rx={1.5}
                className={i < 4 ? 'fill-accent' : 'stroke-thin'} opacity={i < 4 ? 0.95 : 0.5}
              />
            );
          })}
        </g>
        <path d="M0 -52 L8 -44 L0 -36" className="stroke-accent" fill="none" />
        <circle r={5} className="fill-accent" opacity=".8" />
      </g>
      <rect x={-48} y={54} width={30} height={22} rx={2} className="stroke" />
      <Tag x={-52} y={96}>SPEC ≠ STATUS → ACT</Tag>
    </Ink>
  );
}

/* 10 — the feedback organ -------------------------------------------------- */

function Feedback() {
  return (
    <Ink>
      <rect x={-52} y={-16} width={106} height={54} rx={4} className="stroke" />
      <rect x={-52} y={12} width={106} height={12} className="fill-accent" opacity=".12" />
      <path
        d="M-44 22 L-30 14 L-20 26 L-8 8 L4 18 L16 6 L28 16 L40 4 L48 12"
        className="stroke-accent" fill="none"
      />
      <line x1={-52} y1={12} x2={54} y2={12} className="stroke-thin" opacity=".5" strokeDasharray="3 3" />
      <Tag x={-52} y={50} size={5.5}>SLO 99.9 · BUDGET 41%</Tag>
      <rect x={-30} y={58} width={62} height={8} rx={1} className="stroke-thin" />
      <rect x={-30} y={58} width={26} height={8} className="fill-accent" opacity=".8" />
      <Tag x={-52} y={88}>ERROR BUDGET</Tag>
    </Ink>
  );
}

/* 11 — signed and sealed --------------------------------------------------- */

function Signed() {
  return (
    <Ink>
      <g transform="translate(46 -34)">
        <circle r={26} className="stroke" fill="none" />
        <circle r={19} className="stroke-thin" fill="none" opacity=".55" />
        <path d="M-9 1 L-2 9 L10 -8" className="stroke-accent" fill="none" strokeWidth={3} />
      </g>
      {/* a hash chain: each link commits to the one before it */}
      <g opacity=".8">
        {[0, 1, 2, 3].map((i) => (
          <g key={i} transform={`translate(${-52 + i * 22} 62)`}>
            <rect x={-8} y={-8} width={16} height={16} rx={2} className={i === 3 ? 'fill-accent' : 'stroke-thin'} opacity={i === 3 ? 0.9 : 1} />
            {i < 3 && <line x1={8} y1={0} x2={14} y2={0} className="stroke-thin" />}
          </g>
        ))}
      </g>
      <Tag x={-56} y={94}>PROVENANCE · VERIFIED</Tag>
    </Ink>
  );
}

/* 12 — the golden path ----------------------------------------------------- */

function Golden() {
  return (
    <Ink>
      <path d="M-48 92 C 10 92, 34 62, 96 44" className="stroke-accent" fill="none" strokeWidth={7} opacity=".28" />
      <path d="M-48 92 C 10 92, 34 62, 96 44" className="stroke-accent" fill="none" strokeDasharray="7 9" />
      <path d="M88 34 L102 44 L88 54" className="stroke-accent" fill="none" />
      <g opacity=".45">
        <path d="M-30 92 C 4 92, 20 74, 40 46" className="stroke-thin" fill="none" strokeDasharray="2 6" />
      </g>
      <rect x={-58} y={44} width={44} height={34} rx={4} className="stroke" />
      {[52, 60, 68].map((y, i) => (
        <line key={y} x1={-52} y1={y} x2={-52 + [30, 20, 26][i]} y2={y} className="stroke-thin" opacity=".65" />
      ))}
      <circle cx={-20} cy={50} r={2.6} className="fill-accent" />
      <Tag x={-58} y={116}>SHIP · SELF SERVE</Tag>
    </Ink>
  );
}

/* ------------------------------------------------------------------------- */

export const TOOLS = {
  cards: Cards,
  teletype: Teletype,
  rack: Rack,
  wall: Wall,
  elastic: Elastic,
  word: Word,
  iac: Iac,
  container: () => <Container iso={isoCube} />,
  desired: Desired,
  feedback: Feedback,
  signed: Signed,
  golden: Golden,
};
