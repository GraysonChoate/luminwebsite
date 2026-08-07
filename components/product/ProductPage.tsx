"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ProductPage } from "@/lib/productPages";
import styles from "./ProductPage.module.css";
import Motif from "./Motif";
import { signatureFor } from "@/lib/productSignatures";

/**
 * A PRODUCT PAGE — the film's briefs finally have somewhere to land.
 *
 * ── THE ART DIRECTION, AND WHY IT IS NOT THREE.JS ────────────────────────
 * `CONTEXT.md` records exactly why the live R3F ecosystem scene was killed:
 * real-time rasterised geometry sitting next to pre-rendered cinematic footage
 * "reads as a different medium dropped into the middle of a film", and it is
 * explicitly noted as NOT a tuning problem — no config value fixes it. These
 * pages sit one click from that same film, so they inherit that risk. So the
 * holography here is done the way the ecosystem rebuild proved out: an approved
 * pre-rendered plate, with structure and motion drawn over it in DOM and CSS.
 * Three.js belongs here later for things that genuinely need to be handled —
 * orbiting a unit, inspecting a node — not for looking cinematic.
 *
 * ── EVERY WORD IS APPROVED COPY ──────────────────────────────────────────
 * Nothing on this page is written here. Headline, brief, proof signals,
 * capabilities, intelligence rows and footer all come from `ECO_PRODUCTS`,
 * which is already the source of truth for the ecosystem dossiers. A product
 * page and its node brief can therefore never drift apart.
 *
 * ── TYPOGRAPHY IS THE SUBJECT ────────────────────────────────────────────
 * The wordmark is set per-character so it can materialise letter by letter, and
 * the page's reveals are driven by an IntersectionObserver rather than scroll
 * position, so a section resolves when it is actually looked at.
 */
