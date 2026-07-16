// The central Lumin nucleus: exact logo texture, containment rings, glow field.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { useEcosystemState } from "../../hooks/useEcosystemState";
import { approach, entrancePhase, pulseBus, startUnfold, unfoldStage, unfold01 } from "./Entrance";
import { ecoConfig } from "./EcosystemConfig";

const SUPERNOVA = new THREE.Color("#5270FF");
const AURORA = new THREE.Color("#863399");
// collapsed-state halo: white-blue core with a soft blue-violet cast
const HALO_COLLAPSED = SUPERNOVA.clone().lerp(AURORA, 0.38);
const HALO_TMP = new THREE.Color();

export function LuminNucleus() {
  const iconTex = useTexture("/assets/lumin-icon.png");
  const group = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const ringC = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const disc = useRef<THREE.Mesh>(null);
  const logo = useRef<THREE.Mesh>(null);
  const related = useEcosystemState((s) => s.related);
  const mode = useEcosystemState((s) => s.mode);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Entrance: the nucleus ignites first (halo swell → logo materializes →
    // rings expand into orbit). All factors are exactly 1 after the timeline.
    const entHalo = entrancePhase(0, 900);
    const entLogo = entrancePhase(150, 950);
    const entA = entrancePhase(250, 1050);
    const entB = entrancePhase(350, 1150);
    const entC = entrancePhase(450, 1250);
    // ATOMIC RING SYSTEM — each containment ring tumbles around its own axis
    // like an electron shell: different planes, opposite directions,
    // polyrhythmic periods locked in a 2:3:5 ratio family (base cycle 20s) so
    // they visibly realign on the common downbeat instead of drifting apart.
    const BASE = (Math.PI * 2) / 20; // one full base cycle every 20 s
    const ringScale = ecoConfig.ringScale;
    if (ringA.current) {
      // innermost shell: fastest — 5 turns per cycle, precessing plane
      ringA.current.rotation.set(
        Math.sin(t * BASE) * 0.35,
        t * BASE * 5,
        t * BASE * 0.5,
      );
      ringA.current.scale.setScalar((0.55 + 0.45 * entA) * ringScale);
      (ringA.current.material as THREE.MeshBasicMaterial).opacity = 0.85 * entA;
    }
    if (ringB.current) {
      // middle shell: 3 turns per cycle, opposite direction, tilted plane
      ringB.current.rotation.set(
        Math.PI * 0.42 + Math.sin(t * BASE * 2) * 0.12,
        -t * BASE * 3,
        Math.cos(t * BASE) * 0.3,
      );
      ringB.current.scale.setScalar((0.55 + 0.45 * entB) * ringScale);
      (ringB.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * entB;
    }
    if (ringC.current) {
      // outer shell: slowest — 2 turns per cycle, third plane, counter-tilt
      ringC.current.rotation.set(
        -Math.sin(t * BASE) * 0.28,
        t * BASE * 2,
        Math.PI * 0.38 + Math.cos(t * BASE * 2) * 0.1,
      );
      ringC.current.scale.setScalar((0.55 + 0.45 * entC) * ringScale);
      (ringC.current.material as THREE.MeshBasicMaterial).opacity = 0.35 * entC;
    }
    const logoScale = ecoConfig.logoScale;
    if (disc.current) {
      (disc.current.material as THREE.MeshBasicMaterial).opacity = 0.92 * entrancePhase(100, 800);
      disc.current.scale.setScalar(logoScale);
    }
    if (logo.current) {
      (logo.current.material as THREE.MeshBasicMaterial).opacity = entLogo;
      logo.current.scale.setScalar(logoScale);
    }
    if (halo.current) {
      const dimmed = mode !== "idle" && !related.has("nucleus");
      // soft brightening each time a highway pulse passes through the center
      const passing = pulseBus.boost * 0.22;
      // collapsed idle: slightly stronger presence + slow charged breathing —
      // the core reads as the compressed ecosystem's power source
      const stage = unfoldStage();
      const collapsedLift = stage === 0 ? 0.14 + Math.sin(t * 0.7) * 0.05 : 0;
      // RELEASE PULSE: one strong ignition flash at click (0–520ms), decaying
      const release = pulseBus.click * 0.85;
      pulseBus.click = Math.max(0, pulseBus.click - 0.016);
      const target =
        ((dimmed ? 0.28 : 0.55 + Math.sin(t * 0.9) * 0.05) + passing + collapsedLift + release) *
        entHalo;
      const m = halo.current.material as THREE.MeshBasicMaterial;
      m.opacity = approach(m.opacity, target, (release > 0.02 ? 0.3 : 0.06));
      // halo hue: blue-violet while collapsed → Supernova blue when expanded
      HALO_TMP.copy(HALO_COLLAPSED).lerp(SUPERNOVA, unfold01());
      m.color.lerp(HALO_TMP, 0.08);
      // the halo swells with the release pulse
      const swell = 1 + pulseBus.click * 0.45 + (stage === 0 ? Math.sin(t * 0.7) * 0.03 : 0);
      halo.current.scale.setScalar(swell * logoScale);
    }
  });

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* COLLAPSED-STATE CLICK TARGET: the core is the release trigger.
          Active only before the unfold; afterwards it stops intercepting. */}
      <mesh
        visible={false}
        onPointerOver={() => {
          if (unfoldStage() === 0) document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          if (unfoldStage() === 0) document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          if (unfoldStage() !== 0) return;
          e.stopPropagation();
          pulseBus.click = 1; // one strong ignition pulse
          startUnfold();
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[1.35, 16, 16]} />
      </mesh>

      {/* halo glow */}
      <Billboard>
        <mesh ref={halo} renderOrder={1}>
          <circleGeometry args={[1.55, 64]} />
          <meshBasicMaterial
            color={SUPERNOVA}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            map={useGlowTexture()}
          />
        </mesh>
        {/* dark core disc + exact logo — tone-mapped and sub-threshold, so
            the bloom pass never smears the wordmark; halo blooms around it.
            depthTest OFF + top renderOrder: the Lumin icon sits in front of
            EVERYTHING — no line, particle, or ring ever crosses the mark. */}
        <mesh ref={disc} renderOrder={20} position={[0, 0, 0.01]}>
          <circleGeometry args={[0.62, 64]} />
          <meshBasicMaterial
            color="#0c1030"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
        <mesh ref={logo} renderOrder={21} position={[0, 0, 0.02]}>
          <planeGeometry args={[0.95, 0.95]} />
          <meshBasicMaterial
            map={iconTex}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
      </Billboard>

      {/* containment rings */}
      <mesh ref={ringA}>
        <torusGeometry args={[0.98, 0.008, 8, 128]} />
        <meshBasicMaterial color={SUPERNOVA} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh ref={ringB} rotation={[Math.PI * 0.42, 0, 0]}>
        <torusGeometry args={[1.22, 0.006, 8, 128]} />
        <meshBasicMaterial color="#8fa4ff" transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <mesh ref={ringC} rotation={[0, Math.PI * 0.38, 0]}>
        <torusGeometry args={[1.45, 0.004, 8, 128]} />
        <meshBasicMaterial color="#863399" transparent opacity={0.35} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Soft radial glow sprite texture, generated once on the client.
let glowTex: THREE.Texture | null = null;
function useGlowTexture(): THREE.Texture {
  if (!glowTex) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.55)");
    g.addColorStop(0.6, "rgba(255,255,255,0.14)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    glowTex = new THREE.CanvasTexture(canvas);
  }
  return glowTex;
}

