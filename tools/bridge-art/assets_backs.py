"""The Backs — Arcadia behind the District's shopfronts (scenekit, bpy):
the alley's back walls, NULL's shipping container and what's inside it.
Tile units: x = column, r = row (toward the camera), z = height.
"""
import math

from scenekit import shade
import assets_cyber as Y
import assets_district as D

C45 = math.cos(math.radians(45))
TEAL = '#1e4a4a'
RUST = '#6a3a22'


# ---- the alley ----------------------------------------------------------------------------------
def back_wall(k, x0, x1, r_face, floors, floor_h=1.15, wall='#2a2430', clad='brick', lit=0.35, base=1.25, windows=True):
    """The back of a building: a slab, its cladding, small back windows
    (fewer lit than out front), a parapet. Returns the roof height."""
    h = base + floors * floor_h
    k.box(x0, r_face - 0.6, 0, x1, r_face, h, (wall, 0.08), 'back_wall')
    k.box(x0 - 0.02, r_face - 0.6, h, x1 + 0.02, r_face + 0.06, h + 0.12, shade(wall, 0.7), 'parapet')
    D.cladding(k, x0, x1, r_face, 0.0, h, wall, clad, k.rng)
    k.box(x0, r_face, 0, x1, r_face + 0.04, 0.25, shade(wall, 0.6), 'plinth')
    if windows:
        for f in range(1, floors + 1):
            D.window_row(k, x0 + 0.3, x1 - 0.3, r_face, base + (f - 1) * floor_h + 0.25, h=0.5, lit=lit, rng=k.rng)
    return h


def back_door(k, cx, r_face, w=0.9, glow='#ffd890', label_col=None, transom=True):
    """A steel back door in a frame, its transom lit from inside, a step."""
    k.box(cx - w / 2 - 0.08, r_face, 0, cx + w / 2 + 0.08, r_face + 0.06, 2.1, '#16141c', 'door_frame')
    k.box(cx - w / 2, r_face + 0.05, 0.02, cx + w / 2, r_face + 0.08, 1.8, ('#3a3a46', 0.08), 'back_door')
    k.box(cx + w / 2 - 0.16, r_face + 0.08, 0.9, cx + w / 2 - 0.08, r_face + 0.1, 0.96, '#8a8a94', 'door_bar')
    if transom:
        k.box(cx - w / 2, r_face + 0.05, 1.84, cx + w / 2, r_face + 0.08, 2.04, '#1a1410', 'transom', emit=(glow, 0.85))
    k.box(cx - w / 2 - 0.1, r_face, 0, cx + w / 2 + 0.1, r_face + 0.3, 0.1, ('#34303e', 0.08), 'door_step')
    k.point_light(cx, r_face + 0.5, 1.9, glow, 10, radius=0.15, group='flicker')
    if label_col:
        k.box(cx - 0.2, r_face + 0.06, 2.16, cx + 0.2, r_face + 0.1, 2.3, '#1a0606', 'exit_sign', emit=(label_col, 1.0))


def wall_lamp(k, cx, r_face, z=2.5, col='#ffb060', energy=55):
    """A caged lamp on a bracket over a back door, lighting the lane."""
    k.box(cx - 0.03, r_face, z + 0.05, cx + 0.03, r_face + 0.3, z + 0.1, '#2a2832', 'lamp_bracket')
    k.cone(cx, r_face + 0.3, z - 0.02, z + 0.1, 0.16, 0.05, '#2a2832', 'lamp_shade', verts=10)
    k.sphere(cx, r_face + 0.3, z - 0.03, 0.06, 0.05, '#fff0c0', 'lamp_bulb', emit=(col, 1.0), segs=8)
    k.point_light(cx, r_face + 0.6, z - 0.2, col, energy, radius=0.12, group='flicker')


def pipes(k, x, r_face, z0, z1, n=2, col='#3a3a44'):
    for i in range(n):
        xx = x + i * 0.14
        k.tube((xx, r_face + 0.08, z0), (xx, r_face + 0.08, z1), 0.04, (col, 0.06), 'pipe', verts=8)
        for z in (z0 + 0.5, (z0 + z1) / 2, z1 - 0.4):
            k.box(xx - 0.06, r_face, z, xx + 0.06, r_face + 0.13, z + 0.04, '#24222c', 'pipe_clamp')


