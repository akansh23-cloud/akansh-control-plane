"""
Build public/og.png, public/icon.svg, public/favicon.ico and
public/apple-icon.png.

The share card is not a screenshot and it is not a coloured rectangle with a
name on it — it is plate 01, Headwater, drawn at 1200x630: a lock chamber with
the water part-way up and the name cut by the waterline, ink above it and
chalk below. That is the one image the whole site is built around, so it is
the one that should travel.

Facts come from scripts/.content.json. Type comes from the same variable
fonts the site self-hosts.

Usage:
    node --experimental-strip-types scripts/export-content.mjs
    python3 scripts/build_images.py
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

import brand_fonts

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"

# --- identity -------------------------------------------------------------

STONE_050 = (241, 242, 235)
STONE_100 = (230, 232, 223)
STONE_200 = (216, 219, 208)
STONE_300 = (196, 200, 187)
INK = (15, 23, 25)
INK_700 = (37, 49, 53)
INK_500 = (74, 88, 93)
INK_400 = (108, 122, 126)
WATER_DEEP = (14, 44, 51)
WATER_800 = (18, 60, 70)
WATER_600 = (28, 90, 101)
WATER_400 = (46, 127, 139)
WATER_200 = (111, 168, 175)
SIGNAL = (232, 182, 44)
SIGNAL_DIM = (185, 140, 22)
CHALK = (176, 208, 210)

W, H = 1200, 630
WATERLINE = 382


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(brand_fonts.paths()[name]), size)


def text_w(d: ImageDraw.ImageDraw, s: str, f, tracking: float = 0.0) -> float:
    base = d.textlength(s, font=f)
    return base + tracking * max(len(s) - 1, 0)


def tracked(
    d: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    s: str,
    f,
    fill,
    tracking: float = 0.0,
    anchor_left: bool = True,
) -> float:
    """PIL has no letter-spacing, so the run is drawn glyph by glyph."""
    x, y = xy
    if not anchor_left:
        x -= text_w(d, s, f, tracking)
    start = x
    for ch in s:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + tracking
    return x - start


def grain(img: Image.Image, amount: float = 0.055) -> Image.Image:
    """The tooth of the paper. It should be felt, not seen."""
    rnd = random.Random(1837)  # the year the Grand Union locks were rebuilt
    small = Image.new("L", (img.width // 2, img.height // 2))
    small.putdata([rnd.randint(112, 144) for _ in range(small.width * small.height)])
    noise = (
        small.resize(img.size, Image.BILINEAR)
        .filter(ImageFilter.GaussianBlur(0.5))
        .convert("RGB")
    )
    return Image.blend(img, noise, amount)


# --- the share card -------------------------------------------------------


def build_og(d: dict) -> None:
    profile = d["profile"]

    img = Image.new("RGB", (W, H), STONE_100)
    dr = ImageDraw.Draw(img)

    # --- masonry outside the chamber: hatched, the way a section is drawn ---
    wall_l, wall_r = 74, W - 74
    for x in range(0, W, 9):
        dr.line([(x, 0), (x - 120, H)], fill=STONE_200, width=1)

    dr.rectangle([wall_l, 0, wall_r, H], fill=STONE_050)

    # --- water ---
    for y in range(WATERLINE, H):
        t = (y - WATERLINE) / (H - WATERLINE)
        col = tuple(
            round(WATER_600[i] + (WATER_DEEP[i] - WATER_600[i]) * (t**0.72))
            for i in range(3)
        )
        dr.line([(wall_l, y), (wall_r, y)], fill=col)

    # settling ripples
    for i, (dy, alpha) in enumerate([(14, 34), (30, 22), (52, 14), (84, 9)]):
        y = WATERLINE + dy
        col = tuple(
            round(WATER_600[c] + (WATER_200[c] - WATER_600[c]) * alpha / 100)
            for c in range(3)
        )
        inset = 46 + i * 34
        dr.line([(wall_l + inset, y), (wall_r - inset, y)], fill=col, width=1)

    # the surface itself
    dr.line([(wall_l, WATERLINE), (wall_r, WATERLINE)], fill=WATER_200, width=2)
    dr.line(
        [(wall_l, WATERLINE - 3), (wall_r, WATERLINE - 3)], fill=STONE_050, width=1
    )

    # --- chamber walls ---
    dr.rectangle([wall_l - 6, 0, wall_l, H], fill=INK)
    dr.rectangle([wall_r, 0, wall_r + 6, H], fill=INK)

    # --- staff gauge cut into the left wall: depth marks, every foot ---
    for i in range(20):
        y = 40 + i * 30
        long_mark = i % 5 == 0
        col = (
            WATER_200
            if y > WATERLINE
            else (INK_400 if long_mark else STONE_300)
        )
        dr.line(
            [(wall_l + 8, y), (wall_l + (24 if long_mark else 16), y)],
            fill=col,
            width=2 if long_mark else 1,
        )
    # the mark the water is standing at
    dr.line([(wall_l + 8, WATERLINE), (wall_l + 34, WATERLINE)], fill=SIGNAL, width=3)

    # --- the gate and geared head: it should read as machinery, not a stick ---
    gate_x = wall_r - 118
    dr.rectangle([gate_x - 3, 128, gate_x + 19, H], fill=STONE_200, outline=INK, width=2)
    dr.line([(gate_x + 2, 128), (gate_x + 2, H)], fill=INK_500, width=1)
    dr.line([(gate_x + 14, 128), (gate_x + 14, H)], fill=INK_500, width=1)
    dr.rectangle([gate_x - 3, 186, gate_x + 19, 199], fill=SIGNAL, outline=INK, width=1)
    dr.rectangle([gate_x - 3, 268, gate_x + 19, 281], fill=SIGNAL_DIM, outline=INK, width=1)

    wheel_y = 92
    wheel_r = 19
    dr.line([(gate_x + 8, 128), (gate_x + 8, wheel_y + wheel_r)], fill=INK, width=3)
    dr.ellipse([gate_x + 8 - wheel_r, wheel_y - wheel_r, gate_x + 8 + wheel_r, wheel_y + wheel_r], fill=STONE_050, outline=INK, width=3)
    for a in (0, 45, 90, 135):
        import math
        rad = math.radians(a)
        dx, dy = math.cos(rad) * 15, math.sin(rad) * 15
        dr.line([(gate_x + 8 - dx, wheel_y - dy), (gate_x + 8 + dx, wheel_y + dy)], fill=INK_700, width=1)
    dr.ellipse([gate_x + 3, wheel_y - 5, gate_x + 13, wheel_y + 5], fill=SIGNAL, outline=INK, width=2)
    # counterweight cable and weight
    dr.line([(gate_x + 27, wheel_y), (gate_x + 50, wheel_y), (gate_x + 50, 156)], fill=INK_500, width=1)
    dr.rectangle([gate_x + 42, 154, gate_x + 58, 181], fill=STONE_300, outline=INK, width=1)

    # --- cartouche ---
    f_mark_s = font("Martian-Medium", 13)
    tracked(dr, (wall_l + 52, 54), "PLATE 01", f_mark_s, INK, 3.0)
    dr.line([(wall_l + 52, 78), (wall_l + 168, 78)], fill=SIGNAL, width=3)
    tracked(dr, (wall_l + 182, 54), "HEADWATER", f_mark_s, INK_400, 3.0)

    # restrained survey annotations give the empty paper engineering purpose
    f_micro = font("Martian-Regular", 9)
    survey_x = wall_l + 660
    dr.line([(survey_x, 118), (gate_x - 80, 118)], fill=STONE_300, width=1)
    dr.ellipse([survey_x - 2, 116, survey_x + 2, 120], fill=SIGNAL, outline=INK)
    tracked(dr, (survey_x + 12, 101), "DATUM / DELIVERY HEAD", f_micro, INK_500, 1.3)
    tracked(dr, (survey_x + 12, 119), "CODE → GATES → PRODUCTION", f_micro, INK_400, 1.0)

    # --- role line ---
    f_role = font("Martian-Medium", 19)
    tracked(dr, (wall_l + 52, 222), profile["roleLine"].upper(), f_role, WATER_800, 3.4)

    # --- the name, cut by the waterline ---
    name = profile["name"].upper()
    nx, ny = wall_l + 52, 268
    limit = gate_x - 46 - nx
    size = 132
    f_name = font("Bricolage-Display", size)
    while text_w(dr, name, f_name) > limit and size > 60:
        size -= 2
        f_name = font("Bricolage-Display", size)
    ink_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ink_layer).text((nx, ny), name, font=f_name, fill=INK + (255,))

    # above the line: ink on paper
    above = ink_layer.copy()
    ImageDraw.Draw(above).rectangle([0, WATERLINE, W, H], fill=(0, 0, 0, 0))
    img.paste(above, (0, 0), above)

    # below the line: refracted chalk. Horizontal strips shift by a few pixels
    # with depth so the effect reads as water, not as duplicate text.
    below_source = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(below_source).text((nx + 2, ny), name, font=f_name, fill=CHALK + (224,))
    ImageDraw.Draw(below_source).rectangle([0, 0, W, WATERLINE - 1], fill=(0, 0, 0, 0))
    below = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    import math
    strip = 4
    for y in range(WATERLINE, H, strip):
        shift = round(math.sin((y - WATERLINE) / 13.0) * 2.2 + math.sin((y - WATERLINE) / 31.0) * 1.2)
        band = below_source.crop((0, y, W, min(H, y + strip)))
        below.paste(band, (shift, y), band)
    below = below.filter(ImageFilter.GaussianBlur(0.22))
    img.paste(below, (0, 0), below)

    # --- thesis, under water, in chalk ---
    f_thesis = font("Instrument-Medium", 25)
    words = profile["thesis"].split()
    limit = gate_x - 60 - (wall_l + 52)

    def flow(max_w: float) -> list[str]:
        out: list[str] = []
        line = ""
        for word in words:
            probe = f"{line} {word}".strip()
            if dr.textlength(probe, font=f_thesis) <= max_w or not line:
                line = probe
            else:
                out.append(line)
                line = word
        out.append(line)
        return out

    # Squeeze the measure until the last line stops being a widow.
    lines = flow(limit)
    target = limit
    while target > limit * 0.6:
        trial = flow(target)
        if len(trial) != len(lines):
            break
        widths = [dr.textlength(ln, font=f_thesis) for ln in trial]
        if min(widths) / max(widths) > 0.72:
            lines = trial
            break
        lines = trial
        target -= 12

    ty = WATERLINE + 88
    for ln in lines:
        dr.text((wall_l + 52, ty), ln, font=f_thesis, fill=CHALK)
        ty += 36

    # --- footing ---
    f_foot = font("Martian-Regular", 14)
    # The identity, not the address. A domain is only drawn when it has been
    # configured for this build; otherwise the plate carries the drawing name.
    host = (
        d["site"]["url"].replace("https://", "").replace("http://", "")
        if d["site"].get("originConfigured")
        else "THE LOCKWORKS"
    )
    dr.line([(wall_l + 52, H - 62), (wall_r - 40, H - 62)], fill=WATER_400, width=1)
    tracked(dr, (wall_l + 52, H - 46), host.upper(), f_foot, CHALK, 2.2)
    tracked(
        dr,
        (wall_r - 40, H - 46),
        profile["location"].upper(),
        f_foot,
        CHALK,
        2.2,
        anchor_left=False,
    )

    img = grain(img)
    out = PUBLIC / "og.png"
    img.save(out, "PNG", optimize=True)
    print(f"public/og.png  ·  {W}x{H}  ·  {out.stat().st_size / 1024:.0f} KB")


# --- marks ----------------------------------------------------------------

ICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="A lock chamber, half full, with the gate painted yellow.">
  <rect width="64" height="64" fill="#F1F2EB"/>
  <path d="M0 36h64v28H0z" fill="#1C5A65"/>
  <path d="M0 36h64" stroke="#6FA8AF" stroke-width="2"/>
  <rect x="6" y="0" width="6" height="64" fill="#0F1719"/>
  <rect x="52" y="0" width="6" height="64" fill="#0F1719"/>
  <rect x="30" y="8" width="5" height="56" fill="#0F1719"/>
  <rect x="28.5" y="18" width="8" height="6" fill="#E8B62C"/>
</svg>
"""


