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
import { useJourney } from '@/components/JourneySystem';
import { chaosFaults, findFault } from '@/content/chaos';
import type { XRayLens } from '@/content/xray';
import {
  capsuleDockFor,
  capsuleMarks,
  capsuleStatus,
  type CapsuleDockId,
  type CapsuleMarks,
  type CapsuleStatus,
} from '@/lib/capsule';
import { SystemBus, type SystemEvent } from '@/lib/events';
import type { RunState } from '@/lib/lifecycle';
import { useCoarsePointer, usePrefersReducedMotion, useTier } from '@/lib/motion';
import { PressureModel } from '@/lib/pressure';
import { SoundEngine } from '@/lib/sound';

/**
 * THE OPERATING ENVIRONMENT.
 *
 * V9 has one provider that owns *what the run is*. This is the second one, and
 * it owns *what the world does about it*: pressure in the pipes, where the
 * release capsule is docked, whether X-Ray is lifted, what chaos is injected,
 * whether the tour is driving, and whether the works are audible.
 *
 * The split matters. Everything in `JourneySystem` is semantic and would still
 * be true with the screen switched off. Everything here is a consequence, and
 * every consequence enters through one door — the event bus — so that no
 * component ever grows its own private chain of timers to make something else
 * move.
 *
 * The bridge from semantics to consequence is `useCausality` at the bottom of
 * this file: it watches the run state, notices what changed, and announces it
 * exactly once.
 */

type Environment = {
  bus: SystemBus;
  pressure: PressureModel;

  /* Capsule */
  capsule: CapsuleStatus;
  marks: CapsuleMarks;
  dock: CapsuleDockId;
  registerDock: (id: CapsuleDockId, el: HTMLElement | null) => void;
  dockElement: (id: CapsuleDockId) => HTMLElement | null;

  /* X-Ray */
  xray: boolean;
  lens: XRayLens;
  setLens: (lens: XRayLens) => void;
  toggleXray: (on?: boolean) => void;

  /* Chaos */
  armed: string | null;
  active: string[];
  arm: (fault: string | null) => void;
  inject: (fault?: string) => void;
  recover: (fault: string) => void;

  /* Sound */
  soundOn: boolean;
  toggleSound: (on?: boolean) => void;
  sound: SoundEngine;

  /* Tour */
  touring: boolean;
  tourStop: number;
  startTour: () => void;
  stopTour: () => void;
  setTourStop: (index: number) => void;

  /* Console */
  consoleOpen: boolean;
  openConsole: (open: boolean) => void;

  /* Trace. The console and the on-plate control announce the same command;
     the plate that owns the mechanism performs it. */
  requestTrace: () => void;

  reduced: boolean;
};

const EnvironmentContext = createContext<Environment | null>(null);

export function useEnvironment() {
  const value = useContext(EnvironmentContext);
  if (!value) throw new Error('useEnvironment must be used inside OperatingEnvironment');
  return value;
}

/** Safe for components that may render outside the provider (e.g. /resume). */
export function useMaybeEnvironment() {
  return useContext(EnvironmentContext);
}

