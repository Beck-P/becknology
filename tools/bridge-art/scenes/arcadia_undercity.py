"""The Warrens — the Undercity under the District (Blender scene).

  BVENV/bin/python tools/bridge-art/scenes/arcadia_undercity.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-undercity

Endless night under the city's underside, Kowloon-dense. Along the back, the stacks climb out of the frame between the
District's great columns, and their ground storeys are the Undercity's doors: the steel stair up to the Backs, Mama
Roo's noodle counter, the Hawker Hall's gate, The Drip (a dive bar), Sallow's Chrome (back-alley implants), the Foundry
(an industrial club), the Pit (fights and a bar), a scrap trader, the lift lobby. In front of them a market under
fluorescent tubes and sodium lamps in the steam — stalls under tarps, tables, a drum fire, rain falling in streams
through the grates — and along the front the drain canal, with the stairwell down to the Sump. East, behind chain-link,
the Rust Saints hold their turf, and past it the gate to the scrapyards.

World: arcadia-undercity, 80 x 36 tiles. Its `undercity` block tells js/undercity.js where the rain falls, the steam
rises and the tubes flicker.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_under as U                     # noqa: E402
import assets_cyber as Y                     # noqa: E402
import assets_district as D                  # noqa: E402
import assets_signs as S                     # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'arcadia-undercity.json')
COLS, ROWS = 80, 36
RF = 9.0            # the stacks' ground-storey faces; the plaza from row 9
QY = 30.0           # the quay's edge: the canal beyond
TOP = 13.5          # the stacks run up out of the frame
FENCE_X = 62.0      # the Rust Saints' turf east of this, south of FENCE_R
FENCE_R = 16.6

k = Kit(COLS, ROWS, margin_top=0.0, margin_bottom=0.5, seed=4242)
dr = U.Drips()
rng = k.rng

# ---- the ground: wet concrete, the quay, the canal -------------------------------------------------------------------
U.concrete(k, -0.5, RF - 0.2, COLS + 0.5, QY)
U.quay(k, -0.5, QY - 0.05, COLS + 0.5, QY + 0.25, face='front', rng=rng)
U.canal(k, -0.5, QY + 0.25, COLS + 0.5, ROWS + 1.0, glow='#2a8a6a', rng=rng)
for (x, z) in ((6.0, -0.3), (25.0, -0.25), (47.0, -0.3), (71.0, -0.25)):        # outfall pipes pouring into the canal
    k.cyl_y(x, QY + 0.2, QY + 0.5, z, 0.22, 0.22, ('#4a4a50', 0.1), 'outfall', verts=14)
    k.cyl_y(x, QY + 0.5, QY + 0.52, z, 0.16, 0.16, '#0a0a0c', 'outfall_mouth', verts=14)
    k.poly([(x - 0.13, QY + 0.52, z - 0.05), (x + 0.13, QY + 0.52, z - 0.05), (x + 0.16, QY + 0.7, U.WATER_Z), (x - 0.16, QY + 0.7, U.WATER_Z)],
           '#3a5a5a', 'outfall_water', emit=('#60b0a0', 0.25))
    k.cyl(x, QY + 0.8, U.WATER_Z, U.WATER_Z + 0.01, 0.35, '#2a4a4a', 'foam', emit=('#a0e0d0', 0.2), verts=10, ry=0.15)
for x in [i * 2.0 + 1.0 for i in range(40)]:                                      # a low rail along the quay
    if 32.0 < x < 37.0:
        continue
    k.cyl(x, QY - 0.12, 0.0, 0.85, 0.025, '#5a5a64', 'quay_rail_post', verts=5)
k.tube((-0.5, QY - 0.12, 0.85), (32.4, QY - 0.12, 0.85), 0.022, '#6a6a74', 'quay_rail', verts=5)
k.tube((36.6, QY - 0.12, 0.85), (COLS + 0.5, QY - 0.12, 0.85), 0.022, '#6a6a74', 'quay_rail', verts=5)
for x in (5.0, 17.0, 29.0, 41.0, 53.0, 67.0, 77.0):
    U.drain(k, x, QY - 0.6)

# ---- the back: the stacks and the columns ---------------------------------------------------------------------------
COLUMNS = (37.9, 53.4)
spans = [(-0.5, 36.6), (39.2, 52.1), (54.7, COLS + 0.5)]
for (a, b) in spans:
    U.shanty(k, dr, a, b, RF, 11, top=TOP, base=1.65, rng=rng, lit=0.5)
for cx in COLUMNS:
    U.column(k, dr, cx, RF + 0.35, w=2.6, d=2.4, top=TOP + 2, rng=rng)
k.box(-0.5, RF - 0.05, 1.55, COLS + 0.5, RF + 0.2, 1.65, '#1e1c24', 'awning_ledge')
for (a0, a1) in spans:                                                             # their signs, crowded up the lower floors
    U.stack_signs(k, a0 + 0.6, a1 - 0.6, RF + 0.3, z0=2.4, z1=7.0, rng=rng)

# ---- the ground storeys: what each door is --------------------------------------------------------------------------
G = 1.65


def wall_run(x0, x1, col='#33303a', clad='corrugated'):
    k.box(x0, RF - 0.3, 0, x1, RF, G, (col, 0.1), 'front_wall')
    U._clad(k, x0, x1, RF, 0, G - 0.1, col, clad, rng)


def doorway(x0, x1, glow, depth=0.5, h=1.45, part='doorway'):
    """An opening into somewhere lit: jambs, a dark recess with light spilling from inside, a threshold."""
    k.box(x0 - 0.08, RF - 0.02, 0, x0, RF + 0.06, h + 0.06, '#18161e', 'door_jamb')
    k.box(x1, RF - 0.02, 0, x1 + 0.08, RF + 0.06, h + 0.06, '#18161e', 'door_jamb')
    k.box(x0 - 0.08, RF - 0.02, h, x1 + 0.08, RF + 0.06, h + 0.08, '#18161e', 'door_lintel')
    k.box(x0, RF - depth, 0, x1, RF - depth + 0.03, h, shade(glow, 0.4), part, emit=(glow, 0.75))
    k.box(x0, RF - depth, 0, x1, RF, 0.02, ('#2a2830', 0.1), 'floor_threshold')
    k.point_light((x0 + x1) / 2, RF + 0.35, 0.9, glow, 14, radius=0.3, group='flicker')


# the stair up to the Backs: from the floor at x 0.6 up the face to a door at z 3.3
wall_run(-0.5, 7.4, '#2e2c34', 'plain')
U.stair_up(k, 0.6, 5.8, RF, 3.3, col='#4a4852')
k.box(5.9, RF - 0.06, 3.3, 7.0, RF + 0.02, 5.0, '#14121a', 'door_frame')
k.box(6.0, RF - 0.1, 3.3, 6.9, RF - 0.07, 4.85, shade('#ffc070', 0.45), 'doorway', emit=('#ffc070', 0.8))
k.point_light(6.45, RF + 0.6, 4.5, '#ffb060', 25, radius=0.2, group='flicker')
S.lightbox(k, 'UP: THE BACKS', 'RussoOne', 3.0, RF + 0.02, 2.0, 2.6, 0.42, bg='#2a1a08', ink='#ffb050', size=0.28, energy=6)
U.sodium(k, 6.45, RF, z=5.2, energy=40, face=RF)
D.graffiti(k, 0.2, 2.4, RF + 0.02, 0.2, 1.3, Y.PINK, rng=rng)
k.solid(0.6, RF, 7.0, RF + 0.9)

# Mama Roo's: an open counter in the wall, steam, a red noren, lanterns, stools out front
wall_run(7.4, 13.0, '#3a2a28', 'brick')
k.box(7.9, RF - 0.9, 0, 12.5, RF - 0.05, 1.55, shade('#ffb070', 0.3), 'kitchen_back', emit=('#ffb070', 0.45))
Y.kitchen_back(k, 7.95, 12.45, RF - 0.85)
k.box(7.8, RF - 0.05, 0, 12.6, RF + 0.45, 0.95, ('#7a1a1e', 0.08), 'counter', bevel=0.02)
k.box(7.75, RF - 0.1, 0.95, 12.65, RF + 0.5, 1.0, ('#8a5a30', 0.14), 'counter_top')
Y.stock_pot(k, 8.6, RF + 0.2, z=1.0)
dr.vent(8.6, RF + 0.2, 1.6)
Y.stock_pot(k, 9.3, RF + 0.2, z=1.0)
dr.vent(9.3, RF + 0.2, 1.6)
for x in (10.3, 10.8, 11.4, 12.0):
    Y.bowl(k, x, RF + 0.25, 1.0)
for i in range(9):
    xx = 7.9 + i * 0.52
    k.box(xx, RF + 0.04, 1.15, xx + 0.48, RF + 0.06, 1.5, ('#e8dcc0' if i % 2 else '#a02a2a', 0.06), 'noren')
S.neon(k, "MAMA ROO'S", 'Pacifico', 10.2, RF + 0.04, 2.15, size=0.55, col='#ff7a50', board='#140808', energy=14)
S.icon_bowl(k, 12.5, RF + 0.04, 2.1, s=0.5, col='#ffb050')
for x in (8.1, 9.3, 10.5, 11.7):
    Y.paper_lantern(k, x, RF + 0.3, 1.85, col=('#e03030' if x != 9.3 else '#f0a030'), s=0.34, top=2.12)
for x in (8.4, 9.2, 10.0, 10.8, 11.6, 12.3):
    Y.neon_stool(k, x, RF + 0.95, seat='#d83040')
k.solid(7.8, RF - 0.1, 12.6, RF + 0.5)

# the Hawker Hall: a wide gate, the hall lit gold beyond, a big lit arch sign, lanterns strung across
wall_run(13.0, 22.4, '#2e3438', 'tile')
doorway(15.2, 19.2, '#ffcf80', depth=0.8)
for x in (15.6, 16.6, 17.6, 18.6):                                                # glimpses inside: lanterns, tables
    Y.paper_lantern(k, x, RF - 0.6, 1.15, col='#e03030', s=0.28, top=1.45)
k.box(14.6, RF + 0.02, 1.62, 19.8, RF + 0.18, 2.62, '#14100a', 'arch_sign')
S.letters(k, 'HAWKER HALL', 'RussoOne', 17.2, RF + 0.18, 2.0, size=0.42, col='#ffcf60', energy=14)
S.letters(k, '食街', 'DelaGothicOne', 17.2, RF + 0.18, 1.7, size=0.26, col='#ff6040', energy=4)
S.blade(k, '屋台村', 'DelaGothicOne', 14.2, RF, 1.9, 1.6, col='#ffcf60', w=0.44)
S.blade(k, '美食', 'DelaGothicOne', 20.2, RF, 1.9, 1.3, col='#ff6040', w=0.44)
D.cable(k, (13.2, RF + 0.3, 3.0), (21.8, RF + 0.3, 3.1), sag=0.4, lights=['#ffcf60', '#ff6040'], n=14)
U.sodium(k, 21.6, RF, z=2.7, energy=40, face=RF)

# a shuttered kiosk and a hole-in-the-wall phone repair
wall_run(22.4, 26.0, '#38343e', 'corrugated')
U.shutter_front(k, 22.7, 24.4, RF, h=1.45, up=0.5)
k.box(24.7, RF - 0.2, 0.6, 25.8, RF - 0.17, 1.4, shade('#80c0ff', 0.35), 'kiosk_window', emit=('#80c0ff', 0.6))
k.box(24.6, RF - 0.2, 0.55, 25.9, RF + 0.25, 0.62, '#3a3842', 'kiosk_sill')
for x in (24.8, 25.1, 25.4):
    k.box(x, RF - 0.05, 0.62, x + 0.18, RF + 0.1, 0.94, '#141418', 'phone', bevel=0.01)
    k.box(x + 0.02, RF + 0.1, 0.66, x + 0.16, RF + 0.105, 0.9, '#0c1a28', 'phone_screen', emit=('#60c0ff', 0.6))
S.lightbox(k, 'FIX', 'RussoOne', 25.25, RF + 0.02, 1.62, 0.8, 0.3, bg='#e8f0ff', ink='#1a3060', size=0.22, energy=3)

# The Drip: a dive bar, dark brick, a small door, blue drip neon, a beer sign in a grimy window
wall_run(26.0, 31.4, '#2c2224', 'brick')
doorway(28.2, 29.1, '#4a7aff', depth=0.4, h=1.4)
S.neon(k, 'THE DRIP', 'Righteous', 28.7, RF + 0.04, 1.85, size=0.42, col='#5aa0ff', energy=12)
for (x, z) in ((27.3, 1.75), (30.2, 1.7)):                                      # neon drops
    S._tubes(k, [(x, z + 0.3), (x - 0.1, z + 0.1), (x, z), (x + 0.1, z + 0.1), (x, z + 0.3)], RF + 0.02, '#5aa0ff', tube=0.016)
k.box(26.4, RF - 0.1, 0.55, 27.9, RF - 0.07, 1.3, '#1a1408', 'window_glass', emit=('#ffb040', 0.4))
S.neon(k, 'BEER', 'Bungee', 27.15, RF - 0.06, 0.95, size=0.2, col='#ffcc40', energy=3)
k.boxes([(26.4 + i * 0.25, RF - 0.06, 0.55, 26.42 + i * 0.25, RF - 0.03, 1.3) for i in range(7)], '#1c1a20', 'window_bars')
k.box(29.4, RF - 0.1, 0.55, 31.0, RF - 0.07, 1.3, '#0e0c14', 'window_glass')
D.poster_wall(k, 29.5, 31.0, RF + 0.01, 0.45, 1.35, rng=rng)
U.barrels(k, 30.6, RF + 0.45, n=2, rng=rng)

# Sallow's Chrome: a ripper's front — a lit green window with an arm on a stand, a red cross, CHROME down a blade
wall_run(31.4, 36.6, '#2a3230', 'plain')
doorway(34.6, 35.5, '#70ffb0', depth=0.4, h=1.4)
k.box(31.8, RF - 0.3, 0.45, 34.2, RF - 0.27, 1.4, shade('#70ffb0', 0.25), 'window_glass', emit=('#70ffb0', 0.5))
k.box(32.7, RF - 0.25, 0.45, 32.8, RF - 0.15, 0.95, '#3a3a40', 'display_stand')                # an arm on a stand
k.tube((32.75, RF - 0.2, 0.95), (33.2, RF - 0.2, 1.15), 0.05, '#a8b0b8', 'chrome_arm', verts=8)
k.tube((33.2, RF - 0.2, 1.15), (33.55, RF - 0.2, 1.05), 0.045, '#a8b0b8', 'chrome_arm', verts=8)
k.sphere(33.6, RF - 0.2, 1.04, 0.07, 0.06, '#c8d0d8', 'chrome_hand', segs=8)
k.sphere(33.2, RF - 0.2, 1.15, 0.06, 0.06, '#5a6068', 'chrome_joint', segs=8)
S.neon(k, "SALLOW'S", 'Audiowide', 33.0, RF + 0.04, 1.75, size=0.36, col='#70ffb0', energy=10)
S._tubes(k, [(35.95, 1.95), (35.95, 2.35)], RF + 0.02, '#ff4040', tube=0.03)
S._tubes(k, [(35.75, 2.15), (36.15, 2.15)], RF + 0.02, '#ff4040', tube=0.03)
S.blade(k, 'CHROME', 'RussoOne', 31.65, RF, 2.0, 2.1, col='#70ffb0', w=0.4)

# the Foundry: an industrial club — a roll door half up on red light, hazard paint, beacons, a chain rope
wall_run(39.2, 52.1, '#2a2628', 'corrugated')
k.box(43.0, RF - 0.6, 0, 48.4, RF - 0.57, 1.0, shade('#ff3020', 0.4), 'doorway', emit=('#ff3020', 0.85))
k.box(42.8, RF - 0.6, 0, 48.6, RF, 0.02, ('#2a2420', 0.1), 'floor_threshold')
k.boxes([(43.0, RF - 0.05, z, 48.4, RF - 0.02, z + 0.08) for z in [1.0 + i * 0.1 for i in range(6)]], ('#6a6a70', 0.12), 'roll_door')
for x in (42.85, 48.45):
    k.box(x - 0.15, RF - 0.1, 0, x + 0.15, RF + 0.1, 1.62, '#1a1818', 'door_jamb')
    for i in range(6):                                                            # hazard stripes up the jambs
        k.box(x - 0.15, RF + 0.1, i * 0.27, x + 0.15, RF + 0.11, i * 0.27 + 0.13, '#c8a030', 'hazard_paint')
k.point_light(45.7, RF + 0.2, 0.5, '#ff3020', 60, radius=0.6, group='flicker')
k.box(41.0, RF + 0.02, 1.7, 50.4, RF + 0.12, 2.75, '#0e0c0c', 'club_sign')
S.letters(k, 'FOUNDRY', 'RubikMonoOne', 45.7, RF + 0.12, 1.88, size=0.7, col='#ff5a28', energy=24)
for x in (41.3, 50.1):                                                            # rotating beacons
    k.cyl(x, RF + 0.2, 2.8, 2.95, 0.12, '#2a2a2a', 'beacon_base', verts=10)
    k.sphere(x, RF + 0.2, 3.02, 0.12, 0.1, '#5a1004', 'beacon', emit=('#ff3010', 1.0), segs=10)
    k.point_light(x, RF + 0.5, 3.0, '#ff4020', 20, radius=0.2, group='flicker')
for x in (39.8, 40.4):
    k.cyl(x, RF + 0.1, 0, 1.62, 0.06, ('#5a5a60', 0.1), 'vent_stack', verts=10)
dr.vent(40.1, RF + 0.2, 1.7)
for x in (43.0, 44.5, 46.9, 48.4):                                                # the queue's chain rope
    k.cyl(x, RF + 1.6, 0.0, 0.85, 0.04, '#3a3a40', 'rope_post', verts=8)
    k.solid_post(x, RF + 1.6)
k.tube((43.0, RF + 1.6, 0.75), (44.5, RF + 1.6, 0.75), 0.018, '#7a7a80', 'chain', verts=4)
k.tube((46.9, RF + 1.6, 0.75), (48.4, RF + 1.6, 0.75), 0.018, '#7a7a80', 'chain', verts=4)
U.drum_fire(k, 51.2, RF + 0.9, energy=22)

# the Pit: a cage gate, red light, fight bills, the bookie's window
wall_run(54.7, 64.6, '#2a2222', 'brick')
doorway(58.4, 60.6, '#ff3040', depth=0.6, h=1.5)
k.boxes([(58.4 + i * 0.18, RF + 0.02, 0.0, 58.43 + i * 0.18, RF + 0.06, 1.5) for i in range(13)], '#4a4a50', 'cage_gate')
k.box(58.4, RF + 0.02, 0.72, 60.6, RF + 0.06, 0.78, '#4a4a50', 'cage_gate')
k.box(57.4, RF + 0.02, 1.68, 61.6, RF + 0.14, 2.7, '#140808', 'pit_sign')
S.letters(k, 'THE PIT', 'Bungee', 59.5, RF + 0.14, 1.88, size=0.6, col='#ff3040', energy=20)
for i, x in enumerate((55.2, 55.9, 56.6, 62.0, 62.7)):                            # fight bills
    col = ('#e8d8b8', '#c83030', '#e8c040', '#e8d8b8', '#c83030')[i]
    k.box(x, RF + 0.01, 0.45, x + 0.55, RF + 0.02, 1.25, (col, 0.25), 'poster')
    k.box(x + 0.08, RF + 0.02, 0.95, x + 0.47, RF + 0.025, 1.15, '#1a0a0a', 'poster_ink')
    k.box(x + 0.15, RF + 0.02, 0.55, x + 0.4, RF + 0.025, 0.85, shade(col, 0.5), 'poster_ink')
k.box(63.0, RF - 0.25, 0.75, 64.3, RF - 0.22, 1.35, shade('#ffd080', 0.35), 'window_glass', emit=('#ffd080', 0.6))
k.box(62.9, RF - 0.25, 0.7, 64.4, RF + 0.3, 0.78, '#3a3036', 'kiosk_sill')
k.boxes([(63.0 + i * 0.13, RF - 0.2, 0.78, 63.02 + i * 0.13, RF - 0.17, 1.35) for i in range(10)], '#3a3842', 'window_bars')
S.lightbox(k, 'BETS', 'RussoOne', 63.65, RF + 0.02, 1.55, 1.1, 0.3, bg='#ffe0a0', ink='#5a1010', size=0.22, energy=3)

# a scrap trader, a shutter half up on a lit workshop
wall_run(64.6, 69.6, '#363238', 'corrugated')
k.box(65.0, RF - 0.9, 0, 69.2, RF - 0.87, 1.4, shade('#ffd8a0', 0.3), 'workshop_back', emit=('#ffd8a0', 0.45))
Y.junk_shelf(k, 65.1, 69.1, RF - 0.85)
U.shutter_front(k, 65.0, 69.2, RF, h=1.5, up=0.95)
k.box(64.9, RF - 0.05, 0, 69.3, RF + 0.4, 0.8, ('#5a5a60', 0.1), 'counter', bevel=0.01)
U.scrap_heap(k, 66.2, RF + 1.0, s=0.5, rng=rng, solid=False)
S.lightbox(k, 'BUY · SELL · SCRAP', 'RussoOne', 67.1, RF + 0.02, 1.6, 3.4, 0.32, bg='#e8c040', ink='#1a1408', size=0.22, energy=4)
k.solid(64.9, RF - 0.05, 69.3, RF + 0.4)
k.solid(65.6, RF + 0.6, 66.8, RF + 1.4)

# the lift lobby: two steel doors, a call panel, the floor counter
wall_run(69.6, COLS + 0.5, '#2c3036', 'tile')
for x0 in (71.0, 73.6):
    k.box(x0 - 0.12, RF - 0.05, 0, x0 + 2.12, RF + 0.08, 1.62, '#1a1c22', 'lift_frame')
    k.box(x0, RF + 0.02, 0, x0 + 0.98, RF + 0.1, 1.5, ('#8a9098', 0.08), 'lift_door', bevel=0.01)
    k.box(x0 + 1.02, RF + 0.02, 0, x0 + 2.0, RF + 0.1, 1.5, ('#8a9098', 0.08), 'lift_door', bevel=0.01)
    k.box(x0 + 0.6, RF + 0.08, 1.52, x0 + 1.4, RF + 0.11, 1.6, '#0a0c10', 'lift_counter', emit=('#ff9040', 0.7))
k.box(73.12, RF + 0.08, 0.8, 73.48, RF + 0.12, 1.15, '#2a2c30', 'call_panel')
k.sphere(73.3, RF + 0.13, 1.03, 0.04, 0.04, '#5a3010', 'call_button', emit=('#ffa040', 1.0), segs=6)
k.sphere(73.3, RF + 0.13, 0.92, 0.04, 0.04, '#1a2a10', 'call_button', emit=('#60ff60', 0.6), segs=6)
S.lightbox(k, 'LIFT  B2', 'RussoOne', 73.3, RF + 0.02, 1.7, 3.6, 0.4, bg='#d8e0e8', ink='#1a2030', size=0.28, energy=5)
U.fluoro(k, dr, 72.0, RF + 0.6, 2.4, w=1.4, energy=22)
U.fluoro(k, dr, 74.6, RF + 0.6, 2.4, w=1.4, energy=22, dead=True)
k.solid(70.8, RF, 75.8, RF + 0.15)
D.graffiti(k, 76.2, 79.6, RF + 0.02, 0.2, 1.4, '#ff8030', rng=rng)

# ---- the middle block: a low Kowloon block down the middle, shops facing the south lane, its roof crowded ------------------
BB, BF, BT = 17.0, 21.5, 3.3        # its back, its face, its roof
ALLEYS = ((9.0, 11.0), (24.0, 26.0), (41.0, 43.0), (53.0, 55.0))
SEGS = [(-0.5, 9.0), (11.0, 24.0), (26.0, 41.0), (43.0, 53.0), (55.0, 60.0)]
for (a0, a1) in SEGS:
    k.box(a0, BB, 0, a1, BF - 0.02, BT, ('#1e1c22', 0.05), 'block_body')
    U.shanty(k, dr, a0, a1, BF, 1, top=BT, base=1.65, fh=1.6, rng=rng, lit=0.55, signs=True)
    U.rooftop(k, dr, a0, a1, BB, BF, BT, rng=rng)
    U.stack_signs(k, a0 + 0.4, a1 - 0.4, BF, z0=1.7, z1=3.3, n=max(1, int((a1 - a0) / 4)), rng=rng)
    k.box(a0, BF - 0.05, 1.55, a1, BF + 0.2, 1.65, '#1e1c24', 'awning_ledge')
    k.solid(a0, BB, a1, BF)
for (a0, a1) in ALLEYS:                                                            # the alleys through: wet, a tube, a cable over
    U.fluoro(k, dr, (a0 + a1) / 2, (BB + BF) / 2, 2.6, w=0.9, hang=BT + 0.4, energy=18)
    D.cable(k, (a0, BB + 0.6, BT - 0.2), (a1, BB + 1.4, BT - 0.1), sag=0.25, lights=['#ffd080', '#80e0ff'], n=6)
    U.grate_drip(k, dr, (a0 + a1) / 2, BB + 1.6, top=12.0)


def front_wall(x0, x1, rf, col, clad='corrugated'):
    k.box(x0, rf - 0.3, 0, x1, rf, G, (col, 0.1), 'front_wall')
    U._clad(k, x0, x1, rf, 0, G - 0.1, col, clad, rng)


def open_counter(x0, x1, rf, glow, top='#8a5a30', body='#7a1a1e', sign=None, font='DelaGothicOne', col='#ffcf60', what='pots'):
    """A hole in the wall with a counter out onto the lane: the kitchen lit behind, the cook's things on the counter,
    a noren or a sign over it, stools along the front."""
    k.box(x0 + 0.2, rf - 0.85, 0, x1 - 0.2, rf - 0.05, 1.55, shade(glow, 0.3), 'kitchen_back', emit=(glow, 0.45))
    Y.kitchen_back(k, x0 + 0.25, x1 - 0.25, rf - 0.8)
    k.box(x0 + 0.1, rf - 0.05, 0, x1 - 0.1, rf + 0.45, 0.95, (body, 0.08), 'counter', bevel=0.02)
    k.box(x0 + 0.05, rf - 0.1, 0.95, x1 - 0.05, rf + 0.5, 1.0, (top, 0.14), 'counter_top')
    if what == 'pots':
        Y.stock_pot(k, x0 + 0.6, rf + 0.2, z=1.0)
        dr.vent(x0 + 0.6, rf + 0.2, 1.6)
        for xx in [x0 + 1.4 + i * 0.5 for i in range(int((x1 - x0 - 1.8) / 0.5))]:
            Y.bowl(k, xx, rf + 0.25, 1.0)
    elif what == 'grill':
        k.box(x0 + 0.3, rf + 0.05, 1.0, x0 + 1.5, rf + 0.4, 1.06, '#1a1416', 'grill')
        k.box(x0 + 0.34, rf + 0.08, 1.04, x0 + 1.46, rf + 0.37, 1.06, '#3a1a08', 'grill_coals', emit=('#ff6020', 0.85))
        k.point_light(x0 + 0.9, rf + 0.5, 1.3, '#ff7030', 10, radius=0.2, group='flicker')
        dr.vent(x0 + 0.9, rf + 0.2, 1.3)
    elif what == 'meds':
        for i in range(int((x1 - x0 - 0.6) / 0.25)):
            c2 = rng.choice(('#e84040', '#40c8d8', '#e8e8f0', '#40e080'))
            k.box(x0 + 0.35 + i * 0.25, rf + 0.1, 1.0, x0 + 0.5 + i * 0.25, rf + 0.3, 1.18, (c2, 0.1), 'pill_box')
    if sign:
        S.lightbox(k, sign, font, (x0 + x1) / 2, rf + 0.02, 1.68, x1 - x0 - 0.3, 0.42, bg='#20140c', ink=col, glow=col, size=0.3, energy=6)
    for xx in [x0 + 0.5 + i * 0.75 for i in range(int((x1 - x0 - 0.4) / 0.75))]:
        Y.neon_stool(k, xx, rf + 0.95, seat=rng.choice(('#d83040', '#3a6ad0', '#2a2a30')))
    k.solid(x0 + 0.05, rf - 0.1, x1 - 0.05, rf + 0.5)


# segment 1: the grill, a shutter, a tea house door
front_wall(-0.5, 9.0, BF, '#3a2a28', 'brick')
open_counter(0.6, 4.4, BF, '#ffb070', sign='炭火 GRILL', col='#ff8040', what='grill')
U.shutter_front(k, 4.8, 6.6, BF, h=1.45, up=0.35)
doorway_at = 7.8
k.box(7.2, BF - 0.4, 0, 8.4, BF - 0.37, 1.4, shade('#ffd890', 0.4), 'doorway', emit=('#ffd890', 0.7))
for x in (7.4, 8.2):
    Y.paper_lantern(k, x, BF + 0.25, 1.75, col='#e03030', s=0.3, top=2.05)
S.blade(k, '茶館', 'DelaGothicOne', 8.75, BF, 1.8, 1.2, col='#ffd890', w=0.38)
# segment 2: the curry stall, a pawn shop, the mahjong den's lit window
front_wall(11.0, 24.0, BF, '#2e3438', 'tile')
open_counter(11.4, 15.6, BF, '#ffc060', top='#6a4a2a', body='#2a4a3a', sign='CURRY · LAKSA', font='RussoOne', col='#ffd040')
U.shutter_front(k, 16.0, 19.0, BF, h=1.45, up=0.9)
k.box(16.2, BF - 0.5, 0.0, 18.8, BF - 0.47, 0.9, shade('#ffe0a0', 0.35), 'shop_glow', emit=('#ffe0a0', 0.6))
S.lightbox(k, 'PAWN', 'Bungee', 17.5, BF + 0.02, 1.68, 1.6, 0.4, bg='#e8c040', ink='#2a1408', size=0.3, energy=5)
k.box(19.6, BF - 0.1, 0.5, 23.6, BF - 0.07, 1.35, shade('#40c080', 0.3), 'window_glass', emit=('#60e090', 0.5))
for i in range(3):                                                                 # heads round a table, seen through it
    k.sphere(20.4 + i * 1.2, BF - 0.2, 0.95, 0.12, 0.13, '#141018', 'silhouette', segs=8)
S.neon(k, '麻雀', 'DelaGothicOne', 21.6, BF + 0.04, 1.75, size=0.4, col='#60ff90', energy=8)
# segment 3: the capsule hostel, the meds counter, a hawker stall
front_wall(26.0, 41.0, BF, '#30283a', 'plain')
k.box(26.4, BF - 0.06, 0.1, 30.4, BF - 0.02, 1.5, '#14121a', 'capsule_face')
for i in range(4):                                                                 # pods, two high, one with a curtain
    for j in range(2):
        cx = 26.9 + i * 1.0
        k.cyl_y(cx, BF - 0.05, BF + 0.02, 0.45 + j * 0.62, 0.26, 0.26, '#2a2a34', 'capsule_rim', verts=14)
        lit = rng.random() < 0.6
        k.cyl_y(cx, BF - 0.04, BF, 0.45 + j * 0.62, 0.21, 0.21, shade('#a0c0ff', 0.3) if lit else '#0a0a10', 'capsule_glass',
                emit=('#a0c0ff', 0.55) if lit else None, verts=14)
S.lightbox(k, 'SLEEP 5c', 'RussoOne', 28.4, BF + 0.02, 1.68, 2.6, 0.4, bg='#d8e0f0', ink='#1a2a50', size=0.28, energy=4)
open_counter(31.0, 34.6, BF, '#d0f0ff', top='#c8c8d0', body='#3a4a5a', sign='+ MEDS', font='RussoOne', col='#ff5050', what='meds')
open_counter(35.4, 40.6, BF, '#ffc070', sign='屋台 HAWKER', col='#ffcf60')
# segment 4: a noodle stall, the karaoke box
front_wall(43.0, 53.0, BF, '#3a3236', 'corrugated')
open_counter(43.4, 47.4, BF, '#ffb070', sign='ラーメン', col='#ff7a50')
k.box(48.0, BF - 0.1, 0.4, 52.6, BF - 0.07, 1.4, shade('#ff60c0', 0.3), 'window_glass', emit=('#ff60c0', 0.6))
S.neon(k, 'KTV', 'Monoton', 50.3, BF + 0.04, 1.72, size=0.5, col='#ff60c0', energy=10)
k.box(49.6, BF - 0.4, 0, 50.6, BF - 0.37, 1.4, shade('#ff60c0', 0.4), 'doorway', emit=('#ff60c0', 0.8))
# segment 5: shuttered, tagged
front_wall(55.0, 60.0, BF, '#38343e', 'corrugated')
U.shutter_front(k, 55.4, 59.6, BF, h=1.45, up=0.2)
U.tag(k, 55.6, 59.4, BF + 0.05, 0.3, 1.3, '#ff7a2a', rng=rng)

# ---- the north lane: stalls, the hover bike, the Foundry's queue -----------------------------------------------------------
U.stall(k, dr, 1.0, 4.4, 12.4, kind='noodle', rng=rng, name='麺')
U.stall(k, dr, 5.0, 8.2, 12.4, kind='dumplings', rng=rng, name='点心')
U.stall(k, dr, 12.0, 15.0, 12.6, kind='skewers', rng=rng, name='串焼')
U.stall(k, dr, 25.6, 28.8, 12.6, kind='drinks', rng=rng, name='DRINKS')
U.stall(k, dr, 29.4, 32.4, 12.6, kind='junk', rng=rng)
U.stall(k, dr, 18.6, 21.6, 12.6, kind='tea', rng=rng, name='茶')
Y.holo_kiosk(k, 35.0, 13.4)
Y.vending_machine(k, 36.2, RF + 0.05, body='#1a2a40')
k.solid(35.7, RF, 36.7, RF + 0.75)
Y.hover_bike(k, 53.6, 13.6)
Y.trash_can(k, 50.6, 14.6)
U.crates(k, 22.6, 14.6, n=3, rng=rng)


# ---- the south lane: tables, the drum fire, the sleepers ------------------------------------------------------------------
def folding_table(cx, cr, w=1.4, cloth=None):
    top = cloth or rng.choice(('#c83a32', '#e8e0d0', '#3a6ad0', '#5a5a64'))
    k.box(cx - w / 2, cr - 0.35, 0.7, cx + w / 2, cr + 0.35, 0.75, (top, 0.1), 'table_top')
    for (dx, dd) in ((-w / 2 + 0.08, -0.28), (w / 2 - 0.08, -0.28), (-w / 2 + 0.08, 0.28), (w / 2 - 0.08, 0.28)):
        k.cyl(cx + dx, cr + dd, 0, 0.7, 0.025, '#5a5a64', 'table_leg', verts=5)
    for i in range(int(w / 0.5)):                                          # bowls, a bottle
        if rng.random() < 0.7:
            Y.bowl(k, cx - w / 2 + 0.3 + i * 0.5, cr + rng.choice((-0.15, 0.15)), 0.75)
    if rng.random() < 0.5:
        k.cyl(cx + w / 2 - 0.2, cr, 0.75, 0.98, 0.04, '#2a6a3a', 'bottle', verts=6)
    for i in range(int(w / 0.6)):                                          # plastic stools both sides
        x = cx - w / 2 + 0.35 + i * 0.6
        for dd in (-0.65, 0.62):
            sc = rng.choice(('#d83040', '#3a6ad0', '#e8c040', '#3a9a5a'))
            k.cyl(x, cr + dd, 0.0, 0.42, 0.15, (sc, 0.08), 'plastic_stool', verts=10)
            k.cyl(x, cr + dd, 0.4, 0.44, 0.17, shade(sc, 1.1), 'plastic_stool', verts=10)
    k.solid(cx - w / 2, cr - 0.35, cx + w / 2, cr + 0.35)


for (cx, cr) in ((2.6, 24.4), (6.4, 24.4), (13.4, 24.6), (17.2, 24.6), (28.0, 24.4), (37.6, 24.6), (45.2, 24.6)):
    folding_table(cx, cr)
for (cx, cr) in ((22.0, 27.2), (40.0, 27.6), (47.0, 27.6)):
    folding_table(cx, cr, w=2.6, cloth='#5a5a64')
D.cable(k, (11.0, 23.2, 3.0), (20.0, 23.2, 3.1), sag=0.45, lights=['#ffd080', '#ff7ab0', '#80e0ff'], n=14)
D.cable(k, (36.0, 23.2, 3.0), (49.0, 23.2, 3.1), sag=0.5, lights=['#ffd080', '#80e0ff'], n=16)
for (x, r) in ((11.0, 23.2), (20.0, 23.2), (36.0, 23.2), (49.0, 23.2)):
    k.cyl(x, r, 0, 3.1, 0.04, '#3a3842', 'pole', verts=6)
    k.solid_post(x, r)
U.drum_fire(k, 9.4, 27.4)
U.mattress_corner(k, 4.6, 28.2, rng=rng)
U.crates(k, 15.4, 28.0, n=3, rng=rng)
U.barrels(k, 18.2, 28.4, n=2, rng=rng)
U.crates(k, 52.6, 27.8, n=3, rng=rng)
Y.trash_can(k, 30.8, 23.2)
D.dumpster(k, 56.0, 27.8)
U.mattress_corner(k, 58.6, 24.4, rng=rng)

# lights: tubes hung from the dark on long wires, sodium posts, the drips through the grates
for (x, r) in ((3.0, 10.6), (10.5, 11.0), (17.0, 11.0), (23.5, 10.8), (34.0, 11.4), (41.5, 11.6), (49.5, 11.2), (57.0, 12.0),
               (67.5, 11.6), (3.5, 22.8), (15.0, 22.8), (28.5, 22.6), (44.0, 22.8), (8.0, 26.6), (30.0, 26.0), (51.0, 25.8),
               (57.5, 23.6)):
    U.fluoro(k, dr, x, r, 3.1, w=1.2, hang=7.5, energy=26, dead=rng.random() < 0.12)
for (x, r) in ((10.0, 15.2), (24.0, 29.0), (38.6, 29.0), (60.6, 15.2), (60.6, 25.0)):
    U.sodium(k, x, r, z=2.7, energy=55)
for (x, r) in ((9.4, 15.0), (17.0, 15.6), (33.6, 15.4), (46.4, 13.6), (13.0, 26.6), (26.4, 26.0), (43.6, 25.6), (70.0, 26.0),
               (76.0, 19.8), (57.6, 14.6)):
    U.grate_drip(k, dr, x, r, top=12.0)
U.puddles(k, 0, 22.0, 60, 29.5, 10, (U.SODIUM, '#2a7a5a', Y.PINK, Y.CYAN), rng=rng)
U.puddles(k, 0, 9.5, 60, 16.5, 8, (U.SODIUM, '#2a7a5a', Y.PINK, Y.CYAN), rng=rng)

# ---- the stairwell down to the Sump ---------------------------------------------------------------------------------------
U.stair_down(k, dr, 33.0, 36.0, 26.8, QY + 0.2, depth=2.6, label='DOWN: THE SUMP')
k.solid(32.8, 26.9, 36.2, QY + 0.3)

# ---- the Rust Saints' turf ------------------------------------------------------------------------------------------------
SAINT = '#ff7a2a'
U.chainlink(k, FENCE_X, FENCE_R, COLS + 0.5, FENCE_R, gap=None)
U.chainlink(k, FENCE_X, FENCE_R, FENCE_X, QY - 0.4, gap=(4.2, 6.6))
k.solid(FENCE_X - 0.1, FENCE_R - 0.1, COLS + 0.5, FENCE_R + 0.1)
for r in range(int(FENCE_R), int(QY)):
    if not (FENCE_R + 4.2 <= r + 0.5 <= FENCE_R + 6.6):
        k.solid(FENCE_X - 0.1, r + 0.05, FENCE_X + 0.1, r + 0.95)
U.ground_tag(k, FENCE_X - 1.6, FENCE_R + 5.6, SAINT)
U.ground_tag(k, 71.0, 23.0, SAINT, w=2.4)
for (x, r) in ((67.6, 21.2), (74.5, 27.2), (77.6, 21.0)):
    U.drum_fire(k, x, r)
U.scrap_heap(k, 69.6, 27.4, s=1.1, rng=rng)
U.scrap_heap(k, 77.0, 28.2, s=0.8, rng=rng)
U.scrap_heap(k, 75.6, 18.4, s=0.7, rng=rng)
U.barrels(k, 64.2, 27.6, n=3, rng=rng)
U.lean_to(k, 64.0, 66.6, 17.4, rng=rng, col='#c05010')
U.lean_to(k, 74.0, 76.8, 22.2, rng=rng)
U.lean_to(k, 65.6, 68.0, 25.4, rng=rng, col='#8a4aa0')
for (x0, x1, r) in ((68.6, 72.0, 17.2), (76.6, 79.6, 17.2)):                              # a barricade of sheet and doors
    for i in range(int((x1 - x0) / 0.7)):
        xx = x0 + i * 0.7
        k.box(xx, r, 0.0, xx + 0.66, r + 0.12, rng.uniform(1.2, 1.9), (rng.choice(('#5a4a3a', '#4a5a5a', '#6a3a22', '#3a5a8a', '#8a2a2a')), 0.2), 'barricade')
    U.tag(k, x0, x1, r + 0.12, 0.2, 1.1, SAINT, rng=rng)
    k.solid(x0, r, x1, r + 0.12)
D.cable(k, (64.0, 17.4, 1.85), (74.0, 22.2, 1.85), sag=0.4, lights=[SAINT, '#ffd080'], n=14)
D.cable(k, (66.6, 17.4, 1.85), (79.4, 20.4, 2.4), sag=0.5, lights=[SAINT, '#ff60c0'], n=14)
# the burnt-out shell of a hover car
k.box(70.2, 20.2, 0.15, 72.6, 21.2, 0.6, (U.RUST, 0.3), 'car_shell', bevel=0.12)
k.box(70.7, 20.3, 0.6, 72.0, 21.1, 0.9, '#1a1414', 'car_cab', bevel=0.08)
k.box(70.9, 21.1, 0.62, 71.8, 21.12, 0.86, '#0a0808', 'car_window')
k.solid(70.2, 20.2, 72.6, 21.2)
# their banner on a pole: an orange halo over a wrench
k.cyl(73.6, 24.6, 0, 3.0, 0.04, '#3a3842', 'pole', verts=6)
k.solid_post(73.6, 24.6)
k.poly([(73.64, 24.6, 2.9), (74.9, 24.6, 2.85), (74.9, 24.62, 1.9), (73.64, 24.62, 1.95)], ('#2a1a14', 0.3), 'banner')
S._tubes(k, [(74.27 + 0.32 * math.cos(a * math.pi / 8), 2.55 + 0.12 * math.sin(a * math.pi / 8)) for a in range(17)], 24.62, SAINT, tube=0.02)
S._tubes(k, [(74.27, 2.4), (74.27, 2.0)], 24.62, SAINT, tube=0.03)
for (x0, x1, z0, z1) in ((54.9, 57.0, 0.25, 1.5), (76.4, 79.6, 0.25, 1.4)):
    U.tag(k, x0, x1, RF, z0, z1, SAINT, rng=rng)
# the gate to the scrapyards at the east edge
k.box(79.4, 20.4, 0, 80.5, 20.6, 2.6, '#3a3842', 'gate_post')
k.box(79.4, 24.4, 0, 80.5, 24.6, 2.6, '#3a3842', 'gate_post')
k.box(79.4, 20.4, 2.4, 80.5, 24.6, 2.6, '#3a3842', 'gate_post')
S.lightbox(k, 'SCRAPYARDS →', 'RussoOne', 79.0, 20.3, 2.7, 1.2, 0.3, bg='#2a1a08', ink=SAINT, size=0.16, energy=3)
U.sodium(k, 78.2, 24.8, z=2.6, energy=50)

# ---- light: a cold ambient from the tubes, warm pools, the turf lit by its fires -------------------------------------------
k.area_light(14, 24, 9.0, '#c89a60', 90, 28.0, rot=(math.radians(35), 0, 0))
k.area_light(40, 24, 9.0, '#80b0a0', 90, 28.0, rot=(math.radians(35), 0, 0))
k.area_light(68, 24, 9.0, '#c07050', 80, 26.0, rot=(math.radians(35), 0, 0))
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=96,
         world_light=('#2a2440', 1.5))

# ---- the world -------------------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Undercity', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [3, 10]}, 'shipExit': False, 'interior': True})


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


def door(x, y, target, spawn, label, prompt='PRESS E TO ENTER'):
    return {'x': x, 'y': y, 'type': 'enter_world', 'target': target, 'spawn': spawn, 'label': label, 'prompt': prompt}


w['interactions'] = [
    {'x': 1, 'y': 9, 'type': 'leave_world', 'label': 'STAIRS UP', 'prompt': 'UP TO THE BACKS', 'leaveTo': 'arcadia-alley', 'leaveSpawn': [1, 10]},
    {'x': 2, 'y': 9, 'type': 'leave_world', 'label': 'STAIRS UP', 'prompt': 'UP TO THE BACKS', 'leaveTo': 'arcadia-alley', 'leaveSpawn': [1, 10]},
    {'x': 10, 'y': 9, 'type': 'dialog', 'label': 'NOODLE COUNTER', 'prompt': 'PRESS E TO ORDER',
     'dialog': "MAMA ROO'S. THE BROTH HAS BEEN ON SINCE BEFORE THE DISTRICT WAS BUILT ON TOP OF IT."},
    door(16, 9, 'arcadia-hawker', [19, 22], 'HAWKER HALL'),
    door(17, 9, 'arcadia-hawker', [20, 22], 'HAWKER HALL'),
    door(28, 9, 'arcadia-dive', [9, 14], 'THE DRIP'),
    door(35, 9, 'arcadia-chopshop', [8, 11], "SALLOW'S"),
    door(45, 9, 'arcadia-foundry', [15, 20], 'FOUNDRY'),
    door(46, 9, 'arcadia-foundry', [16, 20], 'FOUNDRY'),
    door(59, 9, 'arcadia-pit', [17, 23], 'THE PIT'),
    door(60, 9, 'arcadia-pit', [18, 23], 'THE PIT'),
    {'x': 67, 'y': 9, 'type': 'under', 'act': 'scrap', 'label': 'SCRAP TRADER', 'prompt': 'PRESS E TO TRADE'},
    {'x': 9, 'y': 9, 'type': 'dialog', 'label': 'MAMA ROO', 'prompt': 'PRESS E TO TALK', 'dialog': 'MAMA ROO STIRS THE POT.'},
    {'x': 44, 'y': 10, 'type': 'dialog', 'label': 'BRICK', 'prompt': 'PRESS E TO TALK', 'dialog': 'BRICK LOOKS AT YOU. JUST LOOKS.'},
    {'x': 63, 'y': 9, 'type': 'dialog', 'label': 'TALLY', 'prompt': 'PRESS E TO TALK', 'dialog': 'TALLY CHALKS UP THE ODDS.'},
    {'x': 64, 'y': 9, 'type': 'under', 'act': 'bets', 'label': 'BETS', 'prompt': 'PRESS E TO BET'},
    {'x': 68, 'y': 9, 'type': 'dialog', 'label': 'GAGE', 'prompt': 'PRESS E TO TALK', 'dialog': 'GAGE WIPES HIS HANDS.'},
    {'x': 72, 'y': 9, 'type': 'express_lift', 'shaft': 'core', 'lobby': 'undercity', 'label': 'LIFT', 'prompt': 'PRESS E TO CALL THE LIFT'},
    {'x': 74, 'y': 9, 'type': 'express_lift', 'shaft': 'core', 'lobby': 'undercity', 'label': 'LIFT', 'prompt': 'PRESS E TO CALL THE LIFT'},
    door(34, 27, 'arcadia-sump', [6, 9], 'STAIRS DOWN', 'DOWN TO THE SUMP'),
    door(35, 27, 'arcadia-sump', [7, 9], 'STAIRS DOWN', 'DOWN TO THE SUMP'),
    door(79, 21, 'arcadia-scrapyard', [1, 14], 'SCRAPYARDS', 'PRESS E TO GO THROUGH'),
    door(79, 22, 'arcadia-scrapyard', [1, 15], 'SCRAPYARDS', 'PRESS E TO GO THROUGH'),
    door(79, 23, 'arcadia-scrapyard', [1, 16], 'SCRAPYARDS', 'PRESS E TO GO THROUGH'),
    look(35, 13, 'HOLO KIOSK', "AN AD FOR THE SKYWALK, TWO HUNDRED FLOORS UP: BLUE SKY, GLASS, A WOMAN LAUGHING. SOMEONE HAS SCRATCHED "
         "'NOT FOR YOU' ACROSS THE LENS."),
    look(9, 27, 'DRUM FIRE', 'AN OIL DRUM, A FIRE IN IT, HANDS HELD OUT TO IT. NOBODY ASKS YOUR NAME. SOMEONE MOVES UP TO MAKE ROOM.'),
    look(4, 28, 'SLEEPER', 'SOMEONE ASLEEP UNDER A BLANKET, A RADIO PLAYING SOFTLY BESIDE THEM. THE STATION IS ONE FROM UP TOP: THE WEATHER '
         'FOR THE DISTRICT. RAIN, IT SAYS. IT IS ALWAYS RAIN DOWN HERE.'),
    look(36, 9, 'VENDING MACHINE', 'IT SELLS ONE THING: CANS OF "AIR - UP TOP FRESH". THEY ARE EMPTY. THEY ARE SOLD OUT.'),
    look(58, 24, 'SLEEPER', 'A MAN ASLEEP ON A MATTRESS BY THE DUMPSTER, ONE ARM CHROME TO THE SHOULDER, THE CHROME TWITCHING IN HIS SLEEP.'),
    {'x': 2, 'y': 13, 'type': 'dialog', 'label': 'NOODLE STALL', 'dialog': 'NOODLES.'},
    {'x': 6, 'y': 13, 'type': 'dialog', 'label': 'DUMPLING STALL', 'dialog': 'DUMPLINGS.'},
    {'x': 13, 'y': 13, 'type': 'dialog', 'label': 'SKEWER STALL', 'dialog': 'SKEWERS.'},
    {'x': 20, 'y': 13, 'type': 'dialog', 'label': 'TEA STALL', 'dialog': 'TEA.'},
    {'x': 27, 'y': 13, 'type': 'dialog', 'label': 'DRINKS STALL', 'dialog': 'DRINKS.'},
    look(30, 13, 'JUNK STALL', 'CABLES, CHARGERS, A BOX OF LOOSE KEYS FOR NOTHING IN PARTICULAR, A ROBOT HAND IN A JAR. THE STALLHOLDER IS ASLEEP.'),
    {'x': 2, 'y': 21, 'type': 'dialog', 'label': 'GRILL STALL', 'dialog': 'THE GRILL.'},
    look(7, 21, 'TEA HOUSE', 'A DOORWAY UNDER TWO LANTERNS, A CURTAIN, OLD MEN INSIDE OVER LITTLE CUPS. ONE LOOKS UP, SEES YOU ARE NOT FROM HERE, AND LOOKS BACK DOWN.'),
    {'x': 13, 'y': 21, 'type': 'dialog', 'label': 'CURRY STALL', 'dialog': 'CURRY.'},
    look(17, 21, 'PAWN', 'WATCHES, RINGS, A TRUMPET, A HUNDRED PHONES, A WEDDING DRESS IN A BAG. "WE BUY," SAYS THE SIGN. "WE DON\'T SELL TO YOU," SAYS THE MAN.'),
    look(21, 21, 'MAHJONG DEN', 'THE CLACK OF TILES, SMOKE, A SHOUT. FOUR PLAYERS, NONE OF WHOM HAS SLEPT SINCE THE WEEK BEFORE LAST.'),
    look(28, 21, 'CAPSULE HOSTEL', 'PODS STACKED IN THE WALL, FIVE COINS A NIGHT, A CURTAIN FOR A DOOR. MOST ARE TAKEN. SOMEONE IS SNORING IN THREE OF THEM AT ONCE.'),
    {'x': 32, 'y': 21, 'type': 'dialog', 'label': 'MEDS COUNTER', 'dialog': 'MEDS.'},
    {'x': 38, 'y': 21, 'type': 'dialog', 'label': 'HAWKER STALL', 'dialog': 'FOOD.'},
    {'x': 45, 'y': 21, 'type': 'dialog', 'label': 'NOODLE STALL', 'dialog': 'NOODLES.'},
    look(50, 21, 'KTV', 'THROUGH THE PINK GLASS: SIX PEOPLE IN A BOX SINGING A LOVE SONG, BADLY, WITH THEIR WHOLE HEARTS.'),
    look(71, 20, 'BURNT CAR', "A HOVER CAR'S SHELL, BURNT OUT AND STRIPPED TO THE FRAME. 'SAINTS' IS SPRAYED ACROSS THE HOOD IN ORANGE."),
    look(73, 24, 'BANNER', 'THE RUST SAINTS: AN ORANGE HALO OVER A WRENCH. THIS SIDE OF THE FENCE IS THEIRS, AND THEY WILL TELL YOU SO.'),
    look(61, 22, 'TURF', "ORANGE PAINT ON THE FLOOR AT THE GAP IN THE FENCE: A CROWN OF THREE STROKES. PAST IT, THE RUST SAINTS' TURF. "
         "PAST THAT, THE SCRAPYARDS.", 'PRESS E TO READ'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')

ACTORS = [
    {'sheet': 'npc-roo', 'x': 9, 'y': 9, 'facing': 'down'},
    {'sheet': 'npc-bouncer', 'x': 44, 'y': 10, 'facing': 'down'},
    {'sheet': 'npc-bookie', 'x': 63, 'y': 9, 'facing': 'down'},
    {'sheet': 'npc-gage', 'x': 68, 'y': 9, 'facing': 'down'},
]
for a in ACTORS:
    k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
apply_world(WORLD, k, (0, int(RF), COLS - 1, int(QY) - 1),
            doors=[(1, 9), (2, 9), (16, 9), (17, 9), (28, 9), (35, 9), (45, 9), (46, 9), (59, 9), (60, 9)],
            scene_id='arcadia-undercity', actors=ACTORS, scene_extra={'steam': dr.steam})
w = json.load(open(WORLD))
w['view'] = [-0.5, 0.0, COLS + 0.5, ROWS + 0.5]
w['undercity'] = {'drips': dr.drips, 'tubes': dr.tubes, 'level': 'undercity',
                  'turf': {'gang': 'saints', 'rect': [int(FENCE_X) + 1, int(FENCE_R) + 1, COLS - 1, int(QY) - 1]}}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('undercity done', len(k.parts), 'parts')
