"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { getLenis } from "@/components/SmoothScroll";
import { createScrubCatch } from "@/lib/beatGate";
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
 * into the gym. Forward is a short ~25vh dwell and then they are gone — scroll
 * activates the beat and they have to watch it, but it never becomes a wall
 * they have to grind through afterwards. The
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

/** section progress at which the frame strip is exhausted; the rest is dwell.
 *  ── SIZED SO THE DWELL ISN'T A WALL ──────────────────────────────────────
 *  The strip is worth 301vh of scroll (289 frames). The section used to be
 *  500vh, i.e. a 400vh pinned span, which left 0.2475 × 400 = 99vh of dwell —
 *  a FULL VIEWPORT of scrolling after the last frame where nothing changes.
 *  That reads as being stuck against the animation rather than passing it.
 *  At 426vh the pinned span is 326vh: the strip still gets its same 301vh, so
 *  the descent, the gated activation and the reverse-out all scrub at exactly
 *  the rate they were approved at, and the dead tail drops to ~25vh. Change
 *  the section height and this fraction together, or the pacing moves. */
const BAND_END = 301 / 326; // ≈ 0.9233 of a 326vh pinned span
/** section progress where the descent ends and the activation begins */
const GATE_AT = ((DESCENT_FRAMES - 1) / LAST) * BAND_END; // ≈ 0.3736
/** the activation's authored length — the gated scroll takes exactly this long */
const ACTIVATION_S = 6.0417;
/** scroll span over which the living hub dissolves in/out of the last frame */
const IDLE_FADE = 15 / 326; // ≈ 15vh — a dissolve in both directions
/** post-activation hold so the release doesn't feel abrupt */
const HOLD_MS = 700;
/** the descent's authored length — 144 frames at 24fps */
const DESCENT_S = 6.0417;
/** how long "Product Suites" sits on the plate before the hub takes over */
/** The descent in two gestures: start, halfway, orb at rest. */
const DESCENT_STEPS = [0, 0.5, 1].map((f) => f * GATE_AT);
/** the void's mapping transition occupies its first 134 of 585 frames */
const VOID_MAPPING_END = 134 / 585;
/** the eco→void transition's authored length, played not scrubbed */
const TRANSITION_S = 5.6;
/** the lock can never outlive this, whatever else happens */
const LOCK_CEILING_MS = 9000;

/** Idle-state exit controls. Scroll used to be the only way out of the lit hub,
 *  and backing out meant scrubbing ~151vh of activation in reverse — deliberate
 *  anchoring, but it made intentional movement feel like forcing the page.
 *  Buttons replace that: an explicit way forward and an explicit way back.
 *  LEFT is "go back" and RIGHT is "continue" per direction given. */
