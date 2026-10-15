"""The Rose Mine — a floor below. Blender scene, one of three cave layouts.

  BVENV/bin/python tools/bridge-art/scenes/lumar_rose_mine_floor.py RENDER_DIR a|b|c
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-rose-mine-<a|b|c>

Each layout is a cavern shaped by a mask of chambers and passages: rock
faces along the back, boulders round the edges (low at the front so you're
never hidden), a gritty floor, old props and lamps, and a ladder up to the
hall at the back. The rocks you break are not in the render — js/mine.js
scatters them over the open floor for each floor you go down (seeded), with
the ladder down hidden under one of them. The same three caves serve every
depth; the rocks and the light colour tell you how deep you are.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_cave as V                # noqa: E402

OUT, LAYOUT = sys.argv[1], sys.argv[2]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'lumar-rose-mine-' + LAYOUT
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 20, 14

# chambers (ellipses: cx, cr, rx, ry) and passages (rects: c0, r0, c1, r1), the ladder up at the back
LAYOUTS = {
    'a': dict(ell=[(9.0, 7.4, 5.8, 3.6), (14.8, 8.8, 3.6, 2.8), (4.4, 5.2, 2.8, 2.0), (10.6, 4.2, 2.6, 1.4), (6.0, 10.2, 2.6, 1.4)],
              rect=[], ladder=(10, 3), seed=401),
    'b': dict(ell=[(5.6, 7.2, 4.4, 4.6), (14.6, 7.6, 4.4, 4.4)], rect=[(8, 6, 12, 9)], ladder=(5, 3), seed=402),
    'c': dict(ell=[(4.4, 9.0, 3.6, 3.0), (10.0, 5.8, 4.2, 3.4), (16.0, 9.4, 3.4, 3.2)], rect=[(6, 7, 8, 10), (12, 7, 14, 10)],
              ladder=(10, 3), seed=403),
}
L = LAYOUTS[LAYOUT]
k = Kit(COLS, ROWS, margin_top=1.2, margin_bottom=0.5, seed=L['seed'])


def open_cell(c, r):
    if r < 3 or r > ROWS - 2 or c < 1 or c > COLS - 2:
        return (c, r) == L['ladder']
    x, y = c + 0.5, r + 0.5
    return any(((x - cx) / rx) ** 2 + ((y - cr) / ry) ** 2 <= 1.0 for cx, cr, rx, ry in L['ell']) or \
        any(c0 <= c < c1 and r0 <= r < r1 for c0, r0, c1, r1 in L['rect'])


walk = {(c, r) for r in range(ROWS) for c in range(COLS) if open_cell(c, r)}
lx, lr = L['ladder']
walk |= {(lx, lr), (lx, lr + 1)}

# ---- floor ---------------------------------------------------------------------------------------------
k.box(0, 2.0, -0.3, COLS, ROWS, -0.02, ('#2a1e1c', 0.3), 'ground')
for (c, r) in walk:
    for _ in range(3):
        x, y = c + k.rng.uniform(0, 1), r + k.rng.uniform(0, 1)
        s = k.rng.uniform(0.08, 0.2)
        k.rock(x, y, -0.03, s, s * k.rng.uniform(0.6, 0.9), k.rng.uniform(0.025, 0.045),
               (shade('#4a3a3a', k.rng.uniform(0.82, 1.06)), 0.22), part='floor', segs=8, jitter=0.25)

# ---- rock: a face along the back, boulders round every edge, solid mass beyond ----------------------------------
V.rock_wall(k, 0.0, COLS, 2.4, 2.9, gaps=[(lx - 0.1, lx + 1.1, 2.3)])
V.stalactites(k, 0.4, COLS - 0.4, 2.5, 2.9, n=22)
south = {c: max([r for (cc, r) in walk if abs(cc - c) <= 1] or [0]) for c in range(COLS)}
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) in walk or r < 2:
            continue
        k.solid(c, r, c + 1, r + 1)
        near = [(c + dx, r + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (c + dx, r + dy) in walk]
        if not near:                                               # solid rock; low in front of the cave so it hides nobody
            k.box(c, r, 0.0, c + 1, r + 1, 0.35 if r > south[c] else 1.6, '#0c0808', 'rock_mass')
            continue
        front = all(nr < r for (_, nr) in near)                    # the cave's front edge: keep it low
        for _ in range(2):
            rad = k.rng.uniform(0.32, 0.5)
            h = k.rng.uniform(0.25, 0.45) if front else k.rng.uniform(0.6, 1.3)
            k.rock(c + k.rng.uniform(0.25, 0.75), r + k.rng.uniform(0.25, 0.75), rad * 0.4, rad, rad * 0.8, h,
                   (shade(V.ROCK, k.rng.uniform(0.62, 1.0)), 0.2))
k.solid(0, 0, COLS, 2)

# ---- the ladder up to the hall ----------------------------------------------------------------------------
k.box(lx + 0.05, 1.6, 0.0, lx + 0.95, 2.4, 2.4, '#040303', 'shaft')
for dx in (0.28, 0.72):
    k.box(lx + dx - 0.03, 2.35, 0.0, lx + dx + 0.03, 2.45, 2.6, (A.WOOD_D, 0.18), 'ladder')
for z in (0.3, 0.7, 1.1, 1.5, 1.9, 2.3):
    k.box(lx + 0.25, 2.36, z, lx + 0.75, 2.44, z + 0.05, (A.WOOD, 0.18), 'rung')

# ---- old workings: props, rails, a cart, lamps, mushrooms ---------------------------------------------------
edge = sorted(c for c in walk if c[1] >= 4 and any((c[0] + dx, c[1] + dy) not in walk for dx, dy in ((1, 0), (-1, 0))))
k.rng.shuffle(edge)
props = 0
for (c, r) in edge:
    if props >= 3 or abs(c - lx) < 3:
        continue
    side = 1 if (c + 1, r) not in walk else -1
    V.timber_support(k, c + 0.5, r + 0.5, c + 0.5 + side * 0.9)
    props += 1
rail_row = max(r for (c, r) in walk) - 1
xs = sorted(c for (c, r) in walk if r == rail_row)
if len(xs) > 6:
    for c in xs[1:-1]:
        k.box(c + 0.1, rail_row + 0.3, 0.0, c + 0.9, rail_row + 0.4, 0.04, (A.WOOD_DD, 0.15), 'sleeper')
    for dz in (0.35, 0.65):
        k.box(xs[1] + 0.1, rail_row + dz - 0.02, 0.04, xs[-1] + 0.9, rail_row + dz + 0.02, 0.08, '#4a4048', 'rail')
lamps = [cell for cell in edge if cell[1] >= 4][3:7]                    # miners' lamps on posts at the cave's edges
for (c, r) in lamps:
    side = 0.32 if (c + 1, r) not in walk else -0.32
    x, y = c + 0.5 + side, r + 0.5
    k.box(x - 0.05, y - 0.05, 0.0, x + 0.05, y + 0.05, 1.5, (A.WOOD_D, 0.18), 'lamp_post')
    k.cyl(x, y + 0.12, 1.2, 1.46, 0.09, ('#5a4a30', 0.15), 'lamp', verts=8)
    k.cyl(x, y + 0.12, 1.23, 1.43, 0.06, '#c08840', 'lamp_glass', emit=('#ffc070', 0.95), verts=8)
    k.point_light(x, y + 0.4, 1.4, '#ffb070', 85, radius=0.2, group='flicker')
    k.solid(c, r, c + 1, r + 1)
k.point_light(COLS / 2, ROWS / 2, 3.0, '#a08070', 40, radius=2.0)                                  # a little fill
k.point_light(lx + 0.5, 3.4, 1.6, '#c0a090', 30, radius=0.4)
mush = [cell for cell in edge if cell[1] > 5][:3]
for i, (c, r) in enumerate(mush):
    V.glow_mushrooms(k, c + 0.5, r + 0.5, col=('#f070b0', '#7090ff', '#b070ff')[i % 3])

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.7}}, light_samples=112, world_light=('#241c24', 0.5))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Rose Mine', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'cave',
          'spawns': {'player': [lx, lr + 1]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'mine': {'layout': LAYOUT, 'up': [lx, lr]}})
w['interactions'] = [{'x': lx, 'y': lr, 'type': 'mine_up', 'label': 'LADDER UP', 'prompt': 'PRESS E TO CLIMB'}]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID)
print('mine floor', LAYOUT, len(walk), 'open cells')
