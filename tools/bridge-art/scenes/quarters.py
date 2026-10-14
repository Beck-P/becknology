"""The pilot's quarters — Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/quarters.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/quarters

Warm wood and dark metal under a panoramic viewport (a hole in the render:
the engine's starfield shows through). Catalog decor and trophies are
variants the engine composites in when the pilot owns them; the drone and
the coffee steam are drawn live by js/worlds/quarters.js.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world  # noqa: E402
import assets_lumar as A                       # noqa: E402
import assets_ship as P                        # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'quarters.json')

H = 2.4 / math.cos(THETA)
C = math.cos(THETA)
k = Kit(16, 12, margin_top=1.0, margin_bottom=0.5, seed=81)

# ---- shell ---------------------------------------------------------------------------
WIN = (4.0, 13.7, 0.95, 3.0)
A.floor_planks(k, 1, 3, 15, 11, tone='#5a3a1a')
P.ship_back_wall(k, 0.5, 15.5, 3.0, H, win=WIN, mullions=(7.2, 10.5), pal=P.Q_WALL)
P.ship_side_wall(k, 0.4, 1.0, 2.5, 11.0, H, pal=P.Q_WALL)
P.ship_side_wall(k, 15.0, 15.6, 2.5, 11.0, H, pal=P.Q_WALL)
P.ship_front_wall(k, 0.4, 15.6, 11.0, door=(7.0, 9.0), pal=P.Q_WALL)
P.led_strip(k, 1.0, 15.0, 3.1, z=0.22)
k.area_light(8.8, 3.6, 2.2, '#7080c0', 30, 4.0, rot=(math.radians(-60), 0, 0))     # starlight

# ---- along the back wall ------------------------------------------------------------------
P.bunk(k, 1.05, 2.95, 3.0, 5.6)
P.wall_shelf_plain(k, 3.08, 3.92, 3.0, 1.2)
PEDESTALS = P.trophy_cabinet(k, 4.05, 10.0, 3.0)
MUG = P.desk_station(k, 10.5, 13.7, 3.0)
P.office_chair(k, 12.1, 4.3, 'up')

# ---- room -------------------------------------------------------------------------------------
P.chess_table(k, 4.5, 6.45)
P.ship_stool(k, 3.55, 6.5)
P.ship_stool(k, 5.45, 6.5)
POT_Z = P.empty_pot(k, 2.5, 7.6)
A.rug(k, 4.3, 7.4, 7.7, 9.5, col='#3a2a5a', trim='#5cc8d0', pattern=True)
STAND_Z = P.empty_stand(k, 9.5, 9.45)
P.storage_locker(k, 12.5, 9.45)
P.catalog_kiosk(k, 14.5, 9.45)
P.floor_plate(k, 1.55, 10.35)
P.sofa(k, 8.7, 11.3, 6.9)
P.coffee_table(k, 10.0, 5.65)
P.pouf(k, 7.95, 8.6, col='#2a5a6a')
P.flight_kit(k, 1.25, 5.78)

# ---- catalog decor + trophies (composited by the engine when owned) --------------------------
for key, fn in (('houseplant', P.houseplant), ('bonsai', P.bonsai), ('neon_cactus', P.neon_cactus)):
    with k.variant('plant', key):
        fn(k, 2.5, 7.6, POT_Z)
for key, fn in (('floor_lamp', P.floor_lamp), ('crystal_lamp', P.crystal_lamp), ('driftwood_lamp', P.driftwood_lamp)):
    with k.variant('lamp', key):
        fn(k, 1.55, 10.35)
for key, fn in (('holo_poster', P.holo_poster), ('arcade_marquee', P.arcade_marquee)):
    with k.variant('poster', key):
        fn(k, 14.45, 3.1)
for key, fn in (('nebula_tank', P.nebula_tank), ('retro_crt', P.retro_crt)):
    with k.variant('tank', key):
        fn(k, 9.5, 9.45, STAND_Z)
for key, fn in (('glass_float', P.glass_float), ('kelp_canister', P.kelp_canister), ('brass_compass', P.brass_compass),
                ('cosmic_soda', P.cosmic_soda)):
    with k.variant('shelf', key):
        fn(k, 3.5, 3.15, 1.2)
TROPHIES = (('first_light', P.trophy_star), ('cabinet_crusher', P.trophy_cabinet_mini), ('wayfarer', P.trophy_compass),
            ('settled_in', P.trophy_chair), ('bookworm', P.trophy_books))
for (key, fn), (x, r, z) in zip(TROPHIES, PEDESTALS):
    with k.variant('trophy_' + key, 'on'):
        fn(k, x, r, z)

# ---- light -------------------------------------------------------------------------------------
k.point_light(4.2, 6.2, 2.7, '#ffc890', 80, radius=0.6)
k.point_light(11.0, 6.0, 2.7, '#ffc890', 70, radius=0.6)
k.point_light(7.8, 9.4, 2.4, '#ffc890', 55, radius=0.6)
k.point_light(13.5, 8.6, 2.2, '#c0a0ff', 25, radius=0.4)

k.render(OUT, light_states={'full': {'pulse': 1.0}, 'dim': {'pulse': 0.5}}, light_samples=128,
         world_light=('#2a2438', 0.4))

apply_world(WORLD, k, (1, 3, 14, 10), doors=[(7, 11), (8, 11)], scene_id='quarters', moves={
    'BED': [(1, 5), (2, 5)], 'TROPHY SHELF': [(4, 3), (5, 3), (6, 3), (7, 3), (8, 3), (9, 3)],
    'CHESS TABLE': (4, 6), 'LOG TERMINAL': [(11, 3), (12, 3), (13, 3)], 'CATALOG TERMINAL': (14, 9),
    'STORAGE LOCKER': (12, 9), 'EMPTY POT': (2, 7), 'EMPTY FLOOR': (1, 10), 'BARE WALL': (14, 3),
    'EMPTY STAND': (9, 9), 'DISPLAY SHELF': (3, 3)},
    scene_extra={'flicker': {'mode': 'pulse'},
                 'sky': [WIN[0], round(3.0 - WIN[3] * C, 3), WIN[1], round(3.0 - WIN[2] * C, 3)],
                 'steam': [MUG[0], round(MUG[1] - MUG[2] * C, 3)]})
print('quarters done')
