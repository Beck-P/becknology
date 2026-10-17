"""The Verdance countryside kit (workstream G, Oct 2026): what the new places beyond Brambleford are built from.

Station Road (Brambleford's east end), the Downs, the market town on the river, the hill village and its vineyard, the
mill hamlet. Every function takes a Kit; tile units (x, row, z) like every kit; the scene's sun does the lighting.
The houses come from the richer house kit (assets_house.py) — this adds the land and the countryside's own things:

  river_*        a river sunk into the land: a channel for a heightfield, its still water, reeds and stones on its banks
  rail_track     ballast, sleepers and two rails; girder_bridge carries it over water
  platform       a station platform with its edge stones; canopy over it on iron columns with a fretted valance
  arch_bridge    a humped stone road bridge over a river (whole, or broken with its middle span fallen in)
  boards_over    planks nailed over a window or door (a shut-up shop); to_let a board on a post
  bistro         a café table and two chairs; a_board a chalkboard on the pavement; string_lights
  churn, cheese_wheels, cheese_rack   the dairy's things
  stable_doors   a stable's half doors; trough; hay_rack; paddock (split rails round a yard)
  stand          a farm stand: a roofed table of produce with an honesty box
  vines          rows of grapevines on wires, staked, bunches hanging
  stakes         a building plot marked out with pegs and string
"""
import math

from scenekit import S, shade
import assets_farm as F
import assets_isle as I
import assets_town as W
import assets_village as V
from assets_lumar import barrel  # noqa: F401  (re-exported for scenes)

IRON = '#2e2c30'
RUST = '#7a4a30'
WOOD = '#8a6438'
WOOD_D = '#5a3e22'
HONEY = '#d8b878'               # the market town's honey-coloured stone
HONEY_D = '#b8945a'
GREEN = '#5e9a3a'                # the meadow, as Millpond's
REEDS = ('#4e7a34', '#5a8a3a', '#6a9a44')


# ---- the river ------------------------------------------------------------------------------------------------------
def river_edges(x, r0, r1, seed=0, amp=0.35):
    """The river's two banks at column x (the water line): r0 / r1 wandering a little either way."""
    a = r0 + amp * math.sin(x * 0.31 + seed) + amp * 0.5 * math.sin(x * 0.83 + 2.1 + seed) + amp * 0.25 * math.sin(x * 1.9 + seed * 3)
    b = r1 + amp * math.sin(x * 0.27 + 1.3 + seed) + amp * 0.5 * math.sin(x * 0.71 + seed * 2) + amp * 0.25 * math.sin(x * 2.3 + 0.7)
    return a, b


def smooth(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)


def river_depth(x, r, r0, r1, seed=0, bank=0.7, deep=0.42):
    """How far the land drops at (x, r) for a river between r0 and r1 (with its wander): 0 on the meadow, falling over
    `bank` tiles to the water line, then down to the bed."""
    a, b = river_edges(x, r0, r1, seed)
    d = min(r - a, b - r)                        # inside the water: > 0
    if d < -bank:
        return 0.0
    if d < 0:
        return 0.3 * smooth(-bank, 0.0, d)
    return 0.3 + deep * smooth(0.0, 1.0, d)


def river_mat(x, r, r0, r1, seed=0):
    """'bed' under the water, 'bank' (mud and gravel) along the water line, or None (whatever the scene has there)."""
    a, b = river_edges(x, r0, r1, seed)
    d = min(r - a, b - r)
    if d > 0.08:
        return 'bed'
    if d > -0.28 - 0.1 * I.n2(x, r, 3.0, 4):
        return 'bank' if I.n2(x, r, 4.5, 8 + seed) > -0.25 else 'gravel'
    return None


def river_water(k, x0, x1, r0, r1, z, seed=0, part='stream_water'):
    """The river's still surface between its banks, a strip of quads along the columns."""
    q = []
    x = x0
    while x < x1:
        xb = min(x1, x + 0.25)
        a0, b0 = river_edges(x, r0, r1, seed)
        a1, b1 = river_edges(xb, r0, r1, seed)
        q.append(((x, a0 - 0.06, z), (xb, a1 - 0.06, z), (xb, b1 + 0.06, z), (x, b0 + 0.06, z)))
        x = xb
    k.quads(q, '#2a5a6a', part)


def river_banks(k, x0, x1, r0, r1, z, seed=0, skip=(), reeds=0.55, stones=0.3, lilies=0.25):
    """Reeds and cattails in clumps along both banks, stones half in the water, lily pads in the shallows. `skip`:
    column ranges left bare (bridges, a ford, a landing)."""
    rng = k.rng
    x = x0 + 0.2
    while x < x1 - 0.2:
        if any(a - 0.3 < x < b + 0.3 for a, b in skip):
            x += 0.4
            continue
        a, b = river_edges(x, r0, r1, seed)
        for side, edge in ((-1, a), (1, b)):
            if rng.random() < reeds:
                clump = {shade(REEDS[0], 0.85): [], REEDS[1]: [], shade(REEDS[2], 1.1): []}
                for j in range(rng.randint(10, 20)):
                    xx = x + rng.uniform(-0.3, 0.3)
                    rr = edge + side * rng.uniform(-0.18, 0.12)
                    h = rng.uniform(0.35, 0.8)
                    lean = rng.uniform(-0.12, 0.12)
                    clump[rng.choice(list(clump))].append((xx, rr, z - 0.02, h, 0.028, lean, rng.uniform(-0.04, 0.04)))
                    if rng.random() < 0.15:
                        k.cyl(xx + lean * 0.9, rr, z + h * 0.8, z + h * 0.96, 0.026, '#5a3a20', 'cattail', verts=6)
                with k.foliage('leaf'):
                    for col, bl in clump.items():
                        if bl:
                            k.blades(bl, (col, 0.2), 'reed')
            if rng.random() < stones:
                s = rng.choice((0.07, 0.1, 0.14, 0.2)) * rng.uniform(0.85, 1.15)
                k.rock(x + rng.uniform(-0.3, 0.3), edge + side * rng.uniform(-0.2, 0.15), z - s * 0.3, s, s * 0.8, s * 0.6,
                       (shade(rng.choice(('#8a8478', '#9a9080', '#7a766c')), rng.uniform(0.8, 1.1)), 0.2), part='rock', segs=8)
        if rng.random() < lilies:
            rr = rng.choice((a + rng.uniform(0.15, 0.5), b - rng.uniform(0.15, 0.5)))
            for j in range(rng.randint(1, 3)):
                s = rng.uniform(0.1, 0.15)
                k.cyl(x + rng.uniform(-0.3, 0.3), rr + rng.uniform(-0.12, 0.12), z, z + 0.012, s, ('#4a8a3a', 0.2), 'lily', verts=12, ry=s * 0.8)
            if rng.random() < 0.4:
                k.sphere(x, rr, z + 0.04, 0.05, 0.04, '#f0b8d0', 'lily_flower', segs=6)
        x += rng.uniform(0.45, 0.9)


# ---- bridges -------------------------------------------------------------------------------------------------------------
def arch_bridge(k, x0, x1, r0, r1, tone='#a89c88', broken=False, z_top=0.34):
    """A humped stone road bridge along the rows from r0 to r1: an arch under it (seen as its spandrel faces at either
    side), a deck of setts rising to the middle, a parapet each side with copestones. broken: the middle span has fallen
    into the water — the deck stops short both sides, its ragged ends, the stones down in the river."""
    rng = k.rng
    n = 14
    gap = (0.38, 0.64) if broken else None
    for i in range(n):
        t0, t1 = i / n, (i + 1) / n
        if gap and gap[0] < (t0 + t1) / 2 < gap[1]:
            continue
        ra, rb = r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1
        za, zb = 0.04 + z_top * math.sin(math.pi * t0), 0.04 + z_top * math.sin(math.pi * t1)
        k.poly([(x0, ra, za), (x1, ra, za), (x1, rb, zb), (x0, rb, zb)], (shade(tone, 0.82 + 0.06 * (i % 2)), 0.25), 'bridge_deck')
        for x in (x0 - 0.05, x1 - 0.2):                                      # the parapets
            if gap and (gap[0] - 0.08 < (t0 + t1) / 2 < gap[1] + 0.08) and rng.random() < 0.6:
                continue
            k.box(x, ra, max(za, zb) - 0.6, x + 0.25, rb, max(za, zb) + 0.42, (shade(tone, rng.uniform(0.86, 1.04)), 0.2), 'parapet', bevel=0.02)
            k.box(x - 0.03, ra, max(za, zb) + 0.42, x + 0.28, rb, max(za, zb) + 0.5, (shade(tone, 1.12), 0.12), 'copestone', bevel=0.02)
    # the arch's face either side: voussoirs round a dark opening over the water
    mid = (r0 + r1) / 2
    span = (r1 - r0) * 0.36
    for x in (x0 - 0.06, x1 + 0.0):
        k.box(x, r0 + 0.3, -0.5, x + 0.06, r1 - 0.3, 0.02 + z_top * 0.7, (shade(tone, 0.8), 0.2), 'bridge_face')
        for j in range(11):
            a = math.pi * j / 10
            if broken and 0.25 < j / 10 < 0.75:
                continue
            rr, zz = mid - math.cos(a) * span, -0.3 + math.sin(a) * span * 0.7
            k.box(x - 0.02, rr - 0.1, zz - 0.07, x + 0.08, rr + 0.1, zz + 0.07, (shade(tone, rng.uniform(0.95, 1.12)), 0.14), 'voussoir', bevel=0.015)
    if broken:
        for _ in range(9):                                                    # the fallen span, down in the water
            s = rng.uniform(0.12, 0.26)
            k.rock(rng.uniform(x0, x1), rng.uniform(r0 + (r1 - r0) * gap[0], r0 + (r1 - r0) * gap[1]), -0.3, s, s * 0.85, s * 0.6,
                   (shade(tone, rng.uniform(0.75, 0.95)), 0.2), part='rock', segs=7)
        for rr in (r0 + (r1 - r0) * gap[0] - 0.05, r0 + (r1 - r0) * gap[1] + 0.05):          # ragged ends
            for _ in range(4):
                s = rng.uniform(0.06, 0.12)
                k.rock(rng.uniform(x0 + 0.2, x1 - 0.2), rr + rng.uniform(-0.1, 0.1), z_top - 0.05, s, s, s * 0.6,
                       (shade(tone, 0.85), 0.2), part='rock', segs=6)


