// HoverDrift — capped, camera-only hover preview. A gentle lean, not a zoom.
//
// ROOT-CAUSE NOTE (v1 bug): the previous version ADDED its offset to
// camera.position every frame while EcosystemCamera's own useFrame lerped
// position toward its target each frame. The two fought to an equilibrium
// where the applied offset amplified to ~20x the intended fraction — which
// read as the full suite-focus zoom. The fix is structural, not a tuning
// change: the drift is now a ZERO-FEEDBACK OVERLAY. A pre-rig pass
// (priority -1) subtracts exactly the offset applied last frame, the rig
// (priority 0) runs on the clean position it expects, and a post-rig pass
// (priority +1) adds the freshly eased offset back. The rig never sees the
// offset, so nothing can accumulate or compound.
//
// Contracts held:
//  - never calls focusSuite() / never touches focusLevel or mode
//  - does not reuse the click tween — it's a fraction applied to camera
//    position directly, computed independently each frame
//  - capped at DRIFT_FRACTION (12-15%) of idle→focus-target distance
//  - time-based easing, ~1.35s to settle in, same curve reversing out
//  - damps idle pointer-parallax while active so motions don't stack
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useEcosystemState, suiteOf } from "../../hooks/useEcosystemState";
import { SUITES, DEFAULT_SETTINGS } from "../../data/lumin-ecosystem";

const DRIFT_FRACTION = 0.13; // 12-15% per spec — barely perceptible lean
const TAU = 0.45; // exp smoothing time-constant (s) → ~95% settled in ~1.35s
const PARALLAX_DAMP = 0.45; // fraction of parallax kept while drift active

// Reference copy of the suite focus-camera POSITION target (read-only mirror
// of EcosystemCamera's math). Used only to derive the direction of the lean.
function suiteFocusPosition(suiteId: string, cameraZ: number) {
  const suite = SUITES.find((s) => s.id === suiteId);
  if (!suite) return null;
  return { x: suite.center[0] * 0.62, y: 0.1, z: cameraZ - 4.4 };
}

export function HoverDrift({ cameraZ = DEFAULT_SETTINGS.cameraZ }: { cameraZ?: number }) {
  // Offset currently applied to the camera (what we must subtract pre-rig).
  const applied = useRef({ x: 0, y: 0, z: 0 });
  // Eased drift value (springs toward the capped target).
  const drift = useRef({ x: 0, y: 0, z: 0 });

  // PRE-RIG (priority -1): remove last frame's overlay so EcosystemCamera
  // lerps from the clean position it owns. Zero feedback by construction.
  useFrame(({ camera }) => {
    camera.position.x -= applied.current.x;
    camera.position.y -= applied.current.y;
    camera.position.z -= applied.current.z;
    applied.current.x = 0;
    applied.current.y = 0;
    applied.current.z = 0;
  }, -1);

  // POST-RIG (priority +1): ease toward the capped offset and overlay it.
  useFrame(({ camera }, delta) => {
    const { hoveredId, focusLevel, mode } = useEcosystemState.getState();
    // Anchor the drift to a suite whenever the hover is inside one: either
    // the suite itself is hovered, or a hub belonging to it is. Previously
    // only an exact suite-id match counted, so sliding the pointer onto an
    // orb made suiteHovered null and the lean visibly cancelled mid-motion.
    const suiteHovered =
      focusLevel === "ecosystem" && mode === "hover" && hoveredId
        ? SUITES.some((s) => s.id === hoveredId)
          ? hoveredId
          : suiteOf(hoveredId)
        : null;

    // Target offset: DRIFT_FRACTION of the vector from the IDLE camera
    // position (0, 0, cameraZ) toward the suite's focus position. Computed
    // directly — the real GSAP focus tween is never touched or shortened.
    let tx = 0;
    let ty = 0;
    let tz = 0;
    if (suiteHovered) {
      const f = suiteFocusPosition(suiteHovered, cameraZ);
      if (f) {
        tx = f.x * DRIFT_FRACTION; // (f.x - 0) * fraction
        ty = f.y * DRIFT_FRACTION;
        tz = (f.z - cameraZ) * DRIFT_FRACTION;
      }
    }

    // Time-based exponential ease (~1.35s settle) — same curve both ways.
    const k = 1 - Math.exp(-delta / TAU);
    const d = drift.current;
    d.x += (tx - d.x) * k;
    d.y += (ty - d.y) * k;
    d.z += (tz - d.z) * k;

    // While drifting, damp the rig's pointer-parallax so motions don't stack.
    // At ecosystem level the rig's non-parallax baseline is x=0, y=0; its
    // parallax is the remaining deviation, which we scale down proportionally
    // to how engaged the drift is.
    const maxMag = Math.abs(tx) + Math.abs(ty) + Math.abs(tz);
    const engage =
      maxMag > 1e-4
        ? Math.min((Math.abs(d.x) + Math.abs(d.y) + Math.abs(d.z)) / maxMag, 1)
        : Math.min((Math.abs(d.x) + Math.abs(d.y) + Math.abs(d.z)) / 0.5, 1);
    if (focusLevel === "ecosystem" && mode !== "transitioning" && engage > 0.05) {
      const damp = 1 - (1 - PARALLAX_DAMP) * engage;
      camera.position.x *= damp;
      camera.position.y *= damp;
    }

    // Apply the overlay and remember it for the pre-rig subtraction.
    camera.position.x += d.x;
    camera.position.y += d.y;
    camera.position.z += d.z;
    applied.current.x = d.x;
    applied.current.y = d.y;
    applied.current.z = d.z;
  }, 1);

  return null;
}



