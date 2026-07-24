# Ecosystem — build status & handoff (2026-07-24, updated — MASTER FRAME LOCKED, v5-final)

Cross-account handoff for the Lumin ecosystem visualization. Read this first before touching `public/eco/`.

## ✅ CURRENT MASTER — the floating command hub, LOCKED and APPROVED
**`public/eco/hub/COMMAND-HUB-MIRRORED.png`** = `01-specs/ecosystem-refs/COMMAND-HUB-MIRRORED-v5-final.png` — Lumin Pro (6 nodes) on the viewer's LEFT, Lumin One (5 nodes) on the RIGHT, **11 orbs total (verified — a 12-orb duplicate-blue bug was caught and fixed on the way here, see below)**. This is the actively-maintained orientation — every fix past the initial lock was applied to this one specifically.

### What's correct in v5-final, verified
- 11 orbs, exact count confirmed by direct crop-count on both sides (not just trusted) — 6 left (2 orange/Move+Station-adjacent... see taxonomy below, 2 red, 2 purple), 5 right (2 blue-family, teal, lime, green).
- Core relocated to the front-left rail (not the recessed rear position from the initial lock), Academy moved with it.
- All 11 orbs uniform size — the original brief's large/small hierarchy is superseded per explicit user instruction.
- Centre icon: three-bar mark legible, centre bar deliberately slightly taller than the two flanking bars, radiant/blown-out with dense fine light-streak detail through the beam and rings.
- Orb hues individually correct (verified per-orb, not just glanced at — this mattered, see below).

