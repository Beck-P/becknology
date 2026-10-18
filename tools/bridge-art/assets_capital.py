"""Crownhaven grown into a capital (Workstream A, Denser Worlds): builders shared by its districts — the walled old town,
the canal quarter and Guild Row, the hill with the academy and the observatory, the Arsenal, the bridge of shops over
the harbour mouth, the stilt slums under the quays. Every function takes a Kit (scenekit). Tile units: x = column,
r = row (toward the camera), z = height. Buildings face the camera (their front at r_front).

  import assets_capital as CAP
  CAP.town_house(k, x0, x1, r_back, r_front, storeys=3, ...)   a tall townhouse: coursed stone or plaster below,
                                                               jettied timber-framed floors above, shutters and boxes
  CAP.row(k, x0, x1, r_back, r_front, seed, ...)               a run of them, each its own
  CAP.town_wall(k, xa, xb, r, ...)  CAP.wall_ns(k, x, ra, rb)   the town walls: coursed blocks, merlons, a wall walk
  CAP.tower(k, cx, cr, ...)  CAP.gatehouse(k, cx, r, ...)       round towers, an arched gate
  CAP.washing(k, xa, xb, r, z)  CAP.balustrade(k, xa, xb, r)    small life: washing across a lane, a parapet
  CAP.theatre(k, x0, x1, r_back, r_front)                       the Lantern Theatre's front

Same model world as Look Book 2 (tools/bridge-art/dioramas/lantern_quay.py is where the townhouse comes from): chunky
shapes that read at 32 px a tile, parts named so the toy finish reads them (roof_*, path, cobble, floor_*).
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import assets_lumar as A          # noqa: E402
import assets_town as W           # noqa: E402
import assets_village as V        # noqa: E402
import assets_house as HK         # noqa: E402
from scenekit import shade        # noqa: E402

STONE_L = '#9a9284'
WALL_STONE = '#8e877a'
BIG = dict(size=(0.27, 0.33, 0.55, 0.95), vary=(0.9, 1.06))     # a wall's courses: bigger, calmer blocks
ROOFS = (W.ROOF_SLATE, W.ROOF_GREEN, W.ROOF_RED, W.ROOF_PURPLE, '#2e5a4a', '#3a4256', '#6a3a2a', '#4a3a5a')
PLASTERS = ('#e6d6b4', '#e2c88e', '#e4c4ac', '#d4dccc', '#ecdcbc', '#d8c8a8', '#e8d8c0', '#c8d4d8', '#e0c8c0')
SHUTTERS = ('#2a4a3a', '#3a4a6a', '#6a2a2a', '#4a5a3a', '#2a3a4a', '#7a6a3a', '#3a6a6a', '#5a3a5a')
BLOOMS = (('#e04060', '#e0c040'), ('#a060d0', '#e0e0f0'), ('#e07030', '#e0c040'), ('#f0f0f0', '#e04060'), ('#f080b0', '#ffffff'))
ZJ = 1.62          # a townhouse's ground floor: tall enough for our chibis to walk in under the jetty
STOREY = 0.98      # each floor above it
J = 0.18           # how far each upper floor oversails the one below


def mix(a, b, t):
    return W._mix(a, b, t)


# ---- batching: thousands of stones as a few meshes -----------------------------------------------------------------
# A place the size of a district is tens of thousands of stones; as separate objects every render pass spends minutes
# syncing them. The builders below collect their pieces by part and tone (quantized to STEPS shades between the two
# ends of the range asked for) and add each bucket as one object (k.boxes / one bmesh) — the same stones, the same
# lines between them (the toy finish draws them from the depth steps), a fraction of the objects.
STEPS = 8


class Batch:
    def __init__(self, k):
        self.k = k
        self.b = {}

    def box(self, x0, r0, z0, x1, r1, z1, tone, f, vary, part, rough=0.14):
        lo, hi = vary
        q = round((f - lo) / max(1e-6, hi - lo) * (STEPS - 1))
        key = (part, shade(tone, lo + (hi - lo) * q / (STEPS - 1)), rough)
        self.b.setdefault(key, []).append((x0, r0, z0, x1, r1, z1))

    def flush(self):
        for (part, col, rough), rects in self.b.items():
            self.k.boxes(rects, (col, rough), part)
        self.b = {}


def cobbles(k, x0, r0, x1, r1, tone='#9a9080', size=0.3, skip=None, rng=None):
    """W.cobbles, batched: rounded irregular setts over dark grout, a few meshes (one per tone) instead of a part each."""
    import bmesh
    from scenekit import S
    rng = rng or k.rng
    k.box(x0, r0, -0.12, x1, r1, -0.03, ('#24221e', 0.25), 'grout')
    buckets = {}
    r, i = r0, 0
    while r < r1 - 1e-6:
        x = x0 - (size / 2 if i % 2 else 0)
        while x < x1 - 1e-6:
            cx = x + size / 2 + rng.uniform(-0.04, 0.04)
            cr = r + size / 2 + rng.uniform(-0.03, 0.03)
            if x0 <= cx <= x1 and not (skip and skip(cx, cr)):
                f = rng.uniform(0.8, 1.12)
                q = round((f - 0.8) / 0.32 * (STEPS - 1))
                buckets.setdefault(q, []).append((cx, cr, size * rng.uniform(0.4, 0.5), size * rng.uniform(0.38, 0.47),
                                                  rng.uniform(0.0, 0.02), rng.choice((6, 7, 8)), rng.uniform(0, 1)))
            x += size * rng.uniform(0.95, 1.05)
        r += size
        i += 1
    for q, stones in buckets.items():
        bm = bmesh.new()
        for (cx, cr, rx, ry, top, n, ph) in stones:
            ring_b, ring_t = [], []
            for j in range(n):
                a = (j + ph) * 2 * math.pi / n
                ring_b.append(bm.verts.new((cx + math.cos(a) * rx, -(cr + math.sin(a) * ry) * S, -0.05)))
                ring_t.append(bm.verts.new((cx + math.cos(a) * rx * 0.82, -(cr + math.sin(a) * ry * 0.82) * S, top)))
            bm.faces.new(ring_t)
            for j in range(n):
                bm.faces.new((ring_b[j], ring_b[(j + 1) % n], ring_t[(j + 1) % n], ring_t[j]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        import bpy
        me = bpy.data.meshes.new('cobbles')
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new('cobbles', me)
        k.scene.collection.objects.link(o)
        k._finish(o, (shade(tone, 0.8 + 0.32 * q / (STEPS - 1)), 0.12), 'cobble')


# ---- a townhouse ----------------------------------------------------------------------------------------------------
def _corbels(k, x0, x1, rf, z):
    x = x0 + 0.25
    while x < x1 - 0.2:
        k.box(x - 0.05, rf - 0.04, z - 0.32, x + 0.05, rf + J - 0.04, z - 0.2, A.WOOD_DD, 'corbel')
        k.box(x - 0.05, rf - 0.04, z - 0.2, x + 0.05, rf + J, z - 0.06, A.WOOD_DD, 'corbel')
        x += 0.62


def _framing(k, x0, x1, z0, z1, rf, timber, openings):
    """Posts, rails and braces on a plastered floor, clear of its windows (openings: [(xa, xb)])."""
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
    for a, b in zip(posts, posts[1:]):
        mid = (a + b) / 2
        if b - a > 0.45 and not any(oa - 0.2 < mid < ob + 0.2 for (oa, ob) in openings):
            k.tube((a + 0.12, rf + 0.03, z0 + 0.12), (b, rf + 0.03, z1 - 0.12), 0.045, (timber, 0.12), 'timber', verts=4,
                   smooth=False)


def coursed(k, x0, x1, z0, z1, rf, tone, skip=(), part='stone_block', rng=None, size=(0.2, 0.26, 0.36, 0.58), vary=(0.82, 1.12)):
    """Coursed blocks of dressed stone on a face at row rf, leaving the openings in skip [(xa, xb, za, zb)] bare.
    size: (course height min, max, block length min, max); vary: how far a block's tone strays. Batched (Batch)."""
    rng = rng or k.rng
    bt = Batch(k)
    zz, i = z0, 0
    while zz < z1 - 0.05:
        h = rng.uniform(size[0], size[1])
        x = x0 + (0.0 if i % 2 else size[2] * 0.6)
        while x < x1:
            w = rng.uniform(size[2], size[3])
            a, b = max(x, x0), min(x + w, x1)
            if b - a > 0.06 and not any(sa < (a + b) / 2 < sb and sz0 < zz + h / 2 < sz1 for (sa, sb, sz0, sz1) in skip):
                bt.box(a + 0.015, rf - 0.02, zz + 0.015, b - 0.015, rf + 0.01 + rng.uniform(0, 0.012), min(z1, zz + h) - 0.015,
                       tone, rng.uniform(*vary), vary, part, 0.16)
            x += w
        zz += h
        i += 1
    bt.flush()


def shop_window(k, x0, x1, z0, z1, rf, frame='#3a2a1e', panes=(4, 2), energy=10):
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
    if energy:
        k.point_light((x0 + x1) / 2, rf + 0.7, (z0 + z1) / 2, '#ffc070', energy, radius=0.3, group='flicker')


def awning(k, x0, x1, rf, z, cols=('#b23a34', '#ece0c8'), depth=0.9, drop=0.37):
    n = max(2, int((x1 - x0) / 0.22))
    for i in range(n):
        a = x0 + (x1 - x0) * i / n
        b = x0 + (x1 - x0) * (i + 1) / n
        c = cols[i % 2]
        k.quads([((a, rf + 0.02, z), (b, rf + 0.02, z), (b, rf + depth, z - drop), (a, rf + depth, z - drop))], c, 'awning')
        k.blob((a + b) / 2, rf + depth + 0.02, z - drop - 0.05, (b - a) / 2, 0.03, 0.06, c, 'awning', segs=8)
    for sx in (x0 + 0.05, x1 - 0.05):
        k.tube((sx, rf + 0.02, z - 0.05), (sx, rf + depth, z - drop - 0.03), 0.018, A.IRON, 'awning_rod', verts=5)


