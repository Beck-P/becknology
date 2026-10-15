"""The Tern's Rest on Tern Holm — the fishermen's inn (world id "lumar-tern-inn").
Usage: BVENV/bin/python lumar_tern_inn.py RENDER_DIR

Four tables, one fire, and a stew that's been on the go since before the capital had a name: a deep inglenook with the
pot hung over the flames, settles either side of it; a low counter with Bryony Kettle behind it; a long table where the
fishermen eat; the record catch nailed up over the door to the back (a silverfin as long as a man's arm); nets and floats
and an oar from a boat that didn't come home; the window on the cove; the stair to the spare room.
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade

OUT = sys.argv[1]
WID = 'lumar-tern-inn'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 16, 11
H = 2.0 / math.cos(THETA)
FLOOR = (1, 2, 14, 8)
DOORS = [(7, 9), (8, 9)]

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=5153)
A.room(k, 1, 2, 15, 9, H, door=(7.0, 9.0), floor_tone='#7a5a3a', plaster='#e8dcc0', wainscot_col='#4a3a2a')

# ---- the inglenook (centre-left): a wide hearth, the stew pot over the fire, settles either side ------------------------
IX = 5.0
STONE_I = ('#8a8474', 0.14)
for x0, x1 in ((IX - 1.9, IX - 1.4), (IX + 1.4, IX + 1.9)):     # the jambs either side of the opening
    k.box(x0, 1.9, 0.0, x1, 2.75, 1.35, STONE_I, 'ingle_jamb')
k.box(IX - 1.9, 1.9, 1.35, IX + 1.9, 2.75, H, STONE_I, 'ingle_breast')   # the breast over it, up to the ceiling
k.box(IX - 1.9, 1.9, H, IX + 1.9, 2.75, H + 0.04, '#3e2612', 'ingle_cap')
k.box(IX - 1.4, 1.9, 0.0, IX + 1.4, 2.0, 1.35, ('#2a1e18', 0.12), 'ingle_back')   # soot-black at the back
k.box(IX - 1.55, 2.6, 1.35, IX + 1.55, 2.95, 1.5, ('#4a2e18', 0.12), 'ingle_beam', bevel=0.02)
k.box(IX - 1.4, 2.0, 0.0, IX + 1.4, 2.75, 0.06, ('#5a5248', 0.12), 'ingle_floor')
for dx in (-0.25, 0.2):
    k.cyl(IX + dx, 2.3, 0.06, 0.16, 0.07, ('#2a1a10', 0.12), 'log', verts=8)
k.cone(IX, 2.3, 0.08, 0.6, 0.3, 0.02, '#ffb040', 'fire', emit=('#ffb040', 3.0))
k.cone(IX - 0.15, 2.32, 0.08, 0.42, 0.14, 0.01, '#fff0a0', 'fire', emit=('#fff0a0', 4.0))
k.point_light(IX, 2.9, 0.5, '#ff9a40', 110, radius=0.3, group='flicker')
k.tube((IX, 2.4, 1.3), (IX, 2.4, 0.95), 0.012, ('#2a2a30', 0.2), 'pot_chain', verts=4)          # the pot, steaming
k.sphere(IX, 2.4, 0.72, 0.3, 0.24, ('#2a2a30', 0.18), 'stew_pot', segs=14)
k.cyl(IX, 2.4, 0.88, 0.92, 0.24, ('#8a5a2a', 0.1), 'stew', verts=14, emit=('#6a3a10', 0.25))
k.tube((IX + 0.3, 2.4, 0.92), (IX + 0.5, 2.55, 1.15), 0.015, ('#6a4a2a', 0.12), 'ladle', verts=4)
for side in (-1, 1):                                    # settles in the nook
    x = IX + side * 1.6
    k.box(x - 0.25, 2.8, 0.0, x + 0.25, 3.6, 0.45, ('#5a3a1e', 0.12), 'settle_seat')
    k.box(x - 0.25 + side * 0.18, 2.8, 0.45, x + 0.25 + side * 0.18, 3.6, 1.1, ('#4a2e18', 0.12), 'settle_back')
k.solid(IX - 1.9, 1.9, IX + 1.9, 3.0)
k.solid(IX - 1.9, 2.8, IX - 1.3, 3.6)
k.solid(IX + 1.3, 2.8, IX + 1.9, 3.6)
for i, col in enumerate(('#c8a050', '#8a5a30', '#c8a050', '#6a6a72')):   # pans and a ladle on the beam
    k.cyl(IX - 1.1 + i * 0.7, 2.98, 1.55, 1.6, 0.12, (col, 0.12), 'pan', verts=10)

# ---- the counter (right) with Bryony behind it, barrels, a shelf of crockery -------------------------------------
A.wall_shelf(k, 10.2, 14.6, 2.05, 1.3, bottles=False)
for i in range(8):
    k.cyl_y(10.45 + i * 0.52, 2.05, 2.12, 1.48, 0.13, 0.13, ('#e8eef6', 0.06), 'plate', verts=12)
    k.cyl_y(10.45 + i * 0.52, 2.12, 2.13, 1.48, 0.08, 0.08, ('#2a5a9a', 0.06), 'plate_blue', verts=10)
A.bar_counter(k, 10.0, 14.6, 3.5, 4.0, height=0.95)
k.solid(10.0, 2.0, 14.6, 3.2)
A.barrel(k, 14.2, 2.5, h=0.85, radius=0.3)
A.mug(k, 11.0, 3.65, 0.95)
A.mug(k, 13.4, 3.7, 0.95)
k.box(12.0, 3.6, 0.95, 12.6, 3.9, 0.98, ('#e8dcc0', 0.1), 'bill_of_fare')

# ---- the window on the cove, the record catch, nets on the wall -------------------------------------------------------
A.window(k, 8.4, 2.0, z0=1.05, w=1.0, h=0.95)
k.area_light(8.4, 2.6, 1.6, '#7090d0', 25, 1.0, rot=(math.radians(-70), 0, 0))
FX, FZ = 1.6, 1.55                                      # the record silverfin on a board
k.box(FX - 0.5, 2.0, FZ - 0.25, FX + 0.5, 2.06, FZ + 0.25, ('#5a3a1e', 0.12), 'fish_board')
k.blob(FX, 2.1, FZ, 0.42, 0.04, 0.13, ('#a8b8c8', 0.35), 'record_fish')
k.poly([(FX + 0.38, 2.12, FZ), (FX + 0.55, 2.12, FZ + 0.14), (FX + 0.55, 2.12, FZ - 0.14)], ('#a8b8c8', 0.35), 'record_tail')
k.sphere(FX - 0.32, 2.14, FZ + 0.03, 0.025, 0.025, ('#1a1a1a', 0.1), 'record_eye', segs=6)
A.fishing_net(k, 9.2, 9.9, 2.0, z0=1.0, z1=2.0)
for (x, z) in ((9.35, 1.2), (9.7, 1.45), (9.5, 1.75)):
    k.sphere(x, 2.08, z, 0.06, 0.06, ('#d8a040', 0.2), 'float', segs=8)

# ---- the long table and benches (the fishermen's), two little tables -----------------------------------------------
k.box(2.0, 5.8, 0.72, 6.6, 6.5, 0.8, ('#8a6438', 0.12), 'long_table', bevel=0.02)
for (x, r) in ((2.15, 5.95), (6.45, 5.95), (2.15, 6.35), (6.45, 6.35)):
    k.box(x - 0.06, r - 0.06, 0, x + 0.06, r + 0.06, 0.72, ('#5a3a1e', 0.12), 'table_leg')
k.solid(2.0, 5.8, 6.6, 6.5)
A.bench(k, 2.0, 6.6, 5.45)
A.bench(k, 2.0, 6.6, 7.45)
for x in (2.6, 3.5, 4.6, 5.8):
    A.mug(k, x, 6.0 + (0.25 if x > 4 else 0), 0.8)
for x in (3.0, 5.2):                                    # bowls of stew
    k.cyl(x, 6.2, 0.8, 0.86, 0.1, ('#d8d0c0', 0.1), 'bowl', verts=10)
    k.cyl(x, 6.2, 0.86, 0.87, 0.08, ('#8a5a2a', 0.1), 'bowl_stew', verts=10)
A.candle(k, 4.0, 6.1, 0.8, energy=1.4)
A.round_table(k, 11.5, 6.5)
A.stool(k, 10.5, 6.5)
A.stool(k, 12.5, 6.5)
A.candle(k, 11.4, 6.4, 0.78)
# the stair to the spare room (back right corner is the counter; it goes up from the front right)
A.coat_rack(k, 13.8, 8.3)
A.barrel(k, 1.6, 8.4, h=0.75, radius=0.28)

# ---- light ------------------------------------------------------------------------------------------------------
A.hanging_lamp(k, 4.3, 6.1, energy=100, visible=False)
A.hanging_lamp(k, 11.5, 6.3, energy=90, visible=False)
A.hanging_lamp(k, 12.3, 3.8, energy=80, visible=False)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.7}}, light_samples=128, world_light=('#38405a', 0.42))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': "The Tern's Rest", 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
          'spawns': {'player': [7, 8]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-tern', 'leaveSpawn': [19, 12], 'label': 'THE COVE', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 12, 'y': 3, 'type': 'dialog', 'label': 'BRYONY', 'prompt': 'PRESS E TO TALK',
     'dialog': 'BRYONY KETTLE, FLOUR TO THE ELBOWS. "SIT DOWN BEFORE YOU FALL DOWN. STEW\'S ON."'},
    {'x': 10, 'y': 3, 'type': 'vendor', 'label': 'COUNTER', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'bowl_of_stew', 'price': 10}, {'id': 'mug_of_ale', 'price': 5}, {'id': 'bread', 'price': 4}]},
    {'x': 5, 'y': 2, 'type': 'dialog', 'label': 'THE STEW POT', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE STEW. IT HAS BEEN ON THE GO SINCE BEFORE THE CAPITAL HAD A NAME, SAYS BRYONY, AND SHE\'S ONLY EVER ADDED TO IT. TODAY IT IS MOSTLY CRAB.'},
    {'x': 3, 'y': 3, 'type': 'dialog', 'label': 'SETTLE', 'prompt': 'PRESS E TO SIT', 'action': 'sit', 'seat': [3.4, 3.3], 'facing': 'right',
     'dialog': 'THE WARM SIDE OF THE FIRE. NOBODY ELSE IS ALLOWED IT UNLESS OLD PELL IS AT SEA.'},
    {'x': 8, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK', 'action': 'view', 'view': 'sea',
     'dialog': 'THE COVE, THE BOATS DRAWN UP ON THE SHINGLE, THE CHAPEL LANTERN BURNING FOR WHOEVER\'S STILL OUT.'},
    {'x': 1, 'y': 2, 'type': 'dialog', 'label': 'THE RECORD CATCH', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A SILVERFIN AS LONG AS YOUR ARM, VARNISHED, ON A BOARD. UNDER IT, BURNT INTO THE WOOD: "MAUD TULL. BEAT IT."'},
    {'x': 4, 'y': 6, 'type': 'dialog', 'label': 'FISHERMAN', 'prompt': 'PRESS E TO TALK',
     'dialog': '"BLUEFIN OFF SAPPHIRE IN THE MORNINGS. RAYS IF YOU CAST FAR. MIND THE CRIMSON - SQUALL TOOK MY BROTHER\'S MAST CLEAN OFF."'},
    {'x': 6, 'y': 7, 'type': 'dialog', 'label': 'OLD FISHER', 'prompt': 'PRESS E TO TALK',
     'dialog': 'AN OLD FISHERWOMAN, TWO TEETH AND A PIPE. "THE MOON EELS COME UP WHEN THE MIST DOES. DON\'T GO AFTER THEM. THEY COME AFTER YOU."'},
    {'x': 13, 'y': 8, 'type': 'dialog', 'label': 'SPARE ROOM', 'prompt': 'PRESS E TO SLEEP', 'action': 'sleep',
     'dialog': 'BRYONY\'S SPARE ROOM UNDER THE EAVES: A NARROW BED, A PATCHWORK QUILT, GULLS ON THE ROOF. SHE WON\'T TAKE YOUR MONEY. YOU WAKE RESTED.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(12, 2, 13, 3)
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=[
    {'sheet': 'npc-bryony', 'x': 12, 'y': 2, 'facing': 'down'},
    {'sheet': 'npc-fisher-a', 'x': 4, 'y': 5, 'facing': 'down', 'pose': 'sit'},
    {'sheet': 'npc-fisher-b', 'x': 6, 'y': 7, 'facing': 'up', 'pose': 'sit'},
])
print("tern's rest done")
