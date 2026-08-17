'use client';

/**
 * THE WORKS — the animation runtime.
 *
 * One requestAnimationFrame loop drives the entire document. Nothing in here
 * ever calls a React setState on a frame boundary; per-frame work is written
 * straight onto DOM nodes as CSS custom properties or SVG attributes.
 *
 * React keeps the semantic state — IDLE / RUNNING / FAILED / RECOVERING /
 * COMPLETE — and the runtime keeps the motion. The two meet at exactly two
 * points: `rig.set()` when semantics change the target, and `rig.watch()`
 * when motion crosses a threshold that semantics care about.
 *
 * The physics is a damped spring integrated with semi-implicit Euler, because
 * the difference between `hydraulic` and `mechanical` is a difference in
 * damping ratio, not a difference in easing curve. Water carries momentum and
 * settles late. A paddle gear does not.
 */

import {
  useCallback,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

/**
 * The latest value of something, readable from a callback that must not be
 * re-created. Written in an insertion effect so the ref is never mutated
 * during render — the pattern React's own lint rules ask for.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useInsertionEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

/* ------------------------------------------------------------------ */
/* Motion families — the motion bible, expressed as numbers            */
/* ------------------------------------------------------------------ */

export type MotionFamily =
  | 'hydraulic'
  | 'mechanical'
  | 'release'
  | 'failure'
  | 'recovery'
  | 'instant';

type FamilySpec = {
  /** Seconds to substantially arrive. Lower is faster. */
  tau: number;
  /** Damping ratio. <1 overshoots and settles; 1 is critical; >1 is sluggish. */
  zeta: number;
  /** Ceiling on speed, in units/second. Water cannot be yanked. */
  maxVel?: number;
};

export const FAMILIES: Record<MotionFamily, FamilySpec> = {
  /** Heavy, continuous, momentum-carrying. Settles a beat late. */
  hydraulic: { tau: 0.46, zeta: 0.72, maxVel: 2.6 },
  /** Deliberate and exact. Arrives without wobble, like a geared rack. */
  mechanical: { tau: 0.17, zeta: 1.0 },
  /** Directed and staged. Leaves quickly, arrives under control. */
  release: { tau: 0.26, zeta: 0.9, maxVel: 3.4 },
  /** Sudden resistance. Motion is arrested, not shaken. */
  failure: { tau: 0.07, zeta: 1.35 },
  /** Confident restoration. Slower than failure, and completely certain. */
  recovery: { tau: 0.58, zeta: 0.95 },
  /** No interpolation at all. Used by reduced motion. */
  instant: { tau: 0.0001, zeta: 1 },
};

/* ------------------------------------------------------------------ */
/* Channel                                                             */
/* ------------------------------------------------------------------ */

export type ChannelSpec = {
  value?: number;
  family?: MotionFamily;
  /** Override the family's arrival time for this channel only. */
  tau?: number;
  /** Snap when within this distance of target. Prevents endless micro-frames. */
  epsilon?: number;
};

class Channel {
  value: number;
  target: number;
  vel = 0;
  family: MotionFamily;
  tau: number;
  zeta: number;
  maxVel: number;
  epsilon: number;

  constructor(spec: ChannelSpec = {}) {
    this.value = spec.value ?? 0;
    this.target = this.value;
    this.family = spec.family ?? 'mechanical';
    const f = FAMILIES[this.family];
    this.tau = spec.tau ?? f.tau;
    this.zeta = f.zeta;
    this.maxVel = f.maxVel ?? Number.POSITIVE_INFINITY;
    this.epsilon = spec.epsilon ?? 0.0006;
  }

  /** Swap motion family without losing position or momentum. */
  retune(family: MotionFamily, tau?: number) {
    if (this.family === family && tau === undefined) return;
    this.family = family;
    const f = FAMILIES[family];
    this.tau = tau ?? f.tau;
    this.zeta = f.zeta;
    this.maxVel = f.maxVel ?? Number.POSITIVE_INFINITY;
  }

  step(dt: number): boolean {
    const dist = this.target - this.value;
    if (Math.abs(dist) < this.epsilon && Math.abs(this.vel) < this.epsilon) {
      this.value = this.target;
      this.vel = 0;
      return false;
    }

    // omega chosen so that `tau` is roughly the time to arrive.
    const omega = 1 / Math.max(0.0001, this.tau);
    const accel = omega * omega * dist - 2 * this.zeta * omega * this.vel;

    this.vel += accel * dt;
    if (this.vel > this.maxVel) this.vel = this.maxVel;
    else if (this.vel < -this.maxVel) this.vel = -this.maxVel;

    this.value += this.vel * dt;
    return true;
  }
}

/* ------------------------------------------------------------------ */
/* Writers                                                             */
/* ------------------------------------------------------------------ */

type VarMap = Record<string, (rig: Rig) => number | string>;
type PaintFn<T extends Element = Element> = (el: T, rig: Rig) => void;

type Writer = {
  el: Element | null;
  run: (rig: Rig) => void;
};

export type Watcher = {
  read: (rig: Rig) => number;
  /** Fires when the read value crosses `at` in the given direction. */
  at: number;
  dir: 'up' | 'down' | 'both';
  fire: (value: number) => void;
  last: number | null;
};

/* ------------------------------------------------------------------ */
/* Rig                                                                 */
/* ------------------------------------------------------------------ */

export class Rig {
  private channels = new Map<string, Channel>();
  private writers: Writer[] = [];
  private watchers: Watcher[] = [];

  /** Seconds since the rig's clock started. Only advances while running. */
  time = 0;
  private clockOn = false;

  /** Reduced motion collapses all interpolation. */
  reduced = false;
  /** Offscreen or hidden rigs do no work at all. */
  visible = true;
  /** Capability tier, read by writers that want to draw less on weak devices. */
  tier: Tier = 'full';

  /** Declare the environment. Hosts call this; they do not assign fields. */
  configure(opts: { reduced?: boolean; tier?: Tier }) {
    if (opts.reduced !== undefined) this.reduced = opts.reduced;
    if (opts.tier !== undefined) this.tier = opts.tier;
    this.invalidate();
  }

  /** Gate the rig on visibility. An offscreen rig consumes no frames at all. */
  setVisible(visible: boolean) {
    this.visible = visible;
    if (visible) this.invalidate();
  }

  /** Free-form scratch space so plates can stash frame state off React. */
  readonly scratch: Record<string, number> = {};

  private dirty = true;

  constructor(specs: Record<string, ChannelSpec> = {}) {
    for (const [name, spec] of Object.entries(specs)) {
      this.channels.set(name, new Channel(spec));
    }
  }

  /* ---------------- channels ---------------- */

  private channel(name: string): Channel {
    let c = this.channels.get(name);
    if (!c) {
      c = new Channel();
      this.channels.set(name, c);
    }
    return c;
  }

  get(name: string): number {
    return this.channels.get(name)?.value ?? 0;
  }

  targetOf(name: string): number {
    return this.channels.get(name)?.target ?? 0;
  }

  /** Move a channel toward a new target, optionally changing its character. */
  set(name: string, target: number, family?: MotionFamily, tau?: number) {
    const c = this.channel(name);
    if (family) c.retune(family, tau);
    else if (tau !== undefined) c.tau = tau;
    c.target = target;
    if (this.reduced) {
      c.value = target;
      c.vel = 0;
    }
    this.wake();
  }

  /** Teleport a channel. Used for resets, never for animation. */
  jump(name: string, value: number) {
    const c = this.channel(name);
    c.value = value;
    c.target = value;
    c.vel = 0;
    this.wake();
  }

  /**
   * Knock a channel away from where it is without moving its target — the
   * behaviour of someone editing a cluster by hand. The rig will pull it back.
   */
  drift(name: string, delta: number) {
    const c = this.channel(name);
    c.value += delta;
    c.vel = 0;
    this.wake();
  }

  /** Give a channel momentum without changing its target. Splash, kick, jolt. */
  impulse(name: string, velocity: number) {
    if (this.reduced) return;
    this.channel(name).vel += velocity;
    this.wake();
  }

  settled(name: string, tolerance = 0.01): boolean {
    const c = this.channels.get(name);
    if (!c) return true;
    return Math.abs(c.target - c.value) < tolerance;
  }

  /* ---------------- clock ---------------- */

  /** The continuous clock. Only water and instrumentation should need it. */
  setClock(on: boolean) {
    if (this.reduced) {
      this.clockOn = false;
      return;
    }
    if (this.clockOn === on) return;
    this.clockOn = on;
    if (on) this.wake();
  }

  get clockRunning() {
    return this.clockOn && this.visible && !this.reduced;
  }

  /* ---------------- writers ---------------- */

  /**
   * Publish channel values as CSS custom properties on an element. This is the
   * cheapest per-frame write there is: the compositor picks the change up and
   * React never hears about it.
   */
  bindVars(el: Element | null, map: VarMap): () => void {
    if (!el) return () => {};
    const style = (el as HTMLElement | SVGElement).style;
    const entries = Object.entries(map);
    const writer: Writer = {
      el,
      run: (rig) => {
        for (let i = 0; i < entries.length; i += 1) {
          const [prop, read] = entries[i];
          const v = read(rig);
          style.setProperty(prop, typeof v === 'number' ? v.toFixed(4) : v);
        }
      },
    };
    this.writers.push(writer);
    this.dirty = true;
    this.wake();
    return () => this.unbind(writer);
  }

  /**
   * Arbitrary imperative paint — used for recomputing an SVG `d` attribute,
   * which no CSS property can express.
   */
  bindPaint<T extends Element>(el: T | null, fn: PaintFn<T>): () => void {
    if (!el) return () => {};
    const writer: Writer = { el, run: (rig) => fn(el, rig) };
    this.writers.push(writer);
    this.dirty = true;
    this.wake();
    return () => this.unbind(writer);
  }

  private unbind(w: Writer) {
    const i = this.writers.indexOf(w);
    if (i >= 0) this.writers.splice(i, 1);
  }

  /**
   * The only bridge back into React. Fires when a motion value crosses a
   * threshold that the semantic layer cares about — a release clearing a gate,
   * a chamber finishing equalisation. Once per crossing, not once per frame.
   */
  watch(w: Omit<Watcher, 'last'>): () => void {
    const watcher: Watcher = { ...w, last: null };
    this.watchers.push(watcher);
    this.wake();
    return () => {
      const i = this.watchers.indexOf(watcher);
      if (i >= 0) this.watchers.splice(i, 1);
    };
  }

  /* ---------------- the frame ---------------- */

  /** @internal Returns true if the rig still needs frames. */
  advance(dt: number): boolean {
    if (!this.visible) return false;

    let moving = false;
    for (const c of this.channels.values()) {
      if (c.step(this.reduced ? 1 : dt)) moving = true;
    }

    if (this.clockRunning) this.time += dt;

    const needsPaint = moving || this.clockRunning || this.dirty;
    if (needsPaint) {
      for (let i = 0; i < this.writers.length; i += 1) this.writers[i].run(this);
      this.dirty = false;
    }

    if (moving || this.dirty) {
      for (let i = 0; i < this.watchers.length; i += 1) {
        const w = this.watchers[i];
        const v = w.read(this);
        if (w.last !== null) {
          const rose = w.last < w.at && v >= w.at;
          const fell = w.last > w.at && v <= w.at;
          if ((rose && w.dir !== 'down') || (fell && w.dir !== 'up')) w.fire(v);
        }
        w.last = v;
      }
    }

    return moving || this.clockRunning;
  }

  /** Force one paint pass — after a resize, a geometry swap, or a remount. */
  invalidate() {
    this.dirty = true;
    this.wake();
  }

  wake() {
    schedule(this);
  }
}

/* ------------------------------------------------------------------ */
/* The single scheduler                                                */
/* ------------------------------------------------------------------ */

const active = new Set<Rig>();
let frame = 0;
let previous = 0;

function schedule(rig: Rig) {
  active.add(rig);
  if (frame || typeof window === 'undefined') return;
  previous = 0;
  frame = requestAnimationFrame(loop);
}

function loop(now: number) {
  frame = 0;
  const dt = previous ? Math.min(0.05, (now - previous) / 1000) : 0.016;
  previous = now;

  for (const rig of active) {
    if (!rig.advance(dt)) active.delete(rig);
  }

  if (active.size > 0) frame = requestAnimationFrame(loop);
  else previous = 0;
}

/** Test/diagnostic hook: how many rigs are currently consuming frames. */
export const activeRigCount = () => active.size;

/* ------------------------------------------------------------------ */
/* Capability                                                          */
/* ------------------------------------------------------------------ */

export type Tier = 'full' | 'reduced-detail' | 'calm';

/**
 * Device-adaptive complexity. This never removes an interaction or a piece of
 * information — it removes secondary geometry and wave resolution, which is
 * the only part of the drawing nobody is reading.
 */
let cachedTier: Tier | null = null;

function measureTier(): Tier {
  if (cachedTier) return cachedTier;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const cores = nav.hardwareConcurrency ?? 8;
  const mem = nav.deviceMemory;
  const saveData = nav.connection?.saveData === true;

  cachedTier =
    saveData || cores <= 2 || (typeof mem === 'number' && mem <= 2)
      ? 'calm'
      : cores <= 4 || (typeof mem === 'number' && mem <= 4)
        ? 'reduced-detail'
        : 'full';

  return cachedTier;
}

const noSubscribe = () => () => {};

export function useTier(): Tier {
  /* Capability is a fact about the device, not a piece of React state. It is
     read once through an external store so the server renders the full
     drawing and the client never re-renders just to learn what it is on. */
  return useSyncExternalStore(noSubscribe, measureTier, () => 'full' as Tier);
}

/* ------------------------------------------------------------------ */
/* React binding                                                       */
/* ------------------------------------------------------------------ */

export type RigOptions = {
  channels?: Record<string, ChannelSpec>;
  reduced?: boolean;
  tier?: Tier;
};

/**
 * Create a rig that lives for the lifetime of the component. The returned
 * object is stable, so nothing that touches it needs to be in a dependency
 * array and nothing that changes on it causes a render.
 */
export function useRig(options: RigOptions = {}): Rig {
  const { channels, reduced = false, tier = 'full' } = options;
  /* useState's lazy initialiser gives us a single instance for the lifetime of
     the component without reading a ref during render. The channel spec is
     read once, on purpose: retuning happens through rig.set(). */
  const [rig] = useState(() => new Rig(channels));

  useEffect(() => {
    rig.configure({ reduced, tier });
  }, [rig, reduced, tier]);

  useEffect(() => {
    const onVisibility = () => rig.setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [rig]);

  return rig;
}

/**
 * Attach a rig to its root element and gate it on visibility. Returns a
 * callback ref. When the root leaves the viewport the rig stops taking frames
 * entirely — seven plates on one page must not all animate at once.
 */
export function useRigRoot<T extends Element>(
  rig: Rig,
  onVisible?: (visible: boolean) => void,
) {
  const nodeRef = useRef<T | null>(null);
  const cbRef = useLatest(onVisible);

  const ref = useCallback(
    (node: T | null) => {
      nodeRef.current = node;
      if (node) rig.invalidate();
    },
    [rig],
  );


  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      rig.setVisible(true);
      cbRef.current?.(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        const vis = entry.isIntersecting;
        rig.setVisible(vis);
        cbRef.current?.(vis);
      },
      { rootMargin: '120px 0px 120px 0px', threshold: 0 },
    );

    io.observe(node);
    return () => io.disconnect();
  }, [rig, cbRef]);

  return ref;
}

