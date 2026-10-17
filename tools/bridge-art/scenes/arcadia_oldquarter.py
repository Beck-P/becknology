"""Arcadia's old quarter, Lantern Row — Blender scene (world id "arcadia-oldquarter").

  BVENV/bin/python tools/bridge-art/scenes/arcadia_oldquarter.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-oldquarter

West of the neon street, the District as it was before the towers (tag L0): a lane of wet stone setts under strings
of paper lanterns, lined with two-storey timber shophouses under curved tile roofs — Granny Ume's tea house open to
the lane, the lantern maker's, Hoshi Ramen's counter, a shuttered old house, the Loop's Lantern Row station under its
viaduct (the track strides over the whole quarter), the Akachochin izakaya with its red lanterns and sake casks, the
bathhouse and its chimney, the kampo herbalist — and at the west end a stone stair climbing to the shrine on the roofs
(its own world, arcadia-oldquarter-shrine: scenes/arcadia_oldquarter_shrine.py). Across the lane, market stalls (a
goldfish scoop, greens, dried goods, the charm stall, a yakitori cart, fruit), a little Jizo by two stone lanterns,
and along the railing a promenade of benches over the drop, the megacity's towers looming over the low roofs.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_cyber as Y               # noqa: E402
import assets_district as D            # noqa: E402
import assets_signs as S               # noqa: E402
import assets_oldquarter as O          # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-oldquarter'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 64, 20
RF = 9.0          # the shophouses' faces; their doors on row 8, the lane rows 9-14
RAIL = 18.0       # the railing over the drop; the promenade rows 16-17
VZ, VR = 6.0, 6.2  # the Loop's viaduct: deck height, row

k = Kit(COLS, ROWS, margin_top=2.2, margin_bottom=0.6, seed=1868)
st = D.Street()
rng = k.rng

# ---- the ground: wet setts, a stone gutter along the houses, puddles ------------------------------------------------
Y.tile_floor(k, -0.5, RF, COLS + 0.5, RAIL, tones=('#3c363e', '#353038'), size=0.5, seam='#141016')
k.box(-0.5, RF + 0.55, -0.01, COLS + 0.5, RF + 0.75, 0.004, '#221e26', 'gutter')
for x in range(1, COLS, 5):
    k.boxes([(x + i * 0.1, RF + 0.57, 0.004, x + i * 0.1 + 0.05, RF + 0.73, 0.007) for i in range(5)], '#141016', 'drain')
k.box(-0.5, 15.45, 0.0, COLS + 0.5, 15.53, 0.006, '#2a2630', 'kerb')
for (x, r, rx, ry, c) in ((3.2, 11.6, 0.7, 0.28, '#ff5a3a'), (9.8, 12.8, 0.5, 0.22, '#ffb040'), (17.5, 11.2, 0.8, 0.3, '#ff6040'),
                          (25.6, 12.6, 0.6, 0.25, Y.CYAN), (31.4, 11.4, 0.9, 0.3, Y.CYAN), (38.8, 12.6, 0.6, 0.24, '#ff4030'),
                          (44.2, 11.0, 0.5, 0.2, '#ffd080'), (50.6, 12.7, 0.8, 0.28, '#ff7a40'), (57.4, 11.8, 0.6, 0.24, Y.PINK),
                          (13.4, 16.6, 0.6, 0.2, '#ffb040'), (36.0, 16.9, 0.7, 0.22, Y.CYAN), (20.4, 12.2, 0.5, 0.2, '#ff5040'), (53.0, 12.0, 0.6, 0.22, '#ffc060'), (61.0, 12.8, 0.5, 0.2, Y.PURP)):
    Y.puddle(k, x, r, rx, ry, tint=c)
Y.manhole(k, 28.4, 12.0)
D.steam_grate(k, st, 14.6, 12.6)
D.steam_grate(k, st, 47.6, 12.4)

# ---- the Loop's viaduct, high over the roofs ------------------------------------------------------------------------
O.viaduct(k, -0.5, COLS + 0.5, VR, VZ, piers=(12.0, 27.6, 44.0, 58.4))

# ---- the west end: an old stone wall closing the lane, the shrine's house and the stair up to the roof -----------------
k.box(-0.6, RF, 0.0, 0.0, RAIL, 0.9, ('#4e4a54', 0.12), 'stone_wall')
k.box(-0.65, RF, 0.9, 0.05, RAIL, 0.98, '#5a5660', 'stone_wall_cap')
k.solid(-0.6, RF, 0.0, RAIL)
SH0, SH1, SHB = 0.0, 7.0, 4.4            # the shrine's house: a deep old warehouse with a flat roof
SHZ = 2.6
k.box(SH0, SHB, 0.0, SH1, RF, SHZ, ('#a89a84', 0.12), 'house_wall')
k.box(SH0 - 0.04, RF - 0.02, 0.0, SH1 + 0.04, RF + 0.05, 0.2, O.STONE[0], 'house_plinth')
for xp in (0.6, 2.6, 4.6, 6.6):
    k.box(xp - 0.07, RF - 0.02, 0.0, xp + 0.07, RF + 0.06, SHZ, (O.TIMBER, 0.1), 'post')
O.lattice(k, 0.7, 2.5, RF + 0.02, 0.2, 1.2)
k.box(0.7, RF, 0.2, 2.5, RF + 0.01, 1.2, shade('#ffb060', 0.5), 'shoji', emit=('#ffb060', 0.45))
k.boxes([(x, RF + 0.0, 0.2, x + 0.18, RF + 0.03, 1.25) for x in [2.75 + i * 0.19 for i in range(9)]], (O.TIMBER_L, 0.12), 'storm_board')
O.pent(k, 0.0, 4.6, RF + 0.05, 1.5, col=O.KAWARA[1])
for x in (1.0, 3.6, 5.6):                                                  # upper windows, slatted
    k.box(x - 0.3, RF + 0.01, 1.7, x + 0.3, RF + 0.02, 2.2, shade('#ffc070', 0.45), 'window_paper', emit=('#ffc070', 0.55))
    k.boxes([(x - 0.3 + j * 0.08, RF + 0.02, 1.7, x - 0.28 + j * 0.08, RF + 0.06, 2.2) for j in range(8)], O.TIMBER, 'slats')
k.box(SH0 - 0.06, SHB - 0.06, SHZ, SH1 + 0.06, RF + 0.06, SHZ + 0.12, ('#5a5660', 0.1), 'roof_deck_edge')
k.box(SH0 + 0.06, SHB + 0.06, SHZ, SH1 - 0.06, RF - 0.06, SHZ + 0.03, ('#4a4048', 0.12), 'roof_deck')
for x0_, x1_, r_ in ((SH0, SH1, RF), ):
    k.boxes([(x, r_ - 0.08, SHZ + 0.12, x + 0.05, r_ - 0.02, SHZ + 0.5) for x in [x0_ + 0.1 + i * 0.3 for i in range(int((x1_ - x0_) / 0.3))]],
            O.TIMBER, 'roof_rail_post')
    k.box(x0_, r_ - 0.09, SHZ + 0.46, x1_, r_ - 0.01, SHZ + 0.52, (O.VERMILION, 0.08), 'roof_rail')
# the shrine up there: a little hall under a tiled roof at the back, a torii at the front, lanterns, a bent pine
SZ = SHZ + 0.03
k.box(1.4, 4.9, SZ, 4.6, 6.9, SZ + 1.15, ('#e8dcc4', 0.1), 'shrine_wall')
for xp in (1.45, 3.0, 4.55):
    k.box(xp - 0.06, 6.86, SZ, xp + 0.06, 6.96, SZ + 1.15, (O.VERMILION, 0.08), 'shrine_post')
k.box(1.5, 6.9, SZ + 0.15, 4.5, 6.92, SZ + 0.95, shade('#ffc070', 0.5), 'shrine_glow', emit=('#ffc070', 0.6))
O.lattice(k, 1.5, 4.5, 6.93, SZ + 0.15, SZ + 0.95, step=0.12)
O.tile_roof(k, 1.4, 4.6, 4.9, 6.9, SZ + 1.15, 0.75, col=O.KAWARA[2], wall='#e8dcc4', over=0.38)
O.shimenawa(k, 1.5, 4.5, 7.05, SZ + 1.05)
O.torii(k, 3.0, 8.4, w=1.8, h=SZ + 1.9 - SZ, col=O.VERMILION)            # (posts on the roof: z offset below)
for obj in [p for p in k.parts[-14:] if p.get('pname', '').startswith('torii')]:
    obj['obj'].location.z += SZ
for x in (1.0, 5.0):
    O.stone_lantern(k, x, 8.0, h=0.9)
    for obj in k.parts[-8:]:
        if obj.get('pname', '').startswith('lantern_stone'):
            obj['obj'].location.z += SZ
# the pine, real: a twisted trunk and layered crowns of needles
with k.foliage('needle'):
    k.tube((5.9, 5.6, SZ), (5.7, 5.5, SZ + 0.9), 0.1, '#3a2618', 'trunk', verts=7)
    k.tube((5.7, 5.5, SZ + 0.9), (6.3, 5.6, SZ + 1.7), 0.08, '#3a2618', 'trunk', verts=7)
    for (dx, dr, dz, rx) in ((0.0, 0.0, 1.0, 0.55), (0.5, 0.1, 1.55, 0.6), (0.2, 0.0, 2.0, 0.42), (-0.25, 0.1, 1.3, 0.35)):
        k.blob(5.8 + dx, 5.6 + dr, SZ + dz, rx, rx * 0.8, rx * 0.36, ('#1e3a2a', 0.2), 'leaves', segs=10)
        k.blob(5.8 + dx, 5.65 + dr, SZ + dz + 0.1, rx * 0.8, rx * 0.65, rx * 0.25, ('#2e5a3a', 0.2), 'leaves', segs=10)
k.box(0.5, 7.5, SZ, 1.3, 7.9, SZ + 0.45, ('#5a3a24', 0.1), 'offering_box')
k.point_light(3.0, 7.6, SZ + 1.0, '#ffb060', 28, radius=0.5, group='flicker')
k.solid(SH0, SHB, SH1, RF)
# the stair: stone treads climbing from the lane up the house's flank to the roof, a red rail, a little gate at its foot
ST0, ST1 = 7.1, 8.6
n = 12
for i in range(n):
    z = (i + 1) * SHZ / n
    r1 = RF - i * (RF - 6.0) / n
    k.box(ST0, r1 - (RF - 6.0) / n, 0.0, ST1, r1, z, ('#5e5a64', 0.12) if i % 2 else ('#56525c', 0.12), 'stone_step')
for xs in (ST0 - 0.04, ST1 + 0.04):
    k.tube((xs, RF, 0.95), (xs, 6.0, SHZ + 0.95), 0.035, (O.VERMILION, 0.08), 'stair_rail', verts=6)
    for i in range(0, n + 1, 3):
        r1 = RF - i * (RF - 6.0) / n
        z = i * SHZ / n
        k.box(xs - 0.035, r1 - 0.035, z, xs + 0.035, r1 + 0.035, z + 0.95, O.TIMBER, 'stair_post')
k.box(ST1 + 0.1, 6.0, 0.0, ST1 + 0.5, RF, SHZ, ('#a89a84', 0.12), 'house_wall')         # the next house's blank flank
for xs in (ST0 - 0.15, ST1 + 0.15):
    k.cyl(xs, RF + 0.25, 0.0, 1.9, 0.06, (O.VERMILION, 0.08), 'torii_post', verts=8)
k.box(ST0 - 0.4, RF + 0.19, 1.6, ST1 + 0.4, RF + 0.31, 1.7, (O.VERMILION, 0.08), 'torii_beam')
k.box(ST0 - 0.5, RF + 0.18, 1.86, ST1 + 0.5, RF + 0.32, 1.98, '#141012', 'torii_cap')
O.shimenawa(k, ST0 - 0.1, ST1 + 0.1, RF + 0.3, 1.55, sag=0.08)
S.blade(k, '神社', 'DelaGothicOne', ST1 + 0.3, RF, 0.4, 1.0, col='#ffb050', w=0.36, stand=0.2)
k.solid(ST0, 6.0, ST1 + 0.5, RF)

# ---- the north side of the lane: the shophouses -------------------------------------------------------------------
# the tea house: open to the lane, a raised tatami floor, low tables, a hanging scroll, a kettle over the hearth
TX0, TX1 = 9.0, 14.4
k.box(TX0, RF - 3.0, 0.0, TX1, RF - 1.6, 2.5, ('#b8ac94', 0.12), 'house_wall')
for (a, b) in ((TX0, TX0 + 0.25), (TX1 - 0.25, TX1)):
    k.box(a, RF - 1.6, 0.0, b, RF, 2.5, ('#b8ac94', 0.12), 'house_wall')
k.box(TX0 + 0.25, RF - 1.6, 1.42, TX1 - 0.25, RF, 2.5, ('#c8bca4', 0.12), 'house_wall')
k.box(TX0 + 0.25, RF - 1.6, 0.0, TX1 - 0.25, RF - 0.05, 0.32, ('#6a5038', 0.12), 'engawa')        # the raised floor's edge
k.box(TX0 + 0.25, RF - 1.6, 0.32, TX1 - 0.25, RF - 0.05, 0.34, ('#b8b070', 0.14), 'floor_tatami')
k.boxes([(x, RF - 1.6, 0.34, x + 0.03, RF - 0.05, 0.345) for x in [TX0 + 1.2 + i * 1.0 for i in range(4)]], '#3a3020', 'tatami_edge')
k.box(TX0 + 0.25, RF - 1.62, 0.34, TX1 - 0.25, RF - 1.58, 1.42, shade('#ffc070', 0.6), 'shoji', emit=('#ffc070', 0.5))
O.lattice(k, TX0 + 0.25, TX1 - 0.25, RF - 1.57, 0.34, 1.42, step=0.22)
k.box(TX0 + 2.1, RF - 1.57, 0.55, TX0 + 2.6, RF - 1.55, 1.3, '#e8e0cc', 'scroll')
k.box(TX0 + 2.2, RF - 1.55, 0.7, TX0 + 2.5, RF - 1.54, 1.2, '#2a2420', 'scroll_ink')
for tx in (TX0 + 1.2, TX0 + 3.6):                                            # low tables, cushions, a cup each side
    k.box(tx - 0.35, RF - 1.05, 0.34, tx + 0.35, RF - 0.55, 0.52, ('#3a2418', 0.1), 'low_table', bevel=0.015)
    for s in (-1, 1):
        k.box(tx + s * 0.55 - 0.18, RF - 0.98, 0.34, tx + s * 0.55 + 0.18, RF - 0.62, 0.4, ('#8a2a3a', 0.1), 'cushion', bevel=0.03)
        k.cyl(tx + s * 0.15, RF - 0.8, 0.52, 0.6, 0.04, '#e8e0d0', 'tea_cup', verts=8)
    k.cyl(tx, RF - 0.8, 0.52, 0.66, 0.07, '#4a5a4a', 'tea_pot', verts=10)
k.cyl(TX1 - 0.9, RF - 1.2, 0.34, 0.5, 0.25, ('#2a2420', 0.1), 'hearth', verts=12)
k.cyl(TX1 - 0.9, RF - 1.2, 0.5, 0.72, 0.15, '#1a1a1e', 'kettle', verts=12)
k.tube((TX1 - 0.9, RF - 1.2, 0.72), (TX1 - 0.9, RF - 1.2, 2.3), 0.012, '#2a2420', 'kettle_hook', verts=4)
st.vent(TX1 - 0.9, RF - 1.2, 0.8)
k.point_light((TX0 + TX1) / 2, RF - 0.6, 1.2, '#ffb868', 30, radius=0.6, group='flicker')
O.pent(k, TX0, TX1, RF + 0.05, 1.55, d=0.45, drop=0.2, col=O.KAWARA[1])
for x in (TX0 + 1.0, TX0 + 2.7, TX0 + 4.4):
    k.box(x - 0.34, RF + 0.01, 1.75, x + 0.34, RF + 0.02, 2.25, shade('#ffc070', 0.5), 'window_paper', emit=('#ffc070', 0.6))
    O.lattice(k, x - 0.34, x + 0.34, RF + 0.02, 1.75, 2.25, step=0.11)
O.gable_roof(k, TX0, TX1, RF - 3.0, RF, 2.5, 1.25, col=O.KAWARA[0], wall='#c8bca4')
O.noren(k, TX0 + 0.5, TX0 + 2.2, RF + 0.04, 1.3, col='#2a4a3a', mark='#e8e0d0')
S.letters(k, '茶', 'DelaGothicOne', TX0 + 4.2, RF + 0.08, 0.95, size=0.36, col='#ffd890', energy=4)
k.box(TX0 + 3.85, RF + 0.04, 0.85, TX0 + 4.55, RF + 0.07, 1.38, '#2a1a12', 'sign_board')
k.solid(TX0, RF - 3.0, TX1, RF - 0.05)

# the lantern maker's: the shop open to the lane, its front hung thick with lanterns of every colour
H = O.shophouse(k, 14.4, 19.0, RF, depth=2.4, ground='open', glow='#ffb070', roof=O.KAWARA[1], upper='slats', rng=rng)
for i in range(11):
    x = 14.8 + i * 0.38
    col = ('#e83a2a', '#f0a030', '#e8d8b0', '#d84a8a', '#3a8ae0', '#e83a2a')[i % 6]
    Y.paper_lantern(k, x, RF + 0.2, 1.12 + (i % 2) * 0.12, col=col, s=0.34 + (i % 3) * 0.05, top=1.45)
k.box(15.2, RF - 0.7, 0.0, 18.2, RF - 0.3, 0.8, ('#4a3020', 0.12), 'work_table')
for x in (15.6, 16.4, 17.4):                                                      # frames and paper on the table
    k.cyl(x, RF - 0.5, 0.8, 1.1, 0.13, '#e8dcc0', 'lantern_frame', emit=('#ffd8a0', 0.25), verts=10)
S.blade(k, '提灯', 'DelaGothicOne', 18.85, RF, 1.6, 1.4, col='#ff7050', w=0.38)

# Hoshi Ramen: a counter on the lane under the pent, stools, the stock pot steaming, bowls stacked
H = O.shophouse(k, 19.0, 25.0, RF, depth=2.4, ground='open', glow='#ff9a50', roof=O.KAWARA[2], upper='frame', balcony=True, rng=rng)
k.box(19.5, RF, 0.0, 24.5, RF + 0.45, 0.92, ('#6a1a1c', 0.08), 'stand_counter', bevel=0.015)
k.box(19.45, RF - 0.05, 0.92, 24.55, RF + 0.52, 0.98, ('#7a5030', 0.14), 'stand_top')
Y.stock_pot(k, 20.0, RF - 0.4, z=0.4)
st.vent(20.0, RF - 0.4, 1.1)
for x in (21.0, 21.4, 23.6):
    Y.bowl(k, x, RF + 0.25, 0.98)
for x in (20.0, 21.0, 22.0, 23.0, 24.0):
    Y.neon_stool(k, x + 0.5, RF + 1.05, seat='#c83a2a')
O.noren(k, 19.6, 24.4, RF + 0.08, 1.38, col='#a02a2a', mark='#f0e8d8')
S.lightbox(k, 'HOSHI RAMEN', 'RussoOne', 22.0, RF + 0.06, 1.85, 2.4, 0.36, bg='#f4e4c8', ink='#a01818', glow='#ffd8a0')
S.blade(k, 'ラーメン', 'DelaGothicOne', 19.15, RF, 1.6, 1.6, col='#ff5050', w=0.4)
k.solid(19.5, RF, 24.5, RF + 0.5)

# an old house, its storm boards up; washing across to the next; a bicycle and a cat on the step
H = O.shophouse(k, 25.0, 29.2, RF, depth=2.0, ground='shutter', roof=O.KAWARA[0], upper='slats', rng=rng)
D.laundry(k, (25.2, RF + 0.3, 2.35), (29.0, RF + 0.3, 2.45), sag=0.2, rng=rng)
O.bicycle(k, 26.2, RF + 0.45)
O.cat(k, 28.3, RF + 0.15, z=0.08)
O.potted_plant(k, 28.9, RF + 0.3, 'bonsai')

# the Loop's Lantern Row station under the viaduct
O.station_block(k, 29.2, 37.2, RF, VZ, name='LANTERN ROW', depth=RF - VR + 0.4)

# the Akachochin izakaya: red lanterns along its eave, sake casks, crates to sit on
H = O.shophouse(k, 37.2, 43.0, RF, depth=2.2, ground='lattice', glow='#ff8a50', roof=O.KAWARA[1], upper='frame', rng=rng, door_x=41.2)
for x in (37.7, 38.6, 39.5, 40.4):
    Y.paper_lantern(k, x, RF + 0.45, 1.2, col='#e02a20', s=0.5, top=1.62)
S.blade(k, '居酒屋', 'DelaGothicOne', 42.85, RF, 1.55, 1.5, col='#ff5a40', w=0.38)
O.noren(k, 40.7, 41.7, RF + 0.08, 1.28, col='#1e2a4a', mark='#e8e0d0', n=3)
O.sake_barrels(k, 38.5, RF + 0.35)
for x in (42.2,):
    k.box(x - 0.2, RF + 0.8, 0.0, x + 0.2, RF + 1.15, 0.38, ('#3a6a9a', 0.1), 'beer_crate')

# the bathhouse: a plain front with the steam's mark on its curtain, its brick chimney behind
H = O.shophouse(k, 43.0, 48.0, RF, depth=2.2, ground='lattice', glow='#a0d8e0', roof=O.KAWARA[2], upper='slats', rng=rng)
k.cyl(46.4, RF - 2.6, 0.0, 6.2, 0.32, ('#6a3a2a', 0.12), 'chimney', verts=12)
k.cyl(46.4, RF - 2.6, 6.2, 6.4, 0.36, '#4a2a20', 'chimney_cap', verts=12)
st.vent(46.4, RF - 2.6, 6.45)
O.noren(k, 44.8, 46.2, RF + 0.08, 1.28, col='#1e4a8a', mark='#f0f0f0', n=3)
S.letters(k, 'ゆ', 'DelaGothicOne', 45.5, RF + 0.11, 1.0, size=0.26, col='#f8f8ff', lit=False)

# the kampo herbalist: herbs drying under the eave, jars in the window
H = O.shophouse(k, 48.0, 54.0, RF, depth=2.2, ground='lattice', glow='#d0e090', roof=O.KAWARA[0], upper='frame', balcony=True, rng=rng)
for i in range(12):
    x = 48.3 + i * 0.45
    k.tube((x, RF + 0.35, 1.45), (x, RF + 0.35, 1.2), 0.008, '#3a2a1a', 'herb_string', verts=3)
    k.blob(x, RF + 0.35, 1.13, 0.08, 0.06, 0.1, (('#5a7a3a', '#8a6a3a', '#6a8a4a')[i % 3], 0.2), 'herb_bundle', segs=6)
S.blade(k, '漢方', 'DelaGothicOne', 53.85, RF, 1.55, 1.4, col='#a0e070', w=0.38)

# a tall old house with a balcony of plants; the quarter's name up its corner
H = O.shophouse(k, 54.0, 59.4, RF, depth=2.4, ground='lattice', glow='#ffc080', roof=O.KAWARA[1], upper='frame', rng=rng,
                storeys=3, balcony=True)
for x in (54.6, 55.4, 57.8, 58.6):
    O.potted_plant(k, x, RF + 0.3, 'bamboo' if x < 56 else 'bonsai', s=0.85)
S.blade(k, '灯籠通り', 'DelaGothicOne', 59.25, RF, 1.5, 2.4, col='#ffb050', w=0.46, stand=0.3)

# the east end: the District's neon creeping in — a newer building, the way through to the neon street
D.frontage(k, st, 59.4, COLS + 0.5, RF, floors=4, kind='glass', trim=Y.CYAN, door_x=60.6, glow='#4a8ab0', sign_floor=True,
           roof=('dish', 'antenna'), wall='#2a3040', clad='tile', window_neon=Y.CYAN, rng=rng)
S.lightbox(k, 'LANTERN ROW  L0', 'RussoOne', 62.0, RF + 0.02, 1.48, 3.6, 0.42, bg='#f4e8d0', ink='#a01818', glow='#ffd8a0')
for (a, b) in (((60.0, RF + 0.08, 3.4), (63.8, RF + 0.08, 3.2)),):
    D.cable(k, a, b, sag=0.2, lights=(Y.CYAN, Y.PINK))
for (x, z) in ((5.0, 2.0), (17.5, 2.2), (52.0, 2.2)):
    D.ac_unit(k, x, RF, z)

# small life along the houses: fire buckets, a vending machine at the station, crates by the izakaya, a menu board
for i, (dx, dz) in enumerate(((0.0, 0.0), (0.3, 0.0), (0.6, 0.0), (0.15, 0.24), (0.45, 0.24), (0.3, 0.48))):
    k.cyl(24.6 + dx, RF + 0.3, dz, dz + 0.24, 0.13, ('#c8301e', 0.08), 'fire_bucket', verts=10)
k.solid(24.4, RF, 25.5, RF + 0.5)
Y.vending_machine(k, 29.75, RF + 0.02, w=0.8, body='#2a3a5a')
k.solid(29.3, RF, 30.2, RF + 0.7)
for (x, z) in ((42.6, 0.0), (42.6, 0.38), (43.1, 0.0)):
    k.box(x - 0.2, RF + 0.2, z, x + 0.2, RF + 0.6, z + 0.38, ('#3a6a9a', 0.1), 'beer_crate')
k.box(18.2, RF + 0.4, 0.0, 18.7, RF + 0.62, 0.7, ('#2a1a12', 0.1), 'a_board', bevel=0.01)
k.box(18.23, RF + 0.62, 0.1, 18.67, RF + 0.63, 0.64, '#1a0c10', 'a_board_face', emit=('#ffb070', 0.35))

# ---- the south side: market stalls, the Jizo, and the promenade along the railing ------------------------------------
O.goldfish_stall(k, 3.6, 6.4, 13.9, 15.1)
O.market_stall(k, 9.6, 12.6, 13.9, 15.0, goods='veg', awning=('#2a5a8a', '#e8e0d0'))
# a red parasol over a bench for the tea house's customers
k.cyl(16.2, 14.6, 0.0, 2.0, 0.035, O.TIMBER, 'parasol_pole', verts=6)
k.cone(16.2, 14.6, 1.75, 2.2, 1.0, 0.04, ('#c8301e', 0.08), 'parasol', verts=16)
k.box(15.0, 14.8, 0.0, 17.4, 15.3, 0.42, ('#a02a1e', 0.1), 'bench_red')
k.box(14.9, 14.75, 0.42, 17.5, 15.35, 0.46, '#e8d8c0', 'bench_cloth')
k.solid(15.0, 14.8, 17.4, 15.3)
O.market_stall(k, 19.4, 22.4, 13.9, 15.0, goods='dried', awning=('#6a3a1a', '#e8d8b0'))
O.market_stall(k, 25.6, 28.6, 13.9, 15.0, goods='charms', awning=('#b8341e', '#f0e8d8'))
D.food_cart(k, 33.4, 14.6, col='#e83a2a')
st.vent(33.4, 14.4, 1.2)
O.market_stall(k, 38.6, 41.6, 13.9, 15.0, goods='fruit', awning=('#3a7a3a', '#e8e0d0'))
O.stone_lantern(k, 45.0, 14.6, h=1.1)
O.stone_lantern(k, 47.6, 14.6, h=1.1)
k.box(45.8, 14.2, 0.0, 46.8, 15.0, 0.3, ('#5a5660', 0.12), 'jizo_plinth')                        # the Jizo, red-bibbed
k.blob(46.3, 14.6, 0.62, 0.2, 0.18, 0.32, ('#7a7682', 0.12), 'jizo', segs=12)
k.sphere(46.3, 14.6, 1.02, 0.16, 0.15, '#86828e', 'jizo_head', segs=12)
k.box(46.12, 14.76, 0.62, 46.48, 14.8, 0.84, '#c8301e', 'jizo_bib')
for x in (45.95, 46.65):
    k.cyl(x, 14.9, 0.3, 0.36, 0.05, '#e8e0d0', 'offering', verts=8)
k.solid(45.8, 14.2, 46.8, 15.0)
O.potted_plant(k, 51.0, 14.6, 'bamboo', s=1.1)
O.potted_plant(k, 51.6, 14.7, 'bamboo', s=0.9)
O.bicycle(k, 55.0, 14.8, col='#c03a3a')
O.bicycle(k, 56.0, 14.8)
O.cat(k, 52.6, 14.9, col='#2a2a30')


# the promenade: benches facing the drop, a coin viewer, the old balustrade with a lantern on every fourth post
def bench(x0, x1, cr):
    k.box(x0, cr - 0.2, 0.36, x1, cr + 0.2, 0.42, ('#6a4a2c', 0.14), 'bench_seat')
    k.box(x0, cr - 0.24, 0.42, x1, cr - 0.18, 0.78, ('#6a4a2c', 0.14), 'bench_back')
    for x in (x0 + 0.1, x1 - 0.1):
        k.box(x - 0.05, cr - 0.2, 0.0, x + 0.05, cr + 0.2, 0.36, '#3a3a44', 'bench_leg')
    k.solid(x0, cr - 0.24, x1, cr + 0.2)


for (a, b) in ((7.4, 9.0), (22.6, 24.2), (42.0, 43.6), (58.0, 59.6)):
    bench(a, b, 16.7)
VX, VR2 = 30.5, 17.35
k.cyl(VX, VR2, 0.0, 0.08, 0.2, '#2a2a3e', 'viewer_base', verts=12)
k.cyl(VX, VR2, 0.08, 1.0, 0.06, '#3a3a52', 'viewer_post', verts=8)
k.blob(VX, VR2, 1.12, 0.24, 0.15, 0.12, ('#8a2a1e', 0.08), 'viewer_head', segs=12)
for s in (-1, 1):
    k.cyl_y(VX + s * 0.1, VR2 + 0.1, VR2 + 0.22, 1.14, 0.055, 0.055, '#1a1a22', 'viewer_lens', verts=10)
k.solid(VX - 0.2, VR2 - 0.2, VX + 0.2, VR2 + 0.2)
k.box(-0.5, RAIL, 0.0, COLS + 0.5, RAIL + 0.3, 0.3, ('#4e4a54', 0.1), 'curb')
x = 0.4
i = 0
while x < COLS:
    k.box(x - 0.09, RAIL + 0.06, 0.3, x + 0.09, RAIL + 0.24, 1.0, ('#5a5660', 0.12), 'baluster_post')
    if i % 4 == 0:
        Y.paper_lantern(k, x, RAIL + 0.15, 1.28, col='#f0a030', s=0.38, top=1.52)
        k.box(x - 0.04, RAIL + 0.13, 1.0, x + 0.04, RAIL + 0.17, 1.55, O.TIMBER, 'lantern_pole')
    x += 1.6
    i += 1
k.box(-0.5, RAIL + 0.08, 0.9, COLS + 0.5, RAIL + 0.22, 0.98, ('#5a3a24', 0.12), 'rail')
k.solid(-0.5, RAIL, COLS + 0.5, RAIL + 0.3)


# ---- overhead: strings of paper lanterns across the lane ---------------------------------------------------------
def lantern_string(xa, xb, n=5, za=2.4, zb=2.25, ra=RF + 0.3, rb=13.85, cols=('#e83a2a', '#f0a030', '#e83a2a', '#ffd070')):
    pts = []
    for i in range(9):
        t = i / 8
        pts.append((xa + (xb - xa) * t, ra + (rb - ra) * t, za + (zb - za) * t - 0.35 * math.sin(math.pi * t)))
    for a, b in zip(pts, pts[1:]):
        k.tube(a, b, 0.016, '#1a1414', 'cable', verts=4)
    for j in range(n):
        t = (j + 1) / (n + 1)
        x, r, z = xa + (xb - xa) * t, ra + (rb - ra) * t, za + (zb - za) * t - 0.35 * math.sin(math.pi * t)
        Y.paper_lantern(k, x, r, z - 0.32, col=cols[j % len(cols)], s=0.52, top=z)


for (xa, xb) in ((4.6, 5.0), (12.0, 11.0), (17.0, 17.6), (26.6, 27.0), (39.2, 39.8), (45.0, 44.4), (50.6, 51.0), (56.2, 55.6)):
    lantern_string(xa, xb)
for x in (5.0, 11.0, 17.6, 27.0, 39.8, 44.4, 51.0, 55.6):                    # the poles the strings hang from, by the stalls
    if x in (5.0, 11.0, 27.0, 39.8):
        continue                                                           # (the stalls' own posts take these)
    k.cyl(x, 13.85, 0.0, 2.4, 0.05, O.TIMBER, 'lantern_pole', verts=6)
    k.solid_post(x, 13.85)

# ---- light -------------------------------------------------------------------------------------------------------
for (x, c) in ((6.0, '#ff9050'), (16.0, '#ffb060'), (25.0, '#ff7a40'), (33.0, '#80d0ff'), (40.0, '#ff6040'), (50.0, '#ffb070'),
               (58.0, '#ff9060')):
    k.point_light(x, 11.5, 2.8, c, 34, radius=1.0)
k.area_light(COLS / 2, 6.0, 12.0, '#7058b8', 1100 * COLS / 44, COLS + 2.0, rot=(math.radians(-35), 0, 0))     # the city's glow
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.78}}, light_samples=128, world_light=('#241a40', 0.45))

# ---- the world -------------------------------------------------------------------------------------------------------
def dialog(x, y, label, prompt, text):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = {'name': 'Lantern Row', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
     'spawns': {'player': [62, 11]}, 'shipExit': False, 'tiles': [], 'collisions': [], 'tileNames': {},
     'interactions': [
         {'x': 63, 'y': 11, 'type': 'enter_world', 'target': 'arcadia-street', 'spawn': [1, 10], 'label': 'THE NEON STREET',
          'prompt': 'PRESS E TO WALK ON'},
         {'x': 8, 'y': 8, 'type': 'enter_world', 'target': 'arcadia-oldquarter-shrine', 'spawn': [11, 9], 'label': 'SHRINE STEPS',
          'prompt': 'PRESS E TO CLIMB'},
         dialog(11, 8, 'GRANNY UME', 'PRESS E TO TALK', 'AN OLD WOMAN KNEELS BY THE KETTLE, POURING.'),
         {'x': 13, 'y': 8, 'type': 'vendor', 'label': 'TEA HOUSE', 'prompt': 'PRESS E FOR TEA',
          'items': [{'id': 'green_tea', 'price': 4}, {'id': 'matcha', 'price': 8}, {'id': 'mochi', 'price': 6}]},
         {'x': 15, 'y': 8, 'type': 'vendor', 'label': 'LANTERNS', 'prompt': 'PRESS E TO BROWSE',
          'items': [{'id': 'paper_lantern', 'price': 30}, {'id': 'omamori', 'price': 20}]},
         dialog(17, 8, 'THE LANTERN MAKER', 'PRESS E TO TALK', 'HE IS GLUING PAPER TO A FRAME, ONE RIB AT A TIME.'),
         {'x': 21, 'y': 9, 'type': 'vendor', 'label': 'HOSHI RAMEN', 'prompt': 'PRESS E TO ORDER',
          'items': [{'id': 'shoyu_ramen', 'price': 10}, {'id': 'spore_ramen', 'price': 14}, {'id': 'green_tea', 'price': 4}]},
         dialog(22, 8, 'OLD HOSHI', 'PRESS E TO TALK', 'THE COOK WIPES THE COUNTER AND NODS AT A STOOL.'),
         dialog(27, 8, 'SHUTTERED HOUSE', 'PRESS E TO LOOK',
                'STORM BOARDS UP, A BICYCLE CHAINED TO THE POST, A CAT ON THE STEP WHO DOES NOT MOVE FOR YOU. A NOTE IN THE '
                'BOARDS SAYS "BACK IN THE SPRING". IT DOES NOT SAY WHICH SPRING.'),
         {'x': 33, 'y': 8, 'type': 'loop_station', 'station': 'lantern', 'label': 'THE LOOP', 'prompt': 'PRESS E TO TAKE THE LOOP'},
         dialog(36, 8, 'DEPARTURES', 'PRESS E TO READ',
                'THE LOOP · LANTERN ROW · L0\n\nTERRACES ......... 2 MIN\nSPACEPORT ........ 5 MIN\n\nTHE TRAIN COMES ROUND '
                'EVERY FEW MINUTES. MIND THE GAP. MIND THE CAT.'),
         dialog(40, 8, 'MAMA KEIKO', 'PRESS E TO TALK', 'THE IZAKAYA\'S OWNER LEANS IN THE DOORWAY WITH HER ARMS FOLDED.'),
         {'x': 41, 'y': 8, 'type': 'vendor', 'label': 'AKACHOCHIN', 'prompt': 'PRESS E TO ORDER',
          'items': [{'id': 'yakitori', 'price': 7}, {'id': 'warm_sake', 'price': 9}, {'id': 'green_tea', 'price': 4}]},
         dialog(45, 8, 'THE BATHHOUSE', 'PRESS E TO LOOK',
                'WARM AIR AND THE SMELL OF CEDAR THROUGH THE CURTAIN. A SIGN: "OPEN TILL THE LAST TRAIN. NO CHROME IN THE BATH."'),
         {'x': 51, 'y': 8, 'type': 'vendor', 'label': 'KAMPO', 'prompt': 'PRESS E TO BROWSE',
          'items': [{'id': 'herbal_tonic', 'price': 18}, {'id': 'green_tea', 'price': 4}]},
         dialog(57, 8, 'OLD HOUSE', 'PRESS E TO LOOK',
                'THREE STOREYS OF TIMBER, OLDER THAN THE TOWERS. SOMEONE HAS GROWN BAMBOO ON EVERY LEDGE.'),
         {'x': 5, 'y': 13, 'type': 'goldfish', 'label': 'GOLDFISH SCOOP', 'prompt': 'PRESS E TO TRY'},
         dialog(11, 13, 'GREENGROCER', 'PRESS E TO LOOK',
                'GREENS FROM VERDANCE, THE LABEL SAYS, AND EVERYONE ROUND HERE KNOWS WHICH FARM.'),
         dialog(21, 13, 'DRIED GOODS', 'PRESS E TO LOOK', 'MUSHROOMS, KELP, PERSIMMONS ON STRINGS. A JAR OF SOMETHING LABELLED ONLY "NO".'),
         {'x': 27, 'y': 13, 'type': 'vendor', 'label': 'CHARM STALL', 'prompt': 'PRESS E TO BROWSE',
          'items': [{'id': 'omamori', 'price': 20}]},
         {'x': 33, 'y': 13, 'type': 'vendor', 'label': 'YAKITORI CART', 'prompt': 'PRESS E TO ORDER',
          'items': [{'id': 'yakitori', 'price': 7}]},
         dialog(40, 13, 'FRUIT STALL', 'PRESS E TO LOOK', 'PERSIMMONS, LOQUATS, AND A SINGLE STARFRUIT UNDER GLASS LIKE A JEWEL.'),
         dialog(46, 14, 'JIZO', 'PRESS E TO LOOK',
                'A LITTLE STONE FIGURE IN A RED BIB, WORN SMOOTH. SOMEONE HAS LEFT HIM A CUP OF TEA AND A COIN. THE TEA IS STILL WARM.'),
         dialog(30, 16, 'VIEWER', 'PRESS E TO LOOK',
                'DOWN PAST THE RAILING THE CITY FALLS AWAY IN LIGHTS. UP ABOVE, THE TOWERS LEAN IN OVER LANTERN ROW LIKE TALL '
                'RELATIONS AT A SMALL TABLE.'),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
for (c, r) in ((11, 8), (17, 8), (22, 8), (40, 8)):            # the people behind their counters and in their doorways
    k.solid(c, r, c + 1, r + 1)
apply_world(WORLD, k, (0, int(RF), COLS - 1, int(RAIL) - 1), scene_id=WID,
            actors=[{'sheet': 'npc-ume', 'x': 11, 'y': 8, 'facing': 'down'},
                    {'sheet': 'npc-lanternmaker', 'x': 17, 'y': 8, 'facing': 'down'},
                    {'sheet': 'npc-hoshi', 'x': 22, 'y': 8, 'facing': 'down'},
                    {'sheet': 'npc-keiko', 'x': 40, 'y': 8, 'facing': 'down'}],
            scene_extra={'backdrop': True, 'steam': st.steam})
w = json.load(open(WORLD))
w['view'] = [-0.5, -3.0, COLS + 0.5, ROWS + 0.4]
w['loop'] = {'track': [29.2, 37.2, VR, VZ]}                     # where js/transit.js stops the Loop's train
w['skyline'] = {'baseRow': 4.2, 'railRow': RAIL + 0.3, 'centerCol': COLS / 2,
                'rain': {'drops': 150, 'splash': [0, RF + 0.3, COLS, RAIL - 0.2]}}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('lantern row done')
