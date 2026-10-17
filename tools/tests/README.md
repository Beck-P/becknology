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
| `world` | `errs.js`: every world in `apps/bridge/assets/worlds` loads with no page errors, console errors or missing files. `gpu.js`: the glow on the graphics card (js/gpu.js) runs where it should, falls back on a lost context, stays off on software graphics unless `?gpu=1`. `routines.js`: the cast's days (js/routines.js) — every routine's spots and walks checked, at work while their shop's open, walking between stops and stopping beside you, visitors you can talk to, the Map knowing where they are. `festivals.js`: the festivals (js/festivals.js) — every festival's props and crowd checked, the calendar, the Harvest Fair's show and Lantern Tide's derby paying a placing once, the stalls, a paper lantern on the tide. `events.js`: small happenings (js/events.js) — every one forced in its own place and shot (`shots/event_*.png`), what you can do at each (a sale, a bid, a bet, a slice of cake, a hen caught, the post, the snowball fight, the stag's blessing), the schedule the same on two pages, a day's spread in each place, everyone's spots and walks on open ground. `actors.js`: who's drawn where in each. `clock.js`, `weather.js`, `business.js`, `legacy.js`, `hands.js`: the living worlds (time, weather, businesses and their stock, the long goals, the farm hands working while you're away). `staff.js`: the people who work for you — faces and perks in the hiring lists, ship's hands on the payroll, the ledger's Staff & payroll page, the captain's desk. `office.js`: the captain's office aboard — through its door off the bridge, the staff board (faces and lamps), the chart table's pins and orders, the accounts, the captain's chair and the windows. `aquarium.js`: fish tanks — bought in a home's furnishing shop and from the Chandler, put down at home, aboard and in Arcadia, fish in from the pack and a ship's hold, one out, looking into the tank (desktop and phone), still there after a reload, a partner visiting sees it and slips a fish in. `workshop.js`: the Workshop on your holm — built on its lot, materials from pack, store and a hold, your bench and a hired smith on the clock, plans bought and taught, a gun you made fitted by a harbourmaster, the ledger. `title.js`: the title page — the ship over the planet it's parked at by that planet's clock, Continue, a new pilot, signing in, the boarding zoom, desktop and phone. `landings.js`: the pad you land on in each place. `arrive.js`: sailing into a harbour. |
| `multi` | two pilots (Beck and Alyssa) on the fake Supabase: seeing each other, walking, presence and away, gifts and trades, partners, shared clues, fighting together, health, sailing together, boats at sea, the players pill at sea, a sea fight together. |
| `together` | every game played together (js/together.js): cabinets, helicopter, Fell Dice and Bones, chess, the dance floor, pachinko, Splice, the cipher room, the typist; the edges (a "not now", a watcher, a partner vanishing, someone elsewhere coming over); the games alone; table chat (desktop and phone). |
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
