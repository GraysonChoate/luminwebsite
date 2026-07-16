// HubLabels — permanent tool-name labels anchored to each orb, in-scene.
// Visible in BOTH main and focused states; no pill nav, no DOM captions.
//
// SHARP-CORE + GLOW-HALO rendering (final polish spec): the letterform core
// is baked crisp — no shadow, no baked blur, high-resolution canvas — and the
// spectrum glow lives on a SEPARATE additive halo texture rendered behind it.
// Bloom can catch the halo layer; the glyph cores stay clean signage.
import { useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { HUBS, SPECTRUM_COLORS, type HubDef } from "../../data/lumin-ecosystem";
import { useEcosystemState } from "../../hooks/useEcosystemState";
import { approach, entrancePhase, entranceDone, hubEntranceWindow, unfoldPhase } from "./Entrance";
import { useScrimTexture } from "./LuminNucleus";
import { labelFont, subscribeFonts, fontsVersion } from "./SceneFonts";

const CANVAS_W = 1024;
const CANVAS_H = 224;
const FONT_PX = 80;
const TRACKING = 0.26; // em — a touch wider for legibility at small sizes

const labelCache = new Map<string, { crisp: THREE.Texture; glow: THREE.Texture }>();

function drawTracked(ctx: CanvasRenderingContext2D, text: string, stroke = false) {
  ctx.font = labelFont(FONT_PX);
  const gap = FONT_PX * TRACKING;
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, w) => a + w, 0) + gap * (text.length - 1);
  let x = CANVAS_W / 2 - total / 2;
  [...text].forEach((ch, i) => {
    if (stroke) ctx.strokeText(ch, x, CANVAS_H / 2);
    else ctx.fillText(ch, x, CANVAS_H / 2);
    x += widths[i] + gap;
  });
}

function labelTextures(hub: HubDef): { crisp: THREE.Texture; glow: THREE.Texture } {
  const cached = labelCache.get(hub.id);
  if (cached) return cached;
  const tint = new THREE.Color(SPECTRUM_COLORS[hub.spectrum]);
  // near-white fill — the spectrum color lives in the halo behind
  const fill = "#" + tint.clone().lerp(new THREE.Color("#ffffff"), 0.86).getHexString();
  const halo = "#" + tint.getHexString();
  const text = hub.label.toUpperCase();

  // CRISP CORE — dark contour under sharp glyphs (local contrast against
  // bright wireframes), zero baked blur
  const crispCanvas = document.createElement("canvas");
  crispCanvas.width = CANVAS_W;
  crispCanvas.height = CANVAS_H;
  const c = crispCanvas.getContext("2d")!;
  c.textBaseline = "middle";
  c.textAlign = "left";
  c.strokeStyle = "rgba(5, 6, 14, 0.9)";
  c.lineWidth = 7;
  c.lineJoin = "round";
  drawTracked(c, text, true);
  c.fillStyle = fill;
  drawTracked(c, text);

  // GLOW HALO — wide soft spectrum aura on its own layer, behind the core
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = CANVAS_W;
  glowCanvas.height = CANVAS_H;
  const g = glowCanvas.getContext("2d")!;
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.fillStyle = halo;
  g.shadowColor = halo;
  for (const blur of [36, 18]) {
    g.shadowBlur = blur;
    g.globalAlpha = 0.5;
    drawTracked(g, text);
  }

  const crisp = new THREE.CanvasTexture(crispCanvas);
  const glow = new THREE.CanvasTexture(glowCanvas);
  crisp.anisotropy = 8;
  glow.anisotropy = 4;
  const out = { crisp, glow };
  labelCache.set(hub.id, out);
  return out;
}

// Rebake all labels once the document's fonts are actually ready (SceneFonts
// contract — first bake may have used a system fallback; that WAS the old
// blurriness). Cache clears on the readiness flip; components re-render via
// useSyncExternalStore below.
subscribeFonts(() => {
  labelCache.forEach(({ crisp, glow }) => {
    crisp.dispose();
    glow.dispose();
  });
  labelCache.clear();
});

function HubLabel({ hub }: { hub: HubDef }) {
  const crispRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const scrimRef = useRef<THREE.Mesh>(null);
  const scrimTexture = useScrimTexture();
  const related = useEcosystemState((s) => s.related);
  const mode = useEcosystemState((s) => s.mode);
  const hoveredId = useEcosystemState((s) => s.hoveredId);
  const focusedHub = useEcosystemState((s) => s.focusedHub);
  const entWindow = useMemo(() => hubEntranceWindow(hub.position), [hub.position]);
  // re-render (and rebake) when the document fonts become ready
  const version = useSyncExternalStore(subscribeFonts, fontsVersion, fontsVersion);
  const textures = useMemo(() => labelTextures(hub), [hub, version]);
  // hang just below the orb's rotating ring
  const yOff = -(hub.scale * 0.45 * 2.15 + 0.3);
  const planeW = 1.52; // slightly enlarged for legibility
  const planeH = planeW * (CANVAS_H / CANVAS_W);

  useFrame(() => {
    // labels arrive with the titles: last phase of the unfold, staggered
    // slightly per hub by its distance from the center
    const dist = Math.hypot(hub.position[0], hub.position[1]);
    const from = 2600 + dist * 55;
    const ent = unfoldPhase(from, from + 620);
    const active = hoveredId === hub.id || focusedHub === hub.id;
    const dimmed = mode !== "idle" && !related.has(hub.id);
    const target = (dimmed ? 0.1 : active ? 1 : 0.78) * ent;
    if (crispRef.current) {
      const m = crispRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = approach(m.opacity, target, 0.09);
    }
    if (glowRef.current) {
      const m = glowRef.current.material as THREE.MeshBasicMaterial;
      // halo runs quieter than the core; brightens more when active
      m.opacity = approach(m.opacity, target * (active ? 0.55 : 0.32), 0.09);
    }
    if (scrimRef.current) {
      const m = scrimRef.current.material as THREE.MeshBasicMaterial;
      // atmospheric separation: quiet local darkening behind the label
      m.opacity = approach(m.opacity, target * (dimmed ? 0.2 : 0.62), 0.09);
    }
  });

  return (
    <group position={[hub.position[0], hub.position[1] + yOff, hub.position[2]]}>
      <Billboard>
        {/* local darkening scrim — pushes the network back behind the label */}
        <mesh ref={scrimRef} renderOrder={14}>
          <planeGeometry args={[planeW * 1.45, planeH * 2.3]} />
          <meshBasicMaterial
            map={scrimTexture}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
        {/* spectrum halo — separate additive layer BEHIND the letterforms */}
        <mesh ref={glowRef} renderOrder={15}>
          <planeGeometry args={[planeW, planeH]} />
          <meshBasicMaterial
            map={textures.glow}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
        {/* crisp letterform core — tone-mapped, sub-threshold, never blooms */}
        <mesh ref={crispRef} renderOrder={16} position={[0, 0, 0.01]}>
          <planeGeometry args={[planeW, planeH]} />
          <meshBasicMaterial
            map={textures.crisp}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
      </Billboard>
    </group>
  );
}

export function HubLabels() {
  return (
    <group>
      {HUBS.map((h) => (
        <HubLabel key={h.id} hub={h} />
      ))}
    </group>
  );
}













