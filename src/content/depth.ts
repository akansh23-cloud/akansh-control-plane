/**
 * DEPTH.
 *
 * Two readers arrive at this site. One has sixty seconds and a shortlist; the
 * other wants to know whether the person behind it can actually build things.
 * Serving both used to mean two sites, or a compromise that served neither.
 *
 * There is only one application here. Depth is progressive disclosure over the
 * same content: recruiter mode keeps the identity, the outcomes, the projects,
 * the credentials and the résumé, and folds the simulations away; engineer
 * mode opens them. Nothing is duplicated, and no fact exists in one mode that
 * does not exist in the other.
 */

export const depthModes = [
  { id: 'recruiter', label: 'Recruiter', hint: '60 seconds' },
  { id: 'engineer', label: 'Engineer', hint: 'Explore' },
] as const;

export type DepthMode = (typeof depthModes)[number]['id'];

export const defaultDepth: DepthMode = 'engineer';

/**
 * What each chapter says when its drawing is folded away. Two lines maximum:
 * the outcome, and the thing that makes it credible.
 */
export const plateBriefs: Record<string, string[]> = {
  flight: [
    'Owns a 20+ stage GitLab CI/CD release workflow: artifact retrieval, tests, security gates, image build, certificates, schema migrations, Helm deployment and controlled promotion.',
    'The image that is scanned is the image that runs. Nothing is rebuilt on the way up.',
  ],
  refit: [
    'Led modernisation across five layers with the service still running: Jenkins and Bitbucket to GitLab, raw manifests to Helm, JDK 8 to Java 17, JBoss to Tomcat 10, ELK to Observe.',
  ],
  basin: [
    'Migration Assurance Platform — a deterministic data-migration verification service that emits signed evidence. Personal project, public repository.',
    'Delivered with Terraform, Argo CD and GitOps onto EKS, images from ECR.',
  ],
  split: [
    'Career Autopilot — a placement-readiness application decomposed into 16 services behind a gateway, with fallback to the monolith when a service is not answering. Personal project, public repository.',
  ],
  gauges: [
    'Observability as relationships rather than dashboards: saturation moves first, latency follows, readiness protects the user, errors are the last thing to appear.',
  ],
  watch: [
    'A worked incident: what to look at, in what order, and why readiness is the mechanism that turns a capacity mistake into a partial degradation instead of an outage.',
  ],
  vault: [
    'Every claim on this site, with its context, the work behind it, and what a reader can check — including where the work is confidential and cannot be checked.',
  ],
};
