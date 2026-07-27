"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { HERO, JOURNEY } from "@/lib/copy";
import SplitChars from "@/components/ui/SplitChars";
import FrameScrubber from "@/components/ui/FrameScrubber";
import { createBeatGate } from "@/lib/beatGate";

/**
 * Cinematic scroll-journey hero — one continuous 7-beat sequence scrubbed by
 * scroll (check-in → consultation → assessment → training floor → Station →
 * Studio → Fuel). Every beat transition passes through the dissolve-to-black
 * spatial realm baked into the assembled footage; captions ride on top of the
 * scenes and clear before each seam.
 *
 * The page opens on a looping idle hero (the Dope-icon logo video) which sits
 * over the journey's first frame until the visitor scrolls; the idle fades out
 * across the first sliver of the walk, revealing the scrubbed footage.
 *
 * Frame mapping is LINEAR: all 478 frames are filmed, so raw scroll progress
 * 0→1 maps directly to frames 0→477. Caption windows are proportional to each
 * beat's real frame range.
 */
const FRAME_COUNT = JOURNEY.frameCount; // 478 (indices 0–477)
const LAST = FRAME_COUNT - 1; // 477 (end of the final "fuel" beat)

const frameUrls = (variant: "desktop" | "mobile") =>
  Array.from({ length: FRAME_COUNT }, (_, i) => `/frames/journey/${variant}/f_${String(i + 1).padStart(3, "0")}.webp`);

/* ── BEAT GATING ──────────────────────────────────────────────────────────
   The journey used to be a pure scrub, so how many scenes you crossed was
   decided by how hard you flicked — "too sensitive and its easy to swipe
   through it". It is now GATED: one gesture = one scene, travelling at the
   film's authored 24fps, and the page HOLDS on each scene until you ask for
   the next one. The hold is the point — it is what gives you time to read the
   caption and click the product link.

   Stops are the MIDPOINT of each beat, not its edges. Every beat ends in a
   dissolve-to-black seam, so parking on a boundary would park on black; the
   midpoint is dead centre of the caption's visible window (captions run from
   0.34 to 0.68 of a beat). Travel therefore carries you through the seams and
   lands on the money frame. Stop 0 is the opening orb, whose own 300px
   transition has to clear before the journey is visible — hence the 0.09 floor. */
/** SCENE DWELL FRAMES, read off the footage rather than off JOURNEY.beats.
 *  The seams were found by luminance (every scene ends in a dissolve to black,
 *  mean < 26): 1-17, 66-81, 133-155, 201-216, 265-285, 324-345, 392-408,
 *  471-478. That leaves seven lit scenes — but the LAST one holds two distinct
 *  moments, the guy with his phone in the supplement area and then the walk to
 *  the counter, which is why the walkthrough has eight products and only seven
 *  captions. Each number below sits well inside its scene, clear of both seams. */
const DWELL_FRAMES = [41, 107, 178, 240, 304, 368, 430, 458];
const DWELL = DWELL_FRAMES.map((f) => f / LAST);
const STOPS = [0, Math.max(DWELL[0], 0.09), ...DWELL.slice(1)];
/** every hop runs at 24fps — duration is the frame distance, never a guess */
const DURATIONS = STOPS.slice(0, -1).map((s, i) => ((STOPS[i + 1] - s) * LAST) / 24);

/* ── SCENE LINKS ──────────────────────────────────────────────────────────
   One product per scene. The seven beats and the consolidated taxonomy happen
   to be exactly seven things, so this is a clean 1:1 — Lumin One (Move, Fuel,
   Market) and Lumin Pro (Core, Academy, Connect, Loops).

   Anchors are SOURCE-SPACE coordinates (1920x1080) chosen by scoring each
   dwell frame's quietest region — low brightness, low variance — so a marker
   lands in real negative space in that shot rather than floating over the
   action. They map to screen through the same object-fit:cover transform the
   footage uses, which is why they stay pinned to the scene at any viewport.
   Labels flip to the left of the node when the anchor is near the right edge. */
const SRC_W = 1920, SRC_H = 1080;
const SCENE_LINKS = [
  { beat: "check-in",  product: "Loops",     x: 1120, y: 405 },
  { beat: "sales",     product: "Connect",   x: 1740, y: 675 },
  { beat: "pt-floor",  product: "Trainer",   x: 1120, y: 675 },
  { beat: "gym-floor", product: "Companion", x: 1740, y: 675 },
  { beat: "station",   product: "Station",   x: 1440, y: 675 },
  { beat: "studio",    product: "Studio",    x: 1740, y: 405 },
  { beat: "fuel",      product: "Fuel",      x: 1440, y: 675 },
  { beat: "market",    product: "Market",    x: 1120, y: 405 },
];

