/**
 * The room the Operator is standing in, station by station.
 *
 * Each environment is a wide SVG layer drawn behind the figure. They are
 * deliberately sparse: the character and the tool carry the story, and the room
 * only has to establish where we are. Every colour comes from CSS custom
 * properties so the whole scene re-tints as the palette travels.
 */

const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

/* 01 — the batch room ------------------------------------------------------ */

function Cards() {
  return (
    <g>
      {/* fluorescent ceiling: the only era lit from directly overhead */}
      {range(4, (i) => (
        <rect key={i} x={130 + i * 260} y={40} width={180} height={12} rx={2} className="env-fill" opacity={0.5} />
      ))}
      {range(4, (i) => (
        <path key={`g${i}`} d={`M${130 + i * 260} 52 L${310 + i * 260} 52 L${360 + i * 260} 240 L${80 + i * 260} 240 Z`} className="env-fill" opacity={0.06} />
      ))}
      {/* the service window: you hand work through it and lose sight of it */}
      <rect x={806} y={228} width={280} height={186} rx={3} className="env-stroke" />
      <rect x={806} y={228} width={280} height={186} className="env-fill" opacity={0.05} />
      <line x1={806} y1={352} x2={1086} y2={352} className="env-stroke-thin" />
      <text x={818} y={344} className="env-tag">SUBMIT · COLLECT 09:00</text>
      {/* card trays on shelves */}
      {range(3, (i) =>
        range(5, (j) => (
          <rect key={`${i}-${j}`} x={60 + j * 34} y={300 + i * 46} width={26} height={32} rx={1} className="env-stroke-thin" opacity={0.55} />
        ))
      )}
    </g>
  );
}

/* 02 — glass teletype ------------------------------------------------------ */

function Teletype() {
  return (
    <g>
      {range(26, (i) => (
        <line key={i} x1={0} y1={i * 30 + 6} x2={1200} y2={i * 30 + 6} className="env-stroke-thin" opacity={0.13} />
      ))}
      <g className="env-drift">
        {['$ ls -la /usr/src', '$ cat build.log | grep -i fail', '$ make install', '$ ./deploy.sh prod', '$ tail -f /var/log/messages'].map((t, i) => (
          <text key={t} x={60} y={180 + i * 46} className="env-mono" opacity={0.34 - i * 0.045}>{t}</text>
        ))}
      </g>
      <rect x={900} y={520} width={16} height={30} className="env-fill env-blink" opacity={0.8} />
      <circle cx={600} cy={380} r={420} className="env-stroke-thin" opacity={0.1} fill="none" />
      <circle cx={600} cy={380} r={300} className="env-stroke-thin" opacity={0.07} fill="none" />
    </g>
  );
}

/* 03 — the rack row -------------------------------------------------------- */

function Rack() {
  return (
    <g>
      {range(6, (i) => {
        const x = 20 + i * 208;
        const skip = i === 2 || i === 3;
        return skip ? null : (
          <g key={i} opacity={0.62}>
            <rect x={x} y={150} width={140} height={402} rx={3} className="env-stroke" />
            {range(11, (j) => (
              <g key={j}>
                <line x1={x + 8} y1={186 + j * 34} x2={x + 132} y2={186 + j * 34} className="env-stroke-thin" opacity={0.4} />
                <circle cx={x + 122} cy={172 + j * 34} r={3} className={(i + j) % 4 === 0 ? 'env-fill env-blink' : 'env-fill'} opacity={(i + j) % 4 === 0 ? 0.95 : 0.22} />
              </g>
            ))}
          </g>
        );
      })}
      {/* overhead cable tray, the era's real infrastructure */}
      <path d="M0 118 L1200 118" className="env-stroke-thin" opacity={0.4} />
      {range(30, (i) => (
        <path key={i} d={`M${i * 42} 118 q 10 26 24 30`} className="env-stroke-thin" opacity={0.16} fill="none" />
      ))}
      <text x={40} y={100} className="env-tag">ROW C · 40 HOSTS · 1 OPERATOR</text>
    </g>
  );
}

/* 04 — the wall ------------------------------------------------------------ */

function Wall() {
  const bricks = [];
  for (let r = 0; r < 14; r++) {
    for (let c = 0; c < 2; c++) {
      bricks.push([560 + c * 70 + (r % 2) * 35, 120 + r * 34]);
    }
  }
  return (
    <g>
      <g opacity={0.5}>
        {bricks.map(([x, y], i) => (
          <rect key={i} x={x} y={y} width={66} height={30} rx={1} className="env-stroke-thin" />
        ))}
      </g>
      <rect x={556} y={112} width={152} height={480} className="env-fill" opacity={0.05} />
      <text x={150} y={110} className="env-tag">DEVELOPMENT · WEEKLY</text>
      <text x={780} y={110} className="env-tag">OPERATIONS · QUARTERLY</text>
      {/* work going one way only */}
      {range(3, (i) => (
        <path key={i} d={`M${380 + i * 20} ${220 + i * 90} q 130 -60 250 ${10 + i * 20}`} className="env-stroke-thin env-dash" fill="none" opacity={0.4} />
      ))}
      <path d="M700 250 l22 12 l-22 12" className="env-stroke" fill="none" opacity={0.6} />
    </g>
  );
}

