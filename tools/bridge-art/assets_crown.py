"""Crownhaven's kit: Lantern Quay's own builders (dioramas/lantern_quay.py, Look Book 2), lifted as they are and made to
take the layout as arguments, so a whole waterfront (or a district next door) can be built from them.

  import assets_crown as Q
  Q.harbour_house(k, x0, x1, F, rb, wall_h, rise, roof, wall, ...)   a tall jettied harbour house, its front at row F
  Q.sloop(k, x0, x1, rc, wz)                                        a moored sloop, sail furled on the boom
  Q.line(k, a, b)                                                   a mooring line with a sag
  Q.quay_life(k, ...)                                               bits of the quay's clutter (see each function)

Everything is the diorama's code; only F (the ground-floor front), the back row and the water's height are arguments
instead of the diorama's constants.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402,F401
from scenekit import shade  # noqa: E402
import assets_lumar as A          # noqa: E402
import assets_town as W           # noqa: E402
import assets_coast as C          # noqa: E402
import assets_village as V        # noqa: E402

J = 0.2          # how far an upper floor oversails
ZJ = 1.62        # the jetty's height (ground floors tall enough for our chibis to walk in)
SALT = W.SALT
STONE = A.STONE


def mix(a, b, t):
    return W._mix(a, b, t)


def shop_window(k, x0, x1, z0, z1, rf, frame='#3a2a1e', panes=(4, 2)):
    k.box(x0 - 0.08, rf, z0 - 0.08, x1 + 0.08, rf + 0.08, z1 + 0.08, (frame, 0.08), 'window_frame', bevel=0.01)
    k.box(x0, rf + 0.01, z0, x1, rf + 0.075, z1, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.85))
    nx, nz = panes
    bars = []
    for i in range(1, nx):
        xx = x0 + (x1 - x0) * i / nx
        bars.append((xx - 0.018, rf + 0.07, z0, xx + 0.018, rf + 0.09, z1))
    for j in range(1, nz):
        zz = z0 + (z1 - z0) * j / nz
        bars.append((x0, rf + 0.07, zz - 0.018, x1, rf + 0.09, zz + 0.018))
    k.boxes(bars, frame, 'window_frame')
    k.box(x0 - 0.14, rf, z0 - 0.16, x1 + 0.14, rf + 0.2, z0 - 0.08, (A.WOOD, 0.12), 'sill', bevel=0.01)
    k.point_light((x0 + x1) / 2, rf + 0.7, (z0 + z1) / 2, '#ffc070', 10, radius=0.3, group='flicker')


def corbels(k, x0, x1, F):
    x = x0 + 0.25
    while x < x1 - 0.2:
        k.box(x - 0.05, F - 0.02, ZJ - 0.34, x + 0.05, F + J - 0.04, ZJ - 0.22, A.WOOD_DD, 'corbel')
        k.box(x - 0.05, F - 0.02, ZJ - 0.22, x + 0.05, F + J, ZJ - 0.08, A.WOOD_DD, 'corbel')
        x += 0.62


def framing(k, x0, x1, z0, z1, rf, timber, openings):
    """Posts, rails and braces on a plastered upper floor, clear of the windows (openings: [(xa, xb)])."""
    T = []
    posts = [x0 + 0.02, x1 - 0.14]
    for (a, b) in openings:
        posts += [a - 0.16, b + 0.04]
    posts = sorted(set(round(p, 3) for p in posts if x0 <= p <= x1 - 0.1))
    for p in posts:
        T.append((p, rf - 0.01, z0, p + 0.12, rf + 0.04, z1))
    for zz in (z0, z1 - 0.12):
        T.append((x0 + 0.02, rf - 0.01, zz, x1 - 0.02, rf + 0.04, zz + 0.12))
    k.boxes(T, (timber, 0.12), 'timber')
    for a, b in zip(posts, posts[1:]):                  # braces in the bays without a window
        mid = (a + b) / 2
        if b - a > 0.45 and not any(oa - 0.2 < mid < ob + 0.2 for (oa, ob) in openings):
            k.tube((a + 0.12, rf + 0.03, z0 + 0.12), (b, rf + 0.03, z1 - 0.12), 0.045, (timber, 0.12), 'timber', verts=4,
                   smooth=False)


def coursed(k, x0, x1, z0, z1, rf, tone, skip=()):
    rng = k.rng
    zz, i = z0, 0
    while zz < z1 - 0.05:
        h = rng.uniform(0.2, 0.26)
        x = x0 + (0.0 if i % 2 else 0.22)
        while x < x1:
            w = rng.uniform(0.36, 0.58)
            a, b = max(x, x0), min(x + w, x1)
            if b - a > 0.06 and not any(sa < (a + b) / 2 < sb and sz0 < zz + h / 2 < sz1 for (sa, sb, sz0, sz1) in skip):
                k.box(a + 0.015, rf - 0.02, zz + 0.015, b - 0.015, rf + 0.01 + rng.uniform(0, 0.012), min(z1, zz + h) - 0.015,
                      (shade(tone, rng.uniform(0.82, 1.12)), 0.16), 'stone_block', bevel=0.012)
            x += w
        zz += h
        i += 1


def harbour_house(k, x0, x1, F, rb, wall_h, rise, roof, wall, ground='stone', timber=None, door_x=None, door_w=0.72,
                  shop=None, win_down=(), win_up=(), win_up2=(), chimney=None, sign=None, lanterns=(), dormers=(),
                  awning=None, hoist=False, boards=False, solid=True):
    """Lantern Quay's harbour house: a stone (or timber) ground floor, the upper floors jettied out over the street on
    corbels, plastered and framed (or weatherboarded), shuttered windows with flower boxes, a shop window under a striped
    awning, a hanging sign, lanterns, a hoist over a loft door; a shingled roof with dormers and a chimney.
    F: the ground-floor front's row; rb: the back's. Returns (ridge row, ridge z)."""
    rng = k.rng
    timber = timber or rng.choice((A.WOOD_DD, '#2a2220', '#5a4a3c', '#3a3028'))
    shutters = rng.choice(('#2a4a3a', '#3a4a6a', '#6a2a2a', '#4a5a3a', '#2a3a4a', '#7a6a3a'))
    k.box(x0, rb, -0.02, x1, F, 0.3, (SALT[2], 0.16), 'footing', bevel=0.02)
    k.box(x0 + 0.04, rb + 0.04, 0.3, x1 - 0.04, F - 0.02, ZJ, (wall if ground != 'stone' else STONE, 0.08), 'house_wall')
    holes = []
    if door_x is not None:
        holes.append((door_x - door_w / 2 - 0.1, door_x + door_w / 2 + 0.1, 0.0, 1.7))
    if shop:
        holes.append((shop[0] - 0.12, shop[1] + 0.12, 0.3, ZJ))
    for (wx, wz) in win_down:
        holes.append((wx - 0.4, wx + 0.4, wz - 0.12, wz + 0.88))
    if ground == 'stone':
        coursed(k, x0 + 0.04, x1 - 0.04, 0.3, ZJ - 0.06, F - 0.0, STONE, skip=holes)
    else:
        T = [(x0 + 0.04, F - 0.03, 0.3, x0 + 0.16, F + 0.02, ZJ), (x1 - 0.16, F - 0.03, 0.3, x1 - 0.04, F + 0.02, ZJ)]
        k.boxes(T, (timber, 0.12), 'timber')
    k.box(x0 + 0.01, rb + 0.04, ZJ, x1 - 0.01, F + J, wall_h, (wall, 0.08), 'house_wall')
    k.box(x0 - 0.01, F - 0.06, ZJ - 0.1, x1 + 0.01, F + J + 0.03, ZJ + 0.03, (timber, 0.12), 'timber', bevel=0.01)
    corbels(k, x0, x1, F)
    rf = F + J
    if boards:          # the warehouse: weatherboards up there instead of plaster and timber
        zz = ZJ + 0.04
        while zz < wall_h - 0.05:
            k.box(x0 + 0.02, rf - 0.005, zz, x1 - 0.02, rf + 0.03, zz + 0.16, (shade(wall, rng.uniform(0.86, 1.06)), 0.14), 'boards')
            k.box(x0 + 0.02, rf + 0.02, zz, x1 - 0.02, rf + 0.035, zz + 0.025, shade(wall, 0.6), 'board_shadow')
            zz += 0.17
    else:
        opens = [(wx - 0.3, wx + 0.3) for (wx, _wz) in list(win_up) + list(win_up2)]
        framing(k, x0, x1, ZJ + 0.03, wall_h, rf, timber, opens)
    flowers_pick = lambda: rng.choice((None, ('#e04060', '#e0c040'), ('#a060d0', '#e0e0f0'), ('#e07030', '#e0c040'), ('#f0f0f0', '#e04060')))
    for (wx, wz) in win_up:
        W.window(k, wx, rf + 0.02, wz, w=0.48, h=0.6, shutters=shutters, flowers=flowers_pick())
    for (wx, wz) in win_up2:
        W.window(k, wx, rf + 0.02, wz, w=0.44, h=0.52, shutters=shutters)
    for (wx, wz) in win_down:
        W.window(k, wx, F + 0.02, wz, w=0.52, h=0.72, shutters=shutters, flowers=flowers_pick())
    if shop:
        shop_window(k, shop[0], shop[1], 0.52, 1.36, F)
    if door_x is not None:
        W.door(k, door_x, F, w=door_w, h=1.48, col=rng.choice((A.WOOD_D, '#3a4a3a', '#4a2a2a', '#2a3a4a')))
    rm, zr = W._gable_roof(k, x0, x1, rb, rf, wall_h, rise, roof)
    for cx in dormers:
        W.dormer(k, cx, rf + 0.25, rm, wall_h - 0.06, zr, roof, wall, shutters)
    if chimney is not None:
        ra_ = rf + 0.25
        rz = zr - (zr - wall_h + 0.06) * 0.05 / max(0.1, ra_ - rm)
        W.chimney_stack(k, chimney, rm - 0.35, rm + 0.05, wall_h, zr + 0.75, roof_z=rz)
    if door_x is not None and door_w < 1 and rng.random() < 0.5 and not awning:
        W.door_hood(k, door_x, F + 0.03, 1.86, roof)
    if sign:
        W.hanging_sign(k, sign[0], rf, sign[1], icon=sign[2])
    for lx in lanterns:
        W.wall_lantern(k, lx, F + 0.02, z=1.32, energy=12)
    W.dress_front(k, x0, x1, F, ZJ, door_x, [w[0] for w in win_down] + ([sum(shop) / 2] if shop else []), ivy=0.3, pots=0.6)
    if awning:
        stripe_a, stripe_b = awning
        ax0, ax1 = shop[0] - 0.25, shop[1] + 0.25
        n = int((ax1 - ax0) / 0.22)
        for i in range(n):
            a = ax0 + (ax1 - ax0) * i / n
            b = ax0 + (ax1 - ax0) * (i + 1) / n
            k.quads([((a, F + 0.02, ZJ - 0.05), (b, F + 0.02, ZJ - 0.05), (b, F + 0.95, ZJ - 0.42), (a, F + 0.95, ZJ - 0.42))],
                    stripe_a if i % 2 == 0 else stripe_b, 'awning')
            k.blob((a + b) / 2, F + 0.97, ZJ - 0.47, (b - a) / 2, 0.03, 0.06, stripe_a if i % 2 == 0 else stripe_b, 'awning', segs=8)
        for sx in (ax0 + 0.05, ax1 - 0.05):
            k.tube((sx, F + 0.02, ZJ - 0.1), (sx, F + 0.95, ZJ - 0.45), 0.018, A.IRON, 'awning_rod', verts=5)
    if hoist:
        hx = (x0 + x1) / 2 if hoist is True else hoist
        k.box(hx - 0.07, rf - 0.3, wall_h + 0.2, hx + 0.07, rf + 0.85, wall_h + 0.34, (A.WOOD_D, 0.12), 'hoist_beam')
        k.cyl_x(hx - 0.06, hx + 0.06, rf + 0.72, wall_h + 0.1, 0.09, 0.09, A.IRON, 'pulley', verts=10)
        k.tube((hx, rf + 0.72, wall_h + 0.02), (hx, rf + 0.72, 2.0), 0.014, '#a08a60', 'rope', verts=5)
        A.crate(k, hx - 0.25, rf + 0.47, s=0.5, z0=1.55, tone=A.WOOD_L, solid=False)
        k.box(hx - 0.42, rf, wall_h - 1.05, hx + 0.42, rf + 0.06, wall_h - 0.08, (A.WOOD_D, 0.16), 'loft_door')
        k.box(hx - 0.46, rf, wall_h - 1.09, hx + 0.46, rf + 0.05, wall_h - 1.04, A.WOOD_DD, 'door_frame')
    if solid:
        k.solid(x0, rb, x1, F)
    return rm, zr


def line(k, a, b, sag=0.15, n=4):
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * math.sin(math.pi * t)))
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.013, '#b8a070', 'mooring_line', verts=4)


def sloop(k, x0, x1, rc, wz, beam=1.2, hull='#3a2a1c', strake='#2a5a52', sail='#e4d8bc'):
    """Lantern Quay's moored sloop: a decked hull with a strake, a cabin aft with lit portholes, a hatch, rope, a cask and
    a crate on deck, the mainsail furled along the boom, stays and shrouds, a bowsprit, a stern lantern, fenders."""
    rng = k.rng
    since, lsince = len(k.parts), len(k.lights)
    L = x1 - x0
    shape = lambda t: max(0.05, math.sin(math.pi * (0.03 + 0.9 * t)) ** 0.5 * (1 - 0.35 * max(0.0, t - 0.75) / 0.25))
    gun = lambda t: 0.55 + 0.22 * (t - 0.62) ** 2 * 2.2
    W._hull(k, x0, x1, rc, beam, gun, lambda t: -0.5, shape, (hull, 0.14), 'boat_hull', n=28)
    W._hull(k, x0 - 0.01, x1 + 0.01, rc, beam + 0.05, lambda t: gun(t) + 0.02, lambda t: gun(t) - 0.12, shape, (strake, 0.1),
            'boat_strake', n=28)
    deck = [(x0 + t * L, rc + s * beam / 2 * shape(t) * 0.94, gun(t) - 0.06) for s, ts in ((-1, range(0, 21)), (1, range(20, -1, -1)))
            for t in (i / 20 for i in ts)]
    k.poly(deck, ('#94704a', 0.16), 'deck')
    for i in range(1, 7):
        rr = rc - beam * 0.42 + beam * 0.84 * i / 7
        k.box(x0 + L * 0.1, rr - 0.007, gun(0.5) - 0.06, x0 + L * 0.92, rr + 0.007, gun(0.5) - 0.042, '#5a3e24', 'deck_seam')
    hx = x0 + L * 0.72
    k.box(hx - 0.22, rc - 0.2, gun(0.72) - 0.06, hx + 0.22, rc + 0.2, gun(0.72) + 0.06, (A.WOOD_D, 0.12), 'hatch', bevel=0.015)
    W.annulus(k, x0 + L * 0.84, rc + beam * 0.18, 0.05, 0.15, gun(0.84) - 0.06, gun(0.84) + 0.0, ('#b8a070', 0.25), 'rope', segs=16)
    A.crate(k, x0 + L * 0.62, rc - beam * 0.38, s=0.3, z0=gun(0.62) - 0.06, solid=False)
    k.cyl(x0 + L * 0.5, rc + beam * 0.3, gun(0.5) - 0.06, gun(0.5) + 0.22, 0.1, (A.WOOD, 0.12), 'cask', verts=12)
    cx0, cx1 = x0 + L * 0.18, x0 + L * 0.46
    k.box(cx0, rc - beam * 0.28, gun(0.3) - 0.06, cx1, rc + beam * 0.28, gun(0.3) + 0.36, ('#d8ccb0', 0.08), 'cabin', bevel=0.02)
    k.box(cx0 - 0.04, rc - beam * 0.31, gun(0.3) + 0.36, cx1 + 0.04, rc + beam * 0.31, gun(0.3) + 0.42, (A.WOOD_D, 0.1), 'cabin_roof', bevel=0.015)
    for wx in (cx0 + 0.3, cx0 + 0.65, cx1 - 0.25):
        k.cyl_y(wx, rc + beam * 0.28, rc + beam * 0.28 + 0.02, gun(0.3) + 0.17, 0.07, 0.07, '#5a3a18', 'porthole', emit=(W.GLOW, 0.8), verts=10)
        k.cyl_y(wx, rc + beam * 0.28 - 0.005, rc + beam * 0.28 + 0.015, gun(0.3) + 0.17, 0.09, 0.09, A.BRASS, 'porthole_rim', verts=10)
    mx = x0 + L * 0.58
    k.cyl(mx, rc, gun(0.58) - 0.06, gun(0.58) + 3.6, 0.055, (A.WOOD, 0.1), 'mast', verts=10)
    k.cyl(mx, rc, gun(0.58) + 3.6, gun(0.58) + 3.7, 0.04, A.WOOD_D, 'mast', verts=8)
    zb = gun(0.58) + 0.75
    k.cyl_x(x0 + L * 0.06, mx, rc, zb, 0.04, 0.04, (A.WOOD, 0.1), 'boom', verts=8)
    x = x0 + L * 0.1
    while x < mx - 0.1:
        k.blob(x + 0.12, rc, zb + 0.09, 0.16, 0.09 + rng.uniform(-0.01, 0.015), 0.08, (shade(sail, rng.uniform(0.92, 1.04)), 0.06), 'furled_sail', segs=10)
        x += 0.22
    for t in (0.2, 0.33, 0.46):
        xx = x0 + L * t + 0.4
        k.cyl_x(xx - 0.015, xx + 0.015, rc, zb + 0.09, 0.105, 0.1, '#8a6a40', 'sail_tie', verts=8)
    top = (mx, rc, gun(0.58) + 3.55)
    k.tube(top, (x1 - 0.05, rc, gun(1.0) + 0.05), 0.012, '#4a3a2a', 'rigging', verts=4)
    k.tube(top, (x0 + 0.1, rc, gun(0.0) + 0.1), 0.012, '#4a3a2a', 'rigging', verts=4)
    for s in (-1, 1):
        k.tube((mx, rc, gun(0.58) + 2.6), (mx - 0.1, rc + s * beam * 0.48, gun(0.58)), 0.01, '#4a3a2a', 'rigging', verts=4)
    k.tube((x1 - 0.1, rc, gun(1.0)), (x1 + 0.7, rc, gun(1.0) + 0.15), 0.035, (A.WOOD, 0.1), 'bowsprit', verts=8)
    W.lantern(k, x0 + 0.2, rc, gun(0.0) + 0.05, gun(0.0) + 0.27, s=0.07, energy=10)
    k.cyl(x0 + 0.2, rc, gun(0.0) - 0.05, gun(0.0) + 0.05, 0.02, A.IRON, 'lantern_post', verts=6)
    for t in (0.35, 0.55, 0.75):
        k.blob(x0 + L * t, rc - beam * 0.52, gun(t) - 0.28, 0.07, 0.07, 0.13, '#e8e0d0', 'fender', segs=10)
    C.sink(k, since, wz + 0.08, lights_since=lsince)


# ---- the quay's clutter (lantern_quay.py's "life on the quay") -------------------------------------------------------
def barrel_group(k, x, r):
    rng = k.rng
    for (bx, br, bh) in ((x, r + 0.07, 0.72), (x + 0.5, r, 0.72), (x + 0.25, r + 0.45, 0.62)):
        A.barrel(k, bx, br, h=bh, radius=0.24, tone=rng.choice((A.WOOD, shade(A.WOOD, 0.85))))


def crate_stack(k, x, r):
    A.crate(k, x, r, s=0.48)
    A.crate(k, x + 0.5, r + 0.1, s=0.44, tone=shade(A.WOOD_L, 0.9))
    A.crate(k, x + 0.15, r + 0.03, s=0.42, z0=0.41, tone=shade(A.WOOD_L, 1.08), contents='apples', solid=False)


def fish_stall(k, x0, x1, r):
    rng = k.rng
    k.box(x0, r, 0.0, x1, r + 0.45, 0.62, (A.WOOD, 0.14), 'stall', bevel=0.01)
    k.box(x0 + 0.05, r + 0.03, 0.62, x1 - 0.05, r + 0.42, 0.7, ('#dfeef2', 0.06), 'ice')
    n = int((x1 - x0) / 0.25)
    for i in range(n * 2):
        fx = x0 + 0.18 + (i % n) * 0.24 + rng.uniform(-0.03, 0.03)
        fr = r + 0.13 + (i // n) * 0.17
        k.blob(fx, fr, 0.73, 0.1, 0.045, 0.03, (rng.choice(('#9ab0b8', '#b8c4c8', '#8a9aa6', '#c87a5a')), 0.08), 'fish', segs=8)
    k.cyl(x1 - 0.2, r + 0.23, 0.7, 0.98, 0.012, A.IRON, 'scale', verts=6)
    k.cyl(x1 - 0.2, r + 0.23, 0.98, 1.0, 0.1, A.BRASS, 'scale', verts=12)
    k.solid(x0, r, x1, r + 0.45)


def fish_baskets(k, x, r):
    rng = k.rng
    for (bx, br) in ((x, r), (x + 0.4, r + 0.15)):
        k.cyl(bx, br, 0.0, 0.26, 0.2, ('#a88a58', 0.3), 'basket', verts=12)
        k.cyl(bx, br, 0.24, 0.27, 0.205, '#7a603a', 'basket_rim', verts=12)
        for i in range(4):
            k.blob(bx + rng.uniform(-0.1, 0.1), br + rng.uniform(-0.08, 0.08), 0.29, 0.08, 0.035, 0.025, '#a4b8bc', 'fish', segs=8)


def rope_coils(k, cx, cr, n=3):
    for j in range(n):
        W.annulus(k, cx, cr, 0.08, 0.24 - j * 0.02, j * 0.07, j * 0.07 + 0.07, ('#b8a070', 0.25), 'rope', segs=20)


def floats(k, x, r):
    for i in range(5):
        k.sphere(x + (i % 3) * 0.13, r + (i // 3) * 0.12, 0.08, 0.075, 0.07, k.rng.choice(('#e05a30', '#f0f0e8', '#e05a30')), 'float', segs=10)


def lobster_pots(k, pts):
    for (px, pr) in pts:
        k.box(px - 0.26, pr - 0.17, 0.0, px + 0.26, pr + 0.17, 0.05, (A.WOOD, 0.14), 'pot_base')
        k.cyl_x(px - 0.26, px + 0.26, pr, 0.08, 0.17, 0.2, ('#7a6a48', 0.3), 'lobster_pot', verts=10)
        for dx in (-0.2, 0.0, 0.2):
            k.cyl_x(px + dx - 0.015, px + dx + 0.015, pr, 0.08, 0.175, 0.205, A.WOOD_D, 'pot_hoop', verts=10)


def net_rack(k, x0, x1, r):
    for nx in (x0, x1):
        k.cyl(nx, r, 0.0, 1.35, 0.045, (A.WOOD_D, 0.12), 'net_post', verts=8)
    k.cyl_x(x0 - 0.08, x1 + 0.08, r, 1.3, 0.035, 0.035, (A.WOOD, 0.12), 'net_pole', verts=8)
    cords = []
    for i in range(14):
        x = x0 + 0.08 + (x1 - x0 - 0.16) * i / 13
        sag = 0.05 * math.sin(i * 1.7)
        cords.append((x - 0.008, r - 0.01, 0.28 + sag, x + 0.008, r + 0.01, 1.28))
    for j in range(9):
        z = 0.3 + j * 0.11
        cords.append((x0 + 0.08, r - 0.01, z - 0.008, x1 - 0.08, r + 0.01, z + 0.008))
    k.boxes(cords, '#4a5a52', 'net')
    for i in range(6):
        k.sphere(x0 + 0.2 + i * (x1 - x0 - 0.4) / 5, r + 0.02, 0.27, 0.045, 0.045, '#e8a040', 'float', segs=8)
    k.solid(x0, r - 0.2, x1, r + 0.2)


def tub(k, tx, tr, fl=('#e04060', '#f0d040')):
    rng = k.rng
    k.cyl(tx, tr, 0.0, 0.28, 0.17, ('#9a5a3a', 0.1), 'tub', verts=12)
    with k.foliage('leaf'):
        k.blob(tx, tr, 0.38, 0.2, 0.16, 0.14, ('#3a6a30', 0.2), 'tub_plant', segs=10)
    k.boxes([(tx + rng.uniform(-0.13, 0.11), tr + rng.uniform(-0.1, 0.08), 0.46 + rng.uniform(0, 0.05),
              tx + rng.uniform(-0.13, 0.11) + 0.04, tr + rng.uniform(-0.1, 0.08) + 0.04, 0.5 + rng.uniform(0, 0.05)) for _ in range(6)],
            rng.choice(fl), 'flower')


def chalkboard(k, x, r):
    k.bar(x, r, x + 0.25, r + 0.12, 0.0, 0.7, 0.04, (A.WOOD_D, 0.1), 'chalkboard_leg')
    k.box(x + 0.03, r + 0.02, 0.32, x + 0.31, r + 0.1, 0.72, '#2a2e2a', 'chalkboard')
    k.boxes([(x + 0.06, r + 0.1, 0.62, x + 0.25, r + 0.11, 0.635), (x + 0.06, r + 0.1, 0.55, x + 0.21, r + 0.11, 0.565),
             (x + 0.06, r + 0.1, 0.48, x + 0.27, r + 0.11, 0.495)], '#e8e4d8', 'chalk')


def cat(k, x, r, z):
    k.blob(x, r, z + 0.04, 0.11, 0.08, 0.07, '#e8a050', 'cat', segs=10)
    k.sphere(x + 0.1, r + 0.05, z + 0.08, 0.06, 0.05, '#e8a050', 'cat', segs=8)
    k.tube((x - 0.1, r - 0.05, z), (x - 0.2, r + 0.07, z - 0.04), 0.02, '#d89040', 'cat', verts=5)


def gull(k, x, r, z=0.0, turn=1):
    k.blob(x, r, z + 0.1, 0.1, 0.06, 0.07, '#f0f0ec', 'gull', segs=10)
    k.blob(x + 0.08 * turn, r, z + 0.18, 0.05, 0.045, 0.05, '#f4f4f0', 'gull', segs=8)
    k.cone(x + 0.14 * turn, r, z + 0.17, z + 0.19, 0.02, 0.0, '#e0a030', 'gull', verts=4)
    k.blob(x - 0.04 * turn, r, z + 0.13, 0.08, 0.05, 0.02, '#8a9098', 'gull', segs=8)


def sacks(k, x, r, n=3):
    V.sacks(k, x, r, n=n, col=('#c8b890', '#d8c8a0', '#b8a880'))
