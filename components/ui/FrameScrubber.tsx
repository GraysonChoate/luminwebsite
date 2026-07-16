"use client";

import { useEffect, useRef } from "react";

/**
 * Canvas frame scrubber.
 * Contract: progress (0..1) -> frameIndex = floor(progress * (frameCount - 1)).
 *
 * Two modes:
 *  - frameUrls provided: draws decoded image frames (production path;
 *    fetch is batched 8-per-50ms like the reference implementation).
 *  - no frameUrls: draws PROCEDURAL PLACEHOLDER frames so the scrub
 *    mechanics are fully testable before real renders exist.
 *
 * fit:
 *  - "cover" (default): fills the viewport, cropping overflow — right for
 *    edge-to-edge cinematic sources.
 *  - "contain": the WHOLE frame is always visible, letterboxed and never
 *    upscaled past its native size — right for 1080p sources on large/Retina
 *    displays where cover would crop the framing and magnify the pixels.
 *    Letterbox area is painted with `background` (default black).
 */
export default function FrameScrubber({
  progressRef,
  frameCount = 240,
  frameUrls,
  className,
  fit = "cover",
  background = "#050508",
}: {
  progressRef: React.MutableRefObject<number>;
  frameCount?: number;
  frameUrls?: string[];
  className?: string;
  fit?: "cover" | "contain";
  background?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);

  // Batched frame loading (8 frames / 50ms), frame 0 first — audit-faithful.
  useEffect(() => {
    if (!frameUrls?.length) return;
    imagesRef.current = new Array(frameUrls.length).fill(null);
    let cancelled = false;
    const load = (i: number) => {
      const img = new Image();
      img.src = frameUrls[i];
      img.decode?.().catch(() => {});
      imagesRef.current[i] = img;
    };
    load(0);
    const rest = frameUrls.map((_, i) => i).slice(1);
    const pump = () => {
      if (cancelled || !rest.length) return;
      rest.splice(0, 8).forEach(load);
      setTimeout(pump, 50);
    };
    pump();
    return () => {
      cancelled = true;
    };
  }, [frameUrls]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let lastFrame = -1;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      lastFrame = -1; // force redraw
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const total = frameUrls?.length ?? frameCount;

    const drawImage = (img: HTMLImageElement) => {
      const cw = canvas.width, ch = canvas.height;
      let s: number;
      if (fit === "contain") {
        // whole frame visible; never upscale past native size × dpr
        // (prevents the cropped/over-magnified look on large displays)
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        s = Math.min(cw / img.naturalWidth, ch / img.naturalHeight, dpr);
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, cw, ch);
      } else {
        s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
        ctx.clearRect(0, 0, cw, ch);
      }
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    };

    /** Placeholder painter: dawn -> dark journey with a moving horizon marker,
     *  grid floor and frame counter. Communicates scrub state unambiguously. */
    const drawPlaceholder = (f: number, p: number) => {
      const cw = canvas.width, ch = canvas.height;
      const dark = Math.min(1, p * 1.6); // light -> dark arc
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      const sky = (l: number) => `hsl(228 ${20 + dark * 30}% ${l * (1 - dark * 0.92)}%)`;
      g.addColorStop(0, sky(72));
      g.addColorStop(0.55, sky(48));
      g.addColorStop(1, "#0a0a0f");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);

      // grid floor emerges as it darkens
      ctx.strokeStyle = `rgba(82,112,255,${0.08 + dark * 0.25})`;
      ctx.lineWidth = 1;
      const horizon = ch * 0.58;
      for (let i = 0; i <= 24; i++) {
        const x = (i / 24) * cw;
        ctx.beginPath();
        ctx.moveTo(x, horizon);
        ctx.lineTo(cw / 2 + (x - cw / 2) * 3.2, ch);
        ctx.stroke();
      }
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const y = horizon + t * t * (ch - horizon);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
        ctx.stroke();
      }
      // traveling marker = spatial motion stand-in
      const mx = cw * (0.15 + 0.7 * p);
      ctx.fillStyle = "rgba(227,255,112,0.9)";
      ctx.beginPath();
      ctx.arc(mx, horizon - ch * 0.04, Math.max(3, cw * 0.004), 0, Math.PI * 2);
      ctx.fill();
      // frame counter (debug affordance, removed with real frames)
      ctx.fillStyle = `rgba(255,255,255,${0.25 + dark * 0.3})`;
      ctx.font = `${Math.max(11, cw * 0.008)}px monospace`;
      ctx.fillText(`frame ${String(f).padStart(3, "0")} / ${total - 1}`, cw * 0.02, ch * 0.97);
    };

    let signaledReady = false;
    const signalReady = () => {
      if (signaledReady) return;
      signaledReady = true;
      (window as unknown as { __luminHeroReady?: boolean }).__luminHeroReady = true;
      window.dispatchEvent(new Event("lumin:heroReady"));
    };

    const loop = () => {
      const p = Math.min(1, Math.max(0, progressRef.current));
      const f = Math.floor(p * (total - 1));
      if (f !== lastFrame) {
        const img = frameUrls?.length ? imagesRef.current[f] : null;
        if (img && img.complete && img.naturalWidth) {
          drawImage(img);
          lastFrame = f;
          signalReady(); // first real frame is on screen — safe to lift the loader
        } else if (!frameUrls?.length) {
          drawPlaceholder(f, p);
          lastFrame = f;
          signalReady();
        }
        // if real frames are set but frame f isn't decoded yet: hold last frame
      }
      raf = requestAnimationFrame(loop);
    };

    // Only paint while on screen — this loop must not burn frames once the
    // visitor has scrolled past the hero.
    let running = false;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        lastFrame = -1; // repaint on re-entry
        raf = requestAnimationFrame(loop);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [frameCount, frameUrls, progressRef, fit, background]);

  return <canvas ref={canvasRef} className={className} style={{ width: "100%", height: "100%" }} />;
}
