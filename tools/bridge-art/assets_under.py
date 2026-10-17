"""Arcadia below the District — the Undercity and the Sump (scenekit, bpy). Tile units: x = column, r = row (toward the
camera), z = height.

Endless night under the District's underside: Kowloon-dense shanty stacks climbing out of the frame (`shanty`), the
city's great columns going up into the dark (`column`), fluorescent tubes (`fluoro`, green-white) and sodium lamps (`sodium`, orange) in the steam, wet concrete
(`concrete`) with puddles, drains and oil, hawker stalls under tarps (`stall`), oil-drum fires, chain-link, scrap, stairs
up and down. And below that, the Sump: black water (`canal`, part `canal_water` so the finish leaves it smooth) between
the towers' drowned feet, quays and mooring posts, boats.

What the engine animates is reported on a `Drips` (like assets_district.Street): streams of rain falling through the
grates (`drips`: [x, r, z] — a stream from height z down onto tile (x, r)), steam vents, and tubes that flicker
(`tubes`). The scene script puts them in the world JSON's `undercity` block (js/undercity.js draws them).
"""
import math

from scenekit import shade
import assets_cyber as Y
import assets_district as D

C45 = math.cos(math.radians(45))
SODIUM = '#ff9a3a'
SODIUM_L = '#ffb860'
FLUORO = '#c8ffdc'
TUBE_G = '#7affb0'
CONC = ['#3a3840', '#3c3942', '#36343c', '#3e3a44']
RUST = '#6a3a22'
TARP = ['#3a7ab8', '#c03a32', '#2e9a62', '#d09a2a', '#8a4aa0', '#4a6a8a']


class Drips:
    """What the engine animates below: drips through the grates, steam, flickering tubes (screen tiles)."""
    def __init__(self):
        self.drips = []
        self.steam = []
        self.tubes = []

    def drip(self, x, r, z):
        self.drips.append([round(x, 3), round(r, 3), round(z, 3)])

    def vent(self, x, r, z=0.0):
        self.steam.append([round(x, 3), round(r - z * C45, 3)])

    def tube(self, x0, x1, r, z):
        self.tubes.append([round(x0, 3), round(r - z * C45, 3), round(x1, 3)])


# ---- the ground ---------------------------------------------------------------------------------------------------------
def concrete(k, x0, r0, x1, r1, slab=1.0, tones=CONC, rng=None, stains=True):
    """Wet concrete in poured slabs: each slab its own tone, butted (no overlaps), joints a pixel dark, cracks, oil
    stains, patched squares, a faded lane line here and there. All `floor_*` parts: no line work in the ground."""
    rng = rng or k.rng
    k.box(x0, r0, -0.14, x1, r1, -0.03, '#111016', 'floor_sub')
    r = r0
    while r < r1 - 1e-6:
        x = x0 + (rng.uniform(-0.6, 0) if r > r0 else 0)
        x = max(x0, x)
        first = True
        while x < x1 - 1e-6:
            w = slab * rng.choice((0.75, 1.0, 1.0, 1.25)) if not first else slab * rng.uniform(0.4, 1.0)
            first = False
            xe, re = min(x1, x + w), min(r1, r + slab)
            t = shade(rng.choice(tones), rng.uniform(0.96, 1.04))
            k.box(x + 0.008, r + 0.008, -0.04, xe - 0.008, re - 0.008, 0.0, (t, 0.12), 'floor_concrete')
            x = xe
        r += slab
    if not stains:
        return
    area = (x1 - x0) * (r1 - r0)
    cracks = []
    for _ in range(int(area / 6)):                                    # hairline cracks wandering a little
        cx, cr = rng.uniform(x0 + 0.3, x1 - 0.3), rng.uniform(r0 + 0.3, r1 - 0.3)
        a = rng.uniform(0, math.pi)
        for _s in range(rng.randint(2, 4)):
            L = rng.uniform(0.15, 0.4)
            nx, nr = cx + math.cos(a) * L, cr + math.sin(a) * L * 0.8
            cracks.append((min(cx, nx), min(cr, nr), 0.0, max(cx, nx) + 0.02, max(cr, nr) + 0.02, 0.003))
            cx, cr, a = nx, nr, a + rng.uniform(-0.7, 0.7)
    if cracks:
        k.boxes(cracks, '#1c1a20', 'floor_crack')
    for _ in range(int(area / 40)):                                   # oil stains, a little darker and a little shiny
        cx, cr = rng.uniform(x0 + 0.5, x1 - 0.5), rng.uniform(r0 + 0.5, r1 - 0.5)
        s = rng.uniform(0.25, 0.6)
        k.cyl(cx, cr, 0.0, 0.002, s, ('#2c2a32', 0.2), 'floor_stain', verts=12, ry=s * rng.uniform(0.35, 0.6))
    for _ in range(int(area / 30)):                                   # a patched square
        cx, cr = rng.uniform(x0 + 0.5, x1 - 1.0), rng.uniform(r0 + 0.5, r1 - 1.0)
        k.box(cx, cr, 0.0, cx + rng.uniform(0.4, 0.9), cr + rng.uniform(0.3, 0.7), 0.004, (shade(rng.choice(tones), 1.15), 0.1), 'floor_patch')


def puddles(k, x0, r0, x1, r1, n, tints, rng=None):
    rng = rng or k.rng
    for _ in range(n):
        Y.puddle(k, rng.uniform(x0, x1), rng.uniform(r0, r1), rng.uniform(0.35, 0.9), rng.uniform(0.15, 0.32), tint=rng.choice(tints))


def drain(k, cx, cr, w=0.7):
    """A drain grate in the floor, a dark wet stain running to it."""
    k.cyl(cx, cr - 0.25, 0.0, 0.002, w * 0.9, ('#1e1c22', 0.2), 'floor_wet', verts=12, ry=0.5)
    k.box(cx - w / 2, cr - 0.14, 0.0, cx + w / 2, cr + 0.14, 0.008, '#0c0a10', 'floor_drain')
    k.boxes([(cx - w / 2 + 0.04 + i * 0.07, cr - 0.12, 0.008, cx - w / 2 + 0.07 + i * 0.07, cr + 0.12, 0.012) for i in range(int(w / 0.07) - 1)],
            '#3a3640', 'floor_drain_bars')


def grate_drip(k, dr, cx, cr, top=9.0, tint=FLUORO):
    """Where the rain comes through: a puddle under a stream falling from the dark (the engine draws the stream), a
    splash ring in the render, and a soft light down the shaft from the grate above."""
    Y.puddle(k, cx, cr, 0.55, 0.22, tint=tint)
    k.cyl(cx, cr, 0.0, 0.006, 0.12, '#0c0a14', 'puddle', emit=(tint, 0.4), verts=10, ry=0.06)
    dr.drip(cx, cr, top)


# ---- light ----------------------------------------------------------------------------------------------------------------
def fluoro(k, dr, cx, cr, z, w=1.1, col=FLUORO, energy=28, hang=None, dead=False):
    """A fluorescent tube in a steel batten, hung on two wires (`hang`: the wires' top) or fixed under a ledge."""
    k.box(cx - w / 2 - 0.04, cr - 0.05, z + 0.04, cx + w / 2 + 0.04, cr + 0.05, z + 0.1, ('#5a5a64', 0.06), 'fluoro_batten')
    k.cyl_x(cx - w / 2, cx + w / 2, cr, z + 0.0, 0.05, 0.05, shade(col, 0.6) if not dead else '#5a6058', 'fluoro_tube',
            emit=None if dead else (col, 1.0), verts=8)
    if hang:
        for s in (-1, 1):
            k.tube((cx + s * w * 0.4, cr, z + 0.1), (cx + s * w * 0.4, cr, hang), 0.006, '#14121a', 'fluoro_wire', verts=3)
    if not dead:
        k.point_light(cx, cr + 0.1, z - 0.15, col, energy, radius=0.4, group='flicker')
        dr.tube(cx - w / 2, cx + w / 2, cr, z)


def sodium(k, cx, cr, z=2.6, energy=60, face=None):
    """A sodium lamp: on a post (face None) or on a bracket off a wall facing the camera (face = the wall's row)."""
    if face is None:
        k.cyl(cx, cr, 0, 0.1, 0.13, '#24222a', 'lamp_base', verts=8)
        k.cyl(cx, cr, 0.1, z + 0.1, 0.04, ('#3a3842', 0.06), 'lamp_post', verts=8)
        k.box(cx - 0.03, cr - 0.03, z + 0.08, cx + 0.42, cr + 0.03, z + 0.13, '#3a3842', 'lamp_arm')
        hx = cx + 0.38
        k.solid_post(cx, cr)
    else:
        k.box(cx - 0.03, face, z + 0.08, cx + 0.03, face + 0.42, z + 0.13, '#3a3842', 'lamp_arm')
        hx, cr = cx, face + 0.38
    k.blob(hx, cr, z + 0.05, 0.16, 0.12, 0.06, ('#2a2830', 0.06), 'lamp_hood', segs=10)
    k.blob(hx, cr, z - 0.0, 0.12, 0.09, 0.04, '#5a3010', 'lamp_glass', emit=(SODIUM, 1.0), segs=10)
    k.point_light(hx, cr, z - 0.25, SODIUM_L, energy, radius=0.25, group='flicker')


