// HoloPreview — lightweight hover preview: a thin beam of light extends from
// the hovered orb to a small holographic screen that materializes beside it
// (short loop + ultra-short summary). Opens like a digital projection —
// anchored in 3D space via drei <Html>, NOT a cursor-chasing tooltip and NOT
// a modal. Hover never changes global layout.
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import type { Line2 } from "three-stdlib";
import * as THREE from "three";
import { HUBS, SPECTRUM_COLORS, type HubDef } from "../../data/lumin-ecosystem";
import { useEcosystemState } from "../../hooks/useEcosystemState";
import { approach } from "./Entrance";

function loopSrcFor(suiteId: string): string {
  return suiteId === "suite-one" ? "/assets/loops/loop-one.mp4" : "/assets/loops/loop-pro.mp4";
}

/** Ultra-short summary: first sentence after the Placeholder marker. */
function summaryFor(hub: HubDef): string {
  const text = hub.description.replace(/^Placeholder\.\s*/, "");
  const stop = text.indexOf(":");
  const cut = stop > 12 && stop < 70 ? text.slice(0, stop) : text.split(". ")[0];
  return cut.replace(/\.$/, "");
}

export function HoloPreview() {
  const hoveredId = useEcosystemState((s) => s.hoveredId);
  const mode = useEcosystemState((s) => s.mode);
  // keep the last hub briefly so the projection can collapse instead of pop
  const [shown, setShown] = useState<HubDef | null>(null);
  const [closing, setClosing] = useState(false);
  const beamRef = useRef<Line2 | null>(null);
  const closeTimer = useRef<number | null>(null);

  const hub = useMemo(() => HUBS.find((h) => h.id === hoveredId) ?? null, [hoveredId]);

  useEffect(() => {
    if (hub) {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      setShown(hub);
      setClosing(false);
    } else if (shown) {
      setClosing(true);
      closeTimer.current = window.setTimeout(() => {
        setShown(null);
        setClosing(false);
      }, 240);
    }
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hub]);

  // beam + anchor geometry (recomputed only when the shown hub changes)
  const geo = useMemo(() => {
    if (!shown) return null;
    const p = new THREE.Vector3(...shown.position);
    const outward = Math.sign(p.x) || 1; // project away from the nucleus
    const r = shown.scale * 0.45 * 2.4;
    const start = p.clone().add(new THREE.Vector3(outward * r * 0.5, r * 0.62, 0.05));
    const anchor = p.clone().add(new THREE.Vector3(outward * 1.05, 1.18, 0.35));
    const mid = start.clone().lerp(anchor, 0.5).add(new THREE.Vector3(0, 0.08, 0.05));
    return {
      accent: SPECTRUM_COLORS[shown.spectrum],
      points: [start.toArray(), mid.toArray(), anchor.toArray()] as [number, number, number][],
      anchor: anchor.toArray() as [number, number, number],
    };
  }, [shown]);

  useFrame(() => {
    if (!beamRef.current) return;
    const m = beamRef.current.material;
    const target = shown && !closing && mode !== "transitioning" ? 0.6 : 0;
    m.opacity = approach(m.opacity, target, 0.16);
  });

  if (!shown || !geo) return null;

  return (
    <group>
      <Line
        ref={(l) => {
          beamRef.current = l as unknown as Line2;
        }}
        points={geo.points}
        color={geo.accent}
        lineWidth={1.1}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
      <Html position={geo.anchor} center zIndexRange={[30, 20]} style={{ pointerEvents: "none" }}>
        <div
          className={closing ? "holo-panel holo-out" : "holo-panel holo-in"}
          style={{
            width: 218,
            background: "rgba(9, 11, 22, 0.72)",
            border: `1px solid ${geo.accent}66`,
            borderRadius: 6,
            padding: "8px 10px 10px",
            backdropFilter: "blur(6px)",
            boxShadow: `0 0 24px ${geo.accent}22, inset 0 0 18px ${geo.accent}11`,
            transformOrigin: "0% 100%",
          }}
        >
          <style>{`
            @keyframes holoIn {
              0% { opacity: 0; transform: scaleY(0.05) scaleX(0.6); filter: brightness(2.4); }
              45% { opacity: 1; transform: scaleY(1.04) scaleX(0.99); filter: brightness(1.5); }
              100% { opacity: 1; transform: scaleY(1) scaleX(1); filter: brightness(1); }
            }
            @keyframes holoOut {
              0% { opacity: 1; transform: scaleY(1); }
              100% { opacity: 0; transform: scaleY(0.08); filter: brightness(2); }
            }
            @keyframes holoScan {
              0% { transform: translateY(-110%); }
              100% { transform: translateY(1100%); }
            }
            .holo-in { animation: holoIn 0.34s cubic-bezier(0.2, 0.9, 0.25, 1) both; }
            .holo-out { animation: holoOut 0.22s ease-in both; }
            .holo-panel { position: relative; overflow: hidden; }
            .holo-panel::after {
              content: ""; position: absolute; left: 0; right: 0; top: 0; height: 10%;
              background: linear-gradient(rgba(255,255,255,0.10), transparent);
              animation: holoScan 3.2s linear infinite; pointer-events: none;
            }
          `}</style>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 99,
                background: geo.accent,
                boxShadow: `0 0 7px ${geo.accent}`,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-heebo, Heebo), system-ui, sans-serif",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: "#fff",
                textTransform: "uppercase",
              }}
            >
              {shown.label}
            </span>
          </div>
          <div
            style={{
              aspectRatio: "16 / 9",
              borderRadius: 4,
              overflow: "hidden",
              border: `1px solid ${geo.accent}33`,
            }}
          >
            <video
              src={loopSrcFor(shown.suite)}
              autoPlay
              loop
              muted
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              aria-hidden="true"
            />
          </div>
          <p
            style={{
              margin: "7px 0 0",
              fontFamily: "var(--font-montserrat, Montserrat), system-ui, sans-serif",
              fontSize: 10.5,
              lineHeight: 1.45,
              letterSpacing: "0.02em",
              color: "rgba(255,255,255,0.62)",
            }}
          >
            {summaryFor(shown)}
          </p>
        </div>
      </Html>
    </group>
  );
}


