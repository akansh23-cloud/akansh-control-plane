'use client';

import { useId, useState } from 'react';
import { findTerm } from '@/content/terms';
import styles from './TechTerm.module.css';

/**
 * LIVING ARCHITECTURE TEXT.
 *
 * A technology name that comes apart into the thing it actually is: a
 * component, a responsibility, and a relationship to whatever is next to it.
 * Then it closes again.
 *
 * Used on a handful of terms and no more. If every noun did this the page
 * would be unreadable, so the rule is: only where the *relationship* is the
 * interesting part — Vault and its consumers, Argo CD and drift, Trivy and
 * what it refuses.
 *
 * Underneath it is a button with a popup, so it works on touch and on a
 * keyboard exactly as it works under a pointer.
 */
export function TechTerm({ id, children }: { id: string; children?: React.ReactNode }) {
  const term = findTerm(id);
  const panelId = useId();
  const [open, setOpen] = useState(false);

  if (!term) return <>{children ?? id}</>;

  const label = children ?? term.word;

  return (
    <span className={styles.root} data-open={open || undefined}>
      <button
        type="button"
        className={styles.word}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {/* The letters separate very slightly — a machined part coming apart
            along its seam, not a bouncing animation. */}
        <span className={styles.letters} aria-hidden="true">
          {String(label)
            .split('')
            .map((character, index) => (
              <span
                key={`${character}-${index}`}
                className={styles.letter}
                style={{ '--i': index } as React.CSSProperties}
              >
                {character === ' ' ? '\u00A0' : character}
              </span>
            ))}
        </span>
        <span className="u-hidden">{label} — show architecture</span>
      </button>

      <span id={panelId} className={styles.map} role="tooltip" hidden={!open}>
        <span className={styles.duty}>{term.duty}</span>
        <svg viewBox="0 0 240 92" className={styles.field} aria-hidden="true">
          {term.edges.map((edge) => {
            const from = term.nodes.find((node) => node.id === edge.from);
            const to = term.nodes.find((node) => node.id === edge.to);
            if (!from || !to) return null;
            return (
              <g key={`${edge.from}-${edge.to}`} className={styles.edge}>
                <path d={`M${from.x} ${from.y} L${to.x} ${to.y}`} />
                {edge.carries ? (
                  <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 4}>
                    {edge.carries}
                  </text>
                ) : null}
              </g>
            );
          })}
          {term.nodes.map((node) => (
            <g key={node.id} className={styles.node} data-kind={node.kind}>
              <circle cx={node.x} cy={node.y} r="3.4" />
              <text x={node.x} y={node.y + 13}>{node.label}</text>
            </g>
          ))}
        </svg>
      </span>
    </span>
  );
}
