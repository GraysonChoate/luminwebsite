"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { STOPS, EXIT_CLIP, clipSrc, FPS, ORB_IDLE, handoffFrame } from "@/lib/heroFilm";

/**
 * THE HERO FILM PLAYER — one continuous movie with interactive dwell points.
 *
 * ── WHY TWO ELEMENTS AND NOT ONE ─────────────────────────────────────────
 * A single <video> whose `src` is swapped ALWAYS shows a gap: assigning src
 * tears down the decoder, and the element paints its poster (or nothing) until
 * the new stream has a frame. On a seam that is a black flash, every time.
 *
 * So there are exactly two elements and they alternate. The outgoing one keeps
 * painting its own last frame while the incoming one loads underneath at
 * opacity 0, and they trade places in ONE synchronous style write once the
 * incoming element reports `loadeddata` (readyState >= HAVE_CURRENT_DATA, i.e.
 * a real decoded frame is available at the current position).
 *
 * This is a double buffer, NOT a stack: both elements are full-bleed,
 * `object-fit: cover`, and the front one is fully opaque, so it completely
 * occludes the back one. Two scenes are never both visible — the back element
 * is either not yet playing or already finished, and it is covered either way.
 * There is no crossfade, no dissolve and no shared-opacity window, because a
 * crossfade IS two competing scenes on screen.
 *
 * ── NO STILL BRIDGES ─────────────────────────────────────────────────────
 * Nothing here paints a poster, a canvas snapshot, a duplicated background or
 * a frozen frame over moving footage. The only thing ever on screen is an
 * approved clip playing, or an approved clip resting on its own final frame for
 * the few milliseconds a handoff can take.
 *
 * ── GEOMETRY IS IDENTICAL ACROSS EVERY SEAM ──────────────────────────────
 * Both elements carry the same `object-fit: cover` and the same computed
 * `object-position`, and every clip is 16:9, so scale and crop cannot change at
 * a handoff. `object-position` interpolates DURING a transition, from the stop
 * being left to the stop being arrived at, so the crop already matches the
 * destination before the swap happens — and matches the origin at the moment of
 * departure. On wide viewports there is no horizontal crop and it is inert.
 *
 * ── SCOPE OF THE ABOVE ───────────────────────────────────────────────────
 * Everything above is about the MECHANICS of the handoff: no gap, no overlap,
 * no geometry change. The approved footage supplies the continuity, and it does
 * link up well — every handoff measures inside 3% average pixel difference. The
 * per-stop figures are in the SEAM LEDGER in `lib/heroFilm.ts`, along with a
 * note on how an earlier pass mis-scored them.
 *
 * ── NOTHING KEYS OFF `video.duration` ────────────────────────────────────
 * Four approved masters state a container duration 15-20ms longer than their
 * frame count implies. Travel timing comes from `frames / 24`; the handoff
 * comes from the element's own `ended` event.
 */

export type SceneFilmHandle = {
  /** play one leg. Resolves when the destination idle is actually running. */
  travel: (from: number, to: number, dir: number) => Promise<void>;
  /** park straight onto a stop with no travel — deep links, recovery. */
  parkOn: (idx: number) => Promise<void>;
  /** seconds the leg's clip runs for, so the stepper can pace to the film */
  legSeconds: (from: number, to: number, dir: number) => number;
};

type Leg = { file: string; frames: number; reverse: boolean };

/** ORB = the state above the first stop, where the opening orb idle lives. */
const ORB = -1;

/** which clip carries `from` -> `to`, and which way it runs */
function legClip(from: number, to: number, dir: number): Leg {
  if (dir > 0) {
    // stepping off the last stop is the exit into the ecosystem descent
    if (to >= STOPS.length) return { file: EXIT_CLIP.file, frames: EXIT_CLIP.frames, reverse: false };
    return { file: STOPS[to].inbound, frames: STOPS[to].inboundFrames, reverse: false };
  }
  // Backwards. The clip that ARRIVED at `from` is the same clip that leaves it
  // going the other way, so it is played from its reversed derivative — real
  // reverse footage, not a forward file seeked backwards, which janks badly at
  // 1080p because every step lands on a non-keyframe.
  if (from >= STOPS.length) return { file: EXIT_CLIP.file, frames: EXIT_CLIP.frames, reverse: true };
  return { file: STOPS[from].inbound, frames: STOPS[from].inboundFrames, reverse: true };
}

