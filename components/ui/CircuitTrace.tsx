"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/motion";

/**
 * CircuitNetwork v3 — symmetric circuit layer that GROWS OUT OF NOTHING and
 * PLUGS INTO REAL ELEMENTS.
 *
 * - No full-height rod: each half is a finite organism — an origin pad, a
 *   spine segment spanning only its own junctions, a terminal pad. It begins
 *   and ends. Scrubbed drawing makes it sprout from the origin as the
 *   section moves, and retract in reverse.
 * - Ambient branches are SHORT stubs (they never reach content). Long runs
 *   exist only as CONNECTORS: paths routed at runtime from the spine to the
 *   measured corners of elements marked [data-circuit-target] — so lines
 *   always terminate exactly AT something (a tile corner, a content block),
 *   never through it.
 * - Symmetry: ambient geometry is generated once and mirrored structurally.
 *   Connectors follow the layout — for centered/symmetric layouts they are
 *   symmetric by construction.
 */

type Branch = { d: string; y: number; endX: number; endY: number; kind: "pad" | "ring" | "accent" };
type Half = { spineX: number; y0: number; y1: number; branches: Branch[] };
type Connector = { d: string; y: number; endX: number; endY: number };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRID = 24;

function genAmbient(seed: number, w: number, h: number, railX: number, sparse: boolean): Half {
  const rnd = mulberry32(seed);
  const spineX = Math.round(railX * w);
  const branches: Branch[] = [];
  const gap = sparse ? 150 : 78; // denser than before → reads as a PCB ribbon
  const pad = Math.max(GRID * 3, h * 0.1);
  const reach = sparse ? GRID * 3 : GRID * 5;
  let accentPlaced = false;

  for (let y = pad; y < h - pad; y += gap + rnd() * gap * 0.4) {
    const by = Math.round(y / GRID) * GRID;
    const inward = rnd() > 0.32;
    const dir = inward ? 1 : -1;

    // PCB-style trace: horizontal run → 45° elbow → run → optional 2nd elbow →
    // terminal. Grid-aligned, elbows at 45° (dx === dy).
    let x = spineX;
    let cy = by;
    let d = `M${x},${cy}`;
    const runs = sparse ? 1 : 1 + Math.floor(rnd() * 2); // 1–2 elbows
    const step = () => GRID * (1 + Math.floor(rnd() * 2));
    for (let s = 0; s <= runs; s++) {
      const run = step();
      x = x + run * dir;
      if (Math.abs(x - spineX) > reach) { x = spineX + reach * dir; d += ` L${x},${cy}`; break; }
      d += ` L${x},${cy}`;
      if (s < runs) {
        const e = GRID * (rnd() > 0.5 ? 1 : -1); // 45° elbow
        x += Math.abs(e) * dir;
        cy += e;
        d += ` L${x},${cy}`;
      }
    }
    const endX = x, endY = cy;

    let kind: Branch["kind"] = rnd() > 0.42 ? "ring" : "pad"; // ring-heavy, like the ref
    if (!accentPlaced && rnd() > 0.7) { kind = "accent"; accentPlaced = true; }
    branches.push({ d, y: by, endX, endY, kind });

    // occasional inline via (open ring partway along the trace)
    if (!sparse && rnd() > 0.6) {
      const vx = spineX + Math.round(reach * 0.4) * dir;
      branches.push({ d: `M${spineX},${by} L${vx},${by}`, y: by, endX: vx, endY: by, kind: "ring" });
    }
  }

  const ys = branches.map((b) => b.y);
  const y0 = (ys.length ? Math.min(...ys) : pad) - GRID;
  const y1 = (ys.length ? Math.max(...ys) : h - pad) + GRID;
  return { spineX, y0, y1, branches };
}

/** Route a connector from the spine to a target corner: horizontal run,
 *  one 45° approach, terminating exactly at the corner. */
function routeConnector(spineX: number, tx: number, ty: number): Connector {
  const ky = Math.round(ty / GRID) * GRID;
  const dy = ty - ky;
  const dir = tx > spineX ? 1 : -1;
  const ax = tx - dir * Math.abs(dy); // 45° approach start
  const d =
    Math.abs(dy) < 2
      ? `M${spineX},${ky} L${tx},${ty}`
      : `M${spineX},${ky} L${ax},${ky} L${tx},${ty}`;
  return { d, y: ky, endX: tx, endY: ty };
}

