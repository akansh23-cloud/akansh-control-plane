'use client';

import { useCallback, useMemo, useState } from 'react';
import { Fold } from '@/components/Fold';
import { LiveEvidence } from '@/components/LiveEvidence';
import { careerProject } from '@/content';
import {
  usePointerField,
  usePrefersReducedMotion,
  useRig,
  useRigRoot,
  useTier,
  useVars,
  useViewport,
} from '@/lib/motion';
import styles from './Split.module.css';

/**
 * PLATE 05 — THE SPLIT. Career Autopilot. Personal project.
 *
 * A monolith taken apart one service at a time, with traffic never stopping.
 * The interesting part of a strangler migration is not the diagram, it is
 * what happens on the request that arrives while a service is half-extracted
 * or not answering — so that is the interaction. Extract units one at a time
 * and the routing layer starts sending their traffic to them. Take one out of
 * service and the request does not fail; it goes back to the monolith.
 *
 * The unit count and the routing behaviour are real. The service names are
 * not published, so the units are numbered rather than invented.
 */

const TOTAL = careerProject.serviceCount;

export function Split() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();

  const [extracted, setExtracted] = useState(4);
  const [down, setDown] = useState<number | null>(null);

  const rig = useRig({
    channels: {
      out: { value: 4 / TOTAL, family: 'hydraulic' },
      pointerX: { value: 0.5, family: 'mechanical' },
      pointerY: { value: 0.5, family: 'mechanical' },
      pointerIn: { value: 0, family: 'mechanical' },
    },
    reduced,
    tier,
  });

  const rootRef = useRigRoot<HTMLDivElement>(rig);
  const pointerRef = usePointerField(rig);

  const fieldRef = useVars<HTMLDivElement>(rig, {
    '--out': (r) => r.get('out'),
  });

  const set = useCallback(
    (n: number) => {
      const next = Math.max(0, Math.min(TOTAL, n));
      setExtracted(next);
      rig.set('out', next / TOTAL, 'hydraulic');
      if (down !== null && down >= next) setDown(null);
    },
    [rig, down],
  );

  const takeDown = useCallback(() => {
    if (extracted === 0) return;
    setDown((d) => (d === null ? 0 : d));
  }, [extracted]);

  const reset = useCallback(() => {
    setDown(null);
    set(0);
  }, [set]);

  /* Where a request currently lands. This is the whole point of the plate. */
  const routed =
    down !== null
      ? 'monolith'
      : extracted === 0
        ? 'monolith'
        : extracted === TOTAL
          ? 'services'
          : 'mixed';

  const verdict = useMemo(() => {
    if (down !== null) {
      return careerProject.fallback;
    }
    if (extracted === 0) {
      return 'Nothing has been extracted yet. Every request is answered by the monolith behind the gateway.';
    }
    if (extracted === TOTAL) {
      return 'Every unit answers for itself now. The monolith is still behind the routing layer, and nothing needed a flag day to get here.';
    }
    return `${extracted} of ${TOTAL} units answer for themselves. Anything not extracted yet is still routed to the monolith, on the same request.`;
  }, [extracted, down]);

  /* A tablet keeps the units on two rows of eight; a phone uses four rows of
     four so each unit stays a comfortable touch target. */
  const columns = viewport === 'tablet' ? 8 : viewport === 'mobile' ? 4 : 8;

  return (
    <div ref={rootRef} className={styles.root}>
      {/* The request path. */}
      <ol className={styles.path} data-routed={routed}>
        {careerProject.path.map((step, i) => (
          <li key={step} className={styles.step} style={{ '--i': i } as React.CSSProperties}>
            <span className={styles.stepNo}>{String(i + 1).padStart(2, '0')}</span>
            <span className={styles.stepName}>{step}</span>
          </li>
        ))}
        <li className={styles.step} data-terminal="">
          <span className={styles.stepNo}>{String(careerProject.path.length + 1).padStart(2, '0')}</span>
          <span className={styles.stepName}>
            {routed === 'monolith'
              ? 'Monolith'
              : routed === 'services'
                ? 'Extracted unit'
                : 'Unit or monolith'}
          </span>
        </li>
      </ol>

      <div className={styles.controls}>
        <div className="ctl-row">
          <button
            type="button"
            className="ctl"
            data-primary=""
            onClick={() => set(extracted + 1)}
            disabled={extracted === TOTAL}
          >
            Extract a service
          </button>
          <button
            type="button"
            className="ctl"
            onClick={takeDown}
            disabled={extracted === 0 || down !== null}
          >
            Take one out of service
          </button>
          <button
            type="button"
            className="ctl"
            onClick={reset}
            disabled={extracted === 0 && down === null}
          >
            Reset
          </button>
        </div>

        <p className="lamp" data-state={down !== null ? 'hold' : extracted === TOTAL ? 'ok' : 'running'}>
          {extracted} / {TOTAL} extracted
        </p>
      </div>

      <div
        ref={(node) => {
          pointerRef(node);
          fieldRef(node);
        }}
        className={styles.field}
        style={{ '--cols': columns } as React.CSSProperties}
      >
        <div className={styles.monolith}>
          <span className={styles.monolithLabel}>Legacy monolith</span>
          <span className={styles.monolithBar} aria-hidden="true" />
          <span className={styles.monolithNote}>
            {TOTAL - extracted} of {TOTAL} still answered here
          </span>
        </div>

        <ol className={styles.units} aria-label={`${TOTAL} services`}>
          {Array.from({ length: TOTAL }, (_, i) => (
            <li
              key={i}
              className={styles.unit}
              data-state={
                down === i ? 'down' : i < extracted ? 'live' : 'inside'
              }
            >
              <span className={styles.unitNo}>{String(i + 1).padStart(2, '0')}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className={styles.verdict} aria-live="polite">
        {verdict}
      </p>

      <Fold label="How it was done" hint={`${careerProject.migration.length} steps`}>
        <div className={styles.meta}>
        <div>
          <ol className={styles.migration}>
            {careerProject.migration.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ol>
        </div>
        <div>
          <p className="u-mark">Build and delivery</p>
          <ul className={styles.stack}>
            {careerProject.stack.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        </div>
      </Fold>

      <p className={styles.note}>{careerProject.serviceNote}</p>

      <p className={styles.source}>
        <span className="u-mark">Code</span>
        <a href={careerProject.repo} target="_blank" rel="noreferrer noopener">
          {careerProject.repoLabel}
        </a>
        <span className="u-mark">Live</span>
        <a href={careerProject.live} target="_blank" rel="noreferrer noopener">
          {careerProject.liveLabel}
        </a>
      </p>
      <LiveEvidence repo="akansh23-cloud/career-autopilot" />
    </div>
  );
}