def barrier(k, x0, x1, r, text=None, font='Rye'):
    """A plank barrier on two trestles across a way, striped red and white, a painted board on it."""
    for x in (x0 + 0.1, x1 - 0.1):
        k.tube((x - 0.12, r, 0.0), (x, r, 0.62), 0.03, (WOOD_D, 0.15), 'trestle', verts=5)
        k.tube((x + 0.12, r, 0.0), (x, r, 0.62), 0.03, (WOOD_D, 0.15), 'trestle', verts=5)
    n = 8
    for i in range(n):
        xa, xb = x0 + (x1 - x0) * i / n, x0 + (x1 - x0) * (i + 1) / n
        k.box(xa, r - 0.04, 0.55, xb, r + 0.04, 0.68, ('#c83a2e' if i % 2 else '#f0ece0', 0.15), 'barrier')
    if text:
        V.board_sign(k, text, font, (x0 + x1) / 2, r + 0.05, 0.22, size=0.13, board='#f0e8d0', ink='#a02a20', trim='#5a3e22', pad=0.06)


def girder_bridge(k, x0, x1, r0, r1, z=0.3):
    """The railway over the river: two riveted iron girders on stone piers, the track across them."""
    for rr in (r0, r1):
        k.box(x0 - 0.2, rr - 0.35, -0.6, x1 + 0.2, rr + 0.35, z, (shade('#9a9080', 0.95), 0.18), 'pier', bevel=0.03)
    for x in (x0 - 0.05, x1 - 0.12):
        k.box(x, r0, z, x + 0.17, r1, z + 0.42, ('#3a4a52', 0.1), 'girder')
        r = r0 + 0.2
        while r < r1 - 0.1:
            k.box(x - 0.01, r, z + 0.02, x + 0.18, r + 0.04, z + 0.4, ('#2a363e', 0.1), 'girder_web')
            r += 0.45
    k.box(x0, r0, z - 0.06, x1, r1, z, ('#3a4a52', 0.1), 'girder_deck')
    rail_track(k, x0 + 0.1, x1 - 0.1, r0, r1, z=z, ballast=False)


def rail_track(k, x0, x1, r0, r1, z=0.0, ballast=True, rust=False):
    """A single line along the rows: a bed of ballast, sleepers across, two rails on them."""
    rng = k.rng
    cx = (x0 + x1) / 2
    if ballast:
        k.box(x0, r0, z - 0.04, x1, r1, z + 0.05, ('#7e786c', 0.2), 'ballast')
        grit = {}
        for _ in range(int((r1 - r0) * (x1 - x0) * 40)):
            x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
            col = rng.choice(('#6e685e', '#8e887a', '#a49c8c', '#5e5a52'))
            s = rng.uniform(0.02, 0.04)
            grit.setdefault(col, []).append((x - s, r - s, z + 0.05, x + s, r + s, z + 0.07))
        for col, rs in grit.items():
            k.boxes(rs, (col, 0.0), 'ballast')
    r = r0 + 0.1
    while r < r1 - 0.05:
        k.box(cx - 0.62, r, z + 0.05, cx + 0.62, r + 0.15, z + 0.11, (shade('#5a4a3a', rng.uniform(0.8, 1.1)), 0.2), 'sleeper')
        r += 0.32
    for dx in (-0.36, 0.36):
        k.box(cx + dx - 0.035, r0, z + 0.11, cx + dx + 0.035, r1, z + 0.19, (RUST if rust else '#5a5a60', 0.08), 'rail')
        if not rust:
            k.box(cx + dx - 0.02, r0, z + 0.19, cx + dx + 0.02, r1, z + 0.2, '#c8ccd4', 'rail_top')


def platform(k, x0, x1, r0, r1, z=0.24, tone='#a89c88'):
    """A station platform: a stone face along the track side, a coping of pale slabs with a painted edge, flags on top,
    a ramp down at the south end."""
    k.box(x0, r0, -0.02, x1, r1 - 0.8, z, (shade(tone, 0.85), 0.16), 'platform_body')
    for i in range(8):                                                        # the ramp
        ra, rb = r1 - 0.8 + i * 0.1, r1 - 0.8 + (i + 1) * 0.1
        k.box(x0, ra, -0.02, x1, rb, z * (1 - (i + 1) / 8) + 0.01, (shade(tone, 0.85), 0.16), 'platform_body')
    r = r0
    while r < r1 - 0.85:                                                      # flags on top, in running bond
        h = min(k.rng.uniform(0.42, 0.62), r1 - 0.8 - r)
        x = x0 - k.rng.uniform(0.0, 0.5)
        while x < x1 - 0.2:
            w = k.rng.uniform(0.5, 0.9)
            a, b = max(x, x0), min(x + w, x1 - 0.2)
            if b - a > 0.1:
                k.box(a + 0.025, r + 0.025, z - 0.02, b - 0.025, r + h - 0.025, z + 0.012, (shade(tone, k.rng.uniform(0.88, 1.12)), 0.16),
                      'floor_platform', bevel=0.015)
            x += w
        r += h
    k.box(x1 - 0.18, r0, z, x1 + 0.04, r1 - 0.8, z + 0.035, ('#e8e0cc', 0.1), 'coping')
    k.box(x1 - 0.22, r0, z + 0.035, x1 - 0.16, r1 - 0.8, z + 0.04, '#f0d040', 'platform_line')


def canopy(k, x0, x1, r0, r1, z=2.1, roof='#4a5a5a', trim='#2e5a3e', valance='#efe6d2'):
    """A platform canopy: iron columns with brackets, a ridged roof sloping both ways, a fretted wooden valance hanging
    along its edges."""
    for r in [r0 + 0.3 + i * 1.6 for i in range(int((r1 - r0 - 0.4) / 1.6) + 1)]:
        cx = (x0 + x1) / 2
        k.cyl(cx, r, 0.2, z, 0.05, (trim, 0.08), 'column', verts=8)
        k.cyl(cx, r, 0.2, 0.34, 0.08, (trim, 0.08), 'column', verts=8)
        for s in (-1, 1):
            k.tube((cx, r, z - 0.45), (cx + s * 0.6, r, z - 0.02), 0.02, trim, 'column_bracket', verts=4)
    cx = (x0 + x1) / 2
    for (xa, xb, za, zb) in ((x0 - 0.15, cx, z, z + 0.35), (cx, x1 + 0.15, z + 0.35, z)):
        k.quads([((xa, r0, za), (xb, r0, zb), (xb, r1, zb), (xa, r1, za))], (roof, 0.12), 'roof_canopy')
    for x in (x0 - 0.15, x1 + 0.1):                                           # the valance: boards, each cut to a point
        r = r0
        while r < r1 - 0.02:
            k.quads([((x, r, z), (x, r + 0.11, z), (x, r + 0.11, z - 0.2), (x, r, z - 0.2))], (valance, 0.1), 'valance')
            k.poly([(x, r, z - 0.2), (x, r + 0.11, z - 0.2), (x, r + 0.055, z - 0.3)], (valance, 0.1), 'valance')
            r += 0.12
    for r in (r0 - 0.02, r1 - 0.03):
        k.box(x0 - 0.15, r, z - 0.2, x1 + 0.15, r + 0.05, z + 0.02, (valance, 0.1), 'valance')


def station_clock(k, cx, r_face, z, rad=0.26):
    k.cyl_y(cx, r_face, r_face + 0.06, z, rad + 0.04, rad + 0.04, ('#2e3a34', 0.1), 'clock_rim', verts=20)
    k.cyl_y(cx, r_face + 0.05, r_face + 0.08, z, rad, rad, '#f4f0e4', 'clock_face', verts=20)
    k.tube((cx, r_face + 0.09, z), (cx, r_face + 0.09, z + rad * 0.75), 0.012, '#1a1a1a', 'clock_hand', verts=4)
    k.tube((cx, r_face + 0.09, z), (cx + rad * 0.5, r_face + 0.09, z - rad * 0.2), 0.014, '#1a1a1a', 'clock_hand', verts=4)


def enamel_sign(k, cx, r_face, z, w, h, col, band='#f0ece0'):
    k.box(cx - w / 2, r_face, z, cx + w / 2, r_face + 0.025, z + h, (col, 0.05), 'enamel_sign')
    k.box(cx - w / 2 + 0.03, r_face + 0.025, z + h * 0.4, cx + w / 2 - 0.03, r_face + 0.03, z + h * 0.6, (band, 0.05), 'enamel_sign')


def trolley(k, cx, cr):
    """A station porter's luggage trolley with a trunk and a case on it."""
    k.box(cx - 0.35, cr - 0.2, 0.2, cx + 0.35, cr + 0.2, 0.25, (WOOD, 0.15), 'trolley')
    for s in (-1, 1):
        k.cyl_y(cx + s * 0.25, cr - 0.25, cr + 0.25, 0.12, 0.12, 0.12, ('#2a2a2a', 0.1), 'trolley_wheel', verts=10)
    k.tube((cx - 0.35, cr, 0.25), (cx - 0.6, cr, 0.9), 0.02, IRON, 'trolley_handle', verts=4)
    k.box(cx - 0.28, cr - 0.16, 0.25, cx + 0.12, cr + 0.16, 0.55, ('#6a3a2a', 0.15), 'trunk_case', bevel=0.02)
    k.box(cx - 0.24, cr - 0.17, 0.42, cx + 0.08, cr + 0.17, 0.45, ('#c8a050', 0.1), 'trunk_band')
    k.box(cx + 0.06, cr - 0.12, 0.25, cx + 0.32, cr + 0.12, 0.45, ('#2e4a6a', 0.15), 'trunk_case', bevel=0.02)
    k.solid(cx - 0.4, cr - 0.25, cx + 0.4, cr + 0.25)


# ---- a shut-up place, and one opened ------------------------------------------------------------------------------------
def boards_over(k, x0, x1, r_face, z0, z1, tone='#8a7a62'):
    """Weathered planks nailed across an opening, a little askew."""
    rng = k.rng
    z = z0
    while z < z1 - 0.04:
        h = rng.uniform(0.12, 0.17)
        tilt = rng.uniform(-0.04, 0.04)
        k.quads([((x0 - 0.06, r_face + 0.08, z + tilt), (x1 + 0.06, r_face + 0.08, z - tilt), (x1 + 0.06, r_face + 0.08, z + h - tilt),
                  (x0 - 0.06, r_face + 0.08, z + h + tilt))], (shade(tone, rng.uniform(0.8, 1.1)), 0.2), 'boards')
        for x in (x0 + 0.02, x1 - 0.02):
            k.sphere(x, r_face + 0.09, z + h / 2, 0.012, 0.012, '#3a3a3a', 'nail', segs=4)
        z += h + rng.uniform(0.02, 0.05)


