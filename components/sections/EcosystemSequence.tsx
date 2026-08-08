"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { getLenis } from "@/components/SmoothScroll";
import { createScrubCatch } from "@/lib/beatGate";
import FrameScrubber from "@/components/ui/FrameScrubber";
import EcosystemNodeHud from "@/components/eco/EcosystemNodeHud";

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

/**
 * 145, and the frames themselves are now sliced from the canonical approved
 * clip `11-orb-descend-to-ecosystem.mp4`.
 *
 * ── WHY THE PICTURES CHANGED AND THE ARCHITECTURE DID NOT ────────────────
 * The approved hero film ends on `10-one-mrkt-to-orb-descend.mp4`, and that
 * clip's last frame lands on what used to be frame 83 of this strip — measured,
 * not assumed. The old strip's first 82 frames (the orb as a distant point,
 * falling toward the floor) are now the hero's job, and clip 11 is the SAME
 * footage from f_083 onward, retimed 2.33x slower to fill this same 6.0417s
 * slot. Leaving the old strip in place would have snapped the orb backwards
 * from mid-descent to a distant point at the handoff.
 *
 * So only the images were replaced. The unified descent+activation scrub, the
 * gate, the reverse-out and every scroll constant below are untouched; this
 * count moving by one shifts GATE_AT by ~0.2%, which is below a frame.
 * Previous strip: `media-masters/descent-pre-clip11-backup/`.
 */
const DESCENT_FRAMES = 145;
const ACTIVATION_FRAMES = 145;
const TOTAL_FRAMES = DESCENT_FRAMES + ACTIVATION_FRAMES; // 289
const LAST = TOTAL_FRAMES - 1;

/** ── THE OLD FLOATING-DISC HUB IS GONE ────────────────────────────────────
 *  `activation-v2` is the rebuilt boot-up that lands on the v5 symbol master's
 *  frame 1. It replaces the old activation outright rather than sitting behind
 *  a flag: a flag meant the server-rendered markup still carried the old hub's
 *  <video> sources and poster, so the old ecosystem flashed on screen for the
 *  moment before hydration swapped them. There is no old version to fall back
 *  to here any more, which is the only way that flash cannot happen.
 *  Still 145 frames, so every scroll constant above holds unchanged. */
