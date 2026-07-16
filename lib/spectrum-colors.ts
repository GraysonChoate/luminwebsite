// Spectrum color helpers for the ecosystem scene.
import * as THREE from "three";
import { SPECTRUM_COLORS, type Spectrum } from "../data/lumin-ecosystem";

const cache = new Map<string, THREE.Color>();
const glowCache = new Map<string, THREE.Color>();

export function spectrumColor(s: Spectrum): THREE.Color {
  let c = cache.get(s);
  if (!c) {
    c = new THREE.Color(SPECTRUM_COLORS[s]);
    cache.set(s, c);
  }
  return c;
}

/** Luminance-normalized variant for glow sprites/rings so every orb emits
 *  with EQUAL perceived brightness (deep violet vs. lime etc. differ wildly
 *  in raw lightness). Hue and character stay; lightness is pinned. */
export function glowColor(s: Spectrum): THREE.Color {
  let c = glowCache.get(s);
  if (!c) {
    c = new THREE.Color(SPECTRUM_COLORS[s]);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    c.setHSL(hsl.h, Math.min(hsl.s, 0.95), 0.62);
    glowCache.set(s, c);
  }
  return c;
}

export function mixColors(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return a.clone().lerp(b, t);
}


