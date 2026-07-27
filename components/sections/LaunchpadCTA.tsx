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
 * One 31s file: discharge → bridge → launch, pre-joined at build time rather
 * than chained across three <video> elements. Chaining would put a decode gap
 * at each handoff and the seams here are 3-5%, which a gap would expose.
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

/* ── WHICH POWER-UP CLIP IS BAKED IN ──────────────────────────────────────
   The MULTI-COLOUR one: APPROVED-powerup-10s.mp4, 241 frames at 24fps. The
   white 8s take was tried and reverted.

   It carries one known flaw. 2D-aligning the panel region puts this clip about
   6px BELOW the idle loop it plays over, so the panel shifts very slightly the
   moment you start typing. The white take did not have that. It is a property
   of the render, not of the code — fixing it properly means regenerating the
   clip, so the row coordinates below are aligned to THIS clip and the shift is
   accepted for now.

   It lights five of the six baked rows; the sixth stays dark, which is why the
   form is five fields.

   ── PANEL GEOMETRY, measured off the render ──────────────────────────────
   The glass panel and its rows are BAKED into the idle and power-up clips at
   1920x1080 source coordinates. The clips display with object-fit:cover, so
   where those rows land on screen depends on the viewport's aspect — which
   means the inputs cannot be positioned in vw/%. They have to be mapped
   through the same cover transform the browser applies to the video.
   Every row carries its OWN x and width. A single shared x/width shipped once
   and put the button 100px past the panel's right edge: rows 1-3 live inside a
   nested card and are inset, rows 4-6 sit on the outer panel, and the panel is
   in perspective on top of that. The numbers below were read off frame 001 of
   the power-up strip (clean outlines, before any glow bleeds over the edges) —
   measure on a lit frame and the glow adds 100+px of phantom width. */
const SRC_W = 1920, SRC_H = 1080;
/** the idle clip's panel sits 6 source px above the power-up's; measured */
const IDLE_NUDGE_Y = 6;

/** Row rects in SOURCE pixels. No pitch formula and no shared column: the
 *  inner card holds rows 1-3 (x=360 w=449), the outer panel holds rows 4-5
 *  (x=334 w=507), and heights grow 59 → 67 down the perspective.
 *  FIVE rows — the same five the power-up clip lights before it lights the
 *  button. The render also bakes a sixth box at {x:334, w:507, cy:803, h:68};
 *  it is deliberately unused and never lights, so leave it alone. */
const ROWS = [
  { x: 360, w: 449, cy: 300, h: 59 },
  { x: 360, w: 449, cy: 398, h: 59 },
  { x: 360, w: 449, cy: 495, h: 59 },
  { x: 334, w: 507, cy: 626, h: 68 },
  { x: 334, w: 507, cy: 714, h: 67 },
];
const BTN = { x: 330, w: 511, cy: 889, h: 71 };

/** Where the scrub PARKS after each answer — not `filled / 5`.
 *  This clip lights rows at 0.050, 0.237, 0.438, 0.637 and 0.787, which is not
 *  an even fifth. Parking on even fifths put stop 4 at 0.80, past onset 5 at
 *  0.787, so the fourth answer lit two rows at once — the "the orange one
 *  activates early" defect. Each stop parks past its own row's onset and short
 *  of the next; the last runs to 1.0 to charge the button, which also makes the
 *  final surge the biggest of the five. */
const STOPS = [0, 0.14, 0.34, 0.54, 0.71, 1.0];

/** map a source-space rect to screen, matching object-fit: cover */
function coverRect(vw: number, vh: number, sx: number, sy: number, sw: number, sh: number) {
  const scale = Math.max(vw / SRC_W, vh / SRC_H);
  const ox = (vw - SRC_W * scale) / 2;
  const oy = (vh - SRC_H * scale) / 2;
  return { left: ox + sx * scale, top: oy + sy * scale, width: sw * scale, height: sh * scale };
}

/** A plausible address, not a spec-perfect one — the point is to catch "X" and
 *  "me@" before they charge the gate, not to police valid TLDs. */
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Field = {
  id: string; label: string; type: "text" | "email" | "choice";
  /** choice fields only */
  options?: string[];
  /** choice fields only — more than one answer allowed */
  multi?: boolean;
};

/** Five fields. The last two are pickers rather than free text: nobody types a
 *  useful answer to "what is your biggest goal", and a fixed set is worth more
 *  to sales than a text box full of one-word answers.
 *  Both carry an opt-out as the final option, per the earlier note that the
 *  harder questions need "something like 'I don't know'". Options are a first
 *  pass and expected to change. */
const FIELDS: Field[] = [
  { id: "name",     label: "Name",         type: "text"  },
  { id: "email",    label: "Work email",   type: "email" },
  { id: "company",  label: "Company",      type: "text"  },
  {
    id: "biztype", label: "What do you do?", type: "choice",
    options: [
      "I run a gym",
      "I lead group fitness",
      "I'm a personal trainer",
      "I work in rehab",
      "I manage properties",
      "Something else",
    ],
  },
  {
    id: "goals", label: "Biggest goals — pick any", type: "choice", multi: true,
    options: [
      "Keep members longer",
      "Grow membership",
      "Raise coaching quality",
      "Free up staff time",
      "Grow revenue per member",
      "Not sure yet",
    ],
  },
];

