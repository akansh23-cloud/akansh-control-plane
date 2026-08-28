import dynamic from 'next/dynamic';
import { Brief } from '@/components/Brief';
import { TechTerm } from '@/components/TechTerm';
import { CapsuleDock } from '@/components/system/ReleaseCapsule';
import { Operation } from '@/components/Operation';
import { Plate } from '@/components/Plate';
import { Waterway } from '@/components/Waterway';
import { Flight } from '@/components/plates/Flight';
import { Headwater } from '@/components/plates/Headwater';
import {
  barclays,
  careerProject,
  flightNote,
  incident,
  mapProject,
  observabilityNote,
  plates,
  profile,
} from '@/content';
import styles from './page.module.css';

/* Performance is a plate. The Headwater and the Flight are the first screen
   and the first interaction, so they ship in the main bundle; everything
   below them is still server-rendered (nothing is hidden from a crawler or
   a reader with JavaScript off) but its client code arrives in its own
   chunk when the reader gets there. */
const Refit = dynamic(() => import('@/components/plates/Refit').then((m) => m.Refit));
const Basin = dynamic(() => import('@/components/plates/Basin').then((m) => m.Basin));
const Split = dynamic(() => import('@/components/plates/Split').then((m) => m.Split));
const Gauges = dynamic(() => import('@/components/plates/Gauges').then((m) => m.Gauges));
const Watch = dynamic(() => import('@/components/plates/Watch').then((m) => m.Watch));
const Vault = dynamic(() => import('@/components/plates/Vault').then((m) => m.Vault));
const Tidewater = dynamic(() => import('@/components/plates/Tidewater').then((m) => m.Tidewater));
const TraceRequest = dynamic(() =>
  import('@/components/TraceRequest').then((m) => m.TraceRequest),
);
const IncidentTimeMachine = dynamic(() =>
  import('@/components/IncidentTimeMachine').then((m) => m.IncidentTimeMachine),
);
const plate = (id: string) => plates.find((p) => p.id === id)!;

