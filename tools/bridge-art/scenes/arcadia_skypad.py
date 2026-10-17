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

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'arcadia-skypad.json')
COLS, ROWS = 24, 16
k = Kit(COLS, ROWS, margin_top=1.5, margin_bottom=1.0, margin_x=0.5, seed=241)
st = D.Street()
RX0, RX1, RR0, RR1 = 1.0, 23.0, 2.0, 14.0          # the roof

# ---- the roof deck ------------------------------------------------------------------------------------
Y.tile_floor(k, RX0, RR0, RX1, RR1, tones=('#34303e', '#2e2a38'), size=1.0, seam='#14101c')
k.box(RX0 - 0.15, RR0 - 0.15, -6.0, RX1 + 0.15, RR1 + 0.15, -0.04, ('#1e1a2a', 0.08), 'tower_top')
# the tower's face falling away below the front edge, windows lit
rects = []
for i in range(int((RX1 - RX0) / 0.5)):
    for j in range(5):
        if k.rng.random() < 0.45:
            x = RX0 + 0.15 + i * 0.5
            rects.append((x, RR1 + 0.15, -0.6 - j * 0.9, x + 0.25, RR1 + 0.17, -0.25 - j * 0.9))
k.boxes(rects, shade('#ffd890', 0.5), 'tower_window', emit=('#ffd890', 0.7))
# parapet + rail round the edge, with a neon strip
for (a, b, c, d) in ((RX0 - 0.15, RR1, RX1 + 0.15, RR1 + 0.15), (RX0 - 0.15, RR0 - 0.15, RX0, RR1), (RX1, RR0 - 0.15, RX1 + 0.15, RR1)):
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
for (x, r, rx, ry, c) in ((6.0, 12.4, 0.8, 0.3, Y.CYAN), (17.5, 12.6, 0.6, 0.25, Y.PINK), (14.6, 11.5, 0.5, 0.2, Y.PURP)):
    Y.puddle(k, x, r, rx, ry, tint=c)
k.box(10.6, 12.2, 0.0, 13.4, 13.6, 0.05, '#1a1a24', 'fuel_mat')
k.cyl(11.0, 12.8, 0.0, 0.9, 0.28, ('#c8a020', 0.08), 'fuel_tank', verts=12)
k.tube((11.2, 12.6, 0.6), (11.9, 10.4, 0.05), 0.04, '#1a1a1a', 'fuel_hose', verts=6)
k.solid(10.6, 12.4, 11.6, 13.4)

k.area_light(12.0, 2.0, 10.0, '#7058b8', 700, 30.0, rot=(math.radians(-35), 0, 0))
for (x, r, c) in ((12.0, 8.0, '#80c0ff'), (4.0, 6.0, '#ffd890'), (19.5, 6.0, '#80e0e8')):
    k.point_light(x, r, 3.0, c, 25, radius=1.0)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.7}}, light_samples=128,
         world_light=('#241a40', 0.5))

w = {'name': 'Skyport 7', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
     'spawns': {'player': [12, 11]}, 'shipExit': False, 'tiles': [], 'collisions': [], 'tileNames': {},
     'interactions': [
         {'x': 12, 'y': 9, 'type': 'shuttle', 'label': 'SHUTTLE', 'prompt': 'PRESS E TO BOARD'},
         {'x': 19, 'y': 4, 'type': 'enter_world', 'target': 'arcadia-skywalk', 'spawn': [28, 5], 'label': 'LIFT',
          'prompt': 'PRESS E TO RIDE DOWN'},
         {'x': 20, 'y': 4, 'type': 'enter_world', 'target': 'arcadia-skywalk', 'spawn': [28, 5], 'label': 'LIFT',
          'prompt': 'PRESS E TO RIDE DOWN'},
         {'x': 4, 'y': 4, 'type': 'dialog', 'label': 'MARSHAL', 'prompt': 'PRESS E TO TALK',
          'dialog': 'SKYPORT 7, PAD ONE.\n\nYOUR SKIFF IS LOGGED. NOBODY TOUCHES IT ON MY ROOF.\n\nLIFT\'S ON THE FAR SIDE - TAKES YOU DOWN TO THE SKYWALK.'},
         {'x': 11, 'y': 13, 'type': 'dialog', 'label': 'FUEL LINE', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'AETHER FUEL, PRESSURISED.\n\nA LABEL: "PAY AT THE BOOTH. DON\'T SMOKE. DON\'T ASK."'},
         {'x': 12, 'y': 13, 'type': 'dialog', 'label': 'THE DROP', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'TWO HUNDRED FLOORS STRAIGHT DOWN, THE STREETS ARE RIVERS OF LIGHT.\n\nTRAFFIC PASSES BELOW YOU.'},
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (int(RX0), int(RR0), int(RX1) - 1, int(RR1) - 1), scene_id='arcadia-skypad',
            scene_extra={'backdrop': True, 'layers': {'shuttle': 'parked'}, 'steam': st.steam})
w = json.load(open(WORLD))
w['shuttle'] = {'spawn': [12, 11]}
w['skyline'] = {'baseRow': 3.5, 'railRow': 15.6, 'centerCol': COLS / 2, 'rain': {'drops': 150, 'splash': [1.2, 2.2, 22.8, 13.8]}}
w['view'] = [-0.5, -2.5, COLS + 0.5, ROWS + 1.0]
w['cameraLead'] = -1.5
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('skypad done')
