"""A shipyard's slip, for the holm's slipway (scenes/lumar_holm.py, js/shipyard.js): the slip's bed on its piles (in the
base render, so the sea's mask knows it as dry), the slip rebuilt over it (new oak ways, sleepers, chocks, sheer-legs,
timber stacked to season), and a hull on it at each stage of her building — her keel on its blocks, in frame, planked.

The slip runs down the rows toward the water (r grows toward the camera and the sea): a ship is built bow up the slip,
stern to the water, and launched stern first. Its deck falls from z0 at the head to z1 at the foot (keep z1 above the
water, WZ, or the sea is drawn over it).
"""
import math

import bpy

from scenekit import S, shade

OLD = '#5a5048'       # weathered timber
OAK = '#8a6234'       # new oak
OAK_D = '#5a3a1e'
GREASE = '#3a2a18'


def deck_z(r, r0, r1, z0, z1):
    t = min(1.0, max(0.0, (r - r0) / (r1 - r0)))
    return z0 + (z1 - z0) * t


def slip_bed(k, x0, x1, r0, r1, z0, z1, rng):
    """The old slip: planks laid across on piles, falling to the water, weathered grey, a few gone, two old ways
    along it gone soft and green. Always there (the base render): what the sea's mask takes as dry."""
    cx = (x0 + x1) / 2
    r = r0
    while r < r1 - 0.05:
        z = deck_z(r + 0.12, r0, r1, z0, z1)
        if rng.random() < 0.9:
            a, b = x0 + rng.uniform(0.0, 0.12), x1 - rng.uniform(0.0, 0.12)
            k.box(a, r + 0.02, z - 0.06, b, r + 0.23, z, (shade(OLD, rng.uniform(0.8, 1.1)), 0.25), 'slip_plank', bevel=0.01)
        else:                                                             # a plank gone: the beam under it shows
            k.box(x0 + 0.2, r + 0.08, z - 0.16, x1 - 0.2, r + 0.17, z - 0.08, (shade(OLD, 0.6), 0.25), 'slip_beam')
        r += 0.25
    for i in range(int((r1 - r0) / 1.2) + 1):                             # piles, the lower ones in the water
        rr = r0 + 0.3 + i * 1.2
        for x in (x0 + 0.15, x1 - 0.15):
            k.cyl(x, rr, -1.2, deck_z(rr, r0, r1, z0, z1) - 0.04, 0.09, (shade(OLD, 0.7), 0.25), 'slip_pile', verts=7)
    for x in (cx - 0.95, cx + 0.95):                                      # the old ways, soft and green
        for i in range(int((r1 - r0) / 0.5)):
            ra = r0 + i * 0.5
            z = deck_z(ra + 0.25, r0, r1, z0, z1)
            if rng.random() < 0.85:
                k.box(x - 0.16, ra, z, x + 0.16, ra + 0.5, z + 0.08, (shade('#4a4e3a', rng.uniform(0.85, 1.1)), 0.3), 'slip_way_old')
    k.solid(x0, r0, x1, r1)


def slip_new(k, x0, x1, r0, r1, z0, z1, rng, ground=None):
    """The slip rebuilt over its old bed: fresh sleepers across, two oak ground ways greased dark along their tops, chocks
    at the foot, a capstan at the head, sheer-legs over it with a block and tackle hanging. `ground(x, r)`: the land's
    height (the coast's Terrain.z) — the old bed runs straight down and the bank bulges over it near the top, where it's
    silted over; the new one is laid on whichever is higher, or its sleepers lie a hair under the sand, black in its
    shadow (and close enough to the surface that the engine's depth test shows them)."""
    cx = (x0 + x1) / 2

    def at(xa, xb, ra, rb, z):                                            # on the ramp, or on the ground where it's higher
        if not ground:
            return z
        g = max(ground(x, r) for x in (xa, (xa + xb) / 2, xb) for r in (ra, rb))
        return max(z, g + 0.015)
    r = r0 + 0.05
    while r < r1 - 0.2:                                                   # sleepers
        z = at(x0, x1, r + 0.04, r + 0.22, deck_z(r + 0.12, r0, r1, z0, z1))
        k.box(x0 + 0.05, r + 0.04, z, x1 - 0.05, r + 0.22, z + 0.05, (shade(OAK, rng.uniform(0.85, 1.05)), 0.2), 'slip_sleeper', bevel=0.01)
        r += 0.45
    for x in (cx - 0.95, cx + 0.95):                                      # the ground ways, a step at a time down the slope
        for i in range(int((r1 - r0) / 0.4)):
            ra = r0 + i * 0.4
            z = at(x - 0.17, x + 0.17, ra, ra + 0.4, deck_z(ra + 0.2, r0, r1, z0, z1)) + 0.05
            k.box(x - 0.17, ra, z, x + 0.17, ra + 0.4, z + 0.12, (OAK_D, 0.2), 'slip_way')
            k.box(x - 0.12, ra, z + 0.12, x + 0.12, ra + 0.4, z + 0.135, (GREASE, 0.05), 'slip_grease')
    zf = deck_z(r1 - 0.2, r0, r1, z0, z1)
    for x in (cx - 0.95, cx + 0.95):                                      # chocks at the foot
        k.box(x - 0.2, r1 - 0.35, zf + 0.15, x + 0.2, r1 - 0.1, zf + 0.35, ('#6a4a2a', 0.2), 'slip_chock', bevel=0.02)
    # the sheer-legs over the head of the slip, a block and tackle hanging from where they cross
    top = (cx, r0 + 1.0, 3.3)
    for x in (x0 - 0.1, x1 + 0.1):
        k.tube((x, r0 + 0.3, z0), top, 0.07, ('#5a4024', 0.15), 'sheerleg', verts=6, smooth=False)
    k.tube(top, (cx, r0 + 1.0, 2.1), 0.012, ('#c8b48a', 0.15), 'tackle', verts=4, smooth=False)
    k.box(cx - 0.12, r0 + 0.92, 1.88, cx + 0.12, r0 + 1.08, 2.12, ('#34343a', 0.1), 'block')
    k.tube((cx, r0 + 1.0, 1.88), (cx, r0 + 1.0, 1.6), 0.03, '#2a2a2e', 'hook', verts=4, smooth=False)
    for x in (x0 - 0.1, x1 + 0.1):                                        # guys pegged out behind
        k.tube(top, (x - 0.4 * (1 if x < cx else -1), r0 - 0.9, 0.0), 0.01, ('#b8a07a', 0.15), 'guy', verts=4, smooth=False)


