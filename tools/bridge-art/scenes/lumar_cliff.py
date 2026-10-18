"""Lanternfall — the cliff town on the Sapphire Sea (world id "lumar-cliff"). Workstream B1.

  BVENV/bin/python tools/bridge-art/scenes/lumar_cliff.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-cliff

Beck: "I like a cliff town idea. That's a fun one." Santorini on Lumar: a drowned volcano whose rim stands out of the
sea as a crescent, the caldera's inner wall falling to a little harbour, the town stacked along the top of it — white
houses and blue domes on three terraces, the rim walk with its windmills and the great church, the cliff-top
promenade — and a stair of switchbacks zigzagging down the banded cliff to the water, a lantern at every turn. Out in
the caldera a black lava islet still smokes.

How it's laid out (rows run toward you, z is up; everything on the terraces is built at ground level and lifted):

  rows  3-6   the rim's outer slope, falling north to the sea (out of sight behind the crest)
  rows  7-12  the rim, z 9: the great church, the windmills, the taverna; the rim walk along rows 11-12
  rows 13-16  the upper terrace, z 7.5: houses against the rim's wall (rows 13-14), its lane (15-16)
  rows 17-20  the lower terrace, z 6: houses (17-18), the promenade along the cliff's edge (19-20)
  rows 21-28  the caldera wall, falling to the water: banded rock, cave houses, the zigzag stair down its east end
  rows 29-31  the old port, z 0: the quay, the fish taverna, boathouses, the donkeys; the pier south from row 32

The ground's height is one function (H) for everything: the land's mesh, where things stand, and the world's
`scene.heights` — the height of every tile, so the game draws whoever stands on a terrace up on it (js/scene.js).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_coast as C               # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_cliff as CL              # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-cliff.json')
COLS, ROWS = 60, 50
k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=1.0, margin_x=0.5, seed=2207)
rng = k.rng
C45 = math.cos(math.radians(45))

RIM_Z, L2_Z, L1_Z = 9.0, 7.5, 6.0
RIM_LANE = (11, 12)                  # rows
L2_HOUSE, L2_LANE = (13, 14), (15, 16)
L1_HOUSE, L1_LANE = (17, 18), (19, 20)
FACE = (21, 28)
QUAY0, QUAY = 29, 31                 # the quay's rows; south of row 31 is the harbour
TX0, TX1 = 11, 49                    # the town's width (columns)
ZZ0, ZZ1 = 43, 49                    # the zigzag's columns
EAST_L1 = 55                         # the lower terrace's east end
PX = 30                              # the sloop's pier
PIER = [(PX, r) for r in range(QUAY + 1, QUAY + 4)]
SHIP_R = QUAY + 4
SL = 7.0
FX = 19                              # the fishing jetty
FLEN = 5
FPIER = I.jetty_cells((FX, QUAY + 1), FLEN, 's')
ISLET = (23.0, 41.5, 3.6, 2.4)       # the lava islet in the caldera: centre, radii

# stairs between the terraces: (column, from_row, to_row, z_top, z_bottom) — a flight down toward the viewer
STAIRS = [(17, 13, 14, RIM_Z, L2_Z), (34, 13, 14, RIM_Z, L2_Z),
          (24, 17, 18, L2_Z, L1_Z), (40, 17, 18, L2_Z, L1_Z)]


def zig_path():
    """The zigzag down the caldera wall, cell by cell from the quay to the promenade, each with its height: four legs
    across the face (rows 28, 26, 24, 22), a turn up a row at each end (27, 25, 23, 21)."""
    cells = []
    legs = [28, 26, 24, 22]
    for i, r in enumerate(legs):
        xs = range(ZZ1, ZZ0 - 1, -1) if i % 2 == 0 else range(ZZ0, ZZ1 + 1)
        cells += [(x, r) for x in xs]
        cells.append((ZZ0 if i % 2 == 0 else ZZ1, r - 1))
    n = len(cells)
    return [(c, r, round(L1_Z * (i + 1) / (n + 1), 3)) for i, (c, r) in enumerate(cells)]


ZIG = zig_path()
ZIGZ = {(c, r): z for (c, r, z) in ZIG}


# ---- the island's shape --------------------------------------------------------------------------------------------
def west_edge(r):         # the west arm's inner (east) edge, wandering
    return 10.2 + 0.7 * math.sin(r * 0.45) - max(0.0, r - 36) * 0.25


def east_edge(r):         # the east arm's inner (west) edge
    return 49.6 - 0.6 * math.sin(r * 0.5 + 1.0) + max(0.0, r - 34) * 0.3


LOBES = [(30, 16, 27.5, 13.5), (6.5, 30, 4.2, 14.5), (53.5, 27, 3.8, 12.5)]
land = I.mask(COLS, ROWS, LOBES, seed=71, amp=0.1)
land = {(c, r) for (c, r) in land
        if r <= QUAY or c + 0.5 < west_edge(r + 0.5) or c + 0.5 > east_edge(r + 0.5)}
land |= {(c, r) for c in range(TX0 - 3, TX1 + 6) for r in range(7, QUAY + 1)}     # the town, its cliff and the quay, whole
land = I.flood(land, (30, 15))
islet = set()
for r in range(ROWS):
    for c in range(COLS):
        u, v = (c + 0.5 - ISLET[0]) / ISLET[2], (r + 0.5 - ISLET[1]) / ISLET[3]
        if u * u + v * v < 1.0 + 0.15 * I.n2(c, r, 0.8, 5):
            islet.add((c, r))
ALL_LAND = land | islet


def in_town(x, r=0):
    """Inside the town's terraces (the lower terrace runs on east past the zigzag's head to the little chapel)."""
    return TX0 <= x < (EAST_L1 if L1_HOUSE[0] <= r < FACE[0] else TX1 + 1)


def stair_at(x, r):
    for (c, ra, rb, zt, zb) in STAIRS:
        if c <= x < c + 1 and ra <= r < rb + 1:
            return zt + (zb - zt) * (r - ra) / (rb + 1 - ra)
    return None


def edge_dist(x, r, cells=None):
    """Distance (tiles) to the nearest cell off the land, searched in a small window."""
    cells = ALL_LAND if cells is None else cells
    best = 4.0
    c0, r0 = int(math.floor(x)), int(math.floor(r))
    for dc in range(-4, 5):
        for dr in range(-4, 5):
            q = (c0 + dc, r0 + dr)
            if q in cells:
                continue
            dx = max(q[0] - x, x - (q[0] + 1), 0.0)
            dy = max(q[1] - r, r - (q[1] + 1), 0.0)
            best = min(best, math.hypot(dx, dy))
    return best


def face_z(x, r):
    """The caldera wall's rock, falling from the promenade to the quay: steep at the top, easing at the foot, ribbed."""
    t = max(0.0, min(1.0, (r - FACE[0]) / (QUAY0 - FACE[0])))
    z = L1_Z * (1 - t) ** 1.25 + 0.18 * I.n2(x, r, 0.9, 3) * math.sin(math.pi * t) + 0.12 * I.n2(x, r, 2.2, 4) * math.sin(math.pi * t)
    return max(0.0, z)


def arm_z(x, r):
    """The arms of the crescent: rock rising off the sea to a crest that falls away southward, cliffs on both sides."""
    top = 8.2 - max(0.0, r - 12) * 0.2
    top = max(1.6, top) * (1 + 0.12 * I.n2(x, r, 0.4, 9))
    d = edge_dist(x, r, land)
    return top * I.smooth(0.0, 2.6, d) + 0.15 * I.n2(x, r, 1.8, 11) * I.smooth(0.2, 1.5, d)


