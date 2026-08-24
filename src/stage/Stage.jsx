import { useRef } from 'react';
import { ERAS, ERA_COUNT } from '../data/eras';
import { ENVIRONMENTS } from './Environments';
import { Operator } from './Operator';
import { useSceneFrame, useStation } from '../scene/useScene';
import { clamp, ensureContrast, mixHex, mixRgba, smoothstep } from '../scene/math';

/**
 * Drives a contrast-safe page palette from scroll position.
 *
 * Backgrounds still travel continuously through the historical luminance arc,
 * but foregrounds are corrected only when required to preserve readable
 * contrast. This avoids the grey-on-grey midpoint that occurs when a light
 * palette and a dark palette are interpolated independently.
 */
export function Palette() {
  const last = useRef('');

  useSceneFrame((s) => {
    const pos = clamp(s.pos, 0, ERA_COUNT - 1);
    const a = Math.min(ERA_COUNT - 1, Math.floor(pos));
    const b = Math.min(ERA_COUNT - 1, a + 1);
    const t = Math.round(smoothstep(pos - a) * 80) / 80;

    const A = ERAS[a].theme;
    const B = ERAS[b].theme;
    const key = `${a}|${t}`;
    if (key === last.current) return;
    last.current = key;

    const bg = mixHex(A.bg, B.bg, t);
    const ink = ensureContrast(bg, mixHex(A.ink, B.ink, t), 4.5);
    const muted = ensureContrast(bg, mixHex(A.muted, B.muted, t), 4.5);
    const accent = ensureContrast(bg, mixHex(A.accent, B.accent, t), 4.5);
    const onAccent = ensureContrast(accent, bg, 4.5);

    const root = document.documentElement.style;
    root.setProperty('--bg', bg);
    root.setProperty('--ink', ink);
    root.setProperty('--muted', muted);
    root.setProperty('--accent', accent);
    root.setProperty('--on-accent', onAccent);
    root.setProperty('--rule', mixRgba(A.rule, B.rule, t));
    root.setProperty('--field', mixRgba(A.field, B.field, t));
    root.setProperty('--paper', (A.light ? 1 - t : 0) + (B.light ? t : 0));
  });

  return null;
}

export function Stage() {
  const envRefs = useRef([]);
  const captionRef = useRef(null);
  const stageRef = useRef(null);
  const lastCaption = useRef(-1);
  const station = useStation();
  const era = ERAS[station];

  useSceneFrame((s) => {
    const pos = clamp(s.pos, 0, ERA_COUNT - 1);
    const a = Math.min(ERA_COUNT - 1, Math.floor(pos));
    const b = Math.min(ERA_COUNT - 1, a + 1);
    const f = smoothstep(pos - a);
    const modernity = pos / Math.max(1, ERA_COUNT - 1);

    if (stageRef.current) {
      stageRef.current.style.setProperty('--modernity', modernity.toFixed(4));
      stageRef.current.style.setProperty('--analogue', (1 - modernity).toFixed(4));
      stageRef.current.style.setProperty('--velocity', Math.min(1, Math.abs(s.velocity) / 3).toFixed(3));
    }

    for (let i = 0; i < ERA_COUNT; i++) {
      const g = envRefs.current[i];
      if (!g) continue;
      const o = i === a ? 1 - f : i === b ? f : 0;
      if (o <= 0.002) {
        if (g.style.display !== 'none') g.style.display = 'none';
        continue;
      }
      if (g.style.display === 'none') g.style.display = '';
      g.style.opacity = o.toFixed(3);
      const drift = (f - 0.5) * -34;
      const lift = (i === b ? 1 - f : f) * 7;
      g.style.transform = `translate3d(${drift.toFixed(1)}px,${lift.toFixed(1)}px,0) scale(${(1 + o * 0.012).toFixed(4)})`;
    }

    const nearest = Math.round(pos);
    if (nearest !== lastCaption.current && captionRef.current) {
      lastCaption.current = nearest;
      captionRef.current.textContent = `${ERAS[nearest].n} — ${ERAS[nearest].anchor}`;
    }
  });

  const onPointerMove = (event) => {
    const el = stageRef.current;
    if (!el || event.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((event.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((event.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <div
      ref={stageRef}
      className={`stage stage-${era.id}`}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        if (!stageRef.current) return;
        stageRef.current.style.setProperty('--mx', '58%');
        stageRef.current.style.setProperty('--my', '38%');
      }}
      aria-hidden="true"
    >
      <div className="stage-atmosphere">
        <i className="atmosphere-beam" />
        <i className="atmosphere-grid" />
        <i className="atmosphere-dust" />
        <i className="atmosphere-vignette" />
      </div>

      <div className="stage-room">
        <svg className="env" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="sceneGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="var(--accent)" stopOpacity=".15" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="sceneFade" x1="0" x2="1">
              <stop offset="0" stopColor="var(--bg)" stopOpacity=".9" />
              <stop offset=".46" stopColor="var(--bg)" stopOpacity="0" />
              <stop offset="1" stopColor="var(--bg)" stopOpacity=".3" />
            </linearGradient>
          </defs>
          {ERAS.map((item, i) => {
            const Env = ENVIRONMENTS[item.id];
            return (
              <g
                key={item.id}
                ref={(n) => { envRefs.current[i] = n; }}
                className={`env-scene env-${item.id}`}
                style={{ display: 'none' }}
              >
                <Env />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="stage-character-light" />
      <div className="stage-figure">
        <Operator />
      </div>

      <div className="stage-legend">
        <span className="stage-legend-kicker">Operator memory · {era.n}/12</span>
        <strong>{era.learned.label}</strong>
        <span>{era.learned.gloss}</span>
      </div>

      <div className="stage-caption" ref={captionRef} />
    </div>
  );
}
