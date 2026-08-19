'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useJourney } from '@/components/JourneySystem';
import { useEnvironment } from '@/components/system/Environment';
import {
  CAPSULE_STATUS_LABEL,
  CAPSULE_TONE,
  capsuleIdentity,
  type CapsuleDockId,
} from '@/lib/capsule';
import {
  useLatest,
  usePrefersReducedMotion,
  useRig,
  useViewport,
} from '@/lib/motion';
import styles from './ReleaseCapsule.module.css';

/**
 * THE RELEASE CAPSULE.
 *
 * One object, carried through the entire experience. It is not a mascot and it
 * is not a loading spinner: it is the software release, drawn as the thing a
 * release actually is — a sealed carrier with a number etched into it, a
 * status strip, and marks it picks up along the way.
 *
 * How it moves.
 *
 * Plates register *docks*. The capsule is a fixed-position element that reads
 * the active dock's rectangle each frame and springs toward it, so travelling
 * between sections is continuous physical movement rather than a component
 * unmounting in one place and mounting in another. When no dock is on screen
 * it returns to its holding bay above the operator bar.
 *
 * Metal moves like metal: short travel, heavy easing, hard stop. The channel
 * families are the ones already declared in `runtime.ts`, so the capsule and
 * the water in the Flight are governed by the same physics.
 */

const BAY_SIZE = { w: 132, h: 64 };
const BAY_SIZE_SMALL = { w: 104, h: 52 };

