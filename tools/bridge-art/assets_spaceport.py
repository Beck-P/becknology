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


# ---- what makes a hull read as a hull: plates, hatches, weathering, scorch ---------------------------------------------
def plates_top(k, x0, x1, r0, r1, z, base, rng, w=1.0, d=0.8, rust=0.12, part='ship_plate'):
    """The plating on a deck seen from above: plates `w` × `d` with a dark seam between (the deck shows through), each a
    shade apart, the odd one replaced in another metal or gone to rust."""
    k.box(x0, r0, z - 0.02, x1, r1, z, shade(base, 0.45), part + '_seam')
    by = {}
    r = r0
    while r < r1 - 1e-6:
        x = x0 + (rng.uniform(0, w * 0.5) if rng.random() < 0.5 else 0.0)
        if x > x0:
            by.setdefault(shade(base, 0.95), []).append((x0 + 0.02, r + 0.02, z, x - 0.02, min(r1, r + d) - 0.02, z + 0.025))
        while x < x1 - 1e-6:
            u = rng.random()
            t = shade(base, rng.uniform(0.84, 1.1)) if u > rust else shade(rng.choice(('#6a3a1e', '#5a5e66', '#4a5a4a')), rng.uniform(0.85, 1.1))
            by.setdefault(t, []).append((x + 0.02, r + 0.02, z, min(x1, x + w) - 0.02, min(r1, r + d) - 0.02, z + 0.025))
            x += w
        r += d
    for t, rects in by.items():
        k.boxes(rects, (t, 0.06), part)


def plates_side(k, x0, x1, r, z0, z1, base, rng, w=1.1, h=0.55, part='ship_plate'):
    """The plating down a hull's flank: courses of plates, the seams dark, rivet lines, a few plates patched."""
    by = {}
    z = z0
    row = 0
    while z < z1 - 1e-6:
        x = x0 + (w / 2 if row % 2 else 0.0)
        if x > x0:
            by.setdefault(shade(base, 0.96), []).append((x0 + 0.015, r, z + 0.015, x - 0.015, r + 0.025, min(z1, z + h) - 0.015))
        while x < x1 - 1e-6:
            t = shade(base, rng.uniform(0.86, 1.08))
            if rng.random() < 0.08:
                t = shade(rng.choice(('#6a3a1e', '#5a5e66', '#7a7468')), rng.uniform(0.9, 1.1))
            by.setdefault(t, []).append((x + 0.015, r, z + 0.015, min(x1, x + w) - 0.015, r + 0.025, min(z1, z + h) - 0.015))
            x += w
        z += h
        row += 1
    for t, rects in by.items():
        k.boxes(rects, (t, 0.06), part)
    rivets = []
    z = z0 + h
    while z < z1 - 0.05:
        x = x0 + 0.1
        while x < x1 - 0.1:
            rivets.append((x - 0.012, r + 0.025, z - 0.012, x + 0.012, r + 0.035, z + 0.012))
            x += 0.18
        z += h
    if rivets:
        k.boxes(rivets, shade(base, 0.7), part + '_rivet')


def hatch(k, cx, cr, z, w=0.7, d=0.55, col='#5a5e68'):
    """A hatch on a deck: a raised frame, the lid, its wheel and hinges, a hazard stripe at its lip."""
    k.box(cx - w / 2, cr - d / 2, z, cx + w / 2, cr + d / 2, z + 0.06, ('#2a2a32', 0.06), 'ship_hatch_frame')
    k.box(cx - w / 2 + 0.06, cr - d / 2 + 0.06, z + 0.06, cx + w / 2 - 0.06, cr + d / 2 - 0.06, z + 0.09, (col, 0.06), 'ship_hatch', bevel=0.02)
    k.cyl(cx, cr, z + 0.09, z + 0.12, 0.12, '#8a8a96', 'ship_hatch_wheel', verts=10)
    k.cyl(cx, cr, z + 0.09, z + 0.13, 0.03, '#3a3a42', 'ship_hatch_hub', verts=6)
    for dx in (-w / 3, w / 3):
        k.box(cx + dx - 0.05, cr - d / 2 - 0.02, z + 0.04, cx + dx + 0.05, cr - d / 2 + 0.06, z + 0.11, '#3a3a42', 'ship_hinge')
    k.box(cx - w / 2, cr + d / 2 - 0.03, z + 0.06, cx + w / 2, cr + d / 2, z + 0.07, STRIPE, 'ship_hatch_stripe')


