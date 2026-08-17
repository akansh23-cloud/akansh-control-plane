#!/usr/bin/env node
/**
 * Verify a live deployment.
 *
 * Playwright checks the code. This checks the deployment: that the real
 * origin serves the real routes, that the PDF comes back as a PDF and not as
 * an HTML error page, and that the metadata points at the production domain
 * rather than at a preview URL.
 *
 * Usage:
 *   npm run verify:prod                       # uses NEXT_PUBLIC_SITE_URL
 *   npm run verify:prod -- https://example.com
 */

const argUrl = process.argv[2];
const base = (argUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://akanshmowar.com')
  .trim()
  .replace(/\/$/, '');

const RESUME_PDF = '/Akansh_Mowar_DevOps_Platform_Engineer_Resume.pdf';

/**
 * Canonical URLs and the sitemap are baked at build time from
 * NEXT_PUBLIC_SITE_URL. Against a local smoke-test server they will
 * legitimately point elsewhere, so those two checks soften to warnings there
 * and stay hard failures against a real origin.
 */
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/i.test(base);

let failures = 0;
let warnings = 0;

const pass = (m) => console.log(`  \u001b[32mok\u001b[0m    ${m}`);
const fail = (m) => {
  failures += 1;
  console.log(`  \u001b[31mFAIL\u001b[0m  ${m}`);
};
const warn = (m) => {
  warnings += 1;
  console.log(`  \u001b[33mwarn\u001b[0m  ${m}`);
};

async function get(path, init = {}) {
  const url = `${base}${path}`;
  const res = await fetch(url, { redirect: 'follow', ...init });
  return { res, url };
}

function check(label, condition, detail = '') {
  if (condition) pass(label);
  else fail(`${label}${detail ? ` — ${detail}` : ''}`);
}

/** A check that only makes sense against the real production origin. */
function checkOrigin(label, condition, detail = '') {
  if (condition) return pass(label);
  if (isLocal) return warn(`${label} — built for another origin${detail ? ` (${detail})` : ''}`);
  return fail(`${label}${detail ? ` — ${detail}` : ''}`);
}

/* ------------------------------------------------------------------ */

async function checkHome() {
  console.log('\nHomepage');
  const { res } = await get('/');
  check('/ returns 200', res.status === 200, `got ${res.status}`);
  if (res.status !== 200) return;

  const html = await res.text();

  check('names Akansh Mowar', /Akansh\s+Mowar/i.test(html));
  check('states the role', /DevOps/i.test(html));
  check('carries the thesis', /code to production/i.test(html));
  check(
    'has a canonical link',
    /<link[^>]+rel="canonical"/i.test(html),
  );

  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i);
  if (canonical) {
    const href = canonical[1];
    check(
      'canonical is not a preview URL',
      !/vercel\.app|netlify\.app|localhost/i.test(href),
      href,
    );
    checkOrigin('canonical matches this origin', href.startsWith(base), href);
  }

  check('has an OG image tag', /og:image/i.test(html));
  check('has a description', /name="description"/i.test(html));
  check(
    'has Person structured data',
    /application\/ld\+json/.test(html) && /"@type":"Person"/.test(html),
  );

  // The accuracy rules, checked against what the world actually sees.
  check(
    'never claims AWS Certified Solutions Architect',
    !/solutions\s+architect/i.test(html),
  );

  const ckad = /CKAD/i.test(html);
  if (ckad) {
    check(
      'CKAD is marked as not certified',
      /not\s+certified|in\s+preparation/i.test(html),
    );
  }

  check(
    'the scale facts are not merged',
    !/50\+[^.<]{0,40}containeris/i.test(html) &&
      !/30\+[^.<]{0,40}microservice/i.test(html),
  );

  check('links the real email', /mowar23akansh@gmail\.com/.test(html));
  check(
    'links the real LinkedIn',
    /linkedin\.com\/in\/akansh-mowar-5a83261a0/.test(html),
  );
  check('links the real GitHub', /github\.com\/akansh23-cloud/.test(html));

  const security = res.headers.get('x-content-type-options');
  if (security === 'nosniff') pass('sends X-Content-Type-Options');
  else warn('X-Content-Type-Options is not set');
}

