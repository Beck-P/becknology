"""The sloop you sail between Lumar's islands, a fisherman's dory, and the things out on the water — rendered like a
scene (the scenes' 45° camera, the islands' moonlight, scene_post's dithered shading) with no floor, one sprite a
5 × 5-tile cell.

  BVENV/bin/python tools/bridge-art/sloop_sprites.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/sloop

Layout (cells of 5 × 5 tiles, 8 to a row; the boat's centre at (2.5, 3.0) in its cell - js/sloop.js `cell()` says the same):
  rows 0-3   the sloop at 32 headings (heading i → angle i/32 of a turn, 0 = bow to +x, then turning toward +row)
  row 4      the dory at 8 headings
  row 5      rock_a, rock_b, rock_c, reef, buoy_red, buoy_green, crate, barrel

The sloop is the hull, deck, cockpit, mast step and stern lantern only: js/sloop.js draws the mast and rigging (they
heel with the wind), the boom and sails (they swing and luff), the tiller and you at it. She's built to her old
lines (2.6 tiles long) and grown by S to 3.2 as a whole (`frame`); js/shipkit.js LINES and js/sloop.js RIGS take the
same S. The water line is z = 0 and the sheet has a water
level there, so shore.png marks what's under the surface and the game cuts it off.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from scenekit import Kit, shade  # noqa: E402

OUT = sys.argv[1]
CELL = 5
CX, CY = 2.5, 3.0                                   # the boat's centre in her cell
S = 3.2 / 2.6                                       # the sloop, grown (the dory and the things on the water stay as they were)
HEADINGS = 32
k = Kit(8 * CELL, 6 * CELL, margin_top=0.6, margin_bottom=0.2, seed=17)
k.water_z = 0.0

PAINT = '#cfc3a6'      # cream topsides, so she reads on the night sea
STRIPE = '#2a6a58'     # and a Lumar-teal stripe under the gilded wale
PAINT_D = '#1e3c32'
WALE = '#a08040'
DECK = '#9a6a38'
DECK_D = '#6a4626'
WOOD_D = '#3a2410'
SPAR = '#4a3018'
GLASS = '#ffe080'


def frame(cx, cr, th, g=1.0):
    """Boat-local (u along the keel, bow +; v to starboard; z up) → the sheet's (x, row, z), grown by g."""
    c, s = math.cos(th) * g, math.sin(th) * g
    return lambda u, v, z: (cx + u * c - v * s, cr + u * s + v * c, z * g)


def hull(P, L, half, sheer, bottom=0.0, n=16, paint=PAINT, inside=DECK_D, part='hull'):
    """An open shell from the transom (u = -L/2) to the stem (u = +L/2): half(t), sheer(t) for t in 0..1 along it."""
    rings = []
    for i in range(n + 1):
        t = i / n
        u = -L / 2 + t * L
        w, top = max(0.015, half(t)), sheer(t)
        ring = [P(u, -w, top), P(u, -w * 0.96, top * 0.55), P(u, -w * 0.72, bottom + 0.05), P(u, 0, bottom),
                P(u, w * 0.72, bottom + 0.05), P(u, w * 0.96, top * 0.55), P(u, w, top)]
        rings.append(ring)
    k.loft(rings, (paint, 0.06), part)
    # the inside, a shade in from the planking, so you see down into the boat
    inner = []
    for i in range(n + 1):
        t = i / n
        u = -L / 2 + t * L
        w, top = max(0.012, half(t) * 0.9), sheer(t) - 0.02
        inner.append([P(u, -w, top), P(u, -w * 0.7, bottom + 0.1), P(u, 0, bottom + 0.06), P(u, w * 0.7, bottom + 0.1), P(u, w, top)])
    k.loft(inner, (inside, 0.08), part + '_in')
    return rings


