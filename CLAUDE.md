# CLAUDE.md

Guidance for working in this repository.

## What this is

A **single-file isometric paint-control arena game** (Splatoon-style territory
prototype). The player paints floor tiles, an enemy AI paints in its own color,
and whoever owns more tiles when the 60-second timer ends wins. Pure placeholder
art (colored diamonds + capsules). Built to test whether the paint-control loop
feels fun, and to be easy to expand.

## Project layout

- `index.html` — **the entire game**: HTML + CSS + JS, all inline, no build step,
  no dependencies. Open it directly in a browser (PC or mobile).
- `README.md` — player-facing run instructions, controls, and rules.
- `CHARACTER.md` — art/asset plan: how to generate the character sprite via the
  GameLab Studio MCP, asset specs, prompts, credit budget, and integration steps.
- `assets/` — generated sprites (created once art generation begins; PNGs only).

There is no package.json, bundler, framework, or server. Do not add one unless
asked — zero-setup portability is a core goal.

## Art / asset pipeline

Sprites are generated with the **GameLab Studio MCP** (`gamelab-studio`, SSE),
configured in the project's `.claude.json`. See `CHARACTER.md` for the full plan.
Key constraints to respect when generating or wiring assets:

- **Pixel art**, small + low-color (≤64×64, ≤12-color palette, transparent PNG,
  no baked shadow). The MCP crashes/corrupts on heavy sprites — keep them light
  and generate **one sprite per call** (no sheets).
- **Generate once, recolor in code.** Characters use a neutral body + one accent
  zone; the two teams (`#38e0c8` / `#ff9f43`) come from a code palette swap, not
  separate generations. Credit budget is tight — don't generate per-team or
  per-direction.
- **MCP tools load on Claude Code restart.** If the server was just added, reload
  the window before its tools are callable (`claude mcp list` to verify health).
- When drawing sprites on canvas, set `ctx.imageSmoothingEnabled = false` (after
  each `resize()`) and keep a placeholder-shape fallback so the game runs even if
  a sprite is missing.

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
- **Iso helpers:** `worldToScreen(col,row)`, `tileOwnerAt(col,row)`.
- **State:** `tiles[row][col]` (owner per tile), `player`/`enemy` (from
  `makeCharacter`), `projectiles`, `splats`, and a `state` machine
  (`menu → countdown → playing → paused → ended`).
- **Core systems:** `moveCharacter` (8-dir, enemy-paint slow), `firePaint`
  (ink-gated arcing projectile), `paintAround`, `rechargeInk`, `updateEnemyAI`
  (dumb wander + retreat-to-recharge), `updateProjectiles` (arc + landing splat).
- **Audio:** WebAudio, no files — `playShoot`, `playSplat`, `playBeep`,
  `playTone` + `playWin`/`playLose`/`playDraw`. Unlocked on the Start click.
- **Render:** `render()` draws tiles back-to-front, splats, depth-sorted
  entities (inside a screen-shake transform), then HUD / edge-pulse / countdown /
  touch UI. Game loop is `frame()` (delta-timed `requestAnimationFrame`).
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

No hero abilities, character selection, health/combat, final art, multiple
maps, or balancing. It's a feel test for the core paint-control loop.
