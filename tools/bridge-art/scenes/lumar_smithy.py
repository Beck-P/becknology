"""Lumar Smithy — Blender scene. Usage: BVENV/bin/python lumar_smithy.py RENDER_DIR"""
import math
import sys
from _lumar_room import A, H, FLOOR, DOORS, new_kit, render, apply_world, world_path

k = new_kit(41)
A.room(k, 1, 2, 13, 9, H, door=(6.0, 8.0), floor='flags', floor_tone='#4e463e',
       plaster='#6e675c', stone=True, wainscot=0, beams_every=0)

# ---- back wall ----------------------------------------------------------------------
A.tool_wall(k, 1.1, 3.6, 2.0)
A.smith_bench(k, 1.1, 3.6, 2.45)
A.wall_shield(k, 4.55, 2.0, z=1.5)
A.forge(k, 6.6, 2.0, energy=150, wall_h=H)
A.coal_pile(k, 9.3, 2.5)
A.tool_wall(k, 10.6, 12.9, 2.0, missing=True)
A.bench(k, 10.6, 12.9, 2.45, tone=A.WOOD_D)
A.crate(k, 10.75, 2.2, s=0.5, z0=0.45, tone=A.WOOD_D, contents='bars', solid=False)
A.bucket(k, 12.4, 2.45)
A.wall_sconce(k, 9.7, 2.0, z=1.55, energy=5)

# ---- working floor --------------------------------------------------------------------
A.anvil(k, 7.5, 4.5)
k.solid(8, 4, 9, 5)                       # the smith stands beside the anvil
A.bucket(k, 6.6, 4.6)
A.sword_barrel(k, 3.5, 4.5)
A.chopping_block(k, 9.5, 7.2)
A.weapon_rack(k, 2.5, 4.45)
A.armor_stand(k, 1.5, 6.4)
A.grindstone(k, 4.5, 6.5)
A.quench_trough(k, 11.05, 12.9, 5.5)
A.bucket(k, 10.6, 5.7)
A.crate(k, 11.2, 7.75, s=0.6, tone=A.WOOD_D, contents='horseshoes')
A.crate(k, 12.0, 7.85, s=0.55, tone=A.WOOD, contents='bars')
A.coal_pile(k, 1.6, 8.3)

# ---- light ----------------------------------------------------------------------------
A.hanging_lamp(k, 3.6, 5.0, energy=110, visible=False)
A.hanging_lamp(k, 10.2, 6.4, energy=110, visible=False)
k.area_light(6.8, 7.5, 2.4, '#5a6a90', 12, 3.0, rot=(math.radians(20), 0, 0))

render(k, sys.argv[1], ambient=('#2e3448', 0.4))
apply_world(world_path('lumar-smithy'), k, FLOOR, doors=DOORS, scene_id='lumar-smithy', moves={
    'STREET': DOORS, 'SMITHY': (8, 4), 'FORGE': (6, 2), 'ANVIL': (7, 4), 'QUENCH TROUGH': (12, 5),
    'TOOL WALL': [(2, 2), (12, 2)], 'WEAPON RACK': (2, 4)},
    actors=[{'sheet': 'npc-smith', 'x': 8, 'y': 4, 'facing': 'left'}])
print('smithy done')
