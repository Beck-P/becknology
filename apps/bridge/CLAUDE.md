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
7. The main canvas's size and scale are set every frame (`js/main.js`): a window moved to another screen changes its pixel density without a resize, and a canvas the browser drops and hands back (short of graphics memory) comes back unscaled — on `contextrestored` the scene composites and sea textures are rebuilt too.

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

### Verdance — the farm world, in daylight
- Meadow: `#5a8a3c` (lit ~`#689a40`), hedgerow `#3a6a30`, pines `#2e5a38`
- Earth: bare field `#8c6037` (lit), tilled `#68442a` with furrows `#4e321c`, wet `#46301e` / `#2e1e12`
- Lane and yards: `#9a7a4e`; timber `#7a5a38`, barn red, whitewash `#efe2c6`, roofs `#a04a30` and `#3a6a3a`
- Crops (js/farm.js, 16-unit art): leaf `#4a8a2a` `#7ac040` `#2e5a1c`, outline `#1c2c12`; produce in its own colours (turnip `#a050a0`/`#f0eaf0`, carrot `#f08020`, strawberry `#e02a3a`, sunflower `#f8c820`, pumpkin `#f08a20`, starfruit `#ffe040`)
- Dialogs: cream linen `#f2ecd6` in a green gingham frame, title `#3a7a2a`
- The one world under a sun: one key light from the west (`k.sun`), the sky's blue in the shadows, no flicker

### Hoarfell — the ice world, at alpenglow
- Snow `#e8eef6` lit pink-peach by a low sun (`#ffc4a4`), shadows violet-blue (`#8a96cc` sky light); trodden paths `#b4c0d6`
- Log chalets `#7a4a2a` / `#4e2e18`, snow-laden roofs `#f2f5fa` with icicles `#9ccce4`, red shutters `#7a2a22`
- Firs `#1f3c32` with snow on every tier; cliff strata `#6a7284` `#525a6c` `#7c8496` under a snow crown
- Accents: lift red `#b83a2e`, route lines yellow `#e0b030` (Staircase), blue `#3a8ae0` (Icefall), red (Hoarspire)
- Dialogs: frosted navy glass `#2c3a60` with ice-blue edges `#b8e0f8`, peach buttons `#f0b0a0`
- The pistes: groomed corduroy in two snow tones, untracked powder a cooler `#e0e8f4` with wind ripples, ice `#a8d4ea`; run colours green `#2a9a5a`, blue `#2a6ac0`, black `#1e1e26`; finish red `#d83a2e`, safety nets `#ff7a2a`; gate flags red `#d83a2e` / blue `#2a6ae0`
- The face: strata `#6a7284` `#525a6c` `#7c8496` `#5e6678`, chalked holds `#8a92a4` with `#f4f2ec`, loose rock `#9a6a4a`, ice `#a8d8f0` / `#7ab4d8`

### Bridge — the captain's deck (the navigation hub)
- Walls (panelled wood): `#24160c` `#3e2614` `#55361c` `#6e4828`
- Deck (scrubbed planks): `#6a4422` with trenails, a brass inlay round the helm
- Brass: `#d0a048` `#a08040`; oxblood leather `#6a2a22`; parchment `#d8c8a0`, ink `#3a2a1a`
- Glows: chart-table cyan `#40c8d8`, wireless amber `#ffb050`, aether violet `#9a7aff`, scope green `#30a060`
- Gallery (deep space): HOLDOUT — the planet the ship is parked over, drawn live

