"""Sylvara — Mirror Lake, where the Silverrun ends, and the Moonwell's source. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/sylvara_lake.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/sylvara-lake

Below the falls the river slows and widens into Mirror Lake, so still it holds the sky — the live light mirrors the far
shore in it, and at night the moon. The lake is sunk into the land: muddy, pebbly, reedy shores, lilies in the
shallows, a few stones standing out of the water, the wood crowding down on the north and west. On the far west shore,
in a cove of pale stones, the water wells up silver-green out of the ground: the Moonwell's source, the spring the
elves say feeds the well in Elderglade by ways under the earth; moonpetals grow round it. The east shore is a flowering
meadow running down to the water; the south a shingle beach with a rack of canoes and a landing. A path leaves from the
south-east, the long way home to Elderglade. Super nature-y: no lake house (Beck). Lit by day with Sylvara's dusk.
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
WID = 'sylvara-lake'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 50, 38
k = Kit(COLS, ROWS, margin_top=3.0, margin_bottom=0.8, seed=9931)
rng = k.rng
WZ = -0.32

# ---- the lake: an irregular shore (a wobbling blob), the river coming in at the top -----------------------------------
LC = (25.0, 19.0)
RIVER = A.spline([(24.0, -3.0), (24.4, 2.0), (23.4, 6.0), (24.6, 9.0)], 6)
SOURCE = (9.4, 17.6)                                             # the Moonwell's source, in its cove on the west shore


def lake_r(a):
    """The shore's distance from the lake's middle in direction a (rows foreshortened)."""
    return (13.2 + 2.0 * math.sin(2 * a + 0.6) + 1.2 * math.sin(3 * a + 2.1) + 0.8 * math.sin(5 * a + 0.3) + 0.4 * math.sin(9 * a + 1.0))


def lake_d(x, r):
    """How far inside the lake (positive) or out of it (negative) a point is, in tiles."""
    dx, dr = x - LC[0], (r - LC[1]) / 0.72
    a = math.atan2(dr, dx)
    d = lake_r(a) - math.hypot(dx, dr)
    d = max(d, 2.2 - A.line_dist(x, r, RIVER))                     # the river mouth
    d = max(d, 1.6 - math.hypot(x - SOURCE[0] - 1.0, (r - SOURCE[1]) / 0.8))   # the source's cove opening into the lake
    return d


def zfn(x, r):
    d = lake_d(x, r)
    base = 0.12 + 0.18 * (A.noise(x, r, 0.4, 3) - 0.5) + 0.05 * (A.noise(x, r, 1.6, 4) - 0.5)
    base += 0.4 * A.smooth(6.0, 0.0, r) + 0.25 * A.smooth(8.0, 0.0, x)          # the wood rising north and west
    if d > -0.9:
        bed = WZ - 0.25 - 0.5 * A.smooth(0.0, 6.0, d)
        return bed + (base - bed) * A.smooth(0.6, -0.9, d)
    return base


PATHS = {
    'west': [(21.4, -1.5), (19.0, 3.0), (13.6, 6.4), (8.6, 10.6), (6.4, 15.6), (7.0, 20.0)],          # from the falls round the west shore
    'source': [(7.0, 20.0), (8.0, 18.6)],
    'south': [(7.0, 20.0), (8.4, 26.0), (13.0, 31.2), (20.0, 33.6), (27.0, 33.8), (35.0, 32.6), (41.0, 34.6), (45.0, 38.5)],
    'meadow': [(35.0, 32.6), (40.6, 27.0), (43.0, 20.0)],
}
PL = {k_: A.spline(v, 5) for k_, v in PATHS.items()}


def path_d(x, r):
    return min(A.line_dist(x, r, p) for p in PL.values())


def meadow(x, r):
    return x > 36.0 and 10.0 < r < 32.0 and lake_d(x, r) < -0.8


def mat(x, r):
    d = lake_d(x, r)
    jit = 0.15 * (A.noise(x, r, 3.0, 5) - 0.5)
    if d > 0.5:
        return 'bed'
    if d > -0.7 + jit:
        n = A.noise(x, r, 4.0, 6)
        if 18.0 < x < 34.0 and r > 28.0:
            return 'pebble' if n > 0.35 else 'sand'               # the shingle beach on the south shore
        return 'pebble' if n > 0.62 else 'mud' if n < 0.34 else 'bank'
    if path_d(x, r) < 0.55 + jit:
        return 'path'
    if meadow(x, r):
        return 'meadow'
    n = A.noise(x, r, 0.8, 7)
    return 'litter' if n > 0.76 else 'moss_dark' if n < 0.32 else 'moss'


L = A.Land(k, zfn, mat, alb={'meadow': ('#6a9644', 0.3), 'sand': ('#a8987a', 0.34)})
L.field(-1.5, -3.5, COLS + 1.5, ROWS + 1.5, 0.125)
A.water(k, -1.5, -3.5, COLS + 1.5, ROWS + 1.5, lambda x, r: lake_d(x, r) > -0.55, WZ, part='pond_water', tone='#2e6a80')

# ---- the Moonwell's source: pale stones in a ring in the shallows of its cove, the water welling up silver-green -----------
sx, sr = SOURCE
for i in range(11):
    a = i / 11 * math.tau
    x, r = sx + math.cos(a) * 1.1, sr + math.sin(a) * 0.85
    s = rng.uniform(0.16, 0.26)
    k.rock(x, r, WZ + 0.05, s, s * 0.8, s * 0.6, (shade('#d8d4c4', rng.uniform(0.92, 1.06)), 0.25), part='source_stone', segs=8)
k.cyl(sx, sr, WZ - 0.1, WZ + 0.015, 0.85, '#2a6a64', 'source_glow', emit=('#a8e0d8', 0.9), verts=24, ry=0.7)
k.cyl(sx, sr, WZ + 0.015, WZ + 0.02, 0.4, '#4a9a90', 'source_glow', emit=('#c8f8f0', 1.6), verts=18, ry=0.32)
for _ in range(10):                                              # the welling: rings of bubbles
    a, d = rng.uniform(0, math.tau), rng.uniform(0.1, 0.6)
    k.sphere(sx + math.cos(a) * d, sr + math.sin(a) * d * 0.8, WZ + 0.03, 0.03, 0.015, '#e8fff8', 'source_bubble', emit=('#e8fff8', 1.2), segs=6)
k.point_light(sx, sr + 0.3, WZ + 0.6, '#a8e0d8', 30, radius=0.4)
for (dx, dr, h) in ((-1.8, -1.2, 1.4), (1.6, -1.4, 1.2), (-2.0, 0.9, 1.0)):     # three standing stones round the cove, runes lit
    x, r = sx + dx, sr + dr
    z0 = L.z(x, r)
    k.rock(x, r, z0 + h * 0.45, 0.2, 0.15, h * 0.55, (shade('#bcb8a8', 0.95), 0.3), part='standing_stone', segs=8)
    k.blob(x, r + 0.13, z0 + h * 0.6, 0.08, 0.02, 0.12, ('#a8e0d8', 0.2), 'stone_rune', emit=('#a8e0d8', 1.3), segs=6)
    k.solid_post(x, r)
A.flowers(k, L, sx - 3.0, sr - 2.6, sx + 2.0, sr + 2.6, 70, ok=lambda x, r: lake_d(x, r) < -0.6, cols=('#f0f0f0', '#e8f8f0', '#c8a8f0', '#a8e0d8'))

# ---- the beach: a landing of planks, the canoe rack ---------------------------------------------------------------------
LAND = (24.2, 26.6, 26.4, 29.4)
A.deck(k, *LAND, z=0.06)
for x in (LAND[0] + 0.2, LAND[2] - 0.2):
    for r in (LAND[1] + 0.2, LAND[1] + 1.2):
        k.cyl(x, r, WZ - 0.5, 0.06, 0.07, (A.ELFWOOD_D, 0.3), 'pile', verts=6)
RACK = (30.4, 33.4)
rx, rr_ = RACK
for i in range(2):
    for x in (rx - 0.6, rx + 0.6):
        k.cyl(x, rr_, L.z(rx, rr_), L.z(rx, rr_) + 0.5 + i * 0.36, 0.04, (A.ELFWOOD_D, 0.25), 'rack', verts=5)
    k.blob(rx, rr_ - 0.1, L.z(rx, rr_) + 0.62 + i * 0.36, 1.05, 0.22, 0.09, ('#e4dcc4', 0.3), 'canoe_stowed', segs=12)
    k.blob(rx, rr_ - 0.1, L.z(rx, rr_) + 0.58 + i * 0.36, 1.06, 0.23, 0.04, ('#5a3e26', 0.3), 'canoe_gunwale', segs=12)
k.solid(rx - 0.8, rr_ - 0.4, rx + 0.8, rr_ + 0.2)
A.lantern_post(k, L, LAND[0] - 0.6, LAND[3] + 0.6)
A.bench(k, L, 20.6, 22.0, 34.6)
# a fire ring on the beach, stones and a few charred logs
fx, fr = 33.6, 31.0
for i in range(9):
    a = i / 9 * math.tau
    k.rock(fx + math.cos(a) * 0.38, fr + math.sin(a) * 0.3, L.z(fx, fr) + 0.06, 0.1, 0.08, 0.07, (shade(A.STONE, rng.uniform(0.85, 1.1)), 0.3), part='fire_stone', segs=6)
for i in range(3):
    a = i / 3 * math.tau + 0.4
    k.tube((fx + math.cos(a) * 0.25, fr + math.sin(a) * 0.2, L.z(fx, fr) + 0.05), (fx - math.cos(a) * 0.1, fr - math.sin(a) * 0.08, L.z(fx, fr) + 0.12), 0.04,
           ('#2a1e16', 0.3), 'charred_log', verts=6)
k.solid(fx - 0.45, fr - 0.35, fx + 0.45, fr + 0.35)

# ---- the lake's edges: reeds and cattails, lilies, stones standing in the water, pebbles --------------------------------------
for i in range(140):
    a = i / 140 * math.tau
    d = lake_r(a)
    x, r = LC[0] + math.cos(a) * (d - 0.1), LC[1] + math.sin(a) * (d - 0.1) * 0.72
    if 18.0 < x < 34.0 and r > 28.0:                             # not on the beach
        continue
    if math.hypot(x - SOURCE[0], r - SOURCE[1]) < 2.4 or abs(x - 24.0) < 2.6 and r < 9:
        continue
    if rng.random() < 0.5:
        A.reeds(k, L, x, r, n=rng.randint(5, 10), spread=0.2, h=(0.4, 0.75))
with k.foliage('leaf'):
    for _ in range(46):                                          # lily pads in the shallows, a flower here and there
        a = rng.uniform(0, math.tau)
        d = lake_r(a) - rng.uniform(0.7, 2.6)
        x, r = LC[0] + math.cos(a) * d, LC[1] + math.sin(a) * d * 0.72
        s = rng.uniform(0.12, 0.2)
        k.cyl(x, r, WZ + 0.005, WZ + 0.015, s, (shade('#4a8a3a', rng.uniform(0.85, 1.15)), 0.3), 'lily_pad', verts=12)
        if rng.random() < 0.3:
            k.sphere(x + 0.03, r, WZ + 0.05, 0.05, 0.035, rng.choice(('#f0f0f0', '#f0c8d8')), 'lily_flower', segs=7)
for (x, r, s) in ((30.0, 15.0, 0.4), (19.4, 22.6, 0.3), (33.4, 22.4, 0.35), (26.0, 25.6, 0.25)):
    k.rock(x, r, WZ + 0.05, s, s * 0.8, s * 0.6, (shade('#8a887a', rng.uniform(0.9, 1.08)), 0.3), part='rock', segs=9)
    k.blob(x, r - 0.04, WZ + s * 0.6, s * 0.6, s * 0.45, s * 0.12, (A.MOSS_L, 0.4), 'rock_moss', segs=8)
A.pebbles(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 160, ok=lambda x, r: -1.1 < lake_d(x, r) < -0.3)

# ---- the wood round it, the meadow ---------------------------------------------------------------------------------------
crowns = []
for i, (x, r, rad, h) in enumerate(((3.0, 3.0, 1.6, 7.2), (14.0, 1.0, 1.7, 7.4), (36.0, 2.0, 1.8, 7.6), (46.0, 6.0, 1.5, 7.0), (1.0, 26.0, 1.4, 6.8))):
    crowns.append(A.old_tree(k, L, x, r, rad, h, seed=110 + i))


def clear(x, r, pad=0.8):
    if lake_d(x, r) > -1.2 or path_d(x, r) < pad:
        return False
    if (int(x), int(r)) in k.blocked:
        return False
    if math.hypot(x - SOURCE[0], r - SOURCE[1]) < 3.0:
        return False
    if 18.0 < x < 36.0 and r > 28.5:                              # the beach
        return False
    return True


for (x, r, h) in ((8.0, 4.4, 4.4), (28.0, 3.4, 4.2), (42.0, 10.6, 4.0), (3.6, 13.0, 4.6), (4.4, 33.0, 4.2), (12.0, 35.6, 4.0), (47.0, 33.0, 4.4),
                  (40.4, 3.4, 4.0), (19.0, 2.4, 3.8)):
    if clear(x, r, 1.0):
        A.elf_oak(k, L, x, r, h=h, rad=0.36 + 0.04 * h, seed=int(x * 3 + r * 5))
for (x, r, h) in ((45.0, 16.0, 3.4), (44.0, 25.0, 3.2), (39.0, 13.0, 3.0), (16.0, 32.0, 3.2), (37.4, 35.6, 3.4)):
    if clear(x, r, 0.8):
        A.birch(k, L, x, r, h=h)
for _ in range(130):
    x, r = rng.uniform(-0.5, COLS + 0.5), rng.uniform(-1.0, ROWS + 0.5)
    if clear(x, r, 0.8) and not meadow(x, r):
        A.fern(k, L, x, r, s=rng.uniform(0.5, 0.8), tone=rng.choice(('#4a8a3a', '#55963e', '#3e7a32')))
for _ in range(40):
    x, r = rng.uniform(-0.5, COLS + 0.5), rng.uniform(-1.0, ROWS + 0.5)
    if clear(x, r, 1.0):
        A.shrub(k, L, x, r, s=rng.uniform(0.35, 0.6), tone=rng.choice(('#3a6a30', '#4a7a34', '#2e5a2a')), berries=rng.choice((None, '#f0f0f0', '#c83a3a')),
                flowers_=rng.choice((None, '#f0b0c8', '#c8a8f0')))
# the meadow: flowers thick, in drifts of one colour; violet windthistles
for _ in range(36):
    x, r = rng.uniform(36.5, COLS), rng.uniform(10.5, 31.5)
    if not meadow(x, r) or path_d(x, r) < 0.7:
        continue
    col = rng.choice(('#a878d8', '#f0d070', '#f0f0f0', '#f0a0b8', '#e88a5a', '#a878d8'))
    A.flowers(k, L, x - 0.7, r - 0.5, x + 0.7, r + 0.5, 18, ok=lambda xx, rr: meadow(xx, rr) and path_d(xx, rr) > 0.6, cols=(col,))
for _ in range(8):
    x, r = rng.uniform(1, COLS - 1), rng.uniform(3, ROWS - 1)
    if clear(x, r, 0.9) and not meadow(x, r):
        A.mushroom_ring(k, L, x, r, n=rng.randint(3, 5), glow=rng.random() < 0.5, light=2.0)
ok = lambda x, r: clear(x, r, 0.6)
A.flowers(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 220, ok=ok)
A.leaf_litter(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 110, ok=lambda x, r: ok(x, r) and not meadow(x, r))
A.moss_mounds(k, L, -0.5, -1.0, COLS + 0.5, ROWS + 0.5, 50, ok=lambda x, r: ok(x, r) and not meadow(x, r))
W.meadow(k, '#567a36', area=(-0.5, -2.0, COLS + 0.5, ROWS + 1.0), ok=('ground_moss', 'ground_moss_dark', 'ground_litter'), density=0.8, flowers=0.7, h=(0.07, 0.15))
W.meadow(k, '#6a9644', area=(36.0, 9.0, COLS + 0.5, 33.0), ok=('ground_meadow',), density=1.2, flowers=1.6, h=(0.09, 0.2))
for c in crowns:
    c()

# ---- what's walkable, where the canoe goes ------------------------------------------------------------------------------
water_rows, walk = [], set()
for rr in range(ROWS):
    row = ''
    for c in range(COLS):
        x, r = c + 0.5, rr + 0.5
        on_landing = LAND[0] < x < LAND[2] and LAND[1] < r < LAND[3]
        row += '1' if lake_d(x, r) > 0.35 and not on_landing else '0'
        if lake_d(x, rr + 0.7) < -0.15:
            walk.add((c, rr))
    water_rows.append(row)
for c in range(int(LAND[0]), int(math.ceil(LAND[2]))):
    for rr in range(int(LAND[1]), int(math.ceil(LAND[3]))):
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
w.update({'name': 'Mirror Lake', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'sylvara',
          'spawns': {'player': [21, 1]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -3.0, COLS, ROWS]})
flow = [[round(x, 2), round(r, 2), 0.5] for (x, r) in RIVER[::3] if r > -1] + [[25.0, 13.0, 0.2], [25.0, 19.0, 0.06]]
w['river'] = {'water': water_rows, 'flow': flow, 'width': 6.0, 'lake': True,
              'up': {'edge': 'top', 'target': 'sylvara-falls', 'at': [25, 37]},
              'landings': [[int(sx) - 2, int(sr)], [int(LAND[0]), int(LAND[1])], [int(LAND[2]) - 1, int(LAND[1])], [41, 20], [21, 8]],
              'racks': [[int(rx), int(rr_) + 1]]}
w['interactions'] = [
    {'x': 21, 'y': 0, 'type': 'enter_world', 'label': 'THE FALLS', 'prompt': 'PRESS E TO WALK UP TO THE FALLS', 'target': 'sylvara-falls', 'spawn': [21, 38]},
    {'x': 45, 'y': ROWS - 1, 'type': 'enter_world', 'label': 'ELDERGLADE', 'prompt': 'PRESS E TO TAKE THE LONG PATH HOME', 'target': 'sylvara', 'spawn': [17, 30]},
    {'x': int(sx) - 2, 'y': int(sr), 'type': 'sylvan', 'kind': 'source', 'label': 'THE MOONWELL\'S SOURCE', 'prompt': 'PRESS E TO KNEEL', 'verb': 'Kneel'},
    {'x': int(fx), 'y': int(fr) + 1, 'type': 'dialog', 'label': 'FIRE RING', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A RING OF STONES, ASH STILL WARM IN IT. ELVES COME DOWN TO MIRROR LAKE ON CLEAR NIGHTS TO WATCH THE MOON COME UP TWICE: ONCE IN THE SKY, ONCE IN THE WATER.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, doors=[(21, 0), (45, ROWS - 1)], actors=[], scene_extra={})
print('sylvara-lake done', 'walkable', len(walk))
