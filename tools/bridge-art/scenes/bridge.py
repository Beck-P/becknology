"""The Bridge — the Wayfarer's captain's deck (Blender scene).

  BVENV/bin/python tools/bridge-art/scenes/bridge.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/bridge

Wood and brass under a stern gallery of five arched windows (a hole: the
engine draws the place the ship is parked over through it). The helm under
the gallery, the chart table in the middle (its hologram is drawn live by
js/worlds/bridge.js), the navigator's desk, the wireless and the letter
rack, engineering's aether gauges, the sensor scope, the chandler's ledger.
Doors: the quarters and the captain's office (scenes/office.py) south, the
passage aft to the fitted rooms (scenes/ship_passage.py) south-east, the
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
import assets_signs as S                       # noqa: E402

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
D.front_wall(k, 8.0, 12.6, 13.0, door=(9.0, 12.0))             # to the quarters
D.front_wall(k, 12.6, 20.6, 13.0, door=(13.0, 15.0))           # aft, to the passage


def side_door(k, xf, ra, rb, face, sign=None):
    """A doorway in a side wall made to read as one from the camera (a first-time player couldn't find the hangar's:
    the wall is seen end-on, so a plain gap in it vanishes). A framed doorway standing proud of the wall face, a ship's
    lantern on its near post, a runner leading in, the next room's light spilling through, and a board with its name
    on the near post, facing the camera. xf: the wall's room-side face; face: +1, the room is east of the wall."""
    d = 0.38 * face                                                    # how far the frame stands out into the room
    xa, xb = sorted((xf - 0.04 * face, xf + d))
    for r0, r1 in ((ra - 0.22, ra), (rb, rb + 0.22)):
        k.box(xa, r0, 0, xb, r1, 2.45, (D.WOOD_D, 0.06), 'door_frame', bevel=0.02)
        k.box(xa - 0.01, r1 - 0.03, 0.02, xb + 0.01, r1 + 0.005, 2.4, (D.BRASS_D, 0.08), 'door_trim')
    k.box(xa, ra - 0.22, 2.3, xb, rb + 0.22, 2.62, (D.WOOD_D, 0.06), 'door_header', bevel=0.02)
    k.box(xa - 0.01, ra - 0.24, 2.6, xb + 0.01, rb + 0.24, 2.66, D.BRASS, 'door_header_cap')
    lx = xf + 0.3 * face                                               # the lantern on the near post
    k.box(lx - 0.05, rb + 0.22, 1.86, lx + 0.05, rb + 0.3, 1.92, D.BRASS_D, 'lantern_bracket')
    k.cyl(lx, rb + 0.33, 1.62, 1.86, 0.075, '#ffe2a0', 'lantern_glass', emit=('#ffc070', 2.2), verts=10)
    k.cyl(lx, rb + 0.33, 1.86, 1.93, 0.09, D.BRASS, 'lantern_cap', verts=10)
    k.cyl(lx, rb + 0.33, 1.57, 1.62, 0.09, D.BRASS, 'lantern_base', verts=10)
    k.point_light(lx + 0.15 * face, rb + 0.5, 1.75, '#ffc890', 14, radius=0.08, group='flicker')
    k.point_light(xf + 0.35 * face, (ra + rb) / 2, 1.1, '#bcd0ff', 30, radius=0.25)   # the next room's light, spilling in at the door
    ra_, rb_ = ra + 0.28, rb - 0.28                                    # a runner from the threshold into the room
    x0, x1 = sorted((xf, xf + 1.7 * face))
    k.box(x0, ra_, 0.0, x1, rb_, 0.012, ('#6a2a22', 0.1), 'rug')
    for rr in (ra_, rb_ - 0.05):
        k.box(x0, rr, 0.012, x1, rr + 0.05, 0.016, D.BRASS_D, 'rug_edge')
    if sign:                                                           # its name on a board off the near post, to the camera
        size, font = 0.34, 'AlegreyaSC-Bold'                           # big enough to read at 32 px a tile, seen at 45 degrees
        wd = S.width(sign, font, size) + 0.28
        sx0, sx1 = sorted((xf + 0.02 * face, xf + (0.02 + wd) * face))
        k.box(sx0, rb + 0.22, 1.98, sx1, rb + 0.26, 2.52, (D.BRASS, 0.1), 'sign_trim')
        k.box(sx0 + 0.04, rb + 0.26, 2.01, sx1 - 0.04, rb + 0.28, 2.49, ('#2a1a10', 0.1), 'sign_board')
        S.letters(k, sign, font, (sx0 + sx1) / 2, rb + 0.28, 2.08, size=size, col='#ffe6a0', depth=0.02, lit=False)


side_door(k, 1.0, 9.0, 11.0, 1, sign='HANGAR')
side_door(k, 20.0, 7.0, 9.0, -1)
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

apply_world(WORLD, k, (1, 4, 19, 12), doors=[(9, 13), (10, 13), (11, 13), (5, 13), (6, 13), (13, 13), (14, 13), (0, 9), (0, 10), (20, 7), (20, 8)], scene_id='bridge',
            scene_extra={'flicker': {'mode': 'pulse'},
                         'sky': [WIN[0], round(RF - WIN[3] * C, 3), WIN[1], round(RF - WIN[2] * C, 3)]})
print('bridge done')
