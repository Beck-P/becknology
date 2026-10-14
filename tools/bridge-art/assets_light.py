"""Sapphire's lighthouse, inside (scenekit, bpy): the keeper's room and the
lamp room at the top. Tile units: x = column, r = row (toward the camera),
z = height.
"""
import math

from scenekit import shade
import assets_lumar as A

WHITE = '#a8a4b4'       # whitewashed stone, reads pale under the lamp
LAMP = '#a0c8ff'


def fresnel_lens(k, cx, cr, rad=0.8, h=2.3, z0=0.55):
    """The great lens: a barrel of ribbed glass prisms glowing round a cold
    blue lamp, held in brass struts on an iron pedestal, a brass crown on
    top and the clockwork's turning gear at its foot."""
    k.cyl(cx, cr, 0.0, 0.12, rad + 0.3, ('#3a3a44', 0.08), 'lens_plinth', verts=20)
    k.cyl(cx, cr, 0.12, z0 - 0.06, rad * 0.6, ('#2a2a34', 0.08), 'lens_pedestal', verts=16)
    k.cyl(cx, cr, z0 - 0.08, z0, rad + 0.06, ('#d0a048', 0.08), 'lens_ring_base', verts=24)
    n = 10
    for i in range(n):
        za = z0 + i * (h - z0) / n
        zb = za + (h - z0) / n
        t = abs(i - (n - 1) / 2) / ((n - 1) / 2)
        rr = rad * (1.0 - 0.12 * t * t)
        k.cyl(cx, cr, za, zb - 0.015, rr, '#203858', 'lens_glass', emit=(LAMP, 0.95 if i % 2 else 0.6), verts=24)
        k.cyl(cx, cr, zb - 0.015, zb, rr + 0.012, '#141c2a', 'lens_seam', verts=24)
    for i in range(8):                        # brass struts up the barrel
        a = i * math.tau / 8 + 0.2
        k.tube((cx + math.cos(a) * (rad + 0.03), cr + math.sin(a) * (rad + 0.03), z0),
               (cx + math.cos(a) * (rad + 0.03), cr + math.sin(a) * (rad + 0.03), h), 0.022, ('#d0a048', 0.08), 'lens_strut', verts=5)
    k.cyl(cx, cr, h, h + 0.08, rad + 0.06, ('#d0a048', 0.08), 'lens_crown', verts=24)
    k.cone(cx, cr, h + 0.08, h + 0.4, rad * 0.75, 0.12, ('#b08838', 0.1), 'lens_dome', verts=16)
    k.cyl(cx, cr, h + 0.4, h + 0.5, 0.08, '#2a2a34', 'lens_vent', verts=8)
    for i in range(10):                       # the turning gear
        a = i * math.tau / 10
        gx, gr = cx + math.cos(a) * (rad + 0.22), cr + math.sin(a) * (rad + 0.22)
        k.box(gx - 0.04, gr - 0.04, 0.12, gx + 0.04, gr + 0.04, 0.2, '#6a5a3a', 'gear_tooth')
    k.point_light(cx, cr + rad + 0.5, 1.3, LAMP, 45, radius=0.3, group='pulse')
    k.point_light(cx, cr - rad - 0.5, 1.6, LAMP, 25, radius=0.3, group='pulse')
    k.solid(cx - rad - 0.2, cr - rad - 0.2, cx + rad + 0.2, cr + rad + 0.2)


def log_table(k, cx, cr, open_book=True):
    """A small table, the logbook open on it under a lamp, a pen and a mug."""
    A.round_table(k, cx, cr, top=0.75, radius=0.45)
    if open_book:
        for s in (-1, 1):
            k.box(cx + (0.0 if s > 0 else -0.28), cr - 0.15, 0.78, cx + (0.28 if s > 0 else 0.0), cr + 0.15, 0.8, ('#e8e0c8', 0.05),
                  'log_page')
            for i in range(4):
                k.box(cx + (0.04 if s > 0 else -0.24), cr - 0.1 + i * 0.06, 0.8, cx + (0.2 if s > 0 else -0.06),
                      cr - 0.09 + i * 0.06, 0.803, '#3a2a1a', 'log_ink')
        k.box(cx - 0.3, cr - 0.17, 0.75, cx + 0.3, cr + 0.17, 0.78, '#2a3a6a', 'log_cover')
    A.desk_lamp(k, cx + 0.3, cr - 0.25, 0.75, energy=5.0)
    A.mug(k, cx - 0.3, cr + 0.25, 0.75)


