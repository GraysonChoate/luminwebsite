// Entrance choreography: a single global timeline that every layer samples.
//
// Design: module-level start timestamp + pure phase() sampler. No store, no
// GSAP — components already run per-frame lerps, so they just MULTIPLY their
// existing opacity/scale targets by an entrance factor. Before the timeline
// starts everything sits at 0 (dark stage); after ENTRANCE_TOTAL every factor
// is exactly 1 and the math is a no-op forever.
//
// Sequence (ms):
//   0    –  900   nucleus ignition (halo, logo, dark disc)
//   250  – 1200   containment rings expand into place
//   300  – 2000   atmosphere particles breathe in
//   600  – ~1600  spokes DRAW outward from the nucleus (dash-clip, staggered)
//   1000 – ~2100  hubs materialize, staggered by distance from the nucleus
//   1500 – 2300   intra-suite routes fade up
//   1600 – 2700   hemisphere contours fade up
//   1800 – 2600   suite membranes fade up
//   2300 – 3200   loop circuit ignites + pulses start traveling
export const ENTRANCE_TOTAL = 3300;

// ---- UNFOLD: collapsed energy-core → full ecosystem -------------------------
// Default state: the ENTIRE ecosystem sits compressed around the nucleus as
// one living core (a global radial transform — same objects, same materials,
// compact pose). Clicking the Lumin core releases the compression: geometry
// expands outward from the center into the exact current layout. Labels and
// titles arrive last; interactivity unlocks when the unfold completes.
//
// Timeline (ms from click):
//   0    –  520   icon pulse + energy build (geometry holds)
//   400  – 2600   geometry expansion (fast release, long settle)
//   2600 – 3400   suite titles + hub labels fade in
//   3400+         fully interactive
export const UNFOLD_TOTAL = 3400;
export const COLLAPSED_SCALE = 0.24;
const UNFOLD_GEO_FROM = 400;
const UNFOLD_GEO_TO = 2600;

let unfoldAt: number | null = null;
// External driver mode: when non-null, this 0..1 value IS the unfold master
// progress (e.g. a GSAP ScrollTrigger progress). Overrides the internal
// click-started clock entirely. See setUnfoldProgress().
let externalProgress: number | null = null;
let lastNotifiedStage: 0 | 1 | 2 = 0;
const unfoldListeners = new Set<() => void>();

function notifyUnfold() {
  unfoldListeners.forEach((l) => l());
  notifyPhase();
}

/** Subscribe to unfold stage changes (for React useSyncExternalStore). */
export function subscribeUnfold(cb: () => void): () => void {
  unfoldListeners.add(cb);
  return () => {
    unfoldListeners.delete(cb);
  };
}

/** Release the compression (idempotent). Fired by clicking the Lumin core.
 *  No-op while an external driver owns the progress (setUnfoldProgress). */
export function startUnfold() {
  if (externalProgress !== null) return;
  if (unfoldAt !== null) return;
  unfoldAt = performance.now();
  notifyUnfold();
  // one more notification when the unfold completes (unlocks UI copy etc.)
  setTimeout(notifyUnfold, UNFOLD_TOTAL + 60);
}

/**
 * EXTERNAL DRIVER (scroll-driven unfold): hand the master progress to an
 * outside animation system. p is clamped to [0,1] and maps linearly onto the
 * full unfold timeline (p=1 ⇒ t=UNFOLD_TOTAL, so geometry, labels and
 * interactivity all resolve exactly as in the click flow). Call this from a
 * GSAP ScrollTrigger onUpdate (self.progress), a Lenis scroll handler, etc.
 * First call switches the scene to external mode and disables the core's
 * click trigger. Fully scrub-safe: progress may move backward.
 */
export function setUnfoldProgress(p: number) {
  externalProgress = Math.min(1, Math.max(0, p));
  const s = unfoldStage();
  if (s !== lastNotifiedStage) {
    lastNotifiedStage = s;
    notifyUnfold();
  }
}

/** Skip the collapsed intro entirely: mount already expanded + interactive. */
export function startExpanded() {
  setUnfoldProgress(1);
}

// ---- PUBLIC STATE CALLBACK ("collapsed" | "opening" | "open") --------------
export type EcosystemPhaseName = "collapsed" | "opening" | "open";

/** Current high-level state of the ecosystem. */
export function ecosystemPhase(): EcosystemPhaseName {
  const s = unfoldStage();
  return s === 0 ? "collapsed" : s === 1 ? "opening" : "open";
}

const phaseListeners = new Set<(p: EcosystemPhaseName) => void>();
let lastPhase: EcosystemPhaseName = "collapsed";

/**
 * Notify the host page whenever the ecosystem transitions between
 * collapsed → opening → open (works for click-driven, external scroll-driven,
 * and startExpanded flows; scrub-safe — fires again if progress reverses).
 * Returns an unsubscribe function. The callback is invoked immediately with
 * the current phase on subscribe.
 */
export function onEcosystemStateChange(
  cb: (phase: EcosystemPhaseName) => void,
): () => void {
  phaseListeners.add(cb);
  cb(ecosystemPhase());
  return () => {
    phaseListeners.delete(cb);
  };
}

function notifyPhase() {
  const p = ecosystemPhase();
  if (p === lastPhase) return;
  lastPhase = p;
  phaseListeners.forEach((l) => l(p));
}

export function unfoldStarted(): boolean {
  if (externalProgress !== null) return externalProgress > 0;
  return unfoldAt !== null;
}