const HEADLINE = "Build the operation you've always wanted.";
const SUB = [
  "Run smarter. Grow stronger. Give members every reason to stay.",
  "Tell us where you are today. We'll map the way forward.",
];

type Phase = "hidden" | "idle" | "launching" | "orbit";

export default function LaunchpadCTA() {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [values, setValues] = useState<Record<string, string[]>>({});
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  /** Text answers only count once they are COMMITTED with Enter.
   *  Without this the panel lit a row on the first keystroke — you typed one
   *  letter and the gate rewarded you, which made the power-up feel automatic
   *  instead of earned. A picker commits the moment you choose. */
  const [committed, setCommitted] = useState<Record<string, boolean>>({});
  const puProgress = useRef(0);          // 0..1 across the power-up strip
  const targetRef = useRef(0);
  const rafRef = useRef(0);

  const idleARef = useRef<HTMLVideoElement>(null);
  const idleBRef = useRef<HTMLVideoElement>(null);
  const filmRef = useRef<HTMLVideoElement>(null);

  const [vp, setVp] = useState({ w: 0, h: 0 });
  /** the idle nudge in SCREEN px — the cover scale, so it holds at any size */
  const idleShift = vp.w > 0 ? IDLE_NUDGE_Y * Math.max(vp.w / SRC_W, vp.h / SRC_H) : 0;
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    on(); window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const filled = FIELDS.filter(
    (f) => (values[f.id] ?? []).some((v) => v.trim()) && (f.type === "choice" || committed[f.id]),
  ).length;
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
    targetRef.current = Math.max(targetRef.current, STOPS[filled] ?? 1);
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
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{ transform: `translateY(${idleShift}px)` }}
          >
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
          <source src="/void/cta/APPROVED-POSTSUBMIT-31s.mp4" type="video/mp4" />
        </video>
      )}

      {/* ── the form. Positioned by the SAME cover transform the video uses,
             so each input sits exactly on its baked row at any viewport. ── */}
      {/* noValidate on purpose. The browser's own constraint validation silently
          REFUSED to submit when the email did not parse — the button read
          LAUNCH, the click landed, and nothing happened, with no message. Even
          requestSubmit() was a no-op. We validate on commit instead, so a bad
          address never charges the gate in the first place. */}
      {phase === "idle" && vp.w > 0 && (
        <form onSubmit={submit} noValidate className="absolute inset-0 z-20">
          {FIELDS.map((f, i) => {
            const row = ROWS[i];
            const r = coverRect(vp.w, vp.h, row.x, row.cy - row.h / 2, row.w, row.h);
            const picked = values[f.id] ?? [];
            const hasText = picked.some((v) => v.trim());
            const done = hasText && (f.type === "choice" || committed[f.id]);
            const ink = Math.max(12, r.height * 0.38);
            return (
              <div key={f.id} className="absolute" style={{ left: r.left, top: r.top, width: r.width, height: r.height }}>
                <span
                  className="type-eyebrow absolute -translate-y-full text-[9px]"
                  style={{ top: -4, left: 2, color: done ? "rgba(255,255,255,0.85)" : "rgba(33,33,33,0.48)" }}
                >
                  {f.label}
                  {hasText && !done && f.type === "email" && !EMAIL_OK.test(picked[0] ?? "") && (
                    <span style={{ marginLeft: 8, color: "var(--c-flare, #FF004B)" }}>
                      needs a full address
                    </span>
                  )}
                  {hasText && !done && f.type !== "choice"
                    && !(f.type === "email" && !EMAIL_OK.test(picked[0] ?? "")) && (
                    <span style={{ marginLeft: 8, opacity: 0.55 }}>press enter</span>
                  )}
                </span>

                {f.type === "choice" ? (
                  <>
                    {/* The row itself is the trigger. The options CANNOT live
                        inside it — the baked box is one 67px line tall — so they
                        open as a sheet anchored to the row. */}
                    <button
                      type="button"
                      onClick={() => setOpenPicker((o) => (o === f.id ? null : f.id))}
                      className="flex h-full w-full items-center justify-between bg-transparent px-4 text-left outline-none"
                      style={{ color: done ? "#fff" : "var(--c-cosmos)", fontSize: ink }}
                    >
                      <span className="truncate">
                        {done ? picked.join(", ") : ""}
                      </span>
                      <span
                        className="ml-3 shrink-0 transition-transform"
                        style={{
                          fontSize: ink * 0.55, opacity: 0.5,
                          transform: openPicker === f.id ? "rotate(180deg)" : "none",
                        }}
                      >
                        ▾
                      </span>
                    </button>

                    {openPicker === f.id && (
                      <div
                        className="absolute left-0 z-30 overflow-hidden rounded-[12px]"
                        style={{
                          top: r.height + 8, width: r.width,
                          background: "rgba(255,255,255,0.90)",
                          backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
                          border: "1px solid rgba(33,33,33,0.10)",
                          boxShadow: "0 18px 50px rgba(20,30,60,0.20)",
                        }}
                      >
                        {f.options!.map((opt) => {
                          const on = picked.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setValues((v) => {
                                  const cur = v[f.id] ?? [];
                                  if (!f.multi) return { ...v, [f.id]: [opt] };
                                  // the opt-out is exclusive: picking it clears
                                  // the rest, picking anything else clears it
                                  const last = f.options![f.options!.length - 1];
                                  if (opt === last) return { ...v, [f.id]: cur.includes(opt) ? [] : [opt] };
                                  const next = cur.filter((c) => c !== last);
                                  return {
                                    ...v,
                                    [f.id]: next.includes(opt) ? next.filter((c) => c !== opt) : [...next, opt],
                                  };
                                });
                                if (!f.multi) setOpenPicker(null);
                              }}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                              style={{
                                fontSize: Math.max(12, ink * 0.82),
                                color: "var(--c-cosmos)",
                                background: on ? "rgba(82,112,255,0.12)" : "transparent",
                              }}
                            >
                              <span
                                className="grid h-[15px] w-[15px] shrink-0 place-items-center rounded-[4px]"
                                style={{
                                  border: on ? "none" : "1.5px solid rgba(33,33,33,0.28)",
                                  background: on ? "var(--c-supernova)" : "transparent",
                                  color: "#fff", fontSize: 10, lineHeight: 1,
                                }}
                              >
                                {on ? "✓" : ""}
                              </span>
                              {opt}
                            </button>
                          );
                        })}
                        {f.multi && (
                          <button
                            type="button"
                            onClick={() => setOpenPicker(null)}
                            className="type-eyebrow w-full py-3 text-[10px]"
                            style={{ color: "#fff", background: "var(--c-supernova)" }}
                          >
                            done
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                <input
                  type={f.type}
                  value={picked[0] ?? ""}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [f.id]: [e.target.value] }));
                    setCommitted((c) => (c[f.id] ? { ...c, [f.id]: false } : c));
                  }}
                  onFocus={() => setOpenPicker(null)}
                  onBlur={() => {
                    const v = (values[f.id]?.[0] ?? "").trim();
                    if (v && (f.type !== "email" || EMAIL_OK.test(v))) {
                      setCommitted((c) => ({ ...c, [f.id]: true }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();          // Enter commits, it does not submit
                    const v = (values[f.id]?.[0] ?? "").trim();
                    if (!v) return;
                    if (f.type === "email" && !EMAIL_OK.test(v)) return;  // stays uncommitted
                    setCommitted((c) => ({ ...c, [f.id]: true }));
                    const form = e.currentTarget.form;
                    const fields = form ? Array.from(form.querySelectorAll<HTMLElement>("input, button[type=button]")) : [];
                    const at = fields.indexOf(e.currentTarget);
                    fields[at + 1]?.focus();      // straight on to the next answer
                  }}
                  className="h-full w-full bg-transparent px-4 outline-none"
                  style={{
                    // White once the row is lit — these fills are saturated
                    // blue/teal/purple/orange, and Cosmos disappears on them.
                    // (With the white clip this had to be the other way round:
                    // white ink measured ~1.05:1 on a 248-luminance row.)
                    color: done ? "#fff" : "var(--c-cosmos)",
                    fontSize: ink,
                    caretColor: done ? "#fff" : "var(--c-supernova)",
                  }}
                  autoComplete="off"
                />
                )}
              </div>
            );
          })}
          {(() => {
            const r = coverRect(vp.w, vp.h, BTN.x, BTN.cy - BTN.h / 2, BTN.w, BTN.h);
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

      {/* ── orbit ─────────────────────────────────────────────────────────
             Two different jobs, so two different anchors. The welcome film
             holds the empty left that beat 18 reserved for it. The scheduler
             goes TOP RIGHT, in the band of clean sky above Earth's limb —
             Earth only ever occupies the bottom-right, so that corner is free,
             and the booking step earns the strongest position on screen. */}
      {phase === "orbit" && (
        <>
          <div className="absolute inset-y-0 left-0 z-20 flex w-[52vw] items-center justify-center">
            <div
              className="flex aspect-video w-[min(44vw,660px)] items-center justify-center rounded-[22px] border"
              style={{
                borderColor: "rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(3px)",
              }}
            >
              <span className="type-eyebrow text-white/45">welcome film</span>
            </div>
          </div>
          <div className="absolute right-[5vw] top-[14vh] z-20 w-[min(30vw,430px)]">
            <div
              className="flex h-[132px] items-center justify-center rounded-[18px] border"
              style={{
                borderColor: "rgba(255,255,255,0.26)",
                background: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(3px)",
              }}
            >
              <span className="type-eyebrow text-white/55">schedule a call</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
