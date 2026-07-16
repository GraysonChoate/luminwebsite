// DOM layer: hover tooltip, suite/product panels, breadcrumb, debug controls.
import { useEffect, useRef, useState } from "react";
import { useEcosystemState } from "../../hooks/useEcosystemState";
import { HUBS, SUITES, SPECTRUM_COLORS, type EcoSettings } from "../../data/lumin-ecosystem";

function entityFor(id: string | null) {
  if (!id) return null;
  const suite = SUITES.find((s) => s.id === id);
  if (suite)
    return {
      kind: "suite" as const,
      label: suite.label,
      spectrum: suite.accent,
      description: suite.description,
      tagline: suite.tagline,
      suite: suite.id,
      learnMoreUrl: suite.learnMoreUrl,
    };
  const hub = HUBS.find((h) => h.id === id);
  if (hub)
    return {
      kind: "hub" as const,
      label: hub.label,
      spectrum: hub.spectrum,
      description: hub.description,
      tagline: SUITES.find((s) => s.id === hub.suite)?.label ?? "",
      suite: hub.suite,
      learnMoreUrl: hub.learnMoreUrl,
    };
  return null;
}

/** Placeholder loop per suite — swap for real product loops later. */
function loopSrcFor(suiteId: string): string {
  return suiteId === "suite-one" ? "/assets/loops/loop-one.mp4" : "/assets/loops/loop-pro.mp4";
}

/** Video-loop slot: shown only for hub entities at suite/product focus level. */
function VideoLoopSlot({ suiteId, accent }: { suiteId: string; accent: string }) {
  return (
    <div
      className="mt-2 overflow-hidden rounded-lg border"
      style={{ borderColor: `${accent}33`, aspectRatio: "16 / 9" }}
    >
      <video
        src={loopSrcFor(suiteId)}
        autoPlay
        loop
        muted
        playsInline
        className="h-full w-full object-cover"
        aria-hidden="true"
      />
    </div>
  );
}

