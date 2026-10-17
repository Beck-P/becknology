"""The Bridge — the Wayfarer's captain's deck (Blender scene).

  BVENV/bin/python tools/bridge-art/scenes/bridge.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/bridge

Wood and brass under a stern gallery of five arched windows (a hole: the
engine draws the place the ship is parked over through it). The helm under
the gallery, the chart table in the middle (its hologram is drawn live by
js/worlds/bridge.js), the navigator's desk, the wireless and the letter
rack, engineering's aether gauges, the sensor scope, the chandler's ledger.
Doors: the quarters and the captain's office (scenes/office.py) south, the
hangar west, the game room east. Hired crew stand at the posts in the world
JSON's `crewPosts` (js/crew.js).
Decor slots (assets_deck.DECOR) are variants the engine shows when owned;
the envelopes in the rack are the `mail` variant, shown when letters wait.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world  # noqa: E402
import assets_deck as D                        # noqa: E402
import assets_lumar as A                       # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'bridge.json')

H = 3.2 / math.cos(THETA)
C = math.cos(THETA)
k = Kit(21, 14, margin_top=1.0, margin_bottom=0.5, seed=97)
RF = 4.0                                   # the gallery wall's face

# ---- shell ----------------------------------------------------------------------------------
WIN = (3.2, 17.8, 1.0, 3.9)
D.deck_floor(k, 1, RF, 20, 13)
MULL = D.gallery_wall(k, 0.5, 20.5, RF, H, WIN)
D.side_wall(k, 0.4, 1.0, 3.5, 13.0, H, door=(9.0, 11.0))     # to the hangar
D.side_wall(k, 20.0, 20.6, 3.5, 13.0, H, door=(7.0, 9.0), face=-1)   # to the game room
D.front_wall(k, 0.4, 8.0, 13.0, door=(5.0, 7.0))               # to the captain's office
D.front_wall(k, 8.0, 20.6, 13.0, door=(9.0, 12.0))             # to the quarters
D.helm_dais(k, 7.95, RF, 13.05, 6.95)
D.compass_rose(k, 10.5, 6.4, 0.42, z=0.012)
for mx in MULL:
    D.hanging_lantern(k, mx, RF + 0.25, WIN[3], drop=1.2, energy=24)
k.area_light(10.5, RF + 0.6, 3.2, '#6a80d0', 50, 9.0, rot=(math.radians(-55), 0, 0))     # starlight

# ---- along the gallery ------------------------------------------------------------------------
A.bookshelf(k, 1.05, 2.95, RF, top=2.5, levels=(0.15, 0.62, 1.09, 1.56, 2.03))
D.ship_portrait(k, 2.0, RF, 2.95)
D.chart_desk(k, 3.1, 5.9, RF)
PLANT_Z = D.planter(k, 7.5, RF + 0.45)
D.binnacle(k, 8.5, RF + 0.5)
D.ships_wheel(k, 10.5, RF + 1.24, 1.12, R=0.68)
D.telegraph(k, 12.5, RF + 0.5)
D.lamp_plate(k, 14.5, RF + 0.45)
D.radio_desk(k, 15.1, 17.9, RF)
SLOTS = D.letter_rack(k, 18.25, 19.85, RF)
k.solid(18.2, RF, 19.9, RF + 0.45)
D.ship_bell(k, 18.6, RF, 3.0)
D.wall_clock(k, 19.45, RF, 3.05)

# ---- the room ---------------------------------------------------------------------------------
D.gauge_cabinet(k, 2.0, 6.6)
D.aether_scope(k, 19.0, 6.6)
D.chart_table(k, 10.5, 8.5)
D.wingback(k, 10.5, 11.45)
D.side_table_lamp(k, 11.5, 11.55)
D.tripod_telescope(k, 6.5, 6.5)
D.curio_cabinet(k, 19.0, 9.95)
A.coat_rack(k, 1.5, 12.4)
A.barrel(k, 18.3, 11.6, tone=A.WOOD_D)
D.lectern(k, 16.5, 11.45)
A.crate(k, 17.2, 11.15, s=0.6)
CURIO_Z = D.plinth(k, 2.5, 11.5)
D.sea_chest(k, 4.5, 11.5)
D.flag_socket(k, 19.5, 11.5)

# ---- decor (composited by the engine when owned) ------------------------------------------------
PLACE = {
    'deck_plant': lambda fn: fn(k, 7.5, RF + 0.45, PLANT_Z),
    'deck_lamp': lambda fn: fn(k, 14.5, RF + 0.45),
    'deck_rug': lambda fn: fn(k, 7.6, 7.0, 13.4, 10.2),
    'deck_curio': lambda fn: fn(k, 2.5, 11.5, CURIO_Z),
    'deck_flag': lambda fn: fn(k, 19.5, 11.5),
}
for slot, items in D.DECOR.items():
    for key, fn in items:
        with k.variant(slot, key):
            PLACE[slot](fn)
with k.variant('mail', 'on'):                  # letters waiting in the rack
    for i, (x, z, w) in enumerate(SLOTS):
        if i % 3 != 1:
            D.envelope(k, x, z, w, RF, seal=(i % 2 == 0))

# ---- light -------------------------------------------------------------------------------------
k.point_light(5.5, 7.6, 2.6, '#ffc890', 70, radius=0.6)
k.point_light(15.5, 7.6, 2.6, '#ffc890', 70, radius=0.6)
k.point_light(10.5, 11.2, 2.4, '#ffc890', 45, radius=0.6)
k.point_light(3.5, 10.6, 2.3, '#ffc890', 35, radius=0.5)
k.point_light(17.5, 10.6, 2.3, '#ffc890', 35, radius=0.5)

k.render(OUT, light_states={'full': {'pulse': 1.0, 'flicker': 1.0}, 'dim': {'pulse': 0.6, 'flicker': 0.8}},
         light_samples=128, world_light=('#2a2438', 0.4))

apply_world(WORLD, k, (1, 4, 19, 12), doors=[(9, 13), (10, 13), (11, 13), (5, 13), (6, 13), (0, 9), (0, 10), (20, 7), (20, 8)], scene_id='bridge',
            scene_extra={'flicker': {'mode': 'pulse'},
                         'sky': [WIN[0], round(RF - WIN[3] * C, 3), WIN[1], round(RF - WIN[2] * C, 3)]})
print('bridge done')
