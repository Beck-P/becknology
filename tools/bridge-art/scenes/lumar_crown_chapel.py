"""St Brendan's, Crownhaven — the sailors' church (world id "lumar-crown-chapel").
Usage: BVENV/bin/python lumar_crown_chapel.py RENDER_DIR

A tall nave of pale stone. Behind the altar a great window of coloured glass — a ship under a star — glowing; lancets
either side. Pews in two blocks down a flagged aisle, a votive ship hanging over it on chains (the old custom: a model
of a ship that came home). The candle stand for the missing, a hundred little flames (`chapel_candle`: light one and the
next voyage is blessed — js/crown.js); the memorial board of lost ships; the font by the door; the bell rope in the
corner (`chapel_bell`). Mother Coralie keeps it.
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade
import assets_town as W
import assets_village as V

OUT = sys.argv[1]
WID = 'lumar-crown-chapel'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 16, 15
H = 3.0 / math.cos(THETA)
FLOOR = (1, 2, 14, 12)
DOORS = [(7, 13), (8, 13)]
STONE = '#b0a898'
GOLD = '#d0a848'

k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=0.5, seed=4423)

# ---- the shell: flags, pale stone, a ribbed ceiling line ----------------------------------------------------------
A.floor_flags(k, 1, 2, 15, 13, tone='#8a8478')
for r in range(5, 13):                                  # the aisle: long slabs, worn
    k.box(7.05, r + 0.03, -0.035, 8.95, r + 0.97, 0.002, (shade('#9a9488', 1.0 + 0.04 * (r % 2)), 0.1), 'aisle')
A.back_wall(k, 0.4, 15.6, 2.0, H, plaster=STONE, wainscot=0, beams_every=0, stone=True)
for x in (3.0, 13.0):                                   # buttress pilasters
    k.box(x - 0.25, 1.95, 0, x + 0.25, 2.15, H, (shade(STONE, 1.08), 0.1), 'pilaster')
A.side_wall(k, 0.4, 1.0, 1.5, 13.0, H)
A.side_wall(k, 15.0, 15.6, 1.5, 13.0, H)
A.front_wall(k, 0.4, 15.6, 13.0, gaps=[(7.0, 9.0)])
A.door_frame(k, 7.0, 9.0, 13.0)

# ---- the sanctuary: a raised step, the altar, the great window ----------------------------------------------------
k.box(4.0, 2.0, 0.0, 12.0, 4.2, 0.18, ('#a8a090', 0.12), 'step', bevel=0.02)
k.box(4.4, 2.0, 0.18, 11.6, 3.8, 0.32, ('#b8b0a0', 0.12), 'step2', bevel=0.02)
k.box(6.4, 2.5, 0.32, 9.6, 3.2, 1.25, ('#e8e0d0', 0.08), 'altar', bevel=0.02)
k.box(6.3, 2.45, 1.25, 9.7, 3.25, 1.32, ('#f4f0e6', 0.08), 'altar_cloth')
k.box(7.6, 3.24, 0.4, 8.4, 3.27, 1.25, ('#2a5a8a', 0.1), 'altar_frontal')
k.box(7.9, 3.27, 0.6, 8.1, 3.28, 1.05, (GOLD, 0.2), 'frontal_cross')
k.box(7.7, 3.27, 0.78, 8.3, 3.28, 0.86, (GOLD, 0.2), 'frontal_cross')
for x in (6.8, 9.2):                                    # gold candlesticks
    k.cyl(x, 2.85, 1.32, 1.36, 0.1, (GOLD, 0.2), 'candlestick', verts=10)
    k.cyl(x, 2.85, 1.36, 1.8, 0.03, (GOLD, 0.2), 'candlestick', verts=8)
    A.candle(k, x, 2.85, 1.8, energy=3.0)
k.box(7.7, 2.7, 1.32, 8.3, 3.05, 1.4, ('#7a2a22', 0.12), 'book')
k.box(7.72, 2.72, 1.4, 8.28, 3.03, 1.42, ('#f0e8d4', 0.1), 'book_page')
k.solid(4.0, 2.0, 12.0, 3.4)
# the great window: a pointed lancet of coloured panes — sea, a ship, a star
WX, WZ0, WZ1, WW = 8.0, 1.6, 3.5, 1.5


def lancet(cx, z0, z1, w, panes, part):
    k.box(cx - w / 2 - 0.12, 1.95, z0 - 0.12, cx + w / 2 + 0.12, 2.04, z1 + 0.15, ('#6a6458', 0.12), part + '_frame')
    rows_ = len(panes)
    for j, row in enumerate(panes):
        zz0 = z0 + (z1 - z0) * j / rows_
        zz1 = z0 + (z1 - z0) * (j + 1) / rows_
        n = len(row)
        for i, col in enumerate(row):
            narrow = (j == rows_ - 1)                         # the pointed head: narrower panes at the top
            xx0 = cx - w / 2 + w * i / n + (0.15 * w if narrow and i == 0 else 0)
            xx1 = cx - w / 2 + w * (i + 1) / n - (0.15 * w if narrow and i == n - 1 else 0)
            k.box(xx0 + 0.02, 2.04, zz0 + 0.02, xx1 - 0.02, 2.06, zz1 - 0.02, (shade(col, 0.5), 0.05), part, emit=(col, 0.95))
    k.box(cx - 0.03, 2.04, z0, cx + 0.03, 2.08, z1, ('#3a3430', 0.12), part + '_mullion')


SEA_, SKY, SAIL, HULL, STAR, ROSE = '#2a7a9a', '#2a3a8a', '#f0e8c8', '#8a4a22', '#ffd860', '#c83a5a'
lancet(WX, WZ0, WZ1, WW, [[SEA_, SEA_, SEA_, SEA_], [SEA_, HULL, HULL, SEA_], [SKY, SAIL, SAIL, SKY], [SKY, SAIL, SKY, SKY],
                          [SKY, STAR, STAR, SKY], [ROSE, STAR, ROSE]], 'great_window')
for x in (4.6, 11.4):
    lancet(x, 1.4, 3.0, 0.55, [['#3a8a5a', '#2a6a8a'], ['#c8a040', '#3a8a5a'], ['#2a6a8a', '#c83a5a'], ['#c8a040']], 'lancet')
k.area_light(WX, 2.8, 2.2, '#c8b0ff', 60, 1.6, rot=(math.radians(-60), 0, 0))
k.point_light(WX, 3.6, 2.4, '#ffd8a0', 25, radius=0.4)

# ---- the votive ship over the aisle, on two chains -------------------------------------------------------------
VS = (8.0, 7.6, 2.7)
k.tube((VS[0] - 0.3, VS[1], VS[2] + 0.2), (VS[0] - 0.3, VS[1], H + 0.4), 0.008, ('#3a3a40', 0.2), 'chain', verts=4)
k.tube((VS[0] + 0.3, VS[1], VS[2] + 0.2), (VS[0] + 0.3, VS[1], H + 0.4), 0.008, ('#3a3a40', 0.2), 'chain', verts=4)
k.box(VS[0] - 0.55, VS[1] - 0.12, VS[2], VS[0] + 0.55, VS[1] + 0.12, VS[2] + 0.18, ('#5a2a1a', 0.12), 'votive_hull')
k.box(VS[0] - 0.45, VS[1] - 0.1, VS[2] + 0.18, VS[0] + 0.45, VS[1] + 0.1, VS[2] + 0.21, (GOLD, 0.2), 'votive_wale')
for (dx, h) in ((-0.25, 0.5), (0.05, 0.6), (0.32, 0.45)):
    k.cyl(VS[0] + dx, VS[1], VS[2] + 0.18, VS[2] + 0.18 + h, 0.012, ('#3e2414', 0.12), 'votive_mast', verts=4)
    k.box(VS[0] + dx - 0.14, VS[1] - 0.005, VS[2] + 0.3, VS[0] + dx + 0.14, VS[1] + 0.005, VS[2] + 0.12 + h, ('#f0e8d4', 0.1), 'votive_sail')

# ---- the pews: two blocks down the aisle -------------------------------------------------------------------------
PEW = '#6a4426'
for r in (5.4, 6.9, 8.4, 9.9, 11.4):
    for (x0, x1) in ((2.2, 6.7), (9.3, 13.8)):
        k.box(x0, r - 0.22, 0.42, x1, r + 0.18, 0.5, (PEW, 0.12), 'pew_seat', bevel=0.01)
        k.box(x0, r - 0.32, 0.5, x1, r - 0.22, 1.0, (shade(PEW, 0.85), 0.12), 'pew_back', bevel=0.01)
        for x in (x0, x1 - 0.08):
            k.box(x, r - 0.32, 0.0, x + 0.08, r + 0.2, 1.05, (shade(PEW, 0.75), 0.12), 'pew_end')
        k.solid(x0, r - 0.35, x1, r + 0.2)
for (x, r) in ((3.1, 5.6), (11.6, 8.6), (4.4, 11.6)):   # hymn books left on the seats
    k.box(x, r - 0.12, 0.5, x + 0.22, r + 0.04, 0.55, ('#2a3a6a', 0.12), 'hymnal')

# ---- the candles for the missing (left, by the step): a tiered iron stand, a hundred flames -------------------------
CS = (2.4, 3.6)
for t in range(3):
    zz = 0.7 + t * 0.22
    k.box(CS[0] - 0.75 + t * 0.12, CS[1] - 0.3 + t * 0.1, zz - 0.03, CS[0] + 0.75 - t * 0.12, CS[1] + 0.3 - t * 0.1, zz, ('#2a2a30', 0.2), 'stand_tier')
    n = 9 - t * 2
    for i in range(n):
        x = CS[0] - 0.62 + t * 0.12 + i * (1.24 - t * 0.24) / max(1, n - 1)
        for rr in (CS[1] - 0.15, CS[1] + 0.12):
            if (i + t + (rr > CS[1])) % 4 == 3:
                continue                                    # a few spaces still empty
            k.cyl(x, rr, zz, zz + 0.1, 0.025, ('#efe4c8', 0.1), 'votive', verts=6)
            k.sphere(x, rr, zz + 0.13, 0.018, 0.03, '#ffd080', 'votive_flame', emit=('#ffb040', 3.0), segs=6)
for (x, r) in ((CS[0] - 0.6, CS[1] - 0.28), (CS[0] + 0.6, CS[1] - 0.28), (CS[0] - 0.6, CS[1] + 0.28), (CS[0] + 0.6, CS[1] + 0.28)):
    k.cyl(x, r, 0.0, 0.7, 0.025, ('#2a2a30', 0.2), 'stand_leg', verts=6)
k.box(CS[0] + 0.85, CS[1] - 0.15, 0.0, CS[0] + 1.15, CS[1] + 0.15, 0.85, ('#4a3420', 0.12), 'alms_box')
k.box(CS[0] + 0.92, CS[1] - 0.04, 0.85, CS[0] + 1.08, CS[1] + 0.04, 0.86, ('#1a1a1a', 0.1), 'alms_slot')
k.point_light(CS[0], CS[1] + 0.3, 1.2, '#ffb050', 18, radius=0.5, group='flicker')
k.solid(1.4, 3.0, 3.8, 4.2)
k.solid(1.0, 2.0, 4.0, 3.0)                             # the corner behind the stand
# the memorial board: the ships the sea kept, in gold leaf (right of the sanctuary)
k.box(12.3, 1.96, 1.2, 13.7, 2.04, 2.6, ('#2a1a10', 0.12), 'memorial')
for j in range(7):
    k.box(12.45, 2.04, 2.4 - j * 0.17, 12.45 + k.rng.uniform(0.6, 1.1), 2.05, 2.43 - j * 0.17, (GOLD, 0.15), 'memorial_name', emit=('#806020', 0.12))
V.board_sign(k, 'LOST AT SEA', 'AlegreyaSC-Bold', 13.0, 2.05, 2.72, size=0.11, board='#2a1a10')

# ---- the font by the door, the bell rope in the corner -------------------------------------------------------------
F_ = (12.6, 11.9)
k.cyl(F_[0], F_[1], 0.0, 0.15, 0.36, ('#a8a090', 0.12), 'font_base', verts=12)
k.cyl(F_[0], F_[1], 0.15, 0.75, 0.16, ('#b8b0a0', 0.12), 'font_stem', verts=10)
W.annulus(k, F_[0], F_[1], 0.32, 0.42, 0.75, 1.0, ('#b8b0a0', 0.12), 'font_bowl')
k.cyl(F_[0], F_[1], 0.75, 0.94, 0.33, ('#4a6a7a', 0.05), 'font_water', emit=('#2a4a5a', 0.15))
k.solid(F_[0] - 0.45, F_[1] - 0.45, F_[0] + 0.45, F_[1] + 0.45)
BR = (14.3, 4.0)
k.tube((BR[0], BR[1], 0.6), (BR[0], BR[1], H + 0.6), 0.02, ('#b49a64', 0.15), 'bell_rope', verts=6)
k.cyl(BR[0], BR[1], 0.75, 1.1, 0.06, ('#a02a22', 0.1), 'bell_sally', verts=8)
k.box(14.0, 3.7, 0.0, 14.6, 4.3, 0.05, ('#5a3a22', 0.12), 'bell_mat')
k.solid(14.0, 3.7, 14.6, 4.3)
for x in (4.5, 11.5):                                   # standing candles at the step's ends
    A.altar_candle(k, x, 2.6)
A.potted_plant(k, 1.6, 12.2)

# ---- light: candles, the window, cold moonlight from the lancets -------------------------------------------------
for (x, r, e) in ((4.4, 7.0, 60), (11.6, 7.0, 60), (4.4, 10.5, 50), (11.6, 10.5, 50)):
    A.hanging_lamp(k, x, r, z=2.8, energy=e, visible=False)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.78}}, light_samples=128, world_light=('#3a4060', 0.45))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': "St Brendan's", 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
          'spawns': {'player': [7, 12]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-crown', 'leaveSpawn': [47, 19], 'label': 'THE SQUARE', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 2, 'y': 4, 'type': 'chapel_candle', 'label': 'CANDLES', 'prompt': 'PRESS E TO LIGHT ONE'},
    {'x': 13, 'y': 2, 'type': 'dialog', 'label': 'LOST AT SEA', 'prompt': 'PRESS E TO READ',
     'dialog': 'THE SHIPS THE SEA KEPT, IN GOLD LEAF: THE SOVEREIGN. THE HERON. THE LANTERN OF ROSE. THE ASHGROVE. THE MERRY KESTREL. THE WREN - AND UNDER IT, NEWER, IN A DIFFERENT HAND: "NOT LOST. NOT YET."'},
    {'x': 8, 'y': 3, 'type': 'dialog', 'label': 'ALTAR', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE ALTAR, A BOOK OPEN ON IT AT THE SAILORS\' PRAYER: "BRING THEM IN BY THE LIGHT, AND IF NOT BY THE LIGHT, BY THE STARS, AND IF NOT BY THE STARS, BRING THEM ANYWAY."'},
    {'x': 8, 'y': 2, 'type': 'dialog', 'label': 'GREAT WINDOW', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A SHIP UNDER A STAR, IN GLASS FROM ROSE COVE. AT NIGHT THE CANDLES LIGHT IT FROM INSIDE AND THE BOATS COMING IN SEE IT FROM THE HARBOUR MOUTH.'},
    {'x': 8, 'y': 7, 'type': 'dialog', 'label': 'VOTIVE SHIP', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A MODEL SHIP HUNG OVER THE AISLE ON CHAINS - THE OLD CUSTOM, FROM A CREW THAT CAME HOME WHEN NOBODY THOUGHT THEY WOULD. SHE TURNS A LITTLE IN THE DRAUGHT FROM THE DOOR.'},
    {'x': 14, 'y': 4, 'type': 'chapel_bell', 'label': 'BELL ROPE', 'prompt': 'PRESS E TO RING'},
    {'x': 12, 'y': 11, 'type': 'dialog', 'label': 'FONT', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE FONT, SEA WATER IN IT, AS IT ALWAYS HAS BEEN. A SHELL TO DIP. SAILORS TOUCH IT GOING OUT AND COMING HOME.'},
    {'x': 10, 'y': 3, 'type': 'dialog', 'label': 'MOTHER CORALIE', 'prompt': 'PRESS E TO TALK',
     'dialog': 'MOTHER CORALIE, IN SEA-BLUE, TRIMMING THE ALTAR CANDLES. "SIT A WHILE IF YOU LIKE. THE SEA WILL STILL BE THERE."'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(10, 3, 11, 4)                                   # Mother Coralie, by the altar
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=[
    {'sheet': 'npc-coralie', 'x': 10, 'y': 3, 'facing': 'down'},
])
print('chapel done')
