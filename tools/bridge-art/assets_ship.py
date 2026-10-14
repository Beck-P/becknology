"""Ship builders for scenekit (bpy): the pilot's quarters and the bridge.
Tile units: x = column, r = row (toward the camera), z = height.

Windows onto space are HOLDOUT parts — holes in the render that the engine
fills with its live starfield (world.scene.sky). Catalog decor and trophies
are built inside `with k.variant(slot, key):` so the engine can show
whichever ones the pilot owns.
"""
import math

from scenekit import shade
from assets_lumar import BRASS, CANDLE, WOOD, WOOD_D, WOOD_DD, floor_planks, rug

# Quarters: warm dark metal + wood; bridge: navy steel
Q_WALL = ['#1a1410', '#2a2018', '#3a2820', '#4a3a30']
B_WALL = ['#0a1018', '#1a2028', '#2a3038', '#3a4048']
CYAN = '#40c8d8'
CYAN_L = '#80e0e8'
WARM = '#ffe080'
BRASS_D = '#a08040'
PURPLE = ['#2a1840', '#5a4078', '#8060c0']
LED_R = '#e84040'
LED_Y = '#e8c040'


# ---- shell ----------------------------------------------------------------
def led_strip(k, x0, x1, r, z=0.04, h=0.04, col=CYAN, group='pulse', lights=True, along='x'):
    """Glowing LED strip (emissive) with a few soft lights along it."""
    if along == 'x':
        k.box(x0, r - 0.02, z, x1, r + 0.03, z + h, '#10343a', 'led', emit=(col, 0.85))
        if lights:
            n = max(1, int((x1 - x0) / 2.5))
            for i in range(n):
                x = x0 + (i + 0.5) * (x1 - x0) / n
                k.point_light(x, r + 0.25, z + 0.15, col, 4, radius=0.2, group=group)
    else:
        k.box(r - 0.02, x0, z, r + 0.03, x1, z + h, '#10343a', 'led', emit=(col, 0.85))


def ship_back_wall(k, x0, x1, r_face, height, win=None, mullions=(), pal=Q_WALL, ribs_every=2.0, trim=BRASS_D):
    """Panelled back wall. win = (wx0, wx1, z0, z1): a viewport cut through it
    (holdout glass) with a heavy frame and mullions at the x positions given."""
    k.box(x0, r_face - 0.5, 0, x1, r_face, height, (pal[1], 0.06), 'wall')
    # skirting + top beam
    k.box(x0, r_face - 0.02, 0, x1, r_face + 0.08, 0.22, (pal[0], 0.05), 'skirting')
    k.box(x0, r_face - 0.02, height - 0.28, x1, r_face + 0.1, height, (pal[0], 0.05), 'wall_beam')
    k.box(x0, r_face - 0.5, height, x1, r_face + 0.1, height + 0.05, pal[0], 'wall_cap')
    # panels
    x = x0
    while x < x1 - 0.1:
        xe = min(x1, x + ribs_every)
        if not win or xe <= win[0] or x >= win[1]:
            k.box(x + 0.08, r_face - 0.01, 0.3, xe - 0.08, r_face + 0.025, height - 0.36, (pal[2], 0.06), 'wall_panel')
            k.box(x + 0.2, r_face, 0.9, xe - 0.2, r_face + 0.035, 0.95, pal[3], 'wall_panel_line')
        if not win or not (win[0] - 0.2 < xe < win[1] + 0.2):
            k.box(xe - 0.06, r_face - 0.01, 0.0, xe + 0.06, r_face + 0.09, height, (pal[0], 0.05), 'wall_rib')
            k.box(xe - 0.065, r_face + 0.085, 0.22, xe + 0.065, r_face + 0.095, height - 0.28, trim, 'wall_trim')
        x = xe
    if win:
        wx0, wx1, z0, z1 = win
        k.box(wx0, r_face - 0.02, z0, wx1, r_face + 0.02, z1, 'HOLDOUT', 'viewport')
        fr = pal[0]
        k.box(wx0 - 0.14, r_face, z0 - 0.16, wx1 + 0.14, r_face + 0.14, z0, (fr, 0.05), 'window_frame')
        k.box(wx0 - 0.14, r_face, z1, wx1 + 0.14, r_face + 0.14, z1 + 0.14, (fr, 0.05), 'window_frame')
        for xx in (wx0 - 0.14, wx1):
            k.box(xx, r_face, z0, xx + 0.14, r_face + 0.14, z1, (fr, 0.05), 'window_frame')
        k.box(wx0 - 0.14, r_face + 0.13, z0 - 0.04, wx1 + 0.14, r_face + 0.15, z0 - 0.01, trim, 'window_trim')
        for mx in mullions:
            k.box(mx - 0.06, r_face, z0, mx + 0.06, r_face + 0.1, z1, (fr, 0.05), 'mullion')
            k.box(mx - 0.02, r_face + 0.1, z0 + 0.1, mx + 0.02, r_face + 0.11, z1 - 0.1, '#103038', 'mullion_led',
                  emit=(CYAN, 0.5))


def ship_side_wall(k, x0, x1, r0, r1, height, pal=Q_WALL):
    k.box(x0, r0, 0, x1, r1, height, (pal[1], 0.06), 'side_wall')
    k.box(x0 - 0.02, r0, height, x1 + 0.02, r1, height + 0.05, pal[0], 'wall_cap')
    k.box(x0 - 0.02, r1, 0, x1 + 0.02, r1 + 0.03, height + 0.05, '#06080a', 'wall_cut')


def ship_front_wall(k, x0, x1, r0, door, height=0.35, pal=Q_WALL):
    for a, b in ((x0, door[0]), (door[1], x1)):
        k.box(a, r0, 0, b, r0 + 0.6, height, (pal[1], 0.06), 'front_wall')
        k.box(a, r0, height, b, r0 + 0.6, height + 0.05, pal[0], 'wall_cap')
        k.box(a, r0 - 0.01, height - 0.06, b, r0 + 0.02, height - 0.03, '#103038', 'led', emit=(CYAN, 0.6))
    # sliding-door track and lit threshold
    k.box(door[0], r0, -0.01, door[1], r0 + 0.6, 0.02, ('#2a3038', 0.08), 'threshold')
    for xx in (door[0] + 0.05, door[1] - 0.09):
        k.box(xx, r0, 0.0, xx + 0.04, r0 + 0.6, 0.03, '#103038', 'led', emit=(CYAN, 0.8))
    for xx in (door[0] - 0.18, door[1]):
        k.box(xx, r0, 0, xx + 0.18, r0 + 0.6, height + 0.25, (pal[0], 0.05), 'door_post')
        k.box(xx + 0.06, r0 - 0.01, height, xx + 0.12, r0 + 0.02, height + 0.12, '#103038', 'door_led', emit=(CYAN, 0.9))


def metal_floor(k, x0, r0, x1, r1, tones=('#1a2030', '#2a3040', '#3a4050'), panel=1.0):
    """Polished metal deck plates with dark seams and the odd vent grate."""
    k.box(x0, r0, -0.12, x1, r1, -0.02, '#0a0e18', 'subfloor')
    r = r0
    i = 0
    while r < r1 - 1e-6:
        x = x0
        j = 0
        while x < x1 - 1e-6:
            w = min(panel, x1 - x)
            t = tones[1] if (i + j) % 2 else tones[0]
            k.box(x + 0.025, r + 0.025, -0.04, x + w - 0.025, r + panel - 0.025, 0.0, (shade(t, k.rng.uniform(0.95, 1.08)), 0.05), 'floor')
            for (dx, dr) in ((0.1, 0.1), (w - 0.14, 0.1), (0.1, panel - 0.14), (w - 0.14, panel - 0.14)):
                k.box(x + dx, r + dr, 0.0, x + dx + 0.04, r + dr + 0.04, 0.006, tones[2], 'rivet')
            x += w
            j += 1
        r += panel
        i += 1


# ---- quarters furniture ---------------------------------------------------------------
def bunk(k, x0, x1, r0, r1):
    """Pilot's bunk against the back wall: metal frame with brass trim,
    purple blanket folded back, pillow, reading light on the headboard."""
    k.box(x0, r0, 0, x1, r1, 0.28, (Q_WALL[1], 0.05), 'bed_frame')
    k.box(x0 + 0.06, r1 - 0.01, 0.05, x1 - 0.06, r1 + 0.01, 0.22, Q_WALL[0], 'bed_drawer')
    k.box((x0 + x1) / 2 - 0.15, r1, 0.12, (x0 + x1) / 2 + 0.15, r1 + 0.02, 0.15, BRASS, 'bed_handle')
    k.box(x0 - 0.02, r1 - 0.02, 0.26, x1 + 0.02, r1 + 0.02, 0.3, BRASS_D, 'bed_trim')
    k.box(x0 + 0.05, r0 + 0.05, 0.28, x1 - 0.05, r1 - 0.05, 0.45, ('#d4c8b0', 0.04), 'mattress', bevel=0.03)
    k.box(x0 + 0.03, r0 + 0.75, 0.42, x1 - 0.03, r1 - 0.02, 0.5, (PURPLE[1], 0.08), 'blanket', bevel=0.03)
    k.box(x0 + 0.03, r0 + 0.65, 0.45, x1 - 0.03, r0 + 0.85, 0.53, (PURPLE[2], 0.08), 'blanket_fold', bevel=0.03)
    k.blob((x0 + x1) / 2, r0 + 0.35, 0.52, (x1 - x0) * 0.36, 0.2, 0.09, ('#d4c8b0', 0.04), 'pillow', segs=14)
    k.box(x0, r0 - 0.02, 0, x1, r0 + 0.1, 1.05, (Q_WALL[2], 0.05), 'headboard')
    k.box(x0 + 0.08, r0 + 0.09, 0.6, x1 - 0.08, r0 + 0.11, 0.95, ('#3a2a40', 0.06), 'headboard_pad')
    k.box((x0 + x1) / 2 - 0.12, r0 + 0.1, 1.05, (x0 + x1) / 2 + 0.12, r0 + 0.22, 1.12, BRASS, 'reading_light')
    k.box((x0 + x1) / 2 - 0.1, r0 + 0.2, 1.03, (x0 + x1) / 2 + 0.1, r0 + 0.23, 1.06, '#fff0c0', 'reading_glow',
          emit=(WARM, 1.0))
    k.point_light((x0 + x1) / 2, r0 + 0.6, 1.2, '#ffc880', 12, radius=0.1)
    k.solid(x0, r0, x1, r1)


