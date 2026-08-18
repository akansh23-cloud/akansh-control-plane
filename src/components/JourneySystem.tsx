'use client';

import { usePathname } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import {
  initialRun,
  nextOperation,
  objectives,
  productionEligible,
  runProgress,
  runReducer,
  type OperatingMode,
  type RunState,
  type StageId,
  type TelemetryState,
} from '@/lib/lifecycle';

/**
 * THE RUN.
 *
 * This component used to hold the state *and* draw the console *and* sniff
 * the DOM for every plate. V9 splits those: `lib/lifecycle.ts` owns the
 * definition of a run, this provider owns the instance of it, and
 * `OperatorChrome` draws it. That is what makes replay dependable — there is
 * exactly one place where a run begins and ends.
 *
 * The Flight now reports through this context directly rather than being
 * observed through its own markup. The remaining plates are still read as
 * instruments through their semantic DOM, which keeps them independent of the
 * run without duplicating their logic here.
 */

type JourneyContextValue = RunState & {
  progress: number;
  objectives: ReturnType<typeof objectives>;
  next: ReturnType<typeof nextOperation>;
  completion: ReturnType<typeof runProgress>;
  signalSeed: number;

  setMode: (mode: OperatingMode) => void;
  launch: () => void;
  newRun: () => void;
  playOpening: () => void;
  endOpening: () => void;
  markFinalePlayed: () => void;

  releaseStarted: (fault: string | null, gate: string | null) => void;
  setReleaseStage: (stage: number) => void;
  releaseRefused: (fault: string, gate: string) => void;
  releaseRecovering: () => void;
  releasePromoted: () => void;
  releaseReset: () => void;

  clusterDrift: (drifted: boolean) => void;
  servicesChanged: (extracted: number, down: boolean) => void;
  telemetryChanged: (load: number, state: TelemetryState) => void;
  incidentCalled: (correct: boolean) => void;

  goTo: (plate: StageId) => void;
};

const JourneyContext = createContext<JourneyContextValue | null>(null);

export function useJourney() {
  const value = useContext(JourneyContext);
  if (!value) throw new Error('useJourney must be used inside JourneyProvider');
  return value;
}

const SECTIONS: StageId[] = [
  'headwater', 'flight', 'refit', 'basin', 'split',
  'gauges', 'watch', 'vault', 'tidewater',
];

