"""Arcadia's Skywalk — Blender scene (world id "arcadia-skywalk").

  BVENV/bin/python tools/bridge-art/scenes/arcadia_skywalk.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-skywalk

A glass bridge strung between two towers two hundred floors over the
District, the city all round it (js/skyline.js) and rain coming down. The
street lift at the west end, the lift up to Skyport 7 at the east; between
them glass floor panels over the drop, a vending machine, ZOLTA.EXE's
fortune booth, benches, a holo-ad, B-SIDE the busker robot with its keytar,
lamps along the rail, and a viewing bay with a coin viewer at the middle.
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

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-skywalk'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 30, 13
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=1.5, margin_x=0.5, seed=307)
st = D.Street()
X0, X1, R0, R1 = 1.0, 29.0, 4.0, 9.3            # the deck
BX0, BX1, BR1 = 12.5, 17.5, 10.5                 # the viewing bay, out over the drop

# ---- the deck: dark tiles, an LED line down the middle, glass panels over the drop ----------------------------------
Y.tile_floor(k, X0, R0, X1, R1, tones=('#2e2a3a', '#2a2636'), size=1.0, seam='#14101c')
Y.tile_floor(k, BX0, R1, BX1, BR1, tones=('#2e2a3a', '#2a2636'), size=1.0, seam='#14101c')
k.box(X0, R0, -0.7, X1, R1, -0.04, ('#1a1626', 0.08), 'deck_truss')
k.box(BX0, R1, -0.7, BX1, BR1, -0.04, ('#1a1626', 0.08), 'deck_truss')
for x in range(int(X0) + 1, int(X1), 2):                                        # the truss's ribs under the edge
    k.box(x - 0.06, R1 - 0.02, -0.7, x + 0.06, R1 + 0.02, -0.05, '#2a2638', 'truss_rib')
k.box(X0, R1 + 0.0, -0.72, X1, R1 + 0.03, -0.66, shade(Y.PINK, 0.4), 'truss_led', emit=(Y.PINK, 0.8))
k.box(X0, 6.86, 0.0, X1, 6.94, 0.006, shade(Y.CYAN, 0.4), 'deck_led', emit=(Y.CYAN, 0.6))
for x in (5.5, 10.0, 20.0, 24.5):                                               # glass floor: the city far below
    k.box(x - 0.8, 5.4, 0.0, x + 0.8, 6.6, 0.008, '#06061a', 'glass_floor', emit=('#141850', 0.5))
    k.box(x - 0.82, 5.38, 0.0, x + 0.82, 6.62, 0.004, '#3a3a52', 'glass_frame')
    for i in range(14):
        gx, gr = x - 0.7 + k.rng.random() * 1.4, 5.5 + k.rng.random() * 1.0
        c = k.rng.choice((Y.YEL, Y.PINK, Y.CYAN_L, '#ffd890'))
        k.box(gx, gr, 0.008, gx + 0.04, gr + 0.02, 0.01, shade(c, 0.4), 'glass_city', emit=(c, 0.7))
for (x, r, rx, ry, c) in ((7.2, 7.8, 0.6, 0.22, Y.PINK), (16.0, 6.0, 0.5, 0.2, Y.CYAN), (22.8, 7.9, 0.7, 0.24, Y.PURP)):
    Y.puddle(k, x, r, rx, ry, tint=c)

# ---- the balustrades: low glass between posts, a lit rail, the city beyond ---------------------------------------------
def balustrade(xa, ra, xb, rb):
    n = max(1, int(round(math.hypot(xb - xa, rb - ra))))
    k.bar(xa, ra, xb, rb, 0.0, 0.18, 0.18, ('#2a2a3e', 0.06), 'curb')
    k.bar(xa, ra, xb, rb, 0.18, 0.92, 0.04, '#0e1030', 'balustrade_glass', emit=('#2a3a7a', 0.35))
    k.bar(xa, ra, xb, rb, 0.92, 0.98, 0.1, '#3a3a52', 'rail')
    k.bar(xa, ra, xb, rb, 0.88, 0.92, 0.06, shade(Y.CYAN, 0.4), 'rail_led', emit=(Y.CYAN, 0.7))
    for i in range(n + 1):
        t = i / n
        x, r = xa + (xb - xa) * t, ra + (rb - ra) * t
        k.box(x - 0.04, r - 0.04, 0.18, x + 0.04, r + 0.04, 0.95, '#3a3a52', 'rail_post')


balustrade(3.0, 4.15, 27.0, 4.15)                                                # the back, between the lift pods
k.solid(3.0, 4.0, 27.0, 4.3)
balustrade(X0, R1 - 0.1, BX0, R1 - 0.1)                                          # the front, and round the bay
balustrade(BX0, R1 - 0.1, BX0 + 0.6, BR1 - 0.1)
balustrade(BX0 + 0.6, BR1 - 0.1, BX1 - 0.6, BR1 - 0.1)
balustrade(BX1 - 0.6, BR1 - 0.1, BX1, R1 - 0.1)
balustrade(BX1, R1 - 0.1, X1, R1 - 0.1)
k.solid(X0, R1 - 0.2, BX0, R1 + 0.1)
k.solid(BX1, R1 - 0.2, X1, R1 + 0.1)
k.solid(BX0, BR1 - 0.25, BX1, BR1 + 0.1)

# ---- the two towers the bridge hangs between --------------------------------------------------------------------------
for (a, b) in ((-3.0, X0), (X1, COLS + 3.0)):
    k.box(a, -2.0, -8.0, b, 11.5, 9.0, ('#16122a', 0.08), 'tower')
    rects = []
    for i in range(int((b - a) / 0.5)):
        for j in range(16):
            if k.rng.random() < 0.4:
                x = a + 0.12 + i * 0.5
                rects.append((x, 11.5, 8.4 - j * 1.05, x + 0.26, 11.52, 8.75 - j * 1.05))
    k.boxes(rects, shade('#ffd890', 0.5), 'tower_window', emit=('#ffd890', 0.7))
k.solid(0, 0, X0, ROWS)
k.solid(X1, 0, COLS, ROWS)


# ---- the lift pods at either end ------------------------------------------------------------------------------------------
def lift_pod(x0, x1, label, col):
    k.box(x0, 2.6, 0.0, x1, 4.15, 2.7, ('#1e2a40', 0.08), 'lift_head')
    k.box(x0 + 0.45, 4.15, 0.0, x1 - 0.45, 4.18, 1.95, '#0c1a22', 'lift_door', emit=('#1a5a6a', 0.6))
    k.box((x0 + x1) / 2 - 0.02, 4.18, 0.0, (x0 + x1) / 2 + 0.02, 4.2, 1.95, '#2a3a44', 'lift_seam')
    k.box(x1 - 0.32, 4.15, 1.0, x1 - 0.18, 4.19, 1.2, '#0c2030', 'lift_button', emit=(Y.YEL, 0.9))
    S.letters(k, label, 'Audiowide', (x0 + x1) / 2, 4.15, 2.1, size=0.3, col=col)
    k.solid(x0, 2.6, x1, 4.2)


lift_pod(1.0, 3.0, 'STREET', Y.CYAN_L)
lift_pod(27.0, 29.0, 'SKYPORT', Y.PINK)
S.neon(k, 'SKYWALK', 'Audiowide', 15.0, 4.2, 1.35, size=0.42, col=Y.PINK, board='#100818')

# ---- along the back: a vending machine, ZOLTA.EXE, benches, a holo-ad, B-SIDE ---------------------------------------------
Y.vending_machine(k, 4.4, 4.25)
k.solid(3.9, 4.2, 4.9, 5.0)
# ZOLTA.EXE: a fortune booth — a purple cabinet, a glass dome with a holographic head, a card slot
ZX = 7.6
k.box(ZX - 0.7, 4.25, 0.0, ZX + 0.7, 4.95, 1.0, ('#3a1450', 0.08), 'zolta_cab', bevel=0.02)
k.box(ZX - 0.66, 4.95, 0.1, ZX + 0.66, 4.97, 0.95, '#1a0828', 'zolta_panel')
for i in range(5):
    k.box(ZX - 0.55 + i * 0.25, 4.97, 0.7, ZX - 0.4 + i * 0.25, 4.99, 0.8, shade(Y.YEL, 0.5), 'zolta_bulb', emit=(Y.YEL, 0.9))
k.box(ZX - 0.15, 4.97, 0.42, ZX + 0.15, 4.99, 0.47, '#0c0c14', 'zolta_slot')
k.box(ZX - 0.62, 4.3, 1.0, ZX + 0.62, 4.9, 1.95, '#100830', 'zolta_glass', emit=('#3a1a6a', 0.45))
k.blob(ZX, 4.6, 1.42, 0.22, 0.2, 0.26, '#0c3a40', 'zolta_head', emit=(Y.CYAN_L, 0.85), segs=14)
k.cone(ZX, 4.6, 1.62, 1.85, 0.26, 0.04, '#2a0a40', 'zolta_turban', emit=(Y.MAG, 0.6), verts=12)
k.sphere(ZX, 4.82, 1.66, 0.04, 0.04, Y.YEL, 'zolta_jewel', emit=(Y.YEL, 1.0), segs=6)
for s in (-1, 1):
    k.sphere(ZX + s * 0.08, 4.79, 1.45, 0.03, 0.03, '#ffffff', 'zolta_eye', emit=('#ffffff', 1.0), segs=6)
k.box(ZX - 0.7, 4.25, 1.95, ZX + 0.7, 4.95, 2.05, ('#3a1450', 0.08), 'zolta_top')
S.neon(k, 'ZOLTA', 'Audiowide', ZX, 4.95, 2.12, size=0.26, col=Y.PINK)
k.point_light(ZX, 5.3, 1.4, Y.MAG, 14, radius=0.3, group='flicker')
k.solid(ZX - 0.7, 4.2, ZX + 0.7, 5.0)
Y.metal_bench(k, 10.6, 12.4, 4.65, neon=Y.PINK)
Y.holo_kiosk(k, 18.6, 4.62)
Y.trash_can(k, 20.0, 4.6)
# B-SIDE: a busker robot on a crate with a keytar, a speaker, an open case with coins in it
RX = 22.6
k.box(RX - 0.35, 4.3, 0.0, RX + 0.35, 4.9, 0.4, ('#5a4a38', 0.1), 'busker_crate')
k.box(RX - 0.22, 4.45, 0.4, RX + 0.22, 4.75, 1.05, ('#d8a020', 0.06), 'busker_body', bevel=0.04)
k.box(RX - 0.12, 4.75, 0.55, RX + 0.12, 4.77, 0.85, '#1a1a1a', 'busker_grille')
k.blob(RX, 4.6, 1.26, 0.18, 0.15, 0.15, ('#d8a020', 0.06), 'busker_head', segs=12)
k.box(RX - 0.13, 4.73, 1.22, RX + 0.13, 4.76, 1.3, '#0c2a30', 'busker_visor', emit=(Y.GREEN, 0.9))
k.cyl(RX, 4.6, 1.4, 1.52, 0.02, '#3a3a44', 'busker_antenna', verts=5)
k.sphere(RX, 4.6, 1.55, 0.035, 0.035, Y.RED, 'busker_tip', emit=(Y.RED, 1.0), segs=6)
k.bar(RX - 0.45, 4.85, RX + 0.42, 4.85, 0.78, 0.88, 0.12, ('#e03a90', 0.08), 'keytar')                  # slung across it
for i in range(7):
    k.box(RX - 0.3 + i * 0.09, 4.88, 0.86, RX - 0.25 + i * 0.09, 4.92, 0.885, '#f4f0e8', 'keytar_key')
k.tube((RX - 0.2, 4.6, 0.95), (RX - 0.3, 4.9, 0.85), 0.04, '#b8881a', 'busker_arm', verts=6)
k.tube((RX + 0.2, 4.6, 0.95), (RX + 0.25, 4.9, 0.85), 0.04, '#b8881a', 'busker_arm', verts=6)
k.box(RX + 0.55, 4.35, 0.0, RX + 1.0, 4.75, 0.7, ('#1a1a22', 0.08), 'speaker')
k.cyl_y(RX + 0.775, 4.75, 4.77, 0.4, 0.16, 0.16, '#0c0c12', 'speaker_cone', verts=14)
k.cyl_y(RX + 0.775, 4.765, 4.78, 0.4, 0.18, 0.18, shade(Y.CYAN, 0.4), 'speaker_ring', emit=(Y.CYAN, 0.7), verts=14)
k.box(RX - 0.4, 5.15, 0.0, RX + 0.25, 5.45, 0.08, ('#3a1a14', 0.1), 'busker_case')
k.box(RX - 0.36, 5.18, 0.08, RX + 0.21, 5.42, 0.085, '#6a1a2a', 'busker_case_lining')
for i in range(5):
    k.cyl(RX - 0.28 + i * 0.1, 5.3 + (i % 2) * 0.05, 0.085, 0.095, 0.035, ('#e0b040', 0.25), 'coin', verts=8)
k.solid(RX - 0.4, 4.2, RX + 1.05, 5.0)
Y.metal_bench(k, 24.3, 26.1, 4.65, neon=Y.CYAN)

# ---- along the front: lamps, planters; the viewer in the bay ---------------------------------------------------------------
for x in (4.0, 10.5, 19.5, 26.0):
    Y.street_lamp(k, x, 8.75, col=Y.CYAN if x < 15 else Y.PINK)
for x in (7.0, 23.5):
    Y.street_planter(k, x, 8.55, glow=Y.YEL)
VX, VR = 15.0, 9.85
k.cyl(VX, VR, 0.0, 0.08, 0.22, '#2a2a3e', 'viewer_base', verts=12)
k.cyl(VX, VR, 0.08, 1.0, 0.06, '#3a3a52', 'viewer_post', verts=8)
k.blob(VX, VR, 1.12, 0.26, 0.16, 0.13, ('#c8a020', 0.08), 'viewer_head', segs=12)
for s in (-1, 1):
    k.cyl_y(VX + s * 0.1, VR + 0.1, VR + 0.24, 1.14, 0.06, 0.06, '#1a1a22', 'viewer_lens', verts=10)
    k.cyl_y(VX + s * 0.1, VR + 0.24, VR + 0.25, 1.14, 0.045, 0.045, '#0c2a40', 'viewer_glass', emit=(Y.CYAN_L, 0.6), verts=10)
k.box(VX - 0.04, VR - 0.17, 0.95, VX + 0.04, VR - 0.15, 1.05, '#0c0c14', 'viewer_slot')
k.solid(VX - 0.2, VR - 0.2, VX + 0.2, VR + 0.2)

# ---- light: the city's glow from below, lamps, the neon ------------------------------------------------------------------
k.area_light(15.0, 3.0, 9.0, '#7058b8', 650, 30.0, rot=(math.radians(-35), 0, 0))
k.area_light(15.0, 12.0, -3.0, '#ff70b0', 220, 26.0, rot=(math.radians(150), 0, 0))
for (x, c) in ((8.0, '#80c0ff'), (22.0, '#ff90c8')):
    k.point_light(x, 7.0, 3.0, c, 22, radius=1.0)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.7}}, light_samples=128, world_light=('#241a40', 0.5))

w = {'name': 'The Skywalk', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
     'spawns': {'player': [2, 5]}, 'shipExit': False, 'tiles': [], 'collisions': [], 'tileNames': {},
     'interactions': [
         {'x': 2, 'y': 4, 'type': 'express_lift', 'label': 'LIFT · STREET', 'prompt': 'PRESS E TO CALL THE LIFT', 'shaft': 'skywalk', 'lobby': 'skywalk'},   # js/transit.js
         {'x': 28, 'y': 4, 'type': 'express_lift', 'label': 'LIFT · SKYPORT 7', 'prompt': 'PRESS E TO CALL THE LIFT', 'shaft': 'skyport', 'lobby': 'skywalk'},
         {'x': 4, 'y': 4, 'type': 'vendor', 'label': 'VENDING MACHINE', 'prompt': 'PRESS E TO BUY',
          'items': [{'id': 'void_fizz', 'price': 6}, {'id': 'neon_udon', 'price': 9}, {'id': 'stim_pack', 'price': 28}]},
         {'x': 7, 'y': 4, 'type': 'fortune', 'label': 'ZOLTA.EXE', 'prompt': 'PRESS E FOR A FORTUNE'},
         {'x': 22, 'y': 4, 'type': 'busker', 'label': 'B-SIDE', 'prompt': 'PRESS E TO LISTEN'},
         {'x': 18, 'y': 4, 'type': 'dialog', 'label': 'HOLO-AD', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'A WOMAN TWO METRES TALL, MADE OF LIGHT, SMILES AT YOU AND SAYS "LUCKY 7 - THE BALLS ARE ALWAYS FALLING." SHE FLICKERS AND SAYS IT AGAIN TO SOMEBODY ELSE.'},
         {'x': 15, 'y': 9, 'type': 'dialog', 'label': 'VIEWER', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'TWO HUNDRED FLOORS DOWN THE DISTRICT GLITTERS IN THE RAIN. TRAFFIC RIVERS BETWEEN THE TOWERS. SOMEWHERE DOWN THERE, A NOODLE BAR IS STILL OPEN.'},
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (int(X0), int(R0), int(X1) - 1, int(R1)), scene_id=WID,
            scene_extra={'backdrop': True, 'steam': st.steam})
w = json.load(open(WORLD))
w['skyline'] = {'baseRow': 3.2, 'railRow': 12.2, 'centerCol': COLS / 2, 'rain': {'drops': 160, 'splash': [1.2, 4.3, 28.8, 9.0]}}
w['view'] = [-0.5, -3.5, COLS + 0.5, ROWS + 0.5]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('skywalk done')
