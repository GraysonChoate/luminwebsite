"use client";

import { useEffect, useState } from "react";
import { NAV } from "@/lib/copy";
import { getLenis } from "@/components/SmoothScroll";

/**
 * Constant fixed nav pill: present from the moment the loader lifts (the orb
 * emerge covers it while playing), including over the stationary idle loop, and
 * throughout the whole site. Items anchor-scroll to page sections via Lenis.
 *
 * ── IT HAS TO INVERT ON WHITE ────────────────────────────────────────────
 * The pill was built for the dark hero and ecosystem: a translucent Cosmos
 * wash with white type. Over the white void that reads as an opaque grey slab
 * with unreadable contrast — and once scroll ends at the Launchpad this pill
 * is the ONLY exit, so it cannot be the thing that stops working.
 *
 * It samples the actual page behind it rather than guessing from scroll
 * position: one canvas read per rAF-throttled scroll event, at the pill's own
 * screen rect, off whichever canvas or video is painting there. Sampling beats
 * hardcoding section ranges, because the sections now change length whenever a
 * clip is retimed.
 */
export default function NavPill() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [onLight, setOnLight] = useState(false);

  useEffect(() => {
    let raf = 0;
    const sample = () => {
      raf = 0;
      // the media painting behind the pill is a canvas (scrubbed sections) or a
      // video (idle loops). read the brightest available source at the pill's y.
      const y = 46;
      let lum: number | null = null;
      for (const c of Array.from(document.querySelectorAll("canvas"))) {
        const r = c.getBoundingClientRect();
        if (r.height < 200 || r.top > y || r.bottom < y) continue;
        const ctx = (c as HTMLCanvasElement).getContext("2d");
        if (!ctx) continue;
        try {
          const sx = Math.round(((window.innerWidth / 2) - r.left) / r.width * c.width);
          const sy = Math.round((y - r.top) / r.height * c.height);
          const d = ctx.getImageData(Math.max(0, sx), Math.max(0, sy), 1, 1).data;
          if (d[3] > 8) lum = (d[0] * 0.299 + d[1] * 0.587 + d[2] * 0.114);
        } catch { /* tainted or zero-sized — fall through */ }
      }
      // no canvas answer: fall back to the section's own background colour
      if (lum === null) {
        const el = document.elementFromPoint(window.innerWidth / 2, y + 90);
        const bg = el ? getComputedStyle(el).backgroundColor : "";
        const m = bg.match(/(\d+),\s*(\d+),\s*(\d+)/);
        if (m) lum = +m[1] * 0.299 + +m[2] * 0.587 + +m[3] * 0.114;
      }
      if (lum !== null) setOnLight(lum > 150);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(sample); };
    sample();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const ink = onLight ? "var(--c-cosmos)" : "#fff";

  const go = (anchor: string) => {
    setMenuOpen(false);
    const el = document.querySelector(anchor);
    if (!el) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(el as HTMLElement, { offset: 0 });
    else el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <header
        className="fixed left-1/2 z-50 w-[calc(100%-2*var(--container-pad))] max-w-[1176px] -translate-x-1/2"
        style={{ top: "var(--nav-top)" }}
      >
        <div
          className="flex h-[64px] items-center justify-between rounded-[8px] px-5"
          style={{
            background: onLight ? "rgba(255,255,255,0.52)" : "rgba(33,33,33,0.42)",
            border: onLight ? "1px solid rgba(33,33,33,0.10)" : "1px solid transparent",
            backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
            transition: "background 0.45s ease, border-color 0.45s ease",
          }}
        >
          <button
            onClick={() => getLenis()?.scrollTo(0)}
            className="flex items-center gap-2.5"
            aria-label="Lumin — back to top"
          >
            {/* B&W Lumin logo lockup — white mark reads clean on the dark pill */}
            <img
              src="/assets/lumin-icon.png" alt=""
              className="h-6 w-6 transition-[filter] duration-500"
              style={{ filter: onLight ? "invert(1)" : "none" }}
            />
            <span
              className="font-nav text-[18px] font-bold tracking-tight transition-colors duration-500"
              style={{ color: ink }}
            >lumin</span>
          </button>

          <nav
            className="font-nav hidden items-center gap-7 text-[13px] font-medium md:flex"
            style={{ color: onLight ? "rgba(33,33,33,0.82)" : "rgba(255,255,255,0.9)" }}
          >
            {NAV.items.map((item) => (
              <button
                key={item.label}
                onClick={() => go(item.anchor)}
                className="transition-colors"
                style={{ color: "inherit" }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-2.5 md:flex">
            <button
              className="btn btn-secondary"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("lumin:preselect", { detail: "Product Demo" }));
                go("#contact");
              }}
            >
              {NAV.cta1}
            </button>
            <button className="btn btn-primary" onClick={() => go("#contact")}>
              {NAV.cta2}
            </button>
          </div>

          {/* mobile hamburger */}
          <button
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <span className={`h-[2px] w-6 transition-transform ${menuOpen ? "translate-y-[4px] rotate-45" : ""}`} style={{ background: ink }} />
            <span className={`h-[2px] w-6 transition-transform ${menuOpen ? "-translate-y-[4px] -rotate-45" : ""}`} style={{ background: ink }} />
          </button>
        </div>
      </header>

      {/* mobile menu overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-center gap-8 px-10 md:hidden"
          style={{ background: "rgba(33,33,33,0.97)" }}
        >
          {NAV.items.map((item) => (
            <button key={item.label} onClick={() => go(item.anchor)} className="type-step text-left text-white">
              {item.label}
            </button>
          ))}
          <div className="mt-4 flex gap-3">
            <button className="btn btn-secondary" onClick={() => go("#contact")}>{NAV.cta1}</button>
            <button className="btn btn-primary" onClick={() => go("#contact")}>{NAV.cta2}</button>
          </div>
        </div>
      )}
    </>
  );
}
