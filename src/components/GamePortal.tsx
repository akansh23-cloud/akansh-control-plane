'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './GamePortal.module.css';

export function GamePortal() {
  const pathname = usePathname();
  if (pathname !== '/') return null;

  return (
    <Link className={styles.portal} href="/cloud-ops" aria-label="Play Cloud Ops: Production Under Pressure">
      <span className={styles.beacon} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className={styles.copy}>
        <strong>PLAY CLOUD OPS</strong>
        <small>Production Under Pressure</small>
      </span>
      <span className={styles.arrow} aria-hidden="true">↗</span>
    </Link>
  );
}
