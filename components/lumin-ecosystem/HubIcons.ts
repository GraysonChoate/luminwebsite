// Hub icon textures — single-weight outline glyphs drawn to canvas, tinted to
// the hub's own spectrum color, on a dark badge disc. Rendered as billboarded
// sprites at each hub core. Client-only (canvas), cached per hub+color.
import * as THREE from "three";

// SVG path data in a 24x24 viewbox. Single-weight stroke, no fill.
// Kept icons match the previous constellation glyphs exactly; only
// Move / Fuel / Loops are replaced per spec.
const GLYPHS: Record<string, { paths: string[]; circles?: [number, number, number][] }> = {
  // REPLACED: body — head + shoulders, single stroke
  "hub-move": {
    paths: ["M5 19c1.2-4.6 12.8-4.6 14 0"],
    circles: [[12, 8, 3.1]],
  },
  // REPLACED: single-line leaf with one center vein, no fill
  "hub-fuel": {
    paths: ["M12 4C6.4 8 5.2 14.2 12 20c6.8-5.8 5.6-12 0-16", "M12 7.5v9"],
  },
  // REPLACED: infinity symbol, single-line stroke
  "hub-loops": {
    paths: ["M12 12c-1.8-3.2-7-3.2-7 0s5.2 3.2 7 0c1.8-3.2 7-3.2 7 0s-5.2 3.2-7 0"],
  },
  // KEPT: tag
  "hub-market": {
    paths: ["M4 5h8l8 8-7 7-8-8V5Z"],
    circles: [[9, 10, 1.4]],
  },
  // KEPT: display
  "hub-station": {
    paths: ["M4 5h16v9.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 14.5V5Z", "M9 20h6"],
  },
  // KEPT: nucleus dot + ring
  "hub-core": {
    paths: [],
    circles: [
      [12, 12, 7],
      [12, 12, 2],
    ],
  },
  // KEPT: phone
  "hub-memberapp": {
    paths: ["M9 3.5h6a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z", "M11 17.5h2"],
  },
  // KEPT: chat
  "hub-connect": {
    paths: ["M5 5h14v10H10l-5 4V5Z"],
  },
  // KEPT: cap
  "hub-academy": {
    paths: ["M12 5 3 9.5 12 14l9-4.5L12 5Z", "M7 12v4c3 2 7 2 10 0v-4"],
  },
  // KEPT: radar
  "hub-command": {
    paths: ["M12 12V5.5", "M12 12l4.5 3"],
    circles: [[12, 12, 7.5]],
  },
};

const cache = new Map<string, THREE.CanvasTexture>();

export function hubIconTexture(hubId: string, color: string): THREE.CanvasTexture {
  const key = `${hubId}:${color}`;
  let tex = cache.get(key);
  if (tex) return tex;

  const S = 512;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const cx = S / 2;
  const r = S * 0.46;

  // Dimensional badge: dark spectrum-tinted sphere, not a flat disc.
  // Radial gradient off-center toward upper-left = lit-sphere shading.
  const g = ctx.createRadialGradient(cx - r * 0.35, cx - r * 0.4, r * 0.1, cx, cx, r);
  const c = new THREE.Color(color);
  const rgb = (m: number) =>
    `${Math.round(c.r * 255 * m)}, ${Math.round(c.g * 255 * m)}, ${Math.round(c.b * 255 * m)}`;
  g.addColorStop(0, `rgba(${rgb(0.38)}, 0.95)`); // lit pole: dim spectrum tint
  g.addColorStop(0.45, `rgba(${rgb(0.2)}, 0.95)`);
  g.addColorStop(0.85, `rgba(${rgb(0.09)}, 0.96)`);
  g.addColorStop(1, `rgba(6, 8, 16, 0.97)`); // limb darkens to near-black
  ctx.beginPath();
  ctx.arc(cx, cx, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  // Inner rim light (bottom-right) for dimensionality.
  const rim = ctx.createRadialGradient(cx + r * 0.45, cx + r * 0.5, r * 0.35, cx, cx, r);
  rim.addColorStop(0, "rgba(0,0,0,0)");
  rim.addColorStop(0.85, "rgba(0,0,0,0)");
  rim.addColorStop(1, `rgba(${rgb(0.55)}, 0.5)`);
  ctx.beginPath();
  ctx.arc(cx, cx, r, 0, Math.PI * 2);
  ctx.fillStyle = rim;
  ctx.fill();

  // Spectrum rim stroke — strong edge definition (double stroke: outer
  // saturated ring + inner bright line) so the orb reads as a defined object.
  ctx.beginPath();
  ctx.arc(cx, cx, r - 4, 0, Math.PI * 2);
  ctx.lineWidth = 8;
  ctx.strokeStyle = `${color}B0`;
  ctx.stroke();
  const rimBright = c.clone().lerp(new THREE.Color("#ffffff"), 0.45);
  ctx.beginPath();
  ctx.arc(cx, cx, r - 10, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = `#${rimBright.getHexString()}66`;
  ctx.stroke();

  // Icon at ~40% of badge diameter — pre-glowed: a soft wide halo pass, a
  // tighter bloom pass, then the crisp stroke on top. The sprite's runtime
  // opacity animates the brightness (idle glow → hover bright → click alive).
  const badgeD = S * 0.92;
  const iconSize = badgeD * 0.46;
  const scale = iconSize / 24;
  const offset = (S - iconSize) / 2;
  const glyph = GLYPHS[hubId] ?? { paths: [], circles: [[12, 12, 3]] as [number, number, number][] };

  const drawGlyph = () => {
    for (const d of glyph.paths) ctx.stroke(new Path2D(d));
    for (const [gx, gy, gr] of glyph.circles ?? []) {
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  ctx.save();
  ctx.translate(offset, offset);
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // pass 1: wide soft halo (glow lives here, never on the core stroke)
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = `${color}50`;
  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  drawGlyph();
  // pass 2: tight bloom
  ctx.lineWidth = 1.9;
  ctx.strokeStyle = `${color}99`;
  ctx.shadowBlur = 10;
  drawGlyph();
  // pass 3: crisp bright core stroke — ZERO blur, sharp edge
  const bright = c.clone().lerp(new THREE.Color("#ffffff"), 0.75);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = `#${bright.getHexString()}`;
  ctx.shadowBlur = 0;
  drawGlyph();
  ctx.restore();

  tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}










