"""Arcadia (neon city) builders for scenekit (bpy). Tile units: x = column,
r = row (toward the camera), z = height.

Neon is dark tube albedo + saturated emission (glows add on top of the lit
colour — strength <= 1 keeps the hue). Signs use a small stroke font.
"""
import math

from scenekit import shade
from assets_lumar import BRASS, WOOD, WOOD_D, WOOD_DD, candle
import assets_ship as P

WALL = ['#080418', '#1a1530', '#2a2a3e', '#3a3a52']
FLOOR = ['#2a2240', '#3a3650']
PINK = '#f078a8'
PINK_D = '#e870c0'
MAG = '#a040c0'
CYAN = '#5cc8d0'
CYAN_L = '#80e0e8'
PURP = '#7080e8'
PURP_D = '#3a1840'
GLASS = '#181a40'
YEL = '#e8c040'
GREEN = '#40e080'
RED = '#e84040'


# ---- neon stroke font (2 x 4 grid, y up) -------------------------------------------
FONT = {
    'A': [(0, 0, 0, 3), (0, 3, 1, 4), (1, 4, 2, 3), (2, 3, 2, 0), (0, 2, 2, 2)],
    'B': [(0, 0, 0, 4), (0, 4, 1.5, 4), (1.5, 4, 2, 3.4), (2, 3.4, 1.5, 2), (0, 2, 1.5, 2), (1.5, 2, 2, 1.4), (2, 1.4, 1.5, 0), (1.5, 0, 0, 0)],
    'C': [(2, 4, 0, 4), (0, 4, 0, 0), (0, 0, 2, 0)],
    'D': [(0, 0, 0, 4), (0, 4, 1.3, 4), (1.3, 4, 2, 3), (2, 3, 2, 1), (2, 1, 1.3, 0), (1.3, 0, 0, 0)],
    'E': [(2, 4, 0, 4), (0, 4, 0, 0), (0, 0, 2, 0), (0, 2, 1.5, 2)],
    'F': [(2, 4, 0, 4), (0, 4, 0, 0), (0, 2, 1.5, 2)],
    'G': [(2, 4, 0, 4), (0, 4, 0, 0), (0, 0, 2, 0), (2, 0, 2, 2), (2, 2, 1, 2)],
    'H': [(0, 0, 0, 4), (2, 0, 2, 4), (0, 2, 2, 2)],
    'I': [(1, 0, 1, 4), (0, 4, 2, 4), (0, 0, 2, 0)],
    'K': [(0, 0, 0, 4), (0, 2, 2, 4), (0, 2, 2, 0)],
    'L': [(0, 4, 0, 0), (0, 0, 2, 0)],
    'M': [(0, 0, 0, 4), (0, 4, 1, 2), (1, 2, 2, 4), (2, 4, 2, 0)],
    'N': [(0, 0, 0, 4), (0, 4, 2, 0), (2, 0, 2, 4)],
    'O': [(0, 0, 0, 4), (0, 4, 2, 4), (2, 4, 2, 0), (2, 0, 0, 0)],
    'P': [(0, 0, 0, 4), (0, 4, 2, 4), (2, 4, 2, 2), (2, 2, 0, 2)],
    'R': [(0, 0, 0, 4), (0, 4, 2, 4), (2, 4, 2, 2), (2, 2, 0, 2), (0.8, 2, 2, 0)],
    'S': [(2, 4, 0, 4), (0, 4, 0, 2), (0, 2, 2, 2), (2, 2, 2, 0), (2, 0, 0, 0)],
    'T': [(0, 4, 2, 4), (1, 4, 1, 0)],
    'U': [(0, 4, 0, 0), (0, 0, 2, 0), (2, 0, 2, 4)],
    'V': [(0, 4, 1, 0), (1, 0, 2, 4)],
    'W': [(0, 4, 0, 0), (0, 0, 1, 2), (1, 2, 2, 0), (2, 0, 2, 4)],
    'X': [(0, 0, 2, 4), (0, 4, 2, 0)],
    'Y': [(0, 4, 1, 2), (2, 4, 1, 2), (1, 2, 1, 0)],
    '-': [(0, 2, 2, 2)],
    "'": [(1, 4, 1, 3)],
    ' ': [],
}


def neon_text(k, text, cx, r_face, z0, h=0.4, col=PINK, board=True, energy=6.0, tube=0.022):
    """Neon tube lettering on a wall (front face at r_face), centred on cx."""
    u = h / 4
    adv = 2.8 * u
    w = adv * len(text) - 0.8 * u
    x0 = cx - w / 2
    r = r_face + 0.06
    if board:
        k.box(x0 - 0.12, r_face, z0 - 0.1, x0 + w + 0.12, r_face + 0.035, z0 + h + 0.1, '#0c0818', 'sign_board')
    for i, ch in enumerate(text.upper()):
        ox = x0 + i * adv
        for (a, b, c, d) in FONT.get(ch, []):
            k.tube((ox + a * u, r, z0 + b * u), (ox + c * u, r, z0 + d * u), tube, shade(col, 0.5), 'neon', emit=(col, 0.95), verts=6)
            k.sphere(ox + c * u, r, z0 + d * u, tube, tube, shade(col, 0.5), 'neon', emit=(col, 0.95), segs=6)
    k.point_light(cx, r_face + 0.5, z0 + h / 2, col, energy, radius=w / 3, group='flicker')
    return w


def neon_shape(k, pts, r, col, tube=0.022, closed=True):
    """Neon outline through (x, z) points on a wall plane at row r."""
    seq = list(pts) + ([pts[0]] if closed else [])
    for (a, b), (c, d) in zip(seq, seq[1:]):
        k.tube((a, r, b), (c, r, d), tube, shade(col, 0.5), 'neon', emit=(col, 0.95), verts=6)


# ---- room shell ------------------------------------------------------------------------
def tile_floor(k, x0, r0, x1, r1, tones=FLOOR, size=0.5, seam='#120c20'):
    k.box(x0, r0, -0.12, x1, r1, -0.02, seam, 'subfloor')
    r, i = r0, 0
    while r < r1 - 1e-6:
        x, j = x0, 0
        while x < x1 - 1e-6:
            t = tones[(i + j) % 2]
            k.box(x + 0.015, r + 0.015, -0.04, min(x1, x + size) - 0.015, min(r1, r + size) - 0.015, 0.0,
                  (shade(t, k.rng.uniform(0.92, 1.08)), 0.08), 'floor')
            x += size
            j += 1
        r += size
        i += 1


def cyber_room(k, x0, r0, x1, r1, wall_h, door=(6.0, 8.0), floor_tones=FLOOR, wall=WALL, top_neon=PINK, base_neon=CYAN,
               ribs_every=2.0):
    tile_floor(k, x0, r0, x1, r1, tones=floor_tones)
    P.ship_back_wall(k, x0 - 0.6, x1 + 0.6, r0, wall_h, pal=wall, trim=shade(top_neon, 0.6), ribs_every=ribs_every)
    P.ship_side_wall(k, x0 - 0.6, x0, r0 - 0.5, r1, wall_h, pal=wall)
    P.ship_side_wall(k, x1, x1 + 0.6, r0 - 0.5, r1, wall_h, pal=wall)
    P.ship_front_wall(k, x0 - 0.6, x1 + 0.6, r1, door=door, pal=wall)
    k.box(x0, r0 + 0.08, wall_h - 0.34, x1, r0 + 0.12, wall_h - 0.3, '#200818', 'neon', emit=(top_neon, 0.85))
    P.led_strip(k, x0, x1, r0 + 0.11, z=0.22, col=base_neon, group='flicker')
    # pipes and cables along the top of the back wall
    k.tube((x0 - 0.5, r0 + 0.2, wall_h - 0.12), (x1 + 0.5, r0 + 0.2, wall_h - 0.12), 0.06, ('#3a3a48', 0.06), 'pipe', verts=10)
    k.tube((x0 - 0.5, r0 + 0.32, wall_h - 0.2), (x1 + 0.5, r0 + 0.32, wall_h - 0.2), 0.035, ('#5a3a2a', 0.06), 'pipe', verts=8)
    for i in range(5):
        x = x0 + 0.8 + i * (x1 - x0 - 1.6) / 4
        sag = k.rng.uniform(0.15, 0.3)
        pts = [(x, r0 + 0.12, wall_h - 0.1), (x + 0.4, r0 + 0.14, wall_h - 0.1 - sag), (x + 0.8, r0 + 0.12, wall_h - 0.1)]
        for a, b in zip(pts, pts[1:]):
            k.tube(a, b, 0.015, '#14101c', 'cable', verts=5)