def town_house(k, x0, x1, r_back, r_front, storeys=2, roof=None, wall=None, ground='stone', timber=None, door_x=None,
               door_w=0.72, shop=None, awning_cols=None, wins=None, wins_down=(), chimney=None, sign=None, lanterns=(),
               dormers=(), hoist=False, boards=False, gable_front=False, rise=None, flowers=0.7, rng=None, solid=True):
    """A tall townhouse, its front at r_front: a ground floor of coursed stone or plaster with a door, a shop window or a
    window or two; then `storeys - 1` floors above, each oversailing the one below on corbels, plaster between timbers
    (or weatherboards), shuttered windows with flower boxes; a slate, tile or green roof with a chimney, dormers.
    wins: window x positions on the upper floors (default: spaced across the front). Returns (ridge row, ridge z)."""
    rng = rng or k.rng
    roof = roof or rng.choice(ROOFS)
    wall = wall or rng.choice(PLASTERS)
    timber = timber or rng.choice((A.WOOD_DD, '#2a2220', '#5a4a3c', '#3a3028', '#4a3020'))
    shutters = rng.choice(SHUTTERS)
    blooms = rng.choice(BLOOMS)
    stone_tone = rng.choice((A.STONE, '#9a9080', '#8a8274', '#a39a88'))
    F = r_front - J * (storeys - 1)            # the ground floor's face
    rb = r_back
    k.box(x0, rb, -0.02, x1, F, 0.3, (W.SALT[2], 0.16), 'footing', bevel=0.02)
    k.box(x0 + 0.04, rb + 0.04, 0.3, x1 - 0.04, F - 0.02, ZJ, (wall if ground != 'stone' else stone_tone, 0.08), 'house_wall')
    holes = []
    if door_x is not None:
        holes.append((door_x - door_w / 2 - 0.1, door_x + door_w / 2 + 0.1, 0.0, 1.7))
    if shop:
        holes.append((shop[0] - 0.12, shop[1] + 0.12, 0.3, ZJ))
    for wx in wins_down:
        holes.append((wx - 0.4, wx + 0.4, 0.5, 1.5))
    if ground == 'stone':
        coursed(k, x0 + 0.04, x1 - 0.04, 0.3, ZJ - 0.06, F, stone_tone, skip=holes, rng=rng)
    else:
        k.boxes([(x0 + 0.04, F - 0.03, 0.3, x0 + 0.16, F + 0.02, ZJ), (x1 - 0.16, F - 0.03, 0.3, x1 - 0.04, F + 0.02, ZJ)],
                (timber, 0.12), 'timber')
    if wins is None:
        n = max(1, int((x1 - x0 - 0.3) / 1.05))
        wins = [x0 + (x1 - x0) * (i + 0.5) / n for i in range(n)]
    pick = lambda: blooms if rng.random() < flowers else None
    z = ZJ
    rf = F
    for s in range(1, storeys):
        rf2 = rf + J
        top = z + STOREY
        k.box(x0 + 0.01, rb + 0.04, z, x1 - 0.01, rf2, top, (wall, 0.08), 'house_wall')
        k.box(x0 - 0.01, rf - 0.06, z - 0.1, x1 + 0.01, rf2 + 0.03, z + 0.03, (timber, 0.12), 'timber', bevel=0.01)
        _corbels(k, x0, x1, rf2, z)
        if boards:
            zz = z + 0.04
            while zz < top - 0.05:
                k.box(x0 + 0.02, rf2 - 0.005, zz, x1 - 0.02, rf2 + 0.03, zz + 0.16, (shade(wall, rng.uniform(0.86, 1.06)), 0.14), 'boards')
                k.box(x0 + 0.02, rf2 + 0.02, zz, x1 - 0.02, rf2 + 0.035, zz + 0.025, shade(wall, 0.6), 'board_shadow')
                zz += 0.17
        else:
            _framing(k, x0, x1, z + 0.03, top, rf2, timber, [(wx - 0.3, wx + 0.3) for wx in wins])
        for wx in wins:
            if s == storeys - 1 and storeys > 2:
                W.window(k, wx, rf2 + 0.02, z + 0.22, w=0.44, h=0.52, shutters=shutters, flowers=None)
            else:
                W.window(k, wx, rf2 + 0.02, z + 0.2, w=0.48, h=0.58, shutters=shutters, flowers=pick())
        z, rf = top, rf2
    wall_h = z if storeys > 1 else ZJ + 0.5
    if storeys == 1:
        k.box(x0 + 0.04, rb + 0.04, ZJ, x1 - 0.04, F - 0.02, wall_h, (wall, 0.08), 'house_wall')
    for wx in wins_down:
        W.window(k, wx, F + 0.02, 0.62, w=0.52, h=0.72, shutters=shutters, flowers=pick())
    if shop:
        shop_window(k, shop[0], shop[1], 0.52, 1.36, F)
        if awning_cols:
            awning(k, shop[0] - 0.25, shop[1] + 0.25, F, ZJ - 0.05, cols=awning_cols)
    if door_x is not None:
        W.door(k, door_x, F, w=door_w, h=1.48, col=rng.choice((A.WOOD_D, '#3a4a3a', '#4a2a2a', '#2a3a4a', '#5a3a2a')))
        k.box(door_x - door_w / 2 - 0.1, F, -0.02, door_x + door_w / 2 + 0.1, F + 0.22, 0.06, (shade(STONE_L, 0.95), 0.12), 'step')
    rise = rise if rise is not None else min(1.9, 0.55 * (x1 - x0) * 0.5 + 0.6)
    if gable_front:
        rm, zr = _front_gable(k, x0, x1, rb, rf, wall_h, rise, roof, wall, timber, shutters)
    else:
        rm, zr = W._gable_roof(k, x0, x1, rb, rf, wall_h, rise * 0.85, roof)
        for cx in dormers:
            W.dormer(k, cx, rf + 0.25, rm, wall_h - 0.06, zr, roof, wall, shutters)
    if chimney is not None:
        ra_ = rf + 0.25
        rz = zr - (zr - wall_h + 0.06) * 0.05 / max(0.1, ra_ - rm)
        W.chimney_stack(k, chimney, rm - 0.35, rm + 0.05, wall_h, zr + 0.75, roof_z=rz)
    if door_x is not None and door_w < 1 and rng.random() < 0.45 and not shop:
        W.door_hood(k, door_x, F + 0.03, 1.86, roof)
    if sign:
        W.hanging_sign(k, sign[0], rf, sign[1], icon=sign[2])
    for lx in lanterns:
        W.wall_lantern(k, lx, F + 0.02, z=1.32, energy=12)
    W.dress_front(k, x0, x1, F, ZJ, door_x, list(wins_down) + ([sum(shop) / 2] if shop else []), ivy=0.3, pots=0.6)
    if hoist:
        hx = (x0 + x1) / 2
        k.box(hx - 0.07, rf - 0.3, wall_h + 0.2, hx + 0.07, rf + 0.85, wall_h + 0.34, (A.WOOD_D, 0.12), 'hoist_beam')
        k.cyl_x(hx - 0.06, hx + 0.06, rf + 0.72, wall_h + 0.1, 0.09, 0.09, A.IRON, 'pulley', verts=10)
        k.tube((hx, rf + 0.72, wall_h + 0.02), (hx, rf + 0.72, 2.0), 0.014, '#a08a60', 'rope', verts=5)
        A.crate(k, hx - 0.25, rf + 0.47, s=0.5, z0=1.55, tone=A.WOOD_L, solid=False)
        k.box(hx - 0.42, rf, wall_h - 1.05, hx + 0.42, rf + 0.06, wall_h - 0.08, (A.WOOD_D, 0.16), 'loft_door')
    if solid:
        k.solid(x0, rb, x1, F)
    return rm, zr


def _front_gable(k, x0, x1, rb, rf, wall_h, rise, roof, wall, timber, shutters):
    """A roof whose gable faces the street (the Dutch and Hanseatic look on the canals): the ridge runs back from the
    front, a stepped or plain gable wall with a loft window and a hoist beam's slot."""
    cx = (x0 + x1) / 2
    hw = (x1 - x0) / 2 + 0.08
    zr = wall_h + rise
    # the gable wall itself, a triangle in plaster, with a timber edge
    k.poly([(x0 - 0.02, rf, wall_h), (x1 + 0.02, rf, wall_h), (cx, rf, zr)], (wall, 0.08), 'house_wall')
    k.tube((x0 - 0.02, rf + 0.03, wall_h), (cx, rf + 0.03, zr), 0.05, timber, 'timber', verts=4)
    k.tube((x1 + 0.02, rf + 0.03, wall_h), (cx, rf + 0.03, zr), 0.05, timber, 'timber', verts=4)
    W.window(k, cx, rf + 0.02, wall_h + 0.18, w=0.38, h=0.42, shutters=shutters)
    # the two roof slopes running back, east and west (their tops face up: seen from above)
    for s in (-1, 1):
        xe = cx + s * hw
        k.quads([((cx, rf + 0.12, zr + 0.02), (xe, rf + 0.12, wall_h - 0.08), (xe, rb - 0.1, wall_h - 0.08), (cx, rb - 0.1, zr + 0.02))],
                (roof, 0.1), 'roof_slope')
        r = rb
        while r < rf:                               # courses of slates down each slope
            k.quads([((cx, r + 0.02, zr + 0.035), (xe, r + 0.02, wall_h - 0.055), (xe, r + 0.07, wall_h - 0.055), (cx, r + 0.07, zr + 0.035))],
                    shade(roof, 0.72), 'roof_course')
            r += 0.28
    k.cyl_y(cx, rb - 0.12, rf + 0.14, zr + 0.04, 0.06, 0.06, shade(roof, 0.8), 'roof_ridge', verts=8)
    return (rb + rf) / 2, zr


def row(k, x0, x1, r_back, r_front, seed, gaps=(), storeys=(2, 3), widths=(2.2, 3.6), doors=True, shops=0.3,
        ground=None, gable_front=0.0, chimneys=0.6, signs=(), skip_door=(), smoke=None, roofs=None, walls=None,
        avoid=(), jitter=0.0):
    """A run of townhouses from x0 to x1, each its own (width, storeys, roof, wall, shop or not), leaving the lanes in
    gaps [(xa, xb)] open. Returns [(x0, x1, door_x, (rm, zr))] for the houses built. Its own dice (seed): adding a row
    doesn't move anything else the scene's dice place."""
    rng = random.Random(seed)
    built = []
    x = x0
    spans = []
    cur = x0
    for (ga, gb) in sorted(gaps):
        if ga > cur:
            spans.append((cur, ga))
        cur = max(cur, gb)
    if cur < x1:
        spans.append((cur, x1))
    for (sa, sb) in spans:
        x = sa
        while sb - x > 1.6:
            w = rng.uniform(*widths)
            if sb - (x + w) < 1.8:
                w = sb - x
            xa, xb = x, x + w
            st = rng.choice(storeys) if isinstance(storeys, tuple) else storeys
            gnd = ground or rng.choice(('stone', 'stone', 'plaster'))
            door_x = None
            if doors and not any(a <= (xa + xb) / 2 <= b for a, b in skip_door):
                door_x = round(rng.uniform(xa + 0.7, xb - 0.7) * 2) / 2 if xb - xa > 1.8 else (xa + xb) / 2
                door_x = min(max(door_x, xa + 0.55), xb - 0.55)
            shop = None
            if door_x is not None and rng.random() < shops and xb - xa > 2.6:
                if door_x - xa > xb - door_x:
                    shop = (xa + 0.35, door_x - 0.55)
                else:
                    shop = (door_x + 0.55, xb - 0.35)
                if shop[1] - shop[0] < 0.8:
                    shop = None
            wins_down = []
            if not shop and door_x is not None:
                for wx in (xa + 0.6, xb - 0.6):
                    if abs(wx - door_x) > 0.95:
                        wins_down.append(wx)
            n = max(1, int((xb - xa - 0.3) / 1.05))
            wins = [xa + (xb - xa) * (i + 0.5) / n for i in range(n)]
            sign = None
            for (sx, icon) in signs:
                if xa <= sx <= xb:
                    sign = (sx, ZJ + 0.55, icon)
            ch = round(rng.uniform(xa + 0.4, xb - 0.4), 2) if rng.random() < chimneys else None
            roof = rng.choice(roofs) if roofs else rng.choice(ROOFS)
            wall = rng.choice(walls) if walls else None
            rf_i = r_front + (round(rng.uniform(-jitter, jitter) / 0.2) * 0.2 if jitter else 0.0)
            rm_zr = town_house(k, xa, xb, r_back + rng.uniform(0, 0.25), rf_i, storeys=st, roof=roof, wall=wall,
                               ground=gnd, door_x=door_x, shop=shop, wins=wins, wins_down=wins_down, chimney=ch,
                               awning_cols=rng.choice((None, ('#b23a34', '#ece0c8'), ('#2e5a8a', '#ece0c8'), ('#3a6a3a', '#e8dcc0'))) if shop else None,
                               gable_front=rng.random() < gable_front, sign=sign, rng=rng,
                               lanterns=(door_x + rng.choice((-0.6, 0.6)),) if door_x is not None and rng.random() < 0.4 else ())
            if ch is not None and smoke is not None:
                rm, zr = rm_zr
                smoke.append([round(ch - 0.12, 3), round(rm - 0.15 - (zr + 1.05) * math.cos(math.radians(45)), 3)])
            built.append((xa, xb, door_x, rm_zr, rf_i))
            x = xb
    return built


