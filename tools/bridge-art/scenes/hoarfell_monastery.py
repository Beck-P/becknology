"""Hoarfell — the cliff monastery over the hidden valley, gone cold. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_monastery.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-monastery

On the clifftop above the valley: the assembly hall under its gilt roof at the head of a courtyard, the monks' houses
round it, whitewashed and maroon-banded with windows in black frames, chortens, prayer wheels and flags strung across
everything. The cold has got in (Bram: "the monks left… something cold moved in"): rime furred white on the walls' north
faces, the courtyard's fountain frozen solid, icicles off every eave, frost creeping over the paving from the hall's
doors — the rime golems and the frost wraiths keep it now (js/valley.js). The stair from the valley tops out at the
south edge; the monks' stair comes up from the ice caves in the west; and behind the hall in the north-east, a gate in
the old wall onto the high snowfield where the glacier begins: the heart.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_alpine as A              # noqa: E402
import assets_isle as I                # noqa: E402
import assets_signs as G               # noqa: E402
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
RIME = '#e8f2f8'


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


def sm(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


def n2(x, r, f, seed):
    return math.sin(x * f * 1.7 + seed) * 0.5 + math.sin(r * f * 2.3 + seed * 1.9) * 0.3 + math.sin((x + r) * f + seed * 0.7) * 0.2


# ---- the clifftop: one surface, its south rim dropping to the valley (a backdrop world: the sky and the cloud below) ----------
def rim(x):
    r = 35.0 + 0.4 * n2(x, 0, 0.5, 3) + 0.25 * n2(x, 0, 1.3, 9)
    if x < 3:                                                            # the ends bend back north
        r -= (3.0 - x) ** 2 * 0.8
    if x > 41:
        r -= (x - 41) ** 2 * 0.8
    return r


X0, X1 = -3.0, COLS + 3.0
edge = [(X0 + (X1 - X0) * i / 200, rim(X0 + (X1 - X0) * i / 200)) for i in range(201)]
COURT = (11.0, 15.0, 33.0, 28.0)                                          # the courtyard's paving


def material_pt(x, r):
    if COURT[0] <= x <= COURT[2] and COURT[1] <= r <= COURT[3]:
        return 'flagstones'
    return 'snow'


k.poly([(COLS / 2, 14.0, 0.0)] + [(x, r, 0.0) for (x, r) in edge[::-1]] + [(X0, -10.0, 0.0), (X1, -10.0, 0.0), (edge[-1][0], edge[-1][1], 0.0)],
       (N.SNOW, 0.06), 'snow')
STRATA = ('#6a6e7c', '#565a68', '#7a7e8c', '#4a4e5c')
levels, z = [0.0], 0.0
while z > -8.0:
    z -= 0.45 + 0.2 * abs(n2(z * 3, 1, 1.3, 5))
    levels.append(z)
rings = [[(x, r + (0.0 if j == 0 else 0.04 * j + 0.06 * n2(x * 3, zz * 3, 1.0, 9)), zz) for (x, r) in edge] for j, zz in enumerate(levels)]
for j in range(len(rings) - 1):
    k.loft([rings[j], rings[j + 1]], (STRATA[j % 4], 0.14), 'cliff', closed=False, smooth=False)
for i, (x, r) in enumerate(edge):
    if i % 3 == 0:
        k.blob(x, r - 0.1, 0.0, 0.45, 0.22, 0.1, (N.SNOW, 0.08), 'cornice', segs=8)
# the courtyard: big flagstones, frost spreading over them from the hall's doors
A.setts(k, COURT[0], COURT[1], COURT[2], COURT[3], tone='#9a968e', w=(0.6, 1.0), d=0.6, grout='#5a5650', part='flagstones')
for i in range(140 if not QUICK else 50):
    x, r = 22.0 + k.rng.gauss(0, 4.5), 15.6 + abs(k.rng.gauss(0, 4.0))
    if COURT[0] < x < COURT[2] and COURT[1] < r < COURT[3]:
        k.blob(x, r, 0.06, k.rng.uniform(0.2, 0.6), k.rng.uniform(0.15, 0.4), 0.012, (RIME, 0.04), 'frost', rot=(0, 0, k.rng.uniform(0, 90)), segs=8)
A.snow_edge(k, COURT[0], COURT[1], COURT[2], COURT[3], every=0.6)

# the mountain behind: the cliff the hall backs onto, and the high snowfield beyond the north-east gate
back = [(c, r) for c in range(-3, COLS + 3) for r in range(-10, 4) if not (34 <= c <= 41 and r >= -1)]
I.ridge(k, back, top=5.0, slope=1.6, seed=131, rock='#c8ced8', strata=STRATA, moss=N.ROOF_SNOW, foot=0.7, patchy=False)
far = [(c, r) for c in range(-3, COLS + 3) for r in range(-10, -4)]
I.ridge(k, far, top=10.0, slope=2.6, seed=137, rock='#d6dee9', strata=('#5e6678', '#485062', '#727a8c'), moss=N.ROOF_SNOW, foot=0.9, patchy=False)


def rime(x0, x1, r_back, z0, z1):
    """Rime furred white over a wall's top and down its back."""
    x = x0
    while x < x1:
        k.blob(x, r_back + 0.05, z1, k.rng.uniform(0.2, 0.4), 0.18, k.rng.uniform(0.08, 0.16), (RIME, 0.06), 'rime', segs=7)
        x += k.rng.uniform(0.25, 0.45)


