"""Lumar asset builders for scenekit (bpy). Everything is in tile units:
x = column, r = row (toward camera), z = height. A building's interior uses
the same palette family as the Lumar art direction (warm wood, saltstone,
brass, firelight).
"""
import math

from scenekit import shade

# ---- palette -------------------------------------------------------------
WOOD_L = '#b07a44'     # light oak
WOOD = '#8a5a30'       # mid wood
WOOD_D = '#5e3b1e'     # dark wood
WOOD_DD = '#3e2612'
PLASTER = '#c9b48e'
STONE = '#8c8578'
STONE_D = '#6a645a'
BRASS = '#d0a048'
IRON = '#3a3a40'
CLOTH_R = '#a03a2e'
CLOTH_G = '#3e6a4a'
FIRE = '#ffb040'
FIRE_HOT = '#fff0a0'
GLASS_NIGHT = '#2a3f66'
CANDLE = '#efe4c8'


# ---- architecture ----------------------------------------------------------
def floor_planks(k, x0, r0, x1, r1, tone=WOOD, plank=1 / 3):
    """Horizontal planks with staggered joints and thin dark seams."""
    k.box(x0, r0, -0.12, x1, r1, -0.02, WOOD_DD, 'subfloor')
    r = r0
    i = 0
    while r < r1 - 1e-6:
        r_next = min(r1, r + plank)
        x = x0 - k.rng.uniform(0, 1.5)
        while x < x1 - 1e-6:
            length = k.rng.choice([1.5, 2.0, 2.5, 3.0])
            a, b = max(x, x0), min(x + length, x1)
            if b - a > 0.2:
                f = k.rng.uniform(0.9, 1.08)
                k.box(a + 0.02, r + 0.02, -0.04, b - 0.02, r_next - 0.02, 0.0, (shade(tone, f), 0.12), 'floor')
            x += length
        r = r_next
        i += 1


def back_wall(k, x0, x1, r_face, height, thickness=0.5, wainscot=0.9, beams_every=2.0,
              plaster=PLASTER, wainscot_col=WOOD_D, beam=WOOD_DD, stone=False):
    """Back wall whose front face sits at row r_face: plaster (or stone)
    with timber beams above a wainscot."""
    k.box(x0, r_face - thickness, 0, x1, r_face, height, (plaster, 0.14 if stone else 0.08), 'wall')
    if stone:   # coursed stone: staggered block seams
        z, i = 0.0, 0
        while z < height - 0.1:
            x = x0 + (0.0 if i % 2 else 0.35)
            while x < x1:
                k.box(x, r_face - 0.01, z + 0.02, min(x + 0.68, x1), r_face + 0.02, z + 0.3,
                      (shade(plaster, k.rng.uniform(0.86, 1.08)), 0.12), 'wall_stone')
                x += 0.72
            z += 0.32
            i += 1
    if wainscot:
        k.box(x0, r_face - 0.02, 0, x1, r_face + 0.05, wainscot, (wainscot_col, 0.1), 'wainscot')
        k.box(x0, r_face - 0.02, wainscot, x1, r_face + 0.09, wainscot + 0.08, shade(wainscot_col, 1.25), 'wainscot_rail')
    if beams_every:
        k.box(x0, r_face - 0.02, height - 0.22, x1, r_face + 0.06, height, beam, 'beam_top')
        x = x0 + beams_every / 2
        while x < x1 - 0.2:
            k.box(x - 0.09, r_face - 0.02, wainscot or 0, x + 0.09, r_face + 0.06, height, beam, 'beam')
            x += beams_every
    k.box(x0, r_face - thickness, height, x1, r_face, height + 0.04, WOOD_DD, 'wall_cap')


def floor_flags(k, x0, r0, x1, r1, tone=STONE_D):
    """Stone flag floor: irregular slabs with dark grout."""
    k.box(x0, r0, -0.12, x1, r1, -0.02, '#1e1a16', 'subfloor')
    r = r0
    while r < r1 - 1e-6:
        h = min(r1 - r, k.rng.choice([0.5, 0.75, 1.0]))
        x = x0
        while x < x1 - 1e-6:
            w = min(x1 - x, k.rng.choice([0.5, 0.75, 1.0, 1.25]))
            k.box(x + 0.03, r + 0.03, -0.04, x + w - 0.03, r + h - 0.03, 0.0,
                  (shade(tone, k.rng.uniform(0.85, 1.12)), 0.14), 'floor')
            x += w
        r += h


def room(k, x0, r0, x1, r1, wall_h, door=(6.0, 8.0), floor='planks', floor_tone=WOOD, **wall):
    """Standard Lumar interior: floor (x0..x1, r0..r1), back wall at r0, side
    walls outside x0/x1, low cut-away front wall at r1 with a doorway."""
    if floor == 'flags':
        floor_flags(k, x0, r0, x1, r1, floor_tone)
    else:
        floor_planks(k, x0, r0, x1, r1, floor_tone)
    back_wall(k, x0 - 0.6, x1 + 0.6, r0, wall_h, **wall)
    side_wall(k, x0 - 0.6, x0, r0 - 0.5, r1, wall_h)
    side_wall(k, x1, x1 + 0.6, r0 - 0.5, r1, wall_h)
    front_wall(k, x0 - 0.6, x1 + 0.6, r1, gaps=[door])
    door_frame(k, door[0], door[1], r1)


def side_wall(k, x0, x1, r0, r1, height):
    k.box(x0, r0, 0, x1, r1, height, (STONE_D, 0.1), 'side_wall')
    k.box(x0 - 0.02, r0, height, x1 + 0.02, r1, height + 0.05, WOOD_DD, 'wall_cap')
    # cut end facing the camera reads as a dark section, not a lit panel
    k.box(x0 - 0.02, r1, 0, x1 + 0.02, r1 + 0.03, height + 0.05, '#120c0a', 'wall_cut')


def front_wall(k, x0, x1, r0, height=0.35, gaps=()):
    """Low cut-away front wall; gaps = [(xa, xb)] for doorways."""
    segs = []
    a = x0
    for ga, gb in sorted(gaps):
        segs.append((a, ga))
        a = gb
    segs.append((a, x1))
    for a, b in segs:
        if b - a > 0.01:
            k.box(a, r0, 0, b, r0 + 0.6, height, (STONE_D, 0.1), 'front_wall')
            k.box(a, r0, height, b, r0 + 0.6, height + 0.05, WOOD_DD, 'wall_cap')


def door_frame(k, x0, x1, r0):
    k.box(x0, r0, -0.01, x1, r0 + 0.6, 0.02, (WOOD_D, 0.1), 'threshold')
    k.box(x0 + 0.1, r0 - 0.5, 0.0, x1 - 0.1, r0 + 0.1, 0.01, CLOTH_R, 'doormat')


def window(k, x, r_face, z0=1.15, w=0.9, h=0.9):
    k.box(x - w / 2 - 0.08, r_face - 0.02, z0 - 0.08, x + w / 2 + 0.08, r_face + 0.06, z0 + h + 0.08, WOOD_DD, 'window_frame')
    k.box(x - w / 2, r_face - 0.01, z0, x + w / 2, r_face + 0.07, z0 + h, GLASS_NIGHT, 'window_glass', emit=('#22385e', 1.0))
    k.box(x - 0.03, r_face, z0, x + 0.03, r_face + 0.09, z0 + h, WOOD_DD, 'window_frame')
    k.box(x - w / 2, r_face, z0 + h / 2 - 0.03, x + w / 2, r_face + 0.09, z0 + h / 2 + 0.03, WOOD_DD, 'window_frame')
    k.box(x - w / 2 - 0.1, r_face, z0 - 0.12, x + w / 2 + 0.1, r_face + 0.16, z0 - 0.06, WOOD, 'window_sill')


# ---- furniture --------------------------------------------------------------
def round_table(k, cx, cr, top=0.78, radius=0.42, tone=WOOD):
    k.cyl(cx, cr, top - 0.07, top, radius, (shade(tone, 1.05), 0.1), 'table', verts=20)
    k.cyl(cx, cr, 0.08, top - 0.07, 0.06, WOOD_D, 'table_leg', verts=8)
    k.cyl(cx, cr, 0.0, 0.08, 0.24, WOOD_D, 'table_leg', verts=12)
    k.solid(cx - 0.4, cr - 0.4, cx + 0.4, cr + 0.4)


def stool(k, cx, cr, seat=0.48, radius=0.2):
    k.cyl(cx, cr, seat - 0.06, seat, radius, (WOOD_L, 0.08), 'stool', verts=14)
    for a in range(3):
        ang = a * 2 * math.pi / 3 + 0.5
        k.cyl(cx + math.cos(ang) * radius * 0.6, cr + math.sin(ang) * radius * 0.6, 0, seat - 0.06, 0.03, WOOD_D, 'stool_leg', verts=6)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def barrel(k, cx, cr, h=0.9, radius=0.34, upright=True, tone=WOOD):
    k.cyl(cx, cr, 0.0, h * 0.25, radius * 0.92, (tone, 0.1), 'barrel', verts=16)
    k.cyl(cx, cr, h * 0.25, h * 0.75, radius, (tone, 0.1), 'barrel', verts=16)
    k.cyl(cx, cr, h * 0.75, h, radius * 0.92, (tone, 0.1), 'barrel', verts=16)
    for z in (h * 0.18, h * 0.82):
        k.cyl(cx, cr, z - 0.03, z + 0.03, radius * 0.97, IRON, 'barrel_hoop', verts=16)
    k.cyl(cx, cr, h, h + 0.01, radius * 0.8, shade(tone, 0.85), 'barrel_lid', verts=16)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def candle(k, cx, cr, z, light=True, energy=1.5):
    k.cyl(cx, cr, z, z + 0.14, 0.035, CANDLE, 'candle', verts=8)
    k.sphere(cx, cr, z + 0.19, 0.03, 0.05, FIRE_HOT, 'flame', emit=(FIRE_HOT, 4.0), segs=8)
    if light:
        k.point_light(cx, cr, z + 0.45, "#ffb060", energy, radius=0.08, group="flicker")


