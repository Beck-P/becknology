"""Cyber Noodle Bar (Miyu's) — Blender scene. Usage: BVENV/bin/python cyber_noodle_bar.py RENDER_DIR"""
import sys
from _cyber_room import Y, A, H, FLOOR, DOORS, new_kit, render, apply_world, world_path

k = new_kit(121)
Y.cyber_room(k, 1, 2, 13, 9, H, floor_tones=('#3a2228', '#46282e'), top_neon=Y.PINK, base_neon=Y.PINK)

# ---- kitchen behind the bar ------------------------------------------------------------
Y.cooler_bank(k, 1.0, 2.9, 2.0)
Y.kitchen_back(k, 3.1, 13.0, 2.0)
Y.stock_pot(k, 5.5, 2.3)
Y.stock_pot(k, 6.4, 2.3)
for x in (7.6, 8.0, 8.4):
    Y.bowl(k, x, 2.3, 0.95)
Y.spice_shelf(k, 11.1, 12.9, 2.0)
Y.menu_board(k, 4.6, 9.4, 2.0, 1.25, 2.05)
for x in (3.6, 10.4):
    k.box(x - 0.03, 2.08, 1.0, x + 0.03, 2.12, 2.0, '#200818', 'neon', emit=(Y.CYAN, 0.9))
k.solid(9, 3, 10, 4)                      # the chef

# ---- the bar -----------------------------------------------------------------------------------
Y.noodle_counter(k, 1.0, 13.0, 4.0, 4.6)
for x in (1.5, 3.5, 5.5, 7.5, 10.5, 12.5):     # gaps between them reach the counter
    Y.neon_stool(k, x, 5.45)
Y.bowl(k, 5.5, 4.25, 1.02, steam=True)
Y.bowl(k, 10.5, 4.25, 1.02, broth='#e0a050')
Y.bowl(k, 3.2, 4.3, 1.02, broth='#8a4a20')
for x in (2.5, 5.5, 8.5, 11.5):
    Y.paper_lantern(k, x, 5.0, 2.5, col='#e07020' if x in (5.5, 8.5) else '#e03030')

# ---- tables ---------------------------------------------------------------------------------------
for (tx, broth) in ((3.5, '#c88a40'), (9.5, '#d09048')):
    Y.cafe_table(k, tx, 7.5, top='#3a1e1e', neon=Y.PINK)
    Y.neon_stool(k, tx - 0.95, 7.55)
    Y.neon_stool(k, tx + 0.95, 7.55)
    Y.bowl(k, tx, 7.45, 0.76, broth=broth)

for (x, r) in ((3.5, 7.0), (9.5, 7.0), (7.0, 5.6)):
    k.point_light(x, r, 2.4, '#ff9a70', 40, radius=0.6)
k.point_light(7.0, 3.0, 2.4, '#ffd0a0', 30, radius=0.8)          # kitchen

render(k, sys.argv[1], ambient=('#2a1428', 0.4))
apply_world(world_path('cyber-noodle-bar'), k, FLOOR, doors=DOORS, scene_id='cyber-noodle-bar', moves={
    'CHEF': (9, 4), 'NOODLE POT': (6, 4), 'PATRON': [(5, 5), (10, 5)], 'MENU BOARD': (4, 4),
    'TABLE': [(3, 7), (9, 7)], 'COOLER': (2, 4)},
    actors=[{'sheet': 'npc-noodle-chef', 'x': 9, 'y': 3, 'facing': 'down'},
            {'sheet': 'npc-patron-a', 'x': 5, 'y': 5, 'facing': 'up', 'pose': 'sit'},
            {'sheet': 'npc-patron-b', 'x': 10, 'y': 5, 'facing': 'up', 'pose': 'sit'}])
print('noodle bar done')
