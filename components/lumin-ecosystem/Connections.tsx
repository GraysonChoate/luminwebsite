// Connections — the center-crossing THROUGH-LINE family.
//
// STRUCTURAL MODEL (owner spec): the central Lumin orb is NOT an endpoint —
// it is the convergence portal. No line terminates at the center and no line
// terminates at a hub. Every major path is one continuous closed curve that:
//   originates in one lobe → curves inward → crosses PRECISELY at the
//   nucleus → continues THROUGH into the opposite hemisphere → sweeps that
//   lobe → returns through the center. Figure-eight behavior across the
//   full composition, self-crossing exactly once, at the origin.
//
// Each product hub sits ON one of these orbits (the curve is solved through
// the hub's locked position — geometry adapts to the hub, never the reverse).
// Near-mirror One/Pro hubs SHARE one orbit: information visibly travels
// Move → Lumin → Core on a single unbroken curve. Unpaired hubs get their own
// orbit whose opposite lobe sweeps a clean unoccupied arc — same as the
// reference image's empty arcs.
//
// MATH: blended Gerono lemniscate. x = A·sin t, y = B·sin t·cos t, z = Z·sin²t
// with (A, B, Z) smoothly interpolated between left-lobe and right-lobe
// parameter sets as a function of sin t. At sin t = 0 the position is the
// origin REGARDLESS of parameters — so the crossing is exact by construction,
// and each lobe carries its own hub exactly. Smooth everywhere, no kinks,
// no hand-placed control points.
//
// LAYERS (max three, per spec):
//   1. the primary infinity highway (InfinityFlow — outermost family member)
//   2. these hub through-lines (nested members of the same family)
//   3. faint orbital depth contours (below)
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import type { Line2 } from "three-stdlib";
import * as THREE from "three";
import { HUBS, type HubDef } from "../../data/lumin-ecosystem";
import { useEcosystemState } from "../../hooks/useEcosystemState";
import { approach, entrancePhase, entranceDone } from "./Entrance";
import { spineColorAt } from "./InfinityFlow";

// ---- orbit solving ---------------------------------------------------------

interface LobeParams {
  A: number; // x half-span of this lobe
  B: number; // lobe height coefficient
  Z: number; // z bow coefficient
}

const LOBE_K = 1.18; // orbit reaches ~18% beyond its hub before turning

/** Solve one lobe's parameters so the orbit passes exactly through the hub. */
function lobeParams(hub: HubDef): LobeParams {
  const [hx, hy, hz] = hub.position;
  if (Math.abs(hy) < 0.05) {
    // equatorial hub: place it at the lobe apex (t = π/2), where y = 0 for
    // any B — B becomes a free aesthetic choice for the lobe height.
    return { A: Math.abs(hx), B: 1.35, Z: hz };
  }
  const A = Math.abs(hx) * LOBE_K;
  const s = hx / A; // signed sin at the hub (≈ ±1/K)
  const c = Math.sqrt(1 - s * s);
  const B = hy / (s * c);
  const Z = hz / (s * s);
  return { A, B, Z };
}

/** Mirror params for the unoccupied lobe of a solo orbit (point-symmetric sweep). */
function mirrorParams(p: LobeParams): LobeParams {
  return { A: p.A, B: -p.B, Z: p.Z * 0.7 };
}

/**
 * Closed figure-eight whose left lobe (sin t < 0) and right lobe (sin t > 0)
 * carry independent solved parameters, blended smoothly through the crossing.
 * getPoint(0) = origin = the nucleus. Self-crossing happens exactly there.
 */
class BlendedLemniscate extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly pL: LobeParams,
    private readonly pR: LobeParams,
  ) {
    super();
  }
  override getPoint(t01: number, target = new THREE.Vector3()): THREE.Vector3 {
    const t = t01 * Math.PI * 2;
    const s = Math.sin(t);
    const c = Math.cos(t);
    const w = THREE.MathUtils.smoothstep(s, -0.25, 0.25);
    const A = this.pL.A + (this.pR.A - this.pL.A) * w;
    const B = this.pL.B + (this.pR.B - this.pL.B) * w;
    const Z = this.pL.Z + (this.pR.Z - this.pL.Z) * w;
    return target.set(A * s, B * s * c, Z * s * s);
  }
}

// Near-mirror One↔Pro pairs share one orbit (positions are locked data; these
// pairs reflect where the existing layout is already close to mirrored).
const PAIRS: [string, string][] = [
  ["hub-move", "hub-core"],
  ["hub-fuel", "hub-memberapp"],
  ["hub-market", "hub-loops"],
  ["hub-station", "hub-academy"],
];
const SOLO: string[] = ["hub-connect", "hub-command"];

export interface ThroughLine {
  key: string;
  curve: BlendedLemniscate;
  hubIds: string[]; // hubs riding this orbit (1 or 2)
}

let throughLinesCache: ThroughLine[] | null = null;

