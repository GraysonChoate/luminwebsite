import { gsap, ScrollTrigger } from "@/lib/motion";
import { getLenis } from "@/components/SmoothScroll";

/**
 * BEAT GATE — scroll as a trigger, not as a scrubber.
 *
 * ── WHY ──────────────────────────────────────────────────────────────────
 * A scrubbed section maps scroll position straight onto frame index, so how
 * much of the film you see is decided by how hard you flicked. A violent swipe
 * crosses three scenes; a gentle one crosses a third of one. Nothing enforces
 * the dwell the copy needs, and the copy is the whole point.
 *
 * A gate inverts that. While the section is pinned, scroll input is never
 * applied — it is only READ as intent. One gesture advances exactly one beat,
 * the travel runs at the film's authored 24fps, and further input is refused
 * until it lands. Swipe size and velocity stop mattering.
 *
 * ── HOW ──────────────────────────────────────────────────────────────────
 * It animates the SCROLL POSITION between stops rather than driving frames
 * directly. That matters: every scrubbed rule downstream (frame strips, caption
 * timelines, overlays) stays on its normal scroll path, so there is no second
 * code path to keep in sync. Lifted from the ecosystem activation, which proved
 * the technique, and generalised to step repeatedly in both directions.
 *
 * ── NEVER TRAP ANYBODY ───────────────────────────────────────────────────
 * Two ways out, by design:
 *   1. BOUNDARY RELEASE — at the first stop scrolling up, or the last stop
 *      scrolling down, the gate does not consume the gesture. It unlocks and
 *      lets the page move, so the section is always exitable by scrolling.
 *   2. NAV RELEASE — any `lumin:releaseGates` event force-unlocks every gate on
 *      the page. NavPill fires it before it scrolls, which is what makes the
 *      nav bar an exit you can actually trust rather than one that looks like
 *      it works and then gets yanked back by a still-attached scroll handler.
 */

export type BeatGate = {
  /** index of the stop we are parked on, or -1 while travelling */
  index: () => number;
  /** drive it from code — used by buttons, not by scroll */
  goTo: (i: number) => void;
  destroy: () => void;
};

type Opts = {
  section: HTMLElement;
  /** dwell points in section-progress space (0..1), ascending */
  stops: number[];
  /** seconds for the hop from stops[i] to stops[i+1]; length = stops.length-1 */
  durations: number[];
  /** fired when a hop lands (and once on engage) */
  onSettle?: (i: number) => void;
  /** fired when a hop starts */
  onTravel?: (from: number, to: number) => void;
  /** Veto a hop when its footage is not decoded yet. Returning false IGNORES
   *  the gesture rather than releasing — stepping into unfetched frames is what
   *  made the journey look like it was cutting scenes out. */
  canAdvance?: (to: number) => boolean;
  /** told when a gesture was vetoed, so the UI can say "loading" */
  onStall?: () => void;
};

const KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"]);