The bridge is a sky-galleon's great cabin: five arched windows in a stern
gallery, ship's lanterns hanging from the header, the helm under the
windows (wheel, binnacle, engine telegraph), the round chart table in the
middle with the hologram rising off it, the captain's wingback behind it.
Warm lamplight against the cool starlight from the gallery.

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
- New pilot suits are a `build_<style>()` in `characters.py` (sharing `legs`, `arms` and `helmet`), rendered as `pilot-<style>` and `pilot-sit-<style>` and packed with `sprites_post.py pilot-<style>` / `pilot-sit-<style>`; then an entry in `SUITS` in `js/gear.js`.

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
- **Scenekit primitives** (all in tile units — x, row, z): `box`, `cyl`, `cyl_x`, `cyl_y`, `sphere`, `cone`, plus oriented ones — `bar` (a box between two floor points, for angled walls and rune strokes), `tube` (cylinder/cone between two 3D points: limbs, telescopes, horns), `blob` (rotated ellipsoid), `rock` (faceted boulder) `poly` (flat surface: wing membranes, sails), `loft` (skin through cross-section rings: hulls, curved shells) and `boxes` (many boxes as one part — a tower's thousand lit windows). `assets_town` adds `annulus` (ring walls: basins, rims), `pyramid` (square roofs lined up with the walls — a 4-sided cone sits at 45°) and `lantern` (open iron frame round lit glass — never enclose an emissive part in a solid box). Meshes are built with bmesh, so a scene of a thousand-plus parts builds in seconds.
- **Glows add on top of the lit colour.** The glow you see is the emission colour × its strength (capped at 1); a strength above 1 only casts more light on the room. Give a glowing part a dark albedo and a saturated colour; bright albedo + strong emission clips to white. For a faint glow (puddles, coins under water) use a low strength.
- Mark tiles an object stands on with `k.solid(...)`, including tiles NPC actors stand on — `apply_world` only knows what you mark. Also block walkable tiles where a tall object in front would hide the player almost completely (behind cabinets, vending machines, the strip behind a row of houses).
- **Don't overlap coplanar boxes** (e.g. per-tile ground slabs that overhang each other): they catch each other's shadows and the tile grid shows as dark seams. Build one box per run of cells, or butt them exactly.
- **Coasts and water (Lumar):** land meets the sea in the render, not at a tile edge. `assets_coast.coast(k, walkable_cells, palette=…)` grows a heightfield round the walkable ground with a wandering edge (headlands and coves a tile in or out): a grass or sand lip, rock banks or beaches down to the waterline at `WZ` (z = −0.34; the ground is z = 0), a shallow shelf with kelp and glowing spore clumps, the seabed falling to the deep, rocks standing in the surf. It returns a `Terrain` (`.z(x, r)`) to set things on the banks. Ships ride in it: build them with `waterline=False` and lower them with `assets_coast.sink(k, since, WZ)` so the keel shows through the shallows. Setting `k.water_z` renders a height pass; `scene_post` writes `shore.png` (R: px from the waterline, G: depth under the surface, B: empty) and `scene.json` gets `water`.
- **The sea in the engine** (`js/sea.js`): `BridgeSea.drawSea` is the open sea behind a scene — two seamless dithered wave textures drifting, moon glints, spores — and `BridgeSea.drawWater` (the Lumar `ground` hook, right after the render) lays the same moving water over everything below the surface: thin over the shallows so sand, rocks and kelp show through, opaque in the deep where it meets the open sea without a seam, light rippling on the shallow bed, foam lapping in round rocks, beaches, piles and hulls. Composite the waves into the water mask with a pattern fill — `source-in` applies to the whole canvas on every draw, so tiled drawImage calls wipe each other.
- **Holes onto live art:** a part with albedo `'HOLDOUT'` renders transparent (viewports onto space). The world's `scene.sky` rect (screen tiles) tells the world script where to draw its animated sky; register it as the `behind` hook (below).
- **Swappable decor:** parts built inside `with k.variant(slot, key):` are left out of the base render and rendered alone in the room's light; `scene_post.py` writes them to `layers/<slot>/<key>/`. The world script calls `BridgeScene.setLayers(sceneId, {slot: key|null})` and the engine composites the chosen variants into the scene image and depth (the quarters' catalog decor and trophies work this way).
- **Live things in a scene world** register `BridgeWorld.registerSceneHooks(tileset, {behind, ground, items, over, post})`: `behind` draws before the render (shows through holes), `ground` right after it, under everyone (the Lumar water, the dock's containment field), `items` returns `{footRow, draw}` entries sorted with the characters — draw them with `BridgeScene.drawOccluded(...)` so furniture hides them correctly (the drone, the hologram, the Singularity's echoes) — `over` draws on top (steam, rain), and `post(ctx, buf, w, h, offX, offY, ts, now)` reworks the finished frame (the Singularity's gravitational warp, `js/horizon.js`). Hooks are per tileset, so a hook that only some of its worlds use keys off a block in the world JSON (`dock`, `horizon`, `skyline`) and does nothing without it. Hooks registered for `'*'` (`behind`, `ground`, `items`, `over`) run in every scene world after the tileset's own — the furniture in homes uses them.
- **Cache-busting:** `scene_post.py` stamps `scene.json` with `rev` (a hash of the PNGs); the engine fetches `scene.json` fresh and loads its images with `?v=rev`, and cutscene sprites carry a per-entry `rev` in `cine.json`. A re-rendered scene can never pair new collisions (world JSON) with a cached old image — always re-run `scene_post.py`, never copy PNGs by hand.
- **`scene.backdrop: true`** draws the world's own registered background (space, the void, the Lumar sea, Arcadia's skyline) wherever the render is empty — stations floating in space, islands in the sea. Such a world's camera follows the player (even with `fixedCamera`) and may show the whole render, margins included; a world JSON `"view": [x0, y0, x1, y1]` (tiles) narrows that, e.g. to keep the harbour's cut render edges off screen — its cliffs run on past the map and curve away into the sea, so it reads as the tip of a headland.
- **Signs with real typefaces** (`assets_signs.py`, fonts in `tools/bridge-art/fonts/`, all OFL): `neon` (tubes tracing the letters' outlines), `letters` (extruded channel letters, lit or painted), `lightbox` (glowing box, dark lettering), `blade` (a vertical sign on brackets, one glyph a row) and a few neon icons. Pick a face per shop so every sign has its own character, and keep cap heights ≥ 0.5 tiles or the letters mush at 32 px a tile. `assets_dock.floor_text` paints stencil lettering flat on a deck.
- **The District kit** (`assets_district.py`): `frontage` builds a storefront by floors (cladding, window rows, balconies, fire escapes, AC units, side signs, posters, graffiti) and bespoke one-offs give each shop its own face — the arcade's canopy and portholes, the noodle bar's timber front, Lucky 7's bulb sign, the capsule hotel's pod wall, the club's monolith and velvet rope.
- **Arcadia's skyline** (`tools/bridge-art/skyline.py` + `assets_city.py` → `assets/backdrops/arcadia/`, drawn by `js/skyline.js`): three Blender layers at the scenes' 45° — `far` mega-towers sinking into smog, `mid` towers with blank holo-ad screens (CineKit anchors `ad<N>_a/_b` mark their corners) and `low`, the city under the walkway's railing — scrolled at different speeds, with a moon in smog, lanes of flying traffic, searchlights, animated holo-ads and rain (`BridgeSkyline.rain`, the arcadia `over` hook, for worlds with a `"skyline"` block).
- Ship scenes use `flicker.mode: "pulse"` — a slow breathing cross-fade between the light states for LED strips, instead of firelight flicker.

### Interactions
`js/interactions.js` picks the target by proximity: anything within 1.5 tiles (the eight tiles round you, or the one you stand on), the one you face first, then the nearest; something two tiles ahead counts when a solid tile (a counter) stands between. No exact tile to stand on. The prompt is a small glass pill floating over the target — key cap, verb, name — built from the interaction's `prompt` (`"PRESS E TO TALK"` → *Talk*) and `label`; tap or click it to act. A soft pool of light marks the target's foot. Games get a small gold ▶ badge and exits a teal chevron; the one you're next to gives way to the pill. Clicking an object's body (up to two tiles above its tile) also uses it.

### The two ships
Both are fantasy sci-fi, not NASA: the **Wayfarer** is a sky-galleon (indigo hull, gold wales, three masts of banded light-sails, a glowing keel fin, portholes and a stern castle) and the **skiff** an ivory-and-gold courier (bubble canopy, crescent wings, aether-ring nacelles with violet cores) — `assets_ship.mothership` / `assets_ship.shuttle`.
The **mothership** (bridge, quarters, hangar) jumps between systems from the nav chart (`js/starmap.js`: a pixel chart drawn in a native buffer, live planets, routes, ←/→ to pick, hold Enter/J/Space to charge and jump; the jump itself is `BridgeCine.jump` — the drive spooling with aether rings tightening round the hull, the leap (the ship stretching away into a white-out), the aether tunnel seen from the bridge through the gallery's arched windows (a per-pixel log-polar shader at half resolution, hoops and spiral light, dithered, its colour drifting violet → cyan → gold), dropping out over the destination, then the shuttle peeling off the bay for the planet; cuts are flashes (`dip: false` shots), each shot can fire a sound (`warp`, `leap`, `dropout`), Space/Esc/a click skips) and parks in orbit. **After a jump you go straight down**: `BridgeShip.descend` lands the shuttle on the world's pad — no stop on the bridge. The first time at a world the cutscene pauses on it with its name (`.cine-title`). The star map's *Stay aboard after the jump* (`bridge_stay_aboard`) keeps you on the bridge instead (the old *In orbit* card), to look out of the windows; every window on board draws the place below through `js/orbit.js` (`BridgeOrbit.draw` — per-pixel planets with a dithered terminator: Lumar's cloudy ocean, Arcadia's city-lit night side, Enigma's ringed giant, the Singularity, Verdance's green quilt of fields under two little moons, Hoarfell's ice). The **shuttle** flies you down: `js/ship.js` runs the flow (arrival card after a jump → lift off the hangar pad, seen from above in the world → a short fade → touch down on the world's pad, from above; "Return to ship" anywhere off the ship reverses it — no cutscene in between, by Beck's call: the top-down lift-off and landing are the good angles). A world with a landing pad has `"shuttle": {"spawn": [x, y]}` in its JSON and the parked shuttle as a scene decor layer (`with k.variant('shuttle', 'parked')`, default-on via the world JSON's `scene.layers`); while it flies the layer is switched off and its image drawn lifted with thrust, shadow and dust. The cutscenes (`js/cinematic.js`: the jump and the galleon) draw Blender sprites rendered side-on by `tools/bridge-art/cine_sprites.py` (`cinekit.CineKit`: the scene kit with a free camera, pitch and a sun; anchors such as engine exhausts land in `assets/cine/cine.json`) into a ~480 px native buffer scaled by a whole number. Between Lumar's docks you now sail the sloop yourself (see *Sailing the sloop yourself*); the galleon's passage on the open sea of `js/voyage.js` on autopilot (`BridgeVoyage.start(from, {auto: to})`) is the fallback: a route planned round the islands over the chart (A* on a coarse grid, coasts cost more, pulled straight and rounded), the ship casting off beside the island's moored galleon, running across the seas (each seam named as it's crossed) and gliding in to lie off the destination's berth, the camera leading the bow and settling to frame the island; a tap or Esc goes straight ashore — every dock offers every other island. (`BridgeCine.sail`, the old side-on shot, is only a fallback now.)

### Landing sites
Every world has a logical place for the skiff, with its own touchdown in the world (`BridgeShip.drawWorld` styles by tileset); the Approach column below describes the old approach cutscenes, since removed:

| World | Site (world id) | Approach | Touchdown |
|---|---|---|---|
| Lumar | the east beach under Diggen's Point (`lumar`) — sea-glass ring, lantern posts, a beached rowboat | low over the night sea past the lighthouse | lift jets kicking up sand |
| Arcadia | Skyport 7, a rooftop pad (`arcadia-skypad`) — marshal's booth, fuel line, lift down to the Skywalk | dropping between towers through traffic lanes and rain | the pad's ring pulsing |
| Enigma | Docking Bay 3 (`enigma-dock`) — a hangar open to space behind a containment field, clamp cradle, the crew's gutted tug, hatch to the relay deck | in toward the dark station and the ringed giant, through the lit bay mouth | gliding in through the field, clamps reaching for the hull with tethers |
| Singularity | the old landing ring at the Brink (`singularity`) | the horizon swallowing the sky | trailing echoes of itself |
| Verdance | a gravel pad with a painted ring in the farmstead's meadow (`verdance`) | — | green dust off the grass |
| Hoarfell | a ploughed pad ringed with lamps below Fellhaven (`hoarfell`) | — | a burst of snow |

A landing world has `"shuttle": {"spawn": [x, y]}`, the parked skiff as a default-on `shuttle` scene layer (`with k.variant('shuttle', 'parked')`, solid tiles marked outside the variant) and a `shuttle` interaction at the hatch; `LANDING` in `js/ship.js` maps each location to its site. The dock's live parts (field, guide-light chase, things adrift, clamp positions, the giant beyond the mouth) come from its world JSON `dock` block, drawn by `js/worlds/enigma.js`.

### Big islands (Lumar)
Each Lumar island is a whole place to walk (≈56 × 40 tiles), built with `tools/bridge-art/assets_isle.py`: `mask()` unions noisy lobes into the island's shape (a C round a cove for Rose, a crescent town for Sapphire), `ground()` lays one continuous surface over it banded by a material function (paths, moor, meadow, ash, flagstones via `assets_town.island_ground` for towns) and can be sculpted (`height`: pools dug below the waterline fill with the sea's own water), `ridge()` raises cliffs with strata where the land climbs out of reach, and `assets_coast.coast()` takes the shore into the sea (`sheer` rects keep deep water right up to a quay wall). Pass the island's own `(material, albedo)` as `ground=` to both `coast()` and `ridge()` (with `foot=`, how far the cliff's foot wanders in): the land then ends at the coast's wandering outline and the cliffs rise off a wandering line, never along the tile grid. Shape bays by carving the mask (Rose's `cove()`), not by leaving gaps between lobes — gaps come out as straight-sided rectangles. Mark small props (headstones) solid on their own tile only, or rows of them wall the player out. Each island has its own purpose and story: **Crimson Reach** (pirate camp, the Teeth, a ruined watchtower, the Ashen Ridge and the dragon's cave, a wreck on the reef, a rope bridge to a sea stack), **Rose Cove** (crystal terraces, a glasshouse, a chiming windmill, hot springs, an old mine), **Sapphire Port** (quay, market square, houses, the warehouse, a lighthouse whose beam sweeps the water, the potter's kiln) and **Midnight Isle** (the processional way of empty plinths, roaming stone sentinels, the graveyard of the drowned, the moon pool, abbey ruins, rolling mist). Scene extras the Lumar hooks animate: `smoke` (chimneys, kilns), `steam` (springs), `beacon` (a lighthouse lamp) and `mist`. Scripts: `scenes/lumar_crimson.py`, `lumar_rose.py`, `lumar_sapphire.py`, `lumar_midnight.py` (each rewrites its world JSON, keeping the DOCK sailing menu and the old labels so quests still match).

