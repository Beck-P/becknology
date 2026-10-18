"""The Salt Rat on Cinder Key — Tortuga's tavern, the rogues' den (world id "lumar-cinder-tavern").
Usage: BVENV/bin/python lumar_cinder_tavern.py RENDER_DIR

Built into the stern of the galleon the Crown's navy sank to close the cove: the back wall is her stern gallery, its
leaded windows still glowing on the cove, her timbers curving overhead; the bar down the right is her captain's
table, Rook behind it with rum kegs racked and bottles to the deckhead; a rug, barrel tables; a mermaid
figurehead in the corner with a pirate's hat on her; the parrot on its perch; a cannon dragged in for a table; a sea
chest with no lock nobody dares open; wanted posters; and the dice table by the stove, where Red Annis and Gash play
Bones for coins (js/lodge.js `rat`).
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade

OUT = sys.argv[1]
WID = 'lumar-cinder-tavern'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 18, 12
H = 2.0 / math.cos(THETA)
FLOOR = (1, 2, 16, 9)
DOORS = [(8, 10), (9, 10)]
RUM = '#6a3a1e'
BRASS = '#c8a040'

k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, seed=9123)
rng = k.rng

# ---- the shell: a ship's deck for a floor, her stern gallery for the back wall, her knees and beams ------------------
A.floor_planks(k, 1, 2, 17, 10, tone='#4a3020')
A.back_wall(k, 0.4, 17.6, 2.0, H, plaster='#5a3e2a', wainscot=0.5, wainscot_col='#3a2416', beams_every=0, stone=False)
for z in [0.55 + i * 0.22 for i in range(int((H - 0.6) / 0.22))]:   # the stern's planking, laid along
    k.box(0.4, 1.98, z, 17.6, 2.03, z + 0.2, (shade('#5a3e2a', rng.uniform(0.82, 1.12)), 0.14), 'hull_plank')
A.side_wall(k, 0.4, 1.0, 1.5, 10.0, H)
A.side_wall(k, 17.0, 17.6, 1.5, 10.0, H)
A.front_wall(k, 0.4, 17.6, 10.0, gaps=[(8.0, 10.0)])
A.door_frame(k, 8.0, 10.0, 10.0)
GX0, GX1 = 5.2, 12.8                                              # the stern gallery: five leaded windows, lit by the cove
for i in range(5):
    x0 = GX0 + i * (GX1 - GX0) / 5 + 0.1
    x1 = x0 + (GX1 - GX0) / 5 - 0.2
    k.box(x0 - 0.06, 2.02, 0.95, x1 + 0.06, 2.07, 2.15, ('#2a1a10', 0.12), 'gallery_frame')
    k.box(x0, 2.05, 1.0, x1, 2.08, 2.1, '#2a2040', 'gallery_glass', emit=('#6a5a90', 0.45))
    for t in (0.33, 0.66):
        xx = x0 + (x1 - x0) * t
        k.box(xx - 0.012, 2.08, 1.0, xx + 0.012, 2.09, 2.1, '#2a1a10', 'gallery_lead')
    for zz in (1.37, 1.73):
        k.box(x0, 2.08, zz - 0.012, x1, 2.09, zz + 0.012, '#2a1a10', 'gallery_lead')
k.box(GX0 - 0.2, 2.02, 2.15, GX1 + 0.2, 2.2, 2.32, ('#3a2416', 0.12), 'gallery_cornice')
for x in (GX0 + 0.6, GX1 - 0.6):                                  # gilt scrollwork, flaking
    k.blob(x, 2.12, 2.42, 0.32, 0.05, 0.12, (BRASS, 0.25), 'gilt_scroll', segs=10)
k.blob((GX0 + GX1) / 2, 2.12, 2.45, 0.45, 0.05, 0.16, (BRASS, 0.25), 'gilt_scroll', segs=10)
k.area_light(9.0, 2.6, 1.6, '#8a7ad0', 26, 1.6, rot=(math.radians(-70), 0, 0))

# ---- the bar (right): the captain's table, Rook behind it, kegs and bottles ---------------------------------------------
A.bar_counter(k, 11.8, 16.8, 3.3, 3.85)
A.wall_shelf(k, 13.0, 16.9, 2.05, 1.3)
A.wall_shelf(k, 13.0, 16.9, 2.05, 1.75)
A.keg_rack(k, 13.4, 16.6, 2.45)
k.solid(11.8, 2.0, 16.8, 3.0)
for x in (12.6, 13.4):
    A.beer_tap(k, x, 3.5, 1.0)
for i, x in enumerate((14.2, 14.9, 15.6, 16.3)):
    k.cyl(x, 3.5, 1.0, 1.22, 0.05, ('#2a4a2a' if i % 2 else '#4a1a10', 0.05), 'rum_bottle', verts=8)
    k.cyl(x, 3.5, 1.22, 1.32, 0.018, '#3a2a1a', 'rum_bottle', verts=6)
A.mug(k, 12.2, 3.55, 1.0)
A.candle(k, 15.2, 3.6, 1.0, energy=1.6)
k.box(11.9, 3.3, 0.98, 12.0, 3.9, 1.02, (BRASS, 0.25), 'counter_edge')
for x in (12.2, 13.4, 14.6, 15.8):                                 # stools along the bar
    A.stool(k, x, 4.6)
PX, PR = 11.1, 2.8                                                 # the parrot on its perch at the bar's end
k.cyl(PX, PR, 0.0, 1.5, 0.03, A.WOOD_DD, 'perch', verts=6)
k.cyl_x(PX - 0.25, PX + 0.25, PR, 1.5, 0.025, 0.025, A.WOOD_DD, 'perch', verts=6)
k.blob(PX, PR, 1.66, 0.09, 0.08, 0.15, ('#2a9a3a', 0.08), 'parrot', segs=10)
k.sphere(PX + 0.02, PR + 0.04, 1.83, 0.07, 0.07, ('#3ab04a', 0.08), 'parrot', segs=10)
k.blob(PX, PR - 0.03, 1.6, 0.06, 0.05, 0.1, ('#e04030', 0.08), 'parrot_wing', segs=8)
k.cone(PX + 0.04, PR + 0.11, 1.81, 1.81, 0.03, 0.0, '#f0c040', 'parrot_beak', verts=4)
k.tube((PX - 0.02, PR - 0.05, 1.55), (PX - 0.05, PR - 0.12, 1.32), 0.03, '#2a6ad0', 'parrot_tail', rb=0.008, verts=4)
k.solid_post(PX, PR)

# ---- the left: the dice table by the iron stove, -----------------------------------------------------
SX, SR = 2.2, 3.1                                                  # a ship's iron stove, its pipe up through the deck
k.box(SX - 0.45, SR - 0.35, 0.0, SX + 0.45, SR + 0.35, 0.75, ('#2a2a30', 0.15), 'stove', bevel=0.03)
k.box(SX - 0.3, SR + 0.34, 0.15, SX + 0.3, SR + 0.37, 0.5, '#3a1008', 'stove_door', emit=('#ff6020', 0.9))
k.cyl(SX, SR - 0.1, 0.75, H, 0.09, ('#2a2a30', 0.15), 'stove_pipe', verts=10)
k.point_light(SX, SR + 0.8, 0.5, '#ff7a30', 40, radius=0.2, group='flicker')
k.solid(SX - 0.45, SR - 0.35, SX + 0.45, SR + 0.35)
DX, DR = 3.4, 5.4
A.round_table(k, DX, DR, radius=0.58)
for (x, r) in ((DX - 1.0, DR), (DX + 1.0, DR), (DX, DR + 1.0)):
    A.stool(k, x, r)
for (x, r) in ((DX - 0.25, DR - 0.15), (DX + 0.25, DR + 0.1)):
    k.cyl(x, r, 0.78, 0.98, 0.09, ('#3a2418', 0.12), 'dice_cup', verts=12)
for i in range(5):
    x, r = DX - 0.15 + (i % 3) * 0.13, DR + 0.25 + (i // 3) * 0.12
    k.box(x - 0.04, r - 0.04, 0.78, x + 0.04, r + 0.04, 0.86, ('#e8dcc4', 0.1), 'die')
for i in range(9):
    k.cyl(DX + 0.15, DR - 0.25, 0.78 + i * 0.018, 0.795 + i * 0.018, 0.05, ('#e0b040', 0.25), 'coin', verts=10)
k.tube((DX - 0.5, DR - 0.35, 0.79), (DX - 0.05, DR - 0.42, 0.79), 0.015, '#c8c8d0', 'knife', verts=4)   # a knife stuck in the table
k.tube((DX - 0.05, DR - 0.42, 0.79), (DX + 0.05, DR - 0.42, 0.95), 0.012, '#c8c8d0', 'knife', verts=4)
A.candle(k, DX + 0.3, DR - 0.05, 0.78, energy=2.0)

# ---- the middle: barrel tables, a cannon for a table, the sea chest ------------------------------------------------------
for (cx, cr) in ((7.0, 5.6), (10.0, 6.9)):
    A.barrel(k, cx, cr, h=0.78, radius=0.34, tone=RUM)
    k.cyl(cx, cr, 0.78, 0.82, 0.42, ('#5a3a22', 0.12), 'barrel_top', verts=14)
    A.mug(k, cx + 0.12, cr - 0.05, 0.82)
    A.candle(k, cx - 0.15, cr + 0.05, 0.82, energy=1.2)
    A.stool(k, cx - 0.85, cr + 0.1)
    A.stool(k, cx + 0.85, cr + 0.1)
    k.solid(cx - 0.4, cr - 0.4, cx + 0.4, cr + 0.4)
CX, CR = 13.3, 7.3                                                  # an old long gun on its carriage, a board across for a table
k.box(CX - 0.9, CR - 0.35, 0.0, CX + 0.9, CR + 0.35, 0.35, ('#5a2a1a', 0.15), 'gun_carriage')
for x in (CX - 0.7, CX + 0.7):
    for r in (CR - 0.38, CR + 0.38):
        k.cyl_y(x, r - 0.04, r + 0.04, 0.16, 0.16, 0.16, ('#3a1a10', 0.15), 'truck', verts=10)
k.cyl_x(CX - 1.1, CX + 1.0, CR, 0.5, 0.17, 0.13, ('#1e1e24', 0.1), 'cannon', verts=14)
k.box(CX - 1.0, CR - 0.5, 0.68, CX + 1.0, CR + 0.5, 0.74, ('#6a4426', 0.12), 'board')
for x in (CX - 0.5, CX + 0.3):
    A.mug(k, x, CR + 0.1, 0.74)
A.candle(k, CX, CR - 0.2, 0.74, energy=1.6)
k.solid(CX - 1.0, CR - 0.5, CX + 1.0, CR + 0.5)
A.stool(k, CX - 1.4, CR + 0.6)
A.stool(k, CX + 1.4, CR + 0.6)
TX, TR = 6.4, 8.8                                                   # the sea chest with no lock
A.trunk(k, TX, TR, w=0.9, d=0.55, tone='#2a1a12')
for x in (TX + 0.15, TX + 0.75):
    k.box(x - 0.04, TR - 0.01, 0.0, x + 0.04, TR + 0.56, 0.5, (BRASS, 0.25), 'chest_band')
k.box(TX + 0.38, TR - 0.02, 0.32, TX + 0.52, TR + 0.0, 0.44, '#e0c060', 'chest_hasp')
k.solid(TX, TR, TX + 0.9, TR + 0.55)

# ---- the corner (front left): the mermaid figurehead in a tricorn ----------------------------------------------------------
FH = (1.7, 8.6)
k.cyl(FH[0], FH[1], 0.0, 0.25, 0.32, ('#3e2414', 0.12), 'fh_plinth', verts=12)
k.blob(FH[0], FH[1], 0.55, 0.16, 0.14, 0.32, ('#2a7a6a', 0.1), 'fh_tail')
k.cone(FH[0] + 0.05, FH[1] + 0.05, 0.25, 0.4, 0.05, 0.22, ('#2a7a6a', 0.1), 'fh_fin', verts=6)
k.blob(FH[0], FH[1] - 0.03, 1.0, 0.15, 0.12, 0.18, ('#e8c8a8', 0.12), 'fh_body')
k.sphere(FH[0], FH[1] - 0.03, 1.32, 0.1, 0.11, ('#e8c8a8', 0.12), 'fh_head', segs=10)
k.blob(FH[0], FH[1] + 0.05, 1.22, 0.13, 0.08, 0.24, ('#c84a22', 0.12), 'fh_hair')
k.cyl(FH[0], FH[1], 1.4, 1.48, 0.17, '#141014', 'fh_hat', verts=3)     # a three-cornered hat on her, at an angle
k.cyl(FH[0], FH[1], 1.48, 1.55, 0.09, '#141014', 'fh_hat', verts=10)
k.solid(1.2, 8.1, 2.3, 9.2)

# ---- the walls: wanted posters, a chart pinned with a knife, a flag, crossed cutlasses -----------------------------------
for (x, z) in ((1.6, 1.4), (2.5, 1.55), (3.3, 1.35), (4.1, 1.5)):
    k.box(x - 0.24, 2.04, z - 0.3, x + 0.24, 2.06, z + 0.3, ('#d8c8a0', 0.1), 'poster')
    k.box(x - 0.14, 2.06, z - 0.02, x + 0.14, 2.065, z + 0.18, '#3a2a1a', 'poster_face')
    k.box(x - 0.18, 2.06, z - 0.22, x + 0.18, 2.065, z - 0.14, '#7a2a1a', 'poster_ink')
k.box(14.0, 2.05, 1.9, 16.6, 2.08, 2.45, ('#141014', 0.2), 'flag')               # the black flag over the bar
k.blob(15.3, 2.09, 2.2, 0.1, 0.02, 0.1, '#e8e4d8', 'flag_skull', segs=8)
for s in (-1, 1):
    k.tube((15.3 - s * 0.22, 2.1, 2.0), (15.3 + s * 0.22, 2.1, 2.36), 0.02, '#e8e4d8', 'flag_bones', verts=4)
for s in (-1, 1):                                                  # crossed cutlasses by the door
    k.tube((10.6 - s * 0.35, 9.96, 1.2), (10.6 + s * 0.35, 9.96, 1.7), 0.02, '#c8c8d0', 'cutlass', verts=4)

# ---- light: lamps over the tables, the stove, the gallery's moonlight -------------------------------------------------------
A.rug(k, 5.6, 4.6, 11.2, 8.0, col='#4a1a1a', trim='#c8a040', pattern=True)
for (cx, cr) in ((16.4, 5.4), (16.5, 6.1)):                         # crates and a keg along the right wall
    A.crate(k, cx - 0.3, cr - 0.3, s=0.55, tone='#5a3e24')
A.barrel(k, 16.4, 8.4, h=0.8, radius=0.3, tone=RUM)
k.solid(15.9, 5.0, 16.9, 8.8)
for i in range(4):                                                   # a coil of rope by the door
    k.cyl(11.6, 9.4, 0.02 + i * 0.06, 0.07 + i * 0.06, 0.28 - i * 0.02, ('#b49a64', 0.15), 'rope_coil', verts=14)
k.solid(11.3, 9.1, 11.9, 9.7)
for (x, r, e) in ((3.4, 5.3, 70), (7.0, 5.5, 55), (10.0, 6.8, 55), (13.3, 7.2, 60), (14.2, 4.0, 80), (6.5, 8.4, 40)):
    A.hanging_lamp(k, x, r, energy=e, visible=False)
k.area_light(9.0, 9.5, 3.0, '#7a80c0', 40, 6.0, rot=(math.radians(-25), 0, 0))        # a cool fill off the cove through the door
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.68}}, light_samples=128, world_light=('#3a3046', 0.45))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Salt Rat', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
          'spawns': {'player': [8, 9]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-cinder', 'leaveSpawn': [20, 22], 'label': 'THE COVE', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 14, 'y': 3, 'type': 'dialog', 'label': 'ROOK', 'prompt': 'PRESS E TO TALK',
     'dialog': 'A BIG MAN WITH ONE EYE AND A BEARD YOU COULD LOSE A KNIFE IN. "RUM, GROG OR TROUBLE?"'},
    {'x': 12, 'y': 3, 'type': 'vendor', 'label': 'BAR', 'prompt': 'PRESS E TO ORDER',
     'items': [{'id': 'mug_of_ale', 'price': 5}, {'id': 'bowl_of_stew', 'price': 12}, {'id': 'sea_biscuit', 'price': 3}]},
    {'x': 3, 'y': 5, 'type': 'dice', 'table': 'rat', 'label': 'DICE TABLE', 'prompt': 'PRESS E TO PLAY'},
    {'x': 2, 'y': 5, 'type': 'dialog', 'label': 'RED ANNIS', 'prompt': 'PRESS E TO TALK',
     'dialog': 'A WOMAN IN A RED COAT WITH A SCAR THROUGH ONE EYEBROW, SPINNING A COIN ON ITS EDGE. "SIT. THE BONES DON\'T BITE. I DO."'},
    {'x': 4, 'y': 5, 'type': 'dialog', 'label': 'GASH', 'prompt': 'PRESS E TO TALK',
     'dialog': 'A THIN MAN, A RING IN EVERY KNUCKLE. HE SMILES WITH HALF HIS MOUTH. "FRESH COINS. LOVELY."'},
    {'x': 9, 'y': 2, 'type': 'dialog', 'label': 'STERN GALLERY', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE GALLEON\'S STERN WINDOWS, FIVE OF THEM, LEADED AND GILDED, LOOKING OUT ON THE COVE WHERE SHE SANK.\n\nSCRATCHED IN ONE PANE: "THE HONOURABLE WIDGEON, OF HIS MAJESTY\'S NAVY. SCUTTLED HERE. LIVED IN SINCE."'},
    {'x': 11, 'y': 2, 'type': 'dialog', 'label': 'PARROT', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A GREEN PARROT WITH A RED WING. IT LOOKS AT YOUR PURSE, THEN AT YOU.\n\n"PIECES OF EIGHT," IT SAYS. "PIECES OF NINE. PIECES OF TEN. MAKE AN OFFER."'},
    {'x': 6, 'y': 8, 'type': 'dialog', 'label': 'SEA CHEST', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A SEA CHEST BOUND IN BRASS, NO LOCK ON IT AT ALL. NOBODY HAS EVER OPENED IT. ROOK SAYS IT BELONGED TO THE MAN WHO BUILT THE BAR, AND THAT HE\'S STILL IN IT.\n\nYOU LEAVE IT SHUT.'},
    {'x': 1, 'y': 8, 'type': 'dialog', 'label': 'FIGUREHEAD', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A MERMAID OFF SOME MERCHANTMAN, RED-HAIRED, WEARING A REAL TRICORN THAT SOMEBODY NAILED TO HER HEAD. THE PIRATES TOAST HER BEFORE EVERY VOYAGE. SHE HAS SEEN THINGS.'},
    {'x': 2, 'y': 3, 'type': 'dialog', 'label': 'STOVE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE WIDGEON\'S OWN GALLEY STOVE, STILL BURNING SHIP\'S TIMBER. A POT OF SOMETHING THAT WAS ONCE FISH SIMMERS ON IT, AND ALWAYS WILL.'},
    {'x': 3, 'y': 2, 'type': 'dialog', 'label': 'WANTED', 'prompt': 'PRESS E TO READ',
     'dialog': 'WANTED POSTERS FROM EVERY PORT ON THE FIVE SEAS. THE PIRATES PIN THEIR OWN UP HERE, PROUDLY. RED ANNIS\'S IS FRAMED.'},
    {'x': 13, 'y': 7, 'type': 'dialog', 'label': 'LONG GUN', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A LONG NINE ON ITS CARRIAGE WITH A PLANK ACROSS IT FOR A TABLE. IT IS NOT LOADED. ROOK CHECKS EVERY NIGHT, BECAUSE ONCE IT WAS.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=[
    {'sheet': 'npc-rook', 'x': 14, 'y': 2, 'facing': 'down'},
    {'sheet': 'npc-annis', 'x': 2, 'y': 5, 'facing': 'right', 'pose': 'sit'},
    {'sheet': 'npc-gash', 'x': 4, 'y': 5, 'facing': 'left', 'pose': 'sit'},
    {'sheet': 'npc-regular', 'x': 6, 'y': 5, 'facing': 'right', 'pose': 'sit'},
])
print('salt rat done')
