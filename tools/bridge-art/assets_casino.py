"""The Neon Royale — the casino in Arcadia — for scenekit (bpy). Tile units: x = column, r = row (toward the
camera), z = height.

Gold and black Art Deco under neon: lacquered walls with gold pilasters and fluted neon, mirror panels, a loud
carpet (a gold lattice with teal and pink rosettes on oxblood), black-and-cream marble in the foyer, chandeliers.
The stations are built at game scale with a dealer's place behind each: half-moon blackjack tables, roulette with
its wheel, craps tubs with rails, oval poker tables, slot machines with toppers, a race-and-sports video wall, the
crash screen, Royale Link terminals, the cashier's cage, an island bar with a bottle tower, the stage with a grand
piano, and the Runouts cabinets. Live parts (the wheels, the screens, the slot chases) are drawn by
js/worlds/casino.js from the positions these builders report into a `Live` record (screen tiles).
"""
import math

import bmesh
import bpy

from scenekit import S as ROW_S, shade
import assets_cyber as Y
import assets_signs as SG

C45 = math.cos(math.radians(45))

# ---- the palette (CLAUDE.md "The Neon Royale") ------------------------------------------------------------------
GOLD, GOLD_L, GOLD_D = '#c8a040', '#ecc860', '#7a5a18'
LACQUER, LACQUER_L = '#0e0b12', '#1c1622'
FELT, FELT_D = '#1d6a46', '#13503a'
FELT_BLUE = '#1a4a6a'
OXBLOOD, OXBLOOD_L = '#3a0a18', '#5a1424'
VELVET = '#8a1022'
MARBLE, MARBLE_D = '#ddd4c4', '#17141c'
TEAL = '#2a9a9a'
PINK, CYAN, MAG, PURP, YEL = Y.PINK, Y.CYAN, Y.MAG, Y.PURP, Y.YEL
WARM = '#ffd8a0'
CHIP_COLS = ('#d83a3a', '#2a5ad8', '#2a9a4a', '#18141c', '#8a3ad0', '#e8c040', '#f0f0f0')


class Live:
    """What js/worlds/casino.js animates, in screen tiles (x, screen row = r - z·cos45)."""
    def __init__(self):
        self.wheels = []      # roulette wheels: [cx, cy, radius x, radius y]
        self.screens = []     # [x0, y0, x1, y1, kind]  kind: race, sports, odds, crash, link, jackpot, runouts:<mode>
        self.chases = []      # slot machines: [x, y0, y1, topper x0, topper y, topper x1, playable 0/1, colour]
        self.bulbs = []       # marquee bulbs: [x, y]
        self.glints = []      # chip stacks that catch the light: [x, y]
        self.dice = []        # craps: where the dice tumble [x, y]

    def screen(self, x0, x1, r_face, z0, z1, kind):
        self.screens.append([round(x0, 3), round(r_face - z1 * C45, 3), round(x1, 3), round(r_face - z0 * C45, 3), kind])

    def at(self, x, r, z):
        return [round(x, 3), round(r - z * C45, 3)]

    def dump(self):
        return {'wheels': self.wheels, 'screens': self.screens, 'chases': self.chases, 'bulbs': self.bulbs,
                'glints': self.glints, 'dice': self.dice}


# ---- shapes -------------------------------------------------------------------------------------------------------
def ellipse(cx, cr, rx, ry, n=32, a0=0.0, a1=2 * math.pi):
    return [(cx + math.cos(a0 + (a1 - a0) * i / n) * rx, cr + math.sin(a0 + (a1 - a0) * i / n) * ry) for i in range(n)]


def stadium(cx, cr, w, d, n=10):
    """A rounded rectangle whose short ends are half-circles (a racetrack): poker and craps tables."""
    rr = d / 2
    a, b = cx - w / 2 + rr, cx + w / 2 - rr
    pts = [(b + math.cos(-math.pi / 2 + math.pi * i / n) * rr, cr + math.sin(-math.pi / 2 + math.pi * i / n) * rr) for i in range(n + 1)]
    pts += [(a + math.cos(math.pi / 2 + math.pi * i / n) * rr, cr + math.sin(math.pi / 2 + math.pi * i / n) * rr) for i in range(n + 1)]
    return pts


def dshape(cx, r_back, w, d, n=18):
    """A half-moon: straight along r_back, curving out toward the camera (blackjack)."""
    return [(cx + math.cos(math.pi - math.pi * i / n) * w / 2, r_back + math.sin(math.pi * i / n) * d) for i in range(n + 1)]


def inset(pts, by):
    """The polygon moved in by `by` (each point toward the centroid, scaled per axis so the edge moves ~evenly)."""
    cx = sum(p[0] for p in pts) / len(pts)
    cr = sum(p[1] for p in pts) / len(pts)
    hx = max(abs(p[0] - cx) for p in pts) or 1
    hr = max(abs(p[1] - cr) for p in pts) or 1
    return [(cx + (p[0] - cx) * (hx - by) / hx, cr + (p[1] - cr) * (hr - by) / hr) for p in pts]


def _mesh(k, bm, name, albedo, part, emit=None):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    k.scene.collection.objects.link(o)
    return k._finish(o, albedo, part, emit)


def prism(k, pts, z0, z1, albedo, part, emit=None):
    """A flat polygon (x, r) extruded from z0 to z1 (table tops, platforms)."""
    bm = bmesh.new()
    bot = [bm.verts.new((x, -r * ROW_S, z0)) for (x, r) in pts]
    top = [bm.verts.new((x, -r * ROW_S, z1)) for (x, r) in pts]
    bm.faces.new(bot[::-1])
    bm.faces.new(top)
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    return _mesh(k, bm, 'prism', albedo, part, emit)


def rim(k, outer, inner, z0, z1, albedo, part, emit=None, closed=True):
    """A wall between two matching outlines (a tub's sides, a ring counter, a raised border)."""
    bm = bmesh.new()
    o0 = [bm.verts.new((x, -r * ROW_S, z0)) for (x, r) in outer]
    o1 = [bm.verts.new((x, -r * ROW_S, z1)) for (x, r) in outer]
    i0 = [bm.verts.new((x, -r * ROW_S, z0)) for (x, r) in inner]
    i1 = [bm.verts.new((x, -r * ROW_S, z1)) for (x, r) in inner]
    n = len(outer)
    for i in range(n if closed else n - 1):
        j = (i + 1) % n
        bm.faces.new((o1[i], o1[j], i1[j], i1[i]))      # top
        bm.faces.new((o0[i], i0[i], i0[j], o0[j]))      # bottom
        bm.faces.new((o0[i], o0[j], o1[j], o1[i]))      # outside
        bm.faces.new((i0[i], i1[i], i1[j], i0[j]))      # inside
    if not closed:
        for (a, b, c, d) in ((o0[0], o1[0], i1[0], i0[0]), (o0[-1], i0[-1], i1[-1], o1[-1])):
            bm.faces.new((a, b, c, d))
    return _mesh(k, bm, 'rim', albedo, part, emit)


def rail(k, pts, z, rad, albedo, part, emit=None, closed=True, verts=6):
    """A padded rail (or a neon line) as a tube along a path."""
    seq = list(pts) + ([pts[0]] if closed else [])
    for (a, b) in zip(seq, seq[1:]):
        k.tube((a[0], a[1], z), (b[0], b[1], z), rad, albedo, part, emit=emit, verts=verts)


def chips(k, live, x, r, z, n=None, cols=None, rng=None):
    """A stack (or two) of chips."""
    rng = rng or k.rng
    n = n or rng.randint(2, 6)
    col = rng.choice(cols or CHIP_COLS)
    k.cyl(x, r, z, z + 0.022 * n, 0.055, (col, 0.05), 'chips', verts=10)
    k.cyl(x, r, z + 0.022 * n, z + 0.022 * n + 0.004, 0.04, shade(col, 1.35), 'chip_top', verts=10)
    if live is not None and rng.random() < 0.45:
        live.glints.append(live.at(x, r, z + 0.022 * n))


# ---- floors -------------------------------------------------------------------------------------------------------
def carpet(k, x0, r0, x1, r1, base=OXBLOOD, line=GOLD, rose=TEAL, dot=PINK, step=1.0, skip=()):
    """The loud casino carpet: a gold diamond lattice on oxblood, a rosette in every diamond, dots between.
    skip: rects (x0, r0, x1, r1) left bare (marble, a stage)."""
    xs = sorted({x0, x1} | {v for (a, b, c, d) in skip for v in (a, c) if x0 < v < x1})
    rs = sorted({r0, r1} | {v for (a, b, c, d) in skip for v in (b, d) if r0 < v < r1})
    for (ra, rb) in zip(rs, rs[1:]):                       # the base, in rects round the bare patches (never under them)
        run = None
        for (xa, xb) in zip(xs, xs[1:]):
            cut = any(a <= (xa + xb) / 2 <= c and b <= (ra + rb) / 2 <= d for (a, b, c, d) in skip)
            if not cut:
                run = (run[0], xb) if run else (xa, xb)
            elif run:
                k.box(run[0], ra, -0.04, run[1], rb, 0.0, (base, 0.1), 'carpet')
                run = None
        if run:
            k.box(run[0], ra, -0.04, run[1], rb, 0.0, (base, 0.1), 'carpet')

    def bare(x, r):
        return any(a <= x <= c and b <= r <= d for (a, b, c, d) in skip)
    roses, petals, dots = [], [], []
    # the lattice: diagonal gold lines every `step`, clipped to the rect
    n0 = int(math.floor((x0 - r1) / step)) - 1
    n1 = int(math.ceil((x1 - r0) / step)) + 1
    for i in range(n0, n1 + 1):
        for sgn in (1, -1):
            # x - sgn*r = c along the line; walk it across the rect in short segments (skipping bare patches)
            c = i * step + (0.5 * step if sgn < 0 else 0)
            pts = []
            r = r0
            while r <= r1 + 1e-6:
                x = c + sgn * r
                if x0 <= x <= x1 and not bare(x, r):
                    pts.append((x, r))
                else:
                    if len(pts) > 1:
                        k.bar(pts[0][0], pts[0][1], pts[-1][0], pts[-1][1], 0.0, 0.003, 0.035, (line, 0.06), 'carpet_line')
                    pts = []
                r += 0.25
            if len(pts) > 1:
                k.bar(pts[0][0], pts[0][1], pts[-1][0], pts[-1][1], 0.0, 0.003, 0.035, (line, 0.06), 'carpet_line')
    r = r0 + step / 2
    j = 0
    while r < r1:
        x = x0 + (step / 2 if j % 2 else 0) + step / 4
        while x < x1:
            if not bare(x, r):
                roses.append((x - 0.07, r - 0.07, 0.0, x + 0.07, r + 0.07, 0.004))
                for (dx, dr) in ((0.12, 0), (-0.12, 0), (0, 0.12), (0, -0.12)):
                    petals.append((x + dx - 0.035, r + dr - 0.035, 0.0, x + dx + 0.035, r + dr + 0.035, 0.004))
            xd, rd = x + step / 2, r
            if xd < x1 and not bare(xd, rd):
                dots.append((xd - 0.03, rd - 0.03, 0.0, xd + 0.03, rd + 0.03, 0.004))
            x += step
        r += step / 2
        j += 1
    if roses:
        k.boxes(roses, rose, 'carpet_rose')
        k.boxes(petals, shade(line, 1.1), 'carpet_petal')
    if dots:
        k.boxes(dots, dot, 'carpet_dot')


def marble(k, x0, r0, x1, r1, size=1.0, a=MARBLE, b=MARBLE_D, inlay=GOLD):
    """Chequered marble with a gold strip between the squares."""
    k.box(x0, r0, -0.06, x1, r1, -0.02, '#0a0808', 'subfloor')
    light, dark = [], []
    r, i = r0, 0
    while r < r1 - 1e-6:
        x, j = x0, 0
        while x < x1 - 1e-6:
            (light if (i + j) % 2 == 0 else dark).append((x + 0.015, r + 0.015, -0.04, min(x1, x + size) - 0.015, min(r1, r + size) - 0.015, 0.0))
            x += size
            j += 1
        r += size
        i += 1
    k.boxes(light, (a, 0.08), 'marble')
    k.boxes(dark, (b, 0.12), 'marble_dark')
    k.box(x0, r0, -0.035, x1, r1, -0.025, (inlay, 0.05), 'marble_inlay')


def medallion(k, cx, cr, rad, col=GOLD, ink=OXBLOOD):
    """A crown inlaid in the floor, in a ring."""
    k.cyl(cx, cr, 0.0, 0.004, rad, (shade(MARBLE_D, 1.2), 0.08), 'medallion', verts=40)
    for rr in (rad - 0.05, rad * 0.62):
        pts = ellipse(cx, cr, rr, rr, n=40)
        rail(k, pts, 0.006, 0.02, (col, 0.05), 'medallion_ring', verts=4)
    s = rad * 0.45
    crown = [(cx - s, cr + s * 0.5), (cx - s * 1.05, cr - s * 0.55), (cx - s * 0.5, cr - s * 0.05), (cx, cr - s * 0.75),
             (cx + s * 0.5, cr - s * 0.05), (cx + s * 1.05, cr - s * 0.55), (cx + s, cr + s * 0.5)]
    prism(k, crown, 0.004, 0.009, (col, 0.05), 'medallion_crown')
    for i in range(16):                                  # sunburst rays between the rings
        a = 2 * math.pi * i / 16
        k.bar(cx + math.cos(a) * rad * 0.66, cr + math.sin(a) * rad * 0.66, cx + math.cos(a) * (rad - 0.1),
              cr + math.sin(a) * (rad - 0.1), 0.004, 0.008, 0.03, (col, 0.05), 'medallion_ray')


def runner(k, x0, r0, x1, r1, col=VELVET, trim=GOLD):
    """A red carpet runner with gold edges."""
    k.box(x0, r0, 0.0, x1, r1, 0.012, (col, 0.1), 'runner')
    k.box(x0, r0, 0.012, x0 + 0.06, r1, 0.016, (trim, 0.05), 'runner_trim')
    k.box(x1 - 0.06, r0, 0.012, x1, r1, 0.016, (trim, 0.05), 'runner_trim')


