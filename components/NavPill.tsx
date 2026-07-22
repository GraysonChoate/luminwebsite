"use client";

import { useState } from "react";
import { NAV } from "@/lib/copy";
import { getLenis } from "@/components/SmoothScroll";

/**
 * Constant fixed nav pill: present from the moment the loader lifts (the orb
 * emerge covers it while playing), including over the stationary idle loop, and
 * throughout the whole site. Items anchor-scroll to page sections via Lenis.
 */
export default function NavPill() {
  const [menuOpen, setMenuOpen] = useState(false);

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
          style={{ background: "rgba(33,33,33,0.42)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)" }}
        >
          <button
            onClick={() => getLenis()?.scrollTo(0)}
            className="flex items-center gap-2.5"
            aria-label="Lumin — back to top"
          >
            {/* B&W Lumin logo lockup — white mark reads clean on the dark pill */}
            <img src="/assets/lumin-icon.png" alt="" className="h-6 w-6" />
            <span className="font-nav text-[18px] font-bold tracking-tight text-white">lumin</span>
          </button>

          <nav className="font-nav hidden items-center gap-7 text-[13px] font-medium text-white/90 md:flex">
            {NAV.items.map((item) => (
              <button
                key={item.label}
                onClick={() => go(item.anchor)}
                className="transition-colors hover:text-white"
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
            <span className={`h-[2px] w-6 bg-white transition-transform ${menuOpen ? "translate-y-[4px] rotate-45" : ""}`} />
            <span className={`h-[2px] w-6 bg-white transition-transform ${menuOpen ? "-translate-y-[4px] -rotate-45" : ""}`} />
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
