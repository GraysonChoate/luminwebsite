// SuiteHoverTracker — camera-independent suite hover detection.
//
// ROOT-CAUSE NOTE: suite hover previously used an invisible 3D hit-sphere,
// raycast from the camera. But hovering starts the camera drift, the drift
// moves the camera, the sphere's screen projection shifts under a stationary
// pointer, hover drops, the drift reverses, the projection shifts back,
// hover re-fires — a visible oscillation ("pulls me back out / glitching").
// Suite-level hover is now resolved in SCREEN SPACE from pointer position
// alone (left region = Lumin One, right = Lumin Pro, dead band at center),
// so camera motion can never feed back into it. Hubs keep their precise 3D
// raycast and always take priority: this tracker yields whenever a hub owns
// the hover.
import { useEffect } from "react";
import { useEcosystemState, suiteOf } from "../../hooks/useEcosystemState";
import { SUITES } from "../../data/lumin-ecosystem";
import { unfoldDone } from "./Entrance";

// Screen-space zones (fractions of viewport width/height).
const CENTER_DEAD_HALF = 0.075; // dead band around the nucleus axis
const EDGE_MARGIN_X = 0.02; // ignore extreme edges
const Y_MIN = 0.08; // ignore top chrome band
const Y_MAX = 0.94; // ignore bottom hint band

function suiteAtPointer(x: number, y: number): string | null {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const fx = x / w;
  const fy = y / h;
  if (fy < Y_MIN || fy > Y_MAX) return null;
  if (fx < EDGE_MARGIN_X || fx > 1 - EDGE_MARGIN_X) return null;
  if (Math.abs(fx - 0.5) < CENTER_DEAD_HALF) return null;
  return fx < 0.5 ? "suite-one" : "suite-pro";
}

export function SuiteHoverTracker() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      // Collapsed / unfolding: no suite hover — the only affordance is the
      // core itself (its own hit-target manages the cursor).
      if (!unfoldDone()) return;
      const { focusLevel, mode, hoveredId, setHovered } = useEcosystemState.getState();
      // Cursor contract: pointer ONLY over a real interactive hit-target —
      // a hub (any focus level, handled here for canvas-wide correctness) or
      // a suite zone (ecosystem level). Default everywhere else, including
      // the dead band between hemispheres and empty edges. Never override
      // the cursor while the pointer is over DOM UI (panels, breadcrumb).
      const overCanvas = e.target instanceof HTMLCanvasElement;
      const hubOwned = !!(hoveredId && suiteOf(hoveredId));

      if (focusLevel !== "ecosystem" || mode === "transitioning") {
        if (overCanvas) {
          document.body.style.cursor = hubOwned ? "pointer" : "auto";
        }
        return;
      }
      // Hubs own the hover — never fight a hub (their 3D raycast is precise
      // and their pointerOver/Out handlers manage their own lifecycle).
      if (hubOwned) {
        if (overCanvas) document.body.style.cursor = "pointer";
        return;
      }
      const target = overCanvas ? suiteAtPointer(e.clientX, e.clientY) : null;
      const current = hoveredId && SUITES.some((s) => s.id === hoveredId) ? hoveredId : null;
      if (target !== current) setHovered(target);
      if (overCanvas) {
        document.body.style.cursor = target ? "pointer" : "auto";
      }
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.body.style.cursor = "auto";
    };
  }, []);
  return null;
}

/** Click handling for suite zones, screen-space (paired with the tracker). */
export function useSuiteClickZone() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!unfoldDone()) return; // collapsed: only the core itself is clickable
      const { focusLevel, mode, hoveredId, focusSuite } = useEcosystemState.getState();
      if (focusLevel !== "ecosystem" || mode === "transitioning") return;
      // A hub under the pointer owns the click (its own handler fires).
      if (hoveredId && suiteOf(hoveredId)) return;
      // Only fire when the click landed on the canvas, not DOM UI.
      if (!(e.target instanceof HTMLCanvasElement)) return;
      const target = suiteAtPointer(e.clientX, e.clientY);
      if (target) focusSuite(target as "suite-one" | "suite-pro");
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);
}





