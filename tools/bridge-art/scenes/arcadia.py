"""Arcadia Arcade — Blender scene. Usage: BVENV/bin/python arcadia.py RENDER_DIR

The District's arcade, laid out so every cabinet faces an open floor: the
classics down the back wall either side of the two big RUNOUTS tournament
cabinets under the ARCADIA sign, the high-score boards at the ends (they
show your own best scores — js/games.js), a vending machine and an attract
cabinet on the left, the broken one in the right-hand corner where the
Stranger waits, tables and benches along the front. Every cabinet has the
tile in front of it clear to stand on.
"""
import math
import os
import sys
from _cyber_room import Y, H, render, apply_world, world_path
from scenekit import Kit

COLS, ROWS = 18, 12
FLOOR = (1, 2, 16, 9)
DOORS = [(8, 10), (9, 10)]
k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=101)
Y.cyber_room(k, 1, 2, 17, 10, H, door=(8.0, 10.0), floor_tones=('#221a38', '#2e2648'))

# ---- back wall: the boards, the sign ------------------------------------------------------------
Y.highscore_board(k, 1.75, 2.0)
Y.highscore_board(k, 16.25, 2.0, title=Y.CYAN_L)
Y.neon_text(k, 'ARCADIA', 9.0, 2.16, 2.2, h=0.5, col=Y.PINK, energy=10)          # proud of the wall's ribs
Y.glow_poster(k, 2.9, 2.0, 2.1, w=0.5, h=0.6, kind=0)
Y.glow_poster(k, 15.1, 2.0, 2.1, w=0.5, h=0.6, bg='#0a2030', accent=Y.CYAN, kind=1)

# ---- the classics, either side of RUNOUTS ------------------------------------------------------
CLASSICS = [('ASTEROIDS', '/asteroids', 'asteroids', 3.5, '#04040c', '#e8e8f0', Y.CYAN),
            ('HELICOPTER', '/helicopter', 'helicopter', 5.0, '#041008', Y.GREEN, Y.GREEN),
            ('BREAKOUT', '/breakout', 'breakout', 6.5, '#08040c', Y.YEL, Y.PINK),
            ('INVADERS', '/space-invaders', 'invaders', 11.5, '#020a04', Y.GREEN, Y.PURP),
            ('MISSILE CMD', '/missile-command', 'missile', 13.0, '#08020a', Y.RED, Y.RED)]
for (_, _, art, cx, scr, mq, side) in CLASSICS:
    Y.arcade_cabinet(k, cx, 2.05, art=art, screen=scr, marquee=mq, side=side)
for cx in (8.1, 9.9):                                     # the RUNOUTS tournament pair, under the sign
    Y.arcade_cabinet(k, cx, 2.05, art='runouts', screen='#100418', marquee=Y.PINK, side=Y.PINK, w=1.6, energy=9)
k.box(7.15, 2.05, 0.0, 10.85, 3.25, 0.03, ('#3a1840', 0.1), 'stage')            # a raised plate under them
k.box(7.15, 3.2, 0.03, 10.85, 3.25, 0.06, '#200818', 'stage_led', emit=(Y.PINK, 0.8))

# ---- left: vending machine and an attract cabinet -----------------------------------------------------
Y.vending_machine(k, 1.55, 4.3, w=0.8)
Y.arcade_cabinet(k, 1.55, 6.3, art='attract', screen='#0a0418', marquee=Y.PURP, side=Y.CYAN)

# ---- right: the broken cabinet in the corner, where the Stranger waits ----------------------------------
Y.arcade_cabinet(k, 16.45, 4.3, broken=True)
Y.arcade_cabinet(k, 16.45, 6.3, art='attract', screen='#0a0418', marquee=Y.CYAN, side=Y.PURP)
k.solid(15, 5, 16, 6)                                    # the Stranger

