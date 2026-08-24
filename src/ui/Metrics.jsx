import { useRef } from 'react';
import { ERAS, ERA_COUNT } from '../data/eras';
import { useSceneFrame } from '../scene/useScene';
import {
  clamp, lerpLog, smoothstep, formatDuration, formatMinutes, formatCadence, inv,
} from '../scene/math';

/**
 * Three numbers, running the whole length of the page.
 *
 * This is the actual argument of the last sixty years, and it is more honest as
 * a live readout than as a claim in a paragraph: everything the industry built
 * was in service of making these three move. They interpolate on a log scale so
 * an order of magnitude reads as an even amount of travel.
 */

const ROWS = [
  { key: 'lead', label: 'Lead time', hint: 'commit → production' },
  { key: 'freq', label: 'Deploy rate', hint: 'how often' },
  { key: 'restore', label: 'Restore time', hint: 'break → fixed' },
];

export function Metrics() {
  const vals = useRef({});
  const bars = useRef({});

  useSceneFrame((s) => {
    const pos = clamp(s.pos, 0, ERA_COUNT - 1);
    const a = Math.min(ERA_COUNT - 1, Math.floor(pos));
    const b = Math.min(ERA_COUNT - 1, a + 1);
    const t = smoothstep(pos - a);

    const A = ERAS[a].dora;
    const B = ERAS[b].dora;

    const lead = lerpLog(A.leadHours, B.leadHours, t);
    const freq = lerpLog(A.deploysPerYear, B.deploysPerYear, t);
    const restore = lerpLog(A.recoverMinutes, B.recoverMinutes, t);

    set('lead', formatDuration(lead), 1 - inv(Math.log(0.4), Math.log(2160), Math.log(lead)));
    set('freq', formatCadence(freq), inv(Math.log(2), Math.log(200000), Math.log(freq)));
    set('restore', formatMinutes(restore), 1 - inv(Math.log(4), Math.log(10080), Math.log(restore)));

    function set(k, text, fill) {
      const v = vals.current[k];
      if (v && v.textContent !== text) v.textContent = text;
      const bar = bars.current[k];
      if (bar) bar.style.transform = `scaleX(${clamp(fill, 0.02, 1).toFixed(3)})`;
    }
  });

  return (
    <aside className="metrics" aria-label="How delivery performance changed across the journey">
      <p className="metrics-head">What actually changed</p>
      <dl>
        {ROWS.map((r) => (
          <div className="metric" key={r.key}>
            <dt>
              {r.label}
              <span>{r.hint}</span>
            </dt>
            <dd ref={(n) => { vals.current[r.key] = n; }}>—</dd>
            <div className="metric-bar">
              <i ref={(n) => { bars.current[r.key] = n; }} />
            </div>
          </div>
        ))}
      </dl>
      <p className="metrics-note">Illustrative of the industry's direction, not measurements.</p>
    </aside>
  );
}
