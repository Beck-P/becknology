"""The Arcadia District, street level: frontages with depth and clutter for
tools/bridge-art/scenes/arcadia_street.py. Tile units: x = column, r = row
(toward the camera), z = height.

A frontage is a low building (two or three storeys, so the skyline towers
over the street) facing the camera: a recessed entrance, display windows
lit from inside, a sign stack (neon name, blade sign, hanging sign), an
awning, upper floors with blinds, AC units, pipes, sometimes a fire escape
or a balcony with plants and washing, and a roof crowded with tanks,
dishes and a billboard. Billboards and vents report where they are so the
engine can animate them (ads, steam).
"""
import math

from scenekit import shade
import assets_cyber as Y

C45 = math.cos(math.radians(45))
CONCRETE = ['#2a2836', '#34303e', '#3e3a48']
METAL = '#4a4a58'


class Street:
    """What the engine animates: holo-ad rects and steam vents in screen tiles."""
    def __init__(self):
        self.ads = []
        self.steam = []
        self.bulbs = []

    def ad_rect(self, x0, x1, r_face, z0, z1, kind=None):
        self.ads.append([round(x0, 3), round(r_face - z1 * C45, 3), round(x1, 3), round(r_face - z0 * C45, 3)] +
                        ([kind] if kind is not None else []))

    def vent(self, x, r, z=0.0):
        self.steam.append([round(x, 3), round(r - z * C45, 3)])


def _panel_seams(k, x0, x1, r_face, z0, z1, wall, step=0.75):
    seams = []
    x = x0 + step
    while x < x1 - 0.1:
        seams.append((x - 0.012, r_face, z0, x + 0.012, r_face + 0.01, z1))
        x += step
    if seams:
        k.boxes(seams, shade(wall, 0.7), 'panel_seam')


def window_row(k, x0, x1, r_face, z, h=0.62, lit=0.6, rng=None, blinds=True, style='plain', neon=None):
    """A storey's windows: frames, lit glass (warm, cool, pink), blinds,
    the odd silhouette or plant on a sill."""
    rng = rng or k.rng
    n = max(1, int((x1 - x0) / 0.8))
    lit_by = {}
    frames, dark = [], []
    for i in range(n):
        cx = x0 + (i + 0.5) * (x1 - x0) / n
        w = 0.5 if style == 'plain' else 0.62
        frames.append((cx - w / 2 - 0.04, r_face, z - 0.04, cx + w / 2 + 0.04, r_face + 0.03, z + h + 0.04))
        if rng.random() < lit:
            col = rng.choice(('#ffd890', '#ffc070', '#a0e0ff', '#ff90c0', '#c0a0ff'))
            lit_by.setdefault(col, []).append((cx - w / 2, r_face + 0.03, z, cx + w / 2, r_face + 0.035, z + h))
            if neon and rng.random() < 0.45:      # a neon tube round the frame
                t = 0.025
                k.boxes([(cx - w / 2 - 0.07, r_face + 0.035, z - 0.07, cx + w / 2 + 0.07, r_face + 0.06, z - 0.07 + t),
                         (cx - w / 2 - 0.07, r_face + 0.035, z + h + 0.07 - t, cx + w / 2 + 0.07, r_face + 0.06, z + h + 0.07),
                         (cx - w / 2 - 0.07, r_face + 0.035, z - 0.07, cx - w / 2 - 0.07 + t, r_face + 0.06, z + h + 0.07),
                         (cx + w / 2 + 0.07 - t, r_face + 0.035, z - 0.07, cx + w / 2 + 0.07, r_face + 0.06, z + h + 0.07)],
                        shade(neon, 0.5), 'window_neon', emit=(neon, 0.9))
            if blinds and rng.random() < 0.5:     # blinds half down, slats
                bz = z + h * rng.uniform(0.4, 0.75)
                k.boxes([(cx - w / 2, r_face + 0.036, zz, cx + w / 2, r_face + 0.04, zz + 0.025)
                         for zz in [bz + j * 0.06 for j in range(int((z + h - bz) / 0.06))]], '#1a1420', 'blind')
            elif rng.random() < 0.25:             # someone at the window
                k.blob(cx + rng.uniform(-0.1, 0.1), r_face + 0.04, z + 0.22, 0.09, 0.01, 0.16, '#140c18', 'silhouette', segs=8)
            if rng.random() < 0.25:
                k.box(cx - 0.12, r_face + 0.03, z, cx + 0.12, r_face + 0.16, z + 0.08, '#3a2a20', 'sill_pot')
                k.blob(cx, r_face + 0.1, z + 0.14, 0.13, 0.08, 0.09, ('#2a5a3a', 0.2), 'sill_plant', segs=8)
        else:
            dark.append((cx - w / 2, r_face + 0.03, z, cx + w / 2, r_face + 0.035, z + h))
    k.boxes(frames, '#0c0a12', 'window_frame')
    if dark:
        k.boxes(dark, '#121624', 'window_dark')
    for col, rects in lit_by.items():
        k.boxes(rects, shade(col, 0.55), 'window_lit', emit=(col, 0.75))