export default function CircuitNetwork({
  seed,
  mode = "full",
  railX = 0.022, // matches TraceLayer rails — inside the container-pad gutter
  targets,
  className,
}: {
  seed: number;
  mode?: "full" | "sparse";
  /** spine x as fraction of section width (drop to ~0.025 for narrow gutters) */
  railX?: number;
  /** CSS selector (within the section) for elements circuits should plug into */
  targets?: string;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [half, setHalf] = useState<Half | null>(null);
  const [connectors, setConnectors] = useState<{ left: Connector[]; right: Connector[] }>({ left: [], right: [] });

  useEffect(() => {
    const svg = svgRef.current!;
    const host = svg.parentElement!;
    const measure = () => {
      const hr = host.getBoundingClientRect();
      const w = Math.round(hr.width);
      const h = Math.round(hr.height);
      setDims({ w, h });

      // Collision map: every piece of real content in the section, with margin.
      // Nothing the network draws may intersect these rects — ever.
      const MARGIN = 10;
      const obstacles: { l: number; t: number; r: number; b: number; el: Element }[] = [];
      host.querySelectorAll<HTMLElement>("h2, h3, p, li, form, input, button, select, [data-tile], img, video").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return;
        obstacles.push({ l: r.left - hr.left - MARGIN, t: r.top - hr.top - MARGIN, r: r.right - hr.left + MARGIN, b: r.bottom - hr.top + MARGIN, el });
      });
      const hits = (x0: number, y0: number, x1: number, y1: number, exclude?: Element) => {
        const l = Math.min(x0, x1) - 4, rr = Math.max(x0, x1) + 4;
        const t = Math.min(y0, y1) - 4, b = Math.max(y0, y1) + 4;
        return obstacles.some((o) => !(exclude && (o.el === exclude || exclude.contains(o.el))) && !(rr <= o.l || l >= o.r || b <= o.t || t >= o.b));
      };
      // mirror-side collision must also be clear, or symmetry breaks
      const hitsMirrored = (x0: number, y0: number, x1: number, y1: number) =>
        hits(x0, y0, x1, y1) || hits(w - x1, y0, w - x0, y1);

      const amb = genAmbient(seed, w, h, railX, mode === "sparse");
      amb.branches = amb.branches.filter((b) => {
        const sx = amb.spineX;
        return !hitsMirrored(Math.min(sx, b.endX), b.y - GRID, Math.max(sx, b.endX), b.endY + GRID / 2);
      });
      setHalf(amb);
      // route connectors to measured targets (nearest spine, facing corner)
      if (targets) {
        const L: Connector[] = [];
        const R: Connector[] = [];
        const rightSpine = w - amb.spineX;
        // a connector may touch its own target, but must not cross anything else
        const clear = (c: Connector, spineX: number, target: Element) =>
          !hits(Math.min(spineX, c.endX), Math.min(c.y, c.endY) - 4, Math.max(spineX, c.endX), Math.max(c.y, c.endY) + 4, target);
        host.querySelectorAll<HTMLElement>(targets).forEach((el) => {
          const r = el.getBoundingClientRect();
          const cx = r.left - hr.left + r.width / 2;
          const top = r.top - hr.top;
          const bottom = r.bottom - hr.top;
          const leftEdge = r.left - hr.left - 6; // land just outside the box
          const rightEdge = r.right - hr.left + 6;
          const push = (arr: Connector[], c: Connector, sx: number) => {
            if (clear(c, sx, el)) arr.push(c);
          };
          if (r.height > 240) {
            // tall content block: pin into both corners on BOTH sides (symmetric)
            push(L, routeConnector(amb.spineX, leftEdge, top + GRID / 2), amb.spineX);
            push(L, routeConnector(amb.spineX, leftEdge, bottom - GRID / 2), amb.spineX);
            push(R, routeConnector(rightSpine, rightEdge, top + GRID / 2), rightSpine);
            push(R, routeConnector(rightSpine, rightEdge, bottom - GRID / 2), rightSpine);
          } else {
            // tile: plug into the near edge at center height
            const cy = top + r.height / 2;
            if (cx < w / 2) push(L, routeConnector(amb.spineX, leftEdge, cy), amb.spineX);
            else push(R, routeConnector(rightSpine, rightEdge, cy), rightSpine);
          }
        });
        setConnectors({ left: L, right: R });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, [seed, mode, railX, targets]);

  // scrubbed growth from the origin node — sprouts forward, retracts back
  useEffect(() => {
    if (!half || !dims) return;
    const svg = svgRef.current!;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: svg, start: "top 85%", end: "bottom 55%", scrub: true },
      });
      const span = Math.max(1, half.y1 - half.y0);
      svg.querySelectorAll<SVGPathElement>("[data-spine]").forEach((p) => {
        const len = p.getTotalLength();
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        tl.to(p, { strokeDashoffset: 0, duration: 0.9, ease: "none" }, 0.05);
      });
      svg.querySelectorAll<SVGPathElement>("[data-branch]").forEach((p) => {
        const len = p.getTotalLength();
        const at = 0.08 + Math.min(0.78, ((parseFloat(p.dataset.branch || "0") - half.y0) / span) * 0.82);
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        tl.to(p, { strokeDashoffset: 0, duration: 0.12, ease: "none" }, at);
      });
      svg.querySelectorAll<SVGCircleElement>("[data-node]").forEach((c) => {
        const at = 0.1 + Math.min(0.85, ((parseFloat(c.dataset.node || "0") - half.y0) / span) * 0.82);
        gsap.set(c, { opacity: 0 });
        tl.to(c, { opacity: 1, duration: 0.05, ease: "none" }, at);
      });
    }, svg);
    return () => ctx.revert();
  }, [half, dims, connectors]);

  const line = "rgba(33,33,33,0.3)";
  const padFill = "rgba(33,33,33,0.42)";
  const ringStroke = "rgba(33,33,33,0.38)";
  const accent = "rgba(82,112,255,0.65)";

  const dot = (b: { endX: number; endY: number; y: number; kind?: Branch["kind"] }, i: number | string) =>
    b.kind === "ring" || b.kind === undefined ? (
      <circle key={i} data-node={b.y} cx={b.endX} cy={b.endY} r="3.6" stroke={ringStroke} strokeWidth="1.5" fill="var(--c-light)" />
    ) : (
      <circle key={i} data-node={b.y} cx={b.endX} cy={b.endY} r="3" fill={b.kind === "accent" ? accent : padFill} />
    );

  const ambient = (key: string) =>
    half && (
      <g key={key}>
        {/* finite spine: origin pad -> segment -> terminal pad */}
        <path data-spine d={`M${half.spineX},${half.y0} L${half.spineX},${half.y1}`} stroke={line} strokeWidth="1.5" />
        <circle data-node={half.y0} cx={half.spineX} cy={half.y0} r="3" fill={padFill} />
        <circle data-node={half.y1} cx={half.spineX} cy={half.y1} r="3.6" stroke={ringStroke} strokeWidth="1.5" fill="var(--c-light)" />
        {half.branches.map((b, i) => (
          <g key={i}>
            <path data-branch={b.y} d={b.d} stroke={line} strokeWidth="1.5" />
            <circle data-node={b.y} cx={half.spineX} cy={b.y} r="2.4" fill={padFill} />
            {dot(b, `e${i}`)}
          </g>
        ))}
      </g>
    );

  return (
    <svg
      ref={svgRef}
      viewBox={dims ? `0 0 ${dims.w} ${dims.h}` : undefined}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
      fill="none"
      aria-hidden="true"
    >
      {ambient("l")}
      {half && dims && <g transform={`translate(${dims.w},0) scale(-1,1)`}>{ambient("r")}</g>}
      {/* connectors: routed to real, measured element corners — they always END at something */}
      {half &&
        connectors.left.map((c, i) => (
          <g key={`cl${i}`}>
            <path data-branch={c.y} d={c.d} stroke={line} strokeWidth="1.5" />
            <circle data-node={c.y} cx={half.spineX} cy={c.y} r="2.4" fill={padFill} />
            <circle data-node={c.y} cx={c.endX} cy={c.endY} r="3" fill={padFill} />
          </g>
        ))}
      {half &&
        dims &&
        connectors.right.map((c, i) => (
          <g key={`cr${i}`}>
            <path data-branch={c.y} d={c.d} stroke={line} strokeWidth="1.5" />
            <circle data-node={c.y} cx={dims.w - half.spineX} cy={c.y} r="2.4" fill={padFill} />
            <circle data-node={c.y} cx={c.endX} cy={c.endY} r="3" fill={padFill} />
          </g>
        ))}
    </svg>
  );
}
