"""Look Book 2: the village with a richer house kit.

  ~/BVENV/bin/python village/richer.py <scene script> <out dir> <lookkit args...>

Patches assets_town.house (every W.house the scene calls) with a version that has more character, then runs
tools/lookkit.py exactly as render.sh would. The repo isn't touched: the patch lives only in this process.

What the richer house adds, all in the same chunky model style:
  - a little more wall and a little less roof, so the fronts read (the 45° camera is mostly roof otherwise)
  - a rough stone plinth instead of a plain footing; quoins on stone houses; braces in the timber framing
  - windows with a lintel, a stone sill, louvred shutters and a flower box with trailing green under every one downstairs
  - a front-facing gable bay over the door (its own little roof breaking up the big slope, a round window in the gable)
  - a door with a canopy on brackets, two steps, a mat and a lantern beside it
  - painted fascia with a scalloped trim under the eaves, finials on the ridge, a taller chimney
  - ivy more often, a climbing rose sometimes, barrels or a bench by the wall, and now and then a cat on the step
"""
import math
import os
import runpy
import sys

REPO = os.environ.get('BRIDGE_REPO', '/home/user/becknology')
sys.path.insert(0, os.path.join(REPO, 'tools', 'bridge-art'))
import bpy  # noqa: E402,F401
import assets_town as W  # noqa: E402
from assets_lumar import barrel  # noqa: E402
from scenekit import shade  # noqa: E402

LK = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools', 'lookkit.py')
STONES = ('#9a9080', '#8a8274', '#a89c88', '#7e786c')
TRIMS = ('#efe6d2', '#e8dcc0', '#3a5a4a', '#5a3a2a', '#e6d8b8', '#2e4a5a')


def louvred(k, x0, x1, r, z0, z1, col):
    k.box(x0, r, z0, x1, r + 0.045, z1, (col, 0.06), 'shutter')
    z = z0 + 0.06
    while z < z1 - 0.04:
        k.box(x0 + 0.02, r + 0.045, z, x1 - 0.02, r + 0.06, z + 0.025, shade(col, 0.72), 'shutter_slat')
        z += 0.085


def rich_window(k, cx, r_face, z0, w=0.58, h=0.68, shutters='#2a4a3a', box=True, stone='#a89c88', blooms=('#e04060', '#f0d040'), sides=(-1, 1)):
    WD = W.WOOD_DD
    k.box(cx - w / 2 - 0.07, r_face, z0 - 0.07, cx + w / 2 + 0.07, r_face + 0.07, z0 + h + 0.07, WD, 'window_frame')
    k.box(cx - w / 2, r_face + 0.01, z0, cx + w / 2, r_face + 0.075, z0 + h, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.9))
    k.box(cx - 0.022, r_face + 0.07, z0, cx + 0.022, r_face + 0.09, z0 + h, WD, 'window_frame')               # mullion
    k.box(cx - w / 2, r_face + 0.07, z0 + h * 0.52 - 0.02, cx + w / 2, r_face + 0.09, z0 + h * 0.52 + 0.02, WD, 'window_frame')
    k.box(cx - w / 2 - 0.12, r_face, z0 + h + 0.07, cx + w / 2 + 0.12, r_face + 0.1, z0 + h + 0.17, (stone, 0.1), 'lintel')
    k.box(cx - w / 2 - 0.12, r_face, z0 - 0.15, cx + w / 2 + 0.12, r_face + 0.17, z0 - 0.07, (stone, 0.1), 'sill')
    if shutters:
        if -1 in sides:
            louvred(k, cx - w / 2 - 0.3, cx - w / 2 - 0.08, r_face + 0.01, z0, z0 + h, shutters)
        if 1 in sides:
            louvred(k, cx + w / 2 + 0.08, cx + w / 2 + 0.3, r_face + 0.01, z0, z0 + h, shutters)
    if box:
        k.box(cx - w / 2 - 0.06, r_face + 0.12, z0 - 0.36, cx + w / 2 + 0.06, r_face + 0.34, z0 - 0.15, (W.WOOD_D, 0.12), 'flower_box')
        x = cx - w / 2 + 0.01
        with k.foliage('leaf'):
            while x < cx + w / 2 + 0.02:
                k.sphere(x, r_face + 0.23, z0 - 0.11, 0.075, 0.065, ('#2e5a2e', 0.15), 'foliage', segs=8)
                if k.rng.random() < 0.55:                                  # trailing green over the front
                    k.blob(x, r_face + 0.36, z0 - 0.3, 0.04, 0.03, 0.09, shade('#3a6a30', k.rng.uniform(0.85, 1.1)), 'trail', segs=6)
                x += 0.11
        x = cx - w / 2 + 0.03
        while x < cx + w / 2:
            k.sphere(x + k.rng.uniform(-0.02, 0.02), r_face + 0.27, z0 - 0.06, 0.04, 0.038, k.rng.choice(blooms), 'flower', segs=6)
            x += 0.09
    k.point_light(cx, r_face + 0.6, z0 + h / 2, '#ffc070', 6, radius=0.2, group='flicker')


