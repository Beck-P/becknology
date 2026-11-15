"""Arcadia's spaceport — Blender scene (world id "arcadia-spaceport").

  BVENV/bin/python tools/bridge-art/scenes/arcadia_spaceport.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-spaceport

East of the neon street, the District ends in a spaceport (tag L0): a concourse along the buildings — customs with its
scanner arch, the Last Burn (the spacers' bar), the Core Express (the deep lift through every level of the city: down
to the Undercity and the Sump, up to the Mid-Levels and the Spires), Halcyon Freight and its departures board, the
Loop's Spaceport station under its viaduct, the Spacer's Rest, the engine shop — and in front, over a wet concrete
apron, the berths: the Old Mercy, a battered bulk hauler with her ramp down and cargo spilling off it; the Halcyon IX,
a corporate container carrier under a gantry crane; the Slow Hazard, small and rusty; and the air cab rank on its pad.
Floodlight masts, fuel lines, crates and drums, puddles, the railing over the drop.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_cyber as Y               # noqa: E402
import assets_district as D            # noqa: E402
import assets_signs as S               # noqa: E402
import assets_dock as K                # noqa: E402
import assets_oldquarter as O          # noqa: E402
import assets_spaceport as P           # noqa: E402
import assets_arcadia_rich as AR       # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-spaceport'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 72, 30
RF = 9.0           # the buildings' faces; doors on row 8; the concourse rows 9-13
LINE = 13.9        # the crew line: the apron beyond, rows 14-27
RAIL = 28.0
VZ, VR = 5.0, 6.2

k = Kit(COLS, ROWS, margin_top=2.8, margin_bottom=0.6, seed=2207)
st = D.Street()
rng = k.rng

# ---- the ground: the concourse's tiles, the crew line, the apron's slabs ------------------------------------------------
gr = random.Random(22070)                                       # the ground's own dice: the buildings keep theirs
k.wet = dict(AR.WET, apron=0.4, deck=0.25)
AR.paving(k, -0.5, RF, 7.0, LINE, size=1.0, tones=('#26222e', '#2a2632', '#221e2a', '#2c2834'), seam='#0c0a10', rng=gr)   # the street's forecourt slabs
AR.paving(k, 7.0, RF, COLS + 0.5, LINE, rng=gr)                 # then the street's own paving along the concourse
AR.tactile(k, -0.5, COLS + 0.5, LINE - 0.42, LINE - 0.12)
P.apron(k, -0.5, LINE, COLS + 0.5, RAIL)
k.box(-0.5, LINE - 0.05, 0.0, COLS + 0.5, LINE + 0.07, 0.006, P.STRIPE, 'floor_paint')
for x in [i * 1.2 + 0.3 for i in range(60)]:
    k.box(x, LINE + 0.1, 0.0, x + 0.6, LINE + 0.14, 0.006, P.STRIPE, 'floor_paint')
K.floor_text(k, 'CREW AND CARGO BEYOND THIS LINE', 'RussoOne', 30.0, LINE + 0.45, 0.22, '#d8c890')
for x in [1.0 + i * 3.0 for i in range(24)]:                                          # bollards along the line, gaps between
    if x in (25.0, 40.0, 58.0):
        continue
    k.cyl(x, LINE - 0.15, 0.0, 0.55, 0.09, ('#2a2834', 0.06), 'bollard', verts=10)
    k.cyl(x, LINE - 0.15, 0.4, 0.47, 0.095, P.STRIPE, 'bollard_band', emit=(P.STRIPE, 0.3), verts=10)
    k.solid_post(x, LINE - 0.15)
P.bay_marks(k, 1.2, 15.0, 22.0, 26.4, 'BAY 1')
P.bay_marks(k, 25.0, 15.0, 48.0, 26.4, 'BAY 2')
P.bay_marks(k, 59.6, 18.2, 71.0, 26.6, 'BAY 3')
for (x0_, x1_, r0_, r1_) in ((1.2, 22.0, 15.0, 26.4), (25.0, 48.0, 15.0, 26.4), (59.6, 71.0, 18.2, 26.6)):
    P.landing_lights(k, x0_ + 0.4, x1_ - 0.4, r0_ - 0.25)
    P.landing_lights(k, x0_ + 0.4, x1_ - 0.4, r1_ + 0.25, cols=(Y.CYAN, '#2a8aff'))
AR.hazard_stripes(k, 52.0, 15.6, 56.0, 16.2)
AR.hazard_stripes(k, 52.0, 20.6, 56.0, 21.2)
for (x, r, rx, ry, c) in ((6.0, 11.2, 0.6, 0.25, Y.PINK), (16.4, 12.4, 0.7, 0.28, '#ffb050'), (24.6, 11.0, 0.5, 0.2, Y.CYAN),
                          (33.2, 12.2, 0.8, 0.3, '#ffb030'), (44.6, 11.4, 0.6, 0.24, Y.CYAN), (52.0, 12.6, 0.5, 0.2, Y.PURP),
                          (63.0, 11.6, 0.7, 0.26, '#ff8040'), (4.4, 24.8, 0.9, 0.3, '#ffe0a0'), (23.6, 20.4, 0.7, 0.26, '#fff0d0'),
                          (49.6, 23.6, 0.8, 0.3, '#ffe0a0'), (56.0, 26.2, 0.6, 0.22, Y.CYAN), (40.4, 25.6, 0.9, 0.3, '#ff9a40'),
                          (14.6, 26.0, 0.7, 0.25, '#ffb050'), (68.6, 17.0, 0.5, 0.2, '#fff0d0')):
    Y.puddle(k, x, r, rx, ry, tint=c)
for x in (8.0, 31.0, 53.0):
    D.steam_grate(k, st, x, 11.8)
Y.manhole(k, 19.0, 12.0)
Y.manhole(k, 48.0, 11.4)

# ---- the Loop's viaduct along the back, in and out of the Core's tower --------------------------------------------------
O.viaduct(k, -0.5, COLS + 0.5, VR, VZ, piers=(3.2, 33.6, 52.6, 64.0), gaps=((36.9, 45.5),))

# ---- along the concourse ---------------------------------------------------------------------------------------------------
D.frontage(k, st, -0.5, 4.0, RF, floors=4, kind='glass', trim=Y.PINK, door_x=1.8, glow='#6a3a8a', sign_floor=True,
           roof=('tank', 'antenna'), wall='#2e2836', clad='tile', window_neon=Y.PINK, rng=rng)
S.blade(k, '宇宙港', 'DelaGothicOne', 3.85, RF, 1.5, 1.6, col=Y.CYAN_L, w=0.42)
# customs: a wide hall of frosted panels, a scanner arch at its door, the inspector beside it
D.frontage(k, st, 4.0, 14.0, RF, floors=3, kind='clinic', trim=Y.CYAN, door_x=9.0, door_w=1.2, glow='#4a9ab0', sign_floor=True,
           roof=('dish', 'vent', 'antenna'), wall='#3e4858', clad='metal', rng=rng)
S.letters(k, 'CUSTOMS', 'RussoOne', 9.0, RF, 1.55, size=0.46, col='#d0f8ff', energy=8)
S.lightbox(k, 'ARRIVALS  L0', 'RussoOne', 5.9, RF + 0.02, 2.75, 2.6, 0.34, bg='#e8f4ff', ink='#0c2a50', glow='#a0e0ff')
S.lightbox(k, 'DEPARTURES', 'RussoOne', 12.0, RF + 0.02, 2.75, 2.6, 0.34, bg='#e8f4ff', ink='#0c2a50', glow='#a0e0ff')
S.blade(k, '税関', 'DelaGothicOne', 4.15, RF, 1.6, 1.4, col=Y.CYAN, w=0.4)
for xs in (8.25, 9.75):                                                                # the scanner arch
    k.box(xs - 0.1, RF + 0.3, 0.0, xs + 0.1, RF + 0.62, 2.0, ('#c8ccd8', 0.06), 'scanner_post')
    k.box(xs - 0.02 + (0.1 if xs < 9 else -0.12), RF + 0.32, 0.2, xs + 0.02 + (0.1 if xs < 9 else -0.12), RF + 0.6, 1.8,
          '#0c2a20', 'scanner_light', emit=(Y.GREEN, 0.85))
    k.solid_post(xs, RF + 0.46)
k.box(8.15, RF + 0.3, 2.0, 9.85, RF + 0.62, 2.2, ('#c8ccd8', 0.06), 'scanner_top')
k.box(8.4, RF + 0.6, 2.04, 9.6, RF + 0.63, 2.16, '#0c2a20', 'scanner_light', emit=(Y.GREEN, 0.85))
# the Last Burn: a bar built out of an old ship's hull plates, portholes, a rocket in neon, drums and crates outside
D.frontage(k, st, 14.0, 21.0, RF, floors=2, kind='club', trim='#ff7a30', door_x=17.0, door_w=0.9, glow='#ff8a40', sign_floor=True,
           roof=('vent', 'tank'), wall='#4a3a30', clad='metal', rng=rng)
D.portholes(k, 14.4, 20.6, RF, 0.75, col='#ffb060', n=5)
S.neon(k, 'THE LAST BURN', 'Audiowide', 17.6, RF, 1.55, size=0.34, col='#ff8a40', board='#140c08')
S._tubes(k, [(20.2, 1.45), (20.45, 2.1), (20.7, 1.45), (20.2, 1.45)], RF + 0.02, '#80e0ff')            # a rocket, its flame
S._tubes(k, [(20.3, 1.45), (20.45, 1.2), (20.6, 1.45)], RF + 0.02, '#ff7a30')
for (x, r) in ((15.2, 10.6), (19.4, 10.6)):                                             # drum tables, crates to sit on
    k.cyl(x, r, 0.0, 0.85, 0.3, ('#7a4a2a', 0.08), 'drum_table', verts=14)
    k.cyl(x, r, 0.85, 0.9, 0.32, '#5a3a20', 'drum_lid', verts=14)
    k.cyl(x, r, 0.2, 0.26, 0.305, '#3a2418', 'drum_band', verts=14)
    k.cyl(x + 0.1, r - 0.05, 0.9, 1.08, 0.05, '#e8b030', 'pint', emit=('#ffc040', 0.2), verts=8)
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
    for dx in (-0.75, 0.75):
        K.crate(k, x + dx, r + 0.05, s=0.42, col='#5a4a32')
# the Core Express: the deep lift's tower, as wide as a street, rising out of sight; its lobby doors and the floor board
CX0, CX1 = 21.0, 30.0
k.box(CX0, 2.6, 0.0, CX1, RF - 0.6, 10.5, ('#3a3a48', 0.08), 'core_tower')
k.box(CX0, RF - 0.6, 2.4, CX1, RF, 10.5, ('#42424e', 0.08), 'core_tower')
for x in [CX0 + 0.5 + i * 1.0 for i in range(9)]:
    k.box(x - 0.06, RF, 2.4, x + 0.06, RF + 0.06, 10.5, '#2a2a36', 'core_rib')
for z in (3.2, 5.0, 7.6, 9.4):
    k.box(CX0 + 0.2, RF + 0.0, z, CX1 - 0.2, RF + 0.06, z + 0.18, '#c8e8f0', 'core_band', emit=(Y.CYAN_L, 0.55))
k.box(CX0 + 0.3, RF - 0.6, 0.0, CX1 - 0.3, RF - 0.58, 2.4, ('#22222c', 0.08), 'core_lobby_back')
k.box(CX0, RF - 0.6, 0.0, CX0 + 0.3, RF, 2.4, ('#42424e', 0.08), 'core_tower')
k.box(CX1 - 0.3, RF - 0.6, 0.0, CX1, RF, 2.4, ('#42424e', 0.08), 'core_tower')
k.box(CX0 + 0.3, RF - 0.6, 0.0, CX1 - 0.3, RF, 0.02, ('#5a5a66', 0.08), 'floor_lobby')
for (dx0, dx1) in ((CX0 + 0.8, CX0 + 2.4), (CX1 - 2.4, CX1 - 0.8)):                       # passenger doors, lit at their seams
    k.box(dx0, RF - 0.58, 0.0, dx1, RF - 0.55, 1.9, ('#8a8e9a', 0.04), 'lift_door')
    k.box((dx0 + dx1) / 2 - 0.02, RF - 0.55, 0.0, (dx0 + dx1) / 2 + 0.02, RF - 0.53, 1.9, '#0c2a30', 'lift_seam', emit=(Y.CYAN, 0.9))
    k.box(dx0 - 0.06, RF - 0.56, 1.9, dx1 + 0.06, RF - 0.52, 2.0, '#0c2a30', 'lift_lamp', emit=(Y.CYAN, 0.9))
FX0, FX1 = CX0 + 3.0, CX1 - 3.0                                                            # the freight door, striped
k.box(FX0, RF - 0.58, 0.0, FX1, RF - 0.55, 2.2, ('#6a6a72', 0.06), 'freight_door')
k.boxes([(FX0, RF - 0.55, z, FX1, RF - 0.54, z + 0.05) for z in [0.15 + i * 0.16 for i in range(13)]], '#4a4a52', 'freight_rib')
for i in range(8):
    k.bar(FX0 + i * 0.4, RF - 0.53, FX0 + i * 0.4 + 0.3, RF - 0.53, 0.0, 0.25, 0.04, P.STRIPE if i % 2 == 0 else '#1a1a1e', 'freight_stripe')
S.letters(k, 'CORE EXPRESS', 'Audiowide', (CX0 + CX1) / 2, RF + 0.06, 2.62, size=0.42, col=Y.CYAN_L, energy=10)
S.lightbox(k, 'ALL LEVELS  B60 - L480', 'RussoOne', (CX0 + CX1) / 2, RF + 0.06, 4.05, 5.2, 0.4, bg='#0c1a24', ink='#80e0ff', glow='#2a6a8a')
S.blade(k, '昇降機', 'DelaGothicOne', CX1 - 0.25, RF, 2.4, 1.8, col=Y.CYAN, w=0.42)
k.point_light((CX0 + CX1) / 2, RF + 0.8, 1.8, '#a0e8ff', 34, radius=0.8, group='flicker')
k.solid(CX0, 2.6, CX1, RF)
# Halcyon Freight: a roll-up door on a lit loading office, and the departures board up its face
D.frontage(k, st, 30.0, 37.2, RF, floors=3, kind='garage', trim=P.STRIPE, door_x=31.0, door_w=0.8, glow='#c8a050', sign_floor=True,
           roof=('dish',), wall='#2a2e3a', clad='metal', windows=False, rng=rng)
S.lightbox(k, 'HALCYON FREIGHT', 'Audiowide', 33.6, RF + 0.02, 1.48, 3.8, 0.4, bg='#f0e8c8', ink='#2a2a32', glow='#ffe0a0')
k.box(31.0, RF + 0.02, 2.0, 36.4, RF + 0.1, 3.75, '#0a0a10', 'board_frame')
for i in range(6):
    z = 3.48 - i * 0.26
    k.box(31.15, RF + 0.1, z, 36.25, RF + 0.11, z + 0.16, '#1a1004', 'board_line', emit=(('#ffb030', '#ffb030', '#ff6030')[i % 3], 0.85))
k.point_light(33.7, RF + 0.8, 2.9, '#ffb040', 16, radius=0.6, group='flicker')
# the Loop's Spaceport station
O.station_block(k, 37.2, 45.2, RF, VZ, name='SPACEPORT', depth=RF - VR + 0.4, vr_=VR)
# the Spacer's Rest: capsule bunks stacked five high, vending machines at its door
D.frontage(k, st, 45.2, 55.0, RF, floors=5, kind='glass', trim=Y.PURP, door_x=50.0, glow='#3a4a9a', sign_floor=True,
           roof=('tank', 'antenna'), wall='#2a2838', clad='tile', windows=False, rng=rng)
D.capsule_wall(k, 45.5, 54.7, RF, 1.47, 1.35 + 4 * 1.15 - 0.05, rng=rng)
S.lightbox(k, 'SPACER\'S REST', 'RussoOne', 50.0, RF + 0.02, 1.48, 3.6, 0.4, bg='#c8c0ff', ink='#1a0a40', glow='#a080ff')
Y.vending_machine(k, 46.4, RF + 0.02, w=0.8)
Y.vending_machine(k, 47.4, RF + 0.02, w=0.8, body='#183040')
k.solid(45.9, RF, 47.9, RF + 0.7)
# the engine shop: a hangar door wide open on a ship's engine on its stand, a welder's light
D.frontage(k, st, 55.0, COLS + 0.5, RF, floors=3, kind='garage', trim='#ff7a30', door_x=56.0, door_w=0.8, glow='#ff9a50',
           sign_floor=True, roof=('vent', 'tank', 'dish'), wall='#34302e', clad='metal', rng=rng)
S.lightbox(k, 'ENGINE SHOP', 'RussoOne', 62.0, RF + 0.02, 1.48, 3.4, 0.4, bg='#ffe0c0', ink='#4a1a08', glow='#ffb070')
k.cyl_x(58.4, 61.0, RF + 0.55, 0.7, 0.55, 0.55, ('#5a5a64', 0.06), 'engine', verts=16)
k.cyl_x(61.0, 61.4, RF + 0.55, 0.7, 0.45, 0.45, '#0c1a2a', 'engine_throat', emit=('#3a7ae0', 0.35), verts=16)
for x in (58.6, 60.8):
    k.box(x - 0.1, RF + 0.2, 0.0, x + 0.1, RF + 0.9, 0.25, '#2a2a30', 'engine_stand')
k.sphere(59.4, RF + 1.0, 0.9, 0.06, 0.06, '#e0f0ff', 'weld_spark', emit=('#c0e0ff', 1.0), segs=6)
k.point_light(59.4, RF + 1.2, 0.9, '#a0c8ff', 22, radius=0.05, group='flicker')
k.solid(58.2, RF, 61.5, RF + 1.1)

# ---- the berths ------------------------------------------------------------------------------------------------------------
P.hauler(k, 3.0, 19.4, L=15.0, name='OLD MERCY', reg='OM-7741')
k.solid(3.6, 15.0, 17.7, 17.0)                       # the strip behind her: her hull stands over it on screen (you'd vanish)
k.solid(3.0 + 15 * 0.36, 20.9, 3.0 + 15 * 0.6, 22.7)                                        # her ramp and what spilled off it
k.solid(3.0 + 15 * 0.36 - 0.6, 22.2, 3.0 + 15 * 0.36 + 2.6, 23.0)
K.fuel_cells(k, 19.6, 24.2)
k.solid(19.0, 23.8, 20.2, 24.6)
for (x, r) in ((1.6, 16.0), (1.9, 16.8), (2.6, 16.2)):                                       # oil drums
    k.cyl(x, r, 0.0, 0.6, 0.22, (rng.choice(('#3a5a7a', '#7a3a2a', '#3a3a42')), 0.08), 'drum', verts=12)
    k.solid(x - 0.25, r - 0.25, x + 0.25, r + 0.25)

P.container_ship(k, 27.0, 18.8, L=17.0, name='HALCYON IX')
K.gantry(k, 29.6, 42.4, 15.6, 22.0, h=5.6, hook=(35.0, 22.0, 3.6))
for (x, r, col, z) in ((45.6, 22.6, '#2a6ab0', 0.0), (45.6, 22.6, '#c83a2a', 0.9), (45.6, 24.2, '#3a8a4a', 0.0), (47.2, 22.6, '#e0a020', 0.0)):
    K.container(k, x, r, 1.4, 1.2, 0.9, col, z0=z, code='HLX')
k.solid(45.6, 22.6, 48.6, 25.4)
K.loader(k, 26.2, 23.6)
k.solid(25.6, 23.0, 26.8, 24.2)

P.cab_pad(k, 54.0, 18.4)
P.cab(k, 54.0, 18.4, z=0.3)
k.box(57.0, 15.9, 0.0, 57.8, 16.6, 1.9, ('#e8b830', 0.06), 'cab_rank')                     # the cab rank's kiosk and sign
k.box(57.05, 16.6, 1.0, 57.75, 16.62, 1.6, '#141c2c', 'cab_rank_screen', emit=('#ffd860', 0.7))
S.letters(k, 'AIR CAB', 'RussoOne', 57.4, 16.62, 1.92, size=0.24, col='#ffd860', energy=5)
k.solid(57.0, 15.9, 57.8, 16.6)
P.hauler(k, 61.4, 21.8, L=8.6, hull='#6a7068', trim='#2a2e30', name='SLOW HAZARD', reg='SH-0013', ramp_at=(0.4, 0.75))
k.solid(62.0, 18.0, 69.7, 20.0)                      # likewise behind her
k.solid(61.4 + 8.6 * 0.4, 23.3, 61.4 + 8.6 * 0.75, 25.1)

for (x, r) in ((23.6, 15.6), (49.4, 15.6), (23.6, 27.0), (57.8, 27.0), (0.4, 27.0), (71.4, 17.4)):
    P.floodlight(k, x, r)
AR.floodlight(k, 51.4, 18.4, h=1.8, energy=30)                                          # the cab pad's own
AR.windsock(k, 58.6, 15.6)
for (x, r, z) in ((29.8, 15.8, 5.7), (42.2, 15.8, 5.7), (CX0 + 0.3, RF - 0.4, 10.55), (CX1 - 0.3, RF - 0.4, 10.55)):
    P.beacon(k, x, r, z)
for (x0_, x1_, r_) in ((1.0, 21.0, 27.4), (25.0, 47.0, 27.4)):                                # fuel lines along the apron's foot
    k.cyl_x(x0_, x1_, r_, 0.14, 0.09, 0.09, ('#8a2a1a', 0.08), 'fuel_line', verts=10)
    k.cyl_x(x0_, x1_, r_ + 0.22, 0.12, 0.07, 0.07, ('#3a3a44', 0.08), 'fuel_line', verts=10)
    for x in range(int(x0_) + 1, int(x1_), 3):
        k.box(x - 0.08, r_ - 0.12, 0.0, x + 0.08, r_ + 0.34, 0.28, '#2a2a30', 'fuel_clamp')
k.solid(1.0, 27.2, 21.0, 27.8)
k.solid(25.0, 27.2, 47.0, 27.8)
for (x, r) in ((14.0, 16.0), (21.0, 17.2), (48.6, 16.6), (52.0, 21.6), (58.2, 24.8)):
    K.crate(k, x, r, s=0.5, col=rng.choice(('#5a4a32', '#3a5a6a', '#6a3a2a')))
    k.solid(x - 0.25, r - 0.25, x + 0.25, r + 0.25)
for (x, r) in ((22.2, 21.0), (48.0, 19.4)):
    K.tie_down(k, x, r)
Y.street_railing(k, -0.5, COLS + 0.5, RAIL)

# ---- the middle apron (bay 2's open front): its own lights, its stand markings, the small life of a working berth ---------
# (the look-over found it dark and plain: big slabs under one lamp pool). Its own dice, so nothing above moves.
_dice = rng.getstate()
ar = random.Random(22071)


def apron_mast(x, r, h=4.6, aim=-2.2, energy=260, col='#fff0d0'):
    """A floodlight mast like the others, its lamps turned back over the berth: the pool falls on the apron, not the rail."""
    k.cyl(x, r, 0.0, 0.2, 0.22, '#2a2a32', 'mast_base', verts=10)
    for (dx, dr) in ((-0.07, -0.07), (0.07, -0.07), (0.0, 0.07)):
        k.tube((x + dx, r + dr, 0.2), (x + dx * 0.5, r + dr * 0.5, h), 0.025, '#5a5a66', 'mast', verts=4)
    for i in range(6):
        z = 0.5 + i * (h - 0.6) / 6
        k.tube((x - 0.07, r - 0.07, z), (x + 0.07, r - 0.07, z + 0.3), 0.012, '#5a5a66', 'mast_brace', verts=3)
    k.box(x - 0.4, r - 0.12, h, x + 0.4, r + 0.12, h + 0.3, '#2a2a32', 'mast_head')
    for i in range(4):
        k.box(x - 0.35 + i * 0.18, r - 0.14, h + 0.04, x - 0.21 + i * 0.18, r - 0.1, h + 0.26, shade(col, 0.6), 'mast_lamp',
              emit=(col, 1.0))
    k.point_light(x, r + aim, h - 0.4, col, energy, radius=0.4)
    k.sphere(x, r, h + 0.42, 0.07, 0.07, Y.RED, 'mast_beacon', emit=(Y.RED, 1.0), segs=8)
    k.solid_post(x, r)


apron_mast(31.4, 27.0)
apron_mast(41.0, 27.0)
for x in (29.6, 42.4):                                  # work lamps under the gantry's near beam, lighting its legs' feet
    k.box(x - 0.3, 22.14, 4.9, x + 0.3, 22.4, 5.12, '#2a2a32', 'gantry_lamp_head')
    k.box(x - 0.24, 22.4, 4.94, x + 0.24, 22.42, 5.08, '#fff0d0', 'gantry_lamp', emit=('#fff0d0', 0.95))
    k.point_light(x + (1.6 if x < 36 else -1.6), 23.2, 4.2, '#ffe8c8', 120, radius=0.3)
# stand markings: a lead-in line down the berth's middle, a stop bar with its stand number, aircraft-style tee marks
for x in [25.8 + i * 1.0 for i in range(22)]:
    k.box(x, 23.92, 0.0, x + 0.55, 24.04, 0.006, P.STRIPE, 'floor_paint')
k.box(36.94, 22.6, 0.0, 37.06, 25.6, 0.006, P.STRIPE, 'floor_paint')                       # the stop bar across it
k.box(36.5, 22.6, 0.0, 37.5, 22.72, 0.006, P.STRIPE, 'floor_paint')
K.floor_text(k, 'STAND 2A', 'RussoOne', 33.6, 25.05, 0.4, '#d8c890')
K.floor_text(k, 'STAND 2B', 'RussoOne', 41.8, 25.05, 0.4, '#d8c890')
for x in (28.2, 45.0):                                                                   # arrows: in from either end
    s = 1 if x < 36 else -1
    k.bar(x, 23.98, x + s * 1.1, 23.98, 0.0, 0.006, 0.12, P.STRIPE, 'floor_paint')
    k.bar(x + s * 1.1, 23.98, x + s * 0.75, 23.7, 0.0, 0.006, 0.1, P.STRIPE, 'floor_paint')
    k.bar(x + s * 1.1, 23.98, x + s * 0.75, 24.26, 0.0, 0.006, 0.1, P.STRIPE, 'floor_paint')
for (x, r) in ((27.0, 21.0), (34.0, 21.0), (39.0, 21.0)):                                # tie-downs along the hull's foot
    K.tie_down(k, x, r)
# the small life: a tug and its baggage cart parked off the line, pallets and gas by the loader, a tool chest by the gantry
TX, TR = 38.6, 25.3
k.box(TX, TR - 0.32, 0.12, TX + 0.9, TR + 0.32, 0.5, ('#e0b020', 0.06), 'tug_body', bevel=0.04)
k.box(TX + 0.5, TR - 0.28, 0.5, TX + 0.88, TR + 0.28, 0.82, '#1a2230', 'tug_cab', emit=('#2a3a50', 0.25), bevel=0.03)
k.box(TX - 0.02, TR - 0.33, 0.3, TX + 0.9, TR + 0.33, 0.36, '#1a1a1e', 'tug_stripe')
for (dx, dr) in ((0.18, -0.34), (0.72, -0.34), (0.18, 0.34), (0.72, 0.34)):
    k.cyl_y(TX + dx, TR + dr - 0.05, TR + dr + 0.05, 0.13, 0.13, 0.13, '#18181c', 'tug_wheel', verts=10)
k.sphere(TX + 0.92, TR - 0.18, 0.4, 0.04, 0.04, '#fff2d0', 'tug_lamp', emit=('#fff2d0', 1.0), segs=6)
k.sphere(TX + 0.92, TR + 0.18, 0.4, 0.04, 0.04, '#fff2d0', 'tug_lamp', emit=('#fff2d0', 1.0), segs=6)
k.bar(TX - 0.4, TR, TX, TR, 0.18, 0.22, 0.05, '#3a3a40', 'tug_towbar')
CX_ = TX - 1.6                                                                            # the cart: a flatbed of cases
k.box(CX_, TR - 0.32, 0.18, CX_ + 1.2, TR + 0.32, 0.26, ('#4a4a54', 0.08), 'cart_bed')
for (dx, dr) in ((0.15, -0.34), (1.05, -0.34), (0.15, 0.34), (1.05, 0.34)):
    k.cyl_y(CX_ + dx, TR + dr - 0.04, TR + dr + 0.04, 0.09, 0.09, 0.09, '#18181c', 'cart_wheel', verts=8)
for (dx, dr, w_, h_, c_) in ((0.05, -0.28, 0.5, 0.36, '#3a5a7a'), (0.6, -0.26, 0.5, 0.3, '#6a3a2a'), (0.1, 0.02, 0.42, 0.28, '#5a4a32'),
                             (0.6, 0.06, 0.54, 0.4, '#2a4a3a'), (0.2, -0.2, 0.3, 0.2, '#7a6a4a')):
    z0 = 0.26 if h_ > 0.21 else 0.62
    k.box(CX_ + dx, TR + dr, z0, CX_ + dx + w_, TR + dr + 0.24, z0 + h_, (c_, 0.1), 'cargo_case', bevel=0.02)
k.solid(CX_ - 0.05, TR - 0.4, TX + 0.95, TR + 0.4)
AR.pallets(k, 27.4, 24.7, n=3)
AR.gas_bottles(k, 28.6, 25.2, n=3, col='#2a6ab0')
k.solid(28.45, 25.05, 29.25, 25.35)
TB = 43.4                                                                                 # a rolling tool chest, a hose reel
k.box(TB, 22.75, 0.08, TB + 0.6, 23.15, 0.78, ('#c83a2a', 0.08), 'tool_chest', bevel=0.02)
for i in range(4):
    k.box(TB + 0.04, 23.15, 0.16 + i * 0.15, TB + 0.56, 23.16, 0.26 + i * 0.15, '#8a2a1a', 'tool_drawer')
    k.box(TB + 0.22, 23.16, 0.2 + i * 0.15, TB + 0.38, 23.18, 0.22 + i * 0.15, '#c8c8d0', 'tool_handle')
k.box(TB + 0.1, 22.85, 0.78, TB + 0.42, 22.95, 0.82, '#5a5a66', 'spanner')
k.solid(TB, 22.75, TB + 0.6, 23.15)
k.cyl_x(TB + 0.9, TB + 1.3, 23.0, 0.42, 0.38, 0.38, ('#2a2a30', 0.06), 'hose_reel', verts=14)
k.cyl_x(TB + 0.94, TB + 1.26, 23.0, 0.42, 0.33, 0.33, '#a02a1a', 'hose_coil', verts=14)
k.solid(TB + 0.85, 22.7, TB + 1.35, 23.3)
AR.cones(k, ((32.2, 22.7), (33.4, 22.7), (34.6, 22.7)))
for (x, r) in ((32.2, 22.7), (33.4, 22.7), (34.6, 22.7)):
    k.solid_post(x, r)
for (x, r, rx, ry) in ((30.6, 23.0, 0.7, 0.24), (40.2, 22.4, 0.6, 0.22)):                # puddles catch the new lamps
    Y.puddle(k, x, r, rx, ry, tint='#ffe8c8')
rng.setstate(_dice)

# ---- light --------------------------------------------------------------------------------------------------------------
for (x, c) in ((6.0, '#a060ff'), (17.0, '#ff8a40'), (26.0, '#60c0ff'), (35.0, '#ffb040'), (42.0, '#80d0ff'), (51.0, '#a080ff'),
               (62.0, '#ff9a50')):
    k.point_light(x, 11.5, 3.0, c, 36, radius=1.0)
for x in (2.0, 6.5, 11.5, 15.5, 19.0, 32.0, 35.5, 48.0, 52.5, 57.0, 66.0):                  # warm light out of the windows
    k.point_light(x, RF + 0.6, 1.4, '#ffc080', 12, radius=0.6, group='flicker')
k.area_light(COLS / 2, 6.0, 14.0, '#7058b8', 1400 * COLS / 44, COLS + 2.0, rot=(math.radians(-35), 0, 0))
k.area_light(COLS / 2, 21.0, 9.0, '#5a68a8', 700 * COLS / 44, COLS + 2.0, rot=(math.radians(-20), 0, 0))     # the city's glow on the apron
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.8}}, light_samples=128, world_light=('#241a40', 0.45))

# ---- the world -------------------------------------------------------------------------------------------------------------
def dialog(x, y, label, prompt, text):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = {'name': 'The Spaceport', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
     'spawns': {'player': [1, 11]}, 'shipExit': False, 'tiles': [], 'collisions': [], 'tileNames': {},
     'interactions': [
         {'x': 0, 'y': 11, 'type': 'enter_world', 'target': 'arcadia-street', 'spawn': [58, 10], 'label': 'THE NEON STREET',
          'prompt': 'PRESS E TO WALK ON'},
         dialog(9, 8, 'CUSTOMS', 'PRESS E TO LOOK',
                'CUSTOMS · ARRIVALS AND DEPARTURES · L0\n\nA SCREEN OVER THE DESK: "DECLARE ALL SPORES, LIVESTOCK, WEAPONS, '
                'SENTIENT CARGO AND GRUDGES." SOMEONE HAS ADDED "AND RAMEN" IN MARKER.'),
         dialog(11, 9, 'INSPECTOR HALLORAN', 'PRESS E TO TALK', 'THE INSPECTOR WAVES A SCANNER WAND AT NOTHING IN PARTICULAR.'),
         {'x': 17, 'y': 8, 'type': 'vendor', 'label': 'THE LAST BURN', 'prompt': 'PRESS E TO ORDER',
          'items': [{'id': 'reactor_stout', 'price': 8}, {'id': 'void_fizz', 'price': 6}, {'id': 'spacer_stew', 'price': 12}]},
         dialog(19, 8, 'BRANNIGAN', 'PRESS E TO TALK', 'THE BARKEEP POLISHES A GLASS WITH A RAG THAT HAS SEEN THINGS.'),
         {'x': 25, 'y': 8, 'type': 'express_lift', 'shaft': 'core', 'lobby': 'spaceport', 'label': 'CORE EXPRESS',
          'prompt': 'PRESS E TO CALL THE LIFT'},
         dialog(34, 8, 'DEPARTURES BOARD', 'PRESS E TO READ',
                'HALCYON FREIGHT · DEPARTURES\n\nOLD MERCY ....... LUMAR ...... LOADING\nHALCYON IX ...... ENIGMA ..... ON TIME\n'
                'SLOW HAZARD ..... ??? ........ DELAYED\nKESTREL 2 ....... VERDANCE ... CANCELLED\n\nTHE LAST LINE FLICKERS: "CREW '
                'WANTED. ASK FOR DESH."'),
         {'x': 41, 'y': 8, 'type': 'loop_station', 'station': 'spaceport', 'label': 'THE LOOP', 'prompt': 'PRESS E TO TAKE THE LOOP'},
         dialog(50, 8, 'SPACER\'S REST', 'PRESS E TO LOOK',
                'CAPSULES STACKED FIVE HIGH, A LADDER UP EACH COLUMN. "ONE NIGHT, ONE BUNK, NO QUESTIONS, NO PETS (THE '
                'CAT IS NOT A PET, THE CAT IS STAFF)."'),
         dialog(57, 9, 'ENGINE SHOP', 'PRESS E TO LOOK',
                'A FREIGHTER\'S ENGINE ON A STAND, ITS THROAT STILL GLOWING A LITTLE. A WELDER\'S ARC SPITS BLUE. NOBODY LOOKS UP.'),
         dialog(10, 23, 'OLD MERCY', 'PRESS E TO LOOK',
                'A BULK HAULER, FIFTY YEARS OLD AND HELD TOGETHER WITH PATCHES. HER RAMP IS DOWN AND HER CARGO IS COMING OFF IT '
                'THE QUICK WAY. SOMEONE HAS PAINTED A SMALL CAT BY HER REGISTRY.'),
         dialog(13, 23, 'CAPTAIN DESH', 'PRESS E TO TALK', 'THE OLD MERCY\'S CAPTAIN IS COUNTING CRATES AND LOSING.'),
         dialog(36, 21, 'HALCYON IX', 'PRESS E TO LOOK',
                'A CONTAINER CARRIER IN HALCYON\'S WHITE AND YELLOW, TOO CLEAN BUT FOR HER SCORCHED BELLY. THE GANTRY SWINGS A '
                'CONTAINER OFF HER BACK EVERY FEW MINUTES WITHOUT ANYONE TOUCHING IT.'),
         dialog(65, 26, 'SLOW HAZARD', 'PRESS E TO LOOK',
                'SMALL, RUSTY, AND SURE OF HERSELF. "DESTINATION: ???" ON THE BOARD. HER CAPTAIN IS NOWHERE AND HER RAMP IS OPEN.'),
         {'x': 57, 'y': 17, 'type': 'air_cab', 'pad': 'spaceport', 'label': 'AIR CAB', 'prompt': 'PRESS E TO HAIL A CAB'},
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
for (c, r) in ((11, 9), (19, 8), (13, 23)):
    k.solid(c, r, c + 1, r + 1)
apply_world(WORLD, k, (0, int(RF), COLS - 1, int(RAIL) - 1), scene_id=WID,
            actors=[{'sheet': 'npc-halloran', 'x': 11, 'y': 9, 'facing': 'down'},
                    {'sheet': 'npc-brannigan', 'x': 19, 'y': 8, 'facing': 'down'},
                    {'sheet': 'npc-desh', 'x': 13, 'y': 23, 'facing': 'left'}],
            scene_extra={'backdrop': True, 'steam': st.steam})
w = json.load(open(WORLD))
w['view'] = [-0.5, -3.8, COLS + 0.5, ROWS + 0.4]
w['loop'] = {'track': [37.2, 45.2, VR, round(0.3625 + 0.7071 * (VZ + 0.17), 2)]}   # js/transit.js: her rails on ours
w['cameraLead'] = -4.0                                          # frame above you: the viaduct and her train over the roofs
w['skyline'] = {'baseRow': 3.6, 'railRow': RAIL + 0.3, 'centerCol': COLS / 2,
                'rain': {'drops': 170, 'splash': [0, RF + 0.3, COLS, RAIL - 0.2]}}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('spaceport done')
