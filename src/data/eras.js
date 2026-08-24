/**
 * The journey.
 *
 * Twelve stations, in order. Each one changes what a "task" physically is,
 * changes what the Operator is holding, and teaches them one thing they keep.
 *
 * `theme` drives the whole page palette — the journey starts on paper (light),
 * sinks into the machine room (dark), and comes back out into daylight (light).
 * That luminance arc is the argument: operations used to be invisible.
 *
 * `pose` drives the character rig. Values are interpolated between adjacent
 * eras, so the Operator morphs continuously rather than snapping between poses.
 *
 * `dora` values are illustrative of the industry's direction, not measurements.
 */

export const ERAS = [
  {
    id: 'cards',
    n: '01',
    years: '1964 — 1968',
    anchor: '1964',
    title: 'The Card Deck',
    thesis: 'A job is a physical object you carry across a room.',
    body: [
      'You write the program by hand. A keypunch turns each line into eighty columns of holes. The deck goes in a tray, the tray goes to a window, and somebody else feeds it to the machine overnight.',
      'You find out whether it worked tomorrow. There is no log to tail. There is a printout, and a queue, and a person whose shift ended.',
    ],
    facts: [
      'The IBM 029 keypunch, introduced in 1964. Eighty columns to a card.',
      'A dropped tray is a day of work on the floor.',
      'Turnaround is measured in shifts.',
    ],
    learned: { key: 'JOB', label: 'Batch submission', gloss: 'Describe the work. Hand it over. Wait.' },
    dora: { leadHours: 2160, deploysPerYear: 2, recoverMinutes: 10080 },
    theme: {
      bg: '#E4D7BA', ink: '#241D13', muted: '#71614A', accent: '#B0421C',
      rule: 'rgba(36,29,19,0.16)', field: 'rgba(36,29,19,0.07)', light: true,
    },
    pose: { posture: 0.06, stance: 0.16, tilt: 22, lift: 0, scale: 0.96 },
  },

  {
    id: 'teletype',
    n: '02',
    years: '1969 — 1979',
    anchor: '1971',
    title: 'The Glass Teletype',
    thesis: 'A job becomes a line you can type again.',
    body: [
      'Unix arrives at Bell Labs and brings a shell with it. The work moves off the card and onto a screen that answers immediately.',
      'Then the pipe shows up, and small programs start composing into large ones. For the first time, an operator can build a tool instead of filing a request for one.',
    ],
    facts: [
      'Unix, Bell Labs, 1969.',
      'The pipe, 1973. Small tools compose.',
      'The feedback loop shrinks from a night to a second.',
    ],
    learned: { key: 'SH', label: 'The shell', gloss: 'Work you can repeat by pressing up.' },
    dora: { leadHours: 720, deploysPerYear: 6, recoverMinutes: 4320 },
    theme: {
      bg: '#070C08', ink: '#D8F7DE', muted: '#5E8A69', accent: '#4BE07E',
      rule: 'rgba(75,224,126,0.16)', field: 'rgba(75,224,126,0.06)', light: false,
    },
    pose: { posture: 0.18, stance: 0.2, tilt: 16, lift: 0.1, scale: 0.97 },
  },

  {
    id: 'rack',
    n: '03',
    years: '1985 — 1998',
    anchor: '1993',
    title: 'The Rack and the Pager',
    thesis: 'A job becomes a procedure somebody has to be awake for.',
    body: [
      'Cheap machines arrive in quantity, and one person is now responsible for forty of them. The knowledge lives in a binder called the runbook and in the head of whoever wrote it.',
      'Cron does the parts that repeat. The pager does the rest. Production becomes something you are woken up by.',
    ],
    facts: [
      'Linux, 1991. Cheap machines, many of them.',
      'CFEngine, 1993 — the first serious attempt to describe a machine\'s desired state.',
      'The pager becomes the interface to production.',
    ],
    learned: { key: 'RUN', label: 'Runbooks and cron', gloss: 'Write the procedure down before you need it at 3am.' },
    dora: { leadHours: 504, deploysPerYear: 12, recoverMinutes: 2880 },
    theme: {
      bg: '#0A0E12', ink: '#D3E2EC', muted: '#5D7183', accent: '#FF5A47',
      rule: 'rgba(211,226,236,0.13)', field: 'rgba(211,226,236,0.05)', light: false,
    },
    pose: { posture: 0.3, stance: 0.3, tilt: 12, lift: 0.16, scale: 0.98 },
  },

  {
    id: 'wall',
    n: '04',
    years: '1999 — 2005',
    anchor: '2001',
    title: 'The Wall',
    thesis: 'A job becomes an argument between two teams.',
    body: [
      'Development learns to work in weeks. Release stays on a quarterly change board. The faster half of the company starts throwing work over a fence at the half that gets paged for it.',
      'Both sides are behaving rationally. Developers are measured on change, operators on stability, and nobody is measured on the handoff. The gap gets a name: the wall of confusion.',
    ],
    facts: [
      'The Agile Manifesto, Snowbird, February 2001.',
      'CruiseControl, 2001 — integration becomes a server that never sleeps.',
      'Puppet, 2005. Configuration starts wanting to be code.',
    ],
    learned: { key: 'CI', label: 'Continuous integration', gloss: 'Merge small, merge often, let the machine judge.' },
    dora: { leadHours: 336, deploysPerYear: 26, recoverMinutes: 1440 },
    theme: {
      bg: '#0C0A14', ink: '#DCD8F0', muted: '#6B6390', accent: '#8B7BFF',
      rule: 'rgba(220,216,240,0.13)', field: 'rgba(139,123,255,0.07)', light: false,
    },
    pose: { posture: 0.36, stance: 0.42, tilt: 8, lift: 0.2, scale: 0.99 },
  },

  {
    id: 'elastic',
    n: '05',
    years: '2006 — 2008',
    anchor: '2006',
    title: 'Elastic Ground',
    thesis: 'A server becomes an API call and an hourly rate.',
    body: [
      'Capacity stops being a purchase order and a twelve-week lead time. You ask for a machine and it exists, and when you stop asking it stops existing.',
      'This breaks the old instinct to protect servers. If a machine is disposable, the interesting question is no longer how to repair it — it is how to describe it well enough to make another.',
    ],
    facts: [
      'S3 in March 2006. EC2 that August.',
      'Provisioning falls from weeks to minutes.',
      'The pet becomes the herd.',
    ],
    learned: { key: 'API', label: 'Elastic infrastructure', gloss: 'Ask for capacity instead of owning it.' },
    dora: { leadHours: 240, deploysPerYear: 52, recoverMinutes: 720 },
    theme: {
      bg: '#080E14', ink: '#CFE4F2', muted: '#5A7B92', accent: '#3FA9F5',
      rule: 'rgba(207,228,242,0.13)', field: 'rgba(63,169,245,0.06)', light: false,
    },
    pose: { posture: 0.45, stance: 0.34, tilt: 5, lift: 0.28, scale: 1.0 },
  },

  {
    id: 'word',
    n: '06',
    years: '2009',
    anchor: '2009',
    title: 'The Word',
    thesis: 'The job stops belonging to one side of the fence.',
    body: [
      'At Velocity, two people from Flickr stand up and describe deploying ten or more times a day — and spend the talk explaining that the hard part was never the tooling. It was that development and operations had to share the same goal.',
      'That October, a conference in Ghent gives the idea a name. The name is a shortening of the conference title, which is how most good things get named.',
    ],
    facts: [
      'Velocity, June 2009: ten-plus deploys a day at Flickr.',
      'Patrick Debois runs devopsdays in Ghent that October.',
      'The word is an abbreviation of the event, not a job title.',
    ],
    learned: { key: 'WE', label: 'Shared ownership', gloss: 'You build it, you carry the pager for it.' },
    dora: { leadHours: 168, deploysPerYear: 250, recoverMinutes: 360 },
    theme: {
      bg: '#120C06', ink: '#F5E3CB', muted: '#94795A', accent: '#FFB347',
      rule: 'rgba(245,227,203,0.14)', field: 'rgba(255,179,71,0.07)', light: false,
    },
    pose: { posture: 0.54, stance: 0.4, tilt: 2, lift: 0.34, scale: 1.01 },
  },

  {
    id: 'iac',
    n: '07',
    years: '2010 — 2012',
    anchor: '2012',
    title: 'Infrastructure as Text',
    thesis: 'A server becomes a file in the repository.',
    body: [
      'Chef and Puppet make a machine into something you declare rather than something you assemble. Ansible drops the agent entirely and gets by with SSH and a YAML file.',
      'The consequence is bigger than the convenience: infrastructure gets a diff, a review, a history, and a revert. The runbook stops being prose and starts being executable.',
    ],
    facts: [
      'Chef and Puppet turn the server into a program.',
      'Ansible, 2012 — no agent, just SSH and YAML.',
      'If it is not in the repository, it does not exist.',
    ],
    learned: { key: 'IAC', label: 'Infrastructure as code', gloss: 'Review the environment the way you review the app.' },
    dora: { leadHours: 72, deploysPerYear: 1000, recoverMinutes: 120 },
    theme: {
      bg: '#060B16', ink: '#D6DFF8', muted: '#5F6E96', accent: '#6C8CFF',
      rule: 'rgba(214,223,248,0.14)', field: 'rgba(108,140,255,0.07)', light: false,
    },
    pose: { posture: 0.62, stance: 0.36, tilt: 0, lift: 0.4, scale: 1.02 },
  },

  {
    id: 'container',
    n: '08',
    years: '2013',
    anchor: '2013',
    title: 'The Sealed Unit',
    thesis: 'The artifact starts carrying its own runtime.',
    body: [
      'The kernel features had been sitting there for years. Docker\'s contribution was a format, a registry and a command anybody could remember, which turned an operating system feature into a shipping standard.',
      '"Works on my machine" stops being a defence, because the machine is now part of what you shipped.',
    ],
    facts: [
      'Docker, PyCon, March 2013.',
      'cgroups and namespaces were already in the kernel — this made them usable.',
      'Build once, run the identical thing everywhere.',
    ],
    learned: { key: 'IMG', label: 'Immutable artifacts', gloss: 'Ship the whole environment, not just the code.' },
    dora: { leadHours: 24, deploysPerYear: 5000, recoverMinutes: 45 },
    theme: {
      bg: '#04101A', ink: '#CFE9F7', muted: '#57829A', accent: '#2FB4E8',
      rule: 'rgba(207,233,247,0.14)', field: 'rgba(47,180,232,0.07)', light: false,
    },
    pose: { posture: 0.7, stance: 0.44, tilt: 0, lift: 0.46, scale: 1.03 },
  },

  {
    id: 'desired',
    n: '09',
    years: '2014 — 2017',
    anchor: '2015',
    title: 'Desired State',
    thesis: 'You stop writing steps. You write the ending.',
    body: [
      'Kubernetes inverts the job. Instead of a script that performs a deployment, you hand the cluster a description of what should be true, and a control loop spends the rest of its life making reality match.',
      'Terraform does the same thing one layer down, for the cloud account itself. Recovery stops being a procedure you execute and starts being a property of the system.',
    ],
    facts: [
      'Kubernetes announced June 2014. Version 1.0 in July 2015.',
      'Terraform, 2014 — the same idea, applied to the account.',
      'The CNCF forms in 2015 to keep the ecosystem neutral.',
    ],
    learned: { key: 'K8S', label: 'Declarative orchestration', gloss: 'Describe the end state and let the loop converge.' },
    proof: 'Today: Kubernetes and Red Hat OpenShift operations with Helm-based release configuration.',
    dora: { leadHours: 8, deploysPerYear: 20000, recoverMinutes: 20 },
    theme: {
      bg: '#050B1D', ink: '#D5DFFB', muted: '#5E6D9C', accent: '#4C6EF5',
      rule: 'rgba(213,223,251,0.14)', field: 'rgba(76,110,245,0.07)', light: false,
    },
    pose: { posture: 0.78, stance: 0.4, tilt: 0, lift: 0.52, scale: 1.04 },
  },

  {
    id: 'feedback',
    n: '10',
    years: '2016 — 2019',
    anchor: '2016',
    title: 'The Feedback Organ',
    thesis: 'Production starts talking back in a language you can budget.',
    body: [
      'Google publishes how it runs things, and the useful part is not the automation — it is the accounting. An error budget turns reliability into a quantity you are allowed to spend, which finally gives "move fast" and "stay up" a shared unit.',
      'Metrics, logs and traces stop being three separate purchases. Instrumentation becomes something the application owes the operator.',
    ],
    facts: [
      'Site Reliability Engineering, published 2016. Error budgets get a spec.',
      'OpenTelemetry, 2019 — OpenTracing and OpenCensus merge.',
      'Reliability becomes a number a team is allowed to spend.',
    ],
    learned: { key: 'SLO', label: 'Service level objectives', gloss: 'Decide how much unreliability you can afford.' },
    proof: 'Today: production-readiness and observability work across cloud-native services, including ELK.',
    dora: { leadHours: 4, deploysPerYear: 50000, recoverMinutes: 8 },
    theme: {
      bg: '#041413', ink: '#CFF4EC', muted: '#4F8880', accent: '#25D9C4',
      rule: 'rgba(207,244,236,0.14)', field: 'rgba(37,217,196,0.07)', light: false,
    },
    pose: { posture: 0.85, stance: 0.36, tilt: 0, lift: 0.58, scale: 1.05 },
  },

  {
    id: 'signed',
    n: '11',
    years: '2018 — 2021',
    anchor: '2020',
    title: 'Signed and Sealed',
    thesis: 'Trust becomes something you verify instead of something you assume.',
    body: [
      'GitOps points the control loop at the repository, so the cluster continuously reconciles to a reviewed commit and drift becomes visible instead of normal.',
      'Then a supply chain attack teaches the industry that the build system is production too. Provenance, signing and attestation move from paperwork to plumbing.',
    ],
    facts: [
      'GitOps, named by Weaveworks in 2017. The cluster reconciles to the repo.',
      'SolarWinds, December 2020. The build system becomes the attack surface.',
      'SLSA and Sigstore, 2021 — provenance you can check, not trust.',
    ],
    learned: { key: 'SIG', label: 'Verifiable supply chain', gloss: 'Prove where the artifact came from.' },
    proof: 'Today: SonarQube, Veracode, Trivy and HashiCorp Vault integrated into delivery controls.',
    dora: { leadHours: 2, deploysPerYear: 80000, recoverMinutes: 5 },
    theme: {
      bg: '#0B0715', ink: '#E2D8F8', muted: '#6F6296', accent: '#A16BFF',
      rule: 'rgba(226,216,248,0.14)', field: 'rgba(161,107,255,0.07)', light: false,
    },
    pose: { posture: 0.91, stance: 0.34, tilt: 0, lift: 0.64, scale: 1.06 },
  },

  {
    id: 'golden',
    n: '12',
    years: '2022 — now',
    anchor: 'now',
    title: 'The Golden Path',
    thesis: 'Operations becomes a product with users who can leave.',
    body: [
      'The tooling got so good that using it became a full-time job, and every product team hired someone to do it badly. The correction is to treat the platform as a product: one paved route that is genuinely the easiest way to ship, and an escape hatch for the teams that need one.',
      'The measure of the work stops being uptime and starts being how long a new engineer takes to get their first change safely into production.',
    ],
    facts: [
      'Backstage, open-sourced by Spotify in 2020, becomes the shape of the internal portal.',
      'The platform team stops taking tickets and starts shipping a product.',
      'The golden path works because it is the fastest path, not because it is mandatory.',
    ],
    learned: { key: 'PLT', label: 'Platform as a product', gloss: 'Make the safe way the quick way.' },
    proof: 'Today: enterprise release engineering across a 50+ microservice banking platform.',
    dora: { leadHours: 0.4, deploysPerYear: 200000, recoverMinutes: 4 },
    theme: {
      bg: '#F0EAE0', ink: '#1C1913', muted: '#6C6355', accent: '#C4761B',
      rule: 'rgba(28,25,19,0.16)', field: 'rgba(28,25,19,0.06)', light: true,
    },
    pose: { posture: 1, stance: 0.32, tilt: 0, lift: 0.7, scale: 1.07 },
  },
];

export const ERA_COUNT = ERAS.length;

/** Palette for the opening title card, before the journey starts. */
export const OPENING_THEME = ERAS[0].theme;

/** Palette for the closing dossier, after the journey ends. */
export const CLOSING_THEME = ERAS[ERA_COUNT - 1].theme;
