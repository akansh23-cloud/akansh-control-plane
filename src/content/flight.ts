/**
 * The release flight.
 *
 * A canal "flight" is a staircase of locks that lifts a vessel between levels.
 * These nine chambers group the real 20+ stage GitLab CI/CD workflow into the
 * families of work it performs. Every chamber below corresponds to work that
 * actually happens in the pipeline — nothing is added for symmetry.
 */

export type Chamber = {
  id: string;
  /** Short name on the lock wall. */
  name: string;
  /** What the stage does, in one sentence. */
  detail: string;
  /** Tools genuinely used at this stage. */
  tools: string[];
  /** Gate classification — security gates read differently in the drawing. */
  kind: 'transport' | 'verify' | 'security' | 'build' | 'data' | 'release';
};

export const chambers: Chamber[] = [
  {
    id: 'retrieve',
    name: 'Retrieve',
    detail: 'Pull the built artifact and its dependencies from Nexus.',
    tools: ['Nexus'],
    kind: 'transport',
  },
  {
    id: 'test',
    name: 'Test',
    detail: 'Run the test suite before anything is allowed to move up.',
    tools: ['GitLab CI/CD'],
    kind: 'verify',
  },
  {
    id: 'source-scan',
    name: 'Source gate',
    detail: 'Static analysis and application security scanning of the source.',
    tools: ['SonarQube', 'Veracode'],
    kind: 'security',
  },
  {
    id: 'image',
    name: 'Image build',
    detail: 'Build the container image that will be promoted, unchanged, to production.',
    tools: ['Docker'],
    kind: 'build',
  },
  {
    id: 'image-scan',
    name: 'Image gate',
    detail: 'Scan the image for vulnerabilities before it can be deployed anywhere.',
    tools: ['Trivy'],
    kind: 'security',
  },
  {
    id: 'certs',
    name: 'Certificates',
    detail: 'Update certificates and JKS material; secrets stay in Vault and OpenShift Secrets.',
    tools: ['HashiCorp Vault', 'OpenShift Secrets'],
    kind: 'security',
  },
  {
    id: 'migrate',
    name: 'Schema',
    detail: 'Apply incremental PostgreSQL schema migrations ahead of the workload.',
    tools: ['PostgreSQL'],
    kind: 'data',
  },
  {
    id: 'deploy',
    name: 'Deploy',
    detail: 'Helm release onto OpenShift — Deployments, Services, Routes, ConfigMaps, limits and probes.',
    tools: ['Helm', 'OpenShift 4.x'],
    kind: 'release',
  },
  {
    id: 'promote',
    name: 'Promote',
    detail: 'Controlled promotion of the same image to the next environment.',
    tools: ['GitLab CI/CD', 'Nexus'],
    kind: 'release',
  },
];

/** Deployment objects configured on every workload. Shown as chamber fittings. */
export const workloadFittings = [
  'Deployment',
  'Service',
  'Route',
  'ConfigMap',
  'Resource limits',
  'Readiness probe',
  'Liveness probe',
  'Startup probe',
];

export type Fault = {
  id: string;
  /** Abbreviated label, for a three-across control on a phone. */
  short: string;
  /** Chamber the gate refuses at. */
  at: string;
  label: string;
  /** What the visitor sees fail. */
  effect: string;
  /** What the platform does about it. */
  response: string;
  /** How it gets fixed for real. */
  recovery: string;
};

export const faults: Fault[] = [
  {
    id: 'cve',
    at: 'image-scan',
    short: 'CVE',
    label: 'Critical CVE in the image',
    effect: 'The image gate refuses to open. The release never reaches a cluster.',
    response: 'The pipeline stops at the gate. Nothing downstream is touched.',
    recovery: 'Rebuild on a patched base image, re-scan, and the gate opens.',
  },
  {
    id: 'migration',
    at: 'migrate',
    short: 'Schema',
    label: 'Schema migration fails',
    effect: 'The migration stops part-way and the level below is held.',
    response: 'The release is held before deployment rather than half-applied.',
    recovery: 'Fix the incremental migration, re-run, and the chamber fills.',
  },
  {
    id: 'readiness',
    at: 'deploy',
    short: 'Probe',
    label: 'Readiness probe never passes',
    effect: 'The new pods never report ready, so they never receive traffic.',
    response: 'The rollout is rolled back. The previous release keeps serving.',
    recovery: 'Fix startup configuration or probe timing, then deploy again.',
  },
];

export const flightNote =
  'Simulation. This is a model of how the release workflow behaves, drawn in the browser — not live infrastructure and not production data.';
