import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import c0 from './chunks/c000.mjs';
import c1 from './chunks/c001.mjs';
import c2 from './chunks/c002.mjs';
import c3 from './chunks/c003.mjs';
import c4 from './chunks/c004.mjs';
import c5 from './chunks/c005.mjs';
import c6 from './chunks/c006.mjs';
import c7 from './chunks/c007.mjs';
import c8 from './chunks/c008.mjs';
import c9 from './chunks/c009.mjs';
import c10 from './chunks/c010.mjs';
import c11 from './chunks/c011.mjs';
import c12 from './chunks/c012.mjs';

const b64 = [c0,c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12].join('');
const zip = Buffer.from(b64, 'base64');
const sha = createHash('sha256').update(zip).digest('hex');
const expectedSize = 163066;
const expectedSha = '54b32af81e03bc51e6a269da78cc06c46835fc63242e46734306852236972f4b';

if (zip.length !== expectedSize || sha !== expectedSha) {
  throw new Error(`source archive integrity failure: size=${zip.length}, sha=${sha}`);
}

rmSync('app', { recursive: true, force: true });
mkdirSync('app', { recursive: true });
writeFileSync('source.zip', zip);
execFileSync('unzip', ['-t', 'source.zip'], { stdio: 'inherit' });
execFileSync('unzip', ['-q', '-o', 'source.zip', '-d', 'app'], { stdio: 'inherit' });
console.log(`verified ${zip.length} bytes sha256=${sha} and reconstructed source into app`);
