'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useJourney } from '@/components/JourneySystem';
import { usePrefersReducedMotion } from '@/lib/motion';
import styles from './CommissioningIntro.module.css';

export const OPENING_STORAGE_KEY = 'lockworks:opening:v9';

/** The stations the opening spells out, in the order water travels them. */
const CHANNEL = ['SOURCE', 'BUILD', 'GATES', 'REGISTRY', 'PRODUCTION', 'OBSERVABILITY'];

/**
 * COMMISSIONING THE LOCKWORKS.
 *
 * Not a loading screen: nothing is being loaded and no invented percentage is
 * counted. It is the works being brought into service — survey lines, then
 * geometry, then a stamped artifact, then gates under pressure, then the
 * channel labelled, then the artifact moving once through it, and finally the
 * gates opening onto the real page behind them.
 *
 * The whole sequence is a ladder of timers keyed to `cycle`. Replay increments
 * the cycle, which remounts the section and restarts from step zero — there is
 * no way for a finished animation to be merely re-shown, and no timer from an
 * old cycle can dismiss a new one.
 */
export function CommissioningIntro() {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const run = useJourney();
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const bootstrapped = useRef(false);
  const [step, setStep] = useState(0);
  const [playedCycle, setPlayedCycle] = useState(0);

  const active = pathname === '/' && run.openingActive;
  const cycle = run.openingCycleId;

  /* Replay restarts from frame zero. Resetting during render rather than in
     an effect means a new cycle can never paint one frame of the finished
     state of the old one. */
  if (playedCycle !== cycle) {
    setPlayedCycle(cycle);
    setStep(0);
  }

  /* First paint is decided by the bootstrap in layout.tsx so the opening is
     never a hydration-dependent flash. React adopts that decision once. */
  useEffect(() => {
    if (bootstrapped.current || pathname !== '/') return;
    bootstrapped.current = true;
    if (document.documentElement.dataset.opening === 'commissioning') run.playOpening();
  }, [pathname, run]);

  const finish = useCallback(() => {
    try {
      window.sessionStorage.setItem(OPENING_STORAGE_KEY, 'seen');
    } catch {
      /* The experience still works without storage. */
    }
    document.documentElement.dataset.opening = 'ready';
    run.endOpening();
  }, [run]);

  /* The choreography. Every timer belongs to this cycle and dies with it. */
  useEffect(() => {
    if (!active) return;

    const marks = reduced
      ? [0, 40, 90, 140, 190, 240, 300, 900]
      : [0, 260, 900, 1500, 2150, 2900, 3700, 4600];

    const timers = marks.map((at, index) =>
      window.setTimeout(() => setStep(index), at),
    );
    const exit = window.setTimeout(finish, reduced ? 1250 : 5400);
    const focus = window.setTimeout(() => skipRef.current?.focus(), 90);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(exit);
      window.clearTimeout(focus);
      document.removeEventListener('keydown', onKey);
    };
  }, [active, cycle, finish, reduced]);

  /* The document element carries the state so the page behind can be held
     still without the overlay having to own body scroll. */
  useEffect(() => {
    if (pathname !== '/') return;
    document.documentElement.dataset.opening = active ? 'commissioning' : 'ready';
  }, [active, pathname]);

  if (pathname !== '/' || !active) return null;

  return (
    <section
      key={cycle}
      className={styles.root}
      role="dialog"
      aria-modal="true"
      aria-label="Commissioning the Lockworks"
      data-cycle={cycle}
      data-step={step}
      data-reduced-motion={reduced || undefined}
    >
      <div className={styles.field} aria-hidden="true">
        <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
          <g className={styles.survey}>
            <path d="M0 140H1200M0 350H1200M0 560H1200" />
            <path d="M200 0V700M600 0V700M1000 0V700" />
          </g>
          <path
            className={styles.lockTrace}
            d="M150 596H330V470H510V344H690V218H870V96H1050"
          />
          <g className={styles.chambers}>
            <rect x="150" y="470" width="180" height="126" />
            <rect x="330" y="344" width="180" height="126" />
            <rect x="510" y="218" width="180" height="126" />
            <rect x="690" y="96" width="180" height="122" />
          </g>
          <path className={styles.datumLine} d="M96 596V96M84 596H108M84 96H108" />
        </svg>
      </div>

      <div className={styles.pressure} aria-hidden="true" />

      <div className={styles.artifact} aria-hidden="true">
        <span className={styles.artifactCore} />
        <span className={styles.artifactStamp}>AM</span>
      </div>

      <ol className={styles.channel} aria-hidden="true">
        {CHANNEL.map((label, index) => (
          <li key={label} style={{ '--i': index } as React.CSSProperties}>
            {label}
          </li>
        ))}
      </ol>

      <div className={styles.plaque}>
        <p className={styles.eyebrow}>COMMISSIONING THE WORKS</p>
        <p className={styles.owner}>AKANSH MOWAR</p>
        <p className={styles.mark}>THE LOCKWORKS</p>
        <p className={styles.role}>DEVOPS · PLATFORM · CLOUD ENGINEER</p>
        <p className={styles.premise}>
          Moving software safely from source to production.
        </p>
      </div>

      <div className={`${styles.gate} ${styles.gateLeft}`} aria-hidden="true"><span /></div>
      <div className={`${styles.gate} ${styles.gateRight}`} aria-hidden="true"><span /></div>

      <p className={styles.datum} aria-hidden="true">DATUM 00 · RELEASE CHANNEL</p>

      <button ref={skipRef} type="button" className={styles.skip} onClick={finish}>
        Skip opening
      </button>
    </section>
  );
}