def to_let(k, cx, cr, text='TO LET', h=1.0):
    k.box(cx - 0.035, cr - 0.035, 0, cx + 0.035, cr + 0.035, h + 0.3, (WOOD_D, 0.15), 'sign_post')
    V.board_sign(k, text, 'AlegreyaSC-Bold', cx, cr + 0.04, h, size=0.12, board='#f0e8d0', ink='#2a3a5a', trim='#2a3a5a', pad=0.06)


def weeds(k, x0, r0, x1, r1, n=30):
    """Nettles, docks and dandelion clocks: what grows where nobody's minding."""
    rng = k.rng
    blades = {'#4e7a34': [], '#5e8a3a': [], '#6a9a44': []}
    for _ in range(n):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        for j in range(rng.randint(4, 8)):
            blades[rng.choice(list(blades))].append((x + rng.uniform(-0.06, 0.06), r, 0.0, rng.uniform(0.15, 0.4), 0.04,
                                                     rng.uniform(-0.1, 0.1), rng.uniform(-0.05, 0.05)))
        if rng.random() < 0.3:
            k.sphere(x, r, rng.uniform(0.25, 0.4), 0.05, 0.05, '#f4f0e0', 'dandelion', segs=6)
    with k.foliage('leaf'):
        for col, bl in blades.items():
            if bl:
                k.blades(bl, (col, 0.2), 'weeds')


def bistro(k, cx, cr, top='#2e4a3a', chairs=2):
    """A little round café table on an iron foot, a chair either side, a cup and a vase on it."""
    k.cyl(cx, cr, 0.0, 0.04, 0.16, (IRON, 0.1), 'table_foot', verts=10)
    k.cyl(cx, cr, 0.04, 0.68, 0.03, (IRON, 0.1), 'table_leg', verts=6)
    k.cyl(cx, cr, 0.68, 0.72, 0.3, (top, 0.1), 'table_top', verts=16)
    k.cyl(cx + 0.1, cr, 0.72, 0.78, 0.05, '#f4f0e8', 'cup', verts=8)
    k.cyl(cx - 0.08, cr - 0.06, 0.72, 0.86, 0.035, '#a8d0e0', 'vase', verts=8)
    k.sphere(cx - 0.08, cr - 0.06, 0.9, 0.05, 0.05, k.rng.choice(('#f0d040', '#e05070', '#f0f0f0')), 'flower', segs=6)
    for s in ((-1, 1) if chairs == 2 else (1,)):
        x = cx + s * 0.44
        for dx, dr in ((-0.12, -0.12), (0.12, -0.12), (-0.12, 0.12), (0.12, 0.12)):
            k.box(x + dx - 0.015, cr + dr - 0.015, 0, x + dx + 0.015, cr + dr + 0.015, 0.42, (IRON, 0.1), 'chair_leg')
        k.box(x - 0.16, cr - 0.16, 0.42, x + 0.16, cr + 0.16, 0.46, (top, 0.12), 'chair_seat')
        bx = x + s * 0.15
        k.box(bx - 0.02, cr - 0.16, 0.46, bx + 0.02, cr + 0.16, 0.86, (top, 0.12), 'chair_back')
    k.solid(cx - 0.4, cr - 0.3, cx + 0.4, cr + 0.3)


def a_board(k, cx, cr, frame=WOOD_D, lines=('#f0f0e8', '#f0d070', '#f0a0b0')):
    """A chalkboard on the pavement: two leaves leaning together, the day's menu chalked up."""
    for s in (-1, 1):
        k.quads([((cx - 0.26, cr + s * 0.02, 0.0), (cx + 0.26, cr + s * 0.02, 0.0), (cx + 0.24, cr + s * 0.16 * 0.1, 0.82),
                  (cx - 0.24, cr + s * 0.16 * 0.1, 0.82))], (frame, 0.12), 'aboard_frame')
    k.quads([((cx - 0.2, cr + 0.04, 0.12), (cx + 0.2, cr + 0.04, 0.12), (cx + 0.19, cr + 0.025, 0.74), (cx - 0.19, cr + 0.025, 0.74))],
            ('#24302a', 0.05), 'chalkboard')
    for i, col in enumerate(lines * 2):
        z = 0.64 - i * 0.08
        w = k.rng.uniform(0.12, 0.3)
        k.box(cx - 0.15, cr + 0.04, z, cx - 0.15 + w, cr + 0.045, z + 0.025, col, 'chalk')
    k.solid(cx - 0.3, cr - 0.2, cx + 0.3, cr + 0.2)


