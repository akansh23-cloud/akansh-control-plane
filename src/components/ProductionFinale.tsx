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

const PARTICLES = [
  ['8%', '22%', '0s'], ['15%', '64%', '1.7s'], ['24%', '34%', '3.1s'],
  ['34%', '74%', '0.8s'], ['43%', '18%', '4.2s'], ['52%', '67%', '2.2s'],
  ['62%', '27%', '1.1s'], ['71%', '78%', '3.8s'], ['79%', '42%', '2.8s'],
  ['88%', '20%', '4.8s'], ['92%', '70%', '1.9s'], ['57%', '48%', '5.4s'],
] as const;

/**
 * TIDEWATER — the payoff.
 *
 * Eligibility is owned entirely by the run lifecycle: this component holds no
 * "already played" flag of its own. A new run is a new finale, every time.
 *
 * The visual sequence is intentionally compositor-led. The finale may be rich,
 * but it must never bring back the scroll/runtime jank that the rest of the
 * portfolio avoids: continuous effects are transforms/opacity only and exist
 * only while this modal is mounted.
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

  if (open && playedRun !== runId) {
    setPlayedRun(runId);
    setStep(0);
  }

  const dismiss = useCallback(() => {
    run.markFinalePlayed();
  }, [run]);

  useEffect(() => {
    if (!open) return;
    const marks = reduced ? [0, 30, 60, 90, 120] : [0, 420, 1350, 2250, 3050];
    const timers = marks.map((at, index) => window.setTimeout(() => setStep(index), at));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [open, reduced, runId]);

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

  const identity = capsuleIdentity(run.artifact);
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
        The release capsule, {identity.build}, reached production.
      </p>

      <div className={styles.ambient} aria-hidden="true">
        <span className={styles.scanBeam} />
        <span className={styles.edgeGlow} />
        {PARTICLES.map(([left, top, delay], index) => (
          <span
            key={`${left}-${top}`}
            className={styles.particle}
            style={{
              '--px': left,
              '--py': top,
              '--pd': delay,
              '--ps': `${0.7 + (index % 4) * 0.22}`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className={styles.stage} aria-hidden="true">
        <div className={styles.stageReadout}>
          <span>CONTROL PLANE · PRODUCTION</span>
          <span>RUN {String(runId).padStart(2, '0')} · {identity.build.toUpperCase()}</span>
        </div>

        <svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid meet">
          <path
            className={styles.routeGlow}
            d="M60 372H180V318H300V264H420V210H540V156H660V102H780V60H940"
          />
          <path
            className={styles.route}
            d="M60 372H180V318H300V264H420V210H540V156H660V102H780V60H940"
          />
          <path
            className={styles.routeFlow}
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

        <div className={styles.radar}>
          <span className={styles.radarRingA} />
          <span className={styles.radarRingB} />
          <span className={styles.radarSweep} />
        </div>
        <span className={styles.monogram}>AM</span>
      </div>

      <div className={styles.receipt}>
        <p className={styles.verdict}>
          <span>Release accepted</span>
          <span className={styles.verdictSep} aria-hidden="true">·</span>
          <span>Production stable</span>
        </p>

        <h2 id="production-finale-title">The same artifact made it through.</h2>

        <p className={styles.artifact}>
          Release capsule · {identity.build} · run {String(runId).padStart(2, '0')}
        </p>

        <p className={styles.summary}>
          I build the systems that move software safely from code to production.
          This was the run you operated — carried from release engineering through
          platform state, routing, observability and incident response.
        </p>

        <dl className={styles.record}>
          <div data-kind="gate">
            <span className={styles.recordIcon} aria-hidden="true">◇</span>
            <dt>Release gate</dt><dd>{gate}</dd>
          </div>
          <div data-kind="state">
            <span className={styles.recordIcon} aria-hidden="true">⚑</span>
            <dt>Declared state</dt><dd>{declared}</dd>
          </div>
          <div data-kind="service">
            <span className={styles.recordIcon} aria-hidden="true">⬡</span>
            <dt>Service path</dt><dd>{services}</dd>
          </div>
          <div data-kind="incident">
            <span className={styles.recordIcon} aria-hidden="true">⌁</span>
            <dt>Incident room</dt><dd>{incident}</dd>
          </div>
        </dl>

        <div className={styles.printer}>
          <p className={styles.printerLabel}>Operator receipt</p>
          <div className={styles.ticketStage}>
            <span className={styles.ticketOrbitA} aria-hidden="true" />
            <span className={styles.ticketOrbitB} aria-hidden="true" />
            <span className={styles.ticketPulse} aria-hidden="true" />
            <RunReceipt />
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={dismiss}>
            View run <span aria-hidden="true">›</span>
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
          <a className={`${styles.secondary} ${styles.contact}`} href={`mailto:${contact.email}`}>
            Contact Akansh
          </a>
        </div>
      </div>

      <p className={styles.horizonMark} aria-hidden="true">
        SOURCE · BUILD · GATES · REGISTRY · PRODUCTION · OBSERVABILITY
      </p>
    </div>
  );
}
