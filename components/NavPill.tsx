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

  /* ── WHICH SECTION IS UNDER THE PILL ──────────────────────────────────
     This used to read the canvas with getImageData to judge the brightness
     behind it. That is a GPU-to-CPU readback, and doing it on every scroll
     event cost 29.8% of the main thread — 13.6 seconds out of 45 while
     scrolling the journey, and the single biggest source of the stutter.
     Sections declare their own tone with data-nav-tone instead, so this is a
     DOM lookup and nothing more. */
  useEffect(() => {
    let raf = 0;
    const sample = () => {
      raf = 0;
      // BELOW the pill, not at it — hit-testing at the pill's own y just finds
      // the pill, which is how it stayed white over the white void.
      const el = document.elementFromPoint(window.innerWidth / 2, 150);
      const owner = el?.closest<HTMLElement>("[data-nav-tone]");
      setOnLight(owner?.dataset.navTone === "light");
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(sample); };
    sample();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("lumin:navTone", sample);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("lumin:navTone", sample);
    };
  }, []);

  const ink = onLight ? "var(--c-cosmos)" : "#fff";

  /** Release every beat gate before navigating.
   *  This is what makes the nav bar a REAL exit. Gated sections suppress wheel
   *  and touch and actively pin scroll back to the held beat; without this the
   *  nav would start a scroll and the still-attached handler would yank it
   *  straight back — an exit that looks like it works and silently undoes
   *  itself, which is worse than none. It also replaces the Escape key and the
   *  timeout ceiling, deliberately: the nav is always on screen, so it is the
   *  one exit worth trusting. */
  const releaseGates = () => window.dispatchEvent(new CustomEvent("lumin:releaseGates"));

  /** Back to the very beginning — the whole film, from the top.
   *  A scroll to 0 is not enough: by the time anyone wants this, products have
   *  been caught, the ecosystem has been activated and the Launchpad has taken
   *  the screen. A reload is the only thing that puts every one of those back
   *  to its opening state, and the frames are already cached so it is quick. */
  const goHome = () => {
    setMenuOpen(false);
    releaseGates();
    window.scrollTo(0, 0);
    window.location.reload();
  };

  /** Anchors that are STATES, not scroll positions.
   *  The hub being activated, the Launchpad owning the screen and the orbit
   *  having arrived are all things the sections hold internally — no scrollY
   *  expresses them, so scrolling to a y would land in the right place with
   *  the wrong state (a dead pad, a form that never mounted). Each section
   *  listens for its own name and puts itself there. */
  const JUMPS: Record<string, string> = {
    "#ecosystem": "ecosystem",
    "#cta": "cta",
    "#schedule": "schedule",
  };

  const go = (anchor: string) => {
    setMenuOpen(false);
    if (anchor === "#home") return goHome();

    const jump = JUMPS[anchor];
    if (jump) {
      releaseGates();
      window.dispatchEvent(new CustomEvent("lumin:jumpTo", { detail: jump }));
      return;
    }
    // The tabs become their own PAGES — the main page stays the cinematic
    // experience end to end. Nothing to scroll to here yet, so a tab is inert
    // until its page exists rather than dumping the visitor mid-film.
    const el = document.querySelector(anchor);
    if (!el) return;
    releaseGates();
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
            onClick={goHome}
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
            // gap-5, not gap-7: eight tabs at 28px apart overran the pill and
            // pushed the two buttons off the right edge on a 1200px window.
            className="font-nav hidden items-center gap-5 text-[13px] font-medium lg:flex"
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

          <div className="hidden items-center gap-2.5 lg:flex">
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
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
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
          className="fixed inset-0 z-[60] flex flex-col justify-center gap-6 px-10 lg:hidden"
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
