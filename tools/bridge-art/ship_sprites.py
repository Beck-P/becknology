"""The bigger ships you can own on Lumar's seas (js/fleet.js) - the cutter, the raider, the brigantine and the galleon -
rendered like the sloop's sheet (sloop_sprites.py): the scenes' 45° camera, the islands' moonlight, scene_post's
dithered shading, no floor. One sheet a ship, her hull at 32 headings, 8 to a row.

  BVENV/bin/python tools/bridge-art/ship_sprites.py RENDER_DIR TYPE [preview]
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/ship-TYPE

Cells are CELL × CELL tiles, the hull's centre at (CELL/2, CY) in its cell - HULLS in js/sloop.js says the same.
Heading i → angle i/32 of a turn (0 = bow to +x, then turning toward +row). `preview` renders four headings only.

The hull, decks, castles, hatches, guns, lanterns and the mast steps are here; js/sloop.js draws the masts, yards,
booms and sails (they heel, swing, brace round and luff), the bowsprit, the wheel and you at it. Deck heights match
the game's RIGS: the masts stand on `deck - 0.25` (the main deck), the helm on `qd` (the quarterdeck). The water line
is z = 0, and the sheet has a water level there so shore.png marks what's under it and the game cuts it off.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from scenekit import Kit, shade  # noqa: E402

OUT = sys.argv[1]
TYPE = sys.argv[2]
PREVIEW = len(sys.argv) > 3 and sys.argv[3] == 'preview'

# L, beam; the main deck's height; the quarterdeck's (where the wheel is) and where it ends; the forecastle's; colours
SHIPS = {
    'cutter':     dict(cell=5, cy=3.2, L=3.4, beam=1.25, deck=0.42, qd=None, qd_t=0.0, fc=None,
                       paint='#e6e0d0', band='#2a4a8a', wale='#a08040', deckc='#a87a44', trim='#3a2410'),
    'raider':     dict(cell=6, cy=3.8, L=4.4, beam=1.3, deck=0.42, qd=0.5, qd_t=0.24, fc=None,
                       paint='#1e1c24', band='#8a1e22', wale='#7a6a48', deckc='#5e4430', trim='#120e12'),
    'brigantine': dict(cell=7, cy=4.4, L=5.0, beam=1.6, deck=0.5, qd=0.78, qd_t=0.26, fc=0.66,
                       paint='#5e4028', band='#c8a040', wale='#2a1a0c', deckc='#9a6a38', trim='#2a1808'),
    'galleon':    dict(cell=9, cy=5.6, L=7.0, beam=2.2, deck=0.72, qd=1.18, qd_t=0.28, fc=1.0,
                       paint='#4a2c18', band='#2a6a58', wale='#c8a040', deckc='#9a6a38', trim='#2a1808'),
}
SH = SHIPS[TYPE]
CELL, CY, L, BEAM = SH['cell'], SH['cy'], SH['L'], SH['beam']
HEADINGS = [4, 12, 20, 28] if PREVIEW else list(range(32))
k = Kit(8 * CELL, 4 * CELL if not PREVIEW else CELL, margin_top=0.6, margin_bottom=0.2, seed=23)
k.water_z = 0.0

WOOD_D = '#3a2410'
IRON = '#2a2a30'
GLASS = '#ffe080'
PORT = '#160e08'


def frame(cx, cr, th):
    c, s = math.cos(th), math.sin(th)
    return lambda u, v, z: (cx + u * c - v * s, cr + u * s + v * c, z)


# her lines: half-breadth and sheer (the top of the rail) along her, t = 0 at the transom, 1 at the stem
FULL = {'cutter': (0.22, 0.86, 0.62), 'raider': (0.2, 0.86, 0.75), 'brigantine': (0.3, 0.8, 0.55), 'galleon': (0.38, 0.72, 0.5)}[TYPE]


def half(t):
    a, b, p = FULL
    return BEAM / 2 * math.sin(math.pi * min(1.0, a + b * t)) ** p if t < 0.999 else 0.015


def sheer(t):
    d = SH['deck']
    rail = 0.08 if TYPE in ('cutter', 'raider') else 0.14
    return d + rail + 0.04 * (1 - t) + 0.16 * max(0.0, t - 0.6) ** 2 / 0.16


def u_of(t):
    return -L / 2 + t * L


def shell(P, t0, t1, zlo, zhi, paint, part, n=14, out=0.0):
    """The ship's side between two heights (port and starboard strips, following her lines), from t0 to t1."""
    for s in (-1, 1):
        rings = []
        for i in range(n + 1):
            t = t0 + (t1 - t0) * i / n
            w = max(0.015, half(t)) + out
            lo, hi = zlo(t) if callable(zlo) else zlo, zhi(t) if callable(zhi) else zhi
            rings.append([P(u_of(t), s * w, hi), P(u_of(t), s * w, lo)])
        k.loft(rings, (paint, 0.06), part)


