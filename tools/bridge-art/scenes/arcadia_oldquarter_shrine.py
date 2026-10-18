"""The shrine on Lantern Row's roofs — Blender scene (world id "arcadia-oldquarter-shrine").

  BVENV/bin/python tools/bridge-art/scenes/arcadia_oldquarter_shrine.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-oldquarter-shrine

Up the stone stair from the lane (scenes/arcadia_oldquarter.py): the flat roof of the old warehouse, raked white gravel
and stepping stones, a little shrine hall under its tile roof with a bell rope and an offering box, a vermilion torii,
two stone lanterns, a bent pine, the ema rack hung with wishes, the omikuji slips tied to a wire, Kanna who keeps it —
and all round, the quarter's tile roofs just below, the Loop's viaduct striding past behind at eye level with its
masts, and the towers over everything.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_cyber as Y               # noqa: E402
import assets_district as D            # noqa: E402
import assets_signs as S               # noqa: E402
import assets_oldquarter as O          # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-oldquarter-shrine'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 22, 13
X0, X1, R0, R1 = 0.5, 21.5, 0.3, 9.6          # the roof
k = Kit(COLS, ROWS, margin_top=2.6, margin_bottom=0.6, margin_x=0.5, seed=1871)
st = D.Street()
rng = k.rng

# ---- the roof: a parapet, raked gravel, stepping stones ---------------------------------------------------------------
k.box(X0 - 0.15, R0 - 0.15, -3.0, X1 + 0.15, R1 + 0.15, -0.06, ('#a89a84', 0.12), 'house_wall')       # the warehouse below
k.box(X0, R0, -0.08, X1, R1, -0.02, '#3a3438', 'roof_deck')
k.box(X0 + 0.1, R0 + 0.1, -0.02, X1 - 0.1, R1 - 0.1, 0.0, ('#cfcac0', 0.2), 'gravel')
for r in [R0 + 0.35 + i * 0.22 for i in range(int((R1 - R0 - 0.6) / 0.22))]:          # raked lines
    k.box(X0 + 0.2, r, 0.0, X1 - 0.2, r + 0.03, 0.004, '#a8a49c', 'gravel_rake')
for i, (x, r) in enumerate([(10.5 + math.sin(j * 1.7) * 0.15, 9.0 - j * 0.62) for j in range(7)]):   # stepping stones to the hall
    k.cyl(x, r, 0.0, 0.05, 0.32, ('#6a6670', 0.12), 'path_stone', verts=9, ry=0.24)
for (x, r) in ((13.2, 6.9), (14.0, 7.4), (15.0, 7.6), (16.0, 7.2), (17.1, 6.8), (18.3, 6.5)):    # and on to the stair
    k.cyl(x, r, 0.0, 0.05, 0.28, ('#6a6670', 0.12), 'path_stone', verts=9, ry=0.22)
k.box(X0 - 0.15, R1, -0.06, X1 + 0.15, R1 + 0.15, 0.35, ('#6a6470', 0.1), 'parapet')
for (a, b, c, d) in ((X0 - 0.15, R0 - 0.15, X0, R1), (X1, R0 - 0.15, X1 + 0.15, R1), (X0 - 0.15, R0 - 0.15, X1 + 0.15, R0)):
    k.box(a, b, -0.06, c, d, 0.35, ('#6a6470', 0.1), 'parapet')
x = X0
while x <= X1 + 0.01:
    k.box(x - 0.04, R1 + 0.03, 0.35, x + 0.04, R1 + 0.11, 0.95, O.TIMBER, 'rail_post')
    x += 0.6
k.box(X0, R1 + 0.02, 0.92, X1, R1 + 0.12, 0.98, (O.VERMILION, 0.08), 'rail')
k.solid(0, R1, COLS, ROWS)

# ---- the shrine hall: raised on posts, a veranda, the bell rope and the offering box -----------------------------------
HX0, HX1, HR0, HR1 = 6.5, 14.5, 0.6, 3.6
k.box(HX0, HR0, 0.0, HX1, HR1, 0.42, ('#4a3428', 0.12), 'hall_base')
k.box(HX0 + 0.3, HR0 + 0.2, 0.42, HX1 - 0.3, HR1 - 0.6, 2.2, ('#e8dcc4', 0.1), 'shrine_wall')
for xp in [HX0 + 0.3 + i * (HX1 - HX0 - 0.6) / 4 for i in range(5)]:
    k.box(xp - 0.08, HR1 - 0.66, 0.42, xp + 0.08, HR1 - 0.54, 2.2, (O.VERMILION, 0.08), 'shrine_post')
    k.box(xp - 0.08, HR1 - 0.06, 0.0, xp + 0.08, HR1 + 0.06, 2.2, (O.VERMILION, 0.08), 'shrine_post')
k.box(HX0 + 0.4, HR1 - 0.62, 0.6, HX1 - 0.4, HR1 - 0.6, 1.9, shade('#ffc070', 0.5), 'shrine_glow', emit=('#ffc070', 0.55))
O.lattice(k, HX0 + 0.4, HX1 - 0.4, HR1 - 0.59, 0.6, 1.9, step=0.14)
k.box(HX0, HR1 - 0.6, 0.42, HX1, HR1 + 0.1, 0.48, ('#6a4a30', 0.12), 'floor_veranda')
k.box(HX0, HR1 + 0.04, 0.48, HX1, HR1 + 0.1, 0.78, O.TIMBER, 'veranda_rail')
for i in range(3):                                                                          # the steps up to it
    k.box(9.4, HR1 + 0.1 + i * 0.2, 0.0, 11.6, HR1 + 0.3 + i * 0.2, 0.42 - i * 0.14, ('#5a5660', 0.12), 'stone_step')
O.tile_roof(k, HX0 - 0.2, HX1 + 0.2, HR0 - 0.2, HR1 + 0.1, 2.2, 1.25, col=O.KAWARA[2], wall='#e8dcc4', over=0.6)
O.shimenawa(k, HX0 + 0.6, HX1 - 0.6, HR1 + 0.08, 2.1, sag=0.18)
k.box(9.7, HR1 + 0.15, 0.0, 11.3, HR1 + 0.7, 0.62, ('#5a3a24', 0.1), 'offering_box')                # the offering box
k.boxes([(x, HR1 + 0.7, 0.42, x + 0.05, HR1 + 0.72, 0.6) for x in [9.8 + i * 0.12 for i in range(12)]], '#2a1a12', 'offering_slats')
k.tube((10.5, HR1 + 0.1, 2.05), (10.5, HR1 + 0.3, 0.75), 0.04, ('#c83a2a', 0.08), 'bell_rope', verts=6)   # the bell rope
k.tube((10.56, HR1 + 0.1, 2.05), (10.6, HR1 + 0.3, 0.8), 0.03, ('#f0e8d0', 0.08), 'bell_rope', verts=6)
k.sphere(10.5, HR1 + 0.1, 2.08, 0.16, 0.14, ('#c8a040', 0.08), 'bell', segs=10)
S.letters(k, '稲荷', 'DelaGothicOne', 10.5, HR1 + 0.11, 2.5, size=0.26, col='#ffd890', energy=4)
k.point_light(10.5, HR1 + 0.8, 1.6, '#ffb868', 40, radius=0.6, group='flicker')
k.solid(HX0, HR0, HX1, HR1 + 0.7)
for (x, s) in ((8.9, 1), (12.1, -1)):                                                  # the fox guardians
    k.box(x - 0.25, HR1 + 0.55, 0.0, x + 0.25, HR1 + 1.0, 0.4, ('#5a5660', 0.12), 'plinth')
    k.blob(x, HR1 + 0.78, 0.65, 0.16, 0.13, 0.25, ('#8a8690', 0.12), 'fox', segs=10)
    k.blob(x + s * 0.03, HR1 + 0.82, 0.98, 0.12, 0.1, 0.11, '#8a8690', 'fox', segs=10)
    for e in (-1, 1):
        k.cone(x + e * 0.06, HR1 + 0.82, 1.04, 1.18, 0.035, 0.005, '#8a8690', 'fox_ear', verts=4)
    k.tube((x - s * 0.12, HR1 + 0.72, 0.45), (x - s * 0.25, HR1 + 0.75, 0.9), 0.06, '#8a8690', 'fox_tail', verts=6)
    k.box(x - 0.1, HR1 + 0.93, 0.72, x + 0.1, HR1 + 0.95, 0.86, '#c8301e', 'fox_bib')
    k.solid(x - 0.25, HR1 + 0.55, x + 0.25, HR1 + 1.0)

# ---- the torii, the lanterns, the pine, the ema rack, the omikuji wire ---------------------------------------------------
O.torii(k, 10.5, 8.5, w=3.0, h=2.6)
for x in (7.2, 13.8):
    O.stone_lantern(k, x, 6.6, h=1.25)
with k.foliage('needle'):
    k.tube((3.4, 4.6, 0.0), (3.0, 4.5, 1.3), 0.16, '#3a2618', 'trunk', verts=8)
    k.tube((3.0, 4.5, 1.3), (4.1, 4.7, 2.2), 0.12, '#3a2618', 'trunk', verts=8)
    k.tube((3.0, 4.5, 1.3), (2.2, 4.6, 1.9), 0.09, '#3a2618', 'trunk', verts=7)
    for (dx, dr, dz, rx) in ((0.0, 0.0, 1.5, 0.95), (1.0, 0.2, 2.2, 1.0), (-0.9, 0.2, 1.95, 0.7), (0.4, 0.1, 2.75, 0.7), (1.6, 0.3, 1.6, 0.6)):
        k.blob(3.1 + dx, 4.6 + dr, dz, rx, rx * 0.8, rx * 0.34, ('#1e3a2a', 0.2), 'leaves', segs=12)
        k.blob(3.1 + dx, 4.68 + dr, dz + 0.12, rx * 0.8, rx * 0.62, rx * 0.22, ('#2e5a3a', 0.2), 'leaves', segs=12)
k.cyl(3.4, 4.6, 0.0, 0.08, 0.5, '#5a5660', 'pine_ring', verts=14)
k.solid(2.8, 4.0, 4.0, 5.2)
# the ema rack: little wooden plaques with wishes, hung on pegs under a tiny roof
EX = 17.0
for xp in (EX - 0.9, EX + 0.9):
    k.box(xp - 0.05, 4.9, 0.0, xp + 0.05, 5.0, 1.6, O.TIMBER, 'ema_post')
k.box(EX - 1.0, 4.88, 0.95, EX + 1.0, 4.96, 1.0, O.TIMBER, 'ema_rail')
k.box(EX - 1.0, 4.88, 1.42, EX + 1.0, 4.96, 1.47, O.TIMBER, 'ema_rail')
k.poly([(EX - 1.15, 5.2, 1.6), (EX + 1.15, 5.2, 1.6), (EX + 1.15, 4.6, 1.85), (EX - 1.15, 4.6, 1.85)], (O.KAWARA[0], 0.1), 'roof_ema')
for row, z in enumerate((0.72, 1.18)):
    for i in range(9):
        x = EX - 0.85 + i * 0.21 + (row % 2) * 0.1
        k.poly([(x - 0.08, 4.99, z), (x + 0.08, 4.99, z), (x + 0.08, 4.99, z + 0.12), (x, 4.99, z + 0.17), (x - 0.08, 4.99, z + 0.12)],
               ('#d8b884', 0.1), 'ema_plaque')
        k.box(x - 0.05, 5.0, z + 0.03, x + 0.05, 5.002, z + 0.09, rng.choice(('#2a1a12', '#c8301e', '#2a3a6a')), 'ema_ink')
k.solid(EX - 1.0, 4.85, EX + 1.0, 5.05)
# the omikuji wire: paper fortunes tied in knots along two cords between posts
for xp in (3.6, 6.0):
    k.box(xp - 0.04, 7.6, 0.0, xp + 0.04, 7.68, 1.3, O.TIMBER, 'omikuji_post')
for z in (0.85, 1.15):
    k.tube((3.6, 7.64, z), (6.0, 7.64, z), 0.008, '#3a3a3a', 'omikuji_cord', verts=3)
    for i in range(16):
        x = 3.7 + i * 0.14 + rng.uniform(-0.03, 0.03)
        k.box(x - 0.03, 7.6, z - 0.08, x + 0.03, 7.7, z + 0.02, '#f4f0e6', 'omikuji_slip')
k.solid_post(3.6, 7.64)
k.solid_post(6.0, 7.64)
O.potted_plant(k, 19.6, 8.6, 'bamboo', s=1.2)
O.potted_plant(k, 1.6, 8.6, 'bonsai', s=1.1)

# ---- the stair head, going down at the east end -------------------------------------------------------------------------
k.box(19.0, 2.6, -0.06, 21.4, 5.6, 0.0, '#2a2428', 'stair_well')
for i in range(5):
    k.box(19.1, 2.7 + i * 0.55, -0.06 - (4 - i) * 0.22, 21.3, 3.25 + i * 0.55, -0.02 - (4 - i) * 0.22, ('#5a5660', 0.12), 'stone_step')
for xs in (19.0, 21.4):
    k.tube((xs, 5.6, 0.95), (xs, 2.6, 0.0), 0.035, (O.VERMILION, 0.08), 'stair_rail', verts=6)
    k.box(xs - 0.04, 5.56, 0.0, xs + 0.04, 5.64, 0.95, O.TIMBER, 'stair_post')
k.solid(19.0, 2.6, 21.4, 5.0)

# ---- round it: the quarter's tile roofs just below, the Loop's viaduct passing behind, a tower's foot -------------------
for (a, b, rb_, rf_, ze) in ((-2.0, 6.0, 10.0, 12.6, -1.5), (6.4, 13.0, 10.0, 12.6, -2.0), (13.4, 19.8, 10.2, 12.4, -1.7),
                             (20.2, 26.0, 10.0, 12.6, -1.9), (-3.0, 0.4, 3.0, 9.0, -1.2), (21.6, 25.0, 2.6, 9.0, -1.4)):
    O.tile_roof(k, a, b, rb_, rf_, ze, 0.9, col=rng.choice(O.KAWARA), wall=rng.choice(O.PLASTER))
for x in (2.0, 9.6, 16.6, 23.0):                                                # lanterns strung along the lane, glimpsed
    Y.paper_lantern(k, x, 12.9, -1.6, col='#e83a2a', s=0.5, top=-1.2)
O.viaduct(k, -2.0, COLS + 2.0, -1.0, 3.4)
k.box(-3.0, -3.0, -3.0, 0.3, 2.5, 9.0, ('#16122a', 0.08), 'tower')                 # the foot of a tower, windows lit
rects = []
for i in range(6):
    for j in range(10):
        if rng.random() < 0.45:
            rects.append((-2.8 + i * 0.5, 2.5, 8.4 - j * 1.0, -2.55 + i * 0.5, 2.52, 8.7 - j * 1.0))
k.boxes(rects, shade('#ffd890', 0.5), 'tower_window', emit=('#ffd890', 0.7))

# ---- light: lanterns, the shrine's glow, the city's from below and above -------------------------------------------------
k.point_light(10.5, 7.5, 2.4, '#ffb060', 30, radius=0.8)
k.point_light(4.0, 6.5, 2.2, '#ff9050', 16, radius=0.6)
k.area_light(COLS / 2, 3.0, 10.0, '#7058b8', 520, 24.0, rot=(math.radians(-35), 0, 0))
k.area_light(COLS / 2, 14.0, -4.0, '#ff70b0', 160, 22.0, rot=(math.radians(150), 0, 0))
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=128, world_light=('#241a40', 0.45))

w = {'name': 'The Roof Shrine', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
     'spawns': {'player': [19, 6]}, 'shipExit': False, 'tiles': [], 'collisions': [], 'tileNames': {},
     'interactions': [
         {'x': 20, 'y': 5, 'type': 'enter_world', 'target': 'arcadia-oldquarter', 'spawn': [8, 9], 'label': 'STAIRS DOWN',
          'prompt': 'PRESS E TO GO DOWN'},
         {'x': 10, 'y': 4, 'type': 'omikuji', 'label': 'OFFERING BOX', 'prompt': 'PRESS E TO RING THE BELL'},
         {'x': 5, 'y': 7, 'type': 'dialog', 'label': 'OMIKUJI', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'FORTUNES ON PAPER, TIED IN KNOTS ALONG THE CORD. YOU TIE A BAD ONE HERE AND WALK AWAY FROM IT. THE CORD IS '
                    'VERY FULL. LANTERN ROW HAS HAD A LONG YEAR.'},
         {'x': 17, 'y': 5, 'type': 'dialog', 'label': 'EMA', 'prompt': 'PRESS E TO READ',
          'dialog': 'WISHES ON LITTLE WOODEN PLAQUES:\n\n"LET HOSHI KEEP THE SHOP ONE MORE YEAR."\n"A BERTH ON A FREIGHTER, ANY '
                    'FREIGHTER."\n"FOR THE TOWERS TO LEAVE US BE."\n"PASS MY EXAMS (PLEASE)."\n"BRING HER HOME FROM THE SUMP."'},
         {'x': 16, 'y': 6, 'type': 'dialog', 'label': 'KANNA', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE SHRINE\'S KEEPER IS SWEEPING THE GRAVEL INTO LINES.'},
         {'x': 10, 'y': 9, 'type': 'dialog', 'label': 'THE VIEW', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'THE QUARTER\'S ROOFS RIGHT BELOW YOU, LANTERNS STRUNG BETWEEN THEM. THEN THE NEON STREET, THEN THE TOWERS, '
                    'THEN THE SKY. THE LOOP GOES BY AT EYE LEVEL AND EVERY WINDOW IN IT IS LIT.'},
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(16, 6, 17, 7)
apply_world(WORLD, k, (1, 1, COLS - 2, 9), scene_id=WID,
            actors=[{'sheet': 'npc-kanna', 'x': 16, 'y': 6, 'facing': 'down'}],
            scene_extra={'backdrop': True, 'steam': st.steam})
w = json.load(open(WORLD))
w['view'] = [-1.0, -3.5, COLS + 1.0, ROWS + 0.5]
w['skyline'] = {'baseRow': 1.0, 'railRow': R1 + 0.4, 'centerCol': COLS / 2, 'rain': {'drops': 120, 'splash': [1.0, 3.2, 21.0, 9.4]}}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('shrine done')
