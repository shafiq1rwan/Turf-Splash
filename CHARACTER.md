# Character Creation — Turf Splash

Plan for generating the game's character art via the **GameLab Studio MCP** and
wiring it into the game. Built around two hard constraints:

1. **Low credit budget (~185 credits).** Generate the *minimum* number of
   sprites; recolor in code instead of generating per team.
2. **MCP crashes on heavy sprites.** Keep every sprite small, low-color, and
   one-per-call. No sprite sheets, no large canvases.

## Direction (current): Neon Skate Park / Graffiti

The game's art theme is a **graffiti / neon skate-park ink war** (Splatoon-
inspired, but original — not Inkling IP). Matte concrete arena with faded lane
lines and neon wall tags; painted tiles read as **wet, glossy spray-paint**.

**Character — chibi street tagger.** Readable at 128px, neutral so it recolors
per team via `tintSprite()`:

- Hoodie up (or beanie + headphones), baggy pants, chunky high-tops, fingerless
  gloves; slightly oversized chibi head so the face reads at low res.
- **Neutral grey base + one flat accent zone** (hoodie body / spray-can holster)
  that swaps to team teal `#38e0c8` / orange `#ff9f43`. Keep skin + shoes neutral
  so only the "crew color" changes.
- One free hand to hold the **weapon overlay** (see system below). Keep the white
  nose-dot for aim. Round/symmetric enough to keep the free horizontal-flip — no
  per-direction frames.

### Character + Weapon system (decoupled — keeps the asset count linear)

The roster goal: **unlock multiple characters, equip any weapon on any of them.**
The trap is generating `characters × weapons × teams` sprites (credit blowup +
MCP crashes). Avoid it by **never baking the weapon into the body**:

- **Characters** = body sprite sets (idle/walk), one neutral PNG each, tinted per
  team. *N characters → N assets.*
- **Weapons** = tiny standalone overlay sprites (roller, blaster, splat-gun,
  bucket), drawn over the hand each frame. *M weapons → M assets.*
- Total = **N + M**, not N × M. A weapon is mechanically just a named bundle of
  the existing `STATS` knobs (`paintRange`, `projectileSpeed`, `paintCooldown`,
  `splatRadius`, `inkPerShot`) + its overlay sprite. Character stays mostly
  cosmetic (skin + optional small modifier like move speed); **weapon carries the
  moveset.** Wiring: `STATS` → `WEAPONS[id]`, character gets a `weaponId`,
  `drawCharacter` adds one overlay-sprite draw. (Still out of scope in the brief
  — this is the planned next phase, not yet built.)

## MCP connection

- Server: `gamelab-studio` (SSE) — `http://api.gamelabstudio.co:8765/sse`
- Configured in the project's `.claude.json`. Auth via `X-API-Key` header.
- **Tools load on Claude Code restart** — after adding the server mid-session,
  reload the window so the `gamelab-studio` tools become available.

## The character: "Paint Blob Bot"

A small, round robot shaped like a paint droplet — a legged ink blob with two
dot eyes and a paint nozzle. Chosen because:

- **Single facing.** Round and symmetric, so it needs **no directional frames** —
  the game already shows aim with a white nose-dot. One sprite, not 4–8.
- **Recolor-friendly.** Neutral grey body + **one accent zone** (visor / belly /
  paint tank). Generated **once**, then code-swaps the accent to team colors:
  - Player = teal `#38e0c8`
  - Enemy  = orange `#ff9f43`
- **Low-res forgiving + on-theme** ("paint bots claiming a test arena").

Avoid: humans, limbed animals, distinct front/back designs — they need multiple
facings and burn credits.

## Asset specs (keep the MCP happy)

| # | Asset | Content size | Canvas | Palette | Priority |
|---|-------|-------------|--------|---------|----------|
| 1 | Street-tagger (neutral, recolor-ready) | ~64×96 | 128×128 transparent | ≤12 colors | **Must** |
| 2 | Paint splat decal (greyscale) | ~64×64 | 128×128 transparent | ≤6 greys | Nice |
| 3 | Weapon overlay (roller/blaster/etc.) | ~48×48 | 64×64 transparent | ≤6 colors | Next phase |

Resolution note: assets are now **128×128** (up from 64×64). On-screen size is
**unchanged** — sprites scale to a target height in `drawCharacter`, so 128px
just buys more detail (hoodie, spray-can, distinct weapon shapes), not a bigger
character. Generation is unaffected: the MCP still generates large then
**downscales** — sheets land at **768×768** (32 frames × 128px) instead of
384×384. Re-measure the foot-anchor constants (`ANIM_FOOT_Y`, `ANIM_CX`,
`ANIM_H`) and set `FRAME_W`/`FRAME_H` to 128 against the *actual* downscaled
sheet — don't blindly double, the feet row depends on the art's padding.

