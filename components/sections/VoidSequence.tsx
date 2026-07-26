"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import FrameScrubber from "@/components/ui/FrameScrubber";

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

/** the mapping transition occupies the first 134 of 585 frames */
const MAPPING_END = 134 / FRAMES; // ≈ 0.229

/* ── COPY ────────────────────────────────────────────────────────────────
   63 words, six moments. Everything about the cadence is DERIVED: one travel
   window for all of them, and the next launches when the previous is 70% of
   the way to the lens, so spacing = 0.7 × window. Hand-placing these is what
   made them bunch at the end and overlap.
   Sides strictly alternate, so anything on the same side is two slots apart
   and cannot collide. Each plane fades AS IT ARRIVES — nothing sweeps past. */
const SLOTS: { side: "L" | "R"; y: number; cls: string; w: number; html: string }[] = [
  { side: "L", y: 20, cls: "vs-statement", w: 760,
    html: `Fitness has spent 30&nbsp;years<br>reaching the same 20%.` },
  { side: "R", y: -170, cls: "vs-step", w: 500,
    html: `The problem was never proving<br>that movement works.` },
  { side: "L", y: 70, cls: "vs-statement", w: 780,
    html: `It was making people<br>want to return.` },
  { side: "R", y: 0, cls: "vs-statement", w: 640,
    html: `Intelligent.<br>Interactive.<br>Individualized.` },
  { side: "L", y: 40, cls: "vs-statement", w: 620,
    html: `Then we built a place<br>to prove it.` },
  { side: "R", y: -150, cls: "vs-step", w: 470,
    html: `So we stopped building<br>one destination —` },
  { side: "L", y: 60, cls: "vs-statement", w: 800,
    html: `and started building the system<br>behind every destination.` },
  { side: "R", y: -20, cls: "vs-statement", w: 720,
    html: `What comes next<br>isn't already built.` },
  { side: "L", y: 150, cls: "vs-step", w: 420,
    html: `Let's build it together.` },
];

/** copy runs between these two points of section progress */
const FIRST = 0.30, LAST = 0.94;
const GAP = (LAST - FIRST) / (SLOTS.length - 1);
const W = GAP / 0.7;
const Z_FAR = -3400;

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
      el.className = `vs-plane ${s.side === "L" ? "vs-L" : "vs-R"} ${s.cls}`;
      el.style.width = `${s.w}px`;
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
    }

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
          SLOTS.forEach((m, i) => {
            const el = planes[i];
            const at = FIRST + i * GAP;
            const t = (p - at) / W; // -1 far, 0 arrived
            if (t < -1 || t > 0.22) { el.style.opacity = "0"; return; }
            const tt = c01((t + 1) / 1.22) * 1.22 - 1;
            const z = tt < 0 ? Z_FAR * Math.pow(-tt, 1.5) : 0;
            const fadeIn = c01((tt + 1) / 0.5);
            const fadeOut = c01((0.1 - tt) / 0.22);
            el.style.opacity = (fadeIn * fadeOut).toFixed(3);
            el.style.transform =
              `translateY(calc(-50% + ${m.y}px)) translateZ(${z}px)`;
          });
        },
      });

      // 2. arrival — scroll's last job on this site. Hand off to the CTA.
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

    return () => { ctx.revert(); planes.forEach((p) => p.remove()); };
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