def oil_drums(k, x, r, n=3):
    """Drums of lamp oil, stencilled, a funnel on top of one."""
    for i in range(n):
        cx, cr = x + (i % 2) * 0.55, r + (i // 2) * 0.6
        k.cyl(cx, cr, 0.0, 0.85, 0.25, ('#2a4a7a', 0.1), 'oil_drum', verts=14)
        for z in (0.15, 0.7):
            k.cyl(cx, cr, z, z + 0.04, 0.26, '#1a2a4a', 'drum_rib', verts=14)
        k.box(cx - 0.12, cr + 0.24, 0.35, cx + 0.12, cr + 0.255, 0.5, '#e8e0c8', 'drum_label')
    k.cone(x, r, 0.85, 1.05, 0.12, 0.03, '#8a8a94', 'funnel', verts=10)
    k.solid(x - 0.3, r - 0.3, x + 0.85, r + 0.9)


def iron_stove(k, cx, cr):
    k.box(cx - 0.32, cr - 0.28, 0.08, cx + 0.32, cr + 0.28, 0.7, ('#2a2a30', 0.08), 'stove', bevel=0.02)
    for (dx, dr) in ((-0.26, -0.22), (0.26, -0.22), (-0.26, 0.22), (0.26, 0.22)):
        k.box(cx + dx - 0.03, cr + dr - 0.03, 0.0, cx + dx + 0.03, cr + dr + 0.03, 0.08, '#1a1a1e', 'stove_foot')
    k.box(cx - 0.14, cr + 0.28, 0.2, cx + 0.14, cr + 0.3, 0.42, '#401808', 'stove_door', emit=('#ff9040', 0.9))
    k.cyl(cx + 0.05, cr - 0.1, 0.7, 2.6, 0.06, '#2a2a30', 'stove_pipe', verts=8)
    k.cyl(cx - 0.12, cr + 0.06, 0.7, 0.88, 0.1, '#8a8a94', 'kettle', verts=10)
    k.point_light(cx, cr + 0.6, 0.4, '#ff9040', 18, radius=0.1, group='flicker')
    k.solid(cx - 0.35, cr - 0.3, cx + 0.35, cr + 0.3)


def oilskins(k, cx, cr):
    """A peg with a yellow oilskin coat and sou'wester."""
    k.cyl(cx, cr, 0, 0.05, 0.18, A.WOOD_DD, 'peg_foot', verts=8)
    k.cyl(cx, cr, 0.05, 1.7, 0.035, A.WOOD_D, 'peg', verts=8)
    k.box(cx - 0.22, cr - 0.1, 0.55, cx + 0.08, cr + 0.12, 1.62, ('#d8a828', 0.1), 'oilskin', bevel=0.05)
    k.cyl(cx + 0.02, cr, 1.64, 1.7, 0.22, '#c89820', 'souwester_brim', verts=12)
    k.sphere(cx + 0.02, cr, 1.76, 0.13, 0.1, '#d8a828', 'souwester', segs=8)
    k.solid(cx - 0.25, cr - 0.25, cx + 0.25, cr + 0.25)


def spiral_stair(k, cx, cr, rad, a0=90.0, a1=270.0, n=9, rise=0.18, tone=None):
    """Iron treads winding round a centre post, from angle a0 (degrees; 90 is
    toward the camera) to a1, a rail on the open side. Returns the top
    height."""
    tone = tone or '#6a6a78'
    step = math.radians(a1 - a0) / n
    w = 2 * rad * math.sin(step / 2) * 1.1
    tops = []
    for i in range(n):
        a = math.radians(a0) + step * (i + 0.5)
        z = (i + 1) * rise
        ex, er = cx + math.cos(a) * rad, cr + math.sin(a) * rad
        k.bar(cx + math.cos(a) * 0.08, cr + math.sin(a) * 0.08, ex, er, z - 0.05, z, w, (tone, 0.08), 'spiral_tread')
        k.bar(cx + math.cos(a) * 0.08, cr + math.sin(a) * 0.08, ex - math.cos(a) * 0.1, er - math.sin(a) * 0.1,
              z - 0.12, z - 0.05, 0.05, '#2a2a30', 'spiral_bracket')
        bx, br = cx + math.cos(a) * (rad - 0.04), cr + math.sin(a) * (rad - 0.04)
        k.cyl(bx, br, z, z + 0.8, 0.018, '#2a2a30', 'baluster', verts=5)
        tops.append((bx, br, z + 0.8))
    for p, q in zip(tops, tops[1:]):
        k.tube(p, q, 0.028, ('#a08040', 0.1), 'handrail', verts=6)
    top = n * rise
    k.cyl(cx, cr, 0.0, top + 1.2, 0.08, ('#3a3a44', 0.08), 'stair_post', verts=10)
    return top


def clockwork(k, cx, cr):
    """The weight-driven clockwork that turns the lens: an iron case with
    brass wheels showing, a chain down to a weight through the floor."""
    k.box(cx - 0.4, cr - 0.25, 0.0, cx + 0.4, cr + 0.25, 1.15, ('#2a2a32', 0.08), 'clock_case', bevel=0.02)
    for (dx, dz, rr) in ((-0.15, 0.75, 0.2), (0.17, 0.6, 0.13), (0.05, 0.92, 0.09), (-0.2, 0.38, 0.1)):
        k.cyl_y(cx + dx, cr + 0.25, cr + 0.29, 0.0 + dz, rr, rr, ('#d0a048', 0.08), 'clock_wheel', verts=14)
        k.cyl_y(cx + dx, cr + 0.29, cr + 0.31, dz, rr * 0.25, rr * 0.25, '#6a5a3a', 'clock_hub', verts=8)
    k.box(cx - 0.35, cr + 0.25, 0.08, cx + 0.35, cr + 0.27, 0.2, '#a08040', 'clock_plate')
    k.cyl(cx + 0.28, cr + 0.32, 0.3, 1.1, 0.012, '#6a6a74', 'clock_chain', verts=4)
    k.cyl(cx + 0.28, cr + 0.32, 0.12, 0.3, 0.07, ('#3a3a44', 0.1), 'clock_weight', verts=10)
    k.solid(cx - 0.42, cr - 0.3, cx + 0.42, cr + 0.4)


def lens_kit(k, cx, cr):
    """A low bench of lens-keeping things: polishing cloths, an oil can, a
    spare prism in a padded box."""
    k.box(cx - 0.45, cr - 0.22, 0.0, cx + 0.45, cr + 0.22, 0.5, (A.WOOD_D, 0.1), 'kit_bench', bevel=0.02)
    k.box(cx - 0.38, cr - 0.15, 0.5, cx - 0.02, cr + 0.12, 0.56, ('#5a2a2a', 0.1), 'prism_box')
    k.cone(cx - 0.2, cr - 0.01, 0.56, 0.72, 0.12, 0.02, '#8aa8c8', 'prism', emit=(LAMP, 0.25), verts=3)
    k.cyl(cx + 0.18, cr - 0.02, 0.5, 0.72, 0.07, '#8a8a94', 'oil_can', verts=10)
    k.tube((cx + 0.18, cr - 0.02, 0.68), (cx + 0.36, cr + 0.1, 0.8), 0.012, '#8a8a94', 'oil_spout', verts=5)
    k.box(cx + 0.02, cr + 0.06, 0.5, cx + 0.32, cr + 0.2, 0.53, '#e8d8a0', 'chamois')
    k.solid(cx - 0.47, cr - 0.25, cx + 0.47, cr + 0.25)
