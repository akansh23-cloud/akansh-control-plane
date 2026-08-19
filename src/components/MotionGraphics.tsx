'use client';

import { useEffect, useRef } from 'react';
import styles from './MotionGraphics.module.css';

const STAGES = [
  'headwater',
  'flight',
  'refit',
  'basin',
  'split',
  'gauges',
  'watch',
  'vault',
  'tidewater',
] as const;

type Stage = (typeof STAGES)[number];

const LABELS: Record<Stage, string> = {
  headwater: 'SYSTEM / COMMISSIONING',
  flight: 'RELEASE / PROPAGATION',
  refit: 'PLATFORM / RECONSTRUCTION',
  basin: 'GITOPS / RECONCILIATION',
  split: 'TRAFFIC / EXTRACTION',
  gauges: 'TELEMETRY / CORRELATION',
  watch: 'INCIDENT / CONTAINMENT',
  vault: 'EVIDENCE / VERIFICATION',
  tidewater: 'PROFILE / ARRIVAL',
};

/**
 * Persistent motion-graphics layer for the full portfolio journey.
 *
 * React never renders per frame. IntersectionObserver only changes the current
 * semantic chapter; CSS owns the transitions and one-shot motion inside the
 * corresponding SVG scene. This keeps the page aligned with MOTION.md: motion
 * explains system behaviour instead of becoming a decorative wallpaper.
 */
