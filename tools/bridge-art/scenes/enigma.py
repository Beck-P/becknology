"""Enigma Station — Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/enigma.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/enigma

An abandoned relay station adrift: cracked viewports, server racks still
blinking, the antenna array in the middle picking up 47.3 MHz, the data
core, emergency lights, debris — and the pilot's ship docked at the
airlock. Space (the world's own animated backdrop) shows through the
viewports, the floor windows and everywhere outside the hull.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world  # noqa: E402
import assets_station as T                     # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'enigma.json')

H = 2.4 / math.cos(THETA)
k = Kit(20, 16, margin_top=1.0, margin_bottom=0.5, margin_x=1.0, seed=161)

HOLES = [(6, 13, 7, 14), (13, 13, 14, 14)]
T.station_floor(k, 3, 4, 17, 14, holes=HOLES)
T.station_room(k, 3, 4, 17, 14, H, windows=[(6.6, 8.4, 0.9, 2.3, True), (11.6, 13.4, 0.9, 2.3, False)], airlock=(4.0, 6.0))
T.docking_tube(k, 1.6, 2.4, 4.05, 5.95)
T.docked_ship(k, 0.85, 3.9, z=0.3, length=3.2)

# ---- back wall ------------------------------------------------------------------------------
T.wall_screen(k, 5.0, 4.0, broken=True)
T.wall_screen(k, 15.0, 4.0, col=T.TEAL)
T.emergency_light(k, 4.2, 4.0)
T.emergency_light(k, 16.2, 4.0)
T.hanging_cables(k, 10.0, 4.6)
T.hanging_cables(k, 14.0, 9.6, n=2)

# ---- terminals, racks, the array -------------------------------------------------------------------
T.station_terminal(k, 3.9, 7.0, col='#c080ff', w=1.2)       # cipher terminal
T.station_terminal(k, 16.1, 7.0, col=T.TEAL, w=1.2)          # signal relay
for x in (5.6, 6.4, 12.6, 13.4):
    T.server_rack(k, x, 6.6)
T.antenna_array(k, 9.5, 8.5)

# ---- partition: racks and the data core ----------------------------------------------------------------
T.server_rack(k, 3.6, 10.9, dead=True)
T.server_rack(k, 16.4, 10.9, dead=True)
for x in (5.5, 8.5, 11.5, 14.5):
    T.server_rack(k, x, 10.9, dead=(x == 11.5))
T.data_core(k, 10.0, 11.4)

# ---- mess ----------------------------------------------------------------------------------------------
T.debris(k, 4.5, 4.6, 16.0, 6.3, n=10)
T.debris(k, 4.0, 8.0, 16.5, 10.6, n=14)
T.debris(k, 3.5, 12.1, 16.5, 13.8, n=12)
T.toppled_chair(k, 15.2, 12.8)
T.emergency_light(k, 4.0, 12.0, z=1.6, energy=8)

k.area_light(10.0, 5.0, 2.4, '#7080c0', 30, 5.0, rot=(math.radians(-60), 0, 0))     # starlight
for (x, r) in ((6.0, 5.8), (13.0, 5.8), (9.5, 9.6), (5.0, 12.8), (14.5, 12.8)):
    k.point_light(x, r, 2.8, '#80c0d0', 40, radius=0.8)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.35}}, light_samples=128,
         world_light=('#16283a', 0.6))

apply_world(WORLD, k, (3, 4, 16, 13), doors=[(2, 4), (2, 5)], scene_id='enigma', moves={
    'CIPHER TERMINAL': (3, 7), 'SIGNAL RELAY': (16, 7), 'SHIP': [(2, 4), (2, 5)], 'ANTENNA ARRAY': (9, 8),
    'VIEWPORT': [(7, 3), (12, 3), (6, 13), (13, 13)], 'DATA CORE': [(9, 11), (10, 11)]},
    scene_extra={'backdrop': True, 'flicker': {'mode': 'pulse'}})
print('enigma done')
