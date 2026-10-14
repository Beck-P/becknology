"""Arcadia District — Blender scene (the neon street outside the arcade).

  BVENV/bin/python tools/bridge-art/scenes/arcadia_street.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-street

A walkway lined with storefronts — Joro's pawnshop, ArcadiaMart, Cyber
Noodles, the big arcade, Tinker's, the Chrome clinic — then the hover-bike
dock, the token kiosk and the ramen stand; lamps, benches, vending
machines, a holo billboard, and a railing over the drop to the city below
(the world's own animated background).
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world  # noqa: E402
import assets_cyber as Y               # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'arcadia-street.json')

k = Kit(33, 15, margin_top=1.0, margin_bottom=0.5, seed=221)
RF = 8.0   # shop fronts


def shop(*a, **kw):
    kw.setdefault('depth', 1.6)      # shallow blocks: more of the city skyline shows over the roofs
    return Y.storefront(k, *a, **kw)


Y.tile_floor(k, 0, 8, 33, 13.0, tones=('#3a3450', '#34304a'), size=1.0)
for x in range(0, 33, 3):     # kerb lights along the walkway
    k.box(x + 1.4, 12.85, 0.0, x + 1.6, 12.95, 0.01, '#0c2a30', 'kerb_light', emit=(Y.CYAN, 0.8))

# ---- the storefronts ------------------------------------------------------------------------------------
shop(0.05, 2.95, RF, floors=3, wall='#2a2430', trim=Y.YEL, name='PAWN', name_col=Y.YEL, door_x=1.5,
             shop_glow='#5a3a18', lit=0.5)
shop(3.05, 6.95, RF, floors=3, wall='#242a3a', trim=Y.CYAN, name='MART', name_col=Y.CYAN, door_x=4.5,
             shop_glow='#4a5a7a', awning='#e870c0', lit=0.6)
shop(7.05, 10.95, RF, floors=4, wall='#301c24', trim=Y.PINK, name='NOODLES', name_col=Y.PINK, door_x=8.5,
             shop_glow='#7a2a20', blade=Y.PINK, awning='#a02a2a', lit=0.7)
H = shop(11.05, 15.95, RF, floors=4, wall='#1e1838', trim=Y.PURP, name=None, door_x=13.0, shop_glow='#5a2a8a',
                 blade=Y.CYAN, lit=0.5)
Y.neon_text(k, 'ARCADE', 13.5, RF + 0.04, 2.0, h=0.55, col=Y.PINK, energy=14)
Y.neon_text(k, 'PLAY ALL NIGHT', 13.5, RF + 0.04, 3.1, h=0.22, col=Y.CYAN, board=False, energy=6)
shop(16.05, 17.95, RF, floors=3, wall='#242830', trim=Y.YEL, name='TECH', name_col=Y.CYAN, door_x=16.5,
             shop_glow='#2a5a3a', lit=0.6)
shop(18.05, 20.95, RF, floors=4, wall='#283444', trim=Y.CYAN, name='CLINIC', name_col=Y.CYAN_L, door_x=19.5,
             shop_glow='#2a6a7a', lit=0.5)
shop(21.05, 23.45, RF - 0.9, floors=1, wall='#20202a', trim=Y.CYAN, door_x=22.25, shop_glow='#14202a',
             roof_bits=False, lit=0.0)                        # bike garage
shop(23.55, 25.95, RF - 0.6, floors=3, wall='#2a2036', trim=Y.PURP, door_x=24.75, shop_glow='#3a2a5a', lit=0.6)
shop(26.05, 29.4, RF - 0.9, floors=3, wall='#2e1c22', trim=Y.PINK, door_x=27.7, shop_glow='#3a1a1a', lit=0.5)
shop(29.5, 33.0, RF, floors=4, wall='#1e2236', trim=Y.CYAN, door_x=31.2, shop_glow='#1a2a4a', blade=Y.YEL, lit=0.6)

# ---- in front of them ------------------------------------------------------------------------------------
Y.hover_bike(k, 22.25, 7.6)
for c in (21, 22, 23):
    k.blocked.discard((c, 8))            # the pad's front edge is walkable
Y.token_kiosk(k, 24.5, 7.6)
Y.ramen_stand(k, 26.3, 28.9, 7.15, 7.6)
Y.street_lamp(k, 1.5, 9.4)
Y.street_lamp(k, 24.5, 9.4, col=Y.PINK)
Y.street_lamp(k, 12.5, 12.4, col=Y.PURP)
Y.metal_bench(k, 2.55, 3.95, 9.45)
Y.vending_machine(k, 7.5, 9.0)
Y.vending_machine(k, 23.5, 9.0, body='#183040')
Y.trash_can(k, 9.5, 9.5)
Y.holo_kiosk(k, 14.5, 11.5)
for (x, r) in ((10, 9), (7, 12)):
    k.solid(x, r, x + 1, r + 1)
for (x, r, rx, ry, c) in ((5.0, 11.2, 0.7, 0.35, Y.CYAN), (11.4, 10.6, 0.5, 0.25, Y.PINK), (18.6, 11.8, 0.8, 0.3, Y.PURP),
                          (27.4, 10.4, 0.6, 0.3, '#ff5050'), (31.0, 12.1, 0.5, 0.25, Y.CYAN), (2.2, 12.3, 0.4, 0.2, Y.YEL)):
    Y.puddle(k, x, r, rx, ry, tint=c)
Y.manhole(k, 16.5, 10.5)
Y.manhole(k, 29.5, 9.8)
Y.street_planter(k, 5.5, 9.4, glow=Y.CYAN)
Y.street_planter(k, 20.5, 9.4, leaf='#3a2a50', glow=Y.PINK)
Y.street_planter(k, 30.5, 9.4, glow=Y.YEL)
Y.metal_bench(k, 28.3, 29.7, 12.3)

Y.street_railing(k, 0, 33, 13.0)
for (x, c) in ((5.0, '#a060ff'), (13.0, '#ff60c0'), (21.0, '#60c0ff'), (29.0, '#a060ff')):
    k.point_light(x, 10.5, 3.0, c, 45, radius=1.0)

k.area_light(16.5, 6.0, 12.0, '#7058b8', 900, 34.0, rot=(math.radians(-35), 0, 0))     # sky glow on the roofs

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.8}}, light_samples=128,
         world_light=('#241a40', 0.5))

k.solid(7, 8, 8, 9)                     # behind the vending machines
k.solid(23, 8, 24, 9)
apply_world(WORLD, k, (0, 8, 32, 12), scene_id='arcadia-street', moves={
    'JOROS PAWNSHOP': (1, 7), 'ARCADIAMART': (4, 7), 'CYBER NOODLES': (8, 7), 'ARCADIA ARCADE': [(12, 7), (13, 7)],
    'TINKERS TECH': (16, 7), 'HOVER-BIKE DOCK': (22, 7), 'TOKEN KIOSK': (24, 7),
    'NEON RAMEN': (27, 7), 'HOLO-BILLBOARD': (14, 11), 'TRASH CAN': (9, 9)},
    actors=[{'sheet': 'npc-shopper', 'x': 10, 'y': 9, 'facing': 'down'},
            {'sheet': 'npc-pawn-customer', 'x': 7, 'y': 12, 'facing': 'up'}],
    scene_extra={'backdrop': True})
print('street done')
