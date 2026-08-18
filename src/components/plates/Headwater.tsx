'use client';

import { useEffect, useState } from 'react';
import { barclays, contact, journey, profile, scale, site } from '@/content';
import { disturbedSurface } from '@/lib/geometry';
import {
  usePaint,
  usePointerField,
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

/**
 * PLATE 01 — HEADWATER.
 *
 * Third attempt at this block, and the first one that is actually a place.
 *
 * The first version was a full-screen canvas with the name floating in it. The
 * second was an honest header with a decorative water strip underneath — safe,
 * legible, and completely forgettable. This one puts the reader inside the
 * chamber: the water is the ground the masthead stands on, the gates are at
 * either hand, and the level rises as they scroll, because that is what a lock
 * does when it is working.
 *
 * It costs no extra page height, because the water is behind the type rather
 * than below it. The name floods in from the bottom on arrival. The level is
 * published as `--datum`, which the waterway down the left of every later
 * chapter follows, so the whole page shares one water level.
 */

/* The chamber is drawn in a fixed box and stretched to the block. The stretch
   is uniform, so a wider screen simply gets a wider chamber. */
const VB_W = 1200;
const VB_H = 800;

/* The sill is the route, and the route is declared once in the content layer,
   so the stations along the bottom of the chamber and the channel running down
   the left of every later chapter are the same six places. */
const STATIONS = journey.map((s, i) => ({
  at: i / (journey.length - 1),
  label: s.label,
  id: s.id,
}));

export function Headwater() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();

  const rig = useRig({
    channels: {
      /* Where the surface sits, 0 (top of the block) … 1 (bottom). */
      level: { value: 0.79, family: 'hydraulic' },
      /* Scroll through the block, 0…1, written by a passive listener. */
      scroll: { value: 0, family: 'hydraulic', tau: 0.22 },
      /* The start sequence. It runs once, on arrival, and then it is over —
         an artifact crossing the works and settling at a healthy level. It is
         deliberately not a loop: a hero that keeps restarting is a hero that
         keeps asking to be looked at while somebody is trying to read. */
      start: { value: 0, family: 'release', tau: 1.15 },
      pointerX: { value: 0.5, family: 'mechanical' },
      pointerV: { value: 0, family: 'mechanical' },
      pointerIn: { value: 0, family: 'mechanical' },
    },
    reduced,
    tier,
  });

  const [arrived, setArrived] = useState(false);

  const rootRef = useRigRoot<HTMLElement>(rig, (visible) => {
    rig.setClock(visible);
    if (visible) rig.set('start', 1, 'release', 1.15);
  });

  useWatch(rig, (r) => r.get('start'), 0.94, 'up', () => setArrived(true));

  /* Reduced motion has no sequence to finish, so the works are simply already
     started: the same end state, reached without the journey. Derived rather
     than pushed into state by an effect. */
  const settled = arrived || reduced;

  const scrollRef = useScrollChannel<HTMLElement>(rig, 'scroll');
  const pointerRef = usePointerField(rig);
  const revealRef = useReveal<HTMLDivElement>({ margin: '0px' });

  /* Surface resolution is a device decision, not a design one. */
  const samples =
    tier === 'calm'
      ? 14
      : viewport === 'mobile'
        ? 24
        : viewport === 'tablet'
          ? 34
          : 48;

  /* The chamber fills as the reader descends: the surface starts low under the
     masthead and climbs toward the gate sill by the time they leave. */
  const surfaceLevel = (r: import('@/lib/motion').Rig) =>
    r.reduced ? 0.78 : 0.79 - r.get('scroll') * 0.5;

  const surface = (r: import('@/lib/motion').Rig, close: boolean) =>
    disturbedSurface({
      x: 0,
      width: VB_W,
      surfaceY: surfaceLevel(r) * VB_H,
      bottomY: VB_H,
      t: r.time,
      amp: 7,
      wavelength: 460,
      samples,
      pointer: r.get('pointerX'),
      pointerAmp: r.get('pointerIn') * (4 + r.get('pointerV') * 16),
      close,
    });

  const surfaceRef = usePaint<SVGPathElement>(rig, (el, r) => {
    el.setAttribute('d', surface(r, true));
  });

  const lineRef = usePaint<SVGPathElement>(rig, (el, r) => {
    el.setAttribute('d', surface(r, false));
  });

  /* Everything positional is a variable, so a vessel crossing the chamber and
     a rising water level cost no React render and no layout. */
  const worksRef = useVars<HTMLDivElement>(rig, {
    '--datum': (r) => surfaceLevel(r),
    /* One pass, left to right, and then it stays where it stopped. */
    '--travel': (r) => r.get('start'),
    /* It rides up as the chamber equalises and settles at a working level. */
    '--lift': (r) => {
      const p = r.get('start');
      return Math.sin(Math.min(1, p) * Math.PI) * 0.34 + p * 0.26 + 0.1;
    },
    '--settled': (r) => r.get('start'),
    /* The paddle gear turns while the chamber is filling, and stops when it
       has finished — machinery that runs with nothing to lift is a fault. */
    '--gear': (r) =>
      r.reduced ? 0 : r.time * 42 * Math.max(0, 1 - r.get('start')),
  });

  /* Publish the level to the document so the waterway running down the left of
     every later chapter starts from where this one left off. */
  useEffect(
    () =>
      rig.bindVars(document.documentElement, {
        '--datum': (r) => surfaceLevel(r),
      }),
    [rig],
  );

  return (
    <header
      ref={(node) => {
        rootRef(node);
        scrollRef(node);
        pointerRef(node);
      }}
      className={styles.root}
    >
      {/* The chamber. Behind the type, full bleed, no extra height. */}
      <div ref={worksRef} className={styles.works} aria-hidden="true">
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          focusable="false"
        >
          <defs>
            <linearGradient id="hw-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1b7f8e" stopOpacity="0.95" />
              <stop offset="42%" stopColor="#0E4753" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#04191E" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path ref={surfaceRef} fill="url(#hw-water)" />
          <path
            ref={lineRef}
            fill="none"
            stroke="#A6DCE4"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Chamber walls, with the coping course at the top. */}
        <span className={`${styles.wall} ${styles.wallLeft}`} />
        <span className={`${styles.wall} ${styles.wallRight}`} />

        {/* Paddle gear on the head gate. It turns while the chamber fills. */}
        <span className={styles.gear}>
          <span className={styles.gearSpokes} />
        </span>

        {/* Depth gauge cut into the left wall. */}
        <span className={styles.gauge}>
          {[0.2, 0.4, 0.6, 0.8].map((m) => (
            <span key={m} className={styles.gaugeMark} style={{ top: `${m * 100}%` }} />
          ))}
          <span className={styles.gaugeLevel} />
        </span>

        {/* The vessel, riding the surface. */}
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
          <a className="ctl" data-primary="" href={site.resumeRoute}>
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

        {/* Three numbers about three different things. Three cells, three
            nouns, on purpose. */}
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

      {/* The route, as a sill along the foot of the chamber. */}
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
