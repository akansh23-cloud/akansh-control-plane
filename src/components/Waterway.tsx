'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useJourney } from '@/components/JourneySystem';
import { journey } from '@/content';
import {
  usePrefersReducedMotion,
  useRig,
  useTier,
  useVars,
} from '@/lib/motion';
import styles from './Waterway.module.css';
import motion from './WaterwayMotion.module.css';

/**
 * THE CONTINUOUS SYSTEM JOURNEY.
 *
 * Scroll owns position and tracks directly. A separate CSS-only current runs
 * inside the filled rail so the system still feels alive when the user stops
 * scrolling, without reintroducing spring lag or per-frame layout work.
 */
export function Waterway() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const run = useJourney();

  const rig = useRig({
    channels: { flow: { value: 0, family: 'mechanical' } },
    reduced,
    tier,
  });

  const spanRef = useRef({ top: 0, height: 1, railHeight: 1 });
  const rootRef = useVars<HTMLDivElement>(rig, {
    '--flow': (r) => r.get('flow'),
    '--craft-y': (r) => `${r.get('flow') * spanRef.current.railHeight}px`,
  });

  const fallbackMark = useCallback(
    (index: number) => index / Math.max(1, journey.length - 1),
    [],
  );
  const [marks, setMarks] = useState<number[]>(() => journey.map((_, i) => fallbackMark(i)));
  const [active, setActive] = useState(0);
  const railNode = useRef<HTMLDivElement | null>(null);

  const measure = useCallback(() => {
    const anchors = journey.map((s) => document.getElementById(s.plate));
    const first = document.getElementById(journey[0].plate);
    const last = document.getElementById('tidewater') ?? anchors[anchors.length - 1];
    if (!first || !last) return;

    const top = first.getBoundingClientRect().top + window.scrollY;
    const bottom = last.getBoundingClientRect().bottom + window.scrollY;
    const height = Math.max(1, bottom - top);
    const railHeight = railNode.current?.getBoundingClientRect().height ?? 1;
    spanRef.current = { top, height, railHeight: Math.max(1, railHeight) };

    setMarks(
      anchors.map((el, i) => {
        if (!el) return fallbackMark(i);
        const r = el.getBoundingClientRect();
        const centre = r.top + window.scrollY + r.height * journey[i].offset;
        return Math.min(1, Math.max(0, (centre - top) / height));
      }),
    );
    rig.invalidate();
  }, [fallbackMark, rig]);

  useEffect(() => {
    let pending = 0;
    const scheduleMeasure = () => {
      if (pending) return;
      pending = window.setTimeout(() => {
        pending = 0;
        measure();
      }, 0);
    };

    const first = window.setTimeout(scheduleMeasure, 0);
    const settle = window.setTimeout(scheduleMeasure, 900);
    window.addEventListener('resize', scheduleMeasure, { passive: true });

    /* Interactive plates expand and contract after mount. Keep the physical
       rail calibrated to real document geometry without putting layout reads
       in the scroll handler. ResizeObserver only schedules one deferred
       measurement when the main journey's size actually changes. */
    const main = document.querySelector('main');
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleMeasure);
    if (main) observer?.observe(main);

    document.fonts?.ready.then(scheduleMeasure).catch(() => undefined);

    return () => {
      window.clearTimeout(first);
      window.clearTimeout(settle);
      if (pending) window.clearTimeout(pending);
      window.removeEventListener('resize', scheduleMeasure);
      observer?.disconnect();
    };
  }, [measure]);

  useEffect(() => {
    const read = () => {
      const { top, height } = spanRef.current;
      const seen = window.scrollY + window.innerHeight * 0.58 - top;
      const p = Math.min(1, Math.max(0, seen / height));

      /* Direct positional tracking: no spring, no overshoot, no catch-up lag. */
      rig.jump('flow', p);

      let next = 0;
      for (let i = 0; i < marks.length; i += 1) {
        if (p >= marks[i] - 0.02) next = i;
      }
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
      ref={(node) => {
        railNode.current = node;
        rootRef(node);
      }}
      className={styles.rail}
      aria-hidden="true"
      data-route="journey"
      data-station={journey[active]?.id}
      data-run-launched={run.launched ? 'true' : 'false'}
      data-run-phase={run.phase}
    >
      <span className={styles.channel} />
      <span className={`${styles.fill} ${motion.flowing}`} />
      <span className={styles.backPressure} />
      <span className={styles.craft} data-artifact={run.artifact} />
      <span className={styles.artifactTag}>{run.artifact}</span>

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
