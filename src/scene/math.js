export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => (b === a ? 0 : clamp((v - a) / (b - a)));
export const smoothstep = (t) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
export const easeInOut = (t) => {
  const x = clamp(t);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
};

/** Shortest-distance angle interpolation, degrees. */
export const lerpAngle = (a, b, t) => {
  let d = ((b - a + 540) % 360) - 180;
  return a + d * t;
};

/* ---------------------------------------------------------------- colour */

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

const hexCache = new Map();

export function parseHex(hex) {
  if (hexCache.has(hex)) return hexCache.get(hex);
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const int = parseInt(h, 16);
  const rgb = [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
  const out = { rgb, lin: rgb.map(srgbToLinear) };
  hexCache.set(hex, out);
  return out;
}

/**
 * Mix two hex colours through linear light. sRGB mixing muddies the midpoint
 * badly when the journey crosses from a cream page to a dark machine room.
 */
export function mixHex(a, b, t) {
  const A = parseHex(a).lin;
  const B = parseHex(b).lin;
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    out[i] = Math.round(clamp(linearToSrgb(lerp(A[i], B[i], t))) * 255);
  }
  return `rgb(${out[0]} ${out[1]} ${out[2]})`;
}

function parseCssColor(value) {
  if (value.startsWith('#')) return parseHex(value);
  const m = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (!m) return parseHex('#000000');
  const rgb = [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255].map((v) => clamp(v));
  return { rgb, lin: rgb.map(srgbToLinear) };
}

const luminance = (lin) => 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];

export function contrastRatio(a, b) {
  const la = luminance(parseCssColor(a).lin);
  const lb = luminance(parseCssColor(b).lin);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Keep a desired foreground colour, but pull it toward black or white only as
 * far as needed to maintain readable contrast against the current background.
 * This prevents the light↔dark palette transitions from crossing through a
 * low-contrast grey-on-grey midpoint.
 */
export function ensureContrast(bg, desired, target = 4.5) {
  if (contrastRatio(bg, desired) >= target) return desired;

  const base = parseCssColor(desired).lin;
  const black = [0, 0, 0];
  const white = [1, 1, 1];
  const bgLum = luminance(parseCssColor(bg).lin);
  const pole = ((1.05 / (bgLum + 0.05)) >= ((bgLum + 0.05) / 0.05)) ? white : black;

  let lo = 0;
  let hi = 1;
  let best = pole;
  for (let i = 0; i < 18; i++) {
    const t = (lo + hi) / 2;
    const lin = base.map((v, j) => lerp(v, pole[j], t));
    const rgb = lin.map((v) => Math.round(clamp(linearToSrgb(v)) * 255));
    const css = `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
    if (contrastRatio(bg, css) >= target) {
      best = lin;
      hi = t;
    } else {
      lo = t;
    }
  }

  const rgb = best.map((v) => Math.round(clamp(linearToSrgb(v)) * 255));
  return `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
}

/** Mix an `rgba(r,g,b,a)` / hex pair by falling back to plain alpha crossfade. */
export function mixRgba(a, b, t) {
  const pa = readRgba(a);
  const pb = readRgba(b);
  const r = Math.round(lerp(pa[0], pb[0], t));
  const g = Math.round(lerp(pa[1], pb[1], t));
  const bl = Math.round(lerp(pa[2], pb[2], t));
  const al = lerp(pa[3], pb[3], t);
  return `rgba(${r},${g},${bl},${al.toFixed(3)})`;
}

function readRgba(v) {
  if (v.startsWith('#')) {
    const { rgb } = parseHex(v);
    return [rgb[0] * 255, rgb[1] * 255, rgb[2] * 255, 1];
  }
  const m = v.match(/rgba?\(([^)]+)\)/);
  if (!m) return [0, 0, 0, 1];
  const parts = m[1].split(',').map((x) => parseFloat(x));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0, parts.length > 3 ? parts[3] : 1];
}

/* ------------------------------------------------------------- formatting */

/** Human duration from a count of hours: "90 d", "8 h", "24 m". */
export function formatDuration(hours) {
  if (hours >= 48) return `${Math.round(hours / 24)} d`;
  if (hours >= 1) return `${hours < 10 ? hours.toFixed(hours < 3 ? 1 : 0) : Math.round(hours)} h`;
  return `${Math.max(1, Math.round(hours * 60))} m`;
}

export function formatMinutes(minutes) {
  if (minutes >= 2880) return `${Math.round(minutes / 1440)} d`;
  if (minutes >= 120) return `${Math.round(minutes / 60)} h`;
  return `${Math.max(1, Math.round(minutes))} m`;
}

/** Deploy cadence, expressed the way a team would actually say it. */
export function formatCadence(perYear) {
  if (perYear >= 36500) return 'on demand';
  if (perYear >= 730) return `${Math.round(perYear / 365)}/day`;
  if (perYear >= 104) return `${Math.round(perYear / 52)}/week`;
  if (perYear >= 24) return `${Math.round(perYear / 12)}/month`;
  return `${Math.round(perYear)}/year`;
}

/** Interpolate on a log scale so orders of magnitude read evenly. */
export const lerpLog = (a, b, t) => Math.exp(lerp(Math.log(a), Math.log(b), t));
