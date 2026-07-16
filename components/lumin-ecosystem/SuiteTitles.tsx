// SuiteTitles — permanent, in-scene suite names. One above each hemisphere,
// centered on that sphere's own vertical axis: "Lumin One" left, "Lumin Pro"
// right. Always visible from first load; no hover trigger. The suite's brief
// (tagline) is cast underneath the name in a smaller, quieter setting.
//
// Integration rules (owner spec):
//  * Tinted by the hemisphere's own spectrum (cool blue/teal for One,
//    violet/orchid for Pro) — never neutral UI white.
//  * A soft breathing glow in the same rhythm family as the hub cores
//    (base frequency 0.8, matching HubNode's breathe).
//  * Letterforms stay clean and restrained; richness comes from tint and
//    breath. Rendered INSIDE the WebGL scene (billboarded, parallax-correct)
//    so it reads as part of the structure, not a caption.
import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { SUITES, SPECTRUM_COLORS, type SuiteDef } from "../../data/lumin-ecosystem";
import { useEcosystemState } from "../../hooks/useEcosystemState";
import { approach, unfoldPhase } from "./Entrance";
import { useScrimTexture } from "./LuminNucleus";
import { titleFont as sceneTitleFont, briefFont as sceneBriefFont, subscribeFonts } from "./SceneFonts";

// Per-suite tint: One leans Supernova-blue pulled toward teal; Pro leans
// Aurora-violet pulled toward orchid. Both then lifted toward white for
// legibility — "lit by its hemisphere", not saturated neon.
const TITLE_TINT: Record<string, string> = {
  "suite-one": blend(SPECTRUM_COLORS["one-blue"], SPECTRUM_COLORS["one-teal"], 0.35),
  "suite-pro": blend(SPECTRUM_COLORS["pro-violet"], SPECTRUM_COLORS["pro-orchid"], 0.55),
};

function blend(a: string, b: string, t: number): string {
  return "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
}

const CANVAS_W = 2048;
const CANVAS_H = 600;
const TITLE_TRACKING = 0.34; // em — wide, calm setting
const BRIEF_TRACKING = 0.3;
const TITLE_FONT = (px: number) => sceneTitleFont(px);
const BRIEF_FONT = (px: number) => sceneBriefFont(px);

/** Draw text centered with manual letter-spacing. */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  px: number,
  font: string,
  tracking: number,
  stroke = false,
) {
  ctx.font = font;
  const gap = px * tracking;
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, w) => a + w, 0) + gap * (text.length - 1);
  let x = cx - total / 2;
  [...text].forEach((ch, i) => {
    if (stroke) ctx.strokeText(ch, x, cy);
    else ctx.fillText(ch, x, cy);
    x += widths[i] + gap;
  });
}

/** Bake crisp + glow textures for one title (name + brief underneath). */
function bakeTitle(
  text: string,
  brief: string,
  tint: string,
): { crisp: THREE.Texture; glow: THREE.Texture } {
  const t = new THREE.Color(tint);
  // fill: PURE WHITE core — the tint lives only in the halo layer behind.
  // A thin dark contour is stroked under the fill for local contrast, so the
  // letterforms stay razor-sharp even over bright wireframe geometry.
  const fill = "#ffffff";
  const briefFill = "#" + t.clone().lerp(new THREE.Color("#ffffff"), 0.78).getHexString();
  const halo = "#" + t.getHexString();
  const title = text.toUpperCase();
  const sub = brief.toUpperCase().replace(/\.$/, "");

  const crispCanvas = document.createElement("canvas");
  crispCanvas.width = CANVAS_W;
  crispCanvas.height = CANVAS_H;
  const c = crispCanvas.getContext("2d")!;
  c.textBaseline = "middle";
  c.textAlign = "left";
  // SHARP CORE: zero baked blur — the glow lives entirely on the halo layer,
  // so bloom/softness can never smear the letterforms.
  // Dark contour first (local contrast against bright wireframes behind)...
  c.strokeStyle = "rgba(5, 6, 14, 0.85)";
  c.lineWidth = 10;
  c.lineJoin = "round";
  drawTracked(c, title, CANVAS_W / 2, 224, 160, TITLE_FONT(160), TITLE_TRACKING, true);
  // ...then the pure-white fill on top
  c.fillStyle = fill;
  drawTracked(c, title, CANVAS_W / 2, 224, 160, TITLE_FONT(160), TITLE_TRACKING);
  // the brief, cast underneath — smaller, quieter, same treatment
  c.strokeStyle = "rgba(5, 6, 14, 0.75)";
  c.lineWidth = 5;
  drawTracked(c, sub, CANVAS_W / 2, 452, 54, BRIEF_FONT(54), BRIEF_TRACKING, true);
  c.fillStyle = briefFill;
  drawTracked(c, sub, CANVAS_W / 2, 452, 54, BRIEF_FONT(54), BRIEF_TRACKING);

  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = CANVAS_W;
  glowCanvas.height = CANVAS_H;
  const g = glowCanvas.getContext("2d")!;
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.shadowColor = halo;
  g.fillStyle = halo;
  // wide soft passes — this layer is the breathing aura behind the letterforms
  for (const blur of [128, 80, 52]) {
    g.shadowBlur = blur;
    g.globalAlpha = 0.55;
    drawTracked(g, title, CANVAS_W / 2, 224, 160, TITLE_FONT(160), TITLE_TRACKING);
  }
  g.globalAlpha = 0.22;
  g.shadowBlur = 44;
  drawTracked(g, sub, CANVAS_W / 2, 452, 54, BRIEF_FONT(54), BRIEF_TRACKING);

  const crisp = new THREE.CanvasTexture(crispCanvas);
  const glow = new THREE.CanvasTexture(glowCanvas);
  crisp.anisotropy = 8;
  return { crisp, glow };
}

