import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  barclays,
  causalAt,
  causalChain,
  chambers,
  completedCredentials,
  credentials,
  evidenceCards,
  faultEvents,
  faults,
  incident,
  journey,
  mapEdges,
  mapForbiddenEdges,
  mapProductEdges,
  mapProductNodes,
  mapProductViews,
  mapProject,
  plateBriefs,
  plates,
  preparationCredentials,
  profile,
  recoveryEvents,
  refit,
  scale,
  site,
  stageEvents,
} from '@/content';

const SRC = join(process.cwd(), 'src');
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');

describe('identity and accuracy', () => {
  it('positions Akansh as DevOps / Platform / Cloud Engineer', () => {
    expect(profile.name).toBe('Akansh Mowar');
    expect(profile.roleLine).toBe('DevOps / Platform / Cloud Engineer');
    expect(profile.location).toBe('Pune, India');
    expect(profile.roles).toEqual(['DevOps Engineer', 'Platform Engineer', 'Cloud Engineer']);
  });

  it('keeps Barclays role and scope facts separate', () => {
    expect(barclays.company).toBe('Barclays');
    expect(barclays.title).toBe('DevOps Engineer');
    expect(scale.services.value).toBe('50+');
    expect(scale.workloads.value).toBe('30+');
    expect(scale.stages.value).toBe('20+');
    expect(new Set([scale.services.noun, scale.workloads.noun, scale.stages.noun]).size).toBe(3);
  });

  it('holds exactly the three verified certifications', () => {
    expect(completedCredentials.map((c) => c.code ?? c.name).sort()).toEqual([
      'AZ-104',
      'AZ-900',
      'Cloud Practitioner',
    ]);
  });

  it('keeps CKAD and DOP-C02 as preparation only', () => {
    expect(preparationCredentials.map((c) => c.code).sort()).toEqual(['CKAD', 'DOP-C02']);
    expect(credentials.find((c) => c.code === 'CKAD')?.status).toBe('preparation');
    expect(credentials.find((c) => c.code === 'DOP-C02')?.status).toBe('preparation');
  });

  it('never declares AWS Solutions Architect as a credential', () => {
    expect(JSON.stringify(credentials)).not.toMatch(/solutions architect/i);
  });

  it('keeps resume routes stable', () => {
    expect(site.resumeRoute).toBe('/resume');
    expect(site.resumePath).toBe('/Akansh_Mowar_DevOps_Platform_Engineer_Resume.pdf');
  });
});

describe('drawing set V6', () => {
  it('numbers nine unique plates in order', () => {
    expect(plates).toHaveLength(9);
    expect(plates.map((p) => p.no)).toEqual([
      '01', '02', '03', '04', '05', '06', '07', '08', '09',
    ]);
    expect(new Set(plates.map((p) => p.id)).size).toBe(9);
    expect(plates.map((p) => p.id)).toEqual([
      'headwater', 'flight', 'refit', 'basin', 'split', 'gauges', 'watch', 'vault', 'tidewater',
    ]);
  });

  it('renders all nine chapters and the shared V6 systems from the home page', () => {
    const page = read('app/page.tsx');
    for (const p of plates) expect(page).toContain(`id="${p.id}"`);
    expect(page).toContain('<Waterway />');
    expect(page).toContain('<Brief />');
    expect(page).toContain('<Watch />');
    expect(page).toContain('<Vault />');
  });

  it('declares the continuous journey in engineering order', () => {
    expect(journey.map((s) => s.id)).toEqual([
      'source', 'build', 'gates', 'registry', 'production', 'observability',
    ]);
    expect(new Set(journey.map((s) => `${s.plate}:${s.offset}`)).size).toBe(journey.length);
    for (const stop of journey) expect(plates.some((p) => p.id === stop.plate)).toBe(true);
  });
});