# ---- the walls ------------------------------------------------------------------------------------------------------
def town_wall(k, xa, xb, r, h=1.9, thick=0.9, tone=WALL_STONE, walk=True, merlons=True, seed=0, skip=()):
    """A curtain wall running east-west, its outer (south) face at r, the wall walk on top behind a parapet of merlons.
    skip: [(xa, xb)] left open (a gate)."""
    rng = random.Random(seed or int(xa * 131 + r * 977))
    spans, cur = [], xa
    for (a, b) in sorted(skip):
        if a > cur:
            spans.append((cur, a))
        cur = max(cur, b)
    if cur < xb:
        spans.append((cur, xb))
    for (a, b) in spans:
        k.box(a, r - thick, -0.05, b, r - 0.02, h, (shade(tone, 0.8), 0.12), 'wall_core')
        coursed(k, a, b, 0.0, h, r, tone, rng=rng, part='wall_block', **BIG)
        # a string course and the parapet
        k.box(a - 0.02, r - 0.06, h - 0.02, b + 0.02, r + 0.06, h + 0.08, (shade(tone, 1.12), 0.1), 'wall_coping', bevel=0.01)
        k.box(a, r - thick, h, b, r - thick + 0.25, h + 0.35, (shade(tone, 0.95), 0.12), 'wall_parapet_back')
        if walk:
            k.box(a, r - thick + 0.25, h - 0.02, b, r - 0.25, h + 0.02, ('#6e685e', 0.25), 'path_wallwalk')
        if merlons:
            x = a + 0.05
            while x < b - 0.3:
                k.box(x, r - 0.24, h + 0.06, x + 0.42, r + 0.02, h + 0.48, (shade(tone, rng.uniform(0.88, 1.06)), 0.12), 'merlon', bevel=0.015)
                x += 0.72
        else:
            k.box(a, r - 0.24, h + 0.06, b, r + 0.02, h + 0.4, (shade(tone, 0.95), 0.12), 'parapet')
        # weed and lichen low on the face, a few arrow slits
        for _ in range(int((b - a) * 0.8)):
            wx = rng.uniform(a + 0.2, b - 0.2)
            k.blob(wx, r + 0.03, rng.uniform(0.05, 0.4), rng.uniform(0.05, 0.12), 0.02, rng.uniform(0.04, 0.09),
                   (rng.choice(('#3a4a30', '#4a5a38', '#5a6a48', '#6a6a58')), 0.2), 'wall_weed', segs=6)
        sx = a + 1.4
        while sx < b - 0.8:
            k.box(sx - 0.05, r - 0.02, h * 0.45, sx + 0.05, r + 0.03, h * 0.45 + 0.42, '#1a1a1c', 'arrow_slit')
            sx += rng.uniform(2.6, 3.6)
    k.solid(xa, r - thick, xb, r)
    for (a, b) in skip:
        k.blocked -= {(c, rr) for c in range(int(math.floor(a + 0.01)), int(math.ceil(b - 0.01))) for rr in range(int(r - thick), int(r) + 1)}


def wall_ns(k, x, ra, rb, h=1.9, thick=0.9, tone=WALL_STONE, seed=0):
    """A curtain wall running north-south (its top and its merlons are what the camera sees), centred on x."""
    rng = random.Random(seed or int(x * 313 + ra * 71))
    x0, x1 = x - thick / 2, x + thick / 2
    k.box(x0, ra, -0.05, x1, rb, h, (shade(tone, 0.85), 0.14), 'wall_core')
    zz, i = 0.0, 0
    while zz < h - 0.05:                              # its south end, coursed, where it meets the camera's eye
        hh = rng.uniform(0.2, 0.26)
        k.box(x0 + 0.02, rb - 0.02, zz + 0.015, x1 - 0.02, rb + 0.02, min(h, zz + hh) - 0.015, (shade(tone, rng.uniform(0.85, 1.1)), 0.14), 'wall_block')
        zz += hh
        i += 1
    for s in (-1, 1):                                  # its east and west faces in courses (seen a little, side on)
        xf = x0 if s < 0 else x1
        r = ra
        while r < rb:
            w = rng.uniform(0.4, 0.7)
            for zz in (0.25, 0.75, 1.25):
                if zz < h:
                    k.box(xf - 0.02 if s < 0 else xf - 0.01, r + 0.015, zz - 0.2, xf + 0.01 if s < 0 else xf + 0.02, min(rb, r + w) - 0.015, zz + 0.04,
                          (shade(tone, rng.uniform(0.82, 1.06)), 0.14), 'wall_block')
            r += w
    k.box(x0 + 0.24, ra, h - 0.02, x1 - 0.24, rb, h + 0.02, ('#6e685e', 0.25), 'path_wallwalk')
    r = ra + 0.05
    while r < rb - 0.3:
        for xm in (x0, x1 - 0.22):
            k.box(xm, r, h + 0.04, xm + 0.22, r + 0.42, h + 0.44, (shade(tone, rng.uniform(0.88, 1.06)), 0.12), 'merlon', bevel=0.015)
        r += 0.72
    k.solid(x0, ra, x1, rb)


def tower(k, cx, cr, R=1.2, h=3.6, tone=WALL_STONE, roof='#44567a', crenel=False, windows=2, flag=None, light=True):
    """A round tower: coursed in rings, slit windows, a corbelled crown, and a conical slate roof (or merlons)."""
    rng = random.Random(int(cx * 97 + cr * 53))
    k.cyl(cx, cr, -0.1, h, R, (shade(tone, 0.9), 0.14), 'tower_wall', verts=24)
    z, i = 0.0, 0
    while z < h - 0.1:                               # rings of blocks, each a touch proud, staggered
        n = 12
        for j in range(n):
            a0 = (j + (0.5 if i % 2 else 0)) * 2 * math.pi / n
            if math.sin(a0) < -0.3:                    # the far side: never seen
                continue
            a1 = a0 + 2 * math.pi / n
            p = [(cx + math.cos(a) * (R + 0.02), cr + math.sin(a) * (R + 0.02)) for a in (a0 + 0.03, a1 - 0.03)]
            k.quads([((p[0][0], p[0][1], z + 0.015), (p[1][0], p[1][1], z + 0.015), (p[1][0], p[1][1], z + 0.25), (p[0][0], p[0][1], z + 0.25))],
                    (shade(tone, rng.uniform(0.84, 1.1)), 0.14), 'wall_block')
        z += 0.27
        i += 1
    for wi in range(windows):
        wz = 0.9 + wi * 1.1
        if wz > h - 0.8:
            break
        a = math.pi / 2 + rng.uniform(-0.5, 0.5)
        wx, wr = cx + math.cos(a) * (R + 0.03), cr + math.sin(a) * (R + 0.03)
        k.box(wx - 0.08, wr - 0.02, wz, wx + 0.08, wr + 0.04, wz + 0.42, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.7))
        k.box(wx - 0.13, wr - 0.02, wz + 0.42, wx + 0.13, wr + 0.06, wz + 0.5, (STONE_L, 0.1), 'lintel')
    # the crown: corbels, then a slightly wider top
    k.cyl(cx, cr, h, h + 0.18, R + 0.14, (shade(tone, 1.05), 0.12), 'tower_crown', verts=24)
    for j in range(16):
        a = j * 2 * math.pi / 16
        if math.sin(a) < -0.4:
            continue
        k.box(cx + math.cos(a) * (R + 0.02) - 0.05, cr + math.sin(a) * (R + 0.02) - 0.05, h - 0.22,
              cx + math.cos(a) * (R + 0.02) + 0.05, cr + math.sin(a) * (R + 0.02) + 0.05, h, shade(tone, 0.75), 'corbel')
    if crenel:
        for j in range(12):
            a = (j + 0.5) * 2 * math.pi / 12
            k.box(cx + math.cos(a) * (R - 0.05) - 0.16, cr + math.sin(a) * (R - 0.05) - 0.16, h + 0.18,
                  cx + math.cos(a) * (R - 0.05) + 0.16, cr + math.sin(a) * (R - 0.05) + 0.16, h + 0.56,
                  (shade(tone, rng.uniform(0.9, 1.05)), 0.12), 'merlon', bevel=0.015)
        k.cyl(cx, cr, h + 0.16, h + 0.2, R - 0.1, ('#6e685e', 0.25), 'path_towertop', verts=20)
        top = h + 0.6
    else:
        k.cone(cx, cr, h + 0.18, h + 0.18 + R * 1.5, R + 0.26, 0.04, (roof, 0.12), 'roof_cone', verts=24)
        for j in range(5):                              # bands of slates round the cone
            t = (j + 1) / 6
            zz = h + 0.18 + R * 1.5 * t
            rr = (R + 0.26) * (1 - t) + 0.04 * t
            k.cyl(cx, cr, zz - 0.012, zz + 0.012, rr + 0.012, shade(roof, 0.86), 'roof_course', verts=24)
        k.cyl(cx, cr, h + 0.18 + R * 1.5, h + 0.18 + R * 1.5 + 0.35, 0.025, A.IRON, 'finial', verts=6)
        top = h + 0.18 + R * 1.5 + 0.35
    if flag:
        k.cyl(cx, cr, top - 0.05, top + 0.9, 0.025, A.IRON, 'flagpole', verts=6)
        k.poly([(cx + 0.03, cr, top + 0.88), (cx + 0.75, cr + 0.05, top + 0.72), (cx + 0.03, cr, top + 0.5)], flag, 'flag')
    if light:
        k.point_light(cx, cr + R + 0.4, 1.2, '#ffc070', 8, radius=0.3, group='flicker')
    k.solid(cx - R, cr - R, cx + R, cr + R)


