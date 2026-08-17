'use client';

/**
 * Environment and input.
 *
 * Everything that runs per frame now lives in `runtime.ts` and never touches
 * React state. What is left here is state that genuinely changes rarely:
 * which device this is, whether motion is welcome, and where a control has
 * been dragged to.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { MotionFamily, Rig } from './runtime';
import { useLatest } from './runtime';

export * from './runtime';

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

/**
 * A media query as an external store.
 *
 * This matters for more than tidiness: the server snapshot is explicit, so
 * the markup React renders on the server and the markup it hydrates on the
 * client agree, and a device that never changes orientation never causes a
 * render at all.
 */
function useMedia(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export function usePrefersReducedMotion(): boolean {
  return useMedia('(prefers-reduced-motion: reduce)');
}

export type Viewport = 'mobile' | 'tablet' | 'desktop';

/**
 * Three compositions, not two. Each plate carries a geometry table per
 * viewport and picks one — the drawing is redrawn for the device, never
 * scaled down into it.
 *
 * mobile   < 720
 * tablet   720 – 1179   (covers 1024 in both orientations)
 * desktop  >= 1180
 */
export function useViewport(): Viewport {
  const mobile = useMedia('(max-width: 719px)');
  const tablet = useMedia('(min-width: 720px) and (max-width: 1179px)');
  return useMemo(
    () => (mobile ? 'mobile' : tablet ? 'tablet' : 'desktop'),
    [mobile, tablet],
  );
}

/** Coarse pointer means touch choreography, not hover choreography. */
export function useCoarsePointer(): boolean {
  return useMedia('(pointer: coarse)');
}

/** True only for a real hovering pointer — the only place hover is allowed. */
export function useFinePointer(): boolean {
  return useMedia('(hover: hover) and (pointer: fine)');
}

/* ------------------------------------------------------------------ */
/* Dragging                                                            */
/* ------------------------------------------------------------------ */

export type DragAxis = 'x' | 'y';

export type AxisDragOptions = {
  invert?: boolean;
  /** Keyboard increment. Arrow keys move by this; Page keys by three. */
  step?: number;
  /**
   * Positions the control prefers to rest at. Released within `snap` of one,
   * it seats there — the detent on a real lock gear.
   */
  detents?: number[];
  snap?: number;
  onCommit?: (value: number) => void;
};

/**
 * A normalised 0…1 drag along one axis, measured against a track element.
 *
 * The handle is a real ARIA slider, so every one of these is keyboard
 * operable without a separate control. Pointer capture is taken on the
 * element that received the event, and `touch-action: none` belongs on the
 * handle only — never on the drawing around it, or the page stops scrolling.
 */
export function useAxisDrag(
  axis: DragAxis,
  /**
   * Either the current value, or a getter for it. The getter form exists for
   * controls whose position is motion rather than React state — the handle
   * still needs to know where it is without the component re-rendering.
   */
  value: number | (() => number),
  onChange: (next: number) => void,
  opts: AxisDragOptions = {},
) {
  const trackRef = useRef<SVGGraphicsElement | HTMLElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const step = opts.step ?? 0.06;
  const grabOffset = useRef(0);

  const optsRef = useLatest(opts);
  const liveRef = useLatest(value);
  const read = useCallback(
    () => (typeof liveRef.current === 'function' ? liveRef.current() : liveRef.current),
    [liveRef],
  );

  const positionFrom = useCallback(
    (clientX: number, clientY: number) => {
      const node = trackRef.current;
      if (!node) return read();
      const rect = node.getBoundingClientRect();
      const raw =
        axis === 'x'
          ? (clientX - rect.left) / Math.max(1, rect.width)
          : (clientY - rect.top) / Math.max(1, rect.height);
      const clamped = Math.min(1, Math.max(0, raw));
      return optsRef.current.invert ? 1 - clamped : clamped;
    },
    [axis, optsRef, read],
  );

  const seat = useCallback((v: number) => {
    const { detents, snap = 0.045 } = optsRef.current;
    if (!detents?.length) return v;
    let best = v;
    let bestDist = snap;
    for (const d of detents) {
      const dist = Math.abs(d - v);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    return best;
  }, [optsRef]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== undefined && e.button > 0) return;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      setDragging(true);
      const at = positionFrom(e.clientX, e.clientY);
      /* Near the handle: pick it up and keep the offset, so it does not jump
         under the finger. Far from it: treat the track as a scrubber. */
      grabOffset.current =
        Math.abs(at - read()) < 0.16 ? read() - at : 0;
      onChange(clamp(at + grabOffset.current));
    },
    [onChange, positionFrom, read],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      onChange(clamp(positionFrom(e.clientX, e.clientY) + grabOffset.current));
    },
    [dragging, onChange, positionFrom],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
      if (!dragging) return;
      setDragging(false);
      const live = read();
      const seated = seat(live);
      if (seated !== live) onChange(seated);
      optsRef.current.onCommit?.(seated);
    },
    [dragging, onChange, optsRef, read, seat],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const deltas: Record<string, number> = {
        ArrowUp: step,
        ArrowRight: step,
        ArrowDown: -step,
        ArrowLeft: -step,
        PageUp: step * 3,
        PageDown: -step * 3,
      };

      if (e.key === 'Home') {
        e.preventDefault();
        onChange(0);
        optsRef.current.onCommit?.(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        onChange(1);
        optsRef.current.onCommit?.(1);
        return;
      }

      const delta = deltas[e.key];
      if (delta === undefined) return;
      e.preventDefault();
      const next = clamp(read() + delta);
      onChange(next);
      optsRef.current.onCommit?.(next);
    },
    [onChange, optsRef, read, step],
  );

  return {
    trackRef,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onKeyDown,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

export const clamp = (n: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, n));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const remap = (
  n: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) => {
  if (inMax === inMin) return outMin;
  return lerp(outMin, outMax, clamp((n - inMin) / (inMax - inMin)));
};

