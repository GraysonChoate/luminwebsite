// SuiteReveal — the suite's name materializes at top-center, reading as if
// the nucleus is casting the words above it.
//
// Trigger rules (owner spec):
//  * The reveal TRIGGER is isolated to the suite (hemisphere) hover — hub /
//    product-orb hovers never start a new materialization.
//  * Once shown, the title PERSISTS while the pointer moves across that
//    suite's own hubs (no re-materializing flicker), bridged by a short
//    grace window across momentary hover gaps between hit-targets.
//  * When a suite is focused (camera inside it), the name still forms
//    top-center — particles rise up from beneath the title (the nucleus
//    casting the words), independent of where the camera has moved.
import { useEffect, useRef, useState } from "react";
import { useEcosystemState, suiteOf } from "../../hooks/useEcosystemState";
import { SUITES, HUBS, SPECTRUM_COLORS, DEFAULT_SETTINGS, type SuiteDef } from "../../data/lumin-ecosystem";

const TRAVEL_MS = 1050;
const CLEAR_GRACE_MS = 160;

interface RisingParticle {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  size: number;
  delay: number;
  curve: number;
  color: string;
}

/** Project a world position to screen px using the idle camera setup. */
function projectToScreen(
  p: [number, number, number],
  w: number,
  h: number,
): { x: number; y: number } {
  const camZ = DEFAULT_SETTINGS.cameraZ;
  const fov = (38 * Math.PI) / 180;
  const dist = camZ - p[2];
  const halfH = Math.tan(fov / 2) * dist;
  const halfW = halfH * (w / h);
  return {
    x: w / 2 + (p[0] / halfW) * (w / 2),
    y: h / 2 - (p[1] / halfH) * (h / 2),
  };
}

