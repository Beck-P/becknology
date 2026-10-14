# Bridge — Art Direction

This file is the single source of truth for the **bridge app's** visual style — applies to `apps/bridge/` only, not to any other Becknology app. All procedural drawing AND all PNG asset generation for the bridge must conform to this spec. If a new asset doesn't fit these rules, the asset is wrong, not the rules.

> **Agents (Claude Code, Codex, etc.):** copy/paste prompts live in `apps/bridge/PNG-PROMPTS.md`. The full master prompt is also embedded in this file under "PNG generation rules" so either is a valid source.

<!-- Last reviewed: 2026-10-14 -->

## North star
**Cast n Chill meets Stardew Valley.** A cozy 2D world that feels alive — very slightly pixelated, painterly light, rich small detail: Stardew's readable top-down map and high-oblique building sprites (full facade visible AND most/all of the roof plane visible from above), with Cast n Chill's richer detail, mood lighting and constant small motion (smoke, flicker, water, breathing idles). We are intentionally hybrid — AI-painted PNGs, Blender-rendered sprites and procedural canvas drawing all meet on **one native pixel grid**, under one lighting model. The job of this doc is to keep those paths looking like one game.

## Rendering pipeline (js/world.js)

1. Each frame the world is painted into a small offscreen canvas at **32 native px per tile**, then scaled to the screen by a **whole number** of device pixels (`zoom`). Never draw world art straight to the screen — everything lands on the same pixel grid this way.
2. The camera snaps the world to whole native pixels; the leftover fraction shifts the finished frame, so scrolling stays smooth.
3. Draw order: background → tiles (static ones from a cache) → glow → tileset overlay → loot → **pilot** → tall sprites whose base is below the pilot (so the pilot can walk behind buildings) → lighting → effects → screen-space UI (exit beacons, game markers, vignette — crisp text at CSS resolution).
4. Static tiles are detected automatically at world load (drawn at several sample times; tiles whose pixels change, or that paint outside their cell, stay live) and cached. A few cached rows are refreshed every frame, so state-driven drawers still update. Call `BridgeWorld.invalidateTiles()` after changing what a static tile looks like.
5. Movement, camera and animation run on real elapsed time (`dt`), never frame counts.
6. Inside a background or overlay drawer, use `BridgeWorld.getView()` (`{offX, offY, ts, w, h}` in native px) — not `getScale()`/`getCamera()`, which describe the screen. For mouse picking / DOM placement use `BridgeWorld.getScreenView()` (CSS px).

## Resolution & scale

| Concept | Value |
|---|---|
| Native tile | 32 × 32 px (`ts` passed to every drawer) |
| World data tile | `tileSize: 16` in world JSON is a logical unit — don't change it |
| Procedural unit `u` | `ts / 16` = 2 native px (procedural art is still authored on a 16-unit grid) |
| Sprite density | 32 native px per tile — 1 native px of detail |
| Screen zoom | whole number of device px per native px, chosen so ~20 tiles fit across |
| All scaling | nearest-neighbor only — `imageSmoothingEnabled = false` (except the light map, which is soft on purpose) |

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

Keep the subject's real proportions — the sprite is no longer stretched to fill its footprint, so a square image of a 4-wide building comes out 4 tiles tall. **Native resolution is high (700-1200px) on purpose** — `tools/bridge-art/native_sprites.py` downsamples to 32 px per tile. Don't ask an image model for "low res pixel art at 64px"; it doesn't render small images well. Generate big, convert with the tool.

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

### Bridge — ship command deck (the navigation hub)
- Walls (dark navy steel): `#0a1018` `#1a2028` `#2a3038` `#3a4048`
- Floor (polished metal panel): `#1a2030` `#2a3040` `#3a4050` (alt `#252e40`, grain `#0a0e18`)
- Cyan strip light: `#40c8d8` `#80e0e8` (subtle pulse alpha)
- Brass trim: `#a08040` `#e0c060`
- Hologram cyan: `#40c8d8` `#80e0e8` `#c0f0f8` + purple highlight `#8060c0` `#c0a0f0`
- Captain's chair (dark leather): `#0a0808` `#1a1410` `#2a1c14` (brass piping `#a08040`)
- Console panels: dark metal `#0a1018` `#1a2028` + LED accents (cyan `#40c8d8`, yellow `#ffe080`, red `#e84040`)
- Viewport (deep space): `#050510` + procedural stars/planets/ships