# ---- walls ----------------------------------------------------------------------------------------------------------
def deco_wall(k, x0, x1, r_face, H, gaps=(), mirrors=True, neon=PINK, rng=None, clear=()):
    """The back wall: black lacquer, gold pilasters every ~2 tiles with a stepped capital and a neon flute, mirror
    panels between them, a gold dado and a deep cornice of fans. gaps: (xa, xb) openings left for arches; clear:
    (xa, xb) stretches left plain for something mounted on the wall (a screen, the cage, a sign)."""
    def clr(xa, xb=None):
        xb = xa if xb is None else xb
        return any(a <= xb and xa <= b for (a, b) in clear)
    rng = rng or k.rng

    def runs(a, b):
        out, cur = [], a
        for (ga, gb) in sorted(gaps):
            if gb <= cur or ga >= b:
                continue
            if ga > cur:
                out.append((cur, ga))
            cur = max(cur, gb)
        if cur < b:
            out.append((cur, b))
        return out
    for (a, b) in runs(x0, x1):
        k.box(a, r_face - 0.5, 0, b, r_face, H, (LACQUER, 0.05), 'wall')
        k.box(a, r_face - 0.02, 0, b, r_face + 0.06, 0.24, (GOLD_D, 0.06), 'skirting')
        k.box(a, r_face - 0.02, 0.24, b, r_face + 0.03, 0.9, (LACQUER_L, 0.06), 'wainscot')
        k.box(a, r_face, 0.9, b, r_face + 0.07, 0.96, (GOLD, 0.05), 'dado')
        k.box(a, r_face - 0.02, H - 0.42, b, r_face + 0.12, H - 0.3, (GOLD, 0.05), 'cornice')
        k.box(a, r_face - 0.02, H - 0.3, b, r_face + 0.16, H, (LACQUER_L, 0.05), 'cornice')
        k.box(a, r_face + 0.12, H - 0.36, b, r_face + 0.15, H - 0.33, shade(neon, 0.45), 'cornice_neon', emit=(neon, 0.9))
        k.box(a, r_face - 0.5, H, b, r_face + 0.16, H + 0.05, '#08060a', 'wall_cap')
        # fans along the cornice (a deco motif): little gold half-discs
        x = a + 0.4
        while x < b - 0.3:
            k.cyl_y(x, r_face + 0.12, r_face + 0.14, H - 0.42, 0.18, 0.18, (GOLD, 0.05), 'fan', verts=12)
            x += 0.6
        # pilasters and panels
        n = max(1, int(round((b - a) / 2.0)))
        w = (b - a) / n
        for i in range(n + 1):
            px = a + i * w
            if (i == 0 and a != x0) or (i == n and b != x1) or clr(px - 0.2, px + 0.2):
                continue                                   # an arch's own frame stands there, or something's mounted
            k.box(px - 0.16, r_face - 0.02, 0, px + 0.16, r_face + 0.12, H - 0.42, (LACQUER_L, 0.05), 'pilaster')
            k.box(px - 0.2, r_face - 0.02, 0.0, px + 0.2, r_face + 0.16, 0.3, (GOLD, 0.05), 'pilaster_base')
            for s, zz in ((0.22, H - 0.62), (0.18, H - 0.54), (0.14, H - 0.48)):     # a stepped capital
                k.box(px - s, r_face - 0.02, zz, px + s, r_face + 0.16, zz + 0.08, (GOLD, 0.05), 'pilaster_cap')
            k.box(px - 0.025, r_face + 0.12, 0.4, px + 0.025, r_face + 0.14, H - 0.7, shade(neon, 0.45), 'flute', emit=(neon, 0.85))
        for i in range(n):
            pa, pb = a + i * w + 0.3, a + (i + 1) * w - 0.3
            if pb - pa < 0.4 or clr(pa, pb):
                continue
            k.box(pa - 0.05, r_face, 1.12, pb + 0.05, r_face + 0.05, H - 0.8, (GOLD_D, 0.05), 'panel_frame')
            if mirrors and (i + int(a)) % 2 == 0:            # a smoked mirror, warm with the room's light
                k.box(pa, r_face + 0.05, 1.17, pb, r_face + 0.06, H - 0.85, ('#3a2830', 0.15), 'mirror', emit=('#6a4050', 0.3))
                for (t0, t1, z0_, z1_) in ((0.12, 0.42, 0.62, 0.9), (0.2, 0.36, 0.52, 0.66)):     # two diagonal glints
                    k.tube((pa + (pb - pa) * t0, r_face + 0.065, 1.2 + (H - 2.1) * z0_), (pa + (pb - pa) * t1, r_face + 0.065,
                           1.2 + (H - 2.1) * z1_), 0.012, '#b890a0', 'mirror_glint', emit=('#f0c8d8', 0.45), verts=4)
            else:                                            # lacquer with a gold sunburst rising from the dado
                k.box(pa, r_face + 0.05, 1.17, pb, r_face + 0.06, H - 0.85, (OXBLOOD, 0.08), 'panel')
                cx_, z_ = (pa + pb) / 2, 1.17
                L = min(pb - pa, H - 2.0) * 0.8
                for j in range(9):
                    ang = math.pi * (0.1 + 0.8 * j / 8)
                    k.tube((cx_, r_face + 0.07, z_), (cx_ + math.cos(ang) * L * 0.6, r_face + 0.07, z_ + math.sin(ang) * L), 0.012,
                           (GOLD, 0.05), 'sunburst', verts=4)
                k.cyl_y(cx_, r_face + 0.06, r_face + 0.08, z_, 0.22, 0.22, (GOLD_L, 0.05), 'sun_disc', verts=14)


def side_wall(k, x0, x1, r0, r1, H, gaps=()):
    """A side wall (seen edge-on): lacquer with a gold cap. gaps: (ra, rb) doorways."""
    cur = r0
    for (ga, gb) in sorted(gaps) + [(r1, r1)]:
        if ga > cur:
            k.box(x0, cur, 0, x1, ga, H, (LACQUER, 0.05), 'side_wall')
            k.box(x0 - 0.02, cur, H, x1 + 0.02, ga, H + 0.05, (GOLD_D, 0.05), 'wall_cap')
            k.box(x0 - 0.02, ga, 0, x1 + 0.02, ga + 0.03, H + 0.05, '#06040a', 'wall_cut')
        cur = gb
    for (ga, gb) in gaps:                                  # a gold frame round each doorway's opening
        if gb >= r1:
            continue
        k.box(x0 - 0.05, ga - 0.12, 0, x1 + 0.05, ga, H * 0.62, (GOLD, 0.05), 'door_jamb')
        k.box(x0 - 0.05, gb, 0, x1 + 0.05, gb + 0.12, H * 0.62, (GOLD, 0.05), 'door_jamb')


def front_wall(k, x0, x1, r0, door, height=0.42, neon=PINK):
    """The low front wall (the camera's side), with the entrance gap."""
    for a, b in ((x0, door[0]), (door[1], x1)):
        if b - a <= 0.01:
            continue
        k.box(a, r0, 0, b, r0 + 0.6, height, (LACQUER, 0.05), 'front_wall')
        k.box(a, r0, height, b, r0 + 0.6, height + 0.05, (GOLD, 0.05), 'wall_cap')
        k.box(a, r0 - 0.01, height - 0.08, b, r0 + 0.02, height - 0.05, shade(neon, 0.45), 'front_neon', emit=(neon, 0.7))
    k.box(door[0], r0, -0.01, door[1], r0 + 0.6, 0.02, (GOLD_D, 0.05), 'threshold')
    for xx in (door[0] - 0.22, door[1]):
        k.box(xx, r0, 0, xx + 0.22, r0 + 0.6, height + 0.55, (GOLD, 0.05), 'door_post')
        k.sphere(xx + 0.11, r0 + 0.3, height + 0.66, 0.1, 0.1, '#fff0c0', 'door_lamp', emit=(WARM, 1.0), segs=8)


def arch(k, cx, r_face, w, H, h=None, glow='#ff9a60', steps=3, sign=None, energy=14):
    """A doorway through the back wall: a gold stepped (ziggurat) surround, a lit passage beyond."""
    h = h or min(H - 0.6, 2.7)
    x0, x1 = cx - w / 2, cx + w / 2
    k.box(x0, r_face - 1.2, -0.02, x1, r_face, 0.0, ('#2a1a20', 0.08), 'arch_floor')
    k.box(x0, r_face - 1.25, 0, x1, r_face - 1.2, h, shade(glow, 0.35), 'arch_beyond', emit=(glow, 0.55))
    for xx in (x0 - 0.06, x1):
        k.box(xx, r_face - 1.2, 0, xx + 0.06, r_face, h, (LACQUER_L, 0.05), 'arch_reveal')
    k.box(x0, r_face - 1.2, h, x1, r_face, h + 0.06, (LACQUER_L, 0.05), 'arch_reveal')
    k.box(x0 - 0.2, r_face - 0.5, h, x1 + 0.2, r_face, H, (LACQUER, 0.05), 'wall')          # the wall over the arch
    k.box(x0 - 0.2, r_face, H - 0.42, x1 + 0.2, r_face + 0.12, H - 0.3, (GOLD, 0.05), 'cornice')
    k.box(x0 - 0.2, r_face, H - 0.3, x1 + 0.2, r_face + 0.16, H, (LACQUER_L, 0.05), 'cornice')
    k.box(x0 - 0.2, r_face - 0.5, H, x1 + 0.2, r_face + 0.16, H + 0.05, '#08060a', 'wall_cap')
    for i in range(steps):                                  # the stepped gold surround
        t = 0.12 + i * 0.1
        z = h + 0.08 + i * 0.12
        k.box(x0 - t, r_face, 0, x0 - t + 0.1, r_face + 0.08 + i * 0.02, z, (GOLD if i % 2 == 0 else GOLD_D, 0.05), 'arch_frame')
        k.box(x1 + t - 0.1, r_face, 0, x1 + t, r_face + 0.08 + i * 0.02, z, (GOLD if i % 2 == 0 else GOLD_D, 0.05), 'arch_frame')
        k.box(x0 - t, r_face, z - 0.1, x1 + t, r_face + 0.08 + i * 0.02, z, (GOLD if i % 2 == 0 else GOLD_D, 0.05), 'arch_frame')
    k.box(cx - 0.3, r_face + 0.02, h + 0.44, cx + 0.3, r_face + 0.1, h + 0.62, (GOLD, 0.05), 'arch_key')
    k.point_light(cx, r_face - 0.4, h * 0.6, glow, energy, radius=0.4)
    k.point_light(cx, r_face + 0.5, h * 0.7, glow, energy * 0.5, radius=0.4)


def panorama(k, x0, x1, r_face, z0, z1, H, step=1.6, neon=PINK):
    """A great window across the back wall onto the live skyline: lacquer under and over it, a HOLDOUT pane (the
    engine draws the city behind it), gold mullions rising into deco fans, a gold sill. Returns the sky rect in
    screen tiles for the world JSON's scene.sky."""
    k.box(x0, r_face - 0.5, 0.0, x1, r_face, z0, (LACQUER, 0.05), 'wall')
    k.box(x0, r_face - 0.5, z1, x1, r_face, H, (LACQUER, 0.05), 'wall')
    k.box(x0, r_face - 0.52, z0, x1, r_face - 0.48, z1, 'HOLDOUT', 'window')
    k.box(x0, r_face - 0.02, 0, x1, r_face + 0.06, 0.24, (GOLD_D, 0.06), 'skirting')
    k.box(x0 - 0.05, r_face - 0.5, z0 - 0.08, x1 + 0.05, r_face + 0.14, z0, (GOLD, 0.05), 'sill')
    k.box(x0 - 0.05, r_face - 0.5, z1, x1 + 0.05, r_face + 0.1, z1 + 0.1, (GOLD, 0.05), 'lintel')
    k.box(x0, r_face - 0.02, H - 0.42, x1, r_face + 0.12, H - 0.3, (GOLD, 0.05), 'cornice')
    k.box(x0, r_face - 0.02, H - 0.3, x1, r_face + 0.16, H, (LACQUER_L, 0.05), 'cornice')
    k.box(x0, r_face + 0.12, H - 0.36, x1, r_face + 0.15, H - 0.33, shade(neon, 0.45), 'cornice_neon', emit=(neon, 0.9))
    k.box(x0, r_face - 0.5, H, x1, r_face + 0.16, H + 0.05, '#08060a', 'wall_cap')
    n = max(1, int(round((x1 - x0) / step)))
    for i in range(n + 1):
        mx = x0 + i * (x1 - x0) / n
        k.box(mx - 0.06, r_face - 0.5, z0, mx + 0.06, r_face + 0.04, z1, (GOLD, 0.05), 'mullion')
        if i < n:                                              # a fan of gold across the top of each pane
            cx_ = mx + (x1 - x0) / n / 2
            for j in range(7):
                ang = math.pi * (0.08 + 0.84 * j / 6)
                k.tube((cx_, r_face - 0.01, z1), (cx_ + math.cos(ang) * 0.55, r_face - 0.01, z1 - math.sin(ang) * 0.42), 0.014,
                       (GOLD_L, 0.05), 'fan_rib', verts=4)
            k.box(mx, r_face - 0.06, z0 + (z1 - z0) * 0.62, mx + (x1 - x0) / n, r_face - 0.02, z0 + (z1 - z0) * 0.62 + 0.04, (GOLD, 0.05),
                  'transom')
    return [round(x0, 3), round(r_face - z1 * C45, 3), round(x1, 3), round(r_face - z0 * C45, 3)]


def champagne_tower(k, cx, cr, z, levels=5):
    """A pyramid of coupes, champagne poured down through it, on a round table."""
    for lv in range(levels):
        n = levels - lv
        zz = z + lv * 0.11
        for i in range(n):
            for j in range(n):
                x = cx + (i - (n - 1) / 2) * 0.13
                r = cr + (j - (n - 1) / 2) * 0.13
                k.cyl(x, r, zz, zz + 0.05, 0.055, ('#f0d890', 0.04), 'coupe', emit=('#ffe0a0', 0.35), verts=8)
                k.cyl(x, r, zz + 0.05, zz + 0.11, 0.012, ('#e8e8f0', 0.04), 'coupe_stem', verts=4)
    k.point_light(cx, cr + 0.3, z + 0.5, '#ffe0a0', 6, radius=0.2, group='flicker')


