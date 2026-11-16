"""Hoarfell — the cliff monastery over the hidden valley, gone cold. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_monastery.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-monastery

On the clifftop above the valley: the assembly hall under its gilt roof at the head of a courtyard, the monks' houses
round it, whitewashed and maroon-banded with windows in black frames, chortens, prayer wheels and flags strung across
everything. The cold has got in (Bram: "the monks left… something cold moved in"): rime on every dark edge, the
courtyard's fountain frozen solid, icicles off every eave and spout, frost creeping over the paving from the hall's
doors — the rime golems and the frost wraiths keep it now (js/valley.js). The stair from the valley tops out at the
south edge; the monks' stair comes up from the ice caves in the west; and behind the hall in the north-east, a gate in
the old wall onto the high snowfield where the glacier begins: the heart.

Rebuilt in the house style (November 2026, Beck: Hoarfell "has some things that look off"): the buildings stand on
coursed stone footings, their battered whitewashed walls weathered and their windows in layered painted lintels with
striped valances, frosted glass and a sill of snow; the maroon frieze is bundled twig-ends with gilt mirrors in it; the
flat roofs carry heaped snow inside a dark parapet, a cornice rolling over the front, icicles off it and off the timber
spouts; the two chapels by the hall are the red of a lhakhang; the hall's gilt roof is a steep hipped roof of fluted
gilt sheet on a red bracket frieze, upturned eaves with bells, a ganjira on the ridge, snow lying along its eaves. The
mountain behind is Fellhaven's crag (assets_hoarfell_rich.crag) and the clifftop's own rim drops to the valley in snowy
ledges of the same rock. Nothing a player uses has moved: the footprints, the court, every label and spawn are as
they were.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_alpine as A              # noqa: E402
import assets_hoarfell_rich as HR      # noqa: E402
import assets_isle as I                # noqa: E402
import assets_snow as N                # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'hoarfell-monastery'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 44, 38
C = math.cos(math.radians(45))
QUICK = os.environ.get('QUICK')
k = Kit(COLS, ROWS, margin_top=6.0, margin_bottom=5.0, seed=2357)
qb = A.qb
SNOW, ROOF_SNOW, ICE = N.SNOW, N.ROOF_SNOW, N.ICE
RIME = '#e8f2f8'
WHITE = '#ebe4d6'                  # whitewash, a touch warm so it stands off the snow
RED_WALL = '#a8402e'               # the chapels' red ochre
MAROON = '#6a2420'
MAROON_L = '#7e2e28'
TIMBER = '#2a1a14'
GILT = A.GILT
STONES = ('#86807a', '#928c84', '#7a746c', '#9a948a', '#6e6862')
FROST = '#a8bccc'                  # frosted glass
LAMPLIT = '#ffb060'


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


def sm(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


def n2(x, r, f, seed):
    return math.sin(x * f * 1.7 + seed) * 0.5 + math.sin(r * f * 2.3 + seed * 1.9) * 0.3 + math.sin((x + r) * f + seed * 0.7) * 0.2


# ---- the clifftop's outline: its south rim dropping to the valley (a backdrop world: the sky and the cloud below) ---------
def rim(x):
    r = 35.0 + 0.4 * n2(x, 0, 0.5, 3) + 0.25 * n2(x, 0, 1.3, 9)
    if x < 3:                                                            # the ends bend back north
        r -= (3.0 - x) ** 2 * 0.8
    if x > 41:
        r -= (x - 41) ** 2 * 0.8
    return r


X0, X1 = -3.0, COLS + 3.0
COURT = (11.0, 15.0, 33.0, 28.0)                                          # the courtyard's paving
GATE = (34.2, 41.6)                                                       # the notch in the crag where the gate stands

# the buildings: (x0, x1, r_back, r_front, h, windows, door, kind) — footprints exactly as the game knows them
HALL = (15.0, 29.0, 4.0, 13.0, 4.2)
HOUSES = [(3.0, 9.0, 8.0, 13.6, 2.6, 3, 'white', True),                   # Brother Anselm's: the one warm cell
          (3.0, 8.4, 15.0, 20.0, 2.0, 2, 'white', False),
          (35.0, 41.0, 9.0, 14.0, 2.6, 3, 'white', False),
          (35.6, 41.0, 15.4, 20.6, 2.0, 2, 'white', False),
          (9.6, 14.2, 5.0, 10.0, 2.4, 2, 'red', False),                    # the two chapels flanking the hall
          (29.8, 34.4, 5.0, 10.4, 2.4, 2, 'red', False)]

# trodden lanes through the snow: up from the stair, to the doors, the monks' stair, the bell and the gate
PATHS = [[(22.0, 34.6), (22.0, 27.6)],
         [(11.6, 17.0), (8.6, 15.0), (6.0, 14.3)],
         [(11.4, 25.4), (8.4, 27.4), (6.0, 28.6)],
         [(11.4, 20.6), (8.0, 20.7), (5.7, 20.4)],
         [(12.2, 15.2), (11.9, 10.3)],
         [(32.6, 15.2), (32.1, 10.7)],
         [(32.6, 16.0), (34.6, 14.6), (34.6, 9.0), (36.0, 8.6), (37.6, 8.6)],
         [(34.6, 9.0), (35.2, 5.4), (37.4, 4.2), (38.4, 2.4)],
         [(32.8, 21.2), (35.0, 21.0), (38.3, 20.9)],
         [(32.8, 14.8), (38.0, 14.4)],
         [(22.0, 15.2), (22.0, 13.2)]]


def path_dist(x, r):
    return I.path_dist(PATHS, x, r)


def in_court(x, r, m=0.0):
    return COURT[0] - m <= x <= COURT[2] + m and COURT[1] - m <= r <= COURT[3] + m


def under_house(x, r, m=0.0):
    for (x0, x1, rb, rf) in [HALL[:4]] + [h[:4] for h in HOUSES]:
        if x0 - m <= x <= x1 + m and rb - m <= r <= rf + m:
            return True
    return False


SH = (4.4, 7.6, 25.6, 27.2)                                               # the stair-house over the monks' stair
PIT = (SH[0] + 0.2, SH[1] - 0.2, SH[2] + 0.12, SH[3] - 0.04)               # the stairwell sunk in the snow under it


def height(x, r):
    """The snow over the clifftop: wind-shaped drifts in the open, banks against the houses' fronts, lanes trodden
    into it, all flattening out to the paving and to the rim."""
    if PIT[0] - 0.15 < x < PIT[1] + 0.15 and PIT[2] - 0.15 < r < PIT[3] + 0.15:
        e = min(x - PIT[0], PIT[1] - x, r - PIT[2], PIT[3] - r)
        return -0.62 * sm(-0.12, 0.04, e)
    if 2.9 < x < 41.1 and r > rim(x) - 0.12:                            # under the rim's first ledge, out of sight
        return -1.6 * sm(rim(x) - 0.12, rim(x) + 0.3, r)
    if in_court(x, r, 0.15) or r < 3.0:
        return 0.0
    h = 0.0
    pd = path_dist(x, r)
    away = sm(0.35, 1.2, pd) * sm(0.2, 1.4, rim(x) - r)
    n = n2(x * 0.42, r * 0.8, 1.0, 41) * 0.6 + n2(x * 1.1, r * 1.6, 1.0, 43) * 0.4
    h += max(0.0, n) * 0.22 * away
    # snow banked against each house's front, eased off at its door lane
    for (x0, x1, rb, rf) in [HALL[:4]] + [hh[:4] for hh in HOUSES]:
        if x0 - 0.4 < x < x1 + 0.4 and rf < r < rf + 1.0:
            h += 0.14 * math.exp(-((r - rf - 0.18) / 0.3) ** 2) * sm(0.15, 0.7, pd) * sm(x0 - 0.4, x0 + 0.3, x) * sm(x1 + 0.4, x1 - 0.3, x)
    h += 0.08 * sm(0.9, 0.0, abs(r - (COURT[3] + 0.5))) * (COURT[0] < x < COURT[2]) * sm(0.4, 1.0, pd)  # swept off the paving
    h -= 0.035 * sm(0.45, 0.1, pd)
    return h * sm(3.0, 4.6, r)


def material(x, r):
    d = path_dist(x, r) + 0.1 * I.n2(x, r, 2.7, 9)
    if d < 0.36:
        return 'path'
    if d < 0.5:
        return 'path_edge'
    return 'snow'


# the clifftop: a flat sheet to the rim under the sculpted snow (whose cells stop a little short of it)
edge = [(X0 + (X1 - X0) * i / 200, rim(X0 + (X1 - X0) * i / 200)) for i in range(201)]
for (xa_, xb_) in ((X0, 3.4), (40.6, X1)):                                  # the ends, where the rim bends back north
    seg = [(x, r) for (x, r) in edge if xa_ <= x <= xb_]
    cx_ = xb_ if xa_ == X0 else xa_
    far_ = X0 if xa_ == X0 else X1
    k.poly([(cx_, 3.0, -0.02), (far_, 3.0, -0.02)] + [(x, r, -0.02) for (x, r) in (seg if xa_ == X0 else seg[::-1])], (SNOW, 0.06), 'snow')
cells = [(c, r) for c in range(-3, COLS + 3) for r in range(3, 38)
         if (3 <= c <= 40 and r <= rim(c + 0.5) + 0.4) or r + 1.0 <= min(rim(c), rim(c + 1.0)) - 0.05]
I.ground(k, cells, material, {'snow': (SNOW, 0.04), 'path': ('#cdd3dd', 0.06), 'path_edge': ('#dbe0e8', 0.05)},
         step=0.0625, bump=0.008, seed=7, height=height, dither=0.06)


# ---- the rim: the clifftop drops to the valley in ledges of the crag's rock, snow on each -------------------------------
STAIR_X = (20.3, 23.7)                                                     # the notch the stair to the valley goes down


def drop_cliff(xa, xb, n_tiers=6, seed=29):
    rr = random.Random(seed)
    for ti in range(n_tiers):
        z_top = -ti * 0.95
        x = xa - rr.uniform(0.0, 0.4)
        while x < xb:
            w = rr.uniform(0.6, 1.6)
            x1 = min(xb + 0.4, x + w)
            if x < STAIR_X[1] and x1 > STAIR_X[0]:                       # leave the stair's notch open
                if x < STAIR_X[0] - 0.3:
                    x1 = STAIR_X[0]
                else:
                    x = STAIR_X[1]
                    continue
            xm = (x + x1) / 2
            front = rim(xm) + 0.28 * ti + rr.uniform(-0.08, 0.1) + 0.12
            top = z_top + (rr.uniform(-0.12, 0.04) if ti else -0.02)
            back = rim(xm) + 0.28 * (ti - 1) - 0.35 if ti else rim(xm) - 0.45
            gap = rr.uniform(0.03, 0.07)
            HR._block(k, x + gap / 2, x1 - gap / 2, front, back, top, rr.uniform(0.05, 0.16), HR.FACE[rr.randrange(4)], rr, icicles=0.4,
                      z_base=top - 1.15)
            k.box(x, back, top - 1.3, x1, front - 0.22, top - 0.12, ('#3c4252', 0.05), 'crag_core')
            x = x1


drop_cliff(2.4, 41.6)
# where the rim bends back north at the ends, the old strata run on round the corner
STRATA = ('#5c6276', '#545a6c', '#666c80', '#4c5264')
for (xa_, xb_) in ((X0, 3.2), (40.8, X1)):
    seg = [(x, r) for (x, r) in edge if xa_ <= x <= xb_]
    levels, z = [0.0], 0.0
    while z > -8.0:
        z -= 0.7
        levels.append(z)
    rings = [[(x, r + 0.05 * j, zz) for (x, r) in seg] for j, zz in enumerate(levels)]
    for j in range(len(rings) - 1):
        k.loft([rings[j], rings[j + 1]], (STRATA[j % 4], 0.12), 'crag_face', closed=False, smooth=False)
for i, (x, r) in enumerate(edge):
    if i % 3 == 0 and (x < 2.6 or x > 41.4):
        k.blob(x, r - 0.1, 0.0, 0.45, 0.22, 0.1, (ROOF_SNOW, 0.05), 'ledge_snow', segs=8)

# ---- the mountain behind: Fellhaven's crag, tier on tier, split by the notch the gate stands in -----------------------------
TIERS = [(1.1, 3.9), (2.2, 3.35), (3.3, 2.8), (4.4, 2.2), (5.7, 1.4), (7.0, 0.45), (8.4, -0.65), (9.8, -1.9), (11.2, -3.3)]
HR.crag(k, X0 - 0.5, GATE[0], TIERS, rr=random.Random(41), shelf_firs=0.05)
HR.crag(k, GATE[1], X1 + 0.5, TIERS, rr=random.Random(43), shelf_firs=0.05)


# the high snowfield through the notch, climbing away north toward the glacier
def field_h(x, r):
    t = max(0.0, -0.2 - r)
    return 0.75 * t + 0.08 * t * t + 0.12 * max(0.0, n2(x * 0.7, r * 1.3, 1.0, 17)) * sm(-0.2, -2.0, r)


def field_m(x, r):
    return 'snow' if I.n2(x * 0.6, r * 0.9, 1.0, 5) < 0.28 else 'windpack'


fcells = [(c, r) for c in range(int(GATE[0]) - 1, int(GATE[1]) + 2) for r in range(-12, 3)]
I.ground(k, fcells, field_m, {'snow': (SNOW, 0.04), 'windpack': ('#dfe5ee', 0.05)}, step=0.125, bump=0.01, seed=11, height=field_h, dither=0.1)
frr = random.Random(23)
HR.windswept(k, GATE[0] + 0.3, -8.0, GATE[1] - 0.3, -1.2, 14, frr, z=lambda x, r: field_h(x, r))
for (x, r, s) in ((35.4, -2.6, 0.32), (40.4, -3.6, 0.42), (37.2, -6.4, 0.5), (39.6, -1.2, 0.26)):
    HR.rime_rock(k, x, r, s, z=field_h(x, r) - 0.05, rr=frr)
for j in range(5):                                                        # wands up the snowfield, the monks' old way to the glacier
    x, r = 38.2 + 0.5 * math.sin(j * 1.3), -1.6 - j * 1.5
    z = field_h(x, r)
    k.cyl(x, r, z, z + 0.9, 0.025, ('#5a3a24', 0.1), 'wand', verts=5)
    k.box(x + 0.02, r - 0.01, z + 0.66, x + 0.22, r + 0.01, z + 0.86, ('#c83a2e', 0.08), 'wand_flag')


# ---- the buildings -----------------------------------------------------------------------------------------------------------
def face_r(rf, z0, h, lean, z):
    """Where a battered wall's face stands at height z."""
    return rf - lean * min(1.0, max(0.0, (z - z0) / max(0.1, h - 0.4)))


