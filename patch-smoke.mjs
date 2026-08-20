import { readFileSync, writeFileSync } from 'node:fs';
const path='app/tools/ui-smoke.mjs';
let s=readFileSync(path,'utf8');
s=s.replace("const { chapters, projects } = await import('../src/data/portfolio.js');","const { chapters, projects, profile } = await import('../src/data/portfolio.js');");
s=s.replace("// The content rule made testable: nothing renders for a fact the data omits.\nok(!document.querySelector('a[href*=\"linkedin\"]'), 'no LinkedIn CTA while the data leaves it blank (NEEDS_SOURCE)');\nok(![...document.querySelectorAll('.fact span')].some((s) => s.textContent === 'TENURE'), 'no tenure tile while the data leaves it blank (NEEDS_SOURCE)');","// Source-of-truth availability is reflected in the rendered CTAs/facts.\nok(profile.linkedin ? !!document.querySelector('a[href*=\"linkedin\"]') : !document.querySelector('a[href*=\"linkedin\"]'), 'LinkedIn CTA follows source-of-truth availability');\nok(profile.tenure ? [...document.querySelectorAll('.fact span')].some((s) => s.textContent === 'TENURE') : ![...document.querySelectorAll('.fact span')].some((s) => s.textContent === 'TENURE'), 'tenure tile follows source-of-truth availability');");
s=s.replace('for (let i = 0; i < 60 * 4; i++) actions.update(1 / 60);','for (let i = 0; i < 60 * 5; i++) actions.update(1 / 60);');
writeFileSync(path,s);
console.log('patched smoke assertions to current source-of-truth and hold duration');