export default function Home() {
  return (
    <>
      <main id="main">
        <section
          id="headwater"
          className={styles.hero}
          data-xray="system"
          data-xray-label="Source"
          data-xray-duty="Where the release capsule is commissioned"
        >
          <Headwater />
          <div className={styles.capsuleBay}>
            <CapsuleDock id="headwater" label="Release capsule" />
          </div>
        </section>

        {/* The sixty-second version of everything below. Shown only when the
            reader asks for that depth; the content is the same content. */}
        <Brief />

        <Plate
          id="flight"
          no={plate('flight').no}
          name={plate('flight').name}
          sub={plate('flight').sub}
          title="A release is not dropped into production. It is lifted."
          intro={
            <p className="u-prose">
              Every release answers the same question at every level it passes
              through: can this be trusted here? <TechTerm id="gitlab">GitLab
              CI/CD</TechTerm> carries one image up; <TechTerm id="trivy" /> is
              the last place it can be stopped. Send one up, then break it on
              purpose and watch a gate refuse.
            </p>
          }
          aside={
            <div className={styles.role}>
              <p className="u-mark">Current role</p>
              <p className={styles.roleTitle}>
                {barclays.title}, {barclays.company}
              </p>
              <p className="u-data">{barclays.period}</p>
              <p className="u-data">{barclays.location}</p>
              <p className={styles.roleContext}>{barclays.context}</p>
              <ul className={styles.stack}>
                {barclays.stack.slice(0, 8).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          }
          note={flightNote}
        >
          <Operation
            objective="release"
            doing="Send one immutable image through the delivery gates."
            matters="The artifact that was scanned is the artifact that runs. Nothing is rebuilt on the way up."
            action="Run a release — then break it at a gate and recover it."
            next="refit"
          />
          <Flight />
        </Plate>

        <Plate
          id="refit"
          no={plate('refit').no}
          name={plate('refit').name}
          sub={plate('refit').sub}
          title="Rebuilding the works while the water is still in them."
          intro={
            <p className="u-prose">
              Five layers of the platform were replaced under a service that had
              to keep running — including the move to <TechTerm id="helm" /> on{' '}
              <TechTerm id="openshift" />. Drag the seam and watch each one
              become what replaced it.
            </p>
          }
        >
          <Operation
            doing="Replace five layers of a platform underneath a running service."
            matters="Modernisation is only credible if it can be done without taking the service away."
            action="Drag the seam, or jump to Before and After."
            next="basin"
          />
          <Refit />
          <div className={styles.capsuleBay}>
            <CapsuleDock id="refit" label="Capsule held while the works are rebuilt" />
          </div>
        </Plate>

        <Plate
          id="basin"
          water
          no={plate('basin').no}
          name={plate('basin').name}
          sub={plate('basin').sub}
          title="Git holds the level. The cluster follows it."
          intro={
            <>
              <p className="u-prose">{mapProject.premise}</p>
              <p className="u-note">
                Personal project. Four views of the same works — and one
                interaction that shows what GitOps is actually for.
              </p>
            </>
          }
          aside={
            <div className={styles.role}>
              <p className="u-mark">Stack</p>
              <ul className={styles.stack}>
                {mapProject.stack.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          }
          note="Simulation. The drift and reconciliation you can trigger here are a model of how Argo CD behaves, drawn in the browser — not a live cluster."
        >
          <Operation
            objective="gitops"
            doing="Break the cluster by hand, then let Git put it back."
            matters="Declared state is what makes a platform recoverable instead of merely documented."
            action="Edit the cluster, then reconcile."
            next="split"
          />
          <div
            data-xray="state"
            data-xray-label="Declared state"
            data-xray-duty="Git holds the level — Argo CD reconciles the cluster to it"
          >
            <Basin />
          </div>
          <div className={styles.capsuleBay}>
            <CapsuleDock id="basin" label="Capsule locked to declared state" />
          </div>
        </Plate>

        <Plate
          id="split"
          water
          no={plate('split').no}
          name={plate('split').name}
          sub={plate('split').sub}
          title="Taking the monolith apart without stopping the water."
          intro={
            <>
              <p className="u-prose">{careerProject.premise}</p>
              <p className="u-note">
                Personal project. Pull services out one at a time, then take one
                out of service and watch where the request goes instead.
              </p>
            </>
          }
          note="Simulation. Numbered units stand in for the services; the count, the routing behaviour and the fallback are real."
        >
          <Operation
            objective="fallback"
            doing="Take an extracted service out and watch where the request goes."
            matters="A decomposition is only safe if the gateway has somewhere to fall back to."
            action="Extract services, then take one out of service."
            next="gauges"
          />
          <div
            data-xray="network"
            data-xray-label="Gateway"
            data-xray-duty="Resolves each route, and holds the fallback to the monolith"
          >
            <Split />
          </div>
          <TraceRequest />
          <div className={styles.capsuleBay}>
            <CapsuleDock id="split" label="Capsule serving traffic" />
          </div>
        </Plate>

        <Plate
          id="gauges"
          water
          no={plate('gauges').no}
          name={plate('gauges').name}
          sub={plate('gauges').sub}
          title="Health is not a dashboard. It is a set of relationships."
          intro={
            <p className="u-prose">
              Four signals, wired to each other the way they actually are. Raise
              the load and watch which one moves first — that is the one worth
              alerting on.
            </p>
          }
          note={observabilityNote}
        >
          <Operation
            doing="Raise the load and watch which signal moves first."
            matters="The signal that moves first is the one worth alerting on; errors are the last to appear."
            action="Drag the load against the resource limit."
            next="watch"
          />
          <div
            data-xray="state"
            data-xray-label="Telemetry"
            data-xray-duty="Saturation → latency → readiness → errors, in that order"
          >
            <Gauges />
          </div>
        </Plate>

        <Plate
          id="watch"
          water
          no={plate('watch').no}
          name={plate('watch').name}
          sub={plate('watch').sub}
          title="The half hour where it is not obvious that it is working."
          intro={
            <>
              <p className="u-prose">
                Everything above shows a system behaving. This is the other
                half of the job: reading what the platform is telling you, in
                the right order, and noticing when it has already contained the
                fault for you.
              </p>
              <p className="u-note">
                Read the signals, then call it. There is a wrong answer that
                looks very reasonable.
              </p>
            </>
          }
          note={incident.simulated}
        >
          <Operation
            objective="incident"
            doing="Read the evidence in the order it arrived, then call the fault."
            matters="Most of incident response is deciding what the platform has already contained for you."
            action="Work the signals, then name the cause."
            next="vault"
          />
          <IncidentTimeMachine />
          <Watch />
          <div className={styles.capsuleBay}>
            <CapsuleDock id="watch" label="Capsule under observation" />
          </div>
        </Plate>

        <Plate
          id="vault"
          no={plate('vault').no}
          name={plate('vault').name}
          sub={plate('vault').sub}
          title="A claim is worth what backs it."
          intro={
            <p className="u-prose">
              Every strong statement on this site, opened up: the claim, the
              context, what I actually did, what it was built with, and what a
              reader can check — including the places where the work is
              confidential and honestly cannot be checked.
            </p>
          }
        >
          <Vault />
          <div className={styles.capsuleBay}>
            <CapsuleDock id="vault" label="Capsule with its evidence" />
          </div>
        </Plate>

        <Plate
          id="tidewater"
          no={plate('tidewater').no}
          name={plate('tidewater').name}
          sub={plate('tidewater').sub}
          tone="deep"
          title="Where the work arrives."
          intro={
            <p className="u-prose">
              The toolkit, what is certified and what is only being studied, the
              degree, the earlier role, and the fastest way to reach me.
            </p>
          }
        >
          <Tidewater />
          <div className={styles.capsuleBay}>
            <CapsuleDock id="tidewater" label="Capsule in production" />
          </div>
        </Plate>

        <footer className={styles.footer}>
          <p className="u-data">{profile.name}</p>
          <p className="u-note">
            Built as a working application: {profile.practice}, content held in
            one canonical layer, and a test suite that fails the build if a
            claim on this page stops being true.
          </p>
        </footer>
      </main>

      <Waterway />
    </>
  );
}
