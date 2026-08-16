'use client';
import { useEffect, useState } from 'react';
export default function ScrollPacket() {
  const [progress, setProgress] = useState(0);
  useEffect(() => { let frame = 0; const update = () => { frame = 0; const max = document.documentElement.scrollHeight - window.innerHeight; setProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0); }; const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); }; update(); window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) cancelAnimationFrame(frame); }; }, []);
  return <div className="pointer-events-none fixed left-0 right-0 top-16 z-40 h-px engineer-only" aria-hidden="true"><div className="absolute inset-0 bg-line/60" /><div className="absolute top-1/2 h-px w-16 -translate-y-1/2 bg-gradient-to-r from-transparent via-pulse to-transparent" style={{ left: `calc(${progress * 100}% - 4rem)` }} /><div className="absolute top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-pulse" style={{ left: `${progress * 100}%`, boxShadow: '0 0 10px 1px var(--pulse)' }} /></div>;
}