The Bridge is cooler and more techy than Quarters. Where Quarters is cozy
warmth, Bridge is alert calm. The hologram in the center is the room's
hero — a rotating sphere of star points and coloured planet markers,
projected from a glowing pedestal. Walking close brightens it.

### Quarters — pilot ship interior (cozy + sci-fi)
- Walls (warm dark metal): `#1a1410` `#2a2018` `#3a2820` `#4a3a30`
- Floor (warm wood): `#3a2410` `#5a3a1a` `#7a4e22` (alt plank `#4a2e14`, grain `#2a1808`)
- Cyan strip light: `#40c8d8` `#80e0e8` (subtle pulse alpha)
- Desk lamp / window glow: `#ffe080` `#c08840`
- Brass shelf trim: `#a08040` `#e0c060`
- Bed sheets (purple): `#2a1840` `#5a4078` `#8060c0`
- Pillow: `#d4c8b0` (shadow `#a89880`)
- Viewport (deep space): `#050510` `#0a0a1a` + procedural stars/planets/ships
- Drone pet: body `#80e0e8`, core `#1a3038`, LED `#ffe080`
- Ghost silhouettes (empty decor slots): `rgba(140,140,160,0.16)` fill, `rgba(180,180,200,0.42)` outline

The Quarters palette intentionally bridges Lumar (warm wood) and Enigma (cyan
sci-fi accents). The room reads as part of the same universe, but with its
own cozy identity. Animations on top: viewport stars + occasional planet/ship
events, cyan strip pulse, desk lamp dust motes, coffee-mug steam, cockpit-door
LED blink, and the drone-pet's idle wander + bob + LED.

## Character sprite sheets

Every walking character (the pilot now, NPCs next) uses this format:

| Spec | Value |
|---|---|
| Frame size | 32 × 48 native px (1 tile wide, 1.5 tall), feet 3 px above the bottom |
| Rows (direction order) | down, right, up, left |
| Columns | idle 0-3, then walk 0-7 — 12 × 4 = 384 × 192 px per sheet |
| Idle | ~340 ms per frame, sequence 0-1-2-1 |
| Walk | frame chosen from distance walked (8 frames per 2.4 tiles), not time |

The pilot uses this path (see "Characters — the Blender pipeline" below); the procedural drawer in `js/character.js` is only a fallback. NPCs are still procedural 16-unit tiles and should move to the same pipeline next.

## Engine integration