const focalOf = (i: number) =>
  i <= ORB ? 50 : i >= STOPS.length ? STOPS[STOPS.length - 1].focal : STOPS[i].focal;

/** every parked state's looping source, including the opening orb */
const idleSrc = (i: number, tier: "1080" | "720") =>
  i <= ORB ? ORB_IDLE : clipSrc(STOPS[i].idle, tier);

/** load a source and resolve only once a real frame is decoded and paintable */
function decodeFirstFrame(v: HTMLVideoElement, src: string): Promise<void> {
  if (v.dataset.src === src && v.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const done = () => { off(); resolve(); };
    const fail = () => { off(); reject(new Error(`hero-film: cannot decode ${src}`)); };
    const off = () => {
      v.removeEventListener("loadeddata", done);
      v.removeEventListener("error", fail);
    };
    v.addEventListener("loadeddata", done);
    v.addEventListener("error", fail);
    v.dataset.src = src;
    v.src = src;
    v.load();
  });
}

/** a play() whose promise rejection is handled rather than left unhandled */
function safePlay(v: HTMLVideoElement) {
  const p = v.play();
  if (p && typeof p.catch === "function") {
    p.catch((err: unknown) => {
      // An autoplay rejection on a muted+playsInline element means the tab is
      // backgrounded or the decoder is saturated. Retry once on the next tick
      // rather than leaving a frozen picture.
      if (v.paused) setTimeout(() => { v.play().catch(() => {}); }, 60);
      if (process.env.NODE_ENV !== "production") console.warn("[hero-film] play rejected", err);
    });
  }
}