ZIG_BACK = {}                                                     # the row behind each leg, built up level with the leg above it
for (c, r, z) in ZIG:
    if (c, r - 1) not in ZIGZ and (c, r - 2) in ZIGZ:
        ZIG_BACK[(c, r - 1)] = ZIGZ[(c, r - 2)]


def town_H(x, r):
    """The town's own ground: the zigzag, the stairs, the terraces, the caldera wall, the quay."""
    z = ZIGZ.get((int(math.floor(x)), int(math.floor(r))))
    if z is None:
        z = ZIG_BACK.get((int(math.floor(x)), int(math.floor(r))))
    if z is not None:
        return z
    if int(math.floor(r)) == 21 and any(a <= x < b + 1 for (a, b) in ((22, 24), (35, 37))):
        return L1_Z - 0.12                                       # a café balcony out over the drop (its deck sits on this)
    s = stair_at(x, r)
    if s is not None:
        return s
    if r < L2_HOUSE[0]:
        return RIM_Z
    if r < L1_HOUSE[0]:
        return L2_Z
    if r < FACE[0]:
        return L1_Z
    if r < QUAY0:
        return face_z(x, r)
    return 0.0


def H(x, r):
    """The ground's height anywhere."""
    if (int(math.floor(x)), int(math.floor(r))) in islet:
        u, v = (x - ISLET[0]) / ISLET[2], (r - ISLET[1]) / ISLET[3]
        d = math.hypot(u, v)
        return max(0.0, 2.6 * max(0.0, 1 - d) ** 0.8 + 0.2 * I.n2(x, r, 1.4, 21) - 0.4 * I.smooth(0.25, 0.0, d))
    if (int(math.floor(x)), int(math.floor(r))) not in land:
        return 0.0
    if r < 7.0:                                                  # the outer slope
        return RIM_Z * I.smooth(0.0, 3.4, edge_dist(x, r)) + 0.2 * I.n2(x, r, 1.1, 2)
    if in_town(x, r) or (r >= QUAY0 and TX0 - 2 <= x <= TX1 + 3):
        return town_H(x, r)
    if r >= QUAY0:
        return arm_z(x, r)
    # beside the town: the arms' rock rises out of the town's own ground over a few tiles, so the caldera's wall and
    # the terraces run on into the crescent instead of stopping at a straight seam
    east = EAST_L1 if L1_HOUSE[0] <= r < FACE[0] else TX1 + 1
    if x < TX0:
        d, ex = TX0 - x, TX0 + 0.01
    else:
        d, ex = x - east, east - 0.01
    t = I.smooth(0.0, 3.5, d + 0.6 * I.n2(x, r, 0.7, 23))
    return town_H(ex, r) * (1 - t) + arm_z(x, r) * t


# ---- walkable ----------------------------------------------------------------------------------------------------
WALK = set()
for c in range(TX0, TX1 + 1):
    for r in RIM_LANE + L2_LANE + L1_LANE:
        WALK.add((c, r))
for c in range(TX0 + 1, TX1 + 1):
    for r in range(QUAY0, QUAY + 1):
        WALK.add((c, r))
for (c, ra, rb, zt, zb) in STAIRS:
    for r in range(ra, rb + 1):
        WALK.add((c, r))
for (c, r, z) in ZIG:
    WALK.add((c, r))
for c in range(TX1 + 1, EAST_L1 - 1):                           # the promenade runs on past the zigzag's head to the chapel
    for r in L1_LANE:
        WALK.add((c, r))
for (a, b) in [(22, 24), (35, 37)]:                               # the café balconies over the drop
    for c in range(a, b + 1):
        WALK.add((c, 21))
WALK |= set(PIER) | set(FPIER)
WALK = {(c, r) for (c, r) in WALK if (c, r) in land or (c, r) in PIER or (c, r) in FPIER}

# ---- the land: one mesh over the whole island, banded by what it is ------------------------------------------------
STRATA = ('rock_pumice', 'rock_ochre', 'rock_rust', 'rock_pumice', 'rock_grey', 'rock_ochre', 'rock_rust', 'rock_black',
          'rock_ochre', 'rock_pumice', 'rock_rust', 'rock_grey')


def steep(x, r):
    e = 0.18
    return (abs(H(x + e, r) - H(x - e, r)) + abs(H(x, r + e) - H(x, r - e))) / (2 * e)


def material(x, r):
    c, rr = int(math.floor(x)), int(math.floor(r))
    z = H(x, r)
    if (c, rr) in islet:
        return 'cinder' if steep(x, r) > 0.9 else ('lava' if I.n2(x, r, 1.6, 31) > -0.25 else 'cinder')
    if (c, rr) in ZIGZ or (c, rr) in ZIG_BACK:
        return 'path_stone'
    if rr == 21 and any(a <= c <= b for (a, b) in ((22, 24), (35, 37))):
        return 'grout'
    town = in_town(x, r) and FACE[0] > r >= RIM_LANE[0]
    if town or (TX0 <= x < ZZ1 + 1 and r >= QUAY0):
        return 'grout'
    sl = steep(x, r)
    if sl < 0.55 and z > 0.4:
        # the tops (the rim, the arms' crests, the outer slope): dry grass and scrub, bare pumice earth between
        m = I.n2(x, r, 0.5, 41) + 0.4 * I.n2(x, r, 1.7, 42)
        return 'grass' if m > -0.15 else ('scrub' if m > -0.5 else 'earth')
    # the faces: strata in long wavy beds, thin, leaning, with gullies of scree down them and ledges of scrub
    band = int(z * 1.7 + 0.9 * I.n2(x, r, 0.11, 43) + 0.35 * I.n2(x, r, 0.5, 44) + 12) % len(STRATA)
    g = I.n2(x * 2.2, 0.0, 0.9, 45)                              # gullies: narrow, running straight down the face
    if g > 0.72:
        return 'scree'
    if I.n2(x, r, 1.3, 47) > 0.66 and z > 0.6:
        return 'scrub'
    return STRATA[band]


ALB = {'grout': ('#e8e4da', 0.2), 'path_stone': ('#a8a298', 0.06), 'earth': ('#a8947a', 0.3), 'scrub': ('#6a7450', 0.3), 'grass': ('#9a9060', 0.2),
       'scree': ('#9a8e80', 0.3),
       'rock_rust': ('#9a5a42', 0.12), 'rock_black': ('#4a4244', 0.12), 'rock_ochre': ('#b8986a', 0.12),
       'rock_pumice': ('#d8ccb4', 0.12), 'rock_grey': ('#8a8078', 0.12), 'lava': ('#2e2628', 0.3), 'cinder': ('#5a3a32', 0.3)}
FACE_CELLS = {(c, r) for (c, r) in ALL_LAND if in_town(c + 0.5, r + 0.5) and FACE[0] <= r < QUAY0}
I.ground(k, ALL_LAND - FACE_CELLS, material, ALB, height=lambda x, r: H(x, r), dither=0.06)
I.ground(k, FACE_CELLS, material, ALB, height=lambda x, r: H(x, r), dither=0.03, step=0.0625)     # the caldera wall, finer

terrain = C.coast(k, ALL_LAND, ground=(material, ALB), palette='sapphire', grass='#5a6a46', rock='#3a3436', seed=19,
                  beachiness=-0.35,
                  beach_bias=lambda x, r: 0.9 * I.smooth(3.0, 1.0, abs(x - 30.0) / 8.0) * I.smooth(QUAY + 3.0, QUAY + 1.0, r) - 0.6,
                  keep_clear=[(TX0, QUAY + 0.6, TX1 + 1.0, QUAY + 2.0), (PX - 0.4, QUAY, PX + 1.4, SHIP_R + 0.2),
                              (FX - 1.5, QUAY, FX + 2.4, QUAY + FLEN + 2.4),
                              (PX + 0.5 - 0.45 * SL - 0.8, SHIP_R - 0.2, PX + 0.5 + 0.55 * SL + 1.8, SHIP_R + 1.9)],
                  sheer=[(TX0 + 0.9, QUAY + 0.9, TX1 + 1.1, QUAY + 6.0)])

