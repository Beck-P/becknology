"""The cliff town kit — Lanternfall on the Sapphire Sea (Santorini: white houses and blue domes stacked round a drowned
caldera). Every function takes a Kit and builds at ground level facing south (r_front is the face you see); raise what
it built onto its terrace with `lift` (assets_isle.pose by dz), as the Millpond diorama lifts its farmhouse.

  import assets_cliff as CL
  CL.cube_house(k, x0, x1, r_back, r_front, h=1.5, wall=CL.WHITE, door_x=…, windows=[…], vault=False, …)
  CL.chapel(k, cx, r_back, r_front, w=2.2, dome=CL.BLUE)       a whitewashed chapel under a blue dome, a cross on top
  CL.bell_wall(k, x0, x1, r, h=1.7, bells=2)                    the pierced wall the bells hang in
  CL.parapet(k, x0, x1, r, h=0.4)  CL.parapet_y(k, x, r0, r1)   rounded whitewashed walls along a lane's edge
  CL.steps(k, x0, x1, r_top, r_bot, z_top, z_bot)               a flight down toward the viewer, white-edged treads
  CL.paving(k, x0, r0, x1, r1)                                  grey flags in white grout (a lane)
  CL.cave_house(k, cx, r_face, z)                               a white front dug into the cliff, lit windows, a little terrace
  CL.bougainvillea(k, x, r_face, z0, z1, w)                      magenta flowers climbing a wall
  CL.pots(k, cx, cr, n)  CL.donkey(k, cx, cr, facing)  CL.caique(k, cx, cr, length, hull)   small life

What makes it read as the place, not a Lumar village painted white: thick walls with soft, rounded edges (bevels),
flat roofs with low parapets or a barrel vault, deep-set small windows with blue louvred shutters, arched blue doors,
a whitewashed chimney with its little cap, steps up to the roof, pots of geraniums, bougainvillea, the odd ochre or
rose-washed house among the white (Oia), domes in a saturated blue, and white lines painted along every step's edge.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import assets_isle as I  # noqa: E402
import assets_town as W  # noqa: E402
import assets_house as HK  # noqa: E402
from scenekit import shade  # noqa: E402

WHITE = '#f2efe6'
WHITES = ('#f2efe6', '#efeadd', '#f4f2ec', '#ece6d8')
WASHES = ('#e8c890', '#e8b4a0', '#d8e0e8', '#f0dcb0', '#e4a888')      # Oia's ochres, rose and pale blue among the white
BLUE = '#2a5ad8'
BLUES = ('#2a5ad8', '#2048b8', '#3a6ae0', '#1e40a0')
TEAL = '#2a8a9a'
SHUTTERS = ('#2a5ad8', '#2048b8', '#2a8a9a', '#3a6ae0', '#7a3a2a', '#3a7a4a')
TERRACOTTA = ('#b0603a', '#9a5030', '#c07048')
STONE = '#9a9488'
PAVE = ('#7e7c7a', '#8a8784', '#74726f', '#94908a', '#6e6e70')
LAMP = '#ffc870'


def lift(k, z, fn, *a, **kw):
    """Build with fn at ground level, then raise everything it built (and its lights) by z."""
    sp, sl = len(k.parts), len(k.lights)
    out = fn(*a, **kw)
    if z:
        I.pose(k, sp, (0, 0, 0), dz=z, lights_since=sl)
    return out


# ---- the pieces of a house ----------------------------------------------------------------------------------------
def arched_door(k, cx, r_face, w=0.62, h=1.12, col=BLUE, frame=WHITE, lamp=True):
    """A door under a round arch, painted, in a white reveal, a step before it, a lamp beside it."""
    k.box(cx - w / 2 - 0.1, r_face - 0.02, 0.0, cx + w / 2 + 0.1, r_face + 0.06, h + 0.06, (frame, 0.12), 'door_reveal', bevel=0.03)
    k.box(cx - w / 2, r_face + 0.02, 0.0, cx + w / 2, r_face + 0.08, h - w / 2, (col, 0.1), 'door')
    k.cyl_y(cx, r_face + 0.02, r_face + 0.08, h - w / 2, w / 2, w / 2, (col, 0.1), 'door', verts=16)
    for dx in (-w / 4, w / 4):                                             # boards
        k.box(cx + dx - 0.01, r_face + 0.08, 0.05, cx + dx + 0.01, r_face + 0.09, h - w / 2 - 0.05, shade(col, 0.7), 'door_board')
    k.box(cx + w / 2 - 0.14, r_face + 0.08, 0.52, cx + w / 2 - 0.09, r_face + 0.12, 0.58, '#d0a048', 'door_ring')
    k.box(cx - w / 2 - 0.16, r_face, 0.0, cx + w / 2 + 0.16, r_face + 0.28, 0.07, (shade(WHITE, 0.92), 0.12), 'door_step', bevel=0.02)
    if lamp:
        lx = cx + w / 2 + 0.24
        k.box(lx - 0.02, r_face, 1.0, lx + 0.02, r_face + 0.16, 1.04, '#2a2a2c', 'lamp_bracket')
        W.lantern(k, lx, r_face + 0.17, 0.84, 1.04, s=0.075, energy=4)


def deep_window(k, cx, r_face, z0, w=0.42, h=0.5, shutters=BLUE, lit=True, arch=False):
    """A small window set deep in a thick white wall: dark (or lamplit) glass, a white sill, louvred shutters open."""
    k.box(cx - w / 2 - 0.05, r_face - 0.01, z0 - 0.05, cx + w / 2 + 0.05, r_face + 0.03, z0 + h + 0.05, (shade(WHITE, 0.82), 0.1), 'window_reveal')
    glass = ('#5a3a18', W.GLOW, 0.85) if lit else ('#1e2a3a', None, 0)
    k.box(cx - w / 2, r_face + 0.0, z0, cx + w / 2, r_face + 0.035, z0 + h, glass[0], 'window_glass',
          emit=(glass[1], glass[2]) if lit else None)
    if arch:
        k.cyl_y(cx, r_face - 0.01, r_face + 0.035, z0 + h, w / 2, w / 2 * 0.8, glass[0], 'window_glass',
                emit=(glass[1], glass[2]) if lit else None, verts=12)
    k.box(cx - 0.012, r_face + 0.03, z0, cx + 0.012, r_face + 0.05, z0 + h, '#e8e4dc', 'window_bar')
    k.box(cx - w / 2 - 0.08, r_face, z0 - 0.08, cx + w / 2 + 0.08, r_face + 0.13, z0 - 0.02, (WHITE, 0.1), 'sill')
    if shutters:
        HK.louvred(k, cx - w / 2 - 0.24, cx - w / 2 - 0.04, r_face + 0.02, z0, z0 + h, shutters)
        HK.louvred(k, cx + w / 2 + 0.04, cx + w / 2 + 0.24, r_face + 0.02, z0, z0 + h, shutters)
    if lit:
        k.point_light(cx, r_face + 0.6, z0 + h / 2, '#ffc070', 5, radius=0.2, group='flicker')


def chimney(k, cx, cr, z, h=0.55):
    """The Cycladic chimney: a white stack, a slab cap on four stubby posts, smoke-dark between them."""
    k.box(cx - 0.13, cr - 0.13, z, cx + 0.13, cr + 0.13, z + h, (WHITE, 0.15), 'chimney', bevel=0.04)
    k.box(cx - 0.1, cr - 0.1, z + h, cx + 0.1, cr + 0.1, z + h + 0.12, '#3a3632', 'chimney_mouth')
    k.box(cx - 0.19, cr - 0.19, z + h + 0.12, cx + 0.19, cr + 0.19, z + h + 0.18, (WHITE, 0.15), 'chimney_cap', bevel=0.03)


def bougainvillea(k, x, r_face, z0, z1, w=0.7, seed=0, bloom=('#d02a8a', '#e84aa8', '#b81870', '#f070c0')):
    """Bougainvillea up a wall and over the top: a twisted stem, green leaves (they turn with the seasons), clouds of
    magenta bracts over them."""
    rng = __import__('random').Random(seed * 131 + int(x * 7))
    k.tube((x, r_face + 0.06, 0.0), (x + 0.05, r_face + 0.08, z1 - 0.2), 0.03, '#5a3a22', 'vine_stem', verts=5)
    with k.foliage('leaf'):
        for i in range(10):
            zz = z0 + (z1 - z0) * rng.random()
            k.blob(x + rng.uniform(-w / 2, w / 2), r_face + 0.1, zz, rng.uniform(0.1, 0.17), 0.07, rng.uniform(0.08, 0.13),
                   (rng.choice(('#2e5a2a', '#3a6a30', '#28502a')), 0.3), 'vine_leaves', segs=7)
    for i in range(16):
        zz = z0 + (z1 - z0) * (0.35 + 0.65 * rng.random())
        k.blob(x + rng.uniform(-w / 2 - 0.05, w / 2 + 0.05), r_face + rng.uniform(0.11, 0.17), zz, rng.uniform(0.07, 0.13), 0.06,
               rng.uniform(0.06, 0.1), (rng.choice(bloom), 0.35), 'bougainvillea', segs=7)


def pots(k, cx, cr, n=3, seed=0, z=0.0):
    """A huddle of pots: terracotta and blue-painted, geraniums, a basil, a little olive."""
    rng = __import__('random').Random(seed * 17 + int(cx * 13 + cr * 7))
    for i in range(n):
        x = cx + (i - (n - 1) / 2) * 0.24 + rng.uniform(-0.04, 0.04)
        r = cr + rng.uniform(-0.06, 0.06)
        s = rng.uniform(0.07, 0.11)
        col = rng.choice(TERRACOTTA + (BLUE, WHITE))
        k.cone(x, r, z, z + s * 1.7, s * 0.8, s, (col, 0.25), 'pot', verts=10)
        kind = rng.random()
        if kind < 0.6:
            with k.foliage('leaf'):
                k.blob(x, r, z + s * 1.9, s * 1.1, s, s * 0.8, ('#2e5a2a', 0.3), 'pot_leaves', segs=8)
            for j in range(3):
                k.sphere(x + rng.uniform(-s, s) * 0.8, r + rng.uniform(-s, s) * 0.5 + 0.02, z + s * 2.3 + rng.uniform(0, 0.05),
                         0.03, 0.03, rng.choice(('#e02a3a', '#f04a6a', '#e8e0e0', '#d02a8a')), 'geranium', segs=6)
        else:
            with k.foliage('leaf'):
                k.blob(x, r, z + s * 2.6, s * 0.9, s * 0.9, s * 1.5, ('#4a6a3a', 0.3), 'pot_leaves', segs=8)


def roof_stair(k, x0, r_face, h, side=1, n=5, wall=WHITE):
    """Steps up the side of a house to its roof: a solid whitewashed flight against the front, a low wall on its open
    side, white-edged treads."""
    run = 0.26
    for i in range(n):
        xa = x0 + side * i * run
        z = h * (i + 1) / n
        a, b = sorted((xa, xa + side * run))
        k.box(a, r_face, 0.0, b, r_face + 0.42, z, (wall, 0.14), 'roof_step_body', bevel=0.02)
        k.box(a, r_face + 0.38, z - 0.02, b, r_face + 0.43, z + 0.005, '#ffffff', 'step_edge')
    a, b = sorted((x0, x0 + side * run * n))
    k.box(a, r_face + 0.42, 0.0, b, r_face + 0.5, 0.3, (wall, 0.14), 'roof_step_wall', bevel=0.02)


def cube_house(k, x0, x1, r_back, r_front, h=1.5, wall=WHITE, door_x=None, windows=(), windows_up=(), shutters=None,
               vault=False, vault_col=None, chimney_x=None, parapet=True, door_col=None, stair=None, vine=None,
               pots_at=(), seed=0, lit=True, upper=None):
    """A Cycladic house: thick walls with rounded edges in whitewash (or a wash), a flat roof with a low rounded
    parapet — or a barrel vault (vault=True; white, or blue) — a blue arched door, deep windows with shutters, a
    chimney with its cap, steps to the roof, bougainvillea, pots. windows: [(x, z0)] on the front; windows_up: the same
    for a tall house's upper floor. upper: (x0, x1, r_back, r_front, h) a smaller cube on the roof (a second storey set
    back). Returns the roof's height."""
    rng = __import__('random').Random(seed * 97 + int(x0 * 10))
    shutters = shutters or rng.choice(SHUTTERS)
    door_col = door_col or rng.choice(BLUES)
    k.box(x0, r_back, -0.02, x1, r_front, h, (wall, 0.05), 'house_wall', bevel=0.07)
    # weathering low on the wall: a band of damp, and a whitewash skirt a shade off-white (painted every Easter)
    k.box(x0 + 0.02, r_front - 0.01, -0.02, x1 - 0.02, r_front + 0.005, 0.16, (shade(wall, 0.9), 0.2), 'wall_skirt')
    if vault:
        vc = vault_col or WHITE
        k.cyl_x(x0 - 0.02, x1 + 0.02, (r_back + r_front) / 2, h, (r_front - r_back) / 2 + 0.02, 0.42, (vc, 0.2), 'roof_vault', verts=20)
        k.box(x0 - 0.04, r_back - 0.02, h - 0.02, x1 + 0.04, r_front + 0.02, h + 0.06, (WHITE, 0.15), 'roof_eave', bevel=0.03)
        top = h + 0.42
    else:
        k.box(x0 - 0.03, r_back - 0.03, h, x1 + 0.03, r_front + 0.03, h + 0.07, (shade(wall, 1.02), 0.04), 'roof_flat', bevel=0.04)
        top = h + 0.07
        if parapet:
            for (a, b, c, d) in ((x0, r_front - 0.14, x1, r_front), (x0, r_back, x1, r_back + 0.14),
                                 (x0, r_back, x0 + 0.14, r_front), (x1 - 0.14, r_back, x1, r_front)):
                k.box(a, b, h + 0.07, c, d, h + 0.27, (wall, 0.04), 'parapet', bevel=0.05)
        # what's up there: a water tank, a chair, washing on a line, a pot
        cx = (x0 + x1) / 2
        what = rng.random()
        if what < 0.3:
            k.cyl(cx + rng.uniform(-0.3, 0.3), (r_back + r_front) / 2, h + 0.07, h + 0.42, 0.2, ('#e8e4dc', 0.2), 'water_tank', verts=12)
        elif what < 0.55 and x1 - x0 > 1.4:
            ax, bx = x0 + 0.25, x1 - 0.25
            rr = (r_back + r_front) / 2
            for xx in (ax, bx):
                k.cyl(xx, rr, h + 0.07, h + 0.62, 0.015, '#6a5a4a', 'line_post', verts=5)
            xx = ax + 0.12
            while xx < bx - 0.15:
                k.box(xx, rr - 0.01, h + 0.3, xx + 0.16, rr + 0.01, h + 0.58, rng.choice(('#e8e8f0', '#2a5ad8', '#e8c890', '#e04a6a')), 'washing')
                xx += 0.24
        elif what < 0.75:
            pots(k, cx, (r_back + r_front) / 2, n=2, seed=seed + 3, z=h + 0.07)
    if upper:
        ux0, ux1, ur0, ur1, uh = upper
        k.box(ux0, ur0, h, ux1, ur1, h + uh, (wall, 0.05), 'house_wall', bevel=0.07)
        k.box(ux0 - 0.03, ur0 - 0.03, h + uh, ux1 + 0.03, ur1 + 0.03, h + uh + 0.07, (wall, 0.04), 'roof_flat', bevel=0.04)
        for (wx, wz) in windows_up:
            deep_window(k, wx, ur1, h + wz, shutters=shutters, lit=lit and rng.random() < 0.8)
        top = max(top, h + uh + 0.07)
    if door_x is not None:
        arched_door(k, door_x, r_front, col=door_col, h=min(1.15, h - 0.2))
    for (wx, wz) in windows:
        deep_window(k, wx, r_front, wz, shutters=shutters, lit=lit and rng.random() < 0.85)
    if not upper:
        for (wx, wz) in windows_up:
            deep_window(k, wx, r_front, wz, w=0.36, h=0.42, shutters=shutters, lit=lit and rng.random() < 0.7)
    if chimney_x is not None:
        chimney(k, chimney_x, r_back + 0.3, top - 0.02 if not vault else h + 0.2)
    if stair:                                       # (x_start, side): steps up the front to the roof
        roof_stair(k, stair[0], r_front, h, side=stair[1], wall=wall)
    if vine is not None:
        bougainvillea(k, vine, r_front, 0.6, h + 0.25, seed=seed)
    for (px, n) in pots_at:
        pots(k, px, r_front + 0.18, n=n, seed=seed + int(px))
    return top


