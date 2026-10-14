"""Enigma's docking bay: builders for scenekit (bpy).
Tile units: x = column, r = row (toward the camera), z = height.

A hangar cut into the station's hull: the back of the bay is open to space
behind a containment field, the skiff settles into a clamp cradle on the
deck, the crew's old tug lies dead in the next berth under a gantry, and
cargo, a control booth, suit lockers and the inner airlock fill the rest.
"""
import math

from scenekit import shade
import assets_ship as P
import assets_station as T

HULL = ['#0c141a', '#16212a', '#22303c', '#33475a']
STRIPE = '#d8b020'
FIELD = '#5ad0e8'
RUST = '#7a4228'
BOX_COLS = ['#7a4228', '#2a5a60', '#5a6070', '#8a7030', '#4a2a48']


# ---- the bay's shell --------------------------------------------------------------------------
def deck(k, x0, r0, x1, r1):
    """Heavy deck plates with lane paint, tie-down rings and drain grates."""
    P.metal_floor(k, x0, r0, x1, r1, tones=('#1a242c', '#1e2a32', '#3a4a58'), panel=1.0)
    for _ in range(int((x1 - x0) * (r1 - r0) * 0.03)):     # oil and scorch, faint
        x, r = k.rng.uniform(x0 + 0.5, x1 - 0.5), k.rng.uniform(r0 + 0.5, r1 - 0.5)
        k.blob(x, r, 0.001, k.rng.uniform(0.12, 0.32), k.rng.uniform(0.08, 0.22), 0.002,
               k.rng.choice(('#141c22', '#181a1c', '#121a20')), 'stain', segs=10, smooth=False)


def tie_down(k, x, r):
    k.cyl(x, r, 0.0, 0.012, 0.11, '#4a5a68', 'tiedown', verts=10)
    k.cyl(x, r, 0.0, 0.016, 0.05, '#0a0e12', 'tiedown_hole', verts=8)


def lane(k, x0, r0, x1, r1, col=STRIPE, dash=0.6, gap=0.4, w=0.06):
    """Painted dashed line on the deck."""
    L = math.hypot(x1 - x0, r1 - r0)
    t = 0.0
    while t < L:
        e = min(L, t + dash)
        a, b = t / L, e / L
        k.bar(x0 + (x1 - x0) * a, r0 + (r1 - r0) * a, x0 + (x1 - x0) * b, r0 + (r1 - r0) * b, 0.0, 0.004, w,
              shade(col, 0.7), 'lane_paint')
        t = e + gap


def mouth(k, x0, x1, r, h=7.2, post=1.4):
    """The open back of the bay: the deck's edge with hazard bands and field
    emitters, two massive frame posts and a lintel, warning beacons, the
    bay number. Returns the emitters' x positions."""
    k.box(x0, r - 0.5, -0.7, x1, r + 0.05, -0.02, (HULL[1], 0.08), 'deck_edge')
    k.box(x0, r - 0.5, -1.4, x1, r - 0.2, -0.7, HULL[0], 'deck_underside')
    P.hazard_stripes(k, x0 + post, x1 - post, r + 0.02, r + 0.42)
    emitters = []
    x = x0 + post + 0.6
    while x < x1 - post - 0.3:
        k.box(x - 0.16, r - 0.18, 0.0, x + 0.16, r + 0.08, 0.14, (HULL[3], 0.06), 'emitter')
        k.box(x - 0.1, r - 0.12, 0.14, x + 0.1, r + 0.02, 0.18, shade(FIELD, 0.4), 'emitter_lens', emit=(FIELD, 0.9))
        emitters.append(x)
        x += 1.25
    for (a, b) in ((x0, x0 + post), (x1 - post, x1)):
        k.box(a, r - 1.2, 0.0, b, r + 0.35, h, (HULL[2], 0.06), 'mouth_post', bevel=0.03)
        k.box(a + 0.15, r + 0.35, 0.3, b - 0.15, r + 0.4, h - 1.6, (HULL[3], 0.06), 'post_panel')
        # chevrons up the post's face
        z = 0.5
        while z < 2.2:
            k.bar(a + 0.25, r + 0.41, b - 0.25, r + 0.41, z, z + 0.12, 0.02, STRIPE, 'post_chevron')
            z += 0.32
        for zz in (2.8, 4.2):
            k.box((a + b) / 2 - 0.12, r + 0.4, zz, (a + b) / 2 + 0.12, r + 0.48, zz + 0.16, '#2a0808', 'beacon',
                  emit=(T.WARN_R, 1.0))
        k.point_light((a + b) / 2, r + 0.9, 3.0, T.WARN_R, 18, radius=0.15, group='flicker')
        k.box(a + 0.3, r + 0.35, h - 1.4, b - 0.3, r + 0.45, h - 1.1, shade(FIELD, 0.3), 'post_emitter', emit=(FIELD, 0.8))
    # the lintel: a deep beam with ribs, lights on its belly
    k.box(x0, r - 1.2, h - 1.2, x1, r + 0.35, h, (HULL[2], 0.06), 'lintel', bevel=0.03)
    k.box(x0, r + 0.35, h - 1.05, x1, r + 0.4, h - 0.15, (HULL[3], 0.06), 'lintel_face')
    x = x0 + post + 1.0
    while x < x1 - post:
        k.box(x - 0.08, r + 0.38, h - 1.2, x + 0.08, r + 0.46, h, HULL[1], 'lintel_rib')
        k.box(x - 0.3, r - 0.2, h - 1.24, x + 0.3, r + 0.1, h - 1.2, shade(FIELD, 0.35), 'lintel_light', emit=(FIELD, 0.85))
        x += 2.5
    return emitters


