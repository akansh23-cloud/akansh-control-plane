export * from './profile';
export * from './education';
export * from './experience';
export * from './flight';
export * from './projects';
export * from './observability';
export * from './skills';

/**
 * The plates. A drawing set is numbered, and here the number carries real
 * information: it is the order in which software travels from source to sea.
 */
export const plates = [
  { id: 'headwater', no: '01', name: 'Headwater', sub: 'Source' },
  { id: 'flight', no: '02', name: 'The Flight', sub: 'Release engineering · Barclays' },
  { id: 'refit', no: '03', name: 'The Refit', sub: 'Modernisation' },
  { id: 'basin', no: '04', name: 'The Basin', sub: 'Migration Assurance Platform' },
  { id: 'split', no: '05', name: 'The Split', sub: 'Career Autopilot' },
  { id: 'gauges', no: '06', name: 'Gauge House', sub: 'Observability' },
  { id: 'tidewater', no: '07', name: 'Tidewater', sub: 'Toolkit · credentials · contact' },
] as const;

export type PlateId = (typeof plates)[number]['id'];
