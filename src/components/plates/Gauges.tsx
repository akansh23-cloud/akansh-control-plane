'use client';

import { useCallback, useEffect, useState } from 'react';
import { Fold } from '@/components/Fold';
import { useJourney } from '@/components/JourneySystem';
import {
  causalAt,
  causalChain,
  decisionAt,
  gauges,
  observabilityChain,
  readAt,
} from '@/content';
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
 * V7 keeps the deterministic model, but its starting point can now inherit
 * stress from the visitor's own upstream run. That is narrative state, not
 * production telemetry, and the UI says so explicitly. Once the visitor moves
 * the load control, their hand owns the model again.
 */

export function Gauges() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();
  const journey = useJourney();

  const [load, setLoad] = useState(0.34);
  const [controlled, setControlled] = useState(false);
  /* Inherited load is derived state, not state copied by an effect. This keeps
     the React layer semantic and lets upstream actions remain the source. */
  const effectiveLoad = controlled || !journey.launched ? load : journey.signalSeed;
  const reading = readAt(effectiveLoad);
  /* The same load, read as a chain of causes rather than four dials. */
  const chain = causalAt(effectiveLoad);
  const decision = decisionAt(effectiveLoad);

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

  /* The physical marker follows whichever semantic source currently owns the
     model. This effect only writes to the motion runtime; it never copies React
     state into more React state. */
  useEffect(() => {
    rig.set('load', effectiveLoad, 'hydraulic');
  }, [effectiveLoad, rig]);

  const move = useCallback(
    (next: number) => {
      setControlled(true);
      setLoad(next);
      rig.set('load', next, 'hydraulic');
    },
    [rig],
  );

  const { trackRef, dragging, handlers } = useAxisDrag('x', effectiveLoad, move, {
    step: 0.06,
    detents: [0, 0.5, 0.75, 1],
    snap: 0.035,
    onCommit: (value) => {
      const state = readAt(value).state;
      journey.telemetryChanged(
        value,
        state === 'shedding' ? 'critical' : state === 'degrading' ? 'degrading' : 'healthy',
      );
    },
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

  const inherited = journey.launched && !controlled && journey.signalSeed > 0.345;

  return (
    <div ref={rootRef} className={styles.root} data-state={reading.state}>
      {inherited ? (
        <p className="u-note">
          Run context · Earlier operator actions seeded this simulation at{' '}
          {Math.round(journey.signalSeed * 100)}% of the modeled limit. This is
          narrative carry-over, not production telemetry; move the control to take over.
        </p>
      ) : null}

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
              aria-valuenow={Math.round(effectiveLoad * 100)}
              aria-valuetext={`${Math.round(effectiveLoad * 100)} percent of limit — ${reading.state}`}
              style={{ left: `calc(var(--load, 0.34) * 100%)` }}
              {...handlers}
            />
          </div>
        </div>
      </div>

      <section className={styles.causal} aria-labelledby="gauges-causal">
        <div className={styles.causalHead}>
          <p className="u-mark" id="gauges-causal">
            What moves next, and why
          </p>
          <p className={styles.decision} aria-live="polite">
            {decision}
          </p>
        </div>

        <ol className={styles.links}>
          {causalChain.map((link, i) => {
            const state = chain[i];
            return (
              <li
                key={link.id}
                className={styles.link}
                data-state={state.state}
                style={{ '--intensity': state.intensity } as React.CSSProperties}
              >
                <span className={styles.linkPipe} aria-hidden="true" />
                <span className={styles.linkNo}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.linkName}>{link.name}</span>
                <span className={styles.linkValue}>{state.value}</span>
                <span className={styles.linkWhat}>{link.what}</span>
                <span className={styles.linkBecause}>{link.because}</span>
                <span className={styles.linkSeen}>{link.seenIn}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <Fold label="How a signal reaches you" hint={`${observabilityChain.length} hops`}>
        <ol className={styles.chain}>
          {observabilityChain.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
      </Fold>
    </div>
  );
}
