'use client';

import { useCallback, useMemo, useState } from 'react';
import { incident } from '@/content';
import {
  usePointerField,
  usePrefersReducedMotion,
  useRig,
  useRigRoot,
  useTier,
  useVars,
  useViewport,
} from '@/lib/motion';
import styles from './Watch.module.css';

/**
 * PLATE 07 — THE WATCH. The incident room.
 *
 * Everything else on this site shows a system working. This shows the half
 * hour where it is not obvious that it is, which is the part of the job a
 * portfolio usually skips.
 *
 * The visitor reads the signals a real engineer would have reached for, calls
 * it, and finds out whether they were right — and the answer that is correct
 * is not "roll it back". It is that readiness had already contained the fault,
 * which is the point of configuring probes in the first place.
 */

export function Watch() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();

  /* The first signal is open on arrival, so it counts as read: a card cannot
     be on screen and marked unread at the same time. */
  const [read, setRead] = useState<string[]>([incident.clues[0].id]);
  const [open, setOpen] = useState<string | null>(incident.clues[0].id);
  const [called, setCalled] = useState<string | null>(null);

  const rig = useRig({
    channels: {
      alert: { value: 1, family: 'mechanical' },
      pointerX: { value: 0.5, family: 'mechanical' },
      pointerY: { value: 0.5, family: 'mechanical' },
      pointerIn: { value: 0, family: 'mechanical' },
    },
    reduced,
    tier,
  });

  const rootRef = useRigRoot<HTMLDivElement>(rig);
  const pointerRef = usePointerField(rig);

  const roomRef = useVars<HTMLDivElement>(rig, {
    '--alert': (r) => r.get('alert'),
    '--px': (r) => r.get('pointerX'),
    '--py': (r) => r.get('pointerY'),
    '--pin': (r) => r.get('pointerIn'),
  });

  const verdict = useMemo(
    () => incident.hypotheses.find((h) => h.id === called) ?? null,
    [called],
  );
  const solved = verdict?.correct === true;

  const inspect = useCallback((id: string) => {
    setOpen((current) => (current === id ? null : id));
    setRead((seen) => (seen.includes(id) ? seen : [...seen, id]));
  }, []);

  const call = useCallback(
    (id: string) => {
      setCalled(id);
      const hit = incident.hypotheses.find((h) => h.id === id);
      rig.set('alert', hit?.correct ? 0 : 1, hit?.correct ? 'recovery' : 'failure');
    },
    [rig],
  );

  const restart = useCallback(() => {
    setCalled(null);
    setRead([incident.clues[0].id]);
    setOpen(incident.clues[0].id);
    rig.set('alert', 1, 'mechanical');
  }, [rig]);

  /* A tablet reads the signals in two columns and the call list in one — at
     1024px, four signal cards side by side leave the readouts three characters
     wide, and a readout that has to be scrolled is not a clue. */
  const signalColumns = viewport === 'tablet' ? 2 : viewport === 'mobile' ? 1 : 2;

  const status = solved
    ? 'Contained'
    : called
      ? 'Still open'
      : read.length === 0
        ? 'Paged'
        : 'Investigating';

  return (
    <div
      ref={(node) => {
        rootRef(node);
        pointerRef(node);
        roomRef(node);
      }}
      className={styles.root}
      data-solved={solved || undefined}
    >
      <div className={styles.board}>
        <p className="lamp" data-state={solved ? 'ok' : called ? 'hold' : 'fault'}>
          {status}
        </p>
        <p className={styles.title}>{incident.title}</p>
        <p className={styles.brief}>{incident.brief}</p>
      </div>

      <section className={styles.step} aria-labelledby="watch-signals">
        <p className="u-mark" id="watch-signals">
          Step one · read the signals
        </p>
        <div
          className={styles.signals}
          style={{ '--cols': signalColumns } as React.CSSProperties}
        >
          {incident.clues.map((c) => {
            const isOpen = open === c.id;
            return (
              <div key={c.id} className={styles.signal} data-open={isOpen || undefined}>
                <button
                  type="button"
                  className={styles.signalHead}
                  aria-expanded={isOpen}
                  aria-controls={`clue-${c.id}`}
                  onClick={() => inspect(c.id)}
                >
                  <span className={styles.signalSource}>{c.source}</span>
                  <span className={styles.signalLabel}>{c.label}</span>
                  <span className={styles.signalState} aria-hidden="true">
                    {read.includes(c.id) ? 'read' : 'unread'}
                  </span>
                </button>

                <div id={`clue-${c.id}`} className={styles.readout} hidden={!isOpen}>
                  <pre className={styles.lines}>
                    {c.lines.map((l) => (
                      <span key={l}>{l}</span>
                    ))}
                  </pre>
                  <p className={styles.reads}>{c.reads}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.step} aria-labelledby="watch-call">
        <p className="u-mark" id="watch-call">
          Step two · call it
        </p>
        <p className={styles.hint}>
          {read.length < 2
            ? 'Open at least two signals before you commit — the first one on its own points at the wrong answer.'
            : 'Pick the explanation the signals actually support.'}
        </p>

        <ul className={styles.calls}>
          {incident.hypotheses.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className={`ctl ${styles.call}`}
                aria-pressed={called === h.id}
                data-verdict={
                  called === h.id ? (h.correct ? 'right' : 'wrong') : undefined
                }
                onClick={() => call(h.id)}
              >
                {h.label}
              </button>
            </li>
          ))}
        </ul>

        {verdict ? (
          <div
            className={styles.verdict}
            data-correct={verdict.correct || undefined}
            aria-live="polite"
          >
            <p className="u-mark">{verdict.correct ? 'That is it' : 'Not this one'}</p>
            <p className={styles.verdictBody}>{verdict.verdict}</p>
            {!verdict.correct ? (
              <button type="button" className={styles.again} onClick={restart}>
                Look again
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {solved ? (
        <section className={styles.step} aria-labelledby="watch-resolution">
          <p className="u-mark" id="watch-resolution">
            Step three · the resolution path
          </p>
          <ol className={styles.resolution}>
            {incident.resolution.map((r, i) => (
              <li key={r}>
                <span className={styles.stepNo}>{String(i + 1).padStart(2, '0')}</span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
          <p className={styles.lesson}>{incident.lesson}</p>
          <button type="button" className={styles.again} onClick={restart}>
            Run it again
          </button>
        </section>
      ) : null}
    </div>
  );
}
