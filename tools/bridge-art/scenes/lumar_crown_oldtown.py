"""Crownhaven's Old Town — the walled town on the point west of the harbour (world id "lumar-crown-oldtown").

  BVENV/bin/python tools/bridge-art/scenes/lumar_crown_oldtown.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-crown-oldtown

The capital's first district (Workstream A: Crownhaven grown into a capital of districts; kit assets_capital.py). The
oldest part of the city, inside its own walls on a rocky point: tall jettied townhouses leaning over lanes that climb in
bands from the harbour lane to the north wall, joined by alleys under washing lines; the Old Keep in the north-west
corner; Well Square with the old well and a lime tree; the Lantern Theatre on Theatre Street; the sea wall along the
south with the Sea Steps down to a landing stage; round towers on the corners.

Ways out: the LAND GATE (east, Theatre Street) back into Crownhaven by the lighthouse; the NORTH GATE (to the canal
quarter) and the BRIDGE GATE (south-east, onto the bridge over the harbour mouth) — js/capital.js wires each one to its
district once that world is on main (until then they're closed, with a word on why).

Layout (fronts face the camera, south): a band is a street, the backs of the next row's yards (hidden behind its
roofs, never walkable) and that row of houses. Wall Lane under the north wall · houses · Well Street (the square) ·
houses and the theatre · Theatre Street · houses · Harbour Lane along the sea wall.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_capital as CAP           # noqa: E402
import assets_coast as C               # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_village as V             # noqa: E402
import assets_house as HK              # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-crown-oldtown.json')
WID = 'lumar-crown-oldtown'
COLS, ROWS = 56, 40
k = Kit(COLS, ROWS, margin_top=3.0, margin_bottom=1.0, margin_x=0.5, seed=5101)
rng = k.rng
C45 = math.cos(math.radians(45))

# ---- the plan -------------------------------------------------------------------------------------------------------
WX = 4.6                 # the west wall's line
NR = 3.0                 # the north wall's face
SR = 35.8                # the sea wall's face
EX = 54.4                # the east wall's line (the Land Gate's)
NGATE = 28.0             # the North Gate's middle
SEA_STEPS = (42.6, 44.6)  # the gap in the sea wall down to the landing stage
KEEP = (5.2, 11.6, 3.2, 9.4)
THEATRE = (20.0, 31.6, 5.6, 10.6)        # in the north row, its back to the wall lane
WELLSQ = (34.0, 42.0)                     # Well Square: a gap in the second row, open from street to street
CHAPEL = (45.6, 50.0)                     # St Elmo's, in the fourth row
# the rows of houses, north to south: (back, front) and the alleys through each (whole tiles, two wide, staggered so
# the way down through the town winds)
ROWSPEC = [
    dict(name='B', back=7.4, front=10.0, gaps=[(14.0, 16.0), (44.0, 46.0)], x0=12.0, storeys=(2, 3, 3), seed=201,
         signs=[(13.0, 'bottle'), (41.0, 'compass')]),
    dict(name='C', back=14.6, front=17.2, gaps=[(9.0, 11.0), WELLSQ, (49.0, 51.0)], x0=WX + 0.5, storeys=(2, 2, 3), seed=202,
         signs=[(7.0, 'mug'), (46.0, 'bread')]),
    dict(name='D', back=21.6, front=24.2, gaps=[(16.0, 18.0), (29.0, 31.0), CHAPEL], x0=WX + 0.5, storeys=(2, 2, 3), seed=203,
         signs=[(23.0, 'anvil'), (40.0, 'bed')]),
    dict(name='E', back=28.4, front=31.0, gaps=[(12.0, 14.0), (24.0, 26.0), (38.0, 40.0)], x0=WX + 0.5, storeys=(2, 2, 3), seed=204,
         signs=[(19.0, 'fish'), (31.0, 'mug'), (50.0, 'fish')]),
]
YARD = 1.0               # the strip of yards behind each row
LAND = {(c, r) for c in range(4, COLS) for r in range(0, 36)}
LAND |= {(c, r) for c in range(40, 48) for r in range(36, 38)}      # the landing stage's quay
FOOT = [(KEEP[0] - 0.1, KEEP[2], KEEP[1] + 0.2, KEEP[3] + 0.2), (THEATRE[0], THEATRE[2], THEATRE[1], THEATRE[3])]


def segs(spec):
    """The row's runs of houses between its alleys (the theatre and the square cut it too)."""
    cuts = sorted(list(spec['gaps']) + ([(THEATRE[0], THEATRE[1])] if spec['name'] == 'B' else []))
    out, cur = [], spec['x0']
    for (a, b) in cuts:
        if a > cur:
            out.append((cur, a))
        cur = max(cur, b)
    if cur < EX - 0.5:
        out.append((cur, EX - 0.5))
    return out


