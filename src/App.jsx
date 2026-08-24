import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { ERA_COUNT } from './data/eras';
import { setLayout, getState } from './scene/store';
import { Stage, Palette } from './stage/Stage';
import { Header } from './ui/Header';
import { Timeline } from './ui/Timeline';
import { Metrics } from './ui/Metrics';
import { Narrative } from './ui/Narrative';
import { Intro } from './ui/Intro';
import { Dossier } from './ui/Dossier';

/** Where in the viewport a station counts as "arrived". */
const ANCHOR = 0.42;

/**
 * Absolute document offset.
 *
 * Not offsetTop: `.journey` is a positioned element, so offsetTop on a station
 * measures from the journey rather than the document and every station lands
 * roughly half a station early.
 */
const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;

export default function App() {
  const stations = useRef([]);
  const journeyRef = useRef(null);
  const dossierRef = useRef(null);

  const registerRef = useCallback((i, node) => {
    stations.current[i] = node;
  }, []);

  const measure = useCallback(() => {
    const vh = window.innerHeight;
    const tops = [];
    for (let i = 0; i < ERA_COUNT; i++) {
      const el = stations.current[i];
      if (!el) return;
      tops.push(docTop(el) - vh * ANCHOR);
    }
    // Guarantee a strictly increasing ramp; a zero-width span would divide by
    // nothing and pin the character to one station.
    for (let i = 1; i < tops.length; i++) {
      if (tops[i] <= tops[i - 1]) tops[i] = tops[i - 1] + 1;
    }

    const dossier = dossierRef.current;
    setLayout({
      tops,
      count: ERA_COUNT,
      outroStart: dossier ? docTop(dossier) - vh : tops[tops.length - 1],
      outroHeight: vh,
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);

    let ro;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(onResize);
      if (journeyRef.current) ro.observe(journeyRef.current);
    }
    // Web fonts landing shifts every offset, so re-measure once they do.
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});

    return () => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [measure]);

  const jump = useCallback((i) => {
    const el = stations.current[Math.max(0, Math.min(ERA_COUNT - 1, i))];
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: docTop(el) - window.innerHeight * ANCHOR,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const current = Math.round(getState().pos);
      if (e.key === 'ArrowRight' || e.key === 'j') { e.preventDefault(); jump(current + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'k') { e.preventDefault(); jump(current - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump]);


  return (
    <>
      <Palette />
      <Header />

      <main id="top">
        <Intro onBegin={jump} />

        <div className="journey" ref={journeyRef}>
          <Timeline onJump={jump} />

          <div className="viewport">
            <Stage />
            <Metrics />
          </div>

          <Narrative registerRef={registerRef} />
        </div>

        <div ref={dossierRef}>
          <Dossier />
        </div>
      </main>
    </>
  );
}