def footing(x0, x1, rf, z0=0.0, courses=3, ch=0.16, rr=None):
    """Coursed stone along a wall's foot, standing a little proud of it, a skim of snow on its ledge."""
    for c in range(courses):
        x = x0 - rr.uniform(0.0, 0.25)
        while x < x1 - 0.02:
            xb = min(x1, x + rr.uniform(0.28, 0.56))
            if xb - max(x0, x) > 0.06:
                qb(k, max(x0, x) + 0.015, rf - 0.12, z0 + c * ch + 0.012, xb - 0.015, rf + 0.07, z0 + (c + 1) * ch - 0.012,
                   (STONES[rr.randrange(len(STONES))], 0.14), 'footing_stone')
            x = xb
    qb(k, x0, rf - 0.12, z0, x1, rf + 0.05, z0 + courses * ch, ('#4a4640', 0.12), 'footing_joint')
    qb(k, x0 + 0.04, rf + 0.02, z0 + courses * ch - 0.004, x1 - 0.04, rf + 0.08, z0 + courses * ch + 0.035, (ROOF_SNOW, 0.03), 'ledge_snow')


def icicle_run(xa, xb, r, z, rr, every=0.2, long=0.3):
    x = xa + rr.uniform(0.02, 0.1)
    while x < xb - 0.03:
        L = rr.uniform(0.06, long) * (1.6 if rr.random() < 0.12 else 1.0)
        k.cone(x, r, z - L, z + 0.01, 0.004, rr.uniform(0.02, 0.034), (ICE, 0.08), 'icicle', verts=5)
        x += every * rr.uniform(0.6, 1.4)


def lintel(wx, rf, z, w, rr, snow=True):
    """A window's or a door's head in layers: a red board, a row of painted beam-ends, a cap — snow on it, rime under."""
    qb(k, wx - w / 2 - 0.06, rf - 0.02, z, wx + w / 2 + 0.06, rf + 0.06, z + 0.05, ('#8a2a22', 0.08), 'lintel')
    x = wx - w / 2 - 0.04
    i = 0
    while x < wx + w / 2 + 0.02:
        qb(k, x, rf - 0.02, z + 0.05, x + 0.045, rf + 0.1, z + 0.1, (('#2a6a5a', '#2a4a8a', '#c89a3a')[i % 3], 0.08), 'lintel')
        x += 0.07
        i += 1
    qb(k, wx - w / 2 - 0.1, rf - 0.02, z + 0.1, wx + w / 2 + 0.1, rf + 0.13, z + 0.14, (TIMBER, 0.08), 'lintel')
    if snow:
        qb(k, wx - w / 2 - 0.08, rf - 0.01, z + 0.14, wx + w / 2 + 0.08, rf + 0.11, z + 0.165, (ROOF_SNOW, 0.03), 'ledge_snow')
    if rr.random() < 0.6:
        icicle_run(wx - w / 2 - 0.06, wx + w / 2 + 0.06, rf + 0.11, z + 0.1, rr, every=0.1, long=0.14)


def window(wx, rf, zf, rr, lit=False, w=0.62, hgt=0.6, valance=True):
    """A window in its black trapezoid frame (wider at the foot), lattice over frosted glass (or, in the one warm cell,
    lamplit), a timber sill with a skim of snow, a striped valance under its layered lintel."""
    k.quads([((wx - w / 2, rf + 0.01, zf - 0.04), (wx + w / 2, rf + 0.01, zf - 0.04), (wx + w / 2 - 0.09, rf + 0.01, zf + hgt),
              (wx - w / 2 + 0.09, rf + 0.01, zf + hgt))], ('#120e0c', 0.06), 'window_frame')
    gw = w / 2 - 0.15
    g0, g1 = zf + 0.06, zf + hgt - 0.1
    if lit:
        qb(k, wx - gw, rf + 0.012, g0, wx + gw, rf + 0.03, g1, '#3a2410', 'window_glass', emit=(LAMPLIT, 0.9))
    else:
        qb(k, wx - gw, rf + 0.012, g0, wx + gw, rf + 0.03, g1, (('#5e7286', '#4a5a6c', '#26303a')[rr.randrange(3)], 0.05), 'window_glass')
        if rr.random() < 0.6:                                           # frost furred into the lower corner
            qb(k, wx - gw, rf + 0.031, g0, wx - gw + rr.uniform(0.06, 0.14), rf + 0.034, g0 + rr.uniform(0.06, 0.14), (FROST, 0.05), 'frost_pane')
    for dx in (-gw / 2, 0.0, gw / 2):                                   # the lattice
        qb(k, wx + dx - 0.01, rf + 0.03, g0, wx + dx + 0.01, rf + 0.042, g1, ('#5a2a1e', 0.08), 'window_bar')
    qb(k, wx - gw, rf + 0.03, (g0 + g1) / 2 - 0.01, wx + gw, rf + 0.042, (g0 + g1) / 2 + 0.01, ('#5a2a1e', 0.08), 'window_bar')
    qb(k, wx - w / 2 + 0.02, rf - 0.02, zf - 0.09, wx + w / 2 - 0.02, rf + 0.07, zf - 0.03, ('#5a3a24', 0.1), 'sill')
    qb(k, wx - w / 2 + 0.04, rf + 0.0, zf - 0.03, wx + w / 2 - 0.04, rf + 0.06, zf - 0.012, (ROOF_SNOW, 0.03), 'ledge_snow')
    if valance:
        for j, c in enumerate(('#c83a2e', '#2a6ac0', '#e0b030', '#3aa060', '#f0ece2')):
            qb(k, wx - w / 2 + 0.06 + j * (w - 0.12) / 5, rf + 0.02, zf + hgt - 0.03, wx - w / 2 + 0.06 + (j + 1) * (w - 0.12) / 5, rf + 0.09,
               zf + hgt + 0.05, (c, 0.06), 'valance')
    lintel(wx, rf, zf + hgt + 0.05, w - 0.1, rr)


