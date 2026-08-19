'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useMaybeEnvironment } from '@/components/system/Environment';
import styles from './Physical.module.css';

/**
 * PHYSICAL CONTROLS.
 *
 * Used where the *shape* of the control carries meaning, and nowhere else. A
 * guard over a deploy lever says "this one is irreversible". A rotary selector
 * with detents says "there are exactly four revisions to go back to". A
 * spring-loaded switch says "this holds only while you hold it".
 *
 * Everything here is a real button or a real radio group underneath. The
 * tactility is CSS on top of correct semantics — never instead of them.
 * A control that can only be operated with a mouse is a broken control.
 */

/* ------------------------------------------------------------------ */
/* Guarded lever — for actions that commit                             */
/* ------------------------------------------------------------------ */

export function GuardedLever({
  label,
  guardLabel = 'Lift guard',
  hint,
  disabled,
  onThrow,
}: {
  label: string;
  guardLabel?: string;
  hint?: string;
  disabled?: boolean;
  onThrow: () => void;
}) {
  const env = useMaybeEnvironment();
  const [open, setOpen] = useState(false);
  const [thrown, setThrown] = useState(false);
  const leverRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) leverRef.current?.focus();
  }, [open]);

  const commit = () => {
    if (disabled) return;
    setThrown(true);
    env?.sound.press();
    /* Resistance, then travel, then the action — the control moves first. */
    window.setTimeout(() => {
      onThrow();
      setThrown(false);
      setOpen(false);
    }, 220);
  };

  return (
    <div className={styles.lever} data-open={open || undefined} data-thrown={thrown || undefined}>
      <div className={styles.leverBody} aria-hidden="true">
        <span className={styles.leverTrack} />
        <span className={styles.leverArm} />
        <span className={styles.leverGuard} />
      </div>

      <div className={styles.leverControls}>
        {!open ? (
          <button
            type="button"
            className={styles.leverGuardBtn}
            disabled={disabled}
            onClick={() => {
              setOpen(true);
              env?.sound.detent();
            }}
          >
            {guardLabel}
          </button>
        ) : (
          <button
            ref={leverRef}
            type="button"
            className={styles.leverThrowBtn}
            disabled={disabled}
            onClick={commit}
          >
            {label}
          </button>
        )}
        {hint ? <p className={styles.hint}>{hint}</p> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rotary selector — discrete positions with detents                   */
/* ------------------------------------------------------------------ */

export function RotarySelector({
  label,
  positions,
  value,
  onChange,
  disabled,
}: {
  label: string;
  positions: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const env = useMaybeEnvironment();
  const name = useId();
  const index = Math.max(0, positions.findIndex((position) => position.id === value));
  const angle = positions.length > 1 ? (index / (positions.length - 1)) * 220 - 110 : 0;

  const move = (delta: number) => {
    if (disabled) return;
    const next = Math.min(positions.length - 1, Math.max(0, index + delta));
    if (next === index) return;
    env?.sound.detent();
    onChange(positions[next].id);
  };

  return (
    <div className={styles.rotary} data-disabled={disabled || undefined}>
      <p className={styles.controlLabel}>{label}</p>

      <div className={styles.rotaryBody}>
        <div
          className={styles.dial}
          style={{ '--angle': `${angle}deg` } as React.CSSProperties}
          aria-hidden="true"
        >
          <span className={styles.dialPointer} />
          {positions.map((position, i) => (
            <span
              key={position.id}
              className={styles.detent}
              data-on={i === index || undefined}
              style={
                {
                  '--d': `${(i / Math.max(1, positions.length - 1)) * 220 - 110}deg`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <div
          className={styles.rotaryOptions}
          role="radiogroup"
          aria-label={label}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
              event.preventDefault();
              move(1);
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
              event.preventDefault();
              move(-1);
            }
          }}
        >
          {positions.map((position, i) => (
            <button
              key={position.id}
              type="button"
              role="radio"
              name={name}
              aria-checked={i === index}
              tabIndex={i === index ? 0 : -1}
              className={styles.rotaryOption}
              disabled={disabled}
              onClick={() => {
                if (i === index) return;
                env?.sound.detent();
                onChange(position.id);
              }}
            >
              {position.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Spring-loaded switch — holds only while held                        */
/* ------------------------------------------------------------------ */

export function SpringSwitch({
  label,
  holdMs = 700,
  disabled,
  onComplete,
}: {
  label: string;
  holdMs?: number;
  disabled?: boolean;
  onComplete: () => void;
}) {
  const env = useMaybeEnvironment();
  const [held, setHeld] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef(0);
  const started = useRef(0);

  const stop = useCallback(
    (completed: boolean) => {
      window.clearInterval(timer.current);
      timer.current = 0;
      setHeld(false);
      setProgress(0);
      started.current = 0;
      if (completed) onComplete();
    },
    [onComplete],
  );

  const begin = useCallback(() => {
    if (disabled || timer.current) return;
    env?.sound.press();
    setHeld(true);
    started.current = performance.now();
    timer.current = window.setInterval(() => {
      const ratio = Math.min(1, (performance.now() - started.current) / holdMs);
      setProgress(ratio);
      if (ratio >= 1) stop(true);
    }, 40);
  }, [disabled, env, holdMs, stop]);

  useEffect(() => () => window.clearInterval(timer.current), []);

  return (
    <button
      type="button"
      className={styles.spring}
      data-held={held || undefined}
      disabled={disabled}
      aria-label={`${label} — hold to engage`}
      style={{ '--p': progress } as React.CSSProperties}
      onPointerDown={begin}
      onPointerUp={() => stop(false)}
      onPointerLeave={() => stop(false)}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          begin();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') stop(false);
      }}
      onBlur={() => stop(false)}
    >
      <span className={styles.springTrack} aria-hidden="true">
        <span className={styles.springFill} />
      </span>
      <span className={styles.springLabel}>{label}</span>
      <span className={styles.springHint}>hold</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Push button — mechanical acknowledgement                            */
/* ------------------------------------------------------------------ */

export function PushButton({
  children,
  tone = 'neutral',
  disabled,
  onPress,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'signal' | 'fault' | 'ok';
  disabled?: boolean;
  onPress: () => void;
}) {
  const env = useMaybeEnvironment();
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      className={styles.push}
      data-tone={tone}
      data-pressed={pressed || undefined}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        env?.sound.press();
        setPressed(true);
        /* Depression happens before the action. */
        window.setTimeout(() => {
          setPressed(false);
          onPress();
        }, 130);
      }}
    >
      <span className={styles.pushCap}>{children}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Mechanical lock — a state readout, not a control                    */
/* ------------------------------------------------------------------ */

export function MechanicalLock({
  locked,
  label,
}: {
  locked: boolean;
  label: string;
}) {
  return (
    <p className={styles.lock} data-locked={locked || undefined}>
      <span className={styles.lockBody} aria-hidden="true">
        <span className={styles.lockBolt} />
      </span>
      <span className={styles.lockLabel}>
        {label} · {locked ? 'LOCKED' : 'OPEN'}
      </span>
    </p>
  );
}