def string_lights(k, a, b, sag=0.3, energy=0.0):
    """Festoon lights strung between two points: a wire and warm bulbs along it."""
    L = math.dist(a[:2], b[:2])
    n = max(4, int(L / 0.3))
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)))
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.008, '#2a2018', 'light_wire', verts=4)
    for p in pts[1:-1]:
        k.sphere(p[0], p[1], p[2] - 0.05, 0.035, 0.045, '#fff0c0', 'bulb', emit=('#ffd890', 2.0), segs=6)
    if energy:
        m = pts[len(pts) // 2]
        k.point_light(m[0], m[1] + 0.2, m[2] - 0.3, '#ffc070', energy, radius=0.4, group='flicker')


# ---- the dairy -------------------------------------------------------------------------------------------------------------
def churn(k, cx, cr, tone='#c8ccd0'):
    k.cyl(cx, cr, 0, 0.42, 0.13, (tone, 0.06), 'churn', verts=12)
    k.cone(cx, cr, 0.42, 0.56, 0.13, 0.07, (tone, 0.06), 'churn', verts=12)
    k.cyl(cx, cr, 0.56, 0.62, 0.08, (shade(tone, 0.85), 0.06), 'churn_lid', verts=10)
    for z in (0.08, 0.3):
        k.cyl(cx, cr, z, z + 0.03, 0.135, (shade(tone, 0.75), 0.06), 'churn_band', verts=12)


def cheese_wheels(k, cx, cr, n=3, z=0.0, col='#e8c060', rind='#c89a40'):
    for i in range(n):
        k.cyl(cx + (i % 2) * 0.04, cr, z + i * 0.13, z + i * 0.13 + 0.12, 0.2 - i * 0.02, (col, 0.15), 'cheese', verts=14)
        k.cyl(cx + (i % 2) * 0.04, cr, z + i * 0.13 + 0.115, z + i * 0.13 + 0.125, 0.19 - i * 0.02, (rind, 0.15), 'cheese_rind', verts=14)


def cheese_rack(k, x0, x1, cr, levels=3):
    """An open rack of shelves, rounds of cheese ageing on it, some cut."""
    for x in (x0, x1 - 0.06):
        k.box(x, cr - 0.2, 0, x + 0.06, cr + 0.2, 0.2 + levels * 0.36, (WOOD_D, 0.15), 'rack_post')
    for j in range(levels):
        z = 0.15 + j * 0.36
        k.box(x0, cr - 0.2, z, x1, cr + 0.2, z + 0.04, (WOOD, 0.15), 'rack_shelf')
        x = x0 + 0.22
        while x < x1 - 0.18:
            col, rind = k.rng.choice((('#f0d070', '#c89a40'), ('#f4e8c0', '#e0d0a0'), ('#e8a840', '#a86a20'), ('#f0f0e0', '#9a9a8a')))
            k.cyl(x, cr, z + 0.04, z + 0.17, 0.16, (rind, 0.15), 'cheese', verts=12)
            k.cyl(x, cr, z + 0.165, z + 0.175, 0.15, (col, 0.15), 'cheese_top', verts=12)
            x += 0.38
    k.solid(x0, cr - 0.25, x1, cr + 0.25)


# ---- horses and stables --------------------------------------------------------------------------------------------------
def stable_doors(k, cx, r_face, w=0.8, col='#3a5a3a', open_top=True):
    """A stable's split door: the bottom leaf shut, the top open (dark inside), white-painted cross braces."""
    k.box(cx - w / 2 - 0.06, r_face, 0, cx + w / 2 + 0.06, r_face + 0.06, 1.5, (WOOD_D, 0.12), 'door_frame')
    k.box(cx - w / 2, r_face + 0.02, 0, cx + w / 2, r_face + 0.09, 0.72, (col, 0.12), 'stable_door')
    for (a, b) in (((cx - w / 2 + 0.06, 0.06), (cx + w / 2 - 0.06, 0.66)), ((cx + w / 2 - 0.06, 0.06), (cx - w / 2 + 0.06, 0.66))):
        k.tube((a[0], r_face + 0.1, a[1]), (b[0], r_face + 0.1, b[1]), 0.022, '#efe6d2', 'stable_brace', verts=4)
    if open_top:
        k.box(cx - w / 2, r_face + 0.0, 0.72, cx + w / 2, r_face + 0.03, 1.42, '#1a1410', 'stable_dark')
        k.box(cx - w / 2 - 0.42, r_face + 0.02, 0.74, cx - w / 2 - 0.02, r_face + 0.09, 1.42, (col, 0.12), 'stable_door')
    else:
        k.box(cx - w / 2, r_face + 0.02, 0.72, cx + w / 2, r_face + 0.09, 1.42, (col, 0.12), 'stable_door')


def trough(k, x0, x1, cr):
    k.box(x0, cr - 0.22, 0, x1, cr + 0.22, 0.36, ('#8a8478', 0.14), 'trough', bevel=0.02)
    k.box(x0 + 0.06, cr - 0.16, 0.26, x1 - 0.06, cr + 0.16, 0.32, ('#2a4a5a', 0.1), 'trough_water', emit=('#3a6a8a', 0.12))
    k.solid(x0, cr - 0.25, x1, cr + 0.25)


def hay_rack(k, cx, cr):
    k.box(cx - 0.4, cr - 0.05, 0.0, cx + 0.4, cr + 0.05, 1.0, (WOOD_D, 0.15), 'hayrack_back')
    for i in range(6):
        x = cx - 0.36 + i * 0.145
        k.tube((x, cr + 0.02, 0.5), (x, cr + 0.3, 1.0), 0.015, WOOD_D, 'hayrack_bar', verts=4)
    k.blob(cx, cr + 0.15, 0.82, 0.38, 0.16, 0.18, ('#d8b860', 0.25), 'hay', segs=10)
    k.solid(cx - 0.4, cr - 0.1, cx + 0.4, cr + 0.35)


def paddock(k, pts, h=0.8, solid=True):
    """A post-and-rail fence round a yard, from point to point (a list), painted white like a stud's."""
    for a, b in zip(pts, pts[1:]):
        F.fence(k, a, b, h=h, tone='#e8e2d4', every=1.1, solid=solid)


def mounting_block(k, cx, cr):
    for i, (w, z) in enumerate(((0.6, 0.18), (0.4, 0.36))):
        k.box(cx - w / 2, cr - 0.25 + i * 0.12, 0, cx + w / 2, cr + 0.25, z, (shade('#a89c88', 1 - i * 0.06), 0.14), 'mounting_block', bevel=0.02)
    k.solid(cx - 0.3, cr - 0.25, cx + 0.3, cr + 0.25)


# ---- the countryside --------------------------------------------------------------------------------------------------------
def stakes(k, x0, r0, x1, r1, sign=None):
    """A building plot pegged out: stakes at the corners and along the sides, string between, a board on a post."""
    pts = [(x0, r0), (x1, r0), (x1, r1), (x0, r1), (x0, r0)]
    for (a, b) in zip(pts, pts[1:]):
        L = math.dist(a, b)
        n = max(1, int(L / 1.2))
        for i in range(n):
            t = i / n
            x, r = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            k.box(x - 0.025, r - 0.025, 0, x + 0.025, r + 0.025, 0.4, ('#c8a870', 0.15), 'stake')
        k.tube((a[0], a[1], 0.34), (b[0], b[1], 0.34), 0.008, '#f0f0e0', 'string', verts=4)
    if sign:
        to_let(k, x0 + 0.5, r1 + 0.15, sign, h=0.75)


def stand(k, x0, x1, cr, produce=('#c83a2a', '#f08020', '#6a9a3a', '#e0c040', '#a050a0'), roof='#7a3a2a'):
    """A farm-gate stand: a table under a little shingled roof on four posts, crates of produce, jars, a slate of prices
    and a tin honesty box."""
    rng = k.rng
    for x in (x0 + 0.05, x1 - 0.05):
        for dr in (-0.3, 0.3):
            k.box(x - 0.04, cr + dr - 0.04, 0, x + 0.04, cr + dr + 0.04, 1.6, (WOOD_D, 0.15), 'stand_post')
    k.box(x0, cr - 0.34, 0.7, x1, cr + 0.34, 0.76, (WOOD, 0.15), 'stand_table')
    k.quads([((x0 - 0.15, cr - 0.5, 1.75), (x1 + 0.15, cr - 0.5, 1.75), (x1 + 0.15, cr + 0.5, 1.5), (x0 - 0.15, cr + 0.5, 1.5))],
            (roof, 0.12), 'roof_stand')
    x = x0 + 0.25
    while x < x1 - 0.2:
        k.box(x - 0.18, cr - 0.2, 0.76, x + 0.18, cr + 0.15, 0.9, (WOOD_D, 0.15), 'stand_crate')
        col = rng.choice(produce)
        for j in range(5):
            k.sphere(x + rng.uniform(-0.12, 0.12), cr + rng.uniform(-0.12, 0.08), 0.94, 0.06, 0.05, (shade(col, rng.uniform(0.9, 1.1)), 0.2), 'produce', segs=6)
        x += 0.45
    for j in range(3):
        k.cyl(x1 - 0.3 + j * 0.09, cr + 0.22, 0.76, 0.92, 0.04, ('#e0a020', 0.1), 'jar', verts=8)
    k.box(x0 + 0.1, cr + 0.2, 0.76, x0 + 0.34, cr + 0.32, 0.9, ('#4a6a7a', 0.08), 'honesty_box', bevel=0.01)
    k.box(x0 + 0.17, cr + 0.32, 0.86, x0 + 0.27, cr + 0.33, 0.87, '#1a1a1a', 'honesty_slot')
    k.box(x0 - 0.02, cr + 0.32, 1.0, x0 + 0.5, cr + 0.35, 1.3, ('#2a3430', 0.1), 'price_slate')
    k.solid(x0, cr - 0.4, x1, cr + 0.4)


def vines(k, x0, x1, cr, h=0.95, grapes=('#4a2a5a', '#5a3a6a', '#6a3a5a'), every=0.5):
    """A row of grapevines along the columns: posts and wires, a gnarled trunk at each, leaves along the wire, bunches
    hanging under it (grapes None: a winter row, bare canes)."""
    rng = k.rng
    for x in (x0, x1):
        k.box(x - 0.04, cr - 0.04, 0, x + 0.04, cr + 0.04, h + 0.15, (WOOD_D, 0.15), 'vine_post')
    for z in (h * 0.6, h):
        k.tube((x0, cr, z), (x1, cr, z), 0.006, '#8a8a8a', 'vine_wire', verts=4)
    x = x0 + 0.25
    while x < x1 - 0.15:
        k.tube((x, cr, 0), (x + rng.uniform(-0.05, 0.05), cr, h * 0.6), 0.035, ('#5a4030', 0.15), 'vine_trunk', rb=0.025, verts=5)
        with k.foliage('leaf'):
            for j in range(5):
                xx = x + rng.uniform(-0.25, 0.25)
                k.blob(xx, cr + rng.uniform(-0.1, 0.1), h * rng.uniform(0.62, 1.05), 0.13, 0.1, 0.1,
                       (shade(rng.choice(('#3e6a2a', '#4a7a30', '#56863a')), rng.uniform(0.9, 1.1)), 0.22), 'vine_leaf', segs=7)
        if grapes:
            for j in range(rng.randint(1, 3)):
                gx, gr = x + rng.uniform(-0.2, 0.2), cr + rng.uniform(0.05, 0.14)
                col = rng.choice(grapes)
                for g in range(7):
                    k.sphere(gx + rng.uniform(-0.04, 0.04), gr, h * 0.55 - g * 0.025 + rng.uniform(-0.01, 0.01), 0.03, 0.03, (col, 0.1), 'grape', segs=5)
        x += every
    k.solid(x0, cr - 0.2, x1, cr + 0.2)


def hedge(k, a, b, h=0.55, tone='#3a6a30', gap=None, flowers=0.2):
    """A hedgerow from a to b (floor points): a line of leafy clumps, hawthorn blossom or berries here and there."""
    (x0, r0), (x1, r1) = a, b
    L = math.dist(a, b)
    n = max(2, int(L / 0.32))
    with k.foliage('leaf'):
        for i in range(n + 1):
            t = i / n
            x, r = x0 + (x1 - x0) * t, r0 + (r1 - r0) * t
            if gap and gap[0] <= (x if abs(x1 - x0) > abs(r1 - r0) else r) <= gap[1]:
                continue
            hh = h * k.rng.uniform(0.85, 1.15)
            W.leafy_crown(k, x, r, hh * 0.55, 0.26, 0.22, hh * 0.5, shade(tone, k.rng.uniform(0.88, 1.08)), part='hedge', sprigs=False)
    for i in range(int(n * flowers)):
        t = k.rng.random()
        x, r = x0 + (x1 - x0) * t, r0 + (r1 - r0) * t
        if gap and gap[0] <= (x if abs(x1 - x0) > abs(r1 - r0) else r) <= gap[1]:
            continue
        k.sphere(x + k.rng.uniform(-0.1, 0.1), r + 0.2, h * k.rng.uniform(0.4, 0.9), 0.035, 0.035,
                 k.rng.choice(('#f4f0e8', '#f0e0e8', '#c03050')), 'hedge_flower', segs=5)


def washing_line(k, a, b, z=1.3, cols=('#f0f0f0', '#e07a8a', '#7aa0d0', '#f0e0a0')):
    for p in (a, b):
        k.box(p[0] - 0.03, p[1] - 0.03, 0, p[0] + 0.03, p[1] + 0.03, z + 0.1, (WOOD_D, 0.15), 'line_post')
    k.tube((a[0], a[1], z), (b[0], b[1], z - 0.0), 0.006, '#e0e0d8', 'line', verts=4)
    n = int(math.dist(a, b) / 0.45)
    for i in range(1, n):
        t = i / n
        x, r = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        w = k.rng.uniform(0.18, 0.3)
        k.box(x - w / 2, r - 0.01, z - k.rng.uniform(0.3, 0.45), x + w / 2, r + 0.01, z, (k.rng.choice(cols), 0.2), 'washing')


def fast_top(k):
    """k.top() — what's on top looking straight down — from one BVH tree of everything built, made the first time
    it's asked, instead of a ray cast through the Blender scene each time: the meadow asks it some forty thousand times
    over a big outdoor place, and with tens of thousands of objects the scene's own ray cast takes most of an hour."""
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    st = {}

    def build():
        verts, polys, owner = [], [], []
        for p in k.parts:
            o = p['obj']
            if o.type != 'MESH':
                continue
            M = o.matrix_world
            base = len(verts)
            verts.extend(M @ v.co for v in o.data.vertices)
            for poly in o.data.polygons:
                polys.append([base + i for i in poly.vertices])
                owner.append(p.get('pname'))
        st['tree'], st['owner'] = BVHTree.FromPolygons(verts, polys), owner

    def top(x, r):
        if 'tree' not in st:
            import bpy
            bpy.context.view_layer.update()
            build()
        loc, _n, i, _d = st['tree'].ray_cast(Vector((x, -r * S, 30.0)), Vector((0, 0, -1)))
        if loc is None:
            return None, None
        return st['owner'][i], loc.z
    k.top = top



# ---- the green and the gardens -----------------------------------------------------------------------------------------------
def bandstand(k, cx, cr, rad=1.15, roof='#2e5a3e', trim='#efe6d2'):
    """A little octagonal bandstand: a stone plinth with steps, slender iron columns, a railing, a tented roof with a
    fretted edge and a finial, music stands left out on the boards."""
    n = 8
    k.cyl(cx, cr, 0.0, 0.32, rad + 0.08, ('#a89c88', 0.16), 'plinth', verts=n)
    k.cyl(cx, cr, 0.32, 0.36, rad + 0.12, ('#c8bca8', 0.1), 'copestone', verts=n)
    k.cyl(cx, cr, 0.36, 0.38, rad, ('#8a6a44', 0.12), 'floor_bandstand', verts=n)
    for i in range(3):                                                       # steps at the front
        k.box(cx - 0.35, cr + rad - 0.05 + i * 0.16, 0.0, cx + 0.35, cr + rad + 0.11 + i * 0.16, 0.32 - i * 0.1, ('#b0a490', 0.14), 'steps', bevel=0.01)
    pts = [(cx + math.cos(a) * rad * 0.93, cr + math.sin(a) * rad * 0.93) for a in [j * math.tau / n + math.pi / n for j in range(n)]]
    for (x, r) in pts:
        k.cyl(x, r, 0.36, 1.95, 0.035, (trim, 0.08), 'column', verts=6)
    for (a, b) in zip(pts, pts[1:] + pts[:1]):
        if a[1] > cr + 0.3 and b[1] > cr + 0.3:                              # the front's open for the steps
            continue
        k.bar(a[0], a[1], b[0], b[1], 0.78, 0.82, 0.04, (trim, 0.08), 'railing')
        for t in (0.25, 0.5, 0.75):
            x, r = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            k.box(x - 0.012, r - 0.012, 0.38, x + 0.012, r + 0.012, 0.8, (trim, 0.08), 'baluster')
    k.cone(cx, cr, 1.95, 2.7, rad + 0.25, 0.04, (roof, 0.12), 'roof_bandstand', verts=n)
    k.cyl(cx, cr, 1.88, 1.98, rad + 0.27, (trim, 0.08), 'roof_trim', verts=n)
    k.cone(cx, cr, 2.68, 3.0, 0.05, 0.0, ('#c8a040', 0.06), 'finial', verts=6)
    for (x, r) in pts[:3]:
        k.tube((x * 0.6 + cx * 0.4, r * 0.6 + cr * 0.4, 0.38), (x * 0.6 + cx * 0.4, r * 0.6 + cr * 0.4, 0.9), 0.01, '#2a2a2a', 'music_stand', verts=4)
        k.box(x * 0.6 + cx * 0.4 - 0.1, r * 0.6 + cr * 0.4, 0.85, x * 0.6 + cx * 0.4 + 0.1, r * 0.6 + cr * 0.4 + 0.02, 1.0, '#2a2a2a', 'music_stand')
    k.solid(cx - rad, cr - rad, cx + rad, cr + rad)


def willow(k, cx, cr, h=3.0, tone='#5a8a3a'):
    """A weeping willow by water: a leaning trunk, a crown, and long falls of leaves to the ground all round."""
    k.tube((cx, cr, 0.0), (cx + 0.25, cr, h * 0.55), 0.13, (W.WOOD_D, 0.14), 'trunk', rb=0.08, verts=8)
    with k.foliage('leaf'):
        W.leafy_crown(k, cx + 0.25, cr, h * 0.72, 0.9, 0.75, 0.55, tone, part='leaves')
        falls = {shade(tone, 0.8): [], tone: [], shade(tone, 1.15): []}
        for i in range(70):
            a = k.rng.uniform(0, math.tau)
            d = k.rng.uniform(0.55, 1.05)
            x, r = cx + 0.25 + math.cos(a) * d, cr + math.sin(a) * d * 0.85
            top = h * k.rng.uniform(0.6, 0.78)
            falls[k.rng.choice(list(falls))].append((x, r, top - k.rng.uniform(1.0, 1.6), top - 0.0, 0.07, math.cos(a) * 0.05, math.sin(a) * 0.05))
        for col, bl in falls.items():
            k.blades([(x, r, z0, z1 - z0, w, lx, lr) for (x, r, z0, z1, w, lx, lr) in bl], (col, 0.2), 'willow')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.6, cr + 0.3)


