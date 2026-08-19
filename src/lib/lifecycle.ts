/**
 * THE RUN LIFECYCLE.
 *
 * V8 kept the semantic state of the experience inside a component, which is
 * why replay was unreliable: three different places each held a private
 * "already played" flag and none of them agreed about what a *run* was.
 *
 * V9 states it once, here, as data. Everything that decides whether the
 * finale is allowed to fire, whether the opening may replay, and what the
 * visitor should do next is a pure function of this state. The provider in
 * JourneySystem owns it; every other component reads it.
 *
 * Two identifiers matter and they are deliberately independent:
 *
 *   openingCycleId  — increments every time the cinematic opening is played.
 *   runId           — increments every time a new semantic release run starts.
 *
 * Replaying the opening must never reset a run, and starting a new run must
 * never replay the opening. That separation is the whole reason both exist.
 */

export const STAGES = [
  { id: 'headwater', no: '01', name: 'Headwater', sub: 'Source' },
  { id: 'flight', no: '02', name: 'The Flight', sub: 'Release engineering' },
  { id: 'refit', no: '03', name: 'The Refit', sub: 'Modernisation' },
  { id: 'basin', no: '04', name: 'The Basin', sub: 'Declared state' },
  { id: 'split', no: '05', name: 'The Split', sub: 'Routing' },
  { id: 'gauges', no: '06', name: 'Gauge House', sub: 'Observability' },
  { id: 'watch', no: '07', name: 'The Watch', sub: 'Incident response' },
  { id: 'vault', no: '08', name: 'The Vault', sub: 'Evidence' },
  { id: 'tidewater', no: '09', name: 'Tidewater', sub: 'Arrival' },
] as const;

export type StageId = (typeof STAGES)[number]['id'];

export const stageIndex = (id: StageId) =>
  Math.max(0, STAGES.findIndex((stage) => stage.id === id));

/** Where the whole works is, not where one widget is. */
export type RunPhase =
  | 'ready'
  | 'running'
  | 'held'
  | 'recovering'
  | 'healthy'
  | 'degraded'
  | 'production';

/** Where the release artifact itself is. */
export type ReleaseState =
  | 'idle'
  | 'running'
  | 'refused'
  | 'recovering'
  | 'promoted';

export type TelemetryState = 'quiet' | 'healthy' | 'degrading' | 'critical';
export type EventTone = 'neutral' | 'ok' | 'hold' | 'fault';

/** Guided keeps one obvious next action on screen. Explore shows everything. */
export type OperatingMode = 'guided' | 'explore';

export type RunEvent = {
  id: number;
  key: string;
  stage: string;
  label: string;
  tone: EventTone;
};

export type RunState = {
  artifact: string;

  /* Opening lifecycle — independent of the run. */
  openingCycleId: number;
  openingActive: boolean;

  /* Reading lifecycle. */
  mode: OperatingMode;

  /* Run lifecycle. */
  runId: number;
  launched: boolean;
  phase: RunPhase;
  currentStage: StageId;

  /* Release engineering. */
  release: ReleaseState;
  releaseCleared: boolean;
  releaseStage: number;
  fault: string | null;
  faultGate: string | null;
  faultRemediated: boolean;

  /* Platform state. */
  drifted: boolean;
  reconciled: boolean;
  extracted: number;
  serviceDown: boolean;
  telemetryLoad: number;
  telemetry: TelemetryState;
  incidentAttempts: number;
  incidentSolved: boolean;

  /* Arrival. */
  productionReached: boolean;
  finalePlayedForRunId: number | null;

  /* ---- V10 ---------------------------------------------------------- */

  /** Chaos: what is armed, what is currently injected, what has been fixed. */
  chaosArmed: string | null;
  chaosActive: string[];
  chaosHistory: string[];

  /**
   * The receipt counters. These exist so the finale can state what the visitor
   * actually did without any component having to remember it — and so it can
   * never claim an action that was not performed.
   */
  releasesRun: number;
  blocks: number;
  remediations: number;
  driftEvents: number;
  reconciliations: number;
  diagnoses: number;
  traces: number;

  events: RunEvent[];
  seq: number;
};

export const EVENT_DEPTH = 24;

/**
 * The build code carried by the release capsule.
 *
 * V9 published this as `AM-64723A4`, which is precise and means nothing to a
 * visitor. V10 keeps the number — it is the real short commit sha in a
 * deployed build — but demotes it to metadata under the words RELEASE CAPSULE.
 * See `lib/capsule.ts` for how it is presented.
 */
