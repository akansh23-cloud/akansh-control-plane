'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fold } from '@/components/Fold';
import {
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

type Mode = 'idle' | 'running' | 'held' | 'recovering';
type Phase = Mode | 'complete';
type Tone = 'ok' | 'gate' | 'fault' | 'fix';
type LogLine = { id: number; at: string; stage: string; text: string; tone: Tone };

const LAST = chambers.length;
/** How much of the log is worth keeping on screen at once. */
const LOG_DEPTH = 7;

export function Flight() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();

  const [stage, setStage] = useState(0);
  const [mode, setMode] = useState<Mode>('idle');
  const [faultId, setFaultId] = useState<string | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const autoRef = useRef<(() => void) | null>(null);
  /* The simulation's own clock, so the timestamps on the log are the real
     elapsed time of the run rather than invented numbers. */
  const startedAt = useRef(0);
  const seq = useRef(0);
  const logged = useRef('');
  /* WebKit can report a stale IntersectionObserver sample immediately after a
     programmatic section jump. Once the operator has explicitly started the
     mechanism, that stale sample must not turn its shared rig off underneath
     the running release. */
  const operatorActive = useRef(false);

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

  const played = useRef(false);

  const rootRef = useRigRoot<HTMLDivElement>(rig, (visible) => {
    if (!visible) {
      if (operatorActive.current) rig.setVisible(true);
      return;
    }
    if (played.current) return;
    played.current = true;
    window.setTimeout(() => {
      if (autoRef.current) autoRef.current();
    }, 420);
  });
  const pointerRef = usePointerField(rig);

  /* A clean release should read as nine distinct checks, not as nine waits.
     Keep phones fastest because their paint budget is smallest, while every
     viewport still spends long enough in each chamber for the log and gate
     state to be readable. */
  const pace = viewport === 'mobile' ? 0.08 : viewport === 'tablet' ? 0.1 : 0.12;

  const fault = useMemo(
    () => faults.find((f) => f.id === faultId) ?? null,
    [faultId],
  );
  const faultAt = useMemo(
    () => (fault ? chambers.findIndex((c) => c.id === fault.at) : -1),
    [fault],
  );

  const ladderRef = useVars<HTMLOListElement>(rig, {
    '--flow': (r) => r.get('flow'),
  });

  const wakeRef = usePaint<SVGPathElement>(rig, (el, r) => {
    const f = r.get('flow');
    const local = f - Math.floor(f);
    el.setAttribute('opacity', (local > 0.02 && local < 0.98 ? 0.85 : 0).toFixed(3));
    el.setAttribute('transform', `translate(0 ${(1 - local) * 100})`);
  });

  const complete = mode !== 'idle' && stage >= LAST;
  const phase: Phase = complete ? 'complete' : mode;

  const emit = useCallback((stageName: string, text: string, tone: Tone) => {
    const at = startedAt.current
      ? `+${((performance.now() - startedAt.current) / 1000).toFixed(1)}s`
      : '+0.0s';
    seq.current += 1;
    const line: LogLine = { id: seq.current, at, stage: stageName, text, tone };
    setLog((lines) => [...lines, line].slice(-LOG_DEPTH));
  }, []);

  /* Status events. One entry per state the release actually reaches — written
     from an effect, never from a frame, so the log cannot outrun the drawing
     or fire twice for the same state. */
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

    /* Recovery is emitted by the fix itself, below, because the fault id has
       to be cleared in the same action that applies the fix. */
    if (mode === 'recovering') return;

    for (const line of stageEvents[chamber.id] ?? []) {
      emit(chamber.name, line, chamber.kind === 'security' ? 'gate' : 'ok');
    }
  }, [mode, stage, faultId, complete, emit]);

  useEffect(() => {
    if (mode === 'idle' || mode === 'held') return;
    if (stage >= LAST) return;

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
    if (mode !== 'running' && mode !== 'recovering') return;
    if (stage >= LAST) return;

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

  /* Semantic progress must not depend on a compositor receiving every frame.
     Safari/WebKit may aggressively throttle rAF under CI, low-power or tab
     scheduling pressure. The shared rig remains the normal source of motion;
     this once-per-stage watchdog only settles the semantic checkpoint if the
     visual threshold has not arrived within a generous wall-clock window. */
  useEffect(() => {
    if (reduced || stage >= LAST) return;
    if (mode !== 'running' && mode !== 'recovering') return;

    const currentStage = stage;
    const faultPending = mode === 'running' && faultAt === currentStage;
    const delay = mode === 'recovering' ? 1450 : 1050;
    const timer = window.setTimeout(() => {
      if (faultPending) {
        rig.jump('flow', currentStage + 0.42);
        setMode('held');
        return;
      }

      rig.jump('flow', currentStage + 1);
      setStage((s) => (s === currentStage ? Math.min(LAST, s + 1) : s));
      setMode('running');
    }, delay);

    return () => window.clearTimeout(timer);
  }, [rig, reduced, stage, mode, faultAt]);

  const run = useCallback(
    (id: string | null) => {
      played.current = true;
      operatorActive.current = true;
      /* A direct interaction proves the mechanism is on-screen. Re-arm the
         existing global rig here; the visibility callback above prevents a
         stale WebKit IO sample from immediately undoing the operator action. */
      rig.setVisible(true);
      rig.jump('flow', 0);
      setFaultId(id);
      startedAt.current = performance.now();
      logged.current = '';
      seq.current = 0;
      setLog([
        { id: 0, at: '+0.0s', stage: 'Trigger', text: releaseStart, tone: 'ok' },
      ]);

      /* Reduced motion skips the sequence and lands on the outcome — the
         information, not the mechanism, is the point. */
      if (reduced) {
        if (id) {
          const injected = faults.find((f) => f.id === id);
          const at = injected
            ? chambers.findIndex((c) => c.id === injected.at)
            : 0;
          setStage(Math.max(0, at));
          setMode('held');
          rig.jump('flow', Math.max(0, at) + 0.42);
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
    [rig, reduced],
  );

  const remediate = useCallback(() => {
    operatorActive.current = true;
    rig.setVisible(true);
    const held = faultId;
    emit(
      chambers[Math.min(stage, LAST - 1)].name,
      (held && recoveryEvents[held]) || 'fix applied — the gate opens',
      'fix',
    );
    setFaultId(null);

    if (reduced) {
      setStage(LAST);
      setMode('running');
      rig.jump('flow', LAST);
      return;
    }

    setMode('recovering');
    rig.set('flow', stage + 1, 'recovery');
  }, [rig, stage, reduced, faultId, emit]);

  useEffect(() => {
    autoRef.current = () => {
      if (mode === 'idle') run(null);
    };
  }, [mode, run]);

  const reset = useCallback(() => {
    operatorActive.current = false;
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

  const rise = viewport === 'tablet' ? 9 : 14;

  return (
    <div ref={rootRef} className={styles.root} data-phase={phase}>
      <div className={styles.controls}>
        <div className="ctl-row">
          <button type="button" className="ctl" data-primary="" onClick={() => run(null)}>
            Run a release
          </button>
          <button type="button" className="ctl" onClick={reset} disabled={phase === 'idle'}>
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

      <div className={styles.log}>
        <div className={styles.logHead}>
          <p className="u-mark">Status</p>
          <p className={styles.progress}>
            {phase === 'idle'
              ? 'awaiting trigger'
              : `stage ${Math.min(stage + (complete ? 0 : 1), LAST)} of ${LAST}`}
          </p>
        </div>
        <ol className={styles.logLines} role="log">
          {log.length === 0 ? (
            <li className={styles.logLine} data-tone="idle">
              <span className={styles.logAt}>--</span>
              <span className={styles.logText}>
                Nothing running. Send a release up, or arm a fault first.
              </span>
            </li>
          ) : (
            log.map((l) => (
              <li key={l.id} className={styles.logLine} data-tone={l.tone}>
                <span className={styles.logAt}>{l.at}</span>
                <span className={styles.logStage}>{l.stage}</span>
                <span className={styles.logText}>{l.text}</span>
              </li>
            ))
          )}
        </ol>
      </div>

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
              <span className={styles.vessel} aria-hidden="true" />
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
        <Fold label="Configured on every workload" hint={`${workloadFittings.length} items`}>
          <ul className={styles.fittingList}>
            {workloadFittings.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </Fold>
      </div>
    </div>
  );
}
