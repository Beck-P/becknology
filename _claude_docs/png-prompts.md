# PNG asset prompts — copy/paste templates

These prompts produce assets that match `apps/bridge/CLAUDE.md` art direction. The header is identical for every prompt — keep it that way for consistency.

## Standard header (paste at the top of every prompt)

> Stardew Valley pixel art game asset, **front-elevation 3/4 perspective**, hand-drawn pixel art aesthetic, chunky pixels with **no anti-aliasing**, flat colors with simple cel shading, **limited palette of 3-4 tones per element**, hard 1-pixel dark outlines on the silhouette, **transparent background**, centered subject, no text, no logos, no watermarks. The subject sits squarely on the ground at the bottom-center of the image. Door is at bottom-center. **Windows are flat warm-yellow rectangles with no detail painted inside (animation will be layered on top in code).** Chimney (if present) sits at the upper roof corner with empty sky above (smoke animation goes there). Lantern flames (if present) are simple round shapes (flicker animation goes there).

## Lumar buildings

### Tavern (already generated — `tavern.png`)

### Inn (already generated — `inn.png`)

### Lighthouse (already generated — `lighthouse.png`)

### Captain's house — `captain-house.png` — 768 × 768 native
> [STANDARD HEADER]
>
> Subject: a single-story seaside captain's cottage. Stone foundation. Driftwood-grey wooden siding. A peaked dark slate roof. **A round brass-rimmed nautical porthole window centered on the upper wall** (flat blue glass — no scenery inside). A wooden front door with brass fittings at bottom-center. A hand-carved anchor crest above the door. Sea-green window shutters flanking the porthole. A coiled rope and a small barrel beside the door on the foundation. Limited palette: weathered grey, sea green, brass yellow, dark slate, brown wood. Empty space above the roofline.

### Bell tower — `bell-tower.png` — 384 × 768 native (tall)
> [STANDARD HEADER]
>
> Subject: a square stone bell tower four stories tall. Weathered grey stone blocks. **The top floor has tall arched openings revealing a large bronze bell hanging on a wooden beam** (flat warm bronze, simple shape — no detail inside). Narrow vertical window slits on the lower floors (flat warm yellow rectangles, no detail). A pyramidal slate roof with a small iron spire. Vines and ivy climbing one corner. A heavy wooden arched door at the bottom-center. Tower fills the full vertical axis. Limited palette: weathered grey stone, bronze, dark slate, dark green vine, brown wood. Empty space above the spire.

### Sorceress's tower — `sorceress-tower.png` — 576 × 1024 native (tall)
> [STANDARD HEADER]
>
> Subject: a narrow circular dark wizard's tower five stories tall. Dark stone walls. **Each floor has a single tall arched window glowing flat purple** (no scrying details inside — flat purple panes). Twisting black iron balconies wrap each floor. A conical purple-tiled roof with a small iron star spire. Gnarled black vines climbing the walls. **An ornate iron-banded oak door under a pointed stone arch at the bottom-center.** A faint surface fog suggested at the foot of the tower. Limited palette: dark stone grey, deep purple, black iron, dark green vine, brown oak. Empty space above the spire.

### Dragon — `dragon.png` — 1024 × 640 native (wide)
> [STANDARD HEADER]
>
> Subject: a massive sleeping red dragon curled around a pile of gold coins and red gems. **Front-on profile view**, head on the left, tail wrapping around the hoard on the right. Deep crimson scales fading to dark rust along the spine. Bone-colored horns curving back from the skull. Ivory teeth visible. Leathery folded wings tucked along the body. A thick spiked tail wrapping the hoard. **One yellow eye half-open with a slit pupil** (no detail inside the pupil — flat slit shape, will animate as glowing pulse). Two small wisps of grey smoke curling from the nostrils (we'll animate). Limited palette: crimson, dark rust, ivory, gold, dark grey smoke, ember orange. Empty space above the head and along the right where the tail ends.

## Arcadia District buildings

### Arcade marquee — `arcade-sign.png` — 1024 × 384 native (wide)
> [STANDARD HEADER]
>
> Subject: a glowing pink and purple neon sign reading "ARCADIA" in bold geometric tube letters, mounted on a dark metallic backing panel. **Hot pink and purple neon-tube letters** with bright cyan electric arcs between them. Glowing pink halo bloom around each letter. Small lens flares on the brightest tube curves. Mounting brackets at the top and bottom. Cyberpunk 80s arcade aesthetic. Limited palette: hot pink, deep purple, electric cyan, dark metal, white tube cores. **Black space surrounding the sign** so we can layer atmospheric haze.

### Cyberpunk shop — `arcadia-shop.png` — 768 × 1024 native
> [STANDARD HEADER]
>
> Subject: a single-story cyberpunk storefront. Dark metal walls with exposed pipes and conduits. **A wide front display window showing flat dark blue glass** (no products inside — we layer those in code). A neon sign hanging above the door, glowing pink (we'll animate the flicker). A dark metal door with a panel scanner beside it. The roof has visible HVAC units and an antenna. Limited palette: dark metal grey, hot pink neon, electric cyan, deep purple, black glass.

## Future NPC sprite sheets

When we add walk-cycle NPCs, here's the prompt structure. **Note**: DALL-E is bad at sprite sheets — the same character looks different across frames. Best approach is to generate one full-body image and we slice/animate manually, OR use a dedicated pixel-art sprite tool.

### Single full-body NPC reference — `npc-{name}.png` — 256 × 384 native
> [STANDARD HEADER]
>
> Subject: a single full-body character standing facing the camera, arms at sides, neutral expression. [Character description: e.g., "A grizzled tavern keeper in his 50s, brown apron over a cream tunic, full beard, balding, kind eyes."] Drawn at 16 × 32 effective pixel density (the body should be readable at very low resolution). One pose only. Empty space around the character on all sides.

We'll need to build a sprite-sheet animator separately or use a tool like Pixel Lab to fill in the walk frames.

## Tile sets — usually procedural, but possible PNG

If we want PNG tile sets later (cobblestone variations, sea tiles, walls):

### Tile set — `{world}-tiles.png` — 256 × 256 native (16 × 16 grid of 16-px tiles)
> [STANDARD HEADER]
>
> Subject: a 16 × 16 grid of pixel art tiles for a [world theme] environment, each tile 16 × 16 pixels. Top row: 4 variations of cobblestone path. Second row: 4 variations of grass / dirt / sand. Third row: water tiles (centre, edge, corner). Fourth row: wall tiles. Etc. Each tile must tile seamlessly with adjacent tiles. Limited palette per row.

This is hard for DALL-E to do right — tiles often don't seam. May need manual fixup.

## Don'ts (also in CLAUDE.md but worth repeating)

- ❌ Don't ask for "isometric" or "slanted" or "3/4 from above"
- ❌ Don't generate at low resolution (64×64 etc.) — DALL-E doesn't render small images well
- ❌ Don't paint detail inside windows — leave them flat warm yellow
- ❌ Don't paint detail inside dragon eye / lantern flame — leave a flat shape we can animate
- ❌ Don't put text on signs
- ❌ Don't introduce new color palettes without updating CLAUDE.md