def mug(k, cx, cr, z):
    k.cyl(cx, cr, z, z + 0.12, 0.05, '#c8c0b0', 'mug', verts=10)
    k.cyl(cx, cr, z + 0.1, z + 0.13, 0.045, '#e8d8a0', 'mug_froth', verts=10)


def fireplace(k, cx, r_face, wall_h, width=1.8, height=1.25, depth=0.45, energy=80.0):
    x0, x1 = cx - width / 2, cx + width / 2
    # chimney breast up the wall, stone surround, firebox, hearth, mantel
    k.box(cx - 0.65, r_face - 0.1, height, cx + 0.65, r_face + 0.22, wall_h, (STONE, 0.14), 'chimney')
    k.box(x0, r_face - 0.1, 0, x1, r_face + depth, height, (STONE, 0.14), 'fireplace', bevel=0.02)
    k.box(cx - 0.48, r_face + depth - 0.02, 0.05, cx + 0.48, r_face + depth + 0.01, 0.72, '#1a120e', 'firebox')
    k.box(x0 - 0.1, r_face + depth, 0, x1 + 0.1, r_face + depth + 0.3, 0.05, (STONE_D, 0.12), 'hearth')
    k.box(x0 - 0.12, r_face - 0.1, height, x1 + 0.12, r_face + depth + 0.1, height + 0.09, WOOD_D, 'mantel')
    k.cyl(cx - 0.18, r_face + depth - 0.1, 0.06, 0.16, 0.06, WOOD_DD, 'log', verts=8)
    k.cyl(cx + 0.15, r_face + depth - 0.12, 0.06, 0.16, 0.06, WOOD_DD, 'log', verts=8)
    k.cone(cx, r_face + depth - 0.08, 0.1, 0.55, 0.24, 0.02, FIRE, 'fire', emit=(FIRE, 3.0))
    k.cone(cx - 0.15, r_face + depth - 0.06, 0.1, 0.4, 0.13, 0.01, FIRE_HOT, 'fire', emit=(FIRE_HOT, 4.0))
    k.cone(cx + 0.16, r_face + depth - 0.06, 0.1, 0.36, 0.11, 0.01, FIRE_HOT, 'fire', emit=(FIRE_HOT, 4.0))
    k.point_light(cx, r_face + depth + 0.3, 0.4, '#ff9a40', energy, radius=0.25, group='flicker')
    k.solid(x0, r_face, x1, r_face + depth + 0.3)


def hanging_lamp(k, cx, cr, z=2.15, energy=260.0, chain_top=3.2, visible=True):
    """Oil lantern on a chain — warm overhead light. visible=False keeps
    just the light (a lamp hanging above the cut-away view)."""
    if not visible:
        k.point_light(cx, cr, z + 0.1, '#ffc078', energy, radius=0.1, group='flicker')
        return
    k.cyl(cx, cr, z + 0.32, chain_top, 0.015, IRON, 'chain', verts=6)
    k.cyl(cx, cr, z + 0.26, z + 0.32, 0.12, IRON, 'lamp_cap', verts=10)
    k.cyl(cx, cr, z, z + 0.26, 0.09, '#ffd890', 'lamp_glass', emit=('#ffcf80', 2.5), verts=10)
    k.cyl(cx, cr, z - 0.04, z, 0.11, IRON, 'lamp_base', verts=10)
    k.point_light(cx, cr, z + 0.1, '#ffc078', energy, radius=0.1, group='flicker')


# ---- tavern furniture -------------------------------------------------------
BOTTLES = ['#3e7a4a', '#7a3a2a', '#b8963a', '#3a5a8a', '#6a3a6a', '#2e5a3a']


def bar_counter(k, x0, x1, r0, r1, height=1.0):
    """Long counter: dark panelled front, light worn top with a lip."""
    k.box(x0, r0, 0, x1, r1, height - 0.08, (WOOD_D, 0.1), 'bar')
    x = x0 + 0.5
    while x < x1 - 0.3:   # panel stiles on the customer side
        k.box(x - 0.04, r1, 0.08, x + 0.04, r1 + 0.03, height - 0.14, WOOD_DD, 'bar_panel')
        x += 1.0
    k.box(x0, r1, 0.0, x1, r1 + 0.05, 0.08, WOOD_DD, 'bar_kick')
    k.box(x0 - 0.06, r0 - 0.04, height - 0.08, x1 + 0.06, r1 + 0.1, height, (WOOD, 0.16), 'bar_top')
    k.box(x0 - 0.06, r1 + 0.06, height - 0.1, x1 + 0.06, r1 + 0.12, height - 0.02, WOOD_DD, 'bar_lip')
    k.solid(x0, r0, x1, r1)


def beer_tap(k, cx, cr, z):
    k.box(cx - 0.18, cr - 0.08, z, cx + 0.18, cr + 0.08, z + 0.05, BRASS, 'tap_tower')
    k.cyl(cx, cr, z + 0.05, z + 0.42, 0.05, BRASS, 'tap_tower', verts=10)
    for dx in (-0.12, 0.12):
        k.cyl(cx + dx, cr + 0.02, z + 0.3, z + 0.48, 0.022, '#2a1a10', 'tap_handle', verts=6)


def wall_shelf(k, x0, x1, r_face, z, bottles=True):
    k.box(x0, r_face, z - 0.05, x1, r_face + 0.24, z, WOOD, 'shelf')
    for xb in (x0 + 0.05, x1 - 0.09):
        k.box(xb, r_face, z - 0.18, xb + 0.04, r_face + 0.2, z - 0.05, WOOD_DD, 'shelf')
    if bottles:
        x = x0 + 0.12
        while x < x1 - 0.1:
            col = k.rng.choice(BOTTLES)
            h = k.rng.uniform(0.18, 0.27)
            k.cyl(x, r_face + 0.12, z, z + h, 0.045, col, 'bottle', verts=8)
            k.cyl(x, r_face + 0.12, z + h, z + h + 0.06, 0.018, shade(col, 0.8), 'bottle', verts=6)
            x += k.rng.uniform(0.12, 0.2)


def stove(k, cx, cr, wall_r, wall_h):
    k.box(cx - 0.36, cr - 0.3, 0, cx + 0.36, cr + 0.3, 0.75, (IRON, 0.1), 'stove', bevel=0.03)
    k.box(cx - 0.4, cr - 0.34, 0.75, cx + 0.4, cr + 0.34, 0.8, '#24242a', 'stove_top')
    k.box(cx - 0.2, cr + 0.3, 0.18, cx + 0.2, cr + 0.32, 0.42, '#ff8030', 'stove_door', emit=('#c05018', 1.5))
    k.cyl(cx + 0.12, cr - 0.05, 0.8, 1.0, 0.16, '#5a5a62', 'pot', verts=12)
    k.cyl(cx - 0.18, wall_r + 0.15, 0.8, wall_h, 0.07, IRON, 'flue', verts=8)
    k.solid(cx - 0.4, cr - 0.3, cx + 0.4, cr + 0.3)


def keg_rack(k, x0, x1, cr, levels=2):
    k.box(x0, cr - 0.35, 0, x0 + 0.08, cr + 0.35, 0.95, WOOD_DD, 'rack')
    k.box(x1 - 0.08, cr - 0.35, 0, x1, cr + 0.35, 0.95, WOOD_DD, 'rack')
    for i in range(levels):
        z = 0.25 + i * 0.45
        x = x0 + 0.3
        while x < x1 - 0.25:
            # keg lying on its side, end toward the camera
            k.cyl_y(x, cr - 0.3, cr + 0.3, z, 0.2, 0.2, (WOOD, 0.1), 'keg', verts=14)
            k.cyl_y(x, cr + 0.3, cr + 0.32, z, 0.205, 0.205, IRON, 'keg_hoop', verts=14)
            k.cyl_y(x, cr + 0.32, cr + 0.42, z - 0.08, 0.025, 0.025, BRASS, 'tap', verts=6)
            x += 0.48


def upright_piano(k, x0, r0, r1, facing_east=True):
    """Upright piano against the left wall, keyboard facing east."""
    k.box(x0, r0, 0, x0 + 0.5, r1, 1.3, ('#2a1a14', 0.08), 'piano', bevel=0.02)
    k.box(x0 + 0.5, r0 + 0.05, 0.7, x0 + 0.78, r1 - 0.05, 0.78, '#2a1a14', 'piano_key_bed')
    k.box(x0 + 0.52, r0 + 0.08, 0.78, x0 + 0.76, r1 - 0.08, 0.81, '#ece6d8', 'piano_keys')
    x = r0 + 0.12
    while x < r1 - 0.1:
        k.box(x0 + 0.62, x, 0.81, x0 + 0.76, x + 0.05, 0.83, '#111014', 'piano_keys')
        x += 0.14
    k.box(x0 + 0.48, r0 + 0.1, 0.0, x0 + 0.56, r0 + 0.16, 0.7, '#2a1a14', 'piano_leg')
    k.box(x0 + 0.48, r1 - 0.16, 0.0, x0 + 0.56, r1 - 0.1, 0.7, '#2a1a14', 'piano_leg')
    candle(k, x0 + 0.25, r0 + 0.25, 1.3, energy=1.0)
    k.solid(x0, r0, x0 + 0.78, r1)


def dart_board(k, cx, r_face, z=1.45):
    k.cyl_y(cx, r_face, r_face + 0.04, z, 0.32, 0.32, '#2a1a10', 'dart_back', verts=20)
    for i, (rad, col) in enumerate(((0.27, '#1a1a1a'), (0.21, '#c8b080'), (0.14, '#a02a2a'), (0.08, '#2a6a3a'), (0.03, '#c02a2a'))):
        k.cyl_y(cx, r_face + 0.04 + i * 0.006, r_face + 0.05 + i * 0.006, z, rad, rad, col, 'dart_board', verts=20)
    k.cyl_y(cx + 0.05, r_face + 0.06, r_face + 0.2, z + 0.06, 0.012, 0.012, '#d8d0c0', 'dart', verts=6)


