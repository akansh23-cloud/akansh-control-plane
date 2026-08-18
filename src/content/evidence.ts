/**
 * THE EVIDENCE VAULT.
 *
 * Every strong claim on this site, opened up: what is being claimed, the
 * context it sits in, what Akansh actually did, what it was built with, and —
 * the part most portfolios leave out — what would let a reader check it.
 *
 * ACCURACY RULES, enforced by tests:
 *  - `evidence` never invents a number, a percentage, a saving or an award.
 *  - Where work is confidential, the evidence line says so plainly rather than
 *    implying an audit trail that does not exist. An honest "not externally
 *    auditable" is worth more than a fabricated metric.
 *  - Nothing here describes an employer's internal architecture.
 */

export type EvidenceCard = {
  id: string;
  /** The claim, in the words it appears in elsewhere on the site. */
  claim: string;
  /** Where the work sat. */
  context: string;
  /** First person, specific, no adjectives. */
  did: string[];
  stack: string[];
  /** What a reader can check, and where. Honest about what they cannot. */
  evidence: string;
  /** Optional pointer at the plate that draws this claim. */
  seeAlso?: { label: string; href: string };
  /** 'work' = employment, 'project' = personal, 'credential' = awarded. */
  kind: 'work' | 'project' | 'credential';
};

