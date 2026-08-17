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

/* ------------------------------------------------------------------ */
/* Architecture routing                                                */
/* ------------------------------------------------------------------ */

export type Rect = { x: number; y: number; w: number; h: number };

export type RoutedEdge = {
  /** The shaft, as a rounded orthogonal path. */
  path: string;
  /** A filled triangle at the entry point, aligned to the last segment. */
  head: string;
  /**
   * Where an edge label should sit, and which way the run travels there, so
   * the caller can offset the text clear of the line rather than across it.
   */
  label: { x: number; y: number; vertical: boolean; run: number };
  /** Path length estimate, so a flow animation can be scaled to it. */
  length: number;
  /** Small dots marking the faces the edge attaches to. */
  ports: [{ x: number; y: number }, { x: number; y: number }];
};

const mid = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/**
 * Route an edge between two boxes the way an engineering drawing does:
 * leave a face at a right angle, travel in straight runs, turn through a
 * fillet, and arrive at a face — never a diagonal across the canvas.
 *
 * Both boxes are measured from the live layout, so this is a description of
 * where the browser actually put things rather than a second, hand-maintained
 * set of coordinates that can drift away from it.
 */
export function routeEdge(
  from: Rect,
  to: Rect,
  options: {
    radius?: number;
    gap?: number;
    /**
     * Force the first leg's axis. The automatic choice takes the shortest
     * corridor, which is right most of the time but sends a long edge
     * straight through whatever sits between its endpoints. An edge that
     * would cross an occupied column can be told to leave vertically and
     * travel through the empty band between rows instead.
     */
    axis?: 'auto' | 'horizontal' | 'vertical';
  } = {},
): RoutedEdge {
  const radius = options.radius ?? 12;
  const gap = options.gap ?? 0;
  const axis = options.axis ?? 'auto';

  const a = mid(from);
  const b = mid(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  /* Pick the face pair that gives the shortest sensible run. Boxes that
     overlap on one axis are joined along the other, which is what stops an
     edge from cutting back across its own source. */
  const horizontal =
    axis === 'horizontal'
      ? true
      : axis === 'vertical'
        ? false
        : Math.abs(dx) >= Math.abs(dy);

  let start: { x: number; y: number };
  let end: { x: number; y: number };
  let points: { x: number; y: number }[];

  if (horizontal) {
    const right = dx >= 0;
    start = { x: right ? from.x + from.w + gap : from.x - gap, y: a.y };
    end = { x: right ? to.x - gap : to.x + to.w + gap, y: b.y };
    const seam = (start.x + end.x) / 2;
    points = [
      start,
      { x: seam, y: start.y },
      { x: seam, y: end.y },
      end,
    ];
  } else {
    const down = dy >= 0;
    start = { x: a.x, y: down ? from.y + from.h + gap : from.y - gap };
    end = { x: b.x, y: down ? to.y - gap : to.y + to.h + gap };
    const seam = (start.y + end.y) / 2;
    points = [
      start,
      { x: start.x, y: seam },
      { x: end.x, y: seam },
      end,
    ];
  }

  return {
    path: roundedPolyline(points, radius),
    head: headAt(points[points.length - 2], end, 9),
    label: labelPoint(points),
    length: polylineLength(points),
    ports: [start, end],
  };
}

/** A polyline with its corners turned through quadratic fillets. */
export function roundedPolyline(
  points: { x: number; y: number }[],
  radius = 12,
): string {
  if (points.length < 2) return '';
  const f = (n: number) => Math.round(n * 10) / 10;
  let d = `M ${f(points[0].x)},${f(points[0].y)}`;

  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];

    const inLen = Math.hypot(corner.x - prev.x, corner.y - prev.y);
    const outLen = Math.hypot(next.x - corner.x, next.y - corner.y);
    /* Never round more than half of the shorter run, or adjacent fillets
       would overlap and the path would fold back on itself. */
    const r = Math.min(radius, inLen / 2, outLen / 2);

    if (r < 0.5) {
      d += ` L ${f(corner.x)},${f(corner.y)}`;
      continue;
    }

    const t1 = {
      x: corner.x - ((corner.x - prev.x) / inLen) * r,
      y: corner.y - ((corner.y - prev.y) / inLen) * r,
    };
    const t2 = {
      x: corner.x + ((next.x - corner.x) / outLen) * r,
      y: corner.y + ((next.y - corner.y) / outLen) * r,
    };

    d += ` L ${f(t1.x)},${f(t1.y)} Q ${f(corner.x)},${f(corner.y)} ${f(t2.x)},${f(t2.y)}`;
  }

  const last = points[points.length - 1];
  return `${d} L ${f(last.x)},${f(last.y)}`;
}

function headAt(
  from: { x: number; y: number },
  at: { x: number; y: number },
  size: number,
): string {
  const ang = Math.atan2(at.y - from.y, at.x - from.x);
  const f = (n: number) => Math.round(n * 10) / 10;
  const p = (a: number, r: number) => ({
    x: at.x + Math.cos(a) * r,
    y: at.y + Math.sin(a) * r,
  });
  const l = p(ang + Math.PI * 0.82, size);
  const r = p(ang - Math.PI * 0.82, size);
  return `M ${f(at.x)},${f(at.y)} L ${f(l.x)},${f(l.y)} L ${f(r.x)},${f(r.y)} Z`;
}

function polylineLength(points: { x: number; y: number }[]): number {
  let n = 0;
  for (let i = 1; i < points.length; i += 1) {
    n += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return n;
}

/** The midpoint of the longest run, which is where a label reads best. */
function labelPoint(points: { x: number; y: number }[]) {
  let best = 0;
  let at = { x: points[0].x, y: points[0].y, vertical: false, run: 0 };
  for (let i = 1; i < points.length; i += 1) {
    const ax = points[i].x - points[i - 1].x;
    const ay = points[i].y - points[i - 1].y;
    const len = Math.hypot(ax, ay);
    if (len > best) {
      best = len;
      at = {
        x: (points[i].x + points[i - 1].x) / 2,
        y: (points[i].y + points[i - 1].y) / 2,
        vertical: Math.abs(ay) > Math.abs(ax),
        run: len,
      };
    }
  }
  return at;
}
