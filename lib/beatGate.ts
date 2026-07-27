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

/* ════════════════════════════════════════════════════════════════════════
   SCRUB + CATCH — the combo.

   The full stepper made every inch of the film a discrete hop, which reads as
   clunky: eight scenes became sixteen jerks with a hold between each. But free
   scrubbing lets a flick blow past the product moments, which is the thing
   that actually matters.

   So: scroll SCRUBS normally — smooth, yours, at whatever pace you like — and
   the page only takes over at the ANCHORS. Cross a product moment and it
   catches you there, freezes on the frame where that object is clearly in shot,
   and shows the callout. One deliberate gesture releases it and scrubbing
   resumes until the next anchor. Eight catches across the whole journey
   instead of sixteen hops, and the holds land exactly where there is something
   to read and click.

   Each anchor catches ONCE going forward. Scrolling back is free — you have
   already seen it, and re-catching on the way out is what made the ecosystem
   feel like it had to be forced.
   ════════════════════════════════════════════════════════════════════════ */

export type ScrubCatch = { destroy: () => void };

export function createScrubCatch({
  section, anchors, onCatch, onRelease,
}: {
  section: HTMLElement;
  /** anchor positions in section-progress space (0..1), ascending */
  anchors: number[];
  onCatch: (i: number) => void;
  onRelease: () => void;
}): ScrubCatch {
  let held = -1;                       // index currently caught, or -1
  let pinnedTo = 0;
  const done = new Set<number>();      // anchors already released
  let last = 0;

  /* ── TELLING A NEW GESTURE FROM AN OLD ONE'S TAIL ─────────────────────
     A trackpad flick is not a handful of events. macOS drives a short push and
     then a LONG inertial tail — up to ~2.5s — where the deltas decay toward
     1px AND the gaps between events WIDEN toward ~250ms. Both properties
     matter, and missing the second one is what broke every previous attempt:
     a fixed "quiet for 160ms" test starts passing partway down the tail, so
     the tail released the catch it had just triggered and carried on. Measured
     with a faithful tail simulation: all eight anchors skipped, every one
     landing ~4 frames past its catch.

     So arm on SILENCE, not on a gap, and demand a real push to fire:
       1. a timer that only fires after the wheel has been quiet 320ms — longer
          than any gap inside a decaying tail;
       2. and then a wheel event of at least MIN_DELTA, which a tail decayed to
          a couple of pixels can never produce.
     Both must hold, so no tail of any length or shape can release a catch. */
  let caughtAt = 0;
  let armed = false;
  let silenceTimer: number | undefined;
  let hardTimer: number | undefined;
  let intent = 0;             // |deltaY| accumulated since arming
  const SILENCE_MS = 320;     // longer than any gap inside a momentum tail
  const HARD_ARM_MS = 2000;   // …but arm anyway, so it can never deadlock
  /** Measured, not guessed: after the hard arm fires, the remaining tail of a
   *  peak-160 flick contributes ~62px and a peak-500 flick ~104px. A person
   *  actively scrolling puts down 60px in a tick or two. 200 sits above every
   *  tail and below any real scroll, so a flick can never release its own
   *  catch and a scroller is never held for more than a beat. */
  const INTENT_PX = 200;
  const KEY_HOLD_MS = 1200;   // a keypress is one gesture; give it a real dwell

  const span = () => Math.max(1, section.offsetHeight - window.innerHeight);
  const yFor = (p: number) => Math.round(section.offsetTop + span() * p);

  const block = (e: Event) => e.preventDefault();
  const hold = () => {
    if (held < 0) return;
    getLenis()?.stop();               // re-assert: Lenis may mount after us
    if (window.scrollY !== pinnedTo) window.scrollTo(0, pinnedTo);
  };

  function grab(i: number) {
    held = i;
    pinnedTo = yFor(anchors[i]);
    getLenis()?.stop();
    window.scrollTo(0, pinnedTo);
    ScrollTrigger.update();
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("scroll", hold);
    caughtAt = performance.now();
    armed = false;
    intent = 0;
    window.clearTimeout(silenceTimer);
    window.clearTimeout(hardTimer);
    // THE DEADLOCK GUARD. Arming only on silence meant somebody who simply
    // keeps scrolling never arms it at all — every event reset the timer and
    // the catch held forever. Measured: frozen on the first product for 14s of
    // continuous scrolling. This timer is never reset, so the hold always ends.
    hardTimer = window.setTimeout(() => { armed = true; }, HARD_ARM_MS);
    onCatch(i);
  }

  function letGo() {
    if (held < 0) return;
    done.add(held);
    held = -1;
    armed = false;
    intent = 0;
    window.clearTimeout(silenceTimer);
    window.clearTimeout(hardTimer);
    window.removeEventListener("wheel", block);
    window.removeEventListener("touchmove", block);
    window.removeEventListener("scroll", hold);
    const lenis = getLenis();
    // Resync BEFORE starting. Lenis keeps the target it was heading for when it
    // was stopped, so a hard flick into a catch leaves a target far down the
    // page; start() alone would resume straight to it and rip through the rest
    // of the film. Pin the target to where we actually are, then start.
    lenis?.scrollTo(pinnedTo, { immediate: true, force: true });
    lenis?.start();
    onRelease();
    // step just past the anchor so the crossing test cannot re-fire
    last = (pinnedTo - section.offsetTop) / span();
    const nudge = pinnedTo + Math.round(window.innerHeight * 0.12);
    lenis?.scrollTo(nudge, { duration: 0.5 });
  }

  const watcher = ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      if (held >= 0) return;
      const p = self.progress;
      if (p > last) {                                  // forward only
        for (let i = 0; i < anchors.length; i++) {
          if (!done.has(i) && last < anchors[i] && p >= anchors[i]) { grab(i); break; }
        }
      }
      last = p;
    },
    // Leaving the section is the last chance to honour an anchor. A single
    // large jump — PageDown, or Lenis resolving a big target — can carry past
    // the final anchor and out of the trigger in ONE update, so the crossing
    // test above never sees it and that product is silently skipped. Measured
    // on keyboard input: Market missed every run. Sweep on the way out and
    // catch anything that was jumped over; grab() snaps back to it.
    onLeave: () => {
      if (held >= 0) { letGo(); return; }
      for (let i = 0; i < anchors.length; i++) {
        if (!done.has(i) && anchors[i] > last) { last = anchors[i]; grab(i); return; }
      }
    },
    onLeaveBack: () => letGo(),
  });

  const onKey = (e: KeyboardEvent) => {
    if (held < 0) return;
    if (!KEYS.has(e.key)) return;
    e.preventDefault();
    // Match the wheel's dwell. At 350ms a keyboard user got the callout for a
    // blink — long enough for the catch to register, far too short to read the
    // product or click it, which defeats the entire point of catching.
    if (performance.now() - caughtAt < KEY_HOLD_MS) return;
    letGo();
  };
  /** Every wheel event — blocked or not — feeds this.
   *  Once armed we measure INTENT rather than a single delta: a dying tail
   *  contributes a few pixels over its last moments, a person scrolling
   *  contributes 60 in a tick or two. That releases a gentle scroller as
   *  readily as a hard one, which a single-delta threshold would not. */
  const onWheel = (e: WheelEvent) => {
    if (held < 0) return;
    if (armed) {
      intent += Math.abs(e.deltaY);
      if (intent >= INTENT_PX) { letGo(); return; }
      return;
    }
    // not armed yet: keep waiting for the gesture to actually stop
    window.clearTimeout(silenceTimer);
    silenceTimer = window.setTimeout(() => { armed = true; intent = 0; }, SILENCE_MS);
  };
  let ty = 0;
  const onTouchStart = (e: TouchEvent) => { ty = e.touches[0].clientY; };
  const onTouchEnd = (e: TouchEvent) => {
    if (held < 0) return;
    if (performance.now() - caughtAt < 350) return;
    if (Math.abs(ty - (e.changedTouches[0]?.clientY ?? ty)) > 24) letGo();
  };
  const navRelease = () => letGo();

  window.addEventListener("wheel", onWheel as EventListener, { passive: true });
  window.addEventListener("keydown", onKey);
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("lumin:releaseGates", navRelease);

  return {
    destroy() {
      letGo();
      watcher.kill();
      window.clearTimeout(silenceTimer);
      window.clearTimeout(hardTimer);
      window.removeEventListener("wheel", onWheel as EventListener);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("lumin:releaseGates", navRelease);
    },
  };
}
