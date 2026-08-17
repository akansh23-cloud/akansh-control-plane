"""
Brand typefaces for the generated assets.

The site self-hosts three variable typefaces as .woff2 (see src/app/layout.tsx).
The PDF and the OG image must be set in the same faces, so this module
decompresses those .woff2 files to .ttf and pins the variable axes to static
instances that reportlab and Pillow can use.

Output goes to scripts/.fontcache/ and is disposable — delete it and the next
build regenerates it. It is git-ignored on purpose: it is derived, not source.
"""

from __future__ import annotations

import io
import os
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.ttLib.woff2 import decompress
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(__file__).resolve().parent / ".fontcache"
MODULES = ROOT / "node_modules" / "@fontsource-variable"

# Latin subsets only — the résumé and OG image are English.
SOURCES = {
    "bricolage": MODULES
    / "bricolage-grotesque/files/bricolage-grotesque-latin-wdth-normal.woff2",
    "instrument": MODULES
    / "instrument-sans/files/instrument-sans-latin-wdth-normal.woff2",
    "martian": MODULES / "martian-mono/files/martian-mono-latin-wdth-normal.woff2",
}

# name -> (source key, axis pins)
INSTANCES = {
    # Display: condensed and heavy, the way plate titles are set.
    "Bricolage-Display": ("bricolage", {"wght": 700, "wdth": 82, "opsz": 36}),
    "Bricolage-Title": ("bricolage", {"wght": 650, "wdth": 88, "opsz": 24}),
    # Body.
    "Instrument-Regular": ("instrument", {"wght": 400, "wdth": 100}),
    "Instrument-Medium": ("instrument", {"wght": 500, "wdth": 100}),
    "Instrument-Semibold": ("instrument", {"wght": 600, "wdth": 100}),
    # Data / engraved labels.
    "Martian-Regular": ("martian", {"wght": 400, "wdth": 87.5}),
    "Martian-Medium": ("martian", {"wght": 500, "wdth": 87.5}),
}


def _decompressed(key: str) -> TTFont:
    src = SOURCES[key]
    if not src.exists():
        raise FileNotFoundError(
            f"Missing font source {src}.\n"
            "Run `npm install` first — the brand faces ship in node_modules."
        )
    buf = io.BytesIO()
    decompress(str(src), buf)
    buf.seek(0)
    return TTFont(buf)


def build() -> dict[str, Path]:
    """Materialise every static instance. Returns name -> ttf path."""
    CACHE.mkdir(parents=True, exist_ok=True)
    out: dict[str, Path] = {}

    for name, (key, pins) in INSTANCES.items():
        path = CACHE / f"{name}.ttf"
        out[name] = path
        if path.exists():
            continue

        font = _decompressed(key)
        axes = {a.axisTag for a in font["fvar"].axes} if "fvar" in font else set()
        usable = {k: v for k, v in pins.items() if k in axes}
        if usable:
            font = instancer.instantiateVariableFont(font, usable, inplace=False)
        font.save(str(path))

    return out


def paths() -> dict[str, Path]:
    """Build if needed, then return the map."""
    if all((CACHE / f"{n}.ttf").exists() for n in INSTANCES):
        return {n: CACHE / f"{n}.ttf" for n in INSTANCES}
    return build()


if __name__ == "__main__":
    for name, path in build().items():
        size = os.path.getsize(path)
        print(f"{name:22} {size / 1024:6.1f} KB  {path}")
