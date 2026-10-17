# Browser tests

Headless-Chromium tests for the Bridge and Royale Link, driven by Playwright. They're how changes get checked
before they ship: every world loading, two pilots playing together over a stand-in for Supabase, every game
played together, the Neon Royale's tables, combat.

```sh
node tools/tests/run.js                 # everything (~40 min)
node tools/tests/run.js world royale    # just those suites
```

`run.js` starts what it needs if it isn't already running: `serve.py` (the repo on :8766 with `vercel.json`'s
rewrites, `/runouts` from `apps/runouts/dist`) and `fakesupa.py` (:8767). It fetches the chess CDN modules into
`npm/` the first time (`npm.sh`), and stops the servers it started when it's done.

Working in a second checkout (a git worktree) alongside another: `BRIDGE_PORT=8771 node tools/tests/run.js world` serves
*that* checkout on :8771 and answers every test page's `127.0.0.1:8766` requests from it (`chrome.js`: files straight
from that checkout's disk, through `vercel.json`'s rewrites as `serve.py` does; anything else fetched from :8771), so the
two don't test each other's files; a page the tests send to :8766 is sent to that port itself (`chrome.js`), so it's
served there natively. `SUPA_PORT=8777` does the same for the Supabase stand-in (`run.js` starts `fakesupa.py` there and
every page is told it), so two checkouts can run the `multi` and `together` suites at once without resetting each
other's. `run.js` loads `chrome.js` ahead of each test (`node -r`; it also catches a browser
launched before it ran). One test alone: `python3 tools/tests/serve.py 8771 &` then
`BRIDGE_PORT=8771 NODE_PATH=$(npm root -g) node -r ./tools/tests/chrome.js tools/tests/<suite>/<file>.js`. (Within one checkout the `multi` suites share its Supabase stand-in: run one at a time; a second checkout
uses its own `SUPA_PORT`.)

## What you need

- Node with Playwright (`npm i -g playwright`); `run.js` adds `npm root -g` to `NODE_PATH`.
- Chromium: `$CHROME`, else the one pre-installed in Claude Code's cloud containers (`chrome.js`), else Playwright's.
- Python 3 for the two servers.
- For `royale`: Royale Link built (`cd apps/runouts && npm install && npm run build`).

## Suites