### Adding a new PNG building / prop
1. Drop the painted PNG in `apps/bridge/assets/buildings/{name}.png` (or `props/`, `creatures/`).
2. Add it to `MANIFEST` in `tools/bridge-art/native_sprites.py` with its footprint width in tiles (and `True` for the matte flood if it has a dark background instead of white).
3. Run `python3 tools/bridge-art/native_sprites.py {name}` — it writes `assets/native/{name}.png` at exactly 32 px per tile (aspect kept, halo stripped, palette-aware downscale) and updates `assets/native/manifest.js`.
4. Draw it from a tile drawer with `BridgeSprites.draw(ctx, x, y, ts, '{name}', tilesW, tilesH, anchorOffsetX)` (or the world's `drawBuildingSprite`). It sits on the anchor tile's bottom edge, centred on the footprint, over a soft contact shadow.
5. Position overlays (smoke, window glow, spray) as fractions of `BridgeSprites.area(...)` — the rect the art actually occupies — never of the raw footprint.
6. In the world JSON, put the drawer's tile id on the anchor (bottom-centre) tile, set the footprint tiles to `0` (void) with `collisions = 1`.

### Characters — the Blender pipeline
Every character (the pilot, NPCs) is a cel-shaded 3D model rendered straight to 32 × 48 native frames by `tools/bridge-art/characters.py`, using the same 45° camera and tile units as the pre-rendered scenes (so a seated NPC sits at exactly stool height):

```
python3 -m venv BVENV && BVENV/bin/pip install bpy==5.2.2   # Python 3.13
BVENV/bin/python tools/bridge-art/characters.py /tmp/chars/pilot pilot
python3 tools/bridge-art/sprites_post.py pilot /tmp/chars/pilot
BVENV/bin/python tools/bridge-art/characters.py /tmp/chars/npc-bartender npc-bartender
python3 tools/bridge-art/sprites_post.py npc /tmp/chars/npc-bartender
```

- Shading happens in the shader: N·L against a fixed key light (high, upper-left), three flat tone bands per material, no lamps, one sample, no filtering, no dithering — every pixel is a palette colour.
- `sprites_post.py` draws line work where one body part overlaps another (from id + depth passes) and the outer outline, then packs one sheet per colour variant into `assets/characters/`.
- Sheet layout: rows down/right/up/left; columns idle 0-3, walk 0-7. Frames are 32 × 48 and the floor point under the character (feet, or seat for sitting poses) is pixel (16, 45).
- New NPCs are a `NPCS` entry in `characters.py` (skin, shirt, hair, hat, beard, apron, vest, pose).

### Pre-rendered Blender scenes (the target for every world)
Rooms and areas are being rebuilt as Blender scenes. A scene is a script in `tools/bridge-art/scenes/` that places parts from an asset kit on the world's own tile grid, renders it, and rewrites the world JSON to match what was built (`scenekit.apply_world`: collisions from the placed objects, interactions moved onto their objects, NPC actors, the `scene` reference). Kits: `assets_lumar.py` (Lumar rooms — floors, walls, furniture, shop fittings, fireplaces, lamps), `assets_magic.py` (octagonal masonry rooms, angled windows, spell circles, candelabras, telescope…), `assets_cave.py` (rock faces, cave floor, lava, the dragon, hoard).

Done so far — every world: the tavern, inn, bakery, smithy, apothecary, the sorceress's tower, the dragon's cave, the pilot's quarters and the bridge (`assets_ship.py`), the six Arcadia interiors (`assets_cyber.py` — neon stroke-font signs, arcade cabinets with per-game screen art, shop/bar/clinic/pawn/repair fittings), Enigma Station and the Singularity (`assets_station.py`), and the outdoor worlds (`assets_town.py` — houses with shingled gable roofs and window boxes, cobbles, the fountain, bell tower, market stalls, trees, benches, bunting, lantern posts, running-bond flagstones, the broadside galleon and rowboats; `assets_cyber.py` storefronts, street lamps, puddles and planters for the Arcadia District): Lumar Harbour, the Market Square, the four islands, the Arcadia District.

```
BVENV/bin/python tools/bridge-art/scenes/lumar_tavern.py /tmp/tavern
python3 tools/bridge-art/scene_post.py /tmp/tavern apps/bridge/assets/scenes/lumar-tavern
```

- **Camera:** orthographic, 45° elevation; the world is stretched along rows by 1/sin 45° so every floor tile lands on an exact 32 × 32 px cell — the render lines up with the game grid.
- **Light is real:** Cycles renders lamps, fire and moonlight with cast shadows. `scene_post.py` shades it Cast n Chill-style: a smooth tone curve quantized into many small steps with 4 × 4 ordered dithering, colour of the light kept, soft lines (a deeper shade of the surface) where one part sits in front of another.
- **Firelight flickers:** each scene renders two light states (`full`, `dim`); the engine cross-fades them.
- **Depth, not layers:** `depth.png` stores per-pixel depth; `js/scene.js` depth-tests every character against it (a character is an upright billboard at its foot row), so walking behind tables, counters and stools is always right — no hand-sorted layers.
- **Characters pick up the room's light** from a per-tile light grid the render bakes (`tileLight` in `scene.json`).
- NPCs are `actors` in the world JSON's `scene` block (sheet, tile, facing, `pose: "sit"`), drawn with idle animation.
- **Scenekit primitives** (all in tile units — x, row, z): `box`, `cyl`, `cyl_x`, `cyl_y`, `sphere`, `cone`, plus oriented ones — `bar` (a box between two floor points, for angled walls and rune strokes), `tube` (cylinder/cone between two 3D points: limbs, telescopes, horns), `blob` (rotated ellipsoid), `rock` (faceted boulder) `poly` (flat surface: wing membranes, sails) and `loft` (skin through cross-section rings: hulls, curved shells). `assets_town` adds `annulus` (ring walls: basins, rims), `pyramid` (square roofs lined up with the walls — a 4-sided cone sits at 45°) and `lantern` (open iron frame round lit glass — never enclose an emissive part in a solid box). Meshes are built with bmesh, so a scene of a thousand-plus parts builds in seconds.
- **Glows add on top of the lit colour.** The glow you see is the emission colour × its strength (capped at 1); a strength above 1 only casts more light on the room. Give a glowing part a dark albedo and a saturated colour; bright albedo + strong emission clips to white. For a faint glow (puddles, coins under water) use a low strength.
- Mark tiles an object stands on with `k.solid(...)`, including tiles NPC actors stand on — `apply_world` only knows what you mark. Also block walkable tiles where a tall object in front would hide the player almost completely (behind cabinets, vending machines, the strip behind a row of houses).
- **Don't overlap coplanar boxes** (e.g. per-tile ground slabs that overhang each other): they catch each other's shadows and the tile grid shows as dark seams. Build one box per run of cells, or butt them exactly.
- **Water is the backdrop:** a `'HOLDOUT'` plane at z = 0 under a ship hides the hull below the waterline so it sits in the engine's animated sea.
- **Holes onto live art:** a part with albedo `'HOLDOUT'` renders transparent (viewports onto space). The world's `scene.sky` rect (screen tiles) tells the world script where to draw its animated sky; register it as the `behind` hook (below).
- **Swappable decor:** parts built inside `with k.variant(slot, key):` are left out of the base render and rendered alone in the room's light; `scene_post.py` writes them to `layers/<slot>/<key>/`. The world script calls `BridgeScene.setLayers(sceneId, {slot: key|null})` and the engine composites the chosen variants into the scene image and depth (the quarters' catalog decor and trophies work this way).
- **Live things in a scene world** register `BridgeWorld.registerSceneHooks(tileset, {behind, items, over})`: `behind` draws before the render (shows through holes), `items` returns `{footRow, draw}` entries sorted with the characters — draw them with `BridgeScene.drawOccluded(...)` so furniture hides them correctly (the drone, the hologram) — and `over` draws on top (steam).
- **`scene.backdrop: true`** draws the world's own registered background (space, the void, the Lumar sea) wherever the render is empty — stations floating in space, islands in the sea.
- Ship scenes use `flicker.mode: "pulse"` — a slow breathing cross-fade between the light states for LED strips, instead of firelight flicker.

