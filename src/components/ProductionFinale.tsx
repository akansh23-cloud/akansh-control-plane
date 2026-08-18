'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useJourney } from '@/components/JourneySystem';
import { usePrefersReducedMotion } from '@/lib/motion';
import styles from './ProductionFinale.module.css';

/**
 * The one deliberately theatrical moment in V7.
 *
 * The nine plates are working drawings; Tidewater is where the drawing stops
 * being a drawing. Once the visitor's release reaches the last plate, the lock
 * doors part, the artifact crosses the sill and the site returns a release
 * record. This is CSS choreography because the geometry is fixed; no second
 * animation loop is introduced.
 *
 * The finale is intentionally once-per-page-session after dismissal. Replaying
 * the portfolio should not repeatedly seize the viewport from someone who has
 * already seen the ending.
 */
export function ProductionFinale() {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const run = useJourney();
  const [dismissed, setDismissed] = useState(false);

  if (pathname !== '/' || !run.productionReached || dismissed) return null;

  const gateResult = run.fault
    ? run.faultRemediated
      ? 'Fault met · remediated'
      : 'Fault recorded'
    : 'Clean release path';
  const gitopsResult = run.drifted
    ? 'Drift still recorded'
    : run.reconciled
      ? 'Drift reconciled'
      : 'No drift introduced';
  const serviceResult = run.serviceDown
    ? `${run.extracted} extracted · fallback exercised`
    : `${run.extracted} services extracted`;
  const incidentResult = run.incidentSolved
    ? `Contained after ${run.incidentAttempts} call${run.incidentAttempts === 1 ? '' : 's'}`
    : run.incidentAttempts
      ? `${run.incidentAttempts} unresolved call${run.incidentAttempts === 1 ? '' : 's'}`
      : 'No diagnosis recorded';

  return (
    <section className={styles.root} aria-labelledby="production-finale-title">
      <p className={styles.live} aria-live="polite">
        Release {run.artifact} reached production.
      </p>

      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.water} aria-hidden="true">
        <span className={styles.waterLine} />
        <span className={styles.wakeOne} />
        <span className={styles.wakeTwo} />
      </div>

      <div className={`${styles.gate} ${styles.gateLeft}`} aria-hidden="true">
        <span className={styles.gateBrace} />
        <span className={styles.gateNumber}>09</span>
      </div>
      <div className={`${styles.gate} ${styles.gateRight}`} aria-hidden="true">
        <span className={styles.gateBrace} />
        <span className={styles.gateNumber}>PROD</span>
      </div>

      <div className={styles.release} aria-hidden="true">
        <span />
      </div>

      <div className={styles.receipt}>
        <p className={styles.eyebrow}>TIDEWATER · RELEASE ACCEPTED</p>
        <h2 id="production-finale-title">The same artifact made it through.</h2>
        <p className={styles.artifact}>{run.artifact}</p>
        <p className={styles.summary}>
          Not a slideshow of nine unrelated demos: this is the run you operated,
          carried from release engineering through platform state, routing,
          observability and incident response.
        </p>

        <dl className={styles.record}>
          <div>
            <dt>Release gate</dt>
            <dd>{gateResult}</dd>
          </div>
          <div>
            <dt>Declared state</dt>
            <dd>{gitopsResult}</dd>
          </div>
          <div>
            <dt>Service path</dt>
            <dd>{serviceResult}</dd>
          </div>
          <div>
            <dt>Incident room</dt>
            <dd>{incidentResult}</dd>
          </div>
        </dl>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => setDismissed(true)}>
            Open Tidewater
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              setDismissed(true);
              run.reset();
              document.getElementById('headwater')?.scrollIntoView({
                behavior: reduced ? 'auto' : 'smooth',
                block: 'start',
              });
            }}
          >
            Run another release
          </button>
        </div>
      </div>

      <p className={styles.horizonMark} aria-hidden="true">
        SOURCE → BUILD → GATES → REGISTRY → PRODUCTION → OBSERVABILITY
      </p>
    </section>
  );
}
