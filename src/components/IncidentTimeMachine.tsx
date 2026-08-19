'use client';

import { useMemo, useState } from 'react';
import { useJourney } from '@/components/JourneySystem';
import {
  frameAt,
  readingFor,
  scenario,
  series,
  signals,
  timelineNote,
  timelinePrompt,
  type SignalId,
} from '@/content/timeline';
import styles from './IncidentTimeMachine.module.css';

/**
 * THE INCIDENT TIME MACHINE.
 *
 * The Watch plate asks the reader to name a root cause. This is the half hour
 * that produced the evidence, and dragging through it is the whole point: six
 * signals move *together*, in an order, and the order is the diagnosis.
 *
 * There is no machine learning here and no random metric. Every value is
 * computed from one stated arithmetic — six replicas each opening a pool of
 * twenty against a server that permits ninety connections — so the same
 * position on the scrubber always reads the same, and the reader can check the
 * sums themselves.
 *
 * The diagnosis itself stays in the Watch plate. This does not duplicate it;
 * it is the evidence the diagnosis is made from.
 */

const STEPS = 31;

type ChartGeometry = {
  trace: number[];
  start: number;
  points: string;
};

export function IncidentTimeMachine() {
  const run = useJourney();
  /* 0 = thirty minutes ago, 30 = now. Stored forwards so the slider reads
     left-to-right the way time does. */
  const [position, setPosition] = useState(0);

  const minutesAgo = 30 - position;
  const frame = frameAt(minutesAgo);

  /* Series generation and SVG point construction do not depend on scrubber
     position. Keeping both outside the hot interaction path prevents every
     pointer/keyboard step from rebuilding six 31-point polylines. */
  const charts = useMemo(
    () =>
      signals.reduce<Record<SignalId, ChartGeometry>>(
        (acc, signal) => {
          const trace = series(signal.id, STEPS);
          const max = Math.max(...trace, 1);
          const min = Math.min(...trace, 0);
          const span = Math.max(1, max - min);
          const points = trace
            .map((value, i) => {
              const x = (i / (STEPS - 1)) * 100;
              const y = 26 - ((value - min) / span) * 22;
              return `${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(' ');
          acc[signal.id] = { trace, start: trace[0], points };
          return acc;
        },
        {} as Record<SignalId, ChartGeometry>,
      ),
    [],
  );

  /* Which signal moved first is the answer to the whole scenario, so it is
     derived rather than asserted: the earliest frame at which each signal
     leaves its starting value. */
  const firstMover = useMemo(() => {
    let earliest: { id: SignalId; at: number } | null = null;
    (Object.keys(charts) as SignalId[]).forEach((id) => {
      const { trace, start } = charts[id];
      const index = trace.findIndex((value) => Math.abs(value - start) > start * 0.02);
      if (index > 0 && (!earliest || index < earliest.at)) earliest = { id, at: index };
    });
    return earliest as { id: SignalId; at: number } | null;
  }, [charts]);

  return (
    <section
      className={styles.root}
      aria-labelledby="timeline-title"
      data-xray="state"
      data-xray-label="Incident timeline"
      data-xray-duty="Six signals from one stated arithmetic, over thirty minutes"
    >
      <header className={styles.head}>
        <div>
          <p className="u-mark" id="timeline-title">Incident time machine</p>
          <p className={styles.prompt}>{timelinePrompt}</p>
        </div>
        <p className={styles.clock}>
          <span className={styles.clockValue}>
            {minutesAgo === 0 ? 'NOW' : `T−${String(Math.round(minutesAgo)).padStart(2, '0')}m`}
          </span>
          <span className={styles.clockNote}>
            {scenario.replicasAfter} replicas × pool {scenario.poolPerPod} · server max{' '}
            {scenario.serverMax}
          </span>
        </p>
      </header>

      <div className={styles.scrubber}>
        <label className="u-hidden" htmlFor="incident-scrubber">
          Time, from thirty minutes ago to now
        </label>
        <input
          id="incident-scrubber"
          className={styles.range}
          type="range"
          min={0}
          max={30}
          step={1}
          value={position}
          aria-valuetext={
            minutesAgo === 0 ? 'now' : `${Math.round(minutesAgo)} minutes ago`
          }
          onChange={(event) => setPosition(Number(event.target.value))}
        />
        <div className={styles.ticks} aria-hidden="true">
          {[30, 24, 18, 12, 6, 0].map((mark) => (
            <span
              key={mark}
              className={styles.tick}
              data-major={mark === scenario.scaledAt || undefined}
              style={{ left: `${((30 - mark) / 30) * 100}%` }}
            >
              {mark === 0 ? 'NOW' : `T−${mark}`}
            </span>
          ))}
        </div>
      </div>

      <p className={styles.caption} aria-live="polite">
        {frame.caption}
      </p>

      <ul className={styles.signals}>
        {signals.map((signal) => {
          const chart = charts[signal.id];
          const reading = readingFor(signal.id, frame);
          const moved = Math.abs(reading.value - chart.start) > chart.start * 0.02;
          const isFirst = firstMover?.id === signal.id;

          return (
            <li
              key={signal.id}
              className={styles.signal}
              data-moved={moved || undefined}
              data-first={isFirst || undefined}
            >
              <div className={styles.signalHead}>
                <p className={styles.signalName}>{signal.name}</p>
                <p className={styles.signalValue}>{reading.text}</p>
              </div>

              <svg className={styles.trace} viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
                <polyline className={styles.traceLine} points={chart.points} />
                <line
                  className={styles.traceHead}
                  x1={(position / 30) * 100}
                  x2={(position / 30) * 100}
                  y1="0"
                  y2="30"
                />
              </svg>

              <p className={styles.signalMeaning}>{signal.meaning}</p>
              <p className={styles.signalSource}>{signal.seenIn}</p>
              {isFirst ? <p className={styles.firstMark}>moved first</p> : null}
            </li>
          );
        })}
      </ul>

      <div className={styles.verdict} data-solved={run.incidentSolved || undefined}>
        {run.incidentSolved ? (
          <p>
            <span className={styles.verdictMark}>Root cause found.</span> Pool demand
            crossed the connection limit before anything else moved — and the error
            rate never moved at all, because readiness withheld the pods that could
            not serve.
          </p>
        ) : (
          <p>
            The evidence is here. Name the fault in the incident room below — one
            very reasonable answer is wrong.
          </p>
        )}
      </div>

      <p className={styles.note}>{timelineNote}</p>
    </section>
  );
}
