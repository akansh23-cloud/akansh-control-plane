/**
 * SYSTEM PRESSURE.
 *
 * A works is a fluid system: closing a gate does not simply stop the water, it
 * puts the water behind the gate under pressure, and opening it again releases
 * that pressure as a pulse that arrives downstream a beat later.
 *
 * Four numbers are published on the document element as CSS custom properties
 * so every plate can read the same semantic system state without a render or a
 * second animation loop:
 *
 *   --sys-pressure    0…1  how much is being held back
 *   --sys-flow        0…1  how fast the system is moving
 *   --sys-turbulence  0…1  how disturbed it is
 *   --sys-energy      0…1  the delayed downstream consequence
 *
 * Ordinary document scrolling is deliberately not fluid turbulence. The
 * pressure model now reacts only to lifecycle/system events; scroll-linked
 * registration is handled by the components that actually follow the page.
 */

import type { SystemBus, SystemEvent } from './events';
import { Rig } from './runtime';

export type PressureReading = {
  pressure: number;
  flow: number;
  turbulence: number;
  energy: number;
};

const REST = { pressure: 0.12, flow: 0.16, turbulence: 0, energy: 0.1 };

export class PressureModel {
  readonly rig: Rig;

  private held = false;
  private released: (() => void)[] = [];

  constructor() {
    this.rig = new Rig({
      pressure: { value: REST.pressure, family: 'hydraulic' },
      flow: { value: REST.flow, family: 'mechanical' },
      turbulence: { value: 0, family: 'mechanical' },
      energy: { value: REST.energy, family: 'hydraulic' },
    });
  }

  configure(reduced: boolean) {
    this.rig.configure({ reduced });
  }

  read(): PressureReading {
    return {
      pressure: this.rig.get('pressure'),
      flow: this.rig.get('flow'),
      turbulence: this.rig.get('turbulence'),
      energy: this.rig.get('energy'),
    };
  }

  /** Publish to an element as CSS variables. Returns the unbind. */
  bind(el: Element | null) {
    return this.rig.bindVars(el, {
      '--sys-pressure': (r) => r.get('pressure'),
      '--sys-flow': (r) => r.get('flow'),
      '--sys-turbulence': (r) => r.get('turbulence'),
      '--sys-energy': (r) => r.get('energy'),
    });
  }

  /* ---------------------------------------------------------------- */
  /* Inputs                                                            */
  /* ---------------------------------------------------------------- */

  /**
   * Scroll moves the reader through the works; it is not a fault and it does
   * not create turbulence. Keeping this hook makes the environment wiring
   * stable while preventing ordinary scrolling from pumping the whole page.
   */
  scrolled(velocity: number) {
    void velocity;
  }

  /** Everything returns to rest unless something is holding it. */
  settle() {
    this.rig.set('flow', this.held ? 0.05 : REST.flow, 'mechanical', 0.28);
    this.rig.set('turbulence', this.held ? 0.28 : 0, 'mechanical', 0.22);
    if (!this.held) this.rig.set('pressure', REST.pressure, 'recovery', 0.48);
  }

  /** A gate closed. Upstream pressure builds while flow is cut off. */
  hold() {
    this.held = true;
    this.rig.set('pressure', 0.94, 'hydraulic', 1.5);
    this.rig.set('flow', 0.05, 'failure');
    this.rig.set('turbulence', 0.28, 'mechanical', 0.18);
    this.rig.set('energy', 0.06, 'hydraulic');
  }

  /**
   * A gate reopened. The system responds firmly but without an artificial
   * velocity kick. The downstream energy still arrives after the cause.
   */
  release() {
    this.held = false;
    this.rig.set('pressure', REST.pressure, 'recovery', 0.48);
    this.rig.set('flow', 0.72, 'mechanical', 0.2);
    this.rig.set('turbulence', 0.2, 'mechanical', 0.16);

    window.setTimeout(() => {
      this.rig.set('energy', 0.86, 'release');
      this.rig.set('turbulence', 0, 'mechanical', 0.24);
    }, 220);
    window.setTimeout(() => {
      this.rig.set('flow', REST.flow, 'mechanical', 0.34);
      this.rig.set('energy', 0.34, 'recovery', 0.48);
    }, 900);
  }

  /** A short directed surge — a release moving, a request dispatched. */
  surge(strength = 0.6) {
    const s = clamp(strength, 0, 1);
    this.rig.set('flow', clamp(0.3 + s * 0.38, 0, 1), 'mechanical', 0.18);
    window.setTimeout(() => this.settle(), 620);
  }

  /** The system is running steadily and telemetry is live. */
  operational() {
    this.held = false;
    this.rig.set('pressure', 0.42, 'recovery', 0.56);
    this.rig.set('flow', 0.48, 'mechanical', 0.3);
    this.rig.set('energy', 0.72, 'recovery', 0.52);
    this.rig.set('turbulence', 0, 'mechanical', 0.24);
  }

  /** Something is degraded. Pressure changes; disturbance is event-driven. */
  disturb() {
    this.rig.set('turbulence', 0.58, 'mechanical', 0.16);
    this.rig.set('pressure', 0.56, 'recovery', 0.42);
    this.rig.set('energy', 0.24, 'recovery', 0.42);
  }

  reset() {
    this.held = false;
    this.rig.jump('pressure', REST.pressure);
    this.rig.jump('flow', REST.flow);
    this.rig.jump('turbulence', 0);
    this.rig.jump('energy', REST.energy);
  }

  /* ---------------------------------------------------------------- */
  /* Causality                                                         */
  /* ---------------------------------------------------------------- */

  /**
   * The wiring between the event system and the fluid. This is the only place
   * that decides what a lifecycle event does to the water, which is why there
   * are no pressure effects scattered through the plates.
   */
  subscribe(bus: SystemBus) {
    const react = (event: SystemEvent) => {
      switch (event.type) {
        case 'RELEASE_STARTED':
          this.surge(0.7);
          break;
        case 'CAPSULE_MOVED':
          this.surge(0.34);
          break;
        case 'GATE_LOCKED':
        case 'SECURITY_BLOCKED':
          this.hold();
          break;
        case 'GATE_OPENED':
        case 'SECURITY_RESOLVED':
          this.release();
          break;
        case 'DEPLOYMENT_STARTED':
          this.surge(0.8);
          break;
        case 'DEPLOYMENT_COMPLETE':
        case 'RECONCILE_COMPLETE':
          this.release();
          break;
        case 'DRIFT_DETECTED':
        case 'SERVICE_FAILED':
        case 'INCIDENT_STARTED':
          this.disturb();
          break;
        case 'FALLBACK_ACTIVE':
          this.surge(0.45);
          break;
        case 'RECONCILE_STARTED':
          this.hold();
          break;
        case 'INCIDENT_DIAGNOSED':
          if (event.correct) this.operational();
          break;
        case 'TRACE_STARTED':
          this.surge(0.5);
          break;
        case 'PRODUCTION_REACHED':
        case 'TELEMETRY_ONLINE':
          this.operational();
          break;
        case 'RUN_RESET':
          this.reset();
          break;
        default:
          break;
      }
    };

    this.released.push(bus.onAny(react));
    return () => this.dispose();
  }

  dispose() {
    this.released.forEach((off) => off());
    this.released = [];
  }
}

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