def hull(P):
    n = 20
    rings = []
    for i in range(n + 1):
        t = i / n
        u, w, top = u_of(t), max(0.015, half(t)), sheer(t)
        rings.append([P(u, -w, top), P(u, -w * 0.97, top * 0.5), P(u, -w * 0.74, 0.06), P(u, 0, -0.02),
                      P(u, w * 0.74, 0.06), P(u, w * 0.97, top * 0.5), P(u, w, top)])
    k.loft(rings, (SH['paint'], 0.06), 'hull')
    for s in (-1, 1):                                                                    # the bulwarks' inner faces
        k.loft([[P(u_of(i / n), s * max(0.012, half(i / n) - 0.06), sheer(i / n) - 0.01),
                 P(u_of(i / n), s * max(0.012, half(i / n) - 0.06), SH['deck'] + 0.01)] for i in range(n + 1)],
               (shade(SH['paint'], 0.8), 0.08), 'bulwark')
    # the transom: a flat stern across her end
    tw, ts = half(0.0), sheer(0.0)
    k.poly([P(u_of(0) - 0.005, 0, ts * 0.5), P(u_of(0) - 0.005, -tw, ts), P(u_of(0) - 0.005, -tw * 0.74, 0.06),
            P(u_of(0) - 0.005, tw * 0.74, 0.06), P(u_of(0) - 0.005, tw, ts)], (shade(SH['paint'], 0.9), 0.06), 'transom')
    # the band of colour along her topsides, and the wale under the rail
    shell(P, 0.0, 0.985, lambda t: sheer(t) - 0.26 * (BEAM / 1.6) ** 0.5, lambda t: sheer(t) - 0.1, SH['band'], 'band', out=0.006)
    for s in (-1, 1):
        prev = None
        for i in range(17):
            t = i / 16
            p = P(u_of(t), s * (half(t) + 0.012), sheer(t) - 0.04)
            if prev:
                k.tube(prev, p, 0.022, (SH['wale'], 0.05), 'wale', verts=5, smooth=False)
            prev = p
        prev = None
        for i in range(17):                                                               # the rail cap
            t = i / 16
            p = P(u_of(t), s * max(0.012, half(t) - 0.03), sheer(t) + 0.01)
            if prev:
                k.tube(prev, p, 0.02, (SH['trim'], 0.06), 'rail', verts=4, smooth=False)
            prev = p


def deck(P, t0, t1, z, inset=0.05, albedo=None, part='deck', n=10):
    """A deck at height z between t0 and t1, edge to edge inside the bulwarks."""
    pts = []
    for i in range(n + 1):
        t = t0 + (t1 - t0) * i / n
        pts.append(P(u_of(t), -max(0.01, half(t) - inset), z))
    for i in range(n, -1, -1):
        t = t0 + (t1 - t0) * i / n
        pts.append(P(u_of(t), max(0.01, half(t) - inset), z))
    mid = P(u_of((t0 + t1) / 2), 0, z)
    k.poly([mid] + pts + [pts[0]], albedo or (SH['deckc'], 0.06), part)
    for i in range(1, 7):                                                                # plank seams along her
        v = (i / 7 - 0.5) * 2
        a, b = P(u_of(t0 + 0.01), v * (half(t0 + 0.01) - inset) * 0.95, z + 0.004), P(u_of(t1 - 0.01), v * (half(t1 - 0.01) - inset) * 0.95, z + 0.004)
        k.tube(a, b, 0.006, (shade(SH['deckc'], 0.7), 0.08), 'seam', verts=3, smooth=False)


