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

### Ship at the dock — `ship-dock.png` — 1280 × 768 native (wide)
> [STANDARD HEADER]
>
> *Note: treat like the dragon — creature-scale asset, the strict roof-from-above rule is relaxed. No water in the PNG; the engine renders sea tiles separately.*
>
> Subject: a large 3-masted wooden sailing galleon docked alongside a wooden pier, top-down high-oblique view.
>
> Design details: dark warm-wood hull (`#3a2410`, `#5a3a1a`, `#7a4e22`), widest at midship, narrower at bow and stern. **The deck is visible from above** — wooden planks, a capstan, a ship's wheel at the stern, a coiled rope pile, two crates lashed down, a lifeboat on davits along one side. **Three vertical masts** as brown wooden pillars with horizontal yard arms; sails are **furled** (rolled bundles wrapped tight to the yards) in weathered cream and dark emerald. A **tattered triangular pennant** at the topmast. A small wooden **captain's cabin at the stern** with a single warm-yellow window (flat glow, no detail) and a closed plank door. A small iron **lantern hanging at the bow** with a flat round flame area (animation hook). A **carved figurehead** at the bow — a simple weathered mermaid or kraken silhouette. A **wooden gangway** extending from one side of the deck with rope rails (only the gangway visible — no surrounding dock). The hull side is visible below the deck plane with caulked planking and a row of brass-rimmed portholes (flat warm yellow, no detail). Limited palette: dark warm wood, weathered cream sails, dark emerald accents, brass, warm yellow windows, dark slate trim. Transparent background — no water, no sky, no dock, no shadow.

### Smithy — `smithy.png` — 768 × 1024 native
> [STANDARD HEADER]
>
> Building type: a stone-and-timber blacksmith's forge.
>
> Design details: weathered grey saltstone foundation and walls with warm-wood timber framing (visible cross-beams). Pitched dark-slate roof clearly readable from above, with a fat stone chimney at the upper-right and empty sky above it (smoke animation hook). A wide open front under a heavy timber lintel showing the forge inside: a flat hot-orange rectangle of glowing forge brick (no flame detail inside — animation hook), with a dark iron anvil silhouette in front. Hammers and tongs hanging on hooks on the back wall. A small lantern in an iron bracket beside the entrance with a round flat flame area. A carved wooden hammer-and-anvil sign hanging above the entrance, no text. Outside on the foundation: a stack of horseshoes and a half-barrel of water beside the doorway. Limited palette: weathered grey stone, warm brown timber, dark slate roof, hot orange forge glow, brass lantern, dark iron.

### Fishmonger's stall — `fishmonger-stall.png` — 768 × 768 native
> [STANDARD HEADER]
>
> Building type: a small open-front timber fishmonger's market stall.
>
> Design details: a wide wooden counter across the front with two fish barrels flanking it (silver-grey scales packed inside, no individual fish detail — flat silver patches). A tilted dark-green canvas awning above the counter, visible mostly from above (this is the "roof" plane) — show the awning poles, the cloth ripples, and a hand-painted fish-skeleton sign hanging from the front edge of the awning. No back wall — just a heavy timber post structure with cross-bracing. A string of hanging smoked fish strung between two posts under the eaves (small silver-brown dashes). A coiled rope and a wicker fish-basket on the foundation beside the counter. A weathered wooden plank floor under the counter. Two seagulls perched on the awning peak. Limited palette: weathered warm wood, dark emerald-green awning, silver-grey fish, brass scale-weight, off-white seagulls.

### Bakery — `bakery.png` — 768 × 1024 native
> [STANDARD HEADER]
>
> Building type: a small half-timbered cottage bakery.
>
> Design details: cream-white plaster walls with dark warm-brown timber framing (vertical beams, diagonal corner braces — Tudor-style half-timbering). Pitched warm-red tile roof clearly visible from above, with a fat stone chimney at the upper-right and empty sky above it (smoke animation hook). A wide front display window with flat warm-yellow glow (animation hook — no bread detail inside). A wooden door with iron strap hinges at bottom-centre, beside the window. A painted hanging sign over the door — a small wooden plank showing a stylised golden loaf, no readable text. A small wooden barrel of flour on the foundation beside the door (off-white powdery top). A small lantern above the door with a flat round flame area. Limited palette: cream plaster, dark warm-brown timber, warm-red roof tile, warm yellow window glow, brass lantern, golden loaf accent.

