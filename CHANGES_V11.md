# V11 — WHAT THE RECORDINGS SHOWED

Built on V10. This pass was driven by two screen recordings (desktop, 2416px;
phone, 1080×2400) rather than by a brief, and every change below answers
something visible in them.

## The capsule now travels

`ReleaseCapsule.tsx`

- **It follows a moving dock.** The Flight's dock climbs the chambers via
  `--flow` every frame, but the capsule only re-measured its dock on resize,
  so it sat at chamber 01 for the whole run. While seated, the capsule's rig
  now keeps its clock on and reads the dock's live rectangle in its paint
  callback (one `getBoundingClientRect` per frame, only while seated).
- **It stops flapping at the edge.** Seating still requires the whole dock on
  screen, but a seated capsule now stays with its dock until the dock is
  1.2× its own height past the viewport edge. Scroll syncing is throttled to
  one check per animation frame.
- **Phones and tablets get the capsule.** `mobile.css` no longer hides it
  below 1180px, and every plate on every viewport can dock it. Phone scale is
  folded into the capsule's own transform (`--cap-scale`) instead of the
  `scale` property, which was composing after the translate and drifting the
  capsule ~26px off its dock.
- **Every plate has a dock.** Refit and Vault gained docks (`page.tsx`,
  `lib/capsule.ts`), so the capsule is never homeless and never parks over a
  paragraph.

## Headwater

`plates/Headwater.tsx`, `Headwater.module.css`, `HeadwaterMotion.module.css`,
`lib/geometry.ts`

- **Water in the first viewport.** `BASE_LEVEL` 0.79 → 0.60. The surface now
  sits under the masthead on every desktop; it used to be below the fold.
- **The water flows.** Every surface is now a `periodicSurface()` — exactly
  periodic in one wavelength — and each layer is translated by one
  wavelength with a linear, infinite, one-directional animation. The loop is
  seamless and never reverses (the old `alternate` keyframes visibly stopped
  and turned around every 6–10 s). Three layers at three speeds give the
  surface depth; the fill breathes on a separate phase-offset animation.
- **The right half is no longer an empty tank.** On ≥720px the three
  headline numbers stand stacked in the right column; the Now/Since/
  Experience facts move under the actions as a three-up row.
- **Nothing textual is submerged.** Actions and stats carry their own ground.
- **All six route stations show on phones**, alternating over two rows,
  instead of three of them being hidden.
- Name scale: `clamp(3.5rem, 1.6rem + 10.5vw, 12rem)` desktop,
  `clamp(3.4rem, 19vw, 5rem)` phones.

## Plates

- **Flight** — the drawing takes the full width on its own row; operator and
  context sit beneath it. Was a 425px-wide staircase squeezed between two
  text columns on a 2400px screen. The stage scale note wraps instead of
  truncating.
- **Refit** — the grip is clamped inside the frame (it hung half outside
  the overflow at seam = 0 and read as a 2px tick), is larger, and carries
  ◂ ▸ so it reads as draggable. The table caption no longer collapses to one
  word per line on phones.
- **Gauge House** — the four gauges are drawn as staff gauges: a vertical
  tube with engraved ticks and a level line, filled from the bottom. CSS
  only; the same `--v` drives it.
- **Split → Trace** — the route drawing keeps a legible 720px width on
  phones and scrolls sideways.
- **Every plate** — a title block instead of a breadcrumb: the plate number
  at display size in machinery yellow, sticky while the chapter scrolls.
  Simulation notices are stamped `MODEL · NOT LIVE DATA` with the full
  sentence beside the stamp.

## Chrome and pacing

- The floating Cloud Ops beacon is not drawn below 1180px (it covered
  headings and stole taps on phones). The incident room is reached from a
  card in Tidewater on every viewport; desktop keeps the beacon.
- Opening: 5.4 s → 2.6 s, same eight beats.
- Finale: the receipt arrives at 160 ms instead of after a 1.4 s black gap.
- Inter-plate band tightened (`--band` max 112 → 72px; 62 → 56 at laptop).
- `--muted-2` `#6E8285` → `#7E9396` (small print on panels was 4.2:1).
- Viewport `colorScheme` corrected to `dark` to match the CSS.
- Cloud Ops topology: AZ-A / AZ-B zones moved out from under PAYMENTS and
  KAFKA.

## Removed

- The `[data-reveal='out']` entrance choreography in `globals.css` and the
  `performance.css` rule that targeted it. `useReveal` sets `'in'` on mount
  and animates with WAAPI; `'out'` never occurred, so this was dead CSS.

## Not run here

This pass was made without a package install or a browser: no `tsc`, no
`next build`, no Playwright. Before deploying:

```
npm ci
npm run ci
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

Places to look first if something fails: `ReleaseCapsule.tsx` (the paint
callback now depends on `dockElement`), `Headwater.tsx` (imports
`periodicSurface`), and the `tests/e2e/v7.spec.ts` / `v8.spec.ts` suites if
they assert the old capsule visibility on tablet.