def wall_shelf_plain(k, x0, x1, r_face, z):
    k.box(x0, r_face, z - 0.05, x1, r_face + 0.3, z, (WOOD, 0.1), 'shelf')
    k.box(x0 - 0.02, r_face + 0.28, z - 0.07, x1 + 0.02, r_face + 0.31, z, BRASS_D, 'shelf_trim')
    for xb in (x0 + 0.05, x1 - 0.09):
        k.box(xb, r_face, z - 0.22, xb + 0.04, r_face + 0.26, z - 0.05, Q_WALL[0], 'shelf_bracket')


def trophy_cabinet(k, x0, x1, r_face, depth=0.62, h=0.85, slots=5):
    """Low display cabinet under the viewport: dark body, brass trim, lit
    glass top with a pedestal per trophy slot. Returns pedestal centres."""
    k.box(x0, r_face, 0, x1, r_face + depth, h - 0.05, (Q_WALL[2], 0.05), 'cabinet')
    k.box(x0 - 0.03, r_face, h - 0.05, x1 + 0.03, r_face + depth + 0.03, h, (WOOD, 0.1), 'cabinet_top')
    k.box(x0, r_face + depth, 0.08, x1, r_face + depth + 0.02, 0.12, BRASS_D, 'cabinet_trim')
    k.box(x0, r_face + depth - 0.01, h - 0.15, x1, r_face + depth + 0.02, h - 0.12, '#103038', 'led', emit=(CYAN, 0.6))
    w = (x1 - x0) / (slots + 1)
    out = []
    for i in range(slots + 1):
        cx = x0 + (i + 0.5) * w
        k.box(cx - w / 2 + 0.05, r_face + depth, 0.18, cx + w / 2 - 0.05, r_face + depth + 0.015, h - 0.2,
              (Q_WALL[1], 0.05), 'cabinet_door')
        k.box(cx - 0.03, r_face + depth + 0.01, 0.42, cx + 0.03, r_face + depth + 0.03, 0.56, BRASS, 'cabinet_knob')
        if i < slots:
            k.cyl(cx, r_face + depth / 2, h, h + 0.06, 0.18, ('#2a2018', 0.05), 'pedestal', verts=14)
            k.cyl(cx, r_face + depth / 2, h + 0.06, h + 0.075, 0.19, BRASS, 'pedestal_rim', verts=14)
            out.append((cx, r_face + depth / 2, h + 0.075))
    k.solid(x0, r_face, x1, r_face + depth)
    return out


def desk_station(k, x0, x1, r_face, d=0.8, h=0.78):
    """Desk under the viewport: two monitors with the pilot's logs, keyboard,
    lamp, papers and a mug of coffee (the engine steams it)."""
    k.box(x0, r_face, h - 0.06, x1, r_face + d, h, (WOOD, 0.1), 'desk_top')
    k.box(x0 - 0.01, r_face + d - 0.01, h - 0.07, x1 + 0.01, r_face + d + 0.02, h - 0.02, BRASS_D, 'desk_trim')
    for xx in (x0 + 0.05, x1 - 0.55):
        k.box(xx, r_face + 0.05, 0, xx + 0.5, r_face + d - 0.05, h - 0.06, (Q_WALL[2], 0.05), 'desk_drawers')
        k.box(xx + 0.08, r_face + d - 0.05, 0.4, xx + 0.42, r_face + d - 0.04, 0.44, BRASS, 'drawer_handle')
    for (cx, w) in (((x0 + x1) / 2 - 0.45, 0.8), ((x0 + x1) / 2 + 0.45, 0.8)):
        k.box(cx - 0.05, r_face + 0.2, h, cx + 0.05, r_face + 0.28, h + 0.22, Q_WALL[0], 'monitor_stand')
        k.box(cx - w / 2, r_face + 0.18, h + 0.2, cx + w / 2, r_face + 0.26, h + 0.68, (Q_WALL[0], 0.04), 'monitor')
        k.box(cx - w / 2 + 0.04, r_face + 0.26, h + 0.24, cx + w / 2 - 0.04, r_face + 0.27, h + 0.64, '#0c2a30', 'screen',
              emit=('#1a5a68', 1.0))
        for i in range(5):
            ln = k.rng.uniform(0.25, 0.6) * (w - 0.16)
            z = h + 0.56 - i * 0.065
            k.box(cx - w / 2 + 0.09, r_face + 0.27, z, cx - w / 2 + 0.09 + ln, r_face + 0.275, z + 0.025, '#80e0e8', 'screen_text',
                  emit=(CYAN_L, 0.9))
        k.point_light(cx, r_face + 0.6, h + 0.5, CYAN, 4, radius=0.2, group='pulse')
    k.box((x0 + x1) / 2 - 0.35, r_face + 0.42, h, (x0 + x1) / 2 + 0.35, r_face + 0.62, h + 0.03, '#2a2a30', 'keyboard')
    k.box(x0 + 0.15, r_face + 0.45, h, x0 + 0.5, r_face + 0.72, h + 0.01, '#e8e0cc', 'papers')
    # lamp
    lx = x0 + 0.25
    k.cyl(lx, r_face + 0.25, h, h + 0.03, 0.09, BRASS, 'lamp', verts=10)
    k.tube((lx, r_face + 0.25, h + 0.03), (lx + 0.05, r_face + 0.3, h + 0.45), 0.015, BRASS, 'lamp', verts=6)
    k.cone(lx + 0.08, r_face + 0.33, h + 0.33, h + 0.47, 0.11, 0.04, ('#3a5a40', 0.05), 'lamp_shade', verts=12)
    k.cone(lx + 0.08, r_face + 0.33, h + 0.32, h + 0.34, 0.1, 0.1, '#fff0c0', 'lamp_glow', emit=(WARM, 1.0), verts=12)
    k.point_light(lx + 0.1, r_face + 0.45, h + 0.25, '#ffc880', 14, radius=0.1)
    # coffee
    mx = x1 - 0.3
    k.cyl(mx, r_face + 0.55, h, h + 0.12, 0.055, '#3a2820', 'mug', verts=10)
    k.cyl(mx, r_face + 0.55, h + 0.1, h + 0.115, 0.045, '#2a140a', 'coffee', verts=10)
    k.solid(x0, r_face, x1, r_face + d)
    return (mx, r_face + 0.55, h + 0.12)


def office_chair(k, cx, cr, facing='up'):
    k.cyl(cx, cr, 0.0, 0.04, 0.24, Q_WALL[0], 'chair_base', verts=5)
    k.cyl(cx, cr, 0.04, 0.4, 0.03, '#4a4a52', 'chair_post', verts=6)
    k.box(cx - 0.24, cr - 0.22, 0.4, cx + 0.24, cr + 0.22, 0.48, ('#3a2a40', 0.06), 'chair_seat', bevel=0.03)
    br = cr + 0.2 if facing == 'up' else cr - 0.26
    k.box(cx - 0.22, br, 0.48, cx + 0.22, br + 0.06, 0.98, ('#3a2a40', 0.06), 'chair_back', bevel=0.03)
    k.box(cx - 0.18, br + 0.06, 0.6, cx + 0.18, br + 0.07, 0.62, BRASS_D, 'chair_trim')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def chess_table(k, cx, cr):
    """Round table with a game in progress."""
    k.cyl(cx, cr, 0.66, 0.72, 0.46, (WOOD_D, 0.1), 'chess_table', verts=20)
    k.cyl(cx, cr, 0.72, 0.73, 0.47, BRASS_D, 'chess_trim', verts=20)
    k.cyl(cx, cr, 0.05, 0.66, 0.05, Q_WALL[0], 'table_leg', verts=8)
    k.cyl(cx, cr, 0.0, 0.05, 0.25, Q_WALL[0], 'table_leg', verts=10)
    s = 0.07
    for i in range(8):
        for j in range(8):
            col = '#e8dcc0' if (i + j) % 2 else '#3a2418'
            k.box(cx - 4 * s + i * s, cr - 4 * s + j * s, 0.73, cx - 3 * s + i * s, cr - 3 * s + j * s, 0.74, col, 'board')
    k.box(cx - 4 * s - 0.02, cr - 4 * s - 0.02, 0.725, cx + 4 * s + 0.02, cr + 4 * s + 0.02, 0.733, '#5a3a20', 'board_edge')
    pieces = [(0, 0, 'r', 0), (3, 0, 'k', 0), (4, 1, 'p', 0), (2, 2, 'n', 0), (5, 3, 'p', 0), (1, 1, 'p', 0),
              (4, 7, 'k', 1), (6, 6, 'p', 1), (2, 5, 'p', 1), (5, 5, 'n', 1), (7, 7, 'r', 1), (3, 4, 'q', 1)]
    for (i, j, kind, side) in pieces:
        x = cx - 3.5 * s + i * s
        r = cr - 3.5 * s + j * s
        col = '#f0e8d8' if side else '#2a1a14'
        hgt = {'p': 0.06, 'n': 0.08, 'r': 0.08, 'q': 0.1, 'k': 0.11}[kind]
        k.cyl(x, r, 0.74, 0.755, 0.025, col, 'chess_piece', verts=8)
        k.cone(x, r, 0.755, 0.74 + hgt, 0.02, 0.008, col, 'chess_piece', verts=8)
        k.sphere(x, r, 0.74 + hgt + 0.012, 0.016, 0.016, col, 'chess_piece', segs=6)
    k.solid(cx - 0.5, cr - 0.5, cx + 0.5, cr + 0.5)


def ship_stool(k, cx, cr):
    k.cyl(cx, cr, 0.42, 0.48, 0.19, ('#3a2a40', 0.06), 'stool', verts=14)
    k.cyl(cx, cr, 0.04, 0.42, 0.03, '#4a4a52', 'stool_post', verts=6)
    k.cyl(cx, cr, 0.0, 0.04, 0.16, Q_WALL[0], 'stool_base', verts=10)
    k.solid(cx - 0.25, cr - 0.25, cx + 0.25, cr + 0.25)


def empty_pot(k, cx, cr):
    k.cone(cx, cr, 0, 0.36, 0.17, 0.21, ('#8a4a2a', 0.1), 'pot', verts=14)
    k.cyl(cx, cr, 0.33, 0.37, 0.22, '#9a5a34', 'pot_rim', verts=14)
    k.cyl(cx, cr, 0.3, 0.34, 0.19, '#2a1a10', 'soil', verts=14)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)
    return 0.34


def empty_stand(k, cx, cr):
    k.box(cx - 0.36, cr - 0.28, 0, cx + 0.36, cr + 0.28, 0.42, (Q_WALL[2], 0.05), 'stand', bevel=0.02)
    k.box(cx - 0.38, cr - 0.3, 0.42, cx + 0.38, cr + 0.3, 0.46, (WOOD, 0.1), 'stand_top')
    k.box(cx - 0.3, cr + 0.28, 0.08, cx + 0.3, cr + 0.29, 0.12, '#103038', 'led', emit=(CYAN, 0.5))
    k.solid(cx - 0.4, cr - 0.3, cx + 0.4, cr + 0.3)
    return 0.46


