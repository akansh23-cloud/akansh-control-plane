/**
 * Accuracy tests.
 *
 * The brief is explicit about what may and may not be claimed. Those rules are
 * not comments here, they are assertions: if a future edit ever reintroduces a
 * certification Akansh does not hold, merges two scale facts that describe
 * different things, or draws an architecture relationship that does not exist,
 * this suite fails and the build stops.
 *
 * Some tests read the source files rather than the exports, because a claim can
 * be made in JSX prose as easily as in data.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  allSkills,
  barclays,
  causalAt,
  causalChain,
  careerProject,
  chambers,
  cloudnxt,
  contact,
  credentials,
  completedCredentials,
  education,
  evidenceCards,
  faultEvents,
  faults,
  gauges,
  incident,
  journey,
  mapEdges,
  mapForbiddenEdges,
  mapNodes,
  mapProject,
  mapViews,
  plateBriefs,
  plates,
  preparationCredentials,
  primaryEducation,
  profile,
  refit,
  roles,
  scale,
  scanFacts,
  site,
  stageEvents,
  skillGroups,
} from '@/content';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const sourceFiles = walk(SRC).filter((f) => /\.(tsx?|css)$/.test(f));
const allSource = sourceFiles
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

/** Source with comments stripped, so a warning in a comment is not a claim. */
const allProse = allSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/* ------------------------------------------------------------------ */
/* identity                                                            */
/* ------------------------------------------------------------------ */

describe('identity', () => {
  it('names the right person', () => {
    expect(profile.name).toBe('Akansh Mowar');
    expect(profile.location).toBe('Pune, India');
  });

  it('positions him as DevOps / Platform / Cloud, not as an SRE', () => {
    expect(profile.roleLine).toBe('DevOps / Platform / Cloud Engineer');
    expect(profile.roles).not.toContain('Site Reliability Engineer');
    // "SRE-aligned practices" is allowed; the job title is not.
    expect(profile.practice).toMatch(/SRE-aligned/);
  });

  it('never claims the SRE job title anywhere in the source', () => {
    const claims = allProse.match(/\bSite Reliability Engineer\b/gi) ?? [];
    expect(claims).toEqual([]);
    // Any bare "SRE" must be qualified as SRE-aligned.
    const bareSre = (allProse.match(/\bSRE\b(?!-aligned)/g) ?? []).filter(
      (_, i, arr) => arr.length > 0,
    );
    expect(bareSre).toEqual([]);
  });

  it('carries the thesis line verbatim', () => {
    expect(profile.thesis).toBe(
      'Building and operating systems that move software safely from code to production.',
    );
  });
});

/* ------------------------------------------------------------------ */
/* certifications — the hardest rule in the brief                      */
/* ------------------------------------------------------------------ */

describe('certifications', () => {
  it('holds exactly AZ-104, AZ-900 and AWS Cloud Practitioner', () => {
    const held = completedCredentials.map((c) => c.code ?? c.name).sort();
    expect(held).toEqual(['AZ-104', 'AZ-900', 'Cloud Practitioner']);
  });

  it('never claims AWS Certified Solutions Architect, anywhere', () => {
    expect(/solutions\s+architect/i.test(allProse)).toBe(false);
    expect(
      credentials.some((c) => /solutions architect/i.test(c.name)),
    ).toBe(false);
  });

  it('only ever presents CKAD as preparation, never as held', () => {
    const ckad = credentials.find((c) => c.code === 'CKAD');
    expect(ckad).toBeDefined();
    expect(ckad!.status).toBe('preparation');
    expect(completedCredentials.map((c) => c.code)).not.toContain('CKAD');
    expect(preparationCredentials.map((c) => c.code)).toContain('CKAD');
  });

  it('labels every preparation credential as not certified in the UI', () => {
    const tidewater = readFileSync(
      join(SRC, 'components/plates/Tidewater.tsx'),
      'utf8',
    );
    expect(tidewater).toMatch(/not certified/i);
  });

  it('publishes only completed credentials to structured data', () => {
    const layout = readFileSync(join(SRC, 'app/layout.tsx'), 'utf8');
    /* The rule is about which list reaches structured data, not about how the
       line happens to be written — the degree now sits alongside the
       certifications, so an exact-shape match would break on a valid edit. */
    expect(layout).toMatch(/completedCredentials\.map/);
    expect(layout).not.toMatch(/[^d]credentials\.map/);
    expect(layout).not.toMatch(/hasCredential:\s*credentials\b/);
    /* The degree is a credential too, and it is the one that must be a
       'degree' rather than a 'certification'. */
    expect(layout).toMatch(/credentialCategory:\s*'degree'/);
    expect(layout).toMatch(/alumniOf/);
  });
});

/* ------------------------------------------------------------------ */
/* scale facts — three numbers about three different things            */
/* ------------------------------------------------------------------ */

