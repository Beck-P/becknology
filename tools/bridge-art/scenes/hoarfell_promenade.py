"""Hoarfell — Fellhaven's promenade: the village's grander side, along the shelf west of the street. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_promenade.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-promenade

Beck: "making it bougier, bigger, better" — St. Moritz, Zermatt, Aspen — while Fellhaven stays the small working village
at heart. A shelf on the mountainside (a backdrop world: js/worlds/hoarfell.js draws the sky, the far range and the sea
of cloud below the rim): under the slopes, the Stübli (fondue in a little pine room) with its terrace, the ice rink in
its boards with a skate hut, the Alpenhof (a grand chalet hotel, balconies of geraniums) with its heated pool steaming
in the snow, the sleighs waiting. Across the middle the promenade itself, lamps and benches facing the view, a coin
telescope; below it the après-ski terrace (a log bar, heaters, fur throws, a fire pit) and Fellhaven's station on the
Aurelle line, the red train standing at the platform, the track running along the very edge of the shelf.
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
WID = 'hoarfell-promenade'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 44, 30
C = math.cos(math.radians(45))
QUICK = os.environ.get('QUICK')
k = Kit(COLS, ROWS, margin_top=4.2, margin_bottom=5.0, seed=6131)


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


def n2(x, r, f, seed):
    return math.sin(x * f * 1.7 + seed) * 0.5 + math.sin(r * f * 2.3 + seed * 1.9) * 0.3 + math.sin((x + r) * f + seed * 0.7) * 0.2


# ---- the shelf: its south rim wandering, dropping away in strata to the cloud ---------------------------------------------
def rim(x):
    """The rim's row at column x (the shelf runs on east past the map to Fellhaven; at the west it curves round)."""
    r = 27.0 + 0.35 * n2(x, 0, 0.5, 3) + 0.2 * n2(x, 0, 1.4, 7)
    if x < 2.0:                                     # the west end bends back north
        r -= (2.0 - x) ** 2 * 1.4
    return r


X0, X1 = -3.0, COLS + 3.0
N_ = 220
edge = [(X0 + (X1 - X0) * i / N_, rim(X0 + (X1 - X0) * i / N_)) for i in range(N_ + 1)]
top = [(X1, -8.0), (X0, -8.0)]
k.poly([(COLS / 2, 10.0, 0.0)] + [(x, r, 0.0) for (x, r) in edge[::-1]] + [(X0, -8.0, 0.0), (X1, -8.0, 0.0), (edge[-1][0], edge[-1][1], 0.0)],
       (N.SNOW, 0.06), 'snow')
# the face below the rim: a few deep beds of grey rock (not many thin ones — thin blue bands read as water), each bed
# stepping out a little with snow lying on its ledge, cut by gullies, crags standing out of it, falling away into the cloud
STRATA = ('#6a6e7a', '#5a5e6a', '#767a86', '#4e525e')
levels = [0.0, -0.9, -1.9, -3.1, -4.6]
rings = []
for j, zz in enumerate(levels):
    rings.append([(x, r + (0.0 if j == 0 else 0.22 * j + 0.18 * n2(x * 1.7, zz * 3, 1.0, 9) + 0.1 * math.sin(x * 2.9 + j)), zz) for (x, r) in edge])
for j in range(len(rings) - 1):
    a, b = rings[j], rings[j + 1]
    k.loft([a, [(x, r - 0.18, z - 0.05) for (x, r, z) in b]], (STRATA[j % 4], 0.2), 'cliff', closed=False, smooth=False)
    k.loft([[(x, r - 0.18, z - 0.05) for (x, r, z) in b], b], (shade(STRATA[j % 4], 1.12), 0.12), 'cliff', closed=False, smooth=False)
    for i in range(0, len(b), 2):                                         # snow on the ledge each bed makes
        x, r, z = b[i]
        if k.rng.random() < 0.75:
            k.blob(x, r - 0.1, z, k.rng.uniform(0.25, 0.45), 0.16, 0.06, (N.SNOW, 0.06), 'ledge_snow', segs=7)
