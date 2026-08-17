"""
Build the résumé PDF.

Rules this script obeys:
  * Every fact comes from scripts/.content.json, exported straight from
    src/content. Nothing is typed twice, so nothing can drift.
  * The text is real text — selectable, searchable, extractable by an ATS.
    No images of words anywhere.
  * Single column, standard section headings. A résumé a parser cannot read
    is a résumé that does not get read.
  * The visual identity is the site's: slate ink on white, water teal for
    structure, machinery yellow used sparingly and never as the only signal.

Usage:
    node --experimental-strip-types scripts/export-content.mjs
    python3 scripts/build_pdf.py
"""

from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as pdfcanvas

import brand_fonts

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = Path(__file__).resolve().parent
OUT = ROOT / "public" / "Akansh_Mowar_DevOps_Platform_Engineer_Resume.pdf"

# --- identity -------------------------------------------------------------

INK = HexColor("#0F1719")
INK_700 = HexColor("#253135")
INK_500 = HexColor("#4A585D")
INK_400 = HexColor("#6C7A7E")
STONE_050 = HexColor("#F1F2EB")
WATER_800 = HexColor("#123C46")
WATER_400 = HexColor("#2E7F8B")
SIGNAL = HexColor("#E8B62C")
RULE = Color(0.06, 0.09, 0.10, alpha=0.22)
RULE_SOFT = Color(0.06, 0.09, 0.10, alpha=0.12)

PAGE_W, PAGE_H = A4
M_L, M_R, M_T, M_B = 46.0, 46.0, 40.0, 42.0
COL_W = PAGE_W - M_L - M_R

DISPLAY = "Bricolage-Display"
TITLE = "Bricolage-Title"
BODY = "Instrument-Regular"
BODY_M = "Instrument-Medium"
BODY_SB = "Instrument-Semibold"
DATA = "Martian-Regular"
DATA_M = "Martian-Medium"


def register_fonts() -> None:
    for name, path in brand_fonts.paths().items():
        pdfmetrics.registerFont(TTFont(name, str(path)))


# --- text engine ----------------------------------------------------------


def width_of(text: str, font: str, size: float, tracking: float = 0.0) -> float:
    return pdfmetrics.stringWidth(text, font, size) + tracking * max(
        len(text) - 1, 0
    )


def wrap(text: str, font: str, size: float, max_w: float, tracking: float = 0.0):
    lines: list[str] = []
    line = ""
    for word in text.split():
        probe = f"{line} {word}".strip()
        if width_of(probe, font, size, tracking) <= max_w or not line:
            line = probe
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def draw(
    c,
    x: float,
    y: float,
    text: str,
    font: str,
    size: float,
    color=INK,
    tracking: float = 0.0,
    right: bool = False,
) -> float:
    """Draw one run of text. Tracking only works through a text object."""
    w = width_of(text, font, size, tracking)
    tx = x - w if right else x
    t = c.beginText()
    t.setTextOrigin(tx, y)
    t.setFont(font, size)
    t.setFillColor(color)
    # Tc is graphics state and survives BT/ET, so it must be set every time —
    # including to zero. Skipping it lets one tracked label spread every
    # paragraph that follows it.
    t.setCharSpace(tracking)
    t.textOut(text)
    c.drawText(t)
    return w


