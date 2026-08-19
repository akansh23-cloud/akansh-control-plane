'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useJourney } from '@/components/JourneySystem';
import { ChaosPanel } from '@/components/system/ChaosPanel';
import { SystemStrip } from '@/components/system/SystemStrip';
import {
  contact,
  defaultDepth,
  depthModes,
  plates,
  profile,
  scanFacts,
  site,
  type DepthMode,
} from '@/content';
import { capsuleIdentity } from '@/lib/capsule';
import { phaseLabel, phaseTone, STAGES, stageIndex } from '@/lib/lifecycle';
import styles from './OperatorChrome.module.css';

type Drawer = 'index' | 'run' | null;

/**
 * OPERATOR CHROME.
 *
 * V8 had four independent fixed layers — the index bar, the living-release
 * console, the drill launcher and the replay control — and they fought each
 * other for the bottom of the screen. This is all of them, once.
 *
 * One bar. Two drawers, and never both at the same time. The content always
 * wins: opening a drawer suppresses everything else, the bar collapses on
 * short laptops, and the page reserves exactly the height the bar occupies so
 * nothing can ever be hidden behind it.
 */
export function OperatorChrome() {
  const pathname = usePathname();
  const run = useJourney();
  const [requested, setRequested] = useState<Drawer>(null);
  const [depth, setDepth] = useState<DepthMode>(defaultDepth);
  /* The opening owns the screen while it is on it: no drawer may sit over the
     commissioning sequence. Derived, never a second source of truth. */
  const drawer: Drawer = run.openingActive ? null : requested;
  const indexButton = useRef<HTMLButtonElement | null>(null);
  const runButton = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  /* Depth is progressive disclosure over one content model, published as a
     single attribute rather than a second copy of the application. */
  useEffect(() => {
    document.documentElement.dataset.depth = depth;
  }, [depth]);

  const close = useCallback(
    (restore = true) => {
      setRequested((current) => {
        if (restore && current === 'index') indexButton.current?.focus();
        if (restore && current === 'run') runButton.current?.focus();
        return null;
      });
    },
    [],
  );

  useEffect(() => {
    if (!drawer) return;
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (indexButton.current?.contains(target) || runButton.current?.contains(target)) return;
      close(false);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [close, drawer]);

  if (pathname !== '/') return null;

  const stage = STAGES[stageIndex(run.currentStage)];
  const index = stageIndex(run.currentStage);
  const advance = () => {
    close(false);
    if (!run.launched) run.launch();
    run.goTo(run.next.plate);
  };

  return (
    <div
      className={styles.root}
      data-drawer={drawer ?? undefined}
      data-phase={run.phase}
      data-hidden={run.openingActive || undefined}
    >
      {/* ---------------------------------------------------------------- */}
      {/* INDEX                                                            */}
      {/* ---------------------------------------------------------------- */}
      <div
        id="key-plate"
        ref={drawer === 'index' ? panelRef : undefined}
        className={styles.panel}
        data-open={drawer === 'index' || undefined}
        hidden={drawer !== 'index'}
        role="dialog"
        aria-modal="false"
        aria-labelledby="key-plate-title"
        tabIndex={-1}
      >
        <div className={styles.panelInner}>
          <div className={styles.identity}>
            <p id="key-plate-title" className="u-mark">The 60-second index</p>
            <p className={styles.name}>{profile.name}</p>
            <p className="u-data">{profile.roleLine}</p>
            <p className="u-data">{profile.location} · {profile.experience}</p>
          </div>

          <dl className={styles.facts}>
            {scanFacts.map((fact) => (
              <div key={`${fact.label}-${fact.value}`} className={styles.fact}>
                <dt className="u-mark">{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          <nav className={styles.nav} aria-label="Sections">
            <p className="u-mark">Go to</p>
            <ol className={styles.plateList}>
              {plates.map((plate, i) => (
                <li key={plate.id}>
                  <a
                    className={styles.plateLink}
                    href={`#${plate.id}`}
                    aria-current={i === index ? 'true' : undefined}
                    onClick={() => close(false)}
                  >
                    <span className={styles.plateNo}>{plate.no}</span>
                    <span className={styles.plateName}>{plate.name}</span>
                    <span className={styles.plateSub}>{plate.sub}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className={styles.panelFoot}>
            <div className={styles.depthBlock}>
              <p className="u-mark">Depth</p>
              <p className={styles.depthNote}>
                {depth === 'recruiter'
                  ? 'Recruiter view: role, outcomes, projects, credentials and the résumé, with the simulations folded away.'
                  : 'Engineer view: every simulation and the full technical detail behind each claim.'}
              </p>
              <div className={styles.depthGroupWide} role="group" aria-label="How much detail to show">
                {depthModes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={styles.depthBtn}
                    aria-pressed={depth === mode.id}
                    onClick={() => setDepth(mode.id)}
                  >
                    {mode.label} · {mode.hint}
                  </button>
                ))}
              </div>
            </div>

            <div className={`ctl-row ${styles.links}`}>
              <a className="ctl" data-primary="" href={site.resumeRoute}>Résumé</a>
              <a className="ctl" href={site.resumePath}>PDF</a>
              <a className="ctl" href={`mailto:${contact.email}`}>Email</a>
              <a className="ctl" href={contact.linkedin} target="_blank" rel="noreferrer noopener">LinkedIn</a>
              <a className="ctl" href={contact.github} target="_blank" rel="noreferrer noopener">GitHub</a>
              <button
                type="button"
                className="ctl"
                onClick={() => {
                  close(false);
                  window.scrollTo({ top: 0, behavior: 'auto' });
                  run.playOpening();
                }}
              >
                Replay opening
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* THE RUN                                                          */}
      {/* ---------------------------------------------------------------- */}
      <div
        id="living-release-panel"
        ref={drawer === 'run' ? panelRef : undefined}
        className={styles.panel}
        data-open={drawer === 'run' || undefined}
        hidden={drawer !== 'run'}
        role="dialog"
        aria-modal="false"
        aria-labelledby="living-release-title"
        tabIndex={-1}
      >
        <div className={styles.panelInner}>
          <div className={styles.runHead}>
            <div>
              <p id="living-release-title" className="u-mark">
                Release capsule · run {String(Math.max(1, run.runId)).padStart(2, '0')}
              </p>
              <p className={styles.name}>Akansh Portfolio</p>
              <p className="u-data">{capsuleIdentity(run.artifact).build}</p>
            </div>
            <p className={styles.phasePill} data-tone={phaseTone[run.phase]}>
              {phaseLabel[run.phase]}
            </p>
          </div>

          <div className={styles.route} aria-hidden="true">
            <span className={styles.routeFill} style={{ width: `${run.progress * 100}%` }} />
            {STAGES.map((item, i) => (
              <span
                key={item.id}
                className={styles.routeMark}
                data-passed={i <= index ? '' : undefined}
                style={{ left: `${(i / (STAGES.length - 1)) * 100}%` }}
              />
            ))}
          </div>

          {!run.launched ? (
            <div className={styles.start}>
              <p>
                Operate the portfolio as one release. Faults, drift, service fallback
                and incident decisions all become part of the same run record.
              </p>
              <button
                type="button"
                className="ctl"
                data-primary=""
                onClick={() => {
                  close(false);
                  run.launch();
                  run.goTo('flight');
                }}
              >
                Operate the works
              </button>
            </div>
          ) : null}

          <section className={styles.drill} aria-labelledby="blackwater-drill-title">
            <div className={styles.drillHead}>
              <p id="blackwater-drill-title" className="u-mark">Blackwater Drill · what this run is made of</p>
              <p className={styles.drillCount}>
                {run.completion.done} / {run.completion.total}
              </p>
            </div>
            <ol className={styles.objectives}>
              {run.objectives.map((objective) => (
                <li key={objective.id} data-done={objective.done || undefined}>
                  <span className={styles.objectiveNo} aria-hidden="true">{objective.no}</span>
                  <span className={styles.objectiveBody}>
                    <span className={styles.objectiveTitle}>
                      {objective.title}
                      {objective.required ? <em className={styles.required}>required</em> : null}
                    </span>
                    <span className={styles.objectiveText}>{objective.instruction}</span>
                  </span>
                  <span className={styles.objectiveState}>
                    {objective.done ? (
                      <span className={styles.doneMark}>done</span>
                    ) : (
                      <button
                        type="button"
                        className={styles.objectiveGo}
                        onClick={() => {
                          close(false);
                          if (!run.launched) run.launch();
                          run.goTo(objective.plate);
                        }}
                      >
                        Go to {objective.place}
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <p className={styles.drillNote}>
              No points and no score. Progress is earned only by doing the engineering
              the simulations are there to demonstrate.
            </p>
          </section>

          <ChaosPanel />

          <div className={styles.trace}>
            <p className="u-mark">Run trace</p>
            {run.events.length ? (
              <ol>
                {run.events.slice(-8).map((event) => (
                  <li key={event.id} data-tone={event.tone}>
                    <span>{event.stage}</span>
                    <strong>{event.label}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.empty}>No operator action recorded yet.</p>
            )}
          </div>

          <div className={`ctl-row ${styles.links}`}>
            <button
              type="button"
              className="ctl"
              onClick={() => {
                close(false);
                run.goTo(run.currentStage);
              }}
            >
              Return to current plate
            </button>
            <button
              type="button"
              className="ctl"
              onClick={() => {
                close(false);
                run.newRun();
                run.goTo('headwater');
              }}
            >
              New run
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* THE BAR                                                          */}
      {/* ---------------------------------------------------------------- */}
      <div className={styles.bar}>
        <span className={styles.railFill} style={{ width: `${run.progress * 100}%` }} aria-hidden="true" />

        <button
          ref={indexButton}
          type="button"
          className={styles.stageButton}
          aria-expanded={drawer === 'index'}
          aria-controls="key-plate"
          onClick={() => setRequested((current) => (current === 'index' ? null : 'index'))}
        >
          <span className={styles.stageNo}>{stage.no}</span>
          <span className={styles.stageName}>{stage.name}</span>
          <span className={styles.stageHint}>{drawer === 'index' ? 'Close' : 'Index'}</span>
        </button>

        <button
          ref={runButton}
          type="button"
          className={styles.runButton}
          aria-expanded={drawer === 'run'}
          aria-controls="living-release-panel"
          onClick={() => setRequested((current) => (current === 'run' ? null : 'run'))}
        >
          <span className={styles.artifactDot} data-tone={phaseTone[run.phase]} aria-hidden="true" />
          <span className={styles.runCopy}>
            <span className={styles.runKicker}>
              {run.launched ? `LIVE RUN ${String(run.runId).padStart(2, '0')}` : 'RELEASE CAPSULE'}
            </span>
            <span className={styles.runLine}>{capsuleIdentity(run.artifact).build}</span>
          </span>
          <span className={styles.runPhase} data-tone={phaseTone[run.phase]}>
            {phaseLabel[run.phase]}
          </span>
          <span className={styles.runCount}>{run.completion.done}/{run.completion.total}</span>
        </button>

        <div className={styles.depthGroup} role="group" aria-label="How much detail to show">
          {depthModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={styles.depthBtn}
              aria-pressed={depth === mode.id}
              onClick={() => setDepth(mode.id)}
            >
              <span className={styles.depthLong}>{mode.label}</span>
              <span className={styles.depthShort}>{mode.id === 'recruiter' ? '60s' : 'Full'}</span>
            </button>
          ))}
        </div>

        <SystemStrip />

        <button type="button" className={styles.next} onClick={advance}>
          <span className={styles.nextKicker}>Next operation</span>
          <span className={styles.nextLabel}>{run.next.label}</span>
        </button>
      </div>
    </div>
  );
}
