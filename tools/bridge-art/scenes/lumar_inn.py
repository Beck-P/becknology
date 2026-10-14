"""Blue Lantern Inn — Blender scene. Usage: BVENV/bin/python lumar_inn.py RENDER_DIR"""
import math
import sys
from _lumar_room import A, H, FLOOR, DOORS, new_kit, render, apply_world, world_path

k = new_kit(21)
A.room(k, 1, 2, 13, 9, H, door=(6.0, 8.0))

# ---- front desk + stairs (left) ---------------------------------------------------
A.trunk(k, 1.1, 2.15, w=0.8, d=0.5)
A.key_board(k, 1.9, 2.0)
A.stairs(k, 3.0, 5.4, 2.0)
A.ledger_desk(k, 1.0, 3.9, 4.15, 4.8)
A.desk_lamp(k, 3.3, 4.35, 0.95)
k.solid(1, 3, 4, 4)                       # behind the desk

# ---- hearth corner -------------------------------------------------------------------
A.window(k, 6.4, 2.0)
A.grandfather_clock(k, 7.35, 2.0)
A.fireplace(k, 9.0, 2.0, H)
A.painting(k, 9.0, 2.22, 1.62)
A.wall_sconce(k, 10.4, 2.0, energy=5)
A.rug(k, 7.8, 3.0, 10.2, 4.4, col='#2a4c8c', pattern=True)
A.armchair(k, 7.5, 3.55, facing='up', tone='#6a3a6a')
A.armchair(k, 10.5, 3.55, facing='up', tone='#6a3a6a')
A.window(k, 11.8, 2.0)
A.bench(k, 11.15, 12.85, 2.45)            # window seat
A.coat_rack(k, 12.4, 4.4)

# ---- dining -------------------------------------------------------------------------
A.round_table(k, 2.5, 6.5)
A.stool(k, 1.5, 6.55)
A.stool(k, 3.5, 6.55)
A.plate(k, 2.35, 6.4, 0.78)
A.plate(k, 2.75, 6.62, 0.78, food='#e8d070')
A.mug(k, 2.7, 6.3, 0.78)
for tx in (7.5, 10.5):
    A.round_table(k, tx, 6.5)
    A.stool(k, tx - 1.0, 6.55)
    A.stool(k, tx + 1.0, 6.55)
    A.mug(k, tx - 0.2, 6.6, 0.78)
A.plate(k, 10.65, 6.6, 0.78)
for tx in (2.5, 7.5, 10.5):
    A.candle(k, tx + 0.12, 6.35, 0.78)
A.rug(k, 6.1, 7.3, 7.9, 8.95, col='#8a3a2a', pattern=True)
A.trunk(k, 1.1, 7.85, w=0.85, d=0.55, tone='#4a5a6a')
A.trunk(k, 1.2, 7.95, w=0.6, d=0.4, tone='#7a4a2a', z0=0.5)
A.potted_plant(k, 12.5, 8.4)
A.barrel(k, 4.4, 8.35)

# ---- light ----------------------------------------------------------------------------
A.hanging_lamp(k, 2.4, 4.6, energy=100, visible=False)
A.hanging_lamp(k, 5.6, 5.4, energy=110, visible=False)
A.hanging_lamp(k, 9.0, 6.8, energy=115, visible=False)
for wx in (6.4, 11.8):
    k.area_light(wx, 2.6, 1.6, '#7090d0', 30, 1.0, rot=(math.radians(-70), 0, 0))

render(k, sys.argv[1])
apply_world(world_path('lumar-inn'), k, FLOOR, doors=DOORS, scene_id='lumar-inn', moves={
    'STREET': DOORS, 'INNKEEPER': (2, 4), 'STAIRS': (4, 2), 'FIREPLACE': (8, 2), 'TABLE': (2, 6),
    'PATRON': [(6, 6), (9, 6)], 'COAT RACK': (12, 4), 'WINDOW': (11, 2)},
    actors=[{'sheet': 'npc-innkeeper', 'x': 2, 'y': 3, 'facing': 'down'},
            {'sheet': 'npc-traveler', 'x': 6, 'y': 6, 'facing': 'right', 'pose': 'sit'},
            {'sheet': 'npc-quiet', 'x': 9, 'y': 6, 'facing': 'right', 'pose': 'sit'}])
print('inn done')