def cladding(k, x0, x1, r_face, z0, z1, wall, style, rng):
    """Facade finish above the shop: 'tile' (a fine grid), 'brick'
    (running courses), 'metal' (ribbed panels with rivets), 'plain'."""
    if style == 'tile':
        lines = [(x0, r_face, z, x1, r_face + 0.008, z + 0.012) for z in [z0 + i * 0.2 for i in range(int((z1 - z0) / 0.2))]]
        lines += [(x, r_face, z0, x + 0.012, r_face + 0.008, z1) for x in [x0 + i * 0.2 for i in range(1, int((x1 - x0) / 0.2))]]
        k.boxes(lines, shade(wall, 0.75), 'tile_seam')
    elif style == 'brick':
        lines = []
        for i in range(int((z1 - z0) / 0.12)):
            z = z0 + i * 0.12
            lines.append((x0, r_face, z, x1, r_face + 0.008, z + 0.015))
            off = 0.0 if i % 2 else 0.14
            lines += [(x, r_face, z, x + 0.015, r_face + 0.008, z + 0.12) for x in [x0 + off + j * 0.28 for j in range(int((x1 - x0) / 0.28))]]
        k.boxes(lines, shade(wall, 0.7), 'brick_seam')
    elif style == 'metal':
        ribs = [(x, r_face, z0, x + 0.04, r_face + 0.03, z1) for x in [x0 + 0.1 + i * 0.3 for i in range(int((x1 - x0 - 0.1) / 0.3))]]
        k.boxes(ribs, shade(wall, 1.25), 'metal_rib')
        rivets = [(x, r_face + 0.03, z, x + 0.03, r_face + 0.045, z + 0.03) for x in [x0 + 0.25 + i * 0.3 for i in range(int((x1 - x0 - 0.3) / 0.3))]
                  for z in (z0 + 0.06, z1 - 0.09)]
        k.boxes(rivets, shade(wall, 1.6), 'rivet')


def side_signs(k, x, r_face, z0, rng, cols=(Y.PINK, Y.CYAN, Y.YEL)):
    """A stack of small lit signs down a facade's edge, glyphs on each."""
    z = z0
    for i in range(rng.randint(2, 3)):
        h = rng.uniform(0.28, 0.42)
        col = rng.choice(cols)
        k.box(x - 0.2, r_face, z, x + 0.2, r_face + 0.06, z + h, shade(col, 0.35), 'side_sign', emit=(col, 0.7))
        for j in range(rng.randint(1, 2)):
            gz = z + h * (0.3 + 0.4 * j)
            k.box(x - 0.12, r_face + 0.06, gz - 0.02, x + 0.12, r_face + 0.07, gz + 0.02, '#1a0c1a', 'sign_glyph')
        z += h + 0.06


def ac_unit(k, cx, r_face, z):
    k.box(cx - 0.18, r_face, z, cx + 0.18, r_face + 0.24, z + 0.2, ('#8a8a94', 0.08), 'ac_unit')
    k.cyl_y(cx - 0.05, r_face + 0.24, r_face + 0.25, z + 0.1, 0.065, 0.065, '#2a2a32', 'ac_fan', verts=10)
    k.box(cx - 0.17, r_face + 0.06, z - 0.3, cx - 0.15, r_face + 0.08, z, '#3a3a42', 'ac_drip')


def fire_escape(k, x0, x1, r_face, floors, floor_h, base=1.2):
    """Iron landings at each upper storey joined by zigzag stairs, a drop ladder."""
    for f in range(floors):
        z = base + f * floor_h
        k.box(x0, r_face, z - 0.04, x1, r_face + 0.42, z, '#22202a', 'escape_deck')
        k.boxes([(x, r_face + 0.38, z, x + 0.02, r_face + 0.42, z + 0.42) for x in
                 [x0 + i * 0.18 for i in range(int((x1 - x0) / 0.18) + 1)]], '#22202a', 'escape_rail')
        k.box(x0, r_face + 0.38, z + 0.4, x1, r_face + 0.42, z + 0.44, '#2a2832', 'escape_rail_top')
        if f < floors - 1:
            a, b = (x0 + 0.1, x1 - 0.1) if f % 2 == 0 else (x1 - 0.1, x0 + 0.1)
            k.bar(a, r_face + 0.2, b, r_face + 0.2, z, z + 0.04, 0.3, '#22202a', 'escape_stair')
            k.tube((a, r_face + 0.36, z + 0.4), (b, r_face + 0.36, z + floor_h + 0.4), 0.015, '#22202a', 'escape_stair_rail', verts=4)
            k.tube((a, r_face + 0.2, z), (b, r_face + 0.2, z + floor_h), 0.05, '#22202a', 'escape_stair', verts=4)
    k.tube((x1 - 0.15, r_face + 0.3, base), (x1 - 0.15, r_face + 0.3, base - 0.9), 0.02, '#22202a', 'escape_ladder', verts=4)
    k.tube((x1 - 0.35, r_face + 0.3, base), (x1 - 0.35, r_face + 0.3, base - 0.9), 0.02, '#22202a', 'escape_ladder', verts=4)