# ---- the old port: the quay ------------------------------------------------------------------------------------------
QX0, QX1 = TX0 + 1.0, TX1 + 1.0
CL.paving(k, QX0, QUAY0, QX1, QUAY + 1.0, seed=1)
k.box(QX0 - 0.1, QUAY + 0.95, C.WZ - 0.6, QX1 + 0.1, QUAY + 1.1, 0.0, ('#6a625a', 0.2), 'quay_wall')
x = QX0
while x < QX1:
    w_ = rng.uniform(0.45, 0.8)
    k.box(x + 0.02, QUAY + 1.06, C.WZ - 0.4, min(QX1, x + w_) - 0.02, QUAY + 1.12, -0.02,
          (shade('#7a7068', rng.uniform(0.85, 1.1)), 0.2), 'quay_block', bevel=0.012)
    x += w_
x = QX0
while x < QX1:                                         # the coping, whitewashed along its lip
    w_ = rng.uniform(0.55, 0.95)
    k.box(x + 0.015, QUAY + 0.8, -0.03, min(QX1, x + w_) - 0.015, QUAY + 1.1, 0.05, (shade(CL.WHITE, rng.uniform(0.9, 1.0)), 0.14),
          'quay_coping', bevel=0.02)
    x += w_
for i in range(80):                                    # weed and barnacles at the tide line
    k.blob(rng.uniform(QX0, QX1), QUAY + 1.13, C.WZ + rng.uniform(0.02, 0.14), rng.uniform(0.06, 0.15), 0.03, rng.uniform(0.03, 0.06),
           (rng.choice(('#2a3a3a', '#2e4040', '#3e4a40', '#5a5a52')), 0.2), 'weed', segs=6)
for bx in (14.5, 23.5, 27.0, 34.0, 37.5, 45.5):              # on the coping's lip, out of the way of the quay's front row
    k.cyl(bx, QUAY + 0.86, 0.04, 0.37, 0.12, ('#2a2a30', 0.1), 'bollard', verts=10)
    k.cyl(bx, QUAY + 0.86, 0.37, 0.42, 0.15, '#2a2a30', 'bollard_cap', verts=10)

# the face's foot: a band of dressed stone where the quay meets the rock, boathouse arches cut into it
CL.retaining(k, QX0, QX1, QUAY0 + 0.02, -0.02, 0.9, stone=True, seed=3)
BOATHOUSES = (13.5, 16.5, 33.0, 36.0, 39.0)
for bx in BOATHOUSES:
    k.box(bx - 0.62, QUAY0 - 0.1, 0.0, bx + 0.62, QUAY0 + 0.05, 0.86, (CL.WHITE, 0.15), 'boathouse_arch', bevel=0.04)
    k.box(bx - 0.48, QUAY0 + 0.03, 0.0, bx + 0.48, QUAY0 + 0.07, 0.56, '#1a1c22', 'boathouse_dark')
    k.cyl_y(bx, QUAY0 + 0.03, QUAY0 + 0.07, 0.56, 0.48, 0.3, '#1a1c22', 'boathouse_dark', verts=14)
    col = rng.choice(CL.BLUES + ('#7a3a2a',))
    k.box(bx - 0.44, QUAY0 + 0.07, 0.0, bx + 0.44, QUAY0 + 0.09, 0.5, (col, 0.15), 'boathouse_door')
    for dx in (-0.22, 0.0, 0.22):
        k.box(bx + dx - 0.008, QUAY0 + 0.09, 0.02, bx + dx + 0.008, QUAY0 + 0.1, 0.48, shade(col, 0.7), 'door_board')

# the fish taverna on the quay: a vine-shaded pergola of tables at the water, a kitchen in the rock
TAV = (20.5, 26.5)
CL.cube_house(k, TAV[0], TAV[1], QUAY0 - 0.6, QUAY0 + 0.75, h=1.25, wall=CL.WHITE, door_x=22.0, windows=[(24.0, 0.45), (25.4, 0.45)],
              parapet=True, chimney_x=25.6, pots_at=[(20.9, 2)], vine=26.2, seed=11)
k.solid(TAV[0], QUAY0, TAV[1], QUAY0 + 0.75)
for (tx, tr) in ((21.0, 30.6), (22.8, 30.6), (24.6, 30.6)):
    k.cyl(tx, tr, 0.0, 0.58, 0.05, '#e8e4dc', 'table_leg', verts=6)
    k.cyl(tx, tr, 0.58, 0.63, 0.34, ('#2a5ad8', 0.2), 'table_cloth', verts=14)
    for dx in (-0.45, 0.45):
        k.box(tx + dx - 0.12, tr - 0.12, 0.0, tx + dx + 0.12, tr + 0.12, 0.34, ('#2a5ad8', 0.2), 'chair', bevel=0.02)
        k.box(tx + dx - 0.12 + (0.2 if dx > 0 else 0), tr - 0.12, 0.34, tx + dx - 0.12 + (0.24 if dx > 0 else 0.04), tr + 0.12, 0.72, ('#2a5ad8', 0.2), 'chair_back')
    W.lantern(k, tx, tr, 0.63, 0.8, s=0.05, energy=3)
    k.solid(tx - 0.3, tr - 0.3, tx + 0.3, tr + 0.3)
for px_ in (20.2, 25.6):                                  # the pergola: posts, beams, a vine over it
    for pr in (29.95, 31.15):
        k.box(px_ - 0.05, pr - 0.05, 0.0, px_ + 0.05, pr + 0.05, 1.7, ('#6a4a2a', 0.2), 'pergola_post')
        k.solid_post(px_, pr)
for pr in (29.95, 31.15):
    k.box(20.1, pr - 0.05, 1.7, 25.7, pr + 0.05, 1.78, ('#6a4a2a', 0.2), 'pergola_beam')
xx = 20.3
while xx < 25.6:
    k.box(xx - 0.03, 29.85, 1.78, xx + 0.03, 31.25, 1.83, '#5a3a22', 'pergola_lath')
    xx += 0.45
with k.foliage('leaf'):
    for i in range(40):
        k.blob(rng.uniform(20.2, 25.6), rng.uniform(29.9, 31.2), 1.86 + rng.uniform(0, 0.08), rng.uniform(0.18, 0.3),
               rng.uniform(0.14, 0.24), 0.06, (rng.choice(('#3a6a30', '#2e5a2a', '#4a7a36')), 0.3), 'vine_leaves', segs=7)
for i in range(10):
    k.sphere(rng.uniform(20.4, 25.4), rng.uniform(30.0, 31.1), 1.7, 0.05, 0.08, ('#5a2a5a', 0.3), 'grapes', segs=6)
k.point_light(23.0, 30.6, 1.5, '#ffc070', 30, radius=0.3, group='flicker')

# the donkeys at the foot of the zigzag, and their trough
DONKEYS = [(46.0, 30.4, 1), (47.2, 30.7, -1), (48.4, 30.3, 1)]
for (dx_, dr_, f) in DONKEYS:
    CL.donkey(k, dx_, dr_, facing=f)
