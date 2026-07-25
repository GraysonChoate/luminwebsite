# Transition Clip 1 — "Return to Source" — build brief & handoff

**Read `ECOSYSTEM-STATUS.md` in this folder first.** It has the approved Phase A deliverables and the nine prompt rules that were earned the hard way. This document assumes you have read it.

---

## 0. OPERATING RULES — read before doing anything

1. **Generate nothing until the user explicitly says to.** No images, no video, no test renders, no "quick checks." The user directs each step. Wait for an explicit go on each one.
2. **Do not write anything into the project folder or git until the user approves that specific artifact.** Previews live in scratch. The user says what gets saved.
3. **One change per generation.** If a render is wrong, change exactly one thing and re-run. Never bundle fixes — you will not know which one worked.
4. **When a version breaks something that previously worked, go back to the last good version and change one thing.** Do not rebuild from scratch. This cost hours in the Phase A session.
5. **Check a mid-clip frame yourself before showing the user anything.** Rotation, drift and invented objects are obvious in one frame and cost nothing to catch. Do not hand over a render you have not inspected.
6. **Report measurements, not impressions.** Motion score and structural stability, together, every time. See §6.
7. **Never claim something is fixed without verifying it.** In the Phase A session a "same character, twice as long" claim was contradicted by a number already on screen.

---

## 1. Where this clip sits

The ecosystem intro is a chain of clips. Every seam between them must be invisible, which means **the last frame of each clip is the first frame of the next, as an actual file, not as a description.**

```
HERO (existing)  →  CLIP 1 "Return to Source"  →  CLIP 2 "Assembly"  →  IDLE LOOP (done)
                    this document                 not started           approved & shipped
```

**The chain is anchored at the far end.** The idle loop is finished and its first frame is fixed:

`public/eco/hub/COMMAND-HUB-HOLOGRAM-v4-cleanfloor.png`

Clip 2 must end on exactly that frame. Clip 1 must end on whatever Clip 2 begins with. Work backward from the anchor — do not design Clip 1 forward and hope it lands.

---

## 2. BLOCKERS — must be answered by the user before any generation

Do not start generating until these have answers. Ask them as a group, once.

| # | Question | Why it blocks |
|---|---|---|
| B1 | **Which hero clip does Clip 1 pick up from, and what is its exact final frame?** Candidates in `public/media/`: `orb-emerge.mp4` (used by `components/PageLoader.tsx`), `orb-stationary.mp4` (used by `components/sections/Hero.tsx`). | Clip 1's first frame must match it exactly. Without the source clip named, the seam cannot be built or checked. |
| B2 | **What is Clip 2's first frame?** It does not exist yet. | Clip 1's acceptance test is "final frame becomes the exact starting frame of Clip 2." Unverifiable until that frame is authored. Options: (a) author it as a still first, (b) build Clip 2 first and work backward, (c) let Clip 1's output define it and pin Clip 2 to that. **(c) is the least safe** — it means Clip 2 inherits whatever Clip 1 happens to produce. |
| B3 | **Is the icon composited or generated?** | Acceptance requires "the Lumin icon is exact and never malformed." Generative video reliably mangles logos. Compositing the real icon over the generated orb is the safe path. This is a build-approach decision, not a prompt tweak. |
| B4 | **Confirm the reverse direction is intended.** The clip is scroll-scrubbed and reversible, so played backwards the orb rises out of the floor. | This rules out any rising particles, upward flumes or directional drift — anything with a "correct" direction looks wrong reversed. Confirm before writing the prompt. |
| B5 | **Exact duration.** The spec says "approximately four seconds." The model takes an integer. | Confirm 4. |

---

## 3. The spec (user's, authoritative)

### Purpose
Bridge the hero's exact final frame into the ecosystem activation sequence. The clip ends with the Lumin orb absorbed into the constellation floor, leaving a concentrated projection point ready for Clip 2.

