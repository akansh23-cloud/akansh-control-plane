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
  repo: 'https://github.com/akansh23-cloud/migration-verification',
  repoLabel: 'akansh23-cloud/migration-verification',
  /**
   * Deliberately not "live". The AWS infrastructure is torn down between
   * demonstrations rather than left running, and saying "live" about a stopped
   * environment is the kind of claim this content layer exists to prevent.
   * The repository runs end to end on a laptop with Node alone.
   */
  deployment: 'Runs locally with Node alone; the AWS environment is brought up on demand rather than left running.',
  /**
   * NOTE: what follows describes how MAP is DELIVERED, not what it does. The
   * repository is a deterministic data-migration verification platform. See
   * the open question in REBUILD_NOTES.md — this premise currently describes
   * the deployment topology and calls it the project.
   */
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
  repo: 'https://github.com/akansh23-cloud/career-autopilot',
  repoLabel: 'akansh23-cloud/career-autopilot',
  live: 'https://www.careerautopilot.co',
  liveLabel: 'careerautopilot.co',
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

/* ------------------------------------------------------------------ */
/* MAP — what the platform actually does                               */
/* ------------------------------------------------------------------ */

/**
 * The graphs above describe how MAP is DELIVERED. This one describes what it
 * IS, which is the part a reviewer actually cares about and the part the site
 * previously left out entirely.
 *
 * Every claim here is drawn from the repository's own README and API contract.
 * Nothing is inferred: if the code does not say it, it is not here.
 */

export const mapProductViews = [
  {
    id: 'verification',
    name: 'Verification',
    lane: 'platform',
    caption:
      'A run is enqueued, drained by a worker, and executed by a deterministic engine. Nothing on this path is a model.',
  },
  {
    id: 'evidence',
    name: 'Evidence',
    lane: 'platform',
    caption:
      'Every run writes a bundle whose hash is reproducible and whose signature can be checked with no service, no network and no database.',
  },
  {
    id: 'tenancy',
    name: 'Access',
    lane: 'platform',
    caption:
      'Identity decides who may call and what they may do — never what the answer is.',
  },
] as const;

export type MapProductViewId = (typeof mapProductViews)[number]['id'];

export type MapProductNode = {
  id: string;
  label: string;
  /** Which labelled band of the drawing this component sits in. */
  zone: string;
  views: string[];
  note?: string;
};

export type MapProductEdge = {
  from: string;
  to: string;
  kind: EdgeKind;
  views: string[];
  /**
   * Labels are rationed. A label earns its place only where the relationship
   * is not obvious from the two boxes it joins — otherwise it is noise that
   * collides with the next label along.
   */
  label?: string;
  /** Routing hint for an edge that would otherwise cross an occupied column. */
  axis?: 'horizontal' | 'vertical';
};

export const mapProductZones: Record<string, { id: string; label: string }[]> = {
  verification: [
    { id: 'entry', label: 'Callers' },
    { id: 'service', label: 'Service layer' },
    { id: 'core', label: 'Deterministic core' },
  ],
  evidence: [
    { id: 'core', label: 'Produced by the engine' },
    { id: 'store', label: 'Stored, immutably' },
    { id: 'verify', label: 'Checked offline' },
  ],
  tenancy: [
    { id: 'idp', label: 'Identity' },
    { id: 'service', label: 'Authorisation' },
    { id: 'core', label: 'Data' },
  ],
};

