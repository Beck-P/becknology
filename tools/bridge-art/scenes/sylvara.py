"""Sylvara — Elderglade, the wood elves' capital among the giant trees. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/sylvara.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/sylvara

Rebuilt to Look Book 2 (October 2026; the reference is dioramas/sylvara_brook.py, Elderglade Brook): the glade's floor
is land with shape — moss, leaf litter and dirt paths over a heightfield that swells round the old trees' feet; the
giants of the wood are gnarled trunks lofted from buttressed feet, roots diving into the moss, ivy and moss up their
near sides, under great crowns of leaf clumps that close over the top of the view, more trunks standing back in the
wood behind them. At the top of the glade the Great Tree, the queen's hall inside it (a tall arched door glowing gold,
round windows, a walkway ringing it with lanterns); elves' doors in two trunks. Dirt paths edged with stones and worn
flagstones wind down from the Great Tree past the bard on his stone seat and Mirelle's herb stall (a leaf-shingled
awning, drying herbs, her raised beds behind) to the landing ring in the south-east, a circle of dressed stone and
glowing runes. West, under a willow, the Moonwell: a round pool of pale silver-green light in a carved stone rim,
spilling over its lip into a brook that runs away south between real banks, through a little reedy pool with lilies,
crossed by stepping stones. Ferns, birches, saplings, bushes, mossy boulders, fallen logs with bracket fungi, red
toadstools and glowing mushrooms, flowers in clumps, pebbles, twigs and leaf litter everywhere.

The map is the glade as it was: every door, interaction, actor, walker's path and the landing ring where they were.

Queen Alyssara of the wood elves holds court in the Heartwood Hall (scenes/sylvara_hall.py), Beckolas her first sword
at her side.
"""
import json
import math
import os
import random
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, S, apply_world, shade  # noqa: E402
import assets_elves as E               # noqa: E402
import assets_ship as P                # noqa: E402
import assets_sylvara_rich as R        # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'sylvara'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 46, 34

k = Kit(COLS, ROWS, margin_top=3.2, margin_bottom=0.6, seed=403)
rng = k.rng
T0 = time.time()


def stage(what):
    print('[%5.0fs] %s' % (time.time() - T0, what), flush=True)


noise, smooth, line_dist, fbm = R.noise, R.smooth, R.line_dist, R.fbm

# ---- the plan (the map as it was) ------------------------------------------------------------------------------------
GT = (23.0, 3.6, 3.0)                                               # the Great Tree: centre x, row, radius
PX, PR = 38.6, 27.6                                                 # the landing ring
MW = (9.0, 19.0)                                                    # the Moonwell
BS = (17.5, 11.5)                                                   # the bard's seat
WS = (26.5, 15.4)                                                   # the waystone
HB = (34, 11)                                                       # Mirelle, at the east end of her stall
TRAILS = [[(23.0, 7.6), (23.6, 10.5), (25.5, 13.5), (28.5, 16.5), (32.5, 20.0), (36.4, 23.6)],
          [(24.4, 12.0), (20.5, 13.6), (16.0, 15.8), (12.6, 18.4), (10.6, 21.6)],
          [(28.5, 16.5), (30.4, 14.6), (31.8, 12.6)]]
PATHS = [R.spline(t) for t in TRAILS]
# the ways on (workstream F, added on top of the rebuild): east out of the glade into the Rootmarket, the elves' city on the
# forest floor (the Rootmarket's door is at (44, 18)), and south down to the Silverrun ((17, 31)) — js/worlds/sylvara.js
# JOINS. Their stones and lanterns are on their own dice and the wood's undergrowth is lifted off them afterwards
# (join_clear), so everything the rebuild placed stays where it was.
JOIN_TRAILS = [[(32.5, 20.0), (36.6, 19.3), (40.6, 18.7), (43.8, 18.6), (46.8, 18.6)],
               [(28.5, 16.5), (24.6, 20.4), (20.9, 24.1), (18.7, 27.7), (17.7, 31.0), (17.5, 35.6)]]
JOIN_PATHS = [R.spline(t) for t in JOIN_TRAILS]
GIANTS = [(7.0, 3.0, 1.7), (14.0, 4.6, 1.3), (33.0, 4.4, 1.5), (40.5, 3.0, 1.8), (2.2, 12.5, 1.3), (44.0, 13.5, 1.3),
          (2.6, 24.5, 1.4), (44.2, 22.0, 1.2), (12.0, 10.5, 1.0), (38.5, 11.0, 1.1), (5.0, 31.5, 1.2)]
DOORS = {0: math.pi / 2, 2: math.pi / 2}                            # elves' doors in these two trunks (facing you)
BACK = [(1.0, 0.2, 1.1), (10.6, -0.4, 0.9), (18.0, 0.0, 1.0), (28.6, -0.2, 1.0), (36.8, -0.4, 0.95), (45.2, 0.6, 1.2)]

# the brook: the Moonwell spills over its lip (south-west) and the water runs away south, through a little pool
BROOK = R.spline([(7.65, 20.4), (7.05, 21.3), (6.95, 22.2), (6.4, 23.5), (6.55, 24.8), (6.95, 26.2), (7.35, 27.6), (7.0, 29.0),
                  (7.65, 30.5), (7.55, 32.0), (8.05, 33.6), (8.3, 36.0)])
POOL = (6.95, 26.3, 1.45, 0.95)                                    # centre, half-width, half-height
WZ = -0.1                                                           # the water's surface
CROSS = (6.95, 22.0)                                                # stepping stones where Pip's run crosses it


def width(r):
    return max(0.3, min(0.46, 0.3 + 0.012 * (r - 20))) * (1 + 0.3 * (noise(r, 0.0, 0.9, 3) - 0.5))


def water_edge(x, r):
    """How far (x, r) lies outside the water's nominal edge (negative: in it)."""
    if x < 2.5 or x > 11.5 or r < 19.4:
        return 5.0
    e = line_dist(x, r, BROOK) - width(r)
    px, pr, ax, ar = POOL
    q = math.hypot((x - px) / ax, (r - pr) / ar)
    ep = (q - 1.0) * min(ax, ar) + 0.18 * (noise(x, r, 1.6, 21) - 0.5)
    return min(e, ep)


def path_d(x, r):
    return min(line_dist(x, r, p) for p in PATHS)


def base_z(x, r):
    z = 0.05 * (noise(x, r, 0.45, 11) - 0.5) + 0.025 * (noise(x, r, 1.9, 12) - 0.5)
    for (gx, gr, rad) in GIANTS + [GT]:                             # the ground swells round the old trees' feet
        d = math.hypot(x - gx, (r - gr) * 1.1)
        z += 0.26 * math.exp(-(d / (rad + 0.5)) ** 2)
    for (gx, gr, rad) in BACK:
        d = math.hypot(x - gx, (r - gr) * 1.1)
        z += 0.3 * math.exp(-(d / (rad + 0.8)) ** 2)
    z += 0.35 * smooth(1.6, -2.6, r)                                # the wood rising behind
    z += 0.18 * smooth(33.0, 35.0, r)                               # and a bank under the undergrowth at the front
    return z


def ground_z(x, r):
    b = base_z(x, r)
    e = water_edge(x, r)
    if e > 0.6:
        return b
    bed = WZ - 0.17
    return bed + (b - bed) * smooth(-0.18, 0.5, e)


class Land:
    z = staticmethod(ground_z)


R.use(Land)
gz = ground_z


def material(x, r):
    e = water_edge(x, r)
    if e < -0.06:
        return 'ground_bed'
    jit = 0.12 * (fbm(x, r, 2.0, 5) - 0.5)
    if e < 0.22 + jit:
        return 'ground_bank_stones' if noise(x, r, 4.2, 6) > 0.6 else 'ground_bank'
    if path_d(x, r) < 0.62 + 0.18 * (fbm(x, r, 1.5, 8) - 0.5):
        return 'path'
    if min(line_dist(x, r, p) for p in JOIN_PATHS) < 0.58 + 0.18 * (fbm(x, r, 1.5, 8) - 0.5):
        return 'path'
    n = fbm(x, r, 0.45, 7)
    under = min(math.hypot(x - gx, r - gr) - rad for (gx, gr, rad) in GIANTS + [GT])
    if under < 1.4 + 0.8 * fbm(x, r, 0.9, 17):                     # leaf litter piles up round the trunks
        return 'ground_litter'
    if n > 0.66:
        return 'ground_litter'
    if n < 0.36:
        return 'ground_moss_dark'
    return 'ground_moss'


ALB = {'ground_moss': ('#567a36', 0.3), 'ground_moss_dark': ('#4e7232', 0.3), 'ground_litter': ('#6a6838', 0.38),
       'path': ('#8a6c46', 0.34), 'ground_bank': ('#4c3c2c', 0.36), 'ground_bank_stones': ('#5c5446', 0.42),
       'ground_bed': ('#4a4a3c', 0.3)}
