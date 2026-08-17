/**
 * Project architecture, expressed as data.
 *
 * The drawings render from these graphs, so a relationship can only appear on
 * screen if it exists here. `forbiddenEdges` records relationships that are
 * factually wrong for each project; tests/content.test.ts fails the build if
 * any of them ever creep into `edges`.
 */

export type EdgeKind =
  | 'build' // artifact moving through the build
  | 'supply' // an immutable image being pulled
  | 'control' // desired state / reconciliation, not traffic
  | 'provision' // infrastructure being created, not traffic
  | 'traffic'; // real user request path

export type ArchNode = {
  id: string;
  label: string;
  /** Which views the node belongs to. */
  views: string[];
  note?: string;
};

export type ArchEdge = {
  from: string;
  to: string;
  kind: EdgeKind;
  views: string[];
  label?: string;
};

/* ------------------------------------------------------------------ */
/* Migration Assurance Platform                                        */
/* ------------------------------------------------------------------ */

export const mapViews = [
  {
    id: 'build',
    name: 'Build',
    caption: 'A commit becomes an immutable image, and stops there.',
  },
  {
    id: 'gitops',
    name: 'GitOps',
    caption: 'Git holds the desired state. Argo CD makes the cluster match it.',
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    caption: 'Terraform builds the works. It never carries traffic.',
  },
  {
    id: 'runtime',
    name: 'Runtime',
    caption: 'A request enters at the load balancer and is served by pods.',
  },
] as const;

export type MapViewId = (typeof mapViews)[number]['id'];

export const mapNodes: ArchNode[] = [
  { id: 'dev', label: 'Developer / Git', views: ['build'] },
  { id: 'ci', label: 'GitLab CI/CD', views: ['build'] },
  { id: 'gates', label: 'Build · Test · Security', views: ['build'] },
  { id: 'image', label: 'Container image', views: ['build'] },
  {
    id: 'ecr',
    label: 'Amazon ECR',
    views: ['build', 'gitops', 'infrastructure', 'runtime'],
    note: 'Immutable images live here.',
  },
  {
    id: 'config',
    label: 'Deployment config in Git',
    views: ['gitops'],
    note: 'The desired state of the cluster.',
  },
  {
    id: 'argocd',
    label: 'Argo CD',
    views: ['gitops'],
    note: 'Reconciles desired state into the cluster. It does not build images.',
  },
  {
    id: 'eks',
    label: 'Amazon EKS',
    views: ['gitops', 'infrastructure', 'runtime'],
  },
  { id: 'pods', label: 'Services / Pods', views: ['runtime'] },
  { id: 'alb', label: 'Application Load Balancer', views: ['infrastructure', 'runtime'] },
  { id: 'user', label: 'User', views: ['runtime'] },
  {
    id: 'terraform',
    label: 'Terraform',
    views: ['infrastructure'],
    note: 'Provisions infrastructure only.',
  },
];

export const mapEdges: ArchEdge[] = [
  { from: 'dev', to: 'ci', kind: 'build', views: ['build'] },
  { from: 'ci', to: 'gates', kind: 'build', views: ['build'] },
  { from: 'gates', to: 'image', kind: 'build', views: ['build'] },
  { from: 'image', to: 'ecr', kind: 'build', views: ['build'], label: 'push' },

  { from: 'config', to: 'argocd', kind: 'control', views: ['gitops'], label: 'desired state' },
  { from: 'argocd', to: 'eks', kind: 'control', views: ['gitops'], label: 'reconcile' },
  { from: 'ecr', to: 'eks', kind: 'supply', views: ['gitops', 'runtime'], label: 'image pull' },

  { from: 'terraform', to: 'eks', kind: 'provision', views: ['infrastructure'] },
  { from: 'terraform', to: 'ecr', kind: 'provision', views: ['infrastructure'] },
  { from: 'terraform', to: 'alb', kind: 'provision', views: ['infrastructure'] },

  { from: 'user', to: 'alb', kind: 'traffic', views: ['runtime'] },
  { from: 'alb', to: 'eks', kind: 'traffic', views: ['runtime'] },
  { from: 'eks', to: 'pods', kind: 'traffic', views: ['runtime'] },
];

/** Relationships that are wrong for MAP and must never be drawn. */
export const mapForbiddenEdges: [string, string][] = [
  ['terraform', 'user'],
  ['terraform', 'pods'],
  ['argocd', 'image'],
  ['argocd', 'ecr'],
  ['ecr', 'alb'],
  ['alb', 'ecr'],
];

export const mapProject = {
  id: 'map',
  name: 'Migration Assurance Platform',
  short: 'MAP',
  kind: 'Personal project',
  premise:
    'A GitOps delivery path on AWS: the pipeline only ever produces an image, and the cluster only ever follows Git.',
  stack: [
    'AWS',
    'Amazon EKS',
    'Amazon ECR',
    'Application Load Balancer',
    'Terraform',
    'Argo CD',
    'GitLab CI/CD',
    'Docker',
    'GitOps',
  ],
  /** The point of the design, stated plainly. */
  principles: [
    'The pipeline pushes images. It does not touch the cluster.',
    'Git holds the desired state; Argo CD closes the gap continuously.',
    'Terraform builds the structure and carries no runtime traffic.',
    'The image that was scanned is the image that runs.',
  ],
} as const;

/* ------------------------------------------------------------------ */
/* Career Autopilot                                                    */
/* ------------------------------------------------------------------ */

export const careerProject = {
  id: 'career-autopilot',
  name: 'Career Autopilot',
  kind: 'Personal project',
  serviceCount: 16,
  premise:
    'A legacy monolith taken apart one service at a time, with traffic never stopping.',
  stack: [
    'Monorepo',
    'Per-service Dockerfiles',
    'Multi-stage Docker builds',
    'Per-service build / test / deploy',
    'Path-based change detection',
    'API Gateway routing',
    'Vercel frontend',
  ],
  path: ['User', 'Vercel frontend', 'API Gateway', 'Routing layer'],
  migration: [
    'Extract one service',
    'Route selected traffic to it',
    'Verify',
    'Repeat',
  ],
  fallback:
    'If a service is not migrated yet — or is not answering — routing falls back to the monolith.',
  /**
   * Services are shown as numbered units on purpose. The count and the
   * extraction pattern are real; a made-up service inventory would not be.
   */
  serviceNote:
    'Services are drawn as numbered units. The count and the pattern are real; the names are not published here.',
  /** Infrastructure that belongs to MAP and must never be claimed here. */
  forbiddenTech: ['EKS', 'Terraform', 'Argo CD', 'GitOps'],
} as const;

export const projects = [mapProject, careerProject] as const;