def bay_wall(k, x0, x1, r0, r1, h=5.0, side='left'):
    """A side wall of the bay: ribbed, with conduit runs and an LED strip."""
    P.ship_side_wall(k, x0, x1, r0, r1, h, pal=HULL)
    def inward(a, d):
        return (a, a + d) if side == 'left' else (a - d, a)
    inner = x1 if side == 'left' else x0
    r = r0 + 0.8
    while r < r1 - 0.3:
        u0, u1 = inward(inner, 0.14)
        k.box(u0, r - 0.08, 0.0, u1, r + 0.08, h, (HULL[3], 0.06), 'wall_rib')
        r += 1.6
    for z in (1.1, 3.6):
        u0, u1 = inward(inner, 0.12)
        k.box(u0, r0, z, u1, r1, z + 0.12, ('#202a32', 0.06), 'wall_conduit')
    u0, u1 = inward(inner, 0.03)
    k.box(u0, r0, 2.4, u1, r1, 2.44, shade(T.TEAL, 0.3), 'wall_led', emit=(T.TEAL, 0.6))


# ---- the cradle ------------------------------------------------------------------------------------------
def cradle(k, cx, cr, w=7.0, d=3.6):
    """Recessed landing cradle: dark plates, lit edge, corner chevrons and
    four clamp arms waiting open."""
    x0, x1, r0, r1 = cx - w / 2, cx + w / 2, cr - d / 2, cr + d / 2
    k.box(x0, r0, -0.03, x1, r1, 0.004, ('#12181e', 0.08), 'cradle_bed')
    for i in range(1, int(w)):
        k.box(x0 + i - 0.01, r0, 0.004, x0 + i + 0.01, r1, 0.008, '#0a0e12', 'cradle_seam')
    edge = [(x0, r0 - 0.06, x1, r0), (x0, r1, x1, r1 + 0.06), (x0 - 0.06, r0, x0, r1), (x1, r0, x1 + 0.06, r1)]
    for (a, b, c, d_) in edge:
        k.box(a, b, 0.0, c, d_, 0.02, shade(FIELD, 0.4), 'cradle_edge', emit=(FIELD, 0.7))
    for (sx, sr) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        px, pr = cx + sx * (w / 2 - 0.35), cr + sr * (d / 2 - 0.3)
        for j in range(3):
            o = 0.2 + j * 0.22
            k.bar(px - sx * o, pr, px - sx * o + sx * 0.12, pr - sr * 0.14, 0.004, 0.01, 0.05, STRIPE, 'cradle_chevron')
        clamp(k, cx + sx * (w / 2 + 0.25), cr + sr * (d / 2 - 0.5), sx)
    k.cyl(cx, cr, 0.004, 0.009, 0.5, shade(STRIPE, 0.6), 'cradle_mark', verts=24)
    k.cyl(cx, cr, 0.009, 0.012, 0.42, '#12181e', 'cradle_mark_in', verts=24)