def floor_plate(k, cx, cr):
    k.cyl(cx, cr, 0.0, 0.015, 0.26, ('#3a4050', 0.05), 'floor_plate', verts=16)
    k.cyl(cx, cr, 0.015, 0.02, 0.06, '#103038', 'socket', emit=(CYAN, 0.5), verts=10)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def storage_locker(k, cx, cr):
    x0, x1, r0, r1 = cx - 0.4, cx + 0.4, cr - 0.3, cr + 0.3
    k.box(x0, r0, 0, x1, r1, 1.75, (B_WALL[2], 0.05), 'locker', bevel=0.02)
    k.box(x0 + 0.04, r1, 0.06, cx - 0.01, r1 + 0.02, 1.68, (B_WALL[3], 0.05), 'locker_door')
    k.box(cx + 0.01, r1, 0.06, x1 - 0.04, r1 + 0.02, 1.68, (B_WALL[3], 0.05), 'locker_door')
    for xx in (x0 + 0.08, cx + 0.05):
        for i in range(4):
            z = 1.45 - i * 0.06
            k.box(xx, r1 + 0.02, z, xx + 0.25, r1 + 0.03, z + 0.025, B_WALL[0], 'locker_vent')
        k.box(xx + 0.27, r1 + 0.02, 0.8, xx + 0.31, r1 + 0.04, 1.0, BRASS, 'locker_handle')
    k.box(cx - 0.12, r1 + 0.02, 1.55, cx + 0.12, r1 + 0.03, 1.62, '#e8dcc0', 'locker_label')
    k.box(cx - 0.02, r1 + 0.02, 1.2, cx + 0.02, r1 + 0.04, 1.24, '#40e080', 'locker_led', emit=('#40e080', 1.0))
    k.solid(x0, r0, x1, r1)


def catalog_kiosk(k, cx, cr):
    """Standing catalog terminal: pedestal, angled glowing screen, holo glow."""
    k.box(cx - 0.22, cr - 0.18, 0, cx + 0.22, cr + 0.18, 0.95, (B_WALL[2], 0.05), 'kiosk', bevel=0.02)
    k.box(cx - 0.3, cr - 0.25, 0, cx + 0.3, cr + 0.25, 0.06, B_WALL[1], 'kiosk_base')
    k.box(cx - 0.34, cr - 0.12, 0.95, cx + 0.34, cr + 0.3, 1.02, B_WALL[1], 'kiosk_head')
    k.box(cx - 0.3, cr + 0.02, 1.02, cx + 0.3, cr + 0.28, 1.03, '#2a1840', 'kiosk_screen', emit=('#8060c0', 1.0))
    for i in range(3):
        k.box(cx - 0.24 + i * 0.17, cr + 0.06, 1.03, cx - 0.1 + i * 0.17, cr + 0.2, 1.035, '#c0a0f0', 'kiosk_tile',
              emit=('#c0a0f0', 0.9))
    k.box(cx - 0.18, cr + 0.18, 0.6, cx + 0.18, cr + 0.19, 0.75, '#103038', 'kiosk_led', emit=(CYAN, 0.8))
    k.point_light(cx, cr + 0.5, 1.3, '#a080ff', 8, radius=0.15, group='pulse')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


# ---- catalog decor (each built inside k.variant) ----------------------------------------
def houseplant(k, cx, cr, z):
    for i in range(9):
        a = i * 0.7
        L = 0.28 + 0.08 * (i % 3)
        tip = (cx + math.cos(a) * L * 0.6, cr + math.sin(a) * L * 0.45, z + 0.35 + 0.15 * (i % 2))
        k.tube((cx, cr, z), tip, 0.012, '#3e6a3a', 'stem', verts=4)
        k.blob(tip[0], tip[1], tip[2], 0.11, 0.07, 0.035, ('#4a8a44', 0.12), 'leaf', rot=(0, 20, math.degrees(a)), segs=8)


def bonsai(k, cx, cr, z):
    k.tube((cx, cr, z), (cx + 0.08, cr, z + 0.22), 0.04, WOOD_DD, 'trunk', rb=0.03, verts=6)
    k.tube((cx + 0.08, cr, z + 0.22), (cx - 0.12, cr + 0.02, z + 0.38), 0.03, WOOD_DD, 'trunk', rb=0.018, verts=6)
    for (dx, dz, s) in ((-0.15, 0.42, 0.14), (0.12, 0.33, 0.11), (0.0, 0.5, 0.12), (-0.25, 0.36, 0.09)):
        k.blob(cx + dx, cr, z + dz, s * 1.4, s, s * 0.6, ('#3a6a34', 0.18), 'foliage', segs=10)


def neon_cactus(k, cx, cr, z):
    k.cyl(cx, cr, z, z + 0.42, 0.07, '#1a4a30', 'cactus', emit=('#40e090', 0.6), verts=8)
    k.sphere(cx, cr, z + 0.42, 0.07, 0.05, '#1a4a30', 'cactus', emit=('#40e090', 0.6), segs=8)
    for s in (-1, 1):
        k.tube((cx + s * 0.06, cr, z + 0.18 + 0.05 * s), (cx + s * 0.16, cr, z + 0.2 + 0.05 * s), 0.035, '#1a4a30', 'cactus',
               emit=('#40e090', 0.6), verts=6)
        k.cyl(cx + s * 0.16, cr, z + 0.2 + 0.05 * s, z + 0.36 + 0.05 * s, 0.035, '#1a4a30', 'cactus',
              emit=('#40e090', 0.6), verts=6)
    k.sphere(cx, cr, z + 0.49, 0.03, 0.03, '#e070c0', 'cactus_flower', emit=('#f078a8', 1.0), segs=6)
    k.point_light(cx, cr + 0.25, z + 0.3, '#60f0a0', 3, radius=0.1)


def floor_lamp(k, cx, cr):
    k.cyl(cx, cr, 0.015, 0.05, 0.16, BRASS_D, 'lamp_base', verts=12)
    k.cyl(cx, cr, 0.05, 1.45, 0.018, BRASS, 'lamp_pole', verts=6)
    k.cone(cx, cr, 1.35, 1.62, 0.24, 0.13, ('#e8d8b0', 0.05), 'lamp_shade', emit=('#c09040', 0.35), verts=16)
    k.point_light(cx, cr + 0.1, 1.35, '#ffc880', 18, radius=0.12)


def crystal_lamp(k, cx, cr):
    k.cyl(cx, cr, 0.015, 0.1, 0.13, B_WALL[1], 'lamp_base', verts=8)
    for (dx, dr, h, rad) in ((0.0, 0.0, 0.62, 0.08), (0.07, 0.04, 0.42, 0.055), (-0.07, 0.03, 0.36, 0.05), (0.02, -0.06, 0.3, 0.045)):
        k.cone(cx + dx, cr + dr, 0.1, 0.1 + h, rad, 0.003, '#5a3a9a', 'crystal', emit=('#b090ff', 0.85), verts=6)
    k.point_light(cx, cr + 0.15, 0.6, '#b090ff', 12, radius=0.1)


def driftwood_lamp(k, cx, cr):
    k.tube((cx - 0.12, cr, 0.015), (cx + 0.04, cr, 0.6), 0.05, ('#a08868', 0.15), 'driftwood', rb=0.03, verts=7)
    k.tube((cx + 0.1, cr + 0.03, 0.015), (cx - 0.02, cr, 0.7), 0.04, ('#8a7458', 0.15), 'driftwood', rb=0.025, verts=7)
    k.tube((cx - 0.02, cr, 0.6), (cx + 0.12, cr - 0.02, 0.95), 0.025, ('#a08868', 0.15), 'driftwood', rb=0.015, verts=6)
    k.sphere(cx + 0.12, cr - 0.02, 1.02, 0.08, 0.09, '#fff0c0', 'bulb', emit=(WARM, 1.0), segs=10)
    k.point_light(cx + 0.12, cr + 0.1, 1.0, '#ffc070', 12, radius=0.1)


def holo_poster(k, cx, r_face, z0=1.0, w=0.75, h=0.95):
    k.box(cx - w / 2 - 0.04, r_face, z0 - 0.04, cx + w / 2 + 0.04, r_face + 0.05, z0 + h + 0.04, '#1a1a24', 'poster_frame')
    k.box(cx - w / 2, r_face + 0.05, z0, cx + w / 2, r_face + 0.06, z0 + h, '#1a1040', 'poster', emit=('#3a2a80', 0.8))
    k.cyl_y(cx, r_face + 0.06, r_face + 0.07, z0 + h * 0.62, 0.2, 0.2, '#e070c0', 'poster_planet', emit=('#f078a8', 0.9), verts=18)
    k.cyl_y(cx, r_face + 0.065, r_face + 0.075, z0 + h * 0.62, 0.3, 0.05, '#80e0e8', 'poster_ring', emit=(CYAN_L, 0.9), verts=18)
    for i in range(3):
        k.box(cx - w / 2 + 0.1, r_face + 0.065, z0 + 0.1 + i * 0.08, cx + w / 2 - 0.1 - i * 0.12, r_face + 0.07, z0 + 0.13 + i * 0.08,
              '#80e0e8', 'poster_text', emit=(CYAN_L, 0.8))
    k.point_light(cx, r_face + 0.6, z0 + h * 0.5, '#a070e0', 5, radius=0.2, group='pulse')


def arcade_marquee(k, cx, r_face, z0=1.25, w=0.85, h=0.45):
    k.box(cx - w / 2 - 0.05, r_face, z0 - 0.05, cx + w / 2 + 0.05, r_face + 0.12, z0 + h + 0.05, '#1a1a24', 'marquee_box')
    k.box(cx - w / 2, r_face + 0.12, z0, cx + w / 2, r_face + 0.13, z0 + h, '#3a1040', 'marquee', emit=('#a040c0', 0.9))
    for i, col in enumerate(('#f078a8', '#5cc8d0', '#e8c040', '#f078a8', '#5cc8d0')):
        x = cx - w / 2 + 0.1 + i * (w - 0.2) / 4
        k.box(x - 0.05, r_face + 0.13, z0 + 0.12, x + 0.05, r_face + 0.14, z0 + 0.33, col, 'marquee_letter', emit=(col, 1.0))
    k.point_light(cx, r_face + 0.6, z0 + 0.2, '#e070c0', 6, radius=0.2, group='pulse')


