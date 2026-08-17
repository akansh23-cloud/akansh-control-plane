import Link from 'next/link';
import styles from './not-found.module.css';

export const metadata = {
  title: 'Dry chamber',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main id="main" className={styles.wrap}>
      <div className={styles.inner}>
        <p className="u-mark">Plate — · Not on the drawing set</p>

        <svg
          className={styles.svg}
          viewBox="0 0 460 260"
          role="img"
          aria-label="An empty lock chamber with both gates shut and no water in it."
        >
          <defs>
            <pattern
              id="nf-hatch"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="8"
                stroke="var(--rule)"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          {/* chamber floor and walls */}
          <path
            d="M70 40 L70 210 L390 210 L390 40"
            fill="url(#nf-hatch)"
            stroke="var(--bone)"
            strokeWidth="2"
          />

          {/* the empty bed */}
          <line
            x1="70"
            y1="210"
            x2="390"
            y2="210"
            stroke="var(--bone)"
            strokeWidth="3"
          />

          {/* both gates shut */}
          <g stroke="var(--bone)" strokeWidth="2" fill="var(--panel-2)">
            <rect x="62" y="40" width="16" height="170" />
            <rect x="382" y="40" width="16" height="170" />
          </g>

          {/* gate paint */}
          <g fill="var(--signal-2)">
            <rect x="62" y="66" width="16" height="6" />
            <rect x="382" y="66" width="16" height="6" />
          </g>

          {/* dry-bed annotation */}
          <line
            x1="120"
            y1="210"
            x2="120"
            y2="150"
            stroke="var(--muted)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          <text
            x="128"
            y="146"
            fontFamily="var(--font-data)"
            fontSize="10"
            letterSpacing="1.4"
            fill="var(--muted)"
          >
            NO WATER
          </text>
        </svg>

        <h1 className={styles.title}>
          This chamber is dry.
        </h1>
        <p className={styles.prose}>
          Whatever you were looking for is not on this drawing set. The gates
          upstream are shut and nothing is coming through here.
        </p>

        <div className={styles.links}>
          <Link className={styles.primary} href="/">
            Back to the headwater
          </Link>
          <Link className={styles.secondary} href="/resume">
            Read the résumé
          </Link>
        </div>
      </div>
    </main>
  );
}