def canopy(k, cx, r_face, z, roof, w=1.05, d=0.5):
    """A little gabled canopy over the door on two curved brackets."""
    zr = z + 0.3
    for s in (-1, 1):
        k.quads([((cx, r_face, zr), (cx, r_face + d, zr - 0.02), (cx + s * (w / 2 + 0.06), r_face + d, z - 0.02), (cx + s * (w / 2 + 0.06), r_face, z))],
                shade(roof, 0.95 if s < 0 else 0.82), 'roof')
    k.tube((cx, r_face, zr + 0.02), (cx, r_face + d + 0.02, zr), 0.035, shade(roof, 0.62), 'ridge', verts=6)
    k.poly([(cx - w / 2, r_face + d - 0.02, z), (cx + w / 2, r_face + d - 0.02, z), (cx, r_face + d - 0.02, zr - 0.02)], W.WOOD_DD, 'canopy_gable')
    for s in (-1, 1):
        k.tube((cx + s * (w / 2 - 0.06), r_face, z - 0.36), (cx + s * (w / 2 - 0.06), r_face + d - 0.08, z - 0.02), 0.03, W.WOOD_DD, 'bracket', verts=4)


def rich_door(k, cx, r_face, roof, w=0.74, h=1.35, col=None, lamp_side=1, stone='#a89c88', bay=False):
    col = col or k.rng.choice(('#5a3e22', '#3a5a4a', '#6a2a2a', '#2e4a6a', '#7a5a2a'))
    W.door(k, cx, r_face, w=w, h=h, col=col)
    if not bay:
        k.box(cx - w / 2 - 0.3, r_face + 0.36, -0.02, cx + w / 2 + 0.3, r_face + 0.56, 0.035, (stone, 0.14), 'step')    # a lower, wider step
    k.box(cx - 0.26, r_face + 0.14, 0.06, cx + 0.26, r_face + 0.32, 0.075, ('#8a3a2a', 0.2), 'doormat')
    canopy(k, cx, r_face + 0.06, h + 0.32, roof, w=0.98 if bay else 1.05, d=0.42 if bay else 0.5)
    if not bay:
        W.wall_lantern(k, cx + lamp_side * (w / 2 + 0.36), r_face + 0.02, z=1.3, energy=9)


def cat(k, x, r, z):
    c = k.rng.choice(('#d8803a', '#3a3438', '#e8e0d4', '#8a7a6a'))
    k.blob(x, r, z + 0.1, 0.13, 0.09, 0.1, (c, 0.05), 'cat', segs=10)
    k.sphere(x + 0.1, r + 0.04, z + 0.22, 0.075, 0.07, (c, 0.05), 'cat', segs=10)
    for s in (-1, 1):
        k.cone(x + 0.1 + s * 0.04, r + 0.04, z + 0.27, z + 0.34, 0.03, 0.0, (c, 0.05), 'cat', verts=4)
    k.tube((x - 0.12, r, z + 0.04), (x - 0.06, r + 0.16, z + 0.02), 0.022, (c, 0.05), 'cat', verts=5)