def gatehouse(k, cx, r, w=2.0, h=2.6, depth=1.2, tone=WALL_STONE, name=None, font='IMFellEnglishSC-Regular', banner=None):
    """An arched gate through a wall, its face at r: two stout piers, the arch's voussoirs, a portcullis raised in its
    slot, a room above with a window, merlons; the passage left open to walk through."""
    rng = random.Random(int(cx * 41 + r * 7))
    hw = w / 2
    pw = 0.9
    for s in (-1, 1):
        xa, xb = (cx - hw - pw, cx - hw) if s < 0 else (cx + hw, cx + hw + pw)
        k.box(xa, r - depth, -0.05, xb, r, h + 1.0, (shade(tone, 0.85), 0.12), 'gate_pier')
        coursed(k, xa, xb, 0.0, h + 1.0, r, tone, rng=rng, part='wall_block', **BIG)
        k.solid(xa, r - depth, xb, r)
    # the room over the passage
    k.box(cx - hw, r - depth, h, cx + hw, r, h + 1.0, (shade(tone, 0.85), 0.12), 'gate_upper')
    coursed(k, cx - hw, cx + hw, h + 0.25, h + 1.0, r, tone, rng=rng, part='wall_block', **BIG)
    # the arch: wedge stones round a half circle
    n = 11
    for i in range(n):
        a0 = math.pi * i / n
        a1 = math.pi * (i + 1) / n
        pts = []
        for (a, rr) in ((a0, hw), (a1, hw), (a1, hw + 0.3), (a0, hw + 0.3)):
            pts.append((cx - math.cos(a) * rr, r + 0.02, h - hw * 0.65 + math.sin(a) * rr * 0.65))
        k.quads([tuple(pts)], (shade(STONE_L, rng.uniform(0.9, 1.08)), 0.1), 'voussoir')
    # the spandrels filled
    k.box(cx - hw, r - 0.04, h - hw * 0.65 + 0.1, cx - hw + 0.35, r, h, (tone, 0.12), 'gate_upper')
    k.box(cx + hw - 0.35, r - 0.04, h - hw * 0.65 + 0.1, cx + hw, r, h, (tone, 0.12), 'gate_upper')
    # the portcullis, raised: its teeth just showing under the arch
    xs = cx - hw + 0.25
    while xs < cx + hw - 0.2:
        k.box(xs - 0.025, r - 0.25, h - 0.55, xs + 0.025, r - 0.2, h - 0.05, '#2a2a30', 'portcullis')
        k.cone(xs, r - 0.225, h - 0.7, h - 0.55, 0.004, 0.03, '#2a2a30', 'portcullis', verts=4)
        xs += 0.28
    k.box(cx - hw + 0.2, r - 0.25, h - 0.3, cx + hw - 0.2, r - 0.2, h - 0.25, '#2a2a30', 'portcullis')
    # the window over the arch and the merlons
    k.box(cx - 0.2, r + 0.0, h + 0.35, cx + 0.2, r + 0.05, h + 0.8, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.8))
    k.box(cx - 0.27, r, h + 0.8, cx + 0.27, r + 0.08, h + 0.88, (STONE_L, 0.1), 'lintel')
    x = cx - hw - pw + 0.05
    while x < cx + hw + pw - 0.3:
        k.box(x, r - 0.24, h + 1.04, x + 0.42, r + 0.02, h + 1.46, (shade(tone, rng.uniform(0.9, 1.05)), 0.12), 'merlon', bevel=0.015)
        x += 0.72
    k.box(cx - hw - pw, r - depth, h + 1.0, cx + hw + pw, r - depth + 0.25, h + 1.35, (shade(tone, 0.95), 0.12), 'wall_parapet_back')
    for s in (-1, 1):
        W.wall_lantern(k, cx + s * (hw + 0.45), r + 0.02, z=1.5, energy=14)
    if name:
        V.board_sign(k, name, font, cx, r + 0.06, h + 0.12 - 0.02, size=0.2, board='#2a3a2e')
    if banner:
        for s in (-1, 1):
            bx = cx + s * (hw + pw / 2)
            k.box(bx - 0.25, r + 0.03, h - 0.3, bx + 0.25, r + 0.06, h + 0.85, banner, 'banner')
            k.box(bx - 0.08, r + 0.06, h + 0.2, bx + 0.08, r + 0.07, h + 0.45, W.BRASS, 'banner_badge')


# ---- small life -----------------------------------------------------------------------------------------------------
def washing(k, xa, xb, r, z=1.7, rng=None):
    """A line strung across a lane between two houses, washing pegged out along it."""
    rng = rng or k.rng
    sag = 0.18
    pts = []
    for i in range(9):
        t = i / 8
        pts.append((xa + (xb - xa) * t, r, z - sag * math.sin(math.pi * t)))
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.008, '#c8c0a8', 'washing_line', verts=4)
    x = xa + 0.2
    while x < xb - 0.25:
        w = rng.uniform(0.18, 0.34)
        t = (x + w / 2 - xa) / (xb - xa)
        zz = z - sag * math.sin(math.pi * t)
        col = rng.choice(('#f0ece0', '#e8e0c8', '#c84a4a', '#4a6aa8', '#e8c050', '#7aa87a', '#f0f0f0', '#a87ab0'))
        hh = rng.uniform(0.22, 0.42)
        k.box(x, r - 0.015, zz - hh, x + w, r + 0.015, zz - 0.01, (col, 0.08), 'washing')
        x += w + rng.uniform(0.06, 0.2)


def balustrade(k, xa, xb, r, h=0.7, tone=STONE_L):
    """A stone balustrade along a terrace's edge: a plinth, turned balusters, a coping rail, piers every few tiles."""
    k.box(xa, r - 0.12, 0.0, xb, r + 0.12, 0.12, (shade(tone, 0.9), 0.12), 'balustrade')
    x = xa + 0.12
    while x < xb - 0.05:
        k.cyl(x, r, 0.12, h - 0.1, 0.05, (tone, 0.1), 'baluster', verts=8)
        k.sphere(x, r, (0.12 + h - 0.1) / 2, 0.075, 0.075, (tone, 0.1), 'baluster', segs=8)
        x += 0.2
    k.box(xa - 0.02, r - 0.14, h - 0.1, xb + 0.02, r + 0.14, h, (shade(tone, 1.08), 0.1), 'balustrade_rail', bevel=0.012)
    x = xa
    while x <= xb + 0.01:
        k.box(x - 0.13, r - 0.15, 0.0, x + 0.13, r + 0.15, h + 0.1, (shade(tone, 0.95), 0.1), 'balustrade_pier', bevel=0.012)
        x += 2.0
    k.solid(xa, r - 0.15, xb, r + 0.15)


def flagged(k, x0, r0, x1, r1, tone='#8a8478', rng=None, part='flagstone'):
    """Big flags a hair apart (a square or a pavement), batched."""
    rng = rng or k.rng
    k.box(x0, r0, -0.14, x1, r1, -0.03, ('#2a2724', 0.15), 'grout')
    bt = Batch(k)
    r = r0 + 0.02
    while r < r1 - 0.02:
        x = x0 + rng.uniform(0, 0.3)
        h = rng.choice((0.36, 0.4, 0.44))
        while x < x1:
            w = rng.choice((0.48, 0.56, 0.62, 0.7))
            bt.box(max(x0, x) + 0.02, r + 0.02, -0.05, min(x1, x + w) - 0.02, min(r1, r + h) - 0.02, 0.0,
                   tone, rng.uniform(0.86, 1.1), (0.86, 1.1), part, 0.12)
            x += w
        r += h
    bt.flush()


def lane(k, x0, r0, x1, r1, tone='#9a9080', worn=None):
    """A cobbled lane on packed grit, worn bare here and there."""
    k.box(x0, r0, -0.07, x1, r1, -0.012, ('#7a6e5c', 0.3), 'path_grit')
    cobbles(k, x0, r0, x1, r1, tone=tone, size=0.26, skip=worn)


def theatre(k, x0, x1, r_back, r_front, name='LANTERN THEATRE'):
    """A playhouse's front on its square: a rusticated ground floor with three arched doors, a giant order of columns
    up the two floors over it carrying a pediment, a lettered frieze, playbills, lamps on brackets, a rooftop lantern
    over the house behind."""
    cx = (x0 + x1) / 2
    rf = r_front
    H = 4.4
    cream = '#e8dcc4'
    k.box(x0, r_back, -0.02, x1, rf - 0.02, H, (shade(cream, 0.9), 0.08), 'house_wall')
    # rusticated ground floor: deep-jointed blocks
    rng = random.Random(77)
    coursed(k, x0, x1, 0.0, 1.7, rf, '#d8ccb4', rng=rng, skip=[(cx + d - 0.55, cx + d + 0.55, 0.0, 1.55) for d in (-2.0, 0.0, 2.0)],
            part='stone_block')
    for d in (-2.0, 0.0, 2.0):                      # three arched doors, lit inside
        dx = cx + d
        k.box(dx - 0.45, rf - 0.05, 0.0, dx + 0.45, rf + 0.01, 1.25, '#6a3a18', 'window_glass', emit=('#ffc070', 0.7))
        for i in range(7):
            a0, a1 = math.pi * i / 7, math.pi * (i + 1) / 7
            pts = [(dx - math.cos(a) * rr, rf + 0.02, 1.25 + math.sin(a) * rr * 0.75) for (a, rr) in ((a0, 0.45), (a1, 0.45), (a1, 0.62), (a0, 0.62))]
            k.quads([tuple(pts)], ('#efe6d2', 0.08), 'voussoir')
        k.box(dx - 0.47, rf - 0.04, 0.0, dx + 0.47, rf + 0.03, 0.08, '#c8b898', 'step')
        for i in range(3):
            k.box(dx - 0.8 + 0.0, rf + 0.03 + i * 0.16, -0.02, dx + 0.8, rf + 0.19 + i * 0.16, 0.12 - i * 0.04, (shade('#d8ccb4', 1.0 - 0.04 * i), 0.1), 'steps')
        k.point_light(dx, rf + 0.6, 0.9, '#ffc070', 14, radius=0.3, group='flicker')
    # the giant order: six columns on pedestals up through the piano nobile
    cols = [x0 + 0.5 + (x1 - x0 - 1.0) * i / 5 for i in range(6)]
    for x in cols:
        k.box(x - 0.24, rf, 1.7, x + 0.24, rf + 0.42, 2.0, (shade(cream, 1.02), 0.08), 'column_base')
        k.cyl(x, rf + 0.21, 2.0, H - 0.25, 0.18, (shade(cream, 1.06), 0.06), 'column', verts=14)
        for f in range(5):                              # flutes on the face we see
            a = math.pi / 2 + (f - 2) * 0.35
            k.box(x + math.cos(a) * 0.17 - 0.012, rf + 0.21 + math.sin(a) * 0.17, 2.05, x + math.cos(a) * 0.17 + 0.012,
                  rf + 0.21 + math.sin(a) * 0.17 + 0.02, H - 0.3, shade(cream, 0.82), 'column_flute')
        k.box(x - 0.26, rf - 0.02, H - 0.25, x + 0.26, rf + 0.46, H - 0.1, (shade(cream, 1.08), 0.06), 'column_capital', bevel=0.02)
    # tall windows between, lit, with balconettes
    for a, b in zip(cols, cols[1:]):
        wx = (a + b) / 2
        k.box(wx - 0.3, rf + 0.01, 2.2, wx + 0.3, rf + 0.06, 3.5, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.85))
        k.box(wx - 0.36, rf, 3.5, wx + 0.36, rf + 0.1, 3.62, ('#efe6d2', 0.08), 'lintel')
        k.box(wx - 0.38, rf, 2.1, wx + 0.38, rf + 0.3, 2.18, ('#efe6d2', 0.08), 'balcony')
        xx = wx - 0.34
        while xx < wx + 0.36:
            k.box(xx - 0.012, rf + 0.26, 2.18, xx + 0.012, rf + 0.29, 2.45, A.IRON, 'balcony_rail')
            xx += 0.085
        k.box(wx - 0.38, rf + 0.25, 2.43, wx + 0.38, rf + 0.3, 2.47, A.IRON, 'balcony_rail')
        k.box(wx - 0.02, rf + 0.06, 2.2, wx + 0.02, rf + 0.08, 3.5, '#3a2a1e', 'window_frame')
    # entablature, the lettered frieze and the pediment
    k.box(x0 - 0.12, rf - 0.04, H - 0.1, x1 + 0.12, rf + 0.5, H + 0.45, (shade(cream, 1.05), 0.08), 'entablature', bevel=0.02)
    import assets_signs as SG
    SG.letters(k, name, 'AlegreyaSC-Bold', cx, rf + 0.5, H + 0.02, size=0.36, col='#c8a040', depth=0.03, lit=False)
    pz = H + 0.45
    k.poly([(x0 - 0.1, rf + 0.3, pz), (x1 + 0.1, rf + 0.3, pz), (cx, rf + 0.3, pz + 1.3)], (shade(cream, 1.0), 0.08), 'pediment')
    k.tube((x0 - 0.15, rf + 0.36, pz), (cx, rf + 0.36, pz + 1.33), 0.07, shade(cream, 1.12), 'pediment_edge', verts=4)
    k.tube((x1 + 0.15, rf + 0.36, pz), (cx, rf + 0.36, pz + 1.33), 0.07, shade(cream, 1.12), 'pediment_edge', verts=4)
    k.cyl_y(cx, rf + 0.32, rf + 0.4, pz + 0.55, 0.32, 0.32, '#c8a040', 'pediment_lyre', verts=16)     # a gilt sunburst
    k.cyl_y(cx, rf + 0.38, rf + 0.42, pz + 0.55, 0.2, 0.2, '#e8c860', 'pediment_lyre', verts=12)
    # the roof of the house behind: a long copper-green hip, a lantern on its ridge
    rm, zr = W._gable_roof(k, x0, x1, r_back, rf - 0.02, H + 0.3, 1.4, '#3e7a6a')
    k.cyl((x0 + x1) / 2, rm, zr - 0.1, zr + 0.6, 0.45, ('#efe6d2', 0.08), 'roof_lantern', verts=12)
    k.cyl((x0 + x1) / 2, rm, zr + 0.15, zr + 0.5, 0.47, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.9), verts=12)
    k.cone((x0 + x1) / 2, rm, zr + 0.6, zr + 1.0, 0.55, 0.05, ('#3e7a6a', 0.1), 'roof_cone', verts=12)
    # playbills on boards either side of the steps, lamps on brackets
    for s in (-1, 1):
        bx = cx + s * 3.3
        k.box(bx - 0.4, rf + 0.25, 0.1, bx + 0.4, rf + 0.32, 1.25, ('#3a2414', 0.12), 'playbill_board')
        for j, col in enumerate(('#e8d8b0', '#d8b8a0')):
            k.box(bx - 0.33 + j * 0.34, rf + 0.32, 0.25, bx - 0.03 + j * 0.34, rf + 0.34, 1.1, (col, 0.1), 'playbill')
            k.box(bx - 0.3 + j * 0.34, rf + 0.34, 0.9, bx - 0.06 + j * 0.34, rf + 0.345, 1.0, '#a03a2e', 'playbill_ink')
            k.box(bx - 0.3 + j * 0.34, rf + 0.34, 0.6, bx - 0.06 + j * 0.34, rf + 0.345, 0.66, '#2a2a3a', 'playbill_ink')
        k.solid(bx - 0.42, rf + 0.2, bx + 0.42, rf + 0.38)
    for x in cols:
        W.wall_lantern(k, x, rf + 0.42, z=1.45, energy=10)
    k.solid(x0, r_back, x1, rf)
    return rm, zr