def balcony(k, x0, x1, r_face, z, rng=None):
    rng = rng or k.rng
    k.box(x0, r_face, z - 0.06, x1, r_face + 0.45, z, ('#3a3644', 0.06), 'balcony')
    k.box(x0, r_face + 0.42, z, x1, r_face + 0.45, z + 0.38, '#1a1822', 'balcony_wall')
    k.box(x0, r_face + 0.42, z + 0.34, x1, r_face + 0.46, z + 0.38, shade(Y.CYAN, 0.4), 'balcony_led', emit=(Y.CYAN, 0.5))
    for i in range(rng.randint(1, 3)):            # potted plants
        px = rng.uniform(x0 + 0.15, x1 - 0.15)
        k.cyl(px, r_face + 0.2, z, z + 0.16, 0.08, '#4a2a20', 'pot', verts=8)
        k.blob(px, r_face + 0.2, z + 0.3, 0.14, 0.12, 0.16, ('#2a6a40', 0.2), 'plant', segs=8)
    # washing on a line
    k.tube((x0 + 0.05, r_face + 0.35, z + 0.85), (x1 - 0.05, r_face + 0.35, z + 0.8), 0.006, '#8a8a90', 'wash_line', verts=3)
    x = x0 + 0.15
    while x < x1 - 0.25:
        if rng.random() < 0.7:
            col = rng.choice(('#d84060', '#e0e0f0', '#3a6ad0', '#e0c040', '#2a2a30'))
            k.box(x, r_face + 0.34, z + 0.5, x + rng.uniform(0.12, 0.22), r_face + 0.36, z + 0.83, (col, 0.1), 'washing')
        x += 0.25


def graffiti(k, x0, x1, r_face, z0, z1, col, rng=None):
    """Neon spray tags: loose strokes, faintly glowing."""
    rng = rng or k.rng
    for _ in range(rng.randint(3, 6)):
        a = (rng.uniform(x0, x1), rng.uniform(z0, z1))
        b = (min(x1, max(x0, a[0] + rng.uniform(-0.4, 0.4))), min(z1, max(z0, a[1] + rng.uniform(-0.25, 0.25))))
        k.tube((a[0], r_face + 0.01, a[1]), (b[0], r_face + 0.01, b[1]), 0.022, shade(col, 0.6), 'graffiti', emit=(col, 0.35),
               verts=4)


def poster_wall(k, x0, x1, r_face, z0, z1, rng=None):
    rng = rng or k.rng
    x = x0
    while x < x1 - 0.2:
        w = rng.uniform(0.22, 0.38)
        h = rng.uniform(0.3, 0.45)
        z = rng.uniform(z0, z1 - h)
        col = rng.choice(('#e84060', '#e8c040', '#40c8d8', '#a060e0', '#e0e0e0', '#ff7a30'))
        k.box(x, r_face, z, x + w, r_face + 0.012, z + h, (shade(col, 0.75), 0.1), 'poster')
        k.box(x + 0.04, r_face + 0.012, z + h * 0.55, x + w - 0.04, r_face + 0.014, z + h * 0.7, '#1a1420', 'poster_text')
        x += w + rng.uniform(0.02, 0.12)


def billboard(k, st, x0, x1, r, z, h, kind=None):
    """A rooftop billboard on legs, its screen left for the engine's ads."""
    for x in (x0 + 0.15, x1 - 0.15):
        k.box(x - 0.04, r - 0.3, z, x + 0.04, r - 0.22, z + 0.5, '#2a2832', 'billboard_leg')
    k.box(x0 - 0.06, r - 0.24, z + 0.45, x1 + 0.06, r - 0.14, z + 0.5 + h + 0.06, '#0a0810', 'billboard_frame')
    k.box(x0, r - 0.14, z + 0.5, x1, r - 0.13, z + 0.5 + h, '#120830', 'billboard_screen', emit=('#3a1a70', 0.6))
    k.point_light((x0 + x1) / 2, r + 0.4, z + 0.5 + h / 2, '#a070ff', 14, radius=0.4, group='flicker')
    st.ad_rect(x0, x1, r - 0.13, z + 0.5, z + 0.5 + h, kind)


def water_tank(k, cx, cr, z):
    for (dx, dr) in ((-0.2, -0.2), (0.2, -0.2), (-0.2, 0.2), (0.2, 0.2)):
        k.box(cx + dx - 0.03, cr + dr - 0.03, z, cx + dx + 0.03, cr + dr + 0.03, z + 0.35, '#2a2832', 'tank_leg')
    k.cyl(cx, cr, z + 0.35, z + 0.85, 0.24, ('#34343e', 0.12), 'water_tank', verts=12)
    k.cyl(cx, cr, z + 0.6, z + 0.63, 0.25, shade(Y.CYAN, 0.4), 'tank_band', emit=(Y.CYAN, 0.5), verts=12)
    k.cone(cx, cr, z + 0.85, z + 1.0, 0.26, 0.03, '#2a2a32', 'tank_cap', verts=12)


def dish(k, cx, cr, z):
    k.tube((cx, cr, z), (cx, cr, z + 0.35), 0.03, '#3a3a44', 'dish_post', verts=5)
    k.blob(cx, cr + 0.05, z + 0.45, 0.24, 0.06, 0.2, ('#b0b0b8', 0.06), 'dish', rot=(25, 0, 0), segs=12)