def door(dx, rf, rr, w=0.66, hgt=1.0, lit=False, portico=False):
    """A double door of maroon boards in a black frame under a layered lintel and valance, gilt rings, two stone steps
    drifted with snow."""
    k.quads([((dx - w / 2 - 0.1, rf + 0.01, 0.0), (dx + w / 2 + 0.1, rf + 0.01, 0.0), (dx + w / 2 + 0.04, rf + 0.01, hgt + 0.08),
              (dx - w / 2 - 0.04, rf + 0.01, hgt + 0.08))], ('#14100e', 0.06), 'door_frame')
    for s_ in (-1, 1):
        qb(k, dx + (s_ - 1) * w / 4 + 0.01, rf + 0.012, 0.02, dx + (s_ + 1) * w / 4 - 0.01, rf + 0.035, hgt, ('#6a1a14', 0.08), 'door')
        for zz in (0.3, 0.62):                                           # iron straps, gilt studs
            qb(k, dx + (s_ - 1) * w / 4 + 0.03, rf + 0.035, hgt * zz, dx + (s_ + 1) * w / 4 - 0.03, rf + 0.045, hgt * zz + 0.035, ('#2a2420', 0.1), 'door_strap')
        k.sphere(dx + s_ * 0.08, rf + 0.05, hgt * 0.48, 0.035, 0.035, GILT, 'door_ring', segs=6)
    if lit:
        qb(k, dx - 0.015, rf + 0.01, 0.02, dx + 0.015, rf + 0.04, hgt, '#3a2410', 'door_gap', emit=(LAMPLIT, 1.0))
    for j, c in enumerate(('#c83a2e', '#2a6ac0', '#e0b030', '#3aa060', '#f0ece2', '#c83a2e')):
        qb(k, dx - w / 2 - 0.06 + j * (w + 0.12) / 6, rf + 0.03, hgt - 0.02, dx - w / 2 - 0.06 + (j + 1) * (w + 0.12) / 6, rf + 0.12, hgt + 0.08,
           (c, 0.06), 'valance')
    lintel(dx, rf + 0.02, hgt + 0.08, w + 0.2, rr)
    for i, (dr, z) in enumerate(((0.0, 0.12), (0.22, 0.06))):          # the steps, drifted
        qb(k, dx - w / 2 - 0.12 - i * 0.06, rf + dr, 0.0, dx + w / 2 + 0.12 + i * 0.06, rf + dr + 0.24, z, (STONES[i], 0.12), 'stair_step')
    k.blob(dx - w / 2 + rr.uniform(-0.1, 0.1), rf + 0.28, 0.06, 0.32, 0.16, 0.07, (SNOW, 0.04), 'drift', segs=8)
    k.blob(dx + w / 2 + 0.1, rf + 0.18, 0.1, 0.22, 0.14, 0.08, (SNOW, 0.04), 'drift', segs=8)


def gyaltsen(x, r, z, s=1.0):
    """A victory banner on a roof's corner: a black drum of yak hair banded in white and red under a gilt crown, rimed,
    snow on its top."""
    k.cyl(x, r, z, z + 0.08 * s, 0.07 * s, ('#3a2a1a', 0.1), 'banner_post', verts=8)
    k.cyl(x, r, z + 0.08 * s, z + 0.5 * s, 0.1 * s, ('#24201e', 0.1), 'banner_cloth', verts=10)
    for (zz, c) in ((0.2, '#f0ece2'), (0.34, '#c83a2e')):
        k.cyl(x, r, z + zz * s, z + (zz + 0.06) * s, 0.104 * s, (c, 0.08), 'banner_cloth', verts=10)
    k.cone(x, r, z + 0.5 * s, z + 0.62 * s, 0.11 * s, 0.04 * s, GILT, 'finial', verts=10)
    k.sphere(x, r, z + 0.67 * s, 0.045 * s, 0.045 * s, GILT, 'finial', segs=6)
    k.blob(x - 0.03, r, z + 0.62 * s, 0.07 * s, 0.07 * s, 0.03, (RIME, 0.05), 'rime', segs=6)


def flat_roof(xa, xb, ra, rb_, zt, rr, cornice=True, spouts=2):
    """The flat roof: a dark parapet with the maroon frieze under it, snow heaped inside — drifted deep against the
    back, a cornice rolling over the front edge — icicles off it, timber spouts frozen into long icicles."""
    for (a0, a1, b0, b1) in ((xa - 0.06, xb + 0.06, ra - 0.06, ra + 0.1), (xa - 0.06, xb + 0.06, rb_ - 0.1, rb_ + 0.06),
                             (xa - 0.06, xa + 0.1, ra - 0.06, rb_ + 0.06), (xb - 0.1, xb + 0.06, ra - 0.06, rb_ + 0.06)):
        qb(k, a0, b0, zt, a1, b1, zt + 0.16, (TIMBER, 0.08), 'parapet')
    HR.snow_sheet(k, (xa + 0.06, ra + 0.06, zt + 0.12), (xb - 0.06, ra + 0.06, zt + 0.12), (xb - 0.06, rb_ - 0.06, zt + 0.1),
                  (xa + 0.06, rb_ - 0.06, zt + 0.1), max(3, int((xb - xa) / 0.3)), max(3, int((rb_ - ra) / 0.3)), amp=0.05,
                  seed=xa * 3 + ra)
    x = xa + 0.2
    while x < xb - 0.2:                                                  # drifted deep against the back parapet
        k.blob(x, ra + 0.35, zt + 0.12, rr.uniform(0.4, 0.8), rr.uniform(0.3, 0.5), rr.uniform(0.08, 0.16), (ROOF_SNOW, 0.03), 'roof_snow', segs=10)
        x += rr.uniform(0.5, 0.9)
    for _ in range(max(1, int((xb - xa) * (rb_ - ra) / 6))):           # low wind-shaped humps over the rest
        k.blob(rr.uniform(xa + 0.4, xb - 0.4), rr.uniform(ra + 0.6, rb_ - 0.5), zt + 0.12, rr.uniform(0.4, 0.9), rr.uniform(0.2, 0.4), 0.05,
               (ROOF_SNOW, 0.03), 'roof_snow', rot=(0, 0, rr.uniform(-15, 15)), segs=10)
    for (xe, a, b) in ((xa, ra, rb_), (xb, ra, rb_)):                   # snow along the side parapets
        k.tube((xe, a + 0.05, zt + 0.17), (xe, b - 0.05, zt + 0.17), 0.055, (ROOF_SNOW, 0.03), 'roof_snow', verts=8)
    k.tube((xa, ra, zt + 0.17), (xb, ra, zt + 0.17), 0.06, (ROOF_SNOW, 0.03), 'roof_snow', verts=8)
    if cornice:                                                         # the cornice, rolling a little over the front
        n = max(2, int((xb - xa) / 0.25))
        pts = [(xa + (xb - xa) * i / n, rb_ + 0.03 + 0.02 * math.sin(i * 1.7), zt + 0.18 + 0.02 * math.sin(i * 2.3)) for i in range(n + 1)]
        for p, q in zip(pts, pts[1:]):
            k.tube(p, q, 0.075, (ROOF_SNOW, 0.03), 'roof_snow', verts=8)
        icicle_run(xa - 0.04, xb + 0.04, rb_ + 0.08, zt + 0.02, rr, every=0.13, long=0.34)
    for i in range(spouts):                                             # spouts out over the frieze, frozen
        sx = xa + (xb - xa) * (i + 0.5) / spouts + rr.uniform(-0.3, 0.3)
        qb(k, sx - 0.05, rb_ - 0.05, zt - 0.06, sx + 0.05, rb_ + 0.32, zt + 0.02, ('#4a3020', 0.1), 'spout')
        L = rr.uniform(0.6, 1.1)
        k.cone(sx, rb_ + 0.3, zt - 0.06 - L, zt - 0.04, 0.008, 0.05, (ICE, 0.06), 'icicle', verts=6)
        k.cone(sx + 0.05, rb_ + 0.29, zt - 0.06 - L * 0.5, zt - 0.05, 0.006, 0.03, (ICE, 0.06), 'icicle', verts=5)