# ---- the front: tables and benches, clear of the door --------------------------------------------------
for (tx, neon) in ((4.0, Y.PINK), (13.0, Y.CYAN)):
    Y.cafe_table(k, tx, 8.4, neon=neon)
    Y.neon_stool(k, tx - 0.8, 8.45, seat=neon)
    Y.neon_stool(k, tx + 0.8, 8.45, seat=neon)
    k.cyl(tx - 0.12, 8.3, 0.76, 0.9, 0.05, neon, 'cup', emit=(neon, 0.4), verts=8)
Y.metal_bench(k, 1.1, 2.4, 9.45)
Y.metal_bench(k, 15.6, 16.9, 9.45, neon=Y.PINK)

# ---- light ---------------------------------------------------------------------------------------------------
for (x, r, c) in ((4.5, 4.5, '#a060ff'), (13.5, 4.5, '#ff60c0'), (9.0, 4.2, '#ff70b0'), (9.0, 7.5, '#6080ff'),
                  (2.0, 7.5, '#60a0ff'), (16.0, 7.5, '#a060ff')):
    k.point_light(x, r, 2.6, c, 58, radius=0.6)

render(k, sys.argv[1], ambient=('#2c2048', 0.6))

import json                                   # noqa: E402
WORLD = world_path('arcadia')
w = json.load(open(WORLD))
old = {i['label']: i for i in w['interactions']}
w.update({'width': COLS, 'height': ROWS, 'spawns': {'player': [8, 9]}})


def cab(x, y, label, url):
    return {'x': x, 'y': y, 'type': 'cabinet', 'target': url, 'label': label, 'prompt': 'PRESS E TO PLAY'}


def keep(label, x, y):
    it = dict(old[label]); it.update({'x': x, 'y': y})
    return it


w['interactions'] = [
    {'x': 8, 'y': 10, 'type': 'leave_world', 'label': 'STREET', 'prompt': 'RETURN TO STREET', 'leaveTo': 'arcadia-street', 'leaveSpawn': [12, 8]},
    {'x': 9, 'y': 10, 'type': 'leave_world', 'label': 'STREET', 'prompt': 'RETURN TO STREET', 'leaveTo': 'arcadia-street', 'leaveSpawn': [13, 8]},
] + [cab(int(cx), 2, label, url) for (label, url, _, cx, _, _, _) in CLASSICS] + [
    cab(7, 2, 'RUNOUTS', '/runouts'), cab(8, 2, 'RUNOUTS', '/runouts'), cab(9, 2, 'RUNOUTS', '/runouts'), cab(10, 2, 'RUNOUTS', '/runouts'),
    {'x': 1, 'y': 2, 'type': 'game_scores', 'label': 'HIGH SCORES', 'prompt': 'PRESS E TO READ', 'arcade': True},
    {'x': 16, 'y': 2, 'type': 'game_scores', 'label': 'HIGH SCORES', 'prompt': 'PRESS E TO READ', 'arcade': True},
    keep('VENDING MACHINE', 1, 4),
    keep('STRANGER', 15, 5),
    keep('???', 16, 4),
    {'x': 1, 'y': 6, 'type': 'dialog', 'label': 'ATTRACT MODE', 'prompt': 'PRESS E TO LOOK',
     'dialog': "AN OLD CABINET RUNNING ITS DEMO FOREVER, A LITTLE SHIP DODGING ROCKS THAT AREN'T THERE.\n\nINSERT COIN, IT SAYS. THE COIN SLOT IS TAPED OVER."},
    {'x': 16, 'y': 6, 'type': 'dialog', 'label': 'ATTRACT MODE', 'prompt': 'PRESS E TO LOOK',
     'dialog': "THE DEMO LOOPS: A PILOT IN A PURPLE SUIT WALKS INTO AN ARCADE, PLAYS A GAME, AND WALKS OUT.\n\nYOU WATCH IT TWICE TO BE SURE."},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id='arcadia',
            actors=[{'sheet': 'npc-stranger', 'x': 15, 'y': 5, 'facing': 'down'}])
print('arcadia done')
