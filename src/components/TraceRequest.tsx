'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PushButton } from '@/components/controls/Physical';
import { useJourney } from '@/components/JourneySystem';
import { useEnvironment } from '@/components/system/Environment';
import { fallbackHop, traceCost, traceHops, traceNote, type Hop } from '@/content/trace';
import {
  useLatest,
  usePrefersReducedMotion,
  useRig,
  useRigRoot,
} from '@/lib/motion';
import styles from './TraceRequest.module.css';

/**
 * TRACE ONE REQUEST.
 *
 * The Split plate shows the architecture. This shows a request *using* it —
 * one pulse, along the real route, stopping at each hop long enough to say
 * what that component is for and what it just did.
 *
 * It is wired to the same state as everything else, so it is never a canned
 * animation: take the extracted service out (here, on the Split plate, or from
 * the chaos panel) and the next request resolves to the monolith instead. The
 * route the pulse takes is a consequence, not a script.
 */

const VIEW = { w: 1000, h: 210 };

/**
 * The route, as vertices rather than as a path string.
 *
 * Everything — the drawn line, the station positions and the pulse — is
 * derived from this one list, so the geometry and the request can never
 * disagree, and none of it requires reading the DOM during render.
 */
type Vertex = [number, number];

const MAIN: Vertex[] = [
  [40, 150], [150, 150], [150, 116], [300, 116], [300, 150], [420, 150],
  [420, 104], [560, 104], [560, 140], [700, 140], [700, 96], [840, 96],
  [840, 132], [960, 132],
];

const BRANCH: Vertex[] = [[560, 140], [560, 186], [840, 186], [840, 132]];

const toPath = (points: Vertex[]) =>
  points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');

const MAIN_PATH = toPath(MAIN);
const FALLBACK_PATH = toPath(BRANCH);

/** Position along a polyline, 0…1, by arc length. */
function pointAt(points: Vertex[], t: number): { x: number; y: number } {
  const spans = points.slice(1).map((point, i) => {
    const previous = points[i];
    return Math.hypot(point[0] - previous[0], point[1] - previous[1]);
  });
  const total = spans.reduce((sum, span) => sum + span, 0);
  let travelled = Math.min(1, Math.max(0, t)) * total;

  for (let i = 0; i < spans.length; i += 1) {
    if (travelled <= spans[i] || i === spans.length - 1) {
      const ratio = spans[i] === 0 ? 0 : Math.min(1, travelled / spans[i]);
      const [ax, ay] = points[i];
      const [bx, by] = points[i + 1];
      return { x: ax + (bx - ax) * ratio, y: ay + (by - ay) * ratio };
    }
    travelled -= spans[i];
  }
  const [x, y] = points[points.length - 1];
  return { x, y };
}