def gilt_roof(cx0, cx1, cr0, cr1, zc, rise, rr):
    """The hall's gilt roof: a steep hip of fluted gilt sheet, the eaves turned up at the corners and hung with bells, a
    red frieze of brackets under it, a ridge with makara ends and the ganjira in the middle, snow lying along the
    eaves and in the flutes' feet."""
    ov = 0.32
    mr = (cr0 + cr1) / 2
    ex0, ex1, er0, er1 = cx0 - ov, cx1 + ov, cr0 - ov, cr1 + ov
    rx0, rx1 = cx0 + (mr - cr0) * 0.9, cx1 - (mr - cr0) * 0.9           # the ridge: hips at a little under 45°
    zr = zc + rise
    lift = 0.14                                                         # the corners turned up

    def eave_z(t):                                                      # 0 at a corner, 1 mid-side: a gentle sag
        return zc + lift * (1 - math.sin(t * math.pi)) ** 2
    # the bracket frieze under the eaves: red, the bracket ends picked out in green and gold
    qb(k, cx0 - 0.05, cr0 - 0.05, zc - 0.34, cx1 + 0.05, cr1 + 0.05, zc - 0.02, ('#8a2a22', 0.08), 'bracket_frieze')
    x = cx0 + 0.06
    i = 0
    while x < cx1 - 0.04:
        qb(k, x, cr1 + 0.05, zc - 0.3, x + 0.07, cr1 + 0.14, zc - 0.2, (('#2a6a5a', GILT)[i % 2], 0.08), 'bracket')
        qb(k, x - 0.02, cr1 + 0.05, zc - 0.16, x + 0.09, cr1 + 0.2, zc - 0.06, ('#8a2a22', 0.08), 'bracket')
        x += 0.22
        i += 1
    # the slopes, fluted: the front and back as strips running down the fall line, the hips as fans
    n = max(8, int((ex1 - ex0) / 0.16))
    for (er, sgn, tone) in ((er1, 1, 1.0), (er0, -1, 0.82)):
        quads, ribs = [], []
        for i in range(n):
            ta, tb = i / n, (i + 1) / n
            xa, xb = ex0 + (ex1 - ex0) * ta, ex0 + (ex1 - ex0) * tb
            ra_ = rx0 + (rx1 - rx0) * min(1, max(0, (xa - ex0 - (rx0 - ex0)) / max(0.01, rx1 - rx0)))
            pa = (xa, er, eave_z(ta))
            pb = (xb, er, eave_z(tb))
            qa = (min(max(xa, rx0), rx1), mr, zr)
            qbb = (min(max(xb, rx0), rx1), mr, zr)
            quads.append((pa, pb, qbb, qa))
            if 0 < i:
                ribs.append((pa, qa))
        k.quads(quads, (shade(GILT, tone), 0.05), 'roof_gold')
        for (p, q) in ribs:                                               # the flutes' standing seams
            k.tube((p[0], p[1] + 0.01 * sgn, p[2] + 0.02), (q[0], q[1], q[2] + 0.02), 0.018, (shade(GILT, tone * 1.12), 0.05), 'roof_gold_seam', verts=4)
    for (ex, rx_, tone) in ((ex0, rx0, 0.9), (ex1, rx1, 0.94)):         # the hip ends
        k.poly([(ex, er0, zc + lift), (ex, er1, zc + lift), (rx_, mr, zr)], (shade(GILT, tone), 0.05), 'roof_gold')
    for (ax, ar) in ((ex0, er0), (ex0, er1), (ex1, er0), (ex1, er1)):   # hip rolls, upturned tips, bells
        tx = rx0 if ax == ex0 else rx1
        k.tube((ax, ar, zc + lift + 0.03), (tx, mr, zr + 0.03), 0.04, (shade(GILT, 1.15), 0.05), 'roof_gold_ridge', verts=6)
        k.cone(ax + (-0.06 if ax == ex0 else 0.06), ar + (-0.06 if ar == er0 else 0.06), zc + lift - 0.02, zc + lift + 0.22, 0.05, 0.01,
               GILT, 'finial', verts=6)
        k.cone(ax, ar + 0.02, zc + lift - 0.2, zc + lift - 0.06, 0.05, 0.015, (shade(GILT, 0.8), 0.06), 'bell_small', verts=8)
    k.tube((rx0 - 0.05, mr, zr + 0.04), (rx1 + 0.05, mr, zr + 0.04), 0.055, (shade(GILT, 1.15), 0.05), 'roof_gold_ridge', verts=8)
    for (ex, s_) in ((rx0, -1), (rx1, 1)):                              # makara ends curling up off the ridge
        k.tube((ex, mr, zr + 0.04), (ex + s_ * 0.12, mr, zr + 0.3), 0.06, GILT, 'finial', rb=0.03, verts=6)
        k.sphere(ex + s_ * 0.14, mr, zr + 0.33, 0.05, 0.05, GILT, 'finial', segs=6)
    gx = (rx0 + rx1) / 2                                                # the ganjira
    k.cyl(gx, mr, zr, zr + 0.12, 0.13, GILT, 'finial', verts=10)
    k.sphere(gx, mr, zr + 0.26, 0.15, 0.17, GILT, 'finial', segs=10)
    k.cone(gx, mr, zr + 0.38, zr + 0.78, 0.09, 0.012, GILT, 'finial', verts=8)
    k.sphere(gx, mr, zr + 0.82, 0.05, 0.05, GILT, 'finial', segs=6)
    for s_ in (-1, 1):                                                  # two smaller vases along the ridge
        vx = gx + s_ * (rx1 - rx0) * 0.33
        k.sphere(vx, mr, zr + 0.14, 0.08, 0.1, GILT, 'finial', segs=8)
        k.cone(vx, mr, zr + 0.2, zr + 0.42, 0.05, 0.01, GILT, 'finial', verts=6)
    # snow: along the front eave and in the flutes' feet, a skim on the lower slope, rime on the ridge
    x = ex0 + 0.1
    while x < ex1 - 0.1:
        t = (x - ex0) / (ex1 - ex0)
        k.blob(x, er1 - 0.12, eave_z(t) + 0.1, rr.uniform(0.18, 0.34), 0.14, rr.uniform(0.04, 0.07), (ROOF_SNOW, 0.03), 'roof_snow',
               rot=(math.degrees(math.atan2(rise, mr - cr1)) * 0.6, 0, 0), segs=8)
        x += rr.uniform(0.2, 0.36)
    for _ in range(int((ex1 - ex0) * 1.2)):
        t = rr.uniform(0.05, 0.95)
        f = rr.uniform(0.1, 0.45)
        x = ex0 + (ex1 - ex0) * t
        k.blob(x, er1 + (mr - er1) * f, eave_z(t) + (zr - zc) * f + 0.03, rr.uniform(0.06, 0.16), 0.08, 0.02, (ROOF_SNOW, 0.03), 'roof_snow',
               rot=(-35, 0, 0), segs=6)
    icicle_run(ex0 + 0.1, ex1 - 0.1, er1 + 0.02, zc + 0.02, rr, every=0.16, long=0.26)
    x = rx0
    while x < rx1:
        k.blob(x, mr - 0.04, zr + 0.09, 0.12, 0.05, 0.025, (RIME, 0.05), 'rime', segs=6)
        x += rr.uniform(0.25, 0.45)


def gompa(x0, x1, rb, rf, h, windows=3, door_x=None, wall=WHITE, band=MAROON, gold=True, upper=True, lit=False, rr=None, floors=None,
          spouts=2, door_kw=None, porch=False):
    """A monastery building in the house style: a coursed stone footing, battered walls, windows in black frames under
    layered lintels, the frieze of twig-ends with its gilt mirrors, a flat roof heaped with snow (see flat_roof),
    victory banners at its front corners; a set-back upper storey on the bigger ones. Returns the roof's z."""
    rr = rr or random.Random(int(x0 * 131 + rb * 17))
    zt = h
    lean = 0.16
    xa, xb, ra, rb_ = x0 + lean, x1 - lean, rb + lean, rf - lean
    footing(x0 - 0.02, x1 + 0.02, rf, rr=rr)
    k.loft([[(x0, rb, 0.0), (x1, rb, 0.0), (x1, rf, 0.0), (x0, rf, 0.0)],
            [(xa, ra, zt - 0.42), (xb, ra, zt - 0.42), (xb, rb_, zt - 0.42), (xa, rb_, zt - 0.42)]],
           (wall, 0.1), 'gompa_wall', closed=True, smooth=False)
    # weather on the whitewash: a grey tide-mark of damp above the footing, streaks run down from the spouts and sills
    fz = lambda z: face_r(rf, 0.0, h, lean, z) + 0.006                   # noqa: E731
    k.quads([((x0 + 0.05, fz(0.34), 0.34), (x1 - 0.05, fz(0.34), 0.34), (x1 - 0.05, fz(0.5), 0.5 + 0.04 * math.sin(x1)), (x0 + 0.05, fz(0.5), 0.48))],
            (shade(wall, 0.9), 0.1), 'wall_stain')
    for _ in range(int((x1 - x0) * 1.3)):
        sx = rr.uniform(x0 + 0.2, x1 - 0.2)
        z1 = zt - 0.44
        z0_ = z1 - rr.uniform(0.3, 0.9)
        wd = rr.uniform(0.03, 0.08)
        k.quads([((sx - wd, fz(z0_), z0_), (sx + wd, fz(z0_), z0_), (sx + wd * 1.4, fz(z1), z1), (sx - wd * 1.4, fz(z1), z1))],
                (shade(wall, rr.uniform(0.8, 0.88)), 0.1), 'wall_stain')
    # the frieze: bundled twig-ends in two tones of maroon, gilt mirrors set in it, a line of beam-ends under it
    zb0, zb1 = zt - 0.42, zt - 0.04
    qb(k, xa - 0.04, ra - 0.04, zb0, xb + 0.04, rb_ + 0.04, zb1, (band, 0.12), 'penbey')
    zz, row = zb0 + 0.03, 0
    while zz < zb1 - 0.05:
        x = xa - 0.02 + (0.035 if row % 2 else 0.0)
        while x < xb - 0.02:
            qb(k, x, rb_ + 0.04, zz, x + 0.05, rb_ + 0.065, zz + 0.07, (shade(band, rr.choice((0.82, 1.0, 1.14))), 0.12), 'penbey_twig')
            x += 0.07
        zz += 0.085
        row += 1
    x = xa + 0.45
    while x < xb - 0.3:
        k.cyl_y(x, rb_ + 0.06, rb_ + 0.085, zt - 0.23, 0.075, 0.075, GILT, 'roundel', verts=10)
        x += 0.85
    x = xa
    while x < xb:
        qb(k, x, rb_ - 0.02, zb0 - 0.09, x + 0.07, rb_ + 0.08, zb0 - 0.02, (TIMBER, 0.1), 'beam_end')
        x += 0.15
    qb(k, xa - 0.02, rb_ - 0.02, zb0 - 0.02, xb + 0.02, rb_ + 0.07, zb0 + 0.01, ('#f0ece2', 0.08), 'trim')
    # windows by floors, the door
    nf = floors or max(1, int((h - 0.6) / 0.85))
    dk = door_kw or {}
    dw = dk.get('w', 0.66)
    top = zt - 0.54 - 0.74
    gap = (top - 0.5) / (nf - 1) if nf > 1 else 0.0
    for f in range(nf):
        zf = 0.5 + f * gap
        for i in range(windows):
            wx = x0 + (x1 - x0) * (i + 0.5) / windows
            if door_x is not None and f < (2 if porch else 1) and abs(wx - door_x) < dw / 2 + 0.45:
                continue
            window(wx, face_r(rf, 0.0, h, lean, zf), zf, rr, lit=lit and rr.random() < 0.8, w=0.62 - 0.04 * f, hgt=0.58 - 0.06 * f)
        if f > 0:                                                       # the floor's joist-ends in a row across the front
            zj = zf - gap * 0.32
            x = x0 + 0.14
            while x < x1 - 0.14:
                qb(k, x, face_r(rf, 0.0, h, lean, zj) - 0.02, zj, x + 0.07, face_r(rf, 0.0, h, lean, zj) + 0.07, zj + 0.07, (TIMBER, 0.1), 'beam_end')
                x += 0.2
    if door_x is not None:
        door(door_x, rf, rr, lit=lit, **dk)
    flat_roof(xa, xb, ra, rb_, zt, rr, spouts=spouts)
    if upper and (xb - xa) > 3.0:
        ux0, ux1 = xa + (xb - xa) * 0.12, xa + (xb - xa) * 0.56
        ur0, ur1 = ra + 0.15, ra + (rb_ - ra) * 0.5
        zu = zt + 0.95
        qb(k, ux0, ur0, zt, ux1, ur1, zu - 0.32, (wall, 0.1), 'gompa_wall')
        qb(k, ux0 - 0.03, ur0 - 0.03, zu - 0.32, ux1 + 0.03, ur1 + 0.03, zu, (band, 0.12), 'penbey')
        x = ux0 + 0.02
        while x < ux1 - 0.03:
            qb(k, x, ur1 + 0.03, zu - 0.28, x + 0.05, ur1 + 0.055, zu - 0.04, (shade(band, rr.choice((0.82, 1.0, 1.14))), 0.12), 'penbey_twig')
            x += 0.07
        for i in range(2):
            wx = ux0 + (ux1 - ux0) * (i + 0.5) / 2
            window(wx, ur1 + 0.01, zt + 0.16, rr, lit=lit, w=0.42, hgt=0.3, valance=False)
        flat_roof(ux0, ux1, ur0, ur1, zu, rr, spouts=0)
        # firewood stacked on the roof under its snow, a ladder up to the upper storey
        for j in range(3):
            k.cyl_x(ux1 + 0.3, ux1 + 1.0, ra + 0.3, zt + 0.2 + j * 0.11, 0.06, 0.06, (('#7a5a3a', '#6a4a2e', '#8a6844')[j], 0.15), 'woodpile', verts=7)
            k.cyl_x(ux1 + 0.3, ux1 + 1.0, ra + 0.44, zt + 0.2 + j * 0.11, 0.06, 0.06, (('#6a4a2e', '#8a6844', '#7a5a3a')[j], 0.15), 'woodpile', verts=7)
        k.blob(ux1 + 0.65, ra + 0.37, zt + 0.48, 0.42, 0.16, 0.06, (ROOF_SNOW, 0.03), 'roof_snow', segs=8)
        lx = ux1 + 0.15
        for s_ in (0.0, 0.26):
            k.tube((lx + s_, ur1 + 0.45, zt + 0.12), (lx + s_, ur1 + 0.05, zu - 0.05), 0.02, ('#6a4a2e', 0.12), 'ladder', verts=4)
        for j in range(4):
            t = (j + 0.5) / 4
            k.tube((lx, ur1 + 0.45 - 0.4 * t, zt + 0.12 + (zu - zt - 0.17) * t), (lx + 0.26, ur1 + 0.45 - 0.4 * t, zt + 0.12 + (zu - zt - 0.17) * t),
                   0.015, ('#6a4a2e', 0.12), 'ladder', verts=4)
    if gold:
        for xe in (xa + 0.02, xb - 0.02):
            gyaltsen(xe, rb_ - 0.02, zt + 0.16, s=0.9)
    k.solid(x0, rb, x1, rf)
    return zt


