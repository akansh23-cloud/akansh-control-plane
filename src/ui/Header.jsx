import { useRef } from 'react';
import { profile } from '../data/profile';
import { ERAS, ERA_COUNT } from '../data/eras';
import { useSceneFrame, useHasDeparted } from '../scene/useScene';
import { clamp } from '../scene/math';

export function Header() {
  const bar = useRef(null);
  const label = useRef(null);
  const lastStation = useRef(-1);
  const departed = useHasDeparted();

  useSceneFrame((s) => {
    if (bar.current) bar.current.style.transform = `scaleX(${clamp(s.progress).toFixed(4)})`;
    const near = Math.min(ERA_COUNT - 1, Math.max(0, Math.round(s.pos)));
    if (near !== lastStation.current && label.current) {
      lastStation.current = near;
      label.current.textContent = `${ERAS[near].n} · ${ERAS[near].title}`;
    }
  });

  return (
    <div className={`topbar ${departed ? 'is-travelling' : ''}`}>
      <a className="skip" href="#dossier">Skip to the engineer</a>
      <div className="topbar-inner">
        <a className="topbar-name" href="#top">
          <b>{profile.name}</b>
          <span>The Operator</span>
        </a>
        <p className="topbar-station" ref={label} aria-live="polite">01 · The Card Deck</p>
      </div>
      <div className="topbar-progress" aria-hidden="true">
        <i ref={bar} />
      </div>
    </div>
  );
}
