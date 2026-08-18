'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { journey } from '@/content';
import {
  usePrefersReducedMotion,
  useRig,
  useTier,
  useVars,
} from '@/lib/motion';
import styles from './Waterway.module.css';

/**
 * THE CONTINUOUS SYSTEM JOURNEY.
 *
 * Every chapter of this site is one station on a single route, and until now
 * that was only true in the prose. This is the route itself: one channel down
 * the left of the document, filled to the point the reader has reached, with
 * the six stations software actually passes through cut into the wall beside
 * it — source, build, gates, registry, production, observability.
 *
 * Station positions are measured from where the browser actually put the
 * plates, so the route cannot disagree with the page. The fill is a rig
 * channel written by a passive scroll listener, so it costs one number per
 * frame and no React render. Under reduced motion the fill still tracks the
 * reader; it simply arrives instead of easing.
 */
export function Waterway() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();

  const rig = useRig({
    channels: { flow: { value: 0, family: 'hydraulic', tau: 0.3 } },
    reduced,
    tier,
  });

  const rootRef = useVars<HTMLDivElement>(rig, {
    '--flow': (r) => r.get('flow'),
  });

  /* Measured once per layout change: where each station sits on the route. */
  const [marks, setMarks] = useState<number[]>(() => journey.map((_, i) => i / 6));
  const [active, setActive] = useState(0);
  const spanRef = useRef({ top: 0, height: 1 });

  const measure = useCallback(() => {
    const anchors = journey.map((s) => document.getElementById(s.plate));
    const first = document.getElementById(journey[0].plate);
    const last = document.getElementById('tidewater') ?? anchors[anchors.length - 1];
    if (!first || !last) return;

    const top = first.getBoundingClientRect().top + window.scrollY;
    const bottom = last.getBoundingClientRect().bottom + window.scrollY;
    const height = Math.max(1, bottom - top);
    spanRef.current = { top, height };

    setMarks(
      anchors.map((el, i) => {
        if (!el) return i / journey.length;
        const r = el.getBoundingClientRect();
        const centre = r.top + window.scrollY + r.height * journey[i].offset;
        return Math.min(1, Math.max(0, (centre - top) / height));
      }),
    );
  }, []);

  useEffect(() => {
    /* Measured after paint, never during the effect body: the route is a
       reading of the layout, so it has to wait for there to be one. */
    const first = window.setTimeout(measure, 0);
    /* Fonts and images settle after first paint; re-measure once they have. */
    const settle = window.setTimeout(measure, 900);
    const onResize = () => measure();
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(settle);
      window.removeEventListener('resize', onResize);
    };
  }, [measure]);

  useEffect(() => {
    const read = () => {
      const { top, height } = spanRef.current;
      const seen = window.scrollY + window.innerHeight * 0.58 - top;
      const p = Math.min(1, Math.max(0, seen / height));
      rig.set('flow', p, 'hydraulic');

      let next = 0;
      for (let i = 0; i < marks.length; i += 1) if (p >= marks[i] - 0.02) next = i;
      setActive((current) => (current === next ? current : next));
    };

    const first = window.setTimeout(read, 0);
    window.addEventListener('scroll', read, { passive: true });
    return () => {
      window.clearTimeout(first);
      window.removeEventListener('scroll', read);
    };
  }, [rig, marks]);

  return (
    <div
      ref={rootRef}
      className={styles.rail}
      aria-hidden="true"
      data-route="journey"
      data-station={journey[active]?.id}
    >
      <span className={styles.channel} />
      <span className={styles.fill} />
      <span className={styles.craft} />

      <ol className={styles.stations}>
        {journey.map((s, i) => (
          <li
            key={s.id}
            className={styles.station}
            style={{ top: `${marks[i] * 100}%` }}
            data-passed={i <= active ? '' : undefined}
            data-active={i === active ? '' : undefined}
          >
            <span className={styles.tick} />
            <span className={styles.label}>{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
