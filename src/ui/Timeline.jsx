import { useRef } from 'react';
import { ERAS, ERA_COUNT } from '../data/eras';
import { useSceneFrame } from '../scene/useScene';
import { clamp } from '../scene/math';

/**
 * The chronology, as a rail you can scrub.
 *
 * Years are the one structural device this page has genuinely earned — the
 * content is a sequence and the order carries information the reader needs.
 */
export function Timeline({ onJump }) {
  const ticks = useRef([]);
  const marker = useRef(null);
  const activeRef = useRef(-1);

  useSceneFrame((s) => {
    const pos = clamp(s.pos, 0, ERA_COUNT - 1);
    const pct = (pos / (ERA_COUNT - 1)) * 100;
    if (marker.current) marker.current.style.top = `${pct}%`;

    const near = Math.round(pos);
    if (near !== activeRef.current) {
      activeRef.current = near;
      ticks.current.forEach((el, i) => {
        if (el) el.setAttribute('aria-current', i === near ? 'true' : 'false');
      });
    }
  });

  return (
    <nav className="rail" aria-label="Journey timeline">
      <span className="rail-line" aria-hidden="true" />
      <span className="rail-marker" ref={marker} aria-hidden="true" />
      <ol>
        {ERAS.map((era, i) => (
          <li key={era.id}>
            <button
              type="button"
              ref={(n) => { ticks.current[i] = n; }}
              onClick={() => onJump(i)}
              aria-current="false"
            >
              <span className="rail-tick" aria-hidden="true" />
              <span className="rail-year">{era.anchor}</span>
              <span className="rail-name">{era.title}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
