import MANIFEST from "@/lib/sequence-manifest.json";

/**
 * THE APPROVED HERO FILM — sequence data.
 *
 * ── PLAY ORDER COMES FROM THE MANIFEST, NEVER FROM THE FOLDER ────────────
 * The `sequence` array in `sequence-manifest.json` is a verbatim copy of
 * `APPROVED_SCENE_ANIMATIONS/SEQUENCE_MANIFEST.json`. A site-only
 * `openingComposite` record prepends the separately approved orb bridge to the
 * canonical order-0 transition without altering either approved source. It is
 * the ONLY declared extension to play order. Nothing here sorts a directory
 * listing, pattern matches a filename, or infers "the next clip" from a number
 * in a string — every one of those is how a retired or rejected generation
 * gets on screen. The 22 canonical entries remain in their declared order.
 *
 * ── WHAT THE ARCHIVE HOLDS THAT WE MUST NOT TOUCH ────────────────────────
 * `APPROVED_SCENE_ANIMATIONS/4K` is the immutable archival master: 3840x2160,
 * 24fps, verified against `SHA256SUMS.txt`. This app never reads it. It reads
 * the web derivatives under `/media/hero-film/`, which were produced by a pure
 * downscale (lanczos) with no trim, no retime, no colour transform and no
 * frame-rate change — frame counts are identical to the masters, which is
 * verified as part of the encode.
 *
 * ── ONE THING THE CONTAINER DURATIONS LIE ABOUT ──────────────────────────
 * Four masters state a duration 15-20ms LONGER than their own frame count
 * implies (e.g. `10-one-mrkt-idle` claims 8.057s for 193 frames, which is
 * 8.0417s at 24fps) — a stretched final-frame presentation time in the master's
 * container. The derivatives normalise it. So nothing in the engine may key off
 * `video.duration`: travel timing comes from `frames / 24` below, and the
 * transition-to-idle handoff comes from the element's own `ended` event.
 */

type ManifestEntry = {
  order: number;
  type: "transition" | "idle";
  file: string;
  duration: number;
  from?: string;
  to?: string;
  stop?: string;
  suite?: "pro" | "one";
  products?: string[];
};

type OpeningComposite = {
  file: string;
  sourceTransition: string;
  duration: number;
  frames: number;
  bridgeFrames: number;
  deduplicatedSourceFrames: number;
  handoffFrame: number;
  bridgeSha256: string;
};

type HeroManifest = {
  sequence: ManifestEntry[];
  retired?: string[];
  openingComposite: OpeningComposite;
};

const MANIFEST_DATA = MANIFEST as HeroManifest;
const SEQ = MANIFEST_DATA.sequence;
const RETIRED = MANIFEST_DATA.retired ?? [];
const OPENING_COMPOSITE = MANIFEST_DATA.openingComposite;

/** 24fps, every clip, verified by ffprobe across the whole film package. */
export const FPS = 24;

/**
 * The manifest ships its own exclusion list, so use it as a real guard rather
 * than as documentation. If a retired inbound, a `*-backup`, or one of the
 * named rejected generations ever finds its way into the play order, this
 * throws at import time instead of quietly putting it on screen.
 */
