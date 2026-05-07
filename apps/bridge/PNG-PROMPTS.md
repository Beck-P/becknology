# Bridge — PNG asset prompts (copy/paste templates)

> **Scope: bridge app only.** These prompts produce assets that match `apps/bridge/CLAUDE.md` art direction. They are **not** for any other Becknology app (aether-seas, cipher-room, etc.). Don't reuse this prompt vocabulary outside `apps/bridge/`.
>
> **For agents:** Both Claude Code and Codex should follow this file when generating PNG sprites for the bridge. The header block below is the full master prompt — paste it verbatim at the top of every prompt and only swap the `[BUILDING TYPE]` and `[INSERT DETAILS]` slots.

---

## Standard header — paste at the top of every prompt (long form)

> Create a pixel art PNG of a **[BUILDING TYPE]** for a cozy 2D farming RPG.
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
> **Animation hooks.** Windows are flat warm-yellow rectangles with no detail painted inside (animation will be layered on top in code). Chimney (if present) sits at the upper roof corner with empty sky above (smoke animation goes there). Lantern flames (if present) are simple round shapes (flicker animation goes there).
>
> **Design details.** [INSERT BUILDING DETAILS HERE]
>
> **Match the same camera angle, roof visibility, outline weight, and chunkier pixel-art rendering as the existing building set.**

---

## Standard header — short form (single paragraph)

> Create a pixel art PNG of a **[BUILDING TYPE]** for a cozy 2D farming RPG. Use a fixed elevated front-facing building view: show the full front facade, but also show most or nearly all of the roof from above, as if viewed at a high oblique angle. The roof should feel almost top-down while the front wall is still fully visible. No isometric view, no diagonal rotation, no realistic perspective, and no pure top-down roof-only view. Use chunky, visibly pixelated high-resolution pixel art with crisp hard edges, strong pixel blocks, dark outlines, simple clean sprite shading, no anti-aliasing, no smoothing, transparent background, minimal padding, and a warm cozy farming-RPG aesthetic. Windows are flat warm-yellow rectangles with no detail inside. Chimneys (if any) sit at the upper roof corner with empty sky above. Lantern flames (if any) are simple round shapes. Keep the camera angle, roof visibility, pixel density, and overall sprite style consistent with the rest of the building set. Design details: **[INSERT DETAILS]**. Match the same camera angle, roof visibility, outline weight, and chunkier pixel-art rendering as the existing building set.

---

## Lumar buildings

### Tavern (already generated — `tavern.png`)

### Inn (already generated — `inn.png`)

### Lighthouse (already generated — `lighthouse.png`)

### Captain's house — `captain-house.png` — 768 × 768 native
> [STANDARD HEADER]
>
> Building type: a single-story seaside captain's cottage.
>
> Design details: stone foundation, driftwood-grey wooden siding, a peaked dark slate roof clearly visible from above. **A round brass-rimmed nautical porthole window centered on the upper wall** (flat blue glass — no scenery inside). A wooden front door with brass fittings at bottom-center. A hand-carved anchor crest above the door. Sea-green window shutters flanking the porthole. A coiled rope and a small barrel beside the door on the foundation. Limited palette: weathered grey, sea green, brass yellow, dark slate, brown wood. Empty space above the roofline.

### Bell tower — `bell-tower.png` — 384 × 768 native (tall)
> [STANDARD HEADER]
>
> Building type: a square stone bell tower four stories tall.
>
> Design details: weathered grey stone blocks, pyramidal slate roof visible from above with a small iron spire. **The top floor has tall arched openings revealing a large bronze bell hanging on a wooden beam** (flat warm bronze, simple shape — no detail inside). Narrow vertical window slits on the lower floors (flat warm yellow rectangles, no detail). Vines and ivy climbing one corner. A heavy wooden arched door at the bottom-center. Tower fills the full vertical axis. Limited palette: weathered grey stone, bronze, dark slate, dark green vine, brown wood. Empty space above the spire.

