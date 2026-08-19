export type ScenarioId = 'connection-storm' | 'poison-release' | 'dns-fracture' | 'certificate-expiry' | 'az-failure';
export type Phase = 'briefing' | 'investigating' | 'mitigated' | 'failed';
export type NodeId = 'edge' | 'dns' | 'ingress' | 'checkout' | 'payments' | 'kafka' | 'database' | 'az-a' | 'az-b';

export type Telemetry = {
  latency: number;
  errors: number;
  cpu: number;
  ready: number;
  replicas: number;
  dbConnections: number;
  dbMax: number;
  kafkaLag: number;
};

export type GameState = {
  scenario: ScenarioId;
  phase: Phase;
  telemetry: Telemetry;
  selected: NodeId | null;
  elapsed: number;
  mitigations: string[];
  discoveries: string[];
  harmfulActions: number;
  log: string[];
};

export type Scenario = {
  id: ScenarioId;
  codename: string;
  pager: string;
  clue: string;
  rootCause: string;
  hint: string;
};

export const scenarios: Record<ScenarioId, Scenario> = {
  'connection-storm': {
    id: 'connection-storm',
    codename: 'POOL PRESSURE',
    pager: 'CHECKOUT READINESS COLLAPSE · USER ERRORS LOW',
    clue: 'Replica count changed minutes before readiness began failing.',
    rootCause: 'Replica count multiplied a fixed per-pod database pool beyond the server connection ceiling.',
    hint: 'Compare replicas × pool size with the database maximum.',
  },
  'poison-release': {
    id: 'poison-release',
    codename: 'LAST GOOD IMAGE',
    pager: 'CHECKOUT RESTART LOOP · RSS CLIMBING',
    clue: 'Only pods on the newest image exhibit the failure pattern.',
    rootCause: 'The new image has a memory regression and repeatedly reaches its container limit.',
    hint: 'Inspect restart reason and image history before changing capacity.',
  },
  'dns-fracture': {
    id: 'dns-fracture',
    codename: 'NAME WITHOUT A ROUTE',
    pager: 'UPSTREAM TIMEOUTS · APPLICATION HEALTH NORMAL',
    clue: 'Requests fail before they ever reach the application service.',
    rootCause: 'Internal DNS resolution is intermittently failing, so service names cannot be resolved reliably.',
    hint: 'Trace a request and inspect the DNS hop instead of scaling the app.',
  },
  'certificate-expiry': {
    id: 'certificate-expiry',
    codename: 'EDGE OF TRUST',
    pager: 'PUBLIC TRAFFIC FAILING · INTERNAL HEALTH GREEN',
    clue: 'Cluster-to-cluster traffic is healthy while external TLS sessions fail.',
    rootCause: 'The ingress certificate expired at the production boundary.',
    hint: 'Inspect the edge certificate rather than the pods.',
  },
  'az-failure': {
    id: 'az-failure',
    codename: 'DARK ZONE',
    pager: 'AZ-B PACKET LOSS · CAPACITY DEGRADING',
    clue: 'One zone loses network quality while the surviving zone remains healthy but hot.',
    rootCause: 'Availability-zone degradation is shedding usable capacity and concentrating load elsewhere.',
    hint: 'Drain the unhealthy zone and protect capacity before changing the release.',
  },
};

const order: ScenarioId[] = ['connection-storm', 'poison-release', 'dns-fracture', 'certificate-expiry', 'az-failure'];

export function scenarioForSeed(seed: number): ScenarioId {
  return order[Math.abs(seed) % order.length];
}

