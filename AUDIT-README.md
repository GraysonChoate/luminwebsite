# Lumin Landing Page — Design Audit Package

Scroll-driven cinematic landing page (work in progress). Mechanics are modeled
on terminal-industries.com's interaction architecture; all visuals/copy are
Lumin's own. Media slots contain PLACEHOLDERS (procedural canvas frames,
gradient panels) — judge structure, motion, and layout, not final art.

## What's in here
- `source/` — the real code (Next.js 16 + GSAP + Lenis)
  - `app/globals.css` — brand tokens (Brand Guide V4 colors), type scale
  - `lib/copy.ts` — every copy slot on the page
  - `lib/motion.ts` — eases + motion foundation
  - `components/sections/` — one file per page section, in page order:
    Hero (canvas frame scrub + cycling headlines), Partners (logo wall),
    ProductStory (pinned 01–06 steps + odometer), BrandReveal (letters
    converge, dark beat), About, Contact, Footer
  - `components/ui/` — FrameScrubber, NotchDivider (seam shape), Odometer,
    SplitChars
  - `components/PageLoader.tsx`, `components/NavPill.tsx`
  - (`SegmentSelector.tsx` exists but is currently unmounted)
- `rendered/` — static HTML/CSS/JS export. Open `rendered/index.html` via a
  local web server (not file://) to scroll the actual page, e.g.:
  `python3 -m http.server -d rendered 8000` → http://localhost:8000

## Brand constraints for any suggestions
- Colors must come from Brand Guide V4: Supernova #5270FF, Cosmos #212121,
  Light #FFFFFF, Aurora #863399, Meteor #D1D1D4; pop accents (Galaxy #E3FF70,
  Nebula #FF5E2E, Flare #FF004B, Stellar #00FFBA) for accent moments only —
  never full-screen backgrounds. Do not invent new hex values.
- Type: Heebo (primary), Montserrat (nav/labels).
- Section order is locked: Loader → Hero → Partners → Product Story →
  Brand Reveal → About → Contact → Footer.
