'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useJourney } from '@/components/JourneySystem';
import { useEnvironment } from '@/components/system/Environment';
import { chaosFaults } from '@/content/chaos';
import { site } from '@/content';
import { STAGES } from '@/lib/lifecycle';
import styles from './CommandConsole.module.css';

/**
 * THE ENGINEERING COMMAND CONSOLE.
 *
 * Cmd/Ctrl + K. Every command here dispatches the *same* action the on-screen
 * control dispatches — either directly through the run lifecycle, or by
 * announcing a COMMAND on the system bus that the plate which owns that
 * control performs. There is no second implementation of anything, which is
 * why the console can never drift out of step with the buttons.
 */

type Command = {
  id: string;
  label: string;
  /** What it does, in one clause. */
  detail: string;
  group: 'Release' | 'Platform' | 'Chaos' | 'View' | 'Go to' | 'Session';
  /** Extra words that should match this command. */
  keywords?: string;
  run: () => void;
};

export function CommandConsole() {
  const pathname = usePathname();
  const run = useJourney();
  const env = useEnvironment();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const open = env.consoleOpen;

  const commands = useMemo<Command[]>(() => {
    const bus = env.bus;
    const command = (id: string, arg?: string) => () =>
      bus.emit({ type: 'COMMAND', command: id, arg });

    const list: Command[] = [
      {
        id: 'deploy',
        label: 'deploy',
        detail: 'Send one release up the flight through every gate.',
        group: 'Release',
        keywords: 'run release promote',
        run: () => {
          run.goTo('flight');
          command('release:run')();
        },
      },
      {
        id: 'rollback',
        label: 'rollback',
        detail: 'Return the flight to its previous state and clear the run.',
        group: 'Release',
        keywords: 'reset revert',
        run: () => {
          run.goTo('flight');
          command('release:reset')();
        },
      },
      {
        id: 'fix',
        label: 'apply fix',
        detail: 'Remediate the fault holding the release and reopen the gate.',
        group: 'Release',
        keywords: 'remediate recover unblock',
        run: () => {
          run.goTo('flight');
          command('release:fix')();
        },
      },
      {
        id: 'trace',
        label: 'trace request',
        detail: 'Send one request through edge, gateway, policy, service and data.',
        group: 'Platform',
        keywords: 'request route latency',
        run: () => {
          run.goTo('split');
          env.requestTrace();
        },
      },
      {
        id: 'drift',
        label: 'inject drift',
        detail: 'Edit live cluster state by hand, away from what Git declares.',
        group: 'Platform',
        keywords: 'gitops argo desync',
        run: () => {
          run.goTo('basin');
          run.clusterDrift(true);
        },
      },
      {
        id: 'reconcile',
        label: 'reconcile',
        detail: 'Pull live state back to the state Git declares.',
        group: 'Platform',
        keywords: 'argo sync restore',
        run: () => {
          run.goTo('basin');
          run.clusterDrift(false);
        },
      },
      {
        id: 'observe',
        label: 'observe',
        detail: 'Open the gauges — saturation, latency, errors, readiness.',
        group: 'Platform',
        keywords: 'telemetry metrics signals',
        run: () => run.goTo('gauges'),
      },
      ...chaosFaults.map<Command>((fault) => ({
        id: `chaos-${fault.id}`,
        label: `inject ${fault.id}`,
        detail: fault.what,
        group: 'Chaos',
        keywords: `chaos fault ${fault.label}`,
        run: () => {
          env.arm(fault.id);
          env.inject(fault.id);
          run.goTo(fault.plate);
        },
      })),
      {
        id: 'xray',
        label: 'xray',
        detail: 'Lift the interface and reveal the infrastructure underneath.',
        group: 'View',
        keywords: 'x-ray inspect internals',
        run: () => env.toggleXray(true),
      },
      {
        id: 'tour',
        label: 'guided tour',
        detail: 'Drive the strongest evidence in order. Any input returns control.',
        group: 'View',
        keywords: 'recruiter autopilot 45 second',
        run: () => env.startTour(),
      },
      {
        id: 'sound-on',
        label: 'sound on',
        detail: 'Enable procedural machine sound for system events.',
        group: 'View',
        keywords: 'audio sonification',
        run: () => env.toggleSound(true),
      },
      {
        id: 'sound-off',
        label: 'sound off',
        detail: 'Silence the works.',
        group: 'View',
        keywords: 'audio mute',
        run: () => env.toggleSound(false),
      },
      {
        id: 'resume',
        label: 'resume',
        detail: 'Open the full résumé.',
        group: 'Session',
        keywords: 'cv experience',
        run: () => {
          window.location.href = site.resumeRoute;
        },
      },
      {
        id: 'opening',
        label: 'replay opening',
        detail: 'Commission the works again from the beginning.',
        group: 'Session',
        keywords: 'intro commissioning',
        run: () => {
          window.scrollTo({ top: 0, behavior: 'auto' });
          run.playOpening();
        },
      },
      {
        id: 'restart',
        label: 'restart run',
        detail: 'Reset every semantic state and open a new run.',
        group: 'Session',
        keywords: 'new run reset works',
        run: () => {
          run.newRun();
          command('release:reset')();
          run.goTo('headwater');
        },
      },
      ...STAGES.map<Command>((stage) => ({
        id: `go-${stage.id}`,
        label: stage.name.toLowerCase(),
        detail: stage.sub,
        group: 'Go to',
        keywords: `${stage.no} ${stage.id}`,
        run: () => run.goTo(stage.id),
      })),
    ];

    return list;
  }, [env, run]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((item) =>
      `${item.label} ${item.detail} ${item.keywords ?? ''} ${item.group}`
        .toLowerCase()
        .includes(q),
    );
  }, [commands, query]);

  /** Inline completion of the highlighted command, shown behind the input. */
  const completion = useMemo(() => {
    const q = query.trim().toLowerCase();
    const top = results[index] ?? results[0];
    if (!q || !top || !top.label.startsWith(q)) return '';
    return top.label.slice(q.length);
  }, [index, query, results]);

  /* Cmd/Ctrl + K anywhere, Escape to close. */
  useEffect(() => {
    if (pathname !== '/') return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        env.openConsole(!env.consoleOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [env, pathname]);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      window.clearTimeout(timer);
      returnFocus.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[index] as HTMLElement | undefined;
    node?.scrollIntoView({ block: 'nearest' });
  }, [index, open]);

  if (pathname !== '/' || !open) return null;

  const dismiss = () => {
    env.openConsole(false);
    setQuery('');
  };

  const execute = (item: Command | undefined) => {
    if (!item) return;
    dismiss();
    env.sound.press();
    item.run();
  };

  let lastGroup = '';

  return (
    <div className={styles.root} role="presentation" onPointerDown={(e) => {
      if (e.target === e.currentTarget) dismiss();
    }}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Engineering command console"
      >
        <div className={styles.field}>
          <span className={styles.prompt} aria-hidden="true">›</span>
          <span className={styles.inputWrap}>
            <input
              ref={inputRef}
              className={styles.input}
              value={query}
              placeholder="deploy, trace request, inject cve, reconcile…"
              aria-label="Command"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                setQuery(event.target.value);
                setIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  dismiss();
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setIndex((i) => Math.min(results.length - 1, i + 1));
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setIndex((i) => Math.max(0, i - 1));
                }
                if (event.key === 'Tab' && completion) {
                  event.preventDefault();
                  setQuery(results[index]?.label ?? query);
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  execute(results[index]);
                }
              }}
            />
            {completion ? (
              <span className={styles.ghost} aria-hidden="true">
                <span className={styles.ghostTyped}>{query}</span>
                {completion}
              </span>
            ) : null}
          </span>
          <span className={styles.count}>
            {results.length} command{results.length === 1 ? '' : 's'}
          </span>
        </div>

        <ul className={styles.list} ref={listRef} role="listbox" aria-label="Commands">
          {results.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <li key={item.id} className={styles.item} data-on={i === index || undefined}>
                {header ? <span className={styles.group}>{header}</span> : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === index}
                  className={styles.command}
                  onPointerEnter={() => setIndex(i)}
                  onClick={() => execute(item)}
                >
                  <span className={styles.label}>{item.label}</span>
                  <span className={styles.detail}>{item.detail}</span>
                </button>
              </li>
            );
          })}
          {results.length === 0 ? (
            <li className={styles.empty}>
              No command matches that. Try deploy, reconcile, trace or xray.
            </li>
          ) : null}
        </ul>

        <p className={styles.foot}>
          ↑ ↓ move · Tab complete · Enter run · Esc close
        </p>
      </div>
    </div>
  );
}