k.box(44.6, 30.95, 0.0, 45.6, 31.25, 0.26, ('#8a8278', 0.2), 'trough', bevel=0.03)
k.box(44.66, 31.0, 0.2, 45.54, 31.2, 0.24, '#2a4a5a', 'basin_water')
k.solid(45, 30, 49, 31)                                   # (Yannis stands among them)

# nets, pots, crates and a caique drawn up by the boathouses
for (cx_, cr_) in ((18.3, 30.2), (34.5, 30.1)):
    k.blob(cx_, cr_, 0.06, 0.45, 0.3, 0.08, ('#a8946a', 0.4), 'net_pile', segs=10)
    k.solid(cx_ - 0.4, cr_ - 0.3, cx_ + 0.4, cr_ + 0.3)
I.crab_pots(k, 37.8, 30.0)
A.barrel(k, 31.8, 29.6, h=0.7, radius=0.26)
A.crate(k, 32.5, 29.7, s=0.5, tone=A.WOOD_L)
k.solid(31, 29, 33, 30)
for (lx, lr) in ((13.0, 30.9), (19.0, 31.0), (28.5, 30.9), (36.0, 30.9), (42.0, 30.9)):
    W.lantern_post(k, lx, lr, energy=28)

# ---- the piers, the boats -------------------------------------------------------------------------------------------
W.dock(k, PX + 0.05, PX + 0.95, QUAY + 0.9, SHIP_R + 0.0, z=0.02)
I.fishing_jetty(k, (FX, QUAY + 1), FLEN, 's', glow='#80b0ff')
for (bx, br, L, hull) in ((26.0, QUAY + 2.6, 1.8, CL.BLUE), (35.5, QUAY + 2.4, 2.0, '#c8402e'), (41.0, QUAY + 2.8, 1.7, '#2a8a9a'),
                          (14.0, QUAY + 2.5, 1.9, '#e8e4dc')):
    n0, l0 = len(k.parts), len(k.lights)
    CL.caique(k, bx, br, length=L, hull=hull)
    C.sink(k, n0, C.WZ + 0.12, l0)

# ---- the caldera wall: rock, cave houses, a cable of bougainvillea ---------------------------------------------------
CAVES = [(16.8, 22.2), (20.4, 21.5), (26.6, 22.0), (29.6, 21.8), (33.2, 22.4), (39.4, 21.7), (17.8, 24.4), (24.2, 24.0), (31.6, 24.8),
         (35.6, 24.6), (21.0, 26.2), (38.2, 26.4)]
for (cx_, cr_) in CAVES:
    CL.cave_house(k, cx_, cr_, H(cx_, cr_ + 0.2) - 0.05, seed=int(cx_ * 3))
for i in range(26):                                      # scrub clinging to the ledges
    x_, r_ = rng.uniform(TX0, ZZ0 - 1), rng.uniform(FACE[0] + 0.5, QUAY0 - 0.6)
    with k.foliage('leaf'):
        k.blob(x_, r_, H(x_, r_) + 0.06, rng.uniform(0.12, 0.26), rng.uniform(0.1, 0.18), 0.1,
               (rng.choice(('#4a5a3a', '#5a6a46', '#3e4e34')), 0.3), 'scrub_bush', segs=7)

# the zigzag: each cell a stretch of white-edged stone stair or ramp, a whitewashed wall on its open (south) side,
# a lantern at each turn and along the legs
for (c, r, z) in ZIG:
    n = 3
    for j in range(n):                              # three treads to a cell, each a hair higher, edged in white
        za = z + 0.012 + 0.05 * j / n
        ra, rb = r + j / n, r + (j + 1) / n
        k.box(c, ra, z - 0.3, c + 1.0, rb, za, (shade(CL.STONE, 1.0 + 0.05 * ((c + r + j) % 3 - 1)), 0.06), 'steps', bevel=0.01)
        k.box(c + 0.02, rb - 0.04, za - 0.004, c + 0.98, rb, za + 0.004, '#ffffff', 'step_edge')
    # the wall up the back of a leg, whitewashed, to the ledge in front of the leg above
    zb = ZIG_BACK.get((c, r - 1), ZIGZ.get((c, r - 1)))
    if zb is not None and zb > z + 0.15:
        CL.retaining(k, c, c + 1.0, r + 0.02, z, zb)
    # the parapet along the ledge's open edge, over the drop to the leg below
    if (c, r + 1) in ZIG_BACK and (c, r + 2) in ZIGZ:
        CL.parapet(k, c, c + 1.0, r + 1.92, h=0.3, t=0.12, z=z)
for (c, r), z in ZIG_BACK.items():                   # the ledges themselves: stone, a pot or a bush on them here and there
    CL.paving(k, c, r, c + 1.0, r + 1.0, z=z + 0.01, seed=c * 7 + r)
    if (c * 3 + r) % 5 == 0:
        CL.pots(k, c + 0.5, r + 0.5, n=2, seed=c + r, z=z)
ZIG_LAMPS = [(ZZ0 - 0.25, 27.6), (ZZ1 + 1.25, 25.6), (ZZ0 - 0.25, 23.6), (ZZ1 + 1.25, 21.6), (46.5, 28.2), (46.5, 26.2), (46.5, 24.2), (46.5, 22.2)]
for (lx, lr) in ZIG_LAMPS:
    CL.lift(k, H(lx, lr) + 0.05, W.lantern_post, k, lx, lr, h=1.4, energy=18)

# ---- the terraces: retaining walls, lanes, parapets -----------------------------------------------------------------
LANES = [(RIM_LANE, RIM_Z), (L2_LANE, L2_Z), (L1_LANE, L1_Z)]
for (rows, z) in LANES:
    CL.paving(k, TX0, rows[0], TX1 + 1.0 if z != L1_Z else EAST_L1 - 1.0, rows[1] + 1.0, z=z, seed=int(z * 10))
for (c, ra, rb, zt, zb) in STAIRS:
    CL.steps(k, c + 0.06, c + 0.94, ra, rb + 1.0, zt, zb)
# the walls up the back of each terrace (where the houses stand against them) and up the rim
CL.retaining(k, TX0, TX1 + 1.0, L2_HOUSE[0], L2_Z, RIM_Z)
CL.retaining(k, TX0, TX1 + 1.0, L1_HOUSE[0], L1_Z, L2_Z)
# the cliff's lip under the promenade: the parapet, gaps only where the zigzag leaves it
CL.parapet(k, TX0, EAST_L1 - 1.0, L1_LANE[1] + 1.05, h=0.42, z=L1_Z, gaps=[(ZZ1, ZZ1 + 1.0), (22.0, 25.0), (35.0, 38.0)])
k.box(TX0, L1_LANE[1] + 0.95, L1_Z - 0.8, EAST_L1 - 1.0, L1_LANE[1] + 1.15, L1_Z - 0.04, ('#e8e2d4', 0.2), 'terrace_wall')
CL.parapet_y(k, EAST_L1 - 1.0, L1_LANE[0], L1_LANE[1] + 1.0, z=L1_Z)
# the ends of the terraces: whitewashed walls against the arms' rock
for (rows, z) in LANES:
    CL.parapet_y(k, TX0 - 0.1, rows[0], rows[1] + 1.0, z=z)

# ---- the lower terrace: houses along the promenade ------------------------------------------------------------------
SMOKE = []


