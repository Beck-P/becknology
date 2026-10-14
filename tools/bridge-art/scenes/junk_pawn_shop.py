"""Joro's Pawnshop — Blender scene. Usage: BVENV/bin/python junk_pawn_shop.py RENDER_DIR"""
import sys
from _cyber_room import Y, H, FLOOR, DOORS, new_kit, render, apply_world, world_path

k = new_kit(141)
Y.cyber_room(k, 1, 2, 13, 9, H, floor_tones=('#2e2a26', '#3a342e'), top_neon=Y.YEL, base_neon=Y.PINK)

Y.junk_shelf(k, 1.0, 3.9, 2.0)
Y.wall_clock(k, 4.5, 2.0)
Y.junk_shelf(k, 5.1, 7.0, 2.0)
Y.junk_shelf(k, 8.2, 10.0, 2.0)
Y.wall_clock(k, 10.6, 2.0, z=1.7)
Y.neon_text(k, 'PAWN', 9.1, 2.0, 2.1, h=0.22, col=Y.YEL, board=False, energy=4)
Y.safe(k, 12.5, 3.4)

Y.pawn_counter(k, 1.0, 7.0, 4.0, 4.6)
k.solid(3, 3, 4, 4)                       # Joro
Y.display_case(k, 4.5, 6.5, items=(('#e0b040', 'coin'), ('#3070f0', 'gem')))
Y.display_case(k, 9.5, 6.5, items=(('#e03030', 'orb'), ('#a040e0', 'chip')))
Y.caged_bulb(k, 7.5, 5.5, z=2.5)
Y.caged_bulb(k, 3.5, 3.4, z=2.3, energy=18)
Y.junk_pile(k, 1.6, 7.6)
Y.junk_pile(k, 12.4, 7.6)

k.point_light(10.5, 4.5, 2.5, '#ffd8a0', 30, radius=0.6)
k.point_light(4.5, 7.2, 2.6, '#ffc890', 30, radius=0.8)
k.point_light(10.0, 7.6, 2.6, '#ffc890', 26, radius=0.8)
k.point_light(3.0, 2.8, 2.4, '#ffd8a0', 20, radius=0.6)

render(k, sys.argv[1], ambient=('#30262c', 0.5))
k.solid(1, 3, 7, 4)                     # behind the counter is the pawnbroker's
k.solid(12, 5, 13, 6)                   # the customer
apply_world(world_path('junk-pawn-shop'), k, FLOOR, doors=DOORS, scene_id='junk-pawn-shop', moves={
    'PAWNBROKER': (3, 4), 'SAFE': (12, 3), 'CLOCK': (4, 2), 'JUNK PILE': [(1, 7), (12, 7)],
    'DISPLAY CASE': [(4, 6), (9, 6)], 'WALL SHELF': (2, 2), 'BROWSING CUSTOMER': (12, 5)},
    actors=[{'sheet': 'npc-pawnbroker', 'x': 3, 'y': 3, 'facing': 'down'},
            {'sheet': 'npc-pawn-customer', 'x': 12, 'y': 5, 'facing': 'left'}])
print('pawn done')