for i in range(0, len(edge), 9):                                          # gullies down the face
    x, r = edge[i]
    if k.rng.random() < 0.5:
        k.tube((x, r + 0.05, -0.1), (x + k.rng.uniform(-0.3, 0.3), r + 1.0, -4.4), 0.12, ('#3e424e', 0.12), 'gully', rb=0.06, verts=5)
for i, (x, r) in enumerate(edge):
    if i % 3 == 0:
        k.blob(x, r - 0.1, 0.0, 0.5, 0.22, 0.1, (N.SNOW, 0.08), 'cornice', segs=8)
    if k.rng.random() < 0.16:
        d = k.rng.uniform(0.6, 4.2)
        s_ = k.rng.uniform(0.25, 0.5)
        k.rock(x, r + 0.15 + 0.22 * d, -d, s_, s_ * 0.7, s_ * 0.9, ('#5a5e6a', 0.18), part='crag', segs=7)
        k.blob(x, r + 0.1 + 0.22 * d, -d + s_ * 0.8, s_ * 0.8, 0.18, 0.08, (N.SNOW, 0.08), 'crag_snow', segs=7)
    if k.rng.random() < 0.05:                                             # a fir clinging to the face
        d = k.rng.uniform(1.0, 3.6)
        W.pine_tiers(k, x, r + 0.3 + 0.22 * d, 1.0, N.PINE, rad=0.3, z0=-d, tiers=3, snow=N.ROOF_SNOW)

# the mountainside behind: a band of cliff and the massif over it, firs at its foot
cliff = [(c, r) for c in range(-3, COLS + 3) for r in range(-8, 3)]
I.ridge(k, cliff, top=4.0, slope=1.4, seed=41, rock='#d6dee9', strata=('#6a7284', '#525a6c', '#7c8496'),
        moss=N.ROOF_SNOW, foot=0.6, patchy=False)
upper = [(c, r) for c in range(-3, COLS + 3) for r in range(-8, -2)]
I.ridge(k, upper, top=8.8, slope=2.6, seed=43, rock='#d6dee9', strata=('#5e6678', '#485062', '#727a8c'),
        moss=N.ROOF_SNOW, foot=0.9, patchy=False)
for x in (0.6, 2.2, 11.6, 22.6, 23.4, 35.4, 41.6, 43.2):
    N.snow_pine(k, x, 3.6 + k.rng.uniform(-0.3, 0.4), h=k.rng.uniform(2.4, 3.2))

# ---- the paths -------------------------------------------------------------------------------------------------------------
for rect in ((0.4, 15.4, COLS, 18.6),                        # the promenade
             (6.2, 9.6, 7.8, 15.4), (16.4, 14.6, 18.0, 15.4), (28.4, 15.6, 30.0, 15.4),
             (22.4, 18.6, 24.0, 19.8), (5.6, 18.6, 7.2, 19.4)):
    if rect[3] > rect[1]:
        N.trodden(k, *rect, prints=0.3 if QUICK else 0.6)
A.setts(k, 1.0, 15.6, COLS + 1.0, 18.4, tone='#c2bcae')
A.snow_edge(k, 1.0, 15.6, COLS + 1.0, 18.4, every=0.7)

SMOKE = []
# ---- the Stübli: fondue in a little pine chalet, its terrace ----------------------------------------------------------------
rm, zr = N.chalet(k, 3.6, 10.4, 5.0, 9.4, wall_h=2.1, rise=1.6, door_x=7.0, windows=[(4.6, 0.85), (9.4, 0.85)],
                  windows_up=[(5.6, 1.7), (8.4, 1.7)], chimney=4.4, balcony=True, lanterns=(6.3, 7.7))
SMOKE.append(screen(4.4, rm - 0.15, zr + 0.7))
k.box(5.2, 9.4, 2.2, 8.8, 9.46, 2.55, ('#3a2416', 0.05), 'sign_board')
G.letters(k, 'Stübli', 'Pacifico', 7.0, 9.46, 2.22, size=0.3, col='#ffd890', lit=True, energy=4)
N.hanging_sign(k, 10.2, 9.36, 1.4, 'mug')
for (x, r) in ((4.6, 11.4), (9.4, 11.4), (7.0, 12.8)):
    A.fondue_table(k, x, r)
    A.bistro_chair(k, x - 0.55, r - 0.1, cushion='#b82a2a')
    A.bistro_chair(k, x + 0.55, r - 0.1, cushion='#b82a2a')