for sp in ROWSPEC:
    for (a, b) in segs(sp):
        FOOT.append((a, sp['back'] - YARD, b, sp['front']))


def covered(x, r):
    return any(a <= x <= b and r0 <= r <= r1 for (a, r0, b, r1) in FOOT)


# ---- ground ---------------------------------------------------------------------------------------------------------
k.box(4.0, -3.5, -0.3, COLS + 0.6, 36.0, -0.06, ('#3a3632', 0.12), 'ground')
# beyond the north wall: the canal quarter's gardens and roofs (seen over the wall)
I.ground(k, {(c, r) for c in range(4, COLS) for r in range(-3, 2)}, lambda x, r: 'grass', {'grass': ('#3a5a3a', 0.3)})


def worn(x, r):
    n = math.sin(x * 1.3 + 0.7) * math.cos(r * 2.1 - x * 0.4) + math.sin(x * 0.37 + r * 0.9) + 0.4 * math.sin(x * 3.1 + r * 4.7)
    return n > 1.35 or covered(x, r)


# every street inside the walls in one carpet of cobbles (what the houses stand on, left out), on out through the gates
k.box(WX + 0.4, NR, -0.07, COLS + 0.6, SR, -0.012, ('#7a6e5c', 0.3), 'path_grit')
CAP.cobbles(k, WX + 0.4, NR, COLS + 0.6, SR - 0.1, tone='#9a9080', size=0.3, skip=worn)
# pavements of big flags along every house front, a kerb at their edge
for sp in ROWSPEC:
    for (a, b) in segs(sp):
        CAP.flagged(k, a, sp['front'] - 0.05, b, sp['front'] + 0.55, tone='#a39a8a')
        k.box(a, sp['front'] + 0.55, -0.03, b, sp['front'] + 0.68, 0.06, (shade('#b0a490', 0.95), 0.1), 'kerb', bevel=0.012)
CAP.flagged(k, WX + 0.45, KEEP[3] + 0.2, 12.0, 13.0, tone='#8a8274')                    # the keep's forecourt
CAP.flagged(k, WELLSQ[0], 10.6, WELLSQ[1], 17.2, tone='#958c7c')                       # Well Square
CAP.flagged(k, THEATRE[0] - 0.6, THEATRE[3], THEATRE[1] + 0.6, 13.4, tone='#a09684')     # the theatre's forecourt

# ---- the walls --------------------------------------------------------------------------------------------------------
CAP.town_wall(k, WX - 0.45, EX + 0.45, NR, h=2.2, skip=[(NGATE - 1.8, NGATE + 1.8)], seed=11)
CAP.gatehouse(k, NGATE, NR, w=1.8, h=2.5, name='NORTH GATE', banner='#2e6a4a')
CAP.wall_ns(k, WX, NR - 0.9, SR, h=2.0, seed=12)
LG = (17.2, 21.6)        # the Land Gate's opening in the east wall (the third street)
CAP.wall_ns(k, EX, NR - 0.9, LG[0] - 0.2, h=2.0, seed=13)
CAP.wall_ns(k, EX, LG[1] + 0.4, 31.2, h=2.0, seed=14)
for (tx, tr, crenel, flag) in ((WX, NR - 0.6, True, '#2e8a5a'), (14.0, NR - 0.7, False, None), (42.0, NR - 0.7, False, None),
                               (WX, 19.4, True, None), (WX, SR - 0.6, True, '#2e8a5a'), (EX + 0.2, NR - 0.6, True, None),
                               (EX + 0.2, LG[0] - 0.9, False, '#2e8a5a'), (EX + 0.2, LG[1] + 1.2, False, None)):
    CAP.tower(k, tx, tr, R=1.15 if crenel else 1.0, h=3.4 if crenel else 3.0, crenel=crenel, flag=flag)

