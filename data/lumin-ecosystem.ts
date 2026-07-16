// ============================================================
// Lumin Ecosystem — One platform, two suites.
// Left hemisphere = Lumin One (member/guest experience).
// Right hemisphere = Lumin Pro (operator).
// Deterministic positions. No physics. No runtime rearrangement.
// ============================================================

export type Spectrum =
  | "one-blue"
  | "one-cyan"
  | "one-teal"
  | "one-lime"
  | "pro-violet"
  | "pro-magenta"
  | "pro-indigo"
  | "pro-blue"
  | "pro-white"
  | "pro-orchid";

export const SPECTRUM_COLORS: Record<Spectrum, string> = {
  "one-blue": "#5270FF", // Supernova
  "one-cyan": "#3FD4FF",
  "one-teal": "#00FFBA", // Stellar
  "one-lime": "#E3FF70", // Galaxy
  "pro-violet": "#863399", // Aurora
  "pro-magenta": "#FF004B", // Flare
  "pro-indigo": "#6A5BFF",
  "pro-blue": "#5270FF",
  "pro-white": "#DDE6FF",
  "pro-orchid": "#B44BE0",
};

export type SuiteId = "suite-one" | "suite-pro";

export interface SuiteDef {
  id: SuiteId;
  label: string;
  tagline: string;
  description: string;
  /** hemisphere center, used for hover zone + suite camera focus */
  center: [number, number, number];
  hoverRadius: number;
  accent: Spectrum;
  /** destination for the focus panel's "Learn more" CTA (route or full URL).
   *  Omit or leave undefined to hide the button for this entity. */
  learnMoreUrl?: string;
}

export const SUITES: SuiteDef[] = [
  {
    id: "suite-one",
    label: "Lumin One",
    tagline: "The member experience suite.",
    description:
      "Placeholder. Lumin One is the member and guest side of the platform: movement, nutrition, retail, and connected hardware experiences that feel personal and alive.",
    center: [-3.4, 0, 0],
    hoverRadius: 3.1,
    accent: "one-blue",
  },
  {
    id: "suite-pro",
    label: "Lumin Pro",
    tagline: "The operator suite.",
    description:
      "Placeholder. Lumin Pro is the operator side of the platform: the systems that run the business — core operations, member management, communication, engagement, education, and command.",
    center: [3.4, 0, 0],
    hoverRadius: 3.1,
    accent: "pro-violet",
  },
];

export interface HubDef {
  id: string;
  suite: SuiteId;
  spectrum: Spectrum;
  label: string;
  description: string;
  position: [number, number, number];
  scale: number;
  /** small decorative satellites (deterministic offsets from hub) */
  satellites: [number, number, number][];
  /** destination for the focus panel's "Learn more" CTA (route or full URL).
   *  Omit or leave undefined to hide the button for this entity. */
  learnMoreUrl?: string;
}