def painting(k, cx, r_face, z0, w=1.0, h=0.62):
    """E.B.'s oil painting: a ship under a green moon."""
    k.box(cx - w / 2 - 0.07, r_face, z0 - 0.07, cx + w / 2 + 0.07, r_face + 0.06, z0 + h + 0.07, BRASS, 'frame')
    k.box(cx - w / 2, r_face + 0.04, z0, cx + w / 2, r_face + 0.08, z0 + h, '#1e3a3a', 'canvas')
    k.sphere(cx + 0.22, r_face + 0.09, z0 + h * 0.72, 0.08, 0.08, '#a8f0a0', 'canvas_moon', emit=('#4a8a4a', 0.6), ry=0.01)
    k.box(cx - 0.3, r_face + 0.085, z0 + 0.12, cx + 0.1, r_face + 0.1, z0 + 0.2, '#3a2412', 'canvas_ship')
    k.box(cx - 0.16, r_face + 0.085, z0 + 0.2, cx - 0.12, r_face + 0.1, z0 + 0.42, '#3a2412', 'canvas_ship')
    k.box(cx - 0.24, r_face + 0.085, z0 + 0.24, cx - 0.04, r_face + 0.1, z0 + 0.38, '#d8cfb0', 'canvas_ship')
    k.box(cx - w / 2, r_face + 0.085, z0, cx + w / 2, r_face + 0.1, z0 + 0.1, '#1a4a3a', 'canvas_sea')


def coat_rack(k, cx, cr):
    k.cyl(cx, cr, 0, 0.05, 0.2, WOOD_DD, 'coat_rack', verts=10)
    k.cyl(cx, cr, 0.05, 1.75, 0.04, WOOD_D, 'coat_rack', verts=8)
    k.sphere(cx, cr, 1.78, 0.06, 0.06, WOOD_D, 'coat_rack', segs=8)
    # long coat + pirate hat
    k.box(cx - 0.2, cr - 0.08, 0.55, cx + 0.06, cr + 0.12, 1.62, ('#7a4a2a', 0.12), 'coat', bevel=0.04)
    k.cyl(cx + 0.02, cr, 1.66, 1.72, 0.22, '#1a1414', 'hat', verts=14)
    k.cyl(cx + 0.02, cr, 1.72, 1.86, 0.12, '#1a1414', 'hat', verts=12)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def rug(k, x0, r0, x1, r1, col=CLOTH_R, trim=None, pattern=False):
    """Woven rug. pattern=True adds a gold inner border, a medallion and
    fringes on the short ends."""
    if not pattern:
        k.box(x0, r0, 0.0, x1, r1, 0.015, (col, 0.1), 'rug')
        k.box(x0 + 0.12, r0 + 0.12, 0.015, x1 - 0.12, r1 - 0.12, 0.02, (shade(col, 1.25), 0.1), 'rug')
        k.box(x0 + 0.3, r0 + 0.3, 0.02, x1 - 0.3, r1 - 0.3, 0.025, (shade(col, 0.8), 0.1), 'rug')
        return
    trim = trim or '#c89a48'
    k.box(x0, r0, 0.0, x1, r1, 0.012, (shade(col, 0.6), 0.1), 'rug')
    k.box(x0 + 0.1, r0 + 0.1, 0.012, x1 - 0.1, r1 - 0.1, 0.016, (col, 0.12), 'rug')
    k.box(x0 + 0.2, r0 + 0.2, 0.016, x1 - 0.2, r1 - 0.2, 0.019, trim, 'rug_trim')
    k.box(x0 + 0.25, r0 + 0.25, 0.019, x1 - 0.25, r1 - 0.25, 0.022, (shade(col, 1.12), 0.12), 'rug')
    cx, cr = (x0 + x1) / 2, (r0 + r1) / 2
    rad = min(x1 - x0, r1 - r0) * 0.26
    k.cyl(cx, cr, 0.022, 0.025, rad * 1.5, trim, 'rug_trim', ry=rad, verts=8)
    k.cyl(cx, cr, 0.025, 0.028, rad * 1.2, shade(col, 0.7), 'rug', ry=rad * 0.75, verts=8)
    k.cyl(cx, cr, 0.028, 0.031, rad * 0.4, trim, 'rug_trim', ry=rad * 0.25, verts=6)
    wide = (x1 - x0) >= (r1 - r0)
    n = int(((r1 - r0) if wide else (x1 - x0)) / 0.09)
    for i in range(n):
        t = 0.06 + i * 0.09
        for end in (0, 1):
            if wide:
                xe = x0 - 0.08 if end == 0 else x1
                k.box(xe, r0 + t, 0.0, xe + 0.08, r0 + t + 0.04, 0.008, '#d8c8a0', 'fringe')
            else:
                re = r0 - 0.08 if end == 0 else r1
                k.box(x0 + t, re, 0.0, x0 + t + 0.04, re + 0.08, 0.008, '#d8c8a0', 'fringe')


def side_table(k, cx, cr):
    k.box(cx - 0.25, cr - 0.25, 0.55, cx + 0.25, cr + 0.25, 0.6, WOOD, 'side_table')
    for dx in (-0.2, 0.17):
        for dr in (-0.2, 0.17):
            k.box(cx + dx, cr + dr, 0, cx + dx + 0.04, cr + dr + 0.04, 0.55, WOOD_D, 'side_table')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)



# ---- inn ---------------------------------------------------------------------
def stairs(k, x0, x1, r0, steps=7, rise=0.32, tone=WOOD):
    """Staircase against the back wall climbing toward x0 (left)."""
    w = (x1 - x0) / steps
    for i in range(steps):
        xa = x1 - (i + 1) * w
        k.box(xa, r0, 0, xa + w, r0 + 0.9, (i + 1) * rise, (shade(tone, 0.95 + 0.02 * (i % 2)), 0.1), 'stairs')
        k.box(xa, r0 + 0.85, (i + 1) * rise - 0.04, xa + w, r0 + 0.95, (i + 1) * rise, WOOD_DD, 'stair_nose')
    k.box(x0, r0 + 0.9, 0, x1, r0 + 0.98, 0.25, WOOD_DD, 'stair_string')
    for i in range(0, steps, 2):   # banister posts
        xa = x1 - (i + 0.5) * w
        k.cyl(xa, r0 + 0.92, (i + 1) * rise, (i + 1) * rise + 0.7, 0.03, WOOD_DD, 'banister', verts=6)
    k.solid(x0, r0, x1, r0 + 1.0)


def armchair(k, cx, cr, facing='down', tone=CLOTH_R):
    k.box(cx - 0.32, cr - 0.3, 0.0, cx + 0.32, cr + 0.3, 0.42, (tone, 0.1), 'armchair', bevel=0.04)
    back_r = cr - 0.3 if facing == 'down' else cr + 0.18
    k.box(cx - 0.32, back_r, 0.42, cx + 0.32, back_r + 0.12, 0.95, (shade(tone, 0.85), 0.1), 'armchair', bevel=0.04)
    for sx in (-0.32, 0.22):
        k.box(cx + sx, cr - 0.26, 0.42, cx + sx + 0.1, cr + 0.26, 0.62, (shade(tone, 0.9), 0.1), 'armchair', bevel=0.03)
    k.solid(cx - 0.35, cr - 0.35, cx + 0.35, cr + 0.35)


def ledger_desk(k, x0, x1, r0, r1):
    bar_counter(k, x0, x1, r0, r1, height=0.95)
    k.box(x0 + 0.3, r0 + 0.15, 0.95, x0 + 0.75, r0 + 0.45, 0.99, '#e8dcc0', 'ledger')
    k.cyl(x1 - 0.4, r0 + 0.3, 0.95, 1.0, 0.07, BRASS, 'bell', verts=10)
    k.sphere(x1 - 0.4, r0 + 0.3, 1.02, 0.05, 0.05, BRASS, 'bell')


def key_board(k, cx, r_face, z=1.35):
    k.box(cx - 0.45, r_face, z - 0.3, cx + 0.45, r_face + 0.05, z + 0.3, WOOD_D, 'keyboard')
    for i in range(6):
        x = cx - 0.32 + (i % 3) * 0.32
        zz = z + (0.1 if i < 3 else -0.15)
        k.box(x - 0.02, r_face + 0.05, zz - 0.1, x + 0.02, r_face + 0.08, zz, BRASS, 'key')


def bench(k, x0, x1, cr, tone=WOOD):
    k.box(x0, cr - 0.2, 0.38, x1, cr + 0.2, 0.45, (tone, 0.1), 'bench')
    for x in (x0 + 0.08, x1 - 0.14):
        k.box(x, cr - 0.16, 0, x + 0.06, cr + 0.16, 0.38, WOOD_D, 'bench_leg')
    k.solid(x0, cr - 0.3, x1, cr + 0.3)


def plate(k, cx, cr, z, food='#c89a50'):
    k.cyl(cx, cr, z, z + 0.02, 0.12, '#e0dccc', 'plate', verts=12)
    k.sphere(cx, cr, z + 0.05, 0.07, 0.04, food, 'food', segs=8)


def potted_plant(k, cx, cr, z=0.0, tone='#3e6a3a'):
    k.cyl(cx, cr, z, z + 0.3, 0.15, '#8a4a2a', 'pot', verts=10)
    for i in range(5):
        a = i * 1.26
        k.sphere(cx + math.cos(a) * 0.1, cr + math.sin(a) * 0.08, z + 0.42 + 0.06 * (i % 2), 0.13, 0.14,
                 (shade(tone, 0.9 + 0.05 * i), 0.1), 'plant', segs=8)
    k.solid(cx - 0.25, cr - 0.25, cx + 0.25, cr + 0.25)


# ---- bakery ------------------------------------------------------------------
BRICK = '#9a4a32'
BREAD = '#c8883e'


