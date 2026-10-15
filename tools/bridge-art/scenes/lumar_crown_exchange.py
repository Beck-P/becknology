"""The Merchants' Exchange in Crownhaven — the trading hall (world id "lumar-crown-exchange").
Usage: BVENV/bin/python lumar_crown_exchange.py RENDER_DIR

A tall stone hall: a floor of green and cream marble, two rows of columns, and across the back wall the great board
where the clerks chalk every port's prices (the `exchange` interaction, js/harbour.js) under a gilt clock. In the middle
the trading ring, a brass rail round a bare circle where the brokers shout. The Charter Office's high desk on the left,
where the registrar lets out the long hauls (`charters`, js/trade.js); clerks at their ledgers; on the right, samples of
every good on the seas laid out on trestles, the brass scales, the underwriters' bench.
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade
import assets_town as W

OUT = sys.argv[1]
WID = 'lumar-crown-exchange'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 22, 14
H = 2.6 / math.cos(THETA)                             # a tall hall: the back wall reads 2.6 tiles
FLOOR = (1, 2, 20, 11)
DOORS = [(10, 12), (11, 12)]
MARBLE, MARBLE_G = '#d8d0bc', '#2e5a46'
STONE = '#a8a090'
GOLD = '#c8a040'

k = Kit(COLS, ROWS, margin_top=1.6, margin_bottom=0.5, seed=4411)

# ---- the shell: marble chequers, stone walls with pilasters ----------------------------------------------------
k.box(0.4, 1.5, -0.12, 21.6, 12.0, -0.02, '#1a1a16', 'subfloor')
for r in range(2, 12):
    for c in range(1, 21):
        col = MARBLE if (r + c) % 2 == 0 else MARBLE_G
        k.box(c + 0.01, r + 0.01, -0.04, c + 0.99, r + 0.99, 0.0, (shade(col, k.rng.uniform(0.95, 1.04)), 0.06), 'marble')
for c in range(1, 21):                                  # a cream border along the back
    k.box(c + 0.01, 1.99, -0.04, c + 0.99, 2.0, 0.0, MARBLE, 'marble_edge')
A.back_wall(k, 0.4, 21.6, 2.0, H, plaster=STONE, wainscot=0.7, wainscot_col='#6a6458', beams_every=0, stone=True)
for x in (1.4, 5.0, 17.0, 20.6):                        # pilasters up the back wall
    k.box(x - 0.22, 1.95, 0, x + 0.22, 2.12, H, (shade(STONE, 1.08), 0.1), 'pilaster')
    k.box(x - 0.3, 1.95, H - 0.3, x + 0.3, 2.18, H - 0.12, (shade(STONE, 1.15), 0.1), 'pilaster_cap')
k.box(0.4, 1.9, H - 0.12, 21.6, 2.2, H + 0.05, (shade(STONE, 1.12), 0.1), 'cornice')
A.side_wall(k, 0.4, 1.0, 1.5, 12.0, H)
A.side_wall(k, 21.0, 21.6, 1.5, 12.0, H)
A.front_wall(k, 0.4, 21.6, 12.0, gaps=[(10.0, 12.0)])
A.door_frame(k, 10.0, 12.0, 12.0)

# ---- the great board: chalked columns for every port, the clerks' ladder, the gilt clock above ---------------------
BX0, BX1, BZ0, BZ1 = 6.0, 16.0, 0.9, 2.55
k.box(BX0 - 0.15, 1.95, BZ0 - 0.15, BX1 + 0.15, 2.05, BZ1 + 0.15, ('#4a3418', 0.12), 'board_frame')
k.box(BX0, 2.05, BZ0, BX1, 2.07, BZ1, ('#1e2a24', 0.1), 'board_slate')
for i in range(7):                                      # seven ports, a column each: a name in gold, prices in chalk
    x = BX0 + 0.25 + i * (BX1 - BX0 - 0.5) / 7
    k.box(x + 0.05, 2.07, BZ1 - 0.22, x + 1.15, 2.075, BZ1 - 0.12, (GOLD, 0.1), 'board_head', emit=('#806020', 0.15))
    for j in range(5):
        zz = BZ1 - 0.42 - j * 0.24
        k.box(x + 0.1, 2.07, zz, x + 0.25 + 0.6 * k.rng.uniform(0.5, 1.0), 2.075, zz + 0.05, ('#d8d8cc', 0.1), 'chalk')
    k.box(x + 1.27, 2.07, BZ0 + 0.05, x + 1.29, 2.075, BZ1 - 0.08, ('#8a8a80', 0.1), 'board_rule')
k.box(BX0, 2.07, BZ0 - 0.1, BX1, 2.2, BZ0, ('#4a3418', 0.12), 'chalk_ledge')
for x in (BX0 + 2.0, BX0 + 6.2):                        # chalk stubs and a rag on the ledge
    k.box(x, 2.1, BZ0, x + 0.1, 2.14, BZ0 + 0.03, ('#f0f0e8', 0.1), 'chalk_stub')
k.tube((15.6, 2.25, 0.0), (15.75, 2.12, 2.5), 0.04, ('#7a5a30', 0.12), 'ladder_rail', verts=6)    # the clerks' ladder
k.tube((16.1, 2.25, 0.0), (16.25, 2.12, 2.5), 0.04, ('#7a5a30', 0.12), 'ladder_rail', verts=6)
for i in range(7):
    t = 0.12 + i * 0.13
    k.tube((15.6 + 0.15 * t, 2.25 - 0.13 * t, 2.5 * t), (16.1 + 0.15 * t, 2.25 - 0.13 * t, 2.5 * t), 0.02, ('#7a5a30', 0.12), 'ladder_rung', verts=6)
k.solid(15.4, 2.0, 16.4, 2.6)
CXC, CZC = 11.0, H - 0.55                               # the clock
k.cyl_y(CXC, 1.95, 2.12, CZC, 0.55, 0.55, (GOLD, 0.08), 'clock_rim', verts=24)
k.cyl_y(CXC, 2.1, 2.14, CZC, 0.46, 0.46, '#f0e8d0', 'clock_face', verts=24, emit=('#fff0c0', 0.2))
k.tube((CXC, 2.15, CZC), (CXC + 0.25, 2.15, CZC + 0.18), 0.025, ('#1a1a1a', 0.1), 'clock_hand', verts=4)
k.tube((CXC, 2.15, CZC), (CXC - 0.05, 2.15, CZC + 0.36), 0.02, ('#1a1a1a', 0.1), 'clock_hand', verts=4)
for a in range(12):
    ang = a * math.pi / 6
    k.box(CXC + math.cos(ang) * 0.38 - 0.02, 2.14, CZC + math.sin(ang) * 0.38 - 0.02, CXC + math.cos(ang) * 0.38 + 0.02, 2.15,
          CZC + math.sin(ang) * 0.38 + 0.02, ('#2a2a2a', 0.1), 'clock_tick')
k.solid(5.8, 2.0, 16.2, 2.5)

# ---- two rows of columns down the hall -----------------------------------------------------------------------
for x in (5.0, 17.0):
    for r in (4.5, 7.5, 10.5):
        k.box(x - 0.36, r - 0.36, 0.0, x + 0.36, r + 0.36, 0.22, (shade(MARBLE, 0.95), 0.08), 'col_base', bevel=0.02)
        k.cyl(x, r, 0.22, H - 0.3, 0.24, (MARBLE, 0.08), 'column', verts=16)
        for f in range(8):                              # fluting
            a = f * math.pi / 4
            k.box(x + math.cos(a) * 0.23 - 0.02, r + math.sin(a) * 0.23 - 0.02, 0.3, x + math.cos(a) * 0.23 + 0.02,
                  r + math.sin(a) * 0.23 + 0.02, H - 0.4, (shade(MARBLE, 0.86), 0.08), 'col_flute')
        k.box(x - 0.34, r - 0.34, H - 0.3, x + 0.34, r + 0.34, H - 0.1, (shade(MARBLE, 1.05), 0.08), 'col_capital', bevel=0.02)
        k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)

# ---- the trading ring: a brass rail round a bare circle ------------------------------------------------------
RC, RR = (11.0, 7.4), 1.6
W.annulus(k, RC[0], RC[1], RR - 0.15, RR + 0.15, 0.0, 0.05, ('#4a3418', 0.12), 'ring_step')
for a in range(16):
    ang = a * math.pi / 8
    k.cyl(RC[0] + math.cos(ang) * RR, RC[1] + math.sin(ang) * RR, 0.0, 0.85, 0.035, ('#8a6a30', 0.2), 'ring_post', verts=8)
W.annulus(k, RC[0], RC[1], RR - 0.05, RR + 0.05, 0.85, 0.92, ('#d0a048', 0.3), 'ring_rail')
for (dx, dr) in ((-0.5, -0.3), (0.6, 0.2), (0.0, 0.7)):  # slips of paper on the floor inside it
    k.box(RC[0] + dx, RC[1] + dr, 0.0, RC[0] + dx + 0.2, RC[1] + dr + 0.14, 0.01, ('#f0e8d0', 0.1), 'slip')
k.solid(RC[0] - RR, RC[1] - RR, RC[0] + RR, RC[1] + RR)   # the brokers' floor: you walk round it

# ---- the Charter Office (left): the registrar's high desk, pigeonholes of charters, a clerk at a ledger -------------
k.box(1.2, 3.6, 0.0, 4.6, 4.3, 1.15, ('#4a2e18', 0.12), 'desk_front', bevel=0.02)
k.box(1.1, 3.55, 1.15, 4.7, 4.4, 1.22, ('#6a4426', 0.12), 'desk_top', bevel=0.02)
for i in range(4):
    k.box(1.4 + i * 0.8, 4.28, 0.2, 1.9 + i * 0.8, 4.31, 0.95, ('#3a2412', 0.12), 'desk_panel')
k.box(2.4, 3.7, 1.22, 3.2, 4.1, 1.27, ('#e8dcc0', 0.1), 'charter_book')
k.box(2.42, 3.72, 1.27, 2.78, 4.08, 1.29, ('#f4ecd8', 0.1), 'charter_page')
A.candle(k, 4.2, 3.9, 1.22, energy=1.6)
k.cyl(1.6, 3.85, 1.22, 1.32, 0.06, ('#2a2a30', 0.15), 'inkwell', verts=8)
k.tube((1.6, 3.85, 1.3), (1.7, 3.75, 1.55), 0.01, ('#f0f0e8', 0.1), 'quill', verts=4)
k.box(1.2, 2.15, 0.8, 4.6, 2.5, 2.4, ('#4a2e18', 0.12), 'pigeonholes')     # pigeonholes of rolled charters
for i in range(6):
    for j in range(4):
        x, zz = 1.35 + i * 0.54, 0.92 + j * 0.37
        k.box(x, 2.48, zz, x + 0.46, 2.5, zz + 0.3, ('#24160a', 0.12), 'hole')
        if (i + j) % 3:
            k.cyl_y(x + 0.23, 2.32, 2.52, zz + 0.13, 0.08, 0.08, ('#e8dcc0', 0.1), 'scroll', verts=8)
k.solid(1.0, 2.0, 4.8, 4.4)
V_BOARD = ('CHARTER OFFICE', 2.9, 2.08, 2.55)
import assets_village as V  # noqa: E402
V.board_sign(k, V_BOARD[0], 'AlegreyaSC-Bold', V_BOARD[1], V_BOARD[2] + 0.45, V_BOARD[3], size=0.17, board='#2a3a30')

A.ledger_desk(k, 1.4, 3.6, 7.25, 7.8)                    # a clerk's ledger desk, the clerk behind it
A.desk_lamp(k, 3.3, 7.4, 0.95, energy=3.0)
A.book_stack(k, 1.6, 7.45, n=3)
k.box(1.1, 6.05, 0.0, 1.4, 6.95, 1.6, ('#3e2616', 0.12), 'file_case')
for j in range(4):
    k.box(1.38, 6.1, 0.15 + j * 0.37, 1.41, 6.9, 0.45 + j * 0.37, ('#5e3b1e', 0.12), 'file_drawer')
k.solid(2, 6, 3, 7)
A.ledger_desk(k, 1.4, 3.6, 9.85, 10.4)
A.book_stack(k, 1.7, 10.0, n=4)
A.desk_lamp(k, 3.3, 10.0, 0.95, energy=3.0)

# ---- the samples (right): a trestle of every good, the brass scales, the underwriters' bench ------------------------
def trestle(x0, x1, r):
    k.box(x0, r - 0.32, 0.72, x1, r + 0.32, 0.78, ('#7a5a34', 0.12), 'trestle_top', bevel=0.02)
    for x in (x0 + 0.2, x1 - 0.2):
        k.tube((x, r - 0.25, 0.0), (x, r, 0.72), 0.03, ('#4a2e18', 0.12), 'trestle_leg', verts=6)
        k.tube((x, r + 0.25, 0.0), (x, r, 0.72), 0.03, ('#4a2e18', 0.12), 'trestle_leg', verts=6)
    k.solid(x0, r - 0.4, x1, r + 0.4)


trestle(19.4, 20.8, 4.0)
trestle(19.4, 20.8, 6.0)
GOODS = [('#c8c0a8', 'fish'), ('#d8b040', 'oil'), ('#9a7a4a', 'timber'), ('#8ac8d8', 'glass'), ('#d8a8c8', 'silk'),
         ('#e080a0', 'roseite'), ('#8a3a1a', 'rum'), ('#2a2a2a', 'powder'), ('#c8d0f0', 'moonsalt')]
for i, (col, kind) in enumerate(GOODS):
    x, r = 19.6 + (i % 3) * 0.45, (3.85 if i < 6 else 5.85) + ((i // 3) % 2) * 0.3
    if kind in ('oil', 'rum', 'powder'):
        k.cyl(x, r, 0.78, 1.0, 0.11, (col, 0.15), 'sample_' + kind, verts=10)
    elif kind in ('glass', 'roseite', 'moonsalt'):
        k.cyl(x, r, 0.78, 0.96, 0.08, (col, 0.05), 'sample_' + kind, verts=10, emit=(col, 0.25) if kind != 'glass' else None)
        k.cyl(x, r, 0.96, 1.0, 0.05, ('#6a4426', 0.12), 'sample_cork', verts=8)
    else:
        k.box(x - 0.15, r - 0.1, 0.78, x + 0.15, r + 0.1, 0.92, (col, 0.15), 'sample_' + kind)
k.box(19.6, 6.25, 0.78, 20.0, 6.45, 0.8, ('#f0e8d0', 0.1), 'sample_tag')
SC = (20.1, 8.4)                                        # the brass scales on a stand
k.cyl(SC[0], SC[1], 0.0, 0.08, 0.3, ('#3a2a1a', 0.12), 'scale_base', verts=12)
k.cyl(SC[0], SC[1], 0.08, 1.3, 0.04, ('#d0a048', 0.3), 'scale_post', verts=8)
k.tube((SC[0] - 0.5, SC[1], 1.3), (SC[0] + 0.5, SC[1], 1.28), 0.025, ('#d0a048', 0.3), 'scale_beam', verts=6)
for dx in (-0.5, 0.5):
    k.tube((SC[0] + dx, SC[1], 1.28), (SC[0] + dx, SC[1], 0.95), 0.008, ('#8a6a30', 0.3), 'scale_chain', verts=4)
    k.cyl(SC[0] + dx, SC[1], 0.92, 0.95, 0.2, ('#d0a048', 0.3), 'scale_pan', verts=14)
k.solid(19.5, 8.0, 20.7, 8.8)
A.bench(k, 13.6, 16.4, 10.6)                            # benches for the waiting
A.bench(k, 5.6, 8.4, 10.6)
for x in (1.6, 20.4):
    A.potted_plant(k, x, 10.9)

# ---- light: chandeliers down the hall, lamps on the board ----------------------------------------------------
for (x, r, e) in ((6.0, 5.5, 150), (16.0, 5.5, 150), (11.0, 7.4, 170), (6.0, 9.5, 110), (16.0, 9.5, 110), (2.8, 4.0, 90)):
    A.hanging_lamp(k, x, r, z=2.6, energy=e, visible=False)
for x in (7.5, 11.0, 14.5):
    k.point_light(x, 3.0, 2.9, '#ffe0a0', 30, radius=0.2)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.85}}, light_samples=128, world_light=('#3a4258', 0.5))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': "The Merchants' Exchange", 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
          'spawns': {'player': [10, 11]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-crown', 'leaveSpawn': [17, 19], 'label': 'THE SQUARE', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 11, 'y': 2, 'type': 'exchange', 'label': 'THE BOARD', 'prompt': 'PRESS E TO READ THE BOARD'},
    {'x': 8, 'y': 2, 'type': 'exchange', 'label': 'THE BOARD', 'prompt': 'PRESS E TO READ THE BOARD'},
    {'x': 14, 'y': 2, 'type': 'exchange', 'label': 'THE BOARD', 'prompt': 'PRESS E TO READ THE BOARD'},
    {'x': 3, 'y': 4, 'type': 'charters', 'label': 'CHARTER OFFICE', 'prompt': 'PRESS E TO ASK'},
    {'x': 2, 'y': 3, 'type': 'dialog', 'label': 'REGISTRAR', 'prompt': 'PRESS E TO TALK',
     'dialog': 'THE REGISTRAR LOOKS AT YOU OVER HALF-MOON SPECTACLES. "CHARTERS ARE FOR CAPTAINS WITH HOLDS, NOT POCKETS. WHAT ARE YOU SAILING?"'},
    {'x': 2, 'y': 6, 'type': 'dialog', 'label': 'CLERK', 'prompt': 'PRESS E TO TALK',
     'dialog': 'A CLERK WITH INK TO THE ELBOW, NOT LOOKING UP. "SALT FISH UP TWO AT SAPPHIRE. GLASS DOWN AT ROSE. NOBODY WANTS RUM BUT EVERYBODY BUYS IT."'},
    {'x': 11, 'y': 7, 'type': 'dialog', 'label': 'THE RING', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE TRADING RING. AT THE BELL THE BROKERS PILE IN AND SHOUT UNTIL THE PRICE OF TIMBER IS SETTLED FOR THE DAY. RIGHT NOW TWO OF THEM ARE ARGUING ABOUT LUNCH.'},
    {'x': 20, 'y': 4, 'type': 'dialog', 'label': 'SAMPLES', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A SAMPLE OF EVERY GOOD ON THE SEAS, LABELLED IN A NEAT HAND: SALT FISH, SPORE-LAMP OIL, PINE, SAPPHIRE GLASS, SPORE SILK, ROSEITE, EMBER RUM, BLACK POWDER - AND IN A STOPPERED JAR, MOON SALT, "NOT FOR TASTING."'},
    {'x': 20, 'y': 8, 'type': 'dialog', 'label': 'SCALES', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE EXCHANGE SCALES. A CRATE IS WHAT THESE SAY IT IS, AND NOTHING ELSE.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=[
    {'sheet': 'npc-registrar', 'x': 2, 'y': 3, 'facing': 'down'},
    {'sheet': 'npc-clerk', 'x': 2, 'y': 6, 'facing': 'down'},
])
print('exchange done')
