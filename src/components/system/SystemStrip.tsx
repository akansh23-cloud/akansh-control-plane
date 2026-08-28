'use client';

import { useEffect, useRef, useState } from 'react';
import { useEnvironment } from '@/components/system/Environment';
import styles from './SystemStrip.module.css';

/**
 * SYSTEM CONTROLS.
 *
 * V9's hard rule is that there is exactly one fixed operator layer, so these
 * live inside the existing bar rather than becoming a second floating island.
 *
 * Four controls, and every one of them has a keyboard route that does not need
 * this strip at all: hold X for X-Ray, Cmd/Ctrl+K for the console. The strip
 * exists so that a visitor on a phone — who has no X key and no Cmd key — can
 * reach exactly the same things.
 */
export function SystemStrip() {
  const env = useEnvironment();
  const gauge = useRef<HTMLSpanElement | null>(null);

  /* V12: the four instruments live behind one "Lab" switch. A first-time
     reader sees a bar with four things on it, not ten; the instruments are
     one press away and stay open while any of them is in use. */
  const [labOpen, setLabOpen] = useState(false);
  const inUse = env.xray || env.soundOn || env.touring || env.consoleOpen;
  const open = labOpen || inUse;

  /* The pressure needle is written per frame by the runtime, never by React. */
  useEffect(() => {
    const node = gauge.current;
    if (!node) return;
    return env.pressure.bind(node);
  }, [env.pressure]);

  return (
    <div className={styles.root} role="group" aria-label="System controls">
      <span ref={gauge} className={styles.gauge} aria-hidden="true">
        <span className={styles.gaugeFill} />
        <span className={styles.gaugeNeedle} />
      </span>

      <button
        type="button"
        className={styles.btn}
        aria-pressed={open}
        aria-expanded={open}
        onClick={() => setLabOpen((v) => !v)}
        title="Lab — X-Ray, sound, tour and the console"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.glyph}>
          <path d="M6 2.5h4M7 2.5v4.2L3.6 12a1 1 0 0 0 .9 1.5h7a1 1 0 0 0 .9-1.5L9 6.7V2.5" />
          <path d="M5.2 10h5.6" />
        </svg>
        <span className={styles.label}>Lab</span>
      </button>

      {open ? (
      <button
        type="button"
        className={styles.btn}
        aria-pressed={env.xray}
        onClick={() => env.toggleXray()}
        title="X-Ray — or hold X"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.glyph}>
          <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
          <path d="M2.5 8h11M8 2.5v11" />
        </svg>
        <span className={styles.label}>X-Ray</span>
      </button>
      ) : null}

      {open ? (
      <button
        type="button"
        className={styles.btn}
        aria-pressed={env.soundOn}
        onClick={() => env.toggleSound()}
        title={env.soundOn ? 'Sound system on' : 'Sound system off'}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.glyph}>
          <path d="M3 6h2.5L9 3v10L5.5 10H3z" />
          {env.soundOn ? (
            <path d="M11.4 5.6a3.4 3.4 0 0 1 0 4.8" />
          ) : (
            <path d="M11.5 6.5l3 3M14.5 6.5l-3 3" />
          )}
        </svg>
        <span className={styles.label}>{env.soundOn ? 'Sound on' : 'Sound off'}</span>
      </button>
      ) : null}

      {open ? (
      <button
        type="button"
        className={styles.btn}
        aria-pressed={env.touring}
        onClick={() => (env.touring ? env.stopTour() : env.startTour())}
        title="Guided tour of the strongest evidence"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.glyph}>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M6 5.5l4.5 2.5L6 10.5z" />
        </svg>
        <span className={styles.label}>{env.touring ? 'Stop tour' : 'Tour'}</span>
      </button>
      ) : null}

      {open ? (
      <button
        type="button"
        className={styles.btn}
        aria-haspopup="dialog"
        aria-expanded={env.consoleOpen}
        onClick={() => env.openConsole(!env.consoleOpen)}
        title="Command console — Cmd/Ctrl + K"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.glyph}>
          <rect x="2" y="3.5" width="12" height="9" rx="1" />
          <path d="M4.6 7l1.8 1.6-1.8 1.6M8.4 10.4h3" />
        </svg>
        <span className={styles.label}>Console</span>
      </button>
      ) : null}
    </div>
  );
}