def build_marks() -> None:
    (PUBLIC / "icon.svg").write_text(ICON_SVG)

    def raster(size: int, pad: int = 0) -> Image.Image:
        s = 64
        im = Image.new("RGB", (s, s), STONE_050)
        d = ImageDraw.Draw(im)
        d.rectangle([0, 36, s, s], fill=WATER_600)
        d.line([(0, 36), (s, 36)], fill=WATER_200, width=2)
        d.rectangle([6, 0, 12, s], fill=INK)
        d.rectangle([52, 0, 58, s], fill=INK)
        d.rectangle([30, 8, 35, s], fill=INK)
        d.rectangle([28, 18, 36, 24], fill=SIGNAL)
        im = im.resize((size, size), Image.LANCZOS)
        if pad:
            bg = Image.new("RGB", (size + pad * 2, size + pad * 2), STONE_050)
            bg.paste(im, (pad, pad))
            return bg
        return im

    ico = PUBLIC / "favicon.ico"
    raster(64).save(ico, sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

    apple = PUBLIC / "apple-icon.png"
    raster(160, pad=20).save(apple, "PNG", optimize=True)

    print("public/icon.svg · public/favicon.ico · public/apple-icon.png")


def main() -> None:
    snapshot = SCRIPTS / ".content.json"
    if not snapshot.exists():
        raise SystemExit(
            "Missing scripts/.content.json — run:\n"
            "  node --experimental-strip-types scripts/export-content.mjs"
        )
    PUBLIC.mkdir(parents=True, exist_ok=True)
    d = json.loads(snapshot.read_text())
    build_og(d)
    build_marks()


if __name__ == "__main__":
    main()
