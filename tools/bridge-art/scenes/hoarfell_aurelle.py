"""Hoarfell — Aurelle, the château and the resort town beside it, up the line from Fellhaven. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_aurelle.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-aurelle

Beck: "a grand hotel with like a little city next to it… a little bit Monaco-y, chateau-y". Across the top, under the
mountains, Château Aurelle: a long cream-stone hotel three floors high under slate mansards, a central pavilion a floor
taller with the glass canopy over its doors, round towers under verdigris cones at each end, flags. Its terraces either
side (the après-ski terrace on the west with heaters and fur throws), the forecourt with an ice swan on the drive's
island, and the Place below it: a great fir in lights, the sleighs waiting with their horses. West: the run comes down
into town under the SKI-IN arch, the chairlift up to the summit beside it. East: the spa pavilion and its heated pool
steaming in the snow. South of the Place the rue of grand shops (Le Refuge, La Table, the pâtisserie, Maison Vautrin's
furs, Bar Étoile), and below it the station: a stone station house with a clock, the platform under its canopy, and the
mountain railway's red panoramic train standing at it. Tile units: x = column, r = row (toward the camera), z = height.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_alpine as A              # noqa: E402
import assets_house as HK              # noqa: E402
import assets_isle as I                # noqa: E402
import assets_signs as G               # noqa: E402
import assets_snow as N                # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'hoarfell-aurelle'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 56, 40
C = math.cos(math.radians(45))
QUICK = os.environ.get('QUICK')

k = Kit(COLS, ROWS, margin_top=5.0, margin_bottom=0.6, seed=4417)


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


def sm(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---- the land: snow sculpted into drifts, the run coming down from the north-west ----------------------------------------
SLOPE_X = (0.0, 11.5)          # the ski-in run's corridor


def slope_h(x, r):
    """The run: rising from the finish (row 12) up to the north-west, a little higher at its edges (the banks)."""
    if x > SLOPE_X[1] + 1.5:
        return 0.0
    rise = max(0.0, 12.0 - r) * 0.42
    bank = 0.25 * sm(3.5, 0.5, x) + 0.35 * sm(8.5, 11.5, x)
    edge = sm(SLOPE_X[1] + 1.5, SLOPE_X[1] - 0.5, x)
    return min(5.6, rise * (0.85 + bank)) * edge


PAVED = [(13.0, 9.6, 44.6, 21.2), (13.0, 24.8, 44.6, 28.6)]          # the forecourt and the Place; the rue


def paved_d(x, r):
    best = 9.0
    for (a, b, c, d) in PAVED:
        dx = max(a - x, 0.0, x - c)
        dr = max(b - r, 0.0, r - d)
        best = min(best, math.hypot(dx, dr))
    return best


POOL = (46.8, 10.6, 54.4, 14.2)                                        # the spa's heated pool, sunk below the snow


def height(x, r):
    if POOL[0] - 0.05 < x < POOL[2] + 0.05 and POOL[1] - 0.05 < r < POOL[3] + 0.05:
        return -0.7
    h = slope_h(x, r)
    n = I.n2(x * 0.5, r * 0.9, 1.0, 51) * 0.6 + I.n2(x * 1.2, r * 1.8, 1.0, 53) * 0.4
    h += max(0.0, n) * 0.18 * sm(0.6, 1.8, paved_d(x, r)) * sm(0.5, 1.5, abs(r - 36.6)) * (1 - sm(31.5, 33.5, r) * sm(35.8, 33.8, r))
    return h


# the trodden ways through the snow (the paving has its own setts): the run's finish to the Place and down to the lift;
# the spa, its pool and down to the rue; round the station house to the platform
WAYS = [[(6.2, 12.6), (8.6, 14.2), (12.0, 15.0), (13.4, 15.2)], [(6.2, 13.0), (5.6, 16.4), (5.2, 19.6)],
        [(5.2, 22.6), (6.8, 26.0), (9.6, 30.0), (12.0, 32.8)], [(44.6, 12.4), (48.0, 10.8), (51.0, 9.2)],
        [(44.6, 17.0), (47.6, 16.6), (51.0, 16.4)], [(44.6, 26.6), (46.8, 29.6), (48.0, 32.8)],
        [(20.0, 28.6), (21.6, 30.6), (22.2, 32.8)], [(36.0, 28.6), (34.6, 30.6), (33.8, 32.8)],
        [(12.6, 26.6), (11.2, 29.6), (12.0, 32.8)]]


def way_d(x, r):
    return I.path_dist(WAYS, x, r) + 0.14 * I.n2(x, r, 1.9, 5)


def material(x, r):
    d = way_d(x, r)
    if d < 0.62:
        return 'path'
    if d < 0.8:
        return 'path_edge'
    if x < SLOPE_X[1] + 0.5 and r < 12.0:
        return 'piste'
    return 'snow'


cells = [(c, r) for c in range(-1, COLS + 1) for r in range(-8, ROWS + 1)]
I.ground(k, cells, material, {'snow': (N.SNOW, 0.04), 'path': (N.PACKED, 0.06), 'path_edge': ('#cbd5e6', 0.05), 'piste': ('#dfe7f2', 0.03)},
         step=0.25 if QUICK else 0.125, bump=0.008, seed=17, height=height, dither=0.06)
for i in range(int(11 * 14 * 0.5)):                                 # the groomer's corduroy down the run
    x = k.rng.uniform(1.2, 10.8)
    r = k.rng.uniform(-6.0, 11.5)
    z = slope_h(x, r)
    k.box(x - 0.6, r - 0.015, z - 0.005, x + 0.6, r + 0.015, z + 0.006, ('#ccd6e6', 0.03), 'piste_lines')

# the mountains behind: a cliff band and the massif climbing over it (the run comes down through a gap on the west)
cliff = [(c, r) for c in range(12, COLS + 1) for r in range(-8, 1)]
I.ridge(k, cliff, top=4.2, slope=1.4, seed=23, rock='#d6dee9', strata=('#6a7284', '#525a6c', '#7c8496'),
        moss=N.ROOF_SNOW, foot=0.6, patchy=False)
upper = [(c, r) for c in range(10, COLS + 1) for r in range(-8, -3)] + [(c, r) for c in range(-1, 10) for r in range(-8, -6)]
I.ridge(k, upper, top=8.6, slope=2.6, seed=29, rock='#d6dee9', strata=('#5e6678', '#485062', '#727a8c'),
        moss=N.ROOF_SNOW, foot=0.9, patchy=False)

# ---- the château ---------------------------------------------------------------------------------------------------------
SMOKE = []
FH = 1.05
# the two long wings either side of the pavilion
for (x0, x1, chim) in ((16.6, 25.2, (18.4, 23.2)), (30.8, 39.4, (32.8, 37.6))):
    ze, zt = A.grand_block(k, x0, x1, 1.6, 6.2, floors=3, floor_h=FH, roof_h=2.5, chimneys=chim, balconies=(1, 2), pediments=(1,))
    for cx in chim:
        SMOKE.append(screen(cx, 2.18, zt + 1.05))
# the end pavilions, stepping forward, and their round towers
for (x0, x1) in ((12.4, 16.6), (39.4, 43.6)):
    A.grand_block(k, x0, x1, 2.2, 7.0, floors=3, floor_h=FH, roof_h=2.7, bays=[x0 + 1.4, x1 - 1.4], balconies=(1,), pediments=(1, 2))
A.turret(k, 12.6, 7.4, 1.05, 6.2, 2.9, flag=A.VELVET)
A.turret(k, 43.4, 7.4, 1.05, 6.2, 2.9, flag=A.VELVET)
# the central pavilion: a floor taller, its mansard steeper, a clock in a gilt cartouche, the canopy over its doors
PX0, PX1, PF = 25.2, 30.8, 7.0
ze, zt = A.grand_block(k, PX0, PX1, 1.2, PF, floors=4, floor_h=FH, roof_h=3.0, bays=[26.3, 28.0, 29.7], door=28.0,
                       balconies=(1, 2, 3), pediments=(1,), chimneys=(26.0, 30.0))
A.double_door(k, 28.0, PF - 0.02, w=1.0, h=1.5)
for sx in (PX0 + 0.1, PX1 - 0.1):                                    # little towers at the pavilion's corners
    A.turret(k, sx, PF - 0.2, 0.42, ze + 0.2, 1.4, windows=1)
CZ, CR_ = ze + 1.15, PF - 0.95                                       # the clock in a gilt cartouche on the pavilion's roof
k.box(27.35, CR_ - 0.3, ze, 28.65, CR_ + 0.05, CZ + 0.65, (A.STONE, 0.05), 'dormer')
k.cyl_y(28.0, CR_ - 0.3, CR_ + 0.05, CZ + 0.65, 0.65, 0.3, (A.STONE, 0.05), 'dormer', verts=16)
k.blob(28.0, CR_ - 0.15, CZ + 0.98, 0.7, 0.3, 0.08, (N.ROOF_SNOW, 0.03), 'roof_snow', segs=10)
k.cyl_y(28.0, CR_ + 0.04, CR_ + 0.1, CZ + 0.3, 0.42, 0.42, (A.GILT, 0.04), 'clock_rim', verts=24)
k.cyl_y(28.0, CR_ + 0.06, CR_ + 0.12, CZ + 0.3, 0.34, 0.34, '#f4ecd8', 'clock_face', emit=('#fff2d0', 0.3), verts=24)
k.bar(28.0, CR_ + 0.13, 28.001, CR_ + 0.13, CZ + 0.3, CZ + 0.55, 0.03, A.IRON, 'clock_hand')
k.tube((28.0, CR_ + 0.13, CZ + 0.3), (28.18, CR_ + 0.13, CZ + 0.22), 0.016, A.IRON, 'clock_hand', verts=4)
A.porte_cochere(k, 28.0, PF, w=3.4, d=1.7, h=1.75)
k.box(26.6, PF + 1.72, 1.78, 29.4, PF + 1.76, 2.0, ('#2a1a12', 0.05), 'sign_board')
G.letters(k, 'CHATEAU AURELLE', 'CinzelDecorative-Bold', 28.0, PF + 1.76, 1.8, size=0.17, col=A.GILT, lit=True, energy=3)
for (x, r) in ((12.6, 7.4), (43.4, 7.4)):
    pass
# flags along the front
for x in (19.0, 23.0, 33.0, 37.0):
    A.flag(k, x, 6.55, 3.6, h=1.2, col=A.VELVET if x < 30 else A.NAVY)

# ---- the terraces, the forecourt, the drive ---------------------------------------------------------------------------
A.balustrade(k, 16.8, 9.8, 25.0, 9.8)
A.balustrade(k, 31.0, 9.8, 39.2, 9.8)
k.solid(16.8, 9.6, 25.0, 10.0)
k.solid(31.0, 9.6, 39.2, 10.0)
SETT = '#b4ae9e'
A.setts(k, 13.0, 6.2, 44.6, 14.6, tone=SETT)                       # the forecourt and the drive
# the Place: a garden à la française under snow — four parterres round the great fir, setts on the walks between
for (a, b, c, d) in ((13.0, 14.6, 44.6, 15.6), (13.0, 20.2, 44.6, 21.2), (13.0, 15.6, 14.2, 20.2), (43.4, 15.6, 44.6, 20.2),
                     (26.4, 15.6, 29.6, 20.2), (14.2, 17.4, 26.4, 18.4), (29.6, 17.4, 43.4, 18.4)):
    A.setts(k, a, b, c, d, tone=SETT)
for (a, b, c, d) in ((14.4, 15.8, 26.2, 17.2), (14.4, 18.6, 26.2, 20.0), (29.8, 15.8, 43.2, 17.2), (29.8, 18.6, 43.2, 20.0)):
    A.parterre(k, a, b, c, d, urn=False)
for i in range(60):                                                             # snow swept to the edges of the paving
    side = k.rng.random()
    if side < 0.5:
        x, r = 13.0 + k.rng.uniform(-0.1, 0.5), k.rng.uniform(10, 21)
    else:
        x, r = 44.6 + k.rng.uniform(-0.5, 0.1), k.rng.uniform(10, 21)
    k.blob(x, r, 0.02, k.rng.uniform(0.2, 0.4), k.rng.uniform(0.2, 0.4), k.rng.uniform(0.04, 0.09), (N.SNOW, 0.03), 'drift', segs=8)
# the après-ski terrace (west): heaters, tables with fur throws, a bar cart
for (x, r) in ((18.0, 8.0), (21.0, 7.6), (23.8, 8.2)):
    A.fondue_table(k, x, r, cloth='#f0e8d8', check=False)
    A.bistro_chair(k, x - 0.55, r - 0.1)
    A.bistro_chair(k, x + 0.55, r - 0.1)
for x in (19.5, 22.4):
    A.heater(k, x, 8.9)
# the east terrace: loungers round a fire pit
A.fire_pit(k, 35.0, 8.2, rad=0.55)
for (x, r, f) in ((32.6, 8.2, 1), (37.4, 8.2, -1)):
    A.lounger(k, x, r, facing=f, col='#e8dcc8', towel='#8a1a2a')
A.heater(k, 33.8, 9.0)
A.heater(k, 36.2, 9.0)
# the drive: a ring of setts round an island with the ice swan
k.cyl(28.0, 12.6, 0.0, 0.08, 1.3, ('#9a9488', 0.08), 'kerb', verts=36, ry=0.95)
k.cyl(28.0, 12.6, 0.08, 0.12, 1.2, (N.SNOW, 0.03), 'snow', verts=36, ry=0.86)
A.ice_swan(k, 28.0, 12.5)
for a in range(8):
    ang = a / 8 * math.tau
    W.lantern(k, 28.0 + math.cos(ang) * 1.15, 12.6 + math.sin(ang) * 0.82, 0.1, 0.3, s=0.05, energy=2)
k.solid(26.8, 11.8, 29.2, 13.4)
for (x, r) in ((25.5, 9.6), (30.5, 9.6)):
    A.urn_planter(k, x, r)

# ---- the Place: the great fir, the sleighs, lamps, benches -----------------------------------------------------------------
A.lit_fir(k, 28.0, 17.9, h=3.6)
A.sleigh(k, 18.8, 11.6, facing=-1)
A.horse(k, 17.2, 11.6, facing=-1, coat='#e8e0d4', mane='#c8c0b4')
A.sleigh(k, 18.8, 13.4, facing=-1, body='#1e2a4a')
A.horse(k, 17.2, 13.4, facing=-1, coat='#4a2e1c')
k.box(15.2, 10.4, 0.0, 15.4, 10.6, 1.4, ('#3a2416', 0.06), 'post')
k.box(14.6, 10.45, 1.15, 16.0, 10.55, 1.55, ('#2a1a12', 0.05), 'sign_board')
G.letters(k, 'SLEIGHS', 'CinzelDecorative-Bold', 15.3, 10.56, 1.2, size=0.22, col=A.GILT, lit=True, energy=2)
k.solid(14.6, 10.3, 16.0, 10.7)
for (x, r) in ((13.6, 11.0), (42.4, 11.0), (14.0, 15.2), (43.6, 15.2), (14.0, 20.6), (43.6, 20.6), (26.6, 15.2), (29.4, 15.2)):
    W.lantern_post(k, x, r, h=2.4, energy=30)
for (x0, x1, r) in ((33.0, 34.6, 13.8), (36.6, 38.2, 13.8), (39.8, 41.4, 13.8)):
    A.bench_iron(k, x0, x1, r)
    k.solid(x0, r - 0.2, x1, r + 0.2)
for (x, r) in ((13.6, 9.6), (44.0, 9.6)):
    A.urn_planter(k, x, r)

# ---- the ski-in run and the chairlift (west) -------------------------------------------------------------------------------
A.ski_in_arch(k, 6.2, 12.4, w=3.4, h=2.6)
k.box(4.7, 12.38, 1.95, 7.7, 12.43, 2.4, ('#2a4a8a', 0.05), 'banner')
G.letters(k, 'SKI-IN', 'CinzelDecorative-Bold', 6.2, 12.44, 2.0, size=0.26, col='#f0e8d8', lit=False)
for x in (2.0, 3.2, 9.4, 10.6):                                                   # piste poles down the run's edges
    for r in (2.0, 6.0, 10.0):
        z = slope_h(x, r)
        k.cyl(x, r, z, z + 0.9, 0.03, ('#e0b030' if x < 6 else '#2a6ac0', 0.04), 'piste_pole', verts=6)
N.ski_rack(k, 1.4, 3.6, 15.6)
N.ski_rack(k, 8.8, 11.0, 15.6)
N.net_fence(k, (11.8, 11.6), (11.8, 18.8))
LX, LR = 5.2, 21.4
bull = N.lift_station(k, LX, LR)
pyl = []
for (r, h) in ((14.6, 3.2), (7.6, 3.0), (0.6, 3.0), (-6.0, 3.0)):
    pyl.append(N.pylon(k, LX, r, h, z0=slope_h(LX, r) - 0.05, arm=1.0))
far = [(pyl[-1][0][0], -12.0, slope_h(LX, -6) + 6.0), (pyl[-1][1][0], -12.0, slope_h(LX, -6) + 6.0)]
LINES = []
for s in (0, 1):
    pts = [bull[s]] + [p[s] for p in pyl] + [far[s]]
    N.cable(k, pts)
    LINES.append([screen(*p) for p in pts])
k.solid(LX - 1.6, LR - 1.1, LX + 1.6, LR - 0.6)
k.box(3.6, LR + 0.92, 2.0, 6.8, LR + 0.96, 2.3, ('#b83a2e', 0.05), 'sign_board')
G.letters(k, 'TO THE SUMMIT', 'Righteous', 5.2, LR + 0.97, 2.05, size=0.17, col='#f8f0e0', lit=True, energy=2)
# firs along the run's banks and round the west side
for (x, r) in ((0.4, 2.0), (0.8, 6.5), (0.3, 10.2), (11.2, -1.0), (11.6, 3.4), (11.0, 7.4), (0.5, -3.0), (11.6, -5.0),
               (0.6, 17.0), (0.4, 23.0), (1.6, 26.4), (0.5, 29.6), (9.8, 25.2), (11.4, 22.6), (8.6, 30.2), (3.8, 31.0)):
    N.snow_pine(k, x, r, h=k.rng.uniform(2.3, 3.1))
    if r > 11:
        k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)

# ---- the spa (east): the pavilion, the heated pool, loungers -------------------------------------------------------------
ze_s, zt_s = A.grand_block(k, 46.4, 55.4, 3.0, 8.4, floors=2, floor_h=FH, roof_h=1.2, bays=[47.6, 49.4, 52.6, 54.4], door=51.0,
                           balconies=(), pediments=(1,), chimneys=(54.6,))
SMOKE.append(screen(54.6, 3.58, zt_s + 1.05))
A.double_door(k, 51.0, 8.38, w=0.9, h=1.4)
k.box(49.4, 8.42, 1.62, 52.6, 8.46, 1.92, ('#2a1a12', 0.05), 'sign_board')
G.letters(k, 'LES THERMES', 'CinzelDecorative-Bold', 51.0, 8.46, 1.66, size=0.17, col=A.GILT, lit=True, energy=2)
STEAM = A.heated_pool(k, *POOL)
for (x, f) in ((47.4, 1), (48.9, 1), (50.4, 1), (52.6, -1), (54.1, -1)):
    A.lounger(k, x, 15.1, facing=f, towel=k.rng.choice(('#f0f0f0', '#8a1a2a', '#1e2a4a')))
for x in (49.6, 53.4):
    A.heater(k, x, 15.9)
for (x, r) in ((55.2, 12.0), (55.4, 16.0), (45.6, 2.6)):
    N.snow_pine(k, x, r, h=k.rng.uniform(2.2, 2.8))
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)

# ---- the rue: the grand shops facing the street ----------------------------------------------------------------------------
A.setts(k, 13.0, 25.0, 44.6, 25.6, tone='#c4bcaa', w=(0.4, 0.7), d=0.3)        # the pavement
A.setts(k, 13.0, 25.6, 44.6, 28.6, tone='#8e8a80')                              # the rue
RF = 25.0                       # the shops' faces


def shop(x0, x1, door, wall='#e8dcc8', roof=N.ROOF_SNOW, stone=True, two=True):
    wins = [(x, 0.75) for x in (x0 + 0.9, x1 - 0.9) if abs(x - door) > 1.0]
    up = [(x, 2.0) for x in (x0 + 0.9, (x0 + x1) / 2, x1 - 0.9)] if two else []
    rm, zr = HK.rich_house(k, x0, x1, 21.4, RF, wall_h=2.0, rise=1.35, roof=roof, wall=wall, door_x=door, windows=wins,
                           windows_up=up, chimney=x0 + 0.6, stone=stone)
    SMOKE.append(screen(x0 + 0.6, rm - 0.35, zr + 1.05))
    return rm, zr


# Le Refuge, the après-ski bar: a log chalet among the stone
N.chalet(k, 13.4, 18.6, 21.6, RF, wall_h=2.2, rise=1.6, door_x=16.0, windows=[(14.4, 0.85), (17.6, 0.85)],
         windows_up=[(16.0, 1.75)], chimney=14.2, balcony=False, lanterns=(15.3, 16.7))
SMOKE.append(screen(14.2, 22.8, 4.1))
k.box(14.2, RF + 0.04, 2.2, 17.8, RF + 0.08, 2.55, ('#3a2416', 0.05), 'sign_board')
G.letters(k, 'Le Refuge', 'Pacifico-Regular', 16.0, RF + 0.08, 2.24, size=0.26, col='#ffd890', lit=True, energy=4)
N.ski_rack(k, 13.6, 15.0, RF + 0.9)
A.heater(k, 18.0, RF + 0.9)
# La Table: fine dining under a navy awning
shop(20.4, 25.4, 22.9, wall='#ece2cc')
A.awning(k, 20.6, 22.3, RF + 0.02, 1.75, cols=('#1e2a4a', '#f0e8d8'))
A.awning(k, 23.5, 25.2, RF + 0.02, 1.75, cols=('#1e2a4a', '#f0e8d8'))
k.box(21.2, RF + 0.04, 2.34, 24.6, RF + 0.08, 2.62, ('#1e2a4a', 0.05), 'sign_board')
G.letters(k, 'LA TABLE', 'CinzelDecorative-Bold', 22.9, RF + 0.08, 2.38, size=0.2, col=A.GILT, lit=True, energy=2)
# the pâtisserie: pink and cream
shop(25.4, 29.8, 27.6, wall='#f2dcd8')
HK.bay_shop(k, 25.9, 27.0, RF, frame='#c86a8a', goods=('#f0c0d0', '#e8d0a0', '#f8f0e8', '#a05a3a', '#e8a0b0'))
A.awning(k, 25.6, 29.6, RF + 0.02, 2.05, d=0.55, cols=('#e898b0', '#f8f0e8'), snow=True)
k.box(26.0, RF + 0.6, 2.35, 29.2, RF + 0.64, 2.6, ('#f8f0e8', 0.04), 'sign_board')
G.letters(k, 'PATISSERIE', 'PoiretOne-Regular', 27.6, RF + 0.64, 2.38, size=0.19, col='#a03a5a', lit=False)
# Maison Vautrin: furs and watches, green awning, a rail of coats outside
shop(29.8, 34.4, 32.1, wall='#e0d4bc')
A.awning(k, 30.0, 34.2, RF + 0.02, 1.85, cols=('#1e4a3a', '#e8dcc0'))
k.box(30.4, RF + 0.04, 2.36, 33.8, RF + 0.08, 2.62, ('#1e4a3a', 0.05), 'sign_board')
G.letters(k, 'MAISON VAUTRIN', 'CinzelDecorative-Bold', 32.1, RF + 0.08, 2.4, size=0.16, col=A.GILT, lit=True, energy=2)
A.fur_rail(k, 33.0, 34.2, RF + 0.75)
# Bar Étoile: the champagne bar, stone and gilt
shop(36.6, 42.4, 39.5, wall='#e6dcc6')
A.awning(k, 36.8, 38.6, RF + 0.02, 1.8, cols=('#2a1a12', '#d8b060'))
A.awning(k, 40.4, 42.2, RF + 0.02, 1.8, cols=('#2a1a12', '#d8b060'))
k.box(37.6, RF + 0.04, 2.36, 41.4, RF + 0.08, 2.64, ('#0e0a10', 0.05), 'sign_board')
G.letters(k, 'BAR ETOILE', 'Limelight-Regular', 39.5, RF + 0.08, 2.4, size=0.2, col='#f8e0a0', lit=True, energy=4)
for x in (38.9, 40.1):
    A.urn_planter(k, x, RF + 0.55, fir=True)
# the alleys between: a lamp, a barrow of firewood, snow banked
W.lantern_post(k, 19.5, 23.6, h=2.2, energy=20)
W.lantern_post(k, 35.5, 23.6, h=2.2, energy=20)
N.woodpile(k, 34.8, 36.2, 21.9)
for (x, r) in ((44.2, 23.0), (12.6, 23.4), (45.6, 21.6)):
    N.snow_pine(k, x, r, h=2.3)
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
for (x, r) in ((16.4, 28.2), (31.0, 28.2), (42.0, 28.2)):
    W.lantern_post(k, x, r, h=2.2, energy=26)
HK.barrels(k, 19.2, 25.6)
HK.tub(k, 35.6, 25.4, blooms=('#f0f0f8', '#c8d8f0'))

# ---- the station ----------------------------------------------------------------------------------------------------------
A.station_house(k, 23.4, 32.6, 29.6, 32.4, door_x=28.0, windows=[24.8, 26.3, 29.7, 31.2])
k.box(25.6, 32.44, 2.42, 30.4, 32.48, 2.74, ('#2a4a3a', 0.05), 'sign_board')
G.letters(k, 'AURELLE', 'CinzelDecorative-Bold', 28.0, 32.48, 2.46, size=0.24, col=A.GILT, lit=True, energy=2)
PZ = A.platform(k, 6.0, 52.0, 32.6, 35.6, z=0.06, span=(21.0, 35.0))
A.track(k, -1.0, COLS + 1.0, 36.8)
A.track(k, -1.0, COLS + 1.0, 38.6, snow=True)
TRAIN_X0 = 31.0
TRAIN_X1 = A.train(k, TRAIN_X0, 36.8, cars=2, facing=1)
for x in (2.0, 14.0, 26.0, 38.0, 50.0):
    A.catenary_mast(k, x, 39.7, h=2.6, arm=-2.9)
for x in (-1.0, COLS + 1.0):
    pass
k.solid(-1, 36, COLS + 1, ROWS + 1)                                     # the tracks: not for walking on
for (x0, x1, r) in ((9.0, 10.6, 33.6), (17.0, 18.6, 33.6), (37.0, 38.6, 33.6), (45.0, 46.6, 33.6)):
    A.bench_iron(k, x0, x1, r)
    k.solid(x0, r - 0.2, x1, r + 0.2)
A.luggage(k, 20.4, 34.6)
A.luggage(k, 43.2, 34.4)
k.box(12.0, 33.0, 0.06, 12.1, 33.1, 2.0, A.IRON, 'post')
k.box(11.2, 33.0, 1.5, 12.9, 33.1, 2.1, ('#1e2a3a', 0.05), 'sign_board')
G.letters(k, 'DEPARTURES', 'Righteous', 12.05, 33.12, 1.82, size=0.13, col='#f0d070', lit=True, energy=2)
k.solid(11.2, 32.9, 12.9, 33.2)
# firs at the ends of the platform
for (x, r) in ((2.2, 33.8), (4.4, 34.6), (53.8, 33.6), (55.4, 34.8), (52.6, 31.2), (54.6, 30.0), (48.6, 31.0)):
    N.snow_pine(k, x, r, h=k.rng.uniform(2.2, 2.8))
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)

# ---- the edges --------------------------------------------------------------------------------------------------------------
k.solid(-1, -8, COLS + 1, 1.2)                                         # the mountains
k.solid(-1, -8, 12.0, 11.4)                                            # the run itself (skied, not walked)
k.solid(-1, 0, 0, ROWS)
k.solid(COLS - 1, 0, COLS, ROWS)

# ---- the light: a clear morning in the mountains, lamps warm in the windows --------------------------------------------------
k.sun((0.8, 0.25, -0.38), '#ffd8b8', 3.2, angle=3.0)
A.flush(k)
k.render(OUT, cycle='day', light_states={'full': {}}, light_samples=24 if QUICK else 64, world_light=('#8a96cc', 0.95))

# ---- the world -------------------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Aurelle', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [28, 34]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -4.5, COLS, ROWS], 'cold': True})
w['interactions'] = [
    {'x': 28, 'y': 35, 'type': 'railway', 'label': 'THE TRAIN', 'prompt': 'PRESS E TO BOARD', 'to': 'hoarfell-promenade'},
    {'x': 12, 'y': 33, 'type': 'railway_board', 'label': 'DEPARTURES', 'prompt': 'PRESS E TO READ'},
    {'x': 28, 'y': 7, 'type': 'enter_world', 'label': 'CHATEAU AURELLE', 'prompt': 'PRESS E TO GO IN', 'target': 'hoarfell-chateau', 'spawn': [15, 18]},
    {'x': 26, 'y': 9, 'type': 'dialog', 'label': 'MONSIEUR AUBERT', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE CONCIERGE INCLINES HIS HEAD.'},
    {'x': 15, 'y': 12, 'type': 'dialog', 'label': 'ANOUK', 'prompt': 'PRESS E TO TALK', 'dialog': 'ANOUK PATS THE GREY\'S NECK.'},
    {'x': 26, 'y': 33, 'type': 'dialog', 'label': 'STATIONMASTER', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE STATIONMASTER CHECKS HER WATCH.'},
    {'x': 21, 'y': 9, 'type': 'aurelle', 'label': 'LA TERRASSE', 'prompt': 'PRESS E TO SIT'},
    {'x': 35, 'y': 9, 'type': 'aurelle', 'label': 'FIRE PIT', 'prompt': 'PRESS E TO WARM UP'},
    {'x': 20, 'y': 12, 'type': 'aurelle', 'label': 'SLEIGHS', 'prompt': 'PRESS E TO RIDE'},
    {'x': 28, 'y': 19, 'type': 'aurelle', 'label': 'THE GREAT FIR', 'prompt': 'PRESS E TO LOOK'},
    {'x': 28, 'y': 11, 'type': 'aurelle', 'label': 'ICE SWAN', 'prompt': 'PRESS E TO LOOK'},
    {'x': 6, 'y': 12, 'type': 'ski_here', 'label': 'SKI-IN', 'prompt': 'PRESS E TO SKI'},
    {'x': 5, 'y': 22, 'type': 'lift', 'label': 'CHAIRLIFT', 'prompt': 'PRESS E TO RIDE', 'from': 'aurelle'},
    {'x': 51, 'y': 9, 'type': 'aurelle', 'label': 'LES THERMES', 'prompt': 'PRESS E TO GO IN'},
    {'x': 50, 'y': 15, 'type': 'aurelle', 'label': 'HEATED POOL', 'prompt': 'PRESS E TO SWIM'},
    {'x': 16, 'y': 26, 'type': 'aurelle', 'label': 'LE REFUGE', 'prompt': 'PRESS E TO GO IN'},
    {'x': 23, 'y': 26, 'type': 'aurelle', 'label': 'LA TABLE', 'prompt': 'PRESS E TO DINE'},
    {'x': 28, 'y': 26, 'type': 'aurelle', 'label': 'PATISSERIE', 'prompt': 'PRESS E TO BUY'},
    {'x': 32, 'y': 26, 'type': 'aurelle', 'label': 'MAISON VAUTRIN', 'prompt': 'PRESS E TO BROWSE'},
    {'x': 40, 'y': 26, 'type': 'aurelle', 'label': 'BAR ETOILE', 'prompt': 'PRESS E TO GO IN'},
]
w['lift'] = {'lines': LINES}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
ACTORS = [{'sheet': 'npc-aubert', 'x': 26, 'y': 9, 'facing': 'down'}, {'sheet': 'npc-anouk', 'x': 15, 'y': 12, 'facing': 'right'},
          {'sheet': 'npc-stationmaster', 'x': 26, 'y': 33, 'facing': 'down'}]
for a in ACTORS:
    k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, actors=ACTORS,
            scene_extra={'smoke': SMOKE, 'steam': STEAM, 'lift': {'lines': LINES}, 'train': [TRAIN_X0, 36.8, TRAIN_X1]})
print('aurelle done')
