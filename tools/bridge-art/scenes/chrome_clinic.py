"""Chrome Augmentation Clinic — Blender scene. Usage: BVENV/bin/python chrome_clinic.py RENDER_DIR"""
import sys
from _cyber_room import Y, P, H, FLOOR, DOORS, new_kit, render, apply_world, world_path

k = new_kit(131)
Y.cyber_room(k, 1, 2, 13, 9, H, floor_tones=('#8a96a8', '#9aa6b8'), wall=Y.CLINIC_WALL, top_neon=Y.CYAN, base_neon=Y.CYAN)

Y.med_cabinet(k, 1.0, 2.9, 2.0)
Y.med_cabinet(k, 11.1, 13.0, 2.0)
Y.holo_figure(k, 4.0, 2.0)
Y.fluoro_panel(k, 5.2, 6.8, 2.05, 2.15)
Y.fluoro_panel(k, 7.2, 8.8, 2.05, 2.15)
Y.vitals_terminal(k, 9.1, 10.9, 2.0)
Y.neon_text(k, 'CHROME', 7.0, 2.0, 1.15, h=0.32, col=Y.CYAN, energy=6)

Y.exam_chair(k, 3.5, 4.5)
k.solid(7, 4, 8, 5)                       # the doctor
Y.recovery_bed(k, 10.5, 4.6)
Y.med_drone(k, 6.5, 7.5)
# floor decal: a glowing cross
for (a, b, c, d) in ((6.8, 5.7, 7.2, 5.74), (6.8, 6.86, 7.2, 6.9), (6.4, 6.1, 6.8, 6.14), (7.2, 6.1, 7.6, 6.14),
                     (6.4, 6.46, 6.8, 6.5), (7.2, 6.46, 7.6, 6.5), (6.8, 5.7, 6.84, 6.14), (7.16, 5.7, 7.2, 6.14),
                     (6.8, 6.46, 6.84, 6.9), (7.16, 6.46, 7.2, 6.9), (6.4, 6.1, 6.44, 6.5), (7.56, 6.1, 7.6, 6.5)):
    k.box(a, b, 0.0, c, d, 0.006, '#0c2a30', 'decal', emit=(Y.CYAN, 0.6))     # outlined cross
Y.med_cart(k, 5.5, 4.6)
Y.curtain(k, 11.05, 11.95, 5.75)                 # drawn back to one side
k.solid(11, 5, 12, 6)
Y.metal_bench(k, 11.0, 12.9, 8.3, neon=Y.CYAN)
P.empty_pot(k, 1.5, 8.4)
P.houseplant(k, 1.5, 8.4, 0.34)

for (x, r) in ((3.5, 5.6), (10.5, 5.6), (7.0, 7.6)):
    k.point_light(x, r, 2.6, '#e0f0ff', 45, radius=0.8)

render(k, sys.argv[1], ambient=('#2a3448', 0.45))
apply_world(world_path('chrome-clinic'), k, FLOOR, doors=DOORS, scene_id='chrome-clinic', moves={
    'DOCTOR': (7, 4), 'EXAM CHAIR': (3, 4), 'MEDICAL CABINET': [(2, 2), (11, 2)], 'HOLO-DISPLAY': (4, 2),
    'RECOVERY BED': (10, 4), 'STATUS TERMINAL': (9, 2), 'MEDICAL DRONE': (6, 7)},
    actors=[{'sheet': 'npc-doctor', 'x': 7, 'y': 4, 'facing': 'down'}])
print('clinic done')
