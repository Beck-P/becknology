"""Furniture for the homes you buy — every piece, rendered as a sprite sheet.

  BVENV/bin/python tools/bridge-art/furniture_sprites.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/furniture

Each piece is built with the scene kits' own builders (so it matches the
rooms) in its own cell of a floorless scene, and rendered in the scenes'
camera, light and post. The script also writes assets/furniture.json: id,
name, price, footprint (tiles wide x deep), whether you can walk on it
(rugs), its cell, and how tall to cut it — js/home.js reads it to cut the
sprites out and to place pieces in a home.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from scenekit import Kit  # noqa: E402
import assets_lumar as A  # noqa: E402
import assets_ship as P   # noqa: E402
import assets_cyber as Y  # noqa: E402
import assets_deck as D   # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CW, CH, PER_ROW = 3, 4, 9                   # each piece gets a 3 x 4 tile cell, nine to a row

# id, name, price, (w, d) footprint in tiles, tall (tiles to cut above the footprint), walkable, builder(x0, r0)
PIECES = [
    ('oak_table', 'Oak Table', 60, (1, 1), 1.4, False, lambda x, r: A.round_table(k, x + 0.5, r + 0.5)),
    ('stool', 'Stool', 15, (1, 1), 1.2, False, lambda x, r: A.stool(k, x + 0.5, r + 0.5)),
    ('armchair', 'Armchair', 80, (1, 1), 1.6, False, lambda x, r: A.armchair(k, x + 0.5, r + 0.5)),
    ('rocking_chair', 'Rocking Chair', 70, (1, 1), 1.6, False, lambda x, r: A.rocking_chair(k, x + 0.5, r + 0.5)),
    ('bench', 'Bench', 50, (2, 1), 1.3, False, lambda x, r: A.bench(k, x + 0.15, x + 1.85, r + 0.5)),
    ('bed', 'Bed', 200, (1, 2), 1.6, False, lambda x, r: A.bed(k, x + 0.05, x + 0.95, r + 0.05, r + 1.95)),
    ('nightstand', 'Nightstand', 40, (1, 1), 1.5, False, lambda x, r: A.nightstand(k, x + 0.5, r + 0.5)),
    ('wardrobe', 'Wardrobe', 150, (2, 1), 2.4, False, lambda x, r: A.wardrobe(k, x + 0.15, x + 1.85, r + 0.4)),
    ('bookshelf', 'Bookshelf', 120, (2, 1), 2.8, False, lambda x, r: A.bookshelf(k, x + 0.1, x + 1.9, r + 0.45)),
    ('clock', 'Grandfather Clock', 180, (1, 1), 2.8, False, lambda x, r: A.grandfather_clock(k, x + 0.5, r + 0.3)),
    ('barrel', 'Barrel', 20, (1, 1), 1.4, False, lambda x, r: A.barrel(k, x + 0.5, r + 0.5)),
    ('crate', 'Crate', 15, (1, 1), 1.2, False, lambda x, r: A.crate(k, x + 0.2, r + 0.2)),
    ('trunk', 'Old Trunk', 60, (1, 1), 1.2, False, lambda x, r: A.trunk(k, x + 0.1, r + 0.25)),
    ('potted_plant', 'Potted Plant', 30, (1, 1), 1.6, False, lambda x, r: A.potted_plant(k, x + 0.5, r + 0.5)),
    ('cat', 'Cat', 100, (1, 1), 1.0, False, lambda x, r: A.cat(k, x + 0.5, r + 0.5, col='#c88a4a')),
    ('rug_red', 'Red Rug', 90, (2, 2), 0.3, True, lambda x, r: A.rug(k, x + 0.1, r + 0.1, x + 1.9, r + 1.9, pattern=True)),
    ('rug_blue', 'Blue Rug', 120, (3, 2), 0.3, True, lambda x, r: A.rug(k, x + 0.1, r + 0.1, x + 2.9, r + 1.9, col='#2a4a7a', trim='#c8a050', pattern=True)),
    ('sofa', 'Sofa', 220, (2, 1), 1.5, False, lambda x, r: P.sofa(k, x + 0.1, x + 1.9, r + 0.5)),
    ('coffee_table', 'Coffee Table', 70, (1, 1), 1.0, False, lambda x, r: P.coffee_table(k, x + 0.5, r + 0.5)),
    ('pouf', 'Pouf', 30, (1, 1), 1.0, False, lambda x, r: P.pouf(k, x + 0.5, r + 0.5)),
    ('floor_lamp', 'Floor Lamp', 60, (1, 1), 2.2, False, lambda x, r: standing_lamp(x + 0.5, r + 0.5)),
    ('crystal_lamp', 'Crystal Lamp', 110, (1, 1), 2.0, False, lambda x, r: P.crystal_lamp(k, x + 0.5, r + 0.5)),
    ('houseplant', 'Houseplant', 40, (1, 1), 1.8, False, lambda x, r: P.houseplant(k, x + 0.5, r + 0.5, 0.0)),
    ('bonsai', 'Bonsai', 90, (1, 1), 1.6, False, lambda x, r: P.bonsai(k, x + 0.5, r + 0.5, 0.0)),
    ('nebula_tank', 'Nebula Tank', 300, (1, 1), 2.0, False, lambda x, r: P.nebula_tank(k, x + 0.5, r + 0.5, 0.0)),
    ('retro_crt', 'Retro CRT', 120, (1, 1), 1.4, False, lambda x, r: P.retro_crt(k, x + 0.5, r + 0.5, 0.0)),
    ('desk', 'Desk', 150, (2, 1), 1.8, False, lambda x, r: P.desk_station(k, x + 0.1, x + 1.9, r + 0.2)),
    ('chess_table', 'Chess Table', 160, (1, 1), 1.4, False, lambda x, r: P.chess_table(k, x + 0.5, r + 0.5)),
    ('arcade_cabinet', 'Arcade Cabinet', 400, (1, 1), 2.6, False, lambda x, r: Y.arcade_cabinet(k, x + 0.5, r + 0.25, art='asteroids')),
    ('neon_stool', 'Neon Stool', 40, (1, 1), 1.2, False, lambda x, r: Y.neon_stool(k, x + 0.5, r + 0.5)),
    ('cafe_table', 'Cafe Table', 70, (1, 1), 1.4, False, lambda x, r: Y.cafe_table(k, x + 0.5, r + 0.5)),
    ('lucky_cat', 'Lucky Cat', 80, (1, 1), 1.4, False, lambda x, r: Y.maneki_neko(k, x + 0.5, r + 0.5, s=0.8)),
    ('wingback', 'Wingback Chair', 150, (1, 1), 1.8, False, lambda x, r: D.wingback(k, x + 0.5, r + 0.5)),
    ('orrery', 'Brass Orrery', 300, (1, 1), 1.8, False, lambda x, r: D.orrery(k, x + 0.5, r + 0.5, 0.0)),
    ('lemon_tree', 'Lemon Tree', 120, (1, 1), 2.2, False, lambda x, r: D.lemon_tree(k, x + 0.5, r + 0.5, 0.0)),
    ('telescope', 'Telescope', 200, (1, 1), 2.2, False, lambda x, r: D.tripod_telescope(k, x + 0.5, r + 0.5)),
]

def standing_lamp(cx, cr):
    k.cyl(cx, cr, 0.0, 0.06, 0.18, (P.BRASS_D, 0.2), 'lamp_base', verts=12)
    k.cyl(cx, cr, 0.06, 1.4, 0.035, (P.BRASS, 0.2), 'lamp_pole', verts=8)
    k.cone(cx, cr, 1.3, 1.62, 0.26, 0.15, ('#e8d8b0', 0.05), 'lamp_shade', emit=('#c09040', 0.45), verts=16)
    k.point_light(cx, cr + 0.1, 1.3, '#ffc880', 14, radius=0.12)


rows = math.ceil(len(PIECES) / PER_ROW)
k = Kit(PER_ROW * CW, rows * CH, margin_top=0.0, margin_bottom=0.0, seed=21)
manifest = []
for i, (pid, name, price, (w, d), tall, walk, build) in enumerate(PIECES):
    ci, cj = i % PER_ROW, i // PER_ROW
    x0, r0 = ci * CW, cj * CH + (CH - d)          # the footprint sits at the bottom of its cell
    build(x0, r0)
    manifest.append({'id': pid, 'name': name, 'price': price, 'w': w, 'd': d, 'tall': tall, 'walk': walk, 'x': x0, 'y': r0})

# an even, warm room light from high up-left, like the key in the rooms: each piece lit the same wherever it sits on the sheet
for cj in range(rows):
    for ci in range(PER_ROW):
        k.point_light(ci * CW + 0.6, cj * CH + CH - 1.6, 3.2, '#fff0dc', 60, radius=0.6)
k.render(OUT, light_states={'full': {}}, light_samples=64, world_light=('#a0a0b0', 0.9))
open(os.path.join(ROOT, 'apps', 'bridge', 'assets', 'furniture.json'), 'w').write(json.dumps({'pieces': manifest}, indent=1) + '\n')
print('furniture', len(manifest))
