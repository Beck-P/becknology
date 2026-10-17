"""The Wayfarer grown longer: the passage aft of the bridge and the rooms fitted off it (scenekit, bpy) — the galley and
mess, the observatory, the greenhouse deck. Wood and brass like the bridge and the office (assets_deck, assets_ship):
panelled walls in DECK_WALL, scrubbed deck planks, brass rails, ship's lanterns, windows onto space (HOLDOUT: the
engine draws the place the ship is over through them). Tile units: x = column, r = row (toward the camera), z = height.

The passage's bays are variants (`bay_<module>`: `sealed` — a riveted iron blank, a builder's tag — or `fitted`, a
panelled door with its nameboard lit), so the engine shows each bay as the pilot has fitted it (js/wayfarer.js).
"""
import math

from scenekit import shade
from assets_lumar import (BRASS, CANDLE, FIRE, FIRE_HOT, IRON, STONE, STONE_D, WOOD, WOOD_D, WOOD_DD, WOOD_L,
                          BOTTLES, jar)
from assets_deck import DECK_WALL, BRASS_D, LEATHER, PARCH, INK
from assets_town import lantern

COPPER = '#b8683a'
COPPER_D = '#7a3e22'
COPPER_L = '#e09868'
BRICK = '#8a3e2a'
BRICK_D = '#5a2618'
CROCK_B = '#2a4a8a'          # blue-and-white crockery
CROCK_W = '#e8e4d8'
BAIZE = '#1e4a32'
CARD_W = '#f0ead8'
CARD_R = '#b02a2a'
TIN = '#8a8e96'
STAR = '#6a80d0'


# ---- the shell: a panelled back wall with doors and windows ------------------------------------------------------
def back_wall(k, x0, x1, r_face, height, doors=(), windows=(), portholes=(), wainscot=0.95):
    """The deck's panelled back wall (assets_deck's look) with openings: doors = [(xa, xb)] (the opening up to 2.4;
    a dark recess behind, for whatever stands in it), windows = [(wx0, wx1, z0, z1)] arched lights onto space (HOLDOUT),
    portholes = [(cx, zc, rad)] round brass ones. Panels fill whatever's left, so no stretch of wall is one flat board."""
    W = DECK_WALL
    k.box(x0, r_face - 0.5, height, x1, r_face + 0.12, height + 0.05, W[0], 'wall_cap')
    k.box(x0, r_face - 0.6, 0, x1, r_face - 0.4, height, W[0], 'wall_back')
    # the wall itself, in spans between the doors
    cuts = sorted(doors)
    spans, a = [], x0
    for (da, db) in cuts:
        spans.append((a, da))
        a = db
    spans.append((a, x1))
    for (a, b) in spans:
        if b - a < 0.01:
            continue
        k.box(a, r_face - 0.4, 0, b, r_face, height, (W[1], 0.08), 'wall')
        k.box(a, r_face - 0.02, 0, b, r_face + 0.08, 0.2, (W[0], 0.05), 'skirting')
        k.box(a, r_face, wainscot - 0.06, b, r_face + 0.1, wainscot, (W[0], 0.06), 'dado_rail')
        k.box(a, r_face + 0.08, wainscot - 0.03, b, r_face + 0.11, wainscot - 0.01, BRASS_D, 'dado_brass')
        # raised panels under the rail and tall ones over it, round the windows
        x = a + 0.08
        while x < b - 0.3:
            xe = min(b - 0.08, x + 1.0)
            if xe - x > 0.35:
                k.box(x + 0.06, r_face, 0.26, xe - 0.06, r_face + 0.04, wainscot - 0.14, (W[2], 0.08), 'wainscot')
                k.box(x + 0.14, r_face + 0.04, 0.34, xe - 0.14, r_face + 0.055, wainscot - 0.22, (W[3], 0.08), 'wainscot_raise')
            x = xe
        x = a + 0.08
        while x < b - 0.3:
            xe = min(b - 0.08, x + 1.2)
            busy = any(not (xe < w0 - 0.25 or x > w1 + 0.25) for (w0, w1, _z0, _z1) in windows) or \
                any(abs((x + xe) / 2 - cx) < rad + 0.5 for (cx, _zc, rad) in portholes)
            if xe - x > 0.35 and not busy:
                k.box(x + 0.06, r_face, wainscot + 0.1, xe - 0.06, r_face + 0.04, height - 0.45, (W[2], 0.08), 'wall_panel')
                k.box(x + 0.15, r_face + 0.04, wainscot + 0.2, xe - 0.15, r_face + 0.055, height - 0.55, (W[3], 0.08), 'wall_panel')
            x = xe
        k.box(a, r_face, height - 0.4, b, r_face + 0.16, height - 0.25, (W[0], 0.06), 'cornice')
        k.box(a, r_face + 0.15, height - 0.36, b, r_face + 0.18, height - 0.33, BRASS_D, 'cornice_brass')
    # ribs: a frame of the hull every few tiles, with a brass cap, where nothing else is
    for (wx0, wx1, z0, z1) in windows:
        arched_window(k, wx0, wx1, r_face, z0, z1)
    for (cx, zc, rad) in portholes:
        porthole(k, cx, r_face, zc, rad)
    for (da, db) in cuts:
        doorway(k, da, db, r_face, height)


def arched_window(k, wx0, wx1, r_face, z0, z1, lights=1):
    """One arched light onto space in a heavy frame (the gallery's, smaller): sill, posts, an arched head, a keystone."""
    W = DECK_WALL
    k.box(wx0, r_face - 0.02, z0, wx1, r_face + 0.02, z1, 'HOLDOUT', 'viewport')
    k.box(wx0 - 0.18, r_face, z0 - 0.12, wx1 + 0.18, r_face + 0.22, z0, (W[0], 0.06), 'sill')
    k.box(wx0 - 0.2, r_face + 0.2, z0 - 0.04, wx1 + 0.2, r_face + 0.24, z0, BRASS, 'sill_brass')
    k.box(wx0 - 0.18, r_face, z1, wx1 + 0.18, r_face + 0.18, z1 + 0.28, (W[0], 0.06), 'header')
    k.box(wx0 - 0.2, r_face + 0.18, z1 + 0.06, wx1 + 0.2, r_face + 0.2, z1 + 0.09, BRASS, 'header_brass')
    for xx in (wx0 - 0.18, wx1):
        k.box(xx, r_face, z0, xx + 0.18, r_face + 0.18, z1, (W[0], 0.06), 'window_post')
    step = (wx1 - wx0) / lights
    for i in range(1, lights):
        mx = wx0 + step * i
        k.box(mx - 0.08, r_face, z0, mx + 0.08, r_face + 0.16, z1, (W[0], 0.06), 'mullion')
    rx, rz, n = step / 2, min(0.7, (z1 - z0) * 0.35), 14
    for i in range(lights):
        a, b = wx0 + step * i, wx0 + step * (i + 1)
        cx, zs = (a + b) / 2, z1 - rz
        for j in range(n):
            za, zb = zs + rz * j / n, zs + rz * (j + 1) / n
            t = min(1.0, ((za + zb) / 2 - zs) / rz)
            w = rx * math.sqrt(max(0.0, 1 - t * t))
            if cx - w > a + 0.005:
                k.box(a, r_face, za, cx - w, r_face + 0.12, zb + 0.004, (W[0], 0.06), 'arch')
                k.box(cx + w, r_face, za, b, r_face + 0.12, zb + 0.004, (W[0], 0.06), 'arch')
        k.box(cx - 0.05, r_face + 0.1, z1 - 0.05, cx + 0.05, r_face + 0.16, z1 + 0.05, BRASS, 'keystone')
    # a glazing bar or two across the glass
    k.box(wx0, r_face + 0.02, (z0 + z1) / 2 - 0.02, wx1, r_face + 0.06, (z0 + z1) / 2 + 0.02, BRASS_D, 'glazing_bar')


def porthole(k, cx, r_face, zc, rad=0.36):
    """A round port in a thick brass ring with its bolts, a dogged deadlight hinged open above it."""
    k.cyl_y(cx, r_face - 0.03, r_face + 0.02, zc, rad, rad, 'HOLDOUT', 'viewport', verts=24)
    n = 24
    for i in range(n):
        a0, a1 = i * 2 * math.pi / n, (i + 1) * 2 * math.pi / n
        p0 = (cx + math.cos(a0) * (rad + 0.05), r_face + 0.06, zc + math.sin(a0) * (rad + 0.05))
        p1 = (cx + math.cos(a1) * (rad + 0.05), r_face + 0.06, zc + math.sin(a1) * (rad + 0.05))
        k.tube(p0, p1, 0.07, BRASS, 'port_ring', verts=6, smooth=False)
    for i in range(8):
        a = i * math.pi / 4 + math.pi / 8
        k.sphere(cx + math.cos(a) * (rad + 0.16), r_face + 0.08, zc + math.sin(a) * (rad + 0.16), 0.03, 0.03, BRASS_D, 'port_bolt', segs=6)
    k.box(cx - 0.05, r_face + 0.06, zc - rad - 0.2, cx + 0.05, r_face + 0.12, zc - rad - 0.08, BRASS_D, 'port_dog')
    k.box(cx - 0.05, r_face + 0.06, zc + rad + 0.08, cx + 0.05, r_face + 0.12, zc + rad + 0.2, BRASS_D, 'port_dog')


def doorway(k, xa, xb, r_face, height, top=2.4):
    """A door opening in the back wall: a dark recess, panelled posts and a lintel with a brass plate over it."""
    W = DECK_WALL
    k.box(xa, r_face - 0.6, -0.01, xb, r_face - 0.4, top, '#0a0604', 'door_recess')
    k.box(xa, r_face - 0.4, 0, xb, r_face + 0.02, 0.02, (BRASS_D, 0.06), 'threshold')
    k.box(xa, r_face - 0.4, top, xb, r_face, height, (W[1], 0.08), 'door_lintel')
    for xx in (xa - 0.2, xb):
        k.box(xx, r_face - 0.4, 0, xx + 0.2, r_face + 0.14, top + 0.1, (W[0], 0.06), 'door_post')
        k.box(xx + 0.05, r_face + 0.14, 0.3, xx + 0.15, r_face + 0.16, top - 0.2, (W[2], 0.06), 'door_post_panel')
    k.box(xa - 0.24, r_face, top, xb + 0.24, r_face + 0.18, top + 0.22, (W[0], 0.06), 'door_head')
    k.box(xa - 0.26, r_face + 0.18, top + 0.06, xb + 0.26, r_face + 0.2, top + 0.09, BRASS, 'door_head_brass')


def sealed_bay(k, xa, xb, r_face, n, top=2.4):
    """An unfitted module bay: the doorway blanked off with a riveted iron plate, a stencilled number, chalk marks
    and a builder's tag on a wire, a coil of cable waiting by it."""
    k.box(xa, r_face - 0.38, 0.02, xb, r_face - 0.3, top, ('#3a3c42', 0.1), 'bay_plate')
    for i, z in enumerate((0.15, top / 2, top - 0.15)):
        k.box(xa, r_face - 0.3, z - 0.04, xb, r_face - 0.27, z + 0.04, '#2a2c30', 'bay_strap')
    x = xa + 0.1
    while x < xb - 0.05:
        for z in (0.15, top / 2, top - 0.15):
            k.sphere(x, r_face - 0.26, z, 0.022, 0.022, '#5a5c62', 'rivet', segs=6)
        x += 0.18
    # the bay's number, stencilled in faded yellow: a bar per bay
    for i in range(n):
        bx = (xa + xb) / 2 - (n - 1) * 0.09 + i * 0.18
        k.box(bx - 0.04, r_face - 0.265, 1.45, bx + 0.04, r_face - 0.255, 1.85, '#c8a840', 'bay_stencil')
    k.box((xa + xb) / 2 - 0.3, r_face - 0.265, 1.2, (xa + xb) / 2 + 0.3, r_face - 0.255, 1.26, '#c8a840', 'bay_stencil')
    # chalk: a tally
    for j in range(4):
        k.box(xb - 0.5 + j * 0.07, r_face - 0.265, 0.62, xb - 0.47 + j * 0.07, r_face - 0.255, 0.86, '#d8d8cc', 'chalk')
    k.box(xb - 0.54, r_face - 0.265, 0.72, xb - 0.24, r_face - 0.255, 0.75, '#d8d8cc', 'chalk')
    # the builder's tag on its wire, and a coil of cable on the deck
    tx = xa + 0.35
    k.tube((tx, r_face - 0.24, 1.0), (tx + 0.05, r_face - 0.2, 0.86), 0.006, '#8a8a90', 'tag_wire', verts=4)
    k.box(tx - 0.03, r_face - 0.22, 0.62, tx + 0.17, r_face - 0.2, 0.86, PARCH, 'tag')
    k.box(tx, r_face - 0.199, 0.7, tx + 0.13, r_face - 0.195, 0.72, INK, 'tag_ink')
    k.box(tx, r_face - 0.199, 0.76, tx + 0.1, r_face - 0.195, 0.78, INK, 'tag_ink')
    cx, cr = xb - 0.35, r_face + 0.32
    for i in range(3):
        k.cyl(cx, cr, 0.03 + i * 0.05, 0.07 + i * 0.05, 0.22 - i * 0.02, ('#2a2a2e', 0.1), 'cable_coil', verts=14)
    k.cyl(cx, cr, 0.17, 0.18, 0.1, '#141418', 'cable_coil_hole', verts=10)


