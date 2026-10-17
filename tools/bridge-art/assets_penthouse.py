"""The Penthouse — the top of Skyport 7's tower, neon-noir luxury — for scenekit (bpy). Tile units: x = column, r = row
(toward the camera), z = height.

Inside: polished black marble veined in gold, glass to the ceiling (a hole onto the live skyline: the scene is a
backdrop world, js/skyline.js draws the city behind it), a long bar with a back bar of lit bottles, a kitchen island
under glass pendants, a sunken lounge, a platform bed facing the city, a stone egg of a bath. Outside, on the roof
deck: teak boards, a glass balustrade (front panes drawn translucent by js/estate.js, `penthouse.glass`), a plunge
pool glowing cyan, loungers, a fire pit in a ring of cushions, planters of grasses and an olive tree, festoon lights.
"""
import math

import assets_cyber as Y
import assets_estate as E
from scenekit import shade

C45 = math.cos(math.radians(45))
GOLD, GOLD_L = '#d8b060', '#f0d088'
STEEL, STEEL_D = '#8a8c94', '#3a3c44'
BLACK, BLACK_L = '#141218', '#22202a'
TEAK, TEAK_L, TEAK_D = '#8a5a34', '#a06a3e', '#6a4226'
LEATHER = '#3a2a24'
VELVET = '#3a2a5a'
POOL, POOL_L, POOL_D = '#1aa8c0', '#7ae8f8', '#0a5a74'
WARM = '#ffd49a'


# ---- floors ---------------------------------------------------------------------------------------------------------
def black_marble(k, x0, r0, x1, r1, size=1.0, tones=('#18161e', '#1c1a22', '#15131a'), vein=GOLD, z=0.0):
    """Big polished slabs of black marble with a fine joint and wandering veins of gold and grey."""
    k.box(x0, r0, z - 0.1, x1, r1, z - 0.003, '#08070a', 'subfloor')
    slabs, golds, greys = [], [], []
    r = r0
    while r < r1 - 1e-6:
        rb = min(r1, r + size)
        x = x0
        while x < x1 - 1e-6:
            xb = min(x1, x + size * 2)
            slabs.append(E.rect(x + 0.008, r + 0.008, xb - 0.008, rb - 0.008))
            for _ in range(k.rng.randint(1, 2)):
                pts = [(k.rng.uniform(x + 0.1, xb - 0.1), k.rng.uniform(r + 0.1, rb - 0.1))]
                a = k.rng.uniform(0, math.pi)
                for _ in range(k.rng.randint(3, 6)):
                    a += k.rng.uniform(-0.7, 0.7)
                    L = k.rng.uniform(0.15, 0.4)
                    pts.append((min(xb - 0.03, max(x + 0.03, pts[-1][0] + math.cos(a) * L)), min(rb - 0.03, max(r + 0.03, pts[-1][1] + math.sin(a) * L))))
                bucket = golds if k.rng.random() < 0.45 else greys
                for p, q in zip(pts, pts[1:]):
                    bucket.append(E.strip(p, q, k.rng.uniform(0.01, 0.02)))
            x = xb
        r = rb
    for i, g in enumerate(E.groups(k, slabs, tones)):
        E.flats(k, g, z, (tones[i], 0.03), 'floor')
    E.flats(k, golds, z + 0.001, shade(vein, 0.75), 'floor')
    E.flats(k, greys, z + 0.001, '#3a3844', 'floor')


def decking(k, x0, r0, x1, r1, tones=(TEAK, TEAK_L, '#7e5230', '#946238'), board=0.24, gap=0.016, z=0.0, holes=()):
    """Teak decking: boards running along the rows, butt joints staggered, a joint between them, the screw heads in
    pairs where the boards cross the joists. holes: (x0, r0, x1, r1) left open (a pool sunk into it)."""
    def cut(a, b, xa, xb):                                 # the run [a, b) of a board at [xa, xb), less the holes
        runs = [(a, b)]
        for (hx0, hr0, hx1, hr1) in holes:
            if xb <= hx0 or xa >= hx1:
                continue
            runs = [s for (p, q) in runs for s in ((p, min(q, hr0)), (max(p, hr1), q)) if s[1] - s[0] > 0.02]
        return runs
    xs = sorted({x0, x1} | {v for h in holes for v in (h[0], h[2])})
    for (xa, xb) in zip(xs, xs[1:]):
        for (a, b) in cut(r0, r1, xa, xb):
            k.box(xa, a, z - 0.25, xb, b, z - 0.004, '#3a2618', 'subfloor')
    boards, screws = [], []
    x = x0
    while x < x1 - 1e-6:
        xb = min(x1, x + board)
        r = r0 - k.rng.uniform(0, 2.0)
        while r < r1:
            L = k.rng.choice((2.0, 2.5, 3.0))
            for (a, b) in cut(max(r, r0), min(r + L, r1), x, xb):
                if b - a > 0.15:
                    boards.append(E.rect(x + gap / 2, a + gap / 2, xb - gap / 2, b - gap / 2))
            r += L
        jr = r0 + 0.5
        while jr < r1:
            for dx in (0.04, board - 0.04):
                if x + dx < x1 - 0.01 and cut(jr - 0.01, jr + 0.01, x + dx - 0.01, x + dx + 0.01):
                    screws.append(E.rect(x + dx - 0.006, jr - 0.006, x + dx + 0.006, jr + 0.006))
            jr += 1.0
        x = xb
    for i, g in enumerate(E.groups(k, boards, tones)):
        E.flats(k, g, z, (tones[i], 0.07), 'deck')
    E.flats(k, screws, z + 0.001, '#3a3430', 'deck')


def geo_rug(k, x0, r0, x1, r1, base='#2a2438', lines=GOLD, accent='#7a5ab8', z=0.0):
    """A hand-tufted rug, art deco by way of the future: a dark field, gold lines stepping in from each corner, a
    violet fan at the middle."""
    k.box(x0, r0, z, x1, r1, z + 0.014, (base, 0.06), 'rug')
    W, D = x1 - x0, r1 - r0
    cx, cr = (x0 + x1) / 2, (r0 + r1) / 2
    ls = [E.rect(x0 + 0.08, r0 + 0.08, x1 - 0.08, r0 + 0.11), E.rect(x0 + 0.08, r1 - 0.11, x1 - 0.08, r1 - 0.08),
          E.rect(x0 + 0.08, r0 + 0.08, x0 + 0.11, r1 - 0.08), E.rect(x1 - 0.11, r0 + 0.08, x1 - 0.08, r1 - 0.08)]
    for i in range(1, 5):                                    # stepped chevrons in from each corner
        d = 0.18 * i
        for (sx, sr) in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            ox, orr = (x0 if sx > 0 else x1), (r0 if sr > 0 else r1)
            ls.append(E.strip((ox + sx * (0.11 + d), orr + sr * 0.11), (ox + sx * 0.11, orr + sr * (0.11 + d)), 0.025))
    fans = []
    for i in range(9):
        a0, a1 = math.pi + math.pi * i / 9, math.pi + math.pi * (i + 1) / 9
        R = min(W, D) * 0.34
        fans.append([(cx, cr + R * 0.35)] + E.ell(cx, cr + R * 0.35, R, R * 0.8, 3, a0, a1) + [(cx + math.cos(a1) * R, cr + R * 0.35 + math.sin(a1) * R * 0.8)])
    E.flats(k, fans[0::2], z + 0.0145, (accent, 0.04), 'rug')
    E.flats(k, fans[1::2], z + 0.0145, (shade(accent, 0.7), 0.04), 'rug')
    E.flats(k, ls, z + 0.0155, (lines, 0.0), 'rug')


# ---- glass ----------------------------------------------------------------------------------------------------------
def glass_wall(k, x0, x1, r_face, H, mullions=(), sill=0.12, frame=BLACK, led=Y.PURP):
    """Glass from the floor to the ceiling (holdout: the city shows through), black mullions, a bulkhead over it
    with a cove of light. Returns the glass as a screen rect."""
    k.box(x0, r_face - 0.05, 0.0, x1, r_face + 0.06, sill, (frame, 0.05), 'glass_sill')
    k.box(x0, r_face, sill, x1, r_face + 0.01, H - 0.3, 'HOLDOUT', 'glass')
    ms = []
    for x in [x0] + list(mullions) + [x1]:
        ms.append((x - 0.04, r_face, sill, x + 0.04, r_face + 0.08, H - 0.3))
    k.boxes(ms, (frame, 0.05), 'mullion')
    k.box(x0 - 0.1, r_face - 0.3, H - 0.3, x1 + 0.1, r_face + 0.3, H, (BLACK_L, 0.05), 'bulkhead')
    k.box(x0, r_face + 0.3, H - 0.32, x1, r_face + 0.32, H - 0.28, shade(led, 0.4), 'cove', emit=(led, 0.9))
    return [round(x0, 3), round(r_face - (H - 0.3) * C45, 3), round(x1, 3), round(r_face - sill * C45, 3)]


