"""Rose Cove — the big rose island (world id "lumar-rose"), rebuilt in the house style (Look Book 2, October 2026).

  BVENV/bin/python tools/bridge-art/scenes/lumar_rose.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-rose

The island wraps round a sheltered cove: your sloop ties up inside it at the end of a long pier. North, roseite is grown
like vines on three stone terraces stepping up the slope, wired along trellis posts, the sprouter's stone workshop on
the west with its yard of trays and crates, a white iron glasshouse glowing pink on the east. The west arm is a meadow
of rose drifts and wildflowers behind dry-stone walls, round a stone tower mill hung with shell chimes, and a memorial
stone at its tip; the east arm steams with hot springs sunk in pale sinter rims by a timber bathhouse, and an old
crystal mine runs into a rock outcrop at its end. The map (land, paths, every door and interaction) is the one the game
has always had: this is its art.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_coast as C               # noqa: E402
import assets_house as HK              # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_wild as WL               # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-rose.json')
COLS, ROWS = 56, 42
k = Kit(COLS, ROWS, margin_top=1.5, margin_bottom=1.0, margin_x=0.5, seed=923)
WL.test_hooks(k)
CRYSTAL = ('#6a2a4a', '#f080b0')
GEM = '#c05a90'                    # roseite's own colour by day (CRYSTAL[0] is its night body)
ROSE = '#f070a8'
GREEN = '#4f7a3c'
ROOF = '#6a2e48'

# ---- shape: two arms round a cove (unchanged: the map) ------------------------------------------------------------
LOBES = [(28, 13.5, 21, 9), (13, 25, 10.5, 13), (43, 25, 10.5, 13)]   # overlapping: cove() carves the bay
land = I.mask(COLS, ROWS, LOBES, seed=7, amp=0.15)


def cove(x, r):
    """< 1 inside the cove: a long bay with a crooked head and a side inlet, its shores ragged."""
    main = math.hypot((x - 28.0 - 1.0 * I.n2(0.0, r, 0.18, 8)) / 9.6, (r - 30.5) / 12.0)
    inlet = math.hypot((x - 21.2) / 2.6, (r - 25.5) / 1.7)
    return min(main, inlet) + 0.32 * I.n2(x, r, 0.3, 4) + 0.1 * I.n2(x, r, 0.9, 6)


land = {(c, r) for (c, r) in land if cove(c + 0.5, r + 0.5) > 1}
land = I.flood(land, (28, 12))

PX = 28
pier_top = max(r for (c, r) in land if c == PX and r < 25) + 1
PIER = [(PX, r) for r in range(pier_top, pier_top + 5)]
SHIP_R = pier_top + 5
SL = 6.5
FJ, FLEN = (18, 31), 6                     # the fishing jetty: east into the cove from the west arm
FJET = I.jetty_cells(FJ, FLEN, 'e')

POOLS = [(42.0, 22.0, 1.5, 1.1), (46.2, 24.6, 1.2, 0.9), (41.6, 26.4, 1.1, 0.8)]


def pool_d(x, r):
    return min(((x - cx) / rx) ** 2 + ((r - cr) / ry) ** 2 for (cx, cr, rx, ry) in POOLS)


POOL_CELLS = {(c, r) for (c, r) in land if any(((c + dx - cx) / (rx + 0.3)) ** 2 + ((r + dr - cr) / (ry + 0.3)) ** 2 < 1
                                               for (cx, cr, rx, ry) in POOLS for dx in (0.1, 0.9) for dr in (0.1, 0.9))}
walk = land - POOL_CELLS
# what you can't walk on: the pools out to their rims (POOL_CELLS, a little wider, keeps the scatter off the rims)
POOL_SOLID = {(c, r) for (c, r) in land if any(((c + dx - cx) / (rx + 0.2)) ** 2 + ((r + dr - cr) / (ry + 0.2)) ** 2 < 1
                                               for (cx, cr, rx, ry) in POOLS for dx in (0.25, 0.75) for dr in (0.25, 0.75))}
# each spring's own outline: an irregular shape round its ellipse, the water a little inside the rim
SPRINGS = [WL.blob_outline(cx, cr, rx * 0.92, ry * 0.9, seed=40 + i, wob=0.1) for i, (cx, cr, rx, ry) in enumerate(POOLS)]
SPRING_Z = -0.09                                   # their still water stands above the sea's line: the sea never fills them


def spring_d(x, r):
    return min(s[1](x, r) for s in SPRINGS)


J = (28.5, 15.0)
WORKSHOP_DOOR = (11.75, 10.6)
GLASS_DOOR = (42.0, 10.2)
PATHS = [
    [(PX + 0.5, pier_top + 0.3), J, (28.0, 12.5), (28.0, 6.0)],
    [J, (20.0, 14.5), (14.0, 12.0), WORKSHOP_DOOR],
    [(14.0, 12.0), (12.5, 17.0), (11.2, 24.2), (9.5, 28.0), (8.0, 31.5)],
    [J, (36.0, 14.5), (40.5, 12.5), GLASS_DOOR],
    [(40.5, 12.5), (43.5, 17.0), (44.0, 20.5), (44.5, 28.0), (45.0, 31.6)],
    [(44.1, 21.2), (48.0, 21.7), (52.4, 22.5)],      # up to Rosewell (lumar-rose-springs: js/rose.js's door at (52, 22))
]
TOP_PATH = [(18.0, 5.6), (28.0, 5.8), (38.2, 6.2)]                  # the walk along the terraces' backs


def pd(x, r):
    return I.path_dist(PATHS, x, r)


WL.tick('the terraces: three stone-faced s')
# ---- the terraces: three stone-faced steps up the slope each side of the path north -------------------------------
TER = [(19.0, 26.75), (29.25, 37.0)]                                 # x spans (the block is solid in the map)
STEPS = [(11.3, 0.38), (9.5, 0.74), (7.7, 1.08)]                     # (front row, height) low to high
TER_BACK = 6.75


def terrace_h(x, r):
    """Height of the terraces' tops at (x, r), else None."""
    if not any(x0 <= x <= x1 for (x0, x1) in TER) or not (TER_BACK <= r <= STEPS[0][0]):
        return None
    h = None
    for (rf, z) in STEPS:
        if r <= rf:
            h = z
    return h


def height(x, r):
    d = pool_d(x, r)
    if d < 1.7:                                   # the springs' hollows: the ground dips to the sinter, then the basin
        z = -0.06 * I.smooth(1.7, 1.15, d)
        sd = spring_d(x, r)
        if sd < 1.25:
            z -= 0.12 * I.smooth(1.25, 1.0, sd) + 0.25 * I.smooth(1.0, 0.6, sd)
        return z
    z = 0.018 * I.n2(x, r, 0.7, 21)               # the turf rolls a little (never enough to lift you off it)
    return z


def material(x, r):
    d = pool_d(x, r)
    if d < 1.7:
        sd = spring_d(x, r)
        if sd < 1.0:
            return 'pool_bed'
        if sd < 1.12 + 0.05 * I.n2(x, r, 3.0, 2):
            return 'sinter_rust'                          # the warm algae ring right at the water: rust and ochre
        if d < 1.15 + 0.12 * I.n2(x, r, 1.8, 5):
            return 'sinter' if I.n2(x, r, 2.4, 6) > -0.35 else 'sinter_ochre'
        return 'gravel' if I.n2(x, r, 2.0, 8) > 0.25 else 'grass'
    p = pd(x, r) + 0.14 * I.n2(x, r, 1.6, 3)
    if p < 0.42:
        return 'path'
    if p < 0.6 and I.n2(x, r, 2.0, 5) > 0.05:
        return 'path_edge'
    if I.path_dist([TOP_PATH], x, r) + 0.14 * I.n2(x, r, 1.6, 4) < 0.36:
        return 'path'
    if x > 37 and 17 < r < 30 and d < 4.5 and I.n2(x, r, 1.2, 9) > 0.3:
        return 'gravel'
    m = I.n2(x, r, 0.4, 11) + 0.4 * I.n2(x, r, 1.5, 12)
    if x + 2.5 * I.n2(x, r, 0.15, 15) < 20 and r + 2.0 * I.n2(x, r, 0.2, 16) > 14:
        return 'meadow' if m > -0.3 else 'meadow_dark'
    return 'grass' if m > -0.25 else 'grass_dark'


ALB = {'path': ('#a48c74', 0.3), 'path_edge': ('#8e7a64', 0.3),
       'meadow': ('#557c3e', 0.3), 'meadow_dark': ('#4a6e38', 0.3), 'grass': (GREEN, 0.3), 'grass_dark': ('#44683a', 0.3),
       'gravel': ('#9a8e86', 0.25), 'sinter': ('#d8ccb4', 0.2), 'sinter_ochre': ('#cfae7c', 0.2),
       'sinter_rust': ('#b0704a', 0.2), 'pool_bed': ('#3e6a6a', 0.3)}