### Interactions
`js/interactions.js` picks the target by proximity: anything within 1.5 tiles (the eight tiles round you, or the one you stand on), the one you face first, then the nearest; something two tiles ahead counts when a solid tile (a counter) stands between. No exact tile to stand on. The prompt is a small glass pill floating over the target — key cap, verb, name — built from the interaction's `prompt` (`"PRESS E TO TALK"` → *Talk*) and `label`; tap or click it to act. A soft pool of light marks the target's foot. Games get a small gold ▶ badge and exits a teal chevron; the one you're next to gives way to the pill. Clicking an object's body (up to two tiles above its tile) also uses it.

### Lighting
A world opts in with a `lighting` block in its JSON (see the header of `js/lighting.js` for every field): an `ambient` colour, `fromGlow` (reuse the world's `tileGlow` tiles as lights, with `skip` for things like glowing sea), `tileLights` (a light on every tile of a type — lanterns, fireplaces, lava), hand-placed `lights`, a faint `pilot` light and `bloom`. Keep lights where the art shows a source, warm for fire and lamps, coloured for magic and neon. Lighting is subtle on the ship and stations and moody at night in Lumar.

### Ground under objects
Lumar object tiles (NPCs, lanterns, crates, stalls) paint the world's ground under themselves via `drawGround()`. A world chooses it with `"groundTile"` in its JSON (e.g. `28` cobblestone in the Market Square). New object drawers should call `drawGround`, not a specific floor.

## Don't

- Don't ask the image model for "isometric," "diagonal rotation," "realistic perspective," "side view," or "pure top-down roof-only view." High-oblique elevated front-facing only.
- Don't generate PNGs at 64×64 native — image models render small badly. Generate 700-1200px and let chunkify handle resolution.
- Don't paint window interiors in PNGs. Yellow rectangle only — we overlay glow.
- Don't use sub-tile detail in procedural drawers. Whole `u` units only for foreground subjects.
- Don't load or stretch full-size PNGs at runtime — convert them to native sprites with the tool.
- Don't count frames for timing — use elapsed time.
- Don't draw text into the world buffer; text belongs in the screen-space layer.
- Don't introduce a new color palette without adding it to this doc first.
- Don't mix view angles in the same world — every building must use the same high-oblique camera.
- Don't generate art with these prompts for any other Becknology app (aether-seas, cipher-room, etc.). These rules apply to the **bridge app only**.

## Reference: what good looks like

- **Tavern PNG** at `apps/bridge/assets/buildings/tavern.png` — gold standard for building art.
- **Procedural lantern** at `drawLantern` in `js/worlds/lumar.js` — gold standard for matching procedural style (limited palette, hard edges, 1-px outline).
- **Animated sea bands** at `drawSeaShared` — gold standard for procedural animation.

If a future asset doesn't match these, fix the asset.