def cross_gable(k, cx, r_front, wall_h, rise, z_main_eave, r_main_eave, rm, zr, roof, wall, timber, w=1.5, proj=0.3):
    """A gabled bay standing forward of the front wall over the door, with its own little roof meeting the main one."""
    rf = r_front + proj
    hg = min(1.05, rise * 0.85)
    apex = wall_h + hg
    k.box(cx - w / 2, r_front - 0.05, 0.35, cx + w / 2, rf, wall_h, (wall, 0.08), 'bay_wall')
    k.poly([(cx - w / 2, rf, wall_h - 0.02), (cx + w / 2, rf, wall_h - 0.02), (cx, rf, apex)], (wall, 0.08), 'gable')
    k.box(cx - 0.045, rf, wall_h, cx + 0.045, rf + 0.03, apex - 0.12, (timber, 0.1), 'timber')              # king post
    k.box(cx - w / 2 + 0.06, rf, wall_h - 0.06, cx + w / 2 - 0.06, rf + 0.03, wall_h + 0.04, (timber, 0.1), 'timber')
    for s in (-1, 1):                                                                                        # braces
        k.tube((cx + s * (w / 2 - 0.12), rf + 0.015, wall_h + 0.04), (cx + s * 0.06, rf + 0.015, wall_h + hg * 0.62), 0.03, timber, 'timber', verts=4)
    k.cyl_y(cx, rf - 0.01, rf + 0.05, wall_h + hg * 0.42, 0.15, 0.15, W.WOOD_DD, 'window_frame', verts=14)
    k.cyl_y(cx, rf + 0.0, rf + 0.06, wall_h + hg * 0.42, 0.1, 0.1, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.9), verts=14)
    # its roof: two slopes from its eaves up to a ridge running back into the main roof
    over = 0.2
    ze = wall_h - 0.06
    t = (apex + 0.05 - z_main_eave) / max(0.1, zr - z_main_eave)
    r_meet = r_main_eave - (r_main_eave - rm) * min(1.0, t) - 0.12
    ra = rf + over
    tones = [shade(roof, f) for f in (0.88, 0.95, 1.0, 1.06)]
    for s in (-1, 1):
        xe = cx + s * (w / 2 + over)
        k.quads([((xe, ra, ze), (cx, ra, apex + 0.05), (cx, r_meet, apex + 0.05), (xe, r_meet, ze))], shade(roof, 0.5), 'roof_deck')
        n = 5
        for i in range(n):                                   # courses of shingles, lapping, like the big roof
            f0, f1 = i / n, min(1.0, (i + 1.3) / n)
            def at(f, up):
                return xe + (cx - xe) * f, ze + (apex + 0.05 - ze) * f + up
            xa, za = at(f0, 0.03)
            xb, zb = at(f1, 0.005)
            k.quads([((xa, ra, za), (xb, ra, zb), (xb, r_meet, zb), (xa, r_meet, za))], k.rng.choice(tones), 'roof')
            k.quads([((xa, ra, za + 0.002), (xa + (cx - xe) * 0.03, ra, za + 0.006), (xa + (cx - xe) * 0.03, r_meet, za + 0.006), (xa, r_meet, za + 0.002))],
                    shade(roof, 0.58), 'roof')
    k.tube((cx, ra + 0.02, apex + 0.08), (cx, r_meet, apex + 0.08), 0.06, shade(roof, 0.66), 'ridge', verts=8)
    for s in (-1, 1):                                        # bargeboards
        k.tube((cx + s * (w / 2 + over + 0.02), ra + 0.03, ze + 0.02), (cx, ra + 0.03, apex + 0.1), 0.04, W.WOOD_DD, 'bargeboard', verts=4)
    k.cone(cx, ra + 0.03, apex + 0.1, apex + 0.34, 0.05, 0.0, W.WOOD_DD, 'finial', verts=6)
    return rf


def scallop_trim(k, xa, xb, r, z, col):
    """Painted fascia under the eave with a scalloped edge — the gingerbread trim."""
    k.box(xa, r, z - 0.16, xb, r + 0.05, z - 0.04, (col, 0.04), 'fascia_paint')
    x = xa + 0.06
    while x < xb - 0.06:
        k.cyl_y(x + 0.07, r, r + 0.05, z - 0.16, 0.065, 0.06, (col, 0.04), 'fascia_paint', verts=8)
        x += 0.17


