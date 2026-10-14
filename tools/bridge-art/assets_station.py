"""Enigma Station + the Singularity: builders for scenekit (bpy).
Tile units: x = column, r = row (toward the camera), z = height.

Both worlds float in space: anything not built renders transparent and the
world's own animated backdrop (stars, void) shows through (scene.backdrop).
"""
import math

from scenekit import shade
import assets_ship as P

ST_WALL = ['#0e1820', '#1a2530', '#253540', '#34485a']
ST_FLOOR = ['#182028', '#1e2830']
TEAL = '#40c8d8'
TEAL_L = '#80e0e8'
WARN_R = '#e84040'
WARN_Y = '#e8c040'
LED_G = '#40e080'
LED_B = '#40a8e0'
VOID_STONE = ['#0e0820', '#1a1430', '#252038', '#2a2040']
CRYSTAL = ['#503090', '#8060c0', '#c0a0f0']


# ---- the pilot's ship, docked -------------------------------------------------------------
def docked_ship(k, cx, cr, z=0.4, length=3.2, hull='#5a6478', trim='#a08040'):
    """The pilot's small ship lying along the rows axis, nose toward the
    back (low r), engines toward the camera."""
    L = length
    r0, r1 = cr - L / 2, cr + L / 2
    k.blob(cx, cr, z + 0.35, 0.75, L / 2, 0.38, (hull, 0.06), 'ship_hull', segs=24)
    k.blob(cx, cr - L * 0.12, z + 0.62, 0.42, L * 0.24, 0.2, '#0c2a38', 'ship_canopy', emit=('#1a5a70', 0.6), segs=18)
    k.blob(cx - 0.12, cr - L * 0.2, z + 0.74, 0.1, 0.18, 0.04, '#e0f8ff', 'canopy_glint', emit=('#c0f0ff', 0.6), segs=8)
    for s in (-1, 1):   # swept wings
        k.poly([(cx + s * 0.55, cr - 0.2, z + 0.32), (cx + s * 1.45, cr + L * 0.32, z + 0.22),
                (cx + s * 1.4, cr + L * 0.42, z + 0.22), (cx + s * 0.6, cr + L * 0.3, z + 0.3)], (shade(hull, 0.85), 0.06), 'ship_wing')
        k.box(cx + s * 1.35 - 0.05, cr + L * 0.3, z + 0.18, cx + s * 1.35 + 0.05, cr + L * 0.44, z + 0.3, trim, 'ship_wingtip')
        k.sphere(cx + s * 1.4, cr + L * 0.42, z + 0.26, 0.04, 0.04, WARN_R if s < 0 else LED_G, 'nav_light',
                 emit=(WARN_R if s < 0 else LED_G, 1.0), segs=6)
    k.box(cx - 0.05, cr - L * 0.05, z + 0.68, cx + 0.05, cr + L * 0.3, z + 0.76, trim, 'ship_stripe')
    for s in (-0.3, 0.3):   # engines
        k.cyl_y(cx + s, r1 - 0.3, r1 + 0.05, z + 0.32, 0.17, 0.17, ('#3a4050', 0.06), 'ship_engine', verts=14)
        k.cyl_y(cx + s, r1 + 0.05, r1 + 0.07, z + 0.32, 0.12, 0.12, '#103038', 'engine_glow', emit=(TEAL, 0.9), verts=14)
    k.point_light(cx, r1 + 0.5, z + 0.4, TEAL, 6, radius=0.2, group='flicker')


