"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { getLenis } from "@/components/SmoothScroll";
import FrameScrubber from "@/components/ui/FrameScrubber";

/**
 * Product Ecosystem — the hero's continuation, not a new place.
 *
 * ── THE HANDOFF ──────────────────────────────────────────────────────────
 * A sticky full-bleed stage has THREE distinct scroll landmarks, not one, and
 * getting this seam right means controlling all three:
 *
 *   REVEAL   sectionTop - vh   the stage starts sliding up into view
 *   PIN      sectionTop        it reaches the top and locks
 *   RELEASE  sectionBottom-vh  it unsticks and slides away
 *
 * The hero is h-[500vh] with a sticky 100vh child, so it RELEASES 400vh in — a
 * full viewport before its section ends. Two separate defects follow, and each
 * needs its own fix:
 *
 *  1. GAP. Without `-mt-[100vh]` our PIN lands 100vh after the hero's RELEASE,
 *     so for a viewport neither is pinned and both frames slide past each
 *     other — a hard content edge and two light beams on screen at once.
 *     The margin lands our PIN exactly on the hero's RELEASE.
 *
 *  2. OVERLAP. That same margin drags our REVEAL up by 100vh too, so the
 *     stage would start covering the hero's bottom a full viewport EARLY,
 *     eating the last of the journey behind a black band. So the stage — and
 *     the section's own background — stay INVISIBLE until the section is
 *     actually pinned. Between REVEAL and PIN this section contributes
 *     nothing to the picture; the hero owns the frame outright.
 *
 * Because the switch happens on the exact pixel where the hero's last journey
 * frame and our first descent frame coincide (0.32% mean-abs-diff, both
 * near-black), flipping visibility in a single frame is invisible.
 *
 * (The old EcosystemBeat wanted the gap — it match-cut into a static poster.
 * This one must not have it.)
 *
 * ── ONE SCRUBBABLE STRIP ─────────────────────────────────────────────────
 * Descent (144) + activation (145) = 289 frames in a single FrameScrubber.
 * The activation used to be a <video> played at the gate, which meant there
 * were no frames to run BACKWARD — scrolling back could only crossfade out.
 * As frames, the whole chain scrubs identically in both directions, and the
 * reverse is exactly as smooth as the way in. It also drops the autoplay
 * permission problem entirely: nothing depends on the browser letting us play.
 *
 * At the gate we don't play a video, we ANIMATE THE SCROLL POSITION through
 * the activation band at the clip's authored pace (6.04s, linear = its native
 * 24fps) while scroll input is refused. Same choreography, one less layer, and
 * the visitor lands at the far side of the band rather than at its start.
 *
 * ── ANCHORING ────────────────────────────────────────────────────────────
 * That landing is what anchors them. Backing out of the lit hub means
 * scrubbing ~151vh of activation in reverse, so a flick can't dump you back
 * into the gym. Forward is a soft ~99vh dwell they can leave whenever. The
 * hard lock exists only for the 6s activation — a beat, not a trap: Escape
 * breaks it, and a hard ceiling guarantees it cannot outlive the clip.
 */

const DESCENT_FRAMES = 144;
const ACTIVATION_FRAMES = 145;
const TOTAL_FRAMES = DESCENT_FRAMES + ACTIVATION_FRAMES; // 289
const LAST = TOTAL_FRAMES - 1;

const chainUrls = [
  ...Array.from({ length: DESCENT_FRAMES }, (_, i) => `/frames/descent/f_${String(i + 1).padStart(3, "0")}.webp`),
  ...Array.from({ length: ACTIVATION_FRAMES }, (_, i) => `/frames/activation/f_${String(i + 1).padStart(3, "0")}.webp`),
];

