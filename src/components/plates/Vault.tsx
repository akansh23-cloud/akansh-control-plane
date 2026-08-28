'use client';

import { useCallback, useMemo, useState } from 'react';
import { evidenceCards, evidenceNote } from '@/content';
import {
  usePointerField,
  usePrefersReducedMotion,
  useRig,
  useRigRoot,
  useTier,
  useVars,
  useViewport,
} from '@/lib/motion';
import { LiveEvidence } from '@/components/LiveEvidence';
import styles from './Vault.module.css';

/* Cards whose claim is a public repository get the repository's live state
   under the evidence line. Fetched at build time; never typed by hand. */
const LIVE_REPO: Record<string, string> = {
  map: 'akansh23-cloud/migration-verification',
  split: 'akansh23-cloud/career-autopilot',
  site: 'akansh23-cloud/akansh-control-plane',
};

/**
 * PLATE 08 — THE VAULT. Every strong claim, opened up.
 *
 * A portfolio claim is worth exactly what backs it. Each drawer here follows
 * the same five headings — claim, context, what I did, stack, evidence — and
 * the last one is the one that matters: it says what a reader can actually
 * check, and where the work is confidential it says that instead of
 * substituting a number nobody can verify.
 */

const FILTERS = [
  { id: 'all', label: 'Everything' },
  { id: 'work', label: 'Employed work' },
  { id: 'project', label: 'Personal projects' },
  { id: 'credential', label: 'Credentials' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

export function Vault() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();

  const [filter, setFilter] = useState<FilterId>('all');
  const [open, setOpen] = useState<string | null>(evidenceCards[0].id);

  const rig = useRig({
    channels: {
      pointerX: { value: 0.5, family: 'mechanical' },
      pointerY: { value: 0.5, family: 'mechanical' },
      pointerIn: { value: 0, family: 'mechanical' },
    },
    reduced,
    tier,
  });

  const rootRef = useRigRoot<HTMLDivElement>(rig);
  const pointerRef = usePointerField(rig);

  const faceRef = useVars<HTMLDivElement>(rig, {
    '--px': (r) => r.get('pointerX'),
    '--py': (r) => r.get('pointerY'),
    '--pin': (r) => r.get('pointerIn'),
  });

  const cards = useMemo(
    () => (filter === 'all' ? evidenceCards : evidenceCards.filter((c) => c.kind === filter)),
    [filter],
  );

  const toggle = useCallback((id: string) => {
    setOpen((current) => (current === id ? null : id));
  }, []);

  /* A tablet keeps one drawer column: two columns of drawers at 1024px makes
     the evidence paragraph — the longest text on the plate — 28 characters
     wide. The stack chips are what get two columns instead. */
  const chipColumns = viewport === 'tablet' ? 2 : viewport === 'mobile' ? 1 : 3;

  return (
    <div
      ref={(node) => {
        rootRef(node);
        pointerRef(node);
        faceRef(node);
      }}
      className={styles.root}
      style={{ '--chips': chipColumns } as React.CSSProperties}
    >
      <div className={styles.filters} role="group" aria-label="Filter evidence">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="ctl"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ol className={styles.drawers}>
        {cards.map((c) => {
          const isOpen = open === c.id;
          return (
            <li key={c.id} className={styles.drawer} data-open={isOpen || undefined}>
              <h3 className={styles.claimHead}>
                <button
                  type="button"
                  className={styles.pull}
                  aria-expanded={isOpen}
                  aria-controls={`vault-${c.id}`}
                  onClick={() => toggle(c.id)}
                >
                  <span className={styles.kind} data-kind={c.kind}>
                    {c.kind === 'work' ? 'Employed' : c.kind === 'project' ? 'Project' : 'Awarded'}
                  </span>
                  <span className={styles.claim}>{c.claim}</span>
                  <span className={styles.handle} aria-hidden="true" />
                </button>
              </h3>

              <div id={`vault-${c.id}`} className={styles.body} hidden={!isOpen}>
                <div className={styles.field}>
                  <p className="u-mark">Context</p>
                  <p className={styles.text}>{c.context}</p>
                </div>

                <div className={styles.field}>
                  <p className="u-mark">What I did</p>
                  <ul className={styles.did}>
                    {c.did.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>

                <div className={styles.field}>
                  <p className="u-mark">Stack</p>
                  <ul className={styles.stack}>
                    {c.stack.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className={`${styles.field} ${styles.evidence}`}>
                  <p className="u-mark">Evidence</p>
                  <p className={styles.text}>{c.evidence}</p>
                  {LIVE_REPO[c.id] ? <LiveEvidence repo={LIVE_REPO[c.id]} /> : null}
                  {c.seeAlso ? (
                    <a className={styles.link} href={c.seeAlso.href}>
                      {c.seeAlso.label}
                    </a>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className={styles.note}>{evidenceNote}</p>
    </div>
  );
}
