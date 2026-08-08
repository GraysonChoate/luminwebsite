"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { ECO_PRODUCTS, ECO_PRODUCT_MAP } from "@/lib/ecoProducts";
import styles from "./EcosystemNodeHud.module.css";

/**
 * The eleven ecosystem nodes and their briefs, over the live idle hologram.
 *
 * ── THE ONE RULE ─────────────────────────────────────────────────────────
 * One node opens ONE brief. There is no product rail, tab strip, chip
 * selector or carousel inside the opened panel, and there must never be one.
 * The panel is a dossier, not a directory: to see another product you close it
 * and pick another node. All eleven briefs live in @/lib/ecoProducts, but only
 * the selected one is ever rendered.
 *
 * ── WHY THE HIT AREAS ARE NESTED TWO DEEP ────────────────────────────────
 * Node coordinates are percentages of the VIDEO FRAME. The idle video is
 * object-fit: cover, so on any viewport that isn't 16:9 the frame is wider than
 * the box and the two coordinate spaces diverge — at 1100x900 that put a target
 * 90px away from the node it belonged to, and pushed the whole Lumin One side
 * off screen. `.videoBox` is a size container mirroring the video's box and
 * `.hotspotFrame` reproduces the cover rect inside it, so a percentage lands on
 * the node at every aspect ratio. Verified to 0.02px across desktop, tablet and
 * phone.
 *
 * The hit areas are invisible on purpose. The approved ecosystem render already
 * contains the node symbols; drawing our own over them would double them up.
 */
