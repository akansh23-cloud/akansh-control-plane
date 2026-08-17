/**
 * Observability, as a set of relationships rather than a dashboard.
 *
 * Nothing here is a measurement. The reading is derived from a slider the
 * visitor moves, using a simple model of how saturation, latency, error rate
 * and readiness relate to each other. It is labelled as such on screen.
 */

export type Gauge = {
  id: 'saturation' | 'latency' | 'errors' | 'readiness';
  name: string;
  unit: string;
  /** What this signal actually tells you. */
  meaning: string;
  /** Where you would go and look at it. */
  seenIn: string[];
};

export const gauges: Gauge[] = [
  {
    id: 'saturation',
    name: 'Saturation',
    unit: '% of limit',
    meaning: 'How close the workload is to the resource limits set on it.',
    seenIn: ['AppDynamics', 'Observe'],
  },
  {
    id: 'latency',
    name: 'Latency',
    unit: 'relative',
    meaning: 'Queueing shows up here first, well before anything returns an error.',
    seenIn: ['AppDynamics'],
  },
  {
    id: 'errors',
    name: 'Error rate',
    unit: '% of requests',
    meaning: 'What the user is actually experiencing.',
    seenIn: ['Observe', 'ELK'],
  },
  {
    id: 'readiness',
    name: 'Readiness',
    unit: 'pods ready',
    meaning:
      'A pod that fails its readiness probe stops receiving traffic instead of failing requests.',
    seenIn: ['OpenShift', 'Kubernetes'],
  },
];

export type Reading = {
  saturation: number;
  latency: number;
  errors: number;
  readiness: number;
  /** 'healthy' | 'degrading' | 'shedding' */
  state: 'healthy' | 'degrading' | 'shedding';
  /** What an engineer would say about this reading. */
  note: string;
};

/**
 * The model. Deliberately simple and deterministic:
 *  - latency curves upward as saturation approaches the limit (queueing)
 *  - errors stay near zero until latency crosses the timeout budget
 *  - readiness drops once errors are sustained, which removes pods from
 *    the load balancer rather than serving failures
 */
export function readAt(load: number): Reading {
  const l = Math.min(1, Math.max(0, load));
  const saturation = Math.round(l * 100);
  const latency = Math.round(100 + 900 * Math.pow(l, 3.2));
  const errors = l < 0.72 ? 0 : Math.round(Math.pow((l - 0.72) / 0.28, 2) * 42);
  const readiness = errors > 18 ? (errors > 32 ? 1 : 2) : 3;

  const state: Reading['state'] =
    errors > 18 ? 'shedding' : l > 0.6 ? 'degrading' : 'healthy';

  const note =
    state === 'healthy'
      ? 'Headroom against the limit. Latency is flat and nothing is queueing.'
      : state === 'degrading'
        ? 'Latency is climbing before any request has failed. This is the moment worth alerting on.'
        : 'Probes are failing, so those pods are taken out of rotation. Traffic goes to the pods that are still ready.';

  return { saturation, latency, errors, readiness, state, note };
}

export const observabilityNote =
  'Illustrative model, not measurements. Move the load and watch the relationships between signals.';

export const observabilityChain = [
  'Request',
  'Workload',
  'Metric / log / event',
  'Health',
  'Response',
];
