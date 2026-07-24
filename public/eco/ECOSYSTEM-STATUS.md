# Ecosystem — build status & handoff (2026-07-23, updated — command-table direction)

Cross-account handoff for the Lumin ecosystem visualization. Read this first before touching `public/eco/`.

## ⚠️ SUPERSEDED — do not resume either of these, kept only as history
1. **The wireframe HUD sphere** (`public/eco/refs/hud*`, old `MASTER-FINAL.png`). Died after repeated icon-accuracy failures.
2. **The oblique orbital-beacon system** (`public/eco/nucleus/`, `public/eco/orbital/`). The nucleus (`NUCLEUS-FINAL.png`) and empty scaffold (`SCAFFOLD-FINAL.png`) got locked, but **node placement on that scaffold was rejected twice**: a full-loop-scattered attempt read as "stupid jewels" with zero visible suite grouping; a follow-up fix solved grouping/shape but stripped out all atmosphere/richness, reading as a cheap flat diagram. User's verdict: keep only the floor and the orb's position, reset everything else. Also found: `NUCLEUS-FINAL.png`'s icon bars have no visible rounded tops under close inspection — melted into generic smudges by the exposure treatment. Not fixed before the pivot below happened.

## ✅ CURRENT DIRECTION — the "command table"
User showed 2 ChatGPT reference images of a **holographic command table**, now saved at:
`Official Lumin Website Folder/NEW ECO SYSTEM IMAGE REFERENCES/Generated image 1 (30).png` and `(31).png`
(also `Reimagined Lumin ecosystem structure.png` / `Refined orbital ecosystem.png` — those two are an earlier swirl/galaxy variant the user already rejected; **don't confuse them with the command-table pair**, they look nothing alike.)

**What makes the command table work, per the user and confirmed by direct analysis:**
- One unified circular platform (isometric view) — not arcs/orbits floating in a void.
- Every node docked on its own individual pedestal — a literal address, not a point on a line.
- Suite grouping via BOTH spatial clustering AND physical rectilinear circuit-trace pathways wiring each node back to the core — a traceable connection, not just a thin tether.
- Pro's main/subordinate hierarchy solved via size + proximity pairing (big node + small node docked beside it) — no separate visual system needed.
- Reads as a tactical hologram instrument, not a solar system.

**Named flaws in GPT's native render (fix in the Seedream pass, don't just copy blindly):**
- Too dense — circuit patterning covers nearly the whole platform, no negative space left for future link/copy overlays.
- Surface quality is plasticky/rough — needs a Seedream light pass for photoreal bloom, material depth, polish.
- **Watch specifically:** Seedream's extra sparkle/refraction tends to push the node material toward "gem/glass button" — it must read as a coherent power-core light source in a housing, not a jewel. Say this explicitly in the prompt.

## Taxonomy — CONFIRMED FINAL, 11 nodes total (gotten wrong multiple times before, re-verify against `project_lumin_product_taxonomy` memory if in doubt)
- **Lumin One — 5 main nodes:** Move, Fuel, Market, Station, Studio. Cool spectrum sweep: Supernova blue → Stellar mint → Galaxy lime.
- **Lumin Pro — 3 main nodes:** Core (a real product, the Mindbody-competitor OS — **NOT the center icon**), Connect, Loops. Aurora violet anchor + Nebula/Flare accents.
- **Lumin Pro — 3 smaller subordinate nodes:** Academy, Asset Management, Command Center. Docked beside their related main via size+proximity, per the command-table pattern above.
- **Center icon = the neutral Lumin brand mark only**, tied to no single product.

## A Seedream attempt already happened — `public/eco/nodes/commandtable-seedream-v1.png`
Pipeline: fed GPT's command-table image + the real `public/assets/lumin-icon.png` into a Seedream v5 Pro pass for photoreal polish, kept structure/grouping/hierarchy, thinned density.

