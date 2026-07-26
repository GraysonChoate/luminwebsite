"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLenis } from "@/components/SmoothScroll";
import FrameScrubber from "@/components/ui/FrameScrubber";

/**
 * The Launchpad CTA — the terminal state. Scroll's lifecycle ENDS here.
 *
 * ── WHY IT IS FIXED, NOT A SECTION ───────────────────────────────────────
 * The white void is the last scrollable thing on the site. When it arrives it
 * fires `lumin:voidArrived`, this layer takes over as a fixed full-viewport
 * state, and Lenis is DESTROYED rather than paused — there is nothing left to
 * scroll to. That makes the CTA a one-way door, which is why the nav pill must
 * stay live: it is the only exit, and a trap with no exit is when people close
 * the tab.
 *
 * ── THE POWER-UP IS SCRUBBED BY THE FORM, NOT PLAYED ─────────────────────
 * One 241-frame clip carries the entire interaction. Completion count drives
 * the scrub — field 1 → 1/6, field 6 → 6/6 — and it EASES between stops, so
 * each answer surges the gate forward instead of snapping it. Same
 * FrameScrubber that runs the hero, the ecosystem and the void, pointed at
 * form state instead of scroll position. One generation, six states.
 *
 * The scrub only ever ADVANCES. Clearing a field does not drain the gate:
 * reversing on a backspace feels punishing and looks like a glitch. Charge is
 * earned and kept.
 *
 * ── GEOMETRY LOCK IS LOAD-BEARING ────────────────────────────────────────
 * The inputs are real DOM sitting on the rendered glass panel. That panel was
 * verified pixel-identical across every frame of both the idle and the
 * power-up (left 172, right 575 of 960) — if it drifted, the inputs would
 * slide off it. Do not replace those clips with anything that moves.
 *
 * ── AFTER SUBMIT, NOTHING IS INTERACTIVE ─────────────────────────────────
 * discharge → bridge → launch play as authored video, back to back, ~31s.
 * The visitor is a passenger. It resolves into orbit, where Omeed's welcome
 * film and the scheduler live in the empty left/centre of frame — the
 * storyboard reserved that space deliberately (beat 18: "Earth occupies only
 * the bottom-right portion").
 */

const PU_FRAMES = 241;
const puUrls = Array.from(
  { length: PU_FRAMES },
  (_, i) => `/frames/powerup/f_${String(i + 1).padStart(3, "0")}.webp`,
);

/* ── PANEL GEOMETRY, measured off the render ──────────────────────────────
   The glass panel and its rows are BAKED into the idle and power-up clips at
   1920x1080 source coordinates. The clips display with object-fit:cover, so
   where those rows land on screen depends on the viewport's aspect — which
   means the inputs cannot be positioned in vw/%. They have to be mapped
   through the same cover transform the browser applies to the video.
   Row 1 centre y=303, pitch 102.5, rows start x=362, usable width 578. */
const SRC_W = 1920, SRC_H = 1080;

/** Row rects in SOURCE pixels, measured off the render frame by frame. There is
 *  no pitch formula — the panel sits in perspective, so rows get taller and
 *  further apart toward the bottom (heights 54 → 64). Five rows, because the
 *  power-up clip lights exactly five before it lights the button. */
const ROWS = [
  { cy: 303, h: 54 },
  { cy: 400, h: 56 },
  { cy: 500, h: 61 },
  { cy: 628, h: 64 },
  { cy: 718, h: 64 },
];
const BTN = { cy: 894, h: 72 };
const ROW_X = 362, ROW_W = 578;

/** map a source-space rect to screen, matching object-fit: cover */
function coverRect(vw: number, vh: number, sx: number, sy: number, sw: number, sh: number) {
  const scale = Math.max(vw / SRC_W, vh / SRC_H);
  const ox = (vw - SRC_W * scale) / 2;
  const oy = (vh - SRC_H * scale) / 2;
  return { left: ox + sx * scale, top: oy + sy * scale, width: sw * scale, height: sh * scale };
}

type Field = { id: string; label: string; type: string; placeholder: string };

/** Six fields. Copy is provisional — the questions and options were never
 *  written, so these are the agreed field names and nothing more. */
