"""The Runout Room — the games parlour behind Arcadia's Arcade, where the
Runouts games are played. Builders for scenekit (bpy). Tile units: x =
column, r = row (toward the camera), z = height.

Every station takes `dyn`: True dresses it with its moving parts (the
wheel's face, the derby's horses, the board's digits — the picker shows the
room like that); False leaves them out, and the Runouts app draws them live
over the render while you play. Each returns its anchors (tile units) for
the app: where the felt is, where the reels are, where the pegs go.
"""
import math

from scenekit import shade
import assets_cyber as Y
import assets_signs as G
import assets_town as W

FELT = '#1e6a44'
FELT_D = '#14482e'
FELT_B = '#1e3a6a'
RAIL = '#3a2214'
RAIL_L = '#6a4224'
BRASS = '#c8a048'
VELVET = '#6a1a2a'
CHROME = '#c8ccd8'
CREAM = '#f4f0e6'
C45 = math.cos(math.radians(45))
PLAYER_COLS = ['#e870c0', '#5cc8d0', '#e8c040', '#40e080', '#e84040', '#7080e8', '#f09040', '#e8e8f0']


def bulbs(k, pts, col='#ffd890', s=0.035, energy=0.9):
    for (x, r, z) in pts:
        k.sphere(x, r, z, s, s, shade(col, 0.6), 'bulb', emit=(col, energy), segs=6)


# ---- the wall games --------------------------------------------------------------------------------------------
def slot_machine(k, cx, r0, col, dyn=True, seed=0):
    """A slot machine, back to the wall: cabinet, the reel window, the arm, a lit topper."""
    w = 1.0
    x0, x1 = cx - w / 2, cx + w / 2
    body = (shade(col, 0.42), 0.04)
    k.box(x0, r0, 0, x1, r0 + 0.72, 0.82, body, 'slot_base', bevel=0.02)
    k.box(x0, r0, 0.82, x1, r0 + 0.56, 1.78, body, 'slot_case', bevel=0.02)
    k.box(x0 - 0.03, r0 + 0.5, 0.8, x1 + 0.03, r0 + 0.8, 0.88, (CHROME, 0.03), 'slot_ledge')
    k.box(x0 + 0.08, r0 + 0.55, 1.0, x1 - 0.08, r0 + 0.565, 1.55, ('#2a1a10', 0.02), 'slot_bezel')
    win = (x0 + 0.13, x1 - 0.13, 1.06, 1.49, r0 + 0.57)
    k.box(win[0], r0 + 0.565, win[2], win[1], r0 + 0.57, win[3], ('#f0ead8', 0.0), 'slot_window', emit=('#fff2d0', 0.28))
    if dyn:
        syms = [('#e02a3a', 'cherry'), ('#e8c040', 'bell'), ('#40e080', 'bar'), ('#7080e8', 'seven')]
        for i in range(3):
            c = syms[(i + seed) % 4][0]
            rx = win[0] + (win[1] - win[0]) * (i + 0.5) / 3
            k.box(rx - 0.08, r0 + 0.572, 1.2, rx + 0.08, r0 + 0.578, 1.36, shade(c, 0.6), 'slot_sym', emit=(c, 0.7))
    for i in range(2):                                    # reel dividers
        rx = win[0] + (win[1] - win[0]) * (i + 1) / 3
        k.box(rx - 0.008, r0 + 0.572, win[2], rx + 0.008, r0 + 0.576, win[3], ('#2a1a10', 0.0), 'slot_divider')
    k.box(x0 + 0.04, r0 + 0.1, 1.78, x1 - 0.04, r0 + 0.5, 2.1, ('#100818', 0.02), 'slot_topper', bevel=0.02)
    k.box(x0 + 0.08, r0 + 0.5, 1.82, x1 - 0.08, r0 + 0.51, 2.06, shade(col, 0.35), 'slot_marquee', emit=(col, 0.9))
    bulbs(k, [(x0 + 0.1 + i * (w - 0.2) / 6, r0 + 0.52, 2.13) for i in range(7)], col='#ffe080')
    k.cyl(x1 + 0.07, r0 + 0.4, 1.05, 1.62, 0.028, (CHROME, 0.03), 'slot_arm', verts=6)
    k.sphere(x1 + 0.07, r0 + 0.4, 1.66, 0.075, 0.075, Y.RED, 'slot_knob', segs=8)
    k.box(x0 + 0.22, r0 + 0.72, 0.42, x1 - 0.22, r0 + 0.8, 0.52, (CHROME, 0.03), 'slot_tray')
    k.point_light(cx, r0 + 1.1, 1.9, col, 3, radius=0.2, group='flicker')
    k.solid(x0, r0, x1 + 0.1, r0 + 0.9)
    return {'window': [round(v, 3) for v in win]}