# ---- station shell -------------------------------------------------------------------------
def station_floor(k, x0, r0, x1, r1, holes=(), tones=ST_FLOOR):
    """Deck plates; holes = [(x0, r0, x1, r1)] floor windows left open."""
    k.box(x0, r0, -0.14, x1, r1, -0.04, '#060a0e', 'subfloor')
    r = r0
    i = 0
    while r < r1 - 1e-6:
        x = x0
        j = 0
        while x < x1 - 1e-6:
            if not any(hx0 <= x + 0.5 <= hx1 and hr0 <= r + 0.5 <= hr1 for hx0, hr0, hx1, hr1 in holes):
                t = tones[(i + j) % 2]
                k.box(x + 0.025, r + 0.025, -0.04, x + 0.975, r + 0.975, 0.0, (shade(t, k.rng.uniform(0.9, 1.08)), 0.1), 'floor')
                if k.rng.random() < 0.15:   # scuffs, stains
                    k.blob(x + k.rng.uniform(0.25, 0.75), r + k.rng.uniform(0.25, 0.75), 0.001, k.rng.uniform(0.1, 0.25),
                           k.rng.uniform(0.08, 0.2), 0.002, '#0c1218', 'stain', segs=8, smooth=False)
            x += 1
            j += 1
        r += 1
        i += 1
    # holes punch through the subfloor too: HOLDOUT panes with frames
    for hx0, hr0, hx1, hr1 in holes:
        k.box(hx0, hr0, -0.2, hx1, hr1, -0.03, 'HOLDOUT', 'floor_window')
        for (a, b, c, d) in ((hx0 - 0.06, hr0 - 0.06, hx1 + 0.06, hr0 + 0.02), (hx0 - 0.06, hr1 - 0.02, hx1 + 0.06, hr1 + 0.06),
                             (hx0 - 0.06, hr0, hx0 + 0.02, hr1), (hx1 - 0.02, hr0, hx1 + 0.06, hr1)):
            k.box(a, b, -0.02, c, d, 0.03, ST_WALL[3], 'window_frame')
        k.bar(hx0 + 0.1, hr0 + 0.2, hx1 - 0.2, hr1 - 0.1, -0.01, 0.0, 0.012, '#80a0b0', 'glass_crack')


def station_room(k, x0, r0, x1, r1, wall_h, door=None, windows=(), airlock=None):
    """Back wall (with holdout viewports), side walls (left one with an
    airlock gap), low front wall."""
    centre = None
    P.ship_back_wall(k, x0 - 0.6, x1 + 0.6, r0, wall_h, pal=ST_WALL, trim='#2a4050', ribs_every=1.5)
    for (wx0, wx1, z0, z1, cracked) in windows:
        k.box(wx0, r0 - 0.03, z0, wx1, r0 + 0.03, z1, 'HOLDOUT', 'viewport')
        for (a, b, c, d) in ((wx0 - 0.1, z0 - 0.12, wx1 + 0.1, z0), (wx0 - 0.1, z1, wx1 + 0.1, z1 + 0.12),
                             (wx0 - 0.1, z0, wx0, z1), (wx1, z0, wx1 + 0.1, z1)):
            k.box(a, r0, b, c, r0 + 0.12, d, (ST_WALL[0], 0.05), 'window_frame')
        k.box((wx0 + wx1) / 2 - 0.04, r0, z0, (wx0 + wx1) / 2 + 0.04, r0 + 0.08, z1, ST_WALL[0], 'mullion')
        if cracked:
            cx, cz = wx0 + (wx1 - wx0) * 0.3, z0 + (z1 - z0) * 0.6
            for a in (0.3, 1.4, 2.6, 4.0, 5.2):
                L = k.rng.uniform(0.2, 0.45)
                k.tube((cx, r0 + 0.04, cz), (cx + math.cos(a) * L, r0 + 0.04, cz + math.sin(a) * L * 0.8), 0.006, '#a0c0d0',
                       'glass_crack', verts=4)
    gap = airlock or (0, 0)
    for (a, b) in ((r0 - 0.5, gap[0]), (gap[1], r1)) if airlock else ((r0 - 0.5, r1),):
        if b - a > 0.05:
            P.ship_side_wall(k, x0 - 0.6, x0, a, b, wall_h, pal=ST_WALL)
    P.ship_side_wall(k, x1, x1 + 0.6, r0 - 0.5, r1, wall_h, pal=ST_WALL)
    for (a, b) in ((x0 - 0.6, door[0]), (door[1], x1 + 0.6)) if door else ((x0 - 0.6, x1 + 0.6),):
        k.box(a, r1, 0, b, r1 + 0.6, 0.35, (ST_WALL[1], 0.06), 'front_wall')
        k.box(a, r1, 0.35, b, r1 + 0.6, 0.4, ST_WALL[0], 'wall_cap')
    if airlock:   # heavy frame round the airlock opening, hazard stripes on the floor
        for rr in (gap[0] - 0.2, gap[1]):
            k.box(x0 - 0.7, rr, 0, x0 + 0.1, rr + 0.2, wall_h, (ST_WALL[3], 0.06), 'airlock_frame')
            k.box(x0 + 0.08, rr + 0.05, 1.2, x0 + 0.12, rr + 0.15, 1.5, '#200808', 'airlock_light', emit=(WARN_Y, 0.9))
        k.box(x0 - 0.7, gap[0] - 0.2, wall_h - 0.4, x0 + 0.1, gap[1] + 0.2, wall_h, (ST_WALL[3], 0.06), 'airlock_frame')
        x = gap[0]
        while x < gap[1]:
            k.bar(x0 + 0.05, x, x0 + 0.45, min(gap[1], x + 0.16), 0.0, 0.006, 0.07, WARN_Y, 'hazard_stripe')
            x += 0.24
        k.point_light(x0 + 0.5, (gap[0] + gap[1]) / 2, 1.6, WARN_Y, 6, radius=0.1, group='flicker')
    return centre


