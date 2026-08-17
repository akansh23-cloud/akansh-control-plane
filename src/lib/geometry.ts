/**
 * Drawing geometry. Pure functions only — every plate renders from these,
 * so the drawings stay consistent with each other.
 */

/**
 * A body of water with a moving surface.
 * `t` is seconds; pass a constant to freeze the surface (reduced motion).
 */
export function waterPath(
  x: number,
  width: number,
  surfaceY: number,
  bottomY: number,
  t: number,
  amp = 2.2,
  wavelength = 120,
  phase = 0,
): string {
  if (bottomY - surfaceY <= 0.4) return '';

  const samples = Math.max(8, Math.min(48, Math.round(width / 14)));
  const points: string[] = [];

  for (let i = 0; i <= samples; i += 1) {
    const px = x + (width * i) / samples;
    const k = (px / wavelength) * Math.PI * 2;
    const y =
      surfaceY +
      Math.sin(k + t * 1.05 + phase) * amp +
      Math.sin(k * 0.47 - t * 0.62 + phase) * amp * 0.45;
    points.push(`${px.toFixed(2)},${y.toFixed(2)}`);
  }

  return `M ${points.join(' L ')} L ${(x + width).toFixed(2)},${bottomY.toFixed(
    2,
  )} L ${x.toFixed(2)},${bottomY.toFixed(2)} Z`;
}

/** The bright line where water meets air. Drawn separately, one stroke. */
export function surfaceLine(
  x: number,
  width: number,
  surfaceY: number,
  t: number,
  amp = 2.2,
  wavelength = 120,
  phase = 0,
): string {
  const samples = Math.max(8, Math.min(48, Math.round(width / 14)));
  const points: string[] = [];

  for (let i = 0; i <= samples; i += 1) {
    const px = x + (width * i) / samples;
    const k = (px / wavelength) * Math.PI * 2;
    const y =
      surfaceY +
      Math.sin(k + t * 1.05 + phase) * amp +
      Math.sin(k * 0.47 - t * 0.62 + phase) * amp * 0.45;
    points.push(`${px.toFixed(2)},${y.toFixed(2)}`);
  }

  return `M ${points.join(' L ')}`;
}

/** A straight connector with a solid arrowhead, used for every relationship. */
export function arrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  head = 7,
): { line: string; head: string } {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const backX = x2 - Math.cos(angle) * head;
  const backY = y2 - Math.sin(angle) * head;
  const spread = head * 0.55;
  const ax = backX + Math.cos(angle + Math.PI / 2) * spread;
  const ay = backY + Math.sin(angle + Math.PI / 2) * spread;
  const bx = backX + Math.cos(angle - Math.PI / 2) * spread;
  const by = backY + Math.sin(angle - Math.PI / 2) * spread;

  return {
    line: `M ${x1.toFixed(2)},${y1.toFixed(2)} L ${backX.toFixed(2)},${backY.toFixed(2)}`,
    head: `M ${x2.toFixed(2)},${y2.toFixed(2)} L ${ax.toFixed(2)},${ay.toFixed(
      2,
    )} L ${bx.toFixed(2)},${by.toFixed(2)} Z`,
  };
}

/** An elbow connector that turns once, for stacked layouts. */
export function elbow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bias = 0.5,
): string {
  const midX = x1 + (x2 - x1) * bias;
  return `M ${x1},${y1} L ${midX},${y1} L ${midX},${y2} L ${x2},${y2}`;
}

/** A surveyor's dimension line with end ticks. Used for the scale facts. */
export function dimension(
  x1: number,
  y: number,
  x2: number,
  tick = 6,
): string {
  return [
    `M ${x1},${y - tick} L ${x1},${y + tick}`,
    `M ${x1},${y} L ${x2},${y}`,
    `M ${x2},${y - tick} L ${x2},${y + tick}`,
  ].join(' ');
}

/** Position along a straight path, for objects travelling a channel. */
export function pointOn(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
): { x: number; y: number } {
  return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
}

/** Even distribution of n items across a span, centred. */
export function spread(
  start: number,
  end: number,
  count: number,
): number[] {
  if (count <= 1) return [(start + end) / 2];
  const gap = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => start + gap * i);
}