export function unfoldDone(): boolean {
  if (reduced && startAt !== null) return true;
  if (externalProgress !== null) return externalProgress >= 1;
  return unfoldAt !== null && performance.now() - unfoldAt >= UNFOLD_TOTAL;
}

/** 0 = collapsed idle, 1 = unfolding, 2 = expanded + interactive. */
export function unfoldStage(): 0 | 1 | 2 {
  if (unfoldDone()) return 2;
  if (externalProgress !== null) return externalProgress > 0 ? 1 : 0;
  if (unfoldAt !== null) return 1;
  return 0;
}

/** Sample the unfold timeline: 0 before `from`, eased across [from,to], 1 after. */
export function unfoldPhase(
  from: number,
  to: number,
  ease: (u: number) => number = easeOutCubic,
): number {
  if (reduced && startAt !== null) return 1;
  let t: number;
  if (externalProgress !== null) {
    t = externalProgress * UNFOLD_TOTAL;
  } else {
    if (unfoldAt === null) return 0;
    t = performance.now() - unfoldAt;
  }
  if (t <= from) return 0;
  if (t >= to) return 1;
  return ease((t - from) / (to - from));
}

/** Fast release, long settle — the "compression releasing" curve. */
export function easeOutQuart(u: number): number {
  return 1 - Math.pow(1 - u, 4);
}

/** Global geometry expansion factor: 0 collapsed → 1 expanded. */
export function unfold01(): number {
  return unfoldPhase(UNFOLD_GEO_FROM, UNFOLD_GEO_TO, easeOutQuart);
}

/** Current uniform scale of the structural group. */
export function unfoldScale(): number {
  return COLLAPSED_SCALE + (1 - COLLAPSED_SCALE) * unfold01();
}

// Shared frame-state bus: how strongly a highway pulse is currently passing
// through the nucleus (0..1). Written by InfinityFlow, read by LuminNucleus
// (kept here — a leaf module — to avoid a circular import between them).
// `click` is the unfold release pulse: set to 1 when the core is clicked,
// decayed per-frame by LuminNucleus for one strong ignition flash.
export const pulseBus = { boost: 0, click: 0 };

let startAt: number | null = null;
let reduced = false;

/** Kick the timeline (idempotent). Call from the client only. */
export function startEntrance() {
  if (startAt !== null) return;
  reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  startAt = performance.now();
}

// ---- INSTANT FORMED START (video-handoff mode) ------------------------------
// When the scene takes over from a pre-rendered transition video, the first
// WebGL frame must ALREADY show the fully formed collapsed sphere — no
// ignition sequence, no fade-in, no scale settling. startFormed() backdates
// the entrance clock past ENTRANCE_TOTAL (every entrance factor samples as
// exactly 1) and opens a short "snap window" during which all smoothed
// opacity lerps write their target directly instead of easing toward it.
let formedSnapUntil = 0;

/**
 * Mount fully formed: skips the 3.3s entrance choreography entirely.
 * The scene renders the finished COLLAPSED sphere from its very first frame
 * (combine with startExpanded() to mount fully open instead). Call BEFORE
 * the canvas mounts — e.g. in the same effect that mounts the scene when a
 * transition video ends. Idempotent.
 */
export function startFormed() {
  reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (startAt === null || performance.now() - startAt < ENTRANCE_TOTAL) {
    startAt = performance.now() - ENTRANCE_TOTAL - 1;
  }
  formedSnapUntil = performance.now() + 600;
}

/** True during the brief post-startFormed window: smoothed visual properties
 *  should SNAP to their target instead of easing (kills first-paint fade). */
export function snapAlpha(): boolean {
  return formedSnapUntil > 0 && performance.now() < formedSnapUntil;
}

/** Smoothed-approach helper honouring the snap window. */
export function approach(current: number, target: number, k: number): number {
  if (snapAlpha()) return target;
  return current + (target - current) * k;
}

export function entranceStarted(): boolean {
  return startAt !== null;
}

export function entranceDone(): boolean {
  if (reduced && startAt !== null) return true;
  return startAt !== null && performance.now() - startAt >= ENTRANCE_TOTAL;
}

// --- easings ---
export function easeOutCubic(u: number): number {
  return 1 - Math.pow(1 - u, 3);
}
/** Gentle overshoot for scale pops (settles ~4.5% past 1 then back). */
export function easeOutBack(u: number): number {
  const c1 = 1.20158; // softer than the CSS default 1.70158 — premium, not cartoonish
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
}

/**
 * Sample the timeline: 0 before `from`, eased 0→1 across [from, to], 1 after.
 * Returns 1 immediately under prefers-reduced-motion (scene appears formed).
 * Returns 0 if the timeline has not started yet.
 */
export function entrancePhase(
  from: number,
  to: number,
  ease: (u: number) => number = easeOutCubic,
): number {
  if (startAt === null) return 0;
  if (reduced) return 1;
  const t = performance.now() - startAt;
  if (t <= from) return 0;
  if (t >= to) return 1;
  return ease((t - from) / (to - from));
}

/** Hub materialization delay: nearer hubs first, staggered by radial distance. */
export function hubEntranceWindow(position: readonly [number, number, number]): [number, number] {
  const dist = Math.hypot(position[0], position[1], position[2]);
  const from = 1000 + dist * 165; // dist ~2.2–5.5 → 1360–1910ms
  return [from, from + 680];
}










