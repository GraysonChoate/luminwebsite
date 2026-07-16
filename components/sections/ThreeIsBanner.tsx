"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";

/**
 * "Intelligent · Interactive · Individualized" banner — BLUEPRINT CUBE.
 * PLACEHOLDER for the eventual rendered banner video, rebuilt in the white
 * technical-drawing language of the Lumin Cube reference (thin dark wireframe
 * on white, dashed construction lines, node dots, lowercase labels with
 * leader lines) so it matches the page's circuit/registration-tick system.
 *
 * One scrubbed timeline across a 260vh walk:
 *   1. intelligent   — BUILDS: crosshair origin → vertices → edges construct
 *      the isometric cube wireframe.
 *   2. interactive   — RESPONDS: faces gain shading, the nested inner cube
 *      draws in, and the whole drawing tilts toward your cursor.
 *   3. individualized — TRANSFORMS everything already on screen: facets and
 *      edges recolor with the Supernova accent, label dots switch, the cube
 *      swells slightly. Restrained color on white — never a field of color.
 *
 * Wide THIN band (21:9, not 16:9). SVG viewBox → fully responsive.
 */

const R = 110;
const CX = 350;
const CY = 152;
const cos30 = Math.cos(Math.PI / 6);

// isometric cube (pointy-top hexagon) around the center point
const V = {
  T: [CX, CY - R],
  UR: [CX + R * cos30, CY - R / 2],
  LR: [CX + R * cos30, CY + R / 2],
  B: [CX, CY + R],
  LL: [CX - R * cos30, CY + R / 2],
  UL: [CX - R * cos30, CY - R / 2],
  C: [CX, CY],
} as const;

const p = (a: readonly number[]) => `${a[0]},${a[1]}`;
const HEX_EDGES: [readonly number[], readonly number[]][] = [
  [V.T, V.UR], [V.UR, V.LR], [V.LR, V.B], [V.B, V.LL], [V.LL, V.UL], [V.UL, V.T],
];
const Y_EDGES: [readonly number[], readonly number[]][] = [[V.C, V.UL], [V.C, V.UR], [V.C, V.B]];
const DIAG_EDGES: [readonly number[], readonly number[]][] = [[V.C, V.T], [V.C, V.LL], [V.C, V.LR]];
const FACES = [
  { d: `M${p(V.T)} L${p(V.UR)} L${p(V.C)} L${p(V.UL)} Z`, fill: 0.045 }, // top
  { d: `M${p(V.UR)} L${p(V.LR)} L${p(V.B)} L${p(V.C)} Z`, fill: 0.09 }, // right
  { d: `M${p(V.UL)} L${p(V.C)} L${p(V.B)} L${p(V.LL)} Z`, fill: 0.065 }, // left
];
// nested inner cube (scaled toward center)
const s = 0.45;
const iv = (a: readonly number[]) => [CX + (a[0] - CX) * s, CY + (a[1] - CY) * s] as const;
const INNER_EDGES = [...HEX_EDGES, ...Y_EDGES].map(([a, b]) => [iv(a), iv(b)] as const);

const INK = "rgba(33,33,33,0.75)";
const INK_SOFT = "rgba(33,33,33,0.4)";
const SUPERNOVA = "#5270ff";