**What landed well:** floor reflection is genuinely realistic (real reflective surface, specular reflections of each node's glow — not a flat printed texture). Density fixed — real dark negative space between nodes, circuit pathways still visible. Overall photoreal quality is a real step up. Suite grouping and hierarchy held.

**Two real defects, not yet fixed:**
1. **Nodes drifted toward "gem" again** — rendering as glass/gem buttons in metal rims, exactly the material regression flagged as a risk going in.
2. **Center icon is actively wrong, not just unfixed** — it's not the 3-bar mark at all; rendered as some kind of crescent/moon shape. Feeding the real icon file as a reference did not take this time.

## NEXT (in order, resume here)
1. **Fix the node material and the center icon** — two isolated passes, don't bundle (see rule below). Node fix: be more explicit/forceful in the prompt about "coherent light in a housing, not glass/gem, no refraction sparkle." Icon fix: consider the nucleus-recipe pattern below (isolate the icon alone, verify by tight crop, then re-composite) rather than trusting one global Seedream pass to get a small detail right inside a large busy frame — that exact failure mode already cost 5+ regenerations once on the sphere-era nucleus.
2. Once both are clean, get user approval, then this becomes the new master frame.
3. Regenerate the idle-loop animation from the locked master (Kling 3.0 recipe below is still mechanically valid).
4. Boot-up bridge clip, per-node focus clips, wire into the ecosystem section — same state-machine architecture as always planned.

## Hard-won rules — still apply, read before generating
1. **Lock small pieces in isolation before the big scene** where possible. Fixing a small detail (an icon, a node) buried inside a large complex render is slow and unreliable — isolating it first is cheap and fast to verify.
2. **When fixing any small detail, crop tightly and do a direct pixel-level side-by-side against ground truth before declaring it correct.** Eyeballing a full-width frame has missed real problems more than once; a plain crop-and-compare caught them immediately.
3. **Verify a "ground truth" reference file is actually still correct before trusting it** — don't assume a file's existence means it's the right version.
4. **Don't try to fix organic glow/bloom art with manual pixel compositing** (crop+stretch+paste) — produces visibly smeared, distorted results. Regenerating with a precise, correctly-targeted image reference is more reliable.
5. **Isolate one change per pass** — never bundle multiple new visual ideas into one generation.
6. **Never lock/save anything as canon without showing the user first and getting explicit approval.**
7. **The user's real reference screenshots live in a Finder folder outside git:** `Official Lumin Website Folder/NEW ECO SYSTEM IMAGE REFERENCES/` — feed these directly as `--image-references` when the user points at one, rather than only describing them in text. Gotcha: some filenames contain a narrow no-break space (U+202F) instead of a normal space before "PM" — `ls`/hardcoded paths can silently fail to find them; list the directory and substring-match to get the exact filename first.
8. **Commit and push before ending a session, especially if credits/time are running low.** This file went stale and real generated work sat uncommitted for a full session because that didn't happen — nearly lost.

## Nucleus recipe (repeatable — from the orbital-era nucleus fix; may still be useful for the command-table icon defect)
```
# Step 1 — isolated structure, ground-truth icon file as reference, NO scene around it
higgsfield generate create gpt_image_2 \
  --prompt "<isolated tight nucleus study: bright white-blue beacon, exact icon silhouette
  from reference inside it, corona, thin rays, feed-beam rising from below, deep black
  void, no floor, no rings, no other elements>" \
  --image-references "public/assets/lumin-icon.png" \
  --aspect_ratio 1:1 --resolution 2k --wait

# Step 2 — push exposure / refine, one change at a time, verify each with a tight crop
higgsfield generate create seedream_v5_pro \
  --prompt "<keep exact composition; ONE targeted change>" \
  --image "<previous output>" --aspect_ratio 1:1 --resolution 2k --wait
```

Fuller narrative, the full verbatim creative brief for the orbital era, and all prior superseded history: `../../../CONTEXT.md` §10 (outside the repo) and the local Claude memory `project_lumin_ecosystem_rebuild` + `project_lumin_product_taxonomy`.