class Sheet:
    """A y-cursor that flows down the page and breaks when it runs out."""

    def __init__(self, path: Path, meta: dict):
        self.c = pdfcanvas.Canvas(str(path), pagesize=A4)
        self.meta = meta
        self.page = 1
        self.y = PAGE_H - M_T
        self._apply_meta()

    def _apply_meta(self) -> None:
        p = self.meta
        self.c.setTitle(f"{p['name']} — {p['role']}")
        self.c.setAuthor(p["name"])
        self.c.setSubject(p["subject"])
        self.c.setCreator("The Lockworks")
        self.c.setKeywords(p["keywords"])

    # -- page furniture --

    def footer(self) -> None:
        c = self.c
        c.setStrokeColor(RULE_SOFT)
        c.setLineWidth(0.5)
        c.line(M_L, M_B - 12, PAGE_W - M_R, M_B - 12)
        draw(c, M_L, M_B - 24, self.meta["footer_left"].upper(), DATA, 6, INK_400, 0.9)
        site_label = self.meta["site_label"]
        draw(
            c,
            (PAGE_W - width_of(site_label, DATA, 6, 0.9)) / 2,
            M_B - 24,
            site_label,
            DATA,
            6,
            INK_500,
            0.9,
        )
        draw(
            c,
            PAGE_W - M_R,
            M_B - 24,
            f"PAGE {self.page}",
            DATA,
            6,
            INK_400,
            0.9,
            right=True,
        )

    def break_page(self) -> None:
        self.footer()
        self.c.showPage()
        self.page += 1
        self.y = PAGE_H - M_T
        draw(
            self.c,
            M_L,
            self.y,
            self.meta["continued"].upper(),
            DATA,
            6.5,
            INK_400,
            1.1,
        )
        self.y -= 24

    def need(self, height: float) -> None:
        if self.y - height < M_B:
            self.break_page()

    def gap(self, h: float) -> None:
        self.y -= h

    # -- primitives --

    def rule(self, weight: float = 0.7, color=RULE) -> None:
        self.c.setStrokeColor(color)
        self.c.setLineWidth(weight)
        self.c.line(M_L, self.y, PAGE_W - M_R, self.y)

    def paragraph(
        self,
        text: str,
        font: str = BODY,
        size: float = 8.6,
        color=INK_700,
        leading: float = 12.4,
        indent: float = 0.0,
        max_w: float | None = None,
    ) -> None:
        width = (max_w if max_w is not None else COL_W) - indent
        lines = wrap(text, font, size, width)
        self.need(len(lines) * leading)
        for ln in lines:
            draw(self.c, M_L + indent, self.y, ln, font, size, color)
            self.y -= leading

    def section(self, label: str, keep: float = 56.0) -> None:
        """An engraved section heading, plus the space its opening needs.

        `keep` is how much of the section must fit under the heading for the
        break to be honest. A heading alone at the foot of a page is a lie
        about where the section starts.
        """
        self.need(keep)
        self.gap(5)
        draw(self.c, M_L, self.y, label.upper(), DATA_M, 6.8, INK_400, 2.0)
        self.y -= 9
        self.rule(0.9, RULE)
        self.gap(12)

    def bullet(self, text: str, size: float = 8.6, leading: float = 12.2) -> None:
        """A lock-gate mark, not a dot."""
        indent = 15.0
        lines = wrap(text, BODY, size, COL_W - indent)
        self.need(len(lines) * leading + 2)
        c = self.c
        c.setStrokeColor(WATER_400)
        c.setLineWidth(1.6)
        c.line(M_L, self.y + 3.1, M_L + 8, self.y + 3.1)
        for ln in lines:
            draw(c, M_L + indent, self.y, ln, BODY, size, INK_700)
            self.y -= leading


# --- sections -------------------------------------------------------------


def masthead(s: Sheet, d: dict) -> None:
    c = s.c
    profile, contact = d["profile"], d["contact"]

    # The one piece of machinery paint on page 1.
    c.setFillColor(SIGNAL)
    c.rect(M_L, s.y + 4, 34, 4.5, stroke=0, fill=1)
    s.gap(38)

    name = profile["name"].upper()
    size = 44.0
    while width_of(name, DISPLAY, size, 0.4) > COL_W and size > 20:
        size -= 0.5
    draw(c, M_L, s.y, name, DISPLAY, size, INK, 0.4)
    s.y -= size * 0.98 + 4

    draw(c, M_L, s.y, profile["roleLine"].upper(), DATA_M, 7.6, WATER_800, 1.9)
    s.y -= 17

    for ln in wrap(profile["thesis"], TITLE, 11.4, COL_W * 0.84):
        draw(c, M_L, s.y, ln, TITLE, 11.4, INK_700)
        s.y -= 14.6

    s.gap(9)
    bits = [
        contact["email"],
        profile["location"],
        "linkedin.com/in/akansh-mowar-5a83261a0",
        "github.com/akansh23-cloud",
    ]
    x = M_L
    for i, bit in enumerate(bits):
        w = width_of(bit, DATA, 7.2, 0.25)
        if x + w > PAGE_W - M_R:
            x = M_L
            s.y -= 11.5
        if x > M_L:
            c.setFillColor(SIGNAL)
            c.rect(x - 8.5, s.y + 2.2, 2.6, 2.6, stroke=0, fill=1)
        draw(c, x, s.y, bit, DATA, 7.2, INK_500, 0.25)
        x += w + 15
    s.y -= 14

    s.rule(1.4, INK)
    s.gap(4)


