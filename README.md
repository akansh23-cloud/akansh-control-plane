# The Lockworks

Personal engineering portfolio for **Akansh Mowar** — DevOps / Platform / Cloud
Engineer, Pune, India.

Built with Next.js 16, React 19 and TypeScript. No UI framework, no animation
library, no WebGL. Every drawing on the site is hand-built SVG driven by a
single animation runtime.

**Nothing on this site renders React on a frame boundary.** Motion lives in
`src/lib/runtime.ts`, which owns one `requestAnimationFrame` loop for the whole
document and writes per-frame values straight onto DOM nodes. React holds
semantic state only. See [MOTION.md](./MOTION.md) for the full rationale, the
motion families and the rules for adding to it.

## The build gate

`npm run build` cannot ship a factual regression. `prebuild` runs, in order:

```
evidence  →  typecheck  →  vitest (accuracy tests)  →  asset freshness
```

`evidence` (`scripts/fetch-evidence.mjs`) reads the public repositories from
the GitHub API and writes `src/content/evidence-live.json`, which the Basin,
the Split and the Vault render as "Verified <date>" readings. It never
invents a value: with no network the UI says so. Set `EVIDENCE_STRICT=1` in
the production pipeline so a release cannot ship without fresh evidence.
CI also runs a Lighthouse budget (`lighthouserc.json`) against the built
site on every push.

The asset gate (`scripts/check-assets.mjs`) hashes the content layer and every
generator, and refuses the build if the résumé PDF or the Open Graph image were
generated from different facts than the site is about to serve. Change a fact
without running `npm run assets` and the build stops.

```
npm run assets       regenerate PDF + OG + icons, then record the hash
npm run assets:check verify freshness without regenerating
npm run ci           typecheck + test + assets + build
npm run verify:prod  check a running deployment (see below)
```

---

## The idea

Most engineering portfolios reach for the same metaphors: a terminal, a matrix,
a fake dashboard, a grid of logos. This one is a **civil engineering drawing
set for a flight of canal locks**, because that metaphor happens to be
structurally true rather than decorative:

| The works | The engineering |
| --- | --- |
| A chamber | A pipeline stage |
| A gate that will not open | A security or approval gate |
| Raising the water level | Promotion between environments |
| The keeper closing a sluice the river reopened | GitOps reconciliation |
| A barge splitting into a flotilla, traffic never stopping | Monolith decomposition behind a gateway |
| Staff gauges cut into the wall | Observability signals |
| Rebuilding the works with water still in them | Platform modernisation |
| The tideway | Production |

The site is nine numbered plates, and the numbering carries information: it is
the order in which software travels from source to sea.

| Plate | Name | What it is |
| --- | --- | --- |
| 01 | Headwater | Identity. Drag the sluice; the water rises and the name is cut by the waterline — ink above it, chalk below. |
| 02 | The Flight | Release engineering at Barclays. Send a release up nine chambers. Arm a fault and watch a gate refuse it. |
| 03 | The Refit | Modernisation. Drive a refit front across five layers; each one swaps whole in place, and no word is ever cut. |
| 04 | The Basin | Migration Assurance Platform. Four views of one site; make the cluster drift and watch Argo CD pull it back. |
| 05 | The Split | Career Autopilot. Extract services one at a time; take one out of service and watch the gateway fall back. |
| 06 | Gauge House | Observability as relationships. Raise the load and see which signal moves first, and what each one makes move next. |
| 07 | The Watch | The incident room. Read four signals, call it, and find out why readiness had already contained the fault. |
| 08 | The Vault | Every strong claim, opened up: claim, context, what I did, stack, and what a reader can check. |
| 09 | Tidewater | Certifications as lit beacons, and contact. |

### Two readers, one application

A recruiter with sixty seconds and an engineer who wants to know whether the
person behind this can build things are both served by the same markup. The
depth switch in the persistent bar sets one attribute on the document element;
recruiter depth folds the simulations away and opens a gathered brief plus a
two-line summary under every chapter. Nothing is duplicated, no fact exists in
one depth and not the other, and the server renders the engineer view, so
nothing is hidden on arrival.

### Design system