def nebula_tank(k, cx, cr, z):
    k.box(cx - 0.32, cr - 0.22, z, cx + 0.32, cr + 0.22, z + 0.05, '#1a1a24', 'tank_base')
    k.box(cx - 0.3, cr - 0.2, z + 0.05, cx + 0.3, cr + 0.2, z + 0.6, '#1a1040', 'tank_glass', emit=('#3a2070', 0.6))
    for (dx, dz, s, col) in ((-0.1, 0.25, 0.12, '#c060e0'), (0.08, 0.38, 0.1, '#40c8d8'), (0.0, 0.18, 0.08, '#f078a8'),
                             (0.15, 0.22, 0.06, '#8060f0')):
        k.blob(cx + dx, cr + 0.12, z + dz, s * 1.4, 0.06, s, col, 'nebula', emit=(col, 0.9), rot=(0, 25, 0), segs=10)
    for _ in range(8):
        k.sphere(cx + k.rng.uniform(-0.25, 0.25), cr + 0.205, z + k.rng.uniform(0.1, 0.55), 0.01, 0.01, '#ffffff', 'tank_star',
                 emit=('#ffffff', 1.0), segs=4)
    k.box(cx - 0.32, cr - 0.22, z + 0.6, cx + 0.32, cr + 0.22, z + 0.64, '#1a1a24', 'tank_lid')
    k.point_light(cx, cr + 0.4, z + 0.4, '#a060e0', 10, radius=0.15, group='pulse')


def retro_crt(k, cx, cr, z):
    k.box(cx - 0.3, cr - 0.25, z, cx + 0.3, cr + 0.22, z + 0.5, ('#c8bca0', 0.05), 'crt', bevel=0.03)
    k.box(cx - 0.24, cr + 0.22, z + 0.07, cx + 0.16, cr + 0.23, z + 0.43, '#0a2a1a', 'crt_screen', emit=('#2a8a4a', 0.9))
    for i in range(4):
        k.box(cx - 0.2, cr + 0.23, z + 0.12 + i * 0.07, cx + 0.12 - 0.06 * (i % 2), cr + 0.235, z + 0.14 + i * 0.07,
              '#80f0a0', 'crt_text', emit=('#80f0a0', 1.0))
    for i in range(2):
        k.cyl_y(cx + 0.23, cr + 0.22, cr + 0.25, z + 0.35 - i * 0.12, 0.03, 0.03, '#3a3a40', 'crt_knob', verts=8)
    k.tube((cx - 0.05, cr - 0.1, z + 0.5), (cx - 0.2, cr - 0.15, z + 0.78), 0.008, '#4a4a52', 'antenna', verts=4)
    k.tube((cx + 0.05, cr - 0.1, z + 0.5), (cx + 0.22, cr - 0.12, z + 0.76), 0.008, '#4a4a52', 'antenna', verts=4)
    k.point_light(cx, cr + 0.5, z + 0.3, '#60e080', 6, radius=0.15, group='pulse')


def glass_float(k, cx, r, z):
    k.sphere(cx, r, z + 0.12, 0.12, 0.12, '#2a6a5a', 'glass_float', emit=('#2a8a7a', 0.5), segs=12)
    for a in (0.3, 1.2, 2.1):
        k.tube((cx + math.cos(a) * 0.12, r, z + 0.04), (cx + math.cos(a) * 0.12, r, z + 0.22), 0.006, '#a08a60', 'net', verts=4)
    k.sphere(cx - 0.04, r + 0.08, z + 0.17, 0.025, 0.025, '#ffffff', 'glint', emit=('#e0fff8', 1.0), segs=6)


def kelp_canister(k, cx, r, z):
    k.cyl(cx, r, z, z + 0.04, 0.09, BRASS, 'canister_cap', verts=12)
    k.cyl(cx, r, z + 0.04, z + 0.36, 0.085, '#1a3a30', 'canister', emit=('#2a6a50', 0.6), verts=12)
    for dx in (-0.03, 0.02, 0.05):
        k.tube((cx + dx, r + 0.05, z + 0.05), (cx + dx * 1.5, r + 0.06, z + 0.33), 0.012, '#4ac080', 'kelp',
               emit=('#4ac080', 0.8), verts=4)
    k.cyl(cx, r, z + 0.36, z + 0.4, 0.09, BRASS, 'canister_cap', verts=12)
    k.point_light(cx, r + 0.3, z + 0.2, '#40e0a0', 3, radius=0.08, group='pulse')


def brass_compass(k, cx, r, z):
    k.cyl(cx, r, z, z + 0.04, 0.15, BRASS_D, 'compass', verts=18)
    k.cyl(cx, r, z + 0.04, z + 0.045, 0.13, '#e8dcc0', 'compass_face', verts=18)
    k.box(cx - 0.01, r - 0.11, z + 0.045, cx + 0.01, r + 0.0, z + 0.05, '#c02a2a', 'needle')
    k.box(cx - 0.01, r, z + 0.045, cx + 0.01, r + 0.11, z + 0.05, '#2a2a30', 'needle')
    k.cyl(cx, r, z + 0.045, z + 0.06, 0.02, BRASS, 'compass_pin', verts=8)
    k.cyl_y(cx, r - 0.02, r + 0.02, z + 0.19, 0.035, 0.035, BRASS, 'compass_ring', verts=10)


def cosmic_soda(k, cx, r, z):
    k.cyl(cx, r, z, z + 0.24, 0.05, '#3a1a5a', 'soda', emit=('#7040b0', 0.6), verts=10)
    k.cone(cx, r, z + 0.24, z + 0.32, 0.05, 0.02, '#3a1a5a', 'soda', emit=('#7040b0', 0.6), verts=10)
    k.cyl(cx, r, z + 0.32, z + 0.34, 0.022, '#c0c0c8', 'soda_cap', verts=8)
    k.box(cx - 0.04, r + 0.045, z + 0.08, cx + 0.04, r + 0.055, z + 0.16, '#e8c040', 'soda_label', emit=('#e8c040', 0.7))
    for dz in (0.12, 0.2):
        k.sphere(cx + 0.02, r + 0.03, z + dz, 0.008, 0.008, '#ffffff', 'fizz', emit=('#ffffff', 1.0), segs=4)


# ---- trophies (on cabinet pedestals) ------------------------------------------------------
def trophy_star(k, cx, r, z):
    k.cyl(cx, r, z, z + 0.18, 0.012, BRASS, 'trophy', verts=6)
    for i in range(5):
        a = math.pi / 2 + i * 2 * math.pi / 5
        k.tube((cx, r, z + 0.3), (cx + math.cos(a) * 0.14, r, z + 0.3 + math.sin(a) * 0.14), 0.035, '#fff0a0', 'star',
               rb=0.004, verts=4)
    k.sphere(cx, r, z + 0.3, 0.05, 0.05, '#fff0a0', 'star', emit=(WARM, 0.9), segs=8)
    k.point_light(cx, r + 0.25, z + 0.3, '#ffe080', 3, radius=0.08)


def trophy_cabinet_mini(k, cx, r, z):
    k.box(cx - 0.09, r - 0.08, z, cx + 0.09, r + 0.08, z + 0.32, '#3a1040', 'mini_cab')
    k.box(cx - 0.07, r + 0.08, z + 0.17, cx + 0.07, r + 0.09, z + 0.28, '#1a2a50', 'mini_screen', emit=('#5cc8d0', 0.9))
    k.box(cx - 0.09, r + 0.0, z + 0.12, cx + 0.09, r + 0.12, z + 0.15, '#2a1a30', 'mini_panel')
    k.box(cx - 0.09, r - 0.08, z + 0.3, cx + 0.09, r + 0.09, z + 0.36, '#f078a8', 'mini_marquee', emit=('#f078a8', 0.9))


def trophy_compass(k, cx, r, z):
    k.cyl(cx, r, z, z + 0.05, 0.06, BRASS_D, 'astrolabe', verts=8)
    k.cyl_y(cx, r - 0.01, r + 0.01, z + 0.2, 0.15, 0.15, BRASS, 'astrolabe', verts=18)
    k.cyl_y(cx, r - 0.015, r + 0.015, z + 0.2, 0.12, 0.12, '#2a2018', 'astrolabe_in', verts=18)
    k.tube((cx - 0.12, r + 0.02, z + 0.2), (cx + 0.12, r + 0.02, z + 0.2), 0.01, BRASS, 'astrolabe', verts=4)
    k.tube((cx, r + 0.02, z + 0.08), (cx, r + 0.02, z + 0.32), 0.01, BRASS, 'astrolabe', verts=4)
    k.sphere(cx, r + 0.03, z + 0.2, 0.03, 0.03, '#40c8d8', 'astrolabe_gem', emit=(CYAN, 0.9), segs=6)


def trophy_chair(k, cx, r, z):
    k.box(cx - 0.1, r - 0.08, z + 0.08, cx + 0.1, r + 0.08, z + 0.12, '#a03a2e', 'mini_chair')
    k.box(cx - 0.1, r - 0.08, z + 0.12, cx + 0.1, r - 0.04, z + 0.3, '#a03a2e', 'mini_chair')
    for s in (-1, 1):
        k.box(cx + s * 0.1 - 0.02, r - 0.08, z + 0.12, cx + s * 0.1 + 0.02, r + 0.08, z + 0.19, '#8a2a20', 'mini_chair')
    for (dx, dr) in ((-0.08, -0.06), (0.06, -0.06), (-0.08, 0.05), (0.06, 0.05)):
        k.box(cx + dx, r + dr, z, cx + dx + 0.02, r + dr + 0.02, z + 0.08, WOOD_D, 'mini_chair_leg')


def trophy_books(k, cx, r, z):
    for i, (col, h) in enumerate((('#6a2a2a', 0.05), ('#2a4a3a', 0.045), ('#3a3a6a', 0.05), ('#7a5a2a', 0.04))):
        zz = z + sum(hh for _, hh in (('', 0.05), ('', 0.045), ('', 0.05), ('', 0.04))[:i])
        off = (i % 2) * 0.02 - 0.01
        k.box(cx - 0.12 + off, r - 0.08, zz, cx + 0.12 + off, r + 0.08, zz + h, col, 'book')
        k.box(cx - 0.11 + off, r + 0.08, zz + 0.008, cx + 0.11 + off, r + 0.082, zz + h - 0.008, '#e8dcc0', 'book_pages')
    k.cyl(cx + 0.02, r, z + 0.185, z + 0.2, 0.04, BRASS, 'book_medal', verts=10)


# ---- bridge ------------------------------------------------------------------------------
def _quad_off(pts, n, d):
    return [(p[0] + n[0] * d, p[1] + n[1] * d, p[2] + n[2] * d) for p in pts]