/** section progress at which the frame strip is exhausted; the rest is dwell */
const BAND_END = 0.7525;
/** section progress where the descent ends and the activation begins */
const GATE_AT = ((DESCENT_FRAMES - 1) / LAST) * BAND_END; // ≈ 0.3736
/** the activation's authored length — the gated scroll takes exactly this long */
const ACTIVATION_S = 6.0417;
/** scroll span over which the living hub dissolves in/out of the last frame */
const IDLE_FADE = 0.038; // ≈ 15vh — a dissolve in both directions
/** post-activation hold so the release doesn't feel abrupt */
const HOLD_MS = 700;
/** the lock can never outlive this, whatever else happens */
const LOCK_CEILING_MS = 9000;

const CUE = "Scroll to continue the journey";

const SCROLL_KEYS = new Set([
  "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar",
]);

const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export default function EcosystemSequence() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameProgress = useRef(0);
  const idleARef = useRef<HTMLVideoElement>(null);
  const idleBRef = useRef<HTMLVideoElement>(null);
  const idleLayerRef = useRef<HTMLDivElement>(null);

  /** the activation has been played once — never replays, never re-locks */
  const activatedRef = useRef(false);
  const lockedRef = useRef(false);
  const idleLitRef = useRef(false);
  const cueRef = useRef(false);

  const [cueOn, setCueOn] = useState(false);

  useEffect(() => {
    const section = sectionRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ceilingTimer: number | undefined;
    let cueTimer: number | undefined;
    let gateTween: gsap.core.Tween | null = null;
    let pinnedTo = 0;

    /** setState only on a real change — this runs from a scroll handler */
    const setCue = (on: boolean) => {
      if (cueRef.current === on) return;
      cueRef.current = on;
      setCueOn(on);
    };

    const blockWheel = (ev: Event) => ev.preventDefault();
    const blockKeys = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") { gateTween?.progress(1); return; } // never trap a keyboard user
      if (SCROLL_KEYS.has(ev.key)) ev.preventDefault();
    };
    // Lenis being stopped does NOT stop a scrollbar drag, so hold the position
    // natively too. `pinnedTo` is advanced by the gate tween as it plays.
    const holdScroll = () => { if (window.scrollY !== pinnedTo) window.scrollTo(0, pinnedTo); };

    /** the living hub fades in over the strip's last frame, and back out of it
     *  going the other way — one scroll-driven rule, so both directions match */
    function paintIdle(p: number) {
      const idle = idleLayerRef.current;
      if (!idle) return;
      const o = c01((p - (BAND_END - IDLE_FADE)) / IDLE_FADE);
      idle.style.opacity = String(o);
      if (o > 0 && !idleLitRef.current) {
        idleLitRef.current = true;
        idleARef.current?.play().catch(() => {});
      } else if (o === 0 && idleLitRef.current) {
        idleLitRef.current = false;
        idleARef.current?.pause();
        idleBRef.current?.pause();
      }
    }

    function unlock() {
      if (!lockedRef.current) return;
      lockedRef.current = false;
      window.clearTimeout(ceilingTimer);
      window.removeEventListener("wheel", blockWheel);
      window.removeEventListener("touchmove", blockWheel);
      window.removeEventListener("keydown", blockKeys);
      window.removeEventListener("scroll", holdScroll);
      getLenis()?.start();
      cueTimer = window.setTimeout(() => setCue(true), 1400);
    }

    function fireGate(gateY: number) {
      if (activatedRef.current) return;
      activatedRef.current = true;

      const pinned = section.offsetHeight - window.innerHeight;
      const bandEndY = Math.round(gateY + pinned * (BAND_END - GATE_AT));

      if (reduced) { // no lock and no auto-motion — just put them at the hub
        const lenis = getLenis();
        lenis?.scrollTo(bandEndY, { immediate: true, force: true });
        setCue(true);
        return;
      }

      // Snap to the TRUE gate position — a fast flick can carry past the
      // trigger before we stop. `force` works while Lenis is stopped.
      pinnedTo = Math.round(gateY);
      lockedRef.current = true;
      const lenis = getLenis();
      lenis?.scrollTo(pinnedTo, { immediate: true, force: true });
      lenis?.stop();
      window.addEventListener("wheel", blockWheel, { passive: false });
      window.addEventListener("touchmove", blockWheel, { passive: false });
      window.addEventListener("keydown", blockKeys);
      window.addEventListener("scroll", holdScroll);
      ceilingTimer = window.setTimeout(() => gateTween?.progress(1), LOCK_CEILING_MS);

      // Walk the scroll through the activation band at the clip's authored
      // pace. `none` easing over 6.0417s across 145 frames IS its native 24fps.
      // Driving SCROLL (rather than the frame index directly) means the frame
      // strip and the idle crossfade both stay on their normal scroll rules —
      // no second code path to keep in sync, and we land at bandEndY so the
      // reverse has the whole band to travel back through.
      const from = { y: pinnedTo };
      gateTween = gsap.to(from, {
        y: bandEndY,
        duration: ACTIVATION_S,
        ease: "none",
        onUpdate: () => {
          pinnedTo = Math.round(from.y);
          window.scrollTo(0, pinnedTo);
          ScrollTrigger.update(); // Lenis is stopped, so drive the update ourselves
        },
        onComplete: () => { window.setTimeout(unlock, HOLD_MS); },
      });
    }

    /** Show this section ONLY once it is pinned or past — never during the
     *  slide-up between REVEAL and PIN, where it would band over the hero.
     *  The section's own background is gated with it, or a dark rectangle
     *  would climb the screen even with the stage hidden. Past the pin we
     *  stay visible: the release-side slide-out IS the exit, and the section
     *  background has to fill behind the rising stage. */
    function paintStage() {
      const stage = stageRef.current;
      if (!stage) return;
      const armed = section.getBoundingClientRect().top <= 0;
      stage.style.visibility = armed ? "visible" : "hidden";
      section.style.background = armed ? "#050508" : "transparent";
    }

    const ctx = gsap.context(() => {
      // 0. entry guard — spans the whole time the section touches the
      //    viewport, so it covers the approach that trigger 1 never sees.
      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        onUpdate: paintStage,
        onRefresh: paintStage,
        onToggle: paintStage,
      });

      // 1. the chain — section progress 0→BAND_END remapped across all 289
      //    frames. scrub: 0.6 matches the hero, so the mechanic is identical
      //    on the way in AND on the way back out.
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        onUpdate: (self) => {
          const p = self.progress;
          frameProgress.current = c01(p / BAND_END);
          paintIdle(p);
          // The cue belongs to the dwell only — not while they're scrubbing
          // back through the activation, and not once they've acted on it.
          setCue(!lockedRef.current && activatedRef.current && p >= BAND_END - IDLE_FADE && p < BAND_END + 0.06);
        },
      });

      // 2. the gate — its OWN un-scrubbed trigger so it fires on true scroll
      //    position, not the eased scrub value. `self.start` IS the gate Y.
      ScrollTrigger.create({
        trigger: section,
        start: () => `top top-=${(section.offsetHeight - window.innerHeight) * GATE_AT}`,
        onEnter: (self) => fireGate(self.start),
      });

      // 3. the idle clips are small but pointless to fetch early; give them
      //    plenty of lead time without competing with the hero's frames.
      ScrollTrigger.create({
        trigger: section,
        start: "top bottom+=150%",
        once: true,
        onEnter: () => {
          [idleARef, idleBRef].forEach((r) => {
            const v = r.current;
            if (v) { v.preload = "auto"; v.load(); }
          });
        },
      });
    }, section);

    return () => {
      ctx.revert();
      gateTween?.kill();
      [ceilingTimer, cueTimer].forEach(window.clearTimeout);
      if (lockedRef.current) {
        lockedRef.current = false;
        getLenis()?.start();
        window.removeEventListener("wheel", blockWheel);
        window.removeEventListener("touchmove", blockWheel);
        window.removeEventListener("keydown", blockKeys);
        window.removeEventListener("scroll", holdScroll);
      }
    };
  }, []);

  /* ------------------------------------------------- idle double-buffer */
  // Two copies of the clip offset by the fade. While one ends the other has
  // already restarted on top and fades in. ONLY THE TOP LAYER FADES — if both
  // faded the composite would sum to 0.75 at the midpoint and dip 25% darker
  // every loop. (Ported from public/eco/hub/idle-loop.html.)
  useEffect(() => {
    const a = idleARef.current;
    const b = idleBRef.current;
    if (!a || !b) return;
    const FADE = 0.6;
    let front = a, back = b, armed = false, raf = 0;

    const tick = () => {
      const d = front.duration;
      if (d && !front.paused && front.currentTime >= d - FADE && !armed) {
        armed = true;
        back.style.zIndex = "2";
        front.style.zIndex = "1";
        back.style.transition = "none";
        back.style.opacity = "0";
        back.currentTime = 0;
        back.play().catch(() => {});
        requestAnimationFrame(() => {           // let opacity:0 commit first
          back.style.transition = `opacity ${FADE}s linear`;
          back.style.opacity = "1";
        });
        window.setTimeout(() => {
          front.pause();
          front.style.transition = "none";
          front.style.opacity = "0";            // hidden beneath the top layer
          const t = front; front = back; back = t;
          armed = false;
        }, FADE * 1000);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    // -mt-[100vh] closes the hero's un-pinned dead zone — see the header note.
    // `isolate` keeps our layer stack from tangling with the hero's z-indexed
    // children, which share the root stacking context.
    <section
      ref={sectionRef}
      className="relative isolate z-10 -mt-[100vh] h-[500vh]"
      // both start invisible: at load we are in the approach, and paintStage
      // arms them the moment the section pins. See the header note.
      style={{ background: "transparent" }}
      aria-label="The Lumin product ecosystem"
    >
      <div
        ref={stageRef}
        className="sticky top-0 h-screen overflow-clip"
        style={{ background: "#050508", visibility: "hidden" }}
      >
        {/* the whole chain: descent → activation, one strip, both directions.
            `cover` matches the hero exactly; any other fit would resize the
            image across an otherwise invisible seam. */}
        <div className="absolute inset-0">
          <FrameScrubber
            progressRef={frameProgress}
            frameCount={TOTAL_FRAMES}
            frameUrls={chainUrls}
            fit="cover"
          />
        </div>

        {/* the living hub, double-buffered — dissolves in over the strip's
            last frame and back out of it on the way up */}
        <div ref={idleLayerRef} className="absolute inset-0 z-[2]" style={{ opacity: 0 }}>
          <video
            ref={idleARef}
            muted playsInline preload="none"
            poster="/eco/hub/eco-idle-hologram-poster.jpg"
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src="/eco/hub/eco-idle-hologram.webm" type="video/webm" />
            <source src="/eco/hub/eco-idle-hologram.mp4" type="video/mp4" />
          </video>
          <video
            ref={idleBRef}
            muted playsInline preload="none"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: 0 }}
          >
            <source src="/eco/hub/eco-idle-hologram.webm" type="video/webm" />
            <source src="/eco/hub/eco-idle-hologram.mp4" type="video/mp4" />
          </video>
        </div>

        {/* the exit cue. Scroll stays the way forward, so this reads as an
            invitation, not an instruction; it appears only once they're free. */}
        <div
          className="font-nav pointer-events-none absolute inset-x-0 bottom-10 z-[3] text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-white"
          style={{
            opacity: cueOn ? 0.75 : 0,
            transition: "opacity 0.8s ease",
            textShadow: "0 2px 24px rgba(10,10,15,0.8)",
          }}
        >
          {CUE}
        </div>
      </div>
    </section>
  );
}