Deliberately not dark-mode-and-cyan, and deliberately not Inter — but it is
dark. The second build inverted the original stone-paper drawing set: the
ground is wet graphite, the type is bone, water is the only cool colour and
machinery yellow the only warm one. The tokens live in `src/app/globals.css`.

- **Ground** — graphite (`#070D0F` → `#142A2F`), with paper grain on desktop.
- **Ink** — bone (`#F2EFE6` → `#7E9396`). Small print is never below 4.5:1.
- **Water** — cold teal (`#08272E` → `#8FCBD4`).
- **One accent** — machinery yellow `#F0BE3A`, the colour lock gear is painted.
- **Type** — Bricolage Grotesque Variable (display, width axis), Instrument
  Sans Variable (body), Martian Mono Variable (data and engraved labels). All
  self-hosted; nothing is fetched from Google.
- **Motion** — three easings that mean different things: `--ease-water` for
  anything settling under gravity, `--ease-gear` for machinery,
  `--ease-release` for the moment a gate lets go. See `MOTION.md`.

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Node 20.9+ is required (Node 22 recommended — the asset scripts use its
TypeScript stripping). Python 3.11+ is only needed if you want to regenerate
the PDF and images.

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run audit:source` | Dependency-free local-import + CSS-module integrity check |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Accuracy test suite (vitest) |
| `npm run test:e2e` | End-to-end suite (Playwright, six projects) |
| `npm run assets` | Regenerate the résumé PDF, OG image and icons |
| `npm run verify:prod` | Check a live deployment |
| `npm run ci` | Lint + source audit + typecheck + factual tests + asset freshness + production build |

---

## How it is put together

```
src/
  app/
    layout.tsx          metadata, JSON-LD, self-hosted fonts, skip link
    page.tsx            composes the nine plates
    globals.css         the whole token system
    resume/             the HTML résumé
    not-found.tsx       404, as a chamber with no water in it
    robots.ts sitemap.ts
  components/
    Plate.tsx           the numbered chapter frame
    Legend.tsx          the key plate — nav, the recruiter fast path, depth switch
    Waterway.tsx        the route: one channel, six stations, measured from layout
    Brief.tsx           the sixty-second brief, revealed in recruiter depth
    plates/             the nine drawings
  content/              ← every fact on the site lives here, and only here
  lib/
    motion.ts           reduced-motion aware hooks, drag, convergence, ticker
    geometry.ts         water paths, arrows, elbows, dimension lines
scripts/
  export-content.mjs    content layer → JSON, for the Python builders
  brand_fonts.py        woff2 → static TTF instances
  build_pdf.py          the résumé PDF
  build_images.py       og.png, icon.svg, favicon.ico, apple-icon.png
  verify-production.mjs deployment checks
tests/
  content.test.ts       the accuracy contract
  e2e/portfolio.spec.ts the behaviour contract