export const evidenceCards: EvidenceCard[] = [
  {
    id: 'pipeline',
    kind: 'work',
    claim: 'I own and operate a 20+ stage GitLab CI/CD release workflow.',
    context:
      'An enterprise banking platform at Barclays, where a release is promoted between environments rather than rebuilt for each one.',
    did: [
      'Retrieve the built artifact and its dependencies from Nexus, then run the test suite before anything is allowed to move.',
      'Build the container image once, and promote that same image through the environments unchanged.',
      'Run certificate and JKS updates, and incremental PostgreSQL schema migrations, ahead of the workload that needs them.',
      'Deploy with Helm onto OpenShift and carry out controlled promotion to the next environment.',
    ],
    stack: ['GitLab CI/CD', 'Nexus', 'Docker', 'Helm', 'OpenShift 4.x', 'PostgreSQL'],
    evidence:
      'Not externally auditable — the pipeline is internal and its detail is confidential. What can be checked is the shape: Plate 02 models the stage families, in order, and the failure behaviour it demonstrates is the behaviour the real gates have.',
    seeAlso: { label: 'Plate 02 — The Flight', href: '#flight' },
  },
  {
    id: 'workloads',
    kind: 'work',
    claim: 'I build and operate 30+ standardised containerised workloads.',
    context:
      'One deployment shape across the workloads, so that operating the thirty-first is the same job as operating the first.',
    did: [
      'Define Deployments, Services, Routes and ConfigMaps as chart templates rather than per-service manifests.',
      'Set resource limits on every workload, and readiness, liveness and startup probes on every workload.',
      'Keep the differences between services in values, not in the shape of the deployment.',
    ],
    stack: ['Red Hat OpenShift 4.x', 'Kubernetes', 'Helm', 'Docker'],
    evidence:
      'The count is a statement about scope of work and is not published anywhere externally. The practice behind it is visible: the fittings list under Plate 02 is the set configured on every workload, and Plate 07 shows what happens when a readiness probe is the thing standing between a bad pod and a user.',
    seeAlso: { label: 'Plate 07 — The Watch', href: '#watch' },
  },
  {
    id: 'platform',
    kind: 'work',
    claim:
      'I work across a platform of 50+ independently deployable microservices.',
    context:
      'A separate fact from the workload count: this is the size of the platform the work sits inside, not the number of things operated directly.',
    did: [
      'Keep deployment shape consistent between services through shared Helm charts.',
      'Support the runtime around them — messaging, data, edge and observability — rather than only the pipeline that ships them.',
    ],
    stack: ['Helm', 'Kafka', 'IBM MQ', 'PostgreSQL', 'Hasura', 'Nginx'],
    evidence:
      'Stated as scope, deliberately kept separate from the 30+ workloads and the 20+ stages on this site and in the résumé, because merging them would inflate all three.',
  },
  {
    id: 'gates',
    kind: 'work',
    claim: 'Security gates are enforced in the pipeline, not asked for politely.',
    context:
      'A gate that can be skipped is documentation. These stop the release where it stands.',
    did: [
      'Run static analysis and application security scanning against source, at the point the release is trying to move up.',
      'Scan the image for vulnerabilities before it can be deployed anywhere.',
      'Keep secret material in Vault and OpenShift Secrets, and update certificates and JKS material through the pipeline rather than by hand.',
    ],
    stack: ['SonarQube', 'Veracode', 'Trivy', 'HashiCorp Vault', 'OpenShift Secrets'],
    evidence:
      'Tool names are public; findings are not, and none are reproduced here. Plate 02 lets you inject a critical CVE and watch where it is refused — the gate it stops at is the gate it stops at in the pipeline.',
    seeAlso: { label: 'Plate 02 — The Flight', href: '#flight' },
  },
  {
    id: 'refit',
    kind: 'work',
    claim: 'I led modernisation across five layers of a running platform.',
    context:
      'Jenkins and Bitbucket to GitLab, raw manifests to Helm, JDK 8 to Java 17, JBoss to Tomcat 10, ELK to Observe — with the service still serving throughout.',
    did: [
      'Move delivery onto one system for source, pipeline and registry access.',
      'Replace hand-written manifests with charts, so every workload deploys to the same shape.',
      'Move the runtime and application server onto supported, patched versions with lighter images.',
      'Consolidate observability into one place to ask what the platform is doing.',
    ],
    stack: ['GitLab CI/CD', 'Helm', 'Java 17', 'Tomcat 10', 'Observe'],
    evidence:
      'The five layers and their replacements are named exactly, with no claimed percentage improvement attached to any of them, because none was measured in a form that could be published. Plate 03 is the same five facts, drawn.',
    seeAlso: { label: 'Plate 03 — The Refit', href: '#refit' },
  },
  {
    id: 'map',
    kind: 'project',
    claim:
      'I built a deterministic migration verification platform that produces signed evidence.',
    context:
      'A personal project — Migration Assurance Platform. The same run over the same inputs produces the same result, which is what makes its output usable as evidence.',
    did: [
      'Design the verification run, the evidence it emits and the tenancy model around who is allowed to ask for one.',
      'Ship it as an open repository that runs end to end on a laptop with Node alone.',
      'Deliver it with Terraform, Argo CD and GitOps onto EKS, with ECR holding the images.',
    ],
    stack: ['Amazon EKS', 'Amazon ECR', 'Terraform', 'Argo CD', 'Helm'],
    evidence:
      'Fully checkable: the repository is public, including the tests the guarantee rests on. Plate 04 draws the architecture from a typed graph whose forbidden relationships are asserted in this repository\u2019s own test suite.',
    seeAlso: { label: 'Plate 04 — The Basin', href: '#basin' },
  },
  {
    id: 'split',
    kind: 'project',
    claim: 'I decomposed a monolith into 16 services without stopping traffic.',
    context:
      'A personal project — Career Autopilot, a placement-readiness application, taken apart behind a gateway one service at a time.',
    did: [
      'Extract services incrementally, with the gateway holding the contract steady while each one moved.',
      'Fall back to the monolith when a service is not answering, so extraction is reversible per service.',
    ],
    stack: ['Monorepo', 'API gateway', 'Docker'],
    evidence:
      'The repository is public. Plate 05 is the routing behaviour, including the fallback, drawn as a simulation you can operate.',
    seeAlso: { label: 'Plate 05 — The Split', href: '#split' },
  },
  {
    id: 'certs',
    kind: 'credential',
    claim: 'AZ-104, AZ-900 and AWS Cloud Practitioner are held.',
    context:
      'Three certifications awarded. Two more — CKAD and AWS DOP-C02 — are preparation, and are labelled as not certified everywhere they appear.',
    did: [
      'Passed Microsoft Azure Administrator Associate (AZ-104) and Azure Fundamentals (AZ-900).',
      'Passed AWS Certified Cloud Practitioner.',
    ],
    stack: ['Microsoft Azure', 'AWS'],
    evidence:
      'Verifiable with the issuers directly. The AWS architect associate certification that portfolios often add here is not claimed anywhere on this site, and a test in this repository fails the build if it ever appears.',
    seeAlso: { label: 'Plate 09 — Tidewater', href: '#tidewater' },
  },
];

export const evidenceNote =
  'Each card states what can be checked and what cannot. Where the work is confidential the card says so, rather than substituting a number nobody can verify.';
