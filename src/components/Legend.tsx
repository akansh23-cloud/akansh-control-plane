'use client';

import { useEffect, useRef, useState } from 'react';
import {
  contact,
  defaultDepth,
  depthModes,
  plates,
  profile,
  scanFacts,
  site,
  type DepthMode,
} from '@/content';
import styles from './Legend.module.css';

/**
 * The key plate — and the fast path.
 *
 * A recruiter has under a minute. Rather than hiding that behind a mode
 * switch, the index is a permanent bar at the foot of the page: it always
 * shows where you are, and it always has the résumé and an email address one
 * tap away. Opening it gives the whole 60-second scan without scrolling the
 * site at all.
 *
 * It also marks the dominant chapter with `data-current`, which is what the
 * thin waterway down the left of the page follows.
 */
export function Legend() {
  const [open, setOpen] = useState(false);
  const [depth, setDepth] = useState<DepthMode>(defaultDepth);
  const [current, setCurrent] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  /* Depth is published on the document element, so progressive disclosure is
     one CSS attribute rather than a second copy of the application. The server
     renders the engineer view; nothing is hidden before hydration. */
  useEffect(() => {
    document.documentElement.dataset.depth = depth;
    return () => {
      delete document.documentElement.dataset.depth;
    };
  }, [depth]);

  useEffect(() => {
    const sections = plates
      .map((p) => document.getElementById(p.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = plates.findIndex((p) => p.id === visible.target.id);
        if (index >= 0) {
          sections.forEach((section) =>
            section.toggleAttribute('data-current', section === visible.target),
          );
          setCurrent(index);
        }
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.2, 0.6] },
    );

    sections.forEach((s) => observer.observe(s));
    return () => {
      observer.disconnect();
      sections.forEach((section) => section.removeAttribute('data-current'));
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onClick);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onClick);
    };
  }, [open]);

  const plate = plates[current];

  return (
    <div className={styles.root}>
      <div
        id="key-plate"
        ref={panelRef}
        className={styles.panel}
        data-open={open || undefined}
        hidden={!open}
        role="dialog"
        aria-modal="false"
        aria-labelledby="key-plate-title"
        tabIndex={-1}
      >
        <div className={styles.panelInner}>
          <div className={styles.head}>
            <p id="key-plate-title" className="u-mark">
              The 60-second index
            </p>
            <p className={styles.name}>{profile.name}</p>
            <p className="u-data">{profile.roleLine}</p>
            <p className="u-data">
              {profile.location} · {profile.experience}
            </p>
          </div>

          <dl className={styles.facts}>
            {scanFacts.map((f) => (
              <div key={`${f.label}-${f.value}`} className={styles.fact}>
                <dt className="u-mark">{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>

          <div className={styles.depthNote}>
            <p className="u-mark">Depth</p>
            <p>
              {depth === 'recruiter'
                ? 'Recruiter view: role, outcomes, projects, credentials and the résumé. The simulations are folded away — switch to Engineer to open them.'
                : 'Engineer view: every simulation and the full technical detail. Switch to Recruiter for the sixty-second version of the same content.'}
            </p>
          </div>

          <nav className={styles.nav} aria-label="Sections">
            <p className="u-mark">Go to</p>
            <ol className={styles.plateList}>
              {plates.map((p, i) => (
                <li key={p.id}>
                  <a
                    className={styles.plateLink}
                    href={`#${p.id}`}
                    aria-current={i === current ? 'true' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.plateNo}>{p.no}</span>
                    <span className={styles.plateName}>{p.name}</span>
                    <span className={styles.plateSub}>{p.sub}</span>
                  </a>
                </li>
              ))}
            </ol>

            <div className={`ctl-row ${styles.links}`}>
              <a className="ctl" data-primary="" href={site.resumeRoute}>
                Résumé
              </a>
              <a className="ctl" href={site.resumePath}>
                PDF
              </a>
              <a className="ctl" href={`mailto:${contact.email}`}>
                Email
              </a>
              <a
                className="ctl"
                href={contact.linkedin}
                target="_blank"
                rel="noreferrer noopener"
              >
                LinkedIn
              </a>
              <a
                className="ctl"
                href={contact.github}
                target="_blank"
                rel="noreferrer noopener"
              >
                GitHub
              </a>
            </div>
          </nav>
        </div>
      </div>

      <div className={styles.bar}>
        <button
          ref={buttonRef}
          type="button"
          className={styles.tab}
          aria-expanded={open}
          aria-controls="key-plate"
          onClick={() => setOpen((o) => !o)}
        >
          <span className={styles.tabNo}>{plate.no}</span>
          <span className={styles.tabName}>{plate.name}</span>
          <span className={styles.tabHint}>{open ? 'Close' : 'Index'}</span>
        </button>

        <div className={styles.depth} role="group" aria-label="How much detail to show">
          {depthModes.map((m) => (
            <button
              key={m.id}
              type="button"
              className={styles.depthBtn}
              aria-pressed={depth === m.id}
              onClick={() => setDepth(m.id)}
            >
              <span className={styles.depthLong}>{m.label}</span>
              <span className={styles.depthShort}>
                {m.id === 'recruiter' ? '60s' : 'Full'}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.barLinks}>
          <a className={styles.barLink} href={site.resumeRoute}>
            Résumé
          </a>
          <a className={`${styles.barLink} ${styles.barLinkWide}`} href={`mailto:${contact.email}`}>
            Email
          </a>
        </div>
      </div>
    </div>
  );
}