# ---- the canals -------------------------------------------------------------------------------------------------------
CANAL_Z = -0.62          # a canal's surface: a step down from the quays, the walls showing their courses


def canal(k, x0, x1, r0, r1, wz=CANAL_Z, tone='#7e786c', seed=0, steps=()):
    """A canal running east-west between stone quays: its water (still: the Look Book's water, by name), the north
    quay's wall facing the camera in courses with a band of weed and wet at the waterline, coping stones along its top,
    mooring rings; the far wall under the next row of houses. steps: [x] — water stairs down the near wall."""
    rng = random.Random(seed or int(x0 * 17 + r0 * 131))
    k.box(x0, r0, wz - 0.06, x1, r1, wz, '#2a5a5e', 'pond_water')
    k.box(x0, r0 - 0.3, wz - 0.9, x1, r0 + 0.02, -0.02, (W.SALT[2], 0.12), 'quay_core')
    skip = [(sx - 0.45, sx + 0.45, wz - 1, 0.1) for sx in steps]
    coursed(k, x0, x1, wz - 0.5, -0.04, r0 + 0.02, tone, rng=rng, part='quay_wall', skip=skip, size=(0.18, 0.24, 0.4, 0.7))
    for i in range(int((x1 - x0) * 3)):
        x = rng.uniform(x0, x1)
        if any(abs(x - sx) < 0.5 for sx in steps):
            continue
        k.blob(x, r0 + 0.06, wz + rng.uniform(0.02, 0.12), rng.uniform(0.06, 0.14), 0.03, rng.uniform(0.03, 0.06),
               (rng.choice(('#2a3a26', '#334428', '#3e4a2c', '#4a4a3a')), 0.2), 'weed', segs=6)
    x = x0
    while x < x1:
        w = rng.uniform(0.55, 0.95)
        if not any(sx - 0.45 < x + w / 2 < sx + 0.45 for sx in steps):
            k.box(x + 0.015, r0 - 0.3, -0.04, min(x1, x + w) - 0.015, r0 + 0.04, 0.05, (shade(STONE_L, rng.uniform(0.88, 1.08)), 0.14),
                  'quay_coping', bevel=0.025)
        x += w
    for sx in steps:                                           # water stairs: down the wall into the canal
        for i in range(5):
            zt = -0.04 - (i + 1) * (abs(wz) - 0.02) / 5
            k.box(sx - 0.42, r0 - 0.3 + i * 0.0, zt - 0.1, sx + 0.42, r0 + 0.08 + i * 0.12, zt, (shade(STONE_L, rng.uniform(0.85, 1.0)), 0.12), 'steps', bevel=0.015)
    x = x0 + 1.5
    while x < x1 - 0.5:
        if not any(abs(x - sx) < 0.8 for sx in steps):
            k.cyl_y(x, r0 + 0.02, r0 + 0.06, wz + 0.35, 0.08, 0.08, A.IRON, 'mooring_ring', verts=10)
        x += rng.uniform(2.5, 4.0)
    k.solid(x0, r0 - 0.05, x1, r1)


def humpback(k, x0, x1, r0, r1, tone='#a89c88', rail=A.IRON, lamps=True):
    """A humpbacked stone bridge over a canal, along the rows: its deck of setts rising to the crown, stone parapets
    each side with a lamp on the crown; the arch's ring seen on the near face of the canal. Walkable (k.blocked cleared)."""
    rng = random.Random(int(x0 * 31 + r0 * 7))
    n = 10
    hump = 0.32
    for i in range(n):
        ra, rb = r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n
        za = 0.03 + hump * math.sin(math.pi * i / n)
        zb = 0.03 + hump * math.sin(math.pi * (i + 1) / n)
        k.poly([(x0 + 0.22, ra, za), (x1 - 0.22, ra, za), (x1 - 0.22, rb, zb), (x0 + 0.22, rb, zb)], (shade(tone, 0.86 + 0.06 * (i % 2)), 0.2), 'path_bridge')
        for x in (x0, x1 - 0.22):
            k.box(x, ra, za - 0.6, x + 0.22, rb, max(za, zb) + 0.42, (shade(tone, rng.uniform(0.88, 1.04)), 0.16), 'parapet', bevel=0.02)
        k.box(x0 + 0.22, ra, min(za, zb) - 0.5, x1 - 0.22, rb, min(za, zb) - 0.02, (shade(tone, 0.7), 0.16), 'bridge_body')
    # the arch's ring of voussoirs on the canal's near face (seen from the south)
    cx_ = (x0 + x1) / 2
    k.box(x0, r1 - 0.06, CANAL_Z - 0.1, x1, r1 + 0.02, 0.05, (shade(tone, 0.9), 0.14), 'bridge_face')
    if lamps:
        mid = (r0 + r1) / 2
        for x in (x0 + 0.11, x1 - 0.11):
            k.cyl(x, mid, hump + 0.45, hump + 1.25, 0.03, rail, 'lamp_post', verts=6)
            W.lantern(k, x, mid, hump + 1.25, hump + 1.5, s=0.09, energy=14)
    k.blocked -= {(c, r) for c in range(int(math.floor(x0 + 0.3)), int(math.ceil(x1 - 0.3))) for r in range(int(math.floor(r0)), int(math.ceil(r1)))}
    k.solid(x0, r0, x0 + 0.2, r1)
    k.solid(x1 - 0.2, r0, x1, r1)


def mooring_pole(k, x, r, cols=('#e8e0d0', '#3a6a9a'), h=1.6, wz=CANAL_Z):
    """A striped mooring pole standing in the water, a gilt knob on top."""
    k.cyl(x, r, wz - 0.3, wz + h, 0.07, (cols[0], 0.08), 'mooring_pole', verts=10)
    z = wz + 0.1
    i = 0
    while z < wz + h - 0.1:
        k.cyl(x, r, z, z + 0.14, 0.073, (cols[1], 0.08), 'mooring_pole', verts=10)
        z += 0.28
    k.sphere(x, r, wz + h + 0.05, 0.08, 0.08, W.BRASS, 'mooring_pole', segs=8)


def barge(k, x0, x1, rc, wz=CANAL_Z, beam=0.95, hull='#3a2a1c', cargo=True, rng=None):
    """A flat canal barge lying along the quay: a low black hull, a red strake, crates and barrels and sacks aboard."""
    rng = rng or k.rng
    since, ls = len(k.parts), len(k.lights)
    L = x1 - x0
    shape = lambda t: max(0.15, min(1.0, math.sin(math.pi * (0.02 + 0.96 * t)) ** 0.3))
    W._hull(k, x0, x1, rc, beam, lambda t: 0.42, lambda t: -0.25, shape, (hull, 0.12), 'boat_hull', n=20)
    W._hull(k, x0 - 0.01, x1 + 0.01, rc, beam + 0.04, lambda t: 0.44, lambda t: 0.34, shape, ('#8a2a22', 0.1), 'boat_strake', n=20)
    k.poly([(x0 + t * L, rc + s * beam / 2 * shape(t) * 0.9, 0.36) for s, ts in ((-1, range(0, 11)), (1, range(10, -1, -1)))
            for t in (i / 10 for i in ts)], ('#7a5a3a', 0.14), 'deck')
    if cargo:
        x = x0 + 0.4
        while x < x1 - 0.5:
            p = rng.random()
            if p < 0.4:
                A.crate(k, x + 0.2, rc + rng.uniform(-0.15, 0.15), s=0.4, z0=0.36, tone=shade(A.WOOD_L, rng.uniform(0.85, 1.05)), solid=False)
            elif p < 0.7:
                k.cyl(x + 0.2, rc + rng.uniform(-0.15, 0.15), 0.36, 0.86, 0.2, (A.WOOD, 0.12), 'barrel', verts=12)
            else:
                k.blob(x + 0.2, rc, 0.5, 0.25, 0.2, 0.15, ('#c8b890', 0.2), 'sack', segs=10)
            x += rng.uniform(0.5, 0.75)
    for t in (0.1, 0.9):
        k.cyl(x0 + t * L, rc, 0.36, 0.6, 0.04, A.WOOD_D, 'bollard', verts=6)
    import assets_coast as C
    C.sink(k, since, wz + 0.1, ls)


