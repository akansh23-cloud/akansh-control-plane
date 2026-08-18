'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fold } from '@/components/Fold';
import { useJourney } from '@/components/JourneySystem';
import {
  artifactPromise,
  chamberPurpose,
  chambers,
  faultEvents,
  faults,
  recoveryEvents,
  releaseComplete,
  releaseStart,
  stageEvents,
  workloadFittings,
} from '@/content';
import {
  usePointerField,
  usePrefersReducedMotion,
  useRig,
  useRigRoot,
  useTier,
  useVars,
  useViewport,
} from '@/lib/motion';
import styles from './Flight.module.css';

type Mode = 'idle' | 'running' | 'held' | 'recovering';
type Phase = Mode | 'complete';
type Tone = 'ok' | 'gate' | 'fault' | 'fix';
type LogLine = { id: number; at: string; stage: string; text: string; tone: Tone };

const LAST = chambers.length;
/** The whole run is kept for the drawer; only the newest few are on screen. */
const LOG_DEPTH = 40;
const LOG_VISIBLE = 3;

/**
 * RELEASE ENGINEERING, AS A MECHANISM.
 *
 * V8 drew this as four boxes of similar weight — controls, a status card, a
 * scrolling log and a static row of stage tiles — and the actual release was
 * the least visible thing on the plate. V9 gives the mechanism the middle of
 * the composition and demotes everything else to its edges:
 *
 *   left    what you are about to do, and the three ways to break it
 *   centre  the flight itself, with one artifact that visibly climbs it
 *   right   where the artifact is, why this gate exists, what the system said
 *
 * The status region has a fixed number of slots and can never grow a nested
 * scrollbar; the complete run record lives behind an explicit drawer.
 */
