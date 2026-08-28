'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Fold } from '@/components/Fold';
import { LiveEvidence } from '@/components/LiveEvidence';
import { InspectionField } from '@/components/InspectionField';
import {
  mapEdges,
  mapGuarantee,
  mapNodes,
  mapProductEdges,
  mapProductNodes,
  mapProductViews,
  mapProductZones,
  mapProject,
  mapViews,
} from '@/content';
import { routeEdge, type Rect } from '@/lib/geometry';
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
 * PLATE 04 — THE BASIN. Migration Assurance Platform.
 *
 * This plate used to describe how MAP is deployed and call that the project.
 * It described a GitOps pipeline, which is true but is the delivery mechanism —
 * the platform itself is a deterministic data-migration verification service,
 * and that was missing from the site entirely.
 *
 * So there are now two groups of views. "The platform" is what MAP does:
 * how a run executes, what evidence it produces, and who is allowed to ask.
 * "How it ships" is the original AWS topology, kept because it is accurate and
 * because the accuracy tests depend on it, but demoted to what it is.
 *
 * The diagram itself is no longer boxes joined by diagonals. Nodes are laid out
 * in labelled zones, edges are routed orthogonally between measured faces with
 * fillets at the corners, flow marches along them in the direction the data
 * actually travels, and selecting a node dims everything it does not touch.
 * Every coordinate is measured from the live layout, so the drawing cannot
 * disagree with the page.
 */

type AnyViewId = string;

const DRIFTS = new Set(['eks', 'pods']);

const KEY_LABELS: Record<string, string> = {
  build: 'Work being done',
  supply: 'An artifact being produced',
  control: 'Control, identity or attestation',
  provision: 'Infrastructure being created',
  traffic: 'A real request',
};