def big_wheel(k, cx, r_face, cz, R, dyn=True, n=8):
    """The wheel of fortune on its stand: bulb rim, the pointer up top. With dyn, the coloured face."""
    k.box(cx - 1.0, r_face - 0.1, 0, cx + 1.0, r_face + 0.55, 0.16, (RAIL, 0.04), 'wheel_base', bevel=0.03)
    for s in (-1, 1):
        k.bar(cx + s * 0.85, r_face + 0.2, cx + s * 0.12, r_face - 0.02, 0.16, cz, 0.1, (RAIL_L, 0.04), 'wheel_leg')
    k.cyl_y(cx, r_face - 0.16, r_face - 0.02, cz, R + 0.16, R + 0.16, (BRASS, 0.03), 'wheel_rim', verts=48)
    if dyn:
        for i in range(n):
            a0, a1 = i * math.tau / n, (i + 1) * math.tau / n
            pts = [(cx, r_face, cz)] + [(cx + R * math.sin(a0 + (a1 - a0) * t / 4), r_face, cz + R * math.cos(a0 + (a1 - a0) * t / 4))
                                         for t in range(5)]
            col = PLAYER_COLS[i % len(PLAYER_COLS)]
            k.poly(pts, (shade(col, 0.8), 0.0), 'wheel_slice', emit=(col, 0.25))
    else:
        k.cyl_y(cx, r_face - 0.03, r_face - 0.01, cz, R, R, ('#14101c', 0.0), 'wheel_face', verts=48)
    bulbs(k, [(cx + (R + 0.08) * math.sin(i * math.tau / 24), r_face + 0.02, cz + (R + 0.08) * math.cos(i * math.tau / 24))
              for i in range(24)], energy=1.0)
    k.cyl_y(cx, r_face - 0.02, r_face + 0.06, cz, 0.16, 0.16, (BRASS, 0.03), 'wheel_hub', verts=16)
    k.poly([(cx - 0.14, r_face + 0.08, cz + R + 0.32), (cx + 0.14, r_face + 0.08, cz + R + 0.32), (cx, r_face + 0.08, cz + R - 0.08)],
           (Y.RED, 0.0), 'wheel_pointer', emit=(Y.RED, 0.4))
    k.point_light(cx, r_face + 1.2, cz, '#ffd890', 6, radius=0.3, group='flicker')
    k.solid(cx - 1.0, r_face - 0.2, cx + 1.0, r_face + 0.6)
    return {'centre': [cx, round(r_face + 0.01, 3), cz], 'R': R}


