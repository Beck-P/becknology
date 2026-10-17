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
FLAG = '#3e3c46'        # the floor: cooler and darker than the walls
FLAG_D = '#2c2a32'
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


def sconce(k, cx, r_face, z=1.45, energy=13):
    """An iron sconce with a fat candle guttering in it."""
    k.box(cx - 0.05, r_face, z - 0.24, cx + 0.05, r_face + 0.04, z + 0.02, IRON, 'sconce')
    k.box(cx - 0.03, r_face, z - 0.03, cx + 0.03, r_face + 0.2, z + 0.01, IRON, 'sconce')
    k.cyl(cx, r_face + 0.18, z + 0.01, z + 0.06, 0.06, IRON, 'sconce', verts=8)
    k.cyl(cx, r_face + 0.18, z + 0.06, z + 0.2, 0.035, '#e8dcc0', 'candle', verts=8)
    k.cone(cx, r_face + 0.18, z + 0.2, z + 0.3, 0.028, 0.003, A.FIRE_HOT, 'flame', emit=(A.FIRE_HOT, 4.0), verts=6)
    k.point_light(cx, r_face + 0.45, z + 0.25, '#ffb070', energy, radius=0.08, group='flicker')


def brazier(k, cx, cr, energy=85):
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
    """A round crypt column: a square plinth and a torus, a shaft of drums (each its own tone, a dark joint between,
    moss climbing the foot), a flared capital and a square abacus the vault rests on."""
    k.box(cx - 0.42, cr - 0.42, 0.0, cx + 0.42, cr + 0.42, 0.16, (shade(STONE, 0.86), 0.14), 'pillar_base', bevel=0.025)
    k.cyl(cx, cr, 0.16, 0.26, 0.37, (shade(STONE, 0.95), 0.14), 'pillar_base', verts=20, bevel=0.03)
    z, top = 0.26, h - 0.34
    k.cyl(cx, cr, z, top, 0.27, (MORTAR, 0.1), 'pillar_core', verts=20)
    while z < top - 0.05:
        zt = min(top, z + k.rng.uniform(0.28, 0.4))
        c = shade(STONE, k.rng.uniform(0.84, 1.1))
        if z < 0.7 and k.rng.random() < 0.6:
            c = W._mix(c, MOSS, k.rng.uniform(0.25, 0.5))
        k.cyl(cx, cr, z + 0.012, zt - 0.012, 0.3 + k.rng.uniform(-0.008, 0.008), (c, 0.14), 'pillar', verts=20, bevel=0.012)
        z = zt
    k.cone(cx, cr, top, top + 0.16, 0.29, 0.4, (shade(STONE, 1.04), 0.14), 'pillar_cap', verts=20)
    k.box(cx - 0.44, cr - 0.44, top + 0.16, cx + 0.44, cr + 0.44, h - 0.08, (shade(STONE, 1.0), 0.14), 'pillar_cap', bevel=0.025)
    k.box(cx - 0.34, cr - 0.34, h - 0.08, cx + 0.34, cr + 0.34, h, (shade(STONE, 0.78), 0.14), 'pillar_abacus', bevel=0.02)
    for _ in range(k.rng.choice((1, 2))):                                     # dust and a little moss up there
        k.blob(cx + k.rng.uniform(-0.25, 0.25), cr + k.rng.uniform(-0.25, 0.25), h, k.rng.uniform(0.06, 0.12), k.rng.uniform(0.05, 0.1), 0.02,
               (shade(MOSS, k.rng.uniform(0.7, 1.0)), 0.2), 'moss', segs=8)
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


def cornice(k, x0, x1, rf):
    """A worn lip of stones along the top of a wall, each its own length and tone."""
    x = x0
    while x < x1 - 0.02:
        b = min(x1, x + k.rng.uniform(0.5, 0.9))
        k.box(x + 0.01, rf - 0.2, WALL_H, b - 0.01, rf + 0.06, WALL_H + k.rng.uniform(0.07, 0.11), (shade(STONE, k.rng.uniform(0.66, 0.86)), 0.12), 'crypt_cornice', bevel=0.012)
        x = b


