# Ecosystem — build status & handoff (2026-07-23)

Cross-account handoff for the Lumin ecosystem hologram (the HUD data-sphere). Read this first before touching `public/eco/`.

## Where we are
- **Master frame LOCKED:** `public/eco/refs/MASTER-FINAL.png` (16:9, 2720×1536). This is the canonical reference every clip is generated from and returns to. It's a holographic HUD data-sphere floating above a constellation floor (Stark / agency tactical-display look). Do NOT regenerate the look.
- **Idle loop DONE (feel approved at 720p):** `public/eco/clips/eco-idle.mp4` — 8s, seamless, calm single-breath. Approved by user ("looks amazing, let's stop here"). Still a **720p validation render** — the 4K/pro final has NOT been rendered yet.
- **Preview harness:** `public/eco/clips/preview.html` → served at `/eco/clips/preview.html`. Pure black full-bleed, `object-fit: contain`, no copy. This is how it behaves on-site.

## The idle-loop recipe (repeatable — DO NOT deviate)
```
higgsfield generate create kling3_0 \
  --prompt "<calm single-breath prompt: one slow unified breathing rhythm; radiant up-beam; core icon pulse; nodes pulse light in/out; dome soft fluorescent glow; floor ripple expands once in sync; NO flicker/scanlines/twinkle; locked camera; sphere+nodes stay same position & size; seamless loop>" \
  --start-image "public/eco/refs/MASTER-FINAL.png" \
  --end-image   "public/eco/refs/MASTER-FINAL.png" \
  --duration 8 --mode std --sound off --aspect_ratio 16:9 --wait
```
For the final, bump `--mode 4k` (or `pro`) — keep everything else identical.

## Hard-won rules (violating these broke it repeatedly this session)
1. **Never reframe/crop the clip.** Feed the EXACT `MASTER-FINAL.png` as both `--start-image` and `--end-image`. A zoomed/cropped source shifts the floor line & proportions → the hover→idle hand-off loses its seamlessness. Verify frame-0 against the master before accepting.
2. **Kling holds proportions; it re-fits a zoomed input.** That's why we feed the exact master (same 16:9), no pre-zoom, no post-crop.
3. **Use Kling 3.0, not Seedance.** Seedance v5 kept false-flagging the bright sphere as `nsfw`.
4. **On-site sizing = `object-fit: contain` on a black section.** The void is black, so contain's letterbox margins are invisible and it NEVER clips. `cover` crops the sphere (avoid). Do not bake "bigger" into a cropped mp4.
5. **Motion:** one slow unified breath. Many independent motions read "schizophrenic." Longer duration (8s) = calmer. Radiance = up-beam glow + node in/out pulse + core pulse + dome fluorescence.
6. **The sphere never shrinks** to solve framing — move the floor/other elements instead (this is how MASTER-FINAL itself was composed: v6-bigfloat).

## refs/ history (newest wins; keep as record)
`hud-gpt-v1/v2` (GPT structure + color lock) → `hud-seedream-v3` / `MASTER-approved-v3` (Seedream light, "you finally got it") → `hud-v4-floor` (floor added, but "smushed") → `hud-v5-float` (floated but SHRANK sphere — REJECTED) → `hud-v6-bigfloat` = **MASTER-FINAL** (big + floating). Pipeline: GPT Image 2 for structure → Seedream v5 Pro for volumetric light (fed the GPT frame via `--image`).

## NEXT (in order)
1. Render idle **4K/pro final** from the recipe above (same master, no reframe).
2. **Boot-up bridge clip:** page-load orb descends into the floor → hologram assembles upward into MASTER-FINAL. Must end on the exact master frame so it hands into the idle loop.
3. **Per-node focus clips:** gentle push/emphasis to one node so a DOM overlay card can open beside it (nodes must stay at their MASTER-FINAL screen coords across all clips).
4. Wire clips into the ecosystem section (black section, contain), state-machine style: idle ↔ node-focus.

Fuller narrative + all rejected approaches: `../../../CONTEXT.md` §10 (outside the repo) and the local Claude memory `project_lumin_ecosystem_rebuild`.
