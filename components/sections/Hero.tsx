"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { HERO, JOURNEY } from "@/lib/copy";
import SplitChars from "@/components/ui/SplitChars";
import FrameScrubber from "@/components/ui/FrameScrubber";

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

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef(0);
  const [variant, setVariant] = useState<"desktop" | "mobile">("desktop");
  const [introDone, setIntroDone] = useState(false); // full logo clip → hover loop

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setVariant(mq.matches ? "mobile" : "desktop");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Opening = ONE baked clip (dope-intro: Vid1 ignition xfade Vid2 rise), so
  // there is no runtime seam to misalign. It autoplays under the black loader
  // (which lifts on the `lumin:introPlaying` signal, revealing it from its black
  // ignition start), then hands off to the seamless hover loop when it ends.
  useEffect(() => {
    const intro = introRef.current;
    const loop = loopRef.current;
    if (!intro || !loop) return;
    loop.play().catch(() => {}); // keep the hover loop running (hidden) so the handoff is instant
    intro.play().catch(() => {}); // belt-and-suspenders alongside the autoPlay attr
    // tell the loader the intro is actually painting frames → safe to lift
    const onPlaying = () => {
      (window as unknown as { __luminIntroPlaying?: boolean }).__luminIntroPlaying = true;
      window.dispatchEvent(new Event("lumin:introPlaying"));
    };
    intro.addEventListener("playing", onPlaying, { once: true });
    if (!intro.paused) onPlaying();
    // hand off to the hover loop when the intro finishes. To make the "catch"
    // invisible, seek the loop to its turnaround frame (t≈1.0 = the boomerang's
    // apex = Vid2's last hover frame) so the crossfade blends two near-identical
    // frames instead of two arbitrary ones. Guarded so timeupdate can't re-seek
    // it every tick. Drive the swap with state so a re-render can't revert it.
    let handed = false;
    const handoff = () => {
      if (handed) return;
      handed = true;
      try {
        loop.currentTime = 1.0;
      } catch {}
      loop.play().catch(() => {});
      setIntroDone(true);
    };
    const onTime = () => {
      if (intro.duration && intro.currentTime >= intro.duration - 0.06) handoff();
    };
    intro.addEventListener("ended", handoff);
    intro.addEventListener("timeupdate", onTime);
    return () => {
      intro.removeEventListener("playing", onPlaying);
      intro.removeEventListener("ended", handoff);
      intro.removeEventListener("timeupdate", onTime);
    };
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

      // 1b. idle hero → journey: the looping logo video covers the first frame
      // until the visitor scrolls, then fades out across the opening sliver of
      // the walk, revealing the scrubbed footage underneath.
      gsap.to(idleRef.current, {
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "top+=180 top", scrub: true },
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
    return () => {
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
          />
        </div>

        {/* idle hero — threaded from the loader. The FULL logo clip plays once
            from frame 0 the instant the loader (Vid1) lifts (disc → logo rises →
            hover), then crossfades to the seamless hover loop, which "hovers in
            place" (idle-float bob) until first scroll. Container floats + is
            faded out by the scroll timeline. */}
        <div
          ref={idleRef}
          className={`absolute inset-0 z-[3]${introDone ? " idle-float" : ""}`}
          style={{ background: "#050508", transform: "scale(1.04)" }}
        >
          <video
            ref={introRef}
            src="/media/dope-intro.mp4"
            autoPlay
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: introDone ? 0 : 1, transition: "opacity 0.6s ease" }}
          />
          <video
            ref={loopRef}
            src="/media/dope-icon-2-loop.mp4"
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: introDone ? 1 : 0, transition: "opacity 0.6s ease" }}
          />
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
          opening logo animation finishes (introDone); the scroll-driven
          opacity/cursor-follow live on the inner element. */}
      <div style={{ opacity: introDone ? 1 : 0, transition: "opacity 0.7s ease" }}>
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