# ---- chapels, bells, windmills ------------------------------------------------------------------------------------
def dome(k, cx, cr, z, rad, col=BLUE, cross=True, ribs=True):
    """A blue dome on a short white drum, ribbed, a small lantern and an iron cross on top."""
    k.cyl(cx, cr, z, z + 0.22, rad * 1.02, (WHITE, 0.15), 'dome_drum', verts=24)
    k.cyl(cx, cr, z + 0.2, z + 0.26, rad * 1.08, (WHITE, 0.15), 'dome_cornice', verts=24)
    k.sphere(cx, cr, z + 0.24, rad, rad * 0.95, (col, 0.12), 'roof_dome', segs=24)
    if ribs:
        for i in range(8):
            a = i * math.pi / 8 * 2
            k.tube((cx + math.cos(a) * rad * 0.99, cr + math.sin(a) * rad * 0.99, z + 0.26),
                   (cx + math.cos(a) * rad * 0.15, cr + math.sin(a) * rad * 0.15, z + 0.24 + rad * 0.93), 0.012, shade(col, 0.78), 'roof_dome_rib', verts=4)
    k.cyl(cx, cr, z + 0.22 + rad * 0.9, z + 0.22 + rad * 1.05, 0.08, (WHITE, 0.15), 'dome_lantern', verts=10)
    if cross:
        top = z + 0.22 + rad * 1.05
        k.box(cx - 0.015, cr - 0.015, top, cx + 0.015, cr + 0.015, top + 0.34, '#2a2a2c', 'cross')
        k.box(cx - 0.1, cr - 0.015, top + 0.2, cx + 0.1, cr + 0.015, top + 0.235, '#2a2a2c', 'cross')
    return z + 0.22 + rad