# ---- the assembly hall and the monks' houses --------------------------------------------------------------------------------
SMOKE = []
zh = A.gompa(k, 15.0, 29.0, 4.0, 13.0, h=4.2, windows=5, roof='gold', door=22.0, floors=2)
rime(15.0, 29.0, 4.0, 0, zh)
N.icicles(k, 15.0, 29.0, 13.1, 3.8, every=0.25)
for (x0, x1, rb, rf, h, nw) in ((3.0, 9.0, 8.0, 13.6, 2.6, 3), (3.0, 8.4, 15.0, 20.0, 2.0, 2), (35.0, 41.0, 9.0, 14.0, 2.6, 3),
                               (35.6, 41.0, 15.4, 20.6, 2.0, 2), (9.6, 14.2, 5.0, 10.0, 2.4, 2), (29.8, 34.4, 5.0, 10.4, 2.4, 2)):
    z = A.gompa(k, x0, x1, rb, rf, h=h, windows=nw, door=(x0 + x1) / 2)
    rime(x0, x1, rb, 0, z)
    N.icicles(k, x0, x1, rf + 0.05, h - 0.45, every=0.28)
# the great door, the drum, the bell
for s_ in (-1, 1):
    A.mani_flags(k, (22.0, 13.0, zh + 0.5), (22.0 + s_ * 12.0, 22.0, 2.4), sag=0.8)
k.cyl_y(19.6, 13.6, 14.2, 1.1, 0.5, 0.5, ('#a8222a', 0.08), 'drum', verts=16)
k.cyl_y(19.6, 14.18, 14.24, 1.1, 0.46, 0.46, ('#e8dcc0', 0.05), 'drum_skin', verts=16)
for x in (19.2, 20.0):
    k.box(x - 0.04, 13.8, 0.0, x + 0.04, 14.0, 0.7, ('#3a2a1a', 0.08), 'drum_stand')
k.solid(19, 13, 21, 15)
# the bell on its frame by the gate in the north-east
k.box(36.2, 6.8, 0.0, 36.4, 7.0, 2.4, ('#4a2a1a', 0.08), 'bell_frame')
k.box(38.2, 6.8, 0.0, 38.4, 7.0, 2.4, ('#4a2a1a', 0.08), 'bell_frame')
k.box(36.0, 6.75, 2.4, 38.6, 7.05, 2.55, ('#4a2a1a', 0.08), 'bell_frame')
k.cone(37.3, 6.9, 1.2, 2.3, 0.45, 0.2, ('#7a6a3a', 0.1), 'bell', verts=16)
k.blob(37.3, 6.9, 2.4, 0.5, 0.25, 0.1, (RIME, 0.05), 'rime', segs=8)
k.solid(36, 6, 39, 8)

# ---- the courtyard: the frozen fountain, chortens, prayer wheels, the cold ---------------------------------------------------
W.annulus(k, 22.0, 21.4, 1.2, 1.5, 0.0, 0.5, ('#9a968e', 0.08), 'basin', segs=28)
k.cyl(22.0, 21.4, 0.0, 0.42, 1.25, ('#bcdcef', 0.05), 'ice', verts=28)
for i in range(9):                                                      # the jet, frozen as it rose and fell
    a = i / 9 * math.tau
    k.tube((22.0, 21.4, 0.4), (22.0 + math.cos(a) * 0.5, 21.4 + math.sin(a) * 0.4, 1.4), 0.06, ('#d8eef8', 0.05), 'ice', rb=0.03, verts=6)
    k.tube((22.0 + math.cos(a) * 0.5, 21.4 + math.sin(a) * 0.4, 1.4), (22.0 + math.cos(a) * 0.95, 21.4 + math.sin(a) * 0.75, 0.5), 0.04,
           ('#c4e2f2', 0.05), 'ice', rb=0.02, verts=6)