def caged_bulb(k, cx, cr, z, col='#ffc070', energy=18, wire_to=None):
    if wire_to:
        k.tube((cx, cr, z + 0.08), (cx, cr, wire_to), 0.006, '#14121a', 'bulb_wire', verts=3)
    k.sphere(cx, cr, z, 0.06, 0.07, '#5a3a18', 'bulb', emit=(col, 1.0), segs=8)
    for a in range(4):
        x = cx + math.cos(a * math.pi / 2) * 0.075
        r = cr + math.sin(a * math.pi / 2) * 0.075
        k.tube((x, r, z - 0.08), (x, r, z + 0.08), 0.006, '#2a2830', 'bulb_cage', verts=3)
    k.point_light(cx, cr + 0.05, z - 0.1, col, energy, radius=0.1, group='flicker')


def neon_word(k, text, font, cx, r_face, z, size, col, energy=9, board=None):
    import assets_signs as SG
    SG.neon(k, text, font, cx, r_face, z, size=size, col=col, board=board, energy=energy)


# ---- the stacks -----------------------------------------------------------------------------------------------------------
CLAD = ['corrugated', 'tile', 'plain', 'ply', 'brick', 'corrugated', 'plain']
WALLS = ['#3a3236', '#2e3438', '#3a3a30', '#30283a', '#3c2e2a', '#2a3230', '#38343e', '#40362c']


def _clad(k, x0, x1, rf, z0, z1, wall, style, rng):
    if style == 'corrugated':
        ribs = [(x, rf, z0, x + 0.05, rf + 0.025, z1) for x in [x0 + 0.04 + i * 0.12 for i in range(int((x1 - x0 - 0.06) / 0.12))]]
        k.boxes(ribs, shade(wall, 1.22), 'corrugated_rib')
        if rng.random() < 0.6:                                       # rust running down from the top edge
            for _ in range(rng.randint(1, 3)):
                rx = rng.uniform(x0 + 0.1, x1 - 0.3)
                k.box(rx, rf + 0.026, z1 - rng.uniform(0.3, 0.8), rx + rng.uniform(0.08, 0.25), rf + 0.03, z1 - 0.02, (RUST, 0.2), 'rust_streak')
    elif style == 'ply':
        seams = [(x, rf, z0, x + 0.02, rf + 0.01, z1) for x in [x0 + i * 0.6 for i in range(1, int((x1 - x0) / 0.6) + 1)] if x < x1 - 0.05]
        if seams:
            k.boxes(seams, shade(wall, 0.6), 'ply_seam')
    elif style in ('tile', 'brick'):
        D.cladding(k, x0, x1, rf, z0, z1, wall, style, rng)
    if rng.random() < 0.35:                                          # damp staining at the foot of the unit
        k.box(x0 + 0.02, rf + 0.004, z0, x1 - 0.02, rf + 0.008, z0 + rng.uniform(0.15, 0.35), shade(wall, 0.72), 'damp')


def _window(k, x0, x1, rf, z, h, rng, lit_p=0.55):
    """One unit's window: a frame, glass lit warm, cool or TV-blue (or dark), sometimes bars or a cage box, a curtain,
    a sill with a pot, a silhouette."""
    w = x1 - x0
    k.box(x0 - 0.04, rf, z - 0.04, x1 + 0.04, rf + 0.03, z + h + 0.04, '#1a181e', 'window_frame')
    lit = rng.random() < lit_p
    col = rng.choice(('#ffd890', '#ffc070', '#ffb070', '#a0e0ff', '#80a0ff', '#ff90c0', '#c0ffd0')) if lit else None
    if lit:
        k.box(x0, rf + 0.01, z, x1, rf + 0.035, z + h, shade(col, 0.3), 'window_glass', emit=(col, rng.uniform(0.55, 0.9)))
        if rng.random() < 0.5:                                       # a curtain half across
            cw = w * rng.uniform(0.25, 0.5)
            side = x0 if rng.random() < 0.5 else x1 - cw
            k.box(side, rf + 0.036, z, side + cw, rf + 0.042, z + h, (rng.choice(('#8a3030', '#3a5a3a', '#5a4a7a', '#8a7a50')), 0.2), 'curtain')
        if rng.random() < 0.18:                                      # someone at the window
            sx = rng.uniform(x0 + 0.1, x1 - 0.1)
            k.box(sx - 0.07, rf + 0.037, z, sx + 0.07, rf + 0.04, z + h * 0.7, '#14101a', 'silhouette')
            k.sphere(sx, rf + 0.038, z + h * 0.78, 0.07, 0.07, '#14101a', 'silhouette', segs=6)
    else:
        k.box(x0, rf + 0.01, z, x1, rf + 0.035, z + h, '#0e0c14', 'window_glass')
    if rng.random() < 0.4:                                           # bars
        k.boxes([(x0 + 0.06 + i * 0.12, rf + 0.04, z, x0 + 0.08 + i * 0.12, rf + 0.07, z + h) for i in range(int(w / 0.12))], '#22202a', 'window_bars')
    elif rng.random() < 0.35:                                        # a cage box out over the lane (Kowloon's "birdcages")
        d = rng.uniform(0.25, 0.4)
        k.box(x0 - 0.06, rf, z - 0.06, x1 + 0.06, rf + d, z - 0.02, '#2a2830', 'cage_floor')
        bars = [(x, rf + d - 0.02, z - 0.02, x + 0.02, rf + d, z + h + 0.05) for x in [x0 - 0.05 + i * 0.1 for i in range(int((w + 0.12) / 0.1) + 1)]]
        bars += [(x0 - 0.06, rf, z + h + 0.04, x1 + 0.06, rf + d, z + h + 0.07)]
        bars += [(x0 - 0.06, rf + 0.02 * i, z - 0.02, x0 - 0.04, rf + 0.02 * i + 0.02, z + h + 0.05) for i in range(0, int(d / 0.02), 5)]
        k.boxes(bars, '#3a3842', 'cage_bars')
        if rng.random() < 0.6:                                       # a plant or a box in the cage
            k.blob(x0 + w * 0.3, rf + d * 0.6, z + 0.1, 0.1, 0.08, 0.1, ('#3a6a3a', 0.2), 'plant', segs=7)
    if rng.random() < 0.3:
        k.box(x0 - 0.05, rf, z - 0.06, x1 + 0.05, rf + 0.1, z - 0.02, '#2a282e', 'sill')
        k.cyl(x0 + w * 0.7, rf + 0.06, z - 0.02, z + 0.09, 0.05, '#6a3a22', 'pot', verts=7)
        k.blob(x0 + w * 0.7, rf + 0.06, z + 0.15, 0.08, 0.07, 0.08, ('#3a7a40', 0.2), 'plant', segs=7)