def flap_board(k, cx, r_face, z0, digits=3, dyn=True):
    """The lucky-number board: a split-flap display in a brass frame, a lightbox header."""
    cw, ch = 0.42, 0.6
    w = digits * cw + 0.24
    x0 = cx - w / 2
    k.box(x0 - 0.06, r_face, z0 - 0.06, x0 + w + 0.06, r_face + 0.12, z0 + ch + 0.18, (BRASS, 0.03), 'flap_frame', bevel=0.02)
    k.box(x0, r_face + 0.12, z0, x0 + w, r_face + 0.13, z0 + ch + 0.12, ('#0c0a12', 0.0), 'flap_back')
    cells = []
    for i in range(digits):
        fx = x0 + 0.12 + i * cw
        k.box(fx + 0.03, r_face + 0.13, z0 + 0.06, fx + cw - 0.03, r_face + 0.16, z0 + ch + 0.06, ('#1e1e26', 0.02), 'flap_cell')
        k.box(fx + 0.03, r_face + 0.16, z0 + ch / 2 + 0.05, fx + cw - 0.03, r_face + 0.165, z0 + ch / 2 + 0.07, ('#060608', 0.0), 'flap_split')
        cells.append([round(fx + 0.03, 3), round(fx + cw - 0.03, 3)])
    if dyn:
        G.letters(k, '073', 'RubikMonoOne', cx, r_face + 0.165, z0 + 0.14, size=0.36, col=CREAM, lit=False, depth=0.02)
    G.lightbox(k, 'LUCKY NUMBER', 'Righteous', cx, r_face + 0.02, z0 + ch + 0.3, w=w + 0.1, h=0.28, bg='#ffd890', ink='#2a1020', size=0.15,
               glow='#ffd890', energy=3)
    return {'cells': cells, 'z0': z0 + 0.06, 'z1': z0 + ch + 0.06, 'r': round(r_face + 0.17, 3)}


def ticker_wall(k, x0, x1, r_face, z0, z1, dyn=True):
    """The market wall: a grid of monitors (3 × 2) over an LED ticker strip."""
    cols, rows = 3, 2
    k.box(x0 - 0.1, r_face, z0 - 0.35, x1 + 0.1, r_face + 0.08, z1 + 0.1, ('#16141e', 0.02), 'ticker_back')
    mw, mh = (x1 - x0) / cols, (z1 - z0) / rows
    screens = []
    for i in range(cols):
        for j in range(rows):
            sx0, sx1 = x0 + i * mw + 0.06, x0 + (i + 1) * mw - 0.06
            sz0, sz1 = z0 + j * mh + 0.06, z0 + (j + 1) * mh - 0.06
            k.box(sx0 - 0.04, r_face + 0.08, sz0 - 0.04, sx1 + 0.04, r_face + 0.14, sz1 + 0.04, ('#2a2a36', 0.03), 'monitor')
            k.box(sx0, r_face + 0.14, sz0, sx1, r_face + 0.145, sz1, '#06140c', 'monitor_screen', emit=('#0a2a18', 0.9))
            screens.append([round(sx0, 3), round(sx1, 3), round(sz0, 3), round(sz1, 3)])
            if dyn:
                up = (i + j) % 2 == 0
                c = Y.GREEN if up else Y.RED
                for t in range(8):
                    zz = sz0 + 0.08 + (sz1 - sz0 - 0.16) * (0.5 + 0.35 * math.sin(t * 1.3 + i * 2 + j) * (1 if up else -1) * (t / 8))
                    k.box(sx0 + 0.06 + t * (sx1 - sx0 - 0.12) / 8, r_face + 0.146, zz, sx0 + 0.1 + t * (sx1 - sx0 - 0.12) / 8,
                          r_face + 0.15, zz + 0.04, shade(c, 0.6), 'chart', emit=(c, 0.9))
    k.box(x0, r_face + 0.08, z0 - 0.3, x1, r_face + 0.14, z0 - 0.1, '#140806', 'ticker_strip', emit=('#3a1206', 0.9))
    if dyn:
        G.letters(k, '$MOON +12  $REKT -40  $HODL +3', 'RubikMonoOne', (x0 + x1) / 2, r_face + 0.14, z0 - 0.27, size=0.12,
                  col='#ffb040', lit=True, energy=2, depth=0.01)
    k.point_light((x0 + x1) / 2, r_face + 1.0, (z0 + z1) / 2, '#40e080', 4, radius=0.4, group='pulse')
    return {'screens': screens, 'strip': [x0, x1, z0 - 0.3, z0 - 0.1], 'r': round(r_face + 0.15, 3)}