export function JourneyProvider({
  children,
  commit,
}: {
  children: ReactNode;
  commit: string;
}) {
  const pathname = usePathname();
  const [state, dispatch] = useReducer(runReducer, commit, initialRun);

  const setMode = useCallback((mode: OperatingMode) => dispatch({ type: 'mode', mode }), []);
  const launch = useCallback(() => dispatch({ type: 'launch' }), []);
  const newRun = useCallback(() => dispatch({ type: 'run:new' }), []);
  const playOpening = useCallback(() => dispatch({ type: 'opening:play' }), []);
  const endOpening = useCallback(() => dispatch({ type: 'opening:end' }), []);
  const markFinalePlayed = useCallback(() => dispatch({ type: 'finale:played' }), []);

  const releaseStarted = useCallback(
    (fault: string | null, gate: string | null) =>
      dispatch({ type: 'release:start', fault, gate }),
    [],
  );
  const setReleaseStage = useCallback(
    (stage: number) => dispatch({ type: 'release:stage', stage }),
    [],
  );
  const releaseRefused = useCallback(
    (fault: string, gate: string) => dispatch({ type: 'release:refused', fault, gate }),
    [],
  );
  const releaseRecovering = useCallback(() => dispatch({ type: 'release:recovering' }), []);
  const releasePromoted = useCallback(() => dispatch({ type: 'release:promoted' }), []);
  const releaseReset = useCallback(() => dispatch({ type: 'release:reset' }), []);

  const clusterDrift = useCallback(
    (drifted: boolean) => dispatch({ type: 'drift', drifted }),
    [],
  );
  const servicesChanged = useCallback(
    (extracted: number, down: boolean) => dispatch({ type: 'services', extracted, down }),
    [],
  );
  const telemetryChanged = useCallback(
    (load: number, telemetry: TelemetryState) =>
      dispatch({ type: 'telemetry', load, state: telemetry }),
    [],
  );
  const incidentCalled = useCallback(
    (correct: boolean) => dispatch({ type: 'incident', correct }),
    [],
  );

  const goTo = useCallback((plate: StageId) => {
    const target = document.getElementById(plate);
    if (!target) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, []);

  /* Which chapter the reader is in. */
  useEffect(() => {
    if (pathname !== '/' || typeof IntersectionObserver === 'undefined') return;
    const sections = SECTIONS.map((id) => document.getElementById(id)).filter(
      (node): node is HTMLElement => Boolean(node),
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        sections.forEach((section) =>
          section.toggleAttribute('data-current', section === visible.target),
        );
        dispatch({ type: 'stage', stage: visible.target.id as StageId });
      },
      { rootMargin: '-28% 0px -56% 0px', threshold: [0, 0.2, 0.55] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      sections.forEach((section) => section.removeAttribute('data-current'));
    };
  }, [pathname]);

  /* Arrival is semantic: the run must have cleared The Flight first. */
  useEffect(() => {
    if (pathname !== '/' || !productionEligible(state)) return;
    dispatch({ type: 'production' });
  }, [pathname, state]);

  /* The remaining plates are read as instruments. Their semantic DOM is the
     contract shared by mouse, keyboard and the global run — The Flight is
     absent from this list on purpose, because it now reports directly. */
  useEffect(() => {
    if (pathname !== '/') return;

    const onClick = (event: MouseEvent) => {
      const control = (event.target as Element | null)?.closest('button, a');
      if (!control) return;
      const text = (control.textContent ?? '').replace(/\s+/g, ' ').trim();

      if (control.closest('#basin')) {
        if (/edit the cluster/i.test(text)) clusterDrift(true);
        if (/reconcile/i.test(text)) clusterDrift(false);
      }

      if (control.closest('#split')) {
        window.setTimeout(() => {
          const lamp = document.getElementById('split')?.querySelector('.lamp');
          const match = lamp?.textContent?.match(/(\d+)\s*\/\s*\d+/);
          const count = match ? Number(match[1]) : 0;
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
      const marker = (target as Element | null)?.closest(
        '#gauges [role="slider"][aria-label="Load against the resource limit"]',
      );
      if (!marker) return;
      const load = Number(marker.getAttribute('aria-valuenow') ?? 34) / 100;
      const raw =
        (marker.closest('[data-state]') as HTMLElement | null)?.dataset.state ?? 'healthy';
      const telemetry: TelemetryState =
        raw === 'critical' || raw === 'degrading' || raw === 'healthy' ? raw : 'quiet';
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
  }, [clusterDrift, incidentCalled, pathname, servicesChanged, telemetryChanged]);

  /* One published surface for CSS, tests and downstream QA. */
  useEffect(() => {
    if (pathname !== '/') return;
    const html = document.documentElement;
    html.dataset.mode = state.mode;
    html.dataset.runId = String(state.runId);
    html.dataset.runLaunched = String(state.launched);
    html.dataset.runStarted = String(state.launched);
    html.dataset.runPhase = state.phase;
    html.dataset.runStage = state.currentStage;
    html.dataset.runRelease = state.release;
    html.dataset.runReleaseCleared = String(state.releaseCleared);
    html.dataset.runCompleted = String(state.productionReached && state.releaseCleared);
    html.dataset.runDrift = String(state.drifted);
    html.dataset.runServiceDown = String(state.serviceDown);
    html.dataset.runTelemetry = state.telemetry;
    html.dataset.openingCycle = String(state.openingCycleId);
    html.dataset.finalePlayedForRunId =
      state.finalePlayedForRunId === null ? '' : String(state.finalePlayedForRunId);
  }, [
    pathname,
    state.currentStage,
    state.drifted,
    state.finalePlayedForRunId,
    state.launched,
    state.mode,
    state.openingCycleId,
    state.phase,
    state.productionReached,
    state.release,
    state.releaseCleared,
    state.runId,
    state.serviceDown,
    state.telemetry,
  ]);

  const derived = useMemo(
    () => ({
      objectives: objectives(state),
      next: nextOperation(state),
      completion: runProgress(state),
    }),
    [state],
  );

  const progress = useMemo(() => {
    const index = SECTIONS.indexOf(state.currentStage);
    return index < 0 ? 0 : index / (SECTIONS.length - 1);
  }, [state.currentStage]);

  const signalSeed = Math.min(
    0.82,
    0.34 + (state.fault ? 0.1 : 0) + (state.drifted ? 0.12 : 0) + (state.serviceDown ? 0.14 : 0),
  );

  const value = useMemo<JourneyContextValue>(
    () => ({
      ...state,
      ...derived,
      progress,
      signalSeed,
      setMode,
      launch,
      newRun,
      playOpening,
      endOpening,
      markFinalePlayed,
      releaseStarted,
      setReleaseStage,
      releaseRefused,
      releaseRecovering,
      releasePromoted,
      releaseReset,
      clusterDrift,
      servicesChanged,
      telemetryChanged,
      incidentCalled,
      goTo,
    }),
    [
      clusterDrift, derived, endOpening, goTo, incidentCalled, launch,
      markFinalePlayed, newRun, playOpening, progress, releasePromoted,
      releaseRecovering, releaseRefused, releaseReset, setReleaseStage,
      releaseStarted, servicesChanged, setMode, signalSeed, state,
      telemetryChanged,
    ],
  );

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}