def shanty(k, dr, x0, x1, rf, floors, top=None, base=1.6, fh=1.05, rng=None, lit=0.5, ground=True, signs=True, skip=()):
    """Kowloon stacking: storeys of units of their own widths, each standing a little proud of or behind the line, in
    its own cladding — windows lit or dark, cages, bars, AC units dripping, pipes, a sign, washing between units — up
    to `top` (default the floors given). The ground storey (from z 0 to `base`) is left for the shopfronts the scene
    puts in (`ground=False` builds a plain wall there instead); `skip`: (x0, x1) spans of the ground left open.
    Returns the units' faces [(x0, x1, rf, z0, z1)]."""
    rng = rng or k.rng
    units = []
    top = top or (base + floors * fh)
    k.box(x0, rf - 2.0, 0, x1, rf - 0.02, top, ('#1e1c22', 0.05), 'stack_core')
    if not ground:
        k.box(x0, rf - 0.3, 0, x1, rf, base, (rng.choice(WALLS), 0.08), 'stack_wall')
        _clad(k, x0, x1, rf, 0, base, rng.choice(WALLS), rng.choice(('plain', 'corrugated', 'brick')), rng)
    k.box(x0, rf - 0.02, base - 0.1, x1, rf + 0.12, base, '#24222a', 'stack_ledge')
    z = base
    while z < top - 0.2:
        h = min(fh * rng.choice((1.0, 1.0, 0.9, 1.15)), top - z)
        x = x0
        while x < x1 - 0.2:
            w = min(rng.uniform(1.0, 2.4), x1 - x)
            if x1 - (x + w) < 0.6:
                w = x1 - x
            out = rng.choice((0.0, 0.0, 0.12, 0.25, 0.35, -0.1))
            uf = rf + out
            wall = rng.choice(WALLS)
            k.box(x + 0.01, rf - 0.3, z, x + w - 0.01, uf, z + h - 0.02, (wall, 0.1), 'stack_unit')
            _clad(k, x + 0.01, x + w - 0.01, uf, z, z + h - 0.02, wall, rng.choice(CLAD), rng)
            if out > 0.05:                                           # the slab it sits out on
                k.box(x, rf - 0.02, z - 0.06, x + w, uf + 0.04, z, '#26242c', 'stack_slab')
            nwin = max(1, int(w / 0.95))
            for i in range(nwin):
                wx0 = x + 0.2 + i * (w - 0.3) / nwin
                wx1 = wx0 + min(0.6, (w - 0.3) / nwin - 0.15)
                if wx1 - wx0 > 0.2:
                    _window(k, wx0, wx1, uf, z + 0.32, min(0.5, h - 0.45), rng, lit)
            if rng.random() < 0.55:                                  # the AC unit, dripping
                ax = x + rng.uniform(0.2, w - 0.2)
                D.ac_unit(k, ax, uf, z + h - 0.28)
            if rng.random() < 0.3 and w > 1.2:                       # a pipe down the unit's edge
                k.cyl(x + w - 0.08, uf + 0.06, z, z + h, 0.03, ('#4a4a54', 0.06), 'pipe', verts=6)
            if signs and rng.random() < 0.16:                        # a small lit sign: a clinic, a loan shark, a room
                col = rng.choice((Y.PINK, Y.CYAN, '#ffb050', '#a0ff70', '#ff5050'))
                sx = x + rng.uniform(0.2, max(0.25, w - 0.6))
                k.box(sx, uf + 0.02, z + 0.08, sx + 0.5, uf + 0.08, z + 0.3, shade(col, 0.3), 'shop_sign', emit=(col, 0.75))
                k.boxes([(sx + 0.06 + j * 0.1, uf + 0.081, z + 0.15, sx + 0.12 + j * 0.1, uf + 0.085, z + 0.23) for j in range(4)], '#1a0c14', 'sign_glyph')
            units.append((x, x + w, uf, z, z + h))
            x += w
        z += h
    # washing strung between units, a cable or two across
    for _ in range(int((x1 - x0) / 4)):
        a = rng.choice(units)
        b = rng.choice([u for u in units if abs(u[3] - a[3]) < 0.1] or [a])
        if a is b or abs(a[0] - b[0]) > 5:
            continue
        zz = a[3] + 0.95
        D.laundry(k, (a[1] - 0.2, max(a[2], b[2]) + 0.15, zz), (b[0] + 0.2, max(a[2], b[2]) + 0.15, zz + 0.05), sag=0.15, rng=rng)
    return units


def column(k, dr, cx, rf, w=2.2, d=1.6, top=12.0, posters=True, rng=None):
    """One of the city's great columns, going up into the dark: board-marked concrete in lifts, stained, hazard paint at
    its foot, a bundle of pipes clamped up it, posters pasted over posters, a tube light on it."""
    rng = rng or k.rng
    x0, x1 = cx - w / 2, cx + w / 2
    k.box(x0, rf - d, 0, x1, rf, top, ('#3a3840', 0.14), 'column')
    k.boxes([(x0 - 0.01, rf, z, x1 + 0.01, rf + 0.012, z + 0.03) for z in [0.9 + i * 0.9 for i in range(int(top / 0.9))]], '#2a2830', 'column_lift')
    k.boxes([(x0 + 0.2 + i * 0.45, rf, 0.6, x0 + 0.23 + i * 0.45, rf + 0.006, top) for i in range(int(w / 0.45))], '#33313a', 'column_board')
    k.box(x0 - 0.04, rf - d - 0.04, 0, x1 + 0.04, rf + 0.04, 0.35, ('#2a2830', 0.1), 'column_foot')
    stripes = []
    for i in range(int(w / 0.22)):                                   # yellow and black hazard bands
        xx = x0 + i * 0.22
        stripes.append((xx, rf + 0.04, 0.38, xx + 0.11, rf + 0.05, 0.62))
    k.box(x0, rf + 0.035, 0.38, x1, rf + 0.04, 0.62, '#18161a', 'hazard_black')
    k.boxes(stripes, ('#c8a030', 0.1), 'hazard_paint')
    for _ in range(3):                                               # water stains running down
        sx = rng.uniform(x0 + 0.1, x1 - 0.3)
        k.box(sx, rf + 0.004, rng.uniform(1.5, 5.0), sx + rng.uniform(0.1, 0.3), rf + 0.008, top, ('#2a2a2e', 0.2), 'column_stain')
    px = x1 - 0.25                                                   # pipes up the column's right
    for i in range(3):
        k.cyl(px - i * 0.13, rf + 0.08, 0.4, top, 0.045, (('#4a4a54', '#5a3a2a', '#3a4a44')[i], 0.06), 'pipe', verts=8)
    for z in [1.2 + i * 1.6 for i in range(int(top / 1.6))]:
        k.box(px - 0.36, rf, z, px + 0.07, rf + 0.15, z + 0.05, '#24222a', 'pipe_clamp')
    if posters:
        for _ in range(rng.randint(3, 6)):
            pw, ph = rng.uniform(0.3, 0.5), rng.uniform(0.4, 0.62)
            pxx, pz = rng.uniform(x0 + 0.1, x1 - 0.7), rng.uniform(0.8, 2.0)
            col = rng.choice(('#c83040', '#e8d8b8', '#3a6ad0', '#e8c040', '#40a060', '#e870c0', '#d8d8d0'))
            k.box(pxx, rf + 0.008, pz, pxx + pw, rf + 0.014, pz + ph, (col, 0.25), 'poster')
            k.box(pxx + 0.04, rf + 0.014, pz + ph * 0.55, pxx + pw - 0.04, rf + 0.016, pz + ph * 0.75, shade(col, 0.4), 'poster_ink')
            if rng.random() < 0.5:                                   # torn
                k.box(pxx + pw * 0.5, rf + 0.015, pz, pxx + pw, rf + 0.018, pz + ph * 0.3, '#3a3840', 'poster_torn')
    k.solid(x0, rf - d, x1, rf)