### Quests and people
- **Quests** (`assets/quests.json`, `js/quests.js`): each quest is a set of clues tied to interactions by `{world, label}`. Using one finds the clue — the first starts the quest, the last pays its reward through `BridgeProgression.recordAchievement('quest_<id>', coins)` (once per pilot). A toast reports each find; the journal (J, or the Journal pill) lists what you've pieced together. Progress lives in localStorage. Keep labels stable when re-rendering a world, or the clue stops matching.
- **People** (`assets/people.json`, `js/people.js`): the cast. A person matched to a dialog interaction by `{world, label}` turns it into a conversation — portrait, name and role, a greeting (another once you've met), topics to ask (who they are, their place, rumours that point at quests). Who you've met and what you've asked is remembered. These records are also the seed for any AI conversation layer later (persona + facts they know).

### Talking freely (AI conversations)
- **Server:** `api/talk.mjs` (Vercel function, Claude Haiku 5.5 at low effort, JSON replies). It builds every prompt itself — the browser never sends one — from `assets/people.json`, `assets/quests.json`, `assets/businesses.json` and `api/_personas.json`, the fuller character sheets (voice, story, what they know, secrets gated by trust, wants, how they see the others, story beats tied to quests or crew). Sheets live under `api/` so their secrets are never served to the page. Anyone without a sheet is voiced from their authored lines. GET `/api/talk` says whether it's on (`ANTHROPIC_API_KEY` set); without it the game hides free talk and the authored topics work as before.
- **Client:** `js/talk.js` (BridgeTalk) keeps a bond per person — `feeling` −10…10 (Cold / Wary / Neutral / Friendly / Warm / Trusts you), `mood`, up to 12 `memories` (older ones folded into a `summary` by the model), `met`, `last` — in localStorage and, once `docs/supabase/2026-10-14-pilot-bonds.sql` is applied, the pilot account. Each request sends the bond, found clue ids (so characters can't spoil quests), news since you last spoke (quests finished, crew hired, businesses bought) and flags for story beats.
- **In conversation** (`showConversation`): a text box under the topics (T or / to focus), your last line above theirs, how they feel beside their role; someone you've met greets you from memory (the authored line if the server is slow). Replies can nudge the crew or trade topic. Feeling ≤ −3 and they won't join your crew; ≥ 5 and they pay a tenth more for what you sell.
- **Letters:** mode `letter` writes a short signed letter in the character's voice from the same bond and news; the rack on the bridge holds them (see *The captain's deck*).
- **Adding a sheet:** a new key in `api/_personas.json` matching the person's id in `people.json`; keep facts consistent with the quests, and gate anything that would spoil one behind `trust`.

### The captain's deck (the bridge)
`scenes/bridge.py` + `tools/bridge-art/assets_deck.py`. Stations are `deck` interactions handled by `BridgeDeck` in `js/worlds/bridge.js` (`action`): the chart desk opens the journal, the wireless and the scope say what's out the window (`BridgeOrbit.getLocation()`), the aether gauges know whether you have an engineer, the letter rack opens your letters. The helm and the chart table open the nav chart; the hologram stands where the world JSON's `holo` says.
- **Decor:** five slots (`deck_plant`, `deck_lamp`, `deck_rug`, `deck_curio`, `deck_flag`), three pieces each, all built from `assets_deck.DECOR` as variants; bought from the Ship's Chandler on the bridge, the Lumar dockside merchant or ArcadiaMart (`js/catalog.js`, which previews them from their own layer renders) and swapped from the quarters' locker. A slot is a decor `slot_key` like the quarters' ones.
- **Crew aboard:** once hired, a crew member leaves where you found them and stands at their post (`crewPosts` in `bridge.json`: Bram at the chart desk, Okafor at the gauges, Ansel at the wireless, Corra by the ledger, Pip on the sea chest) — `BridgeCrew.decorate`. Talking to them aboard still counts for quests that send you to them (`home`).
- **Letters:** `BridgeTalk.checkMail()` runs when you come onto the bridge. A finished quest's `letter` in `quests.json` (from, text) arrives as a thank-you; with the AI server on, someone who's fond of you (feeling ≥ 3, talked at least once, not in the last 8 hours) writes now and then (`api/talk.mjs` mode `letter`), three a day at most. Envelopes show in the rack (the `mail` layer) while you have letters.

### Gathering, crew, businesses, the open sea
- **Forage** (`assets/forage.json`, `js/forage.js`): spots per world id, added to the world's interactions as it loads (re-renders can't lose them). A ready spot glints; gathering bounces its items out as loot (`BridgeLoot`); it grows back after `regrow` minutes. Items (crystals of four colours, sea glass, silver nails) live in `js/items.js`.
- **Fishing** (`assets/fishing.json`, `js/fishing.js`): spots per world id (a water tile beside a pier tip, a `pool`), added as `fish` interactions as the world loads. Hold to cast (let go near the top of the swing to cast far — far casts favour the rare fish), wait, strike when the bobber goes under, then reel: hold to lift the catch zone, let go to drop it, keep the fish in it until the line's full (tuned so a calm player lands the commons almost every time; moon eels and star pearls fight). Pools by island: silverfin, spore minnows and crabs at the harbour, bluefin and rays off Sapphire, shrimp in Rose Cove, ember snappers and the Heron's silver coins off Crimson, moon eels round Midnight, star pearls in the moon pool, perch and sun carp in the farm pond on Verdance (drawn as fresh water in the sun, lily pads and all); old boots everywhere; messages in bottles (lore, each read once). The catch goes in the pack (fish are food) and sells to Oro; the journal lists fish caught with the biggest of each, and the bottles' messages.
- **Selling**: a conversation topic with `sell: [{id, price}]` (Oro on Sapphire, Joro in Arcadia) opens a sell sheet listing what they buy beside what you carry, each with its icon; you pick a count per item (none to start with, so nothing goes by accident; ←/→ or −/+, "all"), or sell everything they want at once. Goods leave the pack only once `BridgeProgression.awardCoins` succeeds.
- **Gear** (`js/gear.js`, BridgeGear): **suits** are Blender models (`characters.py pilot-<style>` / `pilot-sit-<style>`: `coat`, `plate`, `thermal`, `runner`; the Flight Suit is plain `pilot`), each in the six suit colours → `assets/characters/pilot[-sit]-<style>-<colour>.png`, picked by `character.js` from the style and colour you wear. Each has a perk: the Voyager's Coat +25 energy, the Neon Runner +15% speed, the Thermal Suit +20 health and keeps out the cold (`BridgeGear.has('cold')`, for the mountains), the Plated Suit +50 health and a little slower. The colour is free to change any time. **Backpacks** add slots behind the hotbar (Flight Pack 6, Courier's Satchel 12, Expedition Pack 20, Voidweave Rucksack 30; the best you own is the one you carry). **Outfitters**: the travelling tailor in the Market Square (coat, satchel), the import stall on Sapphire (thermal), Cyber Gear on the District street (runner, expedition pack), Joro's back room (plate) and Vex's stash (voidweave) — set up on their interactions as worlds load (`PLACES` in gear.js) or from a conversation topic with `outfit: <shop>`. The **wardrobe** is the coat rack on the bridge, or OUTFIT (O) in the inventory screen. Owned gear lives in localStorage `bridge_gear`; purchases go through `wagerCoins`.
- **Inventory** (`js/inventory.js`): the hotbar's ten slots, then the pack's rows; in the inventory screen (I) click an item to pick it up and a slot to put it down (swapping, or stacking like with like). Max health and energy follow the suit.
- **Crew** (`js/crew.js`, `crew` blocks in `assets/people.json`): hire someone from their conversation (wage via `wagerCoins`); perks other systems ask about with `BridgeCrew.has(perk)` — `navigator` (voyage speed), `quartermaster` (sell prices), `runner` (forage yield), `trader` (a cut when you make port in Lumar), `engineer` (businesses hold twice the hours of takings). A crew block with `after: <quest id>` answers `notYet` until that quest is complete — Okafor won't leave Enigma until you've found the Wren.
- **Businesses** (`assets/businesses.json`, `js/business.js`): tied to an interaction by `{world, label}`; buy, collect takings (`rate` coins an hour, up to `cap` hours), upgrade, put a crew member in charge (×1.5). Listed in the journal and on the nav chart.
- **People walking** (`assets/walkers.json`): routes of tile points per world, walked there and back with pauses, drawn with `BridgeScene` occlusion.
- **The open sea** (`js/voyage.js`): "Take the helm" is injected first into every Lumar DOCK/GALLEON menu. The sea is five spore seas, like the book's: every point belongs to the nearest island's sea (measured from a noise-nudged position so the borders wander), each drawn in its own palette, with a seam of churning foam where two meet; crossing one names the sea you're entering. Islands are drawn from their own scene renders (cut at the waterline with `shore.png`, shrunk ×0.2); the berth is found from the world's DOCK interaction. NPC ships (traders, patrol, pirate, ghost), shoals to fish, salvage adrift; docking loads the island at its spawn. The same sea is the passage when you pick an island from a DOCK menu (autopilot, above). While it covers the screen the world underneath stops drawing (`BridgeVoyage.covers()`, main.js), and which sea each 4 px cell belongs to is worked out once and kept.

