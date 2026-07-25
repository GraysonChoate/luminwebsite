# Ecosystem — build status & handoff (2026-07-24 — IDLE LOOP DONE, Phase A complete)

Cross-account handoff for the Lumin ecosystem visualization. Read this first before touching `public/eco/`.

## ✅ MASTER FRAME IS FINAL — `public/eco/hub/COMMAND-HUB-FINAL.png`

2048×1156. Also archived at `01-specs/ecosystem-refs/COMMAND-HUB-FINAL-v6-colorgraded.png`. **This is canon. Do not regenerate it.**

The floating holographic command hub: a wide elliptical disc suspended high above a constellation floor, dark gap between them, single white-blue projection beam rising from the floor's activation point into the central Lumin nucleus. Low oblique camera. Eleven small tiered plinth nodes distributed across the disc, each a distinct colour, each railed back to the central ring.

**Verified by direct crop-count:** 6 nodes left (Lumin Pro — violet-purple, salmon-red, amber-orange, crimson-red, magenta-pink, purple-magenta), 5 nodes right (Lumin One — royal blue, cyan-blue, teal, green, yellow-lime). 11 total. Centre nucleus is the neutral Lumin brand mark, tied to no product.

**How it got here:** GPT/Codex produced the hex-plinth structural reference (`01-specs/ecosystem-refs/hexnode-reference-v2-source.png`) → Seedream v5 Pro pass fixed node count, distinct colours, plinth style, and restored the float/scale composition (`hexnode-v3-precolorgrade.png`, prompt at `hexnode-v3-prompt.txt`) → **the user did the final colour grade themselves in Canva.** After repeated failed automated colour-match attempts, this was the right call — see the rule at the bottom.

**Node coordinates:** `public/eco/hub/node-coords.json` (and same file in `01-specs/ecosystem-refs/`). ⚠️ These are **PROVISIONAL** — read off crops, good enough to plan against, but must be re-verified by overlaying markers on the image before wiring real DOM hit areas. Product-to-colour-slot assignment is not yet decided.

---

## ▶️ ANIMATION PHASES — Phase A complete, B/C/D open

The architecture is unchanged: **a state machine of pre-rendered clips wearing the costume of an interactive object.** Idle loop → click → transition → focus state → return → idle.

**The one constraint that dominates everything: THE CAMERA NEVER MOVES.** No push-in, no drift, no zoom, no pan. Every clip must cut against every other invisibly. Image-to-video models add a slow push-in by default — it must be explicitly forbidden and then verified, not assumed.

### Phase A — Idle loop — ✅ DONE (2026-07-24), user-approved

**Deliverables, all in `public/eco/hub/`:**

| File | What it is |
|---|---|
| `COMMAND-HUB-HOLOGRAM-v3.png` | **New still canon.** `COMMAND-HUB-FINAL.png` re-rendered as a photoreal volumetric hologram, de-hazed, black void. Same composition, same 11 nodes, same positions. This is the frame the idle loop and every future click-state start from. |
| `eco-idle-hologram-master.mp4` | Approved idle loop, full quality, 5s 1080p |
| `eco-idle-hologram.mp4` / `.webm` | Web encodes, 1.1MB / 828KB |
| `eco-idle-hologram-poster.jpg` | Poster frame |
| `idle-loop.html` | The looping component — drop-in markup + script |

**Two-step pipeline that worked:** (1) Nano Banana Pro re-rendered the master still into real holographic light — volumetric shafts, ~40% translucency, light falloff, scanlines, chromatic aberration on hard edges, dust motes in the beams. Then a second pass removed the haze, a third pushed the background to black. One change per pass, each approved before the next. (2) Seedance 2.0 image-to-video off that frame, `start_image == end_image`, 5s 1080p.

**What animates:** flumes streaming up from the emitter · particles rising off the base · light flowing upward inside the Lumin orb · floor traces rippling at the beam contact point · spatial-mapping figures popping and fading at random spots on the table · rings and rails blooming outward in brightness from the nucleus · all 11 orbs pulsing out of sync.

#### The rules this phase actually taught — read these before generating any further clip

1. **NEVER describe anything as travelling ACROSS the structure.** "A wave propagates outward across the circular platform" made Seedance *rotate the entire table* — nodes landed in new positions, colour order scrambled, count broke. Describe the same visual as pieces **gaining and losing brightness exactly where they already sit**, "like lamps switching on in sequence along a fixed circuit board." Identical result on screen, zero rotation. This single rewrite is what unblocked the whole phase.
2. **Prohibitions suppress motion — budget them.** A prompt that was ~60% "no/never/nothing" produced the deadest clip of the run (mean frame delta 0.461 vs 0.806). The model satisfies a wall of don'ts by doing nothing. Put the motion description in the body, compress the structural locks into ~4 lines at the end. Rebalancing alone bought +51% motion.
3. **Never write "almost imperceptible."** You will get imperceptible. Say "small in amplitude but clearly visible, and continuous — nothing ever freezes."
4. **Say "continuous," not "settles."** Effects that "settle" fire once and stop. An idle state needs things that never stop.
5. **Longer is NOT better.** Re-rendering the winning 5s prompt at 10s diluted it — the same activity budget spread over twice the time, and the mapping pops and ripples thinned out to nothing (0.682 vs 0.706). If the 5s cycle ever feels repetitive, generate a **second 5s variant** and alternate, don't stretch.
6. **Measure motion, don't eyeball it:** `ffmpeg -vf "tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG"` → mean YAVG. Working range for this scene is ~0.70–0.81. Below ~0.5 it reads as a still image.
7. **Check a mid-clip frame BEFORE showing the user.** Rotation and invented objects are obvious in one frame and cost nothing to catch.
8. **Watch for invented UI glyphs.** "Triangulation meshes / lattice nodes / angular fragments" made the model draw literal brackets above the orbs and triangles on the table. Phrase table activity as *the table's own existing circuitry brightening and dimming*, and ban markers/glyphs/brackets/arrows/triangles explicitly.
9. **Reflections are a trap.** Asking for "subtle reflections of the orbs on the floor" produced eleven full-height searchlight columns. If the floor needs work, *remove* rather than *replace* — a subtractive prompt is far safer than an additive one.

**The loop seam — confirmed, and solved in the browser, not in ffmpeg.** Even with `start_image == end_image` the clip does not return to its start: the seam measured 1.84 against a 0.72 baseline, and an exhaustive search of every frame in the last 1.4s found nothing better than 1.30. In-file crossfades bottomed out around 1.25. **The fix is `idle-loop.html`:** two copies of the clip, the incoming one restarted on top and faded in over 0.6s.

⚠️ **The bug to not repeat:** fading *both* layers at once composites to `t·new + (1-t)²·old`, which sums to **0.75 at the midpoint — a visible 25% darkening every single loop.** The user caught it immediately. Only the top layer may animate opacity; the outgoing layer stays fully opaque underneath. Verified back at a flat 1.000 composite weight.

### Phase A.1 — clean-floor variant — IN PROGRESS, not yet approved
The master still has soft colored haze patches on the floor under the orbs. The user flagged them as messy for a build that will carry UI overlays. A subtractive edit removing them (`hologram_v5_cleanfloor.png`, scratch) looked right, but the re-run off it invented UI glyphs above the orbs and was rejected. A further re-run with an explicit marker ban is pending. **`eco-idle-hologram-master.mp4` remains the approved deliverable until something beats it.**

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