def glass_balustrade(k, a, b, h=1.05, post=STEEL, rail=TEAK, holdout=False, post_every=1.4):
    """A frameless glass balustrade from a to b ((x, r) points along a row or a column): a steel shoe channel, posts,
    a teak handrail; the glass itself a holdout (a back edge with the sky behind it) or left to js/estate.js (the
    front edge: drawn as a translucent pane over whatever's beyond). Returns the pane's screen rect."""
    (xa, ra), (xb, rb) = a, b
    along_x = abs(rb - ra) < 1e-6
    if along_x:
        k.box(min(xa, xb), ra - 0.05, 0, max(xa, xb), ra + 0.05, 0.1, (STEEL_D, 0.05), 'balustrade_shoe')
        if holdout:
            k.box(min(xa, xb), ra - 0.012, 0.1, max(xa, xb), ra + 0.012, h - 0.05, 'HOLDOUT', 'balustrade_glass')
        k.box(min(xa, xb) - 0.03, ra - 0.06, h - 0.05, max(xa, xb) + 0.03, ra + 0.06, h + 0.02, (rail, 0.08), 'balustrade_rail')
        n = max(1, int(round(abs(xb - xa) / post_every)))
        for i in range(n + 1):
            x = xa + (xb - xa) * i / n
            k.box(x - 0.025, ra - 0.03, 0.1, x + 0.025, ra + 0.03, h - 0.05, post, 'balustrade_post')
        k.solid(min(xa, xb), ra - 0.1, max(xa, xb), ra + 0.1)
        return [round(min(xa, xb), 3), round(ra - (h - 0.05) * C45, 3), round(max(xa, xb), 3), round(ra - 0.1 * C45, 3)]
    k.box(xa - 0.05, min(ra, rb), 0, xa + 0.05, max(ra, rb), 0.1, (STEEL_D, 0.05), 'balustrade_shoe')
    k.box(xa - 0.06, min(ra, rb) - 0.03, h - 0.05, xa + 0.06, max(ra, rb) + 0.03, h + 0.02, (rail, 0.08), 'balustrade_rail')
    k.box(xa - 0.008, min(ra, rb), 0.1, xa + 0.008, max(ra, rb), h - 0.05, ('#9ac8d8', 0.02), 'balustrade_edge', emit=('#5a8a9a', 0.35))
    n = max(1, int(round(abs(rb - ra) / post_every)))
    for i in range(n + 1):
        r = ra + (rb - ra) * i / n
        k.box(xa - 0.03, r - 0.025, 0.1, xa + 0.03, r + 0.025, h - 0.05, post, 'balustrade_post')
    k.solid(xa - 0.1, min(ra, rb), xa + 0.1, max(ra, rb))
    return None


def sliding_doors(k, x, r0, r1, H, open_r=None, frame=BLACK):
    """A wall of glass running back from the camera (seen edge on): slim black frames, the head and the floor track,
    the sliders stacked open where you walk through (open_r: (ra, rb))."""
    k.box(x - 0.06, r0, 0.0, x + 0.06, r1, 0.04, (STEEL_D, 0.04), 'door_track')
    k.box(x - 0.1, r0, H - 0.3, x + 0.1, r1, H, (BLACK_L, 0.05), 'bulkhead')
    rr = r0
    posts = []
    while rr <= r1 + 1e-6:
        posts.append(rr)
        rr += 1.2
    for r in posts:
        if open_r and open_r[0] - 0.05 < r < open_r[1] + 0.05:
            continue
        k.box(x - 0.04, r - 0.035, 0.04, x + 0.04, r + 0.035, H - 0.3, (frame, 0.05), 'mullion')
    segs = [(r0, r1)] if not open_r else [(r0, open_r[0]), (open_r[1], r1)]
    for (a, b) in segs:
        if b - a > 0.05:
            k.box(x - 0.006, a, 0.04, x + 0.006, b, H - 0.3, ('#9ac8d8', 0.02), 'glass_edge', emit=('#4a7a8a', 0.3))
    if open_r:                                                  # the sliders, stacked behind the fixed pane
        for (dx, rr) in ((0.06, open_r[1] + 0.02), (0.12, open_r[1] + 0.06)):
            k.box(x + dx - 0.035, rr, 0.04, x + dx + 0.035, rr + 0.05, H - 0.3, (frame, 0.05), 'mullion')
    blocked = [(r0, r1)] if not open_r else [(r0, open_r[0]), (open_r[1], r1)]
    for (a, b) in blocked:
        if b - a > 0.05:
            k.solid(x - 0.1, a, x + 0.1, b)


# ---- the bar and the kitchen ----------------------------------------------------------------------------------------
def back_bar(k, x0, x1, r_face, H, neon=Y.PINK, mirror=True):
    """A back bar to the ceiling: smoked mirror behind three glass shelves of bottles, each shelf lit from beneath,
    tall cabinets each end, a wine fridge glowing, the espresso machine. Returns the shelf heights."""
    F = r_face + 0.38
    k.box(x0, r_face, 0, x1, r_face + 0.03, H - 0.3, ('#1a1820', 0.04), 'bar_back')
    if mirror:
        k.box(x0 + 0.5, r_face + 0.03, 1.05, x1 - 0.5, r_face + 0.04, H - 0.5, ('#2a2a36', 0.03), 'bar_mirror', emit=('#141420', 0.4))
    k.box(x0, r_face, 0, x1, F, 0.9, (BLACK_L, 0.04), 'bar_cabinet')
    k.box(x0 - 0.02, r_face, 0.9, x1 + 0.02, F + 0.04, 0.95, ('#2a2832', 0.04), 'bar_cabinet_top')
    for x in (x0, x1 - 0.5):
        k.box(x, r_face, 0, x + 0.5, F + 0.02, H - 0.3, (BLACK_L, 0.04), 'bar_tower')
        k.box(x + 0.04, F + 0.02, 0.1, x + 0.46, F + 0.03, H - 0.4, ('#1c1a22', 0.03), 'bar_tower_door')
        k.box(x + 0.4, F + 0.03, 1.0, x + 0.42, F + 0.05, 1.5, GOLD, 'bar_handle')
    k.box(x0 + 0.06, F + 0.03, 0.12, x0 + 0.44, F + 0.04, 0.85, '#0c1418', 'wine_fridge', emit=('#3a6a8a', 0.35))
    for z in (0.2, 0.35, 0.5, 0.65):
        for i in range(5):
            k.cyl_y(x0 + 0.1 + i * 0.07, F - 0.05, F + 0.04, z, 0.025, 0.025, ('#3a0a1a', '#2a4a1a', '#c8a040')[i % 3], 'wine_bottle', verts=6)
    levels = (1.15, 1.6, 2.05)
    bottles = {}
    for z in levels:
        k.box(x0 + 0.5, r_face + 0.03, z - 0.03, x1 - 0.5, r_face + 0.3, z, ('#a8c0c8', 0.02), 'bar_shelf', emit=('#3a4a50', 0.3))
        k.box(x0 + 0.5, r_face + 0.26, z - 0.035, x1 - 0.5, r_face + 0.3, z - 0.025, shade(neon, 0.5), 'bar_shelf_led', emit=(neon if z != 1.6 else Y.CYAN, 0.9))
        x = x0 + 0.58
        while x < x1 - 0.6:
            col = k.rng.choice((Y.CYAN, Y.PINK, '#e8c040', '#a0f080', '#c8a060', '#e86a3a', '#8a7ae0', '#e0e0e8'))
            h = k.rng.uniform(0.22, 0.34)
            bottles.setdefault(col, []).append((x, z, h))
            x += k.rng.uniform(0.09, 0.13)
    for col, bs in bottles.items():
        for (x, z, h) in bs:
            k.cyl(x, r_face + 0.16, z, z + h * 0.7, 0.035, (shade(col, 0.5), 0.03), 'bottle', emit=(col, 0.35), verts=8)
            k.cyl(x, r_face + 0.16, z + h * 0.7, z + h, 0.012, '#1a1a1e', 'bottle_neck', verts=6)
    k.point_light((x0 + x1) / 2, r_face + 0.6, 1.6, '#f0a0d8', 14, radius=0.4)
    k.solid(x0, r_face, x1, F + 0.04)
    return levels


def espresso_machine(k, cx, cr, z):
    k.box(cx - 0.22, cr - 0.14, z, cx + 0.22, cr + 0.14, z + 0.32, (STEEL, 0.03), 'espresso')
    k.box(cx - 0.2, cr + 0.14, z + 0.18, cx + 0.2, cr + 0.15, z + 0.28, '#101418', 'espresso_face', emit=('#e8a040', 0.4))
    for dx in (-0.1, 0.1):
        k.cyl(cx + dx, cr + 0.16, z + 0.08, z + 0.14, 0.03, STEEL_D, 'espresso', verts=8)
    k.cyl(cx, cr, z + 0.32, z + 0.36, 0.12, STEEL, 'espresso', verts=10)


