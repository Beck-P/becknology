"""Starling Holm's own pieces (scenes/lumar_holm.py), in the house style of Look Book 2 — every function takes a Kit.

  import assets_holm as H
  H.dry_wall(k, [(x, r), ...], rng)          a dry-stone wall along a line: courses of stones, copestones, moss, gaps
  H.ruin(k, x0, x1, r0, r1, rng)             a cottage gone to ruin: tumbled stone walls, a gable and chimney standing
  H.sheep(k, x, r, rng)  H.gull(k, x, r, z)  small life
  H.gorse / heather / ferns / foxgloves      the island's low growth, in layers
  H.lobster_pots, H.upturned_boat, H.anchor, H.net_rack, H.rope_coil, H.wheelbarrow, H.washing_line

Same model world as the game's kit (scenekit + assets_*): chunky shapes that read at 32 px a tile.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import assets_town as W  # noqa: E402
import assets_lumar as A  # noqa: E402
from scenekit import shade  # noqa: E402

STONES = ('#9a9282', '#8a8476', '#a89e8a', '#7e786e', '#948c7c', '#a2988a')
MOSS = ('#4a6a34', '#5a7a3a', '#3e5e30')


def _seg(a, b):
    L = math.hypot(b[0] - a[0], b[1] - a[1])
    return L, ((b[0] - a[0]) / L, (b[1] - a[1]) / L) if L else (1.0, 0.0)


def dry_wall(k, pts, rng, h=0.62, d=0.26, gaps=(), tumble=0.0, moss=0.2, cope=True, z=None):
    """A dry-stone wall along the polyline pts: courses of stones of a few tones and sizes, each its own box (the joints
    show as dark seams), copestones set on edge along the top, moss on the odd stone. gaps: (a, b) distances along
    the whole line left open (a gateway, a fallen stretch); tumble: how much of the top course has come down, its
    stones lying in the grass at the wall's foot. z(x, r): the ground's height under it."""
    zg = z or (lambda x, r: 0.0)
    s0 = 0.0
    for a, b in zip(pts, pts[1:]):
        L, (ux, ur) = _seg(a, b)
        course, zc = 0, 0.0
        top = h
        while zc < top - 0.05:
            hh = rng.uniform(0.15, 0.22)
            t = (0.0 if course % 2 else rng.uniform(0.08, 0.2))
            while t < L:
                w = rng.uniform(0.22, 0.42)
                t1 = min(L, t + w)
                mid = s0 + (t + t1) / 2
                gone = any(g0 <= mid <= g1 for g0, g1 in gaps)
                fallen = course >= 2 and rng.random() < tumble * (0.4 + 0.3 * course)
                if not gone and not fallen:
                    xa, ra = a[0] + ux * (t + 0.015), a[1] + ur * (t + 0.015)
                    xb, rb = a[0] + ux * (t1 - 0.015), a[1] + ur * (t1 - 0.015)
                    zb = zg((xa + xb) / 2, (ra + rb) / 2)
                    out = rng.uniform(-0.02, 0.03)
                    k.bar(xa, ra, xb, rb, zb + zc + 0.01, zb + min(top, zc + hh) - 0.01, d + out,
                          (shade(rng.choice(STONES), rng.uniform(0.88, 1.08)), 0.18), 'wall_stone', bevel=0.025)
                    if rng.random() < moss * (0.5 + zc):
                        k.blob((xa + xb) / 2, (ra + rb) / 2 + 0.04, zb + min(top, zc + hh) - 0.01, (t1 - t) * 0.35, d * 0.4, 0.04,
                               (shade(rng.choice(MOSS), rng.uniform(0.9, 1.1)), 0.25), 'moss', segs=7)
                elif fallen and not gone and rng.random() < 0.8:
                    # it lies at the foot, on the near side or the far
                    side = rng.choice((-1, 1))
                    fx = a[0] + ux * (t + t1) / 2 - ur * side * rng.uniform(0.3, 0.6)
                    fr = a[1] + ur * (t + t1) / 2 + ux * side * rng.uniform(0.3, 0.6)
                    s = rng.uniform(0.1, 0.16)
                    k.rock(fx, fr, zg(fx, fr) + s * 0.3, s * 1.2, s, s * 0.7, (shade(rng.choice(STONES), rng.uniform(0.85, 1.05)), 0.2),
                           part='fallen_stone', segs=7)
                t = t1
            zc += hh
            course += 1
        if cope:
            t = 0.0
            while t < L - 0.05:
                w = rng.uniform(0.1, 0.16)
                mid = s0 + t + w / 2
                if not any(g0 <= mid <= g1 for g0, g1 in gaps) and rng.random() > tumble * 1.3:
                    x, r = a[0] + ux * (t + w / 2), a[1] + ur * (t + w / 2)
                    hz = zg(x, r) + top
                    k.bar(x - ux * w * 0.42, r - ur * w * 0.42, x + ux * w * 0.42, r + ur * w * 0.42, hz - 0.02,
                          hz + rng.uniform(0.12, 0.18), d * 0.85, (shade(rng.choice(STONES), rng.uniform(0.85, 1.0)), 0.2),
                          'copestone', bevel=0.02)
                t += w
        s0 += L


def ivy_on(k, x, r, z0, z1, w, rng, face=0.05, n=None):
    """A sprawl of ivy up a wall's face from z0 toward z1, about w across, centred on x."""
    with k.foliage('leaf'):
        for j in range(n or int(10 + w * 18)):
            zz = z0 + (z1 - z0) * rng.random() ** 0.7
            spread = w / 2 * (1 - 0.5 * (zz - z0) / max(0.01, z1 - z0))
            k.blob(x + rng.uniform(-spread, spread), r + face, zz, rng.uniform(0.06, 0.11), 0.05, rng.uniform(0.06, 0.1),
                   (shade(rng.choice(('#2e5a2a', '#3a6a30', '#2a4e26')), rng.uniform(0.9, 1.1)), 0.24), 'ivy', segs=7)


