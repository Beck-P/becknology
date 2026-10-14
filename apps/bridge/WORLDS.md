# Bridge — World Vision

What each world becomes at its best, so we build toward a picture instead of
patching the old baseline. Every world should be **beautiful at a glance,
dense with things to look at, and give you a reason to be there** —
somewhere to go, something to find, someone to talk to, a game folded into
the place. Art rules live in `CLAUDE.md`; this file is the *what*.

## Scale
We're in space: a few places can be small (a cabin, a shop), but most
worlds should make you go *whoa, this is a whole world*. Targets:
- **Planet-level worlds** (Lumar's sea, Arcadia's city) are many connected
  areas, each 40–80 tiles across, not one screen.
- **An island is a place to explore**, not a dock: coves, a village, a
  ridge, caves, ruins, a lighthouse — 40 × 30 tiles and up.
- **Open, not corridors**: every edge leads somewhere; landmarks you can
  see before you reach them; shortcuts you unlock.
- **Each world feels different to be in** — its own way of moving
  (sailing, transit and rooftops, zero-g), its own work, its own people.

## The Wayfarer (home)
A sky-galleon of a starship: indigo hull, gold wales, light-sails, warm
portholes. Home, not a cockpit.

- **Bridge** — a captain's deck, wood and brass under a wide viewport that
  shows wherever we're parked (a planet turning below, a station, the hole).
  The star-map table is the centrepiece; the helm, a navigator's chart desk,
  a comms nook with letters from people met on worlds. Decor slots like the
  quarters (plants, trophies, lamps, rugs) so it becomes yours.
- **Quarters** — cozy, customizable (exists).
- **Hangar** — the skiff on its pad, the bay open on the planet below, the
  workbench where found parts become upgrades.
- **Game room** — every mini-game you've found lands here as a cabinet,
  board or table: the place to replay them, a trophy wall of high scores.
- **Observatory** (later) — the codex: creatures, people, places discovered.

## Lumar — the spore sea
Night on a green, faintly glowing sea; saltstone islands; fishermen, crystal
harvesters, a dragon under the hill. Warm lamplight against cold blue.

- **Coasts that feel real**: irregular shorelines, foam lapping rocks and
  sand, tide pools, glowing spores drifting in the shallows, boats bobbing.
- **Diggen's Point (harbour)** — lighthouse, pier and galleon, a beach with
  rowboats, a cliff meadow, the trail up to the square.
- **Market Square** — the heart: tavern, inn (with its guest floor), bakery,
  apothecary, smithy, the fisher's cottage, the cartographer's house; stalls
  that change with the day; a festival square later.