def bay_door(k, xa, xb, r_face, glow='#ffc070', top=2.4, sign='#2a1a10', sign_glow=None):
    """A fitted bay: a panelled door in brass furniture, a round light in it glowing with the room beyond, a lamp
    over it and a nameboard (sign_glow: the room's own colour in the board's lettering)."""
    k.box(xa, r_face - 0.36, 0.02, xb, r_face - 0.28, top, (WOOD, 0.1), 'bay_door')
    for (za, zb) in ((0.2, 1.0), (1.2, top - 0.15)):
        k.box(xa + 0.12, r_face - 0.28, za, xb - 0.12, r_face - 0.25, zb, (WOOD_L, 0.1), 'bay_door_panel')
        k.box(xa + 0.18, r_face - 0.25, za + 0.06, xb - 0.18, r_face - 0.24, zb - 0.06, (shade(WOOD_L, 0.88), 0.1), 'bay_door_panel')
    for z in (0.12, top - 0.1):
        for x in (xa + 0.06, xb - 0.06):
            k.sphere(x, r_face - 0.27, z, 0.025, 0.025, BRASS, 'door_stud', segs=6)
    cx, zc = (xa + xb) / 2, 1.75
    k.cyl_y(cx, r_face - 0.3, r_face - 0.22, zc, 0.2, 0.2, '#3a2a14', 'bay_door_light', emit=(glow, 0.9), verts=16)
    k.cyl_y(cx, r_face - 0.25, r_face - 0.2, zc, 0.25, 0.25, BRASS, 'bay_door_ring', verts=16)
    k.cyl_y(cx, r_face - 0.235, r_face - 0.205, zc, 0.205, 0.205, '#3a2a14', 'bay_door_light', emit=(glow, 0.9), verts=16)
    k.sphere(xb - 0.2, r_face - 0.22, 1.05, 0.05, 0.05, BRASS, 'bay_door_knob', segs=8)
    k.box(xb - 0.26, r_face - 0.25, 0.92, xb - 0.14, r_face - 0.23, 1.2, BRASS_D, 'bay_door_plate')
    k.box(xa + 0.05, r_face - 0.25, 0.1, xb - 0.05, r_face - 0.23, 0.18, BRASS, 'kick_plate')
    # the nameboard over the door: dark wood, a gilt rule, lettering suggested in the room's colour
    k.box(xa - 0.1, r_face + 0.16, top + 0.28, xb + 0.1, r_face + 0.24, top + 0.62, sign, 'nameboard')
    k.box(xa - 0.12, r_face + 0.24, top + 0.28, xb + 0.12, r_face + 0.26, top + 0.31, BRASS, 'nameboard_rule')
    k.box(xa - 0.12, r_face + 0.24, top + 0.59, xb + 0.12, r_face + 0.26, top + 0.62, BRASS, 'nameboard_rule')
    n = int((xb - xa) / 0.16)
    for i in range(n):
        lx = xa + 0.05 + i * (xb - xa - 0.1) / n
        h = 0.12 + (i * 7 % 3) * 0.03
        k.box(lx, r_face + 0.24, top + 0.36, lx + 0.08, r_face + 0.255, top + 0.36 + h, '#4a3010',
              'nameboard_letter', emit=(sign_glow or '#e8c060', 0.7))
    # its lamp, a little lantern on a bracket
    k.tube((cx, r_face + 0.2, top + 0.7), (cx, r_face + 0.42, top + 0.7), 0.02, IRON, 'lamp_bracket', verts=6)
    lantern(k, cx, r_face + 0.42, top + 0.45, top + 0.68, s=0.08)
    k.point_light(cx, r_face + 0.7, top + 0.4, '#ffb060', 6, radius=0.08, group='flicker')
    k.point_light(cx, r_face + 0.3, 1.6, glow, 2.0, radius=0.1, group='pulse')


def hatch_down(k, x0, x1, r0, r1):
    """A hatch in the deck, open, a ladder going down into lamplight: the crew's berths below. A raised coaming with
    a brass edge, the cover laid back on the deck beside it, a stanchion and a rope rail along its far side."""
    for (a, b, c, d) in ((x0, r0 - 0.05, x1, r0), (x0, r1, x1, r1 + 0.05), (x0 - 0.05, r0, x0, r1), (x1, r0, x1 + 0.05, r1)):
        k.box(a, b, -0.75, c, d, -0.02, '#3a200e', 'hatch_well')         # the well's sides: hollow, so the light below shows
    k.box(x0 + 0.05, r0 + 0.02, -0.77, x1 - 0.05, r1 - 0.02, -0.73, '#5a3010', 'hatch_glow', emit=('#ffa050', 0.9))
    k.box(x0 + 0.02, r0, -0.75, x1 - 0.02, r0 + 0.03, -0.05, '#4a2810', 'hatch_glow_wall', emit=('#e08a40', 0.8))
    for (a, b, c, d) in ((x0 - 0.12, r0 - 0.12, x1 + 0.12, r0), (x0 - 0.12, r1, x1 + 0.12, r1 + 0.12),
                         (x0 - 0.12, r0, x0, r1), (x1, r0, x1 + 0.12, r1)):
        k.box(a, b, 0.0, c, d, 0.14, (WOOD_D, 0.08), 'hatch_coaming')
    for (a, b, c, d) in ((x0 - 0.14, r0 - 0.14, x1 + 0.14, r0 - 0.1), (x0 - 0.14, r1 + 0.1, x1 + 0.14, r1 + 0.14)):
        k.box(a, b, 0.12, c, d, 0.16, BRASS, 'hatch_brass')
    # the ladder: two stringers, rungs going down into the light
    for xx in (x0 + 0.3, x1 - 0.35):
        k.box(xx, r0 + 0.05, -0.72, xx + 0.06, r0 + 0.2, 0.6, (WOOD_L, 0.1), 'ladder')
    for i in range(5):
        z = 0.45 - i * 0.26
        k.box(x0 + 0.3, r0 + 0.08, z, x1 - 0.3, r0 + 0.17, z + 0.045, WOOD_L, 'ladder_rung')
    # below: the corner of a hammock, a sea bag
    k.blob(x1 - 0.4, r1 - 0.3, -0.62, 0.3, 0.2, 0.1, ('#c8b890', 0.1), 'hammock', segs=10)
    # the cover, laid back on the deck to the right
    cx0 = x1 + 0.2
    k.box(cx0, r0, 0.0, cx0 + (x1 - x0) * 0.85, r1, 0.09, (WOOD, 0.1), 'hatch_cover')
    for rr in (r0 + 0.2, r1 - 0.3):
        k.box(cx0, rr, 0.09, cx0 + (x1 - x0) * 0.85, rr + 0.1, 0.11, IRON, 'hatch_strap')
    k.cyl(cx0 + (x1 - x0) * 0.42, (r0 + r1) / 2, 0.09, 0.13, 0.08, BRASS, 'hatch_ring', verts=10)
    k.point_light((x0 + x1) / 2, (r0 + r1) / 2, -0.35, '#ffa050', 40, radius=0.25, group='flicker')
    k.point_light((x0 + x1) / 2, r1 + 0.3, 0.6, '#ffa050', 6, radius=0.2, group='flicker')
    # a stanchion each end of the far side, a rope between
    for xx in (x0 - 0.06, x1 + 0.06):
        k.cyl(xx, r0 - 0.06, 0.14, 0.95, 0.03, BRASS_D, 'hatch_stanchion', verts=8)
        k.sphere(xx, r0 - 0.06, 0.97, 0.045, 0.045, BRASS, 'stanchion_knob', segs=8)
    pts = [(x0 - 0.06 + (x1 - x0 + 0.12) * t / 8, r0 - 0.06, 0.9 - math.sin(math.pi * t / 8) * 0.12) for t in range(9)]
    for a, b in zip(pts, pts[1:]):
        k.tube(a, b, 0.02, '#a88a5a', 'hatch_rope', verts=6, smooth=False)
    k.solid(x0 - 0.12, r0 - 0.12, x1 + 0.12, r1 + 0.12)


def watch_bill(k, x0, x1, r_face, z0, z1):
    """The watch bill: a board in an oak frame where the crew's cards are pinned by the watch they keep. Its face is a
    HOLDOUT (js/worlds/wayfarer.js pins each of your crew's faces to it, lit by where they are now). Returns
    (x0, z0, x1, z1, r) of the face."""
    fw = 0.09
    k.box(x0 - fw, r_face, z0 - fw, x1 + fw, r_face + 0.06, z1 + fw, (WOOD_D, 0.08), 'board_frame')
    k.box(x0 - fw - 0.02, r_face + 0.06, z1 + fw - 0.04, x1 + fw + 0.02, r_face + 0.09, z1 + fw, BRASS_D, 'board_frame_brass')
    k.box(x0, r_face + 0.02, z0, x1, r_face + 0.07, z1, 'HOLDOUT', 'board_face')
    # a little lamp over it
    cx = (x0 + x1) / 2
    k.tube((cx, r_face + 0.06, z1 + 0.2), (cx, r_face + 0.3, z1 + 0.12), 0.015, BRASS, 'board_lamp_arm', verts=6)
    k.cyl_x(cx - 0.25, cx + 0.25, r_face + 0.3, z1 + 0.1, 0.05, 0.04, '#3a2a14', 'board_lamp', emit=('#ffd890', 0.9), verts=10)
    k.point_light(cx, r_face + 0.5, z1 - 0.2, '#ffd890', 5, radius=0.06, group='flicker')
    return (x0, z0, x1, z1, r_face + 0.07)


def rope_coil(k, cx, cr, rad=0.28, z=0.0, col='#a88a5a'):
    for i in range(4):
        k.cyl(cx, cr, z + i * 0.035, z + 0.04 + i * 0.035, rad - i * 0.015, (shade(col, 1.0 - i * 0.05), 0.1), 'rope', verts=16)
    k.cyl(cx, cr, z + 0.15, z + 0.16, rad * 0.4, shade(col, 0.5), 'rope_hole', verts=10)
    k.tube((cx + rad, cr, z + 0.02), (cx + rad + 0.25, cr + 0.15, z + 0.01), 0.025, col, 'rope', verts=6)


def fire_buckets(k, x0, r_face, n=3):
    """A rack of leather fire buckets on the wall, FIRE in yellow on each (a band)."""
    k.box(x0 - 0.05, r_face, 1.18, x0 + n * 0.32 + 0.05, r_face + 0.1, 1.24, WOOD_D, 'bucket_rack')
    for i in range(n):
        bx = x0 + 0.16 + i * 0.32
        k.cyl(bx, r_face + 0.16, 0.86, 1.18, 0.12, (LEATHER, 0.08), 'fire_bucket', ry=0.1, verts=12)
        k.cyl(bx, r_face + 0.16, 1.0, 1.06, 0.122, '#c8a040', 'fire_bucket_band', ry=0.102, verts=12)
        k.tube((bx - 0.1, r_face + 0.16, 1.18), (bx + 0.1, r_face + 0.16, 1.18), 0.012, '#2a1a10', 'bucket_handle', verts=4)


def lockers(k, x0, x1, r_face, h=1.9, d=0.45):
    """A row of crew lockers: louvred doors, brass number plates, a bench in front of them."""
    k.box(x0, r_face, 0, x1, r_face + d, h, (WOOD_D, 0.08), 'locker')
    n = max(1, int(round((x1 - x0) / 0.55)))
    w = (x1 - x0) / n
    for i in range(n):
        a = x0 + i * w
        k.box(a + 0.04, r_face + d, 0.1, a + w - 0.04, r_face + d + 0.02, h - 0.08, (WOOD, 0.08), 'locker_door')
        for j in range(5):
            z = h - 0.35 - j * 0.06
            k.box(a + 0.1, r_face + d + 0.02, z, a + w - 0.1, r_face + d + 0.035, z + 0.025, WOOD_DD, 'locker_louvre')
        k.box(a + w / 2 - 0.06, r_face + d + 0.02, h - 0.2, a + w / 2 + 0.06, r_face + d + 0.03, h - 0.14, BRASS, 'locker_plate')
        k.sphere(a + w - 0.12, r_face + d + 0.04, 0.95, 0.025, 0.025, BRASS, 'locker_knob', segs=6)
    k.box(x0 - 0.02, r_face, h, x1 + 0.02, r_face + d + 0.04, h + 0.05, WOOD_DD, 'locker_top')
    k.solid(x0, r_face, x1, r_face + d)