def veg_patch(k, x0, r0, x1, r1, kinds=('cabbage', 'bean', 'onion')):
    """A back-garden vegetable patch: dug earth in rows, cabbages, beans up their canes, onion tops, an edging plank."""
    F.earth(k, x0, r0, x1, r1)
    rng = k.rng
    rr, i = r0 + 0.3, 0
    while rr < r1 - 0.15:
        kind = kinds[i % len(kinds)]
        x = x0 + 0.25
        while x < x1 - 0.2:
            if kind == 'cabbage':
                k.sphere(x, rr, 0.1, 0.13, 0.1, (shade('#6aa04a', rng.uniform(0.9, 1.1)), 0.2), 'crop', segs=8)
                x += 0.36
            elif kind == 'bean':
                k.cone(x, rr, 0.0, 0.62, 0.05, 0.01, ('#4a8a3a', 0.2), 'crop', verts=5)
                k.tube((x, rr, 0.0), (x, rr, 0.66), 0.01, '#8a6a44', 'cane', verts=4)
                x += 0.28
            else:
                k.blades([(x + rng.uniform(-0.04, 0.04), rr, 0.02, rng.uniform(0.14, 0.24), 0.02, rng.uniform(-0.04, 0.04), 0.0) for _ in range(4)],
                         ('#5aa040', 0.2), 'crop')
                x += 0.2
        rr += 0.42
        i += 1
    k.box(x0, r1 - 0.04, 0.0, x1, r1 + 0.02, 0.08, (WOOD_D, 0.15), 'edging')
    k.solid(x0, r0, x1, r1)


def shed(k, x0, x1, r0, r1, wall='#6a5a40', roof='#4a5a4a'):
    """A garden shed: plank walls, a lean-to roof of felt, a door and a small window, a water butt."""
    h = 1.35
    k.box(x0, r0, 0, x1, r1, h, (wall, 0.2), 'shed_wall')
    x = x0
    while x < x1 - 0.05:
        k.box(x, r1, 0.02, x + 0.02, r1 + 0.02, h, shade(wall, 0.72), 'shed_seam')
        x += 0.2
    k.quads([((x0 - 0.1, r1 + 0.18, h), (x1 + 0.1, r1 + 0.18, h), (x1 + 0.1, r0 - 0.1, h + 0.35), (x0 - 0.1, r0 - 0.1, h + 0.35))], (roof, 0.18), 'roof_shed')
    k.box(x0 + 0.2, r1, 0.0, x0 + 0.62, r1 + 0.04, 1.05, (shade(wall, 0.8), 0.15), 'shed_door')
    k.box(x1 - 0.55, r1, 0.65, x1 - 0.2, r1 + 0.04, 0.95, '#2a3440', 'shed_window')
    k.cyl(x1 + 0.22, r1 - 0.2, 0.0, 0.55, 0.2, ('#3a5a3a', 0.1), 'water_butt', verts=12)
    k.solid(x0, r0, x1 + 0.45, r1 + 0.1)


def stook(k, cx, cr):
    """Sheaves of cut corn propped together in a little tent, as they're left to dry."""
    for i in range(6):
        a = i * math.tau / 6 + k.rng.uniform(-0.2, 0.2)
        k.tube((cx + math.cos(a) * 0.22, cr + math.sin(a) * 0.18, 0.0), (cx, cr, 0.62), 0.07, ('#d8b860', 0.25), 'stook', rb=0.03, verts=6)
    k.cone(cx, cr, 0.5, 0.78, 0.12, 0.02, ('#e8c870', 0.25), 'stook', verts=6)
    k.solid(cx - 0.3, cr - 0.25, cx + 0.3, cr + 0.25)


def field_gate(k, cx, cr, w=1.1):
    """A five-bar gate between two posts, standing open a little."""
    for s in (-1, 1):
        k.box(cx + s * w / 2 - 0.06, cr - 0.06, 0, cx + s * w / 2 + 0.06, cr + 0.06, 0.95, (WOOD_D, 0.15), 'gate_post')
    for z in (0.18, 0.34, 0.5, 0.66, 0.82):
        k.box(cx - w / 2 + 0.06, cr - 0.025, z, cx + w / 2 - 0.06, cr + 0.025, z + 0.06, ('#a8946c', 0.15), 'gate')
    k.tube((cx - w / 2 + 0.06, cr, 0.18), (cx + w / 2 - 0.06, cr, 0.86), 0.025, '#a8946c', 'gate', verts=4)


# ---- building on rolling ground ---------------------------------------------------------------------------------------------
def lift(k, since, dz, lights_since=None):
    """Raise everything built since len(k.parts) == since by dz (onto the land there). Moves each object's location, so
    there's no scene update per call (I.pose's) — over a countryside of hundreds of things that matters."""
    if not dz:
        return
    for p in k.parts[since:]:
        p['obj'].location.z += dz
    for L in k.lights[(len(k.lights) if lights_since is None else lights_since):]:
        L['obj'].location.z += dz


def on(k, height, fn, x, r, *a, **kw):
    """fn(k, x, r, …) built on the ground at (x, r) — lifted to height(x, r)."""
    sp, sl = len(k.parts), len(k.lights)
    out = fn(k, x, r, *a, **kw)
    lift(k, sp, height(x, r), sl)
    return out


# ---- the Downs: a flower farm, cider, sheep, the chalk horse -----------------------------------------------------------------
FLOWERS = {
    'dahlia':    (('#c83a5a', '#e86a3a', '#f0c040', '#a0306a'), 0.5, 0.11),
    'sweetpea':  (('#e8a0d0', '#b080e0', '#f0f0f0', '#e06090'), 0.75, 0.06),
    'sunflower': (('#f8c820',), 1.05, 0.14),
    'lavender':  (('#8a70c8', '#a088d8'), 0.32, 0.04),
    'zinnia':    (('#f05030', '#f0a020', '#e83a80', '#f0e040'), 0.4, 0.08),
    'cosmos':    (('#f0a0c0', '#ffffff', '#c83a7a'), 0.55, 0.07),
    'moonflower': (('#eef2ff',), 0.45, 0.09),
}


def flower_row(k, x0, x1, cr, kind):
    """A cutting-garden row of one flower along the columns: leafy stems in a ridge, blooms over them. Moonflowers glow
    (their pale trumpets catch the lamp pass at night)."""
    cols, h, s = FLOWERS[kind]
    rng = k.rng
    k.cyl_x(x0, x1, cr, 0.02, 0.18, 0.05, (shade(F.EARTH, 0.95), 0.08), 'field_ridge', verts=8)
    with k.foliage('leaf'):
        x = x0 + 0.1
        while x < x1 - 0.05:
            k.blob(x, cr, h * 0.35, 0.12, 0.1, h * 0.35, (shade('#4a7a34', rng.uniform(0.85, 1.1)), 0.2), 'flower_leaves', segs=7)
            x += 0.2
    x = x0 + 0.12
    while x < x1 - 0.08:
        hh = h * rng.uniform(0.8, 1.1)
        k.cone(x, cr + rng.uniform(-0.06, 0.06), 0.0, hh, 0.012, 0.006, '#3a6a2a', 'stem', verts=3)
        col = rng.choice(cols)
        if kind == 'moonflower':
            k.sphere(x, cr + 0.05, hh, s, s * 0.6, col, 'moonflower', emit=('#c8d8ff', 0.9), segs=7)
        elif kind == 'sunflower':
            k.cyl_y(x, cr + 0.02, cr + 0.06, hh, s, s, (col, 0.15), 'bloom', verts=10)
            k.cyl_y(x, cr + 0.05, cr + 0.08, hh, s * 0.45, s * 0.45, ('#5a3010', 0.15), 'bloom_eye', verts=8)
        else:
            k.sphere(x, cr + rng.uniform(-0.04, 0.04), hh, s, s * 0.8, (col, 0.15), 'bloom', segs=6)
        x += rng.uniform(0.14, 0.24) if kind != 'sunflower' else 0.32
    k.solid(x0, cr - 0.25, x1, cr + 0.25)


