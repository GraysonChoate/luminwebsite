"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";

/**
 * Two-phase line reveal:
 *   Phase 1 (0 → 0.6): the phrase floats UP into position while a faint GHOST
 *     of the text fades in (stays super-transparent — it's arriving, not there yet).
 *   Phase 2 (0.6 → 1): now settled in place, a lighted gradient WIPES across
 *     left→right, solidifying the text to full opacity as it passes.
 *
 * Layers per line: a low-opacity ghost (rises), a full-opacity solid revealed
 * by a mask tied to the wipe, and a Supernova light band (clipped to glyphs)
 * riding the wipe edge.
 *
 * Modes:
 *   - driveRef  → reveal progress read each frame from a ref (scroll-driven)
 *   - active    → play/reset (keyed use)
 *   - (default) → own ScrollTrigger, play on enter / reset on leave-back
 */
const GHOST = 0.28; // "super transparent" ghost opacity ceiling
const RISE = 44; // yPercent the line floats up from
const P1 = 0.6; // fraction of progress spent rising (ghost) before the wipe

export default function RevealLines({
  lines,
  className,
  active,
  driveRef,
  stagger = 0.09,
  duration = 1.2,
  as: Tag = "span",
}: {
  lines: string[];
  className?: string;
  active?: boolean;
  driveRef?: React.MutableRefObject<number>;
  stagger?: number;
  duration?: number;
  as?: "span" | "div";
}) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const lineEls = Array.from(root.querySelectorAll<HTMLElement>("[data-line]"));
    const inners = lineEls.map((l) => l.querySelector<HTMLElement>("[data-inner]")!);
    const ghosts = lineEls.map((l) => l.querySelector<HTMLElement>("[data-ghost]")!);
    const lights = lineEls.map((l) => l.querySelector<HTMLElement>("[data-light]")!);
    const clamp = (v: number) => Math.min(1, Math.max(0, v));

    // map a single 0→1 progress to the two-phase state, per line (staggered)
    const apply = (p: number) => {
      lineEls.forEach((line, i) => {
        const off = i * (stagger / duration);
        const lp = clamp((p - off) / (1 - off || 1));
        const ph1 = clamp(lp / P1);
        const ph2 = clamp((lp - P1) / (1 - P1));
        const e1 = 1 - Math.pow(1 - ph1, 3); // rise easing (power3.out)
        gsap.set(inners[i], { yPercent: (1 - e1) * RISE });
        gsap.set(ghosts[i], { opacity: e1 * GHOST });
        line.style.setProperty("--w", String(ph2)); // drives the solid mask wipe
        gsap.set(lights[i], { opacity: Math.sin(Math.PI * ph2), backgroundPosition: `${150 - ph2 * 210}% 0` });
      });
    };

    apply(0);

    // driveRef: scroll-driven. Always-on rAF (one element, cheap) — reading a
    // ref every frame; paused only when the tab is hidden. (A prior version
    // gated this behind an IntersectionObserver on an inline span that never
    // fired, so apply() stayed at 0 and the copy was permanently invisible.)
    if (driveRef) {
      let raf = 0;
      const render = () => { apply(driveRef.current); raf = requestAnimationFrame(render); };
      const onVis = () => {
        cancelAnimationFrame(raf);
        if (!document.hidden) raf = requestAnimationFrame(render);
      };
      document.addEventListener("visibilitychange", onVis);
      raf = requestAnimationFrame(render);
      return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onVis); };
    }

    // timeline modes: animate a proxy 0→1 through apply()
    let tween: gsap.core.Tween | null = null;
    const proxy = { p: 0 };
    const play = () => { tween?.kill(); proxy.p = 0; tween = gsap.to(proxy, { p: 1, duration, ease: "none", onUpdate: () => apply(proxy.p) }); };
    const reset = () => { tween?.kill(); proxy.p = 0; apply(0); };

    if (active === undefined) {
      const ctx = gsap.context(() => {
        ScrollTrigger.create({ trigger: root, start: "top 82%", onEnter: play, onLeaveBack: reset });
      }, root);
      return () => { ctx.revert(); tween?.kill(); };
    }
    if (active) play();
    return () => { tween?.kill(); };
  }, [lines, stagger, duration, active, driveRef]);

  return (
    <Tag ref={rootRef as React.Ref<HTMLSpanElement & HTMLDivElement>} className={className} aria-label={lines.join(" ")}>
      {lines.map((line, i) => (
        <span key={i} data-line aria-hidden="true" className="block" style={{ ["--w" as string]: 0 }}>
          <span data-inner className="relative inline-block will-change-transform">
            {/* ghost — faint text that floats up into position */}
            <span data-ghost style={{ opacity: 0 }}>{line}</span>
            {/* solid — full-opacity text revealed left→right by the wipe */}
            <span
              data-solid
              className="absolute inset-0"
              style={{
                WebkitMaskImage: "linear-gradient(to right, #000 calc(var(--w) * 140% - 40%), transparent calc(var(--w) * 140%))",
                maskImage: "linear-gradient(to right, #000 calc(var(--w) * 140% - 40%), transparent calc(var(--w) * 140%))",
              }}
            >
              {line}
            </span>
            {/* lighted edge — Supernova, clipped to glyphs, rides the wipe */}
            <span
              data-light
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(82,112,255,0) 0%, rgba(82,112,255,0.9) 42%, rgba(150,175,255,1) 52%, rgba(82,112,255,0) 100%)",
                backgroundSize: "220% 100%",
                backgroundPosition: "150% 0",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
                opacity: 0,
              }}
            >
              {line}
            </span>
          </span>
        </span>
      ))}
    </Tag>
  );
}