BREAD_COLS = ['#c8883e', '#b06a2a', '#d8a050', '#8a4a20', '#e0b060']


def loaf(k, x, r, z, kind=None, col=None):
    """One piece of bread sitting at height z: boule, baguette, roll or plait."""
    kind = kind or k.rng.choice(['boule', 'boule', 'baguette', 'roll', 'plait'])
    col = col or k.rng.choice(BREAD_COLS)
    if kind == 'boule':
        k.sphere(x, r, z + 0.06, 0.13, 0.08, (col, 0.1), 'bread', ry=0.11, segs=12)
        k.box(x - 0.06, r - 0.01, z + 0.12, x + 0.06, r + 0.01, z + 0.145, shade(col, 1.3), 'bread_score')
    elif kind == 'baguette':
        k.sphere(x, r, z + 0.05, 0.26, 0.05, (col, 0.1), 'bread', ry=0.06, segs=12)
        for dx in (-0.12, 0.0, 0.12):
            k.box(x + dx - 0.03, r - 0.02, z + 0.09, x + dx + 0.03, r + 0.02, z + 0.105, shade(col, 1.3), 'bread_score')
    elif kind == 'roll':
        for dx in (-0.08, 0.08):
            k.sphere(x + dx, r, z + 0.045, 0.07, 0.05, (col, 0.1), 'bread', segs=10)
    else:  # plait
        for dx in (-0.1, 0.0, 0.1):
            k.sphere(x + dx, r, z + 0.055, 0.075, 0.06, (shade(col, 1.0 + 0.06 * (dx > 0)), 0.1), 'bread', ry=0.08, segs=10)


def bread_oven(k, cx, r_face, width=2.6, energy=60.0, wall_h=2.8):
    """Domed brick bread oven against the back wall, fire glowing in an
    arched mouth, chimney up to the beam."""
    x0, x1 = cx - width / 2, cx + width / 2
    front = r_face + 1.0
    k.box(x0, r_face - 0.1, 0, x1, front, 0.85, (BRICK, 0.2), 'oven', bevel=0.03)
    for z in (0.22, 0.5):   # brick courses on the base
        k.box(x0 - 0.005, front - 0.01, z, x1 + 0.005, front + 0.005, z + 0.025, shade(BRICK, 0.7), 'oven_course')
    k.box(x0 - 0.06, r_face - 0.1, 0.85, x1 + 0.06, front + 0.06, 0.93, (STONE, 0.12), 'oven_ledge')
    k.sphere(cx, r_face + 0.42, 0.93, width / 2 * 0.9, 0.78, (BRICK, 0.22), 'oven_dome', ry=0.56, segs=24)
    k.box(cx - 0.32, r_face - 0.1, 1.5, cx + 0.32, r_face + 0.45, wall_h, (shade(BRICK, 0.9), 0.2), 'oven_chimney')
    # arched mouth: brick voussoirs, dark mouth, fire, loaves on the hearth
    k.cyl_y(cx, front - 0.08, front + 0.06, 1.12, 0.5, 0.44, shade(BRICK, 1.2), 'oven_arch', verts=20)
    k.box(cx - 0.5, front - 0.08, 0.93, cx + 0.5, front + 0.06, 1.12, shade(BRICK, 1.2), 'oven_arch')
    k.cyl_y(cx, front - 0.06, front + 0.08, 1.1, 0.38, 0.32, '#1a0a04', 'oven_mouth', verts=20)
    k.box(cx - 0.38, front - 0.06, 0.93, cx + 0.38, front + 0.08, 1.1, '#1a0a04', 'oven_mouth')
    k.cyl_y(cx, front - 0.05, front + 0.09, 1.04, 0.3, 0.22, '#ff7a28', 'oven_fire', emit=('#ff6a20', 2.2), verts=16)
    k.box(cx - 0.3, front - 0.05, 0.93, cx + 0.3, front + 0.09, 1.04, '#ff9a40', 'oven_fire', emit=('#ff8a30', 2.6))
    for dx in (-0.16, 0.14):
        k.sphere(cx + dx, front + 0.1, 0.99, 0.11, 0.06, '#5a2e10', 'oven_loaf', ry=0.06, segs=10)
    k.box(cx - 0.55, front + 0.06, 0.88, cx + 0.55, front + 0.24, 0.93, (STONE, 0.12), 'oven_sill')
    k.point_light(cx, front + 0.5, 1.0, '#ff8a40', energy, radius=0.25, group='flicker')
    # bread peel leaning on the side
    k.box(x1 + 0.05, front - 0.3, 0.0, x1 + 0.09, front - 0.26, 1.5, WOOD_L, 'peel')
    k.box(x1 + 0.0, front - 0.33, 0.0, x1 + 0.14, front - 0.23, 0.35, shade(WOOD_L, 1.1), 'peel')
    k.solid(x0, r_face, x1 + 0.15, front)


def wood_pile(k, x0, x1, cr, rows=3, tone=WOOD_D):
    """Split logs stacked with their ends toward the camera."""
    rad = 0.1
    n = int((x1 - x0) / (rad * 2.05))
    for j in range(rows):
        for i in range(n - j):
            x = x0 + rad + j * rad + i * rad * 2.05
            z = rad + j * rad * 1.75
            k.cyl_y(x, cr - 0.3, cr + 0.3, z, rad, rad, (shade(tone, k.rng.uniform(0.9, 1.15)), 0.1), 'log', verts=8)
            k.cyl_y(x, cr + 0.3, cr + 0.31, z, rad * 0.8, rad * 0.8, '#c89a60', 'log_end', verts=8)
    k.solid(x0, cr - 0.3, x1, cr + 0.3)


def open_shelves(k, x0, x1, r_face, top=2.05, levels=(0.45, 0.9, 1.35, 1.8), depth=0.38, tone='#4a2e1a'):
    """Open shelving unit against the back wall (back panel, sides, boards).
    Returns the shelf heights for filling."""
    k.box(x0, r_face, 0, x1, r_face + 0.04, top, (shade(tone, 0.6), 0.1), 'shelf_back')
    for xs in (x0, x1 - 0.06):
        k.box(xs, r_face, 0, xs + 0.06, r_face + depth, top, (tone, 0.1), 'shelf_side')
    k.box(x0 - 0.03, r_face, top, x1 + 0.03, r_face + depth + 0.04, top + 0.07, shade(tone, 1.1), 'shelf_top')
    k.box(x0, r_face, 0, x1, r_face + depth, 0.12, shade(tone, 0.8), 'shelf_plinth')
    for z in levels:
        k.box(x0 + 0.04, r_face + 0.02, z - 0.04, x1 - 0.04, r_face + depth + 0.02, z, (shade(tone, 1.25), 0.1), 'shelf')
    k.solid(x0, r_face, x1, r_face + depth)
    return levels


def bread_rack(k, x0, x1, r_face):
    levels = open_shelves(k, x0, x1, r_face, levels=(0.55, 1.05, 1.55), tone=WOOD)
    for z in levels:
        x = x0 + 0.22
        while x < x1 - 0.2:
            kind = k.rng.choice(['boule', 'boule', 'roll', 'plait', 'baguette'])
            loaf(k, x, r_face + 0.2, z, kind)
            x += 0.5 if kind == 'baguette' else 0.32


def bakery_counter(k, x0, x1, r0, r1, height=0.95):
    """Panelled shop counter laid out with baskets of bread, a cake stand
    and brass scales."""
    bar_counter(k, x0, x1, r0, r1, height=height)
    z = height
    x = x0 + 0.45
    i = 0
    while x < x1 - 0.4:
        if i == 2:
            k.cyl(x, (r0 + r1) / 2, z, z + 0.2, 0.03, '#e8e0d0', 'cake_stand', verts=8)
            k.cyl(x, (r0 + r1) / 2, z + 0.2, z + 0.22, 0.22, '#e8e0d0', 'cake_stand', verts=14)
            k.cyl(x, (r0 + r1) / 2, z + 0.22, z + 0.36, 0.17, '#f0d8c0', 'cake', verts=14)
            k.cyl(x, (r0 + r1) / 2, z + 0.36, z + 0.38, 0.17, '#c04a5a', 'cake_top', verts=14)
            k.sphere(x, (r0 + r1) / 2, z + 0.41, 0.035, 0.035, '#d02a3a', 'cherry', segs=8)
        elif i == 4:
            k.box(x - 0.12, (r0 + r1) / 2 - 0.08, z, x + 0.12, (r0 + r1) / 2 + 0.08, z + 0.05, BRASS, 'scale')
            k.cyl(x, (r0 + r1) / 2, z + 0.05, z + 0.32, 0.015, BRASS, 'scale', verts=6)
            k.box(x - 0.2, (r0 + r1) / 2 - 0.01, z + 0.3, x + 0.2, (r0 + r1) / 2 + 0.01, z + 0.33, BRASS, 'scale')
            for dx in (-0.18, 0.18):
                k.cyl(x + dx, (r0 + r1) / 2, z + 0.16, z + 0.18, 0.09, BRASS, 'scale_pan', verts=10)
        else:   # wicker basket of bread
            k.cyl(x, (r0 + r1) / 2, z, z + 0.1, 0.24, ('#a07040', 0.15), 'basket', ry=0.17, verts=14)
            k.cyl(x, (r0 + r1) / 2, z + 0.09, z + 0.11, 0.25, '#7a5028', 'basket_rim', ry=0.18, verts=14)
            loaf(k, x - 0.06, (r0 + r1) / 2, z + 0.04)
            loaf(k, x + 0.08, (r0 + r1) / 2 + 0.03, z + 0.06, 'roll')
        x += 0.62
        i += 1


