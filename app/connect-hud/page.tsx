"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { ECO_PRODUCTS, ECO_PRODUCT_MAP, type ProductHud } from "@/lib/ecoProducts";
import styles from "./page.module.css";

/** Prototype route. Copy for all eleven briefs is shared with the live
 *  ecosystem section via @/lib/ecoProducts, so the prototype and the real
 *  site cannot drift apart. Layout stays local to this route: it crops the
 *  ecosystem into a band on small screens, which the live section does not. */
const products: ProductHud[] = ECO_PRODUCTS;
const productMap = ECO_PRODUCT_MAP;

export default function ConnectHudPrototype() {
  const [selectedId, setSelectedId] = useState("connect");
  const [open, setOpen] = useState(false);
  const selected = productMap.get(selectedId) ?? products[3];

  function selectProduct(id: string) {
    setSelectedId(id);
    setOpen(true);
  }

  return (
    <main className={styles.stage}>
      {/* videoBox is the size container; hotspotFrame reproduces the video's
          object-fit: cover rect so node targets share the video's coordinate space. */}
      <div className={styles.videoBox}>
        <video
          className={styles.ecosystem}
          src="/eco/hub/ecosystem-symbol-master-v5.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />

        <div className={styles.hotspotFrame}>
          <div className={styles.hotspotLayer} aria-label="Lumin ecosystem product nodes">
            {products.map((product) => (
              <button
                key={product.id}
                className={`${styles.hotspot} ${selected.id === product.id ? styles.hotspotActive : ""}`}
                style={product.position}
                type="button"
                aria-label={`Open ${product.label} by Lumin brief`}
                onClick={() => selectProduct(product.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.scanlines} aria-hidden="true" />

      <aside
        key={selected.id}
        className={`${styles.panel} ${open ? styles.panelOpen : ""} ${
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
              <h1>{selected.headline}</h1>
            </div>
          </div>
          <button className={styles.close} type="button" aria-label="Close product brief" onClick={() => setOpen(false)}>
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
    </main>
  );
}