R.field(k, -0.5, -3.6, COLS + 0.5, ROWS + 1.0, 0.125, material, lambda x, r, key: ground_z(x, r), ALB)
R.field(k, 3.0, 19.0, 11.0, ROWS + 1.0, 0.0625,
        lambda x, r: (('pond_water' if math.hypot((x - POOL[0]) / POOL[2], (r - POOL[1]) / POOL[3]) < 1.35 else 'stream_water')
                      if water_edge(x, r) < 0.24 else None),
        lambda x, r, key: WZ, {'stream_water': ('#3a7088', 0.0), 'pond_water': ('#2e6078', 0.0)}, 'water')


# the grass: tufts over the moss, wherever the moss is what's on top — grown now, before the wood's thousands of parts
# are placed (k.top's rays slow down with every part), so it keeps out from under what will stand there by `avoid`
BOULDERS = [(15.0, 20.5, 0.5), (34.0, 16.5, 0.45), (25.5, 24.5, 0.55), (41.5, 24.0, 0.4), (11.5, 25.5, 0.5), (4.6, 8.2, 0.45),
            (19.5, 8.6, 0.35), (30.4, 30.4, 0.45), (43.0, 30.8, 0.5), (21.6, 27.0, 0.3)]
LOGS = [(14.5, 17.5, 26.6, 0.28), (24.4, 27.2, 30.6, 0.26), (41.2, 43.6, 9.6, 0.24)]


def under_things(x, r):
    for (gx, gr, rad) in GIANTS + BACK:
        if (x - gx) ** 2 + ((r - gr) / 0.92) ** 2 < (rad * 1.3) ** 2:
            return True
    if (x - GT[0]) ** 2 + (r - GT[1]) ** 2 < (GT[2] * 1.15) ** 2 or GT[0] - 1.4 < x < GT[0] + 1.4 and r < GT[1] + GT[2] + 1.0:
        return True
    if (x - MW[0]) ** 2 + (r - MW[1]) ** 2 < 1.7 ** 2 or (x - PX) ** 2 + (r - PR) ** 2 < 3.0 ** 2:
        return True
    if 30.5 < x < 34.1 and 10.9 < r < 11.9 or (29.3 < x < 30.95 or 35.05 < x < 36.7) and 8.3 < r < 9.5:
        return True
    if any((x - bx) ** 2 + (r - br) ** 2 < (s_ * 0.85) ** 2 for (bx, br, s_) in BOULDERS):
        return True
    if any(min(a, b) < x < max(a, b) and abs(r - lr) < rad for (a, b, lr, rad) in LOGS):
        return True
    return abs(x - BS[0] - 0.1) < 0.6 and abs(r - BS[1] + 0.2) < 0.5 or abs(x - WS[0]) < 0.35 and abs(r - WS[1]) < 0.25


stage('ground')
GRASS = ('ground_moss', 'ground_moss_dark', 'ground_litter')
W.meadow(k, '#567a36', area=(-0.5, -3.0, COLS + 0.5, ROWS + 0.6), ok=GRASS, density=0.75, flowers=0.7, h=(0.07, 0.15), avoid=under_things)


def wet(x, r, pad=0.3):
    return water_edge(x, r) < pad


def clear(x, r, pad=1.0):
    """Room for a plant or a stone: off the paths and the water, clear of the trunks and the glade's own things."""
    if path_d(x, r) < 0.6 + pad * 0.5 or wet(x, r, 0.25 + pad * 0.2):
        return False
    if (x - MW[0]) ** 2 + (r - MW[1]) ** 2 < 7.5 or (x - PX) ** 2 + (r - PR) ** 2 < 14 or (x - GT[0]) ** 2 + (r - GT[1]) ** 2 < 25:
        return False
    if 29.5 < x < 36.6 and 8.0 < r < 12.6 or (x - BS[0]) ** 2 + (r - BS[1]) ** 2 < 1.6 or (x - WS[0]) ** 2 + (r - WS[1]) ** 2 < 1.2:
        return False
    return all((x - gx) ** 2 + (r - gr) ** 2 > (rad + 0.9) ** 2 for (gx, gr, rad) in GIANTS)


stage('grass')

# ---- the paths: dirt edged with stones, worn flagstones set in it -----------------------------------------------------------
for p in PATHS:
    for (x, r, dx, dr) in R.along(p, 0.5):
        nx, nr = -dr, dx
        if rng.random() < 0.22:                                     # a flagstone, worn into the dirt
            o = rng.uniform(-0.2, 0.2)
            s = rng.uniform(0.2, 0.3)
            fx, fr = x + nx * o, r + nr * o
            k.rock(fx, fr, gz(fx, fr) - 0.004, s, s * rng.uniform(0.6, 0.85), 0.02, (shade('#948a74', rng.uniform(0.88, 1.06)), 0.3),
                   part='path_flagstone', segs=7, jitter=0.2)
        for side in (-1, 1):                                        # stones along its edges, now and then
            if rng.random() < 0.45:
                o = side * rng.uniform(0.6, 0.72)
                sx, sr = x + nx * o, r + nr * o
                s = rng.uniform(0.06, 0.12)
                k.rock(sx, sr, gz(sx, sr) + s * 0.25, s, s * 0.8, s * 0.55, (shade(R.STONE, rng.uniform(0.8, 1.15)), 0.3), part='path_stone', segs=7)
for t in TRAILS:                                                     # leaf lanterns along the paths, sides alternating
    side, acc = 1, 0.0
    for (pa, pb) in zip(t, t[1:]):
        L = math.hypot(pb[0] - pa[0], pb[1] - pa[1])
        while acc < L:
            f = acc / L
            nx, nr = -(pb[1] - pa[1]) / L, (pb[0] - pa[0]) / L
            R.lantern_post(k, pa[0] + (pb[0] - pa[0]) * f + nx * 1.3 * side, pa[1] + (pb[1] - pa[1]) * f + nr * 1.3 * side)
            side, acc = -side, acc + 4.2
        acc -= L