def ruin(k, x0, x1, r0, r1, rng, door_x=None):
    """A cottage gone to ruin on its old footprint: walls of coursed rubble stone broken to a ragged top — the back wall
    standing highest with the hearth in it (its chimney breast and stack still up, a lintel over the dark fireplace),
    the front low enough to see in, a doorway and empty window openings with their lintels — roof timbers fallen in,
    slates slid off in heaps, rubble against the walls, nettles, brambles and a young rowan grown up inside, ivy over
    the stone. No floor: the island's own grass grows in it."""
    T = 0.26                                                            # the walls' thickness
    door_x = door_x if door_x is not None else (x0 + x1) / 2
    for _ in range(9):                                                  # the old floor's flags, here and there in the grass
        fx, fr = rng.uniform(x0 + 0.6, x1 - 0.6), rng.uniform(r0 + 0.6, r1 - 0.6)
        w = rng.uniform(0.3, 0.5)
        k.box(fx - w / 2, fr - 0.16, -0.02, fx + w / 2, fr + 0.16, 0.035, (shade('#8a8476', rng.uniform(0.85, 1.1)), 0.18), 'flagstone', bevel=0.01)
    HX = x0 + 1.7                                                       # the hearth in the back wall

    def height(side, f):
        """How high the wall still stands, f along it (0..1): high at the corners and by the hearth, a ragged top between."""
        corner = max(math.exp(-(f / 0.1) ** 2), math.exp(-((1 - f) / 0.1) ** 2))
        base = {'front': 0.55, 'back': 1.55, 'west': 1.3, 'east': 1.1}[side]
        rag = 0.3 * math.sin(f * 17.0 + len(side)) + 0.18 * math.sin(f * 41.0 + 2.0 * len(side))
        h = base + rag + 0.9 * corner
        if side == 'back':
            h += 0.8 * math.exp(-(((x0 + f * (x1 - x0)) - HX) / 1.2) ** 2)
        return max(0.3, h)

    def course_wall(side, ax, ar, bx, br, opens):
        L, (ux, ur) = _seg((ax, ar), (bx, br))
        k.bar(ax, ar, bx, br, -0.02, 0.12, T + 0.08, ('#7a746a', 0.2), 'ruin_footing')
        z, course = 0.12, 0
        while True:
            hh = rng.uniform(0.17, 0.23)
            t = 0.0 if course % 2 else rng.uniform(0.1, 0.22)
            any_ = False
            while t < L:
                w = rng.uniform(0.26, 0.48)
                t1 = min(L, t + w)
                f = (t + t1) / 2 / L
                top = height(side, f)
                if z + hh * 0.5 < top and not any(o0 <= t + w / 2 <= o1 and z < oz for (o0, o1, oz) in opens):
                    any_ = True
                    xa, ra = ax + ux * (t + 0.012), ar + ur * (t + 0.012)
                    xb, rb = ax + ux * (t1 - 0.012), ar + ur * (t1 - 0.012)
                    k.bar(xa, ra, xb, rb, z + 0.012, z + hh - 0.012, T + rng.uniform(-0.01, 0.02),
                          (shade(rng.choice(STONES), rng.uniform(0.82, 1.08)), 0.2), 'ruin_wall', bevel=0.02)
                    if rng.random() < 0.14 and z + hh * 1.5 >= top:
                        k.blob((xa + xb) / 2, (ra + rb) / 2, z + hh, w * 0.35, T * 0.45, 0.05,
                               (shade(rng.choice(MOSS), rng.uniform(0.9, 1.1)), 0.25), 'moss', segs=7)
                t = t1
            z += hh
            course += 1
            if not any_ or z > 3.4:
                break
        for (o0, o1, oz) in opens:                                       # lintels over the openings (where the wall still stands)
            if 0.9 < oz < 1.7 and min(height(side, o0 / L), height(side, o1 / L)) > oz + 0.2:
                xa, ra = ax + ux * (o0 - 0.12), ar + ur * (o0 - 0.12)
                xb, rb = ax + ux * (o1 + 0.12), ar + ur * (o1 + 0.12)
                k.bar(xa, ra, xb, rb, oz, oz + 0.14, T + 0.03, ('#b0a690', 0.15), 'lintel', bevel=0.015)

    H2 = T / 2
    course_wall('back', x0, r0 + H2, x1, r0 + H2, [(HX - x0 - 0.45, HX - x0 + 0.45, 0.85), (x1 - x0 - 1.9, x1 - x0 - 1.3, 1.6)])
    fw = door_x - x0
    course_wall('front', x0, r1 - H2, x1, r1 - H2, [(fw - 0.42, fw + 0.42, 1.25), (1.0, 1.65, 1.1), (x1 - x0 - 1.65, x1 - x0 - 1.0, 1.1)])
    course_wall('east', x1 - H2, r0 + T, x1 - H2, r1 - T, [])
    course_wall('west', x0 + H2, r0 + T, x0 + H2, r1 - T, [])
    # the hearth: a dark fireplace under an oak lintel, a stone hearth before it, the chimney breast up the back wall and
    # the stack still standing over it, an iron crane for the pot left in it
    k.box(HX - 0.42, r0 + 0.02, 0.12, HX + 0.42, r0 + T - 0.02, 0.84, ('#1e1a18', 0.3), 'fireplace')
    k.box(HX - 0.6, r0 + T - 0.02, 0.84, HX + 0.6, r0 + T + 0.12, 1.02, ('#5a4632', 0.2), 'hearth_lintel', bevel=0.015)
    k.box(HX - 0.62, r0 + T, -0.02, HX + 0.62, r0 + T + 0.42, 0.08, ('#8a8274', 0.18), 'hearth_stone', bevel=0.015)
    z = 1.02
    while z < 2.55:                                                     # the breast, in courses
        x = HX - 0.55 + (0.0 if int(z * 10) % 2 else 0.12)
        while x < HX + 0.55:
            w = min(rng.uniform(0.24, 0.4), HX + 0.55 - x)
            k.box(x + 0.01, r0 + T - 0.02, z + 0.01, x + w - 0.01, r0 + T + 0.1, z + 0.19,
                  (shade(rng.choice(STONES), rng.uniform(0.85, 1.05)), 0.2), 'ruin_wall', bevel=0.015)
            x += w
        z += 0.2
    W.chimney_stack(k, HX, r0 + 0.02, r0 + T + 0.1, 2.5, 3.3, brick='#8a8276', mortar='#5a564e', pots=1)
    k.tube((HX - 0.3, r0 + T + 0.05, 0.3), (HX - 0.3, r0 + T + 0.05, 0.75), 0.015, '#2a2a2c', 'pot_crane', verts=4)
    k.tube((HX - 0.3, r0 + T + 0.05, 0.7), (HX + 0.05, r0 + T + 0.05, 0.7), 0.015, '#2a2a2c', 'pot_crane', verts=4)
    for (ix, iz, w) in ((x1 - 0.6, 2.0, 1.2), (x0 + 0.5, 1.8, 1.0), (HX + 1.6, 1.9, 1.1)):     # ivy over the back wall's face
        ivy_on(k, ix, r0 + T, 0.15, iz, w, rng, face=0.02)
    for (ix, iz) in ((x1 - 0.5, 1.0), (x0 + 1.2, 0.8), (door_x + 1.3, 0.75)):
        ivy_on(k, ix, r1, 0.1, iz, 0.8, rng, face=0.02)
    # roof timbers fallen in: a purlin down across from the back wall, rafters askew
    k.tube((x0 + 3.2, r0 + 0.4, 1.7), (x0 + 5.0, r1 - 0.7, 0.05), 0.085, ('#4a3a2a', 0.2), 'fallen_beam', verts=6, smooth=False)
    k.tube((x1 - 1.2, r0 + 0.5, 1.3), (x1 - 2.2, r1 - 0.8, 0.05), 0.07, ('#5a4632', 0.2), 'fallen_beam', verts=6, smooth=False)
    for _ in range(7):                                                   # slates slid off, lying in heaps
        sx, sr = rng.uniform(x0 + 0.6, x1 - 0.6), rng.uniform(r0 + 0.7, r1 - 0.6)
        for j in range(rng.randint(2, 5)):
            a = rng.uniform(0, 180)
            k.blob(sx + rng.uniform(-0.2, 0.2), sr + rng.uniform(-0.15, 0.15), 0.04 + j * 0.02, 0.13, 0.09, 0.015,
                   (shade('#4a5458', rng.uniform(0.85, 1.15)), 0.2), 'slate', rot=(0, 0, a), segs=6)
    for (cx, cr) in ((x1 - 0.55, r1 - 0.55), (x0 + 0.6, r1 - 0.5), (x1 - 0.6, r0 + 0.55), (door_x + 0.2, r0 + 0.55)):
        for j in range(7):                                               # rubble heaped against the walls
            s = rng.uniform(0.1, 0.2)
            k.rock(cx + rng.uniform(-0.35, 0.35), cr + rng.uniform(-0.25, 0.25), s * 0.3, s * 1.2, s, s * 0.8,
                   (shade(rng.choice(STONES), rng.uniform(0.8, 1.05)), 0.2), part='rubble', segs=7)
    # growing through it: nettles and brambles along the walls, a young rowan in the corner, ferns
    with k.foliage('leaf'):
        for (bx, br, s) in ((x1 - 0.85, r0 + 0.75, 0.42), (door_x - 1.0, r0 + 0.7, 0.36), (door_x + 1.1, r1 - 0.7, 0.3), (x0 + 0.9, r1 - 0.75, 0.34)):
            W.leafy_crown(k, bx, br, s * 0.55, s, s * 0.7, s * 0.55, shade('#3a5a2a', rng.uniform(0.9, 1.1)), part='bramble')
    for (bx, br) in ((x1 - 0.85, r0 + 0.75), (door_x + 1.1, r1 - 0.7)):
        for j in range(6):
            k.sphere(bx + rng.uniform(-0.3, 0.3), br + 0.25, rng.uniform(0.15, 0.45), 0.035, 0.035, rng.choice(('#3a1430', '#6a1a3a')), 'berry', segs=5)
    rx_, rr_ = x1 - 1.1, r0 + 1.3                                        # the rowan, its berries red
    k.tube((rx_, rr_, 0.0), (rx_ + 0.15, rr_, 2.2), 0.07, ('#5a5048', 0.15), 'trunk', rb=0.04, verts=7)
    with k.foliage('leaf'):
        for (dx, dz, s) in ((0.0, 2.3, 0.5), (-0.35, 1.95, 0.38), (0.4, 2.0, 0.4)):
            W.leafy_crown(k, rx_ + 0.15 + dx, rr_, dz, s, s * 0.85, s * 0.7, shade('#3e6a34', rng.uniform(0.95, 1.05)))
    for j in range(16):
        a, u = rng.uniform(0, math.tau), rng.uniform(-0.2, 0.6)
        k.sphere(rx_ + 0.15 + math.cos(a) * 0.45, rr_ + 0.3, 2.1 + u * 0.4, 0.04, 0.04, '#d03020', 'berry', segs=5)
    ferns(k, [(x0 + 1.4, r1 - 0.6), (x1 - 1.9, r0 + 0.75), (door_x - 0.9, r1 - 0.55), (HX + 0.9, r0 + 0.6)], rng)
    nettles(k, [(x0 + 0.7, r0 + 0.8), (x1 - 0.5, r1 - 1.0), (door_x + 1.6, r0 + 0.7)], rng)
    foxgloves(k, x0 + 2.8, r0 + 0.65, rng, n=3)


