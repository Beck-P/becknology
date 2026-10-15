# Runouts

React 18 + Vite app (base `/runouts/`), built by the root `build.sh` into `public/runouts`. Game logic, rooms,
wagers and the setup UI live in `src/App.jsx`; how each game *looks* lives in `src/arcade/`.

## The game screens (`src/arcade/`)
- `ArcadeScreen.jsx` — a 480 × 270 pixel canvas (whole-number scaled when it fits) drawn every frame by the
  mode's screen from `{ result, step, done }` and the time since the step changed. `hasScreen(modeId, draft)` says
  whether a mode has one; `PlaybackStage` in App.jsx uses it before the old DOM playbacks (still there as a
  fallback, and for tournaments' wrapper). It also draws the two-player face-off and the wager stake badge.
- `modes/*.js` — one screen per game, registered in `modes/index.js`. A screen is `{ station, draw(ctx, s),
  drafts?, button?(s), press?(s) }`; `drafts: true` means it also draws the draft phase (hold'em, PLO, high card,
  derby lanes, stocks). Self-timed games (rocket, bomb, stocks) run their own clock and dispatch `rocket-complete`.
- `modes/common.js` — `scene()` frames a station in the room (the show render, with the station's own area
  swapped for the play render so the game draws its live parts), `players()` stands the pilots at seats with
  depth occlusion, `zoomed()` pushes the camera in (the derby), plus `row`, `bubble`, `spot`.
- `kit.js` — the 5×7 pixel font, palette (`PCOL` is one colour per player, by their place in `names`), easing,
  FX particles, the room loader (`loadRoom`, `roomPx`, `station`, `anchors`, `drawOccluded`) and `pilot()`, which
  draws the Bridge's pilot sheets (`/bridge/assets/characters/pilot-*.png`).
- `RoomPicker.jsx` — the game picker: the whole room, the players' pilots wandering between games (walks go
  up to the aisle at row 4.6 and along it, so they never cut through a table), hover to light a station, click to
  play; the card table asks which card game, the corner machine is RANDOM. Chips under it for keyboards.
- `Verdict.jsx` — the quiet result board under a finished screen game (the screen does the celebrating).

## The Runout Room (Blender)
`tools/bridge-art/scenes/runouts_room.py` (stations from `tools/bridge-art/assets_runouts.py`) renders the room
twice through the Bridge's scene pipeline: `public/art/room-show` (every station dressed) and
`public/art/room-play` (the live parts left off), each `full.png` + `depth.png` + `scene.json`, plus
`public/art/room.json` — each station's screen rect `[x0, top row, x1, bottom row]` in tiles and its anchors
(tile units: x, row, z) that the screens draw against. Re-render both and the JSON together; the screens and the
picker read stations by id (`holdem` is the card table for all three card games, `random` the corner machine).

## Testing
Serve `dist` at `/runouts` and `apps/bridge` at `/bridge` (the pilots), block Supabase, choose SAME DEVICE, and
click a mode's chip under the room. `npm test` runs the unit tests; `npm run build` must pass.
