// SceneFonts — the single font contract for all canvas-baked text in the
// ecosystem scene (suite titles, hub labels).
//
// WHY THIS EXISTS: canvas2d text does NOT participate in the DOM's font
// fallback/swap lifecycle. If a texture is baked before the display fonts are
// loaded, the canvas silently renders a system fallback and the label ships
// blurry/wrong forever (a bug class we've hit repeatedly). The contract:
//   1. Resolve family names from the host document's CSS variables when
//      present (--font-heebo / --font-montserrat, as exposed by next/font),
//      falling back to the plain family names for non-Next hosts.
//   2. NEVER trust a first bake: always await document.fonts.ready AND an
//      explicit fonts.load() for the exact style used, then rebake.
//   3. Consumers subscribe via onFontsReady / useSyncExternalStore and
//      re-render when readiness flips.
//
// next/font note: self-hosted fonts registered through next/font ARE
// document fonts — they resolve through the CSS variable to a real family
// name (e.g. "__Heebo_abc123"), and canvas2d can use that family directly.

let resolved: { heebo: string; montserrat: string } | null = null;

function cssVarFamily(varName: string): string | null {
  if (typeof document === "undefined") return null;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!v) return null;
  // the variable holds a full family stack — take it verbatim (canvas accepts stacks)
  return v;
}

/** Family stacks for the two scene faces, preferring the host's next/font vars. */
export function sceneFontFamilies(): { heebo: string; montserrat: string } {
  if (resolved) return resolved;
  const heebo = cssVarFamily("--font-heebo") ?? "Heebo, system-ui, sans-serif";
  const montserrat = cssVarFamily("--font-montserrat") ?? "Montserrat, system-ui, sans-serif";
  resolved = { heebo, montserrat };
  return resolved;
}

export function titleFont(px: number): string {
  return `600 ${px}px ${sceneFontFamilies().heebo}`;
}
export function labelFont(px: number): string {
  return `600 ${px}px ${sceneFontFamilies().montserrat}`;
}
export function briefFont(px: number): string {
  return `500 ${px}px ${sceneFontFamilies().montserrat}`;
}

// ---- readiness ---------------------------------------------------------------
let ready = false;
let version = 0;
const listeners = new Set<() => void>();

export function fontsReady(): boolean {
  return ready;
}
export function fontsVersion(): number {
  return version;
}
export function subscribeFonts(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

if (typeof document !== "undefined" && "fonts" in document) {
  // Contract step 2: fonts.ready resolves when ALL document fonts finish
  // loading (incl. next/font self-hosted). The extra load() calls force the
  // exact styles we bake with, guarding against lazily-registered faces.
  Promise.all([
    document.fonts.ready,
    document.fonts.load(titleFont(160)),
    document.fonts.load(labelFont(80)),
    document.fonts.load(briefFont(54)),
  ])
    .catch(() => undefined) // never block baking forever on a load error
    .finally(() => {
      ready = true;
      version++;
      listeners.forEach((l) => l());
    });
}