### Apothecary — `apothecary.png` — 768 × 1024 native
> [STANDARD HEADER]
>
> Building type: a narrow witchy apothecary / herb shop, slightly leaning.
>
> Design details: a tall narrow building with a slightly crooked tilted pitched roof in slate-blue tiles, readable from above. The walls are dark-stained wood plank with a stone foundation. The whole building should lean very slightly so the roof line is not perfectly horizontal — fairy-tale silhouette. Hanging dried herb bundles strung from the eaves all along the front facade — vertical bundles in muted purple, sage green, and dusty gold. A tall narrow front window showing rows of small glass jars (flat coloured rectangles — cyan, magenta, gold — no liquid detail). A heavy wooden door with iron strap hinges at bottom-centre. A carved wooden mortar-and-pestle sign above the door, no text. A small stone chimney at the upper-right with empty sky above. A black iron lantern beside the door with a flat round flame area. Limited palette: dark stained wood, slate-blue roof, stone grey foundation, muted herb colours (purple, sage, dusty gold), warm yellow window glow with cyan/magenta jar accents, dark iron.

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
> Subject: a glowing pink and purple neon sign reading "ARCADIA" in bold geometric tube letters, mounted on a dark metallic backing panel. **Hot pink and purple neon-tube letters** with bright cyan electric arcs between them. Glowing pink halo bloom around each letter. Small lens flares on the brightest tube curves. Mounting brackets at the top and bottom. Cyberpunk 80s arcade aesthetic. Limited palette: hot pink, deep purple, electric cyan, dark metal, white tube cores. Transparent background around the sign only — no black box, no matte, no colored backdrop, no checkerboard, and no surrounding wall panel beyond the sign asset.

