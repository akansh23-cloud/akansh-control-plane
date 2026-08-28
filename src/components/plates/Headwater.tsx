'use client';

import { useCallback, useEffect, useState } from 'react';
import { useJourney } from '@/components/JourneySystem';
import { useMaybeEnvironment } from '@/components/system/Environment';
import { barclays, contact, journey, profile, scale, site } from '@/content';
import { periodicSurface } from '@/lib/geometry';
import {
  usePrefersReducedMotion,
  useReveal,
  useRig,
  useRigRoot,
  useScrollChannel,
  useTier,
  useVars,
  useViewport,
  useWatch,
} from '@/lib/motion';
import styles from './Headwater.module.css';
import motion from './HeadwaterMotion.module.css';

/**
 * PLATE 01 — HEADWATER.
 *
 * The water is a set of pre-built SVG surfaces. Scroll only translates the
 * complete water field, while independent compositor animations keep the
 * surface, glints and subsurface currents alive when the page is stationary.
 * No SVG path is reconstructed per frame and scroll never waits on a spring.
 *
 * Fine-pointer response stays owned by the global operating environment. The
 * former local usePointerField water displacement remains intentionally absent:
 * pointer motion must never shake this large surface.
 */

const VB_W = 1200;
const VB_H = 800;
/* The resting water level, as a fraction of the chamber height. 0.79 put the
   surface below the first viewport on every desktop, so the landing page read
   as an empty tank. The surface now sits under the masthead, and the stats
   and the route below it stand on raised cards so nothing textual is
   submerged. */
const BASE_LEVEL = 0.6;
const BOTTOM = VB_H + 380;

/* Every surface is periodic in WAVE, and each path is drawn wide enough that
   a CSS translate of exactly one wavelength shows an identical picture: that
   is what lets the water run continuously in one direction with no seam and
   no reversal, on the compositor, with nothing recomputed per frame. */
const WAVE = 520;
const OVERSCAN_X = -WAVE * 2;
const OVERSCAN_W = VB_W + WAVE * 4;

const WATER_FILL = periodicSurface({
  x: OVERSCAN_X,
  width: OVERSCAN_W,
  surfaceY: BASE_LEVEL * VB_H,
  bottomY: BOTTOM,
  amp: 5.5,
  wavelength: WAVE,
  phase: 0.4,
  samples: 120,
  close: true,
});

const WATER_REAR = periodicSurface({
  x: OVERSCAN_X,
  width: OVERSCAN_W,
  surfaceY: BASE_LEVEL * VB_H + 6,
  bottomY: BOTTOM,
  amp: 4.2,
  wavelength: WAVE,
  phase: 2.1,
  samples: 120,
  close: false,
});

const WATER_FRONT = periodicSurface({
  x: OVERSCAN_X,
  width: OVERSCAN_W,
  surfaceY: BASE_LEVEL * VB_H - 1,
  bottomY: BOTTOM,
  amp: 6.4,
  wavelength: WAVE,
  phase: 4.4,
  samples: 120,
  close: false,
});

const CURRENT_LINES = [46, 92, 142].map((depth, i) =>
  periodicSurface({
    x: OVERSCAN_X,
    width: OVERSCAN_W,
    surfaceY: BASE_LEVEL * VB_H + depth,
    bottomY: BOTTOM,
    amp: 2.2 + i * 0.45,
    wavelength: WAVE,
    phase: 1.3 + i * 2.25,
    samples: 96,
    close: false,
  }),
);

const STATIONS = journey.map((s, i) => ({
  at: i / (journey.length - 1),
  label: s.label,
  id: s.id,
}));

