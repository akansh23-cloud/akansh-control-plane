'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './cloud-ops.module.css';

type Score = { reliability: number; security: number; cost: number; speed: number };
type Choice = { label: string; detail: string; delta: Score; result: string };
type Incident = { title: string; signal: string; context: string; choices: Choice[] };

const incidents: Incident[] = [
  {
    title: 'Traffic spike after release',
    signal: 'p95 latency 880ms · pods 82% CPU',
    context: 'Checkout traffic triples two minutes after a clean deployment. Error rate is still below the SLO burn threshold.',
    choices: [
      { label: 'Scale replicas', detail: 'Raise capacity behind the existing service.', delta: { reliability: 18, security: 0, cost: -8, speed: 10 }, result: 'Latency falls without changing the artifact. Capacity absorbs the spike.' },
      { label: 'Rollback release', detail: 'Return to the previous image immediately.', delta: { reliability: 4, security: 0, cost: 0, speed: -8 }, result: 'Rollback succeeds, but the evidence never pointed at the release.' },
      { label: 'Disable probes', detail: 'Keep busy pods from restarting.', delta: { reliability: -22, security: -4, cost: 2, speed: 6 }, result: 'The cluster looks calmer while unhealthy work stays in rotation.' },
    ],
  },
  {
    title: 'Critical image finding',
    signal: 'registry scan · severity CRITICAL · fix available',
    context: 'The candidate image passed tests, but the final registry scan finds a fixable runtime vulnerability before promotion.',
    choices: [
      { label: 'Block promotion', detail: 'Fail the gate and rebuild from the patched base.', delta: { reliability: 8, security: 24, cost: -3, speed: -9 }, result: 'Production stays on the trusted image. The gate does the job it exists to do.' },
      { label: 'Waive for 24h', detail: 'Promote now and create a follow-up ticket.', delta: { reliability: -5, security: -18, cost: 2, speed: 12 }, result: 'Delivery is faster, but a known fixable risk crosses the production boundary.' },
      { label: 'Hide the finding', detail: 'Exclude the package from the policy.', delta: { reliability: -12, security: -28, cost: 0, speed: 10 }, result: 'The dashboard turns green; the vulnerability does not.' },
    ],
  },
  {
    title: 'Configuration drift',
    signal: 'Git desired=6 replicas · cluster actual=3',
    context: 'A manual emergency change from last night remains in the cluster. GitOps reports divergence during peak traffic.',
    choices: [
      { label: 'Reconcile from Git', detail: 'Restore declared state and record the emergency lesson.', delta: { reliability: 20, security: 5, cost: -5, speed: 4 }, result: 'The cluster returns to the reviewed source of truth and drift disappears.' },
      { label: 'Edit Git to match', detail: 'Make the accidental runtime state permanent.', delta: { reliability: -7, security: -2, cost: 5, speed: 5 }, result: 'Drift disappears by redefining the accident as intent.' },
      { label: 'Pause GitOps', detail: 'Silence reconciliation until after peak.', delta: { reliability: -13, security: -6, cost: 2, speed: 7 }, result: 'The alert goes quiet while the control plane loses authority.' },
    ],
  },
  {
    title: 'Secret rotation under load',
    signal: 'Vault lease expires in 06:00 · active sessions 14.2k',
    context: 'The database credential is about to rotate while the service is handling its busiest window.',
    choices: [
      { label: 'Dual-secret rotation', detail: 'Overlap old and new credentials, then revoke.', delta: { reliability: 19, security: 18, cost: -2, speed: -3 }, result: 'Connections drain safely and the old credential is revoked without an outage.' },
      { label: 'Extend old lease', detail: 'Delay rotation until traffic falls.', delta: { reliability: 7, security: -10, cost: 0, speed: 5 }, result: 'Availability wins for now, but credential exposure lasts longer than intended.' },
      { label: 'Rotate immediately', detail: 'Revoke first and let clients reconnect.', delta: { reliability: -18, security: 12, cost: 0, speed: 6 }, result: 'Security posture improves while a preventable reconnect storm hits production.' },
    ],
  },
  {
    title: 'Region degradation',
    signal: 'AZ-B packet loss 11% · healthy capacity 64%',
    context: 'One availability zone is degrading. The remaining zones can carry traffic, but only if the platform moves decisively.',
    choices: [
      { label: 'Drain AZ-B', detail: 'Shift traffic and scale healthy zones before removing capacity.', delta: { reliability: 24, security: 2, cost: -8, speed: 8 }, result: 'Traffic moves before failure becomes outage. Capacity remains inside the SLO.' },
      { label: 'Wait for recovery', detail: 'Avoid extra capacity unless alarms worsen.', delta: { reliability: -15, security: 0, cost: 12, speed: -5 }, result: 'Cost stays low while the error budget burns on an avoidable dependency.' },
      { label: 'Restart everything', detail: 'Force fresh scheduling across the region.', delta: { reliability: -25, security: 0, cost: -5, speed: -3 }, result: 'A partial infrastructure problem becomes a full application event.' },
    ],
  },
];

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export default function CloudOpsGame() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [score, setScore] = useState<Score>({ reliability: 62, security: 62, cost: 62, speed: 62 });
  const [result, setResult] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const complete = step >= incidents.length;
  const incident = incidents[Math.min(step, incidents.length - 1)];

  const total = useMemo(() => Math.round((score.reliability + score.security + score.cost + score.speed) / 4), [score]);

  function choose(choice: Choice) {
    if (result) return;
    setScore((s) => ({
      reliability: clamp(s.reliability + choice.delta.reliability),
      security: clamp(s.security + choice.delta.security),
      cost: clamp(s.cost + choice.delta.cost),
      speed: clamp(s.speed + choice.delta.speed),
    }));
    setResult(choice.result);
  }

  function next() {
    setResult(null);
    setStep((s) => s + 1);
  }

  function exit() {
    setExiting(true);
    window.setTimeout(() => router.push('/'), 360);
  }

  return (
    <main className={styles.root} data-exiting={exiting || undefined}>
      <div className={styles.grid} aria-hidden="true" />
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>CLOUD OPS // LIVE SIMULATION</p>
          <h1>Production Under Pressure</h1>
        </div>
        <button className={styles.exit} onClick={exit}>EXIT TO PORTFOLIO</button>
      </header>

      <section className={styles.shell}>
        <aside className={styles.telemetry} aria-label="System telemetry">
          {Object.entries(score).map(([key, value]) => (
            <div className={styles.meter} key={key}>
              <div className={styles.meterHead}><span>{key}</span><strong>{value}</strong></div>
              <div className={styles.track}><span style={{ width: `${value}%` }} /></div>
            </div>
          ))}
          <div className={styles.total}><span>OPS SCORE</span><strong>{total}</strong></div>
        </aside>

        {!complete ? (
          <section className={styles.console} key={step}>
            <div className={styles.progress}><span>INCIDENT {String(step + 1).padStart(2, '0')}</span><span>{step + 1}/{incidents.length}</span></div>
            <div className={styles.signal}><span className={styles.liveDot} />{incident.signal}</div>
            <h2>{incident.title}</h2>
            <p className={styles.context}>{incident.context}</p>

            <div className={styles.choices}>
              {incident.choices.map((choice, i) => (
                <button key={choice.label} onClick={() => choose(choice)} disabled={Boolean(result)}>
                  <span className={styles.choiceNo}>0{i + 1}</span>
                  <span><strong>{choice.label}</strong><small>{choice.detail}</small></span>
                  <span className={styles.deploy}>EXECUTE</span>
                </button>
              ))}
            </div>

            {result && (
              <div className={styles.result} role="status">
                <span>CONTROL PLANE RESPONSE</span>
                <p>{result}</p>
                <button onClick={next}>{step === incidents.length - 1 ? 'VIEW VERDICT' : 'NEXT INCIDENT'} →</button>
              </div>
            )}
          </section>
        ) : (
          <section className={styles.verdict}>
            <p className={styles.kicker}>SIMULATION COMPLETE</p>
            <div className={styles.ring} style={{ '--score': `${total * 3.6}deg` } as React.CSSProperties}><strong>{total}</strong><span>/100</span></div>
            <h2>{total >= 78 ? 'Production commander' : total >= 62 ? 'Reliable operator' : 'Keep the incident channel open'}</h2>
            <p>{total >= 78 ? 'You protected reliability without treating delivery speed as the only objective.' : 'Your system survived, but the trade-offs show where production judgment matters most.'}</p>
            <div className={styles.verdictActions}>
              <button onClick={() => { setStep(0); setScore({ reliability: 62, security: 62, cost: 62, speed: 62 }); setResult(null); }}>RUN AGAIN</button>
              <button onClick={exit}>RETURN TO PORTFOLIO</button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
