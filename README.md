# Paint Arena — Isometric Paint-Control Prototype

A tiny Splatoon-style territory game in a single file. Move around an isometric
arena, spread paint, and own more floor tiles than the enemy AI before the
60-second timer ends. Placeholder graphics only (colored diamonds + capsules).

## Run it

Just open `index.html` in any modern browser — double-click it, or drag it into
a browser tab. No install, no build step, no server needed.

Works on **PC and mobile** (the same file).

## Controls

**PC**
- Move (8 directions): `W` `A` `S` `D` or Arrow keys (hold two for diagonals)
- Paint: `Space` (hold to spray continuously)
- Dash: `Shift`

**Mobile / touch**
- Move: virtual joystick (touch & drag on the left half of the screen)
- Paint: **PAINT** button (bottom-right)
- Dash: **DASH** button (bottom-right)

## Rules

- 14×14 isometric arena, one player vs one simple wandering enemy AI.
- Both characters use identical stats (speed, paint range, cooldown, splat size).
- **Ink meter:** every shot costs ink. Your ink only refills fast while you
  stand on **your own** paint (slowly on neutral floor, barely on enemy paint).
  Run dry and you must fall back to your turf to reload.
- **Enemy turf slows you:** moving over enemy-colored tiles cuts your speed in
  half. **Dashing ignores the slow**, so dash is your escape from enemy ground.
- When the timer hits 0, tiles are counted:
  - You own more → **Victory**
  - Enemy owns more → **Defeat**
  - Equal → **Draw**
- Hit **Play Again** to restart.

## Tuning

All gameplay numbers live in the `STATS` object near the top of the `<script>`
in `index.html` (speed, paintRange, paintCooldown, splatRadius, dash values,
ink economy, and the `enemyPaintSlow` movement penalty).
Arena size is `GRID_W` / `GRID_H`; match length is `MATCH_TIME`.

## Out of scope (deliberately)

No hero abilities, character selection, health/combat, or final art — this
prototype only tests whether the core paint-control loop is fun.