def summary(s: Sheet, d: dict) -> None:
    p = d["profile"]
    s.section("Summary")
    s.paragraph(p["summary"], size=8.8, leading=12.4, max_w=COL_W * 0.96)
    s.gap(3)
    s.paragraph(
        f"{p['experience']} of experience. Comfortable owning a release end to "
        "end — pipeline, image, chart, secret material, database migration and "
        f"promotion — and applying {p['practice']} to keep the runtime "
        "predictable.",
        size=8.8,
        leading=12.4,
        max_w=COL_W * 0.96,
    )
    s.gap(2)


def scale_row(s: Sheet, d: dict) -> None:
    """Three facts about three different things, kept visibly apart."""
    scale = d["scale"]
    items = [scale["services"], scale["workloads"], scale["stages"]]
    col = COL_W / 3
    c = s.c

    s.need(58)
    s.gap(4)
    s.rule(0.7, RULE_SOFT)
    s.gap(16)
    top = s.y
    lowest = top

    for i, item in enumerate(items):
        x = M_L + i * col
        draw(c, x, top, item["value"], TITLE, 15, WATER_800)
        y = top - 12.5
        text = f"{item['noun']}, {item['qualifier']}"
        for ln in wrap(text, BODY, 7.1, col - 16):
            draw(c, x, y, ln, BODY, 7.1, INK_500)
            y -= 9.4
        lowest = min(lowest, y)

    s.y = lowest - 2
    s.rule(0.7, RULE_SOFT)
    s.gap(15)


def role_block(s: Sheet, role: dict, with_scale: bool, d: dict) -> None:
    c = s.c
    s.need(76)

    draw(c, M_L, s.y, f"{role['title']} · {role['company']}", TITLE, 12.6, INK)
    meta = f"{role['period']}  ·  {role['location']}"
    draw(c, PAGE_W - M_R, s.y + 1.5, meta.upper(), DATA, 6.9, INK_400, 0.5, right=True)
    s.y -= 13

    draw(c, M_L, s.y, role["context"], BODY_M, 8.1, INK_500)
    s.y -= 6

    if with_scale:
        scale_row(s, d)
    else:
        s.gap(10)

    for w in role["work"]:
        if role["id"] == "barclays" and w.startswith("Lead modernisation"):
            # Stated in full by the Platform modernisation table below.
            continue
        s.bullet(w, leading=11.6)
        s.gap(1.2)

    if role.get("stack"):
        s.gap(5)
        stack = " · ".join(role["stack"])
        label_w = 32.0
        lines = wrap(stack, DATA, 6.6, COL_W - label_w - 9)
        s.need(len(lines) * 9.6 + 6)

        c.setFillColor(INK)
        c.rect(M_L, s.y - 1.8, label_w, 9.6, stroke=0, fill=1)
        draw(c, M_L + 3.8, s.y + 1.2, "STACK", DATA_M, 5.6, STONE_050, 1.0)

        for i, ln in enumerate(lines):
            draw(c, M_L + label_w + 9, s.y + (1.2 if i == 0 else 0), ln, DATA, 6.6, INK_500)
            s.y -= 9.6
    s.gap(6)


def experience(s: Sheet, d: dict) -> None:
    s.section("Experience")
    roles = d["roles"]
    role_block(s, roles[0], True, d)

    s.need(40)
    s.gap(2)
    s.c.setDash(2, 3)
    s.rule(0.7, RULE)
    s.c.setDash()
    s.gap(17)

    role_block(s, roles[1], False, d)


