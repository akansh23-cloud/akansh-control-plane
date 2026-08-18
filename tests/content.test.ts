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

describe('identity and certification accuracy', () => {
  it('positions Akansh correctly', () => {
    expect(profile.name).toBe('Akansh Mowar');
    expect(profile.roleLine).toBe('DevOps / Platform / Cloud Engineer');
    expect(profile.location).toBe('Pune, India');
    expect(barclays.company).toBe('Barclays');
    expect(barclays.title).toBe('DevOps Engineer');
  });

  it('keeps the three scope claims separate', () => {
    expect(scale.services.value).toBe('50+');
    expect(scale.workloads.value).toBe('30+');
    expect(scale.stages.value).toBe('20+');
    expect(new Set([scale.services.noun, scale.workloads.noun, scale.stages.noun]).size).toBe(3);
  });

  it('holds exactly AZ-104, AZ-900 and AWS Cloud Practitioner', () => {
    expect(completedCredentials.map((c) => c.code ?? c.name).sort()).toEqual([
      'AZ-104',
      'AZ-900',
      'Cloud Practitioner',
    ]);
  });

  it('keeps CKAD and DOP-C02 as preparation only and never claims Solutions Architect', () => {
    expect(preparationCredentials.map((c) => c.code).sort()).toEqual(['CKAD', 'DOP-C02']);
    expect(credentials.find((c) => c.code === 'CKAD')?.status).toBe('preparation');
    expect(credentials.find((c) => c.code === 'DOP-C02')?.status).toBe('preparation');
    expect(JSON.stringify(credentials)).not.toMatch(/solutions architect/i);
  });

  it('keeps resume routes stable', () => {
    expect(site.resumeRoute).toBe('/resume');
    expect(site.resumePath).toBe('/Akansh_Mowar_DevOps_Platform_Engineer_Resume.pdf');
  });
});