def ferns(k, spots, rng, z=0.0, size=1.0):
    """Clumps of bracken: fronds fanning from a crown."""
    with k.foliage('leaf'):
        for (x, r) in spots:
            col = shade(rng.choice(('#3e7a34', '#4a8a3a', '#356a30')), rng.uniform(0.9, 1.1))
            n = rng.randint(6, 9)
            fr = []
            for j in range(n):
                a = rng.uniform(0, math.tau)
                L = rng.uniform(0.22, 0.38) * size
                fr.append((x, r, z + 0.02, L * 0.6, 0.06 * size, math.cos(a) * L, math.sin(a) * L * 0.5))
            k.blades(fr, (col, 0.2), 'fern')


def nettles(k, spots, rng, z=0.0):
    """Nettles and dock: upright stems with leaves down them."""
    with k.foliage('leaf'):
        for (x, r) in spots:
            items = []
            for j in range(rng.randint(5, 8)):
                sx, sr = x + rng.uniform(-0.2, 0.2), r + rng.uniform(-0.12, 0.12)
                h = rng.uniform(0.3, 0.55)
                items.append((sx, sr, z, h, 0.03, rng.uniform(-0.05, 0.05), 0.0))
                for q in range(3):
                    zz = z + h * (0.3 + 0.22 * q)
                    s = (-1) ** q
                    items.append((sx, sr, zz, 0.06, 0.045, s * 0.12, 0.02))
            k.blades(items, (shade('#3e6a2e', rng.uniform(0.9, 1.1)), 0.2), 'nettle')