def console(k, cx, cr, w=1.8, screen='#1a5a68', screen_emit=CYAN, label=None):
    """Bridge workstation facing the camera: cabinet, desk with button
    banks, and a big slanted screen rising off the back of the desk."""
    d = 0.8
    x0, x1 = cx - w / 2, cx + w / 2
    r0, r1 = cr - d / 2, cr + d / 2
    k.box(x0 + 0.05, r0, 0, x1 - 0.05, r1 - 0.1, 0.72, (B_WALL[2], 0.05), 'console', bevel=0.02)
    k.box(x0 + 0.05, r1 - 0.1, 0.0, x1 - 0.05, r1 - 0.08, 0.08, '#103038', 'led', emit=(screen_emit, 0.6))
    k.box(x0, r0, 0.72, x1, r1, 0.8, (B_WALL[1], 0.05), 'console_top', bevel=0.015)
    k.box(x0, r1 - 0.01, 0.73, x1, r1 + 0.01, 0.77, B_WALL[3], 'console_edge')
    # slanted screen: rises from mid-desk to the back, facing up toward the camera
    zb, zt, rb, rt = 0.8, 1.35, r0 + 0.42, r0 + 0.04
    L = math.hypot(rb - rt, zt - zb)
    n = (0.0, (zt - zb) / L, (rb - rt) / L)   # (x, row, z): the screen faces the camera and up
    quad = [(x0 + 0.1, rb, zb), (x1 - 0.1, rb, zb), (x1 - 0.1, rt, zt), (x0 + 0.1, rt, zt)]
    k.poly(_quad_off([(x0 + 0.04, rb + 0.02, zb - 0.01), (x1 - 0.04, rb + 0.02, zb - 0.01), (x1 - 0.04, rt - 0.02, zt + 0.04),
                      (x0 + 0.04, rt - 0.02, zt + 0.04)], n, -0.02), B_WALL[0], 'console_bezel')
    k.box(x0 + 0.06, rt - 0.06, zb, x1 - 0.06, rt + 0.02, zt + 0.02, B_WALL[0], 'console_bezel')
    k.poly(quad, '#0a2028', 'screen', emit=(screen, 1.0))
    # readouts on the screen
    for i in range(5):
        t = 0.15 + i * 0.16
        ln = k.rng.uniform(0.3, 0.8) * (w - 0.4)
        ra, za = rb + (rt - rb) * t, zb + (zt - zb) * t
        rb2, zb2 = rb + (rt - rb) * (t + 0.06), zb + (zt - zb) * (t + 0.06)
        k.poly(_quad_off([(x0 + 0.2, ra, za), (x0 + 0.2 + ln, ra, za), (x0 + 0.2 + ln, rb2, zb2), (x0 + 0.2, rb2, zb2)], n, 0.006),
               '#0a2028', 'screen_text', emit=(screen_emit, 0.95))
    gx = x1 - 0.42   # a little gauge in the corner
    for i in range(10):
        a = i * math.pi / 5
        t0 = 0.55 + 0.2 * math.sin(a)
        k.poly(_quad_off([(gx + 0.15 * math.cos(a), rb + (rt - rb) * t0, zb + (zt - zb) * t0),
                          (gx + 0.15 * math.cos(a + 0.4), rb + (rt - rb) * (0.55 + 0.2 * math.sin(a + 0.4)),
                           zb + (zt - zb) * (0.55 + 0.2 * math.sin(a + 0.4))),
                          (gx, rb + (rt - rb) * 0.55, zb + (zt - zb) * 0.55)], n, 0.004),
               '#0a2028', 'gauge', emit=(LED_Y if i < 3 else screen_emit, 0.8))
    # button banks along the front of the desk
    x = x0 + 0.14
    while x < x1 - 0.12:
        col = k.rng.choice([CYAN, LED_Y, LED_R, CYAN, '#40e080'])
        k.box(x - 0.035, r1 - 0.24, 0.8, x + 0.035, r1 - 0.16, 0.82, col, 'button', emit=(col, 0.9))
        k.box(x - 0.04, r1 - 0.12, 0.8, x + 0.04, r1 - 0.05, 0.815, '#2a3038', 'key')
        x += 0.13
    k.point_light(cx, r1 + 0.5, 1.2, screen_emit, 10, radius=0.3, group='pulse')
    k.solid(x0, r0, x1, r1)


def holo_pedestal(k, cx, cr, rad=0.85):
    """Round projector the engine's hologram rises from."""
    k.cyl(cx, cr, 0, 0.12, rad + 0.15, (B_WALL[1], 0.05), 'pedestal_base', verts=24)
    k.cyl(cx, cr, 0.12, 0.42, rad, (B_WALL[2], 0.05), 'pedestal', verts=24)
    k.cyl(cx, cr, 0.42, 0.48, rad + 0.05, B_WALL[3], 'pedestal_rim', verts=24)
    k.cyl(cx, cr, 0.48, 0.5, rad - 0.1, '#0c1c24', 'emitter', verts=24)
    for i in range(3):
        k.cyl(cx, cr, 0.5 + i * 0.012, 0.512 + i * 0.012, rad - 0.2 - i * 0.18, '#0c2028', 'emitter_ring',
              emit=(CYAN, 0.45 + 0.15 * i), verts=24)
        k.cyl(cx, cr, 0.505 + i * 0.012, 0.515 + i * 0.012, rad - 0.28 - i * 0.18, '#0c1c24', 'emitter', verts=24)
    k.cyl(cx, cr, 0.54, 0.56, 0.1, '#0a2028', 'emitter_core', emit=(CYAN_L, 0.9), verts=12)
    for i in range(12):
        a = i * math.pi / 6
        k.box(cx + math.cos(a) * rad - 0.03, cr + math.sin(a) * rad - 0.03, 0.2, cx + math.cos(a) * rad + 0.03,
              cr + math.sin(a) * rad + 0.03, 0.34, '#103038', 'pedestal_led', emit=(CYAN, 0.7))
    k.point_light(cx, cr + 0.3, 1.1, CYAN, 30, radius=0.5, group='pulse')
    k.solid(cx - rad, cr - rad * 0.6, cx + rad, cr + rad * 0.6)


def captain_chair(k, cx, cr):
    """High-backed leather command chair facing the viewport (back to the
    camera): brass piping, glowing arm panels, a headrest."""
    leather = ('#5a3624', 0.08)
    k.cyl(cx, cr, 0, 0.08, 0.42, B_WALL[2], 'chair_base', verts=14)
    k.cyl(cx, cr, 0.1, 0.42, 0.08, B_WALL[3], 'chair_post', verts=10)
    k.box(cx - 0.46, cr - 0.36, 0.42, cx + 0.46, cr + 0.32, 0.62, leather, 'captain_seat', bevel=0.05)
    k.box(cx - 0.44, cr + 0.16, 0.62, cx + 0.44, cr + 0.36, 1.55, leather, 'captain_back', bevel=0.06)
    k.box(cx - 0.26, cr + 0.2, 1.55, cx + 0.26, cr + 0.36, 1.85, leather, 'captain_headrest', bevel=0.06)
    k.box(cx - 0.36, cr + 0.36, 0.7, cx + 0.36, cr + 0.38, 1.5, ('#3a2418', 0.08), 'captain_back_pad')
    for z in (0.95, 1.2):
        k.box(cx - 0.36, cr + 0.375, z, cx + 0.36, cr + 0.385, z + 0.02, '#120c08', 'captain_tuft')
    for s_ in (-1, 1):
        k.box(cx + s_ * 0.46 - 0.08, cr - 0.34, 0.62, cx + s_ * 0.46 + 0.08, cr + 0.28, 0.86, leather, 'captain_arm', bevel=0.04)
        k.box(cx + s_ * 0.46 - 0.06, cr - 0.32, 0.86, cx + s_ * 0.46 + 0.06, cr - 0.05, 0.875, '#0c2028', 'arm_panel',
              emit=(CYAN, 0.8))
        k.box(cx + s_ * 0.46 - 0.04, cr - 0.28, 0.875, cx + s_ * 0.46 + 0.0, cr - 0.24, 0.885, LED_Y, 'arm_button', emit=(LED_Y, 0.9))
        k.box(cx + s_ * 0.44 - 0.012, cr + 0.36, 0.62, cx + s_ * 0.44 + 0.012, cr + 0.39, 1.56, BRASS, 'brass_piping')
    k.box(cx - 0.45, cr + 0.36, 1.53, cx + 0.45, cr + 0.39, 1.56, BRASS, 'brass_piping')
    k.box(cx - 0.27, cr + 0.36, 1.83, cx + 0.27, cr + 0.39, 1.86, BRASS, 'brass_piping')
    k.solid(cx - 0.45, cr - 0.35, cx + 0.45, cr + 0.35)


def hazard_stripes(k, x0, x1, r0, r1):
    k.box(x0, r0, 0.0, x1, r1, 0.006, '#1a1a1a', 'hazard')
    x = x0
    while x < x1:
        k.bar(x, r1, min(x1, x + 0.18), r0, 0.006, 0.01, 0.07, '#d8b020', 'hazard_stripe')
        x += 0.25


def floor_grate(k, x0, r0, x1, r1):
    k.box(x0, r0, -0.005, x1, r1, 0.002, '#060a10', 'grate_hole')
    x = x0 + 0.06
    while x < x1:
        k.box(x, r0, 0.0, x + 0.03, r1, 0.008, '#3a4050', 'grate')
        x += 0.1
    k.box(x0 - 0.03, r0 - 0.03, 0.0, x1 + 0.03, r0, 0.01, '#3a4050', 'grate_frame')
    k.box(x0 - 0.03, r1, 0.0, x1 + 0.03, r1 + 0.03, 0.01, '#3a4050', 'grate_frame')


def conduit(k, pts, w=0.16):
    """Armoured cable run along the deck."""
    for a, b in zip(pts, pts[1:]):
        k.bar(a[0], a[1], b[0], b[1], 0.0, 0.05, w, ('#1a2028', 0.06), 'conduit', bevel=0.015)
        k.bar(a[0], a[1], b[0], b[1], 0.05, 0.056, 0.03, '#103038', 'conduit_led', emit=(CYAN, 0.25))


def deck_ring(k, cx, cr, rad, col=CYAN, ticks=16):
    """Glowing ring inlaid in the deck around the holo pedestal."""
    for rr, w in ((rad, 0.045), (rad + 0.18, 0.025)):
        n = 40
        for i in range(n):
            a0, a1 = i * 2 * math.pi / n, (i + 1) * 2 * math.pi / n
            k.bar(cx + math.cos(a0) * rr, cr + math.sin(a0) * rr, cx + math.cos(a1) * rr, cr + math.sin(a1) * rr,
                  0.0, 0.008, w, '#0c2a30', 'deck_ring', emit=(col, 0.7))
    for i in range(ticks):
        a = i * 2 * math.pi / ticks
        k.bar(cx + math.cos(a) * (rad + 0.04), cr + math.sin(a) * (rad + 0.04), cx + math.cos(a) * (rad + 0.16),
              cr + math.sin(a) * (rad + 0.16), 0.0, 0.008, 0.025, '#0c2a30', 'deck_ring', emit=(col, 0.7))