def clamp(k, x, r, side):
    """A docking clamp: a pedestal by the cradle with a hinged arm swung back."""
    k.box(x - 0.28, r - 0.28, 0.0, x + 0.28, r + 0.28, 0.42, (HULL[2], 0.06), 'clamp_base', bevel=0.03)
    k.box(x - 0.2, r - 0.29, 0.12, x + 0.2, r - 0.27, 0.3, STRIPE, 'clamp_stripe')
    k.cyl_y(x, r - 0.3, r + 0.3, 0.55, 0.14, 0.14, ('#3a4a58', 0.05), 'clamp_hinge', verts=12)
    tip = (x - side * 0.25, r, 1.35)
    k.tube((x, r, 0.55), tip, 0.08, ('#4a5a68', 0.05), 'clamp_arm', verts=8)
    k.tube(tip, (x - side * 0.7, r, 1.25), 0.06, ('#4a5a68', 0.05), 'clamp_arm', verts=8)
    k.box(x - side * 0.75 - 0.08, r - 0.18, 1.05, x - side * 0.75 + 0.08, r + 0.18, 1.3, STRIPE, 'clamp_jaw')
    k.sphere(x, r, 0.47, 0.05, 0.05, '#103030', 'clamp_led', emit=(T.LED_G, 1.0), segs=6)
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)


def guide_studs(k, x, r0, r1, step=0.6):
    """A line of dim inset lights in the deck (the engine runs a chase down them)."""
    pts = []
    r = r0
    while r <= r1:
        k.cyl(x, r, 0.0, 0.012, 0.07, shade(FIELD, 0.3), 'guide_stud', emit=(FIELD, 0.35), verts=8)
        pts.append((x, r))
        r += step
    return pts


