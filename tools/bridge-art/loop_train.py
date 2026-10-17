"""The Loop's train — Arcadia's sky train round the Mid-Levels, as a sprite (js/transit.js).

  BVENV/bin/python tools/bridge-art/loop_train.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/loop-train

Rendered like a scene (the scenes' 45° camera at 32 px a tile, real light, the toy finish) with no floor, so full.png is
the train on a transparent ground: three pearl-white cars running east, nose to tail, a cyan line along each, the windows
lit warm with people inside, pods on the roof, dark bogies and a glow under her. js/transit.js draws her into the Loop's
stations (a world's `loop.track`, depth-tested at the rails' row) and, at half size, over the District street on her
viaduct (`skyline.loop`). Her rails stand at row 0.5, z 0.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from scenekit import Kit, shade  # noqa: E402
import assets_cyber as Y          # noqa: E402

OUT = sys.argv[1]
CARS, CL, GAP = 3, 4.0, 0.18                       # cars, a car's length, the gangway between them
L = CARS * CL + (CARS - 1) * GAP
k = Kit(int(math.ceil(L)) + 1, 1, margin_top=1.8, margin_bottom=0.15, margin_x=0.2, seed=91)
rng = random.Random(91)
R0, R1 = 0.12, 0.88                                # her sides (rows)
Z0, Z1 = 0.16, 1.18                                # the body's foot and roof
PEARL, PEARL_D, TRIM = '#e8e6ee', '#b8b4c8', '#3a3a52'


def car(x0, nose=None):
    x1 = x0 + CL
    a, b = x0 + (0.55 if nose == 'w' else 0.0), x1 - (0.55 if nose == 'e' else 0.0)
    k.box(a, R0, Z0, b, R1, Z1, (PEARL, 0.05), 'car_body', bevel=0.08)
    k.box(a, R0 + 0.06, Z1 - 0.02, b, R1 - 0.06, Z1 + 0.08, (PEARL_D, 0.05), 'car_roof', bevel=0.04)
    for (end, sgn) in (('w', -1), ('e', 1)):          # the noses: a rounded wedge, a dark windscreen, a lamp
        if nose != end:
            continue
        xs = a if end == 'w' else b
        rings = []
        for i in range(7):
            t = i / 6.0
            x = xs + sgn * 0.55 * t
            w = (R1 - R0) / 2 * math.cos(t * math.pi / 2.2)
            zt = Z0 + (Z1 - Z0) * (1 - t * t * 0.75)
            rings.append([(x, 0.5 - w, Z0 + 0.02), (x, 0.5 + w, Z0 + 0.02), (x, 0.5 + w, zt), (x, 0.5 - w, zt)])
        k.loft(rings, (PEARL, 0.05), 'car_nose', closed=True)
        k.tube((xs + sgn * 0.12, R1 - 0.02, Z1 - 0.12), (xs + sgn * 0.42, R1 - 0.12, Z0 + 0.62), 0.07, '#0c1428', 'car_screen',
               emit=('#1a3a5a', 0.4), verts=6)
        k.sphere(xs + sgn * 0.5, R1 - 0.12, Z0 + 0.3, 0.05, 0.04, '#fff6e0', 'car_lamp', emit=('#fff2d0', 1.0), segs=8)
        k.point_light(xs + sgn * 0.9, 0.9, 0.4, '#fff0d0', 6, radius=0.1, group='flicker')
    # the windows: a band of dark glass, lit warm, with people in it — the side toward the camera
    k.box(a + 0.15, R1, Z0 + 0.42, b - 0.15, R1 + 0.012, Z1 - 0.14, '#140c18', 'car_glass')
    n = int((b - a - 0.3) / 0.62)
    for i in range(n):
        wx = a + 0.2 + i * 0.62
        k.box(wx, R1 + 0.012, Z0 + 0.46, wx + 0.52, R1 + 0.02, Z1 - 0.18, '#3a2410', 'car_window', emit=('#ffd890', 0.55))
        if rng.random() < 0.55:                           # someone at the window: head and shoulders
            px = wx + rng.uniform(0.12, 0.4)
            k.box(px - 0.08, R1 + 0.02, Z0 + 0.46, px + 0.08, R1 + 0.024, Z0 + 0.66, rng.choice(('#2a1c30', '#1c2a3a', '#3a1c24')), 'car_rider')
            k.box(px - 0.05, R1 + 0.02, Z0 + 0.66, px + 0.05, R1 + 0.026, Z0 + 0.78, rng.choice(('#e8b896', '#a87050', '#5a3a28', '#f0c8a8')), 'car_rider')
    k.box(a + 0.05, R1 + 0.004, Z0 + 0.3, b - 0.05, R1 + 0.016, Z0 + 0.36, shade(Y.CYAN, 0.4), 'car_stripe', emit=(Y.CYAN, 0.85))
    k.box(a + 0.05, R1 + 0.004, Z1 - 0.1, b - 0.05, R1 + 0.014, Z1 - 0.07, shade(Y.PINK, 0.4), 'car_stripe', emit=(Y.PINK, 0.6))
    mid = (a + b) / 2                                     # the doors: two sliding leaves, outlined
    for dx in (-0.9, 0.9):
        k.box(mid + dx - 0.3, R1 + 0.006, Z0 + 0.04, mid + dx + 0.3, R1 + 0.018, Z1 - 0.12, (PEARL_D, 0.05), 'car_door')
        k.box(mid + dx - 0.01, R1 + 0.018, Z0 + 0.04, mid + dx + 0.01, R1 + 0.022, Z1 - 0.12, TRIM, 'car_door_seam')
        k.box(mid + dx - 0.24, R1 + 0.018, Z0 + 0.5, mid + dx + 0.24, R1 + 0.024, Z1 - 0.2, '#3a2410', 'car_door_glass', emit=('#ffd890', 0.45))
    for x in (a + 0.8, b - 0.8):                          # bogies and their glow, a skirt
        k.box(x - 0.45, R0 + 0.1, 0.0, x + 0.45, R1 - 0.1, Z0 + 0.04, ('#1a1a24', 0.08), 'car_bogie')
        k.cyl_y(x, R1 - 0.12, R1 - 0.08, 0.1, 0.09, 0.09, '#2a2a34', 'car_wheel', verts=10)
        k.box(x - 0.35, R1 - 0.1, 0.02, x + 0.35, R1 - 0.08, 0.05, shade(Y.CYAN, 0.4), 'car_underglow', emit=(Y.CYAN, 0.9))
    k.box(a + 0.1, R1 - 0.02, Z0 - 0.02, b - 0.1, R1 + 0.004, Z0 + 0.08, ('#c8c4d4', 0.05), 'car_skirt')
    for x in (a + 1.2, mid, b - 1.2):                     # roof pods: the pickups, a vent, a light
        k.box(x - 0.3, 0.32, Z1 + 0.06, x + 0.3, 0.68, Z1 + 0.2, ('#9a96aa', 0.06), 'car_pod', bevel=0.03)
    k.sphere(mid, 0.5, Z1 + 0.24, 0.04, 0.03, Y.RED, 'car_beacon', emit=(Y.RED, 1.0), segs=6)
    k.solid(a, R0, b, R1)


for c in range(CARS):
    x0 = 0.5 + c * (CL + GAP)
    car(x0, 'w' if c == 0 else 'e' if c == CARS - 1 else None)
    if c:                                                  # the gangway's bellows
        k.box(x0 - GAP - 0.02, 0.25, Z0 + 0.1, x0 + 0.02, 0.75, Z1 - 0.06, ('#2a2834', 0.1), 'car_gangway')

k.area_light(L / 2, -2.0, 6.0, '#b8a8f0', 420, 18.0, rot=(math.radians(-30), 0, 0))       # the city's violet sky
k.area_light(L / 2, 6.0, 3.0, '#e8ecff', 380, 20.0, rot=(math.radians(60), 0, 0))         # the platform lights on her side
k.area_light(L / 2, 4.0, -1.0, '#ff70b0', 90, 16.0, rot=(math.radians(140), 0, 0))         # neon from below
k.point_light(L / 2, 2.5, 2.5, '#80e0e8', 30, radius=1.0)
k.render(OUT, light_states={'full': {'flicker': 1.0}}, light_samples=96, world_light=('#241a40', 0.6))
print('loop train done')
