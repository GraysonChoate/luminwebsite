"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { setupMotion, gsap, ScrollTrigger } from "@/lib/motion";

let lenisInstance: Lenis | null = null;
export function getLenis() {
  return lenisInstance;
}

export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    setupMotion();

    // Silence ONE known-harmless upstream deprecation: @react-three/fiber's
    // useFrame hands components a THREE.Clock, which three 0.185 flags as
    // deprecated. It's cosmetic (dev-only "Issue" badge) and out of our
    // control until fiber updates — filter just this exact message.
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      if (typeof args[0] === "string" && args[0].includes("THREE.Clock")) return;
      origWarn(...(args as Parameters<typeof console.warn>));
    };

    // A scroll-driven page must ALWAYS begin at the top. Browser scroll
    // restoration would otherwise reload mid-page — past the pinned hero —
    // leaving a black canvas and a loader lifting onto broken-looking
    // content. Disable it and force the top before anything paints.
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    // Returning via the browser's back/forward cache resurrects the page
    // frozen mid-scroll with stale measurements (and possibly a resized
    // viewport) — none of the setup effects re-run. A fresh load is the only
    // state every scroll rig can trust.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);

    // lerp slightly below default: a touch more glide/settle on wheel stops,
    // which smooths every scrubbed animation downstream of the scroll value
    const lenis = new Lenis({ lerp: 0.085 });
    lenisInstance = lenis;
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis; // debug/introspection hook
    lenis.scrollTo(0, { immediate: true });

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    // one refresh after first layout so ScrollTrigger measures from the top
    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  return <>{children}</>;
}