def roof_terrace(x0, x1, rb, h):
    """A roof made a terrace: a table and chairs under a striped umbrella, a pot of basil, a string of lights."""
    tx, tr = (x0 + x1) / 2, rb + 0.95
    k.cyl(tx, tr, h + 0.07, h + 0.55, 0.035, '#e8e4dc', 'table_leg', verts=6)
    k.cyl(tx, tr, h + 0.55, h + 0.6, 0.24, ('#f2efe6', 0.2), 'table_cloth', verts=12)
    for dx in (-0.36, 0.36):
        k.box(tx + dx - 0.1, tr - 0.1, h + 0.07, tx + dx + 0.1, tr + 0.1, h + 0.36, ('#2a5ad8', 0.2), 'chair', bevel=0.02)
    k.cyl(tx, tr, h + 0.6, h + 1.35, 0.02, '#e8e4dc', 'umbrella_pole', verts=5)
    k.cone(tx, tr, h + 1.2, h + 1.42, 0.44, 0.03, (rng.choice(('#e8e4dc', '#2a5ad8', '#c8a050')), 0.3), 'umbrella', verts=12)


def house_row(z, r_back, specs):
    for n, sp in enumerate(specs):
        x0, x1 = sp['x']
        kw = dict(sp)
        kw.pop('x')
        terrace = kw.pop('terrace', False)
        kw.setdefault('h', (1.5, 1.35, 1.75, 1.45, 1.6, 1.3)[n % 6])
        top = CL.lift(k, z, CL.cube_house, k, x0, x1, r_back, r_back + 1.9, **kw)
        if terrace and not kw.get('vault'):
            CL.lift(k, z, roof_terrace, x0, x1, r_back, kw['h'])
        if kw.get('chimney_x') is not None:
            SMOKE.append([round(kw['chimney_x'], 3), round(r_back + 0.3 - (z + top + 0.7) * C45, 3)])


W1 = CL.WHITES
house_row(L1_Z, L1_HOUSE[0], [
    dict(x=(13.6, 16.0), door_x=14.6, windows=[(15.5, 0.6)], pots_at=[(15.6, 2)], seed=1, terrace=True),
    dict(x=(16.2, 16.9), wall=CL.WASHES[0], door_x=None, windows=[(16.55, 0.9)], seed=2),
    dict(x=(17.2, 19.4), door_x=18.0, windows=[(18.9, 0.65)], stair=(19.3, -1), seed=3),
    dict(x=(19.7, 23.8), door_x=21.2, windows=[(20.3, 0.6), (22.4, 0.6), (23.3, 0.6)], chimney_x=23.2, upper=(20.0, 22.0, 17.0, 18.2, 0.9),
         windows_up=[(21.0, 0.3)], seed=4, pots_at=[(22.9, 3)]),           # the lantern maker's
    dict(x=(25.2, 28.2), wall=CL.WASHES[1], door_x=26.6, windows=[(25.7, 0.6), (27.6, 0.6)], seed=5, vine=27.9),
    dict(x=(28.5, 31.0), door_x=29.4, windows=[(30.4, 0.6)], vault=True, seed=6),
    dict(x=(31.3, 34.6), door_x=33.0, windows=[(31.9, 0.6), (34.0, 0.6)], chimney_x=31.8, seed=7, pots_at=[(32.2, 2)], terrace=True),
    dict(x=(34.9, 39.6), door_x=36.4, windows=[(35.5, 0.6), (37.6, 0.6), (38.9, 0.6)], upper=(37.0, 39.4, 17.0, 18.0, 0.9),
         windows_up=[(38.2, 0.3)], seed=8, vine=35.2),
    dict(x=(41.2, 44.0), wall=CL.WASHES[2], door_x=42.6, windows=[(41.7, 0.6), (43.5, 0.6)], chimney_x=43.6, seed=9),
    dict(x=(44.3, 47.0), door_x=45.2, windows=[(46.4, 0.6)], vault=True, seed=10, pots_at=[(46.3, 2)]),
    dict(x=(47.3, 49.9), door_x=48.6, windows=[(47.8, 0.6)], stair=(47.4, 1), seed=12, vine=49.6),
])
# a little chapel on the promenade, its dome over the drop
CHAPEL_L1 = 50.6
CL.lift(k, L1_Z, CL.chapel, k, 51.4, 17.0, 18.9, w=1.6, h=1.3, bells=None)
CL.lift(k, L1_Z, CL.bell_wall, k, 52.3, 53.4, 17.4, h=1.7, bells=1)

# ---- the upper terrace -------------------------------------------------------------------------------------------
house_row(L2_Z, L2_HOUSE[0], [
    dict(x=(11.2, 14.2), door_x=12.0, windows=[(13.4, 0.6)], chimney_x=13.8, seed=21, vine=11.5),
    dict(x=(14.5, 16.8), wall=CL.WASHES[3], door_x=15.6, windows=[(16.3, 0.6)], vault=True, seed=22),
    dict(x=(18.2, 21.4), door_x=19.2, windows=[(20.2, 0.6), (21.0, 0.6)], chimney_x=20.8, seed=23, pots_at=[(18.6, 2)], terrace=True),
    dict(x=(21.7, 24.6), wall=CL.WASHES[4], door_x=23.4, windows=[(22.2, 0.6)], seed=24, vine=24.3),
    dict(x=(24.9, 29.4), door_x=27.0, windows=[(25.6, 0.6), (28.4, 0.6)], upper=(25.2, 27.4, 13.0, 14.2, 0.9), windows_up=[(26.3, 0.3)],
         chimney_x=29.0, seed=25),
    dict(x=(29.7, 33.7), door_x=31.0, windows=[(30.2, 0.6), (32.4, 0.6), (33.2, 0.6)], vault=True, seed=26),
    dict(x=(35.2, 38.0), door_x=36.0, windows=[(37.4, 0.6)], chimney_x=37.6, seed=27, pots_at=[(36.8, 2)]),
    dict(x=(38.3, 41.4), wall=CL.WASHES[1], door_x=39.8, windows=[(38.8, 0.6), (40.9, 0.6)], seed=28, vine=41.1),
    dict(x=(41.7, 45.0), door_x=43.4, windows=[(42.2, 0.6), (44.4, 0.6)], chimney_x=42.2, stair=(44.9, -1), seed=29, terrace=True),
    dict(x=(45.3, 49.9), door_x=46.4, windows=[(47.4, 0.6), (48.8, 0.6)], vault=True, seed=30, pots_at=[(49.3, 2)]),
])

# ---- the rim: the great church, the windmills, the taverna, the rim walk -------------------------------------------
CHURCH = (24.0, 7.4, 10.8)                                  # centre column, back and front rows
CL.lift(k, RIM_Z, CL.cube_house, k, 21.6, 26.4, CHURCH[1], CHURCH[2], h=1.9, door_x=None, windows=[], parapet=False, seed=40)
CL.lift(k, RIM_Z, CL.dome, k, 24.0, 9.1, 1.95, 1.25)
for dx in (-2.0, 2.0):
    CL.lift(k, RIM_Z, CL.dome, k, 24.0 + dx, 9.8, 1.95, 0.5, cross=False)
CL.lift(k, RIM_Z, CL.arched_door, k, 24.0, CHURCH[2], w=0.8, h=1.4, lamp=False)
for dx in (-1.4, 1.4):
    CL.lift(k, RIM_Z, CL.deep_window, k, 24.0 + dx, CHURCH[2], 0.8, w=0.3, h=0.6, shutters=None, arch=True)
    CL.lift(k, RIM_Z, W.lantern, k, 24.0 + dx * 0.5, CHURCH[2] + 0.15, 1.1, 1.3, s=0.08, energy=6)
CL.lift(k, RIM_Z, CL.bell_wall, k, 27.0, 28.6, 8.6, h=2.6, bells=3)
k.solid(21, 7, 29, 11)

