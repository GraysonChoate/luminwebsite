"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { SEGMENTS } from "@/lib/copy";

/**
 * Pinned business-type deck: 3 fullscreen slides pre-stacked (z 3/2/1),
 * advanced by scroll thirds AND clickable via segment tabs (tabs scroll the
 * belt to the slide's position through Lenis-driven native scroll).
 * Slide exit = upward clip wipe (fastInOut), reversible. Media = placeholder
 * gradient panels until wide/vertical loop pairs land.
 */
const N = SEGMENTS.items.length;

const SLIDE_BG = [
  "linear-gradient(150deg, #212121 10%, #5270ff40 100%)",
  "linear-gradient(150deg, #212121 10%, #86339940 100%)",
  "linear-gradient(150deg, #212121 10%, #00ffba2c 100%)",
];

export default function SegmentSelector() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const el = sectionRef.current!;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        scrub: 0,
        onUpdate: (self) => {
          const idx = Math.min(N - 1, Math.floor(self.progress * N));
          if (idx !== activeRef.current) {
            const prev = activeRef.current;
            activeRef.current = idx;
            setActive(idx);
            // wipe: layers above the active index clip away upward
            layerRefs.current.forEach((layer, i) => {
              if (!layer) return;
              gsap.to(layer, {
                clipPath: i < idx ? "inset(0% 0% 100% 0%)" : "inset(0% 0% 0% 0%)",
                duration: 0.8,
                ease: "fastInOut",
                overwrite: true,
              });
            });
            void prev;
          }
        },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  const goTo = (i: number) => {
    const el = sectionRef.current!;
    const beltTop = el.offsetTop;
    const belt = el.offsetHeight - window.innerHeight;
    const target = beltTop + (belt * (i + 0.5)) / N;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <section ref={sectionRef} id="for-you" className="relative" style={{ height: `${N * 130 + 100}vh`, background: "var(--c-cosmos)" }}>
      <div className="sticky top-0 h-screen overflow-clip">
        {/* stacked slides — later index = lower z, first slide on top */}
        {SEGMENTS.items.map((seg, i) => (
          <div
            key={seg.name}
            ref={(node) => {
              layerRefs.current[i] = node;
            }}
            className="absolute inset-0"
            style={{ zIndex: N - i, clipPath: "inset(0% 0% 0% 0%)" }}
          >
            <div className="absolute inset-0" style={{ background: `${SLIDE_BG[i % SLIDE_BG.length]}, #212121` }} />
            <div className="absolute inset-0 bg-black/40" />
            <span className="font-nav absolute right-8 top-28 text-[12px] font-semibold uppercase tracking-[0.3em] text-white/40">
              Fullscreen loop {String(i + 1).padStart(2, "0")}
            </span>
            <div className="container-pad absolute inset-x-0 bottom-0 grid grid-cols-1 gap-6 pb-16 text-white lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="type-eyebrow mb-3 text-white/60">{`${SEGMENTS.eyebrow} — 0${i + 1}`}</p>
                <h3 className="type-step">{seg.headline}</h3>
              </div>
              <div className="lg:col-span-5">
                <p className="text-[15px] leading-relaxed text-white/75">{seg.body}</p>
              </div>
              <div className="flex items-end lg:col-span-2">
                <button className="btn btn-primary">{seg.cta}</button>
              </div>
            </div>
          </div>
        ))}

        {/* section headline + segment tabs (clickable skip control) */}
        <div className="container-pad absolute inset-x-0 top-0 z-[10] pt-28 text-white">
          <h2 className="type-statement max-w-[46rem]">
            {SEGMENTS.headline.join(" ")}
          </h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {SEGMENTS.items.map((seg, i) => (
              <button
                key={seg.name}
                onClick={() => goTo(i)}
                className="btn"
                style={{
                  background: i === active ? "var(--c-supernova)" : "rgba(255,255,255,0.12)",
                  color: "#fff",
                }}
              >
                {seg.name}
              </button>
            ))}
          </div>
        </div>

        {/* progress rail */}
        <div className="absolute left-[var(--container-pad)] top-1/2 z-[10] hidden -translate-y-1/2 lg:block">
          <div className="relative h-[193px] w-[2px] overflow-clip rounded-full" style={{ background: "rgba(255,255,255,0.19)" }}>
            <div
              className="absolute left-0 w-full rounded-full transition-[top] duration-500"
              style={{ background: "var(--pop-galaxy)", height: `${100 / N}%`, top: `${(active * 100) / N}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
