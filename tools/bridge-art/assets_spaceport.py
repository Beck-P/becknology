"""Arcadia's spaceport (tools/bridge-art/scenes/arcadia_spaceport.py): the District's east end, where off-world freighters
berth — big battered hulls standing on their legs over a wet concrete apron, cargo spilling down their ramps, gantry
cranes, floodlight masts, fuel lines, the air cab rank. Tile units: x = column, r = row (toward the camera), z = height.
"""
import math

from scenekit import shade
import assets_cyber as Y
import assets_dock as K
import assets_signs as SG

C45 = math.cos(math.radians(45))
STRIPE = '#e0b020'
CONCRETE = ('#4a4852', '#43414b', '#504e58')


def apron(k, x0, r0, x1, r1):
    """Big poured slabs with dark joints, oil stains and tyre-black skid marks."""
    rng = k.rng
    k.box(x0, r0, -0.12, x1, r1, -0.02, '#1c1a22', 'subfloor')
    r = r0
    while r < r1 - 1e-6:
        x = x0
        while x < x1 - 1e-6:
            t = shade(rng.choice(CONCRETE), rng.uniform(0.92, 1.06))
            k.box(x + 0.02, r + 0.02, -0.04, min(x1, x + 2.0) - 0.02, min(r1, r + 2.0) - 0.02, 0.0, (t, 0.1), 'floor_apron')
            x += 2.0
        r += 2.0
    for _ in range(int((x1 - x0) * (r1 - r0) / 18)):
        cx, cr = rng.uniform(x0 + 1, x1 - 1), rng.uniform(r0 + 1, r1 - 1)
        k.cyl(cx, cr, 0.0, 0.003, rng.uniform(0.25, 0.6), '#24222a', 'floor_stain', verts=10, ry=rng.uniform(0.15, 0.35))


def bay_marks(k, x0, r0, x1, r1, label, font='RussoOne'):
    """A berth's painted outline: a yellow line round it, hatched corners, the bay's number big on the concrete."""
    for (a, b, c, d) in ((x0, r0, x1, r0 + 0.1), (x0, r1 - 0.1, x1, r1), (x0, r0, x0 + 0.1, r1), (x1 - 0.1, r0, x1, r1)):
        k.box(a, b, 0.0, c, d, 0.005, STRIPE, 'floor_paint')
    for (cx, cr, sx, sr) in ((x0, r0, 1, 1), (x1, r0, -1, 1), (x0, r1, 1, -1), (x1, r1, -1, -1)):
        for i in range(4):
            k.bar(cx + sx * (0.2 + i * 0.25), cr + sr * 0.15, cx + sx * (0.05 + i * 0.25), cr + sr * 0.6, 0.0, 0.006, 0.07,
                  STRIPE, 'floor_paint')
    K.floor_text(k, label, font, x0 + 1.4, r1 - 0.7, 0.5, '#d8c890')


def landing_leg(k, x, r, z_top, foot_dr=0.4, col='#3a3a42'):
    k.tube((x, r, z_top), (x, r + foot_dr, 0.18), 0.1, (col, 0.06), 'ship_leg', verts=8)
    k.tube((x, r, z_top - 0.3), (x, r + foot_dr * 0.6, 0.5), 0.05, '#8a8a96', 'ship_piston', verts=6)
    k.cyl(x, r + foot_dr, 0.0, 0.18, 0.32, ('#2a2a30', 0.06), 'ship_foot', verts=12)
    k.solid(x - 0.3, r + foot_dr - 0.3, x + 0.3, r + foot_dr + 0.3)