def deck_poly(P, L, half, sheer, t0, t1, z_off=0.0, inset=0.0, n=8, albedo=(DECK, 0.06), part='deck'):
    """A deck between t0 and t1 along the boat, edge to edge (fanned from its middle)."""
    pts = []
    for i in range(n + 1):
        t = t0 + (t1 - t0) * i / n
        pts.append(P(-L / 2 + t * L, -(half(t) - inset), sheer(t) + z_off))
    for i in range(n, -1, -1):
        t = t0 + (t1 - t0) * i / n
        pts.append(P(-L / 2 + t * L, half(t) - inset, sheer(t) + z_off))
    mid = P(-L / 2 + (t0 + t1) / 2 * L, 0, sheer((t0 + t1) / 2) + z_off)
    k.poly([mid] + pts + [pts[0]], albedo, part)


def wale(P, L, half, sheer, n=16):
    """The gilded rubbing strake along the sheer, both sides."""
    for s in (-1, 1):
        prev = None
        for i in range(n + 1):
            t = i / n
            p = P(-L / 2 + t * L, s * (half(t) + 0.012), sheer(t) - 0.035)
            if prev:
                k.tube(prev, p, 0.018, (WALE, 0.05), 'wale', verts=5, smooth=False)
            prev = p


def stripe(P, L, half, sheer, n=16):
    """A band of teal along the topsides just under the sheer, both sides."""
    for sgn in (-1, 1):
        pts_hi = [P(-L / 2 + i / n * L, sgn * (half(i / n) * 1.003 + 0.004), sheer(i / n) - 0.05) for i in range(n + 1)]
        pts_lo = [P(-L / 2 + i / n * L, sgn * (half(i / n) * 0.985 + 0.004), sheer(i / n) - 0.12) for i in range(n + 1)]
        k.loft([[a, b] for a, b in zip(pts_hi, pts_lo)], (STRIPE, 0.05), 'stripe')


def sloop(cx, cr, th):
    P = frame(cx, cr, th, S)
    L = 2.6
    half = lambda t: 0.5 * math.sin(math.pi * min(1.0, 0.22 + 0.86 * t)) ** 0.7 if t < 0.999 else 0.015
    sheer = lambda t: 0.38 + 0.03 * (1 - t) + 0.13 * max(0.0, t - 0.55) ** 2 / 0.2
    hull(P, L, half, sheer)
    stripe(P, L, half, sheer)
    wale(P, L, half, sheer)
    deck_poly(P, L, half, sheer, 0.62, 0.995, z_off=-0.01)                                  # the foredeck
    deck_poly(P, L, half, sheer, 0.0, 0.07, z_off=-0.01)                                    # a strip of aft deck
    for s in (-1, 1):                                                                        # side decks
        pts = []
        for i in range(9):
            t = 0.07 + 0.55 * i / 8
            pts.append(P(-L / 2 + t * L, s * half(t), sheer(t) - 0.01))
        for i in range(8, -1, -1):
            t = 0.07 + 0.55 * i / 8
            pts.append(P(-L / 2 + t * L, s * (half(t) - 0.12), sheer(t) - 0.01))
        k.poly(pts + [pts[0]], (DECK, 0.06), 'deck')
    deck_poly(P, L, half, sheer, 0.08, 0.6, z_off=-0.2, inset=0.13, albedo=(DECK_D, 0.08), part='sole')  # the cockpit sole
    for s in (-1, 1):                                                                        # the coaming round the cockpit
        a, b = 0.08, 0.6
        k.tube(P(-L / 2 + a * L, s * (half(a) - 0.12), sheer(a) + 0.03), P(-L / 2 + b * L, s * (half(b) - 0.12), sheer(b) + 0.03),
               0.022, (WOOD_D, 0.06), 'coaming', verts=5, smooth=False)
        k.tube(P(-L / 2 + 0.1 * L, s * 0.22, 0.2), P(-L / 2 + 0.55 * L, s * 0.25, 0.2), 0.05, (DECK, 0.06), 'bench', verts=6,
               smooth=False)                                                                 # benches along the sides
    k.tube(P(-L / 2 + 0.6 * L, -half(0.6) + 0.12, sheer(0.6) + 0.03), P(-L / 2 + 0.6 * L, half(0.6) - 0.12, sheer(0.6) + 0.03),
           0.022, (WOOD_D, 0.06), 'coaming', verts=5, smooth=False)
    # the mast step, a brass collar on the foredeck (the mast itself heels with the wind, so the game draws it)
    mu = -L / 2 + 0.66 * L
    k.cyl(*P(mu, 0, 0)[:2], (sheer(0.66) - 0.02) * S, (sheer(0.66) + 0.05) * S, 0.06 * S, (WALE, 0.05), 'mast_step', verts=10)
    # the rudder head on the transom and the stern lantern on its post (port quarter)
    ra, rb = P(-L / 2 - 0.05, 0, 0), P(-L / 2 + 0.03, 0, 0)
    k.bar(ra[0], ra[1], rb[0], rb[1], 0.1 * S, 0.42 * S, 0.07 * S, (WOOD_D, 0.06), 'rudder')
    base = P(-L / 2 + 0.14, -0.36, sheer(0.05))
    head = P(-L / 2 + 0.14, -0.36, sheer(0.05) + 0.42)
    k.tube(base, head, 0.018, (WOOD_D, 0.06), 'post', verts=5, smooth=False)
    k.blob(head[0], head[1], head[2] + 0.06, 0.05, 0.05, 0.07, '#3a2a14', 'lantern_glass', emit=(GLASS, 0.9), segs=8)
    k.cone(head[0], head[1], head[2] + 0.12, head[2] + 0.18, 0.06, 0.01, (WOOD_D, 0.06), 'lantern_cap', verts=6)
    k.point_light(head[0], head[1] + 0.05, head[2] + 0.06, '#ffc070', 7, radius=0.05)