def gorse(k, x, r, rng, s=0.4, z=0.0):
    """A gorse bush: a dark spiny mound starred with yellow flowers."""
    with k.foliage('needle'):
        W.leafy_crown(k, x, r, z + s * 0.55, s * 1.1, s * 0.85, s * 0.65, shade('#2e4a26', rng.uniform(0.92, 1.08)), part='gorse')
    for j in range(int(18 * s / 0.4)):
        a, u = rng.uniform(0, math.tau), rng.uniform(-0.1, 0.9)
        w = math.sqrt(1 - u * u)
        if math.sin(a) < -0.3:
            continue
        k.sphere(x + w * math.cos(a) * s * 1.05, r + w * math.sin(a) * s * 0.8, z + s * 0.55 + u * s * 0.62, 0.035, 0.03,
                 rng.choice(('#f0c830', '#e8b020', '#f8d850')), 'gorse_flower', segs=5)


def heather(k, x, r, rng, s=0.35, z=0.0):
    """A low cushion of heather, purple in its flowers."""
    with k.foliage('leaf'):
        W.leafy_crown(k, x, r, z + s * 0.3, s * 1.2, s * 0.9, s * 0.35, shade('#4a4a36', rng.uniform(0.92, 1.08)), part='heather', sprigs=False)
    for j in range(int(26 * s / 0.35)):
        a, d = rng.uniform(0, math.tau), rng.uniform(0, 1) ** 0.5
        k.sphere(x + math.cos(a) * d * s * 1.1, r + math.sin(a) * d * s * 0.85, z + s * 0.55 - d * s * 0.2, 0.035, 0.03,
                 rng.choice(('#a060a8', '#b878c0', '#8a4a94', '#c890d0')), 'heather_flower', segs=5)


