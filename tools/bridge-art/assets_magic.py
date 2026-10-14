"""Arcane builders for scenekit (bpy): the sorceress's tower and anything
else magical. Tile units like assets_lumar: x = column, r = row (toward the
camera), z = height.
"""
import math

from scenekit import shade
from assets_lumar import (BRASS, CANDLE, FIRE, FIRE_HOT, IRON, WOOD, WOOD_D, WOOD_DD,
                          WOOD_L, candle)

ARCANE = '#9a6af0'        # crystal / rune glow (saturated: glows add on top of albedo)
ARCANE_D = '#2e2050'      # albedo under a glow
ARCANE_HOT = '#e8d8ff'
NIGHT = '#1a2448'
STONE_P = '#5a5468'       # tower stone, cool violet grey
STONE_PD = '#3e3a4c'


def _outward(pa, pb, centre):
    """Unit normal of segment a→b pointing away from the room centre."""
    dx, dr = pb[0] - pa[0], pb[1] - pa[1]
    L = math.hypot(dx, dr)
    n = (dr / L, -dx / L)
    mx, mr = (pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2
    if n[0] * (mx - centre[0]) + n[1] * (mr - centre[1]) < 0:
        n = (-n[0], -n[1])
    return n


def masonry_wall(k, pa, pb, height, centre, thick=0.5, stone=STONE_P, course=0.33, blocks=True):
    """Wall whose inner face runs along pa→pb (any angle): dark mortar core
    with staggered dressed blocks on the inner face, and a cap."""
    n = _outward(pa, pb, centre)
    off = lambda p, d: (p[0] + n[0] * d, p[1] + n[1] * d)
    a, b = off(pa, thick / 2), off(pb, thick / 2)
    k.bar(a[0], a[1], b[0], b[1], 0, height, thick, ('#24202c', 0.1), 'wall')
    ca, cb = off(pa, thick / 2 - 0.03), off(pb, thick / 2 - 0.03)
    k.bar(ca[0], ca[1], cb[0], cb[1], height, height + 0.06, thick + 0.1, STONE_PD, 'wall_cap')
    if not blocks:
        k.bar(a[0], a[1], b[0], b[1], 0, height, thick + 0.02, (stone, 0.12), 'wall_face')
        return
    L = math.hypot(pb[0] - pa[0], pb[1] - pa[1])
    ux, ur = (pb[0] - pa[0]) / L, (pb[1] - pa[1]) / L
    z, i = 0.0, 0
    while z < height - 0.05:
        zt = min(height, z + course)
        s = -(0.35 if i % 2 else 0.0)
        while s < L:
            e = min(L, s + k.rng.uniform(0.55, 0.8))
            s0 = max(0.0, s)
            if e - s0 > 0.08:
                p0 = (pa[0] + ux * (s0 + 0.02), pa[1] + ur * (s0 + 0.02))
                p1 = (pa[0] + ux * (e - 0.02), pa[1] + ur * (e - 0.02))
                q0, q1 = off(p0, 0.02), off(p1, 0.02)
                k.bar(q0[0], q0[1], q1[0], q1[1], z + 0.02, zt - 0.02, 0.08,
                      (shade(stone, k.rng.uniform(0.84, 1.1)), 0.14), 'wall_stone')
            s = e
        z = zt
        i += 1


def _cut(rect, holes):
    """rect minus every hole, as a few rects."""
    out = [rect]
    for (hx0, hr0, hx1, hr1) in holes:
        nxt = []
        for (a0, b0, a1, b1) in out:
            if a1 <= hx0 or a0 >= hx1 or b1 <= hr0 or b0 >= hr1:
                nxt.append((a0, b0, a1, b1))
                continue
            if b0 < hr0: nxt.append((a0, b0, a1, hr0))
            if b1 > hr1: nxt.append((a0, hr1, a1, b1))
            m0, m1 = max(b0, hr0), min(b1, hr1)
            if a0 < hx0: nxt.append((a0, m0, hx0, m1))
            if a1 > hx1: nxt.append((hx1, m0, a1, m1))
        out = nxt
    return [q for q in out if q[2] - q[0] > 0.01 and q[3] - q[1] > 0.01]


def octagon_room(k, x0, r0, x1, r1, cut, wall_h, door=(5.0, 7.0), low=0.4, stone=STONE_P,
                 floor_tone='#4a4458', holes=()):
    """Octagonal tower room: floor x0..x1 × r0..r1 with `cut`-tile corners.
    Back walls full height, front walls low (cut away), doorway in the
    front wall. Tiles outside the octagon are marked solid. `holes`
    (x0, r0, x1, r1) are left out of the flagstones (a stairwell down).
    Returns the corner points."""
    centre = ((x0 + x1) / 2, (r0 + r1) / 2)
    P = [(x0 + cut, r0), (x1 - cut, r0), (x1, r0 + cut), (x1, r1 - cut),
         (x1 - cut, r1), (x0 + cut, r1), (x0, r1 - cut), (x0, r0 + cut)]
    # floor: flagstones in bands, each band as wide as the octagon at its
    # widest so no gaps open along the angled walls
    k.box(x0 - 0.5, r0 - 0.5, -0.14, x1 + 0.5, r1 + 0.5, -0.04, '#16121c', 'subfloor')

    def span(r):
        d = max(0.0, (r0 + cut) - r, r - (r1 - cut))
        return x0 + d, x1 - d
    r = r0
    while r < r1 - 1e-6:
        h = min(r1 - r, k.rng.choice([0.5, 0.5, 0.75]))
        a0, a1 = span(r)
        b0, b1 = span(r + h)
        xa, xb = min(a0, b0), max(a1, b1)
        x = xa
        while x < xb - 1e-6:
            w = min(xb - x, k.rng.choice([0.5, 0.75, 1.0]))
            tone = (shade(floor_tone, k.rng.uniform(0.85, 1.12)), 0.14)
            for (fa, ra, fb, rb) in _cut((x + 0.03, r + 0.03, x + w - 0.03, r + h - 0.03), holes):
                k.box(fa, ra, -0.04, fb, rb, 0.0, tone, 'floor')
            x += w
        r += h
    # walls: back three + sides tall, front three low with the doorway
    tall = [(7, 0), (0, 1), (1, 2), (2, 3), (6, 7)]
    for i, j in tall:
        masonry_wall(k, P[i], P[j], wall_h, centre, stone=stone, blocks=(i, j) in ((7, 0), (0, 1), (1, 2)))
    masonry_wall(k, P[3], P[4], low, centre, stone=stone, blocks=False)
    masonry_wall(k, P[5], P[6], low, centre, stone=stone, blocks=False)
    for a, b in ((P[4][0], door[1]), (door[0], P[5][0])):
        if abs(a - b) > 0.01:
            masonry_wall(k, (a, r1), (b, r1), low, centre, stone=stone, blocks=False)
    k.box(door[0], r1, -0.01, door[1], r1 + 0.55, 0.02, (WOOD_D, 0.1), 'threshold')
    # mark tiles outside the octagon solid (centre test with a little slack)
    for c in range(int(x0) - 1, int(x1) + 1):
        for rr in range(int(r0) - 1, int(r1) + 1):
            cx, cr = c + 0.5, rr + 0.5
            inside = (x0 <= cx <= x1 and r0 <= cr <= r1 and
                      (cx - x0) + (cr - r0) >= cut + 0.45 and (x1 - cx) + (cr - r0) >= cut + 0.45 and
                      (cx - x0) + (r1 - cr) >= cut + 0.45 and (x1 - cx) + (r1 - cr) >= cut + 0.45)
            if not inside:
                k.solid(c, rr, c + 1, rr + 1)
    return P, centre


def angled_window(k, pa, pb, centre, t0, t1, z0, z1, glass=NIGHT, stars=True, moon=False):
    """Tall window set into an angled wall between fractions t0..t1 of
    pa→pb, with a stepped arch, mullion and stars in the night glass."""
    n = _outward(pa, pb, centre)
    pt = lambda t, d: (pa[0] + (pb[0] - pa[0]) * t - n[0] * d, pa[1] + (pb[1] - pa[1]) * t - n[1] * d)
    tm = (t0 + t1) / 2
    dt = (t1 - t0) / 2
    # frame, glass (stepped arch on top)
    for (ta, tb, za, zb) in ((t0 - 0.03, t1 + 0.03, z0 - 0.08, z1), (t0 + dt * 0.12, t1 - dt * 0.12, z1 - 0.02, z1 + 0.16),
                             (t0 + dt * 0.4, t1 - dt * 0.4, z1 + 0.14, z1 + 0.26)):
        a, b = pt(ta, 0.04), pt(tb, 0.04)
        k.bar(a[0], a[1], b[0], b[1], za, zb, 0.08, WOOD_DD, 'window_frame')
    for (ta, tb, za, zb) in ((t0, t1, z0, z1 - 0.02), (t0 + dt * 0.2, t1 - dt * 0.2, z1 - 0.02, z1 + 0.12),
                             (t0 + dt * 0.48, t1 - dt * 0.48, z1 + 0.12, z1 + 0.2)):
        a, b = pt(ta, 0.07), pt(tb, 0.07)
        k.bar(a[0], a[1], b[0], b[1], za, zb, 0.04, glass, 'window_glass', emit=(shade(glass, 0.9), 1.0))
    a, b = pt(tm - 0.012, 0.09), pt(tm + 0.012, 0.09)
    k.bar(a[0], a[1], b[0], b[1], z0, z1 + 0.12, 0.03, WOOD_DD, 'window_frame')
    for zz in (z0 + (z1 - z0) * 0.5,):
        a, b = pt(t0, 0.09), pt(t1, 0.09)
        k.bar(a[0], a[1], b[0], b[1], zz - 0.02, zz + 0.02, 0.03, WOOD_DD, 'window_frame')
    if stars:
        for _ in range(7):
            t = k.rng.uniform(t0 + dt * 0.15, t1 - dt * 0.15)
            zz = k.rng.uniform(z0 + 0.1, z1 - 0.05)
            a, b = pt(t - 0.006, 0.095), pt(t + 0.006, 0.095)
            k.bar(a[0], a[1], b[0], b[1], zz, zz + 0.03, 0.01, '#e8f0ff', 'star', emit=('#e8f0ff', 2.0))
    if moon:
        c = pt(tm + dt * 0.35, 0.1)
        k.blob(c[0], c[1], z1 - 0.18, 0.09, 0.02, 0.09, '#d8f0c8', 'moon', emit=('#c8f0b0', 1.6))
    # sill
    a, b = pt(t0 - 0.05, 0.1), pt(t1 + 0.05, 0.1)
    k.bar(a[0], a[1], b[0], b[1], z0 - 0.14, z0 - 0.06, 0.2, STONE_PD, 'window_sill')
    return pt(tm, 0.6)


def rose_window(k, cx, r_face, cz, rad, glass='#3a2a78'):
    """Round stained-glass window in the back wall with radial tracery."""
    k.cyl_y(cx, r_face - 0.02, r_face + 0.05, cz, rad + 0.08, rad + 0.08, STONE_PD, 'rose_frame', verts=24)
    k.cyl_y(cx, r_face + 0.03, r_face + 0.07, cz, rad, rad, glass, 'rose_glass', emit=(glass, 1.4), verts=24)
    for i, col in enumerate(('#6a3ab8', '#2a5ab0', '#8a3a8a', '#3a8aa0', '#6a3ab8', '#2a5ab0', '#8a3a8a', '#3a8aa0')):
        a = i * math.pi / 4 + math.pi / 8
        k.cyl_y(cx + math.cos(a) * rad * 0.6, r_face + 0.07, r_face + 0.08, cz + math.sin(a) * rad * 0.6,
                rad * 0.22, rad * 0.22, col, 'rose_pane', emit=(col, 1.6), verts=10)
    k.cyl_y(cx, r_face + 0.07, r_face + 0.09, cz, rad * 0.24, rad * 0.24, '#e0b040', 'rose_pane', emit=('#e0a030', 1.8), verts=12)
    for i in range(4):
        a = i * math.pi / 4
        dx, dz = math.cos(a) * rad, math.sin(a) * rad
        k.tube((cx - dx, r_face + 0.08, cz - dz), (cx + dx, r_face + 0.08, cz + dz), 0.018, STONE_PD, 'rose_frame', verts=6)


def candelabra(k, cx, cr, energy=2.6):
    """Tall wrought-iron stand with three candles."""
    k.cyl(cx, cr, 0, 0.04, 0.18, IRON, 'candelabra', verts=10)
    k.cyl(cx, cr, 0.04, 1.25, 0.025, IRON, 'candelabra', verts=6)
    k.box(cx - 0.24, cr - 0.025, 1.22, cx + 0.24, cr + 0.025, 1.26, IRON, 'candelabra')
    for dx, zz in ((-0.22, 1.26), (0.0, 1.38), (0.22, 1.26)):
        if dx == 0.0:
            k.cyl(cx, cr, 1.25, 1.38, 0.02, IRON, 'candelabra', verts=6)
        k.cyl(cx + dx, cr, zz, zz + 0.03, 0.05, IRON, 'candelabra', verts=8)
        k.cyl(cx + dx, cr, zz + 0.03, zz + 0.2 + 0.04 * (dx == 0), 0.032, CANDLE, 'candle', verts=8)
        k.cone(cx + dx, cr, zz + 0.2 + 0.04 * (dx == 0), zz + 0.31 + 0.04 * (dx == 0), 0.03, 0.002, FIRE_HOT, 'flame',
               emit=(FIRE_HOT, 4.0), verts=6)
        k.cyl(cx + dx, cr + 0.02, zz + 0.02, zz + 0.12, 0.035, CANDLE, 'wax_drip', verts=6)
    k.point_light(cx, cr + 0.2, 1.75, '#ffb060', energy, radius=0.12, group='flicker')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def floating_candle(k, cx, cr, z, energy=0.8):
    k.cyl(cx, cr, z, z + 0.16, 0.03, CANDLE, 'candle', verts=8)
    k.cyl(cx + 0.02, cr + 0.02, z - 0.03, z + 0.06, 0.012, CANDLE, 'wax_drip', verts=5)
    k.cone(cx, cr, z + 0.16, z + 0.26, 0.026, 0.002, FIRE_HOT, 'flame', emit=(FIRE_HOT, 4.0), verts=6)
    k.point_light(cx, cr, z + 0.3, '#ffc080', energy, radius=0.06, group='flicker')


def crystal_altar(k, cx, cr, energy=40.0):
    """Stone plinth with a slowly turning crystal floating above it."""
    k.cyl(cx, cr, 0, 0.12, 0.46, (STONE_PD, 0.12), 'altar', verts=8)
    k.cyl(cx, cr, 0.12, 0.72, 0.3, (STONE_P, 0.14), 'altar', verts=8)
    k.cyl(cx, cr, 0.72, 0.82, 0.42, (STONE_PD, 0.12), 'altar', verts=8)
    for i in range(4):   # brass claws holding nothing — the crystal floats
        a = i * math.pi / 2 + math.pi / 4
        k.tube((cx + math.cos(a) * 0.3, cr + math.sin(a) * 0.3, 0.82),
               (cx + math.cos(a) * 0.18, cr + math.sin(a) * 0.18, 1.05), 0.025, BRASS, 'altar_claw', verts=6)
    k.cone(cx, cr, 1.2, 1.62, 0.17, 0.005, '#5a3a9a', 'crystal', emit=('#a878ff', 0.95), verts=6)
    k.cone(cx, cr, 0.95, 1.2, 0.005, 0.17, '#4a2a80', 'crystal', emit=('#8050e0', 0.85), verts=6)
    k.cone(cx - 0.03, cr + 0.06, 1.22, 1.45, 0.05, 0.003, '#e8d8ff', 'crystal_glint', emit=('#d8c0ff', 1.0), verts=4)
    for i in range(5):   # motes orbiting it
        a = i * 2 * math.pi / 5
        k.sphere(cx + math.cos(a) * 0.36, cr + math.sin(a) * 0.3, 1.2 + 0.12 * math.sin(a * 2), 0.025, 0.025,
                 ARCANE_D, 'mote', emit=('#c8a8ff', 1.0), segs=6)
    k.point_light(cx, cr + 0.1, 1.3, ARCANE, energy, radius=0.2, group='flicker')
    k.solid(cx - 0.45, cr - 0.45, cx + 0.45, cr + 0.45)


def spell_circle(k, cx, cr, rad, col=ARCANE, glyphs=12):
    """Glowing summoning circle painted on the floor: two rings, a triangle,
    rune marks between the rings."""
    emit = (col, 0.85)
    col = ARCANE_D
    z0, z1 = 0.0, 0.012
    for rr, w in ((rad, 0.05), (rad * 0.82, 0.035)):
        n = 40
        for i in range(n):
            a0, a1 = i * 2 * math.pi / n, (i + 1) * 2 * math.pi / n
            k.bar(cx + math.cos(a0) * rr, cr + math.sin(a0) * rr, cx + math.cos(a1) * rr, cr + math.sin(a1) * rr,
                  z0, z1, w, col, 'rune', emit=emit)
    tri = [(cx + math.cos(a) * rad * 0.8, cr + math.sin(a) * rad * 0.8) for a in
           (-math.pi / 2, -math.pi / 2 + 2 * math.pi / 3, -math.pi / 2 + 4 * math.pi / 3)]
    for i in range(3):
        a, b = tri[i], tri[(i + 1) % 3]
        k.bar(a[0], a[1], b[0], b[1], z0, z1, 0.035, col, 'rune', emit=emit)
    for i in range(glyphs):
        a = i * 2 * math.pi / glyphs + 0.13
        rm = rad * 0.91
        px, pr = cx + math.cos(a) * rm, cr + math.sin(a) * rm
        t = (-math.sin(a), math.cos(a))
        kind = i % 3
        if kind == 0:
            k.bar(px - t[0] * 0.06, pr - t[1] * 0.06, px + t[0] * 0.06, pr + t[1] * 0.06, z0, z1, 0.025, col, 'rune', emit=emit)
        k.bar(px - math.cos(a) * 0.05, pr - math.sin(a) * 0.05, px + math.cos(a) * 0.05, pr + math.sin(a) * 0.05,
              z0, z1, 0.025, col, 'rune', emit=emit)
        if kind == 2:
            k.bar(px, pr, px + t[0] * 0.06 + math.cos(a) * 0.04, pr + t[1] * 0.06 + math.sin(a) * 0.04, z0, z1, 0.025, col, 'rune', emit=emit)
    k.point_light(cx, cr, 0.25, emit[0], 6.0, radius=0.8, group='static')


def telescope(k, cx, cr, aim=(-0.9, -1.0, 1.0)):
    """Brass telescope on a wooden tripod, aimed up toward `aim` (dx, dr, dz)."""
    top = (cx, cr, 1.0)
    for a in (0.3, 2.4, 4.4):
        k.tube((cx + math.cos(a) * 0.36, cr + math.sin(a) * 0.3, 0.0), top, 0.035, WOOD, 'tripod', verts=6)
    k.sphere(cx, cr, 1.0, 0.05, 0.05, BRASS, 'tripod_head', segs=8)
    L = math.sqrt(sum(v * v for v in aim))
    u = tuple(v / L for v in aim)
    back = (top[0] - u[0] * 0.45, top[1] - u[1] * 0.45, top[2] - u[2] * 0.45 + 0.08)
    mid = (top[0] + u[0] * 0.25, top[1] + u[1] * 0.25, top[2] + u[2] * 0.25 + 0.08)
    front = (top[0] + u[0] * 0.75, top[1] + u[1] * 0.75, top[2] + u[2] * 0.75 + 0.08)
    front = (top[0] + u[0] * 0.95, top[1] + u[1] * 0.95, top[2] + u[2] * 0.95 + 0.08)
    k.tube(back, mid, 0.09, ('#d0a048', 0.08), 'telescope', verts=14)
    k.tube(mid, front, 0.13, ('#b88838', 0.08), 'telescope', verts=14)
    k.tube(front, (front[0] + u[0] * 0.06, front[1] + u[1] * 0.06, front[2] + u[2] * 0.06), 0.145, '#f0d080', 'telescope_ring', verts=14)
    k.tube(mid, (mid[0] + u[0] * 0.05, mid[1] + u[1] * 0.05, mid[2] + u[2] * 0.05), 0.14, '#f0d080', 'telescope_ring', verts=14)
    k.tube(back, (back[0] - u[0] * 0.08, back[1] - u[1] * 0.08, back[2] - u[2] * 0.08), 0.05, '#2a2a30', 'eyepiece', verts=10)
    k.solid(cx - 0.35, cr - 0.35, cx + 0.35, cr + 0.35)


def alchemy_table(k, x0, x1, cr, d=0.7):
    """Workbench crowded with flasks over burners, an open grimoire and a
    pinned note."""
    k.box(x0, cr - d / 2, 0.76, x1, cr + d / 2, 0.84, (WOOD_D, 0.14), 'table')
    for xx in (x0 + 0.04, x1 - 0.12):
        for rr in (cr - d / 2 + 0.04, cr + d / 2 - 0.12):
            k.box(xx, rr, 0, xx + 0.08, rr + 0.08, 0.76, WOOD_DD, 'table_leg')
    z = 0.84
    # grimoire, open
    k.box(x0 + 0.15, cr - 0.18, z, x0 + 0.42, cr + 0.16, z + 0.04, '#e8dcc0', 'grimoire')
    k.box(x0 + 0.43, cr - 0.18, z, x0 + 0.7, cr + 0.16, z + 0.04, '#e0d4b4', 'grimoire')
    k.box(x0 + 0.41, cr - 0.19, z, x0 + 0.44, cr + 0.17, z + 0.05, '#5a1a2a', 'grimoire_spine')
    for i in range(4):
        k.box(x0 + 0.19, cr - 0.12 + i * 0.07, z + 0.04, x0 + 0.38, cr - 0.1 + i * 0.07, z + 0.045, '#4a3a2a', 'ink')
    # flasks over a burner
    k.cyl(x1 - 0.55, cr, z, z + 0.08, 0.06, BRASS, 'burner', verts=8)
    k.cone(x1 - 0.55, cr, z + 0.08, z + 0.16, 0.025, 0.002, '#80c0ff', 'burner_flame', emit=('#60a0ff', 3.0), verts=6)
    for (dx, dr, col, sz) in ((-0.55, 0.0, '#a050e0', 0.1), (-0.3, 0.15, '#50d080', 0.07), (-0.2, -0.15, '#e0a040', 0.06),
                              (-0.82, -0.12, '#e05060', 0.06)):
        zz = z + (0.16 if dx == -0.55 else 0.0)
        k.sphere(x1 + dx, cr + dr, zz + sz, sz, sz, col, 'flask', emit=(shade(col, 0.6), 1.4), segs=10)
        k.cyl(x1 + dx, cr + dr, zz + sz * 1.6, zz + sz * 1.6 + 0.12, 0.018, '#c8d8e0', 'flask_neck', verts=6)
    k.point_light(x1 - 0.55, cr + 0.3, z + 0.4, '#b070f0', 3.0, radius=0.08, group='flicker')
    # the note: "DO NOT TOUCH THE PURPLE ONE."
    k.box(x1 - 0.18, cr + d / 2 - 0.01, z - 0.24, x1 - 0.04, cr + d / 2 + 0.005, z - 0.06, '#efe6cc', 'note')
    k.solid(x0, cr - d / 2, x1, cr + d / 2)


def scroll_desk(k, cx, cr):
    """Writing desk heaped with scrolls; one bears an unbroken red seal."""
    w, d = 1.1, 0.6
    k.box(cx - w / 2, cr - d / 2, 0.72, cx + w / 2, cr + d / 2, 0.8, (WOOD, 0.14), 'desk')
    for xx in (cx - w / 2 + 0.04, cx + w / 2 - 0.12):
        k.box(xx, cr - d / 2 + 0.04, 0, xx + 0.08, cr + d / 2 - 0.04, 0.72, WOOD_D, 'table_leg')
    z = 0.8
    for i, (dx, dr, zz) in enumerate(((-0.3, -0.1, 0), (0.0, -0.12, 0), (0.28, -0.08, 0), (-0.15, 0.0, 0.07), (0.14, 0.02, 0.07),
                                       (0.0, 0.1, 0.0))):
        k.cyl_x(cx + dx - 0.22, cx + dx + 0.22, cr + dr, z + 0.04 + zz, 0.04, 0.04, ('#e8dcbc', 0.06), 'scroll', verts=10)
        k.cyl_x(cx + dx - 0.23, cx + dx - 0.2, cr + dr, z + 0.04 + zz, 0.05, 0.05, WOOD_D, 'scroll_end', verts=8)
    k.cyl_y(cx + 0.02, cr + 0.12, cr + 0.16, z + 0.04, 0.035, 0.035, '#b01e1e', 'wax_seal', verts=10)
    k.cyl(cx + 0.42, cr + 0.15, z, z + 0.06, 0.04, '#1a1a24', 'inkpot', verts=8)
    k.tube((cx + 0.42, cr + 0.15, z + 0.04), (cx + 0.5, cr + 0.05, z + 0.3), 0.012, '#f0f0f0', 'quill', rb=0.002, verts=5)
    candle(k, cx - 0.45, cr - 0.15, z, energy=2.0)
    # scrolls spilled on the floor
    for dx, dr in ((-0.5, 0.45), (-0.2, 0.5), (0.35, 0.42)):
        k.cyl_x(cx + dx - 0.2, cx + dx + 0.2, cr + dr, 0.04, 0.04, 0.04, ('#e0d4b4', 0.06), 'scroll', verts=10)
    k.solid(cx - w / 2, cr - d / 2, cx + w / 2, cr + d / 2)


def familiar(k, cx, cr, z=0.45):
    """The black cat, floating a hand's breadth above a cushion of air."""
    k.sphere(cx, cr, z + 0.12, 0.17, 0.13, ('#18141e', 0.06), 'cat', ry=0.13, segs=12)
    k.sphere(cx + 0.02, cr + 0.08, z + 0.3, 0.11, 0.1, ('#1e1a26', 0.06), 'cat', segs=12)
    for sx in (-1, 1):
        k.cone(cx + 0.02 + sx * 0.06, cr + 0.06, z + 0.36, z + 0.46, 0.04, 0.004, '#18141e', 'cat', verts=4)
        k.sphere(cx + 0.02 + sx * 0.04, cr + 0.17, z + 0.31, 0.022, 0.016, '#e8d040', 'cat_eye',
                 emit=('#c0a020', 1.5), segs=6)
    k.tube((cx - 0.14, cr, z + 0.08), (cx - 0.3, cr - 0.04, z + 0.28), 0.03, '#18141e', 'cat', rb=0.015, verts=6)
    k.cyl(cx, cr, 0.0, 0.006, 0.2, ARCANE_D, 'cat_glow', ry=0.14, emit=('#5a3aa0', 0.6), verts=12)
    k.point_light(cx, cr, 0.15, ARCANE, 2.0, radius=0.1, group='flicker')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def star_banner(k, pa, pb, centre, t, z0, z1, w=0.5, col='#1e2a5a'):
    """Hanging star chart on an angled wall."""
    n = _outward(pa, pb, centre)
    pt = lambda tt, d: (pa[0] + (pb[0] - pa[0]) * tt - n[0] * d, pa[1] + (pb[1] - pa[1]) * tt - n[1] * d)
    L = math.hypot(pb[0] - pa[0], pb[1] - pa[1])
    dt = w / 2 / L
    a, b = pt(t - dt, 0.03), pt(t + dt, 0.03)
    k.bar(a[0], a[1], b[0], b[1], z0, z1, 0.02, col, 'banner')
    a2, b2 = pt(t - dt - 0.02, 0.05), pt(t + dt + 0.02, 0.05)
    k.bar(a2[0], a2[1], b2[0], b2[1], z1, z1 + 0.04, 0.04, WOOD_DD, 'banner_rod')
    for _ in range(9):
        tt = k.rng.uniform(t - dt * 0.8, t + dt * 0.8)
        zz = k.rng.uniform(z0 + 0.08, z1 - 0.08)
        p, q = pt(tt - 0.005, 0.045), pt(tt + 0.005, 0.045)
        k.bar(p[0], p[1], q[0], q[1], zz, zz + 0.025, 0.01, '#e0d8a0', 'banner_star', emit=('#a09860', 0.8))
