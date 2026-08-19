/**
 * CHAOS MODE.
 *
 * A resilience showcase, not random destruction. Six faults, each of which is
 * a failure mode this platform genuinely configures against, and each of which
 * produces a *specific, deterministic* reaction somewhere else in the works:
 * a gate refuses, a route changes, declared state diverges, telemetry moves.
 *
 * There is no fake terminal spam and no score. Injecting the same fault twice
 * produces exactly the same behaviour both times.
 */

import type { SystemEvent } from '@/lib/events';

export type ChaosFault = {
  id: string;
  /** Operator label. Short enough for an armed indicator. */
  label: string;
  /** What is being simulated. */
  what: string;
  /** What the system does about it — the reason this is worth showing. */
  reaction: string;
  /** The recovery action's label. */
  recovery: string;
  /** What the recovery actually does. */
  recovers: string;
  /** Which plate the consequence is visible on. */
  plate: 'flight' | 'basin' | 'split' | 'gauges' | 'watch';
  /** How severe the operator indicator reads. */
  severity: 'block' | 'degrade' | 'drift';
  /** Events the environment emits when this fault is injected. */
  emits: SystemEvent['type'][];
};

export const chaosFaults: ChaosFault[] = [
  {
    id: 'cve',
    label: 'Critical CVE',
    what: 'A critical severity finding appears in the container image.',
    reaction:
      'The image gate refuses to open. Nothing reaches a cluster, and nothing downstream is touched.',
    recovery: 'Rebuild and rescan',
    recovers: 'Rebuilt on a patched base image. The scan passes and the gate opens.',
    plate: 'flight',
    severity: 'block',
    emits: ['CHAOS_INJECTED', 'SECURITY_BLOCKED', 'GATE_LOCKED'],
  },
  {
    id: 'readiness',
    label: 'Readiness probe failure',
    what: 'New pods run but never report ready.',
    reaction:
      'They are held out of the Service and the rollout is reversed. The previous release keeps serving.',
    recovery: 'Correct probe timing',
    recovers: 'Startup configuration and probe timing corrected, then deployed again.',
    plate: 'flight',
    severity: 'block',
    emits: ['CHAOS_INJECTED', 'SECURITY_BLOCKED'],
  },
  {
    id: 'certificate',
    label: 'Certificate expired',
    what: 'The certificate material the workload needs has passed its expiry.',
    reaction:
      'The certificates stage refuses the release rather than deploying a workload that cannot terminate TLS.',
    recovery: 'Refresh from Vault',
    recovers: 'Certificate and JKS material refreshed from Vault. The stage completes.',
    plate: 'flight',
    severity: 'block',
    emits: ['CHAOS_INJECTED', 'SECURITY_BLOCKED', 'GATE_LOCKED'],
  },
  {
    id: 'service',
    label: 'Service unavailable',
    what: 'An extracted service stops answering.',
    reaction:
      'The gateway resolves the route to the monolith instead. The request keeps moving; it does not disappear.',
    recovery: 'Restore the service',
    recovers: 'The service answers again and the gateway returns the route to it.',
    plate: 'split',
    severity: 'degrade',
    emits: ['CHAOS_INJECTED', 'SERVICE_FAILED', 'FALLBACK_ACTIVE'],
  },
  {
    id: 'drift',
    label: 'GitOps drift',
    what: 'Live cluster state is edited by hand, away from what Git declares.',
    reaction:
      'Argo CD reports the application out of sync. Declared state is still the truth; live state is now wrong.',
    recovery: 'Reconcile',
    recovers: 'Reconciliation pulls live state back to what Git declares.',
    plate: 'basin',
    severity: 'drift',
    emits: ['CHAOS_INJECTED', 'DRIFT_DETECTED'],
  },
  {
    id: 'saturation',
    label: 'DB connection saturation',
    what: 'Replicas × pool size exceeds the connection limit the server permits.',
    reaction:
      'Pods that cannot obtain a connection report themselves down and readiness withholds them, so users are still served.',
    recovery: 'Fix the arithmetic',
    recovers:
      'Pool size per pod × maximum replicas brought back under the connection limit.',
    plate: 'watch',
    severity: 'degrade',
    emits: ['CHAOS_INJECTED', 'INCIDENT_STARTED'],
  },
];

export const chaosNote =
  'Simulation. Each fault is deterministic — the same injection produces the same behaviour every time — and every reaction is one this platform is genuinely configured for.';

export const chaosPreamble =
  'Arm a fault, then inject it. The consequence appears where it would really appear, and stays until you recover it.';

export const findFault = (id: string | null) =>
  chaosFaults.find((fault) => fault.id === id) ?? null;