Rules for every generation:
- **Transparent PNG**, **no baked shadow** (the game draws its own).
- **One sprite per call** — never request a sheet or multiple frames.
- **≤ 128×128** source resolution (keep content within it; the MCP still hates
  heavy/busy sprites, so stay low-color and clean even at the larger canvas).
- Keep the recolorable accent a **single flat color region** so a code palette
  swap is clean.

Everything else (tiles, HUD, ink meter, buttons, splash effects) stays
**code-drawn = 0 credits**.

## Generation prompts (ready to paste)

**1 — Street tagger (the essential one):**
> simple pixel art chibi street graffiti kid, front view, big head small body,
> grey hoodie pulled up over the head, baggy grey pants, chunky high-top
> sneakers, fingerless gloves, one flat mid-grey accent panel on the hoodie
> front, two black dot eyes, one free hand at the side, 64x96 pixels on a
> 128x128 canvas, limited 12-color palette, clean readable silhouette,
> transparent background, no shadow, no text, no weapon

**2 — Paint splat decal (optional):**
> simple pixel art paint splat blob, top-down, solid white shape with a few
> droplets, 32x32 pixels, greyscale only, transparent background, no shadow

**3 — Weapon overlay (next-phase, one per weapon type):**
> simple pixel art paint roller held sideways, flat grey with a colored handle,
> 48x48 pixels on a 64x64 canvas, 6-color palette, clean silhouette, transparent
> background, no shadow, no text

> Repeat per weapon (blaster, splat-gun, bucket), swapping the noun. Anchor each
> overlay to the character's free hand in `drawCharacter`; recolor the handle per
> team in code.

> Tighter prompt = fewer crashes/retries = fewer wasted credits. If a result
> comes back wrong, refine the prompt before regenerating.

## Credit budget plan (~185)

| Spend | Item | Notes |
|-------|------|-------|
| 1 gen | Street tagger (+ idle/walk video → sheet) | covers **both** teams via recolor |
| 1 gen | Splat decal | optional polish |
| 1 gen each | Weapon overlays | next phase; one per weapon type, recolor handle in code |
| 1 gen each | Extra characters | roster; one neutral PNG each, any weapon equips |
| rest  | **retry buffer** | crashes happen — keep headroom |

Do **not** generate: per-team copies, per-direction frames, or sprite sheets.

## Integration into the game (no further credits)

Once the PNG exists, drop it in and the engine handles the rest:

- Save to `assets/blob-bot.png` (create the folder).
- Add a small **sprite-loading layer** in `index.html`:
  - `ctx.imageSmoothingEnabled = false` (set after each `resize()`) for crisp
    pixels.
  - Load the image; **fall back to the current capsule** if it's missing, so the
    game always runs.
  - Draw it scaled by an integer factor (~×1.5–×2) in `drawCharacter`, replacing
    the capsule body. Keep the white nose-dot for aim.
- **Team recolor:** tint the accent region per `owner` (offscreen-canvas palette
  swap, or generate-time neutral + a colored overlay). One source sprite → two
  teams.

## What was actually built

The blob-bot concept above was dropped in favor of a **chibi human** matching a
user reference image (`references/isometric-char.jpg`), generated by passing that
image to `generate_image`. Final assets in `assets/`:

- `iso-hero.png` — still sprite (menu); team color via `tintSprite()` overlay
  (not a clean accent swap — the art isn't single-accent, so we tint the whole
  sprite at `TEAM_TINT`).
- `iso-hero-idle.png` / `iso-hero-walk.png` — idle + walk animations
  (`generate_image → generate_video → generate_spritesheet`, then downscaled to
  384×384 / 64px frames). Walk plays while moving, idle when still.
- `splat-decal.png` — landing-splash decal (tinted per team + white flash).
- `icon-192.png` / `icon-512.png` — PWA icons (hero on a teal gradient).

Left/right facing is a code horizontal-flip; no directional sprites generated.
Weapon icon was not made. See `CLAUDE.md` for how sprites are wired/recolored.

These were the **placeholder** assets (64px chibi). The next pass replaces them
with the **graffiti street-tagger at 128px** (see "Direction" above) and adds the
weapon-overlay system.

## Checklist

Done (placeholder pass, 64px):

- [x] Generate the character (reference-image chibi) → `assets/iso-hero.png`
- [x] Add sprite-loading + recolor layer to `index.html` (placeholder fallback)
- [x] Generate splat decal; add idle + walk animations
- [x] Verify in browser on PC + mobile; confirm both team colors read clearly

Next (graffiti pass, 128px):

- [ ] Generate the street-tagger still → `assets/iso-hero.png` (replace), 128px
- [ ] idle/walk video → spritesheet → downscale to 768×768 / 128px frames
- [ ] Set `FRAME_W`/`FRAME_H` = 128; **re-measure** `ANIM_FOOT_Y`/`ANIM_CX`/`ANIM_H`
- [ ] Bump `CACHE` in `sw.js` so clients pick up the new art
- [ ] (Next phase) weapon overlays + `WEAPONS` data model + extra characters
