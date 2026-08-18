'use client';

import { usePathname } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  clamp,
  usePrefersReducedMotion,
  useRig,
  useTier,
  useVars,
} from '@/lib/motion';
import styles from './JourneySystem.module.css';

const STAGES = [
  { id: 'headwater', no: '01', name: 'Headwater' },
  { id: 'flight', no: '02', name: 'The Flight' },
  { id: 'refit', no: '03', name: 'The Refit' },
  { id: 'basin', no: '04', name: 'The Basin' },
  { id: 'split', no: '05', name: 'The Split' },
  { id: 'gauges', no: '06', name: 'Gauge House' },
  { id: 'watch', no: '07', name: 'The Watch' },
  { id: 'vault', no: '08', name: 'The Vault' },
  { id: 'tidewater', no: '09', name: 'Tidewater' },
] as const;

type StageId = (typeof STAGES)[number]['id'];
type RunPhase =
  | 'ready'
  | 'running'
  | 'held'
  | 'recovering'
  | 'healthy'
  | 'degraded'
  | 'production';
type TelemetryState = 'quiet' | 'healthy' | 'degrading' | 'critical';
type EventTone = 'neutral' | 'ok' | 'hold' | 'fault';

type RunEvent = {
  id: number;
  key: string;
  stage: string;
  label: string;
  tone: EventTone;
};

type JourneyState = {
  artifact: string;
  launched: boolean;
  phase: RunPhase;
  currentStage: StageId;
  fault: string | null;
  faultRemediated: boolean;
  drifted: boolean;
  reconciled: boolean;
  extracted: number;
  serviceDown: boolean;
  telemetryLoad: number;
  telemetry: TelemetryState;
  incidentAttempts: number;
  incidentSolved: boolean;
  productionReached: boolean;
  events: RunEvent[];
};

type JourneyContextValue = JourneyState & {
  progress: number;
  signalSeed: number;
  launch: () => void;
  reset: () => void;
  releaseStarted: (fault?: string | null) => void;
  releaseHeld: (fault?: string | null) => void;
  releaseRecovering: () => void;
  releaseComplete: () => void;
  clusterDrift: (drifted: boolean) => void;
  servicesChanged: (extracted: number, down: boolean) => void;
  telemetryChanged: (load: number, state: TelemetryState) => void;
  incidentCalled: (correct: boolean) => void;
};

const JourneyContext = createContext<JourneyContextValue | null>(null);

const phaseLabel: Record<RunPhase, string> = {
  ready: 'Ready for release',
  running: 'Release in motion',
  held: 'Gate holding',
  recovering: 'Recovery in progress',
  healthy: 'Healthy',
  degraded: 'Degraded',
  production: 'Production reached',
};

const phaseTone: Record<RunPhase, EventTone> = {
  ready: 'neutral',
  running: 'neutral',
  held: 'fault',
  recovering: 'hold',
  healthy: 'ok',
  degraded: 'hold',
  production: 'ok',
};

function artifactName(commit: string) {
  const clean = commit.trim().slice(0, 7);
  return clean && clean !== 'local' ? `AM-${clean.toUpperCase()}` : 'AM-V7-WORKING';
}

function initialState(commit: string, currentStage: StageId = 'headwater'): JourneyState {
  return {
    artifact: artifactName(commit),
    launched: false,
    phase: 'ready',
    currentStage,
    fault: null,
    faultRemediated: false,
    drifted: false,
    reconciled: false,
    extracted: 4,
    serviceDown: false,
    telemetryLoad: 0.34,
    telemetry: 'quiet',
    incidentAttempts: 0,
    incidentSolved: false,
    productionReached: false,
    events: [],
  };
}

export function useJourney() {
  const value = useContext(JourneyContext);
  if (!value) throw new Error('useJourney must be used inside JourneyProvider');
  return value;
}