def frontage(k, st, x0, x1, r_front, floors=2, floor_h=1.15, wall=None, trim=Y.PINK, kind='glass', name=None,
             name_col=Y.PINK, door_x=None, glow='#3a2a60', awning=None, blade=None, escape=False, balcony_at=None,
             roof=('tank',), ad=None, depth=1.4, rng=None, door_w=0.8, clad=None, window_neon=None, sign_floor=False,
             side=None, windows=True):
    """A District building. kind: 'glass' (big display windows), 'shutter'
    (roller shutters half down over barred glass), 'garage' (a roll-up door
    open on a lit workshop), 'clinic' (frosted panels, white trim), 'club'
    (blank wall, one lit door), 'stall' (open counter). Returns roof height."""
    rng = rng or k.rng
    wall = wall or rng.choice(CONCRETE)
    rb = r_front - depth
    G = 1.35                                   # ground storey
    H = G + (floors - 1) * floor_h
    k.box(x0, rb, 0, x1, r_front, H, (wall, 0.1), 'building')
    _panel_seams(k, x0, x1, r_front, G, H, wall, step=rng.choice((0.6, 0.8, 1.0)))
    k.box(x0, r_front, G - 0.08, x1, r_front + 0.06, G, shade(wall, 0.6), 'storey_band')
    dx = door_x if door_x is not None else (x0 + x1) / 2
    # ---- ground storey -------------------------------------------------------------------
    k.box(x0 + 0.05, r_front - 0.01, 0, x1 - 0.05, r_front + 0.02, G - 0.08, '#0a0810', 'shop_face')
    dw = door_w / 2
    # recessed entrance: side walls, a lit doorway set back, a step
    k.box(dx - dw - 0.08, r_front - 0.35, 0, dx - dw, r_front + 0.02, G - 0.12, shade(wall, 0.8), 'recess')
    k.box(dx + dw, r_front - 0.35, 0, dx + dw + 0.08, r_front + 0.02, G - 0.12, shade(wall, 0.8), 'recess')
    k.box(dx - dw, r_front - 0.36, 0, dx + dw, r_front - 0.33, G - 0.15, shade(glow, 0.45), 'doorway', emit=(glow, 0.8))
    k.box(dx - dw - 0.1, r_front, 0, dx + dw + 0.1, r_front + 0.18, 0.05, '#2a2832', 'step')
    k.point_light(dx, r_front + 0.3, 0.8, glow, 10, radius=0.3, group='flicker')
    panes = [(x0 + 0.15, dx - dw - 0.15), (dx + dw + 0.15, x1 - 0.15)]
    for (a, b) in panes:
        if b - a < 0.3:
            continue
        if kind in ('glass', 'stall'):
            k.box(a, r_front + 0.02, 0.25, b, r_front + 0.03, G - 0.2, shade(glow, 0.55), 'display', emit=(glow, 0.85))
            for i in range(int((b - a) / 0.26)):          # goods on shelves
                gx = a + 0.06 + i * 0.26
                for sz in (0.3, 0.68):
                    k.box(gx, r_front + 0.03, sz, gx + 0.16, r_front + 0.04, sz + rng.uniform(0.12, 0.28),
                          shade(rng.choice(('#e84060', '#40c8d8', '#e8c040', '#a060e0')), 0.4), 'goods')
            k.box(a, r_front + 0.03, 0.62, b, r_front + 0.05, 0.65, '#1a1620', 'shelf')
        elif kind == 'shutter':
            k.box(a, r_front + 0.02, 0.25, b, r_front + 0.03, G - 0.2, shade(glow, 0.5), 'display', emit=(glow, 0.7))
            k.boxes([(x, r_front + 0.03, 0.25, x + 0.025, r_front + 0.06, G - 0.2) for x in
                     [a + i * 0.12 for i in range(int((b - a) / 0.12) + 1)]], '#3a3a42', 'bars')
            sh = rng.uniform(0.35, 0.6)                    # shutter pulled half down
            k.boxes([(a, r_front + 0.06, z, b, r_front + 0.08, z + 0.05) for z in
                     [G - 0.2 - sh + i * 0.06 for i in range(int(sh / 0.06))]], ('#6a6a72', 0.08), 'shutter')
            k.box(a - 0.03, r_front + 0.02, G - 0.22, b + 0.03, r_front + 0.16, G - 0.08, '#4a4a52', 'shutter_box')
        elif kind == 'garage':
            k.box(a, r_front - 0.3, 0.0, b, r_front - 0.28, 0.75, shade(glow, 0.5), 'workshop', emit=(glow, 0.8))
            k.box(a, r_front - 0.05, 0.75, b, r_front + 0.02, G - 0.12, ('#6a6a72', 0.08), 'rollup')
            k.boxes([(a, r_front + 0.02, z, b, r_front + 0.03, z + 0.02) for z in
                     [0.8 + i * 0.08 for i in range(int((G - 0.95) / 0.08))]], '#4a4a52', 'rollup_ribs')
            k.box(a + 0.1, r_front - 0.27, 0.0, a + 0.6, r_front - 0.05, 0.45, '#2a2832', 'workbench')
            k.point_light((a + b) / 2, r_front + 0.2, 0.4, glow, 14, radius=0.3, group='flicker')
        elif kind == 'clinic':
            k.box(a, r_front + 0.02, 0.25, b, r_front + 0.03, G - 0.2, '#a8c8d0', 'frosted', emit=(Y.CYAN_L, 0.45))
            k.boxes([(x, r_front + 0.03, 0.25, x + 0.03, r_front + 0.05, G - 0.2) for x in
                     [a + i * 0.4 for i in range(int((b - a) / 0.4) + 1)]], '#e0e8ec', 'mullion')
        elif kind == 'club':
            graffiti(k, a, b, r_front + 0.02, 0.2, G - 0.3, rng.choice((Y.PINK, Y.CYAN, Y.YEL)), rng=rng)
    k.box(x0 + 0.1, r_front + 0.02, G - 0.18, x1 - 0.1, r_front + 0.06, G - 0.12, shade(trim, 0.4), 'neon_trim', emit=(trim, 0.85))
    if awning:
        col, style = awning
        if style == 'metal':
            k.box(x0 + 0.1, r_front, G - 0.05, x1 - 0.1, r_front + 0.7, G, ('#3a3844', 0.06), 'awning')
            k.box(x0 + 0.1, r_front + 0.66, G - 0.12, x1 - 0.1, r_front + 0.7, G - 0.05, shade(col, 0.45), 'awning_led',
                  emit=(col, 0.85))
            for x in [x0 + 0.4 + i * 0.6 for i in range(int((x1 - x0 - 0.5) / 0.6) + 1)]:
                k.sphere(x, r_front + 0.5, G - 0.08, 0.04, 0.03, '#fff0c0', 'awning_lamp', emit=('#ffe0a0', 1.0), segs=5)
        else:
            stripes = int((x1 - x0) / 0.35)
            for i in range(stripes):
                a = x0 + 0.1 + i * (x1 - x0 - 0.2) / stripes
                b = a + (x1 - x0 - 0.2) / stripes
                k.poly([(a, r_front + 0.75, G - 0.1), (b, r_front + 0.75, G - 0.1), (b, r_front, G + 0.3), (a, r_front, G + 0.3)],
                       ((col if i % 2 == 0 else '#e8e0d0'), 0.1), 'awning')
            k.box(x0 + 0.1, r_front + 0.72, G - 0.22, x1 - 0.1, r_front + 0.76, G - 0.1, shade(col, 0.6), 'awning_valance')
    # ---- the sign stack -------------------------------------------------------------------
    # the name sits clear of a fabric awning, and the first floor's windows clear of the name
    sign_z = G + (0.38 if awning and awning[1] == 'fabric' else 0.1)
    if name:
        Y.neon_text(k, name, (x0 + x1) / 2, r_front + 0.04, sign_z, h=0.34, col=name_col, energy=9)
    if side:
        side_signs(k, x0 + 0.25 if side == 'left' else x1 - 0.25, r_front + 0.05, G + 0.6, rng)
    if blade:
        bx = x1 - 0.12
        k.box(bx - 0.04, r_front, G + 0.2, bx + 0.04, r_front + 0.55, G + 0.2 + 1.5, '#0c0818', 'blade_sign')
        k.box(bx + 0.04, r_front + 0.05, G + 0.28, bx + 0.05, r_front + 0.5, G + 0.12 + 1.5, shade(blade, 0.4), 'blade_neon',
              emit=(blade, 0.9))
        for i in range(4):                                  # glyph strokes down it
            gz = G + 0.45 + i * 0.32
            k.tube((bx + 0.06, r_front + 0.12, gz), (bx + 0.06, r_front + 0.42, gz + rng.uniform(-0.08, 0.08)), 0.018,
                   '#0c0818', 'blade_glyph', verts=4)
        k.point_light(bx + 0.4, r_front + 0.4, G + 1.0, blade, 6, radius=0.2, group='flicker')
    # ---- upper storeys ----------------------------------------------------------------------
    cladding(k, x0, x1, r_front, G, H, wall, clad or rng.choice(('plain', 'tile', 'brick', 'metal')), rng)
    for f in range(1, floors if windows else 1):
        z = G + (f - 1) * floor_h + 0.25
        h = floor_h * 0.55
        if f == 1 and (name or sign_floor):
            if sign_floor:
                continue
            z = max(z, sign_z + 0.5)
            h = min(h, G + floor_h - z - 0.1)
        wx0, wx1 = (x0 + 0.2, x1 - 0.2) if not side else ((x0 + 0.55, x1 - 0.2) if side == 'left' else (x0 + 0.2, x1 - 0.55))
        window_row(k, wx0, wx1, r_front, z, h=h, lit=rng.uniform(0.4, 0.75), rng=rng, neon=window_neon)
        if rng.random() < 0.55:
            ac_unit(k, rng.uniform(x0 + 0.4, x1 - 0.4), r_front, z - 0.2)
        if f < floors - 1:
            k.box(x0, r_front, z + floor_h - 0.3, x1, r_front + 0.05, z + floor_h - 0.25, shade(wall, 0.7), 'storey_band')
    if escape and floors > 1:
        ex = escape if isinstance(escape, tuple) else (x0 + 0.15, x0 + 1.25)
        fire_escape(k, ex[0], ex[1], r_front + 0.05, floors - 1, floor_h, base=G + 0.05)
    if balcony_at and floors > 1:
        balcony(k, balcony_at[0], balcony_at[1], r_front + 0.05, G + 0.05, rng=rng)
    # a drainpipe down one corner
    px = x0 + 0.08 if rng.random() < 0.5 else x1 - 0.08
    k.cyl(px, r_front + 0.06, 0, H, 0.04, '#3a3a44', 'drainpipe', verts=6)
    # ---- the roof ---------------------------------------------------------------------------
    k.box(x0 - 0.03, rb - 0.03, H, x1 + 0.03, r_front + 0.03, H + 0.14, shade(wall, 0.75), 'parapet')
    k.box(x0 + 0.06, rb + 0.06, H, x1 - 0.06, r_front - 0.06, H + 0.04, ('#2a2632', 0.12), 'roof_deck')
    k.box(x0, r_front + 0.0, H + 0.1, x1, r_front + 0.04, H + 0.13, shade(trim, 0.35), 'roof_neon', emit=(trim, 0.6))
    for item in roof:
        if item == 'tank':
            water_tank(k, rng.uniform(x0 + 0.4, x1 - 0.4), rb + 0.5, H + 0.04)
        elif item == 'dish':
            dish(k, rng.uniform(x0 + 0.3, x1 - 0.3), rb + 0.6, H + 0.04)
        elif item == 'vent':
            vx = rng.uniform(x0 + 0.3, x1 - 0.6)
            k.box(vx, rb + 0.25, H + 0.04, vx + 0.35, rb + 0.65, H + 0.35, ('#5a5866', 0.08), 'roof_vent')
            st.vent(vx + 0.17, rb + 0.45, H + 0.4)
        elif item == 'antenna':
            ax = rng.uniform(x0 + 0.3, x1 - 0.3)
            k.tube((ax, rb + 0.3, H), (ax, rb + 0.3, H + 1.4), 0.02, '#3a3a42', 'antenna', verts=4)
            k.sphere(ax, rb + 0.3, H + 1.42, 0.04, 0.04, Y.RED, 'antenna_light', emit=(Y.RED, 1.0), segs=6)
    if ad:
        billboard(k, st, ad[0], ad[1], rb + 0.6, H + 0.04, ad[2], ad[3] if len(ad) > 3 else None)
    k.solid(x0, rb, x1, r_front)
    return H


