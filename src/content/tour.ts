/**
 * THE 45-SECOND TOUR.
 *
 * A recruiter has about a minute. This drives the real interface — scroll,
 * highlight, annotation — through the strongest evidence in order, and hands
 * control back the instant anybody touches anything.
 *
 * It is not a video and it is not a modal: the visitor is watching their own
 * page being operated, and can take the wheel mid-sentence.
 */

import type { StageId } from '@/lib/lifecycle';

export type TourStop = {
  id: string;
  plate: StageId;
  /** Operator caption. Short. */
  title: string;
  /** One sentence of evidence. */
  line: string;
  /** Milliseconds this stop holds. */
  hold: number;
  /** Optional element to highlight, matched by data-tour attribute. */
  focus?: string;
};

export const tourStops: TourStop[] = [
  {
    id: 'who',
    plate: 'headwater',
    title: 'DEVOPS · PLATFORM · CLOUD',
    line: 'Akansh Mowar — three years building the path software takes to production.',
    hold: 5200,
    focus: 'identity',
  },
  {
    id: 'release',
    plate: 'flight',
    title: 'RELEASE ENGINEERING',
    line: 'A 20+ stage GitLab CI/CD workflow across 50+ microservices on OpenShift 4.x.',
    hold: 6400,
    focus: 'flight',
  },
  {
    id: 'security',
    plate: 'flight',
    title: 'GATES THAT REFUSE',
    line: 'Source and image scanning stop a release before it can reach a cluster.',
    hold: 5600,
  },
  {
    id: 'modernisation',
    plate: 'refit',
    title: 'MODERNISATION',
    line: 'JDK 8 to 17, JBoss to Tomcat 10, and Helm, underneath a running service.',
    hold: 5600,
  },
  {
    id: 'gitops',
    plate: 'basin',
    title: 'DECLARED STATE',
    line: 'Migration Assurance Platform — AWS, EKS, Terraform and Argo CD.',
    hold: 5600,
  },
  {
    id: 'observability',
    plate: 'gauges',
    title: 'OBSERVABILITY',
    line: 'Saturation moves first, latency second, errors last. That order decides where the alert goes.',
    hold: 5400,
  },
  {
    id: 'evidence',
    plate: 'vault',
    title: 'EVIDENCE',
    line: 'Every claim on this site, opened up — including the ones that cannot be verified.',
    hold: 5000,
  },
  {
    id: 'credentials',
    plate: 'tidewater',
    title: 'CREDENTIALS · CONTACT',
    line: 'AZ-104, AZ-900 and AWS Cloud Practitioner, the toolkit, and the fastest way to reach me.',
    hold: 5600,
  },
];

export const tourLength = tourStops.reduce((total, stop) => total + stop.hold, 0);

export const tourLabel = 'Show me the important parts';
export const tourSub = `${Math.round(tourLength / 1000)}-second guided tour · any input returns control`;