def bell_wall(k, x0, x1, r, z0=0.0, h=1.7, bells=2, col=WHITE):
    """The pierced belfry wall: a white wall stepping up to a crowned top, an arched opening for each bell, an iron
    cross over all."""
    t = 0.22
    n = bells
    w = x1 - x0
    k.box(x0, r - t / 2, z0, x1, r + t / 2, z0 + h, (col, 0.15), 'belfry', bevel=0.05)
    k.box(x0 + w * 0.3, r - t / 2, z0 + h, x1 - w * 0.3, r + t / 2, z0 + h + 0.36, (col, 0.15), 'belfry', bevel=0.05)
    k.cyl_y((x0 + x1) / 2, r - t / 2, r + t / 2, z0 + h + 0.36, w * 0.2, 0.16, (col, 0.15), 'belfry', verts=14)
    for i in range(n):
        bx = x0 + w * (i + 0.5) / n
        aw = min(0.32, w / n * 0.55)
        k.box(bx - aw / 2, r - t / 2 - 0.01, z0 + h - 0.78, bx + aw / 2, r + t / 2 + 0.01, z0 + h - 0.3, '#1e2430', 'belfry_hole')
        k.cyl_y(bx, r - t / 2 - 0.01, r + t / 2 + 0.01, z0 + h - 0.3, aw / 2, aw / 2, '#1e2430', 'belfry_hole', verts=12)
        k.cone(bx, r, z0 + h - 0.62, z0 + h - 0.36, aw * 0.38, aw * 0.12, ('#b08a3a', 0.25), 'bell', verts=12)
        k.box(bx - aw / 2, r - 0.02, z0 + h - 0.32, bx + aw / 2, r + 0.02, z0 + h - 0.29, '#3a3a40', 'bell_beam')
    top = z0 + h + 0.52
    k.box((x0 + x1) / 2 - 0.015, r - 0.015, top, (x0 + x1) / 2 + 0.015, r + 0.015, top + 0.3, '#2a2a2c', 'cross')
    k.box((x0 + x1) / 2 - 0.09, r - 0.015, top + 0.18, (x0 + x1) / 2 + 0.09, r + 0.015, top + 0.21, '#2a2a2c', 'cross')