def chalkboard(k, cx, r_face, z0=1.05, w=0.9, h=0.6, lines=4):
    k.box(cx - w / 2 - 0.06, r_face, z0 - 0.06, cx + w / 2 + 0.06, r_face + 0.05, z0 + h + 0.06, WOOD_D, 'board_frame')
    k.box(cx - w / 2, r_face + 0.03, z0, cx + w / 2, r_face + 0.06, z0 + h, '#24302a', 'board')
    for i in range(lines):
        zz = z0 + h - 0.12 - i * (h - 0.16) / max(1, lines - 1) * 0.9
        ln = k.rng.uniform(0.35, 0.7) * w
        k.box(cx - w / 2 + 0.08, r_face + 0.055, zz, cx - w / 2 + 0.08 + ln, r_face + 0.065, zz + 0.03, '#d8dccc', 'chalk')
        k.box(cx + w / 2 - 0.2, r_face + 0.055, zz, cx + w / 2 - 0.08, r_face + 0.065, zz + 0.03, '#e8c860', 'chalk')


def cooling_rack(k, x0, x1, r_face, levels=(0.35, 0.75, 1.15, 1.55)):
    """Tall iron rack of trays with pies and buns cooling."""
    for xs in (x0, x1 - 0.04):
        for rr in (r_face + 0.02, r_face + 0.42):
            k.box(xs, rr, 0, xs + 0.04, rr + 0.04, levels[-1] + 0.25, IRON, 'rack')
    for z in levels:
        k.box(x0, r_face + 0.02, z - 0.02, x1, r_face + 0.46, z, '#5a5a62', 'tray')
        x = x0 + 0.25
        while x < x1 - 0.2:
            if k.rng.random() < 0.5:
                k.cyl(x, r_face + 0.24, z, z + 0.06, 0.16, '#c88a40', 'pie', ry=0.14, verts=14)
                k.cyl(x, r_face + 0.24, z + 0.06, z + 0.07, 0.12, '#8a2a3a', 'pie_fill', ry=0.1, verts=12)
            else:
                for dx in (-0.08, 0.08):
                    k.sphere(x + dx, r_face + 0.24, z + 0.05, 0.065, 0.05, (BREAD, 0.1), 'bun', segs=8)
            x += 0.4
    k.solid(x0, r_face, x1, r_face + 0.5)


def flour_sacks(k, cx, cr):
    for dx, h in ((-0.15, 0.62), (0.18, 0.55)):
        k.sphere(cx + dx, cr, h / 2, 0.22, h / 2, ('#e8e0cc', 0.06), 'flour_sack', ry=0.2, segs=12)
        k.cyl(cx + dx, cr, h - 0.05, h + 0.05, 0.06, '#8a6a40', 'sack_tie', verts=8)
    k.cyl(cx - 0.1, cr + 0.38, 0.0, 0.004, 0.32, '#d8ccb0', 'flour_spill', ry=0.12, verts=12)
    k.cyl(cx - 0.42, cr + 0.5, 0.0, 0.004, 0.1, '#d8ccb0', 'flour_spill', ry=0.05, verts=8)
    k.solid(cx - 0.4, cr - 0.3, cx + 0.4, cr + 0.3)


def dough_table(k, cx, cr, w=2.2, d=0.8):
    """Big floured worktop: dough, rolling pin, mixing bowl, egg basket."""
    x0, x1 = cx - w / 2, cx + w / 2
    k.box(x0, cr - d / 2, 0.72, x1, cr + d / 2, 0.82, (WOOD_L, 0.14), 'dough_table')
    for xx in (x0 + 0.04, x1 - 0.12):
        for rr in (cr - d / 2 + 0.04, cr + d / 2 - 0.12):
            k.box(xx, rr, 0, xx + 0.08, rr + 0.08, 0.72, WOOD_D, 'table_leg')
    k.box(x0 + 0.06, cr - d / 2 + 0.06, 0.12, x1 - 0.06, cr + d / 2 - 0.06, 0.16, WOOD_D, 'table_shelf')
    for i in range(3):   # spare bowls on the shelf
        k.cyl(x0 + 0.4 + i * 0.6, cr, 0.16, 0.28, 0.16, '#a0583a', 'bowl', verts=12)
    k.cyl(cx - 0.4, cr, 0.82, 0.823, 0.42, '#d8ccb0', 'flour', ry=0.26, verts=14)
    k.sphere(cx - 0.45, cr, 0.88, 0.2, 0.08, '#efe2c4', 'dough', ry=0.16, segs=12)
    k.sphere(cx + 0.05, cr + 0.05, 0.86, 0.12, 0.06, '#efe2c4', 'dough', ry=0.1, segs=10)
    k.cyl_x(cx - 0.05, cx + 0.45, cr - 0.2, 0.87, 0.04, 0.04, WOOD_L, 'rolling_pin', verts=8)
    k.cyl(x1 - 0.45, cr - 0.05, 0.82, 1.0, 0.2, '#b06a40', 'bowl', verts=14)
    k.cyl(x1 - 0.45, cr - 0.05, 0.97, 0.99, 0.17, '#e8dcc0', 'batter', verts=14)
    k.cyl(x1 - 0.15, cr + 0.2, 0.82, 0.92, 0.12, ('#a07040', 0.15), 'basket', verts=10)
    for dx in (-0.04, 0.05):
        k.sphere(x1 - 0.15 + dx, cr + 0.2, 0.93, 0.04, 0.05, '#f0e8d8', 'egg', segs=8)
    k.solid(x0, cr - d / 2, x1, cr + d / 2)


def hanging_basket(k, cx, r_face, z=1.25):
    k.cyl(cx, r_face + 0.25, z + 0.3, z + 0.9, 0.012, '#8a6a40', 'rope', verts=4)
    k.cyl(cx, r_face + 0.25, z, z + 0.25, 0.26, ('#b08048', 0.12), 'basket', verts=14, ry=0.16)
    for dx in (-0.1, 0.08):
        k.sphere(cx + dx, r_face + 0.25, z + 0.27, 0.1, 0.06, BREAD, 'bread', segs=8)


# ---- smithy ------------------------------------------------------------------
def forge(k, cx, r_face, width=2.2, energy=90.0, wall_h=2.8):
    x0, x1 = cx - width / 2, cx + width / 2
    k.box(x0, r_face - 0.1, 0, x1, r_face + 0.9, 0.8, (STONE_D, 0.14), 'forge', bevel=0.02)
    k.box(x0 + 0.15, r_face + 0.1, 0.8, x1 - 0.15, r_face + 0.75, 0.84, '#1a0e08', 'coal_bed')
    for i in range(14):
        k.sphere(k.rng.uniform(x0 + 0.3, x1 - 0.3), r_face + k.rng.uniform(0.2, 0.65), 0.86, 0.07, 0.04,
                 k.rng.choice(['#ff6020', '#ffa040', '#c03010']), 'coals',
                 emit=(k.rng.choice(['#ff6020', '#ffa040']), 2.5), segs=6)
    # flames licking up off the coals
    for dx, h in ((-0.35, 0.28), (0.0, 0.4), (0.3, 0.3)):
        k.cone(cx + dx, r_face + 0.45, 0.84, 0.84 + h, 0.12, 0.01, FIRE, 'forge_fire', emit=(FIRE, 3.0), verts=8)
    k.cone(cx, r_face + 0.5, 0.84, 1.08, 0.08, 0.01, FIRE_HOT, 'forge_fire', emit=(FIRE_HOT, 4.0), verts=8)
    # brick courses on the hearth front
    for z in (0.2, 0.45, 0.7):
        k.box(x0 - 0.005, r_face + 0.895, z, x1 + 0.005, r_face + 0.905, z + 0.025, '#3a342e', 'forge_course')
    # copper hood narrowing to the chimney
    k.box(x0 - 0.05, r_face - 0.1, 1.55, x1 + 0.05, r_face + 0.85, 1.75, ('#8a5a3a', 0.12), 'hood')
    k.box(x0 - 0.07, r_face + 0.83, 1.53, x1 + 0.07, r_face + 0.88, 1.58, '#5a3a24', 'hood_rim')
    k.box(cx - 0.45, r_face - 0.1, 1.75, cx + 0.45, r_face + 0.5, wall_h, (STONE, 0.12), 'chimney')
    # leather bellows on a stand, nozzle into the side of the hearth
    bx = x1 + 0.22
    k.box(bx - 0.06, r_face + 0.3, 0.0, bx + 0.06, r_face + 0.7, 0.35, WOOD_DD, 'bellows_stand')
    k.box(bx - 0.25, r_face + 0.18, 0.35, bx + 0.25, r_face + 0.82, 0.4, (WOOD_D, 0.1), 'bellows')
    k.box(bx - 0.22, r_face + 0.22, 0.4, bx + 0.22, r_face + 0.78, 0.55, ('#5a3020', 0.15), 'bellows_leather')
    k.box(bx - 0.25, r_face + 0.18, 0.55, bx + 0.25, r_face + 0.82, 0.6, (WOOD_D, 0.1), 'bellows')
    k.cyl_x(x1 - 0.05, bx - 0.2, r_face + 0.5, 0.48, 0.03, 0.03, BRASS, 'bellows_nozzle', verts=6)
    k.box(bx - 0.02, r_face + 0.8, 0.6, bx + 0.02, r_face + 1.2, 0.64, WOOD_DD, 'bellows_handle')
    k.point_light(cx, r_face + 0.7, 1.0, '#ff7a30', energy, radius=0.3, group='flicker')
    k.point_light(cx, r_face + 1.6, 0.35, '#ff6a20', energy * 0.25, radius=0.4, group='flicker')
    k.solid(x0, r_face, x1 + 0.5, r_face + 0.9)