/**
 * Bind CSS custom properties for the life of the component.
 * `map` is read once — write it inline, it is not a dependency.
 */
export function useVars<T extends Element>(rig: Rig, map: VarMap) {
  const mapRef = useLatest(map);
  const nodeRef = useRef<T | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);

  return useCallback(
    (node: T | null) => {
      releaseRef.current?.();
      releaseRef.current = null;
      nodeRef.current = node;
      if (!node) return;
      releaseRef.current = rig.bindVars(node, {
        ...Object.fromEntries(
          Object.keys(mapRef.current).map((k) => [
            k,
            (r: Rig) => mapRef.current[k](r),
          ]),
        ),
      });
    },
    [rig, mapRef],
  );
}

/** Bind an imperative paint for the life of the component. */
export function usePaint<T extends Element>(rig: Rig, fn: PaintFn<T>) {
  const fnRef = useLatest(fn);
  const releaseRef = useRef<(() => void) | null>(null);

  return useCallback(
    (node: T | null) => {
      releaseRef.current?.();
      releaseRef.current = null;
      if (!node) return;
      releaseRef.current = rig.bindPaint<T>(node, (el, r) => fnRef.current(el, r));
    },
    [rig, fnRef],
  );
}

/**
 * Bridge a motion threshold back into React state. Use sparingly — this is
 * for semantic events, not for animation.
 */
