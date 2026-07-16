// Per-product motion profiles — each hub idles with its own personality
// instead of uniform pulsing ("organic variation" from the original vision).
// All values are multipliers over the shared base motion so global tuning
// still works. Deterministic, no randomness at runtime.
//
// The vocabulary (all subtle — personalities, not animations):
//   breatheSpeed  — how fast the core breathes (1 = base 0.8 rad/s)
//   breatheAmp    — breath depth (1 = base ±5%)
//   breatheShape  — waveform character: 0 = pure sine, 1 = sharper
//                   inhale/exhale (athletic), -1 = long flat rest (calm)
//   ringSpeed     — containment ring rotation speed multiplier (sign = dir)
//   satSpeed      — satellite orbit speed multiplier
//   flicker       — tiny high-frequency glow shimmer amount (0 = none)
//   sway          — slow secondary wobble layered on the breath (0 = none)

export interface MotionProfile {
  breatheSpeed: number;
  breatheAmp: number;
  breatheShape: number;
  ringSpeed: number;
  satSpeed: number;
  flicker: number;
  sway: number;
}

const DEFAULT_PROFILE: MotionProfile = {
  breatheSpeed: 1,
  breatheAmp: 1,
  breatheShape: 0,
  ringSpeed: 1,
  satSpeed: 1,
  flicker: 0,
  sway: 0,
};

export const MOTION_PROFILES: Record<string, MotionProfile> = {
  // ---- Lumin One (organic, alive) ----
  // Move: athletic cadence — quicker, deeper breath with a sharp inhale.
  "hub-move": {
    breatheSpeed: 1.5,
    breatheAmp: 1.35,
    breatheShape: 0.7,
    ringSpeed: 1.3,
    satSpeed: 1.25,
    flicker: 0.15,
    sway: 0,
  },
  // Fuel: slow metabolism — long, deep, restful breath.
  "hub-fuel": {
    breatheSpeed: 0.55,
    breatheAmp: 1.5,
    breatheShape: -0.6,
    ringSpeed: 0.6,
    satSpeed: 0.7,
    flicker: 0,
    sway: 0.35,
  },
  // Market: lively marketplace energy — light, quick, a touch of shimmer.
  "hub-market": {
    breatheSpeed: 1.25,
    breatheAmp: 0.85,
    breatheShape: 0.3,
    ringSpeed: 1.15,
    satSpeed: 1.4,
    flicker: 0.35,
    sway: 0.2,
  },
  // Station: steady hardware hum — shallow, regular, dependable.
  "hub-station": {
    breatheSpeed: 0.9,
    breatheAmp: 0.6,
    breatheShape: 0,
    ringSpeed: 0.85,
    satSpeed: 0.9,
    flicker: 0.08,
    sway: 0,
  },
  // ---- Lumin Pro (architectural, operational) ----
  // Core: the metronome — precise, even, unhurried. The system of record.
  "hub-core": {
    breatheSpeed: 0.75,
    breatheAmp: 0.7,
    breatheShape: 0,
    ringSpeed: 0.7,
    satSpeed: 0.75,
    flicker: 0,
    sway: 0,
  },
  // Member App: quick and light — notification energy, small and bright.
  "hub-memberapp": {
    breatheSpeed: 1.4,
    breatheAmp: 0.75,
    breatheShape: 0.4,
    ringSpeed: 1.25,
    satSpeed: 1.35,
    flicker: 0.3,
    sway: 0,
  },
  // Connect: conversational — breath comes in gentle paired beats.
  "hub-connect": {
    breatheSpeed: 1.1,
    breatheAmp: 1.0,
    breatheShape: 0.5,
    ringSpeed: 1.0,
    satSpeed: 1.1,
    flicker: 0.2,
    sway: 0.3,
  },
  // Loops: cyclical — pronounced swing, the breath itself loops.
  "hub-loops": {
    breatheSpeed: 1.0,
    breatheAmp: 1.2,
    breatheShape: 0,
    ringSpeed: 1.6,
    satSpeed: 1.5,
    flicker: 0.1,
    sway: 0.6,
  },
  // Academy: calm teacher — slow, patient, minimal motion.
  "hub-academy": {
    breatheSpeed: 0.65,
    breatheAmp: 0.8,
    breatheShape: -0.4,
    ringSpeed: 0.6,
    satSpeed: 0.65,
    flicker: 0,
    sway: 0.15,
  },
  // Command: the radar — steady breath but a distinct scanning ring sweep.
  "hub-command": {
    breatheSpeed: 0.85,
    breatheAmp: 0.7,
    breatheShape: 0,
    ringSpeed: 2.1,
    satSpeed: 0.8,
    flicker: 0.12,
    sway: 0,
  },
};

export function motionProfile(hubId: string): MotionProfile {
  return MOTION_PROFILES[hubId] ?? DEFAULT_PROFILE;
}

/** Shaped breathing waveform.
 *  shape > 0 sharpens peaks (athletic inhale), shape < 0 flattens rests
 *  (long calm exhale). shape = 0 is a pure sine. Output in [-1, 1]. */
export function shapedBreath(t: number, shape: number): number {
  const s = Math.sin(t);
  if (shape === 0) return s;
  if (shape > 0) {
    // sharpen: bias toward the peak using signed power
    const k = 1 - shape * 0.55;
    return Math.sign(s) * Math.pow(Math.abs(s), k);
  }
  // flatten: spend longer near rest using inverse bias
  const k = 1 + -shape * 1.4;
  return Math.sign(s) * Math.pow(Math.abs(s), k);
}