# ---- the Great Tree ---------------------------------------------------------------------------------------------------------
def great_tree(cx, cr, rad=3.0, h=8.4, door_w=1.3, door_h=2.0):
    """The Great Tree: the queen's hall is inside it. The oldest trunk in the wood, its door smooth-worn round a tall
    arched doorway glowing gold, gold leaves inlaid round the arch, ivy framing it, carved steps up to it, round windows
    lit above, a walkway ringing it with lanterns hung under. Returns the row of its front face."""
    R.ancient_trunk(k, cx, cr, rad, h - 1.2, seed=40, buttress=0.14, door=math.pi / 2, ivy=7, roots=14, moss=26, squash=1.0)
    R.branches(k, cx, cr, rad, h, 1.7)
    R.crown(k, cx, cr, h - 0.5, 1.75, dense=1.2)
    with k.foliage('leaf'):                                         # boughs leaning out over the top of the trunk
        for (dx, dr, dz, sz) in ((-1.4, 0.9, -1.7, 1.2), (1.5, 1.0, -1.5, 1.15), (0.1, 1.3, -1.2, 1.0), (-2.6, 0.6, -2.2, 0.9), (2.7, 0.5, -2.1, 0.95)):
            W.leafy_crown(k, cx + dx, cr + dr, h + dz, 1.3 * sz, 1.0 * sz, 0.8 * sz, shade(R.LEAF, rng.uniform(0.9, 1.08)), n=int(60 * sz * sz), part='canopy')
    front = cr + rad
    k.box(cx - door_w / 2 - 0.2, front - 0.35, -0.05, cx + door_w / 2 + 0.2, front + 0.06, door_h + 0.12, (R.BARK_D, 0.3), 'door_frame')
    k.cyl_y(cx, front - 0.35, front + 0.06, door_h - door_w / 2, door_w / 2 + 0.2, door_w / 2 + 0.2, (R.BARK_D, 0.3), 'door_frame', verts=24)
    k.box(cx - door_w / 2, front - 0.25, 0.0, cx + door_w / 2, front + 0.08, door_h - door_w / 2, '#6a4418', 'door_light', emit=('#ffc060', 1.8))
    k.cyl_y(cx, front - 0.25, front + 0.08, door_h - door_w / 2, door_w / 2, door_w / 2, '#6a4418', 'door_light', emit=('#ffc060', 1.8), verts=24)
    for i in range(3):                                              # the doors themselves, swung open inward: their edges
        for sx in (-1, 1):
            x = cx + sx * (door_w / 2 - 0.08)
            k.box(x - 0.05, front - 0.24, 0.0, x + 0.05, front + 0.0, door_h - door_w / 2 - 0.05, ('#6a4426', 0.3), 'door_leaf')
    zc, ra = door_h - door_w / 2, door_w / 2 + 0.3
    for i in range(1, 14):                                          # gold leaves round the arch
        a = math.pi * i / 14
        k.blob(cx + math.cos(a) * ra, front + 0.1, zc + math.sin(a) * ra, 0.07, 0.03, 0.11, (E.GOLD, 0.25), 'arch_leaf',
               rot=(0, a - math.pi / 2, 0), segs=6)
    for sx in (-1, 1):
        for zz in (0.35, 0.7, 1.05):
            k.blob(cx + sx * ra, front + 0.1, zz, 0.06, 0.03, 0.1, (E.GOLD, 0.25), 'arch_leaf', segs=6)
    with k.foliage('leaf'):                                         # ivy round the arch, heavier at the foot
        for j in range(44):
            a = rng.uniform(-0.25, math.pi + 0.25)
            rr = ra + rng.uniform(0.18, 0.42)
            z = zc + math.sin(a) * rr if 0 <= a <= math.pi else rng.uniform(0.1, zc)
            x = cx + math.cos(a) * rr if 0 <= a <= math.pi else cx + (1 if a < 0 else -1) * rr
            k.blob(x, front + 0.06, z, 0.09, 0.05, 0.08, (shade('#4a8038', rng.uniform(0.8, 1.2)), 0.25), 'ivy', rot=(0, 0, rng.uniform(0, 360)), segs=6)
    k.point_light(cx, front + 0.6, 1.0, '#ffc870', 30, radius=0.3)
    for i, (w, d) in enumerate(((door_w + 1.3, 0.5), (door_w + 0.85, 0.5))):     # steps up to it: stone, worn, mossy at the ends
        k.box(cx - w / 2, front - 0.1, -0.05, cx + w / 2, front + d * (2 - i), 0.12 * (i + 1), (shade('#9a8e78', 1 + 0.04 * i), 0.2), 'step')
        for sx in (-1, 1):
            k.blob(cx + sx * (w / 2 - 0.1), front + d * (2 - i) - 0.12, 0.12 * (i + 1), 0.16, 0.1, 0.04, (R.MOSS_L, 0.4), 'step_moss', segs=7)
    for sx in (-1, 1):                                              # lanterns on brackets either side of the door
        bx = cx + sx * (door_w / 2 + 0.55)
        k.tube((bx - sx * 0.25, front - 0.05, 1.75), (bx, front + 0.14, 1.82), 0.03, ('#3a3430', 0.2), 'bracket', verts=5)
        E.leaf_lantern(k, bx, front + 0.16, 1.58, s=0.12, energy=6.0)
    for (dx, z) in ((-1.6, 3.0), (1.7, 3.4), (-0.4, 4.6), (1.0, 5.6)):    # round windows, lit
        a = math.asin(max(-0.99, min(0.99, dx / rad)))
        wr = cr + math.cos(a) * rad * (1 - 0.05 * z / h)
        k.cyl_y(cx + dx, wr - 0.1, wr + 0.08, z, 0.32, 0.32, (R.BARK_D, 0.3), 'window_frame', verts=16)
        k.cyl_y(cx + dx, wr - 0.08, wr + 0.1, z, 0.23, 0.23, '#7a5420', 'window_light', emit=('#ffc870', 1.3), verts=16)
        k.box(cx + dx - 0.012, wr + 0.09, z - 0.23, cx + dx + 0.012, wr + 0.12, z + 0.23, (R.BARK_D, 0.3), 'window_bar')
        k.box(cx + dx - 0.23, wr + 0.09, z - 0.012, cx + dx + 0.23, wr + 0.12, z + 0.012, (R.BARK_D, 0.3), 'window_bar')
    k.cyl(cx, cr, 2.5, 2.62, rad + 0.7, (E.WOOD, 0.2), 'walkway', verts=48)   # the ring walkway, its rail, lanterns under it
    for i in range(48):                                             # its boards
        a = i / 48 * math.tau
        if math.sin(a) < -0.2:
            continue
        k.tube((cx + math.cos(a) * (rad + 0.05), cr + math.sin(a) * (rad + 0.05), 2.625),
               (cx + math.cos(a) * (rad + 0.7), cr + math.sin(a) * (rad + 0.7), 2.625), 0.012, (shade(E.WOOD, 0.7), 0.2), 'walkway_joint', verts=3, smooth=False)
    for i in range(12):
        a = i / 12 * math.tau
        if math.sin(a) < 0:
            continue
        k.tube((cx + math.cos(a) * rad, cr + math.sin(a) * rad, 1.9), (cx + math.cos(a) * (rad + 0.6), cr + math.sin(a) * (rad + 0.6), 2.5),
               0.05, (E.WOOD_D, 0.2), 'bracket', verts=5)
    for i in range(24):
        a = i / 24 * math.tau
        if math.sin(a) < -0.3:
            continue
        x, r = cx + math.cos(a) * (rad + 0.66), cr + math.sin(a) * (rad + 0.66)
        k.cyl(x, r, 2.62, 3.0, 0.03, (E.WOOD_D, 0.2), 'rail_post', verts=5)
        if i % 3 == 1 and math.sin(a) > 0.1:
            k.cyl(x, r, 2.2, 2.5, 0.006, (E.GOLD, 0.25), 'chain', verts=4)
            E.leaf_lantern(k, x, r, 2.12, s=0.11, energy=3.0)
    for i in range(40):
        a0, a1 = i / 40 * math.tau, (i + 1) / 40 * math.tau
        if math.sin(a0) < -0.3:
            continue
        k.tube((cx + math.cos(a0) * (rad + 0.66), cr + math.sin(a0) * (rad + 0.66), 3.0),
               (cx + math.cos(a1) * (rad + 0.66), cr + math.sin(a1) * (rad + 0.66), 3.0), 0.025, (E.WOOD_D, 0.2), 'rail', verts=5)
    k.solid(cx - rad, cr - rad, cx + rad, cr + rad)
    return front


front = great_tree(GT[0], GT[1], rad=GT[2])
R.lantern_post(k, 20.6, 8.4)
R.lantern_post(k, 25.0, 8.4)


# ---- giants of the wood, elves' doors in two of them -----------------------------------------------------------------------
def elf_door(cx, cr, rad, col='#7a5232', note=False):
    """A round-topped door in a giant's trunk (facing you): a dark frame, planks, iron bands, a gold ring, a round window
    lit above, lanterns on brackets either side, a flat stone step, ivy round the arch."""
    front = cr + rad * 0.92
    DW, DH = 0.8, 1.45
    k.box(cx - DW / 2 - 0.13, front - 0.36, -0.1, cx + DW / 2 + 0.13, front - 0.02, DH - DW / 2 + 0.05, (R.BARK_D, 0.3), 'door_frame')
    k.cyl_y(cx, front - 0.36, front - 0.02, DH - DW / 2 + 0.05, DW / 2 + 0.13, DW / 2 + 0.13, (R.BARK_D, 0.3), 'door_frame', verts=20)
    for i in range(4):
        x0 = cx - DW / 2 + i * DW / 4
        k.box(x0 + 0.01, front - 0.3, 0.0, x0 + DW / 4 - 0.01, front + 0.03, DH - DW / 2, (shade(col, 0.92 + 0.08 * (i % 2)), 0.3), 'door')
    k.cyl_y(cx, front - 0.3, front + 0.03, DH - DW / 2, DW / 2, DW / 2, (col, 0.3), 'door', verts=20)
    for zz in (0.28, DH - DW / 2 - 0.1):
        k.box(cx - DW / 2, front + 0.0, zz, cx + DW / 2, front + 0.05, zz + 0.045, ('#3a3430', 0.2), 'door_band')
    k.cyl_y(cx + DW * 0.28, front + 0.02, front + 0.07, 0.62, 0.045, 0.045, (E.GOLD, 0.2), 'door_knob', verts=10)
    k.cyl_y(cx, front - 0.25, front + 0.02, DH + 0.36, 0.2, 0.2, (R.BARK_D, 0.3), 'window_frame', verts=16)
    k.cyl_y(cx, front - 0.2, front + 0.04, DH + 0.36, 0.14, 0.14, '#7a5420', 'window_glow', emit=('#ffc870', 1.4), verts=16)
    k.box(cx - 0.012, front + 0.03, DH + 0.22, cx + 0.012, front + 0.06, DH + 0.5, (R.BARK_D, 0.3), 'window_bar')
    k.box(cx - 0.14, front + 0.03, DH + 0.345, cx + 0.14, front + 0.06, DH + 0.375, (R.BARK_D, 0.3), 'window_bar')
    k.box(cx - DW / 2 - 0.12, front - 0.05, -0.06, cx + DW / 2 + 0.12, front + 0.3, 0.08, (shade(R.STONE, 0.98), 0.3), 'step')
    for side in (-1, 1):
        bx = cx + side * (DW / 2 + 0.34)
        k.tube((bx - side * 0.18, front - 0.05, 1.22), (bx, front + 0.1, 1.28), 0.022, ('#3a3430', 0.2), 'bracket', verts=5)
        E.leaf_lantern(k, bx, front + 0.12, 1.08, s=0.09, energy=4.0)
    with k.foliage('leaf'):
        for j in range(24):
            a = j / 24 * math.pi
            x, z = cx + math.cos(a) * (DW / 2 + 0.24), DH - DW / 2 + math.sin(a) * (DW / 2 + 0.24)
            k.blob(x + rng.uniform(-0.05, 0.05), front + 0.02, z + rng.uniform(-0.05, 0.05), 0.08, 0.05, 0.07,
                   (shade('#4a8038', rng.uniform(0.8, 1.2)), 0.25), 'ivy', rot=(0, 0, rng.uniform(0, 360)), segs=6)
    if note:                                                         # a note pinned to it with a thorn
        k.box(cx - 0.13, front + 0.035, 0.72, cx + 0.09, front + 0.045, 0.98, ('#ece4cc', 0.2), 'note')
        k.tube((cx - 0.02, front + 0.03, 0.94), (cx - 0.02, front + 0.12, 0.92), 0.012, ('#5a3a22', 0.3), 'thorn', rb=0.002, verts=4)
    return front