const FIELDS: Field[] = [
  { id: "name",     label: "Name",              type: "text",  placeholder: "" },
  { id: "email",    label: "Work email",        type: "email", placeholder: "" },
  { id: "company",  label: "Company",           type: "text",  placeholder: "" },
  { id: "biztype",  label: "Business type",     type: "text",  placeholder: "" },
  { id: "priority", label: "Biggest priority",  type: "text",  placeholder: "" },
];

const HEADLINE = "Build the operation you've always wanted.";
const SUB = [
  "Run smarter. Grow stronger. Give members every reason to stay.",
  "Tell us where you are today. We'll map the way forward.",
];

type Phase = "hidden" | "idle" | "launching" | "orbit";

export default function LaunchpadCTA() {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [values, setValues] = useState<Record<string, string>>({});
  const puProgress = useRef(0);          // 0..1 across the power-up strip
  const targetRef = useRef(0);
  const rafRef = useRef(0);

  const idleARef = useRef<HTMLVideoElement>(null);
  const idleBRef = useRef<HTMLVideoElement>(null);
  const filmRef = useRef<HTMLVideoElement>(null);

  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    on(); window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const filled = FIELDS.filter((f) => (values[f.id] ?? "").trim().length > 0).length;
  const charged = filled === FIELDS.length;

  /* ── take over when the void arrives ─────────────────────────────────── */
  useEffect(() => {
    const onArrive = () => {
      setPhase((p) => (p === "hidden" ? "idle" : p));
      // scroll's lifecycle is over — destroy it, don't just stop it
      const lenis = getLenis();
      lenis?.stop();
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    };
    window.addEventListener("lumin:voidArrived", onArrive);
    return () => window.removeEventListener("lumin:voidArrived", onArrive);
  }, []);

  /* ── form completion drives the scrub, easing between stops ──────────── */
  useEffect(() => {
    // only ever advance; charge is earned and kept
    targetRef.current = Math.max(targetRef.current, filled / FIELDS.length);
    const tick = () => {
      const d = targetRef.current - puProgress.current;
      if (Math.abs(d) > 0.0005) {
        puProgress.current += d * 0.075;        // ~0.8s surge per stop
        rafRef.current = requestAnimationFrame(tick);
      } else {
        puProgress.current = targetRef.current;
      }
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [filled]);

  /* ── idle double-buffer: only the incoming copy fades, so brightness
        never dips at the loop point (ported from the hub idle) ─────────── */
  useEffect(() => {
    if (phase !== "idle") return;
    const a = idleARef.current, b = idleBRef.current;
    if (!a || !b) return;
    const FADE = 0.6;
    let front = a, back = b, armed = false, raf = 0;
    a.play().catch(() => {});
    const tick = () => {
      const d = front.duration;
      if (d && !front.paused && front.currentTime >= d - FADE && !armed) {
        armed = true;
        back.style.zIndex = "2"; front.style.zIndex = "1";
        back.style.transition = "none"; back.style.opacity = "0";
        back.currentTime = 0; back.play().catch(() => {});
        requestAnimationFrame(() => {
          back.style.transition = `opacity ${FADE}s linear`;
          back.style.opacity = "1";
        });
        window.setTimeout(() => {
          front.pause(); front.style.transition = "none"; front.style.opacity = "0";
          const t = front; front = back; back = t; armed = false;
        }, FADE * 1000);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const submit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!charged) return;
    setPhase("launching");
  }, [charged]);

  if (phase === "hidden") return null;

  return (
    <div className="fixed inset-0 z-40" aria-label="Launch your operation">
      {/* ── the world ─────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <>
          {/* idle loop, double-buffered */}
          <div className="pointer-events-none absolute inset-0 z-0">
            {[idleARef, idleBRef].map((r, i) => (
              <video
                key={i}
                ref={r}
                muted playsInline preload="auto"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ opacity: i === 0 ? 1 : 0 }}
              >
                <source src="/void/cta/APPROVED-idle-5s.mp4" type="video/mp4" />
              </video>
            ))}
          </div>
          {/* the power-up, scrubbed by how much of the form is done. sits over
              the idle and fades in as soon as anything is filled. */}
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{ opacity: filled > 0 ? 1 : 0, transition: "opacity 0.5s ease" }}
          >
            <FrameScrubber
              progressRef={puProgress}
              frameCount={PU_FRAMES}
              frameUrls={puUrls}
              fit="cover"
              background="#eef3f8"
            />
          </div>
        </>
      )}

      {(phase === "launching" || phase === "orbit") && (
        <video
          ref={filmRef}
          autoPlay muted playsInline
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          onEnded={() => setPhase("orbit")}
        >
          <source src="/void/cta/APPROVED-LAUNCH-21s.mp4" type="video/mp4" />
        </video>
      )}

      {/* ── the form. Positioned by the SAME cover transform the video uses,
             so each input sits exactly on its baked row at any viewport. ── */}
      {phase === "idle" && vp.w > 0 && (
        <form onSubmit={submit} className="absolute inset-0 z-20">
          {FIELDS.map((f, i) => {
            const row = ROWS[i];
            const r = coverRect(vp.w, vp.h, ROW_X, row.cy - row.h / 2, ROW_W, row.h);
            const done = (values[f.id] ?? "").trim().length > 0;
            return (
              <div key={f.id} className="absolute" style={{ left: r.left, top: r.top, width: r.width, height: r.height }}>
                <span
                  className="type-eyebrow absolute -translate-y-full text-[9px]"
                  style={{ top: -4, left: 2, color: done ? "rgba(255,255,255,0.8)" : "rgba(33,33,33,0.5)" }}
                >
                  {f.label}
                </span>
                <input
                  type={f.type}
                  value={values[f.id] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                  className="h-full w-full bg-transparent px-4 outline-none"
                  style={{
                    // white on the saturated fills; Cosmos would vanish on them
                    color: done ? "#fff" : "var(--c-cosmos)",
                    fontSize: Math.max(12, r.height * 0.38),
                    caretColor: done ? "#fff" : "var(--c-supernova)",
                  }}
                  autoComplete="off"
                />
              </div>
            );
          })}
          {(() => {
            const r = coverRect(vp.w, vp.h, ROW_X, BTN.cy - BTN.h / 2, ROW_W, BTN.h);
            return (
              <button
                type="submit"
                disabled={!charged}
                className="absolute type-eyebrow rounded-[10px] transition-all"
                style={{
                  left: r.left, top: r.top, width: r.width, height: r.height,
                  background: charged ? "var(--c-supernova)" : "transparent",
                  color: charged ? "#fff" : "rgba(33,33,33,0.45)",
                  cursor: charged ? "pointer" : "not-allowed",
                  boxShadow: charged ? "0 0 34px rgba(82,112,255,0.6)" : "none",
                }}
              >
                {charged ? "LAUNCH" : `${filled} / ${FIELDS.length}`}
              </button>
            );
          })()}
        </form>
      )}

      {/* ── the copy. right-side negative space, stays until submit ────── */}
      {phase === "idle" && (
        <div className="pointer-events-none absolute right-[6vw] top-[16%] z-10 w-[min(34vw,520px)] text-right">
          <h2 className="type-statement" style={{ color: "var(--c-cosmos)" }}>{HEADLINE}</h2>
          {SUB.map((s) => (
            <p key={s} className="type-step mt-4" style={{ color: "#4a4a52" }}>{s}</p>
          ))}
        </div>
      )}

      {/* ── orbit: the welcome film and the scheduler live in the empty
             left/centre that beat 18 reserved for them ────────────────── */}
      {phase === "orbit" && (
        <div className="absolute inset-y-0 left-0 z-20 flex w-[58vw] items-center justify-center">
          <div className="w-[min(46vw,680px)]">
            <div
              className="mb-6 flex aspect-video items-center justify-center rounded-[22px] border"
              style={{
                borderColor: "rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(3px)",
              }}
            >
              <span className="type-eyebrow text-white/45">welcome film</span>
            </div>
            <div
              className="flex h-[120px] items-center justify-center rounded-[18px] border"
              style={{ borderColor: "rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.05)" }}
            >
              <span className="type-eyebrow text-white/45">schedule a call</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