def bar_counter(k, x0, x1, r0, r1, top='#ece6dc', neon=Y.PINK, stools=(), stool_r=None):
    """The bar: a fluted black front lit from below, a white marble top with a gold edge, a brass foot rail, the
    stools in a row before it. stools: x positions."""
    k.box(x0, r0, 0.08, x1, r1, 1.0, (BLACK, 0.04), 'bar_body')
    fl = []
    x = x0 + 0.04
    while x < x1 - 0.04:
        fl.append((x, r1, 0.12, x + 0.05, r1 + 0.03, 0.96))
        x += 0.09
    k.boxes(fl, ('#24222c', 0.04), 'bar_flute')
    k.box(x0 + 0.04, r1 - 0.02, 0.0, x1 - 0.04, r1 + 0.03, 0.08, shade(neon, 0.4), 'bar_glow', emit=(neon, 0.9))
    k.box(x0 - 0.06, r0 - 0.04, 1.0, x1 + 0.06, r1 + 0.1, 1.06, (top, 0.04), 'bar_top')
    k.box(x0 - 0.06, r1 + 0.1, 1.0, x1 + 0.06, r1 + 0.12, 1.06, GOLD, 'bar_edge')
    k.cyl_x(x0 + 0.05, x1 - 0.05, r1 + 0.18, 0.18, 0.02, 0.02, GOLD, 'bar_rail', verts=8)
    for x in (x0 + 0.2, x1 - 0.2):
        k.box(x - 0.015, r1, 0.12, x + 0.015, r1 + 0.18, 0.2, GOLD, 'bar_rail')
    rs = stool_r if stool_r is not None else r1 + 0.5
    for x in stools:
        bar_stool(k, x, rs)
    k.point_light((x0 + x1) / 2, r1 + 0.3, 0.3, '#ff70b0', 6, radius=0.3)
    k.solid(x0 - 0.06, r0 - 0.04, x1 + 0.06, r1 + 0.12)


def bar_stool(k, cx, cr, seat=VELVET, metal=GOLD):
    k.cyl(cx, cr, 0, 0.02, 0.18, (metal, 0.03), 'stool_base', verts=14)
    k.cyl(cx, cr, 0.02, 0.68, 0.025, metal, 'stool_post', verts=8)
    k.cyl(cx, cr, 0.32, 0.34, 0.15, metal, 'stool_ring', verts=14)
    k.cyl(cx, cr, 0.68, 0.76, 0.18, (seat, 0.08), 'stool_seat', verts=14)
    k.box(cx - 0.15, cr - 0.17, 0.76, cx + 0.15, cr - 0.12, 0.98, (seat, 0.08), 'stool_back', bevel=0.02)


def drinks(k, x0, x1, cr, z, n=4):
    """Glasses left on a counter: a martini, a coupe, a tumbler with ice, a bottle in a bucket."""
    for i in range(n):
        x = x0 + (x1 - x0) * (i + 0.5) / n
        kind = i % 4
        if kind == 0:
            k.cyl(x, cr, z, z + 0.08, 0.006, '#d8e8f0', 'glass', verts=5)
            k.cone(x, cr, z + 0.08, z + 0.15, 0.005, 0.05, '#c8e0e8', 'glass', emit=('#80a0b0', 0.3), verts=10)
            k.sphere(x + 0.01, cr, z + 0.13, 0.012, 0.012, '#80c040', 'olive', segs=6)
        elif kind == 1:
            k.cyl(x, cr, z, z + 0.08, 0.006, '#d8e8f0', 'glass', verts=5)
            k.cyl(x, cr, z + 0.08, z + 0.11, 0.045, '#e8a0c8', 'cocktail', emit=('#a05a80', 0.4), verts=10)
        elif kind == 2:
            k.cyl(x, cr, z, z + 0.09, 0.035, '#c8e0e8', 'glass', emit=('#80a0b0', 0.25), verts=8)
            k.cyl(x, cr, z + 0.01, z + 0.06, 0.032, '#c88a3a', 'whisky', verts=8)
        else:
            k.cyl(x, cr, z, z + 0.16, 0.07, (STEEL, 0.03), 'ice_bucket', verts=12)
            k.cyl(x, cr, z + 0.1, z + 0.32, 0.035, '#1a3a24', 'champagne', verts=8)
            k.cyl(x, cr, z + 0.3, z + 0.36, 0.018, GOLD, 'champagne', verts=6)


def kitchen_island(k, x0, x1, r0, r1, top='#ece6dc', stools=(), stool_r=None, pendants=True, H=3.4):
    """A waterfall island in white marble veined grey: the slab running down both ends to the floor, a dark plinth
    lit underneath, a sink with a brass tap, a board of lemons and herbs; glass globes hanging over it."""
    k.box(x0 + 0.06, r0 + 0.04, 0.06, x1 - 0.06, r1 - 0.04, 0.92, (BLACK_L, 0.04), 'island_body')
    k.box(x0, r0, 0.92, x1, r1, 0.98, (top, 0.04), 'island_top')
    for x in (x0, x1 - 0.06):
        k.box(x, r0, 0.0, x + 0.06, r1, 0.98, (top, 0.04), 'island_top')
    vs = []
    for i in range(5):
        xa = k.rng.uniform(x0 + 0.2, x1 - 0.6)
        vs.append(E.strip((xa, r0 + k.rng.uniform(0.05, 0.3)), (xa + k.rng.uniform(0.3, 0.6), r1 - k.rng.uniform(0.05, 0.3)), 0.015))
    E.flats(k, vs, 0.981, '#b8b4ac', 'island_top')
    k.box(x0 + 0.1, r1 - 0.06, 0.0, x1 - 0.1, r1 - 0.03, 0.06, shade(GOLD, 0.5), 'island_glow', emit=(WARM, 0.8))
    sx = x0 + (x1 - x0) * 0.3
    k.box(sx - 0.25, r0 + 0.12, 0.95, sx + 0.25, r0 + 0.42, 0.985, '#2a2c34', 'sink')
    k.cyl(sx, r0 + 0.08, 0.98, 1.3, 0.016, GOLD, 'tap', verts=6)
    k.tube((sx, r0 + 0.08, 1.3), (sx, r0 + 0.26, 1.24), 0.016, GOLD, 'tap', verts=6)
    bx = x0 + (x1 - x0) * 0.7
    k.box(bx - 0.25, (r0 + r1) / 2 - 0.15, 0.98, bx + 0.25, (r0 + r1) / 2 + 0.15, 1.01, (TEAK_L, 0.08), 'board')
    for i in range(4):
        k.sphere(bx - 0.15 + i * 0.08, (r0 + r1) / 2 - 0.04 + (i % 2) * 0.06, 1.05, 0.04, 0.035, '#e8d040', 'lemon', segs=8)
    k.cyl(bx + 0.15, (r0 + r1) / 2 + 0.05, 1.01, 1.08, 0.05, '#e8e4dc', 'herb_pot', verts=8)
    k.sphere(bx + 0.15, (r0 + r1) / 2 + 0.05, 1.13, 0.07, 0.06, ('#4a8a3a', 0.12), 'herbs', segs=8)
    rs = stool_r if stool_r is not None else r1 + 0.42
    for x in stools:
        bar_stool(k, x, rs, seat='#c8b8a0', metal=STEEL_D)
    if pendants:
        for i in range(3):
            x = x0 + (x1 - x0) * (i + 0.5) / 3
            cr = (r0 + r1) / 2
            k.cyl(x, cr, 2.1, H, 0.008, '#2a2a30', 'pendant_cord', verts=4)
            k.sphere(x, cr, 2.0, 0.13, 0.13, '#f0e8d8', 'pendant', emit=(WARM, 1.0), segs=14)
            k.point_light(x, cr, 1.85, WARM, 12, radius=0.12, group='lamp')
    k.solid(x0, r0, x1, r1)