def chapel(k, cx, r_back, r_front, w=2.2, h=1.5, dome_col=BLUE, door_col=None, bells=None, lit=True):
    """A whitewashed chapel: a cube nave, a blue dome on a drum, a blue door under a fanlight, two small windows, steps.
    bells: 'left' / 'right' — a bell wall against that side. Returns the dome's top."""
    x0, x1 = cx - w / 2, cx + w / 2
    k.box(x0, r_back, -0.02, x1, r_front, h, (WHITE, 0.05), 'chapel_wall', bevel=0.08)
    k.box(x0 - 0.04, r_back - 0.04, h, x1 + 0.04, r_front + 0.04, h + 0.1, (WHITE, 0.15), 'roof_flat', bevel=0.04)
    top = dome(k, cx, (r_back + r_front) / 2, h + 0.1, min(w, r_front - r_back) * 0.36, col=dome_col)
    arched_door(k, cx, r_front, w=0.6, h=1.1, col=door_col or dome_col, lamp=False)
    k.cyl_y(cx, r_front - 0.01, r_front + 0.04, 1.28, 0.16, 0.16, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.7) if lit else None, verts=12)
    for dx in (-w * 0.32, w * 0.32):
        deep_window(k, cx + dx, r_front, 0.62, w=0.22, h=0.42, shutters=None, lit=lit, arch=True)
    for dx in (-0.55, 0.55):                       # lamps either side of the door
        W.lantern(k, cx + dx, r_front + 0.14, 0.9, 1.08, s=0.07, energy=5)
    if bells:
        bx = x1 + 0.05 if bells == 'right' else x0 - 1.15
        bell_wall(k, bx, bx + 1.1, r_back + 0.5, h=h + 0.5)
    return top