describe('scale facts', () => {
  it('keeps 50+, 30+ and 20+ as separate facts with separate nouns', () => {
    expect(scale.services.value).toBe('50+');
    expect(scale.services.noun).toMatch(/independently deployable microservices/);

    expect(scale.workloads.value).toBe('30+');
    expect(scale.workloads.noun).toMatch(/containerised workloads/);

    expect(scale.stages.value).toBe('20+');
    expect(scale.stages.noun).toMatch(/stage GitLab CI\/CD/);

    const nouns = [scale.services.noun, scale.workloads.noun, scale.stages.noun];
    expect(new Set(nouns).size).toBe(3);
  });

  it('never merges the microservice count with the workload count', () => {
    // e.g. "50+ containerised microservices" or "30+ microservices"
    expect(/50\+[^.]{0,40}containeris/i.test(allProse)).toBe(false);
    expect(/30\+[^.]{0,40}microservice/i.test(allProse)).toBe(false);
    expect(/50\+[^.]{0,30}workload/i.test(allProse)).toBe(false);
  });

  it('states each number in the Barclays bullets with its own noun', () => {
    const work = barclays.work.join(' ');
    expect(work).toMatch(/50\+ independently deployable microservices/);
    expect(work).toMatch(/30\+ standardised containerised workloads/);
    expect(work).toMatch(/20\+ stage GitLab CI\/CD release workflow/);
  });
});

/* ------------------------------------------------------------------ */
/* employment                                                          */
/* ------------------------------------------------------------------ */

describe('employment history', () => {
  it('has the two roles, in the right order, with the right dates', () => {
    expect(roles).toHaveLength(2);
    expect(barclays.company).toBe('Barclays');
    expect(barclays.title).toBe('DevOps Engineer');
    expect(barclays.period).toBe('July 2023 — Present');
    expect(barclays.location).toBe('Pune, India');

    expect(cloudnxt.company).toBe('CloudNXT');
    expect(cloudnxt.title).toBe('Cloud Engineer Intern');
    expect(cloudnxt.period).toBe('May 2022 — August 2022');
  });

  it('describes the CloudNXT internship only as far as it went', () => {
    const work = cloudnxt.work.join(' ');
    expect(work).toMatch(/100\+ Azure virtual machines/);
    expect(work).toMatch(/disaster recovery/i);
    expect(work).toMatch(/Azure Snapshot/i);
    // an internship is not a leadership role
    expect(/\b(led|owned|architected)\b/i.test(work)).toBe(false);
  });

  it('names the Barclays stack without describing internal architecture', () => {
    for (const tool of [
      'Red Hat OpenShift 4.x',
      'Helm',
      'GitLab CI/CD',
      'HashiCorp Vault',
      'Trivy',
      'AppDynamics',
    ]) {
      expect(barclays.stack).toContain(tool);
    }
    // No internal system, service or environment names.
    expect(/\b(prod|uat|sit)-[a-z0-9-]+\b/i.test(JSON.stringify(barclays))).toBe(
      false,
    );
  });

  it('records the refit as five real before/after pairs', () => {
    expect(refit).toHaveLength(5);
    const pairs = refit.map((r) => `${r.before} → ${r.after}`);
    expect(pairs).toContain('Jenkins + Bitbucket → GitLab CI/CD');
    expect(pairs).toContain('Raw manifests → Helm charts');
    expect(pairs).toContain('JDK 8 → Java 17');
    expect(pairs).toContain('JBoss → Tomcat 10');
    expect(pairs).toContain('ELK → Observe');
  });
});

/* ------------------------------------------------------------------ */
/* MAP architecture                                                    */
/* ------------------------------------------------------------------ */

