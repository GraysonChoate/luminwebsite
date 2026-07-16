"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { getLenis } from "@/components/SmoothScroll";
import { gsap } from "@/lib/motion";

/**
 * Lumin Product Ecosystem — the centerpiece. A PINNED ARRIVAL so it can't be
 * swiped past: the section is tall (200vh) with a sticky 100svh frame, so the
 * scene stays fixed on screen for a full extra viewport of scroll — a forced
 * dwell. As the visitor arrives, the collapsed sphere scales + rises into place
 * (a cinematic "arrival"), then holds pinned while the scene's "click the core"
 * hint invites entry.
 *
 *   ARRIVING — sphere scales/opacity/translateY driven by scroll into the pin.
 *              Core clicks are gated until it has fully arrived (entRef).
 *   CLOSED   — pinned, held; the scene's "click the core to open" hint is the CTA.
 *   OPEN     — clicking the core unfolds the ecosystem AND locks the page: the
 *              visitor is held in, exploring nodes/suites, until they close it.
 *              Clicking the center core again (scene hint: "click the icon to
 *              exit") collapses it back to the sphere and releases the lock.
 *
 * The unfold runs OFF the core interaction, never off scroll. We drive it
 * ourselves via Entrance.setUnfoldProgress (scrub-safe → runs backward for the
 * collapse), so the open↔close cycle is fully repeatable without any scene API
 * changes. The scene's native click is disabled (external mode); we hit-test
 * clicks near the screen center (against the STICKY frame) to toggle.
 */

const EcosystemScene = dynamic(
  () => import("@/components/lumin-ecosystem/EcosystemScene"),
  { ssr: false, loading: () => <Dark /> }
);

function Dark() {
  return <div className="h-full w-full" style={{ background: "#050508" }} />;
}

const SCROLL_KEYS = new Set([
  " ", "Spacebar", "PageUp", "PageDown", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End",
]);
const isEcoUI = (t: EventTarget | null) => t instanceof Element && !!t.closest("[data-eco-ui]");

