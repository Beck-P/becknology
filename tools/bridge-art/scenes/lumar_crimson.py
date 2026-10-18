"""Crimson Reach — the big crimson island (world id "lumar-crimson"), rebuilt in the house style (Look Book 2, Oct 2026).

  BVENV/bin/python tools/bridge-art/scenes/lumar_crimson.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-crimson

A whole island to walk, not a dock: your sloop ties up at a pier on the south cove, where pirates camp on the pink sand
round a fire — tents, a hammock slung between posts, a cook-pot on its tripod, kegs and crates, a cannon dragged up
the beach, washing on a line. A path climbs north across a moor of red heather and rust-red grass — past the Teeth, a
ring of lichened standing stones, and a ruined watchtower — to the Ashen Ridge: a crag of dark basalt stepping up in
tiers, ash on its ledges and embers in its cracks, the mouth of the dragon's cave in its foot, the ground before it
scorched and veined with fire, the ribs of something huge in the ash. West, spore crystals grow in clusters above the
reef where the Gilded Heron broke her back; east, a wood of wind-bent red pines over bracken and fallen logs hides a
shrine, and a rope bridge runs out to a sea stack with an X scratched on it. The map (land, paths, every door and
interaction) is the one the game has always had: this is its art.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_coast as C               # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_wild as WL               # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-crimson.json')
COLS, ROWS = 56, 42
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=1.0, margin_x=0.5, seed=811)
WL.test_hooks(k)
CRYSTAL = ('#6a1a2a', '#e04060')
EMBER = ('#401008', '#ff5020')
BASALT = ('#4a3e40', '#3e3436', '#54464a', '#463a3e')

# ---- the island's shape (unchanged: the map) ------------------------------------------------------------------------
LOBES = [(28, 21, 20, 12), (12, 21, 7.5, 9), (44, 19, 8.5, 9.5), (29, 31, 9.5, 5.5), (29, 9.5, 17, 5.5)]
land = I.mask(COLS, ROWS, LOBES, seed=4, amp=0.16)
STACK = {(c, r) for c in range(50, 53) for r in range(26, 30) if math.hypot(c + 0.5 - 51.5, (r + 0.5 - 28.0) * 1.15) < 1.7}
land = I.flood(land, (28, 22)) | STACK


def ridge_south(x):
    """Row of the Ashen Ridge's foot; the cave mouth's stretch is straight."""
    if 27.5 <= x <= 32.5:
        return 10.0
    return 10.0 + 1.3 * I.n2(x, 0, 0.18, 9) + 0.6 * I.n2(x, 0, 0.5, 2)


RIDGE = {(c, r) for (c, r) in land if 13 <= c <= 45 and r + 0.5 < ridge_south(c + 0.5)}
walk = land - RIDGE
CAVE = (30.0, 10.0)                                   # the mouth, in the ridge's face
walk |= {(29, 9), (30, 9)}                            # the notch you step into

# the pier: down from the south shore to where your sloop ties up
PX = 28
pier_top = max(r for (c, r) in land if c == PX) + 1
PIER = [(PX, r) for r in range(pier_top, pier_top + 2)]
SHIP_R = pier_top + 2
FJ, FLEN = (36, 34), 6                     # the fishing jetty: east off the far end of the beach
FJET = I.jetty_cells(FJ, FLEN, 'e')
SL = 7.0

# paths (polylines through tile coordinates)
CAMP = (31.5, 29.5)
CROSS = (28.5, 23.5)
PATHS = [
    [(PX + 0.5, pier_top + 0.2), (28.7, 31.5), CAMP],
    [(28.7, 31.5), (28.2, 27.0), CROSS, (29.0, 18.5), (30.2, 14.0), (CAVE[0], CAVE[1] + 0.2)],
    [CROSS, (23.0, 21.5), (17.5, 21.0), (11.0, 22.5), (7.5, 24.5)],
    [CROSS, (34.5, 22.5), (41.0, 21.5), (45.5, 24.0), (48.4, 27.6)],
    [(23.0, 21.5), (22.0, 17.5)],
]


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def scorch(x, r):
    wob = 0.35 * I.n2(x, r, 0.5, 7) + 0.15 * I.n2(x, r, 1.7, 17)
    return math.hypot((x - CAVE[0]) / 7.5, (r - 11.0) / 4.2) + wob


def material(x, r):
    p = pd(x, r) + 0.18 * I.n2(x, r, 1.6, 3)
    if p < 0.42:
        return 'path' if scorch(x, r) > 1.0 else 'path_ash'
    if p < 0.62 and I.n2(x, r, 2.2, 5) > 0:
        return 'path_edge'
    wob = 0.35 * I.n2(x, r, 0.5, 7) + 0.15 * I.n2(x, r, 1.7, 17)
    if scorch(x, r) < 1.0:
        return 'ash' if scorch(x, r) < 0.82 or I.n2(x, r, 2.0, 8) > 0 else 'ash_moor'
    if math.hypot((x - 29.5) / 9.0, (r - 33.0) / 3.6) + wob < 1.0:
        return 'sand'
    m = I.n2(x, r, 0.35, 11) + 0.4 * I.n2(x, r, 1.4, 12)
    if math.hypot((x - 14.0) / 5.5, (r - 21.5) / 6.0) + wob < 1.0:
        return 'crystal_moss' if m > -0.25 else 'moor'
    if x > 38:
        return 'needles' if m > -0.2 else 'moor_dark'
    return 'moor' if m > -0.15 else ('moor_dark' if m > -0.5 else 'grass')


ALB = {'path': ('#9a7a62', 0.3), 'path_ash': ('#5a4a44', 0.3), 'path_edge': ('#7e5e4a', 0.3), 'ash': ('#3a3232', 0.35),
       'ash_moor': ('#4a3432', 0.35), 'sand': ('#b8927c', 0.25),
       'moor': ('#6e4630', 0.3), 'moor_dark': ('#5a3a2a', 0.3), 'grass': ('#7a6a3c', 0.3),
       'crystal_moss': ('#6e2c42', 0.3), 'needles': ('#5a3428', 0.3)}
I.ground(k, walk, material, ALB)
# the ridge massif behind the crag: a gentle fill (the crag's tiers stand in front of it), ash on its crown
height = I.ridge(k, RIDGE, top=3.0, slope=4.0, seed=6, notches=[(28.6, 7.6, 31.4, 10.05)], foot=0.7, ground=(material, ALB),
                 rock='#3e3436', strata=('#4a3e40', '#3a3032', '#54464a'), moss='#3e3434')

terrain = C.coast(k, land, ground=(material, ALB), palette='crimson', grass='#6e4630', rock='#3a3034', seed=21, beachiness=-0.15,
                  beach_bias=lambda x, r: 0.9 * I.smooth(28.0, 34.0, r) * I.smooth(11.0, 6.0, abs(x - 29.5)) - 0.3 * I.smooth(14.0, 8.0, r),
                  keep_clear=[(PX - 0.4, pier_top - 0.4, PX + 1.4, SHIP_R + 0.2),
                              (PX + 0.5 - 0.45 * SL - 0.8, SHIP_R - 0.2, PX + 0.5 + 0.55 * SL + 1.8, SHIP_R + 1.9),
                              (44.0, 27.0, 50.2, 28.4), (1.0, 29.5, 10.0, 34.0),
                              (FJ[0] - 0.4, FJ[1] - 0.6, FJ[0] + FLEN + 1.4, FJ[1] + 1.6)])
rng = random.Random(8117)          # this rebuild's own dice

# ---- the pier, your sloop's berth ------------------------------------------------------------------------------------
W.dock(k, PX + 0.05, PX + 0.95, pier_top - 0.4, SHIP_R + 0.0, z=0.02)
# no galleon at the pier any more: your own sloop ties up at its end (js/sloop.js draws it, MOORINGS)
for x in (PX - 0.15, PX + 1.15):
    W.silver_post(k, x, pier_top + 0.6)
I.fishing_jetty(k, FJ, FLEN, 'e', glow='#ff7040')

# ---- the camp on the cove ------------------------------------------------------------------------------------------------
I.campfire(k, *CAMP)
I.log_seat(k, CAMP[0] - 0.7, CAMP[0] + 0.7, CAMP[1] + 0.85)
k.solid(CAMP[0] - 0.7, CAMP[1] + 0.6, CAMP[0] + 0.7, CAMP[1] + 1.1)
k.solid(31, 28, 32, 29)                               # where the Crimson Watcher stands
# the cook-pot on its tripod over the fire
for a in (0.0, 2.1, 4.2):
    k.tube((CAMP[0] + math.cos(a) * 0.42, CAMP[1] + math.sin(a) * 0.32, 0.0), (CAMP[0], CAMP[1], 0.95), 0.025, A.WOOD_D, 'tripod', verts=5)
k.tube((CAMP[0], CAMP[1], 0.95), (CAMP[0], CAMP[1], 0.62), 0.008, A.IRON, 'pot_chain', verts=4)
k.cyl(CAMP[0], CAMP[1], 0.42, 0.62, 0.15, (A.IRON, 0.3), 'cook_pot', verts=12)
k.cyl(CAMP[0], CAMP[1], 0.6, 0.62, 0.13, '#6a3a1a', 'stew', verts=12)
I.tent(k, 34.4, 27.9, col='#8a2e28')
I.tent(k, 36.0, 30.4, w=1.2, col='#5a3a30')
I.tent(k, 24.8, 28.4, w=1.3, col='#6a2a36')
I.flagpole(k, 36.8, 32.2)
for (x, r) in ((25.4, 31.0), (26.0, 31.4), (25.7, 30.5)):
    A.barrel(k, x, r, h=0.7, radius=0.26)
k.solid(25.0, 30.1, 26.4, 31.8)
A.crate(k, 26.5, 30.1, s=0.55)
A.crate(k, 26.6, 30.15, s=0.42, z0=0.55, solid=False)
n1 = len(k.parts)
W.rowboat(k, 22.4, 24.6, 33.6)
k.solid(22.3, 33.2, 24.7, 34.0)
for (x, r) in ((33.0, 31.2), (27.2, 33.4)):
    W.lantern_post(k, x, r, energy=22)
k.point_light(33.3, 31.4, 1.9, '#ff4030', 8, radius=0.1, group='flicker')               # the pirate's red flame


def hammock(a, b, col='#c8b48a'):
    """A hammock slung between two posts: the posts, the ropes, the cloth sagging between."""
    for (x, r) in (a, b):
        k.cyl(x, r, 0.0, 1.25, 0.05, A.WOOD_D, 'hammock_post', verts=6)
        k.solid_post(x, r)
    n = 10
    pts = []
    for i in range(n + 1):
        t = i / n
        x, r = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        z = 1.05 - 0.55 * math.sin(math.pi * t)
        pts.append((x, r, z))
    for p, q in zip(pts[1:-2], pts[2:-1]):
        k.bar(p[0], p[1] - 0.2, q[0], q[1] - 0.2, min(p[2], q[2]) - 0.01, min(p[2], q[2]) + 0.03, 0.02, (col, 0.3), 'hammock')
        k.bar(p[0], p[1], q[0], q[1], min(p[2], q[2]) - 0.02, min(p[2], q[2]) + 0.02, 0.4, (col, 0.3), 'hammock')
    k.tube(pts[0], pts[1], 0.01, '#8a7450', 'hammock_rope', verts=3)
    k.tube(pts[-1], pts[-2], 0.01, '#8a7450', 'hammock_rope', verts=3)


hammock((38.3, 28.6), (39.9, 28.9))
# a cannon dragged up the beach, pointing out to sea, a pyramid of shot beside it
CAN = (37.4, 32.9)                       # (off the fish auction's boxes and the sea glass at (34, 33))
k.box(CAN[0] - 0.32, CAN[1] - 0.22, 0.08, CAN[0] + 0.32, CAN[1] + 0.22, 0.28, ('#5a3418', 0.2), 'gun_carriage')
for (dx, dr) in ((-0.22, -0.24), (0.22, -0.24), (-0.22, 0.24), (0.22, 0.24)):
    k.cyl_x(CAN[0] + dx - 0.03, CAN[0] + dx + 0.03, CAN[1] + dr, 0.12, 0.12, 0.12, ('#3a2410', 0.2), 'gun_wheel', verts=10)
k.tube((CAN[0], CAN[1] - 0.25, 0.36), (CAN[0] + 0.05, CAN[1] + 0.7, 0.42), 0.11, (A.IRON, 0.2), 'gun', rb=0.08, verts=10)
for (dx, dr, dz) in ((0.55, -0.1, 0.06), (0.67, -0.1, 0.06), (0.61, 0.0, 0.06), (0.61, -0.05, 0.16)):
    k.sphere(CAN[0] + dx, CAN[1] + dr, dz, 0.06, 0.06, (A.IRON, 0.2), 'shot', segs=8)
k.solid(CAN[0] - 0.4, CAN[1] - 0.3, CAN[0] + 0.4, CAN[1] + 0.4)
# washing on a line between the tents, rum bottles, a chart weighted with stones on an upturned crate
for x in (24.0, 26.2):
    k.cyl(x, 26.6, 0.0, 1.2, 0.03, A.WOOD_D, 'line_pole', verts=5)
k.tube((24.0, 26.6, 1.15), (26.2, 26.6, 1.15), 0.007, '#c8b890', 'washing_line', verts=3)
for j, (col, w_) in enumerate((('#e8dcc8', 0.3), ('#8a2a2a', 0.36), ('#3a4a6a', 0.28), ('#e8dcc8', 0.24))):
    x = 24.3 + j * 0.5
    k.box(x, 26.58, 0.72, x + w_, 26.62, 1.13, (col, 0.3), 'washing')
k.solid_post(24.0, 26.6)
k.solid_post(26.2, 26.6)
A.crate(k, 29.9, 31.4, s=0.48, solid=True)
k.box(29.92, 31.42, 0.41, 30.36, 31.86, 0.42, ('#d8c8a0', 0.3), 'chart')
for (x, r) in ((29.98, 31.48), (30.3, 31.8)):
    k.sphere(x, r, 0.44, 0.03, 0.025, '#5a5050', 'pebble', segs=5)
for (x, r) in ((32.4, 30.55), (32.55, 30.62), (32.72, 30.5)):
    k.cyl(x, r, 0.0, 0.16, 0.035, ('#2a5a3a', 0.05), 'bottle', verts=8)
    k.cyl(x, r, 0.16, 0.22, 0.014, ('#2a5a3a', 0.05), 'bottle', verts=6)
# the beach's life: fish drying on a rack, an old boat's ribs half-buried in the sand, a sea chest by the tents, pennants
# strung from tent to tent (all clear of the auction's boxes, the sea glass and the nets the harbour folk mend)
with WL.own_dice(k, 8301):
    I.drying_rack(k, 21.7, 23.1, 30.65)
    I.rib_cage(k, 25.6, 32.75, L=1.4, h=0.55, tone='#6a4a30')
    I.chest(k, 35.6, 29.45)
    W.bunting(k, (24.8, 28.4, 1.3), (34.4, 27.9, 1.3), sag=0.35, cols=('#2a2226', '#e8dcc8', '#a02028', '#2a2226'))
    W.bunting(k, (34.4, 27.9, 1.3), (36.0, 30.4, 1.2), sag=0.2, cols=('#2a2226', '#e8dcc8', '#a02028'))
    for (x, r) in ((24.4, 30.3), (27.1, 29.9), (33.0, 29.4)):
        k.cyl(x, r, 0.0, 0.28, 0.12, ('#6a4a2a', 0.2), 'keg', verts=10)
        k.cyl(x, r, 0.08, 0.11, 0.125, A.IRON, 'keg_hoop', verts=10)
# driftwood and a coil of rope on the sand
for (x, r, L, a) in ((21.0, 32.4, 1.1, 0.3), (35.6, 34.2, 0.9, -0.4), (25.6, 34.6, 0.7, 0.9)):
    k.tube((x, r, 0.05), (x + math.cos(a) * L, r + math.sin(a) * L * 0.5, 0.06), 0.06, ('#a89480', 0.3), 'driftwood', rb=0.04, verts=6)
for j in range(3):
    k.cyl(27.0, 33.2, 0.0 + j * 0.03, 0.03 + j * 0.03, 0.16 - j * 0.03, '#a08a60', 'rope_coil', verts=10)

# ---- the moor: the Teeth, the watchtower, the warning on the cave path ------------------------------------------------
TEETH = (35.0, 17.0)
for i in range(7):
    a = i * math.tau / 7 + 0.2
    sx, sr = TEETH[0] + math.cos(a) * 2.0, TEETH[1] + math.sin(a) * 1.6
    h = k.rng.uniform(1.3, 2.0)
    I.standing_stone(k, sx, sr, h=h, tone='#5e5658', glyph=CRYSTAL[1] if i % 2 == 0 else None, lean=k.rng.uniform(-8, 8))
    for _ in range(3):                                # lichen on the stone, heather round its foot
        k.blob(sx + rng.uniform(-0.12, 0.12), sr + 0.18, rng.uniform(0.3, h * 0.8), 0.07, 0.03, 0.06,
               (rng.choice(('#a8a060', '#c0b080', '#8a9a5a')), 0.3), 'lichen', segs=6)
    WL.heather(k, sx + rng.uniform(-0.3, 0.3), sr + 0.35, s=0.22, tone='#a03048')
k.cyl(TEETH[0], TEETH[1], -0.005, 0.004, 0.5, ('#3a3236', 0.3), 'altar_slab', verts=10)
k.box(TEETH[0] - 0.4, TEETH[1] - 0.25, 0.0, TEETH[0] + 0.4, TEETH[1] + 0.25, 0.35, ('#4a4448', 0.22), 'altar_stone', bevel=0.03)
k.solid(TEETH[0] - 0.4, TEETH[1] - 0.25, TEETH[0] + 0.4, TEETH[1] + 0.25)
for (x, r) in ((34.85, 16.95), (35.15, 17.05)):        # offerings on the altar: a candle stub and a shell
    A.candle(k, x, r, 0.35, energy=1.0)
TOWER = (22.0, 15.5)
I.ruined_tower(k, *TOWER, rad=1.3, h=3.4, tone='#6a5e60')
with k.foliage('leaf'):                               # red ivy up the standing back wall
    for j in range(40):
        a = rng.uniform(math.pi * 1.1, math.pi * 1.9)
        z = rng.uniform(0.2, 2.4)
        k.blob(TOWER[0] + math.cos(a) * 1.46, TOWER[1] + math.sin(a) * 1.2, z, 0.1, 0.06, 0.09,
               shade('#8a2a2a', rng.uniform(0.85, 1.15)), 'ivy', segs=6)
k.solid(TOWER[0] - 1.4, TOWER[1] - 1.3, TOWER[0] + 1.4, TOWER[1] + 0.4)
W.wanted_poster(k, 31.4, 15.4)
W.lantern_post(k, 28.4, 16.2, energy=18)
for (x, r, h) in ((26.0, 25.5, 2.0), (19.5, 26.5, 1.8), (37.0, 25.0, 2.2), (24.5, 19.0, 1.6), (33.0, 21.0, 1.7)):
    I.dead_tree(k, x, r, h=h)

# ---- the Ashen Ridge: a crag of basalt tiers, ash on the ledges, embers in the cracks ---------------------------------
def foot(x):
    return ridge_south(x) - 0.25


TIERS = [(0.85, 0.0), (1.7, 1.1), (2.5, 2.2), (3.25, 3.3)]
for ti, (zt, back) in enumerate(TIERS):                 # (the crag rolls its own dice: see WL.own_dice)
    x0, x1 = 13.6 + 1.3 * ti + rng.uniform(-0.3, 0.3), 45.2 - 1.2 * ti + rng.uniform(-0.3, 0.3)
    WL.crag(k, foot, x0, x1, [(zt, back)] + ([TIERS[ti + 1]] if ti + 1 < len(TIERS) else []), BASALT, seed=60 + ti,
            skip=((28.2, 31.8),) if ti < 2 else (), ledge='#463c3c', cracks=EMBER if ti < 2 else '#2a2224', core='#2e2628')
# the mouth: a dark arch cut back into the rock, an ember glow deep inside, a heap of fallen boulders round it
cx, cf = CAVE
k.box(cx - 0.95, 7.7, 0.0, cx + 0.95, 7.85, 1.7, '#050302', 'cave_dark')
k.cyl_y(cx, 7.7, 7.85, 1.7, 0.95, 0.5, '#050302', 'cave_dark', verts=16)
k.box(cx - 0.7, 7.85, 0.0, cx + 0.7, 7.9, 0.5, '#200804', 'cave_glow', emit=('#ff5020', 0.4))
for s_ in (-1, 1):                                   # the cutting's walls either side of the notch
    k.box(cx + s_ * 1.6 - 0.45, 7.6, 0.0, cx + s_ * 1.6 + 0.45, 10.0, 1.9, (BASALT[1], 0.08), 'crag_face')
k.box(cx - 1.4, 7.4, 1.6, cx + 1.4, 8.6, 2.5, (BASALT[2], 0.08), 'crag_face')
k.point_light(cx, 8.3, 0.5, '#ff5020', 18, radius=0.2, group='flicker')
for i in range(9):                                    # the arch of boulders round the mouth
    a = i * math.pi / 8
    s = k.rng.uniform(0.32, 0.5)
    k.rock(cx + math.cos(a) * 1.25, 9.4 - math.sin(a) * 0.3, math.sin(a) * 1.9 + 0.1, s, s * 0.8, s, ('#3a3034', 0.22), part='cave_rock')
for (x, r) in ((27.2, 11.6), (33.4, 11.3), (26.0, 12.8), (34.5, 13.1), (24.5, 11.4), (36.0, 11.6)):
    s = k.rng.uniform(0.3, 0.55)
    k.rock(x, r, s * 0.3, s, s * 0.8, s * 0.7, ('#3a3034', 0.22), part='talus')
    k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)
# fallen blocks and scree along the crag's foot
for _ in range(70):
    x = rng.uniform(14.0, 45.0)
    r = foot(x) + rng.uniform(0.05, 0.6)
    if 27.6 < x < 32.4 or (int(x), int(r)) in walk and pd(x, r) < 1.0:
        continue
    s = rng.choice((0.06, 0.09, 0.13, 0.18))
    k.rock(x, r, s * 0.2, s, s * 0.8, s * 0.6, (shade(rng.choice(BASALT), rng.uniform(0.85, 1.15)), 0.2), part='scree', segs=6,
           seed=rng.randrange(10 ** 6))
for i in range(4):                                    # claw gouges beside the mouth
    x = cx + 1.7 + i * 0.16
    k.bar(x, 10.6, x + 0.25, 11.2, 0.0, 0.006, 0.05, '#120808', 'claw_mark')
I.lava_vein(k, [(28.4, 10.6), (27.6, 11.4), (27.9, 12.3), (26.8, 13.0)])
I.lava_vein(k, [(31.8, 10.5), (32.6, 11.0), (32.3, 12.0), (33.6, 12.7), (34.3, 14.1)])
I.lava_vein(k, [(30.6, 12.4), (31.2, 13.1)], w=0.04)
I.lava_vein(k, [(25.2, 12.2), (24.6, 12.7), (24.9, 13.3)], w=0.035)
k.point_light(27.6, 11.8, 0.4, '#ff5020', 6, radius=0.2, group='flicker')
k.point_light(33.0, 12.4, 0.4, '#ff5020', 6, radius=0.2, group='flicker')
for _ in range(70):                                   # smouldering cinders and charred stumps in the ash
    x, r = rng.uniform(22.0, 38.0), rng.uniform(10.6, 15.0)
    if scorch(x, r) > 0.95 or pd(x, r) < 0.7:
        continue
    if rng.random() < 0.7:
        s = rng.uniform(0.04, 0.07)
        k.rock(x, r, 0.0, s, s * 0.8, s * 0.5, '#2a0a06', part='cinder', segs=5, seed=rng.randrange(10 ** 6))
        k.sphere(x, r, s * 0.4, s * 0.55, s * 0.4, '#401008', 'cinder_glow', emit=('#ff6020', 0.6), segs=5)
    else:                                                                # a charred stump, its broken top still glowing
        h_ = rng.uniform(0.3, 0.6)
        k.tube((x, r, 0.0), (x + rng.uniform(-0.05, 0.05), r, h_), 0.1, '#1e1414', 'charred', rb=0.07, verts=7)
        k.sphere(x, r, h_, 0.05, 0.03, '#401008', 'cinder_glow', emit=('#ff6020', 0.7), segs=6)
        for _ in range(3):
            a = rng.uniform(0, math.tau)
            k.tube((x, r, 0.06), (x + math.cos(a) * 0.3, r + math.sin(a) * 0.2, -0.02), 0.04, '#1e1414', 'charred', rb=0.015, verts=5)
I.rib_cage(k, 24.0, 13.4, L=2.6, h=1.2)
I.bones(k, 33.6, 14.6)
I.bones(k, 26.6, 15.2, s=0.8)
k.rock(32.0, 11.0, 0.3, 0.5, 0.4, 0.45, ('#3a3034', 0.22), part='marked_rock')       # H.M.'s charcoal note
for i in range(6):
    a = i * math.pi / 3
    k.bar(32.0 + math.cos(a) * 0.22, 11.42, 32.0 + math.cos(a) * 0.32, 11.42, 0.35 + math.sin(a) * 0.15, 0.37 + math.sin(a) * 0.15, 0.04,
          '#100808', 'charcoal')
k.solid(31.5, 10.5, 32.5, 11.5)
# red pines clinging to the crag's ledges
for (x, ti) in ((17.5, 1), (20.2, 2), (24.8, 3), (35.6, 3), (39.4, 2), (42.6, 1), (22.0, 1), (37.8, 1)):
    zt, back = TIERS[ti]
    sp_, sl_ = len(k.parts), len(k.lights)
    with WL.own_dice(k, int(x * 100)):
        I.red_pine(k, x, foot(x) - back - 0.5, h=rng.uniform(1.6, 2.2), tone='#5a2a34')
    I.pose(k, sp_, (0, 0, 0), dz=zt - 0.12, lights_since=sl_)

# ---- west: the crystal field above the reef, the wreck of the Gilded Heron ---------------------------------------------
for (x, r, s) in ((13.5, 18.0, 1.0), (15.8, 17.4, 0.8), (12.2, 20.5, 1.2), (16.6, 23.4, 0.9), (14.0, 24.4, 1.1),
                  (11.0, 23.6, 0.7), (17.6, 19.4, 0.7), (9.4, 19.4, 0.9), (13.2, 26.6, 0.8)):
    with WL.own_dice(k, int(x * 100 + r)):
        WL.crystal_cluster(k, x, r, s=s, col=CRYSTAL, energy=10, base='#5a4a4e')
    k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)                     # as W.shore_crystals blocked it
for _ in range(30):                                   # small crystals pushing up through the moss
    x, r = 14.0 + rng.uniform(-5, 5), 21.5 + rng.uniform(-5.5, 5.5)
    if math.hypot((x - 14.0) / 5.5, (r - 21.5) / 6.0) < 0.95 and pd(x, r) > 0.7 and (int(x), int(r)) in walk:
        k.tube((x, r, 0.0), (x + rng.uniform(-0.06, 0.06), r, rng.uniform(0.1, 0.22)), 0.03, CRYSTAL[0], 'crystal', rb=0.003,
               emit=(CRYSTAL[1], 0.6), verts=5, smooth=False)
n0, l0 = len(k.parts), len(k.lights)
W.galleon(k, 2.0, 9.2, 31.6, beam=1.5, masts=0.85, waterline=False, hull='#2e1e14', paint='#4a1a1e', sail='#8a7a68',
          flag='#3a1a1a', wreck=True)
C.sink(k, n0, C.WZ - 0.32, l0)
I.tilt(k, n0, (5.6, 31.6, C.WZ - 0.3), roll=-16, pitch=7, lights_since=l0)
for (x, r) in ((4.0, 30.2), (7.5, 30.6), (9.6, 31.8), (2.6, 32.6)):
    k.rock(x, r, C.WZ, 0.5, 0.4, 0.4, ('#3a3034', 0.22), part='reef')
for (x, r, a) in ((10.4, 30.4, 0.4), (8.6, 33.2, -0.6), (3.4, 29.0, 1.2)):              # her timbers in the shallows
    k.box(x - 0.45, r - 0.06, C.WZ - 0.04, x + 0.45, r + 0.06, C.WZ + 0.03, ('#4a3420', 0.2), 'wreck_plank')
k.cyl(11.2, 31.3, C.WZ - 0.1, C.WZ + 0.12, 0.2, ('#6a4a2a', 0.2), 'flotsam_barrel', verts=10)
W.lantern_post(k, 9.0, 25.4, energy=16)

# ---- east: the red pines, the shrine, the bridge to the stack -------------------------------------------------------------
pines = []
for i in range(46):
    x, r = 37.5 + k.rng.random() * 13.0, 11.5 + k.rng.random() * 14.0
    if (x, r) and (int(x), int(r)) in walk and pd(x, r) > 1.1 and math.hypot(x - 44.0, (r - 16.5) * 1.2) > 2.0 \
            and all(math.hypot(x - a, r - b) > 1.1 for (a, b) in pines):
        pines.append((x, r))
        I.red_pine(k, x, r, h=k.rng.uniform(2.2, 3.2), tone='#5e2a34')
# the wood's floor: bracken, fallen logs, toadstools between the pines
for _ in range(90):
    x, r = rng.uniform(37.5, 50.5), rng.uniform(11.5, 25.5)
    if (int(x), int(r)) not in walk or pd(x, r) < 0.9 or math.hypot(x - 44.0, (r - 16.5) * 1.2) < 1.6 \
            or any(math.hypot(x - a, r - b) < 0.45 for (a, b) in pines):
        continue
    roll = rng.random()
    if roll < 0.6:
        WL.fern(k, x, r, s=rng.uniform(0.48, 0.72), tone=rng.choice(('#9a4a2a', '#8a3e26', '#7a4a2a')))
    elif roll < 0.85:
        for j in range(rng.randint(2, 4)):
            mx, mr = x + rng.uniform(-0.15, 0.15), r + rng.uniform(-0.1, 0.1)
            hh = rng.uniform(0.06, 0.12)
            k.cyl(mx, mr, 0.0, hh, 0.018, '#e8dcc8', 'toadstool_stem', verts=6)
            k.sphere(mx, mr, hh, 0.05, 0.03, ('#c03028', 0.3), 'toadstool', segs=8)
    else:
        WL.heather(k, x, r, s=0.2, tone='#a03048')
for (x0, x1, r) in ((39.0, 40.6, 24.2), (47.2, 48.5, 13.8)):            # fallen pines (the Look Book's log)
    WL.log(k, x0, x1, r, 0.2, bark='#4a2e22', moss='#7a5a3a', seed=int(x0))
WL.leaf_litter(k, 37.5, 11.5, 50.5, 25.5, 260, ok=lambda x, r: (int(x), int(r)) in walk and pd(x, r) > 0.6,
               cols=('#7a3a24', '#8a4a2a', '#5a2e1e', '#9a5a32'), seed=812)                # needles and cones under the pines
for i, path in enumerate(PATHS):                                            # stones edging the paths
    WL.path_stones(k, path, tone='#5a5054', seed=820 + i)
SHRINE = (44.0, 16.5)
k.box(SHRINE[0] - 0.5, SHRINE[1] - 0.4, 0.0, SHRINE[0] + 0.5, SHRINE[1] + 0.4, 0.5, ('#5a5458', 0.22), 'shrine_base', bevel=0.03)
for zz in (0.12, 0.26, 0.4):                          # its stone courses
    k.box(SHRINE[0] - 0.51, SHRINE[1] + 0.39, zz, SHRINE[0] + 0.51, SHRINE[1] + 0.41, zz + 0.012, '#3a3438', 'shrine_joint')
k.cyl(SHRINE[0], SHRINE[1], 0.5, 0.62, 0.3, ('#2a2226', 0.2), 'shrine_bowl', verts=12)
WL.crystal_cluster(k, SHRINE[0], SHRINE[1], s=0.6, col=CRYSTAL, energy=12, z=0.62, seed=4401)
for (dx, dr) in ((-0.9, 0.0), (0.9, 0.0)):
    k.box(SHRINE[0] + dx - 0.12, SHRINE[1] + dr + 0.18, 0.0, SHRINE[0] + dx + 0.12, SHRINE[1] + dr + 0.42, 0.4, ('#5a5458', 0.22),
          'shrine_lamp', bevel=0.02)
    A.candle(k, SHRINE[0] + dx, SHRINE[1] + dr + 0.3, 0.4, energy=2.0)
for (dx, col) in ((-0.3, '#d0a048'), (0.05, '#c0c0c8'), (0.32, '#e8e0d0')):          # the offerings round the base
    k.cyl(SHRINE[0] + dx, SHRINE[1] + 0.52, 0.0, 0.02, 0.05, col, 'offering', verts=8)
k.solid(SHRINE[0] - 0.5, SHRINE[1] - 0.4, SHRINE[0] + 0.5, SHRINE[1] + 0.4)
EDGE = max(c for (c, r) in land - STACK if r == 27 and c > 40)      # the east shore, facing the stack
BR_A, BR_B = (EDGE + 0.85, 27.6), (50.3, 27.6)
I.rope_bridge(k, BR_A, BR_B)
BRIDGE_CELLS = [(c, 27) for c in range(EDGE + 1, 50)]
I.chest(k, 51.6, 27.6)
I.x_mark(k, 51.2, 28.6)
I.dead_tree(k, 52.3, 28.6, h=1.4, lean=-0.2)

# ---- the moor's vegetation: heather in drifts, gorse, boulders on the coast's lip ------------------------------------------
moor = lambda x, r: material(x, r) in ('moor', 'moor_dark', 'grass')
for _ in range(700):
    x, r = rng.uniform(4, 52), rng.uniform(10, 36)
    if (int(x), int(r)) in walk and moor(x, r) and pd(x, r) > 0.8 and math.hypot(x - TEETH[0], (r - TEETH[1]) * 1.2) > 2.6 \
            and math.hypot(x - TOWER[0], r - TOWER[1]) > 2.0 and math.hypot(x - CAMP[0], r - CAMP[1]) > 3.5 and x < 38:
        roll = rng.random()
        if roll < 0.55:                                                  # heather in drifts: a few mounds together
            for _ in range(rng.randint(2, 4)):
                WL.heather(k, x + rng.uniform(-0.45, 0.45), r + rng.uniform(-0.3, 0.3), s=rng.uniform(0.2, 0.34),
                           tone=rng.choice(('#c04878', '#d05a8a', '#a8386a', '#e070a0')))
        elif roll < 0.72:
            WL.shrub(k, x, r, s=rng.uniform(0.2, 0.3), tone='#4a5a2a', blooms='#f0c030')        # gorse in flower
        elif roll < 0.9:
            WL.fern(k, x, r, s=rng.uniform(0.45, 0.65), tone=rng.choice(('#a0562e', '#8a4a26', '#b06a34')))   # rusty bracken
        else:
            k.blades([(x + rng.uniform(-0.25, 0.25), r + rng.uniform(-0.15, 0.15), 0.0, rng.uniform(0.25, 0.42), 0.022,
                       rng.uniform(-0.08, 0.08), rng.uniform(-0.04, 0.04)) for _ in range(18)], ('#c0a060', 0.25), 'tuft')   # tall pale grass
LIP = []
for _ in range(500):
    x, r = rng.uniform(1, 55), rng.uniform(3, 40)
    z = terrain.z(x, r)
    if (int(x), int(r)) not in land and -0.03 < z <= 0.0 and abs(x - PX - 0.5) > 1.6 and not (r > 27 and 19 < x < 40) \
            and not (FJ[0] - 1 < x < FJ[0] + FLEN + 1 and FJ[1] - 1 < r < FJ[1] + 2) and not (EDGE - 1 < x < 53 and 26 < r < 29.5):
        LIP.append((x, r))
placed = []
for (x, r) in LIP:
    if len(placed) < 34 and all(math.hypot(x - a, r - b) > 2.3 for (a, b) in placed):
        placed.append((x, r))
        WL.boulder(k, x, r, s=rng.uniform(0.22, 0.42), tone='#4a4044', moss='#6a3a2e', z=-0.03, tufts='#8a4a3a', solid=False)

k.later.insert(0, lambda: WL.merge_parts(k))               # before the grass
k.later.append(lambda: WL.merge_parts(k))                  # and after it
WL.fast_top(k)                                             # the grass's rays: one BVH tree, not every object in turn

# ---- scatter: tufts and pebbles over the open ground --------------------------------------------------------------------
busy = lambda x, r: pd(x, r) < 0.6
I.tufts(k, [c for c in walk if material(c[0] + 0.5, c[1] + 0.5) in ('moor', 'moor_dark', 'grass', 'crystal_moss', 'ash_moor')],
        '#8a4a3a', per_cell=1.1, avoid=busy, flowers=0.3)
I.pebbles(k, walk, '#5a5054', per_cell=0.25, avoid=busy)

# ---- light ---------------------------------------------------------------------------------------------------------------
k.area_light(28.0, 18.0, 16.0, '#8090c8', 2600, 40.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.point_light(29.0, 24.0, 4.0, '#ffd8b0', 60, radius=1.5)

k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=96,
         world_light=('#3a2430', 0.75))

# ---- the world ----------------------------------------------------------------------------------------------------------
old = json.load(open(WORLD))
dock = next(i for i in old['interactions'] if i.get('label') == 'DOCK')
dock.update({'x': PX, 'y': pier_top})
spawn = [PX, pier_top - 1]
w = {'name': 'Crimson Reach', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': spawn}, 'moonColor': old.get('moonColor'), 'shipExit': old.get('shipExit', True),
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         dock,
         {'x': 30, 'y': 9, 'type': 'enter_world', 'target': 'lumar-crimson-cave', 'label': "DRAGON'S CAVE",
          'prompt': 'DESCEND INTO CAVE'},
         {'x': 29, 'y': 9, 'type': 'enter_world', 'target': 'lumar-crimson-cave', 'label': "DRAGON'S CAVE",
          'prompt': 'DESCEND INTO CAVE'},
         {'x': 31, 'y': 28, 'type': 'dialog', 'label': 'CRIMSON WATCHER', 'prompt': 'PRESS E TO TALK',
          'dialog': "YOU CAME BY THE GALLEON? THEN YOU'LL WANT THE PATH NORTH, PAST THE TEETH.\n\nDON'T GO DOWN THERE.\n\nTHE DRAGON DOESN'T MIND VISITORS, BUT IT'S NOT ALWAYS HUNGRY EITHER."},
         {'x': 31, 'y': 15, 'type': 'dialog', 'label': 'WARNING', 'prompt': 'PRESS E TO READ',
          'dialog': "WEATHERED SIGN:\n\n\"BEYOND THIS POINT - DRAGON'S CAVE.\nENTER WITH RESPECT.\""},
         {'x': 33, 'y': 31, 'type': 'dialog', 'label': "PIRATE'S LANTERN", 'prompt': 'PRESS E TO EXAMINE',
          'dialog': 'AN OLD LANTERN CARVED WITH SKULL MARKS, BURNING RED.\n\n"FOR THOSE WHO LIGHT THEIR OWN WAY HOME."'},
         {'x': 32, 'y': 12, 'type': 'dialog', 'label': 'CHARCOAL MARK', 'prompt': 'PRESS E TO READ',
          'dialog': 'CHARCOAL ON STONE:\n\n"DOWN THE STAIRS, BEAR LEFT, MIND THE LAVA.\n- H.M."'},
         {'x': 27, 'y': 33, 'type': 'dialog', 'label': 'OLD ROPE', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'FRAYED MOORING ROPE.\n\nSCORCH MARKS ALONG ONE END. SOMETHING BURNED IT.'},
         {'x': 30, 'y': 30, 'type': 'dialog', 'label': 'CAMPFIRE', 'prompt': 'PRESS E TO SIT',
          'dialog': 'DRIFTWOOD CRACKLES. SOMEONE HAS LEFT A POT OF SOMETHING THAT SMELLS LIKE RUM AND PEPPER.\n\nTHE SEA HUSHES BEHIND YOU.'},
         {'x': 34, 'y': 29, 'type': 'dialog', 'label': 'TENT', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'A HAMMOCK, A SEA CHEST, A CHART OF THE REEF WITH THE HERON\'S WRECK CIRCLED TWICE.'},
         {'x': 35, 'y': 18, 'type': 'dialog', 'label': 'THE TEETH', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'SEVEN STONES IN A RING, OLDER THAN THE PIRATES, OLDER THAN THE DRAGON.\n\nTHE RUNES ON EVERY OTHER STONE GLOW THE COLOUR OF THE CRYSTALS.'},
         {'x': 22, 'y': 17, 'type': 'dialog', 'label': 'WATCHTOWER', 'prompt': 'PRESS E TO CLIMB',
          'dialog': 'FROM THE BROKEN TOP YOU CAN SEE THE WHOLE REACH: THE CAMP, THE WRECK, THE PINES, THE STACK.\n\nAND SMOKE, RISING FROM THE RIDGE.'},
         {'x': 24, 'y': 14, 'type': 'dialog', 'label': 'GREAT RIBS', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'THE RIBS OF SOMETHING HUGE, BLEACHED WHITE.\n\nNOT THE DRAGON. SOMETHING IT ATE.'},
         {'x': 10, 'y': 27, 'type': 'dialog', 'label': 'GILDED HERON', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'A GALLEON BROKEN ON THE REEF, LISTING, HER SAILS ROTTED TO LACE.\n\nTHE NAME ON HER STERN, ONCE GILDED: THE HERON.\n\nHER HOLD STANDS OPEN TO THE SEA.'},
         {'x': 14, 'y': 21, 'type': 'dialog', 'label': 'CRYSTAL FIELD', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'SPORE CRYSTALS PUSH UP THROUGH THE MOSS, WARM TO THE TOUCH, HUMMING FAINTLY.\n\nTHEY ALL LEAN THE SAME WAY - TOWARD THE RIDGE.'},
         {'x': 44, 'y': 18, 'type': 'dialog', 'label': 'SHRINE', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'A STONE BOWL IN A CLEARING OF RED PINES, A CRYSTAL GROWING FROM IT. TWO CANDLES, STILL BURNING.\n\nOFFERINGS LIE AROUND IT: A BRASS BUTTON, A FISH HOOK, A CHILD\'S DRAWING OF A DRAGON.'},
         {'x': 51, 'y': 28, 'type': 'dialog', 'label': 'SEA CHEST', 'prompt': 'PRESS E TO OPEN',
          'dialog': 'A CHEST UNDER AN X, SCRATCHED INTO THE ROCK.\n\nINSIDE: A CHART OF THE REEF, A COMPASS THAT POINTS AT THE RIDGE, AND A NOTE - "THE HERON\'S CARGO IS STILL ABOARD. - H.M."'},
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER + BRIDGE_CELLS + FJET, scene_id='lumar-crimson',
            actors=[{'sheet': 'npc-watcher', 'x': 31, 'y': 28, 'facing': 'down'}], scene_extra={'backdrop': True})
w = json.load(open(WORLD))
for r in range(ROWS):                     # only the island is ground: no walking on the sea
    for c in range(COLS):
        if (c, r) not in walk and (c, r) not in PIER and (c, r) not in BRIDGE_CELLS and (c, r) not in FJET:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -2.0, COLS + 0.5, ROWS + 1.0]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('crimson done; pier', pier_top, 'ship row', SHIP_R, 'walkable', len(walk))
