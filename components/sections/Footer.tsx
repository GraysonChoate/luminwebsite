"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/motion";
import { FOOTER, NAV } from "@/lib/copy";
import SplitChars from "@/components/ui/SplitChars";
import { getLenis } from "@/components/SmoothScroll";

/** Dark closing footer: oversized headline, nav links, legal row. */
export default function Footer() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("h2 .split-char"),
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 1.2, ease: "expo.out", stagger: 0.014,
          scrollTrigger: { trigger: el, start: "top 75%", toggleActions: "play none none reverse" },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  const go = (anchor: string) => {
    const target = document.querySelector(anchor);
    if (target) getLenis()?.scrollTo(target as HTMLElement);
  };

  return (
    <footer ref={ref} data-trace-dark className="container-pad pb-10 pt-24" style={{ background: "var(--c-cosmos)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <h2 className="type-statement mb-20 text-white">
        <SplitChars lines={FOOTER.headline} />
      </h2>
      <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
        <nav className="font-nav flex flex-wrap gap-6 text-[13px] font-medium text-white/70">
          {NAV.items.map((item) => (
            <button key={item.label} onClick={() => go(item.anchor)} className="transition-colors hover:text-white">
              {item.label}
            </button>
          ))}
        </nav>
        <p className="text-[12px] text-white/40">© {new Date().getFullYear()} Lumin. All rights reserved.</p>
      </div>
    </footer>
  );
}