def throne_chair(k, cx, cr, facing='left', col=VELVET):
    """The Duchess's chair: a tall gold-framed back with a crown on top, deep velvet."""
    back = {'down': (0, -1), 'up': (0, 1), 'left': (1, 0), 'right': (-1, 0)}[facing]
    k.cyl(cx, cr, 0.06, 0.45, 0.28, (col, 0.1), 'throne_seat', verts=14, bevel=0.03)
    bx, br = cx + back[0] * 0.24, cr + back[1] * 0.24
    if back[0]:
        k.box(bx - 0.08, cr - 0.3, 0.3, bx + 0.08, cr + 0.3, 1.45, (col, 0.1), 'throne_back', bevel=0.04)
        k.box(bx - 0.1, cr - 0.34, 0.25, bx + 0.1, cr - 0.28, 1.5, (GOLD, 0.05), 'throne_frame')
        k.box(bx - 0.1, cr + 0.28, 0.25, bx + 0.1, cr + 0.34, 1.5, (GOLD, 0.05), 'throne_frame')
        crown_3d(k, bx, cr, 1.5, s=0.32)
    else:
        k.box(cx - 0.3, br - 0.08, 0.3, cx + 0.3, br + 0.08, 1.45, (col, 0.1), 'throne_back', bevel=0.04)
        crown_3d(k, cx, br, 1.5, s=0.32)
    for (dx, dr) in ((-0.2, -0.2), (0.2, -0.2), (-0.2, 0.2), (0.2, 0.2)):
        k.cyl(cx + dx, cr + dr, 0.0, 0.08, 0.035, (GOLD, 0.05), 'throne_foot', verts=6)


def column(k, cx, cr, H, neon=PINK):
    """A free-standing column: black marble shaft, gold base and capital, a neon ring."""
    k.cyl(cx, cr, 0, 0.18, 0.32, (GOLD, 0.05), 'col_base', verts=16)
    k.cyl(cx, cr, 0.18, 0.3, 0.27, (GOLD_D, 0.05), 'col_base', verts=16)
    k.cyl(cx, cr, 0.3, H - 0.4, 0.21, (MARBLE_D, 0.12), 'col_shaft', verts=16)
    for i in range(8):                                     # gold fluting
        a = 2 * math.pi * i / 8 + 0.2
        k.box(cx + math.cos(a) * 0.205 - 0.015, cr + math.sin(a) * 0.205 - 0.015, 0.5, cx + math.cos(a) * 0.205 + 0.015,
              cr + math.sin(a) * 0.205 + 0.015, H - 0.6, (GOLD, 0.05), 'col_flute')
    k.cyl(cx, cr, 1.6, 1.68, 0.225, shade(neon, 0.45), 'col_neon', emit=(neon, 0.9), verts=16)
    k.cone(cx, cr, H - 0.4, H - 0.15, 0.24, 0.36, (GOLD, 0.05), 'col_cap', verts=16)
    k.cyl(cx, cr, H - 0.15, H, 0.38, (GOLD_L, 0.05), 'col_cap', verts=16)
    k.sphere(cx, cr, H + 0.22, 0.22, 0.22, '#fff4e0', 'col_globe', emit=('#ffe0b0', 1.0), segs=12)     # a lit globe on top
    k.point_light(cx, cr, H + 0.5, '#ffd8a0', 14, radius=0.25)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def chandelier(k, cx, cr, z, s=1.0, chain_top=None, energy=40.0, col=WARM):
    """Tiers of crystal drops on gold rings, a column of light down the middle."""
    chain_top = chain_top or z + 1.4
    k.tube((cx, cr, z + 0.55 * s), (cx, cr, chain_top), 0.02, (GOLD_D, 0.05), 'chain', verts=5)
    k.cyl(cx, cr, z - 0.05 * s, z + 0.55 * s, 0.05 * s, (GOLD, 0.05), 'chand_stem', verts=8)
    for (rr, zz, n) in ((0.62, 0.0, 14), (0.45, 0.22, 11), (0.28, 0.42, 8)):
        rr *= s
        pts = ellipse(cx, cr, rr, rr, n=n * 2)
        rail(k, pts, z + zz * s, 0.018, (GOLD, 0.05), 'chand_ring', verts=4)
        for i in range(n):
            a = 2 * math.pi * i / n
            x, r = cx + math.cos(a) * rr, cr + math.sin(a) * rr
            k.blob(x, r, z + zz * s - 0.08 * s, 0.035 * s, 0.035 * s, 0.07 * s, '#fff4e0', 'crystal', emit=('#fff0d0', 0.9), segs=6)
            k.sphere(x, r, z + zz * s + 0.04, 0.03 * s, 0.03 * s, '#fff8e8', 'candle_bulb', emit=(col, 1.0), segs=5)
    k.blob(cx, cr, z - 0.18 * s, 0.07 * s, 0.07 * s, 0.14 * s, '#fff4e0', 'crystal', emit=('#fff0d0', 0.9), segs=8)
    k.point_light(cx, cr, z - 0.1, col, energy, radius=0.5 * s)


# ---- signs ---------------------------------------------------------------------------------------------------------
def neon_crown(k, cx, r_face, z, s=1.0, col=YEL, gem=PINK, tube=0.026, energy=16):
    """A crown traced in neon on a wall: five points with a ball on each, a band, three gems."""
    w = 1.0 * s
    pts = [(cx - w, z), (cx - w * 1.05, z + 0.75 * s), (cx - w * 0.55, z + 0.35 * s), (cx - w * 0.3, z + 0.95 * s),
           (cx, z + 0.45 * s), (cx + w * 0.3, z + 0.95 * s), (cx + w * 0.55, z + 0.35 * s), (cx + w * 1.05, z + 0.75 * s), (cx + w, z)]
    seq = pts + [pts[0]]
    for (a, b), (c, d) in zip(seq, seq[1:]):
        k.tube((a, r_face + 0.06, b), (c, r_face + 0.06, d), tube, shade(col, 0.5), 'neon', emit=(col, 0.95), verts=6)
    for (a, b) in (pts[1], pts[3], pts[5], pts[7]):
        k.sphere(a, r_face + 0.06, b + 0.07 * s, 0.07 * s, 0.07 * s, shade(col, 0.6), 'neon', emit=(col, 1.0), segs=8)
    k.tube((cx - w * 0.95, r_face + 0.06, z + 0.16 * s), (cx + w * 0.95, r_face + 0.06, z + 0.16 * s), tube, shade(col, 0.5), 'neon',
           emit=(col, 0.95), verts=6)
    for dx in (-0.5, 0.0, 0.5):
        k.sphere(cx + dx * w, r_face + 0.07, z + 0.08 * s, 0.06 * s, 0.06 * s, shade(gem, 0.5), 'neon_gem', emit=(gem, 1.0), segs=8)
    k.point_light(cx, r_face + 0.6, z + 0.5 * s, col, energy, radius=w * 0.5, group='flicker')


def crown_3d(k, cx, cr, z, s=1.0, col=GOLD, gem=PINK):
    """A solid gold crown (a facade's finial, a sculpture): a band, five points, gems."""
    k.cyl(cx, cr, z, z + 0.3 * s, 0.55 * s, (col, 0.05), 'crown_band', verts=20)
    k.cyl(cx, cr, z + 0.05 * s, z + 0.08 * s, 0.57 * s, (GOLD_L, 0.05), 'crown_band', verts=20)
    for i in range(5):
        a = math.pi / 2 + (i - 2) * 0.62                     # the points face the camera, spread round the front
        x, r = cx + math.cos(a) * 0.5 * s, cr + math.sin(a) * 0.35 * s
        k.cone(x, r, z + 0.3 * s, z + 0.85 * s, 0.13 * s, 0.01, (col, 0.05), 'crown_point', verts=6)
        k.sphere(x, r, z + 0.88 * s, 0.06 * s, 0.06 * s, (GOLD_L, 0.05), 'crown_ball', segs=8)
        k.sphere(x, r + 0.02, z + 0.17 * s, 0.05 * s, 0.05 * s, shade(gem, 0.6), 'crown_gem', emit=(gem, 0.9), segs=6)


# ---- the tables ------------------------------------------------------------------------------------------------------
def _stool(k, cx, cr, seat=VELVET):
    k.cyl(cx, cr, 0.0, 0.04, 0.17, (GOLD_D, 0.05), 'stool_base', verts=10)
    k.cyl(cx, cr, 0.04, 0.48, 0.03, (GOLD, 0.05), 'stool_post', verts=6)
    k.cyl(cx, cr, 0.48, 0.58, 0.2, (seat, 0.1), 'stool_seat', verts=14, bevel=0.02)
    k.cyl(cx, cr, 0.47, 0.49, 0.21, (GOLD, 0.05), 'stool_ring', verts=14)


def club_chair(k, cx, cr, facing='down', col=VELVET):
    """A low-backed tub chair, gold legs; facing is the way you'd sit."""
    back = {'down': (0, -1), 'up': (0, 1), 'left': (1, 0), 'right': (-1, 0)}[facing]
    k.cyl(cx, cr, 0.08, 0.42, 0.26, (shade(col, 0.85), 0.1), 'chair_seat', verts=14, bevel=0.03)
    bx, br = cx + back[0] * 0.2, cr + back[1] * 0.2
    if back[0]:
        k.box(bx - 0.07, cr - 0.26, 0.3, bx + 0.07, cr + 0.26, 0.82, (col, 0.1), 'chair_back', bevel=0.03)
    else:
        k.box(cx - 0.26, br - 0.07, 0.3, cx + 0.26, br + 0.07, 0.82, (col, 0.1), 'chair_back', bevel=0.03)
    for (dx, dr) in ((-0.18, -0.18), (0.18, -0.18), (-0.18, 0.18), (0.18, 0.18)):
        k.cyl(cx + dx, cr + dr, 0.0, 0.1, 0.025, (GOLD, 0.05), 'chair_leg', verts=5)


def table_lamp_light(k, cx, cr, z=2.6, energy=55.0, size=1.6, col=WARM):
    """A warm pool on the felt from above (no fitting drawn: the light comes from the ceiling)."""
    k.area_light(cx, cr, z, col, energy, size)


def blackjack(k, live, cx, r_back, w=2.7, d=1.35, felt=FELT, stools=(), rng=None):
    """A half-moon table, straight edge to the dealer at r_back, curving out toward the players; a betting circle
    in front of each stool (stools: (x, r) seat positions round the curve, on tile centres so people sit on them)."""
    rng = rng or k.rng
    out = dshape(cx, r_back, w, d)
    k.cyl(cx, r_back + 0.35, 0.0, 0.08, 0.5, (LACQUER_L, 0.05), 'table_foot', verts=14)
    k.cyl(cx, r_back + 0.35, 0.08, 0.62, 0.18, (GOLD_D, 0.05), 'table_post', verts=10)
    prism(k, out, 0.62, 0.8, (LACQUER, 0.05), 'table_body')
    prism(k, inset(out, 0.08), 0.8, 0.82, (felt, 0.06), 'felt')
    rail(k, out, 0.83, 0.07, ('#2a1014', 0.08), 'padded_rail', closed=False)
    k.box(cx - w / 2, r_back - 0.04, 0.8, cx + w / 2, r_back + 0.04, 0.86, (GOLD_D, 0.05), 'table_edge')
    # the markings: a gold arc, a betting circle toward each stool
    rail(k, dshape(cx, r_back + 0.02, w * 0.6, d * 0.6)[2:-2], 0.825, 0.012, (GOLD, 0.05), 'felt_line', closed=False, verts=4)
    for (px, pr) in stools:
        a = math.atan2((pr - r_back) / d, (px - cx) / (w / 2))
        sx, sr = cx + math.cos(a) * w / 2 * 0.76, r_back + math.sin(a) * d * 0.76
        k.cyl(sx, sr, 0.82, 0.826, 0.09, (GOLD, 0.05), 'bet_ring', verts=12)
        k.cyl(sx, sr, 0.826, 0.83, 0.07, (felt, 0.06), 'felt', verts=12)
        if rng.random() < 0.75:                              # cards dealt
            k.box(sx - 0.08, sr - 0.24, 0.83, sx + 0.01, sr - 0.11, 0.835, '#f4f0e8', 'card')
            k.box(sx - 0.03, sr - 0.25, 0.835, sx + 0.06, sr - 0.12, 0.84, '#f4f0e8', 'card')
        if rng.random() < 0.65:
            chips(k, live, sx, sr, 0.83, rng=rng)
        _stool(k, px, pr)
    # the dealer's side: chip rack, shoe, discard tray, the dealer's hand
    k.box(cx - 0.5, r_back + 0.06, 0.82, cx + 0.5, r_back + 0.3, 0.86, ('#1a1418', 0.05), 'chip_rack')
    for i in range(8):
        col = CHIP_COLS[i % len(CHIP_COLS)]
        k.cyl_x(cx - 0.46 + i * 0.12, cx - 0.37 + i * 0.12, r_back + 0.18, 0.88, 0.05, 0.05, (col, 0.05), 'rack_chips', verts=8)
    live.glints.append(live.at(cx, r_back + 0.18, 0.92))
    k.box(cx + 0.72, r_back + 0.1, 0.82, cx + 0.98, r_back + 0.36, 0.95, ('#3a1018', 0.05), 'shoe', bevel=0.01)
    k.box(cx + 0.74, r_back + 0.36, 0.86, cx + 0.96, r_back + 0.38, 0.92, '#f0ece0', 'shoe_card')
    k.box(cx - 0.98, r_back + 0.1, 0.82, cx - 0.74, r_back + 0.34, 0.88, ('#18141c', 0.05), 'discard')
    k.box(cx - 0.1, r_back + 0.42, 0.83, cx + 0.05, r_back + 0.6, 0.835, '#f4f0e8', 'card')
    k.box(cx + 0.02, r_back + 0.42, 0.835, cx + 0.17, r_back + 0.6, 0.84, '#2a3a8a', 'card_back')
    # the limit placard on its post
    k.box(cx - 1.12, r_back + 0.08, 0.82, cx - 1.08, r_back + 0.12, 1.1, (GOLD, 0.05), 'placard_post')
    k.box(cx - 1.25, r_back + 0.06, 1.1, cx - 0.95, r_back + 0.1, 1.3, '#140c10', 'placard', emit=(YEL, 0.25))
    table_lamp_light(k, cx, r_back + 0.6, energy=60)