def foxgloves(k, x, r, rng, n=4, z=0.0):
    """Foxgloves: tall spikes of pink bells over a rosette of leaves."""
    with k.foliage('leaf'):
        k.blades([(x, r, z, 0.12, 0.06, math.cos(a) * 0.18, math.sin(a) * 0.1) for a in [j * 1.1 for j in range(6)]],
                 ('#4a7a3a', 0.2), 'foxglove_leaf')
    for j in range(n):
        sx, sr = x + rng.uniform(-0.15, 0.15), r + rng.uniform(-0.08, 0.08)
        h = rng.uniform(0.55, 0.85)
        k.cyl(sx, sr, z, z + h, 0.012, '#4a6a34', 'foxglove', verts=4)
        col = rng.choice(('#d070b0', '#e090c8', '#c060a0', '#f0e0f0'))
        for q in range(6):
            zz = z + h * (0.45 + 0.09 * q)
            k.sphere(sx + 0.02, sr + 0.03, zz, 0.035 * (1 - q * 0.08), 0.03, col, 'foxglove_bell', segs=5)


def sheep(k, x, r, rng, yaw=0.0, lamb=False, grazing=None):
    """A sheep: a fleece of woolly lumps on four dark legs, a dark face, ears. yaw: degrees, 0 facing +x."""
    s = 0.62 if lamb else 1.0
    c, sn = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    P = lambda dx, dr: (x + dx * c - dr * sn, r + dx * sn + dr * c)          # noqa: E731
    wool = shade('#ece6d6', rng.uniform(0.94, 1.03))
    for (dx, dr) in ((0.17, 0.08), (0.17, -0.08), (-0.17, 0.08), (-0.17, -0.08)):
        lx, lr = P(dx * s, dr * s)
        k.cyl(lx, lr, 0.0, 0.2 * s, 0.025 * s, '#2a2624', 'sheep_leg', verts=5)
    bx, br = P(0, 0)
    k.blob(bx, br, 0.32 * s, 0.3 * s, 0.17 * s, 0.15 * s, (shade(wool, 0.9), 0.3), 'sheep', segs=10)
    for j in range(14):                                                  # the fleece in lumps
        dx, dr = rng.uniform(-0.24, 0.24), rng.uniform(-0.13, 0.13)
        wx, wr = P(dx * s, dr * s)
        k.sphere(wx, wr, (0.34 + rng.uniform(0.0, 0.1)) * s, 0.09 * s, 0.075 * s, (shade(wool, rng.uniform(0.94, 1.06)), 0.3), 'sheep', segs=7)
    down = grazing if grazing is not None else rng.random() < 0.5
    hx, hr = P(0.34 * s, 0.0)
    hz = (0.16 if down else 0.38) * s
    k.blob(hx, hr, hz, 0.09 * s, 0.065 * s, 0.07 * s, '#2e2a28', 'sheep_head', rot=(0, 30 if down else -10, yaw), segs=8)
    for e in (-1, 1):
        ex, er = P(0.3 * s, e * 0.08 * s)
        k.blob(ex, er, hz + 0.03 * s, 0.05 * s, 0.02 * s, 0.015 * s, '#3a3430', 'sheep_ear', rot=(0, 0, yaw + e * 40), segs=6)
    k.sphere(*P(0.31 * s, 0.0), (hz + 0.06 * s) if not down else hz + 0.06 * s, 0.05 * s, 0.04 * s, wool, 'sheep', segs=6)
    k.solid(x - 0.3, r - 0.2, x + 0.3, r + 0.2)


