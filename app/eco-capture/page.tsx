"use client";

// TEMPORARY CAPTURE ROUTE (real-GPU source of truth).
// Open on real Chrome. It renders the live ecosystem at the collapsed MATCH_POSE,
// measures the projected bounds in-page, and downloads a clean 1920×1080 PNG.
// The scene needs a readable backbuffer, so this route forces ?debug
// (preserveDrawingBuffer) and hides the debug panel. Delete after matched.

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { MATCH_POSE } from "@/lib/ecosystem-pose";

const EcosystemScene = dynamic(
  () => import("@/components/lumin-ecosystem/EcosystemScene"),
  { ssr: false, loading: () => null }
);

type Bounds = { cx: number; cy: number; w: number; h: number };
type Report = {
  frame: [number, number];
  sphere: Bounds | null;
  core: Bounds | null;
  cameraZ: number;
  cameraFov: number;
} | null;

const OUT_W = 1920;
const OUT_H = 1080;

export default function EcoCapture() {
  const [ready, setReady] = useState(false);
  const [overlay, setOverlay] = useState(0.4);
  const [report, setReport] = useState<Report>(null);
  const [note, setNote] = useState("");

  // force ?debug (readable backbuffer) — the scene checks window.location.search
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("debug")) {
      window.location.replace(window.location.pathname + "?debug");
    }
  }, []);

  // apply pose + mount formed once the config API is live; hide debug panel
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).luminEcosystem;
      if (api) {
        api.configure(MATCH_POSE);
        import("@/components/lumin-ecosystem/Entrance").then((e) => e.startFormed());
        setReady(true);
      } else {
        t = setTimeout(tick, 120);
      }
    };
    tick();
    return () => clearTimeout(t);
  }, []);

  // draw the live canvas into an offscreen 2D canvas (cover-fit to 1920×1080)
  const grab = useCallback((): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null => {
    const src = document.querySelector("canvas");
    if (!src) return null;
    const out = document.createElement("canvas");
    out.width = OUT_W;
    out.height = OUT_H;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    const s = Math.max(OUT_W / src.width, OUT_H / src.height); // cover
    const w = src.width * s;
    const h = src.height * s;
    try {
      ctx.drawImage(src, (OUT_W - w) / 2, (OUT_H - h) / 2, w, h);
    } catch {
      return null;
    }
    return { canvas: out, ctx };
  }, []);

  const measure = useCallback(() => {
    const g = grab();
    if (!g) {
      setNote("Canvas not readable yet — wait for the sphere to render, or reload with ?debug.");
      return;
    }
    let data: Uint8ClampedArray;
    try {
      data = g.ctx.getImageData(0, 0, OUT_W, OUT_H).data;
    } catch {
      setNote("Backbuffer blank (needs ?debug for preserveDrawingBuffer).");
      return;
    }
    const bbox = (thresh: number): Bounds | null => {
      let minx = OUT_W, miny = OUT_H, maxx = 0, maxy = 0, hit = false;
      for (let y = 0; y < OUT_H; y += 2) {
        for (let x = 0; x < OUT_W; x += 2) {
          const i = (y * OUT_W + x) * 4;
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum > thresh) {
            hit = true;
            if (x < minx) minx = x;
            if (x > maxx) maxx = x;
            if (y < miny) miny = y;
            if (y > maxy) maxy = y;
          }
        }
      }
      if (!hit) return null;
      return { cx: Math.round((minx + maxx) / 2), cy: Math.round((miny + maxy) / 2), w: maxx - minx, h: maxy - miny };
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfg = (window as any).luminEcosystem?.get?.() ?? {};
    setReport({
      frame: [OUT_W, OUT_H],
      sphere: bbox(26), // faint wireframe shell above near-black bg
      core: bbox(210), // bright central logo disc
      cameraZ: cfg.cameraZ ?? 0,
      cameraFov: cfg.cameraFov ?? 0,
    });
    setNote("");
  }, [grab]);

  const download = useCallback(() => {
    const g = grab();
    if (!g) {
      setNote("Canvas not readable — reload with ?debug and wait for the sphere.");
      return;
    }
    let url: string;
    try {
      url = g.canvas.toDataURL("image/png");
    } catch {
      setNote("toDataURL blocked — needs ?debug (preserveDrawingBuffer).");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = "live-collapsed-1920x1080.png";
    a.click();
  }, [grab]);

  const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(1)}%`;

  return (
    <main className="relative h-dvh w-full overflow-hidden" style={{ background: "#050508" }}>
      <div className="absolute inset-0">
        <EcosystemScene />
      </div>

      {/* video target overlay for eyeball comparison */}
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

      {/* hide the scene's debug panel (?debug turns it on) */}
      <style>{`#platform, [class*="EcosystemDebug"] {}`}</style>

      <div
        className="absolute right-4 top-4 z-50 w-[300px] rounded-xl border border-white/10 bg-black/85 p-4 text-white backdrop-blur"
        style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}
      >
        <div className="mb-2 font-bold">capture {ready ? "" : <span className="text-white/40">(loading…)</span>}</div>
        <label className="block text-[11px]">
          video overlay — {overlay.toFixed(2)}
          <input type="range" min={0} max={1} step={0.05} value={overlay} onChange={(e) => setOverlay(+e.target.value)} className="w-full accent-[#5270ff]" />
        </label>
        <div className="mt-3 flex gap-2">
          <button onClick={measure} className="flex-1 rounded bg-white/15 px-2 py-1.5 text-[11px]">measure</button>
          <button onClick={download} className="flex-1 rounded bg-[#5270ff] px-2 py-1.5 text-[11px] font-semibold">download PNG</button>
        </div>
        {note && <div className="mt-2 text-[10px] leading-tight text-[#ffb020]">{note}</div>}
        {report && (
          <div className="mt-3 space-y-1 text-[10px] leading-snug text-white/80">
            <div>frame {report.frame[0]}×{report.frame[1]}</div>
            {report.sphere && (
              <div>
                sphere — center ({report.sphere.cx}, {report.sphere.cy}) {pct(report.sphere.cx, OUT_W)},{pct(report.sphere.cy, OUT_H)}
                <br />size {report.sphere.w}×{report.sphere.h}px ({pct(report.sphere.w, OUT_W)}w)
              </div>
            )}
            {report.core && (
              <div>core — center ({report.core.cx}, {report.core.cy}) · Ø {report.core.w}px ({pct(report.core.w, OUT_W)}w)</div>
            )}
            <div>cameraZ {report.cameraZ} · fov {report.cameraFov}°</div>
          </div>
        )}
        <div className="mt-3 text-[9px] leading-tight text-white/35">
          Maximize a 16:9 window before capturing. Send me the PNG + these numbers.
        </div>
      </div>
    </main>
  );
}
