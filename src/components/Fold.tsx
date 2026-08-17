'use client';

import type { ReactNode } from 'react';
import { useViewport } from '@/lib/motion';
import styles from './Fold.module.css';

type FoldProps = {
  label: string;
  /** Short count or hint shown next to the label while closed. */
  hint?: string;
  children: ReactNode;
};

/**
 * Secondary reference material, folded away on a phone.
 *
 * The page had grown to fifteen phone screens, most of it lists that support
 * an argument rather than making one. Those lists are still here and still
 * indexed — this is a native `<details>`, so it is keyboard operable, it is in
 * the accessibility tree, and browser find-in-page opens it — but on a phone
 * they start closed, and on a wider screen where the room exists they start
 * open. Nothing is hidden from a reader who wants it, and nothing is between a
 * reader and the point.
 */
export function Fold({ label, hint, children }: FoldProps) {
  const viewport = useViewport();

  return (
    <details className={styles.fold} open={viewport !== 'mobile'}>
      <summary className={styles.summary}>
        <span className={styles.label}>{label}</span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
        <span className={styles.chev} aria-hidden="true" />
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
