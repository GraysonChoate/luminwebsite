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
  section, anchors, onCatch, onRelease, wantsMore, softMs = 0, holdMs = 1600,
}: {
  section: HTMLElement;
  /** anchor positions in section-progress space (0..1), ascending */
  anchors: number[];
  onCatch: (i: number) => void;
  onRelease: () => void;
  /** Fresh scroll intent — how much travel the visitor has asked for. When
   *  supplied, a beat holds until the minimum time has passed AND this goes
   *  positive, so nothing moves unless the visitor moves it. Without it the
   *  beat simply times out. */
  wantsMore?: () => number;
  /** Ease to the anchor over this long instead of jumping to it. 0 is a hard
   *  snap, which is right in the journey where the frame is already the scene.
   *  The white void wants the gentler version — the copy is still travelling
   *  toward the lens, and a jump reads as a jolt. */
  softMs?: number;
  /** how long the anchor is held before it releases itself */
  holdMs?: number;
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
  let holdTimer: number | undefined;
  let softTween: gsap.core.Tween | null = null;

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
    lenis?.stop();
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    if (softMs > 0) {
      // glide to the anchor instead of jumping to it
      const from = { y: window.scrollY };
      softTween?.kill();
      softTween = gsap.to(from, {
        y: pinnedTo, duration: softMs / 1000, ease: "power2.out",
        onUpdate: () => { getLenis()?.stop(); window.scrollTo(0, Math.round(from.y)); ScrollTrigger.update(); },
        onComplete: () => { window.addEventListener("scroll", hold); },
      });
    } else {
      lenis?.scrollTo(pinnedTo, { immediate: true, force: true });
      window.scrollTo(0, pinnedTo);
      ScrollTrigger.update();
      window.addEventListener("scroll", hold);
    }
    window.clearTimeout(holdTimer);
    if (wantsMore) {
      // MINIMUM hold, then wait to be asked. Releasing on a bare timer meant
      // the film carried on by itself and shoved the page forward whether the
      // visitor was scrolling or not — which reads as sporadic. Now a beat sits
      // there indefinitely until fresh scroll intent arrives.
      const readyAt = performance.now() + softMs + holdMs;
      const poll = () => {
        if (held !== i) return;
        if (performance.now() >= readyAt && wantsMore() > 0) { letGo(); return; }
        holdTimer = window.setTimeout(poll, 80);
      };
      holdTimer = window.setTimeout(poll, softMs + holdMs);
    } else {
      holdTimer = window.setTimeout(letGo, softMs + holdMs);
    }
    onCatch(i);
  }

  function letGo() {
    if (held < 0) return;
    softTween?.kill();
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
    // Step the crossing marker just past this anchor so it cannot re-fire.
    // There used to be a 108px auto-scroll here as well — that was the page
    // shoving itself along on release, and it is gone. Movement now comes only
    // from the visitor.
    last = (pinnedTo - section.offsetTop) / span() + 0.001;
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

  /** A NAV JUMP CROSSES EVERY ANCHOR AT ONCE — and must catch none of them.
   *  `lumin:releaseGates` only lets go of the beat being held right now. The
   *  jump that follows travels the whole section in a single scrollTo, which
   *  the crossing test reads as "you have just arrived at Loops", so it
   *  snapped back and pinned there: every jump past the gym landed on the
   *  first product instead of its destination (measured y=408, wanted 6309).
   *  Retiring the anchors is the honest fix — the visitor has explicitly said
   *  they are going somewhere else. */
  const navJump = () => {
    letGo();
    for (let i = 0; i < anchors.length; i++) done.add(i);
    last = 1;
  };

  window.addEventListener("keydown", onKey);
  window.addEventListener("lumin:releaseGates", navRelease);
  window.addEventListener("lumin:jumpTo", navJump);

  return {
    destroy() {
      letGo();
      watcher.kill();
      softTween?.kill();
      window.clearTimeout(holdTimer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("lumin:releaseGates", navRelease);
      window.removeEventListener("lumin:jumpTo", navJump);
    },
  };
}
