# Beck's requests — the running list

Everything asked for, so nothing slips. Newest batch first. Status: **done** (live on main), **in progress** (being built
now — a branch or a render queue), **open** (not started), **discuss** (needs a decision with Beck). When something is
only partly done, the rest stays here as open.

## October 17 (the new look: "toy… not HD… with soft light", the normal faces, Stardew portraits — into the game)
Beck's pick from Look Book 2, and: "make it a goal of implementing all of these changes and updating everything… start
with updating the engine and all the descriptions and instructions… so all the new places… adopt this… then we can work
on updating everything else… as a backlog". The how-to is `apps/bridge/CLAUDE.md` (*North star*, *Live light*, *Making
a new place*).
| Ask | Status | Where / notes |
|---|---|---|
| The engine: the toy finish for every scene | **done** | `tools/bridge-art/scene_post.py` `STYLE = 'toy'` (bands, cool shadows / warm lights, lines between things — never in the ground or a roof's shingles). Shows on each scene as it's re-rendered: the Market Square first. |
| The engine: live light (the sun crossing the sky, seasons, weather, Look Book water) | **done** | `scenekit.py` renders the sky, six suns and the lamps for any scene with a day; `scene_post.py` packs them; `js/litscene.js` relights live in the game (test: `world/litlight.js`). Live on the Market Square; every other outdoor place as it's re-rendered (backlog below). |
| Soft light | **done** | js/gpu.js: the glow (bloom) plus a gentle vignette. |
| The instructions: how to make a place in the new style | **done** | `apps/bridge/CLAUDE.md` *Making a new place*; reference dioramas in `tools/bridge-art/dioramas/`; the richer house kit `tools/bridge-art/assets_house.py`. |
| The normal faces (not the round ones) on the people | **done** | Painted faces on every sheet (`characters.py` projects the face's points, `sprites_post.py` paints them: eyes with a catch-light, brows, a smile, blush; idle3 a blink, and everyone blinks now and then). All 131 NPCs, the crowd's bodies, every pilot sheet (walking, seated, skiing, climbing, fighting) and the weapons in hand. |
| A face in the talk portrait, Stardew-style (not the top of a hat) | **done** (redrawn: drawn, not rendered — Beck's pick of three styles) | `tools/bridge-art/portraits.py`: 64 × 64 drawn portraits for every NPC, crowd body and pilot head, five expressions (neutral, happy, surprised, sad, blink) that follow the conversation; ×2 on a desktop, ×1 on a phone; the same faces, halved, in the ledger and on the staff board. |
| **Backlog** — re-render the outdoor places with live light and the toy finish | in progress (nine sessions, Oct 17) | Done: the Market Square. To do — Lumar: Diggen's Point (`lumar_harbor`), Crownhaven, Tern Holm, Starling Holm, Rose Cove, Sapphire Port, Crimson Reach. Verdance: the farm, Brambleford. Hoarfell: Fellhaven, the pistes, the Park, the face, the summit, the Last Ridge, the Ice Step. Sylvara: Elderglade. (Midnight Isle and Arcadia never see the sun: the toy finish only.) |
| **Backlog** — re-render the interiors and night places in the toy finish | open | Done: the bakery. To do: every other scene in `tools/bridge-art/scenes/` (taverns, shops, homes, the ship, the stations, the casino, Arcadia's streets, Midnight Isle, the mines and caves). |
| **Backlog** — rebuild the places as richer dioramas, world by world | in progress (exteriors: nine sessions, one per area, `_claude_docs/prompt-bridge-rebuild.md`) | Shaped land, layered vegetation, the house kit, small life (the reference dioramas' standard; `tools/bridge-art/dioramas/ref/`). Interiors later. Start with the farm and Brambleford (Millpond Farm shows the way), then Lumar's towns, Elderglade, Fellhaven. |
| The backgrounds behind the places, "a lot better" (Beck: "the background buildings… making them cooler and the whole scene of the worlds in the background") | in progress | Arcadia's skyline (the Arcadia rebuild session: `skyline.py`, `assets_city.py`, `js/skyline.js`), Hoarfell's sky, ranges and cloud sea (the Hoarfell session), Lumar's open sea (a session of its own: `js/sea.js`, Look Book water). The flicker in them was the GPU glow: fixed (js/gpu.js, `world/glowshift.js`). |
| **Backlog** — faces on every sheet, pilots included | **done** | Every NPC, crowd, pilot and event sheet. (Faces under a brim, curls or a beard show partly or not at all, as before.) |
| **Backlog** — the sea under live light: reflections of islands, ships and the sky | open | js/sea.js draws the sea over the relit seabed; Look Book's mirrored reflections for the open water and harbours. |
| **Backlog** — postcard views and cutscenes (fishing, benches, the title) | open | Look Book 2's postcard: a low side camera, a painted sky, a smooth camera move from the game view. |
| **Backlog** — each place's own sun path, and the GPU doing the live compose | open | Today every scene's sun comes from the same side (`LIT_SUNS`); a per-scene direction would suit coasts facing west. The compose is CPU, a few ms a frame about once a minute: a WebGL version could relight every frame. |
| **Backlog** — the remaining PNG and code-drawn art into the 3D kit | open | AI-painted PNG buildings and props, procedural tiles, creatures; the PNG rules in CLAUDE.md are legacy now. |

## October 17 (Denser worlds, Workstream B2: the Crimson and Midnight seas)
Beck: "there's the Midnight Sea with the kind of evil monsters and the sorceress… and then the dragon one through the
Crimson with the dangerous weather and the dragon's lair… build out those in more depth". One session, shipping piece
by piece (`apps/bridge/CLAUDE.md`, *The Crimson and the Midnight seas, grown*).
| Ask | Status | Where / notes |
|---|---|---|
| Morwen's tower grown: more floors that climb | **done** | The stillroom (her bed, the still, the black mirror, Idris Thorne's ghost in his ward circle) and the star chamber (the orrery of the seven worlds, the telescope, the scrying pool showing the Midnight Sea tonight). Ghosts drawn see-through (`ghost: true`). |
| Crimson: a pirate port in a wreck-strewn cove (rogues' tavern, a fence, the pirates' slip), the volcano, a stormwatch tower | in progress | A new island in the Crimson's part of the chart. |
| Midnight: a drowned village half under the water, a ghost ship to board at sea, more of its creatures | in progress | Saltmere (a new island in the Midnight Sea), the Gloaming. |

## October 17 (Look Book 2: "somewhere in between" — keep our 3D model world, swing bigger)
| Ask | Status | Where / notes |
|---|---|---|
| Keep the 3D model look (cohesive, the 45° angle, the chibis) but tie it together: more detail, more realistic, less boxy | **done** (examples) | Look Book 2: https://claude.ai/artifact/8aQQzX3EuZ7x4q5xsTyEjx (source `_claude_docs/lookbook2/`). Five places rebuilt as new Blender dioramas from our kit (Millpond Farm, Lantern Quay, Elderglade Brook, Fellhaven Tarn, Rainline Street), a richer house kit (Brambleford today vs richer), all lit live. |
| The light, soft light / HD-2D, shadows moving with the sun, weather | **done** (examples) | relight.js: six sun passes, sky, lamps, flat colour, mixed per hour/season/weather; four finishes (Model, Toy, Model HD, Toy HD). |
| Water like Look Book 1: reflections, natural, not rings; ponds that belong to the land | **done** (examples) | Far-bank mirrored reflections, organic depth patches, lap line on the near shore, glitter path, stars, shore ice in winter, light streaks at night. Millpond's pond is irregular, sunk into the land. |
| People: rounder, cuter, Stardew-like faces, not realistic | **done** (examples) | Chibis: the game's 3D models with faces painted after the render (chars/), in two heads, normal and round. Beck's final pick: the normal one. |
| Postcard view with smooth transitions into cutscenes | **done** (example) | The farm from a low side camera, painted sky behind, a click plays the camera tilting down from the game view. |
| Pick a version and bring it into the game | **done** (picked) | Toy (not HD) with soft light, normal faces, Stardew portraits — see the section above. |

## October 17 (the art direction: "more like Stardew… gorgeous landscapes… high-def pixel")
| Ask | Status | Where / notes |
|---|---|---|
| Show examples of how the worlds, buildings and people could look; a handful of styles; what's realistic | **done** | The Look Book: https://claude.ai/artifact/XBv6zdjx4M9oJ2NwEgonG7 (source in `_claude_docs/lookbook/`). Three styles side by side (16-bit, hi-res, hi-res + HD-2D), five places (Verdance millpond, Lumar quay, Sylvara brook, Hoarfell tarn, Arcadia rain street), a side-view postcard lake, a five-world building street, the hand-drawn cast; every scene follows the hour, season, weather and finish. |
| Pick the direction: between Stardew and Octopath (hi-res pixel + HD-2D light), Cast n Chill's water | discuss | Beck leaned to Octopath / in between. Proposed order: engine light and finish → water → a nature test scene then the outdoor re-renders (shaping the land) → people (layered sprites) → buildings → postcard views. |
| Hand-drawn sprites instead of 3D for people (and trees, buildings) | discuss | Beck: "fine with moving to hand-drawn sprites". The look book's people.js and buildings.js are drawn in code, so this can be done in the repo. |

## October 17 (denser, more alive worlds — Beck's picks from the brainstorm, still being shaped)
The plan, item by item (agreed, proposed, parked, out): `_claude_docs/spec-denser-worlds.md`.
| Ask | Status | Where / notes |
|---|---|---|
| Crowds of background people, "lots of people" | **done** | js/crowd.js + assets/crowds.json: 30 places, 17 bodies recoloured per planet, the same crowd for everyone, umbrellas in the rain, a word and now and then a favour. Pairs with the routines. |
| Small events on the hour | **done** | js/events.js: 27 small happenings across the planets, every 20-minute slot, the same for everyone; crowds gather to watch. Not yet: live events marked on the Map tab. |
| Race anyone who's there ("I want to be able to race Alyssa"): sailing, skiing, climbing; and the seas a little larger | **done** | js/race.js: ski, climbing and sailing races against anyone there, through Play a game…; the Emerald Regatta on Fridays (noon–midnight ET, a start every 15 min off Crownhaven, prizes and the Regatta Cup); the seas a fifth bigger. Raced in a party too: each still sails her own sloop, nobody's called aboard (`together/t_race_sail.js party`). |
| A party for playing together: travel waits for both of you (ready check), ride along on jumps, come aboard each other's Wayfarer | **done** | js/party.js: invite, boarding calls with a ready check for the jump, shuttle, casting off and the mine; both Wayfarers jump together and are seen in orbit; come aboard each other's ship. Left: sailing from your own island only brings a non-partner to the pier; the office's board and chart show the visitor's own data; coming aboard needs the owner online. |
| The Wayfarer grows with your crew | discuss | Galley and cook, the mess, crew walking about, modules. |
| Enigma: restore the station, a zero-g spine | parked | Beck likes it; a note for later (the playing-together question). |
| Arcadia: up, down and out — ritzier up, poorer down; the Undercity; trains and a sky loop; implants; restaurants on every level; large but connected, room to go side to side | discuss | Layout in the spec (levels × districts), agreed. The bottom dangerous, with fighting. Heist and rooftop running out. |
| Arcadia, Workstream D — above and across: the Mid-Levels, the Spires, the District grown out, getting around | in progress | Plan: `_claude_docs/spec-arcadia-above.md`. **Done:** express lifts with the floors rolling past (`js/transit.js`, `assets/arcadia-lifts.json` — C adds its lobbies there), air cabs between pads, the Loop (a carriage to ride in, `arcadia-loop`, the city streaming past; her train over the District street and into stations), the Map's side-on cutaway of the levels. **Building:** the Spires and its rooms, the Terraces and the jazz bar, Lantern Row and the spaceport, Skyport 7's skybridge and cab rank. |
| Lumar: harbours that work; a cliff town; the spore bloom; a weekly regatta; each sea's towns, people and ships their own; Crownhaven much bigger | discuss | Per-sea ideas in the spec (Beck likes them). Tides, ferry work maybe; diving, the dragon egg out. |
| Sylvara: canopy city, the river by canoe to Mirror Lake with places along it, the falls, the Deepwood, brewing, bows | in progress (workstream F) | Built: **bows** (js/arms.js `bow`, js/bows.js — hold to draw, let go to loose; rope and fire arrows, zip lines, high lanterns, switches, Aerin's range; the bow's own pilot sheets). Next: the Rootmarket, the Boughs, the Crown; the Silverrun by canoe; the Deepwood; brewing with Mirelle. |
| Verdance: the village grows with you, the countryside by horse and buggy, small towns, makers and a café, produce shipped to Arcadia, night-blooming flowers | discuss | Market day only if someone else runs the stall. |
| Hoarfell: Fellhaven bougier; a grand hotel (château, Monaco-y, its own town and casino salon); a mountain railway as a cutscene; hut-to-hut touring; the hidden valley with tiers of enemies | in progress (Workstream E) | Built: the promenade below Fellhaven (rink, heated pool, Stübli, Alpenhof, sleighs, après-ski, the station), Aurelle and Château Aurelle (the salon's tables in the château's own frame, the spa, the rue, La Table, furs), the mountain railway (js/railway.js, by season and hour, skippable once seen), the High Route (glacier, col, two huts; js/touring.js), the hidden valley (springs, ice caves, cliff monastery, the heart) with its tiers of creatures and the shy yetis (js/valley.js). Rendering the places now. Guiding jobs and the dog sled out. |

## October 17 (ideas Beck picked — "not super pressing… good options to start working on")
| Ask | Status | Where / notes |
|---|---|---|
| Festivals: one per planet per season, on its own clock — the place dresses up, limited stock, contests | **done** (v1) | js/festivals.js + assets/festivals.json, on the weekend of a season's last week: the Harvest Fair (Brambleford, Verdance's autumn weekend: produce show judged by Old Ludd, the fair stall, the village gathered) and Lantern Tide (Crownhaven quay, Lumar's second autumn weekend: lanterns out on the tide after dark, a fishing derby, the lantern stall). Next: the other seasons' festivals, Hoarfell's ice fair and ski race, Arcadia, Sylvara's full moon. |
| A dungeon that resets every night | done (v1) | The Undercroft under Midnight Isle (js/dungeon.js, on the other session's rendered hall and three crypt layouts): down the stair from a way in in Midnight's graveyard (5, 21; Midnight's own render gets one when it's re-rendered), tonight's floors the same for everyone, monsters by depth, chests of Workshop materials and four relics, rune traps, a guardian sealing every fifth stair, the board of tonight's deepest, the lift back down to any fifth floor reached tonight; you come round in the hall. Next, if wanted: deeper floors' own looks, more relics, a weekly record across pilots. |
| Music that changes with the moment | **done** (v1) | js/audio.js: outdoor themes follow the sky (dawn, day, dusk, night) and weather (rain/snow soften, storm darkens); the fair's jig and Lantern Tide's hymn; the tavern band when you sit. Next: a jukebox for your homes (needs a furniture render). |
| Daily routines for the cast | **done** (v1) | js/routines.js + assets/routines.json: 14 people keep a day on the hours anchors (Brambleford's six; the Crown & Anchor's regulars; the bosun on Crownhaven quay; Bram, Fenwick, Gran Wilde and the cartographer at Diggen's Point), walking between stops through doors, stopping when you're beside them; the Map shows where they are. Next: more of the cast, weather (home when it rains). |
| A guided first hour | later | Beck: a good idea at some point, not yet. One character walks a new pilot through fish → sell → buy → sail. |
| Secrets in every world | open (later) | Hidden rooms, things only there at certain hours or weather, glyphs that are ciphers (cipher-room, typist); a count per world on the Map tab. Shape to be worked out with Beck. |
| A main story that ties the quests together and ends at the Singularity | discuss | Beck wants one "at some point"; think it through first. The quests already hint at a thread (the ship mark, the Listeners, Forty-Seven Point Three, the Brink). |

## October 17 (the nature, the fleet, the empire)
| Ask | Status | Where / notes |
|---|---|---|
| Buildings need more detail — roofs are "a square with some lines on it"; make the world more detailed and alive | in progress | Done in the kit: shingled roofs (courses, joints, ridge tiles, gutters, moss), brick chimneys, ivy, doorstep pots, snowy roofs as drifts; and now every house's foot — footings in dressed stone, weathered plaster (damp, rain streaks, a patch of brick), a water butt under the downpipe, crates, barrels, a broom. Every outdoor scene is re-rendering with it (queue below; Crownhaven and Brambleford started before the walls pass and get one more). Street clutter in the open squares is in the kit too (drains, weeds, cracked flags, straw by the stalls, chalk hopscotch): Crownhaven, Brambleford, Sapphire and the Market Square, live as they re-render. |
| Barn doors: the X's aren't all white, a spot on the right, panels not all the way across | **done** (in the kit) | Flat white braces in full frames, a track, handles, a cupola and weathervane. Live with the farm's re-render. |
| Chimneys are "a couple squares" | **done** (in the kit) | Brick stacks with courses, corbel, soot, cap, clay pots, flashing. Live as scenes re-render. |
| More variation in character | in progress | Houses: tints, shutter/timber colours, dormers, door hoods, weathervanes (done in the kit). Next: more building types and NPC variety. |
| Going forward, make renders detailed and realistic | **done** (standing rule) | "The detail standard" in apps/bridge/CLAUDE.md: checked before any render ships. |
| Empire: economic engine across worlds, hire and automate, manage it all from the office | in progress | Agreed plan in `_claude_docs/spec-empire.md`, six chunks. Chunks 1–3 built (chunk 2: your own slipway). Chunk 3 done: captains (mate, captain, master) on any ship, standing orders (trade loops, supply runs to your businesses, runs for the Workshop) that sail by themselves, the morning dispatch, the treasury, the office's desk and chart lines. Chunk 4 built: the hall of finds on your holm, where what you find yourself goes on show. Chunk 5 built: the Cabinet of Wonders (six wonders made from your own finds, each working for good). Every completed Collection set now gives a lasting bonus too. Next: chunk 6 (across worlds). |
| The Undercroft (the other session's nightly dungeon under Midnight Isle): the art | **done** | The four rooms (`scenes/lumar_undercroft.py`, kit `assets_crypt.py`): the entrance hall (stair up, the slate of the deepest floor, the stair down) and three crypt layouts for every floor below, as the Rose Mine's caves are; and the way in, a roofed stone stairwell between two wisp-flames in Midnight Isle's graveyard (its re-render). Its relics also go on show in the hall of finds, and three can be woken into wonders. |
| Crafting: more materials, mining feeding upgrades, build things, build out your base | **done** (chunk 1) | The Workshop on Starling Holm: 14 materials with clear sources, 29 recipes (planks, bars, rope, sailcloth, guns, fittings — two only it makes — tools, furniture), plans bought, taught for a favour or found, smiths you hire who work while you're away, parts fitted by any harbourmaster for labour. Its building is in the holm's render now (the forge and timber shop). |
| Buy upgrades where they're made (sail there), or build them at your own yard with hired smiths; build your own ship from timber etc.; later design it | in progress | Chunk 1 done (workshop, smiths, crafted fittings and guns). Chunk 2 built: the slipway on your holm — hull plans from the yards, a keel laid and named, materials in by stage, shipwrights on the payroll, launched into your fleet; her paint, sails and figurehead; parts fitted for nothing. Her colours drawn wherever she is (painted topsides with the deck bare, her cloth, her figurehead; the colours screen shows her as you choose). The slipway is in the holm's render: the old slip into the water, rebuilt with ways and sheer-legs, a hull on it at each stage. Still to come: a designer later. |
| Rarest magic items found yourself; a trophy hall; keep it cute | open | Chunks 4 and 5. |
| Hired warriors hunting monsters for loot | dropped | Beck: "fine to leave out". |
| Progression must feel natural, a real game to work up through | standing rule | Each chunk unlocks gradually (recipes learnt, plans bought, tiers by material). |
| Title page: the ship over its planet, but keep the technology feel | **done** | The Wayfarer drifting over the planet she's parked at, day and night by that planet's own clock (lights on its night side, storms, the ship in its shadow after sunset), the shuttle diving now and then; the terminal kept: a pixel BECKNOLOGY with a cursor and glow, orbit readouts, a reticle on the landing site, boot lines; Continue as Beck with your face, coins and who's online; phone and desktop. |
| Update the title page (the Becknology start screen) | **done** | See the row above. Not yet: title music, postcards of the worlds. |
| Grass should be actual drawn grass and textures, "not random blobs", "subtle little grass… down to that small level" | **done** (rolling out) | Hand-drawn pixel marks stamped over every meadow (`scene_post.grass_detail`); broad patches evened out; the turf's grain in tile units. Each outdoor scene gets it as it re-renders (queue below). |
| Smaller images (from the other session's split) | **done** | Every scene's images are lossless WebP — pixel for pixel the same, about a third smaller. |
| "Use open source projects where it helps" | noted | Use permissively licensed (CC0 / MIT) tools or art only; none adopted yet. |
| Apply the seasons to all the places in those worlds | **done** | Ground through the year on every outdoor place of Lumar and Verdance (js/foliage.js `ground`), trees already turned. Fully visible once each scene re-renders with its grass marked. |
| More detail, more realistic, like Stardew | in progress | Meadow, drawn grass, fuller trees, seasons. Keep going: water (ponds, streams), shorelines, paths, ground clutter. |
| Animations for the worlds, especially nature | **done** (v1) | js/nature.js: trees in the wind, gusts over grass, water glints and rings, butterflies, dragonflies, fireflies, falling leaves and petals, flocks with shadows, grass rustling at your feet. Grass and water effects need the re-rendered scenes. |
| Touch up every world so they match; shorelines; worlds without nights | in progress | Nights for Hoarfell's sport worlds: all six live by day, dusk and night (the summit, the pistes, the Park, the face, the Last Ridge, the Ice Step), the drawn sky behind them following. Shorelines: a damp band of sand the waves wash and a wrack line of weed, shells and driftwood along it, in the coast kit (live as the islands re-render). Still to do: a consistency pass after the re-renders. |
| Command ships from anywhere | **done** | Ledger's fleet page, any harbourmaster, the Ferryman: send any ship to any island. |
| My ship is stuck at Midnight Isle — bring it home | **done** | Ships left there sail home to the holm once, on your next load. The Ferryman's book has "Your ships" again. |
| A fish tank to build, holding the fish you catch | **done** | The Fish Tank (5 fish) and the Grand Aquarium (12) from any home's furnishing shop or the Chandler; put fish in from your pack or a ship's hold, take one out, look in close; styled to the room (walnut, neon, gunmetal); a visiting partner can slip one in. |
| Combat uses too much energy too quickly | **done** | Rolls 3 (was 5), charged blows 2–4 by weapon, bolts 2; a second wind gives three quarters back after a breath. |
| Combat looks janky: red squares popping up; a square round the falling orbs | **done** | No boxes anywhere in a fight (a test fails on any): round wind-up pools, slashes, white-then-red flashes, round loot glows, pixel numbers; the wisps' bolts and the Warden's toll now show at all. |
| Visual ship upgrades: see the guns, cannons firing, fittings | **done** | Every gun and fitting drawn on the ship (copper, oak, roseite, storm rigging, crystal-weave sails, the moon lantern); broadsides ripple with flashes, recoil, drifting smoke, shot trails, splashes and hits; the harbourmaster shows her as fitted. |
| Ships a little bigger: the starting boat a bit bigger, each size up a bit bigger again — "never super crazy" | in progress | Next for the ship-visuals agent once its branch lands (hull sheets re-rendered at the new sizes, moorings and boarding refit). |
| Other ships out on the ocean: different sizes and types — fishing boats, merchant ships, fighting ships | in progress | Same agent, same code (js/sloop.js traffic): trawlers and dories working the grounds, merchantmen on the trade lanes, patrols and warships, each sized and rigged its own way. |
| Keep working on the office space | **done** | The Captain's Office, through a new door off the bridge: the desk (the whole ledger), a staff board of everyone's faces with lamps (at work, off, at sea, owed), a chart table with your ships as pins under way (send them from it), the strongbox and accounts (pay what's owed), the captain's chair and windows. |
| Ship orchestration, hiring, sending ships out, upgrading — make it better | discuss | Draft: `_claude_docs/spec-empire.md`. |
| Think through business operations as a whole: magic items, cool things, building an empire that flows together | discuss | Draft: `_claude_docs/spec-empire.md`. |
| Split work into branches and merge later; do several things at once | doing | Each stream above is its own worktree branch, merged and shipped when its tests pass. |
| Make sure nothing slips through the cracks | doing | This file. |

## Legacy homes (from before: the Penthouse, Ashcombe House, the Starling)
| Ask | Status | Notes |
|---|---|---|
| The Penthouse (Arcadia, 250,000, door on Skyport 7's roof pad) | **done**, needs a detail pass | Live and furnishable, but mostly empty floor by today's standard. |
| Ashcombe House (Crownhaven, 400,000, beside the Crown & Anchor) | **done**, needs a detail pass | Live, but mostly bare planks and one plain rug. |
| The Starling (holm resort, 150,000 from the holm's ledger) | **done** | The building and parasols on the holm, running as a venue; its door leads into the lobby (front desk, a rattan bar round a tower of bottles, palms and fans, a terrace over the sea), staff at their posts as you hire them, guests while it runs. |
| Detail pass on both homes + the Starling's interior | **done** | Every room looked at by day and night. Left: faint denoiser mottling on the hall's marble and the Starling's boards at night (a re-render at 96 samples would clear it). |
| Penthouse: more space; an outdoor deck with the pool out there and views of the city all round | **done** | One world, the city all round through the glass and past the balustrade: inside on gold-veined black marble (the bed facing the city, a stone bath, a bathroom, a sectional, a white grand piano, the bar under HALCYON neon, the kitchen), and through sliding glass the teak roof deck — a plunge pool glowing cyan, loungers, a fire pit, an olive tree, string lights, rain on the deck but not indoors. |
| Ashcombe House should be big — "super bougie and gorgeous" | **done** | The great hall (marble, the grand staircase to the gallery, a chimneypiece under the admiral's portrait, the great chandelier) and four rooms off it: the drawing room, the library, the dining room laid for twelve, the master bedroom up the stairs — each by day and by night, Lumar's live sky in the windows. |
| All of them customisable | **done** | Every room, the deck and the Starling furnishable with H, open floor left for your pieces. |

## Sleep
| Ask | Status | Notes |
|---|---|---|
| Sleep should restore health and energy over time, not instantly; never too long | **done** | Health and energy fill as you sleep (full from nothing in ~45–60 s), wake any time with what you've got, wake by yourself when full; beds differ (clinic ×2, hammock ×0.8, lodge ×1.2 and warming, the stove chair ×0.9). |

## Earlier this session
| Ask | Status | Notes |
|---|---|---|
| Faces and perks for the people you hire; staff page; an office for workers | **done** | Ledger Staff & payroll, captain's desk on the bridge (the office is being expanded, above). |
| Ocean looks off by the town near the Midnight Sea | **done** | Island water feathered into the open sea. |
| No harbourmaster on Midnight | **done** | The Ferryman. |
| Monsters to battle in the Midnight waters — only there, not right at its edge, the island well inland | **done** | Gloamserpent, wisp eels, the Deep Maw, a harpoon on every boat. **Playtest wanted**: how hard they hit and what they pay. |
| Trees: more detail, more leaves, fall colours that change, evergreens in places (evergreens don't turn) | **done** | Renders rolling out; js/foliage.js. |
| Hired people do their jobs whether you're looking or not | **done** | Confirmed (farm hands, staff, ships on the clock). |
| Grass detail like Stardew; then "more realistic, less fake" | **done**, iterating | See the October 17 rows. |
| Brambleford square: grass between the cobbles | in progress | Fixed in the kit; the village is in the render queue. |
| The farm's field soil | **done** | Crumbly earth, in the farm's re-render. |

## Render queue (every outdoor scene, once, with everything: meadow, drawn grass, trees and seasons, grass/water marks, the new roofs and house fronts)
Stopped: the old-finish queue is done with. Every outdoor scene got one re-render in the old (dithered) finish, plus
Crownhaven, Brambleford and the market square again (street clutter, hopscotch), Starling Holm again (slipway, hull stages, the
hall of finds) and Hoarfell's six sport worlds by day, dusk and night. Bringing places into the new look (toy finish + live
light) is the backlog in the October 17 new-look section above; its re-renders pick up the kit fixes made here on the way (the
moon set back from long maps and from in front on walls, the hopscotch finding clear paving, the slip laid on the bank).

## Older threads still open (from before this session; check what's left before calling them done)
- Two ships: mothership home base + landing shuttle (#18)
- Bigger, denser worlds with loot and purpose (#23)
- Lumar shorelines: natural coasts, foam, lively water (#26)
- Places within places: upstairs, house interiors, den rooms (#28)
- World vision plan + Arcadia cyberpunk overhaul (#29)
- World-styled dialogs and meaningful interactions (#31)
- Much bigger Lumar islands (#33)
- Long game: quests, businesses, crew, NPC backstories (#34) — folds into the empire spec
- Legacy interiors: penthouse, manor, holm resort (#129) — the holm resort's parasols done; check the rest
- Night versions of Hoarfell's sport worlds and their skies (the living-worlds spec's last item) — done: all six by day, dusk and night
