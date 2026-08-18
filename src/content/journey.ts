/**
 * The route.
 *
 * The site has always claimed to be one continuous journey from source to
 * sea; this is that journey declared once, as data, so the channel drawn down
 * the left of the document and the chapters it passes are the same thing
 * rather than two things that have to be kept in agreement by hand.
 *
 * `plate` is the chapter the station belongs to and `offset` is how far into
 * that chapter it sits, so two stations can share a chapter without landing on
 * top of each other.
 */

export type Station = {
  id: string;
  label: string;
  /** The plate this station is measured against. */
  plate: string;
  /** 0…1 through that plate. */
  offset: number;
  /** What happens here, in one clause. */
  detail: string;
};

export const journey: Station[] = [
  {
    id: 'source',
    label: 'Source',
    plate: 'headwater',
    offset: 0.5,
    detail: 'Code and configuration enter the works.',
  },
  {
    id: 'build',
    label: 'Build',
    plate: 'flight',
    offset: 0.28,
    detail: 'Tests run and the container image is built once.',
  },
  {
    id: 'gates',
    label: 'Gates',
    plate: 'flight',
    offset: 0.72,
    detail: 'Source, image and secret material are checked before promotion.',
  },
  {
    id: 'registry',
    label: 'Registry',
    plate: 'basin',
    offset: 0.3,
    detail: 'The scanned image is stored and pulled from one place.',
  },
  {
    id: 'production',
    label: 'Production',
    plate: 'split',
    offset: 0.4,
    detail: 'Traffic reaches the workloads through the gateway.',
  },
  {
    id: 'observability',
    label: 'Observability',
    plate: 'gauges',
    offset: 0.4,
    detail: 'The platform reports what it is doing, and what it is about to do.',
  },
];