def dashboard(k, x0, x1, r_face, depth=0.45, h=0.62):
    """Long low instrument bank under the viewport."""
    k.box(x0, r_face, 0, x1, r_face + depth, h, (B_WALL[2], 0.05), 'dash')
    k.box(x0 - 0.02, r_face, h, x1 + 0.02, r_face + depth + 0.03, h + 0.05, (B_WALL[1], 0.05), 'dash_top')
    k.box(x0, r_face + depth, 0.1, x1, r_face + depth + 0.02, 0.14, '#103038', 'led', emit=(CYAN, 0.6))
    x = x0 + 0.15
    while x < x1 - 0.15:
        kind = k.rng.random()
        if kind < 0.5:
            col = k.rng.choice([CYAN, LED_Y, LED_R, '#40e080', CYAN])
            k.box(x - 0.03, r_face + 0.15, h + 0.05, x + 0.03, r_face + 0.22, h + 0.065, col, 'button', emit=(col, 0.9))
        elif kind < 0.75:
            k.box(x - 0.12, r_face + 0.08, h + 0.05, x + 0.12, r_face + 0.32, h + 0.06, '#0c2a30', 'dash_screen',
                  emit=('#1a5a68', 0.9))
            x += 0.1
        else:
            k.cyl(x, r_face + 0.22, h + 0.05, h + 0.07, 0.06, B_WALL[3], 'dial', verts=10)
        x += k.rng.uniform(0.14, 0.24)
    k.solid(x0, r_face, x1, r_face + depth)


def sofa(k, x0, x1, cr, tone='#4a3a5a', throw=PURPLE[1]):
    """Low sofa facing the viewport (its back toward the camera), a throw
    blanket over the back and cushions."""
    d = 0.8
    r0, r1 = cr - d / 2, cr + d / 2
    k.box(x0, r0, 0.06, x1, r1, 0.4, (tone, 0.06), 'sofa', bevel=0.04)
    k.box(x0, r1 - 0.22, 0.4, x1, r1, 0.88, (shade(tone, 0.85), 0.06), 'sofa_back', bevel=0.05)
    for xx in (x0, x1 - 0.18):
        k.box(xx, r0, 0.4, xx + 0.18, r1, 0.62, (shade(tone, 0.9), 0.06), 'sofa_arm', bevel=0.04)
    for i in range(2):
        cx = x0 + 0.2 + (i + 0.5) * (x1 - x0 - 0.4) / 2
        k.box(cx - (x1 - x0 - 0.5) / 4, r0 + 0.05, 0.4, cx + (x1 - x0 - 0.5) / 4, r1 - 0.24, 0.5, (shade(tone, 1.12), 0.06),
              'sofa_cushion', bevel=0.04)
    k.box(x0 + 0.5, r1 - 0.24, 0.62, x0 + 1.3, r1 + 0.04, 0.9, (throw, 0.1), 'throw', bevel=0.03)
    k.box(x0 + 0.5, r1 + 0.02, 0.35, x0 + 1.3, r1 + 0.06, 0.9, (throw, 0.1), 'throw')
    k.blob(x1 - 0.45, r1 - 0.32, 0.6, 0.18, 0.08, 0.14, ('#c8a050', 0.08), 'pillow', segs=10)
    for xx in (x0 + 0.06, x1 - 0.12):
        for rr in (r0 + 0.06, r1 - 0.12):
            k.box(xx, rr, 0, xx + 0.06, rr + 0.06, 0.06, BRASS_D, 'sofa_foot')
    k.solid(x0, r0, x1, r1)


def coffee_table(k, cx, cr, w=0.9, d=0.5):
    k.box(cx - w / 2, cr - d / 2, 0.36, cx + w / 2, cr + d / 2, 0.42, (WOOD, 0.1), 'coffee_table', bevel=0.015)
    k.box(cx - w / 2 + 0.05, cr - d / 2 + 0.05, 0.0, cx + w / 2 - 0.05, cr + d / 2 - 0.05, 0.05, Q_WALL[1], 'coffee_table_base')
    k.box(cx - 0.05, cr - 0.05, 0.05, cx + 0.05, cr + 0.05, 0.36, BRASS_D, 'coffee_table_leg')
    k.box(cx - 0.32, cr - 0.12, 0.42, cx - 0.05, cr + 0.1, 0.46, '#6a2a2a', 'book')
    k.box(cx - 0.31, cr - 0.11, 0.46, cx - 0.07, cr + 0.09, 0.47, '#e8dcc0', 'book_pages')
    k.cyl(cx + 0.2, cr, 0.42, 0.52, 0.05, '#e8e0d0', 'mug', verts=10)
    k.cyl(cx + 0.2, cr, 0.505, 0.515, 0.04, '#5a2a10', 'tea', verts=10)
    k.solid(cx - w / 2, cr - d / 2, cx + w / 2, cr + d / 2)


def pouf(k, cx, cr, col='#2a5a6a'):
    k.cyl(cx, cr, 0, 0.32, 0.26, (col, 0.08), 'pouf', verts=16, bevel=0.04)
    k.cyl(cx, cr, 0.3, 0.34, 0.2, shade(col, 1.15), 'pouf_top', verts=16)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def flight_kit(k, x, r):
    """Boots and a duffel bag left by the bunk."""
    for dx in (0.0, 0.16):
        k.box(x + dx, r, 0, x + dx + 0.12, r + 0.26, 0.08, '#2a1a10', 'boot', bevel=0.02)
        k.box(x + dx, r, 0.08, x + dx + 0.12, r + 0.1, 0.3, '#3a2414', 'boot', bevel=0.02)
    k.blob(x + 0.75, r + 0.12, 0.16, 0.38, 0.17, 0.16, ('#3a4a3a', 0.08), 'duffel', segs=12)
    k.tube((x + 0.5, r + 0.12, 0.3), (x + 1.0, r + 0.12, 0.3), 0.015, '#1a1a1a', 'duffel_strap', verts=4)


# ---- the shuttle ------------------------------------------------------------------
HULL = '#cfcabd'
HULL_D = '#9a968c'
STRIPE = '#2a8a8a'


def _shuttle_ring(x, rc, hw, hh, zc, n=14):
    """Squarish (superellipse) hull section at x."""
    ring = []
    for i in range(n):
        a = 2 * math.pi * i / n
        c, s = math.cos(a), math.sin(a)
        ring.append((x, rc + hw * math.copysign(abs(c) ** 0.6, c), zc + hh * math.copysign(abs(s) ** 0.6, s)))
    return ring


IVORY = '#e8dcc0'
IVORY_D = '#b4a684'
GOLD = '#c8a040'
GOLD_D = '#8a6a28'
RUNE = '#40e0d0'
AETHER = '#8a7aff'
INDIGO = '#22304a'
INDIGO_D = '#161f33'


def _ring(x, rc, hw, h_top, h_bot, zc, n=16, p=0.8):
    """Hull section at x: a rounded top of height h_top over a deeper keel h_bot."""
    ring = []
    for i in range(n):
        a = 2 * math.pi * i / n
        c, s_ = math.cos(a), math.sin(a)
        hh = h_top if s_ >= 0 else h_bot
        ring.append((x, rc + hw * math.copysign(abs(c) ** p, c), zc + hh * math.copysign(abs(s_) ** p, s_)))
    return ring


def _along(prof, t):
    """Interpolate a hull profile [(t, ...)] at t."""
    for a, b in zip(prof, prof[1:]):
        if a[0] <= t <= b[0]:
            f = (t - a[0]) / (b[0] - a[0])
            return tuple(a[i] + (b[i] - a[i]) * f for i in range(1, len(a)))
    return tuple(prof[-1][1:])


def _trace(k, pts, rad, col, part, emit=None):
    for a, b in zip(pts, pts[1:]):
        k.tube(a, b, rad, col, part, emit=emit, verts=5)


