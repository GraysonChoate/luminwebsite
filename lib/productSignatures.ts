/**
 * PRODUCT SIGNATURES — what makes each page ITS OWN page.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────
 * The first pass at product pages was one template with the suite colour and
 * the copy swapped. That is a system, not a character: every page had the same
 * skeleton, the same rhythm and the same devices, so Loops and Station were the
 * same object in two colours. This file is the correction.
 *
 * Each product gets three things that are genuinely its own:
 *
 *   mode    the STRUCTURE of the page — how capabilities and the readout are
 *           laid out. A ledger does not look like a curriculum, and neither
 *           looks like a training floor.
 *   motif   a bespoke animated figure behind the stage, drawn in CSS/SVG,
 *           expressing what the tool actually does.
 *   device  how the wordmark itself behaves.
 *
 * The rule for choosing them: the signature has to come from the PRODUCT'S
 * FUNCTION, never from decoration. Loops returns, so its page orbits. Core is
 * the substrate, so its page is a load-bearing lattice. Connect is a
 * conversation, so its page runs down a thread. If a signature could be swapped
 * onto another product without anyone noticing, it is the wrong signature.
 */

export type PageMode =
  | "orbit"        // returns to where it started
  | "lattice"      // structural, load-bearing
  | "thread"       // sequential conversation
  | "console"      // many things watched at once
  | "ledger"       // a register of physical things
  | "curriculum"   // ordered progression
  | "kinetic"      // motion-led
  | "rhythm"       // synchronised, on a beat
  | "device"       // a screen, framed
  | "shelf"        // curated goods
  | "macro";       // measured quantities

export type Signature = {
  mode: PageMode;
  /**
   * A SECOND brand colour, so eleven pages are not two colours.
   *
   * Suite colour still governs the page — Supernova for Pro, Aurora for One.
   * This is the Brand Guide's Pop Accent tier, and the guide is explicit that
   * those are for "emphasis, callouts and accent moments only, never
   * full-screen background". So it appears ONLY in gradients, tile edges,
   * outlines and small marks; it never fills a surface and never competes with
   * the suite read. Every value is straight from Brand Guide V4.
   */
  accent: string;
  /** the one-word idea the page is built around, set beside the wordmark */
  motto: string;
  /** how the wordmark resolves */
  device: "assemble" | "cycle" | "stack" | "pulse" | "trace" | "count";
};

export const SIGNATURES: Record<string, Signature> = {
  // ── LUMIN PRO — suite colour Supernova, accents from the Pop tier ───────
  /** engagement that comes back around — the page literally orbits */
  loops: { mode: "orbit", accent: "255,0,75", motto: "Return", device: "cycle" },
  /** the substrate everything else layers into: a load-bearing grid */
  core: { mode: "lattice", accent: "134,51,153", motto: "Substrate", device: "stack" },
  /** calls, texts, cadences — a conversation running down a thread */
  connect: { mode: "thread", accent: "255,94,46", motto: "Sequence", device: "trace" },
  /** many locations watched at once: a tiled control board */
  "command-center": { mode: "console", accent: "0,255,186", motto: "Oversight", device: "assemble" },
  /** physical equipment, serialised — a register, not a brochure */
  "asset-management": { mode: "ledger", accent: "227,255,112", motto: "Inventory", device: "count" },
  /** ordered learning: numbered modules on a progress spine */
  academy: { mode: "curriculum", accent: "134,51,153", motto: "Progression", device: "count" },

  // ── LUMIN ONE — suite colour Aurora, accents from the Pop tier ──────────
  /** the training itself — the fastest, most physical page in the set */
  move: { mode: "kinetic", accent: "82,112,255", motto: "Motion", device: "pulse" },
  /** a room moving together, so the page arrives on a beat */
  studio: { mode: "rhythm", accent: "255,0,75", motto: "Together", device: "pulse" },
  /** a screen that becomes a coach — the page is framed like the unit */
  station: { mode: "device", accent: "0,255,186", motto: "Surface", device: "assemble" },
  /** curated goods on a lit shelf */
  market: { mode: "shelf", accent: "255,94,46", motto: "Curation", device: "stack" },
  /** measured intake — ratios and quantities */
  fuel: { mode: "macro", accent: "227,255,112", motto: "Measure", device: "count" },
};

export const signatureFor = (id: string): Signature =>
  SIGNATURES[id] ?? { mode: "lattice", accent: "82,112,255", motto: "System", device: "assemble" };
