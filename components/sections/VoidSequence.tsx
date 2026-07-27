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
/** one landing for all of them: just below centre, over the floor rather than
 *  the bright upper haze where dark type washes out */
const PLANE_Y = 60;

/** copy runs between these two points of section progress */
const FIRST = 0.30, LAST = 0.94;
const GAP = (LAST - FIRST) / (SLOTS.length - 1);
const W = GAP / 0.7;
const Z_FAR = -3400;

/** Each line ARRIVES at the lens at these points, and the scroll is caught on
 *  every one — the same mechanic as the journey. Free scrolling let a single
 *  flick carry the whole void past in about two seconds; snapping did not fix
 *  it because snapping only settles AFTER you stop pushing. A catch holds the
 *  line at the lens until you ask for the next one, which is the only thing
 *  that actually guarantees it gets read. */
const ANCHORS = SLOTS.map((_, i) => FIRST + i * GAP);

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
      el.className = `vs-plane ${s.side === "L" ? "vs-L" : "vs-R"} vs-statement`;
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

          if (reduced) return; // planes stay put; see the CSS fallback
          SLOTS.forEach((_m, i) => {
            const el = planes[i];
            const at = FIRST + i * GAP;
            const t = (p - at) / W; // -1 far, 0 arrived
            if (t < -1 || t > 0.22) { el.style.opacity = "0"; return; }
            const tt = c01((t + 1) / 1.22) * 1.22 - 1;
            const z = tt < 0 ? Z_FAR * Math.pow(-tt, 1.5) : 0;
            const fadeIn = c01((tt + 1) / 0.5);
            // Full opacity AT the lens, and the fade starts there — not before.
            // The old envelope was c01((0.1 - tt) / 0.22), which is already 55%
            // faded by arrival (tt = 0), so every line peaked at 0.46 and
            // composited toward the haze: measured 2.0-2.6:1 against a
            // background of 181-246 luminance, i.e. washed out at the exact
            // moment it is meant to be read. Landing on 1.0 puts the statements
            // near 10:1 and the steps near 6:1 with no colour or layout change.
            const fadeOut = c01((0.22 - tt) / 0.22);
            el.style.opacity = (fadeIn * fadeOut).toFixed(3);
            el.style.transform =
              `translateY(calc(-50% + ${PLANE_Y}px)) translateZ(${z}px)`;
          });
        },
      });

      // 2. hold on every line, so none of it can be flicked past
      catcher = createScrubCatch({
        section,
        anchors: ANCHORS,
        onCatch: () => {},
        onRelease: () => {},
      });

      // 3. arrival — scroll's last job on this site. Hand off to the CTA.
      ScrollTrigger.create({
        trigger: section,
        start: "bottom bottom",
        once: true,
        onEnter: () => {
          if (arrivedRef.current) return;
          arrivedRef.current = true;
          window.dispatchEvent(new CustomEvent("lumin:voidArrived"));
        },
      });
    }, section);

    return () => { catcher?.destroy(); ctx.revert(); planes.forEach((p) => p.remove()); };
  }, [reduced]);

  return (
    // -mt-[100vh] closes the ecosystem's un-pinned tail. `isolate` keeps our
    // layers out of the neighbouring sections' stacking contexts.
    <section
      ref={sectionRef}
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
          style={{ perspective: "1150px", perspectiveOrigin: "50% 46%", transformStyle: "preserve-3d" }}
        />
      </div>
    </section>
  );
}