const chainUrls = [
  ...Array.from({ length: DESCENT_FRAMES }, (_, i) => `/frames/descent/f_${String(i + 1).padStart(3, "0")}.webp`),
  ...Array.from({ length: ACTIVATION_FRAMES }, (_, i) => `/frames/activation-v2/f_${String(i + 1).padStart(3, "0")}.webp`),
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
/** "Go back" scrubs those same 145 frames in reverse. Faster than the forward
 *  play — powering down should feel decisive, and re-watching a 6s boot-up
 *  backwards drags. Raise toward ACTIVATION_S for a slower retreat, drop toward
 *  2s for a snap. This one number is the whole feel of the back button. */
const REVERSE_S = 3.4;
/** scroll span over which the living hub dissolves in/out of the last frame */
const IDLE_FADE = 15 / 326; // ≈ 15vh — a dissolve in both directions
/** post-activation hold so the release doesn't feel abrupt */
const HOLD_MS = 700;
/** the descent's authored length — 144 frames at 24fps */
const DESCENT_S = 6.0417;
/** how long "Product Suites" sits on the plate before the hub takes over */
/** ── THE DESCENT PLAYS ITSELF ─────────────────────────────────────────────
 *  It used to advance in three steps, one per wheel flick. Scroll was already
 *  refused for scrolling here — the wheel was only ever being read as a
 *  trigger — which made this the one place where a gesture still decided
 *  something. From the moment the section takes the screen, nothing but the
 *  buttons decides anything: the descent runs at its authored pace, then
 *  "Activate ecosystem" waits, then the gated activation, then the lit hub and
 *  its two controls. `DESCENT_STEPS`, `stepDescent` and the gesture arm/re-arm
 *  timing are gone; the descent now uses the same timed tween as `fireGate`. */
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
  /** Arriving at /#ecosystem is a real page load, so the film's opening paints
   *  before the jump can measure and land. This covers that beat. */
  const [deepLinkCover, setDeepLinkCover] = useState(false);
  const navRef = useRef<{ goForward: () => void; goBack: () => void; activate: () => void } | null>(null);
  /** the section currently owns the screen and all input */
  const heldRef = useRef(false);
  /** a descent step is mid-flight */
  const travellingRef = useRef(false);
  /** the descent has finished playing at least once. Re-entering the section
   *  then lands straight on the orb-at-rest frame with the button waiting,
   *  rather than replaying six seconds of falling every single time. */
  const descentDoneRef = useRef(false);
  /** a button is taking us out — do not re-seize on the way */
  const exitingRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ceilingTimer: number | undefined;
    let cueTimer: number | undefined;
    let gateTween: gsap.core.Tween | null = null;
    let descentTween: gsap.core.Tween | null = null;
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

    /** The lit hub owns the page, so wheel and touch are refused outright —
     *  except inside an open product HUD, which scrolls itself. Without this
     *  exemption the dossier is stuck on its first screen: preventDefault kills
     *  the wheel before the panel's own overflow ever sees it. */
    /* ── THE WAY OUT, UPWARDS ─────────────────────────────────────────────
       "Go back" reversed the activation and then left the visitor sealed in.
       It powered the hub down to the orb-at-rest gate — correctly — but the
       section was still HELD, so every wheel event was preventDefaulted and
       holdScroll snapped the page back to `pinnedTo`. Measured: 100 upward
       wheel events moved the page 0px. The control said "Go back" and then
       refused to let anyone go anywhere.

       So at the gate — powered down, "Activate ecosystem" waiting — an UPWARD
       gesture releases the lock and hands scroll back to the page, which puts
       the visitor into the film they came from.

       This cannot be used to skip the activation. Only UPWARD intent releases;
       downward is still refused, and `seize()` is re-armed off ScrollTrigger's
       own geometry check, so coming back down re-locks at the gate with the
       button still waiting. The gate stays unskippable; it just stops being a
       trap. */
    const atGate = () =>
      !activatedRef.current && descentDoneRef.current && !travellingRef.current;

    const leaveUpward = () => {
      if (!heldRef.current) return false;
      releaseScroll();
      heldRef.current = false;
      /* EXITING, not merely unheld. `seize()` early-returns on
         `heldRef || exitingRef`, and the ScrollTrigger watcher below re-seizes
         on EVERY update while the section still covers the viewport. Releasing
         without this flag meant the lock came straight back on the next frame:
         the page released and was re-grabbed before it had moved a pixel, which
         measured as exactly 0px of travel for 100 wheel events. The flag is
         cleared by that same watcher once the section has genuinely been left,
         so coming back down re-seizes at the gate as normal. */
      exitingRef.current = true;
      getLenis()?.start();
      return true;
    };

    let ecoTouchY = 0;
    const onEcoTouchStart = (ev: TouchEvent) => { ecoTouchY = ev.touches[0]?.clientY ?? 0; };

    const blockWheel = (ev: Event) => {
      const t = ev.target as HTMLElement | null;
      if (t?.closest?.("[data-eco-scrollable]")) return;
      if (atGate()) {
        // wheel carries its own direction; touch has to be measured against
        // where the finger started
        const dy = (ev as WheelEvent).deltaY;
        const up =
          typeof dy === "number" && !Number.isNaN(dy)
            ? dy < 0
            : ((ev as TouchEvent).touches?.[0]?.clientY ?? 0) - ecoTouchY > 12;
        if (up && leaveUpward()) return;
      }
      ev.preventDefault();
    };
    /** Wheel/touch only ever ADVANCE the descent; they never move the page.
     *  ONE FLICK IS ONE STEP. A time debounce is not enough — a trackpad flick
     *  runs 2.5s and would clear a 700ms debounce three times over, putting the
     *  orb in the ground in a single swipe. Same test the journey uses: the
     *  wheel has to fall silent, and then a real push has to arrive. */
    const blockKeys = (ev: KeyboardEvent) => {
      // never trap a keyboard user — Escape completes whichever beat is playing
      if (ev.key === "Escape") { descentTween?.progress(1); gateTween?.progress(1); return; }
      // same upward exit as the wheel, for anyone driving by keyboard
      if (atGate() && (ev.key === "ArrowUp" || ev.key === "PageUp" || ev.key === "Home")) {
        if (leaveUpward()) return;
      }
      if (SCROLL_KEYS.has(ev.key)) ev.preventDefault();
    };
    // Lenis being stopped does NOT stop a scrollbar drag, so hold the position
    // natively too. `pinnedTo` is advanced by the gate tween as it plays.
    /** RE-ASSERT THE STOP, don't just re-pin.
     *  Blocking wheel with preventDefault only stops the BROWSER scrolling —
     *  Lenis has its own wheel listener and scrolls programmatically, so a
     *  running Lenis walks straight through the block. Measured at the lit hub:
     *  20 of 20 wheel events defaultPrevented, and the page still glided from
     *  6309 all the way back to 3598, out of the section entirely. Whoever
     *  restarted Lenis (the section is handed back and forth between three
     *  different owners here) no longer matters if the lock reasserts itself
     *  every scroll — which is what beatGate's own hold() already does. */
    const holdScroll = () => {
      getLenis()?.stop();
      if (window.scrollY !== pinnedTo) window.scrollTo(0, pinnedTo);
    };

    /** the living hub fades in over the strip's last frame, and back out of it
     *  going the other way — one scroll-driven rule, so both directions match */
    function paintIdle(p: number) {
      const idle = idleLayerRef.current;
      if (!idle) return;
      const o = c01((p - (BAND_END - IDLE_FADE)) / IDLE_FADE);
      idle.style.opacity = String(o);
      if (o > 0) {
        idleLitRef.current = true;
        /* RE-ASSERT, don't fire once.
           play() returns a promise that REJECTS if the element isn't ready —
           which is exactly what the nav jump causes, because it lands straight
           in the lit hub before the source has loaded. The old code latched
           idleLit BEFORE knowing whether play() had succeeded, so a single
           rejection froze the hologram on frame 0 for good: the double-buffer
           below only swaps once `front` is playing, so it never started either.
           Asking again while both buffers are idle costs nothing. */
        const a = idleARef.current;
        const b = idleBRef.current;
        if (a && b && a.paused && b.paused) a.play().catch(() => {});
      } else if (o === 0 && idleLitRef.current) {
        idleLitRef.current = false;
        idleARef.current?.pause();
        idleBRef.current?.pause();
      }
    }

    /** forward: leave the lit hub for the white void. RELEASE is the last
     *  scroll position this section owns, so one tween lands us on the void's
     *  PIN with no reverse scrub in between. */
    /** RE-ARM ONCE THE SECTION IS GENUINELY GONE.
     *  `exitingRef` is raised by the two buttons so their own scroll animation
     *  isn't fought by seize(). It was only ever lowered again by a nav jump,
     *  which meant that after pressing either button the section could NEVER
     *  recapture — scroll then carried you in and out of the ecosystem freely
     *  for the rest of the visit. That is the opposite of the rule: the buttons
     *  decide, not the wheel.
     *  Lowering it the moment the section is fully off screen keeps the exit
     *  working (you can leave) while guaranteeing that coming back captures
     *  again instead of free-scrolling through a live hologram. */
    function armIfClear() {
      if (!exitingRef.current) return;
      const r = section.getBoundingClientRect();
      const fullyGone = r.bottom <= 0 || r.top >= window.innerHeight;
      if (fullyGone) exitingRef.current = false;
    }

    /** RE-MEASURE ON RESIZE.
     *  There was no resize handling here at all. `pinnedTo` is an absolute pixel
     *  position derived from the section's height and the viewport; change the
     *  window and every one of those inputs moves, but the section carried on
     *  pinning to the old number — so the stage jumped, the strip showed the
     *  wrong frame for the position, and the whole thing looked blown apart.
     *  Recompute against live geometry for whichever state we are actually in. */
    function remeasure() {
      ScrollTrigger.refresh();
      if (!heldRef.current) return;
      const pinned = Math.max(1, section.offsetHeight - window.innerHeight);
      const at = activatedRef.current ? BAND_END : descentDoneRef.current ? GATE_AT : 0;
      // Mid-descent the tween owns the position; let it finish against the new
      // geometry rather than yanking the orb to the end of its fall.
      if (travellingRef.current) return;
      pinnedTo = Math.round(section.offsetTop + pinned * at);
      getLenis()?.scrollTo(pinnedTo, { immediate: true, force: true });
      window.scrollTo(0, pinnedTo);
      ScrollTrigger.update();
      paintStage();
    }
    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(remeasure, 120);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    /** Capture the section. Idempotent — safe to call from any trigger. */
    function seize() {
      if (heldRef.current || exitingRef.current) return;
      heldRef.current = true;
      const pinned = section.offsetHeight - window.innerHeight;
      // Once the ecosystem has been activated the hub IS this section's state,
      // so coming back to it lands on the lit hub with its two controls — not
      // back at a descent step it has already played.
      // Three landing states, in order of precedence: the lit hub if the
      // ecosystem has been activated, the orb at rest if the descent has
      // already played, otherwise the top of the descent about to play.
      const at = activatedRef.current ? BAND_END : descentDoneRef.current ? GATE_AT : 0;
      pinnedTo = Math.round(section.offsetTop + pinned * at);
      if (activatedRef.current) { settledRef.current = true; setCue(true); }
      const lenis = getLenis();
      lenis?.scrollTo(pinnedTo, { immediate: true, force: true });
      lenis?.stop();
      window.scrollTo(0, pinnedTo);
      ScrollTrigger.update();
      window.addEventListener("wheel", blockWheel, { passive: false });
      window.addEventListener("touchstart", onEcoTouchStart, { passive: true });
      window.addEventListener("touchmove", blockWheel, { passive: false });
      window.addEventListener("keydown", blockKeys);
      window.addEventListener("scroll", holdScroll);

      // Arriving fresh: the orb falls on its own. Arriving back to a descent
      // already seen: the button is simply there.
      if (!activatedRef.current && !descentDoneRef.current) playDescent();
      else if (!activatedRef.current) setSuites(true);
    }

    /** The orb falls, once, at its authored pace. Nothing to press, nothing to
     *  flick — this is a passenger moment. `ease: "none"` over 6.0417s across
     *  144 frames IS the clip's native 24fps, same as the activation gate. */
    function playDescent() {
      if (travellingRef.current || descentDoneRef.current) return;
      travellingRef.current = true;
      setSuites(false);
      const pinned = section.offsetHeight - window.innerHeight;
      const from = { y: pinnedTo };
      const target = Math.round(section.offsetTop + pinned * GATE_AT);
      descentTween = gsap.to(from, {
        y: target,
        duration: DESCENT_S,
        ease: "none",
        onUpdate: () => {
          getLenis()?.stop();
          pinnedTo = Math.round(from.y);
          window.scrollTo(0, pinnedTo);
          ScrollTrigger.update();
        },
        onComplete: () => {
          travellingRef.current = false;
          descentDoneRef.current = true;
          setSuites(true);                       // orb is down — offer the button
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

    /** GO BACK — LEAVE the ecosystem, upward, into the gym above it.
     *
     *  It used to park you at the orb-at-rest frame, which is still INSIDE this
     *  section, and hand scroll back without ever recapturing. That is what let
     *  the wheel walk you in and out of a live hologram: the section was on
     *  screen but had given up control of it, so nothing held the position and
     *  Lenis scrolled straight through the beat. Preventing wheel events does
     *  not help there — Lenis scrolls programmatically, so only holdScroll can
     *  stop it, and holdScroll is only attached while the section is held.
     *
     *  Landing a full viewport above the section's top puts it entirely off
     *  screen, which lets `armIfClear` re-arm. Scroll back down and the section
     *  captures again properly and lands on the lit hub. So the buttons move
     *  you between beats and the wheel never does — which is the rule. */
    function goBack() {
      if (travellingRef.current) return;
      travellingRef.current = true;
      setCue(false);                 // nodes and controls go first

      /* PLAY THE ACTIVATION BACKWARDS.
         Cutting straight to the orb-at-rest frame threw away the one thing that
         makes this section feel like a machine — you watched it power up, so
         you should watch it power down. The whole chain is a frame strip
         precisely so it runs in reverse as cleanly as it runs forward, and this
         tween scrubs the activation's 145 frames back the way they came.
         The section stays HELD for the whole scrub, so scroll is still refused
         throughout — the button is driving, not the wheel. */
      const pinned = section.offsetHeight - window.innerHeight;
      const from = { y: pinnedTo };
      const target = Math.round(section.offsetTop + pinned * GATE_AT);
      gateTween?.kill();
      descentTween = gsap.to(from, {
        y: target,
        duration: REVERSE_S,
        ease: "none",
        onUpdate: () => {
          getLenis()?.stop();
          pinnedTo = Math.round(from.y);
          window.scrollTo(0, pinnedTo);
          ScrollTrigger.update();
          paintStage();              // drives the strip AND fades the hub out
        },
        onComplete: () => {
          travellingRef.current = false;
          // Back to BEFORE activation. The descent stays "done" so the fall
          // does not replay, and the hologram is dropped so paintIdle relights
          // it cleanly the next time the gate fires.
          activatedRef.current = false;
          settledRef.current = false;
          idleLitRef.current = false;
          descentDoneRef.current = true;
          setSuites(true);           // offer "Activate ecosystem" again
        },
      });
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
      // The descent drives window.scrollTo every frame too, so it has to stop
      // for the same reason — a live tween outlives the listeners otherwise.
      descentTween?.kill();
      travellingRef.current = false;
      window.clearTimeout(ceilingTimer);
      window.removeEventListener("wheel", blockWheel);
      window.removeEventListener("touchstart", onEcoTouchStart);
      window.removeEventListener("touchmove", blockWheel);
      window.removeEventListener("keydown", blockKeys);
      window.removeEventListener("scroll", holdScroll);
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
      window.addEventListener("touchstart", onEcoTouchStart, { passive: true });
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

    /** NAV JUMP — land in the lit hub without playing the road to it.
     *  Reviewing anything past this point meant scrolling the whole gym, both
     *  descent gestures and the 6s activation every single time. This puts the
     *  section in its settled state directly: activated, scrolled to the end
     *  of the band so the strip shows the hub frame, cue on, suites gone. It
     *  deliberately re-uses the same flags fireGate/unlock set rather than a
     *  parallel "preview mode", so what you review is the real state. */
    const onJump = (e: Event) => {
      const to = (e as CustomEvent<string>).detail;
      if (to !== "ecosystem") return;
      // UNLOCK BEFORE MEASURING. The Launchpad pins overflow:hidden on
      // <html>/<body> when it takes the screen, which collapses the scrollable
      // height — and it listens for this same event, but mounts after us, so
      // its own handler runs too late to help. Measuring first read offsetTop
      // off the collapsed page and the jump landed at y=408 instead of 2709.
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      releaseScroll();                    // drop any lock we are already holding
      ScrollTrigger.refresh();            // re-measure now the page is tall again
      const pinned = Math.max(1, section.offsetHeight - window.innerHeight);
      const bandEndY = Math.round(section.offsetTop + pinned * BAND_END);
      activatedRef.current = true;
      settledRef.current = true;
      travellingRef.current = false;
      setSuites(false);
      const lenis = getLenis();
      lenis?.start();
      lenis?.scrollTo(bandEndY, { immediate: true, force: true });
      window.scrollTo(0, bandEndY);
      ScrollTrigger.update();
      paintStage();

      /* THEN HAND OVER TO seize(), which is the same thing that pins this
         section when it is reached normally. The lit hub is a terminal state —
         scroll does nothing and the two controls are the only way out — and
         arriving by ACTIVATE leaves that lock standing. Arriving by nav jump
         had gone through releaseScroll() and left scroll FREE, so the same
         screen behaved two different ways depending on how you got to it, and
         a wheel from the hub wandered off into the middle of the descent.

         Re-locking by hand here did not work either: seize() runs off a
         per-frame geometry check and simply ran afterwards, overwriting the
         pin. Calling it deliberately is both shorter and the only version that
         cannot drift from the real path — it reads activatedRef itself and
         pins to BAND_END, sets settled, raises the cue and attaches every
         listener. The descent is marked done because the orb IS down: without
         it a later seize would replay the whole fall underneath the lit hub. */
      descentDoneRef.current = true;
      heldRef.current = false;
      exitingRef.current = false;
      seize();

      /* RE-ASSERT THE LANDING FOR A FEW FRAMES.
         Measuring once is not enough. refresh() and Lenis both finish settling
         AFTER this handler returns, and ScrollTrigger re-runs its own resize
         pass on the frame after that — so a viewport resize any time before the
         jump left the first measurement stale and the nav landed on GATE_AT
         (the orb at rest, "Activate ecosystem" still waiting) instead of
         BAND_END (the lit hub). That is a whole beat short, and it looked like
         the nav was pointed at the wrong place.
         Recomputing from live geometry on the next few frames costs nothing and
         makes the landing independent of when anything else settles. */
      let checks = 0;
      const reassertLanding = () => {
        const p = Math.max(1, section.offsetHeight - window.innerHeight);
        const want = Math.round(section.offsetTop + p * BAND_END);
        if (Math.abs(window.scrollY - want) > 2) {
          pinnedTo = want;
          getLenis()?.scrollTo(want, { immediate: true, force: true });
          window.scrollTo(0, want);
          ScrollTrigger.update();
          paintStage();
        }
        if (++checks < 4) requestAnimationFrame(reassertLanding);
      };
      requestAnimationFrame(reassertLanding);
    };
    window.addEventListener("lumin:jumpTo", onJump);

    /* ARRIVING AT /#ecosystem FROM ANOTHER PAGE.
       The nav's "Products" tab jumps here by dispatching lumin:jumpTo, but a
       product page's "Ecosystem" link is a real navigation — the browser lands
       on a fresh document with a hash and nothing was reading it, so the visitor
       was dropped at the very top of the film and had to scroll the whole
       journey back. Firing the same jump the nav uses puts them on the lit hub,
       which is what the link says it does.

       Deferred until the loader has lifted: the jump measures section geometry,
       and measuring while PageLoader still owns the screen reads a page that has
       not settled. */
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
          // The controls belong to the lit hub, and follow scroll position so
          // they come back on their own after GO BACK — no re-seizing needed.
          setCue(activatedRef.current && p >= BAND_END - IDLE_FADE);
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
          armIfClear();
          // Left under our own steam? Stop exiting once the section no longer
          // covers the viewport, so a later return can seize normally.
          if (exitingRef.current && !heldRef.current) {
            const rr = section.getBoundingClientRect();
            if (rr.bottom <= window.innerHeight || rr.top > 0) exitingRef.current = false;
          }
          if (heldRef.current || exitingRef.current) return;
          // `top <= 0` alone is ALSO true once you are past the section, so on
          // its own it let a resize out in the white void re-seize the
          // ecosystem and drag scroll backwards into the hub. Require the
          // section to still cover the viewport — that is only true while you
          // are genuinely inside its pinned range.
          const r = section.getBoundingClientRect();
          if (r.top <= 0 && r.bottom > window.innerHeight) seize();
        },
        onRefresh: () => {
          armIfClear();
          if (exitingRef.current && !heldRef.current) {
            const rr = section.getBoundingClientRect();
            if (rr.bottom <= window.innerHeight || rr.top > 0) exitingRef.current = false;
          }
          if (heldRef.current || exitingRef.current) return;
          const r = section.getBoundingClientRect();
          if (r.top <= 0 && r.bottom > window.innerHeight) seize();
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

    if (window.location.hash === "#ecosystem") {
      /* RETURNING FROM A PRODUCT PAGE.
         A product page's "Ecosystem" link is a real navigation: the browser
         lands on a fresh document and nothing was reading the hash, so the
         visitor was dropped at the top of the film.

         ── TWO THINGS THIS GOT WRONG BEFORE ──────────────────────────────
         1. It fired `releaseGates` + `jumpTo` FOUR times, 140ms apart, to
            "re-assert" the landing. That fought itself: `releaseScroll()`
            clears lockedRef and settledRef and removes every listener but does
            NOT clear heldRef, and `onJump` runs its own re-assert loop over the
            following frames. Each extra pass tore down listeners while the
            previous pass was still settling, and the section ended up held,
            unlistened and unsettled — which is why "Go back" and "Continue
            journey" did nothing once you arrived this way. It fires ONCE now;
            `onJump` already re-asserts its own landing internally.
         2. It left `#ecosystem` in the URL. Nav "Home" reloads the page, so the
            hash was still there and threw the visitor straight back to the hub
            — the film could never be restarted. The hash is cleared as soon as
            it has been acted on.

         The cover stays up until the landing is made, so the opening is never
         seen flashing past on the way. */
      setDeepLinkCover(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          window.setTimeout(() => {
            // consume the hash first — nothing may re-trigger this
            history.replaceState(null, "", window.location.pathname + window.location.search);
            window.dispatchEvent(new CustomEvent("lumin:releaseGates"));
            ScrollTrigger.refresh();
            window.dispatchEvent(new CustomEvent("lumin:jumpTo", { detail: "ecosystem" }));
            // onJump re-asserts over the next few frames; reveal after that.
            window.setTimeout(() => setDeepLinkCover(false), 420);
          }, 90),
        ),
      );
    }

    return () => {
      ctx.revert();
      window.removeEventListener("lumin:releaseGates", onNavRelease);
      window.removeEventListener("lumin:jumpTo", onJump);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(handoff);
      descentGate?.destroy();
      gateTween?.kill();
      descentTween?.kill();
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
      /* SELF-HEAL. At the lit hub scroll is refused, so paintIdle may never run
         again — nothing would ever retry a play() that got rejected on arrival.
         This loop is already running every frame, so it is the one place that
         can always recover: if the layer is visible and neither buffer is
         playing, start one. */
      if (front.paused && back.paused && Number(idleLayerRef.current?.style.opacity || "0") > 0) {
        front.play().catch(() => {});
      }
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
    <>
    {/* DEEP-LINK COVER — above everything, including the loader, and only ever
        raised when the page was opened directly at #ecosystem. */}
    {deepLinkCover && (
      <div
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "#05070d", pointerEvents: "none",
          transition: "opacity .26s ease",
        }}
      />
    )}
    {/* -mt-[100vh] closes the hero's un-pinned dead zone — see the header note.
        `isolate` keeps our layer stack from tangling with the hero's z-indexed
        children, which share the root stacking context. */}
    <section
      ref={sectionRef}
      data-nav-tone="dark"
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
          {/* The v5 symbol master IS the idle now. The old hub's webm/mp4 and
              its poster are deliberately not referenced anywhere in this tree —
              while they were, the pre-hydration markup showed them. The poster
              is v5's own frame 1, which is also the activation's last frame, so
              there is no black gap before the video decodes. */}
          <video
            ref={idleARef}
            muted playsInline preload="none"
            poster="/eco/hub/idle-v5-poster.jpg"
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src="/eco/hub/ecosystem-symbol-master-v5.mp4" type="video/mp4" />
          </video>
          <video
            ref={idleBRef}
            muted playsInline preload="none"
            poster="/eco/hub/idle-v5-poster.jpg"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: 0 }}
          >
            <source src="/eco/hub/ecosystem-symbol-master-v5.mp4" type="video/mp4" />
          </video>
        </div>

        {/* The eleven node briefs, over the lit hub. Only armed once the
            activation has finished — during the descent and the boot-up the
            nodes are not there yet, so nothing should be clickable.
            z-[4] puts an open dossier above the exit controls; the wrapper is
            pointer-events:none so the hologram stays untouched until a node or
            the panel itself claims the pointer. */}
        <div className="pointer-events-none absolute inset-0 z-[4]">
          <EcosystemNodeHud active={cueOn} />
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
        {/* DEAD CENTRE of the screen. It was lifted well above centre, which
            reads as off on a big window where there is more room above it. */}
        <div
          className="absolute inset-0 z-[3] flex items-center justify-center"
          style={{
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
    </>
  );
}
