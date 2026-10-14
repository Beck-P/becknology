"""Fisher's Cottage (the house at the west end of the Market Square).
Usage: BVENV/bin/python lumar_cottage.py RENDER_DIR

Gran Wilde rocks by the hearth; nets hang to dry, crossed oars on the wall,
the stew pot on the fire, a bed in the corner the cat has claimed.
"""
import math
import sys
from _lumar_room import A, H, FLOOR, DOORS, new_kit, render, apply_world, world_path

k = new_kit(41)
A.room(k, 1, 2, 13, 9, H, door=(6.0, 8.0), floor_tone='#7a5a3a', plaster='#d8c4a0', wainscot_col='#5a4a38')

# ---- back wall: shelf, hearth with the stew, nets, oars ----------------------------------------
A.wall_shelf(k, 1.3, 3.1, 2.0, 1.45, bottles=True)
A.bench(k, 1.3, 3.1, 2.45)
A.fireplace(k, 5.6, 2.0, H, width=2.0, energy=150)
A.cauldron(k, 5.6, 2.55, brew='#8a6a3a', energy=3.0)
A.fishing_net(k, 7.2, 9.6, 2.0)
k.tube((10.3, 2.08, 0.6), (11.6, 2.08, 2.1), 0.035, A.WOOD_L, 'oar', verts=6)
k.tube((11.6, 2.08, 0.6), (10.3, 2.08, 2.1), 0.035, A.WOOD_L, 'oar', verts=6)
A.window(k, 12.1, 2.0, w=0.7)

# ---- Gran's corner by the fire --------------------------------------------------------------
A.rug(k, 3.9, 3.4, 7.4, 5.2, col='#5a3a6a', pattern=True)
A.rocking_chair(k, 4.5, 4.1)
k.solid(4, 3, 5, 5)
A.side_table(k, 3.3, 3.9)
A.mug(k, 3.3, 3.85, 0.62)

# ---- table, bed, the catch ------------------------------------------------------------------
A.round_table(k, 9.5, 5.6)
A.stool(k, 8.5, 5.65)
A.stool(k, 10.5, 5.65)
A.plate(k, 9.35, 5.5, 0.78, food='#c8a070')
A.mug(k, 9.7, 5.4, 0.78)
A.candle(k, 9.6, 5.8, 0.78)
A.bed(k, 11.3, 12.8, 3.0, 5.0, quilt='#3a6a5a', quilt2='#d8c8a0')
A.cat(k, 12.1, 4.2, z=0.47, col='#c88a4a')
A.barrel(k, 1.6, 7.9, tone=A.WOOD_D)
A.crate(k, 2.3, 7.7, s=0.55, tone=A.WOOD_L)
k.box(2.35, 7.75, 0.47, 2.8, 8.2, 0.5, '#6a8aa0', 'fish')
A.potted_plant(k, 12.4, 8.3)

# ---- light ----------------------------------------------------------------------------------
A.hanging_lamp(k, 9.5, 5.6, energy=110, visible=False)
A.wall_sconce(k, 3.4, 2.0, energy=8)
A.wall_sconce(k, 10.0, 2.0, energy=8)
A.potted_plant(k, 7.6, 2.5)
k.area_light(12.1, 2.6, 1.6, '#7090d0', 25, 1.0, rot=(math.radians(-70), 0, 0))

render(k, sys.argv[1])
apply_world(world_path('lumar-cottage'), k, FLOOR, doors=DOORS, scene_id='lumar-cottage', moves={
    'STREET': DOORS, 'GRAN WILDE': (4, 4), 'HEARTH': (5, 2), 'STEW POT': (6, 2), 'NETS': (8, 2), 'OARS': (11, 2),
    'BED': (12, 4), 'SHELF': (2, 2)},
    actors=[{'sheet': 'npc-fisher-gran', 'x': 4, 'y': 4, 'facing': 'down', 'pose': 'sit'}])
print('cottage done')