SMOKE = []
brr = random.Random(77)
# the assembly hall: a two-storey front under the gilt roof, the great door in a red-pillared porch
x0, x1, rb, rf, h = HALL
zh = gompa(x0, x1, rb, rf, h, windows=7, door_x=22.0, floors=3, rr=random.Random(5), spouts=4, upper=False,
           door_kw={'w': 1.1, 'hgt': 1.45}, porch=True)
# the porch round the great door: two red pillars against the wall with painted capitals, a beam, a little roof under snow
for px in (20.9, 23.1):
    k.cyl(px, rf + 0.1, 0.0, 1.7, 0.08, ('#9a2a22', 0.08), 'pillar', verts=8)
    qb(k, px - 0.14, rf - 0.02, 1.62, px + 0.14, rf + 0.22, 1.74, ('#2a6a5a', 0.08), 'capital')
    qb(k, px - 0.13, rf - 0.01, 0.0, px + 0.13, rf + 0.21, 0.1, (STONES[1], 0.12), 'plinth')
qb(k, 20.5, rf - 0.06, 1.74, 23.5, rf + 0.26, 1.9, ('#8a2a22', 0.08), 'beam')
x = 20.55
while x < 23.45:
    qb(k, x, rf + 0.26, 1.76, x + 0.06, rf + 0.32, 1.84, ('#c89a3a', 0.08), 'beam_end')
    x += 0.12
qb(k, 20.4, rf - 0.06, 1.9, 23.6, rf + 0.38, 1.98, (TIMBER, 0.08), 'parapet')
HR.snow_sheet(k, (20.44, rf + 0.34, 1.99), (23.56, rf + 0.34, 1.99), (23.56, rf - 0.04, 1.99), (20.44, rf - 0.04, 1.99), 10, 2, amp=0.02)
icicle_run(20.4, 23.6, rf + 0.39, 1.9, random.Random(8), every=0.12, long=0.3)
# a broken lantern hanging askew from the porch beam, its fellow fallen in the snow by the brazier
k.tube((21.3, rf + 0.3, 1.74), (21.34, rf + 0.32, 1.52), 0.01, ('#2a2420', 0.1), 'chain', verts=4)
k.box(21.22, rf + 0.25, 1.3, 21.46, rf + 0.41, 1.52, ('#3a3430', 0.1), 'lantern_cage')
k.box(21.26, rf + 0.27, 1.34, 21.42, rf + 0.39, 1.48, ('#8a9aa8', 0.05), 'lantern_glass')
k.blob(16.6, 14.4, 0.06, 0.13, 0.09, 0.08, ('#3a3430', 0.12), 'lantern_cage', rot=(0, 70, 20), segs=7)
# the hall's roof: a raised clerestory under the gilt roof, the wheel and the deer over the porch, banners at the corners
xa, xb, ra, rb_ = x0 + 0.16, x1 - 0.16, rb + 0.16, rf - 0.16
cx0, cx1, cr0, cr1 = 17.6, 26.4, 5.0, 9.4
zc = zh + 1.3
qb(k, cx0, cr0, zh + 0.1, cx1, cr1, zc - 0.66, (WHITE, 0.1), 'gompa_wall')
qb(k, cx0 - 0.03, cr0 - 0.03, zc - 0.66, cx1 + 0.03, cr1 + 0.03, zc - 0.34, (MAROON, 0.12), 'penbey')
crr = random.Random(9)
x = cx0 + 0.02
while x < cx1 - 0.03:
    for zz in (zc - 0.64, zc - 0.54, zc - 0.45):
        qb(k, x, cr1 + 0.03, zz, x + 0.05, cr1 + 0.055, zz + 0.07, (shade(MAROON, crr.choice((0.82, 1.0, 1.14))), 0.12), 'penbey_twig')
    x += 0.07
x = cx0 + 0.45
while x < cx1 - 0.3:                                                    # the clerestory's windows, dark and rimed
    window(x, cr1 + 0.01, zh + 0.18, crr, w=0.4, hgt=0.26, valance=False)
    x += 0.72
gilt_roof(cx0, cx1, cr0, cr1, zc, 1.55, random.Random(12))
for (px0, px1) in ((15.7, 17.5), (26.5, 28.3)):                          # little gilt-roofed chapels on the roof's front corners
    pr0, pr1 = 10.7, 12.1
    qb(k, px0, pr0, zh + 0.12, px1, pr1, zh + 0.62, (RED_WALL, 0.1), 'gompa_wall')
    qb(k, px0 - 0.03, pr0 - 0.03, zh + 0.62, px1 + 0.03, pr1 + 0.03, zh + 0.86, ('#4a1612', 0.12), 'penbey')
    window((px0 + px1) / 2, pr1 + 0.01, zh + 0.18, random.Random(int(px0)), w=0.44, hgt=0.3, valance=False)
    gilt_roof(px0, px1, pr0, pr1, zh + 1.12, 0.62, random.Random(int(px0) + 3))
wx = (xa + xb) / 2                                                      # the wheel and the two deer over the porch
k.cyl_y(wx, rb_ - 0.12, rb_ - 0.04, zh + 0.5, 0.26, 0.26, GILT, 'dharma_wheel', verts=16)
k.cyl_y(wx, rb_ - 0.13, rb_ - 0.02, zh + 0.5, 0.09, 0.09, (shade(GILT, 0.7), 0.05), 'dharma_wheel', verts=10)
for i in range(8):
    a = i / 8 * math.tau
    k.tube((wx + math.cos(a) * 0.09, rb_ - 0.02, zh + 0.5 + math.sin(a) * 0.09), (wx + math.cos(a) * 0.3, rb_ - 0.02, zh + 0.5 + math.sin(a) * 0.3),
           0.018, (shade(GILT, 1.1), 0.05), 'dharma_wheel', verts=4)
for s_ in (-1, 1):
    k.blob(wx + s_ * 0.44, rb_ - 0.1, zh + 0.3, 0.16, 0.09, 0.1, GILT, 'deer', segs=8)
    k.sphere(wx + s_ * 0.32, rb_ - 0.08, zh + 0.44, 0.055, 0.055, GILT, 'deer', segs=6)
    k.blob(wx + s_ * 0.44, rb_ - 0.12, zh + 0.42, 0.13, 0.07, 0.03, (RIME, 0.05), 'rime', segs=6)
for xe in (xa + 0.05, xb - 0.05):
    gyaltsen(xe, rb_ - 0.04, zh + 0.16, s=1.3)
    gyaltsen(xe, ra + 0.5, zh + 0.16, s=1.1)
# prayer flags from the gilt roof's ganjira down to the court's flagpoles
for s_ in (-1, 1):
    A.mani_flags(k, (22.0 + s_ * 1.0, rf - 0.2, zh + 0.8), (22.0 + s_ * 10.4, 22.0, 2.5), sag=0.8)
    A.mani_flags(k, (22.0 + s_ * 6.7, rf - 0.2, zh + 0.8), (22.0 + s_ * 10.4, 16.0, 2.5), sag=0.5)
# the drum by the door, on its stand, rimed
k.cyl_y(19.6, 13.6, 14.2, 1.1, 0.5, 0.5, ('#a8222a', 0.08), 'drum', verts=18)
k.cyl_y(19.6, 14.18, 14.24, 1.1, 0.46, 0.46, ('#e8dcc0', 0.05), 'drum_skin', verts=18)
for zz in (0.72, 1.48):
    k.cyl_y(19.6, 14.2, 14.26, zz, 0.06, 0.06, GILT, 'drum_stud', verts=6)
