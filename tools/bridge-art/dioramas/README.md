# Reference dioramas

Five small places built for Look Book 2 (October 2026) in the game's own Blender kit — the standard Beck signed off
for the Bridge's look going forward ("swing larger… still in our 3D style… less boxy and thrown together"). They aren't
worlds in the game; they're what a new place should feel like up close. Read one before building a new place.

| Script | What it shows |
| --- | --- |
| `millpond_farm.py` | Verdance: a stone terrace with the farmhouse on top (`assets_house.rich_house`), a stream dropping over the wall into a pond sunk into the meadow, muddy pebbly banks, rows of crops, reeds and lilies, a jetty and a rowboat, beehives |
| `lantern_quay.py` | Lumar by night: tall jettied harbour houses, a quay of dressed stone, boats, nets, lanterns |
| `hoarfell_tarn.py` | Hoarfell: a frozen tarn under a shaped mountainside, firs heavy with snow, chalets, a sled and a snowman |
| `sylvara_brook.py` | Sylvara: ancient trees whose canopies close over the view, flared roots, a brook over stones, leaf lanterns |
| `arcadia_rainline.py` | Arcadia: five storefronts with stacked floors over a wet street, real-typeface neon |

What they have in common (the detail standard in `apps/bridge/CLAUDE.md`): the land has shape (a heightfield, terraces,
banks that slope into water — never a flat board), vegetation in layers (turf, tufts, flowers, shrubs, trees), buildings
from the richer house kit (`assets_house.py`: roofs by material with eaves and rafter ends, jetties, porches, framed
windows with shutters and flower boxes, plinths and quoins), and small life at the human scale everywhere.

**What they look like** — `ref/`: each place (and the richer village street) as Look Book 2 showed it in the toy
finish with soft light, at noon in summer, golden hour in autumn and night in winter (`verdance` is Millpond Farm,
`lumar` Lantern Quay, `hoarfell` the tarn, `sylvara` Elderglade Brook, `arcadia` Rainline Street, `village-richer`
Brambleford's street rebuilt with `assets_house.py`). This is the bar for any place built or rebuilt.

Run one like any scene, with live light for anywhere with a day:

    SCENE_CYCLE=day BVENV/bin/python tools/bridge-art/dioramas/millpond_farm.py /tmp/millpond
    python3 tools/bridge-art/scene_post.py /tmp/millpond /tmp/millpond/post