def gondola(k, x0, x1, rc, wz=CANAL_Z, hull='#1a1a1e', trim='#c8a040'):
    """A long black canal boat with a raised prow and a gilt prow-iron, a cushioned seat amidships."""
    since, ls = len(k.parts), len(k.lights)
    L = x1 - x0
    shape = lambda t: max(0.04, math.sin(math.pi * t) ** 0.6)
    W._hull(k, x0, x1, rc, 0.62, lambda t: 0.3 + 0.35 * max(0.0, abs(t - 0.5) - 0.3) * 4, lambda t: -0.12, shape, (hull, 0.08), 'boat_hull', n=22)
    k.box(x0 + L * 0.42, rc - 0.2, 0.18, x0 + L * 0.58, rc + 0.2, 0.32, ('#8a2a3a', 0.1), 'boat_seat')
    k.box(x1 - 0.12, rc - 0.02, 0.5, x1 + 0.02, rc + 0.02, 0.95, (trim, 0.06), 'prow_iron')
    for zz in (0.62, 0.72, 0.82):
        k.box(x1 - 0.04, rc - 0.02, zz, x1 + 0.12, rc + 0.02, zz + 0.04, (trim, 0.06), 'prow_iron')
    import assets_coast as C
    C.sink(k, since, wz + 0.08, ls)


# ---- the old town's landmarks ----------------------------------------------------------------------------------------
def arch_house(k, x0, x1, r_back, r_front, roof=None, wall=None, rng=None):
    """A house built over an alley: its upper floor carried on a timber lintel over the passage, posts at the corners,
    a window or two, its own roof — the lane goes on underneath (walkable)."""
    rng = rng or k.rng
    roof = roof or rng.choice(ROOFS)
    wall = wall or rng.choice(PLASTERS)
    timber = rng.choice((A.WOOD_DD, '#3a3028'))
    z0, z1 = ZJ + 0.1, ZJ + 0.1 + STOREY * 1.1
    k.box(x0, r_back, z0, x1, r_front, z1, (wall, 0.08), 'house_wall')
    k.box(x0 - 0.04, r_front - 0.08, z0 - 0.22, x1 + 0.04, r_front + 0.04, z0 + 0.02, (timber, 0.12), 'timber', bevel=0.01)   # the lintel
    for xx in (x0 + 0.05, x1 - 0.17):
        k.box(xx, r_front - 0.06, z0, xx + 0.12, r_front + 0.03, z1, (timber, 0.12), 'timber')
    k.box(x0 + 0.05, r_front - 0.06, z1 - 0.12, x1 - 0.05, r_front + 0.03, z1, (timber, 0.12), 'timber')
    W.window(k, (x0 + x1) / 2, r_front + 0.02, z0 + 0.25, w=0.44, h=0.5, shutters=rng.choice(SHUTTERS), flowers=rng.choice(BLOOMS))
    # curved braces under the lintel, and the dark of the passage behind
    for (xa, s) in ((x0 + 0.1, 1), (x1 - 0.1, -1)):
        k.tube((xa, r_front - 0.02, z0 - 0.75), (xa + s * 0.45, r_front - 0.02, z0 - 0.2), 0.045, timber, 'timber', verts=4)
    k.box(x0, r_back + 0.3, ZJ - 0.1, x1, r_back + 0.4, z0, ('#1a1814', 0.1), 'passage_shadow')
    W._gable_roof(k, x0 - 0.15, x1 + 0.15, r_back, r_front, z1, 0.9, roof)
    W.wall_lantern(k, (x0 + x1) / 2 + 0.35, r_front + 0.02, z=z0 - 0.35, energy=12)


def chapel(k, x0, x1, r_back, r_front, tower_side=1, tone='#9a9284'):
    """A small stone chapel, its gable to the street: a coursed front with an arched door, a rose window glowing over
    it, buttresses; a square bell tower at one side rising to a slate spire with a gilt cross."""
    rng = random.Random(int(x0 * 59 + r_front * 13))
    cx = (x0 + x1) / 2
    hw = (x1 - x0) / 2
    H = 2.6
    k.box(x0, r_back, -0.02, x1, r_front, H, (shade(tone, 0.85), 0.12), 'chapel_wall')
    coursed(k, x0, x1, 0.0, H, r_front, tone, rng=rng, part='wall_block', **BIG, skip=[(cx - 0.55, cx + 0.55, 0, 1.55), (cx - 0.55, cx + 0.55, 1.75, 2.6)])
    # the gable over the front, coursed too, its coping
    k.poly([(x0, r_front, H), (x1, r_front, H), (cx, r_front, H + hw * 0.9)], (shade(tone, 0.95), 0.12), 'chapel_gable')
    for s in (-1, 1):
        k.tube((cx + s * (hw + 0.08), r_front + 0.04, H - 0.02), (cx, r_front + 0.04, H + hw * 0.9 + 0.06), 0.07, shade(tone, 1.15), 'coping', verts=4)
    k.box(cx - 0.03, r_front + 0.02, H + hw * 0.9, cx + 0.03, r_front + 0.06, H + hw * 0.9 + 0.45, W.BRASS, 'cross')
    k.box(cx - 0.14, r_front + 0.02, H + hw * 0.9 + 0.26, cx + 0.14, r_front + 0.06, H + hw * 0.9 + 0.32, W.BRASS, 'cross')
    # the door in its arch and the rose window over it
    k.box(cx - 0.42, r_front - 0.04, 0.0, cx + 0.42, r_front + 0.0, 1.3, ('#4a2e18', 0.12), 'door')
    for i in range(9):
        a0, a1 = math.pi * i / 9, math.pi * (i + 1) / 9
        pts = [(cx - math.cos(a) * rr, r_front + 0.02, 1.3 + math.sin(a) * rr * 0.7) for (a, rr) in ((a0, 0.42), (a1, 0.42), (a1, 0.6), (a0, 0.6))]
        k.quads([tuple(pts)], (shade(STONE_L, 1.05), 0.08), 'voussoir')
    k.cyl_y(cx, r_front - 0.02, r_front + 0.03, 2.15, 0.36, 0.36, '#6a2a5a', 'window_glass', emit=('#ffb070', 0.75), verts=18)
    k.cyl_y(cx, r_front - 0.01, r_front + 0.05, 2.15, 0.44, 0.44, (STONE_L, 0.08), 'rose_frame', verts=18)
    for j in range(3):                                              # tracery: three bars through the rose
        a = j * math.pi / 3 + math.pi / 2
        k.tube((cx - math.cos(a) * 0.34, r_front + 0.05, 2.15 - math.sin(a) * 0.34), (cx + math.cos(a) * 0.34, r_front + 0.05, 2.15 + math.sin(a) * 0.34),
               0.015, STONE_L, 'tracery', verts=4)
    for xx in (x0 - 0.12, x1 - 0.12):                               # buttresses
        k.box(xx, r_front - 0.3, -0.02, xx + 0.26, r_front + 0.18, 1.9, (shade(tone, 0.95), 0.12), 'buttress', bevel=0.02)
    rm, zr = (r_back + r_front) / 2, H + hw * 0.9
    # the roof runs back from the gable: two slopes seen from above
    for s in (-1, 1):
        k.quads([((cx, r_front - 0.02, zr), (cx + s * (hw + 0.15), r_front - 0.02, H - 0.08), (cx + s * (hw + 0.15), r_back - 0.1, H - 0.08), (cx, r_back - 0.1, zr))],
                (W.ROOF_SLATE, 0.1), 'roof_slope')
    # the tower and its spire
    tw = 1.3
    tx0 = x1 + 0.05 if tower_side > 0 else x0 - tw - 0.05
    tx1 = tx0 + tw
    tr0 = r_front - tw - 0.4
    TH = 4.2
    k.box(tx0, tr0, -0.02, tx1, r_front - 0.4, TH, (shade(tone, 0.85), 0.12), 'tower_wall')
    coursed(k, tx0, tx1, 0.0, TH, r_front - 0.4, tone, rng=rng, part='wall_block', **BIG, skip=[((tx0 + tx1) / 2 - 0.2, (tx0 + tx1) / 2 + 0.2, TH - 1.0, TH - 0.2)])
    k.box((tx0 + tx1) / 2 - 0.18, r_front - 0.42, TH - 1.0, (tx0 + tx1) / 2 + 0.18, r_front - 0.38, TH - 0.2, '#1a1a1e', 'belfry_opening')
    k.cone((tx0 + tx1) / 2, tr0 + tw / 2, TH - 0.6, TH - 0.25, 0.04, 0.18, (W.BRASS, 0.06), 'bell', verts=12)
    pyramid_top = TH + 2.2
    W.pyramid(k, tx0 - 0.08, tr0 - 0.08, tx1 + 0.08, r_front - 0.32, TH, pyramid_top, (W.ROOF_SLATE, 0.14), 'roof_spire')
    k.tube(((tx0 + tx1) / 2, tr0 + tw / 2, pyramid_top), ((tx0 + tx1) / 2, tr0 + tw / 2, pyramid_top + 0.45), 0.02, W.BRASS, 'cross', verts=5)
    k.box((tx0 + tx1) / 2 - 0.12, tr0 + tw / 2 - 0.015, pyramid_top + 0.28, (tx0 + tx1) / 2 + 0.12, tr0 + tw / 2 + 0.015, pyramid_top + 0.33, W.BRASS, 'cross')
    k.point_light(cx, r_front + 0.8, 1.6, '#ffb070', 14, radius=0.4, group='flicker')
    k.solid(x0 - 0.12, r_back, x1 + 0.14, r_front + 0.18)
    k.solid(tx0, tr0, tx1, r_front - 0.4)
    return rm, zr


def yard_life(k, x0, x1, r0, r1, seed, gaps=()):
    """The back yards between two rows (seen past the roofs and down the alleys): plots of earth and grass, a small
    tree here and there, a shed with a lean-to roof, a water butt, a wall between each plot. Only between the gaps (the
    alleys, a square): those stay open ground, the street's own."""
    rng = random.Random(seed)
    spans, cur = [], x0
    for (a, b) in sorted(gaps):
        if a > cur:
            spans.append((cur, a))
        cur = max(cur, b)
    if cur < x1:
        spans.append((cur, x1))
    for (sa, sb) in spans:
        k.box(sa, r0, -0.05, sb, r1, 0.0, ('#4a4a3a', 0.3), 'yard')
        k.solid(sa, r0, sb, r1)
        x = sa
        while x < sb - 0.5:
            w = rng.uniform(2.0, 3.6)
            xb = min(sb, x + w)
            p = rng.random()
            mid = (r0 + r1) / 2
            if xb - x > 1.0:
                if p < 0.35:
                    with k.foliage('leaf'):
                        W.tree(k, (x + xb) / 2, mid + 0.1, h=rng.uniform(1.8, 2.4), tone=rng.choice(('#3a6234', '#2e5a3a', '#4a6a30')))
                elif p < 0.6:
                    sx0, sx1 = x + 0.3, min(xb - 0.3, x + 1.6)
                    k.box(sx0, r0 + 0.1, 0.0, sx1, r1 - 0.1, 0.8, ('#7a5a3a', 0.14), 'shed', bevel=0.02)
                    k.quads([((sx0 - 0.08, r0, 1.05), (sx1 + 0.08, r0, 1.05), (sx1 + 0.08, r1, 0.75), (sx0 - 0.08, r1, 0.75))], ('#5a4a42', 0.12), 'roof_shed')
                elif p < 0.8:
                    with k.foliage('leaf'):
                        for i in range(3):
                            W.leafy_crown(k, x + 0.5 + i * (xb - x - 1.0) / 2, mid, 0.35, 0.3, 0.25, 0.28, shade('#3a6a30', rng.uniform(0.9, 1.1)), part='hedge')
                else:
                    k.cyl(x + 0.6, mid, 0.0, 0.7, 0.28, ('#5a4024', 0.14), 'water_butt', verts=12)
            if xb < sb - 0.3:
                k.box(xb - 0.08, r0, 0.0, xb + 0.08, r1, 0.75, (shade('#8a8274', rng.uniform(0.9, 1.05)), 0.14), 'yard_wall', bevel=0.02)
            x = xb
        for xe in (sa, sb):                                   # a garden wall closing the yard off from the alley
            k.box(xe - 0.1, r0, 0.0, xe + 0.1, r1, 0.9, (shade('#8a8274', rng.uniform(0.9, 1.05)), 0.14), 'yard_wall', bevel=0.02)


