'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useJourney } from '@/components/JourneySystem';
import { usePrefersReducedMotion } from '@/lib/motion';
import styles from './OperatorChallenge.module.css';

type Mission = {
  id: string;
  no: string;
  plate: string;
  place: string;
  title: string;
  instruction: string;
  done: boolean;
};

/**
 * BLACKWATER DRILL — an optional game layer built out of the real simulations.
 *
 * There are deliberately no points, coins, timers or invented reliability
 * scores. Progress is earned only by doing the engineering the portfolio is
 * trying to demonstrate: let a policy gate refuse a bad release and recover it,
 * create and reconcile drift, prove service fallback, diagnose from evidence,
 * then carry the same artifact to Tidewater.
 */
export function OperatorChallenge() {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const run = useJourney();
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(false);

  const missions = useMemo<Mission[]>(
    () => [
      {
        id: 'gate',
        no: '01',
        plate: 'flight',
        place: 'The Flight',
        title: 'Contain a refused release',
        instruction:
          'Break the release at any real gate. Let it stop. Apply the fix and keep the same artifact moving.',
        done: Boolean(run.fault && run.faultRemediated),
      },
      {
        id: 'gitops',
        no: '02',
        plate: 'basin',
        place: 'The Basin',
        title: 'Restore declared state',
        instruction:
          'Open the GitOps view, edit the cluster by hand, then let reconciliation return live state to Git.',
        done: run.reconciled,
      },
      {
        id: 'fallback',
        no: '03',
        plate: 'split',
        place: 'The Split',
        title: 'Prove the fallback path',
        instruction:
          'Take one extracted service out of service. The request must keep moving instead of disappearing.',
        done: run.serviceDown,
      },
      {
        id: 'incident',
        no: '04',
        plate: 'watch',
        place: 'The Watch',
        title: 'Call the incident from evidence',
        instruction:
          'Read the signals before choosing an explanation. Contain the incident by making the call the evidence supports.',
        done: run.incidentSolved,
      },
      {
        id: 'production',
        no: '05',
        plate: 'tidewater',
        place: 'Tidewater',
        title: 'Clear the works to production',
        instruction:
          'Carry this exact artifact through the final lock. Nothing may be swapped out between the gate and production.',
        done: run.productionReached,
      },
    ],
    [
      run.fault,
      run.faultRemediated,
      run.incidentSolved,
      run.productionReached,
      run.reconciled,
      run.serviceDown,
    ],
  );

  const completed = missions.filter((mission) => mission.done).length;
  const current = missions.find((mission) => !mission.done) ?? missions[missions.length - 1];
  const cleared = completed === missions.length;

  if (pathname !== '/') return null;

  const go = (plate = current.plate) => {
    setOpen(false);
    document.getElementById(plate)?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const start = () => {
    run.reset();
    run.launch();
    setActive(true);
    setOpen(true);
  };

  if (!active) {
    return (
      <aside className={styles.launcher} aria-label="Optional operator challenge">
        <button type="button" className={styles.launchButton} onClick={start}>
          <span className={styles.launchMark} aria-hidden="true">
            BW
          </span>
          <span>
            <strong>Blackwater Drill</strong>
            <small>5 engineering checks · no score</small>
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={styles.root}
      data-cleared={cleared || undefined}
      data-open={open || undefined}
      aria-label="Blackwater operator challenge"
      style={{ '--drill-progress': completed / missions.length } as React.CSSProperties}
    >
      <button
        type="button"
        className={styles.bar}
        aria-expanded={open}
        aria-controls="blackwater-drill-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.insignia} aria-hidden="true">
          <span>BW</span>
        </span>
        <span className={styles.barCopy}>
          <span className={styles.eyebrow}>{cleared ? 'DRILL CLEARED' : 'BLACKWATER DRILL · LIVE'}</span>
          <strong>{cleared ? 'Operator run accepted' : current.title}</strong>
        </span>
        <span className={styles.count}>{completed} / {missions.length}</span>
      </button>

      <div id="blackwater-drill-panel" className={styles.panel} hidden={!open}>
        <div className={styles.progress} aria-hidden="true">
          <span className={styles.progressFill} />
          {missions.map((mission, index) => (
            <span
              key={mission.id}
              className={styles.progressMark}
              data-done={mission.done || undefined}
              data-current={mission.id === current.id && !cleared ? '' : undefined}
              style={{ left: `${(index / (missions.length - 1)) * 100}%` }}
            />
          ))}
        </div>

        {cleared ? (
          <div className={styles.clearance}>
            <p className={styles.clearanceMark} aria-hidden="true">
              <span>05/05</span>
            </p>
            <div>
              <p className={styles.eyebrow}>OPERATING DISCIPLINE VERIFIED</p>
              <h2>Nothing was bypassed.</h2>
              <p>
                You contained a bad release, restored declared state, proved fallback,
                diagnosed from evidence and delivered the same artifact to production.
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.mission} aria-live="polite">
            <p className={styles.missionMeta}>
              Mission {current.no} · {current.place}
            </p>
            <h2>{current.title}</h2>
            <p>{current.instruction}</p>
            <button type="button" className={styles.go} onClick={() => go()}>
              Go to {current.place}
            </button>
          </div>
        )}

        <ol className={styles.checks}>
          {missions.map((mission) => (
            <li key={mission.id} data-done={mission.done || undefined}>
              <span className={styles.checkNo}>{mission.no}</span>
              <button type="button" onClick={() => go(mission.plate)}>
                <span>{mission.title}</span>
                <small>{mission.done ? 'cleared' : mission.place}</small>
              </button>
            </li>
          ))}
        </ol>

        <div className={styles.footer}>
          <p>No leaderboard. No fake reliability score. The system itself is the test.</p>
          <button
            type="button"
            className={styles.exit}
            onClick={() => {
              setActive(false);
              setOpen(false);
            }}
          >
            Exit drill
          </button>
        </div>
      </div>
    </aside>
  );
}
