"""The Stilts — the slums under Crownhaven's quays (world id "lumar-crown-stilts").

  BVENV/bin/python tools/bridge-art/scenes/lumar_crown_stilts.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-crown-stilts

Down the quay stairs from the grand harbour, under the city everybody sees: the great quay wall towering at the back,
its old vaults turned into homes with curtains for doors and lamps inside; in front of it, out over the water on
stilts, a town of shacks built of whatever the sea brought — odd planks, tarred boards, sheets of tin — joined by
boardwalks and a rope bridge, lanterns strung between, washing, nets, crab pots, a mudlark's heap of finds, boats tied up
everywhere, and the Undertow, a tavern on an old barge. Poor and cozy and loud.

Ways out: the QUAY STAIRS up to Crownhaven's quay. Kit: assets_capital.py (boardwalk, shack).
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_capital as CAP           # noqa: E402
import assets_coast as C               # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_village as V             # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-crown-stilts.json')
WID = 'lumar-crown-stilts'
COLS, ROWS = 48, 30
k = Kit(COLS, ROWS, margin_top=4.0, margin_bottom=1.0, margin_x=0.5, seed=5505)
rng = k.rng
C45 = math.cos(math.radians(45))
WZ = C.WZ
k.water_z = WZ

WALL_R = 5.0               # the quay wall's face
WALL_TOP = 3.4

# ---- the walkable town: the walk along the wall, the boardwalks, the platforms -----------------------------------------
WALK = set()


def rect(c0, r0, c1, r1):
    for c in range(c0, c1 + 1):
        for r in range(r0, r1 + 1):
            WALK.add((c, r))


rect(0, 5, COLS - 1, 6)            # the walk along the foot of the wall
rect(6, 7, 7, 12)                  # boardwalks out from it
rect(19, 7, 20, 10)
rect(33, 7, 34, 13)
rect(43, 7, 44, 11)
rect(2, 13, 13, 14)                # the first ring of platforms
rect(15, 11, 25, 12)
rect(27, 14, 40, 15)
rect(42, 12, 46, 13)
rect(10, 15, 11, 20)
rect(22, 13, 23, 19)
rect(38, 16, 39, 21)
rect(4, 21, 18, 22)                # the outer walk
rect(20, 20, 30, 21)
rect(32, 22, 45, 23)
rect(16, 23, 17, 25)
rect(30, 24, 31, 26)
PLATS = [(2, 15, 8, 19), (13, 15, 20, 19), (25, 16, 36, 19), (40, 15, 46, 20), (6, 23, 14, 26), (19, 22, 28, 26), (33, 24, 44, 27)]
for (c0, r0, c1, r1) in PLATS:
    rect(c0, r0, c1, r1)
BRIDGE = [(9, 17)]                 # a rope bridge from the west platform across to the walk past it

# ---- the quay wall: towering at the back, its vaults lived in --------------------------------------------------------------
k.box(-0.6, WALL_R - 3.0, WZ - 1.0, COLS + 0.6, WALL_R, WALL_TOP, (shade('#6a645a', 0.85), 0.12), 'quay_core')
VAULTS = [(2.0, 5.0), (9.0, 12.0), (15.5, 18.5), (25.0, 28.0), (36.0, 39.0), (41.5, 44.5)]
CAP.coursed(k, -0.6, COLS + 0.6, 0.0, WALL_TOP, WALL_R, '#7a746a', part='wall_block', **CAP.BIG,
            skip=[(a, b, 0.0, 2.0) for (a, b) in VAULTS])
for (a, b) in VAULTS:                                       # arched vaults: a curtain or planks across, a lamp inside
    cx_ = (a + b) / 2
    hw = (b - a) / 2
    k.box(a, WALL_R - 0.5, 0.0, b, WALL_R - 0.45, 1.3, '#1a1612', 'vault_dark')
    for i in range(9):
        a0, a1 = math.pi * i / 9, math.pi * (i + 1) / 9
        pts = [(cx_ - math.cos(t) * rr_, WALL_R + 0.02, 1.3 + math.sin(t) * rr_ * 0.5) for (t, rr_) in ((a0, hw), (a1, hw), (a1, hw + 0.25), (a0, hw + 0.25))]
        k.quads([tuple(pts)], (shade('#9a9284', rng.uniform(0.9, 1.05)), 0.1), 'voussoir')
    k.box(a + 0.05, WALL_R - 0.44, 1.3, b - 0.05, WALL_R - 0.4, 1.3 + hw * 0.5, '#1a1612', 'vault_dark')
    kind = rng.random()
    if kind < 0.5:                                          # a curtain across, glowing behind
        k.box(a + 0.2, WALL_R - 0.4, 0.0, b - 0.2, WALL_R - 0.36, 1.55, (rng.choice(('#8a2a2a', '#2a5a6a', '#7a6a2a', '#5a2a5a')), 0.12), 'curtain')
        k.box(cx_ - 0.05, WALL_R - 0.36, 0.0, cx_ + 0.05, WALL_R - 0.34, 1.55, '#1a1612', 'curtain_gap')
        k.point_light(cx_, WALL_R - 0.1, 0.9, '#ffb060', 10, radius=0.3, group='flicker')
    else:                                                   # boarded up with a door and a window
        x = a + 0.15
        while x < b - 0.15:
            k.box(x, WALL_R - 0.4, 0.0, x + 0.2, WALL_R - 0.36, 1.6, (rng.choice(CAP.PLANKS), 0.2), 'shack_board')
            x += 0.22
        k.box(cx_ - 0.25, WALL_R - 0.36, 0.0, cx_ + 0.25, WALL_R - 0.33, 1.05, ('#3a2a1c', 0.14), 'door')
        k.box(b - 0.7, WALL_R - 0.36, 0.6, b - 0.35, WALL_R - 0.33, 0.95, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.8))
    W.wall_lantern(k, b + 0.2, WALL_R + 0.02, z=1.4, energy=10)
# the weed and wet at the foot of the wall, drainpipes, mooring rings
for i in range(90):
    x = rng.uniform(-0.5, COLS + 0.5)
    k.blob(x, WALL_R + 0.05, WZ + rng.uniform(0.02, 0.2), rng.uniform(0.06, 0.16), 0.03, rng.uniform(0.03, 0.06),
           (rng.choice(('#2a3a26', '#334428', '#3e4a2c', '#5a5a48')), 0.2), 'weed', segs=6)
for x in (7.6, 22.0, 31.5, 46.0):
    k.cyl(x, WALL_R + 0.08, 0.2, WALL_TOP - 0.1, 0.06, ('#3a3a40', 0.1), 'drainpipe', verts=8)
# the quay up top: its coping, bollards, a lamp, the backs of the warehouses (the city everybody else sees)
k.box(-0.6, WALL_R - 0.35, WALL_TOP - 0.05, COLS + 0.6, WALL_R + 0.05, WALL_TOP + 0.1, ('#a49c8c', 0.12), 'quay_coping', bevel=0.02)
for x in (5.0, 14.0, 23.0, 33.0, 42.0):
    k.cyl(x, WALL_R - 0.6, WALL_TOP, WALL_TOP + 0.4, 0.13, ('#2a2a30', 0.1), 'bollard', verts=10)
for x in (9.5, 28.0, 40.0):
    k.cyl(x, WALL_R - 0.7, WALL_TOP, WALL_TOP + 2.1, 0.035, A.IRON, 'lamp_post', verts=6)
    W.lantern(k, x, WALL_R - 0.7, WALL_TOP + 2.1, WALL_TOP + 2.4, s=0.1, energy=18)
for (x0, x1, roof) in ((-0.6, 8.0, W.ROOF_SLATE), (8.4, 15.0, '#6a3a2a'), (15.4, 24.0, W.ROOF_GREEN), (24.4, 33.0, W.ROOF_SLATE),
                       (33.4, 40.6, W.ROOF_RED), (41.0, COLS + 0.6, '#3a4256')):
    k.box(x0, WALL_R - 3.4, WALL_TOP, x1, WALL_R - 1.6, WALL_TOP + 2.0, (rng.choice(('#7a7064', '#8a7a68', '#d8c8a8')), 0.1), 'house_wall')
    W._gable_roof(k, x0, x1, WALL_R - 3.4, WALL_R - 1.6, WALL_TOP + 2.0, 1.0, roof)
# the quay stairs: a flight cut along the wall's face, climbing east to the quay
SX0 = 20.5
for i in range(10):
    x0 = SX0 + i * 0.42
    z = 0.0 + (i + 1) * (WALL_TOP / 10)
    k.box(x0, WALL_R - 0.05, z - 0.3, x0 + 0.42, WALL_R + 0.75, z, (shade('#9a9284', rng.uniform(0.85, 1.0)), 0.12), 'steps', bevel=0.015)
    k.box(x0, WALL_R + 0.7, z - 0.03, x0 + 0.42, WALL_R + 0.75, z, shade('#9a9284', 1.15), 'step_nose')
k.box(SX0, WALL_R + 0.75, 0.0, SX0 + 4.2, WALL_R + 0.85, WALL_TOP, ('#6a645a', 0.12), 'steps_side')
for i in range(6):
    k.cyl(SX0 + 0.2 + i * 0.8, WALL_R + 0.82, 0.25 + i * 0.68 * 0.8 * WALL_TOP / 4.2, 0.95 + i * 0.68 * 0.8 * WALL_TOP / 4.2, 0.022, A.IRON, 'rail', verts=6)
k.tube((SX0 + 0.2, WALL_R + 0.82, 0.95), (SX0 + 4.2, WALL_R + 0.82, WALL_TOP + 0.75), 0.025, A.IRON, 'rail', verts=6)
V.board_sign(k, 'QUAY STAIRS', 'IMFellEnglishSC-Regular', SX0 - 0.6, WALL_R + 0.03, 1.9, size=0.18, board='#2a2a30')
k.solid(-0.6, WALL_R - 3.0, COLS + 0.6, WALL_R)

# ---- the boardwalks and the shacks ----------------------------------------------------------------------------------------------
CAP.boardwalk(k, WALK, rng=random.Random(51))
WALK |= set(BRIDGE)
SMOKE = []
SHACKS = []
srng = random.Random(52)
for (c0, r0, c1, r1) in PLATS:                              # each platform: a shack or two at its back, life at its front
    x = c0 + 0.2
    while x < c1 + 1 - 1.4:
        w = srng.uniform(1.6, 2.6)
        if x + w > c1 + 0.9:
            w = c1 + 0.9 - x
        if w >= 1.3:
            top = CAP.shack(k, x, x + w, r0 + 0.1, r0 + srng.uniform(1.4, 1.9), rng=srng)
            SHACKS.append((x, x + w, r0))
            if top:
                SMOKE.append([round(top[0] - 0.12, 3), round(top[1] - 0.15 - (top[2] + 0.2) * C45, 3)])
        x += w + srng.uniform(0.3, 1.0)
# the Undertow: a tavern on an old barge moored at the east end, a ramp up to it
UB = (36.5, 46.5, 9.4)
since, ls = len(k.parts), len(k.lights)
CAP.barge(k, UB[0], UB[1], UB[2], wz=WZ, beam=2.6, hull='#2a2420', cargo=False)
k.box(UB[0] + 1.5, UB[2] - 0.9, 0.0, UB[1] - 1.2, UB[2] + 0.7, 1.5, ('#5a3a2a', 0.14), 'house_wall')
for wx in (UB[0] + 2.4, UB[0] + 4.0, UB[0] + 5.6, UB[0] + 7.4):
    k.box(wx - 0.25, UB[2] + 0.7, 0.55, wx + 0.25, UB[2] + 0.74, 1.05, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.9))
k.quads([((UB[0] + 1.3, UB[2] - 1.0, 2.0), (UB[1] - 1.0, UB[2] - 1.0, 2.0), (UB[1] - 1.0, UB[2] + 0.9, 1.5), (UB[0] + 1.3, UB[2] + 0.9, 1.5))], ('#3a3430', 0.14), 'roof_tar')
V.board_sign(k, 'THE UNDERTOW', 'Rye-Regular', (UB[0] + UB[1]) / 2, UB[2] + 0.74, 1.12, size=0.18)
for i in range(7):                                          # lamps strung along the barge's rail
    lx = UB[0] + 0.8 + i * (UB[1] - UB[0] - 1.6) / 6
    W.lantern(k, lx, UB[2] + 1.2, 0.6, 0.8, s=0.06, energy=6)
k.solid(UB[0], UB[2] - 1.3, UB[1], UB[2] + 1.3)
# a rope bridge between two platforms
import assets_isle as I                                  # noqa: E402
I.rope_bridge(k, (8.9, 17.5), (10.1, 17.5), z=0.0)
# strings of lanterns between the shacks, washing, nets drying, crab pots, the mudlark's heap
for (a, b, z) in (((3.0, 15.0), (8.0, 15.2), 1.9), ((13.5, 15.1), (20.0, 15.4), 2.0), ((26.0, 16.1), (35.0, 16.3), 2.0), ((6.5, 23.0), (14.0, 23.3), 1.9)):
    pts = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z - 0.25 * math.sin(math.pi * t)) for t in [i / 8 for i in range(9)]]
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.008, '#3a3a30', 'lantern_string', verts=4)
    for p in pts[1:-1:2]:
        k.sphere(p[0], p[1], p[2] - 0.08, 0.06, 0.06, '#8a3a18', 'paper_lantern', segs=8, emit=('#ffb060', 0.9))
for (xa, xb, r) in ((13.6, 16.0, 17.6), (34.0, 36.2, 18.0), (20.0, 22.6, 25.0)):
    CAP.washing(k, xa, xb, r, z=1.3, rng=srng)
for (px, pr) in ((4.5, 18.6), (5.1, 18.4), (27.6, 18.6), (41.3, 19.3)):
    k.box(px - 0.26, pr - 0.17, 0.0, px + 0.26, pr + 0.17, 0.05, (A.WOOD, 0.14), 'pot_base')
    k.cyl_x(px - 0.26, px + 0.26, pr, 0.08, 0.17, 0.2, ('#7a6a48', 0.3), 'lobster_pot', verts=10)
    k.solid(px - 0.2, pr - 0.2, px + 0.2, pr + 0.2)
MUD = (30.5, 18.4)                                          # the mudlark's heap of finds
for i in range(14):
    k.blob(MUD[0] + srng.uniform(-0.45, 0.45), MUD[1] + srng.uniform(-0.25, 0.25), 0.06 + srng.uniform(0, 0.15), srng.uniform(0.06, 0.14),
           srng.uniform(0.05, 0.1), 0.05, srng.choice(('#6a5a4a', '#3a3a3e', '#8a7a5a', '#5a6a6a', '#9a6a4a', '#70a090')), 'junk', segs=7)
k.cyl(MUD[0] + 0.5, MUD[1] - 0.2, 0.0, 0.4, 0.2, ('#5a4024', 0.14), 'bucket', verts=10)
k.solid(MUD[0] - 0.55, MUD[1] - 0.35, MUD[0] + 0.7, MUD[1] + 0.3)
for (x, r) in ((8.0, 26.0), (36.0, 26.6), (17.0, 18.6)):
    A.barrel(k, x, r, h=0.6, radius=0.22)
for (x, r) in ((12.4, 25.6), (44.0, 26.8)):
    A.crate(k, x, r, s=0.44)
for (gx, gr_) in ((10.4, 5.6), (35.0, 5.5), (25.2, 19.4)):
    k.blob(gx, gr_, 0.1, 0.1, 0.06, 0.07, '#f0f0ec', 'gull', segs=10)
    k.blob(gx + 0.08, gr_, 0.18, 0.05, 0.045, 0.05, '#f4f4f0', 'gull', segs=8)
k.blob(16.6, 16.3, 0.06, 0.12, 0.08, 0.07, '#8a8a90', 'cat', segs=10)      # a grey cat asleep on a step
k.sphere(16.72, 16.36, 0.1, 0.06, 0.05, '#8a8a90', 'cat', segs=8)
# boats tied up among the stilts
brng = random.Random(53)
for (bx, br, hull) in ((1.5, 9.0, '#2a4a6a'), (12.0, 9.4, '#6a3a2a'), (28.0, 10.0, '#3a5a3a'), (2.5, 27.5, '#5a4a6a'),
                       (24.0, 28.0, '#6a5a2a'), (46.0, 22.0, '#2a3a5a'), (29.0, 23.0, '#4a2a2a')):
    since, ls = len(k.parts), len(k.lights)
    W.rowboat(k, bx - 0.9, bx + 0.9, br, beam=0.75, hull=hull, oars=brng.random() < 0.5)
    C.sink(k, since, WZ + 0.12, ls)

# ---- light -----------------------------------------------------------------------------------------------------------------------
k.area_light(24.0, 14.0, 16.0, '#90a8c8', 2000, 36.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}},
         light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#26384a', 0.8))

# ---- the world ---------------------------------------------------------------------------------------------------------------------


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


inters = [
    {'x': 20, 'y': 6, 'type': 'enter_world', 'target': 'lumar-crown', 'spawn': [45, 32], 'label': 'QUAY STAIRS', 'prompt': 'PRESS E TO CLIMB UP'},
    {'x': 41, 'y': 11, 'type': 'dialog', 'label': 'THE UNDERTOW', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE UNDERTOW. A BARGE THAT STOPPED GOING ANYWHERE FORTY YEARS AGO. FIDDLE MUSIC, A SMELL OF FRIED FISH AND TAR, AND SOMEBODY SINGING THE SAME VERSE OVER AND OVER BECAUSE NOBODY CAN REMEMBER THE NEXT ONE.'},
    {'x': 31, 'y': 19, 'type': 'dialog', 'label': 'MUDLARK', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE MUDLARK SORTS HER FINDS.'},
    look('THE VAULTS', 10, 6, 'THE OLD VAULTS UNDER THE QUAY, BUILT FOR CARGO WHEN THE HARBOUR WAS NEW. NOW A FAMILY IN EVERY ONE, A CURTAIN FOR A DOOR, AND A CAT THAT BELONGS TO ALL OF THEM.'),
    look('PAPER LANTERNS', 5, 16, 'PAPER LANTERNS STRUNG FROM SHACK TO SHACK. THE STILTS LIGHT THEM EVERY NIGHT FOR THE BOATS COMING HOME, BECAUSE THE QUAY\'S LAMPS ARE FOR THE QUAY.'),
    look('ROPE BRIDGE', 9, 17, 'A ROPE BRIDGE STRUNG BETWEEN TWO PLATFORMS. IT SWAYS. EVERYBODY HERE CROSSES IT WITHOUT LOOKING. YOU LOOK.'),
]
w = {'name': 'The Stilts', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [19, 6]}, 'moonColor': '#d8f0e0', 'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': inters}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(30, 18, 31, 19)                                    # the mudlark sits by her heap
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID,
            actors=[{'sheet': 'npc-mudlark', 'x': 30, 'y': 18, 'facing': 'down', 'pose': 'sit'}],
            scene_extra={'backdrop': True, 'smoke': SMOKE})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in WALK:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -1.5, COLS + 0.5, ROWS + 0.5]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('stilts done')