/* 05 — elastic ground ------------------------------------------------------ */

function Elastic() {
  return (
    <g>
      {range(9, (i) =>
        range(5, (j) => {
          const on = (i * 3 + j * 5) % 7 < 4;
          return (
            <rect
              key={`${i}-${j}`}
              x={60 + i * 126} y={140 + j * 86} width={62} height={44} rx={3}
              className={on ? 'env-fill env-pulse' : 'env-stroke-thin'}
              opacity={on ? 0.16 : 0.35}
              style={{ animationDelay: `${((i * 5 + j * 3) % 9) * 0.4}s` }}
            />
          );
        })
      )}
      <text x={60} y={110} className="env-tag">CAPACITY ON REQUEST · BILLED BY THE HOUR</text>
    </g>
  );
}

/* 06 — the word ------------------------------------------------------------ */

function Word() {
  return (
    <g>
      {range(9, (i) => (
        <path key={`l${i}`} d={`M${-40 + i * 22} ${140 + i * 44} q 260 40 460 ${190 - i * 12}`} className="env-stroke-thin" fill="none" opacity={0.22} />
      ))}
      {range(9, (i) => (
        <path key={`r${i}`} d={`M${1240 - i * 22} ${140 + i * 44} q -260 40 -460 ${190 - i * 12}`} className="env-stroke-thin" fill="none" opacity={0.22} />
      ))}
      <circle cx={600} cy={330} r={92} className="env-stroke" fill="none" opacity={0.45} />
      <circle cx={600} cy={330} r={92} className="env-fill" opacity={0.05} />
      <text x={600} y={324} className="env-mono env-mid" style={{ fontSize: 30 }}>2009</text>
      <text x={600} y={352} className="env-tag env-mid">GHENT</text>
    </g>
  );
}

/* 07 — infrastructure as text ---------------------------------------------- */

function Iac() {
  const widths = [180, 120, 240, 90, 210, 150, 270, 110, 190, 130];
  return (
    <g>
      <g opacity={0.4}>
        {range(20, (i) => (
          <line
            key={i}
            x1={70 + (i % 3) * 24} y1={120 + i * 30}
            x2={70 + (i % 3) * 24 + widths[i % 10]} y2={120 + i * 30}
            className={i % 5 === 0 ? 'env-stroke' : 'env-stroke-thin'}
          />
        ))}
      </g>
      {/* the same file, rendered as machines */}
      {range(4, (i) => (
        <g key={i} opacity={0.5}>
          <rect x={800} y={170 + i * 96} width={330} height={70} rx={3} className="env-stroke-thin" />
          <circle cx={826} cy={205 + i * 96} r={5} className="env-fill" opacity={0.7} />
          <line x1={846} y1={198 + i * 96} x2={1000} y2={198 + i * 96} className="env-stroke-thin" />
          <line x1={846} y1={214 + i * 96} x2={950} y2={214 + i * 96} className="env-stroke-thin" opacity={0.5} />
        </g>
      ))}
      <path d="M700 330 l30 16 l-30 16" className="env-stroke" fill="none" opacity={0.55} />
      <text x={70} y={92} className="env-tag">main.tf · site.yml · REVIEWED, MERGED, REVERTIBLE</text>
    </g>
  );
}

/* 08 — the foundry --------------------------------------------------------- */

function Container() {
  const stack = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) stack.push([c, r]);
  return (
    <g>
      <g opacity={0.46}>
        {stack.map(([c, r], i) => (
          <g key={i}>
            <rect x={60 + c * 156} y={520 - r * 82} width={140} height={72} rx={2} className="env-stroke-thin" />
            {range(5, (j) => (
              <line key={j} x1={78 + c * 156 + j * 26} y1={530 - r * 82} x2={78 + c * 156 + j * 26} y2={582 - r * 82} className="env-stroke-thin" opacity={0.3} />
            ))}
            {(c + r) % 5 === 0 && <rect x={72 + c * 156} y={532 - r * 82} width={30} height={9} className="env-fill" opacity={0.6} />}
          </g>
        ))}
      </g>
      <text x={60} y={112} className="env-tag">BUILD ONCE · RUN IDENTICAL · SHA256 PINNED</text>
    </g>
  );
}

/* 09 — desired state ------------------------------------------------------- */