A.heater(k, 3.4, 12.6)
A.heater(k, 10.6, 12.6)

# ---- the rink and its skate hut ----------------------------------------------------------------------------------------------
RINK = (12.4, 8.2, 22.0, 14.0)
SKATERS = A.rink(k, *RINK)
N.chalet(k, 13.4, 16.6, 5.2, 7.6, wall_h=1.7, rise=1.0, door_x=15.0, windows=[(14.1, 0.8), (15.9, 0.8)], chimney=16.0)
SMOKE.append(screen(15.9, 5.9, 3.2))
k.box(13.8, 7.6, 1.72, 16.2, 7.66, 1.98, ('#b83a2e', 0.05), 'sign_board')
G.letters(k, 'SKATES', 'Righteous', 15.0, 7.66, 1.74, size=0.2, col='#f8f0e0', lit=True, energy=2)
N.ski_rack(k, 17.2, 19.4, 7.4, cols=('#e8e8f0', '#2a2a30', '#e8e8f0', '#b83a2e'))
inside, ring = A.rink_cells(*RINK)

# ---- the Alpenhof and its heated pool ----------------------------------------------------------------------------------------
sm = A.grand_chalet(k, 24.6, 34.4, 3.6, 8.6, wall_h=3.0, rise=1.7, door_x=29.5, floors=3, chimney_x=26.0)
SMOKE.append(sm)
k.box(26.8, 8.62, 3.05, 32.2, 8.66, 3.4, ('#3a2416', 0.05), 'sign_board')
G.letters(k, 'ALPENHOF', 'CinzelDecorative-Bold', 29.5, 8.66, 3.08, size=0.28, col=A.GILT, lit=True, energy=3)
for x in (25.4, 33.6):
    A.urn_planter(k, x, 9.2)
# the pool sits in a raised stone terrace (the shelf's snow is one sheet at z 0): a plinth round it, the water within
for (a, b, c, d) in ((24.2, 10.0, 34.8, 10.6), (24.2, 13.6, 34.8, 14.2), (24.2, 10.6, 24.8, 13.6), (34.2, 10.6, 34.8, 13.6)):
    k.box(a, b, 0.0, c, d, 0.5, ('#a8a4ac', 0.12), 'terrace_wall')
A.ashlar(k, 24.2, 34.8, 14.2, 0.0, 0.5, '#a8a4ac', course=0.25, block=(0.35, 0.6))
STEAM = A.heated_pool(k, 24.8, 10.6, 34.2, 13.6, coping='#d8d2c4', tile='#2a8aa0', z0=0.5)
for (x, f) in ((25.6, 1), (27.1, 1), (31.9, -1), (33.4, -1)):
    A.lounger(k, x, 14.5, facing=f, col='#f0e8d8', towel=k.rng.choice(('#b82a2a', '#f0f0f0', '#1e2a4a')))
A.heater(k, 29.5, 14.6)

# ---- the sleighs, east, and the boutique ------------------------------------------------------------------------------------
A.sleigh(k, 39.6, 11.0, facing=-1)
A.horse(k, 38.0, 11.0, facing=-1, coat='#6a4228')
A.sleigh(k, 39.6, 13.4, facing=-1, body='#1e4a3a')
A.horse(k, 38.0, 13.4, facing=-1, coat='#e8e0d4', mane='#c8c0b4')
k.box(41.3, 9.0, 0.0, 41.45, 9.15, 1.5, ('#3a2416', 0.06), 'post')
k.box(40.6, 9.08, 1.15, 42.2, 9.18, 1.52, ('#3a2416', 0.05), 'sign_board')
G.letters(k, 'SLEIGHS', 'Righteous', 41.4, 9.19, 1.2, size=0.2, col='#ffd890', lit=True, energy=2)
k.solid(40.6, 8.9, 42.2, 9.3)
N.woodpile(k, 36.2, 37.8, 7.0)
for (x, r) in ((42.6, 6.6), (36.0, 5.0), (43.4, 12.4)):
    N.snow_pine(k, x, r, h=k.rng.uniform(2.4, 2.9))
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)

