"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { PRODUCT } from "@/lib/copy";
import { WIPE_MASK, SHINE, clamp01 } from "@/lib/textFx";

/**
 * Numbered system story — Terminal-style CONTINUOUS RISING STACK of phrases.
 *
 * All phrases live in one column that translates upward with scroll. A fixed
 * "reveal line" sits ~39% down a clipped window. Each phrase, by its distance
 * `d` from that line:
 *   - below the line (d>0): faint GRAY ghost, readable, waiting
 *   - crossing the line (d→0): a left→right gradient wipe fills it GRAY→dark
 *     green (fully materialized at the line)
 *   - above the line (d<0): fades out and scrolls off the top
 * The next phrase is always already rising in behind the active one.
 *
 * Driven imperatively from one scrubbed ScrollTrigger onUpdate (no rAF, no
 * keyed remount) — the transform/wipe/opacity are set directly on the DOM;
 * React state only tracks the active index for the media crossfade.
 *
 * Mobile (<lg): horizontal swipe list, unchanged.
 */
const N = PRODUCT.steps.length;
const ITEM = 150; // px slot height per phrase
const WINDOW_H = 380; // px visible reveal window
const REVEAL_Y = 150; // px from window top → the reveal line
// Copy width shared with the wash mask via --ps-copy-w / --ps-copy-edge in
// globals.css — the same numbers the connector SVG re-derives in measure().
const COPY_W_MAX = 480; // = 30rem
const COPY_W_VW = 0.38;

// The media is ONE continuous background film (Lumin Studio sizzle) across the
// whole section — it plays/loops the entire time while the copy rises over it.

// (Edge treatment lives in globals.css as .ps-media-mask — a white wash that
// zeroes the media over the copy half and dissolves it in toward the right.)