def kitchen_run(k, x0, x1, r_face, H, d=0.62):
    """Kitchen units along the wall: a black fridge column, twin ovens with their clocks glowing, a long counter with
    a hob and a backsplash of bronze glass, open shelves of white china, a slim hood."""
    F = r_face + d
    k.box(x0, r_face, 0, x0 + 0.9, F, H - 0.3, (BLACK_L, 0.04), 'fridge')
    k.box(x0 + 0.44, F, 0.2, x0 + 0.46, F + 0.03, H - 0.5, GOLD, 'fridge_handle')
    k.box(x0 + 0.9, r_face, 0, x0 + 1.6, F, H - 0.3, (BLACK_L, 0.04), 'oven_tower')
    for z in (0.75, 1.4):
        k.box(x0 + 0.96, F, z, x0 + 1.54, F + 0.02, z + 0.55, '#0c0c10', 'oven_door', emit=('#3a1a10', 0.3))
        k.box(x0 + 1.05, F + 0.02, z + 0.45, x0 + 1.25, F + 0.03, z + 0.5, '#101820', 'oven_clock', emit=(Y.CYAN, 0.8))
    cx0 = x0 + 1.6
    k.box(cx0, r_face, 0.06, x1, F, 0.88, (BLACK_L, 0.04), 'kitchen_cabinet')
    fronts = []
    x = cx0 + 0.02
    while x < x1 - 0.1:
        fronts.append((x, F, 0.1, min(x1 - 0.02, x + 0.58), F + 0.015, 0.84))
        x += 0.6
    k.boxes(fronts, ('#262430', 0.04), 'kitchen_front')
    k.box(cx0 - 0.02, r_face, 0.88, x1 + 0.02, F + 0.03, 0.93, ('#e8e4dc', 0.04), 'kitchen_top')
    k.box(cx0, r_face + 0.02, 0.93, x1, r_face + 0.04, 1.55, ('#6a4a2a', 0.03), 'splashback', emit=('#2a1a0a', 0.3))
    hx = (cx0 + x1) / 2
    k.box(hx - 0.35, r_face + 0.15, 0.93, hx + 0.35, r_face + 0.55, 0.935, '#0a0a0c', 'hob')
    for (dx, dr) in ((-0.17, 0.1), (0.17, 0.1), (-0.17, -0.1), (0.17, -0.1)):
        k.cyl(hx + dx, r_face + 0.35 + dr, 0.935, 0.937, 0.08, '#2a1010', 'hob_ring', emit=('#e8402a', 0.35 if dx < 0 and dr > 0 else 0.0), verts=14)
    k.box(hx - 0.4, r_face + 0.04, 2.0, hx + 0.4, r_face + 0.5, 2.15, (STEEL_D, 0.03), 'hood')
    k.box(hx - 0.1, r_face + 0.04, 2.15, hx + 0.1, r_face + 0.2, H - 0.3, (STEEL_D, 0.03), 'hood')
    for z in (1.75, 2.25):
        for (a, b) in ((cx0 + 0.1, hx - 0.55), (hx + 0.55, x1 - 0.1)):
            if b - a < 0.3:
                continue
            k.box(a, r_face + 0.03, z - 0.03, b, r_face + 0.3, z, (TEAK_L, 0.06), 'shelf')
            x = a + 0.12
            while x < b - 0.1:
                k.cyl_y(x, r_face + 0.06, r_face + 0.08, z + 0.12, 0.11, 0.11, '#f0ece4', 'china', verts=12)
                x += 0.26
    k.solid(x0, r_face, x1, F + 0.03)


# ---- living -----------------------------------------------------------------------------------------------------------
def sectional(k, x0, x1, r0, r1, col='#3a3448', depth=0.85, arms=('left', 'right', 'back'), cushions=('#c86a9a', '#5ac8d0', '#e8c040')):
    """A low sectional sofa in a U: deep seats, a low back on three sides, scatter cushions, a throw; a glow under it."""
    c = (col, 0.08)
    front = 'front' in arms                                  # the long run along the camera's side, facing away
    ra, rb = (r1 - depth, r1) if front else (r0, r0 + depth)
    sides = [(x0, ra, x1, rb)]
    if 'left' in arms:
        sides.append((x0, r0, x0 + depth, ra) if front else (x0, rb, x0 + depth, r1))
    if 'right' in arms:
        sides.append((x1 - depth, r0, x1, ra) if front else (x1 - depth, rb, x1, r1))
    for (a, b, c2, d) in sides:
        k.box(a, b, 0.06, c2, d, 0.36, c, 'sofa', bevel=0.03)
        k.box(a + 0.04, b + 0.04, 0.36, c2 - 0.04, d - 0.04, 0.44, (shade(col, 1.12), 0.06), 'sofa_cushion', bevel=0.04)
    if front:
        k.box(x0, r1 - 0.22, 0.36, x1, r1, 0.78, (shade(col, 0.88), 0.08), 'sofa_back', bevel=0.04)
    else:
        k.box(x0, r0, 0.36, x1, r0 + 0.22, 0.78, (shade(col, 0.88), 0.08), 'sofa_back', bevel=0.04)
    if 'left' in arms:
        k.box(x0, r0, 0.36, x0 + 0.22, r1, 0.7, (shade(col, 0.88), 0.08), 'sofa_back', bevel=0.04)
    if 'right' in arms:
        k.box(x1 - 0.22, r0, 0.36, x1, r1, 0.7, (shade(col, 0.88), 0.08), 'sofa_back', bevel=0.04)
    k.box(x0 + 0.05, r1 - 0.04 if not front else r1, 0.0, x1 - 0.05, r1 + (0.03 if front else 0), 0.05, '#0a1a20', 'sofa_glow', emit=(Y.CYAN, 0.7))
    i = 0
    x = x0 + 0.5
    pr = (r1 - 0.36, r1 - 0.2) if front else (r0 + 0.2, r0 + 0.34)
    while x < x1 - 0.5:
        col2 = cushions[i % len(cushions)]
        k.box(x - 0.18, pr[0], 0.44, x + 0.18, pr[1], 0.74, (col2, 0.08), 'sofa_pillow', bevel=0.05)
        x += k.rng.uniform(0.7, 1.1)
        i += 1
    tr = (r0 + 0.15, r0 + 0.85) if front else (r0 + depth + 0.2, r0 + depth + 0.9)
    k.box(x1 - depth + 0.1, tr[0], 0.44, x1 - 0.25, tr[1], 0.47, ('#c8b8a0', 0.12), 'throw', bevel=0.02)
    for (a, b, c2, d) in sides:
        k.solid(a, b, c2, d)


def coffee_table(k, x0, r0, x1, r1, top='#e8e2d8', z=0.36):
    """A low slab of white marble on a black plinth, books and a bowl of glowing stones on it."""
    k.box(x0 + 0.15, r0 + 0.12, 0.0, x1 - 0.15, r1 - 0.12, z - 0.06, (BLACK, 0.04), 'table_base')
    k.box(x0, r0, z - 0.06, x1, r1, z, (top, 0.04), 'table_top')
    E.stack_of_books(k, x0 + 0.35, (r0 + r1) / 2, z, n=3)
    k.cyl(x1 - 0.35, (r0 + r1) / 2, z, z + 0.08, 0.15, '#2a2832', 'bowl', verts=14)
    for i in range(5):
        a = i * 1.3
        k.sphere(x1 - 0.35 + math.cos(a) * 0.07, (r0 + r1) / 2 + math.sin(a) * 0.05, z + 0.09, 0.035, 0.03, (Y.CYAN, Y.PINK, Y.PURP)[i % 3],
                 'glow_stone', emit=((Y.CYAN, Y.PINK, Y.PURP)[i % 3], 0.8), segs=6)
    k.box((x0 + x1) / 2 - 0.12, (r0 + r1) / 2 - 0.08, z, (x0 + x1) / 2 + 0.12, (r0 + r1) / 2 + 0.08, z + 0.015, '#1a1a24', 'tablet', emit=('#3a6a9a', 0.5))
    k.solid(x0, r0, x1, r1)


def arc_lamp(k, bx, br, tx, tr, h=2.0, energy=14.0):
    """An arc floor lamp: a marble block, a steel arc reaching over, a domed shade glowing underneath."""
    k.box(bx - 0.14, br - 0.1, 0, bx + 0.14, br + 0.1, 0.18, ('#e8e2d8', 0.04), 'lamp_base')
    pts = []
    for i in range(9):
        t = i / 8
        x, r = bx + (tx - bx) * t, br + (tr - br) * t
        pts.append((x, r, 0.18 + (h - 0.18) * math.sin(t * math.pi * 0.62) / math.sin(math.pi * 0.62) - 0.2 * t * t))
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.016, STEEL, 'lamp_arc', verts=6)
    ex, er, ez = pts[-1]
    k.sphere(ex, er, ez - 0.05, 0.2, 0.12, (STEEL, 0.03), 'lamp_dome', segs=14)
    k.cyl(ex, er, ez - 0.17, ez - 0.15, 0.17, '#fff0d0', 'lamp_glow', emit=(WARM, 1.2), verts=14)
    k.point_light(ex, er, ez - 0.3, WARM, energy, radius=0.15, group='lamp')
    k.solid(bx - 0.14, br - 0.1, bx + 0.14, br + 0.1)


