/**
 * Identity, positioning, certifications and contact.
 * This module is the ONLY place these facts are declared.
 * tests/content.test.ts enforces the accuracy rules that apply to them.
 */

export const profile = {
  name: 'Akansh Mowar',
  givenName: 'Akansh',
  familyName: 'Mowar',
  roles: ['DevOps Engineer', 'Platform Engineer', 'Cloud Engineer'] as const,
  roleLine: 'DevOps / Platform / Cloud Engineer',
  location: 'Pune, India',
  locality: 'Pune',
  region: 'Maharashtra',
  country: 'IN',
  experience: '3+ years',
  /** The thesis. Used in the opening, in metadata and in the resume. */
  thesis:
    'Building and operating systems that move software safely from code to production.',
  /** One sentence of substance for recruiters, no adjectives. */
  summary:
    'DevOps engineer on an enterprise banking platform at Barclays, working across OpenShift, Kubernetes, Helm and GitLab CI/CD. Day to day: release engineering, containerised workloads, security gates and platform modernisation.',
  practice: 'SRE-aligned engineering practices',
} as const;

export const contact = {
  email: 'mowar23akansh@gmail.com',
  linkedin: 'https://www.linkedin.com/in/akansh-mowar-5a83261a0',
  github: 'https://github.com/akansh23-cloud',
} as const;

/**
 * Canonical production origin.
 *
 * There is no correct default here, so there is no permanent one. The domain
 * comes from NEXT_PUBLIC_SITE_URL; when it is unset the site still builds and
 * works, but nothing *generated* — the OG artwork, the résumé footer — prints
 * a domain it cannot vouch for. A wrong URL burned into a shared image is
 * worse than no URL at all.
 */
const explicitOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');

export const site = {
  url: explicitOrigin || 'https://akanshmowar.com',
  /** False means: the origin above is a placeholder, not a decision. */
  originConfigured: Boolean(explicitOrigin),
  title: 'Akansh Mowar — DevOps / Platform / Cloud Engineer',
  shortTitle: 'Akansh Mowar',
  description:
    'DevOps, platform and cloud engineer in Pune, India. Three years building release pipelines, containerised workloads and Kubernetes/OpenShift platforms that move software safely from code to production.',
  resumePath: '/Akansh_Mowar_DevOps_Platform_Engineer_Resume.pdf',
  resumeRoute: '/resume',
  ogImage: '/og.png',
} as const;

export type Credential = {
  id: string;
  name: string;
  issuer: string;
  code?: string;
  /** completed = held today. preparation = studying, explicitly not held. */
  status: 'completed' | 'preparation';
};

/**
 * ACCURACY RULE, enforced by tests:
 *  - AWS Certified Solutions Architect must never appear here.
 *  - CKAD may only ever appear with status 'preparation'.
 */
export const credentials: Credential[] = [
  {
    id: 'az-104',
    name: 'Azure Administrator Associate',
    issuer: 'Microsoft',
    code: 'AZ-104',
    status: 'completed',
  },
  {
    id: 'az-900',
    name: 'Azure Fundamentals',
    issuer: 'Microsoft',
    code: 'AZ-900',
    status: 'completed',
  },
  {
    id: 'aws-ccp',
    name: 'Cloud Practitioner',
    issuer: 'AWS',
    status: 'completed',
  },
  {
    id: 'ckad',
    name: 'Certified Kubernetes Application Developer',
    issuer: 'CNCF',
    code: 'CKAD',
    status: 'preparation',
  },
];

export const completedCredentials = credentials.filter(
  (c) => c.status === 'completed',
);
export const preparationCredentials = credentials.filter(
  (c) => c.status === 'preparation',
);

/** The 20–60 second scan. Rendered in the drawing legend and in the resume. */
export const scanFacts: { label: string; value: string }[] = [
  { label: 'Now', value: 'DevOps Engineer, Barclays — Pune' },
  { label: 'Experience', value: '3+ years' },
  { label: 'Platform', value: 'OpenShift 4.x · Kubernetes · Helm' },
  { label: 'Delivery', value: 'GitLab CI/CD · Docker · Nexus' },
  { label: 'Cloud', value: 'AWS (EKS, ECR, ALB) · Azure' },
  { label: 'Infrastructure', value: 'Terraform · Argo CD · GitOps' },
  { label: 'Security', value: 'SonarQube · Veracode · Trivy · Vault' },
  // Three separate facts about three separate things. They get three rows,
  // because putting them on one line invites them to be read as one claim.
  { label: 'Platform', value: '50+ independently deployable microservices' },
  { label: 'Workloads', value: '30+ standardised containerised workloads' },
  { label: 'Release', value: '20+ stage GitLab CI/CD workflow' },
];