def cable(k, a, b, sag=0.3, lights=None, n=10):
    """A cable strung between two points (x, r, z), sagging; optional string
    lights in a list of colours."""
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)))
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.01, '#14121a', 'cable', verts=3)
    if lights:
        for i, p in enumerate(pts[1:-1]):
            col = lights[i % len(lights)]
            k.sphere(p[0], p[1], p[2] - 0.05, 0.035, 0.035, col, 'string_light', emit=(col, 1.0), segs=5)


def steam_grate(k, st, cx, cr):
    k.box(cx - 0.3, cr - 0.2, 0.0, cx + 0.3, cr + 0.2, 0.01, '#14121a', 'grate')
    k.boxes([(cx - 0.28 + i * 0.07, cr - 0.18, 0.01, cx - 0.25 + i * 0.07, cr + 0.18, 0.015) for i in range(9)], '#2a2832',
            'grate_bars')
    st.vent(cx, cr)


def trash_pile(k, cx, cr, rng=None):
    rng = rng or k.rng
    for _ in range(rng.randint(2, 4)):
        s = rng.uniform(0.14, 0.22)
        k.blob(cx + rng.uniform(-0.25, 0.25), cr + rng.uniform(-0.15, 0.15), s * 0.8, s, s * 0.9, s * 0.85,
               (rng.choice(('#1a1a20', '#2a2a34', '#20302a')), 0.15), 'trash_bag', segs=8)
    k.box(cx + 0.15, cr - 0.25, 0, cx + 0.5, cr + 0.05, 0.3, ('#6a5a40', 0.1), 'box')