def windmill(k, cx, cr, h=2.6, rad=0.75):
    """A Cycladic windmill: a squat round white tower, a conical thatch cap, eight spars with triangular cloth sails."""
    k.cyl(cx, cr, -0.02, h, rad, (WHITE, 0.05), 'mill_wall', verts=24, bevel=0.0)
    k.cyl(cx, cr, h - 0.04, h + 0.04, rad + 0.04, (WHITE, 0.15), 'mill_band', verts=24)
    k.cone(cx, cr, h + 0.02, h + 0.85, rad + 0.1, 0.06, ('#8a7450', 0.35), 'roof_thatch', verts=20)
    arched_door(k, cx, cr + rad - 0.02, w=0.5, h=0.95, col='#5a3a22', lamp=False)
    deep_window(k, cx - 0.2, cr + rad - 0.08, h - 0.8, w=0.2, h=0.26, shutters=None)
    hub = (cx, cr + rad + 0.15, h - 0.05)
    k.cyl_y(hub[0], cr + rad - 0.1, cr + rad + 0.25, hub[2], 0.06, 0.06, '#5a3a22', 'mill_axle', verts=8)
    for i in range(8):
        a = i * math.pi / 4 + 0.2
        L = 1.35
        tip = (hub[0] + math.cos(a) * L, hub[1] + 0.02, hub[2] + math.sin(a) * L)
        k.tube(hub, tip, 0.018, '#6a4a2a', 'mill_spar', verts=4)
        if i % 2 == 0 or True:
            b = a + 0.32
            sail_tip = (hub[0] + math.cos(b) * L * 0.92, hub[1] + 0.03, hub[2] + math.sin(b) * L * 0.92)
            mid = (hub[0] + math.cos(a) * 0.3, hub[1] + 0.03, hub[2] + math.sin(a) * 0.3)
            k.poly([mid, (tip[0], tip[1] + 0.01, tip[2]), sail_tip], ('#ece6d6', 0.3), 'mill_sail')