export function artifactName(commit: string) {
  const clean = commit.trim().slice(0, 7);
  return clean && clean !== 'local' ? clean.toUpperCase() : 'WORKING';
}

export function initialRun(
  commit: string,
  carry: Partial<RunState> = {},
): RunState {
  return {
    artifact: artifactName(commit),
    openingCycleId: 0,
    openingActive: false,
    mode: 'guided',
    runId: 0,
    launched: false,
    phase: 'ready',
    currentStage: 'headwater',
    release: 'idle',
    releaseCleared: false,
    releaseStage: 0,
    fault: null,
    faultGate: null,
    faultRemediated: false,
    drifted: false,
    reconciled: false,
    extracted: 4,
    serviceDown: false,
    telemetryLoad: 0.34,
    telemetry: 'quiet',
    incidentAttempts: 0,
    incidentSolved: false,
    productionReached: false,
    finalePlayedForRunId: null,
    chaosArmed: null,
    chaosActive: [],
    chaosHistory: [],
    releasesRun: 0,
    blocks: 0,
    remediations: 0,
    driftEvents: 0,
    reconciliations: 0,
    diagnoses: 0,
    traces: 0,
    events: [],
    seq: 0,
    ...carry,
  };
}

export type RunAction =
  | { type: 'opening:play' }
  | { type: 'opening:end' }
  | { type: 'mode'; mode: OperatingMode }
  | { type: 'stage'; stage: StageId }
  | { type: 'launch' }
  | { type: 'run:new' }
  | { type: 'release:start'; fault: string | null; gate: string | null }
  | { type: 'release:stage'; stage: number }
  | { type: 'release:refused'; fault: string; gate: string }
  | { type: 'release:recovering' }
  | { type: 'release:promoted' }
  | { type: 'release:reset' }
  | { type: 'drift'; drifted: boolean }
  | { type: 'services'; extracted: number; down: boolean }
  | { type: 'telemetry'; load: number; state: TelemetryState }
  | { type: 'incident'; correct: boolean }
  | { type: 'production' }
  | { type: 'finale:played' }
  | { type: 'chaos:arm'; fault: string | null }
  | { type: 'chaos:inject'; fault: string; label: string; plate: string }
  | { type: 'chaos:recover'; fault: string; label: string }
  | { type: 'trace'; degraded: boolean };

type Emission = Omit<RunEvent, 'id'>;

function record(state: RunState, emission?: Emission): RunState {
  if (!emission) return state;
  const last = state.events[state.events.length - 1];
  if (last?.key === emission.key) return state;
  const seq = state.seq + 1;
  return {
    ...state,
    seq,
    events: [...state.events, { ...emission, id: seq }].slice(-EVENT_DEPTH),
  };
}