describe('V6 drawing set and journey', () => {
  it('has nine unique plates in the intended order', () => {
    expect(plates.map((p) => p.id)).toEqual([
      'headwater', 'flight', 'refit', 'basin', 'split', 'gauges', 'watch', 'vault', 'tidewater',
    ]);
    expect(plates.map((p) => p.no)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09']);
    expect(new Set(plates.map((p) => p.id)).size).toBe(9);
  });

  it('renders all chapters plus the shared V6 systems', () => {
    const page = read('app/page.tsx');
    for (const p of plates) expect(page).toContain(`id="${p.id}"`);
    for (const component of ['<Waterway />', '<Brief />', '<Watch />', '<Vault />']) {
      expect(page).toContain(component);
    }
  });

  it('declares Source → Build → Gates → Registry → Production → Observability', () => {
    expect(journey.map((s) => s.id)).toEqual([
      'source', 'build', 'gates', 'registry', 'production', 'observability',
    ]);
    for (const stop of journey) expect(plates.some((p) => p.id === stop.plate)).toBe(true);
  });
});

describe('Flight release simulation', () => {
  it('models nine stages and has a status event for each', () => {
    expect(chambers).toHaveLength(9);
    for (const chamber of chambers) {
      expect(stageEvents[chamber.id]?.length, `${chamber.id} has no event`).toBeGreaterThan(0);
    }
  });

  it('stops injected faults at the correct gate and provides recovery', () => {
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

  it('does not fabricate release IDs or internal environment names', () => {
    const blob = JSON.stringify({ stageEvents, faultEvents, recoveryEvents });
    expect(blob).not.toMatch(/sha256|CVE-\d{4}|build\s*#?\d+/i);
    expect(blob).not.toMatch(/\b(PROD|UAT|SIT)\b/);
  });
});

describe('Refit semantics and readability', () => {
  it('maps every old layer to the intended replacement', () => {
    expect(refit.map((r) => [r.before, r.after])).toEqual([
      ['Jenkins + Bitbucket', 'GitLab CI/CD'],
      ['Raw manifests', 'Helm charts'],
      ['JDK 8', 'Java 17'],
      ['JBoss', 'Tomcat 10'],
      ['ELK', 'Observe'],
    ]);
  });

  it('derives Before and After from one seam and renders whole labels', () => {
    const source = read('components/plates/Refit.tsx');
    expect(source).toContain("const [seam, setSeam] = useState(0)");
    expect(source).toContain("aria-pressed={side === 'before'}");
    expect(source).toContain("aria-pressed={side === 'after'}");
    expect(source).toContain('{r.before}');
    expect(source).toContain('{r.after}');
    expect(source).toContain('data-face="before"');
    expect(source).toContain('data-face="after"');
  });
});

describe('Basin architecture explorer', () => {
  it('exposes three platform views plus four delivery views', () => {
    expect(mapProductViews.map((v) => v.name)).toEqual(['Verification', 'Evidence', 'Access']);
    const source = read('components/plates/Basin.tsx');
    expect(source).toContain('How it ships');
    expect(source).toContain('Select any component');
  });

  it('has no dangling product edges or forbidden delivery relationships', () => {
    const ids = new Set(mapProductNodes.map((n) => n.id));
    for (const edge of mapProductEdges) {
      expect(ids.has(edge.from), `missing ${edge.from}`).toBe(true);
      expect(ids.has(edge.to), `missing ${edge.to}`).toBe(true);
    }
    const actual = new Set(mapEdges.map((e) => `${e.from}->${e.to}`));
    for (const [from, to] of mapForbiddenEdges) expect(actual.has(`${from}->${to}`)).toBe(false);
  });

  it('never claims the documented AWS runtime is permanently live', () => {
    expect(mapProject.deployment).not.toMatch(/always live|24\/7|permanently live/i);
  });

  it('uses wrapping, content-aware controls instead of clipped tabs', () => {
    const css = read('components/plates/Basin.module.css');
    const global = read('app/globals.css');
    expect(css).toMatch(/repeat\(auto-fit,\s*minmax\(8\.5rem,\s*1fr\)\)/);
    expect(global).toContain('white-space: normal');
    expect(global).toContain('overflow-wrap: break-word');
  });
});

describe('Gauge House causal model', () => {
  it('orders saturation → queueing → readiness → errors', () => {
    expect(causalChain.map((l) => l.id)).toEqual(['saturation', 'queueing', 'readiness', 'errors']);
  });

  it('is deterministic and explicitly illustrative', () => {
    expect(causalAt(0.1)).toEqual(causalAt(0.1));
    expect(causalAt(0.1).every((l) => l.state === 'quiet')).toBe(true);
    expect(read('content/causal.ts')).toMatch(/Illustrative model/i);
    expect(read('app/page.tsx')).toContain('Illustrative model, not measurements');
  });
});

describe('Incident Room', () => {
  it('is explicitly a training scenario with exactly one supported diagnosis', () => {
    expect(incident.simulated).toMatch(/Training scenario/i);
    expect(incident.simulated).toMatch(/not an incident report/i);
    expect(incident.simulated).toMatch(/no production data/i);
    const correct = incident.hypotheses.filter((h) => h.correct);
    expect(correct).toHaveLength(1);
    expect(correct[0].id).toBe('pool');
  });

  it('uses readiness as containment and contains no employer/internal environment identifiers', () => {
    expect(incident.lesson).toMatch(/readiness/i);
    const blob = JSON.stringify(incident);
    expect(blob).not.toMatch(/Barclays/i);
    expect(blob).not.toMatch(/\b(PROD|UAT|SIT)\b/);
  });
});

describe('Evidence Vault', () => {
  it('backs every card with context, work, stack and evidence', () => {
    expect(evidenceCards).toHaveLength(8);
    for (const card of evidenceCards) {
      expect(card.claim.length).toBeGreaterThan(10);
      expect(card.context.length).toBeGreaterThan(10);
      expect(card.did.length).toBeGreaterThan(0);
      expect(card.stack.length).toBeGreaterThan(0);
      expect(card.evidence.length).toBeGreaterThan(20);
    }
  });

  it('does not invent percentages, awards or certification claims', () => {
    const blob = JSON.stringify(evidenceCards);
    expect(blob).not.toMatch(/\d+\s?%/);
    expect(blob).not.toMatch(/\b(award|winner|fastest|ROI)\b/i);
    const credential = evidenceCards.find((c) => c.kind === 'credential');
    expect(credential?.claim).toMatch(/AZ-104.*AZ-900.*Cloud Practitioner/i);
    expect(`${credential?.context} ${credential?.evidence}`).toMatch(/CKAD|DOP-C02/);
    expect(`${credential?.context} ${credential?.evidence}`).not.toMatch(/Solutions Architect Associate/i);
  });
});

describe('progressive disclosure', () => {
  it('provides recruiter briefs while keeping engineer mode the server default', () => {
    for (const id of ['flight', 'refit', 'basin', 'split', 'gauges', 'watch', 'vault']) {
      expect(plateBriefs[id]?.length, `${id} has no recruiter brief`).toBeGreaterThan(0);
    }
    expect(read('content/depth.ts')).toContain("defaultDepth: DepthMode = 'engineer'");
  });

  it('uses one document depth attribute rather than a duplicate app', () => {
    expect(read('components/Legend.tsx')).toContain('document.documentElement.dataset.depth = depth');
    expect(read('components/Plate.module.css')).toContain("html[data-depth='recruiter']");
  });
});
