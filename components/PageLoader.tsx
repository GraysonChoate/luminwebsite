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

export default function PageLoader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
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
      clearTimeout(maxTimer);
    };
  }, []);

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
