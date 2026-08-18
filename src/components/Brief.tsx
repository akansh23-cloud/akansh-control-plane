import {
  barclays,
  careerProject,
  completedCredentials,
  contact,
  evidenceCards,
  mapProject,
  preparationCredentials,
  primaryEducation,
  profile,
  scanFacts,
  site,
} from '@/content';
import styles from './Brief.module.css';

/**
 * THE SIXTY-SECOND BRIEF.
 *
 * Rendered on the server in every mode and revealed by the depth attribute.
 * Every line here already exists somewhere else on the page — this is the same
 * canonical content, gathered, for a reader who is going to give the site one
 * screen and a decision.
 */
export function Brief() {
  /* The strongest outcomes are the claims the vault already backs; taking them
     from there means a claim cannot be promoted here without its evidence. */
  const outcomes = evidenceCards
    .filter((c) => c.kind !== 'credential')
    .slice(0, 5);

  return (
    <section className={styles.brief} aria-labelledby="brief-title">
      <div className={styles.head}>
        <p className="u-mark" id="brief-title">
          The sixty-second brief
        </p>
        <p className={styles.name}>{profile.name}</p>
        <p className={styles.role}>{profile.roleLine}</p>
        <p className="u-data">
          {profile.location} · {profile.experience} · {barclays.title},{' '}
          {barclays.company}
        </p>
        <p className={styles.summary}>{profile.summary}</p>
      </div>

      <div className={styles.block}>
        <p className="u-mark">Stack and scope</p>
        <dl className={styles.facts}>
          {scanFacts.map((f) => (
            <div key={`${f.label}-${f.value}`}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={styles.block}>
        <p className="u-mark">Strongest outcomes</p>
        <ul className={styles.outcomes}>
          {outcomes.map((o) => (
            <li key={o.id}>{o.claim}</li>
          ))}
        </ul>
      </div>

      <div className={styles.block}>
        <p className="u-mark">Projects</p>
        <ul className={styles.projects}>
          <li>
            <span className={styles.projectName}>{mapProject.name}</span>
            <span className={styles.projectLine}>{mapProject.premise}</span>
            <a href={mapProject.repo} target="_blank" rel="noreferrer noopener">
              {mapProject.repoLabel}
            </a>
          </li>
          <li>
            <span className={styles.projectName}>{careerProject.name}</span>
            <span className={styles.projectLine}>{careerProject.premise}</span>
            <a href={careerProject.repo} target="_blank" rel="noreferrer noopener">
              {careerProject.repoLabel}
            </a>
          </li>
        </ul>
      </div>

      <div className={styles.block}>
        <p className="u-mark">Certifications</p>
        <ul className={styles.creds}>
          {completedCredentials.map((c) => (
            <li key={c.id}>
              {c.issuer} {c.code ? `${c.code} — ` : ''}
              {c.name}
            </li>
          ))}
        </ul>
        <p className={styles.prep}>
          In preparation — not certified:{' '}
          {preparationCredentials
            .map((c) => c.code ?? c.name)
            .join(' · ')}
          .
        </p>
        <p className={styles.prep}>
          {primaryEducation.degree}, {primaryEducation.field} —{' '}
          {primaryEducation.short}, {primaryEducation.period}.
        </p>
      </div>

      <div className={`ctl-row ${styles.actions}`}>
        <a className="ctl" data-primary="" href={site.resumeRoute}>
          Résumé
        </a>
        <a className="ctl" href={site.resumePath}>
          Download PDF
        </a>
        <a className="ctl" href={`mailto:${contact.email}`}>
          Email
        </a>
        <a className="ctl" href={contact.linkedin} target="_blank" rel="noreferrer noopener">
          LinkedIn
        </a>
        <a className="ctl" href={contact.github} target="_blank" rel="noreferrer noopener">
          GitHub
        </a>
      </div>
    </section>
  );
}
