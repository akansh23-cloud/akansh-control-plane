import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import c7 from './chunks/c007.mjs';
import c8 from './chunks/c008.mjs';
import c9 from './chunks/c009.mjs';
import c11 from './chunks/c011.mjs';
import c12 from './chunks/c012.mjs';

const read = (path) => readFileSync(path, 'utf8').trim();
const parts = [
  read('payload/c000.txt'),
  read('payload/current-c001.txt'),
  read('payload/current-c002.txt'),
  read('payload/c003.txt'),
  read('payload/c004.txt'),
  read('payload/c005.txt'),
  read('payload/c006.txt'),
  c7,
  c8,
  c9,
  read('payload/current-c010.txt'),
  c11,
  c12,
];

if (parts.some((part, index) => !part || typeof part !== 'string')) {
  throw new Error('cinematic payload contains an empty or invalid chunk');
}

const b64 = parts.join('');
const zip = Buffer.from(b64, 'base64');
const sha = createHash('sha256').update(zip).digest('hex');
const expectedSize = 149379;
const expectedSha = '2d1d97567b982a86d2d9b67ab3a938d2d266e91b89c8b9e1f45b58589c9956fb';

if (zip.length !== expectedSize || sha !== expectedSha) {
  throw new Error(`source archive integrity failure: size=${zip.length}, sha=${sha}`);
}

rmSync('app', { recursive: true, force: true });
mkdirSync('app', { recursive: true });
writeFileSync('source.zip', zip);
execFileSync('unzip', ['-t', 'source.zip'], { stdio: 'inherit' });
execFileSync('unzip', ['-q', '-o', 'source.zip', '-d', 'app'], { stdio: 'inherit' });
console.log(`verified ${zip.length} bytes sha256=${sha} and reconstructed source into app`);
