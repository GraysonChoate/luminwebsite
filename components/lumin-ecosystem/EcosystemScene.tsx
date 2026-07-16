// EcosystemScene: WebGL canvas root — one platform, two suites.
import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { HUBS, SUITES, DEFAULT_SETTINGS, type EcoSettings } from "../../data/lumin-ecosystem";
import { useEcosystemState } from "../../hooks/useEcosystemState";
import { LuminNucleus } from "./LuminNucleus";
import { HubNode, SuiteZone } from "./Nodes";
import { ConnectionSystem } from "./Connections";
import { InfinityFlow } from "./InfinityFlow";
import { HolographicAtmosphere } from "./HolographicAtmosphere";
import { OrbitalBodies } from "./OrbitalBodies";
import { UnfoldGroup } from "./UnfoldGroup";
import { EcosystemCamera } from "./EcosystemCamera";
import { HoverDrift } from "./HoverDrift";
import { FocusPanel, Breadcrumb, EcosystemDebug } from "./DomLayer";
import { SuiteTitles } from "./SuiteTitles";
import { HubLabels } from "./HubLabels";
import { HoloPreview } from "./HoloPreview";
import { SuiteHoverTracker, useSuiteClickZone } from "./SuiteHoverTracker";
import {
  startEntrance,
  entranceStarted,
  subscribeUnfold,
  unfoldStage,
} from "./Entrance";
import {
  ecoConfig,
  subscribeEcoConfig,
  ecoConfigVersion,
} from "./EcosystemConfig";