def shuttle(k, x0, rc, length=3.4, ramp=True, landed=True, hull=IVORY, trim=GOLD):
    """The pilot's skiff, broadside with its nose to the right: an ivory
    hull with gold filigree and a band of glowing runes, a needle nose and
    bubble canopy, forward-swept crescent wings, two long nacelles with
    aether rings, a swept dorsal fin, gold landing claws and (ramp=True)
    the side hatch open with its ramp down. Returns its footprint."""
    L = length
    # (t, half-beam, top, keel, centre z) along the hull, tail → nose
    prof = [(0.0, 0.34, 0.24, 0.28, 0.84), (0.1, 0.5, 0.32, 0.38, 0.86), (0.35, 0.56, 0.36, 0.42, 0.87),
            (0.6, 0.47, 0.32, 0.36, 0.84), (0.78, 0.3, 0.24, 0.26, 0.8), (0.9, 0.16, 0.14, 0.14, 0.77),
            (0.98, 0.05, 0.05, 0.05, 0.75), (1.0, 0.012, 0.012, 0.012, 0.75)]
    k.loft([_ring(x0 + t * L, rc, hw, ht, hb, zc) for (t, hw, ht, hb, zc) in prof], (hull, 0.05), 'skiff_hull', closed=True)
    k.cyl_x(x0 - 0.03, x0 + 0.02, rc, 0.84, 0.34, 0.27, (IVORY_D, 0.05), 'skiff_tail', verts=16)
    k.tube((x0 + L, rc, 0.75), (x0 + L + 0.38, rc, 0.76), 0.022, trim, 'skiff_needle', rb=0.004, verts=6)
    # gold filigree and the rune band, both flanks
    for side in (1, -1):
        lo, hi, runes = [], [], []
        for i in range(19):
            t = 0.04 + i * 0.86 / 18
            hw, ht, hb, zc = _along(prof, t)
            x = x0 + t * L
            lo.append((x, rc + side * hw * 1.0, zc - 0.04))
            hi.append((x, rc + side * hw * 0.84, zc + ht * 0.62))
        _trace(k, lo, 0.018, trim, 'skiff_gold')
        _trace(k, hi, 0.014, trim, 'skiff_gold')
        t = 0.12
        while t < 0.72:
            hw, ht, hb, zc = _along(prof, t)
            x, r = x0 + t * L, rc + side * hw * 0.97
            z = zc + ht * 0.28
            g = int(t * 97) % 3
            if g == 0:
                k.box(x - 0.04, r - 0.01, z - 0.03, x + 0.04, r + 0.01, z + 0.03, '#0a2a2a', 'skiff_rune', emit=(RUNE, 0.85))
            elif g == 1:
                k.box(x - 0.01, r - 0.01, z - 0.06, x + 0.01, r + 0.01, z + 0.06, '#0a2a2a', 'skiff_rune', emit=(RUNE, 0.85))
            else:
                k.sphere(x, r, z, 0.025, 0.025, '#0a2a2a', 'skiff_rune', emit=(RUNE, 0.85), segs=6)
            t += 0.055
    # bubble canopy with a gold spine over it
    ct = 0.64
    hw, ht, hb, zc = _along(prof, ct)
    k.blob(x0 + ct * L, rc, zc + ht * 0.72, 0.46, 0.3, 0.2, '#0c1822', 'skiff_canopy', emit=('#1e4a5a', 0.18), segs=16)
    k.blob(x0 + (ct + 0.04) * L, rc + 0.12, zc + ht * 0.95, 0.14, 0.06, 0.04, '#7ab0c0', 'skiff_glint', emit=('#c0f0ff', 0.6), segs=8)
    _trace(k, [(x0 + (ct - 0.14) * L, rc, zc + ht * 0.8), (x0 + ct * L, rc, zc + ht + 0.06),
               (x0 + (ct + 0.13) * L, rc, zc + ht * 0.5)], 0.022, trim, 'skiff_spine')
    # crescent wings, swept forward, a gold leading edge and a glowing trailing edge
    for side, nav in ((1, '#40e070'), (-1, '#e04040')):
        secs = [(0.45, 0.25, 0.55, 0.72, 0.06), (1.0, 0.33, 0.58, 0.63, 0.045), (1.45, 0.47, 0.62, 0.68, 0.03)]
        rings = []
        for (rr, ta, tb, z, th) in secs:
            rings.append([(x0 + ta * L, rc + side * rr, z), (x0 + tb * L, rc + side * rr, z),
                          (x0 + tb * L, rc + side * rr, z + th), (x0 + ta * L, rc + side * rr, z + th)])
        k.loft(rings, (hull, 0.05), 'skiff_wing', closed=True, smooth=False)
        _trace(k, [(x0 + sb[2] * L, rc + side * sb[0], sb[3] + sb[4] / 2) for sb in secs], 0.022, trim, 'skiff_wing_edge')
        _trace(k, [(x0 + sb[1] * L, rc + side * sb[0], sb[3] + sb[4] / 2) for sb in secs], 0.016, '#0a2a2a',
               'skiff_wing_glow', emit=(RUNE, 0.7))
        tip = (x0 + 0.55 * L, rc + side * 1.5, 0.7)
        k.tube(tip, (tip[0] - 0.12, tip[1] + side * 0.05, 1.05), 0.03, trim, 'skiff_finlet', rb=0.01, verts=6)
        k.sphere(tip[0] - 0.12, tip[1] + side * 0.05, 1.07, 0.05, 0.05, shade(nav, 0.5), 'skiff_navlight', emit=(nav, 1.0), segs=8)
    # nacelles: long, tapering to gold cones forward, aether rings and a violet core aft
    for side in (1, -1):
        er = rc + side * 0.62
        nz = 0.62
        nac = [(-0.16, 0.12), (-0.1, 0.17), (0.12, 0.2), (0.4, 0.18), (0.52, 0.12), (0.6, 0.02)]
        k.loft([[(x0 + t * L, er + rad * math.cos(2 * math.pi * i / 12), nz + rad * math.sin(2 * math.pi * i / 12)) for i in range(12)]
                for (t, rad) in nac], (IVORY_D, 0.05), 'skiff_nacelle', closed=True)
        k.tube((x0 + 0.5 * L, er, nz), (x0 + 0.62 * L, er, nz), 0.13, trim, 'skiff_cone', rb=0.01, verts=12)
        for t in (-0.06, 0.02):
            k.cyl_x(x0 + t * L - 0.03, x0 + t * L + 0.03, er, nz, 0.185, 0.185, '#0a2a2a', 'skiff_aether_ring', emit=(RUNE, 0.9), verts=14)
        k.cyl_x(x0 + 0.22 * L - 0.04, x0 + 0.22 * L + 0.04, er, nz, 0.205, 0.205, trim, 'skiff_band', verts=14)
        k.cyl_x(x0 - 0.16 * L - 0.02, x0 - 0.16 * L, er, nz, 0.1, 0.1, '#1a1440', 'skiff_core', emit=(AETHER, 1.0), verts=12)
        k.bar(x0 + 0.1 * L, rc + side * 0.3, x0 + 0.1 * L, er, nz + 0.02, nz + 0.08, 0.16, (IVORY_D, 0.05), 'skiff_pylon')
    # swept dorsal fin with a rune line
    hw, ht, hb, zc = _along(prof, 0.18)
    base = zc + ht * 0.9
    fin = [[(x0 + 0.04 * L, rc - 0.03, base), (x0 + 0.32 * L, rc - 0.03, base), (x0 + 0.32 * L, rc + 0.03, base), (x0 + 0.04 * L, rc + 0.03, base)],
           [(x0 - 0.04 * L, rc - 0.025, base + 0.42), (x0 + 0.16 * L, rc - 0.025, base + 0.42), (x0 + 0.16 * L, rc + 0.025, base + 0.42),
            (x0 - 0.04 * L, rc + 0.025, base + 0.42)],
           [(x0 - 0.1 * L, rc - 0.02, base + 0.7), (x0 - 0.02 * L, rc - 0.02, base + 0.7), (x0 - 0.02 * L, rc + 0.02, base + 0.7),
            (x0 - 0.1 * L, rc + 0.02, base + 0.7)]]
    k.loft(fin, (hull, 0.05), 'skiff_fin', closed=True, smooth=False)
    _trace(k, [(x0 + 0.3 * L, rc + 0.035, base + 0.02), (x0 + 0.15 * L, rc + 0.03, base + 0.42), (x0 - 0.03 * L, rc + 0.025, base + 0.7)],
           0.014, '#0a2a2a', 'skiff_fin_rune', emit=(RUNE, 0.85))
    k.sphere(x0 - 0.06 * L, rc, base + 0.72, 0.04, 0.04, '#702020', 'skiff_beacon', emit=('#ff5040', 1.0), segs=8)
    # the hatch behind the canopy (open, with its ramp) or closed
    dx0, dx1 = x0 + 0.47 * L, x0 + 0.56 * L
    hw, ht, hb, zc = _along(prof, 0.52)
    rf = rc + hw * 0.92
    if ramp:
        k.box(dx0, rf - 0.06, zc - 0.36, dx1, rf + 0.02, zc + 0.24, '#1a1410', 'skiff_doorway')
        k.box(dx0 + 0.04, rf + 0.02, zc - 0.3, dx1 - 0.04, rf + 0.025, zc + 0.2, '#3a3020', 'skiff_cabin', emit=('#ffcf80', 0.45))
        k.poly([(dx0, rf + 0.02, zc - 0.36), (dx1, rf + 0.02, zc - 0.36), (dx1, rf + 0.7, 0.0), (dx0, rf + 0.7, 0.0)],
               (IVORY_D, 0.06), 'skiff_ramp')
        for xx in (dx0 + 0.02, dx1 - 0.02):
            k.bar(xx, rf + 0.02, xx, rf + 0.7, 0.0, 0.05, 0.025, trim, 'skiff_ramp_rail')
        k.point_light((dx0 + dx1) / 2, rf + 0.45, 0.6, '#ffcf80', 10, radius=0.2)
    else:
        _trace(k, [(dx0, rf + 0.01, zc - 0.32), (dx0, rf + 0.01, zc + 0.2), (dx1, rf + 0.01, zc + 0.2), (dx1, rf + 0.01, zc - 0.32)],
               0.01, trim, 'skiff_hatch_seam')
    # gold landing claws
    if landed:
        for (t, sd) in ((0.25, 1), (0.25, -1), (0.8, 0)):
            hw, ht, hb, zc = _along(prof, t)
            lx, lr = x0 + t * L, rc + sd * 0.28
            foot = (lx + (0.06 if t > 0.5 else -0.06), lr + sd * 0.12, 0.03)
            k.tube((lx, lr, zc - hb * 0.8), foot, 0.03, trim, 'skiff_leg', verts=6)
            for a in (-0.5, 0.0, 0.5):
                k.tube(foot, (foot[0] + math.cos(a) * 0.1, foot[1] + math.sin(a) * 0.08, 0.0), 0.015, GOLD_D, 'skiff_claw', verts=4)
    return (x0 - 0.6, rc - 1.6, x0 + L + 0.4, rc + 1.6)