export function Flight() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();
  const {
    releaseStarted,
    releaseRefused,
    releaseRecovering,
    releasePromoted,
    releaseReset,
    setReleaseStage,
  } = useJourney();

  const [stage, setStage] = useState(0);
  const [mode, setMode] = useState<Mode>('idle');
  const [faultId, setFaultId] = useState<string | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [why, setWhy] = useState(false);

  const autoRef = useRef<(() => void) | null>(null);
  const startedAt = useRef(0);
  const seq = useRef(0);
  const logged = useRef('');
  const operatorActive = useRef(false);
  const played = useRef(false);
  const logButton = useRef<HTMLButtonElement | null>(null);

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

  const rootRef = useRigRoot<HTMLDivElement>(rig, (visible) => {
    if (!visible) {
      if (operatorActive.current) rig.setVisible(true);
      return;
    }
    if (played.current) return;
    played.current = true;
    window.setTimeout(() => autoRef.current?.(), 420);
  });

  /* One number describes the whole mechanism: how far up the flight the
     artifact is. The chambers, the gates and the token all read it in CSS. */
  const worksRef = useVars<HTMLDivElement>(rig, { '--flow': (r) => r.get('flow') });
  /* A hand near a machine: a fine pointer lifts an inspection light over the
     works. No cursor, no follower, no React render. */
  const pointerRef = usePointerField(rig);

  const pace = viewport === 'mobile' ? 0.08 : viewport === 'tablet' ? 0.1 : 0.12;

  const fault = useMemo(() => faults.find((f) => f.id === faultId) ?? null, [faultId]);
  const faultAt = useMemo(
    () => (fault ? chambers.findIndex((c) => c.id === fault.at) : -1),
    [fault],
  );
  /** Armed before the run starts, so the visitor knows where to watch. */
  const armedGate = faultAt >= 0 ? chambers[faultAt] : null;

  const complete = mode !== 'idle' && stage >= LAST;
  const phase: Phase = complete ? 'complete' : mode;
  const active = stage < LAST ? chambers[stage] : chambers[LAST - 1];

  const emit = useCallback((stageName: string, text: string, tone: Tone) => {
    const at = startedAt.current
      ? `+${((performance.now() - startedAt.current) / 1000).toFixed(1)}s`
      : '+0.0s';
    seq.current += 1;
    setLog((lines) => [...lines, { id: seq.current, at, stage: stageName, text, tone }].slice(-LOG_DEPTH));
  }, []);

  /* Status events — one per state the release actually reaches. */
  useEffect(() => {
    if (mode === 'idle') return;
    const key = `${mode}:${stage}:${faultId ?? '-'}`;
    if (logged.current === key) return;
    logged.current = key;

    if (complete) {
      operatorActive.current = false;
      emit('Promote', releaseComplete, 'ok');
      return;
    }

    const chamber = chambers[Math.min(stage, LAST - 1)];

    if (mode === 'held') {
      const line = faultId ? faultEvents[faultId] : undefined;
      if (line) emit(chamber.name, line, 'gate');
      return;
    }

    if (mode === 'recovering') return;

    for (const line of stageEvents[chamber.id] ?? []) {
      emit(chamber.name, line, chamber.kind === 'security' ? 'gate' : 'ok');
    }
  }, [mode, stage, faultId, complete, emit]);

  /* ---- the drawing --------------------------------------------------- */

  useEffect(() => {
    if (mode === 'idle' || mode === 'held' || stage >= LAST) return;

    if (mode === 'running' && faultAt === stage) {
      rig.set('flow', stage + 0.42, 'failure');
      return;
    }

    rig.set(
      'flow',
      stage + 1,
      mode === 'recovering' ? 'recovery' : 'release',
      mode === 'recovering' ? pace * 2.1 : pace,
    );
  }, [rig, stage, mode, faultAt, pace]);

  useEffect(() => {
    if (mode !== 'running' || faultAt !== stage) return;
    return rig.watch({
      read: (r) => r.get('flow'),
      at: stage + 0.4,
      dir: 'up',
      fire: () => setMode('held'),
    });
  }, [rig, stage, mode, faultAt]);

  useEffect(() => {
    if ((mode !== 'running' && mode !== 'recovering') || stage >= LAST) return;
    return rig.watch({
      read: (r) => r.get('flow'),
      at: stage + 0.96,
      dir: 'up',
      fire: () => {
        setStage((s) => (s === stage ? Math.min(LAST, s + 1) : s));
        setMode('running');
      },
    });
  }, [rig, stage, mode]);

  /* Semantic progress must not depend on the compositor receiving every
     frame; WebKit throttles rAF hard under CI and low power. */
  useEffect(() => {
    if (reduced || stage >= LAST) return;
    if (mode !== 'running' && mode !== 'recovering') return;

    const currentStage = stage;
    const faultPending = mode === 'running' && faultAt === currentStage;
    const timer = window.setTimeout(() => {
      if (faultPending) {
        rig.jump('flow', currentStage + 0.42);
        setMode('held');
        return;
      }
      rig.jump('flow', currentStage + 1);
      setStage((s) => (s === currentStage ? Math.min(LAST, s + 1) : s));
      setMode('running');
    }, mode === 'recovering' ? 1450 : 1050);

    return () => window.clearTimeout(timer);
  }, [rig, reduced, stage, mode, faultAt]);

  /* ---- reporting into the global run --------------------------------- */

  useEffect(() => { setReleaseStage(stage); }, [setReleaseStage, stage]);

  useEffect(() => {
    if (mode === 'held' && fault) releaseRefused(fault.label, chambers[Math.min(stage, LAST - 1)].name);
  }, [fault, mode, releaseRefused, stage]);

  useEffect(() => {
    if (mode === 'recovering') releaseRecovering();
  }, [mode, releaseRecovering]);

  useEffect(() => {
    if (complete) releasePromoted();
  }, [complete, releasePromoted]);

  /* ---- operator actions ---------------------------------------------- */

  const run = useCallback(
    (id: string | null) => {
      played.current = true;
      operatorActive.current = true;
      rig.setVisible(true);
      rig.jump('flow', 0);
      setFaultId(id);
      setWhy(false);
      startedAt.current = performance.now();
      logged.current = '';
      seq.current = 0;
      setLog([{ id: 0, at: '+0.0s', stage: 'Trigger', text: releaseStart, tone: 'ok' }]);

      const injected = id ? faults.find((f) => f.id === id) ?? null : null;
      const gate = injected ? chambers.find((c) => c.id === injected.at)?.name ?? null : null;
      releaseStarted(injected?.label ?? null, gate);

      /* Reduced motion lands on the outcome: the information is the point,
         not the mechanism. */
      if (reduced) {
        if (injected) {
          const at = Math.max(0, chambers.findIndex((c) => c.id === injected.at));
          setStage(at);
          setMode('held');
          rig.jump('flow', at + 0.42);
        } else {
          setStage(LAST);
          setMode('running');
          rig.jump('flow', LAST);
        }
        return;
      }

      setStage(0);
      setMode('running');
    },
    [rig, reduced, releaseStarted],
  );

  const remediate = useCallback(() => {
    operatorActive.current = true;
    rig.setVisible(true);
    emit(
      chambers[Math.min(stage, LAST - 1)].name,
      (faultId && recoveryEvents[faultId]) || 'fix applied — the gate opens',
      'fix',
    );
    setFaultId(null);
    setWhy(false);

    if (reduced) {
      setStage(LAST);
      setMode('running');
      rig.jump('flow', LAST);
      return;
    }

    setMode('recovering');
    rig.set('flow', stage + 1, 'recovery');
  }, [rig, stage, reduced, faultId, emit]);

  const reset = useCallback(() => {
    operatorActive.current = false;
    rig.jump('flow', 0);
    setFaultId(null);
    setStage(0);
    setMode('idle');
    setWhy(false);
    setLog([]);
    releaseReset();
  }, [rig, releaseReset]);

  useEffect(() => {
    autoRef.current = () => {
      if (mode === 'idle') run(null);
    };
  }, [mode, run]);

  useEffect(() => {
    if (!logOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLogOpen(false);
        logButton.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [logOpen]);

  /* ---- readout -------------------------------------------------------- */

  const lamp =
    phase === 'held' ? 'fault'
      : phase === 'complete' ? 'ok'
      : phase === 'recovering' ? 'hold'
      : phase === 'running' ? 'running'
      : 'idle';

  const headline =
    phase === 'idle' ? 'System ready'
      : phase === 'held' ? `Held at ${active.name}`
      : phase === 'recovering' ? `Recovering at ${active.name}`
      : phase === 'complete' ? 'Promoted'
      : active.name;

  const body =
    phase === 'idle'
      ? 'Send a release up the flight, or break it on purpose at one of three real gates.'
      : phase === 'held' && fault
        ? fault.effect
        : phase === 'recovering' && stage === faultAt
          ? 'Rebuilt and re-scanned. The gate opens and the level equalises.'
          : phase === 'complete'
            ? 'The same image that was scanned is the image now running in the next environment. Nothing was rebuilt on the way up.'
            : active.detail;

  const visible = log.slice(-LOG_VISIBLE);

  return (
    <div ref={rootRef} className={styles.root} data-phase={phase}>
      {/* ---------------- operator ---------------- */}
      <div className={styles.operator}>
        <p className={styles.task}>
          <span className="u-mark">What you are doing</span>
          Sending one immutable image through the delivery gates.
        </p>

        <div className={styles.primaryRow}>
          <button type="button" className="ctl" data-primary="" onClick={() => run(null)}>
            Run a release
          </button>
          <button type="button" className="ctl" onClick={reset} disabled={phase === 'idle'}>
            Reset
          </button>
        </div>

        <div className={styles.faults}>
          <p className="u-mark">Break it on purpose</p>
          <ul className={styles.faultList}>
            {faults.map((f) => {
              const gate = chambers.find((c) => c.id === f.at);
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    className={styles.faultBtn}
                    aria-pressed={faultId === f.id}
                    aria-label={`Inject fault: ${f.label}`}
                    onClick={() => run(f.id)}
                  >
                    <span className={styles.faultLabel}>{f.label}</span>
                    <span className={styles.faultGate}>caught at {gate?.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <p className={styles.promise}>{artifactPromise}</p>
      </div>

      {/* ---------------- mechanism ---------------- */}
      <div ref={pointerRef} className={styles.mechanism}>
        <div ref={worksRef} className={styles.works} data-phase={phase}>
          <ol className={styles.ladder} aria-label="Release stages">
            {chambers.map((c, i) => (
              <li
                key={c.id}
                className={styles.chamber}
                style={{ '--i': i } as React.CSSProperties}
                data-kind={c.kind}
                data-armed={armedGate?.id === c.id && phase !== 'complete' ? '' : undefined}
                data-state={
                  faultAt === i && (phase === 'held' || phase === 'recovering')
                    ? phase === 'held' ? 'refused' : 'recovering'
                    : stage > i || phase === 'complete'
                      ? 'full'
                      : stage === i && phase !== 'idle'
                        ? 'filling'
                        : 'empty'
                }
                aria-current={stage === i && phase !== 'idle' ? 'step' : undefined}
              >
                <span className={styles.water} aria-hidden="true" />
                <span className={styles.gate} aria-hidden="true" />
                <span className={styles.chamberLabel}>
                  <span className={styles.no}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.name}>{c.name}</span>
                </span>
              </li>
            ))}
          </ol>

          <span className={styles.token} aria-hidden="true">
            <span className={styles.tokenCore} />
            <span className={styles.tokenStamp}>AM</span>
          </span>
        </div>

        <p className={styles.scaleNote} aria-hidden="true">
          RETRIEVE → TEST → SOURCE GATE → IMAGE BUILD → IMAGE GATE → CERTIFICATES → SCHEMA → DEPLOY → PROMOTE
        </p>
      </div>

      {/* ---------------- context ---------------- */}
      <div className={styles.context}>
        <div className={styles.readout}>
          <p className="lamp" data-state={lamp}>{phase === 'idle' ? 'Idle' : phase}</p>
          <p className={styles.headline} aria-live="polite">{headline}</p>
          <p className={styles.body}>{body}</p>
        </div>

        {phase === 'held' && fault ? (
          <div className={styles.refusal} role="group" aria-label="Release refused">
            <p className={styles.refusalTitle}>Release refused</p>
            <dl className={styles.refusalGrid}>
              <div><dt>Gate</dt><dd>{active.name}</dd></div>
              <div><dt>Reason</dt><dd>{fault.label}</dd></div>
              <div><dt>Outcome</dt><dd>Production protected — nothing downstream was touched.</dd></div>
            </dl>
            <p className={styles.fix}><span className="u-mark">Fix</span>{fault.recovery}</p>
            <div className={styles.refusalActions}>
              <button type="button" className="ctl" data-primary="" onClick={remediate}>
                Apply the fix
              </button>
              <button type="button" className="ctl" onClick={reset}>Reset</button>
              <button
                type="button"
                className={styles.whyBtn}
                aria-expanded={why}
                onClick={() => setWhy((open) => !open)}
              >
                Why this matters
              </button>
            </div>
            {why ? <p className={styles.whyBody}>{fault.response} {chamberPurpose[fault.at]}</p> : null}
          </div>
        ) : (
          <div className={styles.gateNote}>
            <p className="u-mark">Why this gate exists</p>
            <p className={styles.gateWhy}>{chamberPurpose[active.id]}</p>
            <p className={styles.tools}>
              {active.tools.map((tool) => (
                <span key={tool} className={styles.tool}>{tool}</span>
              ))}
            </p>
          </div>
        )}

        <div className={styles.events}>
          <div className={styles.eventsHead}>
            <p className="u-mark">System response</p>
            <p className={styles.progress}>
              {phase === 'idle'
                ? 'awaiting trigger'
                : `stage ${Math.min(stage + (complete ? 0 : 1), LAST)} of ${LAST}`}
            </p>
          </div>
          <ol className={styles.eventList} role="log">
            {visible.length === 0 ? (
              <li className={styles.event} data-tone="idle">
                <span className={styles.eventText}>
                  Nothing running. Send a release up, or break it at a gate.
                </span>
              </li>
            ) : (
              visible.map((line) => (
                <li key={line.id} className={styles.event} data-tone={line.tone}>
                  <span className={styles.eventAt}>{line.at}</span>
                  <span className={styles.eventStage}>{line.stage}</span>
                  <span className={styles.eventText}>{line.text}</span>
                </li>
              ))
            )}
          </ol>
          <button
            ref={logButton}
            type="button"
            className={styles.logBtn}
            aria-expanded={logOpen}
            onClick={() => setLogOpen(true)}
            disabled={log.length === 0}
          >
            View full release log{log.length ? ` · ${log.length} entries` : ''}
          </button>
        </div>
      </div>

      {/* ---------------- fittings ---------------- */}
      <div className={styles.fittings}>
        <Fold label="Configured on every workload" hint={`${workloadFittings.length} items`}>
          <ul className={styles.fittingList}>
            {workloadFittings.map((fitting) => (
              <li key={fitting}>{fitting}</li>
            ))}
          </ul>
        </Fold>
      </div>

      {/* ---------------- full log drawer ---------------- */}
      {logOpen ? (
        <div
          className={styles.drawer}
          role="dialog"
          aria-modal="true"
          aria-label="Full release log"
        >
          <div className={styles.drawerInner}>
            <div className={styles.drawerHead}>
              <p className="u-mark">Release log · run of {LAST} stages</p>
              <button
                type="button"
                className="ctl"
                onClick={() => {
                  setLogOpen(false);
                  logButton.current?.focus();
                }}
              >
                Close
              </button>
            </div>
            <ol className={styles.drawerList}>
              {log.map((line) => (
                <li key={line.id} data-tone={line.tone}>
                  <span className={styles.eventAt}>{line.at}</span>
                  <span className={styles.eventStage}>{line.stage}</span>
                  <span className={styles.eventText}>{line.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  );
}
