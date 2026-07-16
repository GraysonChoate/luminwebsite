"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { ABOUT } from "@/lib/copy";
import { WIPE_MASK, SHINE, clamp01 } from "@/lib/textFx";

/**
 * Origin statement — a held beat, not a drive-by. Desktop pins the frame for
 * ~2.4 screens while the three headline lines materialize one after another
 * in the site's copy language (gray ghost → left→right wipe to Cosmos →
 * Supernova shine scan), then the body settles in and the frame holds.
 *
 * Accent: ONE living connector (the ProductStory dialect) — a hairline that
 * sprouts from the left margin toward whichever line is materializing,
 * stopping a fixed standoff short of the copy with a Supernova terminal,
 * retracting and re-aiming between lines. It is driven by the same scroll
 * state as the wipes and measured against the copy's own geometry, so it can
 * never touch the text. (Replaced CircuitNetwork: its random branch fans and
 * land-6px-from-the-glyphs connectors read as rods poking the copy.)
 *
 * Mobile stays natural flow with a simple staggered fade-up.
 */
const LINE_START = 0.06; // progress where line 0 begins wiping
const LINE_STEP = 0.16; // stagger between lines
const LINE_DUR = 0.16; // wipe duration per line
const STANDOFF = 64; // no-touch radius: the connector always stops this far from the copy

export default function About() {
  const ref = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const connRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      const lines = el.querySelectorAll<HTMLElement>("[data-line]");
      const body = el.querySelector<HTMLElement>("[data-body]")!;

      const geo = { len: 0, targets: [] as { x: number; y: number }[] };
      let lastK = -1;
      const measure = () => {
        const svg = svgRef.current;
        if (!svg) return;
        const f = svg.getBoundingClientRect();
        svg.setAttribute("viewBox", `0 0 ${f.width} ${f.height}`);
        geo.targets = [...lines].map((line) => {
          const r = line.getBoundingClientRect();
          return { x: r.left - f.left - STANDOFF, y: r.top - f.top + r.height / 2 };
        });
        lastK = -1; // re-aim after re-measure
      };
      // point the connector at headline line k: margin → run → 45° elbow →
      // approach, terminating at the standoff boundary
      const aim = (k: number) => {
        const t = geo.targets[k];
        const path = connRef.current;
        if (!t || !path) return;
        const x0 = 24;
        const run = Math.max(40, (t.x - x0 - 40) * 0.4);
        path.setAttribute("d", `M ${x0} ${t.y - 40} h ${run} l 40 40 h ${Math.max(20, t.x - x0 - run - 40)}`);
        geo.len = path.getTotalLength();
        path.style.strokeDasharray = String(geo.len);
        const end = path.getPointAtLength(geo.len);
        dotRef.current?.setAttribute("cx", String(end.x));
        dotRef.current?.setAttribute("cy", String(end.y));
        lastK = k;
      };

      const render = (p: number) => {
        lines.forEach((line, i) => {
          const t0 = LINE_START + i * LINE_STEP;
          line.style.setProperty("--w", String(clamp01((p - t0) / LINE_DUR)));
          line.style.setProperty("--s", String(clamp01((p - t0 - 0.1) / 0.2)));
        });
        const bp = clamp01((p - 0.62) / 0.18);
        body.style.opacity = String(bp);
        body.style.transform = `translateY(${(1 - bp) * 28}px)`;
        // connector aims at the line currently materializing; drawn while a
        // line is landing, retracted mid-hand-off, gone once the statement
        // completes (so the body settles into a clean frame)
        const lineFloat = (p - LINE_START) / LINE_STEP;
        const k = Math.min(lines.length - 1, Math.max(0, Math.round(lineFloat)));
        if (k !== lastK) aim(k);
        const near = clamp01(1 - Math.abs(lineFloat - k) * 2.4);
        if (connRef.current && geo.len) {
          connRef.current.style.strokeDashoffset = String(geo.len * (1 - near));
          connRef.current.style.opacity = String(0.5 * near);
        }
        if (dotRef.current) dotRef.current.style.opacity = String(near ** 6);
      };

      measure();
      render(0);
      let resizeT: ReturnType<typeof setTimeout>;
      const onResize = () => {
        clearTimeout(resizeT);
        resizeT = setTimeout(measure, 150);
      };
      window.addEventListener("resize", onResize);
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        onUpdate: (self) => render(self.progress),
      });
      return () => {
        st.kill();
        window.removeEventListener("resize", onResize);
        clearTimeout(resizeT);
        // no inline residue for the mobile layout
        body.style.opacity = "";
        body.style.transform = "";
        lines.forEach((line) => {
          line.style.removeProperty("--w");
          line.style.removeProperty("--s");
        });
      };
    });

    // <lg: plain staggered fade-up (WIPE_MASK's --w default of 1 keeps the
    // dark layer fully materialized without a driver)
    mm.add("(max-width: 1023px)", () => {
      gsap.fromTo(
        el.querySelectorAll("[data-line], [data-body]"),
        { opacity: 0, y: 18 },
        {
          opacity: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 75%", toggleActions: "play none none reverse" },
        }
      );
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={ref} id="about" className="relative overflow-clip bg-white lg:h-[240vh]">
      <div className="container-pad relative flex flex-col justify-center py-32 lg:sticky lg:top-0 lg:h-screen lg:py-0">
        <svg
          ref={svgRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
        >
          <path ref={connRef} fill="none" stroke="var(--c-supernova)" strokeWidth="1.2" opacity="0" />
          <circle ref={dotRef} r="3.5" fill="none" stroke="var(--c-supernova)" strokeWidth="1.2" opacity="0" />
        </svg>
        {/* copy sits on the RIGHT side of the frame; the column is sized to
            hug the longest headline line so the block reads flush-right */}
        <div className="relative z-[1] w-full lg:ml-auto lg:max-w-[min(44rem,51vw)]">
          <h2 className="type-origin mb-12">
            {ABOUT.headline.map((line, i) => (
              <span key={i} data-line className="relative block">
                <span style={{ color: "var(--c-meteor)" }}>{line}</span>
                <span
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{ color: "var(--c-cosmos)", WebkitMaskImage: WIPE_MASK, maskImage: WIPE_MASK }}
                >
                  {line}
                </span>
                <span aria-hidden="true" className="absolute inset-0" style={SHINE}>
                  {line}
                </span>
              </span>
            ))}
          </h2>
          <p data-body className="max-w-[36rem] text-[17px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {ABOUT.body}
          </p>
        </div>
      </div>
    </section>
  );
}
