# The Lockworks — Motion Bible

Motion here is not decoration applied after the fact. It is how the drawing
says what kind of thing is happening. Water behaves like water, gears behave
like gears, and a refused release behaves like something being physically
stopped. If a future change makes a gate wobble or makes water snap, the
metaphor has broken even if nothing looks obviously wrong.

## 1. The architecture rule

**React holds semantics. The runtime holds motion.** These never swap jobs.

React state is allowed to represent:

```
IDLE · RUNNING · HELD · RECOVERING · COMPLETE
which chamber is being inspected
how many services have been extracted
whether the cluster matches Git
```

React state is **never** allowed to represent:

```
where the water surface is this frame
where the release currently sits between two chambers
how far a seam has been dragged
the phase of a wave
```

Those live in `src/lib/runtime.ts` as *channels* on a `Rig`. A rig owns a set
of channels, a clock, and a list of writers. One `requestAnimationFrame` loop
in the whole document ticks every active rig, integrates its channels, then
runs its writers, which write directly onto DOM nodes.

The bridge between the two goes in exactly one direction and only at
thresholds:

```ts
rig.watch({ read: (r) => r.get('level'), at: 0.6, dir: 'both', fire: ... })
```

A gauge mark being reached is an event. It is allowed to render. The water
arriving at it is not.

### Why this matters

The previous implementation used `useSmoothed` and `useTicker`, both of which
called `setState` inside a `rAF` callback. Every frame reconciled the entire
SVG tree of a plate — several hundred nodes — sixty times a second, on seven
plates. Dragging the sluice re-rendered the hero continuously.

Nothing in the current build renders per frame. Dragging the Refit seam causes
**at most five** renders across the whole gesture: one per layer that commits.

## 2. The motion families

Defined once, in `FAMILIES` in `runtime.ts`. The difference between them is
damping ratio and velocity ceiling — not an easing curve, because an easing
curve cannot express momentum.

| Family | τ | ζ | Max vel | Used for |
|---|---|---|---|---|
| `hydraulic` | 0.46 | 0.72 | 2.6 | water, filling, draining, head |
| `mechanical` | 0.17 | 1.00 | — | paddles, gates, handles, seams, needles |
| `release` | 0.26 | 0.90 | 3.4 | a release moving through the flight |
| `failure` | 0.07 | 1.35 | — | refusal, arrest, pressure loss |
| `recovery` | 0.58 | 0.95 | — | rollback, reconciliation, repair |
| `instant` | — | — | — | reduced motion |

**Hydraulic** is underdamped and velocity-clamped. It carries momentum, arrives
late, and settles slightly past its target before coming back. Water cannot be
yanked, so it has a speed limit.

**Mechanical** is critically damped. It arrives exactly, with no overshoot,
because a geared rack does not wobble. This is why the sluice paddle tracks
your hand precisely while the water it admits lags behind it — the same
gesture drives two channels with two different characters, and that gap is the
entire feeling of operating the lock.

**Failure** is the fastest family and the most damped. Failure is not a shake
and not a red flash: it is *motion stopping against something*. In The Flight,
a refused gate does not open at all no matter how close the release gets, and
a `bleed` channel drains the chamber's head so it visibly fails to equalise.

**Recovery** is deliberately slower than failure. Breaking is sudden; being put
right is not. Rollback and Argo CD reconciliation both use it.

## 3. Where motion is allowed to be continuous

Almost nowhere. Continuous motion is expensive and, more importantly, it makes
the quiet moments stop reading as quiet.

The only continuous motion in the build:

- water surfaces, and only while their plate is on screen
- traffic dots in The Split and The Basin runtime view
- navigation beacons in Tidewater — **CSS keyframes, not the frame loop**
- dashed GitOps flow in The Basin — **CSS keyframes, not the frame loop**
- the thin inter-plate waterway and plate registration — **CSS / view-timeline
  progressive enhancement, never a scroll rAF**

Anything expressible as a CSS animation is a CSS animation. The frame loop is
reserved for things whose geometry has to be recomputed — an SVG `d` attribute
is the main one, since no CSS property can express a sampled wave.

Rigs stop taking frames entirely when their root leaves the viewport
(`useRigRoot`) or the tab is hidden. `activeRigCount()` is exported for
diagnostics: on a page sitting on The Refit, it should read 1.

## 4. Pointer

`usePointerField` publishes normalised pointer position and a decaying speed
measure as channels. It attaches only under
`(hover: hover) and (pointer: fine)`.

Every plate now uses the field as a restrained surveyor's inspection datum; the
browser cursor itself is never replaced. Hydraulic scenes go one step further:
Headwater, The Basin and Tidewater feed pointer position and velocity into a
Gaussian water displacement, so a moving hand pushes only the surface under it
by a few pixels before the disturbance decays. The same smoothed channels are
also published as CSS custom properties on the inspected SVG for future
material responses without extra listeners or React state.

What is deliberately absent, and should stay absent: custom cursors, cursor
followers, magnetic buttons, page-wide parallax, anything that moves the whole
composition in response to a pointer. The pointer is a hand near a machine.

## 5. Device-adaptive complexity

`useTier()` returns `full`, `reduced-detail`, or `calm`, read once through
`useSyncExternalStore` from core count, device memory and Save-Data.

Lower tiers reduce **wave sample counts, secondary water layers and engraved
tick density**. They never remove an interaction, a label, a piece of
information, or the primary metaphor. There is no "low performance fallback"
mode — there is the same drawing, drawn with fewer lines.

Sample counts by tier and viewport are chosen per plate at the call site so
they stay visible and adjustable rather than hidden in the runtime.

## 6. Reduced motion

`prefers-reduced-motion: reduce` sets `rig.reduced`, which:

- collapses every channel to its target on assignment — state changes still
  happen, and are still visible, they simply arrive rather than travel
- freezes the clock at zero, so water is drawn as a still surface with
  amplitude 0 rather than a flat rectangle
- suppresses impulses entirely
- disables the CSS keyframe animations via media query

What it explicitly does **not** do is set `animation-duration: 0` and leave a
dead page. Every interaction still works, every state change is still legible,
and the composition is unchanged. Reduced motion is a different rendering of
the same machine, not a degraded one.

## 7. Touch

`touch-action: pan-y` on every drawing. `touch-action: none` on drag handles
**only** — currently the Headwater sluice handle and the Basin desired-state
marker.

This is a rule with a specific bug behind it: the hero SVG previously carried
`touch-action: none` across its whole surface, which meant a phone user who
started a swipe anywhere on the opening drawing could not scroll the page.

Any new draggable control gets `touch-action: none` on the handle and nothing
wider.

## 8. Adding motion

Before adding anything that moves, three questions:

1. **What kind of thing is this?** Pick the family first. If none of the five
   fits, the interaction probably needs rethinking, not a sixth family.
2. **Does it need a frame loop?** If CSS can express it, use CSS.
3. **What gets quieter to pay for it?** Contrast is what makes choreography
   read. Everything moving at once is the same as nothing moving.
