"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";

/**
 * Notch seam between a dark section and the light one below it.
 * A centered dark tab hangs into a 48px strip; its shoulder/corner radius
 * morphs (28 -> 72 -> settles) as the strip crosses the viewport, driven by
 * a scrubbed ScrollTrigger with the custom "notch" ease baked into the
 * radius interpolation. Fully reversible.
 */
const H = 48; // strip height
const W = 1440; // viewBox width (scales to 100%)

function tabPath(r: number, tabHalf: number) {
  // Dark region: full-width sliver at y=0 plus a centered tab of depth H.
  // Shoulders flare outward (convex quarter-arcs), tab bottom corners rounded.
  const cx = W / 2;
  const L = cx - tabHalf; // tab left x
  const R = cx + tabHalf; // tab right x
  const rr = Math.min(r, H / 2, tabHalf / 2);
  return [
    `M0,0`,
    `L${L - rr},0`,
    // left shoulder: curve down-right into tab left edge
    `Q${L},0 ${L},${rr}`,
    `L${L},${H - rr}`,
    // tab bottom-left corner
    `Q${L},${H} ${L + rr},${H}`,
    `L${R - rr},${H}`,
    // tab bottom-right corner
    `Q${R},${H} ${R},${H - rr}`,
    `L${R},${rr}`,
    // right shoulder
    `Q${R},0 ${R + rr},0`,
    `L${W},0`,
    `L${W},-1 L0,-1 Z`,
  ].join(" ");
}

export default function NotchDivider({
  color = "var(--c-cosmos)",
  bg = "transparent",
  tabRatio = 0.625,
}: {
  /** fill of the tab shape = color of the section ABOVE the seam */
  color?: string;
  /** strip background = color of the section BELOW (needed for light→dark seams) */
  bg?: string;
  /** half-width of the tab as a fraction of total width */
  tabRatio?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const path = pathRef.current!;
    const state = { p: 0 };
    const tabHalf = (W * tabRatio) / 2;

    const render = () => {
      // radius morph 28 -> 72 across the crossing, notch-ease flavored
      const eased = gsap.parseEase("notch")(state.p);
      const r = 28 + eased * 44;
      path.setAttribute("d", tabPath(r, tabHalf));
    };
    render();

    const st = ScrollTrigger.create({
      trigger: wrap,
      start: "top bottom",
      end: "top 40%",
      scrub: true,
      onUpdate: (self) => {
        state.p = self.progress;
        render();
      },
    });
    return () => st.kill();
  }, [tabRatio]);

  return (
    <div ref={wrapRef} className="relative z-[3] -mt-px" style={{ height: H, background: bg }} aria-hidden="true">
      <svg
        className="block h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <path ref={pathRef} fill={color} />
      </svg>
    </div>
  );
}
