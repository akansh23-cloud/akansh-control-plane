import { ERAS } from '../data/eras';
import { useReveal } from '../scene/useScene';

function Station({ era, index, registerRef }) {
  const reveal = useReveal();

  return (
    <section
      className="station"
      id={`station-${index + 1}`}
      ref={(n) => { registerRef(index, n); reveal.current = n; }}
      aria-labelledby={`station-${index + 1}-title`}
      data-revealed="false"
    >
      <div className="station-inner">
        <header className="station-head">
          <span className="station-n">{era.n}</span>
          <span className="station-years">{era.years}</span>
        </header>

        <h2 id={`station-${index + 1}-title`} className="station-title">{era.title}</h2>
        <p className="station-thesis">{era.thesis}</p>

        <div className="station-body">
          {era.body.map((para, i) => <p key={i}>{para}</p>)}
        </div>

        <ul className="station-facts">
          {era.facts.map((f, i) => <li key={i}>{f}</li>)}
        </ul>

        {/* The learning moment: the one thing the Operator keeps from here. */}
        <div className="learned">
          <span className="learned-badge" aria-hidden="true">{era.learned.key}</span>
          <div>
            <p className="learned-label">
              <span className="learned-verb">Learned</span> {era.learned.label}
            </p>
            <p className="learned-gloss">{era.learned.gloss}</p>
          </div>
        </div>

        {era.proof && (
          <p className="operator-proof">
            <b>Carried forward</b>{era.proof}
          </p>
        )}
      </div>
    </section>
  );
}

export function Narrative({ registerRef }) {
  return (
    <div className="narrative">
      {ERAS.map((era, i) => (
        <Station key={era.id} era={era} index={i} registerRef={registerRef} />
      ))}
    </div>
  );
}