def dumpster(k, cx, cr):
    k.box(cx - 0.6, cr - 0.35, 0.08, cx + 0.6, cr + 0.35, 0.85, ('#2a5a4a', 0.1), 'dumpster')
    k.box(cx - 0.62, cr - 0.37, 0.85, cx + 0.62, cr + 0.1, 0.92, '#1e3a32', 'dumpster_lid')
    for x in (cx - 0.45, cx + 0.45):
        k.cyl(x, cr + 0.25, 0, 0.08, 0.06, '#1a1a1a', 'caster', verts=6)
    k.solid(cx - 0.6, cr - 0.35, cx + 0.6, cr + 0.35)


def drone_parked(k, cx, cr):
    k.blob(cx, cr, 0.18, 0.26, 0.2, 0.1, ('#c8c8d0', 0.06), 'drone', segs=12)
    for (dx, dr) in ((-0.28, -0.2), (0.28, -0.2), (-0.28, 0.2), (0.28, 0.2)):
        k.cyl(cx + dx, cr + dr, 0.2, 0.22, 0.12, '#2a2a32', 'rotor', verts=10)
    k.sphere(cx, cr + 0.18, 0.2, 0.04, 0.04, Y.CYAN, 'drone_eye', emit=(Y.CYAN, 1.0), segs=6)