### Cyberpunk shop — `arcadia-shop.png` — 768 × 1024 native
> [STANDARD HEADER]
>
> Building type: a single-story cyberpunk storefront.
>
> Design details: dark metal walls with exposed pipes and conduits, flat metal roof clearly visible from above with HVAC units and an antenna. **A wide front display window showing flat dark blue glass** (no products inside — we layer those in code). A neon sign hanging above the door, glowing pink (we'll animate the flicker). A dark metal door with a panel scanner beside it. Limited palette: dark metal grey, hot pink neon, electric cyan, deep purple, black glass. Transparent background around the building only — no black box, no matte, no colored backdrop, and no checkerboard.

### Neon ramen stand — `neon-ramen-stand.png` — 768 × 1024 native
> [STANDARD HEADER]
>
> Building type: a compact neon ramen street stand.
>
> Design details: dark metal cart base with a small front counter and a flat overhanging roof canopy clearly visible from above. Cyan tube-light trim along the canopy edge, hot pink underglow beneath the counter, a small square service window with flat warm-yellow glow and no interior detail. A noodle bowl icon sign made of simple geometric neon shapes, no readable text. Steam vents on the upper roof corners with empty space above them for procedural steam. Small token slot and panel scanner beside the counter. Limited palette: dark metal grey, hot pink neon, electric cyan, deep purple, warm yellow glass. Transparent background around the stand only — no black box, no matte, no colored backdrop, and no checkerboard.

### Holo-billboard kiosk — `holo-billboard-kiosk.png` — 768 × 1024 native
> [STANDARD HEADER]
>
> Building type: a compact freestanding holo-billboard kiosk.
>
> Design details: a dark metal pedestal with a thick base, two vertical side struts, and a wide translucent smoked-glass display panel facing forward. The top cap is visible from above like a shallow roof slab. The screen shows flat cyan and magenta geometric ad bars only, no readable text and no detailed images inside. Cyan neon edge strips, purple underglow, small antenna nubs on the top cap. Limited palette: dark metal grey, smoked dark glass, hot pink neon, electric cyan, deep purple. Transparent background around the kiosk only — no black box, no matte, no colored backdrop, and no checkerboard.

### Token kiosk — `token-kiosk.png` — 768 × 768 native
> [STANDARD HEADER]
>
> Building type: a small arcade token kiosk.
>
> Design details: squat armored payment booth with a flat roof visible from above, dark metal body, front-facing token dispensing window with flat warm-yellow glow and no interior detail. A cyan-lit card scanner, pink token chute, tiny antenna on the roof, exposed conduit loops on both sides, and a heavy base bolted to the sidewalk. Include a simple coin icon on a small sign panel, no readable text. Limited palette: dark metal grey, hot pink neon, electric cyan, deep purple, brass token yellow. Transparent background around the kiosk only — no black box, no matte, no colored backdrop, and no checkerboard.

### Hover-bike dock — `hover-bike-dock.png` — 768 × 768 native
> [STANDARD HEADER]
>
> Building type: a compact hover-bike dock and parked hover-bike.
>
> Design details: low dark metal charging platform with a roofless rectangular docking frame visible from above, a sleek parked hover-bike facing forward with cyan smoked-glass canopy, hot pink engine pods, purple magnetic lift rails, and small cyan charging cables attached to the dock. Keep the silhouette compact and readable as a street object. No rider, no readable text, no realistic motorcycle perspective. Limited palette: dark metal grey, hot pink neon, electric cyan, deep purple, black glass. Transparent background around the dock only — no black box, no matte, no colored backdrop, and no checkerboard.

### Arcade facade — `arcade.png` — 1024 × 768 native (wide)
> [STANDARD HEADER]
>
> Building type: a large cyberpunk video arcade building, the centerpiece of the street.
>
> Design details: a wide flat-roofed arcade building with a **massive curved hot-pink and electric-cyan neon "ARCADIA" marquee** dominating the top of the facade (geometric tube letters, glowing pink halo, cyan electric arcs between letters, mounted on a dark metal backing panel). Below the marquee, a row of **tall flat warm-yellow display windows** showing flat glow only (no interior detail — animation goes on top in code). A **wide double-door entrance archway at bottom-center** (dark metal frame with smoked-glass panels, hot pink neon outline tubing, slightly recessed). Two narrow wall-mounted neon signs flanking the marquee — geometric shapes, no readable text. Exposed conduit pipes running up the facade. Roof has a few HVAC units and antennas visible from above. Limited palette: dark metal grey `#1a1530`, hot pink neon `#e870c0`, electric cyan `#5cc8d0`, deep purple `#3a1840`, warm yellow window glow `#ffe080`. Transparent background around the building only — no black box, no matte, no colored backdrop, and no checkerboard.

### Cyber noodle bar — `cyber-noodle-bar.png` — 768 × 1024 native
> [STANDARD HEADER]
>
> Building type: a cyberpunk noodle bar with apartments above.
>
> Design details: two-story building. Ground floor: a noodle counter with a flat warm-yellow service window (no detail), red lantern hanging beside the door. Upper floors: two narrow apartment windows (flat warm-yellow rectangles). Exterior pipes. Tile-clad facade in dark teal `#1a3540` with hot pink neon trim along the canopy edge. Limited palette: dark teal, dark metal grey, hot pink neon, electric cyan, deep purple, warm yellow glass. Transparent background around the building only — no black box, no matte, no colored backdrop, and no checkerboard.

### Tech repair shop — `tech-repair-shop.png` — 768 × 1024 native
> [STANDARD HEADER]
>
> Building type: a chrome and electronics repair shop.
>
> Design details: cluttered storefront with a wide front display window (flat smoked-glass blue-violet, no detail). Exposed circuit-board panel siding. Tall vertical neon sign on the corner — geometric shape only, no readable text. Roof antenna with empty space above. Palette leans cyan `#5cc8d0` + dark metal, with deep purple shadows and hot pink neon accents. Transparent background around the building only — no black box, no matte, no colored backdrop, and no checkerboard.

### Chrome clinic — `chrome-clinic.png` — 768 × 1024 native
> [STANDARD HEADER]
>
> Building type: a cybernetic augmentation clinic.
>
> Design details: sterile-looking but neon-lit. Wide horizontal facade with a recessed entrance, two large flat warm-cyan glass windows. Cross-shaped neon sign on the front wall (geometric, no text). White-and-cyan trim, dark metal walls. Flat roof with clean HVAC units and vents visible from above. Limited palette: dark metal grey `#1a1530`, white trim, electric cyan `#5cc8d0`, warm cyan glass `#80e0e8`, deep purple `#3a1840`, restrained hot pink `#e870c0`. Transparent background around the building only — no black box, no matte, no colored backdrop, and no checkerboard.

### Junk pawn shop — `junk-pawn-shop.png` — 768 × 1024 native
> [STANDARD HEADER]
>
> Building type: a grimy cyberpunk pawn and junk shop.
>
> Design details: grimy storefront. Cluttered facade, faded neon "$" symbol shape on a wall sign (geometric only). Boarded-up upper window (flat dark plywood texture). Stained concrete walls. Single hanging tube light over the door. Exposed wires, dented dark metal patch plates, rusty roof vents, and scrap boxes. Limited palette: stained concrete grey, dark metal `#1a1530`, deep purple `#3a1840`, faded hot pink neon `#e870c0`, weak warm yellow `#ffe080`, muted cyan `#5cc8d0`. Transparent background around the building only — no black box, no matte, no colored backdrop, and no checkerboard.

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