# ---- arcade -----------------------------------------------------------------------------
def _screen_px(k, x, r, z, w, h, col, strength=0.95):
    k.box(x, r, z, x + w, r + 0.008, z + h, shade(col, 0.4), 'screen_art', emit=(col, strength))


def screen_art(k, art, x0, x1, r, z0, z1):
    """Little pixel scenes on an arcade screen (a vertical plane at row r)."""
    W, Hh = x1 - x0, z1 - z0
    p = W / 16
    if art == 'invaders':
        for row, col in enumerate((GREEN, GREEN, '#e0e0e0')):
            for i in range(5):
                xx = x0 + p * (1.5 + i * 2.8)
                zz = z1 - p * (2 + row * 2.2)
                _screen_px(k, xx, r, zz, p * 1.6, p * 1.0, col)
                _screen_px(k, xx - p * 0.3, r, zz - p * 0.4, p * 0.4, p * 0.4, col)
                _screen_px(k, xx + p * 1.5, r, zz - p * 0.4, p * 0.4, p * 0.4, col)
        _screen_px(k, x0 + W / 2 - p, r, z0 + p * 0.6, p * 2, p * 0.8, CYAN_L)
    elif art == 'asteroids':
        for (cx, cz, s) in ((0.25, 0.7, 0.13), (0.72, 0.6, 0.18), (0.5, 0.25, 0.1)):
            pts = [(x0 + W * cx + math.cos(a) * W * s * (1 + 0.2 * math.sin(a * 3)), z0 + Hh * cz + math.sin(a) * Hh * s * 0.9)
                   for a in [i * math.pi / 3.5 for i in range(7)]]
            neon_shape(k, pts, r, '#e8e8f0', tube=0.006)
        neon_shape(k, [(x0 + W * 0.45, z0 + Hh * 0.45), (x0 + W * 0.55, z0 + Hh * 0.5), (x0 + W * 0.45, z0 + Hh * 0.55)], r,
                   '#e8e8f0', tube=0.006)
    elif art == 'breakout':
        cols = (RED, '#f09040', YEL, GREEN, CYAN)
        for row, col in enumerate(cols):
            for i in range(7):
                _screen_px(k, x0 + p * (0.6 + i * 2.2), r, z1 - p * (1.5 + row * 1.1), p * 1.9, p * 0.8, col)
        _screen_px(k, x0 + W * 0.4, r, z0 + p * 0.6, p * 3, p * 0.5, '#e0e0e0')
        _screen_px(k, x0 + W * 0.55, r, z0 + Hh * 0.35, p * 0.6, p * 0.6, '#ffffff')
    elif art == 'helicopter':
        for i in range(8):
            hgt = (1.5 + 1.2 * math.sin(i * 1.3)) * p
            _screen_px(k, x0 + i * W / 8, r, z1 - hgt, W / 8, hgt, '#30a040')
            _screen_px(k, x0 + i * W / 8, r, z0, W / 8, (1.2 + math.cos(i * 1.1)) * p + p, '#30a040')
        _screen_px(k, x0 + W * 0.25, r, z0 + Hh * 0.5, p * 2.2, p * 1.2, YEL)
        _screen_px(k, x0 + W * 0.22, r, z0 + Hh * 0.5 + p * 1.3, p * 3, p * 0.3, '#e0e0e0')
    elif art == 'missile':
        for (a, b) in ((0.1, 0.8), (0.6, 0.9), (0.85, 0.75)):
            k.tube((x0 + W * a, r, z1 - p), (x0 + W * b * 0.8, r, z0 + Hh * 0.35), 0.006, RED, 'screen_art', emit=(RED, 0.95), verts=4)
        for i in range(5):
            _screen_px(k, x0 + p * (1 + i * 3.2), r, z0 + p * 0.5, p * 1.4, p * 0.8, '#4080f0')
        k.cyl_y(x0 + W * 0.45, r, r + 0.01, z0 + Hh * 0.55, p * 1.8, p * 1.8, '#f8e080', 'screen_art', emit=('#f8e080', 0.95), verts=12)
    elif art == 'runouts':
        for i in range(4):
            k.tube((x0 + W * (0.2 + i * 0.2), r, z0), (x0 + W * (0.42 + i * 0.05), r, z1), 0.006, PINK, 'screen_art',
                   emit=(PINK, 0.9), verts=4)
        _screen_px(k, x0 + W * 0.45, r, z0 + p, p * 1.6, p * 1.6, CYAN_L)
        _screen_px(k, x0 + W * 0.3, r, z0 + Hh * 0.6, p, p, YEL)
    elif art == 'broken':
        neon_shape(k, [(x0 + W * 0.3, z1), (x0 + W * 0.45, z0 + Hh * 0.6), (x0 + W * 0.35, z0 + Hh * 0.4),
                       (x0 + W * 0.6, z0)], r, '#4a5a6a', tube=0.005, closed=False)
    else:   # attract mode
        for i in range(4):
            _screen_px(k, x0 + p * 2, r, z1 - p * (2 + i * 2.5), W - p * (4 + (i % 2) * 4), p * 0.9, k.rng.choice((PINK, CYAN, YEL)))


def arcade_cabinet(k, cx, r0, art='invaders', screen='#0a1a10', marquee=PINK, side=PURP, w=0.8, energy=6.0, broken=False):
    """Upright arcade cabinet with its back to the wall (r0) facing the room."""
    x0, x1 = cx - w / 2, cx + w / 2
    body = (WALL[1], 0.06)
    k.box(x0, r0, 0, x1, r0 + 0.72, 1.0, body, 'cabinet', bevel=0.015)
    k.box(x0 - 0.02, r0 + 0.55, 0.92, x1 + 0.02, r0 + 0.88, 1.04, (WALL[2], 0.06), 'control_panel', bevel=0.01)
    k.box(x0, r0, 1.0, x1, r0 + 0.48, 1.85, body, 'cabinet', bevel=0.015)
    k.box(x0 - 0.03, r0 + 0.3, 1.85, x1 + 0.03, r0 + 0.62, 2.08, '#100818', 'marquee_box')
    k.box(x0, r0 + 0.62, 1.88, x1, r0 + 0.63, 2.05, shade(marquee, 0.4), 'marquee', emit=(marquee, 0.0 if broken else 0.95))
    for xx in (x0 - 0.005, x1 - 0.015):   # neon side trim
        k.box(xx, r0 + 0.05, 0.05, xx + 0.02, r0 + 0.7, 0.08, shade(side, 0.5), 'side_neon', emit=(side, 0.0 if broken else 0.85))
        k.box(xx, r0 + 0.46, 1.0, xx + 0.02, r0 + 0.5, 1.85, shade(side, 0.5), 'side_neon', emit=(side, 0.0 if broken else 0.85))
    k.box(x0 + 0.06, r0 + 0.48, 1.08, x1 - 0.06, r0 + 0.5, 1.8, '#06040c', 'bezel')
    sx0, sx1, sz0, sz1 = x0 + 0.1, x1 - 0.1, 1.14, 1.72
    k.box(sx0, r0 + 0.5, sz0, sx1, r0 + 0.505, sz1, screen, 'screen', emit=(screen, 0.0 if broken else 1.0))
    screen_art(k, 'broken' if broken else art, sx0 + 0.02, sx1 - 0.02, r0 + 0.506, sz0 + 0.02, sz1 - 0.02)
    # joystick + buttons
    k.cyl(cx - 0.2, r0 + 0.72, 1.04, 1.13, 0.012, '#2a2a30', 'joystick', verts=6)
    k.sphere(cx - 0.2, r0 + 0.72, 1.14, 0.035, 0.035, RED, 'joystick_ball', segs=8)
    for i, col in enumerate((RED, YEL, CYAN)):
        k.cyl(cx + 0.02 + i * 0.1, r0 + 0.74, 1.04, 1.06, 0.03, col, 'button', emit=(col, 0.5), verts=8)
    k.box(cx - 0.06, r0 + 0.72, 0.4, cx + 0.06, r0 + 0.725, 0.55, '#3a3a48', 'coin_door')
    k.box(cx - 0.02, r0 + 0.725, 0.47, cx + 0.02, r0 + 0.73, 0.52, RED, 'coin_slot', emit=(RED, 0.0 if broken else 0.8))
    if not broken:
        k.point_light(cx, r0 + 1.2, 1.4, marquee, energy, radius=0.2, group='flicker')
    k.solid(x0, r0, x1, r0 + 0.9)


