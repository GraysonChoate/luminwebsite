import { ECO_PRODUCTS, type ProductHud } from "@/lib/ecoProducts";
import { briefFor, type Brief } from "@/lib/heroFilm";

/**
 * PRODUCT PAGES — the destination the hero briefs have always pointed at.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────
 * Every product brief in the hero film renders a CTA and links to
 * `#product-<id>`. Until now that anchor matched nothing in the document: the
 * briefs were advertising a destination that did not exist. These pages are
 * that destination.
 *
 * ── COPY IS NOT INVENTED HERE ────────────────────────────────────────────
 * Everything on a product page comes from `ECO_PRODUCTS`, which is already the
 * approved single source of truth for node copy — headline, brief, proof
 * signals, capabilities, intelligence rows and footer. This module adds only
 * the ART DIRECTION each page needs: which approved clip plays behind it, and
 * which suite it belongs to.
 *
 * ── THE TAXONOMY GAP, STATED RATHER THAN PAPERED OVER ────────────────────
 * The ecosystem and the hero film do not describe the same product set:
 *
 *   ecosystem (11)  loops core connect command-center asset-management
 *                   academy move studio station market fuel
 *   hero film (12)  Loops Core Connect "Command Center" "Asset Management"
 *                   Academy Trainer Companion Station Studio Fuel MRKT
 *
 * Nine ids match outright. Two do not: the ecosystem folds Trainer and
 * Companion into a single `move` node, and calls the retail product `market`
 * where the film calls it `MRKT`. Pages are generated from the ECOSYSTEM set
 * because that is where the approved page-length copy lives, and
 * `HERO_TO_PAGE` below maps the film's brief labels onto it so no brief links
 * into a void. Trainer and Companion both resolve to `move` until someone
 * decides whether they are one product or two — that is a product decision,
 * not something to guess at in a route table.
 */

/** which approved idle plays behind each page, as an ambient plate */
const AMBIENT: Record<string, string> = {
  loops: "01-pro-checkin-idle.mp4",
  core: "01-pro-checkin-idle.mp4",
  connect: "02-pro-connect-idle.mp4",
  "command-center": "03-pro-command-asset-idle.mp4",
  "asset-management": "03-pro-command-asset-idle.mp4",
  academy: "04-pro-academy-idle.mp4",
  move: "05-one-trainer-idle-approved-fallback.mp4",
  station: "07-one-station-idle.mp4",
  studio: "08-one-studio-idle.mp4",
  fuel: "09-one-fuel-idle.mp4",
  market: "10-one-mrkt-idle.mp4",
};

/**
 * PRODUCTS THAT LIVE INSIDE ANOTHER PRODUCT.
 *
 * Trainer and Companion are expressions of Move, not peers of it — confirmed
 * 2026-08-07. The film gives each of them its own scene and its own brief,
 * which is right: they are what a member actually meets on the floor. But they
 * do not get their own page, because the thing being sold is Move.
 *
 * Move's approved copy describes the movement platform without ever naming
 * them, so folding them in silently would simply lose them. Instead the Move
 * page carries them explicitly, using the brief copy the film already uses, and
 * each gets an anchor so a brief in the film lands on its own part of the page.
 */
export const CONTAINED: Record<string, string[]> = {
  move: ["Trainer", "Companion"],
};

/**
 * DETAIL FOR A CONTAINED PRODUCT — from the internal Product / Feature Maps.
 *
 * Source: `Internal/Lumin_Trainer_Product_Feature_Map.pdf` and
 * `Internal/Lumin_Companion_Product_Feature_Map.pdf`. Every string below is
 * lifted from those documents — the elevator pitch, the "Best Positioning
 * Line", and the Core Capability Map's capability/why-it-matters pairs.
 *
 * This REPLACES a drafted version written before those documents surfaced. The
 * draft had Companion as a guidance layer delivering direction at the machine;
 * it is actually a smart SENSOR system that captures force, speed, reps and
 * range of motion from existing equipment. Close enough to sound right, wrong
 * enough to mislead — which is exactly why it was flagged draft rather than
 * quietly shipped.
 */
export const CONTAINED_DETAIL: Record<
  string,
  { positioning: string; body: string; points: [string, string][] }
