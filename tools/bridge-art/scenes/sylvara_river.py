"""Sylvara — the Silverrun, the upper river: where the canoes go in. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/sylvara_river.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/sylvara-river

South of Elderglade and the Rootmarket the wood falls away to the Silverrun, running clear over stones between real
banks — mud and pebbles and reeds, the forest crowding down to them. At the top of the stretch the elves' landing: a
plank dock on piles, a rack of birch-bark canoes, Tamsin's boat shed. Below it the bridge village: a bridge of pale
timber on stone piers across the river with round houses along it, flower boxes, lanterns, washing — you paddle under
it. Then the otter weir, a weir of laid logs across the river with a chute in the middle where the water goes white,
and the otters playing in the pool below it; and the river parts round an island where a ring of standing stones keeps
a little shrine with a jetty. Off the bottom of the picture the river runs on to the rapids and the falls (js/canoe.js
carries you on). Lit by day with Sylvara's dusk; the river is still water the live light mirrors.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_sylvan as A                          # noqa: E402
import assets_town as W                            # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'sylvara-river'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 52, 40
k = Kit(COLS, ROWS, margin_top=3.0, margin_bottom=0.8, seed=7731)
rng = k.rng
WZ = -0.28                                                       # the water's surface; the land's at about 0

# ---- the river ------------------------------------------------------------------------------------------------------
CTRL = [(15.0, -3.0), (15.6, 2.0), (19.6, 6.4), (24.6, 9.6), (27.4, 13.6), (28.6, 17.6), (27.6, 21.2), (25.6, 25.0), (27.2, 29.0),
        (29.6, 33.0), (29.2, 37.0), (28.8, 43.0)]
RIVER = A.spline(CTRL, 6)
ISLAND = (31.4, 28.6, 2.0, 1.5)                                  # an island the river parts round: centre, half-width, half-depth
WEIR_R = 21.4                                                    # the weir runs across the river at this row
BRIDGE_R = (13.4, 15.6)                                          # the bridge village's deck: rows
DOCK = (19.6, 3.6, 23.4, 5.4)                                    # the landing's dock (x0, r0, x1, r1), on the east bank


def width(r):
    w = 1.9 + 0.35 * math.sin(r * 0.37) + 0.5 * A.smooth(25.0, 29.0, r) * A.smooth(33.0, 30.0, r)   # wider round the island
    return w


def river_d(x, r):
    return A.line_dist(x, r, RIVER)


def in_island(x, r):
    return ((x - ISLAND[0]) / ISLAND[2]) ** 2 + ((r - ISLAND[1]) / ISLAND[3]) ** 2 < 1.0


def river_x(r):
    for a, b in zip(RIVER, RIVER[1:]):
        if a[1] <= r <= b[1]:
            t = (r - a[1]) / (b[1] - a[1])
            return a[0] + (b[0] - a[0]) * t
    return RIVER[-1][0]


def zfn(x, r):
    base = 0.1 + 0.16 * (A.noise(x, r, 0.4, 3) - 0.5) + 0.05 * (A.noise(x, r, 1.7, 4) - 0.5)
    base += 0.35 * A.smooth(8.0, 0.0, r)                         # the wood rising to the north, toward the glade
    d, w = river_d(x, r), width(r)
    if in_island(x, r):
        e = math.sqrt(((x - ISLAND[0]) / ISLAND[2]) ** 2 + ((r - ISLAND[1]) / ISLAND[3]) ** 2)
        return WZ - 0.2 + (0.25 + 0.2) * A.smooth(1.0, 0.55, e)
    bed = WZ - 0.32
    t = A.smooth(w * 0.55, w + 0.75, d)
    if r > WEIR_R:
        bed -= 0.1
    return bed + (base - bed) * t


PATHS = {
    'west': [(6.0, -1.5), (6.4, 3.0), (8.4, 7.8), (12.6, 11.6), (18.4, 14.4), (24.2, 14.4)],     # down from Elderglade to the bridge
    'east': [(24.0, -1.5), (23.6, 2.6), (22.0, 5.8), (26.4, 8.6), (31.8, 11.2), (33.2, 14.6)],    # from the Rootmarket, past the landing
    'bank': [(33.2, 14.6), (34.4, 19.0), (31.6, 22.4), (30.4, 24.6)],                             # down the east bank to the weir
    'westbank': [(18.4, 14.4), (20.2, 19.6), (22.6, 21.4)],
    'down': [(22.6, 21.4), (21.2, 27.0), (22.6, 33.0), (21.4, 41.5)],                             # on down the west bank to the falls
}
PL = {k_: A.spline(v, 5) for k_, v in PATHS.items()}


def path_d(x, r):
    return min(A.line_dist(x, r, p) for p in PL.values())


def mat(x, r):
    d, w = river_d(x, r), width(r)
    jit = 0.12 * (A.noise(x, r, 3.0, 5) - 0.5)
    if in_island(x, r):
        e = math.sqrt(((x - ISLAND[0]) / ISLAND[2]) ** 2 + ((r - ISLAND[1]) / ISLAND[3]) ** 2)
        return 'grass' if e < 0.62 else ('pebble' if A.noise(x, r, 4, 9) > 0.45 else 'bank')
    if d < w * 0.82:
        return 'bed'
    if d < w + 0.35 + jit:
        n = A.noise(x, r, 4.2, 6)
        return 'pebble' if n > 0.62 else 'mud' if n < 0.3 else 'bank'
    if path_d(x, r) < 0.55 + jit:
        return 'path'
    n = A.noise(x, r, 0.8, 7)
    return 'litter' if n > 0.74 else 'moss_dark' if n < 0.32 else 'moss'


L = A.Land(k, zfn, mat)
L.field(-1.5, -3.5, COLS + 1.5, ROWS + 1.5, 0.125)
A.water(k, -1.5, -3.5, COLS + 1.5, ROWS + 1.5, lambda x, r: river_d(x, r) < width(r) + 0.55 and not in_island(x, r) or
        (in_island(x, r) and zfn(x, r) < WZ), WZ, part='stream_water', tone='#3a7088')

# ---- the landing: a plank dock on piles, the canoe rack, Tamsin's boat shed --------------------------------------------
dx0, dr0, dx1, dr1 = DOCK
A.deck(k, dx0, dr0, dx1, dr1, z=0.05, rail_sides='n')
for x in (dx0 + 0.2, (dx0 + dx1) / 2, dx1 - 0.2):
    for r in (dr0 + 0.2, dr1 - 0.2):
        k.cyl(x, r, WZ - 0.4, 0.05, 0.08, (A.ELFWOOD_D, 0.3), 'pile', verts=8)
RACK = (int(dx1) + 1, int(dr0))
rx, rr_ = RACK[0] + 0.5, RACK[1] + 0.4
for i in range(3):                                               # canoes on a rack, upside down, tiers of two
    for x in (rx - 0.6, rx + 0.6):
        k.cyl(x, rr_, 0.0, 0.5 + i * 0.36, 0.04, (A.ELFWOOD_D, 0.25), 'rack', verts=5)
    k.blob(rx, rr_ - 0.1, 0.62 + i * 0.36, 1.05, 0.22, 0.09, ('#e4dcc4', 0.3), 'canoe_stowed', segs=12)
    k.blob(rx, rr_ - 0.1, 0.58 + i * 0.36, 1.06, 0.23, 0.04, ('#5a3e26', 0.3), 'canoe_gunwale', segs=12)
k.solid(rx - 0.8, rr_ - 0.4, rx + 0.8, rr_ + 0.2)
# the boat shed: a long round-roofed shed of pale planks, a canoe half-built on trestles
SX, SR = 27.0, 3.6
A.deck(k, SX - 1.8, SR - 1.2, SX + 1.8, SR + 0.8, z=0.12)
for x in (SX - 1.7, SX + 1.7):
    for r in (SR - 1.1, SR + 0.7):
        A.carved_post(k, x, r, 0.12, 2.0, rad=0.06)
A.leaf_awning(k, SX - 2.1, SX + 2.1, SR - 1.4, SR + 1.0, 2.3, 1.7, '#6a7a3a', '#7a8a44')
k.blob(SX, SR - 0.2, 0.75, 1.0, 0.22, 0.12, ('#e4dcc4', 0.3), 'canoe_building', segs=12)
for i in range(7):
    k.tube((SX - 0.9 + i * 0.3, SR - 0.42, 0.7), (SX - 0.9 + i * 0.3, SR + 0.02, 0.7), 0.012, ('#c8a878', 0.25), 'rib', verts=4)
for x in (SX - 0.7, SX + 0.7):
    k.box(x - 0.05, SR - 0.4, 0.12, x + 0.05, SR + 0.0, 0.62, (A.ELFWOOD_D, 0.25), 'trestle')
k.solid(SX - 1.8, SR - 1.2, SX + 1.8, SR + 0.2)
TAMSIN = (int(SX), int(SR + 1))
A.lantern_post(k, L, dx0 - 0.4, dr1 + 0.4)

# ---- the bridge village: a timber bridge on stone piers, round houses along it ---------------------------------------------
br0, br1 = BRIDGE_R
bx0, bx1 = 20.0, 35.0
BZ = 0.85                                                        # the deck stands above the water: canoes pass under
A.deck(k, bx0, br0, bx1, br1, z=BZ, rail_sides='')
for x in (bx0 + 0.6, 24.4, 28.2, 32.0, bx1 - 0.6):              # stone piers down into the river
    z0 = L.z(x, (br0 + br1) / 2)
    for (rr, s) in ((br0 + 0.35, 0.36), (br1 - 0.35, 0.36)):
        k.cyl(x, rr, min(z0, WZ) - 0.5, BZ - 0.1, s, (shade(A.STONE, 0.95), 0.3), 'pier', verts=12)
        k.blob(x, rr, WZ + 0.02, s + 0.18, (s + 0.18) * 0.8, 0.03, ('#eef6f6', 0.15), 'foam', segs=10)
for x in (bx0, bx1):                                             # steps down to the banks at each end
    k.box(x - (0.9 if x == bx0 else -0.1), br0 + 0.2, L.z(x, br0) - 0.05, x + (0.1 if x == bx0 else 0.9), br1 - 0.2, BZ - 0.06,
          (shade(A.ELFWOOD, 0.82), 0.3), 'stair_step')
VHOUSES = []
for (x, side, roof) in ((22.2, -1, '#5a8a3a'), (26.2, 1, '#a0703a'), (29.8, -1, '#4a7a6a'), (33.4, 1, '#6a5690')):
    r = br0 - 0.65 if side < 0 else br1 + 0.6
    VHOUSES.append(A.pod_house(k, x, r, z=BZ, rad=0.62, h=1.1, roof=roof, door_ang=math.pi / 2 if side < 0 else -math.pi / 2, lit=True))
    # the house's own platform hanging over the water
    k.box(x - 0.85, r - 0.75, BZ - 0.12, x + 0.85, r + 0.75, BZ - 0.02, (shade(A.ELFWOOD, 0.85), 0.3), 'floor_plank')
for x in (bx0 + 1.0, 25.0, 31.0, bx1 - 1.0):                       # rails and lanterns along the deck
    k.cyl(x, br1 - 0.05, BZ, BZ + 1.6, 0.04, (A.ELFWOOD_D, 0.25), 'post', verts=6)
    A.leaf_lantern(k, x + 0.25, br1 + 0.02, BZ + 1.35, s=0.09, energy=4.0)
k.tube((bx0 + 0.2, br1 - 0.05, BZ + 0.7), (bx1 - 0.2, br1 - 0.05, BZ + 0.7), 0.025, (A.ELFWOOD, 0.25), 'rail', verts=5)
A.cloth_line(k, (23.8, br0 + 0.1, BZ + 1.5), (27.0, br0 + 0.1, BZ + 1.5), n=4)
for (x, r) in ((24.6, br1 - 0.4), (31.6, br0 + 0.45)):
    A.clutter(k, A.Land(k, lambda x, r: BZ, lambda x, r: None), x, r)

# ---- the otter weir: logs laid across the river, a chute in the middle, the pool below ------------------------------------
wx = river_x(WEIR_R)
ww = width(WEIR_R) + 0.4
CHUTE = (wx - 0.55, wx + 0.55)
for (x0, x1) in ((wx - ww, CHUTE[0]), (CHUTE[1], wx + ww)):
    for j in range(2):
        A.log(k, A.Land(k, lambda x, r: WZ - 0.12 + j * 0.16, lambda x, r: None), x0, x1, WEIR_R + j * 0.18, 0.17, seed=j + 3, solid=False)
strands = []
for i in range(9):
    x = CHUTE[0] + (CHUTE[1] - CHUTE[0]) * (i + 0.5) / 9
    w_ = 0.05
    strands.append(((x - w_, WEIR_R + 0.1, WZ + 0.12), (x + w_, WEIR_R + 0.1, WZ + 0.12), (x + w_, WEIR_R + 0.55, WZ - 0.02), (x - w_, WEIR_R + 0.55, WZ - 0.02)))
k.quads(strands, ('#d6ecf0', 0.15), 'falls')
for _ in range(30):                                              # white water below the weir
    x = rng.uniform(wx - ww, wx + ww)
    r = WEIR_R + rng.uniform(0.4, 1.4)
    s = rng.uniform(0.05, 0.14)
    k.blob(x, r, WZ + 0.01, s, s * 0.8, 0.02, ('#eef6f6', 0.15), 'foam', segs=7)
for (x, r) in ((wx - ww - 0.6, WEIR_R - 0.2), (wx + ww + 0.5, WEIR_R + 0.1)):   # an otter's holt in each bank: a hole among roots
    k.blob(x, r, L.z(x, r) + 0.1, 0.32, 0.22, 0.2, ('#2a1e14', 0.4), 'holt', segs=10)
    for i in range(4):
        a = rng.uniform(0, math.pi)
        k.tube((x + math.cos(a) * 0.3, r - 0.1, L.z(x, r) + 0.35), (x + math.cos(a) * 0.6, r + 0.2, L.z(x, r) - 0.05), 0.05, (A.BARK, 0.3), 'root', rb=0.02, verts=5)

# ---- the island and its shrine ---------------------------------------------------------------------------------------
ix, ir, iw, ih = ISLAND
iz = zfn(ix, ir)
for i in range(7):                                               # standing stones in a ring
    a = i / 7 * math.tau + 0.3
    x, r = ix + math.cos(a) * 1.15, ir + math.sin(a) * 0.85
    h = rng.uniform(0.7, 1.1)
    k.rock(x, r, iz + h * 0.45, 0.16, 0.12, h * 0.55, (shade(A.STONE, rng.uniform(0.9, 1.1)), 0.3), part='standing_stone', segs=8)
    k.blob(x, r + 0.1, iz + h * 0.6, 0.08, 0.02, 0.1, ('#a8e0d8', 0.2), 'stone_rune', emit=('#a8e0d8', 1.2), segs=6)
    k.solid_post(x, r)
k.box(ix - 0.35, ir - 0.25, iz, ix + 0.35, ir + 0.25, iz + 0.45, (shade(A.STONE, 1.08), 0.25), 'altar')
k.blob(ix, ir - 0.05, iz + 0.47, 0.32, 0.22, 0.04, (A.MOSS_L, 0.4), 'altar_moss', segs=8)
k.cyl(ix, ir, iz + 0.45, iz + 0.5, 0.16, '#3a7a70', 'altar_bowl', emit=('#a8e0d8', 0.9), verts=14)
k.point_light(ix, ir + 0.3, iz + 0.8, '#a8e0d8', 8, radius=0.2)
k.solid(ix - 0.4, ir - 0.3, ix + 0.4, ir + 0.3)
A.flowers(k, L, ix - iw, ir - ih, ix + iw, ir + ih, 40, ok=lambda x, r: in_island(x, r) and zfn(x, r) > WZ + 0.1, cols=('#f0f0f0', '#c8a8f0', '#a8e0d8'))
JETTY = (ix - iw - 0.6, ir - 0.3, ix - iw + 0.4, ir + 0.4)
A.deck(k, *JETTY, z=WZ + 0.2)
for x in (JETTY[0] + 0.15, JETTY[2] - 0.15):
    k.cyl(x, JETTY[3] - 0.1, WZ - 0.4, WZ + 0.2, 0.06, (A.ELFWOOD_D, 0.3), 'pile', verts=6)
A.leaf_lantern(k, ix - iw + 0.2, ir - 0.6, iz + 1.0, s=0.09, energy=3.0)
k.cyl(ix - iw + 0.2, ir - 0.6, iz, iz + 1.2, 0.03, ('#c8b48a', 0.2), 'post', verts=6)

# ---- the wood down to the banks ----------------------------------------------------------------------------------------
crowns = []
for i, (x, r, rad, h) in enumerate(((3.0, 4.0, 1.6, 7.0), (38.0, 2.5, 1.8, 7.6), (46.0, 12.0, 1.5, 7.0), (6.0, 20.0, 1.4, 6.8),
                                    (44.0, 30.0, 1.6, 7.0), (12.0, 34.0, 1.3, 6.6))):
    crowns.append(A.old_tree(k, L, x, r, rad, h, seed=80 + i))


def clear(x, r, pad=0.8):
    if river_d(x, r) < width(r) + 0.7 or in_island(x, r) or path_d(x, r) < pad:
        return False
    if (int(x), int(r)) in k.blocked:
        return False
    if 18.5 < x < 36.5 and 11.5 < r < 17.5:
        return False
    if 18.6 < x < 29.6 and 1.5 < r < 6.5:
        return False
    return True


for (x, r, h) in ((10.0, 3.2, 4.2), (32.0, 6.0, 4.0), (40.0, 9.0, 4.6), (13.4, 16.6, 3.8), (37.4, 20.6, 4.2), (17.0, 26.0, 4.4), (8.4, 28.0, 4.0),
                  (40.6, 25.2, 4.0), (21.0, 36.0, 4.2), (37.4, 35.6, 4.6), (47.0, 21.0, 4.0), (2.6, 13.0, 4.0), (16.0, 8.4, 3.8)):
    if clear(x, r, 1.0):
        A.elf_oak(k, L, x, r, h=h, rad=0.36 + 0.04 * h, seed=int(x * 3 + r * 7))
for (x, r, h) in ((14.0, 21.0, 3.2), (35.0, 28.0, 3.4), (9.0, 12.0, 3.0), (42.0, 16.0, 3.3), (19.0, 31.0, 3.1), (45.0, 36.0, 3.2)):
    if clear(x, r, 0.8):
        A.birch(k, L, x, r, h=h)
for _ in range(150):
    x, r = rng.uniform(-0.5, COLS + 0.5), rng.uniform(-1.0, ROWS + 0.5)
    if clear(x, r, 0.8):
        A.fern(k, L, x, r, s=rng.uniform(0.5, 0.8), tone=rng.choice(('#4a8a3a', '#55963e', '#3e7a32')))
for _ in range(50):
    x, r = rng.uniform(-0.5, COLS + 0.5), rng.uniform(-1.0, ROWS + 0.5)
    if clear(x, r, 1.0):
        A.shrub(k, L, x, r, s=rng.uniform(0.35, 0.6), tone=rng.choice(('#3a6a30', '#4a7a34', '#2e5a2a')),
                berries=rng.choice((None, None, '#f0f0f0', '#c83a3a')), flowers_=rng.choice((None, None, '#f0b0c8', '#c8a8f0')))
for _ in range(10):
    x, r = rng.uniform(1, COLS - 1), rng.uniform(4, ROWS - 1)
    if clear(x, r, 0.9):
        A.mushroom_ring(k, L, x, r, n=rng.randint(3, 5), glow=rng.random() < 0.5, light=2.0)
for (x, r, s) in ((12.0, 10.0, 0.45), (36.0, 24.0, 0.5), (22.0, 32.0, 0.42), (40.0, 33.0, 0.55)):
    if clear(x, r, 0.6):
        A.boulder(k, L, x, r, s)
# the river's edges: reeds, stones in the shallows, pebbles on the banks
for i in range(0, len(RIVER) - 1, 2):
    x, r = RIVER[i]
    if r < 0 or r > ROWS:
        continue
    a, b = RIVER[i], RIVER[min(len(RIVER) - 1, i + 1)]
    Ln = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
    nx, nr = -(b[1] - a[1]) / Ln, (b[0] - a[0]) / Ln
    for side in (-1, 1):
        px, pr = x + nx * (width(r) + 0.25) * side, r + nr * (width(r) + 0.25) * side
        if 18.5 < px < 36.5 and 12.5 < pr < 16.5:
            continue
        if rng.random() < 0.55:
            A.reeds(k, L, px, pr, n=rng.randint(5, 9))
        if rng.random() < 0.5:
            sx2, sr2 = x + nx * width(r) * rng.uniform(0.5, 0.85) * side, r + nr * width(r) * rng.uniform(0.5, 0.85) * side
            s_ = rng.uniform(0.1, 0.2)
            k.rock(sx2, sr2, WZ + 0.02, s_, s_ * 0.8, 0.08, (shade('#9a988a', rng.uniform(0.9, 1.1)), 0.3), part='stone', segs=8)
ok = lambda x, r: clear(x, r, 0.6)
A.pebbles(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 110, ok=lambda x, r: width(r) - 0.2 < river_d(x, r) < width(r) + 0.9)
A.flowers(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 260, ok=ok)
A.leaf_litter(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 140, ok=ok)
A.moss_mounds(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 60, ok=ok)
A.twigs(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 20, ok=ok)
W.meadow(k, '#567a36', area=(-0.5, -2.0, COLS + 0.5, ROWS + 1.0), ok=('ground_moss', 'ground_moss_dark', 'ground_litter', 'ground_grass'), density=0.8, flowers=0.7, h=(0.07, 0.15))
for c in crowns:
    c()

# ---- what's walkable, where the canoe goes ----------------------------------------------------------------------------------
water_rows = []
walk = set()
for rr in range(ROWS):
    row = ''
    for c in range(COLS):
        x, r = c + 0.5, rr + 0.5
        dd, w = river_d(x, r), width(r)
        wet = dd < w - 0.15 and not in_island(x, r) and r > 0.3
        on_bridge = 20.0 < x < 35.0 and br0 + 0.1 < r < br1 - 0.1
        pier = on_bridge and any(abs(x - px) < 0.5 for px in (bx0 + 0.6, 24.4, 28.2, 32.0, bx1 - 0.6)) and (r < br0 + 0.7 or r > br1 - 0.7)
        if wet and not pier:
            white = abs(r - WEIR_R - 0.6) < 1.2 and CHUTE[0] - 0.4 < x < CHUTE[1] + 0.4
            weir = abs(r - WEIR_R) < 0.6 and not (CHUTE[0] - 0.3 < x < CHUTE[1] + 0.3)
            row += '0' if weir else ('2' if white else '1')
        else:
            row += '0'
        if on_bridge or (not (dd < w + 0.05) or (in_island(x, r) and zfn(x, r) > WZ + 0.05)):
            if not (in_island(x, r) and zfn(x, r) <= WZ + 0.05):
                walk.add((c, rr))
    water_rows.append(row)
for (x0, r0, x1, r1) in (DOCK, JETTY):
    for c in range(int(x0), int(math.ceil(x1))):
        for rr in range(int(r0), int(math.ceil(r1))):
            walk.add((c, rr))
for c in range(COLS):
    for rr in range(ROWS):
        if (c, rr) not in walk:
            k.solid(c, rr, c + 1, rr + 1)

k.sun((0.62, 0.42, -0.62), '#fff0c8', 3.4, angle=3.0)
k.render(OUT, cycle={'base': 'day', 'dusk_sun': ((0.78, 0.3, -0.36), '#ffb070', 1.8), 'dusk_sky': ('#3a5a7a', 0.55),
                     'night_sky': ('#1e3040', 0.55), 'lamps_day': 0.3},
         light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#86aac0', 0.8))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'the Silverrun', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'sylvara',
          'spawns': {'player': [24, 1]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -3.0, COLS, ROWS], 'crowd': 'sylvara'})
flow = []
for i in range(0, len(RIVER), 3):
    x, r = RIVER[i]
    if -1 <= r <= ROWS + 3:
        fast = 1.25 if abs(r - WEIR_R - 0.5) < 1.6 else 0.55
        flow.append([round(x, 2), round(r, 2), fast])
w['river'] = {'water': water_rows, 'flow': flow, 'width': 3.2,
              'down': {'edge': 'bottom', 'target': 'sylvara-falls', 'at': [22, 1]},
              'landings': [[int(dx0) + 1, int(dr1)], [int(dx1) - 1, int(dr1)], [int(bx0) - 1, int(br1)], [int(bx1), int(br1)],
                           [int(JETTY[0]), int(ir)], [int(wx - ww) - 1, int(WEIR_R) + 1], [int(wx + ww) + 1, int(WEIR_R) + 1]],
              'racks': [[RACK[0], RACK[1] + 1]]}
w['interactions'] = [
    {'x': 6, 'y': 0, 'type': 'enter_world', 'label': 'ELDERGLADE', 'prompt': 'PRESS E TO WALK UP TO THE GLADE', 'target': 'sylvara', 'spawn': [17, 30]},
    {'x': 24, 'y': 0, 'type': 'enter_world', 'label': 'THE ROOTMARKET', 'prompt': 'PRESS E TO WALK UP TO THE MARKET', 'target': 'sylvara-roots', 'spawn': [23, 33]},
    {'x': 21, 'y': ROWS - 1, 'type': 'enter_world', 'label': 'THE FALLS', 'prompt': 'PRESS E TO WALK DOWN TO THE FALLS', 'target': 'sylvara-falls', 'spawn': [16, 1]},
    {'x': TAMSIN[0], 'y': TAMSIN[1], 'type': 'dialog', 'label': 'BOATWRIGHT', 'prompt': 'PRESS E TO TALK', 'dialog': 'TAMSIN IS PLANING A THWART.'},
    {'x': int(ix), 'y': int(ir + 1), 'type': 'sylvan', 'kind': 'shrine', 'label': 'THE RIVER SHRINE', 'prompt': 'PRESS E TO LEAVE AN OFFERING', 'verb': 'Offer'},
    {'x': int(wx + ww) + 1, 'y': int(WEIR_R), 'type': 'dialog', 'label': 'OTTER WEIR', 'prompt': 'PRESS E TO WATCH',
     'dialog': 'THE OTTERS HAVE THE POOL BELOW THE WEIR TO THEMSELVES: SLIDING DOWN THE CHUTE ON THEIR BACKS, CLIMBING OUT, DOING IT AGAIN. ONE OF THEM HAS A STONE IT WON\'T PUT DOWN.'},
]
for i, (hx, hr) in enumerate(VHOUSES):
    w['interactions'].append({'x': int(hx), 'y': int(hr + (0.6 if i % 2 == 0 else -0.6)), 'type': 'dialog', 'label': 'BRIDGE HOUSE', 'prompt': 'PRESS E TO KNOCK',
                              'dialog': ['A FISHING ROD LEANS BY THE DOOR. INSIDE, SOMEONE IS ARGUING WITH A KETTLE.', 'NOBODY HOME. A CAT ON THE STEP WATCHES THE WATER INSTEAD OF YOU.',
                                         'THE DOOR OPENS AN INCH. "IF YOU\'RE AFTER TAMSIN\'S CANOE, IT WASN\'T ME." IT CLOSES.', 'MUSIC: A FLUTE, PRACTISING THE SAME FIVE NOTES. AGAIN. AGAIN.'][i % 4]})
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(TAMSIN[0], TAMSIN[1], TAMSIN[0] + 1, TAMSIN[1] + 1)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, doors=[(6, 0), (24, 0), (21, ROWS - 1)],
            actors=[{'sheet': 'npc-elf-boatwright', 'x': TAMSIN[0], 'y': TAMSIN[1], 'facing': 'down'}], scene_extra={})
print('sylvara-river done', 'walkable', len(walk), 'down at', w['river']['down'])
