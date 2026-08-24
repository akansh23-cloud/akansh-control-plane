import { clamp, lerp } from './math';

/**
 * One scroll listener, one animation frame loop, one source of truth.
 *
 * Position is expressed in *era space*: a float where 3.4 means "40% of the way
 * through station 04". Everything downstream — the character rig, the palette,
 * the metrics — is a pure function of that number, which is what makes the
 * journey scrubbable and reversible for free.
 *
 * Nothing here touches React state. Subscribers mutate DOM directly, so a full
 * scroll of the page costs zero re-renders.
 */

const listeners = new Set();

const state = {
  /** Raw target position in era space, straight from scrollY. */
  target: 0,
  /** Smoothed position. This is what everything reads. */
  pos: 0,
  /** Scroll velocity in era units per second, smoothed. */
  velocity: 0,
  /** 0 before the journey, 1 at the end of the last station. */
  progress: 0,
  /** Seconds since start, for ambient motion. */
  time: 0,
  /** How far the opening title card has been scrolled away, 0..1. */
  intro: 0,
  /** How far into the closing dossier we are, 0..1. */
  outro: 0,
  reduced: false,
};

/**
 * `tops[i]` is the scroll position at which station i is considered centred.
 * Measured rather than assumed, so a station that wraps taller on a narrow
 * screen still maps to exactly one unit of era space.
 */
let layout = { tops: [0, 1], count: 2, outroStart: 0, outroHeight: 1 };
let running = false;
let raf = 0;
let last = 0;
let motionQuery = null;
let motionListener = null;

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  if (!running) start();
  return () => {
    listeners.delete(fn);
    if (!listeners.size) stop();
  };
}

/**
 * Measured once per resize by the journey component. Using measured offsets
 * rather than assuming uniform section heights keeps the mapping correct when
 * a station wraps to a taller box on a narrow screen.
 */
export function setLayout(next) {
  layout = { ...layout, ...next };
  readScroll();
}

function readScroll() {
  const y = window.scrollY || window.pageYOffset || 0;
  const { tops, count, outroStart, outroHeight } = layout;
  const last = count - 1;

  let pos;
  if (y <= tops[0]) {
    pos = 0;
  } else if (y >= tops[last]) {
    pos = last;
  } else {
    // Linear scan: twelve entries, cheaper than the branch cost of a search.
    let i = 0;
    while (i < last && y >= tops[i + 1]) i++;
    const span = Math.max(1, tops[i + 1] - tops[i]);
    pos = i + (y - tops[i]) / span;
  }

  state.target = clamp(pos, 0, last);
  state.progress = clamp(pos / Math.max(1, last), 0, 1);
  state.intro = clamp(y / Math.max(1, tops[0] || window.innerHeight), 0, 1);
  state.outro = clamp((y - outroStart) / Math.max(1, outroHeight), 0, 1);
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  state.time += dt;

  const prev = state.pos;

  if (state.reduced) {
    state.pos = state.target;
    state.velocity = 0;
  } else {
    // Critically damped follow. Frame-rate independent, no overshoot, and it
    // gives the character a little weight without ever lagging far behind.
    const k = 1 - Math.exp(-dt * 9.5);
    state.pos = lerp(state.pos, state.target, k);
    const v = (state.pos - prev) / Math.max(dt, 0.0001);
    state.velocity = lerp(state.velocity, v, 1 - Math.exp(-dt * 6));
  }

  for (const fn of listeners) fn(state, dt);

  // Reduced-motion users do not need an idle animation loop. Wake the scene
  // again on scroll/resize or when the preference changes.
  if (state.reduced && Math.abs(state.pos - state.target) < 0.0001) {
    raf = 0;
    return;
  }
  raf = requestAnimationFrame(frame);
}

function wake() {
  if (running && !raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}

function onScroll() {
  readScroll();
  wake();
}

function start() {
  if (running) return;
  running = true;

  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  state.reduced = motionQuery.matches;
  motionListener = (e) => {
    state.reduced = e.matches;
    readScroll();
    wake();
  };
  motionQuery.addEventListener ? motionQuery.addEventListener('change', motionListener) : motionQuery.addListener(motionListener);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  readScroll();
  state.pos = state.target;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

function stop() {
  running = false;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onScroll);
  if (motionQuery && motionListener) {
    motionQuery.removeEventListener ? motionQuery.removeEventListener('change', motionListener) : motionQuery.removeListener(motionListener);
  }
  motionQuery = null;
  motionListener = null;
}
