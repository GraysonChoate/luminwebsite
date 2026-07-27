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
  readyRef,
  proxyUrls,
  priority,
}: {
  progressRef: React.MutableRefObject<number>;
  frameCount?: number;
  frameUrls?: string[];
  className?: string;
  fit?: "cover" | "contain";
  background?: string;
  /** Written with the highest CONTIGUOUS decoded frame index + 1, i.e. "every
   *  frame below this is safe to draw". Deliberately not a raw completion
   *  count: requests go out in order but finish out of order, so a count of 300
   *  does not mean frame 300 exists — gating on the count still let the journey
   *  step onto an undecoded frame and paint nothing. A ref, not state, because
   *  478 frames would otherwise mean 478 re-renders. */
  readyRef?: React.MutableRefObject<number>;
  /** A low-resolution copy of the SAME strip, same length and order.
   *  The full journey is 30MB and takes ~45s to decode; the proxy is 7MB and
   *  lands in a few seconds, so scrubbing is smooth almost immediately and the
   *  full frames swap in underneath as they arrive. The source is already
   *  upscaled 1.67-2x on a retina canvas, so compressing the REAL frames to
   *  solve load time would have cost visible sharpness in the hero image —
   *  this buys the same speed and gives the quality back. */
  proxyUrls?: string[];
  /** Frame indices to fetch at full resolution before anything else — the
   *  frames the journey actually stops on, so a catch is never soft. */
  priority?: number[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const proxyRef = useRef<(HTMLImageElement | null)[]>([]);
  /** last frame actually PAINTED. A ref, not an effect local: the draw effect
   *  re-runs on prop changes, and an effect-local would reset to null and let
   *  the very next canvas wipe paint flat background instead of real footage. */
  const lastImgRef = useRef<HTMLImageElement | null>(null);

  // ── LOADING: A MOVING WINDOW, NOT THE WHOLE FILM ──────────────────────
  //  The old loader asked for every frame at once. For the journey and the
  //  void together that is 2,126 images and, decoded, several GIGABYTES of
  //  bitmap. The browser decodes those on the main thread, which is exactly
  //  where the picture is drawn — measured, 4.3% of frames fell below 30fps
  //  with stalls up to 160ms, and that is the lag you can feel.
  //
  //  So: the proxy strip is small enough to fetch whole (it is what guarantees
  //  something is always on screen), but FULL-RESOLUTION frames are only
  //  fetched in a window around wherever the visitor actually is. Scrolling
  //  drags the window along. Nothing far away is ever decoded, so nothing
  //  competes with the frame you are looking at.
  useEffect(() => {
    if (!frameUrls?.length) return;
    const N = frameUrls.length;
    imagesRef.current = new Array(N).fill(null);
    proxyRef.current = new Array(N).fill(null);
    let cancelled = false;

    const done = new Array(N).fill(false);
    let edge = 0;
    const tick = (i: number) => {
      done[i] = true;
      while (done[edge]) edge++;
      if (readyRef) readyRef.current = edge;
    };
    const into = (
      arr: (HTMLImageElement | null)[], url: string, i: number,
      after?: (i: number) => void,
    ) => {
      if (arr[i]) return;
      const img = new Image();
      img.src = url;
      const ok = () => after?.(i);
      if (img.decode) img.decode().then(ok, () => { img.onload = ok; img.onerror = ok; });
      else { img.onload = ok; img.onerror = ok; }
      arr[i] = img;
    };

    // 1. the whole proxy strip, gently — small files, and it is the safety net
    if (proxyUrls?.length === N) {
      const q = proxyUrls.map((_, i) => i);
      const pumpProxy = () => {
        if (cancelled || !q.length) return;
        q.splice(0, 6).forEach((i) => into(proxyRef.current, proxyUrls[i], i));
        setTimeout(pumpProxy, 45);
      };
      pumpProxy();
    }

    // 2. the frames the film actually stops on, at full res, first
    (priority ?? []).forEach((i) => into(imagesRef.current, frameUrls[i], i, tick));

    // 3. full res only AROUND the visitor, following them as they move
    const BEHIND = 40, AHEAD = 110, PER_TICK = 4;
    const chase = () => {
      if (cancelled) return;
      const f = Math.round(Math.min(1, Math.max(0, progressRef.current)) * (N - 1));
      let budget = PER_TICK;
      for (let d = 0; d <= AHEAD && budget > 0; d++) {
        for (const i of d === 0 ? [f] : [f + d, f - d]) {
          if (i < 0 || i >= N) continue;
          if (d > BEHIND && i < f) continue;             // do not chase backwards far
          if (!imagesRef.current[i]) { into(imagesRef.current, frameUrls[i], i, tick); if (--budget <= 0) break; }
        }
      }
      setTimeout(chase, 90);
    };
    chase();

    return () => { cancelled = true; };
  }, [frameUrls, proxyUrls, priority, readyRef, progressRef]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let lastFrame = -1;
    let lastProxy = -1;
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
        // FILL, never clear. clearRect left the canvas fully transparent
        // whenever a resize wiped it and the next frame was not yet decoded —
        // which read as the footage "cutting out and turning grey". A cover
        // draw covers the whole canvas anyway, so this only ever shows during
        // that gap, and it shows the section colour instead of a hole.
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, cw, ch);
      }
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      lastImgRef.current = img;
    };

    // Defined AFTER drawImage on purpose. `const` arrow functions are in the
    // temporal dead zone until their line runs, and resize() paints the held
    // frame — calling it earlier threw "Cannot access 'drawImage' before
    // initialization", which killed the whole render loop and left the canvas
    // dead. That is the real origin of the footage cutting out.
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      lastFrame = -1;                       // force redraw
      const held = lastImgRef.current;
      if (held && held.complete) drawImage(held);   // …and never leave it wiped
      else { ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);


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
          lastProxy = -1;
          signalReady(); // first real frame is on screen — safe to lift the loader
        } else if (!frameUrls?.length) {
          drawPlaceholder(f, p);
          lastFrame = f;
          signalReady();
        } else if (proxyRef.current[f]?.complete && proxyRef.current[f]!.naturalWidth) {
          // full res is still in flight — draw the proxy so the motion stays
          // smooth, and keep lastFrame unset so the loop swaps the real frame
          // in the moment it decodes.
          if (f !== lastProxy) { drawImage(proxyRef.current[f]!); lastProxy = f; signalReady(); }
        } else if (lastImgRef.current?.complete) {
          // frame f is still downloading. Repaint the last good frame rather
          // than leaving whatever the canvas happens to hold — after a resize
          // that is nothing at all. Do NOT advance lastFrame, so the loop keeps
          // retrying until the real frame decodes.
          drawImage(lastImgRef.current);
        }
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
