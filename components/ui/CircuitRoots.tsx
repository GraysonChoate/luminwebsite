"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";

/**
 * CircuitRoots — circuit traces that grow like ROOTS: one system climbs UP
 * from the bottom-left, another descends DOWN from the top. Each is a vertical
 * trunk in the left gutter with 45° branches fanning inward.
 *
 * TAPER + DISSOLVE (per the Canva reference): everything thins and fades as
 * it spreads —
 *   - the trunk is three stacked pieces, each thinner + fainter than the last
 *   - branch stroke width/opacity fall off with distance from the origin
 *   - far tips get no terminal pad at all; their strokes drop to near-zero
 *     opacity so they dissolve into the white instead of stopping
 *
 * Growth is scroll-scrubbed (trunk extends, branches pop as it passes them,
 * reversible). Branches are culled against a fixed copy-column exclusion band
 * + the media half, so they never cross content at any step length.
 */
const GRID = 24;

type Seg = {
  d: string;
  order: number; // 0 at origin → 1 at far tip; drives draw order + taper
  w: number; // stroke width
  op: number; // stroke opacity
  trunk?: boolean;
  tipX?: number;
  tipY?: number;
  kind?: "pad" | "ring" | "accent";
  tipOp?: number; // terminal dot opacity
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genTree(
  seed: number, w: number, h: number, gx: number,
  origin: "bottom" | "top",
  hits: (x0: number, y0: number, x1: number, y1: number) => boolean,
): Seg[] {
  const rnd = mulberry32(seed);
  const segs: Seg[] = [];
  const dir = origin === "bottom" ? -1 : 1;
  const startY = origin === "bottom" ? h : 0;
  const trunkLen = h * (0.68 + rnd() * 0.18);

  // trunk: three tapering pieces — thick root → hairline tip (which dissolves)
  const tW = [2.4, 1.5, 0.8];
  const tO = [0.34, 0.24, 0.11];
  for (let p = 0; p < 3; p++) {
    const y0 = startY + dir * trunkLen * (p / 3);
    const y1 = startY + dir * trunkLen * ((p + 1) / 3);
    segs.push({ d: `M${gx},${Math.round(y0)} L${gx},${Math.round(y1)}`, order: p * 0.3, w: tW[p], op: tO[p], trunk: true });
  }

  let accent = false;
  const step = GRID * 2.2;
  for (let t = step * 1.2; t < trunkLen; t += step + rnd() * step * 1.3) {
    const by = Math.round((startY + dir * t) / GRID) * GRID;
    const order = t / trunkLen; // 0 near origin → 1 at trunk tip
    const bdir = dir * (rnd() > 0.25 ? 1 : -1);
    const run = GRID * (2 + Math.floor(rnd() * 5));
    const rise = GRID * (1 + Math.floor(rnd() * 3));
    const midX = gx + run;
    const tipX = midX + rise;
    const tipY = by + bdir * rise;
    if (hits(gx, Math.min(by, tipY), tipX, Math.max(by, tipY))) continue;

    // taper: width + opacity fall off with distance from the origin
    const bw = Math.max(0.7, 1.9 - order * 1.3);
    const bo = Math.max(0.09, 0.32 - order * 0.18);
    // main horizontal run (thicker) + 45° tail (thinner, fainter → dissolving)
    segs.push({ d: `M${gx},${by} L${midX},${by}`, order, w: bw, op: bo });
    const dissolving = order > 0.68;
    segs.push({
      d: `M${midX},${by} L${tipX},${tipY}`,
      order: order + 0.02,
      w: bw * 0.6,
      op: dissolving ? bo * 0.35 : bo * 0.65,
      tipX, tipY,
      kind: dissolving ? undefined : rnd() > 0.5 ? "ring" : "pad",
      tipOp: Math.max(0, 0.5 - order * 0.5),
    });

    // occasional fork — thinner still; forks past mid-tree always dissolve
    if (rnd() > 0.55) {
      const s = GRID * (1 + Math.floor(rnd() * 2));
      const sx = tipX + s, sy = tipY + bdir * s;
      if (!hits(tipX, Math.min(tipY, sy), sx, Math.max(tipY, sy))) {
        let kind: Seg["kind"] = order > 0.5 ? undefined : "ring";
        if (!accent && rnd() > 0.6 && order < 0.5) { kind = "accent"; accent = true; }
        segs.push({
          d: `M${tipX},${tipY} L${sx},${sy}`,
          order: order + 0.05,
          w: bw * 0.4,
          op: order > 0.5 ? bo * 0.25 : bo * 0.5,
          tipX: sx, tipY: sy, kind,
          tipOp: Math.max(0, 0.4 - order * 0.5),
        });
      }
    }
  }
  return segs;
}

export default function CircuitRoots({ seed = 7, className }: { seed?: number; className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [trees, setTrees] = useState<{ bottom: Seg[]; top: Seg[] }>({ bottom: [], top: [] });

  useEffect(() => {
    const svg = svgRef.current!;
    const host = svg.parentElement!;
    const measure = () => {
      const r = host.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      if (w < 4 || h < 4) return;
      setDims({ w, h });
      // VIEWPORT-SPACE exclusion zones. The host is the pinned 100vh frame —
      // the same coordinate space the sticky copy actually lives in — so
      // these zones are correct at EVERY scroll position (the old version
      // measured the tall scrolling section, so roots drifted past the
      // pinned text). Roots may only grow in the true empty margins:
      // above and below the copy block, left gutter, never under nav/media.
      const obs = [
        { l: 0, t: 0, r: w, b: 132 }, // nav pill strip
        { l: 18, t: h * 0.26, r: w * 0.47, b: h * 0.78 }, // copy block band
        { l: w * 0.44, t: h * 0.04, r: w, b: h }, // media panel half
      ];
      const hits = (x0: number, y0: number, x1: number, y1: number) =>
        obs.some((o) => !(x1 < o.l || x0 > o.r || y1 < o.t || y0 > o.b));
      const gx = 16;
      setTrees({
        bottom: genTree(seed, w, h, gx, "bottom", hits),
        top: genTree(seed + 99, w, h, gx, "top", hits),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, [seed]);

  // scrubbed growth — driven by the SECTION's scroll (the svg itself lives in
  // the always-visible pinned frame, so it can't be its own trigger)
  useEffect(() => {
    if (!dims) return;
    const svg = svgRef.current!;
    const section = svg.closest("section");
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: section ?? svg, start: "top 80%", end: "bottom bottom", scrub: 0.8 },
      });
      svg.querySelectorAll<SVGPathElement>("path").forEach((p) => {
        const len = p.getTotalLength();
        const order = parseFloat(p.dataset.order || "0");
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        tl.to(p, { strokeDashoffset: 0, duration: p.dataset.trunk ? 0.3 : 0.08, ease: "none" },
          p.dataset.trunk ? order : 0.1 + order * 0.72);
      });
      svg.querySelectorAll<SVGCircleElement>("circle").forEach((c) => {
        const order = parseFloat(c.dataset.order || "0");
        gsap.set(c, { opacity: 0 });
        tl.to(c, { opacity: parseFloat(c.dataset.op || "0.4"), duration: 0.05, ease: "none" }, 0.14 + order * 0.72);
      });
    }, svg);
    return () => ctx.revert();
  }, [trees, dims]);

  const ink = (op: number) => `rgba(33,33,33,${op})`;
  const accent = "rgba(82,112,255,0.65)";

  const renderTree = (segs: Seg[], key: string) => (
    <g key={key}>
      {segs.map((s, i) => (
        <path
          key={`p${i}`}
          data-order={s.order}
          data-trunk={s.trunk ? "1" : undefined}
          d={s.d}
          stroke={ink(s.op)}
          strokeWidth={s.w}
          strokeLinecap="round"
        />
      ))}
      {segs.filter((s) => s.tipX != null && s.kind).map((s, i) =>
        s.kind === "ring" ? (
          <circle key={`c${i}`} data-order={s.order} data-op={s.tipOp}
            cx={s.tipX} cy={s.tipY} r={Math.max(2, 3.4 - s.order * 1.6)}
            stroke={ink(Math.min(0.4, (s.tipOp ?? 0.3) + 0.1))} strokeWidth="1.2" fill="var(--c-light)" />
        ) : (
          <circle key={`c${i}`} data-order={s.order} data-op={s.tipOp}
            cx={s.tipX} cy={s.tipY} r={Math.max(1.6, 2.8 - s.order * 1.4)}
            fill={s.kind === "accent" ? accent : ink(Math.min(0.45, (s.tipOp ?? 0.3) + 0.15))} />
        )
      )}
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
      {renderTree(trees.bottom, "bottom")}
      {renderTree(trees.top, "top")}
    </svg>
  );
}