# the windmills along the crest to the east
for (mx, mr) in ((40.5, 8.6), (44.6, 8.9)):
    CL.lift(k, RIM_Z, CL.windmill, k, mx, mr)
    k.solid(mx - 0.8, mr - 0.8, mx + 0.8, mr + 0.8)

# the taverna on the rim: a white house with a terrace of tables under a reed shade, looking over the caldera
TAVR = (31.0, 36.0)
CL.lift(k, RIM_Z, CL.cube_house, k, TAVR[0], TAVR[1], 7.6, 9.8, h=1.6, door_x=32.0, windows=[(33.4, 0.6), (35.2, 0.6)],
        chimney_x=35.4, vine=31.3, pots_at=[(34.5, 3)], seed=41)
k.solid(TAVR[0], 7, TAVR[1], 10)
RIM_TABLES = [(32.0, 10.5), (33.6, 10.5), (35.2, 10.5)]


def rim_table(tx, tr):
    k.cyl(tx, tr, 0.0, 0.58, 0.05, '#e8e4dc', 'table_leg', verts=6)
    k.cyl(tx, tr, 0.58, 0.63, 0.32, ('#f2efe6', 0.2), 'table_cloth', verts=14)
    k.sphere(tx, tr, 0.66, 0.05, 0.04, '#c8402e', 'tomato', segs=6)
    W.lantern(k, tx + 0.1, tr, 0.63, 0.78, s=0.045, energy=3)


for (tx, tr) in RIM_TABLES:
    CL.lift(k, RIM_Z, rim_table, tx, tr)
    k.solid(tx - 0.3, tr - 0.3, tx + 0.3, tr + 0.3)
for px_ in (31.2, 35.8):                                     # the reed shade over the terrace
    CL.lift(k, RIM_Z, k.box, px_ - 0.05, 9.85, 0.0, px_ + 0.05, 9.95, 1.65, ('#6a4a2a', 0.2), 'pergola_post')
CL.lift(k, RIM_Z, k.box, 31.1, 9.8, 1.65, 35.9, 11.0, 1.72, ('#b8a070', 0.4), 'reed_shade')

# trees on the rim: an old olive, cypresses, a fig against a wall
def olive(x, r):
    k.tube((x, r, 0.0), (x + 0.15, r, 0.7), 0.1, ('#6a5a48', 0.3), 'trunk', verts=7)
    with k.foliage('leaf'):
        W.leafy_crown(k, x + 0.15, r, 0.9, 0.7, 0.55, 0.4, '#7a8a62')


def cypress(x, r, h=2.2):
    k.cyl(x, r, 0.0, 0.3, 0.05, '#4a3a2a', 'trunk', verts=6)
    with k.foliage('needle'):
        k.blob(x, r, h * 0.55, 0.26, 0.26, h * 0.5, ('#2a3e2a', 0.3), 'cypress', segs=12)
        k.blob(x + 0.05, r + 0.08, h * 0.45, 0.2, 0.2, h * 0.36, ('#34502e', 0.3), 'cypress', segs=10)


for (tx, tr) in ((15.0, 9.4), (37.4, 9.6)):
    CL.lift(k, RIM_Z, olive, tx, tr)
    k.solid(tx - 0.4, tr - 0.4, tx + 0.4, tr + 0.4)
for (tx, tr) in ((19.2, 9.0), (29.6, 8.6), (47.6, 9.2), (12.6, 8.4)):
    CL.lift(k, RIM_Z, cypress, tx, tr)
    k.solid(tx - 0.3, tr - 0.3, tx + 0.3, tr + 0.3)
for i in range(30):                                         # scrub along the crest
    x_, r_ = rng.uniform(TX0, TX1), rng.uniform(7.2, 10.6)
    if 21 <= x_ <= 29 or TAVR[0] - 0.3 <= x_ <= TAVR[1] + 0.3 or any(abs(x_ - mx) < 1 for mx in (40.5, 44.6)):
        continue
    with k.foliage('leaf'):
        k.blob(x_, r_, RIM_Z + 0.05, rng.uniform(0.14, 0.26), rng.uniform(0.1, 0.2), 0.12,
               (rng.choice(('#5a6a46', '#6a7a52', '#4a5a3a')), 0.3), 'scrub_bush', segs=7)
# a low white wall along the rim walk's north side, and its lamps
CL.lift(k, RIM_Z, CL.parapet, k, TX0, 21.0, 10.95, h=0.3, t=0.14)
CL.lift(k, RIM_Z, CL.parapet, k, 29.0, TAVR[0], 10.95, h=0.3, t=0.14)
CL.lift(k, RIM_Z, CL.parapet, k, TAVR[1], TX1 + 1.0, 10.95, h=0.3, t=0.14, gaps=[(39.6, 41.4), (43.7, 45.5)])

LAMPS = [(13.4, 12.8), (21.4, 12.8), (29.6, 12.8), (38.6, 12.8), (46.6, 12.8),
         (12.6, 16.8), (20.6, 16.8), (28.0, 16.8), (35.6, 16.8), (44.2, 16.8),
         (13.6, 20.7), (19.6, 20.7), (27.2, 20.7), (33.8, 20.7), (39.4, 20.7), (45.6, 20.7)]
for (lx, lr) in LAMPS:
    CL.lift(k, H(lx, lr - 0.3), W.lantern_post, k, lx, lr, h=1.6, energy=26)
    k.solid_post(lx, lr)

# benches on the promenade, facing the drop; cafe tables
PROM_SEATS = [(16.2, 20.4), (30.8, 20.4), (42.2, 20.4)]
for (bx, br) in PROM_SEATS:
    CL.lift(k, L1_Z, W.bench, k, bx - 0.7, bx + 0.7, br)
    k.solid(bx - 0.7, br - 0.2, bx + 0.7, br + 0.3)
CAFE = [(23.2, 19.6), (36.8, 19.6)]
for (tx, tr) in CAFE:
    CL.lift(k, L1_Z, rim_table, tx, tr)
    k.solid(tx - 0.3, tr - 0.3, tx + 0.3, tr + 0.3)
# the painter's easel on the promenade
EASEL = (26.6, 20.2)


def easel(x, r):
    for (a, b) in ((-0.2, 0.0), (0.2, 0.0), (0.0, -0.2)):
        k.tube((x + a, r + b, 0.0), (x, r - 0.05, 1.2), 0.02, '#6a4a2a', 'easel', verts=4)
    k.box(x - 0.28, r - 0.08, 0.6, x + 0.28, r - 0.04, 1.05, ('#f4f0e4', 0.2), 'canvas')
    k.box(x - 0.24, r - 0.04, 0.68, x + 0.24, r - 0.035, 0.86, '#2a5ad8', 'canvas_paint')
    k.box(x - 0.24, r - 0.04, 0.86, x + 0.24, r - 0.035, 0.98, '#e8a060', 'canvas_paint')


CL.lift(k, L1_Z, easel, *EASEL)
k.solid(26, 20, 27, 21)

# ---- the lava islet: black cinder, a glowing vent, a little white chapel on its shoulder ----------------------------
VENT = (ISLET[0] + 0.4, ISLET[1] - 0.4)
vz = H(*VENT)
k.cyl(VENT[0], VENT[1], vz - 0.3, vz + 0.02, 0.42, ('#1a1010', 0.3), 'vent_rim', verts=16)
k.cyl(VENT[0], VENT[1], vz - 0.3, vz + 0.03, 0.3, '#3a1206', 'vent_glow', emit=('#ff5020', 1.0), verts=14)
k.point_light(VENT[0], VENT[1], vz + 0.6, '#ff6a30', 60, radius=0.4, group='flicker')
for i in range(6):                                        # glowing cracks running off the vent
    a = i * 1.05 + 0.3
    pa = (VENT[0] + math.cos(a) * 0.45, VENT[1] + math.sin(a) * 0.32)
    pb = (VENT[0] + math.cos(a) * 1.3, VENT[1] + math.sin(a) * 0.9)
    k.tube((pa[0], pa[1], H(*pa) + 0.01), (pb[0], pb[1], H(*pb) + 0.01), 0.03, '#3a1206', 'lava_crack', emit=('#ff5020', 0.8), verts=4)
