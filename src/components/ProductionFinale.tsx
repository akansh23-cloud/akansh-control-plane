'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useJourney } from '@/components/JourneySystem';
import { RunReceipt } from '@/components/RunReceipt';
import { contact, site } from '@/content';
import { capsuleIdentity } from '@/lib/capsule';
import { finaleEligible, STAGES } from '@/lib/lifecycle';
import { usePrefersReducedMotion } from '@/lib/motion';
import styles from './ProductionFinale.module.css';

/**
 * TIDEWATER — the payoff.
 *
 * Eligibility is owned entirely by the run lifecycle: this component holds no
 * "already played" flag of its own, which is precisely the bug that made V8
 * replay unreliable. A new run is a new finale, every time, with no stale
 * timer able to close the following cycle.
 *
 * It is a sequence, not a toast: the route draws itself from Headwater to
 * Tidewater, the artifact arrives, the gates lock behind it, observability
 * comes online, and only then does the verdict resolve into the mark.
 */
export function ProductionFinale() {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const run = useJourney();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [step, setStep] = useState(0);
  const [playedRun, setPlayedRun] = useState(-1);

  const open = pathname === '/' && finaleEligible(run) && !run.openingActive;
  const runId = run.runId;

  /* A new run is a new finale. The step ladder is reset during render, so no
     frame of the previous run's ending can survive into this one. */
  if (open && playedRun !== runId) {
    setPlayedRun(runId);
    setStep(0);
  }

  const dismiss = useCallback(() => {
    run.markFinalePlayed();
  }, [run]);

  /* Choreography, keyed to this run. Every timer dies with the cycle. */
  useEffect(() => {
    if (!open) return;
    const marks = reduced ? [0, 30, 60, 90, 120] : [0, 420, 1350, 2250, 3050];
    const timers = marks.map((at, index) => window.setTimeout(() => setStep(index), at));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [open, reduced, runId]);

  /* Scroll lock, focus and Escape — all released on the same cleanup, so the
     body can never be left locked by a finale that is no longer on screen. */
  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 40);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      returnFocus.current?.focus?.();
    };
  }, [dismiss, open]);

  if (!open) return null;

  const gate = run.fault
    ? run.faultRemediated ? 'Refused, remediated, promoted' : 'Fault recorded'
    : 'Clean release path';
  const declared = run.drifted
    ? 'Drift still recorded'
    : run.reconciled ? 'Drift reconciled' : 'No drift introduced';
  const services = run.serviceDown
    ? `${run.extracted} extracted · fallback exercised`
    : `${run.extracted} services extracted`;
  const incident = run.incidentSolved
    ? `Contained after ${run.incidentAttempts} call${run.incidentAttempts === 1 ? '' : 's'}`
    : run.incidentAttempts
      ? `${run.incidentAttempts} unresolved call${run.incidentAttempts === 1 ? '' : 's'}`
      : 'No diagnosis recorded';

  return (
    <div
      ref={dialogRef}
      className={styles.root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="production-finale-title"
      data-run-id={runId}
      data-step={step}
      data-reduced-motion={reduced || undefined}
      tabIndex={-1}
    >
      <p className={styles.live} aria-live="polite">
        The release capsule, {capsuleIdentity(run.artifact).build}, reached production.
      </p>

      <div className={styles.stage} aria-hidden="true">
        <svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid meet">
          <path
            className={styles.route}
            d="M60 372H180V318H300V264H420V210H540V156H660V102H780V60H940"
          />
          {STAGES.map((item, index) => (
            <g key={item.id} className={styles.station} style={{ '--i': index } as React.CSSProperties}>
              <rect x={54 + index * 100} y={366 - index * 38} width="10" height="10" />
            </g>
          ))}
          <g className={styles.lockGates}>
            <rect x="878" y="30" width="6" height="60" />
            <rect x="896" y="30" width="6" height="60" />
          </g>
          {/* The capsule itself arrives here: it docks into the final chamber,
              receives its production approval, and becomes part of the mark. */}
          <g className={styles.capsule}>
            <path d="M898 44 H962 L972 54 V66 L962 76 H898 L888 66 V54 Z" />
            <rect className={styles.capsuleStrip} x="896" y="50" width="5" height="20" />
            <path className={styles.capsuleSeal} d="M918 62 l5 5 l9 -11" />
          </g>
          <g className={styles.signals}>
            <circle cx="120" cy="46" r="4" />
            <circle cx="146" cy="46" r="4" />
            <circle cx="172" cy="46" r="4" />
            <circle cx="198" cy="46" r="4" />
          </g>
        </svg>
        <span className={styles.monogram} aria-hidden="true">AM</span>
      </div>

      <div className={styles.receipt}>
        <p className={styles.verdict}>
          <span>Release accepted</span>
          <span className={styles.verdictSep} aria-hidden="true">·</span>
          <span>Production stable</span>
        </p>

        <h2 id="production-finale-title">The same artifact made it through.</h2>

        <p className={styles.artifact}>
          Release capsule · {capsuleIdentity(run.artifact).build} · run{' '}
          {String(runId).padStart(2, '0')}
        </p>

        <p className={styles.summary}>
          I build the systems that move software safely from code to production.
          This was the run you operated — carried from release engineering through
          platform state, routing, observability and incident response.
        </p>

        <dl className={styles.record}>
          <div><dt>Release gate</dt><dd>{gate}</dd></div>
          <div><dt>Declared state</dt><dd>{declared}</dd></div>
          <div><dt>Service path</dt><dd>{services}</dd></div>
          <div><dt>Incident room</dt><dd>{incident}</dd></div>
        </dl>

        <div className={styles.printer}>
          <p className="u-mark">Operator receipt</p>
          <RunReceipt />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={dismiss}>
            View run
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              dismiss();
              run.newRun();
              run.goTo('headwater');
            }}
          >
            Replay system
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              dismiss();
              window.scrollTo({ top: 0, behavior: 'auto' });
              run.playOpening();
            }}
          >
            Replay opening
          </button>
          <a className={styles.secondary} href={site.resumeRoute} onClick={dismiss}>
            Read résumé
          </a>
          <a className={styles.secondary} href={`mailto:${contact.email}`}>
            Contact Akansh
          </a>
        </div>
      </div>

      <p className={styles.horizonMark} aria-hidden="true">
        SOURCE → BUILD → GATES → REGISTRY → PRODUCTION → OBSERVABILITY
      </p>
    </div>
  );
}