const BACK_LABEL = "Go back";
const FORWARD_LABEL = "Continue journey";
/** the embedded link that appears once the orb is at rest in the floor */
const SUITES_LABEL = "Activate ecosystem";

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
  const suitesRef = useRef(false);
  /** the activation has finished and the hub is the terminal state */
  const settledRef = useRef(false);

  const [cueOn, setCueOn] = useState(false);
  const [suitesOn, setSuitesOn] = useState(false);
  const navRef = useRef<{ goForward: () => void; goBack: () => void; activate: () => void } | null>(null);
  /** the section currently owns the screen and all input */
  const heldRef = useRef(false);
  /** a descent step is mid-flight */
  const travellingRef = useRef(false);
  /** which descent step we are parked on */
  const stepRef = useRef(0);
  /** a button is taking us out — do not re-seize on the way */
  const exitingRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ceilingTimer: number | undefined;
    let cueTimer: number | undefined;
    let gateTween: gsap.core.Tween | null = null;
    let descentGate: ReturnType<typeof createScrubCatch> | null = null;
    let handoff: number | undefined;
    let pinnedTo = 0;

    /** setState only on a real change — this runs from a scroll handler */
    const setCue = (on: boolean) => {
      if (cueRef.current === on) return;
      cueRef.current = on;
      setCueOn(on);
    };
    /** the descent has landed but the activation has not fired yet */
    const setSuites = (on: boolean) => {
      if (suitesRef.current === on) return;
      suitesRef.current = on;
      setSuitesOn(on);
    };

    const blockWheel = (ev: Event) => ev.preventDefault();
    /** Wheel/touch only ever ADVANCE the descent; they never move the page.
     *  ONE FLICK IS ONE STEP. A time debounce is not enough — a trackpad flick
     *  runs 2.5s and would clear a 700ms debounce three times over, putting the
     *  orb in the ground in a single swipe. Same test the journey uses: the
     *  wheel has to fall silent, and then a real push has to arrive. */
    let gestureArmed = true;
    let quietTimer: number | undefined;
    let rearmAt = 0;
    const onGesture = (ev: Event) => {
      if (!heldRef.current) return;
      const now = performance.now();
      // Arm on silence OR on elapsed time. Silence alone froze the descent for
      // anyone who never stops scrolling, and a delta threshold froze it for
      // anyone scrolling gently — a trackpad emits deltas far below 20 when you
      // move slowly. Either condition re-arms, so nothing can jam it.
      if (now >= rearmAt) gestureArmed = true;
      if (gestureArmed && Math.abs((ev as WheelEvent).deltaY ?? 999) >= 4) {
        gestureArmed = false;
        rearmAt = now + 900;
        stepDescent();
      }
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(() => { gestureArmed = true; }, 420);
    };
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

    /** forward: leave the lit hub for the white void. RELEASE is the last
     *  scroll position this section owns, so one tween lands us on the void's
     *  PIN with no reverse scrub in between. */
    /** Capture the section. Idempotent — safe to call from any trigger. */
    function seize() {
      if (heldRef.current || exitingRef.current) return;
      heldRef.current = true;
      const pinned = section.offsetHeight - window.innerHeight;
      // snap to wherever we are in the descent, rounded back to a known step
      pinnedTo = Math.round(section.offsetTop + pinned * DESCENT_STEPS[stepRef.current]);
      const lenis = getLenis();
      lenis?.scrollTo(pinnedTo, { immediate: true, force: true });
      lenis?.stop();
      window.scrollTo(0, pinnedTo);
      ScrollTrigger.update();
      window.addEventListener("wheel", blockWheel, { passive: false });
      window.addEventListener("touchmove", blockWheel, { passive: false });
      window.addEventListener("keydown", blockKeys);
      window.addEventListener("scroll", holdScroll);
      window.addEventListener("wheel", onGesture, { passive: true });
      window.addEventListener("touchend", onGesture, { passive: true });
    }

    /** One gesture = one step of the descent. Ignored once the orb is down —
     *  from there the buttons are the only controls. */
    function stepDescent() {
      if (!heldRef.current || travellingRef.current) return;
      if (stepRef.current >= DESCENT_STEPS.length - 1) return;
      const to = stepRef.current + 1;
      travellingRef.current = true;
      const pinned = section.offsetHeight - window.innerHeight;
      const from = { y: pinnedTo };
      const target = Math.round(section.offsetTop + pinned * DESCENT_STEPS[to]);
      gsap.to(from, {
        y: target,
        duration: DESCENT_S / (DESCENT_STEPS.length - 1),
        ease: "none",
        onUpdate: () => {
          getLenis()?.stop();
          pinnedTo = Math.round(from.y);
          window.scrollTo(0, pinnedTo);
          ScrollTrigger.update();
        },
        onComplete: () => {
          travellingRef.current = false;
          stepRef.current = to;
          if (to === DESCENT_STEPS.length - 1) setSuites(true); // orb is down
        },
      });
    }

    /** the ACTIVATE button — the only thing that starts the ecosystem */
    function activate() {
      if (activatedRef.current || travellingRef.current) return;
      setSuites(false);
      const pinned = section.offsetHeight - window.innerHeight;
      fireGate(Math.round(section.offsetTop + pinned * GATE_AT));
    }

    /** CONTINUE JOURNEY — the transition plays itself.
     *  It used to release scroll and tween at the same time, which handed the
     *  page to the void's own catch mid-flight and looked like a freeze. Now
     *  input stays captured for the whole handoff: the page is driven from the
     *  hub, through this section's release, and on through the void's mapping
     *  band at the clip's authored pace. Scroll is only given back once we are
     *  fully inside the void — from there it drives to the Launchpad. */
    function goForward() {
      if (travellingRef.current) return;
      exitingRef.current = true;
      travellingRef.current = true;
      setCue(false);
      const voidEl = document.querySelector<HTMLElement>('[aria-label="The white void"]');
      const here = window.scrollY;
      // land past the mapping transition, i.e. fully in the void
      const target = voidEl
        ? Math.round(voidEl.offsetTop + (voidEl.offsetHeight - window.innerHeight) * VOID_MAPPING_END)
        : Math.round(section.offsetTop + section.offsetHeight - window.innerHeight);
      const from = { y: here };
      gsap.to(from, {
        y: target,
        duration: TRANSITION_S,
        ease: "none",
        onUpdate: () => {
          getLenis()?.stop();
          pinnedTo = Math.round(from.y);
          window.scrollTo(0, pinnedTo);
          ScrollTrigger.update();
        },
        onComplete: () => {
          travellingRef.current = false;
          heldRef.current = false;
          releaseScroll();               // scroll belongs to the void now
        },
      });
    }

    function goBack() {
      exitingRef.current = true;
      heldRef.current = false;
      releaseScroll();
      const pinned = section.offsetHeight - window.innerHeight;
      const y = Math.round(section.offsetTop + pinned * GATE_AT);
      const lenis = getLenis();
      lenis ? lenis.scrollTo(y, { duration: 1.4 }) : window.scrollTo({ top: y, behavior: "smooth" });
    }
    navRef.current = { goForward, goBack, activate };

    /** Release the input block completely — ONLY the two buttons do this. */
    function releaseScroll() {
      window.clearTimeout(handoff);
      descentGate?.destroy();
      descentGate = null;
      // Kill the activation tween FIRST. It animates window.scrollTo every
      // frame, so dropping the listeners without stopping it left something
      // still driving the page — the nav escape hatch appeared to do nothing.
      gateTween?.kill();
      window.clearTimeout(ceilingTimer);
      window.removeEventListener("wheel", blockWheel);
      window.removeEventListener("wheel", onGesture);
      window.removeEventListener("touchend", onGesture);
      window.removeEventListener("touchmove", blockWheel);
      window.removeEventListener("keydown", blockKeys);
      window.removeEventListener("scroll", holdScroll);
      window.clearTimeout(quietTimer);
      lockedRef.current = false;
      settledRef.current = false;
      setCue(false);
      getLenis()?.start();
    }

    /** The activation has finished. SCROLL DOES NOT COME BACK.
     *  The lit hub is a terminal state reached by scrolling and left by
     *  BUTTON — wheel, touch and keys stay blocked, and the two controls are
     *  the only way out. Handing scroll back here is what produced the
     *  "weird reverse thing where I have to force it": the visitor was
     *  scrubbing 151vh of activation backwards without meaning to. */
    function unlock() {
      if (!lockedRef.current) return;
      window.clearTimeout(ceilingTimer);
      // deliberately NOT removing blockWheel / blockKeys / holdScroll,
      // and deliberately NOT restarting Lenis.
      settledRef.current = true;
      setSuites(false);
      cueTimer = window.setTimeout(() => setCue(true), 900);
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

    // The nav pill is the escape hatch from the permanent hub lock.
    const onNavRelease = () => releaseScroll();
    window.addEventListener("lumin:releaseGates", onNavRelease);

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
          // The controls belong to the settled hub. They must NOT be gated on
          // lockedRef any more — the lock is now permanent once we arrive, so
          // that test would hide the buttons forever.
          if (!settledRef.current) setCue(false);
        },
      });

      // 2. SCROLL DOES NOT TOUCH THIS SECTION.
      //    The moment it owns the screen, wheel/touch/keys are captured and
      //    the page is pinned. Scroll cannot carry you into it, through it, or
      //    past it — the previous build let a hard swipe run clean past the
      //    whole ecosystem, because only the activation was locked and the
      //    descent was still free.
      //
      //    Two gestures put the orb in the ground, each playing half the
      //    descent at its authored 24fps. After that scroll does nothing at
      //    all: the ACTIVATE button fires the ecosystem, and the two controls
      //    are the only way out.
      //    Seize on the FIRST FRAME the section reaches the top, not on a
      //    toggle. The journey hands over with live momentum, and a toggle can
      //    land after that momentum has already carried deep into the descent
      //    — measured, it arrived at 0.458, which IS the gate, so both descent
      //    gestures were gone before the section ever took control. Watching
      //    every scroll event over the whole approach closes that window.
      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        onUpdate: () => {
          if (heldRef.current || exitingRef.current) return;
          if (section.getBoundingClientRect().top <= 0) seize();
        },
        onRefresh: () => {
          if (heldRef.current || exitingRef.current) return;
          if (section.getBoundingClientRect().top <= 0) seize();
        },
      });      // 3. the idle clips are small but pointless to fetch early; give them
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
      window.removeEventListener("lumin:releaseGates", onNavRelease);
      window.clearTimeout(handoff);
      descentGate?.destroy();
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
      className="relative isolate z-10 -mt-[100vh] h-[426vh]"
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

        {/* Exit controls, not a scroll hint. They appear only once the
            activation has finished and the lock is released. */}
        <div
          className="absolute inset-x-0 bottom-10 z-[3] flex items-center justify-center gap-5 px-6"
          style={{
            opacity: cueOn ? 1 : 0,
            pointerEvents: cueOn ? "auto" : "none",
            transition: "opacity 0.8s ease",
          }}
        >
          {/* Deliberately NOT two chunky pills. At this moment the hologram is
              the hero and the controls are instrumentation: hairline capsules,
              wide tracking, a single hairline rule between them. Weight comes
              from the mark and the glow, not from fill. */}
          <button
            type="button"
            onClick={() => navRef.current?.goBack()}
            className="eco-ctl group"
          >
            <span className="eco-ctl-arrow" aria-hidden="true">←</span>
            {BACK_LABEL}
          </button>
          <span className="eco-ctl-rule" aria-hidden="true" />
          <button
            type="button"
            onClick={() => navRef.current?.goForward()}
            className="eco-ctl eco-ctl-primary group"
          >
            {FORWARD_LABEL}
            <span className="eco-ctl-arrow" aria-hidden="true">→</span>
          </button>
        </div>

        {/* "Product Suites" — the embedded link that sits on the plate once the
            orb is at rest in the floor, before the activation is fired. */}
        {/* Centred, and lifted just clear of the glow on the floor so the
            button reads as hovering over the resting orb rather than sitting
            on it. */}
        <div
          className="absolute inset-x-0 z-[3] flex justify-center"
          style={{
            top: "50%",
            transform: "translateY(-140%)",
            opacity: suitesOn ? 1 : 0,
            pointerEvents: suitesOn ? "auto" : "none",
            transition: "opacity 0.7s ease",
          }}
        >
          <button
            type="button"
            onClick={() => navRef.current?.activate()}
            className="eco-activate"
          >
            {SUITES_LABEL}
          </button>
        </div>
      </div>
    </section>
  );
}