export function createBeatGate({ section, stops, durations, onSettle, onTravel, canAdvance, onStall }: Opts): BeatGate {
  let idx = 0;
  let travelling = false;
  let engaged = false;
  let tween: gsap.core.Tween | null = null;
  let pinnedTo = 0;
  let touchY = 0;

  const pinnedSpan = () => section.offsetHeight - window.innerHeight;
  const yFor = (i: number) => Math.round(section.offsetTop + pinnedSpan() * stops[i]);

  const nearest = () => {
    const p = (window.scrollY - section.offsetTop) / Math.max(1, pinnedSpan());
    let best = 0;
    stops.forEach((s, i) => {
      if (Math.abs(s - p) < Math.abs(stops[best] - p)) best = i;
    });
    return best;
  };

  /* ── input suppression ─────────────────────────────────────────────── */
  const block = (e: Event) => e.preventDefault();

  /** Stop Lenis, and keep stopping it.
   *  Calling this once in lock() is NOT enough. Child effects run before parent
   *  effects, so a section mounted inside <SmoothScroll> creates its gate BEFORE
   *  Lenis exists — `getLenis()` returns undefined and the stop silently does
   *  nothing. The bug that exposed this: gentle wheel ticks landed on their
   *  stops perfectly (the tween out-muscled Lenis's small motion) while a
   *  3000-delta flick blew through the entire section, because Lenis was
   *  smooth-scrolling the whole time and simply won. Re-assert on every hop and
   *  every scroll event so a late-arriving Lenis still gets frozen. */
  const freeze = () => { if (engaged) getLenis()?.stop(); };

  // Lenis being stopped does NOT stop a scrollbar drag, so hold natively too.
  const hold = () => {
    if (!engaged) return;
    freeze();
    if (window.scrollY !== pinnedTo) window.scrollTo(0, pinnedTo);
  };

  function lock() {
    if (engaged) return;
    engaged = true;
    pinnedTo = window.scrollY;
    getLenis()?.stop();
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("scroll", hold);
  }

  function unlock() {
    if (!engaged) return;
    engaged = false;
    window.removeEventListener("wheel", block);
    window.removeEventListener("touchmove", block);
    window.removeEventListener("scroll", hold);
    getLenis()?.start();
  }

  /** hop one stop. Returns false if the gesture should be let through instead. */
  function step(dir: 1 | -1): boolean {
    if (travelling) return true;                       // consumed, ignored
    const next = idx + dir;
    if (next < 0 || next >= stops.length) return false; // BOUNDARY RELEASE
    if (canAdvance && !canAdvance(next)) { onStall?.(); return true; } // hold
    travelling = true;
    freeze();
    onTravel?.(idx, next);
    const from = { y: window.scrollY };
    const to = yFor(next);
    const secs = dir > 0 ? durations[idx] : durations[next];
    tween = gsap.to(from, {
      y: to,
      duration: Math.max(0.35, secs),
      ease: "none",                                    // 24fps means LINEAR
      onUpdate: () => {
        freeze();
        pinnedTo = Math.round(from.y);
        window.scrollTo(0, pinnedTo);
        ScrollTrigger.update();                        // Lenis is stopped
      },
      onComplete: () => {
        travelling = false;
        idx = next;
        onSettle?.(idx);
      },
    });
    return true;
  }

  /* ── intent ────────────────────────────────────────────────────────── */
  function intent(dir: 1 | -1) {
    if (!engaged) return;
    if (!step(dir)) {
      // let them leave: drop the locks and hand the gesture back to the page
      unlock();
      const y = window.scrollY + dir * Math.round(window.innerHeight * 0.9);
      getLenis()?.scrollTo(y, { duration: 0.7 });
    }
  }

  const onWheel = (e: WheelEvent) => {
    if (!engaged || Math.abs(e.deltaY) < 2) return;
    intent(e.deltaY > 0 ? 1 : -1);
  };
  const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
  const onTouchEnd = (e: TouchEvent) => {
    if (!engaged) return;
    const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
    if (Math.abs(dy) > 24) intent(dy > 0 ? 1 : -1);
  };
  const onKey = (e: KeyboardEvent) => {
    if (!engaged || !KEYS.has(e.key)) return;
    e.preventDefault();
    intent(e.key === "ArrowUp" || e.key === "PageUp" || e.key === "Home" ? -1 : 1);
  };

  /* ── engage only while the section owns the screen ─────────────────── */
  const watcher = ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "bottom bottom",
    onToggle: (self) => {
      if (self.isActive) {
        idx = nearest();
        lock();
        onSettle?.(idx);
      } else {
        tween?.kill();
        travelling = false;
        unlock();
      }
    },
  });

  // Engage NOW if the section already owns the screen. Neither onToggle nor
  // `isActive` can be trusted here: the hero's pinned start IS scrollY 0, and a
  // trigger sitting exactly on its start reads as inactive until scroll crosses
  // it — which ate the visitor's very first gesture (it scrolled 5px natively
  // instead of playing beat one). Ask the geometry directly.
  const owningScreen = () => {
    const r = section.getBoundingClientRect();
    return r.top <= 0 && r.bottom >= window.innerHeight;
  };
  if (owningScreen()) { idx = nearest(); lock(); onSettle?.(idx); }

  const release = () => { tween?.kill(); travelling = false; unlock(); };
  window.addEventListener("lumin:releaseGates", release);
  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("keydown", onKey);

  return {
    index: () => (travelling ? -1 : idx),
    goTo: (i: number) => {
      if (i < 0 || i >= stops.length || travelling) return;
      const dir: 1 | -1 = i > idx ? 1 : -1;
      while (idx !== i && step(dir)) break;            // one hop; buttons re-call
    },
    destroy: () => {
      tween?.kill();
      unlock();
      watcher.kill();
      window.removeEventListener("lumin:releaseGates", release);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
    },
  };
}
