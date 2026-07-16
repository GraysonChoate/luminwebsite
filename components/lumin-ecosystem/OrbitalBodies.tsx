// OrbitalBodies — the released satellite dots as free orbital energy bodies.
//
// Owner spec: the small colored circles no longer park beside their hubs —
// they circulate around the ENTIRE composition on their own large, perfect
// figure-eight paths that run slightly adjacent to the main highway (parallel
// companions of the lemniscate family: same law, small per-body offsets in
// scale, lobe height, depth and tilt — never on the exact same line).
//
// VELOCITY = KINETIC ENERGY. Each body obeys an energy-conservation curve
// with the central crossing as the bottom of the potential well:
//     v(x) = sqrt(vmax² − (vmax² − vmin²)·|x|/A)
// — fastest as it plunges through the Lumin center, slowest at the far lobe
// turnarounds, exactly like an orbital body trading potential for kinetic
// energy. Travel is world-space true: the param step is divided by the local
// tangent length, so the pacing law holds regardless of curve distortion.
//
// Each body keeps its origin hub's spectrum color (luminance-pinned), its own
// seeded path variant, direction, and phase. No runtime randomness.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HUBS } from "../../data/lumin-ecosystem";
import { glowColor } from "../../lib/spectrum-colors";
import { SPAN_X, LOBE_Y } from "./InfinityFlow";
import { useEcosystemState } from "../../hooks/useEcosystemState";
import { entrancePhase, entranceDone } from "./Entrance";

interface Body {
  groupHubs: string[]; // all hubs sharing this spectrum (for relation dimming)
  color: THREE.Color;
  // path variant (adjacent lemniscate) — SHARED by the whole spectrum group
  A: number; // x half-span
  B: number; // lobe height
  Z: number; // z bow
  zOff: number; // depth offset
  tilt: number; // small rotation about the x-axis
  dir: 1 | -1;
  u: number; // param phase [0,1) — integrated state
  vScale: number; // group speed multiplier
  size: number;
}

function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// kinetic-energy speed law (world units / s) — very slow drifting pace
const V_MAX = 0.62; // through the center
const V_MIN = 0.24; // at the lobe turnarounds

const P_TMP = new THREE.Vector3();
const P_A = new THREE.Vector3();
const P_B = new THREE.Vector3();
const M_TMP = new THREE.Matrix4();
const Q_IDENT = new THREE.Quaternion();
const S_TMP = new THREE.Vector3();

function bodyPoint(b: Body, u: number, out: THREE.Vector3): THREE.Vector3 {
  const t = u * Math.PI * 2;
  const s = Math.sin(t);
  const c = Math.cos(t);
  const x = b.A * s;
  let y = b.B * s * c;
  let z = b.Z * s * s * c + b.zOff;
  // small tilt about the x-axis keeps the eight perfect but adjacent
  const cy = Math.cos(b.tilt);
  const sy = Math.sin(b.tilt);
  const y2 = y * cy - z * sy;
  const z2 = y * sy + z * cy;
  return out.set(x, y2, z2);
}