# the sea wall: a parapet on the lane's side, its face dropping into the sea
SEA_FACE = SR + 0.25
k.box(WX, SR - 0.1, -1.6, EX + 0.45, SEA_FACE, 0.05, (W.SALT[2], 0.12), 'seawall_core')
CAP.coursed(k, WX, EX + 0.45, -1.4, 0.05, SEA_FACE, '#7e786c', part='wall_block', skip=[(SEA_STEPS[0], SEA_STEPS[1], -2, 1)])
x = WX + 0.6
while x < EX:
    if not (SEA_STEPS[0] - 0.3 < x < SEA_STEPS[1] + 0.1):
        k.box(x, SR - 0.08, 0.0, min(x + 0.62, EX + 0.4), SR + 0.24, 0.62, (shade('#9a9284', rng.uniform(0.88, 1.06)), 0.12), 'parapet', bevel=0.02)
    x += 0.66
k.solid(WX, SR - 0.1, SEA_STEPS[0], SR + 0.3)
k.solid(SEA_STEPS[1], SR - 0.1, EX + 0.5, SR + 0.3)
for i in range(5):                                     # the Sea Steps down to the landing stage
    r0 = SR + i * 0.32
    k.box(SEA_STEPS[0], r0, -0.12 - i * 0.14, SEA_STEPS[1], r0 + 0.34, -0.02 - i * 0.14, (shade(CAP.STONE_L, rng.uniform(0.86, 1.0)), 0.12), 'steps', bevel=0.015)
k.box(39.8, SR + 1.4, -1.4, 48.2, 37.9, -0.72, ('#6e685c', 0.14), 'quay_core')
CAP.coursed(k, 39.8, 48.2, -1.3, -0.72, 37.9, '#7e786c', part='wall_block')
k.box(39.8, SR + 1.4, -0.74, 48.2, 37.9, -0.7, ('#857e70', 0.1), 'floor_landing')
for bx in (40.6, 45.6, 47.6):
    k.cyl(bx, 37.6, -0.72, -0.4, 0.12, ('#2a2a30', 0.1), 'bollard', verts=10)
    k.solid_post(bx, 37.6)
# the bridge's start through the south-east corner: a gate arch over Harbour Lane where it runs off east
for (r0, r1) in ((31.2, 32.0), (35.4, 36.0)):
    k.box(EX - 0.45, r0, -0.05, EX + 0.45, r1, 2.6, (shade(CAP.WALL_STONE, 0.9), 0.12), 'gate_pier')
    k.solid(EX - 0.45, r0, EX + 0.45, r1)
k.box(EX - 0.5, 31.2, 2.4, EX + 0.5, 36.0, 2.9, (shade(CAP.WALL_STONE, 0.95), 0.12), 'gate_top')
CAP.coursed(k, EX - 0.5, EX + 0.5, 2.4, 2.9, 36.0, '#8a8478', part='wall_block', **CAP.BIG)

C.coast(k, LAND, palette='emerald', grass='#3a5a3a', rock='#5a5a54', seed=71, beachiness=-0.6,
        keep_clear=[(39.0, 36.0, 49.0, 39.5)], sheer=[(39.6, 37.8, 48.4, 40.5)])
for (bx, br, hull) in ((41.8, 38.7, '#2a4a6a'), (45.2, 38.9, '#6a3a2a')):     # two rowboats at the landing stage
    since, ls = len(k.parts), len(k.lights)
    W.rowboat(k, bx - 1.0, bx + 1.0, br, beam=0.8, hull=hull)
    C.sink(k, since, C.WZ + 0.12, ls)

# ---- the Old Keep ------------------------------------------------------------------------------------------------------
kx0, kx1, kr0, kr1 = KEEP
k.box(kx0, kr0, -0.05, kx1, kr1, 5.4, (shade(CAP.WALL_STONE, 0.85), 0.12), 'keep_wall')
CAP.coursed(k, kx0, kx1, 0.0, 5.4, kr1, '#8a8478', part='wall_block', **CAP.BIG, skip=[(8.0, 9.0, 0.0, 1.6), (7.0, 7.6, 2.4, 3.2), (9.6, 10.2, 2.4, 3.2), (8.2, 8.8, 3.8, 4.5)])
for xx in (kx0, kx1 - 0.35):                                           # buttresses at the corners
    k.box(xx - 0.1, kr1 - 0.35, -0.05, xx + 0.45, kr1 + 0.2, 4.6, (shade(CAP.WALL_STONE, 0.95), 0.12), 'keep_buttress')
    CAP.coursed(k, xx - 0.1, xx + 0.45, 0.0, 4.6, kr1 + 0.2, '#8a8478', part='wall_block', **CAP.BIG)