def rooftop(k, dr, x0, x1, r0, r1, z, rng=None):
    """A low block's roof, seen from above: tar and patched sheet, a parapet, and what people keep up there — water tanks
    on stands, a pigeon loft, a shed of corrugated, an antenna mast and dishes, a few pots of greens, washing on a line,
    a mattress, vents breathing steam."""
    rng = rng or k.rng
    k.box(x0, r0, z - 0.06, x1, r1, z, ('#26242a', 0.14), 'roof_tar')
    k.boxes([(x0, r0, z, x1, r0 + 0.12, z + 0.25), (x0, r1 - 0.12, z, x1, r1, z + 0.25), (x0, r0, z, x0 + 0.12, r1, z + 0.25),
             (x1 - 0.12, r0, z, x1, r1, z + 0.25)], ('#3a3640', 0.1), 'roof_parapet')
    for _ in range(int((x1 - x0) / 3)):                              # patches of sheet laid over the tar
        px, pr = rng.uniform(x0 + 0.2, x1 - 1.2), rng.uniform(r0 + 0.2, r1 - 0.9)
        k.box(px, pr, z, px + rng.uniform(0.6, 1.1), pr + rng.uniform(0.4, 0.7), z + 0.012, (rng.choice(('#3a3a44', '#4a3a30', '#2e3438')), 0.12), 'roof_patch')
    x = x0 + 0.4
    while x < x1 - 1.0:
        w = rng.uniform(1.0, 2.2)
        cx, cr = x + w / 2, rng.uniform(r0 + 0.6, r1 - 0.6)
        what = rng.random()
        if what < 0.22:                                              # a water tank on a stand
            for (dx, dd) in ((-0.3, -0.25), (0.3, -0.25), (-0.3, 0.25), (0.3, 0.25)):
                k.cyl(cx + dx, cr + dd, z, z + 0.4, 0.03, '#3a3842', 'tank_leg', verts=5)
            k.cyl(cx, cr, z + 0.4, z + 1.1, 0.42, (rng.choice(('#3a6a8a', '#8a8a90', '#2a4a5a')), 0.1), 'water_tank', verts=14)
            k.cone(cx, cr, z + 1.1, z + 1.25, 0.44, 0.1, '#2a2a30', 'water_tank_lid', verts=14)
        elif what < 0.38:                                            # a shed of corrugated with a lit door
            k.box(cx - 0.6, cr - 0.45, z, cx + 0.6, cr + 0.45, z + 0.9, (rng.choice(('#5a5048', '#3a4a4a', '#5a3a2a')), 0.12), 'shed')
            k.boxes([(cx - 0.6 + i * 0.12, cr + 0.45, z, cx - 0.56 + i * 0.12, cr + 0.47, z + 0.9) for i in range(10)], '#6a6058', 'corrugated_rib')
            k.poly([(cx - 0.68, cr - 0.5, z + 1.0), (cx + 0.68, cr - 0.5, z + 1.0), (cx + 0.68, cr + 0.55, z + 0.88), (cx - 0.68, cr + 0.55, z + 0.88)], ('#4a4a50', 0.1), 'roof_shed')
            k.box(cx + 0.1, cr + 0.46, z, cx + 0.45, cr + 0.48, z + 0.7, '#3a2a10', 'doorway', emit=('#ffc070', 0.6))
        elif what < 0.5:                                             # a pigeon loft
            k.box(cx - 0.55, cr - 0.3, z + 0.3, cx + 0.55, cr + 0.3, z + 0.8, ('#6a5a40', 0.15), 'loft')
            for (dx, dd) in ((-0.5, -0.25), (0.5, -0.25), (-0.5, 0.25), (0.5, 0.25)):
                k.cyl(cx + dx, cr + dd, z, z + 0.3, 0.03, '#3a3036', 'loft_leg', verts=5)
            k.boxes([(cx - 0.5 + i * 0.1, cr + 0.3, z + 0.32, cx - 0.48 + i * 0.1, cr + 0.32, z + 0.78) for i in range(11)], '#2a2420', 'loft_mesh')
            for i in range(3):
                k.sphere(cx - 0.3 + i * 0.25, cr + 0.1, z + 0.86, 0.05, 0.04, rng.choice(('#a0a0a8', '#5a5a64', '#e8e8f0')), 'pigeon', segs=6)
        elif what < 0.62:                                            # greens in tubs and pots
            for i in range(rng.randint(3, 6)):
                gx, gr = cx + rng.uniform(-0.6, 0.6), cr + rng.uniform(-0.4, 0.4)
                k.box(gx - 0.15, gr - 0.12, z, gx + 0.15, gr + 0.12, z + 0.2, (rng.choice(('#5a3a2a', '#3a4a5a', '#6a6a6a')), 0.1), 'tub')
                k.blob(gx, gr, z + 0.27, 0.16, 0.13, 0.12, (rng.choice(('#3a7a40', '#4a8a3a', '#2a6a3a')), 0.25), 'greens', segs=8)
        elif what < 0.74:                                            # an antenna mast and a dish
            k.cyl(cx, cr, z, z + 2.0, 0.025, '#5a5a64', 'antenna', verts=5)
            for zz in (z + 1.2, z + 1.6, z + 1.9):
                k.box(cx - 0.25, cr - 0.01, zz, cx + 0.25, cr + 0.01, zz + 0.02, '#5a5a64', 'antenna')
            k.sphere(cx, cr, z + 2.0, 0.03, 0.03, '#ff3030', 'antenna_light', emit=('#ff3030', 1.0), segs=5)
            D.dish(k, cx + 0.5, cr + 0.2, z + 0.2)
        elif what < 0.86:                                            # someone's spot: a mattress, a chair, a lamp
            k.box(cx - 0.5, cr - 0.28, z, cx + 0.5, cr + 0.28, z + 0.12, ('#8a8070', 0.2), 'mattress', bevel=0.03)
            k.box(cx - 0.1, cr - 0.29, z + 0.12, cx + 0.5, cr + 0.29, z + 0.16, (rng.choice(('#6a2a2a', '#2a4a6a', '#4a6a3a')), 0.25), 'blanket', bevel=0.02)
            k.box(cx - 1.0, cr - 0.15, z, cx - 0.7, cr + 0.15, z + 0.42, ('#d8d0c0', 0.1), 'plastic_chair')
            caged_bulb(k, cx - 0.85, cr - 0.3, z + 1.1, wire_to=z + 1.6, energy=6)
        else:                                                        # vents breathing steam
            for i in range(2):
                vx = cx - 0.3 + i * 0.6
                k.cyl(vx, cr, z, z + 0.5, 0.14, ('#6a6a70', 0.08), 'roof_vent', verts=10)
                k.cone(vx, cr, z + 0.5, z + 0.62, 0.2, 0.05, '#4a4a50', 'roof_vent_cap', verts=10)
                dr.vent(vx, cr, z + 0.6)
        x += w + rng.uniform(0.2, 0.8)
    for _ in range(int((x1 - x0) / 7)):                              # washing lines across the roof
        a = rng.uniform(x0 + 0.5, x1 - 3.5)
        D.laundry(k, (a, r0 + 0.5, z + 1.1), (a + rng.uniform(2.0, 3.2), r0 + rng.uniform(0.6, 1.4), z + 1.15), sag=0.15, rng=rng)
        k.cyl(a, r0 + 0.5, z, z + 1.15, 0.02, '#4a4a54', 'line_pole', verts=4)