I.ground(k, land, material, ALB, height=height, step=0.0625, dither=0.04)
WL.tick('ground laid')

terrain = C.coast(k, land, ground=(material, ALB), palette='rose', grass=GREEN, rock='#6a5e62', seed=31, beachiness=0.1,
                  beach_bias=lambda x, r: 0.8 * I.smooth(3.0, 0.0, abs(x - 28.0) - 6.5) * I.smooth(16.0, 20.0, r),
                  keep_clear=[(PX - 0.4, pier_top - 0.4, PX + 1.4, SHIP_R + 0.2),
                              (PX + 0.5 - 0.45 * SL - 0.8, SHIP_R - 0.2, PX + 0.5 + 0.55 * SL + 1.8, SHIP_R + 1.9),
                              (FJ[0] - 0.4, FJ[1] - 0.6, FJ[0] + FLEN + 1.4, FJ[1] + 1.6)])
rng = random.Random(4417)          # this rebuild's own dice (the kit's dice still place what they always placed)

WL.tick('the pier into the cove, your sloo')
# ---- the pier into the cove, your sloop's berth ----------------------------------------------------------------------
W.dock(k, PX + 0.05, PX + 0.95, pier_top - 0.4, SHIP_R + 0.0, z=0.02)
# no galleon at the pier any more: your own sloop ties up at its end (js/sloop.js draws it, MOORINGS)
for x in (PX - 0.15, PX + 1.15):
    W.silver_post(k, x, pier_top + 0.6)
for (x, r) in ((PX - 0.1, pier_top + 2.0), (PX + 1.1, pier_top + 3.4)):      # bollards and a coil of rope along it
    k.cyl(x, r, -0.4, 0.3, 0.07, ('#3a3a40', 0.2), 'bollard', verts=8)
    k.sphere(x, r, 0.3, 0.075, 0.05, '#3a3a40', 'bollard', segs=8)
for j in range(3):
    k.cyl(PX + 0.72, pier_top + 1.2, 0.02 + j * 0.03, 0.05 + j * 0.03, 0.14 - j * 0.03, '#a08a60', 'rope_coil', verts=10)
WL.basket(k, PX + 0.3, pier_top + 4.4, fill=ROSE, glow=CRYSTAL[1], s=0.15)
# at the pier's foot: a cart of crates waiting for the boat, a lamp
HK.barrels(k, 33.4, 17.3)

WL.tick('north: the terraces -------------')
# ---- north: the terraces ------------------------------------------------------------------------------------------
FACE = ('#9a8e84', '#8a8078', '#a89c90', '#7e766e')


def stone_face(x0, x1, rf, z0, z1, seed):
    """Dry-stone facing on the front of a terrace step: courses of stones each its own size and tone."""
    rr = random.Random(seed)
    z = z0
    while z < z1 - 0.02:
        ch = min(rr.uniform(0.09, 0.13), z1 - z)
        x = x0 + rr.uniform(-0.1, 0.0)
        while x < x1 - 0.02:
            sl = min(rr.uniform(0.16, 0.34), x1 - x)
            k.box(x + 0.008, rf - 0.04, z + 0.006, x + sl - 0.008, rf + rr.uniform(0.0, 0.025), z + ch - 0.006,
                  (shade(rr.choice(FACE), rr.uniform(0.86, 1.1)), 0.2), 'terrace_stone', bevel=0.012)
            x += sl
        z += ch


def end_face(x, r0, r1, z1, side, seed):
    """The stone end of a terrace step, facing along x (side -1 west, +1 east)."""
    rr = random.Random(seed)
    z = 0.0
    while z < z1 - 0.02:
        ch = min(rr.uniform(0.09, 0.13), z1 - z)
        r = r0
        while r < r1 - 0.02:
            sl = min(rr.uniform(0.16, 0.34), r1 - r)
            xa = x - 0.02 if side > 0 else x - rr.uniform(0.0, 0.025)
            k.box(xa, r + 0.008, z + 0.006, xa + 0.04 + rr.uniform(0.0, 0.02), r + sl - 0.008, z + ch - 0.006,
                  (shade(rr.choice(FACE), rr.uniform(0.82, 1.05)), 0.2), 'terrace_stone', bevel=0.012)
            r += sl
        z += ch


TERRACE_CELLS = []
for ti, (x0, x1) in enumerate(TER):
    prev = TER_BACK
    for si, (rf, z) in enumerate(reversed(STEPS)):           # high (back) to low (front)
        k.box(x0, prev, 0.0, x1, rf - 0.04, z - 0.02, ('#5a4a42', 0.3), 'terrace_core')
        k.box(x0, prev, z - 0.03, x1, rf - 0.03, z, (GREEN, 0.3), 'grass')
        prev = rf
    for si, (rf, z) in enumerate(STEPS):
        stone_face(x0, x1, rf, 0.0 if si == 0 else STEPS[si - 1][1], z, 100 * ti + si)
        k.box(x0, rf - 0.06, z - 0.01, x1, rf + 0.03, z + 0.035, (shade('#8a8076', 1.06), 0.2), 'terrace_cope')
    for (x, side) in ((x0, -1), (x1, 1)):
        for si, (rf, z) in enumerate(STEPS):
            r_back = STEPS[si + 1][0] if si + 1 < len(STEPS) else TER_BACK
            end_face(x + (0.0 if side < 0 else 0.0), r_back, rf, z, side, 300 + 10 * ti + si + (5 if side > 0 else 0))
    TERRACE_CELLS += [(c, r) for c in range(int(x0), int(math.ceil(x1))) for r in range(int(TER_BACK), int(math.ceil(STEPS[0][0])))]


def trellis(x0, x1, r, z, seed):
    """A row of roseite grown like a vine: posts, two wires, soil heaped along the row, crystals climbing the wires
    and sprouting from the soil, a glow along the row."""
    rr = random.Random(seed)
    k.cyl_x(x0 + 0.1, x1 - 0.1, r, z + 0.02, 0.16, 0.05, ('#5a3e36', 0.3), 'soil', verts=8)
    posts = []
    x = x0 + 0.25
    while x < x1 - 0.1:
        posts.append(x)
        k.box(x - 0.035, r - 0.035, z, x + 0.035, r + 0.035, z + 0.62, ('#6a4a30', 0.2), 'trellis_post')
        x += 1.2
    for wz in (0.3, 0.55):
        k.tube((posts[0], r, z + wz), (posts[-1], r, z + wz), 0.007, '#9a9aa4', 'trellis_wire', verts=4)
    x = x0 + 0.3
    while x < x1 - 0.2:                                          # clumps of six-sided points, pink and glassy
        n = rr.randint(3, 5)
        for j in range(n):
            a = rr.uniform(-0.8, 0.8)
            h = rr.uniform(0.22, 0.58) * (1.0 if j else 1.15)
            lit = rr.uniform(0.85, 1.2)
            rad = rr.uniform(0.04, 0.065)
            base = (x + rr.uniform(-0.06, 0.06), r + rr.uniform(-0.05, 0.05), z + 0.06)
            body = (base[0] + math.sin(a) * h * 0.32, base[1] + rr.uniform(-0.05, 0.05), base[2] + h * 0.75)
            top = (base[0] + math.sin(a) * h * 0.42, body[1], base[2] + h)
            k.tube(base, body, rad, shade(GEM, lit), 'crystal', rb=rad * 0.9, emit=(CRYSTAL[1], 0.42 * lit), verts=6, smooth=False)
            k.tube(body, top, rad * 0.9, shade(GEM, lit * 1.2), 'crystal', rb=0.004, emit=(CRYSTAL[1], 0.5 * lit), verts=6, smooth=False)
        if rr.random() < 0.45:                                   # a sprig grown along the wire
            k.tube((x, r + 0.02, z + 0.55), (x + rr.uniform(0.15, 0.3), r + 0.02, z + 0.6), 0.03, GEM, 'crystal',
                   rb=0.004, emit=(CRYSTAL[1], 0.45), verts=6, smooth=False)
        x += rr.uniform(0.2, 0.3)
    k.point_light((x0 + x1) / 2, r + 0.5, z + 0.4, CRYSTAL[1], 6 * (x1 - x0) / 3, radius=0.4, group='flicker')


for ti, (x0, x1) in enumerate(TER):
    for si, (rf, z) in enumerate(STEPS):
        trellis(x0 + 0.25, x1 - 0.25, rf - 0.55, z, 500 + 10 * ti + si)
    k.solid(x0, 7.0, x1, 11.0)                              # rows 7-10, as the beds always blocked: 6 and 11 are walked
# the harvest: baskets at the terrace foot, a ladder against the wall, buckets, a barrow
k.solid(24, 12, 25, 13)                                     # the harvester stands at the terrace foot
for (x, r) in ((22.6, 11.75), (23.05, 11.85), (26.1, 11.7)):
    WL.basket(k, x, r, fill=ROSE, glow=CRYSTAL[1], s=0.16)