def castle(P, t0, t1, z, front_lit=True):
    """A raised deck (quarterdeck or forecastle) with its own bulwark, and the bulkhead across its open end."""
    shell(P, t0, t1, lambda t: sheer(t) - 0.02, lambda t: max(sheer(t), z + 0.14), SH['paint'], 'castle', out=0.002)
    deck(P, t0, t1, z, inset=0.07, part='castle_deck', n=6)
    for s in (-1, 1):                                                                    # its gilded rail
        prev = None
        for i in range(9):
            t = t0 + (t1 - t0) * i / 8
            p = P(u_of(t), s * max(0.012, half(t) - 0.02), max(sheer(t), z + 0.14) + 0.01)
            if prev:
                k.tube(prev, p, 0.024, (SH['wale'], 0.05), 'castle_rail', verts=4, smooth=False)
            prev = p
    te = t1 if t0 < 0.5 else t0                                                          # the bulkhead, facing the waist
    u, w = u_of(te), half(te) - 0.05
    k.poly([P(u, 0, (z + SH['deck']) / 2), P(u, -w, SH['deck']), P(u, -w, z), P(u, w, z), P(u, w, SH['deck'])],
           (shade(SH['paint'], 0.85), 0.06), 'bulkhead')
    k.tube(P(u, -w, z + 0.02), P(u, w, z + 0.02), 0.022, (SH['wale'], 0.05), 'castle_rail', verts=4, smooth=False)
    if front_lit:                                                                        # a lit door and windows under it
        h = z - SH['deck']
        sg = 1 if t0 < 0.5 else -1
        for j, v in enumerate((-0.55, 0.0, 0.55)):
            vv = v * w
            if abs(v) < 0.1:
                k.poly([P(u + sg * 0.01, vv - 0.11, SH['deck']), P(u + sg * 0.01, vv - 0.11, SH['deck'] + h * 0.8),
                        P(u + sg * 0.01, vv + 0.11, SH['deck'] + h * 0.8), P(u + sg * 0.01, vv + 0.11, SH['deck'])], (WOOD_D, 0.06), 'door')
            else:
                k.poly([P(u + sg * 0.01, vv - 0.08, SH['deck'] + h * 0.35), P(u + sg * 0.01, vv - 0.08, SH['deck'] + h * 0.75),
                        P(u + sg * 0.01, vv + 0.08, SH['deck'] + h * 0.75), P(u + sg * 0.01, vv + 0.08, SH['deck'] + h * 0.35)],
                       '#2a1a08', 'window', emit=(GLASS, 0.85))


def ports(P, ts, z, size=0.075, guns=True):
    """Gun ports down both sides at z: dark squares with a lid hinged up over each, a barrel run out."""
    for s in (-1, 1):
        for t in ts:
            u, w = u_of(t), half(t) + 0.01
            k.poly([P(u - size, s * w, z - size), P(u - size, s * w, z + size), P(u + size, s * w, z + size), P(u + size, s * w, z - size)],
                   (PORT, 0.2), 'port')
            k.poly([P(u - size, s * (w + 0.005), z + size), P(u - size, s * (w + 0.09), z + size + 0.06),
                    P(u + size, s * (w + 0.09), z + size + 0.06), P(u + size, s * (w + 0.005), z + size)], (SH['band'], 0.06), 'lid')
            if guns:
                k.tube(P(u, s * (w - 0.2), z), P(u, s * (w + 0.12), z), size * 0.55, (IRON, 0.15), 'gun', verts=8, smooth=False)


def swivel(P, t, s):
    """A swivel gun on the rail, on its post."""
    u, w = u_of(t), half(t) - 0.04
    z = sheer(t)
    k.tube(P(u, s * w, z - 0.1), P(u, s * w, z + 0.08), 0.025, (WOOD_D, 0.06), 'swivel_post', verts=5, smooth=False)
    k.tube(P(u - 0.14, s * w, z + 0.1), P(u + 0.16, s * (w + 0.08), z + 0.11), 0.035, (IRON, 0.15), 'swivel', verts=8, smooth=False)


def hatch(P, t0, t1, z, width, h=0.08, grate=True):
    a, b = P(u_of(t0), 0, 0), P(u_of(t1), 0, 0)
    k.bar(a[0], a[1], b[0], b[1], z, z + h, width, (shade(SH['deckc'], 0.8), 0.06), 'hatch')
    if grate:
        k.bar(a[0], a[1], b[0], b[1], z + h, z + h + 0.01, width * 0.8, ('#2a1a0c', 0.1), 'grate')