### Visual sequence
1. **Exact hero handoff.** Begin on the exact final hero frame: black space with the narrow blue-white filament at center. Preserve its position, brightness and framing for a seamless match cut.
2. **Spatial warp-back.** The remaining hero light recedes into depth around the filament. The perspective opens smoothly to reveal the constellation floor beneath it. Floor geometry resolves through restrained directional illumination, not expanding waves or ripples. The camera remains centered and settles into the ecosystem viewing angle.
3. **Orb condensation.** Light within the filament concentrates into the small Lumin orb from `Lumin Icon Orb Stationary.mp4`. The orb is a genuine spherical concentration of projected energy. Preserve the exact three-line Lumin icon inside it. Allow only a brief visual hold so the visitor recognizes the orb.
4. **Descent.** The orb lowers directly toward the center of the constellation floor. Its spherical proportions remain intact; it does not stretch, melt or become a comet. The vertical light rails contract with the descending orb. Nearby floor traces brighten subtly from receiving its light, without producing a pulse or shockwave.
5. **Absorption.** At contact, the orb compresses cleanly into the floor's central projection point. The icon remains recognizable until the final moment. The upper beam retracts into the same point. End on the completed constellation floor with one intense white-blue nucleus at its center and empty black space above it.

### Motion character
Controlled, elegant, technologically inevitable. More Iron Man command-system activation than magical portal. The warp supplies momentum; the descent is slower and deliberate. No unnecessary particles, explosions, liquid energy, planetary imagery or decorative movement. No ecosystem platform or product orbs appear yet.

### Delivery
4K, 16:9, 24 fps. Approximately four seconds. Designed for reversible scroll scrubbing. First frame must match the hero endpoint. Final frame becomes the exact starting frame of Clip 2. Preserve the same camera and floor perspective that the finished ecosystem will occupy.

### Acceptance tests
- The hero-to-transition seam is invisible.
- The Lumin icon is exact and never malformed.
- The orb reads as dimensional projected energy.
- The descent clearly places the Lumin orb into the floor.
- The final frame contains no suspended orb or ecosystem structure.
- No waves, floor ripples, camera shake, text or unrelated objects.
- Reversing the clip makes the orb emerge cleanly from the floor.

### Assumptions
- The clip is scroll-scrubbed and reversible.
- `Lumin Icon Orb Stationary.mp4` governs the orb, projection beam, floor and camera appearance.
- Clip 2 begins immediately from the concentrated floor point created here.

---

## 4. Constraints the spec does not state

**C1 — Camera movement is ALLOWED in this clip. This is a deliberate exception.** `ECOSYSTEM-STATUS.md` says "THE CAMERA NEVER MOVES." That governs the idle loop and the focus states. Clip 1 requires a warp-back and a perspective change, so it is exempt. **What is not exempt is where the camera ends up** — it must settle into exactly the ecosystem viewing angle, and that is the hardest part of this clip.

**C2 — Land the camera with `end_image`, not with words.** Describing the destination camera does not work. Hand the model the destination frame. This is the single largest lever available.

**C3 — The floor must be the clean-floor canon.** No colored haze patches. The idle master was rebuilt specifically to remove them; a hazy floor here breaks the handoff.

**C4 — Scrub-friendly encoding.** Standard long-GOP H.264 seeks badly under scroll scrubbing. Deliver an all-intra encode (`-g 1`) or a frame sequence. Decide with the user before final delivery, and keep the full-quality master separate from the scrub encode.

**C5 — Source clip facts** (probed, for reference): `02-assets-source/Lumin Icon Orb Stationary.mp4` is 3840×2160, 24 fps, 4.04 s. `02-assets-source/Video References/Lumin Web Hero.mp4` is 1920×1080, 24 fps, 6.06 s. Site copies live in `public/media/`.

---

## 5. Prompt-writing rules that apply here

From `ECOSYSTEM-STATUS.md`, the ones that bite on this clip specifically:

1. **Never describe light as travelling "across" or "through" a structure.** That phrasing made the model rotate the entire light table in Phase A. Describe brightness changing where things already sit.
2. **Prohibitions suppress motion.** A prompt that is majority "no/never/nothing" produces a near-still. Put the motion in the body; compress the locks into a few lines at the end.
3. **Never write "almost imperceptible"** — you will get imperceptible. Say "small in amplitude but clearly visible, and continuous."
4. **Say "continuous," not "settles."** Effects that settle fire once and stop.
5. **Longer is not better.** Stretching a working prompt to a longer duration dilutes it — the same activity budget spread thinner.
6. **Beware invented UI glyphs.** Words like "triangulation meshes / lattice nodes / angular fragments" made the model draw literal brackets and triangles. If an effect needs that vocabulary, **fence the place, not the effect**: keep the phrase, and state where those figures may not appear.
7. **Additive prompts are dangerous; subtractive ones are safe.** "Add subtle reflections" produced eleven searchlight columns. If something needs to go, ask for removal, not replacement.

---

## 6. Verification — run these before showing the user anything