for i, (x, r, rad) in enumerate(GIANTS):
    R.giant(k, x, r, rad, rng.uniform(7.0, 8.0), seed=i, door=DOORS.get(i))
    k.solid(x - rad, r - rad, x + rad, r + rad)
elf_door(7.0, 3.0, 1.7)
elf_door(33.0, 4.4, 1.5, col='#5a3e2a', note=True)
# by the first door: a bench of a split log, pots of herbs, a broom; by the second, a woodpile against the trunk
k.box(8.45, 4.62, 0.0, 9.55, 4.98, 0.3, ('#7a5a3e', 0.3), 'bench_seat')
for bx in (8.6, 9.4):
    k.box(bx - 0.05, 4.68, -0.05, bx + 0.05, 4.92, 0.26, (R.BARK_D, 0.3), 'bench_leg')
k.solid(8.4, 4.6, 9.6, 5.0)
for (px, pr, c) in ((5.75, 4.75, '#c87a4a'), (6.0, 5.0, '#b06a40')):
    k.cyl(px, pr, gz(px, pr), gz(px, pr) + 0.18, 0.1, (c, 0.3), 'pot', verts=10)
    with k.foliage('leaf'):
        W.leafy_crown(k, px, pr, gz(px, pr) + 0.28, 0.14, 0.12, 0.12, '#5a9a40', part='pot_herb', sprigs=False)
k.tube((5.5, 4.55, 0.0), (5.42, 4.5, 0.95), 0.015, ('#9a7a4a', 0.3), 'broom', verts=5)
k.cone(5.5, 4.55, 0.0, 0.22, 0.07, 0.02, ('#c8a860', 0.3), 'broom_head', verts=8)
for j in range(3):                                                   # the woodpile
    for i in range(5 - j):
        lx = 29.7 + i * 0.2 + j * 0.1
        k.cyl_y(lx, 5.5, 6.1, 0.09 + j * 0.17, 0.085, 0.085, (shade('#8a6a44', rng.uniform(0.85, 1.1)), 0.3), 'woodpile', verts=8)
        k.cyl_y(lx, 6.1, 6.12, 0.09 + j * 0.17, 0.07, 0.07, ('#c8a070', 0.3), 'woodpile_end', verts=8)
k.solid(29.6, 5.5, 30.7, 6.15)

# trunks standing back in the wood, closing it in behind the giants
for i, (x, r, rad) in enumerate(BACK):
    R.giant(k, x, r, rad, rng.uniform(5.6, 6.6), seed=20 + i, dense=0.55, crown_tone='#3a6630', ivy=1, roots=7, moss=5)


# ---- the Moonwell under its willow (west), spilling into the brook ---------------------------------------------------------
def moonwell(cx, cr, rad=1.3, spill=3 * math.pi / 4):
    """The Moonwell: a round pool of pale silver-green light in a wall of dressed stone, coping stones round its rim with
    runes glowing in them, moss in the joints; one stone is missing at `spill`, where the water runs over the lip."""
    W.annulus(k, cx, cr, rad - 0.02, rad + 0.3, -0.3, 0.2, (shade(E.STONE, 1.1), 0.25), 'well_wall', segs=40)
    for c in range(2):                                              # courses of the wall: a dark joint
        k.cyl(cx, cr, 0.04 + c * 0.08, 0.05 + c * 0.08, rad + 0.305, (shade(E.STONE, 0.7), 0.3), 'well_joint', verts=40)
    k.cyl(cx, cr, -0.3, 0.24, rad, '#1e4c48', 'well_water', verts=40)               # Look Book water: the willow, the stars, the lamps in it
    k.cyl(cx, cr, 0.24, 0.246, rad * 0.22, '#1e4a44', 'well_glow', emit=(E.MOON, 0.45), verts=24)   # its heart (small: a wide glow blooms white)
    n = 16
    for i in range(n):
        a0, a1 = (i + 0.04) / n * math.tau, (i + 0.96) / n * math.tau
        mid = (a0 + a1) / 2
        if abs(math.atan2(math.sin(mid - spill), math.cos(mid - spill))) < math.pi / n:
            continue                                                # the lip
        ring = []
        for (rr, z) in ((rad - 0.06, 0.2), (rad - 0.06, 0.28), (rad + 0.36, 0.28), (rad + 0.36, 0.2)):
            ring.append([(cx + math.cos(a0 + (a1 - a0) * t) * rr, cr + math.sin(a0 + (a1 - a0) * t) * rr, z) for t in (0, 0.25, 0.5, 0.75, 1)])
        rings = [[ring[q][t] for q in range(4)] for t in range(5)]
        k.loft(rings, (shade(E.STONE, rng.uniform(1.05, 1.22)), 0.22), 'well_coping', closed=True)
        if math.sin(mid) > -0.3:
            if i % 2 == 0:                                          # a rune on the stone's face
                rx, rr_ = cx + math.cos(mid) * (rad + 0.37), cr + math.sin(mid) * (rad + 0.37)
                k.box(rx - 0.04, rr_ - 0.015, 0.22, rx + 0.04, rr_ + 0.015, 0.26, E.MOON, 'rune', emit=(E.MOON, 2.0))
            if rng.random() < 0.5:
                mx, mr = cx + math.cos(a1) * (rad + 0.15), cr + math.sin(a1) * (rad + 0.15)
                k.blob(mx, mr, 0.28, 0.1, 0.07, 0.03, (R.MOSS_L, 0.4), 'coping_moss', segs=6)
    sx, sr = cx + math.cos(spill) * (rad + 0.15), cr + math.sin(spill) * (rad + 0.15)
    k.box(sx - 0.2, sr - 0.06, 0.17, sx + 0.2, sr + 0.06, 0.2, (shade(E.STONE, 1.2), 0.2), 'well_lip')
    strands = []                                                    # the water running over the lip into the brook
    tx, tr = cx + math.cos(spill) * (rad + 0.55), cr + math.sin(spill) * (rad + 0.55)
    for i in range(6):
        o = (i - 2.5) * 0.06
        ox, orr = -math.sin(spill) * o, math.cos(spill) * o
        strands.append(((sx + ox - 0.02, sr + orr, 0.24), (sx + ox + 0.02, sr + orr, 0.24), (tx + ox * 1.3 + 0.02, tr + orr * 1.3, WZ + 0.01),
                        (tx + ox * 1.3 - 0.02, tr + orr * 1.3, WZ + 0.01)))
    k.quads(strands[0::2], ('#c6ece6', 0.15), 'falls', )
    k.quads(strands[1::2], ('#90c8c0', 0.15), 'falls_shade')
    for _ in range(10):
        s = rng.uniform(0.04, 0.09)
        k.blob(tx + rng.uniform(-0.2, 0.2), tr + rng.uniform(-0.1, 0.2), WZ + 0.01, s, s * 0.8, 0.02, ('#eef6f6', 0.15), 'foam', segs=7)
    k.point_light(cx, cr, 1.1, E.MOON, 16, radius=0.6)
    k.solid(cx - rad - 0.25, cr - rad - 0.25, cx + rad + 0.25, cr + rad + 0.25)