def step(P, t, z):
    x, r, _ = P(u_of(t), 0, 0)
    k.cyl(x, r, z - 0.02, z + 0.06, 0.07 * (BEAM / 1.25) ** 0.5, (SH['wale'], 0.05), 'mast_step', verts=10)


def lantern(P, u, v, z, size=1.0, energy=7):
    base, head = P(u, v, z), P(u, v, z + 0.4 * size)
    k.tube(base, head, 0.02 * size, (WOOD_D, 0.06), 'post', verts=5, smooth=False)
    k.blob(head[0], head[1], head[2] + 0.06 * size, 0.055 * size, 0.055 * size, 0.075 * size, '#3a2a14', 'lantern_glass',
           emit=(GLASS, 0.9), segs=8)
    k.cone(head[0], head[1], head[2] + 0.13 * size, head[2] + 0.2 * size, 0.065 * size, 0.01, (WOOD_D, 0.06), 'lantern_cap', verts=6)
    k.point_light(head[0], head[1] + 0.05, head[2] + 0.06, '#ffc070', energy, radius=0.05)


def boat_on_deck(P, t, z):
    """The ship's boat, upturned on the hatch, a canvas cover over it."""
    u = u_of(t)
    rings = []
    for i in range(9):
        f = i / 8
        uu = u - 0.55 + 1.1 * f
        w = 0.26 * math.sin(math.pi * (0.06 + 0.88 * f)) ** 0.7
        rings.append([P(uu, -w, z), P(uu, -w * 0.8, z + 0.14), P(uu, 0, z + 0.18), P(uu, w * 0.8, z + 0.14), P(uu, w, z)])
    k.loft(rings, ('#6a5a40', 0.08), 'gig')


# ---- the ships --------------------------------------------------------------------------------------------------------
def cutter(P):
    hull(P)
    d = SH['deck']
    deck(P, 0.0, 0.99, d)
    # the cockpit aft (you sit at the tiller like in the sloop) and the cabin trunk forward of it, portholes along it
    k.poly([P(u_of(0.05), -half(0.05) + 0.2, d - 0.18), P(u_of(0.05), half(0.05) - 0.2, d - 0.18), P(u_of(0.3), half(0.3) - 0.2, d - 0.18),
            P(u_of(0.3), -half(0.3) + 0.2, d - 0.18)], (shade(SH['deckc'], 0.6), 0.08), 'sole')
    for s in (-1, 1):
        k.tube(P(u_of(0.05), s * (half(0.05) - 0.2), d + 0.04), P(u_of(0.3), s * (half(0.3) - 0.2), d + 0.04), 0.022, (SH['trim'], 0.06),
               'coaming', verts=5, smooth=False)
        k.tube(P(u_of(0.08), s * 0.3, d - 0.06), P(u_of(0.28), s * 0.32, d - 0.06), 0.05, (SH['deckc'], 0.06), 'bench', verts=6, smooth=False)
    a, b = P(u_of(0.31), 0, 0), P(u_of(0.5), 0, 0)
    k.bar(a[0], a[1], b[0], b[1], d, d + 0.2, BEAM * 0.55, (SH['paint'], 0.06), 'cabin')
    k.bar(a[0], a[1], b[0], b[1], d + 0.2, d + 0.24, BEAM * 0.6, (SH['deckc'], 0.06), 'cabin_top')
    for t in (0.36, 0.42, 0.48):
        for s in (-1, 1):
            k.blob(*P(u_of(t), s * BEAM * 0.276, d + 0.11), 0.03, 0.01, 0.03, '#2a1a08', 'porthole', emit=(GLASS, 0.7), segs=6)
    hatch(P, 0.62, 0.7, d, 0.3, grate=False)
    step(P, 0.56, d)
    for t in (0.2, 0.85):                                                                # cleats and a pair of fenders
        for s in (-1, 1):
            k.blob(*P(u_of(t), s * (half(t) + 0.03), sheer(t) - 0.12), 0.05, 0.04, 0.08, ('#c8c0a8', 0.08), 'fender', segs=6)
    swivel(P, 0.9, 1)
    ra, rb = P(u_of(0) - 0.05, 0, 0), P(u_of(0) + 0.03, 0, 0)
    k.bar(ra[0], ra[1], rb[0], rb[1], 0.1, 0.48, 0.07, (WOOD_D, 0.06), 'rudder')
    lantern(P, u_of(0.04), -half(0.04) + 0.12, sheer(0.04))


