# Beck's requests — the running list

Everything asked for, so nothing slips. Newest batch first. Status: **done** (live on main), **in progress** (being built
now — a branch or a render queue), **open** (not started), **discuss** (needs a decision with Beck). When something is
only partly done, the rest stays here as open.

## October 17 (ideas Beck picked)
| Ask | Status | Where / notes |
|---|---|---|
| Festivals: one per planet per season, on its own clock — the place dresses up, limited stock, contests | open | Ideas: Lumar's lanterns on the water and a fishing derby, Arcadia's blackout night, Hoarfell's ice fair and ski race, Verdance's harvest fair judging your best crop. Builds on js/clock.js, js/seasons.js, js/weather.js, js/hours.js. |
| A dungeon that resets every night | open | Generated floors under Midnight Isle on js/mine.js + js/combat.js: new layout each night, deeper is richer, a best-run board for Beck and Alyssa. |
| Music that changes with the moment | open | js/audio.js layered by time of day, weather and place; a tavern band when you sit; a jukebox for your homes. |
| A guided first hour | open (later) | One character walks a new pilot through fish → sell → buy → sail, so a friend visiting cold isn't lost. |
| Secrets in every world | open (later) | Hidden rooms, things only there at certain hours or weather, glyphs that are ciphers (cipher-room, typist); a count per world on the Map tab. Shape to be worked out with Beck. |
| A main story that ties the quests together and ends at the Singularity | discuss | Beck wants one "at some point"; think it through first. The quests already hint at a thread (the ship mark, the Listeners, Forty-Seven Point Three, the Brink). |

## October 17 (the nature, the fleet, the empire)
| Ask | Status | Where / notes |
|---|---|---|
| Buildings need more detail — roofs are "a square with some lines on it"; make the world more detailed and alive | in progress | Done in the kit: shingled roofs (courses, joints, ridge tiles, gutters, moss), brick chimneys, ivy, doorstep pots, snowy roofs as drifts. Every outdoor scene is re-rendering with it (queue below). Next: walls, footings, street clutter. |
| Barn doors: the X's aren't all white, a spot on the right, panels not all the way across | **done** (in the kit) | Flat white braces in full frames, a track, handles, a cupola and weathervane. Live with the farm's re-render. |
| Chimneys are "a couple squares" | **done** (in the kit) | Brick stacks with courses, corbel, soot, cap, clay pots, flashing. Live as scenes re-render. |
| More variation in character | in progress | Houses: tints, shutter/timber colours, dormers, door hoods, weathervanes (done in the kit). Next: more building types and NPC variety. |
| Going forward, make renders detailed and realistic | **done** (standing rule) | "The detail standard" in apps/bridge/CLAUDE.md: checked before any render ships. |
| Empire: economic engine across worlds, hire and automate, manage it all from the office | in progress | Agreed plan in `_claude_docs/spec-empire.md`, six chunks. |
| Crafting: more materials, mining feeding upgrades, build things, build out your base | in progress | Chunk 1 (materials and the Workshop) on a branch now. |
| Buy upgrades where they're made (sail there), or build them at your own yard with hired smiths; build your own ship from timber etc.; later design it | open | Chunk 1 (workshop, smiths, crafted fittings) then chunk 2 (your own slipway, building and painting a ship; a designer later). |
| Rarest magic items found yourself; a trophy hall; keep it cute | open | Chunks 4 and 5. |
| Hired warriors hunting monsters for loot | dropped | Beck: "fine to leave out". |
| Progression must feel natural, a real game to work up through | standing rule | Each chunk unlocks gradually (recipes learnt, plans bought, tiers by material). |
| Title page: the ship over its planet, but keep the technology feel | in progress | Branch (worktree agent). |
| Update the title page (the Becknology start screen) | in progress | Proposal in chat: the mothership over the planet it's parked at (real day/night), a crafted pixel BECKNOLOGY logo, a real menu (Continue as Beck with portrait/where/coins, settings, who's online), later postcards of the worlds. Waiting on Beck's pick. |
| Grass should be actual drawn grass and textures, "not random blobs", "subtle little grass… down to that small level" | **done** (rolling out) | Hand-drawn pixel marks stamped over every meadow (`scene_post.grass_detail`); broad patches evened out; the turf's grain in tile units. Each outdoor scene gets it as it re-renders (queue below). |
| "Use open source projects where it helps" | noted | Use permissively licensed (CC0 / MIT) tools or art only; none adopted yet. |
| Apply the seasons to all the places in those worlds | **done** | Ground through the year on every outdoor place of Lumar and Verdance (js/foliage.js `ground`), trees already turned. Fully visible once each scene re-renders with its grass marked. |
| More detail, more realistic, like Stardew | in progress | Meadow, drawn grass, fuller trees, seasons. Keep going: water (ponds, streams), shorelines, paths, ground clutter. |
| Animations for the worlds, especially nature | **done** (v1) | js/nature.js: trees in the wind, gusts over grass, water glints and rings, butterflies, dragonflies, fireflies, falling leaves and petals, flocks with shadows, grass rustling at your feet. Grass and water effects need the re-rendered scenes. |
| Touch up every world so they match; shorelines; worlds without nights | open | Task #138: shorelines (wet sand, foam), nights for Hoarfell's sport worlds, consistency pass after the re-renders. |
| Command ships from anywhere | **done** | Ledger's fleet page, any harbourmaster, the Ferryman: send any ship to any island. |
| My ship is stuck at Midnight Isle — bring it home | **done** | Ships left there sail home to the holm once, on your next load. The Ferryman's book has "Your ships" again. |
| A fish tank to build, holding the fish you catch | in progress | Branch (worktree agent): tank furniture, put fish in/out, swimming fish art, close-up view, partners see it. |
| Combat uses too much energy too quickly | in progress | Branch (worktree agent). |
| Combat looks janky: red squares popping up; a square round the falling orbs | in progress | Branch (worktree agent). |
| Visual ship upgrades: see the guns, cannons firing, fittings | in progress | Branch (worktree agent). |
| Keep working on the office space | in progress | Branch (worktree agent): the Captain's Office aboard — desk, staff board, fleet chart table, strongbox. |
| Ship orchestration, hiring, sending ships out, upgrading — make it better | discuss | Draft: `_claude_docs/spec-empire.md`. |
| Think through business operations as a whole: magic items, cool things, building an empire that flows together | discuss | Draft: `_claude_docs/spec-empire.md`. |
| Split work into branches and merge later; do several things at once | doing | Each stream above is its own worktree branch, merged and shipped when its tests pass. |
| Make sure nothing slips through the cracks | doing | This file. |

