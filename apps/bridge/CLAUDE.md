# Bridge — Art Direction

This file is the single source of truth for the **bridge app's** visual style — applies to `apps/bridge/` only, not to any other Becknology app. All procedural drawing AND all PNG asset generation for the bridge must conform to this spec. If a new asset doesn't fit these rules, the asset is wrong, not the rules.

> **Agents (Claude Code, Codex, etc.):** copy/paste prompts live in `apps/bridge/PNG-PROMPTS.md`. The full master prompt is also embedded in this file under "PNG generation rules" so either is a valid source.

<!-- Last reviewed: 2026-05-07 -->

## North star
**Cozy 2D farming RPG (Stardew Valley / Harvest Moon / Rune Factory).** Specifically: high-oblique elevated front-facing building sprites that drop onto a top-down tile map (full facade visible AND most/all of the roof plane visible from above), 16-pixel-per-tile pixel art, hand-drawn character with a 4-frame walk cycle per direction, static buildings with frame-based animated overlays (smoke, water, doors, fire). We are intentionally hybrid — we use both AI-generated PNG sprites and procedural canvas drawing. The job of this doc is to make those two paths produce the same look.

## Resolution & scale

| Concept | Value |
|---|---|
| Base tile (logical) | 16 × 16 "art units" |
| Render scale | 3× (each tile = 48 × 48 screen px) |
| Procedural unit `u` | `tileSize / 16` = 3 screen px |
| PNG source density | 16 px per tile (so a 4-tile-wide building PNG is 64 px wide native) |
| PNG base after chunkify | 16-24 px per tile (set per-sprite via `loadBuildingSprite(key, path, chunkWidth)`) |
| All scaling | nearest-neighbor only — `imageSmoothingEnabled = false` |

## Procedural drawing rules — match the PNG style

The procedural drawers in `js/worlds/*.js` should look like they were drawn at 16 logical pixels per tile, even though they're rendered with `fillRect`. This is what keeps procedural and PNG art looking like the same family.

**Rules:**
1. **No sub-pixel detail.** Every `fillRect` width/height should be a whole multiple of `u` (or at minimum `Math.max(1, u)` for thin lines). Avoid `u * 0.4`, `u * 0.5`, etc. — those are vector-style.
2. **Limited palette per element.** 3-4 tones max: highlight, midtone, shadow, deep shadow. No smooth gradients in foreground objects (gradients are OK for sky/sea/halo backgrounds where we want a soft fade).
3. **Hard edges.** Pixel-perfect color boundaries. No anti-aliasing.
4. **1-pixel outlines on subjects.** Most foreground objects should have a `Math.max(1, u)` dark outline — matches Stardew and PNG style.
5. **Animation as overlay.** Animation goes in a separate pass on top of static art (see `drawChimneySmoke`, `drawWindowFlicker`). Keep it cheap and frame-based — small additive sprites or simple `Math.sin` modulations.

## PNG generation rules

**View angle: high oblique elevated front-facing RPG building view.** The building faces directly forward with the full front facade readable, AND most or nearly all of the roof plane is visible from above. The roof should feel almost top-down while the front wall stays fully visible. This is the classic farming-RPG building sprite that drops onto a top-down tile map (Stardew, Harvest Moon, Rune Factory).

**Not allowed:** true isometric, diagonal rotation, realistic vanishing-point perspective, side view, or pure top-down roof-only view.

**Composition:**
- Door at bottom-center so the building sits naturally on a tile map.
- Roof plane visible from above at a strong high oblique — most/all of the roof readable.
- Front facade fully readable below the roof.
- Windows are clearly defined frames with simple yellow-glow glass — *no detail painted inside the window*. We layer animated glow on top.
- Chimney (if present) at upper-right or upper-left of the roof, with empty space *above* the chimney top. We draw smoke procedurally there.
- Lantern (if present) beside the door, with a small flame shape. We replace the flame with animated procedural flicker.
- Hanging sign (if present) attached to a corner of the upper floor by a chain/bracket.
- Stone or wooden foundation visible at the base, sitting on the ground.

**Master prompt (paste into every PNG generation — long form):**

