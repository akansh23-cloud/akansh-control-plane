/**
 * THE RELEASE CAPSULE.
 *
 * V9 carried an artifact identifier — `AM-64723A4` — through the whole run.
 * It was correct and it meant nothing to anyone who had not built the site:
 * a hash is technical metadata, not an object.
 *
 * V10 gives that artifact a body. The capsule is the software release, in
 * physical form: a machined carrier with a status strip, inspection marks and
 * docking points. It is forged in the opening, it climbs the flight, a gate
 * physically refuses it, remediation clears the mark, deployment seals it, and
 * it ends up part of the mark at Tidewater. One object, one journey.
 *
 * The build id survives as secondary metadata, which is the right way round:
 * the visitor sees a release; an engineer can still read its number.
 */

import type { RunState } from './lifecycle';

/** What the capsule is doing. Drives material, indicator colour and label. */
export type CapsuleStatus =
  | 'forming'
  | 'build'
  | 'scanning'
  | 'blocked'
  | 'approved'
  | 'deploying'
  | 'drifted'
  | 'reconciling'
  | 'healthy'
  | 'production';

/** Marks the capsule accumulates. History, not decoration. */
export type CapsuleMarks = {
  /** A gate has refused this capsule at some point in the run. */
  warned: boolean;
  /** That refusal was remediated. */
  cleared: boolean;
  /** It has been deployed to a runtime. */
  sealed: boolean;
  /** It is currently in a degraded environment. */
  degraded: boolean;
  /** It reached production and was accepted. */
  approved: boolean;
};

export const CAPSULE_STATUS_LABEL: Record<CapsuleStatus, string> = {
  forming: 'INITIALISING',
  build: 'BUILD',
  scanning: 'SECURITY SCAN',
  blocked: 'BLOCKED',
  approved: 'APPROVED',
  deploying: 'DEPLOYING',
  drifted: 'DRIFTED',
  reconciling: 'RECONCILING',
  healthy: 'HEALTHY',
  production: 'PRODUCTION',
};

/** Amber holds, red refuses, green runs. Nothing else lights up. */
export const CAPSULE_TONE: Record<CapsuleStatus, 'idle' | 'work' | 'hold' | 'fault' | 'ok'> = {
  forming: 'idle',
  build: 'work',
  scanning: 'work',
  blocked: 'fault',
  approved: 'ok',
  deploying: 'work',
  drifted: 'fault',
  reconciling: 'hold',
  healthy: 'ok',
  production: 'ok',
};

/**
 * Where the capsule physically is. Docks are registered by the plates; the
 * capsule travels between them, and parks in its holding bay when the plate
 * it belongs to is not on screen.
 */
export const CAPSULE_DOCKS = [
  'bay',
  'headwater',
  'flight',
  'basin',
  'split',
  'gauges',
  'watch',
  'tidewater',
] as const;

export type CapsuleDockId = (typeof CAPSULE_DOCKS)[number];

/**
 * The capsule's status is derived, never stored. One release cannot disagree
 * with itself about what it is doing, which is exactly the class of bug that
 * three independent "already played" flags produced in V8.
 */
export function capsuleStatus(state: RunState): CapsuleStatus {
  if (state.openingActive) return 'forming';
  if (state.productionReached) return 'production';
  if (state.release === 'refused') return 'blocked';
  if (state.release === 'recovering') return 'reconciling';
  if (state.drifted) return 'drifted';
  if (state.reconciled && state.release === 'idle' && !state.releaseCleared) return 'reconciling';
  if (state.release === 'running') {
    /* Chambers 2–5 are the inspection half of the flight. */
    if (state.releaseStage >= 2 && state.releaseStage <= 5) return 'scanning';
    if (state.releaseStage >= 7) return 'deploying';
    return 'build';
  }
  if (state.serviceDown) return 'drifted';
  if (state.releaseCleared) return 'approved';
  if (!state.launched) return 'build';
  return 'healthy';
}

export function capsuleMarks(state: RunState): CapsuleMarks {
  return {
    warned: Boolean(state.fault) || state.release === 'refused',
    cleared: state.faultRemediated && state.release !== 'refused',
    sealed: state.releaseCleared,
    degraded: state.drifted || state.serviceDown || state.phase === 'degraded',
    approved: state.productionReached,
  };
}

/** Which dock the capsule belongs at, given where the reader is. */
export function capsuleDockFor(stage: string): CapsuleDockId {
  return (CAPSULE_DOCKS as readonly string[]).includes(stage)
    ? (stage as CapsuleDockId)
    : 'bay';
}

/**
 * The visitor-facing name of the release, and its technical number.
 * Nothing on screen makes anybody decode a hash to know what they are seeing.
 */
export function capsuleIdentity(artifact: string) {
  const build = artifact.replace(/^AM-/i, '').replace(/^V9-/i, '') || 'WORKING';
  return {
    /** What it is. */
    name: 'Release capsule',
    /** What ships. */
    subject: 'Akansh Portfolio',
    /** The number, kept as metadata. */
    build: `Build ${build}`,
    buildId: build,
  };
}