def extractor(k, cx, r_face, z, rad=0.32):
    """The kitchen's extractor fan, greasy, turning."""
    k.box(cx - rad - 0.06, r_face, z - rad - 0.06, cx + rad + 0.06, r_face + 0.2, z + rad + 0.06, ('#5a5a62', 0.08), 'extractor')
    k.cyl_y(cx, r_face + 0.2, r_face + 0.21, z, rad, rad, '#16141a', 'extractor_hole', verts=18)
    for i in range(5):
        a = i * 2 * math.pi / 5 + 0.3
        k.tube((cx, r_face + 0.215, z), (cx + math.cos(a) * rad * 0.9, r_face + 0.215, z + math.sin(a) * rad * 0.9), 0.04,
               '#4a4a52', 'fan_blade', verts=4)
    k.cyl_y(cx, r_face + 0.215, r_face + 0.23, z, 0.06, 0.06, '#8a8a94', 'fan_hub', verts=8)


def sign_back(k, x0, x1, r_face, z0, z1, spill='#f078a8'):
    """The back of a lightbox sign that's lit on the street side: a grey
    box on brackets, light leaking round its edges."""
    k.box(x0, r_face + 0.1, z0, x1, r_face + 0.3, z1, ('#4a4652', 0.08), 'sign_back')
    for x in (x0 + 0.1, x1 - 0.14):
        k.box(x, r_face, (z0 + z1) / 2 - 0.03, x + 0.04, r_face + 0.1, (z0 + z1) / 2 + 0.03, '#2a2832', 'sign_bracket')
    k.box(x0 - 0.02, r_face + 0.29, z1, x1 + 0.02, r_face + 0.31, z1 + 0.03, shade(spill, 0.4), 'sign_spill', emit=(spill, 0.9))
    k.box(x0 - 0.02, r_face + 0.29, z0 - 0.03, x1 + 0.02, r_face + 0.31, z0, shade(spill, 0.4), 'sign_spill', emit=(spill, 0.9))