def sweetpea_frame(k, x0, x1, cr):
    """Hazel poles in an A along a row, sweet peas climbing them."""
    x = x0
    while x <= x1 + 1e-6:
        for s in (-1, 1):
            k.tube((x, cr + s * 0.18, 0.0), (x, cr, 1.0), 0.012, '#8a6a44', 'hazel', verts=4)
        x += 0.5
    k.tube((x0, cr, 0.98), (x1, cr, 0.98), 0.012, '#8a6a44', 'hazel', verts=4)
    flower_row(k, x0, x1, cr, 'sweetpea')


def press_barn(k, x0, x1, r_back, r_front, roof='#7a3a2a', wall='#c8b898'):
    """An open-fronted barn on stone piers, the old twin-screw cider press inside, barrels along the back, apple
    pomace in a tub, a heap of apples in front."""
    h = 2.0
    k.box(x0, r_back, 0, x1, r_back + 0.3, h, (wall, 0.16), 'barn_wall')
    for xx in (x0, x1 - 0.3):
        k.box(xx, r_back, 0, xx + 0.3, r_front, h, (wall, 0.16), 'barn_wall')
    x = x0 + 0.15
    while x < x1:
        k.box(x - 0.12, r_front - 0.24, 0, x + 0.12, r_front, h, ('#8a8274', 0.16), 'pier', bevel=0.02)
        x += (x1 - x0 - 0.3) / 3
    W._gable_roof(k, x0, x1, r_back, r_front, h, 1.1, roof, over=0.3)
    cx = (x0 + x1) / 2
    k.box(cx - 0.7, r_back + 0.9, 0, cx + 0.7, r_back + 1.9, 0.5, (W.WOOD_D, 0.15), 'press_bed')
    for s in (-1, 1):
        k.box(cx + s * 0.6 - 0.1, r_back + 1.3, 0.5, cx + s * 0.6 + 0.1, r_back + 1.5, 1.8, (W.WOOD_D, 0.15), 'press_post')
        k.cyl(cx + s * 0.3, r_back + 1.4, 0.9, 1.75, 0.05, ('#3a3a3a', 0.1), 'press_screw', verts=8)
    k.box(cx - 0.75, r_back + 1.25, 1.75, cx + 0.75, r_back + 1.55, 1.95, (W.WOOD_D, 0.15), 'press_beam')
    k.box(cx - 0.5, r_back + 1.05, 0.5, cx + 0.5, r_back + 1.75, 0.85, ('#b88a4a', 0.2), 'cheese_press')
    for i in range(4):
        k.box(cx - 0.5, r_back + 1.05, 0.55 + i * 0.08, cx + 0.5, r_back + 1.75, 0.57 + i * 0.08, ('#e8dcc0', 0.1), 'press_cloth')
    for i in range(int((x1 - x0 - 0.8) / 0.55)):
        barrel(k, x0 + 0.65 + i * 0.55, r_back + 0.55, h=0.62, radius=0.24, upright=i % 3 != 2)
    k.cyl(cx + 1.3, r_front - 0.8, 0.0, 0.4, 0.35, ('#7a5a34', 0.14), 'tub', verts=14)
    k.cyl(cx + 1.3, r_front - 0.8, 0.35, 0.38, 0.32, '#8a5a2a', 'pomace', verts=12)
    k.solid(x0, r_back, x1, r_front - 0.3)


def apple_heap(k, cx, cr, n=40, cols=('#c83a2a', '#d84a2a', '#e0a030', '#8ab040')):
    for i in range(n):
        a, d = k.rng.uniform(0, math.tau), k.rng.uniform(0, 0.4) ** 0.8
        z = max(0.0, 0.25 - d * 0.5) + k.rng.uniform(0, 0.05)
        k.sphere(cx + math.cos(a) * d, cr + math.sin(a) * d * 0.8, z + 0.05, 0.06, 0.055, (k.rng.choice(cols), 0.2), 'apple', segs=6)
    k.solid(cx - 0.4, cr - 0.35, cx + 0.4, cr + 0.35)


def sheep(k, cx, cr, facing=0.0, lying=False):
    """A sheep: a woolly body of clumps, a dark face and legs."""
    rng = k.rng
    c, s_ = math.cos(facing), math.sin(facing)
    z = 0.12 if lying else 0.32
    for i in range(9):
        dx, dr = rng.uniform(-0.18, 0.18), rng.uniform(-0.1, 0.1)
        k.blob(cx + dx * c - dr * s_, cr + dx * s_ * 0.8 + dr * c, z + rng.uniform(0.02, 0.12), 0.13, 0.11, 0.1,
               (shade('#ece6d8', rng.uniform(0.9, 1.05)), 0.2), 'wool', segs=7)
    hx, hr = cx + 0.28 * c, cr + 0.28 * s_ * 0.8
    k.blob(hx, hr, z + 0.12, 0.08, 0.07, 0.07, ('#2a2420', 0.15), 'sheep_face', segs=8)
    for s in (-1, 1):
        k.blob(hx - 0.03 * c + s * 0.06 * s_, hr + s * 0.06 * c, z + 0.17, 0.04, 0.02, 0.02, '#2a2420', 'sheep_ear', segs=5)
    if not lying:
        for (a, b) in ((0.14, 0.07), (0.14, -0.07), (-0.14, 0.07), (-0.14, -0.07)):
            k.cyl(cx + a * c - b * s_, cr + a * s_ * 0.8 + b * c, 0.0, 0.25, 0.025, '#2a2420', 'sheep_leg', verts=5)


def duck(k, cx, cr, z, col='#f4f0e4'):
    k.blob(cx, cr, z + 0.05, 0.1, 0.07, 0.06, (col, 0.15), 'duck', segs=8)
    k.sphere(cx + 0.08, cr, z + 0.13, 0.045, 0.045, ('#2e6a3a' if col != '#f4f0e4' else col, 0.15), 'duck', segs=6)
    k.cone(cx + 0.12, cr, z + 0.12, z + 0.13, 0.02, 0.0, '#f0a020', 'duck_bill', verts=4)


def post_box(k, cx, cr):
    k.cyl(cx, cr, 0.0, 0.95, 0.15, ('#c8281e', 0.06), 'post_box', verts=12)
    k.sphere(cx, cr, 0.95, 0.16, 0.08, ('#c8281e', 0.06), 'post_box', segs=10)
    k.box(cx - 0.08, cr + 0.13, 0.7, cx + 0.08, cr + 0.16, 0.73, '#1a1a1a', 'post_slot')
    k.box(cx - 0.06, cr + 0.13, 0.5, cx + 0.06, cr + 0.155, 0.6, '#f0e8c8', 'post_plate')
    k.solid(cx - 0.2, cr - 0.2, cx + 0.2, cr + 0.2)


def level_crossing(k, x0, x1, r0, r1):
    """Where the lane crosses the line: planks between the rails, a white gate each side swung back, a red disc."""
    k.box(x0 + 0.05, r0, 0.08, x1 - 0.05, r1, 0.13, ('#8a6a44', 0.2), 'crossing_planks')
    for x in (x0 - 0.3, x1 + 0.3):
        k.box(x - 0.06, r0 - 0.3, 0, x + 0.06, r0 - 0.18, 1.0, ('#efe6d2', 0.1), 'gate_post')
        for z in (0.35, 0.65, 0.9):
            k.box(x - 0.03, r0 - 0.3 - 1.3, z, x + 0.03, r0 - 0.24, z + 0.06, ('#efe6d2', 0.1), 'crossing_gate')
        k.cyl_y(x, r0 - 0.32, r0 - 0.3, 0.78, 0.1, 0.1, '#c8281e', 'crossing_disc', verts=10)


def windpump(k, cx, cr, h=3.0):
    """A windpump over a well: a lattice tower, a wheel of blades and a tail vane, a tank beside it."""
    for (dx, dr) in ((-0.3, -0.3), (0.3, -0.3), (-0.3, 0.3), (0.3, 0.3)):
        k.tube((cx + dx, cr + dr, 0.0), (cx + dx * 0.25, cr + dr * 0.25, h), 0.025, ('#5a5a5e', 0.1), 'windpump', verts=4)
    for z in (0.8, 1.6, 2.3):
        f = 1 - z / h * 0.75
        k.box(cx - 0.3 * f, cr - 0.3 * f, z, cx + 0.3 * f, cr + 0.3 * f, z + 0.03, ('#5a5a5e', 0.1), 'windpump')
    for i in range(14):
        a = i * math.tau / 14
        k.quads([((cx, cr + 0.12, h), (cx + math.cos(a) * 0.65, cr + 0.12, h + math.sin(a) * 0.65),
                  (cx + math.cos(a + 0.18) * 0.65, cr + 0.12, h + math.sin(a + 0.18) * 0.65), (cx, cr + 0.12, h))], ('#c8c8cc', 0.1), 'windpump_blade')
    k.box(cx - 0.02, cr - 0.9, h - 0.05, cx + 0.02, cr, h + 0.05, '#5a5a5e', 'windpump')
    k.box(cx - 0.01, cr - 1.0, h - 0.3, cx + 0.01, cr - 0.75, h + 0.3, ('#a8382a', 0.1), 'windpump_vane')
    k.cyl(cx + 0.9, cr, 0.0, 0.6, 0.4, ('#7a7a80', 0.1), 'tank', verts=14)
    k.solid(cx - 0.4, cr - 0.4, cx + 1.3, cr + 0.4)


