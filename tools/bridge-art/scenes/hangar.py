"""The Hangar Bay — Blender scene (the mothership's shuttle bay).

  BVENV/bin/python tools/bridge-art/scenes/hangar.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hangar

A wide bay opening (a hole: the engine draws whatever the ship is parked
over — js/orbit.js), the shuttle on its pad (a swappable layer, so it can
lift off), a repair bench and the maintenance drone, fuel tanks piped to
the pad, the loading arm, cargo and the launch console. The door at the
front leads back to the bridge.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import THETA, Kit, apply_world, shade  # noqa: E402
import assets_cyber as Y                             # noqa: E402
import assets_lumar as A                             # noqa: E402
import assets_ship as P                              # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'hangar.json')

H = 3.4 / math.cos(THETA)
C = math.cos(THETA)
PAL = ['#14181e', '#222a32', '#323c46', '#46525e']
k = Kit(16, 12, margin_top=1.0, margin_bottom=0.5, seed=303)

WIN = (3.2, 12.8, 0.35, 4.3)
P.metal_floor(k, 1, 4, 15, 11, tones=('#1e2430', '#262e3a', '#323c48'))
P.ship_back_wall(k, 0.5, 15.5, 4.0, H, win=WIN, mullions=(), pal=PAL, trim=P.LED_Y)
P.ship_side_wall(k, 0.4, 1.0, 3.5, 11.0, H, pal=PAL)
P.ship_side_wall(k, 15.0, 15.6, 3.5, 11.0, H, pal=PAL)
P.ship_front_wall(k, 0.4, 15.6, 11.0, door=(7.0, 9.0), pal=PAL)

# ---- the bay: hazard-striped sill, chevrons up the frame, field emitters ----------------------
P.hazard_stripes(k, WIN[0], WIN[1], 4.02, 4.35)
for xx in (WIN[0] - 0.22, WIN[1] + 0.02):
    k.box(xx, 4.0, 0.0, xx + 0.2, 4.12, WIN[3] + 0.1, ('#2a2e34', 0.06), 'bay_jamb')
    z = 0.2
    while z < WIN[3]:
        k.box(xx + 0.02, 4.12, z, xx + 0.18, 4.13, z + 0.16, P.LED_Y, 'chevron')
        z += 0.36
    for zz in (0.6, 1.8, 3.0):
        k.box(xx + 0.05, 4.13, zz, xx + 0.15, 4.16, zz + 0.1, '#103038', 'field_emitter', emit=(P.CYAN, 0.9))
k.box(WIN[0], 4.0, WIN[3], WIN[1], 4.12, WIN[3] + 0.08, '#103038', 'field_line', emit=(P.CYAN, 0.7))
for x in (WIN[0] + 0.4, WIN[1] - 0.4):          # warning beacons
    k.cyl(x, 4.2, WIN[3] + 0.1, WIN[3] + 0.25, 0.08, '#5a1010', 'beacon', emit=(P.LED_R, 0.9), verts=10)

# ---- landing pad + the shuttle ---------------------------------------------------------------
PX, PR = 7.9, 7.0
k.cyl(PX, PR, 0.0, 0.012, 2.25, ('#1a1e26', 0.06), 'pad', verts=40)
P.deck_ring(k, PX, PR, 2.05, col=P.LED_Y)
for i in range(4):
    a = i * math.pi / 2 + math.pi / 4
    k.cyl(PX + math.cos(a) * 2.25, PR + math.sin(a) * 2.25, 0.0, 0.05, 0.1, '#103038', 'pad_light', emit=(P.CYAN, 0.9), verts=10)
with k.variant('shuttle', 'parked'):
    P.shuttle(k, 6.2, 7.0)
k.solid(5.7, 5.6, 9.7, 8.0)
k.solid(6, 8, 9, 9)

# ---- left: the repair corner ---------------------------------------------------------------------
Y.repair_bench(k, 1.1, 3.0, 4.05)
Y.parts_bins(k, 1.15, 2.95, 4.0, z0=1.15, z1=1.95)
Y.work_lamp(k, 2.6, 4.0, z=0.86)
Y.cable_coil(k, 1.4, 4.0, z=2.1)
k.solid(1, 4, 3, 5)
Y.hover_drone(k, 2.0, 7.3)
k.solid(1, 7, 3, 8)
# the loading arm: base, two links, a three-finger claw
bx, br = 2.4, 9.4
k.cyl(bx, br, 0.0, 0.25, 0.42, ('#3a3e46', 0.06), 'arm_base', verts=16)
k.cyl(bx, br, 0.25, 0.45, 0.3, P.LED_Y, 'arm_turret', verts=14)
j1 = (bx + 0.2, br - 0.3, 1.6)
j2 = (bx + 1.25, br - 0.9, 1.25)
k.tube((bx, br, 0.45), j1, 0.13, ('#c8a030', 0.08), 'arm_link', verts=10)
k.sphere(*j1, 0.16, 0.16, '#3a3e46', 'arm_joint', segs=10)
k.tube(j1, j2, 0.1, ('#c8a030', 0.08), 'arm_link', verts=10)
k.sphere(*j2, 0.13, 0.13, '#3a3e46', 'arm_joint', segs=10)
for a in (0, 2.1, 4.2):
    tip = (j2[0] + math.cos(a) * 0.2, j2[1] + math.sin(a) * 0.15, j2[2] - 0.35)
    k.tube(j2, tip, 0.03, '#4a4e56', 'arm_claw', verts=6)
k.solid(1, 9, 4, 10)

# ---- right: fuel tanks, cargo, the launch console ----------------------------------------------
for (tx, tr) in ((13.7, 4.9), (14.5, 5.6)):
    k.cyl(tx, tr, 0.0, 2.1, 0.42, ('#7a8088', 0.06), 'fuel_tank', verts=18)
    k.sphere(tx, tr, 2.1, 0.42, 0.22, ('#7a8088', 0.06), 'fuel_tank', segs=14)
    k.cyl(tx, tr, 0.9, 1.15, 0.43, P.LED_Y, 'tank_band', verts=18)
    k.box(tx - 0.1, tr + 0.38, 1.3, tx + 0.1, tr + 0.44, 1.6, '#103038', 'tank_gauge', emit=(P.CYAN, 0.8))
k.solid(13, 4, 15, 7)
P.conduit(k, [(13.3, 6.0), (11.5, 6.4), (9.9, 6.9)], w=0.14)
P.console(k, 12.3, 8.25, w=1.2, screen='#3a2a10', screen_emit=P.LED_Y, label='LAUNCH')
k.solid(11, 8, 14, 9)
for (cx, cr, s, z0) in ((12.6, 9.6, 0.62, 0.0), (13.3, 9.7, 0.6, 0.0), (12.95, 9.65, 0.55, 0.53), (14.1, 9.9, 0.5, 0.0)):
    A.crate(k, cx, cr, s=s, z0=z0, tone=k.rng.choice((A.WOOD_L, '#6a7480', '#5a6a5a')), solid=False)
for (bx2, br2) in ((14.6, 8.8), (14.2, 8.3)):
    k.cyl(bx2, br2, 0.0, 0.7, 0.24, ('#4a5a6a', 0.06), 'drum', verts=14)
    k.cyl(bx2, br2, 0.68, 0.72, 0.25, P.LED_Y, 'drum_lid', verts=14)
k.solid(12, 9, 15, 11)
k.solid(14, 8, 15, 9)

# ---- floor: guide lights from the door to the pad ---------------------------------------------
for x in (7.42, 8.58):
    k.box(x - 0.025, 9.3, 0.0, x + 0.025, 11.0, 0.01, '#0c2a30', 'guide', emit=(P.CYAN, 0.7))
P.floor_grate(k, 4.4, 9.4, 5.4, 9.9)
P.floor_grate(k, 10.4, 9.4, 11.4, 9.9)

# ---- light ----------------------------------------------------------------------------------------
P.led_strip(k, 1.0, 15.0, 4.5, z=0.0, h=0.012, col=P.LED_Y)
k.area_light(8.0, 4.2, 3.0, '#8090c0', 60, 8.0, rot=(math.radians(-60), 0, 0))     # light from the bay
k.point_light(4.5, 7.5, 3.2, '#d8e4ff', 70, radius=0.8)
k.point_light(11.5, 7.5, 3.2, '#d8e4ff', 70, radius=0.8)
k.point_light(8.0, 9.8, 2.6, '#ffe8c0', 30, radius=0.8)
k.point_light(2.2, 4.9, 1.6, '#ffd890', 12, radius=0.3)

k.render(OUT, light_states={'full': {'pulse': 1.0}, 'dim': {'pulse': 0.6}}, light_samples=128,
         world_light=('#1a2030', 0.45))

apply_world(WORLD, k, (1, 4, 14, 10), doors=[(7, 11), (8, 11)], scene_id='hangar', moves={
    'SHUTTLE': (8, 8), 'LAUNCH CONSOLE': (12, 8), 'BAY DOORS': (7, 4), 'WORKBENCH': (2, 4), 'TOOL DRONE': (2, 7),
    'FUEL TANKS': (13, 5), 'CARGO': (13, 10), 'CRANE ARM': (2, 9)},
    scene_extra={'flicker': {'mode': 'pulse'},
                 'sky': [WIN[0], round(4.0 - WIN[3] * C, 3), WIN[1], round(4.0 - WIN[2] * C, 3)],
                 'layers': {'shuttle': 'parked'}})
print('hangar done')