def rich_house(k, x0, x1, r_back, r_front, wall_h=2.0, rise=1.3, roof=W.ROOF_GREEN, wall=W.PLASTER, timber=W.WOOD_DD,
               door_x=None, windows=(), windows_up=(), chimney=None, sign=None, lanterns=(), stone=False, base=W.SALT[2]):
    rng = k.rng
    wall_h *= 1.1
    rise *= 0.9
    if wall == W.PLASTER:
        wall = rng.choice((W.PLASTER, '#e8d8b8', '#e4c8b0', '#d8dccc', '#e8dcc8', '#d4c4a4'))
    if timber == W.WOOD_DD:
        timber = rng.choice((W.WOOD_DD, '#2a2220', '#5a4a3c', '#3a3028'))
    shutters = rng.choice(('#2a4a3a', '#3a4a6a', '#6a2a2a', '#4a5a3a', '#2a3a4a', '#7a6a3a', '#3a6a6a'))
    trim = rng.choice(TRIMS)
    pstone = rng.choice(STONES)
    if base == W.SALT[2]:
        base = rng.choice(STONES)
    blooms = rng.choice((('#e04060', '#f0d040'), ('#a060d0', '#f0f0f0'), ('#e07030', '#f0d040'), ('#f080b0', '#ffffff'), ('#e04040', '#f0a0c0')))
    # the plinth: rough stones along the front
    k.box(x0 - 0.04, r_back - 0.04, 0, x1 + 0.04, r_front + 0.04, 0.36, (shade(base, 0.85), 0.12), 'footing', bevel=0.02)
    x = x0 - 0.04
    while x < x1:
        sw = rng.uniform(0.28, 0.5)
        xb = min(x + sw, x1 + 0.04)
        top = rng.uniform(0.3, 0.36)
        k.box(x + 0.02, r_front + 0.04, 0.02, xb - 0.02, r_front + 0.075, top, (shade(base, rng.uniform(0.86, 1.12)), 0.14), 'plinth_stone', bevel=0.012)
        x = xb
    k.box(x0 + 0.04, r_back + 0.04, 0.36, x1 - 0.04, r_front - 0.02, wall_h, (wall, 0.16 if stone else 0.08), 'house_wall')
    busy = [(wx - 0.65, wx + 0.65) for wx, _ in windows] + [(wx - 0.5, wx + 0.5) for wx, _ in windows_up]
    if door_x is not None:
        busy.append((door_x - 0.85, door_x + 0.85))
    if stone:
        z, i = 0.36, 0
        while z < wall_h - 0.1:
            x = x0 + (0.0 if i % 2 else 0.25)
            while x < x1:
                k.box(max(x, x0 + 0.04), r_front - 0.03, z + 0.015, min(x + 0.48, x1 - 0.04), r_front + 0.0, z + 0.27,
                      (shade(wall, rng.uniform(0.85, 1.1)), 0.14), 'stone_block')
                x += 0.5
            z += 0.29
            i += 1
        z, i = 0.36, 0
        while z < wall_h - 0.12:                                  # quoins: big pale blocks up both corners
            for xc, s in ((x0, 1), (x1, -1)):
                ln = 0.42 if i % 2 else 0.26
                xa, xb = (xc + 0.02, xc + ln) if s > 0 else (xc - ln, xc - 0.02)
                k.box(xa, r_front - 0.035, z + 0.01, xb, r_front + 0.02, z + 0.27, (shade(wall, 1.22), 0.08), 'quoin', bevel=0.01)
            z += 0.29
            i += 1
    else:
        posts = [x0 + 0.04, x1 - 0.16]
        for xx in [x0 + (x1 - x0) * t for t in (0.25, 0.5, 0.75)]:
            if not any(a <= xx <= b for a, b in busy):
                posts.append(xx)
        for xx in posts:
            k.box(xx, r_front - 0.02, 0.36, xx + 0.12, r_front + 0.035, wall_h, (timber, 0.1), 'timber')
        for zz in (0.36, wall_h * 0.56, wall_h - 0.12):
            k.box(x0 + 0.04, r_front - 0.02, zz, x1 - 0.04, r_front + 0.035, zz + 0.12, (timber, 0.1), 'timber')
        ps = sorted(posts)
        for a, b in zip(ps, ps[1:]):                               # a brace in each clear panel, downstairs
            if b - a > 0.5 and not any(not (b < p0 or a > p1) for p0, p1 in busy):
                k.tube((a + 0.12, r_front + 0.01, 0.48), (b, r_front + 0.01, wall_h * 0.56), 0.035, timber, 'timber', verts=4)
                k.tube((a + 0.12, r_front + 0.01, wall_h * 0.56 + 0.12), (b, r_front + 0.01, wall_h - 0.12), 0.035, timber, 'timber', verts=4)
        for xx in (x0 + 0.04, x1 - 0.16):
            k.box(xx, r_back + 0.04, 0.36, xx + 0.12, r_front, 0.48, (timber, 0.1), 'timber')
    # the roof, deeper eaves, painted trim, finials
    over = 0.36
    rm, zr = W._gable_roof(k, x0, x1, r_back, r_front, wall_h, rise, roof, over=over)
    scallop_trim(k, x0 - over, x1 + over, r_front + over + 0.045, wall_h, trim)
    for xe in (x0 - over - 0.02, x1 + over + 0.02):
        k.cone(xe, rm, zr + 0.06, zr + 0.36, 0.055, 0.0, W.WOOD_DD, 'finial', verts=6)
        k.sphere(xe, rm, zr + 0.36, 0.045, 0.045, W.BRASS, 'finial', segs=8)
    # the bay over the door, if there's room for it
    bay = False
    rf_door = r_front
    if door_x is not None:
        near = min([abs(wx - door_x) for wx, _ in windows] or [9.0])
        up_clash = any(abs(wx - door_x) < 1.0 for wx, _ in windows_up)
        bw = min(1.6, 2 * near - 0.8)
        if bw >= 1.1 and not up_clash and x1 - x0 >= 3.3:
            rf_door = cross_gable(k, door_x, r_front, wall_h, rise, wall_h - 0.06, r_front + over, rm, zr, roof, wall, timber, w=bw)
            bay = True
        rich_door(k, door_x, rf_door, roof, lamp_side=rng.choice((-1, 1)), stone=pstone, bay=bay)
        if bay:                                              # the lantern on the bay's corner
            W.wall_lantern(k, door_x + rng.choice((-1, 1)) * (bw / 2 - 0.12), rf_door + 0.02, z=1.45, energy=9)
    for (wx, wz) in windows:
        sides = (-1, 1)
        if bay and abs(wx - door_x) < bw / 2 + 0.75:
            sides = (-1,) if wx < door_x else (1,)
        rich_window(k, wx, r_front + 0.02, wz, shutters=shutters, box=True, stone=pstone, blooms=blooms, sides=sides)
    for (wx, wz) in windows_up:
        rich_window(k, wx, r_front + 0.02, wz + 0.1, w=0.46, h=0.52, shutters=shutters, box=False, stone=pstone)
    if not bay and x1 - x0 >= 3.6:
        dx = x0 + (x1 - x0) * rng.uniform(0.35, 0.65)
        if chimney is None or abs(dx - chimney) >= 0.9:
            W.dormer(k, dx, r_front + over, rm, wall_h - 0.06, zr, roof, wall, shutters)
    if rng.random() < 0.3:
        W.weathervane(k, rng.choice((x0 + 0.3, x1 - 0.3)), rm, zr + 0.08)
    if chimney:
        ra_ = r_front + over
        rz = zr - (zr - wall_h + 0.06) * ((rm + 0.05) - rm) / max(0.1, ra_ - rm)
        W.chimney_stack(k, chimney, rm - 0.4, rm + 0.05, wall_h, zr + 1.0, roof_z=rz, pots=2)
    W.dress_front(k, x0, x1, r_front, wall_h, None, [w[0] for w in windows] + [w[0] for w in windows_up] + ([door_x] if door_x else []),
                  ivy=0.75, pots=0.0)
    # a climbing rose by the door, sometimes
    if door_x is not None and rng.random() < 0.5:
        side = rng.choice((-1, 1))
        rx = door_x + side * (0.95 if bay else 0.7)
        if not any(abs(rx - wx) < 0.55 for wx, _ in windows):
            with k.foliage('leaf'):
                for j in range(14):
                    z = 0.35 + (wall_h - 0.5) * j / 14
                    k.blob(rx + rng.uniform(-0.14, 0.14), r_front + 0.06, z, rng.uniform(0.06, 0.1), 0.05, 0.08,
                           shade('#2e5a2a', rng.uniform(0.9, 1.1)), 'ivy', segs=8)
            for j in range(9):
                k.sphere(rx + rng.uniform(-0.16, 0.16), r_front + 0.11, rng.uniform(0.5, wall_h - 0.2), 0.045, 0.04,
                         rng.choice(('#f080a0', '#e04870', '#fff0f4')), 'rose', segs=6)
    # life by the wall: barrels, or a bench under a window, and a cat
    if rng.random() < 0.7:                                  # barrels at the side of the house, by the corner
        barrel(k, x1 + 0.3, r_front - 0.3, h=0.62, radius=0.24)
        if rng.random() < 0.6:
            barrel(k, x1 + 0.32, r_front - 0.85, h=0.55, radius=0.22, tone='#7a5a34')
    if door_x is not None and rng.random() < 0.6:
        cat(k, door_x + rng.choice((-0.3, 0.3)), rf_door + 0.26, 0.06)
    if sign:
        W.hanging_sign(k, sign[0], r_front, sign[1], icon=sign[2])
    for lx in lanterns:
        W.wall_lantern(k, lx, r_front + 0.02)
    k.solid(x0, r_back, x1, r_front)
    return rm, zr


W.house = rich_house
sys.argv = [LK] + sys.argv[1:]
runpy.run_path(LK, run_name='__main__')
