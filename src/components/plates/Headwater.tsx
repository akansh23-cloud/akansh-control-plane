'use client';

import { useEffect, useState } from 'react';
import { barclays, contact, journey, profile, scale, site } from '@/content';
import { disturbedSurface } from '@/lib/geometry';
import {
  usePrefersReducedMotion,
  useReveal,
  useRig,
  useRigRoot,
  useScrollChannel,
  useTier,
  useVars,
  useWatch,
} from '@/lib/motion';
import styles from './Headwater.module.css';

/**
 * PLATE 01 — HEADWATER.
 *
 * The water is deliberately one heavy composited mass. Its surface geometry is
 * built once; scroll only translates that already-rasterised layer. There is no
 * per-frame SVG path reconstruction, no ambient wave clock and no scroll spring.
 */

const VB_W = 1200;
const VB_H = 800;
const BASE_LEVEL = 0.79;

const WATER_FILL = disturbedSurface({
  x: 0,
  width: VB_W,
  surfaceY: BASE_LEVEL * VB_H,
  bottomY: VB_H + 380,
  t: 0,
  amp: 1.25,
  wavelength: 760,
  samples: 14,
  close: true,
});

const WATER_LINE = disturbedSurface({
  x: 0,
  width: VB_W,
  surfaceY: BASE_LEVEL * VB_H,
  bottomY: VB_H + 380,
  t: 0,
  amp: 1.25,
  wavelength: 760,
  samples: 14,
  close: false,
});

const STATIONS = journey.map((s, i) => ({
  at: i / (journey.length - 1),
  label: s.label,
  id: s.id,
}));

export function Headwater() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();

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

  const surfaceLevel = (r: import('@/lib/motion').Rig) =>
    r.reduced ? 0.78 : BASE_LEVEL - r.get('scroll') * 0.44;

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
    [rig],
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
              <stop offset="0%" stopColor="#1b7f8e" stopOpacity="0.95" />
              <stop offset="42%" stopColor="#0E4753" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#04191E" stopOpacity="1" />
            </linearGradient>
          </defs>
          <g
            style={{
              transform: 'translate3d(0, var(--water-shift, 0%), 0)',
              transformBox: 'view-box',
              transformOrigin: '0 0',
              willChange: 'transform',
            } as React.CSSProperties}
          >
            <path d={WATER_FILL} fill="url(#hw-water)" />
            <path
              d={WATER_LINE}
              fill="none"
              stroke="#A6DCE4"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
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