export default function EcosystemBeat() {
  const sectionRef = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [onscreen, setOnscreen] = useState(false);
  const [open, setOpen] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);

  const retries = useRef(0);
  const openRef = useRef(false);
  openRef.current = open;
  const onscreenRef = useRef(false);
  onscreenRef.current = onscreen;
  const busyRef = useRef(false); // mid open/close animation
  const progRef = useRef(0); // current unfold progress (0..1)
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const stickyRef = useRef<HTMLDivElement>(null); // the pinned 100svh frame
  const sceneWrapRef = useRef<HTMLDivElement>(null); // entrance transform target
  const entRef = useRef(0); // scene arrival progress 0..1 (gates opening)

  // Drive the unfold progress ourselves (open = 1, closed = 0). Scrub-safe, so
  // the same call collapses when target < current.
  const animateUnfold = useCallback((target: number, duration: number, onDone?: () => void) => {
    import("@/components/lumin-ecosystem/Entrance").then((e) => {
      tweenRef.current?.kill();
      busyRef.current = true;
      const o = { p: progRef.current };
      tweenRef.current = gsap.to(o, {
        p: target,
        duration,
        ease: target > o.p ? "power2.out" : "power2.in",
        onUpdate: () => {
          progRef.current = o.p;
          e.setUnfoldProgress(o.p);
        },
        onComplete: () => {
          busyRef.current = false;
          onDone?.();
        },
      });
    });
  }, []);

  const openEco = useCallback(() => {
    if (openRef.current || busyRef.current) return;
    setOpen(true); // locks immediately (effect keys on `open`)
    animateUnfold(1, 3.0);
  }, [animateUnfold]);

  const closeEco = useCallback(() => {
    if (!openRef.current || busyRef.current) return;
    // stay locked through the collapse; release only when fully closed
    animateUnfold(0, 2.2, () => setOpen(false));
  }, [animateUnfold]);

  // ── mount gate ──
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "100% 0px 100% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ── visibility: `onscreen` gates the scene's fixed chrome + core hit-test;
  //    `inView` gates the CTA ──
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setOnscreen(e.intersectionRatio > 0.01),
      { threshold: [0, 0.01, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ── ARRIVAL: as the tall section scrolls into the pin, the collapsed sphere
  //    scales + rises + fades into place (a cinematic "arrival"), then holds at
  //    full through the pinned dwell. entRef tracks progress so the core click
  //    can't fire until the scene has fully arrived. Driven off window scroll
  //    (Lenis emits it); recomputed on resize. ──
  useEffect(() => {
    if (!near) return;
    const el = sectionRef.current;
    const wrap = sceneWrapRef.current;
    if (!el || !wrap) return;
    const apply = () => {
      if (openRef.current) {
        // open: hold fully arrived (fixed scene chrome positions to the viewport)
        wrap.style.transform = "none";
        wrap.style.opacity = "1";
        entRef.current = 1;
        return;
      }
      const vh = window.innerHeight;
      const top = el.getBoundingClientRect().top;
      // 0 when the section is a bit over half into view → 1 once it reaches the pin
      const e = Math.max(0, Math.min(1, (vh * 0.55 - top) / (vh * 0.55)));
      const eo = 1 - (1 - e) * (1 - e); // easeOutQuad
      entRef.current = eo;
      wrap.style.transform = `translateY(${(1 - eo) * 46}px) scale(${0.74 + 0.26 * eo})`;
      wrap.style.opacity = String(Math.min(1, eo * 1.3));
    };
    apply();
    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, [near]);

  // ── scene setup: establish EXTERNAL unfold control (collapsed) so the
  //    scene's native one-shot core-click is disabled and WE own open/close ──
  useEffect(() => {
    if (!near) return;
    let cancelled = false;
    import("@/components/lumin-ecosystem/Entrance").then((e) => {
      if (!cancelled) e.setUnfoldProgress(progRef.current); // 0 = collapsed
    });
    return () => {
      cancelled = true;
    };
  }, [near, sceneKey]);

  // ── CORE CLICK: hit-test clicks near the screen center (where the logo core
  //    sits in both states). Non-center clicks fall through to the scene (node
  //    hover/click/zoom). Toggles open↔closed. ──
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      if (busyRef.current || !onscreenRef.current || isEcoUI(ev.target)) return;
      const inner = stickyRef.current;
      if (!inner) return;
      const r = inner.getBoundingClientRect();
      if (Math.abs(r.top) > window.innerHeight * 0.5) return; // pinned scene must fill view
      if (!openRef.current && entRef.current < 0.9) return; // don't open mid-arrival
      const dx = ev.clientX - window.innerWidth / 2;
      const dy = ev.clientY - window.innerHeight / 2;
      const R = Math.min(window.innerWidth, window.innerHeight) * 0.13; // core radius
      if (Math.hypot(dx, dy) < R) {
        openRef.current ? closeEco() : openEco();
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [openEco, closeEco]);

  // ── SCROLL LOCK while OPEN. No body reflow → no jump. ──
  useEffect(() => {
    if (!open) return;
    const lenis = getLenis();
    lenis?.stop();
    const block = (ev: Event) => ev.preventDefault();
    const onKey = (ev: KeyboardEvent) => {
      if (SCROLL_KEYS.has(ev.key) && !isEcoUI(ev.target)) ev.preventDefault();
    };
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // ── WebGL context-loss recovery ──
  useEffect(() => {
    if (!near) return;
    const host = sectionRef.current;
    if (!host) return;
    let canvas: HTMLCanvasElement | null = null;
    const onLost = (e: Event) => {
      e.preventDefault();
      console.warn("[Ecosystem] WebGL context lost — attempting restore");
    };
    const onRestored = () => {
      if (retries.current < 3) {
        retries.current += 1;
        setSceneKey((k) => k + 1);
      }
    };
    const t = setTimeout(() => {
      canvas = host.querySelector("canvas");
      canvas?.addEventListener("webglcontextlost", onLost as EventListener);
      canvas?.addEventListener("webglcontextrestored", onRestored as EventListener);
    }, 600);
    return () => {
      clearTimeout(t);
      canvas?.removeEventListener("webglcontextlost", onLost as EventListener);
      canvas?.removeEventListener("webglcontextrestored", onRestored as EventListener);
    };
  }, [near, sceneKey]);

  return (
    <section
      ref={sectionRef}
      id="ecosystem"
      data-eco-open={open}
      className="relative w-full"
      style={{ height: "200vh", background: "#050508" }}
    >
      {/* sticky pinned frame — the scene holds on screen for the full extra
          viewport of scroll (the forced dwell) */}
      <div
        ref={stickyRef}
        className="sticky top-0 overflow-hidden"
        style={{ height: "100svh", visibility: open || onscreen ? "visible" : "hidden" }}
      >
        {/* arrival-transform wrapper: scaled/faded/lifted into place by the
            arrival effect (imperative transform/opacity — NOT in the style prop,
            so re-renders can't clobber it). The scene owns all UI: its native
            "click the core to open" hint is the CTA; the core click (hit-tested
            in the effect above) toggles open↔closed. */}
        <div
          ref={sceneWrapRef}
          className="absolute inset-0"
          style={{ willChange: "transform, opacity", transformOrigin: "50% 50%" }}
        >
          <SceneBoundary key={sceneKey} fallback={<Dark />}>
            {near ? <EcosystemScene /> : <Dark />}
          </SceneBoundary>
        </div>
      </div>
    </section>
  );
}

/** Confines any WebGL render error to this section. Keyed by sceneKey. */
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[Ecosystem] scene crashed — contained, page unaffected:", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