function Desired() {
  return (
    <g>
      {range(3, (i) => (
        <circle key={i} cx={600} cy={352} r={140 + i * 110} className="env-stroke-thin" fill="none" opacity={0.24} />
      ))}
      <g className="env-orbit" style={{ transformOrigin: '600px 352px' }}>
        {range(8, (i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <rect
              key={i}
              x={600 + Math.cos(a) * 250 - 16} y={352 + Math.sin(a) * 250 - 16}
              width={32} height={32} rx={4}
              className={i < 6 ? 'env-fill' : 'env-stroke-thin env-blink'}
              opacity={i < 6 ? 0.5 : 0.85}
            />
          );
        })}
      </g>
      <text x={60} y={112} className="env-tag">SPEC 8 REPLICAS · STATUS 6 · RECONCILING</text>
      <path d="M420 620 q 180 -50 360 0" className="env-stroke-thin env-dash" fill="none" opacity={0.4} />
    </g>
  );
}

/* 10 — the feedback organ -------------------------------------------------- */

function Feedback() {
  const wave = (amp, phase, y) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= 1200; x += 24) {
      d += ` L${x} ${(y + Math.sin(x / 90 + phase) * amp + Math.sin(x / 31 + phase * 2) * amp * 0.4).toFixed(1)}`;
    }
    return d;
  };
  return (
    <g>
      <rect x={0} y={318} width={1200} height={68} className="env-fill" opacity={0.06} />
      <line x1={0} y1={318} x2={1200} y2={318} className="env-stroke-thin env-dash" opacity={0.5} />
      <line x1={0} y1={386} x2={1200} y2={386} className="env-stroke-thin env-dash" opacity={0.5} />
      <path d={wave(30, 0, 220)} className="env-stroke-thin" fill="none" opacity={0.4} />
      <path d={wave(46, 1.7, 352)} className="env-stroke" fill="none" opacity={0.6} />
      <path d={wave(22, 3.1, 520)} className="env-stroke-thin" fill="none" opacity={0.32} />
      <text x={60} y={306} className="env-tag">SLO BAND · 99.9</text>
      <text x={60} y={112} className="env-tag">METRICS · LOGS · TRACES · ONE STORY</text>
    </g>
  );
}

/* 11 — signed and sealed --------------------------------------------------- */

function Signed() {
  return (
    <g>
      {range(7, (i) => (
        <g key={i} opacity={0.44}>
          <rect x={70 + i * 158} y={300} width={106} height={106} rx={4} className="env-stroke-thin" />
          <path d={`M${96 + i * 158} 352 l16 18 l30 -38`} className="env-stroke" fill="none" opacity={0.75} />
          {i < 6 && <line x1={176 + i * 158} y1={353} x2={228 + i * 158} y2={353} className="env-stroke-thin" />}
          <text x={70 + i * 158} y={432} className="env-tag" style={{ fontSize: 9 }}>{`0x${(i * 7841).toString(16).padStart(4, '0')}`}</text>
        </g>
      ))}
      <text x={70} y={112} className="env-tag">EACH LINK COMMITS TO THE ONE BEFORE IT</text>
      <path d="M70 262 L1130 262" className="env-stroke-thin" opacity={0.3} />
    </g>
  );
}

/* 12 — the golden path ----------------------------------------------------- */

function Golden() {
  return (
    <g>
      <path d="M-60 660 C 320 640, 520 430, 1260 300" className="env-stroke" fill="none" strokeWidth={54} opacity={0.1} />
      <path d="M-60 660 C 320 640, 520 430, 1260 300" className="env-stroke-thin env-dash-run" fill="none" opacity={0.65} />
      {range(4, (i) => (
        <path
          key={i}
          d={`M${100 + i * 130} 700 C ${300 + i * 90} ${600 - i * 30}, ${520 + i * 60} ${470 - i * 20}, 1260 ${330 + i * 24}`}
          className="env-stroke-thin" fill="none" opacity={0.16} strokeDasharray="3 10"
        />
      ))}
      {range(5, (i) => (
        <g key={`m${i}`} opacity={0.5}>
          <circle cx={200 + i * 210} cy={612 - i * 66} r={5} className="env-fill" />
          <text x={214 + i * 210} y={616 - i * 66} className="env-tag" style={{ fontSize: 10 }}>
            {['SCAFFOLD', 'BUILD', 'SIGN', 'DEPLOY', 'OBSERVE'][i]}
          </text>
        </g>
      ))}
      <text x={70} y={112} className="env-tag">THE SAFE WAY IS THE QUICK WAY</text>
    </g>
  );
}

export const ENVIRONMENTS = {
  cards: Cards,
  teletype: Teletype,
  rack: Rack,
  wall: Wall,
  elastic: Elastic,
  word: Word,
  iac: Iac,
  container: Container,
  desired: Desired,
  feedback: Feedback,
  signed: Signed,
  golden: Golden,
};
