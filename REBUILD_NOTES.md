# THE WORKS — second build

The four screenshots in `QA_REFERENCE_CURRENT_FAILURE/` are the rejected
build. They are kept as evidence, not as reference. `qa/` holds the new
captures, taken from a real browser against a production build.

## What was actually wrong

The first build had a good content layer and a good animation runtime bolted
to a broken layout primitive. Every chapter was a fixed-geometry drawing
inside a full-height canvas, so a small diagram sat at the top of a very large
box. That single decision produced almost every symptom in the rejection:
the empty screens, the 8px labels, the wireframe look, the unreachable
information.

So the layout primitive was replaced, not patched.

## Creative direction

**Ground.** The palette is inverted. Wet graphite instead of stone paper, bone
type, water as the only cool colour and machinery yellow as the only warm one.
This fixed the contrast complaints on its own and it photographs like a
product rather than a worksheet.

**Height is earned.** `Plate` has no height of its own. There is no `100vh`,
no `min-height`, and no fixed `viewBox` driving a layout anywhere in the
application. A section is as tall as its contents.

**Typography has a floor, not just a ceiling.** Body copy starts at 16px on a
390px screen instead of arriving there after a clamp. Nothing carrying meaning
renders below 12px. Mono is seasoning — labels and readouts, never paragraphs.

**Diagrams are typeset, not scaled.** In the architecture plate the nodes are
DOM elements on a CSS grid and the edges are measured from where the browser
actually put them. There are no hard-coded coordinates, so it is correct at
360px and at 1920px, and the labels are real text at real sizes.

**The metaphor survives as language and motion, not as furniture.** The canal
lock is still there in the water, the gates and the level — but it is no
longer the container the portfolio has to fit inside.

## Signature moments

1. **The release flight.** Nine chambers fill with water as a release climbs.
   Break it at any of three real gates: a critical CVE holds the image gate
   and the release never reaches a cluster; a schema migration holds before
   deployment rather than half-applying; a readiness probe failure rolls back
   with the previous release still serving. Each has a fix, and applying it
   opens the gate.
2. **The refit.** One seam wipes across all five layers at once, so Jenkins
   becomes GitLab in the same physical position instead of in a second list.
3. **GitOps drift.** Edit the cluster by hand and it visibly peels off the
   outline Git is still holding, arrows stretching with it. Reconcile pulls it
   back. The same two numbers drive the CSS transform and the edge geometry,
   so the arrows cannot lie about where the cluster went.

## Mobile

Designed at 390px first, then adapted upward — not the reverse.

- The hero is a header. Name, role, employer, dates, tenure, thesis and four
  routes out are all in the first screen.
- Controls are 46px minimum, enforced in one place (`.ctl`) so they cannot
  drift small again.
- The flight is a vertical stack of chambers filling left to right; on tablet
  and desktop the same data becomes a rising staircase filling bottom to top.
- Fault buttons collapse to a three-across row with short labels and full
  accessible names.
- Reference cards follow the interaction they annotate on a phone, and sit
  beside the title on wider screens.
- `touch-action: none` is claimed by drag handles only, never by a panel, so
  the page always scrolls under a thumb.
- The index bar is permanent: current section, résumé and email always one tap
  away, with `body` padding and `scroll-padding-bottom` so it never covers
  content.

## Verified, by running it

```
npm ci                 395 packages
npm run lint           clean
npm run audit:source   clean, 27 files
npm run typecheck      clean
npm run test           75 passed
npm run assets         résumé PDF (2pp, selectable) + OG image regenerated
npm run assets:check   clean
npm run build          clean
npm run qa:shots       6 viewports, 0 overflow, 0 console errors
```

No factual test was relaxed. The three scale facts remain three facts, CKAD
remains preparation and is labelled "not certified", the certification Akansh
does not hold appears nowhere, Career Autopilot claims none of the
Migration Assurance Platform's infrastructure, and the asset freshness gate
blocked the build until the PDF was regenerated from the changed content —
which is exactly what it is for.

## Remaining limitations

- **Playwright's browser CDN is unreachable from the build environment.** The
  captures were taken with a Chromium binary sourced separately;
  `scripts/screenshots.mjs` honours a `CHROMIUM` environment variable for this
  reason. `npm run test:e2e` has not been run here.
- **"Certificates" wraps as "Certificat / es"** in the desktop staircase
  between roughly 1180px and 1400px, where nine columns leave about 85px of
  measure. Legible, but not right.
- **No Lighthouse or real-device profiling.** Performance work was structural
  (one shared rAF loop, per-frame writes as CSS variables, rigs gated on
  intersection, device-tiered surface resolution) and is not measured here.
- **`NEXT_PUBLIC_SITE_URL` is still unset**, so the canonical origin is a
  placeholder and generated artefacts deliberately print no domain.