export default function ProductStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const swipeRef = useRef<HTMLUListElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const copyWinRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const connRef = useRef<SVGPathElement>(null);
  const connDotRef = useRef<SVGCircleElement>(null);
  const railRef = useRef<SVGLineElement>(null);
  const nodeRef = useRef<SVGCircleElement>(null);
  const [active, setActive] = useState(0);

  // The loop runs from page load and NEVER pauses — visitors must always
  // land on footage already mid-play (no start-up moment, no resume hitch),
  // whether arriving for the first time or scrolling back in.
  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  // gsap.matchMedia scopes the desktop scroll rig to ≥1024px: it is torn down
  // (ScrollTrigger killed + inline styles cleared) the moment the window
  // shrinks below the breakpoint, and rebuilt when it grows back — resizing
  // can no longer leave a stale trigger driving a hidden layout.
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      // ── living-network accents ──
      // One hairline connector sprouts from the reveal line toward the media
      // and one charge node travels a left-edge rail with section progress.
      // Both are driven by the SAME scroll state as the copy, and the
      // connector's start point derives from the SAME copy-width formula as
      // --ps-copy-w in globals.css — they cannot collide with the text.
      const geo = { connLen: 0, railY1: 0, railY2: 0 };
      const measure = () => {
        const svg = svgRef.current;
        const win = copyWinRef.current;
        const path = connRef.current;
        if (!svg || !win || !path) return;
        const f = svg.getBoundingClientRect();
        const w = win.getBoundingClientRect();
        svg.setAttribute("viewBox", `0 0 ${f.width} ${f.height}`);
        const copyW = Math.min(COPY_W_MAX, f.width * COPY_W_VW);
        const startX = w.left - f.left + copyW + 20;
        const lineY = w.top - f.top + REVEAL_Y;
        const segA = Math.max(40, f.width * 0.045);
        const segB = Math.max(70, f.width * 0.07);
        path.setAttribute("d", `M ${startX} ${lineY} h ${segA} l 40 40 h ${segB}`);
        geo.connLen = path.getTotalLength();
        path.style.strokeDasharray = String(geo.connLen);
        const end = path.getPointAtLength(geo.connLen);
        connDotRef.current?.setAttribute("cx", String(end.x));
        connDotRef.current?.setAttribute("cy", String(end.y));
        const railX = Math.max(16, (w.left - f.left) * 0.45);
        geo.railY1 = f.height * 0.2;
        geo.railY2 = f.height * 0.8;
        railRef.current?.setAttribute("x1", String(railX));
        railRef.current?.setAttribute("x2", String(railX));
        railRef.current?.setAttribute("y1", String(geo.railY1));
        railRef.current?.setAttribute("y2", String(geo.railY2));
        nodeRef.current?.setAttribute("cx", String(railX));
      };

      const render = (progress: number) => {
        const activeFloat = progress * (N - 1);
        setActive(Math.round(activeFloat)); // React bails if unchanged (only flips at boundaries)
        const list = listRef.current;
        if (!list) return;
        list.style.transform = `translateY(${REVEAL_Y - (activeFloat * ITEM + ITEM / 2)}px)`;
        list.querySelectorAll<HTMLElement>("[data-phrase]").forEach((el, i) => {
          const d = i - activeFloat; // 0 = at line, <0 above, >0 below
          const wipe = clamp01((0.55 - d) / 0.45); // gray→dark fill as it reaches the line
          const shine = clamp01((0.1 - d) / 0.45); // light band scans once the wipe lands
          const op = Math.min(clamp01(1 + d * 1.4 + 0.2), clamp01(1 - d * 0.42)) || 0.1;
          el.style.setProperty("--w", String(wipe));
          el.style.setProperty("--s", String(shine));
          el.style.opacity = String(Math.max(op, d > 0 ? 0.1 : 0));
        });
        // connector: fully drawn while a phrase rests at the line, retracts
        // during the hand-off to the next phrase, redraws as it lands
        const frac = activeFloat - Math.round(activeFloat); // -0.5..0.5
        const near = clamp01(1 - Math.abs(frac) * 2.4);
        if (connRef.current && geo.connLen) {
          connRef.current.style.strokeDashoffset = String(geo.connLen * (1 - near));
          connRef.current.style.opacity = String(0.55 * near);
        }
        if (connDotRef.current) connDotRef.current.style.opacity = String(near ** 6);
        // charge node: travels the rail with overall section progress
        nodeRef.current?.setAttribute(
          "cy",
          String(geo.railY1 + progress * (geo.railY2 - geo.railY1))
        );
        // Continuous background film: constant loop, playback never touched by
        // scroll. Scroll only drives a soft edge fade (in/out at the section
        // ends) plus a slow cinematic push-in + vertical parallax, so the
        // footage has depth and drift as the copy rises over it.
        if (videoRef.current) {
          const fade = clamp01(Math.min(progress / 0.06, (1 - progress) / 0.06));
          const sc = 1.06 + progress * 0.08; // 1.06 → 1.14 slow zoom
          const drift = (progress - 0.5) * 36; // −18 → +18px parallax
          videoRef.current.style.opacity = String(fade);
          videoRef.current.style.transform = `translateY(${drift.toFixed(1)}px) scale(${sc.toFixed(3)})`;
        }
      };

      measure();
      render(0);
      let resizeT: ReturnType<typeof setTimeout>;
      const onResize = () => {
        clearTimeout(resizeT);
        resizeT = setTimeout(measure, 150);
      };
      window.addEventListener("resize", onResize);
      // scrub 0.5: the rising stack eases toward the scroll position instead
      // of tracking it raw — smoother phrase travel on discrete wheel steps
      const st = ScrollTrigger.create({
        trigger: sectionRef.current!,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        onUpdate: (self) => render(self.progress),
      });
      return () => {
        st.kill();
        window.removeEventListener("resize", onResize);
        clearTimeout(resizeT);
        // leave no inline residue for the mobile layout
        if (videoRef.current) {
          videoRef.current.style.opacity = "";
          videoRef.current.style.transform = "";
        }
        const list = listRef.current;
        if (list) {
          list.style.transform = "";
          list.querySelectorAll<HTMLElement>("[data-phrase]").forEach((el) => {
            el.style.opacity = "";
            el.style.removeProperty("--w");
            el.style.removeProperty("--s");
          });
        }
      };
    });
    return () => mm.revert();
  }, []);

  const onSwipeScroll = () => {
    const el = swipeRef.current;
    if (!el || window.matchMedia("(min-width: 1024px)").matches) return;
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    const stride = card.offsetWidth + 16;
    setActive(Math.max(0, Math.min(N - 1, Math.round(el.scrollLeft / stride))));
  };

  return (
    <section
      ref={sectionRef}
      id="platform"
      // overflow-x-clip, not hidden: the media video is scaled ~1.06 for parallax,
      // so at lg (where the mask goes overflow-visible) it sat 48px proud of each
      // edge and pushed the whole DOCUMENT 38px wider than the window — a
      // horizontal scrollbar on every desktop width. `clip` does not create a
      // scroll container, so the sticky children keep working.
      className="relative overflow-x-clip bg-white lg:h-[var(--story-h)]"
      style={{ "--story-h": `${(N - 1) * 60 + 100}vh` } as React.CSSProperties}
    >
      <div className="relative flex flex-col py-24 lg:sticky lg:top-0 lg:h-screen lg:justify-center lg:py-0">
        {/* MEDIA BACKGROUND — full-bleed across the pinned frame on desktop.
            The .ps-media-mask wash holds the media at ZERO alpha over the
            copy half (pure page white under the text), dissolving the footage
            in toward the right edge; right/top/bottom run clean to the frame.
            On mobile it renders as an in-flow band below the swipe copy.
            Accumulating opacity/z-index stack unchanged — reverse-scroll
            stays instant. */}
        <div
          data-step={active}
          className="ps-media-mask relative order-2 mx-[var(--container-pad)] h-[260px] overflow-hidden rounded-[var(--radius-media)] lg:absolute lg:inset-0 lg:mx-0 lg:order-none lg:h-auto lg:overflow-visible lg:rounded-none"
          style={{ opacity: 0.9, filter: "saturate(0.78)" }}
          aria-hidden="true"
        >
          {/* dark base under the film so any letterbox edge never flashes white */}
          <div className="absolute inset-0" style={{ background: "var(--c-cosmos)" }} />
          {/* ONE continuous Lumin Studio film across the whole section: constant
              loop, always playing; the render loop drives its edge fade +
              cinematic push-in/parallax. */}
          <video
            ref={videoRef}
            src="/media/studio-film.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ willChange: "transform, opacity", transformOrigin: "60% 50%" }}
          />
        </div>

        {/* living-network accents: charge rail + phrase connector, positioned
            and driven entirely by the copy's own geometry and scroll state */}
        <svg
          ref={svgRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] hidden h-full w-full lg:block"
        >
          <line ref={railRef} stroke="var(--hairline)" strokeWidth="1" />
          <circle ref={nodeRef} r="3" fill="var(--c-supernova)" />
          <path ref={connRef} fill="none" stroke="var(--c-supernova)" strokeWidth="1.2" opacity="0" />
          <circle ref={connDotRef} r="3.5" fill="none" stroke="var(--c-supernova)" strokeWidth="1.2" opacity="0" />
        </svg>
        <div className="container-pad relative z-10 order-1 grid w-full grid-cols-1 gap-10 lg:order-none lg:grid-cols-12 lg:items-center">
          {/* left rail: the rising phrase stack (desktop) */}
          <div className="lg:col-span-5">
            <div ref={copyWinRef} className="relative hidden lg:block" style={{ height: WINDOW_H, overflow: "hidden" }}>
              <ul ref={listRef} className="absolute inset-x-0 top-0 will-change-transform">
                {PRODUCT.steps.map((step, i) => (
                  <li
                    key={i}
                    data-phrase
                    className="flex items-center"
                    style={{ height: ITEM, maxWidth: "var(--ps-copy-w)" }}
                  >
                    <span className="type-step relative inline-block">
                      <span style={{ color: "var(--c-meteor)" }}>{step}</span>
                      <span
                        aria-hidden="true"
                        className="absolute inset-0"
                        style={{ color: "var(--c-cosmos)", WebkitMaskImage: WIPE_MASK, maskImage: WIPE_MASK }}
                      >
                        {step}
                      </span>
                      <span aria-hidden="true" className="absolute inset-0" style={SHINE}>
                        {step}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {/* mobile: horizontal swipe */}
            <ul
              ref={swipeRef}
              onScroll={onSwipeScroll}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 lg:hidden"
            >
              {PRODUCT.steps.map((step, i) => (
                <li key={i} className="type-step w-[80vw] shrink-0 snap-start" style={{ color: "var(--c-cosmos)" }}>
                  {step}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