### Sorceress's tower — `sorceress-tower.png` — 576 × 1024 native (tall)
> [STANDARD HEADER]
>
> Building type: a narrow circular dark wizard's tower five stories tall.
>
> Design details: dark stone walls, conical purple-tiled roof clearly visible from above with a small iron star spire. **Each floor has a single tall arched window glowing flat purple** (no scrying details inside — flat purple panes). Twisting black iron balconies wrap each floor. Gnarled black vines climbing the walls. **An ornate iron-banded oak door under a pointed stone arch at the bottom-center.** A faint surface fog suggested at the foot of the tower. Limited palette: dark stone grey, deep purple, black iron, dark green vine, brown oak. Empty space above the spire.

### Dragon — `dragon.png` — 1024 × 640 native (wide)
> [STANDARD HEADER]
>
> *Note: dragon is a creature, not a building — use the same chunky pixel-art rendering and palette discipline, but ignore the building/roof composition rules.*
>
> Subject: a massive sleeping red dragon curled around a pile of gold coins and red gems. **Front-on profile view**, head on the left, tail wrapping around the hoard on the right. Deep crimson scales fading to dark rust along the spine. Bone-colored horns curving back from the skull. Ivory teeth visible. Leathery folded wings tucked along the body. A thick spiked tail wrapping the hoard. **One yellow eye half-open with a slit pupil** (no detail inside the pupil — flat slit shape, will animate as glowing pulse). Two small wisps of grey smoke curling from the nostrils (we'll animate). Limited palette: crimson, dark rust, ivory, gold, dark grey smoke, ember orange. Empty space above the head and along the right where the tail ends.

## Arcadia District buildings

### Arcade marquee — `arcade-sign.png` — 1024 × 384 native (wide)
> [STANDARD HEADER]
>
> *Note: marquee sign is wall-mounted signage, not a freestanding building — keep the chunky pixel-art rendering but ignore the roof-from-above rule.*
>
> Subject: a glowing pink and purple neon sign reading "ARCADIA" in bold geometric tube letters, mounted on a dark metallic backing panel. **Hot pink and purple neon-tube letters** with bright cyan electric arcs between them. Glowing pink halo bloom around each letter. Small lens flares on the brightest tube curves. Mounting brackets at the top and bottom. Cyberpunk 80s arcade aesthetic. Limited palette: hot pink, deep purple, electric cyan, dark metal, white tube cores. **Black space surrounding the sign** so we can layer atmospheric haze.

### Cyberpunk shop — `arcadia-shop.png` — 768 × 1024 native
> [STANDARD HEADER]
>
> Building type: a single-story cyberpunk storefront.
>
> Design details: dark metal walls with exposed pipes and conduits, flat metal roof clearly visible from above with HVAC units and an antenna. **A wide front display window showing flat dark blue glass** (no products inside — we layer those in code). A neon sign hanging above the door, glowing pink (we'll animate the flicker). A dark metal door with a panel scanner beside it. Limited palette: dark metal grey, hot pink neon, electric cyan, deep purple, black glass.

### Neon ramen stand — `neon-ramen-stand.png` — 768 × 1024 native
> [STANDARD HEADER]
>
> Building type: a compact neon ramen street stand.
>
> Design details: dark metal cart base with a small front counter and a flat overhanging roof canopy clearly visible from above. Cyan tube-light trim along the canopy edge, hot pink underglow beneath the counter, a small square service window with flat warm-yellow glow and no interior detail. A noodle bowl icon sign made of simple geometric neon shapes, no readable text. Steam vents on the upper roof corners with empty space above them for procedural steam. Small token slot and panel scanner beside the counter. Limited palette: dark metal grey, hot pink neon, electric cyan, deep purple, warm yellow glass.

### Holo-billboard kiosk — `holo-billboard-kiosk.png` — 768 × 1024 native
> [STANDARD HEADER]
>
> Building type: a compact freestanding holo-billboard kiosk.
>
> Design details: a dark metal pedestal with a thick base, two vertical side struts, and a wide translucent smoked-glass display panel facing forward. The top cap is visible from above like a shallow roof slab. The screen shows flat cyan and magenta geometric ad bars only, no readable text and no detailed images inside. Cyan neon edge strips, purple underglow, small antenna nubs on the top cap. Limited palette: dark metal grey, smoked dark glass, hot pink neon, electric cyan, deep purple.

### Token kiosk — `token-kiosk.png` — 768 × 768 native
> [STANDARD HEADER]
>
> Building type: a small arcade token kiosk.
>
> Design details: squat armored payment booth with a flat roof visible from above, dark metal body, front-facing token dispensing window with flat warm-yellow glow and no interior detail. A cyan-lit card scanner, pink token chute, tiny antenna on the roof, exposed conduit loops on both sides, and a heavy base bolted to the sidewalk. Include a simple coin icon on a small sign panel, no readable text. Limited palette: dark metal grey, hot pink neon, electric cyan, deep purple, brass token yellow.

### Hover-bike dock — `hover-bike-dock.png` — 768 × 768 native
> [STANDARD HEADER]
>
> Building type: a compact hover-bike dock and parked hover-bike.
>
> Design details: low dark metal charging platform with a roofless rectangular docking frame visible from above, a sleek parked hover-bike facing forward with cyan smoked-glass canopy, hot pink engine pods, purple magnetic lift rails, and small cyan charging cables attached to the dock. Keep the silhouette compact and readable as a street object. No rider, no readable text, no realistic motorcycle perspective. Limited palette: dark metal grey, hot pink neon, electric cyan, deep purple, black glass.

## Future NPC sprite sheets

When we add walk-cycle NPCs, here's the prompt structure. **Note**: image models are bad at sprite sheets — the same character looks different across frames. Best approach is to generate one full-body image and we slice/animate manually, OR use a dedicated pixel-art sprite tool.

### Single full-body NPC reference — `npc-{name}.png` — 256 × 384 native
> [STANDARD HEADER — but for a character, not a building]
>
> Subject: a single full-body character standing facing the camera, arms at sides, neutral expression. [Character description: e.g., "A grizzled tavern keeper in his 50s, brown apron over a cream tunic, full beard, balding, kind eyes."] Drawn at 16 × 32 effective pixel density (the body should be readable at very low resolution). One pose only. Empty space around the character on all sides. Same chunky pixel rendering and outline weight as the building set.

We'll need to build a sprite-sheet animator separately or use a tool like Pixel Lab to fill in the walk frames.

## Tile sets — usually procedural, but possible PNG

If we want PNG tile sets later (cobblestone variations, sea tiles, walls):

### Tile set — `{world}-tiles.png` — 256 × 256 native (16 × 16 grid of 16-px tiles)
> [STANDARD HEADER — adapted for tiles, not buildings: ignore roof/perspective rules]
>
> Subject: a 16 × 16 grid of pixel art tiles for a [world theme] environment, each tile 16 × 16 pixels. Top row: 4 variations of cobblestone path. Second row: 4 variations of grass / dirt / sand. Third row: water tiles (centre, edge, corner). Fourth row: wall tiles. Etc. Each tile must tile seamlessly with adjacent tiles. Limited palette per row. Same chunky pixel-art rendering as the building set.

This is hard for image models to do right — tiles often don't seam. May need manual fixup.

## Don'ts (also in CLAUDE.md but worth repeating)

- Don't ask for "isometric," "diagonal rotation," "realistic perspective," "side view," or "pure top-down roof-only view"
- Don't generate at low resolution (64×64 etc.) — image models don't render small images well
- Don't paint detail inside windows — leave them flat warm yellow
- Don't paint detail inside dragon eye / lantern flame — leave a flat shape we can animate
- Don't put text on signs (except the explicit ARCADIA marquee)
- Don't introduce new color palettes without updating CLAUDE.md
- Don't reuse this prompt vocabulary for other Becknology apps — bridge only