# ---- the derelict tug ----------------------------------------------------------------------------
def tug(k, x0, rc, L=5.2, hull='#b08a3a', trim='#2a2a2e'):
    """The station's old work tug, dead in its berth: a boxy hull with a
    blunt cockpit (to the left), one engine pod on its pylon, the other torn
    away, a hull panel off with cables spilling to the deck, landing struts."""
    prof = [(0.0, 0.62, 0.55, 0.55, 1.15), (0.12, 0.8, 0.7, 0.62, 1.2), (0.7, 0.82, 0.72, 0.62, 1.2),
            (0.9, 0.7, 0.6, 0.55, 1.15), (1.0, 0.5, 0.42, 0.45, 1.1)]
    rings = [P._shuttle_ring(x0 + t * L, rc, hw, (ht + hb) / 2, zc, n=16) for (t, hw, ht, hb, zc) in prof]
    k.loft(rings, (hull, 0.08), 'tug_hull', closed=True)
    # stripes, panel seams, rust streaks
    for t in (0.2, 0.42, 0.62, 0.8):
        x = x0 + t * L
        k.box(x - 0.015, rc + 0.6, 0.6, x + 0.015, rc + 0.86, 1.8, shade(hull, 0.7), 'tug_seam')
    k.box(x0 + 0.5, rc + 0.8, 1.32, x0 + L * 0.9, rc + 0.84, 1.48, trim, 'tug_stripe')
    for i in range(6):
        x = x0 + k.rng.uniform(0.6, L - 0.6)
        k.box(x, rc + 0.82, k.rng.uniform(0.7, 1.0), x + 0.05, rc + 0.85, k.rng.uniform(1.1, 1.3), shade(RUST, 0.7), 'rust')
    # cockpit: a blunt window band at the left end
    k.box(x0 - 0.02, rc - 0.45, 1.3, x0 + 0.5, rc + 0.45, 1.62, '#0a1418', 'tug_glass', emit=('#203038', 0.4))
    k.box(x0 + 0.1, rc + 0.62, 1.3, x0 + 0.9, rc + 0.72, 1.6, '#0a1418', 'tug_glass', emit=('#203038', 0.4))
    k.tube((x0 + 0.3, rc + 0.66, 1.5), (x0 + 0.6, rc + 0.66, 1.4), 0.008, '#a0b0c0', 'glass_crack', verts=4)
    # the name, stencilled on the flank
    # engine pod on the far side (still there) and the torn pylon on the near side
    k.cyl_x(x0 + L * 0.55, x0 + L + 0.3, rc - 1.25, 1.05, 0.32, 0.32, ('#5a5a5a', 0.06), 'tug_pod', verts=14)
    k.cyl_x(x0 + L + 0.3, x0 + L + 0.36, rc - 1.25, 1.05, 0.22, 0.22, '#1a1a1a', 'tug_nozzle', verts=14)
    k.box(x0 + L * 0.6, rc - 1.0, 0.98, x0 + L * 0.85, rc - 0.6, 1.12, ('#4a4a4a', 0.06), 'tug_pylon')
    k.box(x0 + L * 0.62, rc + 0.6, 0.95, x0 + L * 0.8, rc + 1.05, 1.1, ('#4a4a4a', 0.06), 'tug_pylon')
    for i in range(5):     # torn ends
        x = x0 + L * 0.62 + i * 0.045
        k.tube((x, rc + 1.05, 1.02), (x + k.rng.uniform(-0.1, 0.1), rc + 1.2, k.rng.uniform(0.85, 1.15)), 0.012,
               '#6a6a6a', 'tug_torn', verts=4)
    # the open panel: a dark hole, the panel lying on the deck, cables pouring out
    hx = x0 + L * 0.35
    k.box(hx, rc + 0.79, 0.85, hx + 0.7, rc + 0.86, 1.25, '#06080a', 'tug_hole')
    k.box(hx - 0.1, rc + 1.25, 0.0, hx + 0.6, rc + 1.65, 0.04, (hull, 0.08), 'tug_panel')
    for i in range(4):
        a = (hx + 0.15 + i * 0.13, rc + 0.85, 0.95 + k.rng.uniform(0, 0.2))
        b = (hx + k.rng.uniform(-0.2, 0.9), rc + k.rng.uniform(1.3, 1.9), 0.02)
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.1, 0.35)
        col = ('#14181c', '#a03020', '#e0a020', '#14181c')[i]
        k.tube(a, m, 0.022, col, 'tug_cable', verts=5)
        k.tube(m, b, 0.022, col, 'tug_cable', verts=5)
    # struts
    for (sx, sr) in ((0.15, -0.5), (0.15, 0.5), (0.85, -0.5), (0.85, 0.5)):
        x = x0 + L * sx
        k.tube((x, rc + sr * 0.9, 0.7), (x + (0.15 if sx < 0.5 else -0.15), rc + sr * 1.2, 0.05), 0.05, '#3a3a3a', 'tug_strut', verts=6)
        k.box(x - 0.2, rc + sr * 1.2 - 0.12, 0.0, x + 0.2, rc + sr * 1.2 + 0.12, 0.06, '#2a2a2a', 'tug_foot')
    # a dead running light and one still blinking
    k.sphere(x0 + L, rc + 0.6, 1.5, 0.05, 0.05, '#300808', 'tug_light_dead', segs=6)
    k.sphere(x0 + 0.1, rc + 0.62, 1.75, 0.05, 0.05, '#300808', 'tug_light', emit=(T.WARN_R, 1.0), segs=6)
    k.point_light(x0 + 0.1, rc + 1.0, 1.8, T.WARN_R, 3, radius=0.1, group='flicker')
    k.solid(x0 - 0.1, rc - 1.6, x0 + L + 0.4, rc + 1.3)


def gantry(k, x0, x1, r0, r1, h=4.2, hook=None):
    """A rolling gantry over a berth: four legs on rails, two beams, a hoist."""
    for x in (x0, x1):
        k.box(x - 0.18, r0 - 0.4, 0.0, x + 0.18, r1 + 0.4, 0.08, '#2a3038', 'gantry_rail')
        for r in (r0, r1):
            k.box(x - 0.12, r - 0.12, 0.08, x + 0.12, r + 0.12, h, ('#a08030', 0.06), 'gantry_leg')
            k.box(x - 0.2, r - 0.25, 0.04, x + 0.2, r + 0.25, 0.2, '#2a2a2a', 'gantry_truck')
            k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
        k.box(x - 0.14, r0, h - 0.3, x + 0.14, r1, h, ('#a08030', 0.06), 'gantry_beam')
    for r in (r0, r1):
        k.box(x0, r - 0.14, h - 0.32, x1, r + 0.14, h, ('#a08030', 0.06), 'gantry_beam')
        x = x0 + 0.3
        while x < x1 - 0.2:
            k.box(x, r + 0.14, h - 0.3, x + 0.1, r + 0.16, h, STRIPE, 'gantry_stripe')
            x += 0.5
    if hook:            # a trolley on the front beam, its hoist block hanging under it
        hx, hr, hz = hook
        k.box(hx - 0.3, r1 - 0.2, h - 0.05, hx + 0.3, r1 + 0.2, h + 0.1, '#3a3a3a', 'hoist_trolley')
        k.box(hx - 0.25, hr - 0.25, h - 0.55, hx + 0.25, hr + 0.25, h - 0.15, ('#4a4a4a', 0.06), 'hoist')
        z = h - 0.6
        while z > hz + 0.1:
            k.tube((hx, hr, z), (hx, hr, z - 0.12), 0.03, '#6a6a6a', 'hoist_chain', verts=5)
            z -= 0.14
        k.tube((hx, hr, hz + 0.1), (hx + 0.1, hr, hz - 0.1), 0.04, STRIPE, 'hoist_hook', verts=6)