def modernisation(s: Sheet, d: dict) -> None:
    s.section("Platform modernisation", keep=132)
    c = s.c
    s.paragraph(
        "Five layers replaced under a service that had to keep running.",
        font=BODY_M,
        size=8.2,
        color=INK_500,
        leading=11,
    )
    s.gap(5)

    c_layer, c_before, c_after = 84.0, 126.0, 126.0
    x_before = M_L + c_layer
    x_after = M_L + c_layer + c_before
    x_gain = M_L + c_layer + c_before + c_after

    s.need(30)
    for x, label in (
        (M_L, "LAYER"),
        (x_before, "BEFORE"),
        (x_after, "AFTER"),
        (x_gain, "WHAT IT BOUGHT"),
    ):
        draw(c, x, s.y, label, DATA_M, 5.9, INK_400, 1.3)
    s.y -= 6
    s.rule(0.7, RULE)
    s.y -= 13

    for row in d["refit"]:
        gain_lines = wrap(row["gain"], BODY, 7.4, COL_W - c_layer - c_before - c_after)
        s.need(max(len(gain_lines) * 9.6, 11) + 12)

        draw(c, M_L, s.y, row["layer"], BODY_SB, 8.2, INK)

        bw = draw(c, x_before, s.y, row["before"], BODY, 8.2, INK_400)
        c.setStrokeColor(INK_400)
        c.setLineWidth(0.6)
        c.line(x_before, s.y + 2.9, x_before + bw, s.y + 2.9)

        c.setFillColor(SIGNAL)
        c.rect(x_after - 9, s.y + 0.6, 5, 1.5, stroke=0, fill=1)
        draw(c, x_after, s.y, row["after"], BODY_SB, 8.2, WATER_800)

        gy = s.y
        for ln in gain_lines:
            draw(c, x_gain, gy, ln, BODY, 7.4, INK_500)
            gy -= 9.6

        s.y = min(s.y - 10, gy)
        s.rule(0.5, RULE_SOFT)
        s.y -= 9


def _project_head(s: Sheet, name: str, kind: str) -> None:
    s.need(66)
    w = draw(s.c, M_L, s.y, name, TITLE, 11.4, INK)
    draw(s.c, M_L + w + 10, s.y + 1.2, kind.upper(), DATA, 6.2, INK_400, 1.2)
    s.y -= 13.5


def projects(s: Sheet, d: dict) -> None:
    s.section("Projects")

    m = d["mapProject"]
    _project_head(s, m["name"], m["kind"])
    s.paragraph(m["premise"], size=8.4, leading=11.4)
    s.gap(3)
    for p in m["principles"]:
        s.bullet(p, size=8.2, leading=11.2)
        s.gap(0.8)
    s.gap(5)
    s.paragraph(
        "Stack — " + " · ".join(m["stack"]),
        font=DATA,
        size=6.6,
        color=INK_500,
        leading=9.6,
    )

    s.gap(10)
    s.c.setDash(2, 3)
    s.rule(0.7, RULE)
    s.c.setDash()
    s.gap(15)

    cp = d["careerProject"]
    _project_head(s, cp["name"], cp["kind"])
    s.paragraph(cp["premise"], size=8.4, leading=11.4)
    s.gap(3)

    n = cp["serviceCount"]
    for line in [
        f"{n}-service architecture extracted from a monolith one service at a "
        "time, in a monorepo with per-service Dockerfiles and multi-stage "
        "Docker builds.",
        "Per-service build, test and deploy driven by path-based change "
        "detection, so only what changed is rebuilt.",
        "API Gateway routing in front of the services. " + cp["fallback"],
    ]:
        s.bullet(line, size=8.2, leading=11.2)
        s.gap(0.8)

    s.gap(5)
    s.paragraph(
        "Stack — " + " · ".join(cp["stack"]),
        font=DATA,
        size=6.6,
        color=INK_500,
        leading=9.6,
    )
    s.gap(2)
    s.paragraph(cp["serviceNote"], font=BODY, size=7.2, color=INK_400, leading=9.8)


def skills(s: Sheet, d: dict) -> None:
    s.section("Technical skills", keep=96)
    c = s.c
    # The gutter is sized to the longest label, not guessed.
    label_w = max(
        width_of(g["label"].upper(), DATA_M, 6.1, 1.1) for g in d["skillGroups"]
    ) + 14

    for g in d["skillGroups"]:
        lines = wrap(" · ".join(g["items"]), BODY, 7.9, COL_W - label_w - 10)
        s.need(len(lines) * 9.9 + 11)

        draw(c, M_L, s.y, g["label"].upper(), DATA_M, 6.1, INK_400, 1.1)

        y = s.y
        for ln in lines:
            draw(c, M_L + label_w + 10, y, ln, BODY, 7.9, INK_700)
            y -= 9.9

        s.y = min(s.y - 9.9, y) - 1
        s.rule(0.5, RULE_SOFT)
        s.y -= 7