export function useWatch(
  rig: Rig,
  read: (rig: Rig) => number,
  at: number,
  dir: 'up' | 'down' | 'both',
  fire: (value: number) => void,
) {
  const fireRef = useLatest(fire);
  const readRef = useLatest(read);

  useEffect(
    () =>
      rig.watch({
        read: (r) => readRef.current(r),
        at,
        dir,
        fire: (v) => fireRef.current(v),
      }),
    [rig, at, dir, fireRef, readRef],
  );
}

/* ------------------------------------------------------------------ */
/* Pointer field                                                       */
/* ------------------------------------------------------------------ */

/**
 * Restrained pointer reactivity: normalised position, and a decaying measure
 * of how fast the pointer is moving. Both are published as CSS variables and
 * as rig channels, so a plate can let water notice a hand passing over it
 * without a single React render.
 *
 * There is no custom cursor, no follower, no page wobble. The pointer is a
 * hand near a machine, not a character in the scene.
 */
export function usePointerField(
  rig: Rig,
  opts: { channel?: string; enabled?: boolean } = {},
) {
  const { channel = 'pointer', enabled = true } = opts;
  const nodeRef = useRef<HTMLElement | SVGElement | null>(null);

  const ref = useCallback((node: HTMLElement | SVGElement | null) => {
    nodeRef.current = node;
  }, []);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || !enabled) return;
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    // Publish the smoothed field to the inspected drawing as CSS variables
    // as well as rig channels. CSS can use these for tiny material responses
    // without adding another event listener or touching React state.
    const releaseVars = rig.bindVars(node, {
      [`--${channel}-x`]: (r) => r.get(`${channel}X`),
      [`--${channel}-y`]: (r) => r.get(`${channel}Y`),
      [`--${channel}-v`]: (r) => r.get(`${channel}V`),
      [`--${channel}-in`]: (r) => r.get(`${channel}In`),
    });

    let lastX = 0;
    let lastY = 0;
    let lastT = 0;

    const onMove = (e: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      if (rect.width === 0) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const now = e.timeStamp;
      const dt = lastT ? Math.max(8, now - lastT) : 16;
      const speed = Math.hypot(e.clientX - lastX, e.clientY - lastY) / dt;

      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;

      rig.set(`${channel}X`, x, 'mechanical', 0.09);
      rig.set(`${channel}Y`, y, 'mechanical', 0.09);
      // Disturbance rises with pointer speed and always decays back to nothing.
      rig.set(`${channel}V`, Math.min(1, speed / 2.2), 'mechanical', 0.12);
      rig.set(`${channel}In`, 1, 'mechanical', 0.2);
      window.clearTimeout(decay);
      decay = window.setTimeout(() => rig.set(`${channel}V`, 0, 'hydraulic'), 90);
    };

    let decay = 0;
    const onLeave = () => {
      window.clearTimeout(decay);
      rig.set(`${channel}V`, 0, 'hydraulic');
      rig.set(`${channel}In`, 0, 'mechanical', 0.3);
    };

    node.addEventListener('pointermove', onMove as EventListener, {
      passive: true,
    });
    node.addEventListener('pointerleave', onLeave as EventListener);
    return () => {
      window.clearTimeout(decay);
      releaseVars();
      node.removeEventListener('pointermove', onMove as EventListener);
      node.removeEventListener('pointerleave', onLeave as EventListener);
    };
  }, [rig, channel, enabled]);

  return ref;
}
