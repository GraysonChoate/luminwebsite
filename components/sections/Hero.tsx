"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { createSceneStepper, type SceneStepper } from "@/lib/sceneStepper";
import SceneFilm, { type SceneFilmHandle } from "@/components/hero/SceneFilm";
import {
  STOPS, NODES, CAPTIONS, briefFor, SRC_W, SRC_H, type Brief, type NodeAnchor,
} from "@/lib/heroFilm";
import { HERO_TO_PAGE } from "@/lib/productPages";

/**
 * THE HERO FILM — the approved 4K sequence, played as one continuous movie
 * with ten interactive dwell points.
 *
 * ── WHAT REPLACED WHAT ───────────────────────────────────────────────────
 * This used to be a 478-frame WebP strip scrubbed by scroll, with small
 * `scene-map-*.mp4` loops fading in ON TOP of the frozen strip at each stop.
 * That whole model is gone. It cannot express the approved package, which is 22
 * discrete clips: the picture is now VIDEO end to end, and the transitions play
 * at their own authored 24fps rather than being dragged by a scrollbar.
 *
 * The scroll position still moves, and that is deliberate — engage/disengage,
 * the resize re-pin and the handoff into `EcosystemSequence` are all keyed off
 * it — but it is bookkeeping now, paced to the clip instead of pacing it.
 *
 * ── THE CONTRACT THAT DID NOT CHANGE ─────────────────────────────────────
 * One deliberate gesture advances exactly one leg to exactly one stop. Input
 * arriving during travel is discarded, never queued. The transition finishes
 * regardless of how hard or how often you keep scrolling. The stop then parks
 * and its idle loops natively until a fresh gesture. Reverse works the same way
 * and plays real reversed footage. All of that still lives in
 * `lib/sceneStepper.ts` and none of its arming logic was touched.
 */

/** the ten resting points, evenly spaced across the pinned span.
 *  Even spacing is right now that a leg's LENGTH comes from its clip rather
 *  than from how far apart two anchors happen to sit. The trailing slot is
 *  headroom so the last stop is not sitting on the exit boundary. */
const ANCHORS = STOPS.map((_, i) => (i + 1) / (STOPS.length + 1));

/** a paired stop is one composition: side by side when it fits, otherwise a
 *  centered stack. Both cases stay horizontally centered as a GROUP. */
const PAIR = { rowBreakpoint: 1024, cardWidth: 360, cardHeight: 226, stackedCardHeight: 178, gap: 18 };

/** map a source-space point to screen, matching object-fit:cover + object-position */
function coverPoint(vw: number, vh: number, sx: number, sy: number, focalPct: number) {
  const scale = Math.max(vw / SRC_W, vh / SRC_H);
  const drawnW = SRC_W * scale;
  const drawnH = SRC_H * scale;
  // object-position places the overflow according to the focal percentage —
  // the same arithmetic the browser uses, so the node lands on the object at
  // every width instead of only at the one it was measured on.
  const left = (vw - drawnW) * (focalPct / 100) + sx * scale;
  const top = (vh - drawnH) * 0.5 + sy * scale;
  return { left, top, scale };
}

/** Remember where the visitor was when they left, so the product page can
 *  offer a way BACK THERE rather than always dumping them at the ecosystem.
 *  sessionStorage because it survives the navigation and dies with the tab. */
const rememberReturn = (hash: string) => {
  try { sessionStorage.setItem("lumin:returnTo", hash); } catch { /* private mode */ }
};