def education(s: Sheet, d: dict) -> None:
    """
    Education. Restored — a résumé without a degree section is discarded by a
    fair number of parsers before a human ever sees it.
    """
    rows = d.get("education") or []
    if not rows:
        return

    s.section("Education", keep=len(rows) * 46 + 24)
    c = s.c

    for e in rows:
        s.need(46)
        draw(c, M_L, s.y, e["degree"], BODY_SB, 9.2, INK)
        draw(
            c,
            PAGE_W - M_R,
            s.y + 0.4,
            e["period"].upper(),
            DATA,
            6.4,
            INK_400,
            1.1,
            right=True,
        )
        s.y -= 12
        draw(c, M_L, s.y, e["institution"], BODY, 8.2, INK_700)
        draw(
            c,
            PAGE_W - M_R,
            s.y,
            e["location"],
            BODY,
            7.6,
            INK_500,
            right=True,
        )
        s.y -= 11
        draw(c, M_L, s.y, f"Specialisation: {e['field']}", BODY, 7.8, INK_500)
        s.y -= 11
        s.rule(0.5, RULE_SOFT)
        s.y -= 9


def certifications(s: Sheet, d: dict) -> None:
    prep = d["preparationCredentials"]
    block = len(d["completedCredentials"]) * 19 + (24 if prep else 0) + 28
    s.section("Certifications", keep=block)
    c = s.c
    for cred in d["completedCredentials"]:
        s.need(22)
        name = f"{cred['code']} — {cred['name']}" if cred.get("code") else cred["name"]
        c.setFillColor(SIGNAL)
        c.circle(M_L + 3, s.y + 3, 3, stroke=0, fill=1)
        draw(c, M_L + 14, s.y, name, BODY_SB, 8.4, INK)
        draw(
            c,
            PAGE_W - M_R,
            s.y + 0.6,
            cred["issuer"].upper(),
            DATA,
            6.4,
            INK_400,
            1.1,
            right=True,
        )
        s.y -= 10
        s.rule(0.5, RULE_SOFT)
        s.y -= 9

    if prep:
        listed = ", ".join(
            f"{p['code']} ({p['issuer']})" if p.get("code") else p["name"] for p in prep
        )
        s.gap(3)
        s.paragraph(
            f"In preparation, not certified: {listed}.",
            font=BODY,
            size=7.4,
            color=INK_400,
            leading=10,
        )


# --- entry ----------------------------------------------------------------


def main() -> None:
    snapshot = SCRIPTS / ".content.json"
    if not snapshot.exists():
        raise SystemExit(
            "Missing scripts/.content.json — run:\n"
            "  node --experimental-strip-types scripts/export-content.mjs"
        )
    d = json.loads(snapshot.read_text())
    register_fonts()

    profile = d["profile"]
    meta = {
        "name": profile["name"],
        "role": profile["roleLine"],
        "subject": profile["summary"],
        "keywords": (
            "DevOps Engineer, Platform Engineer, Cloud Engineer, Kubernetes, "
            "OpenShift, Helm, GitLab CI/CD, Docker, Terraform, Argo CD, AWS, "
            "Azure, Pune"
        ),
        "footer_left": profile["name"],
        "continued": f"{profile['name']} — continued",
        # Only print a domain that was actually configured. An unconfigured
        # build prints the résumé route instead of guessing an origin.
        "site_label": (
            d["site"]["url"].replace("https://", "").replace("http://", "")
            if d["site"].get("originConfigured")
            else "RESUME"
        ),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    s = Sheet(OUT, meta)

    masthead(s, d)
    summary(s, d)
    experience(s, d)
    education(s, d)
    certifications(s, d)
    modernisation(s, d)
    projects(s, d)
    skills(s, d)

    s.footer()
    s.c.save()

    print(
        f"{OUT.relative_to(ROOT)}  ·  {s.page} pages  ·  "
        f"{OUT.stat().st_size / 1024:.0f} KB"
    )


if __name__ == "__main__":
    main()