> Create a pixel art PNG of a [BUILDING TYPE] for a cozy 2D farming RPG.
>
> **View / camera.** Use a consistent elevated front-facing RPG building view. The building faces directly forward. Show the full front facade clearly. Show most or nearly all of the roof plane from above, with a strong high oblique angle. The roof should feel almost top-down while the front wall remains fully readable. This should look like a classic farming RPG building sprite placed on a top-down map. Keep the entrance near the bottom-center so the building sits naturally on a tile map.
>
> **Perspective rules.** No true isometric perspective. No diagonal rotation. No realistic vanishing-point perspective. No side view. No pure top-down roof-only view. The angle should be a fixed high oblique building sprite view.
>
> **Pixel art style.** Chunkier, more visibly pixelated high-resolution pixel art. Strong visible pixel blocks and pixel clusters. Crisp hard edges. No anti-aliasing. No smooth painting. No blur. No realism. No 3D, no voxel, no low-poly. Clear dark outlines. Slightly simplified forms so the sprite reads cleanly. Cozy retro RPG aesthetic. Warm, inviting lighting. Clean sprite-like shading. Readable at small size.
>
> **Visual language / consistency.** Same camera angle, roof visibility, pixel density, chunky pixel treatment, outline thickness, cozy farming-RPG mood, relative scale, and simplified clean sprite rendering as the rest of the building set.
>
> **Composition.** Center the building in the canvas. Show the full building with minimal transparent padding. Transparent background. Clear silhouette. Keep the building isolated as a clean game asset sprite.
>
> **Design details.** [INSERT BUILDING DETAILS HERE]
>
> **Match the same camera angle, roof visibility, outline weight, and chunkier pixel-art rendering as the existing building set.**

**Master prompt — short form (single paragraph):**

> Create a pixel art PNG of a [BUILDING TYPE] for a cozy 2D farming RPG. Use a fixed elevated front-facing building view: show the full front facade, but also show most or nearly all of the roof from above, as if viewed at a high oblique angle. The roof should feel almost top-down while the front wall is still fully visible. No isometric view, no diagonal rotation, no realistic perspective, and no pure top-down roof-only view. Use chunky, visibly pixelated high-resolution pixel art with crisp hard edges, strong pixel blocks, dark outlines, simple clean sprite shading, no anti-aliasing, no smoothing, transparent background, minimal padding, and a warm cozy farming-RPG aesthetic. Keep the camera angle, roof visibility, pixel density, and overall sprite style consistent with the rest of the building set. Design details: [INSERT DETAILS]. Match the same camera angle, roof visibility, outline weight, and chunkier pixel-art rendering as the existing building set.

**Sizing reference (native PNG dimensions):**
| Asset type | Footprint (tiles) | Native PNG dimensions |
|---|---|---|
| Small house / cottage | 3w × 3h | 768 × 768 |
| Medium building (tavern, inn) | 4w × 4-5h | 768 × 768 to 1024 × 1024 |
| Large building (manor) | 5w × 5h | 1024 × 1024 |
| Tall tower / lighthouse | 2-3w × 5-7h | 384-512 × 1024+ |
| Wide creature (dragon) | 4w × 3h | 1024 × 768 |
| Hero sign / billboard | 4w × 2h | 1024 × 512 |

PNGs should be square or larger than needed — we crop visually via the anchor system. **Native resolution is high (700-1200px) on purpose** — we let the chunkify pass downsample to ~16-24 px per tile. Don't ask DALL-E for "low res pixel art at 64px"; it doesn't render small images well. Generate big, downsample in code.

**Animation hooks.** When generating PNGs, design them so we can layer animation on top:
- **Chimney**: leave clear sky directly above the chimney top — no overhang or roof piece extending up there. Smoke needs vertical room.
- **Windows**: paint a flat warm yellow rectangle in the frame. Don't paint candles, faces, or detail inside the window. We pulse the window with a procedural overlay.
- **Door**: paint a closed door, rectangular and simple. We may overlay an "open" frame later.
- **Lantern by door**: paint the lantern body but the flame area should be a small empty circle/oval so we can flicker it procedurally.
- **Hanging sign**: chain from the building, with the sign hanging straight down (we may add a sway animation later).

## World palettes

Each world has its own constrained palette. Both PNG prompts and procedural drawers should stick to these (with reasonable variations).

### Lumar — fantasy port at night
- Saltstone walls: `#1a1e20` `#252a28` `#3a4848`
- Wood (warm): `#3a2410` `#5a3a1a` `#7a4e22`
- Wood (deep): `#2a1808` `#1a1010`
- Roofs: dark green `#2a4828`, slate blue `#2a3548`
- Glass / window glow: warm yellow `#ffe080` `#c08840`
- Sea: emerald `#1a4030` `#2a7050`, foam `#90e0a8`
- Brass: `#a08040` `#e0c060`

