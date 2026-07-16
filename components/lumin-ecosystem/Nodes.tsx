// Hub nodes with satellites + suite hover membranes.
// Hierarchy via scale; relationship dimming via state store.
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { spectrumColor, glowColor } from "../../lib/spectrum-colors";
import { SPECTRUM_COLORS, type HubDef, type SuiteDef } from "../../data/lumin-ecosystem";
import { useEcosystemState } from "../../hooks/useEcosystemState";
import { useGlowTexture, useCoreTexture, useScrimTexture } from "./LuminNucleus";
import { hubIconTexture } from "./HubIcons";
import { motionProfile, shapedBreath } from "./HubMotion";
import { ecoConfig } from "./EcosystemConfig";
import { approach, entrancePhase, entranceDone, hubEntranceWindow, easeOutBack, unfoldDone, unfold01 } from "./Entrance";
import { unfoldAxes } from "./UnfoldGroup";

const V_TMP = new THREE.Vector3();
const WHITE = new THREE.Color("#ffffff");
const WHITE_MIX = new THREE.Color();

export function HubNode({
  hub,
  onHover,
  onSelect,
}: {
  hub: HubDef;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const glow = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const icon = useRef<THREE.Mesh>(null);
  const root = useRef<THREE.Group>(null);
  const satGroup = useRef<THREE.Group>(null);
  const energyRing = useRef<THREE.Mesh>(null);
  const energyOrbs = useRef<(THREE.Mesh | null)[]>([]);
  const related = useEcosystemState((s) => s.related);
  const mode = useEcosystemState((s) => s.mode);
  const hoveredId = useEcosystemState((s) => s.hoveredId);
  const focusedHub = useEcosystemState((s) => s.focusedHub);
  const focusLevel = useEcosystemState((s) => s.focusLevel);
  const focusedSuite = useEcosystemState((s) => s.focusedSuite);
  const glowTexture = useGlowTexture();
  const coreTexture = useCoreTexture();
  const scrimTexture = useScrimTexture();
  const scrim = useRef<THREE.Mesh>(null);
  const color = spectrumColor(hub.spectrum);
  const emit = glowColor(hub.spectrum); // luminance-normalized — equal glow across all orbs
  const scale = hub.scale * 0.45;
  // Mirror SuiteZone's gating: hubs are interactive at ecosystem level, or
  // when their own suite is the focused one. Hubs of the OTHER, unfocused
  // suite must not respond to hover/click (previously they were fully
  // clickable and could yank focus across hemispheres).
  const interactive = focusLevel === "ecosystem" || hub.suite === focusedSuite;

  const phase = useMemo(() => {
    let h = 0;
    for (let i = 0; i < hub.id.length; i++) h = (h * 31 + hub.id.charCodeAt(i)) % 997;
    return (h / 997) * Math.PI * 2;
  }, [hub.id]);
  const profile = useMemo(() => motionProfile(hub.id), [hub.id]);
  const entWindow = useMemo(() => hubEntranceWindow(hub.position), [hub.position]);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    // COLLAPSED POSE (reference image): hub orbs condense INWARD and sit as
    // smaller glowing color-coded bodies EMBEDDED inside the combined orb —
    // blues left of the icon, magentas right. They travel outward to their
    // locked positions as the unfold releases. Position is solved in WORLD
    // space (compressed → final) then divided by the group's anisotropic
    // axes, so the trajectory stays physically coherent at every u.
    const uNow = unfold01();
    if (root.current) {
      const CONDENSE = 0.34; // compressed world radius factor
      const k = CONDENSE + (1 - CONDENSE) * uNow;
      unfoldAxes(uNow, V_TMP);
      root.current.position.set(
        (hub.position[0] * k) / V_TMP.x,
        (hub.position[1] * k) / V_TMP.y,
        (hub.position[2] * k) / V_TMP.z,
      );
      // smaller embedded bodies while collapsed (~38%), full size expanded
      root.current.scale.setScalar(0.38 + 0.62 * uNow);
    }
    const isActive = hoveredId === hub.id || focusedHub === hub.id;
    const isRelated = related.has(hub.id);
    const dimmed = mode !== "idle" && !isRelated;
    // Entrance: hubs materialize after their spoke reaches them — opacity
    // fades in fast, scale pops with a soft overshoot. entFade/entPop are
    // exactly 1 once the timeline finishes (all math becomes a no-op).
    const entered = entranceDone();
    const entFade = entered ? 1 : entrancePhase(entWindow[0], entWindow[1]);
    const entPop = entered ? 1 : entrancePhase(entWindow[0], entWindow[1], easeOutBack);

    const breatheT = t * 0.8 * profile.breatheSpeed + phase;
    let breathe = 1 + shapedBreath(breatheT, profile.breatheShape) * 0.05 * profile.breatheAmp;
    // slow secondary sway layered under the breath (Fuel, Loops, Connect...)
    if (profile.sway > 0) {
      breathe += Math.sin(t * 0.27 + phase * 1.7) * 0.02 * profile.sway;
    }
    const boost = isActive ? 1.4 : isRelated && mode !== "idle" ? 1.15 : 1;
    const isAlive = focusedHub === hub.id; // clicked open: fully alive
    // tiny high-frequency shimmer for hubs with flicker personality
    const shimmer =
      profile.flicker > 0 ? Math.sin(t * 7.3 + phase * 3.1) * Math.sin(t * 11.7 + phase) * 0.5 + 0.5 : 0;
    if (glow.current) {
      glow.current.scale.setScalar(scale * 4.8 * breathe * boost * entPop);
      const m = glow.current.material as THREE.MeshBasicMaterial;
      // Hover: the orb lights up in its own spectrum color (stronger glow).
      // Click (alive): some white light returns — the glow color lerps
      // partway back toward white so it reads even brighter.
      const flickerAdd = shimmer * 0.06 * profile.flicker;
      // materialization flash: brief over-bright moment as the hub lands
      const entFlash = entFade > 0 && entFade < 1 ? 1 + Math.sin(entFade * Math.PI) * 0.5 : 1;
      const targetOp = (dimmed ? 0.1 : isAlive ? 1 : isActive ? 0.95 : 0.45 + flickerAdd) * entFade * entFlash;
      m.opacity = approach(m.opacity, targetOp, (entered ? 0.08 : 0.22));
      const targetColor = isAlive ? WHITE_MIX.copy(emit).lerp(WHITE, 0.45) : emit;
      m.color.lerp(targetColor, 0.08);
    }
    if (scrim.current) {
      // atmospheric separation: soft local darkening behind the orb pushes
      // the wireframe/network back so the badge reads as a foreground object
      scrim.current.scale.setScalar(scale * 3.6 * breathe * boost * entPop);
      const m = scrim.current.material as THREE.MeshBasicMaterial;
      const target = (dimmed ? 0.15 : 0.5) * entFade * uNow;
      m.opacity = approach(m.opacity, target, (entered ? 0.08 : 0.22));
    }
    if (core.current) {
      core.current.scale.setScalar(scale * breathe * boost * entPop);
      const m = core.current.material as THREE.MeshBasicMaterial;
      // White core returns on click — backlights the badge for the "even
      // brighter" alive state; stays dim otherwise so the badge reads dark.
      const targetCore = (dimmed ? 0.1 : isAlive ? 0.85 : isActive ? 0.45 : 0.3) * entFade;
      m.opacity = approach(m.opacity, targetCore, (entered ? 0.08 : 0.22));
    }
    if (icon.current) {
      // The badge IS the orb face now (dark spectrum-tinted sphere with a
      // pre-glowed glyph). Distance still modulates presence, but from a much
      // higher floor so the symbol reads at every zoom level.
      // Collapsed: badges suppressed — embedded bodies read as pure glowing
      // orbs (reference); glyphs return with the expansion.
      const dist = camera.position.distanceTo(icon.current.getWorldPosition(V_TMP));
      const near = THREE.MathUtils.clamp((15.5 - dist) / 7.5, 0, 1); // 0 far → 1 close
      const iconBase = 0.62 + near * 0.3;
      const m = icon.current.material as THREE.MeshBasicMaterial;
      const target =
        (dimmed
          ? iconBase * 0.3
          : isAlive
            ? 1
            : isActive
              ? Math.max(iconBase * 1.2, 0.92)
              : iconBase) *
        entFade *
        uNow;
      m.opacity = approach(m.opacity, target, (entered ? 0.09 : 0.22));
      // size: slightly larger while far for legibility; clicked hub gets a
      // gentle living pulse on top of the hover boost.
      const alivePulse = isAlive ? 1 + Math.sin(t * 2.4) * 0.045 : 1;
      const iconScale = scale * (1.35 - near * 0.25) * boost * alivePulse * entPop;
      icon.current.scale.setScalar(Math.max(iconScale, 1e-4));
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.3 * profile.ringSpeed + phase;
      ring.current.scale.setScalar(Math.max(scale * 2.15 * boost * entPop, 1e-4));
      const m = ring.current.material as THREE.MeshBasicMaterial;
      // rings suppressed while collapsed (pure glowing bodies), return on unfold
      const target = (dimmed ? 0.06 : isActive ? 0.95 : 0.42) * entFade * uNow;
      m.opacity = approach(m.opacity, target, (entered ? 0.08 : 0.22));
    }
    // ALIVE energy circulation: a tilted ring + light points orbiting the
    // opened orb. Eases in on focus, eases out on unfocus.
    if (energyRing.current) {
      const m = energyRing.current.material as THREE.MeshBasicMaterial;
      const target = isAlive ? 0.75 : 0;
      m.opacity = approach(m.opacity, target, 0.07);
      energyRing.current.rotation.z = -t * 0.9 + phase;
      energyRing.current.rotation.x = Math.PI * 0.35 + Math.sin(t * 0.4) * 0.1;
      energyRing.current.scale.setScalar(scale * 2.9 * (1 + Math.sin(t * 1.6) * 0.04));
    }
    for (let i = 0; i < energyOrbs.current.length; i++) {
      const orb = energyOrbs.current[i];
      if (!orb) continue;
      const m = orb.material as THREE.MeshBasicMaterial;
      const target = isAlive ? 0.95 : 0;
      m.opacity = approach(m.opacity, target, 0.07);
      if (m.opacity > 0.02) {
        const a = t * 1.4 + (i / 3) * Math.PI * 2 + phase;
        const rr = scale * 2.9;
        // orbit on the same tilted plane as the energy ring
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr * Math.cos(Math.PI * 0.35);
        const pz = Math.sin(a) * rr * Math.sin(Math.PI * 0.35);
        orb.position.set(px, py, pz);
        orb.scale.setScalar(scale * (0.42 + Math.sin(t * 3 + i) * 0.08));
      }
    }
    if (satGroup.current) {
      // satellites were RELEASED onto the global figure-eight orbits (see
      // OrbitalBodies.tsx) — the parked local cluster no longer renders.
      satGroup.current.visible = false;
    }
  });

  return (
    <group ref={root} position={hub.position}>
      {interactive && (
        <mesh
          visible={false}
          userData={{ hubId: hub.id }}
          onPointerOver={(e) => {
            if (!unfoldDone()) return; // collapsed/unfolding: hubs inert
            e.stopPropagation();
            onHover(hub.id);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            if (!unfoldDone()) return;
            // Only clear a hover we own — the pointer may already sit on
            // another hit-target whose onPointerOver fired first; clearing
            // blindly desyncs hover between overlapping targets.
            if (useEcosystemState.getState().hoveredId === hub.id) {
              onHover(null);
            }
            document.body.style.cursor = "auto";
          }}
          onClick={(e) => {
            if (!unfoldDone()) return;
            e.stopPropagation();
            onSelect(hub.id);
          }}
        >
          <sphereGeometry args={[Math.max(scale * 2.6, 0.5), 12, 12]} />
        </mesh>
      )}

      <Billboard>
        {/* atmospheric scrim — behind the whole orb stack, pushes network back */}
        <mesh ref={scrim} renderOrder={9}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={scrimTexture}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={glow} renderOrder={10}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={emit}
            map={glowTexture}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={core} renderOrder={11}>
          <planeGeometry args={[2.3, 2.3]} />
          <meshBasicMaterial
            color="#ffffff"
            map={coreTexture}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
        {/* on-orb icon badge: tone-mapped and authored sub-threshold, so the
            bloom pass never smears it — glyph and dark disc stay crisp.
            renderOrder above ALL wireframe/path effects (which top out at 6). */}
        <mesh ref={icon} renderOrder={12} position={[0, 0, 0.02]}>
          <planeGeometry args={[2.2, 2.2]} />
          <meshBasicMaterial
            map={hubIconTexture(hub.id, SPECTRUM_COLORS[hub.spectrum])}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </Billboard>
      <mesh ref={ring}>
        <torusGeometry args={[1, 0.02, 6, 64]} />
        <meshBasicMaterial color={emit} transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>

      {/* ALIVE state: circulating energy ring + orbiting light points (visible only when focused) */}
      <mesh ref={energyRing}>
        <torusGeometry args={[1, 0.012, 6, 96]} />
        <meshBasicMaterial
          color={emit}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => { energyOrbs.current[i] = m; }} renderOrder={6}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* satellite nodes */}
      <group ref={satGroup}>
        {hub.satellites.map((s, i) => (
          <mesh key={i} position={s}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshBasicMaterial color={color} transparent opacity={0} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Faint energy membrane per suite. Suite hover/click detection moved to
 *  SuiteHoverTracker (screen-space) — the old camera-raycast hit-sphere fed
 *  back into the hover drift and oscillated. This component is visuals-only. */
export function SuiteZone({ suite }: { suite: SuiteDef }) {
  const membrane = useRef<THREE.Mesh>(null);
  const zoneRoot = useRef<THREE.Group>(null);
  const related = useEcosystemState((s) => s.related);
  const mode = useEcosystemState((s) => s.mode);
  // luminance-normalized: raw Supernova blue is ~65% lighter than Aurora
  // violet — glowColor pins both membranes to equal perceived brightness
  const color = glowColor(suite.accent);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!membrane.current) return;
    // COLLAPSED POSE (reference image): both wireframe shells converge to the
    // exact center and OVERLAP into one combined spherical energy field.
    // Local position cancels the hemisphere offset at u=0; local scale
    // counter-divides the group's anisotropic axes so the orb stays perfectly
    // spherical (and slightly tighter) around the icon.
    if (zoneRoot.current) {
      const u = unfold01();
      zoneRoot.current.position.set(suite.center[0] * u, suite.center[1] * u, suite.center[2] * u);
      // counter-divide the group's anisotropic axes → the shell stays a true
      // sphere at every u; slightly tightened while collapsed so the orb
      // wraps the rosette like the reference's outer sphere
      unfoldAxes(u, V_TMP);
      // shellScale is a collapsed-pose dial (1 = shipped 0.86 tighten);
      // its influence fades to zero as the ecosystem expands
      const tighten = (0.86 + 0.14 * u) * (1 + (ecoConfig.shellScale - 1) * (1 - u));
      zoneRoot.current.scale.set(tighten / V_TMP.x, tighten / V_TMP.y, tighten / V_TMP.z);
    }
    const m = membrane.current.material as THREE.MeshBasicMaterial;
    const ent = entranceDone() ? 1 : entrancePhase(1800, 2600);
    const lit = related.has(suite.id);
    const base = 0.045 + Math.sin(t * 0.5 + (suite.id === "suite-one" ? 0 : 2)) * 0.012;
    const target = (mode === "idle" ? base : lit ? base * 2.4 : base * 0.4) * ent;
    m.opacity = approach(m.opacity, target, 0.06);
    membrane.current.rotation.z = t * 0.02 * (suite.id === "suite-one" ? 1 : -1);
  });

  return (
    <group ref={zoneRoot} position={suite.center}>
      {/* transparent energy membrane implying the hemisphere volume */}
      <mesh ref={membrane} rotation={[0.15, suite.id === "suite-one" ? 0.35 : -0.35, 0]}>
        <sphereGeometry args={[suite.hoverRadius * 0.92, 48, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
          wireframe
        />
      </mesh>
    </group>
  );
}








































































