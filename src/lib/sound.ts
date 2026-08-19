/**
 * INFRASTRUCTURE SONIFICATION.
 *
 * Off by default, never autoplayed, and entirely procedural — there is not one
 * audio file in this repository. Every sound is a short synthesised gesture
 * built from the same three primitives a machine actually makes: a struck body
 * (metal), filtered noise (air and fluid), and a clean tone (a signal).
 *
 * The rule is the same as the rule for motion: a sound only exists because
 * something in the system happened. There is no music, no ambience that plays
 * on its own, no alarm, and nothing that could be described as sci-fi.
 */

import type { SystemBus, SystemEvent } from './events';

type Ctx = AudioContext & { close(): Promise<void> };

export class SoundEngine {
  private ctx: Ctx | null = null;
  private bus_: GainNode | null = null;
  private hum: { osc: OscillatorNode; gain: GainNode } | null = null;
  private off: (() => void)[] = [];

  enabled = false;

  /** Created on the first deliberate enable — never before a user gesture. */
  private context(): Ctx | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor() as Ctx;
    this.bus_ = this.ctx.createGain();
    this.bus_.gain.value = 0.5;
    this.bus_.connect(this.ctx.destination);
    return this.ctx;
  }

  async enable() {
    const ctx = this.context();
    if (!ctx) return false;
    if (ctx.state === 'suspended') await ctx.resume();
    this.enabled = true;
    return true;
  }

  disable() {
    this.enabled = false;
    this.stopHum();
    void this.ctx?.suspend?.();
  }

  dispose() {
    this.off.forEach((fn) => fn());
    this.off = [];
    this.stopHum();
    void this.ctx?.close();
    this.ctx = null;
    this.bus_ = null;
  }

  /* ---------------------------------------------------------------- */
  /* Primitives                                                        */
  /* ---------------------------------------------------------------- */

  /** A struck metal body: a short inharmonic ring with a hard attack. */
  private strike(freq: number, decay = 0.28, level = 0.24) {
    const ctx = this.context();
    if (!ctx || !this.bus_ || !this.enabled) return;
    const now = ctx.currentTime;

    [1, 2.71, 4.13].forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq * ratio;
      const amp = level / (i + 1.6);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay / (i * 0.5 + 1));
      osc.connect(gain).connect(this.bus_!);
      osc.start(now);
      osc.stop(now + decay + 0.05);
    });
  }

  /** Filtered noise: air escaping, fluid moving, a scan sweeping. */
  private air(duration = 0.4, from = 900, to = 240, level = 0.12) {
    const ctx = this.context();
    if (!ctx || !this.bus_ || !this.enabled) return;
    const now = ctx.currentTime;
    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(from, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter).connect(gain).connect(this.bus_);
    src.start(now);
    src.stop(now + duration);
  }

  /** A clean short tone: a signal, a routing tick, a confirmation. */
  private tick(freq = 1400, duration = 0.05, level = 0.08) {
    const ctx = this.context();
    if (!ctx || !this.bus_ || !this.enabled) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.bus_);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /* ---------------------------------------------------------------- */
  /* Gestures — the vocabulary                                         */
  /* ---------------------------------------------------------------- */

  gateLock() {
    this.strike(148, 0.34, 0.3);
    window.setTimeout(() => this.strike(96, 0.22, 0.18), 60);
  }

  gateOpen() {
    this.air(0.55, 320, 1200, 0.1);
    window.setTimeout(() => this.strike(220, 0.3, 0.18), 120);
  }

  deploy() {
    this.strike(180, 0.2, 0.18);
    window.setTimeout(() => this.strike(240, 0.22, 0.16), 130);
    window.setTimeout(() => this.strike(320, 0.3, 0.2), 270);
  }

  route() {
    this.tick(1750, 0.035, 0.05);
  }

  fault() {
    this.strike(88, 0.42, 0.3);
    this.air(0.3, 420, 120, 0.08);
  }

  align() {
    this.tick(880, 0.06, 0.06);
    window.setTimeout(() => this.tick(1320, 0.08, 0.06), 90);
  }

  production() {
    this.air(1.1, 200, 60, 0.13);
    window.setTimeout(() => this.strike(132, 0.9, 0.22), 90);
  }

  press() {
    this.tick(520, 0.028, 0.05);
  }

  detent() {
    this.tick(2200, 0.018, 0.035);
  }

  /** The quiet pressure hum. Only ever runs while the system is under load. */
  setHum(level: number) {
    const ctx = this.context();
    if (!ctx || !this.bus_ || !this.enabled) return;
    if (level < 0.05) {
      this.stopHum();
      return;
    }
    if (!this.hum) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 54;
      gain.gain.value = 0;
      osc.connect(gain).connect(this.bus_);
      osc.start();
      this.hum = { osc, gain };
    }
    this.hum.gain.gain.setTargetAtTime(
      Math.min(0.05, level * 0.05),
      ctx.currentTime,
      0.4,
    );
  }

  private stopHum() {
    if (!this.hum) return;
    try {
      this.hum.osc.stop();
      this.hum.osc.disconnect();
      this.hum.gain.disconnect();
    } catch {
      /* Already stopped. */
    }
    this.hum = null;
  }

  /* ---------------------------------------------------------------- */
  /* Causality                                                         */
  /* ---------------------------------------------------------------- */

  subscribe(bus: SystemBus) {
    const react = (event: SystemEvent) => {
      if (!this.enabled) return;
      switch (event.type) {
        case 'RELEASE_STARTED': this.deploy(); break;
        case 'CAPSULE_MOVED': this.tick(660, 0.03, 0.035); break;
        case 'GATE_LOCKED': this.gateLock(); break;
        case 'GATE_OPENED':
        case 'SECURITY_RESOLVED': this.gateOpen(); break;
        case 'SECURITY_BLOCKED':
        case 'SERVICE_FAILED':
        case 'CHAOS_INJECTED': this.fault(); break;
        case 'DEPLOYMENT_STARTED': this.deploy(); break;
        case 'DEPLOYMENT_COMPLETE':
        case 'RECONCILE_COMPLETE':
        case 'CHAOS_RECOVERED': this.align(); break;
        case 'DRIFT_DETECTED': this.strike(110, 0.3, 0.2); break;
        case 'TRACE_HOP': this.route(); break;
        case 'TRACE_COMPLETE': this.align(); break;
        case 'INCIDENT_DIAGNOSED': if (event.correct) this.align(); break;
        case 'PRODUCTION_REACHED': this.production(); break;
        default: break;
      }
    };
    this.off.push(bus.onAny(react));
  }
}
