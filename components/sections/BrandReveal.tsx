"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { REVEAL } from "@/lib/copy";

/**
 * Pinned brand-reveal interlude — the page's dark beat.
 * 200vh section, sticky 100vh. Giant scattered letters converge into the
 * wordmark on a scrubbed timeline; eyebrow and tagline fade at the edges;
 * an ambient 2D canvas grid (time-based, not scroll-linked) breathes behind.
 * At progress >= 0.99 the section hands off light (theme flip hook).
 */
export default function BrandReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ambient grid canvas — Cosmos surface, Supernova/Galaxy accent dots
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx2d = canvas.getContext("2d")!;
    let raf = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const draw = (t: number) => {
      const { width: w, height: h } = canvas;
      ctx2d.fillStyle = "#212121";
      ctx2d.fillRect(0, 0, w, h);
      const cell = Math.max(48, w / 26);
      ctx2d.strokeStyle = "rgba(255,255,255,0.045)";
      ctx2d.lineWidth = 1;
      for (let x = 0; x <= w; x += cell) {
        ctx2d.beginPath(); ctx2d.moveTo(x, 0); ctx2d.lineTo(x, h); ctx2d.stroke();
      }
      for (let y = 0; y <= h; y += cell) {
        ctx2d.beginPath(); ctx2d.moveTo(0, y); ctx2d.lineTo(w, y); ctx2d.stroke();
      }
      // breathing accent dots at intersections
      for (let x = 0; x <= w; x += cell) {
        for (let y = 0; y <= h; y += cell) {
          const pulse = Math.sin(t / 1400 + x * 0.011 + y * 0.017);
          if (pulse > 0.75) {
            ctx2d.fillStyle = pulse > 0.93 ? "rgba(227,255,112,0.6)" : "rgba(82,112,255,0.45)";
            ctx2d.beginPath();
            ctx2d.arc(x, y, 1.6, 0, Math.PI * 2);
            ctx2d.fill();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    // Ambient loop only runs while the section is on screen.
    let running = false;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        raf = requestAnimationFrame(draw);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas);

    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, []);

  // scrubbed converge timeline
  useEffect(() => {
    const el = sectionRef.current!;
    const ctx = gsap.context(() => {
      const letters = el.querySelectorAll<HTMLElement>("[data-letter]");
      const spread = [
        { x: -38, y: -18, s: 2.6 },
        { x: -16, y: 22, s: 3.1 },
        { x: 4, y: -26, s: 2.4 },
        { x: 22, y: 16, s: 3.4 },
        { x: 40, y: -8, s: 2.8 },
      ];
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "90% bottom",
          scrub: true,
        },
      });
      letters.forEach((l, i) => {
        const sp = spread[i % spread.length];
        tl.fromTo(
          l,
          { xPercent: sp.x * 8, yPercent: sp.y * 4, scale: sp.s, opacity: 0.9 },
          { xPercent: 0, yPercent: 0, scale: 1, opacity: 1, ease: "none", duration: 0.9 },
          0
        );
      });
      tl.fromTo("[data-reveal-eyebrow]", { opacity: 0 }, { opacity: 0.5, duration: 0.15, ease: "none" }, 0.55);
      tl.fromTo("[data-reveal-tagline]", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.18, ease: "none" }, 0.78);
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} data-trace-dark className="relative h-[200vh]" style={{ background: "var(--c-cosmos)" }}>
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-clip">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        {/* z-2: copy must stay above the page-level trace canvas (z-1) */}
        <div className="relative z-[2] flex flex-col items-center gap-5 text-white">
          <p data-reveal-eyebrow className="type-eyebrow opacity-0">
            {REVEAL.eyebrow}
          </p>
          <h2 className="type-reveal flex" aria-label={REVEAL.word}>
            {Array.from(REVEAL.word).map((ch, i) => (
              <span key={i} data-letter aria-hidden="true" className="inline-block will-change-transform">
                {ch}
              </span>
            ))}
          </h2>
          <p data-reveal-tagline className="font-nav text-[14px] font-semibold uppercase tracking-[0.28em] opacity-0" style={{ color: "var(--pop-galaxy)" }}>
            {REVEAL.tagline}
          </p>
        </div>
      </div>
    </section>
  );
}
