'use client';

import type { ReactNode } from 'react';
import { plateBriefs } from '@/content';
import { useReveal } from '@/lib/motion';
import styles from './Plate.module.css';

type PlateProps = {
  id: string;
  no: string;
  name: string;
  sub: string;
  title: ReactNode;
  intro?: ReactNode;
  /** Right-hand column of the header: role card, stats, anything compact. */
  aside?: ReactNode;
  tone?: 'ground' | 'deep';
  children: ReactNode;
  /** Small print under the drawing — simulation notices live here. */
  note?: ReactNode;
};

/**
 * A chapter of the works.
 *
 * The previous version of this component gave every chapter a fixed drawing
 * canvas, which is where the empty screens came from. It now has no height of
 * its own at all: it is a header, a body, and a footnote, and it is exactly as
 * tall as those three things. The vertical waterway on the left is the only
 * survivor of the old geometry, because it is one element wide and it is what
 * ties the chapters together as one continuous route.
 */
export function Plate({
  id,
  no,
  name,
  sub,
  title,
  intro,
  aside,
  tone = 'ground',
  children,
  note,
}: PlateProps) {
  const revealHead = useReveal<HTMLElement>();
  /* The chapter in two lines, for the sixty-second reader. It is rendered on
     the server in both modes and revealed by the depth attribute, so the
     recruiter view is disclosure rather than a second application. */
  const brief = plateBriefs[id];

  return (
    <section
      id={id}
      className={`${styles.plate} ${tone === 'deep' ? styles.deep : ''}`}
      aria-labelledby={`${id}-title`}
    >
      <span className={styles.waterway} aria-hidden="true" />

      <div className={styles.inner}>
        <header ref={revealHead} className={styles.head}>
          <p className={styles.cartouche}>
            <span className={styles.no}>{no}</span>
            <span className={styles.name}>{name}</span>
            <span className={styles.sub}>{sub}</span>
          </p>

          <h2 id={`${id}-title`} className={`u-title ${styles.title}`}>
            {title}
          </h2>

          {intro ? <div className={styles.intro}>{intro}</div> : null}
        </header>

        {brief ? (
          <ul className={styles.brief}>
            {brief.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}

        {aside ? <div className={styles.aside}>{aside}</div> : null}

        <div className={styles.body}>{children}</div>

        {note ? <p className={styles.note}>{note}</p> : null}
      </div>
    </section>
  );
}
