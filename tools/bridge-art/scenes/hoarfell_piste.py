"""Hoarfell — the pistes of the Hoarspire. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_piste.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-piste

The mountainside under the summit, skied in the world at its own scale
(js/ski.js): three runs from start huts along the crest down to one finish.
The Couloir (black) drops down a gully between rock walls — moguls, then
ice, then a big kicker where it opens out; Pinewood (blue) winds through the
forest with a jump in a glade; the Nursery Slope (green) swings broad and
easy down the east side beside the chairlift. They meet over the finish
bowl: the arch, orange nets, the timing hut, the lift's bottom station and
the path down to Fellhaven.

Downhill is down the screen (the ground stays flat in the render; the slope
is the game's: `ski.grade`, a digit a tile). What the game needs is written
into the world JSON's `ski` block: the runs (start, gates), the grade and
zone grids (groomed, powder, moguls, ice), the jumps and the obstacles
(trees, rocks) as circles.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_isle as I                       # noqa: E402
import assets_snow as N                       # noqa: E402
import assets_town as W                       # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'hoarfell-piste'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 46, 104
C = math.cos(math.radians(45))
k = Kit(COLS, ROWS, margin_top=2.4, margin_bottom=0.6, seed=7311)
START_R, FINISH_R = 7.0, 90.0


def screen(x, r, z):
    return [round(x, 3), round(r - z * C, 3)]


def n2(x, r, f, seed):
    return math.sin(x * f * 1.7 + seed) * 0.5 + math.sin(r * f * 2.3 + seed * 1.9) * 0.3 + math.sin((x + r) * f + seed * 0.7) * 0.2


# ---- the runs: a centreline (Catmull-Rom through points every 8 rows) and a half-width -------------------------------
RUNS = {
    'couloir':  {'kind': 'black', 'name': 'COULOIR', 'hw': 3.2,
                 'pts': [(9, 3), (9, 7), (8.5, 14), (7.5, 22), (7, 30), (8, 38), (8.5, 46), (9.5, 54), (11.5, 62), (13.5, 70),
                         (17, 78), (20.5, 86), (22, 94)]},
    'pinewood': {'kind': 'blue', 'name': 'PINEWOOD', 'hw': 3.4,
                 'pts': [(23, 3), (23, 7), (24, 14), (21.5, 22), (18.5, 30), (19.5, 38), (23, 46), (24.5, 54), (22.5, 62), (20, 70),
                         (21.5, 78), (23, 86), (23, 94)]},
    'nursery':  {'kind': 'green', 'name': 'NURSERY', 'hw': 4.0,
                 'pts': [(37, 3), (37, 7), (37.5, 14), (38, 22), (36.5, 30), (34.5, 38), (33.5, 46), (35, 54), (37.5, 62), (36, 70),
                         (32, 78), (27.5, 86), (25, 94)]},
}


def centre(run, r):
    P = RUNS[run]['pts']
    rs = [p[1] for p in P]
    if r <= rs[0]:
        return P[0][0]
    if r >= rs[-1]:
        return P[-1][0]
    i = max(j for j in range(len(P) - 1) if rs[j] <= r)
    p0, p1, p2, p3 = P[max(0, i - 1)][0], P[i][0], P[i + 1][0], P[min(len(P) - 1, i + 2)][0]
    t = (r - rs[i]) / (rs[i + 1] - rs[i])
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)


def half(run, r):
    hw = RUNS[run]['hw']
    if run == 'couloir' and 14 < r < 54:
        hw = 2.7 + 0.35 * math.sin(r * 0.37)                 # the gully pinches and opens
    return hw + 0.25 * n2(r, 0, 0.5, len(run))


def on_run(x, r, margin=0.0):
    """Which run (x, r) is on, or None."""
    if r < 2.5:
        return None
    best, bd = None, 1e9
    for run in RUNS:
        d = abs(x - centre(run, r)) - half(run, r)
        if d < margin and d < bd:
            best, bd = run, d
    return best


# the zones: moguls, ice (x, r rects around a run's line), the finish bowl
MOGULS = [('couloir', 23.5, 33.5), ('pinewood', 56.0, 61.0)]
ICE = [('couloir', 40.0, 46.0, 0.0, 1.0), ('pinewood', 64.5, 67.5, -1.0, 0.4), ('couloir', 64.0, 66.0, -0.2, 0.6)]
JUMPS = [  # run, row of the lip, offset from the line, width, length, lip height
    ('couloir', 59.0, 0.0, 2.4, 2.2, 0.5),
    ('pinewood', 49.0, 0.8, 2.4, 2.0, 0.42),
    ('nursery', 66.0, -1.2, 2.6, 1.8, 0.3),
]
BOWL_R = 84.0


def in_moguls(x, r):
    for (run, a, b) in MOGULS:
        if a <= r <= b and abs(x - centre(run, r)) < half(run, r) - (0.0 if run == 'couloir' else half(run, r) * 0.45):
            return True
    return False


def in_ice(x, r):
    for (run, a, b, lo, hi) in ICE:
        c, h = centre(run, r), half(run, r)
        if a <= r <= b and c + lo * h - 0.2 * math.sin(r * 2.1) <= x <= c + hi * h + 0.2 * math.sin(r * 1.7):
            return True
    return False


def jump_at(x, r):
    """Height of a kicker at (x, r): a ramp rising south to its lip, then the drop."""
    z = 0.0
    for (run, lr, off, w, L, h) in JUMPS:
        jx = centre(run, lr) + off
        u = (r - (lr - L)) / L
        v = abs(x - jx) / (w / 2)
        if 0 <= u <= 1 and v <= 1:
            z = max(z, h * u ** 1.4 * (1 - v ** 6))
    return z


def mogul_h(x, r):
    if not in_moguls(x, r):
        return 0.0
    m = math.sin(x * math.tau / 1.5) * math.sin(r * math.tau / 1.5 + x * 0.8)
    return 0.11 * max(0.0, m) ** 0.8


def height(x, r):
    z = jump_at(x, r) + mogul_h(x, r)
    if not on_run(x, r, margin=0.3) and START_R + 1.5 < r < BOWL_R - 2:      # wind ripples in the untracked powder
        z += 0.018 * max(0.0, math.sin(x * 2.2 + r * 3.1 + 1.6 * n2(x, r, 0.4, 5)))
    return z


def material(x, r):
    if in_ice(x, r):
        return 'ice'
    if jump_at(x, r) > 0.02:
        return 'kicker'
    run = on_run(x, r)
    if run or (r > BOWL_R - 2 and 9 < x < 41) or r < START_R + 1.5:
        if in_moguls(x, r):
            return 'mogul'
        return 'cord' if int(math.floor(x * 8)) % 2 else 'cord2'   # corduroy from the groomer, down the fall line
    return 'powder'


# (colour, grain): the grain is per-pixel noise in the albedo — keep it faint on snow or it blotches grey
ALB = {'powder': ('#e0e8f4', 0.03), 'cord': (shade(N.SNOW, 1.02), 0.0), 'cord2': (shade(N.SNOW, 0.975), 0.0),
       'mogul': (shade(N.SNOW, 1.0), 0.02), 'kicker': (shade(N.SNOW, 1.03), 0.0), 'ice': ('#a8d4ea', 0.04)}

# ---- the couloir's walls, the crest along the top -----------------------------------------------------------------------
walls = set()
for r in range(14, 55):
    c, h = centre('couloir', r + 0.5), half('couloir', r + 0.5)
    for x in range(-2, int(math.floor(c - h - 0.4))):
        walls.add((x, r))
    for x in range(int(math.ceil(c + h + 0.4)), int(math.ceil(c + h + 0.4)) + 3):
        walls.add((x, r))
crest = {(x, r) for x in range(-2, COLS + 2) for r in range(-5, 1)}
ground_cells = [(x, r) for x in range(-1, COLS + 1) for r in range(-3, ROWS + 1) if (x, r) not in walls and (x, r) not in crest]
I.ground(k, ground_cells, material, ALB, step=0.125, bump=0.01, seed=13, height=height, dither=0.07)
gm = (lambda x, r: material(x, r), ALB)
HW = I.ridge(k, sorted(walls), top=2.8, slope=1.3, seed=23, rock='#d6dee9', strata=('#6a7284', '#525a6c', '#7c8496'),
             moss=N.ROOF_SNOW, foot=0.5, patchy=False, ground=gm)
HC = I.ridge(k, sorted(crest), top=2.4, slope=1.6, seed=29, rock='#d6dee9', strata=('#5e6678', '#485062', '#727a8c'),
             moss=N.ROOF_SNOW, foot=0.7, patchy=False, ground=gm)
for (x, r) in walls | crest:
    k.solid(x, r, x + 1, r + 1)

# ---- the starts along the crest ------------------------------------------------------------------------------------------
STARTS = {}
for run, R in RUNS.items():
    cx = centre(run, 4.4)
    gr = N.start_house(k, cx, 4.2, R['kind'], R['name'])
    STARTS[run] = [round(cx, 2), round(gr + 0.6, 2)]
    N.trail_marker(k, cx + 1.9, gr - 0.2, R['kind'])
    k.solid(cx + 1.6, gr - 0.5, cx + 2.2, gr + 0.1)

# ---- edge poles down every run, trail markers at the junctions -------------------------------------------------------------
for run, R in RUNS.items():
    col = N.RUN_COL[R['kind']]
    r = 9.0
    while r < BOWL_R - 1:
        c, h = centre(run, r), half(run, r)
        for s in (-1, 1):
            x = c + s * (h + 0.15)
            if on_run(x, r, margin=-0.05) in (None, run) and (int(x), int(r)) not in walls and not in_ice(x, r):
                N.piste_pole(k, x, r, col)
        r += 5.5
N.trail_marker(k, 15.5, 74.5, 'black')
N.trail_marker(k, 27.6, 74.0, 'blue')
k.solid(15, 74, 16, 75)
k.solid(27, 73, 28, 74)

# ---- the finish ---------------------------------------------------------------------------------------------------------------
N.finish_arch(k, 14.6, 32.4, FINISH_R)
N.net_fence(k, (14.0, FINISH_R - 0.2), (9.2, BOWL_R - 1.0))
N.net_fence(k, (33.0, FINISH_R - 0.2), (38.6, BOWL_R - 1.0))
for (a, b) in (((14.0, FINISH_R + 0.4), (14.0, 95.0)), ((33.0, FINISH_R + 0.4), (33.0, 94.0))):
    N.net_fence(k, a, b, h=0.7, col='#3a6ac0')
rm, zr = N.chalet(k, 6.0, 10.6, 88.2, 91.0, wall_h=1.9, rise=1.2, door_x=8.3, windows=[(7.0, 0.85), (9.6, 0.85)], chimney=6.9)
SMOKE = [screen(6.78, rm - 0.15, zr + 0.7)]
k.box(6.6, 91.0, 1.95, 10.0, 91.06, 2.5, ('#1e1e26', 0.1), 'clock_board')
for i in range(5):
    k.box(6.9 + i * 0.62, 91.06, 2.08, 7.3 + i * 0.62, 91.1, 2.38, ('#ffb040' if i != 2 else '#1e1e26', 0.1), 'clock_digit',
          emit=('#ffb040', 0.8) if i != 2 else None)
W.bench(k, 16.0, 18.6, 95.6)
W.bench(k, 28.0, 30.6, 95.6)
N.ski_rack(k, 34.6, 36.6, 96.4)
N.ski_rack(k, 10.8, 12.8, 96.4)
for (x, r) in ((15.2, 97.0), (31.8, 97.0), (12.0, 92.4), (35.0, 92.4)):
    W.lantern_post(k, x, r, energy=18)
N.signpost(k, 26.6, 98.2, cols=('#2a9a5a', '#2a6ac0', '#1e1e26'))
N.trodden(k, 21.6, 96.6, 25.6, ROWS + 0.6)                        # the path down to Fellhaven
N.trodden(k, 25.6, 97.6, 41.0, 98.8)                             # along to the lift
N.trodden(k, 8.0, 91.0, 8.8, 96.6)                               # from the timing hut

# ---- the chairlift up the east side: bottom station, towers, the cable running on up to the summit ----------------------------
LX, LR = 43.0, 98.6
bull = N.lift_station(k, LX, LR)
towers = []
for (r, h) in ((86.0, 3.0), (72.0, 3.2), (58.0, 3.2), (44.0, 3.4), (30.0, 3.2), (16.0, 3.0)):
    towers.append(N.pylon(k, LX, r, h))
top = N.pylon(k, LX, 3.4, 2.8, z0=HC(LX, 3.4) - 0.05 if HC(LX, 3.4) > 0 else 0.0)
far = [(top[0][0], -7.0, top[0][2] + 4.0), (top[1][0], -7.0, top[1][2] + 4.0)]
lines = []
for s in (0, 1):
    pts = [bull[s]] + [t[s] for t in towers] + [top[s], far[s]]
    N.cable(k, pts)
    lines.append([screen(*p) for p in pts])

# ---- the forest: firs everywhere the runs aren't, rocks among them --------------------------------------------------------------
OBST = []
clear = lambda x, r: (r < START_R + 2.5 and 0 < x < 46) or (r > BOWL_R - 1.5 and 8.5 < x < 39.5) or 41.0 < x < 45.0
step = 1.2
r = -0.5
row = 0
while r < ROWS + 0.5:
    x = -0.6 + (step / 2 if row % 2 else 0)
    while x < COLS + 0.6:
        tx, tr = x + k.rng.uniform(-0.45, 0.45), r + k.rng.uniform(-0.4, 0.4)
        x += step
        if on_run(tx, tr, margin=0.75) or clear(tx, tr) or (int(math.floor(tx)), int(math.floor(tr))) in walls | crest:
            continue
        if any(abs(tr - (lr - L / 2)) < L and abs(tx - centre(run, lr) - off) < w for (run, lr, off, w, L, hh) in JUMPS):
            continue
        dens = 0.93 if 9 < tr < BOWL_R else 0.7
        if k.rng.random() > dens:
            continue
        if k.rng.random() < 0.07:                                         # a boulder instead
            s = k.rng.uniform(0.35, 0.6)
            k.rock(tx, tr, 0.1, s, s * 0.8, s * 0.7, ('#5a6272', 0.2), part='boulder', segs=8)
            k.blob(tx, tr, s * 0.6, s * 0.75, s * 0.6, s * 0.3, (N.SNOW, 0.25), 'boulder_snow', segs=8)
            OBST.append([round(tx, 2), round(tr, 2), round(s * 0.9, 2), 'rock'])
        else:
            N.piste_tree(k, tx, tr, h=k.rng.uniform(2.1, 3.3))
            OBST.append([round(tx, 2), round(tr, 2), 0.4, 'tree'])
        if 0 <= tx < COLS and 0 <= tr < ROWS:
            k.solid(math.floor(tx), math.floor(tr), math.floor(tx) + 1, math.floor(tr) + 1)
    r += step * 0.87
    row += 1
# a few lone firs and rocks inside the wider runs, to ski round
for (run, rr, off) in (('pinewood', 34.0, -1.6), ('pinewood', 70.5, 1.7), ('nursery', 26.0, 2.6), ('nursery', 52.0, -2.8),
                       ('couloir', 68.0, 2.0)):
    tx = centre(run, rr) + off
    N.piste_tree(k, tx, rr, h=2.4)
    OBST.append([round(tx, 2), rr, 0.4, 'tree'])
    k.solid(math.floor(tx), math.floor(rr), math.floor(tx) + 1, math.floor(rr) + 1)
for (run, rr, off, s) in (('couloir', 50.0, -1.4, 0.42), ('pinewood', 41.0, 2.0, 0.38), ('couloir', 19.0, 1.3, 0.34)):
    tx = centre(run, rr) + off
    k.rock(tx, rr, 0.08, s, s * 0.8, s * 0.6, ('#5a6272', 0.2), part='boulder', segs=8)
    k.blob(tx, rr, s * 0.5, s * 0.7, s * 0.55, s * 0.25, (N.SNOW, 0.25), 'boulder_snow', segs=8)
    OBST.append([round(tx, 2), rr, round(s * 0.9, 2), 'rock'])
    k.solid(math.floor(tx), math.floor(rr), math.floor(tx) + 1, math.floor(rr) + 1)
for t in towers + [top]:                                                   # the lift towers' feet
    OBST.append([LX, round(t[0][1], 2), 0.35, 'pylon'])

# ---- the light: the same alpenglow as the village ----------------------------------------------------------------------------------
k.sun((0.8, 0.25, -0.38), '#ffc4a4', 3.2, angle=3.0)
k.render(OUT, light_states={'full': {}}, light_samples=64, world_light=('#8a96cc', 0.95))

# ---- what the game needs ---------------------------------------------------------------------------------------------------------------
def gates(run, n, w):
    out = []
    for i in range(n):
        gr = 12.0 + (82.0 - 12.0) * (i + 0.5) / n
        c, h = centre(run, gr), half(run, gr)
        side = -1 if i % 2 == 0 else 1
        gx = c + side * h * 0.38
        if in_ice(gx, gr) or jump_at(gx, gr) > 0 or any(abs(o[0] - gx) < w / 2 + 0.6 and abs(o[1] - gr) < 0.9 for o in OBST):
            gx = c
        out.append([round(gx, 2), round(gr, 2), w])
    return out


grade, zone = [], []
for r in range(ROWS):
    g, z = '', ''
    for x in range(COLS):
        cx, cr = x + 0.5, r + 0.5
        run = on_run(cx, cr, margin=3.0)
        if cr < START_R:
            gv = 2
        elif cr > FINISH_R + 1.5:
            gv = 0
        elif cr > BOWL_R:
            gv = 3
        elif run == 'couloir':
            gv = 9 if 14 < cr < 56 else 7
        elif run == 'pinewood':
            gv = 7 if 26 < cr < 50 else 6
        elif run == 'nursery':
            gv = 4
        else:
            gv = 5
        g += str(gv)
        z += 'i' if in_ice(cx, cr) else 'm' if in_moguls(cx, cr) else '.' if (on_run(cx, cr) or cr > BOWL_R - 2 or cr < START_R + 1.5) else '~'
    grade.append(g)
    zone.append(z)

SKI = {
    'start': START_R, 'finish': FINISH_R,
    'runs': {run: {'kind': R['kind'], 'start': STARTS[run],
                   'gates': gates(run, {'couloir': 12, 'pinewood': 12, 'nursery': 9}[run], {'couloir': 2.4, 'pinewood': 2.8, 'nursery': 3.6}[run]),
                   'line': [[round(centre(run, rr), 2), rr] for rr in range(8, 92, 4)]}
             for run, R in RUNS.items()},
    'jumps': [[round(centre(run, lr) + off, 2), lr, w, L, h] for (run, lr, off, w, L, h) in JUMPS],
    'grade': grade, 'zone': zone, 'obstacles': OBST,
}

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Hoarspire Pistes', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [23, 101]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -1.2, COLS, ROWS], 'cold': True})
w['interactions'] = [
    {'x': 43, 'y': 98, 'type': 'lift', 'label': 'CHAIRLIFT', 'prompt': 'PRESS E TO RIDE', 'piste': True},
    {'x': 23, 'y': 103, 'type': 'enter_world', 'label': 'TO FELLHAVEN', 'prompt': 'PRESS E TO WALK DOWN', 'target': 'hoarfell', 'spawn': [39, 15]},
    {'x': 8, 'y': 91, 'type': 'dialog', 'label': 'TIMING HUT', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A HUT WITH A BIG AMBER CLOCK OVER THE DOOR. INSIDE, A STOVE, A FLASK, AND A LEDGER OF TIMES GOING BACK YEARS. THE COURSE RECORD ON THE COULOIR IS IN RED INK.'},
    {'x': 19, 'y': 93, 'type': 'dialog', 'label': 'LIV', 'prompt': 'PRESS E TO TALK', 'dialog': 'LIV LEANS ON HER POLES BY THE FINISH, WATCHING THE COULOIR.'},
    {'x': 26, 'y': 98, 'type': 'dialog', 'label': 'SIGNPOST', 'prompt': 'PRESS E TO READ',
     'dialog': 'GREEN: THE NURSERY SLOPE.  BLUE: PINEWOOD.  BLACK: THE COULOIR.\n\nAN ARROW POINTING DOWNHILL: FELLHAVEN, HOT COCOA.'},
] + [{'x': int(STARTS[run][0]), 'y': int(STARTS[run][1]) - 1, 'type': 'ski_gate', 'run': run, 'label': RUNS[run]['name'] + ' START',
      'prompt': 'PRESS E TO SKI'} for run in RUNS]
w['ski'] = SKI
open(WORLD, 'w').write(json.dumps(w, indent=1) + '\n')
k.solid(19, 93, 20, 94)                                                   # Liv, by the finish
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, actors=[{'sheet': 'npc-liv', 'x': 19, 'y': 93, 'facing': 'down'}],
            scene_extra={'smoke': SMOKE, 'lift': {'lines': lines}})
print('hoarfell-piste done', len(OBST), 'obstacles')