# ---- the ground, walls and steps ----------------------------------------------------------------------------------
def paving(k, x0, r0, x1, r1, z=0.0, seed=0, grout='#ece8de'):
    """A lane: grey flags of all sizes, courses that don't line up, set in white grout (the whitewashed outlines Cycladic
    towns paint round their paving stones), so a lane reads as a net of thin white lines. Built as a few batched parts
    (one per tone), so a whole town's lanes stay cheap."""
    rng = __import__('random').Random(seed * 7919 + int(x0 * 31 + r0 * 17))
    k.box(x0, r0, z - 0.1, x1, r1, z - 0.012, (grout, 0.2), 'paving_grout')
    groups = {}
    r = r0 + 0.02
    while r < r1 - 0.05:
        hgt = rng.choice((0.28, 0.34, 0.4, 0.46, 0.52))
        x = x0 + rng.uniform(-0.2, 0.0)
        while x < x1 - 0.05:
            w = rng.choice((0.34, 0.42, 0.5, 0.58, 0.7))
            dr = rng.uniform(-0.04, 0.04)
            a, b = max(x0 + 0.02, x + 0.034), min(x1 - 0.02, x + w - 0.034)
            c, d = max(r0 + 0.02, r + 0.034 + dr), min(r1 - 0.02, r + hgt - 0.034 + dr)
            if b - a > 0.08 and d - c > 0.08:
                groups.setdefault(rng.randrange(len(PAVE)), []).append((a, c, z - 0.04, b, d, z))
            x += w
        r += hgt
    for t, rects in groups.items():
        k.boxes(rects, (PAVE[t], 0.05), 'paving')


