/**
 * Export the content layer to JSON.
 *
 * The PDF and the OG image are generated in Python, but the facts they carry
 * must come from exactly one place — src/content. This script reads the
 * TypeScript modules directly (Node type stripping) and writes a JSON snapshot
 * that the Python builders consume. Nothing downstream is allowed to hardcode
 * a fact.
 *
 * Usage: node --experimental-strip-types scripts/export-content.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as profile from '../src/content/profile.ts';
import * as experience from '../src/content/experience.ts';
import * as projects from '../src/content/projects.ts';
import * as flight from '../src/content/flight.ts';
import * as observability from '../src/content/observability.ts';
import * as skills from '../src/content/skills.ts';
import * as education from '../src/content/education.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '.content.json');

const snapshot = {
  generatedAt: new Date().toISOString(),
  profile: profile.profile,
  contact: profile.contact,
  site: profile.site,
  credentials: profile.credentials,
  completedCredentials: profile.completedCredentials,
  preparationCredentials: profile.preparationCredentials,
  scanFacts: profile.scanFacts,
  roles: experience.roles,
  scale: experience.scale,
  refit: experience.refit,
  mapProject: projects.mapProject,
  careerProject: projects.careerProject,
  chambers: flight.chambers,
  gauges: observability.gauges,
  education: education.education,
  /* The Python builders print names, not provenance. Flatten here so the
     generators cannot accidentally render an object. */
  skillGroups: skills.skillGroups.map((g) => ({
    id: g.id,
    label: g.label,
    items: g.items.map((s) => s.name),
  })),
};

mkdirSync(here, { recursive: true });
writeFileSync(out, JSON.stringify(snapshot, null, 2));
console.log(`content snapshot → ${out}`);