def hauler(k, x0, rc, L=14.0, hull='#a8683a', trim='#3a3e48', name='OLD MERCY', reg='OM-7741', ramp_at=(0.36, 0.6)):
    """A bulk freighter on her legs: a slab-sided hull in two decks of plating, the bridge raised at her nose (to the
    left) with a band of lit windows, three engine bells at her stern glowing faintly, a cargo bay open on her near side
    with its ramp down to the apron and crates spilling off it, her name and registry painted on, rust, patches, hoses,
    antennas and a dish on her back, running lights."""
    rng = k.rng
    D = 1.6                                    # her half-beam
    zb, zt = 1.0, 3.2                          # her belly, her back
    x1 = x0 + L
    rf, rb = rc + D, rc - D
    # the hull: a lower deck (wider, darker) and the upper, bevelled
    k.box(x0 + 0.6, rb, zb, x1 - 0.3, rf, zb + 1.1, (shade(hull, 0.8), 0.08), 'ship_hull', bevel=0.08)
    k.box(x0 + 1.2, rb + 0.15, zb + 1.1, x1 - 0.6, rf - 0.15, zt, (hull, 0.08), 'ship_hull', bevel=0.12)
    k.box(x0 + 0.6, rf - 0.05, zb + 1.02, x1 - 0.3, rf + 0.05, zb + 1.16, trim, 'ship_strake')
    # plating seams and patches, rust streaking down from them
    for i in range(int(L / 1.1)):
        x = x0 + 1.4 + i * 1.1
        if x > x1 - 0.8:
            break
        k.box(x - 0.012, rf - 0.15, zb + 1.15, x + 0.012, rf - 0.13, zt - 0.1, shade(hull, 0.6), 'ship_seam')
        k.box(x - 0.012, rf + 0.0, zb + 0.1, x + 0.012, rf + 0.02, zb + 1.0, shade(hull, 0.55), 'ship_seam')
    for _ in range(9):
        x = rng.uniform(x0 + 1.5, x1 - 1.5)
        z = rng.uniform(zb + 1.4, zt - 0.4)
        k.box(x, rf - 0.15, z, x + rng.uniform(0.4, 0.9), rf - 0.12, z + rng.uniform(0.25, 0.45),
              shade(rng.choice((hull, '#7a7e88', '#5a6a5a')), rng.uniform(0.8, 1.15)), 'ship_patch')
        k.box(x + 0.1, rf - 0.12, z - 0.55, x + 0.16, rf - 0.11, z, '#5a3018', 'ship_rust')
    # the bridge at her nose: a stepped block with a band of lit windows, a visor over them
    k.box(x0, rb + 0.4, zb + 0.6, x0 + 2.4, rf - 0.4, zt + 0.7, (shade(hull, 0.9), 0.08), 'ship_bridge', bevel=0.15)
    k.box(x0 - 0.02, rb + 0.6, zt - 0.05, x0 + 2.2, rf - 0.38, zt + 0.35, '#0c1a24', 'ship_glass', emit=('#5ab0d0', 0.7))
    k.boxes([(x0 + 0.1 + i * 0.36, rf - 0.4, zt - 0.05, x0 + 0.14 + i * 0.36, rf - 0.36, zt + 0.35) for i in range(6)], trim, 'ship_mullion')
    k.box(x0 - 0.1, rb + 0.5, zt + 0.35, x0 + 2.3, rf - 0.3, zt + 0.45, trim, 'ship_visor')
    # the stern: an engine block and three bells, a faint blue in their throats
    k.box(x1 - 1.4, rb + 0.2, zb + 0.2, x1 + 0.2, rf - 0.2, zt - 0.2, (trim, 0.08), 'ship_engine', bevel=0.1)
    for (dr, dz) in ((-0.8, 2.4), (0.8, 2.4), (0.0, 1.5)):
        k.cyl_x(x1 + 0.2, x1 + 0.9, rc + dr, dz, 0.42, 0.42, ('#4a4a54', 0.06), 'ship_bell', verts=16)
        k.cyl_x(x1 + 0.85, x1 + 0.92, rc + dr, dz, 0.32, 0.32, '#0c1a2a', 'ship_bell_throat', emit=('#3a7ae0', 0.5), verts=16)
    k.point_light(x1 + 1.3, rc + 1.0, 2.0, '#4a8aff', 18, radius=0.4, group='flicker')
    # the cargo bay, open, its ramp down to the apron, crates spilling off it
    bx0, bx1 = x0 + L * ramp_at[0], x0 + L * ramp_at[1]
    k.box(bx0, rf - 0.02, zb + 0.1, bx1, rf + 0.02, zb + 1.9, '#140e0a', 'ship_bay')
    k.box(bx0 + 0.1, rf - 0.6, zb + 0.1, bx1 - 0.1, rf - 0.58, zb + 1.8, shade('#ffc080', 0.5), 'ship_bay_light', emit=('#ffc080', 0.6))
    k.box(bx0 - 0.08, rf + 0.02, zb + 0.05, bx1 + 0.08, rf + 0.1, zb + 2.0, STRIPE, 'ship_bay_frame')
    k.poly([(bx0, rf, zb + 0.1), (bx1, rf, zb + 0.1), (bx1, rf + 1.6, 0.04), (bx0, rf + 1.6, 0.04)], ('#5a5e68', 0.1), 'ship_ramp')
    k.boxes([(bx0, rf + 0.2 + i * 0.28, zb + 0.1 - (i + 1) * 0.07 * zb / 0.45, bx1, rf + 0.24 + i * 0.28,
              zb + 0.12 - (i + 1) * 0.07 * zb / 0.45 + 0.02) for i in range(5)], '#3a3e48', 'ship_ramp_rib')
    for (a, b) in ((bx0 - 0.06, bx0 + 0.04), (bx1 - 0.04, bx1 + 0.06)):
        k.poly([(a, rf, zb + 0.12), (b, rf, zb + 0.12), (b, rf + 1.6, 0.06), (a, rf + 1.6, 0.06)], STRIPE, 'ship_ramp_edge')
    k.point_light((bx0 + bx1) / 2, rf + 0.4, zb + 1.2, '#ffc080', 26, radius=0.5, group='flicker')
    for (dx, dr, s, col) in ((0.4, 0.5, 0.5, '#6a5a3a'), (1.1, 1.0, 0.45, '#3a5a6a'), (0.7, 1.9, 0.55, '#6a4a2a'),
                             (1.7, 2.1, 0.4, '#7a3a2a'), (-0.4, 2.3, 0.45, '#5a6a3a')):
        z = max(0.0, zb + 0.1 - dr * zb / 1.6) if dr < 1.6 else 0.0
        K.crate(k, bx0 + dx + 0.4, rf + dr, s=s, col=col, z=z)
    k.box(bx0 + 2.0, rf + 2.0, 0.0, bx0 + 2.6, rf + 2.6, 0.06, '#5a4a32', 'pallet')
    # her name and registry
    SG.letters(k, name, 'RussoOne', x0 + L * 0.78, rf - 0.12, zt - 0.75, size=0.36, col='#e8e0c8', lit=False, depth=0.02)
    SG.letters(k, reg, 'Audiowide', x0 + L * 0.2, rf - 0.12, zb + 1.5, size=0.22, col='#e8e0c8', lit=False, depth=0.02)
    # up on her back: antennas, a dish, vents, hoses down her side
    for i in range(3):
        x = x0 + 3.0 + i * 3.5
        k.box(x, rc - 0.6, zt, x + 0.9, rc + 0.4, zt + 0.3, ('#5a5e68', 0.08), 'ship_vent')
    k.tube((x0 + 3.0, rc, zt + 0.5), (x0 + 3.0, rc, zt + 1.8), 0.03, '#8a8a96', 'ship_antenna', verts=5)
    k.sphere(x0 + 3.0, rc, zt + 1.85, 0.06, 0.06, Y.RED, 'ship_beacon', emit=(Y.RED, 1.0), segs=6)
    k.cone(x0 + L * 0.66, rc, zt + 0.1, zt + 0.55, 0.55, 0.12, ('#c8ccd4', 0.06), 'ship_dish', verts=14)
    for (x, c) in ((x0 + 0.2, Y.RED), (x1 - 0.2, Y.GREEN)):
        k.sphere(x, rf - 0.3, zt + 0.1, 0.06, 0.06, c, 'ship_running', emit=(c, 1.0), segs=6)
    for i, x in enumerate((x0 + L * 0.68, x0 + L * 0.72)):                              # fuel hoses down to the apron
        k.tube((x, rf, zb + 0.6), (x + 0.3, rf + 0.8, 0.05), 0.05, ('#1a1a1e', '#a04020')[i], 'hose', verts=6)
    # her legs
    for (fx, side) in ((0.1, 1), (0.1, -1), (0.5, 1), (0.5, -1), (0.88, 1), (0.88, -1)):
        landing_leg(k, x0 + 0.6 + fx * (L - 1.0), rc + side * (D - 0.3), zb + 0.1, foot_dr=side * 0.5)
    k.solid(x0, rb, x1 + 0.9, rf)