for x in (19.2, 20.0):
    k.box(x - 0.04, 13.8, 0.0, x + 0.04, 14.0, 0.7, ('#3a2a1a', 0.08), 'drum_stand')
k.blob(19.6, 13.9, 1.58, 0.36, 0.28, 0.07, (ROOF_SNOW, 0.03), 'roof_snow', segs=10)
k.solid(19, 13, 21, 15)

# the bell on its frame by the gate in the north-east: two red posts under a little snowy roof, the bronze bell rimed, the
# striker beam hung beside it on its ropes
for bx in (36.3, 38.3):
    k.box(bx - 0.1, 6.8, 0.0, bx + 0.1, 7.0, 2.4, ('#8a2a22', 0.08), 'bell_frame')
    k.box(bx - 0.14, 6.76, 0.0, bx + 0.14, 7.04, 0.22, (STONES[0], 0.12), 'plinth')
k.box(36.0, 6.75, 2.4, 38.6, 7.05, 2.55, ('#4a2a1a', 0.08), 'bell_frame')
x = 36.05
while x < 38.55:
    k.box(x, 7.05, 2.42, x + 0.05, 7.09, 2.5, ('#c89a3a', 0.08), 'beam_end')
    x += 0.12
k.quads([((35.85, 7.3, 2.6), (38.75, 7.3, 2.6), (38.75, 6.9, 2.95), (35.85, 6.9, 2.95))], ('#4a2a1a', 0.08), 'roof_board')
k.quads([((35.85, 6.5, 2.6), (38.75, 6.5, 2.6), (38.75, 6.9, 2.95), (35.85, 6.9, 2.95))], ('#3a2014', 0.08), 'roof_board')
HR.snow_sheet(k, (35.85, 7.32, 2.66), (38.75, 7.32, 2.66), (38.75, 6.9, 3.01), (35.85, 6.9, 3.01), 8, 2, amp=0.03)
icicle_run(35.85, 38.75, 7.33, 2.6, random.Random(57), every=0.12, long=0.28)
k.cone(37.3, 6.9, 1.2, 2.3, 0.45, 0.2, ('#7a6a3a', 0.1), 'bell', verts=18)
k.cyl(37.3, 6.9, 1.15, 1.24, 0.47, ('#6a5a30', 0.1), 'bell', verts=18)
for zz in (1.5, 1.95):
    k.cyl(37.3, 6.9, zz, zz + 0.04, 0.45 - (zz - 1.2) * 0.23 + 0.01, ('#8a7a48', 0.1), 'bell', verts=18)
k.cyl(37.3, 6.9, 2.3, 2.4, 0.08, ('#3a3430', 0.1), 'bell_hanger', verts=8)
k.blob(37.3, 6.9, 2.3, 0.24, 0.2, 0.07, (RIME, 0.05), 'rime', segs=8)
k.blob(37.1, 7.25, 1.6, 0.18, 0.06, 0.32, (RIME, 0.05), 'rime', segs=8)
for zz in (2.4,):
    k.tube((36.75, 6.9, zz), (36.75, 6.9, 1.62), 0.01, ('#8a7a5a', 0.1), 'rope', verts=4)
k.cyl_x(36.4, 37.0, 6.9, 1.6, 0.07, 0.07, ('#6a4a2e', 0.12), 'striker', verts=8)
k.solid(36, 6, 39, 8)

# the monks' houses and the two red chapels
for i, (x0, x1, rb, rf, hh, nw, kind, lit) in enumerate(HOUSES):
    gompa(x0, x1, rb, rf, hh, windows=nw, door_x=(x0 + x1) / 2, wall=WHITE if kind == 'white' else RED_WALL,
          band=MAROON if kind == 'white' else '#4a1612', lit=lit, rr=random.Random(100 + i))
# Brother Anselm's cell: the one warm window, smoke from its chimney, his brazier at the door
x0, x1, rb, rf = HOUSES[0][:4]
k.box(7.3, 9.0, 2.62, 7.9, 9.5, 3.5, ('#8a8478', 0.12), 'chimney')
for zz in (2.9, 3.2):
    k.box(7.28, 9.48, zz, 7.92, 9.52, zz + 0.03, ('#6a6458', 0.12), 'chimney')
k.box(7.24, 8.96, 3.5, 7.96, 9.54, 3.58, ('#5a5650', 0.12), 'chimney')
k.blob(7.6, 9.25, 3.6, 0.3, 0.24, 0.05, (ROOF_SNOW, 0.03), 'roof_snow', segs=8)
SMOKE.append(screen(7.6, 9.2, 3.6))
k.point_light(6.0, 14.4, 1.0, '#ffb060', 12, radius=0.2, group='flicker')
k.cyl(4.7, 13.92, 0.0, 0.34, 0.05, ('#2e3038', 0.1), 'brazier_leg', verts=6)
k.cyl(4.7, 13.92, 0.34, 0.5, 0.17, ('#2e3038', 0.1), 'brazier', verts=12)
k.cyl(4.7, 13.92, 0.48, 0.52, 0.13, '#3a1808', 'brazier_coals', emit=('#ff8a30', 1.0), verts=10)
k.point_light(4.7, 14.1, 0.8, '#ff9a40', 5, radius=0.15, group='flicker')
k.box(5.1, 13.7, 0.0, 5.5, 13.95, 0.08, ('#8a3a2a', 0.1), 'mat')      # his mat, swept clear

# ---- the courtyard: the paving, the frozen fountain, chortens, prayer wheels, the cold ---------------------------------------
A.setts(k, COURT[0], COURT[1], COURT[2], COURT[3], tone='#9a968e', w=(0.6, 1.0), d=0.6, grout='#5a5650', part='flagstones')
frr = random.Random(31)
for i in range(110 if not QUICK else 50):                               # frost feathering out over the stones from the hall's door
    a = frr.uniform(0.15, math.pi - 0.15)
    d = abs(frr.gauss(0, 4.0)) + 0.6
    x, r = 22.0 + math.cos(a) * d * 1.4, 14.2 + math.sin(a) * d
    if COURT[0] < x < COURT[2] and COURT[1] < r < COURT[3]:
        k.blob(x, r, 0.05, frr.uniform(0.25, 0.55), 0.07, 0.008, ('#c4ccd4', 0.04), 'frost', rot=(0, 0, math.degrees(a) + frr.uniform(-20, 20)), segs=7)
for _ in range(26 if not QUICK else 14):                                # snow blown into the joints toward the edges
    x, r = frr.uniform(COURT[0] + 0.2, COURT[2] - 0.2), frr.uniform(COURT[1] + 0.2, COURT[3] - 0.2)
    e = min(x - COURT[0], COURT[2] - x, r - COURT[1], COURT[3] - r)
    if e < 2.5 and frr.random() < 0.8:
        k.blob(x, r, 0.05, frr.uniform(0.12, 0.3), frr.uniform(0.04, 0.09), 0.012, (SNOW, 0.04), 'drift', rot=(0, 0, frr.uniform(-30, 30)), segs=7)
A.snow_edge(k, COURT[0], COURT[1], COURT[2], COURT[3], every=0.6)
# the fountain: a stone basin, its water frozen to a dome, every jet hanging in glass, icicles off the rim
W.annulus(k, 22.0, 21.4, 1.2, 1.5, 0.0, 0.5, ('#9a968e', 0.08), 'basin', segs=28)
W.annulus(k, 22.0, 21.4, 1.16, 1.56, 0.5, 0.58, ('#8a867e', 0.08), 'basin_rim', segs=28)
W.annulus(k, 22.0, 21.4, 1.2, 1.5, 0.58, 0.62, (ROOF_SNOW, 0.04), 'ledge_snow', segs=28)
for i in range(22):
    a = i / 22 * math.tau
    if math.sin(a) > -0.2:
        k.cone(22.0 + math.cos(a) * 1.55, 21.4 + math.sin(a) * 1.55, 0.18 + 0.12 * (i % 3), 0.58, 0.004, 0.03, (ICE, 0.06), 'icicle', verts=5)
k.cyl(22.0, 21.4, 0.0, 0.46, 1.22, ('#bcdcef', 0.05), 'ice', verts=28)
k.blob(22.0, 21.4, 0.46, 1.1, 1.0, 0.12, ('#cfe6f4', 0.05), 'ice', segs=16)
for i in range(9):                                                      # the jet, frozen as it rose and fell
    a = i / 9 * math.tau
    k.tube((22.0, 21.4, 0.45), (22.0 + math.cos(a) * 0.5, 21.4 + math.sin(a) * 0.4, 1.4), 0.06, ('#d8eef8', 0.05), 'ice', rb=0.03, verts=6)
    k.tube((22.0 + math.cos(a) * 0.5, 21.4 + math.sin(a) * 0.4, 1.4), (22.0 + math.cos(a) * 0.95, 21.4 + math.sin(a) * 0.75, 0.55), 0.04,
           ('#c4e2f2', 0.05), 'ice', rb=0.02, verts=6)
k.cyl(22.0, 21.4, 0.45, 1.1, 0.13, ('#9a968e', 0.08), 'basin', verts=12)          # the stem and the upper dish
k.cone(22.0, 21.4, 1.0, 1.2, 0.18, 0.5, ('#9a968e', 0.08), 'basin', verts=18)
k.cyl(22.0, 21.4, 1.2, 1.25, 0.5, ('#bcdcef', 0.05), 'ice', verts=18)
for i in range(16):                                                     # the dish's overflow frozen into a fringe
    a = i / 16 * math.tau
    L = 0.25 + 0.3 * abs(math.sin(i * 2.1))
    k.cone(22.0 + math.cos(a) * 0.5, 21.4 + math.sin(a) * 0.5, 1.2 - L, 1.22, 0.006, 0.05, (HR.ICES[i % 3], 0.05), 'icicle', verts=5)