export function Basin() {
  const reduced = usePrefersReducedMotion();
  const tier = useTier();
  const viewport = useViewport();

  const [view, setView] = useState<AnyViewId>('verification');
  const [drifted, setDrifted] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  const dx = viewport === 'mobile' ? 12 : 40;
  const dy = viewport === 'mobile' ? 26 : 30;

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

  const rootRef = useRigRoot<HTMLDivElement>(rig, (visible) => {
    rig.setClock(visible);
  });
  const pointerRef = usePointerField(rig);

  const isProduct = useMemo(
    () => mapProductViews.some((v) => v.id === view),
    [view],
  );

  const nodes = useMemo(
    () =>
      isProduct
        ? mapProductNodes.filter((n) => n.views.includes(view))
        : mapNodes.filter((n) => n.views.includes(view)),
    [isProduct, view],
  );

  const edges = useMemo(
    () =>
      isProduct
        ? mapProductEdges.filter((e) => e.views.includes(view))
        : mapEdges.filter((e) => e.views.includes(view)),
    [isProduct, view],
  );

  const zones = isProduct ? (mapProductZones[view] ?? []) : [];

  const stageRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  /* Measured geometry is derived state, not a ref: routing reads it during
     render, and a ref read during render is exactly the hazard the hooks lint
     rule is pointing at. The ref below is a mirror used only inside a paint
     callback, which runs after commit. */
  const [rects, setRects] = useState<Map<string, Rect>>(() => new Map());
  const rectsRef = useRef<Map<string, Rect>>(new Map());
  const [box, setBox] = useState({ w: 0, h: 0 });

  /* Measure the boxes, not their centres: routing needs faces. */
  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const base = stage.getBoundingClientRect();
    const next = new Map<string, Rect>();
    for (const [id, el] of nodeRefs.current) {
      const r = el.getBoundingClientRect();
      next.set(id, {
        x: r.left - base.left,
        y: r.top - base.top,
        w: r.width,
        h: r.height,
      });
    }
    rectsRef.current = next;
    setRects(next);
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

  const stageVarsRef = useVars<HTMLDivElement>(rig, {
    '--drift': (r) => r.get('drift'),
  });

  /* Route every edge from the measured layout. Recomputed on resize and view
     change only — never per frame. */
  const routed = useMemo(() => {
    const d = drifted ? 1 : 0;
    const shift = (id: string, r: Rect): Rect =>
      DRIFTS.has(id) ? { ...r, x: r.x + d * dx, y: r.y + d * dy } : r;

    return edges.flatMap((e) => {
      const a = rects.get(e.from);
      const b = rects.get(e.to);
      if (!a || !b) return [];
      const route = routeEdge(shift(e.from, a), shift(e.to, b), {
        radius: viewport === 'mobile' ? 8 : 14,
        gap: 3,
        axis: (e as { axis?: 'horizontal' | 'vertical' }).axis,
      });
      return [{ ...e, route, id: `${e.from}-${e.to}` }];
    });
  }, [edges, rects, drifted, dx, dy, viewport]);

  /* While the cluster is drifting the routes must follow it every frame, so
     the same shift is applied imperatively to the already-routed paths. */
  const linksRef = useRef<SVGGElement | null>(null);
  useEffect(() => {
    const g = linksRef.current;
    if (!g || !drifted) return;
    return rig.bindPaint(g, (el, r) => {
      const d = r.get('drift');
      const shift = (id: string, rect: Rect): Rect =>
        DRIFTS.has(id) ? { ...rect, x: rect.x + d * dx, y: rect.y + d * dy } : rect;
      for (const group of Array.from(el.querySelectorAll<SVGGElement>('[data-from]'))) {
        const a = rectsRef.current.get(group.dataset.from!);
        const b = rectsRef.current.get(group.dataset.to!);
        if (!a || !b) continue;
        const route = routeEdge(
          shift(group.dataset.from!, a),
          shift(group.dataset.to!, b),
          { radius: viewport === 'mobile' ? 8 : 14, gap: 3 },
        );
        group.querySelector('[data-part="line"]')?.setAttribute('d', route.path);
        group.querySelector('[data-part="head"]')?.setAttribute('d', route.head);
      }
    });
  }, [rig, drifted, dx, dy, viewport]);

  const show = useCallback(
    (next: AnyViewId) => {
      setView(next);
      setFocus(null);
      if (next !== 'gitops' && drifted) {
        setDrifted(false);
        rig.set('drift', 0, 'recovery');
      }
    },
    [drifted, rig],
  );

  const drift = useCallback(() => {
    setView('gitops');
    setFocus(null);
    setDrifted(true);
    rig.set('drift', 1, 'failure');
  }, [rig]);

  const reconcile = useCallback(() => {
    setDrifted(false);
    rig.set('drift', 0, 'recovery');
  }, [rig]);

  const caption = isProduct
    ? mapProductViews.find((v) => v.id === view)!.caption
    : mapViews.find((v) => v.id === view)!.caption;

  const focused = useMemo(
    () => nodes.find((n) => n.id === focus) ?? null,
    [nodes, focus],
  );

  /* What the selection is actually wired to, in the direction it is wired.
     Selecting a node isolates it on the drawing; this is the same isolation
     said in words, which is what a reader on a phone gets instead. */
  const wiring = useMemo(() => {
    if (!focus) return [];
    const name = (id: string) =>
      nodes.find((n) => n.id === id)?.label ?? id;
    return edges
      .filter((e) => e.from === focus || e.to === focus)
      .map((e) => ({
        id: `${e.from}-${e.to}`,
        out: e.from === focus,
        other: name(e.from === focus ? e.to : e.from),
        kind: e.kind,
      }));
  }, [focus, edges, nodes]);

  /* Connected set, for dimming everything the selection does not touch. */
  const connected = useMemo(() => {
    if (!focus) return null;
    const set = new Set<string>([focus]);
    for (const e of edges) {
      if (e.from === focus) set.add(e.to);
      if (e.to === focus) set.add(e.from);
    }
    return set;
  }, [focus, edges]);

  /* A tablet drops the node footnotes; at 1024px the zones need the room. */
  const showNotes = viewport === 'tablet' ? false : true;
  const kinds = useMemo(
    () => Array.from(new Set(edges.map((e) => e.kind))),
    [edges],
  );

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.controls}>
        <div className={styles.viewGroups}>
          <div className={styles.viewGroup}>
            <p className="u-mark">The platform</p>
            <div className={styles.views} role="tablist" aria-label="What the platform does">
              {mapProductViews.map((v) => (
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
          </div>

          <div className={styles.viewGroup}>
            <p className="u-mark">How it ships</p>
            <div className={styles.views} role="tablist" aria-label="How the platform is delivered">
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
          </div>
        </div>

        {view === 'gitops' ? (
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
        ) : null}
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
        data-product={isProduct || undefined}
        data-drifted={drifted || undefined}
        data-focused={focus ? '' : undefined}
        style={{ '--dx': `${dx}px`, '--dy': `${dy}px` } as React.CSSProperties}
      >
        {/* Labelled zones, so the drawing reads as an architecture rather than
            a scatter of boxes. */}
        {zones.map((z) => (
          <div key={z.id} className={styles.zone} data-zone={z.id} aria-hidden="true">
            <span className={styles.zoneLabel}>{z.label}</span>
          </div>
        ))}

        <svg
          className={styles.links}
          width={box.w || undefined}
          height={box.h || undefined}
          viewBox={box.w ? `0 0 ${box.w} ${box.h}` : undefined}
          aria-hidden="true"
          focusable="false"
        >
          <g ref={linksRef}>
            {routed.map((e) => {
              const dim =
                connected && !(connected.has(e.from) && connected.has(e.to));
              return (
                <g
                  key={e.id}
                  className={styles.link}
                  data-kind={e.kind}
                  data-from={e.from}
                  data-to={e.to}
                  data-dim={dim || undefined}
                >
                  <path data-part="line" d={e.route.path} />
                  {/* A second copy of the shaft, dashed, marching in the
                      direction of travel — the flow itself. */}
                  <path
                    data-part="flow"
                    d={e.route.path}
                    style={
                      {
                        '--len': e.route.length,
                      } as React.CSSProperties
                    }
                  />
                  <path data-part="head" d={e.route.head} />
                  {e.route.ports.map((p, i) => (
                    <circle key={i} data-part="port" cx={p.x} cy={p.y} r={2.5} />
                  ))}
                </g>
              );
            })}
          </g>

          {box.w ? (
            <InspectionField rig={rig} width={box.w} height={box.h} tone="night" />
          ) : null}
        </svg>

        {nodes.map((n) => (
          <button
            key={n.id}
            type="button"
            ref={(el) => {
              if (el) nodeRefs.current.set(n.id, el);
              else nodeRefs.current.delete(n.id);
            }}
            className={styles.node}
            data-node={n.id}
            data-zone={'zone' in n ? n.zone : undefined}
            data-drift={DRIFTS.has(n.id) ? '' : undefined}
            data-dim={connected && !connected.has(n.id) ? '' : undefined}
            data-selected={focus === n.id ? '' : undefined}
            aria-pressed={focus === n.id}
            onClick={() => setFocus((f) => (f === n.id ? null : n.id))}
          >
            <span className={styles.nodeLabel}>{n.label}</span>
            {showNotes && n.note ? (
              <span className={styles.nodeNote}>{n.note}</span>
            ) : null}
          </button>
        ))}

        {/* Edge labels ride above the nodes, because a label that a box can
            cover is worse than no label. Offset perpendicular to its own run,
            and dropped entirely where the corridor is too short to hold it. */}
        <svg
          className={styles.linkLabels}
          width={box.w || undefined}
          height={box.h || undefined}
          viewBox={box.w ? `0 0 ${box.w} ${box.h}` : undefined}
          aria-hidden="true"
          focusable="false"
        >
          {routed.map((e) => {
            if (!e.label || e.route.label.run < 78) return null;
            const { x, y, vertical } = e.route.label;
            return (
              <text
                key={`${e.id}-label`}
                className={styles.linkLabel}
                x={vertical ? x + 9 : x}
                y={vertical ? y + 4 : y - 8}
                textAnchor={vertical ? 'start' : 'middle'}
                data-dim={
                  connected && !(connected.has(e.from) && connected.has(e.to))
                    ? ''
                    : undefined
                }
              >
                {e.label}
              </text>
            );
          })}
        </svg>

        <div className={styles.ghost} aria-hidden="true">
          <span>Desired state · held in Git</span>
        </div>
      </div>

      {/* Selecting a node explains it, rather than making the reader hover and
          guess. On a phone this is the only way the notes are readable. */}
      <div className={styles.detail} data-open={focused ? '' : undefined} aria-live="polite">
        {focused ? (
          <>
            <p className={styles.detailName}>{focused.label}</p>
            {focused.note ? <p className={styles.detailNote}>{focused.note}</p> : null}
            {wiring.length ? (
              <ul className={styles.wiring}>
                {wiring.map((w) => (
                  <li key={w.id} data-kind={w.kind}>
                    <span className={styles.wiringDir}>{w.out ? 'to' : 'from'}</span>
                    <span className={styles.wiringName}>{w.other}</span>
                    <span className={styles.wiringKind}>
                      {KEY_LABELS[w.kind] ?? w.kind}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <button type="button" className={styles.clear} onClick={() => setFocus(null)}>
              Clear selection
            </button>
          </>
        ) : (
          <p className={styles.detailHint}>
            Select any component to read what it does and see only what it
            touches.
          </p>
        )}
      </div>

      {/* The guarantee the repository leads with. */}
      <div className={styles.guarantee}>
        <p className={styles.guaranteeHead}>{mapGuarantee.headline}</p>
        <p className={styles.guaranteeBody}>{mapGuarantee.body}</p>
        <ul className={styles.proofs}>
          {mapGuarantee.proofs.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="u-data">{mapGuarantee.tests}</p>
      </div>

      <Fold label="What the lines mean" hint={`${kinds.length} kinds`}>
        <ul className={styles.key}>
          {kinds.map((k) => (
            <li key={k} data-kind={k}>
              {KEY_LABELS[k] ?? k}
            </li>
          ))}
        </ul>
      </Fold>

      <Fold label="How it is delivered" hint={`${mapProject.principles.length} rules`}>
        <ul className={styles.principles}>
          {mapProject.principles.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Fold>

      <p className={styles.source}>
        <span className="u-mark">Code</span>
        <a href={mapProject.repo} target="_blank" rel="noreferrer noopener">
          {mapProject.repoLabel}
        </a>
        <span className={styles.deployNote}>{mapProject.deployment}</span>
      </p>
      <LiveEvidence repo="akansh23-cloud/migration-verification" />
    </div>
  );
}