def roulette(k, live, x0, r0, w=3.6, d=1.3, wheel='left', felt=FELT, rng=None):
    """The wheel at one end in its wooden bowl, the betting layout down the rest. Returns the wheel's centre."""
    rng = rng or k.rng
    x1, r1 = x0 + w, r0 + d
    k.box(x0 + 0.15, r0 + 0.15, 0.0, x1 - 0.15, r1 - 0.15, 0.6, (LACQUER, 0.05), 'table_body')
    k.box(x0, r0, 0.6, x1, r1, 0.8, ('#2a160c', 0.1), 'table_wood', bevel=0.03)
    rail(k, [(x0 + 0.02, r0 + 0.02), (x1 - 0.02, r0 + 0.02), (x1 - 0.02, r1 - 0.02), (x0 + 0.02, r1 - 0.02)], 0.82, 0.05,
         ('#2a1014', 0.08), 'padded_rail', verts=6)
    wx = x0 + 0.72 if wheel == 'left' else x1 - 0.72
    wr = r0 + d / 2
    lx0, lx1 = (x0 + 1.5, x1 - 0.12) if wheel == 'left' else (x0 + 0.12, x1 - 1.5)
    k.box(lx0, r0 + 0.12, 0.8, lx1, r1 - 0.12, 0.82, (felt, 0.06), 'felt')
    # the layout: zero, then three rows of twelve, the dozens and the even-money boxes below
    reds = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}
    cw = (lx1 - lx0 - 0.3) / 12
    ch = (r1 - r0 - 0.24) * 0.62 / 3
    zx = lx0 + 0.04 if wheel == 'left' else lx1 - 0.3
    k.box(zx, r0 + 0.16, 0.82, zx + 0.24, r0 + 0.16 + ch * 3, 0.826, ('#1a8a50', 0.06), 'layout_zero')
    ox = lx0 + 0.3 if wheel == 'left' else lx0 + 0.02
    red, black = [], []
    for c in range(12):
        for rr in range(3):
            n = c * 3 + (3 - rr)
            box = (ox + c * cw + 0.012, r0 + 0.16 + rr * ch + 0.012, 0.82, ox + (c + 1) * cw - 0.012, r0 + 0.16 + (rr + 1) * ch - 0.012, 0.826)
            (red if n in reds else black).append(box)
    k.boxes(red, ('#b01a24', 0.06), 'layout_red')
    k.boxes(black, ('#141216', 0.06), 'layout_black')
    gl = []
    for c in range(13):
        gl.append((ox + c * cw - 0.008, r0 + 0.16, 0.826, ox + c * cw + 0.008, r0 + 0.16 + ch * 3, 0.83))
    for rr in range(4):
        gl.append((ox, r0 + 0.16 + rr * ch - 0.008, 0.826, ox + 12 * cw, r0 + 0.16 + rr * ch + 0.008, 0.83))
    bz = r0 + 0.16 + ch * 3 + 0.04
    for i in range(4):
        gl.append((ox + i * 4 * cw - 0.008, bz, 0.826, ox + i * 4 * cw + 0.008, r1 - 0.14, 0.83))
    gl.append((ox, bz - 0.008, 0.826, ox + 12 * cw, bz + 0.008, 0.83))
    k.boxes(gl, (GOLD, 0.05), 'layout_line')
    for i in range(rng.randint(4, 7)):                      # bets on the layout
        chips(k, live, ox + rng.uniform(0.1, 12 * cw - 0.1), rng.uniform(r0 + 0.25, r1 - 0.25), 0.83, n=rng.randint(1, 4), rng=rng)
    # the wheel: a wooden bowl, the pocket ring (drawn live over it), a gold turret
    k.cyl(wx, wr, 0.8, 0.98, 0.6, ('#3a1e0e', 0.1), 'wheel_bowl', verts=28)
    k.cyl(wx, wr, 0.98, 1.0, 0.6, (GOLD_D, 0.05), 'wheel_rim', verts=28)
    k.cyl(wx, wr, 0.9, 0.985, 0.5, ('#1a0e08', 0.05), 'wheel_track', verts=28)
    k.cyl(wx, wr, 0.92, 0.99, 0.4, ('#2a1a10', 0.05), 'wheel_pockets', verts=28)
    k.cone(wx, wr, 0.99, 1.12, 0.22, 0.06, (GOLD, 0.05), 'wheel_turret', verts=12)
    for i in range(4):
        a = i * math.pi / 2 + 0.4
        k.tube((wx, wr, 1.12), (wx + math.cos(a) * 0.16, wr + math.sin(a) * 0.16, 1.1), 0.015, (GOLD_L, 0.05), 'wheel_spoke', verts=4)
    live.wheels.append([round(wx, 3), round(wr - 0.99 * C45, 3), 0.39, 0.39])
    # the dolly, a stack of the croupier's chips by the wheel
    k.box(wx + (0.68 if wheel == 'left' else -0.88), r0 + 0.12, 0.82, wx + (0.88 if wheel == 'left' else -0.68), r0 + 0.4, 0.86,
          ('#18141c', 0.05), 'chip_rack')
    table_lamp_light(k, (x0 + x1) / 2, (r0 + r1) / 2, energy=70, size=2.2)
    return wx, wr


def craps(k, live, cx, cr, w=4.8, d=1.9, felt=FELT, rng=None):
    """A long tub: padded rails with chip grooves, felt at the bottom, the layout's gold lines, a pair of dice,
    the boxman's bank in the middle of the back, the stick."""
    rng = rng or k.rng
    out = stadium(cx, cr, w, d, n=10)
    inn = inset(out, 0.2)
    prism(k, inset(out, 0.15), 0.0, 0.62, (LACQUER, 0.05), 'table_body')
    prism(k, inn, 0.62, 0.66, (felt, 0.06), 'felt')
    rim(k, out, inn, 0.62, 0.92, ('#2a160c', 0.1), 'tub_wall')
    rail(k, inset(out, -0.02), 0.95, 0.075, ('#2a1014', 0.08), 'padded_rail')
    rail(k, inset(out, 0.09), 0.93, 0.03, (GOLD_D, 0.05), 'chip_groove')
    # the layout: pass line round the ends, the come box, the field, the box numbers, props in the middle
    for side in (-1, 1):
        ex = cx + side * (w / 2 - d / 2)
        rail(k, ellipse(ex, cr, d / 2 - 0.42, d / 2 - 0.42, n=12, a0=math.pi / 2 if side < 0 else -math.pi / 2,
                        a1=3 * math.pi / 2 if side < 0 else math.pi / 2), 0.665, 0.014, (GOLD, 0.05), 'felt_line', closed=False, verts=4)
        for i in range(3):                                 # place numbers along the back
            bx = cx + side * (0.62 + i * 0.36)
            k.box(bx - 0.15, cr - d / 2 + 0.28, 0.66, bx + 0.15, cr - d / 2 + 0.52, 0.664, ('#f0e8d8', 0.05), 'box_number')
    k.box(cx - 0.45, cr - 0.25, 0.66, cx + 0.45, cr + 0.32, 0.664, ('#13503a', 0.06), 'props')
    k.box(cx - 0.45, cr - 0.25, 0.664, cx + 0.45, cr - 0.22, 0.667, (GOLD, 0.05), 'felt_line')
    k.box(cx - 0.45, cr + 0.29, 0.664, cx + 0.45, cr + 0.32, 0.667, (GOLD, 0.05), 'felt_line')
    k.box(cx - 0.2, cr - 0.12, 0.664, cx + 0.2, cr + 0.08, 0.667, ('#b01a24', 0.06), 'any_seven')
    for side in (-1, 1):
        k.box(cx + side * 0.6, cr + 0.1, 0.66, cx + side * 1.6, cr + 0.34, 0.664, ('#0e3a2a', 0.06), 'field')
    # the diamond-studded backstop walls at both ends
    for side in (-1, 1):
        ex = cx + side * (w / 2 - 0.22)
        k.box(ex - 0.03, cr - 0.45, 0.66, ex + 0.03, cr + 0.45, 0.9, ('#2a2028', 0.08), 'backstop')
        for j in range(5):
            for zz in (0.72, 0.84):
                k.sphere(ex - side * 0.04, cr - 0.36 + j * 0.18, zz, 0.025, 0.025, (GOLD_L, 0.05), 'diamond', segs=4)
    # dice, the stick, the bank
    for (dx, dr) in ((0.85, 0.05), (1.0, -0.05)):
        k.box(cx + dx - 0.045, cr + dr - 0.045, 0.66, cx + dx + 0.045, cr + dr + 0.045, 0.75, ('#f4f0e8', 0.03), 'die')
        k.box(cx + dx - 0.01, cr + dr + 0.046, 0.7, cx + dx + 0.01, cr + dr + 0.048, 0.72, '#c01a24', 'pip')
    live.dice.append(live.at(cx + 0.92, cr, 0.7))
    k.tube((cx - 0.15, cr + d / 2 - 0.2, 0.98), (cx + 0.9, cr + 0.15, 0.72), 0.012, ('#c8a060', 0.08), 'stick', verts=4)
    k.box(cx - 0.42, cr - d / 2 + 0.05, 0.92, cx + 0.42, cr - d / 2 + 0.24, 0.97, ('#18141c', 0.05), 'chip_rack')
    for i in range(6):
        k.cyl_x(cx - 0.38 + i * 0.13, cx - 0.29 + i * 0.13, cr - d / 2 + 0.15, 0.99, 0.045, 0.045, (CHIP_COLS[i], 0.05), 'rack_chips', verts=8)
    for i in range(rng.randint(5, 9)):                     # chips in the grooves round the rail
        a = rng.uniform(0, 2 * math.pi)
        p = inset(out, 0.09)[int(a / (2 * math.pi) * len(out)) % len(out)]
        if p[1] > cr - d / 2 + 0.3:
            chips(k, live, p[0], p[1], 0.93, n=rng.randint(2, 5), rng=rng)
    for x in (cx - 1.2, cx + 1.2):
        table_lamp_light(k, x, cr, energy=55, size=1.8)
    return out


def poker(k, live, cx, cr, w=3.3, d=1.75, felt=FELT_BLUE, places=(), empty=(), rng=None, wood='#2a160c', chair_col=None):
    """An oval card table: wood racetrack, padded rail, felt, the board and the pot in the middle, the dealer's tray
    at the back. places: (x, r, facing) chairs round it (on tile centres, so people sit on them); empty: indexes of
    places left without a chair (where you'd stand to play, or the dealer stands)."""
    rng = rng or k.rng
    out = stadium(cx, cr, w, d, n=12)
    for x in (cx - w / 4, cx + w / 4):
        k.cyl(x, cr, 0.0, 0.08, 0.36, (LACQUER_L, 0.05), 'table_foot', verts=12)
        k.cyl(x, cr, 0.08, 0.6, 0.12, (GOLD_D, 0.05), 'table_post', verts=10)
    prism(k, out, 0.6, 0.76, (LACQUER, 0.05), 'table_body')
    rim(k, out, inset(out, 0.16), 0.76, 0.8, (wood, 0.1), 'racetrack')
    prism(k, inset(out, 0.16), 0.76, 0.78, (felt, 0.06), 'felt')
    rail(k, out, 0.81, 0.07, ('#1a0e10', 0.08), 'padded_rail', verts=6)
    rail(k, inset(out, 0.45), 0.785, 0.01, (GOLD, 0.05), 'felt_line', verts=4)
    for i in range(5):                                         # the board, the pot
        x = cx - 0.36 + i * 0.18
        k.box(x - 0.06, cr - 0.09, 0.78, x + 0.06, cr + 0.09, 0.785, '#f4f0e8' if i < 4 else '#2a3a8a', 'card')
    for (dx, dr) in ((-0.15, 0.28), (0.05, 0.33), (0.22, 0.25)):
        chips(k, live, cx + dx, cr + dr, 0.78, n=rng.randint(3, 7), rng=rng)
    k.box(cx - 0.45, cr - d / 2 + 0.12, 0.78, cx + 0.45, cr - d / 2 + 0.32, 0.82, ('#18141c', 0.05), 'chip_rack')
    for i, (px, pr, f) in enumerate(places):
        a = math.atan2((pr - cr) / (d / 2), (px - cx) / (w / 2))
        qx, qr = cx + math.cos(a) * (w / 2 - 0.42), cr + math.sin(a) * (d / 2 - 0.36)
        k.box(qx - 0.07, qr - 0.05, 0.78, qx + 0.07, qr + 0.05, 0.786, '#2a3a8a', 'card_back')
        if rng.random() < 0.8:
            chips(k, live, qx + 0.14 * math.cos(a + 1.3), qr + 0.12 * math.sin(a + 1.3), 0.78, rng=rng)
        if i not in empty:
            club_chair(k, px, pr, f, col=chair_col or OXBLOOD_L)
    table_lamp_light(k, cx, cr, energy=75, size=2.2)


# ---- slots ---------------------------------------------------------------------------------------------------------
SLOT_THEMES = [
    ('#8a1020', '#ffd040'),     # Royal Sevens: red and gold
    ('#1a2a7a', '#5cc8ff'),     # Diamond Rush: blue
    ('#5a1068', '#ff60d0'),     # Neon Geisha: magenta
    ('#0e5a3a', '#60ffb0'),     # Lucky Clover: green
    ('#6a3a08', '#ffb040'),     # Pharaoh's Gold: amber
    ('#2a0a40', '#b080ff'),     # Void Stars: violet
]


