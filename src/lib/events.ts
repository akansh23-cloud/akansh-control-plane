/**
 * THE CAUSAL EVENT SYSTEM.
 *
 * V9 already had one place where the *semantics* of a run lived — the reducer
 * in `lifecycle.ts`. What it did not have was a place where the *consequences*
 * of a semantic change could be picked up by things that are not React state:
 * pressure in the pipes, a sound, the capsule deciding to move, telemetry
 * waking up.
 *
 * This is that place, and it is deliberately tiny. It is not a state store and
 * it must never become one. State lives in the reducer; this only announces
 * that state changed, once, so that the visual systems can react instead of
 * each growing its own `useEffect` chain of `setTimeout`s.
 *
 * The rule V10 is built on:
 *
 *   NOTHING MOVES JUST BECAUSE IT LOOKS COOL.
 *   EVERY MOTION IS CAUSED BY SOMETHING IN THE SYSTEM.
 *
 * An event on this bus is what "something in the system" means.
 */

export type SystemEvent =
  /* Release lifecycle */
  | { type: 'RELEASE_STARTED'; fault: string | null; gate: string | null }
  | { type: 'CAPSULE_MOVED'; dock: string }
  | { type: 'GATE_LOCKED'; gate: string }
  | { type: 'GATE_OPENED'; gate: string }
  | { type: 'SECURITY_BLOCKED'; gate: string; fault: string }
  | { type: 'SECURITY_RESOLVED'; gate: string | null }
  | { type: 'DEPLOYMENT_STARTED' }
  | { type: 'DEPLOYMENT_COMPLETE' }

  /* Platform */
  | { type: 'SERVICE_FAILED'; service: string }
  | { type: 'FALLBACK_ACTIVE' }
  | { type: 'DRIFT_DETECTED' }
  | { type: 'RECONCILE_STARTED' }
  | { type: 'RECONCILE_COMPLETE' }

  /* Observability */
  | { type: 'INCIDENT_STARTED' }
  | { type: 'INCIDENT_DIAGNOSED'; correct: boolean }
  | { type: 'TELEMETRY_ONLINE' }

  /* Request tracing */
  | { type: 'TRACE_STARTED' }
  | { type: 'TRACE_HOP'; hop: string; degraded: boolean }
  | { type: 'TRACE_COMPLETE'; degraded: boolean }

  /* Chaos */
  | { type: 'CHAOS_ARMED'; fault: string }
  | { type: 'CHAOS_INJECTED'; fault: string }
  | { type: 'CHAOS_RECOVERED'; fault: string }

  /* Operator commands.
     The console does not re-implement anything: it announces the same command
     the on-screen control announces, and whichever plate owns that control
     performs it. One action, two ways to reach it. */
  | { type: 'COMMAND'; command: string; arg?: string }

  /* Environment */
  | { type: 'XRAY_CHANGED'; on: boolean; lens: string }
  | { type: 'SCROLL_ENERGY'; velocity: number }
  | { type: 'PRODUCTION_REACHED' }
  | { type: 'RUN_RESET' };

export type SystemEventType = SystemEvent['type'];

type Handler = (event: SystemEvent) => void;

/**
 * A synchronous fan-out. Handlers are called in registration order and a
 * throwing handler is not allowed to take the others down with it — a sound
 * engine failing on a locked audio context must never stop the capsule from
 * moving.
 */
export class SystemBus {
  private all = new Set<Handler>();
  private byType = new Map<SystemEventType, Set<Handler>>();

  /** Subscribe to one event type. Returns the unsubscribe. */
  on(type: SystemEventType, handler: Handler): () => void {
    let set = this.byType.get(type);
    if (!set) {
      set = new Set();
      this.byType.set(type, set);
    }
    set.add(handler);
    return () => set.delete(handler);
  }

  /** Subscribe to everything. Used by the run log and the receipt. */
  onAny(handler: Handler): () => void {
    this.all.add(handler);
    return () => this.all.delete(handler);
  }

  emit(event: SystemEvent) {
    const set = this.byType.get(event.type);
    if (set) for (const handler of [...set]) safely(handler, event);
    for (const handler of [...this.all]) safely(handler, event);
  }
}

function safely(handler: Handler, event: SystemEvent) {
  try {
    handler(event);
  } catch {
    /* A reactive system must not be able to break the causal one. */
  }
}

/** Operator-facing wording for an event. Short, imperative, no apology. */
export const eventCaption: Record<SystemEventType, string> = {
  RELEASE_STARTED: 'RELEASE STARTED',
  CAPSULE_MOVED: 'CAPSULE MOVED',
  GATE_LOCKED: 'GATE LOCKED',
  GATE_OPENED: 'GATE OPEN',
  SECURITY_BLOCKED: 'RELEASE BLOCKED',
  SECURITY_RESOLVED: 'SCAN PASSED',
  DEPLOYMENT_STARTED: 'DEPLOYING',
  DEPLOYMENT_COMPLETE: 'DEPLOYED',
  SERVICE_FAILED: 'ROUTE DEGRADED',
  FALLBACK_ACTIVE: 'FALLBACK ACTIVE',
  DRIFT_DETECTED: 'DRIFT DETECTED',
  RECONCILE_STARTED: 'RECONCILING',
  RECONCILE_COMPLETE: 'STATE RESTORED',
  INCIDENT_STARTED: 'INCIDENT OPEN',
  INCIDENT_DIAGNOSED: 'ROOT CAUSE FOUND',
  TELEMETRY_ONLINE: 'TELEMETRY ONLINE',
  TRACE_STARTED: 'REQUEST DISPATCHED',
  TRACE_HOP: 'HOP',
  TRACE_COMPLETE: 'RESPONSE RETURNED',
  CHAOS_ARMED: 'FAULT ARMED',
  CHAOS_INJECTED: 'FAULT INJECTED',
  CHAOS_RECOVERED: 'RECOVERED',
  COMMAND: 'COMMAND',
  XRAY_CHANGED: 'X-RAY',
  SCROLL_ENERGY: 'FLOW',
  PRODUCTION_REACHED: 'PRODUCTION HEALTHY',
  RUN_RESET: 'RUN RESET',
};