export default function ThreeIsBanner() {
  const sectionRef = useRef<HTMLElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const section = sectionRef.current!;
    const svg = svgRef.current!;
    let onMove: ((e: PointerEvent) => void) | null = null;

    const ctx = gsap.context(() => {
      const q = (sel: string) => Array.from(svg.querySelectorAll<SVGElement>(sel));
      const drawIn = (tl: gsap.core.Timeline, els: SVGElement[], at: number, dur: number, stag: number) => {
        els.forEach((el, i) => {
          const len = (el as SVGGeometryElement).getTotalLength?.() ?? 200;
          gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
          tl.to(el, { strokeDashoffset: 0, duration: dur, ease: "none" }, at + i * stag);
        });
      };

      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: true },
      });

      // origin: center dot + dashed crosshair (video's opening beat)
      gsap.set(q(".origin"), { scale: 0, transformOrigin: "center" });
      gsap.set(q(".cross"), { opacity: 0, scale: 0.2, transformOrigin: `${CX}px ${CY}px` });
      tl.to(q(".origin"), { scale: 1, duration: 0.02, ease: "back.out(3)" }, 0.01);
      tl.to(q(".cross"), { opacity: 1, scale: 1, duration: 0.04, ease: "power2.out" }, 0.02);

      // 1 — intelligent: construct
      gsap.set(q(".node"), { scale: 0, transformOrigin: "center" });
      drawIn(tl, q(".hex"), 0.07, 0.05, 0.012);
      tl.to(q(".node"), { scale: 1, duration: 0.02, stagger: 0.008, ease: "back.out(3)" }, 0.1);
      drawIn(tl, q(".yedge"), 0.15, 0.04, 0.015);
      gsap.set(q(".diag"), { opacity: 0 });
      tl.to(q(".diag"), { opacity: 0.35, duration: 0.04, stagger: 0.01 }, 0.19);
      gsap.set(q(".lbl1"), { opacity: 0, y: 6 });
      drawIn(tl, q(".lead1"), 0.1, 0.04, 0);
      tl.to(q(".lbl1"), { opacity: 1, y: 0, duration: 0.04 }, 0.12);

      // 2 — interactive: shading + inner cube (cursor tilt is live throughout)
      gsap.set(q(".face"), { opacity: 0 });
      q(".face").forEach((f, i) => tl.to(f, { opacity: FACES[i].fill, duration: 0.06 }, 0.38 + i * 0.02));
      drawIn(tl, q(".inner"), 0.42, 0.03, 0.008);
      gsap.set(q(".lbl2"), { opacity: 0, y: 6 });
      drawIn(tl, q(".lead2"), 0.4, 0.04, 0);
      tl.to(q(".lbl2"), { opacity: 1, y: 0, duration: 0.04 }, 0.43);

      // 3 — individualized: transform everything already drawn
      gsap.set(q(".lbl3"), { opacity: 0, y: 6 });
      drawIn(tl, q(".lead3"), 0.68, 0.04, 0);
      tl.to(q(".lbl3"), { opacity: 1, y: 0, duration: 0.04 }, 0.7);
      tl.to(q(".face-right"), { fill: SUPERNOVA, opacity: 0.14, duration: 0.08 }, 0.72);
      tl.to(q(".inner"), { stroke: SUPERNOVA, opacity: 0.8, duration: 0.08 }, 0.74);
      tl.to(q(".cross"), { stroke: SUPERNOVA, opacity: 0.5, duration: 0.08 }, 0.76);
      tl.to(q(".lead-dot"), { fill: SUPERNOVA, duration: 0.06 }, 0.76);
      tl.to(q(".cube"), { scale: 1.05, transformOrigin: `${CX}px ${CY}px`, duration: 0.2, ease: "power1.inOut" }, 0.72);

      // the drawing responds to you — tilt toward the cursor (fine pointers)
      if (window.matchMedia("(pointer: fine)").matches && tiltRef.current) {
        gsap.set(tiltRef.current, { transformPerspective: 900 });
        const rx = gsap.quickTo(tiltRef.current, "rotationX", { duration: 0.5, ease: "power2" });
        const ry = gsap.quickTo(tiltRef.current, "rotationY", { duration: 0.5, ease: "power2" });
        onMove = (e: PointerEvent) => {
          const r = bannerRef.current!.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 10);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
        };
        bannerRef.current!.addEventListener("pointermove", onMove);
      }
    }, section);

    return () => {
      if (onMove && bannerRef.current) bannerRef.current.removeEventListener("pointermove", onMove);
      ctx.revert();
    };
  }, []);

  const line = (pts: readonly [readonly number[], readonly number[]], cls: string, key: string, w = 1.3, stroke = INK, dash?: string) => (
    <line key={key} className={cls} x1={pts[0][0]} y1={pts[0][1]} x2={pts[1][0]} y2={pts[1][1]}
      stroke={stroke} strokeWidth={w} strokeDasharray={dash} />
  );

  return (
    <section ref={sectionRef} className="relative bg-white" style={{ height: "260vh" }}>
      <div className="flex h-screen items-center lg:sticky lg:top-0">
        <div className="container-pad w-full">
          {/* wide thin blueprint band — white on white, framed by a dashed
              hairline + registration ticks (same language as the page) */}
          <div
            ref={bannerRef}
            className="relative mx-auto w-full max-w-[1200px]"
            style={{ aspectRatio: "21 / 9" }}
          >
            <div className="absolute inset-0" style={{ border: "1px dashed rgba(33,33,33,0.18)", borderRadius: 2 }} />
            {[
              { left: -1, top: -1 }, { right: -1, top: -1 }, { left: -1, bottom: -1 }, { right: -1, bottom: -1 },
            ].map((pos, i) => (
              <span key={i} className="absolute" style={pos as React.CSSProperties}>
                <span className="absolute h-[10px] w-[1.5px]" style={{ background: "var(--c-cosmos)", left: 0, top: -4 }} />
                <span className="absolute h-[1.5px] w-[10px]" style={{ background: "var(--c-cosmos)", left: -4, top: 0 }} />
              </span>
            ))}

            <div ref={tiltRef} className="absolute inset-0 will-change-transform">
              <svg ref={svgRef} viewBox="0 0 700 300" className="h-full w-full" fill="none" aria-hidden="true">
                {/* dashed crosshair through the origin */}
                <line className="cross" x1={CX - R * 1.5} y1={CY} x2={CX + R * 1.5} y2={CY} stroke={INK_SOFT} strokeWidth="1" strokeDasharray="7 5 1.5 5" />
                <line className="cross" x1={CX} y1={CY - R * 1.3} x2={CX} y2={CY + R * 1.3} stroke={INK_SOFT} strokeWidth="1" strokeDasharray="7 5 1.5 5" />

                <g className="cube">
                  {/* shaded faces (phase 2) */}
                  {FACES.map((f, i) => (
                    <path key={i} className={`face ${i === 1 ? "face-right" : ""}`} d={f.d} fill="#212121" opacity="0" />
                  ))}
                  {/* construction diagonals (dashed) */}
                  {DIAG_EDGES.map((e, i) => line(e, "diag", `d${i}`, 0.9, INK_SOFT, "4 4"))}
                  {/* outer hexagon + Y edges */}
                  {HEX_EDGES.map((e, i) => line(e, "hex", `h${i}`, 1.4))}
                  {Y_EDGES.map((e, i) => line(e, "yedge", `y${i}`, 1.4))}
                  {/* nested inner cube */}
                  {INNER_EDGES.map((e, i) => line(e, "inner", `i${i}`, 1))}
                  {/* vertex nodes */}
                  {Object.values(V).map((v, i) => (
                    <circle key={i} className="node" cx={v[0]} cy={v[1]} r={i === 6 ? 4.5 : 3.5} fill="#212121" />
                  ))}
                  <circle className="origin" cx={CX} cy={CY} r="4.5" fill="#212121" />
                </g>

                {/* labels with leader lines (lowercase, like the reference) */}
                <g style={{ fontFamily: "var(--font-heebo)", fontSize: 17, letterSpacing: 0.3 }}>
                  <polyline className="lead1" points={`${CX - R * cos30 - 8},${CY - R / 2 - 8} ${CX - R * cos30 - 52},${CY - R / 2 - 52} ${CX - R * cos30 - 130},${CY - R / 2 - 52}`} stroke={INK_SOFT} strokeWidth="1" fill="none" />
                  <circle className="lead-dot" cx={CX - R * cos30 - 8} cy={CY - R / 2 - 8} r="2.6" fill="#212121" />
                  <text className="lbl1" x={CX - R * cos30 - 138} y={CY - R / 2 - 47} fill="#212121" textAnchor="end">intelligent</text>

                  <polyline className="lead2" points={`${CX + R * cos30 + 8},${CY + R / 2 - 20} ${CX + R * cos30 + 48},${CY + R / 2 - 20} `} stroke={INK_SOFT} strokeWidth="1" fill="none" />
                  <circle className="lead-dot" cx={CX + R * cos30 + 8} cy={CY + R / 2 - 20} r="2.6" fill="#212121" />
                  <text className="lbl2" x={CX + R * cos30 + 56} y={CY + R / 2 - 15} fill="#212121">interactive</text>

                  <polyline className="lead3" points={`${CX - 40},${CY + R * 0.62} ${CX - 96},${CY + R * 0.98} ${CX - 150},${CY + R * 0.98}`} stroke={INK_SOFT} strokeWidth="1" fill="none" />
                  <circle className="lead-dot" cx={CX - 40} cy={CY + R * 0.62} r="2.6" fill="#212121" />
                  <text className="lbl3" x={CX - 158} y={CY + R * 0.98 + 5} fill="#212121" textAnchor="end">individualized</text>
                </g>
              </svg>
            </div>

            <span className="font-nav absolute bottom-2 right-3 text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: "rgba(33,33,33,0.3)" }}>
              Banner video placeholder
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
