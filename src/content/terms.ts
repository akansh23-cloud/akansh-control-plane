/**
 * LIVING ARCHITECTURE TEXT.
 *
 * A technology name in a paragraph is usually dead weight — a logo rendered as
 * a word. These few are not: hovering or focusing one lets it come apart into
 * the thing it actually is, which is a component with a responsibility and a
 * relationship to something else, and then close again.
 *
 * Applied deliberately and sparingly. If every noun did this the page would be
 * unreadable, so only the terms whose *relationship* is the interesting part
 * are listed here.
 */

export type TermNode = {
  id: string;
  label: string;
  /** Position in a 240 × 92 field. */
  x: number;
  y: number;
  kind: 'source' | 'system' | 'consumer' | 'store' | 'gate';
};

export type TermEdge = {
  from: string;
  to: string;
  /** What travels along this edge. */
  carries?: string;
};

export type ArchTerm = {
  id: string;
  /** The word as it appears in copy. */
  word: string;
  /** One clause: what it is responsible for. */
  duty: string;
  nodes: TermNode[];
  edges: TermEdge[];
};

export const archTerms: ArchTerm[] = [
  {
    id: 'vault',
    word: 'Vault',
    duty: 'Holds secret material so nothing secret has to live in an image or a repository.',
    nodes: [
      { id: 'vault', label: 'Vault', x: 30, y: 46, kind: 'store' },
      { id: 'pipeline', label: 'Pipeline', x: 120, y: 20, kind: 'system' },
      { id: 'runtime', label: 'Workload', x: 210, y: 46, kind: 'consumer' },
      { id: 'secret', label: 'Secret', x: 120, y: 74, kind: 'gate' },
    ],
    edges: [
      { from: 'vault', to: 'pipeline', carries: 'certificate + JKS' },
      { from: 'pipeline', to: 'runtime' },
      { from: 'vault', to: 'secret', carries: 'mounted' },
      { from: 'secret', to: 'runtime' },
    ],
  },
  {
    id: 'openshift',
    word: 'OpenShift',
    duty: 'Runs the workloads and decides which pods are allowed to receive traffic.',
    nodes: [
      { id: 'route', label: 'Route', x: 26, y: 46, kind: 'source' },
      { id: 'service', label: 'Service', x: 104, y: 46, kind: 'system' },
      { id: 'ready', label: 'Ready', x: 190, y: 20, kind: 'consumer' },
      { id: 'held', label: 'Not ready', x: 190, y: 74, kind: 'gate' },
    ],
    edges: [
      { from: 'route', to: 'service', carries: 'traffic' },
      { from: 'service', to: 'ready', carries: 'endpoints' },
      { from: 'service', to: 'held', carries: 'withheld' },
    ],
  },
  {
    id: 'helm',
    word: 'Helm',
    duty: 'Turns a deployment into a declared object set instead of a sequence of commands.',
    nodes: [
      { id: 'chart', label: 'Chart', x: 28, y: 46, kind: 'source' },
      { id: 'values', label: 'Values', x: 28, y: 76, kind: 'store' },
      { id: 'render', label: 'Render', x: 118, y: 46, kind: 'system' },
      { id: 'objects', label: 'Deployment · Service · Route', x: 208, y: 46, kind: 'consumer' },
    ],
    edges: [
      { from: 'chart', to: 'render' },
      { from: 'values', to: 'render', carries: 'per environment' },
      { from: 'render', to: 'objects', carries: 'applied' },
    ],
  },
  {
    id: 'argocd',
    word: 'Argo CD',
    duty: 'Reconciles live cluster state back to what Git declares. It never pushes images.',
    nodes: [
      { id: 'git', label: 'Git', x: 28, y: 30, kind: 'source' },
      { id: 'argo', label: 'Argo CD', x: 118, y: 46, kind: 'system' },
      { id: 'cluster', label: 'Cluster', x: 210, y: 30, kind: 'consumer' },
      { id: 'drift', label: 'Drift', x: 210, y: 78, kind: 'gate' },
    ],
    edges: [
      { from: 'git', to: 'argo', carries: 'declared' },
      { from: 'argo', to: 'cluster', carries: 'reconcile' },
      { from: 'drift', to: 'argo', carries: 'observed' },
    ],
  },
  {
    id: 'trivy',
    word: 'Trivy',
    duty: 'The last place a vulnerable image can be stopped before it can run anywhere.',
    nodes: [
      { id: 'image', label: 'Image', x: 30, y: 46, kind: 'source' },
      { id: 'scan', label: 'Scan', x: 120, y: 46, kind: 'gate' },
      { id: 'registry', label: 'Registry', x: 212, y: 22, kind: 'store' },
      { id: 'stop', label: 'Refused', x: 212, y: 76, kind: 'gate' },
    ],
    edges: [
      { from: 'image', to: 'scan' },
      { from: 'scan', to: 'registry', carries: 'clean' },
      { from: 'scan', to: 'stop', carries: 'critical' },
    ],
  },
  {
    id: 'terraform',
    word: 'Terraform',
    duty: 'Describes the infrastructure itself, so an environment can be rebuilt rather than remembered.',
    nodes: [
      { id: 'hcl', label: 'Config', x: 28, y: 46, kind: 'source' },
      { id: 'plan', label: 'Plan', x: 112, y: 22, kind: 'system' },
      { id: 'state', label: 'State', x: 112, y: 74, kind: 'store' },
      { id: 'cloud', label: 'VPC · EKS · IAM', x: 208, y: 46, kind: 'consumer' },
    ],
    edges: [
      { from: 'hcl', to: 'plan' },
      { from: 'state', to: 'plan', carries: 'what exists' },
      { from: 'plan', to: 'cloud', carries: 'apply' },
    ],
  },
  {
    id: 'gitlab',
    word: 'GitLab CI/CD',
    duty: 'Carries one artifact through every stage, and refuses to rebuild it on the way up.',
    nodes: [
      { id: 'commit', label: 'Commit', x: 26, y: 46, kind: 'source' },
      { id: 'stages', label: '20+ stages', x: 112, y: 46, kind: 'system' },
      { id: 'artifact', label: 'One image', x: 200, y: 22, kind: 'store' },
      { id: 'gate', label: 'Gates', x: 200, y: 74, kind: 'gate' },
    ],
    edges: [
      { from: 'commit', to: 'stages' },
      { from: 'stages', to: 'artifact', carries: 'built once' },
      { from: 'stages', to: 'gate', carries: 'checked at each level' },
    ],
  },
];

export const findTerm = (id: string) => archTerms.find((term) => term.id === id) ?? null;