/** Smoothstep, for shaping a 0…1 value without a spring. */
export const smoothstep = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

/* ------------------------------------------------------------------ */
/* Entrance                                                            */
/* ------------------------------------------------------------------ */

export type RevealOptions = {
  /** How far into the viewport the element must come before it plays. */
  margin?: string;
  /** Play once and stay played, or replay on every entry. */
  once?: boolean;
};

/**
 * Mark an element as revealed the first time it enters the viewport.
 *
 * The element gets `data-reveal="out"` immediately and `data-reveal="in"` when
 * it arrives. Everything after that is CSS: the transition, the stagger, the
 * distance. That division is deliberate — an entrance that is described in
 * CSS costs nothing per frame, survives `prefers-reduced-motion` without any
 * JavaScript branch, and cannot fight the rig for the compositor.
 *
 * It is not part of a rig on purpose. An entrance happens once and then never
 * again; giving it a spring and a frame budget would be paying every frame for
 * something that already finished.
 */
export function useReveal<T extends HTMLElement>(options: RevealOptions = {}) {
  const { margin = '160px 0px 160px 0px', once = true } = options;
  const nodeRef = useRef<T | null>(null);

  const ref = useCallback((node: T | null) => {
    nodeRef.current = node;
    if (node && !node.dataset.reveal) node.dataset.reveal = 'out';
  }, []);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    /* A dead man's switch. If the observer never fires — an old browser, a
       zero-height box, a layout the margin does not agree with — the content
       appears anyway. An entrance is a nicety; a blank screen is the bug this
       entire rebuild exists to fix, so the nicety is never allowed to cause
       one. */
    const failSafe = window.setTimeout(() => {
      node.dataset.reveal = 'in';
    }, 1400);

    if (typeof IntersectionObserver === 'undefined') {
      node.dataset.reveal = 'in';
      return () => window.clearTimeout(failSafe);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.dataset.reveal = 'in';
          window.clearTimeout(failSafe);
          if (once) io.disconnect();
        } else if (!once) {
          node.dataset.reveal = 'out';
        }
      },
      /* Positive margin: play before the block is on screen, never after. */
      { rootMargin: margin, threshold: 0 },
    );

    io.observe(node);
    return () => {
      window.clearTimeout(failSafe);
      io.disconnect();
    };
  }, [margin, once]);

  return ref;
}

/* ------------------------------------------------------------------ */
/* Scroll                                                              */
/* ------------------------------------------------------------------ */

/**
 * Feed scroll progress through an element into a rig channel.
 *
 * The listener is passive and does nothing but write a number; the rig's own
 * loop is what smooths and paints it. That keeps the promise the runtime
 * makes — one frame loop in the whole application — while still giving
 * scroll-linked motion, which is the thing that makes a page feel like it is
 * being operated rather than merely scrolled past.
 *
 * Progress is 0 when the element's top reaches the bottom of the viewport and
 * 1 when its bottom reaches the top.
 */
export type ScrollMap =
  /** 0 while the element's top is at the top of the viewport, 1 once it has
   *  scrolled fully out of the top. Correct for a block that starts on
   *  screen, such as a hero — it does not begin part-played. */
  | 'out'
  /** 0 as the element enters from the bottom, 1 as it leaves the top.
   *  Correct for a block the reader passes through. */
  | 'through';

export function useScrollChannel<T extends HTMLElement>(
  rig: Rig,
  channel: string,
  options: { family?: MotionFamily; tau?: number; map?: ScrollMap } = {},
) {
  const nodeRef = useRef<T | null>(null);
  const optsRef = useLatest(options);

  const ref = useCallback((node: T | null) => {
    nodeRef.current = node;
  }, []);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const read = () => {
      const r = node.getBoundingClientRect();
      const vh = window.innerHeight;
      const o = optsRef.current;
      let p: number;

      if ((o.map ?? 'out') === 'out') {
        /* An element sitting at the top of the document must read 0 when the
           page loads, not "already half way", which is what measuring against
           the whole viewport-plus-height span does to a hero. */
        if (r.height <= 0) return;
        p = clamp(-r.top / r.height);
      } else {
        const span = r.height + vh;
        if (span <= 0) return;
        p = clamp((vh - r.top) / span);
      }

      rig.set(channel, p, o.family, o.tau);
    };

    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read, { passive: true });
    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, [rig, channel, optsRef]);

  return ref;
}
