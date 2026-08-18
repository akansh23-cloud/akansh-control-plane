'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { usePrefersReducedMotion } from '@/lib/motion';
import styles from './CommissioningIntro.module.css';

const STORAGE_KEY = 'lockworks:opening:v8';

/**
 * The opening is part of the works, not a detached loading screen. A tiny
 * bootstrap in layout.tsx chooses whether the first paint is commissioned or
 * ready; this component only choreographs and dismisses that already-rendered
 * state. No network work and no fake progress are involved.
 */
export function CommissioningIntro() {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const cycleRef = useRef(0);
  const [cycle, setCycle] = useState(0);
  const [replaying, setReplaying] = useState(false);

  const finish = useCallback(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, 'seen');
    } catch {
      // The experience still works when storage is unavailable.
    }
    setReplaying(false);
    document.documentElement.dataset.opening = 'ready';
  }, []);

  useEffect(() => {
    const opening =
      pathname === '/' &&
      (replaying || document.documentElement.dataset.opening === 'commissioning');
    if (!opening) return;

    const scheduledCycle = cycleRef.current;
    const focusTimer = window.setTimeout(() => {
      if (cycleRef.current === scheduledCycle) skipRef.current?.focus();
    }, 80);
    const exitTimer = window.setTimeout(() => {
      /* A previous commissioning cycle may still have a queued timer when a
         recruiter presses Replay at exactly the old cycle boundary. It must
         never be allowed to dismiss the newly commissioned cycle. */
      if (cycleRef.current === scheduledCycle) finish();
    }, reduced ? 1200 : 3600);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };

    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.clearTimeout(exitTimer);
      document.removeEventListener('keydown', onKey);
    };
  }, [cycle, finish, pathname, reduced, replaying]);

  if (pathname !== '/') return null;

  const replay = () => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage is only a convenience; replay does not depend on it.
    }
    cycleRef.current += 1;
    document.documentElement.dataset.opening = 'commissioning';
    setReplaying(true);
    setCycle(cycleRef.current);
  };

  return (
    <>
      <section
        key={cycle}
        className={styles.root}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lockworks-opening-title"
        aria-label="Commissioning the Lockworks"
        data-cycle={cycle}
        data-replaying={replaying || undefined}
        data-reduced-motion={reduced || undefined}
        /* First paint is controlled by the bootstrap/CSS contract. Replay is
           additionally owned by React so a DOM attribute race can never hide
           a recruiter-triggered encore. */
        style={{
          background: 'transparent',
          animation: 'none',
          display: replaying ? 'grid' : undefined,
        }}
      >
        <div className={styles.grid} aria-hidden="true">
          <svg viewBox="0 0 1200 700" preserveAspectRatio="none">
            <path className={styles.surveyLine} d="M70 108H1130M70 350H1130M70 592H1130" />
            <path className={styles.surveyLineSlow} d="M210 42V658M600 42V658M990 42V658" />
            <path className={styles.lockTrace} d="M210 515H410V400H600V286H790V172H990" />
            <path className={styles.dimension} d="M142 554V152M132 554H152M132 152H152" />
          </svg>
        </div>

        <div className={styles.pressure} aria-hidden="true" />
        <div className={`${styles.gate} ${styles.gateLeft}`} aria-hidden="true">
          <span />
        </div>
        <div className={`${styles.gate} ${styles.gateRight}`} aria-hidden="true">
          <span />
        </div>

        <div className={styles.artifact} aria-hidden="true">
          <span className={styles.artifactCore} />
          <span className={styles.artifactStamp}>AM</span>
        </div>

        <div className={styles.plaque}>
          <p className={styles.eyebrow}>COMMISSIONING THE WORKS</p>
          <p className={styles.owner}>AKANSH MOWAR</p>
          <h2 id="lockworks-opening-title">THE LOCKWORKS</h2>
          <p className={styles.role}>DEVOPS · PLATFORM · CLOUD ENGINEER</p>
          <p className={styles.ready}><span aria-hidden="true" /> SYSTEM READY</p>
        </div>

        <p className={styles.datum} aria-hidden="true">DATUM 00 · RELEASE CHANNEL</p>
        <button ref={skipRef} type="button" className={styles.skip} onClick={finish}>
          Skip opening
        </button>
      </section>

      <button type="button" className={styles.replay} onClick={replay} aria-label="Replay opening">
        Replay opening
      </button>
    </>
  );
}
