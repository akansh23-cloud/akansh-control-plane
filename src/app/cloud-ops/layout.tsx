'use client';

import { useEffect, useState, type ReactNode } from 'react';
import './cinematic.css';

export default function CloudOpsLayout({ children }: { children: ReactNode }) {
  const [commissioning, setCommissioning] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setCommissioning(false), reduced ? 80 : 1650);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      {children}
      {commissioning && (
        <div className="blackout-arrival" role="status" aria-live="polite" aria-label="Commissioning the BLACKOUT incident room">
          <div className="blackout-arrival__grid" aria-hidden="true" />
          <div className="blackout-arrival__iris" aria-hidden="true"><i /><i /><i /></div>
          <div className="blackout-arrival__rail blackout-arrival__rail--a" aria-hidden="true"><i /><i /><i /></div>
          <div className="blackout-arrival__rail blackout-arrival__rail--b" aria-hidden="true"><i /><i /></div>
          <div className="blackout-arrival__console">
            <p>BLACKOUT // OPERATOR HANDOFF</p>
            <h2>WAR ROOM<br />COMING ONLINE</h2>
            <div className="blackout-arrival__checks" aria-hidden="true">
              <span><i />PAGER CHANNEL</span>
              <span><i />LIVE TOPOLOGY</span>
              <span><i />PRODUCTION MODEL</span>
            </div>
          </div>
          <div className="blackout-arrival__count" aria-hidden="true"><span>03</span><span>02</span><span>01</span><strong>LIVE</strong></div>
        </div>
      )}
    </>
  );
}
