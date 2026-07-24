# Ecosystem — build status & handoff (2026-07-24 — MASTER FINAL, moving to animation)

Cross-account handoff for the Lumin ecosystem visualization. Read this first before touching `public/eco/`.

## ✅ MASTER FRAME IS FINAL — `public/eco/hub/COMMAND-HUB-FINAL.png`

2048×1156. Also archived at `01-specs/ecosystem-refs/COMMAND-HUB-FINAL-v6-colorgraded.png`. **This is canon. Do not regenerate it.**

The floating holographic command hub: a wide elliptical disc suspended high above a constellation floor, dark gap between them, single white-blue projection beam rising from the floor's activation point into the central Lumin nucleus. Low oblique camera. Eleven small tiered plinth nodes distributed across the disc, each a distinct colour, each railed back to the central ring.

**Verified by direct crop-count:** 6 nodes left (Lumin Pro — violet-purple, salmon-red, amber-orange, crimson-red, magenta-pink, purple-magenta), 5 nodes right (Lumin One — royal blue, cyan-blue, teal, green, yellow-lime). 11 total. Centre nucleus is the neutral Lumin brand mark, tied to no product.

**How it got here:** GPT/Codex produced the hex-plinth structural reference (`01-specs/ecosystem-refs/hexnode-reference-v2-source.png`) → Seedream v5 Pro pass fixed node count, distinct colours, plinth style, and restored the float/scale composition (`hexnode-v3-precolorgrade.png`, prompt at `hexnode-v3-prompt.txt`) → **the user did the final colour grade themselves in Canva.** After repeated failed automated colour-match attempts, this was the right call — see the rule at the bottom.

**Node coordinates:** `public/eco/hub/node-coords.json` (and same file in `01-specs/ecosystem-refs/`). ⚠️ These are **PROVISIONAL** — read off crops, good enough to plan against, but must be re-verified by overlaying markers on the image before wiring real DOM hit areas. Product-to-colour-slot assignment is not yet decided.

---

## ▶️ NEXT PHASE — turn the master into a looping animation

The architecture is unchanged: **a state machine of pre-rendered clips wearing the costume of an interactive object.** Idle loop → click → transition → focus state → return → idle.

**The one constraint that dominates everything: THE CAMERA NEVER MOVES.** No push-in, no drift, no zoom, no pan. Every clip must cut against every other invisibly. Image-to-video models add a slow push-in by default — it must be explicitly forbidden and then verified, not assumed.

### Phase A — Idle loop (do this first)
Image-to-video off `COMMAND-HUB-FINAL.png`. What moves, and nothing else:
- Core nucleus breathing pulse
- Rings rotating slowly
- Light pulses travelling outward along the rails to each node
- Node emitters pulsing slightly out of sync with one another
- Particulate drift, beam shimmer, subtle scanline persistence

**Motion strength LOW.** Failure mode is drama — if a still from the middle of the clip doesn't look like the master, it's wrong.

**Solving the loop seam — do NOT trust the model to do it:**
- **Recommended: crossfade loop in post** (ffmpeg, ~0.5s dissolve end→start). Works with directional motion (rotation, travelling pulses).
- Alternative: **boomerang** (forward + reversed concat) is mathematically guaranteed seamless, but reverses direction — rotation and travelling pulses would visibly run backwards. Only viable if those are dropped. (This technique WAS used successfully for the simpler `orb-stationary` opening clip.)

**Verify:** sample first and last frames numerically and confirm they match; confirm the disc hasn't drifted, rescaled, or changed framing vs. the master.

### Phase B — Boot-up / arrival transition
Per the brief in `01-specs/ecosystem-command-hub-brief.md` Part 2: hero resolves to the icon → icon descends to the floor's activation point → concentric rings fire outward across the floor → beam rises → hub assembles outward from the nucleus → settles into idle. **Its final frame must be pixel-identical to the idle loop's first frame** or the handoff visibly jumps.

### Phase C — Node focus states — RECOMMEND DOING THIS IN CODE, NOT VIDEO
Do not generate 11 focus clips. Instead: brighten the clicked node, dim the rest, scale its bloom, open the info card in the dark margin — all in CSS/canvas over the looping video. Reasons this is better, not just cheaper:
- Omeed explicitly warned the taxonomy will consolidate again — code re-composes instantly, 11 baked clips don't
- Zero registration/drift risk
- Instant response instead of waiting on a clip to play

### Phase D — Wire it up
Idle video autoplay/muted/loop in the ecosystem section · transparent hit areas at the verified node coordinates · labels and info cards as DOM overlays on top (never baked into the render) · boot-up triggered on scroll-in.

---

## ⚠️ SUPERSEDED — kept only as history, do not resume
1. **The wireframe HUD sphere** (`public/eco/refs/hud*`). Died after repeated icon-accuracy failures.
2. **The oblique orbital-beacon system** (`public/eco/nucleus/`, `public/eco/orbital/`). Node placement on the scaffold was rejected twice.
3. **The glass-sphere command table** (`public/eco/hub/COMMAND-HUB-MASTER.png`, `COMMAND-HUB-MIRRORED.png`, `public/eco/nodes/`). This was the previous master — large glass orbs on an oval platform. Superseded by the hex-plinth `COMMAND-HUB-FINAL.png`.

## Hard-won rules — read before generating anything
1. **"Photoreal" means photoreal LIGHT, not a photoreal solid object.** Asking for real metal / anodized surfaces / housings turns the hologram into jewelry. Describe light behaviour (bloom, volumetric scatter, translucency, emission, fresnel), never surface material.
2. **Protect what you are NOT changing, explicitly and in detail.** The costliest error of this whole build: a prompt focused entirely on node count/colour/shape silently lost the float composition, the camera angle, and the node-to-disc scale ratio, because those were only mentioned in one throwaway clause. When feeding two references, state each one's role explicitly (image 1 = composition/camera/scale authority, image 2 = colour/count authority) and give scale relationships numerically ("each node is ~1/12 the disc's width").
3. **Count and measure by cropping and looking — never trust automated blob/peak detection on a glowing image.** Bloom halos and particle texture over-segment into hundreds of false positives. Crop each side, zoom, count by eye.
4. **Isolate one change per pass.** Bundling several new visual ideas makes it impossible to tell which one caused a rejection.
5. **Exact colour-grade matching: hand it to the user.** Multiple automated attempts failed here, three of them destructively (masked pixel correction and LAB statistical transfer both broke individual node hues — orange→teal, orange→pink). A real editor (Canva/Photoshop/Lightroom) does this in minutes with eyedropper precision. Offer the handoff instead of iterating blindly.
6. **Never lock/save anything as canon without showing the user first and getting explicit approval.**
7. **Commit and push before ending a session.** Work has sat uncommitted and nearly been lost twice.
8. **The user's reference screenshots live outside git** in `Official Lumin Website Folder/` and `NEW ECO SYSTEM IMAGE REFERENCES/` — feed them directly as `--image` references, not just described in text.

Fuller narrative: `../../../CONTEXT.md` §10, the full spec at `../../../01-specs/ecosystem-command-hub-brief.md`, and memory `project_lumin_ecosystem_rebuild` + `project_lumin_product_taxonomy`.
