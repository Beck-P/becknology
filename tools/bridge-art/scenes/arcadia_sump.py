"""The Sump — Arcadia's drowned original ground, at the very bottom (Blender scene).

  BVENV/bin/python tools/bridge-art/scenes/arcadia_sump.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-sump

The street the city was first built on, flooded: black water in canals between the towers' drowned feet, the old shops
along the back with the tide line half way up their doors, four quays joined by footbridges. The stair down from the
Warrens at the top left; Old Teo's noodle boat tied up on the main canal; the drowned shrine on its island of steps in
the north-east, its gate standing in the water; the freight lift; the old Central station's entrance in the south-east,
purple light and a bassline coming up the steps (the rave). Teal glow under the water, a few sodium lamps still
burning, drips everywhere. Scavenger drones, sump eels and husks; once a day the Dredge. World: arcadia-sump, 84 x 40.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_under as U                    # noqa: E402
import assets_cyber as Y                    # noqa: E402
import assets_district as D                 # noqa: E402
import assets_signs as S                    # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-sump'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 84, 40
RF = 8.0
TEAL = '#40e0c0'
WZ = U.WATER_Z

k = Kit(COLS, ROWS, margin_top=0.0, margin_bottom=0.5, seed=8484)
dr = U.Drips()
rng = k.rng

# ---- land and water: four quays, the canals between, bridges over them -------------------------------------------------------
LAND = [(-0.5, RF - 0.2, 40.0, 19.0), (44.0, RF - 0.2, COLS + 0.5, 19.0), (-0.5, 23.0, 40.0, 36.0), (44.0, 23.0, COLS + 0.5, 36.0)]
WATER = [(-0.5, 19.0, COLS + 0.5, 23.0), (40.0, RF - 0.2, 44.0, 19.0), (40.0, 23.0, 44.0, 36.0), (-0.5, 36.0, COLS + 0.5, ROWS + 1.0)]
for (x0, r0, x1, r1) in LAND:
    k.box(x0, r0, -1.6, x1, r1, -0.04, ('#2e2e32', 0.1), 'quay')
    U.concrete(k, x0, r0, x1, r1, tones=('#34363a', '#30323a', '#383a3e', '#2e3034'), rng=rng)
    k.box(x0, r1 - 0.12, -0.02, x1, r1 + 0.03, 0.05, ('#4a4c50', 0.1), 'quay_kerb')                      # its near kerb
    if x1 < COLS:                                                                                       # its east face over the N-S canal
        k.box(x1 - 0.12, r0, -0.02, x1 + 0.03, r1, 0.05, ('#4a4c50', 0.1), 'quay_kerb')
    if x0 > 0:
        k.box(x0 - 0.03, r0, -0.02, x0 + 0.12, r1, 0.05, ('#4a4c50', 0.1), 'quay_kerb')
for (x0, r0, x1, r1) in WATER:
    U.canal(k, x0, r0, x1, r1, glow='#1a9a8a', rng=rng)
    k.box(x0, r0 - 0.01, WZ - 0.05, x1, r0 + 0.005, WZ + 0.3, ('#1e3a2a', 0.3), 'quay_slime')            # slime and the tide line on
    k.box(x0, r0 - 0.008, WZ + 0.3, x1, r0 + 0.004, WZ + 0.45, ('#2a2a26', 0.2), 'quay_tide')              # the far bank's face
for (x0, r0, x1, r1) in ((-0.5, 19.0, 40.0, 23.0), (44.0, 19.0, COLS + 0.5, 23.0)):                        # ladders down the far faces
    for x in [x0 + 5 + i * 9 for i in range(int((x1 - x0) / 9))]:
        for z in [WZ + i * 0.16 for i in range(5)]:
            k.box(x - 0.15, r0, z, x + 0.15, r0 + 0.08, z + 0.025, '#5a3a2a', 'quay_ladder')
BRIDGES = [(9.5, 19.0, 12.5, 23.0), (29.5, 19.0, 32.5, 23.0), (61.5, 19.0, 64.5, 23.0), (40.0, 12.0, 44.0, 15.0), (40.0, 28.0, 44.0, 31.0)]


def footbridge(x0, r0, x1, r1):
    """Steel plates on girders over the water, a rail each side, rust bleeding from the bolts."""
    along_x = (x1 - x0) > (r1 - r0)
    k.box(x0, r0, -0.08, x1, r1, 0.0, ('#4a4a50', 0.1), 'floor_bridge')
    if along_x:
        k.boxes([(x, r0, -0.02, x + 0.04, r1, 0.004) for x in [x0 + 0.5 + i * 0.5 for i in range(int((x1 - x0) / 0.5) - 1)]], '#3a3a40', 'floor_bridge_seam')
        for r in (r0 + 0.05, r1 - 0.05):
            k.tube((x0, r, 0.9), (x1, r, 0.9), 0.025, '#6a6a70', 'bridge_rail', verts=5)
            for x in (x0 + 0.1, (x0 + x1) / 2, x1 - 0.1):
                k.cyl(x, r, 0.0, 0.9, 0.025, '#5a5a60', 'bridge_post', verts=5)
        k.box(x0, r0, -0.4, x1, r0 + 0.2, -0.08, '#3a3a40', 'girder'); k.box(x0, r1 - 0.2, -0.4, x1, r1, -0.08, '#3a3a40', 'girder')
    else:
        k.boxes([(x0, r, -0.02, x1, r + 0.04, 0.004) for r in [r0 + 0.5 + i * 0.5 for i in range(int((r1 - r0) / 0.5) - 1)]], '#3a3a40', 'floor_bridge_seam')
        for x in (x0 + 0.05, x1 - 0.05):
            k.tube((x, r0, 0.9), (x, r1, 0.9), 0.025, '#6a6a70', 'bridge_rail', verts=5)
            for r in (r0 + 0.1, (r0 + r1) / 2, r1 - 0.1):
                k.cyl(x, r, 0.0, 0.9, 0.025, '#5a5a60', 'bridge_post', verts=5)
        k.box(x0, r0, -0.4, x1, r1, -0.08, '#3a3a40', 'girder')


for b in BRIDGES:
    footbridge(*b)

# ---- the back: the old street's shopfronts, drowned to the knee; the towers' feet ----------------------------------------------
for (a, b) in ((-0.5, 18.4), (22.6, 44.0), (48.2, 69.0), (73.2, COLS + 0.5)):
    U.shanty(k, dr, a, b, RF, 9, top=11.5, base=1.8, rng=rng, lit=0.18, signs=False)
    x = a
    while x < b - 1.0:                                                                  # the old ground storey: shutters, a door, a window
        w = min(rng.uniform(2.0, 3.4), b - x)
        if rng.random() < 0.5:
            U.shutter_front(k, x + 0.2, x + w - 0.2, RF, h=1.6, up=rng.choice((0.0, 0.3, 0.6)), col=rng.choice(('#4a4a50', '#5a4a3a')))
        else:
            k.box(x + 0.2, RF - 0.3, 0, x + w - 0.2, RF, 1.7, ('#2a2e30', 0.1), 'front_wall')
            k.box(x + 0.4, RF - 0.05, 0.3, x + w - 0.4, RF - 0.02, 1.4, '#0c1014', 'window_glass', emit=(TEAL, rng.choice((0.0, 0.0, 0.15))))
        k.box(x, RF + 0.005, 0.0, x + w, RF + 0.01, 0.35, ('#1e3a2a', 0.3), 'tide_mark')                  # where the water stood
        x += w
    k.box(a, RF - 0.05, 1.7, b, RF + 0.2, 1.8, '#1e1c24', 'awning_ledge')
for cx in (20.5, 46.1, 71.1):
    U.column(k, dr, cx, RF + 0.35, w=3.0, d=2.6, top=13.0, posters=False, rng=rng)
    k.box(cx - 1.55, RF + 0.36, 0.0, cx + 1.55, RF + 0.38, 1.2, ('#1e3a2a', 0.35), 'column_slime')

# the stair down from the Warrens, against the back wall at the top left
U.stair_up(k, 1.2, 6.8, RF, 3.6, col='#4a4852')
k.box(6.8, RF - 0.06, 3.6, 8.0, RF + 0.02, 5.2, '#14121a', 'door_frame')
k.box(6.9, RF - 0.1, 3.6, 7.9, RF - 0.07, 5.1, shade('#ffc070', 0.45), 'doorway', emit=('#ffc070', 0.7))
S.lightbox(k, 'UP: THE WARRENS', 'RussoOne', 3.6, RF + 0.02, 2.1, 3.0, 0.4, bg='#2a1a08', ink='#ffb050', size=0.24, energy=5)
k.solid(1.2, RF, 8.0, RF + 0.9)

# ---- the noodle boat on the main canal, Teo's stool on the quay ------------------------------------------------------------------
U.sampan(k, 16.0, 20.0, l=3.2, col='#6a3a1a')
Y.stock_pot(k, 17.1, 20.0, z=WZ + 0.22)
dr.vent(17.1, 20.0, WZ + 0.7)
for x in (14.8, 15.4):
    Y.bowl(k, x, 20.0, WZ + 0.22)
for x in (14.6, 16.2, 17.6):
    Y.paper_lantern(k, x, 19.7, WZ + 1.45, col='#e03030', s=0.26, top=WZ + 1.75)
k.tube((14.4, 19.7, WZ + 1.75), (17.8, 19.7, WZ + 1.75), 0.008, '#14121a', 'lantern_line', verts=3)
S.lightbox(k, 'LAKSA', 'RussoOne', 16.0, 18.9, 1.3, 1.6, 0.32, bg='#ffe0a0', ink='#8a1a10', size=0.22, energy=4)
for x in (15.2, 16.8):
    k.cyl(x, 18.9, 0.0, 1.3, 0.02, '#5a5a60', 'sign_post', verts=4)
k.cyl(13.4, 18.4, 0.0, 0.42, 0.18, ('#d83040', 0.08), 'plastic_stool', verts=10)
U.bollard(k, 13.0, 18.7)
U.bollard(k, 19.0, 18.7)
k.tube((13.0, 18.7, 0.3), (14.6, 20.0, WZ + 0.3), 0.012, '#8a7a5a', 'mooring_line', verts=4)
k.tube((19.0, 18.7, 0.3), (17.6, 20.0, WZ + 0.3), 0.012, '#8a7a5a', 'mooring_line', verts=4)
for (x, r) in ((26.0, 21.2), (52.0, 20.6)):                                       # other boats, dark, tied up
    U.sampan(k, x, r, l=2.4, col='#3a2a1a', roof=False, lamp=None)

# ---- the drowned shrine on its island of steps, its gate standing in the water -----------------------------------------------------
SX, SR = 54.0, 12.0
for i in range(4):                                                                 # the steps
    k.box(SX - 4.0 + i * 0.4, SR - 1.2 + i * 0.3, 0.0, SX + 4.0 - i * 0.4, SR + 3.2 - i * 0.3, 0.12 + i * 0.12, ('#5a5a54', 0.15), 'shrine_step')
k.box(SX - 2.4, SR - 0.9, 0.48, SX + 2.4, SR + 1.6, 2.2, ('#6a2a1e', 0.12), 'shrine_hall', bevel=0.03)
k.box(SX - 0.6, SR + 1.6, 0.48, SX + 0.6, SR + 1.62, 1.9, '#2a0a06', 'shrine_door', emit=('#ffb050', 0.5))
for (lift, w) in ((2.2, 3.4), (2.75, 2.6)):                                         # two roofs, eaves turned up
    k.poly([(SX - w, SR - 1.3, lift), (SX + w, SR - 1.3, lift), (SX + w * 0.6, SR + 0.3, lift + 0.6), (SX - w * 0.6, SR + 0.3, lift + 0.6)], ('#2a3a34', 0.1), 'roof_shrine')
    k.poly([(SX - w * 0.6, SR + 0.3, lift + 0.6), (SX + w * 0.6, SR + 0.3, lift + 0.6), (SX + w, SR + 2.0, lift), (SX - w, SR + 2.0, lift)], ('#34463e', 0.1), 'roof_shrine')
    for s in (-1, 1):
        k.cone(SX + s * w, SR + 2.0, lift - 0.05, lift + 0.25, 0.08, 0.02, '#2a3a34', 'roof_tip', verts=6)
k.sphere(SX, SR + 0.3, 3.5, 0.12, 0.12, '#c89030', 'roof_finial', segs=8)
for i in range(12):                                                                # candles all over the steps
    cx = SX - 3.2 + i * 0.58
    cr = SR + 2.6 - (i % 3) * 0.25
    k.cyl(cx, cr, 0.48 - 0.12 * (i % 3), 0.62 - 0.12 * (i % 3), 0.03, '#e8e0d0', 'candle', verts=6)
    k.sphere(cx, cr, 0.66 - 0.12 * (i % 3), 0.025, 0.035, '#ff9030', 'candle_flame', emit=('#ffb050', 1.0), segs=5)
k.point_light(SX, SR + 2.8, 0.9, '#ffb050', 30, radius=0.6, group='flicker')
k.point_light(SX, SR + 1.9, 1.3, '#ffb050', 18, radius=0.4, group='flicker')
for s in (-1, 1):                                                                  # stone lanterns
    k.box(SX + s * 3.4 - 0.15, SR + 2.4, 0.0, SX + s * 3.4 + 0.15, SR + 2.7, 0.7, ('#6a6a62', 0.15), 'stone_lantern')
    k.box(SX + s * 3.4 - 0.25, SR + 2.3, 0.7, SX + s * 3.4 + 0.25, SR + 2.8, 1.0, '#5a5a52', 'stone_lantern')
    k.box(SX + s * 3.4 - 0.12, SR + 2.79, 0.75, SX + s * 3.4 + 0.12, SR + 2.8, 0.95, '#3a1a08', 'stone_lantern_glow', emit=('#ffb050', 0.8))
k.solid(SX - 4.0, SR - 1.2, SX + 4.0, SR + 2.0)
# the gate standing in the main canal, its feet in the water
GX, GR = SX, 21.2
for s in (-1, 1):
    k.cyl(GX + s * 1.4, GR, WZ - 0.4, 2.8, 0.13, ('#a02a1e', 0.1), 'torii_post', verts=12)
k.box(GX - 2.0, GR - 0.16, 2.8, GX + 2.0, GR + 0.16, 3.0, ('#a02a1e', 0.1), 'torii_beam')
k.box(GX - 1.6, GR - 0.12, 2.35, GX + 1.6, GR + 0.12, 2.48, ('#a02a1e', 0.1), 'torii_beam')
k.box(GX - 0.25, GR - 0.13, 2.48, GX + 0.25, GR + 0.13, 2.8, '#2a1a12', 'torii_plaque')
k.cyl(GX - 1.4, GR, WZ, WZ + 0.02, 0.4, '#1a3a3a', 'canal_ripple', emit=(TEAL, 0.25), verts=12, ry=0.15)
k.cyl(GX + 1.4, GR, WZ, WZ + 0.02, 0.4, '#1a3a3a', 'canal_ripple', emit=(TEAL, 0.25), verts=12, ry=0.15)

# ---- the freight lift, the old station's entrance (the rave) ---------------------------------------------------------------------
for x0 in (62.0, 64.6):
    k.box(x0 - 0.12, RF - 0.05, 0, x0 + 2.12, RF + 0.08, 1.75, '#1a1c22', 'lift_frame')
    k.box(x0, RF + 0.02, 0, x0 + 2.0, RF + 0.1, 1.6, ('#6a6a5a', 0.1), 'lift_door', bevel=0.01)
    k.boxes([(x0 + 0.1 + i * 0.2, RF + 0.1, 0.1, x0 + 0.2 + i * 0.2, RF + 0.11, 1.5) for i in range(9)], '#c8a030', 'hazard_paint')
k.box(64.2, RF + 0.08, 1.62, 64.6, RF + 0.11, 1.72, '#0a0c10', 'lift_counter', emit=('#ff9040', 0.7))
S.lightbox(k, 'FREIGHT  B60', 'RussoOne', 64.3, RF + 0.02, 1.9, 4.2, 0.4, bg='#d8d0b0', ink='#1a1a10', size=0.26, energy=4)
k.solid(61.8, RF, 66.8, RF + 0.15)
U.stair_down(k, dr, 70.0, 74.0, 29.0, 32.6, depth=2.4, glow='#c060ff', label='CENTRAL')
k.solid(69.8, 29.1, 74.2, 32.8)
S.neon(k, 'RAVE', 'Monoton', 72.0, 28.5, 1.8, size=0.4, col='#c060ff', energy=12)
for (x, r) in ((69.4, 28.6), (74.6, 28.6)):
    k.cyl(x, r, 0, 0.9, 0.08, '#2a2a30', 'speaker_post', verts=8)
    k.box(x - 0.3, r - 0.25, 0.9, x + 0.3, r + 0.25, 1.6, ('#14121a', 0.08), 'speaker', bevel=0.02)
    k.cyl_y(x, r + 0.25, r + 0.28, 1.25, 0.2, 0.2, '#2a2830', 'cone', verts=12)
    k.solid(x - 0.3, r - 0.25, x + 0.3, r + 0.25)

# ---- the drone nest in the south-west: wreckage, a fallen billboard, cables, nests of scrap ----------------------------------------
k.box(4.0, 26.0, 0.0, 12.0, 28.0, 0.25, ('#2a2a34', 0.1), 'billboard_frame', bevel=0.02)
k.box(4.3, 26.2, 0.25, 11.7, 27.8, 0.27, '#0a0818', 'billboard_face', emit=('#ff3080', 0.15))
k.boxes([(4.5 + i * 0.6, 26.4, 0.27, 4.8 + i * 0.6, 27.6, 0.28) for i in range(12) if i % 3], '#1a0820', 'billboard_dead')
k.solid(4.0, 26.0, 12.0, 28.0)
for (x, r, s) in ((18.0, 28.0, 1.0), (24.0, 32.0, 0.9), (34.0, 26.0, 1.1), (8.0, 33.0, 0.8), (50.0, 32.0, 1.0), (80.0, 27.0, 0.9), (58.0, 26.0, 0.8)):
    U.scrap_ridge(k, x - 1.6 * s, x + 1.6 * s, r, h=1.3 * s, d=1.2, rng=rng)
for (x, r) in ((22.0, 12.0), (34.0, 15.0), (78.0, 14.0), (50.0, 27.0), (14.0, 30.0)):
    U.crates(k, x, r, n=3, rng=rng)
U.barrels(k, 28.0, 10.0, n=3, rng=rng)
U.barrels(k, 66.0, 33.0, n=3, rng=rng)
U.mattress_corner(k, 36.0, 10.4, rng=rng)

# ---- the drowned street's leftovers, and the people who live in them -------------------------------------------------------------
def bus(x0, r):
    """A bus that never left: its shell on the old road, the windows dark or boarded, someone living in the back."""
    k.box(x0, r - 0.55, 0.15, x0 + 5.0, r + 0.55, 1.6, ('#c8a030', 0.2), 'bus', bevel=0.08)
    k.box(x0 + 0.1, r - 0.56, 1.55, x0 + 4.9, r + 0.56, 1.66, ('#a88020', 0.1), 'roof_bus')
    k.box(x0, r + 0.55, 0.15, x0 + 5.0, r + 0.57, 0.45, ('#1e3a2a', 0.3), 'tide_mark')
    for i in range(7):
        lit = i in (5, 6)
        k.box(x0 + 0.3 + i * 0.66, r + 0.56, 0.85, x0 + 0.85 + i * 0.66, r + 0.58, 1.35, '#141820' if not lit else '#3a2a10', 'bus_window',
              emit=('#ffc070', 0.6) if lit else None)
    for x in (x0 + 0.8, x0 + 4.2):
        k.cyl_y(x, r + 0.5, r + 0.6, 0.18, 0.2, 0.2, '#141414', 'bus_wheel', verts=10)
    k.solid(x0, r - 0.55, x0 + 5.0, r + 0.55)


def phone_booth(x, r):
    k.box(x - 0.3, r - 0.3, 0, x + 0.3, r + 0.3, 2.0, ('#a02a2a', 0.15), 'booth', bevel=0.02)
    k.box(x - 0.24, r + 0.3, 0.3, x + 0.24, r + 0.31, 1.7, '#141820', 'booth_glass', emit=('#5cc8d0', 0.15))
    k.box(x - 0.3, r - 0.3, 1.95, x + 0.3, r + 0.3, 2.1, '#2a0a0a', 'booth_sign', emit=('#ffe0a0', 0.5))
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)


def bent_lamp(x, r, lean=0.4):
    k.tube((x, r, 0.0), (x + lean, r, 2.4), 0.05, '#4a4a50', 'old_lamp', verts=6)
    k.tube((x + lean, r, 2.4), (x + lean + 0.5, r, 2.5), 0.04, '#4a4a50', 'old_lamp', verts=6)
    k.box(x + lean + 0.35, r - 0.1, 2.35, x + lean + 0.7, r + 0.1, 2.48, '#2a2a30', 'old_lamp_head')
    k.solid_post(x, r)


for (a0, a1, rb, col) in ((21.0, 23.6, 10.0, '#3a6a6a'), (69.0, 71.6, 10.4, '#6a4a2a'), (76.0, 78.6, 13.6, '#2a5a7a'),
                          (27.0, 29.6, 24.0, '#5a3a5a'), (47.0, 49.6, 24.0, '#3a5a3a'), (77.0, 79.6, 23.6, '#2a5a6a'), (16.0, 18.6, 33.0, '#6a3a2a')):
    U.lean_to(k, a0, a1, rb, rng=rng, col=col)
bus(26.0, 13.8)
bus(55.0, 17.6)
bus(76.0, 34.2)
for (x, r) in ((35.6, 13.4), (59.0, 10.4), (38.4, 25.4), (66.0, 26.2)):
    phone_booth(x, r)
for (x, r, l) in ((12.0, 12.6, 0.5), (31.0, 17.0, -0.4), (45.6, 13.8, 0.6), (74.6, 17.0, -0.5), (3.0, 30.0, 0.5), (56.0, 26.0, -0.4)):
    bent_lamp(x, r, l)
for (x0, rb, kind) in ((9.0, 10.4, 'junk'), (65.0, 12.6, 'tea')):
    U.stall(k, dr, x0, x0 + 3.0, rb, kind=kind, rng=rng)
for (x, r) in ((6.0, 21.0), (36.0, 21.3), (70.0, 21.2), (78.0, 37.4), (14.0, 37.6), (46.0, 37.2), (42.0, 32.6)):   # boats tied up
    U.sampan(k, x, r, l=2.2, col=rng.choice(('#3a2a1a', '#2a3a3a', '#4a3a2a')), roof=rng.random() < 0.5, lamp=U.SODIUM if rng.random() < 0.4 else None)
for (a, b, z) in ((10.0, 30.0, 3.4), (46.0, 66.0, 3.2), (20.0, 38.0, 3.0), (52.0, 80.0, 3.3)):
    D.laundry(k, (a, 9.0 if z > 3.25 else 24.4, z), (b, 9.6 if z > 3.25 else 25.0, z + 0.2), sag=0.5, rng=rng)

# ---- light: teal from under the water, a few sodium lamps still burning, tubes failing, drips ------------------------------------
for (x, r) in ((10.0, 15.0), (26.0, 16.0), (36.0, 30.0), (52.0, 17.0), (68.0, 16.0), (58.0, 31.0), (78.0, 31.0), (6.0, 24.6)):
    U.sodium(k, x, r, z=2.8, energy=45)
for (x, r) in ((16.0, 10.5), (32.0, 11.0), (60.0, 11.0), (78.0, 10.6), (20.0, 26.0), (30.0, 34.0), (48.0, 25.0), (64.0, 26.0)):
    U.fluoro(k, dr, x, r, 3.0, w=1.2, col='#a0ffe8', hang=9.0, energy=18, dead=rng.random() < 0.3)
for (x, r) in ((8.0, 12.0), (24.0, 14.0), (38.0, 17.0), (48.0, 16.0), (70.0, 12.5), (80.0, 18.0), (16.0, 25.0), (28.0, 28.0), (56.0, 29.0),
               (76.0, 25.0), (46.0, 33.0), (12.0, 34.0)):
    U.grate_drip(k, dr, x, r, top=12.0, tint=TEAL)
U.puddles(k, 1, 9, 39, 18, 6, (TEAL, U.SODIUM), rng=rng)
U.puddles(k, 45, 9, 83, 18, 6, (TEAL, U.SODIUM), rng=rng)
U.puddles(k, 1, 24, 39, 35, 6, (TEAL, '#a060e0'), rng=rng)
U.puddles(k, 45, 24, 83, 35, 6, (TEAL, '#a060e0'), rng=rng)
for (x0, r0, x1, r1) in WATER:                                                    # teal light up from the water
    for x in [x0 + 4 + i * 10 for i in range(int((x1 - x0) / 10) + 1)]:
        if x < x1 - 1:
            for r in [r0 + 1.5 + j * 8 for j in range(int((r1 - r0) / 8) + 1)]:
                if r < r1:
                    k.point_light(x, r, WZ + 0.2, TEAL, 10, radius=1.2)
k.area_light(20, 24, 9.0, '#40a0a0', 70, 28.0, rot=(math.radians(35), 0, 0))
k.area_light(62, 24, 9.0, '#40a0a0', 70, 28.0, rot=(math.radians(35), 0, 0))
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.7}}, light_samples=96, world_light=('#22303a', 1.7))

# ---- the world ---------------------------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Sump', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [6, 9]}, 'shipExit': False, 'interior': True})


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': x, 'y': 8, 'type': 'leave_world', 'label': 'STAIRS UP', 'prompt': 'UP TO THE WARRENS', 'leaveTo': 'arcadia-undercity', 'leaveSpawn': [34, 25]}
    for x in (2, 3)] + [
    {'x': 16, 'y': 18, 'type': 'under', 'act': 'boat', 'label': 'NOODLE BOAT', 'prompt': 'PRESS E FOR LAKSA'},
    {'x': 13, 'y': 18, 'type': 'dialog', 'label': 'OLD TEO', 'prompt': 'PRESS E TO TALK', 'dialog': 'OLD TEO NODS AT THE POT.'},
    {'x': 54, 'y': 14, 'type': 'under', 'act': 'shrine', 'label': 'THE SHRINE', 'prompt': 'PRESS E TO BOW'},
    {'x': 51, 'y': 14, 'type': 'dialog', 'label': 'SISTER WEN', 'prompt': 'PRESS E TO TALK', 'dialog': 'SISTER WEN SWEEPS THE STEPS.'},
    {'x': 63, 'y': 8, 'type': 'express_lift', 'shaft': 'core', 'lobby': 'sump', 'label': 'FREIGHT LIFT', 'prompt': 'PRESS E TO CALL THE LIFT'},
    {'x': 65, 'y': 8, 'type': 'express_lift', 'shaft': 'core', 'lobby': 'sump', 'label': 'FREIGHT LIFT', 'prompt': 'PRESS E TO CALL THE LIFT'},
    {'x': 71, 'y': 29, 'type': 'enter_world', 'target': 'arcadia-sump-rave', 'spawn': [16, 4], 'label': 'CENTRAL', 'prompt': 'DOWN TO THE RAVE'},
    {'x': 72, 'y': 29, 'type': 'enter_world', 'target': 'arcadia-sump-rave', 'spawn': [17, 4], 'label': 'CENTRAL', 'prompt': 'DOWN TO THE RAVE'},
    look(54, 21, 'THE GATE', 'A SHRINE GATE STANDING IN THE BLACK WATER UP TO ITS KNEES, RED PAINT STILL ON IT. WHEN THE CITY WAS BUILT ON TOP OF THIS STREET, NOBODY MOVED IT. NOBODY DARED.'),
    look(8, 27, 'BILLBOARD', 'A BILLBOARD FALLEN FROM SOMEWHERE FAR ABOVE: HALCYON - LIVE HIGHER. HALF ITS PIXELS STILL WORK. THE DRONES HAVE NESTED IN THE FRAME.'),
    look(20, 9, 'TIDE LINE', 'THE OLD STREET\'S SHOPFRONTS, A GREEN LINE WAIST HIGH ACROSS EVERY DOOR WHERE THE WATER STOOD FOR YEARS. A SIGN STILL READS: "OPEN 24 HOURS".'),
    look(36, 10, 'SLEEPER', 'SOMEONE LIVES HERE, AT THE BOTTOM OF EVERYTHING: A MATTRESS, A RADIO, A CAN OF SOUP WARMING ON A CANDLE. THEY ARE NOT HOME.'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
for (x0, r0, x1, r1) in WATER:                                                     # the water's not walkable, the bridges are
    for c in range(max(0, int(x0)), min(COLS, int(math.ceil(x1)))):
        for r in range(max(0, int(r0)), min(ROWS, int(math.ceil(r1)))):
            if not any(b[0] <= c + 0.5 <= b[2] and b[1] <= r + 0.5 <= b[3] for b in BRIDGES):
                k.blocked.add((c, r))
for (x, y) in ((13, 18), (51, 14)):
    k.solid(x, y, x + 1, y + 1)
apply_world(WORLD, k, (0, int(RF), COLS - 1, ROWS - 5), doors=[(2, 8), (3, 8)], scene_id=WID,
            actors=[{'sheet': 'npc-teo', 'x': 13, 'y': 18, 'facing': 'down', 'pose': 'sit'}, {'sheet': 'npc-wen', 'x': 51, 'y': 14, 'facing': 'down'}])
w = json.load(open(WORLD))
w['view'] = [-0.5, 0.0, COLS + 0.5, ROWS + 0.5]
w['undercity'] = {'drips': dr.drips, 'tubes': dr.tubes, 'level': 'sump', 'turf': {'rect': [2, 9, 82, 35]}, 'boss': [60, 32],
                  'safe': [[0, 8, 11, 13], [47, 9, 61, 17], [12, 16, 20, 18], [68, 25, 76, 28], [60, 8, 68, 11]], 'comeRound': [54, 16]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('sump done', len(k.parts), 'parts')