def neon_art(k, x0, x1, r_face, z0, z1, cols=(Y.PINK, Y.CYAN, '#e8c040')):
    """A big canvas, black on black, with a neon line wandering across it — signed."""
    k.box(x0 - 0.05, r_face, z0 - 0.05, x1 + 0.05, r_face + 0.06, z1 + 0.05, (GOLD, 0.03), 'art_frame')
    k.box(x0, r_face + 0.06, z0, x1, r_face + 0.07, z1, ('#100e14', 0.06), 'art_canvas')
    for j, col in enumerate(cols):
        pts = []
        for i in range(9):
            t = i / 8
            pts.append((x0 + 0.12 + (x1 - x0 - 0.24) * t, z0 + 0.15 + (z1 - z0 - 0.3) * (0.5 + 0.4 * math.sin(t * 5.0 + j * 2.1) * (0.6 + 0.4 * math.cos(t * 3 + j)))))
        for p, q in zip(pts, pts[1:]):
            k.tube((p[0], r_face + 0.08, p[1]), (q[0], r_face + 0.08, q[1]), 0.016, shade(col, 0.6), 'art_neon', emit=(col, 1.0), verts=5)
    k.point_light((x0 + x1) / 2, r_face + 0.5, (z0 + z1) / 2, '#e090d0', 8, radius=0.3)


def sculpture(k, cx, cr, h=1.5):
    """A chrome figure on a black plinth: a twisted ribbon of steel catching the neon."""
    k.box(cx - 0.25, cr - 0.25, 0, cx + 0.25, cr + 0.25, 0.7, (BLACK_L, 0.04), 'plinth')
    k.box(cx - 0.26, cr - 0.26, 0.7, cx + 0.26, cr + 0.26, 0.74, GOLD, 'plinth_trim')
    pts = []
    for i in range(14):
        t = i / 13
        a = t * math.pi * 2.2
        pts.append((cx + math.cos(a) * 0.14 * (1 - t * 0.4), cr + math.sin(a) * 0.08, 0.74 + t * h * 0.55))
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.05, ('#c8ccd8', 0.02), 'sculpture', verts=8)
    k.sphere(pts[-1][0], pts[-1][1], pts[-1][2] + 0.06, 0.08, 0.08, ('#d8dce8', 0.02), 'sculpture', segs=12)
    k.solid(cx - 0.26, cr - 0.26, cx + 0.26, cr + 0.26)


def platform_bed(k, x0, x1, r0, r1, sheet='#e8e4f0', throw='#5a3a8a', head=VELVET):
    """A low bed on a plinth that seems to float (a strip of light under it), a tall padded headboard in channels of
    velvet, rumpled white sheets, a fur throw, too many pillows."""
    k.box(x0 + 0.15, r0 + 0.2, 0.0, x1 - 0.15, r1 - 0.15, 0.2, (BLACK, 0.04), 'bed_plinth')
    k.box(x0 + 0.18, r1 - 0.17, 0.0, x1 - 0.18, r1 - 0.14, 0.05, '#20081a', 'bed_glow', emit=(Y.PINK, 0.8))
    k.box(x0, r0, 0.2, x1, r1, 0.45, ('#2a2638', 0.06), 'bed_base', bevel=0.03)
    k.box(x0 + 0.04, r0 + 0.05, 0.45, x1 - 0.04, r1 - 0.04, 0.62, (sheet, 0.08), 'bed_sheet', bevel=0.05)
    k.box(x0 - 0.3, r0 - 0.1, 0.0, x1 + 0.3, r0 + 0.05, 1.45, (head, 0.06), 'headboard')
    ch = []
    x = x0 - 0.25
    while x < x1 + 0.25:
        ch.append((x, r0 + 0.05, 0.25, x + 0.12, r0 + 0.09, 1.4))
        x += 0.17
    k.boxes(ch, (shade(head, 1.2), 0.06), 'headboard_channel')
    k.box(x0 + 0.04, r0 + 1.1, 0.62, x1 - 0.04, r1 - 0.04, 0.68, (throw, 0.16), 'bed_throw', bevel=0.04)
    k.box(x0 + 0.04, r1 - 0.06, 0.4, x1 - 0.04, r1 - 0.02, 0.68, (throw, 0.16), 'bed_throw')
    pw = (x1 - x0 - 0.2) / 3
    for i in range(3):
        xa = x0 + 0.1 + i * pw
        k.box(xa + 0.02, r0 + 0.12, 0.62, xa + pw - 0.02, r0 + 0.45, 0.82, ('#f4f0f8', 0.05), 'pillow', bevel=0.06)
    for i, col in enumerate((Y.PINK, '#3a3448', Y.CYAN)):
        xa = x0 + 0.3 + i * (x1 - x0 - 0.6) / 3
        k.box(xa, r0 + 0.42, 0.62, xa + 0.3, r0 + 0.6, 0.82, (shade(col, 0.7), 0.08), 'cushion', bevel=0.05)
    for s, x in ((-1, x0 - 0.45), (1, x1 + 0.45)):              # floating night tables with a lamp each
        k.box(x - 0.25, r0 + 0.1, 0.3, x + 0.25, r0 + 0.5, 0.55, (BLACK_L, 0.04), 'night_table')
        k.box(x - 0.24, r0 + 0.48, 0.28, x + 0.24, r0 + 0.5, 0.3, shade(Y.PURP, 0.4), 'night_glow', emit=(Y.PURP, 0.7))
        k.cyl(x, r0 + 0.3, 0.55, 0.58, 0.07, GOLD, 'lamp_base', verts=10)
        k.cyl(x, r0 + 0.3, 0.58, 0.78, 0.01, GOLD, 'lamp_stem', verts=5)
        k.sphere(x, r0 + 0.3, 0.86, 0.09, 0.09, '#fff0d8', 'lamp_globe', emit=(WARM, 1.0), segs=12)
        k.point_light(x, r0 + 0.5, 0.95, WARM, 6, radius=0.08, group='lamp')
    k.solid(x0 - 0.7, r0 - 0.1, x1 + 0.7, r1)


def egg_tub(k, cx, cr, rad=0.55, water='#5ab8d0'):
    """A freestanding bath carved from a single stone: an egg, white, full to the brim, a floor-standing brass tap,
    a candle and a glass of champagne on its rim."""
    rings = []
    for (z, f) in ((0.0, 0.7), (0.12, 0.88), (0.3, 0.98), (0.5, 1.0), (0.58, 0.98)):
        rings.append([(cx + math.cos(2 * math.pi * i / 24) * rad * f, cr + math.sin(2 * math.pi * i / 24) * rad * 0.62 * f, z) for i in range(24)])
    k.loft(rings, ('#ece8e4', 0.03), 'tub', closed=True)
    import assets_casino as CA
    outer = [(cx + math.cos(2 * math.pi * i / 24) * rad * 0.98, cr + math.sin(2 * math.pi * i / 24) * rad * 0.62 * 0.98) for i in range(24)]
    inner = [(cx + math.cos(2 * math.pi * i / 24) * (rad - 0.07), cr + math.sin(2 * math.pi * i / 24) * (rad * 0.62 - 0.07)) for i in range(24)]
    CA.rim(k, outer, inner, 0.56, 0.6, ('#f4f0ec', 0.03), 'tub_rim')
    CA.prism(k, inner, 0.5, 0.52, (water, 0.02), 'tub_water', emit=('#2a6a7a', 0.4))
    k.cyl(cx - rad - 0.15, cr - 0.1, 0, 0.95, 0.02, GOLD, 'tub_tap', verts=6)
    k.tube((cx - rad - 0.15, cr - 0.1, 0.95), (cx - rad + 0.12, cr - 0.1, 0.85), 0.02, GOLD, 'tub_tap', verts=6)
    k.cyl(cx + rad * 0.5, cr - rad * 0.45, 0.6, 0.68, 0.025, '#f0e8d8', 'candle', verts=6)
    k.sphere(cx + rad * 0.5, cr - rad * 0.45, 0.7, 0.014, 0.025, '#fff0b0', 'flame', emit=('#fff0b0', 4.0), segs=6)
    k.cyl(cx + rad * 0.7, cr - rad * 0.2, 0.6, 0.66, 0.005, '#d8e8f0', 'glass', verts=5)
    k.cyl(cx + rad * 0.7, cr - rad * 0.2, 0.66, 0.72, 0.022, '#e8d890', 'glass', emit=('#a09040', 0.3), verts=8)
    k.solid(cx - rad - 0.2, cr - rad * 0.65, cx + rad, cr + rad * 0.65)


