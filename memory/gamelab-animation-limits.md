---
name: gamelab-animation-limits
description: GameLab MCP cannot make crisp 8-direction pixel-art sprite sheets; its only frame-maker is the video step (soft, non-pixel)
metadata:
  type: feedback
---

The GameLab Studio MCP has only `generate_image` (one still), `generate_video`
(animates a still into a smooth video clip), and `generate_spritesheet` (slices
that video). There is **no** tool that outputs a multi-frame / multi-direction
pixel-art sprite sheet from a prompt.

**Why:** the only thing that produces animation *frames* is `generate_video`,
which re-renders the still with smooth interpolated motion — it looks soft /
"3D-ish", NOT crisp pixel art, and at 128px it can hallucinate extra characters.
No prompt wording ("pixel art only, no 3D, no video") fixes this; it's the model.
`generate_image` makes a single crisp sprite, not a 64-cell sheet (docs warn it
crashes on sheet requests).

**Why it matters:** the user (Turf Splash game) wants crisp pixel-art 8-direction
run cycles. That combination is impossible with this MCP. Don't burn credits
attempting it or promise it.

**How to apply:** For crisp + directional, generate per-direction *stills* (real
pixel art) and animate movement in code (bob/lean/recoil). For true frame-by-frame
run cycles, a dedicated pixel-art sprite tool or hand animation is needed — not
this MCP. Set this expectation BEFORE spending credits. See [[turf-splash-asset-pipeline]].
