/**
 * THE INCIDENT ROOM — one troubleshooting scenario, played by the visitor.
 *
 * ACCURACY RULE. This is a *training scenario*, not an incident that happened.
 * Nothing here is production telemetry, nothing describes Barclays' internal
 * architecture, and no customer, service or system is named. What makes it
 * credible is that every mechanism in it is one this platform genuinely
 * configures: readiness / liveness / startup probes, Helm-set resource limits,
 * replica counts and a pooled PostgreSQL connection.
 *
 * The scenario is deliberately one where the *platform behaved correctly* and
 * the reader has to notice that: readiness kept the half-started pods out of
 * rotation, which is why nobody was served an error.
 */

export type Clue = {
  id: string;
  /** Where a real engineer would have looked. */
  source: string;
  label: string;
  /** The readout, as lines. Deliberately terse, like the real thing. */
  lines: string[];
  /** What this tells you, once you have read it. */
  reads: string;
};

export type Hypothesis = {
  id: string;
  label: string;
  correct: boolean;
  /** Why this is or is not the explanation. */
  verdict: string;
};

export type Incident = {
  id: string;
  title: string;
  brief: string;
  simulated: string;
  clues: Clue[];
  hypotheses: Hypothesis[];
  resolution: string[];
  lesson: string;
};

export const incident: Incident = {
  id: 'never-ready',
  title: 'Half the pods never came ready',
  /** The page a visitor lands on. */
  brief:
    'A release is deployed. It passed every gate, and the image is the one that was scanned. Minutes later, half the new pods are running but never report ready — and yet no user has seen an error. Work out why, using what the platform is telling you.',
  simulated:
    'Training scenario, not an incident report. It is built from failure modes this platform configures for — probes, limits, replica counts and a pooled database connection — and contains no production data, no customer detail and no internal architecture.',
  clues: [
    {
      id: 'pods',
      source: 'oc get pods',
      label: 'Workload state',
      lines: [
        'app-7c9d4f-2h8kq   1/1   Running   0   6m',
        'app-7c9d4f-4bxzt   1/1   Running   0   6m',
        'app-7c9d4f-9mv2p   1/1   Running   0   6m',
        'app-7c9d4f-lq7rd   0/1   Running   0   6m',
        'app-7c9d4f-tt4wn   0/1   Running   0   6m',
        'app-7c9d4f-x2fcb   0/1   Running   0   6m',
      ],
      reads:
        'Three of six pods are ready. The other three are running — the container did not crash, and there is no restart count. Whatever is wrong happens after the process starts.',
    },
    {
      id: 'events',
      source: 'oc describe deployment',
      label: 'Events',
      lines: [
        'Warning  Unhealthy  readiness probe failed: HTTP 503 on /health',
        'Normal   ScalingReplicaSet  scaled up replica set to 6',
        'Normal   Killing            none',
      ],
      reads:
        'The readiness probe is failing, not the liveness probe — so Kubernetes is holding those pods out of the Service rather than restarting them. The replica count went up with this release.',
    },
    {
      id: 'logs',
      source: 'container log',
      label: 'Application log',
      lines: [
        'INFO  starting datasource pool (size 20)',
        'WARN  could not obtain connection after 30000ms',
        'WARN  health check DOWN: datasource unavailable',
      ],
      reads:
        'The application starts fine and then cannot get a database connection. Its own health endpoint reports itself down, which is what the probe is reading.',
    },
    {
      id: 'signals',
      source: 'metrics',
      label: 'Signals',
      lines: [
        'request latency        flat',
        'error rate             ~0',
        'database connections   at the server maximum',
        'pods ready             3 of 6',
      ],
      reads:
        'Users are being served normally by the three ready pods. The saturated resource is not CPU or memory — it is connections on the database side.',
    },
  ],
  hypotheses: [
    {
      id: 'image',
      label: 'The image is bad and should be rolled back',
      correct: false,
      verdict:
        'It is the same image on all six pods, and three of them are healthy. A bad image would fail identically everywhere, and it would have failed the image gate before it ever reached a cluster.',
    },
    {
      id: 'probe-timing',
      label: 'The readiness probe is too aggressive for this startup path',
      correct: false,
      verdict:
        'Reasonable, and worth checking — but probe timing would delay readiness, not prevent it indefinitely. These pods have been running six minutes and the log says exactly what is missing.',
    },
    {
      id: 'pool',
      label: 'Replicas × pool size now exceeds what the database will allow',
      correct: true,
      verdict:
        'Six replicas each opening a pool of twenty want more connections than the server permits, so the pods that started last never obtain one, report themselves down, and are held out of rotation. The release is fine; the arithmetic between replica count and pool size is not.',
    },
    {
      id: 'lb',
      label: 'The router is sending traffic to the wrong pods',
      correct: false,
      verdict:
        'The opposite is happening, and it is the reason nobody saw an error: a pod that fails readiness is removed from the Service endpoints, so no traffic reached the pods that could not serve it.',
    },
  ],
  /** What actually gets done about it, in order. */
  resolution: [
    'Nothing is rolled back first — the ready pods are serving, so there is no user-facing outage to chase.',
    'Bring replicas back to the count the database was sized for, which restores readiness immediately.',
    'Fix the arithmetic in the chart values: pool size per pod × maximum replicas must stay under the connection limit.',
    'Redeploy through the same pipeline, and watch readiness rather than the deployment log — readiness is the signal that means "serving".',
    'Add the connection ceiling to what is reviewed before a replica count changes, so the next change to either number has to consider the other.',
  ],
  /** The lesson, stated plainly. */
  lesson:
    'The interesting part of this scenario is that the platform did its job: readiness is what turned a capacity mistake into a partial degradation instead of an outage. Probes are not a formality on a deployment manifest — they are the mechanism that decides whether a bad pod serves traffic.',
};
