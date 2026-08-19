'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useJourney } from '@/components/JourneySystem';
import { useEnvironment } from '@/components/system/Environment';
import { tourStops } from '@/content/tour';
import { useLatest } from '@/lib/motion';
import styles from './TourRunner.module.css';

/**
 * RECRUITER AUTOPILOT.
 *
 * The system drives itself through the strongest evidence: it scrolls the real
 * page, highlights the real region, and annotates it. It is not a video and it
 * is not a modal — the visitor is watching their own interface being operated.
 *
 * The contract that matters is the exit. Any wheel, touch, key or pointer
 * input cancels immediately and hands control back, and the visitor is never
 * scrolled somewhere they did not choose after they have taken over. A tour
 * you cannot escape is a trap, not a feature.
 */
export function TourRunner() {
  const pathname = usePathname();
  const run = useJourney();
  const env = useEnvironment();
  const timer = useRef(0);
  const stopRef = useLatest(env.stopTour);

  const stop = tourStops[env.tourStop];

  /* Advance. One timer, owned here, cleared on every change. */
  useEffect(() => {
    if (!env.touring || pathname !== '/') return;
    const current = tourStops[env.tourStop];
    if (!current) return;

    run.goTo(current.plate);

    timer.current = window.setTimeout(() => {
      if (env.tourStop >= tourStops.length - 1) env.stopTour();
      else env.setTourStop(env.tourStop + 1);
    }, env.reduced ? Math.min(2200, current.hold) : current.hold);

    return () => window.clearTimeout(timer.current);
  }, [env, pathname, run]);

  /* The exit. Deliberately broad, deliberately passive, deliberately first. */
  useEffect(() => {
    if (!env.touring) return;

    const cancel = () => stopRef.current();
    const onKey = (event: KeyboardEvent) => {
      /* Modifier-only presses are not an intention to leave. */
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
      cancel();
    };

    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchstart', cancel, { passive: true });
    window.addEventListener('pointerdown', cancel, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchstart', cancel);
      window.removeEventListener('pointerdown', cancel);
      window.removeEventListener('keydown', onKey);
    };
  }, [env.touring, stopRef]);

  if (pathname !== '/' || !env.touring || !stop) return null;

  const progress = (env.tourStop + 1) / tourStops.length;

  return (
    <div className={styles.root} role="status" aria-live="polite">
      <div className={styles.card}>
        <span className={styles.rail} aria-hidden="true">
          <span className={styles.railFill} style={{ width: `${progress * 100}%` }} />
        </span>

        <p className={styles.kicker}>{stop.title}</p>
        <p className={styles.line}>{stop.line}</p>

        <div className={styles.foot}>
          <p className={styles.count}>
            {String(env.tourStop + 1).padStart(2, '0')} / {String(tourStops.length).padStart(2, '0')}
          </p>
          <button type="button" className={styles.exit} onClick={env.stopTour}>
            Take control
          </button>
        </div>

        <p className={styles.hint}>Scroll, tap or press any key to take over.</p>
      </div>
    </div>
  );
}