k.tube((20.3, 11.45, 0.0), (20.25, 11.2, 0.62), 0.02, A.WOOD, 'ladder', verts=4)
k.tube((20.75, 11.45, 0.0), (20.7, 11.2, 0.62), 0.02, A.WOOD, 'ladder', verts=4)
for j in range(4):
    zz = 0.1 + j * 0.15
    k.tube((20.3, 11.45 - zz * 0.4, zz), (20.75, 11.45 - zz * 0.4, zz), 0.014, A.WOOD, 'ladder', verts=4)

WL.tick('the workshop, its yard ----------')
# ---- the workshop, its yard ------------------------------------------------------------------------------------------
HK.rich_house(k, 9.6, 13.9, 7.4, 10.0, wall_h=1.7, rise=0.9, roof=ROOF, wall='#b4a8a8', door_x=WORKSHOP_DOOR[0],
              windows=[(10.35, 0.8)], stone=True, chimney=13.2)
W.wind_chimes(k, 14.6, 10.6)
k.cyl(15.3, 10.0, 0.0, 0.12, 0.04, '#e8d0e0', 'vial', emit=('#f080b0', 0.4), verts=8)
# the sprouter's bench under the west wall: trays of seed crystals, a watering can
k.box(8.35, 8.0, 0.0, 9.45, 9.6, 0.62, ('#7a5a3a', 0.2), 'bench_top')
for (x, r) in ((8.5, 8.2), (8.5, 9.35), (9.3, 8.2), (9.3, 9.35)):
    k.box(x - 0.03, r - 0.03, 0.0, x + 0.03, r + 0.03, 0.6, A.WOOD_DD, 'bench_leg')
for j in range(3):
    ry = 8.15 + j * 0.47
    k.box(8.45, ry, 0.62, 9.35, ry + 0.38, 0.68, ('#5a4030', 0.2), 'tray')
    for i in range(5):
        k.tube((8.55 + i * 0.17, ry + 0.19, 0.66), (8.55 + i * 0.17, ry + 0.19, 0.66 + rng.uniform(0.05, 0.14)), 0.02,
               CRYSTAL[0], 'crystal', rb=0.003, emit=(CRYSTAL[1], 0.5), verts=5, smooth=False)
k.solid(8.35, 8.0, 9.45, 9.6)

WL.tick('the glasshouse ------------------')
# ---- the glasshouse -------------------------------------------------------------------------------------------------
def glasshouse(x0, x1, r0, r1, h=1.55, frame='#e8e4e8', glow='#f080b0'):
    """A white iron glasshouse on a brick dwarf wall: glazing bars every few tenths, panes glowing faintly pink from the
    roseite inside, a ridge vent and finials, a door with a fanlight."""
    zb = 0.34
    k.box(x0, r0, 0.0, x1, r1, zb, ('#8a5a4a', 0.2), 'gh_wall')
    x = x0
    i = 0
    while x < x1 - 0.02:                                               # the brick courses on the dwarf wall's face
        for zz in (0.02, 0.13, 0.24):
            xs = x + (0.1 if int(zz * 10) % 2 else 0.0)
            k.box(min(xs, x1) + 0.01, r1 - 0.01, zz + 0.01, min(xs + 0.2, x1) - 0.01, r1 + 0.015, zz + 0.1,
                  (shade('#9a5e48', rng.uniform(0.85, 1.12)), 0.2), 'brick')
        x += 0.2
        i += 1
    k.box(x0 - 0.03, r0 - 0.03, zb, x1 + 0.03, r1 + 0.03, zb + 0.05, ('#b8aca0', 0.2), 'gh_sill')
    pane = ('#2a1828', '#5a2a48', 0.42)
    for (a, b, c, d) in ((x0, r0, x1, r0 + 0.05), (x0, r1 - 0.05, x1, r1), (x0, r0, x0 + 0.05, r1), (x1 - 0.05, r0, x1, r1)):
        k.box(a, b, zb + 0.05, c, d, h, pane[0], 'gh_glass_back' if b == r0 else 'gh_glass', emit=(pane[1], pane[2]))
    rm = (r0 + r1) / 2
    for s in (-1, 1):
        rr_ = r0 if s < 0 else r1
        k.poly([(x0, rr_, h), (x1, rr_, h), (x1, rm, h + 0.62), (x0, rm, h + 0.62)], '#2a1824', 'gh_roof', emit=('#6a3050', 0.38))
    n = max(1, round((x1 - x0) / 0.3))
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        major = i % 3 == 0
        wb = 0.03 if major else 0.016
        for rr_ in (r0, r1):
            k.box(x - wb, rr_ - 0.03, zb + 0.05, x + wb, rr_ + 0.035, h, frame, 'gh_frame')
        k.tube((x, r1 + 0.01, h), (x, rm, h + 0.62), wb, frame, 'gh_frame', verts=4)
        k.tube((x, r0 - 0.01, h), (x, rm, h + 0.62), wb, frame, 'gh_frame', verts=4)
    for rr_ in (r0, r1):
        for zz in (h - 0.02, 0.95):
            k.box(x0, rr_ - 0.03, zz - 0.02, x1, rr_ + 0.035, zz + 0.02, frame, 'gh_frame')
    for xx in (x0, x1):
        nn = max(1, round((r1 - r0) / 0.3))
        for j in range(nn + 1):
            rr_ = r0 + (r1 - r0) * j / nn
            k.box(xx - 0.03, rr_ - 0.016, zb + 0.05, xx + 0.035, rr_ + 0.016, h, frame, 'gh_frame')
        k.poly([(xx + (0.036 if xx == x1 else -0.036), r0, h), (xx + (0.036 if xx == x1 else -0.036), r1, h),
                (xx + (0.036 if xx == x1 else -0.036), rm, h + 0.62)], pane[0], 'gh_glass', emit=(pane[1], pane[2]))
    # the ridge: a lantern vent along it, cresting, a finial each end
    k.box(x0 + 0.4, rm - 0.18, h + 0.55, x1 - 0.4, rm + 0.18, h + 0.75, pane[0], 'gh_glass', emit=(pane[1], pane[2]))
    k.box(x0 + 0.38, rm - 0.2, h + 0.74, x1 - 0.38, rm + 0.2, h + 0.78, frame, 'gh_frame')
    x = x0 + 0.2
    while x < x1 - 0.1:
        k.cone(x, rm, h + 0.78, h + 0.9, 0.025, 0.0, frame, 'gh_cresting', verts=4)
        x += 0.18
    for xx in (x0, x1):
        k.cone(xx, rm, h + 0.62, h + 0.95, 0.04, 0.0, frame, 'gh_finial', verts=6)
        k.sphere(xx, rm, h + 0.95, 0.045, 0.045, frame, 'gh_finial', segs=8)
    cx = (x0 + x1) / 2
    k.box(cx - 0.32, r1 - 0.02, 0.0, cx + 0.32, r1 + 0.04, 1.3, '#2a1a24', 'gh_door', emit=('#7a3a5a', 0.45))
    k.cyl_y(cx, r1 + 0.03, r1 + 0.05, 1.3, 0.32, 0.22, frame, 'gh_frame', verts=12)
    for xx in (cx - 0.32, cx + 0.32):
        k.box(xx - 0.03, r1 + 0.02, 0.0, xx + 0.03, r1 + 0.06, 1.3, frame, 'gh_frame')
    k.box(cx - 0.45, r1, -0.02, cx + 0.45, r1 + 0.35, 0.05, ('#9a8e84', 0.2), 'step')
    k.point_light(cx, rm, 0.9, glow, 30, radius=0.6, group='flicker')
    k.solid(x0, r0, x1, r1)


glasshouse(40.0, 44.0, 7.2, 9.8)
k.cyl(44.8, 10.6, 0.0, 0.12, 0.04, '#e8d0e0', 'vial', emit=('#f080b0', 0.4), verts=8)       # the abandoned vial
# by its door: potted crystals, a water butt, a stack of empty pots
for (x, r, s) in ((40.6, 10.2, 0.13), (43.5, 10.25, 0.12)):
    k.cyl(x, r, 0.0, 0.2, s, ('#a0583a', 0.2), 'pot', verts=10)
    k.cyl(x, r, 0.19, 0.22, s + 0.015, ('#b06a48', 0.2), 'pot', verts=10)
    WL.crystal_cluster(k, x, r, s=0.45, col=(GEM, CRYSTAL[1]), z=0.21, energy=0, glow=0.6, seed=int(x * 10))
A.barrel(k, 39.55, 8.3, h=0.7, radius=0.26, tone='#6a5a4a')
k.cyl(39.55, 8.3, 0.62, 0.66, 0.22, '#3a6a7a', 'butt_water', verts=12)
for j in range(4):
    k.cone(44.55, 8.0, j * 0.07, j * 0.07 + 0.16, 0.11, 0.14, ('#a0583a', 0.2), 'pot', verts=10)