def streaks(k, x0, x1, r, z0, z1, rng, n=10, col='#2a1a12'):
    """Weathering down a flank: grime and rust running from the seams and vents, darker toward the belly."""
    for _ in range(n):
        x = rng.uniform(x0 + 0.2, x1 - 0.2)
        top = rng.uniform(z0 + (z1 - z0) * 0.3, z1 - 0.1)
        k.box(x, r + 0.03, top - rng.uniform(0.4, 1.1), x + rng.uniform(0.04, 0.1), r + 0.04, top,
              shade(rng.choice((col, '#5a3018', '#3a3a30')), rng.uniform(0.8, 1.2)), 'ship_grime')
    k.box(x0, r + 0.03, z0, x1, r + 0.035, z0 + 0.18, shade(col, 0.9), 'ship_grime')


def scorch(k, cx, cr, z, rx, ry, rng, n=5, face=None):
    """Burn marks: soot blooms round an engine or on a belly (on a deck, or on a flank `face` = the flank's row)."""
    for _ in range(n):
        dx, d2 = rng.uniform(-rx, rx), rng.uniform(-ry, ry)
        s_ = rng.uniform(0.25, 0.6)
        if face is None:
            k.cyl(cx + dx, cr + d2, z, z + 0.004, s_, shade('#1a1412', rng.uniform(0.8, 1.3)), 'ship_scorch', verts=12, ry=s_ * 0.6)
        else:
            k.cyl_y(cx + dx, face + 0.035, face + 0.045, z + d2, s_, s_ * 0.6, shade('#1a1412', rng.uniform(0.8, 1.3)), 'ship_scorch', verts=12)


def landing_lights(k, x0, x1, r, step=0.8, cols=(STRIPE, '#ff6020')):
    """A row of flush landing lights set in the apron along a berth's edge."""
    i = 0
    x = x0
    while x <= x1 + 1e-6:
        c = cols[i % len(cols)]
        k.cyl(x, r, 0.0, 0.025, 0.06, '#1a1a1e', 'floor_light_rim', verts=8)
        k.cyl(x, r, 0.0, 0.03, 0.04, shade(c, 0.5), 'floor_light', emit=(c, 1.0), verts=8)
        x += step
        i += 1


