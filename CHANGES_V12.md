# V12 — THE FIRST SCREEN IS THE PROOF

Built on V11. V11 fixed what two recordings showed was broken; V12 is the
five structural moves that decide whether the site lands, plus a polish pass
on light and surfaces.

## 1. The first interaction runs the release

`plates/Headwater.tsx`

"Run a release" is now the primary action in the hero. One press launches the
run, travels the page to Plate 02, and sends the Flight the same
`release:run` command the console uses — so the hero button, the Flight's own
button and `deploy` in the console are one code path. A recruiter sees the
pipeline, a gate and a recovery inside fifteen seconds, without finding
anything in the bar.

## 2. The operating environment is cut in half on screen

`system/SystemStrip.tsx`, `globals.css`

The four instruments — X‑Ray, sound, tour, console — sit behind one **Lab**
switch. The bar a first-time reader sees has four things on it, not ten. The
instruments stay open while any of them is in use, and every keyboard route
(X, Cmd/Ctrl+K) is unchanged. The fixed pressure spine (`body::after`) is
gone; the pressure needle in the bar carries the same reading.

## 3. Evidence that is fetched, not typed

`scripts/fetch-evidence.mjs`, `content/evidence-live.json`,
`components/LiveEvidence.tsx`, `plates/Basin.tsx`, `plates/Split.tsx`,
`plates/Vault.tsx`, `content/evidence.ts`, `.github/workflows/quality.yml`

`npm run evidence` (now the first step of `prebuild`) reads the two public
project repositories and this site's repository from the GitHub API and
writes last push, last CI run and its conclusion, stars and open issues to
`evidence-live.json`. `LiveEvidence` renders those readings under the Code
line on the Basin and the Split and inside the matching Vault cards, stamped
"Verified <date>".

Rules, in the spirit of the accuracy contract:

- Nothing is typed by hand. If the fetch fails, the UI says
  "Live status not fetched in this build" — it never shows a stale or
  guessed number. The committed JSON is the empty state.
- A fetch failure never breaks a local or PR build. On `main` the workflow
  sets `EVIDENCE_STRICT=1`, so production cannot ship without fresh evidence.
- `GITHUB_TOKEN` is optional and only raises the rate limit.

A ninth Vault card, **site**, claims what this repository can prove about
itself: the build gate, the fetched evidence, and the performance budget.

## 4. The plates stand on one water

`components/WaterBand.tsx`, `components/Plate.tsx`, `app/page.tsx`

Basin, Split, Gauge House and The Watch now stand on a water band drawn with
the same periodic surfaces as the Headwater — three layers, one-directional,
seamless, compositor-only. The run tints it: drift in the Basin, a service
down in the Split, critical telemetry in Gauge House, a degraded phase in The
Watch, all from attributes the journey already writes on `<html>`. Together
with V11's Flight and gauges, the nine plates now read as one drawing set.

## 5. Performance is a plate

`app/page.tsx`, `components/Plate.module.css`, `lighthouserc.json`,
`.github/workflows/quality.yml`

- Everything below the Flight is code-split with `next/dynamic` (still
  server-rendered; only the client chunk arrives late).
- Plates carry `content-visibility: auto` with a remembered intrinsic size,
  so off-screen chapters are neither laid out nor painted.
- A **budget** job runs Lighthouse CI against the built site on every push:
  performance ≥ 0.90, accessibility ≥ 0.95, LCP ≤ 2.0 s, CLS ≤ 0.05,
  TBT ≤ 200 ms. The thresholds are committed in `lighthouserc.json`; the
  Vault's site card points at them.

## Polish

- Light: `--surface`, `--edge-hi` and `--shadow-raised` tokens — a top-edge
  highlight and a soft shadow — applied to `.card`, the Operation strip, the
  role card, Vault drawers, gauge cards, hero stats and the operator bar
  (now glass with a highlight edge). The page has a sky: a shade lighter at
  the top, settling to ground over the first viewport.