export function JourneyProvider({
  children,
  commit,
}: {
  children: ReactNode;
  commit: string;
}) {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const [state, setState] = useState<JourneyState>(() => initialState(commit));
  const sequence = useRef(0);
  const armedFault = useRef<string | null>(null);

  const mutate = useCallback(
    (
      make: (current: JourneyState) => Partial<JourneyState>,
      event?: Omit<RunEvent, 'id'>,
    ) => {
      const stamped = event ? { ...event, id: ++sequence.current } : null;
      setState((current) => {
        const patch = make(current);
        if (!stamped) return { ...current, ...patch };
        const last = current.events[current.events.length - 1];
        const events =
          last?.key === stamped.key
            ? current.events
            : [...current.events, stamped].slice(-8);
        return { ...current, ...patch, events };
      });
    },
    [],
  );

  const launch = useCallback(() => {
    mutate(
      (current) =>
        current.launched
          ? {}
          : { launched: true, phase: 'running', productionReached: false },
      {
        key: 'launch',
        stage: '01 · Headwater',
        label: 'Artifact admitted to the works',
        tone: 'neutral',
      },
    );
  }, [mutate]);

  const releaseStarted = useCallback(
    (fault: string | null = null) => {
      armedFault.current = fault;
      mutate(
        () => ({
          launched: true,
          phase: 'running',
          fault,
          faultRemediated: false,
          productionReached: false,
        }),
        {
          key: `release-start:${fault ?? 'clean'}`,
          stage: '02 · The Flight',
          label: fault ? `Release triggered · ${fault} armed` : 'Release triggered · clean path',
          tone: fault ? 'hold' : 'neutral',
        },
      );
    },
    [mutate],
  );

  const releaseHeld = useCallback(
    (fault: string | null = null) => {
      const label = fault ?? armedFault.current ?? 'Policy gate';
      mutate(
        () => ({ phase: 'held', fault: label }),
        {
          key: `release-held:${label}`,
          stage: '02 · The Flight',
          label: `Gate refused the release · ${label}`,
          tone: 'fault',
        },
      );
    },
    [mutate],
  );

  const releaseRecovering = useCallback(() => {
    mutate(
      () => ({ phase: 'recovering', faultRemediated: true }),
      {
        key: 'release-recovery',
        stage: '02 · The Flight',
        label: 'Remediation applied · equalising again',
        tone: 'hold',
      },
    );
  }, [mutate]);

  const releaseComplete = useCallback(() => {
    mutate(
      () => ({ phase: 'healthy' }),
      {
        key: 'release-complete',
        stage: '02 · The Flight',
        label: 'Release cleared every gate',
        tone: 'ok',
      },
    );
  }, [mutate]);

  const clusterDrift = useCallback(
    (drifted: boolean) => {
      mutate(
        (current) => ({
          launched: current.launched || drifted,
          drifted,
          reconciled: drifted ? false : true,
          phase: drifted
            ? 'degraded'
            : current.phase === 'held'
              ? current.phase
              : 'healthy',
        }),
        {
          key: drifted ? 'cluster-drift' : 'cluster-reconciled',
          stage: '04 · The Basin',
          label: drifted
            ? 'Live state drifted away from Git'
            : 'Argo CD restored the declared state',
          tone: drifted ? 'fault' : 'ok',
        },
      );
    },
    [mutate],
  );

  const servicesChanged = useCallback(
    (extracted: number, down: boolean) => {
      const safe = Math.max(0, extracted);
      mutate(
        (current) => ({
          launched: true,
          extracted: safe,
          serviceDown: down,
          phase: down ? 'degraded' : current.phase === 'held' ? current.phase : 'healthy',
        }),
        {
          key: down ? `service-down:${safe}` : `services:${safe}`,
          stage: '05 · The Split',
          label: down
            ? 'Extracted service removed · gateway fell back safely'
            : `${safe} service${safe === 1 ? '' : 's'} outside the monolith`,
          tone: down ? 'hold' : 'ok',
        },
      );
    },
    [mutate],
  );

  const telemetryChanged = useCallback(
    (load: number, telemetry: TelemetryState) => {
      mutate((current) => ({
        telemetryLoad: clamp(load),
        telemetry,
        phase:
          telemetry === 'critical'
            ? 'degraded'
            : current.phase === 'held' || current.phase === 'recovering'
              ? current.phase
              : current.phase,
      }));
    },
    [mutate],
  );

  const incidentCalled = useCallback(
    (correct: boolean) => {
      mutate(
        (current) => ({
          incidentAttempts: current.incidentAttempts + 1,
          incidentSolved: current.incidentSolved || correct,
          phase: correct ? 'healthy' : 'degraded',
        }),
        {
          key: correct ? 'incident-contained' : `incident-miss:${sequence.current + 1}`,
          stage: '07 · The Watch',
          label: correct
            ? 'Diagnosis matched the signals · fault contained'
            : 'Diagnosis rejected · evidence still disagrees',
          tone: correct ? 'ok' : 'fault',
        },
      );
    },
    [mutate],
  );

  const reset = useCallback(() => {
    armedFault.current = null;
    sequence.current = 0;
    setState((current) => initialState(commit, current.currentStage));
  }, [commit]);

  /* One observer owns the narrative position. The existing Legend still owns
     navigation; this observer only records where the persistent artifact is. */
  useEffect(() => {
    if (pathname !== '/' || typeof IntersectionObserver === 'undefined') return;
    const sections = STAGES.map((stage) => document.getElementById(stage.id)).filter(
      (node): node is HTMLElement => Boolean(node),
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const id = visible.target.id as StageId;
        setState((current) =>
          current.currentStage === id ? current : { ...current, currentStage: id },
        );
      },
      { rootMargin: '-28% 0px -56% 0px', threshold: [0, 0.2, 0.55] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (
      pathname !== '/' ||
      !state.launched ||
      state.currentStage !== 'tidewater' ||
      state.productionReached
    ) {
      return;
    }
    mutate(
      () => ({ phase: 'production', productionReached: true }),
      {
        key: 'production',
        stage: '09 · Tidewater',
        label: 'The same run reached production water',
        tone: 'ok',
      },
    );
  }, [mutate, pathname, state.currentStage, state.launched, state.productionReached]);

  /* Read the existing simulations as instruments instead of rewriting them.
     Their semantic DOM is already tested and accessible, so V7 listens to the
     same state a keyboard or screen-reader user sees. */
  useEffect(() => {
    if (pathname !== '/') return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const control = target?.closest('button, a');
      if (!control) return;
      const text = (control.textContent ?? '').replace(/\s+/g, ' ').trim();

      if (control.closest('#flight')) {
        const faultLabel = control.getAttribute('aria-label');
        if (faultLabel?.startsWith('Inject fault:')) {
          releaseStarted(faultLabel.replace(/^Inject fault:\s*/, ''));
        } else if (/run a release/i.test(text)) {
          releaseStarted(null);
        }
      }

      if (control.closest('#basin')) {
        if (/edit the cluster/i.test(text)) clusterDrift(true);
        if (/reconcile/i.test(text)) clusterDrift(false);
      }

      if (control.closest('#split')) {
        window.setTimeout(() => {
          const root = document.getElementById('split');
          const lamp = root?.querySelector('.lamp');
          const match = lamp?.textContent?.match(/(\d+)\s*\/\s*\d+/);
          const count = match ? Number(match[1]) : state.extracted;
          if (/take one out of service/i.test(text)) servicesChanged(count, true);
          else if (/reset/i.test(text)) servicesChanged(0, false);
          else if (/extract a service/i.test(text)) servicesChanged(count, false);
        }, 0);
      }

      if (control.closest('#watch') && control.hasAttribute('aria-pressed')) {
        window.setTimeout(() => {
          const watch = document.getElementById('watch');
          if (!watch) return;
          if (watch.textContent?.includes('That is it')) incidentCalled(true);
          else if (watch.textContent?.includes('Not this one')) incidentCalled(false);
        }, 0);
      }
    };

    const readGauge = (target: EventTarget | null) => {
      const element = target as Element | null;
      const marker = element?.closest(
        '#gauges [role="slider"][aria-label="Load against the resource limit"]',
      );
      if (!marker) return;
      const load = Number(marker.getAttribute('aria-valuenow') ?? 34) / 100;
      const root = marker.closest('[data-state]') as HTMLElement | null;
      const raw = root?.dataset.state ?? 'healthy';
      const telemetry: TelemetryState =
        raw === 'critical'
          ? 'critical'
          : raw === 'degrading'
            ? 'degrading'
            : raw === 'healthy'
              ? 'healthy'
              : 'quiet';
      telemetryChanged(load, telemetry);
    };

    const onPointerUp = (event: PointerEvent) => readGauge(event.target);
    const onKeyUp = (event: KeyboardEvent) => readGauge(event.target);

    document.addEventListener('click', onClick, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('keyup', onKeyUp, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('keyup', onKeyUp, true);
    };
  }, [
    clusterDrift,
    incidentCalled,
    pathname,
    releaseStarted,
    servicesChanged,
    state.extracted,
    telemetryChanged,
  ]);

  useEffect(() => {
    if (pathname !== '/') return;
    const flight = document.querySelector('#flight [data-phase]');
    if (!flight || typeof MutationObserver === 'undefined') return;

    const read = () => {
      const phase = (flight as HTMLElement).dataset.phase;
      if (phase === 'held') releaseHeld(armedFault.current);
      else if (phase === 'recovering') releaseRecovering();
      else if (phase === 'complete') releaseComplete();
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(flight, { attributes: true, attributeFilter: ['data-phase'] });
    return () => observer.disconnect();
  }, [pathname, releaseComplete, releaseHeld, releaseRecovering]);

  const progress = useMemo(() => {
    const index = STAGES.findIndex((stage) => stage.id === state.currentStage);
    return index < 0 ? 0 : index / (STAGES.length - 1);
  }, [state.currentStage]);

  /* Upstream actions seed the observability chapter. This is intentionally a
     recommendation, not an invented production metric. A later V7 pass can
     let Gauge House consume it directly without changing the deterministic
     model that already exists there. */
  const signalSeed = clamp(
    0.34 +
      (state.fault ? 0.1 : 0) +
      (state.drifted ? 0.12 : 0) +
      (state.serviceDown ? 0.14 : 0),
    0,
    0.82,
  );

  useEffect(() => {
    if (pathname !== '/') return;
    const html = document.documentElement;
    html.dataset.runLaunched = String(state.launched);
    html.dataset.runPhase = state.phase;
    html.dataset.runStage = state.currentStage;
    html.dataset.runDrift = String(state.drifted);
    html.dataset.runServiceDown = String(state.serviceDown);
    html.dataset.runTelemetry = state.telemetry;
    return () => {
      delete html.dataset.runLaunched;
      delete html.dataset.runPhase;
      delete html.dataset.runStage;
      delete html.dataset.runDrift;
      delete html.dataset.runServiceDown;
      delete html.dataset.runTelemetry;
    };
  }, [
    pathname,
    state.currentStage,
    state.drifted,
    state.launched,
    state.phase,
    state.serviceDown,
    state.telemetry,
  ]);

  const value = useMemo<JourneyContextValue>(
    () => ({
      ...state,
      progress,
      signalSeed,
      launch,
      reset,
      releaseStarted,
      releaseHeld,
      releaseRecovering,
      releaseComplete,
      clusterDrift,
      servicesChanged,
      telemetryChanged,
      incidentCalled,
    }),
    [
      clusterDrift,
      incidentCalled,
      launch,
      progress,
      releaseComplete,
      releaseHeld,
      releaseRecovering,
      releaseStarted,
      reset,
      servicesChanged,
      signalSeed,
      state,
      telemetryChanged,
    ],
  );

  return (
    <JourneyContext.Provider value={value}>
      {children}
      {pathname === '/' ? <JourneyConsole value={value} reduced={reduced} tier={tier} /> : null}
    </JourneyContext.Provider>
  );
}

function JourneyConsole({
  value,
  reduced,
  tier,
}: {
  value: JourneyContextValue;
  reduced: boolean;
  tier: ReturnType<typeof useTier>;
}) {
  const [open, setOpen] = useState(false);
  const rig = useRig({
    channels: {
      progress: { value: 0, family: 'release' },
      pressure: { value: 0.08, family: 'hydraulic' },
      health: { value: 0.6, family: 'recovery' },
    },
    reduced,
    tier,
  });

  const pressure =
    value.phase === 'held'
      ? 1
      : value.phase === 'degraded'
        ? 0.78
        : value.phase === 'recovering'
          ? 0.52
          : value.phase === 'running'
            ? 0.28
            : value.phase === 'production'
              ? 0.08
              : 0.14;
  const health =
    value.phase === 'production' || value.phase === 'healthy'
      ? 1
      : value.phase === 'held'
        ? 0.12
        : value.phase === 'degraded'
          ? 0.34
          : value.phase === 'recovering'
            ? 0.7
            : 0.58;

  useEffect(() => {
    rig.set('progress', value.progress, 'release', 0.32);
    rig.set(
      'pressure',
      pressure,
      value.phase === 'held'
        ? 'failure'
        : value.phase === 'recovering'
          ? 'recovery'
          : 'hydraulic',
    );
    rig.set('health', health, value.phase === 'held' ? 'failure' : 'recovery');
    if (value.phase === 'held') rig.impulse('pressure', 0.55);
  }, [health, pressure, rig, value.phase, value.progress]);

  const systemRef = useVars<HTMLDivElement>(rig, {
    '--journey-progress': (r) => r.get('progress'),
    '--journey-pressure': (r) => r.get('pressure'),
    '--journey-health': (r) => r.get('health'),
  });

  const stageIndex = Math.max(
    0,
    STAGES.findIndex((stage) => stage.id === value.currentStage),
  );
  const stage = STAGES[stageIndex];

  const operate = () => {
    value.launch();
    setOpen(true);
    document.getElementById('flight')?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <div ref={systemRef} className={styles.system} data-phase={value.phase}>
      <div className={styles.pressureRail} aria-hidden="true">
        <span className={styles.pressureWake} />
        <span className={styles.pressureFront} />
      </div>

      <aside className={styles.console} aria-label="Living release run">
        <button
          type="button"
          className={styles.statusButton}
          aria-expanded={open}
          aria-controls="living-release-panel"
          onClick={() => setOpen((current) => !current)}
        >
          <span className={styles.artifact} aria-hidden="true">
            <span className={styles.artifactCore} />
          </span>
          <span className={styles.statusCopy}>
            <span className={styles.kicker}>{value.launched ? 'LIVE RUN' : 'V7 · LIVING RELEASE'}</span>
            <span className={styles.statusLine}>{value.artifact}</span>
          </span>
          <span className={styles.phase} data-tone={phaseTone[value.phase]}>
            {phaseLabel[value.phase]}
          </span>
        </button>

        <div
          id="living-release-panel"
          className={styles.panel}
          data-open={open || undefined}
          hidden={!open}
        >
          <div className={styles.panelHead}>
            <div>
              <p className={styles.kicker}>Operator record</p>
              <p className={styles.panelTitle}>{value.artifact}</p>
            </div>
            <p className={styles.stageReadout}>
              {stage.no} / 09 · {stage.name}
            </p>
          </div>

          <div className={styles.route} aria-hidden="true">
            <span className={styles.routeFill} />
            {STAGES.map((item, index) => (
              <span
                key={item.id}
                className={styles.routeMark}
                data-passed={index <= stageIndex ? '' : undefined}
                style={{ left: `${(index / (STAGES.length - 1)) * 100}%` }}
              />
            ))}
          </div>

          {!value.launched ? (
            <div className={styles.start}>
              <p>
                Operate the portfolio as one release. Faults, drift, service fallback and
                incident decisions become part of the same run record.
              </p>
              <button type="button" className={styles.primary} onClick={operate}>
                Operate the works
              </button>
            </div>
          ) : (
            <>
              <dl className={styles.metrics}>
                <div>
                  <dt>Gate</dt>
                  <dd>{value.fault ? (value.faultRemediated ? 'Remediated' : value.phase === 'held' ? 'Held' : 'Armed') : 'Clean'}</dd>
                </div>
                <div>
                  <dt>GitOps</dt>
                  <dd>{value.drifted ? 'Drifted' : value.reconciled ? 'Reconciled' : 'Nominal'}</dd>
                </div>
                <div>
                  <dt>Services</dt>
                  <dd>{value.serviceDown ? `${value.extracted} · fallback` : `${value.extracted} extracted`}</dd>
                </div>
                <div>
                  <dt>Incident</dt>
                  <dd>{value.incidentSolved ? `Contained in ${value.incidentAttempts}` : value.incidentAttempts ? `${value.incidentAttempts} call${value.incidentAttempts === 1 ? '' : 's'}` : 'Not reached'}</dd>
                </div>
              </dl>

              <div className={styles.events} aria-live="polite">
                <p className={styles.kicker}>Run trace</p>
                {value.events.length ? (
                  <ol>
                    {value.events.map((event) => (
                      <li key={event.id} data-tone={event.tone}>
                        <span>{event.stage}</span>
                        <strong>{event.label}</strong>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={styles.empty}>No operator action recorded yet.</p>
                )}
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() =>
                    document.getElementById(value.currentStage)?.scrollIntoView({
                      behavior: reduced ? 'auto' : 'smooth',
                      block: 'start',
                    })
                  }
                >
                  Return to current plate
                </button>
                <button type="button" className={styles.reset} onClick={value.reset}>
                  New run
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
