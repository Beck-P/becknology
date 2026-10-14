"""Arcadia Arcade — Blender scene. Usage: BVENV/bin/python arcadia.py RENDER_DIR"""
import sys
from _cyber_room import Y, H, FLOOR, DOORS, new_kit, render, apply_world, world_path

k = new_kit(101)
Y.cyber_room(k, 1, 2, 13, 9, H, floor_tones=('#221a38', '#2e2648'))

# ---- back wall: scores, posters, neon, the sign -------------------------------------
Y.highscore_board(k, 1.55, 2.0)
Y.highscore_board(k, 12.45, 2.0, title=Y.CYAN_L)
Y.glow_poster(k, 2.75, 2.0, 0.95, kind=0)
Y.glow_poster(k, 4.3, 2.0, 0.95, bg='#0a2030', accent=Y.CYAN, kind=1)
Y.glow_poster(k, 9.7, 2.0, 0.95, bg='#301008', accent=Y.YEL, kind=2)
Y.glow_poster(k, 11.0, 2.0, 0.95, bg='#2a0a30', accent=Y.PINK_D, kind=0)
Y.neon_text(k, 'ARCADIA', 7.0, 2.0, 1.7, h=0.5, col=Y.PINK, energy=10)
Y.neon_text(k, 'PLAY', 7.0, 2.0, 1.0, h=0.3, col=Y.CYAN, board=False, energy=5)
Y.neon_shape(k, [(5.6, 1.15), (5.95, 1.15), (5.95, 1.35), (5.6, 1.35)], 2.06, Y.YEL)        # joystick sign
Y.neon_shape(k, [(5.78, 1.35), (5.78, 1.6)], 2.06, Y.YEL, closed=False)
Y.neon_shape(k, [(8.2 + 0.18 * __import__('math').cos(a * 1.2566), 1.35 + 0.18 * __import__('math').sin(a * 1.2566))
                 for a in (0, 2, 4, 1, 3)], 2.06, Y.PURP)                                       # star sign

# ---- the row of classics ---------------------------------------------------------------------
Y.vending_machine(k, 1.5, 4.0)
for (cx, art, scr, mq, side) in ((3.5, 'asteroids', '#04040c', '#e8e8f0', Y.CYAN), (5.5, 'helicopter', '#041008', Y.GREEN, Y.GREEN),
                                 (7.5, 'breakout', '#08040c', Y.YEL, Y.PINK), (9.5, 'invaders', '#020a04', Y.GREEN, Y.PURP),
                                 (11.5, 'missile', '#08020a', Y.RED, Y.RED)):
    Y.arcade_cabinet(k, cx, 4.0, art=art, screen=scr, marquee=mq, side=side)

# ---- middle: RUNOUTS doubles and odd cabinets -------------------------------------------------------
Y.arcade_cabinet(k, 1.5, 6.0, art='attract', screen='#0a0418', marquee=Y.PURP, side=Y.CYAN)
Y.arcade_cabinet(k, 4.0, 6.0, art='runouts', screen='#100418', marquee=Y.PINK, side=Y.PINK, w=1.7, energy=9)
Y.arcade_cabinet(k, 9.0, 6.0, art='runouts', screen='#100418', marquee=Y.PINK, side=Y.PINK, w=1.7, energy=9)
Y.arcade_cabinet(k, 11.5, 6.0, art='attract', screen='#0a0418', marquee=Y.CYAN, side=Y.PURP)
k.solid(6, 6, 7, 7)                       # the stranger

# ---- front: benches, tables, the broken one ------------------------------------------------------------
Y.metal_bench(k, 1.05, 1.95, 8.4)
Y.cafe_table(k, 3.5, 8.3)
Y.arcade_cabinet(k, 5.5, 7.95, broken=True)
Y.cafe_table(k, 9.5, 8.3, neon=Y.CYAN)
Y.metal_bench(k, 11.05, 11.95, 8.4, neon=Y.PINK)
for (x, r) in ((3.4, 8.2), (9.6, 8.25)):
    k.cyl(x, r, 0.76, 0.9, 0.05, Y.PINK, 'cup', emit=(Y.PINK, 0.4), verts=8)

# ---- light ---------------------------------------------------------------------------------------------------
for (x, r, c) in ((3.5, 5.0, '#a060ff'), (10.5, 5.0, '#ff60c0'), (7.0, 7.5, '#6080ff')):
    k.point_light(x, r, 2.6, c, 40, radius=0.6)

render(k, sys.argv[1], ambient=('#241a40', 0.4))
# the aisle tiles behind the cabinet rows: you'd vanish behind the cabinets
for (x, y) in ((1, 3), (1, 5), (3, 3), (3, 5), (4, 5), (5, 3), (7, 3), (8, 5), (9, 3), (9, 5), (11, 3), (11, 5)):
    k.solid(x, y, x + 1, y + 1)
apply_world(world_path('arcadia'), k, FLOOR, doors=DOORS, scene_id='arcadia', moves={
    'HIGH SCORES': [(1, 2), (12, 2)], 'ARCADIA': (7, 2), 'VENDING MACHINE': (1, 4)},
    actors=[{'sheet': 'npc-stranger', 'x': 6, 'y': 6, 'facing': 'down'}])
print('arcadia done')