/** map a source-space point to screen, matching object-fit: cover */
function coverPoint(vw: number, vh: number, sx: number, sy: number) {
  const scale = Math.max(vw / SRC_W, vh / SRC_H);
  return { left: (vw - SRC_W * scale) / 2 + sx * scale, top: (vh - SRC_H * scale) / 2 + sy * scale };
}

/** caption windows in progress space, proportional to beat frame ranges */
const WINDOWS = JOURNEY.beats.map((b) => {
  const start = b.frames[0] / LAST;
  const end = b.frames[1] / LAST;
  const span = end - start;
  return {
    // enter a third into the beat, clear before the dissolve seam
    in: [start + span * 0.1, start + span * 0.34] as const,
    out: [start + span * 0.68, start + span * 0.86] as const,
  };
});

/** Orb transition, pre-sliced to image frames so scroll scrubs it SMOOTHLY
 * (no on-the-fly video seeking = no choppiness), exactly like the journey. */
const TRANSITION_FRAMES = 97;
const transitionUrls = Array.from(
  { length: TRANSITION_FRAMES },
  (_, i) => `/frames/transition/f_${String(i + 1).padStart(3, "0")}.webp`,
);

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<HTMLDivElement>(null);
  const stationaryRef = useRef<HTMLVideoElement>(null);
  const transitionLayerRef = useRef<HTMLDivElement>(null);
  const transitionProgressRef = useRef(0);
  const progressRef = useRef(0);
  const [variant, setVariant] = useState<"desktop" | "mobile">("desktop");
  const [openingDone, setOpeningDone] = useState(false); // orb-emerge loader lifted
  /** which gate stop we are parked on; -1 while a beat is travelling.
   *  NOT named `stop` — that resolves to the global `window.stop`. */
  const [stopIdx, setStopIdx] = useState(0);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  /** frames decoded so far — the gate will not step past them */
  const framesReady = useRef(0);
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setVariant(mq.matches ? "mobile" : "desktop");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Opening orbs. The loader (PageLoader) plays "Orb Emerge"; beneath it the
  // "Orb Stationary" idle loops from mount, so when the loader lifts the idle is
  // already running (seamless handoff). "Orb Transition" also loops hidden,
  // ready to bridge into the journey on first scroll (driven by the scroll
  // timeline below). `openingDone` (loader lifted) ungates the scroll hint.
  useEffect(() => {
    stationaryRef.current?.play().catch(() => {}); // idle loop plays; transition is scrubbed, never played
    const onEmerge = () => setOpeningDone(true);
    if ((window as unknown as { __luminEmergeDone?: boolean }).__luminEmergeDone) onEmerge();
    else window.addEventListener("lumin:emergeDone", onEmerge, { once: true });
    return () => window.removeEventListener("lumin:emergeDone", onEmerge);
  }, []);

  useEffect(() => {
    const section = sectionRef.current!;
    let onMove: ((e: PointerEvent) => void) | null = null;
    const ctx = gsap.context(() => {
      // 1. frame scrub across the pinned walk (piecewise-shaped).
      // scrub: 0.6 eases progress toward the scroll position instead of
      // locking 1:1 — glides the 12fps frame steps and softens wheel jolts.
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        onUpdate: (self) => {
          progressRef.current = self.progress;
        },
      });

      // 1b. opening → journey bridge. The "Orb Stationary" idle loops on its
      // own. The "Orb Transition" clip does NOT autoplay and does NOT loop — it
      // is SCRUBBED by scroll (its playhead follows the scrollbar = "plays in
      // response to the parallax"). On the first ~360px: the stationary
      // crossfades to the (scrubbing) transition, the transition plays through
      // to its last frame as you scroll, then the whole idle layer clears to
      // hand off into the check-in. Reverses cleanly on scroll-up.
      const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "top+=300 top",
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress; // 0..1 over the opening window
          const stat = stationaryRef.current;
          const layer = transitionLayerRef.current;
          const idle = idleRef.current;
          if (!stat || !layer || !idle) return;
          // SMOOTH: scrub the transition's pre-sliced FRAMES with the scroll
          // (a canvas frame-swap — no video seeking, so no choppiness). Its
          // motion carries the orb → check-in as the parallax pull-in.
          transitionProgressRef.current = p;
          // brief blend from the looping orb into the transition's first frame…
          layer.style.opacity = String(c01(p / 0.1));
          stat.style.opacity = String(c01(1 - p / 0.12));
          // …then a DIRECT hand-off at the end: the transition's last frame IS
          // the check-in, so hard-cut to the journey (no fade "into the scene").
          idle.style.opacity = "1";
          idle.style.visibility = p >= 0.985 ? "hidden" : "visible";
        },
      });

      // 2. caption cycle — one scrubbed timeline; char cascades budgeted
      // inside each window so adjacent captions can never overlap
      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: 0.6 },
      });
      const captionEls = copyRef.current!.querySelectorAll<HTMLElement>("[data-caption]");
      captionEls.forEach((h, i) => {
        const chars = h.querySelectorAll(".split-char");
        const w = WINDOWS[i];
        gsap.set(chars, { opacity: 0 });
        const fit = (span: number) => ({
          duration: span * 0.45,
          each: (span * 0.55) / Math.max(chars.length - 1, 1),
        });
        const fin = fit(w.in[1] - w.in[0]);
        tl.to(chars, { opacity: 1, duration: fin.duration, stagger: fin.each, ease: "none" }, w.in[0]);
        if (w.out[0] <= 1) {
          const fout = fit(w.out[1] - w.out[0]);
          tl.to(chars, { opacity: 0, duration: fout.duration, stagger: { each: fout.each, from: "end" }, ease: "none" }, w.out[0]);
        }
        // gentle drift upward through the caption's life
        tl.fromTo(h, { y: 16 }, { y: -12, duration: (w.out[0] <= 1 ? w.out[1] : 1) - w.in[0], ease: "none" }, w.in[0]);
      });
      // Pin the scrubbed timeline's total length to 1.0 so window fractions map
      // linearly to scroll progress. Without this, the last caption's fade-out
      // position sets totalDuration (<1) and compresses every caption's timing.
      tl.to({}, { duration: 0, ease: "none" }, 1);

      // 3. scroll hint belongs to the HERO, not the page: hidden during the
      // white opening, fades in as the hero arrives, fades back out ~500px
      // into the pinned walk. (Opacity only — the cursor-follow owns the
      // transform.)
      gsap.set(indicatorRef.current, { opacity: 0 });
      gsap.to(indicatorRef.current, {
        opacity: 1,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top 70%", end: "top top", scrub: true },
      });
      gsap.fromTo(
        indicatorRef.current,
        { opacity: 1 },
        {
          opacity: 0,
          ease: "none",
          immediateRender: false,
          scrollTrigger: { trigger: section, start: "top+=350 top", end: "top+=850 top", scrub: true },
        }
      );

      // 4. (exit parallax removed — the bloom's settled sphere must scroll
      //    into the ecosystem beat at document rate, pixel-aligned with the
      //    beat's poster frame, or the match-cut seam breaks.)

      // 5. cursor-follow scroll hint (fine pointers only)
      const fine = window.matchMedia("(pointer: fine)").matches;
      const hint = indicatorRef.current;
      if (fine && hint) {
        gsap.set(hint, { left: 0, top: 0, xPercent: 0, yPercent: -50, x: 64, y: window.innerHeight * 0.45 });
        const xTo = gsap.quickTo(hint, "x", { duration: 0.22, ease: "power2.out" });
        const yTo = gsap.quickTo(hint, "y", { duration: 0.22, ease: "power2.out" });
        onMove = (e: PointerEvent) => { xTo(e.clientX + 16); yTo(e.clientY); };
        section.addEventListener("pointermove", onMove);
      }
    }, section);

    // 4. THE GATE. Mounted after the scrubbed rig above, deliberately: the gate
    //    animates SCROLL rather than frames, so every rule built above keeps
    //    driving itself off its own ScrollTrigger with nothing to keep in sync.
    const gate = createBeatGate({
      section,
      stops: STOPS,
      durations: DURATIONS,
      onSettle: (i) => { setStopIdx(i); setStalled(false); },
      onTravel: () => setStopIdx(-1),
      // Refuse to step into footage the browser has not decoded. 478 frames is
      // ~33MB; a gated hop demands 65 of them at 24fps the instant you gesture,
      // where free scrubbing used to give the loader time to keep up. Without
      // this the journey plays to a blank canvas — scenes "cut out".
      canAdvance: (to) => Math.ceil(STOPS[to] * LAST) + 8 <= framesReady.current,
      onStall: () => setStalled(true),
    });

    return () => {
      gate.destroy();
      if (onMove) section.removeEventListener("pointermove", onMove);
      ctx.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[500vh]" style={{ background: "var(--c-cosmos)" }}>
      {/* sticky media layer */}
      <div className="sticky top-0 h-screen overflow-clip">
        <div ref={canvasWrapRef} className="absolute inset-0">
          <FrameScrubber
            key={variant}
            progressRef={progressRef}
            frameCount={FRAME_COUNT}
            frameUrls={frameUrls(variant)}
            fit="cover"
            readyRef={framesReady}
          />
        </div>

        {/* opening idle. "Orb Stationary" loops here (revealed when the loader's
            "Orb Emerge" lifts); "Orb Transition" sits above it, hidden, and is
            crossfaded in on first scroll (see the openTl timeline) to bridge into
            the journey. Both fade out with this layer to reveal the check-in. */}
        <div ref={idleRef} className="absolute inset-0 z-[3]" style={{ background: "#050508" }}>
          <video
            ref={stationaryRef}
            src="/media/orb-stationary.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: 1 }}
          />
          {/* transition = pre-sliced frames, scrubbed by scroll (smooth) */}
          <div ref={transitionLayerRef} className="absolute inset-0" style={{ opacity: 0 }}>
            <FrameScrubber
              progressRef={transitionProgressRef}
              frameCount={TRANSITION_FRAMES}
              frameUrls={transitionUrls}
              fit="cover"
            />
          </div>
        </div>
        {/* ── SCENE LINKS ────────────────────────────────────────────────
               One product marker per scene, anchored to a measured quiet spot
               in that shot. Only the current scene's marker is mounted, and
               only once the beat has SETTLED — while travelling, `stopIdx` is -1
               and nothing shows, so a marker never drifts across a moving
               frame. The hold is unlimited, so there is always time to click. */}
        {vp.w > 0 && stopIdx >= 1 && SCENE_LINKS[stopIdx - 1] && (() => {
          const link = SCENE_LINKS[stopIdx - 1];
          const pt = coverPoint(vp.w, vp.h, link.x, link.y);
          const flip = link.x > SRC_W * 0.72;   // near the right edge → label inboard
          return (
            <div
              key={link.beat}
              className="absolute z-[4]"
              style={{
                left: pt.left, top: pt.top,
                transform: "translate(-50%,-50%)",
                animation: "heroLinkIn 0.7s cubic-bezier(.16,.84,.44,1) both",
              }}
            >
              <a
                href={`#product-${link.product.toLowerCase()}`}
                className="group flex items-center gap-3"
                style={{ flexDirection: flip ? "row-reverse" : "row" }}
              >
                {/* the node — same ring language as the launchpad's row dots */}
                <span className="relative grid h-[13px] w-[13px] shrink-0 place-items-center">
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{ border: "1.5px solid rgba(255,255,255,0.9)" }}
                  />
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "var(--c-supernova)",
                      animation: "heroLinkPulse 2.4s ease-out infinite",
                    }}
                  />
                </span>
                {/* hairline, drawn from the node toward the label */}
                <span
                  className="h-px w-8 shrink-0"
                  style={{
                    background: flip
                      ? "linear-gradient(270deg, rgba(255,255,255,0.85), rgba(255,255,255,0))"
                      : "linear-gradient(90deg, rgba(255,255,255,0.85), rgba(255,255,255,0))",
                  }}
                />
                <span
                  className="font-nav whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white transition-all group-hover:tracking-[0.28em]"
                  style={{
                    background: "rgba(10,12,20,0.42)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
                    textShadow: "0 1px 14px rgba(0,0,0,0.7)",
                  }}
                >
                  {link.product} by Lumin
                </span>
              </a>
            </div>
          );
        })()}

        {/* legibility scrim for the lower caption band */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0) 20%, rgba(10,10,15,0) 58%, rgba(10,10,15,0.5) 100%)" }}
        />
      </div>

      {/* sticky caption layer — one short line per beat, lower third */}
      <div ref={copyRef} className="pointer-events-none sticky top-0 z-[2] -mt-[100vh] h-screen">
        {JOURNEY.beats.map((b, i) => (
          <h2
            key={b.id}
            data-caption
            className="type-step absolute inset-x-0 mx-auto max-w-[46rem] px-6 text-center text-white"
            style={{
              top: "68vh",
              textShadow: "0 2px 24px rgba(10,10,15,0.75), 0 1px 4px rgba(10,10,15,0.6)",
            }}
          >
            <SplitChars lines={[b.caption]} />
          </h2>
        ))}
      </div>

      {/* cursor-following scroll hint — gated so it only appears AFTER the
          opening (orb-emerge loader lifted, openingDone); the scroll-driven
          opacity/cursor-follow live on the inner element. */}
      <div style={{ opacity: openingDone ? 1 : 0, transition: "opacity 0.7s ease" }}>
        <div
          ref={indicatorRef}
          className="font-nav fixed left-[var(--container-pad)] top-[45vh] z-20 text-[11px] font-semibold uppercase tracking-[0.3em]"
          style={{ mixBlendMode: "difference", color: "#fff" }}
        >
          {HERO.indicator}
        </div>
      </div>
    </section>
  );
}