def coping(k, c, r, h):
    """A kerb's top: coping stones laid two deep across the tile, each its own width and tone — chipped, the odd one
    mossy — not one slab (one stone a row read as planks)."""
    for (y0, y1) in ((r - 0.02, r + 0.5), (r + 0.5, r + 1.02)):
        x, xs = c, [c]
        while x < c + 1 - 0.2:
            x = min(c + 1, x + k.rng.uniform(0.38, 0.62))
            xs.append(x)
        xs[-1] = c + 1
        for a, b in zip(xs, xs[1:]):
            t = shade(STONE_D, k.rng.uniform(0.78, 1.18))
            if k.rng.random() < 0.18:
                t = W._mix(t, MOSS, 0.4)
            k.box(a + 0.015, y0 + 0.015, h, b - 0.015, y1 - 0.015, h + k.rng.uniform(0.04, 0.08), (t, 0.14), 'kerb_cap', bevel=0.015)


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
        k.box(x0, rf - 1, 0.0, x1, rf, WALL_H, '#0a080e', 'crypt_wall')            # its top is the dark above the vault
        coursed(k, x0, x1, rf, 0.0, WALL_H)
        cornice(k, x0, x1, rf)
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
                coping(k, c, r, h)
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
    """The floor: old flags, squarish and bigger than the walls' blocks, in a cooler, darker stone so it never reads as
    a wall. Laid in courses of their own widths and depths that ignore the tile grid (clipped to the walkable cells);
    the odd ledger stone over two by two carved with a cross, a slab sunk and darker here and there, a crack, moss."""
    walk = set(walk)
    c0, c1 = min(c for c, r in walk), max(c for c, r in walk) + 1
    r0, r1 = min(r for c, r in walk), max(r for c, r in walk) + 1
    k.box(c0 - 1.5, r0 - 1.5, -0.4, c1 + 1.5, r1 + 1.5, -0.04, (MORTAR, 0.1), 'subfloor')     # under the walls too: no gap to see through
    taken = set()

    def slab(x0, y0, x1, y1):
        sunk = k.rng.random() < 0.08
        tone = shade(FLAG_D if sunk else FLAG, k.rng.uniform(0.82, 1.14))
        if not sunk and k.rng.random() < 0.12:
            tone = W._mix(tone, MOSS, 0.3)
        g = 0.035
        top = -0.012 if sunk else k.rng.uniform(-0.004, 0.01)
        k.box(x0 + g, y0 + g, -0.05, x1 - g, y1 - g, top, (tone, 0.16), 'crypt_flag', bevel=0.015)
        if k.rng.random() < 0.1 and x1 - x0 > 0.4 and y1 - y0 > 0.4:      # a crack across it
            ax, ay = x0 + k.rng.uniform(0.1, 0.4) * (x1 - x0), y0 + 0.06
            bx, by = x0 + k.rng.uniform(0.5, 0.9) * (x1 - x0), y1 - 0.06
            k.bar(ax, ay, bx, by, top, top + 0.004, 0.025, (shade(tone, 0.55), 0.1), 'crypt_flag')

    def ledger(c, r):
        x0, y0, x1, y1 = c, r, c + 2, r + 2
        tone = shade(FLAG, k.rng.uniform(0.9, 1.1))
        k.box(x0 + 0.04, y0 + 0.04, -0.05, x1 - 0.04, y1 - 0.04, 0.012, (tone, 0.16), 'ledger', bevel=0.02)
        k.box(x0 + 0.18, y0 + 0.18, 0.012, x1 - 0.18, y1 - 0.18, 0.016, (shade(tone, 0.8), 0.12), 'ledger_cut')
        k.box(x0 + 0.24, y0 + 0.24, 0.016, x1 - 0.24, y1 - 0.24, 0.019, (tone, 0.16), 'ledger')
        cx, cr = c + 1, r + 1
        k.box(cx - 0.05, cr - 0.58, 0.019, cx + 0.05, cr + 0.58, 0.023, (shade(tone, 0.66), 0.1), 'ledger_cut')
        k.box(cx - 0.34, cr - 0.28, 0.019, cx + 0.34, cr - 0.18, 0.023, (shade(tone, 0.66), 0.1), 'ledger_cut')

    for (c, r) in sorted(walk, key=lambda q: (q[1], q[0])):
        quad = [(c, r), (c + 1, r), (c, r + 1), (c + 1, r + 1)]
        if all(q in walk and q not in taken for q in quad) and k.rng.random() < 0.05 and \
                not any(n in taken for q in quad for n in neighbours(*q)):
            ledger(c, r)
            taken.update(quad)

    y = r0
    while y < r1 - 0.01:
        h = min(r1 - y, k.rng.choice((1.0, 1.0, 0.8, 1.2, 0.6)))
        if r1 - y - h < 0.4:
            h = r1 - y
        x = c0 - k.rng.uniform(0.0, 0.9)
        while x < c1 - 0.01:
            w = max(0.45, min(1.4, h * k.rng.uniform(0.7, 1.4)))
            cells = [(cc, rr) for cc in range(math.floor(x), math.ceil(x + w)) for rr in range(math.floor(y), math.ceil(y + h))]
            if all(q in walk and q not in taken for q in cells):
                slab(x, y, x + w, y + h)
            else:                                                       # at a wall or a ledger stone: cut to the cells
                for (cc, rr) in cells:
                    if (cc, rr) in walk and (cc, rr) not in taken:
                        a, b = max(x, cc), min(x + w, cc + 1)
                        t, u = max(y, rr), min(y + h, rr + 1)
                        if b - a > 0.12 and u - t > 0.12:
                            slab(a, t, b, u)
            x += w
        y += h


