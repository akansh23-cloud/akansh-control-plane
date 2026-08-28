#!/usr/bin/env node
/**
 * LIVE EVIDENCE.
 *
 * The Vault says the two personal projects are "fully checkable: the
 * repository is public". This script performs the check at build time so the
 * site can show it: last push, last CI run and its conclusion, default
 * branch, stars. It writes src/content/evidence-live.json.
 *
 * Rules:
 *  - It never invents a value. A field it could not fetch is null and the UI
 *    says "not fetched" rather than showing a stale or guessed number.
 *  - It never fails a build by itself: no network in CI still builds. Set
 *    EVIDENCE_STRICT=1 (recommended in the deploy pipeline) to make a fetch
 *    failure fatal, so production cannot ship without fresh evidence.
 *  - GITHUB_TOKEN is optional and only raises the rate limit.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'src', 'content', 'evidence-live.json');
const STRICT = process.env.EVIDENCE_STRICT === '1';

const REPOS = [
  'akansh23-cloud/migration-verification',
  'akansh23-cloud/career-autopilot',
  'akansh23-cloud/akansh-control-plane',
];

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'lockworks-evidence',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function gh(url) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function inspect(full) {
  const repo = await gh(`https://api.github.com/repos/${full}`);
  let ci = null;
  try {
    const runs = await gh(`https://api.github.com/repos/${full}/actions/runs?per_page=1&branch=${repo.default_branch}`);
    const run = runs.workflow_runs?.[0];
    if (run) {
      ci = {
        status: run.status,
        conclusion: run.conclusion,
        name: run.name,
        url: run.html_url,
        at: run.updated_at,
      };
    }
  } catch {
    ci = null;
  }
  return {
    repo: full,
    url: repo.html_url,
    defaultBranch: repo.default_branch,
    pushedAt: repo.pushed_at,
    stars: repo.stargazers_count,
    openIssues: repo.open_issues_count,
    language: repo.language,
    ci,
  };
}

let previous = null;
try {
  previous = JSON.parse(await readFile(OUT, 'utf8'));
} catch {
  previous = null;
}

try {
  const repos = {};
  for (const full of REPOS) repos[full] = await inspect(full);
  const out = { fetchedAt: new Date().toISOString(), source: 'github', repos };
  await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`evidence: fetched ${REPOS.length} repositories at ${out.fetchedAt}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (STRICT) {
    console.error(`evidence: fetch failed and EVIDENCE_STRICT=1 — ${message}`);
    process.exit(1);
  }
  if (previous) {
    console.warn(`evidence: fetch failed (${message}); keeping the previous file from ${previous.fetchedAt ?? 'unknown'}`);
  } else {
    const out = { fetchedAt: null, source: 'none', repos: Object.fromEntries(REPOS.map((r) => [r, null])) };
    await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);
    console.warn(`evidence: fetch failed (${message}); wrote an empty evidence file — the UI will say "not fetched"`);
  }
}
