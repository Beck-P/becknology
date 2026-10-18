"""The Spires' backdrop (js/skyline.js mode 'spires'): the white-and-gold towers standing out of the smog sea (bpy).

  BVENV/bin/python tools/bridge-art/spires_backdrop.py RENDER_DIR
  python3 tools/bridge-art/cine_post.py RENDER_DIR apps/bridge/assets/backdrops/spires

One layer, `peaks`, at the skyline's 45 degrees, with its own cine.json in backdrops/spires (js/skyline.js `drawSpires`
loads it; `BridgeSkyline.layers().peaks`). Reads assets_city and cinekit, never changes them.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from cinekit import CineKit          # noqa: E402
from assets_city import shade        # noqa: E402

OUT = sys.argv[1]

STONE = ['#d8d2c6', '#e4ded2', '#cfc8ba', '#ddd6ca']
GOLD = '#e8c870'
PASTEL = ['#f4b8d8', '#b8e4f0', '#d8c8f8', '#f8e0a8', '#b8f0d8']


def spire(k, x0, x1, r_front, h, depth=1.0, rng=None, crown=None):
    """A white-stone tower of the Spires: tiers tapering as they rise, gold bands at each set-back, tall pastel window
    strips, a crown (a gold needle, a ring of light, a garden on top, a dome). Its foot is lost in the smog (drawn by
    js/skyline.js), so it's built from z = 0 up. Returns the roof height."""
    rng = rng or k.rng
    wall = rng.choice(STONE)
    glow = rng.choice(PASTEL)
    crown = crown or rng.choice(('needle', 'needle', 'ring', 'garden', 'dome'))
    tiers = rng.choice((3, 4, 4, 5))
    z, xa, xb = 0.0, x0, x1
    rects = {}
    for t in range(tiers):
        th = h * (0.42 if t == 0 else 0.58 / (tiers - 1))
        rf = r_front - t * 0.18
        k.box(xa, rf - depth, z, xb, rf, z + th, (shade(wall, rng.uniform(0.94, 1.04)), 0.05), 'spire_stone')
        n = max(1, int((xb - xa - 0.2) / 0.36))
        ox = xa + (xb - xa - n * 0.36) / 2
        for j in range(n):                                   # tall slit windows, lit in a pastel up the stone
            if rng.random() < 0.35:
                continue
            c = glow if rng.random() < 0.7 else '#fff0d0'
            z0 = z + 0.25 + rng.uniform(0, 0.4)
            rects.setdefault(c, []).append((ox + j * 0.36 + 0.11, rf, z0, ox + j * 0.36 + 0.21, rf + 0.02, z0 + th * rng.uniform(0.35, 0.8)))
        fins = [(ox + j * 0.36 - 0.025, rf, z, ox + j * 0.36 + 0.025, rf + 0.08, z + th) for j in range(0, n + 1, 2)]
        k.boxes(fins, shade(wall, 1.08), 'spire_fin')
        k.box(xa - 0.06, rf - depth - 0.06, z + th - 0.08, xb + 0.06, rf + 0.06, z + th + 0.04, (GOLD, 0.2), 'spire_gold')
        z += th
        if t < tiers - 1:
            cut = (xb - xa) * rng.uniform(0.08, 0.16)
            xa, xb = xa + cut, xb - cut
    for c, rr in rects.items():
        k.boxes(rr, shade(c, 0.55), 'spire_win', emit=(c, 0.8))
    cx, rc = (xa + xb) / 2, r_front - depth / 2 - tiers * 0.18
    w = xb - xa
    if crown == 'needle':
        k.cone(cx, rc, z, z + rng.uniform(2.5, 5.5), w * 0.3, 0.015, (GOLD, 0.15), 'spire_needle', verts=6)
        k.sphere(cx, rc, z + 0.3, 0.1, 0.1, '#fff4d0', 'spire_beacon', emit=('#fff4d0', 1.0), segs=6)
    elif crown == 'ring':
        R = w * 0.55
        pts = [(cx + math.cos(i * math.pi / 10) * R, rc + math.sin(i * math.pi / 10) * R * 0.5, z + 0.8) for i in range(21)]
        for a, b in zip(pts, pts[1:]):
            k.tube(a, b, 0.05, shade(glow, 0.5), 'spire_ring', emit=(glow, 0.9), verts=4)
        k.cone(cx, rc, z, z + 1.4, w * 0.2, 0.02, (GOLD, 0.15), 'spire_needle', verts=6)
    elif crown == 'garden':                                  # a roof garden: dark crowns of trees over the parapet
        for i in range(max(2, int(w / 0.5))):
            k.blob(xa + 0.25 + i * (w - 0.5) / max(1, int(w / 0.5) - 1), rc, z + 0.3, 0.3, 0.25, 0.3, '#2e4a3a', 'spire_trees', segs=8)
        k.box(xa, rc - 0.4, z, xb, rc + 0.4, z + 0.12, (GOLD, 0.2), 'spire_gold', emit=('#f0c860', 0.3))
    else:
        k.sphere(cx, rc, z, w * 0.45, w * 0.4, (shade(wall, 1.05), 0.05), 'spire_dome', segs=14)
        k.cone(cx, rc, z + w * 0.38, z + w * 0.38 + 1.2, 0.08, 0.01, (GOLD, 0.15), 'spire_needle', verts=6)
    return z


def peaks():
    """The Spires' neighbours: white-and-gold towers whose feet are lost in the smog."""
    W = 130
    k = CineKit((0, W, -3, 1.0, 0, 30), elev=45, ppt=9, seed=61)
    rng = random.Random(61)
    x = 0.5
    while x < W - 2:
        w = rng.uniform(2.2, 4.5)
        spire(k, x, x + w, rng.uniform(-1.2, 0.4), rng.choice((rng.uniform(8, 14), rng.uniform(12, 20), rng.uniform(18, 26))), rng=rng)
        x += w + rng.uniform(0.6, 3.5)
    k.sun((0.25, -0.45, -0.85), '#e8ecff', 1.6)              # starlight and the moon, cool from above
    k.sun((0.1, -0.7, 0.5), '#ffa8d0', 0.3)                # the city's glow up through the smog
    k.render(os.path.join(OUT, 'peaks'), light_states={'full': {}}, light_samples=32, world_light=('#4a5070', 0.6))


peaks()
print('peaks rendered')