/** Starting any real operation implicitly starts a run, once. */
function begun(state: RunState): Partial<RunState> {
  return state.launched
    ? {}
    : { launched: true, runId: state.runId + 1, phase: 'running' };
}

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case 'opening:play':
      return {
        ...state,
        openingCycleId: state.openingCycleId + 1,
        openingActive: true,
      };

    case 'opening:end':
      return state.openingActive ? { ...state, openingActive: false } : state;

    case 'mode':
      return state.mode === action.mode ? state : { ...state, mode: action.mode };

    case 'stage':
      return state.currentStage === action.stage
        ? state
        : { ...state, currentStage: action.stage };

    case 'launch':
      if (state.launched) return state;
      return record({ ...state, ...begun(state) }, {
        key: 'launch',
        stage: '01 · Headwater',
        label: 'Artifact admitted to the works',
        tone: 'neutral',
      });

    /* The full reset contract. Everything semantic returns to zero; the
       opening is untouched, because replaying the opening is a separate
       decision the visitor makes separately. */
    case 'run:new':
      return initialRun('', {
        artifact: state.artifact,
        openingCycleId: state.openingCycleId,
        openingActive: false,
        mode: state.mode,
        runId: state.runId + 1,
        launched: true,
        phase: 'running',
        currentStage: state.currentStage,
        finalePlayedForRunId: null,
        events: [
          {
            id: 1,
            key: 'run:new',
            stage: '01 · Headwater',
            label: `Run ${String(state.runId + 1).padStart(2, '0')} opened · works reset`,
            tone: 'neutral',
          },
        ],
        seq: 1,
      });

    case 'release:start':
      return record(
        {
          ...state,
          ...begun(state),
          phase: 'running',
          release: 'running',
          releaseStage: 0,
          releaseCleared: false,
          productionReached: false,
          releasesRun: state.releasesRun + 1,
          fault: action.fault,
          faultGate: action.gate,
          faultRemediated: false,
        },
        {
          key: `release:start:${action.fault ?? 'clean'}:${state.seq}`,
          stage: '02 · The Flight',
          label: action.fault
            ? `Release triggered · ${action.fault} armed at ${action.gate}`
            : 'Release triggered · clean path',
          tone: action.fault ? 'hold' : 'neutral',
        },
      );

    case 'release:stage':
      return state.releaseStage === action.stage
        ? state
        : { ...state, releaseStage: action.stage };

    case 'release:refused':
      return record(
        {
          ...state,
          ...begun(state),
          phase: 'held',
          release: 'refused',
          releaseCleared: false,
          blocks: state.blocks + 1,
          fault: action.fault,
          faultGate: action.gate,
        },
        {
          key: `release:refused:${action.fault}`,
          stage: '02 · The Flight',
          label: `${action.gate} refused the release · ${action.fault}`,
          tone: 'fault',
        },
      );

    case 'release:recovering':
      return record(
        {
          ...state,
          phase: 'recovering',
          release: 'recovering',
          faultRemediated: true,
          remediations: state.remediations + 1,
        },
        {
          key: `release:recovering:${state.fault ?? 'gate'}`,
          stage: '02 · The Flight',
          label: 'Remediation applied · the gate reopens',
          tone: 'hold',
        },
      );

    case 'release:promoted':
      return record(
        {
          ...state,
          ...begun(state),
          phase: 'healthy',
          release: 'promoted',
          releaseCleared: true,
        },
        {
          key: `release:promoted:${state.runId}:${state.faultRemediated ? 'recovered' : 'clean'}`,
          stage: '02 · The Flight',
          label: state.faultRemediated
            ? 'Same artifact promoted after remediation'
            : 'Release cleared every gate · promoted unchanged',
          tone: 'ok',
        },
      );

    case 'release:reset':
      return {
        ...state,
        phase: state.launched ? 'running' : 'ready',
        release: 'idle',
        releaseStage: 0,
        releaseCleared: false,
        fault: null,
        faultGate: null,
        faultRemediated: false,
      };

    case 'drift':
      return record(
        {
          ...state,
          ...(action.drifted ? begun(state) : {}),
          drifted: action.drifted,
          reconciled: action.drifted ? false : true,
          driftEvents: state.driftEvents + (action.drifted ? 1 : 0),
          reconciliations: state.reconciliations + (action.drifted ? 0 : 1),
          phase: action.drifted ? 'degraded' : state.phase === 'held' ? 'held' : 'healthy',
        },
        {
          key: action.drifted ? 'drift' : 'reconciled',
          stage: '04 · The Basin',
          label: action.drifted
            ? 'Live state edited by hand · drift recorded'
            : 'Argo CD restored the declared state',
          tone: action.drifted ? 'fault' : 'ok',
        },
      );

    case 'services': {
      const safe = Math.max(0, action.extracted);
      return record(
        {
          ...state,
          ...begun(state),
          extracted: safe,
          serviceDown: action.down,
          phase: action.down ? 'degraded' : state.phase === 'held' ? 'held' : 'healthy',
        },
        {
          key: action.down ? `service:down:${safe}` : `services:${safe}`,
          stage: '05 · The Split',
          label: action.down
            ? 'Extracted service removed · gateway fell back to the monolith'
            : `${safe} service${safe === 1 ? '' : 's'} outside the monolith`,
          tone: action.down ? 'hold' : 'ok',
        },
      );
    }

    case 'telemetry':
      return {
        ...state,
        telemetryLoad: Math.min(1, Math.max(0, action.load)),
        telemetry: action.state,
      };

    case 'incident':
      return record(
        {
          ...state,
          incidentAttempts: state.incidentAttempts + 1,
          incidentSolved: state.incidentSolved || action.correct,
          diagnoses: state.diagnoses + (action.correct && !state.incidentSolved ? 1 : 0),
          phase: action.correct ? 'healthy' : 'degraded',
        },
        {
          key: action.correct
            ? 'incident:contained'
            : `incident:miss:${state.incidentAttempts + 1}`,
          stage: '07 · The Watch',
          label: action.correct
            ? 'Diagnosis matched the signals · fault already contained'
            : 'Diagnosis rejected · the evidence still disagrees',
          tone: action.correct ? 'ok' : 'fault',
        },
      );

    case 'production':
      if (state.productionReached) return state;
      return record(
        { ...state, phase: 'production', productionReached: true },
        {
          key: `production:${state.runId}`,
          stage: '09 · Tidewater',
          label: 'The same artifact reached production water',
          tone: 'ok',
        },
      );

    case 'finale:played':
      return { ...state, finalePlayedForRunId: state.runId };

    /* ---- V10 ------------------------------------------------------- */

    case 'chaos:arm':
      return state.chaosArmed === action.fault
        ? state
        : { ...state, chaosArmed: action.fault };

    case 'chaos:inject': {
      if (state.chaosActive.includes(action.fault)) return state;
      return record(
        {
          ...state,
          ...begun(state),
          chaosArmed: null,
          chaosActive: [...state.chaosActive, action.fault],
          chaosHistory: state.chaosHistory.includes(action.fault)
            ? state.chaosHistory
            : [...state.chaosHistory, action.fault],
          phase: 'degraded',
        },
        {
          key: `chaos:inject:${action.fault}:${state.seq}`,
          stage: action.plate,
          label: `Fault injected · ${action.label}`,
          tone: 'fault',
        },
      );
    }

    case 'chaos:recover': {
      if (!state.chaosActive.includes(action.fault)) return state;
      const remaining = state.chaosActive.filter((id) => id !== action.fault);
      return record(
        {
          ...state,
          chaosActive: remaining,
          phase: remaining.length ? 'degraded' : 'healthy',
        },
        {
          key: `chaos:recover:${action.fault}:${state.seq}`,
          stage: 'Chaos',
          label: `Recovered · ${action.label}`,
          tone: 'ok',
        },
      );
    }

    case 'trace':
      return record(
        { ...state, ...begun(state), traces: state.traces + 1 },
        {
          key: `trace:${state.traces + 1}`,
          stage: '05 · The Split',
          label: action.degraded
            ? 'Request traced · gateway fell back to the monolith'
            : 'Request traced end to end through the architecture',
          tone: action.degraded ? 'hold' : 'ok',
        },
      );

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* Derivations                                                         */
/* ------------------------------------------------------------------ */