def derby(k, x0, x1, r0, lanes=6, dyn=True):
    """The derby: a carnival horse-race cabinet — lanes of tin horses on a painted board, the finish
    flag at the right, a lit marquee, a counter in front."""
    k.box(x0, r0, 0, x1, r0 + 0.95, 0.9, (VELVET, 0.04), 'derby_counter', bevel=0.02)
    k.box(x0 - 0.04, r0 + 0.6, 0.9, x1 + 0.04, r0 + 1.0, 0.98, (RAIL_L, 0.04), 'derby_counter_top', bevel=0.02)
    k.box(x0, r0, 0.9, x1, r0 + 0.4, 2.35, (RAIL, 0.04), 'derby_case', bevel=0.02)
    bz0, bz1 = 1.02, 2.12
    k.box(x0 + 0.12, r0 + 0.4, bz0, x1 - 0.12, r0 + 0.41, bz1, ('#2a6a3a', 0.03), 'derby_board')
    lane_h = (bz1 - bz0) / lanes
    lz = []
    for i in range(lanes):
        z = bz0 + i * lane_h
        k.box(x0 + 0.14, r0 + 0.41, z + lane_h - 0.03, x1 - 0.14, r0 + 0.44, z + lane_h, ('#e8dcc0', 0.02), 'derby_rail')
        lz.append(round(z + lane_h * 0.42, 3))
        if dyn:
            hx = x0 + 0.4 + ((i * 37) % 11) / 11 * (x1 - x0 - 1.4)
            col = PLAYER_COLS[i % len(PLAYER_COLS)]
            k.box(hx, r0 + 0.44, z + 0.03, hx + 0.26, r0 + 0.5, z + lane_h - 0.06, (shade(col, 0.9), 0.02), 'derby_horse')
            k.box(hx + 0.2, r0 + 0.44, z + lane_h - 0.1, hx + 0.32, r0 + 0.5, z + lane_h - 0.02, (shade(col, 0.9), 0.02), 'derby_horse')
    for j in range(int((bz1 - bz0) / 0.08)):                  # the chequered finish
        k.box(x1 - 0.32, r0 + 0.415, bz0 + j * 0.08, x1 - 0.26, r0 + 0.42, bz0 + (j + 1) * 0.08, (CREAM if j % 2 else '#1e1e26', 0.0), 'derby_finish')
    k.box(x0 + 0.1, r0 + 0.1, 2.35, x1 - 0.1, r0 + 0.42, 2.75, ('#100818', 0.02), 'derby_marquee_box')
    G.neon(k, 'DERBY', 'Monoton', (x0 + x1) / 2, r0 + 0.43, 2.42, size=0.26, col='#ffb040', energy=4)
    bulbs(k, [(x0 + 0.1 + i * (x1 - x0 - 0.2) / 13, r0 + 0.44, 2.78) for i in range(14)], col='#ffe080')
    k.point_light((x0 + x1) / 2, r0 + 1.4, 1.6, '#ffd890', 8, radius=0.3, group='flicker')
    k.solid(x0, r0, x1, r0 + 1.0)
    return {'x0': round(x0 + 0.2, 3), 'x1': round(x1 - 0.36, 3), 'lanes': lz, 'laneH': round(lane_h, 3), 'r': round(r0 + 0.45, 3)}