def gull(k, x, r, z=0.0, yaw=0.0):
    """A gull standing: white body, grey back, a yellow beak."""
    c, sn = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    k.blob(x, r, z + 0.1, 0.1, 0.06, 0.065, '#f0f0ec', 'gull', rot=(0, 0, yaw), segs=10)
    k.blob(x - 0.02 * c, r - 0.02 * sn, z + 0.13, 0.085, 0.055, 0.025, '#8a9098', 'gull', rot=(0, 0, yaw), segs=8)
    k.sphere(x + 0.08 * c, r + 0.08 * sn, z + 0.18, 0.045, 0.045, '#f4f4f0', 'gull', segs=8)
    k.cone(x + 0.12 * c, r + 0.12 * sn, z + 0.17, z + 0.19, 0.018, 0.0, '#e0a030', 'gull', verts=4)
    for e in (-1, 1):
        k.cyl(x - sn * e * 0.03, r + c * e * 0.03, z, z + 0.05, 0.008, '#c87a3a', 'gull', verts=4)


def lobster_pots(k, x, r, rng, n=3):
    """Withy lobster pots stacked: a slatted base, hooped tops, a float and its line."""
    for i in range(n):
        px = x + (i % 2) * 0.5 + (0.0 if i < 2 else 0.25)
        pz = 0.0 if i < 2 else 0.22
        pr = r + rng.uniform(-0.04, 0.04)
        k.box(px - 0.22, pr - 0.15, pz, px + 0.22, pr + 0.15, pz + 0.04, (A.WOOD, 0.14), 'pot_base')
        k.cyl_x(px - 0.22, px + 0.22, pr, pz + 0.04, 0.15, 0.17, ('#7a6a48', 0.3), 'lobster_pot', verts=10)
        for dx in (-0.17, 0.0, 0.17):
            k.cyl_x(px + dx - 0.012, px + dx + 0.012, pr, pz + 0.04, 0.155, 0.175, A.WOOD_D, 'pot_hoop', verts=10)
    k.sphere(x - 0.25, r + 0.25, 0.07, 0.07, 0.065, '#e05a30', 'float', segs=10)


