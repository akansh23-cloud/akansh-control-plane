import { periodicSurface } from '@/lib/geometry';
import styles from './WaterBand.module.css';

/* Same wavelength as the Headwater, so the loop is one wavelength here too. */
const WAVE = 520;
const VB_W = 1200;
const VB_H = 160;
const X = -WAVE * 2;
const W = VB_W + WAVE * 4;

const FILL = periodicSurface({
  x: X, width: W, surfaceY: 30, bottomY: VB_H + 40, amp: 4.4, wavelength: WAVE, phase: 0.6, samples: 120, close: true,
});
const FRONT = periodicSurface({
  x: X, width: W, surfaceY: 29, bottomY: VB_H, amp: 5.2, wavelength: WAVE, phase: 3.9, samples: 120,
});
const REAR = periodicSurface({
  x: X, width: W, surfaceY: 36, bottomY: VB_H, amp: 3.6, wavelength: WAVE, phase: 1.7, samples: 120,
});

/**
 * THE WATER UNDER A PLATE.
 *
 * The dashboard plates — Basin, Split, Gauge House, The Watch — stand on the
 * same water the Headwater and the Flight are drawn with. It is decorative in
 * the strict sense (no information lives here that is not also in the plate),
 * but it is the thing that makes the nine plates one drawing set rather than
 * two illustrations and seven dashboards. The run state tints it: drift in
 * the Basin, a service down in the Split, critical telemetry in Gauge House,
 * a degraded phase in The Watch. All of it is CSS reading attributes the
 * journey already writes on the document element.
 */
export function WaterBand({ plate }: { plate: string }) {
  return (
    <div className={styles.root} data-plate={plate} aria-hidden="true">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" className={styles.svg}>
        <defs>
          <linearGradient id={`wb-${plate}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--band-top)' }} stopOpacity="0.55" />
            <stop offset="100%" style={{ stopColor: 'var(--band-bottom)' }} stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className={styles.mass}>
          <path d={FILL} fill={`url(#wb-${plate})`} />
        </g>
        <g className={styles.rear}>
          <path d={REAR} className={styles.lineRear} />
        </g>
        <g className={styles.front}>
          <path d={FRONT} className={styles.lineFront} />
        </g>
      </svg>
    </div>
  );
}
