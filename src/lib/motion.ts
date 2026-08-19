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

export function useReveal<T extends HTMLElement>(options: RevealOptions = {}) {
  const { margin = '160px 0px 160px 0px', once = true } = options;
  const nodeRef = useRef<T | null>(null);
  const playedRef = useRef(false);

  const ref = useCallback((node: T | null) => {
    nodeRef.current = node;
    if (node) node.dataset.reveal = 'in';
  }, []);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || (once && playedRef.current)) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reduce && typeof node.animate === 'function') {
          node.animate(
            [
              { opacity: 0.82, transform: 'translate3d(0, 12px, 0)' },
              { opacity: 1, transform: 'translate3d(0, 0, 0)' },
            ],
            { duration: 360, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
          );
        }
        playedRef.current = true;
        if (once) io.disconnect();
      },
      { rootMargin: margin, threshold: 0 },
    );

    io.observe(node);
    return () => io.disconnect();
  }, [margin, once]);

  return ref;
}

/* ------------------------------------------------------------------ */
/* Scroll                                                              */
/* ------------------------------------------------------------------ */

export type ScrollMap =
  | 'out'
  | 'through';

export function useScrollChannel<T extends HTMLElement>(
  rig: Rig,
  channel: string,
  options: {
    family?: MotionFamily;
    tau?: number;
    map?: ScrollMap;
    /**
     * Positional scroll-linked values should not chase scroll through a spring.
     * In direct mode the shared runtime still owns the paint, but the channel
     * itself is teleported to the current scroll position so there is no
     * built-in lag or overshoot.
     */
    direct?: boolean;
  } = {},
) {
  const nodeRef = useRef<T | null>(null);
  const optsRef = useLatest(options);

  const ref = useCallback((node: T | null) => {
    nodeRef.current = node;
  }, []);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    let top = 0;
    let height = 1;

    const measure = () => {
      const r = node.getBoundingClientRect();
      top = r.top + window.scrollY;
      height = Math.max(1, r.height);
    };

    const read = () => {
      const vh = window.innerHeight;
      const o = optsRef.current;
      const p = (o.map ?? 'out') === 'out'
        ? clamp((window.scrollY - top) / height)
        : clamp((window.scrollY + vh - top) / Math.max(1, height + vh));

      if (o.direct) rig.jump(channel, p);
      else rig.set(channel, p, o.family, o.tau);
    };

    const onScroll = () => read();
    const remeasure = () => { measure(); read(); };

    measure();
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', remeasure, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(remeasure) : null;
    ro?.observe(node);
    return () => {
      ro?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', remeasure);
    };
  }, [rig, channel, optsRef]);

  return ref;
}