def willow(cx, cr, h=3.4, toward=1.0):
    """A weeping willow: a gnarled leaning trunk, a crown of pale leaf clumps, and its curtain of fronds — strands of
    narrow leaves hanging to the ground, trailing in the water. The same reach as E.willow (the keepsake hangs on it)."""
    top = (cx + 0.5 * toward, cr, h * 0.8)
    k.tube((cx, cr, -0.05), (cx + 0.25 * toward, cr, h * 0.45), 0.2, (R.BARK, 0.3), 'willow_trunk', rb=0.15, verts=9)
    k.tube((cx + 0.25 * toward, cr, h * 0.45), top, 0.15, (R.BARK, 0.3), 'willow_trunk', rb=0.09, verts=8)
    for (a, L) in ((2.2, 0.7), (0.4, 0.8), (4.0, 0.6)):
        k.tube((cx + 0.25 * toward, cr, h * 0.5), (top[0] + math.cos(a) * L, cr + math.sin(a) * L * 0.8, h * 0.8), 0.07, (R.BARK, 0.3),
               'willow_limb', rb=0.04, verts=6)
    for i in range(5):
        a = rng.uniform(0, math.tau)
        k.tube((cx + math.cos(a) * 0.15, cr + math.sin(a) * 0.12, 0.3), (cx + math.cos(a) * 0.6, cr + math.sin(a) * 0.5, gz(cx, cr) - 0.05), 0.08,
               (shade(R.BARK, 0.9), 0.3), 'root', rb=0.03, verts=6)
    with k.foliage('leaf'):
        for (dx, dr, dz, s) in ((0, 0, 0.92, 1.25), (-0.7, 0.2, 0.82, 0.85), (0.8, 0.1, 0.84, 0.95), (0.1, -0.5, 0.98, 0.8)):
            W.leafy_crown(k, top[0] + dx, cr + dr, h * dz, s, s * 0.85, s * 0.5, shade('#78a84c', rng.uniform(0.9, 1.04)), part='willow_crown')
        tones = {t: [] for t in ('#7aa850', '#8cbc5a', '#6a9a44', '#a0c868')}
        for i in range(130):                                        # the curtain: strands of narrow leaves
            a = i / 130 * math.tau + rng.uniform(-0.03, 0.03)
            d = rng.uniform(0.6, 1.7)
            x0, r0 = top[0] + math.cos(a) * d, cr + math.sin(a) * d * 0.8
            z1 = rng.uniform(0.05, 0.5) if rng.random() < 0.6 else rng.uniform(0.5, 1.4)
            z0 = h * rng.uniform(0.8, 0.95) - (1.7 - d) * 0.4
            tone = rng.choice(list(tones))
            m = int((z0 - z1) / 0.085)
            for j in range(m):
                t = j / max(1, m - 1)
                x, r, z = x0 + math.cos(a) * 0.16 * t, r0 + math.sin(a) * 0.13 * t, z0 - (z0 - z1) * t
                lean = 0.05 * math.sin(j * 1.7 + i)
                tones[tone].append((x, r + 0.02, z, -0.16, 0.055, lean, 0.0))
        for tone, items in tones.items():
            k.blades(items, (tone, 0.3), 'frond')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


moonwell(MW[0], MW[1], rad=1.3)
willow(7.0, 16.4, h=3.4, toward=1.0)
with k.variant('willow', 'lit'):                                     # up for good once Beckolas has said it (js/worlds/sylvara.js)
    KEEPSAKE = E.willow_keepsake(k, 7.0, 16.4, h=3.4, toward=1.0)
for (x, r) in ((5.4, 20.6), (12.4, 17.2), (11.6, 21.0), (5.6, 17.6)):
    R.mushroom_ring(k, x, r, n=5, glow=True, col=E.MOON)
R.flowers(k, 4.0, 15.0, 14.0, 23.5, 40, ok=lambda x, r: clear(x, r, 0.2) or (x - MW[0]) ** 2 + (r - MW[1]) ** 2 > 3.6 and not wet(x, r) and path_d(x, r) > 0.7,
          cols=('#f0f0f0', '#c8a8f0', '#e4d4ff', '#a8e0d8'))

# the brook's banks: stones in the shallows, reeds, the pool's lilies, stepping stones where Pip crosses
for (x, r, dx, dr) in R.along(BROOK, 0.7):
    if r < 20.8:
        continue
    for side in (-1, 1):
        if rng.random() < 0.5:
            w = width(r)
            sx, sr = x - dr * side * (w * rng.uniform(0.7, 1.05)), r + dx * side * (w * rng.uniform(0.7, 1.05))
            s = rng.uniform(0.09, 0.17)
            k.rock(sx, sr, WZ + 0.01, s, s * 0.8, 0.07, (shade('#9a988a', rng.uniform(0.88, 1.1)), 0.3), part='stone', segs=8)
for (x, r) in ((6.0, 23.0), (7.6, 24.4), (5.4, 25.6), (8.4, 26.9), (6.0, 27.4), (8.2, 28.6), (6.5, 30.2), (8.6, 31.6), (7.0, 33.0)):
    e = water_edge(x, r)
    if -0.1 < e < 0.4:
        R.reeds(k, x, r, n=rng.randint(6, 9))
for (x, r, f) in ((6.3, 26.0, '#f4e8f0'), (7.6, 26.6, None), (6.9, 25.7, None), (7.3, 25.9, '#f0d8e8'), (5.9, 26.5, None)):
    R.lily(k, x, r, WZ + 0.005, s=rng.uniform(0.1, 0.15), flower=f)
for (x, r, s) in ((6.25, 21.85, 0.24), (6.75, 21.95, 0.22), (7.25, 22.05, 0.24), (7.75, 22.15, 0.21)):
    k.rock(x, r, WZ + 0.02, s, s * 0.85, 0.13, (shade('#8a887a', rng.uniform(0.9, 1.08)), 0.3), part='stepping_stone', segs=10, jitter=0.1)
    k.blob(x - 0.05, r - 0.04, WZ + 0.13, s * 0.5, s * 0.38, 0.035, (R.MOSS_L, 0.35), 'stone_moss', segs=7)
R.pebbles(k, 4.0, 20.0, 10.5, ROWS + 0.5, 90, ok=lambda x, r: -0.05 < water_edge(x, r) < 0.45)

# ---- the bard on his stone seat, by the path -------------------------------------------------------------------------------
k.rock(BS[0], BS[1], gz(*BS), 0.5, 0.36, 0.45, ('#7a7a6a', 0.3), part='bard_seat', segs=10)
k.blob(BS[0], BS[1], gz(*BS) + 0.43, 0.44, 0.32, 0.05, ('#6a8a4a', 0.4), 'seat_moss', segs=10)
k.rock(BS[0] + 0.1, BS[1] - 0.42, gz(*BS), 0.62, 0.22, 0.9, ('#6e6e60', 0.3), part='seat_back', segs=10)      # a standing stone behind
k.blob(BS[0] + 0.1, BS[1] - 0.45, gz(*BS) + 0.95, 0.42, 0.2, 0.1, (R.MOSS_L, 0.4), 'seat_moss', segs=9)
E.harp(k, BS[0] + 0.75, BS[1] + 0.05, z=gz(*BS))
for i in range(3):                                                   # scrolls of songs at his feet
    k.cyl_x(BS[0] - 0.95 + i * 0.05, BS[0] - 0.62 + i * 0.05, BS[1] + 0.2 + i * 0.08, 0.04 + (0.07 if i == 2 else 0), 0.04, 0.04, ('#ece0c0', 0.25), 'scroll', verts=8)
k.solid(BS[0] - 0.5, BS[1] - 0.4, BS[0] + 1.0, BS[1] + 0.4)

# ---- a waystone where the paths meet ---------------------------------------------------------------------------------------
k.rock(WS[0], WS[1], 0.0, 0.34, 0.24, 1.15, ('#8a8a7a', 0.3), part='waystone', segs=9)
k.blob(WS[0] - 0.04, WS[1] - 0.02, 1.08, 0.28, 0.2, 0.1, (R.MOSS_L, 0.4), 'waystone_moss', segs=8)
for z in (0.42, 0.72):
    k.blob(WS[0], WS[1] + 0.22, z, 0.12, 0.02, 0.06, E.MOON, 'waystone_leaf', emit=(E.MOON, 1.2), segs=6)
k.cyl(WS[0] + 0.3, WS[1] + 0.32, 0.0, 0.06, 0.09, ('#9a8a6a', 0.3), 'offering_bowl', verts=10)          # flowers left at its foot
for j in range(4):
    k.sphere(WS[0] + 0.24 + j * 0.04, WS[1] + 0.3, 0.07, 0.03, 0.02, rng.choice(('#f0f0f0', '#c8a8f0', '#f0d870')), 'flower', segs=5)
k.solid(26, 15, 27, 16)