def plinko_board(k, cx, r0, rows=12, spacing=0.3, dyn=True):
    """The plinko wall: a tall board of brass pegs in a triangle over thirteen slots, the middle one gold."""
    n = rows + 1
    w = n * spacing + 0.4
    x0, x1 = cx - w / 2, cx + w / 2
    top = 3.05
    dz = 0.19
    slot_z0, slot_z1 = top - (rows + 1) * dz - 0.42, top - (rows + 1) * dz - 0.05
    k.box(x0 - 0.12, r0, 0, x1 + 0.12, r0 + 0.5, 0.42, (RAIL, 0.04), 'plinko_foot', bevel=0.02)
    k.box(x0 - 0.12, r0, 0.42, x1 + 0.12, r0 + 0.25, top + 0.3, (RAIL_L, 0.04), 'plinko_frame', bevel=0.02)
    k.box(x0, r0 + 0.25, slot_z0 - 0.1, x1, r0 + 0.26, top + 0.18, ('#101a3a', 0.02), 'plinko_back', emit=('#14204a', 0.12))
    pegs = []
    for j in range(rows):
        z = top - (j + 1) * dz
        for i in range(j + 1):
            x = cx + (i - j / 2) * spacing
            k.sphere(x, r0 + 0.3, z, 0.04, 0.04, (BRASS, 0.02), 'peg', emit=('#ffd890', 0.35), segs=6)
    vals = [1, 2, 3, 5, 8, 13, 21, 13, 8, 5, 3, 2, 1]
    for s in range(n + 1):                                         # the slot dividers
        x = cx + (s - n / 2) * spacing
        k.box(x - 0.012, r0 + 0.26, slot_z0, x + 0.012, r0 + 0.34, slot_z1, (CHROME, 0.02), 'plinko_div')
    for s in range(n):
        x = cx + (s - rows / 2) * spacing
        v = vals[s]
        col = '#e8c040' if v == 21 else '#e870c0' if v >= 8 else '#5cc8d0' if v >= 3 else '#5a5a6e'
        k.box(x - spacing / 2 + 0.015, r0 + 0.26, slot_z0, x + spacing / 2 - 0.015, r0 + 0.27, slot_z0 + 0.12, shade(col, 0.5), 'plinko_slot', emit=(col, 0.8))
    if dyn:
        for (s, j) in ((5, 7), (8, 3), (6, 10)):
            x = cx + (s - j / 2) * spacing
            k.sphere(x, r0 + 0.34, top - (j + 1) * dz + 0.1, 0.06, 0.06, (CREAM, 0.0), 'plinko_ball', emit=('#ffffff', 0.3), segs=8)
    G.neon(k, 'PLINKO', 'Monoton', cx, r0 + 0.27, top + 0.32, size=0.22, col='#5cc8d0', energy=3)
    k.point_light(cx, r0 + 1.2, 2.0, '#80a0ff', 6, radius=0.3, group='pulse')
    k.solid(x0 - 0.12, r0, x1 + 0.12, r0 + 0.6)
    return {'cx': cx, 'top': top, 'dz': dz, 'spacing': spacing, 'rows': rows, 'r': round(r0 + 0.34, 3),
            'slotZ': [round(slot_z0, 3), round(slot_z1, 3)], 'values': vals}


# ---- the tables ------------------------------------------------------------------------------------------------
def felt_table(k, cx, cr, rx, ry, z=0.8, felt=FELT, rail=RAIL, legs=2):
    """An oval card table: padded rail, felt, a gold line, pedestal legs."""
    for i in range(legs):
        lx = cx + (i - (legs - 1) / 2) * rx * 0.9
        k.cyl(lx, cr, 0, 0.06, 0.32, (rail, 0.04), 'table_foot', verts=12, ry=0.22)
        k.cyl(lx, cr, 0.06, z - 0.1, 0.1, (rail, 0.04), 'table_leg', verts=10)
    k.cyl(cx, cr, z - 0.12, z + 0.02, rx, ('#1a0e08', 0.03), 'table_rail', verts=56, ry=ry)
    k.cyl(cx, cr, z + 0.02, z + 0.08, rx, (rail, 0.04), 'table_rail', verts=56, ry=ry)
    k.cyl(cx, cr, z + 0.08, z + 0.1, rx - 0.16, (felt, 0.03), 'felt', verts=56, ry=ry - 0.16)       # the felt inside the padded rail
    return z + 0.1


