"""Lumar Apothecary — Blender scene. Usage: BVENV/bin/python lumar_apothecary.py RENDER_DIR"""
import math
import sys
from _lumar_room import A, H, FLOOR, DOORS, new_kit, render, apply_world, world_path

k = new_kit(51)
A.room(k, 1, 2, 13, 9, H, door=(6.0, 8.0), floor_tone=A.WOOD_D, plaster='#6a5a7a', wainscot_col=A.WOOD_DD)

# ---- back wall: jars, books, herbs ------------------------------------------------------
A.jar_shelves(k, 1.0, 3.7, 2.0)
A.bookshelf(k, 4.0, 5.5, 2.0)
A.herb_beam(k, 5.8, 9.6, 2.0)
A.bench(k, 5.9, 9.5, 2.45, tone=A.WOOD_D)
for bx in (6.2, 6.55, 8.6, 9.1):
    A.jar(k, bx, 2.45, 0.45)
A.mushroom_jar(k, 7.5, 2.45, 0.45)
A.jar_shelves(k, 10.0, 13.0, 2.0)
A.owl(k, 11.6, 2.2, 2.22)

# ---- brewing corner + counter ------------------------------------------------------------
A.cauldron(k, 2.5, 5.55)
A.cauldron(k, 3.6, 5.6, brew='#a060d0', energy=5.0)
A.bar_counter(k, 6.0, 8.95, 5.2, 5.8, height=0.95)
k.solid(6, 4, 9, 5)                       # behind the counter
A.crystal_ball(k, 6.45, 5.45, 0.95)
A.jar(k, 7.2, 5.4, 0.95, '#5a8a5a')
A.jar(k, 7.45, 5.55, 0.95, '#b07ab0', glow='#e0a0f0')
A.candle(k, 8.0, 5.35, 0.95, energy=2.0)
A.workbench(k, 10.05, 12.95, 5.5)
A.mushroom_jar(k, 11.25, 5.35, 0.86)

# ---- floor --------------------------------------------------------------------------------
A.rug(k, 5.2, 6.6, 8.8, 8.4, col='#4a2a6a', pattern=True)
A.altar_candle(k, 1.5, 8.35)
A.altar_candle(k, 12.5, 8.35)
A.potted_plant(k, 9.9, 3.4, tone='#3a6a4a')

# ---- light --------------------------------------------------------------------------------
A.hanging_lamp(k, 3.6, 4.6, energy=105, visible=False)
A.hanging_lamp(k, 9.5, 4.6, energy=105, visible=False)
A.hanging_lamp(k, 7.0, 7.0, energy=70, visible=False)
k.area_light(6.5, 7.0, 2.4, '#7060a0', 18, 3.0, rot=(math.radians(20), 0, 0))

render(k, sys.argv[1], ambient=('#3a3050', 0.4))
apply_world(world_path('lumar-apothecary'), k, FLOOR, doors=DOORS, scene_id='lumar-apothecary', moves={
    'STREET': DOORS, 'APOTHECARY': (7, 5), 'CAULDRON': (2, 5), 'WORKBENCH': (11, 5),
    'JAR SHELF': [(2, 2), (11, 2)], 'HANGING HERBS': (7, 2), 'CANDLE': [(1, 8), (12, 8)]},
    actors=[{'sheet': 'npc-apothecary', 'x': 7, 'y': 4, 'facing': 'down'}])
print('apothecary done')
