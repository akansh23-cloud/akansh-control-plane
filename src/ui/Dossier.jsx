import { profile } from '../data/profile';
import { ERAS } from '../data/eras';
import { useReveal } from '../scene/useScene';

/**
 * Station thirteen. The figure stops being an abstraction.
 *
 * Everything on this page is either on the resume or verifiable — the journey
 * above is the argument, and this is the evidence.
 */
export function Dossier() {
  const reveal = useReveal({ threshold: 0.05 });

  return (
    <section className="dossier" id="dossier" ref={reveal} data-revealed="false" aria-labelledby="dossier-title">
      <header className="dossier-head">
        <p className="eyebrow">Station 13 — today</p>
        <h2 id="dossier-title">{profile.name}</h2>
        <p className="dossier-role">{profile.role}</p>
        <p className="dossier-summary">{profile.summary}</p>
        <p className="dossier-line">
          The twelve stations above took the industry sixty years. Stations nine
          through twelve are the ones I work in.
        </p>
        <nav className="dossier-actions" aria-label="Contact">
          <a className="btn btn-primary" href={profile.resume}>Resume (PDF)</a>
          <a className="btn" href={profile.linkedin} rel="noreferrer noopener" target="_blank">LinkedIn</a>
          <a className="btn" href={profile.github} rel="noreferrer noopener" target="_blank">GitHub</a>
          <a className="btn" href={`mailto:${profile.email}`}>Email</a>
        </nav>
      </header>

      <div className="dossier-grid">
        {profile.experience.map((job) => (
          <article className="panel panel-wide" key={job.company}>
            <p className="panel-label">Where the work happens</p>
            <h3>{job.company}</h3>
            <p className="panel-meta">{job.title} · {job.period}</p>
            <ul className="panel-list">
              {job.points.map((pt, i) => <li key={i}>{pt}</li>)}
            </ul>
          </article>
        ))}

        <article className="panel">
          <p className="panel-label">Certifications</p>
          <ul className="cert-list">
            {profile.certifications.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </article>

        <article className="panel panel-wide">
          <p className="panel-label">Tools carried</p>
          <ul className="chips">
            {profile.stack.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </article>

        <article className="panel panel-full">
          <p className="panel-label">Systems built</p>
          {profile.systems.map((sys) => (
            <div className="system" key={sys.name}>
              <div>
                <h4>{sys.name}</h4>
                <p className="system-meta">{sys.type} · {sys.era}</p>
              </div>
              <p>{sys.description}</p>
            </div>
          ))}
        </article>

        <article className="panel panel-full panel-quiet">
          <p className="panel-label">What he learned on the way</p>
          <ol className="learned-index">
            {ERAS.map((e) => (
              <li key={e.id}>
                <a href={`#station-${Number(e.n)}`}>
                  <span className="learned-index-key">{e.learned.key}</span>
                  <span className="learned-index-label">{e.learned.label}</span>
                  <span className="learned-index-year">{e.anchor}</span>
                </a>
              </li>
            ))}
          </ol>
        </article>
      </div>

      <footer className="colophon">
        <p>
          Built as a scrolling essay. The figure, the rooms and the tools are drawn
          as vectors and posed by a small inverse-kinematics rig, so the character
          genuinely morphs between stations rather than cutting between drawings.
        </p>
        <p className="colophon-sig">{profile.name} · The Operator</p>
      </footer>
    </section>
  );
}