export const mapProductNodes: MapProductNode[] = [
  /* verification */
  {
    id: 'cli',
    label: 'reconcile CLI',
    zone: 'entry',
    views: ['verification'],
    note: 'The original tool, preserved. Calls the same engine surface as the API.',
  },
  {
    id: 'console',
    label: 'React console',
    zone: 'entry',
    views: ['verification'],
    note: 'Projects, table pairs, runs, findings, evidence.',
  },
  {
    id: 'api',
    label: 'Express API',
    zone: 'service',
    views: ['verification', 'tenancy'],
    note: 'Enqueues a run and returns 202. It never executes one.',
  },
  {
    id: 'queue',
    label: 'Run queue',
    zone: 'service',
    views: ['verification'],
    note: 'A column in the metadata DB. No broker to operate.',
  },
  {
    id: 'worker',
    label: 'Worker',
    zone: 'service',
    views: ['verification'],
    note: 'Claims a job atomically, off the request path.',
  },
  {
    id: 'engine',
    label: 'Verification engine',
    zone: 'core',
    views: ['verification', 'evidence'],
    note: 'Streaming merge-join. Counts, gates and verdict are computed by code.',
  },
  {
    id: 'verdict',
    label: 'PASS · WARN · FAIL · ERROR',
    zone: 'core',
    views: ['verification'],
    note: 'A run that cannot execute is ERROR — never a silent pass.',
  },

  /* evidence */
  {
    id: 'bundle',
    label: 'Evidence bundle',
    zone: 'core',
    views: ['evidence'],
    note: 'reconciliation.json · report.html · manifest.json · signature.json',
  },
  {
    id: 'hash',
    label: 'evidenceHash',
    zone: 'core',
    views: ['evidence'],
    note: 'SHA-256 over a canonical projection. Volatile fields stripped, keys sorted.',
  },
  {
    id: 'signature',
    label: 'Ed25519 signature',
    zone: 'store',
    views: ['evidence'],
    note: 'Signs the hash. The private key never leaves the server.',
  },
  {
    id: 'worm',
    label: 'S3 Object Lock',
    zone: 'store',
    views: ['evidence'],
    note: 'WORM retention, so a published bundle cannot be overwritten.',
  },
  {
    id: 'auditchain',
    label: 'Audit hash chain',
    zone: 'store',
    views: ['evidence', 'tenancy'],
    note: 'Append-only. Each entry binds the previous hash, so an edit is structural.',
  },
  {
    id: 'verifier',
    label: 'Offline verifier',
    zone: 'verify',
    views: ['evidence'],
    note: 'Recomputes the hash and checks the signature with only a public key.',
  },

  /* tenancy */
  {
    id: 'idp',
    label: 'OIDC / SAML IdP',
    zone: 'idp',
    views: ['tenancy'],
    note: 'Verified with node:crypto. Algorithm pinned; alg-confusion rejected.',
  },
  {
    id: 'scim',
    label: 'SCIM 2.0',
    zone: 'idp',
    views: ['tenancy'],
    note: 'Roles as groups. Provisioning reconciles rather than duplicates.',
  },
  {
    id: 'rbac',
    label: 'Five roles',
    zone: 'service',
    views: ['tenancy'],
    note: 'owner · admin · engineer · auditor · viewer, from one permission matrix.',
  },
  {
    id: 'apikey',
    label: 'Scoped API keys',
    zone: 'service',
    views: ['tenancy'],
    note: 'Authorised by scope, not role. Shown once, stored as a hash.',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    zone: 'core',
    views: ['tenancy'],
    note: 'Hard isolation. Another tenant is 404, never 403 — no existence leak.',
  },
];

export const mapProductEdges: MapProductEdge[] = [
  /* verification */
  /* The CLI calls the engine directly — the interesting fact about this
     architecture, and the one edge that has to cross the service tier. It is
     routed vertically so it travels under the tier rather than through it. */
  { from: 'cli', to: 'engine', kind: 'build', views: ['verification'], axis: 'vertical' },
  { from: 'console', to: 'api', kind: 'traffic', views: ['verification'] },
  { from: 'api', to: 'queue', kind: 'control', views: ['verification'], label: 'enqueue' },
  { from: 'queue', to: 'worker', kind: 'control', views: ['verification'], label: 'claim' },
  { from: 'worker', to: 'engine', kind: 'build', views: ['verification'], label: 'execute' },
  { from: 'engine', to: 'verdict', kind: 'supply', views: ['verification'] },

  /* evidence */
  { from: 'engine', to: 'bundle', kind: 'build', views: ['evidence'] },
  { from: 'bundle', to: 'hash', kind: 'supply', views: ['evidence'], label: 'canonical' },
  { from: 'hash', to: 'signature', kind: 'control', views: ['evidence'], label: 'signs' },
  { from: 'signature', to: 'worm', kind: 'supply', views: ['evidence'] },
  { from: 'signature', to: 'verifier', kind: 'control', views: ['evidence'], label: 'exit 0 / 1' },
  { from: 'bundle', to: 'auditchain', kind: 'control', views: ['evidence'], axis: 'vertical' },

  /* tenancy */
  { from: 'idp', to: 'api', kind: 'traffic', views: ['tenancy'], label: 'assertion' },
  { from: 'scim', to: 'rbac', kind: 'control', views: ['tenancy'], label: 'groups' },
  { from: 'api', to: 'rbac', kind: 'control', views: ['tenancy'] },
  { from: 'apikey', to: 'rbac', kind: 'control', views: ['tenancy'], label: 'scopes' },
  { from: 'rbac', to: 'workspace', kind: 'supply', views: ['tenancy'], label: 'membership' },
  { from: 'rbac', to: 'auditchain', kind: 'control', views: ['tenancy'], axis: 'vertical' },
];

/** The guarantee the repository leads with, in its own terms. */
export const mapGuarantee = {
  headline: 'Determinism is the product.',
  body: 'No language model anywhere in the verification path. The same source, target, key columns and rules always produce the same verdict and the same evidence hash.',
  proofs: [
    'Re-running a verification reproduces the evidence hash exactly.',
    'A partitioned run over 1–16 ranges yields a byte-identical hash to a single pass.',
    'Postgres and SQLite produce the same hash for the same run.',
    'An auditor verifies a bundle with no service, no network and no database.',
  ],
  tests: '166 engine tests · 90 API tests',
} as const;
