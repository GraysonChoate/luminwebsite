import { gsap, ScrollTrigger } from "@/lib/motion";
import { getLenis } from "@/components/SmoothScroll";

/**
 * SCENE STEPPER — one gesture, one scene. Nothing banks.
 *
 * ── WHY THE PREVIOUS MODEL LURCHED ───────────────────────────────────────
 * Scrub + catch + governor let scroll input become a BALANCE. A hard flick
 * banked up to 1400px of travel, the film spent it at a capped rate, and a
 * catch released itself as soon as `pending() > 0` — which was still true from
 * money you had already spent two scenes ago. So it would move a little, lock
 * in, then blaze ahead on its own with nobody touching the trackpad. Every
 * variation of that design has the same hole: as long as intent is stored as a
 * DISTANCE, there is always leftover distance to spend.
 *
 * So intent is not stored at all. A gesture is a TRIGGER, never a quantity.
 * One gesture moves the film from the product it is resting on to the next
 * one, at a fixed pace, and no amount of extra scrolling makes that travel
 * longer, faster, or carry past its destination. Swipe strength stops existing
 * as a variable. There is no accumulator to drain, so there is nothing that
 * can drain by itself.
 *
 * ── HOW A GESTURE IS RECOGNISED ──────────────────────────────────────────
 * The hard part, every time, is telling a real gesture from the tail of the
 * last one — a macOS flick keeps firing decaying events for up to 2.5s. The
 * previous file records four rules that each broke a different input style.
 * This one does not try to detect the END of a gesture. It waits to be ARMED:
 *
 *   · on arrival the stepper is disarmed, and every incoming event RESETS a
 *     quiet timer. A decaying tail keeps resetting it, so a tail can never arm
 *     the stepper and can never step it. This is what kills the self-driving.
 *   · once input actually stops for QUIET_MS, it arms, and the next real push
 *     steps it.
 *   · a visitor who never stops scrolling would otherwise never see quiet and
 *     would freeze, so pushing ARM_BUDGET without a pause arms it too. A
 *     decayed tail is nowhere near that budget; a hand still actively moving
 *     passes it in a fraction of a second.
 *
 * That is the same silence-OR-budget arming the ecosystem descent already
 * uses, which is the one gesture detector in this codebase that has never had
 * to be rewritten.
 *
 * Nothing accumulates WHILE TRAVELLING — input during the move is dropped on
 * the floor rather than queued. That is the second half of "it never skips".
 */

export type SceneStepper = { destroy: () => void };

const KEYS_FWD = new Set(["ArrowDown", "PageDown", " ", "Spacebar"]);
const KEYS_BACK = new Set(["ArrowUp", "PageUp"]);

/**
 * Input has to stop this long before a new gesture counts.
 *
 * 320, and it has to be over 250. A macOS momentum tail does not just decay in
 * SIZE, it decays in FREQUENCY — the gaps between its events widen toward a
 * quarter of a second as it dies. At 150 the end of a tail looked like silence
 * followed by fresh input, so it armed itself and stepped a second scene. That
 * is the same trap recorded in beatGate.ts ("release after 160ms of quiet → a
 * decaying tail's gaps widen past that").
 *
 * It surfaced only after the journey was slowed to 24fps: with faster travel
 * the whole tail was still dense when it arrived, and it was the SLOW build
 * that exposed the widest-gap end of it. Both halves of that pair — a fast
 * build and a slow one — were needed to see it.
 *
 * A long quiet threshold on its own would freeze anyone who never pauses;
 * SUSTAIN_MS below is what makes it safe.
 */
const QUIET_MS = 320;
/**
 * …unless input has been arriving without a break for this long, which is the
 * escape hatch for a visitor who simply never lifts their fingers.
 *
 * This was a DISTANCE budget first, and distance is the wrong measure: how much
 * of a momentum tail survives the travel depends on how long the travel takes,
 * so the same flick armed on the production build (fast) and did not on dev
 * (slow) — one scene locally, two in the build. Time does not have that
 * problem. A macOS momentum tail is finite and dies inside about 2.5s from the
 * flick, and the travel has already eaten part of it before we start counting,
 * so a tail can never sustain this. A hand still moving passes it every time.
 */
const SUSTAIN_MS = 2600;
/** once armed, this much push is a gesture */
const MIN_PUSH = 25;

