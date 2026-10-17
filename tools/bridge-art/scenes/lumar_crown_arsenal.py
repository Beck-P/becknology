"""The Arsenal — Crownhaven's naval dockyard, the Royal Yard grown (world id "lumar-crown-arsenal").

  BVENV/bin/python tools/bridge-art/scenes/lumar_crown_arsenal.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-crown-arsenal

East of the harbour, behind the Royal Yard's gate, where the Crown builds and fits out its fleet: the ropewalk the whole
width of the yard along the north (strands stretched on their hooks, coils of rope at its door), the sail loft, the gun
foundry with its furnace glowing through the great door and its stack smoking, the mast house, the Arsenal office with
its clock; the yard itself stacked with oak seasoning, guns on their carriages, shot in pyramids, great anchors; the dry
dock with a man-of-war in frame on her blocks; a ship of the line on the stocks under sheer-legs; along the harbour the
fitting-out quay, a warship alongside and a treadwheel crane swinging stores aboard.

Ways out (west edge): the YARD GATE back to Crownhaven by the Royal Yard, and the BRIDGE ROAD onto the Old Bridge.
Kit: assets_capital.py (ropewalk, treadwheel_crane, hull_in_frame, cannon, shot_pyramid, anchor, timber_stack).
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
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_village as V             # noqa: E402
import assets_house as HK              # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-crown-arsenal.json')
WID = 'lumar-crown-arsenal'
COLS, ROWS = 60, 40
k = Kit(COLS, ROWS, margin_top=3.0, margin_bottom=1.0, margin_x=0.5, seed=5404)
rng = k.rng
C45 = math.cos(math.radians(45))

RW = (3.4, 5.0)            # the ropewalk (back, front)
ROAD = (5.0, 8.6)          # the yard road in front of it
MID = (10.4, 13.2)         # the middle row: sail loft, foundry, mast house, office
DOCK = (16.0, 36.0, 20.6, 28.4)      # the dry dock (x0, x1, r0, r1), its floor far below
CHAN = (23.0, 29.0)        # the channel from the dock's caisson down to the harbour
STOCKS_R = 24.0            # the ship of the line on the stocks
QUAY = 32.2                # the harbour quay's face
YARD_GATE_R = 16           # the ways out on the west edge
BRIDGE_R = 30

LAND = {(c, r) for c in range(0, COLS) for r in range(0, 33)}
LAND -= {(c, r) for c in range(int(CHAN[0]), int(CHAN[1])) for r in range(int(DOCK[3]), 33)}

# ---- ground ---------------------------------------------------------------------------------------------------------
k.box(-0.6, -3.5, -0.3, COLS + 0.6, QUAY, -0.06, ('#3a3632', 0.12), 'ground')
I.ground(k, {(c, r) for c in range(0, COLS) for r in range(-3, 3)}, lambda x, r: 'grass', {'grass': ('#3a5a3a', 0.3)})
# the yard: packed earth and grit, flagged where it's worked hardest, setts along the road and the quay
k.box(-0.6, ROAD[0], -0.05, COLS + 0.6, QUAY, -0.01, ('#7a6e5c', 0.32), 'path_yard')
for (x0, r0, x1, r1) in ((-0.6, ROAD[0], COLS + 0.6, ROAD[1]), (-0.6, 28.6, CHAN[0], QUAY - 0.3), (CHAN[1], 28.6, COLS + 0.6, QUAY - 0.3)):
    W.cobbles(k, x0, r0, x1, r1, tone='#8e8676', size=0.3)
CAP.flagged(k, -0.6, 13.6, DOCK[0] - 0.4, 20.0, tone='#8a8274')
CAP.flagged(k, DOCK[1] + 0.4, 13.6, COLS + 0.6, 19.6, tone='#8a8274')

# ---- the ropewalk and the hill behind ------------------------------------------------------------------------------
with k.foliage('leaf'):
    for (tx, tr) in ((5.0, 1.2), (14.0, 0.8), (27.0, 1.4), (38.0, 0.6), (49.0, 1.2), (57.0, 0.6)):
        W.tree(k, tx, tr, h=2.6, tone=rng.choice(('#2e5a3a', '#3a6234', '#2a5434')))
CAP.ropewalk(k, 2.0, 58.0, RW[0], RW[1])
V.board_sign(k, 'THE ROPEWALK', 'IMFellEnglishSC-Regular', 30.0, RW[1] + 0.02, 2.35, size=0.24, board='#2a3a30')

# ---- the middle row ------------------------------------------------------------------------------------------------
SMOKE = []
gr = random.Random(611)
# the sail loft: three floors of weatherboard, long loft windows lit, a sail being sewn hung out of the top floor
CAP.town_house(k, 1.0, 11.0, MID[0], MID[1], storeys=3, roof='#44567a', wall='#7a5e44', boards=True, door_x=6.0, door_w=1.4,
               wins=[2.4, 3.8, 5.2, 6.8, 8.2, 9.6], hoist=True, rng=gr)
k.box(4.8, MID[1] + 0.4, 2.0, 7.2, MID[1] + 0.44, 3.4, ('#ece4d0', 0.08), 'sail_canvas')
V.board_sign(k, 'SAIL LOFT', 'IMFellEnglishSC-Regular', 6.0, MID[1] - 0.36, 1.72, size=0.2, board='#2a3a30')
# the gun foundry: stone, a great arched door with the furnace glowing in it, a tall stack
FX0, FX1 = 12.6, 22.6
k.box(FX0, MID[0], -0.02, FX1, MID[1], 3.0, (shade('#8a8274', 0.85), 0.12), 'foundry_wall')
CAP.coursed(k, FX0, FX1, 0.0, 3.0, MID[1], '#8a8274', part='wall_block', **CAP.BIG, skip=[(15.8, 19.4, 0.0, 2.2)])
k.box(15.8, MID[1] - 0.2, 0.0, 19.4, MID[1] - 0.15, 2.0, '#3a1408', 'window_glass', emit=('#ff7020', 1.0))      # the furnace's glow
k.box(16.2, MID[1] - 0.12, 0.0, 19.0, MID[1] - 0.08, 0.9, '#5a2010', 'window_glass', emit=('#ffb040', 0.9))
for i in range(11):
    a0, a1 = math.pi * i / 11, math.pi * (i + 1) / 11
    pts = [(17.6 - math.cos(a) * rr_, MID[1] + 0.02, 2.0 + math.sin(a) * rr_ * 0.5) for (a, rr_) in ((a0, 1.8), (a1, 1.8), (a1, 2.1), (a0, 2.1))]
    k.quads([tuple(pts)], (shade(CAP.STONE_L, gr.uniform(0.9, 1.05)), 0.1), 'voussoir')
k.point_light(17.6, MID[1] + 0.6, 0.8, '#ff8030', 90, radius=0.8, group='flicker')
rm, zr = W._gable_roof(k, FX0, FX1, MID[0], MID[1], 3.0, 1.3, '#4a3a3a')
SX_, SR_ = 21.4, MID[0] + 0.6                                     # the stack: brick courses, a cap, smoke
W.chimney_stack(k, SX_, SR_ - 0.45, SR_ + 0.45, 3.0, 7.2, brick='#7a4a3a', roof_z=3.4, pots=1)
SMOKE.append([round(SX_ - 0.12, 3), round(SR_ - (7.4 + 1.05) * C45, 3)])
SMOKE.append([round(SX_ + 0.1, 3), round(SR_ - (7.4 + 1.2) * C45, 3)])
V.board_sign(k, 'GUN FOUNDRY', 'IMFellEnglishSC-Regular', 17.6, MID[1] + 0.02, 2.75, size=0.2, board='#3a2414')
k.solid(FX0, MID[0], FX1, MID[1])
# the mast house: a tall timber shed, its great doors open on a mast being shaped; a finished mast lies outside
MX0, MX1 = 37.0, 45.0
CAP.town_house(k, MX0, MX1, MID[0] - 0.6, MID[1], storeys=2, roof='#5a4a42', wall='#8a6a48', boards=True, ground='plaster', wins=[38.4, 43.6], rng=gr)
k.box(39.6, MID[1] - 0.2, 0.0, 42.4, MID[1] - 0.16, 1.55, '#2a1a10', 'door_open')
k.tube((38.0, MID[1] + 1.2, 0.22), (45.6, MID[1] + 1.2, 0.18), 0.2, ('#c8a070', 0.1), 'mast', verts=12)
for x in (39.0, 42.0, 44.6):
    k.box(x - 0.12, MID[1] + 0.95, 0.0, x + 0.12, MID[1] + 1.45, 0.08, (A.WOOD_D, 0.14), 'trestle')
k.solid(37.8, MID[1] + 0.8, 45.8, MID[1] + 1.6)
V.board_sign(k, 'MAST HOUSE', 'IMFellEnglishSC-Regular', 41.0, MID[1] - 0.18, 1.82, size=0.2, board='#2a3a30')
# the Arsenal office: stone, three floors, a clock in a pediment, the Crown's flag
OX0, OX1 = 46.6, 58.4
CAP.town_house(k, OX0, OX1, MID[0] - 0.8, MID[1], storeys=3, roof=W.ROOF_SLATE, wall='#c8bca8', ground='stone', door_x=52.5, door_w=1.1,
               wins=[47.8, 49.6, 51.4, 53.6, 55.4, 57.2], wins_down=[48.4, 50.2, 54.8, 56.6], chimney=48.0, rng=gr)
CX_, CR_ = 52.5, MID[1] + 0.4
k.cyl_y(CX_, CR_ - 0.05, CR_ + 0.05, 3.55, 0.34, 0.34, ('#e8e0d0', 0.06), 'clock_face', verts=20, emit=('#fff0c0', 0.2))
k.cyl_y(CX_, CR_ - 0.06, CR_ + 0.04, 3.55, 0.4, 0.4, W.BRASS, 'clock_rim', verts=20)
k.box(CX_ - 0.015, CR_ + 0.05, 3.55, CX_ + 0.015, CR_ + 0.07, 3.82, '#1a1a1e', 'clock_hand')
k.box(CX_, CR_ + 0.05, 3.54, CX_ + 0.2, CR_ + 0.07, 3.57, '#1a1a1e', 'clock_hand')
I.flagpole(k, 57.6, MID[1] + 0.3, h=3.4, col='#2e8a5a')
V.board_sign(k, 'THE ARSENAL', 'CinzelDecorative-Bold', 52.5, MID[1] - 0.36, 1.86, size=0.2, board='#2a3a2e')
k.box(-0.6, ROAD[1], -0.05, COLS + 0.6, MID[0], 0.02, ('#4a4a3e', 0.3), 'yard_back')
k.solid(-0.6, ROAD[1] + 0.4, 23.0, MID[0])
k.solid(36.4, ROAD[1] + 0.4, COLS + 0.6, MID[0])

# ---- the main yard ---------------------------------------------------------------------------------------------------------
for (x, r, a) in ((3.0, 15.0, 0.0), (3.0, 16.6, 0.0), (6.0, 15.0, 0.0), (6.0, 16.6, 0.0)):        # guns on their carriages
    CAP.cannon(k, x, r, angle=a)
for (x, r) in ((10.0, 14.8), (10.0, 16.0), (10.0, 17.2)):                                         # long guns on blocks
    CAP.cannon(k, x, r, length=1.8, carriage=False)
for (x, r) in ((13.4, 15.2), (14.4, 17.0), (12.6, 18.8)):
    CAP.shot_pyramid(k, x, r)
CAP.anchor(k, 4.0, 19.4, s=1.3)
CAP.anchor(k, 39.4, 16.4, s=1.1)
for (x0, x1, r) in ((39.0, 44.0, 18.6), (46.0, 51.0, 15.4), (52.0, 57.0, 15.4), (46.0, 51.0, 17.6)):
    CAP.timber_stack(k, x0, x1, r)
W.cart(k, 55.4, 18.4)
k.solid(54.7, 17.8, 56.1, 19.0)
CAP.treadwheel_crane(k, 37.6, 21.6, jib=2.2, angle=-0.9)          # lowering a crate into the dock
for x in (24.0, 30.0, 38.6):
    W.lantern_post(k, x, ROAD[1] - 0.2, energy=24)
    k.solid_post(x, ROAD[1] - 0.2)
for (x, r) in ((8.0, 20.0), (15.0, 20.0), (41.0, 20.6), (52.0, 20.4)):
    W.lantern_post(k, x, r, energy=26)
    k.solid_post(x, r)

# ---- the dry dock and its man-of-war -----------------------------------------------------------------------------------------
dx0, dx1, dr0, dr1 = DOCK
FLOOR = -2.4
k.box(dx0, dr0, FLOOR - 0.1, dx1, dr1, FLOOR, ('#5e5a52', 0.2), 'floor_dock')
for i in range(6):                                              # the altars: stone steps down the sides, all round
    t = i * 0.32
    z = -0.05 - i * (abs(FLOOR) / 6)
    for (a, b, c_, d) in ((dx0 + t, dr0 + t, dx1 - t, dr0 + t + 0.32), (dx0 + t, dr0 + t, dx0 + t + 0.32, dr1),
                          (dx1 - t - 0.32, dr0 + t, dx1 - t, dr1)):
        k.box(a, b, z - 0.4, c_, d, z, (shade('#958e80', 1.0 - 0.04 * i), 0.14), 'dock_step', bevel=0.015)
    k.box(dx0 + t, dr0 + t + 0.28, z - 0.04, dx1 - t, dr0 + t + 0.32, z, shade('#958e80', 1.15), 'step_nose')
k.box(dx0 - 0.3, dr0 - 0.3, -0.06, dx1 + 0.3, dr0, 0.06, (CAP.STONE_L, 0.12), 'quay_coping', bevel=0.02)
# the caisson: a great timber gate holding the harbour out
k.box(CHAN[0] - 0.2, dr1 - 0.1, FLOOR, CHAN[1] + 0.2, dr1 + 0.4, 0.15, ('#4a3420', 0.14), 'caisson')
x = CHAN[0]
while x < CHAN[1]:
    k.box(x, dr1 + 0.38, FLOOR + 0.2, x + 0.06, dr1 + 0.42, 0.12, '#2a1a10', 'caisson_plank')
    x += 0.5
k.box(dx0, dr1 - 0.1, FLOOR, CHAN[0] - 0.2, dr1 + 0.3, 0.06, ('#7e786c', 0.14), 'dock_end')
k.box(CHAN[1] + 0.2, dr1 - 0.1, FLOOR, dx1, dr1 + 0.3, 0.06, ('#7e786c', 0.14), 'dock_end')
CAP.coursed(k, dx0, CHAN[0] - 0.2, FLOOR, 0.0, dr1 + 0.3, '#7e786c', part='wall_block', **CAP.BIG)
CAP.coursed(k, CHAN[1] + 0.2, dx1, FLOOR, 0.0, dr1 + 0.3, '#7e786c', part='wall_block', **CAP.BIG)
CAP.hull_in_frame(k, 19.0, 33.0, (dr0 + dr1) / 2, beam=3.0, zk=0.6, h=2.2, z0=FLOOR)
for (x, s) in ((20.0, -1), (24.0, -1), (28.0, -1), (32.0, -1), (20.0, 1), (24.0, 1), (28.0, 1), (32.0, 1)):      # shores from the altars
    k.tube((x, (dr0 + dr1) / 2 + s * 3.2, FLOOR + 1.2), (x, (dr0 + dr1) / 2 + s * 1.5, FLOOR + 1.8), 0.05, ('#6a5030', 0.1), 'shore', verts=5)
k.solid(dx0 - 0.3, dr0 - 0.3, dx1 + 0.3, dr1 + 0.4)
x = dx0                                                                 # a rail along the dock's lip
while x <= dx1:
    k.cyl(x, dr0 - 0.45, 0.0, 0.7, 0.04, A.IRON, 'rail_post', verts=6)
    x += 1.4
k.tube((dx0, dr0 - 0.45, 0.66), (dx1, dr0 - 0.45, 0.66), 0.02, A.IRON, 'rail', verts=5)
V.board_sign(k, 'No. 1 DOCK', 'IMFellEnglishSC-Regular', (dx0 + dx1) / 2, dr0 - 0.3, -0.5, size=0.22, board='#2a2a30')

# ---- the ship of the line on the stocks, under sheer-legs ---------------------------------------------------------------------
CAP.hull_in_frame(k, 41.0, 56.0, STOCKS_R, beam=3.0, zk=0.6, h=2.4)
for (a, b) in (((44.0, STOCKS_R - 3.0, 0.0), (48.5, STOCKS_R, 6.2)), ((53.0, STOCKS_R - 3.0, 0.0), (48.5, STOCKS_R, 6.2))):
    k.tube(a, b, 0.11, ('#5a4024', 0.1), 'sheerleg', verts=6, smooth=False)
k.tube((48.5, STOCKS_R, 6.2), (48.5, STOCKS_R, 3.4), 0.018, ('#c8b48a', 0.1), 'tackle', verts=4)
k.box(48.3, STOCKS_R - 0.12, 3.15, 48.7, STOCKS_R + 0.12, 3.45, ('#3a3a40', 0.1), 'block')
k.solid(40.2, STOCKS_R - 2.4, 57.0, STOCKS_R + 2.4)
V.board_sign(k, 'HMS SOVEREIGN II', 'IMFellEnglishSC-Regular', 48.5, STOCKS_R + 2.5, 0.02, size=0.2, board='#2a3a30')

# ---- the quay and the harbour --------------------------------------------------------------------------------------------------
C.coast(k, LAND, palette='emerald', grass='#3a5a3a', rock='#5a5a54', seed=91, beachiness=-1.0,
        keep_clear=[(-1.0, QUAY - 0.5, COLS + 1.0, 40.0)], sheer=[(-1.0, QUAY - 0.1, COLS + 1.0, 41.0), (CHAN[0] - 0.2, DOCK[3], CHAN[1] + 0.2, 41.0)])
k.box(-0.6, QUAY - 0.3, C.WZ - 0.9, COLS + 0.6, QUAY + 0.02, -0.02, (W.SALT[2], 0.12), 'quay_core')
CAP.coursed(k, -0.6, CHAN[0], C.WZ - 0.5, -0.04, QUAY + 0.02, '#7e786c', part='quay_wall', size=(0.18, 0.24, 0.4, 0.7))
CAP.coursed(k, CHAN[1], COLS + 0.6, C.WZ - 0.5, -0.04, QUAY + 0.02, '#7e786c', part='quay_wall', size=(0.18, 0.24, 0.4, 0.7))
x = -0.6
while x < COLS + 0.6:
    w = rng.uniform(0.55, 0.95)
    if not (CHAN[0] - 0.3 < x + w / 2 < CHAN[1] + 0.3):
        k.box(x + 0.015, QUAY - 0.3, -0.04, min(COLS + 0.6, x + w) - 0.015, QUAY + 0.04, 0.05, (shade(CAP.STONE_L, rng.uniform(0.88, 1.08)), 0.14), 'quay_coping', bevel=0.025)
    x += w
k.solid(-0.6, QUAY - 0.05, COLS + 0.6, QUAY + 1.0)
k.solid(CHAN[0], DOCK[3], CHAN[1], 29.6)                 # the channel's water either side of the footbridge
k.solid(CHAN[0], 31.2, CHAN[1], QUAY + 1.0)
# the footbridge over the channel
for i in range(8):
    x = CHAN[0] - 0.4 + i * (CHAN[1] - CHAN[0] + 0.8) / 8
    k.box(x, 29.6, -0.08, x + (CHAN[1] - CHAN[0] + 0.8) / 8 - 0.02, 31.2, -0.02, (shade(A.WOOD, 0.9 + 0.08 * (i % 2)), 0.14), 'path_footbridge')
for rr_ in (29.55, 31.15):
    k.tube((CHAN[0] - 0.4, rr_, 0.6), (CHAN[1] + 0.4, rr_, 0.6), 0.03, A.WOOD_D, 'rail', verts=5)
    for i in range(5):
        x = CHAN[0] - 0.4 + i * (CHAN[1] - CHAN[0] + 0.8) / 4
        k.cyl(x, rr_, -0.1, 0.62, 0.035, A.WOOD_D, 'rail_post', verts=6)
k.box(CHAN[0] - 0.4, 29.6, -0.5, CHAN[1] + 0.4, 31.2, -0.08, ('#4a3420', 0.14), 'bridge_body')
k.water_z = C.WZ
# a man-of-war fitting out alongside: furled sails, guns run out
since, ls = len(k.parts), len(k.lights)
W.galleon(k, 3.0, 15.5, QUAY + 2.0, beam=2.0, paint='#2a5446', flag='#2e8a5a', sails='furled', waterline=False)
C.sink(k, since, C.WZ + 0.1, ls)
CAP.treadwheel_crane(k, 17.6, QUAY - 1.1, jib=2.6, angle=-0.55)
for (x0, x1, rc) in ((36.0, 40.0, QUAY + 1.3), (42.0, 46.0, QUAY + 1.4)):
    CAP.barge(k, x0, x1, rc, wz=C.WZ)
for x in (2.0, 8.0, 14.0, 33.0, 40.0, 47.0, 54.0):
    k.cyl(x, QUAY - 0.45, 0.0, 0.42, 0.13, ('#2a2a30', 0.1), 'bollard', verts=10)
    k.solid_post(x, QUAY - 0.45)
for (x0, r) in ((5.0, 30.4), (10.0, 30.6)):                                                     # stores waiting to go aboard
    A.crate(k, x0, r, s=0.5)
    A.crate(k, x0 + 0.6, r + 0.1, s=0.46, tone=A.WOOD_L)
    A.barrel(k, x0 + 1.2, r, h=0.7, radius=0.25)
for x in (6.0, 20.0, 35.0, 50.0):
    W.lantern_post(k, x, QUAY - 0.6, energy=26)
    k.solid_post(x, QUAY - 0.6)

# ---- light -----------------------------------------------------------------------------------------------------------------------
k.area_light(30.0, 18.0, 16.0, '#90a8c8', 3000, 44.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}},
         light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#26384a', 0.8))

# ---- the world ---------------------------------------------------------------------------------------------------------------------


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


inters = [
    {'x': 0, 'y': YARD_GATE_R, 'type': 'enter_world', 'target': 'lumar-crown', 'spawn': [58, 25], 'label': 'YARD GATE', 'prompt': 'PRESS E TO GO THROUGH'},
    {'x': 0, 'y': BRIDGE_R, 'type': 'enter_world', 'target': 'lumar-crown-bridge', 'spawn': [57, 11], 'label': 'BRIDGE ROAD', 'prompt': 'PRESS E TO GO THROUGH'},
    look('THE ROPEWALK', 30, 6, 'THE ROPEWALK. THE SPINNERS WALK BACKWARDS DOWN ITS LENGTH ALL DAY, PAYING OUT HEMP FROM THE BUNDLES ROUND THEIR WAISTS, AND THE WHEEL BOY TURNS AND TURNS. A CABLE FOR A FIRST-RATE TAKES A WEEK.'),
    look('SAIL LOFT', 6, 14, 'THE SAIL LOFT. A FLOOR AS BIG AS A FIELD UPSTAIRS, CHALKED WITH THE SHAPES OF SAILS, AND TWENTY SAILMAKERS ON THEIR KNEES ON IT WITH PALMS AND NEEDLES.'),
    look('GUN FOUNDRY', 17, 14, 'THE GUN FOUNDRY. THE HEAT HITS YOU AT THE DOOR. A LONG NINE IS COOLING IN ITS PIT, AND THE FOUNDRYMEN ARE ARGUING ABOUT WHETHER IT RINGS TRUE.'),
    look('MAST HOUSE', 41, 14, 'THE MAST HOUSE. A MAINMAST OF PINE FROM THE NORTH, EIGHTY FEET OF IT, BEING ROUNDED BY HAND. THE SHAVINGS ARE UP TO THE SHIPWRIGHTS\' KNEES.'),
    look('THE ARSENAL', 52, 14, 'THE ARSENAL OFFICE. THE CLERK OF THE CHEQUE KEEPS A LEDGER OF EVERY NAIL. HE CAN TELL YOU HOW MANY THE SOVEREIGN TOOK, AND HE WILL, IF YOU STAND STILL LONG ENOUGH.'),
    look('No. 1 DOCK', 26, 19, 'No. 1 DOCK. A MAN-OF-WAR IN FRAME ON HER BLOCKS, THE ALTARS STEPPING DOWN ALL ROUND HER. WHEN SHE\'S PLANKED THEY\'LL OPEN THE CAISSON AND LET THE SEA IN TO FLOAT HER OUT.'),
    look('ON THE STOCKS', 48, 21, 'ON THE STOCKS: THE SOVEREIGN II, A SHIP OF THE LINE FOR THE CROWN. HER RIBS RISE HIGHER THAN THE MAST HOUSE. SHE\'LL TAKE A HUNDRED AND TEN GUNS AND THREE YEARS.'),
    look('THE CRANE', 18, 30, 'THE TREADWHEEL CRANE. TWO LADS WALK INSIDE THE WHEEL AND A CRATE OF ROUND SHOT RISES OFF THE QUAY AS IF IT WEIGHED NOTHING.'),
    look('FITTING OUT', 9, 31, 'A MAN-OF-WAR FITTING OUT ALONGSIDE: STORES GOING ABOARD, HER GUNS RUN OUT FOR THE GUNNER\'S INSPECTION, A BOSUN SWEARING AT A BARREL.'),
]
w = {'name': 'The Arsenal', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [1, YARD_GATE_R]}, 'moonColor': '#d8f0e0', 'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': inters}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
FOOTBRIDGE = [(c, r) for c in range(int(CHAN[0]), int(CHAN[1])) for r in (30,)]
apply_world(WORLD, k, (0, int(ROAD[0]), COLS - 1, 31), doors=FOOTBRIDGE, scene_id=WID,
            actors=[], scene_extra={'backdrop': True, 'smoke': SMOKE})
w = json.load(open(WORLD))
w['view'] = [-0.5, -1.0, COLS + 0.5, ROWS + 0.5]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('arsenal done')