def water_butt(k, cx, cr, h=0.95, rad=0.32):
    """The scuttlebutt: a cask of drinking water on a stand, a tin dipper hung on it."""
    k.box(cx - 0.36, cr - 0.3, 0, cx + 0.36, cr + 0.3, 0.18, WOOD_DD, 'butt_stand')
    k.cyl(cx, cr, 0.18, 0.18 + h * 0.25, rad * 0.92, (WOOD, 0.1), 'water_butt', verts=16)
    k.cyl(cx, cr, 0.18 + h * 0.25, 0.18 + h * 0.75, rad, (WOOD, 0.1), 'water_butt', verts=16)
    k.cyl(cx, cr, 0.18 + h * 0.75, 0.18 + h, rad * 0.92, (WOOD, 0.1), 'water_butt', verts=16)
    for z in (0.32, 0.18 + h * 0.5, 0.18 + h - 0.12):
        k.cyl(cx, cr, z - 0.03, z + 0.03, rad * 0.98, BRASS_D, 'butt_hoop', verts=16)
    k.cyl(cx, cr, 0.18 + h, 0.2 + h, rad * 0.85, WOOD_D, 'butt_lid', verts=16)
    k.cyl(cx - 0.05, cr + rad, 0.45, 0.5, 0.03, BRASS, 'butt_tap', verts=6)
    k.tube((cx + 0.2, cr + rad * 0.8, 0.18 + h - 0.05), (cx + 0.24, cr + rad + 0.06, 0.18 + h - 0.35), 0.015, TIN, 'dipper', verts=6)
    k.cyl(cx + 0.24, cr + rad + 0.08, 0.18 + h - 0.45, 0.18 + h - 0.33, 0.05, TIN, 'dipper', verts=8)
    k.solid(cx - 0.36, cr - 0.3, cx + 0.36, cr + 0.3)


def runner(k, x0, r0, x1, r1, col='#5a2a2a', trim='#c8a050'):
    """A long runner down a passage: a field, a border, a stripe at each end, fringes."""
    k.box(x0, r0, 0.0, x1, r1, 0.012, (col, 0.08), 'floor_runner')
    k.box(x0 + 0.08, r0 + 0.08, 0.012, x1 - 0.08, r0 + 0.13, 0.016, trim, 'floor_runner_trim')
    k.box(x0 + 0.08, r1 - 0.13, 0.012, x1 - 0.08, r1 - 0.08, 0.016, trim, 'floor_runner_trim')
    x = x0 + 0.6
    while x < x1 - 0.6:
        k.box(x - 0.05, r0 + 0.25, 0.012, x + 0.05, r1 - 0.25, 0.015, shade(col, 0.75), 'floor_runner_motif')
        x += 1.2
    for xx in (x0, x1):
        for i in range(int((r1 - r0) / 0.08)):
            rr = r0 + 0.04 + i * 0.08
            k.box(xx - 0.06 if xx == x0 else xx, rr, 0.0, xx if xx == x0 else xx + 0.06, rr + 0.03, 0.008, '#d8c8a0', 'floor_fringe')


def bench_seat(k, x0, x1, cr, tone=WOOD):
    """A mess bench: a thick plank seat on turned legs with a stretcher."""
    k.box(x0, cr - 0.2, 0.4, x1, cr + 0.2, 0.47, (tone, 0.12), 'bench', bevel=0.01)
    for x in (x0 + 0.12, x1 - 0.12):
        k.cyl(x, cr - 0.1, 0, 0.4, 0.035, WOOD_D, 'bench_leg', verts=8)
        k.cyl(x, cr + 0.1, 0, 0.4, 0.035, WOOD_D, 'bench_leg', verts=8)
    k.box(x0 + 0.12, cr - 0.02, 0.14, x1 - 0.12, cr + 0.02, 0.18, WOOD_D, 'bench_stretcher')
    k.solid(x0, cr - 0.2, x1, cr + 0.2)


# ---- the galley ----------------------------------------------------------------------------------------------------
def galley_range(k, x0, x1, r_face, H, energy=60.0):
    """The cook's range in a brick chimney alcove: a black iron range with two oven doors and a firebox glowing through
    its grate, a nickel rail along the front, a copper hood and its flue going up, pots on the hob (a stockpot
    steaming, a frying pan, the kettle), a brick hearth in front. Returns the hob's height."""
    W = DECK_WALL
    cx = (x0 + x1) / 2
    # the alcove: brick piers either side, a beam over, brick back
    k.box(x0, r_face - 0.05, 0, x1, r_face + 0.05, 2.5, (BRICK, 0.16), 'alcove_brick')
    for a, b in ((x0, x0 + 0.3), (x1 - 0.3, x1)):
        k.box(a, r_face, 0, b, r_face + 0.75, 2.5, (BRICK, 0.16), 'alcove_pier')
        for i in range(10):          # brick courses on the piers' faces
            z = 0.12 + i * 0.24
            off = 0.08 if i % 2 else 0.0
            k.box(a + 0.02 + off, r_face + 0.75, z, b - 0.02, r_face + 0.765, z + 0.02, BRICK_D, 'mortar')
    k.box(x0 - 0.05, r_face, 2.5, x1 + 0.05, r_face + 0.82, 2.75, (WOOD_DD, 0.1), 'alcove_beam')
    for xx in (x0 + 0.5, cx, x1 - 0.5):
        k.box(xx - 0.03, r_face + 0.82, 2.55, xx + 0.03, r_face + 0.84, 2.7, IRON, 'beam_hook')
    # the range itself
    rx0, rx1, hob = x0 + 0.35, x1 - 0.35, 0.86
    k.box(rx0, r_face + 0.05, 0.08, rx1, r_face + 0.7, hob, ('#1c1c22', 0.06), 'range', bevel=0.02)
    k.box(rx0 - 0.04, r_face + 0.05, 0, rx1 + 0.04, r_face + 0.72, 0.08, '#141418', 'range_plinth')
    k.box(rx0 - 0.03, r_face + 0.03, hob, rx1 + 0.03, r_face + 0.74, hob + 0.05, ('#2a2a32', 0.04), 'hob')
    # oven doors left and right, the firebox in the middle glowing through its bars
    w = (rx1 - rx0)
    for (a, b) in ((rx0 + 0.06, rx0 + w * 0.36), (rx1 - w * 0.36, rx1 - 0.06)):
        k.box(a, r_face + 0.7, 0.22, b, r_face + 0.73, hob - 0.1, ('#24242c', 0.05), 'oven_door')
        k.box(a + 0.06, r_face + 0.73, hob - 0.22, b - 0.06, r_face + 0.75, hob - 0.18, '#c8c8d0', 'oven_handle')
        k.cyl_y((a + b) / 2, r_face + 0.72, r_face + 0.76, 0.42, 0.06, 0.06, BRASS, 'oven_badge', verts=10)
    fa, fb = rx0 + w * 0.4, rx1 - w * 0.4
    k.box(fa, r_face + 0.69, 0.18, fb, r_face + 0.71, 0.66, '#3a1608', 'firebox', emit=('#ff6a20', 1.6))
    for i in range(5):
        xx = fa + 0.04 + i * (fb - fa - 0.08) / 4
        k.box(xx - 0.015, r_face + 0.71, 0.18, xx + 0.015, r_face + 0.74, 0.66, '#141418', 'firebox_bar')
    k.box(fa - 0.05, r_face + 0.7, 0.66, fb + 0.05, r_face + 0.75, 0.72, '#24242c', 'firebox_lintel')
    k.box(fa - 0.04, r_face + 0.71, 0.1, fb + 0.04, r_face + 0.76, 0.16, '#141418', 'ash_pan')
    k.point_light(cx, r_face + 1.2, 0.4, '#ff7a30', energy, radius=0.2, group='flicker')
    # the rail
    k.tube((rx0 - 0.05, r_face + 0.82, hob - 0.05), (rx1 + 0.05, r_face + 0.82, hob - 0.05), 0.022, '#d0d0d8', 'range_rail', verts=8)
    for xx in (rx0, rx1):
        k.box(xx - 0.02, r_face + 0.72, hob - 0.08, xx + 0.02, r_face + 0.82, hob - 0.02, '#a0a0a8', 'rail_bracket')
    # a tea towel over the rail
    k.box(cx + 0.35, r_face + 0.8, hob - 0.4, cx + 0.6, r_face + 0.86, hob - 0.02, ('#e8e0d0', 0.06), 'towel')
    for z in (hob - 0.3, hob - 0.2):
        k.box(cx + 0.35, r_face + 0.861, z, cx + 0.6, r_face + 0.865, z + 0.03, '#b03a3a', 'towel_stripe')
    # the hood and its flue
    k.loft([[(rx0 - 0.1, r_face + 0.05, 1.75), (rx1 + 0.1, r_face + 0.05, 1.75), (rx1 + 0.1, r_face + 0.85, 1.75), (rx0 - 0.1, r_face + 0.85, 1.75)],
            [(cx - 0.35, r_face + 0.05, 2.35), (cx + 0.35, r_face + 0.05, 2.35), (cx + 0.35, r_face + 0.35, 2.35), (cx - 0.35, r_face + 0.35, 2.35)]],
           (COPPER, 0.06), 'hood', closed=True, smooth=False)
    k.box(rx0 - 0.12, r_face + 0.05, 1.68, rx1 + 0.12, r_face + 0.88, 1.76, COPPER_D, 'hood_rim')
    x = rx0 + 0.15
    while x < rx1 - 0.1:
        k.sphere(x, r_face + 0.885, 1.72, 0.02, 0.02, COPPER_L, 'hood_rivet', segs=6)
        x += 0.2
    k.cyl(cx, r_face + 0.2, 2.35, 2.5, 0.16, COPPER_D, 'flue', verts=12)
    # on the hob: the stockpot, the frying pan, the kettle, a saucepan
    z = hob + 0.05
    k.cyl(rx0 + 0.4, r_face + 0.38, z, z + 0.36, 0.22, (TIN, 0.06), 'stockpot', verts=16)
    k.cyl(rx0 + 0.4, r_face + 0.38, z + 0.36, z + 0.39, 0.235, '#a0a4ac', 'stockpot_rim', verts=16)
    k.cyl(rx0 + 0.4, r_face + 0.38, z + 0.34, z + 0.355, 0.2, '#b8783a', 'stew', verts=14)
    for sd in (-1, 1):
        k.box(rx0 + 0.4 + sd * 0.24, r_face + 0.34, z + 0.26, rx0 + 0.4 + sd * 0.3, r_face + 0.42, z + 0.3, '#5a5e66', 'pot_handle')
    k.cyl(cx, r_face + 0.4, z, z + 0.05, 0.2, '#1c1c22', 'frying_pan', verts=16)
    k.tube((cx + 0.18, r_face + 0.48, z + 0.04), (cx + 0.55, r_face + 0.7, z + 0.08), 0.025, '#1c1c22', 'pan_handle', verts=6)
    for (dx, dr, col) in ((-0.06, -0.02, '#f0e8c8'), (0.07, 0.05, '#f0e8c8')):
        k.cyl(cx + dx, r_face + 0.4 + dr, z + 0.05, z + 0.06, 0.06, col, 'egg_white', verts=10)
        k.sphere(cx + dx, r_face + 0.4 + dr, z + 0.065, 0.025, 0.015, '#f0b020', 'egg_yolk', segs=6)
    kx = rx1 - 0.35
    k.sphere(kx, r_face + 0.38, z + 0.14, 0.15, 0.13, (COPPER, 0.06), 'kettle', segs=14)
    k.tube((kx + 0.12, r_face + 0.44, z + 0.12), (kx + 0.26, r_face + 0.5, z + 0.26), 0.025, COPPER, 'kettle_spout', rb=0.012, verts=6)
    k.tube((kx - 0.1, r_face + 0.38, z + 0.24), (kx + 0.1, r_face + 0.38, z + 0.24), 0.015, '#2a1a10', 'kettle_handle', verts=4)
    k.sphere(kx, r_face + 0.38, z + 0.28, 0.035, 0.03, BRASS, 'kettle_knob', segs=6)
    # utensils on hooks along the beam
    for i, xx in enumerate((x0 + 0.55, x0 + 0.85, x1 - 0.85, x1 - 0.55)):
        k.tube((xx, r_face + 0.83, 2.55), (xx, r_face + 0.83, 2.0 - (i % 2) * 0.12), 0.012, '#9a9aa2', 'ladle', verts=4)
        k.sphere(xx, r_face + 0.83, 1.98 - (i % 2) * 0.12, 0.05, 0.03, '#9a9aa2', 'ladle_bowl', segs=8)
    # the hearth: brick laid in a herringbone-ish band in front of the range
    hr0, hr1 = r_face + 0.75, r_face + 1.35
    x = x0
    i = 0
    while x < x1 - 1e-6:
        xe = min(x1, x + 0.3)
        for j, (ra, rb) in enumerate(((hr0, hr0 + 0.3), (hr0 + 0.3, hr1))):
            xa2 = x + (0.15 if j % 2 else 0)
            xb2 = min(x1, xa2 + 0.3)
            if xb2 - xa2 > 0.05:
                k.box(xa2 + 0.01, ra + 0.01, -0.02, xb2 - 0.01, rb - 0.01, 0.012,
                      (shade(BRICK, 0.85 + 0.25 * ((i * 7 + j * 3) % 5) / 4), 0.1), 'floor_hearth')
        x = xe
        i += 1
    k.box(x0, hr0, -0.03, x1, hr1, -0.005, BRICK_D, 'floor_hearth_grout')
    k.solid(x0, r_face, x1, r_face + 0.75)
    return hob


