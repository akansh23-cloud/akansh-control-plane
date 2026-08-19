'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useEnvironment } from '@/components/system/Environment';
import { lenses, xrayNote } from '@/content/xray';
import styles from './XRayLayer.module.css';

/**
 * INFRASTRUCTURE X-RAY.
 *
 * Hold X and the interface becomes semi-transparent while what is underneath
 * it is drawn: component boundaries, what each region is responsible for, and
 * how it relates to the one next to it.
 *
 * The discipline is in what it does *not* do. It does not label everything, it
 * does not invent an internals diagram for regions that do not have one, and
 * it never shows more than a handful of annotations at once — the ones nearest
 * the middle of the screen, which are the ones being looked at.
 *
 * Any element opts in by declaring what it is:
 *
 *   data-xray="network security"   which lenses reveal it
 *   data-xray-label="API gateway"  what it is
 *   data-xray-duty="Resolves…"     what it is responsible for
 */

type Region = {
  id: string;
  label: string;
  duty: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Distance from the middle of the viewport — used to pick what to label. */
  weight: number;
};

const MAX_LABELS = 6;

export function XRayLayer() {
  const pathname = usePathname();
  const env = useEnvironment();
  const [regions, setRegions] = useState<Region[]>([]);

  const active = env.xray && pathname === '/';

  useEffect(() => {
    /* When X-Ray is down the component renders nothing, so stale regions are
       harmless — and clearing them here would be a synchronous setState in an
       effect, which is exactly the cascading-render pattern this codebase
       avoids everywhere else. */
    if (!active) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>('[data-xray]'),
      ).filter((node) => (node.dataset.xray ?? '').split(/\s+/).includes(env.lens));

      const midY = window.innerHeight / 2;
      const found: Region[] = [];

      nodes.forEach((node, index) => {
        const rect = node.getBoundingClientRect();
        if (rect.width < 40 || rect.height < 24) return;
        if (rect.bottom < 40 || rect.top > window.innerHeight - 40) return;
        found.push({
          id: `${node.dataset.xrayLabel ?? 'region'}-${index}`,
          label: node.dataset.xrayLabel ?? 'Region',
          duty: node.dataset.xrayDuty ?? '',
          x: Math.max(2, rect.left),
          y: Math.max(2, rect.top),
          w: Math.min(window.innerWidth - 4, rect.width),
          h: Math.min(window.innerHeight - 4, rect.height),
          weight: Math.abs(rect.top + rect.height / 2 - midY),
        });
      });

      found.sort((a, b) => a.weight - b.weight);
      setRegions(found.slice(0, 14));
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [active, env.lens]);

  if (!active) return null;

  const lens = lenses.find((item) => item.id === env.lens) ?? lenses[0];

  return (
    <div className={styles.root} aria-hidden="true" data-lens={env.lens}>
      <svg className={styles.field} width="100%" height="100%">
        {regions.map((region, index) => (
          <g key={region.id} className={styles.region} style={{ '--i': index } as React.CSSProperties}>
            <rect
              className={styles.box}
              x={region.x}
              y={region.y}
              width={region.w}
              height={region.h}
              rx="2"
            />
            {/* corner ticks — a boundary, not a highlight */}
            <path
              className={styles.corner}
              d={corners(region.x, region.y, region.w, region.h)}
            />
            {index < MAX_LABELS ? (
              <>
                <path
                  className={styles.leader}
                  d={`M${region.x} ${region.y} l-14 -10`}
                />
                <text className={styles.label} x={region.x - 16} y={region.y - 14}>
                  {region.label.toUpperCase()}
                </text>
                {region.duty ? (
                  <text className={styles.duty} x={region.x - 16} y={region.y - 2}>
                    {region.duty}
                  </text>
                ) : null}
              </>
            ) : null}
          </g>
        ))}
      </svg>

      <div className={styles.legend}>
        <p className={styles.lens}>X-RAY · {lens.name.toUpperCase()}</p>
        <p className={styles.question}>{lens.question}</p>
        <ul className={styles.keys}>
          {lenses.map((item) => (
            <li key={item.id} data-on={item.id === env.lens || undefined}>
              <span>{item.key}</span>
              {item.name}
            </li>
          ))}
        </ul>
        <p className={styles.note}>{xrayNote}</p>
      </div>
    </div>
  );
}

/** Four corner ticks rather than a full outline — reads as a datum, not a box. */
function corners(x: number, y: number, w: number, h: number) {
  const t = Math.min(14, w / 4, h / 4);
  return [
    `M${x} ${y + t} V${y} H${x + t}`,
    `M${x + w - t} ${y} H${x + w} V${y + t}`,
    `M${x + w} ${y + h - t} V${y + h} H${x + w - t}`,
    `M${x + t} ${y + h} H${x} V${y + h - t}`,
  ].join(' ');
}
