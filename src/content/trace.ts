/**
 * TRACE ONE REQUEST.
 *
 * The path a single request takes through Career Autopilot, in the order it
 * takes it. This is the same architecture the Split plate draws — browser to
 * the Vercel-hosted frontend, into the API gateway, through policy, out to an
 * extracted service, into its runtime and its database, and back.
 *
 * ACCURACY. The route is real; the timings are not measurements. They are a
 * stated model of relative cost — a policy check is cheap, a database read is
 * not — and the plate says so on screen. Nothing here is production telemetry.
 */

export type Hop = {
  id: string;
  /** What the component is called. */
  name: string;
  /** One clause: what it is responsible for. */
  duty: string;
  /** What it says when the request passes through it. */
  says: string;
  /** Relative cost of this hop in the model, in arbitrary units. */
  cost: number;
  /** Position along the drawn route, 0…1. */
  at: number;
  /** Which X-Ray lens this hop belongs to. */
  lens: 'network' | 'security' | 'system' | 'state';
};

export const traceHops: Hop[] = [
  {
    id: 'browser',
    name: 'Browser',
    duty: 'Issues the request and waits for one answer.',
    says: 'REQUEST ISSUED',
    cost: 0,
    at: 0,
    lens: 'network',
  },
  {
    id: 'edge',
    name: 'Edge',
    duty: 'Vercel serves the frontend and forwards API calls onward.',
    says: 'EDGE ACCEPTED',
    cost: 12,
    at: 0.16,
    lens: 'network',
  },
  {
    id: 'gateway',
    name: 'API gateway',
    duty: 'Resolves which service owns this route — and where to fall back.',
    says: 'ROUTE RESOLVED',
    cost: 8,
    at: 0.34,
    lens: 'network',
  },
  {
    id: 'policy',
    name: 'Policy',
    duty: 'Authenticates the caller before any service is reached.',
    says: 'ACCESS APPROVED',
    cost: 6,
    at: 0.48,
    lens: 'security',
  },
  {
    id: 'service',
    name: 'Service',
    duty: 'The extracted service that owns this capability.',
    says: 'REQUEST EXECUTED',
    cost: 18,
    at: 0.64,
    lens: 'system',
  },
  {
    id: 'runtime',
    name: 'Runtime',
    duty: 'Container running under a readiness probe and resource limits.',
    says: 'CONTAINER READY',
    cost: 5,
    at: 0.78,
    lens: 'system',
  },
  {
    id: 'data',
    name: 'Data',
    duty: 'PostgreSQL, reached through a pooled connection.',
    says: 'READ COMPLETE',
    cost: 24,
    at: 0.9,
    lens: 'state',
  },
  {
    id: 'response',
    name: 'Response',
    duty: 'The answer travels back along the same route.',
    says: 'RESPONSE RETURNED',
    cost: 10,
    at: 1,
    lens: 'network',
  },
];

/** The alternative route, taken when the extracted service is out. */
export const fallbackHop: Hop = {
  id: 'monolith',
  name: 'Monolith',
  duty: 'The capability still lives here, so the gateway falls back to it.',
  says: 'FALLBACK ACTIVE',
  cost: 34,
  at: 0.64,
  lens: 'network',
};

export const traceNote =
  'Simulation. The route is the real architecture of Career Autopilot; the timings are a stated model of relative cost, not measured latency.';

/** Total modelled cost of a path, for the readout. */
export function traceCost(hops: Hop[]) {
  return hops.reduce((total, hop) => total + hop.cost, 0);
}