### Arcadia — neon cyberpunk
- Walls (dark metal): `#080418` `#1a1530` `#2a2a3e`
- Floors: `#2a2240` `#3a3650`
- Neon pink: `#e870c0` `#f078a8` `#a040c0`
- Neon cyan: `#5cc8d0` `#80e0e8`
- Neon purple: `#7080e8` `#3a1840`
- Glass: smoked dark `#181a40` `#3a1840`

### Singularity — cosmic void
- Platform: `#2a2040` `#252038`
- Edge stone: `#1a1430` `#0e0820`
- Singularity core: `#a080e0` `#d0c0ff` `#fff`
- Crystals: `#503090` `#8060c0` `#c0a0f0`
- Void: `#050510` `#080418`

### Enigma — abandoned space station
- Walls: `#0e1820` `#1a2530` `#253540`
- Floor: `#182028` `#1e2830`
- Cyan accents: `#40c8d8` `#80e0e8`
- Warning: `#e84040` `#e8c040`
- Server LEDs: `#40e080` `#e06040` `#40a8e0`

## NPC sprite sheets — future spec

When we add NPC walking animation, this is the format to use:

| Spec | Value |
|---|---|
| Frame size | 16 × 32 px (head + body) |
| Frames per direction | 4 (idle, step1, idle, step2 — creates a 1-2-1-3 cycle) |
| Direction order | down, right, up, left |
| Sheet layout | 4 cols × 4 rows = 64 × 128 native, 16 frames total |
| Animation tick | ~120 ms per frame |

The character at `js/character.js` is currently drawn procedurally. When we ship sprite sheets, the procedural drawer becomes a fallback and the sprite-sheet path is preferred.

## Engine integration

### Adding a new PNG building
1. Drop the PNG in `apps/bridge/assets/buildings/{name}.png`
2. In `js/worlds/lumar.js` (or whichever world's tileset), add a `loadBuildingSprite('{name}', '/bridge/assets/buildings/{name}.png', chunkWidth)` call near the top.
3. Add a drawer function that calls `drawBuildingSprite(ctx, x, y, ts, '{name}', tilesW, tilesH, anchorOffsetX)`.
4. Optionally layer animation: `drawChimneySmoke(ctx, ...)`, `drawWindowFlicker(ctx, ...)` — call after drawing the sprite.
5. Register the drawer in `BridgeWorld.registerTileset(...)` with a unique tile id.
6. In the world's JSON, set the anchor tile id at the building's bottom-center, and set the tiles in the building's footprint to `0` (void) with `collisions = 1` (blocked) so the player can't walk through.

### `chunkWidth` per asset
Tune until the building's pixel density matches the procedural drawers around it. For 4-tile-wide buildings, start at 96. Lower = chunkier. Don't go below 64 for buildings or details disappear.

### The PNG halo cleanup
`loadBuildingSprite` post-processes alpha to strip DALL-E's cream halo. Three rules in priority:
1. Pure white pixels (max channel >230, low saturation) → fully transparent.
2. Partially-transparent + bright + low-saturation pixels → fully transparent.
3. Cream/off-white interior pixels (max >215, low sat, total brightness >620) → fully transparent.

If a new PNG comes in with a colored background instead of white, this cleanup won't catch it — we'll need to extend the rules.

## Don't

- Don't ask the image model for "isometric," "diagonal rotation," "realistic perspective," "side view," or "pure top-down roof-only view." High-oblique elevated front-facing only.
- Don't generate PNGs at 64×64 native — image models render small badly. Generate 700-1200px and let chunkify handle resolution.
- Don't paint window interiors in PNGs. Yellow rectangle only — we overlay glow.
- Don't use sub-tile detail in procedural drawers. Whole `u` units only for foreground subjects.
- Don't introduce a new color palette without adding it to this doc first.
- Don't mix view angles in the same world — every building must use the same high-oblique camera.
- Don't generate art with these prompts for any other Becknology app (aether-seas, cipher-room, etc.). These rules apply to the **bridge app only**.

## Reference: what good looks like

- **Tavern PNG** at `apps/bridge/assets/buildings/tavern.png` — gold standard for building art.
- **Procedural lantern** at `drawLantern` in `js/worlds/lumar.js` — gold standard for matching procedural style (limited palette, hard edges, 1-px outline).
- **Animated sea bands** at `drawSeaShared` — gold standard for procedural animation.

If a future asset doesn't match these, fix the asset.