def food_cart(k, cx, cr, col='#e8c040'):
    """A noodle / skewer cart: counter, canopy, steam, lanterns."""
    k.box(cx - 0.7, cr - 0.35, 0.15, cx + 0.7, cr + 0.35, 0.9, ('#8a2a2a', 0.08), 'cart_body')
    for x in (cx - 0.55, cx + 0.55):
        k.cyl_y(x, cr + 0.3, cr + 0.38, 0.15, 0.15, 0.15, '#1a1a1a', 'cart_wheel', verts=12)
    k.box(cx - 0.75, cr - 0.4, 0.9, cx + 0.75, cr + 0.4, 0.96, ('#5a3a20', 0.12), 'cart_top')
    k.box(cx - 0.62, cr - 0.3, 0.96, cx - 0.1, cr + 0.1, 1.0, '#2a2a30', 'griddle')
    for i in range(4):
        k.tube((cx - 0.55 + i * 0.12, cr - 0.1, 1.02), (cx - 0.55 + i * 0.12, cr + 0.15, 1.04), 0.02, '#c87040', 'skewer', verts=4)
    k.tube((cx + 0.55, cr - 0.1, 0.96), (cx + 0.55, cr - 0.1, 2.0), 0.025, '#2a2a30', 'parasol_pole', verts=4)
    for i in range(8):                                   # a striped parasol
        a0, a1 = i * math.pi / 4, (i + 1) * math.pi / 4
        k.poly([(cx + 0.55, cr - 0.1, 2.2), (cx + 0.55 + math.cos(a0) * 0.85, cr - 0.1 + math.sin(a0) * 0.85, 1.9),
                (cx + 0.55 + math.cos(a1) * 0.85, cr - 0.1 + math.sin(a1) * 0.85, 1.9)],
               ((col if i % 2 else '#e8e0d0'), 0.08), 'parasol')
    pts = [(cx + 0.55 + math.cos(i * math.pi / 8) * 0.86, cr - 0.1 + math.sin(i * math.pi / 8) * 0.86, 1.89) for i in range(17)]
    for a, b in zip(pts, pts[1:]):
        k.tube(a, b, 0.015, shade(col, 0.5), 'parasol_neon', emit=(col, 0.85), verts=3)
    Y.paper_lantern(k, cx - 0.55, cr + 0.38, 1.25, s=0.4, top=1.55)
    k.tube((cx - 0.55, cr + 0.38, 1.55), (cx - 0.55, cr + 0.38, 0.96), 0.02, '#2a2a30', 'lantern_pole', verts=4)
    k.solid(cx - 0.75, cr - 0.4, cx + 0.75, cr + 0.4)


# ---- bespoke pieces: what makes each frontage its own ------------------------------------------
def arcade_canopy(k, st, x0, x1, r_front, z, col=Y.PINK, out=0.85):
    """A curved marquee canopy over the doors, bulbs along its lip."""
    rings = []
    for x in (x0, x1):
        rings.append([(x, r_front + out * math.sin(a), z + 0.45 * math.cos(a)) for a in [i * (math.pi / 2) / 8 for i in range(9)]])
    k.loft(rings, ('#2a1c40', 0.08), 'canopy', closed=False)
    k.box(x0, r_front + out - 0.03, z - 0.06, x1, r_front + out + 0.03, z, shade(col, 0.45), 'canopy_neon', emit=(col, 0.9))
    n = int((x1 - x0) / 0.22)
    for i in range(n + 1):
        x = x0 + i * (x1 - x0) / n
        k.sphere(x, r_front + out + 0.04, z - 0.1, 0.035, 0.035, '#fff0c0', 'canopy_bulb', emit=('#ffe090', 1.0), segs=5)
        st.bulbs.append([round(x, 3), round(r_front + out + 0.04 - (z - 0.1) * C45, 3)])
    k.point_light((x0 + x1) / 2, r_front + out + 0.4, z - 0.3, '#ffd0a0', 18, radius=0.5, group='flicker')


def portholes(k, x0, x1, r_front, z, col=Y.CYAN, n=4, rad=0.24):
    for i in range(n):
        cx = x0 + (i + 0.5) * (x1 - x0) / n
        k.cyl_y(cx, r_front, r_front + 0.04, z, rad, rad, '#0c1020', 'porthole', verts=16)
        k.cyl_y(cx, r_front + 0.04, r_front + 0.05, z, rad * 0.82, rad * 0.82, shade('#a0c0ff', 0.6), 'porthole_glass',
                emit=(k.rng.choice(('#a0c0ff', '#ff90c0', '#ffd890')), 0.75), verts=16)
        pts = [(cx + math.cos(a) * rad, r_front + 0.06, z + math.sin(a) * rad) for a in [j * math.pi / 8 for j in range(17)]]
        for p, q in zip(pts, pts[1:]):
            k.tube(p, q, 0.018, shade(col, 0.5), 'porthole_neon', emit=(col, 0.9), verts=4)


def timber_front(k, x0, x1, r_front, G, wood='#5a3a22', tile='#2a2a34'):
    """A noodle bar's front: dark timber boards over the shop storey and a
    tiled eave sloping out above the door, lanterns hung under it."""
    boards = [(x, r_front, 0.0, x + 0.16, r_front + 0.04, G - 0.08) for x in [x0 + 0.05 + i * 0.2 for i in range(int((x1 - x0) / 0.2))]
              if not (x0 + 0.9 < x < x1 - 0.9)]
    if boards:
        k.boxes(boards, (wood, 0.12), 'timber_board')
    k.poly([(x0 - 0.1, r_front, G + 0.42), (x1 + 0.1, r_front, G + 0.42), (x1 + 0.1, r_front + 0.7, G + 0.08),
            (x0 - 0.1, r_front + 0.7, G + 0.08)], (tile, 0.12), 'eave')
    ridges = [(x, r_front, G + 0.08, x + 0.05, r_front + 0.7, G + 0.44) for x in [x0 - 0.05 + i * 0.25 for i in range(int((x1 - x0 + 0.2) / 0.25))]]
    for (a, b, c, d, e, f) in ridges:
        k.bar(a, b, a, e, c + 0.34, c + 0.4, 0.05, shade(tile, 1.3), 'eave_ridge')
    k.box(x0 - 0.1, r_front + 0.66, G + 0.0, x1 + 0.1, r_front + 0.72, G + 0.1, '#1a1014', 'eave_edge')