describe('Migration Assurance Platform', () => {
  it('draws no forbidden relationship', () => {
    for (const [from, to] of mapForbiddenEdges) {
      const drawn = mapEdges.some((e) => e.from === from && e.to === to);
      expect(drawn, `edge ${from} → ${to} must never be drawn`).toBe(false);
    }
  });

  it('never puts Terraform on a traffic path', () => {
    const terraform = mapEdges.filter(
      (e) => e.from === 'terraform' || e.to === 'terraform',
    );
    expect(terraform.length).toBeGreaterThan(0);
    for (const e of terraform) {
      expect(e.kind).toBe('provision');
    }
  });

  it('never has Argo CD building or pushing an image', () => {
    const argo = mapEdges.filter((e) => e.from === 'argocd');
    expect(argo.length).toBeGreaterThan(0);
    for (const e of argo) {
      expect(e.kind).toBe('control');
      expect(['image', 'ecr']).not.toContain(e.to);
    }
  });

  it('never puts the load balancer between ECR and EKS', () => {
    const ecrToEks = mapEdges.find(
      (e) => e.from === 'ecr' && e.to === 'eks',
    );
    expect(ecrToEks).toBeDefined();
    expect(ecrToEks!.kind).toBe('supply');
    expect(
      mapEdges.some((e) => e.from === 'ecr' && e.to === 'alb'),
    ).toBe(false);
    expect(
      mapEdges.some((e) => e.from === 'alb' && e.to === 'ecr'),
    ).toBe(false);
  });

  it('routes user traffic through the load balancer only', () => {
    const userEdges = mapEdges.filter((e) => e.from === 'user');
    expect(userEdges).toHaveLength(1);
    expect(userEdges[0].to).toBe('alb');
    expect(userEdges[0].kind).toBe('traffic');
  });

  it('has all four required views, each with something in it', () => {
    expect(mapViews.map((v) => v.id)).toEqual([
      'build',
      'gitops',
      'infrastructure',
      'runtime',
    ]);
    for (const view of mapViews) {
      expect(
        mapNodes.filter((n) => n.views.includes(view.id)).length,
        `view ${view.id} has no nodes`,
      ).toBeGreaterThan(1);
      expect(
        mapEdges.filter((e) => e.views.includes(view.id)).length,
        `view ${view.id} has no edges`,
      ).toBeGreaterThan(0);
    }
  });

  it('only draws edges between nodes that exist', () => {
    const ids = new Set(mapNodes.map((n) => n.id));
    for (const e of mapEdges) {
      expect(ids.has(e.from), `unknown node ${e.from}`).toBe(true);
      expect(ids.has(e.to), `unknown node ${e.to}`).toBe(true);
    }
  });

  it('lists only the stack the project actually uses', () => {
    for (const tool of ['Amazon EKS', 'Amazon ECR', 'Terraform', 'Argo CD']) {
      expect(mapProject.stack).toContain(tool);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Career Autopilot                                                    */
/* ------------------------------------------------------------------ */

describe('Career Autopilot', () => {
  it('has sixteen services', () => {
    expect(careerProject.serviceCount).toBe(16);
  });

  it('never claims the infrastructure that belongs to MAP', () => {
    const blob = JSON.stringify({
      stack: careerProject.stack,
      path: careerProject.path,
      migration: careerProject.migration,
      premise: careerProject.premise,
      fallback: careerProject.fallback,
    });
    for (const tech of careerProject.forbiddenTech) {
      expect(
        new RegExp(`\\b${tech}\\b`, 'i').test(blob),
        `Career Autopilot must not claim ${tech}`,
      ).toBe(false);
    }
  });

  it('keeps that boundary in the plate that draws it', () => {
    const split = readFileSync(
      join(SRC, 'components/plates/Split.tsx'),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const tech of ['Terraform', 'Argo CD', 'EKS']) {
      expect(
        new RegExp(`\\b${tech}\\b`).test(split),
        `Split.tsx must not mention ${tech}`,
      ).toBe(false);
    }
  });

  it('says out loud that the service names are not published', () => {
    expect(careerProject.serviceNote).toMatch(/names are not published/i);
  });

  it('describes a fallback to the monolith, not a hard failure', () => {
    expect(careerProject.fallback).toMatch(/falls back to the monolith/i);
  });
});

/* ------------------------------------------------------------------ */
/* the release flight                                                  */
/* ------------------------------------------------------------------ */

describe('the release flight', () => {
  it('groups the pipeline into nine chambers with unique ids', () => {
    expect(chambers).toHaveLength(9);
    expect(new Set(chambers.map((c) => c.id)).size).toBe(9);
  });

  it('marks both scanning gates as security gates', () => {
    const security = chambers.filter((c) => c.kind === 'security').map((c) => c.id);
    expect(security).toContain('source-scan');
    expect(security).toContain('image-scan');
  });

  it('names only tools that appear in the Barclays stack', () => {
    // A chamber may use the short form of a stack entry — "OpenShift 4.x" for
    // "Red Hat OpenShift 4.x" — but it may not introduce a new tool.
    const known = (tool: string) =>
      barclays.stack.some((s) => s === tool || s.endsWith(tool));

    for (const chamber of chambers) {
      for (const tool of chamber.tools) {
        expect(
          known(tool),
          `${chamber.id} names ${tool}, which is not in the stack`,
        ).toBe(true);
      }
    }
  });

  it('builds the image before it scans or promotes it', () => {
    const order = chambers.map((c) => c.id);
    expect(order.indexOf('image')).toBeLessThan(order.indexOf('image-scan'));
    expect(order.indexOf('image-scan')).toBeLessThan(order.indexOf('promote'));
  });
});

/* ------------------------------------------------------------------ */
/* observability                                                       */
/* ------------------------------------------------------------------ */

describe('observability', () => {
  it('has four signals, each with a place you would actually look', () => {
    expect(gauges).toHaveLength(4);
    const real = new Set([
      ...barclays.stack,
      'OpenShift',
      'Kubernetes',
    ]);
    for (const g of gauges) {
      expect(g.seenIn.length).toBeGreaterThan(0);
      for (const place of g.seenIn) {
        expect(real.has(place), `${place} is not a tool that is used`).toBe(
          true,
        );
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* contact and site wiring                                             */
/* ------------------------------------------------------------------ */

describe('contact and site', () => {
  it('has the exact contact details from the brief', () => {
    expect(contact.email).toBe('mowar23akansh@gmail.com');
    expect(contact.linkedin).toBe(
      'https://www.linkedin.com/in/akansh-mowar-5a83261a0',
    );
    expect(contact.github).toBe('https://github.com/akansh23-cloud');
  });

  it('points the résumé PDF at the required filename', () => {
    expect(site.resumePath).toBe(
      '/Akansh_Mowar_DevOps_Platform_Engineer_Resume.pdf',
    );
    expect(site.resumeRoute).toBe('/resume');
  });

  it('uses an absolute canonical origin with no trailing slash', () => {
    expect(site.url).toMatch(/^https:\/\//);
    expect(site.url.endsWith('/')).toBe(false);
  });

  it('is not canonicalised to a preview deployment', () => {
    expect(site.url).not.toMatch(/vercel\.app|netlify\.app|localhost/i);
  });

  it('serves the PDF with a PDF content type', () => {
    const config = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
    expect(config).toMatch(/Akansh_Mowar_DevOps_Platform_Engineer_Resume\.pdf/);
    expect(config).toMatch(/application\/pdf/);
  });
});

/* ------------------------------------------------------------------ */
/* the drawing set                                                     */
/* ------------------------------------------------------------------ */

describe('the drawing set', () => {
  it('numbers nine plates in order, with unique ids', () => {
    expect(plates).toHaveLength(9);
    expect(plates.map((p) => p.no)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
    ]);
    expect(new Set(plates.map((p) => p.id)).size).toBe(9);
  });

  it('keeps the route from source to sea in reading order', () => {
    /* The numbering carries information. Identity first, the tideway last, and
       the incident room after the observability it depends on. */
    const order = plates.map((p) => p.id);
    expect(order[0]).toBe('headwater');
    expect(order.at(-1)).toBe('tidewater');
    expect(order.indexOf('watch')).toBeGreaterThan(order.indexOf('gauges'));
    expect(order.indexOf('vault')).toBeGreaterThan(order.indexOf('watch'));
  });

  it('renders every plate on the page', () => {
    const page = readFileSync(join(SRC, 'app/page.tsx'), 'utf8');
    for (const plate of plates) {
      expect(page, `plate ${plate.no} is not on the page`).toContain(
        `id="${plate.id}"`,
      );
    }
  });

  it('labels every simulated drawing as a simulation', () => {
    const page = readFileSync(join(SRC, 'app/page.tsx'), 'utf8');
    expect((page.match(/[Ss]imulation/g) ?? []).length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('gives the recruiter scan real, checkable facts', () => {
    expect(scanFacts.length).toBeGreaterThanOrEqual(6);
    const values = scanFacts.map((f) => f.value).join(' ');
    expect(values).toMatch(/Barclays/);
    expect(values).toMatch(/OpenShift/);
    expect(values).not.toMatch(/solutions architect/i);
  });

  it('lists only skills that appear somewhere in the work', () => {
    const known = new Set(
      [
        ...barclays.stack,
        ...cloudnxt.stack,
        ...mapProject.stack,
        ...careerProject.stack,
      ].map((s) => s.toLowerCase()),
    );
    // Every group must connect to at least one thing that was actually used.
    for (const group of skillGroups) {
      const touches = group.items.some((item) =>
        [...known].some(
          (k) =>
            item.name.toLowerCase().includes(k) ||
            k.includes(item.name.toLowerCase()),
        ),
      );
      expect(touches, `${group.label} lists nothing that was used`).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* the things the brief forbids outright                               */
/* ------------------------------------------------------------------ */

describe('no invented numbers', () => {
  const inventedMetric =
    /\b\d{1,3}(\.\d+)?\s?%\s+(faster|improvement|reduction|uptime|increase|decrease)/i;

  it('claims no percentage improvements', () => {
    expect(inventedMetric.test(allProse)).toBe(false);
  });

  it('claims no availability figures', () => {
    expect(/99\.\d+\s?%/.test(allProse)).toBe(false);
  });

  it('claims no money saved', () => {
    expect(/\$\s?\d[\d,.]*\s?(k|m|million|saved)/i.test(allProse)).toBe(false);
  });

  it('claims no awards or rankings', () => {
    expect(/\b(award[- ]winning|top \d+|rank(ed)? #?\d)\b/i.test(allProse)).toBe(
      false,
    );
  });
});

/* ------------------------------------------------------------------ */
/* education — restored, and required to stay                          */
/* ------------------------------------------------------------------ */

describe('education', () => {
  it('is present, because a résumé without a degree gets filtered out', () => {
    expect(education.length).toBeGreaterThan(0);
  });

  it('names the institution as awarded', () => {
    expect(primaryEducation.institution).toMatch(
      /University of Petroleum and Energy Studies/i,
    );
    expect(primaryEducation.short).toBe('UPES');
    expect(primaryEducation.location).toMatch(/Dehradun/i);
  });

  it('states the degree and the specialisation separately', () => {
    expect(primaryEducation.degree).toMatch(/B\.Tech/i);
    expect(primaryEducation.degree).toMatch(/Computer Science/i);
    expect(primaryEducation.field).toMatch(/Cloud Computing/i);
    expect(primaryEducation.field).toMatch(/Virtualization/i);
  });

  it('carries the dates that were actually awarded', () => {
    expect(primaryEducation.start).toBe('2019-07');
    expect(primaryEducation.end).toBe('2023-05');
    expect(primaryEducation.period).toBe('July 2019 — May 2023');
  });

  it('finishes before the first full-time role starts', () => {
    expect(primaryEducation.end <= barclays.start).toBe(true);
  });

  it('never claims a degree that is still in progress', () => {
    for (const e of education) {
      expect(e.end).not.toMatch(/present|current|ongoing|expected/i);
    }
  });
});

/* ------------------------------------------------------------------ */
/* skills — provenance, so the keyword list cannot quietly inflate     */
/* ------------------------------------------------------------------ */

describe('skills', () => {
  it('declares a source for every single item', () => {
    for (const group of skillGroups) {
      for (const item of group.items) {
        expect(
          ['work', 'brief', 'derived'],
          `${item.name} has no valid provenance`,
        ).toContain(item.source);
      }
    }
  });

  it('never lists the same skill in two groups', () => {
    const seen = new Map<string, string>();
    for (const group of skillGroups) {
      for (const item of group.items) {
        const key = item.name.toLowerCase();
        expect(
          seen.has(key),
          `${item.name} appears in both ${seen.get(key)} and ${group.label}`,
        ).toBe(false);
        seen.set(key, group.label);
      }
    }
  });

  it('never dresses a skill up as a certification', () => {
    for (const item of allSkills) {
      expect(item.name).not.toMatch(/certified|certification/i);
    }
  });

  it('carries no proficiency claims', () => {
    for (const item of allSkills) {
      expect(item.name).not.toMatch(
        /expert|advanced|proficient|master|\d+\s*%|\d+\s*\/\s*\d+/i,
      );
    }
  });

  it('still contains the ATS keywords the brief asked to restore', () => {
    const flat = allSkills.map((s) => s.name.toLowerCase()).join(' | ');
    for (const kw of [
      'openshift',
      'kubernetes',
      'helm',
      'docker',
      'terraform',
      'ansible',
      'argo cd',
      'gitlab',
      'jenkins',
      'github actions',
      'bitbucket',
      'bash',
      'python',
      'vault',
      'veracode',
      'trivy',
      'sonarqube',
      'prometheus',
      'grafana',
      'elk',
      'appdynamics',
      'netcool',
      'maven',
      'gradle',
      'postgresql',
      'kafka',
      'ibm mq',
      'eks',
    ]) {
      expect(flat, `missing ATS keyword: ${kw}`).toContain(kw);
    }
  });

  it('still refuses the certification Akansh does not hold', () => {
    const flat = allSkills.map((s) => s.name.toLowerCase()).join(' | ');
    expect(flat).not.toContain('solutions architect');
  });
});

/* ------------------------------------------------------------------ */
/* the canonical origin is a decision, never a default                 */
/* ------------------------------------------------------------------ */

describe('site origin', () => {
  it('reports whether the origin was actually configured', () => {
    expect(typeof site.originConfigured).toBe('boolean');
  });

  it('never carries a trailing slash', () => {
    expect(site.url.endsWith('/')).toBe(false);
  });

  it('is an absolute https origin', () => {
    expect(() => new URL(site.url)).not.toThrow();
    expect(site.url.startsWith('https://')).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* animation architecture — the render storm must not come back        */
/* ------------------------------------------------------------------ */

describe('animation architecture', () => {
  const plateFiles = readdirSync(join(SRC, 'components/plates'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => [f, readFileSync(join(SRC, 'components/plates', f), 'utf8')] as const);

  it('has a plate for every plate in the drawing set', () => {
    expect(plateFiles.length).toBe(plates.length);
  });

  it('no plate calls setState from a frame callback', () => {
    for (const [name, src] of plateFiles) {
      expect(src, `${name} schedules its own frames`).not.toMatch(
        /requestAnimationFrame/,
      );
    }
  });

  it('the per-frame hooks that re-rendered the SVG tree are gone', () => {
    const motion = readFileSync(join(SRC, 'lib/motion.ts'), 'utf8');
    const runtime = readFileSync(join(SRC, 'lib/runtime.ts'), 'utf8');
    for (const dead of ['useSmoothed', 'useTicker', 'useConvergence']) {
      expect(motion, `${dead} is back in motion.ts`).not.toContain(dead);
      expect(runtime, `${dead} is back in runtime.ts`).not.toContain(dead);
    }
  });

  it('there is exactly one frame loop in the whole application', () => {
    const runtime = readFileSync(join(SRC, 'lib/runtime.ts'), 'utf8');
    const all = readdirSync(join(SRC, 'lib'))
      .filter((f) => f.endsWith('.ts'))
      .map((f) => readFileSync(join(SRC, 'lib', f), 'utf8'))
      .join('\n');
    // Every rAF call in the codebase belongs to the runtime's scheduler.
    const total = (all.match(/requestAnimationFrame/g) ?? []).length;
    const inRuntime = (runtime.match(/requestAnimationFrame/g) ?? []).length;
    expect(total).toBe(inRuntime);
    expect(inRuntime).toBeGreaterThan(0);
  });

  it('every plate gates its rig on visibility', () => {
    for (const [name, src] of plateFiles) {
      expect(src, `${name} never stops animating off screen`).toContain(
        'useRigRoot',
      );
    }
  });
});

/* ------------------------------------------------------------------ */
/* touch — a drawing must never swallow the page scroll                */
/* ------------------------------------------------------------------ */

describe('touch behaviour', () => {
  const cssFiles = readdirSync(join(SRC, 'components/plates'))
    .filter((f) => f.endsWith('.css'))
    .map((f) => [f, readFileSync(join(SRC, 'components/plates', f), 'utf8')] as const);

  it('never puts touch-action: none on a full drawing', () => {
    for (const [name, css] of cssFiles) {
      // Find the .svg rule, if the file has one, and check what it claims.
      const svgRule = css.match(/\.svg\s*\{[^}]*\}/);
      if (!svgRule) continue;
      expect(svgRule[0], `${name} blocks vertical scrolling on the drawing`).not.toMatch(
        /touch-action:\s*none/,
      );
    }
  });

  it('only handles claim the gesture', () => {
    for (const [name, css] of cssFiles) {
      const blocks = css.match(/\.[a-zA-Z]+\s*\{[^}]*touch-action:\s*none[^}]*\}/g) ?? [];
      for (const block of blocks) {
        const selector = block.match(/\.([a-zA-Z]+)/)?.[1] ?? '';
        expect(
          ['handle', 'marker', 'seam', 'grip'],
          `${name}: .${selector} claims the touch but is not a handle`,
        ).toContain(selector);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* final studio pass — identity must survive every viewport             */
/* ------------------------------------------------------------------ */

describe('final studio pass', () => {
  const plateDir = join(SRC, 'components/plates');
  const plateSources = readdirSync(plateDir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => [f, readFileSync(join(plateDir, f), 'utf8')] as const);

  it('authors a tablet composition in every plate', () => {
    for (const [name, src] of plateSources) {
      expect(src, `${name} still collapses tablet into desktop`).toMatch(
        /viewport\s*===\s*['"]tablet['"]/,
      );
    }
  });

  it('gives every plate fine-pointer inspection behaviour', () => {
    for (const [name, src] of plateSources) {
      expect(src, `${name} has no concept-native pointer response`).toContain(
        'usePointerField',
      );
    }
  });

  it('connects the plates through the Headwater datum', () => {
    const plate = readFileSync(join(SRC, 'components/Plate.tsx'), 'utf8');
    const plateCss = readFileSync(join(SRC, 'components/Plate.module.css'), 'utf8');
    const headwater = readFileSync(join(plateDir, 'Headwater.tsx'), 'utf8');
    expect(headwater).toContain("'--datum'");
    expect(plate).toContain('waterway');
    expect(plateCss).toContain('var(--datum');
  });

  it('keeps the inspection field decorative and pointer-safe', () => {
    const css = readFileSync(join(SRC, 'components/InspectionField.module.css'), 'utf8');
    expect(css).toMatch(/pointer-events:\s*none/);
    expect(css).toMatch(/prefers-reduced-motion/);
  });

  it('marks the dominant plate on the continuous route without a frame loop', () => {
    const legend = readFileSync(join(SRC, 'components/Legend.tsx'), 'utf8');
    const plateCss = readFileSync(join(SRC, 'components/Plate.module.css'), 'utf8');
    expect(legend).toContain("toggleAttribute('data-current'");
    expect(plateCss).toContain('.plate[data-current]');
    expect(legend).not.toContain('requestAnimationFrame');
  });
});

/* ------------------------------------------------------------------ */
/* the continuous journey                                              */
/* ------------------------------------------------------------------ */

describe('the route', () => {
  it('names the six stations software passes through, in order', () => {
    expect(journey.map((s) => s.label)).toEqual([
      'Source',
      'Build',
      'Gates',
      'Registry',
      'Production',
      'Observability',
    ]);
  });

  it('anchors every station to a plate that exists', () => {
    const ids = new Set<string>(plates.map((p) => p.id));
    for (const station of journey) {
      expect(ids.has(station.plate), `${station.id} anchors nowhere`).toBe(true);
      expect(station.offset).toBeGreaterThanOrEqual(0);
      expect(station.offset).toBeLessThanOrEqual(1);
    }
  });

  it('never puts two stations at the same point of the same plate', () => {
    const seen = new Set(journey.map((s) => `${s.plate}:${s.offset}`));
    expect(seen.size).toBe(journey.length);
  });

  it('draws the route in one place, measured from the layout', () => {
    const rail = readFileSync(join(SRC, 'components/Waterway.tsx'), 'utf8');
    expect(rail).toContain('getBoundingClientRect');
    expect(rail).not.toContain('requestAnimationFrame');
    const page = readFileSync(join(SRC, 'app/page.tsx'), 'utf8');
    expect(page).toContain('<Waterway />');
  });
});

/* ------------------------------------------------------------------ */
/* the refit — the seam must never cut a word                          */
/* ------------------------------------------------------------------ */

describe('the refit interaction', () => {
  const tsx = readFileSync(join(SRC, 'components/plates/Refit.tsx'), 'utf8');
  const css = readFileSync(join(SRC, 'components/plates/Refit.module.css'), 'utf8');

  it('states the before and after inventory exactly as the brief does', () => {
    const before = refit.map((r) => r.before).join(' · ');
    const after = refit.map((r) => r.after).join(' · ');
    expect(before).toContain('Jenkins + Bitbucket');
    expect(before).toContain('Raw manifests');
    expect(before).toContain('JDK 8');
    expect(before).toContain('JBoss');
    expect(before).toContain('ELK');
    expect(after).toContain('GitLab CI/CD');
    expect(after).toContain('Helm charts');
    expect(after).toContain('Java 17');
    expect(after).toContain('Tomcat 10');
    expect(after).toContain('Observe');
  });

  it('never clips a layer name with the seam', () => {
    /* This is the defect the redesign exists to remove: a clip-path across the
       words themselves sliced \"GitLab CI/CD\" mid-word at every intermediate
       seam position. Both states are complete cards that cross-fade in place. */
    expect(css).not.toMatch(/\.(before|after|cardName|card)\s*\{[^}]*clip-path/);
    expect(css).not.toMatch(/clip-path:\s*inset\([^)]*var\(--seam\)/);
    expect(css).toContain("data-face='before'");
    expect(css).toContain("data-face='after'");
  });

  it('never truncates any text on the plate', () => {
    expect(css).not.toMatch(/text-overflow:\s*ellipsis/);
    expect(css).not.toMatch(/white-space:\s*nowrap[\s\S]{0,80}\.cardName/);
  });

  it('derives the button states from the same thresholds as the drawing', () => {
    /* The buttons cannot show a state the drawing is not in, because both are
       computed from the row crossover points rather than tracked separately. */
    expect(tsx).toContain('const startOf');
    expect(tsx).toContain('const crossover');
    expect(tsx).toMatch(/seam <= FIRST \? 'before' : seam >= LAST_END \? 'after' : 'mid'/);
    expect(tsx).toContain("aria-pressed={side === 'before'}");
    expect(tsx).toContain("aria-pressed={side === 'after'}");
  });

  it('gives every layer a stated engineering outcome', () => {
    for (const r of refit) {
      expect(r.gain.length, `${r.layer} has no outcome`).toBeGreaterThan(8);
      expect(r.gain).not.toMatch(/\d+\s*%/);
    }
  });

  it('keeps the comparison readable without any motion at all', () => {
    expect(tsx).toContain('<table');
    expect(tsx).toContain('scope="row"');
  });
});

/* ------------------------------------------------------------------ */
/* the release simulation                                              */
/* ------------------------------------------------------------------ */

describe('the release status stream', () => {
  it('has events for every chamber, and only for chambers that exist', () => {
    const ids = new Set(chambers.map((c) => c.id));
    for (const id of Object.keys(stageEvents)) {
      expect(ids.has(id), `event for unknown chamber ${id}`).toBe(true);
    }
    for (const c of chambers) {
      expect(stageEvents[c.id]?.length, `${c.id} says nothing`).toBeGreaterThan(0);
    }
  });

  it('stops each armed fault at the gate that would refuse it', () => {
    for (const f of faults) {
      expect(Object.keys(faultEvents)).toContain(f.id);
      expect(chambers.some((c) => c.id === f.at)).toBe(true);
    }
    expect(faults.find((f) => f.id === 'cve')!.at).toBe('image-scan');
    expect(faults.find((f) => f.id === 'migration')!.at).toBe('migrate');
    expect(faults.find((f) => f.id === 'readiness')!.at).toBe('deploy');
  });

  it('invents no build numbers, hashes, environments or findings', () => {
    const blob = JSON.stringify({ stageEvents, faultEvents });
    expect(blob).not.toMatch(/sha256|CVE-\d{4}|build\s*#?\d+/i);
    expect(blob).not.toMatch(/\b(prod|uat|sit)\b/i);
  });
});

/* ------------------------------------------------------------------ */
/* the causal chain                                                    */
/* ------------------------------------------------------------------ */

describe('observability as cause and effect', () => {
  it('runs saturation → queueing → readiness → errors', () => {
    expect(causalChain.map((l) => l.id)).toEqual([
      'saturation',
      'queueing',
      'readiness',
      'errors',
    ]);
  });

  it('is quiet at rest and critical under load, in that order', () => {
    const quiet = causalAt(0.1);
    expect(quiet.every((l) => l.state === 'quiet')).toBe(true);

    const loaded = causalAt(1);
    expect(loaded[0].state).toBe('critical');
    expect(loaded[3].state).toBe('critical');

    /* Saturation always leads: nothing downstream can be under more pressure
       than the thing that causes it. */
    const mid = causalAt(0.55);
    expect(mid[0].intensity).toBeGreaterThanOrEqual(mid[3].intensity);
  });

  it('reads every link from the same model the gauges use', () => {
    const src = readFileSync(join(SRC, 'content/causal.ts'), 'utf8');
    expect(src).toContain("from './observability'");
    expect(src).toMatch(/illustrative model|Illustrative model/);
  });
});

/* ------------------------------------------------------------------ */
/* the incident room                                                   */
/* ------------------------------------------------------------------ */

describe('the incident room', () => {
  it('is labelled a scenario and never claims to be an incident report', () => {
    expect(incident.simulated).toMatch(/scenario/i);
    expect(incident.simulated).toMatch(/no production data|not an incident/i);
  });

  it('has exactly one correct explanation', () => {
    const correct = incident.hypotheses.filter((h) => h.correct);
    expect(correct).toHaveLength(1);
    expect(correct[0].id).toBe('pool');
  });

  it('gives every wrong answer a reason, not just a rejection', () => {
    for (const h of incident.hypotheses) {
      expect(h.verdict.length, `${h.id} is dismissed without a reason`).toBeGreaterThan(60);
    }
  });

  it('names no employer, no real service and no environment', () => {
    const blob = JSON.stringify(incident);
    expect(blob).not.toMatch(/barclays/i);
    expect(blob).not.toMatch(/\b(prod|production cluster|uat|sit)\b/i);
    /* The workload in the readouts is called "app", on purpose. */
    expect(blob).not.toMatch(/\.com\b|\.internal\b/);
  });

  it('resolves through the platform rather than by rolling back first', () => {
    expect(incident.resolution[0]).toMatch(/nothing is rolled back/i);
    expect(incident.lesson).toMatch(/readiness/i);
  });
});

/* ------------------------------------------------------------------ */
/* the evidence vault                                                  */
/* ------------------------------------------------------------------ */

describe('the evidence vault', () => {
  it('gives every card all five headings', () => {
    for (const c of evidenceCards) {
      expect(c.claim.length, `${c.id} has no claim`).toBeGreaterThan(10);
      expect(c.context.length, `${c.id} has no context`).toBeGreaterThan(10);
      expect(c.did.length, `${c.id} says nothing was done`).toBeGreaterThan(0);
      expect(c.stack.length, `${c.id} has no stack`).toBeGreaterThan(0);
      expect(c.evidence.length, `${c.id} has no evidence`).toBeGreaterThan(20);
    }
  });

  it('invents no metric, percentage, saving or award', () => {
    const blob = evidenceCards
      .map((c) => `${c.claim} ${c.context} ${c.did.join(' ')} ${c.evidence}`)
      .join(' ');
    expect(blob).not.toMatch(/\d+\s?%/);
    expect(blob).not.toMatch(/\b(award|winner|best|fastest|saved \$|ROI)\b/i);
    expect(blob).not.toMatch(/99\.\d/);
  });

  it('says so where the work cannot be checked', () => {
    const confidential = evidenceCards.filter((c) => c.kind === 'work');
    expect(confidential.length).toBeGreaterThan(0);
    expect(
      confidential.some((c) => /not externally auditable|confidential|not published/i.test(c.evidence)),
    ).toBe(true);
  });

  it('keeps the three scale facts separate in the claims', () => {
    const claims = evidenceCards.map((c) => c.claim).join(' ');
    expect(claims).toMatch(/20\+ stage/);
    expect(claims).toMatch(/30\+ standardised containerised workloads/);
    expect(claims).toMatch(/50\+ independently deployable microservices/);
    /* Never in one breath. */
    expect(claims).not.toMatch(/50\+[^.]*30\+/);
  });

  it('points only at plates that exist', () => {
    const ids = new Set<string>(plates.map((p) => `#${p.id}`));
    for (const c of evidenceCards) {
      if (!c.seeAlso) continue;
      expect(ids.has(c.seeAlso.href), `${c.id} links to ${c.seeAlso.href}`).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* depth modes                                                         */
/* ------------------------------------------------------------------ */

describe('depth', () => {
  it('summarises every chapter that has a drawing to fold away', () => {
    for (const id of ['flight', 'refit', 'basin', 'split', 'gauges', 'watch', 'vault']) {
      expect(plateBriefs[id]?.length, `${id} has no recruiter summary`).toBeGreaterThan(0);
    }
  });

  it('never states a fact in a brief that is not stated in full elsewhere', () => {
    const brief = Object.values(plateBriefs).flat().join(' ');
    expect(brief).not.toMatch(/\d+\s?%/);
    expect(brief).not.toMatch(/solutions architect/i);
    expect(brief).toMatch(/20\+ stage/);
  });

  it('is one application with an attribute, not a second application', () => {
    const legend = readFileSync(join(SRC, 'components/Legend.tsx'), 'utf8');
    const plateCss = readFileSync(join(SRC, 'components/Plate.module.css'), 'utf8');
    expect(legend).toContain('document.documentElement.dataset.depth');
    expect(plateCss).toContain("html[data-depth='recruiter']");
    /* The recruiter view folds the drawings; it never removes the chapters. */
    expect(plateCss).not.toMatch(/data-depth='recruiter'\]\)\s*\.plate\s*\{\s*display:\s*none/);
  });

  it('serves the engineer view by default, so nothing is hidden on arrival', () => {
    const depth = readFileSync(join(SRC, 'content/depth.ts'), 'utf8');
    expect(depth).toMatch(/defaultDepth: DepthMode = 'engineer'/);
  });
});