def raider(P):
    hull(P)
    d = SH['deck']
    deck(P, 0.0, 0.99, d)
    deck(P, 0.0, SH['qd_t'], SH['qd'], inset=0.06, part='qd', n=6)                    # a low poop for the wheel
    a, b = P(u_of(SH['qd_t']), -half(SH['qd_t']) + 0.06, 0), P(u_of(SH['qd_t']), half(SH['qd_t']) - 0.06, 0)
    k.bar(a[0], a[1], b[0], b[1], d, SH['qd'], 0.03, (shade(SH['paint'], 0.85), 0.06), 'bulkhead')
    a, b = P(u_of(0.42), 0, 0), P(u_of(0.56), 0, 0)                                      # a low deckhouse, a skull on its door
    k.bar(a[0], a[1], b[0], b[1], d, d + 0.18, BEAM * 0.45, (SH['paint'], 0.06), 'house')
    k.bar(a[0], a[1], b[0], b[1], d + 0.18, d + 0.21, BEAM * 0.5, (SH['deckc'], 0.06), 'house_top')
    hatch(P, 0.66, 0.74, d, 0.34)
    hatch(P, 0.26, 0.32, d, 0.3)
    step(P, 0.66, d)
    step(P, 0.36, d)
    for t, s in ((0.3, 1), (0.3, -1), (0.8, 1), (0.8, -1)):
        swivel(P, t, s)
    ports(P, (0.5, 0.6), sheer(0.55) - 0.16, size=0.06, guns=True)
    ra, rb = P(u_of(0) - 0.05, 0, 0), P(u_of(0) + 0.03, 0, 0)
    k.bar(ra[0], ra[1], rb[0], rb[1], 0.1, 0.5, 0.08, (WOOD_D, 0.06), 'rudder')
    lantern(P, u_of(0.03), 0, SH['qd'], size=1.1)


def brigantine(P):
    hull(P)
    d = SH['deck']
    deck(P, 0.0, 0.99, d)
    castle(P, 0.0, SH['qd_t'], SH['qd'])
    castle(P, 0.86, 0.99, SH['fc'], front_lit=False)
    ports(P, (0.36, 0.46, 0.56), sheer(0.46) - 0.2)
    hatch(P, 0.42, 0.52, d, 0.5)
    hatch(P, 0.6, 0.66, d, 0.36)
    boat_on_deck(P, 0.47, d + 0.09)
    step(P, 0.7, d)
    step(P, 0.36, d)
    k.cyl(*P(u_of(0.11), 0, 0)[:2], SH['qd'], SH['qd'] + 0.18, 0.05, ('#a08040', 0.05), 'binnacle', verts=8)
    # the stern: lit windows across the transom
    tw = half(0.0)
    for v in (-0.5, -0.17, 0.17, 0.5):
        k.poly([P(u_of(0) - 0.01, v * tw * 1.6 - 0.07, sheer(0) - 0.24), P(u_of(0) - 0.01, v * tw * 1.6 - 0.07, sheer(0) - 0.08),
                P(u_of(0) - 0.01, v * tw * 1.6 + 0.07, sheer(0) - 0.08), P(u_of(0) - 0.01, v * tw * 1.6 + 0.07, sheer(0) - 0.24)],
               '#2a1a08', 'stern_window', emit=(GLASS, 0.85))
    ra, rb = P(u_of(0) - 0.06, 0, 0), P(u_of(0) + 0.03, 0, 0)
    k.bar(ra[0], ra[1], rb[0], rb[1], 0.08, 0.6, 0.09, (WOOD_D, 0.06), 'rudder')
    lantern(P, u_of(0.02), 0, max(sheer(0.02), SH['qd'] + 0.14), size=1.25, energy=9)


