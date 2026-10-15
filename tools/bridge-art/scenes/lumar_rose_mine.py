"""The Rose Mine — the entrance hall. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/lumar_rose_mine.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-rose-mine

Inside the old mine on Rose Cove: the adit from the hillside at the front,
the lift down the shaft under its timber headframe at the back, rails from
the cage to the door, a cart of roseite still glowing on a siding, the
rack of old pickaxes, the foreman's slate (how deep you've been), lamps on
the props, and old Hob Dunmore on a crate by the workbench. The floors below are
lumar_rose_mine_floor.py; js/mine.js runs the mining.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world  # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_cave as V                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-rose-mine.json')
COLS, ROWS = 16, 12
k = Kit(COLS, ROWS, margin_top=1.2, margin_bottom=0.5, seed=303)
ROSE = ('#6a1a3a', '#f070b0')

# ---- floor, walls -------------------------------------------------------------------------------
V.cave_floor(k, 1.0, 1.6, 15.0, 11.0, tone='#4a3a3a', density=1.4)
V.rock_wall(k, 0.4, 15.6, 2.0, 2.9, gaps=[(6.4, 9.6, 2.7)])
V.stalactites(k, 0.6, 15.4, 2.1, 2.9, n=18)
V.rock_edge(k, 0.9, 2.2, 10.6, h=(0.8, 1.5))
V.rock_edge(k, 15.1, 2.2, 10.6, h=(0.8, 1.5))
V.rock_row(k, 0.4, 6.4, 10.9)
V.rock_row(k, 9.6, 15.6, 10.9)
k.solid(0, 0, COLS, 2)

# ---- the shaft and the lift under its headframe ------------------------------------------------------
k.box(6.5, 0.6, -2.0, 9.5, 2.0, 2.7, '#050303', 'shaft')
for x in (6.55, 9.3):
    k.box(x, 1.85, 0.0, x + 0.16, 2.05, 3.2, (A.WOOD_D, 0.18), 'headframe', bevel=0.02)
k.box(6.4, 1.8, 3.1, 9.6, 2.1, 3.3, (A.WOOD_D, 0.18), 'headframe', bevel=0.02)
k.cyl_x(7.8, 8.2, 1.95, 3.55, 0.42, 0.42, ('#4a4048', 0.12), 'wheel', verts=20)
k.cyl_x(7.75, 8.25, 1.95, 3.55, 0.08, 0.08, A.IRON, 'axle', verts=8)
k.tube((8.0, 1.95, 3.15), (8.0, 2.2, 1.6), 0.015, '#2a2a30', 'cable', verts=4)
# the cage: an iron frame round a plank floor, its gate open
k.box(7.0, 1.95, 0.0, 9.0, 3.05, 0.08, (A.WOOD, 0.18), 'cage_floor')
for (x, r) in ((7.0, 1.95), (8.95, 1.95), (7.0, 3.0), (8.95, 3.0)):
    k.box(x, r, 0.0, x + 0.05, r + 0.05, 1.6, A.IRON, 'cage_bar')
for z in (0.8, 1.6):
    k.box(7.0, 1.95, z, 9.0, 2.0, z + 0.05, A.IRON, 'cage_bar')
    k.box(7.0, 1.95, z, 7.05, 3.05, z + 0.05, A.IRON, 'cage_bar')
    k.box(8.95, 1.95, z, 9.0, 3.05, z + 0.05, A.IRON, 'cage_bar')
k.box(7.0, 1.95, 1.6, 9.0, 3.05, 1.66, A.IRON, 'cage_roof')
k.box(9.25, 3.0, 0.0, 9.35, 3.1, 0.85, A.IRON, 'lever')                     # the lever, and its brass knob
k.sphere(9.3, 3.05, 0.9, 0.07, 0.07, A.BRASS, 'lever_knob', segs=10)
k.solid(7, 1, 9, 2)
k.solid(9, 2, 10, 3)

# ---- rails from the cage to the door, a siding with the ore cart ------------------------------------
V.rails(k, 8.0, 3.1, 11.0)
V.rails(k, 11.6, 3.6, 8.4)
V.mine_cart(k, 11.6, 5.2)
for j in range(4):                                                     # roseite heaped in the cart, still glowing
    a = j * 1.6
    k.tube((11.6 + math.cos(a) * 0.12, 5.2 + math.sin(a) * 0.08, 0.55), (11.6 + math.cos(a) * 0.2, 5.25, 0.85), 0.05,
           ROSE[0], 'crystal', rb=0.004, emit=(ROSE[1], 0.8), verts=6, smooth=False)
k.point_light(11.6, 5.6, 1.0, ROSE[1], 8, radius=0.15)

# ---- west: the pickaxe rack, the foreman's slate -------------------------------------------------------------
k.box(1.7, 2.1, 0.0, 3.3, 2.35, 1.5, (A.WOOD_D, 0.18), 'rack', bevel=0.02)
for i in range(4):                                                      # pickaxes hung on pegs
    x = 1.95 + i * 0.4
    k.tube((x, 2.4, 0.25), (x, 2.4, 1.25), 0.025, A.WOOD, 'pick_haft', verts=6)
    k.tube((x - 0.22, 2.42, 1.2), (x + 0.22, 2.42, 1.32), 0.03, A.IRON, 'pick_head', rb=0.01, verts=6)
for i in range(2):                                                      # helmets with their lamps
    x = 2.2 + i * 0.7
    k.blob(x, 2.42, 1.45, 0.17, 0.15, 0.1, ('#8a7a3a', 0.15), 'helmet', segs=12)
    k.cyl(x, 2.6, 1.42, 1.5, 0.05, '#e0e0c0', 'helmet_lamp', emit=('#fff0c0', 0.6), verts=8)
k.solid(1, 2, 4, 3)
A.chalkboard(k, 4.6, 2.05, z0=0.95, w=1.0, h=0.7, lines=5)            # the foreman's slate

# ---- east: the workbench, Hob on a crate, the stores- ------------------------------------------------------
k.box(12.4, 2.2, 0.0, 14.4, 2.9, 0.8, (A.WOOD, 0.16), 'bench', bevel=0.02)
k.box(12.6, 2.3, 0.8, 13.4, 2.6, 0.9, A.IRON, 'vice')
k.cyl(14.0, 2.5, 0.8, 1.1, 0.12, ('#5a4a30', 0.15), 'lantern', verts=8)
k.cyl(14.0, 2.5, 0.83, 1.05, 0.08, '#c08840', 'lantern_glass', emit=('#ffc070', 0.9), verts=8)
k.point_light(14.0, 2.9, 1.2, '#ffb060', 40, radius=0.2, group='flicker')
k.solid(12, 2, 15, 3)
A.crate(k, 13.0, 5.0, s=0.6, tone=A.WOOD)                             # Hob's seat
k.solid(13, 5, 14, 6)
A.crate(k, 14.2, 3.4, s=0.55, tone=A.WOOD_L)
A.barrel(k, 14.5, 4.6, h=0.8, radius=0.3)
V.timber_support(k, 1.6, 6.5, 0.6)
V.timber_support(k, 14.4, 7.6, 15.4)
V.glow_mushrooms(k, 1.8, 9.6, col='#f070b0')
V.glow_mushrooms(k, 14.2, 9.8, col='#b070ff')

# ---- light: lamps on the props, the moon at the adit ----------------------------------------------------
for (x, r) in ((3.0, 4.0), (8.0, 6.6), (12.6, 8.2)):
    k.cyl(x, r, 2.1, 2.4, 0.09, ('#5a4a30', 0.15), 'hanging_lamp', verts=8)
    k.cyl(x, r, 2.13, 2.37, 0.06, '#c08840', 'lamp_glass', emit=('#ffc070', 0.9), verts=8)
    k.point_light(x, r, 2.0, '#ffb070', 70, radius=0.25, group='flicker')
k.area_light(8.0, 12.2, 1.5, '#7090d0', 120, 3.0, rot=(math.radians(-70), 0, 0))       # night air at the adit

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.7}}, light_samples=128, world_light=('#2a2028', 0.5))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Rose Mine', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'cave',
          'spawns': {'player': [8, 10]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'mine': {'hall': True}})
w['interactions'] = [
    {'x': 7, 'y': 11, 'type': 'leave_world', 'label': 'ROSE COVE', 'prompt': 'GO OUT', 'leaveTo': 'lumar-rose', 'leaveSpawn': [45, 33]},
    {'x': 8, 'y': 11, 'type': 'leave_world', 'label': 'ROSE COVE', 'prompt': 'GO OUT', 'leaveTo': 'lumar-rose', 'leaveSpawn': [45, 33]},
    {'x': 8, 'y': 2, 'type': 'mine_lift', 'label': 'THE LIFT', 'prompt': 'PRESS E TO GO DOWN'},
    {'x': 9, 'y': 3, 'type': 'mine_lift', 'label': 'THE LIFT', 'prompt': 'PRESS E TO GO DOWN'},
    {'x': 2, 'y': 2, 'type': 'mine_rack', 'label': 'PICKAXE RACK', 'prompt': 'PRESS E TO LOOK'},
    {'x': 4, 'y': 2, 'type': 'mine_slate', 'label': "FOREMAN'S SLATE", 'prompt': 'PRESS E TO READ'},
    {'x': 11, 'y': 5, 'type': 'dialog', 'label': 'ORE CART', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A CART OF ROSEITE NOBODY EVER PUSHED OUT. THE CRYSTALS STILL GLOW, AND HUM VERY FAINTLY IF YOU PUT YOUR EAR TO THE IRON.'},
    {'x': 13, 'y': 2, 'type': 'dialog', 'label': 'WORKBENCH', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A VICE, A FILE, A TIN OF LAMP OIL AND A LEDGER OF FLOORS: "FIVE - BLUE STONE. TEN - IT GETS COLD. FIFTEEN - DO NOT LINGER."'},
    {'x': 13, 'y': 5, 'type': 'dialog', 'label': 'HOB', 'prompt': 'PRESS E TO TALK',
     'dialog': '"STILL SINGING, IS IT? AYE. IT ALWAYS IS."'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (1, 2, 14, 10), doors=[(7, 11), (8, 11)], scene_id='lumar-rose-mine',
            actors=[{'sheet': 'npc-miner', 'x': 13, 'y': 5, 'facing': 'left', 'pose': 'sit'}])
print('mine hall done')
