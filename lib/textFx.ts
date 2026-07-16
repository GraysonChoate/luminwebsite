import type { CSSProperties } from "react";

/**
 * Shared copy-materialization language (ProductStory phrase stack + About
 * origin statement): a gray ghost fills GRAY→dark via a left→right mask wipe
 * (--w 0→1), then a Supernova light band scans across the settled glyphs
 * (--s 0→1). Both variables are driven imperatively from scrubbed
 * ScrollTrigger render loops.
 */

// --w defaults to 1 so un-driven contexts (mobile, pre-hydration) show the
// copy fully materialized instead of a gray ghost.
export const WIPE_MASK =
  "linear-gradient(to right, #000 calc(var(--w, 1) * 140% - 40%), transparent calc(var(--w, 1) * 140%))";

// Glyph-clipped shine: background-clip:text paints the band ON the letters,
// never behind them. Core is white@0.7 blended between Supernova flanks —
// pure #fff erased glyphs against the white page. At --s 0 or 1 the band
// sits off-canvas (no-repeat), so resting copy is pure Cosmos.
export const SHINE: CSSProperties = {
  color: "transparent",
  backgroundImage:
    "linear-gradient(100deg, transparent 42%, rgba(82, 112, 255, 0.9) 47%, rgba(255, 255, 255, 0.7) 50%, rgba(82, 112, 255, 0.9) 53%, transparent 58%)",
  backgroundSize: "250% 100%",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "calc((1 - var(--s, 0)) * 100%) 0",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
};

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