def container_ship(k, x0, rc, L=16.0, hull='#d8d8d0', trim='#e0b020', name='HALCYON IX', reg='HX-0909'):
    """A corporate container carrier: a long spine on her legs with containers stacked two high along it, a tall bridge
    tower at her nose, a bank of engines aft; white and yellow and too clean, but for her scorched belly."""
    rng = k.rng
    zb = 1.2
    x1 = x0 + L
    k.box(x0 + 1.0, rc - 1.3, zb, x1 - 0.5, rc + 1.3, zb + 0.9, (hull, 0.06), 'ship_hull', bevel=0.08)
    k.box(x0 + 1.0, rc + 1.25, zb, x1 - 0.5, rc + 1.32, zb + 0.18, '#3a2a20', 'ship_scorch')
    k.box(x0 + 1.0, rc + 1.28, zb + 0.6, x1 - 0.5, rc + 1.34, zb + 0.72, trim, 'ship_strake')
    cols = ('#c83a2a', '#2a6ab0', '#3a8a4a', '#e0a020', '#7a3a8a', '#d8d8d0', '#2a2a32')
    x = x0 + 3.4
    while x < x1 - 2.6:                                                                     # containers, two tiers
        for tier in range(2):
            if tier and rng.random() < 0.3:
                continue
            for dr in (-0.62, 0.62):
                K.container(k, x, rc + dr - 0.6, 1.4, 1.2, 0.9, rng.choice(cols), z0=zb + 0.9 + tier * 0.92,
                            code=rng.choice(('HLX', 'TOL', 'ASG', None)))
        x += 1.5
    k.box(x0, rc - 1.0, zb, x0 + 2.6, rc + 1.0, zb + 3.4, (hull, 0.06), 'ship_bridge', bevel=0.12)       # the bridge tower
    k.box(x0 - 0.02, rc - 0.8, zb + 2.6, x0 + 2.4, rc + 1.02, zb + 3.1, '#0c1a24', 'ship_glass', emit=('#7ad0f0', 0.75))
    k.box(x0 - 0.1, rc - 1.0, zb + 3.1, x0 + 2.7, rc + 1.1, zb + 3.2, trim, 'ship_visor')
    for i in range(3):
        k.box(x0 + 0.3, rc + 1.0, zb + 0.6 + i * 0.6, x0 + 2.2, rc + 1.02, zb + 0.75 + i * 0.6, '#0c1a24', 'ship_glass',
              emit=('#ffe0a0', 0.5))
    SG.letters(k, name, 'Audiowide', x0 + 1.3, rc + 1.02, zb + 2.25, size=0.24, col=trim, lit=False, depth=0.02)
    k.box(x1 - 2.2, rc - 1.2, zb + 0.2, x1, rc + 1.2, zb + 1.7, ('#9a9aa4', 0.06), 'ship_engine', bevel=0.1)
    for dr in (-0.7, 0.0, 0.7):
        k.cyl_x(x1, x1 + 0.6, rc + dr, zb + 0.9, 0.3, 0.3, ('#4a4a54', 0.06), 'ship_bell', verts=14)
        k.cyl_x(x1 + 0.55, x1 + 0.62, rc + dr, zb + 0.9, 0.22, 0.22, '#0c1a2a', 'ship_bell_throat', emit=('#e08a3a', 0.4), verts=14)
    SG.letters(k, reg, 'RussoOne', x0 + L * 0.5, rc + 1.34, zb + 0.22, size=0.26, col='#2a2a32', lit=False, depth=0.02)
    for (x, c) in ((x0 + 0.2, Y.RED), (x1, Y.GREEN)):
        k.sphere(x, rc + 1.0, zb + 3.3, 0.06, 0.06, c, 'ship_running', emit=(c, 1.0), segs=6)
    for (fx, side) in ((0.12, 1), (0.12, -1), (0.55, 1), (0.55, -1), (0.9, 1), (0.9, -1)):
        landing_leg(k, x0 + 1.0 + fx * (L - 1.6), rc + side * 1.0, zb + 0.1, foot_dr=side * 0.45, col='#5a5a64')
    k.solid(x0, rc - 1.3, x1 + 0.6, rc + 1.32)