WL.tick('lamps and trees -----------------')
# ---- lamps and trees ---------------------------------------------------------------------------------------------
for (x, r) in ((27.0, 13.6), (30.2, 16.6), (20.4, 15.4), (36.4, 15.4), (13.2, 18.6), (44.6, 18.0)):
    W.lantern_post(k, x, r, energy=16)
    k.point_light(x + 0.3, r + 0.2, 1.9, '#ff70c0', 8, radius=0.1, group='flicker')
TREES = ((17.5, 8.0), (38.6, 12.6), (16.0, 14.0), (39.5, 7.0), (8.4, 13.0), (47.5, 11.5))
for (x, r) in TREES:
    W.tree(k, x, r, h=rng.uniform(2.3, 2.9), tone=rng.choice(('#3e6a38', '#46723c', '#3a6034')))
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)

WL.tick('west: the meadow, the tower mill,')
# ---- west: the meadow, the tower mill, the memorial, a jetty on the cove ----------------------------------------------
MILL = (10.8, 22.4)


def tower_mill(cx, cr, h=3.4, rad=0.85, sails=4, roof=ROOF):
    """A stone tower mill: a tapering tower in courses of dressed stone, a boat-shaped cap of shingles, a stage of
    timber round it at the door, four lattice sails with canvas, shell chimes off the sail tips."""
    top = rad * 0.8
    z = 0.0
    i = 0
    while z < h - 0.02:                                                  # the courses, each its own tone
        ch = min(0.22, h - z)
        r0_, r1_ = rad + (top - rad) * z / h, rad + (top - rad) * (z + ch) / h
        k.cone(cx, cr, z, z + ch - 0.012, r0_, r1_, (shade('#c8bcb0', 0.88 + 0.12 * ((i * 7) % 5) / 4), 0.2), 'mill_tower',
               verts=18)
        k.cone(cx, cr, z + ch - 0.014, z + ch, r1_ - 0.012, r1_ - 0.012, '#8a8078', 'mill_joint', verts=18)
        z += ch
        i += 1
    # the cap: a ring of timber, a shingled dome pulled out toward the sails, a finial
    k.cyl(cx, cr, h, h + 0.12, top + 0.12, (A.WOOD_D, 0.2), 'mill_curb', verts=18)
    for j in range(6):
        t = j / 6
        k.cyl(cx, cr + 0.06, h + 0.12 + t * 0.85, h + 0.12 + (t + 1 / 6) * 0.85, (top + 0.14) * math.cos(t * 1.35) + 0.02,
              (shade(roof, 0.85 + 0.25 * t), 0.25), 'roof_mill_cap', verts=18,
              ry=(top + 0.24) * math.cos(t * 1.35) + 0.02)
    k.cone(cx, cr + 0.06, h + 0.97, h + 1.3, 0.05, 0.0, A.IRON, 'mill_finial', verts=6)
    # the door, a stage round it on posts, steps
    k.box(cx - 0.26, cr + rad * 0.92, 0.0, cx + 0.26, cr + rad + 0.03, 1.0, ('#5a3a24', 0.2), 'mill_door')
    k.cyl_y(cx, cr + rad * 0.92, cr + rad + 0.03, 1.0, 0.26, 0.2, ('#5a3a24', 0.2), 'mill_door', verts=12)
    k.box(cx - 0.32, cr + rad * 0.9, -0.01, cx + 0.32, cr + rad + 0.35, 0.08, ('#9a8e84', 0.2), 'step')
    for (wz, wx) in ((1.5, -0.28), (2.45, 0.22)):
        k.box(cx + wx - 0.11, cr + rad * 0.86, wz, cx + wx + 0.11, cr + rad * 0.86 + 0.05, wz + 0.28, '#4a2a18', 'mill_window',
              emit=('#ffd890', 0.7))
        k.box(cx + wx - 0.14, cr + rad * 0.86, wz - 0.04, cx + wx + 0.14, cr + rad * 0.86 + 0.08, wz, '#d8ccc0', 'mill_sill')
    hub = (cx, cr + top + 0.32, h + 0.45)
    k.cyl_y(cx, cr + top - 0.1, cr + top + 0.36, h + 0.45, 0.11, 0.11, '#3a2a20', 'mill_axle', verts=10)
    k.sphere(hub[0], hub[1] + 0.04, hub[2], 0.13, 0.13, A.IRON, 'mill_boss', segs=10)
    L = 2.1
    for i in range(sails):
        a = i * math.tau / sails + 0.35
        ca, sa = math.cos(a), math.sin(a)
        tip = (cx + ca * L, hub[1], hub[2] + sa * L)
        k.tube(hub, tip, 0.045, '#4a3020', 'mill_spar', verts=5)
        px, pz = -sa, ca
        canvas = i != 1                                                  # one sail stripped to its lattice
        for t in (0.3, 0.42, 0.54, 0.66, 0.78, 0.9, 1.0):
            c = (cx + ca * L * t, hub[1] + 0.02, hub[2] + sa * L * t)
            k.tube(c, (c[0] + px * 0.36, c[1], c[2] + pz * 0.36), 0.013, '#4a3020', 'mill_lath', verts=4)
        e0 = (cx + ca * L * 0.3 + px * 0.36, hub[1] + 0.02, hub[2] + sa * L * 0.3 + pz * 0.36)
        e1 = (tip[0] + px * 0.36, hub[1] + 0.02, tip[2] + pz * 0.36)
        k.tube(e0, e1, 0.014, '#4a3020', 'mill_lath', verts=4)
        if canvas:
            k.poly([(cx + ca * L * 0.3, hub[1] + 0.04, hub[2] + sa * L * 0.3), (tip[0], hub[1] + 0.04, tip[2]),
                    (tip[0] + px * 0.34, hub[1] + 0.04, tip[2] + pz * 0.34),
                    (cx + ca * L * 0.3 + px * 0.34, hub[1] + 0.04, hub[2] + sa * L * 0.3 + pz * 0.34)],
                   ('#ece0d4', 0.3), 'mill_sail')
        for j in range(3):                                               # the shell chimes
            k.cyl(tip[0] + (j - 1) * 0.06, hub[1] + 0.06, tip[2] - 0.32 - j * 0.04, tip[2] - 0.05, 0.013, '#f6e6f0', 'chime',
                  verts=5)
    k.solid(cx - rad, cr - rad, cx + rad, cr + rad)


tower_mill(*MILL)
# at its foot: sacks, a handcart, a millstone leaning on the wall
for (x, r) in ((11.7, 23.55), (11.95, 23.35), (12.15, 23.6)):
    k.blob(x, r, 0.2, 0.17, 0.14, 0.22, ('#d8c8a0', 0.3), 'sack', segs=8)
    k.cyl(x, r, 0.38, 0.44, 0.06, '#a08a60', 'sack_tie', verts=6)
k.cyl_y(9.75, 23.0, 23.14, 0.3, 0.3, 0.3, ('#9a9088', 0.2), 'millstone', verts=16)
MEMO = (8.0, 32.6)
I.standing_stone(k, MEMO[0], MEMO[1], h=1.1, tone='#9a9098', glyph='#f080b0')
for i in range(5):
    a = i * math.tau / 5
    k.sphere(MEMO[0] + math.cos(a) * 0.5, MEMO[1] + 0.25 + math.sin(a) * 0.3, 0.08, 0.05, 0.04, CRYSTAL[0], 'rose',
             emit=(CRYSTAL[1], 0.7), segs=6)
for (dx, dr) in ((-0.38, 0.32), (0.4, 0.3)):                                  # two candles in jars at its foot
    k.cyl(MEMO[0] + dx, MEMO[1] + dr, 0.0, 0.14, 0.05, ('#d8e0e4', 0.1), 'jar', verts=8)
    A.candle(k, MEMO[0] + dx, MEMO[1] + dr, 0.02, energy=1.5)
JX = max(c for (c, r) in land if r == 26 and c < 26) + 1          # the west arm's cove shore
W.dock(k, JX + 0.05, JX + 1.6, 25.6, 26.4, z=0.02)
W.rowboat(k, JX + 1.7, JX + 3.5, 26.9)
I.fishing_jetty(k, FJ, FLEN, 'e', glow='#ff80c0')
I.crab_pots(k, JX - 0.9, 25.0)
k.solid(JX - 1.0, 24.8, JX, 25.4)
# nets drying on poles by the crab pots
for (x0, r0, x1, r1) in ((JX - 2.6, 24.3, JX - 1.2, 24.25),):
    for x in (x0, x1):
        k.cyl(x, r0, 0.0, 1.0, 0.03, A.WOOD_D, 'net_pole', verts=6)
    for j in range(9):
        t = j / 8
        x = x0 + (x1 - x0) * t
        sag = 0.12 * math.sin(math.pi * t)
        k.tube((x, r0 + 0.01, 0.96 - sag), (x + rng.uniform(-0.03, 0.03), r0 + 0.02, 0.35), 0.008, '#8a8070', 'net', verts=4)
    k.tube((x0, r0, 0.96), (x1, r0, 0.96), 0.01, '#8a8070', 'net', verts=4)
    for zz in (0.5, 0.7):
        k.tube((x0, r0 + 0.01, zz), (x1, r0 + 0.01, zz - 0.05), 0.007, '#8a8070', 'net', verts=4)
    k.solid_post(x0, r0)
    k.solid_post(x1, r0)

