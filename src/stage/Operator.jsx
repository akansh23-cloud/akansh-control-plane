import { useRef } from 'react';
import { ERAS, ERA_COUNT } from '../data/eras';
import { buildFigure, blendHands, STAGE } from './rig';
import { TOOL_RIG, HEADSET_FROM } from './rig-hands.mjs';
import { TOOLS } from './Tools';
import { useSceneFrame } from '../scene/useScene';
import { clamp, lerp, lerpAngle, mixHex, smoothstep } from '../scene/math';

/**
 * One illustrated human, twelve decades of learning.
 *
 * The skeleton remains mathematical and reversible, but the old abstract body
 * is now dressed with a face, hair, glasses, hands, clothes and era-dependent
 * accessories. The result is still live SVG—not a set of static character
 * images—so posture, tools and expression continue to morph with scroll.
 */

const RING = { cx: 224, cy: 470, rx: 208, ry: 54 };
const TAU = Math.PI * 2;
const HIP = { x: 224, y: 380 };

export function Operator() {
  const el = {
    root: useRef(null),
    spine: useRef(null),
    neck: useRef(null),
    armL: useRef(null),
    armR: useRef(null),
    legL: useRef(null),
    legR: useRef(null),
    torso: useRef(null),
    jacket: useRef(null),
    jacketZip: useRef(null),
    tie: useRef(null),
    lanyard: useRef(null),
    badge: useRef(null),
    handL: useRef(null),
    handR: useRef(null),
    head: useRef(null),
    hairGrey: useRef(null),
    mouth: useRef(null),
    browL: useRef(null),
    browR: useRef(null),
    wrinkles: useRef(null),
    headset: useRef(null),
    shadow: useRef(null),
    aura: useRef(null),
    tools: useRef([]),
    glyphs: useRef([]),
  };

  useSceneFrame((s) => {
    const pos = clamp(s.pos, 0, ERA_COUNT - 1);
    const a = Math.min(ERA_COUNT - 1, Math.floor(pos));
    const b = Math.min(ERA_COUNT - 1, a + 1);
    const f = smoothstep(pos - a);
    const modernity = pos / Math.max(1, ERA_COUNT - 1);

    const poseA = ERAS[a].pose;
    const poseB = ERAS[b].pose;
    const breath = s.reduced ? 0 : Math.sin(s.time * 1.15) * 1.1;

    const fig = buildFigure({
      posture: lerp(poseA.posture, poseB.posture, f),
      stance: lerp(poseA.stance, poseB.stance, f),
      tilt: lerpAngle(poseA.tilt, poseB.tilt, f),
      breath,
      hands: blendHands(TOOL_RIG[ERAS[a].id].hands, TOOL_RIG[ERAS[b].id].hands, f),
    });

    const root = el.root.current;
    if (root) {
      root.style.setProperty('--op-skin', mixHex('#B97852', '#A96D4C', modernity));
      root.style.setProperty('--op-skin-hi', mixHex('#D89A6D', '#C98B68', modernity));
      root.style.setProperty('--op-hair', mixHex('#2B211C', '#25262A', modernity));
      root.style.setProperty('--op-shirt', mixHex('#D8C8A8', '#DDE7EC', modernity));
      root.style.setProperty('--op-cloth', mixHex('#5A4534', '#182637', modernity));
      root.style.setProperty('--op-trouser', mixHex('#493B32', '#111923', modernity));
      root.style.setProperty('--op-leather', mixHex('#402C21', '#20262E', modernity));
    }

    /* skeleton ------------------------------------------------------------ */
    el.spine.current?.setAttribute('d', fig.spine);
    el.spine.current?.setAttribute('stroke-width', fig.spineWidth.toFixed(1));
    el.neck.current?.setAttribute('d', fig.neckPath);
    el.armL.current?.setAttribute('d', fig.armL);
    el.armR.current?.setAttribute('d', fig.armR);
    el.legL.current?.setAttribute('d', fig.legL);
    el.legR.current?.setAttribute('d', fig.legR);

    const sx = fig.shoulder.x;
    const sy = fig.shoulder.y;
    const torso = `M${(sx - 24).toFixed(1)} ${(sy + 4).toFixed(1)}
      Q${(sx - 40).toFixed(1)} ${(sy + 68).toFixed(1)} ${(HIP.x - 29).toFixed(1)} ${(HIP.y - 3).toFixed(1)}
      L${(HIP.x + 31).toFixed(1)} ${(HIP.y - 3).toFixed(1)}
      Q${(sx + 40).toFixed(1)} ${(sy + 68).toFixed(1)} ${(sx + 24).toFixed(1)} ${(sy + 4).toFixed(1)} Z`;
    el.torso.current?.setAttribute('d', torso);
    el.jacket.current?.setAttribute('d', torso);
    el.jacketZip.current?.setAttribute('d', `M${sx.toFixed(1)} ${(sy + 20).toFixed(1)} L${HIP.x.toFixed(1)} ${(HIP.y - 10).toFixed(1)}`);

    const tieFade = clamp(1 - (pos - 3.2) / 2.2);
    if (el.tie.current) {
      el.tie.current.style.opacity = (0.72 * tieFade).toFixed(3);
      el.tie.current.setAttribute('transform', `translate(${sx.toFixed(1)} ${(sy + 20).toFixed(1)})`);
    }

    const badgeOn = clamp((pos - 5.5) / 1.5);
    if (el.lanyard.current) {
      el.lanyard.current.style.opacity = badgeOn.toFixed(3);
      el.lanyard.current.setAttribute('d', `M${(sx - 7).toFixed(1)} ${(sy + 14).toFixed(1)} L${(sx - 2).toFixed(1)} ${(sy + 72).toFixed(1)} L${(sx + 10).toFixed(1)} ${(sy + 18).toFixed(1)}`);
    }
    if (el.badge.current) {
      el.badge.current.style.opacity = badgeOn.toFixed(3);
      el.badge.current.setAttribute('x', (sx - 13).toFixed(1));
      el.badge.current.setAttribute('y', (sy + 66).toFixed(1));
    }

    el.handL.current?.setAttribute('cx', fig.hands.l.x.toFixed(1));
    el.handL.current?.setAttribute('cy', fig.hands.l.y.toFixed(1));
    el.handR.current?.setAttribute('cx', fig.hands.r.x.toFixed(1));
    el.handR.current?.setAttribute('cy', fig.hands.r.y.toFixed(1));

    /* face ---------------------------------------------------------------- */
    const h = fig.head;
    el.head.current?.setAttribute('transform', `translate(${h.x.toFixed(1)} ${h.y.toFixed(1)}) rotate(${h.tilt.toFixed(2)})`);

    const maturity = clamp((pos - 4) / 7);
    if (el.hairGrey.current) el.hairGrey.current.style.opacity = (maturity * 0.36).toFixed(3);
    if (el.wrinkles.current) el.wrinkles.current.style.opacity = (maturity * 0.46).toFixed(3);

    const smile = clamp((pos - 2) / 9);
    el.mouth.current?.setAttribute('d', `M-7 10 Q1 ${(10 + smile * 6).toFixed(1)} 9 7`);
    const focus = 2.3 - smile * 2;
    el.browL.current?.setAttribute('d', `M-11 -8 Q-7 ${(-11 + focus).toFixed(1)} -2 -8`);
    el.browR.current?.setAttribute('d', `M4 -8 Q9 ${(-10 + focus * 0.6).toFixed(1)} 13 -7`);

    const hs = el.headset.current;
    if (hs) {
      const on = clamp((pos - (HEADSET_FROM - 0.35)) / 0.8);
      const lateFade = 1 - clamp((pos - 9.5) / 1.5) * 0.45;
      hs.style.opacity = (on * lateFade).toFixed(3);
    }

    const sh = el.shadow.current;
    if (sh) {
      sh.setAttribute('cx', fig.shadow.cx.toFixed(1));
      sh.setAttribute('rx', fig.shadow.rx.toFixed(1));
      sh.style.opacity = fig.shadow.o.toFixed(3);
    }

    if (el.aura.current) {
      const pulse = s.reduced ? 0 : (Math.sin(s.time * 0.8) + 1) / 2;
      el.aura.current.setAttribute('rx', (102 + modernity * 24 + pulse * 5).toFixed(1));
      el.aura.current.setAttribute('ry', (154 + modernity * 20 + pulse * 4).toFixed(1));
      el.aura.current.style.opacity = (0.05 + modernity * 0.14).toFixed(3);
    }

    const tiltAll = s.reduced ? 0 : clamp(s.velocity * 2.2, -4.5, 4.5);
    root?.setAttribute('transform', `rotate(${tiltAll.toFixed(2)} 224 ${STAGE.ground})`);

    /* tools --------------------------------------------------------------- */
    const toolAnchor = `translate(${fig.shoulder.x.toFixed(1)} ${fig.shoulder.y.toFixed(1)})`;
    for (let i = 0; i < ERA_COUNT; i++) {
      const g = el.tools.current[i];
      if (!g) continue;
      const o = i === a ? 1 - f : i === b ? f : 0;
      if (o <= 0.001) {
        if (g.style.display !== 'none') g.style.display = 'none';
        continue;
      }
      if (g.style.display === 'none') g.style.display = '';
      g.style.opacity = o.toFixed(3);
      g.setAttribute('transform', toolAnchor);
    }

    /* knowledge memory ---------------------------------------------------- */
    const spin = s.reduced ? 0 : s.time * 0.105;
    for (let i = 0; i < ERA_COUNT; i++) {
      const pair = el.glyphs.current[i];
      if (!pair || !pair[0] || !pair[1]) continue;
      const [back, front] = pair;
      const unlocked = clamp((pos - (i - 0.45)) / 0.5);
      const ang = -Math.PI / 2 + (i / ERA_COUNT) * TAU + spin + pos * 0.075;
      const x = RING.cx + Math.cos(ang) * RING.rx;
      const y = RING.cy + Math.sin(ang) * RING.ry;
      const depth = (Math.sin(ang) + 1) / 2;
      const scale = lerp(0.58, 1.02, depth);
      const t = `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(3)})`;
      const isFront = Math.sin(ang) > 0;

      front.setAttribute('transform', t);
      back.setAttribute('transform', t);
      front.style.opacity = (isFront ? unlocked * lerp(0.38, 0.92, depth) : 0).toFixed(3);
      back.style.opacity = (isFront ? 0 : unlocked * lerp(0.22, 0.52, depth)).toFixed(3);
    }
  });

  const glyph = (era, i, layer) => (
    <g
      key={`${layer}-${era.id}`}
      ref={(n) => {
        if (!n) return;
        el.glyphs.current[i] = el.glyphs.current[i] || [];
        el.glyphs.current[i][layer === 'back' ? 0 : 1] = n;
      }}
      className={`glyph glyph-${layer}`}
      style={{ opacity: 0 }}
    >
      <circle r={16} />
      <text y={3.8}>{era.learned.key}</text>
    </g>
  );

  return (
    <svg
      className="operator"
      viewBox={`0 0 ${STAGE.w} ${STAGE.h}`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="operatorSoftGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <linearGradient id="operatorJacketShade" x1="0" x2="1">
          <stop offset="0" stopColor="var(--op-cloth)" />
          <stop offset=".58" stopColor="var(--op-cloth)" />
          <stop offset="1" stopColor="var(--op-trouser)" />
        </linearGradient>
      </defs>

      <ellipse ref={el.aura} className="op-aura" cx={224} cy={330} rx={102} ry={154} filter="url(#operatorSoftGlow)" />
      <ellipse ref={el.shadow} className="op-shadow" cx={224} cy={STAGE.ground + 7} rx={70} ry={9} />
      <line className="op-ground" x1={0} y1={STAGE.ground} x2={STAGE.w} y2={STAGE.ground} />

      <g className="ring-layer">{ERAS.map((e, i) => glyph(e, i, 'back'))}</g>

      <g ref={el.root} className="op-body">
        <path ref={el.legL} className="op-limb op-leg op-far" />
        <path ref={el.legR} className="op-limb op-leg" />
        <path ref={el.spine} className="op-spine" />
        <path ref={el.torso} className="op-torso" />
        <path ref={el.jacket} className="op-jacket" />
        <path ref={el.jacketZip} className="op-jacket-zip" />
        <path ref={el.neck} className="op-neck" />

        <path ref={el.armL} className="op-limb op-arm op-far" />
        <path ref={el.armR} className="op-limb op-arm" />
        <circle ref={el.handL} r={7.4} className="op-hand op-far" />
        <circle ref={el.handR} r={7.8} className="op-hand" />

        <path ref={el.lanyard} className="op-lanyard" />
        <rect ref={el.badge} width={18} height={24} rx={2} className="op-badge" />

        <g ref={el.tie} className="op-tie">
          <path d="M-5 0 L5 0 L3 9 L0 12 L-3 9 Z" />
          <path d="M0 11 L6 48 L0 58 L-6 48 Z" />
        </g>

        <g ref={el.head} className="op-head">
          <circle cx={-18} cy={1} r={5.5} className="op-ear" />
          <ellipse rx={21.5} ry={25.5} className="op-face-skin" />
          <path d="M-21 -4 Q-22 -26 -3 -28 Q14 -29 20 -13 Q8 -18 2 -15 Q-8 -20 -21 -4Z" className="op-hair" />
          <path ref={el.hairGrey} d="M-17 -13 Q-10 -24 -1 -24 M4 -23 Q12 -22 17 -14" className="op-hair-grey" />
          <path d="M17 -4 q7 6 1 12" className="op-nose" />
          <path ref={el.browL} className="op-brow" />
          <path ref={el.browR} className="op-brow" />
          <circle cx={-6.5} cy={-3} r={2} className="op-eye" />
          <circle cx={9} cy={-2.5} r={2} className="op-eye" />
          <g className="op-glasses">
            <rect x={-15.5} y={-8.5} width={14} height={11} rx={4} />
            <rect x={2} y={-8} width={14} height={11} rx={4} />
            <line x1={-1.5} y1={-3.5} x2={2} y2={-3.5} />
            <line x1={16} y1={-4} x2={21} y2={-6} />
          </g>
          <path ref={el.mouth} className="op-mouth" />
          <g ref={el.wrinkles} className="op-wrinkles">
            <path d="M-13 5 q4 2 7 1 M9 5 q4 1 6 0" />
            <path d="M-7 -15 q7 -2 14 0" />
          </g>
          <g ref={el.headset} className="op-headset" style={{ opacity: 0 }}>
            <path d="M-23 -5 A24 24 0 0 1 23 -5" />
            <rect x={-28} y={-6} width={8} height={16} rx={3} />
            <rect x={20} y={-6} width={8} height={16} rx={3} />
            <path d="M24 8 q9 4 7 12 h-8" />
          </g>
        </g>
      </g>

      <g className="tool-layer">
        {ERAS.map((era, i) => {
          const Tool = TOOLS[era.id];
          return (
            <g
              key={era.id}
              ref={(n) => { el.tools.current[i] = n; }}
              className={`tool tool-${era.id}`}
              style={{ display: 'none' }}
            >
              <Tool />
            </g>
          );
        })}
      </g>

      <g className="ring-layer ring-front">{ERAS.map((e, i) => glyph(e, i, 'front'))}</g>
    </svg>
  );
}
