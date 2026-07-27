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
 * The full stepper this file used to export — one gesture per beat, in both
 * directions — was deleted. It made every inch of the film a discrete hop,
 * which read as clunky, and it was never able to tell a real gesture from the
 * tail of the previous one. What survives is the catch below.
 */

const KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"]);

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

  /* ── THE HOLD IS A TIMER, NOT A NEGOTIATION ───────────────────────────
     Every previous version tried to work out, from wheel events alone, whether
     input was a NEW gesture or the tail of the old one. Every threshold broke
     some way of scrolling:
       - release on the first event  → one flick burned every product
       - release after 160ms of quiet → a decaying tail's gaps widen past that,
                                        so the tail released its own catch
       - release on 320ms of silence  → someone who never stops scrolling never
                                        armed it, and it froze for good
       - release on accumulated push  → gentle scrolling produces deltas below
                                        the counting threshold, so again: frozen
     The premise was wrong. The catch does not need to know what kind of
     gesture it is looking at, because it does not need permission to let go.
     It holds for a fixed beat and releases itself. Nothing to detect, nothing
     to tune, and no input pattern that can jam it — you cannot deadlock a
     timer. Scroll on and the next product catches in turn.  */
  const HOLD_MS = 1600;
  let holdTimer: number | undefined;

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
    const lenis = getLenis();
    // Resync BEFORE stopping. Lenis keeps whatever target it was animating
    // toward, and stop() does not clear it — so a catch made during a big jump
    // (the last anchor, swept up on the way out) was immediately dragged back
    // out by the stale target and the callout flashed for 0.0s. Measured on
    // keyboard input: Market appeared and vanished inside one frame.
    lenis?.scrollTo(pinnedTo, { immediate: true, force: true });
    lenis?.stop();
    window.scrollTo(0, pinnedTo);
    ScrollTrigger.update();
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("scroll", hold);
    window.clearTimeout(holdTimer);
    holdTimer = window.setTimeout(letGo, HOLD_MS);
    onCatch(i);
  }

  function letGo() {
    if (held < 0) return;
    window.clearTimeout(holdTimer);
    done.add(held);
    held = -1;
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
      // While a catch is held the scroll is PINNED inside the section, so a
      // "leave" here is stale bookkeeping, not the visitor going anywhere.
      // Releasing on it undid the sweep the instant it fired — the last
      // product appeared and vanished within one frame (measured 0.0-0.1s on
      // keyboard). The only way out of a held catch is a real gesture.
      if (held >= 0) return;
      for (let i = 0; i < anchors.length; i++) {
        if (!done.has(i) && anchors[i] > last) { last = anchors[i]; grab(i); return; }
      }
    },
    onLeaveBack: () => letGo(),
  });

  /** Keys are swallowed while held so the page cannot lurch under the hold. */
  const onKey = (e: KeyboardEvent) => { if (held >= 0 && KEYS.has(e.key)) e.preventDefault(); };
  const navRelease = () => letGo();

  window.addEventListener("keydown", onKey);
  window.addEventListener("lumin:releaseGates", navRelease);

  return {
    destroy() {
      letGo();
      watcher.kill();
      window.clearTimeout(holdTimer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("lumin:releaseGates", navRelease);
    },
  };
}