WL.tick('east: the hot springs, the bathho')
# ---- east: the hot springs, the bathhouse, the old mine ----------------------------------------------------------------
for i, (cx, cr, rx, ry) in enumerate(POOLS):
    R, d_, edge = SPRINGS[i]
    WL.water(k, cx, cr, edge, SPRING_Z, ('#5aa4a8', 0.08), part='pond_water')
    # sinter rims: pale lips of mineral round the water, stepped where it has overflowed
    rr = random.Random(70 + i)
    for j in range(46):
        th = j / 46 * math.tau + rr.uniform(-0.04, 0.04)
        x, r = edge(th, rr.uniform(1.0, 1.06))
        s = rr.uniform(0.12, 0.2)
        k.blob(x, r, SPRING_Z + 0.025, s, s * 0.7, 0.035, (shade(rr.choice(('#e2d6c0', '#d6c6a8', '#ccb48c')), rr.uniform(0.92, 1.05)), 0.2),
               'sinter_lip', rot=(0, 0, math.degrees(th)), segs=8)
    for _ in range(6):                                                    # pink crystals under the shallows
        th = rr.uniform(0, math.tau)
        x, r = edge(th, rr.uniform(0.75, 0.9))
        k.tube((x, r, SPRING_Z - 0.12), (x + rr.uniform(-0.05, 0.05), r, SPRING_Z + 0.03), 0.03, CRYSTAL[0], 'crystal',
               rb=0.004, emit=(CRYSTAL[1], 0.6), verts=5, smooth=False)
    WL.bank(k, lambda th, f=1.0, e=edge: e(th, f * 1.1), lambda x, r: SPRING_Z, SPRING_Z, seed=80 + i, stones=14, clumps=2,
            stone_tones=('#9a9088', '#b0a494', '#8a8078'), reed_tones=('#5a7a3a', '#6a8a44', '#7a9a4a'))


def bathhouse(x0, x1, r_back, r_front, roof=ROOF):
    """An open-fronted timber bathhouse on a stone footing: a board back wall, four posts with knee braces, a shingled
    hip roof with deep eaves, paper lanterns, towels on a rail, a bench, buckets and a pair of sandals."""
    k.box(x0 - 0.05, r_back - 0.05, 0.0, x1 + 0.05, r_front + 0.05, 0.16, ('#8a8278', 0.2), 'footing', bevel=0.02)
    rr_ = r_back
    while rr_ < r_front - 0.01:
        k.box(x0, rr_ + 0.01, 0.16, x1, min(r_front, rr_ + 0.22) - 0.01, 0.2, (shade('#9a7448', rng.uniform(0.85, 1.08)), 0.2),
              'bath_deck')
        rr_ += 0.22
    x = x0
    while x < x1 - 0.01:                                               # the back wall in vertical boards
        k.box(x + 0.005, r_back, 0.2, min(x1, x + 0.2) - 0.005, r_back + 0.12, 1.75, (shade('#7a5a3a', rng.uniform(0.85, 1.1)), 0.2),
              'bath_wall')
        x += 0.2
    for x in (x0 + 0.1, x1 - 0.1):
        for r in (r_back + 0.1, r_front - 0.1):
            k.box(x - 0.08, r - 0.08, 0.16, x + 0.08, r + 0.08, 1.75, ('#4a3020', 0.15), 'bath_post')
        k.tube((x, r_front - 0.1, 1.35), (x + (0.4 if x < (x0 + x1) / 2 else -0.4), r_front - 0.1, 1.72), 0.035, '#4a3020',
               'bath_post', verts=4)
    k.box(x0, r_front - 0.16, 1.7, x1, r_front - 0.04, 1.8, ('#4a3020', 0.15), 'bath_beam')
    with WL.own_dice(k, 4501):                                          # a shingled gable roof with rafter ends, the trim
        W._gable_roof(k, x0, x1, r_back, r_front, 1.8, 0.85, roof, over=0.4)
        HK.rafter_ends(k, x0 - 0.4, x1 + 0.4, r_front, 0.4, 1.8, '#4a3020')
        HK.scallop_trim(k, x0 - 0.4, x1 + 0.4, r_front + 0.445, 1.8, '#efe6d2')
    for x in (x0 + 0.5, x1 - 0.5):
        k.sphere(x, r_front + 0.05, 1.45, 0.13, 0.17, '#a03050', 'paper_lantern', emit=('#ff8090', 0.8), segs=8)
        k.cyl(x, r_front + 0.05, 1.6, 1.7, 0.01, '#2a2020', 'lantern_cord', verts=4)
        k.point_light(x, r_front + 0.4, 1.4, '#ff9090', 10, radius=0.1, group='flicker')
    k.tube((x0 + 0.3, r_back + 0.2, 1.0), (x1 - 0.3, r_back + 0.2, 1.0), 0.02, A.WOOD, 'towel_rail', verts=5)
    for j, col in enumerate(('#f0e8e0', '#e890b0', '#f0e8e0', '#a0c8d8')):
        tx = x0 + 0.5 + j * (x1 - x0 - 1.0) / 3
        k.box(tx - 0.15, r_back + 0.18, 0.62, tx + 0.15, r_back + 0.24, 1.02, (col, 0.3), 'towel')
    W.bench(k, x0 + 0.4, x1 - 0.6, r_back + 0.55)
    k.cyl(x1 - 0.35, r_front - 0.35, 0.2, 0.42, 0.13, ('#7a5a34', 0.2), 'bath_bucket', verts=10)
    for dx in (0.0, 0.14):
        k.box(x0 + 0.5 + dx, r_front - 0.3, 0.2, x0 + 0.6 + dx, r_front - 0.08, 0.23, '#6a4a2a', 'sandal')
    k.solid(x0, r_back, x1, r_front)


bathhouse(45.4, 48.6, 18.0, 20.0)
MINE = (45.0, 31.0)


