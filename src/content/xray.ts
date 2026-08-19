/**
 * INFRASTRUCTURE X-RAY.
 *
 * Hold X — or press the control — and the page becomes semi-transparent while
 * the systems underneath it are drawn: what each region actually is, what it
 * talks to, and what state it is holding.
 *
 * The discipline here is *not* labelling everything. Four lenses, each of
 * which answers one question, and only the regions relevant to that lens are
 * revealed. Anything marked `data-xray` in the DOM opts in; nothing else is
 * touched.
 */

export type XRayLens = 'system' | 'network' | 'security' | 'state';

export const lenses: { id: XRayLens; name: string; question: string; key: string }[] = [
  {
    id: 'system',
    name: 'System',
    question: 'What are these components, and what is each responsible for?',
    key: '1',
  },
  {
    id: 'network',
    name: 'Network',
    question: 'How does a request get from the edge to the thing that answers it?',
    key: '2',
  },
  {
    id: 'security',
    name: 'Security',
    question: 'Where is something checked, refused, or handed a secret?',
    key: '3',
  },
  {
    id: 'state',
    name: 'State',
    question: 'What is declared, what is live, and where do they disagree?',
    key: '4',
  },
];

export const xrayHint = 'Hold X for X-Ray · 1–4 to change lens';

export const xrayNote =
  'X-Ray annotates this page, not a cluster. Each label names what the region in front of it is modelling.';
