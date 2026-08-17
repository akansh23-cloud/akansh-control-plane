'use client';

import {
  cloudnxt,
  completedCredentials,
  contact,
  preparationCredentials,
  primaryEducation,
  profile,
  site,
  skillGroups,
} from '@/content';
import {
  usePointerField,
  usePrefersReducedMotion,
  useRig,
  useRigRoot,
  useTier,
  useVars,
  useViewport,
} from '@/lib/motion';
import styles from './Tidewater.module.css';

/**
 * PLATE 07 — TIDEWATER. Where the work arrives.
 *
 * Toolkit, the earlier role, the degree, what is certified and what is only
 * being studied, and the four ways to reach him. The CKAD line is the one
 * that matters most here: it is preparation, it is labelled as not certified,
 * and a test in this repository fails the build if that label ever goes away.
 */

export function Tidewater() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();

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

  const glowRef = useVars<HTMLDivElement>(rig, {
    '--px': (r) => r.get('pointerX'),
    '--py': (r) => r.get('pointerY'),
    '--pin': (r) => r.get('pointerIn'),
  });

  /* On a tablet the toolkit runs two columns; four would put the group
     headings and their chips on separate visual lines. */
  const toolkitColumns = viewport === 'tablet' ? 2 : viewport === 'mobile' ? 1 : 3;

  return (
    <div ref={rootRef} className={styles.root}>
      <section className={styles.block} aria-labelledby="toolkit">
        <h3 id="toolkit" className={`u-sub ${styles.blockTitle}`}>
          Technical toolkit
        </h3>
        <div
          className={styles.toolkit}
          style={{ '--cols': toolkitColumns } as React.CSSProperties}
        >
          {skillGroups.map((g) => (
            <div key={g.id} className={styles.group}>
              <p className="u-mark">{g.label}</p>
              <ul className={styles.chips}>
                {g.items.map((s) => (
                  <li key={s.name}>{s.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.split}>
        <section className={styles.block} aria-labelledby="credentials">
          <h3 id="credentials" className={`u-sub ${styles.blockTitle}`}>
            Certifications
          </h3>

          <ul className={styles.creds}>
            {completedCredentials.map((c) => (
              <li key={c.id} className={styles.cred} data-status="completed">
                <span className={styles.credName}>{c.name}</span>
                <span className={styles.credMeta}>
                  {c.issuer}
                  {c.code ? ` · ${c.code}` : ''}
                </span>
                <span className={styles.credTag}>Held</span>
              </li>
            ))}

            {preparationCredentials.map((c) => (
              <li key={c.id} className={styles.cred} data-status="preparation">
                <span className={styles.credName}>{c.name}</span>
                <span className={styles.credMeta}>
                  {c.issuer}
                  {c.code ? ` · ${c.code}` : ''}
                </span>
                <span className={styles.credTag}>In preparation — not certified</span>
              </li>
            ))}
          </ul>

          <h3 className={`u-sub ${styles.blockTitle}`}>Education</h3>
          <div className={styles.education}>
            <p className={styles.eduDegree}>{primaryEducation.degree}</p>
            <p className={styles.eduField}>{primaryEducation.field}</p>
            <p className="u-data">
              {primaryEducation.short} · {primaryEducation.location}
            </p>
            <p className="u-data">{primaryEducation.period}</p>
          </div>
        </section>

        <section className={styles.block} aria-labelledby="earlier">
          <h3 id="earlier" className={`u-sub ${styles.blockTitle}`}>
            Earlier
          </h3>
          <div className={styles.role}>
            <p className={styles.roleTitle}>
              {cloudnxt.title}, {cloudnxt.company}
            </p>
            <p className="u-data">
              {cloudnxt.period} · {cloudnxt.location}
            </p>
            <ul className={styles.roleWork}>
              {cloudnxt.work.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <ul className={styles.chips}>
              {cloudnxt.stack.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div
        ref={(node) => {
          pointerRef(node);
          glowRef(node);
        }}
        className={styles.contact}
      >
        <p className="u-mark">Contact</p>
        <p className={`u-display ${styles.email}`}>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </p>
        <p className={styles.contactNote}>
          {profile.location} · open to {profile.roleLine.toLowerCase()} roles.
        </p>
        <nav className={`ctl-row ${styles.links}`} aria-label="Contact and documents">
          <a className="ctl" data-primary="" href={site.resumeRoute}>
            Read the résumé
          </a>
          <a className="ctl" href={site.resumePath}>
            Download PDF
          </a>
          <a className="ctl" href={contact.linkedin} target="_blank" rel="noreferrer noopener">
            LinkedIn
          </a>
          <a className="ctl" href={contact.github} target="_blank" rel="noreferrer noopener">
            GitHub
          </a>
        </nav>
      </div>
    </div>
  );
}
