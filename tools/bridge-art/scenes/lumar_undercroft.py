"""The Undercroft under Midnight Isle — the entrance hall and the three floor layouts of the nightly dungeon.

  BVENV/bin/python tools/bridge-art/scenes/lumar_undercroft.py RENDER_DIR hall|a|b|c
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-undercroft[-a|-b|-c]

Down the stair from the graveyard of the drowned: the hall (the stair up, the slate that keeps the deepest floor
reached, a brazier, the stair down) and three crypt layouts that serve every floor below, the way the Rose Mine's
three caves do. A layout is rooms and passages on the tile grid (assets_crypt.build walls them: coursed faces where
a room's back wall shows, low kerbs where a wall would hide someone); the walls are dressed — niches of bones, roots
through the vault, sconces, braziers in the corners, black water — and the floor is left bare: js/dungeon.js (the
other session's) scatters the night's monsters, chests, traps and the stair down over it by its seed. Each floor
JSON has a `dungeon` block for it to fill and the stair up as `dungeon.up`.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world  # noqa: E402
import assets_crypt as C               # noqa: E402
import assets_lumar as A               # noqa: E402

OUT, LAYOUT = sys.argv[1], sys.argv[2]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'lumar-undercroft' + ('' if LAYOUT == 'hall' else '-' + LAYOUT)
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
GRAVE_DOOR = (5, 22)                     # where the stair up comes out in the graveyard (lumar-midnight)

# rooms and passages (c0, r0, c1, r1, exclusive), pillars, pools, braziers (cells), the stair up (x of its left cell)
LAYOUTS = {
    'hall': dict(size=(16, 12), seed=601, stair=7,
                 rect=[(2, 4, 14, 11)], pillars=[(4, 7), (11, 6)], pools=[], braziers=[(2, 4), (13, 4)]),
    'a': dict(size=(30, 22), seed=602, stair=14,                    # the ossuary: a pillared hall, a chapel, a crypt, the long south aisle
              rect=[(9, 4, 21, 12), (2, 6, 7, 11), (23, 5, 28, 10), (5, 15, 25, 19),
                    (7, 8, 9, 10), (21, 7, 23, 9), (14, 12, 16, 15), (3, 11, 5, 15), (25, 15, 27, 19), (26, 10, 28, 15)],
              pillars=[(11, 6), (15, 6), (18, 6), (11, 10), (18, 10)], pools=[(21, 16), (22, 16), (21, 17), (22, 17)],
              braziers=[(9, 4), (20, 4), (2, 6), (27, 5), (5, 18), (24, 18)]),
    'b': dict(size=(30, 22), seed=603, stair=4,                     # the long gallery and three chambers below it, one flooded
              rect=[(2, 5, 28, 9), (4, 12, 9, 18), (12, 12, 18, 19), (21, 12, 27, 18),
                    (6, 9, 8, 12), (14, 9, 16, 12), (23, 9, 25, 12), (9, 14, 12, 16), (18, 14, 21, 16)],
              pillars=[(8, 6), (13, 6), (18, 6), (23, 6), (14, 15)], pools=[(23, 14), (24, 14), (25, 14), (23, 15), (24, 15), (25, 15)],
              braziers=[(2, 5), (27, 5), (4, 12), (17, 18), (26, 17)]),
    'c': dict(size=(30, 22), seed=604, stair=8,                     # the root-broken vaults: rounded chambers, roots everywhere
              ell=[(8.5, 9.5, 5.6, 4.2), (21.5, 8.5, 5.2, 3.6), (15.0, 16.5, 7.2, 3.3)],
              rect=[(12, 8, 17, 10), (7, 12, 9, 15), (21, 11, 23, 15)],
              pillars=[(9, 9), (21, 8), (15, 16)], pools=[(4, 10), (5, 10), (4, 11)], braziers=[(13, 8), (19, 15), (25, 7)]),
}
L = LAYOUTS[LAYOUT]
COLS, ROWS = L['size']
k = Kit(COLS, ROWS, margin_top=2.2, margin_bottom=0.4, seed=L['seed'])


def is_open(c, r):
    if r < 3 or r > ROWS - 2 or c < 1 or c > COLS - 2:
        return False
    x, y = c + 0.5, r + 0.5
    return any(c0 <= c < c1 and r0 <= r < r1 for c0, r0, c1, r1 in L['rect']) or \
        any(((x - cx) / rx) ** 2 + ((y - cr) / ry) ** 2 <= 1.0 for cx, cr, rx, ry in L.get('ell', ()))


walk = {(c, r) for r in range(ROWS) for c in range(COLS) if is_open(c, r)}
sx = L['stair']
sy = min(r for (c, r) in walk if c in (sx, sx + 1)) - 1   # the stair stands in the back wall above the first open row
stair = {(sx, sy), (sx + 1, sy)}
fixed = set(L['pillars']) | set(L['pools']) | set(L['braziers'])
floor_cells = walk - fixed

# ---- floor, walls, the stair up -----------------------------------------------------------------------------
WELL = {(9, 8), (10, 8), (9, 9), (10, 9)} if LAYOUT == 'hall' else set()   # the stair down, cut through the floor
C.floor(k, walk - set(L['pools']) - WELL)
faces = C.build(k, walk, COLS, ROWS, keep_clear=stair)
for (c, r) in stair:
    k.solid(c, r, c + 1, r + 1)
# the stair up: a round-headed arch in the back wall, worn steps climbing into the dark behind it
front, cxs = sy + 1, sx + 1.0
w, spring, rz = 0.6, 1.0, 0.7                                                               # half-width, springing, rise
for (x0, x1) in ((sx, cxs - w), (cxs + w, sx + 2)):                                       # the jambs
    k.box(x0, sy, 0.0, x1, front, C.WALL_H, '#0a080e', 'crypt_wall')
    C.coursed(k, x0, x1, front, 0.0, C.WALL_H)
k.box(cxs - w, sy, spring, cxs + w, front, C.WALL_H, '#0a080e', 'crypt_wall')                # over the arch
C.coursed(k, cxs - w, cxs + w, front, spring, C.WALL_H)
C.cornice(k, sx, sx + 2, front)
k.box(cxs - w, sy - 0.05, 0.0, cxs + w, sy + 0.08, spring + rz, '#040306', 'stair_dark')     # the dark it climbs into
for i in range(5):
    r1 = front - i * 0.18
    k.box(cxs - w + 0.03, r1 - 0.18, -0.3, cxs + w - 0.03, r1, 0.17 * (i + 1), (C.shade(C.STONE, 0.98 - 0.12 * i), 0.14), 'stair_step', bevel=0.015)
k.poly([(cxs, front + 0.05, spring)] + [(cxs + w * math.cos(t), front + 0.05, spring + rz * math.sin(t)) for t in [math.pi * j / 16 for j in range(17)]],
       '#040306', 'stair_dark')                                                             # the arch's dark head
n, gap = 9, 0.035
for j in range(n):                                                                          # voussoirs round it, a keystone
    t0, t1 = math.pi * j / n + gap / 2, math.pi * (j + 1) / n - gap / 2
    o = 0.2 if j == n // 2 else 0.14
    q = [(cxs + (w + dw) * math.cos(t), front + 0.04, spring + (rz + dw) * math.sin(t)) for (dw, t) in ((0, t0), (o, t0), (o, t1), (0, t1))]
    k.quads([q], (C.shade(C.STONE, k.rng.uniform(1.0, 1.22)), 0.12), 'stair_arch')
for x in (cxs - w - 0.12, cxs + w):                                                          # dressed reveals, imposts at the spring
    k.box(x, front - 0.02, 0.0, x + 0.12, front + 0.035, spring, (C.shade(C.STONE, 1.08), 0.12), 'stair_arch')
    k.box(x - 0.04, front - 0.02, spring - 0.08, x + 0.16, front + 0.07, spring, (C.shade(C.STONE, 1.16), 0.12), 'stair_arch', bevel=0.01)
k.point_light(cxs, sy + 0.3, 1.3, '#8090c0', 4, radius=0.4)                                 # a little night down the stair
k.point_light(cxs, front - 0.45, 1.25, '#8090c0', 5, radius=0.2)                              # and on its steps

# ---- what stands in the rooms: pillars, black water, braziers ------------------------------------------------
for (c, r) in L['pillars']:
    C.pillar(k, c + 0.5, r + 0.5)
if L['pools']:
    C.pool(k, L['pools'])
for (c, r) in L['braziers']:
    C.brazier(k, c + 0.5, r + 0.5)
C.dress(k, faces, k.rng, skip=[(sx - 0.6, sx + 2.6, sy + 1)] + ([(10.0, 12.0, sy + 1)] if LAYOUT == 'hall' else []))

# candles at the wall's foot here and there (on the kerb, never the floor)
kerbs = [(c, r) for r in range(ROWS) for c in range(COLS) if (c, r) not in walk and (c, r - 1) in walk and (c, r) not in stair]
k.rng.shuffle(kerbs)
for (c, r) in kerbs[:3]:
    C.candles(k, c + 0.5, r + 0.5, z=0.4)

# ---- the hall's own furniture: the slate of the deepest floor, the stair down ------------------------------------
inter = []
if LAYOUT == 'hall':
    slate_x = 11
    k.box(slate_x - 0.62, 3.95, 0.8, slate_x + 0.62, 4.06, 1.8, (A.WOOD_D, 0.14), 'slate_frame')
    k.box(slate_x - 0.55, 3.97, 0.85, slate_x + 0.55, 4.08, 1.75, ('#1e2228', 0.06), 'slate')
    for i, w in enumerate((0.7, 0.5, 0.62, 0.3)):                                          # chalk marks of floors reached
        k.box(slate_x - 0.45, 4.08, 1.55 - i * 0.18, slate_x - 0.45 + w, 4.095, 1.58 - i * 0.18, '#c8c8c0', 'chalk')
    C.stair_down(k, 9.0, 11.0, 8.0, 10.0)
    k.solid(9, 8, 11, 10)
    C.sarcophagus(k, 2.15, 9.1)                                                             # an old knight's tomb, bones in the corner
    C.bones(k, 13.45, 10.4)
    inter = [
        {'x': sx, 'y': sy, 'type': 'enter_world', 'target': 'lumar-midnight', 'spawn': list(GRAVE_DOOR), 'label': 'STAIR UP', 'prompt': 'PRESS E TO CLIMB'},
        {'x': slate_x, 'y': 4, 'type': 'dialog', 'label': 'DEEPEST FLOOR', 'prompt': 'PRESS E TO READ',
         'dialog': 'A SLATE, CHALKED WITH THE DEEPEST FLOOR ANYONE HAS REACHED.\n\nTHE OLDEST MARKS ARE IN A HAND NOBODY ALIVE WRITES IN.'},
        {'x': 10, 'y': 9, 'type': 'dialog', 'label': 'STAIR DOWN', 'prompt': 'PRESS E TO GO DOWN',
         'dialog': 'THE STAIR GOES DOWN INTO THE DARK. THE AIR COMING UP IS COLD AND SMELLS OF THE SEA.'},
    ]
else:
    inter = [{'x': sx, 'y': sy, 'type': 'dungeon_up', 'label': 'STAIR UP', 'prompt': 'PRESS E TO CLIMB'}]

# ---- light: cold dark, warm only where fire is ------------------------------------------------------------------
k.area_light(COLS / 2, ROWS / 2 + 1, 6.0, '#6a70a8', 2.6 * COLS * ROWS, max(COLS, ROWS) * 0.8)                # a little cold light from nowhere in particular
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.72}}, light_samples=int(os.environ.get('SCENE_SAMPLES', 112)),
         world_light=('#1c1a2a', 0.4))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Undercroft', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'cave',
          'spawns': {'player': [sx, sy + 1]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)]})
if LAYOUT != 'hall':
    d = w.get('dungeon') or {}
    d.update({'layout': LAYOUT, 'up': [sx, sy], 'open': len(floor_cells)})
    w['dungeon'] = d
w['interactions'] = inter
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID)
print('undercroft', LAYOUT, len(floor_cells), 'open floor cells; stair up', (sx, sy))
