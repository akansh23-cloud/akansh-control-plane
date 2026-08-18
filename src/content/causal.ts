/**
 * OBSERVABILITY AS A CAUSAL CHAIN.
 *
 * The gauges say what each signal is. This says what makes the next one move,
 * which is the part that decides where an alert belongs.
 *
 * It is derived entirely from `readAt` in observability.ts — the same
 * deterministic model the gauges use — with one stated assumption added:
 * probe requests queue behind user requests, so readiness comes under pressure
 * as latency approaches the timeout budget, before the error rate moves. That
 * is why readiness sits ahead of errors in this chain rather than after them:
 * it is the mechanism that keeps the error rate low, not a consequence of it.
 *
 * Illustrative model. Nothing here is a measurement.
 */

import { readAt } from './observability';

export type LinkState = 'quiet' | 'moving' | 'critical';

export type CausalLink = {
  id: string;
  name: string;
  /** What is happening at this link. */
  what: string;
  /** Why the next link moves. */
  because: string;
  /** Where you would see it. */
  seenIn: string;
};

export const causalChain: CausalLink[] = [
  {
    id: 'saturation',
    name: 'Saturation',
    what: 'The workload approaches the resource limits set on it.',
    because: 'Work arrives faster than it can be finished, so it starts to queue.',
    seenIn: 'AppDynamics · Observe',
  },
  {
    id: 'queueing',
    name: 'Queueing → latency',
    what: 'Time in the queue is added to every request, and latency curves upward.',
    because: 'Health and readiness requests wait in the same queue as user requests.',
    seenIn: 'AppDynamics',
  },
  {
    id: 'readiness',
    name: 'Readiness',
    what: 'Probes come under pressure, and a pod that fails one is taken out of the Service.',
    because: 'Traffic is concentrated on whatever is still ready, or it has nowhere to go.',
    seenIn: 'OpenShift · Kubernetes',
  },
  {
    id: 'errors',
    name: 'Errors',
    what: 'The user finally sees something fail — the last signal to move, not the first.',
    because: 'By this point the interesting decision was three links ago.',
    seenIn: 'Observe · ELK',
  },
];

export type LinkReading = {
  id: string;
  state: LinkState;
  /** 0…1, how hard this link is being pushed. */
  intensity: number;
  /** The number a reader would quote for this link. */
  value: string;
};

/** The whole chain at one load, in the order cause travels along it. */
export function causalAt(load: number): LinkReading[] {
  const l = Math.min(1, Math.max(0, load));
  const r = readAt(l);

  /* Latency against the timeout budget the plate marks on the track. */
  const budget = Math.min(1, (r.latency - 100) / 700);

  const grade = (v: number): LinkState =>
    v >= 0.75 ? 'critical' : v >= 0.35 ? 'moving' : 'quiet';

  const readinessPressure =
    r.readiness < 3 ? 1 : Math.min(1, Math.max(0, (budget - 0.55) / 0.35));

  const errorPressure = Math.min(1, r.errors / 42);

  return [
    {
      id: 'saturation',
      state: grade(l),
      intensity: l,
      value: `${r.saturation}% of limit`,
    },
    {
      id: 'queueing',
      state: grade(budget),
      intensity: budget,
      value: `${r.latency} relative`,
    },
    {
      id: 'readiness',
      state: r.readiness < 3 ? 'critical' : grade(readinessPressure),
      intensity: readinessPressure,
      value: `${r.readiness} of 3 pods ready`,
    },
    {
      id: 'errors',
      state: r.errors > 12 ? 'critical' : r.errors > 0 ? 'moving' : 'quiet',
      intensity: errorPressure,
      value: `${r.errors}% of requests`,
    },
  ];
}

/** What an engineer would do at this load, stated as a decision. */
export function decisionAt(load: number): string {
  const chain = causalAt(load);
  const queue = chain[1];
  const ready = chain[2];
  const errors = chain[3];

  if (errors.state === 'critical') {
    return 'Users are being served errors. The alert that should have fired was on latency, several minutes ago.';
  }
  if (ready.state === 'critical') {
    return 'Pods are being withdrawn from the Service. Nobody is being served a failure — which is exactly what readiness is for — but there is now less capacity than the traffic wants.';
  }
  if (queue.state !== 'quiet') {
    return 'Latency is climbing and nothing has failed yet. This is the moment worth alerting on, and the moment to add capacity.';
  }
  return 'Headroom against the limit. Nothing is queueing, so nothing downstream has anything to react to.';
}
