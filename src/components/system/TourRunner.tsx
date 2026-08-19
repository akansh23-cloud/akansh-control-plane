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
  const { goTo } = useJourney();
  const env = useEnvironment();
  const {
    touring,
    tourStop,
    reduced,
    stopTour,
    setTourStop,
  } = env;
  const timer = useRef(0);
  const stopRef = useLatest(stopTour);

  const stop = tourStops[tourStop];

  /* Advance. Depend only on the tour controls themselves. The journey and
     environment contexts also change while a smooth scroll crosses plates;
     depending on those whole objects used to restart this timer and re-issue
     the same scroll on every stage/dock update, which could make the guided
     tour hesitate or appear stalled. */
  useEffect(() => {
    if (!touring || pathname !== '/') return;
    const current = tourStops[tourStop];
    if (!current) return;

    goTo(current.plate);

    timer.current = window.setTimeout(() => {
      if (tourStop >= tourStops.length - 1) stopTour();
      else setTourStop(tourStop + 1);
    }, reduced ? Math.min(2200, current.hold) : current.hold);

    return () => window.clearTimeout(timer.current);
  }, [goTo, pathname, reduced, setTourStop, stopTour, tourStop, touring]);

  /* The exit. Deliberately broad, deliberately passive, deliberately first. */
  useEffect(() => {
    if (!touring) return;

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
  }, [touring, stopRef]);

  if (pathname !== '/' || !touring || !stop) return null;

  const progress = (tourStop + 1) / tourStops.length;

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
            {String(tourStop + 1).padStart(2, '0')} / {String(tourStops.length).padStart(2, '0')}
          </p>
          <button type="button" className={styles.exit} onClick={stopTour}>
            Take control
          </button>
        </div>

        <p className={styles.hint}>Scroll, tap or press any key to take over.</p>
      </div>
    </div>
  );
}