export function createInitialState(scenario: ScenarioId): GameState {
  const base: Telemetry = { latency: 140, errors: 0.4, cpu: 48, ready: 3, replicas: 3, dbConnections: 60, dbMax: 90, kafkaLag: 8 };
  const telemetry: Telemetry = { ...base };

  if (scenario === 'connection-storm') Object.assign(telemetry, { latency: 740, cpu: 72, ready: 3, replicas: 6, dbConnections: 90 });
  if (scenario === 'poison-release') Object.assign(telemetry, { latency: 510, errors: 4.8, cpu: 66, ready: 4, replicas: 6 });
  if (scenario === 'dns-fracture') Object.assign(telemetry, { latency: 880, errors: 8.2, cpu: 41, ready: 6, replicas: 6 });
  if (scenario === 'certificate-expiry') Object.assign(telemetry, { latency: 120, errors: 13.2, cpu: 43, ready: 6, replicas: 6 });
  if (scenario === 'az-failure') Object.assign(telemetry, { latency: 680, errors: 5.1, cpu: 86, ready: 4, replicas: 6 });

  return {
    scenario,
    phase: 'briefing',
    telemetry,
    selected: null,
    elapsed: 0,
    mitigations: [],
    discoveries: [],
    harmfulActions: 0,
    log: ['02:17:00  Pager acknowledged.', '02:17:04  Production model attached.'],
  };
}

function addUnique(items: string[], item: string) {
  return items.includes(item) ? items : [...items, item];
}

function markDiscovery(state: GameState, item: string): GameState {
  return { ...state, phase: state.phase === 'briefing' ? 'investigating' : state.phase, discoveries: addUnique(state.discoveries, item) };
}

export function selectNode(state: GameState, node: NodeId): GameState {
  let next = { ...state, selected: node, elapsed: state.elapsed + 12, log: [...state.log, `02:${String(17 + Math.floor((state.elapsed + 12) / 60)).padStart(2, '0')}:${String((state.elapsed + 12) % 60).padStart(2, '0')}  Inspected ${node}.`] };
  if (state.scenario === 'connection-storm' && node === 'database') next = markDiscovery(next, 'database-capacity');
  if (state.scenario === 'poison-release' && node === 'checkout') next = markDiscovery(next, 'restart-pattern');
  if (state.scenario === 'dns-fracture' && node === 'dns') next = markDiscovery(next, 'dns-loss');
  if (state.scenario === 'certificate-expiry' && node === 'edge') next = markDiscovery(next, 'tls-expiry');
  if (state.scenario === 'az-failure' && node === 'az-b') next = markDiscovery(next, 'zone-loss');
  return next;
}

function resolved(state: GameState, action: string, telemetry: Partial<Telemetry>): GameState {
  return {
    ...state,
    phase: 'mitigated',
    elapsed: state.elapsed + 48,
    telemetry: { ...state.telemetry, ...telemetry },
    mitigations: addUnique(state.mitigations, action),
    log: [...state.log, `02:${String(17 + Math.floor((state.elapsed + 48) / 60)).padStart(2, '0')}:${String((state.elapsed + 48) % 60).padStart(2, '0')}  MITIGATION ACCEPTED · ${action}`],
  };
}

function harmful(state: GameState, action: string, telemetry: Partial<Telemetry>): GameState {
  const harmfulActions = state.harmfulActions + 1;
  return {
    ...state,
    phase: harmfulActions >= 3 ? 'failed' : 'investigating',
    elapsed: state.elapsed + 34,
    harmfulActions,
    telemetry: { ...state.telemetry, ...telemetry },
    log: [...state.log, `02:${String(17 + Math.floor((state.elapsed + 34) / 60)).padStart(2, '0')}:${String((state.elapsed + 34) % 60).padStart(2, '0')}  CHANGE WORSENED SYSTEM · ${action}`],
  };
}