- The Operation strip's **Continue** now composes the shared `.ctl` control.
- **One stylesheet.** `v7.css` → `v10.css`, `hydraulics.css`,
  `performance.css` and `mobile.css` are folded into `globals.css` in their
  original import order, so the cascade is byte-for-byte unchanged. Sections
  are marked with the file they came from. The next pass merges each section
  into tokens or the owning module; there is now one place to do it from.

## Not run here

Same as V11: no package install and no browser in the environment this was
built in. Before deploying:

```
npm ci
npm run ci
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

Things most likely to need a touch:

- `tests/e2e/v7.spec.ts` / `v8.spec.ts` if they look for the X‑Ray, sound,
  tour or console buttons by label — they are now behind **Lab**.
- `scripts/source-audit.mjs` if it does not recognise `import()` inside
  `next/dynamic` calls in `page.tsx`.
- `tests/content.test.ts` — the new `site` evidence card follows every rule
  the suite enforces, but the suite is the judge.

---

# V12.1 — CORRECTIONS FROM THE V12 SCREENSHOTS

Five regressions the V12 preview showed, with their causes.

1. **"Run a release" rendered black.** A hero rule that gave the link
   buttons solid ground (`.actions .ctl { background: … }`) had the same
   specificity as the shared `.ctl[data-primary]` and loaded later, so it
   erased the yellow fill and left void-on-void text. The ground rule is
   now `.ctl:not([data-primary])`.

2. **Water on the thesis text.** The V12 level (0.60 of the hero's height)
   depended on the hero's height, which changes with every viewport. The
   water is now a band of fixed height anchored to the foot of the chamber,
   with the surface a fixed distance above the route. It cannot reach the
   masthead. Scroll travel reduced so the surface never climbs into the
   text while the hero leaves.

3. **Capsule lag and wrong seating.** The capsule kept a stored copy of its
   dock's page coordinates and decided from that whether it was on screen;
   the copy went stale when the Flight token climbed or the layout above
   changed, and every scroll event snapped the target back to the stale copy
   one frame before the paint corrected it — visible as flicker and lag.
   There is no stored copy any more: seating and position both read the
   dock's live rectangle (one read per scroll frame; one per paint frame
   while seated).

4. **Flight controls could not see the drawing.** V12 put the drawing on
   its own full-width row above the controls, so pressing Run or arming a
   fault scrolled the chambers out of view. Restored to controls-beside-
   drawing, with the drawing as the wide column and `position: sticky` so
   it stays in view while the log grows; on phones the ladder sits directly
   above the controls. The hero's Run lands centred on the drawing itself.
   The duplicate "What you are doing" copy is gone.

5. **Refit grip covered the rows.** The V12 clamp kept the grip inside the
   frame but put it on top of the first column at the start of travel. The
   frame now has gutters either side of the rows, so the grip's whole travel
   is in clear space.

6. **Trace pulse out of sync with the readout.** Pre-existing: the pulse
   rode a spring toward its target (slow to leave, fast in the middle) while
   the station readout fired on linear timers, so the two agreed only at the
   ends. Both now use the same wall clock.

7. **Performance.** Removed the things V12 added that cost paint on every
   scroll: `backdrop-filter` blur on the operator bar and on every plate's
   title block; `content-visibility: auto` on plates; blur on the hero
   stats; the water band's third layer. The sticky title block is gone (it
   also floated over its own chapter title). The Cloud Ops beacon moved to
   the bottom-left, off the Flight's Promote chamber.

## Verified here

No browser and no package registry in this environment. What was checked:

- `tsc` (global 6.0, `--strict --isolatedModules`) over the twenty edited
  TS/TSX files: no syntax or structural errors. The only diagnostics are
  unresolved packages, which is expected without `node_modules`.
- Every `styles.x` reference in every TSX resolves to a class in its module
  (41 CSS files, all brace-balanced; no `:global` in the plain sheet).
- E2E selectors that touch changed UI (`Run a release` scoped to `#flight`,
  the Cloud Ops launcher, capsule visibility) still resolve.

What was **not** checked: the rendered result. Run `npm ci && npm run ci`
and the Playwright suite before merging, and please send a recording.