def docking_tube(k, x0, x1, r0, r1, z1=1.6):
    """Ribbed docking tube from the airlock out to the ship."""
    k.box(x0, r0, -0.1, x1, r1, 0.0, ST_FLOOR[0], 'tube_floor')
    for side in (r0, r1):
        k.box(x0, side - 0.06, 0, x1, side + 0.06, z1, ('#3a4a58', 0.06), 'tube_wall')
    x = x0 + 0.1
    while x < x1:
        k.box(x, r0 - 0.1, 0, x + 0.08, r1 + 0.1, z1 + 0.06, '#253540', 'tube_rib')
        x += 0.35
    k.box(x0, r0 - 0.08, z1, x1, r1 + 0.08, z1 + 0.05, '#253540', 'tube_roof')


def server_rack(k, cx, r0, w=0.8, d=0.7, h=1.95, dead=False):
    """Server cabinet facing the camera: grille door, LED columns."""
    x0, x1 = cx - w / 2, cx + w / 2
    k.box(x0, r0, 0, x1, r0 + d, h, (ST_WALL[1], 0.06), 'rack', bevel=0.015)
    k.box(x0 + 0.05, r0 + d, 0.08, x1 - 0.05, r0 + d + 0.015, h - 0.08, ('#101820', 0.08), 'rack_door')
    for i in range(10):
        z = 0.18 + i * 0.17
        k.box(x0 + 0.07, r0 + d + 0.015, z, x1 - 0.07, r0 + d + 0.02, z + 0.11, '#1a2530', 'rack_unit')
        if not dead:
            for j in range(3):
                col = k.rng.choice((LED_G, LED_G, LED_B, WARN_Y, WARN_R))
                if k.rng.random() < 0.7:
                    k.box(x0 + 0.1 + j * 0.05, r0 + d + 0.02, z + 0.04, x0 + 0.13 + j * 0.05, r0 + d + 0.025, z + 0.07, col,
                          'rack_led', emit=(col, 1.0))
    if not dead:
        k.point_light(cx, r0 + d + 0.35, 1.0, LED_G, 2.5, radius=0.2, group='flicker')
    k.solid(x0, r0, x1, r0 + d)


def wall_screen(k, cx, r_face, z0=1.0, w=0.9, h=0.6, col=TEAL, broken=False):
    k.box(cx - w / 2 - 0.05, r_face, z0 - 0.05, cx + w / 2 + 0.05, r_face + 0.08, z0 + h + 0.05, ST_WALL[0], 'screen_frame')
    k.box(cx - w / 2, r_face + 0.08, z0, cx + w / 2, r_face + 0.085, z0 + h, '#041014', 'screen',
          emit=('#062028', 0.0 if broken else 1.0))
    if broken:
        for a in (0.4, 1.9, 3.3, 4.6):
            k.tube((cx - 0.1, r_face + 0.09, z0 + h * 0.6), (cx - 0.1 + math.cos(a) * 0.25, r_face + 0.09, z0 + h * 0.6 + math.sin(a) * 0.2),
                   0.004, '#5a7080', 'screen_crack', verts=4)
        return
    for i in range(4):
        k.box(cx - w / 2 + 0.08, r_face + 0.086, z0 + h - 0.12 - i * 0.12, cx - w / 2 + 0.08 + k.rng.uniform(0.2, w - 0.2),
              r_face + 0.09, z0 + h - 0.09 - i * 0.12, col, 'screen_text', emit=(col, 0.9))
    k.point_light(cx, r_face + 0.5, z0 + h / 2, col, 3, radius=0.2, group='flicker')


