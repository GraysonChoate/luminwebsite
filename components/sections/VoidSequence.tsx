"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import FrameScrubber from "@/components/ui/FrameScrubber";
import { createScrubCatch } from "@/lib/beatGate";

/**
 * The White Void — the last scrollable section of the site.
 *
 * ── WHAT IT IS ────────────────────────────────────────────────────────────
 * One continuous 585-frame strip: the ecosystem's spatial-mapping transition
 * (134 frames) followed by the void journey (451 frames). They were generated
 * to hand off to each other — the transition ends 2.50% from the journey's
 * opening frame — so they scrub as a single shot with no join to hide.
 *
 * The camera skims low over the floor at constant speed. Perspective does the
 * pacing for free: the Launchpad is an empty horizon for two thirds of the run
 * and only becomes a presence in the last stretch. There is no retiming curve,
 * because trying to author one is what produced 6.6s of dead air in an earlier
 * version — hold-back and liveliness are the same dial in a high camera, and
 * the fix was dropping the camera, not remapping the frames.
 *
 * ── THE STICKY HANDOFF (see EcosystemSequence for the full note) ──────────
 * A full-bleed sticky stage has three landmarks: REVEAL (sectionTop - vh),
 * PIN (sectionTop), RELEASE (sectionBottom - vh). `-mt-[100vh]` lands our PIN
 * on the ecosystem's RELEASE — and drags our REVEAL up by the same 100vh, so
 * the stage AND the section background stay hidden until we are actually
 * pinned. Both defects shipped once already; don't remove either half.
 *
 * ── SCROLL ENDS HERE ─────────────────────────────────────────────────────
 * The last frame is the Launchpad arrival. Past that, scroll has no further
 * job on this site — the CTA is a fixed terminal state, Lenis gets killed
 * rather than paused, and the nav must stay live so the visitor is never
 * trapped. This section fires `lumin:voidArrived` when it lands so the CTA
 * layer can take over.
 */

const FRAMES = 585;
const frameUrls = Array.from(
  { length: FRAMES },
  (_, i) => `/frames/void/f_${String(i + 1).padStart(3, "0")}.webp`,
);
/** 640px copies — 5.6MB against the full strip's 34MB. The void is the longest
 *  strip on the site, so it benefits from the proxy tier more than anything. */
const proxyUrls = Array.from(
  { length: FRAMES },
  (_, i) => `/frames/void-proxy/f_${String(i + 1).padStart(3, "0")}.webp`,
);

/** the mapping transition occupies the first 134 of 585 frames */
const MAPPING_END = 134 / FRAMES; // ≈ 0.229

/* ── COPY ────────────────────────────────────────────────────────────────
   FIVE phrases. Nine was unreadable at any scroll speed — the arithmetic is
   brutal: ~180wpm means twenty seconds buys about sixty words, and no scroll
   engineering gets around it.

   The arc: the problem → who we are → the insight → what we built → the hand
   to the CTA. Line 2 is the one that earns the rest; we lived this, so line 3
   is a fact rather than a claim. Line 5 hands off to the Launchpad headline
   ("Build the operation you've always wanted") without repeating it.

   EVERY LINE ARRIVES THE SAME WAY. Same type size, same vertical landing, same
   travel — only the side alternates. Previously the y offsets ran 20/-170/70/
   0/40/-150/60/-20/150 and the sizes mixed statement with step, so each line
   landed somewhere different at a different scale; a smaller line at the lens
   READS as further away even though it is at exactly the same depth. That is
   what made the rhythm feel arbitrary. One landing, one size, one path. */
const SLOTS: { side: "L" | "R"; html: string }[] = [
  { side: "L", html: `Fitness has spent 30&nbsp;years<br>reaching the same 20%.` },
  { side: "R", html: `We didn't study the problem.<br>We ran the floor.` },
  { side: "L", html: `The workout was never<br>the hard part. Coming back was.` },
  { side: "R", html: `So we built the system<br>behind every destination.` },
  { side: "L", html: `Now come build yours.` },
];
/** one width for all of them, wide enough for the longest line at full size so
 *  nothing wraps into a third line and collides with its neighbour */
const PLANE_W = 1000;