# ---- the herbalist's stall (east), her beds behind it ----------------------------------------------------------------------
def herb_stall(x0, x1, cr):
    """Mirelle's table under a leaf-shingled awning: boards on carved legs, a green runner, jars and bottles, bowls of
    leaves, a mortar, bundles of herbs drying from the beam, a slate with a gold leaf painted on it, baskets."""
    for i in range(6):                                               # the top, in boards
        bx0 = x0 + (x1 - x0) * i / 6
        k.box(bx0 + 0.005, cr - 0.3, 0.72, bx0 + (x1 - x0) / 6 - 0.005, cr + 0.3, 0.8, (shade(E.WOOD, rng.uniform(0.9, 1.08)), 0.2), 'stall_top')
    k.box(x0 + 0.3, cr + 0.25, 0.5, x1 - 0.3, cr + 0.32, 0.805, ('#2a5a2e', 0.3), 'stall_cloth')
    for i in range(int((x1 - x0 - 0.6) / 0.24)):                       # its leaf-cut hem
        k.blob(x0 + 0.42 + i * 0.24, cr + 0.32, 0.5, 0.08, 0.02, 0.06, ('#d0a040', 0.25), 'stall_cloth_leaf', segs=6)
    for x in (x0 + 0.1, x1 - 0.1):
        for r in (cr - 0.22, cr + 0.22):
            k.cyl(x, r, 0.0, 0.72, 0.045, (E.WOOD_D, 0.2), 'stall_leg', verts=8)
        k.cyl(x, cr - 0.3, 0.0, 1.95, 0.045, (E.WOOD_D, 0.2), 'stall_pole', verts=8)
        k.cyl(x, cr + 0.4, 0.0, 1.62, 0.04, (E.WOOD_D, 0.2), 'stall_pole', verts=8)
        k.blob(x, cr - 0.3, 1.97, 0.07, 0.05, 0.1, (E.GOLD, 0.25), 'pole_leaf', segs=6)
    k.cyl_x(x0 - 0.1, x1 + 0.1, cr + 0.42, 1.6, 0.035, 0.035, (E.WOOD_D, 0.2), 'stall_beam', verts=8)
    shingles = {}                                                    # the awning: courses of leaves, each lapping the one below
    for row in range(6):
        t0, t1 = row / 6, (row + 1.35) / 6
        r0, r1 = cr - 0.5 + 0.98 * t0, cr - 0.5 + 0.98 * t1
        z0, z1 = 1.96 - 0.36 * t0, 1.96 - 0.36 * t1
        x = x0 - 0.2 + (0.1 if row % 2 else 0)
        while x < x1 + 0.2:
            w = rng.uniform(0.2, 0.26)
            tone = rng.choice(('#3e6e34', '#4a7a3a', '#5a8e40', '#3e6e34', '#7a8a3a'))
            shingles.setdefault(tone, []).append(((x, r0, z0 + 0.02), (x + w, r0, z0 + 0.02), (x + w * 0.8, r1, z1 + 0.005), (x + w * 0.5, r1 + 0.06, z1),))
            x += w * 0.9
    for tone, qs in shingles.items():
        k.quads(qs, (tone, 0.3), 'roof_leaves')
    x = x0 + 0.22
    while x < x1 - 0.1:                                              # herbs drying from the beam
        k.cyl(x, cr + 0.42, 1.36, 1.6, 0.004, ('#c8b080', 0.3), 'string', verts=3)
        k.blob(x, cr + 0.42, 1.28, 0.06, 0.05, 0.14, (rng.choice(('#6a8a3a', '#8a7a3a', '#9a5a6a', '#7a9a5a')), 0.3), 'herb_bundle', segs=6)
        x += 0.24
    x = x0 + 0.2
    while x < x1 - 0.15:                                             # on the table
        kind = rng.choice(('jar', 'jar', 'bottle', 'bowl', 'bundle'))
        if kind == 'jar':
            k.cyl(x, cr - 0.05, 0.8, 0.98, 0.065, rng.choice(('#6a9a8a', '#9a7a5a', '#8a6a9a', '#a8b0a0')), 'jar', verts=10)
            k.cyl(x, cr - 0.05, 0.98, 1.01, 0.05, ('#8a6a44', 0.3), 'jar_lid', verts=10)
        elif kind == 'bottle':
            c = rng.choice(('#4a8a6a', '#6a4a8a', '#8a5a3a'))
            k.cyl(x, cr - 0.05, 0.8, 0.95, 0.05, (c, 0.15), 'bottle', verts=10)
            k.cone(x, cr - 0.05, 0.95, 1.05, 0.05, 0.018, (c, 0.15), 'bottle', verts=8)
        elif kind == 'bowl':
            k.cone(x, cr - 0.02, 0.8, 0.88, 0.05, 0.1, ('#9a7448', 0.3), 'bowl', verts=12)
            k.blob(x, cr - 0.02, 0.88, 0.085, 0.07, 0.03, (rng.choice(('#6a9a48', '#c8a8f0', '#d8b860')), 0.3), 'bowl_leaves', segs=7)
        else:
            k.cyl_x(x - 0.1, x + 0.1, cr + 0.05, 0.84, 0.04, 0.04, ('#7a9a5a', 0.3), 'herb_bundle', verts=7)
        x += rng.uniform(0.2, 0.3)
    k.cyl(x1 - 0.35, cr + 0.1, 0.8, 0.88, 0.07, ('#8a8a7a', 0.3), 'mortar', verts=10)
    k.tube((x1 - 0.35, cr + 0.1, 0.84), (x1 - 0.28, cr + 0.15, 0.98), 0.015, ('#9a9a8a', 0.3), 'pestle', verts=5)
    k.box(x0 - 0.18, cr + 0.38, 1.0, x0 + 0.18, cr + 0.42, 1.36, ('#3a3a40', 0.2), 'stall_sign')                 # the slate
    k.blob(x0, cr + 0.43, 1.18, 0.09, 0.01, 0.12, (E.GOLD, 0.25), 'sign_leaf', segs=6)
    k.cyl(x0 - 0.12, cr + 0.4, 1.36, 1.6, 0.005, ('#3a3430', 0.2), 'chain', verts=3)
    k.cyl(x0 + 0.12, cr + 0.4, 1.36, 1.6, 0.005, ('#3a3430', 0.2), 'chain', verts=3)
    for (bx, br) in ((x0 - 0.45, cr - 0.05), (x0 - 0.3, cr + 0.25)):    # baskets at the west end
        k.cyl(bx, br, 0.0, 0.2, 0.14, ('#b08a50', 0.3), 'basket', verts=12)
        k.blob(bx, br, 0.2, 0.12, 0.1, 0.05, (rng.choice(('#6a9a48', '#c8a8f0')), 0.3), 'basket_herbs', segs=8)
    k.solid(x0, cr - 0.4, x1, cr + 0.4)
    k.solid(x0 - 0.6, cr - 0.2, x0, cr + 0.4)


herb_stall(31.2, 34.0, 11.4)
R.lantern_post(k, 35.0, 12.4)
for (bx0, bx1) in ((29.3, 30.95), (35.05, 36.7)):                      # her raised beds behind, wattle round herbs and moonflowers
    br0, br1 = 8.3, 9.5
    for i in range(int((bx1 - bx0) / 0.12) + 1):
        x = bx0 + i * 0.12
        for r in (br0, br1):
            k.cyl(x, r, -0.02, 0.24, 0.022, ('#7a5a3a', 0.3), 'wattle', verts=5)
    for r_ in (br0, br1):
        k.box(bx0, r_ - 0.03, 0.06, bx1, r_ + 0.03, 0.2, ('#8a6a44', 0.3), 'wattle_weave')
    for x in (bx0, bx1):
        k.box(x - 0.03, br0, 0.06, x + 0.03, br1, 0.2, ('#8a6a44', 0.3), 'wattle_weave')
    k.box(bx0 + 0.04, br0 + 0.04, 0.0, bx1 - 0.04, br1 - 0.04, 0.18, ('#4a3626', 0.4), 'bed_soil')
    for i in range(int((bx1 - bx0) / 0.3)):
        for j in range(3):
            hx, hr = bx0 + 0.18 + i * 0.3, br0 + 0.25 + j * 0.35
            tone = rng.choice(('#5a9a40', '#7a9a5a', '#4a8a5a'))
            with k.foliage('leaf'):
                W.leafy_crown(k, hx, hr, 0.27, 0.12, 0.1, 0.1, tone, n=12, part='herb', sprigs=False)
            if rng.random() < 0.45:
                k.sphere(hx + 0.04, hr + 0.02, 0.37, 0.03, 0.025, rng.choice(('#c8a8f0', '#f0f0f0', '#8a6ab8')), 'flower', segs=5)
    k.solid(bx0, br0, bx1, br1)