export default function ProductPageView({ product }: { product: ProductPage }) {
  const rootRef = useRef<HTMLDivElement>(null);

  /* Reveal on entry. `rootMargin` pulls the trigger up so a band has already
     started resolving by the time it is comfortably in view — triggering on
     the exact edge makes the page feel like it is chasing the scroll. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = root.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((t) => t.setAttribute("data-revealed", "true"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.setAttribute("data-revealed", "true");
          io.unobserve(e.target);            // reveal once; never re-run on scroll-up
        });
      },
      { rootMargin: "-12% 0px -8% 0px", threshold: 0.15 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  /* ── LANDING ON AN ANCHOR ─────────────────────────────────────────────
     `/products/move#trainer` was arriving at scrollY 0 with the section 2089px
     down the page. The browser's own scroll-to-fragment runs before this client
     component has hydrated, and the router then restores scroll to the top, so
     the fragment was simply lost — the Trainer brief in the film opened Move at
     its stage instead of at Trainer.

     So the scroll is done here, deliberately, and RE-ASSERTED: the plate is a
     video and the reveals carry transforms, both of which settle after the
     first frame and move the target underneath us. The section is also revealed
     immediately rather than waiting for the observer, so we never land on
     something still blurred and offset. */
  /* LAND AT THE TOP. Arriving from the film or the ecosystem is a real
     navigation, and the browser restores the previous page's scroll offset —
     so a product page could open halfway down itself. Only an explicit anchor
     is allowed to start us somewhere else. */
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, []);

  /** 0..1 down the page — drives the scroll rail */
  const railRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        if (railRef.current) railRef.current.style.setProperty("--p", String(p));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    let timer = 0;
    const go = (smooth: boolean) => {
      const id = decodeURIComponent(window.location.hash.replace("#", ""));
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      el.setAttribute("data-revealed", "true");
      if (el.classList.contains(styles.insideCard)) setOpenInside(id);
      let n = 0;
      const land = () => {
        el.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
        if (++n < 6) timer = window.setTimeout(land, 120);
      };
      timer = window.setTimeout(land, 60);
    };
    go(false);
    /* HASH CHANGES TOO, not just mount. Going from `#trainer` to `#companion`
       is a SAME-DOCUMENT navigation: React never remounts, so a mount-only
       effect leaves the second card shut and the page parked on the first.
       Measured exactly that — #companion landed in view with data-open=false. */
    const onHash = () => go(true);
    window.addEventListener("hashchange", onHash);
    return () => { window.clearTimeout(timer); window.removeEventListener("hashchange", onHash); };
  }, []);

  /** which contained product is open. Move's overarching story is the page;
   *  Trainer and Companion open on top of it rather than replacing it. */
  const [openInside, setOpenInside] = useState<string | null>(null);

  const sig = signatureFor(product.id);
  const wordmark = product.label.split("");

  return (
    <div
      ref={rootRef}
      className={styles.page}
      data-tone={product.tone}
      data-mode={sig.mode}
      data-device={sig.device}
      style={{ "--accent": sig.accent } as CSSProperties}
    >
      {/* ── SCROLL RAIL ──────────────────────────────────────────────────
             A page this dark gives no edge cue that there is more below, and
             the native bar is hidden on macOS until you already scroll. This
             is a hairline that fills as you go: an affordance first, a
             position readout second. */}
      <span ref={railRef} className={styles.rail} aria-hidden="true">
        <i />
      </span>
      {/* ── STAGE ───────────────────────────────────────────────────────
             The approved idle plays behind, heavily graded down so it reads as
             the room this product lives in rather than as a video playing. */}
      <section className={styles.stage}>
        {product.ambient && (
          <video
            className={styles.plate}
            src={product.ambient}
            autoPlay muted loop playsInline preload="auto"
            aria-hidden="true"
          />
        )}
        <div className={styles.grade} aria-hidden="true" />
        <div className={styles.scan} aria-hidden="true" />
        <Motif mode={sig.mode} />

        <div className={styles.stageInner}>
          <a className={styles.back} href="/#ecosystem">
            <span aria-hidden="true">‹</span> Ecosystem
          </a>

          <p className={styles.kicker}>
            <span className={styles.kickerSuite}>{product.suite}</span>
            <i aria-hidden="true" />
            <span className={styles.motto}>{sig.motto}</span>
          </p>

          <h1 className={styles.wordmark} aria-label={product.label}>
            {wordmark.map((ch, i) => (
              <span
                key={`${ch}-${i}`}
                aria-hidden="true"
                style={{ animationDelay: `${0.24 + i * 0.045}s` } as CSSProperties}
              >
                {ch === " " ? " " : ch}
              </span>
            ))}
          </h1>

          <p className={styles.headline}>{product.headline}</p>

          <div className={styles.stageCta}>
            <a className={styles.cta} href="/#cta">
              Book a demo
              <span aria-hidden="true">›</span>
            </a>
            <span className={styles.ctaNote}>{product.suite}</span>
          </div>
        </div>

        <div className={styles.stageEdge} aria-hidden="true" />
      </section>

      {/* ── BRIEF ───────────────────────────────────────────────────────── */}
      <section className={styles.brief} data-reveal>
        <p>{product.brief}</p>
      </section>

      {/* ── PROOF SIGNALS ───────────────────────────────────────────────── */}
      <section className={styles.proof} data-reveal aria-label={`${product.label} signals`}>
        {product.proofSignals.map(([label, value], i) => (
          <div key={label} style={{ transitionDelay: `${i * 0.09}s` }}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      {/* ── CAPABILITIES ────────────────────────────────────────────────── */}
      <section className={styles.capsWrap}>
        <h2 className={styles.sectionTitle} data-reveal>Capabilities</h2>
        <div className={styles.caps}>
          {product.capabilities.map((c, i) => (
            <article
              key={c.label}
              className={styles.cap}
              data-reveal
              style={{ transitionDelay: `${(i % 3) * 0.08}s` }}
            >
              <span className={styles.capIndex} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{c.label}</h3>
              <p>{c.detail}</p>
              <i className={styles.capEdge} aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      {/* ── INSIDE THIS PRODUCT ─────────────────────────────────────────
             Trainer and Companion are expressions of Move, not peers of it, so
             they live here rather than on pages of their own. The film gives
             each its own scene and brief; this is where those land, at their
             own anchor, so a brief in the film arrives on its own section. */}
      {product.contains.length > 0 && (
        <section className={styles.insideWrap}>
          <h2 className={styles.sectionTitle} data-reveal>
            Inside {product.label}
          </h2>
          <div className={styles.inside}>
            {product.contains.map((c, i) => {
              const open = openInside === c.anchor;
              return (
                <article
                  key={c.product}
                  id={c.anchor}
                  className={styles.insideCard}
                  data-reveal
                  data-open={open ? "true" : "false"}
                  style={{ transitionDelay: `${i * 0.1}s` }}
                >
                  <button
                    type="button"
                    className={styles.insideHead}
                    aria-expanded={open}
                    aria-controls={`${c.anchor}-detail`}
                    onClick={() => setOpenInside(open ? null : c.anchor)}
                  >
                    <span className={styles.insideRail} aria-hidden="true">
                      {c.brief.rail[0]} <i />
                    </span>
                    <h3>{c.product}</h3>
                    <p className={styles.insideProp}>{c.brief.proposition}</p>
                    <ul className={styles.insideSpecs}>
                      {c.brief.specs.map((sp) => (
                        <li key={sp}>{sp}</li>
                      ))}
                    </ul>
                    <span className={styles.insideMore}>
                      {open ? "Close" : `Explore ${c.product}`}
                      <i aria-hidden="true" />
                    </span>
                  </button>

                  {c.detail && (
                    <div
                      id={`${c.anchor}-detail`}
                      className={styles.insideDetail}
                      hidden={!open}
                    >
                      <p className={styles.insidePositioning}>{c.detail.positioning}</p>
                      <p className={styles.insideBody}>{c.detail.body}</p>
                      <dl className={styles.insidePoints}>
                        {c.detail.points.map(([k, v]) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <a className={styles.cta} href="/#cta">
                        Book a demo
                        <span aria-hidden="true">›</span>
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ── INTELLIGENCE READOUT ────────────────────────────────────────── */}
      <section className={styles.intel}>
        <h2 className={styles.intelTitle} data-reveal>{product.intelligenceTitle}</h2>
        <dl className={styles.rows}>
          {product.signalRows.map(([k, v], i) => (
            <div key={k} data-reveal style={{ transitionDelay: `${i * 0.07}s` }}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── CLOSE ───────────────────────────────────────────────────────── */}
      <section className={styles.close} data-reveal>
        <div className={styles.closeLines}>
          {product.footer.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <a className={`${styles.cta} ${styles.ctaLarge}`} href="/#cta">
          Book a demo
          <span aria-hidden="true">›</span>
        </a>
      </section>
    </div>
  );
}
