# Ecosystem — build status & handoff (2026-07-25 — PHASE B DONE: full hero→idle chain approved)

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

### Phase B — transition chain, hero → idle — ✅ DONE (2026-07-25), user-approved: "spectacular"

**Deliverables in `public/eco/transition-to-hub/`:**

| File | What |
|---|---|
| `FULL-CHAIN-hero-to-idle.mp4` | 21.6s — the whole sequence: hero's last frame → orb descends into floor → hub activates → 2× idle loop. Crossfaded at both joins. |
| `clip1-hero-to-floor-6s.mp4` | **Clip 1**, 6.000s. Hero `f_478` → orb condenses → descends → absorbs into the floor. |
| `clip2-activation-6s.mp4` | **Clip 2**, 6.04s. Floor → beam → Core → structure → 11 nodes → idle state. |
| `clip2-activation-10s-master.mp4` | Clip 2 at native 10s before retime. |
| `clip1-last-frame.png` · `clip2-last-frame.png` · `idle-first-frame.png` | The anchor frames the chain is registered against. |

Prompts + raw collapses archived in `01-specs/ecosystem-refs/` (`clip1-bridge-prompt.txt`, `clip2-collapse-v3-prompt.txt`, `clip2-collapse-v3-raw-10s.mp4`, plus v2 archives).

**Clip 1 build:** the hero's true last frame is `public/frames/journey/desktop/f_478.webp` — NOT the corridor frame an earlier attempt used. A 4s Seedance bridge (`start_image=f_478`, `end_image=` the descent's opening frame) carried the room away and resolved the floor; that was crossfaded into the existing reversed orb-descent footage, then retimed to 6s (bridge 1.12×, descent 2.30×).

**Clip 2 build — THE KEY TECHNIQUE: generate the collapse, then reverse it.**
`start_image` = idle loop's frame 1 (the hub) · `end_image` = Clip 1's last frame (bare floor) · 10s · reversed · retimed to 6s (1.67×).

#### Why reversal is structurally better, not a workaround
1. **It puts fidelity where the stakes are.** Models reproduce `start_image` far more faithfully than `end_image`. The hub — 11 nodes, exact colours, exact positions, the icon — is the high-stakes anchor. Making it the START means it comes out clean, and reversing moves that clean frame to the END where it hands off to the idle loop. A forward build would have to invent 11 correctly-coloured nodes at the least reliable moment. **They came through perfect on the first take.**
2. **It converts an additive prompt into a subtractive one** — the safe direction per rule 7. Nothing is invented; things go dark.

#### Reversal demands two non-obvious things
- **Beat order AND easing invert.** The fastest beat must sit near the collapse's **END** to read as a snap near the build's **beginning**. Written naturally you'd put the snap first and it lands in the wrong place.
- **Directional motion is FINE if the reversed direction is the one you want.** Light draining inward along rails reverses into light running outward — exactly the build. Only *absolute*-direction motion breaks (falling debris → rising debris). An earlier pass over-restricted this and lost motion for no reason.

#### The three beats that made it spectacular
- **Drain along the rails.** Node colour lifts out and runs inward to the Core. Reversed: energy runs outward, arrives, *then* the node ignites — the causal chain becomes visible.
- **Focus pull.** A projector *resolves*, it doesn't fade. The Core loses focus and blooms before going dark; reversed, the hub **snaps into sharp focus**. Biggest single spectacle win.
- **Lamp overshoot.** The floor bloom dims, briefly **flares**, then cuts — reversed, that's a real lamp-strike overshoot rather than a dimmer.
- **Colour withheld.** Structure builds in white-blue with the domes dark; the eleven colours arrive last as the payoff.

#### Sequencing correction (v2 → v3)
v2 had the upward stream appearing 6 frames BEFORE the Core. User wanted the stream *slightly after* the Core, radiating out of it. Fix: move the stream's retraction EARLIER in the collapse (before the Core's focus loss). v3 measured Core at frame 54, stream at 60 — **+0.25s, correct.**

