'use client';

import { useCallback, useState } from 'react';
import { gauges, observabilityChain, readAt } from '@/content';
import {
  useAxisDrag,
  usePointerField,
  usePrefersReducedMotion,
  useRig,
  useRigRoot,
  useTier,
  useVars,
  useViewport,
} from '@/lib/motion';
import styles from './Gauges.module.css';

/**
 * PLATE 06 — GAUGE HOUSE. Observability as relationships, not a dashboard.
 *
 * The reading is derived from the load the visitor sets, using a deliberately
 * simple model: latency curves upward as saturation approaches the limit,
 * errors stay at zero until latency crosses the timeout budget, and readiness
 * drops once errors are sustained — which takes pods out of rotation instead
 * of serving failures. It is labelled as a model on screen, because it is one.
 */

export function Gauges() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();

  const [load, setLoad] = useState(0.34);
  const reading = readAt(load);

  const rig = useRig({
    channels: {
      load: { value: 0.34, family: 'hydraulic' },
      pointerX: { value: 0.5, family: 'mechanical' },
      pointerIn: { value: 0, family: 'mechanical' },
    },
    reduced,
    tier,
  });

  const rootRef = useRigRoot<HTMLDivElement>(rig);
  const pointerRef = usePointerField(rig);

  const barsRef = useVars<HTMLDivElement>(rig, {
    '--load': (r) => r.get('load'),
  });

  const move = useCallback(
    (next: number) => {
      setLoad(next);
      rig.set('load', next, 'hydraulic');
    },
    [rig],
  );

  const { trackRef, dragging, handlers } = useAxisDrag('x', load, move, {
    step: 0.06,
    detents: [0, 0.5, 0.75, 1],
    snap: 0.035,
  });

  /* A tablet drops to two gauge columns rather than four — four columns at
     1024px puts the readings below 20px, which was the original complaint. */
  const columns = viewport === 'tablet' ? 2 : viewport === 'mobile' ? 2 : 4;

  const values: Record<string, { display: string; fill: number }> = {
    saturation: { display: `${reading.saturation}`, fill: reading.saturation / 100 },
    latency: { display: `${reading.latency}`, fill: Math.min(1, reading.latency / 1000) },
    errors: { display: `${reading.errors}`, fill: Math.min(1, reading.errors / 42) },
    readiness: { display: `${reading.readiness} / 3`, fill: reading.readiness / 3 },
  };

  return (
    <div ref={rootRef} className={styles.root} data-state={reading.state}>
      <div
        ref={(node) => {
          pointerRef(node);
          barsRef(node);
        }}
        className={styles.panel}
        style={{ '--cols': columns } as React.CSSProperties}
      >
        <div className={styles.head}>
          <p className="lamp" data-state={
            reading.state === 'healthy' ? 'ok' : reading.state === 'degrading' ? 'hold' : 'fault'
          }>
            {reading.state}
          </p>
          <p className={styles.note}>{reading.note}</p>
        </div>

        <dl className={styles.grid}>
          {gauges.map((g) => (
            <div key={g.id} className={styles.gauge} data-id={g.id}>
              <dt className={styles.gaugeName}>{g.name}</dt>
              <dd className={styles.gaugeValue}>
                {values[g.id].display}
                <span className={styles.gaugeUnit}>{g.unit}</span>
              </dd>
              <dd
                className={styles.gaugeBar}
                style={{ '--v': values[g.id].fill } as React.CSSProperties}
                aria-hidden="true"
              >
                <span />
              </dd>
              <dd className={styles.gaugeMeaning}>{g.meaning}</dd>
              <dd className={styles.gaugeSeen}>
                {g.seenIn.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </dd>
            </div>
          ))}
        </dl>

        {/* The load control. A designed track with a 48px grip, not a default
            range input squeezed into a drawing. */}
        <div className={styles.control}>
          <p className="u-mark">Load against the limit</p>
          <div
            ref={(node) => {
              trackRef.current = node;
            }}
            className={styles.track}
            data-dragging={dragging || undefined}
          >
            <span className={styles.trackFill} aria-hidden="true" />
            <span className={styles.budget} aria-hidden="true">
              <span>timeout budget</span>
            </span>
            <div
              className={styles.marker}
              role="slider"
              tabIndex={0}
              aria-label="Load against the resource limit"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(load * 100)}
              aria-valuetext={`${Math.round(load * 100)} percent of limit — ${reading.state}`}
              style={{ left: `calc(var(--load, 0.34) * 100%)` }}
              {...handlers}
            />
          </div>
        </div>
      </div>

      <ol className={styles.chain} aria-label="How a signal reaches you">
        {observabilityChain.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>
    </div>
  );
}