export default function EcosystemScene() {
  const focusHub = useEcosystemState((s) => s.focusHub);
  const setHovered = useEcosystemState((s) => s.setHovered);
  const focusLevel = useEcosystemState((s) => s.focusLevel);
  const back = useEcosystemState((s) => s.back);
  const [settings, setSettings] = useState<EcoSettings>(DEFAULT_SETTINGS);
  // Read synchronously so canvas-creation props (preserveDrawingBuffer) see it.
  const [debug, setDebug] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug"),
  );
  const [paused, setPaused] = useState(false);
  // One-time first-view invitation cue (timestamp when it started, or null).
  const [invitationAt, setInvitationAt] = useState<number | null>(null);
  const invitedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Unfold stage drives interactivity gating + UI copy (0 collapsed, 1
  // unfolding, 2 expanded). Subscribed via the Entrance module's listener bus.
  const stage = useSyncExternalStore(subscribeUnfold, unfoldStage, () => 0 as const);
  // Live tuning config (bloom + container opacity are React-bound; the rest
  // is read per-frame inside the scene components).
  useSyncExternalStore(subscribeEcoConfig, ecoConfigVersion, () => 0);

  // Screen-space suite click zone (paired with SuiteHoverTracker).
  useSuiteClickZone();

  // Camera distance: config dial is the baseline; the debug slider applies a
  // relative offset on top so both tuning paths keep working.
  const cameraZ = ecoConfig.cameraZ + (settings.cameraZ - DEFAULT_SETTINGS.cameraZ);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).has("debug"));
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Entrance choreography: starts the first time the container is meaningfully
  // in view (immediately on full-viewport routes; on scroll when embedded).
  // Runs on every mount — an entrance is part of the scene, not a one-time cue.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (entranceStarted()) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            startEntrance();
            io.disconnect();
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // First-touch invitation: the contour sweep now waits for the UNFOLD —
  // it fires once, a beat after the ecosystem finishes expanding.
  // Session-scoped: never repeats on later visits within the session.
  useEffect(() => {
    if (stage !== 2 || invitedRef.current) return;
    if (sessionStorage.getItem("lumin-eco-invited")) {
      invitedRef.current = true;
      return;
    }
    invitedRef.current = true;
    sessionStorage.setItem("lumin-eco-invited", "1");
    const id = window.setTimeout(() => setInvitationAt(performance.now()), 450);
    return () => window.clearTimeout(id);
  }, [stage]);

  return (
    <div
      ref={containerRef}
      className="relative h-dvh w-full overflow-hidden"
      style={{ background: "#0a0a10", opacity: ecoConfig.containerOpacity }}
    >
      <Canvas
        frameloop={paused ? "never" : "always"}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, cameraZ], fov: ecoConfig.cameraFov }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: debug }}
        onPointerMissed={() => {
          if (focusLevel !== "ecosystem") back();
        }}
      >
        <color attach="background" args={["#0a0a10"]} />
        <fog attach="fog" args={["#0a0a10", 16, 30]} />

        <EcosystemCamera cameraZ={cameraZ} />
        <HoverDrift cameraZ={cameraZ} />

        {/* Bloom/UI separation via LUMINANCE, not a selection pass: the bloom
            threshold is 0.45, and the logo + icon badges are authored to peak
            BELOW it (tone-mapped, sub-threshold whites), so they physically
            cannot bloom while the glow layers (additive, >threshold) bloom
            freely. A SelectiveBloom/Selection refactor crashed the page in
            production — this achieves the same separation deterministically.
            (DOM text lives outside the canvas and is untouched by design.) */}
        <LuminNucleus />
        {/* COLLAPSED CORE → FULL ECOSYSTEM: every structural layer lives in
            the UnfoldGroup (a global radial transform around the nucleus).
            Collapsed = same objects at compact scale, drifting slowly.
            Clicking the core releases the compression outward. */}
        <UnfoldGroup>
          {SUITES.map((suite) => (
            <SuiteZone key={suite.id} suite={suite} />
          ))}
          {HUBS.map((hub) => (
            <HubNode key={hub.id} hub={hub} onHover={setHovered} onSelect={focusHub} />
          ))}
          {/* One circuit: the figure-8 spine carries the gradient and the
              traffic; branches tap off it. (The old separate LoopCircuit ran a
              second, competing closed path — retired.) */}
          <ConnectionSystem lineOpacity={settings.lineOpacity} invitationAt={invitationAt} />
          <InfinityFlow />
          <SuiteTitles />
          <HubLabels />
          <HoloPreview />
          <HolographicAtmosphere count={settings.particleCount} />
          <OrbitalBodies />
        </UnfoldGroup>

        <EffectComposer>
          <Bloom
            intensity={ecoConfig.bloomIntensity * (settings.bloomIntensity / DEFAULT_SETTINGS.bloomIntensity)}
            luminanceThreshold={ecoConfig.bloomThreshold}
            luminanceSmoothing={ecoConfig.bloomSmoothing}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.18} darkness={0.78} />
        </EffectComposer>
      </Canvas>

      {/* DOM interaction layer. HoverTooltip retired — hover preview is now
          the in-scene HoloPreview projection anchored to the orb. */}
      <SuiteHoverTracker />
      <FocusPanel />
      <Breadcrumb />
      {debug && <EcosystemDebug settings={settings} onChange={setSettings} />}

      {/* Minimal chrome */}
      <div className="pointer-events-none fixed left-6 top-6 z-30 flex items-center gap-3">
        <img src="/assets/lumin-icon.png" alt="Lumin" className="h-7 w-7 opacity-90" />
        <span
          className="text-[13px] font-semibold lowercase tracking-wide text-white/85"
          style={{ fontFamily: "var(--font-heebo, Heebo), system-ui, sans-serif" }}
        >
          lumin ecosystem
        </span>
      </div>
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2 text-center">
        <p
          className="eco-hint-breathe text-[11px] uppercase tracking-[0.22em] text-white/60"
          style={{ fontFamily: "var(--font-montserrat, Montserrat), system-ui, sans-serif" }}
        >
          {stage === 0
            ? "Click the core to open the ecosystem"
            : stage === 1
              ? ""
              : focusLevel === "ecosystem"
                ? "Click the icon to exit"
                : focusLevel === "suite"
                  ? "Click a product to focus · Esc to return"
                  : "Esc to return to the suite"}
        </p>
      </div>
    </div>
  );
}



















































