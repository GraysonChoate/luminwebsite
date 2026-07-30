"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { HERO, JOURNEY } from "@/lib/copy";
import SplitChars from "@/components/ui/SplitChars";
import FrameScrubber from "@/components/ui/FrameScrubber";
import { createSceneStepper } from "@/lib/sceneStepper";

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
/** 640px copies of the same strip — 7MB against the full strip's 30MB */
const proxyUrls = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `/frames/journey/desktop-proxy/f_${String(i + 1).padStart(3, "0")}.webp`,
);

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

/* ── SCENE LINKS ──────────────────────────────────────────────────────────
   Each link is pinned to the ACTUAL OBJECT it represents, not to whatever
   corner happened to be empty. Node coordinates were read off the dwell frame
   with a source-space grid, so they land on the thing itself:

     Loops     the check-in tablet on the reception counter
     Connect   the iMac she is working on
     Trainer   the tablet in the coach's hands
     Companion the selectorised machine
     Station   the Station screen
     Studio    the class screen on the wall
     Fuel      the phone
     Market    the supplements on the counter

   `label` is offset from the node into nearby negative space and joined by an
   elbow hairline — the Mass-Effect callout read, where the brief hangs off the
   object rather than covering it. Offsets are per-link because the empty space
   is in a different direction in every shot.

   `from`/`to` are the frames the callout is ON SCREEN for — the lit part of
   that scene, clear of both dissolves. Visibility is driven by the FRAME, not
   by the catch: tying it to the catch meant the link vanished the moment you
   scrolled back, because a catch only fires going forward. The product belongs
   to the scene, so it shows whenever that scene is on screen, either direction.

   ONE CATCH PER PRODUCT. Scroll scrubs the film freely; the page only takes
   over at these eight frames, where the object is unambiguously in shot. The
   callout exists only while caught, so a link can never appear over the wrong
   scene. `frame` is the caught frame — Loops is 54 (not 41) because at 41 he is
   still walking and the check-in kiosk is not yet readable. */
const SRC_W = 1920, SRC_H = 1080;
const SCENE_LINKS = [
  { product: "Loops",     frame:  54, x:  948, y: 516, vx:   7.1, vy:  6.0, dx:  178, dy: -128 },
  { product: "Connect",   frame: 107, x:  807, y: 378, vx:   3.1, vy:  1.8, dx:  174, dy: -142 },
  { product: "Trainer",   frame: 178, x:  990, y: 436, vx:   1.7, vy: -0.9, dx:  186, dy: -150 },
  { product: "Companion", frame: 240, x:  276, y: 600, vx: -17.3, vy:  4.0, dx:  186, dy: -232 },
  { product: "Station",   frame: 304, x:  919, y: 429, vx:   9.2, vy:  0.7, dx: -236, dy: -152 },
  { product: "Studio",    frame: 368, x: 1356, y: 374, vx:  19.1, vy: -4.4, dx: -224, dy: -104 },
  { product: "Fuel",      frame: 430, x:  940, y: 540, vx:   3.9, vy: -2.4, dx: -204, dy: -184 },
  { product: "Market",    frame: 458, x:  960, y: 550, vx:  13.7, vy:  6.6, dx: -214, dy: -192 },
];

/* ── THE CALLOUT FOLLOWS THE OBJECT ───────────────────────────────────────
   The camera moves, so the thing a link points at moves with it. A fixed
   coordinate is only right on the catch frame; a few frames either side the
   node has slid off and the callout looks like it came from nowhere — worst on
   Studio, Station and Fuel, exactly the three that were reported.

   `vx`/`vy` are how far that object actually travels per frame, measured by
   template-matching the object across ±10 frames around its catch. Studio
   moves 19px a frame, Companion −17px. The node is placed by extrapolating
   along that line from the catch, so it stays on the object as the shot moves. */
function linkAt(link: (typeof SCENE_LINKS)[number], frame: number) {
  const d = frame - link.frame;
  return { x: link.x + link.vx * d, y: link.y + link.vy * d };
}

/** map a source-space point to screen, matching object-fit: cover */
function coverPoint(vw: number, vh: number, sx: number, sy: number) {
  const scale = Math.max(vw / SRC_W, vh / SRC_H);
  return {
    left: (vw - SRC_W * scale) / 2 + sx * scale,
    top: (vh - SRC_H * scale) / 2 + sy * scale,
    scale,
  };
}

/** the eight catch points, in section-progress space */
const ANCHORS = SCENE_LINKS.map((s) => s.frame / LAST);
/** fetch the caught frames at full resolution first — a hold is never soft.
 *  A couple either side too, so easing into the catch is crisp as well. */
