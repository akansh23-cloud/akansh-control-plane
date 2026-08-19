'use client';

import { useState } from 'react';
import { PushButton } from '@/components/controls/Physical';
import { useJourney } from '@/components/JourneySystem';
import { useEnvironment } from '@/components/system/Environment';
import { chaosFaults, chaosNote, chaosPreamble, findFault } from '@/content/chaos';
import styles from './ChaosPanel.module.css';

/**
 * CHAOS MODE.
 *
 * An operator panel, not a party trick. Nothing can be injected by accident:
 * a fault is armed first and injected second, which is the same two-stage
 * discipline the guarded lever uses on the Flight and the same one a real
 * change process uses.
 *
 * What makes this worth showing is the *reaction*, so every injected fault
 * states what the system did about it and offers the specific recovery. There
 * is no score, no achievement, and no random destruction — injecting the same
 * fault twice does exactly the same thing both times.
 */
export function ChaosPanel() {
  const run = useJourney();
  const env = useEnvironment();
  const [open, setOpen] = useState(false);

  const armed = findFault(env.armed);
  const active = env.active.map((id) => findFault(id)).filter(Boolean);

  return (
    <section
      className={styles.root}
      data-open={open || undefined}
      data-armed={Boolean(armed) || undefined}
      data-active={active.length ? '' : undefined}
      aria-label="Chaos engineering panel"
      data-xray="system"
      data-xray-label="Chaos panel"
      data-xray-duty="Injects a deterministic fault and shows what contains it"
    >
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls="chaos-body"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={styles.toggleLamp} data-state={active.length ? 'fault' : armed ? 'hold' : 'idle'} />
        <span className={styles.toggleCopy}>
          <span className={styles.toggleKicker}>Chaos</span>
          <span className={styles.toggleState}>
            {active.length
              ? `${active.length} fault${active.length === 1 ? '' : 's'} active`
              : armed
                ? `${armed.label} armed`
                : 'System nominal'}
          </span>
        </span>
        <span className={styles.toggleHint}>{open ? 'Close' : 'Open'}</span>
      </button>

      <div id="chaos-body" className={styles.body} hidden={!open}>
        <p className={styles.preamble}>{chaosPreamble}</p>

        <ol className={styles.faults}>
          {chaosFaults.map((fault) => {
            const isArmed = env.armed === fault.id;
            const isActive = env.active.includes(fault.id);
            return (
              <li key={fault.id} data-armed={isArmed || undefined} data-active={isActive || undefined}>
                <button
                  type="button"
                  className={styles.fault}
                  aria-pressed={isArmed}
                  disabled={isActive}
                  onClick={() => env.arm(isArmed ? null : fault.id)}
                >
                  <span className={styles.faultLabel}>{fault.label}</span>
                  <span className={styles.faultWhat}>{fault.what}</span>
                  <span className={styles.faultState} data-severity={fault.severity}>
                    {isActive ? 'injected' : isArmed ? 'armed' : fault.severity}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className={styles.inject}>
          <PushButton
            tone={armed ? 'fault' : 'neutral'}
            disabled={!armed}
            onPress={() => env.inject()}
          >
            Inject
          </PushButton>
          <p className={styles.injectNote}>
            {armed
              ? `${armed.label} is armed. Injecting it produces the reaction below, on ${armed.plate}.`
              : 'Arm a fault to enable injection.'}
          </p>
        </div>

        {active.length ? (
          <div className={styles.active}>
            <p className="u-mark">Active faults · what the system did</p>
            <ul className={styles.activeList}>
              {active.map((fault) => (
                <li key={fault!.id}>
                  <p className={styles.activeLabel}>{fault!.label}</p>
                  <p className={styles.activeReaction}>{fault!.reaction}</p>
                  <div className={styles.activeActions}>
                    <PushButton tone="ok" onPress={() => env.recover(fault!.id)}>
                      {fault!.recovery}
                    </PushButton>
                    <button
                      type="button"
                      className={styles.goto}
                      onClick={() => {
                        setOpen(false);
                        run.goTo(fault!.plate);
                      }}
                    >
                      See it
                    </button>
                  </div>
                  <p className={styles.activeRecovers}>{fault!.recovers}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className={styles.note}>{chaosNote}</p>
      </div>
    </section>
  );
}