export function ReleaseCapsule() {
  const pathname = usePathname();
  const run = useJourney();
  const env = useEnvironment();
  const viewport = useViewport();
  const reduced = usePrefersReducedMotion();
  const [inspecting, setInspecting] = useState(false);

  const identity = capsuleIdentity(run.artifact);
  const status = env.capsule;
  const tone = CAPSULE_TONE[status];
  const marks = env.marks;

  const rig = useRig({
    channels: {
      x: { value: 0, family: 'mechanical', tau: 0.34 },
      y: { value: 0, family: 'mechanical', tau: 0.34 },
      w: { value: BAY_SIZE.w, family: 'mechanical', tau: 0.28 },
      h: { value: BAY_SIZE.h, family: 'mechanical', tau: 0.28 },
      /* Docking: 1 while seated in a plate, 0 while in the holding bay. */
      seated: { value: 0, family: 'mechanical', tau: 0.3 },
      /* Refusal shove. Rises when a gate blocks, decays when it clears. */
      refuse: { value: 0, family: 'failure' },
    },
    reduced,
  });

  const rootRef = useRef<HTMLDivElement | null>(null);

  /* On a phone the capsule does not fly the length of every section — it holds
     its bay and only seats into the Flight, where the mechanism it belongs to
     actually is. Adapted for touch rather than shrunk from desktop. */
  const dockRef = useLatest<CapsuleDockId>(
    viewport === 'mobile' && env.dock !== 'flight' ? 'bay' : env.dock,
  );

  /* --------------------------------------------------------------- */
  /* Tracking                                                         */
  /* --------------------------------------------------------------- */

  /**
   * One measured read per frame, at most, and only while the capsule has
   * somewhere to be. Everything else the capsule does is a CSS variable
   * written by the shared runtime — no React render is involved in movement.
   */
  useEffect(() => {
    if (pathname !== '/') return;
    const node = rootRef.current;
    if (!node) return;

    let frames = 0;

    return rig.bindPaint(node, (el, r) => {
      const element = el as HTMLElement;
      frames += 1;

      /* Settled capsules do not need a layout read every frame. */
      const moving = !r.settled('x', 0.5) || !r.settled('y', 0.5);
      if (moving || frames % 4 === 0) {
        const dockId = dockRef.current;
        const target = dockId === 'bay' ? null : env.dockElement(dockId);
        const small = viewport === 'mobile';
        const bay = small ? BAY_SIZE_SMALL : BAY_SIZE;

        if (target && target.isConnected) {
          const rect = target.getBoundingClientRect();
          const onScreen =
            rect.bottom > 8 && rect.top < window.innerHeight - 8 && rect.width > 0;
          if (onScreen) {
            r.set('x', rect.left + rect.width / 2, 'mechanical', 0.34);
            r.set('y', rect.top + rect.height / 2, 'mechanical', 0.34);
            r.set('w', Math.max(72, rect.width), 'mechanical', 0.28);
            r.set('h', Math.max(38, rect.height), 'mechanical', 0.28);
            r.set('seated', 1, 'mechanical');
          } else {
            parkInBay(r, bay, small);
          }
        } else {
          parkInBay(r, bay, small);
        }
      }

      const width = r.get('w');
      const height = r.get('h');
      element.style.setProperty('--cap-w', `${width.toFixed(2)}px`);
      element.style.setProperty('--cap-h', `${height.toFixed(2)}px`);
      element.style.setProperty(
        '--cap-x',
        `${(r.get('x') - width / 2 + r.get('refuse') * -14).toFixed(2)}px`,
      );
      element.style.setProperty('--cap-y', `${(r.get('y') - height / 2).toFixed(2)}px`);
      element.style.setProperty('--cap-seated', r.get('seated').toFixed(3));
      element.style.setProperty('--cap-refuse', r.get('refuse').toFixed(3));
    });
  }, [dockRef, env, pathname, rig, viewport]);

  /* A refusal is felt, not announced: the capsule is physically pushed back
     from the gate and held there until the fault is cleared. */
  useEffect(() => {
    if (status === 'blocked') {
      rig.set('refuse', 1, 'failure');
      rig.impulse('refuse', 2.4);
    } else {
      rig.set('refuse', 0, 'recovery');
    }
  }, [rig, status]);

  useEffect(() => {
    const wake = () => rig.invalidate();
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake);
    return () => {
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', wake);
    };
  }, [rig]);

  const inspect = useCallback(() => setInspecting((open) => !open), []);

  if (pathname !== '/') return null;

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-status={status}
      data-tone={tone}
      data-inspecting={inspecting || undefined}
      data-warned={marks.warned || undefined}
      data-cleared={marks.cleared || undefined}
      data-sealed={marks.sealed || undefined}
      data-degraded={marks.degraded || undefined}
      data-approved={marks.approved || undefined}
      data-capsule-root=""
      style={{ viewTransitionName: 'release-capsule' } as React.CSSProperties}
    >
      <button
        type="button"
        className={styles.body}
        aria-expanded={inspecting}
        aria-label={`Release capsule, build ${identity.buildId}. Status ${CAPSULE_STATUS_LABEL[status].toLowerCase()}. Inspect.`}
        onClick={inspect}
      >
        <svg className={styles.shell} viewBox="0 0 160 80" aria-hidden="true">
          {/* docking lugs — the capsule seats into a chamber, it does not float */}
          <g className={styles.lugs}>
            <rect x="4" y="26" width="8" height="28" rx="1" />
            <rect x="148" y="26" width="8" height="28" rx="1" />
          </g>

          {/* machined shell */}
          <path
            className={styles.hull}
            d="M20 8 H140 L152 20 V60 L140 72 H20 L8 60 V20 Z"
          />
          <path
            className={styles.hullEdge}
            d="M20 8 H140 L152 20 V60 L140 72 H20 L8 60 V20 Z"
          />

          {/* ribs — a carrier is stiffened, not smooth */}
          <g className={styles.ribs}>
            <path d="M46 12 V68" />
            <path d="M114 12 V68" />
          </g>

          {/* status strip */}
          <rect className={styles.strip} x="20" y="14" width="8" height="52" rx="1" />

          {/* etched plate */}
          <g className={styles.plate}>
            <text x="56" y="34" className={styles.etchTitle}>RELEASE</text>
            <text x="56" y="50" className={styles.etchBuild}>{identity.buildId}</text>
          </g>

          {/* operational indicators */}
          <g className={styles.lamps}>
            <circle className={styles.lampA} cx="132" cy="26" r="3.4" />
            <circle className={styles.lampB} cx="132" cy="40" r="3.4" />
            <circle className={styles.lampC} cx="132" cy="54" r="3.4" />
          </g>

          {/* inspection marks — history, applied only once earned */}
          <g className={styles.stamps}>
            <path className={styles.stampWarn} d="M62 60 h16 M70 56 v8" />
            <path className={styles.stampSeal} d="M84 58 l5 5 l9 -11" />
          </g>
        </svg>

        <span className={styles.scan} aria-hidden="true" />
      </button>

      <div className={styles.tag} aria-hidden={!inspecting}>
        <p className={styles.tagKicker}>{identity.name}</p>
        <p className={styles.tagSubject}>{identity.subject}</p>
        <p className={styles.tagBuild}>{identity.build}</p>
        <p className={styles.tagStatus} data-tone={tone}>
          {CAPSULE_STATUS_LABEL[status]}
        </p>
        {inspecting ? (
          <dl className={styles.tagRecord}>
            <div>
              <dt>Gate history</dt>
              <dd>
                {marks.warned
                  ? marks.cleared
                    ? 'Refused, then remediated'
                    : 'Refused — held at a gate'
                  : 'No refusal recorded'}
              </dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>
                {marks.approved
                  ? 'Production — accepted'
                  : marks.sealed
                    ? 'Deployed — promotion seal applied'
                    : 'Not yet deployed'}
              </dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd>{marks.degraded ? 'Degraded' : 'Stable'}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  );
}

function parkInBay(
  r: { set: (n: string, v: number, f?: 'mechanical' | 'hydraulic') => void },
  bay: { w: number; h: number },
  small: boolean,
) {
  const railGap = small ? 108 : 84;
  r.set('x', window.innerWidth - bay.w / 2 - (small ? 14 : 26), 'mechanical');
  r.set('y', window.innerHeight - bay.h / 2 - railGap, 'mechanical');
  r.set('w', bay.w, 'mechanical');
  r.set('h', bay.h, 'mechanical');
  r.set('seated', 0, 'mechanical');
}

/**
 * A place the capsule can be. Plates place one of these where the release
 * belongs in their drawing; the capsule finds it and seats into it.
 */
export function CapsuleDock({
  id,
  className,
  label,
}: {
  id: CapsuleDockId;
  className?: string;
  label?: string;
}) {
  const env = useEnvironment();
  const ref = useCallback(
    (node: HTMLDivElement | null) => env.registerDock(id, node),
    [env, id],
  );

  return (
    <div
      ref={ref}
      className={`${styles.dock}${className ? ` ${className}` : ''}`}
      data-capsule-dock={id}
      data-occupied={env.dock === id || undefined}
      aria-hidden="true"
    >
      {label ? <span className={styles.dockLabel}>{label}</span> : null}
    </div>
  );
}