def dining_set(k, x0, x1, cr, d=1.0, top='#e8e2d8', chair=VELVET, n=3):
    """A slab of white marble on two black pedestals, velvet tub chairs round it, candles in glass, orchids in a
    low bowl, black place mats with the glasses waiting."""
    r0, r1 = cr - d / 2, cr + d / 2
    for x in (x0 + 0.5, x1 - 0.5):
        k.box(x - 0.15, cr - 0.25, 0, x + 0.15, cr + 0.25, 0.7, (BLACK, 0.04), 'table_base')
    k.box(x0, r0, 0.7, x1, r1, 0.76, (top, 0.04), 'table_top')
    for i in range(n):
        x = x0 + (x1 - x0) * (i + 0.5) / n
        for (r, rr, s) in ((r0 - 0.42, r0 + 0.2, 1), (r1 + 0.42, r1 - 0.2, -1)):
            k.cyl(x, r, 0, 0.42, 0.24, (chair, 0.08), 'tub_chair', verts=16)
            k.cyl(x, r, 0.42, 0.48, 0.21, (shade(chair, 1.15), 0.06), 'tub_chair', verts=16)
            back = [(x + math.cos(a) * 0.26, r + math.sin(a) * 0.24 * -s) for a in [math.pi * j / 10 for j in range(11)]]
            back_i = [(x + math.cos(a) * 0.18, r + math.sin(a) * 0.16 * -s) for a in [math.pi * j / 10 for j in range(11)]]
            import assets_casino as CA
            CA.rim(k, back, back_i, 0.42, 0.82, (shade(chair, 0.9), 0.08), 'tub_chair', closed=False)
            k.box(x - 0.18, rr - 0.12, 0.76, x + 0.18, rr + 0.12, 0.765, '#16141a', 'place_mat')
            k.cyl(x, rr, 0.765, 0.775, 0.1, '#f0ece4', 'plate', verts=14)
            k.cyl(x + 0.16, rr - s * 0.1, 0.765, 0.9, 0.025, '#d8e8f0', 'glass', emit=('#80a0b0', 0.3), verts=8)
    cx = (x0 + x1) / 2
    k.cyl(cx, cr, 0.76, 0.84, 0.2, '#1a1820', 'bowl', ry=0.12, verts=16)
    for i in range(7):
        a = i * 0.9
        k.tube((cx + math.cos(a) * 0.05, cr, 0.84), (cx + math.cos(a) * 0.18, cr + math.sin(a) * 0.08, 1.1 + 0.05 * (i % 3)), 0.006, '#3a5a2a', 'orchid', verts=4)
        k.sphere(cx + math.cos(a) * 0.18, cr + math.sin(a) * 0.08, 1.1 + 0.05 * (i % 3), 0.04, 0.03, ('#f4e8f4', '#e8a8d8')[i % 2], 'orchid', segs=6)
    for x in (cx - 0.7, cx + 0.7):
        k.cyl(x, cr, 0.76, 0.92, 0.04, '#d8e8f0', 'candle_glass', emit=('#a08060', 0.4), verts=10)
        k.sphere(x, cr, 0.88, 0.012, 0.022, '#fff0b0', 'flame', emit=('#fff0b0', 4.0), segs=6)
        k.point_light(x, cr + 0.1, 1.05, WARM, 2.0, radius=0.05, group='flicker')
    k.solid(x0, r0 - 0.66, x1, r1 + 0.66)


def robot_vacuum(k, cx, cr):
    """A robot vacuum about its rounds, a blue light on its back."""
    k.cyl(cx, cr, 0.0, 0.07, 0.17, ('#2a2a32', 0.04), 'robot', verts=18)
    k.cyl(cx, cr, 0.07, 0.08, 0.12, '#1a1a20', 'robot', verts=16)
    k.cyl(cx, cr - 0.05, 0.08, 0.085, 0.025, '#103040', 'robot_led', emit=(Y.CYAN, 1.0), verts=8)


def vanity(k, x0, x1, r_face, d=0.5, mz=1.55, mr=0.3):
    """A floating vanity of black stone with twin basins, brass taps, two round mirrors lit from behind."""
    F = r_face + d
    k.box(x0, r_face, 0.55, x1, F, 0.85, (BLACK_L, 0.04), 'vanity')
    k.box(x0 - 0.02, r_face, 0.85, x1 + 0.02, F + 0.02, 0.9, ('#e8e2d8', 0.04), 'vanity_top')
    k.box(x0 + 0.05, F - 0.02, 0.52, x1 - 0.05, F, 0.55, shade(WARM, 0.5), 'vanity_glow', emit=(WARM, 0.8))
    for f in (0.28, 0.72):
        x = x0 + (x1 - x0) * f
        k.cyl(x, r_face + 0.26, 0.9, 0.98, 0.17, '#f4f0ec', 'basin', verts=16)
        k.cyl(x, r_face + 0.26, 0.96, 0.981, 0.13, '#c8d8e0', 'basin_inside', verts=16)
        k.cyl(x, r_face + 0.06, 0.9, 1.15, 0.014, GOLD, 'tap', verts=6)
        k.tube((x, r_face + 0.06, 1.15), (x, r_face + 0.16, 1.12), 0.014, GOLD, 'tap', verts=6)
        k.cyl_y(x, r_face + 0.02, r_face + 0.05, mz, mr, mr, '#2a1a0c', 'mirror_halo', emit=(WARM, 0.9), verts=24)
        k.cyl_y(x, r_face + 0.05, r_face + 0.06, mz, mr - 0.04, mr - 0.04, ('#6a7480', 0.03), 'mirror_glass', emit=('#2a3038', 0.35), verts=24)
    k.box(x0 + 0.1, F - 0.25, 0.9, x0 + 0.3, F - 0.1, 0.96, '#f0e8f0', 'towel')
    k.cyl(x1 - 0.18, F - 0.18, 0.9, 1.0, 0.03, '#c86a9a', 'perfume', emit=('#6a2a4a', 0.4), verts=8)
    k.point_light((x0 + x1) / 2, F + 0.3, 1.6, WARM, 8, radius=0.2, group='lamp')
    k.solid(x0, r_face, x1, F)


def rain_shower(k, x0, r0, x1, r1, H):
    """A walk-in shower: a black frame, a glass edge glinting, a rain head, slate on the floor, a niche of bottles."""
    k.box(x0, r0, 0, x1, r1, 0.03, ('#2a2a32', 0.06), 'shower_floor')
    lines = []
    for i in range(1, 6):
        r = r0 + (r1 - r0) * i / 6
        lines.append(E.rect(x0 + 0.05, r - 0.006, x1 - 0.05, r + 0.006))
    E.flats(k, lines, 0.031, '#1a1a20', 'shower_floor')
    for (xa, ra, xb, rb) in ((x0, r1 - 0.03, x1 - 0.6, r1), (x1 - 0.03, r0, x1, r1)):
        k.box(xa, ra, 0.03, xb, rb, H - 0.5, ('#9ac8d8', 0.02), 'shower_glass', emit=('#4a7a8a', 0.25))
    k.box(x0, r1 - 0.05, H - 0.55, x1, r1 + 0.02, H - 0.5, (BLACK, 0.04), 'shower_frame')
    k.box(x1 - 0.05, r0, 0.03, x1 + 0.02, r1, H - 0.5, (BLACK, 0.04), 'shower_frame')
    hx, hr = (x0 + x1) / 2, (r0 + r1) / 2
    k.cyl(hx, r0 + 0.05, H - 0.6, H - 0.55, 0.02, GOLD, 'shower_arm', verts=6)
    k.tube((hx, r0 + 0.05, H - 0.6), (hx, hr, H - 0.6), 0.016, GOLD, 'shower_arm', verts=6)
    k.cyl(hx, hr, H - 0.65, H - 0.6, 0.18, GOLD, 'shower_head', verts=16)
    for i in range(3):
        k.cyl(x0 + 0.2 + i * 0.1, r0 + 0.1, 1.0, 1.0 + 0.12 + 0.03 * i, 0.03, ('#e8e0d8', '#c8a0b0', '#a0c0c8')[i], 'bottle', verts=8)
    k.solid(x0, r0, x1, r1)