k.tube((22.0, 21.4, 1.2), (22.0, 21.4, 2.05), 0.1, ('#d8eef8', 0.05), 'ice', rb=0.05, verts=8)
k.sphere(22.0, 21.4, 2.08, 0.13, 0.11, ('#eef8fc', 0.05), 'ice', segs=8)
for i in range(6):                                                      # the top jet, caught falling back
    a = i / 6 * math.tau + 0.3
    k.tube((22.0, 21.4, 2.0), (22.0 + math.cos(a) * 0.32, 21.4 + math.sin(a) * 0.26, 1.35), 0.035, ('#cfe8f6', 0.05), 'ice', rb=0.015, verts=5)
k.solid(20.5, 20.0, 23.5, 22.8)
for (x, r, s) in ((13.4, 24.6, 0.8), (30.6, 24.6, 0.8)):
    top = A.chorten(k, x, r, s=s)
    k.blob(x, r, top[2] - 0.88 * s, 0.24 * s, 0.22 * s, 0.07, (ROOF_SNOW, 0.04), 'roof_snow', segs=8)   # snow on the dome's shoulder
A.prayer_wheels(k, 12.2, 17.0, 28.4)
A.prayer_wheels(k, 27.0, 31.8, 28.4)
for (a, b) in ((12.2, 17.0), (27.0, 31.8)):                            # icicles off the wheels' little roofs, rime on the drums
    icicle_run(a - 0.3, b + 0.3, 28.66, 1.14, random.Random(int(a)), every=0.14, long=0.22)
for (x, r) in ((11.6, 16.0), (32.4, 16.0), (11.6, 22.0), (32.4, 22.0)):   # the tall prayer-flag poles at the court's corners
    k.cyl(x, r, 0.0, 2.6, 0.06, ('#5a3a24', 0.1), 'flagpole', verts=6)
    k.cyl(x, r, 0.0, 0.16, 0.13, (STONES[0], 0.12), 'plinth', verts=8)
    k.box(x - 0.02, r - 0.02, 1.2, x + 0.02, r + 0.02, 2.5, ('#e8dcc0', 0.06), 'banner')
    k.box(x + 0.02, r - 0.12, 1.2, x + 0.06, r + 0.12, 2.5, ('#c83a2e', 0.08), 'banner')
    k.box(x + 0.02, r - 0.13, 1.2, x + 0.065, r + 0.13, 1.3, ('#2a6ac0', 0.08), 'banner')
    k.sphere(x, r, 2.66, 0.07, 0.07, GILT, 'finial', segs=6)
    k.blob(x, r, 2.62, 0.08, 0.08, 0.03, (RIME, 0.05), 'rime', segs=6)
    k.solid_post(x, r)
# the old wall down the east and west edges of the clifftop: coursed stone, snow heaped on its coping
for xw in (0.6, 43.4):
    wr = random.Random(int(xw * 10))
    for c in range(4):
        r = 5.0 - wr.uniform(0.0, 0.3)
        while r < 30.0:
            rb2 = min(30.0, r + wr.uniform(0.4, 0.8))
            qb(k, xw - 0.26, r + 0.02, c * 0.22 + 0.01, xw + 0.26, rb2 - 0.02, (c + 1) * 0.22 - 0.01, (STONES[wr.randrange(5)], 0.14), 'wall_stone')
            r = rb2
    qb(k, xw - 0.24, 5.0, 0.0, xw + 0.24, 30.0, 0.88, ('#4a4640', 0.12), 'wall_stone')
    k.tube((xw, 5.0, 0.95), (xw, 30.0, 0.95), 0.2, (ROOF_SNOW, 0.04), 'roof_snow', verts=10)
    r = 5.2
    while r < 29.8:
        k.blob(xw, r, 0.98, 0.26, wr.uniform(0.3, 0.6), wr.uniform(0.05, 0.12), (ROOF_SNOW, 0.04), 'roof_snow', segs=8)
        r += wr.uniform(0.5, 0.9)
    k.box(xw - 0.3, 29.7, 0.0, xw + 0.3, 30.3, 1.2, (STONES[2], 0.12), 'wall_stone', bevel=0.03)   # its end post
    k.blob(xw, 30.0, 1.24, 0.3, 0.3, 0.1, (ROOF_SNOW, 0.04), 'roof_snow', segs=8)
# the north-east gate onto the heart: a gatehouse in the notch, its doors sealed in ice
gompa(35.6, 41.2, -0.4, 1.6, 2.8, windows=4, door_x=None, rr=random.Random(51), spouts=2, upper=False)
k.quads([((37.2, 1.61, 0.0), (39.6, 1.61, 0.0), (39.5, 1.61, 2.1), (37.3, 1.61, 2.1))], ('#14100e', 0.06), 'door_frame')
k.box(37.4, 1.6, 0.0, 39.4, 1.66, 2.0, ('#6a1a14', 0.08), 'door')
for zz in (0.5, 1.1, 1.6):
    k.box(37.45, 1.66, zz, 39.35, 1.68, zz + 0.06, ('#2a2420', 0.1), 'door_strap')
k.box(37.2, 1.66, 0.0, 39.6, 1.8, 2.1, ('#c4e2f2', 0.04), 'ice_seal')
grr = random.Random(53)
for j in range(14):                                                     # the ice over the doors, in sheets and columns
    xg = 37.25 + j * 0.17
    k.tube((xg, 1.82, 2.1), (xg + grr.uniform(-0.05, 0.05), 1.86, grr.uniform(0.0, 0.6)), grr.uniform(0.05, 0.09), (HR.ICES[grr.randrange(3)], 0.05),
           'ice', rb=0.03, verts=6)
lintel(38.4, 1.66, 2.1, 2.4, grr)
k.solid(35, -1, 42, 2)
# the stairs down: to the valley (south, over the rim), to the caves (west, a doorway in a little stair-house)
strr = random.Random(37)
for i in range(16):                                                     # the flight cut down through the rim's ledges, drifted
    r_, z_ = 34.0 + i * 0.3, -i * 0.3
    k.box(STAIR_X[0] + 0.3, r_, -6.5, STAIR_X[1] - 0.3, r_ + 0.32, z_ + 0.04, (STONES[i % 3], 0.12), 'stair_step')
    k.box(STAIR_X[0] + 0.3, r_ + 0.27, z_ - 0.22, STAIR_X[1] - 0.3, r_ + 0.32, z_ + 0.04, (shade(STONES[i % 3], 0.8), 0.12), 'stair_step')
    k.blob(STAIR_X[0] + 0.5 + (i % 2) * 2.2, r_ + 0.14, z_ + 0.05, strr.uniform(0.2, 0.34), 0.12, 0.05, (SNOW, 0.04), 'drift', segs=7)
    for xw in (STAIR_X[0] + 0.15, STAIR_X[1] - 0.15):                    # the parapets either side, snow on their tops
        k.box(xw - 0.15, r_, -6.5, xw + 0.15, r_ + 0.3, z_ + 0.42, ('#5c6276', 0.12), 'stair_wall')
        k.box(xw - 0.16, r_ - 0.01, z_ + 0.42, xw + 0.16, r_ + 0.31, z_ + 0.48, (ROOF_SNOW, 0.04), 'ledge_snow')
srr = random.Random(61)
x0s, x1s, rbs, rfs = SH
k.box(PIT[0], PIT[2], -0.7, PIT[1], PIT[3], -0.6, '#140c08', 'doorway', emit=('#4aa8e8', 0.3))
for x in (x0s + 0.2, x1s - 0.2):
    k.box(x - 0.2, rbs, 0.0, x + 0.2, rfs, 1.5, (WHITE, 0.1), 'gompa_wall')
    footing(x - 0.22, x + 0.22, rfs, rr=srr, courses=1)
k.box(x0s, rbs, 1.5, x1s, rfs + 0.08, 1.68, (MAROON, 0.12), 'penbey')
k.box(x0s - 0.06, rbs - 0.06, 1.68, x1s + 0.06, rfs + 0.14, 1.78, (TIMBER, 0.08), 'parapet')
flat_roof(x0s, x1s, rbs, rfs + 0.08, 1.78, srr, spouts=1)
gyaltsen(x0s + 0.05, rfs, 1.94, s=0.7)
gyaltsen(x1s - 0.05, rfs, 1.94, s=0.7)
for i in range(4):                                                      # the first steps going down into the blue
    k.box(x0s + 0.5, rfs - 0.36 - i * 0.32, -0.7, x1s - 0.5, rfs - 0.06 - i * 0.32, -0.08 - i * 0.15, (('#8a96a6', '#7a8696')[i % 2], 0.1),
          'stair_step')
    k.blob(x0s + 0.65, rfs - 0.2 - i * 0.32, -0.08 - i * 0.15, 0.18, 0.1, 0.04, (SNOW, 0.04), 'drift', segs=6)

# ---- the courtyard's life gone cold ----------------------------------------------------------------------------------------
lrr = random.Random(71)
for (x, r) in ((16.0, 14.6), (28.0, 14.6)):                             # the braziers by the hall, long out, rimed
    for a in (0.3, 2.4, 4.4):
        k.tube((x + math.cos(a) * 0.24, r + math.sin(a) * 0.2, 0.0), (x + math.cos(a) * 0.14, r + math.sin(a) * 0.12, 0.5), 0.025,
               ('#2e3038', 0.1), 'brazier_leg', verts=4)
    W.annulus(k, x, r, 0.24, 0.32, 0.5, 0.72, ('#3a3430', 0.12), 'brazier', segs=16)
    k.cyl(x, r, 0.56, 0.68, 0.25, ('#4a4440', 0.1), 'brazier_ash', verts=12)
    k.blob(x, r, 0.7, 0.28, 0.26, 0.08, (RIME, 0.04), 'rime', segs=10)
    k.solid_post(x, r)
