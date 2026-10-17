"""The Undercroft's kit: crypt stone under Midnight Isle (scenes/lumar_undercroft*.py).

A crypt is laid out as cells (rooms, passages) on the tile grid; `build` walls it the way the Rose Mine's caves are
walled — coursed stone faces where a room's back wall shows, low kerbs where a wall would hide someone, dark mass
beyond — and dresses the walls, never the floor (js/dungeon.js scatters what's on the floor each night): niches of
bones, roots through the vault, iron sconces, braziers in the corners, a pool of black water now and then.
"""
import math

from scenekit import shade
import assets_lumar as A
import assets_town as W

STONE = '#56526a'        # crypt stone, Midnight's violet-grey
STONE_D = '#3a3648'
MORTAR = '#1a1722'
FLAG = '#4a465a'
MOSS = '#3e5240'
BONE = '#d8d0c0'
ROOT = '#3a2a22'
IRON = '#2a2630'
WALL_H = 2.1


def neighbours(c, r):
    return [(c + dx, r + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]


def coursed(k, x0, x1, r_face, z0, z1, tone=STONE):
    """Dressed blocks in staggered courses on a face at row r_face (the mortar behind shows between them)."""
    z, i = z0, 0
    while z < z1 - 0.05:
        zt = min(z1, z + k.rng.uniform(0.26, 0.36))
        x = x0 - (k.rng.uniform(0.1, 0.4) if i % 2 else 0.0)
        while x < x1 - 0.02:
            w = k.rng.uniform(0.45, 0.8)
            a, b = max(x, x0), min(x + w, x1)
            if b - a > 0.1:
                c = shade(tone, k.rng.uniform(0.82, 1.12))
                if z < z0 + 0.4 and k.rng.random() < 0.25:
                    c = W._mix(c, MOSS, 0.4)                           # damp and moss low down
                k.box(a + 0.018, r_face - 0.01, z + 0.018, b - 0.018, r_face + 0.022, zt - 0.014, (c, 0.12), 'crypt_stone')
            x += w
        z = zt
        i += 1


def niche(k, cx, r_face, z0=0.55, w=0.62, h=0.5):
    """A burial niche in the wall: a dark recess, a round-headed arch, a skull and long bones laid in it."""
    k.box(cx - w / 2 - 0.06, r_face - 0.01, z0 - 0.06, cx + w / 2 + 0.06, r_face + 0.035, z0 + h + 0.1, (shade(STONE, 1.12), 0.1), 'niche_frame')
    k.box(cx - w / 2, r_face - 0.3, z0, cx + w / 2, r_face + 0.04, z0 + h, '#0a080c', 'niche')
    k.cyl_y(cx, r_face - 0.3, r_face + 0.04, z0 + h, w / 2, 0.16, '#0a080c', 'niche', verts=12)
    k.sphere(cx + k.rng.uniform(-0.12, 0.12), r_face - 0.12, z0 + 0.09, 0.085, 0.08, (BONE, 0.1), 'skull', segs=8)
    for _ in range(2):
        y = r_face - k.rng.uniform(0.08, 0.2)
        k.tube((cx - w * 0.38, y, z0 + 0.03), (cx + w * 0.38, y + k.rng.uniform(-0.04, 0.04), z0 + 0.04), 0.022, (BONE, 0.1), 'bone', verts=5)


def roots(k, x, r_face, top, n=None):
    """Roots come through the vault and down the wall: a few crooked strands, thinner as they go."""
    for _ in range(n or k.rng.choice((2, 3, 4))):
        px, z = x + k.rng.uniform(-0.25, 0.25), top
        rad = k.rng.uniform(0.035, 0.05)
        while z > top - k.rng.uniform(0.8, 1.7) and rad > 0.01:
            nx, nz = px + k.rng.uniform(-0.12, 0.12), z - k.rng.uniform(0.18, 0.3)
            k.tube((px, r_face + 0.04, z), (nx, r_face + 0.04 + k.rng.uniform(0, 0.03), nz), rad, (shade(ROOT, k.rng.uniform(0.85, 1.15)), 0.2), 'root', verts=5)
            px, z, rad = nx, nz, rad * 0.82


def sconce(k, cx, r_face, z=1.45, energy=9):
    """An iron sconce with a fat candle guttering in it."""
    k.box(cx - 0.05, r_face, z - 0.24, cx + 0.05, r_face + 0.04, z + 0.02, IRON, 'sconce')
    k.box(cx - 0.03, r_face, z - 0.03, cx + 0.03, r_face + 0.2, z + 0.01, IRON, 'sconce')
    k.cyl(cx, r_face + 0.18, z + 0.01, z + 0.06, 0.06, IRON, 'sconce', verts=8)
    k.cyl(cx, r_face + 0.18, z + 0.06, z + 0.2, 0.035, '#e8dcc0', 'candle', verts=8)
    k.cone(cx, r_face + 0.18, z + 0.2, z + 0.3, 0.028, 0.003, A.FIRE_HOT, 'flame', emit=(A.FIRE_HOT, 4.0), verts=6)
    k.point_light(cx, r_face + 0.45, z + 0.25, '#ffb070', energy, radius=0.08, group='flicker')


def brazier(k, cx, cr, energy=55):
    """An iron brazier on three legs, coals and a low fire: the warm light in a cold place."""
    for a in (0.3, 2.4, 4.5):
        k.tube((cx + math.cos(a) * 0.24, cr + math.sin(a) * 0.18, 0.0), (cx + math.cos(a) * 0.12, cr + math.sin(a) * 0.09, 0.55), 0.022, IRON, 'brazier_leg', verts=5)
    k.cyl(cx, cr, 0.52, 0.66, 0.24, IRON, 'brazier', verts=12)
    k.cyl(cx, cr, 0.62, 0.67, 0.2, '#3a1a10', 'coals', emit=('#ff6a20', 0.7), verts=12)
    for i in range(5):
        a = i * 1.26 + k.rng.uniform(-0.3, 0.3)
        k.cone(cx + math.cos(a) * 0.09, cr + math.sin(a) * 0.07, 0.66, 0.66 + k.rng.uniform(0.14, 0.26), 0.05, 0.004, '#ffb040', 'fire', emit=('#ffa030', 1.0), verts=6)
    k.point_light(cx, cr + 0.15, 1.1, '#ff9a50', energy, radius=0.25, group='flicker')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def candles(k, cx, cr, z=0.0, n=None):
    """A cluster of church candles on a stone, wax run down it."""
    k.box(cx - 0.22, cr - 0.16, z, cx + 0.22, cr + 0.16, z + 0.12, (STONE_D, 0.14), 'candle_stone', bevel=0.02)
    for _ in range(n or k.rng.choice((3, 4, 5))):
        x, y, h = cx + k.rng.uniform(-0.16, 0.16), cr + k.rng.uniform(-0.1, 0.1), k.rng.uniform(0.1, 0.3)
        k.cyl(x, y, z + 0.12, z + 0.12 + h, 0.03, '#e8dcc0', 'candle', verts=8)
        k.cone(x, y, z + 0.12 + h, z + 0.2 + h, 0.022, 0.002, A.FIRE_HOT, 'flame', emit=(A.FIRE_HOT, 4.0), verts=6)
    k.point_light(cx, cr + 0.25, z + 0.6, '#ffb878', 7, radius=0.1, group='flicker')


def pillar(k, cx, cr, h=WALL_H):
    """A square crypt pillar: a base, coursed shaft, a capital — the vault rests on it."""
    k.box(cx - 0.42, cr - 0.42, 0.0, cx + 0.42, cr + 0.42, 0.22, (shade(STONE, 0.9), 0.14), 'pillar_base', bevel=0.02)
    k.box(cx - 0.32, cr - 0.32, 0.22, cx + 0.32, cr + 0.32, h - 0.22, (MORTAR, 0.1), 'pillar')
    coursed(k, cx - 0.32, cx + 0.32, cr + 0.32, 0.22, h - 0.22)
    k.box(cx - 0.42, cr - 0.42, h - 0.22, cx + 0.42, cr + 0.42, h, (shade(STONE, 1.1), 0.14), 'pillar_cap', bevel=0.02)
    k.solid(cx - 0.42, cr - 0.42, cx + 0.42, cr + 0.42)


def pool(k, cells):
    """Black water standing in a sunken part of the floor, a rim of stones round it (solid: you don't wade)."""
    for (c, r) in cells:
        k.box(c, r, -0.5, c + 1, r + 1, -0.3, '#06080a', 'pool_bed')
        k.box(c, r, -0.3, c + 1, r + 1, -0.12, ('#0c1418', 0.0), 'pond_water', emit=('#203848', 0.06))
        k.solid(c, r, c + 1, r + 1)
    cells = set(cells)
    for (c, r) in cells:
        for (dc, dr) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (c + dc, r + dr) in cells:
                continue
            x0, r0 = (c + 1 - 0.1, r) if dc == 1 else (c - 0.06, r) if dc == -1 else (c, r + 1 - 0.1) if dr == 1 else (c, r - 0.06)
            x1, r1 = (x0 + 0.16, r + 1) if dc else (c + 1, r0 + 0.16)
            k.box(x0, r0, -0.12, x1, r1, 0.06, (shade(STONE_D, k.rng.uniform(0.9, 1.1)), 0.14), 'pool_rim', bevel=0.02)


def build(k, walk, cols, rows, keep_clear=()):
    """Walls round the walkable cells: a coursed face along every run of wall with walk in front of it (tall, unless
    something walkable lies behind it within a tile, when it stays a low kerb so it hides nobody), dark mass beyond,
    low past the crypt's front. Returns the back-wall faces as (x0, x1, row) runs for dressing."""
    south = {c: max([r for (cc, r) in walk if cc == c] or [-1]) for c in range(cols)}
    faces = []
    for r in range(rows):
        run = None
        for c in range(cols + 1):
            face = c < cols and (c, r) not in walk and (c, r + 1) in walk and not any(
                (c + dc, r - 1) in walk for dc in (-1, 0, 1)) and (c, r) not in keep_clear
            if face and run is None:
                run = c
            if not face and run is not None:
                faces.append((run, c, r + 1))
                run = None
    tall = {(c, rr - 1) for (x0, x1, rr) in faces for c in range(x0, x1)}
    for (x0, x1, rf) in faces:
        k.box(x0, rf - 1, 0.0, x1, rf, WALL_H, (MORTAR, 0.1), 'crypt_wall')
        coursed(k, x0, x1, rf, 0.0, WALL_H)
        k.box(x0, rf - 1, WALL_H, x1, rf + 0.06, WALL_H + 0.1, (shade(STONE, 0.8), 0.12), 'crypt_cornice')
    for r in range(rows):
        for c in range(cols):
            if (c, r) in walk or (c, r) in keep_clear:
                continue
            k.solid(c, r, c + 1, r + 1)
            if (c, r) in tall:
                continue
            near = [n for n in neighbours(c, r) if n in walk]
            if near:                                                   # a kerb: low, so it hides nobody behind it
                h = k.rng.uniform(0.32, 0.46)
                k.box(c, r, 0.0, c + 1, r + 1, h, (MORTAR, 0.1), 'kerb')
                if (c, r - 1) in walk or any(nr < r for (_, nr) in near):
                    coursed(k, c, c + 1, r + 1, 0.0, h, STONE_D)
                k.box(c - 0.02, r - 0.02, h, c + 1.02, r + 1.02, h + 0.06, (shade(STONE_D, k.rng.uniform(0.9, 1.1)), 0.12), 'kerb_cap')
            else:                                                      # rock and fill: tall above a room, low below it
                k.box(c, r, 0.0, c + 1, r + 1, WALL_H if r < south[c] else 0.3, '#0a080e', 'crypt_mass')
    return faces


def dress(k, faces, rng, skip=()):
    """Life on the back walls: niches of bones, roots through the vault, sconces, the odd drip of moss."""
    for (x0, x1, rf) in faces:
        x = x0 + 0.7
        while x < x1 - 0.5:
            if any(a <= x <= b for a, b, rr in skip if rr == rf):
                x += 0.8
                continue
            roll = rng.random()
            if roll < 0.32 and x + 0.4 < x1:
                niche(k, x, rf, z0=rng.choice((0.45, 0.6, 1.1)))
                x += rng.uniform(1.2, 1.8)
            elif roll < 0.5:
                sconce(k, x, rf)
                x += rng.uniform(1.6, 2.4)
            elif roll < 0.72:
                roots(k, x, rf, WALL_H)
                x += rng.uniform(0.8, 1.4)
            else:
                x += rng.uniform(0.6, 1.2)


def floor(k, walk):
    """The floor: old flags in running bond, worn in the middle of the rooms, a crack or a patch of moss here and there."""
    W.flagstones(k, walk, FLAG, gap=0.035)
    k.box(min(c for c, r in walk), min(r for c, r in walk), -0.14, max(c for c, r in walk) + 1, max(r for c, r in walk) + 1, -0.04, (MORTAR, 0.1), 'subfloor')


def crypt_portal(k, x0, x1, r_back, r_front, tone='#5a5868', wisp='#a080ff'):
    """The way down from the graveyard: a stone portal half-buried in a mound, a round-headed doorway onto steps that
    darken as they go down, an iron gate hanging open, a skull on the keystone and a violet wisp-flame on a post at
    either side. Solid over its footprint; the doorway is at the middle of its front."""
    cx = (x0 + x1) / 2
    k.blob(cx, r_back + 0.35, 0.0, (x1 - x0) * 0.62, (r_front - r_back) * 0.75, 0.75, ('#26302a', 0.3), 'mound', segs=14)
    for _ in range(14):                                                        # moss and grass over the mound
        a = k.rng.uniform(0, math.tau)
        k.blob(cx + math.cos(a) * (x1 - x0) * k.rng.uniform(0.1, 0.55), r_back + 0.35 + math.sin(a) * 0.4, k.rng.uniform(0.35, 0.65),
               k.rng.uniform(0.1, 0.2), k.rng.uniform(0.08, 0.14), 0.05, (shade(MOSS, k.rng.uniform(0.8, 1.15)), 0.2), 'moss', segs=8)
    w, top = 0.46, 1.15                                                        # the doorway's half-width and spring height
    for (a, b) in ((x0 + 0.3, cx - w), (cx + w, x1 - 0.3)):                   # the jambs, coursed
        k.box(a, r_front - 0.55, 0.0, b, r_front, 1.55, (MORTAR, 0.1), 'portal')
        coursed(k, a, b, r_front, 0.0, 1.55, tone)
    k.box(cx - w, r_front - 0.55, top + 0.42, cx + w, r_front, 1.55, (MORTAR, 0.1), 'portal')
    coursed(k, cx - w, cx + w, r_front, top + 0.42, 1.55, tone)
    k.box(x0 + 0.22, r_front - 0.6, 1.55, x1 - 0.22, r_front + 0.06, 1.68, (shade(tone, 0.85), 0.12), 'portal_cap', bevel=0.02)
    k.cyl_y(cx, r_front - 0.02, r_front + 0.05, top, w + 0.1, 0.5, (shade(tone, 1.15), 0.12), 'portal_arch', verts=16)
    k.cyl_y(cx, r_front - 0.03, r_front + 0.06, top, w, 0.42, '#030205', 'portal_dark', verts=16)
    k.box(cx - w, r_front - 0.6, 0.0, cx + w, r_front - 0.5, top, '#030205', 'portal_dark')
    for i in range(3):                                                        # steps, each darker: they go down
        r0 = r_front - 0.05 - i * 0.16
        k.box(cx - w + 0.04, r0 - 0.16, -0.02, cx + w - 0.04, r0, 0.03 - i * 0.012, (shade(tone, 0.8 - i * 0.24), 0.12), 'portal_step')
    k.box(cx - w - 0.1, r_front, -0.02, cx + w + 0.1, r_front + 0.3, 0.05, (shade(tone, 0.95), 0.14), 'portal_sill', bevel=0.02)
    k.sphere(cx, r_front + 0.04, top + 0.5, 0.075, 0.07, (BONE, 0.1), 'skull', segs=8)
    hx = cx + w                                                               # the gate, hinged on the right, swung out
    for t in (0.0, 0.33, 0.66, 1.0):
        x, r = hx - 0.15 * t, r_front + 0.05 + 0.7 * t
        k.tube((x, r, 0.05), (x, r, 1.05), 0.012, IRON, 'gate_bar', verts=4)
    for z in (0.2, 0.62, 1.0):
        k.tube((hx, r_front + 0.05, z), (hx - 0.15, r_front + 0.75, z), 0.014, IRON, 'gate_bar', verts=4)
    for x in (x0 + 0.15, x1 - 0.15):                                           # wisp-flames on posts
        k.box(x - 0.1, r_front - 0.1, 0.0, x + 0.1, r_front + 0.1, 0.85, (shade(tone, 0.9), 0.14), 'portal_post', bevel=0.02)
        k.cyl(x, r_front, 0.85, 0.92, 0.12, (shade(tone, 0.8), 0.12), 'portal_post', verts=10)
        k.sphere(x, r_front, 1.02, 0.07, 0.11, wisp, 'wisp_flame', emit=(wisp, 1.0), segs=8)
        k.point_light(x, r_front + 0.25, 1.05, wisp, 6, radius=0.08, group='flicker')
    k.solid(x0, r_back, x1, r_front)