#### Duration: longer-then-retime IS right for construction — the "longer is worse" rule does not transfer
Rule 5 was learned on the **idle loop**, where the bottleneck is a fixed *ambient activity* budget, so stretching thins it. A construction sequence has fixed *narrative* to complete, and the failure mode is the model **blending past beats** because there aren't enough frames. Generating 10s and retiming to 6s (1.67×) gave 48% more room per beat. Motion blur artifacts are invisible on this content (pure glowing light, no hard edges) — the descent survived 2.30× cleanly.

#### ⚠️ MEASUREMENT DISCIPLINE — this session's most expensive lesson, four bad metrics
**Always calibrate a metric on known-identical content before trusting it on unknown content.**
1. **SSIM is brutal on near-black, thin-bright-line frames.** Two ADJACENT frames of the same clip score only **0.748**. So 0.748 is the practical ceiling, not 1.0 — a raw 0.60 is not the catastrophe it looks like. Calibrate first.
2. **Tracking a bright centroid is confounded by brightness pulsing.** A brighter core crosses the threshold over more pixels and drags the computed centroid — reported "camera drift" that did not exist. Use **image registration against static structure** instead; it returned exactly (0,0).
3. **Min/max midpoint of a light spray ≠ its perceptual centre.** This produced a phantom "22px beam misalignment" and a meaningless v2-vs-v3 comparison built on it. Use a **brightness-weighted centroid or the peak column**. Measured properly, the beam sits at x=962 in every clip AND in the idle master — zero axis spread, perfectly straight.
4. **Brightest-pixel searches grab unrelated star-points.** Constrain the search region.

#### Known cosmetic defect, deliberately deferred
**The Core sits ~7px left of the beam axis (x≈955 vs x=962).** This is inherited from the approved master and is present in the idle loop identically — it cannot be prompted away, because it enters through `start_image`. It's 0.36% of frame width. **Fix it as one consistent post pass over every clip plus the idle loop, only once the whole chain is locked** — doing it earlier means redoing it after every change.

