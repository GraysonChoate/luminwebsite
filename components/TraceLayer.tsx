"use client";

import { useEffect, useRef } from "react";

/**
 * Neural trace — a literal map of the visitor's journey, not ambient noise.
 *
 * As the visitor travels, y-position "nodes" are recorded every ~15vh of
 * document travel (only inside dark sections). Thin Meteor-toned rails
 * connect visited nodes along both page margins; a Supernova "head" glows at
 * the current position and brightens with scroll velocity. New nodes flash a
 * brief Stellar/Galaxy pulse, then settle into the quiet line. Scrolling up
 * retraces the existing path — nodes are only ever created at the frontier
 * of travel, never redrawn as new.
 *
 * Architecture (matches the rest of the codebase, per audit guidance):
 * one fixed canvas, refs updated by a single scroll listener, one rAF loop.
 * The loop idles (single clear, no per-frame work) whenever the viewport is
 * outside every dark range, and pauses entirely when the tab is hidden.
 * Scoped to sections marked data-trace-dark (Hero, BrandReveal). Honors
 * prefers-reduced-motion by not running at all.
 */

type TraceNode = {
  birth: number; // performance.now() when first visited, drives the pulse
  accent: string;
};

const SPACING_VH = 0.15; // one node per 15vh of travel
// Rails live INSIDE the container-padding gutter (content-free by definition):
// rail + meander maxes at 3vw, container pad is 3.65vw — no content collision
// is possible at any viewport. Must match CircuitNetwork's railX.
const RAIL_L = 0.022;
const RAIL_R = 0.978;
const MEANDER = 0.008;
const EDGE_FADE = 160; // px fade at dark-range boundaries

const METEOR = "209,209,212";
const SUPERNOVA = "82,112,255";
const ACCENTS = ["0,255,186", "227,255,112"]; // Stellar, Galaxy — node moments only

