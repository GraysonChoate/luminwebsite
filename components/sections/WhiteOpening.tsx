"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/motion";
import { OPENING } from "@/lib/copy";
import SplitChars from "@/components/ui/SplitChars";

/**
 * White opening — the brand identity/activation moment that now opens the
 * page (light, not the old dark hero open). Blueprint language: dashed
 * crosshair + corner registration ticks around a centered identity
 * statement. Simple entrance reveal; the scroll then descends into the dark
 * journey hero below.
 */
export default function WhiteOpening() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelector("[data-mark]"),
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", delay: 0.1 }
      );
      gsap.fromTo(
        el.querySelectorAll("h1 .split-char"),
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.014, delay: 0.25 }
      );
      gsap.fromTo(
        el.querySelectorAll("[data-tick], [data-cross]"),
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: "power2.out", stagger: 0.04, delay: 0.5 }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="container-pad relative flex min-h-[92vh] items-center justify-center bg-white">
      {/* blueprint accents */}
      <span data-cross aria-hidden="true" className="absolute left-1/2 top-[14%] h-10 w-px -translate-x-1/2" style={{ background: "rgba(33,33,33,0.18)" }} />
      <span data-cross aria-hidden="true" className="absolute left-1/2 top-[14%] mt-5 h-px w-10 -translate-x-1/2" style={{ background: "rgba(33,33,33,0.18)" }} />
      {[
        { left: "8%", top: "12%" }, { right: "8%", top: "12%" },
        { left: "8%", bottom: "12%" }, { right: "8%", bottom: "12%" },
      ].map((pos, i) => (
        <span key={i} data-tick className="absolute" style={pos as React.CSSProperties}>
          <span className="absolute h-[11px] w-[1.5px]" style={{ background: "var(--c-cosmos)", left: 5, top: 0 }} />
          <span className="absolute h-[1.5px] w-[11px]" style={{ background: "var(--c-cosmos)", left: 0, top: 5 }} />
        </span>
      ))}

      <div className="text-center">
        <p data-mark className="mb-8 text-[28px] font-bold tracking-tight" style={{ color: "var(--c-cosmos)", fontFamily: "var(--font-heebo)" }}>
          lumin
        </p>
        <h1 className="type-statement" style={{ color: "var(--c-cosmos)" }}>
          <SplitChars lines={OPENING.statement} />
        </h1>
      </div>
    </section>
  );
}