def dory(cx, cr, th):
    P = frame(cx, cr, th)
    L = 1.8
    half = lambda t: 0.36 * math.sin(math.pi * (0.04 + 0.92 * t)) ** 0.65
    sheer = lambda t: 0.24 + 0.1 * (2 * t - 1) ** 2
    hull(P, L, half, sheer, paint='#6a3a22', inside='#4a2a14', part='dory')
    wale(P, L, half, sheer, n=12)
    for t in (0.35, 0.62):
        k.tube(P(-L / 2 + t * L, -half(t) * 0.88, 0.17), P(-L / 2 + t * L, half(t) * 0.88, 0.17), 0.04, (DECK, 0.06), 'thwart',
               verts=6, smooth=False)
    # the fisherman on the after thwart, in oilskins and a sou'wester, a line over the side
    fu = -L / 2 + 0.35 * L
    k.blob(*P(fu, 0, 0.36), 0.16, 0.13, 0.2, ('#c8a030', 0.08), 'oilskin', segs=10)
    k.blob(*P(fu + 0.02, 0, 0.62), 0.085, 0.08, 0.09, ('#d8a888', 0.06), 'face', segs=8)
    hx, hr, hz = P(fu, 0, 0.7)
    k.cone(hx, hr, hz - 0.02, hz + 0.08, 0.16, 0.06, ('#b89020', 0.08), 'souwester', verts=10)
    k.tube(P(fu + 0.1, 0.12, 0.42), P(fu + 0.45, 0.62, 0.7), 0.012, (WOOD_D, 0.06), 'rod', verts=4, smooth=False)
    # a lantern on a pole at the bow
    lb = P(L / 2 - 0.22, 0, 0.3)
    lt = P(L / 2 - 0.22, 0, 0.95)
    k.tube(lb, lt, 0.016, (WOOD_D, 0.06), 'pole', verts=5, smooth=False)
    k.blob(lt[0], lt[1], lt[2] + 0.04, 0.05, 0.05, 0.065, '#3a2a14', 'lantern_glass', emit=(GLASS, 0.9), segs=8)
    k.point_light(lt[0], lt[1] + 0.05, lt[2], '#ffc070', 6, radius=0.05)


