"""The Cartographer's House (east end of the Market Square).
Usage: BVENV/bin/python lumar_house.py RENDER_DIR

Bookshelves to the ceiling, the map desk with a chart half-inked, a big
painted globe, a brass telescope at the window, a wall map of the sea
routes, and the cartographer's cat asleep on the charts.
"""
import math
import os
import sys
from _lumar_room import A, H, FLOOR, DOORS, new_kit, render, apply_world, world_path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import assets_magic as M  # noqa: E402

k = new_kit(43)
A.room(k, 1, 2, 13, 9, H, door=(6.0, 8.0), floor_tone=A.WOOD_D, plaster='#d0c4a8', wainscot_col='#3e2a1c')

# ---- back wall: shelves, the wall map, the window and telescope ---------------------------------
A.bookshelf(k, 1.1, 3.5, 2.0)
k.box(4.0, 1.98, 0.9, 6.6, 2.04, 2.1, A.WOOD_DD, 'map_frame')
k.box(4.08, 2.04, 0.98, 6.52, 2.06, 2.02, '#cfc09a', 'wall_map')
for (x, z, w_) in ((4.4, 1.6, 0.5), (5.3, 1.25, 0.6), (6.0, 1.7, 0.35), (4.9, 1.15, 0.3)):
    k.box(x, 2.06, z, x + w_, 2.07, z + 0.18, '#3a7a6a', 'map_land')
for (a, b) in (((4.55, 1.7), (5.5, 1.35)), ((5.5, 1.35), (6.15, 1.78)), ((4.55, 1.7), (5.0, 1.22))):
    k.tube((a[0], 2.075, a[1]), (b[0], 2.075, b[1]), 0.008, '#b02a2a', 'map_route', verts=3)
A.window(k, 8.0, 2.0)
M.telescope(k, 8.0, 3.1, aim=(0.15, -1.0, 0.35))
k.solid(7, 2, 9, 4)
A.bookshelf(k, 9.6, 12.9, 2.0)

# ---- the work: map desk, globe, the cat on the charts -------------------------------------------
A.map_desk(k, 3.0, 5.6, 4.4)
A.stool(k, 4.3, 5.6)
A.cat(k, 3.6, 4.7, z=0.785, col='#6a6a72')
A.globe(k, 11.6, 4.9)
A.armchair(k, 10.2, 7.6, facing='up', tone='#3a5a4a')
A.side_table(k, 11.3, 7.7)
A.candle(k, 11.3, 7.7, 0.62, energy=3.0)
A.rug(k, 5.8, 5.6, 9.2, 7.8, col='#7a5a2a', pattern=True)
A.trunk(k, 1.2, 7.8, w=0.9, d=0.5, tone='#4a5a6a')
A.scroll_rack(k, 12.0, 12.9, 6.0, h=1.5)
A.book_stack(k, 2.0, 6.4, n=5)
A.book_stack(k, 7.0, 4.6, n=3)
A.book_stack(k, 12.3, 3.6, n=4)
# the drafting table in the middle of the room, a big chart pinned out on it
k.box(6.4, 6.0, 0.86, 8.6, 7.2, 0.92, (A.WOOD, 0.1), 'drafting_top')
for (xx, rr) in ((6.5, 6.1), (8.4, 6.1), (6.5, 7.0), (8.4, 7.0)):
    k.box(xx, rr, 0.0, xx + 0.08, rr + 0.08, 0.86, A.WOOD_DD, 'drafting_leg')
k.box(6.6, 6.15, 0.92, 8.4, 7.05, 0.925, '#d8c8a0', 'chart')
for (x, r, w_, d_) in ((6.9, 6.3, 0.5, 0.3), (7.6, 6.6, 0.4, 0.25), (7.1, 6.75, 0.3, 0.2)):
    k.box(x, r, 0.925, x + w_, r + d_, 0.928, '#3a7a6a', 'chart_land')
for (x, r) in ((6.65, 6.2), (8.35, 6.2), (6.65, 7.0), (8.35, 7.0)):
    k.cyl(x, r, 0.925, 0.96, 0.03, A.BRASS, 'chart_weight', verts=8)
k.solid(6, 6, 9, 8)
A.potted_plant(k, 12.4, 8.3)

# ---- light ----------------------------------------------------------------------------------
A.desk_lamp(k, 5.2, 4.55, 0.78, energy=6.0)
A.hanging_lamp(k, 7.5, 5.8, energy=130, visible=False)
A.hanging_lamp(k, 3.5, 6.0, energy=70, visible=False)
A.wall_sconce(k, 9.2, 2.0, energy=7)
k.area_light(8.0, 2.6, 1.6, '#7090d0', 30, 1.0, rot=(math.radians(-70), 0, 0))

k.solid(6, 5, 7, 6)                     # the cartographer
render(k, sys.argv[1])
apply_world(world_path('lumar-house'), k, FLOOR, doors=DOORS, scene_id='lumar-house', moves={
    'STREET': DOORS, 'CARTOGRAPHER': (6, 5), 'MAP DESK': (4, 4), 'GLOBE': (10, 4), 'TELESCOPE': (8, 3),
    'BOOKSHELF': (11, 2), 'CAT': (3, 4), 'WALL MAP': (7, 6)},
    actors=[{'sheet': 'npc-scholar', 'x': 6, 'y': 5, 'facing': 'left'}])
print('house done')
