'use client';

import { useCallback, useMemo, useState } from 'react';
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
 * PLATE 03 — THE REFIT. The signature modernisation interaction.
 *
 * The previous version wiped a clip-path across the words themselves, which
 * sliced "GitLab CI/CD" into "Git" + "b CI/CD" at every intermediate position.
 * A comparison that cannot be read is not a comparison, so the mechanism is
 * different now and the rule is absolute: **no text is ever clipped.**
 *
 * Instead the seam is a refit front travelling along the works. Each layer has
 * its own crossover point, staggered so the front passes through the five
 * layers in sequence. A layer is only ever in one of three states — standing,
 * being changed, or rebuilt — and in every one of them both names are complete
 * words. The old plant lifts out and the replacement seats in the same
 * physical position, and the engineering outcome arrives with it.
 *
 * BEFORE and AFTER are not a second control that can disagree with the seam:
 * they set the seam, and their pressed state is derived from the same row
 * thresholds the drawing uses, so the buttons cannot show a state the drawing
 * is not in.
 */

/* Where each layer's crossover begins, and how long it takes. Together these
   are the only numbers that define the sequence; the CSS reads them per row. */
const FIRST = 0.08;
const PITCH = 0.16;
const SPAN = 0.2;

const startOf = (i: number) => FIRST + i * PITCH;
const LAST_END = startOf(refit.length - 1) + SPAN;

const crossover = (seam: number, i: number) => {
  const t = (seam - startOf(i)) / SPAN;
  return t <= 0 ? 0 : t >= 1 ? 1 : t;
};

type RowState = 'standing' | 'changing' | 'rebuilt';

const stateOf = (t: number): RowState =>
  t <= 0 ? 'standing' : t >= 1 ? 'rebuilt' : 'changing';

const STATE_LABEL: Record<RowState, string> = {
  standing: 'As it was',
  changing: 'Being changed',
  rebuilt: 'Rebuilt',
};

/* What each card is at this moment. The old plant is not "removed" until the
   front has passed it, and the replacement is a proposal until it is in. */
const BEFORE_MARK: Record<RowState, string> = {
  standing: 'In service',
  changing: 'Coming out',
  rebuilt: 'Removed',
};

const AFTER_MARK: Record<RowState, string> = {
  standing: 'Planned',
  changing: 'Going in',
  rebuilt: 'In service',
};

export function Refit() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();

  /* 0 = the works as they were. 1 = the works as they are. */
  const [seam, setSeam] = useState(0);

  const rig = useRig({
    channels: {
      seam: { value: 0, family: 'mechanical' },
      pointerX: { value: 0.5, family: 'mechanical' },
      pointerY: { value: 0.5, family: 'mechanical' },
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

  /* One state per layer, derived from the same thresholds the CSS uses, so the
     words, the buttons and the drawing cannot disagree with each other. */
  const rows = useMemo(
    () =>
      refit.map((r, i) => {
        const t = crossover(seam, i);
        return { ...r, i, t, state: stateOf(t) };
      }),
    [seam],
  );

  const done = rows.filter((r) => r.state === 'rebuilt').length;
  const side: 'before' | 'mid' | 'after' =
    seam <= FIRST ? 'before' : seam >= LAST_END ? 'after' : 'mid';

  /* A tablet keeps the three columns but drops the outcome to its own line —
     at 1024px a third column leaves the layer names on two lines each. */
  const stacked = viewport === 'tablet' || viewport === 'mobile';

  const status =
    side === 'before'
      ? 'Nothing has been replaced yet. This is the platform as it was.'
      : side === 'after'
        ? 'All five layers replaced, in place, on a platform that kept serving.'
        : `${done} of ${refit.length} layers rebuilt. The front is passing through ${
            rows.find((r) => r.state === 'changing')?.layer ?? 'the works'
          }.`;

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.controls}>
        <div className={`ctl-row ${styles.presets}`}>
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

        <p className={styles.status} aria-live="polite">
          {status}
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
          <span className={styles.legendBefore}>
            Jenkins · Bitbucket · raw manifests · JDK 8 · JBoss · ELK
          </span>
          <span className={styles.legendAfter}>
            GitLab CI/CD · Helm · Java 17 · Tomcat 10 · Observe
          </span>
        </div>

        <ol className={styles.rows}>
          {rows.map((r) => (
            <li
              key={r.id}
              className={styles.row}
              data-state={r.state}
              style={{ '--a': startOf(r.i), '--span': SPAN } as React.CSSProperties}
            >
              <span className={styles.layer}>
                <span className={styles.layerName}>{r.layer}</span>
                <span className={styles.rowState}>{STATE_LABEL[r.state]}</span>
              </span>

              {/* Two complete cards in one cell. Never a clip, never a slice:
                  the old plant lifts out and the replacement seats in. */}
              <span className={styles.swap}>
                <span className={styles.card} data-face="before" aria-hidden="true">
                  <span className={styles.cardMark}>{BEFORE_MARK[r.state]}</span>
                  <span className={styles.cardName}>{r.before}</span>
                </span>
                <span className={styles.card} data-face="after" aria-hidden="true">
                  <span className={styles.cardMark}>{AFTER_MARK[r.state]}</span>
                  <span className={styles.cardName}>{r.after}</span>
                </span>
                <span className={styles.hatch} aria-hidden="true" />
              </span>

              <span className={styles.gain} aria-hidden="true">
                {r.gain}
              </span>

              {/* The whole row as one readable sentence, for assistive
                  technology and for find-in-page. */}
              <span className="u-hidden">
                {r.layer}: {r.before} became {r.after} — {r.gain}. Currently{' '}
                {STATE_LABEL[r.state].toLowerCase()}.
              </span>
            </li>
          ))}
        </ol>

        <div className={styles.seam} aria-hidden="true" />

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
                : `${done} of ${refit.length} layers rebuilt`
          }
          {...handlers}
        >
          <span className={styles.grip} aria-hidden="true" />
          <span className={styles.handleMark} aria-hidden="true">
            Refit front
          </span>
        </div>
      </div>

      {/* The same five facts as a plain table. It is not a fallback: it is the
          comparison, stated once, that the drawing above animates. */}
      <table className={styles.table}>
        <caption className={styles.caption}>
          Five layers, replaced in place, one at a time, on a platform that kept
          serving while the work was happening.
        </caption>
        <thead>
          <tr>
            <th scope="col">Layer</th>
            <th scope="col">Before</th>
            <th scope="col">After</th>
            <th scope="col">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {refit.map((r) => (
            <tr key={r.id}>
              <th scope="row">{r.layer}</th>
              <td data-col="before">{r.before}</td>
              <td data-col="after">{r.after}</td>
              <td data-col="gain">{r.gain}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
