# Arcadia above and across — how Workstream D fits together

Workstream D of `spec-denser-worlds.md` (*Building it*): the Mid-Levels, the Spires, the District grown out, and
getting around. This is the working plan: the places, their ids, how they join, and the shared interfaces (the lifts
file, the interaction types). Workstream C (the Undercity, the Sump, implants) hangs off the same interfaces.

## The levels

Ritzier as you go up. Each level has a tag on its signs (`L480`, `L200`, `L0`, `B20`, `B60` — B for below the street).

| Level | Tag | Floors | West | Middle | East |
|---|---|---|---|---|---|
| **The Spires** (above the smog; real stars) | L480 | 400–520 | the sky gardens, the tea salon | Halcyon's crown plaza | the opera, the champagne bar, the sky docks |
| **The Mid-Levels** (glass and cyan) | L200 | 180–260 | the Skywalk | Skyport 7 | the Terraces: Loop station, terrace restaurants, the rooftop bar, the jazz bar |
| **The District** (pink and cyan in the rain) | L0 | 0–12 | Lantern Row, the old quarter | the neon street | the spaceport |
| **The Undercity** (C) | B20 | −30…−8 | | | |
| **The Sump** (C) | B60 | −70…−50 | | | |

## The places (world ids)

| World | What | Built by |
|---|---|---|
| `arcadia-spires` | **The Spires**, Halcyon's crown plaza — a hub ~96 × 46: the sky gardens (real trees) and the tea salon west, the crown plaza and Halcyon's tower foot in the middle, the opera's steps, the champagne bar and the sky docks (a yacht berthed) east; the Spire Express lobby; an air cab pad at the docks | fork A |
| `arcadia-opera`, `arcadia-champagne`, `arcadia-members`, `arcadia-boutique` | the opera house foyer; the champagne bar and sky lounge; the private members' club; the designer implant boutique | fork A |
| `arcadia-terraces` | **The Terraces** (Mid-Levels east) — a hub ~88 × 42: the Loop's Terraces station, terrace restaurants stepping down a tower's face, the rooftop cocktail bar, an atrium inside the tower, the jazz bar's door, the Spire Express lobby, an air cab pad, the skybridge to Skyport 7 | fork B |
| `arcadia-jazz` | the jazz bar | fork B |
| `arcadia-oldquarter` | **Lantern Row**, the old quarter (District west, ~64 × 24): lanterns, ramen, a tea house, a rooftop shrine up a stair; the Loop's Lantern Row station | fork C |
| `arcadia-spaceport` | **The spaceport** (District east, ~72 × 30): off-world freighters berthed in bays, cranes, customs, a spacers' bar; the Core Express lobby (the deep lift: C adds the Undercity and Sump), an air cab pad, the Loop's Spaceport station | fork C |
| `arcadia-loop` | the Loop's carriage (you ride in it) | D (main session) |

**How they join** (both ends must agree; coordinates are the building fork's, fill them in here when you ship):
- `arcadia-street` west edge (0, 10) ⇄ `arcadia-oldquarter` east edge; `arcadia-street` east edge (59, 10) ⇄
  `arcadia-spaceport` west edge. The street's two `leave_world SHIP` exits become these `enter_world`s (fork C changes
  just those two interactions; Return to ship works anywhere). Street side spawns: from the old quarter `[1, 10]`, from
  the spaceport `[58, 10]`.
- `arcadia-skypad` east edge door (22, 8) `SKYBRIDGE · THE TERRACES` ⇄ `arcadia-terraces` west edge
  (`SKYBRIDGE · SKYPORT 7`, back to `arcadia-skypad` `[27, 8]`). D re-renders Skyport 7 with the bridge. Fork B: the Terraces end is at (0, 19–20); arriving from Skyport 7, spawn `[2, 19]`.
- Everything else by the transit below.

## Getting around (js/transit.js, D)

All of it reads `apps/bridge/assets/arcadia-lifts.json` (D writes it; C adds its own entries). Shape:

```jsonc
{
  "levels": [ { "id": "spires", "name": "The Spires", "tag": "L480", "floors": [400, 520] }, … ],   // top first
  "places": { "arcadia-street": { "level": "district", "x": 0.5, "name": "The neon street" }, … }, // the Map's cutaway
  "shafts": {                                   // express lifts: a lobby per stop
    "spire": { "name": "Spire Express", "x": 0.72, "lobbies": [
      { "id": "terraces", "world": "arcadia-terraces", "floor": 208, "spawn": [x, y] },
      { "id": "spires",   "world": "arcadia-spires",   "floor": 480, "spawn": [x, y] } ] } },
  "loop":  { "name": "The Loop", "stations": [ { "id": "lantern", "name": "Lantern Row", "world": "arcadia-oldquarter", "spawn": [x, y] }, … ] },
  "cabs":  { "pads": [ { "id": "skyport", "name": "Skyport 7", "world": "arcadia-skypad", "spawn": [x, y], "level": "midlevels" }, … ] }
}
```

In a world JSON (the spawn is where you step out — a walkable tile in front of the lift doors / on the platform / by
the pad; the interaction stands on or next to the doors):
- `{ "x", "y", "type": "express_lift", "shaft": "spire", "lobby": "terraces", "label": "SPIRE EXPRESS", "prompt": "PRESS E TO CALL THE LIFT" }`
- `{ "x", "y", "type": "loop_station", "station": "terraces", "label": "THE LOOP", "prompt": "PRESS E TO TAKE THE LOOP" }`
- `{ "x", "y", "type": "air_cab", "pad": "terraces", "label": "AIR CAB", "prompt": "PRESS E TO HAIL A CAB" }`

Shafts: `skywalk` (the street — the Skywalk's west pod), `skyport` (the Skywalk's east pod — Skyport 7), `spire` (the Terraces — the Spires), `core` (the Core
Express: the spaceport, the Terraces, the Spires; C adds `undercity` and `sump` lobbies). Loop stations, round the
ring: `lantern`, `terraces`, `spaceport`. Cab pads: `skyport`, `terraces`, `spires`, `spaceport`.

A world in Arcadia shows the others: the skyline block's `mode` (`"spires"`: stars, the smog sea below with tower tops
through it, the other spires; default: the Mid-Levels/District city) — fork A adds the spires mode to js/skyline.js;
D adds `scrollX` (the Loop at speed).

## How every place is built
House style as `apps/bridge/CLAUDE.md` (*North star*, *Making a new place*, the detail standard) and
`tools/bridge-art/CLAUDE.md`; the bar is `tools/bridge-art/dioramas/ref/arcadia_*` (Rainline Street). Arcadia is always
night: `light_states={'full': {...}, 'dim': {...}}` (neon flicker), the toy finish from `scene_post.py`; the Spires lit
by lamps, pastel neon and starlight. Backdrop worlds (`scene.backdrop`, a `skyline` block) where the city shows.
Level tags on the signs. Painted-face NPCs (`characters.py` + `portraits.py`), `people.json`, `gifts.js` tastes,
`assets/crowds.json` (new wardrobes in js/crowd.js `WARDROBES`: `spires`, `midlevels`), an event or two in js/events.js
where they fit, `assets/actions.json` seats, music in js/audio.js `themeFor`. A test per place in `tools/tests/world/`,
registered in `run.js`. Docs: your own section in `apps/bridge/CLAUDE.md`.
