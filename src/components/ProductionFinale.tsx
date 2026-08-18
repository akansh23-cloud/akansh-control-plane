'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useJourney } from '@/components/JourneySystem';
import { usePrefersReducedMotion } from '@/lib/motion';
import styles from './ProductionFinale.module.css';

/**
 * Tidewater is once per semantic run, not once per mounted page. A run becomes
 * finale-eligible only after The Flight has genuinely cleared and that same run
 * reaches Tidewater. Merely jumping to the anchor can no longer manufacture a
 * finale.
 */
export function ProductionFinale() {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const run = useJourney();
  const [runId, setRunId] = useState(0);
  const [releaseClearedForRunId, setReleaseClearedForRunId] = useState<number | null>(null);
  const [finalePlayedForRunId, setFinalePlayedForRunId] = useState<number | null>(null);
  const wasStarted = useRef(false);

  useEffect(() => {
    if (!run.launched) {
      wasStarted.current = false;
      return;
    }
    if (wasStarted.current) return;
    wasStarted.current = true;
    setRunId((id) => id + 1);
  }, [run.launched]);

  useEffect(() => {
    if (runId === 0) return;
    if (run.events.some((event) => event.key === 'release-complete')) {
      setReleaseClearedForRunId(runId);
    }
  }, [run.events, runId]);

  const runStarted = run.launched && runId > 0;
  const runCompleted =
    runStarted &&
    run.currentStage === 'tidewater' &&
    run.productionReached &&
    releaseClearedForRunId === runId;

  useEffect(() => {
    if (pathname !== '/') return;
    const html = document.documentElement;
    html.dataset.runId = String(runId);
    html.dataset.runStarted = String(runStarted);
    html.dataset.runCompleted = String(runCompleted);
    html.dataset.finalePlayedForRunId = finalePlayedForRunId === null ? '' : String(finalePlayedForRunId);
    return () => {
      delete html.dataset.runId;
      delete html.dataset.runStarted;
      delete html.dataset.runCompleted;
      delete html.dataset.finalePlayedForRunId;
    };
  }, [finalePlayedForRunId, pathname, runCompleted, runId, runStarted]);

  if (pathname !== '/' || !runCompleted || finalePlayedForRunId === runId) return null;

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

  const dismiss = () => setFinalePlayedForRunId(runId);

  return (
    <section className={styles.root} aria-labelledby="production-finale-title" data-run-id={runId}>
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

      <div className={styles.release} aria-hidden="true"><span /></div>

      <div className={styles.receipt}>
        <p className={styles.eyebrow}>TIDEWATER · RELEASE ACCEPTED · RUN {String(runId).padStart(2, '0')}</p>
        <h2 id="production-finale-title">The same artifact made it through.</h2>
        <p className={styles.artifact}>{run.artifact}</p>
        <p className={styles.summary}>
          Not a slideshow of nine unrelated demos: this is the run you operated,
          carried from release engineering through platform state, routing,
          observability and incident response.
        </p>

        <dl className={styles.record}>
          <div><dt>Release gate</dt><dd>{gateResult}</dd></div>
          <div><dt>Declared state</dt><dd>{gitopsResult}</dd></div>
          <div><dt>Service path</dt><dd>{serviceResult}</dd></div>
          <div><dt>Incident room</dt><dd>{incidentResult}</dd></div>
        </dl>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={dismiss}>
            Open Tidewater
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              dismiss();
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