export function Headwater() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();
  const run = useJourney();
  const env = useMaybeEnvironment();

  /* The first interaction is the thing this site is best at. One press
     sends the release out of the headwater and up the flight: the page
     travels to Plate 02 and the Flight — which owns the mechanism —
     performs the run on the same command the console uses. */
  const sendRelease = useCallback(() => {
    if (!run.launched) run.launch();
    run.goTo('flight');
    window.setTimeout(() => {
      env?.bus.emit({ type: 'COMMAND', command: 'release:run' });
    }, 260);
  }, [env, run]);

  const rig = useRig({
    channels: {
      scroll: { value: 0, family: 'mechanical' },
      start: { value: 0, family: 'release', tau: 1.15 },
    },
    reduced,
    tier,
  });

  const [arrived, setArrived] = useState(false);

  const rootRef = useRigRoot<HTMLElement>(rig, (visible) => {
    if (!visible) {
      rig.setClock(false);
      return;
    }
    if (!arrived && !reduced) {
      rig.setClock(true);
      rig.set('start', 1, 'release', 1.15);
    } else {
      rig.setClock(false);
      rig.set('start', 1, 'release', 1.15);
    }
  });

  useWatch(rig, (r) => r.get('start'), 0.94, 'up', () => {
    setArrived(true);
    rig.setClock(false);
  });

  const settled = arrived || reduced;

  const scrollRef = useScrollChannel<HTMLElement>(rig, 'scroll', {
    map: 'out',
    direct: true,
  });
  const revealRef = useReveal<HTMLDivElement>({ margin: '0px' });

  const travel = viewport === 'tablet' ? 0.4 : 0.44;
  const surfaceLevel = (r: import('@/lib/motion').Rig) =>
    r.reduced ? 0.78 : BASE_LEVEL - r.get('scroll') * travel;

  const worksRef = useVars<HTMLDivElement>(rig, {
    '--datum': (r) => surfaceLevel(r),
    '--water-shift': (r) => `${(surfaceLevel(r) - BASE_LEVEL) * 100}%`,
    '--travel': (r) => r.get('start'),
    '--lift': (r) => {
      const p = r.get('start');
      return Math.sin(Math.min(1, p) * Math.PI) * 0.34 + p * 0.26 + 0.1;
    },
    '--settled': (r) => r.get('start'),
    '--gear': (r) =>
      r.reduced ? 0 : r.time * 42 * Math.max(0, 1 - r.get('start')),
  });

  useEffect(
    () =>
      rig.bindVars(document.documentElement, {
        '--datum': (r) => surfaceLevel(r),
      }),
    [rig, travel],
  );

  return (
    <header
      ref={(node) => {
        rootRef(node);
        scrollRef(node);
      }}
      className={styles.root}
    >
      <div ref={worksRef} className={styles.works} aria-hidden="true">
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          focusable="false"
        >
          <defs>
            <linearGradient id="hw-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1b7f8e" stopOpacity="0.96" />
              <stop offset="38%" stopColor="#0E5260" stopOpacity="0.99" />
              <stop offset="100%" stopColor="#031519" stopOpacity="1" />
            </linearGradient>
          </defs>

          <g className={motion.waterScroll}>
            <g className={motion.waterMass}>
              <path d={WATER_FILL} fill="url(#hw-water)" />
            </g>

            <g className={motion.waveRear}>
              <path d={WATER_REAR} className={motion.surfaceRear} />
            </g>

            <g className={motion.waveFront}>
              <path d={WATER_FRONT} className={motion.surfaceFront} />
              <path d={WATER_FRONT} className={motion.surfaceGlint} />
            </g>

            <g className={motion.currentField}>
              {CURRENT_LINES.map((line, i) => (
                <path key={i} d={line} className={motion.currentLine} />
              ))}
            </g>
          </g>
        </svg>

        <span className={`${styles.wall} ${styles.wallLeft}`} />
        <span className={`${styles.wall} ${styles.wallRight}`} />

        <span className={styles.gear}>
          <span className={styles.gearSpokes} />
        </span>

        <span className={styles.gauge}>
          {[0.2, 0.4, 0.6, 0.8].map((m) => (
            <span key={m} className={styles.gaugeMark} style={{ top: `${m * 100}%` }} />
          ))}
          <span className={styles.gaugeLevel} />
        </span>

        <span className={styles.token} />
      </div>

      <div ref={revealRef} className={styles.inner}>
        <p className={styles.eyebrow}>
          <span className={styles.plateNo}>01</span>
          <span className={styles.plateName}>Headwater</span>
          <span className={styles.place}>{profile.location}</span>
        </p>

        <h1 className={`u-display ${styles.name}`}>
          <span className="u-flood">Akansh</span>
          <span className="u-flood">Mowar</span>
        </h1>

        <p className={styles.role}>{profile.roleLine}</p>

        <ul className={styles.meta}>
          <li>
            <span className="u-mark">Now</span>
            <span className={styles.metaValue}>
              {barclays.title}, {barclays.company}
            </span>
          </li>
          <li>
            <span className="u-mark">Since</span>
            <span className={styles.metaValue}>{barclays.period}</span>
          </li>
          <li>
            <span className="u-mark">Experience</span>
            <span className={styles.metaValue}>{profile.experience}</span>
          </li>
        </ul>

        <p className={`u-prose ${styles.thesis}`}>{profile.thesis}</p>

        <nav className={`ctl-row ${styles.actions}`} aria-label="Primary">
          <button
            type="button"
            className={`ctl ${styles.send}`}
            data-primary=""
            onClick={sendRelease}
          >
            <span className={styles.sendMark} aria-hidden="true" />
            Run a release
          </button>
          <a className="ctl" href={site.resumeRoute}>
            Résumé
          </a>
          <a className="ctl" href={`mailto:${contact.email}`}>
            Email
          </a>
          <a
            className="ctl"
            href={contact.linkedin}
            target="_blank"
            rel="noreferrer noopener"
          >
            LinkedIn
          </a>
          <a
            className="ctl"
            href={contact.github}
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub
          </a>
        </nav>

        <dl className={styles.scale}>
          {[scale.services, scale.workloads, scale.stages].map((s) => (
            <div key={s.noun} className={styles.stat}>
              <dt className={styles.statValue}>{s.value}</dt>
              <dd className={styles.statNoun}>{s.noun}</dd>
              <dd className={styles.statQual}>{s.qualifier}</dd>
            </div>
          ))}
        </dl>
      </div>

      <ol className={styles.stations} data-settled={settled || undefined}>
        {STATIONS.map((s, i) => (
          <li
            key={s.id}
            className={styles.station}
            style={{ left: `${s.at * 100}%` }}
            data-last={i === STATIONS.length - 1 ? '' : undefined}
          >
            <span className={styles.tick} aria-hidden="true" />
            <span className={styles.stationLabel}>{s.label}</span>
          </li>
        ))}
      </ol>

      <p className={styles.state} data-settled={settled || undefined} aria-live="polite">
        {settled ? 'Production · healthy' : 'Starting the works'}
      </p>
    </header>
  );
}