## Legacy homes (from before: the Penthouse, Ashcombe House, the Starling)
| Ask | Status | Notes |
|---|---|---|
| The Penthouse (Arcadia, 250,000, door on Skyport 7's roof pad) | **done**, needs a detail pass | Live and furnishable, but mostly empty floor by today's standard. |
| Ashcombe House (Crownhaven, 400,000, beside the Crown & Anchor) | **done**, needs a detail pass | Live, but mostly bare planks and one plain rug. |
| The Starling (holm resort, 150,000 from the holm's ledger) | exterior **done**, interior open | The building and parasols on the holm, running as a venue; no interior yet. |
| Detail pass on both homes + the Starling's interior | in progress | Branch (worktree agent), started on Beck's go-ahead. |
| Penthouse: more space; an outdoor deck with the pool out there and views of the city all round | in progress | Pool moves from inside to a roof deck (glass rail, the skyline, traffic and holo-ads round it, loungers, a fire pit, planters, string lights); a bigger interior. |
| Ashcombe House should be big — "super bougie and gorgeous" | in progress | Great hall as the entry; rooms off it (drawing room, library, dining room, upstairs gallery and master bedroom) as places within places. |
| All of them customisable | in progress | Every room and the deck furnishable with the homes' furniture system, with open floor left for it. |

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
| The farm's field soil | in progress | Crumbly earth; the farm is in the render queue. |

## Render queue (every outdoor scene, once, with everything: meadow, drawn grass, trees and seasons, grass/water marks, the new roofs and house fronts)
Running (two queues): Crownhaven, Tern Holm, Diggen's Point, the farm, Midnight Isle, Sylvara · Brambleford, Starling Holm,
Sapphire, Crimson, Rose Cove, the market square, Hoarfell town. Each ships as it finishes.

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
- Night versions of Hoarfell's sport worlds and their skies (the living-worlds spec's last item)