def poker_table(k, cx, cr, rx=3.4, ry=1.35, dyn=True):
    zt = felt_table(k, cx, cr, rx, ry, legs=3)
    k.box(cx - 0.5, cr - ry + 0.18, zt, cx + 0.5, cr - ry + 0.42, zt + 0.04, ('#2a1a10', 0.02), 'chip_tray')
    for i in range(8):
        col = ['#e84040', '#2a6ae0', '#1e1e26', '#40e080', '#f4f0e6'][i % 5]
        k.cyl(cx - 0.42 + i * 0.12, cr - ry + 0.3, zt + 0.04, zt + 0.08, 0.045, (col, 0.0), 'chip', verts=10)
    if dyn:
        for i in range(5):
            k.box(cx - 0.7 + i * 0.3, cr - 0.12, zt, cx - 0.48 + i * 0.3, cr + 0.18, zt + 0.006, (CREAM, 0.0), 'card')
        for (x, r) in ((cx - 2.2, cr + 0.4), (cx + 2.1, cr + 0.3), (cx - 1.0, cr + 0.85), (cx + 1.1, cr + 0.8)):
            for h in range(4):
                k.cyl(x, r, zt + h * 0.035, zt + (h + 1) * 0.035, 0.07, (['#e84040', '#2a6ae0', '#1e1e26', '#40e080'][h], 0.0), 'chip', verts=10)
    k.solid(cx - rx, cr - ry, cx + rx, cr + ry)
    return {'centre': [cx, cr, zt], 'rx': rx - 0.16, 'ry': ry - 0.16}


def dice_pit(k, x0, x1, r0, r1, dyn=True):
    """The dice pit: a long craps table, a padded rail, a back wall of rubber diamonds, the stick."""
    z = 0.82
    k.box(x0, r0, 0, x1, r1, 0.6, ('#2a1a10', 0.04), 'pit_body', bevel=0.03)
    for (a, b, c, d) in ((x0 - 0.06, r0 - 0.06, x1 + 0.06, r0 + 0.14), (x0 - 0.06, r1 - 0.14, x1 + 0.06, r1 + 0.06),
                         (x0 - 0.06, r0 + 0.14, x0 + 0.14, r1 - 0.14), (x1 - 0.14, r0 + 0.14, x1 + 0.06, r1 - 0.14)):
        k.box(a, b, 0.6, c, d, z + 0.12, (RAIL, 0.04), 'pit_rail', bevel=0.03)          # the padded rail round the felt
    k.box(x0 + 0.14, r0 + 0.14, 0.6, x1 - 0.14, r1 - 0.14, z, (FELT_B, 0.03), 'pit_felt')
    k.box(x0 + 0.14, r0 + 0.14, z, x1 - 0.14, r0 + 0.24, z + 0.2, ('#c03030', 0.03), 'pit_backstop')
    for i in range(int((x1 - x0 - 0.3) / 0.18)):
        k.box(x0 + 0.2 + i * 0.18, r0 + 0.24, z + 0.05, x0 + 0.3 + i * 0.18, r0 + 0.25, z + 0.15, ('#e05050', 0.0), 'pit_diamond')
    k.box(x0 + 0.5, (r0 + r1) / 2 - 0.02, z, x1 - 0.5, (r0 + r1) / 2 + 0.02, z + 0.004, ('#e8dcc0', 0.0), 'pit_line')
    k.tube((x1 - 0.2, r1 + 0.1, z + 0.2), (x1 - 1.3, r0 + 0.8, z + 0.25), 0.02, ('#7a5a30', 0.03), 'stick', verts=5)
    if dyn:
        for (dx, dr) in ((1.2, 0.5), (1.45, 0.62)):
            k.box(x0 + dx, r0 + dr, z, x0 + dx + 0.14, r0 + dr + 0.14, z + 0.14, (CREAM, 0.0), 'die', bevel=0.02)
    k.solid(x0, r0, x1, r1)
    return {'felt': [round(x0 + 0.2, 3), round(r0 + 0.3, 3), round(x1 - 0.2, 3), round(r1 - 0.2, 3)], 'z': z}