export function MotionGraphics() {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const label = labelRef.current;
    if (!root || !label) return;

    let active: Stage = 'headwater';
    let activeIndex = 0;

    const activate = (next: Stage) => {
      if (next === active) return;
      const nextIndex = STAGES.indexOf(next);
      root.dataset.direction = nextIndex >= activeIndex ? 'down' : 'up';
      root.dataset.stage = next;
      label.textContent = LABELS[next];
      active = next;
      activeIndex = nextIndex;
    };

    const observers = STAGES.map((stage) => {
      const section = document.getElementById(stage);
      if (!section) return null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) activate(stage);
        },
        {
          // A narrow strip around the reading line: motion changes only when a
          // chapter becomes the thing the reader is actually looking at.
          rootMargin: '-38% 0px -38% 0px',
          threshold: 0.01,
        },
      );

      observer.observe(section);
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer?.disconnect());
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles.field}
      data-stage="headwater"
      data-direction="down"
      aria-hidden="true"
    >
      <div className={styles.caption}>
        <span className={styles.captionIndex}>MOTION FIELD</span>
        <span ref={labelRef}>{LABELS.headwater}</span>
      </div>

      <svg
        className={styles.canvas}
        viewBox="0 0 960 720"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="motionFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset="0.48" stopColor="currentColor" stopOpacity="0.7" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="motionPulse">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.48" />
            <stop offset="0.35" stopColor="currentColor" stopOpacity="0.12" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <filter id="motionSoft">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        <g className={styles.grid}>
          {Array.from({ length: 13 }, (_, i) => (
            <line key={`v-${i}`} x1={80 + i * 64} x2={80 + i * 64} y1="60" y2="660" />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`h-${i}`} x1="80" x2="880" y1={104 + i * 64} y2={104 + i * 64} />
          ))}
        </g>

        {/* HEADWATER — commissioning / system comes online */}
        <g className={`${styles.scene} ${styles.headwater}`}>
          <circle className={styles.softPulse} cx="706" cy="352" r="190" />
          <circle className={styles.orbitSlow} cx="706" cy="352" r="150" />
          <circle className={styles.orbitFast} cx="706" cy="352" r="106" />
          <circle className={styles.orbitThin} cx="706" cy="352" r="61" />
          <polygon
            className={styles.core}
            points="706,302 749,327 749,377 706,402 663,377 663,327"
          />
          <path className={styles.feedLine} d="M120 228 H362 L474 352 H661" />
          <path className={styles.feedLineAlt} d="M120 476 H362 L474 352" />
          <g className={styles.commissionTicks}>
            <line x1="516" y1="191" x2="547" y2="218" />
            <line x1="544" y1="512" x2="568" y2="480" />
            <line x1="821" y1="221" x2="796" y2="246" />
            <line x1="844" y1="469" x2="811" y2="447" />
          </g>
          <g className={styles.packetRow}>
            <circle cx="188" cy="228" r="5" />
            <circle cx="260" cy="228" r="3" />
            <circle cx="188" cy="476" r="4" />
          </g>
        </g>

        {/* FLIGHT — a release climbing trust gates */}
        <g className={`${styles.scene} ${styles.flight}`}>
          <path className={styles.flightRail} d="M704 618 V104" />
          {[154, 254, 354, 454, 554].map((y, i) => (
            <g key={y} className={`${styles.gate} ${styles[`gate${i + 1}`]}`}>
              <line x1="626" x2="688" y1={y} y2={y} />
              <line x1="720" x2="782" y1={y} y2={y} />
              <rect x="689" y={y - 11} width="30" height="22" rx="2" />
            </g>
          ))}
          <g className={styles.releasePacket}>
            <rect x="691" y="582" width="26" height="26" rx="3" />
            <circle cx="704" cy="595" r="4" />
          </g>
          <path className={styles.flightTrace} d="M504 594 C556 555 565 483 620 448" />
          <path className={styles.flightTrace} d="M497 334 C554 321 575 272 621 255" />
          <circle className={styles.pressureRing} cx="704" cy="354" r="42" />
          <circle className={styles.pressureRingTwo} cx="704" cy="354" r="42" />
        </g>

        {/* REFIT — old and new infrastructure separate across the seam */}
        <g className={`${styles.scene} ${styles.refit}`}>
          <line className={styles.refitSeam} x1="632" y1="104" x2="632" y2="616" />
          <g className={styles.oldStack}>
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i} transform={`translate(425 ${160 + i * 86})`}>
                <rect width="158" height="54" rx="3" />
                <line x1="18" x2="139" y1="18" y2="18" />
                <line x1="18" x2="102" y1="34" y2="34" />
              </g>
            ))}
          </g>
          <g className={styles.newStack}>
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i} transform={`translate(682 ${160 + i * 86})`}>
                <rect width="158" height="54" rx="3" />
                <circle cx="24" cy="27" r="7" />
                <line x1="46" x2="138" y1="18" y2="18" />
                <line x1="46" x2="113" y1="35" y2="35" />
              </g>
            ))}
          </g>
          <g className={styles.refitVectors}>
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={i} d={`M584 ${187 + i * 86} H676`} />
            ))}
          </g>
        </g>

        {/* BASIN — Git desired state propagates to the cluster */}
        <g className={`${styles.scene} ${styles.basin}`}>
          <g className={styles.gitNode}>
            <circle cx="462" cy="354" r="58" />
            <circle cx="462" cy="354" r="10" />
            <line x1="462" x2="462" y1="296" y2="412" />
            <line x1="406" x2="518" y1="354" y2="354" />
          </g>
          <path className={styles.gitFlow} d="M522 354 H646" />
          <g className={styles.clusterNodes}>
            {[
              [690, 238],
              [774, 238],
              [690, 322],
              [774, 322],
              [690, 406],
              [774, 406],
              [690, 490],
              [774, 490],
            ].map(([x, y], i) => (
              <g key={i} className={styles.clusterNode} style={{ '--i': i } as React.CSSProperties}>
                <rect x={x} y={y} width="52" height="52" rx="5" />
                <circle cx={x + 26} cy={y + 26} r="5" />
              </g>
            ))}
          </g>
          <path className={styles.reconcileArc} d="M807 530 C882 466 885 262 806 194" />
          <path className={styles.reconcileArrow} d="M807 194 l-17 3 10 14" />
          <circle className={styles.commitPulse} cx="462" cy="354" r="77" />
        </g>

        {/* SPLIT — a monolith fans out, then traffic reroutes */}
        <g className={`${styles.scene} ${styles.split}`}>
          <g className={styles.monolith}>
            <rect x="446" y="297" width="116" height="116" rx="4" />
            <line x1="466" x2="542" y1="328" y2="328" />
            <line x1="466" x2="542" y1="355" y2="355" />
            <line x1="466" x2="526" y1="382" y2="382" />
          </g>
          <path className={styles.serviceBus} d="M563 355 H640" />
          {[
            [688, 153],
            [790, 205],
            [698, 285],
            [804, 360],
            [697, 438],
            [790, 514],
            [685, 574],
          ].map(([x, y], i) => (
            <g key={i} className={styles.serviceNode} style={{ '--i': i } as React.CSSProperties}>
              <path d={`M640 355 C658 355 653 ${y} ${x - 16} ${y}`} />
              <rect x={x} y={y - 22} width="58" height="44" rx="4" />
              <circle cx={x + 15} cy={y} r="4" />
            </g>
          ))}
          <path className={styles.reroute} d="M720 284 C852 281 868 430 742 440" />
          <circle className={styles.failedService} cx="727" cy="285" r="35" />
        </g>

        {/* GAUGES — relationships become visible as correlated waves */}
        <g className={`${styles.scene} ${styles.gauges}`}>
          {[180, 296, 412, 528].map((y, i) => (
            <g key={y} className={styles.signalLane} style={{ '--i': i } as React.CSSProperties}>
              <line x1="430" x2="844" y1={y} y2={y} />
              <polyline
                points={`430,${y} 488,${y - 12} 546,${y + 8} 604,${y - 22 - i * 3} 662,${y + 17} 720,${y - 7} 780,${y + 10} 844,${y}`}
              />
              <circle cx="604" cy={y - 22 - i * 3} r="5" />
            </g>
          ))}
          <line className={styles.correlationLine} x1="604" x2="604" y1="124" y2="580" />
          <circle className={styles.correlationPulse} cx="604" cy="354" r="116" />
          <circle className={styles.correlationPulseTwo} cx="604" cy="354" r="116" />
        </g>

        {/* WATCH — anomaly, containment, recovery */}
        <g className={`${styles.scene} ${styles.watch}`}>
          <line className={styles.watchAxis} x1="410" x2="848" y1="540" y2="540" />
          <polyline
            className={styles.watchSignal}
            points="410,438 462,431 514,440 566,426 618,434 652,423 681,278 710,431 760,439 808,429 848,436"
          />
          <line className={styles.incidentMarker} x1="681" x2="681" y1="198" y2="548" />
          <circle className={styles.containmentRing} cx="681" cy="278" r="42" />
          <circle className={styles.containmentRingTwo} cx="681" cy="278" r="42" />
          <path className={styles.recoveryPath} d="M710 431 C748 390 784 385 840 403" />
          <g className={styles.signalFlags}>
            <rect x="504" y="482" width="68" height="24" rx="2" />
            <rect x="648" y="160" width="68" height="24" rx="2" />
            <rect x="760" y="482" width="68" height="24" rx="2" />
          </g>
        </g>

        {/* VAULT — claims resolve into a checksum / evidence seal */}
        <g className={`${styles.scene} ${styles.vault}`}>
          <circle className={styles.vaultRingOuter} cx="692" cy="354" r="164" />
          <circle className={styles.vaultRing} cx="692" cy="354" r="124" />
          <circle className={styles.vaultRingInner} cx="692" cy="354" r="82" />
          <path className={styles.checkMark} d="M646 355 l30 31 65 -77" />
          <g className={styles.hashBars}>
            {Array.from({ length: 18 }, (_, i) => (
              <line
                key={i}
                x1={492 + i * 22}
                x2={492 + i * 22}
                y1={554 - ((i * 17) % 44)}
                y2="594"
              />
            ))}
          </g>
          <path className={styles.evidenceLink} d="M434 236 H534 L586 291" />
          <path className={styles.evidenceLink} d="M434 472 H534 L586 417" />
          <circle className={styles.evidenceNode} cx="434" cy="236" r="9" />
          <circle className={styles.evidenceNode} cx="434" cy="472" r="9" />
        </g>

        {/* TIDEWATER — tools, credentials and contact converge */}
        <g className={`${styles.scene} ${styles.tidewater}`}>
          <circle className={styles.arrivalOrbit} cx="700" cy="356" r="160" />
          <circle className={styles.arrivalOrbitInner} cx="700" cy="356" r="102" />
          <circle className={styles.arrivalCore} cx="700" cy="356" r="34" />
          {[
            [700, 156],
            [835, 214],
            [874, 354],
            [827, 500],
            [700, 554],
            [568, 500],
            [526, 354],
            [568, 214],
          ].map(([x, y], i) => (
            <g key={i} className={styles.arrivalNode} style={{ '--i': i } as React.CSSProperties}>
              <circle cx={x} cy={y} r="15" />
              <line x1={x} y1={y} x2="700" y2="356" />
            </g>
          ))}
          <path className={styles.arrivalBeam} d="M416 356 H666" />
          <circle className={styles.arrivalPulse} cx="700" cy="356" r="58" />
        </g>

        <rect className={styles.frame} x="82" y="62" width="796" height="596" rx="8" />
      </svg>
    </div>
  );
}