def floodlight(k, cx, cr, h=4.2, col='#fff0d0'):
    """A floodlight mast: a lattice post, a bank of lamps aimed down at the apron."""
    k.cyl(cx, cr, 0.0, 0.2, 0.22, '#2a2a32', 'mast_base', verts=10)
    for (dx, dr) in ((-0.07, -0.07), (0.07, -0.07), (0.0, 0.07)):
        k.tube((cx + dx, cr + dr, 0.2), (cx + dx * 0.5, cr + dr * 0.5, h), 0.025, '#5a5a66', 'mast', verts=4)
    for i in range(6):
        z = 0.5 + i * (h - 0.6) / 6
        k.tube((cx - 0.07, cr - 0.07, z), (cx + 0.07, cr - 0.07, z + 0.3), 0.012, '#5a5a66', 'mast_brace', verts=3)
    k.box(cx - 0.4, cr - 0.12, h, cx + 0.4, cr + 0.12, h + 0.3, '#2a2a32', 'mast_head')
    for i in range(4):
        k.box(cx - 0.35 + i * 0.18, cr + 0.1, h + 0.04, cx - 0.21 + i * 0.18, cr + 0.14, h + 0.26, shade(col, 0.6), 'mast_lamp',
              emit=(col, 1.0))
    k.point_light(cx, cr + 1.0, h - 0.2, col, 90, radius=0.4)
    k.solid_post(cx, cr)