/** The orbit family — deterministic, built once (positions are static data). */
export function getThroughLines(): ThroughLine[] {
  if (throughLinesCache) return throughLinesCache;
  const byId = (id: string) => HUBS.find((h) => h.id === id)!;
  const out: ThroughLine[] = [];
  for (const [lId, rId] of PAIRS) {
    out.push({
      key: `T-${lId}-${rId}`,
      curve: new BlendedLemniscate(lobeParams(byId(lId)), lobeParams(byId(rId))),
      hubIds: [lId, rId],
    });
  }
  SOLO.forEach((id, i) => {
    const p = lobeParams(byId(id));
    // vary the empty lobe's height a touch so solo arcs don't stack
    const m = mirrorParams(p);
    m.B *= 1 + i * 0.25;
    // all current solo hubs are Pro-side (x > 0): occupied lobe is the right
    out.push({ key: `S-${id}`, curve: new BlendedLemniscate(m, p), hubIds: [id] });
  });
  throughLinesCache = out;
  return out;
}

// ---- render ----------------------------------------------------------------

const SEGMENTS = 360;

interface Rendered {
  key: string;
  hubIds: string[];
  points: [number, number, number][];
  vertexColors: [number, number, number][];
  length: number;
  entrance: [number, number];
}

function arcLength(points: [number, number, number][]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
      points[i][2] - points[i - 1][2],
    );
  }
  return len;
}

