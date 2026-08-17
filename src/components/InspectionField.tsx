'use client';

import { usePaint, type Rig } from '@/lib/motion';
import styles from './InspectionField.module.css';

type InspectionFieldProps = {
  rig: Rig;
  width: number;
  height: number;
  label?: string;
  tone?: 'paper' | 'night';
};

/**
 * A restrained surveyor's inspection mark. It only appears for a real fine
 * pointer and follows the hand imperatively through the shared animation rig.
 * It is deliberately not a custom cursor: the browser cursor remains intact
 * and the mark reads as part of the engineering drawing.
 */
export function InspectionField({
  rig,
  width,
  height,
  label = 'INSPECTION DATUM',
  tone = 'paper',
}: InspectionFieldProps) {
  const ref = usePaint<SVGGElement>(rig, (el, r) => {
    const inside = r.get('pointerIn');
    const x = Math.max(18, Math.min(width - 18, r.get('pointerX') * width));
    const y = Math.max(18, Math.min(height - 18, r.get('pointerY') * height));
    const speed = r.get('pointerV');

    el.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    el.setAttribute('opacity', (inside * (0.22 + speed * 0.32)).toFixed(3));
  });

  return (
    <g
      ref={ref}
      className={`${styles.field} ${tone === 'night' ? styles.night : ''}`}
      aria-hidden="true"
      opacity="0"
    >
      <path d="M -34 0 H -8 M 8 0 H 34 M 0 -34 V -8 M 0 8 V 34" />
      <circle cx="0" cy="0" r="4.5" />
      <path d="M -21 -21 L -8 -8 M 21 -21 L 8 -8 M -21 21 L -8 8 M 21 21 L 8 8" />
      <text x="12" y="-13">{label}</text>
    </g>
  );
}
