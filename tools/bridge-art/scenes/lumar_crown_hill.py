"""The Hill — over Crownhaven: the naval academy, the observatory, the palace gardens (world id "lumar-crown-hill").

  BVENV/bin/python tools/bridge-art/scenes/lumar_crown_hill.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-crown-hill

The top of the funicular from the canal quarter. Across the north, the palace's garden front: cream stone, two wings and
a dome, its garden door. Before it the palace gardens: parterres of clipped box round a fountain, gravel walks, topiary,
statues on plinths. West, the Royal Naval Academy round its parade ground — a training mast rigged with ratlines and
yards for the cadets to climb, a drill gun, flags. East, the Observatory: a round tower under a copper dome with its slit
open on the stars. Along the south, the lime walk and the Belvedere, a balustraded terrace over the drop: the cliff falls
away to the roofs of the city below, and the funicular's track goes down it.

Ways out: the FUNICULAR down to the canal quarter, the GARDEN DOOR into the palace (js/crown.js decides who may).
Kit: assets_capital.py, assets_house.py.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_capital as CAP           # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_village as V             # noqa: E402
import assets_house as HK              # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-crown-hill.json')
WID = 'lumar-crown-hill'
COLS, ROWS = 56, 40
k = Kit(COLS, ROWS, margin_top=3.0, margin_bottom=1.0, margin_x=0.5, seed=5606)
rng = k.rng
C45 = math.cos(math.radians(45))
CREAM = '#e8dcc4'

PAL = (13.0, 43.0, 0.6, 7.0)          # the palace's garden front (x0, x1, back, front)
GARDEN = (13.0, 43.0, 7.0, 19.0)
ACAD = (1.0, 12.0, 2.0, 7.6)          # the academy (x0, x1, back, front)
PARADE = (1.0, 12.0, 7.6, 21.0)
OBS = (49.0, 5.0)                      # the observatory's tower (cx, cr)
WALK_R = (21.0, 25.0)                  # the lime walk
EDGE = 27.0                            # the Belvedere's balustrade: the drop beyond
FUNI_X = 28.0                          # the funicular's top station
DROP = -5.0                            # how far down the city is

# ---- ground: gravel walks, lawns, the drop -----------------------------------------------------------------------------
k.box(-0.6, -3.5, -0.3, COLS + 0.6, EDGE + 0.4, -0.06, ('#3a3632', 0.12), 'ground')
W.grass(k, -0.6, -3.5, COLS + 0.6, EDGE + 0.2, tone='#3a5a32')
k.box(-0.6, WALK_R[0], -0.03, COLS + 0.6, EDGE, 0.0, ('#b8a888', 0.3), 'path_gravel')                  # the lime walk and the Belvedere
k.box(PARADE[0], PARADE[2], -0.03, PARADE[1], PARADE[3], 0.0, ('#a89878', 0.3), 'path_parade')          # the parade ground
for (x0, r0, x1, r1) in ((GARDEN[0], GARDEN[2], GARDEN[1], GARDEN[2] + 1.2), (27.0, GARDEN[2], 29.0, WALK_R[0]),
                         (GARDEN[0], 12.4, GARDEN[1], 13.6), (GARDEN[0], GARDEN[3] - 1.2, GARDEN[1], WALK_R[0]),
                         (12.0, 13.0, 13.0, 14.0), (43.0, 8.0, 46.0, 9.4), (46.0, 8.0, 52.0, WALK_R[0])):
    k.box(x0, r0, -0.03, x1, r1, 0.0, ('#b8a888', 0.3), 'path_gravel')
CAP.flagged(k, 44.0, 7.6, 54.0, 11.0, tone='#a09684')                                               # the observatory's terrace
W.meadow(k, '#3a5a32', area=(-0.6, -3.5, COLS + 0.6, WALK_R[0]), density=0.6)

# ---- the palace's garden front -----------------------------------------------------------------------------------------
px0, px1, pr0, pr1 = PAL
pc = (px0 + px1) / 2
k.box(px0, pr0 - 3.0, -0.02, px1, pr1, 3.6, (shade(CREAM, 0.9), 0.08), 'house_wall')
CAP.coursed(k, px0, px1, 0.0, 1.3, pr1, '#d8ccb4', part='stone_block', size=(0.26, 0.3, 0.5, 0.9), vary=(0.92, 1.05),
            skip=[(pc - 0.9, pc + 0.9, 0, 1.6)])
for i in range(13):                                    # tall windows across the two floors, pilasters between
    wx = px0 + 1.2 + i * (px1 - px0 - 2.4) / 12
    if abs(wx - pc) < 1.2:
        continue
    for (z0, z1) in ((0.4, 1.2), (1.8, 3.0)):
        k.box(wx - 0.28, pr1 + 0.01, z0, wx + 0.28, pr1 + 0.05, z1, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.85))
        k.box(wx - 0.34, pr1, z1, wx + 0.34, pr1 + 0.1, z1 + 0.1, ('#f0e8d8', 0.06), 'lintel')
        k.box(wx - 0.02, pr1 + 0.05, z0, wx + 0.02, pr1 + 0.07, z1, '#3a2a1e', 'window_frame')
    k.box(wx + 0.95, pr1 - 0.02, 1.3, wx + 1.15, pr1 + 0.08, 3.5, ('#f0e8d8', 0.06), 'pilaster')
k.box(px0 - 0.1, pr1 - 0.04, 1.3, px1 + 0.1, pr1 + 0.12, 1.42, ('#f0e8d8', 0.06), 'string_course')
k.box(px0 - 0.15, pr1 - 0.06, 3.5, px1 + 0.15, pr1 + 0.2, 3.75, ('#f0e8d8', 0.06), 'cornice', bevel=0.02)
x = px0
while x < px1 - 0.2:                                      # a balustrade along the roof's edge, urns on its piers
    k.cyl(x + 0.1, pr1 + 0.05, 3.75, 4.15, 0.045, ('#f0e8d8', 0.06), 'baluster', verts=6)
    x += 0.2
k.box(px0, pr1 - 0.05, 4.15, px1, pr1 + 0.15, 4.22, ('#f0e8d8', 0.06), 'balustrade_rail')
for x in (px0 + 0.3, px0 + 7.5, px1 - 7.5, px1 - 0.3):
    k.sphere(x, pr1 + 0.05, 4.4, 0.16, 0.16, ('#f0e8d8', 0.06), 'urn', segs=10)
W._gable_roof(k, px0, px1, pr0 - 3.0, pr1 - 0.2, 3.7, 1.0, W.ROOF_SLATE)
# the dome over the middle, gilt lantern on top
k.cyl(pc, pr0 + 1.6, 3.7, 5.0, 2.2, (CREAM, 0.08), 'dome_drum', verts=28)
for i in range(10):
    a = math.pi / 2 + (i - 4.5) * 0.3
    k.box(pc + math.cos(a) * 2.21 - 0.15, pr0 + 1.6 + math.sin(a) * 2.21, 4.05, pc + math.cos(a) * 2.21 + 0.15, pr0 + 1.6 + math.sin(a) * 2.21 + 0.02, 4.7,
          '#5a3a18', 'window_glass', emit=(W.GLOW, 0.8))
k.blob(pc, pr0 + 1.6, 5.0, 2.3, 2.3, 1.7, ('#3e7a6a', 0.1), 'roof_dome', segs=28)
for j in range(12):                                      # ribs down the dome
    a = j * math.pi / 6
    k.tube((pc + math.cos(a) * 2.25, pr0 + 1.6 + math.sin(a) * 2.25, 5.05), (pc, pr0 + 1.6, 6.7), 0.04, '#c8a040', 'dome_rib', verts=4)
k.cyl(pc, pr0 + 1.6, 6.6, 7.2, 0.35, (CREAM, 0.08), 'roof_lantern', verts=12)
k.cone(pc, pr0 + 1.6, 7.2, 7.8, 0.4, 0.03, ('#c8a040', 0.06), 'roof_cone', verts=12)
# the garden door: a portico of four columns up a flight of steps
for i, x in enumerate((pc - 1.5, pc - 0.5, pc + 0.5, pc + 1.5)):
    k.cyl(x, pr1 + 1.0, 0.3, 3.4, 0.16, ('#f4ece0', 0.06), 'column', verts=14)
    k.box(x - 0.22, pr1 + 0.78, 3.4, x + 0.22, pr1 + 1.22, 3.52, ('#f4ece0', 0.06), 'column_capital')
k.box(pc - 1.9, pr1, 3.52, pc + 1.9, pr1 + 1.3, 3.8, ('#f0e8d8', 0.06), 'entablature')
k.poly([(pc - 2.0, pr1 + 1.3, 3.8), (pc + 2.0, pr1 + 1.3, 3.8), (pc, pr1 + 1.3, 4.7)], ('#f0e8d8', 0.06), 'pediment')
k.cyl_y(pc, pr1 + 1.28, pr1 + 1.34, 4.12, 0.22, 0.22, '#c8a040', 'pediment_badge', verts=14)
for i in range(4):
    k.box(pc - 2.0 + i * 0.0, pr1 + 0.2 + i * 0.35, -0.02, pc + 2.0, pr1 + 0.55 + i * 0.35, 0.3 - i * 0.075, (shade('#e8e0d0', 1.0 - 0.03 * i), 0.08), 'steps')
k.box(pc - 0.6, pr1 - 0.04, 0.3, pc + 0.6, pr1 + 0.01, 1.9, ('#3a2416', 0.12), 'door')
k.box(pc - 0.55, pr1 + 0.01, 0.35, pc + 0.55, pr1 + 0.03, 1.85, ('#4e3220', 0.12), 'door_panel')
for s in (-1, 1):
    W.wall_lantern(k, pc + s * 1.1, pr1 + 0.02, z=1.6, energy=16)
    I.flagpole(k, pc + s * 3.4, pr1 + 0.6, h=3.6, col='#2e8a5a')
k.solid(px0, pr0 - 3.0, px1, pr1 + 0.3)
k.solid(pc - 2.0, pr1, pc - 1.2, pr1 + 1.4)
k.solid(pc + 1.2, pr1, pc + 2.0, pr1 + 1.4)

# ---- the palace gardens: parterres round a fountain, topiary, statues --------------------------------------------------------
def parterre(x0, r0, x1, r1, seed):
    """A bed of clipped box in a pattern: a border all round, a diamond inside, flowers in its corners."""
    pr = random.Random(seed)
    with k.foliage('leaf'):
        for (a, b, c, d) in ((x0, r0, x1, r0 + 0.3), (x0, r1 - 0.3, x1, r1), (x0, r0, x0 + 0.3, r1), (x1 - 0.3, r0, x1, r1)):
            k.box(a, b, 0.0, c, d, 0.32, (shade('#2e5a2a', pr.uniform(0.92, 1.06)), 0.25), 'hedge', bevel=0.06)
        cx_, cr_ = (x0 + x1) / 2, (r0 + r1) / 2
        hw, hr = (x1 - x0) / 2 - 0.6, (r1 - r0) / 2 - 0.6
        pts = [(cx_ - hw, cr_), (cx_, cr_ - hr), (cx_ + hw, cr_), (cx_, cr_ + hr), (cx_ - hw, cr_)]
        for p, q in zip(pts, pts[1:]):
            k.tube((p[0], p[1], 0.12), (q[0], q[1], 0.12), 0.13, ('#2e5a2a', 0.25), 'hedge', verts=6, smooth=False)
    for (fx, fr) in ((x0 + 0.6, r0 + 0.6), (x1 - 0.6, r0 + 0.6), (x0 + 0.6, r1 - 0.6), (x1 - 0.6, r1 - 0.6)):
        V.flower_bed(k, fx - 0.25, fr - 0.2, fx + 0.25, fr + 0.2)
    k.solid(x0, r0, x1, r1)


for (x0, r0, x1, r1, sd) in ((14.0, 8.4, 20.0, 12.2, 1), (20.6, 8.4, 26.4, 12.2, 2), (29.6, 8.4, 35.4, 12.2, 3), (36.0, 8.4, 42.0, 12.2, 4),
                             (14.0, 13.8, 20.0, 17.6, 5), (20.6, 13.8, 26.4, 17.6, 6), (29.6, 13.8, 35.4, 17.6, 7), (36.0, 13.8, 42.0, 17.6, 8)):
    parterre(x0, r0, x1, r1, sd)
W.fountain(k, 28.0, 13.0, rad=1.0)
k.solid(27.0, 12.2, 29.0, 13.9)
with k.foliage('needle'):
    for (x, r) in ((14.2, 8.0), (41.8, 8.0), (14.2, 18.2), (41.8, 18.2), (26.6, 8.0), (29.4, 8.0)):       # topiary cones
        k.cone(x, r, 0.15, 1.6, 0.36, 0.04, ('#2a4a2a', 0.25), 'topiary', verts=12)
        k.cyl(x, r, 0.0, 0.18, 0.22, ('#7a5a3a', 0.12), 'topiary_pot', verts=10)
        k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
for (x, r) in ((20.3, 13.0), (35.7, 13.0)):
    W.statue(k, x, r)
    k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)
for x in (16.0, 24.0, 32.0, 40.0):
    W.bench(k, x - 0.6, x + 0.6, 19.4)
    k.solid(x - 0.6, 19.2, x + 0.6, 19.65)

# ---- the Royal Naval Academy and its parade ground ---------------------------------------------------------------------------------
ax0, ax1, ar0, ar1 = ACAD
k.box(ax0, ar0, -0.02, ax1, ar1, 3.4, (shade('#c8bca8', 0.88), 0.1), 'house_wall')
CAP.coursed(k, ax0, ax1, 0.0, 3.4, ar1, '#c8bca8', part='stone_block', size=(0.26, 0.3, 0.5, 0.9), vary=(0.9, 1.06),
            skip=[(6.0, 7.0, 0, 1.6)] + [(wx - 0.3, wx + 0.3, z0, z0 + 0.8) for wx in (2.0, 3.6, 5.0, 8.0, 9.4, 11.0) for z0 in (0.5, 2.0)])
for wx in (2.0, 3.6, 5.0, 8.0, 9.4, 11.0):
    for z0 in (0.5, 2.0):
        k.box(wx - 0.26, ar1 + 0.0, z0, wx + 0.26, ar1 + 0.05, z0 + 0.75, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.85))
        k.box(wx - 0.32, ar1, z0 + 0.75, wx + 0.32, ar1 + 0.1, z0 + 0.85, ('#f0e8d8', 0.06), 'lintel')
k.box(6.0, ar1 - 0.04, 0.0, 7.0, ar1 + 0.01, 1.55, ('#2a2a3a', 0.12), 'door')
k.box(ax0 - 0.1, ar1 - 0.04, 3.4, ax1 + 0.1, ar1 + 0.15, 3.6, ('#f0e8d8', 0.06), 'cornice')
W._gable_roof(k, ax0, ax1, ar0, ar1 - 0.1, 3.5, 1.2, W.ROOF_SLATE)
k.cyl(6.5, (ar0 + ar1) / 2, 4.2, 5.0, 0.5, ('#f0e8d8', 0.06), 'cupola', verts=12)                 # a cupola with a bell
k.cone(6.5, (ar0 + ar1) / 2, 5.0, 5.6, 0.6, 0.04, ('#3e7a6a', 0.1), 'roof_cone', verts=12)
V.board_sign(k, 'ROYAL NAVAL ACADEMY', 'CinzelDecorative-Bold', 6.5, ar1 + 0.05, 1.68, size=0.16, board='#1e2a4a')
for s in (-1, 1):
    W.wall_lantern(k, 6.5 + s * 0.8, ar1 + 0.02, z=1.4, energy=14)
k.solid(ax0, ar0, ax1, ar1)
# the training mast: rigged with shrouds and yards, a net at its foot
MX, MR = 6.5, 12.6
k.cyl(MX, MR, 0.0, 6.4, 0.11, ('#8a6a40', 0.1), 'mast', verts=10)
for (z, w) in ((2.6, 1.8), (4.4, 1.4), (5.8, 1.0)):
    k.cyl_x(MX - w, MX + w, MR, z, 0.05, 0.05, ('#7a5a34', 0.1), 'yard', verts=8)
for s in (-1, 1):
    for i in range(6):
        k.tube((MX + s * (1.4 - i * 0.1), MR + 0.6, 0.05), (MX + s * 0.12, MR, 4.4), 0.012, '#3a3028', 'shroud', verts=4)
    for j in range(8):
        z = 0.5 + j * 0.5
        t = z / 4.4
        k.tube((MX + s * 1.4 * (1 - t), MR + 0.6 * (1 - t), z), (MX + s * 0.9 * (1 - t), MR + 0.6 * (1 - t), z), 0.008, '#3a3028', 'ratline', verts=4)
k.box(MX - 1.8, MR - 1.0, 0.25, MX + 1.8, MR + 1.2, 0.3, ('#5a5a50', 0.3), 'safety_net')
for (x, r) in ((MX - 1.8, MR - 1.0), (MX + 1.8, MR - 1.0), (MX - 1.8, MR + 1.2), (MX + 1.8, MR + 1.2)):
    k.cyl(x, r, 0.0, 0.32, 0.04, A.WOOD_D, 'net_post', verts=6)
k.solid(MX - 1.8, MR - 1.0, MX + 1.8, MR + 1.2)
CAP.cannon(k, 3.0, 17.0)                                   # the drill gun
CAP.shot_pyramid(k, 4.2, 17.6, n=3)
I.flagpole(k, 10.6, 9.0, h=3.6, col='#1e3a6a')
for x in (1.4, 11.6):
    W.lantern_post(k, x, 20.6, energy=24)
    k.solid_post(x, 20.6)

# ---- the Observatory -----------------------------------------------------------------------------------------------------------
ox, orow = OBS
k.cyl(ox, orow, -0.05, 3.4, 1.6, ('#c8bca8', 0.1), 'tower_wall', verts=28)
CAP.tower(k, ox, orow, R=1.6, h=3.4, tone='#c8bca8', roof='#3e7a6a', crenel=True, windows=2, light=False)
k.blob(ox, orow, 4.0, 1.5, 1.5, 1.25, ('#5a8a7a', 0.1), 'roof_dome', segs=24)          # the copper dome, gone green
k.box(ox - 0.22, orow - 1.0, 4.0, ox + 0.22, orow + 1.6, 5.3, '#101828', 'dome_slit')
k.tube((ox, orow + 0.3, 4.2), (ox + 0.4, orow + 1.4, 5.4), 0.16, (W.BRASS, 0.06), 'telescope', verts=12)
k.point_light(ox, orow + 1.8, 1.4, '#ffc070', 14, radius=0.4, group='flicker')
k.box(ox - 0.4, orow + 1.55, 0.0, ox + 0.4, orow + 1.62, 1.4, ('#3a2416', 0.12), 'door')
V.board_sign(k, 'THE OBSERVATORY', 'IMFellEnglishSC-Regular', ox, orow + 1.66, 1.62, size=0.16, board='#1e2a3a')
k.tube((45.4, 10.4, 0.0), (45.4, 10.4, 0.9), 0.03, A.IRON, 'tripod', verts=5)
k.tube((45.2, 10.3, 0.9), (45.7, 10.0, 1.25), 0.07, W.BRASS, 'telescope', verts=10)
k.solid(45.0, 10.0, 45.8, 10.8)

# ---- the lime walk, the Belvedere and the funicular's top station -------------------------------------------------------------
with k.foliage('leaf'):
    for x in (2.0, 6.0, 10.0, 14.0, 18.0, 22.0, 34.0, 38.0, 42.0, 46.0, 50.0, 54.0):
        W.tree(k, x, WALK_R[0] + 0.4, h=2.8, tone=rng.choice(('#3a6234', '#2e5a3a', '#4a6a30')))
        k.solid(x - 0.3, WALK_R[0] - 0.1, x + 0.3, WALK_R[0] + 0.4)
CAP.balustrade(k, -0.6, FUNI_X - 2.4, EDGE, h=0.75)
CAP.balustrade(k, FUNI_X + 2.4, COLS + 0.6, EDGE, h=0.75)
for x in (8.0, 20.0, 36.0, 48.0):
    W.lantern_post(k, x, EDGE - 0.5, energy=26)
    k.solid_post(x, EDGE - 0.5)
# the station: an open shed over the track's head, a waiting bench, the car standing at the top
sx0, sx1 = FUNI_X - 2.2, FUNI_X + 2.2
for x in (sx0, sx1 - 0.18):
    for r in (EDGE - 3.0, EDGE + 0.3):
        k.box(x, r, -0.02, x + 0.18, r + 0.18, 2.4, (A.WOOD_D, 0.12), 'post')
W._gable_roof(k, sx0 - 0.2, sx1 + 0.2, EDGE - 3.2, EDGE + 0.6, 2.4, 0.8, '#3e7a6a')
V.board_sign(k, 'FUNICULAR', 'AlegreyaSC-Bold', FUNI_X, EDGE + 0.62, 2.0, size=0.2, board='#2a3a2e')
k.solid(sx0, EDGE - 3.0, sx0 + 0.2, EDGE + 0.5)
k.solid(sx1 - 0.2, EDGE - 3.0, sx1, EDGE + 0.5)

# the drop: a cliff of strata falling from the Belvedere to the city's roofs far below, the track going down it
for i in range(5):
    r = EDGE + 0.3 + i * 0.25
    z1 = -i * (abs(DROP) / 5)
    k.box(-0.6, r, z1 - abs(DROP) / 5 - 0.1, COLS + 0.6, r + 0.25, z1, (shade(('#6a6458', '#5e584e', '#726c60')[i % 3], rng.uniform(0.9, 1.05)), 0.16), 'cliff')
for i in range(70):
    x = rng.uniform(-0.6, COLS + 0.6)
    if abs(x - FUNI_X) < 1.0:
        continue
    with k.foliage('leaf'):
        k.blob(x, EDGE + rng.uniform(0.5, 1.4), rng.uniform(-4.0, -0.4), rng.uniform(0.1, 0.25), 0.1, rng.uniform(0.08, 0.18),
               (rng.choice(('#2e4a2a', '#3a5a32', '#4a5a2a')), 0.2), 'cliff_shrub', segs=8)
k.box(-0.6, EDGE + 1.55, DROP - 0.4, COLS + 0.6, ROWS + 1.5, DROP, ('#3a3632', 0.12), 'ground_below')
crng = random.Random(77)
x = -0.6
while x < COLS + 0.6:                                     # the city's roofs, far below
    w = crng.uniform(2.0, 3.6)
    r0 = EDGE + 2.0 + crng.uniform(0, 1.5)
    for (ra, rb) in ((r0, r0 + 2.6), (r0 + 4.4, r0 + 7.0), (r0 + 8.8, r0 + 11.4)):
        if rb < ROWS + 1.2 and not (FUNI_X - 1.0 < x + w / 2 < FUNI_X + 1.0 and ra < EDGE + 6):
            k.box(x + 0.05, ra, DROP, x + w - 0.05, rb, DROP + 2.2, (crng.choice(CAP.PLASTERS), 0.1), 'house_wall')
            W._gable_roof(k, x + 0.05, x + w - 0.05, ra, rb, DROP + 2.2, 1.0, crng.choice(CAP.ROOFS))
            if crng.random() < 0.5:
                k.box(x + w / 2 - 0.15, rb + 0.01, DROP + 0.9, x + w / 2 + 0.15, rb + 0.04, DROP + 1.3, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.8))
    x += w
# the track: rails on sleepers down the cliff and away south
for i in range(16):
    r = EDGE - 2.6 + i * 0.6
    z = 0.05 if r < EDGE + 0.3 else max(DROP, -(r - EDGE - 0.3) * 1.3)
    k.box(FUNI_X - 0.8, r - 0.1, z - 0.08, FUNI_X + 0.8, r + 0.1, z, ('#5a4030', 0.14), 'sleeper')
for dx in (-0.5, 0.5):
    k.tube((FUNI_X + dx, EDGE - 2.8, 0.08), (FUNI_X + dx, EDGE + 0.3, 0.08), 0.035, '#6a6a70', 'rail', verts=6)
    k.tube((FUNI_X + dx, EDGE + 0.3, 0.08), (FUNI_X + dx, EDGE + 4.2, DROP + 0.1), 0.035, '#6a6a70', 'rail', verts=6)
# the car at the top: a stepped wooden car, glazed, painted green and cream
CR0 = EDGE - 2.6
for i, (r0, r1, z0) in enumerate(((CR0, CR0 + 0.8, 0.1), (CR0 + 0.8, CR0 + 1.6, 0.1), (CR0 + 1.6, CR0 + 2.4, 0.1))):
    k.box(FUNI_X - 0.85, r0, z0, FUNI_X + 0.85, r1 - 0.05, z0 + 1.5, ('#2e5a3e', 0.1), 'car_body')
    k.box(FUNI_X - 0.8, r1 - 0.06, z0 + 0.7, FUNI_X + 0.8, r1 - 0.02, z0 + 1.3, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.75))
    k.box(FUNI_X - 0.9, r0 - 0.02, z0 + 1.5, FUNI_X + 0.9, r1, z0 + 1.62, ('#e8dcc4', 0.08), 'car_roof')
k.solid(FUNI_X - 0.9, CR0, FUNI_X + 0.9, CR0 + 2.4)

# ---- light ----------------------------------------------------------------------------------------------------------------------
k.area_light(28.0, 16.0, 16.0, '#90a8c8', 3000, 44.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}},
         light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#26384a', 0.8))

# ---- the world -------------------------------------------------------------------------------------------------------------------


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


inters = [
    {'x': FUNI_X, 'y': int(EDGE) - 1, 'type': 'enter_world', 'target': 'lumar-crown-canals', 'spawn': [45, 4], 'label': 'FUNICULAR', 'prompt': 'PRESS E TO RIDE DOWN'},
    {'x': int(pc), 'y': int(PAL[3]) + 2, 'type': 'palace_gate', 'label': 'GARDEN DOOR', 'prompt': 'PRESS E TO ASK'},
    {'x': 5, 'y': 8, 'type': 'dialog', 'label': 'ACADEMY MASTER', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE MASTER WATCHES THE CADETS ON THE MAST.'},
    {'x': int(ox) + 1, 'y': int(orow) + 2, 'type': 'dialog', 'label': 'ASTRONOMER', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE ASTRONOMER IS WRITING DOWN A STAR.'},
    {'x': 45, 'y': 11, 'type': 'dialog', 'label': 'TELESCOPE', 'prompt': 'PRESS E TO LOOK', 'action': 'view', 'view': 'stars',
     'dialog': 'THE TERRACE TELESCOPE, BRASS AND COLD. THE STARS OVER LUMAR, AND THE MOON\'S GREEN EDGE.'},
    look('THE BELVEDERE', 20, int(EDGE) - 1, 'THE BELVEDERE. THE WHOLE CAPITAL BELOW YOU: THE CANALS, THE OLD TOWN\'S WALLS, THE HARBOUR AND THE OLD BRIDGE OVER ITS MOUTH, AND THE SEA GOING ON GREEN TO THE EDGE OF THE WORLD.', prompt='PRESS E TO LOOK OUT'),
    look('TRAINING MAST', 6, 14, 'THE TRAINING MAST. CADETS UP THE RATLINES AT DAWN, OUT ALONG THE YARDS, DOWN AGAIN BEFORE THE BELL. THE NET HAS SAVED MORE ADMIRALS THAN ANY SHIP.'),
    look('THE FOUNTAIN', 28, 14, 'THE QUEEN-REGENT\'S FOUNTAIN. THE BASIN IS CARVED WITH ALL FIVE SEAS, AND A SIXTH ON THE BACK WHERE NOBODY LOOKS.'),
    look('PARTERRE', 17, 12, 'CLIPPED BOX, GRAVEL, ROSES. THE HEAD GARDENER CUTS IT WITH SCISSORS. ACTUAL SCISSORS.'),
]
w = {'name': 'The Hill', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [FUNI_X + 3, int(EDGE) - 2]}, 'moonColor': '#d8f0e0', 'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': inters}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(5, 8, 6, 9)                                        # the academy master on the parade ground
k.solid(int(ox) + 1, int(orow) + 2, int(ox) + 2, int(orow) + 3)   # the astronomer at the tower's door
apply_world(WORLD, k, (0, 0, COLS - 1, int(EDGE) - 1), scene_id=WID,
            actors=[{'sheet': 'npc-academy', 'x': 5, 'y': 8, 'facing': 'down'},
                    {'sheet': 'npc-astronomer', 'x': int(ox) + 1, 'y': int(orow) + 2, 'facing': 'down'}],
            scene_extra={'backdrop': True})
w = json.load(open(WORLD))
w['view'] = [-0.5, -1.0, COLS + 0.5, ROWS + 0.5]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('hill done')
