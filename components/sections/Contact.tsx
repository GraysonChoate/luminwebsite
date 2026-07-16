"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/motion";
import { CTA } from "@/lib/copy";
import SplitChars from "@/components/ui/SplitChars";

/**
 * Contact section: pitch copy left, dark form card right.
 * Card enters (opacity/y), fields stagger in; submit is a stub for now.
 */
export default function Contact() {
  const ref = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState("");

  // Nav CTAs deep-link with intent: "See Demo" preselects the demo option.
  useEffect(() => {
    const onPreselect = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (CTA.options.includes(detail)) setSelected(detail);
    };
    window.addEventListener("lumin:preselect", onPreselect);
    return () => window.removeEventListener("lumin:preselect", onPreselect);
  }, []);

  useEffect(() => {
    const el = ref.current!;
    const ctx = gsap.context(() => {
      // headline + sub smoothly fade up as the section enters
      gsap.fromTo(
        el.querySelectorAll("[data-fade]"),
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 1.1, ease: "power3.out", stagger: 0.12,
          scrollTrigger: { trigger: el, start: "top 78%", toggleActions: "play none none reverse" },
        }
      );
      gsap.fromTo(
        el.querySelector("[data-card]"),
        { opacity: 0, y: 24 },
        {
          opacity: 1, y: 0, duration: 1, ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 60%", toggleActions: "play none none reverse" },
        }
      );
      gsap.fromTo(
        el.querySelectorAll("[data-field]"),
        { opacity: 0, y: 12 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: "expo.out", stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 55%", toggleActions: "play none none reverse" },
        }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  const inputCls =
    "h-[42px] w-full rounded-[8px] border border-white/15 bg-white/5 px-3 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-white/40";

  return (
    <section ref={ref} id="contact" className="container-pad py-32" style={{ background: "var(--c-cosmos)" }}>
      <div className="mx-auto grid max-w-[1176px] grid-cols-1 gap-14 lg:grid-cols-2">
        <div className="text-white">
          <h2 data-fade className="type-statement mb-6">
            <SplitChars lines={CTA.headline} />
          </h2>
          <p data-fade className="max-w-[26rem] text-[16px] leading-relaxed text-white/70">{CTA.sub}</p>
        </div>

        <form
          data-card
          onSubmit={(e) => e.preventDefault()}
          className="w-full max-w-[540px] justify-self-end p-10"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "var(--radius-card)" }}
        >
          <div className="grid grid-cols-2 gap-4">
            {CTA.fields.map((f) => (
              <label
                key={f.key}
                data-field
                className={`${f.half ? "col-span-1" : "col-span-2"} flex flex-col gap-2 text-[12px] text-white/60`}
              >
                {f.label}{f.required ? " *" : ""}
                <input required={f.required} type={f.type} className={inputCls} placeholder={f.label} />
              </label>
            ))}
            <label data-field className="col-span-2 flex flex-col gap-2 text-[12px] text-white/60">
              {CTA.selectLabel} *
              <select
                required
                className={inputCls}
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="" disabled>
                  {CTA.selectPlaceholder}
                </option>
                {CTA.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          </div>
          <button data-field type="submit" className="btn btn-primary mt-8 w-full">
            {CTA.submit}
          </button>
        </form>
      </div>
    </section>
  );
}