def stair_down(k, x0, x1, r0, r1, tone=STONE):
    """Stone steps going down through the floor away from you, into a cold glow: a parapet round the back and sides,
    each step darker than the last."""
    k.box(x0, r0, -1.2, x1, r1, -0.04, '#040306', 'stair_dark')
    n = 6
    d = (r1 - r0 - 0.12) / n
    for i in range(n):
        y1 = r1 - i * d
        k.box(x0 + 0.14, y1 - d, -1.2, x1 - 0.14, y1, -0.03 - i * 0.16, (shade(tone, 0.95 - 0.13 * i), 0.14), 'stair_step', bevel=0.012)
    for (a, b, c, e) in ((x0, r0, x1, r0 + 0.14), (x0, r0, x0 + 0.14, r1), (x1 - 0.14, r0, x1, r1)):
        k.box(a, b, 0.0, c, e, 0.5, (MORTAR, 0.1), 'parapet')
        k.box(a - 0.02, b - 0.02, 0.5, c + 0.02, e + 0.02, 0.58, (shade(tone, k.rng.uniform(0.85, 1.05)), 0.14), 'parapet_cap', bevel=0.015)
    coursed(k, x0 + 0.14, x1 - 0.14, r0 + 0.14, -0.6, 0.0, STONE_D)               # the far wall of the well, going down
    for x in (x0 + 0.07, x1 - 0.07):                                                # newel posts at the open end
        k.box(x - 0.1, r1 - 0.2, 0.0, x + 0.1, r1, 0.68, (shade(tone, 1.05), 0.14), 'parapet_cap', bevel=0.02)
    k.point_light((x0 + x1) / 2, r0 + 0.5, -0.9, '#7a8cd0', 6, radius=0.3)