export function SuiteReveal() {
  const hoveredId = useEcosystemState((s) => s.hoveredId);
  const focusLevel = useEcosystemState((s) => s.focusLevel);
  const focusedSuite = useEcosystemState((s) => s.focusedSuite);

  const [shown, setShown] = useState<SuiteDef | null>(null);
  const shownRef = useRef<SuiteDef | null>(null);
  const clearTimer = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const partsRef = useRef<RisingParticle[]>([]);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  // ---- particle pass ------------------------------------------------------
  const runParticles = (suite: SuiteDef, origin: "hubs" | "cast") => {
    if (reduced.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const textX = W / 2;
    const textY = 56 + 52;

    let seed = suite.id === "suite-one" ? 11 : 23;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const parts: RisingParticle[] = [];
    if (origin === "hubs") {
      // ecosystem-level reveal: light travels up from the hemisphere's hubs
      const hubs = HUBS.filter((h) => h.suite === suite.id);
      for (const hub of hubs) {
        const s = projectToScreen(hub.position, W, H);
        const n = 3 + Math.floor(rnd() * 2);
        for (let i = 0; i < n; i++) {
          parts.push({
            sx: s.x + (rnd() * 2 - 1) * 26,
            sy: s.y + (rnd() * 2 - 1) * 26,
            tx: textX + (rnd() * 2 - 1) * 130,
            ty: textY + (rnd() * 2 - 1) * 12,
            size: 0.9 + rnd() * 1.7,
            delay: rnd() * 0.3,
            curve: (rnd() * 2 - 1) * 70,
            color: SPECTRUM_COLORS[hub.spectrum],
          });
        }
      }
    } else {
      // suite-focused reveal: the nucleus casts the words — particles rise
      // from a compact zone beneath the title, screen-centered, regardless
      // of where the camera has traveled.
      const accent = SPECTRUM_COLORS[suite.accent];
      for (let i = 0; i < 16; i++) {
        parts.push({
          sx: textX + (rnd() * 2 - 1) * 90,
          sy: textY + 90 + rnd() * 130,
          tx: textX + (rnd() * 2 - 1) * 130,
          ty: textY + (rnd() * 2 - 1) * 10,
          size: 0.9 + rnd() * 1.6,
          delay: rnd() * 0.25,
          curve: (rnd() * 2 - 1) * 26,
          color: rnd() > 0.4 ? accent : "#ffffff",
        });
      }
    }
    partsRef.current = parts;
    startRef.current = performance.now();

    cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const t = Math.min((now - startRef.current) / TRAVEL_MS, 1);
      ctx.clearRect(0, 0, W, H);
      if (t >= 1) return;
      for (const p of partsRef.current) {
        const local = Math.max(0, Math.min((t - p.delay) / (1 - p.delay), 1));
        if (local <= 0) continue;
        const e = 1 - Math.pow(1 - local, 3);
        const mx = (p.sx + p.tx) / 2 + p.curve;
        const my = Math.min(p.sy, p.ty) - 60;
        const u = 1 - e;
        const x = u * u * p.sx + 2 * u * e * mx + e * e * p.tx;
        const y = u * u * p.sy + 2 * u * e * my + e * e * p.ty;
        const alpha =
          local < 0.15 ? local / 0.15 : local < 0.65 ? 1 : 1 - (local - 0.65) / 0.35;
        ctx.globalAlpha = Math.max(alpha * 0.9, 0);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const clearCanvas = () => {
    cancelAnimationFrame(rafRef.current);
    const c = canvasRef.current;
    if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
  };

  // ---- trigger resolution -------------------------------------------------
  useEffect(() => {
    const current = shownRef.current?.id ?? null;
    const directSuite =
      hoveredId && SUITES.some((s) => s.id === hoveredId) ? hoveredId : null;
    const hubSuite = hoveredId ? suiteOf(hoveredId) : null;

    let desired: string | null = null;
    let origin: "hubs" | "cast" = "hubs";
    if (focusedSuite) {
      desired = focusedSuite;
      origin = "cast";
    } else if (focusLevel === "ecosystem") {
      if (directSuite) {
        desired = directSuite; // ONLY the suite zone triggers a new reveal
      } else if (hubSuite && hubSuite === current) {
        desired = current; // persist over the shown suite's own hubs
      }
    }

    if (desired) {
      window.clearTimeout(clearTimer.current);
      if (desired !== current) {
        const s = SUITES.find((x) => x.id === desired)!;
        shownRef.current = s;
        setShown(s);
        runParticles(s, origin);
      }
    } else if (current) {
      // grace window bridges the momentary null between hit-targets so the
      // title doesn't flicker/re-materialize while crossing product orbs
      window.clearTimeout(clearTimer.current);
      clearTimer.current = window.setTimeout(() => {
        shownRef.current = null;
        setShown(null);
        clearCanvas();
      }, CLEAR_GRACE_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredId, focusedSuite, focusLevel]);

  useEffect(() => () => {
    window.clearTimeout(clearTimer.current);
    cancelAnimationFrame(rafRef.current);
  }, []);

  if (!shown) return null;
  const accent = SPECTRUM_COLORS[shown.accent];

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-30 h-full w-full"
        aria-hidden="true"
      />
      <div className="pointer-events-none fixed left-1/2 top-14 z-30 -translate-x-1/2">
        <div className="relative text-center">
          <p
            className="suite-reveal-title text-[30px] font-black uppercase tracking-[0.08em] text-white"
            style={{
              fontFamily: "var(--font-heebo, Heebo), system-ui, sans-serif",
              textShadow: `0 0 24px ${accent}88, 0 0 60px ${accent}44`,
              animation: "suiteRevealIn 1.05s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          >
            {shown.label}
          </p>
          <p
            className="mt-0.5 text-[11px] uppercase tracking-[0.28em] text-white/45"
            style={{
              fontFamily: "var(--font-montserrat, Montserrat), system-ui, sans-serif",
              animation: "suiteRevealIn 1.05s 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          >
            {shown.tagline}
          </p>
        </div>
        <style>{`
          @keyframes suiteRevealIn {
            0% { opacity: 0; transform: translateY(18px) scale(0.985); filter: blur(10px); }
            55% { opacity: 0.85; filter: blur(2.5px); }
            100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .suite-reveal-title, .suite-reveal-title + p { animation: none !important; }
          }
        `}</style>
      </div>
    </>
  );
}