# ---- life at the human scale ------------------------------------------------------------------------------------------------
def stall(k, dr, x0, x1, rb, kind='noodle', tarp=None, rng=None, name=None, depth=1.3):
    """A hawker stall with its back to row rb, facing the camera: a tarp canopy on poles sloping toward you, a counter
    with a front, the goods (a stock pot steaming, skewers on a grill, dumplings in steamers, bottles, chrome junk), a
    menu card lit by a tube, stools along the front. Returns the counter's front row."""
    rng = rng or k.rng
    tarp = tarp or rng.choice(TARP)
    rf = rb + depth
    cf = rb + depth * 0.62                                          # the counter's front
    for x in (x0 + 0.08, x1 - 0.08):                                 # poles
        k.cyl(x, rf - 0.05, 0, 2.15, 0.035, '#3a3842', 'stall_pole', verts=6)
        k.cyl(x, rb + 0.1, 0, 2.5, 0.035, '#3a3842', 'stall_pole', verts=6)
    k.poly([(x0 - 0.1, rb, 2.55), (x1 + 0.1, rb, 2.55), (x1 + 0.12, rf + 0.15, 2.12), (x0 - 0.12, rf + 0.15, 2.12)], (tarp, 0.2), 'tarp')
    k.box(x0 - 0.12, rf + 0.12, 1.98, x1 + 0.12, rf + 0.16, 2.14, shade(tarp, 0.8), 'tarp_valance')
    if rng.random() < 0.5:                                           # a patch on the tarp
        px = rng.uniform(x0 + 0.2, x1 - 0.6)
        k.poly([(px, rb + 0.5, 2.39), (px + 0.4, rb + 0.5, 2.39), (px + 0.4, rb + 0.8, 2.3), (px, rb + 0.8, 2.3)], (shade(rng.choice(TARP), 0.9), 0.2), 'tarp')
    k.box(x0, rb, 0, x1, rb + 0.08, 2.4, ('#2a2830', 0.08), 'stall_back')
    k.box(x0 + 0.05, cf - 0.4, 0, x1 - 0.05, cf, 0.9, (rng.choice(('#5a2a22', '#3a4a5a', '#5a5a5e', '#2a4a3a')), 0.1), 'counter', bevel=0.01)
    k.box(x0 + 0.02, cf - 0.44, 0.9, x1 - 0.02, cf + 0.04, 0.95, ('#8a8a90', 0.1), 'counter_top')
    k.box(x0 + 0.05, cf - 0.01, 0.1, x1 - 0.05, cf + 0.005, 0.14, shade(Y.PINK, 0.4), 'counter_neon', emit=(rng.choice((Y.PINK, Y.CYAN, SODIUM)), 0.7))
    w = x1 - x0
    if kind == 'noodle':
        Y.stock_pot(k, x0 + 0.45, cf - 0.22, z=0.95)
        dr.vent(x0 + 0.45, cf - 0.22, 1.4)
        for i in range(int((w - 1.0) / 0.4)):
            Y.bowl(k, x0 + 0.95 + i * 0.4, cf - 0.18, 0.95, steam=False)
    elif kind == 'skewers':
        k.box(x0 + 0.2, cf - 0.38, 0.95, x0 + 1.1, cf - 0.08, 1.02, '#1a1416', 'grill')
        k.box(x0 + 0.24, cf - 0.34, 1.0, x0 + 1.06, cf - 0.12, 1.02, '#3a1a08', 'grill_coals', emit=('#ff6020', 0.8))
        for i in range(7):
            sx = x0 + 0.28 + i * 0.11
            k.tube((sx, cf - 0.36, 1.05), (sx, cf - 0.1, 1.05), 0.008, '#c8b890', 'skewer', verts=3)
            for j in range(3):
                k.sphere(sx, cf - 0.3 + j * 0.07, 1.06, 0.025, 0.022, rng.choice(('#8a4a2a', '#a05a30', '#6a8a3a')), 'skewer_meat', segs=5)
        k.point_light(x0 + 0.65, cf, 1.2, '#ff7030', 8, radius=0.2, group='flicker')
        dr.vent(x0 + 0.65, cf - 0.2, 1.2)
    elif kind == 'dumplings':
        for i in range(int((w - 0.4) / 0.42)):
            for j in range(rng.randint(1, 3)):
                k.cyl(x0 + 0.4 + i * 0.42, cf - 0.22, 0.95 + j * 0.1, 1.04 + j * 0.1, 0.17, ('#c8a060', 0.2), 'steamer', verts=12)
            k.cyl(x0 + 0.4 + i * 0.42, cf - 0.22, 1.04 + j * 0.1, 1.07 + j * 0.1, 0.16, '#d8b070', 'steamer_lid', verts=12)
        dr.vent(x0 + 0.6, cf - 0.22, 1.3)
    elif kind == 'drinks':
        for i in range(int((w - 0.3) / 0.12)):
            col = rng.choice(('#40c080', '#e84040', '#4080e0', '#e8c040', '#a040c0'))
            k.cyl(x0 + 0.25 + i * 0.12, cf - 0.25, 0.95, 1.15, 0.035, shade(col, 0.4), 'bottle', emit=(col, 0.4), verts=6)
        k.box(x0 + 0.1, rb + 0.1, 0.0, x0 + 0.8, rb + 0.6, 0.8, ('#c8c8d0', 0.06), 'cooler')
        k.box(x0 + 0.14, rb + 0.6, 0.1, x0 + 0.76, rb + 0.61, 0.7, '#0c2030', 'cooler_glass', emit=('#80d0ff', 0.4))
    elif kind == 'junk':
        for i in range(int((w - 0.3) / 0.3)):
            kx = x0 + 0.3 + i * 0.3
            what = rng.random()
            if what < 0.4:
                k.box(kx - 0.1, cf - 0.35, 0.95, kx + 0.1, cf - 0.15, 1.08, ('#4a4a54', 0.1), 'junk_part')
            elif what < 0.7:
                k.cyl(kx, cf - 0.25, 0.95, 1.0, 0.09, '#8a8a94', 'junk_gear', verts=8)
            else:
                k.box(kx - 0.08, cf - 0.3, 0.95, kx + 0.08, cf - 0.2, 1.1, '#0c1a14', 'junk_screen', emit=(Y.GREEN, 0.5))
        Y.junk_shelf(k, x0 + 0.1, x1 - 0.1, rb + 0.1)
    elif kind == 'tea':
        for i in range(int((w - 0.4) / 0.5)):
            k.sphere(x0 + 0.45 + i * 0.5, cf - 0.22, 1.05, 0.12, 0.1, ('#8a5a3a', 0.1), 'teapot', segs=10)
            k.tube((x0 + 0.55 + i * 0.5, cf - 0.22, 1.06), (x0 + 0.65 + i * 0.5, cf - 0.22, 1.12), 0.015, '#8a5a3a', 'teapot_spout', verts=4)
        for i in range(4):
            k.box(x0 + 0.2 + i * 0.3, rb + 0.1, 1.2, x0 + 0.42 + i * 0.3, rb + 0.25, 1.5, (rng.choice(('#c8a050', '#3a6a3a', '#8a2a2a')), 0.1), 'tea_tin')
        dr.vent(x0 + 0.45, cf - 0.22, 1.3)
    # shelves behind, a menu card, a tube under the tarp, a lantern or two
    k.box(x0 + 0.1, rb + 0.08, 1.5, x1 - 0.1, rb + 0.3, 1.54, '#3a3036', 'stall_shelf')
    for i in range(int((w - 0.3) / 0.25)):
        k.box(x0 + 0.18 + i * 0.25, rb + 0.12, 1.54, x0 + 0.33 + i * 0.25, rb + 0.26, 1.54 + rng.uniform(0.1, 0.25),
              (rng.choice(('#c8a050', '#e8e0d0', '#8a3a2a', '#3a5a8a', '#4a7a4a')), 0.12), 'jar')
    k.box(x0 + w * 0.5 - 0.4, rb + 0.085, 1.7, x0 + w * 0.5 + 0.4, rb + 0.1, 2.15, '#f0e8d0', 'menu_card', emit=('#fff4d8', 0.35))
    k.boxes([(x0 + w * 0.5 - 0.32, rb + 0.1, 1.78 + i * 0.09, x0 + w * 0.5 + rng.uniform(0.0, 0.32), rb + 0.104, 1.81 + i * 0.09) for i in range(4)], '#3a2020', 'menu_ink')
    if name:
        import assets_signs as SG
        SG.lightbox(k, name, 'DelaGothicOne', (x0 + x1) / 2, rf + 0.16, 2.0, min(w - 0.2, 1.8), 0.32, bg='#f4e8d0', ink='#a01818', size=0.22, energy=4)
    fluoro(k, dr, (x0 + x1) / 2, rf - 0.4, 2.15, w=min(1.0, w - 0.4), energy=10)
    if rng.random() < 0.7:
        Y.paper_lantern(k, x0 + 0.15, rf + 0.1, 1.75, col=rng.choice(('#e03030', '#f0a030')), s=0.32, top=2.12)
    for i in range(max(1, int((w - 0.2) / 0.6))):
        Y.neon_stool(k, x0 + 0.4 + i * 0.6, cf + 0.32, seat=rng.choice(('#d83040', '#3a6ad0', '#2a2a30')))
    k.solid(x0, rb, x1, cf)
    return cf


def drum_fire(k, cx, cr, energy=26):
    """An oil drum with a fire in it: ribbed steel, rust, flames licking over the rim, warm light that flickers."""
    k.cyl(cx, cr, 0, 0.82, 0.26, (RUST, 0.2), 'drum', verts=14)
    for z in (0.22, 0.56):
        k.cyl(cx, cr, z, z + 0.04, 0.27, '#4a2a1a', 'drum_rib', verts=14)
    k.cyl(cx, cr, 0.78, 0.82, 0.27, '#3a2014', 'drum_rim', verts=14)
    for i in range(5):
        a = i * 1.3
        k.cone(cx + math.cos(a) * 0.1, cr + math.sin(a) * 0.08, 0.78, 0.78 + 0.18 + (i % 3) * 0.08, 0.08, 0.0, '#6a2008', 'flame',
               emit=(('#ff8020', '#ffb040', '#ff6010')[i % 3], 1.0), verts=6)
    k.point_light(cx, cr, 1.2, '#ff8a30', energy, radius=0.25, group='flicker')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def chainlink(k, x0, r0, x1, r1, h=2.2, gap=None, wire=True, col='#8a8a94'):
    """A chain-link fence from (x0, r0) to (x1, r1) — posts, a top rail, the mesh as fine diagonals (a pixel at 32 px),
    razor wire along the top; `gap` (a, b) along its length is cut open."""
    L = math.hypot(x1 - x0, r1 - r0)
    n = max(1, int(L / 1.4))
    ux, ur = (x1 - x0) / L, (r1 - r0) / L
    for i in range(n + 1):
        t = i * L / n
        if gap and gap[0] < t < gap[1]:
            continue
        k.cyl(x0 + ux * t, r0 + ur * t, 0, h, 0.035, (col, 0.06), 'fence_post', verts=6)
    segs = [(0, L)] if not gap else [(0, gap[0]), (gap[1], L)]
    for (a, b) in segs:
        if b - a < 0.05:
            continue
        k.tube((x0 + ux * a, r0 + ur * a, h - 0.05), (x0 + ux * b, r0 + ur * b, h - 0.05), 0.02, col, 'fence_rail', verts=5)
        mesh = []                                                    # the diamonds: thin strips facing the camera, one part
        s, t = 0.16, a
        while t < b - 0.01:
            xa, ra = x0 + ux * t, r0 + ur * t
            xb, rb = x0 + ux * min(b, t + s), r0 + ur * min(b, t + s)
            for z0 in [0.08 + j * 0.32 for j in range(int((h - 0.2) / 0.32))]:
                for (za, zb) in ((z0, z0 + 0.32), (z0 + 0.32, z0)):
                    mesh.append(((xa, ra, za), (xb, rb, zb), (xb, rb, zb + 0.014), (xa, ra, za + 0.014)))
            t += s
        k.quads(mesh, shade(col, 0.85), 'fence_mesh')
        if wire:                                                     # razor wire: a zigzag coil along the top
            coil, n = [], int((b - a) / 0.07)
            for j in range(n):
                ta, tb = a + j * 0.07, a + (j + 1) * 0.07
                za, zb = h + 0.08 + 0.09 * math.sin(j * 1.9), h + 0.08 + 0.09 * math.sin((j + 1) * 1.9)
                coil.append(((x0 + ux * ta, r0 + ur * ta, za), (x0 + ux * tb, r0 + ur * tb, zb), (x0 + ux * tb, r0 + ur * tb, zb + 0.02), (x0 + ux * ta, r0 + ur * ta, za + 0.02)))
            k.quads(coil, '#4a4a52', 'razor_wire')