def stile(k, cx, cr):
    k.box(cx - 0.35, cr - 0.05, 0.25, cx + 0.35, cr + 0.15, 0.3, (WOOD, 0.15), 'stile_step')
    for s in (-1, 1):
        k.box(cx + s * 0.4 - 0.05, cr - 0.05, 0, cx + s * 0.4 + 0.05, cr + 0.05, 0.95, (WOOD_D, 0.15), 'stile_post')
    for z in (0.45, 0.8):
        k.box(cx - 0.45, cr - 0.03, z, cx + 0.45, cr + 0.03, z + 0.06, (WOOD, 0.15), 'stile_rail')


# ---- Thistlecombe: the honey-stone market town on the river -------------------------------------------------------------------
def buttercross(k, cx, cr, w=4.4, d=3.0, roof='#8a8070', stone=HONEY):
    """The market hall: a stone-tiled roof on squat round pillars, open all round, a lantern on the ridge, the flagged
    floor where the stalls go on market day."""
    x0, x1, r0, r1 = cx - w / 2, cx + w / 2, cr - d / 2, cr + d / 2
    rng = k.rng
    r = r0
    while r < r1 - 0.05:                                                       # flags
        h = min(rng.uniform(0.4, 0.6), r1 - r)
        x = x0
        while x < x1 - 0.05:
            ww = min(rng.uniform(0.5, 0.9), x1 - x)
            k.box(x + 0.02, r + 0.02, -0.02, x + ww - 0.02, r + h - 0.02, 0.04, (shade('#c8b48a', rng.uniform(0.88, 1.1)), 0.14), 'floor_market', bevel=0.012)
            x += ww
        r += h
    for x in [x0 + 0.25 + i * (w - 0.5) / 3 for i in range(4)]:
        for rr in (r0 + 0.25, r1 - 0.25):
            k.cyl(x, rr, 0.0, 0.25, 0.22, (shade(stone, 0.92), 0.16), 'pillar_base', verts=12)
            k.cyl(x, rr, 0.25, 1.75, 0.16, (stone, 0.16), 'pillar', verts=12)
            k.cyl(x, rr, 1.75, 1.9, 0.22, (shade(stone, 1.06), 0.12), 'pillar_cap', verts=12)
            k.solid_post(x, rr)
    k.box(x0 - 0.1, r0 - 0.1, 1.9, x1 + 0.1, r1 + 0.1, 2.15, (shade(stone, 0.95), 0.16), 'beam')
    W._gable_roof(k, x0 - 0.1, x1 + 0.1, r0 - 0.1, r1 + 0.1, 2.15, 1.2, roof, over=0.35)
    rm = (r0 + r1) / 2
    k.box(cx - 0.18, rm - 0.18, 3.25, cx + 0.18, rm + 0.18, 3.6, ('#efe6d2', 0.1), 'cupola')
    k.cone(cx, rm, 3.6, 3.95, 0.26, 0.0, (roof, 0.12), 'roof_cupola', verts=4)
    k.tube((cx, rm, 3.95), (cx, rm, 4.25), 0.012, '#2a2a2a', 'weathervane', verts=4)
    k.box(cx - 0.14, rm - 0.01, 4.12, cx + 0.14, rm + 0.01, 4.2, '#2a2a2a', 'weathervane')


def spire_church(k, x0, x1, r_back, r_front, stone=HONEY, roof='#8a8070'):
    """A honey-stone church: a nave under a stone-slate roof with tall pointed windows, and a west tower with a spire."""
    HKH = __import__('assets_house')
    tw = 2.0
    tx0 = x0
    HKH.rich_house(k, x0 + tw - 0.2, x1, r_back, r_front - 0.4, wall_h=2.6, rise=1.8, roof=roof, wall=stone, door_x=None, stone=True)
    for wx in [x0 + tw + 0.8 + i * 1.2 for i in range(int((x1 - x0 - tw - 1.2) / 1.2))]:
        k.box(wx - 0.2, r_front - 0.4 + 0.02, 0.8, wx + 0.2, r_front - 0.4 + 0.06, 2.1, '#3a4a6a', 'church_window', emit=('#e0b070', 0.4))
        k.cyl_y(wx, r_front - 0.4 + 0.02, r_front - 0.4 + 0.06, 2.1, 0.2, 0.2, '#3a4a6a', 'church_window', emit=('#e0b070', 0.4), verts=10)
    k.box(tx0, r_front - tw, 0, tx0 + tw, r_front, 4.6, (stone, 0.16), 'tower')
    z, i = 0.0, 0
    while z < 4.5:
        x = tx0 + (0.0 if i % 2 else 0.22)
        while x < tx0 + tw:
            k.box(max(x, tx0), r_front - 0.02, z + 0.02, min(x + 0.44, tx0 + tw), r_front + 0.01, z + 0.26, (shade(stone, rng_u(k)), 0.14), 'tower_block')
            x += 0.46
        z, i = z + 0.28, i + 1
    for (a, b) in ((0.0, 0.18), (tw - 0.18, tw)):
        k.box(tx0 + a, r_front - 0.04, 4.6, tx0 + b, r_front + 0.04, 4.95, (stone, 0.14), 'parapet')
    W.door(k, tx0 + tw / 2, r_front, w=0.7, h=1.4, col='#4a2e1a', arch=True)
    k.box(tx0 + tw / 2 - 0.12, r_front + 0.01, 3.2, tx0 + tw / 2 + 0.12, r_front + 0.04, 3.9, '#2a2a30', 'belfry_louvre')
    station_clock(k, tx0 + tw / 2, r_front, 2.5, rad=0.3)
    cxs, crs = tx0 + tw / 2, r_front - tw / 2
    k.cone(cxs, crs, 4.6, 8.4, tw * 0.62, 0.02, (roof, 0.12), 'roof_spire', verts=8)
    k.tube((cxs, crs, 8.4), (cxs, crs, 8.9), 0.015, '#c8a040', 'weathercock', verts=4)
    k.box(cxs - 0.16, crs - 0.01, 8.75, cxs + 0.16, crs + 0.01, 8.88, '#c8a040', 'weathercock')
    k.solid(tx0, r_front - tw, tx0 + tw, r_front)


def rng_u(k):
    return k.rng.uniform(0.86, 1.1)


def quay(k, x0, x1, r_top, z_top=0.0, z_water=-0.45, tone=HONEY_D):
    """A dressed-stone quay face along the river: courses of blocks down to the water, a coping of big slabs, iron
    mooring rings, steps down at one end."""
    rng = k.rng
    k.box(x0, r_top - 0.1, z_water - 0.3, x1, r_top + 0.15, z_top, (shade(tone, 0.6), 0.2), 'quay_core')
    z, i = z_water - 0.2, 0
    while z < z_top - 0.12:
        x = x0 - (0.0 if i % 2 else 0.3)
        hh = 0.2
        while x < x1:
            w = rng.uniform(0.5, 0.8)
            k.box(max(x, x0) + 0.015, r_top + 0.15, z + 0.015, min(x + w, x1) - 0.015, r_top + 0.19, z + hh - 0.015,
                  (shade(tone, rng.uniform(0.82, 1.08)), 0.16), 'quay_block')
            x += w
        z, i = z + hh, i + 1
    x = x0
    while x < x1:
        w = rng.uniform(0.7, 1.1)
        k.box(x + 0.02, r_top - 0.35, z_top - 0.02, min(x + w, x1) - 0.02, r_top + 0.24, z_top + 0.06, (shade('#c8b48a', rng.uniform(0.9, 1.08)), 0.12), 'copestone', bevel=0.015)
        x += w
    for x in [x0 + 1.5 + j * 3.0 for j in range(int((x1 - x0 - 1.0) / 3.0))]:
        k.cyl(x, r_top + 0.05, z_top + 0.06, z_top + 0.3, 0.07, ('#2a2a2a', 0.08), 'bollard', verts=8)
        k.sphere(x, r_top + 0.05, z_top + 0.3, 0.08, 0.05, '#2a2a2a', 'bollard', segs=8)


def ferry(k, cx, cr, z, length=3.2, beam=1.3):
    """The river ferry: a flat chain ferry with low rails and a little wheelhouse, a pole leaning on it."""
    x0, x1 = cx - length / 2, cx + length / 2
    k.box(x0, cr - beam / 2, z - 0.1, x1, cr + beam / 2, z + 0.12, ('#3a4a5a', 0.15), 'ferry_hull')
    r = cr - beam / 2 + 0.04
    while r < cr + beam / 2 - 0.05:
        k.box(x0 + 0.1, r, z + 0.12, x1 - 0.1, r + 0.14, z + 0.15, (shade('#9a7448', k.rng.uniform(0.85, 1.08)), 0.2), 'ferry_deck')
        r += 0.16
    for rr in (cr - beam / 2, cr + beam / 2 - 0.05):
        k.box(x0 + 0.1, rr, z + 0.15, x1 - 0.1, rr + 0.05, z + 0.5, ('#efe6d2', 0.1), 'ferry_rail')
    k.box(cx + 0.6, cr - 0.3, z + 0.15, cx + 1.3, cr + 0.3, z + 1.1, ('#2e5a3e', 0.12), 'ferry_cabin')
    k.box(cx + 0.55, cr - 0.35, z + 1.1, cx + 1.35, cr + 0.35, z + 1.2, ('#c84a3a', 0.12), 'ferry_roof')
    k.box(cx + 0.7, cr + 0.3, z + 0.6, cx + 1.2, cr + 0.31, z + 0.9, '#a8c8d8', 'ferry_window')
    k.tube((x0 - 3.0, cr, z + 0.3), (x1 + 3.0, cr, z + 0.3), 0.012, '#5a5a5a', 'ferry_chain', verts=4)
    k.tube((x0 + 0.3, cr + 0.3, z + 0.15), (x0 + 0.1, cr + 0.4, z + 1.6), 0.02, '#8a6a44', 'ferry_pole', verts=5)


