'use client';

import { useCallback, useState } from 'react';
import { refit } from '@/content';
import {
  useAxisDrag,
  usePointerField,
  usePrefersReducedMotion,
  useRig,
  useRigRoot,
  useTier,
  useVars,
  useViewport,
} from '@/lib/motion';
import styles from './Refit.module.css';

/**
 * PLATE 03 — THE REFIT. Signature interaction, modernisation.
 *
 * Five layers of the platform were replaced under a service that had to keep
 * running. The rejected version showed that as a small low-contrast table
 * with a default-looking slider under it, sitting above most of a blank page.
 *
 * Here the seam is the whole plate. Both states occupy the same five rows and
 * the seam wipes between them, so the reader watches Jenkins become GitLab in
 * the same physical position rather than comparing two lists. The handle is a
 * 48px target, the seam is keyboard operable as a real slider, and two
 * buttons jump to either end for anyone who does not want to drag at all.
 */

export function Refit() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();

  /* 0 = the works as they were. 1 = the works as they are. */
  const [seam, setSeam] = useState(0.34);

  const rig = useRig({
    channels: {
      seam: { value: 0.34, family: 'mechanical' },
      pointerX: { value: 0.5, family: 'mechanical' },
      pointerIn: { value: 0, family: 'mechanical' },
    },
    reduced,
    tier,
  });

  const rootRef = useRigRoot<HTMLDivElement>(rig);
  const pointerRef = usePointerField(rig);

  const fieldRef = useVars<HTMLDivElement>(rig, {
    '--seam': (r) => r.get('seam'),
  });

  const move = useCallback(
    (next: number) => {
      setSeam(next);
      rig.set('seam', next, 'mechanical');
    },
    [rig],
  );

  const { trackRef, dragging, handlers } = useAxisDrag('x', seam, move, {
    step: 0.08,
    detents: [0, 0.5, 1],
    snap: 0.06,
  });

  /* A tablet reads the layer name above the value rather than beside it —
     at 1024px the three-column desktop rhythm leaves the values cramped. */
  const stacked = viewport === 'tablet' || viewport === 'mobile';

  const side = seam < 0.34 ? 'before' : seam > 0.66 ? 'after' : 'mid';

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.controls}>
        <div className="ctl-row">
          <button
            type="button"
            className="ctl"
            aria-pressed={side === 'before'}
            onClick={() => move(0)}
          >
            Before
          </button>
          <button
            type="button"
            className="ctl"
            aria-pressed={side === 'after'}
            onClick={() => move(1)}
          >
            After
          </button>
        </div>
        <p className={styles.hint}>
          Drag the seam, or use the arrow keys once it has focus.
        </p>
      </div>

      <div
        ref={(node) => {
          pointerRef(node);
          fieldRef(node);
          trackRef.current = node;
        }}
        className={styles.field}
        data-side={side}
        data-dragging={dragging || undefined}
        data-stacked={stacked || undefined}
      >
        <div className={styles.legend} aria-hidden="true">
          <span className={styles.legendBefore}>As it was</span>
          <span className={styles.legendAfter}>As it is</span>
        </div>

        <ol className={styles.rows}>
          {refit.map((r) => (
            <li key={r.id} className={styles.row}>
              <span className={styles.layer}>{r.layer}</span>

              <span className={styles.cell}>
                <span className={styles.before} aria-hidden="true">
                  {r.before}
                </span>
                <span className={styles.after} aria-hidden="true">
                  {r.after}
                </span>
                <span className="u-hidden">
                  {r.layer}: {r.before} became {r.after} — {r.gain}.
                </span>
              </span>

              <span className={styles.gain} aria-hidden="true">
                {r.gain}
              </span>
            </li>
          ))}
        </ol>

        {/* The seam. touch-action is claimed by the handle alone, never by
            the panel, so the page still scrolls under a thumb. */}
        <div
          className={styles.seam}
          style={{ left: 'calc(var(--seam, 0.34) * 100%)' }}
          aria-hidden="true"
        />

        <div
          className={styles.handle}
          role="slider"
          tabIndex={0}
          aria-label="Modernisation seam — drag from the old platform to the current one"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(seam * 100)}
          aria-valuetext={
            side === 'before'
              ? 'The platform as it was'
              : side === 'after'
                ? 'The platform as it is'
                : 'Part way through the refit'
          }
          style={{ left: 'calc(var(--seam, 0.34) * 100%)' }}
          {...handlers}
        >
          <span className={styles.grip} aria-hidden="true" />
        </div>
      </div>

      <p className={styles.footer}>
        Each of these was replaced in place, one layer at a time, on a platform
        that kept serving while the work was happening.
      </p>
    </div>
  );
}
