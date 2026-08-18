# Sixth pass — what changed and why

Six things were asked for. Three of them turned out to have the same root
cause, which is the most useful thing in this document, so it is first.

---

## The defect behind the two headline complaints

**The Refit seam cropped text inside words, and control labels were cut in
half.** These looked like two unrelated visual bugs. They were both about
measuring text and then hiding the parts that did not fit.

### The seam

The old Refit wiped a `clip-path: inset()` across the words themselves. At
seam 0.5, `GitLab CI/CD` was rendered as `Git` next to `b CI/CD`. A comparison
that cannot be read is not a comparison, so the mechanism was replaced rather
than tuned.

The seam is now a **refit front**. Each of the five layers has its own
crossover window, staggered so the front passes through them in sequence:

```css
--t: clamp(0, calc((var(--seam) - var(--a)) / var(--span)), 1);
```

That single declaration is the whole sequencing mechanism. Both states are
complete cards stacked in one grid cell; the old plant lifts out and the
replacement seats into the same position, with a scaffolding hatch that peaks
mid-swap. A layer is only ever standing, being changed, or rebuilt, and in
every one of those states both names are whole words.

The marks on the cards are now honest about time: the old plant reads
`In service` until the front reaches it, then `Coming out`, then `Removed`;
the replacement reads `Planned`, `Going in`, `In service`.

`BEFORE` and `AFTER` are no longer a second control that can drift out of
agreement with the seam. Both the buttons and the drawing read the same row
thresholds, so the buttons cannot show a state the drawing is not in — and
part way through, neither is pressed, because neither is true.

I tried an always-visible ghost of the replacement to fill the right of the
plate at seam 0. It double-exposed the two names on top of each other, which
is the same unreadability by another route, so it was removed. The outcome
column carries that space instead.

### The controls

The real cause was not styling. **CSS Modules localises every bare class
selector**, so `.views .ctl`, `.sync .ctl`, `.remedy .ctl`, `.actions .ctl`,
`.presets .ctl` and `.faults .ctl-row` were compiling to hashed names that
matched nothing. Those rules had never applied, in any build. The intended
12px padding was never there, so `Verification` and `Infrastructure` were
laid out with 22px of padding they were never meant to have and then clipped
by `overflow: hidden`.

Fixed by wrapping them in `:global()` across nine module files. `.ctl` itself
is now content-aware: 46px is a floor rather than a fixed height, labels wrap
and reflow, and nothing truncates.

Two more measurement bugs fell out of the same investigation:

- `.ctl::before` slid its water fill in with `translateY(101%)`, which doubled
  every control's scroll height. Invisible to a person; it made every control
  look clipped to anything measuring it. It scales from the floor now.
- A class that sets `display` beats the user agent's `[hidden]` rule, so
  collapsed drawers in The Watch and The Vault were rendering open. `[hidden]`
  is now enforced globally. State wins over layout.

---

## The continuous journey

`Waterway.tsx` draws the route as one channel down the left of the document:
source, build, gates, registry, production, observability. Station positions
are **measured from where the browser actually put the plates**, so the route
cannot disagree with the page, and the rail is a scale drawing of the whole
document with the fill showing how far the reader has come. The stations are
declared once in `content/journey.ts` and the hero reads the same list, so the
sill along the bottom of Headwater and the channel beside every later chapter
are the same six places.

Six vertical labels compressed onto one rail overlapped into noise, so only
the station the reader is at is named. The ticks carry the rest.

**The hero no longer loops.** It ran an 11-second cycle forever; a hero that
keeps restarting keeps asking to be looked at while somebody is trying to
read. It is now a one-shot start sequence that ends in `Production · healthy`,
and the paddle gear stops when there is nothing left to lift.

---

## The release simulation

The Flight gained a status stream: real events in the words the tools use,
with timestamps that are the true elapsed time of the run. Events are written
from an effect, never from a frame, so the log cannot outrun the drawing.
Faults still stop at the gate that would refuse them, and the log says why.

**Phones now run the simulation.** The previous build skipped straight to the
outcome on touch, which meant the one interaction that plate exists for never
ran there. The pace is per device — 0.1 per chamber on a phone against 0.2 on
a desktop — rather than skipping the mechanism entirely.

## Observability as cause and effect

Gauge House gained the causal chain: saturation → queueing → readiness →
errors, each link reading its pressure from `readAt`, the same deterministic
model the dials use. One assumption is added and stated in the source: probe
requests queue behind user requests, so readiness comes under pressure before
the error rate moves. That is why readiness sits *ahead* of errors here — it
is the mechanism that keeps the error rate low, not a consequence of it.

---

## Two new chapters

**07 The Watch** — an incident room. Four signals to read, four explanations
to choose between, one correct. The correct answer is not "roll it back": it
is that readiness had already contained a capacity mistake, which is what
probes are for. It is labelled a training scenario everywhere it appears, and
contains no production data, no customer detail and no internal architecture.

**08 The Vault** — every strong claim opened up under five headings: claim,
context, what I did, stack, evidence. The evidence line is the point. Where
the work is confidential it says *not externally auditable* rather than
substituting a number nobody can verify, and tests fail the build if a card
ever grows a percentage, a saving or an award.

---

## Depth

One application, one attribute. The switch in the persistent bar writes
`data-depth` on the document element; recruiter depth folds the drawings and
opens a gathered brief plus a two-line summary under each chapter. The server
renders the engineer view, so nothing is hidden on arrival.

The switch's accessible name was `Recruiter` on a laptop and `60s` on a phone,
because the long label was `display: none`. Both labels are in the
accessibility tree at every width now; only one is painted.

---

## Verification

| Gate | Result |
| --- | --- |
| `npm run lint` | clean |
| `npm run audit:source` | 38 files, clean |
| `npm run typecheck` | clean |
| `npm run test` | 106 passed (was 75) |
| `npm run assets:check` | fresh |
| `npm run build` | clean |
| Playwright, 6 projects | 126 passed |

E2E ran at 1920, 1440, 1024, 430 and 390, plus reduced motion. Thirty-one new
tests cover the seam never cutting a word, button/seam agreement, no control
clipping its own label at any width, the incident room's wrong-then-right
path, the vault's evidence discipline, and depth defaulting to engineer.

**Not verified here:** the WebKit projects. This environment has no route to
the Playwright CDN and only Chromium 141 on disk against a config pinned to a
newer build. `playwright.config.ts` now honours a `CHROMIUM_PATH` override and
adds Chromium projects at both phone widths so the responsive gates can run
anywhere; the WebKit projects are untouched and will run in CI. Safari should
be checked before this ships.