```bash
# 1. Extract check frames
ffmpeg -v error -i clip1.mp4 -vf "select=eq(n\,0)" -vframes 1 first.png -y
ffmpeg -v error -ss 2 -i clip1.mp4 -vframes 1 mid.png -y
ffmpeg -v error -sseof -0.05 -i clip1.mp4 -vframes 1 last.png -y

# 2. Motion — mean frame-to-frame change
ffmpeg -v error -i clip1.mp4 -vf "tblend=all_mode=difference,signalstats,\
metadata=print:key=lavfi.signalstats.YAVG:file=-" -f null - 2>/dev/null \
  | grep YAVG | awk -F= '{s+=$2;n++} END{printf "%.3f\n", s/n}'

# 3. Structural stability — first vs mid. Read the "All:" value.
ffmpeg -i first.png -i mid.png -lavfi ssim -f null - 2>&1 | grep All:

# 4. Seam checks — Clip 1's first frame vs the hero's last, and
#    Clip 1's last frame vs Clip 2's first.
ffmpeg -i hero_last.png -i first.png -lavfi ssim -f null - 2>&1 | grep All:
```

**Reading the numbers, calibrated on this scene:**
- **Motion** ~0.70–1.00 is a live image. Below ~0.5 reads as a still.
- **SSIM** on a locked-camera clip: ≥0.95 is solid, below ~0.90 means the structure moved. **Clip 1 has intentional camera movement, so a low first-vs-mid SSIM is expected here** — it is not a failure signal for this clip. What matters for Clip 1 is the *seam* SSIMs in step 4.
- **Report motion and stability together, always.** One Phase A take scored high motion purely because the model was moving the furniture.

**Also check by eye on the mid frame:** no text, no glyphs, no invented rings or halos, no ecosystem platform or product orbs (they must not appear in this clip at all), icon not malformed.

---

## 7. Suggested step order

Each step stops and waits for the user. Do not run ahead.

1. **Ask the B1–B5 blockers as a group.** Wait for answers.
2. **Extract and show the hero's final frame** (once B1 is answered). Confirm with the user this is the true handoff frame before anything is built on it.
3. **Resolve Clip 2's first frame** per the user's B2 answer. Nothing downstream can be verified until this exists.
4. **Write the Clip 1 prompt. Show it to the user as text and get approval before generating.** The Phase A session proved the prompt is where this is won or lost.
5. **Generate one take.** `start_image` = hero final frame, `end_image` = Clip 2's first frame.
6. **Verify per §6 yourself.** If it fails, say which test failed, change one thing, re-run. Do not show failed takes unless the user asks.
7. **Show the user a take that passes.** Nothing gets saved to the project folder or committed until they approve it.
8. **On approval:** save master, produce the scrub encode per C4, update `ECOSYSTEM-STATUS.md`, commit and push.

---

## 8. Tooling reference

Generation goes through the `higgsfield` CLI. Seedance 2.0 was used for the whole idle loop.

```bash
higgsfield account status
higgsfield model get seedance_2_0        # params, enums, constraints

higgsfield generate create seedance_2_0 \
  --start-image <path-or-id> \
  --end-image <path-or-id> \
  --duration 4 --resolution 4k --mode std --aspect_ratio 16:9 \
  --generate_audio false --bitrate_mode high \
  --wait --wait-timeout 25m \
  --prompt "..."
```

Notes: `mode std` is required for 1080p/4k (`fast` caps at 720p). Media flags accept a local path (auto-uploaded) or a UUID. Renders take several minutes — run in the background and poll, don't block.

---

## 9. What is already done, for context

Phase A, the idle loop, is finished, approved and pushed. Deliverables in `public/eco/hub/`:

| File | What |
|---|---|
| `COMMAND-HUB-HOLOGRAM-v4-cleanfloor.png` | Still canon. The frame the idle loop and every click-state start from. **The anchor this whole clip chain works backward to.** |
| `eco-idle-hologram-master.mp4` | Approved idle loop, 5 s 1080p. Motion 0.998, SSIM 0.952. |
| `eco-idle-hologram.mp4` / `.webm` / `-poster.jpg` | Web encodes and poster |
| `idle-loop.html` | The looping component. Two stacked copies, incoming one crossfaded in. **Only the top layer may animate opacity** — fading both darkens the image 25 % at every loop point. |

Superseded work and the full failure log are in `ECOSYSTEM-STATUS.md`. Read it.
