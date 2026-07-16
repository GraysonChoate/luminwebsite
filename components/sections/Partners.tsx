"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { PARTNERS } from "@/lib/copy";
import SplitChars from "@/components/ui/SplitChars";
import CircuitNetwork from "@/components/ui/CircuitTrace";

/**
 * Logo proof wall: hairline-grid tiles with corner ticks, staggered logo
 * fade-ins, overlaid claim. Placeholder marks until real partners land.
 */
export default function Partners() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const ctx = gsap.context(() => {
      // Read order: headline first (earlier trigger), then the proof tiles.
      gsap.fromTo(
        el.querySelectorAll("h2 .split-char"),
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "expo.out",
          stagger: 0.012,
          scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none reverse" },
        }
      );
      gsap.fromTo(
        el.querySelectorAll("[data-tile]"),
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "expo.out",
          stagger: 0.05,
          scrollTrigger: { trigger: el, start: "top 78%", toggleActions: "play none none reverse" },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="container-pad relative overflow-clip bg-white py-28">
      {/* symmetric circuit network — grows from origin nodes, plugs into the outer tiles */}
      <CircuitNetwork seed={11} mode="full" targets="[data-circuit-target]" className="hidden lg:block" />
      <h2 className="type-statement relative z-[2] mx-auto mb-16 max-w-[60rem] text-center">
        <SplitChars lines={PARTNERS.headline} />
      </h2>
      <div className="relative z-[1] mx-auto grid max-w-[1110px] grid-cols-3 md:grid-cols-6">
        {Array.from({ length: PARTNERS.logoCount }).map((_, i) => (
          <div
            key={i}
            data-tile
            {...(i % 6 === 0 || i % 6 === 5 ? { "data-circuit-target": "" } : {})}
            className="relative flex aspect-square items-center justify-center"
            style={{ outline: "1px solid var(--hairline)", outlineOffset: "-0.5px" }}
          >
            {/* corner tick */}
            <span className="absolute left-0 top-0 h-2 w-[1px]" style={{ background: "var(--c-meteor)" }} />
            <span className="absolute left-0 top-0 h-[1px] w-2" style={{ background: "var(--c-meteor)" }} />
            <span className="font-nav text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--c-meteor)" }}>
              Partner {String(i + 1).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