// ---- LUMIN ONE: exactly four hubs (organic, fluid) ----
// ---- LUMIN PRO: exactly six hubs (architectural)   ----
export const HUBS: HubDef[] = [
  {
    id: "hub-move",
    suite: "suite-one",
    spectrum: "one-blue",
    label: "Move",
    description:
      "Placeholder. Training and movement experiences: guided sessions, adaptive programming, and progress that members can feel.",
    position: [-2.55, 1.75, 0.35],
    scale: 0.55,
    satellites: [
      [-0.85, 0.6, 0.45],
      [-0.2, 1.0, -0.35],
      [0.55, 0.75, 0.3],
    ],
  },
  {
    id: "hub-fuel",
    suite: "suite-one",
    spectrum: "one-teal",
    label: "Fuel",
    description:
      "Placeholder. Nutrition connected to training load and recovery: guidance that fits the member's actual life.",
    position: [-4.45, 0.75, -0.5],
    scale: 0.52,
    satellites: [
      [-0.8, 0.5, 0.4],
      [-0.95, -0.35, -0.3],
    ],
  },
  {
    id: "hub-market",
    suite: "suite-one",
    spectrum: "one-lime",
    label: "Market",
    description:
      "Placeholder. The retail and marketplace layer: products, programs, and services members discover inside the experience.",
    position: [-4.1, -1.35, 0.45],
    scale: 0.5,
    satellites: [
      [-0.7, -0.6, 0.35],
      [0.15, -0.95, -0.3],
    ],
  },
  {
    id: "hub-station",
    suite: "suite-one",
    spectrum: "one-cyan",
    label: "Station",
    description:
      "Placeholder. Connected hardware: purpose-built displays that bring coaching software, member data, and live sessions onto the floor.",
    position: [-2.3, -1.9, -0.35],
    scale: 0.52,
    satellites: [
      [0.6, -0.55, 0.4],
      [-0.25, -1.0, -0.25],
      [0.85, 0.15, -0.35],
    ],
  },
  // ---- LUMIN PRO (6 hubs, tighter grid-like arrangement) ----
  {
    id: "hub-core",
    suite: "suite-pro",
    spectrum: "pro-indigo",
    label: "Core",
    description:
      "Placeholder. The operational core: scheduling, billing, memberships — the system of record everything else plugs into.",
    position: [2.45, 1.9, 0.3],
    scale: 0.54,
    satellites: [
      [0.75, 0.55, 0.35],
      [0.1, 0.95, -0.3],
    ],
  },
  {
    id: "hub-memberapp",
    suite: "suite-pro",
    spectrum: "pro-blue",
    label: "Member App",
    description:
      "Placeholder. The operator's branded member app: bookings, programs, progress, and communication in the member's pocket.",
    position: [4.35, 1.45, -0.45],
    scale: 0.5,
    satellites: [
      [0.8, 0.45, 0.4],
      [0.9, -0.4, -0.25],
    ],
  },
  {
    id: "hub-connect",
    suite: "suite-pro",
    spectrum: "pro-magenta",
    label: "Connect",
    description:
      "Placeholder. CRM and communication built for fitness sales teams: leads, follow-ups, and conversations that convert.",
    position: [5.0, 0.0, 0.4],
    scale: 0.5,
    satellites: [
      [0.85, 0.3, 0.3],
      [0.7, -0.6, -0.3],
    ],
  },
  {
    id: "hub-loops",
    suite: "suite-pro",
    spectrum: "pro-orchid",
    label: "Loops",
    description:
      "Placeholder. Gamified engagement: the dopamine of a game wrapped around real training, keeping members coming back.",
    position: [4.3, -1.5, -0.4],
    scale: 0.5,
    satellites: [
      [0.75, -0.5, 0.35],
      [-0.1, -0.95, -0.25],
    ],
  },
  {
    id: "hub-academy",
    suite: "suite-pro",
    spectrum: "pro-white",
    label: "Academy",
    description:
      "Placeholder. Education and certification pathways: leveling up coaches, trainers, and teams inside the ecosystem.",
    position: [2.35, -1.95, 0.35],
    scale: 0.48,
    satellites: [
      [-0.55, -0.6, 0.35],
      [0.5, -0.85, -0.3],
    ],
  },
  {
    id: "hub-command",
    suite: "suite-pro",
    spectrum: "pro-violet",
    label: "Command",
    description:
      "Placeholder. The operator's command center: reporting and intelligence that says exactly what is happening and what to do next.",
    position: [3.35, 0.15, -1.1],
    scale: 0.52,
    satellites: [
      [0.15, 0.8, -0.5],
      [-0.6, -0.45, -0.45],
    ],
  },
];

// ---- Intra-suite routing (hub → hub, drawn as clean arcs) ----
export const SUITE_ROUTES: Array<[string, string]> = [
  // Lumin One: organic loop through the four hubs
  ["hub-move", "hub-fuel"],
  ["hub-fuel", "hub-market"],
  ["hub-market", "hub-station"],
  ["hub-station", "hub-move"],
  // Lumin Pro: disciplined mesh
  ["hub-core", "hub-memberapp"],
  ["hub-memberapp", "hub-connect"],
  ["hub-connect", "hub-loops"],
  ["hub-loops", "hub-academy"],
  ["hub-academy", "hub-core"],
  ["hub-command", "hub-core"],
  ["hub-command", "hub-connect"],
  ["hub-command", "hub-academy"],
];

// ---- Primary loop circuit through both hemispheres ----
export const LOOP_PATH: [number, number, number][] = [
  [0, 0, 0.55],
  [-1.5, 1.1, 0.75],
  [-2.55, 1.75, 0.35],
  [-4.45, 0.75, -0.2],
  [-4.1, -1.35, 0.4],
  [-2.3, -1.9, 0.5],
  [-1.2, -0.8, 0.7],
  [0, 0.1, 0.62],
  [1.5, 1.05, 0.7],
  [2.45, 1.9, 0.3],
  [4.35, 1.45, -0.2],
  [5.0, 0.0, 0.35],
  [4.3, -1.5, 0.4],
  [2.35, -1.95, 0.45],
  [1.15, -0.85, 0.7],
];

export interface EcoSettings {
  loopDuration: number;
  bloomIntensity: number;
  cameraZ: number;
  particleCount: number;
  lineOpacity: number;
}

export const DEFAULT_SETTINGS: EcoSettings = {
  loopDuration: 12,
  bloomIntensity: 1.15,
  cameraZ: 14.5,
  particleCount: 300,
  lineOpacity: 0.5,
};



