# CLAUDE.md

Guidance for working in this repository.

## What this is

A **single-file isometric paint-control arena game** (Splatoon-style territory
prototype). The player paints floor tiles, an enemy AI paints in its own color,
and whoever owns more tiles when the 60-second timer ends wins. Code-drawn iso
tiles/HUD plus a generated **pixel-art character** (idle + walk animations,
recolored per team). Built to test whether the paint-control loop feels fun, and
to be easy to expand. Deployed as a PWA on GitHub Pages
(https://shafiq1rwan.github.io/Turf-Splash/).

## Project layout

- `index.html` — **the entire game**: HTML + CSS + JS, all inline, no build step,
  no dependencies. Open it directly in a browser (PC or mobile).
- `README.md` — player-facing run instructions, controls, and rules.
- `CHARACTER.md` — art/asset plan: how to generate the character sprite via the
  GameLab Studio MCP, asset specs, prompts, credit budget, and integration steps.
- `assets/` — generated PNGs: `iso-hero.png` (still), `iso-hero-idle.png` /
  `iso-hero-walk.png` (6×6, 32-frame, 64px spritesheets), `splat-decal.png`,
  and PWA `icon-192.png` / `icon-512.png`.
- `manifest.webmanifest` + `sw.js` — PWA manifest and service worker (offline app
  shell + install). All paths are **relative** so it works under the
  `/Turf-Splash/` Pages subpath. Bump `CACHE` in `sw.js` when shipping new assets.

There is no package.json, bundler, framework, or server. Do not add one unless
asked — zero-setup portability is a core goal. The repo is a git repo with
`origin` on GitHub; pushing to `main` auto-rebuilds the Pages site. `.mcp.json`
holds the GameLab API key and is gitignored — never commit it.

## Art / asset pipeline

Sprites are generated with the **GameLab Studio MCP** (`gamelab-studio`, SSE),
configured in the project's `.claude.json`. See `CHARACTER.md` for the full plan.
Key constraints to respect when generating or wiring assets:

- **Pixel art**, small + low-color (≤64×64, ≤12-color palette, transparent PNG,
  no baked shadow). The MCP crashes/corrupts on heavy sprites — keep them light
  and generate **one sprite per call** (no sheets).
- **Recolor in code via `tintSprite()`** (offscreen canvas, `source-atop` overlay)
  for the **splat decal** (full alpha) and **cover block** (`COVER_TINT` 0.5). The
  **character is NOT tinted** — the Painter keeps its natural colors for both teams
  (tinting its teal body orange looked muddy); ownership is shown by a
  **team-colored ground ring** (`drawTeamRing`, teal `#38e0c8` / orange `#ff9f43`,
  with a dark casing so it reads on same-color turf).
- **Character facing:** 8-direction. Five aiming stills are generated
  (`assets/painter{,-se,-e,-ne,-n}.png`, 128px) and **se/e/ne are mirrored** for
  sw/w/nw. `facingDir(ch)` maps grid facing → screen angle → sprite + flip;
  `DIR_META` holds each sprite's measured foot/center/height anchor. Run motion is
  a **code-driven vertical bounce** (`RUN_BOB_*`), since the frames are stills.
  Credit budget is tight — don't generate per-team copies.
- **Animations** were made via the MCP pipeline `generate_image → generate_video
  → generate_spritesheet`, then the huge (8640²) sheet was **downscaled to a
  384×384 / 64px-frame sheet** with PowerShell `System.Drawing`. Frames play by
  indexing `gameClock * ANIM_FPS`. A video is ~3 credits, a spritesheet ~1.
- **MCP tools load on Claude Code restart.** If the server was just added, reload
  the window before its tools are callable (`claude mcp list` to verify health).
- Sprites are **foot-anchored** (measured feet row within the frame, not the
  frame edge) so they stand on tiles instead of floating. `ctx.imageSmoothingEnabled
  = false` after each `resize()`; every sprite path has a fallback (anim → still
  sprite → placeholder capsule) so the game runs even if a PNG is missing.

## How to run / verify

Open `index.html` in any modern browser (double-click or drag into a tab).
To sanity-check the JS after edits, extract the inline script and syntax-check:

```bash
node -e "const fs=require('fs');const m=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/);fs.writeFileSync('_check.js',m[1]);" && node --check _check.js && rm _check.js
```

There is no automated test suite; verification is manual in-browser (move, paint,
watch the enemy, let the timer end, check the win/lose screen, test pause, and
resize / use touch for mobile).

## Architecture (all inside `index.html`'s single `<script>` IIFE)

- **Config:** `STATS` (shared by player + enemy — they are mechanically
  identical), `GRID_W`/`GRID_H`, `TILE_W`/`TILE_H` (64×32, 2:1 iso), `MATCH_TIME`,
  `COLORS`, `OWNER` enum.
- **Iso helpers:** `worldToScreen(col,row)` returns **arena-local** coords;
  `render()` applies `offX`/`offY` + `viewScale` via a canvas transform.
  `tileOwnerAt(col,row)`. **Camera:** `resize()` sets `viewScale` to a zoomed-in
  level (targets ~`CAM_VISIBLE_X`/`CAM_VISIBLE_Y` tiles across, clamped by
  `CAM_ZOOM_MIN/MAX`); `updateCamera(dt, snap)` smoothly centers `offX`/`offY` on
  the player each frame (`CAM_LERP`), clamped to the arena + `CAM_MARGIN` overscroll.
- **State:** `tiles[row][col]` (owner per tile), `blocked[row][col]` (obstacle:
  impassable but **paintable cover**), `spawnPlayer`/`spawnEnemy` (home pads),
  `player`/`enemy` (from `makeCharacter`), `projectiles`, `splats`, and a `state`
  machine (`menu → countdown → playing → paused → ended`).
- **Obstacles:** `buildObstacles(pStart,eStart)` fills `blocked` with a
  **randomized point-symmetric** layout each match (scattered, non-adjacent so
  the arena never traps/bisects; kept clear of spawns — tune `OBSTACLE_COUNT_*`
  / `OBSTACLE_SPAWN_CLEAR`). Walls are **paintable cover** (Splatoon-style): they
  block movement (`isBlocked` + per-axis slide in `moveCharacter`) and stop shots,
  but a shot that hits one **paints it** and it counts as turf. Drawn as the
  generated **graffiti cover-block sprite** (`assets/cover-block.png`, base-aligned
  to the tile in `drawObstacle`) — plain when neutral, washed toward the owning
  team's color once painted; falls back to a code-built iso cube if the PNG is
  missing. Depth-sorted with chars.
- **Core systems:** `moveCharacter` (8-dir, enemy-paint slow, obstacle slide),
  `firePaint` (ink-gated arcing projectile), `paintAround`, `rechargeInk`,
  `updateEnemyAI` (dumb wander + retreat-to-recharge), `updateProjectiles`
  (arc + landing splat).
- **Audio:** WebAudio, no files — `playShoot`, `playSplat`, `playBeep`,
  `playTone` + `playWin`/`playLose`/`playDraw`. Unlocked on the Start click.
- **Render:** `render()` draws the world inside one transform (`offX/offY` +
  screen-shake + `viewScale` zoom): tiles back-to-front, splats, depth-sorted
  entities, then HUD / edge-pulse / countdown / touch UI in **screen space**
  (unscaled). `drawCharacter` picks walk vs idle sheet by `ch.walkTimer`, tints
  per team, foot-anchors, and h-flips by `ch.faceLeft`. Game loop is `frame()`
  (delta-timed `requestAnimationFrame`).
- **Input:** keyboard map + a shared `inputDir` vector; touch joystick + on-screen
  paint/dash buttons drawn on canvas. Both platforms feed the same pipeline.

## Conventions

- **Keep it one file, vanilla, dependency-free.** New features go inline in
  `index.html`, matching the existing plain-function style (no classes/modules).
- **Player and enemy share `STATS`** — keep them mechanically identical unless a
  feature explicitly requires asymmetry. All tuning lives in `STATS` /
  `GRID_*` / `MATCH_TIME`; prefer adding a constant there over hardcoding.
- **2-space indentation**, `camelCase`, terse comments only where intent isn't
  obvious. Match the surrounding code's density.
- The game is a state machine — gate new update/render logic on `state` rather
  than ad-hoc flags.

## Tuning cheatsheet

All knobs live in `STATS` (top of the `<script>`) unless noted. Bump these to
change game feel — no other code changes needed.

| Knob | What it controls | Feel effect |
|------|------------------|-------------|
| `speed` | base movement (tiles/sec) | higher = faster, twitchier |
| `paintRange` | how far a paint shot travels | higher = paint from afar; also raises the arc |
| `projectileSpeed` | shot travel speed | higher = snappier, less lob time |
| `paintCooldown` | seconds between shots | lower = faster fire rate |
| `splatRadius` | tiles painted per landing | higher = more coverage per shot |
| `hitbox` | character collision size (tiles) | (reserved; combat not implemented) |
| `dashSpeed` | speed while dashing | higher = longer dash distance |
| `dashTime` | dash duration (sec) | higher = longer dash |
| `dashCooldown` | seconds between dashes | lower = dash more often |
| `maxInk` | ink tank size | higher = more shots before reloading |
| `inkPerShot` | ink drained per shot | higher = fewer shots per tank |
| `inkRechargeOwn` | refill/sec on **your** paint | higher = reload faster on home turf |
| `inkRechargeNeutral` | refill/sec on unpainted floor | governs sustained fire on neutral ground |
| `inkRechargeEnemy` | refill/sec on **enemy** paint | keep low to punish standing on enemy turf |
| `enemyPaintSlow` | move multiplier on enemy paint | lower = harsher slow (0.5 = half speed) |

Other tuning, outside `STATS`:

- **Arena size:** `GRID_W` / `GRID_H`. **Tile size:** `TILE_W` / `TILE_H` (keep 2:1).
- **Camera:** `CAM_VISIBLE_X`/`CAM_VISIBLE_Y` (lower = more zoomed in),
  `CAM_ZOOM_MIN`/`CAM_ZOOM_MAX` (clamp), `CAM_LERP` (follow snappiness),
  `CAM_MARGIN` (how far past the arena edge the camera may scroll).
- **Obstacles:** `OBSTACLE_COUNT_MIN`/`MAX` (how many blocks; each is mirrored),
  `OBSTACLE_SPAWN_CLEAR` (clearance around spawns), `OBSTACLE_H` (cube height px),
  `OBSTACLE_FACES` (per-team cube colors).
- **Match length:** `MATCH_TIME` (and the under-10s/under-5s pulse thresholds in
  `drawEdgePulse`).
- **Countdown length:** `countdown = 3.99` in `startMatch`.
- **Screen shake:** the `shakeAmt` add amounts in `updateProjectiles` (player vs
  enemy) and the decay rate in `update`.
- **Enemy aggression:** scoring + `retarget` timing and the `lowInk` retreat
  threshold in `updateEnemyAI`.
- **Audio:** note sequences/volumes in `playWin`/`playLose`/`playDraw` and the
  `playShoot`/`playSplat`/`playBeep` definitions.

## Deliberately out of scope (per the prototype brief)

No hero abilities, character selection, health/combat, multiple maps,
directional (4/8-way) sprite sets, or balancing. It's a feel test for the core
paint-control loop. (Basic pixel-art character + idle/walk animations now exist;
full polished art is still out of scope.)