def cab(k, cx, cr, z=0.25, col='#e8b830'):
    """An air cab parked on its pad: a yellow teardrop on glowing lift pods, the light on its roof lit for hire."""
    k.blob(cx, cr, z + 0.4, 0.95, 0.42, 0.32, (col, 0.06), 'cab_body', segs=18)
    k.blob(cx + 0.15, cr, z + 0.66, 0.5, 0.32, 0.2, '#141c2c', 'cab_glass', emit=('#2a4060', 0.4), segs=14)
    k.box(cx - 0.15, cr + 0.4, z + 0.32, cx + 0.6, cr + 0.42, z + 0.42, '#141416', 'cab_stripe')
    k.box(cx - 0.12, cr - 0.08, z + 0.82, cx + 0.2, cr + 0.08, z + 0.92, '#e8c040', 'cab_sign', emit=('#ffd860', 0.95))
    for s in (-1, 1):
        k.cyl(cx + s * 0.6, cr, z - 0.05, z + 0.08, 0.16, '#2a2a30', 'cab_pod', verts=12)
        k.cyl(cx + s * 0.6, cr, z - 0.08, z - 0.04, 0.13, shade(Y.CYAN, 0.45), 'cab_pod_glow', emit=(Y.CYAN, 0.95), verts=12)
    k.sphere(cx + 0.95, cr, z + 0.42, 0.06, 0.05, '#fff6e0', 'cab_head', emit=('#fff2d0', 1.0), segs=8)
    k.point_light(cx, cr + 0.1, z - 0.1, Y.CYAN, 6, radius=0.3, group='flicker')
    k.solid(cx - 1.0, cr - 0.45, cx + 1.0, cr + 0.45)


def cab_pad(k, cx, cr, rad=1.9):
    k.cyl(cx, cr, 0.0, 0.03, rad, ('#2a2830', 0.06), 'pad', verts=40)
    k.cyl(cx, cr, 0.03, 0.035, rad - 0.15, '#34323c', 'pad_inner', verts=40)
    for i in range(24):
        a = i * math.pi / 12
        k.cyl(cx + math.cos(a) * (rad - 0.07), cr + math.sin(a) * (rad - 0.07), 0.03, 0.06, 0.05, '#1a3020', 'pad_light',
              emit=((STRIPE if i % 2 else Y.CYAN), 0.95), verts=6)
    K.floor_text(k, 'CAB', 'RussoOne', cx, cr + 0.15, 0.5, '#e8c040', z=0.04)