> = {
  Trainer: {
    positioning: "Coach smarter. Retain longer.",
    body:
      "Trainer is the coaching command center for personal training teams. It brings client management, AI-assisted programming, workout delivery, messaging, progress tracking, and performance visibility into one connected platform. Trainers get more time to coach, clients get more support between sessions, and operators get a clearer view of the training business.",
    points: [
      ["AI-Assisted Programming", "Saves backend programming time while keeping the trainer in control."],
      ["Client Management", "Helps trainers manage more clients without losing personalization."],
      ["Progress & Accountability", "Makes progress visible and flags issues before they become churn."],
      ["Communication & Feedback", "Keeps coaching connected between sessions and improves service quality."],
      ["Business Visibility", "Gives owners and managers a clearer view of the coaching business."],
    ],
  },
  Companion: {
    positioning: "Make every machine smarter.",
    body:
      "Companion is Lumin's smart sensor system for gym machines. It attaches to traditional machine-based equipment and tracks the data that usually gets lost — force, speed, reps, range of motion, and performance quality. It makes any compatible piece of equipment smarter, giving members better feedback, trainers better visibility, and operators a modernized gym floor without replacing their existing machines.",
    points: [
      ["Smart Equipment Sensor", "Turns existing machines into intelligent training tools without a full equipment replacement."],
      ["Machine-Based Performance Tracking", "Captures meaningful strength data that traditional machines do not provide."],
      ["Member Feedback Loop", "Helps members understand not just what they lifted, but how they moved."],
      ["Trainer Visibility", "Gives coaches more objective insight between sessions and over time."],
      ["App + Integration Layer", "Lets operators add Lumin intelligence without forcing a separate member journey."],
    ],
  },
};

/**
 * Where each hero-film brief sends the visitor. Keys are the slug the hero
 * already builds from the product label (lowercased, spaces to hyphens).
 */
export const HERO_TO_PAGE: Record<string, string> = {
  loops: "loops",
  core: "core",
  connect: "connect",
  "command-center": "command-center",
  "asset-management": "asset-management",
  academy: "academy",
  // Trainer and Companion ARE Move — they land on its page, at their own
  // anchor, rather than on a page of their own.
  trainer: "move#trainer",
  companion: "move#companion",
  station: "station",
  studio: "studio",
  fuel: "fuel",
  mrkt: "market",        // film says MRKT, ecosystem says market
};

/**
 * WHICH SCENE OF THE FILM SHOWS THIS PRODUCT.
 *
 * The inverse of HERO_TO_PAGE, so a product page can offer "Back to the gym"
 * even to someone who arrived from the ecosystem and has never seen the film.
 * Move maps to the Trainer scene — the film gives Trainer and Companion a scene
 * each, and Trainer is the one a visitor meets first.
 */
export const SCENE_FOR: Record<string, string> = {
  loops: "check-in",
  core: "check-in",
  connect: "connect",
  "command-center": "command-asset",
  "asset-management": "command-asset",
  academy: "academy",
  move: "trainer",
  studio: "studio",
  station: "station",
  market: "mrkt",
  fuel: "fuel",
};

export type ProductPage = ProductHud & {
  /** full path to the ambient clip, or null if the product has no plate */
  ambient: string | null;
  tone: "pro" | "one";
  /** products expressed THROUGH this one, with the film's own brief copy */
  /** the film stop that shows this product, for "Back to the gym" */
  scene: string;
  contains: { product: string; anchor: string; brief: Brief; detail?: { positioning: string; body: string; points: [string, string][] } }[];
};

export const productPage = (id: string): ProductPage | null => {
  const p = ECO_PRODUCTS.find((x) => x.id === id);
  if (!p) return null;
  const clip = AMBIENT[id];
  const contains = (CONTAINED[id] ?? [])
    .map((name) => ({
      product: name,
      anchor: name.toLowerCase(),
      brief: briefFor(name),
      detail: CONTAINED_DETAIL[name],
    }))
    .filter((c) => Boolean(c.brief)) as ProductPage["contains"];
  return {
    ...p,
    ambient: clip ? `/media/hero-film/1080/${clip}` : null,
    tone: p.suite === "Lumin Pro" ? "pro" : "one",
    scene: SCENE_FOR[id] ?? "check-in",
    contains,
  };
};

export const allProductIds = () => ECO_PRODUCTS.map((p) => p.id);
