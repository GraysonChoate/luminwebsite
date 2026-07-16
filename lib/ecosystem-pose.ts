import type { EcosystemConfig } from "@/components/lumin-ecosystem/EcosystemConfig";

/**
 * Collapsed-pose override that sizes the live ecosystem to ~match the hero
 * transition video's final sphere (which fills ~50% of frame width). cameraZ
 * is the single uniform lever — pulling the camera in enlarges the whole
 * composition (sphere + rings + core) together, preserving proportions.
 *
 * This is the composition match. Refine the number against the video frame in
 * /eco-test (the f_599 overlay shows the fit); the exact value can be dialed
 * once verified on a real GPU. Default cameraZ is 14.5.
 */
export const MATCH_POSE: Partial<EcosystemConfig> = {
  // 8.0 sizes the live collapsed sphere to ~982px wide at 1920×1080 — matching
  // the transition video's final sphere (measured 982×974, dead-center), so the
  // video→live dissolve needs no scaling. Derived: 11.5 × 684/982 (screen size
  // ∝ 1/cameraZ), verified by capture.
  cameraZ: 8.0,
};
