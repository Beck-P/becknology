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
- **Reuse the Look Book's own pieces; don't reinvent them.** The engine draws a Look Book place exactly as the Look
  Book did (Oct 2026: Millpond Farm put through the game beside its reference — same light, shadows, water, colours at
  noon, golden hour and night). So when a rebuild looks plainer than the reference, the difference is in the scene
  script. Start from the diorama closest to your place and lift its builders as they are — the land
  (`millpond_farm.py`'s terrace and pond heightfields and banks, `hoarfell_tarn.py`'s tarn and rock, `sylvara_brook.py`'s
  ground, brook, ancient trunks, crowns, ferns, boulders, litter), the buildings (`assets_house.py`;
  `lantern_quay.py`'s `harbour_house`, `coursed`, `framing`, `shop_window`; `hoarfell_tarn.py`'s `gable_chalet`), the
  water (`pond_water` / `stream_water`, a fall named `waterfall`, foam, lilies, reeds) and the small life — then move
  them to your map's layout. Copy into your script or kit; don't hand-write a simpler version of something a diorama
  already does well.
- **Compare it in the game, beside the reference:** `node tools/tests/world/vsref.js <world> <ref> [x0,y0,x1,y1] [x,y]`
  shoots your place live at noon/summer, golden hour/autumn and night/winter, through the glow and the vignette, and
  writes each beside the Look Book's (`ref` is the start of a reference's name: `verdance`, `lumar`, `hoarfell`,
  `sylvara`, `arcadia`, `village-richer`). Show Beck those pairs, at full samples — not a low-sample preview.
- **A re-render is not a rebuild.** Re-running a scene script gives the new finish and light on the same models. When
  asked to make a place look like the Look Book, *rebuild* it: shape the land (terraces, banks, a pond sunk into the
  ground with reedy, pebbly edges — never a circle in a field), layer the vegetation, use the richer house kit
  (`assets_house.py`: `HK.rich_house` takes `assets_town.house`'s arguments; `HK.install()` swaps it in for a whole
  script), and add small life at the human scale. The scripts in `dioramas/` show how.
- **Rebuilding a place that's in the game:** keep its world working — every interaction, door, spawn, NPC actor and
  quest label where the game expects it (or moved on purpose), walkable where people walk; run
  `python3 tools/bridge-art/audit_worlds.py` and `node tools/tests/run.js world` before shipping.
- **Name parts by what they are** (`floor_*`, `path`, `grass`, `cobble`, `pond_water`, `roof_*`): the finish draws no
  lines inside the ground or between a roof's shingles, still water gets the Look Book water (`Kit.WATER_PARTS`: ponds,
  streams, basins, wells, troughs), and a fall (`waterfall`, `falls`, `cascade`, `weir`) runs with light and churns foam
  where it lands, by name.
- **Look at it before it ships:** the render at 2×, then in the game at dawn, noon, golden hour and night and in each
  season (`BridgeLit._force({ hour, season, weather })` in the console or a test), next to the reference images.
- People: painted faces come from `characters.py` + `sprites_post.py`; talk portraits are **drawn** by `portraits.py`
  (2D, no Blender — Beck's pick of the Stardew style; the old Blender-rendered portraits are gone). After adding or
  changing anyone in characters.py run `python3 tools/bridge-art/portraits.py stale --look /tmp/faces.png` (it draws
  just what's missing or out of date) and look at the sheet. Every file is stamped with what it was drawn from;
  `portraits.py check` lists any that aren't current, `world/portraits.js` fails on them and the project's Claude Code
  hook (`.claude/hooks/portraits.py`) stops a commit or push until they're drawn. Never hand-edit or copy one in.