# ---- the promenade: lamps, benches facing the view, a coin telescope -------------------------------------------------------------
for x in (3.0, 11.0, 19.0, 27.0, 35.0, 42.0):
    W.lantern_post(k, x, 15.2, h=2.3, energy=28)
for (x0, x1) in ((8.0, 9.6), (14.0, 15.6), (31.6, 33.2), (37.6, 39.2)):
    A.bench_iron(k, x0, x1, 19.0)
    k.solid(x0, 18.8, x1, 19.2)
# a stone balustrade along the promenade's south side, open where the ways go down to the terrace and the station
for (xa, xb) in ((0.6, 4.6), (7.8, 13.6), (16.0, 21.6), (24.8, 26.0), (27.4, 31.0), (34.8, 37.0), (39.6, 43.6)):
    A.balustrade(k, xa, 18.75, xb, 18.75, h=0.5)
    k.solid(xa, 18.6, xb, 18.9)
# small life: a snowman, sleds, a signpost, drifts, firs in clusters
N.snowman(k, 36.2, 20.8, scarf='#2a6ac0')
N.sled(k, 37.8, 21.6)
N.sled(k, 11.6, 14.4, col='#2a9a5a')
N.signpost(k, 41.6, 19.6, cols=('#c83a2e', '#2a6ac0', '#e0b030'))
k.solid(36, 20, 37, 21)
for (x, r) in ((1.6, 10.6), (2.8, 13.0), (11.6, 4.6), (22.0, 4.4), (43.0, 9.6), (34.8, 4.4), (17.6, 21.0), (31.0, 21.6), (40.4, 22.4),
               (13.4, 21.4), (0.8, 7.0)):
    N.snow_pine(k, x, r, h=k.rng.uniform(2.2, 2.9))
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
for _ in range(24):
    x, r = k.rng.uniform(1, 43), k.rng.uniform(19.4, 22.4)
    if not (19.0 < x < 27.4) and not (12.0 < x < 13.0):
        k.blob(x, r, 0.0, k.rng.uniform(0.4, 0.9), k.rng.uniform(0.2, 0.4), k.rng.uniform(0.05, 0.1), (N.SNOW, 0.04), 'drift', segs=9)
k.cyl(26.6, 19.2, 0.0, 0.9, 0.05, ('#3a3c44', 0.05), 'telescope_post', verts=8)
k.tube((26.6, 19.2, 1.0), (26.9, 19.6, 1.12), 0.08, ('#c8a050', 0.05), 'telescope', verts=10)
k.box(26.45, 19.05, 0.9, 26.75, 19.35, 1.0, ('#3a3c44', 0.05), 'telescope_head')
k.solid_post(26.6, 19.2)

# ---- the après-ski terrace (west) ---------------------------------------------------------------------------------------------
k.box(1.2, 19.6, 0.0, 12.6, 23.8, 0.06, ('#8a6040', 0.12), 'deck')
x = 1.25
while x < 12.6:                                                       # the deck's boards
    k.box(x, 19.62, 0.06, x + 0.02, 23.78, 0.065, ('#5a3a22', 0.1), 'deck_joint')
    x += 0.28
k.box(1.6, 19.9, 0.06, 6.2, 20.8, 1.05, ('#6a4228', 0.08), 'bar_counter')            # the log bar
k.box(1.5, 19.85, 1.05, 6.3, 20.9, 1.12, ('#4a2a18', 0.06), 'bar_top')
for xx in (1.9, 2.6, 3.3, 4.0, 4.7, 5.4):
    k.cyl(xx, 20.3, 1.12, 1.4, 0.05, ('#2a4a2a' if int(xx * 10) % 2 else '#6a1a1a', 0.06), 'bottle', verts=6)
