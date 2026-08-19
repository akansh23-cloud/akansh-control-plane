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
  usePrefersReducedMotion,
  useRig,
  useViewport,
} from '@/lib/motion';
import styles from './ReleaseCapsule.module.css';
import motion from './ReleaseCapsuleMotion.module.css';

/**
 * THE RELEASE CAPSULE.
 *
 * The capsule follows a dock in dock-relative coordinates. Scrolling moves the
 * dock and capsule together immediately; only the offset between old and new
 * docks is animated. Visual life is confined to inner overlays and lights so
 * no decorative animation competes with the root positioning transform.
 */

const BAY_SIZE = { w: 144, h: 70 };
const BAY_SIZE_SMALL = { w: 108, h: 54 };

type DockGeometry = {
  id: CapsuleDockId;
  left: number;
  top: number;
  width: number;
  height: number;
};

type TargetGeometry = {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  seated: boolean;
};

export function ReleaseCapsule() {
  const pathname = usePathname();
  const run = useJourney();
  const env = useEnvironment();
  const {
    capsule: status,
    marks,
    dock,
    dockElement,
  } = env;
  const viewport = useViewport();
  const reduced = usePrefersReducedMotion();
  const [inspecting, setInspecting] = useState(false);

  const identity = capsuleIdentity(run.artifact);
  const tone = CAPSULE_TONE[status];

  const rig = useRig({
    channels: {
      offsetX: { value: 0, family: 'mechanical', tau: 0.18 },
      offsetY: { value: 0, family: 'mechanical', tau: 0.18 },
      offsetW: { value: 0, family: 'mechanical', tau: 0.16 },
      offsetH: { value: 0, family: 'mechanical', tau: 0.16 },
      seated: { value: 0, family: 'mechanical', tau: 0.16 },
      refuse: { value: 0, family: 'failure' },
    },
    reduced,
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const desiredDock: CapsuleDockId =
    viewport === 'mobile' && dock !== 'flight' ? 'bay' : dock;

  const dockGeometry = useRef<DockGeometry | null>(null);
  const targetRef = useRef<TargetGeometry | null>(null);
  const targetKeyRef = useRef('__initial__');
  const placedRef = useRef(false);

  const resolveTarget = useCallback((): TargetGeometry => {
    const small = viewport === 'mobile';
    const bay = small ? BAY_SIZE_SMALL : BAY_SIZE;
    const railGap = small ? 108 : 84;
    const sideGap = small ? 14 : 26;
    const stored = dockGeometry.current;

    if (desiredDock !== 'bay' && stored && stored.id === desiredDock && stored.width > 0) {
      const left = stored.left - window.scrollX;
      const top = stored.top - window.scrollY;
      const width = Math.max(78, stored.width);
      const height = Math.max(42, stored.height);
      const chromeSafeBottom = window.innerHeight - railGap;
      const onScreen =
        top + height > 8 &&
        top < window.innerHeight - 8 &&
        top + height <= chromeSafeBottom;

      if (onScreen) {
        return {
          key: `dock:${desiredDock}`,
          left,
          top,
          width,
          height,
          seated: true,
        };
      }
    }

    return {
      key: 'bay',
      left: window.innerWidth - bay.w - sideGap,
      top: window.innerHeight - bay.h - railGap,
      width: bay.w,
      height: bay.h,
      seated: false,
    };
  }, [desiredDock, viewport]);

  const syncTarget = useCallback(() => {
    if (pathname !== '/') return;
    const next = resolveTarget();
    const node = rootRef.current;
    const keyChanged = next.key !== targetKeyRef.current;

    if (!placedRef.current || !node || reduced) {
      rig.jump('offsetX', 0);
      rig.jump('offsetY', 0);
      rig.jump('offsetW', 0);
      rig.jump('offsetH', 0);
    } else if (keyChanged) {
      /* One layout read only when the capsule changes seats. From that point
         onward the new dock is the base coordinate and the old position is an
         offset that decays to zero. Scroll can move the base without fighting
         the transition. */
      const current = node.getBoundingClientRect();
      rig.jump('offsetX', current.left - next.left);
      rig.jump('offsetY', current.top - next.top);
      rig.jump('offsetW', current.width - next.width);
      rig.jump('offsetH', current.height - next.height);
      rig.set('offsetX', 0, 'mechanical', 0.18);
      rig.set('offsetY', 0, 'mechanical', 0.18);
      rig.set('offsetW', 0, 'mechanical', 0.16);
      rig.set('offsetH', 0, 'mechanical', 0.16);
    }

    targetRef.current = next;
    targetKeyRef.current = next.key;
    placedRef.current = true;
    rig.set('seated', next.seated ? 1 : 0, 'mechanical', 0.16);
    rig.invalidate();
  }, [pathname, reduced, resolveTarget, rig]);

  /* Measure dock geometry only when the dock itself or layout can change it.
     Environment state such as X-Ray, tour, sound and chaos must not tear down
     this observer or transiently unregister the dock. */
  useEffect(() => {
    if (pathname !== '/') return;

    const measure = () => {
      if (desiredDock === 'bay') {
        dockGeometry.current = null;
        syncTarget();
        return;
      }

      const target = dockElement(desiredDock);
      if (!target || !target.isConnected) {
        dockGeometry.current = null;
        syncTarget();
        return;
      }

      const rect = target.getBoundingClientRect();
      dockGeometry.current = {
        id: desiredDock,
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      };
      syncTarget();
    };

    measure();
    const target = desiredDock === 'bay' ? null : dockElement(desiredDock);
    const ro = target && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measure)
      : null;
    if (target) ro?.observe(target);

    window.addEventListener('resize', measure, { passive: true });
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [desiredDock, dockElement, pathname, syncTarget]);

  useEffect(() => {
    if (pathname !== '/') return;
    const node = rootRef.current;
    if (!node) return;

    return rig.bindPaint(node, (el, r) => {
      const target = targetRef.current;
      if (!target) return;
      const element = el as HTMLElement;
      const width = Math.max(1, target.width + r.get('offsetW'));
      const height = Math.max(1, target.height + r.get('offsetH'));
      const x = target.left + r.get('offsetX') - r.get('refuse') * 10;
      const y = target.top + r.get('offsetY');

      element.style.setProperty('--cap-w', `${width.toFixed(2)}px`);
      element.style.setProperty('--cap-h', `${height.toFixed(2)}px`);
      element.style.setProperty('--cap-x', `${x.toFixed(2)}px`);
      element.style.setProperty('--cap-y', `${y.toFixed(2)}px`);
      element.style.setProperty('--cap-seated', r.get('seated').toFixed(3));
      element.style.setProperty('--cap-refuse', r.get('refuse').toFixed(3));
    });
  }, [pathname, rig]);

  useEffect(() => {
    if (status === 'blocked') rig.set('refuse', 1, 'failure');
    else rig.set('refuse', 0, 'recovery', 0.34);
  }, [rig, status]);

  useEffect(() => {
    if (pathname !== '/') return;
    const onScroll = () => syncTarget();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname, syncTarget]);

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
        <svg className={`${styles.shell} ${motion.shellLive}`} viewBox="0 0 160 80" aria-hidden="true">
          <defs>
            <linearGradient id="capsule-shell" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#263b42" />
              <stop offset="48%" stopColor="#16272c" />
              <stop offset="100%" stopColor="#0b171b" />
            </linearGradient>
          </defs>

          <g className={styles.lugs}>
            <rect x="4" y="26" width="8" height="28" rx="1" />
            <rect x="148" y="26" width="8" height="28" rx="1" />
          </g>

          <path
            className={styles.hull}
            d="M20 8 H140 L152 20 V60 L140 72 H20 L8 60 V20 Z"
          />
          <path
            className={styles.hullEdge}
            d="M20 8 H140 L152 20 V60 L140 72 H20 L8 60 V20 Z"
          />
          <path className={styles.chamfer} d="M20 13 H136 L146 23 M14 57 L23 67 H138" />

          <g className={styles.ribs}>
            <path d="M44 12 V68" />
            <path d="M116 12 V68" />
          </g>

          <rect className={styles.strip} x="20" y="14" width="8" height="52" rx="1" />
          <rect className={styles.plateWell} x="51" y="20" width="60" height="38" rx="2" />

          <g className={styles.plate}>
            <text x="58" y="34" className={styles.etchTitle}>RELEASE</text>
            <text x="58" y="50" className={styles.etchBuild}>{identity.buildId}</text>
          </g>

          <g className={styles.lamps}>
            <circle className={styles.lampA} cx="132" cy="26" r="3.4" />
            <circle className={styles.lampB} cx="132" cy="40" r="3.4" />
            <circle className={styles.lampC} cx="132" cy="54" r="3.4" />
          </g>

          <g className={styles.stamps}>
            <path className={styles.stampWarn} d="M62 62 h16 M70 58 v8" />
            <path className={styles.stampSeal} d="M86 60 l5 5 l9 -11" />
          </g>
        </svg>

        <span className={motion.energyRail} aria-hidden="true" />
        <span className={motion.beacon} aria-hidden="true" />
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

export function CapsuleDock({
  id,
  className,
  label,
}: {
  id: CapsuleDockId;
  className?: string;
  label?: string;
}) {
  const { registerDock, dock } = useEnvironment();
  const ref = useCallback(
    (node: HTMLDivElement | null) => registerDock(id, node),
    [id, registerDock],
  );

  return (
    <div
      ref={ref}
      className={`${styles.dock}${className ? ` ${className}` : ''}`}
      data-capsule-dock={id}
      data-occupied={dock === id || undefined}
      aria-hidden="true"
    >
      {label ? <span className={styles.dockLabel}>{label}</span> : null}
    </div>
  );
}