def galleon(P):
    hull(P)
    d = SH['deck']
    deck(P, 0.0, 0.99, d)
    castle(P, 0.0, SH['qd_t'], SH['qd'])
    castle(P, 0.0, 0.11, SH['qd'] + 0.34, front_lit=False)                          # the poop over the great cabin
    castle(P, 0.82, 0.99, SH['fc'], front_lit=True)
    ports(P, (0.32, 0.4, 0.48, 0.56, 0.64, 0.72), sheer(0.5) - 0.22, size=0.085)        # the gun deck
    ports(P, (0.12, 0.2), SH['qd'] - 0.12, size=0.06)                                    # and two on the quarterdeck
    hatch(P, 0.36, 0.46, d, 0.7)
    hatch(P, 0.56, 0.62, d, 0.5)
    boat_on_deck(P, 0.41, d + 0.09)
    for t in (0.74, 0.5, 0.22):
        step(P, t, d if 0.28 < t < 0.82 else SH['qd'])
    k.cyl(*P(u_of(0.13), 0, 0)[:2], SH['qd'], SH['qd'] + 0.2, 0.06, ('#a08040', 0.05), 'binnacle', verts=8)
    # the great cabin's windows across her stern, two tiers, and the quarter galleries
    tw = half(0.0)
    for z0 in (sheer(0) - 0.3, SH['qd'] + 0.04):
        for v in (-0.6, -0.3, 0.0, 0.3, 0.6):
            k.poly([P(u_of(0) - 0.01, v * tw * 1.5 - 0.08, z0), P(u_of(0) - 0.01, v * tw * 1.5 - 0.08, z0 + 0.18),
                    P(u_of(0) - 0.01, v * tw * 1.5 + 0.08, z0 + 0.18), P(u_of(0) - 0.01, v * tw * 1.5 + 0.08, z0)],
                   '#2a1a08', 'stern_window', emit=(GLASS, 0.85))
    k.poly([P(u_of(0) - 0.012, -tw * 0.95, SH['qd'] + 0.3), P(u_of(0) - 0.012, tw * 0.95, SH['qd'] + 0.3),
            P(u_of(0) - 0.012, tw * 0.95, SH['qd'] + 0.36), P(u_of(0) - 0.012, -tw * 0.95, SH['qd'] + 0.36)], (SH['wale'], 0.05), 'stern_gilt')
    for s in (-1, 1):
        u = u_of(0.08)
        k.blob(*P(u, s * (half(0.08) + 0.06), SH['qd'] - 0.05), 0.2, 0.1, 0.22, (shade(SH['paint'], 1.1), 0.06), 'gallery', segs=10)
        k.blob(*P(u, s * (half(0.08) + 0.15), SH['qd'] - 0.02), 0.06, 0.02, 0.06, '#2a1a08', 'gallery_window', emit=(GLASS, 0.8), segs=6)
    # a gilded figurehead under the bowsprit
    k.blob(*P(u_of(0.995) + 0.06, 0, sheer(0.99) - 0.18), 0.12, 0.07, 0.14, (SH['wale'], 0.05), 'figurehead', segs=10)
    ra, rb = P(u_of(0) - 0.07, 0, 0), P(u_of(0) + 0.03, 0, 0)
    k.bar(ra[0], ra[1], rb[0], rb[1], 0.06, 0.8, 0.11, (WOOD_D, 0.06), 'rudder')
    for v in (-0.6, 0.0, 0.6):                                                            # three stern lanterns
        lantern(P, u_of(0.01), v * tw * 0.8, SH['qd'] + 0.48, size=1.4 if v == 0 else 1.1, energy=10 if v == 0 else 6)


BUILD = {'cutter': cutter, 'raider': raider, 'brigantine': brigantine, 'galleon': galleon}[TYPE]
for j, i in enumerate(HEADINGS):
    c, r = (j, 0) if PREVIEW else (i % 8, i // 8)
    BUILD(frame(c * CELL + CELL / 2, r * CELL + CY, i / 32 * 2 * math.pi))

W, R = 8 * CELL, (CELL if PREVIEW else 4 * CELL)
F = max(W / 32, R / 24)
k.area_light(W / 2, R / 2, 16.0, '#9a90c8', 2600 * F * F, 40.0 * F, rot=(math.radians(-35), 0, 0))
k.render(OUT, light_states={'full': {}}, light_samples=96, world_light=('#3a3048', 0.75))
print('ship sheet', TYPE)
