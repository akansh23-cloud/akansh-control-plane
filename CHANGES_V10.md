# V10 — THE LIVING INFRASTRUCTURE

Built on V9. Nothing was rebuilt for the sake of a different architecture: the
run lifecycle, the plates, the content layer, the chrome contract and the
responsive behaviour are all V9's, extended.

The rule the whole build obeys:

> Nothing moves just because it looks good. Every motion is caused by something
> in the system.

With no run, no scrolling and no pointer, every value in V10 settles to rest
and the page becomes completely still.

---

## Terminology

The visitor-facing artifact is no longer a hash.

| Was | Now |
| --- | --- |
| `AM-64723A4` | **RELEASE CAPSULE** · Akansh Portfolio · Build `64723A4` |

The build code is still the real short commit sha in a deployed build. It is
metadata under the object's name rather than something a visitor has to decode.
See `src/lib/capsule.ts`.

---

## Architecture added

```
JourneyProvider            what the run IS          (V9, unchanged)
└── OperatingEnvironment   what the world DOES      (V10)
    ├── SystemBus          one causal event stream
    ├── PressureModel      pressure / flow / turbulence / energy
    ├── SoundEngine        procedural Web Audio, off by default
    └── capsule docks, X-Ray, chaos, tour, console
```

`useCausality` in `Environment.tsx` is the single bridge from semantics to
consequence: it watches the run state, works out what changed, and announces it
once. There is no other place where a lifecycle change becomes an event, which
is why no component needed its own chain of timers.

Four numbers are published on the document element every frame and read by CSS
across the whole site:

```
--sys-pressure  --sys-flow  --sys-turbulence  --sys-energy
--ptr-x  --ptr-y  --ptr-v
data-world = standby | commissioning | operating | production
```

---

## The fifteen systems

| # | System | Where it lives |
| --- | --- | --- |
| 01 | Persistent release capsule | `system/ReleaseCapsule.tsx`, `lib/capsule.ts` |
| 02 | Hydraulic pressure model | `lib/pressure.ts`, `app/v10.css` |
| 03 | Infrastructure X-Ray | `system/XRayLayer.tsx`, `content/xray.ts` |
| 04 | Chaos mode | `system/ChaosPanel.tsx`, `content/chaos.ts` |
| 05 | Trace this request | `TraceRequest.tsx`, `content/trace.ts` |
| 06 | Incident time machine | `IncidentTimeMachine.tsx`, `content/timeline.ts` |
| 07 | Physical release controls | `controls/Physical.tsx` |
| 08 | Sonification | `lib/sound.ts`, `system/SystemStrip.tsx` |
| 09 | Morphing résumé transition | `app/v10.css` (View Transitions) |
| 10 | Living architecture text | `TechTerm.tsx`, `content/terms.ts` |
| 11 | Operator run receipt | `RunReceipt.tsx`, `runReceipt()` in `lib/lifecycle.ts` |
| 12 | Command console | `system/CommandConsole.tsx` |
| 13 | Recruiter autopilot | `system/TourRunner.tsx`, `content/tour.ts` |
| 14 | Pointer wake | `system/Environment.tsx`, `app/v10.css` |
| 15 | Production world transformation | `app/v10.css` (`data-world`) |

### Notes on the ones with a design decision inside them

**Capsule.** Plates register *docks*; the capsule is a fixed-position element
that reads the active dock's rectangle each frame and springs toward it. That is
why moving between sections is continuous travel rather than an unmount and a
remount. The Flight's old artifact token is now the Flight's dock — there is one
release, and no second object is drawn.

**Chaos.** Arm, then inject. Six faults, each mapping to reactions that already
exist in the run lifecycle, each with its own recovery. Deterministic: the same
injection behaves identically every time. No score, no achievements.

**Incident time machine.** Every value on the scrubber is computed from one
stated arithmetic — six replicas × a pool of twenty against a server maximum of
ninety. "Moved first" is derived from the traces, not asserted. The diagnosis
itself stays in the Watch plate; this is the evidence it is made from, not a
second copy of it.

**Command console.** Commands never re-implement anything. They either dispatch
a run action directly, or announce `{ type: 'COMMAND' }` on the bus for whichever
plate owns that mechanism to perform. `deploy` in the console and *Run a release*
on the Flight are one code path.

**Receipt.** Printed from counters the reducer increments while the visitor
works (`releasesRun`, `blocks`, `remediations`, `driftEvents`, `reconciliations`,
`diagnoses`, `traces`). There is no code path that prints a line without a
counter behind it, so the receipt cannot claim an action nobody performed. A run
with one clean release prints one line.

---

## Accessibility and motion

- Every physical control is a real `button` or `radiogroup` underneath, 46px
  minimum, keyboard-operable. The spring switch holds on `Enter`/`Space` keydown
  and releases on keyup.
- X-Ray: hold `X`, or the visible control in the operator bar (which is how it
  is reached on a phone, where there is no X key). `1`–`4` change lens.
- Console: `Cmd`/`Ctrl` + `K`, arrows, `Tab` to complete, `Esc` to close.
- Autopilot cancels on any wheel, touch, pointer or key input, and has a visible
  *Take control* button. It cannot trap the visitor.
- `prefers-reduced-motion` gets an intentional version, not an off switch:
  states still change, information is still present, pressure is still
  indicated — it simply stops travelling.
- Pointer wake is removed on coarse pointers rather than simulated.

---

## Content accuracy

Unchanged from V9 and re-checked here. Nothing was invented for V10.

- Certifications remain AZ-104, AZ-900, AWS Cloud Practitioner. No AWS Solutions
  Architect Associate. CKAD is not represented as a certification.
- Every new simulation states that it is a simulation, on screen.
- The trace route is the real Career Autopilot architecture; its timings are a
  declared model of relative cost, labelled as such.
- The incident timeline contains no production data, no customer detail and no
  internal architecture.
- No live uptime, no fake telemetry, no invented metrics.

---

## What was run

Locally, on this branch:

- `node scripts/source-audit.mjs` — passed, 65 TS/TSX files
- `npx tsc --noEmit` — clean
- `npx eslint .` — clean
- `npx vitest run` — 106/106 passed
- `npx next build` — compiled successfully, 5 static routes
- `npx next start` — `/` and `/resume` served 200

Not run: Playwright, cross-browser QA, responsive visual QA, replay regression,
Vercel verification. Those belong to the downstream engineer.

One test assertion moved with the rename: `tests/e2e/v7.spec.ts` asserted `AM-`
in the console button, and now asserts the build label.
