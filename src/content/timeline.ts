/**
 * THE INCIDENT TIME MACHINE.
 *
 * The Watch plate already asks the reader to name a root cause from evidence.
 * This is the half hour of signals that produced that evidence, scrubbable, so
 * the reader can watch the fault arrive rather than read about it afterwards.
 *
 * ACCURACY. This is the same training scenario as `incident.ts` and it is
 * derived from it: six replicas each opening a pool of twenty against a server
 * that permits ninety connections. Every number below is computed from that
 * arithmetic by the model at the bottom of this file — none of it is a
 * measurement, none of it is production data, and the plate says so.
 *
 * The story the signals tell, in the order they tell it:
 *
 *   T−30  steady. Three replicas, sixty connections, headroom.
 *   T−18  the release scales the deployment to six replicas.
 *   T−10  connection demand exceeds what the server will grant.
 *   T−05  the pods that started last cannot get a connection and report down.
 *   NOW   error rate is near zero — readiness withheld the broken pods.
 */

export type SignalId =
  | 'connections'
  | 'replicas'
  | 'latency'
  | 'errors'
  | 'requests'
  | 'pool';

export type Signal = {
  id: SignalId;
  name: string;
  unit: string;
  /** What this signal is actually telling you. */
  meaning: string;
  /** Value at which this signal is worth acting on. */
  threshold: number;
  /** Where an engineer would read it. */
  seenIn: string;
};

export const signals: Signal[] = [
  {
    id: 'requests',
    name: 'Request rate',
    unit: 'rel.',
    meaning: 'Traffic never changed. Whatever happened was not caused by load.',
    threshold: 1.4,
    seenIn: 'Observe',
  },
  {
    id: 'replicas',
    name: 'Replicas ready',
    unit: 'of 6',
    meaning: 'The number of pods actually in the Service and receiving traffic.',
    threshold: 6,
    seenIn: 'OpenShift',
  },
  {
    id: 'connections',
    name: 'DB connections',
    unit: 'of 90',
    meaning: 'Connections granted by the database server against its maximum.',
    threshold: 90,
    seenIn: 'PostgreSQL',
  },
  {
    id: 'pool',
    name: 'Pool demand',
    unit: '% of max',
    meaning: 'What the replicas are asking for: replicas × pool size.',
    threshold: 100,
    seenIn: 'Helm values',
  },
  {
    id: 'latency',
    name: 'Latency',
    unit: 'rel.',
    meaning: 'Flat throughout. The ready pods were never the problem.',
    threshold: 220,
    seenIn: 'AppDynamics',
  },
  {
    id: 'errors',
    name: 'Error rate',
    unit: '% req.',
    meaning: 'Near zero, because readiness kept the broken pods out of rotation.',
    threshold: 1,
    seenIn: 'Observe · ELK',
  },
];

/** The declared facts the model is built from. */
export const scenario = {
  poolPerPod: 20,
  serverMax: 90,
  replicasBefore: 3,
  replicasAfter: 6,
  /** Minutes before now that the release scaled the deployment. */
  scaledAt: 18,
};

export type Frame = {
  /** Minutes before now. 30 → 0. */
  minutesAgo: number;
  connections: number;
  replicasReady: number;
  latency: number;
  errors: number;
  requests: number;
  /** Pool demand as a percentage of the server maximum. */
  poolDemand: number;
  /** One line of operator copy for this moment. */
  caption: string;
};

/**
 * The model. Entirely deterministic and derived from `scenario`:
 *
 *  · demand = replicas × poolPerPod
 *  · granted = min(demand, serverMax)
 *  · a pod is ready only if the connections granted cover its whole pool
 *  · latency and errors follow readiness, not the other way round
 */
export function frameAt(minutesAgo: number): Frame {
  const t = Math.max(0, Math.min(30, minutesAgo));
  const scaled = t <= scenario.scaledAt;
  const replicas = scaled ? scenario.replicasAfter : scenario.replicasBefore;

  /* New pods start over about four minutes, so demand ramps rather than steps. */
  const ramp = scaled ? Math.min(1, (scenario.scaledAt - t) / 4) : 0;
  const live =
    scenario.replicasBefore +
    Math.round((replicas - scenario.replicasBefore) * ramp);

  const demand = live * scenario.poolPerPod;
  const granted = Math.min(demand, scenario.serverMax);
  const readyPods = Math.floor(granted / scenario.poolPerPod);

  const short = demand - granted;
  const requests = 100;
  /* The ready pods absorb the same traffic. Latency moves a little because
     there is less capacity, not because anything is failing. */
  const latency = Math.round(120 + (live > readyPods ? (short / 20) * 14 : 0));
  const errors = 0;

  const caption =
    t > scenario.scaledAt
      ? 'STEADY · three replicas, sixty connections, headroom against the server maximum.'
      : short <= 0
        ? 'SCALING · the release is taking the deployment to six replicas.'
        : readyPods === live
          ? 'DEMAND RISING · pool demand is approaching the connection limit.'
          : t > 2
            ? 'READINESS WITHHELD · the pods that started last cannot obtain a connection and report themselves down.'
            : 'CONTAINED · error rate near zero. Readiness kept the pods that could not serve out of the Service.';

  return {
    minutesAgo: t,
    connections: granted,
    replicasReady: readyPods,
    latency,
    errors,
    requests,
    poolDemand: Math.round((demand / scenario.serverMax) * 100),
    caption,
  };
}

/** A whole series for one signal, oldest first — used to draw the traces. */
export function series(id: SignalId, steps = 31): number[] {
  return Array.from({ length: steps }, (_, i) => {
    const frame = frameAt(30 - (i / (steps - 1)) * 30);
    switch (id) {
      case 'connections': return frame.connections;
      case 'replicas': return frame.replicasReady;
      case 'latency': return frame.latency;
      case 'errors': return frame.errors;
      case 'requests': return frame.requests;
      case 'pool': return frame.poolDemand;
    }
  });
}

export function readingFor(id: SignalId, frame: Frame): { value: number; text: string } {
  switch (id) {
    case 'connections':
      return { value: frame.connections, text: `${frame.connections} of ${scenario.serverMax}` };
    case 'replicas':
      return { value: frame.replicasReady, text: `${frame.replicasReady} of 6 ready` };
    case 'latency':
      return { value: frame.latency, text: `${frame.latency} relative` };
    case 'errors':
      return { value: frame.errors, text: `${frame.errors}% of requests` };
    case 'requests':
      return { value: frame.requests, text: `${frame.requests} relative` };
    case 'pool':
      return { value: frame.poolDemand, text: `${frame.poolDemand}% of maximum` };
  }
}

export const timelineNote =
  'Simulation. Every value on this timeline is computed from one stated arithmetic — six replicas × a pool of twenty against a server maximum of ninety. It is not measured telemetry.';

/** The question the scrubber is there to make answerable. */
export const timelinePrompt =
  'Scrub the half hour. One signal moves first, and the one everybody watches never moves at all.';