def slot_machine(k, live, cx, r0, theme=0, playable=False, w=0.8, stool=True, rng=None):
    """A tall slot machine with its back at r0, facing the room: a cabinet with lit side pipes, three reels behind
    glass, the button deck, a belly panel, a crown topper. Its chase lights are drawn live."""
    rng = rng or k.rng
    body, glow = SLOT_THEMES[theme % len(SLOT_THEMES)]
    x0, x1 = cx - w / 2, cx + w / 2
    k.box(x0, r0, 0.0, x1, r0 + 0.62, 0.72, (LACQUER_L, 0.05), 'slot_base', bevel=0.015)
    k.box(x0 + 0.05, r0 + 0.62, 0.15, x1 - 0.05, r0 + 0.63, 0.62, shade(body, 0.7), 'slot_belly', emit=(glow, 0.25))
    k.box(x0, r0 + 0.05, 0.72, x1, r0 + 0.82, 0.86, ('#1a1620', 0.05), 'slot_deck', bevel=0.012)
    for i, col in enumerate((Y.RED, YEL, Y.GREEN, CYAN)):
        k.box(x0 + 0.1 + i * 0.16, r0 + 0.62, 0.86, x0 + 0.2 + i * 0.16, r0 + 0.74, 0.885, shade(col, 0.5), 'slot_button', emit=(col, 0.8))
    k.box(x0, r0, 0.86, x1, r0 + 0.45, 1.98, (body, 0.06), 'slot_cabinet', bevel=0.015)
    k.box(x0 + 0.06, r0 + 0.45, 0.98, x1 - 0.06, r0 + 0.47, 1.62, '#06040a', 'slot_bezel')
    # the reels: three windows, a symbol in each row
    sym = ('#e02030', '#ffd040', '#40c8ff', '#40e080', '#f0f0f0', '#ff60d0')
    for i in range(3):
        rx0 = x0 + 0.1 + i * (w - 0.2) / 3
        rx1 = rx0 + (w - 0.2) / 3 - 0.03
        k.box(rx0, r0 + 0.47, 1.06, rx1, r0 + 0.475, 1.52, '#e8e4dc', 'slot_reel', emit=('#fff8e8', 0.35))
        for j in range(3):
            c = rng.choice(sym)
            mz = 1.13 + j * 0.15
            k.box(rx0 + 0.05, r0 + 0.476, mz, rx1 - 0.05, r0 + 0.48, mz + 0.07, shade(c, 0.6), 'slot_symbol', emit=(c, 0.7))
    k.box(x0 + 0.08, r0 + 0.48, 1.28, x1 - 0.08, r0 + 0.485, 1.3, '#c01020', 'payline', emit=('#ff3040', 0.9))
    k.box(x0 + 0.08, r0 + 0.45, 1.66, x1 - 0.08, r0 + 0.47, 1.9, shade(body, 0.6), 'slot_screen', emit=(glow, 0.6))
    for xx in (x0 - 0.01, x1 - 0.03):                      # side light pipes
        k.box(xx, r0 + 0.2, 0.72, xx + 0.04, r0 + 0.5, 1.98, shade(glow, 0.45), 'slot_pipe', emit=(glow, 0.8))
    # the topper: a rounded sign with a crown, on a neck
    k.box(cx - 0.12, r0 + 0.1, 1.98, cx + 0.12, r0 + 0.3, 2.08, ('#1a1620', 0.05), 'topper_neck')
    k.cyl_y(cx, r0 + 0.08, r0 + 0.3, 2.34, w / 2 - 0.02, 0.28, (body, 0.06), 'topper', verts=20)
    k.cyl_y(cx, r0 + 0.3, r0 + 0.31, 2.34, w / 2 - 0.08, 0.22, shade(glow, 0.45), 'topper_face', emit=(glow, 0.85), verts=20)
    k.box(cx - 0.16, r0 + 0.31, 2.28, cx + 0.16, r0 + 0.315, 2.42, shade(YEL, 0.5), 'topper_crown', emit=(YEL, 0.95))
    k.point_light(cx, r0 + 0.9, 1.5, glow, 3.5 if not playable else 5.0, radius=0.2, group='pulse')
    live.chases.append([round(x0 + 0.01, 3), round(r0 + 0.5 - 1.98 * C45, 3), round(r0 + 0.5 - 0.74 * C45, 3),
                        round(cx - (w / 2 - 0.1), 3), round(r0 + 0.31 - 2.34 * C45, 3), round(cx + (w / 2 - 0.1), 3),
                        1 if playable else 0, glow, round(x1 - 0.01, 3)])
    if stool:
        _stool(k, cx, r0 + 1.05, seat=body)
    k.solid(x0, r0, x1, r0 + 0.82)


def slot_bank(k, live, x0, r0, n, w=0.85, themes=None, playable=(), header=None, header_col=YEL, font='Limelight', rng=None):
    """A row of slots against a lit spine (r0 is the spine's front), a sign along the top of the spine.
    Returns the machines' centre x."""
    rng = rng or k.rng
    x1 = x0 + n * w
    k.box(x0 - 0.1, r0 - 0.3, 0.0, x1 + 0.1, r0, 2.75, (LACQUER, 0.05), 'bank_spine')
    k.box(x0 - 0.1, r0 - 0.02, 2.62, x1 + 0.1, r0 + 0.04, 2.66, shade(header_col, 0.45), 'bank_neon', emit=(header_col, 0.9))
    for xx in (x0 - 0.14, x1 + 0.04):
        k.box(xx, r0 - 0.32, 0.0, xx + 0.1, r0 + 0.85, 0.9, (GOLD, 0.05), 'bank_end')
        k.box(xx, r0 - 0.32, 0.0, xx + 0.1, r0 + 0.02, 2.8, (GOLD, 0.05), 'bank_end')
    xs = []
    for i in range(n):
        cx = x0 + (i + 0.5) * w
        slot_machine(k, live, cx, r0, theme=(themes[i % len(themes)] if themes else i), playable=i in playable, w=w - 0.05, rng=rng)
        xs.append(cx)
    if header:
        SG.letters(k, header, font, (x0 + x1) / 2, r0 - 0.02, 2.74, size=0.3, col=header_col, energy=6)
    k.solid(x0 - 0.1, r0 - 0.3, x1 + 0.1, r0)
    return xs


# ---- the screens ---------------------------------------------------------------------------------------------------------
def video_wall(k, live, x0, x1, r_face, z0, z1, layout, frame=GOLD):
    """A wall of screens in a gold frame. layout: [(fx0, fz0, fx1, fz1, kind)] in 0..1 of the wall."""
    k.box(x0 - 0.12, r_face, z0 - 0.12, x1 + 0.12, r_face + 0.1, z1 + 0.12, (frame, 0.05), 'vw_frame')
    k.box(x0, r_face + 0.1, z0, x1, r_face + 0.11, z1, '#06040a', 'vw_back')
    for (a, b, c, d, kind) in layout:
        sx0, sx1 = x0 + (x1 - x0) * a + 0.03, x0 + (x1 - x0) * c - 0.03
        sz0, sz1 = z0 + (z1 - z0) * b + 0.03, z0 + (z1 - z0) * d - 0.03
        k.box(sx0, r_face + 0.11, sz0, sx1, r_face + 0.12, sz1, '#0a1020', 'vw_screen', emit=('#1a2a5a', 0.6))
        live.screen(sx0, sx1, r_face + 0.12, sz0, sz1, kind)
    k.point_light((x0 + x1) / 2, r_face + 1.0, (z0 + z1) / 2, '#80a0ff', 18, radius=1.0, group='flicker')


def betting_counter(k, x0, x1, r0, r1, top=GOLD, glow=CYAN):
    """A long counter with lit windows (the sportsbook's, the cage's)."""
    k.box(x0, r0, 0.0, x1, r1, 1.0, (LACQUER, 0.05), 'counter', bevel=0.02)
    k.box(x0 - 0.04, r0 - 0.04, 1.0, x1 + 0.04, r1 + 0.04, 1.06, (top, 0.05), 'counter_top')
    k.box(x0 + 0.05, r1, 0.12, x1 - 0.05, r1 + 0.01, 0.9, shade(glow, 0.3), 'counter_front', emit=(glow, 0.3))
    k.box(x0, r1 + 0.01, 0.93, x1, r1 + 0.03, 0.96, shade(glow, 0.45), 'counter_neon', emit=(glow, 0.9))


def bet_terminal(k, live, cx, cr, kind, col=CYAN, w=0.6):
    """A podium terminal with a tilted screen (the race windows, the crash rail, Royale Link)."""
    k.box(cx - 0.18, cr - 0.12, 0.0, cx + 0.18, cr + 0.12, 0.08, (GOLD_D, 0.05), 'term_foot')
    k.box(cx - 0.12, cr - 0.08, 0.08, cx + 0.12, cr + 0.08, 0.92, (LACQUER_L, 0.05), 'term_post')
    k.box(cx - w / 2, cr - 0.16, 0.92, cx + w / 2, cr + 0.16, 1.0, (GOLD, 0.05), 'term_head', bevel=0.01)
    k.poly([(cx - w / 2 + 0.04, cr - 0.1, 1.42), (cx + w / 2 - 0.04, cr - 0.1, 1.42), (cx + w / 2 - 0.04, cr + 0.12, 1.02),
            (cx - w / 2 + 0.04, cr + 0.12, 1.02)], '#081020', 'term_screen', emit=('#141a3a', 0.8))
    k.box(cx - 0.13, cr + 0.08, 0.3, cx + 0.13, cr + 0.09, 0.85, shade(col, 0.4), 'term_neon', emit=(col, 0.85))
    k.box(cx - w / 2, cr - 0.14, 1.0, cx - w / 2 + 0.03, cr - 0.08, 1.45, (GOLD, 0.05), 'term_bezel')
    k.box(cx + w / 2 - 0.03, cr - 0.14, 1.0, cx + w / 2, cr - 0.08, 1.45, (GOLD, 0.05), 'term_bezel')
    k.box(cx - w / 2, cr - 0.14, 1.42, cx + w / 2, cr - 0.08, 1.46, (GOLD, 0.05), 'term_bezel')
    live.screens.append([round(cx - w / 2 + 0.06, 3), round(cr - 0.1 - 1.42 * C45, 3), round(cx + w / 2 - 0.06, 3),
                         round(cr + 0.12 - 1.02 * C45, 3), kind])
    k.point_light(cx, cr + 0.4, 1.3, col, 3.0, radius=0.2, group='flicker')
    k.solid(cx - 0.3, cr - 0.2, cx + 0.3, cr + 0.2)


# ---- the cage, the bar, the stage -----------------------------------------------------------------------------------------
def cage(k, live, x0, x1, r_face, depth=1.5, windows=3):
    """The cashier's cage, built out from the back wall: a counter, brass bars to the ceiling line, windows with
    lit grilles, the vault door and racks of chips behind."""
    rf = r_face + depth
    k.box(x0, r_face, 0.0, x1, rf, -0.0001 + 0.002, ('#2a2018', 0.08), 'cage_floor')
    # behind: the vault door, shelves of chip racks
    vx = (x0 + x1) / 2
    k.cyl_y(vx, r_face, r_face + 0.12, 1.25, 0.72, 0.72, (GOLD_D, 0.05), 'vault', verts=28)
    k.cyl_y(vx, r_face + 0.12, r_face + 0.16, 1.25, 0.6, 0.6, (GOLD, 0.05), 'vault_door', verts=28)
    for i in range(6):
        a = i * math.pi / 3
        k.tube((vx, r_face + 0.2, 1.25), (vx + math.cos(a) * 0.4, r_face + 0.2, 1.25 + math.sin(a) * 0.4), 0.03, (GOLD_L, 0.05), 'vault_wheel', verts=5)
    k.cyl_y(vx, r_face + 0.16, r_face + 0.24, 1.25, 0.12, 0.12, (GOLD_L, 0.05), 'vault_hub', verts=12)
    for sx in (x0 + 0.2, x1 - 1.0):
        for zz in (0.6, 1.05, 1.5, 1.95):
            k.box(sx, r_face, zz - 0.04, sx + 0.8, r_face + 0.3, zz, ('#2a2018', 0.06), 'cage_shelf')
            for j in range(5):
                k.cyl_x(sx + 0.05 + j * 0.15, sx + 0.14 + j * 0.15, r_face + 0.18, zz + 0.05, 0.05, 0.05, (CHIP_COLS[(j + int(zz * 3)) % 7], 0.05),
                        'rack_chips', verts=8)
    # the counter and the bars
    k.box(x0, rf - 0.45, 0.0, x1, rf, 1.0, (LACQUER, 0.05), 'cage_counter', bevel=0.02)
    k.box(x0 - 0.04, rf - 0.5, 1.0, x1 + 0.04, rf + 0.08, 1.06, (GOLD, 0.05), 'counter_top')
    k.box(x0 + 0.05, rf, 0.15, x1 - 0.05, rf + 0.01, 0.9, ('#2a1018', 0.05), 'counter_front')
    bars = []
    x = x0 + 0.05
    while x < x1 - 0.02:
        bars.append((x, rf - 0.3, 1.06, x + 0.028, rf - 0.26, 2.75))
        x += 0.11
    k.boxes(bars, (GOLD, 0.05), 'cage_bars')
    k.box(x0, rf - 0.32, 2.7, x1, rf - 0.22, 2.86, (GOLD_D, 0.05), 'cage_header')
    k.box(x0, rf - 0.32, 1.7, x1, rf - 0.24, 1.75, (GOLD_D, 0.05), 'cage_bar_rail')
    for (xa, xb) in ((x0 - 0.1, x0), (x1, x1 + 0.1)):
        k.box(xa, r_face, 0.0, xb, rf, 2.86, (LACQUER_L, 0.05), 'cage_side')
    wpos = []
    for i in range(windows):
        wx = x0 + (i + 0.5) * (x1 - x0) / windows
        k.box(wx - 0.3, rf - 0.33, 1.06, wx + 0.3, rf - 0.2, 1.62, '#000000', 'window_gap')       # a gap in the bars
        k.box(wx - 0.34, rf - 0.34, 1.6, wx + 0.34, rf - 0.18, 1.68, (GOLD_L, 0.05), 'window_arch')
        k.box(wx - 0.2, rf - 0.3, 1.06, wx + 0.2, rf + 0.05, 1.09, ('#1a1418', 0.05), 'window_tray')
        k.box(wx - 0.22, rf - 0.18, 1.72, wx + 0.22, rf - 0.16, 1.92, '#140c10', 'window_sign', emit=(YEL, 0.5))
        k.point_light(wx, rf - 0.6, 1.8, WARM, 10, radius=0.3)
        wpos.append(wx)
    k.solid(x0 - 0.1, r_face, x1 + 0.1, rf)
    return wpos


def bottle_tower(k, cx, cr, h=2.6, rad=0.45):
    """A round tower of lit shelves, bottles all round, a gold crown of light on top."""
    k.cyl(cx, cr, 0.0, h, rad * 0.6, (LACQUER_L, 0.05), 'tower_core', verts=16)
    cols = (CYAN, YEL, Y.GREEN, PINK, PURP, '#f09040', '#f0f0f0')
    for li, zz in enumerate((1.15, 1.6, 2.05)):
        k.cyl(cx, cr, zz - 0.04, zz, rad, (GOLD, 0.05), 'tower_shelf', verts=16)
        k.cyl(cx, cr, zz - 0.05, zz - 0.04, rad + 0.01, shade(PINK, 0.45), 'tower_neon', emit=(PINK, 0.8), verts=16)
        for i in range(12):
            a = 2 * math.pi * i / 12 + li * 0.25
            col = cols[(i + li * 3) % len(cols)]
            k.cyl(cx + math.cos(a) * (rad - 0.1), cr + math.sin(a) * (rad - 0.1), zz, zz + 0.28 + (i % 3) * 0.04, 0.045,
                  (col, 0.05), 'bottle', emit=(col, 0.4), verts=6)
    k.cyl(cx, cr, h, h + 0.08, rad + 0.05, (GOLD, 0.05), 'tower_cap', verts=16)
    crown_3d(k, cx, cr, h + 0.08, s=0.55)
    k.point_light(cx, cr, h + 0.3, '#ffd080', 14, radius=0.3, group='flicker')
    k.point_light(cx, cr + 0.6, 1.6, PINK, 8, radius=0.3, group='flicker')