def antenna_array(k, cx, cr):
    """Signal mast in the middle of the station: tripod base, mast, a ring of
    receiver rods and a dish, cables to the floor, a red beacon."""
    for a in (0.5, 2.6, 4.7):
        k.tube((cx + math.cos(a) * 0.5, cr + math.sin(a) * 0.4, 0.0), (cx, cr, 0.9), 0.04, ST_WALL[3], 'antenna_leg', verts=6)
    k.cyl(cx, cr, 0.0, 0.3, 0.32, (ST_WALL[2], 0.06), 'antenna_base', verts=12)
    k.cyl(cx, cr, 0.3, 2.5, 0.06, '#5a6a78', 'mast', verts=8)
    for i in range(8):
        a = i * math.pi / 4
        k.tube((cx, cr, 1.9), (cx + math.cos(a) * 0.45, cr + math.sin(a) * 0.35, 2.15), 0.015, '#8a9aa8', 'antenna_rod', verts=4)
        k.sphere(cx + math.cos(a) * 0.45, cr + math.sin(a) * 0.35, 2.15, 0.025, 0.025, TEAL, 'antenna_tip', emit=(TEAL, 0.8), segs=6)
    k.blob(cx, cr + 0.12, 1.4, 0.38, 0.06, 0.32, ('#7a8a98', 0.05), 'dish', rot=(-35, 0, 0), segs=16)
    k.cyl(cx, cr + 0.25, 1.35, 1.45, 0.03, '#2a3038', 'dish_feed', verts=6)
    k.sphere(cx, cr, 2.55, 0.06, 0.06, WARN_R, 'beacon', emit=(WARN_R, 1.0), segs=8)
    k.point_light(cx, cr + 0.3, 2.5, WARN_R, 8, radius=0.05, group='flicker')
    k.box(cx - 0.18, cr + 0.3, 0.32, cx + 0.18, cr + 0.33, 0.6, '#041014', 'antenna_screen', emit=('#0a3040', 1.0))
    for i in range(3):   # the 47.3 MHz readout
        k.box(cx - 0.14, cr + 0.33, 0.38 + i * 0.07, cx - 0.14 + (0.25 if i == 1 else 0.15), cr + 0.335, 0.41 + i * 0.07, TEAL_L,
              'antenna_text', emit=(TEAL_L, 0.9))
    for a in (1.0, 3.6):
        k.tube((cx + math.cos(a) * 0.3, cr + math.sin(a) * 0.25, 0.15), (cx + math.cos(a) * 1.2, cr + math.sin(a) * 0.9, 0.02),
               0.03, '#14181c', 'cable', verts=5)
    k.solid(cx - 0.5, cr - 0.5, cx + 0.5, cr + 0.5)


def data_core(k, cx, cr, h=2.2):
    """Cylindrical memory core, cracked glass sleeve, glowing rings — the
    station's corrupted logs live here."""
    k.cyl(cx, cr, 0, 0.25, 0.75, (ST_WALL[2], 0.06), 'core_base', verts=20)
    k.cyl(cx, cr, h - 0.25, h, 0.75, (ST_WALL[2], 0.06), 'core_cap', verts=20)
    k.cyl(cx, cr, 0.25, h - 0.25, 0.45, '#0a1a28', 'core_body', emit=('#0a3048', 0.8), verts=20)
    for i in range(5):
        z = 0.45 + i * (h - 0.9) / 4
        col = TEAL if i % 2 == 0 else '#8060c0'
        k.cyl(cx, cr, z - 0.025, z + 0.025, 0.5, shade(col, 0.4), 'core_ring', emit=(col, 0.9), verts=20)
    for s in (-1, 1):
        k.box(cx + s * 0.6 - 0.06, cr - 0.15, 0.25, cx + s * 0.6 + 0.06, cr + 0.15, h - 0.25, ST_WALL[3], 'core_strut')
    k.tube((cx - 0.2, cr + 0.47, 1.3), (cx + 0.05, cr + 0.47, 1.0), 0.006, '#a0c0d0', 'glass_crack', verts=4)
    k.point_light(cx, cr + 0.9, 1.1, TEAL, 18, radius=0.4, group='flicker')
    k.solid(cx - 0.8, cr - 0.5, cx + 0.8, cr + 0.5)


