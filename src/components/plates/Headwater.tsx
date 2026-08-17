'use client';

import { useEffect } from 'react';
import { barclays, contact, profile, scale, site } from '@/content';
import { disturbedSurface } from '@/lib/geometry';
import {
  usePaint,
  usePointerField,
  usePrefersReducedMotion,
  useRig,
  useRigRoot,
  useTier,
  useVars,
  useViewport,
} from '@/lib/motion';
import styles from './Headwater.module.css';

/**
 * PLATE 01 — HEADWATER.
 *
 * The rejected version of this hero was a full-screen canvas with the name
 * floating in the middle of it and a vertical slider down one side. It took
 * two thumb-scrolls to reach a single fact.
 *
 * This one is a header. Name, role, employer, location, tenure, thesis, four
 * routes out and the three scale facts are all reachable within the first
 * screen and a half on a 390px phone. The water is the last element rather
 * than the container: a band at the foot of the block, carrying a release
 * from source to promotion on a loop. Nothing has to be dragged before the
 * page says anything.
 *
 * The band's surface height is published as `--datum` on the document, which
 * is what the thin waterway down the left of every later chapter follows.
 */

/* The wave lives in a fixed 1200x200 box stretched to the band. The stretch
   is uniform, so a wider screen gets a longer wavelength — which is what a
   wider body of water actually looks like. */
const VB_W = 1200;
const VB_H = 200;

const STATIONS = [
  { at: 0.015, label: 'Source' },
  { at: 0.27, label: 'Build' },
  { at: 0.52, label: 'Gates' },
  { at: 0.75, label: 'Registry' },
  { at: 0.985, label: 'Production' },
];

export function Headwater() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();

  const rig = useRig({
    channels: {
      level: { value: 0.4, family: 'hydraulic' },
      pointerX: { value: 0.5, family: 'mechanical' },
      pointerV: { value: 0, family: 'mechanical' },
      pointerIn: { value: 0, family: 'mechanical' },
    },
    reduced,
    tier,
  });

  const rootRef = useRigRoot<HTMLElement>(rig, (visible) => {
    rig.setClock(visible);
  });

  const pointerRef = usePointerField(rig);

  /* Surface resolution is a device decision, not a design one. */
  const samples =
    tier === 'calm'
      ? 14
      : viewport === 'mobile'
        ? 22
        : viewport === 'tablet'
          ? 30
          : 44;

  const surface = (r: import('@/lib/motion').Rig, close: boolean) =>
    disturbedSurface({
      x: 0,
      width: VB_W,
      surfaceY: r.get('level') * VB_H,
      bottomY: VB_H,
      t: r.time,
      amp: 3.6,
      wavelength: 430,
      samples,
      pointer: r.get('pointerX'),
      pointerAmp: r.get('pointerIn') * (2 + r.get('pointerV') * 9),
      close,
    });

  const surfaceRef = usePaint<SVGPathElement>(rig, (el, r) => {
    el.setAttribute('d', surface(r, true));
  });

  const lineRef = usePaint<SVGPathElement>(rig, (el, r) => {
    el.setAttribute('d', surface(r, false));
  });

  /* The token's journey is written as CSS variables on the band, so a vessel
     crossing the works costs no React render and no layout. */
  const bandRef = useVars<HTMLDivElement>(rig, {
    '--datum': (r) => r.get('level'),
    '--travel': (r) => {
      if (r.reduced) return 0.52;
      const p = (r.time % 10) / 10;
      /* Arrive, then hold. A release waits at promotion; it does not coast
         straight back to the start. */
      return Math.min(1, p / 0.84);
    },
    '--lift': (r) => {
      if (r.reduced) return 0.5;
      const p = Math.min(1, (r.time % 10) / 10 / 0.84);
      return Math.sin(p * Math.PI) * 0.55 + 0.12;
    },
  });

  /* Publish the water level to the document so the waterway running down the
     left of every later chapter starts from where this one left off. */
  useEffect(() => rig.bindVars(document.documentElement, {
    '--datum': (r) => r.get('level'),
  }), [rig]);

  return (
    <header ref={rootRef} className={styles.root}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>
          <span className={styles.plateNo}>01</span>
          <span className={styles.plateName}>Headwater</span>
          <span className={styles.place}>{profile.location}</span>
        </p>

        <h1 className={`u-display ${styles.name}`}>
          <span>Akansh</span>
          <span>Mowar</span>
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

      {/* The works themselves. Full-bleed, short, and always moving. */}
      <div ref={pointerRef} className={styles.band}>
        <div ref={bandRef} className={styles.bandInner}>
          <svg
            className={styles.svg}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient id="hw-water" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#17707F" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#08272E" stopOpacity="1" />
              </linearGradient>
            </defs>
            <path ref={surfaceRef} fill="url(#hw-water)" />
            <path
              ref={lineRef}
              fill="none"
              stroke="#8FCBD4"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <ol className={styles.stations}>
            {STATIONS.map((s) => (
              <li
                key={s.label}
                className={styles.station}
                style={{ left: `${s.at * 100}%` }}
              >
                <span className={styles.tick} aria-hidden="true" />
                <span className={styles.stationLabel}>{s.label}</span>
              </li>
            ))}
          </ol>

          <span className={styles.token} aria-hidden="true" />
        </div>

        <p className={styles.bandNote}>
          <span className="u-mark">The route</span>
          <span className={styles.bandProse}>
            Source to controlled promotion. Every chapter below is one section
            of it.
          </span>
        </p>
      </div>
    </header>
  );
}