/** Rounded-corner rectangle path with independent corner control. */
export function plate(
  x: number,
  y: number,
  w: number,
  h: number,
  r = 2,
): string {
  const rad = Math.min(r, w / 2, h / 2);
  return [
    `M ${x + rad},${y}`,
    `H ${x + w - rad}`,
    `A ${rad},${rad} 0 0 1 ${x + w},${y + rad}`,
    `V ${y + h - rad}`,
    `A ${rad},${rad} 0 0 1 ${x + w - rad},${y + h}`,
    `H ${x + rad}`,
    `A ${rad},${rad} 0 0 1 ${x},${y + h - rad}`,
    `V ${y + rad}`,
    `A ${rad},${rad} 0 0 1 ${x + rad},${y}`,
    'Z',
  ].join(' ');
}

/* ------------------------------------------------------------------ */
/* Surfaces — sampled per frame, so they are written to be cheap        */
/* ------------------------------------------------------------------ */

/**
 * A water surface with an explicit sample count.
 *
 * The older helpers derived their resolution from the width, which meant a
 * wide chamber paid for detail nobody could see. Sample count is now chosen
 * by the caller from the device tier, and every call reuses one array.
 */
const scratch: number[] = [];

function sampleSurface(
  x: number,
  width: number,
  surfaceY: number,
  t: number,
  amp: number,
  wavelength: number,
  samples: number,
  phase: number,
  pointer?: number,
  pointerAmp = 0,
): number {
  const n = Math.max(4, Math.min(64, Math.round(samples)));
  scratch.length = 0;

  for (let i = 0; i <= n; i += 1) {
    const f = i / n;
    const px = x + width * f;
    const k = (px / wavelength) * Math.PI * 2;
    let y =
      surfaceY +
      Math.sin(k + t * 1.05 + phase) * amp +
      Math.sin(k * 0.47 - t * 0.62 + phase) * amp * 0.45;

    /* A hand passing over the chamber displaces the surface under it and
       nowhere else. Gaussian falloff, a few pixels deep. */
    if (pointerAmp !== 0 && pointer !== undefined) {
      const d = (f - pointer) / 0.16;
      y -= Math.exp(-d * d) * pointerAmp;
    }

    scratch.push(px, y);
  }

  return n;
}

function toPath(n: number, close: boolean, x: number, width: number, bottomY: number) {
  let d = 'M ';
  for (let i = 0; i <= n; i += 1) {
    d += `${scratch[i * 2].toFixed(1)},${scratch[i * 2 + 1].toFixed(1)}`;
    if (i < n) d += ' L ';
  }
  if (close) {
    d += ` L ${(x + width).toFixed(1)},${bottomY.toFixed(1)} L ${x.toFixed(1)},${bottomY.toFixed(1)} Z`;
  }
  return d;
}

/** A filled body of water with a moving surface. */
export function waterBody(
  x: number,
  width: number,
  surfaceY: number,
  bottomY: number,
  t: number,
  amp = 2.2,
  wavelength = 120,
  samples = 24,
  phase = 0,
): string {
  if (bottomY - surfaceY <= 0.4) return '';
  const n = sampleSurface(x, width, surfaceY, t, amp, wavelength, samples, phase);
  return toPath(n, true, x, width, bottomY);
}

export type SurfaceOptions = {
  x: number;
  width: number;
  surfaceY: number;
  bottomY: number;
  t: number;
  amp?: number;
  wavelength?: number;
  samples?: number;
  phase?: number;
  /** Normalised 0…1 pointer position across the width. */
  pointer?: number;
  /** Depth of the pointer displacement, in user units. */
  pointerAmp?: number;
  /** Close the path into a filled body, or leave it as a single stroke. */
  close?: boolean;
};

/** A surface that also notices a pointer moving over it. */
export function disturbedSurface(o: SurfaceOptions): string {
  if (o.close && o.bottomY - o.surfaceY <= 0.4) return '';
  const n = sampleSurface(
    o.x,
    o.width,
    o.surfaceY,
    o.t,
    o.amp ?? 2.2,
    o.wavelength ?? 120,
    o.samples ?? 24,
    o.phase ?? 0,
    o.pointer,
    o.pointerAmp ?? 0,
  );
  return toPath(n, o.close ?? false, o.x, o.width, o.bottomY);
}