export function OperatingEnvironment({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const run = useJourney();
  const reduced = usePrefersReducedMotion();
  const coarse = useCoarsePointer();
  const tier = useTier();

  const [bus] = useState(() => new SystemBus());
  const [pressure] = useState(() => new PressureModel());
  const [sound] = useState(() => new SoundEngine());

  const [xray, setXray] = useState(false);
  const [lens, setLens] = useState<XRayLens>('system');
  const [soundOn, setSoundOn] = useState(false);
  const [touring, setTouring] = useState(false);
  const [tourStop, setTourStop] = useState(0);
  const [consoleOpen, setConsoleOpen] = useState(false);

  const docks = useRef(new Map<CapsuleDockId, HTMLElement>());

  /* ---------------------------------------------------------------- */
  /* Wiring                                                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    pressure.configure(reduced);
  }, [pressure, reduced]);

  useEffect(() => {
    const unbind = pressure.bind(document.documentElement);
    const off = pressure.subscribe(bus);
    return () => {
      unbind();
      off();
    };
  }, [bus, pressure]);

  useEffect(() => {
    sound.subscribe(bus);
    return () => sound.dispose();
  }, [bus, sound]);

  /* Raw scroll pressure is a secondary effect. Disable it on coarse/calm
     devices and sample it at ~30fps elsewhere so scrolling always wins. */
  useEffect(() => {
    if (reduced || coarse || tier === 'calm') return;
    let last = window.scrollY;
    let lastTime = performance.now();
    let queued = false;
    let lastSample = 0;

    const measure = (frameTime: number) => {
      queued = false;
      if (frameTime - lastSample < 28) return;
      lastSample = frameTime;
      const now = performance.now();
      const dy = window.scrollY - last;
      const dt = Math.max(16, now - lastTime);
      last = window.scrollY;
      lastTime = now;
      pressure.scrolled((dy / dt) * 0.42);
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [coarse, pressure, reduced, tier]);

  /**
   * POINTER WAKE. Not a cursor — a hand near a machine. Fine pointers only,
   * published as three variables the whole page can read without a listener.
   */
  useEffect(() => {
    if (reduced || typeof window === 'undefined') return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const rig = pressure.rig;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let decay = 0;

    const unbind = rig.bindVars(document.documentElement, {
      '--ptr-x': (r) => r.get('ptrX'),
      '--ptr-y': (r) => r.get('ptrY'),
      '--ptr-v': (r) => r.get('ptrV'),
    });

    let pointerFrame = 0;
    let pending: PointerEvent | null = null;
    const paintPointer = () => {
      pointerFrame = 0;
      const event = pending;
      pending = null;
      if (!event) return;
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      const dt = lastT ? Math.max(8, event.timeStamp - lastT) : 16;
      const speed = Math.hypot(event.clientX - lastX, event.clientY - lastY) / dt;
      lastX = event.clientX; lastY = event.clientY; lastT = event.timeStamp;
      rig.set('ptrX', x, 'mechanical', 0.1);
      rig.set('ptrY', y, 'mechanical', 0.1);
      rig.set('ptrV', Math.min(1, speed / 2.4), 'mechanical', 0.12);
      window.clearTimeout(decay);
      decay = window.setTimeout(() => rig.set('ptrV', 0, 'hydraulic'), 110);
    };
    const onMove = (event: PointerEvent) => {
      pending = event;
      if (!pointerFrame) pointerFrame = requestAnimationFrame(paintPointer);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pending = null;
      window.clearTimeout(decay);
      unbind();
      window.removeEventListener('pointermove', onMove);
    };
  }, [pressure, reduced]);

  /* The quiet hum only exists while the system is genuinely under pressure. */
  useEffect(() => {
    if (!soundOn) return;
    const id = window.setInterval(() => {
      sound.setHum(pressure.read().pressure);
    }, 400);
    return () => {
      window.clearInterval(id);
      sound.setHum(0);
    };
  }, [pressure, sound, soundOn]);

  /* ---------------------------------------------------------------- */
  /* Derived capsule position                                          */
  /* ---------------------------------------------------------------- */

  const capsule = capsuleStatus(run);
  const marks = capsuleMarks(run);
  const dock: CapsuleDockId = run.openingActive ? 'bay' : capsuleDockFor(run.currentStage);

  const registerDock = useCallback((id: CapsuleDockId, el: HTMLElement | null) => {
    if (el) docks.current.set(id, el);
    else docks.current.delete(id);
  }, []);

  const dockElement = useCallback(
    (id: CapsuleDockId) => docks.current.get(id) ?? null,
    [],
  );

  useEffect(() => {
    bus.emit({ type: 'CAPSULE_MOVED', dock });
  }, [bus, dock]);

  /* ---------------------------------------------------------------- */
  /* Controls                                                          */
  /* ---------------------------------------------------------------- */

  const toggleXray = useCallback(
    (on?: boolean) => {
      setXray((current) => {
        const next = on ?? !current;
        if (next !== current) bus.emit({ type: 'XRAY_CHANGED', on: next, lens });
        return next;
      });
    },
    [bus, lens],
  );

  const toggleSound = useCallback(
    (on?: boolean) => {
      setSoundOn((current) => {
        const next = on ?? !current;
        if (next) void sound.enable();
        else sound.disable();
        return next;
      });
    },
    [sound],
  );

  const arm = useCallback(
    (fault: string | null) => {
      run.armChaos(fault);
      if (fault) bus.emit({ type: 'CHAOS_ARMED', fault });
    },
    [bus, run],
  );

  const inject = useCallback(
    (fault?: string) => {
      const id = fault ?? run.chaosArmed;
      const definition = findFault(id ?? null);
      if (!definition) return;
      run.injectChaos(definition.id, definition.label, definition.plate);
      /* The fault's own declared consequences, in order, once. */
      definition.emits.forEach((type) => {
        switch (type) {
          case 'CHAOS_INJECTED':
            bus.emit({ type: 'CHAOS_INJECTED', fault: definition.id });
            break;
          case 'SECURITY_BLOCKED':
            bus.emit({
              type: 'SECURITY_BLOCKED',
              gate: definition.plate,
              fault: definition.label,
            });
            break;
          case 'GATE_LOCKED':
            bus.emit({ type: 'GATE_LOCKED', gate: definition.plate });
            break;
          case 'SERVICE_FAILED':
            bus.emit({ type: 'SERVICE_FAILED', service: definition.label });
            break;
          case 'FALLBACK_ACTIVE':
            bus.emit({ type: 'FALLBACK_ACTIVE' });
            break;
          case 'DRIFT_DETECTED':
            bus.emit({ type: 'DRIFT_DETECTED' });
            break;
          case 'INCIDENT_STARTED':
            bus.emit({ type: 'INCIDENT_STARTED' });
            break;
          default:
            break;
        }
      });
    },
    [bus, run],
  );

  const recover = useCallback(
    (fault: string) => {
      const definition = findFault(fault);
      if (!definition) return;
      run.recoverChaos(definition.id, definition.label);
      bus.emit({ type: 'CHAOS_RECOVERED', fault: definition.id });
      if (definition.severity === 'block') {
        bus.emit({ type: 'GATE_OPENED', gate: definition.plate });
      }
    },
    [bus, run],
  );

  const requestTrace = useCallback(() => {
    bus.emit({ type: 'COMMAND', command: 'trace:run' });
    bus.emit({ type: 'TRACE_STARTED' });
  }, [bus]);

  const startTour = useCallback(() => {
    setTourStop(0);
    setTouring(true);
  }, []);

  const stopTour = useCallback(() => setTouring(false), []);

  /* ---------------------------------------------------------------- */
  /* Keyboard: hold X for X-Ray, 1–4 for lens                          */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (pathname !== '/') return;

    const typing = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.isContentEditable === true
      );
    };

    const onDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (typing(event.target)) return;

      if (event.key === 'x' || event.key === 'X') {
        if (!event.repeat) toggleXray(true);
        return;
      }
      if (xray && ['1', '2', '3', '4'].includes(event.key)) {
        const map: XRayLens[] = ['system', 'network', 'security', 'state'];
        const next = map[Number(event.key) - 1];
        setLens(next);
        bus.emit({ type: 'XRAY_CHANGED', on: true, lens: next });
      }
    };

    const onUp = (event: KeyboardEvent) => {
      if (event.key === 'x' || event.key === 'X') toggleXray(false);
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [bus, pathname, toggleXray, xray]);

  /* ---------------------------------------------------------------- */
  /* Published state                                                   */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.xray = xray ? lens : '';
    html.dataset.sound = soundOn ? 'on' : 'off';
    html.dataset.tour = touring ? 'running' : '';
    html.dataset.capsule = capsule;
    html.dataset.chaos = run.chaosActive.length ? 'active' : '';
    html.dataset.world = run.openingActive
      ? 'commissioning'
      : run.productionReached
        ? 'production'
        : run.launched
          ? 'operating'
          : 'standby';
  }, [
    capsule,
    lens,
    run.chaosActive.length,
    run.launched,
    run.openingActive,
    run.productionReached,
    soundOn,
    touring,
    xray,
  ]);

  useCausality(run, bus);

  const value = useMemo<Environment>(
    () => ({
      bus,
      pressure,
      capsule,
      marks,
      dock,
      registerDock,
      dockElement,
      xray,
      lens,
      setLens,
      toggleXray,
      armed: run.chaosArmed,
      active: run.chaosActive,
      arm,
      inject,
      recover,
      soundOn,
      toggleSound,
      sound,
      touring,
      tourStop,
      startTour,
      stopTour,
      setTourStop,
      consoleOpen,
      openConsole: setConsoleOpen,
      requestTrace,
      reduced,
    }),
    [
      arm, bus, capsule, consoleOpen, dock, dockElement, inject, lens, marks,
      pressure, recover, reduced, registerDock, requestTrace, run.chaosActive,
      run.chaosArmed, sound, soundOn, startTour, stopTour, toggleSound,
      toggleXray, tourStop, touring, xray,
    ],
  );

  return (
    <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Causality                                                           */
/* ------------------------------------------------------------------ */

/**
 * The bridge. It watches the semantic run state, works out what changed since
 * the last render, and announces it once. This is the only place in V10 where
 * a lifecycle change becomes a system event, which is why there are no
 * scattered `useEffect` chains firing sounds and pressure changes from inside
 * individual plates.
 */
function useCausality(run: RunState, bus: SystemBus) {
  const previous = useRef<RunState | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = run;
    if (!before) return;

    const emit = (event: SystemEvent) => bus.emit(event);

    if (run.runId !== before.runId) emit({ type: 'RUN_RESET' });

    if (run.release !== before.release) {
      if (run.release === 'running') {
        emit({ type: 'RELEASE_STARTED', fault: run.fault, gate: run.faultGate });
      }
      if (run.release === 'refused') {
        emit({
          type: 'SECURITY_BLOCKED',
          gate: run.faultGate ?? 'gate',
          fault: run.fault ?? 'fault',
        });
        emit({ type: 'GATE_LOCKED', gate: run.faultGate ?? 'gate' });
      }
      if (run.release === 'recovering') {
        emit({ type: 'SECURITY_RESOLVED', gate: run.faultGate });
        emit({ type: 'GATE_OPENED', gate: run.faultGate ?? 'gate' });
      }
      if (run.release === 'promoted') emit({ type: 'DEPLOYMENT_COMPLETE' });
    }

    /* Deployment is chamber 08 of the flight — announced when it is entered. */
    if (run.releaseStage !== before.releaseStage && run.releaseStage === 7) {
      emit({ type: 'DEPLOYMENT_STARTED' });
    }

    if (run.drifted !== before.drifted) {
      emit(run.drifted ? { type: 'DRIFT_DETECTED' } : { type: 'RECONCILE_COMPLETE' });
    }
    if (!run.drifted && run.reconciled && !before.reconciled) {
      emit({ type: 'RECONCILE_STARTED' });
    }

    if (run.serviceDown !== before.serviceDown) {
      if (run.serviceDown) {
        emit({ type: 'SERVICE_FAILED', service: 'extracted service' });
        emit({ type: 'FALLBACK_ACTIVE' });
      }
    }

    if (run.incidentAttempts !== before.incidentAttempts) {
      emit({ type: 'INCIDENT_DIAGNOSED', correct: run.incidentSolved });
    }

    if (run.telemetry !== before.telemetry && run.telemetry !== 'quiet') {
      emit({ type: 'TELEMETRY_ONLINE' });
    }

    if (run.productionReached && !before.productionReached) {
      emit({ type: 'PRODUCTION_REACHED' });
    }
  }, [bus, run]);
}

/** Every fault the chaos panel can offer, in operator order. */
export const chaosCatalogue = chaosFaults;