k.box(8.0, kr1 - 0.04, 0.0, 9.0, kr1 + 0.02, 1.6, A.WOOD_DD, 'door')
k.box(8.05, kr1 + 0.02, 0.05, 8.95, kr1 + 0.05, 1.5, ('#4a2e18', 0.14), 'door')
for zz in (0.4, 0.9, 1.3):
    k.box(8.02, kr1 + 0.05, zz, 8.98, kr1 + 0.07, zz + 0.05, A.IRON, 'door_strap')
for (wx, wz) in ((7.3, 2.4), (9.9, 2.4), (8.5, 3.8)):
    k.box(wx - 0.22, kr1 + 0.0, wz, wx + 0.22, kr1 + 0.05, wz + 0.7, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.8))
    k.box(wx - 0.28, kr1, wz + 0.7, wx + 0.28, kr1 + 0.08, wz + 0.8, (CAP.STONE_L, 0.1), 'lintel')
k.box(kx0 - 0.1, kr0 - 0.1, 5.4, kx1 + 0.1, kr1 + 0.1, 5.6, (shade(CAP.WALL_STONE, 1.05), 0.12), 'tower_crown')
x = kx0
while x < kx1 - 0.3:
    k.box(x, kr1 - 0.2, 5.6, x + 0.44, kr1 + 0.1, 6.05, (shade(CAP.WALL_STONE, rng.uniform(0.9, 1.05)), 0.12), 'merlon', bevel=0.015)
    x += 0.74
k.box(kx0 + 0.3, kr0 + 0.3, 5.55, kx1 - 0.3, kr1 - 0.3, 5.62, ('#6e685e', 0.25), 'path_keeptop')
CAP.tower(k, kx1 - 0.6, kr0 + 0.6, R=0.7, h=6.6, roof='#44567a', windows=1, flag='#2e8a5a', light=False)
for s in (-1, 1):
    W.wall_lantern(k, 8.5 + s * 0.85, kr1 + 0.02, z=1.4, energy=14)
k.solid(kx0 - 0.1, kr0, kx1 + 0.2, kr1 + 0.2)
V.board_sign(k, 'THE OLD KEEP', 'IMFellEnglishSC-Regular', 8.5, kr1 + 0.05, 1.78, size=0.2, board='#2a3a2e')

# ---- the rows of houses, the theatre, the chapel, the arch house --------------------------------------------------------
SMOKE = []
for sp in ROWSPEC:
    for i, (a, b) in enumerate(segs(sp)):
        jog = random.Random(sp['seed'] * 7 + i).choice((-0.4, -0.2, 0.0, 0.2, 0.4))
        CAP.row(k, a, b, sp['back'], sp['front'] + jog, seed=sp['seed'] * 10 + i, smoke=SMOKE, storeys=sp['storeys'],
                signs=sp['signs'], shops=0.4, jitter=0.2, gable_front=0.15)
    CAP.yard_life(k, sp['x0'] - 0.1, EX - 0.4, sp['back'] - YARD, sp['back'], seed=sp['seed'] + 900,
                  gaps=[g for g in sp['gaps'] if g not in (WELLSQ, CHAPEL)])
CAP.theatre(k, THEATRE[0], THEATRE[1], THEATRE[2], THEATRE[3])
CAP.chapel(k, CHAPEL[0] + 0.3, CHAPEL[1] - 1.5, 21.4, 24.4, tower_side=1)
CAP.arch_house(k, 29.0, 31.0, 21.8, 24.0)                  # the Arch House over the alley in the fourth row
for (ga, gb), sp in (((14.0, 16.0), ROWSPEC[0]), ((24.0, 26.0), ROWSPEC[3])):     # washing strung across two alleys
    CAP.washing(k, ga + 0.05, gb - 0.05, sp['back'] + 0.9, z=2.2, rng=rng)

