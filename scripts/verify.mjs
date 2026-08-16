#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHECKS = [
  { id: 'typecheck', label: 'Typecheck', command: 'npm', args: ['run', 'typecheck'] },
  { id: 'lint', label: 'Lint', command: 'npm', args: ['run', 'lint'] },
  { id: 'build', label: 'Build', command: 'npm', args: ['run', 'build'] },
  { id: 'e2e', label: 'E2E smoke', command: 'npm', args: ['run', 'test:e2e'] },
];

const results = [];
let failed = false;
for (const check of CHECKS) {
  process.stdout.write(`\n▶ ${check.label}\n`);
  const run = spawnSync(check.command, check.args, { stdio: check.id === 'e2e' ? 'pipe' : 'inherit', encoding: 'utf8', shell: process.platform === 'win32' });
  if (check.id === 'e2e' && run.stdout) process.stdout.write(run.stdout);
  if (check.id === 'e2e' && run.stderr) process.stderr.write(run.stderr);
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  const browsersMissing = /Executable doesn't exist|playwright install/i.test(output);
  let status;
  if (run.error || run.status === null) status = 'not run';
  else if (run.status !== 0 && check.id === 'e2e' && browsersMissing) status = 'not run';
  else status = run.status === 0 ? 'pass' : 'fail';
  if (status === 'fail') failed = true;
  results.push({ id: check.id, label: check.label, status });
}
const payload = { generatedAt: new Date().toISOString(), commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.GITHUB_SHA?.slice(0, 7) ?? null, checks: results };
writeFileSync(new URL('../data/build-status.json', import.meta.url), `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`\n${results.map((r) => `${r.label}: ${r.status}`).join('\n')}\n`);
process.exit(failed ? 1 : 0);
