// InfinityFlow — the PRIMARY ENERGY HIGHWAY. One clean, symmetrical,
// continuous figure-eight around both hemispheres, crossing itself exactly
// once: at the central Lumin orb. Smooth analytic curve (Gerono lemniscate —
// elliptical lobes, no random splines, no knots).
//
// COLOR = FLOW: one continuous gradient along the single path — Lumin One's
// cyan/teal/blue across the left lobe, violet→magenta across the right lobe,
// converging to bright white right where the path passes through the nucleus.
//
// ENERGY: one primary pulse travels the full circuit (nucleus → left lobe →
// nucleus → right lobe → nucleus), plus a smaller counterflow pulse running
// the opposite direction — constant feedback. The nucleus softly brightens
// each time either pulse passes through (see nucleusPulseBoost, read by
// LuminNucleus every frame).
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import type { Line2 } from "three-stdlib";
import * as THREE from "three";
import { SPECTRUM_COLORS } from "../../data/lumin-ecosystem";
import { useEcosystemState } from "../../hooks/useEcosystemState";
import { useGlowTexture } from "./LuminNucleus";
import { approach, entrancePhase, entranceDone, pulseBus } from "./Entrance";

// Lobe geometry: traces the hemisphere membranes (centers ±3.4, radius ≈2.85).
export const SPAN_X = 6.25; // reaches the outer edge of each membrane
export const LOBE_Y = 2.85; // lobe apex matches the membrane crown
const BOW_Z = 0.35; // slight forward bow for dimensionality

export function lemniscatePoint(t: number, out: THREE.Vector3): THREE.Vector3 {
  // t in [0, 2π). Gerono figure-eight; the crossing is exactly the nucleus.
  const s = Math.sin(t);
  const c = Math.cos(t);
  out.set(SPAN_X * s, LOBE_Y * s * c, BOW_Z * s * s * c);
  return out;
}

// Arc-length-true sampler for the highway. Raw lemniscate parameter speed is
// uneven (fast at the crossing, slow at the lobe tips); path-following energy
// bodies must travel at a visually even pace, so they sample through this
// curve's arc-length mapping instead of raw t.
class HighwayCurve extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super();
    this.arcLengthDivisions = 600;
  }
  override getPoint(t01: number, target = new THREE.Vector3()): THREE.Vector3 {
    return lemniscatePoint(t01 * Math.PI * 2, target);
  }
}
const HIGHWAY = new HighwayCurve();

/** Position on the highway at arc-length fraction u ∈ [0,1) — even pace. */
export function highwayPointAt(u: number, out: THREE.Vector3): THREE.Vector3 {
  return HIGHWAY.getPointAt(((u % 1) + 1) % 1, out);
}

// ---- One controlled gradient along one path --------------------------------
// Left lobe: cyan/teal outer → blue toward center. Right lobe: magenta/orchid
// outer → violet toward center. Convergence: bright white at the crossing.
//
// HEMISPHERE LUMINANCE BALANCE: raw brand values are wildly uneven (teal/cyan
// ~2.5× the perceived luminance of Aurora violet), which made the blue side
// read brighter. Each gradient stop is pinned to a shared HSL lightness so
// both lobes emit with EQUAL perceived energy — hue families unchanged.
function pinL(hex: string, l: number): THREE.Color {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(hsl.s, 0.95), l);
  return c;
}
const C_BLUE = pinL(SPECTRUM_COLORS["one-blue"], 0.6);
const C_VIOLET = pinL(SPECTRUM_COLORS["pro-violet"], 0.6);
const COOL_OUTER = pinL(SPECTRUM_COLORS["one-teal"], 0.62).lerp(
  pinL(SPECTRUM_COLORS["one-cyan"], 0.62),
  0.45,
);
const WARM_OUTER = pinL(SPECTRUM_COLORS["pro-magenta"], 0.62).lerp(
  pinL(SPECTRUM_COLORS["pro-orchid"], 0.62),
  0.35,
);
const WHITE_CORE = new THREE.Color("#f2f5ff");
const G_TMP1 = new THREE.Color();
const G_TMP2 = new THREE.Color();