def upturned_boat(k, x0, x1, r, rng, hull='#3a5a6a', z=0.0):
    """A rowing boat turned over on the shingle, tarred keel up, a stone on it, an oar alongside."""
    L = x1 - x0
    shape = lambda t: max(0.08, math.sin(math.pi * (0.04 + 0.92 * t)) ** 0.6)    # noqa: E731
    rings = []
    for i in range(15):
        t = i / 14
        x = x0 + t * L
        hw = 0.38 * shape(t)
        hz = 0.36 * shape(t) ** 0.5 + 0.04
        rings.append([(x, r - hw, z), (x, r - hw * 0.92, z + hz * 0.65), (x, r - hw * 0.4, z + hz), (x, r, z + hz + 0.03),
                      (x, r + hw * 0.4, z + hz), (x, r + hw * 0.92, z + hz * 0.65), (x, r + hw, z)])
    k.loft(rings, (hull, 0.2), 'boat_hull')
    k.box(x0 + 0.1, r - 0.025, z + 0.02, x1 - 0.1, r + 0.025, z + 0.44, '#2a2420', 'boat_keel')
    k.rock((x0 + x1) / 2 + 0.2, r + 0.05, z + 0.45, 0.13, 0.1, 0.08, ('#8a8478', 0.2), part='rock', segs=7)
    k.tube((x0 + 0.1, r + 0.5, z + 0.03), (x1 - 0.2, r + 0.42, z + 0.03), 0.025, A.WOOD_L, 'oar', verts=6)
    k.blob(x1 - 0.15, r + 0.42, z + 0.03, 0.17, 0.06, 0.015, A.WOOD_L, 'oar_blade', segs=8)


def anchor(k, x, r, z=0.0, col='#3a2e2a'):
    """An old anchor lying in the grass, rusted."""
    k.tube((x - 0.5, r, z + 0.05), (x + 0.5, r, z + 0.05), 0.04, col, 'anchor', verts=8)
    k.tube((x - 0.45, r - 0.28, z + 0.05), (x - 0.45, r + 0.28, z + 0.05), 0.035, col, 'anchor', verts=8)
    for s in (-1, 1):
        k.tube((x + 0.5, r, z + 0.05), (x + 0.7, r + s * 0.3, z + 0.05), 0.035, col, 'anchor', verts=8)
        k.blob(x + 0.72, r + s * 0.34, z + 0.05, 0.08, 0.06, 0.03, col, 'anchor', segs=8)
    W.annulus(k, x - 0.62, r, 0.05, 0.1, z, z + 0.04, col, 'anchor', segs=12)


def rope_coil(k, x, r, z=0.0, n=3, col='#b8a070'):
    for j in range(n):
        W.annulus(k, x, r, 0.07, 0.2 - j * 0.02, z + j * 0.05, z + j * 0.05 + 0.05, (col, 0.25), 'rope', segs=18)