def scrap_heap(k, cx, cr, s=1.0, rng=None, solid=True):
    """A heap of scrap: a car's door, sheets of corrugated, a wheel, pipes, a robot arm, an old screen, tyres."""
    rng = rng or k.rng
    k.blob(cx, cr, 0.0, 0.9 * s, 0.6 * s, 0.45 * s, ('#2a2624', 0.3), 'scrap_mound', segs=10)
    for _ in range(int(9 * s)):
        a = rng.uniform(0, math.pi * 2)
        d = rng.uniform(0, 0.6 * s)
        x, r = cx + math.cos(a) * d, cr + math.sin(a) * d * 0.6
        z = 0.38 * s * (1 - d / (0.7 * s)) + rng.uniform(0.0, 0.1)
        what = rng.random()
        col = rng.choice(('#5a4a3a', RUST, '#4a5a6a', '#6a6a70', '#3a4a3a', '#8a2a20', '#c8a030'))
        if what < 0.3:
            k.poly([(x - 0.3, r, z), (x + 0.3, r, z + 0.08), (x + 0.28, r + 0.25, z + 0.25), (x - 0.32, r + 0.25, z + 0.15)], (col, 0.25), 'scrap_sheet')
        elif what < 0.5:
            k.cyl_y(x, r - 0.06, r + 0.06, z + 0.15, 0.16, 0.16, '#141416', 'scrap_tyre', verts=10)
        elif what < 0.7:
            k.tube((x - 0.3, r, z), (x + 0.3, r + 0.1, z + rng.uniform(0, 0.3)), 0.03, (col, 0.1), 'scrap_pipe', verts=6)
        elif what < 0.85:
            k.box(x - 0.15, r - 0.12, z, x + 0.15, r + 0.12, z + 0.2, (col, 0.15), 'scrap_box', bevel=0.01)
        else:
            k.box(x - 0.12, r, z, x + 0.12, r + 0.05, z + 0.18, '#141c18', 'scrap_screen', emit=(Y.GREEN, rng.choice((0.0, 0.0, 0.3))))
    if solid:
        k.solid(cx - 0.85 * s, cr - 0.5 * s, cx + 0.85 * s, cr + 0.5 * s)


