"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/motion";

/**
 * Opening loader (z-999) — plays the "Orb Emerge" clip full-screen on black,
 * then lifts, revealing the hero's looping "Orb Stationary" idle beneath it.
 * Signals `lumin:emergeDone` on lift (the hero ungates its scroll hint on it).
 * Escape hatches: play to `ended`, wheel/touch skip after a floor, hard cap,
 * instant drop when the tab is hidden.
 */
const MIN_SHOW = 0.8; // seconds — floor before a wheel/touch may skip the emerge
const MAX_WAIT = 13; // seconds — hard cap even if the clip never fires `ended`
/** Lift two seconds before the clip ends.
 *  The emerge runs 10.03s but it never actually settles — the orb keeps
 *  breathing right to the last frame, so handing over to the hero's idle loop
 *  is a soft cut wherever you make it. Measured against the idle loop's first
 *  frame: at 8.0s the difference is 6.51/255, at 9.9s it is 6.18 — the same.
 *  So the last two seconds cost time and buy nothing. The clip's own speed is
 *  untouched; it simply hands over sooner. */
const LIFT_AT = 8.0;

export default function PageLoader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  /**
   * SKIP THE OPENING WHEN THE VISITOR ASKED FOR SOMEWHERE ELSE.
   *
   * This loader sits at z-[999], above everything, and plays the orb-emerge
   * clip on every load. That is right for arriving at the film's start — and
   * wrong for a deep link: returning from a product page to `#ecosystem` or to
   * `#product-<stop>` made the visitor sit through the whole opening before
   * being taken where the link said. The sections below cover their own
   * arrivals, but their covers are BENEATH this one, so nothing they did could
   * help. Deep links start already-lifted.
   */
  const deepLink =
    typeof window !== "undefined" && /^#(ecosystem|product-|cta|schedule)/.test(window.location.hash);
  const [done, setDone] = useState(deepLink);

  useEffect(() => {
    if (deepLink) {
      // downstream still needs the signal it waits on
      (window as unknown as { __luminEmergeDone?: boolean }).__luminEmergeDone = true;
      window.dispatchEvent(new Event("lumin:emergeDone"));
      return;
    }
    const v = videoRef.current;
    if (v) v.play().catch(() => setVideoFailed(true));

    const start = performance.now();
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      (window as unknown as { __luminEmergeDone?: boolean }).__luminEmergeDone = true;
      window.dispatchEvent(new Event("lumin:emergeDone"));
      if (document.visibilityState === "hidden") {
        setDone(true);
        return;
      }
      gsap.to(rootRef.current, {
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.inOut",
        onComplete: () => setDone(true),
      });
    };

    const onEnded = () => release();
    v?.addEventListener("ended", onEnded);

    const liftTimer = setTimeout(release, LIFT_AT * 1000);
    const maxTimer = setTimeout(release, MAX_WAIT * 1000);
    const onIntent = () => {
      if ((performance.now() - start) / 1000 >= MIN_SHOW) release();
    };
    window.addEventListener("wheel", onIntent, { passive: true });
    window.addEventListener("touchstart", onIntent, { passive: true });

    return () => {
      v?.removeEventListener("ended", onEnded);
      window.removeEventListener("wheel", onIntent);
      window.removeEventListener("touchstart", onIntent);
      clearTimeout(liftTimer);
      clearTimeout(maxTimer);
    };
  }, [deepLink]);

  // if the clip fails to decode, don't hold the page — drop after the floor
  useEffect(() => {
    if (!videoFailed) return;
    const t = setTimeout(() => {
      (window as unknown as { __luminEmergeDone?: boolean }).__luminEmergeDone = true;
      window.dispatchEvent(new Event("lumin:emergeDone"));
      setDone(true);
    }, 400);
    return () => clearTimeout(t);
  }, [videoFailed]);

  if (done) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
      style={{ background: "#050508" }}
      aria-hidden="true"
    >
      {!videoFailed && (
        <video
          ref={videoRef}
          src="/media/orb-emerge.mp4"
          muted
          playsInline
          preload="auto"
          onError={() => setVideoFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