| suite | what it checks |
|---|---|
| `world` | `errs.js`: every world in `apps/bridge/assets/worlds` loads with no page errors, console errors or missing files. `gpu.js`: the glow on the graphics card (js/gpu.js) runs where it should, falls back on a lost context, stays off on software graphics unless `?gpu=1`. `crowd.js`: passers-by (js/crowd.js) — people out in every place with a crowd and nobody where it's meant to be lonely, the same crowd on two pages, nobody in a wall or two on a seat, walking through them, talking to one, a gathering and a fright, umbrellas in the rain, fewer on a phone. `routines.js`: the cast's days (js/routines.js) — every routine's spots and walks checked, at work while their shop's open, walking between stops and stopping beside you, visitors you can talk to, the Map knowing where they are. `festivals.js`: the festivals (js/festivals.js) — every festival's props and crowd checked, the calendar, the Harvest Fair's show and Lantern Tide's derby paying a placing once, the stalls, a paper lantern on the tide. `events.js`: small happenings (js/events.js) — every one forced in its own place and shot (`shots/event_*.png`), what you can do at each (a sale, a bid, a bet, a slice of cake, a hen caught, the post, the snowball fight, the stag's blessing), the schedule the same on two pages, a day's spread in each place, everyone's spots and walks on open ground. `dungeon.js`: the Undercroft (js/dungeon.js) — the hall and its board, tonight's floors the same for everyone and never walled off, chests, traps, the guardian sealing every fifth stair, coming round in the hall, a new crypt tomorrow (stand-in rooms from the Rose Mine until its own are rendered). `actors.js`: who's drawn where in each. `clock.js`, `weather.js`, `business.js`, `legacy.js`, `hands.js`: the living worlds (time, weather, businesses and their stock, the long goals, the farm hands working while you're away). `homes.js`: the legacy homes — buys the Penthouse and Ashcombe House and builds the Starling, walks every room and the roof deck, furnishes each, the doors both ways, the Starling's staff at their posts, screenshots by night and day. `staff.js`: the people who work for you — faces and perks in the hiring lists, ship's hands on the payroll, the ledger's Staff & payroll page, the captain's desk. `office.js`: the captain's office aboard — through its door off the bridge, the staff board (faces and lamps), the chart table's pins and orders, the accounts, the captain's chair and the windows. `empire.js`: running it from the office — captains hired onto ships, a trade loop and a supply run on the clock across a reload eight hours later, the treasury, the morning dispatch (seeded, its choices changing what captains do), the desk, the chart's route lines, the workshop book, the treasury's graphs, on a desktop and a phone. `aquarium.js`: fish tanks — bought in a home's furnishing shop and from the Chandler, put down at home, aboard and in Arcadia, fish in from the pack and a ship's hold, one out, looking into the tank (desktop and phone), still there after a reload, a partner visiting sees it and slips a fish in. `workshop.js`: the Workshop on your holm — built on its lot, materials from pack, store and a hold, your bench and a hired smith on the clock, plans bought and taught, a gun you made fitted by a harbourmaster, the ledger. `sea.js`: the other ships out on the water — the routes clear of land and harbour mouths, the same ships at the same moment whichever island you cast off from, no traders on the Crimson or the Midnight Sea, everyone keeping clear of you and each other; shots of a crowded calm sea, a navy patrol, a trawler on her ground, a privateer and a Crimson pirate by night and by day (`shots/sea_*.png`), and every island's pier with the sloop at her size. `shipyard.js`: your own slipway — built on the holm, a hull plan bought at a yard, a keel laid and named, materials put in stage by stage, a shipwright hired, time skipped to the launch, her colours, a part fitted and a ship repainted for nothing, the ledger. `trophies.js`: the hall of finds — what counts as found (the Undercroft's relics, your pack), built from its lot on the holm, every spot's plate inside (a find by name with when, an empty one saying where to look), a find made elsewhere showing up on its plinth. `title.js`: the title page — the ship over the planet it's parked at by that planet's clock, Continue, a new pilot, signing in, the boarding zoom, desktop and phone. `landings.js`: the pad you land on in each place. `arrive.js`: sailing into a harbour. `regatta.js`: the Emerald Regatta — when it sails, the harbour book's row, postponed in a storm, entering at Crownhaven, a short course raced against the fleet (the gun, a mark, the line, your placing), what a placing pays. |
| `multi` | two pilots (Beck and Alyssa) on the fake Supabase: seeing each other, walking, presence and away, gifts and trades, partners, shared clues, fighting together, health, sailing together, boats at sea, the players pill at sea, a sea fight together, a party (`mp_party.js`: an invite, up to the ship and aboard each other's, a jump together, casting off together, the mine). |
| `together` | every game played together (js/together.js): cabinets, helicopter, Fell Dice and Bones, chess, the dance floor, pachinko, Splice, the cipher room, the typist; races (`t_race_ski.js`, `t_race_climb.js`, `t_race_sail.js`: two pilots at the start, the gun when both are in it, each seeing the other, the verdict and the pot; `t_race_sail.js party` with the two in a party, each still in her own sloop); the edges (a "not now", a watcher, a partner vanishing, someone elsewhere coming over); the games alone; table chat (desktop and phone). |
| `royale` | every Neon Royale table opens its Royale Link game; coins staked and paid through the Bridge (Esc mid-round, a page closed with chips out); typing an exact hold'em bet (desktop and phone). |
| `combat` | every weapon's swings land and do what they say (`hits.js`); a fight, blacking out and waking; a sea fight; ships as fitted (`shipviz.js`: guns and fittings on every hull at each heading — Lumar's night; `AT=2026-10-16T12:00` for its day — a broadside's flashes, smoke, shots, splashes and hits filmed frame by frame, the harbourmaster's portraits). `energy.js`: what a roll, each class's charged blow and a bolt cost, the second wind (three quarters back after a breath, none while you keep swinging, none for energy spent off the fight). `look.js`: each moment of a fight shot off the canvas (`shots/look/look_*.png`: a wind-up's marks, a slam, a wisp's bolt, a hit, embers, a bite on you, loot, the staff's bolt, the warden's toll), failing on any box the fight draws. |

## Reading the results

Each test prints what it saw. `run.js` marks a test **FAIL** when it crashes or times out, or reports a page error,
a console error or a non-zero error count, and shows the lines that matter under each one. The rest is read by eye:
the lines say things like `coins after 525 475` or `aly heard: …`, and screenshots land in `shots/` and
`<suite>/shots/` (git-ignored). Run one test on its own with `NODE_PATH=$(npm root -g) node tools/tests/<suite>/<file>.js`
(the multi tests take this folder as their first argument; servers must be up).

Known: `mp_seafight`'s swivel damage is random, so its numbers vary run to run.

## Pieces

- `serve.py`, `fakesupa.py` — the servers. `fakesupa.js` — a fake supabase-js injected into the page, talking to
  `fakesupa.py` (tables and a Realtime relay; it can fail tracks, drop presence and kill the channel to test
  reconnects — see the Bridge's CLAUDE.md, *The wire*).
- `mp_lib.js` — a signed-in pilot in a page (`player`), into a world (`enter`), a fresh fake Supabase (`reset`).
- `together/tg_lib.js` — two pilots side by side, the dialog helpers, the CDN stand-ins.
- `autohelm.js` — a helmsman for the sloop (steers at the gold mark, beats up a leg into the wind in tacks, goes about if she's stuck), pressing the arrow keys as a player would: `await p.evaluate(require('../autohelm.js'))`.