### ⚠️ OPEN — ambient colour grade is NOT an exact match to the user's reference
The user has an exact colour reference in mind (a specific earlier render, still on disk at `01-specs/ecosystem-refs/` from this same lineage — check chat history / the compose script trail if picking this back up, the file itself wasn't separately named). Multiple attempts to close this gap tonight **made things worse and were discarded**:
1. A masked local pixel-correction (protect saturated pixels, pull red down elsewhere) — **broke hues**: orange/purple orbs shifted toward teal/cyan. Discarded.
2. A second, differently-masked local attempt — same failure mode, still broke orb colours. Discarded.
3. A full LAB-space statistical colour-transfer (Reinhard-style mean/std matching against the reference) — **also broke hues**: orange shifted toward pink. Discarded.
4. Two Seedream regeneration passes (image-to-image, explicit colour-only instructions) — didn't break anything, but under/over-shot the target and one of them reintroduced red contamination as a side effect of an unrelated "increase icon radiance" pass done in between.

**Lesson, if this resumes:** every FULLY AUTOMATED attempt at this specific colour-match tonight failed, three of them destructively. The one thing that partially worked (without breaking hues) was a narrowly-scoped Seedream regeneration pass with an explicit reference image — slow, needs verification by eye each time (not just a numeric proxy — a single-patch R/B ratio measurement proved actively misleading twice, since it doesn't distinguish "the ambient wash is off" from "an orb happens to sit in the sampled patch"). If picking this up again: (a) use Seedream only, not local pixel/LAB math — the failure mode there is destructive, not just imprecise; (b) verify by eye on the full image AND by cropping individual orbs, not by trusting one aggregate number; (c) do it as its own isolated task on a rested pass, separate from any other change.

v4 (pre-relocate/pre-rebalance, One-left/Pro-right or Pro-left/One-right) and the intermediate steps between the initial lock and v5-final are preserved in `01-specs/ecosystem-refs/COMMAND-HUB-MIRRORED-v2-*` through `-v4-*` for full lineage.

**`public/eco/hub/COMMAND-HUB-MASTER.png`** — the ORIGINAL orientation (One left / Pro right). **Stale — has NOT received the fixes below** (still has the old big/small orb hierarchy, Core still sitting rear-left unfixed). If this orientation is wanted again, regenerate it as a pure horizontal mirror of the current `COMMAND-HUB-MIRRORED.png` (the same zero-cost, zero-risk technique used earlier — the icon is bilaterally symmetric and survives a flip intact) rather than resuming edits on the stale file directly.

Both fully satisfy the master brief at `01-specs/ecosystem-command-hub-brief.md` (outside the repo — the two full verbatim spec documents the user wrote: hub/node/nucleus design + page positioning/floor/transition rules). Read that file before generating anything else for this section.

### Fixes applied on top of the initial lock (2026-07-23 night, chronological — full lineage preserved in `01-specs/ecosystem-refs/COMMAND-HUB-MIRRORED-v2-*` and `-v3-*`)
1. **Core relocated** from a recessed rear-left position onto a specific rail terminus that was dangling with no orb attached (front-left, near the red orb cluster) — not just resized in place, actually moved. Academy (its small companion) moved with it.
2. **A duplicate stray orb removed** — the relocation edit left a small leftover lavender orb floating alone near Core's old position; deleted, platform surface patched seamlessly.
3. **All eleven orbs resized to one uniform scale** — the original "3 large primary + 3 small secondary" hierarchy on the Pro side (specified in the original brief) was explicitly overridden by the user: *"every orb should be the same size!!"* This is now the standing rule, superseding that part of the original brief. Orbs un-paired into fully independent nodes, redistributed so Pro's 6 and One's 5 occupy the same overall footprint/reach from the nucleus (Pro's necessarily a bit tighter since it has one more), with matching front-to-back depth variation added to both sides so neither reads as flatter than the other.

**Verified after every single one of the above, by tight crop, not by eyeballing the full frame:** the centre nucleus/icon survived unchanged each time. This mattered — the icon has been the single most fragile element across the whole night's work.

### NEXT — in progress
**Grow the centre Lumin icon/nucleus slightly larger** — requested, not yet executed. Deliberately queued as its own isolated pass on top of the now-approved rebalanced frame, specifically because the icon is the most fragile element and should never be bundled into the same generation as a structural change. Once done and crop-verified, that becomes the new master.

**What's in the frame, verified:**
- Command hub floats above a separate constellation floor, real dark gap between them, single vertical white-blue beam connecting the floor's activation point to the nucleus — the floor/float/gap/beam requirement that two prior attempts completely missed.
- Eleven product orbs, correct count, correct colors, correct positions, correct Pro primary+secondary size/proximity hierarchy — matches the brief's exact color list.
- **Node material fixed** — coherent glowing energy spheres with internal volumetric currents and a hot white core, NOT glass/gem. Verified by tight crop: `01-specs/ecosystem-refs/COMMAND-HUB-v1-node-material-verify-crop.png`. This was the material regression that broke two prior Seedream attempts (`nodes/commandtable-seedream-v1.png` and its predecessor) — fixed this time by explicitly naming and forbidding "faceted cut-gem geometry / jewelry prong mounts / opaque brushed metal housing" in the prompt, not just asking for "not a gem."
- **Center icon fixed** — clean, legible three-bar Lumin mark, correct proportions, not a crescent/smudge. Verified by tight crop: `01-specs/ecosystem-refs/COMMAND-HUB-v1-icon-verify-crop.png`. Fixed by feeding the flat brand-mark file (`Brand Assets/Logos/lumin_logo_circle_blue_three_i_white_transparent.png`) as a second reference specifically for bar shape, separate from the structural reference image.

**How it was made (reproducible):** ONE Seedream v5 Pro pass, two image references — (1) the approved GPT/Codex command-table structure image for layout/nodes/routing/colors, (2) the flat Lumin icon file for exact bar shape — plus a prompt that explicitly encodes the floor/float composition and forbids the two known failure modes by name. Full prompt saved at `01-specs/ecosystem-refs/command-hub-v1-prompt.txt`. The mirrored variant is a plain local horizontal flip (`PIL Image.transpose(FLIP_LEFT_RIGHT)`) — no regeneration, zero risk to the verified fixes, since the icon is bilaterally symmetric and survives a mirror intact (re-verified by crop after flipping).

## ⚠️ SUPERSEDED — do not resume, kept only as history
1. **The wireframe HUD sphere** (`public/eco/refs/hud*`, old `MASTER-FINAL.png`). Died after repeated icon-accuracy failures.
2. **The oblique orbital-beacon system** (`public/eco/nucleus/`, `public/eco/orbital/`). Nucleus and empty scaffold got locked, but node placement on the scaffold was rejected twice (read as "stupid jewels" / lost all atmosphere). Also had its own unfixed icon defect.
3. **Command table WITHOUT the floor** (`public/eco/nodes/commandtable-seedream-v1.png` and its GPT source). Correct hub structure, but missing the floor/float composition entirely, plus the gem-material and wrong-icon defects. Directly superseded by the locked master above, which fixes all three at once.

## Taxonomy — CONFIRMED FINAL, 11 nodes total (re-verify against `project_lumin_product_taxonomy` memory if in doubt)
- **Lumin One — 5 nodes, equal scale:** Move `#5270FF`, Station `#40DCFF`, Fuel `#00FFBA`, Studio `#5FFF59`, MRKT `#E3FF70`.
- **Lumin Pro — 3 primary:** Core `#863399` (a real product, the Mindbody-competitor OS — **NOT the center icon**), Connect `#FF5E2E`, Loops `#FF004B`.
- **Lumin Pro — 3 secondary**, docked beside their primary via size+proximity: Academy `#C59BFF` (near Core), Asset Management `#FF9A70` (near Connect), Command Center `#FF6B93` (near Loops).
- **Center icon = the neutral Lumin brand mark only**, tied to no single product.

## NEXT (in order, resume here)
1. **Pick left/right orientation** — original vs. mirrored. User's call, not yet made.
2. **Extract product-orb screen coordinates** from the locked master (pixel-measure, don't eyeball — same discipline as the icon/material crops) so DOM overlay hit-areas can be positioned. Needed before any click-interaction work.
3. **Regenerate the idle-loop animation** from the locked master (Kling 3.0 recipe further down is still mechanically valid, art direction changed).
4. **Transition sequence** — the full narrative in `01-specs/ecosystem-command-hub-brief.md` Part 2: hero resolves to icon → icon descends to floor activation point → rings activate → beam rises → hub assembles → idle. Not yet built. The floor asset referenced there should be confirmed as the same constellation floor already used elsewhere in the site's opening (check `public/frames/transition/` / orb-transition assets from the opening sequence work) rather than a new environment.
5. Boot-up bridge clip, per-node focus clips, wire into the ecosystem section — same state-machine architecture as always planned.

## Hard-won rules — still apply, read before generating
1. **"Photoreal" means photoreal LIGHT, not a photoreal solid object.** The single costliest mistake of the whole command-hub saga: asking Seedream for "real anodized metal, physically accurate specular highlights, a housing" turned a hologram into jewelry. If nodes or infrastructure ever drift toward looking like a physical object again, this is almost certainly why — the fix is describing light behavior (bloom, internal volumetric currents, translucency, emission), never surface material properties like metal/gem/glass.
2. **Lock small pieces in isolation before the big scene**, where possible — but a single well-built prompt that explicitly names and forbids the exact known failure modes CAN solve multiple defects in one pass (this master frame fixed the floor, the material, AND the icon simultaneously, in one generation, once the prompt was precise enough). Isolation is the fallback when a combined attempt fails, not always the mandatory first move.
3. **When fixing any small detail, crop tightly and do a direct pixel-level side-by-side against ground truth before declaring it correct.** Eyeballing a full-width frame has missed real problems more than once; a plain crop-and-compare caught them immediately every time it mattered.
4. **A pure geometric transform (flip/crop/resize) done locally costs nothing and risks nothing** — use it instead of regenerating when the change is purely positional (e.g. mirroring left/right) and the content itself doesn't need to change. Re-verify anything content-sensitive (like a logo) survived the transform correctly rather than assuming.
5. **Never lock/save anything as canon without showing the user first and getting explicit approval.** (This master frame WAS explicitly approved and saved.)
6. **Commit and push before ending a session, especially if credits/time are running low.** A prior session's work sat uncommitted for a full session and nearly got lost because of this.
7. **The user's real reference screenshots live in a Finder folder outside git:** `Official Lumin Website Folder/NEW ECO SYSTEM IMAGE REFERENCES/` — feed these directly as `--image-references`, not just described in text.

Fuller narrative and all prior superseded history: `../../../CONTEXT.md` §10 (outside the repo) and the local Claude memory `project_lumin_ecosystem_rebuild` + `project_lumin_product_taxonomy`.