def island_bar(k, cx, cr, w=5.4, d=3.1, top=GOLD, stools=()):
    """A bar standing on its own: a racetrack ring of lacquered counter with a gold top, neon along its foot and
    under the lip, glasses along the front, the bottle tower in the middle; stools along the front."""
    outer = stadium(cx, cr, w, d, n=12)
    inner = stadium(cx, cr, w - 1.1, d - 1.1, n=12)
    rim(k, outer, inner, 0.0, 1.0, (LACQUER, 0.05), 'bar_ring')
    rim(k, stadium(cx, cr, w + 0.1, d + 0.1, n=12), stadium(cx, cr, w - 1.2, d - 1.2, n=12), 1.0, 1.07, (top, 0.05), 'bar_top')
    rail(k, stadium(cx, cr, w + 0.14, d + 0.14, n=12), 0.2, 0.03, shade(CYAN, 0.45), 'bar_neon', emit=(CYAN, 0.9), verts=5)
    rail(k, stadium(cx, cr, w + 0.06, d + 0.06, n=12), 0.95, 0.015, shade(PINK, 0.45), 'bar_neon', emit=(PINK, 0.9), verts=4)
    bottle_tower(k, cx, cr, rad=min(0.55, d / 2 - 0.85))
    for i in range(9):                                        # glasses along the front
        x = cx - w / 2 + 0.9 + i * (w - 1.8) / 8
        col = (YEL, PINK, CYAN, '#f09040')[i % 4]
        if i % 3 != 1:
            k.cyl(x, cr + d / 2 - 0.28, 1.07, 1.2, 0.045, (col, 0.05), 'glass', emit=(col, 0.35), verts=6)
    for (x, r) in stools:
        _stool(k, x, r, seat=VELVET)
    k.solid(cx - w / 2 + 0.2, cr - d / 2 + 0.1, cx + w / 2 - 0.2, cr + d / 2 - 0.05)


def grand_piano(k, cx, cr, col=LACQUER, facing='right'):
    """A black grand piano with its lid up, a bench."""
    s = 1 if facing == 'right' else -1
    body = [(cx - s * 0.5, cr - 0.45), (cx + s * 0.25, cr - 0.45), (cx + s * 0.7, cr - 0.3), (cx + s * 0.85, cr),
            (cx + s * 0.7, cr + 0.3), (cx + s * 0.2, cr + 0.42), (cx - s * 0.5, cr + 0.45)]
    if s < 0:
        body = body[::-1]
    prism(k, body, 0.5, 0.82, (col, 0.04), 'piano')
    for (dx, dr) in ((-0.42, -0.35), (-0.42, 0.35), (0.6, 0.0)):
        k.cyl(cx + s * dx, cr + dr, 0.0, 0.5, 0.04, (GOLD_D, 0.05), 'piano_leg', verts=6)
    k.box(cx - s * 0.62, cr - 0.45, 0.68, cx - s * 0.5, cr + 0.45, 0.76, '#f4f0e8', 'keys') if s > 0 else \
        k.box(cx + 0.5, cr - 0.45, 0.68, cx + 0.62, cr + 0.45, 0.76, '#f4f0e8', 'keys')
    k.poly([(cx - s * 0.45, cr - 0.42, 0.84), (cx + s * 0.8, cr - 0.05, 0.84), (cx + s * 0.55, cr - 0.4, 1.5)], (col, 0.04), 'piano_lid')
    k.tube((cx + s * 0.3, cr - 0.2, 0.84), (cx + s * 0.45, cr - 0.3, 1.3), 0.012, (GOLD, 0.05), 'lid_prop', verts=4)
    k.box(cx - s * 0.95, cr - 0.25, 0.0, cx - s * 0.75, cr + 0.25, 0.45, (col, 0.04), 'piano_bench') if s > 0 else \
        k.box(cx + 0.75, cr - 0.25, 0.0, cx + 0.95, cr + 0.25, 0.45, (col, 0.04), 'piano_bench')


def stage(k, live, x0, x1, r_face, depth=2.2, h=0.4, curtain=VELVET, crown=True):
    """A raised stage against the back wall: a bulb-edged apron, swagged velvet curtains, a starburst backdrop in
    neon (and a neon crown over it, unless the act's name goes there), a footlight glow. Returns the stage's top height."""
    r1 = r_face + depth
    pts = [(x0, r_face), (x1, r_face), (x1, r1 - 0.4), (x1 - 0.5, r1), (x0 + 0.5, r1), (x0, r1 - 0.4)]
    prism(k, pts, 0.0, h, (LACQUER_L, 0.05), 'stage')
    prism(k, inset(pts, 0.05), h, h + 0.02, ('#3a1a10', 0.12), 'stage_boards')
    rail(k, pts[2:] + pts[:1] if False else [pts[2], pts[3], pts[4], pts[5]], h - 0.02, 0.02, (GOLD, 0.05), 'stage_edge', closed=False, verts=4)
    for (a, b) in zip([pts[2], pts[3], pts[4]], [pts[3], pts[4], pts[5]]):          # bulbs along the apron
        L = math.dist(a, b)
        for i in range(int(L / 0.22) + 1):
            t = i / max(1, int(L / 0.22))
            x, r = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            k.sphere(x, r + 0.02, h * 0.5, 0.035, 0.035, '#fff0c0', 'stage_bulb', emit=('#ffe090', 1.0), segs=5)
            live.bulbs.append(live.at(x, r + 0.02, h * 0.5))
    # backdrop: a dark panel with a neon starburst and a crown
    bx0, bx1 = x0 + 0.5, x1 - 0.5
    k.box(bx0, r_face, h, bx1, r_face + 0.06, h + 2.6, ('#120a14', 0.08), 'backdrop')
    cx = (x0 + x1) / 2
    for i in range(13):
        a = math.pi * i / 12
        k.tube((cx, r_face + 0.08, h + 0.6), (cx + math.cos(a) * 1.4, r_face + 0.08, h + 0.6 + math.sin(a) * 1.4), 0.016,
               shade(GOLD_L, 0.5), 'starburst', emit=(YEL, 0.75), verts=4)
    if crown:
        neon_crown(k, cx, r_face + 0.08, h + 1.85, s=0.38, col=PINK, gem=CYAN, energy=8)
    # curtains: swags at the top, drapes down the sides
    for side in (-1, 1):
        xe = x0 + 0.25 if side < 0 else x1 - 0.25
        for j in range(6):
            xx = xe - side * j * 0.1
            k.box(xx - 0.06, r_face + 0.1 + j * 0.02, h, xx + 0.06, r_face + 0.3 + j * 0.02, h + 2.85, (shade(curtain, 0.85 + 0.05 * (j % 2)), 0.12),
                  'curtain')
        k.tube((xe - side * 0.2, r_face + 0.35, h + 1.0), (xe + side * 0.25, r_face + 0.35, h + 1.05), 0.03, (GOLD, 0.05), 'tieback', verts=5)
    for i in range(5):
        a0 = x0 + 0.3 + i * (x1 - x0 - 0.6) / 5
        a1 = a0 + (x1 - x0 - 0.6) / 5
        pts2 = [(a0 + (a1 - a0) * t, r_face + 0.3, h + 2.85 - 0.35 * math.sin(math.pi * t)) for t in [j / 8 for j in range(9)]]
        for p, q in zip(pts2, pts2[1:]):
            k.tube(p, q, 0.07, (curtain, 0.12), 'swag', verts=6)
    k.box(x0, r_face, h + 2.85, x1, r_face + 0.35, h + 3.05, (GOLD, 0.05), 'pelmet')
    k.area_light(cx, r1 + 1.6, 3.0, '#ffb0c8', 120, 2.2, rot=(math.radians(35), 0, 0), group='flicker')     # the follow spot
    k.solid(x0, r_face, x1, r1)
    return h


def mic_stand(k, cx, cr, z):
    k.cyl(cx, cr, z, z + 0.03, 0.12, (GOLD_D, 0.05), 'mic_base', verts=10)
    k.tube((cx, cr, z), (cx, cr, z + 1.15), 0.012, (GOLD, 0.05), 'mic_stand', verts=4)
    k.sphere(cx, cr - 0.02, z + 1.2, 0.04, 0.05, ('#c8ccd8', 0.04), 'mic', segs=8)


def cocktail_table(k, cx, cr, glow=PINK):
    k.cyl(cx, cr, 0.0, 0.04, 0.2, (GOLD_D, 0.05), 'ct_foot', verts=12)
    k.cyl(cx, cr, 0.04, 0.68, 0.035, (GOLD, 0.05), 'ct_post', verts=6)
    k.cyl(cx, cr, 0.68, 0.72, 0.3, (LACQUER, 0.04), 'ct_top', verts=18)
    k.cyl(cx, cr, 0.665, 0.68, 0.31, shade(glow, 0.45), 'ct_neon', emit=(glow, 0.8), verts=18)
    k.cyl(cx + 0.08, cr - 0.05, 0.72, 0.84, 0.04, ('#f0c040', 0.05), 'glass', emit=('#ffd060', 0.3), verts=6)
    k.cyl(cx - 0.05, cr + 0.06, 0.72, 0.76, 0.06, '#f0e0c0', 'candle', emit=('#ffb050', 0.9), verts=8)
    k.point_light(cx, cr, 0.95, '#ffb060', 2.5, radius=0.1, group='flicker')


# ---- Royale Link and the Runouts cabinets -----------------------------------------------------------------------------------
def link_kiosk(k, live, x0, x1, r0, n=4, col=CYAN):
    """The Royale Link bank: a curved gold-and-glass island of terminals under a halo sign."""
    xs = []
    k.box(x0 - 0.2, r0 - 0.2, 0.0, x1 + 0.2, r0 + 0.1, 0.08, (GOLD_D, 0.05), 'link_plinth')
    k.box(x0 - 0.1, r0 - 0.25, 0.08, x1 + 0.1, r0, 2.1, (LACQUER_L, 0.05), 'link_spine')
    k.box(x0 - 0.1, r0 - 0.02, 1.95, x1 + 0.1, r0 + 0.05, 2.0, shade(col, 0.45), 'link_neon', emit=(col, 0.9))
    for i in range(n):
        cx = x0 + (i + 0.5) * (x1 - x0) / n
        bet_terminal(k, live, cx, r0 + 0.3, 'link', col=col, w=0.62)
        xs.append(cx)
    k.solid(x0 - 0.1, r0 - 0.25, x1 + 0.1, r0)
    return xs


RUNOUTS_ICONS = {
    # mode id: (colour, icon) — a neon pictogram on each cabinet's marquee
    'holdem': ('#ff5050', 'cards'), 'plo': ('#ff9040', 'cards4'), 'rng': ('#40e0d0', 'digits'), 'wheel': ('#ffd040', 'wheel'),
    'dice': ('#f0f0f0', 'dice'), 'high-card': ('#5cc8ff', 'card'), 'coin-flips': ('#ffd040', 'coin'),
    'black-marble': ('#b080ff', 'marble'), 'slots': ('#ff60d0', 'seven'), 'horse-race': ('#60ff90', 'horse'),
    'rocket': ('#ff7040', 'rocket'), 'space-invaders': ('#40ff70', 'invader'), 'bomb': ('#ff4040', 'bomb'),
    'plinko': ('#40c8ff', 'pegs'), 'battle-royale': ('#ffd040', 'crown'), 'stock-market': ('#40e080', 'chart'),
}


def _icon(k, kind, cx, r, cz, s, col):
    """A little neon pictogram on a wall plane at row r, centred on (cx, cz), s across."""
    def ln(pts, closed=False, t=0.016):
        seq = list(pts) + ([pts[0]] if closed else [])
        for (a, b), (c, d) in zip(seq, seq[1:]):
            k.tube((cx + a * s, r, cz + b * s), (cx + c * s, r, cz + d * s), t, shade(col, 0.5), 'icon', emit=(col, 0.95), verts=4)

    def circ(x, z, rad, n=10):
        ln([(x + math.cos(2 * math.pi * i / n) * rad, z + math.sin(2 * math.pi * i / n) * rad) for i in range(n)], True)
    if kind in ('cards', 'cards4'):
        for i, dx in enumerate((-0.22, 0.0, 0.22) if kind == 'cards' else (-0.3, -0.1, 0.1, 0.3)):
            ln([(dx - 0.13, -0.3), (dx + 0.13, -0.3), (dx + 0.13, 0.3), (dx - 0.13, 0.3)], True)
    elif kind == 'card':
        ln([(-0.18, -0.35), (0.18, -0.35), (0.18, 0.35), (-0.18, 0.35)], True)
        ln([(0, 0.15), (0.1, 0), (0, -0.15), (-0.1, 0)], True)
    elif kind == 'digits':
        ln([(-0.35, 0.3), (-0.15, 0.3), (-0.15, -0.3)])
        ln([(0.05, 0.3), (0.35, 0.3), (0.35, 0.0), (0.05, 0.0), (0.05, -0.3), (0.35, -0.3)])
    elif kind == 'wheel':
        circ(0, 0, 0.35, 14)
        for i in range(4):
            a = i * math.pi / 4
            ln([(math.cos(a) * 0.35, math.sin(a) * 0.35), (-math.cos(a) * 0.35, -math.sin(a) * 0.35)])
    elif kind == 'dice':
        ln([(-0.3, -0.3), (0.3, -0.3), (0.3, 0.3), (-0.3, 0.3)], True)
        for (a, b) in ((-0.15, 0.15), (0, 0), (0.15, -0.15)):
            circ(a, b, 0.04, 6)
    elif kind == 'coin':
        circ(0, 0, 0.32, 14)
        circ(0, 0, 0.18, 10)
    elif kind == 'marble':
        circ(-0.18, -0.1, 0.16, 10)
        circ(0.18, -0.1, 0.16, 10)
        circ(0, 0.18, 0.16, 10)
    elif kind == 'seven':
        ln([(-0.25, 0.32), (0.25, 0.32), (-0.05, -0.35)])
    elif kind == 'horse':
        ln([(-0.35, -0.3), (-0.25, 0.0), (0.15, 0.05), (0.3, 0.3), (0.38, 0.18), (0.25, -0.05), (0.2, -0.3)])
        ln([(-0.1, 0.0), (-0.12, -0.3)])
    elif kind == 'rocket':
        ln([(0, 0.38), (0.12, 0.12), (0.12, -0.2), (-0.12, -0.2), (-0.12, 0.12)], True)
        ln([(-0.12, -0.2), (-0.25, -0.35)])
        ln([(0.12, -0.2), (0.25, -0.35)])
    elif kind == 'invader':
        ln([(-0.3, -0.1), (-0.3, 0.15), (-0.15, 0.3), (0.15, 0.3), (0.3, 0.15), (0.3, -0.1), (-0.3, -0.1)])
        ln([(-0.2, -0.1), (-0.3, -0.3)])
        ln([(0.2, -0.1), (0.3, -0.3)])
        circ(-0.1, 0.12, 0.04, 5)
        circ(0.1, 0.12, 0.04, 5)
    elif kind == 'bomb':
        circ(0, -0.08, 0.26, 12)
        ln([(0.15, 0.15), (0.28, 0.32), (0.38, 0.28)])
    elif kind == 'pegs':
        for (a, b) in ((0, 0.3), (-0.15, 0.1), (0.15, 0.1), (-0.3, -0.1), (0, -0.1), (0.3, -0.1)):
            circ(a, b, 0.04, 6)
        ln([(-0.35, -0.32), (0.35, -0.32)])
    elif kind == 'crown':
        ln([(-0.32, -0.25), (-0.36, 0.25), (-0.15, 0.0), (0, 0.32), (0.15, 0.0), (0.36, 0.25), (0.32, -0.25)], True)
    elif kind == 'chart':
        ln([(-0.35, -0.3), (-0.35, 0.3)])
        ln([(-0.35, -0.3), (0.35, -0.3)])
        ln([(-0.3, -0.2), (-0.1, 0.0), (0.05, -0.1), (0.3, 0.25)])