k.box(1.4, 19.7, 2.2, 6.4, 21.0, 2.3, (N.SNOW, 0.03), 'roof_snow')
for xx in (1.5, 6.3):
    k.box(xx - 0.06, 20.85, 0.06, xx + 0.06, 20.97, 2.2, ('#4a2a18', 0.06), 'post')
k.box(1.6, 20.95, 1.72, 6.2, 21.0, 2.1, ('#3a2416', 0.05), 'sign_board')
G.letters(k, 'APRES-SKI', 'Righteous', 3.9, 21.0, 1.78, size=0.24, col='#ffd890', lit=True, energy=3)
k.solid(1.5, 19.8, 6.3, 20.9)
for (x, r) in ((8.0, 21.2), (10.6, 21.4), (8.6, 23.0)):
    A.fondue_table(k, x, r, cloth='#e8dcc8', check=False)
    A.bistro_chair(k, x - 0.55, r - 0.1)
    A.bistro_chair(k, x + 0.55, r - 0.1)
A.fire_pit(k, 3.6, 22.8, rad=0.5)
for x in (6.8, 11.8):
    A.heater(k, x, 22.6)
k.solid(1.2, 23.6, 12.6, 23.8)

# ---- the station ------------------------------------------------------------------------------------------------------------
rm_s, zr_s = N.chalet(k, 19.6, 26.8, 19.8, 22.6, wall_h=2.0, rise=1.3, door_x=23.2, windows=[(20.6, 0.85), (25.8, 0.85)], chimney=26.0)
SMOKE.append(screen(25.9, rm_s - 0.15, zr_s + 0.7))
k.box(21.0, 22.62, 1.95, 25.4, 22.68, 2.3, ('#2a4a3a', 0.05), 'sign_board')
G.letters(k, 'FELLHAVEN', 'CinzelDecorative-Bold', 23.2, 22.68, 1.98, size=0.24, col=A.GILT, lit=True, energy=2)
k.cyl_y(23.2, 22.66, 22.72, 2.7, 0.26, 0.26, (A.GILT, 0.04), 'clock_rim', verts=20)
k.cyl_y(23.2, 22.68, 22.74, 2.7, 0.2, 0.2, '#f4ecd8', 'clock_face', emit=('#fff2d0', 0.3), verts=20)
A.platform(k, 13.0, 41.0, 22.8, 24.6, z=0.06, canopy=False)
A.track(k, -3.0, COLS + 3.0, 25.6)
TRAIN_X0 = 27.0
TRAIN_X1 = A.train(k, TRAIN_X0, 25.6, cars=2, facing=1)
for x in (6.0, 18.0, 30.0, 42.0):
    A.catenary_mast(k, x, 24.7, h=2.6, arm=0.9)
A.luggage(k, 16.0, 23.6)
A.bench_iron(k, 33.0, 34.6, 23.4)
k.solid(33.0, 23.2, 34.6, 23.6)
k.box(14.6, 22.9, 0.06, 14.7, 23.0, 1.9, A.IRON, 'post')
k.box(13.9, 22.9, 1.4, 15.4, 23.0, 1.95, ('#1e2a3a', 0.05), 'sign_board')
G.letters(k, 'DEPARTURES', 'Righteous', 14.65, 23.02, 1.62, size=0.12, col='#f0d070', lit=True, energy=2)
k.solid(13.9, 22.8, 15.4, 23.1)
k.solid(-3, 25.0, COLS + 3, ROWS + 4)                                    # the track and the drop beyond it

# ---- the edges -------------------------------------------------------------------------------------------------------------------
k.solid(-3, -8, COLS + 3, 4.6)                                           # the mountainside
k.solid(-1, 0, 1, ROWS)                                                  # the west end of the shelf
k.solid(*RINK[:2], RINK[2], RINK[1] + 0.4)
for (c, r) in ring:
    k.blocked.add((c, r))
for (c, r) in inside:
    k.blocked.discard((c, r))
for c in range(int(RINK[0]) + 1, int(RINK[2]) - 1):                     # gates in the boards, front and back
    pass

