"""Lumar Bakery — Blender scene. Usage: BVENV/bin/python lumar_bakery.py RENDER_DIR"""
import math
import sys
from _lumar_room import A, H, FLOOR, DOORS, new_kit, render, apply_world, world_path

k = new_kit(31)
A.room(k, 1, 2, 13, 9, H, door=(6.0, 8.0), floor_tone=A.WOOD_L, plaster='#e0d0b0', wainscot_col='#8a6a48')

# ---- back wall: bread rack, the oven, logs, menu board, window, cooling rack
A.bread_rack(k, 1.1, 3.9, 2.0)
A.bread_oven(k, 5.6, 2.0, width=2.4, energy=70, wall_h=H)
A.wood_pile(k, 7.15, 8.05, 2.45)
A.chalkboard(k, 7.6, 2.0, z0=1.0, w=0.8, h=0.55)
A.window(k, 9.35, 2.0)
A.hanging_basket(k, 10.55, 2.0)
A.cooling_rack(k, 11.25, 12.9, 2.0)

# ---- shop counter; the baker works behind it -------------------------------------
A.bakery_counter(k, 1.0, 6.9, 4.2, 4.8)
k.solid(1, 3, 5, 4)                       # behind the counter (oven end stays open)

# ---- room ------------------------------------------------------------------------
A.flour_sacks(k, 11.5, 4.5)
A.crate(k, 12.15, 4.15, s=0.62, contents='apples')
A.dough_table(k, 3.5, 6.5)
A.rug(k, 8.3, 5.7, 10.7, 7.6, col='#8a3a2a', pattern=True)
A.round_table(k, 9.5, 6.6)
A.stool(k, 8.5, 6.65)
A.stool(k, 10.5, 6.65)
A.plate(k, 9.35, 6.5, 0.78, food=A.BREAD)
A.mug(k, 9.75, 6.75, 0.78)
A.candle(k, 9.65, 6.4, 0.78)
A.barrel(k, 12.5, 7.4, tone=A.WOOD_L)
A.crate(k, 11.6, 7.95, s=0.55, tone=A.WOOD)
A.potted_plant(k, 1.5, 8.4, tone='#4a7a3a')

# ---- light -----------------------------------------------------------------------
A.hanging_lamp(k, 3.2, 5.3, energy=100, visible=False)
A.hanging_lamp(k, 7.8, 5.4, energy=105, visible=False)
A.hanging_lamp(k, 11.2, 4.8, energy=85, visible=False)
k.area_light(9.35, 2.6, 1.6, '#7090d0', 30, 1.0, rot=(math.radians(-70), 0, 0))

render(k, sys.argv[1])
apply_world(world_path('lumar-bakery'), k, FLOOR, doors=DOORS, scene_id='lumar-bakery', moves={
    'STREET': DOORS, 'BAKERY': (4, 4), 'OVEN': (5, 2), 'DISPLAY': (2, 4), 'DOUGH TABLE': (3, 6),
    'FLOUR SACK': (11, 4), 'BREAD BASKET': (10, 2)},
    actors=[{'sheet': 'npc-baker', 'x': 4, 'y': 3, 'facing': 'down'}])
print('bakery done')