export const phaseLabel: Record<RunPhase, string> = {
  ready: 'Ready for release',
  running: 'Release in motion',
  held: 'Gate holding',
  recovering: 'Recovery in progress',
  healthy: 'Healthy',
  degraded: 'Degraded',
  production: 'Production reached',
};

export const phaseTone: Record<RunPhase, EventTone> = {
  ready: 'neutral',
  running: 'neutral',
  held: 'fault',
  recovering: 'hold',
  healthy: 'ok',
  degraded: 'hold',
  production: 'ok',
};

export type Objective = {
  id: string;
  no: string;
  plate: StageId;
  place: string;
  title: string;
  instruction: string;
  /** Required for the run to be allowed to reach production. */
  required: boolean;
  done: boolean;
};

/**
 * What the run is made of.
 *
 * Only two of these are required, and both of them are things the visitor
 * physically operates — a release that actually cleared the gates, and that
 * same release carried to the end of the route. Scrolling is not one of them.
 * The rest are the depth of the works: they enrich the record without turning
 * the site into ten obscure mini-games.
 */
export function objectives(state: RunState): Objective[] {
  return [
    {
      id: 'release',
      no: '01',
      plate: 'flight',
      place: 'The Flight',
      title: 'Lift one release through the gates',
      instruction:
        'Send a single immutable image up the flight. The artifact that was scanned is the artifact that runs.',
      required: true,
      done: state.releaseCleared,
    },
    {
      id: 'gate',
      no: '02',
      plate: 'flight',
      place: 'The Flight',
      title: 'Let a gate refuse, then recover it',
      instruction:
        'Arm a real fault, watch the gate stop the release before it can reach a cluster, then apply the fix.',
      required: false,
      done: Boolean(state.fault && state.faultRemediated) || state.faultRemediated,
    },
    {
      id: 'gitops',
      no: '03',
      plate: 'basin',
      place: 'The Basin',
      title: 'Restore declared state',
      instruction:
        'Edit the cluster by hand to create drift, then let reconciliation pull live state back to Git.',
      required: false,
      done: state.reconciled,
    },
    {
      id: 'fallback',
      no: '04',
      plate: 'split',
      place: 'The Split',
      title: 'Prove the fallback path',
      instruction:
        'Take an extracted service out. The request has to keep moving instead of disappearing.',
      required: false,
      done: state.serviceDown,
    },
    {
      id: 'incident',
      no: '05',
      plate: 'watch',
      place: 'The Watch',
      title: 'Call the incident from evidence',
      instruction:
        'Read the signals in the order they moved and name the fault. One very reasonable answer is wrong.',
      required: false,
      done: state.incidentSolved,
    },
    {
      id: 'arrival',
      no: '06',
      plate: 'tidewater',
      place: 'Tidewater',
      title: 'Carry the artifact to production',
      instruction:
        'Take the run you operated all the way to the end of the route.',
      required: true,
      done: state.productionReached,
    },
  ];
}