def pan_rack(k, x0, x1, cr, z=2.2, chain_top=3.1):
    """An iron rack hung from the deckhead on chains, copper pans and a colander hanging from it on S-hooks."""
    for xx in (x0, x1):
        k.tube((xx, cr, z), (xx, cr - 0.1, chain_top), 0.012, IRON, 'chain', verts=4)
    k.box(x0 - 0.05, cr - 0.04, z - 0.03, x1 + 0.05, cr + 0.04, z + 0.03, IRON, 'pan_rack')
    x = x0 + 0.18
    i = 0
    while x < x1 - 0.1:
        size = (0.17, 0.13, 0.2, 0.11, 0.15)[i % 5]
        k.tube((x, cr, z - 0.03), (x, cr, z - 0.16), 0.008, '#5a5a62', 's_hook', verts=4)
        if i % 4 == 3:            # a colander
            k.sphere(x, cr, z - 0.16 - size, size, size * 0.7, (TIN, 0.06), 'colander', segs=12)
        else:                     # a pan hung by its handle, its bottom to the room
            k.tube((x, cr, z - 0.16), (x, cr, z - 0.16 - size * 1.4), 0.018, COPPER_D, 'pan_handle', verts=6)
            k.cyl_y(x, cr - 0.03, cr + 0.03, z - 0.2 - size * 2.4, size, size, (COPPER if i % 2 else COPPER_L, 0.06), 'copper_pan', verts=16)
        x += size * 2 + 0.06
        i += 1


def crockery_shelves(k, x0, x1, r_face, top=2.1):
    """Open shelves on the wall, each with a rail to stop things sliding at sea: jars of flour, oats and beans, tins,
    bowls stacked, a row of mugs on hooks under the bottom shelf."""
    levels = (1.05, 1.5, 1.95)
    for xx in (x0, x1 - 0.06):
        k.box(xx, r_face, 0.95, xx + 0.06, r_face + 0.32, top, WOOD_D, 'shelf_side')
    for z in levels:
        k.box(x0, r_face, z - 0.04, x1, r_face + 0.32, z, (WOOD, 0.1), 'shelf')
        k.tube((x0, r_face + 0.3, z + 0.1), (x1, r_face + 0.3, z + 0.1), 0.01, BRASS_D, 'shelf_rail', verts=4)
        x = x0 + 0.12
        while x < x1 - 0.12:
            pick = k.rng.random()
            if pick < 0.45:
                jar(k, x, r_face + 0.16, z, col=k.rng.choice(['#d8c8a0', '#c8a060', '#8a5a3a', '#e8e0c8', '#6a8a4a']))
                x += 0.17
            elif pick < 0.7:      # a stack of bowls
                for j in range(3):
                    k.cyl(x + 0.02, r_face + 0.16, z + j * 0.05, z + 0.05 + j * 0.05, 0.11 - j * 0.004, CROCK_W if j % 2 else CROCK_B, 'bowl', verts=12)
                x += 0.26
            else:                 # tins
                for j in range(2):
                    k.cyl(x + j * 0.11, r_face + 0.16, z, z + 0.16, 0.05, k.rng.choice(['#a83a2a', '#3a6a8a', '#c8a040', TIN]), 'tin', verts=10)
                x += 0.24
    for i in range(int((x1 - x0 - 0.2) / 0.2)):
        mx = x0 + 0.15 + i * 0.2
        k.tube((mx, r_face + 0.2, levels[0] - 0.04), (mx, r_face + 0.24, levels[0] - 0.1), 0.006, BRASS_D, 'mug_hook', verts=4)
        k.cyl(mx, r_face + 0.24, levels[0] - 0.24, levels[0] - 0.1, 0.05, CROCK_W if i % 3 else CROCK_B, 'mug', verts=10)


def plate_dresser(k, x0, x1, r_face, h=2.2, d=0.5):
    """A Welsh dresser: cupboards below, a worktop with a tureen and a jug, plate racks above with blue-and-white
    plates stood on edge behind a rail, a cornice."""
    k.box(x0, r_face, 0, x1, r_face + d, 0.86, (WOOD_D, 0.08), 'dresser_base')
    n = max(2, int(round((x1 - x0) / 0.6)))
    w = (x1 - x0) / n
    for i in range(n):
        a = x0 + i * w
        k.box(a + 0.05, r_face + d, 0.1, a + w - 0.05, r_face + d + 0.02, 0.62, (WOOD, 0.08), 'dresser_door')
        k.box(a + 0.12, r_face + d + 0.02, 0.17, a + w - 0.12, r_face + d + 0.03, 0.55, (shade(WOOD, 1.1), 0.08), 'dresser_panel')
        k.sphere(a + w / 2, r_face + d + 0.04, 0.72, 0.025, 0.025, BRASS, 'dresser_knob', segs=6)
        k.box(a + 0.05, r_face + d, 0.66, a + w - 0.05, r_face + d + 0.02, 0.8, (WOOD, 0.08), 'dresser_drawer')
    k.box(x0 - 0.04, r_face, 0.86, x1 + 0.04, r_face + d + 0.04, 0.92, (WOOD, 0.1), 'dresser_top')
    k.box(x0, r_face, 0.92, x1, r_face + 0.24, h, (WOOD_D, 0.08), 'dresser_back')
    for xx in (x0, x1 - 0.06):
        k.box(xx, r_face, 0.92, xx + 0.06, r_face + 0.3, h, WOOD_D, 'dresser_side')
    for z in (1.35, 1.8):
        k.box(x0, r_face, z - 0.04, x1, r_face + 0.3, z, (WOOD, 0.1), 'dresser_shelf')
        k.box(x0, r_face + 0.24, z + 0.08, x1, r_face + 0.27, z + 0.11, WOOD, 'plate_rail')
        x = x0 + 0.18
        i = 0
        while x < x1 - 0.15:
            rad = 0.15 if i % 3 else 0.12
            k.cyl_y(x, r_face + 0.1, r_face + 0.14, z + rad, rad, rad, CROCK_W, 'plate', verts=16)
            k.cyl_y(x, r_face + 0.14, r_face + 0.145, z + rad, rad * 0.7, rad * 0.7, CROCK_B, 'plate_pattern', verts=16)
            k.cyl_y(x, r_face + 0.145, r_face + 0.15, z + rad, rad * 0.45, rad * 0.45, CROCK_W, 'plate_centre', verts=14)
            x += rad * 2 + 0.04
            i += 1
    k.box(x0 - 0.08, r_face, h, x1 + 0.08, r_face + 0.36, h + 0.1, (WOOD_D, 0.08), 'dresser_cornice')
    # on the worktop: a soup tureen, a milk jug, a bread crock
    z = 0.92
    tx = x0 + 0.45
    k.sphere(tx, r_face + 0.3, z + 0.12, 0.2, 0.13, CROCK_W, 'tureen', segs=14)
    k.cyl(tx, r_face + 0.3, z + 0.2, z + 0.24, 0.14, CROCK_B, 'tureen_band', verts=14)
    k.sphere(tx, r_face + 0.3, z + 0.27, 0.04, 0.03, CROCK_W, 'tureen_knob', segs=8)
    k.cyl(x1 - 0.35, r_face + 0.3, z, z + 0.22, 0.08, CROCK_B, 'jug', verts=12)
    k.cyl(x1 - 0.35, r_face + 0.3, z + 0.2, z + 0.24, 0.07, CROCK_W, 'jug_lip', verts=12)
    k.cyl((x0 + x1) / 2 + 0.1, r_face + 0.3, z, z + 0.24, 0.13, '#c8a070', 'bread_crock', verts=14)
    k.solid(x0, r_face, x1, r_face + d)


def butcher_block(k, x0, x1, r0, r1, h=0.88):
    """The cook's worktop: an end-grain block on stout legs, a shelf of baskets under it. On it a board with a loaf
    half sliced, onions and carrots, a cleaver, a bowl of potatoes; a knife block at one end."""
    k.box(x0, r0, h - 0.14, x1, r1, h, (WOOD_L, 0.16), 'block_top')
    x = x0 + 0.06                   # the end grain in squares
    while x < x1 - 0.05:
        k.box(x, r0 - 0.005, h - 0.13, x + 0.005, r1 + 0.005, h - 0.01, shade(WOOD_L, 0.75), 'block_joint')
        x += 0.25
    for xx in (x0 + 0.04, x1 - 0.14):
        for rr in (r0 + 0.04, r1 - 0.14):
            k.box(xx, rr, 0, xx + 0.1, rr + 0.1, h - 0.14, WOOD_D, 'block_leg')
    k.box(x0 + 0.08, r0 + 0.08, 0.14, x1 - 0.08, r1 - 0.08, 0.18, WOOD_D, 'block_shelf')
    for i in range(int((x1 - x0) / 0.5)):
        bx = x0 + 0.3 + i * 0.5
        k.cyl(bx, (r0 + r1) / 2, 0.18, 0.36, 0.18, ('#a07a40', 0.15), 'basket', ry=0.14, verts=12)
        for j in range(3):
            k.sphere(bx - 0.06 + j * 0.06, (r0 + r1) / 2 + (j % 2) * 0.03, 0.37, 0.05, 0.04,
                     k.rng.choice(['#c8a060', '#a86a3a', '#e8d8b0']), 'veg', segs=8)
    z = h
    # the board, the loaf, slices
    bx = x0 + 0.5
    k.box(bx - 0.3, r0 + 0.1, z, bx + 0.3, r0 + 0.5, z + 0.03, WOOD, 'bread_board')
    k.sphere(bx - 0.08, r0 + 0.3, z + 0.1, 0.16, 0.09, '#c8883e', 'loaf', ry=0.11, segs=12)
    for i in range(3):
        k.box(bx + 0.1 + i * 0.05, r0 + 0.2, z + 0.03, bx + 0.13 + i * 0.05, r0 + 0.4, z + 0.13, '#e8d0a0', 'bread_slice')
    # onions, carrots
    ox = (x0 + x1) / 2
    for i in range(3):
        k.sphere(ox + i * 0.12, r1 - 0.25 + (i % 2) * 0.06, z + 0.06, 0.06, 0.055, '#c8904a', 'onion', segs=8)
    for i in range(3):
        k.tube((ox + 0.4 + i * 0.05, r1 - 0.35, z + 0.03), (ox + 0.48 + i * 0.05, r1 - 0.12, z + 0.03), 0.03, '#e07028', 'carrot',
               rb=0.008, verts=6)
    # a cleaver on the block, a bowl of potatoes
    k.box(ox - 0.35, r0 + 0.2, z, ox - 0.12, r0 + 0.32, z + 0.015, '#b8bcc4', 'cleaver')
    k.box(ox - 0.12, r0 + 0.24, z, ox + 0.05, r0 + 0.28, z + 0.03, WOOD_DD, 'cleaver_handle')
    k.cyl(x1 - 0.35, (r0 + r1) / 2, z, z + 0.12, 0.2, CROCK_B, 'bowl', verts=14)
    for j in range(5):
        a = j * 1.3
        k.sphere(x1 - 0.35 + math.cos(a) * 0.08, (r0 + r1) / 2 + math.sin(a) * 0.06, z + 0.13, 0.06, 0.045, '#b08a50', 'potato', segs=8)
    # a knife block
    k.box(x1 - 0.14, r0 + 0.08, z, x1 - 0.04, r0 + 0.3, z + 0.18, WOOD_D, 'knife_block')
    for j in range(3):
        k.box(x1 - 0.12 + j * 0.025, r0 + 0.12, z + 0.18, x1 - 0.105 + j * 0.025, r0 + 0.14, z + 0.27, WOOD_DD, 'knife_handle')
    k.solid(x0, r0, x1, r1)