export default function EcosystemNodeHud({ active }: { active: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? ECO_PRODUCT_MAP.get(selectedId) ?? null : null;
  /** which suite's territory the pointer is over — drives both the suite title
   *  and the node names on that side. Null = nothing hovered, everything rests. */
  const [hoveredSuite, setHoveredSuite] = useState<"Lumin Pro" | "Lumin One" | null>(null);

  /* The hub is a scroll-locked terminal state, so Escape is the expected way
     out of anything that takes over inside it. Closing returns to the node
     layer — which is the whole navigation model. */
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  /* Leaving the lit hub closes the panel. Otherwise "Continue journey" flies
     the camera into the nucleus with a product dossier still on screen. */
  useEffect(() => { if (!active) setSelectedId(null); }, [active]);

  return (
    <>
      <div className={styles.videoBox} aria-hidden={!active}>
        <div className={styles.hotspotFrame}>
          {/* ── SUITE HOVER ZONE ──────────────────────────────────────────
                 Which half the pointer is in, resolved by mousemove rather
                 than by two enter/leave regions. Enter/leave flickers every
                 time the pointer crosses onto a node, because the node sits
                 above the zone and steals the event; a position test cannot
                 flicker. Sits BELOW the nodes so it never takes their clicks. */}
          <div
            className={styles.suiteZone}
            style={{ pointerEvents: active ? "auto" : "none" }}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHoveredSuite(e.clientX - r.left < r.width / 2 ? "Lumin Pro" : "Lumin One");
            }}
            onMouseLeave={() => setHoveredSuite(null)}
            aria-hidden="true"
          />
          <div className={styles.hotspotLayer} aria-label="Lumin ecosystem product nodes">
            {/* A NODE IS A DOOR TO A PAGE, NOT A POPUP.
                These were buttons that opened the in-hologram dossier. Every
                product now has its own full page — with the scene it belongs
                to playing behind it, its capabilities, its intelligence
                readout and its own Book-a-demo — so a node navigates there
                instead. A panel floating over the hologram could never be more
                than a summary, and it competed with the render underneath it. */}
            {ECO_PRODUCTS.map((product) => (
              <a
                key={product.id}
                className={styles.hotspot}
                style={{ ...product.position, pointerEvents: active ? "auto" : "none" }}
                href={`/products/${product.id}`}
                tabIndex={active ? 0 : -1}
                aria-label={`Open the ${product.label} by Lumin page`}
                onMouseEnter={() => setHoveredSuite(product.suite)}
                onFocus={() => setHoveredSuite(product.suite)}
                onClick={() => {
                  // came from the hub, so "back" should return to the hub
                  try { sessionStorage.setItem("lumin:returnTo", "#ecosystem"); } catch { /* private mode */ }
                }}
              />
            ))}
            {/* ── NODE NAMES ────────────────────────────────────────────
                   Same coordinate space as the hit areas, lifted clear of the
                   node symbol already drawn into the approved render. They
                   materialize only once the hologram is idle, staggered, so
                   they never appear over the activation build. */}
            {ECO_PRODUCTS.map((product, i) => (
              <span
                key={`${product.id}-label`}
                className={styles.nodeLabel}
                style={{ ...product.position, animationDelay: `${0.45 + i * 0.07}s` }}
                data-accent={product.accent}
                data-state={
                  !hoveredSuite ? "rest" : hoveredSuite === product.suite ? "lit" : "dim"
                }
                data-on={active ? "true" : "false"}
                aria-hidden="true"
              >
                {product.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── SUITE TITLES ────────────────────────────────────────────────
             Lumin Pro over its half, Lumin One over its own, floating above
             the stage rather than sitting inside the scene's perspective.
             They light when the matching half is hovered and recede when the
             other is, so the title and the territory read as one object. */}
      <div className={styles.suiteTitles} data-on={active ? "true" : "false"} aria-hidden="true">
        <span
          className={`${styles.suiteTitle} ${styles.suiteTitlePro}`}
          data-state={!hoveredSuite ? "rest" : hoveredSuite === "Lumin Pro" ? "lit" : "dim"}
        >
          <i>Lumin</i>
          <b>Pro</b>
        </span>
        <span
          className={`${styles.suiteTitle} ${styles.suiteTitleOne}`}
          data-state={!hoveredSuite ? "rest" : hoveredSuite === "Lumin One" ? "lit" : "dim"}
        >
          <i>Lumin</i>
          <b>One</b>
        </span>
      </div>

      {selected && (
        <aside
          key={selected.id}
          /* TWO different things have to be told to keep their hands off this
             panel, and exempting only one leaves it unscrollable.
             `data-eco-scrollable` is ours: the section preventDefaults every
             wheel and touchmove while it holds the page.
             `data-lenis-prevent` is Lenis's own opt-out — it runs a separate
             wheel listener and preventDefaults to drive its smooth scrolling,
             so our exemption alone still left the dossier stuck on its first
             screen. */
          data-eco-scrollable=""
          data-lenis-prevent=""
          className={`${styles.panel} ${styles.panelOpen} ${
            selected.accent === "violet" ? styles.panelViolet : styles.panelBlue
          }`}
          aria-label={`${selected.label} by Lumin brief`}
        >
          <div className={styles.panelFrame} />
          <div className={styles.panelHeader}>
            <div className={styles.titleCluster}>
              <div className={styles.productBadge} aria-hidden="true">
                <span
                  className={styles.productIcon}
                  style={{ "--symbol-url": `url(/eco/symbols/${selected.id}.svg)` } as CSSProperties}
                />
              </div>
              <div>
                <p className={styles.kicker}>
                  {selected.suite} / {selected.label}
                </p>
                {/* h1 deliberately: the approved panel styling hangs off
                    `.panelHeader h1`, and this dossier is the page's subject
                    while it is open. */}
                <h1>{selected.headline}</h1>
              </div>
            </div>
            <button
              className={styles.close}
              type="button"
              aria-label="Close product brief and return to the ecosystem"
              onClick={() => setSelectedId(null)}
            >
              <span />
              <span />
            </button>
          </div>

          <div className={styles.coreBrief}>
            <p>{selected.brief}</p>
          </div>

          <div className={styles.proofStrip} aria-label={`${selected.label} performance signals`}>
            {selected.proofSignals.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <section className={styles.capabilityGrid} aria-label={`${selected.label} capability map`}>
            {selected.capabilities.map((item) => (
              <article key={item.label}>
                <h2>{item.label}</h2>
                <p>{item.detail}</p>
              </article>
            ))}
          </section>

          <section className={styles.signalPanel} aria-label={`${selected.label} data flow`}>
            <div>
              <p className={styles.kicker}>System Intelligence</p>
              <h2>{selected.intelligenceTitle}</h2>
            </div>
            <div className={styles.signalStack}>
              {selected.signalRows.map(([label, value]) => (
                <div key={label} className={styles.signalRow}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <footer className={styles.panelFooter}>
            {selected.footer.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </footer>
        </aside>
      )}
    </>
  );
}
