"""The elves' canoe on the Silverrun (js/canoe.js) — rendered like a scene (the scenes' 45° camera, daylight, the toy
finish) with no floor: 16 headings, one sprite a 3 × 3-tile cell.

  BVENV/bin/python tools/bridge-art/canoe_sprites.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/canoe

Layout: row 0 the whole canoe at 16 headings (heading i → angle i/16 of a turn, 0 = bow to +x, turning toward +row);
row 1 only what of it is in front of the paddler's seat (the near gunwale, the near stem), so js/canoe.js draws the
hull, you sat in it, then this over your legs. The canoe's middle is at (1.5, 1.85) in its cell (js/canoe.js says the
same). Birch bark, cream with dark marks, a gunwale of dark wood, pale ribs inside, the stems swept up and carved with a
gold leaf at each tip; the waterline at z = 0.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from scenekit import Kit, shade  # noqa: E402

OUT = sys.argv[1]
CELL = 3
CX, CY = 1.5, 1.85
HEADINGS = 16
k = Kit(HEADINGS * CELL, 2 * CELL, margin_top=0.4, margin_bottom=0.1, seed=29)
rng = k.rng

BARK = '#e4dcc4'
BARK_D = '#2e2620'
GUNWALE = '#5a3e26'
RIB = '#c8a878'
GOLD = '#d0a040'
L, BEAM = 2.1, 0.3


def frame(cx, cr, th):
    c, s = math.cos(th), math.sin(th)
    return lambda u, v, z: (cx + u * c - v * s, cr + u * s + v * c, z)


def half(t):                     # the half-beam along the keel, t 0 (stern) … 1 (bow)
    return BEAM * math.sin(math.pi * t) ** 0.7


def sheer(t):                    # the gunwale's height: low amidships, swept up at the ends
    return 0.16 + 0.32 * (abs(t - 0.5) * 2) ** 3


def canoe(cx, cr, th, front_only=False):
    P = frame(cx, cr, th)
    seat_row = cr
    n = 18
    if not front_only:
        rings = []
        for i in range(n + 1):
            t = i / n
            u = -L / 2 + t * L
            w, top = max(0.012, half(t)), sheer(t)
            rings.append([P(u, -w, top), P(u, -w * 0.97, top * 0.4), P(u, -w * 0.7, -0.1), P(u, 0, -0.13),
                          P(u, w * 0.7, -0.1), P(u, w * 0.97, top * 0.4), P(u, w, top)])
        k.loft(rings, (BARK, 0.3), 'hull', closed=False)
        # the inside, a shade darker, and pale ribs across it
        rin = []
        for i in range(1, n):
            t = i / n
            u = -L / 2 + t * L
            w, top = max(0.012, half(t) * 0.9), sheer(t) - 0.02
            rin.append([P(u, -w, top), P(u, -w * 0.7, -0.06), P(u, 0, -0.09), P(u, w * 0.7, -0.06), P(u, w, top)])
        k.loft(rin, (shade(BARK, 0.78), 0.3), 'hull_inside', closed=False)
        for i in range(2, n - 1, 2):
            t = i / n
            u = -L / 2 + t * L
            w = half(t) * 0.88
            pts = [P(u, -w, sheer(t) - 0.03), P(u, -w * 0.7, -0.05), P(u, 0, -0.08), P(u, w * 0.7, -0.05), P(u, w, sheer(t) - 0.03)]
            for a, b in zip(pts, pts[1:]):
                k.tube(a, b, 0.012, (RIB, 0.25), 'rib', verts=4)
        # bark marks along the sides (the birch's dark flecks)
        for _ in range(26):
            t = rng.uniform(0.1, 0.9)
            u = -L / 2 + t * L
            side = rng.choice((-1, 1))
            w = half(t) * 1.01
            z = rng.uniform(0.0, sheer(t) * 0.8)
            a, b = P(u - 0.03, side * w, z), P(u + 0.03, side * w, z)
            k.tube(a, b, 0.012, (BARK_D, 0.3), 'bark_mark', verts=4)
        # the thwart and the seat
        for (uu, zz, part) in ((-0.15, sheer(0.43) - 0.06, 'seat'), (0.55, sheer(0.76) - 0.04, 'thwart')):
            t = (uu + L / 2) / L
            w = half(t) * 0.92
            k.tube(P(uu, -w, zz), P(uu, w, zz), 0.03, (GUNWALE, 0.25), part, verts=5)
        # a bundle stowed forward: a roll of cloth, a basket
        k.blob(*P(0.6, 0.0, 0.0), 0.12, 0.09, 0.07, ('#2a5a2e', 0.3), 'bundle', segs=8)
    # the gunwales and the stems: all of it (the hull row), or only what's in front of the seat (the front row)
    for side in (-1, 1):
        pts = []
        for i in range(n + 1):
            t = i / n
            u = -L / 2 + t * L
            pts.append(P(u, side * half(t), sheer(t) + 0.015))
        for a, b in zip(pts, pts[1:]):
            if front_only and (a[1] + b[1]) / 2 <= seat_row + 0.02:
                continue
            k.tube(a, b, 0.028, (GUNWALE, 0.25), 'gunwale', verts=5)
    for end in (-1, 1):                                                       # the stems swept up, a gold leaf at the tip
        u = end * L / 2
        a, b = P(u - end * 0.05, 0, sheer(1.0) - 0.05), P(u + end * 0.06, 0, sheer(1.0) + 0.14)
        if front_only and (a[1] + b[1]) / 2 <= seat_row + 0.02:
            continue
        k.tube(a, b, 0.035, (GUNWALE, 0.25), 'stem', verts=6)
        k.blob(*b, 0.05, 0.03, 0.07, (GOLD, 0.25), 'stem_leaf', segs=6)


for i in range(HEADINGS):
    th = i / HEADINGS * math.tau
    canoe(i * CELL + CX, CY, th)
    canoe(i * CELL + CX, CELL + CY, th, front_only=True)

k.sun((0.62, 0.42, -0.62), '#fff4dc', 3.2, angle=3.0)
k.render(OUT, light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 64)), world_light=('#a8c0d0', 0.9))
print('canoe sheet done')
