"""The Bridge — Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/bridge.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/bridge

Navy steel command deck under a panoramic viewport (a hole: the engine's
starfield shows through). The hologram over the pedestal is drawn live by
js/worlds/bridge.js.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world  # noqa: E402
import assets_ship as P                        # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'bridge.json')

H = 3.2 / math.cos(THETA)
C = math.cos(THETA)
k = Kit(18, 12, margin_top=1.0, margin_bottom=0.5, seed=91)

WIN = (1.7, 16.3, 0.75, 4.15)
P.metal_floor(k, 1, 4, 17, 11)
P.ship_back_wall(k, 0.5, 17.5, 4.0, H, win=WIN, mullions=(4.6, 7.4, 10.6, 13.4), pal=P.B_WALL, trim=P.CYAN)
P.ship_side_wall(k, 0.4, 1.0, 3.5, 11.0, H, pal=P.B_WALL)
P.ship_side_wall(k, 17.0, 17.6, 3.5, 11.0, H, pal=P.B_WALL)
P.ship_front_wall(k, 0.4, 17.6, 11.0, door=(8.0, 10.0), pal=P.B_WALL)
P.dashboard(k, 3.2, 14.8, 4.0)
k.area_light(9.0, 4.6, 3.2, '#6a80d0', 45, 6.0, rot=(math.radians(-55), 0, 0))     # starlight

# ---- stations -------------------------------------------------------------------------------
P.console(k, 2.0, 4.8, label='STATS')
P.console(k, 16.0, 4.8, screen='#3a1a50', screen_emit='#c0a0f0', label='COMMS')
P.console(k, 2.0, 9.9, screen='#3a2a10', screen_emit='#ffe080', label='ENGINEERING')
P.console(k, 16.0, 9.9, screen='#0a3a20', screen_emit='#60e090', label='SENSORS')

# ---- holo pedestal + command chair ---------------------------------------------------------
P.deck_ring(k, 9.5, 6.6, 1.25)
P.holo_pedestal(k, 9.5, 6.6)
P.captain_chair(k, 9.5, 8.6)
# ---- deck details ------------------------------------------------------------------------------
for x in (8.62, 10.38):                    # guide lights from the door to the chair
    k.box(x - 0.025, 9.3, 0.0, x + 0.025, 11.0, 0.01, '#0c2a30', 'guide', emit=(P.CYAN, 0.7))
P.hazard_stripes(k, 8.0, 10.0, 10.55, 10.95)
P.conduit(k, [(2.9, 5.3), (4.2, 6.2), (8.3, 6.6)])
P.conduit(k, [(15.1, 5.3), (13.8, 6.2), (10.7, 6.6)])
P.conduit(k, [(2.9, 9.6), (5.5, 8.0), (8.6, 7.2)])
P.conduit(k, [(15.1, 9.6), (12.5, 8.0), (10.4, 7.2)])
for (x0, r0) in ((5.2, 5.2), (12.8, 5.2), (6.2, 9.2), (11.8, 9.2)):
    P.floor_grate(k, x0, r0, x0 + 0.8, r0 + 0.5)

# ---- light -------------------------------------------------------------------------------------
P.led_strip(k, 1.0, 17.0, 4.5, z=0.0, h=0.012)
k.point_light(4.5, 7.0, 3.0, '#c0d8ff', 60, radius=0.8)
k.point_light(14.5, 7.0, 3.0, '#c0d8ff', 60, radius=0.8)
k.point_light(9.0, 9.6, 2.6, '#c0d8ff', 35, radius=0.8)

k.render(OUT, light_states={'full': {'pulse': 1.0}, 'dim': {'pulse': 0.55}}, light_samples=128,
         world_light=('#1a2238', 0.4))

apply_world(WORLD, k, (1, 4, 16, 10), doors=[(8, 11), (9, 11)], scene_id='bridge', moves={
    'WARP MAP': [(8, 6), (9, 6), (10, 6)], "CAPTAIN'S CHAIR": (9, 8),
    'STATS CONSOLE': [(1, 5), (2, 5)], 'COMMS CONSOLE': [(15, 5), (16, 5)],
    'ENGINEERING': [(1, 10), (2, 10)], 'SENSORS': [(15, 10), (16, 10)]},
    scene_extra={'flicker': {'mode': 'pulse'},
                 'sky': [WIN[0], round(4.0 - WIN[3] * C, 3), WIN[1], round(4.0 - WIN[2] * C, 3)]})
print('bridge done')
