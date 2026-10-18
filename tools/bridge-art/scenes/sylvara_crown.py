"""Sylvara — the Crown: the top tier of the wood elves' city, above the leaves. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/sylvara_crown.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/sylvara-crown

Up the Queen's Stair from the Boughs and out on top of the world: the canopy a sea of leaves in every direction, other
giants' crowns standing out of it like islands, a lantern here and there on a far platform, and the sky over it all
(js/worlds/sylvara.js draws the sky behind: the day, the dusk, the stars and Sylvara's moon). Built on the Great Tree's
crown: the Queen's Bower, a round floor of planks round the top of the trunk with a colonnade of slender living boughs
arching over its north half, flowering, hung with lanterns, and the queen's seat of woven branches under a canopy of
leaves; a stair down through the trunk to the Heartwood Hall. East across a bridge, the star platform: a great dial set
in the floor, gold stars and moonstones for the constellations, an armillary of gold rings, a brass telescope, benches,
and Ithil, who reads the stars. Lit by day with Sylvara's dusk; at night the lanterns and the moon.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_sylvan as A
import assets_sylvara_rich as R                    # noqa: E402                          # noqa: E402
import assets_town as W                            # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'sylvara-crown'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 40, 30
k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.6, seed=6211)
rng = k.rng
FLAT = A.Land(k, lambda x, r: 0.0, lambda x, r: None)

BOWER = (14.0, 15.0, 1.1, 6.2)                                   # x, r, the trunk's top, the floor's outer radius
STAR = (30.0, 12.4, 0.9, 4.4)
STAIR_DECK = (5.6, 21.4, 10.0, 24.2)
BRIDGES = [((19.8, 13.6), (26.2, 13.6), 1.3), ((9.2, 21.8), (9.2, 18.4), 1.3)]     # straight across, straight down (you walk four ways)

# ---- the sea of leaves: the canopy's top all round, other giants standing out of it, a far platform or two -------------------
SKY_ROWS = 4.5                                                  # the top of the picture is sky (no geometry: the backdrop shows)
with k.foliage('leaf'):
    for _ in range(300):
        x, r = rng.uniform(-3, COLS + 3), rng.uniform(SKY_ROWS - 2.0, ROWS + 8)
        if math.hypot(x - BOWER[0], (r - BOWER[1]) / 0.92) < BOWER[3] - 0.4 or math.hypot(x - STAR[0], (r - STAR[1]) / 0.92) < STAR[3] - 0.4:
            continue
        s = rng.uniform(0.9, 1.9)
        z = -1.6 - rng.uniform(0, 1.6) - max(0.0, (SKY_ROWS + 3 - r)) * 0.9   # falling away toward the far edge
        tone = shade(A.LEAF, rng.uniform(0.82, 1.12))
        W.leafy_crown(k, x, r, z, 1.4 * s, 1.15 * s, 0.75 * s, tone, n=int(26 * s * s), part='canopy', sprigs=rng.random() < 0.5)
    # deeper down, the canopy's darker inner leaves: what a gap between the crowns shows (never the sky)
    for _ in range(160):
        x, r = rng.uniform(-3, COLS + 3), rng.uniform(SKY_ROWS + 1.5, ROWS + 8)
        s = rng.uniform(1.0, 1.8)
        W.leafy_crown(k, x, r, -4.4 - rng.uniform(0, 1.2), 1.5 * s, 1.2 * s, 0.6 * s, shade(A.LEAF, rng.uniform(0.5, 0.7)), n=int(18 * s * s),
                      part='canopy_low', sprigs=False)
k.box(-3, SKY_ROWS + 2.5, -6.2, COLS + 3, ROWS + 10, -6.0, ('#1a2a16', 0.4), 'canopy_gloom')
with k.foliage('leaf'):
    for (x, r, s) in ((3.0, 6.0, 1.6), (36.0, 22.0, 1.8), (24.0, 26.0, 1.3), (37.5, 4.8, 1.2), (2.0, 27.5, 1.5)):   # crowns of other giants, standing up
        A.crown(k, x, r, -0.2, s * 0.6)
for (x, r) in ((36.0, 21.2), (3.0, 5.4)):                       # a far platform on another giant, a lantern lit
    A.ring_platform(k, x, r, 0.4, 1.2, z=0.9, rail=False)
    A.leaf_lantern(k, x + 0.3, r + 0.4, 1.4, s=0.1, energy=4.0)

# ---- the Queen's Bower ----------------------------------------------------------------------------------------------
bx, br, brad, bro = BOWER
A.column_trunk(k, bx, br, brad, -9.0, 1.2, seed=7)               # the top of the Great Tree's trunk, through the floor
k.cyl(bx, br, 1.2, 1.28, brad + 0.02, (shade(A.BARK, 0.9), 0.3), 'trunk_top', verts=24)
# the old tree's top grown over: a dome of moss, a young sapling out of it, flowers (no cut stump)
k.blob(bx, br, 1.28, brad * 1.02, brad * 0.94, 0.42, ('#4a7a36', 0.4), 'trunk_moss', segs=20)
for _ in range(14):
    a, d = rng.uniform(0, math.tau), rng.uniform(0, brad * 0.85)
    k.blob(bx + math.cos(a) * d, br + math.sin(a) * d * 0.92, 1.5 + 0.2 * (1 - d / brad), rng.uniform(0.15, 0.3), 0.12, 0.08,
           (shade('#5a8a3e', rng.uniform(0.85, 1.15)), 0.35), 'trunk_moss', segs=8)
k.tube((bx + 0.2, br - 0.1, 1.6), (bx + 0.35, br - 0.25, 2.9), 0.06, (A.BARK_L, 0.3), 'sapling', verts=6)
with k.foliage('leaf'):
    W.leafy_crown(k, bx + 0.35, br - 0.25, 3.1, 0.65, 0.55, 0.45, shade(A.LEAF, 1.12), n=40, part='sapling_leaves')
for _ in range(12):
    a, d = rng.uniform(0, math.tau), rng.uniform(0.3, brad * 0.9)
    k.sphere(bx + math.cos(a) * d, br + math.sin(a) * d * 0.92, 1.62, 0.05, 0.045, rng.choice(('#f0f0f0', '#c8a8f0', '#f0d070')), 'flower', segs=6)
A.ring_platform(k, bx, br, brad + 0.05, bro, gaps=[math.atan2((13.6 - br) / 0.92, 19.8 - bx), math.atan2((18.4 - br) / 0.92, 9.2 - bx)])
# a stair down into the trunk: a dark arched door with a gold leaf over it
HDOOR = (int(bx), int(br + brad * 0.92 + 0.4))
fx, fr = bx, br + brad * 0.92
k.box(fx - 0.42, fr - 0.15, 0.0, fx + 0.42, fr + 0.06, 0.9, ('#2a1a10', 0.3), 'stair_door')
k.cyl_y(fx, fr - 0.15, fr + 0.06, 0.9, 0.42, 0.42, ('#2a1a10', 0.3), 'stair_door', verts=16)
k.blob(fx, fr + 0.08, 1.45, 0.14, 0.02, 0.1, (A.GOLD, 0.25), 'door_leaf', segs=6)
for sx in (-1, 1):
    k.cyl(fx + sx * 0.6, fr + 0.15, 0.0, 1.1, 0.04, (A.ELFWOOD, 0.25), 'post', verts=6)
    A.leaf_lantern(k, fx + sx * 0.6, fr + 0.2, 1.2, s=0.09, energy=3.0)
# the colonnade: slender living boughs rising round the north half and arching in over it, leafy, flowering, lanterns hung
arch_pts = []
for i in range(9):
    a = math.pi + i / 8 * math.pi                                 # from the west round the north to the east
    x, r = bx + math.cos(a) * (bro - 0.45), br + math.sin(a) * (bro - 0.45) * 0.92
    top = (bx + math.cos(a) * (bro - 2.4), br + math.sin(a) * (bro - 2.4) * 0.92, 4.2)
    mid = (x + (top[0] - x) * 0.25, r + (top[1] - r) * 0.25, 2.6)
    k.tube((x, r, 0.0), mid, 0.13, (A.BARK_L, 0.3), 'bough_column', rb=0.1, verts=8)
    k.tube(mid, top, 0.1, (A.BARK_L, 0.3), 'bough_column', rb=0.06, verts=8)
    arch_pts.append((top, (x, r)))
    with k.foliage('leaf'):
        for j in range(6):                                        # leaves winding up it
            t = (j + 0.5) / 6
            p = (x + (top[0] - x) * t, r + (top[1] - r) * t, 2.6 * min(1, t * 4) if t < 0.25 else 2.6 + (4.2 - 2.6) * (t - 0.25) / 0.75)
            k.blob(p[0] + rng.uniform(-0.1, 0.1), p[1] + 0.05, p[2], 0.16, 0.12, 0.12, (shade('#5a8e40', rng.uniform(0.85, 1.15)), 0.3), 'bower_leaves', segs=7)
    for j in range(3):                                           # flowers
        p = (x + (top[0] - x) * rng.uniform(0.2, 0.9), r + (top[1] - r) * 0.5 + 0.08, rng.uniform(1.0, 3.8))
        k.sphere(*p, 0.05, 0.045, rng.choice(('#f0f0f0', '#c8a8f0', '#f0d070')), 'flower', segs=6)
    k.solid_post(x, r)
with k.foliage('leaf'):                                           # the arches meeting over the throne, a leafy crown on them
    for (top, _base) in arch_pts:
        W.leafy_crown(k, top[0], top[1], top[2] + 0.2, 0.7, 0.6, 0.35, shade(A.LEAF, rng.uniform(0.95, 1.15)), n=30, part='bower_crown')
    W.leafy_crown(k, bx, br - 2.6, 4.6, 2.2, 1.6, 0.5, shade(A.LEAF, 1.05), n=120, part='bower_crown')
for (top, _base) in arch_pts[1::2]:
    k.cyl(top[0], top[1] + 0.1, top[2] - 0.7, top[2] - 0.05, 0.005, (A.GOLD, 0.25), 'chain', verts=4)
    A.leaf_lantern(k, top[0], top[1] + 0.1, top[2] - 0.8, s=0.11, energy=5.0)
# the queen's seat: woven branches, a high back like a leaf, a canopy, a moss cushion
tx, tr = bx, br - bro + 1.6
k.box(tx - 1.0, tr - 0.3, 0.0, tx + 1.0, tr + 0.9, 0.16, (A.ELFWOOD, 0.25), 'dais')
for i in range(11):
    a = math.pi * (0.1 + 0.8 * i / 10)
    k.tube((tx + math.cos(a) * 0.55, tr + 0.1, 0.4), (tx + math.cos(a) * 0.85, tr - 0.05, 0.6 + math.sin(a) * 1.6), 0.04, (A.BARK_L, 0.3), 'throne_branch', verts=5)
k.blob(tx, tr - 0.05, 1.5, 0.75, 0.1, 1.0, (shade('#5a8e40', 0.9), 0.3), 'throne_back', segs=12)
k.blob(tx, tr + 0.04, 1.55, 0.18, 0.04, 0.26, (A.GOLD, 0.25), 'throne_leaf', segs=8)
k.box(tx - 0.42, tr - 0.05, 0.16, tx + 0.42, tr + 0.5, 0.42, (A.ELFWOOD_L, 0.25), 'throne_seat')
k.blob(tx, tr + 0.22, 0.46, 0.38, 0.24, 0.06, ('#4a7a3a', 0.35), 'throne_cushion', segs=10)
k.solid(tx - 1.0, tr - 0.4, tx + 1.0, tr + 0.6)
for (x, r) in ((bx - 3.6, br + 2.2), (bx + 3.6, br + 2.2)):          # benches either side, facing in
    A.bench(k, FLAT, x - 0.6, x + 0.6, r)
for (x, r) in ((bx - 4.6, br - 1.6), (bx + 4.4, br + 2.0), (bx - 2.6, br + 4.6), (bx + 2.6, br + 4.6)):
    k.cyl(x, r, 0.0, 0.32, 0.24, ('#8a5a3a', 0.3), 'tub', verts=12)
    A.flower_bed(k, FLAT, x, r, 0.26, 0.22, n=5)
# the garden round the rail: tubs of flowers and little trees, a gold leaf inlaid in a ring in the floor, a low table set
for i in range(10):
    a = math.pi * 0.08 + i * (math.pi * 0.84 / 9)
    x, r = bx + math.cos(a) * (bro - 0.55), br + math.sin(a) * (bro - 0.55) * 0.92
    if abs(x - (bx + 3.6)) < 1.0 and abs(r - (br + 2.2)) < 0.8 or abs(x - (bx - 3.6)) < 1.0 and abs(r - (br + 2.2)) < 0.8:
        continue
    if abs(x - bx) < 1.0 and r > br + brad:                      # keep the way to the trunk door open
        continue
    if any(math.hypot(x - ex, r - er) < 2.0 for (ex, er) in ((9.2, 18.4), (19.8, 13.6))):   # and the bridges' landings
        continue
    k.cyl(x, r, 0.0, 0.3, 0.2, ('#8a5a3a', 0.3), 'tub', verts=12)
    if i % 3 == 1:
        with k.foliage('leaf'):
            k.tube((x, r, 0.3), (x, r, 0.8), 0.03, (A.BARK_L, 0.3), 'tub_tree', verts=5)
            W.leafy_crown(k, x, r, 1.0, 0.32, 0.28, 0.3, shade(A.LEAF, rng.uniform(1.0, 1.15)), n=18, part='tub_tree_leaves')
    else:
        A.flower_bed(k, FLAT, x, r, 0.18, 0.16, n=4)
    k.solid(x - 0.2, r - 0.2, x + 0.2, r + 0.2)
for i in range(48):                                              # the inlay: gold leaves in a ring set into the planks
    a = i / 48 * math.tau
    if abs(math.sin(a) - 1) < 0.02:
        continue
    x, r = bx + math.cos(a) * (brad + 1.2), br + math.sin(a) * (brad + 1.2) * 0.92
    k.blob(x, r, 0.012, 0.09, 0.05, 0.006, (A.GOLD, 0.25), 'floor_inlay', rot=(0, 0, math.degrees(a) + 90), segs=6)
lt = (bx + 2.4, br - 1.3)
k.cyl(lt[0], lt[1], 0.0, 0.3, 0.32, (A.ELFWOOD, 0.25), 'table', verts=16)
for j in range(3):
    a = j * 2.1
    k.cyl(lt[0] + math.cos(a) * 0.16, lt[1] + math.sin(a) * 0.14, 0.3, 0.38, 0.04, ('#d8d0c0', 0.25), 'cup', verts=8)
k.cyl(lt[0], lt[1], 0.3, 0.46, 0.06, (A.GOLD, 0.25), 'jug', verts=10)
k.solid(lt[0] - 0.3, lt[1] - 0.3, lt[0] + 0.3, lt[1] + 0.3)
# banners of the wood: a gold leaf on green, hung either side of the seat
for sx in (-1, 1):
    px, pr = tx + sx * 1.6, tr + 0.4
    A.carved_post(k, px, pr, 0.0, 2.6)
    k.poly([(px - 0.28, pr + 0.06, 2.4), (px + 0.28, pr + 0.06, 2.4), (px + 0.28, pr + 0.07, 1.2), (px, pr + 0.08, 0.95), (px - 0.28, pr + 0.07, 1.2)], ('#2a5a2e', 0.3), 'banner')
    k.blob(px, pr + 0.09, 1.75, 0.11, 0.01, 0.17, (A.GOLD, 0.25), 'banner_leaf', segs=6)
    k.solid_post(px, pr)

# ---- the star platform ----------------------------------------------------------------------------------------------
sx_, sr_, srad, sro = STAR
A.column_trunk(k, sx_, sr_, srad, -9.0, 0.3, seed=9)
k.cyl(sx_, sr_, 0.3, 0.36, srad + 0.03, (shade(A.BARK, 0.9), 0.3), 'trunk_top', verts=20)
A.ring_platform(k, sx_, sr_, srad + 0.03, sro, gaps=[math.atan2((13.6 - sr_) / 0.92, 26.2 - sx_)])
# the dial: a great flat ring round the trunk top, a ring of gold, the constellations in gold and moonstone
k.cyl(sx_, sr_, 0.0, 0.02, 2.4, ('#3a4a6a', 0.25), 'floor_dial', verts=48, ry=2.4 * 0.92)
k.cyl(sx_, sr_, 0.0, 0.026, 2.25, ('#2a3450', 0.25), 'floor_dial', verts=48, ry=2.25 * 0.92)
W.annulus(k, sx_, sr_, 2.32, 2.42, 0.0, 0.03, (A.GOLD, 0.25), 'floor_dial_ring', segs=48)
W.annulus(k, sx_, sr_, 1.3, 1.36, 0.0, 0.03, (A.GOLD, 0.25), 'floor_dial_ring', segs=40)
for i in range(12):                                              # the hours round the rim
    a = i / 12 * math.tau
    k.box(sx_ + math.cos(a) * 2.0 - 0.05, sr_ + math.sin(a) * 2.0 * 0.92 - 0.03, 0.026, sx_ + math.cos(a) * 2.0 + 0.05,
          sr_ + math.sin(a) * 2.0 * 0.92 + 0.03, 0.034, (A.GOLD, 0.25), 'floor_dial_mark')
for c in range(6):                                               # constellations: a few stars joined by fine gold lines
    a0 = rng.uniform(0, math.tau)
    pts = []
    for j in range(rng.randint(3, 5)):
        a = a0 + rng.uniform(-0.35, 0.35)
        d = rng.uniform(1.45, 2.15)
        pts.append((sx_ + math.cos(a) * d, sr_ + math.sin(a) * d * 0.92))
    for p, q in zip(pts, pts[1:]):
        k.tube((p[0], p[1], 0.03), (q[0], q[1], 0.03), 0.008, (A.GOLD, 0.25), 'floor_dial_line', verts=3)
    for p in pts:
        moon = rng.random() < 0.4
        k.sphere(p[0], p[1], 0.035, 0.045, 0.012, '#c8f0e8' if moon else '#f0d070', 'floor_dial_star', emit=(('#a8e0d8', 0.8) if moon else ('#f0c860', 0.4)), segs=8)
# the armillary on the trunk's top: gold rings round a moonstone
az = 0.36
k.cyl(sx_, sr_, az, az + 0.5, 0.06, (A.GOLD, 0.25), 'armillary_stand', verts=8)
for (rx, ry, rot) in ((0.42, 0.42, (90, 0, 0)), (0.42, 0.42, (90, 0, 60)), (0.38, 0.38, (0, 0, 0)), (0.4, 0.4, (30, 0, -40))):
    import bpy  # noqa: E402
    bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.04, major_segments=32, minor_segments=6)
    o = bpy.context.active_object
    o.scale = (rx, ry, rx)
    o.rotation_euler = tuple(math.radians(v) for v in rot)
    o.location = (sx_, -sr_ * 1.41421356, az + 0.95)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    k._finish(o, (A.GOLD, 0.25), 'armillary', smooth=True)
k.sphere(sx_, sr_, az + 0.95, 0.13, 0.13, '#c8f0e8', 'armillary_moon', emit=('#a8e0d8', 1.2), segs=12)
k.solid(sx_ - 1.0, sr_ - 0.9, sx_ + 1.0, sr_ + 0.9)
# the telescope on its tripod, pointed at the east
tx2, tr2 = sx_ + 2.6, sr_ - 1.8
for a in (0.2, 2.3, 4.3):
    k.tube((tx2 + math.cos(a) * 0.35, tr2 + math.sin(a) * 0.3, 0.0), (tx2, tr2, 1.1), 0.03, (A.ELFWOOD_D, 0.25), 'tripod', verts=5)
k.tube((tx2 - 0.5, tr2 + 0.25, 1.0), (tx2 + 0.7, tr2 - 0.35, 1.55), 0.09, ('#b08a40', 0.2), 'telescope', rb=0.06, verts=12)
k.cyl_x(tx2 + 0.66, tx2 + 0.72, tr2 - 0.33, 1.53, 0.07, 0.07, ('#a8c8e0', 0.2), 'telescope_lens', verts=10)
k.solid(tx2 - 0.4, tr2 - 0.4, tx2 + 0.4, tr2 + 0.3)
for (x0, x1, r) in ((sx_ - 1.0, sx_ + 0.6, sr_ + 3.4), (sx_ + 2.2, sx_ + 3.6, sr_ + 1.9)):
    A.bench(k, FLAT, x0, x1, r)
ITHIL = (int(sx_ - 2.4), int(sr_ - 1.6))
for (x, r) in ((sx_ - 3.2, sr_ - 1.4), (sx_ + 3.3, sr_ + 0.4), (sx_, sr_ - 3.6)):
    A.lantern_post(k, FLAT, x, r, h=1.5, energy=6.0)

# ---- the stair head from the Boughs, the bridges -------------------------------------------------------------------------
A.deck(k, *STAIR_DECK, rail_sides='sw')
k.cyl(STAIR_DECK[0] + 1.0, STAIR_DECK[3] - 0.6, -1.5, 0.0, 0.45, (A.BARK, 0.35), 'giant_trunk', verts=16)   # the queen's trunk, coming up
for i in range(6):                                               # the last turn of the Queen's Stair, coming up to the deck
    a = math.pi * 0.55 + i * 0.22
    z = -1.2 + i * 0.2
    x, r = STAIR_DECK[0] + 1.0 + math.cos(a) * 0.9, STAIR_DECK[3] - 0.6 + math.sin(a) * 0.8
    k.box(x - 0.3, r - 0.18, z - 0.05, x + 0.3, r + 0.18, z, (shade(A.ELFWOOD, 0.9 + 0.08 * (i % 2)), 0.25), 'stair_step')
A.lantern_post(k, FLAT, STAIR_DECK[0] + 0.4, STAIR_DECK[1] + 0.3, h=1.5, energy=6.0)
for (a, b, w) in BRIDGES:
    A.rope_bridge(k, a, b, width=w)

# ---- what's walkable ---------------------------------------------------------------------------------------------------
walk = set()
for c in range(COLS):
    for rr in range(ROWS):
        x, r = c + 0.5, rr + 0.7
        ok = False
        for (cx, cr, rad, ro) in (BOWER, STAR):
            d = math.hypot(x - cx, (r - cr) / 0.92)
            if rad + 0.35 < d < ro - 0.2:
                ok = True
        if STAIR_DECK[0] + 0.1 < x < STAIR_DECK[2] - 0.1 and STAIR_DECK[1] + 0.05 < r < STAIR_DECK[3] - 0.05:
            ok = True
        for (a, b, w) in BRIDGES:
            if A.seg_dist(x, r, a, b) < w / 2 - 0.05:
                ok = True
        if ok:
            walk.add((c, rr))
for c in range(COLS):
    for rr in range(ROWS):
        if (c, rr) not in walk:
            k.solid(c, rr, c + 1, rr + 1)

k.sun((0.62, 0.42, -0.62), '#fff0c8', 3.4, angle=3.0)
R.merge_parts(k)                                                  # one mesh per look: each render pass quick (assets_sylvara_rich)
k.render(OUT, cycle={'base': 'day', 'dusk_sun': ((0.78, 0.3, -0.36), '#ffb070', 1.8), 'dusk_sky': ('#3a5a7a', 0.55),
                     'night_sky': ('#1e3040', 0.55), 'lamps_day': 0.3},
         light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#86aac0', 0.8))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
SPAWN = [8, 22]
w.update({'name': 'the Crown', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'sylvara',
          'spawns': {'player': SPAWN}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -1.0, COLS, ROWS], 'arrows': 'open'})
w['interactions'] = [
    {'x': 7, 'y': 23, 'type': 'enter_world', 'label': 'THE QUEEN\'S STAIR', 'prompt': 'PRESS E TO CLIMB DOWN TO THE BOUGHS', 'target': 'sylvara-boughs', 'spawn': [13, 31]},
    {'x': HDOOR[0], 'y': HDOOR[1], 'type': 'enter_world', 'label': 'THE HEARTWOOD STAIR', 'prompt': 'PRESS E TO GO DOWN INTO THE TREE',
     'target': 'sylvara-hall', 'spawn': [1, 8]},
    {'x': int(tx), 'y': int(tr + 1), 'type': 'dialog', 'label': 'THE QUEEN\'S SEAT', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE QUEEN\'S SUMMER SEAT, WOVEN OF LIVING BRANCHES. ON FINE EVENINGS SHE HOLDS COURT UP HERE, ABOVE THE WHOLE WOOD. THE CUSHION HAS A DENT IN IT THE SHAPE OF A SWORD-HILT. BECKOLAS SITS ON THE STEP.'},
    {'x': ITHIL[0], 'y': ITHIL[1], 'type': 'dialog', 'label': 'STAR-READER', 'prompt': 'PRESS E TO TALK', 'dialog': 'ITHIL IS LOOKING UP.'},
    {'x': int(tx2), 'y': int(tr2 + 1), 'type': 'sylvan', 'kind': 'stars', 'label': 'TELESCOPE', 'prompt': 'PRESS E TO LOOK THROUGH IT', 'verb': 'Look'},
    {'x': int(sx_), 'y': int(sr_ + 1.5), 'type': 'sylvan', 'kind': 'dial', 'label': 'THE STAR DIAL', 'prompt': 'PRESS E TO READ IT', 'verb': 'Read'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(ITHIL[0], ITHIL[1], ITHIL[0] + 1, ITHIL[1] + 1)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID,
            actors=[{'sheet': 'npc-elf-starreader', 'x': ITHIL[0], 'y': ITHIL[1], 'facing': 'right'}],
            scene_extra={'backdrop': True})
print('sylvara-crown done', 'walkable', len(walk), 'heart door', HDOOR)