def statics(cx, cr, kind):
    if kind.startswith('rock'):
        i = 'abc'.index(kind[-1])
        sz = (0.55, 0.75, 0.42)[i]
        k.rock(cx, cr, -0.05, sz, sz * 0.8, sz * (1.1, 0.9, 1.4)[i], ('#5a6866', 0.2), part='searock', seed=40 + i)
        k.rock(cx + sz * 0.7, cr + 0.25, -0.1, sz * 0.4, sz * 0.35, sz * 0.5, ('#4a5856', 0.2), part='searock', seed=50 + i)
        for j in range(5):                                                                      # weed and limpets at the line
            a = j * 1.3 + i
            k.blob(cx + math.cos(a) * sz * 0.9, cr + math.sin(a) * sz * 0.7, 0.04, 0.12, 0.09, 0.05, ('#2a4a2a', 0.2), 'weed', segs=6)
    elif kind == 'reef':
        for j in range(7):
            a = j * 0.9
            d = 0.35 + 0.5 * ((j * 37) % 7) / 7
            s = 0.18 + 0.1 * ((j * 13) % 5) / 5
            k.rock(cx + math.cos(a) * d, cr + math.sin(a) * d * 0.7, -0.08, s, s * 0.8, s * 0.6, ('#56625f', 0.2), part='reef',
                   seed=70 + j)
    elif kind.startswith('buoy'):
        col = '#b8302a' if kind == 'buoy_red' else '#2a8a4a'
        k.cyl(cx, cr, -0.2, 0.32, 0.26, (col, 0.06), 'buoy', verts=14)
        k.cone(cx, cr, 0.32, 0.5, 0.26, 0.12, (shade(col, 0.85), 0.06), 'buoy', verts=14)
        for a in range(4):                                                                       # the cage over it
            ang = a * math.pi / 2 + 0.4
            k.tube((cx + math.cos(ang) * 0.12, cr + math.sin(ang) * 0.12, 0.48), (cx, cr, 1.05), 0.015, ('#3a3a40', 0.1), 'cage',
                   verts=4, smooth=False)
        k.blob(cx, cr, 0.78, 0.07, 0.07, 0.09, ('#c8a040', 0.08), 'bell', segs=8)
        k.blob(cx, cr, 1.08, 0.05, 0.05, 0.05, '#202020', 'buoy_lamp', emit=('#ff6050' if kind == 'buoy_red' else '#60ff90', 0.9),
               segs=8)
    elif kind == 'crate':
        k.bar(cx - 0.25, cr - 0.12, cx + 0.25, cr + 0.12, -0.12, 0.14, 0.42, ('#8a6034', 0.1), 'crate')
        k.bar(cx - 0.25, cr - 0.12, cx + 0.25, cr + 0.12, 0.14, 0.16, 0.08, ('#5a3a1a', 0.1), 'crate_slat')
    elif kind == 'barrel':
        k.tube((cx - 0.3, cr + 0.08, 0.02), (cx + 0.3, cr - 0.08, 0.02), 0.2, ('#7a4e22', 0.1), 'barrel', verts=12)
        for f in (-0.18, 0.18):
            k.tube((cx + f * 1.1 - 0.03, cr - f * 0.3 + 0.01, 0.02), (cx + f * 1.1 + 0.03, cr - f * 0.3 - 0.01, 0.02), 0.21,
                   ('#3a3a40', 0.1), 'hoop', verts=12)


for i in range(HEADINGS):
    c, r = i % 8, i // 8
    sloop(c * CELL + CX, r * CELL + CY, i / HEADINGS * 2 * math.pi)
for i in range(8):
    dory(i * CELL + CX, 4 * CELL + CY, i / 8 * 2 * math.pi)
for i, kind in enumerate(['rock_a', 'rock_b', 'rock_c', 'reef', 'buoy_red', 'buoy_green', 'crate', 'barrel']):
    statics(i * CELL + CX, 5 * CELL + CY, kind)

# the islands' moonlight, a cool sky over everything (as bright over the bigger sheet as it was over the old 32 × 24)
W, R = 8 * CELL, 6 * CELL
F = max(W / 32, R / 24)
k.area_light(W / 2, R / 2, 16.0, '#9a90c8', 2600 * F * F, 40.0 * F, rot=(math.radians(-35), 0, 0))
k.render(OUT, light_states={'full': {}}, light_samples=96, world_light=('#3a3048', 0.75))
print('sloop sheet')
