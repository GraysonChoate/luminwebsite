/**
 * BEST POSITIONING LINES — from the internal Product / Feature Maps.
 *
 * Source: `Internal/Lumin_<Product>_Product_Feature_Map.pdf`, the "Best
 * Positioning Line" field. Verbatim, not paraphrased.
 *
 * ── WHY THIS IS SEPARATE FROM ECO_PRODUCTS ───────────────────────────────
 * `ECO_PRODUCTS` was written for the ecosystem's node dossiers and gives each
 * product a headline, a brief and a capability set. The feature maps are the
 * INTERNAL source of truth and carry one thing those do not: a single line the
 * business has already settled on for each product. That line is the sharpest
 * copy available, so it leads the page.
 *
 * ── COVERAGE IS PARTIAL, DELIBERATELY ────────────────────────────────────
 * Only seven of the eleven products have a feature map. Loops, Core, Command
 * Center, Asset Management and MRKT have none — the OS/Ecosystem map names
 * Station, Companion, Trainer, Studio, Fuel, Academy, Connect and Insights, and
 * stops there. Those pages simply do not render a positioning line rather than
 * getting an invented one.
 */
export const POSITIONING: Record<string, string> = {
  academy: "Turn your knowledge into training that scales.",
  connect: "Turn every conversation into a clearer path to conversion.",
  fuel: "Fuel the progress you're working for.",
  station: "Interactive training that adapts to every rep.",
  studio: "Group fitness, intelligently delivered.",
  // Trainer and Companion are expressions of Move; their lines are rendered
  // on their cards inside the Move page, from `CONTAINED_DETAIL`.
  move: "One movement platform. Infinite ways to express it.",
};

export const positioningFor = (id: string): string | undefined => POSITIONING[id];
