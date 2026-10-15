"""Tern Holm — a fishing village on a little island off Crownhaven (world id "lumar-tern").

  BVENV/bin/python tools/bridge-art/scenes/lumar_tern.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-tern

One of the small islands round the capital: a crescent of whitewashed cottages round a shingle cove, nets drying on
poles, the smokehouse with its smoke, a little chapel with a lantern for the boats, the Tern's Rest, crab pots stacked on
the pier where your sloop ties up. Fisherfolk mending nets; terns everywhere.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_coast as C               # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_village as V             # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-tern.json')
WID = 'lumar-tern'
COLS, ROWS = 38, 28
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=1.0, margin_x=0.5, seed=5151)
C45 = math.cos(math.radians(45))

LOBES = [(19, 11, 14, 7.5), (8, 14, 6, 6), (30, 14, 6, 6)]
land = I.mask(COLS, ROWS, LOBES, seed=51, amp=0.13)
land = I.flood(land, (19, 11))
QUAY = 17
land = {(c, r) for (c, r) in land if r <= QUAY or not (12 <= c <= 26)}
land |= {(c, r) for c in range(12, 27) for r in range(14, QUAY + 1)}
PX = 19
PIER = [(PX, r) for r in range(QUAY + 1, QUAY + 4)]
SHIP_R = QUAY + 4


PATHS = [[(PX + 0.5, QUAY), (PX + 0.5, 12.0)], [(8.0, 14.0), (14.0, 14.6), (24.0, 14.6), (30.0, 13.5)]]


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def material(x, r):
    p = pd(x, r) + 0.2 * I.n2(x, r, 1.6, 3)
    if p < 0.55:
        return 'path'
    m = I.n2(x, r, 0.45, 41) + 0.4 * I.n2(x, r, 1.5, 42)
    return 'grass' if m > -0.3 else ('grass_dark' if m > -0.65 else 'stone')


ALB = {'path': ('#8a7e66', 0.3), 'grass': ('#40603a', 0.3), 'grass_dark': ('#32523a', 0.3), 'stone': ('#6e6e66', 0.25)}
I.ground(k, land, material, ALB)
C.coast(k, land, ground=(material, ALB), palette='emerald', grass='#40603a', rock='#5e5e58', seed=81, beachiness=0.4,
        beach_bias=lambda x, r: 0.9 * I.smooth(QUAY - 3.0, QUAY + 0.5, r),
        keep_clear=[(PX - 0.4, QUAY - 0.2, PX + 1.4, SHIP_R + 0.2), (PX - 12.0, SHIP_R - 0.6, PX + 14.0, SHIP_R + 3.0)],
        sheer=[(PX - 1.2, QUAY + 0.9, PX + 2.2, QUAY + 3.0)])

W.dock(k, PX + 0.05, PX + 0.95, QUAY + 0.6, SHIP_R + 0.0, z=0.02)
I.crab_pots(k, PX + 1.6, QUAY - 0.2, n=3)
k.solid(PX + 1, QUAY - 1, PX + 3, QUAY + 1)
for bx in (PX - 3.2, PX + 4.2):                      # fishing boats drawn up on the shingle
    W.rowboat(k, bx - 1.0, bx + 1.0, QUAY + 0.2, beam=0.8)
    k.solid(bx - 1.0, QUAY - 0.2, bx + 1.0, QUAY + 0.6)

SMOKE = []


def smoke(ridge, cx):
    rm, zr = ridge
    SMOKE.append([round(cx - 0.12, 3), round(rm - 0.15 - (zr + 0.65) * C45, 3)])


# the cottages round the cove, each with room round it: a lane between every two, gardens in front
for (x0, x1, r0, r1, roof, door, ch) in ((10.6, 13.6, 9.6, 12.2, '#2a4a6a', 12.1, 11.1), (24.6, 27.6, 9.0, 11.6, '#2a5a3e', 26.1, 25.1),
                                          (22.8, 25.8, 4.4, 7.0, '#5a3a2a', 24.3, 25.3)):
    smoke(W.house(k, x0, x1, r0, r1, wall_h=1.8, rise=1.0, roof=roof, wall='#f0ece0', door_x=door,
                  windows=[(x0 + 0.7, 0.8), (x1 - 0.7, 0.8)], chimney=ch), ch)
    W.planter(k, x0 + 0.15, x0 + 1.05, r1 + 0.25)
# the Tern's Rest in the middle, a little taller, its sign
smoke(W.house(k, 17.8, 21.2, 7.6, 11.6, wall_h=2.2, rise=1.2, roof='#6a3a28', wall='#e8dcc0', door_x=19.5,
              windows=[(18.5, 0.9), (20.5, 0.9)], windows_up=[(19.5, 1.7)], chimney=20.7, sign=(21.05, 1.7, 'mug'), lanterns=(19.0, 20.0)), 20.7)
V.board_sign(k, "THE TERN'S REST", 'Rye-Regular', 19.5, 11.6, 2.0, size=0.18)
# the chapel on the west head, a lantern in its little tower for the boats
k.box(5.2, 10.2, 0.0, 8.8, 13.4, 0.3, ('#7a7a72', 0.2), 'chapel_footing')
k.box(5.3, 10.3, 0.3, 8.7, 13.3, 2.0, ('#ece6d8', 0.12), 'chapel_wall')
W._gable_roof(k, 5.2, 8.8, 10.2, 13.4, 2.0, 1.3, '#4a4a52')
k.box(6.5, 9.9, 0.0, 7.5, 10.9, 3.6, ('#ece6d8', 0.12), 'chapel_tower')
W.pyramid(k, 6.4, 9.8, 7.6, 11.0, 3.6, 4.5, ('#4a4a52', 0.2), 'chapel_spire')
W.lantern(k, 7.0, 10.9, 2.9, 3.4, s=0.14, energy=18)
W.door(k, 7.0, 13.3, w=0.7, h=1.2)
k.solid(5, 9, 9, 14)
# the smokehouse east, smoke out of its louvre; drying racks, nets on poles
k.box(30.0, 9.6, 0.0, 33.0, 12.0, 1.6, ('#4a3a2a', 0.2), 'smokehouse')
W._gable_roof(k, 30.0, 33.0, 9.6, 12.0, 1.6, 1.0, '#3a3430')
k.box(31.3, 10.6, 2.5, 31.7, 11.0, 2.75, ('#3a3430', 0.2), 'louvre')
SMOKE.append([31.38, round(10.8 - 2.75 * C45, 3)])
k.solid(30, 9, 33, 12)
I.drying_rack(k, 29.0, 31.6, 14.2)
I.drying_rack(k, 8.6, 11.0, 15.4)
for (x0, x1, r) in ((22.6, 25.0, 15.2), (13.4, 15.8, 15.2)):         # nets on poles
    for x in (x0, x1):
        k.cyl(x, r, 0.0, 1.4, 0.04, ('#5a4a32', 0.2), 'net_pole', verts=5)
    k.poly([(x0, r, 1.35), (x1, r, 1.35), (x1, r + 0.05, 0.4), (x0, r + 0.05, 0.4)], ('#6a6a5a', 0.3), 'net')
    k.solid(x0 - 0.1, r - 0.15, x1 + 0.1, r + 0.2)
W.market_stall(k, 27.2, 29.0, 16.0, 16.7, awning=('#2a5a8a', '#f0ece0'), goods='fish')      # on the green above the beach, clear of every door
k.solid(29, 16, 30, 17)                           # Maud, beside her stall where you can see her
for (x, r) in ((12.0, 13.6), (27.2, 13.6)):
    W.lantern_post(k, x, r, energy=20)
for (x, r) in ((4.0, 15.4), (33.6, 16.0), (9.8, 7.6), (28.6, 7.2)):
    W.pine(k, x, r, h=2.2)
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
W.bench(k, 20.2, 21.6, 6.9)                       # on the rise behind the inn, looking north
k.solid(20.2, 6.7, 21.6, 7.2)

busy = lambda x, r: pd(x, r) < 0.6
I.tufts(k, [c for c in land if material(c[0] + 0.5, c[1] + 0.5) in ('grass', 'grass_dark')], '#4e6e44', per_cell=1.0, avoid=busy)
I.pebbles(k, land, '#7a7a72', per_cell=0.3, avoid=busy)

k.area_light(19.0, 12.0, 16.0, '#90a8c8', 2600, 40.0, rot=(math.radians(-35), 0, 0))
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=96, world_light=('#26384a', 0.8))


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = {'name': 'Tern Holm', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [PX, QUAY]}, 'moonColor': '#d8f0e0', 'shipExit': True,
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         {'x': PX, 'y': QUAY + 2, 'type': 'go_sailing', 'label': 'DOCK', 'prompt': 'PRESS E TO GO SAILING'},
         {'x': 19, 'y': 11, 'type': 'enter_world', 'target': 'lumar-tern-inn', 'spawn': [7, 8], 'label': "THE TERN'S REST", 'prompt': 'PRESS E TO GO IN'},
         look('CHAPEL', 7, 13, 'THE LITTLE CHAPEL ON THE HEAD. A LANTERN BURNS IN ITS TOWER ALL NIGHT SO THE BOATS CAN FIND THEIR WAY HOME.'),
         look('SMOKEHOUSE', 31, 12, 'THE SMOKEHOUSE. RACKS OF SILVERFIN GOING GOLD IN THE SMOKE. THE SMELL WILL BE ON YOU FOR DAYS.'),
         look('NETS', 14, 15, 'NETS DRYING ON THEIR POLES, MENDED A HUNDRED TIMES. EVERY KNOT IS SOMEBODY\'S.'),
         {'x': 28, 'y': 16, 'type': 'dialog', 'label': 'FISH STALL', 'prompt': 'PRESS E TO TALK', 'dialog': 'THE FISHWIFE WIPES HER HANDS.'},
         look('CRAB POTS', PX + 2, QUAY, 'CRAB POTS STACKED ON THE PIER. ONE OF THEM HAS A CRAB IN IT WHO DOES NOT LOOK HAPPY ABOUT ANY OF THIS.'),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER, scene_id=WID,
            actors=[{'sheet': 'npc-fishwife', 'x': 29, 'y': 16, 'facing': 'left'}],
            scene_extra={'backdrop': True, 'smoke': SMOKE})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in land and (c, r) not in PIER:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -2.0, COLS + 0.5, ROWS + 1.0]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('tern done; walkable', len(land))