def sarcophagus(k, x0, r0, tone=STONE):
    """A stone tomb two tiles long: carved panels down its side, a lid with a knight lying on it, hands together,
    a sword at his side — one corner chipped, moss along the foot."""
    x1, r1 = x0 + 1.8, r0 + 0.8
    k.box(x0, r0, 0.0, x1, r1, 0.12, (shade(tone, 0.8), 0.14), 'tomb_base', bevel=0.02)
    k.box(x0 + 0.08, r0 + 0.08, 0.12, x1 - 0.08, r1 - 0.08, 0.6, (shade(tone, 0.95), 0.14), 'tomb', bevel=0.02)
    for i in range(3):                                                      # carved panels on the front
        a = x0 + 0.18 + i * 0.5
        k.box(a, r1 - 0.09, 0.2, a + 0.42, r1 - 0.06, 0.52, (shade(tone, 0.72), 0.12), 'tomb_panel')
        k.box(a + 0.05, r1 - 0.065, 0.25, a + 0.37, r1 - 0.05, 0.47, (shade(tone, 0.9), 0.14), 'tomb_panel')
    for x in (x0 + 0.1, x1 - 0.1):
        k.box(x - 0.04, r1 - 0.09, 0.12, x + 0.04, r1 - 0.04, 0.6, (shade(tone, 1.05), 0.14), 'tomb_panel')
    k.box(x0 + 0.02, r0 + 0.02, 0.6, x1 - 0.02, r1 - 0.02, 0.72, (shade(tone, 1.08), 0.14), 'tomb_lid', bevel=0.025)
    e, z = shade(tone, 1.18), 0.72                                          # the effigy, head to the west
    k.box(x0 + 0.18, r0 + 0.22, z, x0 + 0.42, r1 - 0.22, z + 0.06, (e, 0.14), 'effigy')              # the pillow
    k.sphere(x0 + 0.33, (r0 + r1) / 2, z + 0.13, 0.1, 0.08, (e, 0.14), 'effigy', segs=10)
    k.tube((x0 + 0.45, (r0 + r1) / 2, z + 0.1), (x1 - 0.42, (r0 + r1) / 2, z + 0.08), 0.13, (e, 0.14), 'effigy', rb=0.09, verts=10)
    k.sphere(x0 + 0.78, (r0 + r1) / 2 + 0.02, z + 0.24, 0.05, 0.06, (e, 0.14), 'effigy', segs=8)          # hands at prayer
    for dy in (-0.07, 0.07):
        k.tube((x1 - 0.42, (r0 + r1) / 2 + dy, z + 0.07), (x1 - 0.2, (r0 + r1) / 2 + dy, z + 0.12), 0.045, (e, 0.14), 'effigy', verts=8)
    k.box(x0 + 0.6, r1 - 0.24, z + 0.02, x1 - 0.32, r1 - 0.2, z + 0.06, (shade(e, 0.9), 0.12), 'effigy')   # the sword
    k.box(x0 + 0.62, r1 - 0.3, z + 0.02, x0 + 0.66, r1 - 0.14, z + 0.07, (shade(e, 0.9), 0.12), 'effigy')
    k.box(x1 - 0.2, r0 + 0.02, 0.6, x1 - 0.02, r0 + 0.2, 0.72, '#0a080e', 'tomb_chip')                    # the chipped corner
    for _ in range(4):
        x = k.rng.uniform(x0 + 0.1, x1 - 0.1)
        k.blob(x, r1 - 0.02, 0.08, k.rng.uniform(0.08, 0.16), 0.04, 0.06, (shade(MOSS, k.rng.uniform(0.8, 1.1)), 0.2), 'moss', segs=8)
    k.solid(x0, r0, x1, r1)


def bones(k, cx, cr):
    """Old bones heaped in a corner: a few skulls, long bones every way, a ribcage half under them."""
    for _ in range(9):
        a = k.rng.uniform(0, math.pi)
        l = k.rng.uniform(0.18, 0.3)
        x, y = cx + k.rng.uniform(-0.22, 0.22), cr + k.rng.uniform(-0.16, 0.16)
        z = k.rng.uniform(0.02, 0.1)
        k.tube((x - math.cos(a) * l, y - math.sin(a) * l * 0.6, z), (x + math.cos(a) * l, y + math.sin(a) * l * 0.6, z + k.rng.uniform(-0.03, 0.05)),
               0.022, (shade(BONE, k.rng.uniform(0.7, 0.95)), 0.1), 'bone', verts=5)
    for _ in range(k.rng.choice((2, 3))):
        k.sphere(cx + k.rng.uniform(-0.18, 0.18), cr + k.rng.uniform(-0.1, 0.12), k.rng.uniform(0.08, 0.16), 0.08, 0.075,
                 (shade(BONE, k.rng.uniform(0.75, 0.95)), 0.1), 'skull', segs=8)


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