def spill(k, cx, cr, rng, n=8):
    """Cargo spilled off a ramp: crates cracked open, drums on their sides, sacks, loose cans."""
    for _ in range(n):
        x, r = cx + rng.uniform(-1.4, 1.4), cr + rng.uniform(-0.5, 0.7)
        u = rng.random()
        if u < 0.3:
            k.cyl_x(x - 0.28, x + 0.28, r, 0.2, 0.2, 0.2, (rng.choice(('#3a5a7a', '#7a3a2a', '#c8a030', '#3a6a3a')), 0.08), 'drum', verts=12)
            k.cyl_x(x - 0.29, x + 0.29, r, 0.2, 0.205, 0.205, '#2a2a30', 'drum_band', verts=12)
        elif u < 0.55:
            k.blob(x, r, 0.13, 0.26, 0.18, 0.13, (rng.choice(('#9a8a6a', '#8a7a5a', '#6a6a5a')), 0.14), 'sack', segs=8)
            k.box(x - 0.03, r - 0.18, 0.18, x + 0.03, r - 0.16, 0.24, '#3a2a1a', 'sack_tie')
        elif u < 0.8:
            c = rng.choice(('#6a5a3a', '#3a5a6a', '#6a4a2a', '#5a6a3a'))
            k.box(x - 0.22, r - 0.22, 0.0, x + 0.22, r + 0.22, 0.36, (c, 0.12), 'crate', bevel=0.01)
            k.box(x - 0.24, r - 0.24, 0.36, x - 0.02, r + 0.24, 0.4, (shade(c, 1.1), 0.12), 'crate_lid')         # its lid prised off
            for j in range(4):
                k.cyl(x + 0.05 + (j % 2) * 0.1, r - 0.08 + (j // 2) * 0.12, 0.36, 0.46, 0.04, rng.choice(('#d8d0c0', '#c83a2a', '#3a8ad0')), 'can', verts=8)
        else:
            for j in range(3):
                k.cyl_x(x - 0.05 + j * 0.13, x + 0.05 + j * 0.13, r + rng.uniform(-0.1, 0.1), 0.04, 0.04, 0.04,
                        rng.choice(('#d8d0c0', '#c83a2a', '#3a8ad0', '#e0b020')), 'can', verts=8)


def beacon(k, x, r, z, col=None):
    col = col or Y.RED
    k.cyl(x, r, z, z + 0.08, 0.06, '#2a2a30', 'beacon_base', verts=8)
    k.sphere(x, r, z + 0.12, 0.06, 0.06, col, 'beacon', emit=(col, 1.0), segs=8)
    k.point_light(x, r, z + 0.3, col, 4, radius=0.1, group='flicker')


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
    # plating: courses of plates down her flanks, plates over her back, hatches; weathering and scorch
    plates_side(k, x0 + 1.2, x1 - 0.6, rf - 0.17, zb + 1.12, zt - 0.02, hull, rng)
    plates_side(k, x0 + 0.6, x1 - 0.3, rf + 0.0, zb + 0.05, zb + 1.0, shade(hull, 0.8), rng, h=0.48)
    plates_top(k, x0 + 2.5, x1 - 0.7, rb + 0.2, rf - 0.2, zt, hull, rng)
    plates_top(k, x0 + 0.15, x0 + 2.25, rb + 0.55, rf - 0.55, zt + 0.7, shade(hull, 0.9), rng, w=0.7, d=0.6)
    for i, hx in enumerate([x0 + 4.0 + j * 2.6 for j in range(int((L - 5.0) / 2.6))]):
        hatch(k, hx, rc + (0.6 if i % 2 else -0.5), zt + 0.025, col=shade(hull, 0.75))
    streaks(k, x0 + 1.2, x1 - 0.6, rf - 0.17, zb + 1.12, zt, rng, n=int(L))
    streaks(k, x0 + 0.6, x1 - 0.3, rf + 0.0, zb, zb + 1.0, rng, n=int(L * 0.6))
    scorch(k, x1 - 0.6, rc, zt + 0.03, 0.6, 1.0, rng, n=6)
    scorch(k, x1 - 1.0, rc, zb + 0.6, 0.8, 0.3, rng, n=4, face=rf)
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
    spill(k, (bx0 + bx1) / 2, rf + 2.4, rng, n=int(L * 0.7))
    k.point_light((bx0 + bx1) / 2, rf + 2.0, 0.9, '#ffc080', 14, radius=0.4, group='flicker')
    # her name and registry
    SG.letters(k, name, 'RussoOne', x0 + L * 0.78, rf - 0.12, zt - 0.8, size=0.46, col='#ece4cc', lit=False, depth=0.025)
    K.floor_text(k, name, 'RussoOne', x0 + L * 0.55, rc + 0.3, 0.55, '#d8d0b8', z=zt + 0.03)
    k.box(x0 + 2.8, rf - 0.16, zt - 0.62, x0 + 4.4, rf - 0.12, zt - 0.32, '#0c1418', 'ship_reg_plate', emit=('#80d0ff', 0.25))
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
    beacon(k, x1 - 0.8, rc, zt + 0.05)
    for x in [x0 + 2.5 + i * 2.2 for i in range(int((L - 3.0) / 2.2))]:                  # a row of hull lamps
        k.box(x - 0.08, rf - 0.17, zt - 0.12, x + 0.08, rf - 0.12, zt - 0.06, '#fff0d0', 'ship_lamp', emit=('#ffe8c0', 0.9))
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
    plates_side(k, x0 + 1.0, x1 - 0.5, rc + 1.3, zb + 0.18, zb + 0.6, hull, rng, w=1.3, h=0.42)
    streaks(k, x0 + 1.0, x1 - 0.5, rc + 1.3, zb + 0.18, zb + 0.9, rng, n=int(L * 0.6), col='#6a6458')
    scorch(k, x1 - 1.0, rc, zb + 0.5, 0.8, 0.2, rng, n=5, face=rc + 1.2)
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
    k.point_light(cx, cr + 1.0, h - 0.2, col, 230, radius=0.4)
    k.sphere(cx, cr, h + 0.42, 0.07, 0.07, Y.RED, 'mast_beacon', emit=(Y.RED, 1.0), segs=8)
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