def runouts_cabinet(k, live, cx, r0, mode, w=0.82):
    """A Runouts station: a slim black-and-chrome cabinet, the mode's neon pictogram on the marquee, a screen the
    engine plays the mode's attract loop on."""
    col, icon = RUNOUTS_ICONS.get(mode, ('#ff60d0', 'crown'))
    x0, x1 = cx - w / 2, cx + w / 2
    k.box(x0, r0, 0.0, x1, r0 + 0.66, 0.95, ('#14101c', 0.05), 'ro_base', bevel=0.015)
    k.box(x0 - 0.02, r0 + 0.5, 0.88, x1 + 0.02, r0 + 0.8, 1.0, ('#c8ccd8', 0.04), 'ro_panel', bevel=0.01)
    for i in range(3):
        c = (col, '#f0f0f0', col)[i]
        k.cyl(cx - 0.18 + i * 0.18, r0 + 0.66, 1.0, 1.02, 0.035, shade(c, 0.5), 'ro_button', emit=(c, 0.8), verts=8)
    k.box(x0, r0, 0.95, x1, r0 + 0.42, 1.95, ('#14101c', 0.05), 'ro_cabinet', bevel=0.015)
    k.box(x0 + 0.06, r0 + 0.42, 1.04, x1 - 0.06, r0 + 0.44, 1.7, '#04040a', 'ro_bezel')
    k.box(x0 + 0.1, r0 + 0.44, 1.08, x1 - 0.1, r0 + 0.445, 1.66, '#081018', 'ro_screen', emit=(shade(col, 0.5), 0.6))
    live.screen(x0 + 0.1, x1 - 0.1, r0 + 0.445, 1.08, 1.66, 'runouts:' + mode)
    for xx in (x0 - 0.005, x1 - 0.025):
        k.box(xx, r0 + 0.05, 0.1, xx + 0.03, r0 + 0.62, 1.95, shade(col, 0.45), 'ro_trim', emit=(col, 0.85))
    k.box(x0 - 0.03, r0 + 0.2, 1.95, x1 + 0.03, r0 + 0.5, 2.3, ('#08060c', 0.05), 'ro_marquee_box')
    k.box(x0, r0 + 0.5, 1.98, x1, r0 + 0.51, 2.27, '#0a0610', 'ro_marquee')
    _icon(k, icon, cx, r0 + 0.52, 2.125, 0.34, col)
    k.point_light(cx, r0 + 1.0, 1.6, col, 4.0, radius=0.2, group='flicker')
    k.solid(x0, r0, x1, r0 + 0.8)


# ---- the restaurant ---------------------------------------------------------------------------------------------------------
def dining_table(k, cx, cr, rad=0.48, cloth='#ece4d4', chairs=((0, -1), (0, 1)), chair_col=OXBLOOD_L, chair_off=None):
    """A round table under a white cloth to the floor, a candle, places laid; gold chairs round it."""
    k.cyl(cx, cr, 0.0, 0.74, rad, (cloth, 0.06), 'tablecloth', verts=22)
    k.cyl(cx, cr, 0.74, 0.76, rad + 0.02, (shade(cloth, 1.05), 0.05), 'tablecloth_top', verts=22)
    k.cyl(cx, cr, 0.76, 0.78, 0.07, (GOLD, 0.05), 'candle_dish', verts=10)
    k.cyl(cx, cr, 0.78, 0.92, 0.03, '#f4ecd8', 'candle', emit=('#ffcf80', 0.6), verts=8)
    k.sphere(cx, cr, 0.95, 0.02, 0.03, '#fff0c0', 'flame', emit=('#ffb040', 1.0), segs=5)
    k.point_light(cx, cr, 1.05, '#ffb060', 2.2, radius=0.08, group='flicker')
    for (dx, dr) in chairs:
        px, pr = cx + dx * rad * 0.55, cr + dr * rad * 0.55
        k.cyl(px, pr, 0.76, 0.765, 0.12, ('#f8f4ec', 0.04), 'plate', verts=12)
        k.cyl(px + 0.1, pr - 0.12 * dr if dr else pr - 0.1, 0.76, 0.9, 0.025, ('#e8e8f0', 0.04), 'wine_glass', emit=('#c02040', 0.2), verts=6)
        fx = {(0, -1): 'down', (0, 1): 'up', (-1, 0): 'right', (1, 0): 'left'}[(dx, dr)]
        off = chair_off or rad + 0.3
        club_chair(k, cx + dx * off, cr + dr * off, fx, col=chair_col)
    k.solid(cx - rad, cr - rad, cx + rad, cr + rad)


def kitchen_pass(k, x0, x1, r_face, depth=0.7):
    """The pass of an open kitchen: a steel counter under orange heat lamps, plates up, the range glowing behind."""
    rf = r_face + depth
    k.box(x0, r_face, 0.0, x1, r_face + 0.45, 0.95, ('#5a5e68', 0.06), 'range')
    for i in range(int((x1 - x0) / 0.7)):
        bx = x0 + 0.35 + i * 0.7
        k.cyl(bx, r_face + 0.22, 0.95, 0.97, 0.13, '#1a1a20', 'burner', verts=12)
        k.cyl(bx, r_face + 0.22, 0.97, 0.98, 0.09, '#3a1408', 'flame_ring', emit=('#4080ff', 0.6), verts=12)
        if i % 2 == 0:
            k.cyl(bx, r_face + 0.22, 0.98, 1.14, 0.12, ('#8a8e98', 0.04), 'pan', verts=12)
    k.box(x0, r_face, 1.4, x1, r_face + 0.5, 1.9, ('#6a6e78', 0.05), 'hood')
    k.box(x0, rf - 0.25, 0.0, x1, rf, 1.0, ('#7a7e88', 0.04), 'pass')
    k.box(x0 - 0.04, rf - 0.3, 1.0, x1 + 0.04, rf + 0.04, 1.05, ('#8a8e98', 0.03), 'pass_top')
    for i in range(int((x1 - x0) / 0.6)):
        lx = x0 + 0.3 + i * 0.6
        k.tube((lx, rf - 0.1, 1.85), (lx, rf - 0.1, 1.55), 0.01, '#2a2a30', 'lamp_cord', verts=4)
        k.cone(lx, rf - 0.1, 1.38, 1.55, 0.14, 0.05, ('#8a1a10', 0.05), 'heat_lamp', verts=10)
        k.cyl(lx, rf - 0.1, 1.37, 1.38, 0.12, '#ff7020', 'heat_glow', emit=('#ff8030', 0.9), verts=10)
        k.point_light(lx, rf - 0.1, 1.25, '#ff9040', 5, radius=0.1, group='flicker')
        k.cyl(lx, rf - 0.12, 1.05, 1.07, 0.13, ('#f8f4ec', 0.04), 'plate', verts=12)
        k.blob(lx, rf - 0.12, 1.1, 0.07, 0.06, 0.04, ('#c86040', 0.1), 'dish', segs=8)
    k.solid(x0, r_face, x1, rf)


def wine_wall(k, x0, x1, r_face, z0=0.3, z1=2.6):
    """Glass-fronted racks of bottles, lit from behind."""
    k.box(x0, r_face, z0 - 0.1, x1, r_face + 0.35, z1 + 0.1, (LACQUER, 0.05), 'wine_case')
    k.box(x0 + 0.05, r_face + 0.02, z0, x1 - 0.05, r_face + 0.03, z1, '#2a1a10', 'wine_back', emit=('#ffb060', 0.35))
    racks = []
    z = z0 + 0.08
    while z < z1 - 0.1:
        x = x0 + 0.1
        while x < x1 - 0.1:
            racks.append((x, r_face + 0.05, z, x + 0.07, r_face + 0.3, z + 0.07))
            x += 0.11
        z += 0.14
    k.boxes(racks, ('#3a0a14', 0.12), 'wine_bottles')
    k.box(x0 + 0.03, r_face + 0.33, z0, x1 - 0.03, r_face + 0.34, z1, '#1a1a24', 'wine_glass')
    k.solid(x0, r_face, x1, r_face + 0.4)


# ---- the frontage on the District street -----------------------------------------------------------------------------------
def revolving_door(k, cx, r, rad=0.42, h=1.25):
    """A gold revolving door: a glass drum, four leaves, a canopy disc."""
    k.cyl(cx, r, 0.0, 0.03, rad + 0.04, (GOLD_D, 0.05), 'rd_floor', verts=20)
    k.cyl(cx, r, h, h + 0.12, rad + 0.05, (GOLD, 0.05), 'rd_canopy', verts=20)
    for i in range(10):                                         # the drum's glass, in curved panes with gold mullions
        a = math.pi * (0.05 + 0.9 * i / 9)
        k.box(cx + math.cos(a) * rad - 0.015, r + math.sin(a) * rad - 0.015, 0.03, cx + math.cos(a) * rad + 0.015,
              r + math.sin(a) * rad + 0.015, h, (GOLD, 0.05), 'rd_mullion')
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        k.bar(cx, r, cx + math.cos(a) * (rad - 0.03), r + math.sin(a) * (rad - 0.03), 0.05, h - 0.03, 0.03, ('#ffe8b0', 0.04), 'rd_leaf',
              emit=('#ffd890', 0.3))
    k.box(cx - 0.03, r - 0.03, 0.0, cx + 0.03, r + 0.03, h, (GOLD_L, 0.05), 'rd_axle')
    k.point_light(cx, r + 0.1, 0.9, '#ffc070', 8, radius=0.3, group='flicker')


def prize_coupe(k, cx, cr, z=0.5, col='#e8c050', glass='#1a2a4a', neon=PINK):
    """A low gold hover-coupe: a wedge nose, a teardrop canopy, fins, neon down its flanks, thrusters under it."""
    L, W = 2.6, 0.95
    rings = []
    for i in range(11):
        t = i / 10
        x = cx - L / 2 + L * t
        hw = W / 2 * (0.62 + 0.38 * math.sin(math.pi * min(1.0, 0.15 + t * 0.95)))
        h = 0.16 + 0.18 * math.sin(math.pi * min(1.0, t * 1.1))
        rings.append([(x, cr - hw * 0.8, z), (x, cr - hw, z + h * 0.45), (x, cr - hw * 0.7, z + h), (x, cr + hw * 0.7, z + h),
                      (x, cr + hw, z + h * 0.45), (x, cr + hw * 0.8, z)])
    k.loft(rings, (col, 0.04), 'coupe_body', closed=True)
    k.blob(cx - 0.05, cr, z + 0.36, 0.48, 0.26, 0.13, ('#0e0c14', 0.03), 'coupe_canopy', emit=('#2a1a3a', 0.4), segs=14)
    k.blob(cx - 0.12, cr - 0.06, z + 0.45, 0.2, 0.08, 0.03, '#c8b8e0', 'coupe_glint', emit=('#e8d8ff', 0.5), segs=8)
    for side in (-1, 1):
        k.tube((cx - L / 2 + 0.15, cr + side * W * 0.47, z + 0.14), (cx + L / 2 - 0.2, cr + side * W * 0.4, z + 0.1), 0.018,
               shade(neon, 0.45), 'coupe_neon', emit=(neon, 0.95), verts=4)
        k.poly([(cx - L / 2 + 0.05, cr + side * 0.3, z + 0.3), (cx - L / 2 + 0.45, cr + side * 0.3, z + 0.3),
                (cx - L / 2 + 0.1, cr + side * 0.35, z + 0.6)], (col, 0.04), 'coupe_fin')
    k.box(cx + L / 2 - 0.08, cr - 0.3, z + 0.08, cx + L / 2, cr + 0.3, z + 0.14, '#ffffff', 'coupe_lamp', emit=('#e8f8ff', 1.0))
    k.box(cx - L / 2, cr - 0.35, z + 0.1, cx - L / 2 + 0.04, cr + 0.35, z + 0.16, '#ff3040', 'coupe_tail', emit=('#ff2040', 1.0))
    for dx in (-0.6, 0.6):
        k.cyl(cx + dx, cr, z - 0.06, z, 0.2, shade(CYAN, 0.45), 'coupe_thruster', emit=(CYAN, 0.95), verts=12)
    k.point_light(cx, cr, z - 0.15, CYAN, 6, radius=0.4, group='flicker')


