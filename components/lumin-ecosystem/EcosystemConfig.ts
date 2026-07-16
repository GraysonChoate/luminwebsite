// EcosystemConfig — single tuning surface for matching the live scene to an
// external reference (e.g. the last frame of a pre-rendered transition video).
//
// Every field is a plain number/tuple read PER FRAME by the scene components,
// so values can be changed at runtime (before or after mount) and the scene
// responds on the next frame — no remount, no rebuild.
//
// Usage (module):
//   import { configureEcosystem } from ".../EcosystemConfig";
//   configureEcosystem({ cameraFov: 42, sphereScale: 1.08 });
//
// Usage (browser console, for live matching against a video frame):
//   window.luminEcosystem.configure({ bloomIntensity: 1.1 });
//   window.luminEcosystem.get();   // current values
//
// All defaults reproduce the shipped look exactly — an empty config is a no-op.

export interface EcosystemConfig {
  /** Uniform multiplier on the COLLAPSED sphere's size (1 = shipped pose).
   *  Only affects the collapsed/opening pose; at full unfold it has no effect. */
  sphereScale: number;
  /** World-space offset of the collapsed sphere [x, y, z]. Fades out during
   *  the unfold so the expanded layout always lands at the origin. */
  sphereOffset: [number, number, number];
  /** Static baseline rotation of the collapsed sphere [x, y, z] radians.
   *  Fades out during the unfold (expanded state is always rotation 0). */
  sphereRotation: [number, number, number];
  /** Multiplier on the collapsed idle drift (oscillation) amplitude. 0 = still. */
  driftAmplitude: number;
  /** Multiplier on the collapsed idle drift speed. */
  driftSpeed: number;

  /** Scale of the central Lumin mark (dark disc + logo + halo). */
  logoScale: number;
  /** Scale of the three containment rings around the nucleus. */
  ringScale: number;
  /** Multiplier on the collapsed wireframe shell radius (the outer sphere).
   *  1 = shipped (0.86 tighten). Only affects the collapsed pose. */
  shellScale: number;

  /** Camera distance (z). Matches the debug panel's cameraZ. */
  cameraZ: number;
  /** Camera vertical field of view in degrees. */
  cameraFov: number;
  /** Camera x/y offset (frames the sphere off-center if needed). */
  cameraOffset: [number, number];

  /** CSS opacity of the whole canvas container (0..1). Use for crossfading
   *  against the video's final frame. */
  containerOpacity: number;

  /** Bloom pass intensity. Shipped effective value: 0.9 * 1.25 = 1.125. */
  bloomIntensity: number;
  /** Bloom luminance threshold. Shipped: 0.45. Lower = more elements bloom.
   *  NOTE: sub-threshold authoring is the scene's ONLY bloom-separation
   *  mechanism — dropping this below ~0.4 will start blooming the logo. */
  bloomThreshold: number;
  /** Bloom luminance smoothing. Shipped: 0.65. */
  bloomSmoothing: number;
}

export const ECO_DEFAULTS: EcosystemConfig = {
  sphereScale: 1,
  sphereOffset: [0, 0, 0],
  sphereRotation: [0, 0, 0],
  driftAmplitude: 1,
  driftSpeed: 1,
  logoScale: 1,
  ringScale: 1,
  shellScale: 1,
  cameraZ: 14.5,
  cameraFov: 38,
  cameraOffset: [0, 0],
  containerOpacity: 1,
  bloomIntensity: 1.125,
  bloomThreshold: 0.45,
  bloomSmoothing: 0.65,
};

// Live config object — components read fields per frame.
export const ecoConfig: EcosystemConfig = { ...ECO_DEFAULTS };

let version = 0;
const listeners = new Set<() => void>();

/** Merge partial values into the live config. Safe at any time (before mount,
 *  after mount, mid-animation). React-bound fields (bloom, container opacity)
 *  re-render via the subscription; frame-bound fields apply next frame. */
export function configureEcosystem(partial: Partial<EcosystemConfig>): void {
  Object.assign(ecoConfig, partial);
  version++;
  listeners.forEach((l) => l());
}

/** Reset every field to the shipped defaults. */
export function resetEcosystemConfig(): void {
  configureEcosystem({ ...ECO_DEFAULTS });
}

/** Subscribe to config changes (for React useSyncExternalStore). */
export function subscribeEcoConfig(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function ecoConfigVersion(): number {
  return version;
}

// Console access for live tuning against a reference frame.
declare global {
  interface Window {
    luminEcosystem?: {
      configure: typeof configureEcosystem;
      reset: typeof resetEcosystemConfig;
      get: () => EcosystemConfig;
    };
  }
}
if (typeof window !== "undefined") {
  window.luminEcosystem = {
    configure: configureEcosystem,
    reset: resetEcosystemConfig,
    get: () => ({ ...ecoConfig }),
  };
}

