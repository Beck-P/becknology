"""Tinker's Tech Repair — Blender scene. Usage: BVENV/bin/python tech_repair_shop.py RENDER_DIR"""
import sys
from _cyber_room import Y, A, H, FLOOR, DOORS, new_kit, render, apply_world, world_path

k = new_kit(151)
Y.cyber_room(k, 1, 2, 13, 9, H, floor_tones=('#2a2e36', '#343842'), top_neon=Y.CYAN, base_neon=Y.YEL)

Y.repair_bench(k, 1.0, 13.0, 2.0)
Y.parts_bins(k, 1.0, 3.8, 2.0)
Y.work_lamp(k, 4.5, 2.0, z=0.85)
Y.parts_bins(k, 5.0, 6.9, 2.0)
Y.screen_stack(k, 7.9, 10.1, 2.0)
Y.work_lamp(k, 10.6, 2.0, z=0.85)
Y.cable_coil(k, 11.5, 2.0)
Y.parts_bins(k, 12.0, 12.95, 2.0)
Y.neon_text(k, 'REPAIR', 6.0, 2.0, 2.1, h=0.2, col=Y.CYAN, board=False, energy=4)
k.solid(2, 3, 3, 4)                       # Tinker

Y.hover_drone(k, 10.5, 5.5)
Y.metal_bench(k, 3.2, 5.8, 7.5, neon=Y.YEL)
for (x, r) in ((12.0, 7.7), (12.5, 6.9)):
    A.crate(k, x - 0.3, r - 0.3, s=0.58, tone='#4a5058', contents='bars')
Y.junk_pile(k, 1.6, 7.7)
Y.robot_torso(k, 7.5, 5.4)
k.tube((7.75, 5.6, 0.02), (9.9, 5.6, 0.02), 0.025, '#14181c', 'cable', verts=5)
k.tube((10.5, 5.2, 0.02), (11.0, 3.0, 0.02), 0.025, '#c84020', 'cable', verts=5)
k.point_light(10.5, 6.0, 1.8, '#ffe8a0', 18, radius=0.1)        # work light on the drone

for (x, r) in ((3.5, 5.5), (10.5, 5.8), (7.0, 7.8)):
    k.point_light(x, r, 2.6, '#d8e8ff', 48, radius=0.7)

render(k, sys.argv[1], ambient=('#202838', 0.42))
apply_world(world_path('tech-repair-shop'), k, FLOOR, doors=DOORS, scene_id='tech-repair-shop', moves={
    'TECHNICIAN': (2, 3), 'WAITING CUSTOMER': (4, 7), 'HOVER-DRONE': (10, 5), 'TERMINAL': (8, 2),
    'WORKBENCH': (1, 2), 'PARTS BIN': (5, 2), 'CABLE COIL': (11, 2)},
    actors=[{'sheet': 'npc-technician', 'x': 2, 'y': 3, 'facing': 'down'},
            {'sheet': 'npc-waiting', 'x': 4, 'y': 7, 'facing': 'down', 'pose': 'sit'}])
print('repair done')
