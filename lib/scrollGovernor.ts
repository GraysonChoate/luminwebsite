import { ScrollTrigger } from "@/lib/motion";
import { getLenis } from "@/components/SmoothScroll";

/**
 * SCROLL GOVERNOR — an even tempo, whatever the hand does.
 *
 * Scrubbing maps scroll position straight onto the film, so how fast the film
 * runs is decided by how hard you flicked. A gentle swipe crawls; a hard one
 * rips through a scene before you have read it; the arrow keys jump. Catching
 * at the product moments fixed WHERE it stops, but not the speed in between.
 *
 * This fixes the speed. While the section owns the screen it takes the wheel,
 * touch and keys away from the page entirely and turns them into INTENT — a
 * distance you would like to travel. It then advances the page toward that
 * distance at a capped rate, every frame, no faster. Flick like a maniac and
 * the film still plays at its tempo; the only thing a bigger flick buys you is
 * more of it queued up.
 *
 * Because it drives scroll (not frames), every scrubbed rule downstream keeps
 * working off its own ScrollTrigger with nothing to keep in sync.
 */

export type Governor = { destroy: () => void };

const KEYS: Record<string, number> = {
  ArrowDown: 1, PageDown: 1, " ": 1, Spacebar: 1,
  ArrowUp: -1, PageUp: -1,
};

export function createScrollGovernor({
  section, maxPxPerSec = 460, keyStep = 420, paused,
}: {
  section: HTMLElement;
  /** the ceiling. The film cannot advance faster than this, ever. */
  maxPxPerSec?: number;
  /** how far one arrow press or spacebar asks to travel */
  keyStep?: number;
  /** e.g. while a catch is holding — the governor stands down and adds nothing */
  paused?: () => boolean;
}): Governor {
  let engaged = false;
  let pending = 0;          // px still owed, signed
  let raf = 0;
  let lastT = 0;

  /** never let one gesture bank more than this — a flick should not buy a mile */
  const MAX_PENDING = 1400;

  const block = (e: Event) => e.preventDefault();

  const onWheel = (e: WheelEvent) => {
    if (!engaged) return;
    pending += e.deltaY;
    pending = Math.max(-MAX_PENDING, Math.min(MAX_PENDING, pending));
  };
  let touchY = 0;
  const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
  const onTouchMove = (e: TouchEvent) => {
    if (!engaged) return;
    const y = e.touches[0].clientY;
    pending += (touchY - y) * 2.2;
    touchY = y;
    pending = Math.max(-MAX_PENDING, Math.min(MAX_PENDING, pending));
  };
  const onKey = (e: KeyboardEvent) => {
    if (!engaged) return;
    const dir = KEYS[e.key];
    if (!dir) return;
    e.preventDefault();
    pending += dir * keyStep;
    pending = Math.max(-MAX_PENDING, Math.min(MAX_PENDING, pending));
  };

  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;
    if (!engaged || (paused?.() ?? false)) return;
    if (Math.abs(pending) < 0.5) { pending = 0; return; }

    const step = Math.sign(pending) * Math.min(Math.abs(pending), maxPxPerSec * dt);
    pending -= step;

    const y = window.scrollY + step;
    getLenis()?.stop();                 // we are the only thing moving the page
    window.scrollTo(0, Math.round(y));
    ScrollTrigger.update();
  }

  function engage() {
    if (engaged) return;
    engaged = true;
    pending = 0;
    getLenis()?.stop();
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
  }

  function disengage() {
    if (!engaged) return;
    engaged = false;
    pending = 0;
    window.removeEventListener("wheel", block);
    window.removeEventListener("touchmove", block);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("keydown", onKey);
    const lenis = getLenis();
    // hand the page back exactly where it is, or Lenis resumes toward a stale
    // target it was heading for before we took over
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

  const release = () => disengage();
  window.addEventListener("lumin:releaseGates", release);
  raf = requestAnimationFrame(tick);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      disengage();
      watcher.kill();
      window.removeEventListener("lumin:releaseGates", release);
    },
  };
}