def coin_table(k, cx, cr, dyn=True):
    """The coin table: a round brass-edged table, a felt circle marked HEADS / TAILS, a tray of coins."""
    z = 0.78
    k.cyl(cx, cr, 0, 0.05, 0.3, (RAIL, 0.04), 'table_foot', verts=12)
    k.cyl(cx, cr, 0.05, z - 0.04, 0.07, (BRASS, 0.03), 'table_leg', verts=8)
    k.cyl(cx, cr, z - 0.04, z + 0.04, 0.85, (BRASS, 0.03), 'coin_rim', verts=40)
    k.cyl(cx, cr, z + 0.04, z + 0.06, 0.78, (VELVET, 0.03), 'coin_felt', verts=40)
    k.box(cx - 0.02, cr - 0.7, z + 0.06, cx + 0.02, cr + 0.7, z + 0.065, ('#e8c040', 0.0), 'coin_line')
    if dyn:
        for (x, r) in ((cx - 0.3, cr - 0.1), (cx + 0.32, cr + 0.15), (cx + 0.1, cr - 0.35)):
            k.cyl(x, r, z + 0.06, z + 0.08, 0.08, ('#e8c040', 0.0), 'coin', verts=12)
    k.solid(cx - 0.9, cr - 0.9, cx + 0.9, cr + 0.9)
    return {'centre': [cx, cr, z + 0.06], 'R': 0.78}


def marble_urn(k, cx, cr, dyn=True):
    """The marble urn on its pedestal, a velvet tray in front for the drawn marbles."""
    k.box(cx - 0.4, cr - 0.4, 0, cx + 0.4, cr + 0.4, 0.95, ('#3a2a40', 0.04), 'pedestal', bevel=0.03)
    k.box(cx - 0.48, cr - 0.48, 0.95, cx + 0.48, cr + 0.48, 1.02, (BRASS, 0.03), 'pedestal_top', bevel=0.02)
    k.cyl(cx, cr - 0.05, 1.02, 1.1, 0.18, (BRASS, 0.03), 'urn_foot', verts=14)
    k.sphere(cx, cr - 0.05, 1.4, 0.34, 0.36, ('#a0c8e8', 0.02), 'urn_glass', segs=16)
    k.cyl(cx, cr - 0.05, 1.68, 1.78, 0.15, (BRASS, 0.03), 'urn_neck', verts=14)
    if dyn:
        for i in range(6):
            a = i * 1.1
            k.sphere(cx + 0.15 * math.cos(a), cr - 0.05 + 0.1 * math.sin(a), 1.2 + (i % 3) * 0.07, 0.06, 0.06,
                     ('#f4f0e6' if i != 3 else '#14101c', 0.0), 'marble', segs=8)
    k.box(cx - 0.36, cr + 0.12, 1.02, cx + 0.36, cr + 0.42, 1.06, (VELVET, 0.03), 'marble_tray')
    k.point_light(cx, cr + 0.6, 1.9, '#c0a0ff', 3, radius=0.2, group='pulse')
    k.solid(cx - 0.5, cr - 0.5, cx + 0.5, cr + 0.5)
    return {'urn': [cx, cr - 0.05, 1.4], 'tray': [cx, cr + 0.27, 1.06], 'trayW': 0.72}


def bomb_table(k, cx, cr, dyn=True):
    """The bomb table: a round table on hazard-striped floor, the bomb on a red cushion."""
    z = 0.74
    for i in range(10):                                   # hazard stripes round it
        a = i * math.tau / 10
        k.box(cx + 1.1 * math.cos(a) - 0.12, cr + 1.1 * math.sin(a) - 0.06, 0.0, cx + 1.1 * math.cos(a) + 0.12, cr + 1.1 * math.sin(a) + 0.06,
              0.006, ('#e8c040' if i % 2 else '#1e1e26', 0.0), 'hazard')
    k.cyl(cx, cr, 0, 0.05, 0.3, ('#2a2a36', 0.04), 'table_foot', verts=12)
    k.cyl(cx, cr, 0.05, z - 0.04, 0.07, ('#3a3a48', 0.03), 'table_leg', verts=8)
    k.cyl(cx, cr, z - 0.04, z + 0.04, 0.7, ('#2a2a36', 0.03), 'bomb_top', verts=36)
    k.cyl(cx, cr, z + 0.04, z + 0.1, 0.3, ('#a02020', 0.03), 'cushion', verts=16)
    if dyn:
        k.sphere(cx, cr, z + 0.32, 0.22, 0.22, ('#1e1e26', 0.02), 'bomb', segs=14)
        k.cyl(cx + 0.08, cr, z + 0.5, z + 0.58, 0.05, ('#5a5a6e', 0.02), 'bomb_cap', verts=8)
        k.tube((cx + 0.08, cr, z + 0.58), (cx + 0.2, cr, z + 0.72), 0.012, ('#c8a060', 0.02), 'fuse', verts=4)
    k.solid(cx - 0.75, cr - 0.75, cx + 0.75, cr + 0.75)
    return {'centre': [cx, cr, z + 0.1]}


