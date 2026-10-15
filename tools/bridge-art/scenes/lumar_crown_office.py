"""The Harbour Office of Crownhaven — the clerks' hall on the quay (world id "lumar-crown-office").
Usage: BVENV/bin/python lumar_crown_office.py RENDER_DIR

A long counter with brass grilles across the room: the Registry window, where every keel on the five seas is entered in
the great book (your ships, js/harbour.js `ledger`), and the Chart window, where Pim sells the charts of the far seas
(js/chart.js `shop`). Behind them pigeonholes and a strongroom door. On the back wall the Office's own chart of the five
seas, pinned and annotated (opens your chart), and the tide clock. The waiting side: benches, a galleon model in a glass
case, a globe, the notices.
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade
import assets_village as V

OUT = sys.argv[1]
WID = 'lumar-crown-office'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 16, 11
H = 2.2 / math.cos(THETA)
FLOOR = (1, 2, 14, 8)
DOORS = [(7, 9), (8, 9)]
BRASS = '#d0a048'
GREEN = '#2a4a3a'

k = Kit(COLS, ROWS, margin_top=1.2, margin_bottom=0.5, seed=4419)

# ---- the shell --------------------------------------------------------------------------------------------------
A.floor_planks(k, 1, 2, 15, 9, tone='#7a5434')
A.back_wall(k, 0.4, 15.6, 2.0, H, plaster='#d8ccb0', wainscot=1.0, wainscot_col=GREEN, beams_every=0)
k.box(0.4, 1.96, H - 0.2, 15.6, 2.08, H, ('#3e2414', 0.12), 'picture_rail')
A.side_wall(k, 0.4, 1.0, 1.5, 9.0, H)
A.side_wall(k, 15.0, 15.6, 1.5, 9.0, H)
A.front_wall(k, 0.4, 15.6, 9.0, gaps=[(7.0, 9.0)])
A.door_frame(k, 7.0, 9.0, 9.0)

# ---- the Office's chart of the five seas: big, pinned, annotated --------------------------------------------------
CX0, CX1, CZ0, CZ1 = 4.6, 8.8, 1.15, 2.7
k.box(CX0 - 0.12, 1.96, CZ0 - 0.12, CX1 + 0.12, 2.04, CZ1 + 0.12, ('#5a3a1e', 0.12), 'chart_frame')
k.box(CX0, 2.04, CZ0, CX1, 2.06, CZ1, ('#d8c8a0', 0.08), 'chart_paper')
SEAS = [(4.7, 2.0, 1.4, 0.65, '#b0a4b8'), (7.4, 2.0, 1.35, 0.65, '#c8a8b0'), (5.6, 1.5, 2.3, 0.6, '#a8c0a0'),
        (4.7, 1.2, 1.5, 0.45, '#c8a090'), (7.3, 1.2, 1.45, 0.45, '#a8b4c8')]
for (x, z, w, h, col) in SEAS:
    k.box(x, 2.06, z, min(CX1 - 0.04, x + w), 2.065, min(CZ1 - 0.04, z + h), (col, 0.08), 'chart_sea')
for (x, z, s) in ((6.7, 1.85, 0.16), (6.7, 2.45, 0.2), (6.0, 2.25, 0.1), (7.5, 2.2, 0.1), (5.3, 2.35, 0.15), (8.1, 2.4, 0.15),
                  (5.3, 1.4, 0.15), (8.1, 1.4, 0.15)):
    k.blob(x, 2.07, z, s, 0.01, s * 0.55, ('#8a6a3a', 0.1), 'chart_isle', segs=8)
for (x, z, col) in ((6.75, 2.5, '#c02a1e'), (6.05, 2.3, '#2a6ac0'), (7.55, 2.25, '#2a8a4a'), (8.15, 1.45, '#c02a1e'), (5.35, 1.45, '#e0b040')):
    k.sphere(x, 2.09, z, 0.035, 0.035, (col, 0.2), 'chart_pin', segs=6)
for (a, b) in (((6.7, 1.85), (6.75, 2.45)), ((6.7, 1.85), (8.1, 1.45)), ((6.7, 1.85), (5.3, 2.35))):   # routes, in red thread
    k.tube((a[0], 2.075, a[1]), (b[0], 2.075, b[1]), 0.008, ('#a02a22', 0.2), 'chart_thread', verts=4)
V.board_sign(k, 'THE FIVE SEAS', 'AlegreyaSC-Bold', (CX0 + CX1) / 2, 2.05, CZ1 + 0.28, size=0.14, board='#2a3a30')

# the tide clock: two hands, HIGH and LOW
TX, TZ = 11.6, 1.95
k.cyl_y(TX, 1.98, 2.08, TZ, 0.42, 0.42, (BRASS, 0.12), 'tide_rim', verts=22)
k.cyl_y(TX, 2.06, 2.1, TZ, 0.35, 0.35, '#f0e8d0', 'tide_face', verts=22)
k.box(TX - 0.3, 2.1, TZ - 0.02, TX - 0.05, 2.11, TZ + 0.02, ('#2a6ac0', 0.1), 'tide_low')
k.box(TX + 0.05, 2.1, TZ - 0.02, TX + 0.3, 2.11, TZ + 0.02, ('#c02a1e', 0.1), 'tide_high')
k.tube((TX, 2.12, TZ), (TX + 0.18, 2.12, TZ + 0.2), 0.02, ('#1a1a1a', 0.1), 'tide_hand', verts=4)
A.window(k, 13.6, 2.0, z0=1.2, w=1.0, h=1.0)
A.window(k, 2.4, 2.0, z0=1.2, w=1.0, h=1.0)

# ---- the counter across the room: two windows behind brass grilles -------------------------------------------------
CR0, CR1 = 4.3, 4.9
A.bar_counter(k, 1.0, 10.4, CR0, CR1, height=1.05)
for (x0, x1, name) in ((1.6, 4.4, 'REGISTRY'), (6.0, 8.8, 'CHARTS')):
    k.box(x0 - 0.1, CR0 + 0.05, 1.05, x0, CR0 + 0.2, 2.1, ('#3e2414', 0.12), 'grille_post')
    k.box(x1, CR0 + 0.05, 1.05, x1 + 0.1, CR0 + 0.2, 2.1, ('#3e2414', 0.12), 'grille_post')
    k.box(x0 - 0.1, CR0 + 0.05, 2.1, x1 + 0.1, CR0 + 0.2, 2.25, ('#3e2414', 0.12), 'grille_head')
    x = x0 + 0.15
    while x < x1 - 0.1:
        if abs(x - (x0 + x1) / 2) > 0.45:                 # the bars, a gap in the middle for the window
            k.cyl(x, CR0 + 0.12, 1.05, 2.1, 0.018, (BRASS, 0.3), 'grille_bar', verts=6)
        x += 0.16
    V.board_sign(k, name, 'AlegreyaSC-Bold', (x0 + x1) / 2, CR0 + 0.2, 2.12, size=0.13, board='#2a3a30')
for x in (10.4, 1.0):
    k.box(x - 0.05 if x > 5 else x, CR0, 1.05, x + (0 if x > 5 else 0.05), CR1, 1.1, ('#3e2414', 0.12), 'counter_end')
# what's on the counter: the great register open, the inkwell, the chart roll, the bell
k.box(2.4, CR0 + 0.1, 1.05, 3.6, CR0 + 0.5, 1.12, ('#5a2a1a', 0.12), 'register')
k.box(2.45, CR0 + 0.12, 1.12, 3.55, CR0 + 0.48, 1.14, ('#f0e8d0', 0.1), 'register_page')
k.box(3.0, CR0 + 0.12, 1.12, 3.02, CR0 + 0.48, 1.15, ('#3a2a1a', 0.1), 'register_spine')
k.cyl(3.9, CR0 + 0.3, 1.05, 1.13, 0.05, ('#1a1a20', 0.15), 'inkwell', verts=8)
for i, col in enumerate(('#d8c8a0', '#c8b890', '#e0d4b0')):
    k.cyl_x(6.6 + i * 0.05, 8.2 - i * 0.2, CR0 + 0.2 + i * 0.1, 1.1 + i * 0.07, 0.05, 0.05, (col, 0.1), 'chart_roll', verts=10)
k.cyl(9.4, CR0 + 0.3, 1.05, 1.1, 0.07, (BRASS, 0.3), 'bell', verts=10)
k.sphere(9.4, CR0 + 0.3, 1.12, 0.05, 0.05, (BRASS, 0.3), 'bell', segs=8)
k.solid(1.0, 2.0, 10.4, CR1)                            # behind the counter is the clerks'

# behind it: the clerks' desks, pigeonholes, the strongroom door
k.box(1.1, 2.1, 0.0, 4.2, 2.5, 2.0, ('#4a2e18', 0.12), 'pigeonholes')
for i in range(5):
    for j in range(5):
        x, zz = 1.25 + i * 0.58, 0.15 + j * 0.37
        k.box(x, 2.48, zz, x + 0.5, 2.5, zz + 0.3, ('#24160a', 0.12), 'hole')
        if (i * 3 + j) % 4:
            k.box(x + 0.05, 2.38, zz + 0.02, x + 0.42, 2.52, zz + 0.08 + 0.12 * ((i + j) % 2), ('#e8dcc0', 0.1), 'papers')
k.box(9.4, 1.98, 0.0, 10.3, 2.12, 1.8, ('#4a4a50', 0.2), 'strongroom')
k.box(9.48, 2.1, 0.08, 10.22, 2.14, 1.72, ('#3a3a40', 0.2), 'strongroom_door')
k.cyl_y(9.85, 2.12, 2.2, 0.95, 0.12, 0.12, (BRASS, 0.3), 'strongroom_wheel', verts=10)
for (x0, x1) in ((2.0, 3.6), (6.4, 8.0)):
    k.box(x0, 2.6, 0.72, x1, 3.1, 0.78, ('#6a4426', 0.12), 'clerk_desk', bevel=0.02)
    k.box(x0 + 0.05, 2.65, 0, x0 + 0.15, 3.05, 0.72, ('#3e2414', 0.12), 'desk_leg')
    k.box(x1 - 0.15, 2.65, 0, x1 - 0.05, 3.05, 0.72, ('#3e2414', 0.12), 'desk_leg')
    A.desk_lamp(k, x0 + 0.3, 2.8, 0.78, energy=3.0)
    A.book_stack(k, x1 - 0.35, 2.85, n=3)

# ---- the waiting side (right): benches, the galleon in her case, the globe, the notices ------------------------
GC = (12.8, 4.2)                                        # the case
k.box(GC[0] - 0.75, GC[1] - 0.35, 0.0, GC[0] + 0.75, GC[1] + 0.35, 0.85, ('#3e2414', 0.12), 'case_stand', bevel=0.02)
for (dx, dr) in ((-0.7, -0.3), (0.7, -0.3), (-0.7, 0.3), (0.7, 0.3)):      # the case: a brass frame, the glass left to the eye
    k.box(GC[0] + dx - 0.03, GC[1] + dr - 0.03, 0.85, GC[0] + dx + 0.03, GC[1] + dr + 0.03, 1.75, (BRASS, 0.3), 'case_post')
for dr in (-0.3, 0.3):
    k.box(GC[0] - 0.73, GC[1] + dr - 0.03, 1.72, GC[0] + 0.73, GC[1] + dr + 0.03, 1.78, (BRASS, 0.3), 'case_rail')
for dx in (-0.7, 0.7):
    k.box(GC[0] + dx - 0.03, GC[1] - 0.33, 1.72, GC[0] + dx + 0.03, GC[1] + 0.33, 1.78, (BRASS, 0.3), 'case_rail')
k.box(GC[0] - 0.68, GC[1] + 0.29, 0.88, GC[0] + 0.68, GC[1] + 0.3, 1.72, ('#20303a', 0.02), 'case_glint', emit=('#405868', 0.08))
k.box(GC[0] - 0.6, GC[1] - 0.25, 0.85, GC[0] + 0.6, GC[1] + 0.25, 0.88, ('#2a5a8a', 0.1), 'case_sea')
k.box(GC[0] - 0.55, GC[1] - 0.1, 0.9, GC[0] + 0.55, GC[1] + 0.1, 1.08, ('#4a2a3a', 0.12), 'model_hull')
k.box(GC[0] - 0.45, GC[1] - 0.08, 1.08, GC[0] + 0.45, GC[1] + 0.08, 1.12, ('#d0a048', 0.2), 'model_wale')
for (dx, h) in ((-0.3, 0.55), (0.0, 0.62), (0.3, 0.5)):
    k.cyl(GC[0] + dx, GC[1], 1.08, 1.08 + h, 0.012, ('#3e2414', 0.12), 'model_mast', verts=4)
    k.box(GC[0] + dx - 0.15, GC[1] - 0.005, 1.25, GC[0] + dx + 0.15, GC[1] + 0.005, 1.05 + h, ('#f0e8d4', 0.1), 'model_sail')
k.solid(GC[0] - 0.8, GC[1] - 0.4, GC[0] + 0.8, GC[1] + 0.4)
A.globe(k, 14.2, 6.0)
A.bench(k, 11.4, 13.8, 7.6)
A.potted_plant(k, 14.3, 8.3)
k.box(11.2, 2.0, 0.95, 12.4, 2.06, 1.75, ('#5a3a1e', 0.12), 'notice_board')         # notices pinned up
for (x, z, w, h) in ((11.3, 1.4, 0.35, 0.3), (11.7, 1.05, 0.3, 0.4), (12.0, 1.35, 0.32, 0.32), (11.35, 1.05, 0.28, 0.25)):
    k.box(x, 2.06, z, x + w, 2.07, z + h, ('#f0e8d0', 0.1), 'notice')
k.solid(11.0, 2.0, 12.6, 2.5)
A.coat_rack(k, 1.6, 8.3)
A.rug(k, 5.2, 6.0, 10.8, 8.2, col='#2a4a3a', trim='#c8a040', pattern=True)   # a worn runner where the queue stands
A.bench(k, 2.0, 4.4, 7.6)
for (x, r, s_, z0) in ((1.3, 5.3, 0.6, 0.0), (1.95, 5.45, 0.5, 0.0), (1.38, 5.38, 0.44, 0.51)):    # unclaimed cargo, tagged
    A.crate(k, x, r, s=s_, z0=z0)
k.box(1.5, 5.98, 0.3, 1.75, 6.0, 0.48, ('#f0e8d0', 0.1), 'cargo_tag')
k.solid(1.0, 5.0, 2.6, 6.1)
A.barrel(k, 14.2, 8.4, h=0.7, radius=0.28)

# ---- light ------------------------------------------------------------------------------------------------------
for (x, r, e) in ((3.0, 4.5, 120), (7.4, 4.5, 120), (12.6, 5.2, 110), (8.0, 7.0, 80), (3.0, 7.2, 60)):
    A.hanging_lamp(k, x, r, energy=e, visible=False)
k.area_light(8.0, 2.6, 1.8, '#7090d0', 25, 1.0, rot=(math.radians(-70), 0, 0))
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.82}}, light_samples=128, world_light=('#3a4258', 0.45))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Harbour Office', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
          'spawns': {'player': [7, 8]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-crown', 'leaveSpawn': [25, 30], 'label': 'THE QUAY', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 3, 'y': 4, 'type': 'registry', 'port': 'lumar-crown', 'label': 'REGISTRY', 'prompt': 'PRESS E TO ASK'},
    {'x': 7, 'y': 4, 'type': 'charts', 'label': 'CHARTS', 'prompt': 'PRESS E TO BUY'},
    {'x': 5, 'y': 4, 'type': 'sea_chart', 'label': 'THE FIVE SEAS', 'prompt': 'PRESS E TO STUDY'},
    {'x': 11, 'y': 2, 'type': 'dialog', 'label': 'TIDE CLOCK', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE TIDE CLOCK. ONE HAND FOR THE TIDE, ONE FOR THE MOON. THE CLERKS SET THEIR WATCHES BY IT AND THEIR LUNCH BY THE OTHER ONE.'},
    {'x': 12, 'y': 4, 'type': 'dialog', 'label': 'MODEL GALLEON', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE CROWN\'S FIRST GALLEON, THE MERIDIAN, IN A GLASS CASE: EVERY GUN PORT, EVERY BLOCK, A CREW OF PAINTED PINHEADS. THE PLAQUE SAYS THE ROYAL YARD STILL BUILDS TO HER LINES.'},
    {'x': 12, 'y': 2, 'type': 'dialog', 'label': 'NOTICES', 'prompt': 'PRESS E TO READ',
     'dialog': 'NOTICES: HARBOUR DUES PAYABLE QUARTERLY. LOST - ONE PARROT, ANSWERS TO "ADMIRAL", SWEARS. CHARTS OF THE FAR SEAS AT THE CHART WINDOW. THE ROYAL YARD TAKES ORDERS FOR GALLEONS (ASK AT THE PIER).'},
    {'x': 1, 'y': 5, 'type': 'dialog', 'label': 'UNCLAIMED CARGO', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'CRATES NOBODY CAME BACK FOR, EACH TAGGED IN WYNN\'S HAND: "SIX JARS PICKLED EELS - THE HERON - HELD." "ONE HARP, NO STRINGS." "ROSEITE, 2 CWT - AWAITING CLAIM SINCE THE SPRING."'},
    {'x': 14, 'y': 6, 'type': 'dialog', 'label': 'GLOBE', 'prompt': 'PRESS E TO SPIN',
     'dialog': 'THE GLOBE SPINS. LUMAR\'S FIVE SEAS ON ONE SIDE, AND ON THE OTHER, NOTHING BUT A NEAT LABEL: "UNSURVEYED".'},
    {'x': 3, 'y': 3, 'type': 'dialog', 'label': 'WYNN', 'prompt': 'PRESS E TO TALK',
     'dialog': 'WYNN, THE REGISTRAR\'S CLERK, DIPS HIS PEN. "NAME OF VESSEL? TONNAGE? NEXT OF KIN?"'},
    {'x': 7, 'y': 3, 'type': 'dialog', 'label': 'PIM', 'prompt': 'PRESS E TO TALK',
     'dialog': 'PIM, WHO KEEPS THE CHARTS, UNROLLS ONE WITH GREAT CARE. "EVERY SOUNDING TAKEN BY SOMEBODY BRAVER THAN ME."'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=[
    {'sheet': 'npc-clerk', 'x': 3, 'y': 3, 'facing': 'down'},
    {'sheet': 'npc-pim', 'x': 7, 'y': 3, 'facing': 'down'},
])
print('harbour office done')