def razor_wire(k, x0, x1, r, z):
    """Coils of wire along a parapet."""
    pts = []
    n = int((x1 - x0) / 0.04)
    for i in range(n + 1):
        t = i * 0.04
        a = t / 0.12 * 2 * math.pi
        pts.append((x0 + t, r + 0.1 * math.sin(a), z + 0.1 + 0.1 * math.cos(a)))
    for p, q in zip(pts, pts[1:]):
        k.tube(p, q, 0.008, '#8a8a92', 'razor_wire', verts=3)


def bulb_seven(k, st, cx, r_face, z0, h=1.0, col='#ffe090'):
    """A giant 7 traced in bulbs, the pachinko parlour's beacon."""
    w = h * 0.6
    path = [(cx - w / 2, z0 + h), (cx + w / 2, z0 + h), (cx - w * 0.1, z0)]
    pts = []
    for (a, b), (c, d) in zip(path, path[1:]):
        L = math.hypot(c - a, d - b)
        n = max(2, int(L / 0.09))
        pts += [(a + (c - a) * i / n, b + (d - b) * i / n) for i in range(n)]
    pts.append(path[-1])
    k.box(cx - w / 2 - 0.12, r_face, z0 - 0.12, cx + w / 2 + 0.12, r_face + 0.04, z0 + h + 0.12, '#3a0c10', 'seven_board')
    for (x, z) in pts:
        k.sphere(x, r_face + 0.07, z, 0.04, 0.04, '#fff0c0', 'seven_bulb', emit=(col, 1.0), segs=5)
        st.bulbs.append([round(x, 3), round(r_face + 0.07 - z * C45, 3)])
    k.point_light(cx, r_face + 0.5, z0 + h / 2, col, 14, radius=0.4, group='flicker')


def capsule_wall(k, x0, x1, r_front, z0, z1, rng=None):
    """Rows of capsule pods stacked up a hotel's face, some lit, some curtained."""
    rng = rng or k.rng
    rows = int((z1 - z0) / 0.5)
    cols = int((x1 - x0) / 0.62)
    for j in range(rows):
        for i in range(cols):
            cx = x0 + (i + 0.5) * (x1 - x0) / cols
            cz = z0 + 0.06 + j * 0.5
            k.box(cx - 0.26, r_front, cz, cx + 0.26, r_front + 0.06, cz + 0.38, '#14101e', 'pod_frame')
            on = rng.random() < 0.6
            col = rng.choice(('#ffd890', '#a0c0ff', '#ffa0d0', '#c0a0ff'))
            k.box(cx - 0.22, r_front + 0.06, cz + 0.04, cx + 0.22, r_front + 0.065, cz + 0.34, shade(col, 0.55) if on else '#1a1828',
                  'pod_window', emit=(col, 0.7) if on else None)
            k.cyl_y(cx - 0.22, r_front + 0.06, r_front + 0.065, cz + 0.19, 0.15, 0.15, shade(col, 0.55) if on else '#1a1828',
                    'pod_end', emit=(col, 0.7) if on else None, verts=10)
            k.cyl_y(cx + 0.22, r_front + 0.06, r_front + 0.065, cz + 0.19, 0.15, 0.15, shade(col, 0.55) if on else '#1a1828',
                    'pod_end', emit=(col, 0.7) if on else None, verts=10)
            if on and rng.random() < 0.35:
                k.box(cx - 0.22, r_front + 0.066, cz + 0.18, cx + 0.22, r_front + 0.07, cz + 0.34, '#2a2038', 'pod_curtain')


def monolith(k, x0, x1, r_front, z0, z1, slit=Y.MAG):
    """Club Void: a black glossy slab over the facade, one slit of light."""
    k.box(x0 + 0.05, r_front, z0, x1 - 0.05, r_front + 0.1, z1, ('#08060c', 0.04), 'monolith')
    cx = (x0 + x1) / 2 + 0.6
    k.box(cx - 0.035, r_front + 0.1, z0 + 0.15, cx + 0.035, r_front + 0.11, z1 - 0.15, shade(slit, 0.5), 'slit', emit=(slit, 1.0))
    k.point_light(cx, r_front + 0.4, (z0 + z1) / 2, slit, 12, radius=0.1, group='flicker')


def velvet_rope(k, x0, x1, r):
    posts = [x0 + i * (x1 - x0) / 3 for i in range(4)]
    for x in posts:
        k.cyl(x, r, 0.0, 0.06, 0.1, '#a08040', 'rope_base', verts=10)
        k.cyl(x, r, 0.06, 0.8, 0.025, ('#c8a050', 0.06), 'rope_post', verts=8)
        k.sphere(x, r, 0.82, 0.04, 0.04, '#e0c060', 'rope_knob', segs=8)
    for a, b in zip(posts, posts[1:]):
        pts = [(a + (b - a) * t, r, 0.72 - 0.16 * 4 * t * (1 - t)) for t in [i / 8 for i in range(9)]]
        for p, q in zip(pts, pts[1:]):
            k.tube(p, q, 0.022, '#8a1020', 'velvet_rope', verts=6)