def pass_counter(k, x0, x1, r0, r1, h=1.0):
    """The pass between the galley and the mess, running up and down the room (x across, r along): a panelled front to
    the mess, a scrubbed top with a lip, plates waiting with a cloche, a stack of trays, a bell to ring."""
    k.box(x0, r0, 0, x1, r1, h - 0.06, (WOOD_D, 0.1), 'counter')
    r = r0 + 0.5
    while r < r1 - 0.3:
        k.box(x1, r - 0.04, 0.08, x1 + 0.03, r + 0.04, h - 0.12, WOOD_DD, 'counter_panel')
        r += 0.9
    k.box(x1, r0, 0.0, x1 + 0.04, r1, 0.08, WOOD_DD, 'counter_kick')
    k.box(x0 - 0.05, r0 - 0.06, h - 0.06, x1 + 0.1, r1 + 0.06, h, (WOOD_L, 0.14), 'counter_top')
    k.box(x1 + 0.06, r0 - 0.06, h - 0.08, x1 + 0.12, r1 + 0.06, h, BRASS_D, 'counter_lip')
    cx = (x0 + x1) / 2
    z = h
    # plates waiting: two under a cloche, two with food
    k.cyl(cx, r0 + 0.5, z, z + 0.02, 0.15, CROCK_W, 'plate', verts=14)
    k.sphere(cx, r0 + 0.5, z + 0.02, 0.14, 0.12, ('#c8ccd2', 0.04), 'cloche', segs=14)
    k.sphere(cx, r0 + 0.5, z + 0.15, 0.025, 0.02, BRASS, 'cloche_knob', segs=6)
    for i, rr in enumerate((r0 + 1.1, r0 + 1.5)):
        k.cyl(cx, rr, z, z + 0.02, 0.15, CROCK_W, 'plate', verts=14)
        k.sphere(cx - 0.04, rr, z + 0.05, 0.08, 0.04, '#b06a30', 'food', segs=8)
        k.sphere(cx + 0.06, rr - 0.03, z + 0.04, 0.05, 0.03, '#5a8a3a', 'food_greens', segs=8)
        k.sphere(cx + 0.05, rr + 0.06, z + 0.04, 0.05, 0.035, '#e8d090', 'food_mash', segs=8)
    # trays and a bell
    for j in range(4):
        k.box(cx - 0.2, r1 - 0.7, z + j * 0.02, cx + 0.2, r1 - 0.2, z + 0.015 + j * 0.02, TIN if j % 2 else '#a0a4ac', 'tray')
    k.cyl(cx, r1 - 1.0, z, z + 0.02, 0.06, '#2a2a30', 'bell_base', verts=10)
    k.sphere(cx, r1 - 1.0, z + 0.05, 0.05, 0.04, BRASS, 'bell', segs=10)
    k.solid(x0, r0, x1 + 0.1, r1)


def long_table(k, x0, x1, cr, h=0.78, d=0.85, laid=True):
    """A mess table: a long scrubbed top on trestles, fiddle rails round it against the roll; laid with plates, mugs,
    a bread board, a cruet, a candle in a hurricane glass."""
    r0, r1 = cr - d / 2, cr + d / 2
    k.box(x0, r0, h - 0.07, x1, r1, h, (WOOD_L, 0.14), 'table', bevel=0.01)
    for (a, b, c, e) in ((x0, r0, x1, r0 + 0.03), (x0, r1 - 0.03, x1, r1)):
        k.box(a, b, h, c, e, h + 0.04, WOOD_D, 'fiddle_rail')
    for xx in (x0 + 0.35, x1 - 0.35):
        k.box(xx - 0.05, r0 + 0.1, 0.06, xx + 0.05, r1 - 0.1, h - 0.07, WOOD_D, 'trestle')
        k.box(xx - 0.12, r0 + 0.05, 0, xx + 0.12, r1 - 0.05, 0.08, WOOD_D, 'trestle_foot')
    k.box(x0 + 0.35, cr - 0.04, 0.3, x1 - 0.35, cr + 0.04, 0.36, WOOD_D, 'table_stretcher')
    if laid:
        z = h
        x = x0 + 0.45
        while x < x1 - 0.3:
            for rr, sd in ((r0 + 0.2, -1), (r1 - 0.2, 1)):
                if k.rng.random() < 0.75:
                    k.cyl(x, rr, z, z + 0.02, 0.13, CROCK_W, 'plate', verts=14)
                    k.cyl(x, rr, z + 0.02, z + 0.025, 0.09, CROCK_B, 'plate_pattern', verts=12)
                if k.rng.random() < 0.6:
                    k.cyl(x + 0.22, rr - sd * 0.05, z, z + 0.13, 0.05, k.rng.choice([CROCK_W, TIN, CROCK_B]), 'mug', verts=10)
            x += 0.9
        mid = (x0 + x1) / 2
        k.box(mid - 0.25, cr - 0.12, z, mid + 0.25, cr + 0.12, z + 0.03, WOOD, 'bread_board')
        k.sphere(mid - 0.05, cr, z + 0.09, 0.15, 0.08, '#c8883e', 'loaf', ry=0.09, segs=12)
        k.cyl(mid + 0.5, cr, z, z + 0.04, 0.12, WOOD_D, 'cruet', verts=10)
        for dx, col in ((-0.05, CROCK_W), (0.05, '#2a2a30')):
            k.cyl(mid + 0.5 + dx, cr, z + 0.04, z + 0.14, 0.03, col, 'cruet_pot', verts=8)
        hx = mid - 0.7
        k.cyl(hx, cr, z, z + 0.03, 0.08, BRASS, 'hurricane_base', verts=10)
        k.cyl(hx, cr, z + 0.03, z + 0.13, 0.025, CANDLE, 'candle', verts=8)
        k.sphere(hx, cr, z + 0.17, 0.02, 0.035, FIRE_HOT, 'flame', emit=(FIRE_HOT, 3.0), segs=6)
        k.cyl(hx, cr, z + 0.03, z + 0.3, 0.07, ('#c8d8e0', 0.04), 'hurricane_glass', emit=('#ffd890', 0.25), verts=12)
        k.point_light(hx, cr, z + 0.3, '#ffb060', 2.5, radius=0.06, group='flicker')
    k.solid(x0, r0, x1, r1)


def card_table(k, cx, cr, h=0.76, rad=0.62):
    """The card table in the mess's corner: a round top in green baize with a wooden rim, a pedestal, four captain's
    chairs round it (the near one pushed back for whoever sits in). The cards themselves are the `cards` variant."""
    k.cyl(cx, cr, h - 0.06, h, rad, (WOOD_D, 0.08), 'card_table_rim', verts=28)
    k.cyl(cx, cr, h, h + 0.01, rad - 0.08, (BAIZE, 0.06), 'baize', verts=28)
    k.cyl(cx, cr, 0.1, h - 0.06, 0.09, WOOD_D, 'card_table_pedestal', verts=10)
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        k.tube((cx, cr, 0.12), (cx + math.cos(a) * 0.4, cr + math.sin(a) * 0.4, 0.02), 0.05, WOOD_D, 'card_table_foot', verts=8)
    k.solid(cx - rad, cr - rad, cx + rad, cr + rad)


def chair(k, cx, cr, facing, tone=WOOD, solid=True):
    """A captain's chair (a low round back, spindles, a saddle seat); `facing` the way someone sat in it looks."""
    dx, dr = {'down': (0, 1), 'up': (0, -1), 'left': (-1, 0), 'right': (1, 0)}[facing]
    k.cyl(cx, cr, 0.42, 0.48, 0.24, (tone, 0.12), 'chair_seat', verts=16)
    for a in (0.6, 2.5, 3.8, 5.6):
        k.tube((cx + math.cos(a) * 0.17, cr + math.sin(a) * 0.15, 0.42), (cx + math.cos(a) * 0.2, cr + math.sin(a) * 0.18, 0.0),
               0.025, WOOD_D, 'chair_leg', verts=6)
    # the back: a bow behind the seat, opposite the way they face
    bx, br = cx - dx * 0.2, cr - dr * 0.2
    px, pr = -dr, dx                  # along the bow
    pts = []
    for j in range(9):
        t = -1 + j / 4.0
        ang = t * 1.2
        pts.append((bx + px * math.sin(ang) * 0.22 - dx * (math.cos(ang) - 1) * -0.06,
                    br + pr * math.sin(ang) * 0.22 - dr * (math.cos(ang) - 1) * -0.06, 0.78))
    for a, b in zip(pts, pts[1:]):
        k.tube(a, b, 0.035, (tone, 0.1), 'chair_back', verts=6, smooth=False)
    for j in (1, 3, 5, 7):
        p = pts[j]
        k.tube((p[0] * 0.85 + cx * 0.15, p[1] * 0.85 + cr * 0.15, 0.48), p, 0.014, WOOD_D, 'chair_spindle', verts=4)
    if solid:
        k.solid(cx - 0.25, cr - 0.25, cx + 0.25, cr + 0.25)


def card_spread(k, cx, cr, h=0.77, players=((0, -1), (-1, 0), (1, 0), (0, 1))):
    """Cards in play on the baize (the `cards` variant): a hand face down before each place, the pile in the middle and
    the stock beside it, a heap of coins, a tin cup of matches, a pipe in a dish."""
    z = h + 0.012
    for (dx, dr) in players:
        px, pr = cx + dx * 0.36, cr + dr * 0.3
        for j in range(5):
            o = (j - 2) * 0.05
            k.box(px + (o if dr else 0) - 0.05, pr + (o if dx else 0) - 0.07, z + j * 0.002, px + (o if dr else 0) + 0.05,
                  pr + (o if dx else 0) + 0.07, z + 0.006 + j * 0.002, CARD_R if j % 2 == 0 else '#8a1a1a', 'card_back')
    # the pile, face up, a little scattered; the stock, squared
    for j in range(6):
        a = j * 0.5
        ox, orr = math.cos(a) * 0.02, math.sin(a) * 0.015
        k.box(cx - 0.06 + ox, cr - 0.08 + orr, z + j * 0.003, cx + 0.06 + ox, cr + 0.08 + orr, z + 0.004 + j * 0.003, CARD_W, 'card_face')
    k.box(cx - 0.03, cr - 0.03, z + 0.022, cx + 0.03, cr + 0.03, z + 0.024, CARD_R, 'card_pip')
    k.box(cx + 0.12, cr - 0.08, z, cx + 0.24, cr + 0.08, z + 0.05, CARD_R, 'stock')
    for j in range(5):
        k.cyl(cx - 0.2 + (j % 2) * 0.03, cr + 0.12, z + j * 0.012, z + 0.01 + j * 0.012, 0.03, '#e0b040', 'coin', verts=8)
    k.cyl(cx - 0.22, cr - 0.12, z, z + 0.08, 0.04, TIN, 'match_cup', verts=8)
    for j in range(4):
        k.tube((cx - 0.22 + j * 0.01, cr - 0.12, z + 0.06), (cx - 0.23 + j * 0.02, cr - 0.1, z + 0.14), 0.004, '#e8d8b0', 'match', verts=4)
    k.cyl(cx + 0.24, cr + 0.16, z, z + 0.02, 0.06, CROCK_W, 'dish', verts=10)
    k.tube((cx + 0.2, cr + 0.16, z + 0.03), (cx + 0.3, cr + 0.18, z + 0.04), 0.012, WOOD_DD, 'pipe_stem', verts=4)
    k.cyl(cx + 0.31, cr + 0.18, z + 0.02, z + 0.07, 0.025, WOOD_DD, 'pipe_bowl', verts=8)


def menu_board(k, cx, r_face, z0=1.1, w=1.1, h=0.8):
    """The day's menu: a blackboard in a frame, chalk lines and a chalk-drawn fish and teacup, a shelf of chalk."""
    k.box(cx - w / 2 - 0.07, r_face, z0 - 0.07, cx + w / 2 + 0.07, r_face + 0.05, z0 + h + 0.07, WOOD_D, 'board_frame')
    k.box(cx - w / 2, r_face + 0.03, z0, cx + w / 2, r_face + 0.06, z0 + h, '#1e2a26', 'blackboard')
    k.box(cx - 0.3, r_face + 0.055, z0 + h - 0.12, cx + 0.3, r_face + 0.065, z0 + h - 0.08, '#e8e8dc', 'chalk')       # the heading
    for i in range(4):
        zz = z0 + h - 0.25 - i * 0.14
        ln = (0.5, 0.42, 0.55, 0.36)[i] * w
        k.box(cx - w / 2 + 0.1, r_face + 0.055, zz, cx - w / 2 + 0.1 + ln, r_face + 0.065, zz + 0.03, '#d8dccc', 'chalk')
        k.box(cx + w / 2 - 0.22, r_face + 0.055, zz, cx + w / 2 - 0.1, r_face + 0.065, zz + 0.03, '#e8c860', 'chalk')
    # a chalk fish in the corner
    fx, fz = cx + w / 2 - 0.24, z0 + 0.12
    k.box(fx - 0.1, r_face + 0.055, fz, fx + 0.06, r_face + 0.065, fz + 0.06, '#a0d0e0', 'chalk')
    k.box(fx + 0.06, r_face + 0.055, fz - 0.02, fx + 0.1, r_face + 0.065, fz + 0.08, '#a0d0e0', 'chalk')
    k.box(cx - w / 2 - 0.05, r_face + 0.05, z0 - 0.1, cx + w / 2 + 0.05, r_face + 0.14, z0 - 0.07, WOOD, 'chalk_shelf')
    k.box(cx - 0.1, r_face + 0.08, z0 - 0.07, cx - 0.02, r_face + 0.11, z0 - 0.05, '#f0f0e8', 'chalk_stick')