### Sailing the sloop yourself (Lumar)
Picking an island from any Lumar DOCK menu puts you in **the sloop** (`js/sloop.js`, BridgeSloop) at the world's own scale — no chart, no autopilot. The departing island and the destination are their own scene renders at full size with their own water (`BridgeSea.drawWaterAt`, the island's shore water seen from the passage's camera), the open sea between in each island's palette with a wandering seam of foam where they meet. The strait is laid out from harbour mouth to harbour mouth: each quay's way out to open water is found over the island's `shore.png` (`channel`: half-tile cells with a tile's clearance, pulled straight), then the other island is placed so the line between the two mouths is clear; the course (`route`) is quay → mouth → mouth → quay, and the compass's gold mark points at the next leg.
- **The boat** is a Blender sheet (`tools/bridge-art/sloop_sprites.py` → `assets/scenes/sloop`, cut at the water line with its own `shore.png`): the sloop's hull at 32 headings, a fisherman's dory at 8, and the sea's props (rocks, a reef, red and green buoys, a crate, a barrel), lit by the islands' moonlight. The mast, rigging, boom, mainsail and jib, pennant, tiller and the pilot (the seated sheet, on the windward bench) are drawn live in the boat's own frame, so the rig heels to leeward, the boom swings and the sails luff.
- **Sailing:** ←/→ the tiller, ↑ haul the sheet in, ↓ ease it out (T lets it trim itself). Speed comes from a polar (nothing within 40° of the wind — in irons — best on a beam reach) times the trim: too far out luffs, too far in stalls; the panel shows the sheet against the right band and says LUFFING / DRAWING / STALLED and the point of sail. Coming about the boom swings over; gybing it slams across. The wind veers slowly; gusts darken the water before they reach you. Leeway pushes you downwind when slow. Rocks, the reef and the shore push you off with a scrape; shallows drag the keel.
- **On the way:** channel buoys at both harbour mouths (lamps blinking, bells), a reef and rocks mid-strait, a fisherman at anchor who answers a hail with a rumour (`LINES`: the sixth sea, the bell off the Teeth, Tamsin's signal), a crate and a barrel adrift to haul aboard (coins or goods), gulls round the harbours (one follows you out), flying fish when you're quick, a spore whale that surfaces once about halfway, mist over the Midnight Sea, a glowing wake.
- **Arriving:** E (or a tap) within reach of the far quay at an easy speed brings you alongside and the island loads at its spawn by the dock. Esc (⋯ on touch) offers to keep sailing, skip ahead or put back. Sounds: the `lumar-passage` place (sea, wind, creak) and `luff`, `gybe`, `bell`.
- "TAKE THE HELM" still opens the galleon's chart-scale open sea (`js/voyage.js`); `BridgeVoyage.start(from, {auto})` is the fallback if the sloop can't load.

### Places within places
Worlds nest: a door, stair or ladder is an `enter_world` interaction with a `spawn`, and the room it leads to sends you back to the same spot. A `password_gate` with a `targetWorld` opens onto a world once you type its `password` (case doesn't matter) and stays open after (`bridge_gates`) — the District's alley gate opens on **the Backs** (`arcadia-alley`, `scenes/arcadia_alley.py` + `assets_backs.py`: the alley behind the shops, the skyline and rain over it) and NULL's shipping container there on **NULL's den** (`null-den`), where Vex runs the crew and the rig hands out **Splice** jobs (`js/splice.js`, interaction type `splice`: turn junctions to route a feed from the tap to the screen before the trace runs out; boards grow from 5×5 to 7×7 and pay coins, five paid jobs a day). An interior that isn't the Arcade can set `"interior": true` for a plain dark backdrop on the arcadia tileset.

Enigma goes on below the relay deck: its south door leads down into **the ring** (`enigma-ring`, `scenes/enigma_ring.py` + `assets_ring.py`) — a corridor laid round an arc (deck plates, walls and windows are built along the curve; the walkable cells are the ones whose centres fall inside the annulus), windows onto the ringed giant (a world JSON `giant: [col, row, radius]` draws it in the station backdrop), pressure doors sealed at both ends, the crew rota. Off it, **the crew quarters** (`enigma-quarters`): the Wren crew's five berths, each with a keepsake on the shelf (the `keepsakes` quest, *Five Berths*), Okafor's stripped bunk, the mess table.

Sapphire's lighthouse opens from its door on the west hill (`LIGHTHOUSE`): **the keeper's room** (`lumar-sapphire-lighthouse`, `scenes/lumar_sapphire_lighthouse.py`) — a whitewashed octagon with an iron stair winding up the back wall (`assets_light.spiral_stair`), forty years of logbooks, this year's log open on the table, the stove, the oil — and up the stair **the lamp room** (`lumar-sapphire-lamproom`): the great lens turning round its blue lamp (`assets_light.fresnel_lens`, lights in group `pulse` and the scene's `flicker.mode: "pulse"`, so the room breathes with the beam), windows all round, the clockwork, the signal lamp aimed at Midnight, and the keeper, Tamsin Gale (`npc-keeper`, a persona sheet). Her quest is `keepers-log` (*Three Long, One Short*).

Arcadia's **Lucky 7** (`arcadia-lucky-7`, `scenes/arcadia_lucky_7.py`, `assets_cyber.pachinko_machine` / `prize_wall` / `maneki_neko`) is the pachinko parlour behind the bulb sign on the District street: a row of machines under the neon, an island of them back to back, the prize counter where Sev Akana (`npc-sev`, a persona sheet) cashes balls for coins, the lucky cat by the door. **Pachinko** (`js/pachinko.js`, interaction types `pachinko` with `machine`, and `pachinko_prizes`) is a real pin board in a native buffer: hold to fire, turn the handle (slider or ←/→) so balls ride the rail round the arch to the return rubber and drop beside the screen; the centre pocket pays 2 and spins the reels (four held), three alike (1 in 32) opens the attacker for a fever — guide rails swing over the funnels — ten balls at 8 (three 7s: two rounds at 10); tulips pay 2. Each of the six machines has its own seeded pins and art. Balls live in your box (`bridge_pachinko`): a free house tray of 30 a night, trays of 50 for 10 coins, the counter pays 5 balls to the coin up to 150 coins a night. Tuned in simulation (`BridgePachinko._sim`) to return about 85%.

### The Rose Mine (mining)
Rose Cove's OLD MINE leads into **the hall** (`lumar-rose-mine`, `scenes/lumar_rose_mine.py`): the lift under its headframe, rails, a cart of roseite on a siding, the pickaxe rack (take an Old Pickaxe), the foreman's slate (your deepest floor), and Hob Dunmore (`npc-miner`), the last miner — he buys ore and stone and forges better picks (Iron: 5 iron ore + 150 coins; Star: 3 star iron + 400). **Floors** are three cave layouts (`lumar-rose-mine-a/b/c`, `scenes/lumar_rose_mine_floor.py <a|b|c>`, rendered without rocks) reused for all twenty floors. `js/mine.js` (BridgeMine) scatters rocks over a floor's open ground as it loads (seeded by floor and day; a rock is only placed if every open cell stays reachable), one of them over the ladder down. Rocks by depth: stone and iron at the top, roseite (to 8) and silver (from 4), sapphire (6-16), moonstone geodes (from 10), star iron (from 13), songstone (from 17); floor 20 holds **the great songstone** (its heart is the `singing-deep` quest's last clue). Swinging costs energy (`BridgeInventory.useEnergy`); a pick's power is its bite (old 1, iron 2, star 3). The lift stops at every fifth floor you've reached (`bridge_mine`). Rock sprites are a sheet rendered like a scene with no floor (`tools/bridge-art/mine_sprites.py` → `assets/scenes/mine-rocks`, KINDS order = `SPRITES` in mine.js), drawn depth-tested through the cave tileset's scene hooks (only in worlds with a `mine` block); the light takes on the depth band's colour (rose, sapphire, violet). Quest clue worlds may end in `*` to match any floor.

### Treasure maps
`js/treasure.js` (BridgeTreasure): a map is an item (`tmap_<id>`); using it unfolds the sketch — the spot cut from its island's own scene render (14 × 10 tiles round it), inked onto parchment (luminance in five sepia tones, dark edges, the sea left as bare paper) with a red X and a line in the finder's hand. The map never names the island; you know it by the landmarks. Holding the map, an **X MARKS THE SPOT** dig appears at the place (`decorate`); digging (6 energy) brings up a chest: coins, goods, and on some maps the next map in a chain (the old light → the Heron's strongbox → the Crimson watch; the drowned → the abbey). Ilsa Venn the cartographer sells three (a topic with `treasure: 'shop'`); others turn up under rocks in the Rose Mine from floor 4. `MAPS` holds each spot (world, tile, reward); dug spots are kept in `bridge_treasure`.

### The farm on Verdance (farming)
Verdance is the fifth system on the nav chart (`garden` in `js/orbit.js`: a green planet quilted with fields, lakes and farm lights, two small moons) and the Bridge's one daylight world: `scenes/verdance.py` + `tools/bridge-art/assets_farm.py` (split-rail fences, the barn, hay, scarecrow, pond, the field's bare earth, lane, skeps, mailbox, windsock, wildflowers, apple trees, the seed stall, log pile) and `assets_town` houses, lit by one sun (`Kit.sun`). The farmstead (farmhouse, barn, tool shed, windmill, the landing pad), the field, the well and scarecrow, the pond and jetty (fishing: perch and the odd sun carp), the orchard and the skeps (forage: apples, honey), and down the lane the village corner: **Hollin Ashby**'s seed stall (`npc-hollin`, seeds) and **Marlo Fenn**'s cart (`npc-marlo`, buys all of it), the notice board, Hollin's cottage.
- `js/farm.js` (BridgeFarm) works the field — the world JSON's `farm.plot` (tiles, inclusive; the last earth row under the fence is a headland, left out). Face a tile and press E: one `farm_plot` interaction sits on the tile you face and says what E will do there (Till / Plant / Water / Harvest / Look), rebuilt whenever that changes. The tool shed (`farm_tools`) gives the hoe, the watering can and eight turnip seeds; the well (`farm_well`) or the pond fills the can (20 waterings; a watering wets the tile you face and one either side). Tilling costs 2 energy. The hoe, the can and seeds also work from the hotbar (F) on the tile you face.
- **Growth is real time while the ground is wet**: a watering keeps a tile wet for 20 minutes; crops accrue growth only over wet time (`advance`, worked out lazily from timestamps, so it carries on while you're away). Turnip 3 min, carrot 5, strawberry 8 (then a crop every 4), sunflower 8 (gives seed back), pumpkin 20, starfruit 40. Five stages: seeded, sprout, young, grown, ripe — drawn in code from 16-unit ASCII art (`ART` in farm.js) and sorted with the characters; tilled earth (dry and wet) is drawn in the `ground` hook, under everyone. Ripe crops sparkle; starfruit glows. Harvest bounces the produce out as loot (`BridgeLoot`). Kept in localStorage `bridge_farm`.
- The verdance tileset's `over` hook is the life of the place: chimney smoke (`scene.smoke`), cloud shadows drifting over the farm, butterflies, bees at the skeps, glints on the pond. Music: the `verdance` theme (a skipping folk tune), beds `breeze` and `birds`; farm sounds `till`, `water`, `sow`, `harvest`.

### Hoarfell: Fellhaven, climbing, skiing, the cold
The sixth system on the nav chart (`ice` in `js/orbit.js`: snowfields, dark ranges, frozen seas). Two scenes, both the `hoarfell` tileset: **Fellhaven** (`scenes/hoarfell.py`, `tools/bridge-art/assets_snow.py`: snowfields, trodden paths, snowy firs, log chalets with icicles, the chairlift station, pylons and cable, the frozen pond and its ice-fishing hole, the snowman, sleds, ski racks, the cocoa hut, signposts, woodpiles, the route feet, the icefall, a summit flag) — the village street under a two-tier massif (`assets_isle.ridge`, `patchy=False` for a clean snow crown): Ysolde's guide hut and route board, the Snowcap Lodge (rest), the ski hire (skis, goggles) with the Outerwear rail (Alpine Outfitters: the Thermal Suit), the lift with Ansgar, Tove's cocoa hut, the pond, two chalets, the pad; and **the summit of the Hoarspire** (`scenes/hoarfell_summit.py`, a `backdrop` world — one traced snow surface, its rim lofted down in strata over a sea of cloud): the lift's top station, the ski start gate, the summit register, the observatory (telescope view), prayer flags, a bench facing the range (a `peaks` view) and the three routes' anchors (abseil back down).
- **The cold** (`js/worlds/hoarfell.js`): a world with `"cold": true` takes 2 energy every twelve seconds (then health) unless you wear the Thermal Suit (`BridgeGear.has('cold')`) or have drunk hot cocoa in the last five minutes (`BridgeHoarfell.warm`); frost creeps in at the screen's edges and your breath fogs. The same hooks draw the snow falling, chimney smoke, the chairlift's chairs going round (`scene.lift.lines`, the cable runs in screen tiles), and the summit's sky, far range and cloud sea (`registerBackground('hoarfell')`).
- **Skiing and climbing happen in the world, at its own scale** — no panels. A *mode* (`BridgeWorld.setMode({update, focus, solo, end})`) takes over from the grid steps: it moves the pilot itself each frame, says where the camera looks (`focus`), keeps interactions quiet (`solo`), and is ended by any world change. It *poses* the pilot (`BridgeCharacter.setPose({kind, x, y, row, col, flip, lift})`: the floor point under them in tile units, a frame of a sport sheet, mirrored or not, lifted off the ground in native px — the shadow and the depth test stay at the foot row, so a lifted pose is an upright billboard at that row, as high as it's drawn). Sport sheets come from `characters.py pilot-ski[-<style>]` (40 × 56 frames, feet at (20, 45): rows down the fall line / across / 45° / tricks; columns glide 0-3, tuck 4-5, carve 6-7, snowplough 8, air 9, poling 10-11; the tricks row is a spin 0-7 and a fall 8-11) and `pilot-climb[-<style>]` (32 × 64, feet at (16, 61), back to you: hang 0-3, reach left/right 4-5, pull up 6, mantle 7, stand 8, falling 9, chalk 10, shake out 11). The sheets face right; left is the mirror (`BridgeCharacter.sportImage(key, flip)`).
- **The pistes** (`hoarfell-piste`, `scenes/hoarfell_piste.py`, 46 × 104): three runs from start huts along the crest — the Couloir (black, a gully between rock walls: moguls, ice, a big kicker), Pinewood (blue, through the forest, a jump in a glade), the Nursery Slope (green, broad, down the east side by the chairlift) — to one finish arch, the timing hut, the lift's bottom station and the path down to Fellhaven. The ground is flat in the render; the slope is the game's. The script writes what the game needs into the world JSON's `ski` block: per run its start, gates (`[x, row, width]`) and line; `jumps` (`[x, lip row, width, length, height]`); `grade` and `zone` (a character a tile: the pull down the fall line 0-9; groomed `.`, powder `~`, moguls `m`, ice `i`); `obstacles` (`[x, row, radius, kind]` — trees, rocks, lift towers: skiing collides with these circles, not their tiles, and with every other solid tile as a wall).
- **Skiing** (`js/ski.js`): steer any angle from straight down to right across (←/→), tuck (↓), snowplough (↑), turn across the hill to stop; speed from the grade under you, drag, friction; powder bogs you down, moguls shake you, ice won't turn. Space/E poles you on when slow; off a kicker you fly (a ramp height, a launch from its slope) and Space spins you — land a whole turn or go down. Trees, rocks and walls put you in the snow; you get up beside them, toward the run. The camera runs ahead of you down the hill. Tracks in the snow (`ground` hook), spray (`over`). **Races**: from a start hut, the lift (Fellhaven, the summit, the finish) or the summit's start gate — 3-2-1, every gate (a miss +3 s, a landed spin −1 s), the clock stops at the arch, you coast to a stop and get the result. Your best run is saved as a ghost and skis beside you, translucent, next time. **Liv** (`npc-liv`, at the finish) races you: her line is the same physics steered gate to gate by a careful hand (`rivalLine`, paced per run), drawn with the red coat sheet; beat her once on a run and she pays. **Free skiing**: anywhere on the mountain, no clock; stop and press E to take your skis off. Runs: the Nursery Slope, Pinewood, the Couloir (once you've finished Pinewood). Saved in `bridge_ski` (per run: runs, best, the ghost; Liv's beaten runs); a finish pays (first, then once a day).
- **The face** (`hoarfell-face`, `scenes/hoarfell_face.py`): one great wall of rock facing you — strata, snow on its shelves, ledges with bolts, a corniced crest against the evening (a backdrop world) — with three lines up it: the Staircase (jugs, a yellow fixed line, ledges close together), the Icefall (a frozen waterfall: ice holds need an axe) and the Hoarspire (crimps and slopers, rust-coloured loose rock, few ledges, wind). Every hold is built where the world JSON's `climb` block says (`holds: [x, z, kind, screen row]`, `ledges: [x0, x1, z, screen row]`, `face`, `top`, `topRow`, the routes' feet), and it's one face: traverse between lines if you like. The routes' feet in Fellhaven bring you here.
- **Climbing** (`js/climb.js`): you hang from the holds (hands on the hold, the body below; on a ledge you stand), ←/→ choose among the ringed holds in reach, ↑/E reach, ↓ climb down, C chalk (+25), Esc lowers you off. Stamina: each reach costs more the longer it is and on crimps and ice; hanging drains it (faster in the cold, faster still in the Hoarspire's gusts unless you're on a jug — snow streaks warn you first); ledges are rests and bolts. A fall costs health and drops you to the last ledge with a climbing rope (or on the Staircase's fixed line), else to the foot. Loose holds crumble a second after you take them; slopers spit you off when you're tired; hoar crystals in the rock are loot. The top pays (first ascent, then once a day), keeps your best time (`bridge_climb`), and walks you out onto the summit. Ysolde sells chalk, rope and the axe; the route board lists your ascents.
- Sounds: the `hoarfell` theme (lydian bells) over `snowwind` and `chimes`, the summit's sparse `summit` theme over `gale`. Fishing: arctic char and frostfin through the ice (`pool: 'ice'`). Items: chalk, climbing rope, ice axe, skis, ski goggles, hot cocoa, roast chestnuts, edelweiss, hoar and summit crystals. The journal lists your ascents and best runs.

### Fighting
Creatures are `hostile` interactions run by the stalk-and-strike machine in `interactions.js` (idle → winding, the telegraph → striking → recovering; a strike lands only if you're still on the tile it locked onto, so stepping aside on the wind-up dodges it). `js/combat.js` (BridgeCombat) gives them a `creature` kind — health, damage, pace, drops, coins — and draws them in code on the 16-unit grid, gliding between tiles and depth-tested in scene worlds: **rock mites** (mine floors 3+), **cave crabs** (8+), **shades** (14+). Weapons are items with `damage`; F (or B on touch) swings the selected one, a weapon with `arc` cuts the tiles either side of the one you face too: the Iron Dagger (25) and the **Cutlass** (40, arc; the smithy on the square) and the **Star Blade** (80, arc; Hob forges it from 2 star iron, a songstone and coin). A pickaxe on F digs the rock you face, or hits a creature. At 0 health you black out (`BridgeCombat.faint`) and come round somewhere safe with half your health — in the mine, on a crate in the hall with Hob watching. The Plated Suit's +50 health is for this.

### Homes and furniture
`js/home.js` (BridgeHome). Places of your own: **the White House** on Sapphire Port's square (`lumar-home`, `scenes/lumar_home.py`: hearth, two windows on the sea, bare boards; 1500 coins) and a **capsule apartment** over the District's Capsule Hotel (`arcadia-home`, `scenes/arcadia_home.py`: a strip window onto the live skyline and rain — the `'*'` behind hook draws them in `scene.sky` — the sleeping capsule, a kitchenette; 600 coins). Their doors are `home_door` interactions set on the street as worlds load (`HOMES[id].door`: the WHITE HOUSE door at 38,13 on Sapphire; the CAPSULE HOTEL on the street): the first time they offer the place for sale (`wagerCoins`, a menu option `home_buy`), then let you in. Each comes with two pieces to start. Aboard, **your quarters and the bridge** are yours already. The rooms are rendered empty; everything else is what you put in them.
- **Furniture**: 36 pieces, each built with the scene kits' own builders by `tools/bridge-art/furniture_sprites.py` into one floorless sheet (`assets/scenes/furniture`, a 3 × 4-tile cell each, footprint at the bottom of its cell) plus `assets/furniture.json` (id, name, price, footprint `w` × `d`, `walk` for rugs, the footprint's corner on the sheet). The engine cuts each sprite at its cell's opaque bounds and draws it depth-tested against the room (`drawOccluded` at its front row, tinted by the room's light but softened, since the sheet is lit already); rugs sort under everyone, and a seat you're sitting on draws before you. Non-rug pieces block their tiles.
- **Pieces that do something** (`USES`): beds sleep, seats sit (one seat a tile: benches and sofas take two), the wardrobe opens the wardrobe, the arcade cabinet plays Asteroids, the CRT Breakout, the chess table chess, the telescope looks at the stars, the desk opens the journal, the clock tells the real time, the cat may allow a stroke, the lucky cat leaves 5 coins once a day, the bookshelf has a book for you. New piece: an entry in `PIECES` (furniture_sprites.py), re-render the sheet, and optionally a `USES` entry.
- **Furnishing** (H, or the Furnish pill, in a place of yours): the tray docks at the bottom (world-themed: parchment, neon, holo) and the camera frames the room above it (`BridgeWorld.reserveBottom`, `setFocus`). YOURS lists what you own, spare first; SHOP is the whole catalogue (a second tap buys, and the piece comes straight to your hands). Arrows/WASD or the mouse move the cursor (on touch: tap a tile, or the stick), E/click puts the piece down or picks one up, X puts one away, Z/C choose, Tab switches tabs, Esc or H is done. A piece can't go off the floor, on a door or the tiles round it, a spawn, a person, or anything you use, and never where it would cut off part of the floor or something you use (checked by flood fill from where you stand); rugs can go under furniture, not on other rugs.
- Saved in localStorage `bridge_homes`: `owned`, `have` (pieces bought), `layout` (per home: `{id, x, y}`, the footprint's top-left tile), `seen`. A piece placed in one home isn't spare for another.

### Sit, sleep, look out of the window
`js/actions.js` (BridgeActions) turns interactions into things you do, from `assets/actions.json` (by world id: tag interactions by label — or one at x, y — or `add` new ones where the art has a seat or a window). **sit**: the pilot sits on the `seat` (tile units, the floor point under the seat; `facing`) with the seated sheet (`pilot-sit-<suit>.png`, `characters.py pilot-sit`), energy comes back, moving gets you up; a seat with a `view` opens it too. **sleep**: the screen goes dark and you wake rested (`deny` says why not instead). **view**: first person — the room leans in toward the window (`#bridge-canvas.fp-lean`), then the view swivels in from that side to fill the screen (`#view-panel`, its canvas shaped to the screen; the window's frame and mullions round it indoors, open air outside, the eyepiece at a telescope; the caption along the bottom), and turns back when you look away. It shows, live, `sea` (the spore sea in the island's palette, its moon road and spores; `roofs` for a window over a town, `beam` for a lighthouse sweeping), `skyline` (Arcadia's layers framed for a window), `giant` (Enigma's ringed giant), `orbit` (the planet the Wayfarer is over), `void`, `stars` (a telescope). The interaction's text becomes the caption; quest clues still count. New seats and windows: add an entry, no re-render needed.

### The arcade games
The cabinets (Asteroids, Breakout, Helicopter, Missile Command, Space Invaders) are built on one shared kit, `js/shared/arcade-kit.js` (`BridgeArcade.run({...})`): a native low-res buffer scaled by a whole number to fit, a fixed 60 Hz step, key-repeat-filtered input and touch buttons, title / pause / game-over screens in a 5×7 pixel font, the palettes (`BridgeArcade.PAL`, with `UI` colours per palette for the panels), small synth sounds, and one score-and-coin path — best, plays and last run per game in localStorage `bridge_scores` (the Arcade's HIGH SCORES boards and the game room's score board read it), coins paid as you go (`api.award`) plus a score bonus at the end, at most 150 a game a day, `first_light` and `played_<id>` trophies. Every game of the Bridge's own (cabinets and apps — chess, Cipher, Signal Relay, the Canvas, Runouts; not The Aether Seas) opens in the cabinet over the world (`js/cabinet-modal.js`), framed for where you are (Arcadia neon, Enigma terminal, the ship's brass, the Brink): a game posts `bridge-run-state` so Esc pauses a run before it leaves, and `bridge-run-ended` so its score comes back as a toast. Each cabinet is its own place, by Beck's call (variety, not all Arcadia): **Breakout** is the candy cabinet (a Lite-Brite peg board, candy-cane walls, jelly bricks, a peppermint ball; ten walls from three short rows to a gingerbread castle, then looping tougher; a sugar rush bends the ball toward the last few bricks), **Spore Invaders** (`space-invaders`) is Lumar's harbour at night (spore creatures in the islands' sea colours, a brass cannon boat, sea stacks for shields, the ghost galleon), **Asteroids** is salvage in Enigma's ring belt on the tug's scanner (the ringed giant, ice, amber-cored rock and striped hull debris, a security drone), **Missile Command** holds the Brink (the Singularity in its accretion disk, crystal spires on the platform's rune-lit rim), and **Helicopter** stays in Arcadia's neon. The Arcade (`scenes/arcadia.py`) lays the classics along the back wall with open floor in front of every cabinet, the two RUNOUTS tournament cabinets on a lit stage under the sign.

### The game room
Aboard the Wayfarer, through the bridge's east door (`gameroom`, `scenes/gameroom.py`). Every mini-game you play out in the worlds — the Arcade's six cabinets, the chess table, Enigma's cipher terminal and signal relay, the canvas at the Brink, NULL's Splice rig, Lucky 7's pachinko — is marked found (`js/games.js`, `bridge_games`) and its slot in the game room swaps a dust sheet for the real thing (scene layers `g_<game>`: `on` / `off`); play it from there (`game_slot` interactions). The score board (`game_scores`) lists what you've found, where, Splice's best times and how many are still out there. A new game: an entry in `GAMES` (games.js) keyed by its app path, and a `g_<key>` variant pair in the scene. The inn has its guest floor upstairs (`stairs_up` / `stairwell_down` in `assets_lumar`), the Market Square the fisher's cottage and the cartographer's house, Enigma's relay deck the hydroponics bay through its east door (`enigma-hydro`, where Okafor lives; `station_room(..., east=(r0, r1))` opens the wall); more back rooms, cellars and rooftops follow (see `WORLDS.md`).

### Sound
`js/audio.js` (BridgeAudio): everything is synthesised with Web Audio — no sound files. **Music** is generated as it plays from a theme (`THEMES`: tempo, root, mode, chord degrees per bar, and a band — pad, arpeggio, bass, an improvised lead built from chord tones in A A' B A phrases, percussion), through a shared reverb and echo; every eight bars the band thins or fills. `themeFor(worldId)` picks the theme and the **ambience** beds (`BEDS`: sea, wind, rain, city, hum, engine, creak, fire, murmur, crowd, bleeps, beeps, drips, rumble, breeze, birds, snowwind, gale, chimes): Lumar outdoors folk over the sea, Lumar indoors warm by the fire, Arcadia streets synthwave in the rain, arcades chiptune, back rooms lo-fi, Enigma drones and sonar, the Singularity deep and glassy, Verdance a folk tune over birdsong, Hoarfell bells over the snow wind, the Wayfarer a music box over the engine, caves and towers their own. Themes and beds cross-fade on every world change (`setWorld`, called from world.js). **Effects**: `BridgeAudio.sfx(name)` (doors, dialogs, clues, quests, coins, pickups, footsteps, sitting, sleeping, fishing, Splice, pachinko). The ♪ pill (or M) cycles sound on → effects only → off, saved in `bridge_audio`. Audio starts on the first tap or key.

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