export function applyAction(state: GameState, action: string): GameState {
  if (state.phase === 'mitigated' || state.phase === 'failed') return state;

  if (state.scenario === 'connection-storm') {
    if (action === 'reduce-pool') return resolved(state, 'reduced per-pod DB pool and rolled pods safely', { latency: 175, errors: 0.2, ready: 6, dbConnections: 72, cpu: 54 });
    if (action === 'scale-up') return harmful(state, 'scaled replicas again', { replicas: 8, ready: 3, dbConnections: 90, latency: 980, errors: 4.2 });
    if (action === 'disable-readiness') return harmful(state, 'disabled readiness', { ready: 6, latency: 1120, errors: 12.6 });
  }

  if (state.scenario === 'poison-release') {
    if (action === 'rollback') return resolved(state, 'rolled back to last known good image', { latency: 160, errors: 0.3, ready: 6, cpu: 49 });
    if (action === 'scale-up') return harmful(state, 'scaled a leaking image', { replicas: 8, ready: 4, cpu: 79, latency: 690 });
    if (action === 'disable-readiness') return harmful(state, 'disabled readiness on restarting pods', { errors: 15.1, latency: 940 });
  }

  if (state.scenario === 'dns-fracture') {
    if (action === 'restart-dns') return resolved(state, 'restarted and rescheduled DNS control plane', { latency: 150, errors: 0.4, cpu: 44 });
    if (action === 'scale-up') return harmful(state, 'scaled application replicas', { replicas: 9, latency: 920, errors: 9.1, cpu: 57 });
    if (action === 'rollback') return harmful(state, 'rolled back an unrelated image', { latency: 900, errors: 8.7 });
  }

  if (state.scenario === 'certificate-expiry') {
    if (action === 'rotate-cert') return resolved(state, 'rotated ingress certificate and reloaded edge', { errors: 0.2, latency: 125 });
    if (action === 'scale-up') return harmful(state, 'scaled healthy pods behind a broken edge', { replicas: 9, errors: 13.4 });
    if (action === 'rollback') return harmful(state, 'rolled back healthy application code', { errors: 13.2, latency: 130 });
  }

  if (state.scenario === 'az-failure') {
    if (action === 'drain-zone') return resolved(state, 'drained AZ-B and shifted capacity to AZ-A', { latency: 190, errors: 0.5, cpu: 64, ready: 6 });
    if (action === 'restart-all') return harmful(state, 'restarted all workloads during zone loss', { ready: 2, errors: 18.4, latency: 1300, cpu: 91 });
    if (action === 'scale-up') return harmful(state, 'scheduled replicas into unavailable capacity', { replicas: 9, ready: 4, latency: 760, errors: 6.8 });
  }

  return { ...state, log: [...state.log, `No effect: ${action}`] };
}

export type TerminalResult = { state: GameState; lines: string[] };

