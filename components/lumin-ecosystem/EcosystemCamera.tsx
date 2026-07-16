// Camera rig: pointer parallax + GSAP cinematic moves between
// ecosystem → suite → product focus levels. Structure never re-lays-out;
// only the camera travels.
import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { useEcosystemState } from "../../hooks/useEcosystemState";
import { HUBS, SUITES } from "../../data/lumin-ecosystem";
import { ecoConfig } from "./EcosystemConfig";

const MAX_YAW = THREE.MathUtils.degToRad(2.2);
const MAX_PITCH = THREE.MathUtils.degToRad(1.3);

export function EcosystemCamera({ cameraZ = 14.5 }: { cameraZ?: number }) {
  const { camera } = useThree();
  const pointer = useRef({ x: 0, y: 0 });
  const focus = useRef({ x: 0, y: 0, z: cameraZ, lx: 0, ly: 0 });
  const focusedSuite = useEcosystemState((s) => s.focusedSuite);
  const focusedHub = useEcosystemState((s) => s.focusedHub);
  const beginTransition = useEcosystemState((s) => s.beginTransition);
  const endTransition = useEcosystemState((s) => s.endTransition);
  // Explicit depth tracking so the tween KNOWS its direction (deeper vs.
  // backing out) rather than inferring it from distances.
  const prevDepth = useRef(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  // GSAP focus move on select/deselect.
  // ZOOM MODEL (owner spec): only TWO zoom states — main ecosystem view and
  // ONE focused view. Suite click and product click land at the SAME depth
  // (FOCUS_DZ); a product click merely biases the framing toward that product
  // (its panel opens immediately via FocusPanel). Focused view is deliberately
  // less zoomed-in than earlier builds so the rest of the suite stays visible.
  useEffect(() => {
    const FOCUS_DZ = 3.4; // shared focused-view depth (was 4.4 suite / 6.4 product)
    let target = { x: 0, y: 0, z: cameraZ, lx: 0, ly: 0 };
    if (focusedHub) {
      const hub = HUBS.find((h) => h.id === focusedHub);
      const suite = SUITES.find((s) => s.id === hub?.suite);
      if (hub && suite) {
        // same zoom state as suite focus, gently biased toward the product
        const bx = suite.center[0] * 0.62 + (hub.position[0] - suite.center[0]) * 0.3;
        target = {
          x: bx,
          y: hub.position[1] * 0.3,
          z: cameraZ - FOCUS_DZ,
          lx: suite.center[0] * 0.78 + (hub.position[0] - suite.center[0]) * 0.35,
          ly: hub.position[1] * 0.35,
        };
      }
    } else if (focusedSuite) {
      const suite = SUITES.find((s) => s.id === focusedSuite);
      if (suite) {
        // suite focus: enter the hemisphere, keep nucleus at frame edge
        target = {
          x: suite.center[0] * 0.62,
          y: 0.1,
          z: cameraZ - FOCUS_DZ,
          lx: suite.center[0] * 0.78,
          ly: 0,
        };
      }
    }
    // Skip the tween (and the transition lock) when the computed target is
    // already where the focus rig sits — e.g. the unconditional mount run
    // with focusedSuite/focusedHub both null. Without this, a no-op 1.6s GSAP
    // tween holds mode === "transitioning" and silently swallows every hover
    // for the first ~1.6s after load.
    const f = focus.current;
    const same =
      Math.abs(f.x - target.x) < 1e-4 &&
      Math.abs(f.y - target.y) < 1e-4 &&
      Math.abs(f.z - target.z) < 1e-4 &&
      Math.abs(f.lx - target.lx) < 1e-4 &&
      Math.abs(f.ly - target.ly) < 1e-4;
    // Explicit transition direction from focus depth (0 = ecosystem,
    // 1 = suite, 2 = product). ONLY depth reduction (backing out) gets the
    // shorter duration; going deeper or lateral (hub → hub) keeps the
    // deliberate 1.6s. Same ease both ways.
    const depth = focusedHub ? 2 : focusedSuite ? 1 : 0;
    const backingOut = depth < prevDepth.current;
    prevDepth.current = depth;
    if (same) return;
    beginTransition();
    const tw = gsap.to(focus.current, {
      x: target.x,
      y: target.y,
      z: target.z,
      lx: target.lx,
      ly: target.ly,
      duration: backingOut ? 0.9 : 1.6,
      ease: "power3.inOut",
      onComplete: endTransition,
    });
    return () => {
      tw.kill();
    };
  }, [focusedSuite, focusedHub, cameraZ, beginTransition, endTransition]);

  useFrame(() => {
    const f = focus.current;
    const cfg = ecoConfig;
    // config dials: FOV + framing offset (applied on top of the focus rig)
    const persp = camera as THREE.PerspectiveCamera;
    if (persp.isPerspectiveCamera && persp.fov !== cfg.cameraFov) {
      persp.fov = cfg.cameraFov;
      persp.updateProjectionMatrix();
    }
    const px = pointer.current.x * MAX_YAW;
    const py = pointer.current.y * MAX_PITCH;
    const targetX = f.x + cfg.cameraOffset[0] + Math.sin(px) * f.z;
    const targetY = f.y + cfg.cameraOffset[1] - Math.sin(py) * f.z * 0.6;
    camera.position.x += (targetX - camera.position.x) * 0.045;
    camera.position.y += (targetY - camera.position.y) * 0.045;
    camera.position.z += (f.z - camera.position.z) * 0.05;
    camera.lookAt(f.lx + cfg.cameraOffset[0], f.ly + cfg.cameraOffset[1], 0);
  });

  return null;
}








