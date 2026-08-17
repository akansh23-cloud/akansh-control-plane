/**
 * Employment history.
 *
 * Confidentiality rule: nothing here describes Barclays' internal architecture.
 * Only the engineering practice, the public technology names and the two
 * scale facts Akansh is able to state.
 */

export type Role = {
  id: string;
  company: string;
  title: string;
  location: string;
  start: string;
  end: string;
  period: string;
  context: string;
  /** Short, verifiable statements. No invented metrics. */
  work: string[];
  stack: string[];
};

/**
 * ACCURACY RULE, enforced by tests: these two numbers describe different
 * things and must never be merged into one sentence.
 *  - 50+ independently deployable microservices across the wider platform
 *  - 30+ standardised containerised workloads
 */
export const scale = {
  services: {
    value: '50+',
    noun: 'independently deployable microservices',
    qualifier: 'across the wider platform',
  },
  workloads: {
    value: '30+',
    noun: 'standardised containerised workloads',
    qualifier: 'built and operated to one shape',
  },
  stages: {
    value: '20+',
    noun: 'stage GitLab CI/CD release workflow',
    qualifier: 'from artifact retrieval to controlled promotion',
  },
} as const;

export const roles: Role[] = [
  {
    id: 'barclays',
    company: 'Barclays',
    title: 'DevOps Engineer',
    location: 'Pune, India',
    start: '2023-07',
    end: 'present',
    period: 'July 2023 — Present',
    context: 'Enterprise banking / liquidity platform.',
    work: [
      'Own and operate a 20+ stage GitLab CI/CD release workflow: artifact retrieval from Nexus, testing, security scanning, Docker image builds, certificate and JKS updates, PostgreSQL schema and incremental migrations, Helm deployments and controlled image promotion.',
      'Build and operate 30+ standardised containerised workloads on Red Hat OpenShift 4.x — Deployments, Services, Routes, ConfigMaps, resource limits and readiness, liveness and startup probes.',
      'Work across a platform of 50+ independently deployable microservices, keeping deployment shape consistent between them through Helm charts.',
      'Enforce security gates in the pipeline with SonarQube and Veracode at source and build, Trivy on images, and HashiCorp Vault and OpenShift Secrets for secret material.',
      'Lead modernisation work: Jenkins and Bitbucket to GitLab, raw manifests to Helm, JDK 8 to Java 17, JBoss to Tomcat 10, and ELK to Observe.',
      'Support the runtime: messaging with Kafka and IBM MQ, data on PostgreSQL and Hasura, edge with Nginx, and observability through ELK, Observe and AppDynamics.',
    ],
    stack: [
      'Red Hat OpenShift 4.x',
      'Kubernetes',
      'Helm',
      'GitLab CI/CD',
      'Docker',
      'Nexus',
      'Java 17',
      'Tomcat 10',
      'Nginx',
      'Hasura',
      'PostgreSQL',
      'Kafka',
      'IBM MQ',
      'HashiCorp Vault',
      'OpenShift Secrets',
      'SonarQube',
      'Veracode',
      'Trivy',
      'ELK',
      'Observe',
      'AppDynamics',
    ],
  },
  {
    id: 'cloudnxt',
    company: 'CloudNXT',
    title: 'Cloud Engineer Intern',
    location: 'Pune, India',
    start: '2022-05',
    end: '2022-08',
    period: 'May 2022 — August 2022',
    context: 'Azure infrastructure operations.',
    work: [
      'Monitored 100+ Azure virtual machines.',
      'Supported disaster recovery drills.',
      'Ran Azure Snapshot backups.',
      'Supported provisioning, configuration and patching.',
    ],
    stack: ['Microsoft Azure', 'Azure Snapshots', 'Disaster recovery drills'],
  },
];

export const barclays = roles[0];
export const cloudnxt = roles[1];

/** The refit: what the works looked like before, and after. */
export type RefitPair = {
  id: string;
  layer: string;
  before: string;
  after: string;
  /** Why it mattered — one clause, no marketing. */
  gain: string;
};

export const refit: RefitPair[] = [
  {
    id: 'ci',
    layer: 'Delivery',
    before: 'Jenkins + Bitbucket',
    after: 'GitLab CI/CD',
    gain: 'one system for source, pipeline and registry access',
  },
  {
    id: 'deploy',
    layer: 'Deployment',
    before: 'Raw manifests',
    after: 'Helm charts',
    gain: 'the same deployment shape for every workload',
  },
  {
    id: 'runtime',
    layer: 'Runtime',
    before: 'JDK 8',
    after: 'Java 17',
    gain: 'supported runtime, current security patches',
  },
  {
    id: 'server',
    layer: 'App server',
    before: 'JBoss',
    after: 'Tomcat 10',
    gain: 'lighter images, faster container start',
  },
  {
    id: 'obs',
    layer: 'Observability',
    before: 'ELK',
    after: 'Observe',
    gain: 'one place to ask what the platform is doing',
  },
];
