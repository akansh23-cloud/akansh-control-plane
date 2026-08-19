'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styles from './GamePortal.module.css';

export function GamePortal() {
  const pathname = usePathname();
  const router = useRouter();
  const [launching, setLaunching] = useState(false);

  if (pathname !== '/') return null;

  function launch() {
    if (launching) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setLaunching(true);
    window.setTimeout(() => router.push('/cloud-ops'), reduced ? 80 : 1050);
  }

  return (
    <>
      <button
        type="button"
        className={styles.portal}
        data-launching={launching || undefined}
        onClick={launch}
        aria-label="Enter BLACKOUT Cloud Ops incident room"
      >
        <span className={styles.beacon} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className={styles.copy}>
          <strong>PLAY CLOUD OPS</strong>
          <small>Enter the incident room</small>
        </span>
        <span className={styles.arrow} aria-hidden="true">↗</span>
      </button>

      {launching && (
        <div className={styles.handoff} role="status" aria-live="polite" aria-label="Opening Cloud Ops incident room">
          <div className={styles.handoffGrid} aria-hidden="true" />
          <div className={styles.handoffBeam} aria-hidden="true" />
          <div className={styles.handoffCore} aria-hidden="true">
            <span className={styles.orbitOne} />
            <span className={styles.orbitTwo} />
            <span className={styles.coreDot} />
          </div>
          <div className={styles.handoffCopy}>
            <span>CONTROL PLANE // PRIORITY INTERRUPT</span>
            <strong>INCIDENT CHANNEL<br />REQUESTED</strong>
            <div className={styles.handoffSteps} aria-hidden="true">
              <i>01</i><p>FREEZE PORTFOLIO STATE</p>
              <i>02</i><p>SEIZE OPERATOR CONSOLE</p>
              <i>03</i><p>OPEN BLACKOUT ROOM</p>
            </div>
          </div>
          <p className={styles.handoffFooter}>Do not refresh. Control is transferring.</p>
        </div>
      )}
    </>
  );
}