export function createSceneStepper({
  section, anchors, totalFrames, onDepart, onArrive, onExit,
  framesPerSec = 24, settleMs = 420,
}: {
  section: HTMLElement;
  /** the resting points, in section-progress space (0..1), ascending */
  anchors: number[];
  /** how many frames the section's progress spans, so travel can be timed in
   *  FILM time rather than screen distance */
  totalFrames: number;
  /** the film has started moving — hide anything pinned to the frame */
  onDepart: () => void;
  /** resting on anchor `i`, frame settled. Show the callout HERE and only here. */
  onArrive: (i: number) => void;
  /** stepped past the last anchor: control is handed back to the page */
  onExit: () => void;
  /**
   * THE FILM'S OWN RATE. Everything in this project is 24fps footage, so at 24
   * the walk, the camera move and the holograms all play at the timing they
   * were rendered for.
   *
   * This was px-per-second first, and that is wrong twice over. It ran the
   * journey at about 50 frames a second — a shade over DOUBLE the authored
   * speed, with everyone in the gym moving at double time. And because the
   * scroll distance a section spans depends on the window height, the same
   * setting played the film faster on a shorter window: 380 px/s is ~50fps at
   * 900px tall and ~64fps at 700px. Frames per second has neither problem.
   */
  framesPerSec?: number;
  /** how long to let the scrubbed frame catch up before calling it a stop */
  settleMs?: number;
}): SceneStepper {
  let engaged = false;
  let travelling = false;
  let armed = false;
  let pushed = 0;              // signed, since the last arrival
  let sustainFrom = 0;         // when the current unbroken run of input began
  let at = -1;                 // resting anchor index; -1 = the opening
  let tween: gsap.core.Tween | null = null;
  let quietT: number | undefined;
  let settleT: number | undefined;
  let restY = 0;

  const span = () => Math.max(1, section.offsetHeight - window.innerHeight);
  const yFor = (p: number) => Math.round(section.offsetTop + span() * p);
  const endY = () => Math.round(section.offsetTop + span());

  const block = (e: Event) => e.preventDefault();

  /** while resting, the page does not move. Anything that nudges it is undone. */
  const holdStill = () => {
    if (travelling || !engaged) return;
    if (window.scrollY !== restY) window.scrollTo(0, restY);
  };

  function disarm() {
    armed = false;
    pushed = 0;
    sustainFrom = 0;
    window.clearTimeout(quietT);
    quietT = window.setTimeout(() => { armed = true; pushed = 0; sustainFrom = 0; }, QUIET_MS);
  }

  function record(dy: number) {
    // THE FIX. Input during travel is discarded, not queued. Queuing it is what
    // let a flick buy several scenes and made the film run on by itself.
    if (travelling || !engaged) return;
    const now = performance.now();
    if (!sustainFrom) sustainFrom = now;
    pushed += dy;
    if (!armed && now - sustainFrom >= SUSTAIN_MS) armed = true;
    window.clearTimeout(quietT);
    quietT = window.setTimeout(() => { armed = true; pushed = 0; sustainFrom = 0; }, QUIET_MS);
    if (armed && Math.abs(pushed) >= MIN_PUSH) step(Math.sign(pushed));
  }

  function step(dir: number) {
    if (travelling || !engaged) return;
    const next = at + dir;
    if (next < -1) return;                       // nothing above the opening
    const last = anchors.length - 1;

    travelling = true;
    disarm();
    window.clearTimeout(settleT);
    onDepart();

    const fromY = window.scrollY;
    const toY = next > last ? endY() : next < 0 ? section.offsetTop : yFor(anchors[next]);
    // CONSTANT RATE, measured in film. A wide gap between two products takes
    // proportionally longer than a narrow one, which is what "even tempo"
    // means — a fixed duration per step would do the opposite and make the
    // wide gaps race.
    const frames = Math.abs(toY - fromY) / Math.max(1, span()) * totalFrames;
    const duration = Math.max(0.4, frames / framesPerSec);

    const o = { y: fromY };
    tween?.kill();
    tween = gsap.to(o, {
      y: toY, duration,
      // Linear on purpose. The ease-in/out is supplied by the frame scrub
      // downstream, which softens both ends on its own — doing it here as well
      // would peak the middle of every leg well above 24fps and undo the point
      // of pacing to the film's own rate.
      ease: "none",
      onUpdate: () => {
        getLenis()?.stop();                      // we are the only thing moving the page
        window.scrollTo(0, Math.round(o.y));
        ScrollTrigger.update();
      },
      onComplete: () => {
        at = next;
        restY = toY;
        travelling = false;
        if (next > last) { disengage(); onExit(); return; }
        if (next < 0) { disarm(); return; }      // back at the opening, no callout
        // Let the scrubbed frame land before we call this a stop. The callout
        // is pinned to the object at the anchor FRAME, so popping it while the
        // picture is still easing in is what made it slide into view instead of
        // appearing out of the thing it points at.
        settleT = window.setTimeout(() => onArrive(next), settleMs);
        disarm();
      },
    });
  }

  const onWheel = (e: WheelEvent) => record(e.deltaY);
  let touchY = 0;
  const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
  const onTouchMove = (e: TouchEvent) => {
    const y = e.touches[0].clientY;
    record((touchY - y) * 2.2);
    touchY = y;
  };
  const onKey = (e: KeyboardEvent) => {
    if (!engaged) return;
    if (KEYS_FWD.has(e.key)) { e.preventDefault(); step(1); }
    else if (KEYS_BACK.has(e.key)) { e.preventDefault(); step(-1); }
  };

  function engage() {
    if (engaged) return;
    engaged = true;
    restY = window.scrollY;
    getLenis()?.stop();
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", holdStill);
    disarm();
  }

  function disengage() {
    if (!engaged) return;
    engaged = false;
    travelling = false;
    tween?.kill();
    window.clearTimeout(quietT);
    window.clearTimeout(settleT);
    window.removeEventListener("wheel", block);
    window.removeEventListener("touchmove", block);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("scroll", holdStill);
    const lenis = getLenis();
    // hand the page back where it actually is, or Lenis resumes toward whatever
    // target it was chasing when we took over
    lenis?.scrollTo(window.scrollY, { immediate: true, force: true });
    lenis?.start();
  }

  const watcher = ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "bottom bottom",
    onToggle: (self) => (self.isActive ? engage() : disengage()),
  });
  // a section pinned at scrollY 0 reads as inactive until scroll crosses it
  const r = section.getBoundingClientRect();
  if (r.top <= 0 && r.bottom >= window.innerHeight) engage();

  const bail = () => { onDepart(); disengage(); };
  window.addEventListener("lumin:releaseGates", bail);
  window.addEventListener("lumin:jumpTo", bail);

  return {
    destroy() {
      disengage();
      watcher.kill();
      window.removeEventListener("lumin:releaseGates", bail);
      window.removeEventListener("lumin:jumpTo", bail);
    },
  };
}
