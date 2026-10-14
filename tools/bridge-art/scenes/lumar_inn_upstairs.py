"""The Blue Lantern — upstairs. Usage: BVENV/bin/python lumar_inn_upstairs.py RENDER_DIR

The guest floor: the stairwell down in the corner, your bed and a
traveller's, a wardrobe, washstand, a writing desk with the guestbook, a
window over the harbour, and the inn's cat asleep on the rug.
"""
import math
import sys
from _lumar_room import A, H, new_kit, render, apply_world, world_path

k = new_kit(23)
A.floor_planks(k, 1, 2, 13, 9, A.WOOD)
A.back_wall(k, 0.4, 13.6, 2, H, plaster='#d8c8a8', wainscot_col='#6a4a30')
A.side_wall(k, 0.4, 1, 1.5, 9, H)
A.side_wall(k, 13, 13.6, 1.5, 9, H)
A.front_wall(k, 0.4, 13.6, 9)

# ---- the stairwell down (top left) ------------------------------------------------
A.stairwell_down(k, 1.05, 2.95, 2.15, 3.95)
k.solid(1, 2, 3, 4)

# ---- your bed and the traveller's ------------------------------------------------------
A.window(k, 4.4, 2.0)
A.bed(k, 3.35, 4.85, 2.05, 4.15, quilt='#3a5a8a', quilt2='#c8a050')
A.nightstand(k, 5.45, 2.45)
A.trunk(k, 3.6, 4.3, w=0.95, d=0.45, tone='#5a3a22')
k.solid(3, 4, 5, 5)
A.painting(k, 7.3, 2.0, 1.25, w=0.9, h=0.6)
A.wardrobe(k, 6.4, 8.2, 2.05)
A.bed(k, 9.0, 10.5, 2.05, 4.15, quilt='#7a2e2e', quilt2='#d8c8a0', posts=True)
A.nightstand(k, 11.05, 2.45, candle_on=False)
A.crate(k, 9.2, 4.3, s=0.45, tone=A.WOOD_D)              # the traveller's pack
A.window(k, 12.0, 2.0)
A.washstand(k, 12.25, 2.6)

# ---- the room ---------------------------------------------------------------------------
A.rug(k, 4.3, 5.5, 8.9, 7.8, col='#2a4c8c', pattern=True)
A.cat(k, 6.9, 6.9)
A.armchair(k, 3.2, 6.6, facing='up', tone='#5a4a6a')
A.side_table(k, 2.2, 6.7)
A.candle(k, 2.2, 6.7, 0.62, energy=3.0)
A.map_desk(k, 10.4, 12.6, 6.2, d=0.62)
A.stool(k, 11.5, 7.35)
A.potted_plant(k, 12.4, 8.4)
A.coat_rack(k, 1.6, 8.3)

# ---- light: the candles, one hanging lamp, moonlight through the windows ------------------------
A.hanging_lamp(k, 7.0, 5.6, energy=110, visible=False)
A.hanging_lamp(k, 2.0, 4.6, energy=50, visible=False)          # over the stairwell
A.wall_sconce(k, 2.9, 2.0, energy=8)
A.wall_sconce(k, 8.7, 2.0, energy=6)
A.wall_shelf(k, 9.6, 11.0, 2.0, 1.55, bottles=False)
A.book_stack(k, 12.2, 5.3, n=3)
A.rug(k, 9.0, 4.6, 10.6, 5.6, col='#5a3a2a', pattern=False)
A.desk_lamp(k, 12.2, 6.45, 0.78, energy=4.0)
for wx in (4.4, 12.0):
    k.area_light(wx, 2.6, 1.6, '#7090d0', 30, 1.0, rot=(math.radians(-70), 0, 0))

render(k, sys.argv[1])
apply_world(world_path('lumar-inn-upstairs'), k, (1, 2, 12, 8), doors=[], scene_id='lumar-inn-upstairs', moves={
    'STAIRS': [(1, 3), (2, 3)], 'YOUR BED': (4, 4), 'THE OTHER BED': (9, 4), 'WARDROBE': (7, 2), 'WINDOW': (5, 2),
    'WRITING DESK': (11, 6), 'WASHSTAND': (12, 2), 'CAT': (6, 6), 'TRAVELLER': (3, 6)},
    actors=[{'sheet': 'npc-traveler', 'x': 3, 'y': 6, 'facing': 'up', 'pose': 'sit'}])
print('upstairs done')