/* ── EVERYTHING COMES OUT OF THE HORIZON ─────────────────────────────────
   Measured, not guessed: the brightest convergence on the horizon sits at
   66.0% / 29.4% of frame and barely moves across the whole flythrough (63-66%
   over seven sampled frames). That is the camera's axis — where the floor
   trails run to. The perspective origin was 50% / 46%, so lines were flying out
   of a point that is not in the picture.
   Each line now STARTS at that point, tiny and far, and drifts out to its
   resting side as it comes forward. */
const VP_X = 0.660, VP_Y = 0.294;
/** where a line ends up: a fraction of the viewport, and just below centre so
 *  it sits over the floor rather than the bright upper haze */
const REST_X_L = 0.29, REST_X_R = 0.71, REST_Y = 0.55;

/** Each line eases to a stop as it reaches the lens. NOT the hard snap the
 *  journey uses — the copy is still travelling here, so a jump reads as a jolt.
 *  It glides in over 0.4s, holds, and carries on by itself. Without any pacing
 *  a single flick crossed the ENTIRE void: measured, one swipe took progress
 *  from 0.23 to 1.0 and all five lines were gone. */
const CATCH_SOFT_MS = 400, CATCH_HOLD_MS = 1300;

/** Copy runs between these two points of section progress.
 *  CONTINUE JOURNEY lands at the end of the mapping transition (0.229). The
 *  copy used to start at 0.26 and, because a line begins fading up almost as
 *  soon as it starts travelling, words were already on screen the moment the
 *  transition finished. Starting at 0.46 — with the fade held back until a
 *  quarter of the way through the travel — leaves a clear stretch of empty
 *  void to arrive into before anything appears. */
const FIRST = 0.46, LAST = 0.95;
const GAP = (LAST - FIRST) / (SLOTS.length - 1);
/** Travel window. Wider than the gap, so a line is in flight for longer than
 *  the space between lines — it comes forward slowly and lingers instead of
 *  snapping in. The hard catches are gone; the pacing does the work now. */
const W = GAP / 0.75;
const Z_FAR = -2600;


