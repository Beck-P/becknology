"""Look Book 2 diorama: Arcadia, Rainline Street — a purpose-made Blender scene in the game's kit (scenekit, the District
and cyber kits, real-typeface neon), built to be framed as one screen: five storefronts with stacked floors over a wet
street, after the rain.

  BVENV/bin/python tools/bridge-art/dioramas/arcadia_rainline.py OUT && python3 tools/bridge-art/scene_post.py OUT OUT/post

(Arcadia is always night: no live light, the toy finish on its own light state.)
Tile units: x = column, r = row (toward the camera), z = height. The shopfronts' faces stand at row RF; the far
pavement runs to the kerb, then the road, the near kerb and a strip of near pavement with its clutter.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from scenekit import Kit, shade  # noqa: E402
import assets_cyber as Y          # noqa: E402
import assets_district as D       # noqa: E402
import assets_signs as SG         # noqa: E402
import assets_city as CITY        # noqa: E402
import bpy                         # noqa: E402

OUT = sys.argv[1]
COLS, ROWS = 17, 11
RF = 5.6                    # the shopfronts' faces
KERB, ROAD0, ROAD1, KERB2 = 6.6, 6.75, 9.0, 9.15
C45 = math.cos(math.radians(45))

k = Kit(COLS, ROWS, margin_top=1.2, margin_bottom=0.4, seed=4711)
st = D.Street()
rng = k.rng


# ---- the ground: pavements, kerbs, the road, its paint, puddles -------------------------------------------------------
Y.tile_floor(k, -0.5, 3.2, COLS + 0.5, KERB, tones=('#3c3848', '#363242'), size=0.5, seam='#141020')
k.box(-0.5, KERB, 0.0, COLS + 0.5, ROAD0, 0.08, ('#4e4a5a', 0.08), 'kerb', bevel=0.012)
k.box(-0.5, ROAD0 - 0.005, 0.0, COLS + 0.5, ROAD0 + 0.06, 0.004, '#c8a838', 'road_paint')            # the yellow kerb line
k.box(-0.5, ROAD0, -0.06, COLS + 0.5, ROAD1, 0.0, ('#1d1a27', 0.16), 'road')
for x in [i * 1.2 + 0.2 for i in range(15)]:                                                       # the centre line
    k.box(x, 7.84, 0.0, x + 0.62, 7.9, 0.004, '#bca63c', 'road_paint')
for i in range(7):                                                                                  # the crosswalk
    r = ROAD0 + 0.12 + i * 0.31
    k.box(13.3, r, 0.0, 15.1, r + 0.16, 0.004, ('#d6d6de', 0.12), 'crosswalk')
k.box(-0.5, ROAD1, 0.0, COLS + 0.5, KERB2, 0.08, ('#4e4a5a', 0.08), 'kerb', bevel=0.012)
Y.tile_floor(k, -0.5, KERB2, COLS + 0.5, ROWS + 0.4, tones=('#3c3848', '#363242'), size=0.5, seam='#141020')
for (x, r, rx, ry, c) in ((2.9, 8.45, 0.75, 0.24, Y.PINK), (8.4, 7.35, 0.5, 0.18, Y.CYAN), (11.6, 8.55, 0.85, 0.22, Y.YEL),
                          (5.1, 6.25, 0.38, 0.13, Y.CYAN), (15.6, 9.85, 0.5, 0.16, Y.PINK), (6.6, 8.75, 0.35, 0.12, '#a070ff')):
    Y.puddle(k, x, r, rx, ry, tint=c)
D.steam_grate(k, st, 10.6, 7.95)
Y.manhole(k, 5.3, 8.4)
k.box(-0.5, KERB - 0.07, 0.0, COLS + 0.5, KERB - 0.02, 0.006, '#2a2634', 'gutter')
for x in (1.8, 7.9, 12.4):
    k.boxes([(x + i * 0.09, KERB - 0.12, 0.004, x + i * 0.09 + 0.05, KERB - 0.02, 0.008) for i in range(5)], '#14121c', 'drain')


# ---- behind the low bar: a tower, so the gap over its roof shows more city, not nothing -----------------------------
CITY.tower(k, 6.4, 10.2, 3.4, 7.5, depth=1.4, wall='#242236', tiers=2, lit=0.5, neon=Y.MAG, crown='antenna', rng=rng,
           style='strips')


# ---- A: the noodle bar (x -0.4..3.8): brick, an open counter under a red roof, lanterns, steam ------------------------
H = D.frontage(k, st, -0.6, 3.9, RF, floors=3, wall='#3a2a2e', trim=Y.RED, kind='stall', glow='#ff9a50', clad='brick',
               sign_floor=True, roof=('tank', 'vent'), door_x=3.25, rng=rng)
SG.neon(k, 'Ramen', 'Pacifico', 2.0, RF + 0.04, 1.66, size=1.0, col=Y.PINK, board='#14080e', energy=9, tube=0.024)
SG.icon_bowl(k, 0.6, RF + 0.04, 1.56, s=0.56, col='#ffb050')
SG.blade(k, 'ラーメン', 'DelaGothicOne', 3.78, RF, 1.6, 1.5, col='#ff7a50', w=0.42)
# the counter on the pavement: lacquered red front, a wooden top, the stock pot steaming, bowls, stools
k.box(0.9, RF + 0.35, 0.0, 2.9, RF + 0.72, 0.9, ('#7a1a1e', 0.08), 'counter', bevel=0.02)
k.box(0.86, RF + 0.3, 0.9, 2.94, RF + 0.78, 0.97, ('#8a5a30', 0.14), 'counter_top', bevel=0.01)
k.box(0.9, RF + 0.72, 0.06, 2.9, RF + 0.74, 0.1, shade(Y.PINK, 0.4), 'counter_neon', emit=(Y.PINK, 0.8))
Y.stock_pot(k, 1.25, RF + 0.52, z=0.97)
for x in (2.0, 2.45):
    Y.bowl(k, x, RF + 0.55, 0.97)
for x in (1.15, 1.75, 2.35):
    Y.neon_stool(k, x, RF + 0.98, seat='#d83040')
n = 7                                                                                                   # a noren over the counter
for i in range(n):
    xx = 0.85 + i * 2.1 / n
    k.box(xx, RF + 0.06, 1.12, xx + 2.1 / n - 0.03, RF + 0.08, 1.42, ('#e8dcc0' if i % 2 else '#a02a2a', 0.06), 'noren')
k.box(0.8, RF + 0.04, 1.42, 3.0, RF + 0.1, 1.46, '#3a2414', 'noren_rod')
for x in (0.45, 1.15, 1.85, 2.55, 3.25):                                                                # lanterns along the eave
    Y.paper_lantern(k, x, RF + 0.16, 2.2, col=('#e03030' if x != 1.85 else '#f0a030'), s=0.36, top=2.42)
k.box(0.2, RF + 0.1, 2.42, 3.6, RF + 0.2, 2.46, '#2a1a12', 'lantern_line')
D.ac_unit(k, 0.4, RF, 2.75)
D.ac_unit(k, 3.0, RF, 3.6)
k.box(3.05, RF + 0.35, 0.0, 3.55, RF + 0.62, 0.62, ('#2a1a14', 0.1), 'a_board', bevel=0.01)          # an A-frame menu
k.box(3.08, RF + 0.62, 0.08, 3.52, RF + 0.63, 0.56, '#1a0c10', 'a_board_face', emit=('#ff9a60', 0.35))


# ---- B: the 24-hour mart (x 3.8..7.0): bright white shop, four storeys, a balcony with washing -----------------------
H = D.frontage(k, st, 3.9, 6.9, RF, floors=4, wall='#3a3a4a', trim=Y.CYAN, kind='glass', glow='#cfe6ff', clad='tile',
               sign_floor=True, roof=('dish', 'antenna'), door_x=4.7, rng=rng)
D.balcony(k, 4.05, 5.55, RF + 0.05, 1.35 + 2 * 1.15 + 0.05, rng=rng)       # on the third storey, clear of the sign
SG.lightbox(k, '24H', 'RussoOne', 5.1, RF + 0.02, 1.44, 1.7, 0.8, bg='#f4f8ff', ink='#c81830', size=0.72, energy=8)
SG.blade(k, 'コンビニ', 'DelaGothicOne', 6.75, RF, 2.25, 1.5, col=Y.CYAN, w=0.4)
Y.vending_machine(k, 6.35, RF + 0.02, w=0.8)
k.box(4.05, RF + 0.02, 0.0, 4.35, RF + 0.3, 0.55, ('#2a5a8a', 0.1), 'newsbox', bevel=0.02)
k.box(4.07, RF + 0.3, 0.3, 4.33, RF + 0.31, 0.5, '#0c1830', 'newsbox_screen', emit=('#80c0ff', 0.6))
for i, x in enumerate((5.2, 5.5)):                                                                   # crates of fruit outside
    k.box(x, RF + 0.08, 0.0, x + 0.28, RF + 0.4, 0.22, ('#8a6a3a', 0.12), 'crate', bevel=0.01)
    for j in range(3):
        k.sphere(x + 0.06 + j * 0.08, RF + 0.24, 0.24, 0.045, 0.04, ('#e84030', '#e8c040')[i], 'fruit', segs=6)


# ---- C: the bar (x 7.0..9.6), two storeys set back, a holo-ad on its roof ----------------------------------------------
RB = RF - 0.45
H = D.frontage(k, st, 6.9, 9.4, RB, floors=2, wall='#1e1a2c', trim=Y.MAG, kind='glass', glow='#7a2aa0', clad='metal',
               sign_floor=True, roof=(), door_x=8.75, rng=rng, ad=(7.1, 9.2, 1.15, 0))
SG.letters(k, 'BAR', 'Monoton', 8.2, RB + 0.04, 1.5, size=0.95, col=Y.PINK, energy=10)
SG._tubes(k, [(7.08, 1.98), (7.5, 1.98), (7.29, 1.7), (7.08, 1.98)], RB + 0.04, Y.CYAN_L)          # a martini glass
SG._tubes(k, [(7.29, 1.7), (7.29, 1.52), (7.18, 1.49), (7.4, 1.49)], RB + 0.04, Y.CYAN_L)
D.poster_wall(k, 9.0, 9.38, RB + 0.01, 0.2, 1.2, rng=rng)
k.box(6.9, RB, 0.0, 9.4, RF, 0.02, ('#2a2434', 0.08), 'floor')                                            # the bar's forecourt
for x in (7.2, 8.0):                                                                                     # rope posts
    k.cyl(x, RF - 0.1, 0.0, 0.6, 0.035, '#c8a040', 'post', verts=8)
    k.sphere(x, RF - 0.1, 0.62, 0.05, 0.05, '#e8c860', 'post_cap', segs=6)
k.tube((7.2, RF - 0.1, 0.52), (8.0, RF - 0.1, 0.52), 0.025, '#a8203a', 'rope', verts=6)


# ---- D: NEKO, shuttered for the night (x 9.6..12.6), graffiti, a fire escape, trash -----------------------------------
H = D.frontage(k, st, 9.4, 12.3, RF, floors=3, wall='#3e2c2a', trim=Y.CYAN, kind='shutter', glow='#3a6080', clad='brick',
               sign_floor=True, roof=('tank',), door_x=11.65, rng=rng)
_n0 = len(k.parts)
D.fire_escape(k, 9.55, 10.75, RF + 0.05, 2, 1.15, base=2.62)              # from the second storey up, clear of the sign
for _p in [p for p in k.parts[_n0:] if p.get('pname') == 'escape_ladder']:
    bpy.data.objects.remove(_p['obj']); k.parts.remove(_p)
for _x in (10.4, 10.6):                                                    # the drop ladder, pulled up under the landing
    k.tube((_x, RF + 0.35, 2.6), (_x, RF + 0.35, 2.22), 0.02, '#22202a', 'escape_ladder', verts=4)
SG.letters(k, 'NEKO', 'Bungee', 10.5, RF + 0.04, 1.48, size=0.92, col=Y.CYAN, energy=9)
cat = [(11.45, 1.58), (11.45, 1.98), (11.58, 1.86), (11.76, 1.86), (11.89, 1.98), (11.89, 1.58), (11.67, 1.48), (11.45, 1.58)]
SG._tubes(k, cat, RF + 0.04, Y.PINK)
SG._tubes(k, [(11.56, 1.74), (11.6, 1.74)], RF + 0.04, Y.PINK, tube=0.03)
SG._tubes(k, [(11.74, 1.74), (11.78, 1.74)], RF + 0.04, Y.PINK, tube=0.03)
for _ in range(2):
    D.graffiti(k, 9.55, 11.4, RF + 0.08, 0.35, 1.05, rng.choice((Y.PINK, Y.YEL, Y.GREEN)), rng=rng)
D.trash_pile(k, 12.0, 6.2, rng=rng)
D.laundry(k, (10.75, RF + 0.3, 3.35), (12.95, RF + 0.3, 3.5), sag=0.22, rng=rng)


# ---- E: the hotel (x 12.6..17.4): five storeys of tile, a lit lobby, a canopy, the red carpet --------------------------
H = D.frontage(k, st, 12.3, 17.4, RF, floors=5, wall='#2e4044', trim='#ffcf80', kind='glass', glow='#ffcf80', clad='tile',
               sign_floor=True, awning=('#ffcf80', 'metal'), roof=('antenna',), door_x=14.0, door_w=1.0, rng=rng)
SG.letters(k, 'HOTEL ARIA', 'Righteous', 14.55, RF + 0.02, 1.56, size=0.56, col='#ffd890', energy=7)
SG.blade(k, 'HOTEL', 'Audiowide', 12.45, RF, 2.1, 2.2, col='#c8a0ff', w=0.44, stand=0.3)
k.box(13.45, RF + 0.18, 0.0, 14.55, KERB - 0.02, 0.012, ('#a01c2c', 0.1), 'carpet')
for x in (13.35, 14.65):
    k.cyl(x, KERB - 0.18, 0.0, 0.55, 0.035, '#d0a840', 'post', verts=8)
    k.sphere(x, KERB - 0.18, 0.57, 0.05, 0.05, '#e8c860', 'post_cap', segs=6)
Y.street_planter(k, 16.2, 6.15, leaf='#2a5048', glow='#ffcf80')


# ---- clutter up the faces: more AC units, small side signs, pipes ----------------------------------------------------
for (x, z) in ((4.35, 2.6), (6.2, 3.75), (6.45, 4.85), (10.0, 2.55), (12.0, 3.75), (13.0, 4.9), (15.8, 3.75), (16.6, 2.6)):
    D.ac_unit(k, x, RF, z)
D.side_signs(k, 3.75, RF + 0.05, 2.5, rng)
D.side_signs(k, 12.15, RF + 0.05, 2.45, rng, cols=(Y.YEL, Y.PINK))
for (x, z0, z1) in ((3.86, 0.0, 3.9), (9.45, 0.0, 3.5), (12.35, 0.0, 6.1)):
    k.cyl(x, RF + 0.08, z0, z1, 0.035, '#4a4a56', 'pipe', verts=8)
    for zz in [z0 + 0.6 + i * 0.9 for i in range(int((z1 - z0) / 0.9))]:
        k.box(x - 0.05, RF + 0.02, zz, x + 0.05, RF + 0.12, zz + 0.05, '#3a3a44', 'pipe_clamp')
D.balcony(k, 14.6, 16.2, RF + 0.05, 3.85, rng=rng)
D.balcony(k, 13.0, 14.2, RF + 0.05, 5.0, rng=rng)
for (x, z) in ((1.2, 3.55), (2.3, 3.55)):                                                     # potted plants on the noodle bar's sills
    k.cyl(x, RF + 0.1, z, z + 0.12, 0.07, '#5a2a20', 'pot', verts=8)
    k.blob(x, RF + 0.1, z + 0.22, 0.12, 0.1, 0.12, ('#3a7a40', 0.2), 'plant', segs=8)


# ---- overhead: cables with string lights, and lines out to the near lamps -----------------------------------------------
_tube = k.tube
def _thick_tube(a, b, ra, albedo, part, **kw):
    if part == 'cable':
        ra = 0.024
    return _tube(a, b, ra, albedo, part, **kw)
k.tube = _thick_tube
D.cable(k, (-0.5, RF + 0.05, 3.35), (3.8, RF + 0.05, 3.15), sag=0.25, lights=('#ffd080', '#ff7ab0', '#80e0ff'), n=9)
D.cable(k, (3.8, RF + 0.05, 3.6), (9.6, RB + 0.05, 2.2), sag=0.2, n=8)
D.cable(k, (9.6, RF + 0.05, 3.3), (17.5, RF + 0.05, 3.7), sag=0.35, lights=('#ffd080', '#80e0ff'), n=12)
D.cable(k, (2.6, RF + 0.05, 3.0), (4.2, KERB2 + 0.3, 2.62), sag=0.35, n=10)
D.cable(k, (11.2, RF + 0.05, 3.2), (12.0, KERB2 + 0.3, 2.62), sag=0.4, lights=('#ff7ab0',), n=10)


# ---- the road: a hover taxi waiting by the noodle bar ---------------------------------------------------------------------
def hover_taxi(cx, cr):
    k.box(cx - 0.9, cr - 0.36, 0.22, cx + 0.9, cr + 0.36, 0.6, ('#e8b830', 0.06), 'taxi_body', bevel=0.12)
    k.cyl_x(cx - 0.98, cx + 0.98, cr, 0.4, 0.34, 0.18, ('#e8b830', 0.06), 'taxi_body', verts=14)
    k.box(cx - 0.5, cr - 0.3, 0.58, cx + 0.32, cr + 0.3, 0.86, '#141c2c', 'taxi_glass', emit=('#2a4060', 0.35), bevel=0.1)
    k.box(cx - 0.46, cr - 0.3, 0.84, cx + 0.28, cr + 0.3, 0.9, ('#e8b830', 0.06), 'taxi_roof', bevel=0.04)
    k.box(cx - 0.12, cr + 0.29, 0.6, cx - 0.08, cr + 0.31, 0.86, '#e8b830', 'taxi_pillar')
    k.box(cx - 0.98, cr + 0.3, 0.42, cx + 0.98, cr + 0.33, 0.46, '#141416', 'taxi_stripe')
    for i in range(10):                                                     # the checker band
        if i % 2:
            k.box(cx - 0.9 + i * 0.18, cr + 0.33, 0.42, cx - 0.72 + i * 0.18, cr + 0.335, 0.46, '#f0f0f0', 'taxi_check')
    k.box(cx - 0.3, cr - 0.08, 0.9, cx + 0.06, cr + 0.08, 1.0, '#2a2a2a', 'taxi_sign_base', bevel=0.01)
    k.box(cx - 0.28, cr + 0.08, 0.91, cx + 0.04, cr + 0.09, 0.99, '#e8c040', 'taxi_sign', emit=('#ffd860', 0.95))
    for s in (-1, 1):                                                       # lift pods underneath, glowing
        k.cyl(cx + s * 0.62, cr, 0.08, 0.2, 0.16, '#2a2a30', 'taxi_pod', verts=14)
        k.cyl(cx + s * 0.62, cr, 0.05, 0.08, 0.13, shade(Y.CYAN, 0.45), 'taxi_pod_glow', emit=(Y.CYAN, 0.95), verts=14)
    for dr in (-0.2, 0.2):
        k.sphere(cx + 0.98, cr + dr, 0.44, 0.06, 0.04, '#fff6e0', 'taxi_head', emit=('#fff2d0', 1.0), segs=8)
        k.sphere(cx - 0.99, cr + dr, 0.46, 0.05, 0.04, '#e83040', 'taxi_tail', emit=('#ff3040', 0.95), segs=8)
    k.point_light(cx, cr + 0.1, 0.06, Y.CYAN, 6, radius=0.3, group='flicker')
    k.point_light(cx + 1.4, cr, 0.4, '#fff0d0', 5, radius=0.2, group='flicker')
    k.solid(cx - 1.05, cr - 0.38, cx + 1.05, cr + 0.38)


hover_taxi(2.45, 7.28)
k.tube = _tube


def hover_van(cx, cr):
    k.box(cx - 1.05, cr - 0.4, 0.22, cx + 1.05, cr + 0.4, 1.12, ('#d8dce4', 0.05), 'van_body', bevel=0.1)
    k.box(cx + 0.55, cr - 0.37, 0.62, cx + 1.06, cr + 0.37, 1.02, '#141c2c', 'van_glass', emit=('#2a4060', 0.3), bevel=0.06)
    k.box(cx - 1.0, cr + 0.39, 0.62, cx + 0.5, cr + 0.41, 0.82, '#2a6ad0', 'van_stripe')
    k.box(cx - 0.9, cr + 0.41, 0.66, cx + 0.3, cr + 0.42, 0.78, '#f0f4ff', 'van_logo', emit=('#c0d8ff', 0.4))
    for s in (-1, 1):
        k.cyl(cx + s * 0.65, cr, 0.08, 0.2, 0.17, '#2a2a30', 'van_pod', verts=14)
        k.cyl(cx + s * 0.65, cr, 0.05, 0.08, 0.14, shade(Y.PINK, 0.45), 'van_pod_glow', emit=(Y.PINK, 0.9), verts=14)
    for dr in (-0.24, 0.24):
        k.sphere(cx + 1.06, cr + dr, 0.45, 0.06, 0.05, '#fff6e0', 'van_head', emit=('#fff2d0', 0.9), segs=8)
        k.sphere(cx - 1.07, cr + dr, 0.5, 0.05, 0.05, '#e83040', 'van_tail', emit=('#ff3040', 0.95), segs=8)
    for x in (cx - 0.8, cx - 0.35, cx + 0.1):                               # a roof rack, vents, a light bar
        k.box(x, cr - 0.34, 1.12, x + 0.05, cr + 0.34, 1.18, '#5a5e6a', 'van_rack')
    k.box(cx - 0.85, cr - 0.34, 1.16, cx + 0.15, cr - 0.3, 1.2, '#5a5e6a', 'van_rack')
    k.box(cx - 0.85, cr + 0.3, 1.16, cx + 0.15, cr + 0.34, 1.2, '#5a5e6a', 'van_rack')
    k.box(cx - 0.7, cr - 0.2, 1.18, cx - 0.2, cr + 0.15, 1.3, ('#3a5a8a', 0.1), 'van_crate', bevel=0.02)
    k.box(cx + 0.3, cr - 0.25, 1.12, cx + 0.5, cr + 0.25, 1.17, '#3a3e48', 'van_vent')
    k.box(cx + 0.58, cr - 0.3, 1.12, cx + 0.66, cr + 0.3, 1.17, '#1a1a20', 'van_lightbar')
    k.box(cx + 0.585, cr - 0.28, 1.17, cx + 0.655, cr - 0.02, 1.19, '#ff3050', 'van_light', emit=('#ff3050', 0.8))
    k.box(cx + 0.585, cr + 0.02, 1.17, cx + 0.655, cr + 0.28, 1.19, '#3070ff', 'van_light', emit=('#3070ff', 0.8))
    k.box(cx - 1.06, cr - 0.3, 0.3, cx - 1.04, cr + 0.3, 1.0, '#9aa0aa', 'van_door_seam')
    k.point_light(cx, cr + 0.1, 0.06, Y.PINK, 5, radius=0.3, group='flicker')
    k.solid(cx - 1.05, cr - 0.4, cx + 1.05, cr + 0.4)


hover_van(10.9, 7.3)
for (x, r) in ((10.05, 8.25), (11.15, 8.35), (10.6, 8.55)):
    k.cone(x, r, 0.0, 0.42, 0.11, 0.02, ('#e86020', 0.06), 'cone', verts=10)
    k.cyl(x, r, 0.18, 0.24, 0.075, '#f0f0f0', 'cone_band', verts=10)
    k.box(x - 0.13, r - 0.13, 0.0, x + 0.13, r + 0.13, 0.03, '#2a2a30', 'cone_base')


# ---- the near pavement: lamps, bollards, a planter, bins, a bike ------------------------------------------------------------
Y.street_lamp(k, 4.2, KERB2 + 0.3, col=Y.PINK)
Y.street_lamp(k, 12.0, KERB2 + 0.3, col=Y.CYAN)
for x in (6.4, 7.1, 7.8, 13.0, 13.6):
    k.cyl(x, KERB2 + 0.22, 0.0, 0.5, 0.075, ('#2a2834', 0.06), 'bollard', verts=10)
    k.cyl(x, KERB2 + 0.22, 0.36, 0.42, 0.078, '#e8c040', 'bollard_band', emit=('#e8c040', 0.25), verts=10)
    k.sphere(x, KERB2 + 0.22, 0.5, 0.075, 0.04, '#3a3846', 'bollard_cap', segs=8)
    k.solid_post(x, KERB2 + 0.22)
Y.street_planter(k, 9.5, KERB2 + 0.75)
Y.trash_can(k, 10.75, KERB2 + 0.6)
k.cyl(11.3, KERB2 + 0.62, 0.0, 0.7, 0.22, ('#3a6a4a', 0.06), 'recycler', verts=12)
k.cyl(11.3, KERB2 + 0.62, 0.7, 0.77, 0.24, '#2a4434', 'recycler_lid', verts=12)


def bicycle(cx, cr, col='#d03040'):
    for s in (-1, 1):
        x = cx + s * 0.36
        k.cyl_y(x, cr - 0.02, cr + 0.02, 0.24, 0.24, 0.24, '#141418', 'bike_tyre', verts=18)
        k.cyl_y(x, cr - 0.025, cr + 0.025, 0.24, 0.17, 0.17, '#4a4a54', 'bike_rim', verts=18)
        k.cyl_y(x, cr - 0.03, cr + 0.03, 0.24, 0.04, 0.04, '#9a9aa4', 'bike_hub', verts=8)
    for a, b in (((cx - 0.36, 0.24), (cx - 0.02, 0.24)), ((cx - 0.02, 0.24), (cx + 0.2, 0.55)), ((cx - 0.36, 0.24), (cx - 0.12, 0.55)),
                 ((cx - 0.12, 0.55), (cx + 0.2, 0.55)), ((cx - 0.12, 0.55), (cx - 0.02, 0.24)), ((cx + 0.2, 0.55), (cx + 0.36, 0.24))):
        k.tube((a[0], cr, a[1]), (b[0], cr, b[1]), 0.022, col, 'bike_frame', verts=6)
    k.tube((cx + 0.2, cr, 0.55), (cx + 0.24, cr, 0.7), 0.02, '#3a3a44', 'bike_stem', verts=5)
    k.tube((cx + 0.24, cr - 0.16, 0.7), (cx + 0.24, cr + 0.16, 0.7), 0.018, '#3a3a44', 'bike_bars', verts=5)
    k.box(cx - 0.2, cr - 0.05, 0.6, cx - 0.04, cr + 0.05, 0.64, '#1a1a1e', 'bike_seat', bevel=0.01)
    k.tube((cx - 0.12, cr, 0.55), (cx - 0.12, cr, 0.6), 0.015, '#3a3a44', 'bike_post', verts=4)
    k.solid_post(cx, cr)


bicycle(14.75, KERB2 + 0.5)
bicycle(15.55, KERB2 + 0.5, col='#2a8ad0')
k.box(14.2, KERB2 + 0.3, 0.0, 16.1, KERB2 + 0.35, 0.55, '#3a3a44', 'bike_rack')

k.render(OUT, light_states={'full': {}}, light_samples=48)