# ---- Well Square ---------------------------------------------------------------------------------------------------------
WSX = (WELLSQ[0] + WELLSQ[1]) / 2
I.well(k, WSX, 13.6)
k.solid(WSX - 0.6, 13.0, WSX + 0.6, 14.0)
with k.foliage('leaf'):
    W.tree(k, WELLSQ[0] + 1.2, 15.6, h=2.8, tone='#3a6a34')
    W.tree(k, WELLSQ[1] - 1.2, 15.4, h=2.6, tone='#2e5a3a')
k.solid(WELLSQ[0] + 0.9, 15.1, WELLSQ[0] + 1.5, 15.6)
k.solid(WELLSQ[1] - 1.5, 14.9, WELLSQ[1] - 0.9, 15.4)
W.bench(k, WSX - 0.7, WSX + 0.7, 16.4)
k.solid(WSX - 0.7, 16.2, WSX + 0.7, 16.65)
W.market_stall(k, WELLSQ[0] + 0.6, WELLSQ[0] + 2.6, 11.4, 12.4, awning=('#3a6a3a', '#e8dcc0'), goods='veg')
k.solid(WELLSQ[0] + 0.6, 11.4, WELLSQ[0] + 2.6, 12.4)
W.bulletin_board(k, WELLSQ[1] - 1.4, 11.6)
k.solid(WELLSQ[1] - 2.1, 11.4, WELLSQ[1] - 0.7, 11.8)
for (tx, tr) in ((WELLSQ[0] + 0.4, 16.8), (WELLSQ[1] - 0.4, 16.8)):
    HK.tub(k, tx, tr)

# ---- life along the streets ------------------------------------------------------------------------------------------------
def scatter(r_front, x0, x1, gaps, seed):
    rr = random.Random(seed)
    x = x0 + rr.uniform(0.5, 2.0)
    while x < x1 - 0.6:
        if any(a - 0.6 < x < b + 0.6 for a, b in gaps):
            x += 1.0
            continue
        pick = rr.random()
        r = r_front + 0.9
        if pick < 0.22:
            A.barrel(k, x, r, h=0.66, radius=0.24, tone=rr.choice((A.WOOD, shade(A.WOOD, 0.85))))
        elif pick < 0.36:
            A.crate(k, x, r, s=0.46, tone=shade(A.WOOD_L, rr.uniform(0.88, 1.06)))
        elif pick < 0.55:
            HK.tub(k, x, r)
        elif pick < 0.63:
            V.sacks(k, x, r + 0.05, n=3)
        x += rr.uniform(3.0, 5.6)


for i, sp in enumerate(ROWSPEC):
    scatter(sp['front'], sp['x0'], EX - 0.5, sp['gaps'] + ([(THEATRE[0] - 1, THEATRE[1] + 1)] if i == 0 else []), 301 + i)
LAMPS = [(17.0, 6.0), (36.0, 6.0), (48.0, 6.0), (8.0, 13.2), (17.5, 13.2), (33.4, 13.2), (49.0, 13.2), (8.0, 20.2), (22.0, 20.2),
         (40.0, 20.2), (52.0, 20.2), (10.0, 27.2), (28.0, 27.2), (43.0, 27.2), (9.0, SR - 0.45), (21.0, SR - 0.45),
         (33.0, SR - 0.45), (46.5, SR - 0.45), (52.0, SR - 0.45)]
for (x, r) in LAMPS:
    W.lantern_post(k, x, r, energy=24)
    k.solid_post(x, r)
# the theatre's forecourt: a poster pillar, a flower seller's barrow
W.cart(k, 33.0, 12.0)
k.solid(32.3, 11.4, 33.7, 12.6)
k.cyl(18.6, 12.0, 0.0, 1.6, 0.26, ('#d8ccb4', 0.1), 'poster_pillar', verts=16)
for j, col in enumerate(('#e8d8b0', '#d0a080', '#c8d0e0', '#e0c0c8')):
    a = math.pi / 2 + (j - 1.5) * 0.55
    k.box(18.6 + math.cos(a) * 0.27 - 0.1, 12.0 + math.sin(a) * 0.27, 0.35, 18.6 + math.cos(a) * 0.27 + 0.1, 12.0 + math.sin(a) * 0.27 + 0.02, 1.3, (col, 0.1), 'playbill')