const c01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export default function VoidSequence() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const spaceRef = useRef<HTMLDivElement>(null);
  const frameProgress = useRef(0);
  const planesRef = useRef<HTMLDivElement[]>([]);
  const arrivedRef = useRef(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const section = sectionRef.current!;
    const space = spaceRef.current!;

    // build the copy planes once
    const planes = SLOTS.map((s) => {
      const el = document.createElement("div");
      el.className = `vs-plane vs-statement`;
      el.style.width = `${PLANE_W}px`;
      el.innerHTML = s.html;
      space.appendChild(el);
      return el;
    });
    planesRef.current = planes;

    /** hidden through the entire REVEAL→PIN approach — including the section's
     *  own background, or a coloured rectangle climbs over the outgoing scene */
    function paintStage() {
      const stage = stageRef.current;
      if (!stage) return;
      const armed = section.getBoundingClientRect().top <= 0;
      stage.style.visibility = armed ? "visible" : "hidden";
      section.style.background = armed ? "#f4f6f8" : "transparent";
      // …and it must not EAT CLICKS while it is invisible. `-mt-[100vh]` parks
      // this section over the ecosystem's last viewport, and at z-20 vs the
      // ecosystem's z-10 it was swallowing every press on the hub's two exit
      // controls — they rendered, lit up on hover, and did nothing.
      section.style.pointerEvents = armed ? "auto" : "none";
    }

    let catcher: ReturnType<typeof createScrubCatch> | null = null;

    const ctx = gsap.context(() => {
      // 0. entry guard — spans the whole time the section touches the viewport,
      //    so it sees the approach that the scrubbed trigger never fires during.
      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        onUpdate: paintStage,
        onRefresh: paintStage,
        onToggle: paintStage,
      });

      // 1. the strip. scrub 0.6 matches the hero and the ecosystem, so the
      //    mechanic feels identical across all three scrubbed sections.
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        onUpdate: (self) => {
          const p = self.progress;
          frameProgress.current = p;

          // Fire the handoff from PROGRESS, not from a trigger parked on
          // "bottom bottom". That start lands on the document's final pixel —
          // there is no room left to cross it, so onEnter never fired and the
          // Launchpad was unreachable. Measured: progress sat at 1.000 with no
          // event. 0.995 always has scroll left to reach it.
          if (p >= 0.995 && !arrivedRef.current) {
            arrivedRef.current = true;
            window.dispatchEvent(new CustomEvent("lumin:voidArrived"));
          }
          if (reduced) return; // planes stay put; see the CSS fallback
          const vw = space.clientWidth, vh = space.clientHeight;
          SLOTS.forEach((m, i) => {
            const el = planes[i];
            const at = FIRST + i * GAP;
            const t = (p - at) / W;            // -1 far away, 0 at the lens
            if (t < -1 || t > 0.34) { el.style.opacity = "0"; return; }

            // travel: 0 at the horizon, 1 at the resting spot
            const u = c01(t + 1);
            const ease = 1 - Math.pow(1 - u, 2.2);   // slow far away, quick near
            const z = Z_FAR * (1 - ease);

            // …and slide out from the vanishing point to its side of frame
            const restX = (m.side === "L" ? REST_X_L : REST_X_R) * vw;
            const dx = (restX - VP_X * vw) * ease;
            const dy = (REST_Y * vh - VP_Y * vh) * ease;

            // Fade UP slowly over the first two thirds of the travel, hold at
            // full through the arrival, and only let go at the very end. It
            // used to reach full only at the lens and start dropping at once.
            const fadeIn = c01((u - 0.25) / 0.5);
            const fadeOut = c01((0.34 - t) / 0.16);
            el.style.opacity = (fadeIn * fadeOut).toFixed(3);
            el.style.transform =
              `translate(-50%, -50%) translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) translateZ(${z.toFixed(0)}px)`;
          });
        },
      });

      // 2. hold each line as it lands, gently
      catcher = createScrubCatch({
        section,
        anchors: SLOTS.map((_, i) => FIRST + i * GAP),
        softMs: CATCH_SOFT_MS,
        holdMs: CATCH_HOLD_MS,
        onCatch: () => {},
        onRelease: () => {},
      });

      // 3. arrival — scroll's last job on this site. Hand off to the CTA.
      ScrollTrigger.create({
        trigger: section,
        start: "bottom bottom",
        // NOT `once`. The nav can now dismiss the Launchpad to reach the
        // sections beneath it, so scrolling back down here has to be able to
        // bring it back — otherwise leaving once removed the CTA for good.
        onEnter: () => {
          if (arrivedRef.current) return;
          arrivedRef.current = true;
          window.dispatchEvent(new CustomEvent("lumin:voidArrived"));
        },
        onLeaveBack: () => { arrivedRef.current = false; },
      });
    }, section);

    return () => { catcher?.destroy(); ctx.revert(); planes.forEach((p) => p.remove()); };
  }, [reduced]);

  return (
    // -mt-[100vh] closes the ecosystem's un-pinned tail. `isolate` keeps our
    // layers out of the neighbouring sections' stacking contexts.
    <section
      ref={sectionRef}
      data-nav-tone="light"
      className="relative isolate z-20 -mt-[100vh] h-[500vh]"
      style={{ background: "transparent" }}
      aria-label="The white void"
    >
      <div
        ref={stageRef}
        className="sticky top-0 h-screen overflow-clip"
        style={{ background: "#f4f6f8", visibility: "hidden" }}
      >
        <div className="absolute inset-0">
          <FrameScrubber
            progressRef={frameProgress}
            frameCount={FRAMES}
            frameUrls={frameUrls}
            fit="cover"
            background="#f4f6f8"
            proxyUrls={proxyUrls}
          />
        </div>

        {/* copy lives in a real 3D space so it travels toward the lens rather
            than fading in place. Left/right only — the centre belongs to the
            architecture. */}
        <div
          ref={spaceRef}
          className="pointer-events-none absolute inset-0"
          style={{
            perspective: "1150px",
            perspectiveOrigin: `${VP_X * 100}% ${VP_Y * 100}%`,
            transformStyle: "preserve-3d",
          }}
        />
      </div>
    </section>
  );
}