def barrels(k, x, r, n=3, rng=None):
    rng = rng or k.rng
    for i in range(n):
        bx, br = x + (i % 2) * 0.5, r + (i // 2) * 0.45
        col = rng.choice(('#2a4a8a', '#8a2a2a', '#4a5a3a', RUST))
        k.cyl(bx, br, 0, 0.75, 0.22, (col, 0.15), 'barrel', verts=12)
        k.cyl(bx, br, 0.73, 0.76, 0.23, shade(col, 0.7), 'barrel_rim', verts=12)
        for z in (0.2, 0.52):
            k.cyl(bx, br, z, z + 0.03, 0.225, shade(col, 0.75), 'barrel_rib', verts=12)
    k.solid(x - 0.25, r - 0.25, x + 0.25 + 0.5 * min(1, n - 1), r + 0.25 + 0.45 * ((n - 1) // 2))


def crates(k, x, r, n=3, rng=None):
    rng = rng or k.rng
    for i in range(n):
        s = rng.uniform(0.38, 0.5)
        cx, cr = x + (i % 2) * 0.48, r + (i // 2) * 0.4
        z = 0.0 if i < 2 else 0.45
        if i >= 2:
            cx, cr = x + 0.24, r + 0.05
        col = rng.choice(('#6a5a40', '#5a4a30', '#4a5a6a', '#3a4a3a'))
        k.box(cx - s / 2, cr - s / 2, z, cx + s / 2, cr + s / 2, z + s * 0.85, (col, 0.15), 'crate', bevel=0.01)
        k.box(cx - s / 2 - 0.005, cr + s / 2, z + s * 0.38, cx + s / 2 + 0.005, cr + s / 2 + 0.01, z + s * 0.46, shade(col, 0.7), 'crate_slat')
    k.solid(x - 0.25, r - 0.25, x + 0.73, r + 0.25)


def tag(k, x0, x1, rf, z0, z1, col, rng=None):
    """Graffiti: a gang's tag sprayed big (D.graffiti, twice over)."""
    D.graffiti(k, x0, x1, rf + 0.012, z0, z1, col, rng=rng or k.rng)


def ground_tag(k, cx, cr, col, w=1.6):
    """A gang's mark sprayed on the floor where its turf starts: a crown of three strokes and a bar under it."""
    k.box(cx - w / 2, cr - 0.05, 0.0, cx + w / 2, cr + 0.05, 0.004, shade(col, 0.6), 'floor_paint')
    for i in range(3):
        x = cx - w * 0.3 + i * w * 0.3
        k.bar(x - 0.15, cr - 0.25, x, cr - 0.6, 0.0, 0.004, 0.08, shade(col, 0.6), 'floor_paint')
        k.bar(x, cr - 0.6, x + 0.15, cr - 0.25, 0.0, 0.004, 0.08, shade(col, 0.6), 'floor_paint')


def stair_up(k, x0, x1, rf, z_top, steps=None, col='#3a3842', rail=SODIUM):
    """A steel stair against a wall (its face at rf), climbing from x0 at the floor to x1 at z_top, a landing at the
    top under a door, a handrail with a lamp: the way up. Solid only along the wall's row."""
    n = steps or int(z_top / 0.22)
    run = (x1 - x0) / n
    for i in range(n):
        x = x0 + i * run
        z = (i + 1) * z_top / n
        k.box(x, rf, z - 0.06, x + run + 0.02, rf + 0.85, z, (col, 0.08), 'stair_tread')
        k.box(x, rf + 0.83, z - 0.22, x + run + 0.02, rf + 0.86, z - 0.04, shade(col, 0.7), 'stair_stringer')
    k.bar(x0, rf + 0.86, x1, rf + 0.86, 0.0, 0.06, 0.04, shade(col, 0.8), 'stair_stringer')
    k.tube((x0, rf + 0.86, 0.95), (x1, rf + 0.86, z_top + 0.95), 0.025, col, 'stair_rail', verts=6)
    for i in range(0, n, 3):
        x = x0 + i * run
        k.tube((x, rf + 0.86, (i + 1) * z_top / n), (x, rf + 0.86, (i + 1) * z_top / n + 0.95), 0.018, col, 'stair_baluster', verts=5)
    k.box(x1, rf - 0.1, z_top - 0.06, x1 + 1.2, rf + 0.85, z_top, (col, 0.08), 'stair_landing')


def stair_down(k, dr, x0, x1, r0, r1, depth=3.0, glow=TUBE_G, label=None):
    """A stairwell going down through the floor: concrete side walls falling away, treads descending toward the camera
    into the dark, a rail round the opening, a tube light half way down and a lit sign at the top."""
    n = int((r1 - r0) / 0.3)
    k.box(x0 - 0.2, r0 - 0.2, -depth - 0.2, x1 + 0.2, r0, 0.0, '#2a2830', 'stairwell_wall')
    for s in (x0 - 0.2, x1):
        k.box(s, r0, -depth, s + 0.2, r1, 0.05, ('#3a3840', 0.1), 'stairwell_wall')
    for i in range(n):
        r = r0 + i * (r1 - r0) / n
        z = -(i + 1) * depth / n
        k.box(x0, r, z - 0.1, x1, r + (r1 - r0) / n + 0.01, z, (shade('#3a3840', 1 - i / (n * 1.6)), 0.08), 'floor_stair')
        k.box(x0, r + (r1 - r0) / n - 0.02, z - 0.005, x1, r + (r1 - r0) / n, z + 0.005, '#c8a030', 'floor_nosing')
    k.box(x0 - 0.2, r1, -depth - 0.2, x1 + 0.2, r1 + 0.6, -depth, '#0a0a0e', 'stairwell_dark')
    for s in (x0 - 0.12, x1 + 0.12):
        k.tube((s, r0 - 0.1, 0.95), (s, r1 - 0.2, 0.95), 0.025, '#5a5a64', 'stair_rail', verts=6)
        k.tube((s, r0 - 0.1, 0.0), (s, r0 - 0.1, 0.95), 0.025, '#5a5a64', 'stair_rail', verts=6)
        k.tube((s, r1 - 0.2, 0.0), (s, r1 - 0.2, 0.95), 0.025, '#5a5a64', 'stair_rail', verts=6)
    k.tube((x0 - 0.12, r0 - 0.1, 0.95), (x1 + 0.12, r0 - 0.1, 0.95), 0.025, '#5a5a64', 'stair_rail', verts=6)
    k.box((x0 + x1) / 2 - 0.4, r0 + (r1 - r0) * 0.5, -depth * 0.5 + 0.5, (x0 + x1) / 2 + 0.4, r0 + (r1 - r0) * 0.5 + 0.05, -depth * 0.5 + 0.56,
          shade(glow, 0.5), 'fluoro_tube', emit=(glow, 1.0))
    k.point_light((x0 + x1) / 2, r0 + (r1 - r0) * 0.6, -depth * 0.5 + 0.3, glow, 60, radius=0.3, group='flicker')
    k.point_light((x0 + x1) / 2, r0 + 0.4, 0.6, glow, 25, radius=0.3, group='flicker')
    if label:
        import assets_signs as SG
        SG.lightbox(k, label, 'RussoOne', (x0 + x1) / 2, r0 - 0.15, 1.25, max(2.2, (x1 - x0) + 0.4), 0.6, bg='#0c1a12', ink=glow, size=0.42, energy=6)
        for s in (x0 - 0.12, x1 + 0.12):
            k.tube((s, r0 - 0.12, 0.95), (s, r0 - 0.12, 1.25), 0.02, '#5a5a64', 'sign_post', verts=5)


def shutter_front(k, x0, x1, rf, h=1.5, up=0.4, col='#5a5a64'):
    """A roller shutter part way down over a dark shopfront."""
    k.box(x0, rf - 0.05, 0, x1, rf, h, '#0a0a0e', 'shop_face')
    k.box(x0 - 0.05, rf, h, x1 + 0.05, rf + 0.15, h + 0.2, shade(col, 0.8), 'shutter_box')
    k.boxes([(x0, rf + 0.01, z, x1, rf + 0.04, z + 0.07) for z in [up + i * 0.09 for i in range(int((h - up) / 0.09))]], (col, 0.12), 'shutter')


def mattress_corner(k, cx, cr, rng=None):
    """Someone's spot: a mattress on pallets, a blanket, a tarp lean-to, a radio."""
    rng = rng or k.rng
    k.box(cx - 0.55, cr - 0.3, 0, cx + 0.55, cr + 0.3, 0.14, ('#6a5a40', 0.15), 'pallet')
    k.box(cx - 0.5, cr - 0.26, 0.14, cx + 0.5, cr + 0.26, 0.24, ('#8a8070', 0.2), 'mattress', bevel=0.03)
    k.box(cx - 0.1, cr - 0.27, 0.24, cx + 0.5, cr + 0.27, 0.28, (rng.choice(('#6a2a2a', '#2a4a6a', '#4a6a3a')), 0.25), 'blanket', bevel=0.02)
    k.box(cx + 0.5, cr - 0.1, 0.0, cx + 0.7, cr + 0.05, 0.14, '#2a2a30', 'radio')
    k.box(cx + 0.53, cr + 0.05, 0.06, cx + 0.62, cr + 0.06, 0.11, '#1a0c08', 'radio_dial', emit=('#ffb050', 0.6))
    k.solid(cx - 0.55, cr - 0.3, cx + 0.55, cr + 0.3)


# ---- the Sump ---------------------------------------------------------------------------------------------------------------
WATER_Z = -0.75


def canal(k, x0, r0, x1, r1, z=WATER_Z, glow='#1a8a8a', rng=None, debris=True):
    """Black water between quay walls: the bed far down, the surface `canal_water` (smooth in the finish), a faint teal
    glow from below in patches, slicks and floating rubbish."""
    rng = rng or k.rng
    k.box(x0, r0, z - 1.5, x1, r1, z - 1.4, '#06080a', 'canal_bed')
    k.box(x0, r0, z - 0.02, x1, r1, z, ('#081014', 0.05), 'canal_water', emit=(glow, 0.06))
    for _ in range(int((x1 - x0) * (r1 - r0) / 28)):                # the glow under the surface, in long faint patches
        cx, cr = rng.uniform(x0 + 0.5, x1 - 0.5), rng.uniform(r0 + 0.3, r1 - 0.3)
        s = rng.uniform(0.8, 2.2)
        k.cyl(cx, cr, z - 0.002, z + 0.001, s, '#0a1618', 'canal_water', emit=(glow, rng.uniform(0.05, 0.12)), verts=14, ry=s * rng.uniform(0.2, 0.35))
    if debris:
        for _ in range(int((x1 - x0) * (r1 - r0) / 18)):
            cx, cr = rng.uniform(x0 + 0.3, x1 - 0.3), rng.uniform(r0 + 0.2, r1 - 0.2)
            what = rng.random()
            if what < 0.4:
                k.box(cx - 0.15, cr - 0.1, z, cx + 0.15, cr + 0.1, z + 0.06, (rng.choice(('#5a4a3a', '#3a4a5a', '#6a6a70')), 0.2), 'flotsam')
            elif what < 0.7:
                k.cyl(cx, cr, z, z + 0.05, 0.08, rng.choice(('#e8e0d0', '#c83040', '#3a6ad0')), 'flotsam', verts=6)
            else:
                k.cyl(cx, cr, z - 0.001, z + 0.002, rng.uniform(0.3, 0.6), '#181820', 'canal_slick', emit=('#a060e0', 0.08), verts=10, ry=0.15)


def quay(k, x0, r0, x1, r1, z0=WATER_Z - 0.4, top=0.0, face='front', col='#34343a', moss=True, rng=None):
    """A quay: concrete walkway at floor level whose face (`front`: toward the camera; `back`; `left`; `right`) drops
    to the water, stained by the tide line, green slime at the foot, iron ladders, a bollard or two."""
    rng = rng or k.rng
    k.box(x0, r0, z0, x1, r1, top, (col, 0.1), 'quay')
    k.box(x0, r0, top - 0.06, x1, r1, top, (shade(col, 1.08), 0.12), 'floor_quay')
    if face == 'front':
        k.box(x0, r1, top - 0.08, x1, r1 + 0.04, top + 0.04, shade(col, 1.25), 'quay_kerb')
        if moss:
            k.box(x0, r1 + 0.005, WATER_Z - 0.05, x1, r1 + 0.01, WATER_Z + 0.22, ('#1e3a2a', 0.3), 'quay_slime')
            k.box(x0, r1 + 0.005, WATER_Z + 0.22, x1, r1 + 0.008, WATER_Z + 0.32, ('#2a2a26', 0.2), 'quay_tide')
        for x in [x0 + 1.0 + i * rng.uniform(3, 5) for i in range(int((x1 - x0) / 4))]:
            if x < x1 - 0.5:
                for z in [WATER_Z + i * 0.18 for i in range(5)]:
                    k.box(x - 0.15, r1, z, x + 0.15, r1 + 0.1, z + 0.025, '#5a3a2a', 'quay_ladder')
                for s in (-0.15, 0.15):
                    k.box(x + s - 0.015, r1 + 0.06, WATER_Z, x + s + 0.015, r1 + 0.1, top + 0.1, '#5a3a2a', 'quay_ladder')


def bollard(k, cx, cr):
    k.cyl(cx, cr, 0, 0.35, 0.12, ('#2a2a30', 0.1), 'bollard', verts=10)
    k.cyl(cx, cr, 0.3, 0.38, 0.15, '#3a3a40', 'bollard_cap', verts=10)
    k.solid_post(cx, cr)


def sampan(k, cx, cr, z=WATER_Z, l=2.6, col='#5a3a22', roof=True, lamp=SODIUM):
    """A small boat on the black water: a hull in planks, a canvas roof on hoops, a lamp at the stern."""
    hw = 0.42
    rings = []
    for i, t in enumerate((-1.0, -0.8, -0.4, 0.0, 0.4, 0.8, 1.0)):
        w = hw * (1 - abs(t) ** 2.2) + 0.05
        lift = 0.12 * abs(t) ** 2
        x = cx + t * l / 2
        rings.append([(x, cr - w, z + 0.32 + lift), (x, cr - w * 0.8, z - 0.05), (x, cr, z - 0.12), (x, cr + w * 0.8, z - 0.05), (x, cr + w, z + 0.32 + lift)])
    k.loft(rings, (col, 0.15), 'boat_hull', closed=False)
    k.box(cx - l * 0.38, cr - hw * 0.85, z + 0.18, cx + l * 0.38, cr + hw * 0.85, z + 0.22, ('#6a4a2a', 0.15), 'boat_deck')
    if roof:
        for t in (-0.25, 0.0, 0.25):
            k.tube((cx + t * l - 0.0, cr - hw * 0.8, z + 0.22), (cx + t * l, cr - hw * 0.8, z + 0.9), 0.02, '#3a2a1a', 'boat_hoop', verts=4)
            k.tube((cx + t * l, cr + hw * 0.8, z + 0.22), (cx + t * l, cr + hw * 0.8, z + 0.9), 0.02, '#3a2a1a', 'boat_hoop', verts=4)
        k.poly([(cx - l * 0.3, cr - hw * 0.85, z + 0.9), (cx + l * 0.3, cr - hw * 0.85, z + 0.9), (cx + l * 0.3, cr, z + 1.08), (cx - l * 0.3, cr, z + 1.08)], ('#5a5a40', 0.25), 'boat_canvas')
        k.poly([(cx - l * 0.3, cr, z + 1.08), (cx + l * 0.3, cr, z + 1.08), (cx + l * 0.3, cr + hw * 0.85, z + 0.9), (cx - l * 0.3, cr + hw * 0.85, z + 0.9)], ('#6a6a4a', 0.25), 'boat_canvas')
    if lamp:
        k.tube((cx + l * 0.45, cr, z + 0.3), (cx + l * 0.45, cr, z + 1.1), 0.015, '#2a2a2a', 'boat_lamp_post', verts=4)
        k.sphere(cx + l * 0.45, cr, z + 1.05, 0.06, 0.07, '#5a3010', 'boat_lamp', emit=(lamp, 1.0), segs=8)
        k.point_light(cx + l * 0.45, cr + 0.2, z + 0.9, lamp, 10, radius=0.1, group='flicker')


# ---- rooms ------------------------------------------------------------------------------------------------------------------
def room(k, dr, x0, r0, x1, r1, h, door, floor='concrete', wall='#2e2a30', clad='brick', front_h=0.45, rng=None, tones=None):
    """A room below: the floor (poured concrete, or tiles), a tall back wall in its cladding with a skirting, pipes and a
    cable tray along its top, the side walls' tops, a low front wall with the doorway (door = (x_a, x_b)) and a lit
    threshold. Returns nothing; the scene puts in the rest."""
    rng = rng or k.rng
    if floor == 'concrete':
        concrete(k, x0, r0, x1, r1, tones=tones or CONC, rng=rng)
    else:
        Y.tile_floor(k, x0, r0, x1, r1, tones=tones or ('#3a3640', '#34303a'), size=0.5, seam='#141018')
    k.box(x0 - 0.6, r0 - 0.5, 0, x1 + 0.6, r0, h, (wall, 0.08), 'wall')
    _clad(k, x0 - 0.6, x1 + 0.6, r0, 0.25, h - 0.3, wall, clad, rng)
    k.box(x0 - 0.6, r0 - 0.02, 0, x1 + 0.6, r0 + 0.06, 0.25, shade(wall, 0.6), 'skirting')
    k.box(x0 - 0.6, r0 - 0.02, h - 0.3, x1 + 0.6, r0 + 0.1, h, shade(wall, 0.7), 'wall_beam')
    k.tube((x0 - 0.5, r0 + 0.22, h - 0.45), (x1 + 0.5, r0 + 0.22, h - 0.45), 0.07, ('#3a3a46', 0.06), 'pipe', verts=10)
    k.tube((x0 - 0.5, r0 + 0.36, h - 0.6), (x1 + 0.5, r0 + 0.36, h - 0.6), 0.04, (RUST, 0.08), 'pipe', verts=8)
    for s0, s1 in ((x0 - 0.6, x0), (x1, x1 + 0.6)):
        k.box(s0, r0 - 0.5, 0, s1, r1 + 0.6, h, (shade(wall, 0.8), 0.06), 'side_wall')
        k.box(s0 - 0.02, r0 - 0.5, h, s1 + 0.02, r1 + 0.6, h + 0.05, shade(wall, 0.55), 'wall_cap')
    for a, b in ((x0 - 0.6, door[0]), (door[1], x1 + 0.6)):
        k.box(a, r1, 0, b, r1 + 0.6, front_h, (shade(wall, 0.85), 0.06), 'front_wall')
        k.box(a, r1, front_h, b, r1 + 0.6, front_h + 0.05, shade(wall, 0.55), 'wall_cap')
    k.box(door[0], r1, -0.01, door[1], r1 + 0.6, 0.02, ('#2a2830', 0.08), 'floor_threshold')
    k.box(door[0] + 0.1, r1 + 0.02, 0.0, door[1] - 0.1, r1 + 0.04, 0.03, '#3a2a08', 'threshold_led', emit=(SODIUM, 0.7))


def pillar(k, cx, cr, w=0.8, h=4.0, col='#3a3840', posters=True, rng=None):
    """A square concrete pillar inside: board marks, a band of paint at the foot, a poster or two, a tube on it."""
    rng = rng or k.rng
    k.box(cx - w / 2, cr - w / 2, 0, cx + w / 2, cr + w / 2, h, (col, 0.12), 'pillar')
    k.box(cx - w / 2 - 0.02, cr + w / 2, 0.0, cx + w / 2 + 0.02, cr + w / 2 + 0.01, 0.9, ('#5a2a24', 0.15), 'pillar_paint')
    if posters and rng.random() < 0.7:
        pc = rng.choice(('#e8d8b8', '#c83040', '#e8c040', '#3a6ad0'))
        k.box(cx - w * 0.35, cr + w / 2, 1.1, cx + w * 0.3, cr + w / 2 + 0.012, 1.6, (pc, 0.25), 'poster')
        k.box(cx - w * 0.28, cr + w / 2 + 0.012, 1.35, cx + w * 0.22, cr + w / 2 + 0.015, 1.5, shade(pc, 0.4), 'poster_ink')
    k.solid(cx - w / 2, cr - w / 2, cx + w / 2, cr + w / 2)


def long_table(k, cx, cr, w=3.0, rng=None, cloth='#6a6a70'):
    """A long steel table with benches both sides, bowls, cups, chopsticks in a jar, a sauce bottle or two."""
    rng = rng or k.rng
    k.box(cx - w / 2, cr - 0.4, 0.7, cx + w / 2, cr + 0.4, 0.76, (cloth, 0.08), 'table_top')
    for dx in (-w / 2 + 0.15, w / 2 - 0.15):
        k.box(cx + dx - 0.04, cr - 0.3, 0, cx + dx + 0.04, cr + 0.3, 0.7, '#3a3a42', 'table_leg')
    for dd in (-0.75, 0.75):
        k.box(cx - w / 2 + 0.1, cr + dd - 0.15, 0.4, cx + w / 2 - 0.1, cr + dd + 0.15, 0.46, ('#5a5a62', 0.08), 'bench')
        for dx in (-w / 2 + 0.25, w / 2 - 0.25):
            k.box(cx + dx - 0.03, cr + dd - 0.1, 0, cx + dx + 0.03, cr + dd + 0.1, 0.4, '#3a3a42', 'bench_leg')
    for i in range(int(w / 0.45)):
        x = cx - w / 2 + 0.25 + i * 0.45
        if rng.random() < 0.6:
            Y.bowl(k, x, cr + rng.choice((-0.2, 0.2)), 0.76)
        elif rng.random() < 0.4:
            k.cyl(x, cr, 0.76, 0.86, 0.04, '#e8e0d0', 'cup', verts=6)
    k.cyl(cx, cr, 0.76, 0.92, 0.05, '#c8a060', 'chopstick_jar', verts=6)
    for i in range(2):
        k.cyl(cx + 0.18 + i * 0.1, cr - 0.05, 0.76, 0.98, 0.03, ('#8a1a10', '#2a1a10')[i], 'sauce', verts=6)
    k.solid(cx - w / 2, cr - 0.9, cx + w / 2, cr + 0.9)
