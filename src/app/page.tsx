import { Brief } from '@/components/Brief';
import { Legend } from '@/components/Legend';
import { Plate } from '@/components/Plate';
import { Waterway } from '@/components/Waterway';
import { Basin } from '@/components/plates/Basin';
import { Flight } from '@/components/plates/Flight';
import { Gauges } from '@/components/plates/Gauges';
import { Headwater } from '@/components/plates/Headwater';
import { Refit } from '@/components/plates/Refit';
import { Split } from '@/components/plates/Split';
import { Tidewater } from '@/components/plates/Tidewater';
import { Vault } from '@/components/plates/Vault';
import { Watch } from '@/components/plates/Watch';
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

const plate = (id: string) => plates.find((p) => p.id === id)!;

export default function Home() {
  return (
    <>
      <main id="main">
        <section id="headwater" className={styles.hero}>
          <Headwater />
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
              through: can this be trusted here? Send one up. Then break it on
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
              to keep running. Drag the seam and watch each one become what
              replaced it.
            </p>
          }
        >
          <Refit />
        </Plate>

        <Plate
          id="basin"
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
          <Basin />
        </Plate>

        <Plate
          id="split"
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
          <Split />
        </Plate>

        <Plate
          id="gauges"
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
          <Gauges />
        </Plate>

        <Plate
          id="watch"
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
          <Watch />
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
      <Legend />
    </>
  );
}