// Core texture: bright-but-detailed center. A hot (but sub-clipping) center
// that rolls off through a visible shoulder to the edge — used with tone
// mapping ENABLED so up close it reads as a luminous sphere with falloff
// detail, never a flat blown-out disc.
let coreTex: THREE.Texture | null = null;
function useCoreTexture(): THREE.Texture {
  if (!coreTex) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,0.98)");
    g.addColorStop(0.28, "rgba(255,255,255,0.92)"); // hot core plateau
    g.addColorStop(0.5, "rgba(236,240,255,0.66)"); // visible shoulder
    g.addColorStop(0.72, "rgba(214,224,255,0.3)"); // cool falloff ring
    g.addColorStop(0.9, "rgba(190,205,255,0.08)");
    g.addColorStop(1, "rgba(180,195,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    coreTex = new THREE.CanvasTexture(canvas);
  }
  return coreTex;
}

// Scrim texture: soft dark radial falloff — local atmospheric darkening
// rendered BEHIND labels and orb badges (normal blending) so they stand off
// the wireframe network without any hard-edged panel look.
let scrimTex: THREE.Texture | null = null;
function useScrimTexture(): THREE.Texture {
  if (!scrimTex) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(6, 8, 15, 0.92)");
    g.addColorStop(0.45, "rgba(6, 8, 15, 0.7)");
    g.addColorStop(0.75, "rgba(6, 8, 15, 0.28)");
    g.addColorStop(1, "rgba(6, 8, 15, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    scrimTex = new THREE.CanvasTexture(canvas);
  }
  return scrimTex;
}

export { useGlowTexture, useCoreTexture, useScrimTexture };


























