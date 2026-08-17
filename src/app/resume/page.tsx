import type { Metadata } from 'next';
import Link from 'next/link';
import {
  careerProject,
  cloudnxt,
  completedCredentials,
  education,
  contact,
  barclays,
  mapProject,
  preparationCredentials,
  profile,
  refit,
  scale,
  site,
  skillGroups,
  skillNames,
} from '@/content';
import styles from './resume.module.css';

export const metadata: Metadata = {
  title: 'Résumé',
  description: `Résumé of ${profile.name} — ${profile.roleLine} in ${profile.location}. ${profile.summary}`,
  alternates: { canonical: '/resume' },
  openGraph: {
    title: `Résumé — ${profile.name}`,
    description: profile.summary,
    url: `${site.url}/resume`,
  },
};


export default function ResumePage() {
  return (
    <main id="main" className={styles.sheet}>
      <div className={styles.inner}>
        <nav className={styles.top} aria-label="Résumé actions">
          <Link className={styles.back} href="/">
            <span aria-hidden="true">←</span> The Lockworks
          </Link>
          <a className={styles.download} href={site.resumePath} download>
            Download PDF
          </a>
        </nav>

        <header className={styles.head}>
          <h1 className={styles.name}>{profile.name}</h1>
          <p className={styles.role}>{profile.roleLine}</p>
          <p className={styles.thesis}>{profile.thesis}</p>

          <ul className={styles.contactRow}>
            <li>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </li>
            <li>{profile.location}</li>
            <li>
              <a href={contact.linkedin} target="_blank" rel="noreferrer noopener">
                linkedin.com/in/akansh-mowar
              </a>
            </li>
            <li>
              <a href={contact.github} target="_blank" rel="noreferrer noopener">
                github.com/akansh23-cloud
              </a>
            </li>
          </ul>
        </header>

        <section className={styles.block} aria-labelledby="r-summary">
          <h2 id="r-summary" className={styles.h2}>
            Summary
          </h2>
          <p className={styles.prose}>{profile.summary}</p>
          <p className={styles.prose}>
            {profile.experience} of experience, currently on an enterprise
            banking platform. Comfortable owning a release end to end — pipeline,
            image, chart, secret material, database migration and promotion —
            and applying {profile.practice} to keep the runtime predictable.
          </p>
        </section>

        <section className={styles.block} aria-labelledby="r-experience">
          <h2 id="r-experience" className={styles.h2}>
            Experience
          </h2>

          <article className={styles.role0}>
            <div className={styles.roleHead}>
              <h3 className={styles.roleTitle}>
                {barclays.title} · {barclays.company}
              </h3>
              <p className={styles.roleMeta}>
                {barclays.period} · {barclays.location}
              </p>
            </div>
            <p className={styles.roleContext}>{barclays.context}</p>

            <ul className={styles.scaleRow}>
              <li>
                <strong>{scale.services.value}</strong>
                <span>
                  {scale.services.noun} {scale.services.qualifier}
                </span>
              </li>
              <li>
                <strong>{scale.workloads.value}</strong>
                <span>
                  {scale.workloads.noun} {scale.workloads.qualifier}
                </span>
              </li>
              <li>
                <strong>{scale.stages.value}</strong>
                <span>
                  {scale.stages.noun} {scale.stages.qualifier}
                </span>
              </li>
            </ul>

            <ul className={styles.bullets}>
              {barclays.work.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>

            <p className={styles.stackLine}>
              <span className={styles.stackLabel}>Stack</span>
              {barclays.stack.join(' · ')}
            </p>
          </article>

          <article className={styles.role0}>
            <div className={styles.roleHead}>
              <h3 className={styles.roleTitle}>
                {cloudnxt.title} · {cloudnxt.company}
              </h3>
              <p className={styles.roleMeta}>
                {cloudnxt.period} · {cloudnxt.location}
              </p>
            </div>
            <p className={styles.roleContext}>{cloudnxt.context}</p>
            <ul className={styles.bullets}>
              {cloudnxt.work.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className={styles.block} aria-labelledby="r-modernisation">
          <h2 id="r-modernisation" className={styles.h2}>
            Platform modernisation
          </h2>
          <p className={styles.lede}>
            Five layers replaced under a running service.
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Layer</th>
                <th scope="col">Before</th>
                <th scope="col">After</th>
                <th scope="col">What it bought</th>
              </tr>
            </thead>
            <tbody>
              {refit.map((r) => (
                <tr key={r.id}>
                  <th scope="row">{r.layer}</th>
                  <td>{r.before}</td>
                  <td>{r.after}</td>
                  <td>{r.gain}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.block} aria-labelledby="r-projects">
          <h2 id="r-projects" className={styles.h2}>
            Projects
          </h2>

          <article className={styles.project}>
            <h3 className={styles.projectTitle}>
              {mapProject.name} <span className={styles.kind}>{mapProject.kind}</span>
            </h3>
            <p className={styles.prose}>{mapProject.premise}</p>
            <ul className={styles.bullets}>
              {mapProject.principles.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className={styles.stackLine}>
              <span className={styles.stackLabel}>Stack</span>
              {mapProject.stack.join(' · ')}
            </p>
          </article>

          <article className={styles.project}>
            <h3 className={styles.projectTitle}>
              {careerProject.name}{' '}
              <span className={styles.kind}>{careerProject.kind}</span>
            </h3>
            <p className={styles.prose}>{careerProject.premise}</p>
            <ul className={styles.bullets}>
              <li>
                {careerProject.serviceCount}-service architecture extracted from a
                monolith one service at a time, in a monorepo with per-service
                Dockerfiles and multi-stage builds.
              </li>
              <li>
                Per-service build, test and deploy driven by path-based change
                detection, so only what changed is rebuilt.
              </li>
              <li>
                API Gateway routing in front of the services. {careerProject.fallback}
              </li>
            </ul>
            <p className={styles.stackLine}>
              <span className={styles.stackLabel}>Stack</span>
              {careerProject.stack.join(' · ')}
            </p>
            <p className={styles.note}>{careerProject.serviceNote}</p>
          </article>
        </section>

        <section className={styles.block} aria-labelledby="r-skills">
          <h2 id="r-skills" className={styles.h2}>
            Technical skills
          </h2>
          <dl className={styles.skills}>
            {skillGroups.map((g) => (
              <div key={g.id} className={styles.skillGroup}>
                <dt>{g.label}</dt>
                <dd>{skillNames(g).join(' · ')}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.block} aria-labelledby="r-education">
          <h2 id="r-education" className={styles.h2}>
            Education
          </h2>
          {education.map((e) => (
            <article key={e.id} className={styles.role0}>
              <div className={styles.roleHead}>
                <h3 className={styles.roleTitle}>{e.degree}</h3>
                <p className={styles.roleMeta}>
                  {e.period} · {e.location}
                </p>
              </div>
              <p className={styles.roleContext}>{e.institution}</p>
              <p className={styles.prose}>Specialisation: {e.field}</p>
            </article>
          ))}
        </section>

        <section className={styles.block} aria-labelledby="r-certs">
          <h2 id="r-certs" className={styles.h2}>
            Certifications
          </h2>
          <ul className={styles.certs}>
            {completedCredentials.map((c) => (
              <li key={c.id}>
                <span className={styles.certName}>
                  {c.code ? `${c.code} — ${c.name}` : c.name}
                </span>
                <span className={styles.certIssuer}>{c.issuer}</span>
              </li>
            ))}
          </ul>
          {preparationCredentials.length > 0 && (
            <p className={styles.note}>
              In preparation, not certified:{' '}
              {preparationCredentials
                .map((c) => (c.code ? `${c.code} (${c.issuer})` : c.name))
                .join(', ')}
              .
            </p>
          )}
        </section>

        <footer className={styles.foot}>
          <p className={styles.footLine}>
            Prefer the drawing set?{' '}
            <Link href="/">Read the interactive version</Link>. Prefer paper?{' '}
            <a href={site.resumePath}>Take the PDF</a>.
          </p>
        </footer>
      </div>
    </main>
  );
}
