#!/usr/bin/env bash
set -euo pipefail

ROOT="$PWD"
TMP="/tmp/lockworks-v2"
rm -rf "$TMP"
mkdir -p "$TMP"

python3 - <<'PY'
from pathlib import Path
import base64, io, lzma, tarfile
root = Path.cwd()
parts = [
    '.bootstrap/payload/part00',
    '.bootstrap/payload/part01',
    '.bootstrap/payload/part02',
    '.bootstrap/payload/part03',
    '.bootstrap/fix/04a',
    '.bootstrap/fix/04b',
    '.bootstrap/fix/04c0',
    '.bootstrap/fix/04c1',
    '.bootstrap/payload/part05',
    '.bootstrap/payload/part06',
    '.bootstrap/fix/07a0',
    '.bootstrap/fix/07a1',
    '.bootstrap/fix/07b0',
    '.bootstrap/fix/07b1a',
    '.bootstrap/fix/07b1b',
    '.bootstrap/fix/07c0',
    '.bootstrap/fix/07c1',
]
encoded = ''.join((root / p).read_text() for p in parts)
archive = lzma.decompress(base64.b64decode(encoded))
with tarfile.open(fileobj=io.BytesIO(archive), mode='r:') as tf:
    tf.extractall('/tmp/lockworks-v2')
PY

# Remove the rejected implementation before overlaying v2.
rm -rf src tests assets public
cp -a "$TMP"/. "$ROOT"/

# Install exactly what the rebuilt package declares.
npm install

# Build the generated PDF and Open Graph assets used by the production site.
python3 -m pip install --quiet --user pillow reportlab || python3 -m pip install --quiet pillow reportlab
npm run assets

# Leave a marker in Vercel logs proving the rebuild was reconstructed.
echo "LOCKWORKS_REBUILD_V2_READY"