export function ConnectionSystem({
  lineOpacity = 0.5,
  invitationAt = null,
}: {
  lineOpacity?: number;
  /** performance.now() timestamp when the one-time invitation cue started, or null. */
  invitationAt?: number | null;
}) {
  const related = useEcosystemState((s) => s.related);
  const mode = useEcosystemState((s) => s.mode);
  const matRefs = useRef<Map<string, Line2>>(new Map());
  // Debug-panel multiplier, normalized so the default (0.5) = today's look.
  const opacityMul = lineOpacity / 0.5;

  const lines = useMemo<Rendered[]>(() => {
    const v = new THREE.Vector3();
    const c = new THREE.Color();
    return getThroughLines().map((tl, i) => {
      const points: [number, number, number][] = [];
      const cols: [number, number, number][] = [];
      for (let k = 0; k <= SEGMENTS; k++) {
        tl.curve.getPoint(k / SEGMENTS, v);
        points.push([v.x, v.y, v.z]);
        // ONE gradient law for the whole family — color = position in the flow
        spineColorAt(v.x, c);
        cols.push([c.r, c.g, c.b]);
      }
      return {
        key: tl.key,
        hubIds: tl.hubIds,
        points,
        vertexColors: cols,
        length: arcLength(points),
        // draw-on grows from the nucleus outward (t=0 IS the crossing)
        entrance: [600 + i * 90, 600 + i * 90 + 900] as [number, number],
      };
    });
  }, []);

  // Contour filaments implying hemisphere silhouettes (depth layer 3).
  // Points are stored RELATIVE to the hemisphere center (cx) and rendered in
  // a group at cx — so each ring can oscillate concentrically (slow breathing
  // scale + drift) around its own hemisphere center once expanded.
  const contours = useMemo(() => {
    const out: {
      key: string;
      points: [number, number, number][];
      color: THREE.Color;
      opacity: number;
      suite: string;
      cx: number;
      idx: number;
    }[] = [];
    const mk = (
      side: 1 | -1,
      idx: number,
      rx: number,
      ry: number,
      tilt: number,
      z: number,
      col: THREE.Color,
      op: number,
    ) => {
      const pts: [number, number, number][] = [];
      const cx = side * 3.3;
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        pts.push([
          Math.cos(a) * rx * Math.cos(tilt) * side,
          Math.sin(a) * ry,
          z + Math.cos(a) * rx * Math.sin(tilt) * 0.6,
        ]);
      }
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), true);
      out.push({
        key: `contour-${side}-${idx}`,
        points: curve.getPoints(80).map((p) => [p.x, p.y, p.z] as [number, number, number]),
        color: col,
        opacity: op,
        suite: side === -1 ? "suite-one" : "suite-pro",
        cx,
        idx,
      });
    };
    // Luminance-pinned contour palette: raw teal/cyan vastly out-glow Aurora
    // violet, tipping the whole left hemisphere brighter. Pin both sides to
    // the same perceived lightness (hue families unchanged).
    const pin = (hex: string, l: number) => {
      const cc = new THREE.Color(hex);
      const hsl = { h: 0, s: 0, l: 0 };
      cc.getHSL(hsl);
      cc.setHSL(hsl.h, Math.min(hsl.s, 0.95), l);
      return cc;
    };
    const blue = pin("#5270FF", 0.58);
    const teal = pin("#00FFBA", 0.58);
    const cyan = pin("#3FD4FF", 0.58);
    const violet = pin("#863399", 0.58);
    const magenta = pin("#FF004B", 0.58);
    const indigo = pin("#6A5BFF", 0.58);
    // EQUAL HEMISPHERES: both sides use the SAME four ellipse dimension sets
    // (mirrored), so the two spheres read exactly equal in size — only the
    // colors differ per suite.
    mk(-1, 0, 2.55, 2.9, 0.25, -0.3, blue, 0.11);
    mk(-1, 1, 2.25, 2.6, -0.35, 0.25, teal, 0.09);
    mk(-1, 2, 2.75, 2.35, 0.55, -0.55, cyan, 0.08);
    mk(-1, 3, 1.95, 2.95, -0.15, 0.5, blue, 0.07);
    mk(1, 0, 2.55, 2.9, 0.25, -0.3, indigo, 0.11);
    mk(1, 1, 2.25, 2.6, -0.35, 0.25, violet, 0.1);
    mk(1, 2, 2.75, 2.35, 0.55, -0.55, magenta, 0.09);
    mk(1, 3, 1.95, 2.95, -0.15, 0.5, indigo, 0.08);
    return out;
  }, []);

  const contourRefs = useRef<Map<string, Line2>>(new Map());
  const contourGroupRefs = useRef<Map<string, THREE.Group>>(new Map());

  // One-time invitation cue: a soft brightening pulse traveling once across
  // both hemispheres' existing contour lines (left → right).
  const INVITE_DURATION = 2600; // ms for the full sweep
  const inviteBoost = (contourCenterX: number, now: number): number => {
    if (invitationAt === null) return 0;
    const t = (now - invitationAt) / INVITE_DURATION;
    if (t < 0 || t > 1) return 0;
    const px = -6.5 + t * 13;
    const d = Math.abs(px - contourCenterX);
    const falloff = Math.max(0, 1 - d / 2.6);
    const env = Math.sin(Math.PI * Math.min(Math.max(t, 0), 1));
    return falloff * falloff * env * 1.6;
  };

  useFrame(({ clock }) => {
    const now = performance.now();
    const t = clock.getElapsedTime();
    const inviteActive = invitationAt !== null && mode === "idle";
    const entered = entranceDone();
    for (const l of lines) {
      const line = matRefs.current.get(l.key);
      if (!line) continue;
      const m = line.material;
      // entrance draw-on: dash grows from the nucleus around the full orbit
      const ent = entered ? 1 : entrancePhase(l.entrance[0], l.entrance[1]);
      m.dashSize = Math.max(l.length * ent, 1e-4);
      m.gapSize = l.length * 2;
      // an orbit is "lit" when ANY hub riding it is related to the focus
      const lit = l.hubIds.some((id) => related.has(id));
      const base = mode === "idle" ? 0.42 : lit ? 0.8 : 0.12;
      const entOpacity = ent === 0 ? 0 : Math.min(1, 0.35 + ent * 0.65) * (1 + (1 - ent) * 0.5);
      const target = Math.min(base * opacityMul * entOpacity, 1);
      m.opacity = approach(m.opacity, target, (entered ? 0.08 : 0.25));
      const targetW = lit && mode !== "idle" ? 1.4 * 1.35 : 1.4;
      m.linewidth += (targetW - m.linewidth) * 0.08;
    }
    for (const c of contours) {
      const line = contourRefs.current.get(c.key);
      if (!line) continue;
      const m = line.material;
      const ent = entered ? 1 : entrancePhase(1600, 2700);
      const lit = related.has(c.suite);
      const base = mode === "idle" ? c.opacity : lit ? c.opacity * 1.8 : c.opacity * 0.35;
      const boost = inviteActive ? inviteBoost(c.suite === "suite-one" ? -3.3 : 3.3, now) : 0;
      const target = Math.min((base * opacityMul * (1 + boost) + boost * 0.05) * ent, 1);
      m.opacity = approach(m.opacity, target, (boost > 0 ? 0.18 : 0.06));

      // CONCENTRIC MOTION: each ring slowly ORBITS its own hemisphere center —
      // continuous rotation in its plane (alternating directions between
      // neighbors) with a tidal breathing swell on top. Calm, never chaotic.
      const g = contourGroupRefs.current.get(c.key);
      if (g) {
        const dir = c.idx % 2 === 0 ? 1 : -1;
        const ph = c.idx * 1.35 + (c.suite === "suite-pro" ? 0.8 : 0);
        g.scale.setScalar(1 + Math.sin(t * 0.22 + ph) * 0.035);
        g.rotation.z = t * 0.045 * dir + Math.sin(t * 0.16 + ph) * 0.04;
        g.rotation.y = Math.sin(t * 0.11 + ph * 1.7) * 0.05 * dir;
        g.rotation.x = Math.sin(t * 0.09 + ph) * 0.03;
      }
    }
  });

  return (
    <group>
      {lines.map((l) => (
        <Line
          key={l.key}
          ref={(ln) => {
            if (ln) matRefs.current.set(l.key, ln as unknown as Line2);
          }}
          points={l.points}
          vertexColors={l.vertexColors}
          color="#ffffff"
          lineWidth={1.4}
          dashed
          dashSize={0.0001}
          gapSize={l.length * 2}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      ))}
      {contours.map((c) => (
        <group
          key={c.key}
          position={[c.cx, 0, 0]}
          ref={(g) => {
            if (g) contourGroupRefs.current.set(c.key, g);
          }}
        >
          <Line
            ref={(l) => {
              if (l) contourRefs.current.set(c.key, l as unknown as Line2);
            }}
            points={c.points}
            color={c.color}
            lineWidth={1.0}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </group>
      ))}
    </group>
  );
}