def holo_table(k, cx, cr, dyn=True):
    """The holo-table: a round console, a cyan grid lit in its top, the battle map hanging over it."""
    z = 0.82
    k.cyl(cx, cr, 0, 0.7, 0.55, ('#1a1530', 0.03), 'holo_base', verts=24)
    k.cyl(cx, cr, 0.7, z, 1.0, ('#2a2a3e', 0.03), 'holo_rim', verts=36)
    k.cyl(cx, cr, z, z + 0.01, 0.88, '#062a30', 'holo_glass', emit=('#0a4048', 0.9), verts=36)
    if dyn:
        for i in range(-3, 4):
            k.box(cx + i * 0.22 - 0.005, cr - 0.7, z + 0.012, cx + i * 0.22 + 0.005, cr + 0.7, z + 0.016, '#40e0f0', 'holo_grid', emit=('#40e0f0', 0.8))
            k.box(cx - 0.7, cr + i * 0.2 - 0.005, z + 0.012, cx + 0.7, cr + i * 0.2 + 0.005, z + 0.016, '#40e0f0', 'holo_grid', emit=('#40e0f0', 0.8))
    k.point_light(cx, cr, z + 0.6, '#40e0f0', 6, radius=0.3, group='pulse')
    k.solid(cx - 1.0, cr - 1.0, cx + 1.0, cr + 1.0)
    return {'centre': [cx, cr, z + 0.01], 'R': 0.88}


def fortune_booth(k, cx, r0, dyn=True):
    """THE MACHINE: a fortune-teller booth — a glass case, a robed automaton with a glowing crystal,
    a lit header. It picks the game when you can't."""
    w = 1.3
    x0, x1 = cx - w / 2, cx + w / 2
    k.box(x0, r0, 0, x1, r0 + 0.9, 0.9, ('#3a1a40', 0.04), 'booth_base', bevel=0.03)
    k.box(x0, r0, 0.9, x1, r0 + 0.12, 2.3, ('#3a1a40', 0.04), 'booth_back')
    for xx in (x0, x1 - 0.08):
        k.box(xx, r0, 0.9, xx + 0.08, r0 + 0.9, 2.3, (BRASS, 0.03), 'booth_post')
    k.box(x0 + 0.08, r0 + 0.85, 0.92, x1 - 0.08, r0 + 0.86, 2.2, ('#80a0c0', 0.0), 'booth_glass', emit=('#40306a', 0.12))
    k.sphere(cx, r0 + 0.4, 1.62, 0.17, 0.19, ('#c8a080', 0.03), 'automaton_head', segs=12)
    k.cone(cx, r0 + 0.4, 1.74, 2.0, 0.2, 0.02, ('#6a2a8a', 0.03), 'turban', verts=10)
    k.cone(cx, r0 + 0.4, 0.92, 1.5, 0.42, 0.16, ('#6a2a8a', 0.03), 'robe', verts=12)
    k.sphere(cx, r0 + 0.62, 1.16, 0.1, 0.1, '#a080ff', 'crystal', emit=('#c0a0ff', 1.0), segs=10)
    k.box(x0, r0, 2.3, x1, r0 + 0.95, 2.62, ('#1e0a24', 0.03), 'booth_header', bevel=0.02)
    G.neon(k, 'THE MACHINE', 'Monoton', cx, r0 + 0.96, 2.38, size=0.15, col='#c0a0ff', energy=3)
    k.point_light(cx, r0 + 1.1, 1.3, '#a080ff', 5, radius=0.2, group='pulse')
    k.solid(x0, r0, x1, r0 + 1.0)
    return {'crystal': [cx, r0 + 0.62, 1.16]}