# ---- out on the deck --------------------------------------------------------------------------------------------------
def plunge_pool(k, x0, r0, x1, r1, coping='#d8d2c8', infinity='right'):
    """A plunge pool sunk into the deck: pale stone coping, the water glowing cyan from lights set in its walls (their
    pools of light, the tile grid and caustics seen through the surface), steps down at one end, an infinity edge
    where the water spills over toward the city. Returns the water's rect for the shimmer js/estate.js draws."""
    c = 0.18
    sides = {'top': (x0 - c, r0 - c, x1 + c, r0), 'bottom': (x0 - c, r1, x1 + c, r1 + c), 'left': (x0 - c, r0, x0, r1), 'right': (x1, r0, x1 + c, r1)}
    for name, (a, b, cc, d) in sides.items():
        if name == infinity:
            k.box(a, b, -0.12, cc, d, -0.02, ('#2a3a40', 0.04), 'pool_weir')
            continue
        k.box(a, b, -0.02, cc, d, 0.05, (coping, 0.06), 'pool_coping', bevel=0.01)
    k.box(x0, r0, -0.2, x1, r1, -0.06, (POOL_D, 0.03), 'pool_water', emit=(POOL_D, 0.6))
    k.box(x0, r0 - 0.005, -0.06, x1, r0 + 0.005, 0.0, '#e8f0f0', 'pool_tile')
    W, D = x1 - x0, r1 - r0
    grid = []
    for i in range(1, int(W / 0.4)):
        x = x0 + i * 0.4
        grid.append(E.rect(x - 0.008, r0 + 0.02, x + 0.008, r1 - 0.02))
    for j in range(1, int(D / 0.4)):
        r = r0 + j * 0.4
        grid.append(E.rect(x0 + 0.02, r - 0.008, x1 - 0.02, r + 0.008))
    E.flats(k, grid, -0.059, POOL, 'pool_water', emit=(POOL, 0.55))
    spots = []
    for i in range(3):                                         # the underwater lights' pools of light
        x = x0 + W * (i + 0.5) / 3
        spots.append(E.ell(x, r0 + 0.35, 0.35, 0.22, 14))
    E.flats(k, spots, -0.058, POOL_L, 'pool_light', emit=(POOL_L, 0.7))
    caus = []
    for _ in range(int(W * D * 6)):
        x, r = k.rng.uniform(x0 + 0.1, x1 - 0.1), k.rng.uniform(r0 + 0.1, r1 - 0.1)
        a = k.rng.uniform(0, math.pi)
        caus.append(E.strip((x, r), (x + math.cos(a) * 0.14, r + math.sin(a) * 0.08), 0.02))
    E.flats(k, caus, -0.057, '#a8f4ff', 'pool_light', emit=('#a8f4ff', 0.55))
    steps = []
    sx = x0 if infinity != 'left' else x1 - 0.9
    for i in range(3):
        steps.append(E.rect(sx + 0.05, r1 - 0.15 - i * 0.22, sx + 0.85, r1 - 0.05 - i * 0.22))
    E.flats(k, steps, -0.056, '#d8f8ff', 'pool_step', emit=('#80d0e0', 0.5))
    k.point_light((x0 + x1) / 2, (r0 + r1) / 2, 0.4, '#60e0f0', 40 * W * D / 10, radius=1.0)
    k.solid(x0 - c, r0 - c, x1 + c, r1 + c)
    return [round(x0, 3), round(r0 + 0.06 * C45, 3), round(x1, 3), round(r1 + 0.06 * C45, 3)]


def lounger(k, cx, r0, length=1.85, frame='#e8e4dc', cushion='#f0ece4', towel=Y.PINK, drink=True):
    """A sun lounger lying along the rows, its back raised at the far end: a pale frame, a thick cushion, a rolled
    towel; a little table beside it with a drink."""
    r1 = r0 + length
    for (dx, r) in ((-0.28, r0 + 0.1), (0.28, r0 + 0.1), (-0.28, r1 - 0.1), (0.28, r1 - 0.1)):
        k.box(cx + dx - 0.03, r - 0.03, 0, cx + dx + 0.03, r + 0.03, 0.26, (frame, 0.04), 'lounger_leg')
    k.box(cx - 0.32, r0 + 0.55, 0.22, cx + 0.32, r1, 0.3, (frame, 0.04), 'lounger')
    k.box(cx - 0.29, r0 + 0.58, 0.3, cx + 0.29, r1 - 0.03, 0.38, (cushion, 0.05), 'lounger_cushion', bevel=0.03)
    k.loft([[(cx - 0.32, r0 + 0.6, 0.3), (cx + 0.32, r0 + 0.6, 0.3)], [(cx - 0.32, r0 + 0.05, 0.85), (cx + 0.32, r0 + 0.05, 0.85)]],
           (frame, 0.04), 'lounger_back')
    k.loft([[(cx - 0.29, r0 + 0.63, 0.36), (cx + 0.29, r0 + 0.63, 0.36)], [(cx - 0.29, r0 + 0.1, 0.86), (cx + 0.29, r0 + 0.1, 0.86)]],
           (cushion, 0.05), 'lounger_cushion')
    k.cyl_x(cx - 0.25, cx + 0.25, r0 + 0.22, 0.8, 0.07, 0.06, (towel, 0.06), 'towel', verts=10)
    k.box(cx - 0.29, r0 + 1.2, 0.38, cx + 0.29, r0 + 1.5, 0.41, (towel, 0.08), 'towel')
    if drink:
        tx = cx + 0.55
        k.cyl(tx, r0 + 0.7, 0, 0.42, 0.03, (frame, 0.04), 'side_table', verts=8)
        k.cyl(tx, r0 + 0.7, 0.42, 0.45, 0.17, (TEAK_L, 0.06), 'side_table', verts=14)
        k.cyl(tx, r0 + 0.68, 0.45, 0.6, 0.035, '#d8e8f0', 'glass', emit=('#80a0b0', 0.3), verts=8)
        k.cyl(tx, r0 + 0.68, 0.46, 0.56, 0.032, '#e86a3a', 'cocktail', emit=('#a04020', 0.4), verts=8)
        k.cyl(tx + 0.02, r0 + 0.66, 0.56, 0.7, 0.005, '#f0e0a0', 'straw', verts=4)
        k.box(tx - 0.08, r0 + 0.76, 0.45, tx + 0.05, r0 + 0.84, 0.46, '#2a2a30', 'phone', emit=('#3a5a8a', 0.4))
    k.solid(cx - 0.34, r0, cx + 0.34, r1)


def fire_pit(k, cx, cr, rad=0.55, seat_rad=1.55, arc=(200, 340), cushion='#d8c8b0', energy=90.0):
    """A sunken fire pit: a round bowl of dark stone heaped with fire-glass, the flames standing out of it, a curved
    built-in bench round the far side of it, deep cushions and throws, lanterns."""
    k.cyl(cx, cr, 0, 0.38, rad, ('#3a3a40', 0.06), 'fire_bowl', verts=24)
    k.cyl(cx, cr, 0.38, 0.42, rad + 0.04, ('#4a4a52', 0.05), 'fire_bowl', verts=24)
    k.cyl(cx, cr, 0.36, 0.4, rad - 0.08, '#141218', 'fire_bed', verts=24)
    glass = []
    for i in range(40):
        a = i * 2.39996
        rr = (rad - 0.12) * math.sqrt((i + 0.5) / 40)
        glass.append((cx + math.cos(a) * rr - 0.025, cr + math.sin(a) * rr * 0.9 - 0.02, 0.4, cx + math.cos(a) * rr + 0.025, cr + math.sin(a) * rr * 0.9 + 0.02, 0.43))
    k.boxes(glass, '#3a9ab0', 'fire_glass', emit=('#2a6a7a', 0.5))
    for (dx, dr, h, w, col, e) in ((0.0, 0.0, 0.62, 0.22, '#ffb050', 3.0), (-0.18, 0.05, 0.44, 0.13, '#fff0b0', 4.0), (0.17, -0.04, 0.48, 0.12, '#fff0b0', 4.0),
                                   (-0.05, -0.1, 0.36, 0.1, '#fff8e0', 5.0), (0.1, 0.12, 0.38, 0.1, '#ffd070', 4.0)):
        k.cone(cx + dx, cr + dr, 0.42, 0.42 + h, w, 0.01, col, 'fire', emit=(col, e), verts=10)
    k.point_light(cx, cr + 0.2, 1.0, '#ff9a48', energy, radius=0.3, group='flicker')
    a0, a1 = math.radians(arc[0]), math.radians(arc[1])
    n = 16
    outer = [(cx + math.cos(a0 + (a1 - a0) * i / n) * seat_rad, cr + math.sin(a0 + (a1 - a0) * i / n) * seat_rad * 0.85) for i in range(n + 1)]
    inner = [(cx + math.cos(a0 + (a1 - a0) * i / n) * (seat_rad - 0.6), cr + math.sin(a0 + (a1 - a0) * i / n) * (seat_rad - 0.6) * 0.85) for i in range(n + 1)]
    import assets_casino as CA
    CA.rim(k, outer, inner, 0.0, 0.36, ('#4a4650', 0.05), 'fire_bench', closed=False)
    CA.rim(k, outer, inner, 0.36, 0.46, (cushion, 0.06), 'fire_cushion', closed=False)
    back_o = [(cx + math.cos(a0 + (a1 - a0) * i / n) * (seat_rad + 0.02), cr + math.sin(a0 + (a1 - a0) * i / n) * (seat_rad + 0.02) * 0.85) for i in range(n + 1)]
    back_i = [(cx + math.cos(a0 + (a1 - a0) * i / n) * (seat_rad - 0.2), cr + math.sin(a0 + (a1 - a0) * i / n) * (seat_rad - 0.2) * 0.85) for i in range(n + 1)]
    CA.rim(k, back_o, back_i, 0.36, 0.8, (shade(cushion, 0.9), 0.06), 'fire_cushion', closed=False)
    for i, col in enumerate(('#c86a3a', '#3a3448', '#e8c040', '#c86a3a', '#5a7a9a')):
        t = (i + 0.5) / 5
        a = a0 + (a1 - a0) * t
        x, r = cx + math.cos(a) * (seat_rad - 0.28), cr + math.sin(a) * (seat_rad - 0.28) * 0.85
        k.box(x - 0.17, r - 0.08, 0.46, x + 0.17, r + 0.08, 0.76, (col, 0.08), 'fire_pillow', bevel=0.05)
    for a in (a0 - 0.12, a1 + 0.12):
        x, r = cx + math.cos(a) * (seat_rad - 0.2), cr + math.sin(a) * (seat_rad - 0.2) * 0.85
        E.hurricane_lamp(k, x, r, 0.0, energy=3.0, s=1.6)
    k.solid(cx - rad, cr - rad, cx + rad, cr + rad)
    for (x, r) in outer[::2] + inner[::2]:
        k.solid(x - 0.2, r - 0.2, x + 0.2, r + 0.2)


