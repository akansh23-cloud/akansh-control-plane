import { useEffect, useRef, useState } from 'react';
import { subscribe, getState } from './store';
import { ERA_COUNT } from '../data/eras';

/**
 * Run a callback every frame with the current scene state.
 * The callback should mutate refs/DOM, not call setState.
 */
export function useSceneFrame(fn, deps = []) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => subscribe((s, dt) => ref.current(s, dt)), deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * The only hook allowed to re-render on scroll — and it only fires when the
 * *station* changes, so a full journey costs twelve renders, not thousands.
 */
export function useStation() {
  const [station, setStation] = useState(() => Math.round(getState().pos));
  useEffect(() =>
    subscribe((s) => {
      const next = Math.min(ERA_COUNT - 1, Math.max(0, Math.round(s.pos)));
      setStation((cur) => (cur === next ? cur : next));
    }), []);
  return station;
}

/** True once the reader has scrolled past the opening card. */
export function useHasDeparted() {
  const [gone, setGone] = useState(false);
  useEffect(() =>
    subscribe((s) => {
      const next = s.intro > 0.12;
      setGone((cur) => (cur === next ? cur : next));
    }), []);
  return gone;
}

/** Reveal-on-enter without pulling in a library. */
export function useReveal(options = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      el.dataset.revealed = 'true';
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.dataset.revealed = 'true';
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: options.rootMargin || '0px 0px -18% 0px', threshold: options.threshold ?? 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [options.rootMargin, options.threshold]);
  return ref;
}