CL.lift(k, H(20.6, 41.2), CL.chapel, k, 20.6, 40.4, 41.4, w=0.9, h=0.8)

# ---- the arms: a ruined castle on the east arm, a white chapel on the west arm's point ------------------------------
CL.lift(k, H(53.5, 16.0) - 0.1, I.ruined_tower, k, 53.5, 16.0, rad=1.0, h=1.8, tone='#b8a890', seed=7)
CL.lift(k, H(6.0, 33.0) - 0.05, CL.chapel, k, 6.0, 32.3, 33.4, w=1.1, h=0.9)

# ---- the tops: dry grass, scrub, the island's vines grown in low baskets against the wind -------------------------
TOPS = [(c, r) for (c, r) in ALL_LAND if (c, r) not in WALK and not (in_town(c + 0.5, r + 0.5) and r >= RIM_LANE[0]) and (c, r) not in islet]
I.tufts(k, TOPS, '#8a8a5a', per_cell=0.8, flowers=0.25)


def basket_vine(x, r, z):
    """Santorini's vines: trained into a low ring on the ground, a basket of their own shoots, the grapes inside."""
    with k.foliage('leaf'):
        for t in range(12):
            a = t / 12 * math.pi * 2
            k.blob(x + math.cos(a) * 0.3, r + math.sin(a) * 0.22, z + 0.08, 0.13, 0.1, 0.08,
                   (rng.choice(('#5a7a3a', '#4e6e34', '#6a8a42')), 0.3), 'vine_leaves', segs=6)
    k.cyl(x, r, z - 0.02, z + 0.05, 0.2, ('#6a5a42', 0.3), 'vine_stock', verts=8)


vines = 0
for i in range(400):
    x_, r_ = rng.uniform(1.0, COLS - 1.0), rng.uniform(3.0, 44.0)
    c_, rr_ = int(x_), int(r_)
    if (c_, rr_) not in land or (c_, rr_) in WALK or (in_town(x_, r_) and r_ >= RIM_LANE[0] - 0.4) or steep(x_, r_) > 0.4 or H(x_, r_) < 1.0:
        continue
    if in_town(x_, r_) and (21 <= x_ <= 29 or TAVR[0] - 0.5 <= x_ <= TAVR[1] + 0.5 or any(abs(x_ - mx) < 1.1 for mx in (40.5, 44.6))):
        continue
    if rng.random() < 0.45:
        basket_vine(x_, r_, H(x_, r_))
        vines += 1
    else:
        with k.foliage('leaf'):
            k.blob(x_, r_, H(x_, r_) + 0.06, rng.uniform(0.14, 0.28), rng.uniform(0.1, 0.2), 0.12,
                   (rng.choice(('#6a7450', '#7a8456', '#5a6446')), 0.3), 'scrub_bush', segs=7)
    if vines > 70:
        break
# rock ribs standing out of the caldera wall, and boulders fallen to its foot
for i in range(24):
    x_ = rng.uniform(TX0 + 0.5, ZZ0 - 1.0)
    r_ = rng.uniform(FACE[0] + 0.8, QUAY0 - 1.0)
    k.rock(x_, r_, H(x_, r_) - 0.05, rng.uniform(0.25, 0.5), rng.uniform(0.3, 0.6), rng.uniform(0.2, 0.4),
           (rng.choice(('#8a6a58', '#9a8a76', '#6a5a52', '#b0a088')), 0.3), part='rock')

# shelves of harder rock standing out along the beds, all over the faces: the strata as things, not stripes
TONE = {'rock_rust': '#9a5a42', 'rock_black': '#4a4244', 'rock_ochre': '#b8986a', 'rock_pumice': '#d8ccb4', 'rock_grey': '#8a8078'}
shelves = 0
for i in range(2400):
    x_, r_ = rng.uniform(0.5, COLS - 0.5), rng.uniform(4.0, 46.0)
    c_, rr_ = int(x_), int(r_)
    st_ = steep(x_, r_)
    if (c_, rr_) not in ALL_LAND or (c_, rr_) in WALK or (c_, rr_) in islet or st_ < 0.9 or st_ > 2.4 or (c_, rr_) in ZIG_BACK:
        continue
    if in_town(x_, r_) and r_ < FACE[0]:
        continue
    m = material(x_, r_)
    if m not in TONE:
        continue
    k.blob(x_, r_, H(x_, r_) - 0.04, rng.uniform(0.35, 0.9), rng.uniform(0.12, 0.22), rng.uniform(0.06, 0.12),
           (shade(TONE[m], rng.uniform(0.9, 1.12)), 0.15), 'rock_ledge', rot=(0, 0, math.radians(rng.uniform(-12, 12))), segs=7, smooth=False)
    shelves += 1
    if shelves > 260:
        break

# ---- the café balconies jutting out over the drop from the promenade ---------------------------------------------
BALCONIES = [(22, 24), (35, 37)]                    # columns (inclusive) on row 21


def balcony(x0, x1):
    r0, r1 = 21.0, 21.95
    k.box(x0, r0 - 0.05, -0.16, x1, r1, -0.1, ('#e8e2d4', 0.18), 'deck_terrace', bevel=0.03)   # under the grout: flush with the flags, its top drew lines all over them
    CL.paving(k, x0, r0 - 0.05, x1, r1, z=0.0, seed=int(x0))
    for xx in (x0 + 0.2, x1 - 0.2):                 # brackets down into the rock
        k.tube((xx, r1 - 0.1, -0.1), (xx, r0 + 0.1, -1.4), 0.07, ('#d8d0c0', 0.2), 'balcony_strut', verts=6)
    CL.parapet(k, x0, x1, r1 - 0.05, h=0.38, t=0.12)
    CL.parapet_y(k, x0 + 0.06, r0, r1, h=0.38, t=0.12)
    CL.parapet_y(k, x1 - 0.06, r0, r1, h=0.38, t=0.12)
    tx = (x0 + x1) / 2
    k.cyl(tx, r0 + 0.5, 0.0, 1.5, 0.025, '#e8e4dc', 'umbrella_pole', verts=6)
    k.cone(tx, r0 + 0.5, 1.3, 1.56, 0.52, 0.04, ('#e8e4dc', 0.3), 'umbrella', verts=12)


for (a, b) in BALCONIES:
    CL.lift(k, L1_Z, balcony, a, b + 1.0)

# ---- the cable car: a little white station on the promenade, two cables down the face to the quay -------------------
CAB_TOP, CAB_BOT = (12.6, 20.4, L1_Z), (14.4, QUAY0 + 0.6, 0.0)
CL.lift(k, L1_Z, CL.cube_house, k, 11.4, 13.4, 19.0, 20.0, h=1.2, door_x=None, windows=[(12.4, 0.5)], parapet=False, seed=51)
CL.cube_house(k, 13.6, 15.2, QUAY0 - 0.2, QUAY0 + 0.6, h=1.1, door_x=14.4, windows=[], parapet=False, seed=52)
for dx in (-0.25, 0.25):
    k.tube((CAB_TOP[0] + dx, CAB_TOP[1], CAB_TOP[2] + 1.1), (CAB_BOT[0] + dx, CAB_BOT[1], CAB_BOT[2] + 1.0), 0.012, '#2a2a30', 'cable', verts=4)