def crates_stamped(k, cx, cr, n=4, col='#a87a4a', stamp='#2a6a8a'):
    """Produce crates stacked for shipping, a blue stencil on each (the Arcadia packing house's)."""
    for i in range(n):
        x, r, z = cx + (i % 2) * 0.5, cr + (i // 4) * 0.5, ((i // 2) % 2) * 0.42
        k.box(x - 0.22, r - 0.2, z, x + 0.22, r + 0.2, z + 0.4, (shade(col, k.rng.uniform(0.9, 1.08)), 0.15), 'crate', bevel=0.01)
        k.box(x - 0.12, r + 0.2, z + 0.12, x + 0.12, r + 0.21, z + 0.28, stamp, 'crate_stamp')
    k.solid(cx - 0.3, cr - 0.25, cx + 0.8, cr + 0.25 + 0.5 * ((n - 1) // 4))


def cargo_pod(k, cx, cr):
    """The produce run's cargo pod on its pad: a fat white capsule with a blue band, landing legs, its hatch open."""
    k.cyl(cx, cr, -0.01, 0.03, 1.5, ('#b8b0a0', 0.1), 'pad', verts=24)
    k.cyl(cx, cr, 0.03, 0.04, 1.3, ('#e8c040', 0.1), 'pad_ring', verts=24)
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        k.tube((cx + math.cos(a) * 0.5, cr + math.sin(a) * 0.4, 0.6), (cx + math.cos(a) * 0.95, cr + math.sin(a) * 0.75, 0.04), 0.04, '#5a5a62', 'pod_leg', verts=5)
    k.blob(cx, cr, 1.2, 0.75, 0.62, 0.85, ('#eceae4', 0.08), 'pod', segs=16)
    k.cyl(cx, cr, 1.05, 1.3, 0.77, ('#2a6a8a', 0.08), 'pod_band', verts=20, ry=0.64)
    k.box(cx - 0.25, cr + 0.6, 0.55, cx + 0.25, cr + 0.66, 1.25, '#2a2a30', 'pod_hatch')
    k.box(cx - 0.3, cr + 0.66, 0.04, cx + 0.3, cr + 1.3, 0.1, ('#8a8a92', 0.1), 'pod_ramp')
    k.sphere(cx, cr, 2.05, 0.07, 0.07, '#ff6050', 'pod_light', emit=('#ff6050', 2.0), segs=6)
    k.solid(cx - 1.0, cr - 0.8, cx + 1.0, cr + 0.6)


def roaster(k, cx, cr):
    """A coffee roaster's drum on its stand by the shop door, sacks of green beans, a chimney pipe."""
    k.box(cx - 0.35, cr - 0.25, 0.0, cx + 0.35, cr + 0.25, 0.6, ('#2a2a30', 0.1), 'roaster_stand')
    k.cyl_x(cx - 0.35, cx + 0.35, cr, 0.85, 0.28, 0.28, ('#a8382a', 0.08), 'roaster_drum', verts=16)
    k.cyl_y(cx + 0.38, cr - 0.05, cr + 0.05, 0.85, 0.2, 0.2, ('#c8a040', 0.06), 'roaster_face', verts=14)
    k.tube((cx - 0.2, cr - 0.1, 1.1), (cx - 0.2, cr - 0.4, 2.2), 0.06, '#5a5a62', 'roaster_flue', verts=8)
    V.sacks(k, cx + 0.8, cr + 0.1, n=3, col=('#8a9a6a', '#7a8a5a', '#9aa87a'))
    k.solid(cx - 0.4, cr - 0.3, cx + 1.2, cr + 0.4)


def candle_rack(k, x0, x1, cr):
    """Tapers hanging in pairs by their wicks from a rack to cool, and a row of pillar candles on a shelf."""
    for x in (x0, x1):
        k.box(x - 0.04, cr - 0.04, 0, x + 0.04, cr + 0.04, 1.4, (WOOD_D, 0.15), 'rack_post')
    k.box(x0, cr - 0.03, 1.36, x1, cr + 0.03, 1.42, (WOOD, 0.15), 'rack_bar')
    x = x0 + 0.15
    while x < x1 - 0.1:
        col = k.rng.choice(('#f4e8b0', '#f0d880', '#e8c860', '#f4f0e0'))
        for dx in (-0.03, 0.03):
            k.cyl(x + dx, cr, 0.7, 1.32, 0.02, (col, 0.1), 'taper', verts=6)
        x += 0.14
    k.box(x0, cr + 0.2, 0.5, x1, cr + 0.4, 0.54, (WOOD, 0.15), 'shelf')
    x = x0 + 0.15
    while x < x1 - 0.1:
        k.cyl(x, cr + 0.3, 0.54, 0.54 + k.rng.uniform(0.15, 0.3), 0.07, (k.rng.choice(('#f4e8b0', '#e8c860', '#f0a0a0', '#a0c8a0')), 0.1), 'candle', verts=8)
        x += 0.18
    k.solid(x0, cr - 0.1, x1, cr + 0.45)


def pots_display(k, x0, x1, cr):
    """The potter's wares on a trestle: jugs, bowls and mugs in glazes."""
    k.box(x0, cr - 0.25, 0.65, x1, cr + 0.25, 0.7, (WOOD, 0.15), 'trestle_top')
    for x in (x0 + 0.1, x1 - 0.1):
        k.box(x - 0.03, cr - 0.2, 0, x + 0.03, cr + 0.2, 0.65, (WOOD_D, 0.15), 'trestle_leg')
    x = x0 + 0.18
    while x < x1 - 0.15:
        col = k.rng.choice(('#2a5a9a', '#3a7a6a', '#c8b8a0', '#a05a3a', '#e0d8c8', '#6a8a4a'))
        kind = k.rng.random()
        if kind < 0.35:
            k.cyl(x, cr, 0.7, 0.98, 0.09, (col, 0.05), 'jug', verts=10)
        elif kind < 0.7:
            k.cyl(x, cr, 0.7, 0.8, 0.13, (col, 0.05), 'bowl', verts=12)
        else:
            k.cyl(x, cr, 0.7, 0.84, 0.06, (col, 0.05), 'mug', verts=8)
        x += 0.26
    k.solid(x0, cr - 0.3, x1, cr + 0.3)


def buffer_stop(k, cx, cr):
    """The end of the line: a timber beam on a steel frame, red and white, a lamp on top."""
    k.box(cx - 0.62, cr - 0.12, 0.25, cx + 0.62, cr + 0.12, 0.55, ('#c8281e', 0.1), 'buffer_beam')
    for s in (-1, 1):
        k.cyl_y(cx + s * 0.4, cr + 0.12, cr + 0.32, 0.4, 0.1, 0.1, ('#2a2a2a', 0.1), 'buffer', verts=10)
        k.tube((cx + s * 0.45, cr - 0.1, 0.5), (cx + s * 0.45, cr - 0.7, 0.0), 0.04, '#3a3a3a', 'buffer_strut', verts=5)
    k.box(cx - 0.6, cr + 0.12, 0.35, cx + 0.6, cr + 0.14, 0.45, '#f0ece0', 'buffer_stripe')
    k.cyl(cx, cr, 0.55, 0.75, 0.06, '#2a2a2a', 'buffer_lamp', verts=8)
    k.sphere(cx, cr + 0.06, 0.66, 0.04, 0.04, '#ff4030', 'buffer_light', emit=('#ff4030', 1.5), segs=6)
    k.solid(cx - 0.65, cr - 0.7, cx + 0.65, cr + 0.3)


def greenhouse(k, x0, x1, r0, r1, h=1.4, frame='#f0f0ec'):
    """A Victorian greenhouse: a low brick base, white glazing bars, pale green-tinted glass you can see the plants
    through (tomatoes up canes, trays of seedlings on staging), a ridge with a fretted cresting."""
    rng = k.rng
    k.box(x0, r0, 0.0, x1, r1, 0.35, ('#9a5a44', 0.16), 'brick_base')
    k.box(x0 + 0.1, r0 + 0.3, 0.35, x1 - 0.1, r0 + 0.7, 0.75, (WOOD, 0.15), 'staging')
    x = x0 + 0.25
    while x < x1 - 0.2:
        k.box(x - 0.1, r0 + 0.35, 0.75, x + 0.1, r0 + 0.65, 0.8, ('#5a3a20', 0.15), 'seed_tray')
        for j in range(3):
            k.sphere(x + rng.uniform(-0.07, 0.07), r0 + 0.5 + rng.uniform(-0.08, 0.08), 0.85, 0.04, 0.04, ('#5aa040', 0.2), 'seedling', segs=5)
        x += 0.28
    x = x0 + 0.35
    while x < x1 - 0.3:                                                    # tomatoes up their canes
        k.tube((x, r1 - 0.45, 0.35), (x, r1 - 0.45, 1.25), 0.01, '#8a6a44', 'cane', verts=4)
        with k.foliage('leaf'):
            k.blob(x, r1 - 0.45, 0.85, 0.12, 0.1, 0.38, (shade('#3e7a30', rng.uniform(0.9, 1.1)), 0.22), 'tomato_leaves', segs=7)
        for j in range(3):
            k.sphere(x + rng.uniform(-0.08, 0.08), r1 - 0.38, rng.uniform(0.55, 1.1), 0.035, 0.035, ('#d83a2a', 0.15), 'tomato', segs=5)
        x += 0.45
    rm = (r0 + r1) / 2
    glass = ('#cfe4d8', 0.02)
    for (a, b, c, d) in ((x0, r0, x1, r0 + 0.03), (x0, r1 - 0.03, x1, r1), (x0, r0, x0 + 0.03, r1), (x1 - 0.03, r0, x1, r1)):
        k.box(a, b, 0.35, c, d, h, glass, 'glass')
    for s in (-1, 1):
        rr = r0 if s < 0 else r1
        k.poly([(x0, rr, h), (x1, rr, h), (x1, rm, h + 0.55), (x0, rm, h + 0.55)], glass, 'glass_roof')
    n = max(3, int((x1 - x0) / 0.45))
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        for rr in (r0, r1):
            k.box(x - 0.02, rr - 0.025, 0.35, x + 0.02, rr + 0.025, h, frame, 'glazing_bar')
        k.tube((x, r0, h), (x, rm, h + 0.55), 0.016, frame, 'glazing_bar', verts=4)
        k.tube((x, r1, h), (x, rm, h + 0.55), 0.016, frame, 'glazing_bar', verts=4)
    for z in (h, 0.85):
        for rr in (r0, r1):
            k.box(x0, rr - 0.025, z - 0.02, x1, rr + 0.025, z + 0.02, frame, 'glazing_bar')
    k.box(x0, rm - 0.03, h + 0.52, x1, rm + 0.03, h + 0.6, frame, 'ridge')
    x = x0 + 0.1
    while x < x1:
        k.cone(x, rm, h + 0.6, h + 0.72, 0.03, 0.0, frame, 'cresting', verts=4)
        x += 0.2
    k.box((x0 + x1) / 2 - 0.28, r1 - 0.01, 0.35, (x0 + x1) / 2 + 0.28, r1 + 0.02, 1.2, ('#e8e8e4', 0.08), 'gh_door')
    k.solid(x0, r0, x1, r1)
