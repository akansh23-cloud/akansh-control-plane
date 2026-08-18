/**
 * What the release says as it climbs.
 *
 * These are the status lines a stage would actually emit, in the words the
 * tools use. They are part of the simulation and are labelled as such on the
 * plate — no build number, no hash, no environment name and no finding from a
 * real scan appears here, because none of those would be mine to publish.
 */

/** One or two lines per chamber, in the order they happen. */
export const stageEvents: Record<string, string[]> = {
  retrieve: ['artifact and dependencies resolved from Nexus'],
  test: ['unit and integration suites green'],
  'source-scan': ['SonarQube quality gate passed', 'Veracode scan returned no blocking finding'],
  image: ['container image built', 'this is the image every later stage will use'],
  'image-scan': ['Trivy scan complete — no critical severity'],
  certs: ['certificate and JKS material refreshed from Vault'],
  migrate: ['incremental schema migration applied'],
  deploy: ['Helm release applied to OpenShift', 'readiness probes passing on the new pods'],
  promote: ['same image promoted to the next environment'],
};

/** What the gate says when a fault is armed. */
export const faultEvents: Record<string, string> = {
  cve: 'Trivy: critical severity finding — image gate closed, nothing promoted',
  migration: 'migration stopped part way — release held before deployment',
  readiness: 'readiness never reported ready — rollout reversed, previous release still serving',
};

/** What the fix says. */
export const recoveryEvents: Record<string, string> = {
  cve: 'rebuilt on a patched base image, re-scanned — gate open',
  migration: 'incremental migration corrected and re-run — chamber filling',
  readiness: 'startup configuration and probe timing corrected — deploying again',
};

export const releaseStart = 'pipeline triggered — release starting at the foot of the flight';
export const releaseComplete =
  'promoted. The image that was scanned is the image now running in the next environment.';
