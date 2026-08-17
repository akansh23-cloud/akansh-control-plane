'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { chambers, faults, workloadFittings } from '@/content';
import {
  usePaint,
  usePointerField,
  usePrefersReducedMotion,
  useRig,
  useRigRoot,
  useTier,
  useVars,
  useViewport,
} from '@/lib/motion';
import styles from './Flight.module.css';

/**
 * PLATE 02 — THE FLIGHT. Signature interaction, release engineering.
 *
 * The rejected version drew five beige rectangles inside an enormous empty
 * frame and called it a lock flight. This one drops the frame entirely. The
 * nine chambers are DOM elements that fill with water, sized by their own
 * content, and the readout underneath them is large enough to read at arm's
 * length on a phone.
 *
 * The engineering point: a release does not fall into production, it is
 * lifted through gates, and a gate that refuses is the system working. You
 * can break it on purpose in three different places, and each break behaves
 * the way that break actually behaves — the CVE never reaches a cluster, the
 * migration holds before deployment rather than half-applying, and the
 * readiness failure rolls back with the previous release still serving.
 */

type Mode = 'idle' | 'running' | 'held' | 'recovering';
type Phase = Mode | 'complete';

const LAST = chambers.length; /* flow value once every chamber is full */

export function Flight() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();

  const [stage, setStage] = useState(0);
  const [mode, setMode] = useState<Mode>('idle');
  const [faultId, setFaultId] = useState<string | null>(null);

  const rig = useRig({
    channels: {
      flow: { value: 0, family: 'release' },
      pointerX: { value: 0.5, family: 'mechanical' },
      pointerY: { value: 0.5, family: 'mechanical' },
      pointerIn: { value: 0, family: 'mechanical' },
    },
    reduced,
    tier,
  });

  const rootRef = useRigRoot<HTMLDivElement>(rig);
  const pointerRef = usePointerField(rig);

  const fault = useMemo(
    () => faults.find((f) => f.id === faultId) ?? null,
    [faultId],
  );
  const faultAt = useMemo(
    () => (fault ? chambers.findIndex((c) => c.id === fault.at) : -1),
    [fault],
  );

  /* Every chamber's water level is derived from one channel, so nine
     chambers cost one spring and zero React renders per frame. */
  const ladderRef = useVars<HTMLOListElement>(rig, {
    '--flow': (r) => r.get('flow'),
  });

  const wakeRef = usePaint<SVGPathElement>(rig, (el, r) => {
    /* The rising edge of the water in the chamber currently filling. */
    const f = r.get('flow');
    const local = f - Math.floor(f);
    el.setAttribute('opacity', (local > 0.02 && local < 0.98 ? 0.85 : 0).toFixed(3));
    el.setAttribute(
      'transform',
      `translate(0 ${(1 - local) * 100})`,
    );
  });

  /* Completion is a fact about the stage, not a fifth stored state — which
     keeps every effect below free of a synchronous setState. */
  const complete = mode !== 'idle' && stage >= LAST;
  const phase: Phase = complete ? 'complete' : mode;

  /* Drive the water toward the next gate whenever the stage changes. */
  useEffect(() => {
    if (mode === 'idle' || mode === 'held') return;
    if (stage >= LAST) return;

    if (mode === 'running' && faultAt === stage) {
      /* The gate refuses. Motion is arrested, not shaken. */
      rig.set('flow', stage + 0.42, 'failure');
      return;
    }

    rig.set(
      'flow',
      stage + 1,
      mode === 'recovering' ? 'recovery' : 'release',
      /* One chamber every half second: nine gates is a five second story,
         which is about as long as anyone will watch one. */
      mode === 'recovering' ? 0.42 : 0.2,
    );
  }, [rig, stage, mode, faultAt]);

  /* Arriving at the refusing gate is a threshold, so it is handled where all
     other thresholds are handled: in the rig's watcher, not in an effect. */
  useEffect(() => {
    if (mode !== 'running' || faultAt !== stage) return;
    return rig.watch({
      read: (r) => r.get('flow'),
      at: stage + 0.4,
      dir: 'up',
      fire: () => setMode('held'),
    });
  }, [rig, stage, mode, faultAt]);

  /* One watcher at a time: it fires when the water finishes a chamber. */
  useEffect(() => {
    if (mode !== 'running' && mode !== 'recovering') return;
    if (stage >= LAST) return;

    return rig.watch({
      read: (r) => r.get('flow'),
      at: stage + 0.96,
      dir: 'up',
      fire: () => {
        setStage((s) => Math.min(LAST, s + 1));
        setMode('running');
      },
    });
  }, [rig, stage, mode]);

  const run = useCallback(
    (id: string | null) => {
      rig.jump('flow', 0);
      setFaultId(id);
      setStage(0);
      setMode('running');
    },
    [rig],
  );

  const remediate = useCallback(() => {
    setFaultId(null);
    setMode('recovering');
    rig.set('flow', stage + 1, 'recovery');
  }, [rig, stage]);

  const reset = useCallback(() => {
    rig.jump('flow', 0);
    setFaultId(null);
    setStage(0);
    setMode('idle');
  }, [rig]);

  const active = stage < LAST ? chambers[stage] : chambers[LAST - 1];

  const lamp =
    phase === 'held'
      ? 'fault'
      : phase === 'complete'
        ? 'ok'
        : phase === 'recovering'
          ? 'hold'
          : phase === 'running'
            ? 'running'
            : 'idle';

  const headline =
    phase === 'idle'
      ? 'System ready'
      : phase === 'held'
        ? `Held at ${active.name}`
        : phase === 'recovering'
          ? `Recovering at ${active.name}`
          : phase === 'complete'
            ? 'Promoted'
            : `${active.name}`;

  const body =
    phase === 'idle'
      ? 'Send a release up the flight, or break it on purpose at one of three gates.'
      : phase === 'held' && fault
        ? fault.effect
        : phase === 'recovering' && stage === faultAt
          ? 'Rebuilt and re-scanned. The gate opens and the level equalises.'
          : phase === 'complete'
            ? 'The same image that was scanned is the image now running in the next environment. Nothing was rebuilt on the way up.'
            : active.detail;

  /* Tablets get a shallower staircase: nine full-height chambers across a
     1024px screen would leave each one too narrow to label. */
  const rise = viewport === 'tablet' ? 9 : 14;

  return (
    <div ref={rootRef} className={styles.root} data-phase={phase}>
      <div className={styles.controls}>
        <div className="ctl-row">
          <button
            type="button"
            className="ctl"
            data-primary=""
            onClick={() => run(null)}
          >
            Run a release
          </button>
          <button
            type="button"
            className="ctl"
            onClick={reset}
            disabled={phase === 'idle'}
          >
            Reset
          </button>
        </div>

        <div className={styles.faults}>
          <p className="u-mark">Break it on purpose</p>
          <div className="ctl-row">
            {faults.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`ctl ${styles.faultBtn}`}
                aria-pressed={faultId === f.id}
                aria-label={`Inject fault: ${f.label}`}
                title={f.label}
                onClick={() => run(f.id)}
              >
                <span className={styles.faultShort}>{f.short}</span>
                <span className={styles.faultLong}>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* The readout. This is the largest text in the plate on purpose: it is
          the part that carries the engineering meaning. */}
      <div className={styles.readout} data-phase={phase}>
        <p className="lamp" data-state={lamp}>
          {phase === 'idle' ? 'Idle' : phase}
        </p>
        <p className={styles.headline} aria-live="polite">
          {headline}
        </p>
        <p className={styles.body}>{body}</p>

        {phase === 'held' && fault ? (
          <div className={styles.remedy}>
            <p className={styles.remedyLine}>
              <span className="u-mark">Platform response</span>
              {fault.response}
            </p>
            <p className={styles.remedyLine}>
              <span className="u-mark">Fix</span>
              {fault.recovery}
            </p>
            <button type="button" className="ctl" data-primary="" onClick={remediate}>
              Apply the fix
            </button>
          </div>
        ) : (
          <p className={styles.tools}>
            {active.tools.map((t) => (
              <span key={t} className={styles.tool}>
                {t}
              </span>
            ))}
          </p>
        )}
      </div>

      {/* The flight itself. */}
      <div ref={pointerRef} className={styles.ladderWrap}>
        <ol
          ref={ladderRef}
          className={styles.ladder}
          style={{ '--rise': rise } as React.CSSProperties}
        >
          {chambers.map((c, i) => (
            <li
              key={c.id}
              className={styles.chamber}
              style={{ '--i': i } as React.CSSProperties}
              data-kind={c.kind}
              data-state={
                faultAt === i && (phase === 'held' || phase === 'recovering')
                  ? phase === 'held'
                    ? 'refused'
                    : 'recovering'
                  : stage > i || phase === 'complete'
                    ? 'full'
                    : stage === i && phase !== 'idle'
                      ? 'filling'
                      : 'empty'
              }
            >
              <span className={styles.water} aria-hidden="true" />
              <span className={styles.gate} aria-hidden="true" />
              <span className={styles.no}>{String(i + 1).padStart(2, '0')}</span>
              <span className={styles.name}>{c.name}</span>
              <span className={styles.kind}>{c.kind}</span>
            </li>
          ))}
        </ol>

        <svg className={styles.wake} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path ref={wakeRef} d="M0 0 H100" stroke="#8FCBD4" strokeWidth="0.6" fill="none" opacity="0" />
        </svg>
      </div>

      <div className={styles.fittings}>
        <p className="u-mark">Configured on every workload</p>
        <ul className={styles.fittingList}>
          {workloadFittings.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