k.cone(18.6, 12.0, 1.6, 1.95, 0.32, 0.03, ('#3e7a6a', 0.1), 'roof_cone', verts=16)
k.solid(18.3, 11.7, 18.9, 12.3)
# Harbour Lane: the fish market, nets on a rack, lobster pots, an upturned boat, gulls
for (x0, x1, awn, goods) in ((15.0, 17.0, ('#2e5a8a', '#e8e0d0'), 'fish'), (18.0, 20.0, ('#b23a34', '#ece0c8'), 'fish'),
                             (34.0, 36.0, ('#3a6a3a', '#e8dcc0'), 'veg')):
    W.market_stall(k, x0, x1, 32.6, 33.8, awning=awn, goods=goods)
    k.solid(x0, 32.6, x1, 33.8)
for (px, pr) in ((22.5, 34.3), (23.1, 34.5), (40.0, 34.6)):
    k.box(px - 0.26, pr - 0.17, 0.0, px + 0.26, pr + 0.17, 0.05, (A.WOOD, 0.14), 'pot_base')
    k.cyl_x(px - 0.26, px + 0.26, pr, 0.08, 0.17, 0.2, ('#7a6a48', 0.3), 'lobster_pot', verts=10)
    k.solid(px - 0.2, pr - 0.2, px + 0.2, pr + 0.2)
NX0, NX1, NR_ = 26.5, 29.0, 34.6
for nx in (NX0, NX1):
    k.cyl(nx, NR_, 0.0, 1.35, 0.045, (A.WOOD_D, 0.12), 'net_post', verts=8)
k.cyl_x(NX0 - 0.08, NX1 + 0.08, NR_, 1.3, 0.035, 0.035, (A.WOOD, 0.12), 'net_pole', verts=8)
cords = []
for i in range(16):
    xx = NX0 + 0.08 + (NX1 - NX0 - 0.16) * i / 15
    cords.append((xx - 0.008, NR_ - 0.01, 0.28 + 0.05 * math.sin(i * 1.7), xx + 0.008, NR_ + 0.01, 1.28))
for j in range(9):
    zz = 0.3 + j * 0.11
    cords.append((NX0 + 0.08, NR_ - 0.01, zz - 0.008, NX1 - 0.08, NR_ + 0.01, zz + 0.008))
k.boxes(cords, '#4a5a52', 'net')
k.solid(NX0, NR_ - 0.2, NX1, NR_ + 0.2)
since = len(k.parts)
W.rowboat(k, 6.2, 8.6, 34.3, beam=0.85, hull='#3a5a4a', oars=False)          # an upturned boat by the west tower
I.pose(k, since, (7.4, 34.3, 0.2), roll=math.pi, dz=0.15)
k.solid(6.2, 33.9, 8.6, 34.7)
for (gx, gr) in ((24.0, 35.0), (44.8, 33.0), (50.2, 34.6)):
    k.blob(gx, gr, 0.1, 0.1, 0.06, 0.07, '#f0f0ec', 'gull', segs=10)
    k.blob(gx + 0.08, gr, 0.18, 0.05, 0.045, 0.05, '#f4f4f0', 'gull', segs=8)
    k.cone(gx + 0.14, gr, 0.17, 0.19, 0.02, 0.004, '#e0a030', 'gull', verts=4)

# the gardens beyond the north wall: trees and a few roofs of the canal quarter showing over it
with k.foliage('leaf'):
    for (tx, tr) in ((8.0, 0.4), (19.0, 0.2), (23.5, 0.6), (35.0, 0.3), (47.5, 0.5), (52.0, 0.1)):
        W.tree(k, tx, tr, h=2.6, tone=rng.choice(('#2e5a3a', '#3a6234', '#2a5434')))
for (x0, x1) in ((10.5, 14.5), (31.0, 34.6), (38.4, 41.8)):
    W._gable_roof(k, x0, x1, -2.6, -0.4, 2.4, 1.2, rng.choice(CAP.ROOFS))

# ---- light ---------------------------------------------------------------------------------------------------------------------
k.area_light(30.0, 18.0, 16.0, '#90a8c8', 3000, 44.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.point_light(28.0, 26.0, 2.5, '#ffc070', 30, radius=0.8, group='flicker')                  # the theatre's doors on the square
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}},
         light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#26384a', 0.8))

# ---- the world -------------------------------------------------------------------------------------------------------------------


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


def gate(label, x, y, text):        # a way to another district: js/capital.js makes it a door once that world exists
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': 'PRESS E TO GO THROUGH', 'dialog': text}