def highscore_board(k, cx, r_face, z0=1.05, w=0.9, h=0.9, title=YEL):
    k.box(cx - w / 2 - 0.05, r_face, z0 - 0.05, cx + w / 2 + 0.05, r_face + 0.06, z0 + h + 0.05, '#0c0818', 'board_frame')
    k.box(cx - w / 2, r_face + 0.06, z0, cx + w / 2, r_face + 0.065, z0 + h, '#08061a', 'board', emit=('#100c30', 1.0))
    k.box(cx - w / 2 + 0.1, r_face + 0.066, z0 + h - 0.16, cx + w / 2 - 0.1, r_face + 0.07, z0 + h - 0.08, title, 'board_title',
          emit=(title, 0.95))
    for i in range(6):
        z = z0 + h - 0.28 - i * 0.1
        col = (PINK, CYAN_L, '#e0e0e0')[min(i, 2)]
        k.box(cx - w / 2 + 0.08, r_face + 0.066, z, cx - w / 2 + 0.24, r_face + 0.07, z + 0.045, col, 'board_text', emit=(col, 0.9))
        k.box(cx + w / 2 - 0.36 - 0.03 * (i % 3), r_face + 0.066, z, cx + w / 2 - 0.08, r_face + 0.07, z + 0.045, col, 'board_text',
              emit=(col, 0.9))
    k.point_light(cx, r_face + 0.6, z0 + h / 2, '#a080ff', 4, radius=0.3)


def glow_poster(k, cx, r_face, z0, w=0.6, h=0.85, bg='#2a0a30', accent=PINK, kind=0):
    k.box(cx - w / 2 - 0.03, r_face, z0 - 0.03, cx + w / 2 + 0.03, r_face + 0.04, z0 + h + 0.03, '#0c0818', 'poster_frame')
    k.box(cx - w / 2, r_face + 0.04, z0, cx + w / 2, r_face + 0.045, z0 + h, bg, 'poster', emit=(bg, 0.8))
    r = r_face + 0.047
    if kind == 0:   # sun over grid
        k.cyl_y(cx, r - 0.002, r + 0.002, z0 + h * 0.62, w * 0.26, w * 0.26, accent, 'poster_art', emit=(accent, 0.9), verts=16)
        for i in range(4):
            z = z0 + h * (0.12 + i * 0.07)
            k.box(cx - w / 2 + 0.03, r, z, cx + w / 2 - 0.03, r + 0.003, z + 0.012, CYAN, 'poster_art', emit=(CYAN, 0.8))
    elif kind == 1:  # big face / figure
        k.cyl_y(cx, r - 0.002, r + 0.002, z0 + h * 0.6, w * 0.22, w * 0.26, accent, 'poster_art', emit=(accent, 0.8), verts=14)
        k.box(cx - w * 0.3, r, z0 + 0.08, cx + w * 0.3, r + 0.003, z0 + h * 0.35, accent, 'poster_art', emit=(accent, 0.6))
        k.box(cx - w * 0.2, r + 0.003, z0 + h * 0.56, cx + w * 0.2, r + 0.006, z0 + h * 0.62, CYAN_L, 'poster_art', emit=(CYAN_L, 0.9))
    else:            # lettering bands
        for i in range(3):
            k.box(cx - w / 2 + 0.06, r, z0 + h * (0.2 + i * 0.25), cx + w / 2 - 0.06 - 0.08 * i, r + 0.003, z0 + h * (0.28 + i * 0.25),
                  accent, 'poster_art', emit=(accent, 0.9))