def planter(k, x0, r0, x1, r1, kind='grass', box='#2a2826', rim='#3a3632', h=0.5):
    """A long planter of dark steel, its rim catching the light; ornamental grasses tossing (kind 'grass'), clipped
    box balls ('box') or an olive tree ('olive', one, in the middle)."""
    k.box(x0, r0, 0, x1, r1, h, (box, 0.05), 'planter')
    k.box(x0 - 0.02, r0 - 0.02, h, x1 + 0.02, r1 + 0.02, h + 0.04, (rim, 0.04), 'planter_rim')
    k.box(x0 + 0.04, r0 + 0.04, h - 0.04, x1 - 0.04, r1 - 0.04, h + 0.01, '#2a1e16', 'soil')
    if kind == 'grass':
        blades = []
        for _ in range(int((x1 - x0) * (r1 - r0) * 220)):
            x, r = k.rng.uniform(x0 + 0.06, x1 - 0.06), k.rng.uniform(r0 + 0.06, r1 - 0.06)
            ht = k.rng.uniform(0.35, 0.75)
            blades.append((x, r, h, ht, 0.012, k.rng.uniform(-0.18, 0.18), k.rng.uniform(-0.12, 0.08)))
        g = len(blades) // 3
        k.blades(blades[:g], ('#6a8a4a', 0.0), 'grass_tall')
        k.blades(blades[g:2 * g], ('#8aa05a', 0.0), 'grass_tall')
        k.blades(blades[2 * g:], ('#b8b070', 0.0), 'grass_tall')
        for _ in range(int((x1 - x0) * 3)):
            x, r = k.rng.uniform(x0 + 0.1, x1 - 0.1), k.rng.uniform(r0 + 0.1, r1 - 0.1)
            k.sphere(x, r, h + 0.75, 0.03, 0.08, '#e8d8a8', 'grass_plume', segs=6)
    elif kind == 'box':
        x = x0 + 0.3
        while x < x1 - 0.2:
            k.sphere(x, (r0 + r1) / 2, h + 0.22, 0.24, 0.22, ('#3a5a32', 0.16), 'topiary', segs=10)
            x += 0.55
    elif kind == 'olive':
        cx, cr = (x0 + x1) / 2, (r0 + r1) / 2
        k.tube((cx, cr, h), (cx + 0.08, cr, h + 0.7), 0.06, ('#5a4a3a', 0.12), 'olive_trunk', verts=8)
        k.tube((cx + 0.08, cr, h + 0.7), (cx - 0.1, cr - 0.05, h + 1.3), 0.045, ('#5a4a3a', 0.12), 'olive_trunk', verts=8)
        k.tube((cx + 0.08, cr, h + 0.7), (cx + 0.35, cr + 0.05, h + 1.2), 0.04, ('#5a4a3a', 0.12), 'olive_trunk', verts=8)
        for i in range(26):
            a = i * 2.39996
            rr = 0.55 * math.sqrt((i + 0.5) / 26)
            k.sphere(cx + math.cos(a) * rr, cr + math.sin(a) * rr * 0.7, h + 1.35 + 0.25 * math.cos(rr * 2.5) + (i % 3) * 0.05, 0.16, 0.12,
                     (('#7a8a6a', '#8a9a7a', '#6a7a5a')[i % 3], 0.14), 'olive_leaves', segs=8)
    k.solid(x0, r0, x1, r1)


def festoon(k, a, b, sag=0.35, n=10, bulb=WARM, light_every=3, energy=3.0):
    """A string of festoon lights from a to b ((x, r, z) each), sagging: the cable, bulbs hanging on short drops."""
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)))
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.007, '#4a4450', 'festoon_cable', verts=4, smooth=False)
    for i, p in enumerate(pts[1:-1], 1):
        k.cyl(p[0], p[1], p[2] - 0.06, p[2], 0.008, '#4a4450', 'festoon_cable', verts=4)
        k.sphere(p[0], p[1], p[2] - 0.11, 0.055, 0.065, '#fff0d0', 'festoon_bulb', emit=(bulb, 1.6), segs=8)
        if i % light_every == 0:
            k.point_light(p[0], p[1], p[2] - 0.2, bulb, energy, radius=0.08, group='lamp')
    return [(round(p[0], 3), round(p[1] - (p[2] - 0.1) * C45, 3)) for p in pts[1:-1]]


def light_post(k, x, r, h=2.9, col=STEEL_D):
    """A slim black post at the deck's edge to hang the festoons from, a small uplight at its foot."""
    k.box(x - 0.04, r - 0.04, 0, x + 0.04, r + 0.04, h, (col, 0.04), 'light_post')
    k.box(x - 0.08, r - 0.08, 0, x + 0.08, r + 0.08, 0.06, (col, 0.04), 'light_post')
    k.solid_post(x, r)
    return (x, r, h - 0.05)


def outdoor_bar(k, x0, x1, r0, r1):
    """A teak-clad drinks counter by the pool: a concrete top, an ice well, bottles in a row, a stack of towels."""
    k.box(x0, r0, 0, x1, r1, 1.0, ('#5a5654', 0.06), 'outdoor_bar')
    sl = []
    x = x0 + 0.02
    while x < x1 - 0.05:
        sl.append((x, r1, 0.05, x + 0.07, r1 + 0.02, 0.96))
        x += 0.1
    k.boxes(sl, (TEAK, 0.07), 'outdoor_bar_slats')
    k.box(x0 - 0.04, r0 - 0.04, 1.0, x1 + 0.04, r1 + 0.06, 1.06, ('#8a8680', 0.05), 'outdoor_bar_top')
    k.box(x0 + 0.2, r0 + 0.1, 1.04, x0 + 0.7, r1 - 0.1, 1.061, '#c8e8f0', 'ice', emit=('#6a9aa8', 0.3))
    for i in range(4):
        k.cyl(x0 + 0.3 + i * 0.12, (r0 + r1) / 2, 1.0, 1.28, 0.03, ('#1a3a24', '#c8a040', '#e8e0d8', '#6a1a2a')[i], 'bottle', verts=8)
    drinks(k, x1 - 0.9, x1 - 0.2, (r0 + r1) / 2 + 0.05, 1.06, n=3)
    k.box(x1 + 0.1, r0, 0, x1 + 0.5, r0 + 0.4, 0.5, (TEAK, 0.07), 'towel_stand')
    for i in range(4):
        k.box(x1 + 0.12, r0 + 0.02, 0.5 + i * 0.07, x1 + 0.48, r0 + 0.38, 0.56 + i * 0.07, (('#f0ece4', Y.PINK, '#f0ece4', Y.CYAN)[i], 0.08), 'towel', bevel=0.02)
    k.solid(x0 - 0.04, r0 - 0.04, x1 + 0.5, r1 + 0.06)


def tower_face(k, x0, x1, r, depth=6.0, cols=('#ffd890', '#a0e0f0', '#f0a0d0'), rng=None):
    """The tower falling away under the roof's front edge: dark cladding, floor after floor of lit windows."""
    rng = rng or k.rng
    k.box(x0, r - 0.4, -depth, x1, r, -0.04, ('#16121e', 0.06), 'tower_top')
    k.box(x0, r, -depth, x1, r + 0.02, -0.04, ('#1c1826', 0.05), 'tower_face')
    for col in cols:
        rects = []
        for i in range(int((x1 - x0) / 0.5)):
            for j in range(6):
                if rng.random() < 0.18:
                    x = x0 + 0.15 + i * 0.5
                    rects.append((x, r + 0.02, -0.55 - j * 0.9, x + 0.3, r + 0.03, -0.25 - j * 0.9))
        if rects:
            k.boxes(rects, shade(col, 0.5), 'tower_window', emit=(col, 0.7))
    k.box(x0, r + 0.02, -0.12, x1, r + 0.04, -0.08, shade(Y.CYAN, 0.4), 'tower_neon', emit=(Y.CYAN, 0.9))
