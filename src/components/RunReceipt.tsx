'use client';

import { useJourney } from '@/components/JourneySystem';
import { capsuleIdentity } from '@/lib/capsule';
import { receiptText, runReceipt } from '@/lib/lifecycle';
import styles from './RunReceipt.module.css';

/**
 * THE OPERATOR RECEIPT.
 *
 * Printed at the end of a run, from counters the reducer incremented while the
 * visitor was working. That is the important property: the receipt cannot
 * claim an action nobody performed, because there is no code path that writes
 * a line without a counter behind it.
 *
 * A run where somebody only sent one clean release prints one line. That is
 * the correct receipt for that run.
 */
export function RunReceipt() {
  const run = useJourney();
  const identity = capsuleIdentity(run.artifact);
  const lines = runReceipt(run);

  return (
    <div className={styles.root} role="group" aria-label="Run receipt">
      <div className={styles.perfTop} aria-hidden="true" />

      <div className={styles.sheet}>
        <p className={styles.mark}>LOCKWORKS</p>
        <p className={styles.run}>
          RUN {String(Math.max(1, run.runId)).padStart(2, '0')} COMPLETE
        </p>

        <div className={styles.rule} aria-hidden="true" />

        <p className={styles.capsuleKicker}>{identity.name.toUpperCase()}</p>
        <p className={styles.capsuleSubject}>{identity.subject}</p>
        <p className={styles.capsuleBuild}>{identity.build.toUpperCase()}</p>

        <div className={styles.rule} aria-hidden="true" />

        <ul className={styles.lines}>
          {lines.map((line) => (
            <li key={line.label}>{receiptText(line)}</li>
          ))}
          {run.productionReached ? <li data-strong="">PRODUCTION REACHED</li> : null}
        </ul>

        {lines.length === 0 ? (
          <p className={styles.thin}>NO OPERATOR ACTION RECORDED</p>
        ) : null}

        <div className={styles.rule} aria-hidden="true" />

        <p className={styles.foot}>
          RECORD DERIVED FROM THIS SESSION ONLY · SIMULATION · NOT PRODUCTION DATA
        </p>
      </div>

      <div className={styles.perfBottom} aria-hidden="true" />
    </div>
  );
}
