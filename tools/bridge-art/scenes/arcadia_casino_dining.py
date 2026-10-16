"""Aurum — the Neon Royale's restaurant (world id "arcadia-casino-dining"). Usage:
BVENV/bin/python arcadia_casino_dining.py RENDER_DIR

Through the gold door off the casino floor: a dining room in plum and gold with a great window onto the city two
hundred floors down (the live skyline, drawn behind the render's HOLDOUT pane by js/worlds/casino.js), tables for
two in white cloths with a candle each, the open kitchen at the back where Chef Mori works the pass under heat
lamps, the maitre d' at his podium with the menu, a waiter going round with a tray. The menu is a vendor (Aurum's
dishes in js/items.js restore health and energy); the chairs are seats (assets/actions.json).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_casino as C                     # noqa: E402
import assets_cyber as Y                      # noqa: E402
import assets_signs as S                      # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-casino-dining'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 20, 13
H = 4.4
FLOOR = (1, 3, 18, 11)
RB = 3.0

k = Kit(COLS, ROWS, margin_top=1.3, margin_bottom=0.5, seed=8118)
live = C.Live()
rng = k.rng

# ---- the shell --------------------------------------------------------------------------------------------------------------
C.carpet(k, 1.0, RB, 19.0, 12.0, base='#22101c', line=C.GOLD_D, rose='#6a1a3a', dot=C.GOLD, step=1.0)
C.deco_wall(k, 0.4, 6.6, RB, H, mirrors=False, neon='#ffb060', clear=[(1.0, 6.0)])
SKY = C.panorama(k, 6.6, 19.6, RB, 0.85, 3.5, H, step=1.62, neon='#ffb060')
C.side_wall(k, 0.4, 1.0, RB - 0.5, 12.0, H, gaps=[(8.0, 10.0)])
C.side_wall(k, 19.0, 19.6, RB - 0.5, 12.0, H)
k.box(0.4, 12.0, 0, 19.6, 12.6, 0.42, (C.LACQUER, 0.05), 'front_wall')
k.box(0.4, 12.0, 0.42, 19.6, 12.6, 0.47, (C.GOLD, 0.05), 'wall_cap')
k.box(0.4, 11.99, 0.34, 19.6, 12.02, 0.37, shade('#ffb060', 0.45), 'front_neon', emit=('#ffb060', 0.7))
S.letters(k, 'AURUM', 'CinzelDecorative-Bold', 3.7, RB + 0.1, 3.05, size=0.5, col=C.GOLD_L, energy=10)

# ---- the open kitchen ---------------------------------------------------------------------------------------------------------
C.kitchen_pass(k, 1.2, 5.8, RB, depth=2.4)
k.box(1.2, RB, 1.95, 5.8, RB + 0.06, 2.6, ('#8a8e98', 0.04), 'splashback')
for i in range(5):                                             # copper pans on a rail
    x = 1.6 + i * 0.95
    k.tube((x, RB + 0.1, 2.5), (x, RB + 0.1, 2.3), 0.008, '#2a2a30', 'hook', verts=3)
    k.cyl_y(x, RB + 0.08, RB + 0.14, 2.15, 0.16, 0.16, ('#b86a30', 0.06), 'copper_pan', verts=12)
k.box(1.2, RB + 0.12, 2.5, 5.8, RB + 0.16, 2.54, ('#c8ccd4', 0.03), 'pan_rail')

# ---- the tables: for two, by the window and down the room ---------------------------------------------------------------------------
TABLES = [(8.5, 5.55), (12.5, 5.55), (16.5, 5.55), (8.5, 9.55), (12.5, 9.55), (16.5, 9.55)]
for (cx, cr) in TABLES:
    C.dining_table(k, cx, cr, rad=0.48, chairs=((-1, 0), (1, 0)), chair_off=1.0, chair_col=C.OXBLOOD_L)
for (cx, cr) in ((10.5, 8.4), (14.5, 8.4)):
    C.chandelier(k, cx, cr, 3.0, s=0.75, energy=18)
# a champagne bucket by the window table, the dessert trolley by the kitchen
k.cyl(14.5, 4.2, 0.0, 0.7, 0.03, (C.GOLD, 0.05), 'bucket_stand', verts=6)
k.cyl(14.5, 4.2, 0.7, 0.95, 0.14, ('#c8ccd8', 0.03), 'ice_bucket', verts=12)
k.cyl(14.55, 4.15, 0.95, 1.2, 0.04, ('#1a3a1a', 0.06), 'bottle', verts=6)
k.box(6.4, 6.4, 0.0, 7.2, 6.9, 0.9, (C.GOLD_D, 0.05), 'trolley', bevel=0.02)
for i in range(3):
    k.cyl(6.6 + i * 0.22, 6.65, 0.9, 1.0, 0.08, ('#8a3a1a', 0.1), 'cake', verts=10)
    k.cyl(6.6 + i * 0.22, 6.65, 1.0, 1.03, 0.08, ('#f0e0d0', 0.05), 'icing', verts=10)
k.solid(6.4, 6.4, 7.2, 6.9)
# the maitre d's podium by the door, a lamp on it
k.box(2.2, 6.9, 0.0, 2.8, 7.4, 1.1, (C.LACQUER, 0.05), 'podium', bevel=0.02)
k.box(2.15, 6.85, 1.1, 2.85, 7.45, 1.15, (C.GOLD, 0.05), 'podium_top')
k.box(2.3, 6.95, 1.15, 2.7, 7.3, 1.18, ('#3a0a14', 0.08), 'menu_book')
k.cyl(2.7, 7.2, 1.15, 1.45, 0.02, (C.GOLD, 0.05), 'lamp_post', verts=5)
k.cone(2.7, 7.2, 1.42, 1.55, 0.1, 0.04, ('#e8d8a0', 0.05), 'lamp_shade', emit=('#ffd080', 0.5), verts=8)
k.point_light(2.7, 7.4, 1.4, '#ffc070', 6, radius=0.1, group='flicker')
k.solid(2.2, 6.9, 2.8, 7.4)
# plants in brass urns in the corners
for (x, r) in ((18.2, 11.2), (1.8, 11.2), (18.3, 3.6)):
    k.cyl(x, r, 0.0, 0.5, 0.25, (C.GOLD, 0.05), 'urn', verts=12)
    k.blob(x, r, 0.95, 0.35, 0.32, 0.5, ('#2a5a3a', 0.2), 'palm', segs=10)
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)

# ---- light: candlelit, the city behind the glass, warm wall-washers ------------------------------------------------------------------
for (x, r) in ((10.5, 7.5), (14.5, 7.5), (3.5, 9.5), (8.5, 11.0), (16.5, 11.0)):
    k.point_light(x, r, 2.4, '#ffc890', 14, radius=0.6)
k.area_light(13.0, RB + 1.0, 3.6, '#8070c0', 60, 8.0, rot=(math.radians(-50), 0, 0))      # the city's glow through the window
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.78}}, light_samples=128, world_light=('#2a1430', 0.42))

# ---- the world ----------------------------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Aurum', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia', 'spawns': {'player': [2, 8]},
          'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)], 'shipExit': False, 'interior': True})
w['interactions'] = [
    {'x': 1, 'y': y, 'type': 'leave_world', 'leaveTo': 'arcadia-casino', 'leaveSpawn': [41, 21], 'label': 'THE CASINO FLOOR',
     'prompt': 'PRESS E TO GO BACK'} for y in (8, 9)] + [
    {'x': 2, 'y': 7, 'type': 'vendor', 'label': 'THE MENU', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'wagyu_royale', 'price': 45}, {'id': 'gold_leaf_sushi', 'price': 32}, {'id': 'spore_truffle_risotto', 'price': 26},
               {'id': 'souffle_royale', 'price': 18}, {'id': 'champagne', 'price': 22}]},
    {'x': 3, 'y': 7, 'type': 'dialog', 'label': 'LAURENT', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE MAITRE D\' LOOKS AT HIS BOOK, THEN AT YOU.'},
    {'x': 3, 'y': 4, 'type': 'dialog', 'label': 'CHEF MORI', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE CHEF WIPES A PLATE\'S RIM AND SENDS IT.'},
    {'x': 6, 'y': 6, 'type': 'dialog', 'label': 'DESSERT TROLLEY', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THREE CAKES UNDER GLASS: SPORE-CHOCOLATE, A GOLD-LEAF OPERA, AND SOMETHING PINK THAT HUMS FAINTLY.\n\nTHE SOUFFLE IS ON '
               'THE MENU. THE HUMMING ONE IS NOT.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
actors = [{'sheet': 'npc-royale-chef', 'x': 3, 'y': 4, 'facing': 'down'}, {'sheet': 'npc-waiter', 'x': 3, 'y': 7, 'facing': 'left'}]
SIT = [('npc-gambler-a', 7, 5, 'right'), ('npc-gambler-b', 9, 5, 'left'), ('npc-gambler-c', 13, 5, 'left'),
       ('npc-gambler-d', 15, 9, 'right'), ('npc-patron-a', 17, 9, 'left')]
actors += [{'sheet': s, 'x': x, 'y': y, 'facing': f, 'pose': 'sit'} for (s, x, y, f) in SIT]
for a in actors:
    k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
apply_world(WORLD, k, FLOOR, scene_id=WID, actors=actors, scene_extra={'sky': SKY})
w = json.load(open(WORLD))
w['casino'] = {'live': live.dump(), 'floor': 'dining', 'sky': SKY}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('aurum done')
