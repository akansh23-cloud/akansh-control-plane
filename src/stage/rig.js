import { clamp, lerp } from '../scene/math.js';

/**
 * The Operator's skeleton, as pure maths.
 *
 * Kept free of React so the same function drives the live component and the
 * offline preview renderer in tools/preview-rig.mjs. Every value below is a
 * function of `posture` (0 = hunched over a card tray, 1 = standing at a
 * console), which is what lets the figure morph continuously across the
 * journey instead of cutting between twelve drawings.
 */

export const STAGE = { w: 460, h: 620, ground: 552 };

const HIP = { x: 224, y: 380 };
const UPPER_ARM = 50;
const FOREARM = 47;
const THIGH = 88;
const SHIN = 86;

/** Two-bone IK. Returns the joint position that puts the end effector on target. */
export function solveLimb(sx, sy, tx, ty, a, b, flip) {
  let dx = tx - sx;
  let dy = ty - sy;
  let d = Math.hypot(dx, dy);
  const min = Math.abs(a - b) + 0.01;
  const max = a + b - 0.01;

  if (d > max) { const s = max / d; dx *= s; dy *= s; d = max; }
  else if (d < min) { const s = min / (d || 0.0001); dx *= s; dy *= s; d = min; }

  const base = Math.atan2(dy, dx);
  const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const ang = Math.acos(cosA);
  const th = base + flip * ang;

  return {
    jx: sx + Math.cos(th) * a,
    jy: sy + Math.sin(th) * a,
    ex: sx + dx,
    ey: sy + dy,
  };
}

const path3 = (ax, ay, bx, by, cx, cy) =>
  `M${ax.toFixed(1)} ${ay.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)} L${cx.toFixed(1)} ${cy.toFixed(1)}`;

/**
 * @param {object} p
 * @param {number} p.posture 0..1 hunched → upright
 * @param {number} p.stance  0..1 feet together → planted apart
 * @param {number} p.tilt    head tilt in degrees
 * @param {number} p.breath  ambient −1..1
 * @param {{l:[number,number], r:[number,number]}} p.hands shoulder-relative IK targets
 */
export function buildFigure({ posture = 0, stance = 0.2, tilt = 0, breath = 0, hands }) {
  const p = clamp(posture);

  // Spine: the whole story is in this curve straightening out.
  const lean = lerp(50, 0, p);
  const shoulderY = lerp(280, 202, p) + breath * 1.8;
  const shoulderX = HIP.x + lean;
  const ctrlX = HIP.x + lean * 0.2 + lerp(26, 2, p);
  const ctrlY = lerp(346, 292, p);

  const spine = `M${HIP.x} ${HIP.y} Q${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${shoulderX.toFixed(1)} ${shoulderY.toFixed(1)}`;

  const neck = { x: shoulderX + lerp(11, 0, p), y: shoulderY - lerp(10, 16, p) };
  const head = {
    x: neck.x + lerp(22, 1, p),
    y: neck.y - lerp(20, 30, p),
    r: 23,
    tilt: tilt + lerp(14, 0, p),
  };

  // Arms reach for the tool. Elbows bend away from the body on each side.
  const shL = { x: shoulderX - lerp(17, 15, p), y: shoulderY + 7 };
  const shR = { x: shoulderX + lerp(13, 15, p), y: shoulderY + 7 };
  const handL = { x: shoulderX + hands.l[0], y: shoulderY + hands.l[1] };
  const handR = { x: shoulderX + hands.r[0], y: shoulderY + hands.r[1] };

  const armL = solveLimb(shL.x, shL.y, handL.x, handL.y, UPPER_ARM, FOREARM, 1);
  const armR = solveLimb(shR.x, shR.y, handR.x, handR.y, UPPER_ARM, FOREARM, 1);

  // Legs plant on the ground line; knees track forward as the stance widens.
  const spread = lerp(12, 30, clamp(stance));
  const footL = { x: HIP.x - spread - 10, y: STAGE.ground };
  const footR = { x: HIP.x + spread + 14, y: STAGE.ground };
  const hipL = { x: HIP.x - 11, y: HIP.y + 4 };
  const hipR = { x: HIP.x + 11, y: HIP.y + 4 };

  const legL = solveLimb(hipL.x, hipL.y, footL.x, footL.y, THIGH, SHIN, -1);
  const legR = solveLimb(hipR.x, hipR.y, footR.x, footR.y, THIGH, SHIN, -1);

  const neckPath = `M${neck.x.toFixed(1)} ${(neck.y + 8).toFixed(1)} L${head.x.toFixed(1)} ${(head.y + head.r * 0.55).toFixed(1)}`;

  return {
    p,
    spine,
    neckPath,
    spineWidth: lerp(31, 25, p),
    shoulder: { x: shoulderX, y: shoulderY },
    neck,
    head,
    hands: { l: handL, r: handR },
    armL: path3(shL.x, shL.y, armL.jx, armL.jy, armL.ex, armL.ey),
    armR: path3(shR.x, shR.y, armR.jx, armR.jy, armR.ex, armR.ey),
    legL: path3(hipL.x, hipL.y, legL.jx, legL.jy, legL.ex, legL.ey),
    legR: path3(hipR.x, hipR.y, legR.jx, legR.jy, legR.ex, legR.ey),
    feet: [footL, footR],
    /** Shadow narrows as the figure stands up and the light source rises. */
    shadow: { cx: HIP.x + lerp(10, 0, p), rx: lerp(74, 52, p), o: lerp(0.34, 0.16, p) },
  };
}

/** Blend two shoulder-relative hand configs. */
export function blendHands(a, b, t) {
  return {
    l: [lerp(a.l[0], b.l[0], t), lerp(a.l[1], b.l[1], t)],
    r: [lerp(a.r[0], b.r[0], t), lerp(a.r[1], b.r[1], t)],
  };
}
