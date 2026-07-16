"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

/**
 * Motion foundation. Parameters derive from the terminal-audit measurements:
 * - all pinning is CSS sticky; ScrollTrigger only reads progress (scrub)
 * - custom eases: fastInOut (masks/panels), notch (shape morphs)
 * - lagSmoothing(0) + ignoreMobileResize for scrub stability
 */
let registered = false;

export function setupMotion() {
  if (registered || typeof window === "undefined") return;
  registered = true;
  gsap.registerPlugin(ScrollTrigger, CustomEase);
  CustomEase.create("fastInOut", "0.52,0,0,1");
  CustomEase.create("notch", "0.67,0.05,0.43,1");
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

// Register on client import — child components' effects run before the
// SmoothScroll provider's effect, so registration can't wait for it.
setupMotion();

/** Standard reveal defaults measured from the reference motion language. */
export const REVEAL_DEFAULTS = {
  duration: 1,
  ease: "expo.out",
  charStagger: 0.03,
  y: 24,
};

export { gsap, ScrollTrigger };
