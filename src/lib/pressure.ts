/**
 * SYSTEM PRESSURE.
 *
 * A works is a fluid system: closing a gate does not simply stop the water, it
 * puts the water behind the gate under pressure, and opening it again releases
 * that pressure as a pulse that arrives downstream a beat later.
 *
 * This is the smallest honest model of that, and it is what makes V10 feel
 * causal rather than decorated. Four numbers, published once on the document
 * element as CSS custom properties, which every plate can read without a
 * listener, a render, or a second animation loop:
 *
 *   --sys-pressure    0…1  how much is being held back
 *   --sys-flow        0…1  how fast the system is moving
 *   --sys-turbulence  0…1  how disturbed it is
 *   --sys-energy      0…1  the delayed downstream consequence
 *
 * Inputs are scroll velocity and lifecycle events. There is no ambient random
 * motion anywhere in it: with no scrolling and no run, all four settle to
 * their resting values and the rig stops taking frames entirely.
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
  private scrollDecay = 0;
  private released: (() => void)[] = [];

  constructor() {
    this.rig = new Rig({
      /* Water carries momentum and settles late. */
      pressure: { value: REST.pressure, family: 'hydraulic' },
      flow: { value: REST.flow, family: 'hydraulic' },
      /* Disturbance is quick to appear and quick to go. */
      turbulence: { value: 0, family: 'mechanical' },
      /* The downstream consequence arrives after the cause. */
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
   * Scroll is an input to the world, never a hijack of it. Fast scrolling
   * briefly raises flow and turbulence; stopping lets both settle.
   */
  scrolled(velocity: number) {
    const v = Math.min(1, Math.abs(velocity));
    if (v < 0.02) return;
    this.rig.set('flow', clamp(REST.flow + v * 0.62, 0, 1), 'hydraulic');
    this.rig.set('turbulence', Math.min(0.5, v * 0.45), 'mechanical', 0.14);
    if (!this.held) {
      this.rig.set('pressure', clamp(REST.pressure + v * 0.22, 0, 1), 'hydraulic');
    }

    window.clearTimeout(this.scrollDecay);
    this.scrollDecay = window.setTimeout(() => this.settle(), 260);
  }

  /** Everything returns to rest unless something is holding it. */
  settle() {
    this.rig.set('flow', this.held ? 0.05 : REST.flow, 'hydraulic');
    this.rig.set('turbulence', this.held ? 0.28 : 0, 'mechanical');
    if (!this.held) this.rig.set('pressure', REST.pressure, 'hydraulic');
  }

  /** A gate closed. Upstream pressure builds while flow is cut off. */
  hold() {
    this.held = true;
    this.rig.set('pressure', 0.94, 'hydraulic', 1.5);
    this.rig.set('flow', 0.05, 'failure');
    this.rig.set('turbulence', 0.34, 'mechanical');
    this.rig.set('energy', 0.06, 'hydraulic');
  }

  /**
   * A gate reopened. The held pressure is released as a pulse that reaches
   * downstream *after* the flow moves, which is the whole point: cause first,
   * consequence second, visibly separated in time.
   */
  release() {
    this.held = false;
    this.rig.set('pressure', REST.pressure, 'recovery');
    this.rig.set('flow', 0.86, 'release');
    this.rig.impulse('flow', 1.4);
    this.rig.set('turbulence', 0.52, 'mechanical');

    window.setTimeout(() => {
      this.rig.set('energy', 0.92, 'release');
      this.rig.set('turbulence', 0, 'mechanical');
    }, 220);
    window.setTimeout(() => {
      this.rig.set('flow', REST.flow, 'hydraulic');
      this.rig.set('energy', 0.34, 'hydraulic');
    }, 1100);
  }

  /** A short directed surge — a release moving, a request dispatched. */
  surge(strength = 0.6) {
    this.rig.set('flow', clamp(0.4 + strength * 0.5, 0, 1), 'release');
    this.rig.impulse('flow', strength);
    window.setTimeout(() => this.settle(), 900);
  }

  /** The system is running steadily and telemetry is live. */
  operational() {
    this.held = false;
    this.rig.set('pressure', 0.42, 'recovery');
    this.rig.set('flow', 0.5, 'hydraulic');
    this.rig.set('energy', 0.72, 'hydraulic');
    this.rig.set('turbulence', 0, 'mechanical');
  }

  /** Something is degraded. Pressure is uneven rather than high. */
  disturb() {
    this.rig.set('turbulence', 0.66, 'mechanical');
    this.rig.set('pressure', 0.58, 'hydraulic');
    this.rig.set('energy', 0.24, 'hydraulic');
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
    window.clearTimeout(this.scrollDecay);
    this.released.forEach((off) => off());
    this.released = [];
  }
}

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
