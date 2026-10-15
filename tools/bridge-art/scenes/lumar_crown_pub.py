"""The Crown & Anchor on Crownhaven's quay — the sailors' pub (world id "lumar-crown-pub").
Usage: BVENV/bin/python lumar_crown_pub.py RENDER_DIR

Low beams, a long bar down the left where Hetty Marsh pulls the ale, kegs racked behind her and bottles to the ceiling;
a big old chart of the five seas painted on the back wall between two windows on the harbour, a ship's wheel over the
fire, the Sovereign's figurehead in the corner, ships in bottles along a shelf. Tables of sailors; by the fire the dice
table, where Salt Annie and Cutter Joss play Bones for coins (js/lodge.js tables); the hands' table by the door, where
the bosun keeps the list of who's looking for a berth.
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade

OUT = sys.argv[1]
WID = 'lumar-crown-pub'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 18, 12
H = 2.0 / math.cos(THETA)
FLOOR = (1, 2, 16, 9)
DOORS = [(8, 10), (9, 10)]
OX = '#5a2420'                                       # oxblood, the pub's colour
BRASS = '#d0a048'

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=4407)

# ---- the shell: dark boards, a stone back wall with a dark wainscot, beams ------------------------------------
A.floor_planks(k, 1, 2, 17, 10, tone='#5a3a22')
A.back_wall(k, 0.4, 17.6, 2.0, H, plaster='#8a8274', wainscot=0.95, wainscot_col='#3e2414', beams_every=3.0, stone=True)
A.side_wall(k, 0.4, 1.0, 1.5, 10.0, H)
A.side_wall(k, 17.0, 17.6, 1.5, 10.0, H)
A.front_wall(k, 0.4, 17.6, 10.0, gaps=[(8.0, 10.0)])
A.door_frame(k, 8.0, 10.0, 10.0)

# ---- the bar (left): Hetty's counter, taps, kegs racked behind, bottles up the wall ---------------------------
A.wall_shelf(k, 1.1, 6.0, 2.05, 1.25)
A.wall_shelf(k, 1.1, 6.0, 2.05, 1.7)
A.wall_shelf(k, 1.1, 6.0, 2.05, 2.15)
A.bar_counter(k, 1.0, 6.4, 3.3, 3.85)
for x in (2.4, 3.2, 4.0):
    A.beer_tap(k, x, 3.5, 1.0)
A.keg_rack(k, 4.6, 6.2, 2.45)
k.solid(1.0, 2.0, 6.4, 3.0)                             # behind the bar is Hetty's
for i, x in enumerate((1.5, 5.0, 5.6, 6.1)):
    A.mug(k, x, 3.45 + (i % 2) * 0.12, 1.0)
k.box(1.2, 3.35, 1.0, 1.9, 3.75, 1.04, ('#e8dcc0', 0.1), 'bar_slate')        # the day's slate on the counter
A.candle(k, 3.6, 3.55, 1.0, energy=1.4)
for i in range(6):                                      # brass rail along the foot of the bar
    k.cyl_x(1.0, 6.4, 3.95, 0.18, 0.025, 0.025, (BRASS, 0.25), 'foot_rail', verts=8)

# ---- the back wall: the painted chart between two harbour windows -------------------------------------------
A.window(k, 7.0, 2.0, z0=1.05, w=0.9, h=1.0)
A.window(k, 12.4, 2.0, z0=1.05, w=0.9, h=1.0)
CX0, CX1, CZ0, CZ1 = 8.0, 11.4, 0.95, 2.1                # the old chart of the five seas, painted on boards
k.box(CX0 - 0.1, 1.96, CZ0 - 0.1, CX1 + 0.1, 2.04, CZ1 + 0.1, ('#3e2414', 0.12), 'chart_frame')
k.box(CX0, 2.04, CZ0, CX1, 2.06, CZ1, ('#c8b48a', 0.08), 'chart_paper')
for (x, z, w, h, col) in ((8.1, 1.6, 1.0, 0.45, '#9ab08a'), (9.0, 1.15, 1.2, 0.5, '#b4a0a8'), (10.1, 1.55, 1.2, 0.5, '#a8b4c4'),
                          (8.2, 1.05, 0.8, 0.45, '#c09a88'), (10.4, 1.0, 0.95, 0.5, '#9a96b4')):   # the seas, tinted
    k.box(x, 2.06, z, min(CX1 - 0.05, x + w), 2.065, min(CZ1 - 0.05, z + h), (col, 0.08), 'chart_sea')
for (x, z) in ((9.6, 1.55), (9.6, 1.95), (9.05, 1.75), (10.2, 1.8), (10.7, 1.4), (8.6, 1.3), (8.5, 1.85), (10.6, 1.15)):
    k.blob(x, 2.07, z, 0.12, 0.01, 0.07, ('#7a5a32', 0.1), 'chart_isle', segs=8)
k.box(CX1 - 0.4, 2.065, CZ0 + 0.06, CX1 - 0.08, 2.07, CZ0 + 0.38, ('#3e2414', 0.1), 'chart_rose')
for x in (7.6, 11.8):                                   # ship lanterns either side of the chart
    A.wall_sconce(k, x, 2.0, z=1.6, energy=5.0)

# ---- the hearth (right): an anchor over the mantel, a ship's wheel on the wall, the dice table -----------------
A.fireplace(k, 14.6, 2.0, H, width=2.0, height=1.3, depth=0.45, energy=120)
k.tube((14.6, 2.26, 1.75), (14.6, 2.26, 2.35), 0.05, ('#2a2a30', 0.15), 'anchor_shank', verts=8)
k.tube((14.15, 2.26, 1.92), (14.6, 2.26, 1.72), 0.045, ('#2a2a30', 0.15), 'anchor_arm', verts=8)
k.tube((15.05, 2.26, 1.92), (14.6, 2.26, 1.72), 0.045, ('#2a2a30', 0.15), 'anchor_arm', verts=8)
k.cyl_x(14.35, 14.85, 2.26, 2.3, 0.04, 0.04, ('#2a2a30', 0.15), 'anchor_stock', verts=8)
k.cyl_y(14.6, 2.2, 2.3, 2.42, 0.08, 0.08, ('#2a2a30', 0.15), 'anchor_ring', verts=10)
WX, WZ = 16.4, 1.45                                     # the Sovereign's wheel on the back wall by the fire
k.cyl_y(WX, 2.0, 2.1, WZ, 0.42, 0.42, ('#6a4422', 0.12), 'wheel_rim', verts=20)
k.cyl_y(WX, 1.98, 2.12, WZ, 0.36, 0.36, ('#4a3a30', 0.12), 'wheel_hole', verts=20)
for a in range(8):
    ang = a * math.pi / 4
    k.tube((WX, 2.08, WZ), (WX + math.cos(ang) * 0.55, 2.08, WZ + math.sin(ang) * 0.55), 0.03, ('#8a5a30', 0.12), 'wheel_spoke', verts=6)
k.cyl_y(WX, 2.06, 2.16, WZ, 0.08, 0.08, (BRASS, 0.25), 'wheel_hub', verts=10)
A.round_table(k, 13.5, 5.5, radius=0.58)
for (x, r) in ((12.5, 5.5), (14.5, 5.5), (13.5, 6.5)):
    A.stool(k, x, r)
for (x, r) in ((13.25, 5.35), (13.75, 5.6)):            # the dice cups, bones out on the table, the pot
    k.cyl(x, r, 0.78, 0.98, 0.09, ('#3a2418', 0.12), 'dice_cup', verts=12)
    k.cyl(x, r, 0.97, 0.99, 0.095, ('#5a3a24', 0.12), 'dice_cup_rim', verts=12)
for i in range(5):
    x, r = 13.35 + (i % 3) * 0.13, 5.75 + (i // 3) * 0.12
    k.box(x - 0.04, r - 0.04, 0.78, x + 0.04, r + 0.04, 0.86, ('#e8dcc4', 0.1), 'die')
for i in range(7):
    k.cyl(13.65, 5.22, 0.78 + i * 0.018, 0.795 + i * 0.018, 0.05, ('#e0b040', 0.25), 'coin', verts=10)
A.candle(k, 13.85, 5.32, 0.78, energy=2.0)
A.mug(k, 13.1, 5.65, 0.78)

# ---- the Sovereign's figurehead in the corner: a crowned lady, arms crossed, gilt fading ----------------------
FH = (16.3, 8.6)
k.cyl(FH[0], FH[1], 0.0, 0.25, 0.32, ('#3e2414', 0.12), 'fh_plinth', verts=12)
k.blob(FH[0], FH[1], 0.75, 0.2, 0.17, 0.5, ('#2a5a6a', 0.12), 'fh_gown')
k.blob(FH[0], FH[1] - 0.04, 1.2, 0.16, 0.13, 0.15, ('#2a5a6a', 0.12), 'fh_bodice')
k.blob(FH[0], FH[1] - 0.12, 1.12, 0.17, 0.05, 0.05, ('#e8d8b8', 0.12), 'fh_arms')
k.sphere(FH[0], FH[1] - 0.03, 1.45, 0.1, 0.12, ('#e8d8b8', 0.12), 'fh_head', segs=10)
k.blob(FH[0], FH[1] + 0.05, 1.42, 0.12, 0.08, 0.14, ('#8a4a22', 0.12), 'fh_hair')
k.cyl(FH[0], FH[1] - 0.02, 1.54, 1.62, 0.09, (BRASS, 0.25), 'fh_crown', verts=8)
k.solid(15.8, 8.0, 17.0, 9.2)

# ---- ships in bottles, a shelf over the booth (left wall) -------------------------------------------------------
k.box(1.02, 6.0, 1.55, 1.3, 8.6, 1.6, ('#3e2414', 0.12), 'bottle_shelf')
for i, r in enumerate((6.3, 6.95, 7.6, 8.25)):
    k.cyl_y(1.17, r - 0.25, r + 0.25, 1.72, 0.1, 0.1, ('#5a8a7a', 0.05), 'ship_bottle', verts=10)
    k.box(1.13, r - 0.15, 1.66, 1.21, r + 0.15, 1.7, ('#6a4422', 0.12), 'bottle_hull')
    k.box(1.16, r - 0.02, 1.7, 1.18, r + 0.02, 1.8, ('#e8e0cc', 0.1), 'bottle_sail')

# ---- the booth (left, front): high-backed settles, a table between --------------------------------------------
for r in (6.05, 8.65):                                 # (a row clear in front of the bar)
    k.box(1.1, r - 0.2, 0.0, 4.2, r + 0.2, 0.46, (OX, 0.15), 'settle_seat')
    k.box(1.1, r - (0.2 if r < 7 else -0.12), 0.46, 4.2, r - (0.08 if r < 7 else -0.24), 1.25, ('#3e2414', 0.12), 'settle_back')
k.box(1.3, 6.6, 0.72, 4.0, 8.1, 0.8, ('#6a4426', 0.12), 'booth_table', bevel=0.02)
k.box(2.5, 7.2, 0, 2.8, 7.5, 0.72, ('#3e2414', 0.12), 'booth_leg')
k.solid(1.1, 5.85, 4.2, 8.85)
for x in (1.8, 2.7, 3.5):
    A.mug(k, x, 7.2 + (0.3 if x > 3 else 0), 0.8)
A.candle(k, 3.0, 7.6, 0.8, energy=1.4)
k.box(1.6, 7.75, 0.8, 2.3, 8.0, 0.83, ('#e8dcc0', 0.1), 'booth_cards')

# ---- the room: tables of sailors ---------------------------------------------------------------------------------
for (cx, cr) in ((7.5, 5.5), (10.5, 5.5), (9.5, 7.5)):
    A.round_table(k, cx, cr)
    A.stool(k, cx - 1.0, cr + 0.05)
    A.stool(k, cx + 1.0, cr + 0.05)
    A.candle(k, cx - 0.08, cr - 0.1, 0.78)
    A.mug(k, cx + 0.22, cr + 0.08, 0.78)
A.mug(k, 10.25, 5.35, 0.78)
k.box(9.2, 7.35, 0.78, 9.75, 7.65, 0.8, ('#e8dcc0', 0.1), 'table_letter')

# ---- the hands' table (front right): the bosun's list of who wants a berth, a sea chest, a coil of rope ---------
A.round_table(k, 13.5, 8.5, radius=0.48)
A.stool(k, 12.5, 8.5)
k.box(13.25, 8.3, 0.78, 13.8, 8.7, 0.8, ('#e8dcc0', 0.1), 'hands_list')
k.box(13.3, 8.35, 0.8, 13.75, 8.38, 0.81, ('#3a2a1a', 0.1), 'hands_list_ink')
A.trunk(k, 14.2, 9.0, w=0.8, d=0.5, tone='#3a4a5a')
for i in range(4):                                     # a coil of rope
    k.cyl(15.5, 9.3, 0.02 + i * 0.06, 0.07 + i * 0.06, 0.28 - i * 0.02, ('#b49a64', 0.15), 'rope_coil', verts=14)
k.solid(14.2, 9.0, 15.8, 9.6)
A.coat_rack(k, 6.6, 9.3)
A.barrel(k, 4.9, 9.3, h=0.8, radius=0.3)

# ---- light: the fire, lamps over the tables, the windows' moonlight -------------------------------------------
for (x, r, e) in ((3.4, 4.2, 110), (7.5, 5.4, 110), (10.5, 5.4, 110), (13.5, 5.3, 100), (9.5, 7.4, 90), (2.6, 7.3, 70)):
    A.hanging_lamp(k, x, r, energy=e, visible=False)
k.area_light(9.7, 2.6, 1.6, '#7090d0', 30, 1.0, rot=(math.radians(-70), 0, 0))
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.7}}, light_samples=128, world_light=('#38405a', 0.42))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Crown & Anchor', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
          'spawns': {'player': [8, 9]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-crown', 'leaveSpawn': [40, 30], 'label': 'THE QUAY', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 3, 'y': 3, 'type': 'dialog', 'label': 'HETTY', 'prompt': 'PRESS E TO TALK',
     'dialog': 'HETTY MARSH LEANS ON THE PUMPS. "WHAT\'LL IT BE, CAPTAIN?"'},
    {'x': 1, 'y': 3, 'type': 'vendor', 'label': 'BAR', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'mug_of_ale', 'price': 6}, {'id': 'bowl_of_stew', 'price': 14}, {'id': 'sea_biscuit', 'price': 4}]},
    {'x': 9, 'y': 2, 'type': 'dialog', 'label': 'OLD CHART', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE FIVE SEAS, PAINTED ON PLANKS BY SOMEBODY WHO HAD CLEARLY BEEN TO THREE OF THEM. MIDNIGHT IS A BLACK SMUDGE WITH "HERE BE NOTHING GOOD" UNDER IT.\n\nSOMEONE HAS SCRATCHED A SIXTH SEA IN THE CORNER, PAST CRIMSON, AND SOMEONE ELSE HAS SCRATCHED IT OUT.'},
    {'x': 7, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE HARBOUR UNDER THE LANTERNS, MASTS ROCKING. YOUR OWN AMONG THEM.'},
    {'x': 14, 'y': 2, 'type': 'dialog', 'label': 'FIREPLACE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A FIRE OF OLD SHIP\'S TIMBER, SALT IN THE WOOD SPITTING GREEN. THE ANCHOR OVER IT IS FROM THE FIRST SHIP EVER BUILT IN THE ROYAL YARD. SO HETTY SAYS.'},
    {'x': 16, 'y': 2, 'type': 'dialog', 'label': 'SHIP\'S WHEEL', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE WHEEL OF THE SOVEREIGN, WHICH WENT DOWN OFF THE TEETH WITH THE CROWN\'S PAYROLL ABOARD. EVERY SAILOR WHO COMES IN GIVES IT A TURN FOR LUCK.'},
    {'x': 16, 'y': 8, 'type': 'dialog', 'label': 'FIGUREHEAD', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE SOVEREIGN\'S FIGUREHEAD, ARMS CROSSED, GILT CROWN PEELING. THE SAILORS CALL HER THE LANDLADY. THEY BUY HER A DRINK ON HER NAME DAY.'},
    {'x': 1, 'y': 5, 'type': 'dialog', 'label': 'SHIPS IN BOTTLES', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'FOUR SHIPS IN FOUR BOTTLES: A SLOOP, A CUTTER, A BRIGANTINE, AND A GALLEON SO SMALL YOU CAN COUNT HER GUNS ONLY IF YOU SQUINT.'},
    {'x': 13, 'y': 5, 'type': 'dice', 'table': 'anchor', 'label': 'DICE TABLE', 'prompt': 'PRESS E TO PLAY'},
    {'x': 12, 'y': 5, 'type': 'dialog', 'label': 'SALT ANNIE', 'prompt': 'PRESS E TO TALK',
     'dialog': 'A WEATHERED WOMAN WITH A RED CAP, SHAKING A CUP OF BONES. "SIT DOWN, CAPTAIN, BEFORE JOSS TAKES THE STOOL FOR HIS FEET."'},
    {'x': 14, 'y': 5, 'type': 'dialog', 'label': 'CUTTER JOSS', 'prompt': 'PRESS E TO TALK',
     'dialog': 'A BROAD MAN WITH A SPLIT LIP AND A GOLD TOOTH. "BONES IS HONEST. IT\'S THE PLAYERS YOU WATCH."'},
    {'x': 13, 'y': 8, 'type': 'hands', 'port': 'lumar-crown', 'label': 'HANDS WANTED', 'prompt': 'PRESS E TO ASK'},
    {'x': 12, 'y': 8, 'type': 'dialog', 'label': 'BOSUN', 'prompt': 'PRESS E TO TALK',
     'dialog': 'THE BOSUN TAPS THE LIST. "HANDS LOOKING FOR A BERTH. GOOD ONES GO QUICK."'},
    {'x': 6, 'y': 5, 'type': 'dialog', 'label': 'SAILOR', 'prompt': 'PRESS E TO TALK',
     'dialog': '"PIRATES OFF THE CRIMSON SEAM AGAIN. RUN WITH GUNS OR DON\'T RUN AT ALL."'},
    {'x': 11, 'y': 5, 'type': 'dialog', 'label': 'TRADER', 'prompt': 'PRESS E TO TALK',
     'dialog': '"BUY GLASS AT SAPPHIRE, SELL IT HERE. THEN DON\'T TELL ANYONE I TOLD YOU."'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=[
    {'sheet': 'npc-hetty', 'x': 3, 'y': 2, 'facing': 'down'},
    {'sheet': 'npc-annie', 'x': 12, 'y': 5, 'facing': 'right', 'pose': 'sit'},
    {'sheet': 'npc-joss', 'x': 14, 'y': 5, 'facing': 'left', 'pose': 'sit'},
    {'sheet': 'npc-bosun', 'x': 12, 'y': 8, 'facing': 'right', 'pose': 'sit'},
    {'sheet': 'npc-regular', 'x': 6, 'y': 5, 'facing': 'right', 'pose': 'sit'},
    {'sheet': 'npc-merchant', 'x': 11, 'y': 5, 'facing': 'left', 'pose': 'sit'},
])
print('crown & anchor done')
