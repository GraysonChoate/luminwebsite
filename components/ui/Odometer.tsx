"use client";

import { useEffect, useRef } from "react";

/**
 * Continuous-lerp odometer (two digit columns). The ones column translates
 * smoothly through values rather than stepping — value comes from a ref
 * updated by the parent's scrubbed ScrollTrigger.
 */
const DIGIT_H = 28;

export default function Odometer({ valueRef }: { valueRef: React.MutableRefObject<number> }) {
  const onesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const v = valueRef.current; // e.g. 1.0 .. 6.0
      if (onesRef.current) {
        onesRef.current.style.transform = `translate3d(0, ${-v * DIGIT_H}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    // Track only while visible — no reason to update a scrolled-past counter.
    let running = false;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        raf = requestAnimationFrame(loop);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    if (onesRef.current) io.observe(onesRef.current);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [valueRef]);

  return (
    <div className="font-nav flex text-[12px] font-semibold tracking-[0.2em]" style={{ color: "var(--text-muted)" }} aria-hidden="true">
      <div style={{ height: DIGIT_H, lineHeight: `${DIGIT_H}px` }}>0</div>
      <div className="overflow-hidden" style={{ height: DIGIT_H }}>
        <div ref={onesRef} className="will-change-transform">
          {Array.from({ length: 10 }).map((_, d) => (
            <div key={d} style={{ height: DIGIT_H, lineHeight: `${DIGIT_H}px` }}>
              {d}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