def mine_head(cx, r_face, w=1.4, h=1.5, wood='#5a3a22', glow='#f080b0'):
    """The old mine: a rock outcrop of strata and boulders round a timbered adit, rails running out past a cart of
    roseite, a lamp on the frame, the miner's sign, a spoil heap, a pick and a shovel against the rock."""
    rr = random.Random(91)
    # the outcrop: a heap of big faceted rocks over a core, their tops grassed, smaller rocks at its foot
    k.box(cx - w / 2 - 0.9, r_face - 1.6, 0.0, cx + w / 2 + 0.9, r_face - 0.1, h + 0.15, ('#6a5e62', 0.25), 'outcrop', bevel=0.12)
    for (dx, dr, z, s_) in ((-1.0, -0.4, h + 0.1, 0.6), (1.0, -0.45, h + 0.1, 0.62), (0.0, -0.5, h + 0.35, 0.65), (-1.6, -1.2, h, 0.55),
                            (1.6, -1.2, h, 0.55)):                       # boulders heaped over its top
        k.rock(cx + dx, r_face + dr, z, s_, s_ * 0.8, s_ * 0.7, (shade('#766a6e', rr.uniform(0.85, 1.1)), 0.22), part='outcrop_rock',
               segs=10, jitter=0.15, seed=rr.randrange(10 ** 6))
    for (dx, dr, z, s) in ((-1.35, -0.6, 0.55, 0.75), (1.35, -0.6, 0.55, 0.78), (-0.9, -1.0, 1.55, 0.7), (0.9, -1.05, 1.6, 0.68),
                           (0.0, -1.2, 2.0, 0.8), (-1.6, -0.2, 0.2, 0.5), (1.65, -0.2, 0.2, 0.52), (-0.4, -1.4, 2.3, 0.5),
                           (0.6, -1.3, 2.25, 0.45)):
        k.rock(cx + dx, r_face + dr, z, s, s * 0.8, s * 0.75, (shade('#766a6e', rr.uniform(0.85, 1.1)), 0.22), part='outcrop_rock',
               segs=10, jitter=0.15)
        if z > 1.2:
            k.blob(cx + dx, r_face + dr - 0.05, z + s * 0.62, s * 0.62, s * 0.5, s * 0.14, (GREEN, 0.3), 'grass', segs=10)
    for _ in range(5):
        a = rr.uniform(0, math.pi)
        s = rr.uniform(0.3, 0.55)
        k.tube((cx + math.cos(a) * (w / 2 + 0.5), r_face - 0.4, 0.4 + s), (cx + math.cos(a) * (w / 2 + 0.55), r_face - 0.4, 0.4 + s * 1.6),
               0.04, CRYSTAL[0], 'crystal', rb=0.004, emit=(CRYSTAL[1], 0.6), verts=6, smooth=False)
    k.box(cx - w / 2, r_face - 0.15, 0.0, cx + w / 2, r_face - 0.05, h, '#060406', 'mine_dark')
    k.box(cx - w / 2 + 0.2, r_face - 0.14, 0.05, cx + w / 2 - 0.2, r_face - 0.13, 0.4, '#200814', 'mine_glow', emit=(glow, 0.35))
    for x in (cx - w / 2 - 0.08, cx + w / 2 - 0.04):
        k.box(x, r_face - 0.12, 0.0, x + 0.12, r_face + 0.02, h + 0.1, (wood, 0.15), 'mine_post')
        k.tube((x + 0.06, r_face + 0.0, h - 0.35), (cx, r_face + 0.0, h + 0.02), 0.035, wood, 'mine_brace', verts=4)
    k.box(cx - w / 2 - 0.2, r_face - 0.12, h, cx + w / 2 + 0.2, r_face + 0.04, h + 0.16, (wood, 0.15), 'mine_lintel')
    k.box(cx - 0.42, r_face + 0.05, h + 0.18, cx + 0.42, r_face + 0.08, h + 0.48, ('#c8b890', 0.25), 'mine_sign')
    k.box(cx - 0.32, r_face + 0.08, h + 0.28, cx + 0.32, r_face + 0.085, h + 0.38, '#3a2418', 'mine_sign_text')
    W.lantern(k, cx + w / 2 + 0.2, r_face + 0.15, h - 0.4, h - 0.16, s=0.09, energy=8)
    for x in (cx - 0.25, cx + 0.25):
        k.box(x - 0.02, r_face - 0.1, 0.0, x + 0.02, r_face + 2.2, 0.03, '#6a6a70', 'rail')
    r = r_face + 0.1
    while r < r_face + 2.2:
        k.box(cx - 0.4, r, -0.005, cx + 0.4, r + 0.08, 0.015, ('#4a3020', 0.15), 'sleeper')
        r += 0.3
    k.box(cx - 0.3, r_face + 1.4, 0.08, cx + 0.3, r_face + 1.9, 0.45, ('#5a4a40', 0.12), 'mine_cart', bevel=0.02)
    for (wx, wr) in ((cx - 0.31, r_face + 1.5), (cx - 0.31, r_face + 1.8), (cx + 0.31, r_face + 1.5), (cx + 0.31, r_face + 1.8)):
        k.cyl_x(wx - 0.02, wx + 0.02, wr, 0.1, 0.09, 0.09, A.IRON, 'cart_wheel', verts=10)
    for j in range(6):
        k.tube((cx - 0.2 + j * 0.08, r_face + 1.65 + rr.uniform(-0.12, 0.12), 0.4),
               (cx - 0.2 + j * 0.08 + rr.uniform(-0.04, 0.04), r_face + 1.65, 0.55 + rr.uniform(0, 0.12)), 0.035, CRYSTAL[0], 'cart_ore',
               rb=0.004, emit=(glow, 0.55), verts=5, smooth=False)
    # the spoil heap to the east, a pick and a shovel leaning on the rock to the west
    for _ in range(14):
        a, d = rr.uniform(0, math.tau), rr.uniform(0, 0.7)
        s = rr.uniform(0.08, 0.18)
        k.rock(cx + 2.1 + math.cos(a) * d, r_face + 0.6 + math.sin(a) * d * 0.6, s * 0.2 + (0.7 - d) * 0.25, s, s * 0.8, s * 0.6,
               (shade('#6a5e62', rr.uniform(0.8, 1.1)), 0.2), part='spoil', segs=6)
    k.tube((cx - 1.3, r_face + 0.2, 0.0), (cx - 1.42, r_face - 0.05, 0.9), 0.02, A.WOOD, 'tool_handle', verts=4)
    k.tube((cx - 1.55, r_face - 0.06, 0.9), (cx - 1.25, r_face - 0.02, 0.86), 0.025, A.IRON, 'pick_head', verts=4)
    k.tube((cx - 1.0, r_face + 0.2, 0.15), (cx - 1.05, r_face - 0.05, 0.95), 0.02, A.WOOD, 'tool_handle', verts=4)
    k.box(cx - 1.08, r_face + 0.12, 0.0, cx - 0.92, r_face + 0.25, 0.22, A.IRON, 'shovel')
    k.point_light(cx, r_face + 0.3, 0.6, glow, 8, radius=0.2, group='flicker')
    k.solid(cx - w / 2 - 1.0, r_face - 1.6, cx + w / 2 + 1.0, r_face - 0.1)
    k.solid(cx - 0.35, r_face + 1.35, cx + 0.35, r_face + 1.95)


mine_head(MINE[0], MINE[1])
for (x, r) in ((39.0, 20.0), (48.6, 22.6), (38.8, 28.6)):        # between the pools: small, walk past them
    WL.crystal_cluster(k, x, r, s=0.8, col=(GEM, CRYSTAL[1]), energy=10)

WL.tick('the meadow: rose drifts, wildflow')
# the way up to Rosewell, the bathhouse town on the hill behind the springs (its own world: js/rose.js puts the door on
# (52, 22)): stone steps climbing a grassy knoll off the island's east edge, a finger post and a lantern at their foot
for (x, r, sz) in ((54.6, 21.5, 0.55), (54.9, 23.3, 0.6), (55.6, 22.2, 0.7), (53.9, 20.9, 0.4), (54.1, 23.9, 0.42)):
    WL.boulder(k, x, r, s=sz, tone='#8a7e80', moss='#5a8a3c', z=-0.1, solid=False)          # the rocky shoulder the steps climb
for i in range(6):
    x = 52.75 + i * 0.3
    z = 0.06 + i * 0.17
    k.box(x, 22.05 - i * 0.02, -0.2, x + 0.34, 22.95 + i * 0.02, z, (shade('#a89c90', rng.uniform(0.88, 1.08)), 0.2), 'stone_step', bevel=0.02)
for (x, r) in ((52.95, 21.75), (53.05, 23.25), (53.9, 21.8), (54.0, 23.2)):
    WL.boulder(k, x, r, s=rng.uniform(0.2, 0.3), tone='#8a7e80', moss='#5a8a3c', solid=False)
WL.lantern_post(k, 52.15, 21.75, h=1.7, energy=14, glow='#ff70c0')
WL.signpost(k, 51.6, 23.35, arms=((0.7, '#d8c8a0'), (-0.6, '#c8b890')))

# ---- the meadow: rose drifts, wildflowers, walls, boulders ----------------------------------------------------------
busy = lambda x, r: pd(x, r) < 0.75
meadow_cells = [c for c in walk if c[0] < 20 and c[1] > 14]


# cells the game uses on this island (its JS and data): new obstacles keep well clear of them — the harbourmaster
# (js/harbour.js), the message in a bottle (js/bottle.js), the fish auction (js/events.js), the nets and their mender
# (js/harbourlife.js), the glass feather (js/magic.js), the treasure spots (js/treasure.js), the forage (assets/forage.json),
# the fishing spots (assets/fishing.json) and the way up to Rosewell (js/rose.js)
RESERVED = [(30, 19), (25, 21), (24, 16), (23, 16), (25, 17), (23, 17), (24, 17), (20, 19), (21, 20), (22, 20), (9, 24), (11, 26),
            (8, 35), (39, 20), (7, 17), (17, 26), (47, 28), (38, 24), (23, 30), (23, 32), (25, 31), (14, 39), (52, 22), (51, 22)]
WALKER_PATHS = [[(28, 13), (28, 6)], [(21, 14), (27, 14)], [(14, 12), (14, 17), (13, 21), (12, 24), (10, 29)], [(37, 29), (42, 29)]]


def clear_of_things(x, r, rad):
    if any(math.hypot(x - (a + 0.5), r - (b + 0.5)) < 1.2 + rad for (a, b) in RESERVED) \
            or I.path_dist([[(a + 0.5, b + 0.5) for (a, b) in w] for w in WALKER_PATHS], x, r) < 0.9 + rad:
        return False
    return (pd(x, r) > 0.7 + rad and math.hypot(x - MILL[0], r - MILL[1]) > 1.4 + rad and math.hypot(x - MEMO[0], r - MEMO[1]) > 1.0 + rad
            and (int(x), int(r)) in walk and pool_d(x, r) > 2.2 and not (JX - 3.0 < x < JX + 2 and 23.5 < r < 27.5)
            and not (FJ[0] - 1 < x < FJ[0] + FLEN + 1 and FJ[1] - 0.8 < r < FJ[1] + 1.6))