/** Sample the highway gradient by world-x: cool lobe → white crossing → warm lobe. */
export function spineColorAt(x: number, out: THREE.Color): THREE.Color {
  const u = THREE.MathUtils.clamp(x / SPAN_X, -1, 1);
  const a = Math.abs(u);
  G_TMP1.copy(C_BLUE).lerp(COOL_OUTER, THREE.MathUtils.smoothstep(a, 0.15, 0.9));
  G_TMP2.copy(C_VIOLET).lerp(WARM_OUTER, THREE.MathUtils.smoothstep(a, 0.15, 0.9));
  const s = THREE.MathUtils.smoothstep(u, -0.3, 0.3);
  out.copy(G_TMP1).lerp(G_TMP2, s);
  // bright white convergence exactly at the crossing
  const w = 1 - THREE.MathUtils.smoothstep(a, 0.0, 0.16);
  return out.lerp(WHITE_CORE, w * 0.85);
}

// Nucleus feedback: how strongly a pulse is currently passing through the
// center (0..1). Written to the shared pulseBus; LuminNucleus reads it each
// frame to brighten its halo as energy passes through.

const SEGMENTS = 480;
const MAIN_PERIOD = 12; // s per full circuit (both lobes)
const COUNTER_PERIOD = 17; // slower, smaller, opposite direction
const PULSE_V = new THREE.Vector3();
const PULSE_C = new THREE.Color();

export function InfinityFlow() {
  const mode = useEcosystemState((s) => s.mode);
  const lineRef = useRef<Line2 | null>(null);
  const pulseRefs = useRef<(THREE.Mesh | null)[]>([]);
  const glowTexture = useGlowTexture();

  const { points, vertexColors } = useMemo(() => {
    const pts: [number, number, number][] = [];
    const cols: [number, number, number][] = [];
    const v = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i <= SEGMENTS; i++) {
      lemniscatePoint((i / SEGMENTS) * Math.PI * 2, v);
      pts.push([v.x, v.y, v.z]);
      spineColorAt(v.x, c);
      cols.push([c.r, c.g, c.b]);
    }
    return { points: pts, vertexColors: cols };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const ent = entranceDone() ? 1 : entrancePhase(2300, 3200);
    const presence = mode === "idle" || mode === "hover" ? 1 : 0.5;
    if (lineRef.current) {
      const m = lineRef.current.material;
      const breathe = 1 + Math.sin(t * 0.5) * 0.1;
      const ignite = ent > 0 && ent < 1 ? 1 + Math.sin(ent * Math.PI) * 0.5 : 1;
      const target = 0.3 * presence * breathe * ent * ignite;
      m.opacity = approach(m.opacity, target, (ent < 1 ? 0.18 : 0.06));
    }

    // ---- traveling pulses: main + counterflow ------------------------------
    // Both start at the nucleus (lemniscate t=0 IS the crossing). The main
    // pulse's circuit order is left lobe → nucleus → right lobe → nucleus.
    let boost = 0;
    const V = PULSE_V;
    const C = PULSE_C;
    for (let i = 0; i < 2; i++) {
      const mesh = pulseRefs.current[i];
      if (!mesh) continue;
      const period = i === 0 ? MAIN_PERIOD : COUNTER_PERIOD;
      const dir = i === 0 ? -1 : 1; // main runs left lobe first; counter opposes
      const u = (((t / period) * dir) % 1 + 1) % 1;
      // arc-length-true travel: even orbital pace, no parameter speed-up
      highwayPointAt(u, V);
      mesh.position.copy(V);
      // proximity to the crossing (nucleus) — drives the center brightening
      const near = Math.max(0, 1 - Math.abs(V.x) / 1.0);
      boost += near * (i === 0 ? 0.7 : 0.35);
      const m = mesh.material as THREE.MeshBasicMaterial;
      // pulse wears the local gradient color, lifted toward white
      spineColorAt(V.x, C).lerp(WHITE_CORE, i === 0 ? 0.45 : 0.25);
      m.color.copy(C);
      const targetOp = (i === 0 ? 0.9 : 0.55) * presence * ent * (1 + near * 0.5);
      m.opacity = approach(m.opacity, Math.min(targetOp, 1), 0.15);
      mesh.scale.setScalar((i === 0 ? 0.17 : 0.1) * (1 + near * 0.35));
    }
    pulseBus.boost += (Math.min(boost, 1) - pulseBus.boost) * 0.12;
  });

  return (
    <group>
      <Line
        ref={(l) => {
          lineRef.current = l as unknown as Line2;
        }}
        points={points}
        vertexColors={vertexColors}
        color="#ffffff"
        lineWidth={1.9}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
      {[0, 1].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            pulseRefs.current[i] = m;
          }}
          renderOrder={4}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color="#ffffff"
            map={glowTexture}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}