const PRIORITY = SCENE_LINKS.flatMap((s) => [s.frame - 2, s.frame - 1, s.frame, s.frame + 1])
  .filter((f) => f >= 0 && f <= LAST);

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
  /** which product we are STOPPED on; -1 whenever the film is moving.
   *  Set by the stepper on arrival — never by how close the frame happens to
   *  be to an anchor, which is what used to slide it into shot early.
   *  NOT named `stop` — that resolves to the global `window.stop`. */
  const [sceneIdx, setSceneIdx] = useState(-1);
  /** parked at a product and waiting to be asked to move on */
  const [resting, setResting] = useState(false);
  /** the frame the callout is pinned to */
  const frameRef = useRef(0);
  /* The 60fps re-render loop that used to live here is GONE. It existed to keep
     the callout glued to a moving object; the callout now only exists while the
     film is stopped, so there is nothing to track and forcing a React render
     every frame was pure cost on the section that could least afford it. */
  const [vp, setVp] = useState({ w: 0, h: 0 });
  /** MEMOISED, and it matters enormously. This was built inline in the JSX, so
   *  every render produced a NEW array — which is a new dependency for the
   *  scrubber's loading effect, which restarted the whole download. With the
   *  callout tracking at 60fps that meant re-fetching 478 frames continuously:
   *  measured 86MB of journey frames pulled for a 30MB strip, and 270MB across
   *  a single walkthrough. That is the weight that was being felt. */
  const journeyUrls = useMemo(() => frameUrls(variant), [variant]);
  /** frames decoded so far — kept for the scrubber's readiness reporting */
  const framesReady = useRef(0);

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
      // 0.18, not 0.6. The long ease existed to smooth raw wheel jolts, but
      // scroll is no longer raw — the stepper drives it with an eased tween, so
      // the smoothing is already done upstream and all a big scrub adds is lag.
      // At 0.6 the picture was still drifting for half a second after the
      // scroll had stopped, which is the opposite of the hard stop the product
      // moments need.
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.18,
        onUpdate: (self) => {
          progressRef.current = self.progress;
          frameRef.current = self.progress * LAST;
          // NOTE: the callout is NOT chosen here any more. It used to appear
          // whenever the frame came within LINK_SPAN of an anchor, which meant
          // it drifted into shot while the film was still travelling. The
          // stepper decides now, on arrival.
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

    // 4. THE STEPPER. Mounted after the scrubbed rig above, deliberately: it
    //    animates SCROLL rather than frames, so every rule built above keeps
    //    driving itself off its own ScrollTrigger with nothing to keep in sync.
    //    One gesture = one scene, at a fixed tempo, full stop at the product.
    //    See lib/sceneStepper.ts for why nothing is allowed to accumulate.
    const stepper = createSceneStepper({
      section,
      anchors: ANCHORS,
      // The callout is bound to ARRIVAL, not to the frame being nearby. Driving
      // it off frame proximity is what made it slide into shot ahead of the
      // stop; now it appears at the freeze and nowhere else.
      onDepart: () => { setSceneIdx(-1); setResting(false); },
      onArrive: (i) => { setSceneIdx(i); setResting(true); },
      onExit: () => { setSceneIdx(-1); setResting(false); },
    });

    return () => {
      stepper.destroy();
      if (onMove) section.removeEventListener("pointermove", onMove);
      ctx.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} data-nav-tone="dark" className="relative h-[500vh]" style={{ background: "var(--c-cosmos)" }}>
      {/* sticky media layer */}
      <div className="sticky top-0 h-screen overflow-clip">
        <div ref={canvasWrapRef} className="absolute inset-0">
          <FrameScrubber
            key={variant}
            progressRef={progressRef}
            frameCount={FRAME_COUNT}
            frameUrls={journeyUrls}
            fit="cover"
            readyRef={framesReady}
            proxyUrls={variant === "desktop" ? proxyUrls : undefined}
            priority={PRIORITY}
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
               A callout pinned to the object, not a chip in a corner. The node
               sits ON the thing; an elbow hairline runs out to a bracketed
               brief in nearby negative space. It is mounted for its SCENE, so
               it is there in both directions and never appears over another
               shot; the catch holds you on it long enough to click. */}
        {vp.w > 0 && sceneIdx >= 0 && SCENE_LINKS[sceneIdx] && (() => {
          const link = SCENE_LINKS[sceneIdx];
          const tracked = linkAt(link, frameRef.current);
          const pt = coverPoint(vp.w, vp.h, tracked.x, tracked.y);
          const lx = pt.left + link.dx * pt.scale;
          const ly = pt.top + link.dy * pt.scale;
          const leftward = link.dx < 0;
          return (
            <div key={link.product} className="pointer-events-none absolute inset-0 z-[4]">
              <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                {/* elbow: out from the object, then a level run to the brief */}
                <polyline
                  points={`${pt.left},${pt.top} ${lx},${ly} ${lx + (leftward ? -26 : 26)},${ly}`}
                  fill="none" stroke="rgba(150,200,255,0.75)" strokeWidth="1"
                  style={{ filter: "drop-shadow(0 0 6px rgba(90,150,255,0.9))" }}
                  className="hero-cue-line"
                />
                <circle cx={pt.left} cy={pt.top} r="4.5" fill="none" stroke="#cfe2ff" strokeWidth="1.4" />
                <circle cx={pt.left} cy={pt.top} r="3" fill="var(--c-supernova)" className="hero-cue-core" />
              </svg>
              <a
                href={`#product-${link.product.toLowerCase()}`}
                className="hero-brief pointer-events-auto absolute"
                // which side of the node it hangs off — the pop scales out from
                // the node's side, so it reads as coming OUT of the object
                data-side={leftward ? "l" : "r"}
                style={{
                  left: lx + (leftward ? -26 : 26),
                  top: ly,
                  transform: `translateY(-50%)${leftward ? " translateX(-100%)" : ""}`,
                }}
              >
                <span className="hero-brief-tag">Lumin</span>
                <span className="hero-brief-name">{link.product}</span>
                <span className="hero-brief-go" aria-hidden="true">›</span>
              </a>
            </div>
          );
        })()}

        {/* ── SCROLL TO CONTINUE ──────────────────────────────────────────
               Only while parked on a product. The film will not move until it
               is asked to, so the ask has to be on screen — without it a full
               stop is indistinguishable from a page that has frozen. It sits
               under the caption band, out of the callout's way. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[5vh] z-[6] flex justify-center"
          style={{
            opacity: resting ? 1 : 0,
            transform: resting ? "translateY(0)" : "translateY(8px)",
            transition: "opacity .45s ease, transform .45s ease",
          }}
          aria-hidden={!resting}
        >
          <span className="hero-continue font-nav">
            Scroll to continue
            <i className="hero-continue-chev" aria-hidden="true" />
          </span>
        </div>

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
