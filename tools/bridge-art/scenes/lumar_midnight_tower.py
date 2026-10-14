"""The Sorceress's Tower (Midnight Isle) — Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/lumar_midnight_tower.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-midnight-tower

An octagonal stone room: rose window and bookshelves on the back wall,
moonlit windows on the angled walls, a crystal floating over its altar in
the middle of a glowing summoning circle, candelabras, floating candles,
the cauldron, the scroll desk, the alchemy table, the telescope and the
familiar.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world  # noqa: E402
import assets_lumar as A                       # noqa: E402
import assets_magic as M                       # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-midnight-tower.json')

H = 2.6 / math.cos(THETA)             # walls read 2.6 tiles tall
k = Kit(12, 13, margin_top=1.0, margin_bottom=0.5, seed=61)
P, C = M.octagon_room(k, 2, 2, 10, 11, 2, H, door=(5.0, 7.0))
# P: 0 back-left, 1 back-right, 2 right-back, 3 right-front, 4 front-right,
#    5 front-left, 6 left-front, 7 left-back

# ---- back wall: shelves either side of the rose window ----------------------------
A.bookshelf(k, 4.05, 5.55, 2.0, top=2.2)
A.bookshelf(k, 6.45, 7.95, 2.0, top=2.2)
M.rose_window(k, 6.0, 2.0, 2.75, 0.45)
k.point_light(6.0, 2.6, 2.6, '#7a5ad0', 10, radius=0.4)

# ---- angled walls: moonlit windows -------------------------------------------------
M.angled_window(k, P[7], P[0], C, 0.3, 0.7, 1.15, 2.35, moon=True)
M.angled_window(k, P[1], P[2], C, 0.3, 0.7, 1.15, 2.35)
k.area_light(3.3, 3.3, 1.9, '#7890e0', 40, 1.0, rot=(math.radians(-70), 0, math.radians(45)))
k.area_light(8.7, 3.3, 1.9, '#7890e0', 30, 1.0, rot=(math.radians(-70), 0, math.radians(-45)))

# ---- back corners: cauldron, scroll desk ---------------------------------------------
A.cauldron(k, 3.55, 3.6, brew='#a060e0', energy=7.0)
M.scroll_desk(k, 8.45, 3.55)

# ---- the heart of the room -------------------------------------------------------------
M.spell_circle(k, 5.5, 6.5, 1.55)
M.crystal_altar(k, 5.5, 6.5, energy=45)
k.solid(5, 5, 6, 6)                       # the sorceress stands here
M.familiar(k, 4.35, 5.35)

# ---- candles -------------------------------------------------------------------------------
for (x, r) in ((2.5, 4.6), (9.5, 4.6), (2.5, 8.4), (9.5, 8.4)):
    M.candelabra(k, x, r)
for (x, r, z) in ((4.0, 3.3, 2.15), (5.2, 3.8, 2.5), (6.9, 3.5, 2.3), (8.0, 4.5, 2.2), (3.1, 6.6, 2.4), (9.0, 6.4, 2.35)):
    M.floating_candle(k, x, r, z)

# ---- crystals growing out of the floor by the left wall --------------------------------
for (x, r, h, rad) in ((2.45, 6.3, 0.55, 0.09), (2.7, 6.55, 0.38, 0.07), (2.4, 6.75, 0.3, 0.06), (2.85, 6.25, 0.25, 0.05)):
    k.cone(x, r, 0, h, rad, 0.004, '#4a2a80', 'crystal', emit=('#8a5ae8', 0.8), verts=6)
k.point_light(2.7, 6.9, 0.5, M.ARCANE, 6, radius=0.1, group='flicker')
k.solid(2, 6, 3, 7)

# ---- front: alchemy table, telescope -----------------------------------------------------
M.alchemy_table(k, 3.0, 4.6, 9.45)
M.telescope(k, 8.6, 9.35, aim=(-1.0, -0.55, 0.85))
A.trunk(k, 8.95, 6.15, w=0.8, d=0.5, tone='#3a2a4a')

# ---- light -------------------------------------------------------------------------------
k.point_light(6.0, 8.5, 2.6, '#a090e0', 35, radius=0.6)        # soft fill toward the door

meta = k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.72}},
                light_samples=128, world_light=('#2a2448', 0.4))

apply_world(WORLD, k, (2, 2, 9, 10), doors=[(5, 11), (6, 11)], scene_id='lumar-midnight-tower', moves={
    'SORCERESS': (5, 5), 'CRYSTAL': (5, 6), 'ALCHEMY TABLE': (3, 9), 'TELESCOPE': (8, 9),
    'CAULDRON': (3, 3), 'FAMILIAR': (4, 5), 'SCROLLS': (8, 3), 'SPELL CIRCLE': (4, 7)},
    actors=[{'sheet': 'npc-sorceress', 'x': 5, 'y': 5, 'facing': 'down'}])
print('tower done')