# ---- cargo ------------------------------------------------------------------------------------
def container(k, x0, r0, w, d, h, col, z0=0.0, code=None):
    """Corrugated cargo container, doors toward the camera."""
    x1, r1 = x0 + w, r0 + d
    k.box(x0, r0, z0, x1, r1, z0 + h, (col, 0.08), 'container', bevel=0.02)
    x = x0 + 0.08
    while x < x1 - 0.05:
        k.box(x, r1, z0 + 0.06, x + 0.05, r1 + 0.025, z0 + h - 0.06, shade(col, 0.8), 'container_rib')
        x += 0.14
    k.box(x0 - 0.02, r1 - 0.02, z0, x1 + 0.02, r1 + 0.03, z0 + 0.06, shade(col, 0.6), 'container_rail')
    k.box(x0 - 0.02, r1 - 0.02, z0 + h - 0.06, x1 + 0.02, r1 + 0.03, z0 + h, shade(col, 0.6), 'container_rail')
    for xx in (x0 + w * 0.3, x0 + w * 0.7):
        k.box(xx - 0.02, r1 + 0.02, z0 + 0.1, xx + 0.02, r1 + 0.05, z0 + h - 0.1, '#9a9a9a', 'container_bar')
    if code:
        k.box(x0 + 0.12, r1 + 0.03, z0 + h - 0.32, x0 + 0.12 + 0.07 * len(code), r1 + 0.035, z0 + h - 0.2, '#e8e0d0', 'container_code')
    # a top that can catch light
    k.box(x0 + 0.04, r0 + 0.04, z0 + h, x1 - 0.04, r1 - 0.04, z0 + h + 0.015, shade(col, 1.15), 'container_top')


def crate(k, cx, cr, s=0.5, col='#5a4a32', z=0.0):
    k.box(cx - s / 2, cr - s / 2, z, cx + s / 2, cr + s / 2, z + s, (col, 0.1), 'crate', bevel=0.015)
    for (a, b) in ((cx - s / 2 + 0.03, cx - s / 2 + 0.08), (cx + s / 2 - 0.08, cx + s / 2 - 0.03)):
        k.box(a, cr + s / 2, z + 0.02, b, cr + s / 2 + 0.015, z + s - 0.02, shade(col, 0.75), 'crate_slat')
    k.bar(cx - s / 2 + 0.06, cr + s / 2 + 0.008, cx + s / 2 - 0.06, cr + s / 2 + 0.008, z + 0.06, z + s - 0.06, 0.012,
          shade(col, 0.75), 'crate_brace')


