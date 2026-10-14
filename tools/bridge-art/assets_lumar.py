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


def back_wall(k, x0, x1, r_face, height, thickness=0.5, wainscot=0.9, beams_every=2.0):
    """Back wall whose front face sits at row r_face: plaster with timber
    beams above dark wood wainscoting."""
    k.box(x0, r_face - thickness, 0, x1, r_face, height, (PLASTER, 0.08), 'wall')
    # wainscot panel strip proud of the wall
    k.box(x0, r_face - 0.02, 0, x1, r_face + 0.05, wainscot, (WOOD_D, 0.1), 'wainscot')
    k.box(x0, r_face - 0.02, wainscot, x1, r_face + 0.09, wainscot + 0.08, WOOD, 'wainscot_rail')
    # timber frame
    k.box(x0, r_face - 0.02, height - 0.22, x1, r_face + 0.06, height, WOOD_DD, 'beam_top')
    x = x0 + beams_every / 2
    while x < x1 - 0.2:
        k.box(x - 0.09, r_face - 0.02, wainscot, x + 0.09, r_face + 0.06, height, WOOD_DD, 'beam')
        x += beams_every
    k.box(x0, r_face - thickness, height, x1, r_face, height + 0.04, WOOD_DD, 'wall_cap')


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


def rug(k, x0, r0, x1, r1, col=CLOTH_R):
    k.box(x0, r0, 0.0, x1, r1, 0.015, (col, 0.1), 'rug')
    k.box(x0 + 0.12, r0 + 0.12, 0.015, x1 - 0.12, r1 - 0.12, 0.02, (shade(col, 1.25), 0.1), 'rug')
    k.box(x0 + 0.3, r0 + 0.3, 0.02, x1 - 0.3, r1 - 0.3, 0.025, (shade(col, 0.8), 0.1), 'rug')


def side_table(k, cx, cr):
    k.box(cx - 0.25, cr - 0.25, 0.55, cx + 0.25, cr + 0.25, 0.6, WOOD, 'side_table')
    for dx in (-0.2, 0.17):
        for dr in (-0.2, 0.17):
            k.box(cx + dx, cr + dr, 0, cx + dx + 0.04, cr + dr + 0.04, 0.55, WOOD_D, 'side_table')
    k.solid(cx - 0.3, cr - 0.3, cx + 0.3, cr + 0.3)