const clamp = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.min(Math.max(v, lo), hi));

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const filmRef = useRef<SceneFilmHandle>(null);
  const stepperRef = useRef<SceneStepper | null>(null);

  const [tier, setTier] = useState<"1080" | "720">("1080");
  const [vp, setVp] = useState({ w: 0, h: 0 });
  /** which stop we are PARKED on and settled; -1 = the opening orb, and
   *  -1 also whenever the film is travelling. */
  const [sceneIdx, setSceneIdx] = useState(-1);
  const [resting, setResting] = useState(false);
  /** the caption riding over the current leg; cleared on arrival so the brief
   *  owns the parked frame, exactly as before. */
  const [legCaption, setLegCaption] = useState<string | null>(null);
  const [openingDone, setOpeningDone] = useState(false);
  /** Arriving at /#product-<stop> is a real page load. The film must not play
   *  its opening on the way to the scene the visitor asked for. */
  const [stopCover, setStopCover] = useState(false);
  /**
   * THE BRIEF'S REAL HEIGHT, MEASURED — never estimated.
   *
   * This was a hardcoded guess (300 on mobile, 264 above it) and the guess was
   * wrong: the cards actually render 332-350 tall on a 390px viewport, because
   * the proposition and the three specs wrap differently at every width. The
   * clamp was therefore computing its bottom bound from a card 50px shorter
   * than the real one, and four briefs on mobile — Trainer, Fuel, Station and
   * Academy — hung 25px below the safe band they were supposed to be inside.
   *
   * Copy length is not knowable ahead of layout, so any constant here is a
   * guess that will drift the next time a brief is reworded. Measuring is the
   * only version of this that stays true.
   */
  const briefRef = useRef<HTMLAnchorElement>(null);
  const [briefH, setBriefH] = useState(0);

  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  /** 720p on phones: not for bandwidth so much as for the DECODER, which is
   *  the thing that actually falls over when several 1080p streams are held
   *  open on a mid-range handset. */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setTier(mq.matches ? "720" : "1080");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const onEmerge = () => setOpeningDone(true);
    if ((window as unknown as { __luminEmergeDone?: boolean }).__luminEmergeDone) onEmerge();
    else window.addEventListener("lumin:emergeDone", onEmerge, { once: true });
    return () => window.removeEventListener("lumin:emergeDone", onEmerge);
  }, []);

  useEffect(() => {
    const section = sectionRef.current!;

    /* PARK WHERE THE VISITOR ASKED FOR, NOT ON THE ORB.
       This used to park on the opening orb unconditionally and let the deep
       link swap to the real stop afterwards — so returning from a product page
       played the opening for the better part of a second and THEN cut to the
       gym scene. Resolving the target first means the orb is never loaded on
       that path at all. */
    const stopFromHash = () => {
      const m = /^#product-(.+)$/.exec(window.location.hash);
      if (!m) return -1;
      const want = m[1].toLowerCase();
      return STOPS.findIndex(
        (st) => st.id === want || st.products.some((pr) => pr.toLowerCase().replace(/\s+/g, "-") === want),
      );
    };
    const initialStop = stopFromHash();
    if (initialStop >= 0) setStopCover(true);
    filmRef.current?.parkOn(initialStop >= 0 ? initialStop : -1);

    /* THE CURSOR-FOLLOWING SCROLL HINT IS GONE.
       It was a second, redundant prompt: it trailed the pointer saying the same
       thing as the "Scroll to continue" that already sits under every parked
       scene. Two asks for the same gesture, one of them chasing the mouse, read
       as noise over footage this quiet. The per-scene prompt stays because it is
       load-bearing — the film will not move until it is asked to, so a full stop
       has to be distinguishable from a frozen page. */
    const ctx = gsap.context(() => {}, section);

    const stepper = createSceneStepper({
      section,
      anchors: ANCHORS,
      totalFrames: 1, // unused: legSeconds below supplies every leg's length
      legSeconds: (from, to, dir) => filmRef.current?.legSeconds(from, to, dir) ?? 6,
      travel: async (from, to, dir) => { await filmRef.current?.travel(from, to, dir); },
      onDepart: (dir, to) => {
        setSceneIdx(-1);
        setResting(false);
        const t = typeof to === "number" && to >= 0 && to < STOPS.length ? CAPTIONS[STOPS[to].id] : undefined;
        setLegCaption(t?.text ?? null);
      },
      onPark: () => { setLegCaption(null); },
      onArrive: (i) => { setSceneIdx(i); setResting(true); },
      onExit: () => { setSceneIdx(-1); setResting(false); setLegCaption(null); },
    });
    stepperRef.current = stepper;

    // DEEP LINKS. `#product-station` parks directly on that stop rather than
    // replaying the film up to it — and the next gesture then steps one leg
    // from there, under exactly the same rules as any other stop.
    const hashStop = () => {
      const i = stopFromHash();
      if (i < 0) return;
      filmRef.current?.parkOn(i);
      stepper.parkAt(i);
    };
    /* RESTORE PROPERLY, AND RE-ASSERT.
       Calling this once on mount parked the VIDEO on the right stop but left
       scrollY at 0 with no brief — the section's geometry is not settled on the
       first frame, so `parkAt` computed its anchor against a page that had not
       laid out yet. Deferring a frame and re-asserting a few times lands the
       scroll anchor as well as the picture, which is what makes the brief
       appear and the next gesture behave. */
    let restores = 0;
    const restore = () => {
      ScrollTrigger.refresh();
      hashStop();
      if (++restores < 4) window.setTimeout(restore, 160);
      else window.setTimeout(() => setStopCover(false), 140);
    };
    if (initialStop >= 0) {
      requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(restore, 60)));
    } else {
      hashStop();
    }
    window.addEventListener("hashchange", hashStop);

    return () => {
      window.removeEventListener("hashchange", hashStop);
      stepper.destroy();
      ctx.revert();
    };
  }, []);

  useLayoutEffect(() => {
    const el = briefRef.current;
    if (!el) { setBriefH(0); return; }
    const read = () => setBriefH(el.offsetHeight);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sceneIdx, vp.w, vp.h]);

  const stop = sceneIdx >= 0 ? STOPS[sceneIdx] : undefined;
  const nodes: NodeAnchor[] = stop ? NODES[stop.id] ?? [] : [];
  const paired = nodes.length > 1;

  const renderBriefChildren = (product: string, brief: Brief | undefined) => brief ? (
    <>
      {/* ── HOLOGRAPHIC MATERIALIZATION ────────────────────────────────
             The brief assembles like a projected instrument rather than
             fading in as a card. Order is deliberate and is what sells it:
             the spatial node locks on, the frame's corners snap in, the
             glass interior resolves between them, a scanline sweeps and the
             content lands just behind it, and the connector stem draws last.
             These three layers carry the build; the copy layers ride it. */}
      <span className="hero-brief-glass" aria-hidden="true" />
      <span className="hero-brief-chrome" aria-hidden="true">
        <i /><i /><i /><i />
      </span>
      <span className="hero-brief-scan" aria-hidden="true" />
      <span className="hero-brief-topline">
        <span className="hero-brief-tag">{brief.suite}</span>
        <span className="hero-brief-rail" aria-label={`${brief.rail[0]} powers ${brief.rail[1]}`}>
          <span>{brief.rail[0]}</span>
          <i aria-hidden="true" />
          <strong>{brief.rail[1]}</strong>
        </span>
      </span>
      <span className="hero-brief-main">
        <span className="hero-brief-copy">
          <span className="hero-brief-name">{product}</span>
          <span className="hero-brief-prop">{brief.proposition}</span>
          <span className="hero-brief-specs">
            {brief.specs.map((spec) => <span key={spec}>{spec}</span>)}
          </span>
        </span>
        <span className="hero-brief-media" aria-hidden="true">
          <span className="hero-brief-media-core" />
        </span>
      </span>
      <span className="hero-brief-cta">
        {brief.cta}
        <span aria-hidden="true">›</span>
      </span>
    </>
  ) : (
    <>
      <span className="hero-brief-tag">Lumin</span>
      <span className="hero-brief-name">{product}</span>
      <span className="hero-brief-go" aria-hidden="true">›</span>
    </>
  );

  /* ── SAFE AREA ────────────────────────────────────────────────────────────
     Briefs live strictly inside this box: below the nav, above the scroll
     prompt, and never touching the viewport edge. Every position below is
     clamped into it, so a brief cannot leave the screen at any width. */
  const safePad = vp.w < 720 ? 14 : 24;
  const topSafe = vp.w >= 1024 ? 112 : 96;
  const bottomSafe = 124;

  return (
    <>
    {stopCover && (
      <div
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 300, background: "#05070d", pointerEvents: "none" }}
      />
    )}
    <section ref={sectionRef} data-nav-tone="dark" className="relative h-[500vh]" style={{ background: "var(--c-cosmos)" }}>
      <div className="sticky top-0 h-screen overflow-clip">
        {/* the film — two alternating surfaces, exactly one ever visible */}
        <SceneFilm
          ref={filmRef}
          tier={tier}
          /* The idle is ALREADY running when this fires. Nothing here can delay
             it: the brief's own entrance is gated behind the stepper's settle,
             which happens later and independently. */
          onIdleStart={() => {}}
        />

        {/* ── PRODUCT BRIEFS ───────────────────────────────────────────────
               Neutral white at rest; the suite colour arrives only on
               hover/focus, via the CSS the approved design already uses. */}
        {vp.w > 0 && stop && nodes.length > 0 && (() => {
          const focal = stop.focal;

          if (paired) {
            const rowW = PAIR.cardWidth * nodes.length + PAIR.gap * (nodes.length - 1);
            const asRow = vp.w >= PAIR.rowBreakpoint && vp.w - safePad * 2 >= rowW;
            const cardW = asRow ? PAIR.cardWidth : Math.min(PAIR.cardWidth, vp.w - safePad * 2);
            const cardH = asRow ? PAIR.cardHeight : PAIR.stackedCardHeight;
            const groupW = asRow ? rowW : cardW;
            const groupH = asRow ? cardH : nodes.length * cardH + (nodes.length - 1) * PAIR.gap;
            const groupLeft = clamp((vp.w - groupW) / 2, safePad, Math.max(safePad, vp.w - groupW - safePad));
            const groupTop = clamp(vp.h * 0.26, topSafe, Math.max(topSafe, vp.h - bottomSafe - groupH));

            return (
              <div key={stop.id} className="pointer-events-none absolute inset-0 z-[4]">
                {nodes.map((n, i) => {
                  const brief = briefFor(n.product);
                  const pt = coverPoint(vp.w, vp.h, n.x, n.y, focal);
                  const tone = brief?.suite === "LUMIN ONE" ? "one" : "pro";
                  const cardLeft = groupLeft + (asRow ? i * (cardW + PAIR.gap) : 0);
                  const cardTop = groupTop + (asRow ? 0 : i * (cardH + PAIR.gap));
                  const dockRight = pt.left >= cardLeft + cardW / 2;
                  const dockX = dockRight ? cardLeft + cardW : cardLeft;
                  const dockY = cardTop + cardH / 2;
                  const bend = dockRight ? dockX + 20 : dockX - 20;
                  const href = n.product.toLowerCase().replace(/\s+/g, "-");
                  return (
                    <Fragment key={n.product}>
                      {/* The elbow docks on the card EDGE and never enters it,
                          so no line can cross the text inside. */}
                      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                        <polyline points={`${pt.left},${pt.top} ${bend},${dockY} ${dockX},${dockY}`}
                          fill="none" pathLength={1}
                          stroke={tone === "one" ? "rgba(176,118,214,0.68)" : "rgba(116,174,255,0.64)"}
                          strokeWidth="1" className="hero-cue-line"
                          style={{ filter: tone === "one" ? "drop-shadow(0 0 6px rgba(134,51,153,0.72))" : "drop-shadow(0 0 5px rgba(65,128,255,0.7))" }} />
                        <circle cx={pt.left} cy={pt.top} r="4.5" fill="none" stroke={tone === "one" ? "#f1dcff" : "#cfe2ff"} strokeWidth="1.4" className="hero-cue-ring" />
                        <circle cx={pt.left} cy={pt.top} r="3" fill={tone === "one" ? "#d9b8f0" : "var(--c-supernova)"} className="hero-cue-core" />
                      </svg>
                      <a href={`/products/${HERO_TO_PAGE[href] ?? href}`}
                        onClick={() => rememberReturn(`#product-${stop.id}`)}
                        className={`hero-brief pointer-events-auto absolute${brief ? " hero-brief--hud hero-brief--grouped" : ""}`}
                        data-side="r" data-suite={tone} data-product={href} data-layout={asRow ? "row" : "stack"}
                        style={{ position: "absolute", left: cardLeft, top: cardTop, width: cardW, height: cardH }}>
                        {renderBriefChildren(n.product, brief)}
                      </a>
                    </Fragment>
                  );
                })}
              </div>
            );
          }

          const n = nodes[0];
          const brief = briefFor(n.product);
          const pt = coverPoint(vp.w, vp.h, n.x, n.y, focal);
          const tone = brief?.suite === "LUMIN ONE" ? "one" : "pro";
          const briefW = vp.w <= 640 ? Math.min(vp.w - safePad * 2, 360) : Math.min(410, vp.w - 40);
          // Measured on the previous paint; the first paint of a stop falls back
          // to a deliberately GENEROUS estimate, so the card is never placed too
          // low and then corrected upward — it errs high and settles down.
          const h = briefH || (vp.w <= 640 ? 360 : 280);
          // Every brief is horizontally centered; the anchor only ever decides
          // which SIDE the connector docks on, never where the card sits.
          const cy = clamp(pt.top + (n.y > SRC_H * 0.55 ? -170 : 190), topSafe + h / 2, vp.h - bottomSafe - h / 2);
          const dockRight = pt.left >= vp.w / 2;
          const dockX = dockRight ? vp.w / 2 + briefW / 2 : vp.w / 2 - briefW / 2;
          const bend = dockRight ? dockX + 22 : dockX - 22;
          const href = n.product.toLowerCase().replace(/\s+/g, "-");

          return (
            <div key={stop.id} className="pointer-events-none absolute inset-0 z-[4]">
              {/* Companion is centered AND stemless — no connector to any one
                  machine, because the responsive thing is the floor itself. */}
              {!n.centered && (
                <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                  <polyline points={`${pt.left},${pt.top} ${bend},${pt.top} ${dockX},${cy}`}
                    fill="none" pathLength={1}
                    stroke={tone === "one" ? "rgba(176,118,214,0.68)" : "rgba(116,174,255,0.64)"}
                    strokeWidth="1" className="hero-cue-line"
                    style={{ filter: tone === "one" ? "drop-shadow(0 0 6px rgba(134,51,153,0.72))" : "drop-shadow(0 0 5px rgba(65,128,255,0.7))" }} />
                  <circle cx={pt.left} cy={pt.top} r="4.5" fill="none" stroke={tone === "one" ? "#f1dcff" : "#cfe2ff"} strokeWidth="1.4" className="hero-cue-ring" />
                  <circle cx={pt.left} cy={pt.top} r="3" fill={tone === "one" ? "#d9b8f0" : "var(--c-supernova)"} className="hero-cue-core" />
                </svg>
              )}
              <a ref={briefRef} href={`/products/${HERO_TO_PAGE[href] ?? href}`}
                onClick={() => rememberReturn(`#product-${stop.id}`)}
                className={`hero-brief pointer-events-auto absolute${brief ? " hero-brief--hud" : ""} hero-brief--centered`}
                data-side="center" data-suite={tone} data-product={href}
                style={{ position: "absolute", left: "50%", top: n.centered ? "46%" : cy, width: briefW, transform: "translate(-50%, -50%)" }}>
                {renderBriefChildren(n.product, brief)}
              </a>
            </div>
          );
        })()}

        {/* ── CAPTION ──────────────────────────────────────────────────────
               Rides over the travel and clears on arrival, so the caption and
               the brief are never on screen together. */}
        <div className="pointer-events-none absolute inset-x-0 z-[2]" style={{ top: "68vh" }}>
          <h2 className="type-step mx-auto max-w-[46rem] px-6 text-center text-white"
            style={{
              opacity: legCaption ? 1 : 0,
              transform: legCaption ? "translateY(0)" : "translateY(10px)",
              transition: "opacity .5s ease, transform .5s ease",
              textShadow: "0 2px 24px rgba(10,10,15,0.75), 0 1px 4px rgba(10,10,15,0.6)",
            }}>
            {legCaption ?? ""}
          </h2>
        </div>

        {/* ── SCROLL TO CONTINUE ───────────────────────────────────────────
               The film will not move until it is asked to, so the ask has to be
               on screen — without it a full stop is indistinguishable from a
               page that has frozen. Briefs are clamped clear of this band. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[5vh] z-[6] flex justify-center"
          style={{
            opacity: resting ? 1 : 0,
            transform: resting ? "translateY(0)" : "translateY(8px)",
            transition: "opacity .45s ease, transform .45s ease",
          }}
          aria-hidden={!resting}>
          <span className="hero-continue font-nav">
            Scroll to continue
            <i className="hero-continue-chev" aria-hidden="true" />
          </span>
        </div>

        <div className="hero-film-grade pointer-events-none absolute inset-0" />
      </div>

    </section>
    </>
  );
}