def hover_limo(k, cx, cr, z=0.35, col='#0c0a10', trim=GOLD, flip=False):
    """A long black-and-gold hover-limousine, thrusters glowing under it, a door open."""
    L, W = 2.9, 0.9
    s = -1 if flip else 1
    rings = []
    for i in range(13):
        t = i / 12
        x = cx - s * L / 2 + s * L * t
        half = W / 2 * (0.55 + 0.45 * math.sin(math.pi * min(1, t * 1.25)) ** 0.6)
        top = z + 0.32 + 0.22 * math.sin(math.pi * min(1, max(0, (t - 0.25) / 0.6))) if 0.25 < t < 0.85 else z + 0.32
        rings.append([(x, cr - half, z + 0.05), (x, cr + half, z + 0.05), (x, cr + half, top), (x, cr - half, top)])
    k.loft(rings, (col, 0.04), 'limo_body', closed=True)
    k.loft([[(p[0], p[1] + 0.005, p[2] + 0.01) for p in rg[2:]] for rg in rings[4:10]], ('#2a3a5a', 0.03), 'limo_glass',
           emit=('#3a4a7a', 0.25), smooth=True)
    k.box(cx - L / 2 + 0.1, cr + W / 2 - 0.02, z + 0.22, cx + L / 2 - 0.1, cr + W / 2 + 0.02, z + 0.26, (trim, 0.05), 'limo_trim')
    for (dx, c) in ((-1.0, CYAN), (0.0, CYAN), (1.0, CYAN)):
        k.cyl(cx + dx, cr, z - 0.04, z + 0.05, 0.22, shade(c, 0.45), 'limo_thruster', emit=(c, 0.95), verts=12)
    k.box(cx + s * (L / 2 - 0.05), cr - 0.3, z + 0.12, cx + s * (L / 2 + 0.02), cr + 0.3, z + 0.22, '#ffffff', 'limo_head',
          emit=('#e8f8ff', 1.0))
    k.poly([(cx - 0.2, cr + W / 2, z + 0.08), (cx + 0.4, cr + W / 2, z + 0.08), (cx + 0.5, cr + W / 2 + 0.45, z + 0.55),
            (cx - 0.1, cr + W / 2 + 0.45, z + 0.55)], (col, 0.04), 'limo_door')           # a door swung up and out
    k.point_light(cx, cr, z - 0.2, CYAN, 12, radius=0.6, group='flicker')


def rope_line(k, a, b, n=None):
    """Brass stanchions from a to b ((x, r) points), a velvet rope swagged between them."""
    L = math.dist(a, b)
    n = n or max(2, int(round(L / 1.1)) + 1)
    posts = [(a[0] + (b[0] - a[0]) * i / (n - 1), a[1] + (b[1] - a[1]) * i / (n - 1)) for i in range(n)]
    for (x, r) in posts:
        k.cyl(x, r, 0.0, 0.06, 0.1, (GOLD_D, 0.05), 'rope_base', verts=10)
        k.cyl(x, r, 0.06, 0.8, 0.025, (GOLD, 0.06), 'rope_post', verts=8)
        k.sphere(x, r, 0.82, 0.045, 0.045, (GOLD_L, 0.05), 'rope_knob', segs=8)
    for p, q in zip(posts, posts[1:]):
        pts = [(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, 0.72 - 0.16 * 4 * t * (1 - t)) for t in [i / 8 for i in range(9)]]
        for u, v in zip(pts, pts[1:]):
            k.tube(u, v, 0.022, (VELVET, 0.1), 'velvet_rope', verts=6)
    return posts


def royale_facade(k, st, x0, x1, RF, rng=None):
    """The Neon Royale's frontage on the District street, the grandest thing on it: a black-glass tower ribbed in
    gold rising in Art Deco setbacks to a gold crown and a beacon; a recessed portico on gold columns where three
    revolving doors turn; a great marquee over it framed in chasing bulbs; NEON in pink script and ROYALE in gold
    letters across the front; a neon crown; tall screens either side for the house's own ads. Returns the doors' x
    and the roof height."""
    rng = rng or k.rng
    cx = (x0 + x1) / 2
    depth = 1.8
    rb = RF - depth
    G = 2.0                                                   # the portico storey
    TOP = 6.6
    bx0, bx1 = cx - 3.8, cx + 3.8                             # the portico's span
    k.box(x0, rb, 0.0, bx0, RF, TOP, (LACQUER, 0.04), 'royale_body')
    k.box(bx1, rb, 0.0, x1, RF, TOP, (LACQUER, 0.04), 'royale_body')
    k.box(bx0, rb, G, bx1, RF, TOP, (LACQUER, 0.04), 'royale_body')
    k.box(bx0, rb, 0.0, bx1, RF - 1.0, G, (LACQUER, 0.04), 'royale_body')
    # the side bays: black glass, gold fins, warm windows up the floors
    lit, dark = [], []
    for (a, b) in ((x0, bx0), (bx1, x1)):
        x = a + 0.25
        while x < b - 0.2:
            k.box(x - 0.035, RF, 0.0, x + 0.035, RF + 0.08, TOP, (GOLD, 0.05), 'fin')
            x += 0.62
        for zz in (0.35, 1.15, 2.75, 3.55, 4.35, 5.15, 5.85):
            xw = a + 0.33
            while xw < b - 0.4:
                (lit if rng.random() < 0.72 else dark).append((xw, RF + 0.01, zz, xw + 0.42, RF + 0.02, zz + 0.52))
                xw += 0.62
    k.boxes(lit, '#6a4a20', 'royale_window', emit=('#ffc870', 0.8))
    k.boxes(dark, '#14101a', 'royale_window_dark')
    for zz in (2.6, 4.05, TOP - 0.25):                          # floor bands in gold across the whole front
        k.box(x0 - 0.04, RF, zz, x1 + 0.04, RF + 0.1, zz + 0.08, (GOLD, 0.05), 'band')
    # the portico: recessed, gold columns at the front line, three revolving doors, light spilling out
    k.box(bx0, RF - 1.0, -0.002, bx1, RF + 0.02, 0.01, ('#2a1a10', 0.06), 'portico_floor')
    k.box(bx0 + 0.1, RF - 0.99, 0.2, bx1 - 0.1, RF - 0.98, G - 0.2, '#3a2410', 'portico_glow', emit=('#ffb060', 0.45))
    k.box(bx0, RF - 1.0, G - 0.06, bx1, RF, G, (GOLD_D, 0.05), 'portico_ceiling')
    doors = [cx - 2.5, cx, cx + 2.5]
    for dx in doors:
        revolving_door(k, dx, RF - 0.55, rad=0.42, h=1.3)
    for xx in (bx0 + 0.15, cx - 1.25, cx + 1.25, bx1 - 0.15):
        k.cyl(xx, RF - 0.08, 0.0, 0.15, 0.2, (GOLD_D, 0.05), 'portico_col_base', verts=12)
        k.cyl(xx, RF - 0.08, 0.15, G, 0.13, (GOLD, 0.04), 'portico_col', verts=12)
        k.cyl(xx, RF - 0.08, 0.6, 0.66, 0.135, shade(PINK, 0.45), 'portico_col_neon', emit=(PINK, 0.9), verts=12)
    k.point_light(cx, RF + 0.4, 1.2, '#ffc070', 30, radius=1.2, group='flicker')
    # the marquee: a deep box over the portico, its face a lightbox framed in bulbs
    mx0, mx1, mz0, mz1, out = cx - 4.3, cx + 4.3, G + 0.02, G + 0.5, 0.55
    k.box(mx0, RF, mz0, mx1, RF + out, mz1, (LACQUER_L, 0.05), 'marquee')
    k.box(mx0 - 0.04, RF, mz1, mx1 + 0.04, RF + out + 0.04, mz1 + 0.06, (GOLD, 0.05), 'marquee_top')
    k.box(mx0 - 0.04, RF + out + 0.04, mz1 + 0.02, mx1 + 0.04, RF + out + 0.08, mz1 + 0.07, shade(PINK, 0.45), 'marquee_neon', emit=(PINK, 0.9))
    k.box(mx0 + 0.15, RF + out, mz0 + 0.12, mx1 - 0.15, RF + out + 0.01, mz1 - 0.12, '#f4e4c0', 'marquee_face', emit=('#fff0d0', 0.6))
    SG.letters(k, 'CASINO  -  LADY VELVET TONIGHT  -  THE CROWN ROOM', 'PoiretOne', cx, RF + out + 0.01, mz0 + 0.16, size=0.17,
               col='#5a0a14', lit=False, depth=0.01)
    n = int((mx1 - mx0) / 0.19)
    for i in range(n + 1):
        x = mx0 + i * (mx1 - mx0) / n
        for z in (mz0 + 0.05, mz1 - 0.05):
            k.sphere(x, RF + out + 0.03, z, 0.035, 0.035, '#fff0c0', 'marquee_bulb', emit=('#ffe090', 1.0), segs=5)
            st.bulbs.append([round(x, 3), round(RF + out + 0.03 - z * C45, 3)])
    for side in (mx0, mx1):                                      # the marquee's ends, bulbs down them too
        for j in range(1, 3):
            z = mz0 + 0.05 + j * (mz1 - mz0 - 0.1) / 3
            k.sphere(side, RF + out + 0.03, z, 0.035, 0.035, '#fff0c0', 'marquee_bulb', emit=('#ffe090', 1.0), segs=5)
            st.bulbs.append([round(side, 3), round(RF + out + 0.03 - z * C45, 3)])
    for i in range(10):                                          # bulbs under the marquee light the steps
        k.point_light(mx0 + 0.5 + i * (mx1 - mx0 - 1) / 9, RF + 1.0, mz0 - 0.1, '#ffd890', 6, radius=0.2, group='flicker')
    # the name: NEON in pink script, ROYALE in gold, a neon crown over them, all framed in chasing bulbs
    nx0, nx1, nz0, nz1 = bx0 - 0.4, bx1 + 0.4, 2.75, TOP - 0.35
    k.box(nx0, RF, nz0, nx1, RF + 0.06, nz1, ('#0a0810', 0.04), 'name_board')
    frame = []
    for i in range(int((nx1 - nx0) / 0.2) + 1):
        x = nx0 + i * (nx1 - nx0) / int((nx1 - nx0) / 0.2)
        frame += [(x, nz0 + 0.06), (x, nz1 - 0.06)]
    for j in range(1, int((nz1 - nz0) / 0.2)):
        z = nz0 + 0.06 + j * (nz1 - nz0 - 0.12) / int((nz1 - nz0) / 0.2)
        frame += [(nx0 + 0.06, z), (nx1 - 0.06, z)]
    for (x, z) in frame:
        k.sphere(x, RF + 0.1, z, 0.04, 0.04, '#fff0c0', 'name_bulb', emit=('#ffe090', 1.0), segs=5)
        st.bulbs.append([round(x, 3), round(RF + 0.1 - z * C45, 3)])
    SG.neon(k, 'Neon', 'Pacifico', cx - 1.5, RF + 0.08, 4.3, size=1.6, col=PINK, tube=0.036, energy=30)
    SG.letters(k, 'ROYALE', 'Limelight', cx + 0.2, RF + 0.08, 2.92, size=1.12, col=GOLD_L, energy=40)
    neon_crown(k, cx + 2.6, RF + 0.08, 4.6, s=0.62, col=YEL, gem=PINK, energy=18)
    # the setbacks and the crown on top, a beacon over it
    for (s_, z0_, z1_) in ((0.86, TOP, TOP + 0.7), (0.66, TOP + 0.7, TOP + 1.25), (0.42, TOP + 1.25, TOP + 1.7)):
        hw = (x1 - x0) / 2 * s_
        rf = RF - 0.6 * (1 - s_)
        k.box(cx - hw, rb + 0.1, z0_, cx + hw, rf, z1_, (LACQUER, 0.04), 'setback')
        k.box(cx - hw - 0.03, rb + 0.08, z1_ - 0.06, cx + hw + 0.03, rf + 0.04, z1_, (GOLD, 0.05), 'setback_trim')
        k.box(cx - hw, rf, z0_ + 0.12, cx + hw, rf + 0.01, z0_ + 0.18, shade(PINK, 0.45), 'setback_neon', emit=(PINK, 0.9))
        x = cx - hw + 0.25
        while x < cx + hw - 0.2:
            k.box(x - 0.03, rf, z0_, x + 0.03, rf + 0.05, z1_, (GOLD, 0.05), 'fin')
            x += 0.5
    crown_3d(k, cx, rb + 1.0, TOP + 1.7, s=1.25)
    k.tube((cx, rb + 1.0, TOP + 2.7), (cx, rb + 1.0, TOP + 3.5), 0.03, (GOLD, 0.05), 'spire', verts=6)
    k.sphere(cx, rb + 1.0, TOP + 3.55, 0.09, 0.09, '#ffffff', 'beacon', emit=(PINK, 1.0), segs=8)
    k.point_light(cx, rb + 1.6, TOP + 2.2, '#ffd890', 40, radius=0.8, group='flicker')
    # tall screens either side of the name for the house's own ads
    for (a, b) in ((x0 + 0.35, bx0 - 0.6), (bx1 + 0.6, x1 - 0.35)):
        k.box(a - 0.08, RF + 0.08, 2.85, b + 0.08, RF + 0.18, 6.05, (GOLD, 0.05), 'tower_ad_frame')
        k.box(a, RF + 0.18, 2.93, b, RF + 0.19, 5.97, '#120830', 'tower_ad', emit=('#3a1a70', 0.6))
        st.ad_rect(a, b, RF + 0.19, 2.93, 5.97, 'royale')
    k.solid(x0, rb, x1, RF)
    return doors, TOP + 3.6


def gold_palm(k, cx, cr, h=1.8):
    """A palm in a gold urn, fairy lights round its trunk."""
    k.cyl(cx, cr, 0.0, 0.55, 0.3, (GOLD, 0.05), 'urn', verts=14)
    k.cyl(cx, cr, 0.55, 0.6, 0.33, (GOLD_L, 0.05), 'urn_lip', verts=14)
    k.tube((cx, cr, 0.55), (cx + 0.05, cr, h), 0.06, ('#5a3a20', 0.15), 'palm_trunk', verts=8)
    for i in range(7):
        a = 2 * math.pi * i / 7
        k.blob(cx + math.cos(a) * 0.5, cr + math.sin(a) * 0.4, h - 0.1, 0.6, 0.16, 0.07, ('#3a8a4a', 0.2), 'frond',
               rot=(0, 18 * math.sin(a), math.degrees(a)), segs=8)
    for i in range(6):
        k.sphere(cx + 0.07 * math.cos(i * 2.1), cr + 0.07 * math.sin(i * 2.1), 0.7 + i * 0.17, 0.025, 0.025, YEL, 'fairy', emit=(YEL, 1.0), segs=4)
    k.solid(cx - 0.32, cr - 0.32, cx + 0.32, cr + 0.32)