# ---- the Arsenal --------------------------------------------------------------------------------------------------------
def hull_in_frame(k, x0, x1, rc, beam=2.0, zk=0.55, h=1.6, z0=0.0):
    """A hull on the stocks (Crownhaven's Royal Yard's, scenes/lumar_crown.py): keel blocks, the keel, stem and
    sternpost, ribs all along, planking up to the turn of the bilge on the near side, staging round her. z0: what the
    blocks stand on (a dry dock's floor)."""
    L = x1 - x0
    zk += z0
    for i in range(7):
        bx = x0 + 0.4 + i * (L - 0.8) / 6
        k.box(bx - 0.2, rc - 0.3, z0, bx + 0.2, rc + 0.3, zk, ('#5a4a3a', 0.15), 'keel_block')
    k.box(x0, rc - 0.08, zk, x1, rc + 0.08, zk + 0.16, ('#5a3a1e', 0.1), 'keel')
    k.tube((x1, rc, zk), (x1 + 0.6, rc, zk + h + 0.5), 0.09, ('#5a3a1e', 0.1), 'stem', verts=6, smooth=False)
    k.tube((x0, rc, zk), (x0 - 0.15, rc, zk + h + 0.8), 0.1, ('#5a3a1e', 0.1), 'sternpost', verts=6, smooth=False)
    n = 18
    for i in range(1, n):
        t = i / n
        u = x0 + t * L
        w = beam / 2 * math.sin(math.pi * min(1.0, 0.25 + 0.8 * t)) ** 0.6
        top = zk + h + 0.25 * max(0.0, t - 0.7) / 0.3
        for s in (-1, 1):
            k.tube((u, rc, zk + 0.1), (u, rc + s * w * 0.8, zk + 0.35), 0.035, ('#6a4422', 0.1), 'rib', verts=4, smooth=False)
            k.tube((u, rc + s * w * 0.8, zk + 0.35), (u, rc + s * w, zk + h * 0.6), 0.035, ('#6a4422', 0.1), 'rib', verts=4, smooth=False)
            k.tube((u, rc + s * w, zk + h * 0.6), (u, rc + s * w * 0.96, top), 0.035, ('#6a4422', 0.1), 'rib', verts=4, smooth=False)
    rings = []
    for i in range(n + 1):
        t = i / n
        u = x0 + t * L
        w = beam / 2 * math.sin(math.pi * min(1.0, 0.25 + 0.8 * t)) ** 0.6 + 0.03
        rings.append([(u, rc + w * 0.82, zk + 0.37), (u, rc + w + 0.0, zk + h * 0.55)])
    k.loft(rings[2:n - 1], ('#8a5a30', 0.08), 'planking')
    for z in (zk + 0.9, zk + 1.7):
        k.box(x0 - 0.3, rc + beam / 2 + 0.25, z, x1 + 0.3, rc + beam / 2 + 0.55, z + 0.06, ('#9a7a4a', 0.1), 'staging')
        k.box(x0 - 0.3, rc - beam / 2 - 0.55, z, x1 + 0.3, rc - beam / 2 - 0.25, z + 0.06, ('#9a7a4a', 0.1), 'staging')
    for i in range(6):
        px = x0 - 0.2 + i * (L + 0.4) / 5
        for s in (-1, 1):
            k.cyl(px, rc + s * (beam / 2 + 0.4), z0, zk + 1.9, 0.04, ('#6a5030', 0.1), 'staging_post', verts=5)


def ropewalk(k, x0, x1, r_back, r_front, roof='#5a4a42'):
    """The ropewalk: a shed a quarter-mile long (here, the yard's width), open along its front on timber posts so you
    see the work inside — hooks on stands down its length, strands stretched from the spinning wheel at one end to the
    sledge at the other, coils of finished rope, the walkers' path worn in the floor."""
    rng = random.Random(int(x0 * 3 + r_back))
    H = 2.2          # tall and shallow, so the work inside shows under the eaves at the camera's 45 degrees
    k.box(x0, r_back, -0.02, x1, r_back + 0.2, H, ('#7a6a5a', 0.12), 'house_wall')            # the back wall
    k.box(x0, r_back + 0.2, -0.04, x1, r_front, 0.0, ('#6a5a48', 0.25), 'floor_ropewalk')
    k.box(x0, r_back + 0.8, 0.0, x1, r_back + 1.2, 0.005, ('#7a6a54', 0.25), 'floor_worn')
    x = x0 + 0.1
    while x < x1:                                                                              # posts along the open front
        k.box(x, r_front - 0.14, 0.0, x + 0.14, r_front, H, (A.WOOD_D, 0.12), 'post')
        k.tube((x + 0.07, r_front - 0.07, H - 0.45), (x + 0.6, r_front - 0.07, H - 0.05), 0.035, A.WOOD_D, 'brace', verts=4)
        x += 1.5
    k.box(x0, r_front - 0.16, H - 0.12, x1, r_front + 0.02, H, (A.WOOD_D, 0.12), 'beam')
    x = x0 + 1.0
    while x < x1 - 0.6:                                                                        # the hook stands
        k.box(x - 0.05, r_back + 0.45, 0.0, x + 0.05, r_back + 0.55, 0.8, (A.WOOD, 0.12), 'hook_stand')
        k.box(x - 0.18, r_back + 0.43, 0.77, x + 0.18, r_back + 0.57, 0.83, (A.WOOD, 0.12), 'hook_stand')
        x += 2.0
    for dr, z in ((0.47, 0.85), (0.53, 0.87), (0.5, 0.81)):                                    # three strands, the whole length
        k.tube((x0 + 0.8, r_back + dr, z), (x1 - 0.8, r_back + dr, z - 0.04), 0.022, '#c8b48a', 'rope', verts=5)
    # the spinning wheel at the west end, the sledge at the east
    k.cyl_y(x0 + 0.6, r_back + 0.4, r_back + 0.5, 0.75, 0.6, 0.6, (A.WOOD, 0.12), 'wheel', verts=16)
    k.cyl_y(x0 + 0.6, r_back + 0.38, r_back + 0.52, 0.75, 0.1, 0.1, A.IRON, 'wheel_hub', verts=8)
    k.box(x1 - 1.2, r_back + 0.5, 0.0, x1 - 0.3, r_back + 1.0, 0.45, (A.WOOD_D, 0.12), 'sledge')
    for i in range(4):                                                                         # coils of finished rope
        cx_ = x0 + 3 + i * (x1 - x0 - 6) / 3 + rng.uniform(-0.5, 0.5)
        for j in range(3):
            W.annulus(k, cx_, r_back + 1.05, 0.08, 0.3 - j * 0.03, j * 0.08, j * 0.08 + 0.08, ('#b8a070', 0.25), 'rope', segs=20)
    rm, zr = W._gable_roof(k, x0 - 0.1, x1 + 0.1, r_back - 0.1, r_front + 0.1, H, 0.9, roof)
    k.point_light((x0 + x1) / 2, r_front - 0.6, 1.2, '#ffc070', 30, radius=0.6, group='flicker')
    k.solid(x0, r_back, x1, r_front)
    return rm, zr


def treadwheel_crane(k, cx, cr, jib=2.6, angle=0.35, load=True, tone='#6a4a2c'):
    """A harbour crane: a timber tower on a stone base, the great treadwheel on its front (men walk inside it to wind
    the rope), a jib reaching out at `angle` (radians, from straight out toward the camera, positive to the east) with
    a block, the rope and a crate or a net of barrels on the hook."""
    k.box(cx - 0.7, cr - 0.7, -0.02, cx + 0.7, cr + 0.7, 0.4, ('#8a8478', 0.14), 'crane_base', bevel=0.02)
    for (dx, dr) in ((-0.55, -0.55), (0.55, -0.55), (-0.55, 0.55), (0.55, 0.55)):
        k.tube((cx + dx, cr + dr, 0.4), (cx + dx * 0.6, cr + dr * 0.6, 3.0), 0.07, (tone, 0.12), 'crane_frame', verts=4, smooth=False)
    for z in (1.2, 2.2, 3.0):
        k.box(cx - 0.5, cr - 0.5, z - 0.06, cx + 0.5, cr + 0.5, z, (shade(tone, 0.9), 0.12), 'crane_frame')
    W.pyramid(k, cx - 0.55, cr - 0.55, cx + 0.55, cr + 0.55, 3.0, 3.6, ('#5a4a42', 0.12), 'roof_crane')
    # the treadwheel on its front: rim, spokes, the treads
    wc = (cx, cr + 0.85, 1.3)
    R = 1.05
    k.cyl_y(wc[0], wc[1] - 0.25, wc[1] + 0.25, wc[2], R, R, (shade(tone, 1.1), 0.12), 'treadwheel', verts=24)
    k.cyl_y(wc[0], wc[1] - 0.27, wc[1] + 0.27, wc[2], R - 0.12, R - 0.12, '#2a1a10', 'treadwheel_inside', verts=24)
    for i in range(16):
        a = i * math.pi / 8
        k.box(wc[0] + math.cos(a) * (R - 0.1) - 0.04, wc[1] - 0.24, wc[2] + math.sin(a) * (R - 0.1) - 0.04,
              wc[0] + math.cos(a) * (R - 0.1) + 0.04, wc[1] + 0.24, wc[2] + math.sin(a) * (R - 0.1) + 0.04, shade(tone, 0.85), 'tread')
    for i in range(4):
        a = i * math.pi / 4
        k.tube((wc[0] - math.cos(a) * (R - 0.1), wc[1] + 0.28, wc[2] - math.sin(a) * (R - 0.1)),
               (wc[0] + math.cos(a) * (R - 0.1), wc[1] + 0.28, wc[2] + math.sin(a) * (R - 0.1)), 0.035, shade(tone, 1.05), 'spoke', verts=4)
    k.cyl_y(wc[0], wc[1] + 0.26, wc[1] + 0.34, wc[2], 0.12, 0.12, A.IRON, 'hub', verts=10)
    # the jib, from the top of the tower out and up over the water
    top = (cx, cr, 3.2)
    tip = (cx + math.sin(angle) * jib, cr + math.cos(angle) * jib, 4.1)
    k.tube(top, tip, 0.07, (tone, 0.12), 'jib', verts=5, smooth=False)
    k.tube((cx, cr - 0.4, 3.0), tip, 0.025, '#a08a60', 'stay', verts=4)
    k.box(tip[0] - 0.09, tip[1] - 0.09, tip[2] - 0.22, tip[0] + 0.09, tip[1] + 0.09, tip[2] - 0.02, A.IRON, 'block')
    hz = 1.4
    k.tube((tip[0], tip[1], tip[2] - 0.2), (tip[0], tip[1], hz + 0.5), 0.013, '#c8b48a', 'rope', verts=4)
    k.tube((tip[0], tip[1], hz + 0.5), (tip[0], tip[1], hz + 0.3), 0.02, A.IRON, 'hook', verts=4)
    if load:
        A.crate(k, tip[0] - 0.25, tip[1] - 0.25, s=0.5, z0=hz - 0.25, tone=A.WOOD_L, solid=False)
        for s in (-1, 1):
            k.tube((tip[0], tip[1], hz + 0.4), (tip[0] + s * 0.25, tip[1], hz + 0.22), 0.01, '#c8b48a', 'rope', verts=4)
    k.solid(cx - 0.7, cr - 0.7, cx + 0.7, cr + 1.1)