def parapet(k, x0, x1, r, h=0.42, t=0.2, z=0.0, col=WHITE, gaps=()):
    """A low whitewashed wall along a lane's edge, its top rounded, broken where gaps (x0, x1) leave a way through."""
    spans = [(x0, x1)]
    for (ga, gb) in gaps:
        nxt = []
        for (a, b) in spans:
            if gb <= a or ga >= b:
                nxt.append((a, b))
            else:
                if ga > a:
                    nxt.append((a, ga))
                if gb < b:
                    nxt.append((gb, b))
        spans = nxt
    for (a, b) in spans:
        if b - a < 0.05:
            continue
        k.box(a, r - t / 2, z - 0.05, b, r + t / 2, z + h, (col, 0.04), 'parapet', bevel=0.06)
        k.cyl_x(a, b, r, z + h, t / 2, 0.06, (col, 0.04), 'parapet', verts=10)


def parapet_y(k, x, r0, r1, h=0.42, t=0.2, z=0.0, col=WHITE):
    k.box(x - t / 2, r0, z - 0.05, x + t / 2, r1, z + h, (col, 0.04), 'parapet', bevel=0.06)


def retaining(k, x0, x1, r_face, z_bot, z_top, col=WHITE, stone=False, seed=0):
    """The face of a terrace: whitewashed (or rough stone where the town gives way to the cliff), from the terrace below
    up to this one, a darker damp line at its foot."""
    if stone:
        rng = __import__('random').Random(seed * 13 + int(x0 * 7))
        k.box(x0, r_face - 0.3, z_bot - 0.05, x1, r_face, z_top - 0.01, ('#6a5a50', 0.25), 'terrace_core')
        z = z_bot
        i = 0
        while z < z_top - 0.08:
            hh = rng.uniform(0.18, 0.26)
            x = x0 - (0.15 if i % 2 else 0.0)
            while x < x1:
                w = rng.uniform(0.3, 0.6)
                a, b = max(x, x0), min(x + w, x1)
                if b - a > 0.05:
                    k.box(a + 0.015, r_face - 0.02, z + 0.015, b - 0.015, r_face + 0.02 + rng.uniform(0, 0.02), min(z_top, z + hh) - 0.015,
                          (shade(rng.choice(('#8a7a6a', '#7a6a5e', '#9a8a78', '#6e5e54')), rng.uniform(0.85, 1.1)), 0.25), 'terrace_stone', bevel=0.012)
                x += w
            z += hh
            i += 1
    else:
        k.box(x0, r_face - 0.3, z_bot - 0.05, x1, r_face, z_top - 0.005, (col, 0.05), 'terrace_wall', bevel=0.04)
        k.box(x0, r_face - 0.005, z_bot - 0.05, x1, r_face + 0.01, z_bot + 0.12, (shade(col, 0.86), 0.2), 'wall_skirt')


def steps(k, x0, x1, r_top, r_bot, z_top, z_bot, n=None, col=STONE, cheeks=True, wall=WHITE):
    """A flight down toward the viewer from (r_top, z_top) to (r_bot, z_bot): stone treads, each edge painted white,
    whitewashed cheek walls either side."""
    n = n or max(3, int(round(abs(z_top - z_bot) / 0.2)))
    for i in range(n):
        ra = r_top + (r_bot - r_top) * i / n
        rb = r_top + (r_bot - r_top) * (i + 1) / n
        zt = z_top + (z_bot - z_top) * (i + 1) / n
        k.box(x0, ra, min(z_bot, zt) - 0.4, x1, rb, zt, (shade(col, 1.0 + 0.04 * ((i * 7) % 3 - 1)), 0.06), 'steps', bevel=0.015)
        k.box(x0 + 0.02, rb - 0.045, zt - 0.006, x1 - 0.02, rb + 0.002, zt + 0.004, '#ffffff', 'step_edge')
    if cheeks:
        for (a, b) in ((x0 - 0.18, x0), (x1, x1 + 0.18)):
            pts = []
            for i in range(n):
                ra = r_top + (r_bot - r_top) * i / n
                rb = r_top + (r_bot - r_top) * (i + 1) / n
                zt = z_top + (z_bot - z_top) * i / n
                k.box(a, ra, z_bot - 0.4, b, rb, zt + 0.32, (wall, 0.05), 'stair_wall', bevel=0.03)


