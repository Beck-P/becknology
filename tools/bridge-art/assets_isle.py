"""Big explorable Lumar islands: builders for scenekit (bpy).
Tile units: x = column, r = row (toward the camera), z = height.

An island is a noisy union of lobes (mask), walked on at z = 0: ground() lays
one continuous surface over its cells, banded by a material function (moor,
paths, ash, sand…), so there are no per-tile seams; ridge() raises a rock
massif with stratified cliff faces where the island climbs out of reach;
assets_coast.coast() then takes the shore down into the sea. The rest are
the things that make each island its own place: tents and a campfire, a
ruined watchtower, standing stones, twisted trees, a wreck on the reef, a
rope bridge out to a sea stack, a cave mouth in the cliff.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

from scenekit import S, shade
import assets_lumar as A
import assets_town as W


def n2(x, r, f, seed):
    return noise.noise(Vector((x * f + seed * 13.1, r * f - seed * 7.7, seed * 2.9)))


def smooth(a, b, t):
    t = min(1.0, max(0.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---- shape -----------------------------------------------------------------------------------
def mask(cols, rows, lobes, seed=1, amp=0.16, freq=0.16, margin=3):
    """Land cells: inside any lobe (cx, cr, rx, ry), the edge pushed about by noise."""
    cells = set()
    for r in range(margin, rows - margin):
        for c in range(margin, cols - margin):
            x, y = c + 0.5, r + 0.5
            f = max(1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2 for (cx, cy, rx, ry) in lobes)
            if f + amp * n2(x, y, freq, seed) + 0.5 * amp * n2(x, y, freq * 2.7, seed + 3) > 0:
                cells.add((c, r))
    return cells


def flood(cells, start):
    """The cells connected to start (4-neighbour)."""
    seen, todo = {tuple(start)}, [tuple(start)]
    while todo:
        c, r = todo.pop()
        for (dc, dr) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (c + dc, r + dr)
            if q in cells and q not in seen:
                seen.add(q)
                todo.append(q)
    return seen


def seg_dist(x, r, a, b):
    ax, ar = a
    bx, br = b
    dx, dr = bx - ax, br - ar
    L = dx * dx + dr * dr
    t = 0.0 if L == 0 else max(0.0, min(1.0, ((x - ax) * dx + (r - ar) * dr) / L))
    return math.hypot(x - (ax + t * dx), r - (ar + t * dr))


def path_dist(paths, x, r):
    return min((seg_dist(x, r, a, b) for p in paths for a, b in zip(p, p[1:])), default=1e9)


# ---- surfaces ----------------------------------------------------------------------------------
def _mesh(k, faces_by_key, verts_fn, albedo, part_prefix):
    """One mesh object per material band from quads given as corner keys."""
    for key, faces in faces_by_key.items():
        bm = bmesh.new()
        vm = {}

        def v(p):
            if p not in vm:
                x, r, z = verts_fn(p)
                vm[p] = bm.verts.new((x, -r * S, z))
            return vm[p]
        for f in faces:
            bm.faces.new([v(p) for p in f])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for f in bm.faces:
            if f.normal.z < 0:
                f.normal_flip()
        me = bpy.data.meshes.new(part_prefix)
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(part_prefix, me)
        k.scene.collection.objects.link(o)
        k._finish(o, albedo[key], part_prefix + '_' + key)


def ground(k, cells, material, albedo, step=0.25, bump=0.012, seed=7, height=None):
    """One continuous walking surface over `cells`, quads banded by
    material(x, r) -> key into albedo {key: (colour, rough)}. height(x, r)
    sculpts it (pools dug below the waterline fill with the sea's water)."""
    n = int(round(1 / step))
    faces = {}
    for (c, r) in cells:
        for j in range(n):
            for i in range(n):
                x, y = c + (i + 0.5) * step, r + (j + 0.5) * step
                key = material(x, y)
                a = (c * n + i, r * n + j)
                faces.setdefault(key, []).append((a, (a[0] + 1, a[1]), (a[0] + 1, a[1] + 1), (a[0], a[1] + 1)))

    def vert(p):
        x, r = p[0] * step, p[1] * step
        return x, r, bump * n2(x, r, 3.1, seed) - 0.004 + (height(x, r) if height else 0.0)
    _mesh(k, faces, vert, albedo, 'ground')


def ridge(k, cells, top=3.0, slope=1.1, seed=5, rock='#3a3034', strata=('#4a3c3e', '#352a2e', '#5a4642'),
          moss='#5a2a2a', notches=(), step=0.2):
    """A rock massif over `cells`: rising `slope` tiles in from its edge to
    about `top`, cliffs banded in strata, a mossy crown. notches: rects
    (x0, r0, x1, r1) kept at ground level (a cave mouth cut into the face).
    Returns height(x, r)."""
    cellset = set(cells)

    def inside_dist(x, r):
        # distance to the nearest cell outside the massif (cheap: search a small window)
        best = 3.0
        c0, r0 = int(math.floor(x)), int(math.floor(r))
        for dc in range(-3, 4):
            for dr in range(-3, 4):
                q = (c0 + dc, r0 + dr)
                if q in cellset:
                    continue
                dx = max(q[0] - x, x - (q[0] + 1), 0.0)
                dy = max(q[1] - r, r - (q[1] + 1), 0.0)
                best = min(best, math.hypot(dx, dy))
        return best

    def height(x, r):
        if any(a <= x <= c and b <= r <= d for (a, b, c, d) in notches):
            return 0.0
        d = inside_dist(x, r)
        h = top * (1 + 0.28 * n2(x, r, 0.35, seed)) * smooth(0.0, slope, d + 0.12 * n2(x, r, 1.7, seed + 1))
        return h + 0.12 * n2(x, r, 2.3, seed + 2) * smooth(0.1, slope, d)

    n = int(round(1 / step))
    H = {}

    def hv(p):
        if p not in H:
            H[p] = height(p[0] * step, p[1] * step)
        return H[p]
    faces = {}
    for (c, r) in cells:
        for j in range(n):
            for i in range(n):
                a = (c * n + i, r * n + j)
                q = (a, (a[0] + 1, a[1]), (a[0] + 1, a[1] + 1), (a[0], a[1] + 1))
                zs = [hv(p) for p in q]
                zc = sum(zs) / 4
                steep = (max(zs) - min(zs)) / step
                if steep > 1.2:
                    key = 'cliff%d' % (int(zc * 3.2 + 0.6 * n2(c + i * step, zc, 0.8, seed)) % 3)
                elif zc > top * 0.55:
                    key = 'crown' if n2(c + i * step, r + j * step, 0.9, seed + 4) > -0.2 else 'cliff0'
                else:
                    key = 'scree'
                faces.setdefault(key, []).append(q)
    alb = {'cliff0': (strata[0], 0.25), 'cliff1': (strata[1], 0.25), 'cliff2': (strata[2], 0.25),
           'crown': (moss, 0.3), 'scree': (rock, 0.3)}
    _mesh(k, faces, lambda p: (p[0] * step, p[1] * step, hv(p)), alb, 'ridge')
    return height


# ---- things -------------------------------------------------------------------------------------
def tufts(k, cells, tone, per_cell=1.2, avoid=None, h=(0.08, 0.17)):
    for (c, r) in cells:
        m = int(per_cell) + (1 if k.rng.random() < per_cell % 1 else 0)
        for _ in range(m):
            x, y = c + k.rng.random(), r + k.rng.random()
            if avoid and avoid(x, y):
                continue
            for j in range(3):
                k.cone(x + j * 0.04 - 0.04, y, -0.01, k.rng.uniform(*h), 0.025, 0.002,
                       shade(tone, k.rng.uniform(1.0, 1.45)), 'tuft', verts=3)


def pebbles(k, cells, tone, per_cell=0.3, avoid=None):
    for (c, r) in cells:
        if k.rng.random() > per_cell:
            continue
        x, y = c + k.rng.random(), r + k.rng.random()
        if avoid and avoid(x, y):
            continue
        s = k.rng.uniform(0.04, 0.09)
        k.rock(x, y, 0.0, s, s * 0.8, s * 0.5, (shade(tone, k.rng.uniform(0.8, 1.2)), 0.2), part='pebble', segs=6)


def dead_tree(k, cx, cr, h=2.2, tone='#3a2a26', lean=0.15, seed=0):
    """A bare, twisted tree: a crooked trunk splitting into gnarled limbs."""
    rng = k.rng
    pts = [(cx, cr, 0.0)]
    x, r, z = cx, cr, 0.0
    for i in range(4):
        x += lean * 0.4 + rng.uniform(-0.12, 0.12)
        r += rng.uniform(-0.05, 0.05)
        z += h * 0.18
        pts.append((x, r, z))
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        k.tube(a, b, 0.11 - i * 0.02, (tone, 0.2), 'deadwood', rb=0.09 - i * 0.02, verts=7)
    top = pts[-1]
    for j in range(5):
        ang = j * 1.3 + rng.uniform(0, 0.6)
        L = rng.uniform(0.4, 0.8) * h / 2.2
        e = (top[0] + math.cos(ang) * L, top[1] + math.sin(ang) * L * 0.4, top[2] + rng.uniform(0.2, 0.6))
        k.tube(top, e, 0.045, (tone, 0.2), 'deadwood', rb=0.012, verts=5)
        f = (e[0] + math.cos(ang + 0.6) * L * 0.5, e[1], e[2] + rng.uniform(0.05, 0.3))
        k.tube(e, f, 0.014, (tone, 0.2), 'deadwood', rb=0.004, verts=4)
    mid = pts[2]
    k.tube(mid, (mid[0] - 0.5, mid[1] + 0.05, mid[2] + 0.35), 0.04, (tone, 0.2), 'deadwood', rb=0.01, verts=5)
    for _ in range(3):                                    # roots
        a = rng.uniform(0, math.tau)
        k.tube((cx, cr, 0.08), (cx + math.cos(a) * 0.4, cr + math.sin(a) * 0.25, -0.02), 0.05, (tone, 0.2), 'root', rb=0.015, verts=5)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def red_pine(k, cx, cr, h=2.6, tone='#4a2430', trunk='#2a1a18'):
    """A wind-bent pine of the crimson isle: dark needles with a red cast."""
    lean = k.rng.uniform(-0.15, 0.2)
    k.tube((cx, cr, 0.0), (cx + lean, cr, h * 0.35), 0.08, (trunk, 0.15), 'trunk', rb=0.06, verts=6)
    for i in range(4):
        z0 = h * (0.2 + i * 0.18)
        rad = 0.62 * (1 - i * 0.2) * k.rng.uniform(0.85, 1.1)
        k.cone(cx + lean * (0.8 + i * 0.1), cr, z0, z0 + h * 0.34, rad, 0.02, (shade(tone, 1 + i * 0.08), 0.2), 'pine', verts=8)
    k.solid(cx - 0.35, cr - 0.35, cx + 0.35, cr + 0.35)


def standing_stone(k, cx, cr, h=1.6, tone='#4a4448', glyph=None, lean=0.0):
    k.blob(cx, cr, h * 0.45, 0.26, 0.2, h * 0.55, (tone, 0.22), 'menhir', rot=(lean, 0, k.rng.uniform(-20, 20)), segs=8,
           smooth=False)
    if glyph:
        k.box(cx - 0.06, cr + 0.19, h * 0.45, cx + 0.06, cr + 0.21, h * 0.75, shade(glyph, 0.4), 'menhir_rune', emit=(glyph, 0.8))
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def ruined_tower(k, cx, cr, rad=1.3, h=3.2, tone='#5a5054', seed=3):
    """A broken round watchtower: a ring of masonry courses ragged at the
    top, the near side fallen to rubble, a doorway, a spiral of steps inside."""
    rng = k.rng
    n = 14
    for i in range(n):
        a0, a1 = i * math.tau / n, (i + 1) * math.tau / n
        am = (a0 + a1) / 2
        near = math.sin(am) > 0.35                 # the side facing the camera has fallen
        top = (0.5 + rng.uniform(0, 0.5)) if near else h * (0.55 + 0.45 * (0.5 + 0.5 * math.sin(am * 1.7 + seed))) + rng.uniform(-0.2, 0.2)
        if abs(am - math.pi / 2) < 0.3:
            continue                                # the doorway
        z = 0.0
        while z < top - 0.05:
            zh = min(0.28, top - z)
            o = 0.03 if int(z / 0.28) % 2 else 0.0
            k.bar(cx + math.cos(a0 + o) * rad, cr + math.sin(a0 + o) * rad * 0.9, cx + math.cos(a1 + o) * rad,
                  cr + math.sin(a1 + o) * rad * 0.9, z, z + zh - 0.02, 0.3, (shade(tone, rng.uniform(0.85, 1.1)), 0.22), 'tower_stone')
            z += zh
    for i in range(10):                               # rubble spilled forward
        a = math.pi / 2 + rng.uniform(-0.9, 0.9)
        d = rad + rng.uniform(0.1, 0.9)
        s = rng.uniform(0.12, 0.26)
        k.rock(cx + math.cos(a) * d, cr + math.sin(a) * d * 0.9, s * 0.3, s, s * 0.8, s * 0.6, (shade(tone, rng.uniform(0.75, 1.0)), 0.22),
               part='rubble')
    for i in range(7):                                # steps spiralling up the inside of the back wall
        a = math.pi + 0.3 + i * 0.32
        x, r = cx + math.cos(a) * (rad - 0.35), cr + math.sin(a) * (rad - 0.35) * 0.9
        k.box(x - 0.2, r - 0.15, 0.0, x + 0.2, r + 0.15, 0.25 + i * 0.3, (shade(tone, 0.9), 0.22), 'tower_step')
    k.cyl(cx, cr, -0.01, 0.01, rad - 0.15, ('#3a3236', 0.3), 'tower_floor', verts=20, ry=(rad - 0.15) * 0.9)


def tent(k, cx, cr, w=1.6, d=1.4, h=1.15, col='#7a2a26', trim='#d8c8a0'):
    """A ridge tent, its open flap toward the camera, a lamp glowing inside."""
    x0, x1 = cx - w / 2, cx + w / 2
    r0, r1 = cr - d / 2, cr + d / 2
    for s in (-1, 1):
        k.poly([(x0 + 0.05, cr, h), (x1 - 0.05, cr, h), (x1, cr + s * d / 2, 0.0), (x0, cr + s * d / 2, 0.0)], (col, 0.3), 'tent')
    k.poly([(x0, r0, 0.0), (x0, r1, 0.0), (x0 + 0.05, cr, h)], (shade(col, 0.8), 0.3), 'tent')
    k.poly([(x1, r0, 0.0), (x1, r1, 0.0), (x1 - 0.05, cr, h)], (shade(col, 0.8), 0.3), 'tent_end')
    k.poly([(x1 + 0.01, cr + 0.05, 0.0), (x1 + 0.01, r1 - 0.05, 0.0), (x1 + 0.01, cr + 0.02, h * 0.9)], '#1a0c08', 'tent_door',
           emit=('#ffb050', 0.35))
    k.tube((x0 - 0.1, cr, h + 0.15), (x1 + 0.1, cr, h + 0.15), 0.025, A.WOOD_D, 'tent_pole', verts=5)
    for x in (x0 - 0.05, x1 + 0.05):
        k.tube((x, cr, 0.0), (x, cr, h + 0.2), 0.025, A.WOOD_D, 'tent_pole', verts=5)
    k.bar(x0 + 0.1, r1 - 0.06, x1 - 0.1, r1 - 0.06, 0.0, 0.06, 0.03, trim, 'tent_trim')
    k.point_light(x1 + 0.4, cr + 0.3, 0.5, '#ffb050', 5, radius=0.1, group='flicker')
    k.solid(x0 - 0.1, r0, x1 + 0.1, r1)


def campfire(k, cx, cr, energy=60):
    for i in range(9):
        a = i * math.tau / 9
        k.rock(cx + math.cos(a) * 0.38, cr + math.sin(a) * 0.3, 0.04, 0.1, 0.08, 0.07, ('#3a3234', 0.2), part='fire_stone', segs=6)
    for a in (0.3, 1.4, 2.5):
        k.tube((cx + math.cos(a) * 0.3, cr + math.sin(a) * 0.22, 0.02), (cx - math.cos(a) * 0.05, cr - math.sin(a) * 0.04, 0.18),
               0.04, A.WOOD_D, 'fire_log', verts=6)
    k.cone(cx, cr, 0.05, 0.42, 0.16, 0.01, '#802010', 'flame', emit=(A.FIRE, 1.0), verts=7)
    k.cone(cx + 0.03, cr + 0.02, 0.05, 0.28, 0.1, 0.01, '#c06010', 'flame', emit=(A.FIRE_HOT, 1.0), verts=6)
    k.point_light(cx, cr, 0.6, '#ff9040', energy, radius=0.15, group='flicker')
    k.solid(cx - 0.45, cr - 0.4, cx + 0.45, cr + 0.4)


def log_seat(k, x0, x1, cr):
    k.cyl_x(x0, x1, cr, 0.14, 0.14, 0.13, (A.WOOD_D, 0.2), 'log_seat', verts=10)
    k.cyl_x(x0 - 0.01, x0, cr, 0.14, 0.12, 0.11, A.WOOD_L, 'log_end', verts=10)


def flagpole(k, cx, cr, h=3.2, col='#a02028'):
    k.cyl(cx, cr, 0.0, h, 0.04, A.WOOD_D, 'flagpole', verts=6)
    k.poly([(cx, cr, h - 0.05), (cx + 0.95, cr + 0.02, h - 0.2), (cx + 0.8, cr + 0.03, h - 0.38), (cx + 0.9, cr + 0.03, h - 0.6),
            (cx, cr, h - 0.65)], (col, 0.3), 'flag')
    k.sphere(cx + 0.42, cr + 0.04, h - 0.33, 0.1, 0.1, '#e8dcc8', 'flag_skull', segs=8)
    k.solid(cx - 0.2, cr - 0.2, cx + 0.2, cr + 0.2)


def chest(k, cx, cr, glow='#ffd060'):
    k.box(cx - 0.3, cr - 0.2, 0.0, cx + 0.3, cr + 0.2, 0.3, (A.WOOD, 0.15), 'chest', bevel=0.02)
    k.cyl_x(cx - 0.3, cx + 0.3, cr, 0.3, 0.2, 0.12, (A.WOOD, 0.15), 'chest_lid', verts=12)
    for x in (cx - 0.22, cx + 0.2):
        k.box(x, cr - 0.21, 0.0, x + 0.04, cr + 0.21, 0.42, A.BRASS, 'chest_band')
    k.box(cx - 0.05, cr + 0.2, 0.18, cx + 0.05, cr + 0.22, 0.28, A.BRASS, 'chest_lock')
    k.solid(cx - 0.35, cr - 0.25, cx + 0.35, cr + 0.25)


def x_mark(k, cx, cr, col='#a02028'):
    for (a, b) in (((-0.3, -0.22), (0.3, 0.22)), ((-0.3, 0.22), (0.3, -0.22))):
        k.bar(cx + a[0], cr + a[1], cx + b[0], cr + b[1], 0.0, 0.006, 0.08, col, 'x_mark')


def bones(k, cx, cr, s=1.0):
    k.blob(cx, cr, 0.08 * s, 0.14 * s, 0.12 * s, 0.1 * s, '#d8d0c0', 'skull', segs=8)
    for a in (0.2, 1.3, 2.4, 3.9):
        k.tube((cx + math.cos(a) * 0.2 * s, cr + math.sin(a) * 0.12 * s, 0.02), (cx + math.cos(a) * 0.55 * s, cr + math.sin(a) * 0.3 * s, 0.03),
               0.02 * s, '#d0c8b4', 'bone', verts=5)


def rib_cage(k, cx, cr, L=2.4, h=1.1, tone='#d8d0c0'):
    """The bleached ribs of something huge, arching out of the ash."""
    k.tube((cx - L / 2, cr, 0.1), (cx + L / 2, cr, 0.18), 0.07, tone, 'spine', verts=7)
    for i in range(7):
        x = cx - L / 2 + 0.2 + i * (L - 0.4) / 6
        hh = h * (0.7 + 0.3 * math.sin(math.pi * (i + 0.5) / 7))
        for s in (-1, 1):
            k.tube((x, cr, 0.15), (x + 0.1, cr + s * 0.35, hh), 0.045, tone, 'rib', rb=0.03, verts=6)
            k.tube((x + 0.1, cr + s * 0.35, hh), (x + 0.2, cr + s * 0.6, 0.0), 0.03, tone, 'rib', rb=0.015, verts=6)
    k.solid(cx - L / 2, cr - 0.6, cx + L / 2, cr + 0.6)


def lava_vein(k, pts, col='#ff5020', w=0.06):
    """A glowing crack in the ground (ember light seeping up)."""
    for a, b in zip(pts, pts[1:]):
        k.bar(a[0], a[1], b[0], b[1], -0.004, 0.004, w, '#401008', 'lava_vein', emit=(col, 0.9))


def rope_bridge(k, a, b, z=0.05, width=0.8, rope='#8a7450', plank=A.WOOD):
    """Planks hung on ropes between two points (x, r) — walkable."""
    ax, ar = a
    bx, br = b
    L = math.hypot(bx - ax, br - ar)
    n = max(3, int(L / 0.24))
    ux, ur = (bx - ax) / L, (br - ar) / L
    px, pr = -ur, ux
    for i in range(n + 1):
        t = i / n
        sag = -0.12 * math.sin(math.pi * t)
        x, r = ax + (bx - ax) * t, ar + (br - ar) * t
        k.bar(x - px * width / 2, r - pr * width / 2, x + px * width / 2, r + pr * width / 2, z + sag - 0.04, z + sag, 0.16,
              (shade(plank, k.rng.uniform(0.85, 1.1)), 0.15), 'bridge_plank')
    for s in (-1, 1):
        prev = None
        for i in range(n + 1):
            t = i / n
            x, r = ax + (bx - ax) * t + px * s * width / 2, ar + (br - ar) * t + pr * s * width / 2
            p = (x, r, z + 0.55 - 0.1 * math.sin(math.pi * t))
            if prev:
                k.tube(prev, p, 0.018, rope, 'bridge_rope', verts=4)
            prev = p
        for t in (0.0, 1.0):
            x, r = ax + (bx - ax) * t + px * s * width / 2, ar + (br - ar) * t + pr * s * width / 2
            k.cyl(x, r, -0.5, z + 0.7, 0.05, A.WOOD_D, 'bridge_post', verts=6)


def tilt(k, since, pivot, roll=0.0, pitch=0.0, lights_since=None):
    """Rotate everything built since len(k.parts) == since about pivot
    (x, r, z): roll leans it toward the camera, pitch dips the bow."""
    bpy.context.view_layer.update()
    px, pr, pz = pivot
    P = Vector((px, -pr * S, pz))
    R = (Matrix.Rotation(math.radians(roll), 4, 'X') @ Matrix.Rotation(math.radians(pitch), 4, 'Y'))
    M = Matrix.Translation(P) @ R @ Matrix.Translation(-P)
    for p in k.parts[since:]:
        p['obj'].matrix_world = M @ p['obj'].matrix_world
    for L in k.lights[(len(k.lights) if lights_since is None else lights_since):]:
        L['obj'].matrix_world = M @ L['obj'].matrix_world


# ---- Rose Cove ------------------------------------------------------------------------------------
def crystal_bed(k, x0, x1, cr, col=('#6a2a4a', '#f080b0'), wall='#7a6a6e', soil='#4a3438', every=0.55):
    """A terrace bed: a low drystone wall along its front, dark soil, a row
    of young crystals growing in it like vines."""
    k.box(x0, cr - 0.35, 0.0, x1, cr + 0.3, 0.12, (soil, 0.3), 'bed_soil')
    x = x0
    while x < x1 - 0.05:                                   # the wall: stones of uneven length
        L = min(k.rng.uniform(0.3, 0.55), x1 - x)
        k.box(x + 0.01, cr + 0.3, 0.0, x + L - 0.01, cr + 0.48, k.rng.uniform(0.24, 0.32),
              (shade(wall, k.rng.uniform(0.85, 1.1)), 0.2), 'bed_wall', bevel=0.02)
        x += L
    x = x0 + 0.3
    while x < x1 - 0.2:
        h = k.rng.uniform(0.18, 0.45)
        for (dx, lean) in ((0.0, 0), (0.07, 18), (-0.06, -16)):
            top = (x + dx + math.sin(math.radians(lean)) * h * 0.5, cr, 0.12 + h * (1 if dx == 0 else 0.7))
            k.tube((x + dx, cr, 0.1), top, 0.035 if dx == 0 else 0.025, col[0], 'bed_crystal', rb=0.003,
                   emit=(col[1], 0.6), verts=5, smooth=False)
        x += every
    k.point_light((x0 + x1) / 2, cr + 0.5, 0.4, col[1], 6 * (x1 - x0) / 3, radius=0.4, group='flicker')
    k.solid(x0, cr - 0.35, x1, cr + 0.48)


def glasshouse(k, x0, x1, r0, r1, h=1.6, frame='#d8d0d8', glow='#f080b0'):
    """A small glasshouse: white frame, panes glowing faintly pink from the
    crystals growing inside, a ridge roof of glass."""
    k.box(x0, r0, 0.0, x1, r1, 0.2, ('#6a6268', 0.2), 'gh_base')
    for (a, b, c, d) in ((x0, r0, x1, r0 + 0.05), (x0, r1 - 0.05, x1, r1), (x0, r0, x0 + 0.05, r1), (x1 - 0.05, r0, x1, r1)):
        k.box(a, b, 0.2, c, d, h, '#1a1018', 'gh_glass_back' if b == r0 else 'gh_glass', emit=('#5a2a44', 0.35))
    rm = (r0 + r1) / 2
    for s in (-1, 1):
        rr = r0 if s < 0 else r1
        k.poly([(x0, rr, h), (x1, rr, h), (x1, rm, h + 0.6), (x0, rm, h + 0.6)], '#20141c', 'gh_roof', emit=('#6a3050', 0.35))
    x = x0
    while x <= x1 + 1e-6:
        for rr in (r0, r1):
            k.box(x - 0.025, rr - 0.03, 0.2, x + 0.025, rr + 0.03, h, frame, 'gh_frame')
        k.tube((x, r0, h), (x, rm, h + 0.6), 0.02, frame, 'gh_frame', verts=4)
        k.tube((x, r1, h), (x, rm, h + 0.6), 0.02, frame, 'gh_frame', verts=4)
        x += (x1 - x0) / max(1, round((x1 - x0) / 0.6))
    for rr in (r0, r1):
        k.box(x0, rr - 0.03, h - 0.03, x1, rr + 0.03, h + 0.02, frame, 'gh_frame')
        k.box(x0, rr - 0.03, 0.85, x1, rr + 0.03, 0.89, frame, 'gh_frame')
    k.box(x0, rm - 0.03, h + 0.57, x1, rm + 0.03, h + 0.63, frame, 'gh_frame')
    k.box((x0 + x1) / 2 - 0.3, r1 - 0.02, 0.2, (x0 + x1) / 2 + 0.3, r1 + 0.02, 1.25, '#2a1a24', 'gh_door', emit=('#7a3a5a', 0.4))
    k.point_light((x0 + x1) / 2, rm, 0.9, glow, 30, radius=0.6, group='flicker')
    k.solid(x0, r0, x1, r1)


def windmill(k, cx, cr, h=3.4, rad=0.85, sails=4, tone='#b8aca8', roof='#5a2a40', chimes=True):
    """A stone tower mill with a capped roof and four lattice sails, shell
    chimes hung from the sail tips."""
    k.cyl(cx, cr, 0.0, h, rad, (tone, 0.2), 'mill_tower', verts=14, ry=rad * 0.95)
    for z in (0.9, 1.9, 2.8):
        k.cyl(cx, cr, z, z + 0.06, rad + 0.02, shade(tone, 0.8), 'mill_band', verts=14)
    k.cone(cx, cr, h, h + 1.0, rad + 0.15, 0.05, (roof, 0.2), 'mill_cap', verts=14)
    k.box(cx - 0.25, cr + rad * 0.9, 0.0, cx + 0.25, cr + rad + 0.02, 0.95, '#3a2418', 'mill_door')
    for (wz, wx) in ((1.5, -0.25), (2.4, 0.2)):
        k.box(cx + wx - 0.1, cr + rad * 0.9, wz, cx + wx + 0.1, cr + rad + 0.03, wz + 0.25, '#4a2a18', 'mill_window',
              emit=('#ffd890', 0.7))
    hub = (cx, cr + rad + 0.25, h - 0.3)
    k.cyl_y(cx, cr + rad - 0.1, cr + rad + 0.3, h - 0.3, 0.1, 0.1, '#3a2a20', 'mill_axle', verts=10)
    for i in range(sails):
        a = i * math.tau / sails + 0.35
        tip = (cx + math.cos(a) * 2.0, cr + rad + 0.3, h - 0.3 + math.sin(a) * 2.0)
        k.tube(hub, tip, 0.04, '#4a3020', 'mill_spar', verts=5)
        px, pz = -math.sin(a), math.cos(a)
        for t in (0.35, 0.55, 0.75, 0.95):
            c = (cx + math.cos(a) * 2.0 * t, cr + rad + 0.32, h - 0.3 + math.sin(a) * 2.0 * t)
            k.tube(c, (c[0] + px * 0.32, c[1], c[2] + pz * 0.32), 0.015, '#4a3020', 'mill_lath', verts=4)
        k.poly([(cx + math.cos(a) * 0.6, cr + rad + 0.33, h - 0.3 + math.sin(a) * 0.6),
                (tip[0], cr + rad + 0.33, tip[2]),
                (tip[0] + px * 0.32, cr + rad + 0.33, tip[2] + pz * 0.32),
                (cx + math.cos(a) * 0.6 + px * 0.32, cr + rad + 0.33, h - 0.3 + math.sin(a) * 0.6 + pz * 0.32)],
               ('#e8dcd0', 0.3), 'mill_sail')
        if chimes:
            for j in range(3):
                k.cyl(tip[0] + (j - 1) * 0.05, cr + rad + 0.36, tip[2] - 0.3 - j * 0.04, tip[2] - 0.05, 0.012, '#f0e0f0',
                      'chime', verts=5)
    k.solid(cx - rad, cr - rad, cx + rad, cr + rad)


def glow_roses(k, cells, col=('#6a2a4a', '#ff80c0'), per_cell=0.6, avoid=None):
    """Low rose bushes, their flowers faintly glowing."""
    for (c, r) in cells:
        if k.rng.random() > per_cell:
            continue
        x, y = c + k.rng.uniform(0.15, 0.85), r + k.rng.uniform(0.15, 0.85)
        if avoid and avoid(x, y):
            continue
        k.blob(x, y, 0.1, 0.16, 0.13, 0.1, (shade('#2e4430', k.rng.uniform(0.85, 1.15)), 0.25), 'rose_bush', segs=7)
        for _ in range(k.rng.randint(2, 4)):
            k.sphere(x + k.rng.uniform(-0.12, 0.12), y + k.rng.uniform(-0.06, 0.1), k.rng.uniform(0.16, 0.24), 0.04, 0.035,
                     col[0], 'rose', emit=(col[1], 0.7), segs=6)


def pool_rim(k, cx, cr, rx, ry, tone='#8a7e80', n=22):
    for i in range(n):
        a = i * math.tau / n + k.rng.uniform(-0.08, 0.08)
        s = k.rng.uniform(0.14, 0.26)
        k.rock(cx + math.cos(a) * rx, cr + math.sin(a) * ry, 0.0, s, s * 0.8, s * 0.5, (shade(tone, k.rng.uniform(0.8, 1.1)), 0.2),
               part='pool_rock', segs=7)


def bathhouse(k, x0, x1, r_back, r_front, wall='#9a8a88', roof='#5a2a40'):
    """An open-fronted bathhouse on posts: a wide eave, paper lanterns."""
    for x in (x0 + 0.1, x1 - 0.1):
        for r in (r_back + 0.1, r_front - 0.1):
            k.box(x - 0.08, r - 0.08, 0.0, x + 0.08, r + 0.08, 1.7, ('#4a3020', 0.15), 'bath_post')
    k.box(x0, r_back, 0.0, x1, r_back + 0.15, 1.7, (wall, 0.15), 'bath_wall')
    k.box(x0, r_back, 0.0, x1, r_front, 0.08, ('#6a4a30', 0.15), 'bath_deck')
    import assets_town as W
    W.pyramid(k, x0 - 0.35, r_back - 0.35, x1 + 0.35, r_front + 0.35, 1.7, 2.6, (roof, 0.2), 'bath_roof')
    for x in (x0 + 0.5, x1 - 0.5):
        k.sphere(x, r_front + 0.1, 1.45, 0.13, 0.17, '#a03050', 'paper_lantern', emit=('#ff8090', 0.8), segs=8)
        k.point_light(x, r_front + 0.4, 1.4, '#ff9090', 10, radius=0.1, group='flicker')
    k.solid(x0, r_back, x1, r_front)


def mine_mouth(k, cx, r_face, w=1.4, h=1.5, wood='#5a3a22', glow='#f080b0'):
    """A timbered adit into a rock outcrop: posts and lintel, a dark
    opening with a pink glow deep inside, cart rails running out."""
    k.box(cx - w / 2 - 0.9, r_face - 1.6, 0.0, cx + w / 2 + 0.9, r_face - 0.1, h + 0.9, ('#5a5054', 0.25), 'outcrop', bevel=0.1)
    for i in range(10):
        a = k.rng.uniform(0, math.tau)
        s = k.rng.uniform(0.3, 0.6)
        k.rock(cx + math.cos(a) * (w / 2 + 0.9), r_face - 0.8 + math.sin(a) * 0.6, k.rng.uniform(0.2, h + 0.6), s, s * 0.8, s,
               ('#5a5054', 0.22), part='outcrop_rock')
    k.box(cx - w / 2, r_face - 0.15, 0.0, cx + w / 2, r_face - 0.05, h, '#060406', 'mine_dark')
    k.box(cx - w / 2 + 0.2, r_face - 0.14, 0.05, cx + w / 2 - 0.2, r_face - 0.13, 0.4, '#200814', 'mine_glow', emit=(glow, 0.35))
    for x in (cx - w / 2 - 0.08, cx + w / 2 - 0.04):
        k.box(x, r_face - 0.12, 0.0, x + 0.12, r_face + 0.02, h + 0.1, (wood, 0.15), 'mine_post')
    k.box(cx - w / 2 - 0.2, r_face - 0.12, h, cx + w / 2 + 0.2, r_face + 0.04, h + 0.16, (wood, 0.15), 'mine_lintel')
    for x in (cx - 0.25, cx + 0.25):
        k.box(x - 0.02, r_face - 0.1, 0.0, x + 0.02, r_face + 2.2, 0.03, '#6a6a70', 'rail')
    r = r_face + 0.1
    while r < r_face + 2.2:
        k.box(cx - 0.4, r, -0.005, cx + 0.4, r + 0.08, 0.015, ('#4a3020', 0.15), 'sleeper')
        r += 0.3
    k.box(cx - 0.3, r_face + 1.4, 0.08, cx + 0.3, r_face + 1.9, 0.45, ('#5a4a40', 0.12), 'mine_cart', bevel=0.02)
    k.box(cx - 0.26, r_face + 1.44, 0.4, cx + 0.26, r_face + 1.86, 0.47, '#3a1828', 'cart_ore', emit=(glow, 0.4))
    k.point_light(cx, r_face + 0.3, 0.6, glow, 8, radius=0.2, group='flicker')
    k.solid(cx - w / 2 - 1.0, r_face - 1.6, cx + w / 2 + 1.0, r_face - 0.1)
    k.solid(cx - 0.35, r_face + 1.35, cx + 0.35, r_face + 1.95)


def crab_pots(k, cx, cr, n=3):
    for i in range(n):
        x, r = cx + i * 0.32, cr + (i % 2) * 0.12
        k.cyl(x, r, 0.0, 0.26, 0.14, ('#6a5038', 0.2), 'crab_pot', verts=8)
        for j in range(4):
            k.cyl(x, r, 0.05 + j * 0.06, 0.07 + j * 0.06, 0.15, '#3a2a1a', 'pot_band', verts=8)
    k.tube((cx, cr, 0.2), (cx - 0.5, cr + 0.3, 0.02), 0.012, '#a08a60', 'pot_rope', verts=4)


# ---- Sapphire Port --------------------------------------------------------------------------------
def lighthouse(k, cx, cr, h=5.2, rad=0.75, stripe='#2a4a9a', wall='#e8e4dc', lamp='#a0c8ff'):
    """A tapering lighthouse, banded blue and white, a gallery and a glass
    lantern room with a cold blue lamp (the engine sweeps its beam)."""
    n = 6
    for i in range(n):
        z0, z1 = h * i / n, h * (i + 1) / n
        r0_, r1_ = rad * (1 - 0.25 * i / n), rad * (1 - 0.25 * (i + 1) / n)
        k.cone(cx, cr, z0, z1, r0_, r1_, ((stripe if i % 2 else wall), 0.12), 'lh_tower', verts=16)
    top = rad * 0.75
    k.cyl(cx, cr, h, h + 0.08, top + 0.25, '#3a3a44', 'lh_gallery', verts=16)
    for i in range(12):
        a = i * math.tau / 12
        k.cyl(cx + math.cos(a) * (top + 0.22), cr + math.sin(a) * (top + 0.22), h + 0.08, h + 0.4, 0.015, '#3a3a44', 'lh_rail', verts=4)
    k.cyl(cx, cr, h + 0.08, h + 0.75, top * 0.8, '#1a2a40', 'lh_glass', emit=(lamp, 0.9), verts=12)
    k.cone(cx, cr, h + 0.75, h + 1.2, top * 0.95, 0.04, ('#2a2a34', 0.12), 'lh_cap', verts=12)
    k.box(cx - 0.25, cr + rad * 0.95, 0.0, cx + 0.25, cr + rad + 0.03, 0.95, '#2a3a5a', 'lh_door')
    for z in (1.6, 2.8):
        k.box(cx - 0.08, cr + rad * 0.85, z, cx + 0.08, cr + rad * 0.9 + 0.02, z + 0.25, '#3a3020', 'lh_window', emit=('#ffd890', 0.7))
    k.point_light(cx, cr, h + 0.4, lamp, 80, radius=0.2, group='flicker')
    k.solid(cx - rad, cr - rad, cx + rad, cr + rad)


def kiln(k, cx, cr, glow='#ffb040'):
    """A brick beehive kiln with a glowing mouth and a stack of fired pots."""
    k.sphere(cx, cr, 0.3, 0.75, 0.9, ('#8a4a32', 0.2), 'kiln_dome', ry=0.7, segs=14)
    k.cyl(cx, cr, 0.0, 0.3, 0.8, ('#6a3a28', 0.2), 'kiln_base', verts=14, ry=0.72)
    k.cyl(cx + 0.3, cr - 0.2, 0.9, 1.5, 0.12, ('#6a3a28', 0.2), 'kiln_flue', verts=8)
    k.box(cx - 0.22, cr + 0.6, 0.05, cx + 0.22, cr + 0.72, 0.42, '#401808', 'kiln_mouth', emit=(glow, 0.95))
    k.point_light(cx, cr + 1.0, 0.3, glow, 30, radius=0.15, group='flicker')
    for i, (dx, dr) in enumerate(((1.0, 0.2), (1.2, -0.2), (1.35, 0.25))):
        k.cyl(cx + dx, cr + dr, 0.0, 0.3 + 0.08 * i, 0.12, (('#2a5a9a', '#a05a3a', '#e0d8c8')[i], 0.1), 'pot', verts=10)
    k.solid(cx - 0.8, cr - 0.75, cx + 0.8, cr + 0.75)
    return (cx + 0.3, cr - 0.2 - 1.5 * 0.7071)                 # where its smoke rises (screen tiles)


def drying_rack(k, x0, x1, cr, fish=('#a8b8c0', '#c8a080', '#8a9aa0')):
    """Fish hung to dry on a line between two A-frames."""
    for x in (x0, x1):
        for s in (-1, 1):
            k.tube((x + s * 0.2, cr, 0.0), (x, cr, 1.4), 0.03, A.WOOD_D, 'rack_leg', verts=5)
    k.tube((x0, cr, 1.35), (x1, cr, 1.35), 0.02, A.WOOD, 'rack_pole', verts=5)
    x = x0 + 0.2
    while x < x1 - 0.1:
        k.blob(x, cr, 1.1, 0.05, 0.03, 0.2, k.rng.choice(fish), 'drying_fish', segs=7)
        x += 0.22
    k.solid(x0 - 0.2, cr - 0.25, x1 + 0.2, cr + 0.25)


def well(k, cx, cr, stone='#7a7a86'):
    import assets_town as W
    W.annulus(k, cx, cr, 0.3, 0.48, 0.0, 0.6, (stone, 0.2), 'well_wall')
    k.cyl(cx, cr, -0.2, 0.05, 0.3, '#0a1420', 'well_water', emit=('#2a4a8a', 0.3), verts=12)
    for s in (-1, 1):
        k.box(cx + s * 0.42 - 0.04, cr - 0.04, 0.6, cx + s * 0.42 + 0.04, cr + 0.04, 1.4, A.WOOD_D, 'well_post')
    k.cyl_x(cx - 0.46, cx + 0.46, cr, 1.3, 0.05, 0.05, A.WOOD, 'well_axle', verts=8)
    W.pyramid(k, cx - 0.6, cr - 0.45, cx + 0.6, cr + 0.45, 1.4, 1.85, ('#2a4a7a', 0.15), 'well_roof')
    k.cyl(cx + 0.1, cr, 0.8, 1.0, 0.09, ('#6a4a2a', 0.15), 'well_bucket', verts=8)
    k.solid(cx - 0.5, cr - 0.5, cx + 0.5, cr + 0.5)


# ---- Midnight Isle --------------------------------------------------------------------------------
def headstone(k, cx, cr, tone='#5a5868', lean=0.0, kind=0):
    """A grave marker: a rounded slab, a cross or a squat obelisk, a mound before it."""
    k.blob(cx, cr + 0.25, 0.0, 0.26, 0.32, 0.06, ('#2a2a32', 0.3), 'grave_mound', segs=8)
    rot = (lean, 0, k.rng.uniform(-6, 6))
    if kind == 0:
        k.blob(cx, cr, 0.35, 0.2, 0.06, 0.36, (shade(tone, k.rng.uniform(0.85, 1.1)), 0.2), 'headstone', rot=rot, segs=10)
    elif kind == 1:
        k.box(cx - 0.04, cr - 0.04, 0.0, cx + 0.04, cr + 0.04, 0.7, (tone, 0.2), 'grave_cross')
        k.box(cx - 0.18, cr - 0.04, 0.45, cx + 0.18, cr + 0.04, 0.53, (tone, 0.2), 'grave_cross')
    else:
        k.cone(cx, cr, 0.0, 0.8, 0.14, 0.03, (shade(tone, 0.9), 0.2), 'grave_obelisk', verts=4)
    k.solid(cx - 0.25, cr - 0.25, cx + 0.25, cr + 0.25)


def mausoleum(k, x0, x1, r_back, r_front, tone='#5a5868', glow='#a080ff'):
    """A small stone tomb: columns, a pediment, a door ajar with violet light."""
    k.box(x0, r_back, 0.0, x1, r_front, 0.2, (shade(tone, 0.8), 0.2), 'tomb_step')
    k.box(x0 + 0.15, r_back + 0.1, 0.2, x1 - 0.15, r_front - 0.35, 1.7, (tone, 0.2), 'tomb_body')
    for x in (x0 + 0.25, x1 - 0.25):
        k.cyl(x, r_front - 0.2, 0.2, 1.7, 0.1, (shade(tone, 1.1), 0.2), 'tomb_column', verts=10)
    import assets_town as W
    W.pyramid(k, x0, r_back, x1, r_front, 1.7, 2.3, (shade(tone, 0.85), 0.2), 'tomb_roof')
    cx = (x0 + x1) / 2
    k.box(cx - 0.3, r_front - 0.37, 0.2, cx + 0.3, r_front - 0.33, 1.3, '#100818', 'tomb_door', emit=(glow, 0.3))
    k.point_light(cx, r_front + 0.3, 0.7, glow, 10, radius=0.1, group='flicker')
    k.solid(x0, r_back, x1, r_front)


def plinth(k, cx, cr, empty=True, tone='#4a4458'):
    """A sentinel's plinth along the processional way; empty where it walked off."""
    k.box(cx - 0.35, cr - 0.35, 0.0, cx + 0.35, cr + 0.35, 0.45, (tone, 0.2), 'plinth', bevel=0.03)
    k.box(cx - 0.4, cr - 0.4, 0.4, cx + 0.4, cr + 0.4, 0.5, (shade(tone, 1.1), 0.2), 'plinth_cap')
    if empty:
        for (dx, dr) in ((-0.12, 0.05), (0.12, -0.05)):      # two worn footprints
            k.blob(cx + dx, cr + dr, 0.5, 0.08, 0.13, 0.005, '#2a2438', 'footprint', segs=8)
    else:
        k.blob(cx, cr, 1.0, 0.22, 0.18, 0.45, (shade(tone, 1.2), 0.2), 'statue', segs=10)
        k.sphere(cx, cr, 1.55, 0.14, 0.15, (shade(tone, 1.2), 0.2), 'statue_head', segs=10)
    k.solid(cx - 0.4, cr - 0.4, cx + 0.4, cr + 0.4)


def ruined_arch(k, x0, x1, r, h=2.6, tone='#5a5468', broken=False):
    """A pointed arch of the old abbey, standing alone; broken=True loses one side's top."""
    for (x, top) in ((x0, h), (x1, h * (0.55 if broken else 1.0))):
        k.box(x - 0.2, r - 0.2, 0.0, x + 0.2, r + 0.2, top, (shade(tone, k.rng.uniform(0.9, 1.05)), 0.2), 'abbey_pier')
    if not broken:
        cx = (x0 + x1) / 2
        pts = []
        for i in range(9):
            t = i / 8
            a = math.pi * t
            pts.append((cx - math.cos(a) * (x1 - x0) / 2, r, h + math.sin(a) * 0.9 * (1 - 0.3 * abs(math.cos(a)))))
        for a_, b_ in zip(pts, pts[1:]):
            k.tube(a_, b_, 0.14, (tone, 0.2), 'abbey_arch', verts=6)
    k.solid(x0 - 0.25, r - 0.25, x0 + 0.25, r + 0.25)
    k.solid(x1 - 0.25, r - 0.25, x1 + 0.25, r + 0.25)


def wisp_lantern(k, cx, cr, col='#a080ff', h=1.4):
    """A crooked iron post with a violet flame caged at its top."""
    k.tube((cx, cr, 0.0), (cx + 0.08, cr, h), 0.035, '#2a2630', 'wisp_post', verts=6)
    k.tube((cx + 0.08, cr, h), (cx + 0.3, cr, h + 0.05), 0.02, '#2a2630', 'wisp_arm', verts=5)
    k.sphere(cx + 0.3, cr, h - 0.12, 0.07, 0.09, shade(col, 0.5), 'wisp_flame', emit=(col, 1.0), segs=8)
    k.point_light(cx + 0.3, cr + 0.2, h - 0.1, col, 10, radius=0.1, group='flicker')
    k.solid(cx - 0.2, cr - 0.2, cx + 0.2, cr + 0.2)


def octagon_tower(k, tx, tr, R=1.6, h=4.6, wall='#4a4458', roof='#2a2040', orb='#b48cff'):
    """The sorceress's tower: an octagon of dark stone on a stepped plinth,
    lit windows, a steep conical roof and a violet orb on its spike."""
    import assets_town as W
    for i, s in enumerate((R + 0.7, R + 0.45)):
        k.cyl(tx, tr, i * 0.18, (i + 1) * 0.18, s, ('#3a3446', 0.2), 'tower_step', verts=8)
    for i in range(8):
        a0, a1 = i * math.pi / 4 + math.pi / 8, (i + 1) * math.pi / 4 + math.pi / 8
        k.bar(tx + math.cos(a0) * R, tr + math.sin(a0) * R, tx + math.cos(a1) * R, tr + math.sin(a1) * R, 0.36, h, 0.28,
              (wall, 0.18), 'tower_wall')
    k.cyl(tx, tr, 0.36, h, R - 0.1, (shade(wall, 0.9), 0.16), 'tower_core', verts=8)
    k.cone(tx, tr, h, h + 2.8, R + 0.35, 0.02, (roof, 0.16), 'tower_roof', verts=8)
    k.cyl(tx, tr, h - 0.05, h + 0.12, R + 0.3, '#2a2438', 'tower_eave', verts=8)
    k.tube((tx, tr, h + 2.7), (tx, tr, h + 3.3), 0.03, '#2a2438', 'tower_spike', verts=5)
    k.sphere(tx, tr, h + 3.4, 0.16, 0.16, '#b48cff', 'tower_orb', emit=(orb, 1.0), segs=12)
    W.door(k, tx, tr + R - 0.02, w=0.8, h=1.5, col='#3a2a4a')
    for (wx, wz) in ((tx - 0.8, 2.2), (tx + 0.8, 2.2), (tx, 3.3), (tx - 0.5, 3.9)):
        W.window(k, wx, tr + R - 0.06, wz, w=0.3, h=0.5, shutters=None)
    k.point_light(tx, tr + R + 1.5, h + 2.0, '#a080ff', 40, radius=0.3, group='flicker')
    k.point_light(tx, tr, h + 3.5, orb, 30, radius=0.2, group='flicker')
    k.solid(tx - R - 0.7, tr - R - 0.7, tx + R + 0.7, tr + R + 0.5)
