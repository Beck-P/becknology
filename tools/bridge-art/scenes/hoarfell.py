"""Hoarfell — Fellhaven, the ski village under the cliffs. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell

Evening on an ice world, the low sun turning the snow pink and the shadows
blue. Across the top the cliffs of the Hoarspire massif, three climbing
routes leaving from their foot — the Staircase (a fixed yellow line), the
Icefall (a frozen waterfall) and the Hoarspire itself (red, a flag on top) —
and the chairlift climbing over them. Below, the village street: Ysolde's
guide hut, the Snowcap Lodge with its balcony, the ski hire, the lift station;
south of the street the cocoa hut, the frozen pond with an ice-fishing hole and
a snowman, two chalets, and the landing pad. Snowy firs all round.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world  # noqa: E402
import assets_isle as I                # noqa: E402
import assets_ship as P                # noqa: E402
import assets_signs as G               # noqa: E402
import assets_snow as N                # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'hoarfell'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 46, 34
C = math.cos(math.radians(45))
TOP = 4.6

k = Kit(COLS, ROWS, margin_top=3.6, margin_bottom=0.6, seed=1907)


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


# ---- the ground, the cliffs ------------------------------------------------------------------------------
N.snowfield(k, 0, -3.6, COLS, ROWS + 0.6)
cliff = [(c, r) for c in range(-1, COLS + 1) for r in range(-4, 7)]
H = I.ridge(k, cliff, top=TOP, slope=1.3, seed=11, rock='#d6dee9', strata=('#6a7284', '#525a6c', '#7c8496'),
            moss=N.ROOF_SNOW, foot=0.55, patchy=False)
upper = [(c, r) for c in range(-1, COLS + 1) for r in range(-5, 2)]        # the higher tier behind: the massif climbing on
H2 = I.ridge(k, upper, top=9.4, slope=2.4, seed=17, rock='#d6dee9', strata=('#5e6678', '#485062', '#727a8c'),
             moss=N.ROOF_SNOW, foot=0.9, patchy=False)

# the village street and the lanes off it (rects only ever touch: overlapping slabs z-fight)
for rect in ((1.5, 15.0, 44.5, 16.4),                  # the street
             (18.8, 13.8, 20.2, 15.0), (29.9, 13.8, 31.1, 15.0),             # lodge, ski hire doors
             (4.4, 12.2, 5.6, 15.0), (7.4, 7.4, 8.6, 15.0),                  # guide hut, up to the Staircase
             (25.8, 8.8, 27.0, 15.0), (21.0, 7.6, 27.0, 8.8),                # round the lodge to the Icefall
             (34.4, 7.6, 35.6, 15.0),                                        # up to the Hoarspire
             (39.8, 13.4, 43.2, 15.0),                                       # the lift station
             (23.0, 16.4, 24.2, 19.6), (18.4, 19.6, 24.2, 20.8),             # the cocoa hut
             (13.0, 16.4, 14.2, 19.6),                                       # down to the pond
             (40.2, 16.4, 41.4, 26.0), (27.0, 23.4, 40.2, 24.6)):            # to the pad, the chalets' lane
    N.trodden(k, *rect)

# ---- the climbing routes -------------------------------------------------------------------------------------
N.route_foot(k, 8.0, 6.9, TOP * 0.95, 1.6, '#e0b030')                           # the Staircase
N.icefall(k, 21.4, 5.3, 6.6, TOP * 0.95)                                        # the Icefall
N.route_foot(k, 22.6, 7.0, TOP * 0.95, 1.6, '#3a8ae0')
N.route_foot(k, 35.0, 6.9, TOP * 1.05, 1.6, N.RED)                              # the Hoarspire
N.summit_flag(k, 35.1, 4.9, H(35.1, 4.9) - 0.05, h=1.5)
for (x, r) in ((14.2, 7.6), (28.6, 7.4), (38.6, 7.5), (3.2, 7.6)):              # hoar crystals at the cliff foot
    W.shore_crystals(k, x, r, col=('#2a4a7a', '#a8dcff'), s=0.7, energy=5)
for (x, r, s) in ((11.0, 7.6, 0.45), (17.2, 7.8, 0.6), (31.0, 7.7, 0.5), (44.0, 7.8, 0.55), (1.2, 8.0, 0.5)):
    k.rock(x, r, 0.1, s, s * 0.8, s * 0.7, ('#5a6272', 0.2), part='boulder', segs=8)
    k.blob(x, r, s * 0.6, s * 0.75, s * 0.6, s * 0.3, (N.SNOW, 0.25), 'boulder_snow', segs=8)
    k.solid(x - s, r - s * 0.8, x + s, r + s * 0.8)

# ---- the chairlift -----------------------------------------------------------------------------------------------
LX, LR = 41.5, 12.5
bull = N.lift_station(k, LX, LR)
p1 = N.pylon(k, LX, 8.6, 3.0)
z2 = H(LX, 3.2)
p2 = N.pylon(k, LX, 3.2, 2.4, z0=z2 - 0.05)
z3 = max(H(LX, -0.6), H2(LX, -0.6))
p3 = N.pylon(k, LX, -0.6, 2.4, z0=z3 - 0.05)
far = [(p3[0][0], -8.0, z3 + 5.4), (p3[1][0], -8.0, z3 + 5.4)]
lines = []
for s in (0, 1):
    pts = [bull[s], p1[s], p2[s], p3[s], far[s]]
    N.cable(k, pts)
    lines.append([screen(*p) for p in pts])
k.solid(LX - 1.6, LR - 1.1, LX + 1.6, LR - 0.6)

# ---- Ysolde's guide hut and the route board ------------------------------------------------------------------------
N.chalet(k, 2.8, 7.2, 9.2, 12.0, wall_h=1.7, rise=1.2, door_x=5.0, windows=[(3.8, 0.8), (6.3, 0.8)], chimney=3.4)
W.bulletin_board(k, 10.6, 10.4)
k.solid(10, 10, 12, 11)
N.woodpile(k, 1.0, 2.4, 11.2)
N.sled(k, 9.6, 13.2)
N.hanging_sign(k, 7.05, 11.98, 0.85, 'axe')                                     # GUIDES: an ice axe and a coil of rope

# ---- the Snowcap Lodge --------------------------------------------------------------------------------------------------
SMOKE = []
rm, zr = N.chalet(k, 14.0, 25.0, 9.4, 13.6, wall_h=2.7, rise=2.0, door_x=19.5, balcony=True,
                  windows=[(15.4, 0.85), (17.4, 0.85), (21.6, 0.85), (23.6, 0.85)],
                  windows_up=[(15.4, 2.0), (17.4, 2.0), (21.6, 2.0), (23.6, 2.0)], chimney=23.4, lanterns=(18.6, 20.4))
SMOKE.append(screen(23.28, rm - 0.15, zr + 0.7))
k.box(17.3, 13.6, 2.17, 21.7, 13.66, 2.55, (N.LOG_D, 0.1), 'sign_board')
G.letters(k, 'Snowcap Lodge', 'Pacifico', 19.5, 13.66, 2.2, size=0.3, col='#ffd890', lit=True, energy=5)
N.hanging_sign(k, 14.25, 13.58, 1.55, 'bed')

# ---- the ski hire, its racks ---------------------------------------------------------------------------------------------
rm2, zr2 = N.chalet(k, 28.0, 33.4, 10.4, 13.6, wall_h=2.1, rise=1.5, door_x=30.5, windows=[(29.0, 0.85), (32.2, 0.85)],
                    windows_up=[(30.5, 1.65)], chimney=32.6)
SMOKE.append(screen(32.48, rm2 - 0.15, zr2 + 0.7))
k.box(28.6, 13.6, 1.98, 32.8, 13.66, 2.08, (N.LOG_D, 0.1), 'sign_board')
G.letters(k, 'SKI HIRE', 'Righteous', 30.7, 13.66, 1.72, size=0.24, col='#ff6a4a', lit=True, energy=4)
N.ski_rack(k, 28.2, 29.8, 14.4)
N.ski_rack(k, 31.3, 32.9, 14.4)
N.hanging_sign(k, 33.2, 13.58, 1.05, 'skis')

# ---- the street: lamps, a signpost, bunting -------------------------------------------------------------------------------
for (x, r) in ((10.2, 14.4), (36.6, 14.4), (15.6, 17.0), (33.0, 17.0), (2.4, 17.0)):
    W.lantern_post(k, x, r, energy=30)
N.signpost(k, 25.3, 14.4)
W.bunting(k, (24.9, 13.75, 2.3), (28.1, 13.75, 2.1), sag=0.35)

# ---- the cocoa hut, the pond, the snowman -------------------------------------------------------------------------------------
N.cocoa_hut(k, 20.0, 22.6, 18.3, 19.4)
N.hanging_sign(k, 22.45, 19.62, 1.3, 'mug')
k.solid(19, 19, 20, 20)                                                         # Tove, beside her hut
N.ice_pond(k, 10.8, 22.6, 4.4, 2.5)
N.fishing_hole(k, 12.5, 22.6)
k.solid(12, 22, 13, 23)
N.snowman(k, 17.2, 22.4)
N.sled(k, 16.6, 25.0, col='#2a6ac0')
W.bench(k, 3.0, 4.6, 19.6)

# ---- chalets, a back lane ---------------------------------------------------------------------------------------------------------
rm3, zr3 = N.chalet(k, 27.8, 33.2, 20.0, 23.2, wall_h=1.9, rise=1.4, door_x=30.5, windows=[(28.8, 0.8), (32.2, 0.8)], chimney=28.6)
SMOKE.append(screen(28.48, rm3 - 0.15, zr3 + 0.7))
rm4, zr4 = N.chalet(k, 34.4, 39.6, 19.6, 22.8, wall_h=2.0, rise=1.4, door_x=37.0, windows=[(35.4, 0.8), (38.6, 0.8)],
                    windows_up=[(37.0, 1.6)], chimney=39.0)
SMOKE.append(screen(38.88, rm4 - 0.15, zr4 + 0.7))
N.woodpile(k, 25.6, 27.2, 21.6)

# ---- the landing pad --------------------------------------------------------------------------------------------------------------
PX, PR = 38.6, 28.6
k.cyl(PX, PR, -0.01, 0.014, 2.95, ('#8a90a0', 0.25), 'pad', verts=48)
k.cyl(PX, PR, 0.0, 0.02, 2.55, ('#e8c040', 0.2), 'pad_ring', verts=48)
k.cyl(PX, PR, 0.0, 0.026, 2.38, ('#7e8494', 0.25), 'pad', verts=48)
for i in range(16):
    a = i * math.tau / 16
    k.blob(PX + math.cos(a) * 3.15, PR + math.sin(a) * 3.15, 0.0, 0.35, 0.25, 0.12, (N.SNOW, 0.3), 'plough_bank', segs=8)
for i in range(8):
    a = i * math.tau / 8 + 0.2
    W.lantern(k, PX + math.cos(a) * 2.85, PR + math.sin(a) * 2.85, 0.0, 0.18, s=0.06, energy=3)
with k.variant('shuttle', 'parked'):
    P.shuttle(k, PX - 1.7, PR - 0.1)
k.solid(PX - 1.8, PR - 1.1, PX + 2.0, PR + 0.9)

# ---- firs all round -------------------------------------------------------------------------------------------------------------
for r in [8.6 + i * 2.1 for i in range(12)]:
    N.snow_pine(k, 0.6, r, h=k.rng.uniform(2.4, 3.2))
    if r < 10 or r > 16.5:
        N.snow_pine(k, 45.4, r, h=k.rng.uniform(2.4, 3.2))
for x in [1.5 + i * 2.2 for i in range(20)]:
    if 34.5 < x < 43.5:
        continue
    N.snow_pine(k, x, 32.6, h=k.rng.uniform(2.4, 3.2))
for (x, r) in ((3.0, 25.5), (5.2, 28.0), (2.2, 29.6), (21.0, 27.2), (23.6, 28.6), (19.2, 29.8), (26.4, 30.4),
               (44.0, 22.0), (43.2, 25.4), (44.4, 28.8), (12.0, 18.6), (30.6, 28.8), (8.6, 27.6)):
    N.snow_pine(k, x, r, h=k.rng.uniform(2.2, 3.0))
k.solid(0, 0, COLS, 7)
k.solid(0, 0, 1, ROWS)
k.solid(COLS - 1, 0, COLS, ROWS)
k.solid(0, ROWS - 2, 34, ROWS)
k.solid(44, ROWS - 2, COLS, ROWS)

# ---- the light: alpenglow — a low pink sun from the west, the sky's violet-blue in the shadows -------------------------------------
k.sun((0.8, 0.25, -0.38), '#ffc4a4', 3.2, angle=3.0)
k.render(OUT, light_states={'full': {}}, light_samples=96, world_light=('#8a96cc', 0.95))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Fellhaven', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [39, 25]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -2.5, COLS, ROWS], 'cold': True, 'shuttle': {'spawn': [39, 25]}})
w['interactions'] = [
    {'x': 39, 'y': 28, 'type': 'shuttle', 'label': 'SHUTTLE', 'prompt': 'PRESS E TO BOARD'},
    {'x': 19, 'y': 13, 'type': 'enter_world', 'label': 'SNOWCAP LODGE', 'prompt': 'PRESS E TO GO IN', 'target': 'hoarfell-lodge', 'spawn': [8, 9]},
    {'x': 30, 'y': 13, 'type': 'enter_world', 'label': 'SKI HIRE', 'prompt': 'PRESS E TO GO IN', 'target': 'hoarfell-skihire', 'spawn': [7, 8]},
    {'x': 5, 'y': 11, 'type': 'vendor', 'label': "GUIDE'S HUT", 'prompt': 'PRESS E TO SHOP',
     'items': [{'id': 'chalk', 'price': 6}, {'id': 'climbing_rope', 'price': 60}, {'id': 'ice_axe', 'price': 180}]},
    {'x': 9, 'y': 13, 'type': 'dialog', 'label': 'YSOLDE', 'prompt': 'PRESS E TO TALK', 'dialog': 'YSOLDE LOOKS YOU UP AND DOWN.'},
    {'x': 10, 'y': 10, 'type': 'climb_board', 'label': 'ROUTE BOARD', 'prompt': 'PRESS E TO READ'},
    {'x': 8, 'y': 6, 'type': 'climb', 'route': 'staircase', 'label': 'THE STAIRCASE', 'prompt': 'PRESS E TO CLIMB'},
    {'x': 22, 'y': 6, 'type': 'climb', 'route': 'icefall', 'label': 'THE ICEFALL', 'prompt': 'PRESS E TO CLIMB'},
    {'x': 35, 'y': 6, 'type': 'climb', 'route': 'hoarspire', 'label': 'THE HOARSPIRE', 'prompt': 'PRESS E TO CLIMB'},
    {'x': 41, 'y': 13, 'type': 'lift', 'label': 'CHAIRLIFT', 'prompt': 'PRESS E TO RIDE'},
    {'x': 43, 'y': 13, 'type': 'dialog', 'label': 'ANSGAR', 'prompt': 'PRESS E TO TALK', 'dialog': 'ANSGAR NODS FROM INSIDE HIS HOOD.'},
    {'x': 21, 'y': 19, 'type': 'vendor', 'label': 'COCOA HUT', 'prompt': 'PRESS E TO BUY',
     'items': [{'id': 'hot_cocoa', 'price': 6}, {'id': 'roast_chestnuts', 'price': 4}, {'id': 'sweet_roll', 'price': 5}]},
    {'x': 19, 'y': 19, 'type': 'dialog', 'label': 'TOVE', 'prompt': 'PRESS E TO TALK', 'dialog': 'TOVE POURS YOU A CUP BEFORE YOU ASK.'},
    {'x': 17, 'y': 22, 'type': 'dialog', 'label': 'SNOWMAN', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A SNOWMAN IN A TOP HAT AND A RED SCARF. SOMEBODY HAS GIVEN IT A VERY STERN EXPRESSION.'},
    {'x': 25, 'y': 14, 'type': 'dialog', 'label': 'SIGNPOST', 'prompt': 'PRESS E TO READ',
     'dialog': 'RED: THE HOARSPIRE.  BLUE: THE ICEFALL.  YELLOW: THE STAIRCASE.\n\nUNDER THEM, CARVED SMALL: "THE MOUNTAIN DOESN\'T KNOW YOU\'RE COMING."'},
    {'x': 30, 'y': 23, 'type': 'dialog', 'label': 'CHALET', 'prompt': 'PRESS E TO KNOCK',
     'dialog': 'NOBODY ANSWERS. THROUGH THE WINDOW: SKIS DRYING BY A STOVE, A CAT ASLEEP ON A RADIATOR.'},
    {'x': 37, 'y': 22, 'type': 'dialog', 'label': 'CHALET', 'prompt': 'PRESS E TO KNOCK',
     'dialog': 'A VOICE INSIDE CALLS "WE\'RE NOT BUYING ANY!" BEFORE YOU\'VE SAID A WORD.'},
]
w['lift'] = {'lines': lines}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(9, 13, 10, 14)                                                          # Ysolde and Ansgar stand where they stand
k.solid(43, 13, 44, 14)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID,
            actors=[{'sheet': 'npc-ysolde', 'x': 9, 'y': 13, 'facing': 'down'}, {'sheet': 'npc-ansgar', 'x': 43, 'y': 13, 'facing': 'left'},
                    {'sheet': 'npc-tove', 'x': 19, 'y': 19, 'facing': 'down'}],
            scene_extra={'layers': {'shuttle': 'parked'}, 'smoke': SMOKE, 'lift': {'lines': lines}})
print('hoarfell done')
