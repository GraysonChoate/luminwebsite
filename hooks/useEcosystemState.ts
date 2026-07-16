// Interaction state machine: ecosystem → suite → product focus levels.
// idle | hover (suite or hub) | suite-focused | product-focused | transitioning.
import { create } from "zustand";
import { HUBS, SUITES, SUITE_ROUTES, type SuiteId } from "../data/lumin-ecosystem";

export type EcoMode = "idle" | "hover" | "selected" | "transitioning";
export type FocusLevel = "ecosystem" | "suite" | "product";

interface EcoState {
  mode: EcoMode;
  focusLevel: FocusLevel;
  hoveredId: string | null; // suite id or hub id
  focusedSuite: SuiteId | null;
  focusedHub: string | null;
  related: Set<string>;
  setHovered: (id: string | null) => void;
  focusSuite: (id: SuiteId | null) => void;
  focusHub: (id: string | null) => void;
  back: () => void;
  beginTransition: () => void;
  endTransition: () => void;
}

export function suiteOf(hubId: string): SuiteId | null {
  return HUBS.find((h) => h.id === hubId)?.suite ?? null;
}

/** Everything visually related to the given suite/hub id (incl. itself). */
export function relationsFor(id: string | null): Set<string> {
  const rel = new Set<string>();
  if (!id) return rel;
  rel.add(id);
  rel.add("nucleus");
  const suite = SUITES.find((s) => s.id === id);
  if (suite) {
    HUBS.filter((h) => h.suite === suite.id).forEach((h) => rel.add(h.id));
  }
  const hub = HUBS.find((h) => h.id === id);
  if (hub) {
    rel.add(hub.suite);
    // neighbors along suite routes
    SUITE_ROUTES.forEach(([a, b]) => {
      if (a === id) rel.add(b);
      if (b === id) rel.add(a);
    });
  }
  return rel;
}

export const useEcosystemState = create<EcoState>((set, get) => ({
  mode: "idle",
  focusLevel: "ecosystem",
  hoveredId: null,
  focusedSuite: null,
  focusedHub: null,
  related: new Set(),
  setHovered: (id) => {
    const { mode, focusedSuite, focusedHub } = get();
    if (mode === "transitioning") return;
    if (id === null) {
      const activeId = focusedHub ?? focusedSuite;
      set({
        hoveredId: null,
        mode: activeId ? "selected" : "idle",
        related: relationsFor(activeId),
      });
    } else {
      set({ hoveredId: id, mode: focusedSuite ? "selected" : "hover", related: relationsFor(id) });
    }
  },
  focusSuite: (id) => {
    const { mode } = get();
    if (mode === "transitioning") return;
    if (id === null) {
      set({
        focusedSuite: null,
        focusedHub: null,
        focusLevel: "ecosystem",
        hoveredId: null,
        mode: "idle",
        related: new Set(),
      });
    } else {
      set({
        focusedSuite: id,
        focusedHub: null,
        focusLevel: "suite",
        hoveredId: null,
        mode: "selected",
        related: relationsFor(id),
      });
    }
  },
  focusHub: (id) => {
    const { mode } = get();
    if (mode === "transitioning") return;
    if (id === null) {
      const { focusedSuite } = get();
      set({
        focusedHub: null,
        focusLevel: focusedSuite ? "suite" : "ecosystem",
        mode: focusedSuite ? "selected" : "idle",
        related: relationsFor(focusedSuite),
      });
    } else {
      const suite = suiteOf(id);
      set({
        focusedHub: id,
        focusedSuite: suite,
        focusLevel: "product",
        hoveredId: null,
        mode: "selected",
        related: relationsFor(id),
      });
    }
  },
  back: () => {
    const { mode, focusLevel, focusedSuite } = get();
    // Same lockout the other two mutators respect — rapid back() during an
    // in-flight transition must not bypass it.
    if (mode === "transitioning") return;
    if (focusLevel === "product") {
      set({
        focusedHub: null,
        focusLevel: "suite",
        mode: "selected",
        related: relationsFor(focusedSuite),
      });
    } else {
      set({
        focusedSuite: null,
        focusedHub: null,
        focusLevel: "ecosystem",
        hoveredId: null,
        mode: "idle",
        related: new Set(),
      });
    }
  },
  beginTransition: () => set({ mode: "transitioning" }),
  endTransition: () => {
    const { focusedSuite, focusedHub } = get();
    set({ mode: focusedSuite || focusedHub ? "selected" : "idle" });
  },
}));


