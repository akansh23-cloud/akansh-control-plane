'use client';

import { FormEvent, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './cloud-ops.module.css';
import {
  applyAction,
  createInitialState,
  runCommand,
  scenarioForSeed,
  scenarios,
  selectNode,
  type GameState,
  type NodeId,
} from './game-engine';

const nodeCopy: Record<NodeId, { name: string; type: string; duty: string }> = {
  edge: { name: 'GLOBAL EDGE', type: 'boundary', duty: 'Terminates public traffic and TLS before requests enter the cluster.' },
  dns: { name: 'CORE DNS', type: 'control', duty: 'Resolves internal service names. A failure here can make healthy services unreachable.' },
  ingress: { name: 'INGRESS', type: 'network', duty: 'Routes accepted traffic to the service inside the cluster.' },
  checkout: { name: 'CHECKOUT', type: 'workload', duty: 'Customer-facing workload. Readiness decides whether a pod may receive traffic.' },
  payments: { name: 'PAYMENTS', type: 'workload', duty: 'Downstream service on the critical request path.' },
  kafka: { name: 'KAFKA', type: 'queue', duty: 'Buffers asynchronous work. Backlog becomes visible when consumers fall behind.' },
  database: { name: 'POSTGRES', type: 'state', duty: 'Finite connection capacity. Every replica competes for the same server ceiling.' },
  'az-a': { name: 'AZ-A', type: 'zone', duty: 'Healthy production capacity.' },
  'az-b': { name: 'AZ-B', type: 'zone', duty: 'Second failure domain. Network degradation here should be contained, not amplified.' },
};

const quickCommands = [
  'kubectl get pods',
  'kubectl get events',
  'kubectl logs checkout',
  'trace request',
  'kubectl describe ingress',
  'dig checkout.svc',
];

const warRoomGuidance = {
  'connection-storm': [
    'CONTRADICTION // readiness is collapsing while customer errors are still low. Look for a shared dependency that can reject new work before pods crash.',
    'TRIANGULATE // compare replica count with a finite downstream resource. Six replicas are competing for something already at 100%.',
    'VECTOR // inspect POSTGRES, then compare replicas × per-pod pool against the database ceiling. Mitigate the multiplier, not the symptom.',
  ],
  'poison-release': [
    'CONTRADICTION // only some pods are unstable. Compare what changed between healthy and restarting replicas.',
    'TRIANGULATE // inspect pod restarts and logs before adding capacity. Repeated restarts after a new image point toward the artifact itself.',
    'VECTOR // establish the last known good image and reverse the release rather than scaling a leaking process.',
  ],
  'dns-fracture': [
    'CONTRADICTION // application health is normal, yet requests do not reliably arrive. Follow the request before it reaches ingress.',
    'TRIANGULATE // compare service health with name resolution. A healthy workload can still be unreachable if discovery is failing.',
    'VECTOR // inspect CORE DNS and run a request trace. Repair the control-plane resolver instead of changing the application.',
  ],
  'certificate-expiry': [
    'CONTRADICTION // internal traffic is healthy while public traffic is failing. The fault is likely at the trust boundary.',
    'TRIANGULATE // inspect the edge before touching pods. Ask what happens during the TLS handshake.',
    'VECTOR // inspect GLOBAL EDGE / ingress certificate state and restore trust at the boundary.',
  ],
  'az-failure': [
    'CONTRADICTION // one failure domain is degraded while the other is healthy but hot. More replicas are not automatically more capacity.',
    'TRIANGULATE // inspect AZ-B and trace where retries accumulate. Protect the healthy zone before adding work.',
    'VECTOR // drain the unhealthy zone, then let healthy capacity carry traffic rather than scheduling into a failing domain.',
  ],
} as const;

function clock(elapsed: number) {
  const seconds = 17 * 60 + elapsed;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `02:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function CloudOpsGame() {
  const router = useRouter();
  const [runSeed, setRunSeed] = useState(0);
  const [state, setState] = useState<GameState>(() => createInitialState('connection-storm'));
  const [terminal, setTerminal] = useState<string[]>([
    'BLACKOUT SHELL 1.0',
    'Connected to production model. Type help. Nothing here is a multiple-choice answer.',
  ]);
  const [input, setInput] = useState('');
  const [exiting, setExiting] = useState(false);
  const [guidanceLevel, setGuidanceLevel] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);
  const scenario = scenarios[state.scenario];
  const selected = state.selected ? nodeCopy[state.selected] : null;
  const impact = useMemo(() => {
    if (state.phase === 'mitigated') return 'CONTAINED';
    if (state.phase === 'failed') return 'PRODUCTION LOST';
    if (state.telemetry.errors >= 10) return 'SEV-1';
    if (state.telemetry.errors >= 4) return 'SEV-2';
    return 'DEGRADED';
  }, [state.phase, state.telemetry.errors]);
  const guidance = guidanceLevel > 0 ? warRoomGuidance[state.scenario][Math.min(guidanceLevel, 3) - 1] : null;

  function inspect(node: NodeId) {
    setState((current) => selectNode(current, node));
  }

  function execute(command: string) {
    setState((current) => {
      const result = runCommand(current, command);
      setTerminal((lines) => result.lines.includes('__CLEAR__') ? [] : [...lines, ...result.lines].slice(-42));
      window.setTimeout(() => terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' }), 0);
      return result.state;
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const command = input.trim();
    if (!command) return;
    setInput('');
    execute(command);
  }

  function action(name: string) {
    setState((current) => applyAction(current, name));
  }

  function exit() {
    setExiting(true);
    window.setTimeout(() => router.push('/'), 520);
  }

  function restart() {
    const nextSeed = runSeed + 1;
    const nextScenario = scenarioForSeed(nextSeed);
    setRunSeed(nextSeed);
    setState(createInitialState(nextScenario));
    setTerminal(['BLACKOUT SHELL 1.0', `New incident loaded · ${scenarios[nextScenario].codename}`, 'Type help.']);
    setInput('');
    setGuidanceLevel(0);
  }

  return (
    <main id="main" className={styles.root} data-phase={state.phase} data-exiting={exiting || undefined}>
      <div className={styles.noise} aria-hidden="true" />
      <div className={styles.scanline} aria-hidden="true" />

      <header className={styles.topbar}>
        <div className={styles.identity}>
          <p className={styles.kicker}>BLACKOUT // THE LAST GOOD DEPLOY</p>
          <h1>Production Incident Room</h1>
        </div>
        <div className={styles.headerStatus}>
          <span data-tone={state.phase}>{impact}</span>
          <strong>{clock(state.elapsed)}</strong>
        </div>
        <button className={styles.exit} onClick={exit}>EXIT INCIDENT</button>
      </header>

      <section className={styles.world} aria-label="Interactive production control room">
        <aside className={styles.pager}>
          <p className={styles.panelMark}>PAGER // LIVE</p>
          <div className={styles.pagerAlarm}><span />{scenario.pager}</div>
          <h2>{scenario.codename}</h2>
          <p>{scenario.clue}</p>

          <div style={{ marginTop: 18, padding: 12, border: '1px solid rgb(103 170 164 / 0.22)', background: 'rgb(4 14 15 / 0.72)' }}>
            <p className={styles.panelMark}>WAR ROOM ECHO</p>
            <p style={{ marginTop: 8, minHeight: 54, color: guidance ? '#b6c8c4' : '#78908b', fontSize: '0.72rem', lineHeight: 1.5 }}>
              {guidance ?? 'Need a nudge? Pulse the room. It will expose a contradiction, then a direction, without selecting an answer for you.'}
            </p>
            <button
              className={styles.exit}
              style={{ marginTop: 10, width: '100%' }}
              onClick={() => setGuidanceLevel((level) => Math.min(3, level + 1))}
              disabled={guidanceLevel >= 3}
            >
              {guidanceLevel === 0 ? 'PULSE THE ROOM' : guidanceLevel < 3 ? 'DEEPER SIGNAL' : 'MAX SIGNAL ACQUIRED'}
            </button>
          </div>

          <div className={styles.mission}>
            <span>MISSION</span>
            <strong>{state.phase === 'mitigated' ? 'System stabilized. Review what actually happened.' : state.phase === 'failed' ? 'Restore from the last known good state.' : 'Find the fault. Mitigate impact. Do not guess.'}</strong>
          </div>
        </aside>

        <section className={styles.mapPanel}>
          <div className={styles.mapHeader}>
            <div><p className={styles.panelMark}>LIVE TOPOLOGY</p><strong>Packets are the clue.</strong></div>
            <button onClick={() => execute('trace request')}>TRACE REQUEST</button>
          </div>

          <div className={styles.topology} data-scenario={state.scenario} data-phase={state.phase}>
            <div className={`${styles.route} ${styles.route1}`} aria-hidden="true"><i /><i /><i /></div>
            <div className={`${styles.route} ${styles.route2}`} aria-hidden="true"><i /><i /></div>
            <div className={`${styles.route} ${styles.route3}`} aria-hidden="true"><i /><i /></div>
            <div className={`${styles.route} ${styles.route4}`} aria-hidden="true"><i /></div>

            <button className={`${styles.node} ${styles.edge}`} data-node="edge" data-active={state.selected === 'edge' || undefined} onClick={() => inspect('edge')}><em>01</em><span>GLOBAL EDGE</span><small>TLS / entry</small></button>
            <button className={`${styles.node} ${styles.dns}`} data-node="dns" data-active={state.selected === 'dns' || undefined} onClick={() => inspect('dns')}><em>02</em><span>CORE DNS</span><small>service discovery</small></button>
            <button className={`${styles.node} ${styles.ingress}`} data-node="ingress" data-active={state.selected === 'ingress' || undefined} onClick={() => inspect('ingress')}><em>03</em><span>INGRESS</span><small>route</small></button>
            <button className={`${styles.node} ${styles.checkout}`} data-node="checkout" data-active={state.selected === 'checkout' || undefined} onClick={() => inspect('checkout')}><em>04</em><span>CHECKOUT</span><small>{state.telemetry.ready}/{state.telemetry.replicas} ready</small></button>
            <button className={`${styles.node} ${styles.payments}`} data-node="payments" data-active={state.selected === 'payments' || undefined} onClick={() => inspect('payments')}><em>05</em><span>PAYMENTS</span><small>service</small></button>
            <button className={`${styles.node} ${styles.kafka}`} data-node="kafka" data-active={state.selected === 'kafka' || undefined} onClick={() => inspect('kafka')}><em>06</em><span>KAFKA</span><small>lag {state.telemetry.kafkaLag}</small></button>
            <button className={`${styles.node} ${styles.database}`} data-node="database" data-active={state.selected === 'database' || undefined} onClick={() => inspect('database')}><em>07</em><span>POSTGRES</span><small>{state.telemetry.dbConnections}/{state.telemetry.dbMax} connections</small></button>
            <button className={`${styles.zone} ${styles.azA}`} data-active={state.selected === 'az-a' || undefined} onClick={() => inspect('az-a')}><span>AZ-A</span><small>production capacity</small></button>
            <button className={`${styles.zone} ${styles.azB}`} data-active={state.selected === 'az-b' || undefined} onClick={() => inspect('az-b')}><span>AZ-B</span><small>{state.scenario === 'az-failure' ? 'packet loss 11%' : 'production capacity'}</small></button>

            <div className={styles.podRack} aria-label="Checkout replicas">
              {Array.from({ length: state.telemetry.replicas }, (_, index) => (
                <span key={index} data-ready={index < state.telemetry.ready || undefined} data-failed={state.scenario === 'poison-release' && index >= state.telemetry.ready || undefined} title={`checkout pod ${index + 1}`} />
              ))}
            </div>
          </div>

          <div
            className={styles.inspector}
            data-open={Boolean(selected) || undefined}
            style={{ position: 'relative', inset: 'auto', right: 'auto', bottom: 'auto', width: '100%', marginTop: 10, transform: 'none' }}
          >
            {selected ? <><p className={styles.panelMark}>{selected.type.toUpperCase()}</p><h3>{selected.name}</h3><p>{selected.duty}</p><button onClick={() => setState((current) => ({ ...current, selected: null }))}>CLOSE INSPECTOR</button></> : <><p className={styles.panelMark}>INSPECTOR</p><p>Select any component. The system will not tell you which one is broken.</p></>}
          </div>
        </section>

        <aside className={styles.telemetry}>
          <p className={styles.panelMark}>TELEMETRY</p>
          <Metric label="P95 LATENCY" value={`${state.telemetry.latency}ms`} level={Math.min(100, state.telemetry.latency / 12)} />
          <Metric label="ERROR RATE" value={`${state.telemetry.errors.toFixed(1)}%`} level={Math.min(100, state.telemetry.errors * 6)} />
          <Metric label="CPU" value={`${state.telemetry.cpu}%`} level={state.telemetry.cpu} />
          <Metric label="READY" value={`${state.telemetry.ready}/${state.telemetry.replicas}`} level={(state.telemetry.ready / state.telemetry.replicas) * 100} inverse />
          <Metric label="DB CONNECTIONS" value={`${state.telemetry.dbConnections}/${state.telemetry.dbMax}`} level={(state.telemetry.dbConnections / state.telemetry.dbMax) * 100} />
          <div className={styles.discovery}><span>DISCOVERIES</span><strong>{state.discoveries.length}</strong><p>{state.discoveries.length ? state.discoveries.join(' · ').replaceAll('-', ' ') : 'None yet. Inspect the system.'}</p></div>
        </aside>
      </section>

      <section className={styles.opsDeck}>
        <section className={styles.terminalPanel}>
          <div className={styles.terminalHead}><div><p className={styles.panelMark}>OPERATOR TERMINAL</p><strong>Same state. Different control surface.</strong></div><span>shell // constrained production model</span></div>
          <div className={styles.quickCommands}>{quickCommands.map((command) => <button key={command} onClick={() => execute(command)}>{command}</button>)}</div>
          <div className={styles.terminal} ref={terminalRef} role="log" aria-live="polite">
            {terminal.map((line, index) => <p key={`${index}-${line}`} data-prompt={line.includes('$') || undefined}>{line}</p>)}
          </div>
          <form className={styles.commandLine} onSubmit={submit}>
            <label htmlFor="blackout-command">operator@blackout:~$</label>
            <input id="blackout-command" value={input} onChange={(event) => setInput(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="type help" />
          </form>
        </section>

        <section className={styles.physicalPanel}>
          <div><p className={styles.panelMark}>PHYSICAL CONTROL BOARD</p><strong>Changes are immediate.</strong></div>
          <div className={styles.levers}>
            <button onClick={() => action('scale-up')}><span>CAPACITY</span><strong>ADD REPLICAS</strong><i /></button>
            <button onClick={() => action('rollback')}><span>RELEASE</span><strong>ROLLBACK IMAGE</strong><i /></button>
            <button onClick={() => action('reduce-pool')}><span>DATABASE</span><strong>POOL → 12</strong><i /></button>
            <button onClick={() => action('restart-dns')}><span>CONTROL</span><strong>RESTART DNS</strong><i /></button>
            <button onClick={() => action('rotate-cert')}><span>EDGE</span><strong>ROTATE CERT</strong><i /></button>
            <button onClick={() => action('drain-zone')}><span>TRAFFIC</span><strong>DRAIN AZ-B</strong><i /></button>
          </div>
          <p className={styles.warning}>There are no safe-looking answer buttons. A wrong change mutates the same production model and can make the incident worse.</p>
        </section>
      </section>

      {(state.phase === 'mitigated' || state.phase === 'failed') && (
        <section className={styles.finale} data-outcome={state.phase} role="status">
          <div className={styles.finalePulse} aria-hidden="true" />
          <p className={styles.kicker}>{state.phase === 'mitigated' ? 'INCIDENT CLOSED' : 'PRODUCTION LOST'}</p>
          <h2>{state.phase === 'mitigated' ? 'The system is quiet again.' : 'The control room went dark.'}</h2>
          <p className={styles.rootCause}><span>ROOT CAUSE</span>{scenario.rootCause}</p>
          <div className={styles.receipt}>
            <span>BLACKOUT // RUN {String(runSeed + 1).padStart(2, '0')}</span>
            <strong>{state.phase === 'mitigated' ? 'IMPACT CONTAINED' : 'RESTORE REQUIRED'}</strong>
            <p>MTTR {Math.max(1, Math.ceil(state.elapsed / 60))}m · harmful changes {state.harmfulActions} · discoveries {state.discoveries.length}</p>
          </div>
          <div className={styles.finaleActions}>
            <button onClick={restart}>{state.phase === 'mitigated' ? 'LOAD ANOTHER INCIDENT' : 'RESTORE LAST KNOWN GOOD'}</button>
            <button onClick={exit}>RETURN TO PORTFOLIO</button>
          </div>
        </section>
      )}
    </main>
  );
}

function Metric({ label, value, level, inverse = false }: { label: string; value: string; level: number; inverse?: boolean }) {
  const alarm = inverse ? level < 70 : level > 72;
  return <div className={styles.metric} data-alarm={alarm || undefined}><div><span>{label}</span><strong>{value}</strong></div><div className={styles.metricTrack}><i style={{ width: `${Math.max(2, Math.min(100, level))}%` }} /></div></div>;
}