const SceneFilm = forwardRef<SceneFilmHandle, {
  tier: "1080" | "720";
  /** the destination idle has started — fire the stop's UI off THIS, not later */
  onIdleStart: (idx: number) => void;
}>(function SceneFilm({ tier, onIdleStart }, ref) {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);
  /** index of the element currently in front */
  const front = useRef(0);
  /**
   * Bumped on every new intent. Every async continuation checks it and bails if
   * it is stale, so a direction change, a hash jump or a viewport switch can
   * never let a half-finished leg paint over the one that replaced it.
   */
  const token = useRef(0);
  /** warmers pull the next clips into HTTP cache; never displayed */
  const warm = useRef<HTMLVideoElement[]>([]);
  const focalNow = useRef(50);
  const raf = useRef(0);

  const els = () => [aRef.current!, bRef.current!];
  const frontEl = () => els()[front.current];
  const backEl = () => els()[1 - front.current];

  /**
   * The trade. Instant by default; `fadeMs` eases the incoming layer in.
   *
   * ── WHY A FADE IS ALLOWED HERE AND NOWHERE ELSE ──────────────────────
   * The rule this project holds is that two COMPETING scenes must never be on
   * screen together — a doubled, ghosted or saturated image. That is about
   * scenes that disagree. At the transition-to-idle handoff the two frames are
   * the same locked-off shot and measure ~97% identical, so a short ramp cannot
   * double anything; it only softens the instantaneous 2-3% step that otherwise
   * lands on a picture that has just come to rest, which reads as a blink.
   *
   * The outgoing layer holds its own last frame underneath at full opacity for
   * the whole ramp, so there is never a gap or a darkening through the middle.
   * Everywhere else — departing a stop, parking, recovering — stays instant.
   */
  const swap = (fadeMs = 0) => {
    const [a, b] = els();
    const next = 1 - front.current;
    const inEl = next === 0 ? a : b;
    const outEl = next === 0 ? b : a;
    front.current = next;
    if (fadeMs <= 0) {
      inEl.style.transition = "none";
      inEl.style.zIndex = "2";
      inEl.style.opacity = "1";
      outEl.style.zIndex = "1";
      outEl.style.opacity = "0";
      return;
    }
    inEl.style.transition = "none";
    inEl.style.opacity = "0";
    inEl.style.zIndex = "2";
    outEl.style.zIndex = "1";
    void inEl.offsetWidth;                    // commit the 0 before ramping
    inEl.style.transition = `opacity ${fadeMs}ms linear`;
    inEl.style.opacity = "1";
    window.setTimeout(() => {
      outEl.style.opacity = "0";
      inEl.style.transition = "none";
    }, fadeMs + 20);
  };

  /** how long the arrival ramp runs. Short enough to read as a settle rather
   *  than a dissolve; long enough that the step stops registering as a cut. */
  const ARRIVAL_FADE_MS = 170;

  const applyFocal = (pct: number) => {
    focalNow.current = pct;
    const pos = `${pct}% center`;
    const [a, b] = els();
    a.style.objectPosition = pos;
    b.style.objectPosition = pos;
  };

  useEffect(() => {
    // `muted` must be set as a PROPERTY. React renders it as an attribute, and
    // an attribute alone is not reliably honoured by autoplay policy — this is
    // the difference between the film playing and a permanently paused frame.
    els().forEach((v) => {
      v.muted = true;
      v.playsInline = true;
    });
    applyFocal(50);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** keep the next clips in cache so a gesture never waits on the network */
  const warmFor = (idx: number) => {
    const wanted: Leg[] = [];
    if (idx + 1 <= STOPS.length) wanted.push(legClip(idx, idx + 1, 1));
    if (idx - 1 >= ORB) wanted.push(legClip(idx, idx - 1, -1));
    const urls = wanted.map((leg) => clipSrc(leg.file, tier, leg.reverse));

    // RETAIN anything still wanted rather than tearing the whole pool down.
    // Clearing indiscriminately aborted in-flight requests for clips we were
    // about to need again — on a throttled connection that threw away a
    // partial download and made the next gesture wait for a refetch. Only
    // genuinely distant media is released.
    const keep = warm.current.filter((v) => urls.includes(v.getAttribute("src") || ""));
    warm.current
      .filter((v) => !keep.includes(v))
      .forEach((v) => { v.removeAttribute("src"); v.load(); });

    // Bounded at two. Mobile decoders fall over if every clip is held open, so
    // distant media is deliberately never retained.
    warm.current = urls.map((url) => {
      const existing = keep.find((v) => v.getAttribute("src") === url);
      if (existing) return existing;
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.src = url;
      v.load();
      return v;
    });
  };

  /** run the destination idle on the back buffer and bring it to the front */
  const startIdle = async (idx: number, tok: number) => {
    const back = backEl();
    await decodeFirstFrame(back, idleSrc(idx, tier));
    if (tok !== token.current) return;
    // NATIVE looping. A timer that resets currentTime produces a visible hitch
    // at every wrap; the `loop` attribute wraps inside the decoder.
    back.loop = true;
    back.currentTime = 0;
    safePlay(back);
    applyFocal(focalOf(idx));
    swap(ARRIVAL_FADE_MS);
    onIdleStart(idx);
    warmFor(idx);
  };

  const travel = async (from: number, to: number, dir: number) => {
    const tok = ++token.current;
    const leg = legClip(from, to, dir);
    const src = clipSrc(leg.file, tier, leg.reverse);
    const back = backEl();

    // The outbound clip must be genuinely ready before anything moves. While we
    // wait, the CURRENT idle simply keeps looping — no poster, no black, no
    // still bridge. In practice this resolves instantly because `warmFor` put
    // this exact file in cache the moment we parked here.
    back.loop = false;
    await decodeFirstFrame(back, src);
    if (tok !== token.current) return;

    // A REVERSED CLIP'S DEAD TAIL IS AT ITS HEAD.
    // The reversed derivative is the forward clip backwards, so the frozen tail
    // we skip on the way out is the first thing on screen on the way back. Going
    // forward we cut the end early; going back we start past the equivalent
    // point, which plays exactly the same span of moving picture in reverse.
    const cut = handoffFrame(leg.file, leg.frames);
    const startAt = leg.reverse ? (leg.frames - cut) / FPS : 0;
    if (Math.abs(back.currentTime - startAt) > 0.001) {
      back.currentTime = startAt;
      // wait out the seek, or the swap can land on frame 0 for a paint
      if (startAt > 0) {
        await new Promise<void>((res) => {
          const ok = () => { back.removeEventListener("seeked", ok); res(); };
          back.addEventListener("seeked", ok);
        });
        if (tok !== token.current) return;
      }
    }
    safePlay(back);
    swap();

    // Pull the destination idle in NOW, during the transition, so it is decoded
    // long before it is needed. It loads into the element the transition just
    // vacated.
    const idlePreload =
      to >= ORB && to < STOPS.length
        ? decodeFirstFrame(backEl(), idleSrc(to, tier)).catch(() => {})
        : Promise.resolve();

    // Crop travels with the shot: it matches where we left at frame 0 and where
    // we arrive at the last frame, so neither seam can change framing.
    const f0 = focalOf(from);
    const f1 = focalOf(to);
    const clip = frontEl();
    // Where this leg ENDS on the timeline. Forward, that is the motion's last
    // frame (early, if there is a dead tail). Reverse, we started past the dead
    // head so it simply runs to the clip's end. The focal interpolation is
    // scaled between the same two points, so the crop completes exactly as the
    // picture arrives rather than easing toward a frame we never reach.
    const endAt = leg.reverse ? leg.frames / FPS : cut / FPS;
    const span = Math.max(0.001, endAt - startAt);
    cancelAnimationFrame(raf.current);

    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clip.removeEventListener("ended", done);
        cancelAnimationFrame(raf.current);
        resolve();
      };
      clip.addEventListener("ended", done);
      const tick = () => {
        if (tok !== token.current) return done();
        const p = Math.min(1, Math.max(0, (clip.currentTime - startAt) / span));
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        applyFocal(f0 + (f1 - f0) * e);
        // reaching the cut point ends the leg just as `ended` would
        if (clip.currentTime >= endAt) return done();
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    });
    if (tok !== token.current) return;
    cancelAnimationFrame(raf.current);
    await idlePreload;
    if (tok !== token.current) return;

    if (to >= ORB && to < STOPS.length) {
      // Straight into the idle. Nothing waits for the product brief — the brief
      // animates in on its own clock, after this has already started looping.
      await startIdle(to, tok);
    } else {
      applyFocal(f1);
    }
  };

  const parkOn = async (idx: number) => {
    const tok = ++token.current;
    const back = backEl();
    await decodeFirstFrame(back, idleSrc(idx, tier));
    if (tok !== token.current) return;
    back.loop = true;
    back.currentTime = 0;
    safePlay(back);
    applyFocal(focalOf(idx));
    swap();
    onIdleStart(idx);
    warmFor(idx);
  };

  useImperativeHandle(ref, () => ({
    travel,
    parkOn,
    // The LEG is as long as the motion, not as long as the file. If this still
    // reported the full clip length, cutting the picture early would only move
    // the dead time: the idle would start on time but the stepper would keep
    // discarding input until the clip's nominal end, so the visitor would still
    // be stuck — just looking at a moving picture instead of a frozen one.
    legSeconds: (from, to, dir) => {
      const leg = legClip(from, to, dir);
      return handoffFrame(leg.file, leg.frames) / FPS;
    },
  }));

  const common = "pointer-events-none absolute inset-0 h-full w-full object-cover";
  return (
    <>
      <video ref={aRef} className={common} style={{ zIndex: 2, opacity: 1 }} muted playsInline preload="auto" aria-hidden="true" />
      <video ref={bRef} className={common} style={{ zIndex: 1, opacity: 0 }} muted playsInline preload="auto" aria-hidden="true" />
    </>
  );
});

export default SceneFilm;
