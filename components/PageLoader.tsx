"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/motion";

/**
 * Load overlay (z-999) — now just a black mask over the first paint.
 *
 * The "Dope icon" opening is a SINGLE baked clip (public/media/dope-intro.mp4 =
 * Vid1 ignition xfade Vid2 rise) that autoplays in the hero from mount, so there
 * is no loader→idle video seam to align. This overlay only hides the hydration
 * flash: it lifts the instant the hero intro reports it is painting frames
 * (`lumin:introPlaying`) — revealing the clip from its own black ignition start,
 * so the reveal is black→black. Redundant escape hatches (min-show floor,
 * wall-clock cap, instant drop when the tab is hidden) guarantee it can't stick.
 */
const MIN_SHOW = 0.3; // seconds — avoid an instant flash-fade of the mask
const MAX_WAIT = 5; // seconds — hard cap even if the intro never signals

export default function PageLoader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const start = performance.now();
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      if (document.visibilityState === "hidden") {
        setDone(true);
        return;
      }
      gsap.to(rootRef.current, {
        autoAlpha: 0,
        duration: 0.6,
        ease: "power2.inOut",
        onComplete: () => setDone(true),
      });
    };

    // lift once the baked intro is actually playing (honoring the min-show floor)
    const onPlaying = () => {
      const wait = Math.max(0, MIN_SHOW * 1000 - (performance.now() - start));
      setTimeout(release, wait);
    };
    if ((window as unknown as { __luminIntroPlaying?: boolean }).__luminIntroPlaying) onPlaying();
    else window.addEventListener("lumin:introPlaying", onPlaying, { once: true });

    const maxTimer = setTimeout(release, MAX_WAIT * 1000);

    return () => {
      window.removeEventListener("lumin:introPlaying", onPlaying);
      clearTimeout(maxTimer);
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[999]"
      style={{ background: "#050508" }}
      aria-hidden="true"
    />
  );
}