# ---- the light: the bright sun Hoarfell's day has, the lamps warm --------------------------------------------------------------
k.sun((0.8, 0.25, -0.38), '#ffd8b8', 3.2, angle=3.0)
A.flush(k)
k.render(OUT, cycle='day', light_states={'full': {}}, light_samples=24 if QUICK else 64, world_light=('#8a96cc', 0.95))

# ---- the world -----------------------------------------------------------------------------------------------------------------------
gate = (int((RINK[0] + RINK[2]) / 2), int(RINK[3]) - 1)                  # the rink's gate, in its front boards
k.blocked.discard(gate)
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Promenade', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [42, 17]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [-2.0, -4.0, COLS + 2.0, 28.0], 'cold': True})
w['interactions'] = [
    {'x': 43, 'y': 17, 'type': 'enter_world', 'label': 'FELLHAVEN', 'prompt': 'PRESS E TO WALK UP', 'target': 'hoarfell', 'spawn': [3, 16]},
    {'x': 30, 'y': 24, 'type': 'railway', 'label': 'THE TRAIN', 'prompt': 'PRESS E TO BOARD', 'to': 'hoarfell-aurelle'},
    {'x': 14, 'y': 24, 'type': 'railway_board', 'label': 'DEPARTURES', 'prompt': 'PRESS E TO READ'},
    {'x': 21, 'y': 23, 'type': 'dialog', 'label': 'STATIONMASTER', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE STATIONMASTER CHECKS HER WATCH.'},
    {'x': 5, 'y': 10, 'type': 'dialog', 'label': 'KASPAR', 'prompt': 'PRESS E TO TALK', 'dialog': 'KASPAR STIRS THE POT IN FIGURES OF EIGHT.'},
    {'x': 7, 'y': 10, 'type': 'promenade', 'label': 'STUBLI', 'prompt': 'PRESS E TO GO IN'},
    {'x': 15, 'y': 8, 'type': 'promenade', 'label': 'RINK', 'prompt': 'PRESS E TO SKATE'},
    {'x': gate[0], 'y': gate[1] + 1, 'type': 'promenade', 'label': 'RINK', 'prompt': 'PRESS E TO SKATE'},
    {'x': 29, 'y': 9, 'type': 'promenade', 'label': 'ALPENHOF', 'prompt': 'PRESS E TO GO IN'},
    {'x': 29, 'y': 15, 'type': 'promenade', 'label': 'HEATED POOL', 'prompt': 'PRESS E TO SWIM'},
    {'x': 41, 'y': 12, 'type': 'promenade', 'label': 'SLEIGHS', 'prompt': 'PRESS E TO RIDE'},
    {'x': 4, 'y': 21, 'type': 'promenade', 'label': 'APRES-SKI', 'prompt': 'PRESS E TO JOIN IN'},
    {'x': 4, 'y': 22, 'type': 'promenade', 'label': 'FIRE PIT', 'prompt': 'PRESS E TO WARM UP'},
    {'x': 26, 'y': 20, 'type': 'dialog', 'label': 'TELESCOPE', 'prompt': 'PRESS E TO LOOK', 'action': 'view', 'view': 'peaks',
     'dialog': 'A BRASS TELESCOPE ON A POST, A COIN SLOT THAT HASN\'T WORKED IN YEARS. THROUGH IT: THE CLOUD SEA, THE RANGE, AND FAR UP THE VALLEY A CHATEAU WITH GREEN TURRETS.'},
]
w['lift'] = None
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
ACTORS = [{'sheet': 'npc-stationmaster', 'x': 21, 'y': 23, 'facing': 'down'}, {'sheet': 'npc-kaspar', 'x': 5, 'y': 10, 'facing': 'down'}]
for a in ACTORS:
    k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, actors=ACTORS,
            scene_extra={'backdrop': True, 'smoke': [s for s in SMOKE if s], 'steam': STEAM, 'train': [TRAIN_X0, 25.6, TRAIN_X1],
                         'skaters': SKATERS})
w = json.load(open(WORLD))
w.pop('lift', None)
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('promenade done')