```

### One source of truth

`src/content/` is the only place a fact is written down. The plates render from
it, the HTML résumé renders from it, and the PDF and OG image are generated
from a JSON export of it. A number cannot be right in one place and stale in
another, because there is only one place.

### The accuracy contract

The brief was explicit about what may and may not be claimed. Those rules are
not comments — they are 48 assertions in `tests/content.test.ts`, and the suite
fails the build if any of them is ever broken:

- **Certifications.** AZ-104, AZ-900 and AWS Cloud Practitioner are held. AWS
  Certified Solutions Architect appears nowhere in the source. CKAD may only
  ever be rendered with `status: 'preparation'`, and the UI must say
  "not certified".
- **Scale.** *50+ independently deployable microservices*, *30+ standardised
  containerised workloads* and *20+ pipeline stages* are three facts about
  three different things. Tests fail if they are ever merged into one sentence.
- **Architecture.** MAP's diagram renders from a typed graph with an explicit
  `mapForbiddenEdges` list. Terraform can only ever carry `provision` edges,
  Argo CD only `control` edges, and the load balancer can never sit between ECR
  and EKS — the relationships the brief forbids are structurally impossible to
  draw, not merely avoided.
- **Project boundaries.** Career Autopilot never claims EKS, Terraform, Argo CD
  or GitOps; the test reads `Split.tsx` directly, because a false claim can be
  made in prose as easily as in data.
- **No invented numbers.** No percentage improvements, no availability figures,
  no money saved, no awards.
- **Confidentiality.** Nothing describes Barclays' internal architecture — only
  the engineering practice and the public technology names.

Simulated drawings say so on the plate. The observability gauges are a stated
model driven by a slider, not a measurement.

---

## Accessibility and motion

- Every interactive drawing has a real accessible control: sliders expose
  `role="slider"` with live `aria-valuenow` and full keyboard support including
  Home/End; the flight is also a plain ordered list of stages; the refit has a
  before/after table underneath it.
- Security gates are marked by hatching **and** the word `GATE`, never by
  colour alone.
- `prefers-reduced-motion` does not disable the drawings. The water still
  fills, gates still open, Argo CD still reconciles — instantly and in one
  step, rather than animating. The Playwright `reduced-motion` project asserts
  both halves of that: things still work, and nothing animates for longer than
  a frame.
- Skip link, single `h1`, visible focus styling, and `rel="noopener"` on every
  external link.

---

## Deploying to Vercel

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project**, import the repository. The framework is
   detected automatically; no build settings need changing.
3. **Set `NEXT_PUBLIC_SITE_URL` to the real production domain** before the
   first production build — for example `https://akanshmowar.com`. This is not
   optional: it is what canonical URLs, `sitemap.xml`, the OG image URL and the
   JSON-LD `url` are built from.

   There is no correct default, so there is no permanent one. When the variable
   is unset the site still builds and works, but nothing *generated* prints a
   domain it cannot vouch for: the OG artwork carries `THE LOCKWORKS` and the
   résumé footer carries `RESUME` instead of a guessed address. A wrong URL
   burned into a shared social image is worse than no URL at all.

   Regenerate the assets after setting it:
   ```bash
   NEXT_PUBLIC_SITE_URL=https://your-domain npm run assets
   ```
   > Never set it to a `*.vercel.app` preview URL. Preview deployments are
   > protected, so a canonical pointing at one is unreachable to crawlers and
   > to anyone you send the link to.
4. Add the custom domain under **Settings → Domains** and let Vercel issue the
   certificate.
5. Verify the live site:
   ```bash
   npm run verify:prod -- https://akanshmowar.com
   ```
   This checks the routes, that the PDF is served as `application/pdf` and is
   not a placeholder, that the canonical matches the origin it is served from,
   that `robots.txt` and `sitemap.xml` are correct, and — against the rendered
   HTML rather than the source — that none of the accuracy rules were broken in
   the build.

### Regenerating the résumé PDF

The PDF at `public/Akansh_Mowar_DevOps_Platform_Engineer_Resume.pdf` is
committed, so a normal deploy needs nothing extra. Rebuild it after editing
anything in `src/content/`:

```bash
pip install reportlab pillow fonttools brotli
npm run assets
```

It is real, selectable text in a single column with standard section headings,
so an ASO or ATS parser can read it. `next.config.ts` pins the response headers
so it is served inline as `application/pdf` rather than downloaded as an
unknown blob.

---

## Final studio-pass verification

The final studio pass completes the source-level items that were previously
left open: all seven tablet compositions, a datum-fed continuous waterway,
concept-native pointer inspection across every plate, local pointer disturbance
in the hydraulic scenes, refined Headwater machinery/refraction, and the
Refit/Basin/Split/Tidewater choreography described in `CHANGES.md`.

This checkout also includes `.github/workflows/quality.yml`. On a normal
networked runner it installs Chromium/WebKit and executes the quality and E2E
gates automatically.

The sandbox used for the final studio pass had Chromium available but could not
reach the npm registry, so dependencies could not be installed after the edits.
Fresh source parsing, CSS-module/import auditing, CSS structural checks, asset
freshness, resume checksum validation and OG generation were executed here;
fresh lint/typecheck/Vitest/Next-build/Lighthouse/Playwright results are **not**
claimed. Run before production:

```bash
npm ci
npm run ci
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

The site has not been deployed from this package. Set the real
`NEXT_PUBLIC_SITE_URL` before production, regenerate the generated assets if
you want that final domain printed into them, and run `npm run verify:prod -- https://your-domain` after deployment.
