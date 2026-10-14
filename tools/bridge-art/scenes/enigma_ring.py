"""Enigma Station, the ring — Blender scene (the curved corridor round the
station's ring, south of the relay deck).

  BVENV/bin/python tools/bridge-art/scenes/enigma_ring.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/enigma-ring

The corridor bends round the hub (its centre far below the map): deck
plates laid round the arc with a lit guide strip, the outer wall's windows
onto the ringed giant (HOLDOUT — the station backdrop and the giant show
through), a bench at the glass, the crew rota on a cork board, the door to
the crew quarters (enigma-quarters), the medbay sealed, pressure doors
closed at both ends where the ring has lost its air. The low inner wall
opens on the passage up to the relay deck.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world  # noqa: E402
import assets_ring as R                        # noqa: E402
import assets_station as T                     # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'enigma-ring.json')
COLS, ROWS = 34, 16
CX, CR = 17.0, 36.0                 # the ring's centre, far below the map
R_IN, R_OUT = 25.5, 30.0
A0, A1 = math.radians(61), math.radians(119)
H = 2.4 / math.cos(THETA)
D = math.radians


def at(a_deg, rad):
    a = D(a_deg)
    return CX + math.cos(a) * rad, CR - math.sin(a) * rad


k = Kit(COLS, ROWS, margin_top=1.0, margin_bottom=0.5, margin_x=0.5, seed=523)

# ---- the shell -----------------------------------------------------------------------------------
R.ring_floor(k, CX, CR, R_IN - 0.3, R_OUT, A0, A1, n=72)
WINDOWS = [(D(70), D(80)), (D(82), D(87.5)), (D(92.5), D(103)), (D(111), D(117))]
QDOOR = (D(105.6), D(108.6))
MEDBAY = (D(65.0), D(67.6))
R.ring_outer_wall(k, CX, CR, R_OUT, A0, A1, H, windows=WINDOWS, doors=[QDOOR, MEDBAY], n=58)
R.door_frame_arc(k, CX, CR, R_OUT, *QDOOR, H)
R.door_frame_arc(k, CX, CR, R_OUT, *MEDBAY, H, col=T.WARN_R)
p, q = at(65.0, R_OUT - 0.1), at(67.6, R_OUT - 0.1)
k.bar(p[0], p[1], q[0], q[1], 0.0, 2.3, 0.12, (T.ST_WALL[3], 0.06), 'medbay_door')
k.bar(p[0], p[1] + 0.07, q[0], q[1] + 0.07, 1.9, 2.05, 0.02, '#200808', 'medbay_light', emit=(T.WARN_R, 0.9))
R.ring_inner_wall(k, CX, CR, R_IN, A0, A1, gaps=[(D(88.3), D(91.7))], n=58)
# the passage up to the relay deck: a frame round the gap in the inner wall
for a in (88.3, 91.7):
    x, r = at(a, R_IN - 0.3)
    k.box(x - 0.12, r - 0.3, 0, x + 0.12, r + 0.3, 0.9, (T.ST_WALL[3], 0.06), 'door_post')
    k.box(x - 0.04, r - 0.32, 0.6, x + 0.04, r - 0.3, 0.8, '#082010', 'door_led', emit=(T.LED_G, 0.9))
# a short passage through the gap, ending at the hatch up to the relay deck
k.box(16.1, 10.3, -0.04, 17.9, 12.7, 0.0, (T.ST_FLOOR[1], 0.1), 'passage_floor')
for (x0, x1) in ((15.75, 16.1), (17.9, 18.25)):
    k.box(x0, 10.6, 0.0, x1, 12.7, 0.55, (T.ST_WALL[1], 0.06), 'passage_wall')
    k.box(x0 - 0.01, 10.6, 0.55, x1 + 0.01, 12.7, 0.6, T.ST_WALL[0], 'wall_cap')
    k.box(x0 if x0 > 17 else x1 - 0.03, 10.7, 0.12, (x0 + 0.03) if x0 > 17 else x1, 12.6, 0.15, '#082010', 'passage_led',
          emit=(T.LED_G, 0.7))
k.box(16.1, 12.5, 0.0, 17.9, 12.7, 1.0, (T.ST_WALL[3], 0.06), 'hatch')
k.box(16.3, 12.48, 0.85, 17.7, 12.5, 0.9, '#082010', 'hatch_light', emit=(T.LED_G, 0.9))
k.point_light(17.0, 11.6, 0.8, T.LED_G, 6, radius=0.1)

# the pressure doors at both ends, across the corridor
for a in (61.6, 118.4):
    pi, po = at(a, R_IN - 0.4), at(a, R_OUT + 0.2)
    k.bar(pi[0], pi[1], po[0], po[1], 0.0, H, 0.4, (T.ST_WALL[2], 0.06), 'bulkhead')
    n = 9
    for i in range(n):
        t0, t1 = (i + 0.15) / n, (i + 0.6) / n
        a_ = (pi[0] + (po[0] - pi[0]) * t0, pi[1] + (po[1] - pi[1]) * t0)
        b_ = (pi[0] + (po[0] - pi[0]) * t1, pi[1] + (po[1] - pi[1]) * t1)
        k.bar(a_[0], a_[1] + 0.21, b_[0], b_[1] + 0.21, 0.3, 0.62, 0.02, T.WARN_Y, 'chevron')
    m = ((pi[0] + po[0]) / 2, (pi[1] + po[1]) / 2)
    k.box(m[0] - 0.1, m[1] + 0.18, H - 0.7, m[0] + 0.1, m[1] + 0.24, H - 0.55, '#200808', 'bulkhead_light', emit=(T.WARN_R, 1.0))
    k.point_light(m[0] + (0.6 if a > 90 else -0.6), m[1] + 0.6, H - 0.6, T.WARN_R, 14, radius=0.1, group='flicker')

# ---- along the ring ----------------------------------------------------------------------------------
b0, b1 = at(94.5, R_OUT - 0.75), at(101.0, R_OUT - 0.75)
R.window_bench(k, b0[0], b0[1], b1[0], b1[1])
nb = at(90.0, R_OUT - 0.25)                 # on the wall's inner face
R.notice_board(k, nb[0], nb[1], 0.0)
for a in (104.2, 110.0):
    x, r = at(a, R_OUT - 0.55)
    R.dead_plant(k, x, r)
x, r = at(73.5, R_IN + 1.1)
R.maintenance_cart(k, x, r)
for a in (78.0, 98.0):
    x, r = at(a, R_OUT - 0.6)
    T.hanging_cables(k, x, r, top=H - 0.2, n=2)
for a in (84.0, 113.0):
    x, r = at(a, R_IN + 0.6)
    T.debris(k, x - 0.6, r - 0.4, x + 0.6, r + 0.3, n=5)

# ---- light -----------------------------------------------------------------------------------------
for a in range(66, 116, 6):
    x, r = at(a, (R_IN + R_OUT) / 2)
    k.point_light(x, r, 2.6, '#90c8d8', 70 if a % 12 else 45, radius=0.6, group='flicker' if a % 12 else 'static')
gx, gr = at(90, R_OUT + 3)
k.area_light(gx, gr, 3.0, '#d0a070', 260, 22.0, rot=(math.radians(-70), 0, 0))     # the giant's light through the glass
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.4}}, light_samples=128,
         world_light=('#1c3044', 0.95))

# ---- the world -------------------------------------------------------------------------------------
def walkable(c, r):
    x, y = c + 0.5, r + 0.5
    d = math.hypot(x - CX, CR - y)
    a = math.atan2(CR - y, x - CX)
    return R_IN + 0.1 < d < R_OUT - 0.3 and D(62.6) < a < D(117.4)


QD = (8, 7)       # the crew quarters' door, in the outer wall
RD = [(16, 10), (17, 10)]   # the passage up to the relay deck
for c in range(COLS):
    for r in range(ROWS):
        if not walkable(c, r) and (c, r) != QD and (c, r) not in RD:
            k.solid(c, r, c + 1, r + 1)

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Ring', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'enigma',
          'spawns': {'player': [16, 9]}, 'shipExit': False, 'giant': [17.0, -3.0, 7.0]})


def dialog(x, y, label, prompt, text):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


def cell_at(a, rad):
    x, r = at(a, rad)
    return int(x), int(r)


w['interactions'] = [
    {'x': 16, 'y': 10, 'type': 'enter_world', 'target': 'enigma', 'spawn': [9, 13], 'label': 'RELAY DECK', 'prompt': 'PRESS E TO GO UP'},
    {'x': 17, 'y': 10, 'type': 'enter_world', 'target': 'enigma', 'spawn': [10, 13], 'label': 'RELAY DECK', 'prompt': 'PRESS E TO GO UP'},
    {'x': QD[0], 'y': QD[1], 'type': 'enter_world', 'target': 'enigma-quarters', 'spawn': [9, 10], 'label': 'CREW QUARTERS',
     'prompt': 'PRESS E TO ENTER'},
    dialog(*cell_at(66.3, R_OUT - 0.6), 'MEDBAY', 'PRESS E TO LOOK',
           "MEDBAY. SEALED FROM THE INSIDE.\n\nA NOTE TAPED TO THE DOOR: 'OUT OF EVERYTHING EXCEPT PLASTERS AND OPTIMISM. - CORA'"),
    dialog(*cell_at(90.0, R_OUT - 0.6), 'CREW ROTA', 'PRESS E TO READ',
           "CREW ROTA, CYCLE 4401.\n\nTHIRD SHIFT, ENGINEERING: 'OKAFOR' - CROSSED OUT. 'DELL' WRITTEN OVER IT IN A DIFFERENT HAND.\n\n"
           "WREN RUN, 4402: ADA, BIX, CORA, DELL, EZE."),
    dialog(*cell_at(97.5, R_OUT - 0.9), 'WINDOW BENCH', 'PRESS E TO SIT',
           "THE RINGED GIANT FILLS THE WINDOW, SLOW BANDS OF CREAM AND RUST TURNING.\n\nSOMEONE HAS TRACED THE RINGS ON THE GLASS "
           "IN GREASE PENCIL, AND WRITTEN UNDER THEM: 'EZE SAW IT FIRST.'"),
    dialog(*cell_at(73.5, R_IN + 1.1), 'MAINTENANCE CART', 'PRESS E TO LOOK',
           "A CART OF SPARES ABANDONED MID-JOB: SEALANT, A TORQUE DRIVER, A FLASK OF COLD TEA."),
    dialog(*cell_at(63.0, (R_IN + R_OUT) / 2), 'PRESSURE DOOR', 'PRESS E TO LOOK',
           "SECTION SEALED. THE GAUGE BESIDE THE DOOR READS ZERO ON THE OTHER SIDE.\n\nTHE RING GOES ON WITHOUT AIR."),
    dialog(*cell_at(117.0, (R_IN + R_OUT) / 2), 'PRESSURE DOOR', 'PRESS E TO LOOK',
           "SECTION SEALED. FROST ON THE PORTHOLE.\n\nSOMEWHERE BEYOND IT, A LIGHT IS STILL BLINKING."),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=[QD] + RD, scene_id='enigma-ring',
            scene_extra={'backdrop': True, 'flicker': {'mode': 'pulse'}})
print('ring done', [(i['x'], i['y'], i['label']) for i in w['interactions']])