def sacks_and_casks(k, x0, r0):
    """Stores in a corner: sacks of flour and oats, a cask of salt pork, a crate of apples, a net of onions on a nail."""
    for (dx, dr, h, col) in ((0.25, 0.25, 0.6, '#e8e0cc'), (0.7, 0.2, 0.52, '#d8c8a0'), (0.45, 0.65, 0.5, '#c8b890')):
        k.sphere(x0 + dx, r0 + dr, h / 2, 0.24, h / 2, (col, 0.06), 'sack', ry=0.2, segs=12)
        k.cyl(x0 + dx, r0 + dr, h - 0.05, h + 0.05, 0.06, '#8a6a40', 'sack_tie', verts=8)
    k.box(x0 + 0.95, r0 + 0.5, 0, x0 + 1.5, r0 + 0.95, 0.38, (WOOD_L, 0.12), 'apple_crate')
    for i in range(7):
        k.sphere(x0 + 1.05 + (i % 4) * 0.12, r0 + 0.62 + (i // 4) * 0.15, 0.4, 0.06, 0.055, k.rng.choice(['#b02a20', '#c84a28', '#8aa83a']),
                 'apple', segs=8)
    k.solid(x0, r0, x0 + 1.5, r0 + 0.95)


def galley_sink(k, x0, x1, r_face, h=0.9, d=0.62):
    """A copper sink in a wooden stand under the fresh-water tank and its brass tap; a draining board with plates
    standing, a scrubbing brush, a bucket under."""
    k.box(x0, r_face, 0, x1, r_face + d, h - 0.06, (WOOD_D, 0.1), 'sink_stand')
    k.box(x0 - 0.03, r_face, h - 0.06, x1 + 0.03, r_face + d + 0.03, h, (WOOD, 0.12), 'sink_top')
    sx0, sx1 = x0 + 0.1, x0 + (x1 - x0) * 0.55
    k.box(sx0, r_face + 0.1, h - 0.2, sx1, r_face + d - 0.08, h + 0.02, COPPER, 'sink')
    k.box(sx0 + 0.04, r_face + 0.14, h - 0.12, sx1 - 0.04, r_face + d - 0.12, h - 0.1, '#5a8aa0', 'sink_water')
    # the tank on the wall, its tap
    k.box(x0 + 0.05, r_face, 1.4, x1 - 0.05, r_face + 0.4, 2.05, (COPPER_D, 0.06), 'water_tank')
    for z in (1.5, 1.95):
        k.box(x0 + 0.03, r_face + 0.4, z - 0.02, x1 - 0.03, r_face + 0.42, z + 0.02, BRASS, 'tank_band')
    x = x0 + 0.15
    while x < x1 - 0.1:
        k.sphere(x, r_face + 0.42, 1.5, 0.018, 0.018, BRASS, 'tank_rivet', segs=6)
        k.sphere(x, r_face + 0.42, 1.95, 0.018, 0.018, BRASS, 'tank_rivet', segs=6)
        x += 0.18
    tx = (sx0 + sx1) / 2
    k.tube((tx, r_face + 0.4, 1.45), (tx, r_face + 0.55, 1.2), 0.03, BRASS, 'tap', verts=8)
    k.tube((tx, r_face + 0.55, 1.2), (tx, r_face + 0.55, 1.08), 0.022, BRASS, 'tap', verts=8)
    k.cyl_x(tx - 0.08, tx + 0.08, r_face + 0.48, 1.38, 0.02, 0.02, '#a03a2a', 'tap_wheel', verts=8)
    # draining board with plates stood up
    dx0 = sx1 + 0.05
    for i in range(4):
        k.box(dx0 + i * 0.03, r_face + 0.1, h - 0.02, dx0 + 0.01 + i * 0.03, r_face + d - 0.1, h, WOOD_D, 'drain_groove')
    for i in range(3):
        px = dx0 + 0.1 + i * 0.08
        k.cyl_x(px, px + 0.02, r_face + 0.3, h + 0.13, 0.13, 0.13, CROCK_W, 'plate', verts=14)
    k.box(x1 - 0.2, r_face + d - 0.2, h, x1 - 0.06, r_face + d - 0.12, h + 0.04, WOOD_L, 'brush')
    k.cyl(x1 - 0.25, r_face + d + 0.25, 0, 0.32, 0.16, (WOOD, 0.1), 'bucket', verts=12)
    k.cyl(x1 - 0.25, r_face + d + 0.25, 0.28, 0.3, 0.14, '#5a8aa0', 'bucket_water', verts=12)
    k.solid(x0, r_face, x1, r_face + d)


def rag_rug(k, cx, cr, rx, ry, cols=('#6a3a32', '#8a6a48', '#4a5a50', '#7a4a3a', '#5a4a5a', '#9a7a52', '#5a3a2e', '#6a6a52')):
    """A braided rag rug, oval: rings of plaited scraps in turn, each ring of short strands of its colour."""
    n = 9
    for i in range(n):
        f0, f1 = 1 - i / n, 1 - (i + 1) / n
        col = cols[i % len(cols)]
        seg = 28
        for j in range(seg):
            a0, a1 = j * 2 * math.pi / seg, (j + 1) * 2 * math.pi / seg
            pts = [(cx + math.cos(a0) * rx * f0, cr + math.sin(a0) * ry * f0, 0.006 + i * 0.001),
                   (cx + math.cos(a1) * rx * f0, cr + math.sin(a1) * ry * f0, 0.006 + i * 0.001),
                   (cx + math.cos(a1) * rx * f1, cr + math.sin(a1) * ry * f1, 0.006 + i * 0.001),
                   (cx + math.cos(a0) * rx * f1, cr + math.sin(a0) * ry * f1, 0.006 + i * 0.001)]
            k.poly(pts, shade(col, 1.08 if j % 2 else 0.92), 'rug_braid')


def onion_string(k, cx, r_face, z_top=2.1, n=7):
    """A string of onions hung on a nail, and a net of garlic beside it."""
    k.sphere(cx, r_face + 0.05, z_top + 0.03, 0.02, 0.02, IRON, 'nail', segs=6)
    for i in range(n):
        z = z_top - 0.12 - i * 0.12
        k.sphere(cx + (0.05 if i % 2 else -0.05), r_face + 0.1, z, 0.065, 0.06, k.rng.choice(['#c8904a', '#b07838', '#d8a868']), 'onion', segs=8)
    k.tube((cx, r_face + 0.06, z_top), (cx, r_face + 0.08, z_top - 0.9), 0.01, '#c8b080', 'onion_twine', verts=4)
    gx = cx + 0.3
    k.tube((gx, r_face + 0.06, z_top), (gx, r_face + 0.12, z_top - 0.25), 0.008, '#c8b080', 'net', verts=4)
    k.sphere(gx, r_face + 0.14, z_top - 0.38, 0.12, 0.15, ('#e8e0d0', 0.1), 'garlic', segs=10)


def front_wall(k, x0, x1, r0, height=0.4, doors=()):
    """The near wall, cut down to a low rail (assets_deck's look) — with any number of doors, or none."""
    W = DECK_WALL
    a = x0
    for (da, db) in sorted(doors) + [(x1, x1)]:
        if da - a > 0.01:
            k.box(a, r0, 0, da, r0 + 0.6, height, (W[1], 0.08), 'front_wall')
            k.box(a, r0, height, da, r0 + 0.6, height + 0.05, W[0], 'wall_cap')
            k.box(a, r0 - 0.01, height - 0.08, da, r0 + 0.02, height - 0.05, BRASS_D, 'rail')
        if db > da:
            k.box(da, r0, -0.01, db, r0 + 0.6, 0.02, (BRASS_D, 0.06), 'threshold')
            for xx in (da - 0.18, db):
                k.box(xx, r0, 0, xx + 0.18, r0 + 0.6, height + 0.3, (W[0], 0.05), 'door_post')
                k.cyl(xx + 0.09, r0 + 0.3, height + 0.3, height + 0.36, 0.08, BRASS, 'post_cap', verts=10)
        a = db


def wall_lantern(k, cx, r_face, z=1.75, energy=10.0):
    """A ship's lantern on an iron bracket off the wall, a little smoke-stain on the panel above it."""
    k.box(cx - 0.06, r_face, z + 0.05, cx + 0.06, r_face + 0.06, z + 0.35, IRON, 'lamp_plate')
    k.tube((cx, r_face + 0.05, z + 0.3), (cx, r_face + 0.3, z + 0.3), 0.02, IRON, 'lamp_bracket', verts=6)
    k.tube((cx, r_face + 0.3, z + 0.3), (cx, r_face + 0.3, z + 0.22), 0.012, IRON, 'lamp_bracket', verts=4)
    lantern(k, cx, r_face + 0.3, z - 0.08, z + 0.16, s=0.09)
    k.box(cx - 0.18, r_face + 0.005, z + 0.45, cx + 0.18, r_face + 0.01, z + 0.85, shade(DECK_WALL[2], 0.75), 'soot')
    k.point_light(cx, r_face + 0.55, z, '#ffb060', energy, radius=0.1, group='flicker')


# ---- the observatory ------------------------------------------------------------------------------------------------
NAVY = '#16233e'
NIGHT = '#0c1424'
VELVET = '#3a2450'
RED_LAMP = '#ff5040'


def glazed_wall(k, x0, x1, r_face, height, z0=0.85, frame=BRASS_D, bars=0.9, arch=True, tone=None):
    """A wall of glass onto space (HOLDOUT) over a panelled wainscot: mullions every `bars` tiles, transoms across, and
    (arch) the bars curving over at the top as a dome's ribs would. tone: the frames' colour (brass; the greenhouse's
    painted iron)."""
    W = DECK_WALL
    fr = tone or frame
    k.box(x0, r_face - 0.6, 0, x1, r_face - 0.4, height, W[0], 'wall_back')
    k.box(x0, r_face - 0.4, 0, x1, r_face, z0, (W[1], 0.08), 'wall')
    k.box(x0, r_face - 0.02, 0, x1, r_face + 0.08, 0.2, (W[0], 0.05), 'skirting')
    x = x0 + 0.1
    while x < x1 - 0.3:
        xe = min(x1 - 0.1, x + 1.0)
        k.box(x + 0.06, r_face, 0.26, xe - 0.06, r_face + 0.04, z0 - 0.14, (W[2], 0.08), 'wainscot')
        k.box(x + 0.14, r_face + 0.04, 0.34, xe - 0.14, r_face + 0.055, z0 - 0.22, (W[3], 0.08), 'wainscot_raise')
        x = xe
    k.box(x0, r_face - 0.1, z0 - 0.06, x1, r_face + 0.2, z0, (W[0], 0.06), 'sill')
    k.box(x0, r_face + 0.18, z0 - 0.04, x1, r_face + 0.22, z0, BRASS, 'sill_brass')
    k.box(x0, r_face - 0.02, z0, x1, r_face + 0.02, height, 'HOLDOUT', 'viewport')
    k.box(x0, r_face, height - 0.2, x1, r_face + 0.16, height + 0.05, (W[0], 0.06), 'header')
    n = max(2, int(round((x1 - x0) / bars)))
    cx, span = (x0 + x1) / 2, (x1 - x0) / 2
    for i in range(n + 1):
        x = x0 + i * (x1 - x0) / n
        top = height - 0.2
        if arch:                                  # the ribs lean in toward the crown as they rise
            lean = (x - cx) / span
            pts = [(x - lean * 0.25 * (j / 5) ** 2, r_face + 0.06, z0 + (top - z0) * j / 5) for j in range(6)]
            for a, b in zip(pts, pts[1:]):
                k.tube(a, b, 0.035, fr, 'rib', verts=6, smooth=False)
        else:
            k.box(x - 0.035, r_face, z0, x + 0.035, r_face + 0.08, top, fr, 'mullion')
    for zz in (z0 + (height - z0) * 0.36, z0 + (height - z0) * 0.7):
        k.box(x0, r_face + 0.02, zz - 0.025, x1, r_face + 0.08, zz + 0.025, fr, 'transom')
    if arch:                                      # a boss at each crossing
        for i in range(1, n):
            x = x0 + i * (x1 - x0) / n
            for zz in (z0 + (height - z0) * 0.36, z0 + (height - z0) * 0.7):
                k.sphere(x, r_face + 0.09, zz, 0.045, 0.045, BRASS, 'rib_boss', segs=6)


def great_telescope(k, cx, cr, R=1.25):
    """The great telescope on its dais: two round steps of planking with a brass nosing, a cast pier, an equatorial fork,
    the long brass tube raised to the glass with its finder and dew cap, an eyepiece at the low end, a counterweight on
    its arm, a stool for whoever's looking. Returns the dais height."""
    for i, (rr, zt) in enumerate(((R, 0.12), (R * 0.72, 0.24))):
        k.cyl(cx, cr, 0.0, zt, rr, (WOOD_D if i == 0 else WOOD, 0.1), 'dais', verts=28)
        k.cyl(cx, cr, zt - 0.02, zt + 0.005, rr + 0.03, BRASS_D, 'dais_nosing', verts=28)
    z = 0.24
    k.cyl(cx, cr, z, z + 0.12, 0.42, (IRON, 0.06), 'pier_foot', verts=16)
    k.cone(cx, cr, z + 0.12, z + 1.1, 0.3, 0.16, (NAVY, 0.06), 'pier', verts=16)
    k.cyl(cx, cr, z + 1.08, z + 1.18, 0.22, BRASS, 'pier_cap', verts=16)
    hz = z + 1.3
    for sd in (-1, 1):                            # the fork
        k.box(cx + sd * 0.26 - 0.04, cr - 0.08, z + 1.15, cx + sd * 0.26 + 0.04, cr + 0.08, hz + 0.1, BRASS_D, 'fork')
    a = (cx - 0.9, cr + 0.95, hz - 0.55)            # the eyepiece end, low and toward you
    b = (cx + 0.55, cr - 1.05, hz + 0.95)           # the objective, up at the glass
    k.tube(a, b, 0.17, (BRASS, 0.05), 'telescope', rb=0.13, verts=18)
    for t in (0.12, 0.45, 0.8):
        p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)
        d = (0.008, -0.012, 0.01)
        k.tube((p[0] - d[0], p[1] - d[1], p[2] - d[2]), (p[0] + d[0], p[1] + d[1], p[2] + d[2]), 0.19 - t * 0.04, BRASS_D, 'telescope_band', verts=18)
    k.tube(b, (b[0] + 0.12, b[1] - 0.17, b[2] + 0.12), 0.15, '#1a1a22', 'dew_cap', verts=18)
    k.cyl_y(b[0] + 0.12, b[1] - 0.2, b[1] - 0.16, b[2] + 0.12, 0.11, 0.11, '#1a2a4a', 'objective', emit=('#9ab8ff', 0.5), verts=16)
    k.tube((a[0] + 0.25, a[1] - 0.2, a[2] + 0.32), (a[0] + 0.85, a[1] - 0.85, a[2] + 0.86), 0.04, BRASS, 'finder', verts=8)
    k.tube(a, (a[0] - 0.12, a[1] + 0.1, a[2] - 0.05), 0.05, '#2a2a30', 'eyepiece', verts=8)
    k.tube((cx, cr, hz), (cx + 0.55, cr + 0.6, hz - 0.2), 0.03, BRASS_D, 'counter_arm', verts=6)
    k.sphere(cx + 0.6, cr + 0.66, hz - 0.22, 0.13, 0.13, (IRON, 0.06), 'counterweight', segs=12)
    # the observer's stool, its seat worn
    sx, sr = a[0] - 0.15, a[1] + 0.35
    k.cyl(sx, sr, 0.24 + 0.5, 0.24 + 0.56, 0.18, (LEATHER, 0.08), 'stool_seat', verts=14)
    k.cyl(sx, sr, 0.24, 0.24 + 0.5, 0.03, BRASS_D, 'stool_post', verts=6)
    k.cyl(sx, sr, 0.24, 0.27, 0.15, BRASS_D, 'stool_foot', verts=12)
    k.solid(cx - 0.6, cr - 0.6, cx + 0.6, cr + 0.6)
    return 0.24


