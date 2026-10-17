# bridge-art — the house style, in brief

Everything here makes art for the Bridge game (`apps/bridge`). **Read `apps/bridge/CLAUDE.md` first** — *North star*,
*Live light*, *Making a new place* and the detail standard are the rules; this is the short version so nobody builds in
the old style by accident.

**The look (Beck's pick, Look Book 2, Oct 2026): our own little 3D model world, finished like toys, in soft light.**
Look at the target before you build: `dioramas/ref/*.png` are the Look Book's five places and the richer village in the
toy finish at noon, golden hour and night (`verdance_toy_12.5_summer.png` is Millpond Farm). A place you build or
rebuild should stand next to those and look like it belongs.

- **Every render gets the toy finish** (`scene_post.py`, default) and, if the place has a day (`cycle=` in `k.render`),
  **live light** (`scenekit.py` renders the passes, `apps/bridge/js/litscene.js` relights them). Don't turn either off.
- **A re-render is not a rebuild.** Re-running a scene script gives the new finish and light on the same models. When
  asked to make a place look like the Look Book, *rebuild* it: shape the land (terraces, banks, a pond sunk into the
  ground with reedy, pebbly edges — never a circle in a field), layer the vegetation, use the richer house kit
  (`assets_house.py`: `HK.rich_house` takes `assets_town.house`'s arguments; `HK.install()` swaps it in for a whole
  script), and add small life at the human scale. The scripts in `dioramas/` show how.
- **Rebuilding a place that's in the game:** keep its world working — every interaction, door, spawn, NPC actor and
  quest label where the game expects it (or moved on purpose), walkable where people walk; run
  `python3 tools/bridge-art/audit_worlds.py` and `node tools/tests/run.js world` before shipping.
- **Name parts by what they are** (`floor_*`, `path`, `grass`, `cobble`, `pond_water`, `roof_*`): the finish draws no
  lines inside the ground or between a roof's shingles, and still water gets the Look Book water, by name.
- **Look at it before it ships:** the render at 2×, then in the game at dawn, noon, golden hour and night and in each
  season (`BridgeLit._force({ hour, season, weather })` in the console or a test), next to the reference images.
- People: painted faces come from `characters.py` + `sprites_post.py`; talk portraits from `portraits.py` (re-run
  `python3 tools/bridge-art/portraits.py npc-<name>` for a new NPC).