#### Seams — solved with crossfades, not pixel-exact matching
Raw seams: Clip1→Clip2 **0.870**, Clip2→idle **0.662** (v3 actually measured worse here than v2's 0.726 — irrelevant once crossfaded). 0.25s crossfades at both joins measured flat frame-to-frame with no spike. Same approach `idle-loop.html` already uses.

### Phase A.1 — clean-floor master — ✅ DONE, user-approved

The original master had soft colored haze patches on the floor under the orbs — messy for a build carrying UI overlays. Fixed and re-rendered.

- **New still canon: `COMMAND-HUB-HOLOGRAM-v4-cleanfloor.png`.** Subtractive edit only — the haze erased, floor left clean black, traces and star field untouched. Nothing was added.
- **New idle master: `eco-idle-hologram-master.mp4`** (re-run off that frame). Measured: motion 0.998 (previous approved 0.706) with structural stability SSIM 0.952 (previous 0.950). More light activity AND a tighter lock than the version it replaces.

**The two failures on the way, and what they teach:**

1. **The scanning and the glyphs come from the same instruction.** Banning "triangulation meshes / lattice nodes / angular fragments" to stop the model drawing brackets above the orbs also deleted the scanning effect that is the best thing in the clip. Do not remove that phrase. **Fence the place, not the effect** — keep the phrase, add that the figures lie flat on the table surface only and never appear near an orb.
2. **High motion is not automatically good — check it against structural stability.** The rejected take scored 0.827 motion but SSIM 0.780: the model spent its freedom moving the light table, and the user spotted it instantly. The winning take scored 0.998 motion at SSIM 0.952 — light moving, geometry pinned. **Always report both numbers together.** Motion alone is a vanity metric.

`ffmpeg -i first.png -i mid.png -lavfi ssim -f null -` → read `All:`. Below ~0.90 on this scene means the structure moved.

### Phase B — Boot-up / arrival transition
Per the brief in `01-specs/ecosystem-command-hub-brief.md` Part 2: hero resolves to the icon → icon descends to the floor's activation point → concentric rings fire outward across the floor → beam rises → hub assembles outward from the nucleus → settles into idle. **Its final frame must be pixel-identical to the idle loop's first frame** or the handoff visibly jumps.

### Phase C — Node focus states — RECOMMEND DOING THIS IN CODE, NOT VIDEO
Do not generate 11 focus clips. Instead: brighten the clicked node, dim the rest, scale its bloom, open the info card in the dark margin — all in CSS/canvas over the looping video. Reasons this is better, not just cheaper:
- Omeed explicitly warned the taxonomy will consolidate again — code re-composes instantly, 11 baked clips don't
- Zero registration/drift risk
- Instant response instead of waiting on a clip to play

### ✅ Phase D — Wired into the live scroll (2026-07-25)

`components/sections/EcosystemSequence.tsx` replaces `EcosystemBeat` (the old R3F scene stays in the repo, unmounted). The chain now runs inside the real page.

**The whole chain is ONE frame strip, 289 frames.** `public/frames/descent/` (144, 4.7MB) + `public/frames/activation/` (145, 12MB), concatenated into a single `FrameScrubber`. The activation was originally a played `<video>` — that was wrong, because it left **no frames to run backward**, so scrolling back out could only crossfade. As frames it scrubs identically both directions, and it drops the autoplay-permission problem entirely.

At the gate we don't play a video: we **animate the scroll position** through the activation band at the clip's authored pace (6.0417s linear = its native 24fps) while input is refused. Same choreography, one less layer, and the visitor lands at the *far* side of the band — so backing out costs ~151vh of reverse scrub instead of a 10vh dissolve. That is what anchors them.

Hard lock only for the 6s activation. Escape breaks it, autoplay/cold-video failure releases immediately, 9s hard ceiling. The rest is a soft ~99vh dwell.

**⚠️ THE STICKY-STAGE TRAP — cost two broken builds, read this before touching any section handoff.**
A full-bleed `position: sticky` stage has **three** scroll landmarks, not one:

```
REVEAL  = sectionTop - vh     stage starts sliding up into view
PIN     = sectionTop          it locks to the top
RELEASE = sectionBottom - vh  it unsticks and slides away
```

A sticky child of height `vh` in a container of height `H` RELEASES at `containerTop + H - vh` — a full viewport before its own section ends. So the hero's stage unpins while the hero still owns the screen, and the next section's stage doesn't pin until 100vh later: **for one viewport neither is pinned and both frames slide past each other**, giving a hard horizontal content edge and two scenes at once.

`-mt-[100vh]` on the incoming section fixes the PIN — **and silently drags the REVEAL up by the same 100vh**, so the incoming stage starts covering the outgoing scene a full viewport early. One edit, two landmarks moved, second one unnoticed. Both defects were shipped in sequence.

The complete recipe:
1. `-mt-[100vh]` so incoming PIN == outgoing RELEASE.
2. Gate the stage on `section.getBoundingClientRect().top <= 0` — hidden through the entire REVEAL→PIN approach.
3. Gate the **section's own background** with the same predicate, or a coloured rectangle climbs the screen even with the stage hidden.
4. Drive that gate from a trigger spanning `"top bottom"`→`"bottom top"`. The scrubbed content trigger (`"top top"`→`"bottom bottom"`) **never fires during the approach and cannot see the bug.**
5. Stay visible past the pin — the RELEASE-side slide-out is the exit, and the background must fill behind the rising stage.

Verified in real Chromium: `GAP = 0px`; stage hidden + background transparent at every approach probe including `stageTop=540`; visible + `#050508` at and after PIN. Seam frames 2px apart are indistinguishable.

**Verification tooling — the in-app preview pane is unusable for scroll work.** It renders white and freezes `requestAnimationFrame` whenever hidden, which stalls Lenis, GSAP and every scroll test. Use Playwright against the installed Chrome instead:
`executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'` (the cached ms-playwright build is version-mismatched), `waitUntil: 'domcontentloaded'` + a fixed wait — a frame-sequence page never reaches `networkidle`. Neutralise easing with `__lenis.options.lerp = 1` before seeking, or positions drift between calls.

**Measured seams across the whole chain** (calibrated against a within-clip floor of 0.02–0.23%):

| seam | diff | handling |
|---|---|---|
| hero f_478 → descent f_001 | 0.32% | hard cut, both near-black |
| descent f_144 → activation f_001 | 0.68% | hard cut, quieter than the strip's own p95 of 1.38% |
| activation last → idle f_0 | 3.86% | **600ms dissolve** — the only bright-on-bright join |

**Still open:** snap-to-beats (a fast flick can still cross the activation band before the gate arms); the ecosystem's own RELEASE into ProductStory has the identical un-pinned tail and will show the same defect on the way out; node hit areas; mobile.

### Phase E — Ecosystem → White Void (IN PROGRESS, 2026-07-25)

The hub does **not** power down into the About section. It **blooms out**: pulse climbs the stem → nucleus strike → shockwave ripples outward → bleach to white → cloud void. This supersedes the earlier idea of reusing the un-reversed collapse as the exit.

Storyboard + copy for the whole white void and CTA: `../../../White Void - CTA - Sequence Map.rtf` (18 beats). Frames in `../../../Eco system transition to white void/` (6) and `../../../White Void - CTA - Final/` (12).

**The 6 storyboard frames are structurally faithful but 30% underexposed.** Measured mean luma:

| | luma | Δ from live idle loop |
|---|---|---|
| canon idle f0 / activation last / v4 master | 56.2 / 55.5 / 55.7 | — / 3.86% / 2.92% |
| storyboard 1 / 2 / 3 | **39.0 / 33.5 / 30.6** | **8.54% / 11.14% / 11.78%** |

Three independent canon sources agree at 55.5–56.2. Frame 1 is nearly 3× further from the live idle loop than any real asset, and the drift compounds because each generation fed on the last. Geometry, however, is **intact** — Core centroid 478.6 (canon) vs 480.0 (storyboard), 1.6px apart, with the two canon sources 0.1px apart; platform width within 2px.

*(Care with that measurement: a full-frame column-sum centroid reported a 17px beam shift that does not exist — overall brightness drags it. Constrain to an explicit region. Same trap as the phantom 22px in Phase B.)*

**Therefore:** frame 1 = **our canon hub**, not the storyboard's. Frames 2–3 regenerate from canon (small local beats a model handles cleanly from a correct source). Frames 4–6 keep as **composition targets, not pixel anchors** — by frame 4 luma is 122 and climbing, so the darkening washes out in the bleach. Frame 6 defines the white void's opening frame.

**Generate FORWARD here — deliberately the opposite of Phase B.** There the finished hub had to meet an existing idle loop, so it went on `start_image` and got reversed. Here the hard constraint is at the *start* (frame 1 must match the live loop exactly) and the far end is free, because the white void does not exist yet and will inherit whatever this renders as. Put fidelity on the constrained end.

**Canon rules that govern this clip:** the hub is a hologram — one projector, one clock. It dies by **losing containment and releasing its light**, never by exploding. All eleven nodes stretch on the *same* propagating wavefront (that is one physical event, not the rejected Christmas-lights independence). The bleach follows the wavefront: pearl-white behind it, navy still ahead. The floor doesn't vanish — it *becomes* the cloud deck we then fly over.

**Two known gaps in the storyboard:** no frame shows the briefed "orb energy stretches into filaments" beat, and it sits inside the 3→4 step which carries **43.5% of the entire transformation** with no anchor. And frame 6 still has a vertical light shaft, where the white-void references are horizontal drifting fields with no beam — the light must reorient from *above* to *ahead*.

### ✅ Phase E CLOSED — approved 2026-07-25

`transition-to-void/APPROVED-eco-to-void-6s.mp4` (6.04s). Charge → bolt climbs the stem → strikes the Core → contained electrical discharge through the table → breakout warps the frame → premium white void.

| File | What |
|---|---|
| `APPROVED-eco-to-void-6s.mp4` | **canon.** Both pieces, crossfaded, retimed |
| `piece1-charge-4s.mp4` / `piece2-strike-discharge-void-6s.mp4` | the two generations |
| `SOURCE-canon-idle-f1.png` | start frame = idle-loop master encode f1 |
| `JOINT-frame-beam-free.png` | piece 1's last frame = piece 2's start_image |
| `END-TARGET-from-CTA-1.png` | their CTA-1, cropped 16:9, used as `end_image` |
| `void-v3-*` | an earlier approved iteration, superseded |

**Seams:** live idle loop → chain start **1.88%** (tighter than canon assets are to each other); piece 1 → piece 2 4.60% under a 0.25s crossfade; chain end → CTA-1 5.31%.

**⚠️ THE TECHNIQUE THAT FINALLY WORKED — split so the second piece cannot see the thing you want gone.**
The beam above the Core kept returning at the strike across **five** consecutive takes. Prompting failed every time — "nothing rises above the emblem," end_images, retraction language. The cause: the beam is the single strongest feature of the start frame, so whenever the model needed to express energy it reached for it.
The fix was structural. Generate piece 1 ending on a frame where the feature is already gone, then start piece 2 from **piece 1's actual last frame**. Piece 2's reference simply has no beam to restore. Beam score went 0.96 → 0.20 at mid-charge and stayed 0.29 through the strike *and* the whole discharge. Chaining by extraction also makes the join seamless by construction.
**Generalise: when a model keeps reinstating something inherited from `start_image`, don't argue with the prompt — re-cut the clip so the offending frame isn't the reference.**

**⚠️ MEASUREMENT — a fifth false alarm, same family as Phase B's phantom 22px.**
A "beam present?" check that spot-samples three fixed rows reported the beam blazing at 211–255 when it was absent. Two of those rows land exactly on the **horizontal halo arcs** above the emblem. A crossbar lights one row; a beam lights all of them. The working detector requires *consecutive* rows where the centre column is both bright and much brighter than off-centre, calibrated as: canon-with-beam **0.94**, beam-free **0.20–0.29**, none **0.00**. Always calibrate against a known-present and known-absent frame.

**Vocabulary that misfires on this scene:**
- "recursive crystalline facets / lattice / shards" → renders as a **cluster of glowing bubbles**. Never use.
- The user's "fractal" means **branching electrical lightning**, not crystal geometry. Say forked, arcing, discharge, branching.
- Naming the coloured nodes as actors ("the nodes burst into…") makes the model give each one its **own individual performance** — sprays, then vases, then hourglasses, three takes running. Describe only the table as one body and let them be absorbed by omission.
- "fine glowing fragments" still renders **chunky floating shards**. Say "a mist of light so fine it has no separate pieces."
- Prohibition overload kills motion, re-confirmed: a prompt loaded with *no sheen / no rim / no base / nothing thrown outward / no push / no orbit* produced a dead brightness ramp with no de-atomization at all. Motion in the body, two lines of locks at the end.

**Structure that made it read right:** the discharge is **contained inside the platform footprint** while it does its work — the table shorting out from within, the surrounding frame still dark — and only *then* bursts past the edge as one wave that sweeps the frame and warps the camera into the white. Collapsing those two stages into one gave frame-wide bolts immediately, which read as "too much."

**Locking the destination beat prompting.** Three takes described the premium void and three returned blank white (structure 2.56–2.77 vs CTA-1's 3.78). Passing their own CTA-1 as `end_image` fixed it in one — final structure 4.52, with real threads and ghost arcs, and it guarantees the handoff into the white-void section.

**Also re-confirmed:** emissive objects only read as emissive against darkness. As the field bleached, the model substituted **specular material** on the node domes — 2041 specular blowouts against the canon's **5** — and they turned into glossy plastic balls. An emissive element must shed specular, rim, base and edge definition at the same rate the background brightens, or be re-conceived as lines and points, which do read on white.

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