def mothership(k, x0, rc=0.0, L=18.0):
    """The Wayfarer, the pilot's home ship — a sky-galleon: an indigo hull
    with gold wales and rows of warm portholes, a rune band along the keel,
    a tiered stern castle with the bridge windows, three gold masts carrying
    glowing light-sails and a jib to the prow spire, a glowing keel fin, the
    hangar bay open on the flank and ring thrusters astern. Nose to the right."""
    prof = [(0.0, 1.5, 0.85, 1.25, 2.45), (0.08, 1.85, 0.95, 1.55, 2.5), (0.4, 1.95, 1.0, 1.75, 2.55),
            (0.7, 1.75, 0.9, 1.55, 2.55), (0.86, 1.15, 0.7, 1.15, 2.6), (0.95, 0.55, 0.42, 0.65, 2.68), (1.0, 0.1, 0.1, 0.12, 2.78)]
    k.loft([_ring(x0 + t * L, rc, hw, ht, hb, zc, n=20, p=0.7) for (t, hw, ht, hb, zc) in prof], (INDIGO, 0.08), 'wf_hull', closed=True)
    k.cyl_x(x0 - 0.06, x0 + 0.02, rc, 2.45, 1.5, 1.05, (INDIGO_D, 0.06), 'wf_stern', verts=20)
    # gold wales, ivory deck, portholes, the rune band
    for (zf, rad) in ((0.55, 0.035), (-0.15, 0.045), (-0.75, 0.03)):
        pts = []
        for i in range(25):
            t = 0.02 + i * 0.93 / 24
            hw, ht, hb, zc = _along(prof, t)
            hh = ht if zf >= 0 else hb
            sv = abs(zf) ** 0.7
            pts.append((x0 + t * L, rc + hw * (1 - sv * 0.12), zc + zf * hh))
        _trace(k, pts, rad, GOLD, 'wf_wale')
    deck = []
    for i in range(13):
        t = 0.03 + i * 0.85 / 12
        hw, ht, hb, zc = _along(prof, t)
        deck.append([(x0 + t * L, rc - hw * 0.7, zc + ht * 0.98), (x0 + t * L, rc + hw * 0.7, zc + ht * 0.98)])
    k.loft(deck, (IVORY, 0.06), 'wf_deck')
    t = 0.3
    while t < 0.82:
        hw, ht, hb, zc = _along(prof, t)
        for zf in (0.2, -0.45):
            hh = ht if zf >= 0 else hb
            lit = k.rng.random() < 0.85
            k.cyl_y(x0 + t * L, rc + hw * 0.95, rc + hw + 0.04, zc + zf * hh, 0.1, 0.1, '#3a2a14' if lit else '#10141c',
                    'wf_porthole', emit=('#ffcf80', 0.9) if lit else None, verts=10)
            k.cyl_y(x0 + t * L, rc + hw * 0.94, rc + hw + 0.03, zc + zf * hh, 0.13, 0.13, GOLD_D, 'wf_porthole_rim', verts=10)
        t += 0.028
    t = 0.08
    while t < 0.85:
        hw, ht, hb, zc = _along(prof, t)
        x, z = x0 + t * L, zc - hb * 0.62
        k.box(x - 0.08, rc + hw * 0.86, z - 0.05, x + 0.08, rc + hw * 0.88, z + 0.05, '#0a2a2a', 'wf_rune', emit=(RUNE, 0.85))
        t += 0.03
    # the glowing keel fin
    hw, ht, hb, zc = _along(prof, 0.5)
    kz = zc - hb * 0.95
    k.loft([[(x0 + 0.25 * L, rc - 0.06, kz), (x0 + 0.72 * L, rc - 0.06, kz), (x0 + 0.72 * L, rc + 0.06, kz), (x0 + 0.25 * L, rc + 0.06, kz)],
            [(x0 + 0.34 * L, rc - 0.04, kz - 0.9), (x0 + 0.56 * L, rc - 0.04, kz - 0.9), (x0 + 0.56 * L, rc + 0.04, kz - 0.9),
             (x0 + 0.34 * L, rc + 0.04, kz - 0.9)]], (INDIGO_D, 0.06), 'wf_keel', closed=True, smooth=False)
    _trace(k, [(x0 + 0.27 * L, rc + 0.07, kz - 0.05), (x0 + 0.35 * L, rc + 0.05, kz - 0.88), (x0 + 0.55 * L, rc + 0.05, kz - 0.88),
               (x0 + 0.7 * L, rc + 0.07, kz - 0.05)], 0.03, '#0a2a2a', 'wf_keel_glow', emit=(RUNE, 0.9))
    # stern castle: two tiers, the bridge windows on top, gold balconies
    hw, ht, hb, zc = _along(prof, 0.12)
    top = zc + ht
    for (ta, tb, z0_, z1_, w_) in ((0.0, 0.24, top - 0.1, top + 0.9, 1.3), (0.02, 0.17, top + 0.9, top + 1.7, 1.0)):
        k.box(x0 + ta * L, rc - w_, z0_, x0 + tb * L, rc + w_, z1_, (INDIGO, 0.08), 'wf_castle', bevel=0.04)
        k.box(x0 + ta * L - 0.06, rc - w_ - 0.06, z1_, x0 + tb * L + 0.06, rc + w_ + 0.06, z1_ + 0.08, GOLD, 'wf_castle_trim')
    for i in range(6):
        wx = x0 + 0.03 * L + i * 0.35
        k.box(wx, rc + 1.3, top + 0.25, wx + 0.26, rc + 1.34, top + 0.7, '#3a2a14', 'wf_cabin_window', emit=('#ffcf80', 0.9))
    k.box(x0 + 0.04 * L, rc + 1.0, top + 1.05, x0 + 0.155 * L, rc + 1.04, top + 1.5, '#0e2a30', 'wf_bridge_window', emit=('#60e0f0', 0.9))
    for i in range(9):
        bx = x0 + 0.01 * L + i * 0.5
        k.tube((bx, rc + 1.36, top + 0.9), (bx, rc + 1.36, top + 1.12), 0.015, GOLD, 'wf_rail', verts=4)
    k.tube((x0 + 0.01 * L, rc + 1.36, top + 1.12), (x0 + 0.24 * L, rc + 1.36, top + 1.12), 0.02, GOLD, 'wf_rail', verts=4)
    k.sphere(x0 - 0.2, rc + 0.8, top + 1.0, 0.12, 0.12, '#ffd080', 'wf_stern_lantern', emit=('#ffb050', 1.0), segs=10)
    # masts with light-sails, and a jib out to the prow spire
    tops = []
    for (t, h, span) in ((0.36, 4.6, 1.5), (0.56, 5.2, 1.65), (0.75, 4.2, 1.3)):
        hw, ht, hb, zc = _along(prof, t)
        mx, mz = x0 + t * L, zc + ht
        k.cyl(mx, rc, mz - 0.2, mz + h, 0.07, (GOLD, 0.08), 'wf_mast', verts=10)
        k.sphere(mx, rc, mz + h + 0.08, 0.1, 0.1, '#0a2a2a', 'wf_mast_orb', emit=(RUNE, 1.0), segs=10)
        tops.append((mx, rc, mz + h))
        for (z_top, z_bot, w_) in ((mz + h * 0.95, mz + h * 0.55, span * 0.7), (mz + h * 0.52, mz + 0.5, span)):
            k.cyl_x(mx - w_ - 0.1, mx + w_ + 0.1, rc, z_top, 0.04, 0.04, GOLD, 'wf_yard', verts=6)
            rows = []
            for j, f in enumerate((0.0, 0.33, 0.66, 1.0)):
                z = z_top - (z_top - z_bot) * f
                bil = math.sin(math.pi * f) * 0.35
                rows.append([(mx + w_ * u, rc + 0.08 + bil * (1 - abs(u)), z - abs(u) * 0.08 * f) for u in (-1, -0.5, 0, 0.5, 1)])
            # light fades down the sail: three bands, brightest under the yard
            for j, glow in enumerate((0.42, 0.3, 0.2)):
                band = [[rows[j][i], rows[j + 1][i]] for i in range(5)]
                k.loft(band, '#0a2430', 'wf_sail', emit=('#4ad8d0', glow))
            for i in (1, 3):
                _trace(k, [rows[0][i], rows[1][i], rows[2][i], rows[3][i]], 0.012, GOLD_D, 'wf_batten')
            _trace(k, [rows[3][0], rows[3][2], rows[3][4]], 0.02, GOLD, 'wf_sail_edge')
            _trace(k, [rows[j][0] for j in range(4)], 0.016, GOLD, 'wf_sail_edge')
            _trace(k, [rows[j][4] for j in range(4)], 0.016, GOLD, 'wf_sail_edge')
    # prow spire with gold wings, and the jib of light
    hw, ht, hb, zc = _along(prof, 1.0)
    tip = (x0 + L + 2.4, rc, zc + 0.7)
    k.tube((x0 + L - 0.3, rc, zc), tip, 0.14, GOLD, 'wf_spire', rb=0.01, verts=10)
    for sd in (1, -1):
        k.poly([(x0 + L + 0.2, rc + sd * 0.05, zc + 0.2), (x0 + L - 0.9, rc + sd * 0.7, zc + 1.0), (x0 + L - 0.2, rc + sd * 0.1, zc + 0.05)],
               GOLD, 'wf_prow_wing')
    fm = tops[-1]
    k.poly([(fm[0] + 0.1, rc + 0.05, fm[2] - 0.2), (tip[0] - 0.3, rc + 0.05, tip[2] + 0.1), (fm[0] + 0.4, rc + 0.05, zc + ht + 0.4)],
           '#0a2430', 'wf_jib', emit=('#4ad8d0', 0.28))
    _trace(k, [(fm[0], rc, fm[2]), (tip[0], rc, tip[2])], 0.015, GOLD, 'wf_stay')
    for a, b in zip(tops, tops[1:]):
        _trace(k, [a, (b[0], b[1], b[2] * 0.6)], 0.012, GOLD_D, 'wf_stay')
    # the hangar bay, open and lit, in a gold frame
    hw, ht, hb, zc = _along(prof, 0.47)
    bx0, bx1 = x0 + 0.4 * L, x0 + 0.54 * L
    bf = rc + hw * 0.94
    bz0, bz1 = zc - hb * 0.62, zc - hb * 0.05
    k.box(bx0 - 0.12, bf - 0.05, bz0 - 0.1, bx1 + 0.12, bf + 0.08, bz1 + 0.1, GOLD, 'wf_bay_frame')
    k.box(bx0, bf + 0.08, bz0, bx1, bf + 0.085, bz1, '#1a1410', 'wf_bay', emit=('#7a5a38', 0.6))
    for i in range(4):
        lx = bx0 + 0.2 + i * (bx1 - bx0 - 0.4) / 3
        k.box(lx - 0.08, bf + 0.086, bz1 - 0.12, lx + 0.08, bf + 0.09, bz1 - 0.05, '#3a3020', 'wf_bay_light', emit=('#ffe0b0', 1.0))
    # ring thrusters astern, stabiliser fins
    for (dz, rr) in ((0.5, 0.55), (-0.5, 0.65)):
        z = 2.45 + dz
        k.cyl_x(x0 - 1.4, x0 + 0.2, rc, z, rr, rr, (INDIGO_D, 0.06), 'wf_thruster', verts=20)
        for f in (0.25, 0.6):
            xx = x0 - 1.4 + 1.6 * f
            k.cyl_x(xx - 0.06, xx + 0.06, rc, z, rr * 1.04, rr * 1.04, '#0a2a2a', 'wf_thruster_ring', emit=(RUNE, 0.9), verts=20)
        k.cyl_x(x0 - 1.45, x0 - 1.4, rc, z, rr * 0.7, rr * 0.7, '#1a1440', 'wf_thruster_core', emit=(AETHER, 1.0), verts=18)
    for sd in (1, -1):
        k.loft([[(x0 + 0.02 * L, rc + sd * 1.4, 1.3), (x0 + 0.2 * L, rc + sd * 1.4, 1.3), (x0 + 0.2 * L, rc + sd * 1.4, 1.45),
                 (x0 + 0.02 * L, rc + sd * 1.4, 1.45)],
                [(x0 - 0.06 * L, rc + sd * 2.8, 0.5), (x0 + 0.06 * L, rc + sd * 2.8, 0.5), (x0 + 0.06 * L, rc + sd * 2.8, 0.6),
                 (x0 - 0.06 * L, rc + sd * 2.8, 0.6)]], (INDIGO, 0.08), 'wf_fin', closed=True, smooth=False)
    k.sphere(x0 + L + 2.4, rc, zc + 0.7, 0.08, 0.08, '#e8e8f0', 'wf_strobe', emit=('#ffffff', 1.0), segs=8)
    return {'bay': ((bx0 + bx1) / 2, bf + 0.1, (bz0 + bz1) / 2)}