# rose drifts: bushes in clumps of a few, their blooms glowing softly by night
drift_c = [(6.5, 18.5), (15.5, 19.6), (5.2, 25.8), (14.6, 27.4), (12.4, 33.0), (6.3, 29.6), (16.8, 23.6), (4.6, 21.8)]
for (dx, dr) in drift_c:
    for _ in range(rng.randint(4, 7)):
        x, r = dx + rng.uniform(-1.3, 1.3), dr + rng.uniform(-0.9, 0.9)
        if clear_of_things(x, r, 0.4) and terrain.z(x, r) > -0.05:
            WL.shrub(k, x, r, s=rng.uniform(0.3, 0.42), tone=rng.choice(('#3e6a34', '#467238', '#38602e')), blooms=ROSE,
                     bloom_glow='#ff80c0')
# wildflower clumps and heather over the whole island's turf
for _ in range(420):
    x, r = rng.uniform(3, 53), rng.uniform(5, 38)
    if clear_of_things(x, r, 0.1) and terrace_h(x, r) is None and terrain.z(x, r) > -0.04 \
            and material(x, r) in ('grass', 'grass_dark', 'meadow', 'meadow_dark'):
        WL.flowers(k, x, r, n=rng.randint(6, 12), cols=('#f8f0f4', '#f0d050', '#f0a0c8', '#c8a8f0', '#ffffff'))
# groves: a few trees together in the open ground well off the paths, shrubs and ferns under them, heather round the edge
GROVES = []
for _ in range(3000):
    x, r = rng.uniform(4, 52), rng.uniform(6, 37)
    if clear_of_things(x, r, 1.8) and terrace_h(x, r) is None and pool_d(x, r) > 5 and pd(x, r) > 2.6 \
            and math.hypot(x - 46.5, r - 19) > 3.5 and math.hypot(x - MINE[0], r - MINE[1]) > 3.5 \
            and all(math.hypot(x - a, r - b) > 5.5 for (a, b) in GROVES + list(TREES)) \
            and all((int(x + dx), int(r + dr)) in walk for dx in (-1.5, 0, 1.5) for dr in (-1.2, 0, 1.2)):
        GROVES.append((x, r))
    if len(GROVES) >= 9:
        break
GROVE_TREES = []
for (gx, gr) in GROVES:
    for j in range(rng.randint(2, 3)):
        x, r = gx + rng.uniform(-0.9, 0.9), gr + rng.uniform(-0.7, 0.7)
        if all(math.hypot(x - a, r - b) > 0.95 for (a, b) in GROVE_TREES):
            GROVE_TREES.append((x, r))
            with WL.own_dice(k, int(x * 100 + r)):
                W.tree(k, x, r, h=rng.uniform(2.1, 2.9), tone=rng.choice(('#3e6a38', '#46723c', '#4e7a40', '#3a6034')))
            k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
    for _ in range(rng.randint(5, 8)):
        a, d = rng.uniform(0, math.tau), rng.uniform(1.0, 1.9)
        x, r = gx + math.cos(a) * d, gr + math.sin(a) * d * 0.8
        roll = rng.random()
        if roll < 0.4:
            WL.shrub(k, x, r, s=rng.uniform(0.26, 0.38), tone=rng.choice(('#3a6430', '#467038')),
                     blooms=rng.choice((None, '#f8f0f4', '#f0d050')))
        elif roll < 0.7:
            WL.fern(k, x, r, s=rng.uniform(0.51, 0.72), tone=rng.choice(('#4a7a34', '#3e6a30')))
        else:
            WL.heather(k, x, r, s=rng.uniform(0.2, 0.3), tone=rng.choice(('#8a4a7a', '#a05a8a')))
# dry-stone walls in short runs a tile off the meadow path, the odd stone fallen out of them
WL.drystone(k, [(12.6, 13.3), (11.4, 16.7)], seed=6, solid=True)
WL.drystone(k, [(11.24, 17.8), (10.7, 20.8)], seed=5, solid=True)
WL.drystone(k, [(9.4, 26.0), (8.2, 28.6), (7.3, 30.2)], seed=7, solid=True)
# boulders with moss and grass at their feet out on the coast's grassy lip, ferns round them and under the trees
LIP = []
for _ in range(400):
    x, r = rng.uniform(1, 55), rng.uniform(3, 40)
    z = terrain.z(x, r)
    if (int(x), int(r)) not in land and -0.03 < z <= 0.0 and abs(x - PX - 0.5) > 1.6 \
            and not (FJ[0] - 1 < x < FJ[0] + FLEN + 1 and FJ[1] - 1 < r < FJ[1] + 2) and not (JX - 1 < x < JX + 4 and 24.5 < r < 28):
        LIP.append((x, r))
placed = []
for (x, r) in LIP:
    if len(placed) < 38 and all(math.hypot(x - a, r - b) > 2.2 for (a, b) in placed):
        placed.append((x, r))
        WL.boulder(k, x, r, s=rng.uniform(0.22, 0.4), tone='#8a7e80', moss='#4e6a34', z=-0.03, tufts='#5a7a3a', solid=False)
        for _ in range(rng.randint(0, 2)):
            a = rng.uniform(0, math.tau)
            WL.fern(k, x + math.cos(a) * 0.45, r + math.sin(a) * 0.3, s=rng.uniform(0.45, 0.64), tone=rng.choice(('#4a7a34', '#3e6a30')))
for (x, r) in TREES + ((MINE[0] - 2.0, MINE[1] - 0.6), (MINE[0] + 2.2, MINE[1] - 0.9), (9.3, 10.4), (14.2, 9.2)):
    for _ in range(2):
        a = rng.uniform(0, math.tau)
        fx, fr = x + math.cos(a) * 0.55, r + math.sin(a) * 0.4
        if pd(fx, fr) > 0.8:
            WL.fern(k, fx, fr, s=rng.uniform(0.48, 0.67), tone=rng.choice(('#4a7a34', '#3e6a30')))

WL.tick('scatter -------------------------')
# the Look Book's small things: stones edging every path, litter and toadstools under the trees, moss mounds, twigs
for i, path in enumerate(PATHS):
    WL.path_stones(k, path, seed=600 + i)
for (x, r) in list(GROVE_TREES) + list(TREES):
    WL.leaf_litter(k, x - 1.0, r - 0.6, x + 1.0, r + 0.9, 14, ok=lambda a, b: pd(a, b) > 0.6, seed=int(x * 100 + r))
    if rng.random() < 0.5:
        WL.mushroom_ring(k, x + rng.uniform(-0.8, 0.8), r + rng.uniform(0.4, 0.8), n=rng.randint(3, 5))
    if rng.random() < 0.6:
        WL.twig(k, x + rng.uniform(-1, 1), r + rng.uniform(0.3, 1.0))
for (gx, gr) in GROVES[:4]:                                     # a fallen log in some of the groves
    a = gx + rng.uniform(-1.2, 0.4)
    if all((int(a + t), int(gr + 1.3)) in walk for t in (0.0, 1.4)) and pd(a + 0.7, gr + 1.3) > 1.2 and clear_of_things(a + 0.7, gr + 1.3, 0.7):
        WL.log(k, a, a + 1.4, gr + 1.3, 0.2, seed=int(gx))
for _ in range(60):
    x, r = rng.uniform(4, 52), rng.uniform(6, 37)
    if clear_of_things(x, r, 0.3) and terrace_h(x, r) is None and pool_d(x, r) > 2.5:
        WL.moss_mound(k, x, r, rng.uniform(0.14, 0.26), moss='#5a8a3c')
# the harvest corner by the pier's foot: crates of roseite, a handcart, a basket, a finger post
for (x, r) in ((25.75, 18.2), (26.3, 18.35)):
    A.crate(k, x, r, s=0.5, solid=True)
    for j in range(5):
        k.tube((x + 0.1 + j * 0.07, r + 0.25, 0.42), (x + 0.1 + j * 0.07 + rng.uniform(-0.03, 0.03), r + 0.25, 0.42 + rng.uniform(0.08, 0.16)),
               0.03, GEM, 'crystal', rb=0.004, emit=(CRYSTAL[1], 0.45), verts=6, smooth=False)
W.cart(k, 24.4, 19.3)
WL.basket(k, 27.2, 18.95, fill=ROSE, glow=CRYSTAL[1], s=0.16)
WL.signpost(k, 26.8, 16.2, arms=((-0.6, '#d8c8a0'), (0.6, '#c8b890'), (-0.55, '#d0c098')))