# ---- the landing ring: a circle of dressed stone, mossy joints, glowing runes ------------------------------------------------
def landing_ring(cx, cr):
    k.cyl(cx, cr, -0.2, 0.012, 3.05, ('#4a6a3a', 0.35), 'pad_moss', verts=64)
    n = 28
    for (ri, ro, z, tone) in ((2.42, 2.95, 0.035, '#86867a'), (1.5, 2.36, 0.03, '#7e7e72')):
        m = n if ri > 2 else 20
        off = rng.uniform(0, 1)
        for i in range(m):
            a0, a1 = (i + off + 0.03) / m * math.tau, (i + off + 0.97) / m * math.tau
            ring = []
            for (rr, zz) in ((ri, 0.0), (ri, z), (ro, z), (ro, 0.0)):
                ring.append([(cx + math.cos(a0 + (a1 - a0) * t) * rr, cr + math.sin(a0 + (a1 - a0) * t) * rr, zz) for t in (0, 0.33, 0.67, 1)])
            k.loft([[ring[q][t] for q in range(4)] for t in range(4)], (shade(tone, rng.uniform(0.88, 1.1)), 0.3), 'pad_flagstone', closed=True)
    for i in range(14):                                              # the middle: flagstones laid crazy-paving, moss between
        a, d = rng.uniform(0, math.tau), math.sqrt(rng.uniform(0, 1)) * 1.1
        s = rng.uniform(0.3, 0.42)
        k.rock(cx + math.cos(a) * d, cr + math.sin(a) * d, 0.012, s, s * rng.uniform(0.7, 0.95), 0.02, (shade('#8a8a7e', rng.uniform(0.86, 1.08)), 0.3),
               part='pad_flagstone', segs=8, jitter=0.12)
    k.cyl(cx, cr, 0.012, 0.03, 1.46, ('#7a7a6e', 0.3), 'pad_flagstone', verts=64)
    for i in range(16):                                              # runes round the outer ring
        a = i * math.tau / 16
        x, r = cx + math.cos(a) * 2.68, cr + math.sin(a) * 2.68
        k.box(x - 0.07, r - 0.03, 0.035, x + 0.07, r + 0.03, 0.045, E.MOON, 'pad_rune', emit=(E.MOON, 1.6))
    for i in range(6):                                               # and a leaf at each lantern's foot
        a = i * math.tau / 6 + 0.3
        x, r = cx + math.cos(a) * 2.05, cr + math.sin(a) * 2.05
        k.blob(x, r, 0.04, 0.16, 0.06, 0.008, E.MOON, 'pad_rune', emit=(E.MOON, 1.2), rot=(0, 0, math.degrees(a) + 90), segs=8)
    for i in range(40):                                              # moss creeping over the stones' edges
        a, d = rng.uniform(0, math.tau), rng.choice((1.48, 2.39, 2.96))
        s = rng.uniform(0.06, 0.14)
        k.blob(cx + math.cos(a) * d, cr + math.sin(a) * d, 0.035, s, s * 0.7, 0.012, (shade(R.MOSS, rng.uniform(0.9, 1.15)), 0.4), 'pad_moss', segs=6)


landing_ring(PX, PR)
for i in range(6):
    a = i * math.tau / 6 + 0.3
    R.lantern_post(k, PX + math.cos(a) * 3.3, PR + math.sin(a) * 3.3, h=1.4, energy=10)
with k.variant('shuttle', 'parked'):
    P.shuttle(k, PX - 1.7, PR - 0.1)
k.solid(PX - 1.8, PR - 1.1, PX + 2.0, PR + 0.9)

# ---- the wood: birches, saplings, boulders, logs, then the ferns and the floor's small things --------------------------------
for (x, r) in ((11.0, 8.5), (16.5, 7.8), (29.0, 8.4), (37.0, 9.0), (6.0, 9.5), (39.5, 15.5), (17.0, 25.0), (25.0, 27.5),
               (20.5, 29.5), (10.5, 28.5), (13.5, 29.0), (29.5, 22.5), (41.0, 18.5), (19.0, 20.0), (35.0, 17.0)):
    if clear(x, r, 0):
        R.birch(k, x, r, h=rng.uniform(2.8, 3.8))
for (x, r) in ((15.0, 9.0), (27.5, 9.5), (9.5, 12.0), (36.0, 14.5), (22.0, 23.5), (31.5, 27.0), (15.5, 31.0), (27.5, 31.5), (42.0, 16.5)):
    if clear(x, r, 0):
        R.sapling(k, x, r, h=rng.uniform(1.1, 1.6))
        k.solid_post(x, r)
for (x, r, s_) in BOULDERS:
    R.boulder(k, x, r, s_)
for (x0, x1, lr, rad) in LOGS:
    R.log(k, x0, x1, lr, rad)

# glowing mushrooms and spores for the night, red toadstools by day
for _ in range(22):
    x, r = rng.uniform(1.5, COLS - 1.5), rng.uniform(6.0, ROWS - 2.0)
    if clear(x, r, 0.4):
        R.mushroom_ring(k, x, r, n=rng.randint(3, 5), glow=rng.random() < 0.6, col=rng.choice((E.MOON, '#a0c0ff', '#e0b0ff', R.SPORE)), light=2.0)
for _ in range(30):
    x, r = rng.uniform(1.0, COLS - 1.0), rng.uniform(5.0, ROWS - 1.0)
    if clear(x, r, 0.2):
        R.glow_spores(k, x, r, n=rng.randint(4, 7))

# ferns: clumps round the trunks and along the banks, and a thick border of them where the glade gives way to the wood
for (gx, gr, rad) in GIANTS:
    for _ in range(5):
        a = rng.uniform(-0.3, math.pi + 0.3)
        x, r = gx + math.cos(a) * (rad + rng.uniform(0.9, 1.6)), gr + math.sin(a) * (rad + rng.uniform(0.8, 1.4))
        if clear(x, r, 0.0) or (x < 1.2 or x > COLS - 1.2):
            R.fern(k, x, r, rng.uniform(0.55, 0.8), tone=rng.choice(('#4a8a3a', '#55963e', '#3e7a32')))
for _ in range(260):
    x, r = rng.uniform(0.5, COLS - 0.5), rng.uniform(5.0, ROWS - 1.5)
    if clear(x, r, 0.4):
        R.fern(k, x, r, rng.uniform(0.45, 0.75), tone=rng.choice(('#4a8a3a', '#55963e', '#5aa042', '#3e7a32')))
for _ in range(70):                                                  # low bushes in the open wood, berries on some
    x, r = rng.uniform(1.0, COLS - 1.0), rng.uniform(6.0, ROWS - 2.0)
    if clear(x, r, 1.0):
        W.bush(k, x, r, s=rng.uniform(0.3, 0.45), tone=rng.choice(('#3a6a30', '#46763a', '#2e5a2a')), berries=rng.choice((None, None, '#f0f0f0', '#c83a3a')))
for (x, r, dx, dr) in R.along(BROOK, 0.9):
    if r < 21 or r > ROWS:
        continue
    side = rng.choice((-1, 1))
    fx, fr = x - dr * side * (width(r) + 0.55), r + dx * side * (width(r) + 0.55)
    if not wet(fx, fr, 0.25) and math.hypot(fx - CROSS[0], fr - CROSS[1]) > 1.0:
        R.fern(k, fx, fr, rng.uniform(0.5, 0.7), tone='#4a8a3a')
for (ra, rb, step) in ((32.1, 33.0, (0.7, 1.1)), (33.0, 34.4, (0.6, 1.0))):     # the border at the front: ferns, bushes, saplings
    x = rng.uniform(0.0, 0.6)
    while x < COLS:
        r = rng.uniform(ra, rb)
        if not wet(x, r, 0.35):
            q = rng.random()
            if q < 0.45:
                R.fern(k, x, r, rng.uniform(0.75, 1.15), fronds=11, tone=rng.choice(('#3e7a32', '#4a8a3a', '#55963e')))
            elif q < 0.9:
                W.bush(k, x, r, s=rng.uniform(0.4, 0.62), tone=rng.choice(('#2e5a2a', '#3a6a30', '#46763a')), berries=rng.choice((None, None, '#f0f0f0', '#c83a3a')))
            else:
                R.sapling(k, x, r, h=rng.uniform(1.2, 1.7))
        x += rng.uniform(*step)
for xs in ((0.3, 1.2), (COLS - 1.2, COLS - 0.3)):                    # and down the sides
    r = 5.0
    while r < 32:
        x = rng.uniform(*xs)
        if rng.random() < 0.55:
            R.fern(k, x, r, rng.uniform(0.7, 1.0), fronds=10, tone=rng.choice(('#3e7a32', '#4a8a3a')))
        else:
            W.bush(k, x, r, s=rng.uniform(0.4, 0.55), tone=rng.choice(('#2e5a2a', '#3a6a30')))
        r += rng.uniform(1.0, 1.8)
x = 0.5
while x < COLS:                                                      # and under the trunks at the back
    r = rng.uniform(0.6, 2.0)
    if (x - GT[0]) ** 2 + (r - GT[1]) ** 2 > (GT[2] + 0.5) ** 2 and all((x - gx) ** 2 + (r - gr) ** 2 > (rad + 0.3) ** 2 for (gx, gr, rad) in GIANTS):
        if rng.random() < 0.6:
            R.fern(k, x, r, rng.uniform(0.6, 0.9), fronds=9, tone=rng.choice(('#3e7a32', '#4a8a3a')))
        else:
            W.bush(k, x, r, s=rng.uniform(0.4, 0.55), tone=rng.choice(('#2e5a2a', '#3a6a30')))
    x += rng.uniform(0.9, 1.5)

# flowers in clumps, the floor's litter, twigs, pebbles, moss mounds
R.flowers(k, 1.0, 5.0, COLS - 1.0, ROWS - 1.0, 160, ok=lambda x, r: clear(x, r, 0.0))
R.flowers(k, 13.0, 19.0, 34.0, 31.0, 50, ok=lambda x, r: clear(x, r, 0.0), cols=('#f0f0f0', '#f0d870', '#f0b0c8'))
R.leaf_litter(k, -0.5, -2.5, COLS + 0.5, ROWS + 0.5, 900, ok=lambda x, r: not wet(x, r, 0.05))
R.twigs(k, 0.5, 4.0, COLS - 0.5, ROWS, 40, ok=lambda x, r: clear(x, r, 0.0))
R.pebbles(k, -0.5, -2.0, COLS + 0.5, ROWS + 0.5, 220, ok=lambda x, r: not wet(x, r, -0.05))
R.moss_mounds(k, -0.5, -2.0, COLS + 0.5, ROWS + 0.5, 140, ok=lambda x, r: clear(x, r, 0.1))


