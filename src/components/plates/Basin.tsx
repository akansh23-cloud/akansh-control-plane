'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  mapEdges,
  mapNodes,
  mapProject,
  mapViews,
  type MapViewId,
} from '@/content';
import { InspectionField } from '@/components/InspectionField';
import { arrow } from '@/lib/geometry';
import {
  usePointerField,
  usePrefersReducedMotion,
  useRig,
  useRigRoot,
  useTier,
  useVars,
  useViewport,
} from '@/lib/motion';
import styles from './Basin.module.css';

/**
 * PLATE 04 — THE BASIN. Migration Assurance Platform. Personal project.
 *
 * Four views of one system. The rejected version drew plain boxes and lines
 * inside a fixed viewBox, which is why the labels were unreadable and most of
 * the phone screen was empty.
 *
 * Here the nodes are real DOM elements laid out on a CSS grid, so they are
 * typeset rather than scaled, and the edges are measured from where those
 * elements actually landed. That means the diagram is correct at 360px and at
 * 1920px without a single hard-coded coordinate.
 *
 * The interaction is the one that matters for GitOps: edit the cluster by
 * hand, watch it diverge from the state Git is holding, then let Argo CD pull
 * it back. Nothing in the pipeline touches the cluster, and nothing in the
 * cluster survives a reconcile.
 */

type Point = { x: number; y: number };

const DRIFTS = new Set(['eks', 'pods']);