(() => {
  const patterns = RETIRED.map((r) =>
    new RegExp("^" + r.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"),
  );
  const offenders = SEQ.filter((e) => patterns.some((p) => p.test(e.file)) || /backup/i.test(e.file));
  if (offenders.length) {
    throw new Error(`heroFilm: retired media in the play order: ${offenders.map((o) => o.file).join(", ")}`);
  }
  const seen = new Set(SEQ.map((e) => e.file));
  if (seen.size !== SEQ.length) throw new Error("heroFilm: a clip appears twice in the play order");

  const canonicalOpening = SEQ.find((e) => e.order === 0 && e.type === "transition");
  if (!canonicalOpening || OPENING_COMPOSITE.sourceTransition !== canonicalOpening.file) {
    throw new Error("heroFilm: opening composite is not anchored to canonical transition order 0");
  }
  if (OPENING_COMPOSITE.file === canonicalOpening.file) {
    throw new Error("heroFilm: opening composite must not overwrite the canonical transition");
  }
  if (patterns.some((p) => p.test(OPENING_COMPOSITE.file)) || /backup/i.test(OPENING_COMPOSITE.file)) {
    throw new Error("heroFilm: retired or backup media declared as the opening composite");
  }
  if (OPENING_COMPOSITE.frames !== Math.round(OPENING_COMPOSITE.duration * FPS)) {
    throw new Error("heroFilm: opening composite duration and frame count disagree");
  }
  if (
    OPENING_COMPOSITE.bridgeFrames !== 96 ||
    OPENING_COMPOSITE.deduplicatedSourceFrames !== 144 ||
    OPENING_COMPOSITE.bridgeFrames + OPENING_COMPOSITE.deduplicatedSourceFrames !== OPENING_COMPOSITE.frames
  ) {
    throw new Error("heroFilm: opening composite frame topology is invalid");
  }
  if (OPENING_COMPOSITE.handoffFrame !== 181) {
    throw new Error("heroFilm: opening composite handoff must remain on verified frame 181");
  }
  if (OPENING_COMPOSITE.bridgeSha256 !== "5abe371dab1ed01d2a8f5b48024634184a37f2a68f9ae209ce33773a80e2a1f4") {
    throw new Error("heroFilm: opening bridge approval hash changed");
  }
})();

/**
 * THE HERO ENDS ON THE MRKT -> ORB-DESCEND CLIP.
 *
 * Manifest entry 21 (`11-orb-descend-to-ecosystem.mp4`) is the canonical
 * archival copy of the descent that `EcosystemSequence` already owns and plays,
 * so it is deliberately NOT played here — it would run the descent twice.
 *
 * Measured, because "same footage" was not safe to assume: strip frames
 * f_085..f_139 of the old `/frames/descent/` map linearly onto clip-11 frames
 * 7..133 at a mean-abs-diff of 0.5-1.0, where same-footage frames score under
 * 2.75 and unrelated frames score 6.6. But strip f_001..f_082 appear NOWHERE in
 * clip 11: the clip is the final third of that descent, retimed 2.33x slower to
 * fill the same 6.0417s slot. Clip 20's last frame lands on strip f_083 — which
 * is exactly where clip 11 starts. So the approved film moved the descent's
 * approach phase OUT of the ecosystem section and INTO clip 20, and
 * `/frames/descent/` is re-sliced from clip 11 so the handoff is continuous.
 */
const HERO_LAST_ORDER = 20;

/**
 * ══ SEAM LEDGER ══════════════════════════════════════════════════════════
 *
 * The player swaps atomically: never a black frame, a poster, a still bridge,
 * or two scenes on screen at once, and the crop and scale are identical on both
 * sides of every handoff.
 *
 * The approved clips link up well. Reviewed on real footage and confirmed —
 * Connect -> Command/Asset idle -> Academy plays as one continuous move.
 *
 *   stop            step   as % of full scale
 *   ────────────────────────────────────────────────────────────────────────
 *   station         1.93   0.8%
 *   studio          3.63   1.4%
 *   connect         3.94   1.5%
 *   fuel            4.35   1.7%
 *   mrkt            4.62   1.8%
 *   academy         4.63   1.8%
 *   trainer         5.43   2.1%
 *   check-in        6.44   2.5%
 *   companion       6.44   2.5%
 *   command-asset   7.70   3.0%
 *
 * Every handoff is inside 3% average pixel difference — light lines redrawing
 * and small pose shifts, not scene changes. Idle loop closures are separate and
 * all ten are clean (0.75-1.79). NO FOOTAGE CORRECTION IS REQUIRED.
 *
 * These figures are a RELATIVE RANKING ONLY. No perceptual verdict attaches to
 * them: there is no validated perceptual scale for this content, so they cannot
 * tell you whether something is visible. The footage was reviewed directly and
 * the seams read as seamless — including the 7.70 at command-asset, which is
 * the largest step in the package. If the largest is invisible, so is the rest.
 *
 * ── A MEASUREMENT MISTAKE WORTH NOT REPEATING ────────────────────────────
 * An earlier pass called four of these "visible cuts needing regeneration".
 * That was wrong, and the way it went wrong is the useful part.
 *
 * The magnitudes above were correct and reproduced by two independent methods.
 * The SEVERITY SCALE was junk: the "unrelated picture" threshold (~6.6) had been
 * measured on the ORB DESCENT — near-black frames, where mean-abs-diff is
 * compressed into a tiny range — and was then applied to brightly lit gym
 * interiors, where two genuinely unrelated frames score in the tens. So a 2.5%
 * difference got read as "as different as two unrelated frames".
 *
 * Calibrating the metric is not enough. The REFERENCE it is judged against has
 * to come from the same kind of content. And convert to a percentage before
 * assigning severity — "6.44" sounds alarming, "2.5%" does not, and the
 * percentage is the one that tracks what an eye actually sees.
 */
export type FilmStop = {
  /** stable id, used for deep links (#product-<id>) and for the manifest join */
  id: string;
  suite: "pro" | "one";
  /** the idle clip that loops while parked here */
  idle: string;
  /** the transition clip that ARRIVES here (played forward) */
  inbound: string;
  /** frames in the inbound clip — travel is timed off this, never off duration */
  inboundFrames: number;
  /**
   * Horizontal focal point, as a percentage, for `object-position`.
   *
   * ── WHY THIS EXISTS ──────────────────────────────────────────────────
   * Every approved master is 16:9 and there are no portrait masters. At a
   * phone's 9:16 the cover crop keeps only ~32% of the frame width, so the
   * default `50%` is a genuinely destructive centre crop: it lands Command
   * Center on an empty desk (the manager stands at ~22%) and Companion on
   * empty hardware (the nearest training member sits at ~66%).
   *
   * Each value was chosen by rendering the actual 9:16 crop and looking at it,
   * not by guessing a number. On wide viewports the frame is not cropped
   * horizontally at all and these have no effect whatsoever.
   */
  focal: number;
  products: string[];
};

/**
 * Join the canonical transition/idle pairs into the stops the site parks on.
 * Only the first inbound playback file is substituted: the site-only composite
 * contains the approved 96-frame bridge followed by canonical transition 00
 * frames 1..144. Frame 0 is intentionally omitted because it is byte-identical
 * to bridge frame 95; keeping both would create a one-frame frozen seam.
 */
export const STOPS: FilmStop[] = (() => {
  const focal: Record<string, number> = {
    "check-in": 50,
    connect: 52,
    // the manager stands hard left; a centre crop is an empty desk and two chairs
    "command-asset": 22,
    academy: 55,
    // 40 keeps BOTH the squatting client and the coach holding the tablet.
    // 30 was tried and dropped the coach out of frame entirely.
    trainer: 40,
    // 50 is an empty cable station. 66 puts a training member in frame.
    // (This is the CROP. The Companion brief stays horizontally centered and
    // stemless per the approved composition rules — the two are unrelated.)
    companion: 66,
    station: 46,
    studio: 52,
    fuel: 48,
    mrkt: 50,
  };

  const out: FilmStop[] = [];
  for (let i = 0; i < SEQ.length; i++) {
    const e = SEQ[i];
    if (e.type !== "idle" || e.order > HERO_LAST_ORDER) continue;
    const prev = SEQ[i - 1];
    if (!prev || prev.type !== "transition") {
      throw new Error(`heroFilm: idle "${e.stop}" has no inbound transition in the manifest`);
    }
    const isOpening = prev.file === OPENING_COMPOSITE.sourceTransition;
    out.push({
      id: e.stop!,
      suite: e.suite!,
      idle: e.file,
      inbound: isOpening ? OPENING_COMPOSITE.file : prev.file,
      inboundFrames: isOpening ? OPENING_COMPOSITE.frames : Math.round(prev.duration * FPS),
      focal: focal[e.stop!] ?? 50,
      products: e.products ?? [],
    });
  }
  return out;
})();

/**
 * The clip that carries the visitor OFF the last stop and into the descent.
 * Manifest entry 20. It is a transition with no idle of its own — its
 * destination is the ecosystem section.
 */
export const EXIT_CLIP = (() => {
  const e = SEQ.find((s) => s.order === HERO_LAST_ORDER)!;
  return { file: e.file, frames: Math.round(e.duration * FPS) };
})();

/**
 * ══ DEAD-TAIL HANDOFF ════════════════════════════════════════════════════
 *
 * Several transitions come to rest BEFORE their last frame and then hold on a
 * frozen picture. On the orb -> check-in leg that hold is 3-4 seconds of a 6.04s
 * clip: the camera arrives, and then nothing happens for over half the leg
 * while the visitor waits, unable to move (input is discarded while travelling).
 *
 * The fix is a playback decision, NOT a media edit. The approved masters are
 * untouched and no file is trimmed — the player simply hands over to the idle at
 * the frame where the motion actually ends, instead of sitting on the frozen
 * tail waiting for `ended`. The idle is the same locked-off shot, and the step
 * between them is a fraction of a percent, so the handover is invisible; all it
 * removes is the wait.
 *
 * This also shortens the LEG, not just the picture: `legSeconds` reads the same
 * table, so the scroll tween finishes with the motion and the stop parks when
 * it looks like it has arrived. Without that, the idle would start on time but
 * the visitor would still be frozen out for the remainder of the clip — the dead
 * time would move rather than go away.
 *
 * ── VALUES ARE MEASURED, NEVER GUESSED ───────────────────────────────────
 * Each entry is the frame index where per-frame motion drops to the idle's own
 * level and stays there, read off a motion curve across the whole clip. `null`
 * means "no dead tail found, play to the last frame" and is the default, so an
 * unmeasured clip behaves exactly as it does today.
 */
/*  MEASURED 2026-08-07 · `hero-film-audit/measure-dead-tails.py` (re-runnable)
 *
 *  Each clip was measured on its OWN motion distribution — the frozen threshold
 *  is 5% of that clip's median frame-step with an absolute floor, so a slow dark
 *  clip and a fast bright one are not judged by the same number. A frozen run
 *  must last 6+ frames to count, so an ease-out is never mistaken for a freeze.
 *
 *  clip                          frames  dur    lastMove  frozen@  handoff  removed
 *  ─────────────────────────────────────────────────────────────────────────────
 *  00-orb-bridge-to-checkin         240  10.00s       180      181      181    2.46s
 *  00-orb-to-01-pro-checkin         145   6.04s        85       86       86    2.46s
 *  01-pro-checkin-to-02-connect    145   6.04s       138      139      139    0.25s
 *  02-connect-to-03-command        145   6.04s       117      118      118    1.12s
 *  03-command-to-04-academy        145   6.04s       122      123      123    0.92s
 *  04-academy-to-05-trainer        169   7.04s       155      156      156    0.54s
 *  05-trainer-to-06-companion      145   6.04s       144        -        -    none
 *  06-companion-to-07-station      145   6.04s       135      136      136    0.38s
 *  07-station-to-08-studio         169   7.04s       168        -        -    none
 *  08-studio-to-09-fuel            145   6.04s       137      138      138    0.29s
 *  09-fuel-to-10-mrkt              145   6.04s       144        -        -    none
 *  10-mrkt-to-orb-descend          121   5.04s       120        -        -    none
 *
 *  Four clips have no sustained frozen tail and play to their last frame.
 *  Total dead time removed across a full forward traversal: 5.96s.
 *
 *  The check-in leg is by far the worst and is the one that was reported: 59 of
 *  its canonical 145 frames are frozen. The playback composite prepends 96
 *  bridge frames and removes canonical frame 0 at the identical internal seam,
 *  shifting the verified handoff by 95 frames: 86 + 95 = 181. Its active travel
 *  time is therefore 181 / 24 = 7.541666... seconds. The same 59 frozen frames
 *  remain excluded in both directions; none of the approved footage is trimmed.
 */
export const HANDOFF_FRAME: Record<string, number | null> = {
  "00-orb-bridge-to-01-pro-checkin.mp4": 181,          // bridge + transition motion; 59-frame tail excluded
  "00-orb-to-01-pro-checkin.mp4": 86,                  // 59 frozen frames — removes 2.46s
  "01-pro-checkin-to-02-pro-connect.mp4": 139,         // 6 frozen — removes 0.25s
  "02-pro-connect-to-03-pro-command-asset.mp4": 118,   // 27 frozen — removes 1.12s
  "03-pro-command-asset-to-04-pro-academy.mp4": 123,   // 22 frozen — removes 0.92s
  "04-pro-academy-to-05-one-trainer.mp4": 156,         // 13 frozen — removes 0.54s
  "05-one-trainer-to-06-one-companion.mp4": null,      // moves to its last frame
  "06-one-companion-to-07-one-station.mp4": 136,       // 9 frozen — removes 0.38s
  "07-one-station-to-08-one-studio.mp4": null,         // moves to its last frame
  "08-one-studio-to-09-one-fuel.mp4": 138,             // 7 frozen — removes 0.29s
  "09-one-fuel-to-10-one-mrkt.mp4": null,              // moves to its last frame
  "10-one-mrkt-to-orb-descend.mp4": null,              // moves to its last frame
  // NOT PLAYED BY THIS PLAYER — `11-orb-descend-to-ecosystem.mp4` is the
  // ecosystem's own descent and is served as the frame strip in
  // `public/frames/descent/`. Recorded here only because the same sweep found a
  // 28-frame (1.17s) frozen tail in it, which is worth knowing about if the
  // ecosystem's scrub ever feels like it stalls at the bottom of the descent.
  // Left alone: that section is out of scope.
};

/** the frame a transition should hand over on — its dead tail, or its end */
export const handoffFrame = (file: string, frames: number) =>
  HANDOFF_FRAME[file] ?? frames;

/** travel time for a leg, in seconds, from the clip's own frame count */
export const legSeconds = (frames: number) => frames / FPS;

/**
 * The opening orb idle, which loops before the first gesture.
 *
 * This is the EXISTING approved opening and is deliberately not part of the 4K
 * package. The site-only opening composite carries it through the approved
 * four-second orb bridge and then through canonical clip 00 into check-in. It
 * is served through the same player as every other idle so the first handoff
 * uses the identical atomic swap as all the others, rather than a separate
 * layer that has to be timed against the film.
 */
export const ORB_IDLE = "/media/orb-stationary.mp4";

/** web derivative paths. The 4K masters are never referenced by the app. */
export const clipSrc = (file: string, tier: "1080" | "720", reverse = false) =>
  `/media/hero-film/${tier}${reverse ? "/reverse" : ""}/${file}`;

/* ══════════════════════════════════════════════════════════════════════════
   CONNECTOR ANCHORS
   ══════════════════════════════════════════════════════════════════════════ */

/** the space the anchors below are measured in */
export const SRC_W = 1920;
export const SRC_H = 1080;

export type NodeAnchor = {
  product: string;
  /** the object this brief points at, in 1920x1080 source space */
  x: number;
  y: number;
  /** no connector stem at all — the brief simply sits centered */
  centered?: boolean;
};

/**
 * WHERE EACH BRIEF'S HAIRLINE LANDS.
 *
 * Every one of these was re-measured against the approved 4K idle frames on a
 * 10% grid. The previous coordinates were template-matched against the old
 * 478-frame journey strip and are meaningless here — different scenes, different
 * rooms, different staging.
 *
 * ── THE VELOCITY TRACKING IS GONE, AND THAT IS CORRECT NOW ───────────────
 * The old anchors carried `vx`/`vy` because the callout sat on a scrubbed
 * MOVING shot and the object slid out from under a fixed coordinate. The
 * approved idles are locked-off: measured frame-to-frame movement across them
 * is 0.4-1.6 mean-abs-diff, i.e. the light breathes and the people shift, but
 * the camera does not travel. A static anchor is the right model for a static
 * camera, and it removes a whole class of drift bugs with it.
 */
export const NODES: Record<string, NodeAnchor[]> = {
  "check-in": [
    { product: "Loops", x: 870, y: 516 },   // the check-in tablet on the counter
    { product: "Core", x: 1225, y: 470 },   // the reception workstation screen
  ],
  connect: [{ product: "Connect", x: 800, y: 400 }],           // the iMac on the desk
  "command-asset": [
    { product: "Command Center", x: 510, y: 500 },             // the manager's tablet
    { product: "Asset Management", x: 1560, y: 720 },          // the floor equipment through the glass
  ],
  academy: [{ product: "Academy", x: 1120, y: 580 }],          // the trainer's tablet
  trainer: [{ product: "Trainer", x: 1010, y: 524 }],          // the coach's tablet
  // Centered, and deliberately stemless: the approved composition rules say
  // Companion has no connector to any one machine, because it is the floor
  // itself that is responsive, not a single unit.
  companion: [{ product: "Companion", x: 960, y: 540, centered: true }],
  station: [{ product: "Station", x: 910, y: 500 }],           // the Station display
  studio: [{ product: "Studio", x: 310, y: 280 }],             // the class screen on the wall
  fuel: [{ product: "Fuel", x: 960, y: 580 }],                 // the phone
  mrkt: [{ product: "MRKT", x: 920, y: 350 }],                 // the supplement being handed over
};

/* ══════════════════════════════════════════════════════════════════════════
   COPY
   ══════════════════════════════════════════════════════════════════════════ */

export type Brief = {
  suite: string;
  rail: string[];
  proposition: string;
  specs: string[];
  cta: string;
  /** true = written by Claude, NOT yet approved. See DRAFT_COPY below. */
  draft?: boolean;
};

/**
 * ⚠️ DRAFT — NOT APPROVED COPY ⚠️
 *
 * Command Center and Asset Management are new stops in the approved sequence
 * and have no product copy anywhere in this repo — and no Product/Feature Map
 * either. The internal maps cover Station, Companion, Trainer, Studio, Fuel,
 * Academy, Connect and Insights, and stop there. These two briefs were drafted
 * from the product meanings recorded in `CONTEXT.md` §9/§10 and stay
 * `draft: true` until real copy exists.
 *
 * Academy WAS in this set and is now settled from its own feature map.
 *
 * They are wired in so the layout can actually be verified at every viewport —
 * three empty stops cannot be checked for overlap, centering or nav clearance.
 * Replace the strings once approved; nothing else has to change. The same
 * applies to the three captions marked DRAFT in `CAPTIONS`.
 */
export const DRAFT_COPY_PENDING_APPROVAL = true;

const BRIEFS: Record<string, Brief> = {
  Loops: {
    suite: "LUMIN PRO",
    rail: ["CORE", "LOOPS"],
    proposition: "Turn every visit into a return signal.",
    specs: ["Wallet-first engagement", "Referral loops built in", "No app download required"],
    cta: "Explore Loops",
  },
  Core: {
    suite: "LUMIN PRO",
    rail: ["PRO", "CORE"],
    proposition: "Run the business from one system of record.",
    specs: ["Members and accounts", "Scheduling and billing", "Check-in and facility data"],
    cta: "Explore Core",
  },
  Connect: {
    suite: "LUMIN PRO",
    rail: ["PRO", "CONNECT"],
    proposition: "Turn lead follow-up into a managed system.",
    specs: ["CRM built for fitness", "Calls and texts in platform", "Cadences managers can see"],
    cta: "Explore Connect",
  },
  "Command Center": {
    suite: "LUMIN PRO",
    rail: ["CORE", "COMMAND CENTER"],
    proposition: "See every location from one desk.",
    specs: ["Live operational picture", "Performance across sites", "Decisions backed by the record"],
    cta: "Explore Command Center",
    draft: true,
  },
  // Physical facility asset operations — equipment, machines and hardware:
  // where a unit is, who owns it, its maintenance and service status, and where
  // it sits in its lifecycle. Confirmed 2026-08-07. Explicitly NOT financial or
  // contract asset management.
  "Asset Management": {
    suite: "LUMIN PRO",
    rail: ["CORE", "ASSET MANAGEMENT"],
    proposition: "Every machine on the floor, accounted for.",
    specs: ["Equipment, location and ownership", "Maintenance and service status", "Lifecycle from install to replacement"],
    cta: "Explore Asset Management",
    draft: true,
  },
  // SETTLED from `Internal/Lumin_Academy_Product_Feature_Map.pdf` — the
  // proposition is its "Best Positioning Line" verbatim, and the specs are
  // drawn from its Core Capability Map (AI Course Creation, Assignment +
  // Tracking, Scale + Consistency). No longer draft.
  Academy: {
    suite: "LUMIN PRO",
    rail: ["PRO", "ACADEMY"],
    proposition: "Turn your knowledge into training that scales.",
    specs: ["SOPs become structured courses", "Assignment and completion tracked", "One playbook across every location"],
    cta: "Explore Academy",
  },
  Trainer: {
    suite: "LUMIN ONE",
    rail: ["ONE", "TRAINER"],
    proposition: "Prescribe coaching from context, not guesswork.",
    specs: ["Goal-aware protocols", "Coach-reviewed sessions", "Progress adapts live"],
    cta: "Explore Trainer",
  },
  Companion: {
    suite: "LUMIN ONE",
    rail: ["ONE", "COMPANION"],
    proposition: "Make the training floor responsive.",
    specs: ["Machine-side intelligence", "Guidance at the point of work", "Progress captured automatically"],
    cta: "Explore Companion",
  },
  Station: {
    suite: "LUMIN ONE",
    rail: ["ONE", "STATION"],
    proposition: "Turn any screen into a training unit.",
    specs: ["AI-coached workouts", "Rep counting and form feedback", "Built for unused spaces"],
    cta: "Explore Station",
  },
  Studio: {
    suite: "LUMIN ONE",
    rail: ["ONE", "STUDIO"],
    proposition: "Make every class feel connected.",
    specs: ["Group training orchestration", "Live class display", "Programming across locations"],
    cta: "Explore Studio",
  },
  Fuel: {
    suite: "LUMIN ONE",
    rail: ["ONE", "FUEL"],
    proposition: "Nutrition coaching that follows the workout.",
    specs: ["Personalized nutrition targets", "RD coaching built in", "Connected to training context"],
    cta: "Explore Fuel",
  },
  MRKT: {
    suite: "LUMIN ONE",
    rail: ["ONE", "MRKT"],
    proposition: "Supplemental wellness connected to progress.",
    specs: ["Curated wellness marketplace", "DotFit fulfillment", "Thrive clinical consults"],
    cta: "Explore MRKT",
  },
};

export const briefFor = (product: string): Brief | undefined => BRIEFS[product];

/**
 * One caption per stop.
 *
 * SEVEN of these ten are the already-approved journey captions, carried across
 * unchanged from `copy.ts` — the old beat ids map cleanly onto the new stops
 * (consultation→connect, assessment→trainer, training-floor→companion). Only
 * the three genuinely new stops needed writing, and those are marked DRAFT.
 */
export const CAPTIONS: Record<string, { text: string; draft?: boolean }> = {
  "check-in": { text: "Every visit becomes a signal." },
  connect: { text: "Leads turn into relationships." },
  "command-asset": { text: "The whole operation, on one desk.", draft: true },
  academy: { text: "Standards become something you can teach.", draft: true },
  trainer: { text: "Coaching starts with context." },
  companion: { text: "The environment becomes intelligent." },
  station: { text: "Unused space becomes an experience." },
  studio: { text: "Classes move as one connected system." },
  fuel: { text: "Progress continues beyond the workout." },
  mrkt: { text: "Recovery and wellness, on the same record.", draft: true },
};