export function runCommand(state: GameState, raw: string): TerminalResult {
  const command = raw.trim().replace(/\s+/g, ' ');
  if (!command) return { state, lines: [] };
  const prompt = `operator@blackout:~$ ${command}`;
  let next = { ...state, elapsed: state.elapsed + 8, phase: state.phase === 'briefing' ? 'investigating' as Phase : state.phase, log: [...state.log, prompt] };
  const lower = command.toLowerCase();

  if (lower === 'help') return { state: next, lines: [prompt, 'inspect: kubectl get pods | kubectl get deploy | kubectl get events | kubectl logs checkout | kubectl describe ingress | dig checkout.svc | trace request', 'change: kubectl scale deploy checkout --replicas=N | kubectl rollout undo deploy/checkout | rotate certificate | restart dns | drain az-b | set db-pool 12'] };
  if (lower === 'clear') return { state: next, lines: ['__CLEAR__'] };
  if (lower === 'kubectl get pods') {
    if (state.scenario === 'poison-release') next = markDiscovery(next, 'restart-pattern');
    return { state: next, lines: [prompt, `checkout-7fd9  ${next.telemetry.ready > 0 ? '1/1 Running' : '0/1 Running'}  restarts=${state.scenario === 'poison-release' ? 6 : 0}`, `checkout-8bc1  1/1 Running  restarts=${state.scenario === 'poison-release' ? 5 : 0}`, `ready ${next.telemetry.ready}/${next.telemetry.replicas}`] };
  }
  if (lower === 'kubectl get deploy') return { state: next, lines: [prompt, `checkout  READY ${next.telemetry.ready}/${next.telemetry.replicas}  IMAGE registry/checkout:${state.scenario === 'poison-release' ? '9f2d1c' : '4d86bc6'}`] };
  if (lower === 'kubectl get events') return { state: next, lines: [prompt, state.scenario === 'connection-storm' ? 'Warning Unhealthy readiness probe failed: datasource unavailable' : state.scenario === 'poison-release' ? 'Warning OOMKilled container exceeded memory limit' : state.scenario === 'az-failure' ? 'Warning NodeNotReady az-b-worker-2' : 'Normal system events; no application crash loop detected'] };
  if (lower === 'kubectl logs checkout') return { state: next, lines: [prompt, state.scenario === 'connection-storm' ? 'WARN could not obtain database connection after 30000ms' : state.scenario === 'poison-release' ? 'WARN heap pressure rising; process terminated by cgroup' : state.scenario === 'dns-fracture' ? 'WARN upstream lookup checkout-db.svc timed out' : 'INFO application healthy; readiness endpoint 200'] };
  if (lower === 'kubectl describe ingress') {
    if (state.scenario === 'certificate-expiry') next = markDiscovery(next, 'tls-expiry');
    return { state: next, lines: [prompt, state.scenario === 'certificate-expiry' ? 'TLS secret checkout-prod · certificate EXPIRED 02:00 UTC' : 'TLS secret checkout-prod · certificate valid'] };
  }
  if (lower.startsWith('dig ')) {
    if (state.scenario === 'dns-fracture') next = markDiscovery(next, 'dns-loss');
    return { state: next, lines: [prompt, state.scenario === 'dns-fracture' ? ';; communications error to 10.96.0.10#53: timed out' : 'checkout.svc.cluster.local. 30 IN A 10.42.3.18'] };
  }
  if (lower === 'trace request') return { state: markDiscovery(next, state.scenario === 'dns-fracture' ? 'dns-loss' : 'request-trace'), lines: [prompt, state.scenario === 'dns-fracture' ? 'EDGE 8ms → DNS TIMEOUT → request never reached ingress' : state.scenario === 'certificate-expiry' ? 'TLS HANDSHAKE FAILED at EDGE → cluster not entered' : state.scenario === 'connection-storm' ? 'EDGE 7ms → INGRESS 4ms → CHECKOUT 82ms → DATABASE 612ms' : state.scenario === 'az-failure' ? 'EDGE 6ms → AZ-B packet loss 11% → retries → AZ-A 74ms' : 'EDGE 7ms → INGRESS 5ms → CHECKOUT restarts during request'] };
  if (lower.startsWith('kubectl scale deploy checkout --replicas=')) return { state: applyAction(next, 'scale-up'), lines: [prompt, 'deployment.apps/checkout scaled'] };
  if (lower === 'kubectl rollout undo deploy/checkout') return { state: applyAction(next, 'rollback'), lines: [prompt, 'deployment.apps/checkout rolled back'] };
  if (lower === 'set db-pool 12') return { state: applyAction(next, 'reduce-pool'), lines: [prompt, 'db pool configured to 12; rolling restart started'] };
  if (lower === 'rotate certificate') return { state: applyAction(next, 'rotate-cert'), lines: [prompt, 'certificate rotated; ingress reload requested'] };
  if (lower === 'restart dns') return { state: applyAction(next, 'restart-dns'), lines: [prompt, 'coredns rollout restarted'] };
  if (lower === 'drain az-b') return { state: applyAction(next, 'drain-zone'), lines: [prompt, 'traffic weight az-b=0; replacement capacity requested'] };
  if (lower === 'disable readiness') return { state: applyAction(next, 'disable-readiness'), lines: [prompt, 'warning: readiness gate removed'] };
  if (lower === 'restart all') return { state: applyAction(next, 'restart-all'), lines: [prompt, 'all workloads restarted'] };

  return { state: next, lines: [prompt, `command not found: ${command}. Type help.`] };
}
