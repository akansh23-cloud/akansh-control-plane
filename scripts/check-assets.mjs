#!/usr/bin/env node
/**
 * Asset freshness gate.
 *
 * The résumé PDF and the Open Graph image are generated artefacts built from
 * src/content by Python. Nothing stops the content changing and those files
 * staying behind — which is exactly how a site ends up serving a résumé that
 * contradicts the page it is linked from.
 *
 * So: hash the content layer, record that hash next to the artefacts, and
 * refuse to build when they disagree.
 *
 *   node scripts/check-assets.mjs           verify, fail on drift
 *   node scripts/check-assets.mjs --write    record the current hash
 *
 * The build runs the verify form. `npm run assets` runs the write form after
 * regenerating, so the only way to record a hash is to have actually rebuilt.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const manifest = join(here, '.assets.json');

/** Every file that can change what the generated artefacts should say. */
const SOURCES = [
  'src/content/profile.ts',
  'src/content/education.ts',
  'src/content/experience.ts',
  'src/content/projects.ts',
  'src/content/flight.ts',
  'src/content/observability.ts',
  'src/content/skills.ts',
  'scripts/build_pdf.py',
  'scripts/build_images.py',
  'scripts/brand_fonts.py',
  'scripts/export-content.mjs',
];

/** Every artefact those sources produce. */
const ARTEFACTS = [
  'public/Akansh_Mowar_DevOps_Platform_Engineer_Resume.pdf',
  'public/og.png',
  'public/icon.svg',
  'public/favicon.ico',
  'public/apple-icon.png',
];

function hashOf(paths) {
  const h = createHash('sha256');
  for (const rel of paths) {
    const abs = join(root, rel);
    h.update(rel);
    h.update(existsSync(abs) ? readFileSync(abs) : Buffer.from('MISSING'));
  }
  return h.digest('hex').slice(0, 16);
}

const write = process.argv.includes('--write');
const contentHash = hashOf(SOURCES);

const missing = ARTEFACTS.filter((a) => !existsSync(join(root, a)));

if (write) {
  if (missing.length) {
    console.error(
      `\nCannot record asset hashes — these were never generated:\n  ${missing.join('\n  ')}\n`,
    );
    process.exit(1);
  }
  writeFileSync(
    manifest,
    `${JSON.stringify(
      {
        note: 'Written by scripts/check-assets.mjs --write. Do not edit by hand.',
        contentHash,
        artefactHash: hashOf(ARTEFACTS),
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`assets recorded · content ${contentHash}`);
  process.exit(0);
}

if (missing.length) {
  console.error(
    `\n✗ Generated assets are missing:\n  ${missing.join('\n  ')}\n\n  Run: npm run assets\n`,
  );
  process.exit(1);
}

if (!existsSync(manifest)) {
  console.error(
    '\n✗ No asset manifest. The PDF and OG image have never been verified ' +
      'against the content layer.\n\n  Run: npm run assets\n',
  );
  process.exit(1);
}

const recorded = JSON.parse(readFileSync(manifest, 'utf8'));
const artefactHash = hashOf(ARTEFACTS);

let failed = false;

if (recorded.contentHash !== contentHash) {
  failed = true;
  console.error(
    '\n✗ The content layer changed since the résumé PDF and OG image were ' +
      `built.\n    recorded ${recorded.contentHash}\n    current  ${contentHash}\n` +
      '\n  The site would ship saying one thing and the PDF another.' +
      '\n  Run: npm run assets\n',
  );
}

if (recorded.artefactHash !== artefactHash) {
  failed = true;
  console.error(
    '\n✗ A generated asset was modified outside the generator.\n' +
      `    recorded ${recorded.artefactHash}\n    current  ${artefactHash}\n` +
      '\n  Run: npm run assets\n',
  );
}

if (failed) process.exit(1);

console.log(`assets fresh · content ${contentHash}`);