stage('built')

# ---- the ways on (workstream F): the undergrowth lifted off the two new paths, their stones, a lantern either side where
# each leaves the glade and a leaf-post pointing the way
def join_d(x, r):
    return min(line_dist(x, r, p) for p in JOIN_PATHS)


def join_clear(pad=0.75):
    """Take out the ferns, bushes, saplings, flowers and mounds standing on the new paths (by each part's middle)."""
    import bpy
    import numpy as np
    UNDER = ('fern', 'bush', 'berry', 'leaf', 'sapling', 'flower', 'moss_mound', 'twig', 'mushroom', 'pebble')
    keep = []
    for p in k.parts:
        n = p.get('pname') or ''
        o = p['obj']
        if n.startswith(UNDER) and p.get('var') is None and len(o.data.vertices):
            co = np.empty(len(o.data.vertices) * 3, dtype=np.float32)
            o.data.vertices.foreach_get('co', co)
            M = np.array(o.matrix_world, dtype=np.float64)
            c = (co.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]).mean(axis=0)
            if join_d(c[0], -c[1] / S) < pad:
                bpy.data.objects.remove(o)
                continue
        keep.append(p)
    k.parts[:] = keep


join_clear()
jr = random.Random(7070)
for p in JOIN_PATHS:
    for (x, r, dx, dr) in R.along(p, 0.5):
        if x > COLS + 0.3 or r > ROWS + 0.5:
            continue
        nx, nr = -dr, dx
        if jr.random() < 0.22:
            o_ = jr.uniform(-0.2, 0.2)
            sz = jr.uniform(0.2, 0.3)
            fx, fr = x + nx * o_, r + nr * o_
            k.rock(fx, fr, gz(fx, fr) - 0.004, sz, sz * jr.uniform(0.6, 0.85), 0.02, (shade('#948a74', jr.uniform(0.88, 1.06)), 0.3),
                   part='path_flagstone', segs=7, jitter=0.2)
        for side in (-1, 1):
            if jr.random() < 0.45:
                o_ = side * jr.uniform(0.6, 0.72)
                sx, sr = x + nx * o_, r + nr * o_
                sz = jr.uniform(0.06, 0.12)
                k.rock(sx, sr, gz(sx, sr) + sz * 0.25, sz, sz * 0.8, sz * 0.55, (shade(R.STONE, jr.uniform(0.8, 1.15)), 0.3), part='path_stone', segs=7)
for (x, r) in ((42.6, 17.4), (42.6, 19.9), (16.4, 30.6), (19.0, 30.4)):      # a lantern either side where each path leaves
    R.lantern_post(k, x, r)
for (x, r, toward) in ((41.4, 17.2, 0.0), (16.2, 29.4, math.pi / 2)):         # leaf-posts: a carved leaf pointing the way
    z0 = gz(x, r)
    k.tube((x, r, z0 - 0.05), (x, r, z0 + 1.15), 0.05, ('#c8b48a', 0.2), 'post', verts=8)
    k.blob(x + math.cos(toward) * 0.2, r + math.sin(toward) * 0.15, z0 + 1.05, 0.24, 0.05, 0.1, (R.GOLD, 0.25), 'post_leaf',
           rot=(0, 0, math.degrees(toward)), segs=8)
    k.solid_post(x, r)

# ---- the edges of the glade ------------------------------------------------------------------------------------------------
k.solid(0, 0, COLS, 2)
k.solid(0, 0, 1, ROWS)
k.solid(COLS - 1, 0, COLS, ROWS)
k.solid(0, ROWS - 2, COLS, ROWS)
for c in range(COLS):                                                # the brook and its pool: no wading (bar the stepping stones)
    for r in range(ROWS):
        if water_edge(c + 0.5, r + 0.5) < 0.12 and (c, r) not in ((6, 21), (7, 21), (6, 22), (7, 22)):
            k.solid(c, r, c + 1, r + 1)

# ---- the light (js/clock.js: Sylvara's day is a real day): by day the sun down through the canopy; at dusk — as the
# glade was first built — a low gold sun from the west between the trunks, the shadows green-blue; by night the moon,
# the leaf lanterns and the Moonwell (the kit derives dusk and night from this day)
k.sun((0.62, 0.42, -0.62), '#fff0c8', 3.4, angle=3.0)
R.merge_parts(k)
k.render(OUT, cycle=None if os.environ.get('ELDER_QUICK') else {'base': 'day', 'dusk_sun': ((0.78, 0.3, -0.36), '#ffb070', 1.8), 'dusk_sky': ('#3a5a7a', 0.55),
                     'night_sky': ('#1e3040', 0.55), 'lamps_day': 0.3},
         light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#86aac0', 0.8))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
SPAWN = [39, 24]
w.update({'name': 'Elderglade', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'sylvara',
          'spawns': {'player': SPAWN}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -3.0, COLS, ROWS], 'shuttle': {'spawn': SPAWN}})
DX = int(GT[0])
w['interactions'] = [
    {'x': 39, 'y': int(PR), 'type': 'shuttle', 'label': 'SHUTTLE', 'prompt': 'PRESS E TO BOARD'},
    {'x': DX - 1, 'y': int(front), 'type': 'enter_world', 'label': 'THE GREAT TREE', 'prompt': 'PRESS E TO GO IN',
     'target': 'sylvara-hall', 'spawn': [10, 12]},
    {'x': DX, 'y': int(front), 'type': 'enter_world', 'label': 'THE GREAT TREE', 'prompt': 'PRESS E TO GO IN',
     'target': 'sylvara-hall', 'spawn': [11, 12]},
    {'x': 7, 'y': 5, 'type': 'dialog', 'label': 'ELVEN HOME', 'prompt': 'PRESS E TO KNOCK',
     'dialog': 'A ROUND DOOR IN THE TRUNK OF A TREE OLDER THAN THE CITY. SOMEONE INSIDE IS SINGING, AND STOPS TO LISTEN, AND STARTS AGAIN.'},
    {'x': 33, 'y': 6, 'type': 'dialog', 'label': 'ELVEN HOME', 'prompt': 'PRESS E TO KNOCK',
     'dialog': 'A NOTE PINNED TO THE DOOR WITH A THORN: "GONE TO THE MOONWELL. BACK WHEN THE MOON IS."'},
    {'x': int(MW[0]), 'y': int(MW[1] + 2), 'type': 'dialog', 'label': 'MOONWELL', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE MOONWELL. THE WATER IS STILL AND FULL OF A LIGHT THAT ISN\'T THE SKY\'S. THE ELVES SAY IT SHOWS YOU WHAT YOU\'D CROSS THE SEAS FOR. YOU LOOK, AND IT DOES.'},
    {'x': 6, 'y': 17, 'type': 'dialog', 'label': 'WILLOW', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A WILLOW BENDING OVER THE MOONWELL, ITS FRONDS TRAILING IN THE WATER. SOMETHING IS CAUGHT HIGH IN THEM.'},
    {'x': int(BS[0]), 'y': int(BS[1]), 'type': 'dialog', 'label': 'BARD', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE BARD PLAYS ON.'},
    {'x': HB[0], 'y': HB[1], 'type': 'dialog', 'label': 'HERBALIST', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE HERBALIST NODS, HANDS FULL OF THYME.'},
    {'x': 34, 'y': 24, 'type': 'dialog', 'label': 'WARDEN', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE WARDEN WATCHES YOU.'},
    {'x': 26, 'y': 15, 'type': 'dialog', 'label': 'WAYSTONE', 'prompt': 'PRESS E TO READ',
     'dialog': 'A WAYSTONE CARVED WITH LEAVES. NORTH: THE GREAT TREE, AND THE QUEEN. WEST: THE MOONWELL. SOUTH: THE RING, FOR THOSE WHO COME FROM THE STARS.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
for (x, y) in (HB, (34, 24)):                                       # the herbalist at the end of her stall, the warden by the ring
    k.solid(x, y, x + 1, y + 1)
k.solid(31, 10, 34, 11)                                             # behind the stall: the awning would hide you there
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID,
            actors=[{'sheet': 'npc-elf-bard', 'x': BS[0] - 0.5, 'y': BS[1] - 0.35, 'facing': 'down', 'pose': 'sit'},
                    {'sheet': 'npc-elf-herbalist', 'x': HB[0], 'y': HB[1], 'facing': 'down', 'light': [HB[0], HB[1] + 1]},   # by the lantern
                    {'sheet': 'npc-elf-warden', 'x': 34, 'y': 24, 'facing': 'left', 'light': [34, 25]}],   # (a post's shadow falls on her own tile)
            scene_extra={'layers': {'shuttle': 'parked'}, 'keepsake': KEEPSAKE})
print('sylvara done')