def star_chart(k, x0, r0, x1, r1, h=0.82):
    """A chart table, its top a celestial chart under glass: a navy sky with the constellations pricked out in pale
    dots and gold lines, a brass rule and dividers on it, a red-shaded lamp so the eyes keep dark."""
    k.box(x0, r0, h - 0.08, x1, r1, h, (WOOD_D, 0.08), 'chart_table')
    for xx in (x0 + 0.06, x1 - 0.14):
        for rr in (r0 + 0.06, r1 - 0.14):
            k.box(xx, rr, 0, xx + 0.08, rr + 0.08, h - 0.08, WOOD_DD, 'table_leg')
    k.box(x0 + 0.08, r0 + 0.08, h, x1 - 0.08, r1 - 0.08, h + 0.006, NIGHT, 'star_map')
    for i in range(60):
        x, r = k.rng.uniform(x0 + 0.12, x1 - 0.12), k.rng.uniform(r0 + 0.12, r1 - 0.12)
        s = 0.012 if i % 6 else 0.02
        k.box(x - s, r - s, h + 0.006, x + s, r + s, h + 0.009, '#a8c0e8' if i % 4 else '#ffe8a0', 'star_dot', emit=('#c8d8ff', 0.4))
    for i in range(5):                            # constellation lines in gold
        xa, ra = k.rng.uniform(x0 + 0.2, x1 - 0.2), k.rng.uniform(r0 + 0.2, r1 - 0.2)
        for j in range(3):
            xb, rb = xa + k.rng.uniform(-0.3, 0.3), ra + k.rng.uniform(-0.2, 0.2)
            xb, rb = min(max(xb, x0 + 0.15), x1 - 0.15), min(max(rb, r0 + 0.15), r1 - 0.15)
            k.bar(xa, ra, xb, rb, h + 0.007, h + 0.009, 0.008, '#c8a040', 'star_line')
            xa, ra = xb, rb
    k.box(x0 + 0.3, r1 - 0.35, h + 0.01, x1 - 0.6, r1 - 0.3, h + 0.025, BRASS, 'rule')
    k.tube((x1 - 0.5, r0 + 0.3, h + 0.02), (x1 - 0.3, r0 + 0.55, h + 0.02), 0.01, BRASS, 'dividers', verts=4)
    k.tube((x1 - 0.5, r0 + 0.3, h + 0.02), (x1 - 0.65, r0 + 0.55, h + 0.02), 0.01, BRASS, 'dividers', verts=4)
    red_lamp(k, x0 + 0.3, r0 + 0.3, h)
    k.solid(x0, r0, x1, r1)


def red_lamp(k, cx, cr, z):
    """A brass lamp with a red glass shade — an astronomer's, so the eyes keep their dark."""
    k.cyl(cx, cr, z, z + 0.03, 0.09, BRASS, 'lamp_base', verts=10)
    k.tube((cx, cr, z + 0.03), (cx, cr, z + 0.32), 0.012, BRASS, 'lamp_stem', verts=6)
    k.cone(cx, cr, z + 0.26, z + 0.4, 0.13, 0.05, '#3a0e0a', 'lamp_shade', emit=(RED_LAMP, 0.8), verts=12)
    k.point_light(cx, cr + 0.1, z + 0.3, '#ff6040', 4.0, radius=0.06, group='flicker')


def celestial_globe(k, cx, cr):
    """A celestial globe on a turned stand: a navy sphere with gold stars and the ecliptic, its brass meridian ring."""
    for a in (0.4, 2.5, 4.6):
        k.tube((cx + math.cos(a) * 0.28, cr + math.sin(a) * 0.22, 0.0), (cx, cr, 0.55), 0.025, (WOOD_D, 0.1), 'globe_leg', verts=6)
    k.cyl(cx, cr, 0.55, 0.62, 0.32, (WOOD, 0.1), 'globe_horizon', verts=20)
    k.sphere(cx, cr, 0.92, 0.3, 0.3, (NAVY, 0.06), 'globe', segs=18)
    for i in range(14):
        a, e = k.rng.uniform(-1.2, 1.2), k.rng.uniform(-1.0, 1.0)
        k.sphere(cx + math.sin(a) * math.cos(e) * 0.3, cr + math.cos(a) * math.cos(e) * 0.3, 0.92 + math.sin(e) * 0.3, 0.012, 0.012,
                 '#f0d070', 'globe_star', segs=4)
    n = 22
    for i in range(n):
        a0, a1 = i * 2 * math.pi / n, (i + 1) * 2 * math.pi / n
        k.tube((cx + math.cos(a0) * 0.34, cr, 0.92 + math.sin(a0) * 0.34), (cx + math.cos(a1) * 0.34, cr, 0.92 + math.sin(a1) * 0.34),
               0.012, BRASS, 'globe_meridian', verts=4)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def chaise(k, x0, x1, cr, tone=VELVET):
    """A chaise longue for lying back under the glass: buttoned velvet, a raised end, turned legs, a rug thrown over."""
    k.box(x0, cr - 0.3, 0.12, x1, cr + 0.3, 0.38, (tone, 0.08), 'chaise_base', bevel=0.04)
    k.box(x0 + 0.04, cr - 0.28, 0.38, x1 - 0.04, cr + 0.28, 0.46, (shade(tone, 1.15), 0.08), 'chaise_cushion', bevel=0.04)
    k.loft([[(x0, cr - 0.3, 0.38), (x0, cr + 0.3, 0.38)], [(x0 + 0.05, cr - 0.3, 0.75), (x0 + 0.05, cr + 0.3, 0.75)],
            [(x0 + 0.3, cr - 0.3, 0.95), (x0 + 0.3, cr + 0.3, 0.95)]], (tone, 0.08), 'chaise_back', smooth=True)
    for xx in (x0 + 0.08, x1 - 0.08):
        for rr in (cr - 0.24, cr + 0.24):
            k.cyl(xx, rr, 0.0, 0.12, 0.035, WOOD_DD, 'chaise_leg', verts=8)
    k.box(x1 - 0.7, cr - 0.31, 0.3, x1 - 0.2, cr + 0.31, 0.47, ('#8a6a3a', 0.1), 'throw')
    for j in range(5):
        k.sphere(x0 + 0.5 + j * 0.25, cr + 0.29, 0.3, 0.02, 0.02, shade(tone, 0.6), 'chaise_button', segs=6)
    k.solid(x0, cr - 0.3, x1, cr + 0.3)


def zodiac_rug(k, cx, cr, R):
    """A round rug: navy, a gold ring of the twelve houses (a mark each), a scatter of stars, a sun in the middle."""
    k.cyl(cx, cr, 0.0, 0.012, R, (NAVY, 0.06), 'rug_zodiac', verts=40)
    k.cyl(cx, cr, 0.012, 0.016, R * 0.82, '#1e2e4e', 'rug_zodiac', verts=40)
    for i in range(12):
        a = i * math.pi / 6
        k.box(cx + math.cos(a) * R * 0.9 - 0.04, cr + math.sin(a) * R * 0.9 - 0.04, 0.012, cx + math.cos(a) * R * 0.9 + 0.04,
              cr + math.sin(a) * R * 0.9 + 0.04, 0.016, '#e0b040', 'rug_mark')
    n = 40
    for rr in (R * 0.82, R * 0.97):
        for i in range(n):
            a0, a1 = i * 2 * math.pi / n, (i + 1) * 2 * math.pi / n
            k.bar(cx + math.cos(a0) * rr, cr + math.sin(a0) * rr, cx + math.cos(a1) * rr, cr + math.sin(a1) * rr, 0.012, 0.017, 0.02, '#c8a040', 'rug_ring')
    k.cyl(cx, cr, 0.012, 0.018, R * 0.16, '#e0b040', 'rug_sun', verts=16)
    for i in range(18):
        a, d = k.rng.uniform(0, 2 * math.pi), k.rng.uniform(R * 0.25, R * 0.75)
        k.box(cx + math.cos(a) * d - 0.015, cr + math.sin(a) * d - 0.015, 0.016, cx + math.cos(a) * d + 0.015, cr + math.sin(a) * d + 0.015, 0.018, '#e8e0c0', 'rug_star')