const TITLE_Y = 3.62; // world y of the title block (sphere top ≈ 2.85)

function SuiteTitle({ suite }: { suite: SuiteDef }) {
  const related = useEcosystemState((s) => s.related);
  const mode = useEcosystemState((s) => s.mode);
  const hoveredId = useEcosystemState((s) => s.hoveredId);
  const focusedSuite = useEcosystemState((s) => s.focusedSuite);
  const crispRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const scrimRef = useRef<THREE.Mesh>(null);
  const scrimTexture = useScrimTexture();
  const pulse = useRef(0); // hover-energy envelope, eased
  const tint = TITLE_TINT[suite.id];
  const [textures, setTextures] = useState<{ crisp: THREE.Texture; glow: THREE.Texture } | null>(
    null,
  );

  // Bake once the display fonts are actually loaded (rebake swaps the fallback).
  useEffect(() => {
    let disposed = false;
    const bake = () => {
      if (disposed) return;
      setTextures((old) => {
        old?.crisp.dispose();
        old?.glow.dispose();
        return bakeTitle(suite.label, suite.tagline, tint);
      });
    };
    bake(); // immediate (system-font fallback so the name is never missing)
    // SceneFonts contract: rebake once the document's fonts are truly ready
    const unsub = subscribeFonts(() => {
      if (!disposed) bake();
    });
    return () => {
      disposed = true;
      unsub();
    };
  }, [suite.label, suite.tagline, tint]);

  // phase offset so the two titles don't breathe in lockstep (same family,
  // not a metronome) — One leads, Pro trails by ~a third of a cycle
  const phase = suite.id === "suite-one" ? 0 : 2.1;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // UNFOLD SEQUENCE: titles arrive LAST — after the structure has mostly
    // resolved (2600–3400ms of the unfold). Hidden entirely while collapsed.
    const ent = unfoldPhase(2600, 3400);
    const lit = related.has(suite.id);
    const presence = mode === "idle" || mode === "hover" ? 1 : lit ? 1 : 0.55;

    // HOVER ENERGY: hovering this hemisphere (the suite itself, or any of its
    // hubs) charges the title — the halo surges and beats faster, the crisp
    // core lifts to full. Eased envelope in/out, no snapping.
    const hoveredSuite =
      hoveredId === suite.id ||
      (related.has(suite.id) && hoveredId !== null && mode === "hover");
    const charged = hoveredSuite || focusedSuite === suite.id;
    pulse.current += ((charged ? 1 : 0) - pulse.current) * 0.08;
    const p = pulse.current;

    // breath in the hub-core rhythm family (base 0.8); when charged, an
    // energetic pulsation rides on top (faster beat, deeper swing)
    const breath = Math.sin(t * 0.8 + phase);
    const energyBeat = Math.sin(t * 3.2 + phase) * 0.5 + Math.sin(t * 5.1) * 0.2;
    if (crispRef.current) {
      const m = crispRef.current.material as THREE.MeshBasicMaterial;
      const base = 0.97 + breath * 0.03;
      m.opacity = approach(m.opacity, (base + p * 0.03) * presence * ent, 0.07);
      // subtle scale swell while charged — the title visibly energizes
      crispRef.current.scale.setScalar(1 + p * (0.035 + energyBeat * 0.012));
    }
    if (glowRef.current) {
      const m = glowRef.current.material as THREE.MeshBasicMaterial;
      const idleGlow = 0.42 + breath * 0.12;
      const chargedGlow = 0.95 + energyBeat * 0.3;
      m.opacity = approach(m.opacity, (idleGlow + (chargedGlow - idleGlow) * p) * presence * ent, 0.09);
      glowRef.current.scale.setScalar(1 + p * (0.05 + energyBeat * 0.02));
    }
    if (scrimRef.current) {
      const m = scrimRef.current.material as THREE.MeshBasicMaterial;
      // atmospheric separation behind the title block
      m.opacity = approach(m.opacity, 0.55 * presence * ent, 0.07);
    }
  });

  if (!textures) return null;

  const cx = suite.center[0];
  const planeW = 3.25; // slightly enlarged — suite names read FIRST
  const planeH = (CANVAS_H / CANVAS_W) * planeW;

  return (
    <Billboard position={[cx, TITLE_Y, 0]}>
      {/* local darkening scrim — separates the title from the network */}
      <mesh ref={scrimRef} renderOrder={17}>
        <planeGeometry args={[planeW * 1.35, planeH * 1.9]} />
        <meshBasicMaterial
          map={scrimTexture}
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      {/* breathing aura (additive, behind) */}
      <mesh ref={glowRef} renderOrder={18}>
        <planeGeometry args={[planeW * 1.07, (CANVAS_H / CANVAS_W) * planeW * 1.07]} />
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
      {/* crisp letterforms (tone-mapped, sub-threshold — never blooms) */}
      <mesh ref={crispRef} renderOrder={19} position={[0, 0, 0.01]}>
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
  );
}

export function SuiteTitles() {
  const suites = useMemo(() => SUITES, []);
  return (
    <group>
      {suites.map((s) => (
        <SuiteTitle key={s.id} suite={s} />
      ))}
    </group>
  );
}





