for t in (0.32, 0.7):                               # two gondolas, one going up, one down
    gx = CAB_TOP[0] + (CAB_BOT[0] - CAB_TOP[0]) * t + (0.25 if t < 0.5 else -0.25)
    gr = CAB_TOP[1] + (CAB_BOT[1] - CAB_TOP[1]) * t
    gz = CAB_TOP[2] + 1.1 + (CAB_BOT[2] + 1.0 - CAB_TOP[2] - 1.1) * t
    k.tube((gx, gr, gz), (gx, gr, gz - 0.35), 0.015, '#2a2a30', 'gondola_arm', verts=4)
    k.box(gx - 0.28, gr - 0.2, gz - 0.85, gx + 0.28, gr + 0.2, gz - 0.35, ('#c8402e', 0.2), 'gondola', bevel=0.05)
    k.box(gx - 0.22, gr + 0.2, gz - 0.7, gx + 0.22, gr + 0.21, gz - 0.45, '#2a1a10', 'gondola_window', emit=('#ffc070', 0.5))
k.solid(11, 19, 13, 20)
k.solid(13.6, QUAY0, 15.2, QUAY0 + 0.6)

# ---- light ----------------------------------------------------------------------------------------------------------
k.area_light(30.0, 18.0, 18.0, '#8a98d0', 2800, 44.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.point_light(30.0, 24.0, 6.0, '#d8e0ff', 60, radius=1.5)

for (ax, ay) in ((22, 30), (45, 30), (32, 11), (23, 11), (26, 19)):     # where the people stand
    k.solid(ax, ay, ax + 1, ay + 1)
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}},
         light_samples=int(os.environ.get('CLIFF_SAMPLES', 96)),
         world_light=('#26344e', 0.8))

# ---- the world ------------------------------------------------------------------------------------------------------
def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


def act(label, x, y, what, prompt):
    return {'x': x, 'y': y, 'type': 'lanternfall', 'act': what, 'label': label, 'prompt': prompt}


DOCK = {'x': PX, 'y': QUAY + 2, 'type': 'menu', 'label': 'DOCK', 'prompt': 'PRESS E TO SET SAIL', 'dialog': 'GO SAILING.',
        'options': [{'label': 'GO SAILING', 'action': 'go_sailing'}, {'label': 'STAY ASHORE', 'action': 'close'}]}
w = {'name': 'Lanternfall', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [PX, QUAY]}, 'moonColor': [50, 100, 180], 'shipExit': True,
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         DOCK,
         {'x': 22, 'y': 30, 'type': 'dialog', 'label': 'MARINA', 'prompt': 'PRESS E TO TALK', 'dialog': ''},
         {'x': 45, 'y': 30, 'type': 'dialog', 'label': 'YANNIS', 'prompt': 'PRESS E TO TALK', 'dialog': ''},
         {'x': 32, 'y': 11, 'type': 'dialog', 'label': 'DESPINA', 'prompt': 'PRESS E TO TALK', 'dialog': ''},
         {'x': 23, 'y': 11, 'type': 'dialog', 'label': 'FATHER ILIAS', 'prompt': 'PRESS E TO TALK', 'dialog': ''},
         {'x': 26, 'y': 19, 'type': 'dialog', 'label': 'ARIS', 'prompt': 'PRESS E TO TALK', 'dialog': ''},
         act('THE DONKEYS', 46, 29, 'donkey_up', 'PRESS E TO RIDE UP'),
         act('THE DONKEYS', ZZ1 + 1 if (ZZ1 + 1, 20) in WALK else ZZ1, 20, 'donkey_down', 'PRESS E TO RIDE DOWN'),
         act('TAVERNA', 33, 11, 'taverna', 'PRESS E TO EAT'),
         act('CABLE CAR', 13, 19, 'cable_down', 'PRESS E TO RIDE DOWN'),
         act('CABLE CAR', 14, 30, 'cable_up', 'PRESS E TO RIDE UP'),
         act('FISH TAVERNA', 23, 31, 'fish_taverna', 'PRESS E TO EAT'),
         act('CHURCH LAMPS', 24, 11, 'lamp', 'PRESS E TO LIGHT A LAMP'),
         act('BELL', 27, 11, 'bell', 'PRESS E TO RING'),
         act('LANTERN MAKER', 21, 19, 'lanterns', 'PRESS E TO BROWSE'),
         act('THE VIEW', 30, 19, 'view', 'PRESS E TO LOOK OUT'),
         look('THE CALDERA', 16, 19, 'THE WHOLE BAY WAS A MOUNTAIN ONCE. IT BLEW ITS TOP OFF AND THE SEA CAME IN TO SEE.\n\nOUT IN THE MIDDLE THE LITTLE ISLET STILL SMOKES. THE FISHERMEN SAY IT\'S THE MOUNTAIN DREAMING.'),
         look('WINDMILLS', 41, 11, 'TWO WINDMILLS ON THE CREST, SAILS FURLED. ONE GRINDS BARLEY. THE OTHER, THEY SAY, GRINDS THE WIND ITSELF INTO SOMETHING FINER.'),
         look('CAVE HOUSES', 17, 20, 'BELOW THE PARAPET, HOUSES DUG INTO THE CLIFF ITSELF: A DOOR, A WINDOW, A TERRACE THE SIZE OF A TABLECLOTH.\n\nA WOMAN WATERS HER GERANIUMS OVER A DROP OF A HUNDRED FEET.'),
         look('BOATHOUSES', 33, 29, 'ARCHES CUT INTO THE FOOT OF THE CLIFF, BLUE DOORS ON THEM. INSIDE, THE CAIQUES SLEEP OUT THE WINTER.'),
         look('THE ZIGZAG', 49, 28, 'FIVE HUNDRED AND EIGHTY-SEVEN STEPS TO THE TOP, SAYS A SIGN. SOMEONE HAS CROSSED OUT THE NUMBER AND WRITTEN "TOO MANY".'),
         look('LAVA ISLET', PX, QUAY + 1, 'ACROSS THE WATER THE BLACK ISLET GLOWS RED AT ITS HEART. A TINY CHAPEL STANDS ON ITS SHOULDER, BECAUSE OF COURSE IT DOES.'),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
LIFT = [[round(H(c + 0.5, r + 0.5), 2) for c in range(COLS)] for r in range(ROWS)]
for (a, b) in ((22, 24), (35, 37)):                                # you stand on the balconies' decks, not the rock under them
    for c in range(a, b + 1):
        LIFT[21][c] = L1_Z
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER + FPIER, scene_id='lumar-cliff',
            actors=[{'sheet': 'npc-cliff-marina', 'x': 22, 'y': 30, 'facing': 'down'},
                    {'sheet': 'npc-cliff-yannis', 'x': 45, 'y': 30, 'facing': 'down'},
                    {'sheet': 'npc-cliff-despina', 'x': 32, 'y': 11, 'facing': 'down'},
                    {'sheet': 'npc-cliff-ilias', 'x': 23, 'y': 11, 'facing': 'down'},
                    {'sheet': 'npc-cliff-aris', 'x': 26, 'y': 19, 'facing': 'down'}],
            scene_extra={'backdrop': True, 'smoke': SMOKE, 'steam': [[VENT[0], round(VENT[1] - (vz + 0.2) * C45, 2)]], 'heights': LIFT})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in WALK:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -1.0, COLS + 0.5, ROWS + 1.0]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('lanternfall done; walkable', len(WALK), 'land', len(ALL_LAND))