async function checkResume() {
  console.log('\nRésumé');
  const { res } = await get('/resume');
  check('/resume returns 200', res.status === 200, `got ${res.status}`);
  if (res.status !== 200) return;

  const html = await res.text();
  check('shows Barclays', /Barclays/.test(html));
  check('shows CloudNXT', /CloudNXT/.test(html));
  check('shows the held certifications', /AZ-104/.test(html));
  check(
    'never claims AWS Certified Solutions Architect',
    !/solutions\s+architect/i.test(html),
  );
  check('links the PDF', html.includes(RESUME_PDF));

  // Education was missing from an earlier build. It is checked here because a
  // résumé without a degree section is filtered out by a lot of parsers.
  check('has an Education section', /Education/i.test(html));
  check(
    'names the institution',
    /University of Petroleum and Energy Studies/i.test(html),
  );
  check('names the degree', /B\.Tech/i.test(html));
  check('names the specialisation', /Cloud Computing/i.test(html));
}

async function checkPdf() {
  console.log('\nRésumé PDF');
  const { res, url } = await get(RESUME_PDF);
  check(`${RESUME_PDF} returns 200`, res.status === 200, `got ${res.status}`);
  if (res.status !== 200) return;

  const type = res.headers.get('content-type') ?? '';
  check('served as application/pdf', type.includes('application/pdf'), type);

  const buf = Buffer.from(await res.arrayBuffer());
  check('starts with the PDF magic number', buf.subarray(0, 5).toString('latin1') === '%PDF-');
  check('is not a placeholder', buf.length > 10_000, `${buf.length} bytes`);
  console.log(`        ${url} · ${(buf.length / 1024).toFixed(0)} KB`);
}

async function checkCrawl() {
  console.log('\nCrawlability');

  const robots = await get('/robots.txt');
  check('robots.txt returns 200', robots.res.status === 200);
  if (robots.res.status === 200) {
    const text = await robots.res.text();
    check('robots.txt names the sitemap', /sitemap:/i.test(text));
    check('robots.txt does not disallow everything', !/Disallow:\s*\/\s*$/m.test(text));
  }

  const sitemap = await get('/sitemap.xml');
  check('sitemap.xml returns 200', sitemap.res.status === 200);
  if (sitemap.res.status === 200) {
    const xml = await sitemap.res.text();
    checkOrigin('sitemap lists the homepage', xml.includes(`${base}/`));
    check('sitemap lists the résumé', xml.includes('/resume'));
  }

  const og = await get('/og.png');
  check('og.png returns 200', og.res.status === 200);
  if (og.res.status === 200) {
    const type = og.res.headers.get('content-type') ?? '';
    check('og.png is a PNG', type.includes('image/png'), type);
    const size = Buffer.from(await og.res.arrayBuffer()).length;
    check('og.png is a real image', size > 10_000, `${size} bytes`);
  }

  const icon = await get('/icon.svg');
  check('icon.svg returns 200', icon.res.status === 200);

  const missing = await get('/no-such-plate');
  check('unknown routes return 404', missing.res.status === 404, `got ${missing.res.status}`);
}

/* ------------------------------------------------------------------ */

async function main() {
  console.log(`\nVerifying ${base}\n${'─'.repeat(48)}`);

  try {
    await checkHome();
    await checkResume();
    await checkPdf();
    await checkCrawl();
  } catch (err) {
    fail(`could not reach ${base} — ${err instanceof Error ? err.message : err}`);
  }

  console.log(`${'─'.repeat(48)}`);
  if (failures === 0) {
    console.log(
      `\u001b[32mAll checks passed.\u001b[0m${warnings ? ` ${warnings} warning(s).` : ''}\n`,
    );
    process.exit(0);
  }
  console.log(
    `\u001b[31m${failures} check(s) failed.\u001b[0m${warnings ? ` ${warnings} warning(s).` : ''}\n`,
  );
  process.exit(1);
}

main();