def station_terminal(k, cx, cr, col=TEAL, w=1.0):
    P.console(k, cx, cr, w=w, screen=shade(col, 0.4), screen_emit=col)


def emergency_light(k, x, r, z=2.3, energy=10):
    k.box(x - 0.12, r, z - 0.06, x + 0.12, r + 0.1, z + 0.06, '#2a0808', 'emergency_light', emit=(WARN_R, 0.9))
    k.point_light(x, r + 0.4, z - 0.2, WARN_R, energy, radius=0.1, group='flicker')


def debris(k, x0, r0, x1, r1, n=12):
    for _ in range(n):
        x, r = k.rng.uniform(x0, x1), k.rng.uniform(r0, r1)
        kind = k.rng.random()
        if kind < 0.35:
            k.bar(x, r, x + k.rng.uniform(-0.4, 0.4), r + k.rng.uniform(-0.2, 0.2), 0.0, 0.03, k.rng.uniform(0.15, 0.3),
                  (ST_WALL[2], 0.08), 'panel_debris')
        elif kind < 0.6:
            k.box(x, r, 0.0, x + 0.18, r + 0.12, 0.004, '#c8c0a8', 'paper')
        elif kind < 0.8:
            k.tube((x, r, 0.02), (x + k.rng.uniform(-0.5, 0.5), r + k.rng.uniform(-0.3, 0.3), 0.02), 0.02, '#14181c', 'cable', verts=5)
        else:
            k.rock(x, r, 0.04, 0.08, 0.06, 0.05, ('#3a4450', 0.1), part='debris')


def hanging_cables(k, x, r, top=2.6, n=3):
    for i in range(n):
        dx = (i - n / 2) * 0.12
        L = k.rng.uniform(0.6, 1.3)
        k.tube((x + dx, r, top), (x + dx + k.rng.uniform(-0.15, 0.15), r + k.rng.uniform(-0.1, 0.1), top - L), 0.015,
               '#14181c', 'cable', verts=5)


def toppled_chair(k, cx, cr):
    k.box(cx - 0.22, cr - 0.25, 0.0, cx + 0.22, cr + 0.2, 0.08, ('#3a2a40', 0.06), 'chair_seat', bevel=0.02)
    k.box(cx - 0.2, cr + 0.2, 0.0, cx + 0.2, cr + 0.7, 0.07, ('#3a2a40', 0.06), 'chair_back', bevel=0.02)
    k.tube((cx, cr - 0.25, 0.04), (cx, cr - 0.7, 0.04), 0.025, '#4a4a52', 'chair_post', verts=6)
    k.cyl(cx, cr - 0.72, 0.0, 0.05, 0.2, ST_WALL[0], 'chair_base', verts=5)


# ---- the singularity ---------------------------------------------------------------------------
def void_platform(k, cells, top=0.0, depth=1.6, tone=VOID_STONE[3]):
    """Floating stone platform from a set of tile cells; jagged rocky
    underside, worn top slabs with glowing cracks."""
    cells = set(cells)
    for (c, r) in cells:
        k.box(c + 0.02, r + 0.02, top - 0.12, c + 0.98, r + 0.98, top, (shade(tone, k.rng.uniform(0.85, 1.1)), 0.14), 'platform')
        # the edge faces hang down where the platform ends
        if (c, r + 1) not in cells:
            k.box(c, r + 0.85, top - 0.6, c + 1, r + 1.0, top - 0.1, (VOID_STONE[1], 0.16), 'platform_side')
            for i in range(2):
                k.rock(c + 0.25 + i * 0.5, r + 0.85, top - 0.9 - k.rng.uniform(0, 0.4), 0.28, 0.2, k.rng.uniform(0.35, 0.6),
                       (VOID_STONE[1], 0.16), part='platform_under')
        if (c - 1, r) not in cells or (c + 1, r) not in cells:
            side = c if (c - 1, r) not in cells else c + 1
            k.rock(side, r + 0.5, top - 0.5, 0.25, 0.4, 0.45, (VOID_STONE[1], 0.16), part='platform_under')