export function Basin() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();
  /* How far a hand edit moves the cluster. A phone drifts mostly downward,
     because sideways is where the screen edge is. The same two numbers drive
     the CSS transform and the edge geometry, so the arrows never lie about
     where the cluster went. */
  const dx = viewport === 'mobile' ? 12 : 40;
  const dy = viewport === 'mobile' ? 26 : 30;

  const [view, setView] = useState<MapViewId>('gitops');
  const [drifted, setDrifted] = useState(false);

  const rig = useRig({
    channels: {
      drift: { value: 0, family: 'mechanical' },
      pointerX: { value: 0.5, family: 'mechanical' },
      pointerY: { value: 0.5, family: 'mechanical' },
      pointerIn: { value: 0, family: 'mechanical' },
    },
    reduced,
    tier,
  });

  const rootRef = useRigRoot<HTMLDivElement>(rig);
  const pointerRef = usePointerField(rig);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const positions = useRef(new Map<string, Point>());
  const [box, setBox] = useState({ w: 0, h: 0 });

  const nodes = useMemo(
    () => mapNodes.filter((n) => n.views.includes(view)),
    [view],
  );
  const edges = useMemo(
    () => mapEdges.filter((e) => e.views.includes(view)),
    [view],
  );

  /* Measure where the browser actually put every node. The diagram is
     therefore a consequence of the layout, not a second description of it. */
  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const base = stage.getBoundingClientRect();
    positions.current.clear();
    for (const [id, el] of nodeRefs.current) {
      const r = el.getBoundingClientRect();
      positions.current.set(id, {
        x: r.left - base.left + r.width / 2,
        y: r.top - base.top + r.height / 2,
      });
    }
    setBox({ w: base.width, h: base.height });
    rig.invalidate();
  }, [rig]);

  useLayoutEffect(() => {
    measure();
  }, [measure, view, viewport]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [measure]);

  /* The drift offset is published as a variable so the nodes move on the
     compositor; the edges are repainted from the same channel so the two
     never disagree about where the cluster is. */
  const stageVarsRef = useVars<HTMLDivElement>(rig, {
    '--drift': (r) => r.get('drift'),
  });

  const linksRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const g = linksRef.current;
    if (!g) return;
    return rig.bindPaint(g, (el, r) => {
      const d = r.get('drift');
      const at = (id: string): Point => {
        const p = positions.current.get(id) ?? { x: 0, y: 0 };
        return DRIFTS.has(id) ? { x: p.x + d * dx, y: p.y + d * dy } : p;
      };

      for (const path of Array.from(el.querySelectorAll<SVGPathElement>('[data-from]'))) {
        const from = at(path.dataset.from!);
        const to = at(path.dataset.to!);
        const shaft = arrow(from.x, from.y, to.x, to.y, 9);
        path.setAttribute('d', path.dataset.part === 'head' ? shaft.head : shaft.line);
      }
    });
  }, [rig, view, box.w, box.h, dx, dy]);

  const drift = useCallback(() => {
    setView('gitops');
    setDrifted(true);
    rig.set('drift', 1, 'failure');
  }, [rig]);

  const reconcile = useCallback(() => {
    setDrifted(false);
    rig.set('drift', 0, 'recovery');
  }, [rig]);

  /* Leaving the GitOps view puts the cluster back, because the drift only
     means anything next to the desired state that Git is holding. */
  const show = useCallback(
    (next: MapViewId) => {
      setView(next);
      if (next !== 'gitops' && drifted) {
        setDrifted(false);
        rig.set('drift', 0, 'recovery');
      }
    },
    [drifted, rig],
  );

  const caption = mapViews.find((v) => v.id === view)!.caption;

  /* A tablet keeps the four view buttons on one line but drops the node
     footnotes, which is where the 1024px composition previously ran out of
     horizontal room. */
  const showNotes = viewport === 'tablet' ? false : true;


  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.controls}>
        <div className={styles.views} role="tablist" aria-label="Views of the platform">
          {mapViews.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              className="ctl"
              data-on={view === v.id ? '' : undefined}
              aria-selected={view === v.id}
              onClick={() => show(v.id)}
            >
              {v.name}
            </button>
          ))}
        </div>

        <div className={styles.sync}>
          <p className="lamp" data-state={drifted ? 'fault' : 'ok'}>
            {drifted ? 'Out of sync' : 'Synced'}
          </p>
          <div className="ctl-row">
            <button type="button" className="ctl" onClick={drift} disabled={drifted}>
              Edit the cluster
            </button>
            <button
              type="button"
              className="ctl"
              data-primary=""
              onClick={reconcile}
              disabled={!drifted}
            >
              Reconcile
            </button>
          </div>
        </div>
      </div>

      <p className={styles.caption} aria-live="polite">
        {drifted
          ? 'Someone changed the cluster by hand. Git still holds the state that was agreed, so the two no longer match.'
          : caption}
      </p>

      <div
        ref={(node) => {
          stageRef.current = node;
          pointerRef(node);
          stageVarsRef(node);
        }}
        className={styles.stage}
        data-view={view}
        data-drifted={drifted || undefined}
        style={{ '--dx': `${dx}px`, '--dy': `${dy}px` } as React.CSSProperties}
      >
        <svg
          className={styles.links}
          width={box.w || undefined}
          height={box.h || undefined}
          viewBox={box.w ? `0 0 ${box.w} ${box.h}` : undefined}
          aria-hidden="true"
          focusable="false"
        >
          <g ref={linksRef}>
            {edges.map((e) => (
              <g key={`${e.from}-${e.to}`} className={styles.link} data-kind={e.kind}>
                <path data-from={e.from} data-to={e.to} data-part="line" />
                <path data-from={e.from} data-to={e.to} data-part="head" />
              </g>
            ))}
          </g>
          {box.w ? (
            <InspectionField rig={rig} width={box.w} height={box.h} tone="night" />
          ) : null}
        </svg>

        {nodes.map((n) => (
          <div
            key={n.id}
            ref={(el) => {
              if (el) nodeRefs.current.set(n.id, el);
              else nodeRefs.current.delete(n.id);
            }}
            className={styles.node}
            data-node={n.id}
            data-drift={DRIFTS.has(n.id) ? '' : undefined}
          >
            <span className={styles.nodeLabel}>{n.label}</span>
            {showNotes && n.note ? (
              <span className={styles.nodeNote}>{n.note}</span>
            ) : null}
          </div>
        ))}

        {/* The state Git is holding, left behind when the cluster is edited. */}
        <div className={styles.ghost} aria-hidden="true">
          <span>Desired state · held in Git</span>
        </div>
      </div>

      <ul className={styles.key} aria-label="What the lines mean">
        <li data-kind="build">Build — an artifact moving through the pipeline</li>
        <li data-kind="supply">Supply — an immutable image being pulled</li>
        <li data-kind="control">Control — desired state and reconciliation</li>
        <li data-kind="provision">Provision — infrastructure being created</li>
        <li data-kind="traffic">Traffic — a real user request</li>
      </ul>

      <ul className={styles.principles}>
        {mapProject.principles.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