export function OrbitalBodies() {
  const inst = useRef<THREE.InstancedMesh>(null);
  const instHalo = useRef<THREE.InstancedMesh>(null);
  const mode = useEcosystemState((s) => s.mode);
  const related = useEcosystemState((s) => s.related);

  const bodies = useMemo<Body[]>(() => {
    const rng = makeRng(77);
    const out: Body[] = [];

    // GROUP BY SPECTRUM: all satellites of the same color family travel as
    // one convoy — a shared orbit (one lane per spectrum), one shared speed
    // and direction, evenly spaced along the lane like beads on a chain.
    const groups = new Map<string, { hubs: string[]; count: number }>();
    for (const hub of HUBS) {
      const g = groups.get(hub.spectrum) ?? { hubs: [], count: 0 };
      g.hubs.push(hub.id);
      g.count += hub.satellites.length;
      groups.set(hub.spectrum, g);
    }

    let lane = 0;
    const laneTotal = groups.size;
    for (const [spectrum, g] of groups) {
      const col = glowColor(spectrum as Parameters<typeof glowColor>[0]).clone();
      // one shared lane per spectrum: deterministic spread across the family
      const f = laneTotal > 1 ? lane / (laneTotal - 1) : 0.5; // 0..1
      const A = SPAN_X * (0.97 + f * 0.16);
      const B = LOBE_Y * (0.85 + f * 0.36);
      const Z = 0.4 + f * 0.4;
      const zOff = (f - 0.5) * 0.9;
      const tilt = (f - 0.5) * 0.2;
      const dir: 1 | -1 = lane % 2 === 0 ? 1 : -1;
      const vScale = 0.95 + f * 0.15; // near-uniform, slight per-lane character
      const phase0 = rng(); // lane phase — convoys don't all cross at once
      for (let i = 0; i < g.count; i++) {
        out.push({
          groupHubs: g.hubs,
          color: col,
          A,
          B,
          Z,
          zOff,
          tilt,
          dir,
          // beads on a chain: even spacing within ~a fifth of the lane, so the
          // group reads as a coherent moving formation, not a full-loop smear
          u: (phase0 + (i / Math.max(g.count, 1)) * 0.22) % 1,
          vScale,
          size: 0.022 + (i % 3) * 0.0035,
        });
      }
      lane++;
    }
    return out;
  }, []);

  useFrame((_, delta) => {
    const mesh = inst.current;
    const haloMesh = instHalo.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.1);
    const ent = entranceDone() ? 1 : entrancePhase(1500, 2700);

    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];

      // kinetic-energy speed at the current position
      bodyPoint(b, b.u, P_TMP);
      const drop = Math.min(Math.abs(P_TMP.x) / b.A, 1); // 0 at center → 1 at tip
      const v = Math.sqrt(V_MAX * V_MAX - (V_MAX * V_MAX - V_MIN * V_MIN) * drop) * b.vScale;

      // world-space-true integration: param step = world step / tangent length
      const e = 1e-3;
      bodyPoint(b, b.u + e, P_A);
      bodyPoint(b, b.u - e, P_B);
      const tangent = P_A.sub(P_B).length() / (2 * e); // |dP/du|
      b.u = (((b.u + (b.dir * v * dt) / Math.max(tangent, 1e-3)) % 1) + 1) % 1;

      bodyPoint(b, b.u, P_TMP);

      // presence: dim the convoy when none of its spectrum's hubs are related
      let presence = ent;
      if (mode !== "idle" && !b.groupHubs.some((id) => related.has(id))) presence *= 0.3;
      const scale = b.size * (0.35 + presence * 0.65);

      M_TMP.compose(P_TMP, Q_IDENT, S_TMP.setScalar(Math.max(scale, 1e-4)));
      mesh.setMatrixAt(i, M_TMP);
      // luminescent shell: soft additive halo ~2.6× the core, same position
      if (haloMesh) {
        M_TMP.compose(P_TMP, Q_IDENT, S_TMP.setScalar(Math.max(scale * 2.6, 1e-4)));
        haloMesh.setMatrixAt(i, M_TMP);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (haloMesh) haloMesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* solid luminous core */}
      <instancedMesh
        ref={inst}
        args={[undefined, undefined, bodies.length]}
        frustumCulled={false}
        onUpdate={(m) => {
          for (let i = 0; i < bodies.length; i++) m.setColorAt(i, bodies[i].color);
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
        }}
      >
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.92} depthWrite={false} />
      </instancedMesh>
      {/* additive glow shell — the luminescence */}
      <instancedMesh
        ref={instHalo}
        args={[undefined, undefined, bodies.length]}
        frustumCulled={false}
        onUpdate={(m) => {
          for (let i = 0; i < bodies.length; i++) m.setColorAt(i, bodies[i].color);
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
        }}
      >
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial
          toneMapped={false}
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}