export function TraceRequest() {
  const run = useJourney();
  const env = useEnvironment();
  const reduced = usePrefersReducedMotion();

  const degraded = run.serviceDown || env.active.includes('service');
  const hops: Hop[] = degraded
    ? traceHops.map((hop) => (hop.id === 'service' ? fallbackHop : hop))
    : traceHops;

  const [running, setRunning] = useState(false);
  const [reached, setReached] = useState(-1);
  const [completedDegraded, setCompletedDegraded] = useState<boolean | null>(null);

  const rig = useRig({ channels: { t: { value: 0, family: 'release' } }, reduced });
  const rootRef = useRigRoot<HTMLDivElement>(rig);
  const pulseRef = useRef<SVGGElement | null>(null);
  const timers = useRef<number[]>([]);

  /* Written in an insertion effect, which is how the rest of this codebase
     reads the latest value from a callback that must not be re-created. */
  const hopsRef = useLatest(hops);
  const degradedRef = useLatest(degraded);

  /* The pulse rides the drawn geometry rather than an invented coordinate
     system, so the route and the request can never disagree. */
  useEffect(() => {
    const node = pulseRef.current;
    if (!node) return;
    return rig.bindPaint(node, (el, r) => {
      const t = Math.min(1, Math.max(0, r.get('t')));
      /* A degraded route physically diverges: the pulse leaves the main line
         at the gateway and rejoins it after the monolith has answered. */
      const onBranch = degradedRef.current && t > 0.48 && t < 0.86;
      const point = onBranch
        ? pointAt(BRANCH, (t - 0.48) / 0.38)
        : pointAt(MAIN, t);

      (el as SVGGElement).setAttribute(
        'transform',
        `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`,
      );
    });
  }, [degradedRef, rig]);

  const clear = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const start = useCallback(() => {
    clear();
    setRunning(true);
    setReached(0);
    setCompletedDegraded(null);
    rig.jump('t', 0);

    const list = hopsRef.current;
    const total = reduced ? 600 : 2600;

    /* Deterministic choreography: each hop is reached at its own position on
       the route, so the pulse and the readout are the same event. */
    list.forEach((hop, index) => {
      if (index === 0) return;
      const at = total * hop.at;
      timers.current.push(
        window.setTimeout(() => {
          setReached(index);
          env.bus.emit({
            type: 'TRACE_HOP',
            hop: hop.name,
            degraded: degradedRef.current,
          });
        }, at),
      );
    });

    timers.current.push(
      window.setTimeout(() => {
        setRunning(false);
        setCompletedDegraded(degradedRef.current);
        run.traceRan(degradedRef.current);
        env.bus.emit({ type: 'TRACE_COMPLETE', degraded: degradedRef.current });
      }, total + 120),
    );

    if (reduced) {
      rig.jump('t', 1);
    } else {
      rig.set('t', 1, 'release', total / 1000);
    }
  }, [degradedRef, env, hopsRef, reduced, rig, run]);

  /* The console runs exactly this interaction rather than its own copy: it
     announces the command, and the plate that owns the mechanism performs it. */
  useEffect(() => {
    return env.bus.on('COMMAND', (event) => {
      if (event.type === 'COMMAND' && event.command === 'trace:run') start();
    });
  }, [env.bus, start]);

  useEffect(() => clear, []);

  const active = hops[Math.max(0, reached)];
  const cost = traceCost(hops.slice(0, Math.max(1, reached + 1)));

  return (
    <section
      ref={rootRef}
      className={styles.root}
      data-running={running || undefined}
      data-degraded={degraded || undefined}
      aria-labelledby="trace-title"
      data-xray="network"
      data-xray-label="Request path"
      data-xray-duty="Edge → gateway → policy → service → runtime → data"
    >
      <header className={styles.head}>
        <div>
          <p className="u-mark" id="trace-title">Trace one request</p>
          <p className={styles.lede}>
            One request, along the route it actually takes. Take the extracted
            service out and the gateway resolves it somewhere else instead.
          </p>
        </div>
        <div className={styles.controls}>
          <PushButton tone="signal" onPress={start} disabled={running}>
            {running ? 'In flight' : 'Send a request'}
          </PushButton>
          <p className={styles.route} data-degraded={degraded || undefined}>
            {degraded ? 'Route: fallback to monolith' : 'Route: direct to service'}
          </p>
        </div>
      </header>

      <div className={styles.field}>
        <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className={styles.drawing} aria-hidden="true">
          <path className={styles.track} d={MAIN_PATH} />
          <path className={styles.branch} d={FALLBACK_PATH} data-on={degraded || undefined} />

          {hops.map((hop, index) => {
            const onBranch = degraded && hop.id === 'monolith';
            const point = onBranch ? pointAt(BRANCH, 0.5) : pointAt(MAIN, hop.at);
            const { x, y } = point;
            return (
              <g
                key={hop.id}
                className={styles.station}
                data-passed={index <= reached || undefined}
                data-current={index === reached && running ? '' : undefined}
              >
                <rect x={x - 6} y={y - 6} width="12" height="12" rx="1" />
                <text x={x} y={y - 16} className={styles.stationLabel}>
                  {hop.name.toUpperCase()}
                </text>
              </g>
            );
          })}

          <g ref={pulseRef} className={styles.pulse}>
            <circle r="7" className={styles.pulseHalo} />
            <circle r="3.4" className={styles.pulseCore} />
          </g>
        </svg>
      </div>

      <div className={styles.readout}>
        <div className={styles.current}>
          <p className="lamp" data-state={running ? 'running' : completedDegraded === null ? 'idle' : completedDegraded ? 'hold' : 'ok'}>
            {running ? 'In flight' : completedDegraded === null ? 'Idle' : completedDegraded ? 'Fallback' : 'Complete'}
          </p>
          <p className={styles.currentName}>{reached >= 0 ? active.name : 'No request in flight'}</p>
          <p className={styles.currentDuty}>
            {reached >= 0 ? active.duty : 'Send one and watch each component answer for itself.'}
          </p>
        </div>

        <ol className={styles.hops} role="list">
          {hops.map((hop, index) => (
            <li
              key={hop.id}
              data-passed={index <= reached || undefined}
              data-current={index === reached && running ? '' : undefined}
            >
              <span className={styles.hopName}>{hop.name}</span>
              <span className={styles.hopSays}>
                {index <= reached ? hop.says : '—'}
              </span>
            </li>
          ))}
        </ol>

        <p className={styles.cost}>
          <span className="u-mark">Modelled cost</span>
          {reached >= 0 ? `${cost} units to here` : 'awaiting request'}
        </p>
      </div>

      <p className={styles.note}>{traceNote}</p>
    </section>
  );
}