def lumber(k, x0, x1, r0, r1, rng, layers=4, solid=True):
    """Planks stacked to season, stickers between the layers, a stone under each end."""
    for x in (x0 + 0.15, x1 - 0.15):
        k.box(x - 0.12, r0 + 0.05, 0.0, x + 0.12, r1 - 0.05, 0.12, ('#6a6a62', 0.2), 'lumber_stone', bevel=0.02)
    z = 0.12
    for i in range(layers):
        n = max(2, int((r1 - r0) / 0.2))
        for j in range(n):
            ra = r0 + j * (r1 - r0) / n
            k.box(x0 + rng.uniform(-0.05, 0.05), ra + 0.01, z, x1 + rng.uniform(-0.05, 0.05), ra + (r1 - r0) / n - 0.01, z + 0.07,
                  (shade(OAK, rng.uniform(0.85, 1.12)), 0.2), 'lumber', bevel=0.008)
        z += 0.07
        for x in (x0 + 0.2, (x0 + x1) / 2, x1 - 0.2):                     # stickers
            k.box(x - 0.03, r0, z, x + 0.03, r1, z + 0.03, ('#4a3a2a', 0.2), 'lumber_sticker')
        z += 0.03
    if solid:
        k.solid(x0, r0, x1, r1)


def _half(t, beam):
    """Her half-breadth along her length, t 0 at the bow (up the slip) to 1 at the stern."""
    return beam / 2 * math.sin(math.pi * (0.12 + 0.7 * t)) ** 0.6