def armillary(k, cx, cr, z, R=0.28):
    """An armillary sphere on a stand: brass rings crossed at angles round a little globe."""
    k.cyl(cx, cr, z, z + 0.04, 0.12, BRASS_D, 'armillary_foot', verts=10)
    k.tube((cx, cr, z + 0.04), (cx, cr, z + 0.3), 0.015, BRASS, 'armillary_stem', verts=6)
    c = (cx, cr, z + 0.3 + R)
    for (tilt, yaw) in ((0, 0), (math.pi / 2, 0), (0.4, math.pi / 2), (1.2, 0.8)):
        n = 18
        pts = []
        for i in range(n + 1):
            a = i * 2 * math.pi / n
            x, y, zz = math.cos(a) * R, math.sin(a) * R * math.cos(tilt), math.sin(a) * R * math.sin(tilt)
            x, y = x * math.cos(yaw) - y * math.sin(yaw), x * math.sin(yaw) + y * math.cos(yaw)
            pts.append((c[0] + x, c[1] + y * 0.6, c[2] + zz))
        for a2, b2 in zip(pts, pts[1:]):
            k.tube(a2, b2, 0.008, BRASS, 'armillary_ring', verts=4, smooth=False)
    k.sphere(c[0], c[1], c[2], 0.06, 0.06, '#3a6aa0', 'armillary_globe', segs=10)


# ---- the greenhouse deck --------------------------------------------------------------------------------------------
IRON_G = '#2e4a3a'           # the glasshouse's painted iron
SOIL = '#3a2618'
LEAF = ['#3a7a32', '#4e9a3a', '#2e6a2e', '#68b048']


def brick_floor(k, x0, r0, x1, r1, tone='#7a4836'):
    """Brick paving in a basket weave: pairs of bricks turned each square, each its own tone, a pixel of joint."""
    k.box(x0, r0, -0.06, x1, r1, -0.005, '#3a2a20', 'floor_grout')
    s = 0.5
    r = r0
    j = 0
    while r < r1 - 1e-6:
        x = x0
        i = 0
        while x < x1 - 1e-6:
            xe, re = min(x1, x + s), min(r1, r + s)
            flat = (i + j) % 2 == 0
            for q in range(2):
                if flat:
                    a, b, c, d = x + 0.01, r + q * (re - r) / 2 + 0.01, xe - 0.01, r + (q + 1) * (re - r) / 2 - 0.01
                else:
                    a, b, c, d = x + q * (xe - x) / 2 + 0.01, r + 0.01, x + (q + 1) * (xe - x) / 2 - 0.01, re - 0.01
                if c - a > 0.02 and d - b > 0.02:
                    k.box(a, b, -0.02, c, d, 0.006, (shade(tone, k.rng.uniform(0.88, 1.06)), 0.12), 'floor_brick')
            x = xe
            i += 1
        r = min(r1, r + s)
        j += 1


def raised_bed(k, x0, r0, x1, r1, crop, h=0.5):
    """A raised bed boxed in planks with a capping rail, dark soil, and its crop: herbs (tufts of every green and a
    flowering one or two), salad (rosettes of lettuce, red and green), tomatoes (canes with vines and red and green
    fruit), strawberries (low leaves, white flowers, red berries)."""
    k.box(x0, r0, 0, x1, r1, h - 0.06, (WOOD, 0.1), 'bed_box')
    for zz in (0.16, 0.32):                        # the planks' joints along the near face
        k.box(x0 - 0.005, r1, zz - 0.006, x1 + 0.005, r1 + 0.008, zz + 0.006, WOOD_D, 'bed_joint')
    k.box(x0 - 0.04, r0 - 0.04, h - 0.06, x1 + 0.04, r1 + 0.04, h, (WOOD_L, 0.1), 'bed_rail')
    k.box(x0 + 0.06, r0 + 0.06, h - 0.07, x1 - 0.06, r1 - 0.06, h - 0.02, (SOIL, 0.14), 'ground_soil')
    z = h - 0.02
    if crop == 'herbs':
        x = x0 + 0.2
        while x < x1 - 0.15:
            r = r0 + 0.2
            while r < r1 - 0.15:
                col = k.rng.choice(LEAF + ['#7a9a5a', '#5a7a8a'])
                for q in range(4):
                    k.cone(x + k.rng.uniform(-0.06, 0.06), r + k.rng.uniform(-0.05, 0.05), z, z + k.rng.uniform(0.15, 0.3), 0.06, 0.01,
                           (shade(col, k.rng.uniform(0.85, 1.15)), 0.1), 'herb', verts=6)
                if k.rng.random() < 0.25:
                    k.sphere(x, r, z + 0.3, 0.03, 0.03, k.rng.choice(['#b080d0', '#f0f0e0', '#e0d040']), 'herb_flower', segs=6)
                r += 0.32
            x += 0.32
    elif crop == 'salad':
        x = x0 + 0.22
        i = 0
        while x < x1 - 0.15:
            r = r0 + 0.22
            while r < r1 - 0.15:
                col = '#7a2a3a' if (i % 3 == 0) else k.rng.choice(['#6ab040', '#8ac850'])
                for q in range(6):
                    a = q * math.pi / 3 + i
                    k.blob(x + math.cos(a) * 0.06, r + math.sin(a) * 0.05, z + 0.06, 0.08, 0.06, 0.05, (shade(col, 0.9 + 0.04 * q), 0.1), 'lettuce', segs=8)
                k.sphere(x, r, z + 0.09, 0.06, 0.05, shade(col, 1.2), 'lettuce_heart', segs=8)
                r += 0.36
                i += 1
            x += 0.36
    elif crop == 'tomatoes':
        x = x0 + 0.3
        while x < x1 - 0.2:
            for r in (r0 + 0.25, r1 - 0.25):
                k.cyl(x, r, z, z + 1.35, 0.015, '#8a7a50', 'cane', verts=4)
                for q in range(6):
                    zz = z + 0.2 + q * 0.2
                    k.blob(x + k.rng.uniform(-0.1, 0.1), r + k.rng.uniform(-0.06, 0.06), zz, 0.13, 0.1, 0.1, (k.rng.choice(LEAF), 0.1), 'tomato_leaves', segs=8)
                for q in range(3):
                    zz = z + 0.35 + q * 0.32
                    k.sphere(x + k.rng.uniform(-0.1, 0.1), r + 0.1, zz, 0.05, 0.05, '#d02a1a' if q != 1 else '#8ab030', 'tomato', segs=8)
            x += 0.45
    elif crop == 'strawberries':
        x = x0 + 0.18
        while x < x1 - 0.1:
            r = r0 + 0.18
            while r < r1 - 0.1:
                for q in range(3):
                    a = q * 2.1
                    k.blob(x + math.cos(a) * 0.05, r + math.sin(a) * 0.04, z + 0.05, 0.07, 0.06, 0.035, (k.rng.choice(LEAF), 0.1), 'strawberry_leaves', segs=6)
                if k.rng.random() < 0.6:
                    k.sphere(x + 0.06, r + 0.06, z + 0.04, 0.03, 0.035, '#e02030', 'strawberry', segs=6)
                if k.rng.random() < 0.3:
                    k.sphere(x - 0.05, r + 0.05, z + 0.08, 0.02, 0.02, '#f8f8f0', 'strawberry_flower', segs=6)
                r += 0.26
            x += 0.26
    k.solid(x0, r0, x1, r1)


def grow_lamp(k, x0, x1, cr, z=2.3, chain_top=3.4, energy=18.0):
    """A long grow-lamp hung on chains over a bed: a slim green iron rail, its tube glowing warm and pinkish."""
    for xx in (x0 + 0.1, x1 - 0.1):
        k.tube((xx, cr, z + 0.05), (xx, cr - 0.1, chain_top), 0.008, IRON, 'chain', verts=4)
    k.box(x0, cr - 0.04, z + 0.04, x1, cr + 0.04, z + 0.08, ('#4a7a5a', 0.06), 'grow_rail')
    k.cyl_x(x0 + 0.05, x1 - 0.05, cr, z + 0.01, 0.03, 0.03, '#5a3a48', 'grow_light', emit=('#ffc8d8', 0.95), verts=8)
    n = max(1, int((x1 - x0) / 1.2))
    for i in range(n):
        k.point_light(x0 + (i + 0.5) * (x1 - x0) / n, cr, z - 0.15, '#ffd8e0', energy, radius=0.2)


def potting_bench(k, x0, x1, r_face, h=0.86, d=0.6):
    """The potting bench under the glass: a scrubbed top with a lip of soil, terracotta pots stacked and potted, a
    trowel, seed packets in a tray, a watering can; a sack of compost and more pots on the shelf below."""
    k.box(x0, r_face, h - 0.06, x1, r_face + d, h, (WOOD_L, 0.14), 'bench_top')
    for xx in (x0 + 0.05, x1 - 0.12):
        for rr in (r_face + 0.05, r_face + d - 0.12):
            k.box(xx, rr, 0, xx + 0.07, rr + 0.07, h - 0.06, WOOD_D, 'bench_leg')
    k.box(x0 + 0.05, r_face + 0.05, 0.2, x1 - 0.05, r_face + d - 0.05, 0.24, WOOD_D, 'bench_shelf')
    z = h
    for i in range(int((x1 - x0) / 0.4)):
        px = x0 + 0.25 + i * 0.4
        if i % 3 == 2:                                 # a stack of empty pots
            for j in range(3):
                k.cone(px, r_face + 0.25, z + j * 0.06, z + 0.16 + j * 0.06, 0.08, 0.11, ('#b05a30', 0.1), 'pot', verts=10)
        else:
            k.cone(px, r_face + 0.25, z, z + 0.16, 0.08, 0.11, ('#b05a30', 0.1), 'pot', verts=10)
            k.cyl(px, r_face + 0.25, z + 0.14, z + 0.16, 0.1, SOIL, 'pot_soil', verts=10)
            for q in range(3):
                k.cone(px + (q - 1) * 0.03, r_face + 0.25, z + 0.16, z + 0.3 + q * 0.03, 0.03, 0.005, k.rng.choice(LEAF), 'seedling', verts=5)
    k.box(x1 - 0.55, r_face + d - 0.25, z, x1 - 0.2, r_face + d - 0.05, z + 0.05, WOOD, 'seed_tray')
    for j in range(4):
        k.box(x1 - 0.52 + j * 0.08, r_face + d - 0.22, z + 0.05, x1 - 0.46 + j * 0.08, r_face + d - 0.08, z + 0.13,
              k.rng.choice(['#e0c060', '#c84a3a', '#5a9a5a', '#e8e0c8']), 'seed_packet')
    k.box(x0 + 0.1, r_face + d - 0.2, z, x0 + 0.35, r_face + d - 0.14, z + 0.015, '#9a9aa2', 'trowel')
    k.box(x0 + 0.35, r_face + d - 0.19, z, x0 + 0.5, r_face + d - 0.15, z + 0.03, WOOD_D, 'trowel_handle')
    watering_can(k, x1 - 0.3, r_face + d + 0.25, 0.0)
    k.sphere(x0 + 0.4, r_face + 0.3, 0.24 + 0.2, 0.25, 0.2, ('#6a5038', 0.08), 'compost_sack', ry=0.2, segs=10)
    k.solid(x0, r_face, x1, r_face + d)


def watering_can(k, cx, cr, z):
    k.cyl(cx, cr, z, z + 0.3, 0.13, ('#4a7a5a', 0.06), 'watering_can', verts=12)
    k.tube((cx + 0.1, cr, z + 0.08), (cx + 0.38, cr, z + 0.36), 0.025, '#4a7a5a', 'can_spout', rb=0.015, verts=6)
    k.cyl_x(cx + 0.36, cx + 0.42, cr, z + 0.37, 0.04, 0.04, '#3a6a4a', 'can_rose', verts=8)
    k.tube((cx - 0.1, cr, z + 0.3), (cx + 0.05, cr, z + 0.42), 0.015, '#3a6a4a', 'can_handle', verts=4)


def hanging_basket_plants(k, cx, cr, z=1.9, chain_top=3.3):
    """A wire basket hung from the deckhead, ferns and trailing ivy spilling out of it."""
    k.tube((cx, cr, z + 0.2), (cx, cr, chain_top), 0.008, IRON, 'chain', verts=4)
    k.sphere(cx, cr, z, 0.22, 0.16, ('#5a4a30', 0.1), 'basket', segs=10)
    for q in range(7):
        a = q * 0.9
        k.blob(cx + math.cos(a) * 0.18, cr + math.sin(a) * 0.14, z + 0.12, 0.12, 0.1, 0.08, (k.rng.choice(LEAF), 0.1), 'basket_leaves', segs=8)
    for q in range(4):
        a = q * 1.6
        x, r = cx + math.cos(a) * 0.2, cr + math.sin(a) * 0.16
        for j in range(4):
            k.sphere(x + math.cos(a) * 0.02 * j, r + math.sin(a) * 0.02 * j, z - 0.05 - j * 0.12, 0.05, 0.05, LEAF[(q + j) % 4], 'trailing_ivy', segs=6)
