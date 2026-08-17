/**
 * The technical inventory.
 *
 * Grouped by what the tool actually does, not by "languages / tools / other".
 * There are no proficiency percentages, because nobody can honestly assign one.
 *
 * PROVENANCE. Every entry carries where it was verified from, because an ATS
 * keyword list is exactly the place a résumé quietly starts overstating
 * itself. The three sources are:
 *
 *   'work'    — appears in experience.ts or projects.ts, i.e. it is already
 *               attached to something Akansh describes having done.
 *   'brief'   — supplied by Akansh in the content brief for this build, but
 *               not yet tied to a specific piece of work on the site.
 *   'derived' — the practice implied by adjacent verified work
 *               (e.g. multi-stage builds, sitting under Docker).
 *
 * tests/content.test.ts asserts that every item declares a source, and that
 * nothing claims a certification. If an item should not be on the résumé,
 * delete it here and it disappears everywhere.
 */

export type SkillSource = 'work' | 'brief' | 'derived';

export type Skill = {
  name: string;
  source: SkillSource;
};

export type SkillGroup = {
  id: string;
  label: string;
  items: Skill[];
};

const w = (name: string): Skill => ({ name, source: 'work' });
const b = (name: string): Skill => ({ name, source: 'brief' });
const d = (name: string): Skill => ({ name, source: 'derived' });

export const skillGroups: SkillGroup[] = [
  {
    id: 'containers',
    label: 'Containers & orchestration',
    items: [
      w('Red Hat OpenShift 4.x'),
      w('Kubernetes'),
      w('Helm'),
      w('Docker'),
      w('Amazon EKS'),
      d('Multi-stage builds'),
      d('Readiness / liveness / startup probes'),
      b('NGINX Ingress'),
      b('cert-manager'),
    ],
  },
  {
    id: 'delivery',
    label: 'CI/CD & release',
    items: [
      w('GitLab CI/CD'),
      w('Argo CD'),
      w('Nexus'),
      w('Jenkins'),
      w('Bitbucket'),
      b('GitHub Actions'),
      b('Git'),
      d('Controlled image promotion'),
      d('Schema & incremental migrations'),
      d('Certificate & JKS updates'),
    ],
  },
  {
    id: 'cloud',
    label: 'Cloud',
    items: [
      w('AWS — EKS, ECR, Application Load Balancer'),
      w('Microsoft Azure — virtual machines, snapshots, DR drills'),
      w('Red Hat OpenShift'),
    ],
  },
  {
    id: 'infra',
    label: 'Infrastructure as code & automation',
    items: [
      w('Terraform'),
      w('GitOps workflows'),
      b('Ansible'),
      b('Bash'),
      b('Python'),
      w('Vercel'),
    ],
  },
  {
    id: 'security',
    label: 'Security & secrets',
    items: [
      w('HashiCorp Vault'),
      w('OpenShift Secrets'),
      w('SonarQube'),
      w('Veracode'),
      w('Trivy'),
      d('Secrets management'),
    ],
  },
  {
    id: 'runtime',
    label: 'Runtime, build & data',
    items: [
      w('Java 17'),
      w('Tomcat 10'),
      w('Nginx'),
      w('PostgreSQL'),
      w('Hasura'),
      w('Kafka'),
      w('IBM MQ'),
      b('Maven'),
      b('Gradle'),
    ],
  },
  {
    id: 'observability',
    label: 'Observability',
    items: [
      w('Observe'),
      w('ELK'),
      w('AppDynamics'),
      b('Prometheus'),
      b('Grafana'),
      b('Netcool'),
    ],
  },
];

/** Flat list, for metadata and for the keyword checks in the tests. */
export const allSkills = skillGroups.flatMap((g) => g.items);

/** Rendering helper — the résumé prints names, not provenance. */
export const skillNames = (g: SkillGroup) => g.items.map((s) => s.name);