def net_rack(k, x0, x1, r, rng, h=1.2):
    """Nets hung to dry over a pole on two posts, floats along the foot."""
    for nx in (x0, x1):
        k.cyl(nx, r, 0.0, h + 0.05, 0.045, (A.WOOD_D, 0.12), 'net_post', verts=8)
    k.cyl_x(x0 - 0.08, x1 + 0.08, r, h, 0.035, 0.035, (A.WOOD, 0.12), 'net_pole', verts=8)
    cords = []
    n = int((x1 - x0) / 0.14)
    for i in range(n + 1):
        x = x0 + 0.08 + (x1 - x0 - 0.16) * i / n
        cords.append((x - 0.008, r - 0.01, 0.25 + 0.05 * math.sin(i * 1.7), x + 0.008, r + 0.01, h - 0.02))
    z = 0.28
    while z < h - 0.05:
        cords.append((x0 + 0.08, r - 0.01, z - 0.008, x1 - 0.08, r + 0.01, z + 0.008))
        z += 0.11
    k.boxes(cords, '#4a5a52', 'net')
    for i in range(int((x1 - x0) / 0.3)):
        k.sphere(x0 + 0.2 + i * 0.3, r + 0.02, 0.25, 0.045, 0.045, '#e8a040', 'float', segs=8)


def wheelbarrow(k, x, r, z=0.0, tone='#7a5a34'):
    k.box(x - 0.3, r - 0.18, z + 0.18, x + 0.2, r + 0.18, z + 0.42, (tone, 0.15), 'barrow')
    k.box(x - 0.26, r - 0.14, z + 0.38, x + 0.16, r + 0.14, z + 0.43, ('#4a3420', 0.2), 'soil')
    k.cyl_y(x + 0.32, r - 0.03, r + 0.03, z + 0.13, 0.13, 0.13, '#3a3030', 'barrow_wheel', verts=12)
    for s in (-1, 1):
        k.tube((x + 0.3, r + s * 0.05, z + 0.13), (x - 0.65, r + s * 0.2, z + 0.42), 0.02, A.WOOD_D, 'barrow_handle', verts=5)
        k.tube((x - 0.2, r + s * 0.15, z + 0.18), (x - 0.25, r + s * 0.15, z), 0.018, A.WOOD_D, 'barrow_leg', verts=4)


def washing_line(k, x0, x1, r, rng, h=1.35):
    """A line between two props with washing pegged out."""
    for x in (x0, x1):
        k.cyl(x, r, 0.0, h + 0.05, 0.03, (A.WOOD_D, 0.12), 'line_post', verts=6)
    k.cyl_x(x0, x1, r, h - 0.02, 0.008, 0.008, '#d8d0c0', 'line', verts=4)
    x = x0 + 0.25
    while x < x1 - 0.35:
        w = rng.uniform(0.2, 0.38)
        dh = rng.uniform(0.3, 0.5)
        col = rng.choice(('#f0ece4', '#b8c8d8', '#e8d0a0', '#c86a5a', '#8aa8c0', '#f0ece4'))
        k.box(x, r - 0.012, h - 0.02 - dh, x + w, r + 0.012, h - 0.02, (col, 0.15), 'washing')
        x += w + rng.uniform(0.06, 0.16)


def flower_clump(k, x, r, rng, z=0.0, col=None, n=None):
    """A clump of taller meadow grass with flowers of one kind over it (campion, buttercup, ox-eye, clover, thrift)."""
    col = col or rng.choice(('#e05878', '#f0d040', '#f4f0e4', '#c8a0e0', '#f0a0c0'))
    blades = []
    for j in range(n or rng.randint(10, 18)):
        a, d = rng.uniform(0, math.tau), rng.uniform(0, 0.22)
        blades.append((x + math.cos(a) * d, r + math.sin(a) * d * 0.7, z, rng.uniform(0.14, 0.28), 0.022,
                       rng.uniform(-0.06, 0.06), rng.uniform(-0.03, 0.03)))
    k.blades(blades, (shade('#5a8a40', rng.uniform(0.9, 1.1)), 0.25), 'grass')
    for j in range(rng.randint(4, 8)):
        a, d = rng.uniform(0, math.tau), rng.uniform(0, 0.2)
        k.sphere(x + math.cos(a) * d, r + math.sin(a) * d * 0.7, z + rng.uniform(0.18, 0.3), 0.035, 0.03, col, 'meadow_flower', segs=5)
