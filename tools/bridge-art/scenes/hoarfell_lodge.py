"""The Snowcap Lodge in Fellhaven — the great room, at alpenglow.
Usage: BVENV/bin/python hoarfell_lodge.py RENDER_DIR

Log walls, a river-stone fireplace the size of a cart with skis crossed
over the mantel and boots steaming on the hearth, two deep chairs facing
it, windows either side onto the range going pink, the bar where Mette
keeps the cocoa pot and the fondue warm, the record board (js/lodge.js
writes the times on it), the stair up to the rooms, a long table, and the
round table by the fire where Old Bryn and Sigrun play Fell Dice for coins
(js/lodge.js) and keep a stool for whoever's brave.
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
import assets_snow as N
from scenekit import shade

OUT = sys.argv[1]
WID = 'hoarfell-lodge'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 18, 12
H = 2.0 / math.cos(THETA)
FLOOR = (1, 2, 16, 9)
DOORS = [(8, 10), (9, 10)]
LOG, LOG_D, LOG_L = N.LOG, N.LOG_D, N.LOG_L
COPPER = '#b8683a'

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=83)

# ---- the shell: log walls, wide boards, the doorway ----------------------------------------------------------
A.floor_planks(k, 1, 2, 17, 10, tone='#6a4a34')
A.back_wall(k, 0.4, 17.6, 2.0, H, plaster=LOG_D, wainscot=0, beams_every=0)
z = 0.16
while z < H - 0.1:                                   # round logs, course on course, chinked pale between
    k.cyl_x(0.4, 17.6, 2.0, z, 0.15, 0.155, (shade(LOG, k.rng.uniform(0.9, 1.1)), 0.12), 'log', verts=10)
    k.box(0.4, 1.98, z + 0.13, 17.6, 2.06, z + 0.17, ('#c8b490', 0.1), 'chinking')
    z += 0.31
for x0, x1 in ((0.4, 1.0), (17.0, 17.6)):           # side walls: log ends stacked at the corners
    k.box(x0, 1.5, 0, x1, 10.0, H, (LOG_D, 0.12), 'side_wall')
    k.box(x0 - 0.02, 1.5, H, x1 + 0.02, 10.0, H + 0.05, '#2a1a0e', 'wall_cap')
    k.box(x0 - 0.02, 10.0, 0, x1 + 0.02, 10.03, H + 0.05, '#120c0a', 'wall_cut')
    zz = 0.16
    while zz < H - 0.1:
        k.cyl_y((x0 + x1) / 2, 1.85, 2.3, zz, 0.16, 0.15, (LOG_L, 0.12), 'log_end', verts=10)
        zz += 0.31
A.front_wall(k, 0.4, 17.6, 10.0, gaps=[(8.0, 10.0)])
A.door_frame(k, 8.0, 10.0, 10.0)

# ---- the bar (left): Mette's counter, the cocoa pot, shelves of mugs and bottles ------------------------------
A.wall_shelf(k, 1.2, 4.8, 2.15, 1.3)
A.wall_shelf(k, 1.2, 4.8, 2.15, 1.78)
for i in range(7):                                    # mugs hanging under the lower shelf
    k.cyl(1.45 + i * 0.48, 2.3, 0.92, 1.06, 0.06, (['#c83a2e', '#e8e0d0', '#2a6ac0'][i % 3], 0.1), 'mug', verts=10)
A.bar_counter(k, 1.0, 5.2, 3.25, 3.8)
k.solid(1.0, 2.0, 5.2, 3.0)                            # behind the bar is Mette's
k.cyl(1.8, 3.5, 1.0, 1.3, 0.2, (COPPER, 0.18), 'cocoa_pot', verts=14)        # the cocoa pot on its burner
k.cyl(1.8, 3.5, 1.3, 1.36, 0.12, (shade(COPPER, 0.8), 0.18), 'cocoa_pot', verts=12)
k.tube((1.98, 3.5, 1.2), (2.2, 3.45, 1.34), 0.03, (COPPER, 0.18), 'cocoa_spout', verts=6)
k.cyl(1.8, 3.5, 0.98, 1.0, 0.16, '#ff7a30', 'burner', emit=('#ff6a20', 1.2), verts=12)
k.cyl(3.0, 3.5, 1.0, 1.18, 0.16, ('#2a2a30', 0.14), 'fondue', verts=12)                # the fondue, steaming
k.cyl(3.0, 3.5, 1.18, 1.2, 0.13, '#f0c860', 'fondue_cheese', emit=('#c89a30', 0.3), verts=12)
for i, x in enumerate((3.8, 4.15, 4.5)):
    A.mug(k, x, 3.45 + (i % 2) * 0.12, 1.0)
k.box(4.6, 3.3, 1.0, 5.05, 3.7, 1.02, ('#f0e8d0', 0.1), 'bar_menu')

# ---- the back wall: windows on the range, the great fireplace -------------------------------------------------
def alpenglow_window(x, w=1.3, z0=1.0, z1=2.15):
    rf = 2.15
    k.box(x - w / 2 - 0.1, rf - 0.04, z0 - 0.1, x + w / 2 + 0.1, rf + 0.02, z1 + 0.1, ('#3e2414', 0.12), 'window_frame')
    k.box(x - w / 2, rf + 0.02, z0, x + w / 2, rf + 0.03, z1, ('#4a2a3a', 0.05), 'window_sky', emit=('#ffa890', 1.0))
    k.box(x - w / 2, rf + 0.03, z0 + (z1 - z0) * 0.62, x + w / 2, rf + 0.035, z1, ('#3a2a4a', 0.05), 'window_sky_hi', emit=('#c8a0d8', 0.85))
    for (a, b, top) in ((-0.65, 0.05, 0.6), (-0.25, 0.6, 0.76), (0.2, 0.65, 0.48)):   # the range, peaks catching the sun
        k.poly([(x + a, rf + 0.04, z0), (x + b, rf + 0.04, z0), (x + (a + b) / 2 + 0.05, rf + 0.04, z0 + top)],
               ('#2a2a48', 0.05), 'window_peaks', emit=('#6a6aa8', 0.8))
        k.poly([(x + (a + b) / 2 - 0.07, rf + 0.045, z0 + top - 0.16), (x + (a + b) / 2 + 0.17, rf + 0.045, z0 + top - 0.16),
                (x + (a + b) / 2 + 0.05, rf + 0.045, z0 + top)], ('#5a3a4a', 0.05), 'window_snow', emit=('#ffd8c8', 1.0))
    k.box(x - 0.03, rf + 0.04, z0, x + 0.03, rf + 0.09, z1, ('#3e2414', 0.12), 'window_bar')
    k.box(x - w / 2, rf + 0.04, (z0 + z1) / 2 - 0.03, x + w / 2, rf + 0.09, (z0 + z1) / 2 + 0.03, ('#3e2414', 0.12), 'window_bar')
    for xx in (x - w / 2 - 0.06, x + w / 2 + 0.06):                   # the frame's sides and head stand proud of the glass
        k.box(xx - 0.06, rf + 0.02, z0 - 0.1, xx + 0.06, rf + 0.1, z1 + 0.1, ('#4e2e18', 0.12), 'window_frame')
    k.box(x - w / 2 - 0.12, rf + 0.02, z1, x + w / 2 + 0.12, rf + 0.1, z1 + 0.12, ('#4e2e18', 0.12), 'window_frame')
    k.box(x - w / 2 - 0.16, rf + 0.02, z0 - 0.16, x + w / 2 + 0.16, rf + 0.26, z0 - 0.06, ('#5e3b1e', 0.12), 'sill')
    k.area_light(x, 2.7, 1.55, '#ffb8a8', 80, 1.3, rot=(math.radians(-72), 0, 0))


alpenglow_window(6.4)
alpenglow_window(11.6)
A.fireplace(k, 9.0, 2.15, H, width=2.4, height=1.4, depth=0.5, energy=150)
for (x, zz) in ((8.0, 0.28), (8.2, 0.72), (7.98, 1.12), (10.0, 0.32), (9.8, 0.76), (10.02, 1.15),
                (8.55, 1.0), (9.0, 1.18), (9.45, 0.98), (8.8, 0.84), (9.25, 0.86)):   # river stones round the opening
    k.blob(x, 2.66, zz, 0.19, 0.06, 0.14, (shade('#8c8578', k.rng.uniform(0.85, 1.15)), 0.14), 'stone', segs=8)
for side in (-1, 1):                                   # old wooden skis crossed over the mantel, poles behind
    k.tube((9.0 - side * 0.95, 2.45, 1.62), (9.0 + side * 0.95, 2.45, 2.42), 0.04, ('#9a5a2a', 0.12), 'old_ski', verts=4)
    k.tube((9.0 - side * 0.7, 2.42, 1.7), (9.0 + side * 0.55, 2.42, 2.5), 0.015, ('#2a2a30', 0.12), 'old_pole', verts=6)
k.cyl_y(9.0, 2.4, 2.5, 2.05, 0.13, 0.13, ('#c8a050', 0.2), 'crest', verts=12)
for x in (8.15, 8.4, 9.65, 9.9):                       # boots steaming on the hearth
    k.box(x - 0.08, 2.95, 0.05, x + 0.08, 3.2, 0.32, ('#3a2414', 0.12), 'boot')
    k.box(x - 0.09, 3.1, 0.05, x + 0.09, 3.28, 0.12, ('#2a1a0e', 0.12), 'boot_toe')
A.wood_pile(k, 10.45, 11.0, 2.55, rows=3)

# the record board: dark wood, pinned cards, the run colours and the ridge's line drawn on it
k.box(12.75, 2.15, 0.95, 14.15, 2.22, 1.95, ('#3e2414', 0.12), 'board')
k.box(12.82, 2.22, 1.02, 14.08, 2.24, 1.88, ('#2a3a2a', 0.1), 'board_face')
for i, col in enumerate(('#2a9a5a', '#2a6ac0', '#1e1e26', '#e0b030', '#3a8ae0', '#b83a2e')):
    x = 12.95 + (i % 3) * 0.4
    zz = 1.5 if i < 3 else 1.12
    k.box(x, 2.24, zz, x + 0.32, 2.25, zz + 0.3, ('#f0e8d4', 0.08), 'board_card')
    k.box(x, 2.25, zz + 0.24, x + 0.32, 2.26, zz + 0.3, (col, 0.08), 'board_stripe')
k.solid(12.6, 2.0, 14.3, 2.6)

# the stair up to the rooms (right), climbing to a lamplit door
A.stairs_up(k, 15.0, 16.6, 2.15, H, n=5, rise=0.3, run=0.36)
k.solid(14.9, 2.0, 16.9, 4.0)

# ---- by the fire: two deep chairs, a rug, a low table --------------------------------------------------------
A.rug(k, 7.0, 3.35, 11.0, 5.5, col='#8a2a22', trim='#e8c060', pattern=True)
A.armchair(k, 7.5, 4.45, facing='up', tone='#6a2a22')
A.armchair(k, 10.5, 4.45, facing='up', tone='#2a4a3a')
for x in (7.2, 7.8):                                   # a knitted blanket over one arm
    k.box(x - 0.02, 4.1, 0.43, x + 0.3, 4.8, 0.47, ('#e8d8b0', 0.1), 'blanket')

# Barley, the lodge's St Bernard, asleep on the rug with his keg on
DOG, PATCH = ('#ece4d8', 0.1), ('#8a4a22', 0.1)
k.blob(9.0, 3.75, 0.17, 0.42, 0.2, 0.17, DOG, 'dog')
k.blob(9.08, 3.7, 0.25, 0.3, 0.17, 0.1, PATCH, 'dog_patch')
k.blob(8.5, 3.82, 0.16, 0.16, 0.15, 0.14, DOG, 'dog_head')
k.blob(8.48, 3.72, 0.22, 0.12, 0.1, 0.07, PATCH, 'dog_ear')
k.blob(8.37, 3.9, 0.12, 0.08, 0.08, 0.07, DOG, 'dog_muzzle')
k.sphere(8.31, 3.92, 0.16, 0.025, 0.025, '#1a1010', 'dog_nose', segs=6)
for x in (8.6, 8.75):
    k.blob(x, 4.0, 0.06, 0.12, 0.05, 0.05, DOG, 'dog_paw')
k.tube((9.4, 3.85, 0.1), (9.65, 4.05, 0.04), 0.05, PATCH, 'dog_tail', verts=8)
k.cyl_y(8.68, 3.92, 4.04, 0.1, 0.06, 0.06, ('#8a5a2a', 0.12), 'keg', verts=10)
k.cyl_y(8.68, 4.04, 4.06, 0.1, 0.065, 0.065, ('#c8a050', 0.2), 'keg_band', verts=10)
k.solid(8.5, 3.45, 9.5, 4.0)

# ---- the dice table by the fire (right): Bryn, Sigrun, a stool kept for you ------------------------------------
A.round_table(k, 13.5, 6.5, radius=0.55)
for (x, r) in ((12.5, 6.5), (14.5, 6.5), (13.5, 7.5)):
    A.stool(k, x, r)
for (x, r, c) in ((13.25, 6.35, '#5a2a1a'), (13.75, 6.6, '#5a2a1a')):   # leather dice cups
    k.cyl(x, r, 0.78, 0.98, 0.09, (c, 0.12), 'dice_cup', verts=12)
    k.cyl(x, r, 0.97, 0.99, 0.095, (shade(c, 1.3), 0.12), 'dice_cup_rim', verts=12)
for i in range(5):                                     # dice out on the table
    x, r = 13.35 + (i % 3) * 0.13, 6.75 + (i // 3) * 0.12
    k.box(x - 0.04, r - 0.04, 0.78, x + 0.04, r + 0.04, 0.86, ('#f4eee0', 0.1), 'die')
for i in range(6):                                     # the pot: a little stack of coins
    k.cyl(13.62, 6.25, 0.78 + i * 0.018, 0.795 + i * 0.018, 0.05, ('#e0b040', 0.25), 'coin', verts=10)
A.candle(k, 13.85, 6.3, 0.78, energy=2.0)
A.mug(k, 13.0, 6.62, 0.78)

# ---- the long table (left), benches, a supper going ---------------------------------------------------------
k.box(1.8, 6.2, 0.72, 5.6, 6.95, 0.8, ('#8a6438', 0.12), 'table_top', bevel=0.02)
for (x, r) in ((1.95, 6.35), (5.45, 6.35), (1.95, 6.8), (5.45, 6.8)):
    k.box(x - 0.06, r - 0.06, 0, x + 0.06, r + 0.06, 0.72, ('#5a3a1e', 0.12), 'table_leg')
k.solid(1.8, 6.2, 5.6, 6.95)
A.bench(k, 1.8, 5.6, 5.75)
A.bench(k, 1.8, 5.6, 7.45)
for x in (2.4, 3.3, 4.6, 5.1):
    A.mug(k, x, 6.45 + (0.25 if x > 4 else 0), 0.8)
k.cyl(3.9, 6.55, 0.8, 0.95, 0.15, ('#2a2a30', 0.14), 'fondue', verts=12)
k.cyl(3.9, 6.55, 0.95, 0.97, 0.12, '#f0c860', 'fondue_cheese', emit=('#c89a30', 0.3), verts=12)
A.candle(k, 2.9, 6.6, 0.8, energy=1.6)

# ---- by the door: skis on a rack, a coat rack, a woodbox --------------------------------------------------------
N.ski_rack(k, 11.4, 13.6, 9.3)
A.coat_rack(k, 6.6, 9.3)
A.barrel(k, 15.9, 9.2, h=0.7, radius=0.3)

# ---- light: the fire, lamps over the tables, the windows' last sun ------------------------------------------------
A.hanging_lamp(k, 3.0, 4.4, energy=110, visible=False)
A.hanging_lamp(k, 3.7, 6.6, energy=100, visible=False)
A.hanging_lamp(k, 13.5, 6.2, energy=105, visible=False)
A.hanging_lamp(k, 9.0, 8.0, energy=60, visible=False)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.72}}, light_samples=128, world_light=('#5a6488', 0.5))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Snowcap Lodge', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [8, 9]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'cold': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'hoarfell', 'leaveSpawn': [19, 14], 'label': 'FELLHAVEN', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 3, 'y': 3, 'type': 'dialog', 'label': 'METTE', 'prompt': 'PRESS E TO TALK',
     'dialog': 'METTE RASK WIPES THE COUNTER THAT DOESN\'T NEED IT. "BOOTS BY THE FIRE, COCOA\'S ON. YOU LOOK FROZEN THROUGH."'},
    {'x': 1, 'y': 3, 'type': 'vendor', 'label': 'BAR', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'hot_cocoa', 'price': 8}, {'id': 'fondue', 'price': 18}, {'id': 'mulled_cider', 'price': 10},
               {'id': 'roast_chestnuts', 'price': 6}]},
    {'x': 9, 'y': 2, 'type': 'lodge_fire', 'label': 'FIRE', 'prompt': 'PRESS E TO WARM UP'},
    {'x': 6, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE RANGE GOING PINK, PEAK BY PEAK, AND THE HOARSPIRE LAST OF ALL.'},
    {'x': 11, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE CHAIRLIFT STOPPED FOR THE NIGHT, THE CHAIRS SWINGING EMPTY. A LAMP ON SOMEWHERE ON THE PISTES.'},
    {'x': 13, 'y': 2, 'type': 'lodge_board', 'label': 'THE BOARD', 'prompt': 'PRESS E TO READ'},
    {'x': 15, 'y': 3, 'type': 'rest', 'label': 'ROOMS', 'prompt': 'PRESS E FOR A ROOM', 'cost': 15,
     'dialog': 'A ROOM UNDER THE EAVES, A FEATHER BED, A JUG OF HOT WATER. 15 COINS AND METTE WAKES YOU WITH COFFEE.'},
    {'x': 9, 'y': 3, 'type': 'dialog', 'label': 'BARLEY', 'prompt': 'PRESS E TO PET',
     'dialog': 'BARLEY, THE LODGE\'S ST BERNARD, THUMPS HIS TAIL TWICE WITHOUT OPENING HIS EYES. THE LITTLE KEG ON HIS COLLAR SLOSHES. METTE SAYS IT\'S COCOA. IT IS NOT COCOA.'},
    {'x': 13, 'y': 6, 'type': 'dice', 'label': 'DICE TABLE', 'prompt': 'PRESS E TO PLAY'},
    {'x': 12, 'y': 6, 'type': 'dialog', 'label': 'OLD BRYN', 'prompt': 'PRESS E TO TALK',
     'dialog': 'AN OLD GUIDE WITH A BEARD LIKE A SNOWDRIFT, SHAKING A LEATHER CUP. "SIT, SIT. THE STOOL\'S WARM."'},
    {'x': 14, 'y': 6, 'type': 'dialog', 'label': 'SIGRUN', 'prompt': 'PRESS E TO TALK',
     'dialog': 'THE LIFT MECHANIC, GREASE STILL UNDER HER NAILS, STACKING COINS. "HE CHEATS. I CHEAT BETTER."'},
    {'x': 12, 'y': 9, 'type': 'dialog', 'label': 'SKI RACK', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'SKIS OF EVERY COLOUR, A FEW OF THEM WITH NAMES SCRATCHED ON. ONE PAIR SAYS LIV, TWICE, UNDERLINED.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=[
    {'sheet': 'npc-mette', 'x': 3, 'y': 2, 'facing': 'down'},
    {'sheet': 'npc-bryn', 'x': 12, 'y': 6, 'facing': 'right', 'pose': 'sit'},
    {'sheet': 'npc-sigrun', 'x': 14, 'y': 6, 'facing': 'left', 'pose': 'sit'},
])
print('hoarfell lodge done')