def hull_on_slip(k, cx, rb, rs, beam, zk, h, stage, r0, r1, z0, z1, rng):
    """A hull on the slip, bow up it at rb, stern to the water at rs, her keel at zk on blocks from the deck: 'keel' (the
    keel, stem and sternpost), 'frame' (ribs all along, ribbands round them, staging), 'planked' (planked up to her
    rail, deck beams and half her deck laid, her rudder hung)."""
    L = rs - rb
    for i in range(7):                                                    # keel blocks, taller down the slope
        br = rb + 0.3 + i * (L - 0.6) / 6
        z = deck_z(br, r0, r1, z0, z1) + 0.05
        k.box(cx - 0.22, br - 0.18, z, cx + 0.22, br + 0.18, zk, ('#5a4a3a', 0.15), 'keel_block', bevel=0.01)
    for s in (-1, 1):                                                     # the cradle's shores either side
        for i in range(3):
            br = rb + 0.8 + i * (L - 1.4) / 2
            z = deck_z(br, r0, r1, z0, z1) + 0.17
            k.tube((cx + s * 0.95, br, z), (cx + s * (_half((br - rb) / L, beam) + 0.02), br, zk + 0.45), 0.04, ('#6a5030', 0.15), 'shore', verts=4, smooth=False)
    k.box(cx - 0.08, rb, zk, cx + 0.08, rs, zk + 0.14, (OAK_D, 0.1), 'keel')
    k.tube((cx, rb, zk + 0.07), (cx, rb - 0.45, zk + h + 0.4), 0.08, (OAK_D, 0.1), 'stem', verts=6, smooth=False)
    k.tube((cx, rs, zk + 0.07), (cx, rs + 0.08, zk + h + 0.5), 0.08, (OAK_D, 0.1), 'sternpost', verts=6, smooth=False)
    if stage == 'keel':
        return
    n = 14
    for i in range(1, n):
        t = i / n
        u = rb + t * L
        w = _half(t, beam)
        top = zk + h + 0.15 * (t ** 3)
        for s in (-1, 1):                                                 # a rib: out from the keel, round the bilge, up to the sheer
            pts = [(cx, u, zk + 0.1), (cx + s * w * 0.8, u, zk + 0.32), (cx + s * w, u, zk + h * 0.55), (cx + s * w * 0.96, u, top)]
            for a, b in zip(pts, pts[1:]):
                k.tube(a, b, 0.032, ('#6a4422', 0.1), 'rib', verts=4, smooth=False)
    if stage == 'frame':
        for zf in (0.55, 0.9):                                            # ribbands along her
            for s in (-1, 1):
                prev = None
                for i in range(n + 1):
                    t = i / n
                    p = (cx + s * _half(t, beam) * (0.97 if zf > 0.8 else 1.0) + s * 0.03, rb + t * L, zk + h * zf)
                    if prev:
                        k.tube(prev, p, 0.02, ('#8a5a30', 0.1), 'ribband', verts=4, smooth=False)
                    prev = p
        for s in (-1, 1):                                                 # staging along both sides
            for i in range(4):
                br = rb - 0.2 + i * (L + 0.4) / 3
                k.cyl(cx + s * (beam / 2 + 0.38), br, deck_z(br, r0, r1, z0, z1), zk + 1.2, 0.035, ('#6a5030', 0.15), 'staging_post', verts=5)
            ra = rb - 0.2
            while ra < rs + 0.1:                                          # its boards, butted end to end
                rl = min(rs + 0.2, ra + rng.uniform(0.9, 1.4))
                k.box(cx + s * (beam / 2 + 0.24) - 0.09, ra + 0.02, zk + 0.75, cx + s * (beam / 2 + 0.24) + 0.09, rl - 0.02, zk + 0.79,
                      (shade('#7a6040', rng.uniform(0.85, 1.1)), 0.15), 'staging')
                ra = rl
        return
    # planked: her sides closed up to the rail, a strake of darker wale, deck beams and half her deck, her rudder
    for s in (-1, 1):
        rings = []
        for i in range(n + 1):
            t = i / n
            w = _half(t, beam) + 0.03
            rings.append([(cx + s * 0.06, rb + t * L, zk + 0.12), (cx + s * w * 0.82, rb + t * L, zk + 0.34),
                          (cx + s * w, rb + t * L, zk + h * 0.55), (cx + s * w * 0.97, rb + t * L, zk + h + 0.15 * t ** 3)])
        k.loft(rings, (OAK, 0.12), 'hull_planks', smooth=False)
        wale = [[(cx + s * (_half(i / n, beam) + 0.05), rb + i / n * L, zk + h * 0.62), (cx + s * (_half(i / n, beam) + 0.05), rb + i / n * L, zk + h * 0.72)] for i in range(n + 1)]
        k.loft(wale, (OAK_D, 0.1), 'hull_wale', smooth=False)
    for i in range(2, n - 1):                                             # deck beams across, planks laid on the after half
        t = i / n
        u = rb + t * L
        w = _half(t, beam) * 0.94
        zd = zk + h - 0.12 + 0.15 * t ** 3
        k.box(cx - w, u - 0.04, zd - 0.06, cx + w, u + 0.04, zd, (OAK_D, 0.15), 'deck_beam')
        if t > 0.5:                                                       # deck planks fore and aft, a seam between each
            m = max(3, int(2 * w / 0.16))
            for j in range(m):
                xa = cx - w + j * 2 * w / m
                k.box(xa + 0.012, u - L / n / 2, zd, xa + 2 * w / m - 0.012, u + L / n / 2, zd + 0.03, (shade(OAK, rng.uniform(0.88, 1.12)), 0.15), 'deck')
    k.box(cx - 0.05, rs + 0.02, zk + 0.1, cx + 0.05, rs + 0.3, zk + h * 0.8, (OAK_D, 0.1), 'rudder')


def clear_parts(k, rect, names):
    """Take out parts already placed (the coast's rocks, weed and shells) whose middle lies in rect (x0, x1, r0, r1) —
    where the slip stands on its piles. Placed parts only: the scene's dice have already been rolled for them."""
    x0, x1, r0, r1 = rect
    for p in list(k.parts):
        if p.get('pname') not in names:
            continue
        ob = p['obj']
        bb = [ob.matrix_world @ __import__('mathutils').Vector(c) for c in ob.bound_box]
        x = sum(v.x for v in bb) / 8
        r = -sum(v.y for v in bb) / 8 / S
        if x0 <= x <= x1 and r0 <= r <= r1:
            bpy.data.objects.remove(ob, do_unlink=True)
            k.parts.remove(p)