export default function TraceLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let running = false;
    let dpr = 1;

    // ── state (refs, no React re-renders) ──
    // Nodes live on a fixed document-space grid (one slot per SPACING_VH of
    // travel) and are marked visited when the viewport center crosses them —
    // in EITHER direction. This survives deep links, scroll restoration and
    // up-scroll journeys, where a "frontier" model records nothing.
    const visited = new Map<number, TraceNode>();
    let darkRanges: [number, number][] = [];
    let spacing = window.innerHeight * SPACING_VH;
    let lastCenterK: number | null = null;
    let scrollVel = 0;
    let lastY = window.scrollY;
    let wasIdle = false;

    const inDark = (docY: number) => darkRanges.some(([a, b]) => docY >= a && docY <= b);

    const visit = (k: number) => {
      if (!visited.has(k) && inDark(k * spacing)) {
        visited.set(k, { birth: performance.now(), accent: ACCENTS[k % ACCENTS.length] });
      }
    };

    const markTravel = () => {
      const k = Math.round((window.scrollY + window.innerHeight * 0.5) / spacing);
      if (lastCenterK === null) visit(k);
      else {
        const step = k > lastCenterK ? 1 : -1;
        for (let i = lastCenterK; i !== k + step; i += step) visit(i);
      }
      lastCenterK = k;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      spacing = window.innerHeight * SPACING_VH;
      // inset each range so boundary nodes (and their 18px pulse rings)
      // never straddle a seam strip
      darkRanges = [...document.querySelectorAll<HTMLElement>("[data-trace-dark]")].map((el) => {
        const r = el.getBoundingClientRect();
        return [r.top + window.scrollY + 56, r.bottom + window.scrollY - 56];
      });
      markTravel();
    };
    resize();
    window.addEventListener("resize", resize);

    /** alpha envelope: 1 deep inside a dark range, fading to 0 AT the range
     *  edges (never past them — anything outside light ground stays at 0,
     *  so nothing ever marks the white sections or the seam strips). */
    const darkEnvelope = (docY: number) => {
      let best = 0;
      for (const [a, b] of darkRanges) {
        if (docY <= a || docY >= b) continue;
        const edge = Math.min(docY - a, b - docY);
        best = Math.max(best, Math.min(1, edge / EDGE_FADE));
      }
      return best;
    };

    // deterministic meander so retracing draws the identical path
    const railX = (i: number, side: 0 | 1) => {
      const base = side === 0 ? RAIL_L : RAIL_R;
      const wander = Math.sin(i * 2.399) * MEANDER * (side === 0 ? 1 : -1);
      return (base + wander) * window.innerWidth;
    };

    const onScroll = () => {
      const y = window.scrollY;
      scrollVel = scrollVel * 0.8 + Math.abs(y - lastY) * 0.2;
      lastY = y;
      markTravel();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      const y = window.scrollY;
      const vh = window.innerHeight;
      scrollVel *= 0.94; // settle when scrolling pauses

      // idle whenever the viewport doesn't touch a dark range: one clear, no work
      const viewTouchesDark = darkRanges.some(([a, b]) => y < b + EDGE_FADE && y + vh > a - EDGE_FADE);
      if (!viewTouchesDark) {
        if (!wasIdle) ctx.clearRect(0, 0, w, h);
        wasIdle = true;
        return;
      }
      wasIdle = false;
      ctx.clearRect(0, 0, w, h);

      const velBoost = Math.min(0.14, scrollVel * 0.002);
      const headDocY = y + vh * 0.5;
      // only walk grid slots near the viewport
      const kMin = Math.floor((y - 200) / spacing);
      const kMax = Math.ceil((y + vh + 200) / spacing);

      for (const side of [0, 1] as const) {
        for (let k = kMin; k <= kMax; k++) {
          const n = visited.get(k);
          if (!n) continue;
          const docY = k * spacing;
          const env = darkEnvelope(docY);
          if (env <= 0) continue;
          const px = railX(k, side) * dpr;
          const py = (docY - y) * dpr;

          // rail segment to the previous visited slot
          const prev = visited.get(k - 1);
          if (prev) {
            const envPrev = darkEnvelope((k - 1) * spacing);
            const alpha = (0.22 + velBoost) * Math.min(env, envPrev || env);
            if (envPrev > 0) {
              ctx.strokeStyle = `rgba(${METEOR},${alpha})`;
              ctx.lineWidth = 1.5 * dpr;
              ctx.beginPath();
              ctx.moveTo(railX(k - 1, side) * dpr, ((k - 1) * spacing - y) * dpr);
              ctx.lineTo(px, py);
              ctx.stroke();
            }
          }

          // node dot + birth pulse (accent moment, then it settles)
          ctx.fillStyle = `rgba(${METEOR},${0.4 * env})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.8 * dpr, 0, Math.PI * 2);
          ctx.fill();
          const age = now - n.birth;
          if (age < 700) {
            const t = age / 700;
            ctx.strokeStyle = `rgba(${n.accent},${0.5 * (1 - t) * env})`;
            ctx.lineWidth = 1 * dpr;
            ctx.beginPath();
            ctx.arc(px, py, (4 + t * 14) * dpr, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // head: the visitor's current position on their own map
        const envHead = darkEnvelope(headDocY);
        const k0 = Math.floor(headDocY / spacing);
        if (envHead > 0 && (visited.has(k0) || visited.has(k0 + 1))) {
          const t = headDocY / spacing - k0;
          const hx = (railX(k0, side) + (railX(k0 + 1, side) - railX(k0, side)) * t) * dpr;
          const hy = (headDocY - y) * dpr;
          const glow = (0.5 + Math.min(0.4, scrollVel * 0.006)) * envHead;
          ctx.fillStyle = `rgba(${SUPERNOVA},${glow})`;
          ctx.beginPath();
          ctx.arc(hx, hy, 2.2 * dpr, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `rgba(${SUPERNOVA},${glow * 0.35})`;
          ctx.lineWidth = 1 * dpr;
          ctx.beginPath();
          ctx.arc(hx, hy, 6 * dpr, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };

    const start = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(draw);
      }
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const onVis = () => (document.visibilityState === "visible" ? start() : stop());
    document.addEventListener("visibilitychange", onVis);
    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[1] h-full w-full"
      aria-hidden="true"
    />
  );
}
