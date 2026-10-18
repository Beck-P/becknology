"""The Hawker Hall — the Undercity's food hall, through the gold gate on the Warrens' north side (Blender scene).

  BVENV/bin/python tools/bridge-art/scenes/arcadia_hawker.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-hawker

A hall the size of a station concourse, stalls all along its back wall and a second row of them back to back down the
middle, each under its own tarp and sign, steam rising off them all; rows of long steel tables and benches in front,
pillars holding up the dark, lanterns strung between them, a drinks fridge humming, bins overflowing, a cat. Warm light
in the cold city. World: arcadia-hawker, 40 x 24.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world  # noqa: E402
import assets_under as U             # noqa: E402
import assets_cyber as Y             # noqa: E402
import assets_district as D          # noqa: E402
import assets_backs as B             # noqa: E402
import assets_signs as S             # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-hawker'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 40, 24
R0, R1 = 3.0, 22.0                   # the back wall's face; the front wall
H = 4.6

k = Kit(COLS, ROWS, margin_top=0.6, margin_bottom=0.5, seed=7171)
dr = U.Drips()
rng = k.rng
U.room(k, dr, 0.5, R0, COLS - 0.5, R1, H, door=(18.0, 22.0), floor='tile', wall='#3a2c28', clad='tile', rng=rng,
       tones=('#4a4038', '#443a34'))
S.letters(k, 'HAWKER HALL', 'RussoOne', 20.0, R0 + 0.02, 3.55, size=0.6, col='#ffcf60', energy=16)
S.letters(k, '屋台村', 'DelaGothicOne', 20.0, R0 + 0.02, 3.05, size=0.38, col='#ff6040', energy=6)

# ---- the stalls: nine along the back wall, five back to back down the middle --------------------------------------------
BACK = [('noodle', '麺 NOODLES', 'NOODLE STALL'), ('dumplings', '点心', 'DUMPLING STALL'), ('skewers', 'SATAY', 'SKEWER STALL'),
        ('noodle', 'LAKSA', 'CURRY STALL'), ('tea', 'KOPI', 'TEA STALL'), ('skewers', '叉烧 GRILL', 'GRILL STALL'),
        ('noodle', '粥 CONGEE', 'HAWKER STALL'), ('drinks', 'DRINKS', 'DRINKS STALL'), ('dumplings', '包子', 'DUMPLING STALL')]
stalls = []
for i, (kind, name, label) in enumerate(BACK):
    x0 = 1.2 + i * 4.2
    U.stall(k, dr, x0, x0 + 3.8, R0, kind=kind, rng=rng, name=name, depth=1.4)
    stalls.append((int(x0 + 1.9), int(R0), label))
MID = [('noodle', 'RAMEN', 'NOODLE STALL'), ('skewers', '串焼', 'SKEWER STALL'), ('tea', '茶', 'TEA STALL'),
       ('dumplings', 'BAO', 'DUMPLING STALL'), ('noodle', 'PHO', 'HAWKER STALL')]
RM = 9.4
k.box(8.0, RM - 0.6, 0, 32.0, RM + 0.02, 2.5, ('#2a2830', 0.08), 'stall_spine')        # their shared back
for i, (kind, name, label) in enumerate(MID):
    x0 = 8.2 + i * 4.75
    U.stall(k, dr, x0, x0 + 4.4, RM, kind=kind, rng=rng, name=name, depth=1.4)
    stalls.append((int(x0 + 2.2), int(RM), label))
k.solid(8.0, RM - 0.6, 32.0, RM)
for x in (8.6, 31.4):                                                          # signs on the spine's ends
    S.blade(k, '美食', 'DelaGothicOne', x, RM - 0.62, 1.2, 1.2, col='#ffcf60', w=0.4, stand=0.0)

# ---- the tables, the pillars, the lanterns -------------------------------------------------------------------------------
for (cx, cr) in ((4.5, 14.6), (11.0, 14.6), (29.0, 14.6), (35.5, 14.6), (4.5, 18.6), (11.0, 18.6), (17.0, 16.6), (23.0, 16.6),
                 (29.0, 18.6), (35.5, 18.6)):
    U.long_table(k, cx, cr, w=3.6, rng=rng, cloth=rng.choice(('#7a7a82', '#6a6a72', '#8a6a3a')))
for (cx, cr) in ((7.8, 7.6), (32.2, 7.6), (14.0, 16.8), (26.0, 16.8), (7.8, 21.2), (32.2, 21.2)):
    U.pillar(k, cx, cr, h=H + 0.3, rng=rng)
for row in (12.0, 20.4):
    D.cable(k, (1.0, row, 3.6), (39.0, row, 3.6), sag=0.6, n=26)
    for x in [2.0 + i * 2.4 for i in range(16)]:
        t = (x - 1.0) / 38.0
        top = 3.6 - 0.6 * 4 * t * (1 - t)
        Y.paper_lantern(k, x, row, top - 0.5, col=rng.choice(('#e03030', '#e03030', '#f0a030')), s=0.32, top=top)
for (x, r) in ((10.0, 6.6), (20.0, 6.4), (30.0, 6.6), (6.0, 11.4), (20.0, 12.8), (34.0, 11.4), (8.0, 17.0), (20.0, 19.6), (32.0, 17.0)):
    U.fluoro(k, dr, x, r, 3.3, w=1.3, hang=H + 0.5, energy=22, dead=rng.random() < 0.1)

# small life: bins overflowing, a tray rack, a cat, a drinks fridge, a mop bucket, crates of greens, a shrine on a shelf
for (x, r) in ((2.0, 21.2), (38.0, 21.2), (16.0, 12.6), (24.0, 12.6)):
    Y.trash_can(k, x, r)
    D.trash_pile(k, x + 0.6, r + 0.1, rng=rng)
k.box(37.6, 7.8, 0.0, 38.8, 8.6, 1.9, ('#c8c8d0', 0.06), 'fridge')
k.box(37.64, 8.6, 0.12, 38.76, 8.62, 1.8, '#0c2030', 'fridge_glass', emit=('#80d0ff', 0.45))
for j in range(4):
    for i in range(4):
        k.cyl(37.8 + i * 0.27, 8.45, 0.2 + j * 0.42, 0.42 + j * 0.42, 0.05, rng.choice(('#e84040', '#40c080', '#e8c040', '#4080e0')), 'can', verts=6)
k.solid(37.6, 7.8, 38.8, 8.6)
B.crate_stack(k, 1.0, 7.4, n=3)
B.cabbage_crate(k, 1.6, 9.0)
B.cabbage_crate(k, 2.3, 9.4)
k.solid(0.9, 7.2, 2.8, 9.8)
B.cat(k, 16.6, 20.4, 0.0)
k.cyl(36.2, 12.4, 0.0, 0.35, 0.2, ('#e8c040', 0.08), 'mop_bucket', verts=10)
k.tube((36.2, 12.4, 0.3), (36.5, 12.2, 1.4), 0.02, '#8a6a3a', 'mop', verts=4)
k.solid(36.0, 12.2, 36.4, 12.6)
k.box(19.2, R0 + 0.02, 2.1, 20.8, R0 + 0.4, 2.14, '#4a2a18', 'shrine_shelf')                  # a kitchen god on a shelf
k.box(19.6, R0 + 0.1, 2.14, 20.4, R0 + 0.35, 2.5, '#8a1a10', 'shrine_box')
k.sphere(20.0, R0 + 0.3, 2.3, 0.05, 0.05, '#ff6020', 'shrine_candle', emit=('#ffa040', 1.0), segs=6)
U.puddles(k, 2, 11, 38, 21, 4, ('#ffb060', '#e0a040'), rng=rng)

# ---- light: warm; the stalls' own lamps, the lanterns, the room's glow ------------------------------------------------------
k.area_light(20, 14, 7.0, '#ffb070', 120, 30.0, rot=(math.radians(30), 0, 0))
k.point_light(20, 4.4, 3.0, '#ffcf60', 40, radius=0.5, group='flicker')
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.82}}, light_samples=96, world_light=('#3a2a24', 0.9))

# ---- the world ---------------------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Hawker Hall', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [19, 21]}, 'shipExit': False, 'interior': True})
w['interactions'] = [
    {'x': x, 'y': 22, 'type': 'leave_world', 'label': 'THE WARRENS', 'prompt': 'PRESS E TO GO OUT', 'leaveTo': 'arcadia-undercity', 'leaveSpawn': [16, 10]}
    for x in (18, 19, 20, 21)] + [
    {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': 'PRESS E TO ORDER', 'dialog': 'FOOD.'} for (x, y, label) in stalls] + [
    {'x': 20, 'y': 3, 'type': 'dialog', 'label': 'KITCHEN GOD', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A LITTLE RED SHRINE ON A SHELF OVER THE STALLS: A KITCHEN GOD, AN ORANGE, A CANDLE THAT SOMEBODY KEEPS LIT. THE WHOLE HALL COOKS UNDER HIS EYE.'},
    {'x': 16, 'y': 20, 'type': 'dialog', 'label': 'CAT', 'prompt': 'PRESS E TO PET',
     'dialog': 'A FAT GINGER CAT ASLEEP UNDER A TABLE, A FISH BONE BESIDE IT. IT HAS EATEN BETTER THAN YOU TODAY.'},
    {'x': 38, 'y': 8, 'type': 'dialog', 'label': 'DRINKS FRIDGE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A FRIDGE OF CANS: LYCHEE, CHRYSANTHEMUM, SOMETHING CALLED "POWER GRAPE". A HANDWRITTEN SIGN: PAY THE STALL, NOT THE FRIDGE.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
COOKS = []
for i, (x, y, label) in enumerate(stalls):
    if i % 2 == 0 or i >= 9:
        COOKS.append({'sheet': ('npc-hawker-a', 'npc-hawker-b')[(i // 2) % 2], 'x': x, 'y': y, 'facing': 'down'})
apply_world(WORLD, k, (1, int(R0) + 1, COLS - 2, int(R1) - 1), doors=[(18, 22), (19, 22), (20, 22), (21, 22)],
            scene_id=WID, actors=COOKS)
w = json.load(open(WORLD))
w['view'] = [0.0, 0.0, COLS, ROWS + 0.5]
w['undercity'] = {'drips': dr.drips, 'tubes': dr.tubes, 'level': 'undercity'}
w['scene']['steam'] = dr.steam
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('hawker hall done', len(k.parts), 'parts')