describe('Flight release simulation', () => {
  it('models nine real stage families and emits a status event for every chamber', () => {
    expect(chambers).toHaveLength(9);
    for (const chamber of chambers) {
      expect(stageEvents[chamber.id]?.length, `${chamber.id} has no event`).toBeGreaterThan(0);
    }
  });

  it('stops each injected fault at the matching chamber', () => {
    expect(faults.map((f) => [f.id, f.at])).toEqual([
      ['cve', 'image-scan'],
      ['migration', 'migrate'],
      ['readiness', 'deploy'],
    ]);
    for (const fault of faults) {
      expect(chambers.some((c) => c.id === fault.at)).toBe(true);
      expect(faultEvents[fault.id]).toBeTruthy();
      expect(recoveryEvents[fault.id]).toBeTruthy();
    }
  });

  it('contains no fabricated release identifiers or production environment names', () => {
    const blob = JSON.stringify({ stageEvents, faultEvents, recoveryEvents });
    expect(blob).not.toMatch(/sha256|CVE-\d{4}|build\s*#?\d+/i);
    expect(blob).not.toMatch(/\b(PROD|UAT|SIT)\b/);
  });
});

describe('Refit semantics', () => {
  it('maps the five before states to the five after states exactly', () => {
    expect(refit.map((r) => [r.before, r.after])).toEqual([
      ['Jenkins + Bitbucket', 'GitLab CI/CD'],
      ['Raw manifests', 'Helm charts'],
      ['JDK 8', 'Java 17'],
      ['JBoss', 'Tomcat 10'],
      ['ELK', 'Observe'],
    ]);
  });

  it('derives Before and After from one seam rather than separate state', () => {
    const source = read('components/plates/Refit.tsx');
    expect(source).toContain("const [seam, setSeam] = useState(0)");
    expect(source).toContain("aria-pressed={side === 'before'}");
    expect(source).toContain("aria-pressed={side === 'after'}");
    expect(source).not.toMatch(/const \[before|const \[after/i);
  });

  it('renders complete before and after names instead of slicing text at the seam', () => {
    const source = read('components/plates/Refit.tsx');
    expect(source).toContain('{r.before}');
    expect(source).toContain('{r.after}');
    expect(source).toContain('data-face="before"');
    expect(source).toContain('data-face="after"');
  });
});

describe('Basin architecture explorer', () => {
  it('exposes the three platform views plus four delivery views', () => {
    expect(mapProductViews.map((v) => v.name)).toEqual(['Verification', 'Evidence', 'Access']);
    const source = read('components/plates/Basin.tsx');
    for (const label of ['How it ships', 'Select any component']) expect(source).toContain(label);
  });

  it('has a typed product graph with no dangling edges', () => {
    const ids = new Set(mapProductNodes.map((n) => n.id));
    for (const edge of mapProductEdges) {
      expect(ids.has(edge.from), `missing ${edge.from}`).toBe(true);
      expect(ids.has(edge.to), `missing ${edge.to}`).toBe(true);
    }
  });

  it('never introduces forbidden MAP delivery relationships', () => {
    const actual = new Set(mapEdges.map((e) => `${e.from}->${e.to}`));
    for (const [from, to] of mapForbiddenEdges) expect(actual.has(`${from}->${to}`)).toBe(false);
  });

  it('describes MAP deployment without pretending the AWS environment is permanently live', () => {
    expect(mapProject.deployment).toMatch(/brought up on demand/i);
    expect(mapProject.deployment).not.toMatch(/always live|24\/7/i);
  });

  it('uses content-aware wrapping controls rather than clipped tab labels', () => {
    const css = read('components/plates/Basin.module.css');
    expect(css).toMatch(/grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(8\.5rem,\s*1fr\)\)/);
    const global = read('app/globals.css');
    expect(global).toContain('white-space: normal');
    expect(global).toContain('overflow-wrap: break-word');
  });
});

describe('Gauge House causal model', () => {
  it('orders the causal chain saturation → queueing → readiness → errors', () => {
    expect(causalChain.map((l) => l.id)).toEqual([
      'saturation', 'queueing', 'readiness', 'errors',
    ]);
  });

  it('is deterministic and quiet at low load', () => {
    expect(causalAt(0.1)).toEqual(causalAt(0.1));
    expect(causalAt(0.1).every((l) => l.state === 'quiet')).toBe(true);
  });

  it('uses an explicitly illustrative model, not measurements', () => {
    expect(read('content/causal.ts')).toMatch(/Illustrative model|illustrative model/);
    expect(read('app/page.tsx')).toContain('Illustrative model, not measurements');
  });
});

describe('Incident Room', () => {
  it('is explicitly a training scenario and not an incident report', () => {
    expect(incident.simulated).toMatch(/Training scenario/i);
    expect(incident.simulated).toMatch(/not an incident report/i);
    expect(incident.simulated).toMatch(/no production data/i);
  });

  it('has exactly one supported diagnosis', () => {
    const correct = incident.hypotheses.filter((h) => h.correct);
    expect(correct).toHaveLength(1);
    expect(correct[0].id).toBe('pool');
    expect(correct[0].label).toMatch(/database will allow/i);
  });

  it('uses readiness as containment rather than pretending the failed pods served traffic', () => {
    expect(incident.lesson).toMatch(/readiness/i);
    expect(incident.lesson).toMatch(/bad pod serves traffic/i);
    expect(incident.clues.some((c) => c.lines.some((l) => /readiness probe failed/i.test(l)))).toBe(true);
  });

  it('contains no employer name or internal environment identifier', () => {
    const blob = JSON.stringify(incident);
    expect(blob).not.toMatch(/Barclays/i);
    expect(blob).not.toMatch(/\b(PROD|UAT|SIT)\b/);
  });
});

describe('Evidence Vault', () => {
  it('backs every card with claim, context, work, stack and evidence', () => {
    expect(evidenceCards).toHaveLength(8);
    for (const card of evidenceCards) {
      expect(card.claim.length).toBeGreaterThan(10);
      expect(card.context.length).toBeGreaterThan(10);
      expect(card.did.length).toBeGreaterThan(0);
      expect(card.stack.length).toBeGreaterThan(0);
      expect(card.evidence.length).toBeGreaterThan(20);
    }
  });

  it('is honest where employed work is not externally auditable', () => {
    const work = evidenceCards.filter((c) => c.kind === 'work');
    expect(work.length).toBeGreaterThan(0);
    expect(work.some((c) => /not externally auditable|confidential|not published/i.test(c.evidence))).toBe(true);
  });

  it('does not invent performance percentages or awards', () => {
    const blob = evidenceCards.map((c) => `${c.claim} ${c.context} ${c.did.join(' ')} ${c.evidence}`).join(' ');
    expect(blob).not.toMatch(/\d+\s?%/);
    expect(blob).not.toMatch(/\b(award|winner|fastest|ROI)\b/i);
  });

  it('protects certification accuracy inside the evidence layer too', () => {
    const credential = evidenceCards.find((c) => c.kind === 'credential');
    expect(credential?.claim).toMatch(/AZ-104.*AZ-900.*Cloud Practitioner/i);
    expect(`${credential?.context} ${credential?.evidence}`).toMatch(/CKAD|DOP-C02/);
    expect(`${credential?.context} ${credential?.evidence}`).not.toMatch(/Solutions Architect Associate/i);
  });
});

describe('progressive disclosure', () => {
  it('provides recruiter briefs for every operable technical chapter', () => {
    for (const id of ['flight', 'refit', 'basin', 'split', 'gauges', 'watch', 'vault']) {
      expect(plateBriefs[id]?.length, `${id} has no recruiter brief`).toBeGreaterThan(0);
    }
  });

  it('keeps engineer mode as the server-rendered default', () => {
    const source = read('content/depth.ts');
    expect(source).toContain("defaultDepth: DepthMode = 'engineer'");
  });

  it('implements depth through one document attribute, not a duplicate app', () => {
    const legend = read('components/Legend.tsx');
    const plate = read('components/Plate.module.css');
    expect(legend).toContain('document.documentElement.dataset.depth = depth');
    expect(plate).toContain("html[data-depth='recruiter']");
  });
});