k.tube((22.0, 21.4, 0.4), (22.0, 21.4, 1.9), 0.09, ('#e2f2fa', 0.05), 'ice', rb=0.04, verts=8)
k.solid(20.5, 20.0, 23.5, 22.8)
for (x, r, s) in ((13.4, 24.6, 0.8), (30.6, 24.6, 0.8)):
    A.chorten(k, x, r, s=s)
A.prayer_wheels(k, 12.2, 17.0, 28.4)
A.prayer_wheels(k, 27.0, 31.8, 28.4)
for (x, r) in ((11.6, 16.0), (32.4, 16.0), (11.6, 22.0), (32.4, 22.0)):
    k.cyl(x, r, 0.0, 2.6, 0.06, ('#5a3a24', 0.1), 'flagpole', verts=6)
    k.box(x - 0.02, r - 0.02, 1.2, x + 0.02, r + 0.02, 2.5, ('#e8dcc0', 0.06), 'banner')
    k.box(x + 0.02, r - 0.12, 1.2, x + 0.06, r + 0.12, 2.5, ('#c83a2e', 0.08), 'banner')
    k.solid_post(x, r)
# the old wall on the east and west edges of the clifftop, snow on its coping
for (xa, ra, xb, rb) in ((0.6, 5.0, 0.6, 30.0), (43.4, 5.0, 43.4, 30.0)):
    k.box(xa - 0.25, ra, 0.0, xa + 0.25, rb, 0.9, ('#8a8478', 0.14), 'wall_stone')
    k.box(xa - 0.3, ra, 0.9, xa + 0.3, rb, 1.0, (N.SNOW, 0.04), 'wall_snow')
# the north-east gate onto the heart: a gatehouse in the wall, its doors sealed in ice
k.box(35.6, -0.4, 0.0, 41.2, 1.6, 2.8, ('#efeae0', 0.08), 'gompa_wall')
k.box(35.5, -0.5, 2.4, 41.3, 1.7, 2.8, ('#6a2420', 0.12), 'penbey')
k.box(37.4, 1.6, 0.0, 39.4, 1.66, 2.0, ('#6a1a14', 0.08), 'door')
k.box(37.2, 1.66, 0.0, 39.6, 1.8, 2.1, ('#c4e2f2', 0.04), 'ice_seal')
k.solid(35, -1, 42, 2)
# the stairs down: to the valley (south), to the caves (west)
for i in range(5):
    k.box(20.6, 34.0 + i * 0.3, -i * 0.25, 23.4, 34.3 + i * 0.3, -i * 0.25 + 0.06, ('#a8a094', 0.12), 'stair_step', bevel=0.02)
k.box(4.6, 27.0, -0.2, 7.4, 28.6, 0.0, '#140c08', 'doorway', emit=('#4aa8e8', 0.3))
for x in (4.6, 7.4):
    k.box(x - 0.15, 26.8, 0.0, x + 0.15, 27.2, 1.4, ('#efeae0', 0.08), 'gompa_wall')
k.box(4.4, 26.8, 1.4, 7.6, 27.2, 1.6, ('#6a2420', 0.1), 'lintel')
# Brother Anselm's cell: the one warm window, a lamp, smoke from its chimney
k.box(7.4, 9.0, 2.62, 7.8, 9.4, 3.4, ('#5a5a62', 0.12), 'chimney')
SMOKE.append(screen(7.6, 9.2, 3.5))
k.point_light(6.0, 14.4, 1.0, '#ffb060', 12, radius=0.2, group='flicker')

# ---- the edges ---------------------------------------------------------------------------------------------------------------
k.solid(-3, -10, COLS + 3, 4)
k.solid(-1, 0, 1, ROWS)
k.solid(COLS - 1, 0, COLS, ROWS)
for x in range(-1, COLS + 1):
    k.solid(x, int(rim(x + 0.5) - 0.4), x + 1, ROWS + 4)
k.blocked.discard((22, 34))

A.flush(k)
k.sun((0.8, 0.25, -0.38), '#ffe0c0', 3.2, angle=3.0)
k.render(OUT, cycle='day', light_states={'full': {}}, light_samples=24 if QUICK else 96, world_light=('#8a96cc', 0.95))

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
