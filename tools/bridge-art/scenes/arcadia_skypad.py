"""Arcadia Skyport 7 — Blender scene (world id "arcadia-skypad").

  BVENV/bin/python tools/bridge-art/scenes/arcadia_skypad.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-skypad

Where the skiff sets down in Arcadia: a landing pad on top of a tower,
ringed with beacons, the city's towers rising round it (js/skyline.js) and
its streets glittering far below. The marshal's booth, fuel line, cargo,
rooftop machinery, the back of a giant billboard — and the lift down to
the District's Skywalk.
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
import assets_ship as P                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_arcadia_rich as AR       # noqa: E402
import random                          # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'arcadia-skypad.json')
COLS, ROWS = 29, 16                                  # the roof's 24, and the skybridge east to the Terraces
k = Kit(COLS, ROWS, margin_top=1.5, margin_bottom=1.0, margin_x=0.5, seed=241)
st = D.Street()
RX0, RX1, RR0, RR1 = 1.0, 23.0, 2.0, 14.0          # the roof

# ---- the roof deck ------------------------------------------------------------------------------------
gr = random.Random(2410)                                    # the roof's own dice
k.wet = dict(AR.WET, paving=0.3)
AR.paving(k, RX0, RR0, RX1, RR1, size=1.0, rng=gr, tones=('#36323f', '#302c3a', '#3a3644', '#2e2a38'), seam='#24202d', crack=0.06,
          sunk=0.03, stain=0.1)
k.box(RX0 - 0.15, RR0 - 0.15, -6.0, RX1 + 0.15, RR1 + 0.15, -0.1, ('#1e1a2a', 0.08), 'tower_top')
# painted on the roof: a walkway from the lift to the pad and on to the booth, keep-clear hatching round the machinery
AR.hazard_stripes(k, 1.45, 10.75, 4.15, 12.25)
AR.hazard_stripes(k, 20.35, 10.85, 21.65, 12.35)
AR.hazard_stripes(k, 10.45, 12.05, 13.55, 12.25)
for x in range(3, 22, 4):                                                       # roof drains
    k.box(x - 0.15, RR1 - 0.35, 0.0, x + 0.15, RR1 - 0.15, 0.004, '#120e18', 'drain')
    k.boxes([(x - 0.13 + i * 0.05, RR1 - 0.33, 0.004, x - 0.11 + i * 0.05, RR1 - 0.17, 0.008) for i in range(6)], '#2e2a38', 'drain_grate')
# the tower's face falling away below the front edge, windows lit
rects = []
for i in range(int((RX1 - RX0) / 0.5)):
    for j in range(5):
        if k.rng.random() < 0.45:
            x = RX0 + 0.15 + i * 0.5
            rects.append((x, RR1 + 0.15, -0.6 - j * 0.9, x + 0.25, RR1 + 0.17, -0.25 - j * 0.9))
k.boxes(rects, shade('#ffd890', 0.5), 'tower_window', emit=('#ffd890', 0.7))
k.boxes([(RX0 - 0.15, RR1 + 0.15, -0.95 - j * 0.9, RX1 + 0.15, RR1 + 0.22, -0.88 - j * 0.9) for j in range(5)], '#2e2a40', 'tower_band')
# parapet + rail round the edge, with a neon strip
SB0, SB1 = 6.8, 9.7                                  # the skybridge's mouth in the east parapet
for (a, b, c, d) in ((RX0 - 0.15, RR1, RX1 + 0.15, RR1 + 0.15), (RX0 - 0.15, RR0 - 0.15, RX0, RR1), (RX1, RR0 - 0.15, RX1 + 0.15, SB0),
                     (RX1, SB1, RX1 + 0.15, RR1)):
    k.box(a, b, 0.0, c, d, 0.35, ('#3a3644', 0.06), 'parapet')
k.box(RX0 - 0.15, RR1 + 0.1, 0.3, RX1 + 0.15, RR1 + 0.16, 0.34, shade(Y.CYAN, 0.4), 'parapet_neon', emit=(Y.CYAN, 0.8))
x = RX0
while x <= RX1:
    k.box(x - 0.03, RR1 + 0.04, 0.35, x + 0.03, RR1 + 0.1, 0.95, '#4a4a58', 'rail_post')
    x += 1.0
k.box(RX0 - 0.1, RR1 + 0.03, 0.92, RX1 + 0.1, RR1 + 0.11, 0.97, '#5a5a68', 'rail')

# ---- the pad ---------------------------------------------------------------------------------------------
PX, PR = 12.0, 8.2
k.cyl(PX, PR, 0.0, 0.03, 3.2, ('#22202e', 0.06), 'pad', verts=48)
k.cyl(PX, PR, 0.03, 0.035, 3.0, '#2e2a3a', 'pad_inner', verts=48)
for i in range(32):
    a = i * math.pi / 16
    k.cyl(PX + math.cos(a) * 3.05, PR + math.sin(a) * 3.05, 0.03, 0.07, 0.07, '#103038',
          'pad_light', emit=((Y.CYAN if i % 2 else Y.YEL), 0.95), verts=8)
for (dx0, dx1) in ((-0.9, -0.6), (0.6, 0.9)):                  # the H
    k.box(PX + dx0, PR - 1.0, 0.035, PX + dx1, PR + 1.0, 0.04, '#e8e0c0', 'pad_mark')
k.box(PX - 0.6, PR - 0.15, 0.035, PX + 0.6, PR + 0.15, 0.04, '#e8e0c0', 'pad_mark')
pts = [(PX + math.cos(i * math.tau / 48) * 2.3, PR + math.sin(i * math.tau / 48) * 2.3) for i in range(49)]
for a, b in zip(pts, pts[1:]):                                                  # the touchdown ring, dashed
    if pts.index(a) % 3 != 2:
        k.bar(a[0], a[1], b[0], b[1], 0.035, 0.04, 0.09, '#d8b030', 'pad_mark')
for (a, b) in (((PX + 1.75, PR - 3.05), (PX + 2.55, PR - 3.05)), ((PX + 2.55, PR - 3.05), (PX + 2.0, PR - 2.25))):
    k.bar(a[0], a[1], b[0], b[1], 0.035, 0.04, 0.1, '#e8e0c0', 'pad_mark')            # a big 7 by the ring
for i in range(8):                                                              # tie-down rings round the pad
    a = i * math.tau / 8 + 0.2
    k.cyl(PX + math.cos(a) * 2.7, PR + math.sin(a) * 2.7, 0.03, 0.05, 0.05, '#5a5a66', 'tiedown', verts=8)
with k.variant('shuttle', 'parked'):
    P.shuttle(k, PX - 1.7, PR - 0.1)
k.solid(PX - 1.8, PR - 1.1, PX + 2.0, PR + 0.9)
# beacons on posts at the four corners of the pad, marshal wands on a stand
for (dx, dr) in ((-3.6, -3.0), (3.6, -3.0), (-3.6, 3.0), (3.6, 3.0)):
    x, r = PX + dx, PR + dr
    k.cyl(x, r, 0.0, 1.2, 0.05, '#3a3a44', 'beacon_post', verts=6)
    k.sphere(x, r, 1.28, 0.1, 0.1, '#ff5040', 'beacon', emit=('#ff5040', 1.0), segs=8)
    k.point_light(x, r + 0.2, 1.3, '#ff5040', 10, radius=0.1, group='flicker')
    k.solid(x - 0.2, r - 0.2, x + 0.2, r + 0.2)

# ---- the marshal's booth ---------------------------------------------------------------------------------
BX0, BX1, BR0, BR1 = 2.0, 6.0, 2.2, 4.6
k.box(BX0, BR0, 0.0, BX1, BR1, 2.2, ('#2a3040', 0.08), 'booth')
k.box(BX0 + 0.3, BR1, 0.9, BX1 - 0.3, BR1 + 0.02, 1.8, '#0c2030', 'booth_glass', emit=('#2a6a8a', 0.6))
k.box(BX0 - 0.1, BR0 - 0.1, 2.2, BX1 + 0.1, BR1 + 0.3, 2.35, ('#3a3a48', 0.06), 'booth_roof')
S.lightbox(k, 'SKYPORT 7', 'RussoOne', (BX0 + BX1) / 2, BR1 + 0.3, 2.0, 2.6, 0.38, bg='#f0e8c0', ink='#1a1a3a', glow='#ffe0a0')
k.blob((BX0 + BX1) / 2 - 0.6, BR1 - 0.1, 1.25, 0.15, 0.05, 0.25, '#14101c', 'marshal_silhouette', segs=8)
k.boxes([(x - 0.02, BR1, 0.9, x + 0.02, BR1 + 0.04, 1.8) for x in (BX0 + 1.1, BX0 + 2.0, BX0 + 2.9)], '#3a3a48', 'booth_mullion')
D.ac_unit(k, BX0 + 0.35, BR1, 1.95)
D.dish(k, BX1 - 0.5, BR0 + 0.6, 2.35)
AR.pipe(k, BX1 - 0.1, BR1, 0.0, 2.2)
for (x, col) in ((BX1 - 0.25, '#ff8030'), (BX1 - 0.12, '#ff8030')):            # the marshal's light wands in their rack
    k.cyl(x, BR1 + 0.1, 0.8, 1.25, 0.02, shade(col, 0.5), 'wand', emit=(col, 0.9), verts=6)
k.box(BX1 - 0.32, BR1 + 0.02, 0.7, BX1 - 0.05, BR1 + 0.18, 0.8, '#2a2832', 'wand_rack')
A.crate(k, BX1 + 0.3, BR1 - 0.3, s=0.55, tone='#4a5468')
A.crate(k, BX1 + 0.9, BR1 - 0.1, s=0.5, tone='#5a4a38')
k.solid(BX0, BR0, BX1, BR1)
k.solid(BX1, BR1 - 0.6, BX1 + 1.2, BR1 + 0.2)

# ---- the lift down to the Skywalk ---------------------------------------------------------------------------
LX0, LX1, LR0, LR1 = 18.0, 21.0, 2.2, 4.4
k.box(LX0, LR0, 0.0, LX1, LR1, 2.6, ('#1e2a40', 0.08), 'lift_head')
k.box(LX0 + 0.6, LR1, 0.0, LX1 - 0.6, LR1 + 0.03, 1.9, '#0c1a22', 'lift_door', emit=('#1a5a6a', 0.6))
k.box((LX0 + LX1) / 2 - 0.02, LR1 + 0.03, 0.0, (LX0 + LX1) / 2 + 0.02, LR1 + 0.05, 1.9, '#2a3a44', 'lift_seam')
S.letters(k, 'LIFT', 'Audiowide', (LX0 + LX1) / 2, LR1, 2.0, size=0.34, col=Y.CYAN_L)
k.box(LX1 - 0.4, LR1, 1.0, LX1 - 0.25, LR1 + 0.04, 1.2, '#0c2030', 'lift_button', emit=(Y.YEL, 0.9))
k.solid(LX0, LR0, LX1, LR1)

# ---- the penthouse's private entrance: a glass-and-brass kiosk on the back edge (js/home.js puts its door here) ----------
GX0, GX1, GR0, GR1 = 9.3, 12.7, 2.0, 3.0
k.box(GX0, GR0, 0.0, GX1, GR1, 2.4, ('#1a1626', 0.08), 'ph_kiosk')
k.box(GX0 + 0.12, GR1, 0.2, GX1 - 0.12, GR1 + 0.02, 2.2, ('#3a5060', 0.02), 'ph_glass', emit=('#1a2a3a', 0.4))
k.box(10.45, GR1 + 0.02, 0.0, 11.55, GR1 + 0.05, 2.0, ('#d8b060', 0.3), 'ph_door_frame')
k.box(10.55, GR1 + 0.05, 0.0, 11.45, GR1 + 0.07, 1.9, '#2a1a0c', 'ph_door', emit=('#ffd8a0', 0.25))
k.box(GX0 - 0.1, GR0 - 0.1, 2.4, GX1 + 0.1, GR1 + 0.35, 2.5, ('#d8b060', 0.3), 'ph_canopy')
S.lightbox(k, 'PENTHOUSE', 'RussoOne', (GX0 + GX1) / 2, GR1 + 0.35, 2.55, 2.8, 0.32, bg='#1a1626', ink='#ffd890', glow='#ffd890')
k.point_light(11.0, GR1 + 0.8, 1.6, '#ffd8a0', 18, radius=0.3)
k.solid(GX0, GR0, GX1, GR1)

# ---- rooftop machinery, a mast, the back of a billboard ---------------------------------------------------------
for (x, r) in ((2.2, 11.5), (3.4, 11.5), (21.0, 11.6)):
    k.box(x - 0.45, r - 0.4, 0.0, x + 0.45, r + 0.4, 0.8, ('#6a6a76', 0.08), 'hvac')
    k.cyl(x, r, 0.8, 0.83, 0.32, '#2a2a32', 'hvac_fan', verts=14)
    st.vent(x, r, 0.9)
k.solid(1.7, 11.0, 3.9, 12.0)
k.solid(20.5, 11.1, 21.5, 12.1)
k.cyl(8.0, 3.0, 0.0, 4.5, 0.08, '#3a3a44', 'mast', verts=8)
for z in (2.0, 3.0, 4.0):
    k.box(7.6, 2.96, z, 8.4, 3.04, z + 0.04, '#3a3a44', 'mast_arm')
k.sphere(8.0, 3.0, 4.6, 0.09, 0.09, Y.RED, 'mast_light', emit=(Y.RED, 1.0), segs=8)
k.solid(7.5, 2.5, 8.5, 3.5)
k.box(13.5, 2.2, 0.0, 17.0, 2.5, 3.2, ('#24202e', 0.1), 'billboard_back')
for x in (14.0, 16.5):
    k.box(x - 0.08, 2.5, 0.0, x + 0.08, 3.0, 3.0, '#3a3a44', 'billboard_strut')
k.solid(13.5, 2.2, 17.0, 3.0)
D.cable(k, (8.0, 3.0, 4.2), (13.5, 2.4, 3.0), sag=0.4, lights=(Y.PINK, Y.CYAN, Y.YEL), n=12)
D.cable(k, (8.0, 3.0, 3.6), (2.2, 2.4, 2.2), sag=0.3, lights=(Y.YEL, Y.PINK), n=10)
AR.puddles(k, ((6.0, 12.4, 0.8, 0.3, Y.CYAN), (18.5, 12.9, 0.6, 0.25, Y.PINK), (14.6, 11.5, 0.5, 0.2, Y.PURP)))
k.box(10.6, 12.2, 0.0, 13.4, 13.6, 0.05, '#1a1a24', 'fuel_mat')
k.cyl(11.0, 12.8, 0.0, 0.9, 0.28, ('#c8a020', 0.08), 'fuel_tank', verts=12)
k.tube((11.2, 12.6, 0.6), (11.9, 10.4, 0.05), 0.04, '#1a1a1a', 'fuel_hose', verts=6)
k.solid(10.6, 12.4, 11.6, 13.4)

AR.planter(k, 8.2, 4.4, glow=Y.YEL)                                     # a little garden by the penthouse's door
AR.planter(k, 13.8, 4.4, leaf='#3a6048', glow=Y.PINK)
AR.windsock(k, 22.2, 2.8)
for (x, r0, r1) in ((1.35, 5.2, 10.2), (22.65, 4.8, 6.3)):                      # ducts along the parapets on stands (the east one short: the way to the Terraces)
    k.box(x - 0.25, r0, 0.35, x + 0.25, r1, 0.75, ('#6a6a76', 0.08), 'duct', bevel=0.02)
    k.boxes([(x - 0.27, r, 0.33, x + 0.27, r + 0.06, 0.77) for r in [r0 + 0.2 + i * 0.8 for i in range(int((r1 - r0) / 0.8) + 1)] if r < r1],
            '#4a4a56', 'duct_band')
    for r in [r0 + 0.5 + i * 1.6 for i in range(int((r1 - r0) / 1.6) + 1)]:
        if r < r1:
            k.box(x - 0.2, r - 0.04, 0.0, x + 0.2, r + 0.04, 0.35, '#3a3a44', 'duct_stand')
    k.solid(x - 0.3, r0, x + 0.3, r1)
CX0, CX1, CR0, CR1 = 2.0, 3.7, 7.7, 9.5                                          # a cargo container, waiting for a lifter
k.box(CX0, CR0, 0.0, CX1, CR1, 1.6, ('#2a5a8a', 0.1), 'container')
k.boxes([(x, CR1, 0.1, x + 0.05, CR1 + 0.03, 1.52) for x in [CX0 + 0.12 + i * 0.16 for i in range(10)]], '#3a6a9a', 'corrugation')
k.box(CX0 - 0.02, CR0, 1.56, CX1 + 0.02, CR1 + 0.03, 1.62, '#1e4064', 'container_rail')
k.box(CX0 + 0.3, CR1 + 0.03, 0.9, CX1 - 0.3, CR1 + 0.04, 1.25, '#e8e0d0', 'container_label')
k.box(CX0 + 0.4, CR1 + 0.04, 1.0, CX1 - 0.4, CR1 + 0.045, 1.15, '#1a1a1a', 'container_label_text')
k.solid(CX0, CR0, CX1, CR1)
for (x, r) in ((6.8, 11.0), (17.2, 11.0)):
    AR.floodlight(k, x, r, aim=-1)
B_X = 7.5                                                                       # cargo waiting for a skiff
A.crate(k, B_X, 12.6, s=0.6, tone='#4a5468')
A.crate(k, B_X + 0.7, 12.7, s=0.55, tone='#5a4a38')
A.crate(k, B_X + 0.3, 12.65, s=0.45, tone='#3a4a5a')
AR.gas_bottles(k, 13.95, 12.75, n=2, col='#d8b030')
AR.puddles(k, ((4.6, 10.0, 0.6, 0.22, Y.CYAN), (20.2, 8.6, 0.5, 0.2, Y.PINK), (9.6, 12.95, 0.4, 0.16, Y.YEL)))
AR.pigeons(k, 5.0, 9.5, n=3, rng=gr)
AR.pigeons(k, 19.0, 9.8, n=2, rng=gr)
AR.chairs_and_crate(k, 4.2, 6.3, rng=gr)                                       # where the marshal takes a break
Y.metal_bench(k, 2.4, 4.2, 13.35, neon=Y.PINK)                                  # a bench at the edge, facing the drop
AR.planter(k, 21.3, 13.05, leaf='#2a5a48', glow=Y.CYAN)
# a baggage tug and its trailer, parked by the pad
TX, TR = 5.6, 8.4
k.box(TX - 0.45, TR - 0.3, 0.12, TX + 0.45, TR + 0.3, 0.55, ('#d8a020', 0.06), 'tug_body', bevel=0.05)
k.box(TX - 0.2, TR - 0.26, 0.55, TX + 0.35, TR + 0.26, 0.95, '#141c2c', 'tug_cab', emit=('#2a4060', 0.3), bevel=0.04)
k.box(TX - 0.22, TR - 0.28, 0.95, TX + 0.37, TR + 0.28, 1.0, ('#d8a020', 0.06), 'tug_roof')
k.sphere(TX - 0.08, TR, 1.04, 0.05, 0.04, '#ff8030', 'tug_beacon', emit=('#ff8030', 1.0), segs=6)
for (dx, dr) in ((-0.3, -0.3), (0.3, -0.3), (-0.3, 0.3), (0.3, 0.3)):
    k.cyl_y(TX + dx, TR + dr - 0.04, TR + dr + 0.04, 0.12, 0.12, 0.12, '#141418', 'tug_wheel', verts=10)
k.box(TX - 1.55, TR - 0.3, 0.2, TX - 0.6, TR + 0.3, 0.28, '#4a4a56', 'trailer')
for (dx, h, col) in ((-1.4, 0.3, '#3a5a8a'), (-1.08, 0.4, '#8a3a3a'), (-0.78, 0.26, '#4a6a3a')):
    k.box(TX + dx - 0.13, TR - 0.22, 0.28, TX + dx + 0.13, TR + 0.2, 0.28 + h, (col, 0.1), 'luggage', bevel=0.02)
k.tube((TX - 0.6, TR, 0.24), (TX - 0.45, TR, 0.24), 0.02, '#2a2a30', 'trailer_bar', verts=4)
k.solid(TX - 1.6, TR - 0.32, TX + 0.47, TR + 0.32)
AR.coffee_cup(k, 7.4, 4.75)
AR.flyers(k, RX0 + 0.3, RR0 + 2.5, RX1 - 0.3, RR1 - 0.4, 16, rng=gr)
# ---- the skybridge east to the Terraces (L200): a glass tube on a truss, lit along its floor -------------------------------
# (its own dice: the roof renders as it did)
rb = random.Random(2077)
SBX = COLS + 0.6
Y.tile_floor(k, RX1, SB0, SBX, SB1, tones=('#2e2a3a', '#2a2636'), size=1.0, seam='#14101c')
k.box(RX1, SB0, -0.9, SBX, SB1, -0.04, ('#1a1626', 0.08), 'bridge_truss')
for x in [RX1 + 0.5 + i for i in range(int(SBX - RX1))]:
    k.bar(x, SB1, x + 0.5, SB1, -0.9, -0.05, 0.06, '#2a2638', 'truss_rib')
k.box(RX1, SB1 - 0.02, -0.92, SBX, SB1 + 0.02, -0.86, shade(Y.CYAN, 0.4), 'truss_led', emit=(Y.CYAN, 0.8))
k.box(RX1, (SB0 + SB1) / 2 - 0.04, 0.0, SBX, (SB0 + SB1) / 2 + 0.04, 0.006, shade(Y.CYAN, 0.4), 'bridge_led', emit=(Y.CYAN, 0.6))
for (r0, r1) in ((SB0 - 0.12, SB0), (SB1 - 0.02, SB1 + 0.1)):               # its glass walls, a lit handrail, ribs
    k.box(RX1 + 0.15, r0, 0.0, SBX, r1, 0.18, ('#2a2a3e', 0.06), 'curb')
    k.box(RX1 + 0.15, r0, 0.18, SBX, r1, 0.92, '#0e1030', 'bridge_glass', emit=('#2a3a7a', 0.3))
    k.box(RX1 + 0.15, r0, 0.92, SBX, r1, 0.98, ('#5a5a68', 0.1), 'bridge_rail')
    k.box(RX1 + 0.15, r0, 0.88, SBX, r1, 0.92, shade(Y.CYAN, 0.4), 'rail_led', emit=(Y.CYAN, 0.7))
for x in [RX1 + 0.6 + i * 1.2 for i in range(int((SBX - RX1) / 1.2))]:
    k.tube((x, SB0 - 0.06, 0.0), (x, (SB0 + SB1) / 2, 2.0), 0.04, '#3a3a52', 'bridge_rib', verts=6)
    k.tube((x, SB1 + 0.04, 0.0), (x, (SB0 + SB1) / 2, 2.0), 0.04, '#3a3a52', 'bridge_rib', verts=6)
k.solid(RX1, SB0 - 0.3, SBX, SB0)
k.solid(RX1, SB1 - 0.1, SBX, SB1 + 0.2)
# the mouth: a gantry with its sign — where it goes, its level
k.box(RX1 - 0.05, SB0 - 0.2, 1.9, RX1 + 0.35, SB1 + 0.2, 2.3, ('#2a2a3e', 0.06), 'gantry')
for r in (SB0 - 0.2, SB1 + 0.05):
    k.box(RX1 - 0.05, r, 0.0, RX1 + 0.35, r + 0.15, 1.9, ('#2a2a3e', 0.06), 'gantry_leg')
S.lightbox(k, 'THE TERRACES · L200', 'RussoOne', RX1 + 0.15, SB1 + 0.25, 2.0, 2.6, 0.32, bg='#0c1a22', ink=Y.CYAN_L, glow=Y.CYAN, size=0.2)
k.point_light(RX1 + 1.5, (SB0 + SB1) / 2, 1.4, '#80e0e8', 10, radius=0.4)

# ---- the cab rank: a painted bay, an air cab waiting at it, its sign on a post ----------------------------------------------
CX, CR = 17.3, 12.8
k.box(15.5, 11.75, 0.0, 19.3, 13.75, 0.006, '#2a2430', 'cab_bay')
for (a, b, c, d) in ((15.5, 11.75, 19.3, 11.82), (15.5, 13.68, 19.3, 13.75), (15.5, 11.75, 15.57, 13.75), (19.23, 11.75, 19.3, 13.75)):
    k.box(a, b, 0.006, c, d, 0.01, '#e0c040', 'cab_bay_line')
k.box(CX - 0.95, CR - 0.36, 0.3, CX + 0.95, CR + 0.36, 0.7, ('#e8b830', 0.06), 'cab_body', bevel=0.12)
k.box(CX - 0.5, CR - 0.3, 0.68, CX + 0.35, CR + 0.3, 0.95, '#141c2c', 'cab_glass', emit=('#2a4060', 0.35), bevel=0.1)
k.box(CX - 0.46, CR - 0.3, 0.93, CX + 0.3, CR + 0.3, 0.99, ('#e8b830', 0.06), 'cab_roof', bevel=0.04)
k.box(CX - 0.95, CR + 0.32, 0.5, CX + 0.95, CR + 0.36, 0.55, '#141416', 'cab_stripe')
for i in range(10):
    if i % 2:
        k.box(CX - 0.9 + i * 0.18, CR + 0.36, 0.5, CX - 0.72 + i * 0.18, CR + 0.37, 0.55, '#f0f0f0', 'cab_check')
k.box(CX - 0.28, CR + 0.08, 1.0, CX + 0.04, CR + 0.09, 1.08, '#e8c040', 'cab_sign', emit=('#ffd860', 0.95))
for sx in (-1, 1):                                                              # lift pods, glowing under her: she hovers
    k.cyl(CX + sx * 0.62, CR, 0.14, 0.28, 0.16, '#2a2a30', 'cab_pod', verts=14)
    k.cyl(CX + sx * 0.62, CR, 0.1, 0.14, 0.13, shade(Y.CYAN, 0.45), 'cab_pod_glow', emit=(Y.CYAN, 0.95), verts=14)
for dr in (-0.2, 0.2):
    k.sphere(CX + 0.96, CR + dr, 0.5, 0.06, 0.04, '#fff6e0', 'cab_head', emit=('#fff2d0', 1.0), segs=8)
    k.sphere(CX - 0.97, CR + dr, 0.52, 0.05, 0.04, '#e83040', 'cab_tail', emit=('#ff3040', 0.95), segs=8)
k.point_light(CX, CR + 0.1, 0.08, Y.CYAN, 6, radius=0.3)
k.point_light(CX + 0.4, CR - 0.6, 2.4, '#fff0d0', 34, radius=0.4)                # the rank's lamp on her
k.solid(CX - 1.0, CR - 0.4, CX + 1.0, CR + 0.4)
k.cyl(20.0, 11.9, 0.0, 1.5, 0.04, '#3a3a44', 'cab_post', verts=6)
S.lightbox(k, 'AIR CAB', 'RussoOne', 20.0, 11.95, 1.5, 1.1, 0.34, bg='#f0c830', ink='#141416', glow='#ffd860', size=0.22)
k.solid_post(20.0, 11.9)

k.area_light(12.0, 2.0, 10.0, '#7058b8', 700, 30.0, rot=(math.radians(-35), 0, 0))
for (x, r, c) in ((12.0, 8.0, '#80c0ff'), (4.0, 6.0, '#ffd890'), (19.5, 6.0, '#80e0e8')):
    k.point_light(x, r, 3.0, c, 25, radius=1.0)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.7}}, light_samples=int(os.environ.get('ARC_SAMPLES', 128)),
         world_light=('#241a40', 0.5))

w = {'name': 'Skyport 7', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
     'spawns': {'player': [12, 11]}, 'shipExit': False, 'tiles': [], 'collisions': [], 'tileNames': {},
     'interactions': [
         {'x': 12, 'y': 9, 'type': 'shuttle', 'label': 'SHUTTLE', 'prompt': 'PRESS E TO BOARD'},
         {'x': 19, 'y': 4, 'type': 'express_lift', 'label': 'LIFT', 'prompt': 'PRESS E TO CALL THE LIFT', 'shaft': 'skyport',
          'lobby': 'skypad'},   # js/transit.js
         {'x': 20, 'y': 4, 'type': 'express_lift', 'label': 'LIFT', 'prompt': 'PRESS E TO CALL THE LIFT', 'shaft': 'skyport',
          'lobby': 'skypad'},
         {'x': 18, 'y': 11, 'type': 'air_cab', 'pad': 'skyport', 'label': 'AIR CAB', 'prompt': 'PRESS E TO HAIL A CAB'},   # js/transit.js
         {'x': 4, 'y': 4, 'type': 'dialog', 'label': 'MARSHAL', 'prompt': 'PRESS E TO TALK',
          'dialog': 'SKYPORT 7, PAD ONE.\n\nYOUR SKIFF IS LOGGED. NOBODY TOUCHES IT ON MY ROOF.\n\nLIFT\'S ON THE FAR SIDE - TAKES YOU DOWN TO THE SKYWALK.'},
         {'x': 11, 'y': 13, 'type': 'dialog', 'label': 'FUEL LINE', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'AETHER FUEL, PRESSURISED.\n\nA LABEL: "PAY AT THE BOOTH. DON\'T SMOKE. DON\'T ASK."'},
         {'x': 12, 'y': 13, 'type': 'dialog', 'label': 'THE DROP', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'TWO HUNDRED FLOORS STRAIGHT DOWN, THE STREETS ARE RIVERS OF LIGHT.\n\nTRAFFIC PASSES BELOW YOU.'},
     ]}
TERRACES = [2, 19]                                   # where the skybridge comes out on the Terraces (scenes/arcadia_terraces.py)
if os.path.exists(os.path.join(os.path.dirname(WORLD), 'arcadia-terraces.json')):
    w['interactions'].append({'x': COLS - 1, 'y': 8, 'type': 'enter_world', 'target': 'arcadia-terraces', 'spawn': TERRACES,
                              'label': 'SKYBRIDGE \u00b7 THE TERRACES', 'prompt': 'PRESS E TO CROSS'})
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (int(RX0), int(RR0), int(RX1) - 1, int(RR1) - 1), scene_id='arcadia-skypad',
            extra_walkable=[(x, r) for x in range(int(RX1), COLS) for r in range(7, 10)],
            scene_extra={'backdrop': True, 'layers': {'shuttle': 'parked'}, 'steam': st.steam})
w = json.load(open(WORLD))
w['shuttle'] = {'spawn': [12, 11]}
w['skyline'] = {'baseRow': 3.5, 'railRow': 15.6, 'centerCol': 12.0, 'rain': {'drops': 150, 'splash': [1.2, 2.2, 22.8, 13.8]}}
w['view'] = [-0.5, -2.5, COLS + 0.5, ROWS + 1.0]
w['cameraLead'] = -1.5
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('skypad done')
