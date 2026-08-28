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