def cave_house(k, cx, r_face, z, w=1.0, h=0.95, seed=0, lit=True):
    """A house dug into the cliff, as on Oia's caldera face: a white rounded front with a blue door and a lit window, a
    vaulted canopy over it, a tiny terrace with a parapet and a chair. Built at the face; z lifts it there."""
    rng = __import__('random').Random(seed * 41 + int(cx * 9))
    sp, sl = len(k.parts), len(k.lights)
    k.box(cx - w / 2, r_face - 0.35, -0.05, cx + w / 2, r_face, h, (rng.choice(WHITES + WASHES[:2]), 0.05), 'cave_front', bevel=0.08)
    k.cyl_x(cx - w / 2, cx + w / 2, r_face - 0.17, h, 0.2, 0.18, (WHITE, 0.16), 'roof_vault', verts=12)
    arched_door(k, cx - w * 0.18, r_face, w=0.36, h=0.8, col=rng.choice(BLUES), lamp=False)
    deep_window(k, cx + w * 0.24, r_face, 0.4, w=0.24, h=0.3, shutters=None, lit=lit, arch=True)
    k.box(cx - w / 2 - 0.05, r_face, -0.08, cx + w / 2 + 0.05, r_face + 0.42, 0.0, (WHITE, 0.15), 'cave_terrace', bevel=0.02)
    parapet(k, cx - w / 2 - 0.05, cx + w / 2 + 0.05, r_face + 0.38, h=0.24, t=0.1)
    W.lantern(k, cx + w * 0.02, r_face + 0.12, 0.7, 0.86, s=0.06, energy=3)
    if z:
        I.pose(k, sp, (0, 0, 0), dz=z, lights_since=sl)


# ---- small life ---------------------------------------------------------------------------------------------------
def donkey(k, cx, cr, facing=1, z=0.0, coat='#7a6a5e', blanket=('#c02a3a', '#2a5ad8', '#e8c040')):
    """A donkey for the steps: grey-brown, pale muzzle and belly, long ears, a striped blanket and a pannier each side."""
    f = facing
    k.blob(cx, cr, z + 0.42, 0.34, 0.15, 0.17, (coat, 0.35), 'donkey', segs=10)
    for (dx, dr) in ((-0.22, -0.07), (-0.22, 0.07), (0.2, -0.07), (0.2, 0.07)):
        k.cyl(cx + dx, cr + dr, z, z + 0.34, 0.035, (shade(coat, 0.8), 0.35), 'donkey_leg', verts=6)
    k.tube((cx + f * 0.28, cr, z + 0.5), (cx + f * 0.42, cr, z + 0.66), 0.07, (coat, 0.35), 'donkey', verts=8)
    k.blob(cx + f * 0.5, cr, z + 0.66, 0.12, 0.07, 0.07, (coat, 0.35), 'donkey', rot=(0, f * 0.5, 0), segs=8)
    k.sphere(cx + f * 0.6, cr, z + 0.63, 0.05, 0.05, '#c8bcb0', 'donkey_muzzle', segs=6)
    for dr in (-0.035, 0.035):
        k.tube((cx + f * 0.44, cr + dr, z + 0.72), (cx + f * 0.4, cr + dr * 2.5, z + 0.92), 0.025, (coat, 0.35), 'donkey_ear', verts=5, rb=0.012)
    k.tube((cx - f * 0.33, cr, z + 0.47), (cx - f * 0.4, cr, z + 0.28), 0.015, shade(coat, 0.6), 'donkey_tail', verts=4)
    k.box(cx - 0.18, cr - 0.17, z + 0.5, cx + 0.14, cr + 0.17, z + 0.6, (blanket[0], 0.3), 'donkey_blanket', bevel=0.02)
    k.box(cx - 0.18, cr - 0.175, z + 0.53, cx + 0.14, cr + 0.175, z + 0.56, blanket[2], 'donkey_blanket_stripe')
    for dr in (-0.2, 0.2):
        k.box(cx - 0.13, cr + dr - 0.05, z + 0.3, cx + 0.09, cr + dr + 0.05, z + 0.52, ('#8a6a3a', 0.35), 'pannier', bevel=0.02)


def caique(k, cx, cr, length=1.8, hull=BLUE, band=WHITE, z=0.0):
    """A little caique for the harbour: a pointed wooden boat, painted hull with a white band and a coloured rail,
    oars shipped, a net in the bow."""
    sp = len(k.parts)
    W.boat(k, cx, cr, length=length, hull=hull)
    k.blob(cx, cr, z + 0.17, 0.43, length / 2 + 0.01, 0.05, (band, 0.2), 'boat_band', segs=18)
    k.blob(cx, cr - length * 0.3, z + 0.22, 0.14, 0.18, 0.06, ('#a8946a', 0.4), 'net', segs=8)
    return sp
