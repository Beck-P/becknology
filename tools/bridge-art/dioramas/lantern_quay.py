"""Lantern Quay — a purpose-made Look Book 2 diorama of Lumar's harbour (scenekit, the game's own Blender kit).

  SCENE_CYCLE=night BVENV/bin/python tools/bridge-art/dioramas/lantern_quay.py OUT && python3 tools/bridge-art/scene_post.py OUT OUT/post

Look Book 1's composition, built as real 3D: a row of tall timber-framed harbour houses across the top (jettied upper
floors, coursed stone below, shuttered windows with flower boxes, an inn with a hanging sign, a fishmonger under a
striped awning, a chandlery, a narrow house, a warehouse with a hoist), a pavement of flags and a cobbled quay with
worn patches, crates, barrels, rope, nets drying, lobster pots, a cart, an anchor, bollards and lamp posts, a coped
quay wall of dressed stone with weed at the waterline, steps down and a ladder; then the harbour — a water surface
the engine ripples and mirrors, a moored sloop with its sail furled on the boom, two rowboats on their lines, a buoy.
About 17 × 11 tiles: it builds in seconds.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from scenekit import Kit, shade  # noqa: E402
import assets_lumar as A          # noqa: E402
import assets_town as W           # noqa: E402
import assets_coast as C          # noqa: E402
import assets_village as V        # noqa: E402

OUT = sys.argv[1]
COLS, ROWS = 17, 11
k = Kit(COLS, ROWS, margin_top=2.8, margin_bottom=0.4, margin_x=0.0, seed=4247)
rng = k.rng

F = 3.1          # the houses' ground-floor fronts
J = 0.2          # how far an upper floor oversails
ZJ = 1.62        # the jetty's height (ground floors tall enough for our chibis to walk in)
DEPTH = 2.6
Q = 6.25         # the quay's edge
WZ = -0.55       # the harbour's surface
SALT = W.SALT
STONE = A.STONE
STONE_L = '#9a9284'


def mix(a, b, t):
    return W._mix(a, b, t)


# ---- ground ----------------------------------------------------------------------------------------------------
k.box(-1.0, -3.0, -0.25, COLS + 1.0, F, -0.01, ('#2a2826', 0.1), 'ground')          # behind and under the houses

# the pavement along the fronts: big flags, a hair apart
k.box(-1.0, F, -0.14, COLS + 1.0, F + 0.8, -0.03, ('#2a2724', 0.15), 'grout')
r = F + 0.02
while r < F + 0.76:
    x = -1.0 + rng.uniform(0, 0.3)
    h = rng.choice((0.36, 0.38))
    while x < COLS + 1.0:
        w = rng.choice((0.48, 0.56, 0.62, 0.7))
        k.box(x + 0.02, r + 0.02, -0.05, x + w - 0.02, min(F + 0.78, r + h) - 0.02, 0.0,
              (shade('#8a8478', rng.uniform(0.86, 1.1)), 0.12), 'flagstone', bevel=0.012)
        x += w
    r += h
k.box(-1.0, F + 0.78, -0.06, COLS + 1.0, F + 0.86, 0.01, (shade(STONE_L, 0.9), 0.1), 'kerb_flag', bevel=0.01)


# the cobbles, worn bare in a few places (packed sand and grit between)
def worn(x, r):
    n = math.sin(x * 1.3 + 0.7) * math.cos(r * 2.1 - x * 0.4) + math.sin(x * 0.37 + r * 0.9) + 0.4 * math.sin(x * 3.1 + r * 4.7)
    return n > 1.32


k.box(-1.0, F + 0.86, -0.07, COLS + 1.0, Q - 0.3, -0.012, ('#7a6e5c', 0.3), 'path_grit')   # sandy grit between the stones
W.cobbles(k, -1.0, F + 0.86, COLS + 1.0, Q - 0.3, tone='#9a9080', size=0.26, skip=worn)

# the coping along the quay's edge: long dressed stones, a little proud
x = -1.0
while x < COLS + 1.0:
    w = rng.uniform(0.55, 0.95)
    k.box(x + 0.015, Q - 0.3, -0.04, x + w - 0.015, Q + 0.02, 0.05, (shade(STONE_L, rng.uniform(0.88, 1.08)), 0.14),
          'quay_coping', bevel=0.025)
    x += w

# the quay wall: coursed blocks down to the water, weed and wet at the waterline
k.box(-1.0, F + 0.8, -1.4, COLS + 1.0, Q - 0.02, -0.04, (SALT[2], 0.1), 'quay_core')
z = -0.06
row_i = 0
while z > -1.2:
    hgt = rng.uniform(0.2, 0.25)
    x = -1.0 - (0.25 if row_i % 2 else 0.0)
    while x < COLS + 1.0:
        w = rng.uniform(0.42, 0.78)
        wet = max(0.0, min(1.0, (-0.28 - z) / 0.3))
        base = mix(shade(STONE, rng.uniform(0.78, 1.0)), '#3a463a', 0.55 * wet)
        k.box(x + 0.02, Q - 0.02, z - hgt + 0.02, x + w - 0.02, Q + 0.035 + rng.uniform(0, 0.015), z,
              (base, 0.16), 'quay_wall', bevel=0.02)
        x += w
    z -= hgt
    row_i += 1
# a band of weed and barnacles at the tide line
for i in range(70):
    x = rng.uniform(-0.8, COLS + 0.8)
    k.blob(x, Q + 0.05, WZ + rng.uniform(0.02, 0.14), rng.uniform(0.06, 0.16), 0.03, rng.uniform(0.03, 0.06),
           (rng.choice(('#2a3a26', '#334428', '#3e4a2c', '#5a5a48')), 0.2), 'weed', segs=6)

# steps down to the water, cut along the wall
SX0 = 1.6
for i in range(6):
    x0 = SX0 + i * 0.36
    zt = -0.02 - (i + 1) * 0.12
    k.box(x0, Q + 0.02, zt - 0.14, x0 + 0.36, Q + 0.62, zt, (shade(STONE_L, rng.uniform(0.85, 1.0)), 0.14), 'steps',
          bevel=0.02)
    k.box(x0, Q + 0.58, zt - 0.02, x0 + 0.36, Q + 0.62, zt, shade(STONE_L, 1.15), 'step_nose')
k.box(SX0 - 0.12, Q + 0.62, -1.0, SX0 + 6 * 0.36, Q + 0.72, -0.62, (SALT[2], 0.15), 'steps_side')
for i in range(5):                                   # an iron rail down the stair's open side
    k.cyl(SX0 + 0.1 + i * 0.44, Q + 0.68, -0.12 - i * 0.12 * 1.2, 0.48 - i * 0.12 * 1.2, 0.022, A.IRON, 'rail', verts=6)
k.tube((SX0 + 0.1, Q + 0.68, 0.48), (SX0 + 0.1 + 4 * 0.44, Q + 0.68, 0.48 - 4 * 0.144), 0.025, A.IRON, 'rail', verts=6)

# an iron ladder down the wall, and mooring rings
LX = 12.75
for dx in (-0.16, 0.16):
    k.tube((LX + dx, Q + 0.07, 0.32), (LX + dx, Q + 0.07, -1.0), 0.022, A.IRON, 'ladder', verts=6)
zz = 0.2
while zz > -0.9:
    k.cyl_x(LX - 0.16, LX + 0.16, Q + 0.07, zz, 0.016, 0.016, A.IRON, 'ladder', verts=6)
    zz -= 0.17
for rx in (5.2, 9.55, 15.3):
    k.cyl_y(rx, Q + 0.03, Q + 0.07, -0.2, 0.09, 0.09, A.IRON, 'mooring_ring', verts=12)
    k.cyl_y(rx, Q + 0.02, Q + 0.08, -0.2, 0.05, 0.05, SALT[1], 'mooring_ring_hole', verts=10)

# the harbour's surface (the engine draws the water: colour by depth, reflections, glints, night streaks)
k.box(-1.5, Q + 0.02, WZ - 0.06, COLS + 1.5, ROWS + 1.0, WZ, '#2a5a66', 'pond_water')


# ---- the houses --------------------------------------------------------------------------------------------------
def shop_window(x0, x1, z0, z1, rf, frame='#3a2a1e', panes=(4, 2)):
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


def corbels(x0, x1):
    x = x0 + 0.25
    while x < x1 - 0.2:
        k.box(x - 0.05, F - 0.02, ZJ - 0.34, x + 0.05, F + J - 0.04, ZJ - 0.22, A.WOOD_DD, 'corbel')
        k.box(x - 0.05, F - 0.02, ZJ - 0.22, x + 0.05, F + J, ZJ - 0.08, A.WOOD_DD, 'corbel')
        x += 0.62


def framing(x0, x1, z0, z1, rf, timber, openings):
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
    # braces in the bays without a window
    for a, b in zip(posts, posts[1:]):
        mid = (a + b) / 2
        if b - a > 0.45 and not any(oa - 0.2 < mid < ob + 0.2 for (oa, ob) in openings):
            k.tube((a + 0.12, rf + 0.03, z0 + 0.12), (b, rf + 0.03, z1 - 0.12), 0.045, (timber, 0.12), 'timber', verts=4,
                   smooth=False)


def coursed(x0, x1, z0, z1, rf, tone, skip=()):
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


def harbour_house(x0, x1, wall_h, rise, roof, wall, ground='stone', timber=None, door_x=None, door_w=0.72,
                  shop=None, win_down=(), win_up=(), win_up2=(), chimney=None, sign=None, lanterns=(), dormers=(),
                  awning=None, hoist=False, boards=False):
    timber = timber or rng.choice((A.WOOD_DD, '#2a2220', '#5a4a3c', '#3a3028'))
    shutters = rng.choice(('#2a4a3a', '#3a4a6a', '#6a2a2a', '#4a5a3a', '#2a3a4a', '#7a6a3a'))
    rb = F - DEPTH
    k.box(x0, rb, -0.02, x1, F, 0.3, (SALT[2], 0.16), 'footing', bevel=0.02)
    k.box(x0 + 0.04, rb + 0.04, 0.3, x1 - 0.04, F - 0.02, ZJ, (wall if ground != 'stone' else STONE, 0.08), 'house_wall')
    # openings on the ground floor (for the stones to leave clear)
    holes = []
    if door_x is not None:
        holes.append((door_x - door_w / 2 - 0.1, door_x + door_w / 2 + 0.1, 0.0, 1.7))
    if shop:
        holes.append((shop[0] - 0.12, shop[1] + 0.12, 0.3, ZJ))
    for (wx, wz) in win_down:
        holes.append((wx - 0.4, wx + 0.4, wz - 0.12, wz + 0.88))
    if ground == 'stone':
        coursed(x0 + 0.04, x1 - 0.04, 0.3, ZJ - 0.06, F - 0.0, STONE, skip=holes)
    else:
        T = [(x0 + 0.04, F - 0.03, 0.3, x0 + 0.16, F + 0.02, ZJ), (x1 - 0.16, F - 0.03, 0.3, x1 - 0.04, F + 0.02, ZJ)]
        k.boxes(T, (timber, 0.12), 'timber')
    # the upper floor oversails the ground floor on its corbels
    k.box(x0 + 0.01, rb + 0.04, ZJ, x1 - 0.01, F + J, wall_h, (wall, 0.08), 'house_wall')
    k.box(x0 - 0.01, F - 0.06, ZJ - 0.1, x1 + 0.01, F + J + 0.03, ZJ + 0.03, (timber, 0.12), 'timber', bevel=0.01)
    corbels(x0, x1)
    rf = F + J
    if boards:          # the warehouse: weatherboards up there instead of plaster and timber
        zz = ZJ + 0.04
        while zz < wall_h - 0.05:
            k.box(x0 + 0.02, rf - 0.005, zz, x1 - 0.02, rf + 0.03, zz + 0.16, (shade(wall, rng.uniform(0.86, 1.06)), 0.14), 'boards')
            k.box(x0 + 0.02, rf + 0.02, zz, x1 - 0.02, rf + 0.035, zz + 0.025, shade(wall, 0.6), 'board_shadow')
            zz += 0.17
    else:
        opens = [(wx - 0.3, wx + 0.3) for (wx, _wz) in list(win_up) + list(win_up2)]
        framing(x0, x1, ZJ + 0.03, wall_h, rf, timber, opens)
    flowers_pick = lambda: rng.choice((None, ('#e04060', '#e0c040'), ('#a060d0', '#e0e0f0'), ('#e07030', '#e0c040'), ('#f0f0f0', '#e04060')))
    for (wx, wz) in win_up:
        W.window(k, wx, rf + 0.02, wz, w=0.48, h=0.6, shutters=shutters, flowers=flowers_pick())
    for (wx, wz) in win_up2:
        W.window(k, wx, rf + 0.02, wz, w=0.44, h=0.52, shutters=shutters)
    for (wx, wz) in win_down:
        W.window(k, wx, F + 0.02, wz, w=0.52, h=0.72, shutters=shutters, flowers=flowers_pick())
    if shop:
        shop_window(shop[0], shop[1], 0.52, 1.36, F)
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
        hx = (x0 + x1) / 2
        k.box(hx - 0.07, rf - 0.3, wall_h + 0.2, hx + 0.07, rf + 0.85, wall_h + 0.34, (A.WOOD_D, 0.12), 'hoist_beam')
        k.cyl_x(hx - 0.06, hx + 0.06, rf + 0.72, wall_h + 0.1, 0.09, 0.09, A.IRON, 'pulley', verts=10)
        k.tube((hx, rf + 0.72, wall_h + 0.02), (hx, rf + 0.72, 2.0), 0.014, '#a08a60', 'rope', verts=5)
        A.crate(k, hx - 0.25, rf + 0.47, s=0.5, z0=1.55, tone=A.WOOD_L, solid=False)
        # the loft door it serves
        k.box(hx - 0.42, rf, wall_h - 1.05, hx + 0.42, rf + 0.06, wall_h - 0.08, (A.WOOD_D, 0.16), 'loft_door')
        k.box(hx - 0.46, rf, wall_h - 1.09, hx + 0.46, rf + 0.05, wall_h - 1.04, A.WOOD_DD, 'door_frame')
    k.solid(x0, rb, x1, F)
    return rm, zr


SMOKE = []
houses = [
    dict(x0=-0.6, x1=2.85, wall_h=2.90, rise=1.45, roof=W.ROOF_SLATE, wall='#e6d6b4', door_x=1.55,
         win_down=[(0.5, 0.62)], win_up=[(0.55, 1.92), (2.25, 1.92)], chimney=2.4, lanterns=(2.25,)),
    dict(x0=2.85, x1=6.35, wall_h=3.65, rise=1.6, roof=W.ROOF_GREEN, wall='#e2c88e', door_x=4.6, door_w=0.95,
         win_down=[(3.55, 0.62), (5.65, 0.62)], win_up=[(3.55, 1.92), (4.6, 1.92), (5.65, 1.92)],
         win_up2=[(3.55, 2.82), (4.6, 2.82), (5.65, 2.82)], chimney=3.45, sign=(6.1, 2.25, 'mug'), lanterns=(3.95, 5.25),
         dormers=(4.6,)),
    dict(x0=6.35, x1=8.95, wall_h=2.80, rise=1.35, roof=W.ROOF_RED, wall='#e4c4ac', ground='plaster', door_x=8.35,
         shop=(6.6, 7.85), awning=('#b23a34', '#ece0c8'), win_up=[(7.0, 1.92), (8.25, 1.92)], chimney=7.1),
    dict(x0=8.95, x1=11.95, wall_h=3.25, rise=1.55, roof=W.ROOF_PURPLE, wall='#d4dccc', door_x=9.6,
         shop=(10.15, 11.6), win_up=[(9.6, 1.92), (10.75, 1.92), (11.5, 1.92)], win_up2=[(10.15, 2.62)],
         chimney=11.35, sign=(9.15, 2.15, 'compass'), lanterns=(9.15,)),
    dict(x0=11.95, x1=14.35, wall_h=3.75, rise=1.7, roof='#2e5a4a', wall='#ecdcbc', ground='plaster', door_x=13.55,
         win_down=[(12.55, 0.62)], win_up=[(12.6, 1.92), (13.7, 1.92)], win_up2=[(13.15, 2.9)], chimney=12.45),
    dict(x0=14.35, x1=17.8, wall_h=3.35, rise=1.5, roof='#3a4256', wall='#7a5a3e', door_x=15.75, door_w=1.3,
         boards=True, hoist=True, win_down=[(17.1, 0.62)], chimney=None),
]
for h in houses:
    rm, zr = harbour_house(**h)
    if h.get('chimney') is not None:
        SMOKE.append((h['chimney'], rm - 0.15, zr + 0.75))

# ---- life on the quay --------------------------------------------------------------------------------------------
W.bench(k, 0.25, 1.35, F + 0.42)
# the inn: barrels and a crate stack by its door
for (bx, br, bh) in ((3.25, F + 0.62, 0.72), (3.75, F + 0.55, 0.72), (3.5, F + 1.0, 0.62)):
    A.barrel(k, bx, br, h=bh, radius=0.24, tone=rng.choice((A.WOOD, shade(A.WOOD, 0.85))))
A.crate(k, 5.35, F + 0.95, s=0.48)
A.crate(k, 5.85, F + 1.05, s=0.44, tone=shade(A.WOOD_L, 0.9))
A.crate(k, 5.5, F + 0.98, s=0.42, z0=0.41, tone=shade(A.WOOD_L, 1.08), contents='apples')
# the fishmonger's stall under the awning: fish on ice, a scale
k.box(6.6, F + 0.55, 0.0, 7.95, F + 1.0, 0.62, (A.WOOD, 0.14), 'stall', bevel=0.01)
k.box(6.65, F + 0.58, 0.62, 7.9, F + 0.97, 0.7, ('#dfeef2', 0.06), 'ice')
for i in range(9):
    fx = 6.78 + (i % 5) * 0.24 + rng.uniform(-0.03, 0.03)
    fr = F + 0.68 + (i // 5) * 0.17
    k.blob(fx, fr, 0.73, 0.1, 0.045, 0.03, (rng.choice(('#9ab0b8', '#b8c4c8', '#8a9aa6', '#c87a5a')), 0.08), 'fish', segs=8)
k.cyl(7.75, F + 0.78, 0.7, 0.98, 0.012, A.IRON, 'scale', verts=6)
k.cyl(7.75, F + 0.78, 0.98, 1.0, 0.1, A.BRASS, 'scale', verts=12)
# the chandlery: coils of rope, floats, a lobster pot or two
for (cx, cr, n) in ((10.6, F + 0.65, 3), (11.15, F + 0.7, 2)):
    for j in range(n):
        W.annulus(k, cx, cr, 0.08, 0.24 - j * 0.02, j * 0.07, j * 0.07 + 0.07, ('#b8a070', 0.25), 'rope', segs=20)
for i in range(5):
    k.sphere(11.6 + (i % 3) * 0.13, F + 1.05 + (i // 3) * 0.12, 0.08, 0.075, 0.07, rng.choice(('#e05a30', '#f0f0e8', '#e05a30')), 'float', segs=10)
for (px, pr) in ((12.05, F + 1.45), (12.6, F + 1.32)):
    k.box(px - 0.26, pr - 0.17, 0.0, px + 0.26, pr + 0.17, 0.05, (A.WOOD, 0.14), 'pot_base')
    k.cyl_x(px - 0.26, px + 0.26, pr, 0.08, 0.17, 0.2, ('#7a6a48', 0.3), 'lobster_pot', verts=10)
    for dx in (-0.2, 0.0, 0.2):
        k.cyl_x(px + dx - 0.015, px + dx + 0.015, pr, 0.08, 0.175, 0.205, A.WOOD_D, 'pot_hoop', verts=10)
# nets drying on a rack in front of the narrow house
NX0, NX1, NR = 13.05, 14.9, F + 1.25
for nx in (NX0, NX1):
    k.cyl(nx, NR, 0.0, 1.35, 0.045, (A.WOOD_D, 0.12), 'net_post', verts=8)
k.cyl_x(NX0 - 0.08, NX1 + 0.08, NR, 1.3, 0.035, 0.035, (A.WOOD, 0.12), 'net_pole', verts=8)
cords = []
for i in range(14):
    x = NX0 + 0.08 + (NX1 - NX0 - 0.16) * i / 13
    sag = 0.05 * math.sin(i * 1.7)
    cords.append((x - 0.008, NR - 0.01, 0.28 + sag, x + 0.008, NR + 0.01, 1.28))
for j in range(9):
    z = 0.3 + j * 0.11
    cords.append((NX0 + 0.08, NR - 0.01, z - 0.008, NX1 - 0.08, NR + 0.01, z + 0.008))
k.boxes(cords, '#4a5a52', 'net')
for i in range(6):
    k.sphere(NX0 + 0.2 + i * 0.3, NR + 0.02, 0.27, 0.045, 0.045, '#e8a040', 'float', segs=8)
k.solid(NX0, NR - 0.2, NX1, NR + 0.2)
# the warehouse: sacks and a cart
V.sacks(k, 16.55, F + 0.7, n=4)
W.cart(k, 15.2, F + 1.55)
# an anchor laid on the cobbles by the edge
AX, AR = 8.6, Q - 0.85
k.tube((AX - 0.55, AR, 0.07), (AX + 0.55, AR, 0.07), 0.04, '#2e2e34', 'anchor', verts=8)
k.tube((AX - 0.5, AR - 0.3, 0.06), (AX - 0.5, AR + 0.3, 0.06), 0.035, '#2e2e34', 'anchor', verts=8)
for s in (-1, 1):
    k.tube((AX + 0.55, AR, 0.07), (AX + 0.75, AR + s * 0.32, 0.07), 0.035, '#2e2e34', 'anchor', verts=8)
    k.blob(AX + 0.78, AR + s * 0.36, 0.07, 0.09, 0.06, 0.03, '#2e2e34', 'anchor', segs=8)
k.cyl_y(AX - 0.68, AR - 0.06, AR + 0.06, 0.1, 0.1, 0.1, '#2e2e34', 'anchor', verts=10)
for (bx, br) in ((6.35, F + 1.35), (6.75, F + 1.5)):            # fish baskets by the stall
    k.cyl(bx, br, 0.0, 0.26, 0.2, ('#a88a58', 0.3), 'basket', verts=12)
    k.cyl(bx, br, 0.24, 0.27, 0.205, '#7a603a', 'basket_rim', verts=12)
    for i in range(4):
        k.blob(bx + rng.uniform(-0.1, 0.1), br + rng.uniform(-0.08, 0.08), 0.29, 0.08, 0.035, 0.025, '#a4b8bc', 'fish', segs=8)
k.blob(3.75, F + 0.55, 0.82, 0.11, 0.08, 0.07, '#e8a050', 'cat', segs=10)              # a cat asleep on a barrel
k.sphere(3.85, F + 0.6, 0.86, 0.06, 0.05, '#e8a050', 'cat', segs=8)
k.tube((3.65, F + 0.5, 0.78), (3.55, F + 0.62, 0.74), 0.02, '#d89040', 'cat', verts=5)
for (tx, fl) in ((2.15, ('#e04060', '#f0d040')), (6.15, ('#a060d0', '#f0f0f0')), (11.85, ('#e07030', '#f0d040'))):
    k.cyl(tx, F + 0.42, 0.0, 0.28, 0.17, ('#9a5a3a', 0.1), 'tub', verts=12)
    with k.foliage('leaf'):
        k.blob(tx, F + 0.42, 0.38, 0.2, 0.16, 0.14, ('#3a6a30', 0.2), 'tub_plant', segs=10)
    k.boxes([(tx + rng.uniform(-0.13, 0.11), F + 0.42 + rng.uniform(-0.1, 0.08), 0.46 + rng.uniform(0, 0.05),
              tx + rng.uniform(-0.13, 0.11) + 0.04, F + 0.42 + rng.uniform(-0.1, 0.08) + 0.04, 0.5 + rng.uniform(0, 0.05)) for _ in range(6)],
            rng.choice(fl), 'flower')
k.bar(4.95, F + 0.5, 5.2, F + 0.62, 0.0, 0.7, 0.04, (A.WOOD_D, 0.1), 'chalkboard_leg')               # a chalkboard by the inn door
k.box(4.98, F + 0.52, 0.32, 5.26, F + 0.6, 0.72, '#2a2e2a', 'chalkboard')
k.boxes([(5.01, F + 0.6, 0.62, 5.2, F + 0.61, 0.635), (5.01, F + 0.6, 0.55, 5.16, F + 0.61, 0.565), (5.01, F + 0.6, 0.48, 5.22, F + 0.61, 0.495)], '#e8e4d8', 'chalk')
for i in range(3):                                                                                  # pots stacked by the chandlery
    k.cyl_x(13.35 - 0.26, 13.35 + 0.26, F + 1.95, 0.12 + i * 0.0, 0.16, 0.18, ('#7a6a48', 0.3), 'lobster_pot', verts=10) if i == 0 else None
V.sacks(k, 1.15, Q - 1.0, n=3, col=('#c8b890', '#d8c8a0', '#b8a880'))
k.blob(10.9, Q - 0.75, 0.1, 0.1, 0.06, 0.07, '#f0f0ec', 'gull', segs=10)                         # a gull on the cobbles
k.blob(10.98, Q - 0.75, 0.18, 0.05, 0.045, 0.05, '#f4f4f0', 'gull', segs=8)
k.cone(11.04, Q - 0.75, 0.17, 0.19, 0.02, 0.0, '#e0a030', 'gull', verts=4)
k.blob(10.86, Q - 0.75, 0.13, 0.08, 0.05, 0.02, '#8a9098', 'gull', segs=8)
A.crate(k, 2.95, Q - 1.15, s=0.42, tone=shade(A.WOOD_L, 0.95))
A.barrel(k, 7.95, Q - 1.05, h=0.68, radius=0.23, tone=shade(A.WOOD, 0.9))
# bollards and lamps along the edge
BOLLARDS = [(4.95, Q - 0.5), (9.95, Q - 0.5), (14.9, Q - 0.5)]
for (bx, br) in BOLLARDS:
    k.cyl(bx, br, 0.0, 0.08, 0.17, A.IRON, 'bollard', verts=12)
    k.cyl(bx, br, 0.08, 0.42, 0.11, ('#2e3238', 0.1), 'bollard', verts=12)
    k.sphere(bx, br, 0.44, 0.15, 0.08, '#2e3238', 'bollard', segs=12)
    k.solid_post(bx, br)
W.lantern_post(k, 7.15, Q - 0.6, h=2.25, energy=32)
W.lantern_post(k, 12.0, Q - 0.6, h=2.25, energy=32)
# a few gull feathers and fish scraps, a dropped crate lid, a bucket
A.bucket(k, 2.55, Q - 0.75)
k.box(13.3, Q - 1.0, 0.0, 13.75, Q - 0.82, 0.03, (A.WOOD_L, 0.18), 'crate_lid')


# ---- the harbour: a sloop and two rowboats on their lines, a buoy --------------------------------------------------
def sloop(x0, x1, rc, beam=1.2, hull='#3a2a1c', strake='#2a5a52', sail='#e4d8bc'):
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
    for i in range(1, 7):          # deck planks
        rr = rc - beam * 0.42 + beam * 0.84 * i / 7
        k.box(x0 + L * 0.1, rr - 0.007, gun(0.5) - 0.06, x0 + L * 0.92, rr + 0.007, gun(0.5) - 0.042, '#5a3e24', 'deck_seam')
    # a hatch, a coil of rope, a crate and a water cask on deck
    hx = x0 + L * 0.72
    k.box(hx - 0.22, rc - 0.2, gun(0.72) - 0.06, hx + 0.22, rc + 0.2, gun(0.72) + 0.06, (A.WOOD_D, 0.12), 'hatch', bevel=0.015)
    W.annulus(k, x0 + L * 0.84, rc + beam * 0.18, 0.05, 0.15, gun(0.84) - 0.06, gun(0.84) + 0.0, ('#b8a070', 0.25), 'rope', segs=16)
    A.crate(k, x0 + L * 0.62, rc - beam * 0.38, s=0.3, z0=gun(0.62) - 0.06, solid=False)
    k.cyl(x0 + L * 0.5, rc + beam * 0.3, gun(0.5) - 0.06, gun(0.5) + 0.22, 0.1, (A.WOOD, 0.12), 'cask', verts=12)
    cx0, cx1 = x0 + L * 0.18, x0 + L * 0.46            # the cabin aft
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
    # the mainsail furled along the boom: lumpy folds and a few ties
    x = x0 + L * 0.1
    while x < mx - 0.1:
        k.blob(x + 0.12, rc, zb + 0.09, 0.16, 0.09 + rng.uniform(-0.01, 0.015), 0.08, (shade(sail, rng.uniform(0.92, 1.04)), 0.06), 'furled_sail', segs=10)
        x += 0.22
    for t in (0.2, 0.33, 0.46):
        xx = x0 + L * t + 0.4
        k.cyl_x(xx - 0.015, xx + 0.015, rc, zb + 0.09, 0.105, 0.1, '#8a6a40', 'sail_tie', verts=8)
    top = (mx, rc, gun(0.58) + 3.55)
    k.tube(top, (x1 - 0.05, rc, gun(1.0) + 0.05), 0.012, '#4a3a2a', 'rigging', verts=4)        # the forestay
    k.tube(top, (x0 + 0.1, rc, gun(0.0) + 0.1), 0.012, '#4a3a2a', 'rigging', verts=4)          # the backstay
    for s in (-1, 1):
        k.tube((mx, rc, gun(0.58) + 2.6), (mx - 0.1, rc + s * beam * 0.48, gun(0.58)), 0.01, '#4a3a2a', 'rigging', verts=4)
    k.tube((x1 - 0.1, rc, gun(1.0)), (x1 + 0.7, rc, gun(1.0) + 0.15), 0.035, (A.WOOD, 0.1), 'bowsprit', verts=8)
    W.lantern(k, x0 + 0.2, rc, gun(0.0) + 0.05, gun(0.0) + 0.27, s=0.07, energy=10)
    k.cyl(x0 + 0.2, rc, gun(0.0) - 0.05, gun(0.0) + 0.05, 0.02, A.IRON, 'lantern_post', verts=6)
    # fenders over the side
    for t in (0.35, 0.55, 0.75):
        k.blob(x0 + L * t, rc - beam * 0.52, gun(t) - 0.28, 0.07, 0.07, 0.13, '#e8e0d0', 'fender', segs=10)
    C.sink(k, since, WZ + 0.08, lights_since=lsince)


sloop(10.2, 14.9, Q + 1.4, beam=1.08)

for (x0, x1, cr, hull, inside) in ((2.6, 4.75, Q + 0.92, '#2a4a6a', A.WOOD_D), (5.3, 7.25, Q + 1.75, '#6a3a2a', A.WOOD_DD)):
    since, lsince = len(k.parts), len(k.lights)
    W.rowboat(k, x0, x1, cr, beam=0.82, hull=hull, inside=inside)
    C.sink(k, since, WZ + 0.12, lights_since=lsince)
# their lines to the rings in the wall (a gentle sag)


def line(a, b, sag=0.15, n=4):
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * math.sin(math.pi * t)))
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.013, '#b8a070', 'mooring_line', verts=4)


line((4.7, Q + 0.92, WZ + 0.42), (5.2, Q + 0.05, -0.2))
line((7.2, Q + 1.75, WZ + 0.42), (9.55, Q + 0.05, -0.2), sag=0.25)
line((14.9, Q + 1.4, WZ + 0.6), (14.9, Q - 0.5, 0.38), sag=0.2)
line((10.2, Q + 1.4, WZ + 0.6), (9.95, Q - 0.5, 0.38), sag=0.2)
# a buoy riding in the harbour
k.cyl(1.6, Q + 1.9, WZ - 0.1, WZ + 0.22, 0.16, '#c03a2e', 'buoy', verts=14)
k.cyl(1.6, Q + 1.9, WZ + 0.08, WZ + 0.16, 0.165, '#ece4d4', 'buoy', verts=14)
k.cone(1.6, Q + 1.9, WZ + 0.22, WZ + 0.38, 0.08, 0.02, '#2e2e34', 'buoy', verts=10)

print('LANTERN QUAY smoke', [(round(a, 2), round(b, 2), round(c, 2)) for (a, b, c) in SMOKE], flush=True)
k.render(OUT, light_states={'full': {}}, light_samples=24)