def crate_stack(k, x0, r0, n=3, s=0.55, tone='#6a5a40'):
    for i in range(n):
        dx = (i % 2) * s
        z = (i // 2) * s * 0.85
        k.box(x0 + dx + 0.02, r0, z, x0 + dx + s - 0.02, r0 + s, z + s * 0.85, (shade(tone, k.rng.uniform(0.85, 1.1)), 0.14), 'crate')
        k.box(x0 + dx + 0.02, r0 + s - 0.01, z + s * 0.4, x0 + dx + s - 0.02, r0 + s + 0.01, z + s * 0.45, shade(tone, 0.6), 'crate_slat')
    k.solid(x0, r0, x0 + 2 * s, r0 + s)


def cabbage_crate(k, cx, cr):
    k.box(cx - 0.3, cr - 0.22, 0, cx + 0.3, cr + 0.22, 0.32, ('#7a6040', 0.14), 'crate')
    for i in range(6):
        k.sphere(cx - 0.18 + (i % 3) * 0.18, cr - 0.08 + (i // 3) * 0.16, 0.36, 0.1, 0.08, ('#6a9a4a', 0.15), 'cabbage', segs=8)
    k.solid(cx - 0.3, cr - 0.22, cx + 0.3, cr + 0.22)


def upturned_crate(k, cx, cr):
    """A crate to sit on (the cook's)."""
    k.box(cx - 0.26, cr - 0.22, 0, cx + 0.26, cr + 0.22, 0.42, ('#8a7050', 0.14), 'crate')
    k.box(cx - 0.26, cr + 0.21, 0.18, cx + 0.26, cr + 0.23, 0.24, '#5a4630', 'crate_slat')
    k.solid(cx - 0.3, cr - 0.25, cx + 0.3, cr + 0.25)


def cat(k, cx, cr, z, col='#1a1a1e'):
    """A stray, curled up, one eye open."""
    k.blob(cx, cr, z + 0.09, 0.2, 0.13, 0.09, (col, 0.1), 'cat', segs=10)
    k.blob(cx + 0.15, cr + 0.04, z + 0.13, 0.08, 0.07, 0.07, (col, 0.1), 'cat_head', segs=8)
    for dx in (0.12, 0.19):
        k.cone(cx + dx, cr + 0.04, z + 0.17, z + 0.24, 0.025, 0.0, col, 'cat_ear', verts=4)
    k.sphere(cx + 0.18, cr + 0.11, z + 0.14, 0.012, 0.012, '#1a1a08', 'cat_eye', emit=('#e8e040', 1.0), segs=4)
    k.tube((cx - 0.18, cr + 0.06, z + 0.04), (cx + 0.02, cr + 0.15, z + 0.03), 0.025, col, 'cat_tail', verts=5)


def gate_open(k, x0, x1, r, h=1.35):
    """The alley gate from the inside: brick piers, the barred leaf swung
    back against the wall, the cut chain hanging off it."""
    for x in (x0 - 0.36, x1):
        k.box(x, r, 0, x + 0.36, r + 0.6, h, ('#3a2a2a', 0.08), 'gate_pier')
        k.box(x - 0.03, r - 0.03, h, x + 0.39, r + 0.63, h + 0.08, '#2a1e1e', 'pier_cap')
    for i in range(8):
        xx = x1 - 0.06 - i * 0.12
        k.box(xx, r - 0.3 - i * 0.0, 0.05, xx + 0.035, r - 0.27, h - 0.1, '#4a4a52', 'gate_bar')
    k.box(x1 - 0.95, r - 0.31, h - 0.18, x1 - 0.02, r - 0.27, h - 0.12, '#4a4a52', 'gate_rail')
    k.box(x1 - 0.95, r - 0.31, 0.15, x1 - 0.02, r - 0.27, 0.2, '#4a4a52', 'gate_rail')
    k.tube((x1 - 0.5, r - 0.26, 0.7), (x1 - 0.4, r - 0.2, 0.25), 0.02, '#8a8a90', 'chain', verts=4)


def low_wall(k, x0, x1, r, h=0.5, wall='#2a2030'):
    k.box(x0, r, 0, x1, r + 0.6, h, (wall, 0.08), 'low_wall')
    k.box(x0 - 0.02, r - 0.02, h, x1 + 0.02, r + 0.62, h + 0.06, shade(wall, 0.7), 'low_wall_cap')


def container(k, x0, x1, r0, r1, door=(0.0, 0.0), h=2.55, col=TEAL):
    """NULL's shipping container: corrugated steel, rust on the seams, its
    doors at the front — one swung open on a magenta glow."""
    k.box(x0, r0, 0.0, x1, r1, h, (col, 0.1), 'container')
    k.box(x0 - 0.03, r0, h - 0.06, x1 + 0.03, r1 + 0.03, h + 0.04, shade(col, 0.7), 'container_rail')
    k.box(x0 - 0.03, r1 - 0.06, 0.0, x1 + 0.03, r1 + 0.03, 0.12, shade(col, 0.7), 'container_rail')
    x = x0 + 0.1
    ribs = []
    while x < x1 - 0.08:          # corrugation on the long side facing the camera
        ribs.append((x, r1, 0.15, x + 0.06, r1 + 0.04, h - 0.1))
        x += 0.18
    k.boxes(ribs, shade(col, 1.25), 'corrugation')
    for xx in (x0, x1 - 0.12):
        k.box(xx, r1 - 0.02, 0.0, xx + 0.12, r1 + 0.05, h + 0.04, shade(col, 0.6), 'corner_post')
    for i in range(6):            # rust streaks
        xx = k.rng.uniform(x0 + 0.3, x1 - 0.3)
        k.box(xx, r1 + 0.04, k.rng.uniform(0.2, 0.8), xx + 0.05, r1 + 0.045, h - 0.15, (RUST, 0.2), 'rust')
    dx0, dx1 = door
    if dx1 > dx0:
        k.box(dx0, r1 - 0.02, 0.12, dx1, r1 + 0.06, h - 0.12, '#14061a', 'doorway', emit=('#b02090', 0.55))
        mid = (dx0 + dx1) / 2
        k.box(dx0 - 0.05, r1 + 0.05, 0.12, mid, r1 + 0.09, h - 0.12, (shade(col, 0.9), 0.1), 'door_leaf')
        for z in (0.5, 1.4, 2.1):
            k.box(dx0 + 0.05, r1 + 0.09, z, mid - 0.05, r1 + 0.11, z + 0.04, '#2a2a30', 'door_bar')
        # the other leaf swung right open, flat against the container
        k.box(mid + (dx1 - mid) + 0.04, r1 + 0.06, 0.12, mid + 2 * (dx1 - mid) + 0.04, r1 + 0.1, h - 0.12, (shade(col, 0.9), 0.1),
              'door_leaf')
        k.point_light(mid + 0.2, r1 + 0.8, 1.2, '#e040c0', 45, radius=0.3, group='flicker')
    k.solid(x0, r0, x1, r1)


def dish_on(k, cx, cr, z):
    D.dish(k, cx, cr, z)


# ---- the den (inside the container) ---------------------------------------------------------------
def corrugated_room(k, x0, x1, r_face, h, col='#1a3a3a', side=(None, None)):
    """The container's inside: a corrugated back wall with ribs."""
    k.box(x0, r_face - 0.4, 0, x1, r_face, h, (col, 0.1), 'den_wall')
    x = x0 + 0.08
    ribs = []
    while x < x1 - 0.05:
        ribs.append((x, r_face, 0.0, x + 0.07, r_face + 0.04, h))
        x += 0.2
    k.boxes(ribs, shade(col, 1.2), 'den_rib')
    k.box(x0 - 0.02, r_face - 0.4, h, x1 + 0.02, r_face + 0.05, h + 0.06, shade(col, 0.6), 'den_cap')


def screen_wall(k, x0, x1, r_face, z0, z1, rng=None):
    """Mismatched monitors stacked up the wall, each showing something."""
    rng = rng or k.rng
    z = z0
    while z < z1 - 0.25:
        x = x0
        rh = rng.uniform(0.32, 0.45)
        while x < x1 - 0.3:
            w = rng.uniform(0.38, 0.62)
            if x + w > x1:
                break
            col = rng.choice(('#40e0d0', '#e040c0', '#60e080', '#e8c040', '#6080ff', '#40e0d0'))
            k.box(x, r_face, z, x + w, r_face + 0.22, z + rh - 0.03, ('#16141c', 0.06), 'monitor')
            k.box(x + 0.03, r_face + 0.22, z + 0.03, x + w - 0.03, r_face + 0.225, z + rh - 0.06, '#0a0a14', 'monitor_screen',
                  emit=(shade(col, 0.55), 0.9))
            for i in range(3):     # lines of whatever is on it
                ln = rng.uniform(0.3, 0.85) * (w - 0.12)
                zz = z + 0.07 + i * (rh - 0.14) / 3
                k.box(x + 0.06, r_face + 0.226, zz, x + 0.06 + ln, r_face + 0.23, zz + 0.025, '#0a0a14', 'monitor_text',
                      emit=(col, 1.0))
            x += w + rng.uniform(0.02, 0.06)
        z += rh
    k.point_light((x0 + x1) / 2, r_face + 1.0, (z0 + z1) / 2, '#80a0ff', 30, radius=0.5, group='flicker')


def hacker_desk(k, x0, x1, r_face, d=0.7, h=0.75):
    k.box(x0, r_face, h - 0.05, x1, r_face + d, h, ('#2a2a34', 0.06), 'desk_top')
    for x in (x0 + 0.05, x1 - 0.1):
        k.box(x, r_face + 0.05, 0, x + 0.05, r_face + d - 0.05, h - 0.05, '#1a1a22', 'desk_leg')
    for i, x in enumerate((x0 + 0.3, (x0 + x1) / 2 - 0.25, x1 - 0.85)):
        k.box(x, r_face + d - 0.32, h, x + 0.55, r_face + d - 0.12, h + 0.03, '#1a1a22', 'keyboard')
        k.boxes([(x + 0.04 + j * 0.065, r_face + d - 0.29, h + 0.03, x + 0.09 + j * 0.065, r_face + d - 0.15, h + 0.035)
                 for j in range(7)], '#3a3a48', 'keys')
        k.box(x, r_face + d - 0.12, h + 0.0, x + 0.55, r_face + d - 0.1, h + 0.03, shade(Y.CYAN, 0.4), 'kb_glow',
              emit=((Y.CYAN, Y.PINK, Y.GREEN)[i], 0.9))
    k.cyl(x1 - 0.25, r_face + 0.2, h, h + 0.12, 0.05, '#e8e0d0', 'mug', verts=8)
    for i in range(4):             # energy drink cans
        k.cyl(x0 + 0.15 + i * 0.08, r_face + 0.15, h, h + 0.12, 0.03, ('#e040c0', '#40e0d0')[i % 2], 'can', verts=8)
    k.solid(x0, r_face, x1, r_face + d)


def gamer_chair(k, cx, cr, col='#a01870'):
    """A battered gaming chair turned to face the room (Vex's)."""
    k.cyl(cx, cr, 0, 0.06, 0.28, '#1a1a22', 'chair_base', verts=10)
    k.cyl(cx, cr, 0.06, 0.4, 0.04, '#2a2a34', 'chair_post', verts=8)
    k.box(cx - 0.3, cr - 0.28, 0.4, cx + 0.3, cr + 0.26, 0.52, (col, 0.08), 'chair_seat', bevel=0.03)
    k.box(cx - 0.3, cr - 0.34, 0.52, cx + 0.3, cr - 0.18, 1.35, (col, 0.08), 'chair_back', bevel=0.04)
    k.box(cx - 0.22, cr - 0.33, 1.35, cx + 0.22, cr - 0.2, 1.5, ('#1a1a22', 0.08), 'chair_head')
    for s_ in (-1, 1):
        k.box(cx + s_ * 0.3 - 0.04, cr - 0.25, 0.52, cx + s_ * 0.3 + 0.04, cr + 0.2, 0.7, '#1a1a22', 'chair_arm')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def beanbag(k, cx, cr, col='#3a2a60'):
    k.blob(cx, cr, 0.2, 0.42, 0.36, 0.22, (col, 0.15), 'beanbag', segs=12)
    k.blob(cx, cr - 0.15, 0.36, 0.34, 0.16, 0.2, (shade(col, 1.1), 0.15), 'beanbag', segs=10)
    k.solid(cx - 0.4, cr - 0.35, cx + 0.4, cr + 0.35)


def fridge(k, cx, r_face):
    k.box(cx - 0.3, r_face, 0, cx + 0.3, r_face + 0.55, 1.0, ('#d8d8e0', 0.06), 'fridge', bevel=0.03)
    k.box(cx + 0.18, r_face + 0.55, 0.4, cx + 0.22, r_face + 0.58, 0.85, '#8a8a94', 'fridge_handle')
    for i, col in enumerate(('#e84040', '#40e0d0', '#e8c040')):
        k.box(cx - 0.2 + i * 0.12, r_face + 0.55, 0.75, cx - 0.12 + i * 0.12, r_face + 0.56, 0.83, col, 'magnet')
    k.box(cx - 0.28, r_face + 0.55, 0.05, cx + 0.28, r_face + 0.56, 0.08, '#0a1a20', 'fridge_glow', emit=('#80e0ff', 0.6))
    k.solid(cx - 0.3, r_face, cx + 0.3, r_face + 0.6)


def plan_board(k, cx, r_face, z0=0.9, w=1.5, h=1.0):
    """The plan: a map of the District under red string, photos, a big X."""
    k.box(cx - w / 2 - 0.05, r_face, z0 - 0.05, cx + w / 2 + 0.05, r_face + 0.04, z0 + h + 0.05, '#2a2a30', 'board_frame')
    k.box(cx - w / 2, r_face + 0.04, z0, cx + w / 2, r_face + 0.05, z0 + h, ('#d8d0b8', 0.06), 'board')
    # the District's lane and blocks
    k.box(cx - w / 2 + 0.08, r_face + 0.05, z0 + h * 0.45, cx + w / 2 - 0.08, r_face + 0.056, z0 + h * 0.55, '#6a6a7a', 'map_lane')
    for i in range(6):
        bx = cx - w / 2 + 0.1 + i * (w - 0.2) / 6
        k.box(bx, r_face + 0.05, z0 + h * 0.6, bx + (w - 0.3) / 6, r_face + 0.056, z0 + h * 0.9, '#9a9aa8', 'map_block')
    pins = [(cx - 0.5, z0 + 0.75), (cx - 0.1, z0 + 0.8), (cx + 0.35, z0 + 0.72), (cx + 0.55, z0 + 0.25), (cx - 0.4, z0 + 0.2)]
    for a, b in zip(pins, pins[1:]):
        k.tube((a[0], r_face + 0.06, a[1]), (b[0], r_face + 0.06, b[1]), 0.006, '#d02020', 'red_string', verts=3)
    for (px, pz) in pins:
        k.sphere(px, r_face + 0.065, pz, 0.025, 0.025, '#e02020', 'pin', segs=5)
        k.box(px - 0.08, r_face + 0.052, pz - 0.18, px + 0.08, r_face + 0.058, pz - 0.04, ('#e8e8f0', 0.06), 'photo')
    for s_ in (-1, 1):
        k.tube((cx + 0.35 - 0.1, r_face + 0.062, z0 + 0.72 - s_ * 0.1), (cx + 0.35 + 0.1, r_face + 0.062, z0 + 0.72 + s_ * 0.1),
               0.012, '#d02020', 'big_x', verts=4)


def splice_rig(k, cx, r_face, h=0.8):
    """The job rig: a tall rack of patch panels and blinking kit with one
    big screen, a stool in front — where NULL's jobs get done."""
    w = 1.2
    k.box(cx - w / 2, r_face, 0, cx + w / 2, r_face + 0.5, 1.9, ('#1a1a24', 0.06), 'rack')
    for i in range(5):
        z = 0.15 + i * 0.16
        k.box(cx - w / 2 + 0.05, r_face + 0.5, z, cx + w / 2 - 0.05, r_face + 0.51, z + 0.12, '#24242e', 'patch_panel')
        for j in range(9):
            col = k.rng.choice(('#40e0d0', '#e040c0', '#60e080', '#e8c040', '#24242e', '#24242e'))
            k.box(cx - w / 2 + 0.1 + j * 0.115, r_face + 0.51, z + 0.04, cx - w / 2 + 0.14 + j * 0.115, r_face + 0.515, z + 0.08,
                  col, 'port', emit=(col, 0.9) if col != '#24242e' else None)
    # patch cables looping between panels
    for i in range(6):
        xa, xb = cx - w / 2 + 0.15 + k.rng.random() * (w - 0.3), cx - w / 2 + 0.15 + k.rng.random() * (w - 0.3)
        za, zb = 0.2 + k.rng.random() * 0.6, 0.2 + k.rng.random() * 0.6
        col = k.rng.choice(('#e040c0', '#40e0d0', '#e8c040'))
        k.tube((xa, r_face + 0.53, za), ((xa + xb) / 2, r_face + 0.6, min(za, zb) - 0.12), 0.01, col, 'patch_cable', verts=3)
        k.tube(((xa + xb) / 2, r_face + 0.6, min(za, zb) - 0.12), (xb, r_face + 0.53, zb), 0.01, col, 'patch_cable', verts=3)
    k.box(cx - w / 2 + 0.08, r_face + 0.5, 1.02, cx + w / 2 - 0.08, r_face + 0.52, 1.8, '#0a0a14', 'rig_screen', emit=('#2a1040', 0.9))
    # a grid of pipes on the screen — the puzzle itself
    for i in range(4):
        for j in range(4):
            x = cx - 0.42 + i * 0.27
            z = 1.1 + j * 0.17
            col = '#40e0d0' if (i + j) % 3 else '#e040c0'
            if (i * 7 + j * 3) % 2:
                k.box(x, r_face + 0.52, z + 0.06, x + 0.22, r_face + 0.525, z + 0.09, '#0a0a14', 'rig_pipe', emit=(col, 1.0))
            else:
                k.box(x + 0.09, r_face + 0.52, z, x + 0.12, r_face + 0.525, z + 0.15, '#0a0a14', 'rig_pipe', emit=(col, 1.0))
    k.point_light(cx, r_face + 1.0, 1.4, '#c060ff', 14, radius=0.2, group='flicker')
    k.solid(cx - w / 2, r_face, cx + w / 2, r_face + 0.55)
    # the stool
    k.cyl(cx, r_face + 1.0, 0, 0.5, 0.04, '#2a2a34', 'stool_post', verts=8)
    k.cyl(cx, r_face + 1.0, 0.5, 0.56, 0.2, ('#e040c0', 0.06), 'stool_seat', verts=12)
