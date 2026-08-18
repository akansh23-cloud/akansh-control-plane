'use client';

import { useJourney } from '@/components/JourneySystem';
import { STAGES, type StageId } from '@/lib/lifecycle';
import styles from './Operation.module.css';

type OperationProps = {
  /** The objective in the run this plate is responsible for, if any. */
  objective?: string;
  /** What the visitor is doing here, in one clause. */
  doing: string;
  /** Why an engineer would care, in one clause. */
  matters: string;
  /** The control to reach for. */
  action: string;
  /** Where to continue. */
  next: StageId;
};

/**
 * THE OPERATION STRIP.
 *
 * The guided layer, and the answer to "what do I do here?". Each interactive
 * plate states the same four things in the same order — task, stake, control,
 * continuation — so the grammar is learned once and then recognised.
 *
 * It is progressive disclosure by *progress*, not by a second mode switch:
 * once the plate's objective has actually been completed the strip settles
 * into a quiet completed state instead of continuing to instruct.
 */
export function Operation({ objective, doing, matters, action, next }: OperationProps) {
  const run = useJourney();
  const target = STAGES.find((stage) => stage.id === next);
  const done = objective
    ? Boolean(run.objectives.find((item) => item.id === objective)?.done)
    : false;

  return (
    <div className={styles.root} data-done={done || undefined}>
      <p className={styles.state} aria-hidden="true">
        {done ? 'Complete' : 'Current task'}
      </p>

      <div className={styles.lines}>
        <p className={styles.doing}>{doing}</p>
        <p className={styles.matters}>
          <span className="u-mark">Why it matters</span>
          {matters}
        </p>
      </div>

      <div className={styles.then}>
        <p className={styles.action}>
          <span className="u-mark">Action</span>
          {action}
        </p>
        {target ? (
          <button
            type="button"
            className={styles.continue}
            onClick={() => {
              if (!run.launched) run.launch();
              run.goTo(next);
            }}
          >
            Continue to {target.name}
          </button>
        ) : null}
      </div>
    </div>
  );
}