def shot_pyramid(k, cx, cr, n=4, rad=0.09):
    """Round shot stacked in a pyramid."""
    for lvl in range(n):
        m = n - lvl
        for i in range(m):
            for j in range(m):
                k.sphere(cx + (i - (m - 1) / 2) * rad * 2, cr + (j - (m - 1) / 2) * rad * 2, rad + lvl * rad * 1.45, rad, rad, '#2a2a30', 'shot', segs=6)
    k.solid(cx - n * rad, cr - n * rad, cx + n * rad, cr + n * rad)


def cannon(k, cx, cr, length=1.4, angle=0.0, carriage=True):
    """A long gun lying on blocks or on its carriage, its muzzle toward +x rotated by angle."""
    ca, sa = math.cos(angle), math.sin(angle)
    a = (cx - ca * length / 2, cr - sa * length / 2, 0.38)
    b = (cx + ca * length / 2, cr + sa * length / 2, 0.42)
    if carriage:
        k.box(cx - 0.45, cr - 0.28, 0.05, cx + 0.45, cr + 0.28, 0.32, ('#7a2a1a', 0.12), 'gun_carriage')
        for (dx, dr) in ((-0.32, -0.3), (0.32, -0.3), (-0.32, 0.3), (0.32, 0.3)):
            k.cyl_y(cx + dx, cr + dr - 0.05, cr + dr + 0.05, 0.12, 0.12, 0.12, ('#5a2010', 0.12), 'gun_truck', verts=10)
    else:
        for t in (-0.3, 0.3):
            k.box(cx + ca * t * length - 0.12, cr + sa * t * length - 0.25, 0.0, cx + ca * t * length + 0.12, cr + sa * t * length + 0.25, 0.26, (A.WOOD, 0.14), 'gun_block')
    k.tube(a, b, 0.13, ('#2a2c34', 0.1), 'gun_barrel', verts=10)
    k.sphere(a[0], a[1], a[2], 0.14, 0.14, '#2a2c34', 'gun_cascabel', segs=8)
    k.solid(cx - 0.5, cr - 0.3, cx + 0.5, cr + 0.3)


def anchor(k, cx, cr, s=1.0):
    """A great anchor laid on the ground: shank, stock, arms and flukes."""
    k.tube((cx - 0.75 * s, cr, 0.08), (cx + 0.75 * s, cr, 0.08), 0.055 * s, '#2e2e34', 'anchor', verts=8)
    k.tube((cx - 0.7 * s, cr - 0.45 * s, 0.07), (cx - 0.7 * s, cr + 0.45 * s, 0.07), 0.05 * s, '#3a2a1a', 'anchor_stock', verts=8)
    for sd in (-1, 1):
        k.tube((cx + 0.75 * s, cr, 0.08), (cx + 1.0 * s, cr + sd * 0.45 * s, 0.08), 0.05 * s, '#2e2e34', 'anchor', verts=8)
        k.blob(cx + 1.04 * s, cr + sd * 0.5 * s, 0.08, 0.13 * s, 0.09 * s, 0.04, '#2e2e34', 'anchor', segs=8)
    k.cyl_y(cx - 0.9 * s, cr - 0.06, cr + 0.06, 0.13 * s, 0.13 * s, 0.13 * s, '#2e2e34', 'anchor', verts=10)
    k.solid(cx - 0.9 * s, cr - 0.5 * s, cx + 1.1 * s, cr + 0.5 * s)


def timber_stack(k, x0, x1, cr, layers=3, tone='#8a6a3a'):
    """Baulks of oak stacked to season, sticks between the layers."""
    for j in range(layers):
        for dr in (-0.25, 0.0, 0.25):
            k.tube((x0, cr + dr, 0.12 + j * 0.22), (x1, cr + dr, 0.12 + j * 0.22), 0.1, (shade(tone, 0.85 + 0.1 * ((j + int(dr * 8)) % 2)), 0.12), 'timber', verts=8)
        for x in (x0 + 0.3, (x0 + x1) / 2, x1 - 0.3):
            k.box(x - 0.04, cr - 0.4, 0.22 + j * 0.22, x + 0.04, cr + 0.4, 0.25 + j * 0.22, '#5a4026', 'timber_stick')
    k.solid(x0, cr - 0.4, x1, cr + 0.4)


# ---- the stilts under the quays ------------------------------------------------------------------------------------------
PLANKS = ('#7a5a3a', '#6a4a30', '#8a6a44', '#5e4430', '#74583c')


def boardwalk(k, cells, z=0.0, deep=-1.6, rng=None, rails=True):
    """Boardwalks on stilts over the water: each walkable cell decked in planks running across it (each its own tone,
    the odd one missing or patched), a stilt at the corners where cells meet, rope rails along edges with water beyond."""
    rng = rng or k.rng
    cells = set(cells)
    for (c, r) in cells:
        y = r + 0.02
        while y < r + 0.98:
            w = rng.uniform(0.18, 0.26)
            if rng.random() > 0.03:
                k.box(c + 0.01, y, z - 0.08, c + 0.99, min(r + 0.99, y + w) - 0.02, z, (rng.choice(PLANKS), 0.2), 'path_planks')
            y += w
        k.box(c, r, z - 0.2, c + 1.0, r + 1.0, z - 0.08, ('#3a2a1c', 0.14), 'walk_joist')
    posts = set()
    for (c, r) in cells:
        for (pc, pr) in ((c, r), (c + 1, r), (c, r + 1), (c + 1, r + 1)):
            posts.add((pc, pr))
    for (pc, pr) in posts:
        if rng.random() < 0.85:
            k.cyl(pc + rng.uniform(-0.05, 0.05), pr, deep, z - 0.05, 0.07, (rng.choice(('#4a3624', '#3a2a1c', '#5a4430')), 0.16), 'stilt', verts=7)
    if rails:
        for (c, r) in cells:
            for (dc, dr, a, b) in ((0, 1, (c, r + 1), (c + 1, r + 1)), (-1, 0, (c, r), (c, r + 1)), (1, 0, (c + 1, r), (c + 1, r + 1))):
                if (c + dc, r + dr) not in cells and rng.random() < 0.8:
                    k.tube((a[0], a[1], z + 0.45), (b[0], b[1], z + 0.45), 0.018, '#a08a60', 'rope_rail', verts=4)
                    for p in (a, b):
                        k.cyl(p[0], p[1], z, z + 0.5, 0.03, '#4a3624', 'rail_post', verts=5)


def shack(k, x0, x1, r_back, r_front, rng=None, roof=None, lit=True, pipe=True, z=0.0):
    """A shack on the boardwalk: walls of odd planks (some tarred, some painted long ago), a door of three boards, a
    small window glowing, a lean-to roof of tarred boards and patches of tin, a stovepipe, a lantern on a nail."""
    rng = rng or k.rng
    H = rng.uniform(1.25, 1.55)
    k.box(x0, r_back, z, x1, r_front, H, ('#4a3626', 0.14), 'shack_wall')
    x = x0
    while x < x1 - 0.02:                                         # the front's boards, upright, each its own
        w = rng.uniform(0.14, 0.24)
        k.box(x + 0.005, r_front - 0.02, z, min(x1, x + w) - 0.005, r_front + 0.02, H - rng.uniform(0.0, 0.06),
              (rng.choice(('#6a4a30', '#5a4430', '#7a5a3a', '#3a3a3e', '#4a5a5a', '#6a3a2a', '#5a5a40')), 0.2), 'shack_board')
        x += w
    dx = rng.uniform(x0 + 0.35, x1 - 0.35)
    k.box(dx - 0.25, r_front + 0.02, z, dx + 0.25, r_front + 0.05, 1.05, ('#3a2a1c', 0.14), 'door')
    for zz in (0.25, 0.8):
        k.box(dx - 0.25, r_front + 0.05, zz, dx + 0.25, r_front + 0.07, zz + 0.06, '#2a1a10', 'door_batten')
    wx = x0 + 0.35 if dx - x0 > x1 - dx else x1 - 0.35
    if lit:
        k.box(wx - 0.16, r_front + 0.02, 0.6, wx + 0.16, r_front + 0.05, 0.92, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.8))
        k.box(wx - 0.2, r_front + 0.02, 0.56, wx + 0.2, r_front + 0.07, 0.6, '#3a2a1c', 'sill')
    # the lean-to roof: tarred boards, a sheet or two of tin
    k.quads([((x0 - 0.12, r_back - 0.1, H + 0.32), (x1 + 0.12, r_back - 0.1, H + 0.32), (x1 + 0.12, r_front + 0.3, H - 0.05), (x0 - 0.12, r_front + 0.3, H - 0.05))],
            (roof or rng.choice(('#2e2a28', '#3a3430', '#4a4038')), 0.16), 'roof_tar')
    for _ in range(rng.randint(1, 3)):
        a = rng.uniform(x0, x1 - 0.6)
        t0 = rng.uniform(0.0, 0.5)
        k.quads([((a, r_back + t0 * (r_front - r_back), H + 0.33 - t0 * 0.37), (a + 0.6, r_back + t0 * (r_front - r_back), H + 0.33 - t0 * 0.37),
                  (a + 0.6, r_back + (t0 + 0.4) * (r_front - r_back), H + 0.33 - (t0 + 0.4) * 0.37), (a, r_back + (t0 + 0.4) * (r_front - r_back), H + 0.33 - (t0 + 0.4) * 0.37))],
                (rng.choice(('#7a7e84', '#8a6a5a', '#6a7070')), 0.12), 'roof_tin')
    top = None
    if pipe:
        px, pr = x1 - 0.3, r_back + 0.3
        k.cyl(px, pr, H + 0.1, H + 0.85, 0.06, ('#2a2a2e', 0.08), 'stovepipe', verts=8)
        k.cyl(px, pr, H + 0.85, H + 0.92, 0.1, '#2a2a2e', 'stovepipe', verts=8)
        top = (px, pr, H + 0.95)
    if lit:
        W.lantern(k, dx + 0.42, r_front + 0.08, 1.1, 1.3, s=0.06, energy=8)
    k.solid(x0, r_back, x1, r_front)
    return top