def vending_machine(k, cx, r0, w=0.85, body='#2a1840', can_cols=(RED, YEL, CYAN, GREEN, PINK, PURP)):
    x0, x1 = cx - w / 2, cx + w / 2
    k.box(x0, r0, 0, x1, r0 + 0.7, 1.85, (body, 0.06), 'vending', bevel=0.02)
    k.box(x0 + 0.06, r0 + 0.7, 0.45, x1 - 0.25, r0 + 0.72, 1.75, '#0a0a20', 'vending_glass', emit=('#1a1a40', 0.7))
    for row in range(5):
        z = 0.55 + row * 0.24
        k.box(x0 + 0.08, r0 + 0.5, z - 0.02, x1 - 0.27, r0 + 0.7, z, '#5a5a6a', 'vending_shelf')
        for i in range(4):
            col = can_cols[(row + i) % len(can_cols)]
            k.cyl(x0 + 0.15 + i * 0.12, r0 + 0.62, z, z + 0.15, 0.04, col, 'can', emit=(col, 0.5), verts=8)
    k.box(x1 - 0.22, r0 + 0.7, 1.2, x1 - 0.06, r0 + 0.72, 1.45, '#0c2a30', 'vending_screen', emit=(CYAN, 0.9))
    for i in range(6):
        k.box(x1 - 0.2 + (i % 3) * 0.05, r0 + 0.7, 0.9 + (i // 3) * 0.06, x1 - 0.17 + (i % 3) * 0.05, r0 + 0.725, 0.93 + (i // 3) * 0.06,
              '#c0c0c8', 'vending_key')
    k.box(x0 + 0.1, r0 + 0.7, 0.12, x1 - 0.3, r0 + 0.72, 0.3, '#06060c', 'vending_tray')
    k.box(x0, r0 + 0.7, 1.75, x1, r0 + 0.72, 1.85, shade(PINK, 0.4), 'vending_logo', emit=(PINK, 0.9))
    k.point_light(cx, r0 + 1.2, 1.2, '#a080ff', 6, radius=0.3, group='flicker')
    k.solid(x0, r0, x1, r0 + 0.75)


def metal_bench(k, x0, x1, cr, neon=CYAN):
    k.box(x0, cr - 0.2, 0.38, x1, cr + 0.2, 0.45, (WALL[3], 0.06), 'bench')
    for x in (x0 + 0.05, x1 - 0.13):
        k.box(x, cr - 0.16, 0, x + 0.08, cr + 0.16, 0.38, WALL[1], 'bench_leg')
    k.box(x0, cr + 0.19, 0.39, x1, cr + 0.21, 0.42, shade(neon, 0.4), 'bench_neon', emit=(neon, 0.7))
    k.solid(x0, cr - 0.3, x1, cr + 0.3)


def cafe_table(k, cx, cr, top='#2a2a3e', neon=PINK):
    k.cyl(cx, cr, 0.7, 0.76, 0.36, (top, 0.05), 'table', verts=18)
    k.cyl(cx, cr, 0.69, 0.7, 0.37, shade(neon, 0.4), 'table_neon', emit=(neon, 0.7), verts=18)
    k.cyl(cx, cr, 0.04, 0.7, 0.04, WALL[3], 'table_leg', verts=8)
    k.cyl(cx, cr, 0.0, 0.04, 0.2, WALL[2], 'table_base', verts=12)
    k.solid(cx - 0.4, cr - 0.4, cx + 0.4, cr + 0.4)


def neon_stool(k, cx, cr, seat='#e870c0'):
    k.cyl(cx, cr, 0.44, 0.5, 0.18, (shade(seat, 0.6), 0.05), 'stool', verts=14)
    k.cyl(cx, cr, 0.43, 0.44, 0.185, shade(seat, 0.4), 'stool_neon', emit=(seat, 0.6), verts=14)
    k.cyl(cx, cr, 0.04, 0.43, 0.025, '#5a5a6a', 'stool_post', verts=6)
    k.cyl(cx, cr, 0.0, 0.04, 0.15, WALL[2], 'stool_base', verts=10)
    k.solid(cx - 0.25, cr - 0.25, cx + 0.25, cr + 0.25)


# ---- convenience store ---------------------------------------------------------------------
PACK = [RED, YEL, CYAN, GREEN, PINK, '#f09040', PURP, '#e0e0e0']


def gondola(k, cx, cr, w=0.9, d=0.7, h=1.25):
    """Two-sided store shelving island stacked with bright packages."""
    x0, x1, r0, r1 = cx - w / 2, cx + w / 2, cr - d / 2, cr + d / 2
    k.box(x0, cr - 0.04, 0, x1, cr + 0.04, h, (WALL[3], 0.05), 'gondola_back')
    k.box(x0 - 0.02, r0, 0, x1 + 0.02, r1, 0.12, WALL[2], 'gondola_base')
    for z in (0.12, 0.47, 0.82):
        for side in (-1, 1):
            ra, rb = (r0, cr - 0.04) if side < 0 else (cr + 0.04, r1)
            k.box(x0, ra, z, x1, rb, z + 0.03, '#8a8a9a', 'gondola_shelf')
            x = x0 + 0.04
            while x < x1 - 0.1:
                pw = k.rng.uniform(0.09, 0.16)
                ph = k.rng.uniform(0.16, 0.28)
                col = k.rng.choice(PACK)
                k.box(x, ra + 0.04, z + 0.03, x + pw - 0.015, rb - 0.04, z + 0.03 + ph, (col, 0.15), 'package')
                x += pw
    k.box(x0 - 0.02, r1 - 0.01, 0.06, x1 + 0.02, r1 + 0.01, 0.1, shade(CYAN, 0.4), 'price_strip', emit=(CYAN, 0.6))
    k.solid(x0, r0, x1, r1)


def cooler_bank(k, x0, x1, r_face, h=1.9):
    """Glass-door drinks coolers along the wall, cans glowing in the cold light."""
    k.box(x0, r_face, 0, x1, r_face + 0.62, h, (WALL[2], 0.05), 'cooler')
    n = max(1, int(round((x1 - x0) / 0.85)))
    dw = (x1 - x0) / n
    for i in range(n):
        dx0 = x0 + i * dw
        # lit interior (the glass itself is left out so the cans read)
        k.box(dx0 + 0.04, r_face + 0.1, 0.15, dx0 + dw - 0.04, r_face + 0.14, h - 0.2, '#c8e0ff', 'cooler_back',
              emit=('#6a90c0', 0.8))
        for xx in (dx0 + 0.02, dx0 + dw - 0.06):
            k.box(xx, r_face + 0.1, 0.15, xx + 0.04, r_face + 0.66, h - 0.2, '#9aa0aa', 'cooler_frame')
        k.box(dx0 + 0.02, r_face + 0.6, 0.12, dx0 + dw - 0.02, r_face + 0.66, 0.18, '#9aa0aa', 'cooler_frame')
        for row in range(5):
            z = 0.22 + row * 0.3
            k.box(dx0 + 0.05, r_face + 0.14, z - 0.025, dx0 + dw - 0.05, r_face + 0.62, z, '#d0d8e0', 'cooler_shelf')
            for j in range(int((dw - 0.1) / 0.1)):
                col = PACK[(i * 3 + row + j) % len(PACK)]
                k.cyl(dx0 + 0.1 + j * 0.1, r_face + 0.55, z, z + 0.16, 0.035, col, 'can', emit=(col, 0.45), verts=6)
        k.box(dx0 + dw - 0.1, r_face + 0.64, 0.7, dx0 + dw - 0.07, r_face + 0.68, 1.3, '#c0c0c8', 'cooler_handle')
    k.box(x0, r_face + 0.62, h - 0.18, x1, r_face + 0.65, h - 0.04, '#e8f0ff', 'cooler_sign', emit=('#c0d8ff', 0.9))
    k.point_light((x0 + x1) / 2, r_face + 1.0, 1.0, '#a0c8ff', 10, radius=(x1 - x0) / 3)
    k.solid(x0, r_face, x1, r_face + 0.65)


def checkout(k, x0, x1, r0, r1):
    k.box(x0, r0, 0, x1, r1, 0.95, (WALL[2], 0.05), 'counter', bevel=0.015)
    k.box(x0 - 0.03, r0 - 0.03, 0.95, x1 + 0.03, r1 + 0.03, 1.0, '#c8c8d8', 'counter_top')
    k.box(x0, r1, 0.1, x1, r1 + 0.02, 0.14, shade(PINK, 0.4), 'counter_neon', emit=(PINK, 0.8))
    rx = x0 + 0.5
    k.box(rx - 0.22, r0 + 0.1, 1.0, rx + 0.22, r0 + 0.4, 1.12, '#2a2a3e', 'register')
    k.box(rx - 0.18, r0 + 0.08, 1.12, rx + 0.18, r0 + 0.12, 1.35, '#0c2a30', 'register_screen', emit=(CYAN, 0.9))
    for i in range(5):   # candy rack on the counter front
        col = PACK[i]
        k.box(x1 - 0.7 + i * 0.12, r1 - 0.2, 1.0, x1 - 0.6 + i * 0.12, r1 - 0.05, 1.12, col, 'candy', emit=(col, 0.3))
    k.solid(x0, r0, x1, r1)


def fluoro_panel(k, x0, x1, r_face, z):
    k.box(x0, r_face, z - 0.06, x1, r_face + 0.1, z + 0.06, '#c8d0d8', 'fluoro_box')
    k.box(x0 + 0.04, r_face + 0.1, z - 0.04, x1 - 0.04, r_face + 0.11, z + 0.04, '#f0f8ff', 'fluoro', emit=('#e8f4ff', 0.95))
    k.point_light((x0 + x1) / 2, r_face + 0.6, z - 0.2, '#e0eeff', 22, radius=(x1 - x0) / 2)


# ---- noodle bar --------------------------------------------------------------------------------
def noodle_counter(k, x0, x1, r0, r1):
    """Long wooden bar counter, lacquered red front with a neon kick."""
    k.box(x0, r0, 0, x1, r1, 0.95, ('#5a1418', 0.08), 'counter', bevel=0.015)
    k.box(x0 - 0.03, r0 - 0.05, 0.95, x1 + 0.03, r1 + 0.08, 1.02, (WOOD, 0.14), 'counter_top')
    k.box(x0, r1, 0.05, x1, r1 + 0.02, 0.09, shade(PINK, 0.4), 'counter_neon', emit=(PINK, 0.8))
    x = x0 + 0.5
    while x < x1 - 0.3:
        k.box(x - 0.03, r1, 0.15, x + 0.03, r1 + 0.02, 0.88, '#3a0c10', 'counter_slat')
        x += 0.5
    k.solid(x0, r0, x1, r1)


def bowl(k, cx, cr, z, broth='#c88a40', steam=False):
    k.cyl(cx, cr, z, z + 0.08, 0.1, '#e8e0d0', 'bowl', verts=12)
    k.cyl(cx, cr, z + 0.06, z + 0.075, 0.085, broth, 'broth', verts=12)
    k.sphere(cx + 0.03, cr, z + 0.08, 0.025, 0.012, '#f0e8c0', 'egg', segs=6)
    k.box(cx - 0.04, cr - 0.05, z + 0.075, cx - 0.01, cr + 0.03, z + 0.085, '#3a6a3a', 'nori')
    k.tube((cx + 0.08, cr - 0.06, z + 0.09), (cx - 0.05, cr + 0.1, z + 0.14), 0.006, '#c8a070', 'chopsticks', verts=4)


def stock_pot(k, cx, cr, z=0.95):
    """Big steel pot on a gas ring, blue flames."""
    k.cyl(cx, cr, z, z + 0.04, 0.24, '#3a3a40', 'burner', verts=12)
    for i in range(8):
        a = i * math.pi / 4
        k.cone(cx + math.cos(a) * 0.17, cr + math.sin(a) * 0.14, z + 0.02, z + 0.08, 0.02, 0.003, '#60a0ff', 'gas_flame',
               emit=('#4080ff', 0.9), verts=4)
    k.cyl(cx, cr, z + 0.06, z + 0.5, 0.22, ('#9aa0a8', 0.06), 'stock_pot', verts=16)
    k.cyl(cx, cr, z + 0.47, z + 0.5, 0.2, '#c8a060', 'stock', verts=16)
    k.point_light(cx, cr + 0.3, z + 0.1, '#4080ff', 2, radius=0.1, group='flicker')


def paper_lantern(k, cx, cr, z, col='#e03030', s=1.0):
    rx, rz = 0.26 * s, 0.34 * s
    k.cyl(cx, cr, z + rz, 3.2, 0.01, '#1a1a1a', 'lantern_cord', verts=4)
    k.blob(cx, cr, z, rx, rx, rz, shade(col, 0.6), 'paper_lantern', emit=(col, 0.9), segs=16)
    for f in (-0.5, 0.0, 0.5):
        k.cyl(cx, cr, z + f * rz - 0.008, z + f * rz + 0.008, rx * (1 - f * f) ** 0.5 + 0.006, '#3a0a0a', 'lantern_rib', verts=16)
    k.cyl(cx, cr, z + rz * 0.9, z + rz * 1.05, rx * 0.45, '#1a1a1a', 'lantern_cap', verts=10)
    k.cyl(cx, cr, z - rz * 1.05, z - rz * 0.9, rx * 0.45, '#1a1a1a', 'lantern_cap', verts=10)
    k.box(cx - 0.01, cr - 0.01, z - rz * 1.6, cx + 0.01, cr + 0.01, z - rz * 1.05, '#c8a020', 'lantern_tassel')
    k.point_light(cx, cr + 0.2, z - 0.1, '#ff6040', 16, radius=0.2, group='flicker')


def menu_board(k, x0, x1, r_face, z0, z1):
    k.box(x0 - 0.05, r_face, z0 - 0.05, x1 + 0.05, r_face + 0.06, z1 + 0.05, '#100818', 'menu_frame')
    k.box(x0, r_face + 0.06, z0, x1, r_face + 0.065, z1, '#1a0820', 'menu', emit=('#3a1040', 0.9))
    w = (x1 - x0) / 4
    for i in range(4):   # four dishes with a glowing bowl icon and price lines
        cx = x0 + (i + 0.5) * w
        k.cyl_y(cx, r_face + 0.065, r_face + 0.07, z1 - 0.2, 0.09, 0.05, '#f0c060', 'menu_art', emit=('#f0c060', 0.9), verts=12)
        k.box(cx - 0.25, r_face + 0.066, z1 - 0.38, cx + 0.25, r_face + 0.07, z1 - 0.34, PINK, 'menu_text', emit=(PINK, 0.9))
        k.box(cx - 0.15, r_face + 0.066, z1 - 0.48, cx + 0.15, r_face + 0.07, z1 - 0.45, CYAN_L, 'menu_text', emit=(CYAN_L, 0.9))
    k.point_light((x0 + x1) / 2, r_face + 0.6, (z0 + z1) / 2, '#ff70a0', 6, radius=(x1 - x0) / 3, group='flicker')


def spice_shelf(k, x0, x1, r_face, z=1.1):
    for zz in (z, z + 0.42):
        k.box(x0, r_face, zz - 0.04, x1, r_face + 0.26, zz, (WOOD_D, 0.1), 'shelf')
        x = x0 + 0.08
        while x < x1 - 0.06:
            col = k.rng.choice(['#c84020', '#e0a030', '#6a8a3a', '#8a3a1a', '#e0d0b0', '#3a2a1a'])
            h = k.rng.uniform(0.12, 0.22)
            k.cyl(x, r_face + 0.13, zz, zz + h, 0.04, col, 'jar', verts=8)
            k.cyl(x, r_face + 0.13, zz + h, zz + h + 0.025, 0.035, '#c03030', 'jar_lid', verts=8)
            x += 0.1


def kitchen_back(k, x0, x1, r_face):
    """Steel prep counter + range against the back wall behind the bar."""
    k.box(x0, r_face, 0, x1, r_face + 0.6, 0.9, ('#7a8088', 0.06), 'kitchen_counter')
    k.box(x0 - 0.02, r_face, 0.9, x1 + 0.02, r_face + 0.62, 0.95, '#a8b0b8', 'kitchen_top')
    for i in range(int((x1 - x0) / 0.7)):
        x = x0 + 0.15 + i * 0.7
        k.box(x, r_face + 0.6, 0.15, x + 0.55, r_face + 0.61, 0.8, '#6a7078', 'kitchen_door')
        k.box(x + 0.2, r_face + 0.61, 0.7, x + 0.35, r_face + 0.63, 0.73, '#c8d0d8', 'kitchen_handle')
    k.solid(x0, r_face, x1, r_face + 0.6)


# ---- clinic ------------------------------------------------------------------------------------
CLINIC_WALL = ['#1a2230', '#2a3446', '#3e4a60', '#5a6880']


def med_cabinet(k, x0, x1, r_face, h=1.9):
    k.box(x0, r_face, 0, x1, r_face + 0.45, h, ('#c8d0d8', 0.04), 'med_cabinet')
    k.box(x0 + 0.05, r_face + 0.06, 0.85, x1 - 0.05, r_face + 0.1, h - 0.1, '#d0e8f0', 'med_back', emit=('#5a8a98', 0.7))
    for xx in (x0, x1 - 0.05):
        k.box(xx, r_face + 0.06, 0.85, xx + 0.05, r_face + 0.47, h - 0.05, '#e0e8f0', 'med_frame')
    for row in range(3):
        z = 0.95 + row * 0.3
        k.box(x0 + 0.06, r_face + 0.1, z - 0.02, x1 - 0.06, r_face + 0.45, z, '#e0e8f0', 'med_shelf')
        x = x0 + 0.12
        while x < x1 - 0.1:
            col = k.rng.choice((CYAN, PINK, GREEN, YEL))
            k.cyl(x, r_face + 0.35, z, z + 0.14, 0.03, col, 'vial', emit=(col, 0.7), verts=6)
            x += 0.09
    for i in range(2):
        k.box(x0 + 0.06 + i * (x1 - x0) / 2, r_face + 0.45, 0.1, x0 + (i + 1) * (x1 - x0) / 2 - 0.06, r_face + 0.47, 0.75,
              '#b0b8c0', 'med_drawer')
    k.point_light((x0 + x1) / 2, r_face + 0.8, 1.3, '#80e0e8', 5, radius=0.3)
    k.solid(x0, r_face, x1, r_face + 0.5)


def holo_figure(k, cx, r_face, z0=0.9, h=1.1):
    """Projector on the wall with a wire-frame human figure; pink markers."""
    k.box(cx - 0.4, r_face, z0 - 0.1, cx + 0.4, r_face + 0.35, z0, '#2a3446', 'projector')
    k.box(cx - 0.3, r_face + 0.34, z0 - 0.06, cx + 0.3, r_face + 0.36, z0 - 0.03, '#0c2a30', 'projector_led', emit=(CYAN, 0.9))
    r = r_face + 0.25
    c = CYAN_L
    head = [(cx + 0.09 * math.cos(a), z0 + h - 0.12 + 0.11 * math.sin(a)) for a in [i * math.pi / 4 for i in range(8)]]
    neon_shape(k, head, r, c, tube=0.007)
    body = [(cx - 0.18, z0 + h - 0.26), (cx + 0.18, z0 + h - 0.26), (cx + 0.12, z0 + h * 0.45), (cx - 0.12, z0 + h * 0.45)]
    neon_shape(k, body, r, c, tube=0.007)
    for s in (-1, 1):
        neon_shape(k, [(cx + s * 0.18, z0 + h - 0.26), (cx + s * 0.28, z0 + h * 0.5), (cx + s * 0.3, z0 + h * 0.36)], r, c,
                   tube=0.007, closed=False)
        neon_shape(k, [(cx + s * 0.08, z0 + h * 0.45), (cx + s * 0.1, z0 + 0.06)], r, c, tube=0.007, closed=False)
    for (dx, dz) in ((0.0, h - 0.12), (0.12, h * 0.62), (-0.08, h * 0.3)):
        k.sphere(cx + dx, r + 0.01, z0 + dz, 0.025, 0.025, PINK, 'holo_marker', emit=(PINK, 1.0), segs=6)
    k.point_light(cx, r_face + 0.6, z0 + h / 2, CYAN, 5, radius=0.2, group='flicker')
    k.solid(cx - 0.4, r_face, cx + 0.4, r_face + 0.4)


def vitals_terminal(k, x0, x1, r_face, z0=1.0, h=0.7):
    k.box(x0, r_face, z0, x1, r_face + 0.06, z0 + h, '#1a2230', 'terminal')
    k.box(x0 + 0.05, r_face + 0.06, z0 + 0.05, x1 - 0.05, r_face + 0.065, z0 + h - 0.05, '#041014', 'terminal_screen',
          emit=('#062028', 1.0))
    pts = []
    n = 14
    for i in range(n + 1):
        t = i / n
        spike = {5: 0.25, 6: -0.15, 7: 0.05}.get(i, 0.0)
        pts.append((x0 + 0.08 + t * (x1 - x0 - 0.16), z0 + h * 0.62 + spike * h))
    neon_shape(k, pts, r_face + 0.07, GREEN, tube=0.006, closed=False)
    for i in range(3):
        k.box(x0 + 0.1, r_face + 0.066, z0 + 0.1 + i * 0.07, x0 + 0.35 + 0.1 * (i % 2), r_face + 0.07, z0 + 0.13 + i * 0.07,
              CYAN_L, 'terminal_text', emit=(CYAN_L, 0.9))
    k.point_light((x0 + x1) / 2, r_face + 0.5, z0 + h / 2, GREEN, 3, radius=0.2, group='flicker')


def exam_chair(k, cx, cr):
    """Reclined augmentation chair with two articulated arms folded overhead."""
    k.box(cx - 0.18, cr - 0.18, 0, cx + 0.18, cr + 0.18, 0.4, '#c8d0d8', 'chair_base', bevel=0.02)
    k.box(cx - 0.3, cr - 0.45, 0.4, cx + 0.3, cr + 0.4, 0.55, ('#3a4a60', 0.05), 'exam_seat', bevel=0.04)
    k.box(cx - 0.28, cr - 0.55, 0.55, cx + 0.28, cr - 0.3, 1.1, ('#3a4a60', 0.05), 'exam_back', bevel=0.04)
    k.box(cx - 0.3, cr + 0.4, 0.3, cx + 0.3, cr + 0.6, 0.45, ('#3a4a60', 0.05), 'exam_leg', bevel=0.03)
    k.box(cx - 0.29, cr - 0.31, 0.75, cx + 0.29, cr - 0.29, 0.78, shade(CYAN, 0.4), 'exam_neon', emit=(CYAN, 0.7))
    for s in (-1, 1):
        base = (cx + s * 0.45, cr - 0.45, 0.0)
        k.cyl(base[0], base[1], 0, 1.5, 0.04, '#b0b8c0', 'arm_post', verts=8)
        j1 = (base[0], base[1], 1.5)
        j2 = (cx + s * 0.25, cr - 0.1, 1.75)
        tip = (cx + s * 0.1, cr + 0.1, 1.35)
        k.tube(j1, j2, 0.035, '#c8d0d8', 'robot_arm', verts=8)
        k.tube(j2, tip, 0.028, '#c8d0d8', 'robot_arm', verts=8)
        k.sphere(*j2, 0.05, 0.05, '#5a6880', 'robot_joint', segs=8)
        k.cone(tip[0], tip[1], tip[2] - 0.12, tip[2], 0.005, 0.04, '#5a6880', 'robot_tool', verts=8)
        k.sphere(tip[0], tip[1], tip[2] - 0.13, 0.015, 0.015, PINK, 'robot_led', emit=(PINK, 1.0), segs=6)
    k.point_light(cx, cr + 0.3, 1.9, '#e0f0ff', 14, radius=0.3)
    k.solid(cx - 0.5, cr - 0.5, cx + 0.5, cr + 0.6)


def recovery_bed(k, cx, cr):
    """Bed with a patient under a blue sheet, IV stand, monitor."""
    k.box(cx - 0.45, cr - 0.9, 0.0, cx + 0.45, cr + 0.9, 0.5, ('#c8d0d8', 0.04), 'bed_frame', bevel=0.02)
    k.box(cx - 0.42, cr - 0.85, 0.5, cx + 0.42, cr + 0.85, 0.6, '#e8eef4', 'mattress', bevel=0.02)
    k.blob(cx, cr - 0.65, 0.68, 0.18, 0.14, 0.1, '#e8eef4', 'pillow', segs=12)
    k.blob(cx, cr - 0.62, 0.74, 0.11, 0.1, 0.1, ('#d8a07a', 0.04), 'patient_head', segs=12)
    k.blob(cx, cr + 0.1, 0.66, 0.34, 0.75, 0.14, ('#3a6aa0', 0.06), 'sheet', segs=16)
    k.cyl(cx + 0.65, cr - 0.6, 0.0, 1.6, 0.015, '#c8d0d8', 'iv_stand', verts=6)
    k.box(cx + 0.58, cr - 0.62, 1.3, cx + 0.72, cr - 0.58, 1.55, '#c0e0f0', 'iv_bag', emit=('#406070', 0.4))
    k.box(cx - 0.75, cr - 0.75, 0.0, cx - 0.55, cr - 0.55, 1.0, '#c8d0d8', 'monitor_stand')
    k.box(cx - 0.8, cr - 0.72, 1.0, cx - 0.5, cr - 0.55, 1.25, '#1a2230', 'monitor')
    k.box(cx - 0.77, cr - 0.55, 1.03, cx - 0.53, cr - 0.54, 1.22, '#041014', 'monitor_screen', emit=('#062028', 1.0))
    neon_shape(k, [(cx - 0.75, 1.12), (cx - 0.69, 1.12), (cx - 0.66, 1.18), (cx - 0.63, 1.08), (cx - 0.6, 1.12), (cx - 0.55, 1.12)],
               cr - 0.535, GREEN, tube=0.004, closed=False)
    k.solid(cx - 0.5, cr - 0.9, cx + 0.5, cr + 0.9)


def med_drone(k, cx, cr, z=1.0):
    k.blob(cx, cr, z, 0.2, 0.16, 0.12, ('#e8eef4', 0.04), 'med_drone', segs=14)
    k.cyl_y(cx, cr + 0.12, cr + 0.16, z, 0.06, 0.06, '#0c2a30', 'drone_eye', emit=(CYAN, 1.0), verts=12)
    for s in (-1, 1):
        k.cyl(cx + s * 0.26, cr, z + 0.02, z + 0.05, 0.1, '#5a6880', 'rotor', verts=12)
        k.tube((cx + s * 0.15, cr, z + 0.03), (cx + s * 0.26, cr, z + 0.03), 0.015, '#5a6880', 'rotor_arm', verts=5)
    k.box(cx - 0.05, cr - 0.02, z - 0.16, cx + 0.05, cr + 0.02, z - 0.1, '#c8d0d8', 'drone_claw')
    k.point_light(cx, cr + 0.3, z, CYAN, 3, radius=0.05, group='flicker')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


# ---- pawn shop ---------------------------------------------------------------------------------------
def pawn_counter(k, x0, x1, r0, r1, bars=True):
    k.box(x0, r0, 0, x1, r1, 0.95, (WOOD_D, 0.12), 'counter', bevel=0.015)
    k.box(x0 - 0.03, r0 - 0.03, 0.95, x1 + 0.03, r1 + 0.03, 1.0, '#3a3a40', 'counter_top')
    if bars:   # security cage over the counter, a gap to pass things through
        k.box(x0, r1 - 0.06, 1.9, x1, r1 - 0.02, 1.95, '#5a5a62', 'cage_rail')
        x = x0 + 0.05
        while x <= x1 - 0.04:
            k.box(x, r1 - 0.06, 1.25, x + 0.025, r1 - 0.035, 1.9, '#6a6a72', 'cage_bar')
            x += 0.16
        k.box(x0, r1 - 0.06, 1.22, x1, r1 - 0.02, 1.26, '#5a5a62', 'cage_rail')
    k.solid(x0, r0, x1, r1)


def junk_shelf(k, x0, x1, r_face, levels=(0.9, 1.35, 1.8)):
    for z in levels:
        k.box(x0, r_face, z - 0.04, x1, r_face + 0.32, z, (WOOD_D, 0.12), 'shelf')
        x = x0 + 0.08
        while x < x1 - 0.1:
            kind = k.rng.random()
            if kind < 0.3:     # radio / music player
                w = 0.22
                k.box(x, r_face + 0.06, z, x + w, r_face + 0.26, z + 0.14, k.rng.choice(('#6a5a4a', '#2a2a30', '#8a3a2a')), 'junk')
                k.cyl_y(x + 0.06, r_face + 0.26, r_face + 0.27, z + 0.07, 0.035, 0.035, '#1a1a1a', 'speaker', verts=8)
            elif kind < 0.5:   # bottle / lamp
                w = 0.1
                col = k.rng.choice(('#3a6a5a', '#7a3a2a', BRASS))
                k.cyl(x + 0.05, r_face + 0.16, z, z + 0.24, 0.035, col, 'junk', verts=8)
            elif kind < 0.7:   # starship model
                w = 0.28
                k.blob(x + 0.14, r_face + 0.16, z + 0.06, 0.13, 0.05, 0.04, '#9aa0aa', 'junk', segs=8)
                k.cone(x + 0.03, r_face + 0.16, z + 0.04, z + 0.08, 0.03, 0.03, '#40c8d8', 'junk_glow', emit=(CYAN, 0.6), verts=6)
            else:              # box / book
                w = k.rng.uniform(0.1, 0.2)
                k.box(x, r_face + 0.05, z, x + w, r_face + 0.27, z + k.rng.uniform(0.08, 0.22),
                      (k.rng.choice(('#5a4a3a', '#3a3a5a', '#6a2a2a', '#4a5a3a')), 0.1), 'junk')
            x += w + 0.04


def wall_clock(k, cx, r_face, z=1.55):
    k.cyl_y(cx, r_face, r_face + 0.05, z, 0.2, 0.2, BRASS, 'clock', verts=18)
    k.cyl_y(cx, r_face + 0.05, r_face + 0.06, z, 0.17, 0.17, '#e8dcc0', 'clock_face', verts=18)
    k.box(cx - 0.01, r_face + 0.06, z, cx + 0.01, r_face + 0.07, z + 0.13, '#1a1414', 'clock_hand')
    k.box(cx, r_face + 0.06, z - 0.01, cx + 0.1, r_face + 0.07, z + 0.01, '#1a1414', 'clock_hand')


def safe(k, cx, cr):
    k.box(cx - 0.36, cr - 0.32, 0, cx + 0.36, cr + 0.32, 0.9, ('#2a2a30', 0.06), 'safe', bevel=0.03)
    k.box(cx - 0.3, cr + 0.32, 0.08, cx + 0.3, cr + 0.33, 0.82, '#3a3a42', 'safe_door')
    k.cyl_y(cx, cr + 0.33, cr + 0.37, 0.55, 0.09, 0.09, '#9aa0aa', 'safe_dial', verts=14)
    k.box(cx + 0.14, cr + 0.33, 0.3, cx + 0.18, cr + 0.38, 0.45, '#9aa0aa', 'safe_handle')
    k.solid(cx - 0.4, cr - 0.35, cx + 0.4, cr + 0.35)


def display_case(k, cx, cr, w=1.7, items=(('#e0b040', 'coin'), ('#3070f0', 'gem'))):
    x0, x1 = cx - w / 2, cx + w / 2
    k.box(x0, cr - 0.3, 0, x1, cr + 0.3, 0.75, (WOOD_D, 0.12), 'case', bevel=0.015)
    k.box(x0 + 0.04, cr - 0.26, 0.75, x1 - 0.04, cr + 0.26, 0.77, '#4a1a2a', 'velvet')
    for i, (col, kind) in enumerate(items):
        x = x0 + (i + 1) * w / (len(items) + 1)
        if kind == 'coin':
            k.cyl(x, cr, 0.77, 0.79, 0.07, col, 'item', emit=(col, 0.3), verts=12)
        elif kind == 'gem':
            k.blob(x, cr, 0.82, 0.06, 0.06, 0.05, col, 'item', emit=(col, 0.7), segs=6, smooth=False)
        elif kind == 'orb':
            k.sphere(x, cr, 0.84, 0.06, 0.06, col, 'item', emit=(col, 0.8), segs=10)
        else:  # chip
            k.box(x - 0.07, cr - 0.05, 0.77, x + 0.07, cr + 0.05, 0.8, col, 'item', emit=(col, 0.6))
    # glass top: frame only (the glass itself is left out so the goods read)
    for (a, b) in ((cr - 0.3, cr - 0.27), (cr + 0.27, cr + 0.3)):
        k.box(x0, a, 0.75, x1, b, 0.98, '#9aa0aa', 'case_frame')
    for (a, b) in ((x0, x0 + 0.03), (x1 - 0.03, x1)):
        k.box(a, cr - 0.3, 0.75, b, cr + 0.3, 0.98, '#9aa0aa', 'case_frame')
    k.point_light(cx, cr + 0.1, 1.2, '#ffe0a0', 3, radius=0.2)
    k.solid(x0, cr - 0.3, x1, cr + 0.3)


def caged_bulb(k, cx, cr, z=2.2, energy=30):
    k.cyl(cx, cr, z + 0.2, 3.0, 0.01, '#1a1a1a', 'cord', verts=4)
    k.sphere(cx, cr, z, 0.07, 0.09, '#fff0c0', 'bulb', emit=('#ffd890', 1.0), segs=10)
    for i in range(6):
        a = i * math.pi / 3
        k.tube((cx + math.cos(a) * 0.11, cr + math.sin(a) * 0.11, z - 0.12), (cx + math.cos(a) * 0.11, cr + math.sin(a) * 0.11, z + 0.15),
               0.006, '#3a3a40', 'cage', verts=4)
    k.point_light(cx, cr, z - 0.1, '#ffd090', energy, radius=0.08, group='flicker')


def junk_pile(k, cx, cr):
    """Stacked crates, an old CRT on top, a tyre, pipes and cable."""
    k.box(cx - 0.32, cr - 0.25, 0.0, cx + 0.22, cr + 0.25, 0.42, ('#5a4a3a', 0.15), 'junk_crate', bevel=0.01)
    k.box(cx - 0.3, cr + 0.25, 0.03, cx + 0.2, cr + 0.26, 0.39, '#3a2e22', 'junk_crate_slat')
    k.box(cx - 0.22, cr - 0.18, 0.42, cx + 0.12, cr + 0.16, 0.68, ('#3a3a5a', 0.1), 'junk_box', bevel=0.01)
    k.box(cx - 0.18, cr - 0.12, 0.68, cx + 0.12, cr + 0.14, 0.92, ('#c8bca0', 0.06), 'junk_tv', bevel=0.02)
    k.box(cx - 0.14, cr + 0.14, 0.72, cx + 0.06, cr + 0.15, 0.88, '#0a1a14', 'junk_tv_screen', emit=('#1a4a30', 0.5))
    k.cyl(cx + 0.32, cr + 0.1, 0.0, 0.14, 0.2, '#1a1a1a', 'tyre', verts=14)
    k.cyl(cx + 0.32, cr + 0.1, 0.14, 0.145, 0.1, '#3a3a3a', 'tyre_hub', verts=10)
    k.tube((cx - 0.4, cr + 0.3, 0.04), (cx + 0.1, cr + 0.38, 0.04), 0.035, '#6a6a72', 'pipe', verts=6)
    k.tube((cx + 0.15, cr - 0.3, 0.05), (cx + 0.4, cr + 0.32, 0.03), 0.015, '#14181c', 'cable', verts=5)
    k.sphere(cx - 0.05, cr - 0.05, 0.98, 0.05, 0.05, '#c8a020', 'junk_bulb', segs=6)
    k.solid(cx - 0.35, cr - 0.35, cx + 0.35, cr + 0.35)


def robot_torso(k, cx, cr):
    """A gutted service robot on a stand, mid-repair."""
    k.cyl(cx, cr, 0, 0.05, 0.3, '#2a2a30', 'stand_base', verts=12)
    k.cyl(cx, cr, 0.05, 0.6, 0.05, '#3a3a42', 'stand', verts=8)
    k.box(cx - 0.25, cr - 0.18, 0.6, cx + 0.25, cr + 0.18, 1.1, ('#c8c0b0', 0.06), 'robot_body', bevel=0.04)
    k.box(cx - 0.15, cr + 0.18, 0.7, cx + 0.15, cr + 0.19, 1.0, '#1a1a1a', 'robot_open')
    for i in range(4):
        k.tube((cx - 0.1 + i * 0.07, cr + 0.19, 0.95), (cx - 0.12 + i * 0.08, cr + 0.3, 0.62), 0.008,
               (RED, YEL, CYAN, GREEN)[i], 'wire', verts=4)
    k.blob(cx, cr, 1.25, 0.16, 0.14, 0.14, ('#c8c0b0', 0.06), 'robot_head', segs=12)
    k.box(cx - 0.1, cr + 0.12, 1.24, cx + 0.1, cr + 0.14, 1.29, '#0c2a30', 'robot_visor', emit=(CYAN, 0.6))
    k.tube((cx + 0.25, cr, 1.0), (cx + 0.45, cr + 0.1, 0.75), 0.04, '#9a9488', 'robot_arm', verts=6)
    k.solid(cx - 0.35, cr - 0.3, cx + 0.35, cr + 0.3)


# ---- tech repair -------------------------------------------------------------------------------------
def repair_bench(k, x0, x1, r_face, d=0.75, h=0.85):
    k.box(x0, r_face, h - 0.06, x1, r_face + d, h, ('#5a6068', 0.06), 'bench_top')
    k.box(x0, r_face + d - 0.02, h - 0.1, x1, r_face + d + 0.01, h - 0.06, shade(YEL, 0.5), 'bench_edge', emit=(YEL, 0.3))
    for x in (x0 + 0.05, x1 - 0.12, (x0 + x1) / 2):
        k.box(x, r_face + 0.05, 0, x + 0.07, r_face + d - 0.05, h - 0.06, '#2a2a30', 'bench_leg')
    k.box(x0 + 0.05, r_face + 0.05, 0.15, x1 - 0.05, r_face + d - 0.05, 0.2, '#3a3a42', 'bench_shelf')
    x = x0 + 0.2
    while x < x1 - 0.5:   # boards, tools, a soldering iron
        k.box(x, r_face + 0.2, h, x + 0.35, r_face + 0.45, h + 0.015, '#1a5a2a', 'circuit')
        for i in range(4):
            k.box(x + 0.04 + i * 0.07, r_face + 0.25, h + 0.015, x + 0.08 + i * 0.07, r_face + 0.3, h + 0.04, '#1a1a1a', 'chip')
        k.box(x + 0.05, r_face + 0.38, h + 0.015, x + 0.08, r_face + 0.41, h + 0.025, YEL, 'led', emit=(YEL, 0.9))
        x += 0.9
    for i in range(int((x1 - x0) / 1.4)):
        tx = x0 + 0.7 + i * 1.4
        k.tube((tx, r_face + 0.55, h + 0.02), (tx + 0.25, r_face + 0.5, h + 0.04), 0.012, '#c84020', 'tool', verts=5)
        k.tube((tx + 0.25, r_face + 0.5, h + 0.04), (tx + 0.35, r_face + 0.48, h + 0.045), 0.004, '#c8c8c8', 'tool_tip', verts=4)
    k.solid(x0, r_face, x1, r_face + d)


def parts_bins(k, x0, x1, r_face, z0=1.0, z1=1.9):
    k.box(x0, r_face, z0, x1, r_face + 0.28, z1, ('#3a3a42', 0.05), 'bin_rack')
    rows = 4
    cols = int((x1 - x0) / 0.16)
    for i in range(rows):
        for j in range(cols):
            x = x0 + 0.02 + j * (x1 - x0 - 0.04) / cols
            z = z0 + 0.02 + i * (z1 - z0 - 0.04) / rows
            col = ('#2a5a8a', '#8a2a2a', '#c8a020', '#3a7a3a')[(i + j) % 4]
            k.box(x + 0.01, r_face + 0.28, z + 0.01, x + (x1 - x0 - 0.04) / cols - 0.01, r_face + 0.3, z + (z1 - z0 - 0.04) / rows - 0.01,
                  col, 'bin')
            k.box(x + 0.04, r_face + 0.3, z + 0.03, x + 0.08, r_face + 0.31, z + 0.05, '#e8e8e8', 'bin_label')


def work_lamp(k, cx, r_face, z=1.0):
    k.box(cx - 0.06, r_face, z, cx + 0.06, r_face + 0.06, z + 0.12, '#2a2a30', 'lamp_mount')
    j = (cx + 0.1, r_face + 0.35, z + 0.6)
    k.tube((cx, r_face + 0.06, z + 0.06), j, 0.018, '#c8a020', 'lamp_arm', verts=6)
    tip = (cx + 0.05, r_face + 0.6, z + 0.45)
    k.tube(j, tip, 0.018, '#c8a020', 'lamp_arm', verts=6)
    k.cone(tip[0], tip[1], tip[2] - 0.1, tip[2] + 0.02, 0.1, 0.04, '#2a2a30', 'lamp_head', verts=10)
    k.cyl(tip[0], tip[1], tip[2] - 0.11, tip[2] - 0.09, 0.09, '#fff0c0', 'lamp_glow', emit=('#ffe0a0', 1.0), verts=10)
    k.point_light(tip[0], tip[1] + 0.05, tip[2] - 0.2, '#ffe8c0', 14, radius=0.08)


def hover_drone(k, cx, cr):
    """Scavenger drone on a repair stand, chest plate off, sparking."""
    k.cyl(cx, cr, 0, 0.45, 0.06, '#3a3a42', 'stand', verts=8)
    k.cyl(cx, cr, 0, 0.04, 0.3, '#2a2a30', 'stand_base', verts=12)
    z = 0.75
    k.blob(cx, cr, z, 0.32, 0.26, 0.2, ('#8a7a5a', 0.1), 'drone', segs=16)
    k.box(cx - 0.14, cr + 0.15, z - 0.1, cx + 0.14, cr + 0.25, z + 0.08, '#1a1a1a', 'drone_open')
    for i in range(5):
        k.tube((cx - 0.1 + i * 0.05, cr + 0.22, z + 0.05), (cx - 0.08 + i * 0.04, cr + 0.32, z - 0.2), 0.008,
               k.rng.choice((RED, YEL, CYAN, GREEN)), 'wire', verts=4)
    k.cyl_y(cx, cr + 0.2, cr + 0.26, z + 0.12, 0.05, 0.05, '#0c2a30', 'drone_eye', emit=(RED, 0.5), verts=10)
    for s in (-1, 1):
        k.tube((cx + s * 0.25, cr, z + 0.05), (cx + s * 0.5, cr, z + 0.15), 0.025, '#5a5040', 'drone_arm', verts=6)
        k.cyl(cx + s * 0.55, cr, z + 0.14, z + 0.18, 0.13, '#3a3a42', 'drone_rotor', verts=12)
    k.box(cx + 0.45, cr + 0.4, 0.0, cx + 0.75, cr + 0.6, 0.03, '#8a7a5a', 'chest_plate')
    for (dx, dz) in ((0.05, 0.03), (-0.04, 0.08), (0.08, 0.1)):
        k.sphere(cx + dx, cr + 0.3, z + dz, 0.012, 0.012, '#fff8c0', 'spark', emit=('#fff0a0', 1.0), segs=4)
    k.point_light(cx, cr + 0.5, z + 0.1, '#80c0ff', 3, radius=0.05, group='flicker')
    k.solid(cx - 0.4, cr - 0.35, cx + 0.4, cr + 0.35)


def cable_coil(k, cx, r_face, z=1.5):
    k.box(cx - 0.03, r_face, z + 0.2, cx + 0.03, r_face + 0.15, z + 0.25, '#5a5a62', 'hook')
    for i in range(5):
        k.cyl_y(cx, r_face + 0.06 + i * 0.012, r_face + 0.072 + i * 0.012, z, 0.22 - i * 0.012, 0.25 - i * 0.012,
                '#1a1a1a' if i % 2 else '#c84020', 'cable_coil', verts=18)
    k.cyl_y(cx, r_face + 0.05, r_face + 0.14, z, 0.12, 0.14, '#3a3a40', 'cable_coil_in', verts=14)


def screen_stack(k, x0, x1, r_face, z0=0.95):
    """Monitors on the wall above the bench running diagnostics."""
    w = (x1 - x0) / 2
    for i in range(2):
        cx = x0 + (i + 0.5) * w
        k.box(cx - w / 2 + 0.04, r_face, z0, cx + w / 2 - 0.04, r_face + 0.08, z0 + 0.55, '#1a1a24', 'monitor')
        k.box(cx - w / 2 + 0.08, r_face + 0.08, z0 + 0.04, cx + w / 2 - 0.08, r_face + 0.085, z0 + 0.51, '#041014', 'screen',
              emit=('#08202a', 1.0))
        for j in range(5):
            col = RED if (i == 1 and j == 1) else GREEN
            k.box(cx - w / 2 + 0.12, r_face + 0.086, z0 + 0.42 - j * 0.07, cx - w / 2 + 0.12 + k.rng.uniform(0.2, w - 0.3),
                  r_face + 0.09, z0 + 0.44 - j * 0.07, col, 'screen_text', emit=(col, 0.9))
    k.point_light((x0 + x1) / 2, r_face + 0.6, z0 + 0.3, GREEN, 4, radius=0.3, group='flicker')


def med_cart(k, cx, cr):
    """Steel trolley: instruments on top, a tablet, drawers."""
    k.box(cx - 0.3, cr - 0.2, 0.75, cx + 0.3, cr + 0.2, 0.79, '#c8d0d8', 'cart_top')
    k.box(cx - 0.28, cr - 0.18, 0.3, cx + 0.28, cr + 0.18, 0.65, ('#a8b0b8', 0.04), 'cart_drawers')
    for i in range(3):
        k.box(cx - 0.26, cr + 0.18, 0.34 + i * 0.1, cx + 0.26, cr + 0.19, 0.42 + i * 0.1, '#d8e0e8', 'cart_drawer')
    for (dx, dr) in ((-0.26, -0.16), (0.22, -0.16), (-0.26, 0.12), (0.22, 0.12)):
        k.box(cx + dx, cr + dr, 0.05, cx + dx + 0.04, cr + dr + 0.04, 0.75, '#9aa0a8', 'cart_leg')
        k.sphere(cx + dx + 0.02, cr + dr + 0.02, 0.03, 0.03, 0.03, '#2a2a30', 'cart_wheel', segs=6)
    k.box(cx - 0.22, cr - 0.12, 0.79, cx + 0.02, cr + 0.1, 0.8, '#0c2a30', 'tablet', emit=(CYAN, 0.7))
    for i in range(3):
        k.tube((cx + 0.06 + i * 0.06, cr - 0.1, 0.8), (cx + 0.08 + i * 0.06, cr + 0.12, 0.8), 0.008, '#e0e8f0', 'instrument', verts=4)
    k.solid(cx - 0.3, cr - 0.25, cx + 0.3, cr + 0.25)


def curtain(k, x0, x1, r, h=1.9, col='#7a9ab8'):
    """Privacy curtain on a ceiling rail, gathered in folds."""
    k.box(x0 - 0.05, r - 0.03, h, x1 + 0.05, r + 0.03, h + 0.04, '#c8d0d8', 'curtain_rail')
    x = x0
    i = 0
    while x < x1 - 0.05:
        k.box(x, r - 0.04 + 0.04 * (i % 2), 0.15, x + 0.12, r + 0.04 * (i % 2), h, (shade(col, 0.92 + 0.1 * (i % 2)), 0.05), 'curtain')
        x += 0.12
        i += 1
