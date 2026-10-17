"""The harbour kit — the working quay's static pieces, for the island renders to place when they're rebuilt.

  import assets_harbour as HB
  HB.jib_crane(k, cx, cr, face=0.0)          a timber jib crane on a stone block (the jib swung to `face`, radians, 0 east)
  HB.cargo_stack(k, cx, cr, n=5)             crates, bales and a barrel or two, stacked on the stones
  HB.ropewalk(k, x0, x1, r)                  a ropewalk: the spinning wheel at x0, trestles with hooks out to x1, a strand laid
  HB.sail_loft(k, x0, x1, r_back, r_front)   a long open-fronted sail loft: canvas hung from the beams, a bolt on a trestle
  HB.net_rack(k, cx, cr, w=2.0)              nets hung over a rail to dry, corks along the foot
  HB.canvas(k, x0, x1, r0, r1)               sailcloth spread flat on the stones, the bolt rolled up at one end

Placement is for the scene scripts (being rebuilt by the area sessions); these are only the builders. The LIFE of the
harbours — the fleet out and home, the merchantman alongside, the crane's jib turning, the dockhands, the people at work —
is drawn live in the game (js/harbourlife.js, js/sloop.js), so a render placing these should leave a crane's jib and
hook to the live one if it places a crane where js/harbourlife.js `HARBOURS` has one (or move that one). Same model
world as the rest of the kit (scenekit + assets_*): chunky shapes that read at 32 px a tile, lit by the scene.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402,F401
from assets_lumar import barrel, WOOD, WOOD_D, WOOD_DD, WOOD_L, STONE, STONE_D, IRON  # noqa: E402

ROPE = '#c8b48a'
CANVAS = ('#e6dcc4', '#d0c4a6')
CRATE = ('#9a6a34', '#7a5028')
BALE = '#b8a47a'
NET = '#33423a'
CORK = ('#e0c890', '#c8402e')


def jib_crane(k, cx, cr, face=0.0, h=3.6, reach=2.4):
    """A timber jib crane: a squared stone block, an iron-banded oak post, a winch drum, a braced jib, the fall and hook."""
    k.box(cx - 0.42, cr - 0.42, 0, cx + 0.42, cr + 0.42, 0.36, (STONE, 0.08), 'crane_base', bevel=0.03)
    k.box(cx - 0.36, cr - 0.36, 0.36, cx + 0.36, cr + 0.36, 0.42, (STONE_D, 0.06), 'crane_base')
    k.box(cx - 0.14, cr - 0.14, 0.42, cx + 0.14, cr + 0.14, h + 0.3, (WOOD_D, 0.08), 'crane_post')
    for z in (0.9, 1.8, 2.7):
        k.box(cx - 0.16, cr - 0.16, z, cx + 0.16, cr + 0.16, z + 0.06, IRON, 'crane_band')
    k.cyl_x(cx - 0.32, cx + 0.32, cr + 0.22, 1.1, 0.16, 0.16, WOOD, 'crane_winch')
    k.cyl_x(cx - 0.36, cx - 0.3, cr + 0.22, 1.1, 0.24, 0.24, WOOD_DD, 'crane_winch')
    c, s = math.cos(face), math.sin(face)
    tip = (cx + c * reach, cr + s * reach, h)
    k.tube((cx, cr, h + 0.1), tip, 0.09, WOOD, 'crane_jib')
    k.tube((cx, cr, h - 1.3), (cx + c * reach * 0.45, cr + s * reach * 0.45, h), 0.06, WOOD_D, 'crane_brace')
    k.tube((cx, cr, h + 0.3), tip, 0.015, ROPE, 'crane_stay')
    k.box(tip[0] - 0.08, tip[1] - 0.08, h - 0.14, tip[0] + 0.08, tip[1] + 0.08, h + 0.02, IRON, 'crane_sheave')
    k.tube(tip, (tip[0], tip[1], h - 1.6), 0.012, ROPE, 'crane_fall')
    k.box(tip[0] - 0.06, tip[1] - 0.04, h - 1.72, tip[0] + 0.06, tip[1] + 0.04, h - 1.6, IRON, 'crane_hook')
    k.solid_post(cx, cr)


def crate(k, x0, r0, z0, size=0.42, tone=CRATE):
    k.box(x0, r0, z0, x0 + size, r0 + size, z0 + size, (tone[0], 0.1), 'crate', bevel=0.02)
    k.box(x0 - 0.01, r0 + size * 0.45, z0, x0 + size + 0.01, r0 + size * 0.55, z0 + size + 0.01, tone[1], 'crate_band')


def cargo_stack(k, cx, cr, n=5):
    """Crates two high, a bale or two, a barrel: cargo swung ashore and waiting for the dockhands."""
    spots = [(-0.45, -0.2, 0), (0.0, -0.2, 0), (-0.25, -0.2, 0.42), (0.45, 0.1, 0), (-0.5, 0.3, 0), (0.1, 0.35, 0)]
    for i, (dx, dr, z) in enumerate(spots[:n]):
        if i == 3:
            k.box(cx + dx, cr + dr, 0, cx + dx + 0.5, cr + dr + 0.36, 0.34, (BALE, 0.12), 'bale', bevel=0.05)
            k.box(cx + dx + 0.2, cr + dr - 0.01, 0, cx + dx + 0.26, cr + dr + 0.37, 0.35, '#5a4a30', 'bale_rope')
        elif i == 5:
            barrel(k, cx + dx + 0.2, cr + dr + 0.2, h=0.6, radius=0.22)
        else:
            crate(k, cx + dx, cr + dr, z)
    k.solid(cx - 0.6, cr - 0.3, cx + 0.95, cr + 0.7)


def ropewalk(k, x0, x1, r):
    """The ropewalk: the spinning wheel on its A-frame at x0, trestles every few tiles with hooks, a strand laid along."""
    for sg in (-1, 1):
        k.tube((x0 + sg * 0.3, r, 0), (x0, r, 1.4), 0.05, WOOD_D, 'rope_frame')
    k.cyl_y(x0, r - 0.05, r + 0.05, 1.1, 0.55, 0.55, WOOD, 'rope_wheel', verts=20)
    k.cyl_y(x0, r - 0.07, r + 0.07, 1.1, 0.1, 0.1, WOOD_L, 'rope_hub')
    for a in range(3):
        t = a * math.pi / 3
        k.tube((x0 - math.cos(t) * 0.5, r + 0.06, 1.1 - math.sin(t) * 0.5), (x0 + math.cos(t) * 0.5, r + 0.06, 1.1 + math.sin(t) * 0.5), 0.025, WOOD_D, 'rope_spoke')
    x = x0 + 2.5
    while x < x1:
        k.box(x - 0.04, r - 0.2, 0, x + 0.04, r - 0.12, 0.8, WOOD_D, 'rope_trestle')
        k.box(x - 0.04, r + 0.12, 0, x + 0.04, r + 0.2, 0.8, WOOD_D, 'rope_trestle')
        k.box(x - 0.06, r - 0.22, 0.8, x + 0.06, r + 0.22, 0.88, WOOD, 'rope_trestle')
        x += 3.0
    k.tube((x0 + 0.5, r, 1.05), (x1, r, 0.9), 0.02, ROPE, 'rope_strand')


def sail_loft(k, x0, x1, r_back, r_front, roof='#5a4a3a'):
    """A long open-fronted loft on posts, canvas hung from its beams in sheets, a bolt of cloth on a trestle."""
    k.box(x0, r_back, 0, x1, r_back + 0.25, 2.6, (STONE, 0.1), 'loft_wall')
    x = x0
    while x <= x1 + 0.01:
        k.box(x - 0.1, r_front - 0.1, 0, x + 0.1, r_front + 0.1, 2.4, (WOOD_D, 0.08), 'loft_post')
        x += max(1.5, (x1 - x0) / 4)
    k.box(x0 - 0.1, r_front - 0.12, 2.3, x1 + 0.1, r_front + 0.12, 2.5, WOOD, 'loft_beam')
    k.poly([(x0 - 0.3, r_front + 0.4, 2.5), (x1 + 0.3, r_front + 0.4, 2.5), (x1 + 0.3, r_back, 3.4), (x0 - 0.3, r_back, 3.4)], roof, 'loft_roof')
    x = x0 + 0.6
    i = 0
    while x < x1 - 0.6:
        k.box(x, (r_back + r_front) / 2, 0.5, x + 0.9, (r_back + r_front) / 2 + 0.03, 2.25, CANVAS[i % 2], 'loft_canvas')
        x += 1.3
        i += 1
    k.box(x0 + 0.3, r_front - 0.6, 0, x0 + 0.4, r_front - 0.2, 0.7, WOOD_D, 'loft_trestle')
    k.box(x0 + 1.3, r_front - 0.6, 0, x0 + 1.4, r_front - 0.2, 0.7, WOOD_D, 'loft_trestle')
    k.cyl_x(x0 + 0.2, x0 + 1.5, r_front - 0.4, 0.86, 0.17, 0.17, CANVAS[0], 'loft_bolt')
    k.solid(x0, r_back, x1, r_front)


def net_rack(k, cx, cr, w=2.0):
    """Nets hung over a rail between two posts to dry, sagging, corks along the foot."""
    for x in (cx - w / 2, cx + w / 2):
        k.box(x - 0.06, cr - 0.06, 0, x + 0.06, cr + 0.06, 1.3, WOOD_D, 'net_post')
    k.box(cx - w / 2, cr - 0.04, 1.24, cx + w / 2, cr + 0.04, 1.32, WOOD, 'net_rail')
    k.loft([[(cx - w / 2 + 0.08 + i * (w - 0.16) / 6, cr + 0.02, 1.25 - 0.9 * (0.6 + 0.4 * math.sin(i / 6 * math.pi))) for i in range(7)],
            [(cx - w / 2 + 0.08 + i * (w - 0.16) / 6, cr + 0.02, 1.25) for i in range(7)]], NET, 'net')
    for i in range(7):
        x = cx - w / 2 + 0.12 + i * (w - 0.24) / 6
        k.sphere(x, cr + 0.06, 1.25 - 0.9 * (0.6 + 0.4 * math.sin(i / 6 * math.pi)), 0.05, 0.04, CORK[i % 2], 'net_cork')


def canvas(k, x0, x1, r0, r1):
    """Sailcloth spread flat on the stones, a fold in it, the rest of the bolt rolled up at the far end."""
    k.box(x0, r0, 0, x1 - 0.3, r1, 0.025, (CANVAS[0], 0.06), 'canvas')
    k.box(x0 + (x1 - x0) * 0.4, r0, 0.025, x0 + (x1 - x0) * 0.4 + 0.12, r1, 0.06, CANVAS[1], 'canvas_fold')
    k.cyl_y(x1 - 0.15, r0 - 0.05, r1 + 0.05, 0.15, 0.15, 0.15, CANVAS[1], 'canvas_bolt')