def fuel_cells(k, cx, cr, n=6, col='#40e0a0'):
    """A pallet of fuel cells, each with a glowing band."""
    k.box(cx - 0.55, cr - 0.4, 0.0, cx + 0.55, cr + 0.4, 0.1, '#5a4a32', 'pallet')
    for i in range(n):
        x = cx - 0.38 + (i % 3) * 0.38
        r = cr - 0.18 + (i // 3) * 0.36
        k.cyl(x, r, 0.1, 0.62, 0.14, ('#3a4450', 0.05), 'fuel_cell', verts=12)
        k.cyl(x, r, 0.4, 0.46, 0.145, shade(col, 0.4), 'fuel_band', emit=(col, 0.8), verts=12)
        k.cyl(x, r, 0.62, 0.66, 0.06, '#8a8a8a', 'fuel_cap', verts=8)
    k.point_light(cx, cr + 0.6, 0.6, col, 6, radius=0.3, group='flicker')
    k.solid(cx - 0.55, cr - 0.4, cx + 0.55, cr + 0.4)


def loader(k, cx, cr):
    """A cargo-loader exosuit slumped against the crates: a cage cockpit on
    two thick legs, big pincer arms hanging, its lamp dark."""
    for s in (-1, 1):
        k.box(cx + s * 0.32 - 0.14, cr - 0.2, 0.0, cx + s * 0.32 + 0.14, cr + 0.25, 0.12, '#2a2a2a', 'loader_foot')
        k.tube((cx + s * 0.32, cr, 0.1), (cx + s * 0.3, cr + 0.05, 0.75), 0.1, ('#b08020', 0.06), 'loader_leg', verts=8)
    k.box(cx - 0.42, cr - 0.35, 0.75, cx + 0.42, cr + 0.3, 1.45, ('#b08020', 0.06), 'loader_body', bevel=0.04)
    k.box(cx - 0.32, cr + 0.3, 0.9, cx + 0.32, cr + 0.32, 1.35, '#101418', 'loader_cage')
    for x in (cx - 0.2, cx, cx + 0.2):
        k.box(x - 0.015, cr + 0.32, 0.9, x + 0.015, cr + 0.35, 1.35, '#3a3a3a', 'loader_bar')
    for s in (-1, 1):
        sh = (cx + s * 0.5, cr, 1.3)
        el = (cx + s * 0.7, cr + 0.3, 0.75)
        k.tube(sh, el, 0.07, ('#b08020', 0.06), 'loader_arm', verts=8)
        k.tube(el, (cx + s * 0.75, cr + 0.45, 0.2), 0.06, ('#5a5a5a', 0.06), 'loader_arm', verts=8)
        k.box(cx + s * 0.75 - 0.1, cr + 0.38, 0.0, cx + s * 0.75 + 0.1, cr + 0.6, 0.25, '#3a3a3a', 'loader_claw')
    k.cyl_y(cx, cr + 0.3, cr + 0.36, 1.55, 0.08, 0.08, '#202020', 'loader_lamp', verts=10)
    k.solid(cx - 0.5, cr - 0.4, cx + 0.5, cr + 0.4)


# ---- the control booth and the inner airlock ---------------------------------------------------------
def control_booth(k, x0, x1, r0, r1, floor=1.6, top=3.4):
    """A raised glass booth on legs overlooking the cradle: lit screens and
    a slumped chair inside, a ladder up its side, lockers under it."""
    for x in (x0 + 0.15, x1 - 0.15):
        for r in (r0 + 0.15, r1 - 0.15):
            k.box(x - 0.1, r - 0.1, 0.0, x + 0.1, r + 0.1, floor, (HULL[2], 0.06), 'booth_leg')
    k.box(x0, r0, floor, x1, r1, floor + 0.15, (HULL[2], 0.06), 'booth_floor', bevel=0.02)
    k.box(x0, r0, floor + 0.15, x1, r0 + 0.12, top, (HULL[1], 0.06), 'booth_back')
    for x in (x0, x1 - 0.12):
        k.box(x, r0, floor + 0.15, x + 0.12, r1, top, (HULL[1], 0.06), 'booth_side')
    k.box(x0, r1 - 0.1, floor + 0.15, x1, r1, floor + 0.55, (HULL[2], 0.06), 'booth_sill')
    # the glass front: dark, with the screens' light behind
    k.box(x0 + 0.12, r1 - 0.06, floor + 0.55, x1 - 0.12, r1 - 0.03, top - 0.1, '#0a1820', 'booth_glass',
          emit=('#0e2a34', 0.5))
    m = x0 + 0.12
    while m < x1 - 0.1:
        k.box(m - 0.03, r1 - 0.08, floor + 0.55, m + 0.03, r1, top - 0.1, HULL[0], 'booth_mullion')
        m += (x1 - x0 - 0.24) / 3
    k.box(x0 - 0.05, r0 - 0.05, top, x1 + 0.05, r1 + 0.1, top + 0.18, (HULL[2], 0.06), 'booth_roof', bevel=0.02)
    k.box(x0, r1 + 0.04, top - 0.04, x1, r1 + 0.1, top, shade(T.TEAL, 0.4), 'booth_led', emit=(T.TEAL, 0.8))
    # screens inside, seen through the glass
    for i, col in enumerate((T.TEAL, T.LED_G, T.WARN_Y)):
        x = x0 + 0.5 + i * (x1 - x0 - 1.0) / 2
        k.box(x - 0.3, r0 + 0.5, floor + 0.7, x + 0.3, r0 + 0.55, floor + 1.1, shade(col, 0.4), 'booth_screen', emit=(col, 0.9))
    k.point_light((x0 + x1) / 2, r1 - 0.4, floor + 1.0, T.TEAL, 14, radius=0.4, group='flicker')
    # ladder up the left side
    lx = x0 - 0.2
    for side in (r1 - 0.55, r1 - 0.2):
        k.box(lx - 0.03, side - 0.03, 0.0, lx + 0.03, side + 0.03, floor + 0.7, '#5a6470', 'ladder_rail')
    z = 0.25
    while z < floor + 0.5:
        k.box(lx - 0.025, r1 - 0.55, z, lx + 0.025, r1 - 0.2, z + 0.04, '#5a6470', 'ladder_rung')
        z += 0.28
    k.solid(x0 - 0.3, r0, x1, r1)


def airlock_hatch(k, x, r0, r1, h=2.6):
    """A heavy hatch in the bay's right-hand wall (inner face at x) into the
    station: frame, a door split down the middle, status light, hazard sill."""
    k.box(x - 0.3, r0 - 0.3, 0.0, x, r0, h + 0.3, (HULL[3], 0.06), 'hatch_frame')
    k.box(x - 0.3, r1, 0.0, x, r1 + 0.3, h + 0.3, (HULL[3], 0.06), 'hatch_frame')
    k.box(x - 0.3, r0 - 0.3, h, x, r1 + 0.3, h + 0.35, (HULL[3], 0.06), 'hatch_frame')
    mid = (r0 + r1) / 2
    for (a, b) in ((r0, mid - 0.02), (mid + 0.02, r1)):
        k.box(x - 0.1, a, 0.0, x, b, h, ('#3a4a58', 0.06), 'hatch_door', bevel=0.03)
    for zz in (0.5, 1.4, 2.2):
        k.box(x - 0.13, r0 + 0.1, zz, x - 0.1, r1 - 0.1, zz + 0.06, STRIPE, 'hatch_band')
    k.box(x - 0.36, mid - 0.15, h + 0.08, x - 0.3, mid + 0.15, h + 0.22, '#082010', 'hatch_light', emit=(T.LED_G, 1.0))
    k.point_light(x - 0.6, mid, h, T.LED_G, 8, radius=0.1, group='flicker')
    P.hazard_stripes(k, x - 1.0, x - 0.02, r0, r1)


# ---- crew things --------------------------------------------------------------------------------
def suit_rack(k, x0, r_face, n=4, missing=(2,)):
    """Wall rack of EVA suits, one gap where a suit should hang."""
    k.box(x0, r_face, 2.1, x0 + n * 0.7 + 0.1, r_face + 0.12, 2.2, '#3a4450', 'rack_rail')
    for i in range(n):
        cx = x0 + 0.4 + i * 0.7
        k.box(cx - 0.02, r_face + 0.05, 1.95, cx + 0.02, r_face + 0.2, 2.12, '#5a6470', 'rack_hook')
        if i in missing:
            k.box(cx - 0.18, r_face + 0.01, 0.4, cx + 0.18, r_face + 0.02, 1.9, '#141c22', 'suit_shadow')
            continue
        col = ('#d8d0c0', '#c87830', '#d8d0c0', '#5a8aa8')[i % 4]
        k.blob(cx, r_face + 0.22, 1.5, 0.22, 0.14, 0.32, (col, 0.06), 'suit_torso', segs=12)
        k.sphere(cx, r_face + 0.22, 1.98, 0.17, 0.16, '#2a3a48', 'suit_helmet', segs=12)
        k.blob(cx, r_face + 0.34, 1.98, 0.12, 0.04, 0.1, '#0c1820', 'suit_visor', emit=('#3a6070', 0.3), segs=10)
        for s in (-1, 1):
            k.tube((cx + s * 0.2, r_face + 0.22, 1.7), (cx + s * 0.26, r_face + 0.24, 1.15), 0.07, (col, 0.06), 'suit_arm', verts=8)
            k.tube((cx + s * 0.1, r_face + 0.22, 1.2), (cx + s * 0.11, r_face + 0.24, 0.45), 0.08, (col, 0.06), 'suit_leg', verts=8)
            k.box(cx + s * 0.11 - 0.08, r_face + 0.15, 0.36, cx + s * 0.11 + 0.08, r_face + 0.36, 0.48, '#2a2a2a', 'suit_boot')
        k.box(cx - 0.08, r_face + 0.35, 1.55, cx + 0.08, r_face + 0.37, 1.65, shade(T.TEAL, 0.4), 'suit_chest', emit=(T.TEAL, 0.5))


def camp(k, cx, cr):
    """Someone has been sleeping here: a bedroll, a camp lantern still lit,
    a mug, ration tins, a scrawled map taped to a crate."""
    k.box(cx - 0.55, cr - 0.25, 0.0, cx + 0.55, cr + 0.25, 0.08, ('#4a5a3a', 0.08), 'bedroll', bevel=0.03)
    k.cyl_y(cx - 0.6, cr - 0.25, cr + 0.25, 0.1, 0.1, 0.1, ('#5a6a48', 0.08), 'bedroll_roll', verts=12)
    k.blob(cx + 0.3, cr - 0.05, 0.1, 0.25, 0.18, 0.05, '#6a5a48', 'blanket', segs=10)
    lx, lr = cx + 0.85, cr - 0.1
    k.cyl(lx, lr, 0.0, 0.06, 0.08, '#3a3a3a', 'lantern_base', verts=8)
    k.cyl(lx, lr, 0.06, 0.24, 0.06, '#806020', 'lantern_glass', emit=('#ffc860', 0.95), verts=8)
    k.cyl(lx, lr, 0.24, 0.28, 0.07, '#3a3a3a', 'lantern_cap', verts=8)
    k.point_light(lx, lr + 0.1, 0.35, '#ffb050', 14, radius=0.08, group='flicker')
    k.cyl(cx + 0.65, cr + 0.25, 0.0, 0.1, 0.045, '#c8c0b0', 'mug', verts=10)
    for i in range(3):
        k.cyl(cx - 0.2 + i * 0.13, cr + 0.38, 0.0, 0.07, 0.05, '#8a8a7a', 'tin', verts=8)


def workbench(k, x0, x1, r_face):
    """A bench against the front of the bay with a half-gutted drone on it."""
    k.box(x0, r_face - 0.6, 0.78, x1, r_face, 0.85, ('#3a4450', 0.06), 'bench_top')
    for x in (x0 + 0.08, x1 - 0.08):
        k.box(x - 0.05, r_face - 0.55, 0.0, x + 0.05, r_face - 0.05, 0.78, '#22303c', 'bench_leg')
    cx = (x0 + x1) / 2
    k.blob(cx, r_face - 0.3, 0.98, 0.24, 0.2, 0.12, ('#c8c0b0', 0.06), 'drone_shell', segs=12)
    k.box(cx - 0.1, r_face - 0.3, 0.95, cx + 0.12, r_face - 0.1, 1.04, '#06080a', 'drone_open')
    k.sphere(cx + 0.05, r_face - 0.18, 1.03, 0.04, 0.04, '#082010', 'drone_eye', emit=(T.LED_G, 0.9), segs=6)
    for i in range(3):
        k.box(x0 + 0.15 + i * 0.12, r_face - 0.5, 0.85, x0 + 0.22 + i * 0.12, r_face - 0.42, 0.87, '#8a8a8a', 'tool')
    k.tube((x1 - 0.3, r_face - 0.5, 0.86), (x1 - 0.1, r_face - 0.3, 0.86), 0.015, '#c03020', 'tool', verts=5)
    k.solid(x0, r_face - 0.6, x1, r_face)


def floor_text(k, text, fontname, cx, cr, size, col, z=0.006):
    """Big stencil lettering painted flat on the deck, reading left to right."""
    import bpy
    import assets_signs as SG
    from scenekit import S as ROWS_S
    o = SG._text_obj(text, fontname, size, extrude=0.002)
    o.scale = (1, ROWS_S, 1)
    o.location = (cx, -cr * ROWS_S, z)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    mo = bpy.data.objects.new('floor_text', me)
    mo.matrix_world = o.matrix_world.copy()
    bpy.context.scene.collection.objects.link(mo)
    bpy.data.objects.remove(o)
    return k._finish(mo, col, 'floor_text')