inters = [
    {'x': int(EX) + 1, 'y': 19, 'type': 'enter_world', 'target': 'lumar-crown', 'spawn': [4, 21], 'label': 'LAND GATE', 'prompt': 'PRESS E TO GO THROUGH'},
    gate('NORTH GATE', int(NGATE), 2, 'THE NORTH GATE. BEYOND IT, THE CANAL QUARTER - BUT THE GATEKEEPER SAYS THE BRIDGE OVER THE FIRST CANAL IS UP FOR MENDING.'),
    gate('BRIDGE GATE', COLS - 1, 33, 'THE BRIDGE GATE, AND PAST IT THE OLD BRIDGE OVER THE HARBOUR MOUTH, SHOPS AND HOUSES ALL ALONG IT. THE WATCH HAS IT SHUT TONIGHT.'),
    look('THE OLD KEEP', 8, 10, 'THE OLD KEEP. CROWNHAVEN WAS THIS AND A WALL ONCE, BEFORE THE HARBOUR, BEFORE THE PALACE. THE FIRST LUMARS SLEPT UP THERE WITH THEIR CHARTS UNDER THEIR PILLOWS.'),
    look('THE OLD WELL', int(WSX), 14, 'THE OLD WELL. THEY SAY IF YOU DROP A COIN AND HEAR IT LAND, THE SEA WILL GIVE IT BACK TWICE. NOBODY HAS EVER HEARD IT LAND.'),
    look('NOTICE BOARD', int(WELLSQ[1] - 1.4), 12, 'NOTICES: ROOMS TO LET OVER THE CHANDLER\'S. LOST: ONE GREY CAT, ANSWERS TO "ADMIRAL". THE LANTERN THEATRE - A NEW PLAY EVERY NIGHT.'),
    {'x': 26, 'y': 11, 'type': 'dialog', 'label': 'THE LANTERN THEATRE', 'prompt': 'PRESS E TO GO IN', 'dialog': 'THE LANTERN THEATRE. THE DOORS ARE OPEN AND SOMEBODY INSIDE IS DECLAIMING AT THE TOP OF THEIR LUNGS.'},
    look('PLAYBILL', 19, 12, 'TONIGHT AT THE LANTERN: "THE LADY OF THE EMERALD SEA". BOX OFFICE BY THE MIDDLE DOOR.'),
    look('SEA STEPS', 43, 36, 'THE SEA STEPS, WORN HOLLOW IN THE MIDDLE BY FIVE HUNDRED YEARS OF FISHERMEN\'S BOOTS.'),
    {'x': 36, 'y': 14, 'type': 'dialog', 'label': 'TOWN CRIER', 'prompt': 'PRESS E TO TALK', 'dialog': 'OYEZ!'},
    look('FLOWER BARROW', 33, 13, 'BUNCHES OF SEA PINKS AND THRIFT, A COPPER A BUNCH. THE BARROW-WOMAN HAS GONE FOR HER SUPPER.'),
]
w = {'name': 'The Old Town', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [EX - 1, 19]}, 'moonColor': '#d8f0e0', 'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': inters}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
DOORS = [(c, r) for c in (int(EX) - 1, int(EX), int(EX) + 1) for r in range(int(LG[0]) + 1, int(LG[1]))]   # through the Land Gate
DOORS += [(c, r) for c in (int(EX) - 1, int(EX), int(EX) + 1) for r in range(32, 35)]                      # on to the bridge
DOORS += [(c, r) for c in (int(NGATE) - 1, int(NGATE)) for r in range(1, 4)]                          # under the North Gate
DOORS += [(c, r) for c in range(int(SEA_STEPS[0]), int(SEA_STEPS[1])) for r in range(35, 38)]       # down the Sea Steps
DOORS += [(c, r) for c in range(40, 48) for r in range(36, 38)]                                         # the landing stage
k.solid(36, 14, 37, 15)                                   # the crier stands by the well
apply_world(WORLD, k, (int(WX) + 1, int(NR), COLS - 1, 35), doors=DOORS, scene_id=WID,
            actors=[{'sheet': 'npc-crier', 'x': 36, 'y': 14, 'facing': 'down'}], scene_extra={'backdrop': True, 'smoke': SMOKE})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if r >= 36 and (c, r) not in DOORS:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [3.0, -1.0, COLS + 0.5, ROWS + 0.5]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('oldtown done')