# the harvesters' square where the pier's path meets the terraces' and the paths east and west: flagstones, a well, a
# roseite stall under a striped awning, bunting between the lamps, benches, tubs of flowers, crates and sacks
SQUARE = {(c, r) for c in range(26, 32) for r in range(13, 18) if (c, r) in walk and math.hypot(c + 0.5 - 28.6, (r + 0.5 - 15.4) * 1.25) < 3.3}
with WL.own_dice(k, 4601):
    W.flagstones(k, SQUARE, '#a89c90')
    I.well(k, 31.6, 16.7, stone='#a89c90')
    W.market_stall(k, 34.0, 35.6, 15.95, 16.65, awning=('#d0508a', '#f4e6ee'), goods='produce')
    W.bench(k, 25.25, 26.45, 13.25)
    for (x, r) in ((27.05, 12.95), (29.95, 13.1), (32.2, 13.55), (26.7, 17.6)):
        HK.tub(k, x, r, blooms=('#f080b0', '#ffffff'))
    W.bunting(k, (27.3, 13.6, 1.85), (30.5, 16.6, 1.85), cols=('#f080b0', '#f4e6ee', '#c05090', '#f0d070'))
    W.bunting(k, (30.5, 16.6, 1.85), (36.7, 15.4, 1.85), cols=('#f080b0', '#f4e6ee', '#c05090', '#f0d070'))
    A.crate(k, 32.75, 16.15, s=0.42, solid=False)
    for (x, r) in ((36.0, 16.95), (36.25, 17.1)):
        k.blob(x, r, 0.2, 0.17, 0.14, 0.22, ('#d8c8a0', 0.3), 'sack', segs=8)
    # flower boxes along the terraces' foot (the row in front of them stays walkable where the harvest is)
    for (x0, x1) in ((19.3, 21.9), (30.0, 33.0), (34.2, 36.7)):
        W.planter(k, x0, x1, 11.68, flowers=('#f080b0', '#ffffff', '#c8a8f0'))
    # dinghies moored either side of the pier
    for (x0, x1, r, yaw) in ((25.9, 27.4, 22.4, 8), (29.7, 31.2, 21.7, -10)):
        sp_ = len(k.parts)
        W.rowboat(k, x0, x1, r, beam=0.62, oars=False)
        I.pose(k, sp_, ((x0 + x1) / 2, r, 0), yaw=yaw, dz=C.WZ + 0.08)
    # by the springs: a bench, paper lanterns on poles, a stack of folded towels, buckets
    W.bench(k, 39.6, 40.8, 22.7)
    for (x, r) in ((40.1, 24.6), (43.9, 22.9), (44.0, 26.9)):
        k.cyl(x, r, 0.0, 1.45, 0.03, A.WOOD_D, 'lantern_pole', verts=6)
        k.sphere(x + 0.12, r, 1.3, 0.11, 0.14, '#a03050', 'paper_lantern', emit=('#ff8090', 0.8), segs=8)
        k.point_light(x + 0.12, r + 0.3, 1.25, '#ff9090', 6, radius=0.1, group='flicker')
        k.solid_post(x, r)
    for j, col in enumerate(('#f0e8e0', '#e890b0', '#f0e8e0')):
        k.box(44.55, 21.0, 0.0 + j * 0.07, 44.95, 21.3, 0.07 + j * 0.07, (col, 0.3), 'towel')
    for (x, r) in ((40.7, 25.6), (45.2, 23.2)):
        k.cyl(x, r, 0.0, 0.24, 0.11, ('#7a5a34', 0.2), 'bucket', verts=10)
        k.cyl(x, r, 0.2, 0.23, 0.095, '#5aa4a8', 'bucket_water', verts=10)

# ---- scatter --------------------------------------------------------------------------------------------------------
SHORE = {(c + dc, r + dr) for (c, r) in land for dc in (-1, 0, 1) for dr in (-1, 0, 1)}      # the land and the coast's lip
k.later.append(lambda: W.meadow(k, '#5a8040', cells=sorted(SHORE - set(TERRACE_CELLS)),
                                ok=('ground', 'grass', 'coast_lip', 'coast_g:grass', 'coast_g:meadow'), density=1.0, avoid=busy,
                                flowers=0.7, h=(0.06, 0.136)))
k.later.append(lambda: W.meadow(k, GREEN, cells=TERRACE_CELLS, ok=('grass',), density=0.9, flowers=0.6, h=(0.07, 0.13)))
k.later.insert(0, lambda: WL.merge_parts(k))               # before the grass
WL.fast_top(k)                                             # the grass's rays: one BVH tree, not every object in turn
k.later.append(lambda: WL.merge_parts(k))                  # and after it (see WL.merge_parts)
I.pebbles(k, walk, '#8a7e78', per_cell=0.2, avoid=lambda x, r: pd(x, r) > 0.6)
for (x, r) in ((7.4, 17.0), (17.2, 26.6), (35.0, 5.6), (21.4, 6.0), (47.6, 28.4), (38.8, 24.4)):
    WL.crystal_cluster(k, x, r, s=rng.uniform(0.6, 1.0), col=(GEM, CRYSTAL[1]), energy=8)

WL.tick('light ---------------------------')
# ---- light ----------------------------------------------------------------------------------------------------------
k.area_light(28.0, 18.0, 16.0, '#9a90c8', 2600, 40.0, rot=(math.radians(-35), 0, 0))         # moonlight
k.point_light(28.0, 14.0, 4.0, '#ffd8e0', 60, radius=1.5)

WL.tick('render')
k.later.insert(0, lambda: WL.tick('later: grass'))
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=96,
         world_light=('#3a2a40', 0.75))

WL.tick('the world -----------------------')
# ---- the world ------------------------------------------------------------------------------------------------
old = json.load(open(WORLD))
byl = {i.get('label'): i for i in old['interactions']}
dock = dict(byl['DOCK'])
dock.update({'x': PX, 'y': pier_top + 1})


def keep(label, x, y):
    it = dict(byl[label])
    it.update({'x': x, 'y': y})
    return it


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = {'name': 'Rose Cove', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [PX, pier_top - 1]}, 'moonColor': old.get('moonColor'), 'shipExit': old.get('shipExit', True),
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         dock,
         keep('CRYSTAL HARVESTER', 24, 12),
         keep('WORKSHOP', 12, 10),
         keep('ROSE CRYSTAL', 23, 12),
         keep('ROSE LANTERN', 27, 14),
         keep('ABANDONED VIAL', 45, 10),
         keep('WIND CHIMES', 14, 11),
         look('TERRACES', 28, 9, 'ROSEITE GROWN IN ROWS LIKE VINES, WATERED A DROP AT A TIME.\n\nTHE BEDS HUM WHEN THE TIDE COMES IN, ALL OF THEM IN THE SAME NOTE.'),
         {'x': 42, 'y': 9, 'type': 'enter_world', 'target': 'lumar-rose-glasshouse', 'spawn': [7, 9], 'label': 'GLASSHOUSE', 'prompt': 'PRESS E TO GO IN'},
         look('WINDMILL', 11, 24, 'A STONE MILL WITH SAILS OF PATCHED CANVAS. SHELL CHIMES HANG FROM EVERY SAIL TIP.\n\nIT GRINDS NOTHING. IT ONLY TURNS, AND RINGS.'),
         look('MEMORIAL', 8, 33, 'A SMALL STONE AMONG THE ROSES. CARVED ON IT:\n\n"E.B. - PILOT. SHE LISTENED."\n\nTHE SHIP MARK BELOW THE NAME IS YOURS.'),
         look('CRAB POTS', JX - 1, 26, 'CRAB POTS, STILL WET. ONE HOLDS A CRAB THE COLOUR OF ROSEITE.\n\nIT HUMS.'),
         look('HOT SPRING', 42, 24, 'STEAMING WATER, PINK AT THE BOTTOM WHERE THE CRYSTALS GROW.\n\nIT SMELLS OF SALT AND IRON AND, FAINTLY, ROSES.'),
         look('BATHHOUSE', 47, 20, 'AN OPEN BATHHOUSE ON POSTS, TOWELS FOLDED ON A BENCH, TWO PAPER LANTERNS.\n\nA SIGN: "HARVESTERS FIRST. VISITORS AFTER DARK."'),
         {'x': 45, 'y': 32, 'type': 'enter_world', 'label': 'OLD MINE', 'prompt': 'PRESS E TO GO IN', 'target': 'lumar-rose-mine',
          'spawn': [8, 10]},                     # the Rose Mine (scenes/lumar_rose_mine.py, js/mine.js)
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER + [(JX, 26)] + FJET, scene_id='lumar-rose',
            actors=[{'sheet': 'npc-harvester', 'x': 24, 'y': 12, 'facing': 'down'}],
            scene_extra={'backdrop': True, 'steam': [[cx, round(cr - 0.1, 2)] for (cx, cr, rx, ry) in POOLS]})
w = json.load(open(WORLD))
for r in range(ROWS):                     # only the island is ground: no walking on the sea or in the springs
    for c in range(COLS):
        if ((c, r) not in land or (c, r) in POOL_SOLID) and (c, r) not in PIER and (c, r) != (JX, 26) and (c, r) not in FJET:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -1.5, COLS + 0.5, ROWS + 1.0]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('rose done; pier', pier_top, 'ship row', SHIP_R, 'jetty', JX, 'walkable', len(walk))