def crate(k, x0, r0, s=0.6, z0=0.0, tone=WOOD_L, solid=True, contents=None):
    """Slatted wooden crate; contents: None, 'apples', 'horseshoes', 'bars'."""
    x1, r1, z1 = x0 + s, r0 + s, z0 + s * 0.85
    k.box(x0, r0, z0, x1, r1, z1, (tone, 0.14), 'crate')
    edge = shade(tone, 0.7)
    for (a, b) in ((x0, x0 + 0.06), (x1 - 0.06, x1)):
        k.box(a, r1 - 0.01, z0, b, r1 + 0.01, z1, edge, 'crate_edge')
    for (a, b) in ((z0, z0 + 0.06), (z1 - 0.06, z1)):
        k.box(x0, r1 - 0.01, a, x1, r1 + 0.01, b, edge, 'crate_edge')
    k.box(x0 + 0.04, r0 + 0.04, z1 - 0.02, x1 - 0.04, r1 - 0.04, z1 + 0.002, shade(tone, 0.45), 'crate_inside')
    if contents == 'apples':
        for i in range(7):
            k.sphere(x0 + 0.13 + (i % 4) * 0.11, r0 + 0.18 + (i // 4) * 0.2, z1 + 0.03, 0.065, 0.06,
                     k.rng.choice(['#b02a20', '#c84030', '#8aa040']), 'apple', segs=8)
    elif contents == 'horseshoes':
        for i in range(4):
            k.cyl(x0 + 0.15 + (i % 2) * 0.28, r0 + 0.2 + (i // 2) * 0.2, z1, z1 + 0.03, 0.09, '#5a5a62', 'horseshoe', verts=10)
    elif contents == 'bars':
        for i in range(5):
            k.box(x0 + 0.06, r0 + 0.08 + i * 0.09, z1 - 0.02, x1 - 0.06, r0 + 0.14 + i * 0.09, z1 + 0.05, '#4a4a52', 'iron_bar')
    if solid:
        k.solid(x0, r0, x1, r1)


def bucket(k, cx, cr, water=True):
    k.cyl(cx, cr, 0, 0.32, 0.15, (WOOD, 0.12), 'bucket', verts=12)
    for z in (0.06, 0.26):
        k.cyl(cx, cr, z, z + 0.03, 0.155, IRON, 'bucket_hoop', verts=12)
    if water:
        k.cyl(cx, cr, 0.31, 0.335, 0.13, '#2a4a5a', 'water', emit=('#0a1a22', 1.0), verts=12)


def armor_stand(k, cx, cr):
    """Wooden mannequin wearing a breastplate and helm."""
    k.cyl(cx, cr, 0, 0.05, 0.22, WOOD_DD, 'stand', verts=10)
    k.cyl(cx, cr, 0.05, 1.0, 0.03, WOOD_D, 'stand', verts=6)
    k.sphere(cx, cr, 1.18, 0.24, 0.24, ('#9aa0aa', 0.06), 'armor', ry=0.15, segs=14)
    k.box(cx - 0.24, cr - 0.12, 0.9, cx + 0.24, cr + 0.12, 1.0, '#6a3a22', 'armor_belt')
    for sx in (-1, 1):
        k.sphere(cx + sx * 0.27, cr, 1.34, 0.12, 0.08, '#8a9098', 'pauldron', segs=10)
    k.cyl(cx, cr, 1.38, 1.46, 0.06, WOOD_D, 'stand', verts=6)
    k.sphere(cx, cr, 1.58, 0.14, 0.15, ('#8a9098', 0.06), 'helm', segs=12)
    k.box(cx - 0.1, cr + 0.1, 1.53, cx + 0.1, cr + 0.15, 1.56, '#1a1a1e', 'helm_slit')
    k.box(cx - 0.015, cr - 0.12, 1.7, cx + 0.015, cr + 0.12, 1.86, '#a02a2a', 'plume')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def wall_shield(k, cx, r_face, z=1.45, col='#2a4a7a'):
    k.cyl_y(cx, r_face, r_face + 0.05, z, 0.3, 0.3, (col, 0.1), 'shield', verts=18)
    k.cyl_y(cx, r_face + 0.04, r_face + 0.06, z, 0.3, 0.3, IRON, 'shield_rim', verts=18)
    k.cyl_y(cx, r_face + 0.05, r_face + 0.07, z, 0.26, 0.26, (col, 0.1), 'shield', verts=18)
    k.box(cx - 0.04, r_face + 0.06, z - 0.26, cx + 0.04, r_face + 0.08, z + 0.26, BRASS, 'shield_band')
    k.box(cx - 0.26, r_face + 0.06, z - 0.04, cx + 0.26, r_face + 0.08, z + 0.04, BRASS, 'shield_band')
    k.sphere(cx, r_face + 0.09, z, 0.07, 0.07, BRASS, 'shield_boss', ry=0.03, segs=10)


def wall_sconce(k, cx, r_face, z=1.5, energy=6.0):
    """Iron bracket with a candle — a small pool of warm light on the wall."""
    k.box(cx - 0.04, r_face, z - 0.2, cx + 0.04, r_face + 0.04, z + 0.05, IRON, 'sconce')
    k.box(cx - 0.02, r_face, z - 0.02, cx + 0.02, r_face + 0.2, z + 0.02, IRON, 'sconce')
    k.cyl(cx, r_face + 0.2, z + 0.02, z + 0.04, 0.06, IRON, 'sconce', verts=8)
    candle(k, cx, r_face + 0.2, z + 0.04, energy=energy)


def smith_bench(k, x0, x1, cr):
    """Heavy workbench with a vise, hammers and a lamp."""
    k.box(x0, cr - 0.35, 0.78, x1, cr + 0.35, 0.88, (WOOD_D, 0.14), 'workbench')
    for x in (x0 + 0.05, x1 - 0.15):
        k.box(x, cr - 0.3, 0, x + 0.1, cr + 0.3, 0.78, WOOD_DD, 'table_leg')
    k.box(x0 + 0.08, cr - 0.28, 0.2, x1 - 0.08, cr + 0.28, 0.25, WOOD_DD, 'table_shelf')
    k.box(x0 + 0.25, cr + 0.1, 0.88, x0 + 0.55, cr + 0.4, 1.08, IRON, 'vise')
    k.box(x0 + 0.3, cr + 0.38, 0.95, x0 + 0.5, cr + 0.42, 1.0, '#5a5a62', 'vise')
    k.box(x0 + 0.8, cr - 0.1, 0.88, x0 + 1.2, cr - 0.05, 0.91, WOOD, 'hammer')
    k.box(x0 + 1.15, cr - 0.14, 0.88, x0 + 1.25, cr - 0.01, 0.96, IRON, 'hammer')
    k.box(x1 - 0.7, cr - 0.25, 0.88, x1 - 0.2, cr + 0.25, 0.9, '#7a6a50', 'leather')
    for i in range(4):
        k.box(x1 - 0.65 + i * 0.12, cr - 0.2, 0.9, x1 - 0.6 + i * 0.12, cr + 0.15, 0.92, '#9aa0a8', 'nails')
    k.solid(x0, cr - 0.4, x1, cr + 0.4)


def anvil(k, cx, cr, glowing_blade=True):
    k.cyl(cx, cr, 0, 0.45, 0.24, (WOOD_D, 0.12), 'stump', verts=12)
    k.box(cx - 0.12, cr - 0.1, 0.45, cx + 0.12, cr + 0.1, 0.62, IRON, 'anvil')
    k.box(cx - 0.3, cr - 0.12, 0.62, cx + 0.3, cr + 0.12, 0.75, ('#4a4a52', 0.08), 'anvil')
    k.cone(cx + 0.36, cr, 0.66, 0.74, 0.08, 0.01, '#4a4a52', 'anvil', verts=8)
    if glowing_blade:
        k.box(cx - 0.22, cr - 0.03, 0.75, cx + 0.18, cr + 0.03, 0.78, '#ff8030', 'hot_blade', emit=('#ff6020', 2.0))
        k.point_light(cx, cr + 0.3, 0.95, '#ff7030', 4, radius=0.05, group='flicker')
    k.solid(cx - 0.35, cr - 0.3, cx + 0.35, cr + 0.3)


def tool_wall(k, x0, x1, r_face, z0=1.0, z1=1.9, missing=False):
    k.box(x0, r_face, z0, x1, r_face + 0.05, z1, ('#4a3420', 0.12), 'pegboard')
    x = x0 + 0.15
    i = 0
    while x < x1 - 0.1:
        if missing and i == 3:
            k.box(x - 0.06, r_face + 0.05, z0 + 0.25, x + 0.06, r_face + 0.06, z1 - 0.2, '#6a5034', 'peg_shadow')
        else:
            kind = i % 3
            if kind == 0:   # hammer
                k.box(x - 0.02, r_face + 0.05, z0 + 0.2, x + 0.02, r_face + 0.09, z1 - 0.25, WOOD, 'tool')
                k.box(x - 0.08, r_face + 0.05, z1 - 0.3, x + 0.08, r_face + 0.11, z1 - 0.2, IRON, 'tool')
            elif kind == 1:  # tongs
                k.box(x - 0.05, r_face + 0.05, z0 + 0.15, x - 0.02, r_face + 0.08, z1 - 0.15, IRON, 'tool')
                k.box(x + 0.02, r_face + 0.05, z0 + 0.15, x + 0.05, r_face + 0.08, z1 - 0.15, IRON, 'tool')
            else:            # file / chisel
                k.box(x - 0.02, r_face + 0.05, z0 + 0.3, x + 0.02, r_face + 0.08, z1 - 0.1, '#6a6a72', 'tool')
        k.cyl_y(x, r_face + 0.05, r_face + 0.1, z1 - 0.1, 0.02, 0.02, WOOD_DD, 'peg', verts=6)
        x += 0.24
        i += 1


def weapon_rack(k, cx, cr):
    k.box(cx - 0.4, cr - 0.12, 0.0, cx + 0.4, cr + 0.12, 0.1, WOOD_D, 'rack')
    k.box(cx - 0.4, cr - 0.12, 0.9, cx + 0.4, cr - 0.02, 0.98, WOOD_D, 'rack')
    for i, x in enumerate((cx - 0.25, cx, cx + 0.25)):
        if i < 2:   # swords
            k.box(x - 0.025, cr - 0.05, 0.1, x + 0.025, cr + 0.0, 1.05, '#b8bcc4', 'blade')
            k.box(x - 0.1, cr - 0.06, 0.3, x + 0.1, cr + 0.01, 0.34, BRASS, 'guard')
            k.box(x - 0.03, cr - 0.06, 0.1, x + 0.03, cr + 0.01, 0.3, '#5e3a22', 'grip')
        else:       # axe
            k.box(x - 0.025, cr - 0.05, 0.1, x + 0.025, cr + 0.0, 1.05, WOOD, 'haft')
            k.box(x - 0.02, cr - 0.08, 0.82, x + 0.18, cr + 0.03, 1.02, '#9a9ea8', 'axe_head')
    k.solid(cx - 0.45, cr - 0.3, cx + 0.45, cr + 0.3)


def quench_trough(k, x0, x1, cr):
    k.box(x0, cr - 0.3, 0, x1, cr + 0.3, 0.42, (WOOD_D, 0.1), 'trough')
    k.box(x0 + 0.06, cr - 0.24, 0.42, x1 - 0.06, cr + 0.24, 0.47, '#2a5060', 'water', emit=('#0c1c24', 1.0))
    for (a, b) in ((cr - 0.3, cr - 0.24), (cr + 0.24, cr + 0.3)):
        k.box(x0, a, 0.42, x1, b, 0.55, (WOOD, 0.1), 'trough_rim')
    for (a, b) in ((x0, x0 + 0.06), (x1 - 0.06, x1)):
        k.box(a, cr - 0.3, 0.42, b, cr + 0.3, 0.55, (WOOD, 0.1), 'trough_rim')
    for x in (x0 + 0.2, x1 - 0.26):
        k.box(x, cr + 0.3, 0.05, x + 0.06, cr + 0.32, 0.5, IRON, 'trough_band')
    k.box(x0 + 0.5, cr - 0.05, 0.47, x0 + 1.1, cr + 0.0, 0.5, '#5a5a62', 'tongs')
    k.solid(x0, cr - 0.35, x1, cr + 0.35)


def grindstone(k, cx, cr):
    """Treadle grindstone: a stone wheel facing the camera in a timber frame."""
    for x in (cx - 0.3, cx + 0.24):
        k.box(x, cr - 0.25, 0, x + 0.06, cr + 0.25, 0.5, WOOD_D, 'grind_frame')
    k.box(cx - 0.3, cr - 0.25, 0.0, cx + 0.3, cr + 0.25, 0.06, WOOD_D, 'grind_frame')
    k.cyl_y(cx, cr - 0.06, cr + 0.06, 0.5, 0.3, 0.3, ('#9a9488', 0.12), 'grindstone', verts=20)
    k.cyl_y(cx, cr + 0.06, cr + 0.07, 0.5, 0.06, 0.06, IRON, 'grind_axle', verts=8)
    k.cyl_x(cx - 0.3, cx + 0.42, cr, 0.5, 0.025, 0.025, IRON, 'grind_axle', verts=6)
    k.box(cx + 0.4, cr - 0.02, 0.5, cx + 0.44, cr + 0.02, 0.72, WOOD, 'grind_crank')
    k.box(cx - 0.2, cr - 0.14, 0.06, cx + 0.2, cr + 0.14, 0.14, '#4a6a7a', 'water', emit=('#0c1c24', 0.6))
    k.solid(cx - 0.35, cr - 0.3, cx + 0.45, cr + 0.3)


def sword_barrel(k, cx, cr):
    barrel(k, cx, cr, h=0.75, radius=0.3, tone=WOOD_D)
    for dx, dr, h in ((-0.1, -0.05, 0.55), (0.08, 0.06, 0.45), (0.02, -0.12, 0.6)):
        k.box(cx + dx - 0.02, cr + dr - 0.02, 0.75, cx + dx + 0.02, cr + dr + 0.02, 0.75 + h * 0.6, '#5e3a22', 'grip')
        k.box(cx + dx - 0.08, cr + dr - 0.025, 0.75 + h * 0.6, cx + dx + 0.08, cr + dr + 0.025, 0.79 + h * 0.6, BRASS, 'guard')
        k.box(cx + dx - 0.02, cr + dr - 0.02, 0.79 + h * 0.6, cx + dx + 0.02, cr + dr + 0.02, 0.85 + h * 0.6, BRASS, 'pommel')


def chopping_block(k, cx, cr):
    k.cyl(cx, cr, 0, 0.42, 0.26, (WOOD, 0.14), 'stump', verts=14)
    k.cyl(cx, cr, 0.42, 0.43, 0.22, '#c89a60', 'stump_top', verts=14)
    k.box(cx - 0.05, cr - 0.03, 0.43, cx + 0.15, cr + 0.03, 0.55, '#9a9ea8', 'axe_head')
    k.box(cx + 0.1, cr - 0.02, 0.48, cx + 0.5, cr + 0.02, 0.52, WOOD_L, 'haft')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


def coal_pile(k, cx, cr):
    for i in range(10):
        k.sphere(cx + k.rng.uniform(-0.25, 0.25), cr + k.rng.uniform(-0.15, 0.15), 0.06 + 0.04 * (i % 3), 0.09, 0.07,
                 '#1a1a1e', 'coal', segs=6)
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)


# ---- apothecary --------------------------------------------------------------
JAR_COLS = ['#5a8a5a', '#8a5a7a', '#c0a050', '#5a7a9a', '#9a6040', '#7a9a6a', '#b07ab0']


def jar(k, x, r, z, col=None, glow=None):
    """A potion jar or bottle with a paper label; glow lights it from within."""
    col = col or k.rng.choice(JAR_COLS)
    kind = k.rng.choice(['jar', 'jar', 'flask', 'bottle'])
    emit = (shade(col, 0.5), 1.6) if glow else None
    if kind == 'jar':
        h = k.rng.uniform(0.14, 0.22)
        k.cyl(x, r, z, z + h, 0.06, col, 'jar', emit=emit, verts=10)
        k.cyl(x, r, z + h, z + h + 0.03, 0.05, '#c8b890', 'jar_lid', verts=10)
        k.box(x - 0.035, r + 0.055, z + h * 0.3, x + 0.035, r + 0.065, z + h * 0.7, '#e8dcc0', 'label')
    elif kind == 'flask':
        k.sphere(x, r, z + 0.08, 0.075, 0.08, col, 'jar', emit=emit, segs=10)
        k.cyl(x, r, z + 0.14, z + 0.24, 0.02, col, 'jar', emit=emit, verts=6)
        k.cyl(x, r, z + 0.24, z + 0.27, 0.025, '#8a6a40', 'cork', verts=6)
    else:
        h = k.rng.uniform(0.18, 0.26)
        k.cyl(x, r, z, z + h, 0.045, col, 'jar', emit=emit, verts=8)
        k.cyl(x, r, z + h, z + h + 0.07, 0.018, shade(col, 0.8), 'jar', verts=6)
        k.box(x - 0.03, r + 0.04, z + h * 0.35, x + 0.03, r + 0.05, z + h * 0.7, '#e8dcc0', 'label')
    if glow:
        k.point_light(x, r + 0.2, z + 0.15, glow, 0.6, radius=0.05, group='flicker')


def jar_shelves(k, x0, x1, r_face, levels=(0.5, 0.95, 1.4, 1.85), glow_every=5):
    levels = open_shelves(k, x0, x1, r_face, top=2.15, levels=levels, tone='#3e2616')
    n = 0
    for z in levels:
        x = x0 + 0.16
        while x < x1 - 0.14:
            n += 1
            col = k.rng.choice(JAR_COLS)
            jar(k, x, r_face + 0.2, z, col, glow=shade(col, 1.4) if n % glow_every == 0 else None)
            x += k.rng.uniform(0.15, 0.21)
    # oddities on top
    k.sphere(x0 + 0.35, r_face + 0.2, 2.3, 0.1, 0.09, '#e8e0cc', 'skull', segs=10)
    k.box(x0 + 0.29, r_face + 0.28, 2.27, x0 + 0.33, r_face + 0.3, 2.3, '#1a1414', 'skull_eye')
    k.box(x0 + 0.37, r_face + 0.28, 2.27, x0 + 0.41, r_face + 0.3, 2.3, '#1a1414', 'skull_eye')
    k.cyl(x1 - 0.4, r_face + 0.2, 2.22, 2.42, 0.08, '#4a3a5a', 'jar', verts=10)


def bookshelf(k, x0, x1, r_face, top=2.15, levels=(0.15, 0.62, 1.09, 1.56), tone='#3e2616'):
    levels = open_shelves(k, x0, x1, r_face, top=top, levels=levels, tone=tone)
    for z in levels:
        x = x0 + 0.1
        while x < x1 - 0.12:
            w = k.rng.uniform(0.05, 0.09)
            h = k.rng.uniform(0.26, 0.38)
            col = k.rng.choice(BOOK_COLS)
            if k.rng.random() < 0.08:
                x += 0.12   # gap
                continue
            k.box(x, r_face + 0.06, z, x + w, r_face + 0.32, z + h, (col, 0.08), 'book')
            k.box(x, r_face + 0.32, z + h * 0.15, x + w, r_face + 0.325, z + h * 0.22, BRASS, 'book_band')
            x += w + 0.008


BOOK_COLS = ['#6a2a2a', '#2a4a3a', '#3a3a6a', '#7a5a2a', '#4a2a4a', '#8a6a4a', '#2a2a2a', '#5a1a1a']


def crystal_ball(k, cx, cr, z, col='#9a80e0', energy=3.0):
    k.cyl(cx, cr, z, z + 0.05, 0.11, BRASS, 'ball_stand', verts=10)
    k.cyl(cx, cr, z + 0.05, z + 0.08, 0.07, BRASS, 'ball_stand', verts=8)
    k.sphere(cx, cr, z + 0.19, 0.12, 0.12, col, 'crystal_ball', emit=(col, 1.2), segs=14)
    k.sphere(cx - 0.04, cr + 0.05, z + 0.24, 0.03, 0.03, '#ffffff', 'ball_glint', emit=('#ffffff', 2.0), segs=6)
    k.point_light(cx, cr + 0.1, z + 0.35, col, energy, radius=0.1, group='flicker')


def owl(k, cx, cr, z):
    """A stuffed owl on a perch, watching the door."""
    k.box(cx - 0.12, cr - 0.03, z, cx + 0.12, cr + 0.03, z + 0.03, WOOD_DD, 'perch')
    k.sphere(cx, cr, z + 0.16, 0.11, 0.14, ('#7a5a3a', 0.15), 'owl', segs=12)
    k.sphere(cx, cr, z + 0.33, 0.09, 0.08, ('#8a6a44', 0.12), 'owl', segs=10)
    for sx in (-1, 1):
        k.sphere(cx + sx * 0.04, cr + 0.08, z + 0.34, 0.03, 0.03, '#f0c040', 'owl_eye', emit=('#806010', 0.8), segs=6)
        k.cone(cx + sx * 0.06, cr, z + 0.39, 0.45, 0.025, 0.002, '#5a3a20', 'owl', verts=5)


def mushroom_jar(k, cx, cr, z):
    """Glass terrarium of glowing mushrooms."""
    k.cyl(cx, cr, z, z + 0.04, 0.13, WOOD_DD, 'terrarium', verts=12)
    k.cyl(cx, cr, z + 0.04, z + 0.06, 0.12, '#3a2a1a', 'soil', verts=12)
    for dx, h, col in ((-0.05, 0.1, '#60e0c0'), (0.04, 0.14, '#80c0ff'), (0.0, 0.07, '#c080ff')):
        k.cyl(cx + dx, cr, z + 0.06, z + 0.06 + h, 0.012, '#e8e0c8', 'mushroom', verts=5)
        k.sphere(cx + dx, cr, z + 0.06 + h, 0.04, 0.025, col, 'mushroom_cap', emit=(col, 1.5), segs=8)
    k.point_light(cx, cr + 0.1, z + 0.2, '#70d0e0', 1.2, radius=0.05, group='static')


def herb_beam(k, x0, x1, r_face, z=2.05):
    k.box(x0, r_face + 0.2, z, x1, r_face + 0.32, z + 0.1, WOOD_DD, 'herb_beam')
    x = x0 + 0.2
    while x < x1 - 0.1:
        col = k.rng.choice(['#6a8a4a', '#8a7aa8', '#a8a060', '#5a7048'])
        k.cyl(x, r_face + 0.26, z - 0.08, z, 0.012, '#8a6a40', 'herb_twine', verts=4)
        k.cone(x, r_face + 0.26, z - 0.5, z - 0.08, 0.07, 0.02, (col, 0.15), 'herbs', verts=8)
        x += k.rng.uniform(0.22, 0.32)


def cauldron(k, cx, cr, brew='#5ac060', energy=8.0):
    for a in (0.3, 2.4, 4.4):  # legs over embers
        k.cyl(cx + math.cos(a) * 0.3, cr + math.sin(a) * 0.25, 0, 0.25, 0.03, IRON, 'cauldron_leg', verts=6)
    k.cyl(cx, cr, 0.0, 0.04, 0.4, '#3a3430', 'cauldron_hearth', verts=14)
    for i in range(7):
        a = i * 0.9
        k.sphere(cx + math.cos(a) * 0.18, cr + math.sin(a) * 0.14, 0.06, 0.06, 0.04,
                 k.rng.choice(['#ff6020', '#ffa040', '#c03010']), 'embers', emit=('#ff6020', 2.5), segs=6)
    for dx, dr in ((-0.26, 0.26), (-0.12, 0.34), (0.03, 0.36), (0.17, 0.32), (0.29, 0.22)):
        k.sphere(cx + dx, cr + dr, 0.035, 0.05, 0.03, k.rng.choice(['#ff7a30', '#d04018']), 'embers',
                 emit=('#ff5a18', 1.6), segs=6)
    k.point_light(cx, cr + 0.45, 0.15, '#ff7a30', 4.0, radius=0.1, group='flicker')
    k.sphere(cx, cr, 0.45, 0.42, 0.32, (IRON, 0.08), 'cauldron', segs=18)
    k.cyl(cx, cr, 0.62, 0.7, 0.36, '#222228', 'cauldron_rim', verts=18)
    k.cyl(cx, cr, 0.66, 0.68, 0.32, brew, 'brew', emit=(shade(brew, 0.6), 2.0), verts=18)
    for i in range(3):
        k.sphere(cx + (i - 1) * 0.12, cr + 0.05 * (i % 2), 0.71, 0.04, 0.03, shade(brew, 1.3), 'bubble', emit=(brew, 2.0), segs=6)
    k.point_light(cx, cr, 0.95, brew, energy, radius=0.15, group='flicker')
    k.solid(cx - 0.45, cr - 0.4, cx + 0.45, cr + 0.4)


def workbench(k, x0, x1, cr):
    k.box(x0, cr - 0.35, 0.78, x1, cr + 0.35, 0.86, (WOOD, 0.12), 'workbench')
    for x in (x0 + 0.05, x1 - 0.13):
        k.box(x, cr - 0.3, 0, x + 0.08, cr + 0.3, 0.78, WOOD_D, 'table_leg')
    k.cyl(x0 + 0.4, cr, 0.86, 0.98, 0.1, '#8a8478', 'mortar', verts=10)
    k.cyl(x0 + 0.45, cr - 0.02, 0.95, 1.12, 0.02, WOOD_L, 'pestle', verts=6)
    k.box(x1 - 0.85, cr - 0.2, 0.86, x1 - 0.3, cr + 0.2, 0.9, '#e8dcc0', 'book')
    k.box(x1 - 0.58, cr - 0.2, 0.86, x1 - 0.56, cr + 0.2, 0.91, '#6a2a2a', 'book_spine')
    for i in range(3):
        k.cyl(x1 - 0.2, cr - 0.15 + i * 0.13, 0.86, 1.02, 0.04, JAR_COLS[i], 'vial', verts=6)
    k.solid(x0, cr - 0.4, x1, cr + 0.4)


def altar_candle(k, cx, cr):
    k.box(cx - 0.3, cr - 0.25, 0, cx + 0.3, cr + 0.25, 0.7, (STONE, 0.14), 'altar', bevel=0.03)
    k.box(cx - 0.34, cr - 0.29, 0.7, cx + 0.34, cr + 0.29, 0.76, STONE_D, 'altar_top')
    candle(k, cx, cr, 0.76, energy=3.0)
    k.solid(cx - 0.35, cr - 0.3, cx + 0.35, cr + 0.3)


# ---- inn extras --------------------------------------------------------------
def grandfather_clock(k, cx, r_face):
    k.box(cx - 0.24, r_face, 0, cx + 0.24, r_face + 0.32, 1.75, (WOOD_D, 0.12), 'clock', bevel=0.02)
    k.box(cx - 0.28, r_face, 1.75, cx + 0.28, r_face + 0.36, 1.85, WOOD_DD, 'clock_crown')
    k.cyl_y(cx, r_face + 0.32, r_face + 0.34, 1.48, 0.17, 0.17, '#e8dcc0', 'clock_face', verts=16)
    k.cyl_y(cx, r_face + 0.33, r_face + 0.35, 1.48, 0.19, 0.19, BRASS, 'clock_rim', verts=16)
    k.cyl_y(cx, r_face + 0.34, r_face + 0.36, 1.48, 0.16, 0.16, '#e8dcc0', 'clock_face', verts=16)
    k.box(cx - 0.01, r_face + 0.36, 1.48, cx + 0.01, r_face + 0.37, 1.6, '#1a1414', 'clock_hand')
    k.box(cx, r_face + 0.36, 1.47, cx + 0.1, r_face + 0.37, 1.49, '#1a1414', 'clock_hand')
    k.box(cx - 0.13, r_face + 0.32, 0.35, cx + 0.13, r_face + 0.34, 1.2, '#1a120c', 'clock_window')
    k.box(cx - 0.01, r_face + 0.33, 0.6, cx + 0.01, r_face + 0.35, 1.15, BRASS, 'pendulum')
    k.cyl_y(cx, r_face + 0.33, r_face + 0.36, 0.6, 0.07, 0.07, BRASS, 'pendulum', verts=12)
    k.solid(cx - 0.3, r_face, cx + 0.3, r_face + 0.4)


def trunk(k, x0, r0, w=0.8, d=0.5, tone='#6a3a22', z0=0.0):
    """Travel chest with brass corners and straps."""
    x1, r1 = x0 + w, r0 + d
    k.box(x0, r0, z0, x1, r1, z0 + 0.38, (tone, 0.12), 'trunk', bevel=0.02)
    k.cyl_x(x0, x1, (r0 + r1) / 2, z0 + 0.38, d / 2, 0.12, (shade(tone, 1.1), 0.12), 'trunk_lid', verts=14)
    for x in (x0 + 0.15, x1 - 0.2):
        k.box(x, r0 - 0.01, z0, x + 0.05, r1 + 0.01, z0 + 0.4, '#3a2414', 'trunk_strap')
    k.box((x0 + x1) / 2 - 0.05, r1, z0 + 0.25, (x0 + x1) / 2 + 0.05, r1 + 0.02, z0 + 0.36, BRASS, 'trunk_lock')
    k.solid(x0, r0, x1, r1)


def desk_lamp(k, cx, cr, z, energy=4.0):
    k.cyl(cx, cr, z, z + 0.03, 0.08, BRASS, 'lamp_base', verts=10)
    k.cyl(cx, cr, z + 0.03, z + 0.2, 0.06, '#ffd890', 'lamp_glass', emit=('#ffcf80', 2.0), verts=10)
    k.cyl(cx, cr, z + 0.2, z + 0.24, 0.04, BRASS, 'lamp_cap', verts=8)
    k.point_light(cx, cr + 0.15, z + 0.35, '#ffc078', energy, radius=0.06, group='flicker')