for (x, r) in ((9.4, 16.4), (34.6, 22.2)):                              # woodpiles: split logs, end-grain out, snow on top
    for j in range(4):
        for i in range(4 - (j // 2)):
            xx = x - 0.36 + i * 0.24 + (j % 2) * 0.1
            zz = 0.1 + j * 0.15
            k.cyl_y(xx, r - 0.28, r + 0.28, zz, 0.08, 0.075, (('#7a5a3a', '#6a4a2e', '#8a6844')[(i + j) % 3], 0.15), 'woodpile', verts=7)
            k.cyl_y(xx, r + 0.28, r + 0.3, zz, 0.07, 0.065, ('#c8a070', 0.12), 'woodpile_end', verts=7)
    k.blob(x, r, 0.68, 0.52, 0.34, 0.1, (ROOF_SNOW, 0.04), 'roof_snow', segs=10)
    k.solid(x - 0.5, r - 0.3, x + 0.5, r + 0.3)
k.cyl(33.0, 26.4, 0.0, 4.2, 0.07, ('#5a3a24', 0.1), 'darchen', verts=8)              # the great prayer pole, its long flag
k.cyl(33.0, 26.4, 0.0, 0.2, 0.18, (STONES[0], 0.12), 'plinth', verts=8)
k.sphere(33.0, 26.4, 4.25, 0.08, 0.08, GILT, 'finial', segs=8)
for i, c in enumerate(('#2a6ac0', '#f4f0e8', '#c83a2e', '#3aa060', '#e0b030')):
    k.box(33.04, 26.36, 3.9 - i * 0.55, 33.08, 26.86, 4.42 - i * 0.55, (c, 0.06), 'darchen_flag')
k.solid_post(33.0, 26.4)
k.box(9.4, 25.2, 0.0, 11.0, 25.9, 0.45, ('#8a8478', 0.14), 'trough')                 # the stone trough, frozen
k.box(9.5, 25.3, 0.45, 10.9, 25.8, 0.48, ('#c4e2f2', 0.04), 'ice')
k.cyl_y(10.2, 25.9, 26.1, 0.36, 0.03, 0.03, ('#5a5650', 0.1), 'spout', verts=6)
k.cone(10.2, 26.08, 0.0, 0.36, 0.09, 0.02, (ICE, 0.06), 'icicle', verts=6)
k.solid(9.4, 25.2, 11.0, 25.9)
# a sangkang on the east house's roof: the juniper-burner, a white bulb of a stove, cold, a crust of snow on its lip
SX, SR, SZ, SS = 40.0, 12.4, HOUSES[2][4] + 0.12, 0.7
k.cyl(SX, SR, SZ, SZ + 0.2 * SS, 0.34 * SS, (STONES[3], 0.12), 'plinth', verts=10)
k.sphere(SX, SR, SZ + 0.62 * SS, 0.32 * SS, 0.42 * SS, ('#f0ece2', 0.08), 'sangkang', segs=12)
k.cone(SX, SR, SZ + 0.98 * SS, SZ + 1.45 * SS, 0.14 * SS, 0.04 * SS, ('#f0ece2', 0.08), 'sangkang', verts=10)
k.cyl(SX, SR, SZ + 1.45 * SS, SZ + 1.5 * SS, 0.06 * SS, GILT, 'finial', verts=8)
k.blob(SX, SR, SZ + 0.98 * SS, 0.2 * SS, 0.2 * SS, 0.05, (ROOF_SNOW, 0.04), 'roof_snow', segs=8)
# a maroon robe and a yellow one frozen stiff on a line across the roof of the house below Anselm's
RZ = HOUSES[1][4] + 0.12
for xp in (5.0, 7.8):
    k.tube((xp, 18.8, RZ), (xp, 18.8, RZ + 1.1), 0.025, ('#5a3a24', 0.1), 'post', verts=5)
k.tube((5.0, 18.8, RZ + 1.08), (7.8, 18.8, RZ + 1.08), 0.008, ('#2a2018', 0.1), 'line', verts=4)
k.poly([(5.4, 18.82, RZ + 1.06), (6.1, 18.82, RZ + 1.06), (6.05, 18.82, RZ + 0.36), (5.45, 18.82, RZ + 0.42)], ('#7a2420', 0.1), 'robe')
k.poly([(6.4, 18.82, RZ + 1.06), (6.9, 18.82, RZ + 1.06), (6.87, 18.82, RZ + 0.66), (6.43, 18.82, RZ + 0.68)], ('#d8a030', 0.1), 'robe')
icicle_run(5.45, 6.05, 18.83, RZ + 0.4, lrr, every=0.08, long=0.12)
k.blob(5.75, 18.82, RZ + 1.09, 0.34, 0.03, 0.02, (RIME, 0.05), 'rime', segs=6)
# along the rim over the valley: chortens, cairns of carved mani stones, flags strung between them
rim_tops = []
for (x, sc) in ((8.0, 0.6), (36.0, 0.6), (14.6, 0.45), (29.4, 0.45)):
    rim_tops.append(A.chorten(k, x, 31.0, s=sc))
for (x, r) in ((11.2, 31.4), (32.8, 31.4), (17.4, 31.2), (26.6, 31.2)):
    for j, f in enumerate((0.32, 0.24, 0.17)):
        k.rock(x, r, j * 0.22 + f * 0.6, f, f * 0.9, f * 0.6, ('#7a7c86', 0.18), part='cairn', segs=7)
    k.box(x - 0.18, r + 0.2, 0.02, x + 0.18, r + 0.3, 0.26, ('#6a6e7a', 0.12), 'mani_stone')        # a carved stone leant on it
    for i in range(3):
        k.box(x - 0.12 + i * 0.09, r + 0.3, 0.08, x - 0.08 + i * 0.09, r + 0.31, 0.2, ('#e8dcc0', 0.08), 'mani_letters')
    k.blob(x, r, 0.68, 0.16, 0.14, 0.05, (ROOF_SNOW, 0.04), 'roof_snow', segs=7)
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
A.mani_flags(k, rim_tops[0], rim_tops[2], sag=0.35)
A.mani_flags(k, rim_tops[3], rim_tops[1], sag=0.35)
# juniper bushes buried in the drifts along the walls, rime on them
for (x, r, s) in ((1.8, 22.5, 1.0), (2.0, 27.0, 0.8), (42.2, 24.8, 0.9), (42.0, 28.2, 1.1), (1.9, 9.6, 0.8), (42.3, 7.4, 0.9)):
    for j in range(4):                                                  # a low dark juniper, snow lying in its top
        k.blob(x + lrr.uniform(-0.25, 0.25) * s, r + lrr.uniform(-0.12, 0.12) * s, 0.1 * s, 0.26 * s, 0.2 * s, 0.18 * s,
               (('#2e4a38', '#3a5a40', '#26402e')[j % 3], 0.2), 'juniper', segs=8)
    k.blob(x - 0.04, r - 0.04, 0.22 * s, 0.34 * s, 0.24 * s, 0.07 * s, (ROOF_SNOW, 0.05), 'juniper_snow', segs=9)
# wind-shaped ripples over the open snow
HR.windswept(k, 1.4, 21.0, 42.6, 33.4, 34, lrr, ok=lambda x, r: (not in_court(x, r, 0.6) and not under_house(x, r, 0.6) and path_dist(x, r) > 0.8
                                                               and r < rim(x) - 1.0 and not (12.0 < x < 32.0 and 27.6 < r < 29.0)),
             z=lambda x, r: height(x, r))

# ---- the edges ---------------------------------------------------------------------------------------------------------------
k.solid(-3, -10, COLS + 3, 4)
k.solid(-1, 0, 1, ROWS)
k.solid(COLS - 1, 0, COLS, ROWS)
for x in range(-1, COLS + 1):
    k.solid(x, int(rim(x + 0.5) - 0.4), x + 1, ROWS + 4)
k.blocked.discard((22, 34))

A.flush(k)
k.sun((0.8, 0.25, -0.38), '#ffe0c0', 3.2, angle=3.0)
k.render(OUT, cycle='day', light_states={'full': {}}, light_samples=24 if QUICK else 64, world_light=('#8a96cc', 0.95))

VALLEY = {'spawns': [['golem', 17, 18], ['golem', 27, 18], ['golem', 22, 25], ['wraith', 14, 15], ['wraith', 30, 15],
                     ['wraith', 22, 16], ['wraith', 38, 12]]}
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Cliff Monastery', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [22, 33]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'cold': True, 'coldRate': 1.3, 'view': [-2.0, -6.0, COLS + 2.0, 36.0], 'valley': VALLEY,
          'onFaint': {'world': 'hoarfell-monastery', 'spawn': [9, 14], 'who': 'BROTHER ANSELM',
                      'line': 'YOU COME ROUND ON A MAT BY A BRAZIER, AN OLD MONK POURING BUTTER TEA. "THE COLD ONES DON\'T COME IN HERE. DRINK. THEN GO CAREFULLY."'}})
w['interactions'] = [
    {'x': 22, 'y': 34, 'type': 'enter_world', 'label': 'THE STAIR', 'prompt': 'PRESS E TO GO DOWN', 'target': 'hoarfell-valley', 'spawn': [27, 10]},
    {'x': 6, 'y': 26, 'type': 'enter_world', 'label': 'THE MONKS\' STAIR', 'prompt': 'PRESS E TO GO DOWN', 'target': 'hoarfell-caves', 'spawn': [34, 5]},
    {'x': 38, 'y': 3, 'type': 'vale', 'label': 'THE ICE GATE', 'prompt': 'PRESS E TO LOOK'},
    {'x': 37, 'y': 8, 'type': 'vale', 'label': 'THE BELL', 'prompt': 'PRESS E TO RING'},
    {'x': 22, 'y': 13, 'type': 'dialog', 'label': 'THE HALL', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE GREAT DOORS STAND OPEN A HAND\'S WIDTH, FROST FEATHERED ACROSS THEM. INSIDE, IN THE DARK, ROWS OF CUSHIONS, BUTTER LAMPS GONE COLD, AND A GILT FIGURE THREE STOREYS TALL WITH ICE IN ITS LAP.'},
    {'x': 22, 'y': 23, 'type': 'dialog', 'label': 'FOUNTAIN', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE FOUNTAIN FROZE MID-LEAP: EVERY JET OF WATER HANGING IN THE AIR IN GLASS. A SPARROW IS STUCK IN ONE, PERFECTLY STILL.'},
    {'x': 6, 'y': 14, 'type': 'dialog', 'label': 'BROTHER ANSELM', 'prompt': 'PRESS E TO TALK', 'dialog': 'AN OLD MONK BY A BRAZIER.'},
    {'x': 14, 'y': 28, 'type': 'vale', 'label': 'PRAYER WHEELS', 'prompt': 'PRESS E TO TURN THEM'},
]
open(WORLD, 'w').write(json.dumps(w, indent=1) + '\n')
actors = [{'sheet': 'npc-anselm', 'x': 6, 'y': 14, 'facing': 'down'}]
k.solid(6, 14, 7, 15)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, actors=actors, scene_extra={'backdrop': True, 'smoke': SMOKE})
print('monastery done')