export type Operation = {
  /** Imperative, short enough for a bar. */
  label: string;
  /** Where it happens. */
  plate: StageId;
  /** One line on why it is the next thing. */
  detail: string;
};

/** The one obvious next action, at any point in the run. */
export function nextOperation(state: RunState): Operation {
  if (!state.launched) {
    return {
      label: 'Start the run',
      plate: 'flight',
      detail: 'Operate this portfolio as one release, from source to production.',
    };
  }
  if (state.release === 'refused') {
    return {
      label: 'Clear the fault',
      plate: 'flight',
      detail: 'A gate is holding the release. Apply the fix and send the same artifact up again.',
    };
  }
  if (!state.releaseCleared) {
    return {
      label: 'Run a release',
      plate: 'flight',
      detail: 'Nothing reaches production until one release has cleared every gate.',
    };
  }
  if (!state.reconciled) {
    return {
      label: 'Restore declared state',
      plate: 'basin',
      detail: 'Drift the cluster by hand, then let Git pull it back.',
    };
  }
  if (!state.serviceDown) {
    return {
      label: 'Prove the fallback',
      plate: 'split',
      detail: 'Take a service out and watch where the request goes instead.',
    };
  }
  if (!state.incidentSolved) {
    return {
      label: 'Call the incident',
      plate: 'watch',
      detail: 'Read the signals in the order they moved, then name the fault.',
    };
  }
  if (!state.productionReached) {
    return {
      label: 'Carry it to Tidewater',
      plate: 'tidewater',
      detail: 'The release has cleared. Take it to the end of the route.',
    };
  }
  return {
    label: 'Review the run',
    plate: 'tidewater',
    detail: 'The whole route is behind you. Open the record, or run the works again.',
  };
}

/** Production is a semantic gate, never a scroll position on its own. */
export function productionEligible(state: RunState) {
  return (
    state.launched &&
    state.runId > 0 &&
    state.releaseCleared &&
    state.currentStage === 'tidewater'
  );
}

/** The finale fires once per run — not once per browser session. */
export function finaleEligible(state: RunState) {
  return (
    state.productionReached &&
    state.releaseCleared &&
    state.runId > 0 &&
    state.finalePlayedForRunId !== state.runId
  );
}

export function runProgress(state: RunState) {
  const list = objectives(state);
  const done = list.filter((objective) => objective.done).length;
  return { done, total: list.length, ratio: done / list.length };
}

/* ------------------------------------------------------------------ */
/* The operator receipt                                                */
/* ------------------------------------------------------------------ */

export type ReceiptLine = { count: number; label: string; done: boolean };

/**
 * What this run actually contained.
 *
 * Every line is a counter the reducer incremented when the visitor did the
 * thing. A line that did not happen is not printed — the receipt is never
 * allowed to claim an action nobody performed, which is the whole reason it is
 * derived from counters instead of assembled by the finale.
 */
export function runReceipt(state: RunState): ReceiptLine[] {
  const lines: ReceiptLine[] = [
    { count: state.releasesRun, label: 'release executed', done: state.releasesRun > 0 },
    { count: state.blocks, label: 'security block', done: state.blocks > 0 },
    { count: state.remediations, label: 'remediation', done: state.remediations > 0 },
    { count: state.driftEvents, label: 'drift event', done: state.driftEvents > 0 },
    { count: state.reconciliations, label: 'reconciliation', done: state.reconciliations > 0 },
    { count: state.traces, label: 'request traced', done: state.traces > 0 },
    { count: state.diagnoses, label: 'incident diagnosed', done: state.diagnoses > 0 },
    {
      count: state.chaosHistory.length,
      label: 'fault injected',
      done: state.chaosHistory.length > 0,
    },
    { count: state.serviceDown ? 1 : 0, label: 'fallback exercised', done: state.serviceDown },
  ];
  return lines.filter((line) => line.done);
}

/** Pluralised, upper-case receipt text: `1 RELEASE EXECUTED`. */
export function receiptText(line: ReceiptLine) {
  const plural = line.count === 1 ? line.label : `${line.label}s`;
  return `${line.count} ${plural}`.toUpperCase();
}
