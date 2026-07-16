"use client";

// TEMPORARY MATCH-TUNING ROUTE — the live scene with the hero video's final
// frame (f_599) overlaid at adjustable opacity, plus sliders that drive
// EcosystemConfig live. Goal: dial the collapsed sphere until it sits exactly
// on the overlaid video frame, then hit "Copy config" and paste the values
// back so they get frozen into EcosystemBeat. Delete this route once matched.

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const EcosystemScene = dynamic(
  () => import("@/components/lumin-ecosystem/EcosystemScene"),
  { ssr: false, loading: () => null }
);

const FIELDS = [
  { k: "sphereScale", min: 0.5, max: 2, step: 0.02, def: 1 },
  { k: "shellScale", min: 0.5, max: 2, step: 0.02, def: 1 },
  { k: "ringScale", min: 0.5, max: 2, step: 0.02, def: 1 },
  { k: "logoScale", min: 0.5, max: 2, step: 0.02, def: 1 },
  { k: "cameraZ", min: 8, max: 24, step: 0.5, def: 14.5 },
  { k: "cameraFov", min: 24, max: 60, step: 1, def: 38 },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eco = () => (typeof window !== "undefined" ? (window as any).luminEcosystem : undefined);

export default function EcoTest() {
  const [ready, setReady] = useState(false);
  const [vals, setVals] = useState<Record<string, number>>(
    Object.fromEntries(FIELDS.map((f) => [f.k, f.def]))
  );
  const [off, setOffXY] = useState<[number, number]>([0, 0]);
  const [overlay, setOverlay] = useState(0.5);
  const [copied, setCopied] = useState(false);

  // wait for the config API (set when the scene chunk loads), then mount formed
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (eco()) {
        setReady(true);
        import("@/components/lumin-ecosystem/Entrance").then((e) => e.startFormed());
      } else {
        t = setTimeout(tick, 120);
      }
    };
    tick();
    return () => clearTimeout(t);
  }, []);

  const setField = (k: string, v: number) => {
    setVals((s) => ({ ...s, [k]: v }));
    eco()?.configure({ [k]: v });
  };
  const setOff = (x: number, y: number) => {
    setOffXY([x, y]);
    eco()?.configure({ sphereOffset: [x, y, 0] });
  };
  const copy = () => {
    const changed: Record<string, unknown> = {};
    FIELDS.forEach((f) => {
      if (vals[f.k] !== f.def) changed[f.k] = vals[f.k];
    });
    if (off[0] || off[1]) changed.sphereOffset = [off[0], off[1], 0];
    navigator.clipboard?.writeText(JSON.stringify(changed, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const reset = () => {
    eco()?.reset();
    setVals(Object.fromEntries(FIELDS.map((f) => [f.k, f.def])));
    setOffXY([0, 0]);
  };

  const row = "block text-[11px] leading-tight mb-2";
  const rng = "w-full accent-[#5270ff]";

  return (
    <main className="relative h-dvh w-full overflow-hidden" style={{ background: "#050508" }}>
      <div className="absolute inset-0">
        <EcosystemScene />
      </div>

      {/* target: the hero bloom's final frame, contain-fit like the hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url(/frames/journey/desktop/f_599.webp)",
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: overlay,
        }}
      />

      {/* tuner panel */}
      <div
        className="absolute right-4 top-4 z-50 w-64 rounded-xl border border-white/10 bg-black/80 p-4 text-white backdrop-blur"
        style={{ fontFamily: "ui-monospace, monospace" }}
      >
        <div className="mb-3 text-[12px] font-bold">
          match tuner {ready ? "" : <span className="text-white/40">(loading…)</span>}
        </div>
        <label className={row}>
          overlay opacity — {overlay.toFixed(2)}
          <input type="range" min={0} max={1} step={0.05} value={overlay} onChange={(e) => setOverlay(+e.target.value)} className={rng} />
        </label>
        <hr className="my-2 border-white/10" />
        {FIELDS.map((f) => (
          <label key={f.k} className={row}>
            {f.k} — {vals[f.k]}
            <input type="range" min={f.min} max={f.max} step={f.step} value={vals[f.k]} onChange={(e) => setField(f.k, +e.target.value)} className={rng} />
          </label>
        ))}
        <label className={row}>
          offX — {off[0].toFixed(1)}
          <input type="range" min={-4} max={4} step={0.1} value={off[0]} onChange={(e) => setOff(+e.target.value, off[1])} className={rng} />
        </label>
        <label className={row}>
          offY — {off[1].toFixed(1)}
          <input type="range" min={-4} max={4} step={0.1} value={off[1]} onChange={(e) => setOff(off[0], +e.target.value)} className={rng} />
        </label>
        <div className="mt-3 flex gap-2">
          <button onClick={copy} className="flex-1 rounded bg-[#5270ff] px-2 py-1.5 text-[11px] font-semibold">
            {copied ? "copied ✓" : "copy config"}
          </button>
          <button onClick={reset} className="rounded bg-white/15 px-2 py-1.5 text-[11px]">
            reset
          </button>
        </div>
      </div>
    </main>
  );
}
