// UnfoldGroup — the collapsed-core → full-ecosystem transform.
//
// COLLAPSED POSE (owner spec, reference image): NOT a miniature of the full
// layout. The composition compresses along X only — the two hemispheres
// converge onto the center so the through-line family reads as a rosette of
// petal orbits crossing at the Lumin icon, wrapped by the (now overlapping)
// wireframe shells: one atomic energy-sphere. Y/Z stay near full size, so
// nothing reads "scaled down" — the rings are as large as ever, just drawn
// into the center. Hub orbs collapse to the center separately (Nodes.tsx)
// and hide behind the icon.
//
// While collapsed the whole structure oscillates slowly around the center.
// On unfold the axes release to (1,1,1) and the drift eases to zero — the
// final state is bit-identical to the expanded ecosystem.
import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { unfold01 } from "./Entrance";
import { ecoConfig } from "./EcosystemConfig";

const COLLAPSED_X = 0.3; // petals cross at the icon, spanning the orb interior
const COLLAPSED_Y = 0.8; // tall layered elliptical rings, atomic silhouette
const COLLAPSED_Z = 0.8;

/** Per-axis scale of the unfold group at expansion factor u (0..1). */
export function unfoldAxes(u: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(
    COLLAPSED_X + (1 - COLLAPSED_X) * u,
    COLLAPSED_Y + (1 - COLLAPSED_Y) * u,
    COLLAPSED_Z + (1 - COLLAPSED_Z) * u,
  );
}

export function UnfoldGroup({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    const u = unfold01();
    const cfg = ecoConfig;
    const collapsed = 1 - u; // config influence fades out with the unfold
    unfoldAxes(u, g.scale);
    // collapsed-sphere size dial (1 = shipped); no effect once expanded
    g.scale.multiplyScalar(1 + (cfg.sphereScale - 1) * collapsed);
    // collapsed-sphere position dial; expanded layout always lands at origin
    g.position.set(
      cfg.sphereOffset[0] * collapsed,
      cfg.sphereOffset[1] * collapsed,
      cfg.sphereOffset[2] * collapsed,
    );
    // slow orbital oscillation while compressed; fades out with the expansion
    // so the structure settles at exactly rotation 0. Baseline rotation +
    // drift amplitude/speed are config dials for reference-frame matching.
    const drift = collapsed * cfg.driftAmplitude;
    const ts = t * cfg.driftSpeed;
    g.rotation.y = cfg.sphereRotation[1] * collapsed + drift * Math.sin(ts * 0.13) * 0.22;
    g.rotation.x = cfg.sphereRotation[0] * collapsed + drift * Math.sin(ts * 0.1 + 1.7) * 0.09;
    g.rotation.z = cfg.sphereRotation[2] * collapsed + drift * Math.sin(ts * 0.08 + 0.6) * 0.06;
  });

  return <group ref={group}>{children}</group>;
}