- **The four isles** — each its own small world with a purpose:
  Crimson (the dragon's cave, now a warren of chambers: hoard, nest, bone
  gallery, lava vents), Rose (the crystal harvesters' workshop and a grotto),
  Sapphire (the floating market, traders who buy what you find), Midnight
  (the sorceress's tower, floors that climb).
- **Sailing** between every dock on the galleon at sea — and, longer
  term, **the open sea as a world**: take the helm and sail between the
  islands yourself, meet other ships (traders, patrols, pirates, a ghost
  galleon), fish, salvage wrecks, find islands that aren't on the chart.
- **Purpose**: crystals to harvest and sell, recipes for the apothecary,
  the cartographer's map to complete, the dragon's riddle; fishing (a
  mini-game) off the pier.

## Arcadia — the neon megacity
A cyberpunk night city stacked into the sky: rain-slick walkways, holo-ads
the size of buildings, traffic streams between towers, steam from noodle
stalls, a hum of music. Neon pink/cyan against deep violet.

- **The backdrop**: layered parallax skyline — distant mega-towers with
  lit windows, mid-ground towers with giant animated holo-ads, flying
  traffic lanes, searchlights, rain, a moon behind smog.
- **The District (street)** — a two-level street: a lower market lane and
  an upper walkway on struts, with stairs and an elevator; shopfronts with
  depth (awnings, signage stacks, vending alcoves, cables overhead,
  puddles reflecting neon), a skypad where the skiff lands.
- **Interiors with character** — the Arcade (cabinets, a prize counter,
  a back room tournament), the noodle bar (steam, a chef, regulars),
  the clinic (augment chair, holo-scans), the pawnshop (junk with stories),
  the repair shop (drones mid-surgery), the mart (late-night shoppers);
  plus a rooftop bar, a back-alley hacker den, an apartment you can rent.
- **Purpose**: jobs from the street (deliveries, finding lost drones),
  credits, the arcade's tournament ladder, a hacker side-story.

## Enigma — the silent station
An abandoned listening post turning by a ringed giant. Cold light, server
hum, warning strobes, the feeling that someone left in a hurry.

- Docking ring where the skiff berths; the main ring of rooms (comms,
  crew quarters, hydroponics gone wild, the data core); a zero-g spine.
- **Purpose**: decode the transmissions (cipher-room, typist) to learn what
  happened; restore power room by room.

## The Singularity — the shattered edge
No room, no walls: broken planes of rock and metal floating around a
warped black hole whose disc lights everything amber and violet, debris
streaming in, space visibly bent.

- Floating platforms joined by light-bridges; a lensed, Doppler-bright
  accretion disc; fragments of other worlds caught in orbit.
- **Purpose**: genart's generative pieces as "echoes" pulled from the hole;
  the place where the story's threads converge.

## The nav map and the jump
The star map should feel like a navigator's instrument: systems you've
found, routes, what's waiting where (jobs, crew, rumours); clean to use
(pick, see, confirm). The jump itself is a moment — the drive spooling,
stars streaking, a tunnel of light, dropping out over the new world.

## The long game: an empire
- **Quests that feel like the place**: errands that turn into stories,
  people who remember you, choices with consequences.
- **Businesses**: buy or start one (a noodle stall in Arcadia, a fishing
  boat or a salvage crew on Lumar, a trade run between systems), keep it
  supplied, watch it grow.
- **A crew**: meet people, hear their stories, hire them; send them on
  jobs and runs; their skills and loyalty matter. Money goes into crew,
  ships, businesses — an empire built across worlds.
- **People with a life of their own**: every NPC has a backstory,
  wants and a voice. Authored up front as data (generated offline, free
  at runtime) so the scripted world is rich on its own; a "talk freely"
  mode can sit on top later — either a small model in the browser
  (WebGPU; a few hundred MB to download, weaker in character) or a tiny
  serverless proxy to a cheap hosted model (a fraction of a cent per
  exchange, needs a key kept server-side and per-player limits), always
  falling back to scripted lines.

## Across every world
- Interactions that do things: talk, buy, gather, unlock, remember.
- Dialogs styled for their world (parchment in Lumar, neon terminal in
  Arcadia, holo panels aboard).
- Loot and collectibles worth picking up; reasons to come back.
- Places within places: upstairs, back rooms, cellars, rooftops.
- Every mini-game found in the world, then kept in the game room.

## Build order
1. ✓ Lumar coasts and water; more homes and upstairs. ✓ Arcadia's skyline,
   the District rebuilt with bespoke shopfronts and real-font signs,
   Skyport 7 on the roof.
2. ✓ The Singularity: a continuous plain at the Brink — the hole filling the
   sky, space warping round it, echoes, infalling grit, time stutters.
3. ✓ Landing sites for every world (Lumar's beach, Skyport 7, Enigma's
   Docking Bay 3, the Brink's ring), each with its own approach.
   ◐ Bigger worlds: the four Lumar islands rebuilt as whole islands
   (Crimson Reach, Rose Cove, Sapphire Port, Midnight Isle). Next:
   Arcadia's Skywalk level and back alleys behind the chained gate; more
   of Enigma (the ring corridor, hydroponics, quarters where Okafor sleeps).
4. ✓ Nav chart and hyperspace jump. Next: Bridge as a captain's deck; the
   game room.
5. ◐ Purpose: ✓ quests and a journal, ✓ a cast with backstories to talk
   to. Next: loot and collectibles worth carrying, jobs that pay, the
   codex; mini-games woven in.
6. The empire: businesses, crew; **open-sea sailing** — a top-down sea
   world where you take the galleon's helm between the islands (a Blender
   top-down galleon in eight headings, the sea from js/sea.js, islands as
   landmarks you dock at, other ships to hail: traders, patrols, pirates,
   a ghost galleon); then the conversation layer for NPCs seeded from
   people.json.