def platform_crack(k, pts, col='#a080e0'):
    for a, b in zip(pts, pts[1:]):
        k.bar(a[0], a[1], b[0], b[1], -0.01, 0.004, 0.045, '#2a1050', 'void_crack', emit=(col, 0.7))


def rune_tile(k, c, r, col='#8060c0'):
    """Dark inlaid slab with a faint glyph."""
    k.box(c + 0.06, r + 0.06, -0.005, c + 0.94, r + 0.94, 0.003, VOID_STONE[0], 'rune_slab')
    cx, cr = c + 0.5, r + 0.5
    for a in range(3):
        ang = a * 2 * math.pi / 3 + 0.3
        k.bar(cx, cr, cx + math.cos(ang) * 0.3, cr + math.sin(ang) * 0.3, 0.003, 0.006, 0.03, '#1a0c30', 'rune', emit=(col, 0.6))
    k.cyl(cx, cr, 0.003, 0.006, 0.1, '#1a0c30', 'rune', emit=(col, 0.6), verts=10)


def crystal_cluster(k, cx, cr, scale=1.0, energy=10):
    for (dx, dr, h, rad, lean) in ((0.0, 0.0, 1.1, 0.13, 0), (0.18, 0.08, 0.7, 0.09, 18), (-0.16, 0.1, 0.6, 0.08, -20),
                                   (0.06, -0.15, 0.5, 0.07, 10), (-0.08, 0.2, 0.35, 0.06, -8)):
        top = (cx + dx + math.sin(math.radians(lean)) * h * scale * 0.5, cr + dr, h * scale)
        k.tube((cx + dx, cr + dr, 0.0), top, rad * scale, CRYSTAL[0], 'crystal', rb=0.004, emit=(CRYSTAL[1], 0.7), verts=6,
               smooth=False)
    k.point_light(cx, cr + 0.3, 0.7 * scale, CRYSTAL[2], energy, radius=0.15, group='flicker')
    k.solid(cx - 0.35, cr - 0.35, cx + 0.35, cr + 0.35)


def singularity(k, cx, cr, z=1.2, rad=0.5):
    """Black core, photon ring, tilted accretion disk in bands of violet and
    white-hot."""
    k.sphere(cx, cr, z, rad, rad, '#000000', 'singularity_core', segs=24)
    # thin photon ring in the plane facing the camera
    s45 = math.sqrt(0.5)
    R = rad * 1.06
    n = 32
    for i in range(n):
        a0, a1 = i * 2 * math.pi / n, (i + 1) * 2 * math.pi / n
        p0 = (cx + R * math.cos(a0), cr - R * math.sin(a0) * s45 + 0.05, z + R * math.sin(a0) * s45)
        p1 = (cx + R * math.cos(a1), cr - R * math.sin(a1) * s45 + 0.05, z + R * math.sin(a1) * s45)
        k.tube(p0, p1, 0.022, '#2a1040', 'photon_ring', emit=('#f0e0ff', 0.95), verts=5)
    bands = ((rad * 1.4, rad * 1.7, '#fff0ff', 1.0), (rad * 1.7, rad * 2.2, '#d0a0ff', 0.9), (rad * 2.2, rad * 2.9, '#9060e0', 0.8),
             (rad * 2.9, rad * 3.6, '#5030a0', 0.7))
    tilt = 72
    for (r_in, r_out, col, st) in bands:
        n = 48
        for i in range(n):
            a0, a1 = i * 2 * math.pi / n, (i + 1) * 2 * math.pi / n
            pts = [(math.cos(a0) * r_in, math.sin(a0) * r_in), (math.cos(a0) * r_out, math.sin(a0) * r_out),
                   (math.cos(a1) * r_out, math.sin(a1) * r_out), (math.cos(a1) * r_in, math.sin(a1) * r_in)]
            ct, sn = math.cos(math.radians(tilt)), math.sin(math.radians(tilt))
            quad = [(cx + px, cr + py * ct, z + py * sn * -0.35) for (px, py) in pts]
            k.poly(quad, shade(col, 0.4), 'accretion', emit=(col, st))
    k.point_light(cx, cr + 0.8, z, '#c0a0ff', 40, radius=0.6, group='flicker')