export function HoverTooltip() {
  const hoveredId = useEcosystemState((s) => s.hoveredId);
  const focusLevel = useEcosystemState((s) => s.focusLevel);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const ent = entityFor(hoveredId);
  if (!ent) return null;
  const accent = SPECTRUM_COLORS[ent.spectrum];
  // Video-loop slot only for hub hovers at suite/product focus level.
  const showLoop = ent.kind === "hub" && (focusLevel === "suite" || focusLevel === "product");

  // Viewport-edge clamping. The tooltip renders translated -100% vertically
  // (its bottom sits at `top`), so estimate its box and clamp both axes —
  // with the 16:9 video slot the box can be ~190px tall and clip off-screen
  // near the right/bottom edges without this.
  const width = showLoop ? 240 : 220;
  const estH = showLoop ? 40 + (width - 24) * (9 / 16) + 18 : 40;
  const margin = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
  let left = pos.x + 14;
  if (left + width + margin > vw) left = pos.x - 14 - width; // flip to left side
  left = Math.max(margin, Math.min(left, vw - width - margin));
  let top = pos.y - 10;
  if (top - estH < margin) top = pos.y + 10 + estH; // flip below the cursor
  top = Math.min(top, vh - margin);

  return (
    <div
      ref={boxRef}
      className="pointer-events-none fixed z-40 -translate-y-full rounded-md border px-3 py-1.5"
      style={{
        left,
        top,
        background: "rgba(12, 14, 24, 0.82)",
        borderColor: `${accent}55`,
        backdropFilter: "blur(8px)",
        width: showLoop ? width : undefined,
        maxWidth: width,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
        />
        <span
          className="text-[13px] font-semibold tracking-wide text-white"
          style={{ fontFamily: "var(--font-heebo, Heebo), system-ui, sans-serif" }}
        >
          {ent.label}
        </span>
        {ent.kind === "hub" && (
          <span className="text-[10px] uppercase tracking-widest text-white/40">{ent.tagline}</span>
        )}
      </div>
      {showLoop && <VideoLoopSlot suiteId={ent.suite} accent={accent} />}
    </div>
  );
}

export function FocusPanel() {
  const focusedSuite = useEcosystemState((s) => s.focusedSuite);
  const focusedHub = useEcosystemState((s) => s.focusedHub);
  const focusLevel = useEcosystemState((s) => s.focusLevel);
  const back = useEcosystemState((s) => s.back);
  const focusSuite = useEcosystemState((s) => s.focusSuite);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back]);

  const activeId = focusedHub ?? focusedSuite;
  const ent = entityFor(activeId);
  if (!ent || focusLevel === "ecosystem") return null;
  const accent = SPECTRUM_COLORS[ent.spectrum];

  return (
    <aside
      className="fixed right-6 top-1/2 z-40 w-[340px] -translate-y-1/2 rounded-2xl border p-6"
      style={{
        background: "rgba(10, 12, 22, 0.88)",
        borderColor: `${accent}44`,
        backdropFilter: "blur(14px)",
        boxShadow: `0 0 60px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
      role="dialog"
      aria-label={`${ent.label} details`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
        />
        <span
          className="text-[11px] uppercase tracking-[0.18em] text-white/50"
          style={{ fontFamily: "var(--font-montserrat, Montserrat), system-ui, sans-serif" }}
        >
          {ent.kind === "suite" ? "Suite" : "Product"}
        </span>
      </div>
      <h2
        className="text-xl font-bold uppercase tracking-wide text-white"
        style={{ fontFamily: "var(--font-heebo, Heebo), system-ui, sans-serif" }}
      >
        {ent.label}
      </h2>
      {ent.kind === "hub" && (
        <p
          className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-white/40"
          style={{ fontFamily: "var(--font-montserrat, Montserrat), system-ui, sans-serif" }}
        >
          {ent.tagline}
        </p>
      )}
      {ent.kind === "hub" && focusLevel === "product" && (
        <VideoLoopSlot suiteId={ent.suite} accent={accent} />
      )}
      <p
        className="mt-3 text-sm leading-relaxed text-white/70"
        style={{ fontFamily: "var(--font-montserrat, Montserrat), system-ui, sans-serif" }}
      >
        {ent.description}
      </p>
      <div className="mt-5 flex items-center justify-between">
        {ent.learnMoreUrl ? (
          <a
            href={ent.learnMoreUrl}
            className="rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-white transition-transform hover:scale-[1.03]"
            style={{ background: `linear-gradient(-45deg, #5270FF, #863399)` }}
          >
            Learn more
          </a>
        ) : (
          <span />
        )}
        <button
          onClick={() => focusSuite(null)}
          className="rounded-full border border-white/15 px-3 py-2 text-[12px] text-white/60 transition-colors hover:border-white/40 hover:text-white"
          aria-label="Back to ecosystem"
        >
          Back to ecosystem
        </button>
      </div>
    </aside>
  );
}

export function Breadcrumb() {
  const focusLevel = useEcosystemState((s) => s.focusLevel);
  const focusedSuite = useEcosystemState((s) => s.focusedSuite);
  const focusedHub = useEcosystemState((s) => s.focusedHub);
  const focusSuite = useEcosystemState((s) => s.focusSuite);
  const back = useEcosystemState((s) => s.back);

  if (focusLevel === "ecosystem") return null;
  const suite = SUITES.find((s) => s.id === focusedSuite);
  const hub = HUBS.find((h) => h.id === focusedHub);

  return (
    <nav
      className="fixed left-1/2 top-6 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2 backdrop-blur"
      style={{ fontFamily: "var(--font-montserrat, Montserrat), system-ui, sans-serif" }}
    >
      <button
        onClick={() => focusSuite(null)}
        className="text-[11px] uppercase tracking-[0.18em] text-white/50 transition-colors hover:text-white"
      >
        Ecosystem
      </button>
      {suite && (
        <>
          <span className="text-white/25">/</span>
          <button
            onClick={() => (focusLevel === "product" ? back() : undefined)}
            className={`text-[11px] uppercase tracking-[0.18em] transition-colors ${focusLevel === "suite" ? "text-white" : "text-white/50 hover:text-white"}`}
          >
            {suite.label}
          </button>
        </>
      )}
      {hub && (
        <>
          <span className="text-white/25">/</span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-white">{hub.label}</span>
        </>
      )}
    </nav>
  );
}

export function EcosystemDebug({
  settings,
  onChange,
}: {
  settings: EcoSettings;
  onChange: (s: EcoSettings) => void;
}) {
  const [open, setOpen] = useState(true);
  const row = (label: string, key: keyof EcoSettings, min: number, max: number, step: number) => (
    <label className="flex items-center justify-between gap-3 text-[11px] text-white/70">
      <span className="w-24">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={settings[key]}
        onChange={(e) => onChange({ ...settings, [key]: parseFloat(e.target.value) })}
        className="flex-1"
      />
      <span className="w-10 text-right tabular-nums">{settings[key]}</span>
    </label>
  );
  return (
    <div className="fixed bottom-4 left-4 z-50 w-[300px] rounded-xl border border-white/10 bg-black/80 p-4 backdrop-blur">
      <button
        className="mb-2 text-[11px] uppercase tracking-widest text-white/50"
        onClick={() => setOpen(!open)}
      >
        Debug {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="space-y-2">
          {row("Loop (s)", "loopDuration", 4, 20, 0.5)}
          {row("Bloom", "bloomIntensity", 0, 3, 0.05)}
          {row("Camera Z", "cameraZ", 8, 24, 0.5)}
          {row("Particles", "particleCount", 0, 800, 20)}
          {row("Line opacity", "lineOpacity", 0.1, 1, 0.05)}
        </div>
      )}
    </div>
  );
}










