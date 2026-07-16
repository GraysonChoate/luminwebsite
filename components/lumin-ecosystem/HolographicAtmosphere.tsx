// HolographicAtmosphere — constrained orbital particles on the through-line
// family (final polish pass).
//
// MOTION LAWS (owner spec):
//  * Path-constrained — every particle is locked to one closed center-crossing
//    figure-eight orbit (a hub through-line or the outer infinity highway).
//    Nothing floats, nothing drifts off-path.
//  * Arc-length travel — position is advanced along the curve's true arc
//    length (getPointAt / arc LUT), so pace reads visually even everywhere on
//    the curve instead of speeding up through parameter distortion.
//  * Momentum-preserving pass-through — position is INTEGRATED per frame
//    (s += v·dt), a continuous state. Particles carry momentum through the
//    Lumin crossing: no stop, no snap, no respawn discontinuity.
//  * Centripetal feel — because travel is arc-length-true on smooth closed
//    curves, particles naturally sweep the lobes like guided orbital bodies.
//  * Center intensification — the crossing is the strongest exchange point:
//    speed lifts subtly (+~45%) and the particle brightens/whitens as it
//    threads the nucleus, then relaxes back into its lobe.
//  * Phase-shifted circulation — each particle owns its rhythm: seeded speed,
//    direction, and starting phase. Same system, independent timing.
//  * No jitter — zero randomness at runtime; all variation is seeded once.
//
// Color = position in the flow: every particle wears the shared gradient of
// wherever it currently is (cool left lobe → white crossing → warm right).
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getThroughLines } from "./Connections";
import { highwayPointAt, spineColorAt } from "./InfinityFlow";
import { useEcosystemState } from "../../hooks/useEcosystemState";
import { entrancePhase, entranceDone } from "./Entrance";

interface Packet {
  orbit: number; // index into orbits[]; -1 = the outer highway
  dir: 1 | -1;
  speed: number; // arc fractions per second (1/period)
  s: number; // current arc-length fraction [0,1) — integrated state
}

// deterministic LCG so the circulation pattern is reproducible
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const PACKETS_PER_ORBIT = 3;
const HIGHWAY_PACKETS = 12;
// subtle acceleration through the convergence point (strongest exchange zone)
const CENTER_ACCEL = 0.45;
const CENTER_ZONE = 1.1; // world-x half-width of the intensification zone
const V_TMP = new THREE.Vector3();
const C_TMP = new THREE.Color();
const OUT_C = new THREE.Color();
const WHITE = new THREE.Color("#ffffff");

export function HolographicAtmosphere({ count = 300 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const mode = useEcosystemState((s) => s.mode);
  const related = useEcosystemState((s) => s.related);

  // `count` (debug slider) scales total traffic density around the default.
  const density = Math.max(0.2, Math.min(count / 300, 2));
  const orbits = useMemo(() => getThroughLines(), []);

  const { packets, positions, colors } = useMemo(() => {
    const rng = makeRng(42);
    const packets: Packet[] = [];
    const perOrbit = Math.max(1, Math.round(PACKETS_PER_ORBIT * density));
    orbits.forEach((_, oi) => {
      for (let k = 0; k < perOrbit; k++) {
        packets.push({
          orbit: oi,
          dir: k % 2 === 0 ? 1 : -1,
          speed: 1 / (10 + rng() * 6), // full circuit in 10–16 s
          s: (k / perOrbit + rng() * 0.5 / perOrbit) % 1, // spread + jittered ONCE
        });
      }
    });
    const hw = Math.max(2, Math.round(HIGHWAY_PACKETS * density));
    for (let k = 0; k < hw; k++) {
      packets.push({
        orbit: -1,
        dir: k % 2 === 0 ? 1 : -1,
        speed: 1 / (13 + rng() * 6), // highway is longer: 13–19 s
        s: (k / hw + rng() * 0.5 / hw) % 1,
      });
    }
    return {
      packets,
      positions: new Float32Array(packets.length * 3),
      colors: new Float32Array(packets.length * 3),
    };
  }, [density, orbits]);

  useFrame((_, delta) => {
    if (!points.current) return;
    const dt = Math.min(delta, 0.1); // clamp tab-switch jumps — no teleporting
    const ent = entranceDone() ? 1 : entrancePhase(600, 2400);
    const posAttr = points.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = points.current.geometry.getAttribute("color") as THREE.BufferAttribute;

    for (let i = 0; i < packets.length; i++) {
      const p = packets[i];

      // current position (arc-length true) — needed for the speed modulation
      if (p.orbit >= 0) {
        orbits[p.orbit].curve.getPointAt(p.s, V_TMP);
      } else {
        highwayPointAt(p.s, V_TMP);
      }

      // center proximity: the exchange zone accelerates and intensifies flow
      const near = Math.max(0, 1 - Math.abs(V_TMP.x) / CENTER_ZONE);

      // momentum-preserving integration: continuous, wraps through the
      // crossing without any snap — the particle simply keeps flowing
      p.s = (((p.s + p.dir * p.speed * (1 + CENTER_ACCEL * near) * dt) % 1) + 1) % 1;

      // presence: constant circulation (no dead time); relationship rules dim
      let alpha = ent;
      if (p.orbit >= 0) {
        const lit = orbits[p.orbit].hubIds.some((id) => related.has(id));
        if (mode !== "idle" && !lit) alpha *= 0.25;
      } else if (mode !== "idle" && mode !== "hover") {
        alpha *= 0.45;
      }

      // COLOR IS THE FLOW: shared gradient at the particle's position, with a
      // gentle white-hot lift while threading the exchange point
      spineColorAt(V_TMP.x, C_TMP).lerp(WHITE, near * 0.3);
      const intensity = alpha * (0.72 + near * 0.45);
      OUT_C.copy(C_TMP).multiplyScalar(Math.min(intensity, 1.15));

      posAttr.setXYZ(i, V_TMP.x, V_TMP.y, V_TMP.z);
      colAttr.setXYZ(i, OUT_C.r, OUT_C.g, OUT_C.b);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.12}
        sizeAttenuation
        transparent
        opacity={0.95}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

