"""Tern Holm — a fishing village on a little island off Crownhaven (world id "lumar-tern").

  BVENV/bin/python tools/bridge-art/scenes/lumar_tern.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-tern

One of the small islands round the capital, built in the Look Book's style (October 2026): a crescent of whitewashed
cottages from the richer house kit (assets_house.py) round a shingle cove — thatch and slate, shutters and flower boxes,
a picket-fenced front garden and a vegetable patch, washing on a line — the Tern's Rest under clay pantiles with its
painted sign, the little chapel on the west head with a lantern in its tower for the boats and three old stones in its
yard, the weatherboarded smokehouse with its woodpile, nets drying on racks, fish on the drying racks, boats drawn up on
the shingle with pots and rope and an anchor by them, the pump on the green, gorse and heather and boulders on the
slopes, gulls everywhere.

PREVIEW=1 renders the night alone at a few samples without the live-light passes and leaves the world JSON alone.
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
import assets_house as HK              # noqa: E402
import assets_fishport as P            # noqa: E402

HK.install()
OUT = sys.argv[1]
PREVIEW = bool(os.environ.get('PREVIEW'))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-tern.json')
WID = 'lumar-tern'
COLS, ROWS = 38, 28
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=1.0, margin_x=0.5, seed=5151)
rng = k.rng
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


PATHS = [[(PX + 0.5, QUAY), (PX + 0.5, 12.0)], [(8.0, 14.0), (14.0, 14.6), (24.0, 14.6), (30.0, 13.5)],
         [(12.1, 12.4), (12.6, 14.2)], [(26.1, 11.8), (25.6, 14.4)], [(7.0, 13.6), (8.0, 14.0)]]


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def shingle(x, r):
    """How far into the shingle of the cove (> 0): the beach behind the waterline, wandering."""
    return r - (15.7 + 0.45 * I.n2(x, r, 0.5, 61) + 0.5 * (1 - I.smooth(8.0, 13.0, x)) + 0.5 * I.smooth(26.0, 31.0, x))


def material(x, r):
    p = pd(x, r) + 0.2 * I.n2(x, r, 1.6, 3)
    sh = shingle(x, r)
    if sh > 0.25 + 0.15 * I.n2(x, r, 2.4, 7):
        return 'shingle'
    if p < 0.5:
        return 'path'
    if sh > 0.0:
        return 'grass_dark'
    m = I.n2(x, r, 0.45, 41) + 0.4 * I.n2(x, r, 1.5, 42)
    return 'grass' if m > -0.3 else ('grass_dark' if m > -0.65 else 'stone')


GREEN = '#4c6e3e'
ALB = {'path': ('#8a7e66', 0.3), 'grass': (GREEN, 0.3), 'grass_dark': ('#3e5e3a', 0.3), 'stone': ('#6e6e66', 0.25),
       'shingle': ('#8a8478', 0.3)}
I.ground(k, land, material, ALB)
C.coast(k, land, ground=(material, ALB), palette='emerald', grass=GREEN, rock='#5e5e58', seed=81, beachiness=0.4,
        beach_bias=lambda x, r: 0.9 * I.smooth(QUAY - 3.0, QUAY + 0.5, r),
        keep_clear=[(PX - 0.4, QUAY - 0.2, PX + 1.4, SHIP_R + 0.2), (PX - 12.0, SHIP_R - 0.6, PX + 14.0, SHIP_R + 3.0)],
        sheer=[(PX - 1.8, QUAY + 2.4, PX + 2.8, QUAY + 4.8, 1.4, 'all')])
# the shingle: stones of a few sizes and greys over the beach, thicker toward the water
for _ in range(900):
    x, r = rng.uniform(3.0, 35.0), rng.uniform(14.5, 19.0)
    if (int(x), int(r)) not in land or material(x, r) != 'shingle' or PX - 0.2 < x < PX + 1.2:
        continue
    s = rng.choice((0.03, 0.045, 0.06, 0.08)) * rng.uniform(0.8, 1.2)
    k.rock(x, r, -0.01, s, s * 0.8, s * 0.5, (shade(rng.choice(('#9a9488', '#7a766c', '#b0aa9c', '#6a6a64')), rng.uniform(0.85, 1.1)), 0.2),
           part='shingle', segs=5)

# ---- the pier, the boats drawn up on the shingle and what lies by them -----------------------------------------------
W.dock(k, PX + 0.05, PX + 0.95, QUAY + 0.6, SHIP_R + 0.0, z=0.02)
I.crab_pots(k, PX + 1.6, QUAY - 0.2, n=3)
k.solid(PX + 1, QUAY - 1, PX + 3, QUAY + 1)
for (bx, hull) in ((PX - 3.2, '#2a4a6a'), (PX + 4.2, '#6a3a2a')):    # fishing boats drawn up on the shingle
    W.rowboat(k, bx - 1.0, bx + 1.0, QUAY + 0.2, beam=0.8, hull=hull)
    k.solid(bx - 1.0, QUAY - 0.2, bx + 1.0, QUAY + 0.6)
for (x0, x1, r) in ((PX - 3.0, PX - 0.2, QUAY + 0.3), (PX + 1.2, PX + 4.0, QUAY + 0.3)):   # their lines down to the water
    P.line(k, (x0, r, 0.3), (x1, r + 0.6, -0.1), sag=0.05)
P.anchor(k, PX - 5.6, QUAY + 0.35)
P.rope_coil(k, PX - 2.4, QUAY + 0.6)
P.pot_stack(k, PX + 6.6, QUAY - 0.4)
for (bx, br) in ((26.3, 16.85), (26.7, 17.15)):                       # Maud's baskets
    P.fish_basket(k, bx, br)
P.gull(k, PX - 3.2, QUAY + 0.15, z=0.42)
P.gull(k, 15.4, 16.9, facing=-1)
P.gull(k, PX + 0.5, QUAY + 2.6, z=0.22)
k.cyl(PX + 3.3, QUAY + 4.4, C.WZ - 0.1, C.WZ + 0.22, 0.16, '#c03a2e', 'buoy', verts=14)
k.cyl(PX + 3.3, QUAY + 4.4, C.WZ + 0.08, C.WZ + 0.16, 0.165, '#ece4d4', 'buoy', verts=14)
k.cone(PX + 3.3, QUAY + 4.4, C.WZ + 0.22, C.WZ + 0.38, 0.08, 0.02, '#2e2e34', 'buoy', verts=10)

SMOKE = []


def smoke(ridge, cx):
    rm, zr = ridge
    SMOKE.append([round(cx - 0.12, 3), round(rm - 0.35 - (zr + 1.3) * C45, 3)])


# the cottages round the cove (the richer kit, the old footprints), each with room round it: a lane between every two
THATCH = '#c8a868'
for (x0, x1, r0, r1, roof, door, ch, wall) in ((10.6, 13.6, 9.6, 12.2, THATCH, 12.1, 11.1, '#f0ece0'),
                                                (24.6, 27.6, 9.0, 11.6, '#3a4a5e', 26.1, 25.1, '#f2eee4'),
                                                (22.8, 25.8, 4.4, 7.0, '#c4a060', 24.3, 25.3, '#ece6d8')):
    smoke(W.house(k, x0, x1, r0, r1, wall_h=1.8, rise=1.0, roof=roof, wall=wall, door_x=door,
                  windows=[(x0 + 0.7, 0.8), (x1 - 0.7, 0.8)], chimney=ch), ch)
# the Tern's Rest in the middle, a little taller, its sign
smoke(W.house(k, 17.8, 21.2, 7.6, 11.6, wall_h=2.2, rise=1.2, roof='#a84a30', wall='#e8dcc0', door_x=19.5,
              windows=[(18.5, 0.9), (20.5, 0.9)], windows_up=[(19.5, 1.7)], chimney=20.7, sign=(21.05, 1.7, 'mug'), lanterns=(19.0, 20.0)), 20.7)
V.board_sign(k, "THE TERN'S REST", 'Rye-Regular', 19.5, 11.6, 2.12, size=0.18)
# the front garden of the west cottage (picket fence, flowers), the east cottage's vegetable patch
V.picket_fence(k, (10.45, 12.35), (10.45, 13.3))
V.picket_fence(k, (10.45, 13.3), (11.55, 13.3))
V.picket_fence(k, (11.55, 13.3), (11.55, 12.35))
V.flower_bed(k, 10.6, 12.45, 11.4, 13.15)
k.solid(10.4, 12.3, 11.6, 13.35)
V.picket_fence(k, (24.65, 11.75), (24.65, 13.2))
V.picket_fence(k, (24.65, 13.2), (25.55, 13.2))
V.picket_fence(k, (25.55, 13.2), (25.55, 11.75))
k.box(24.75, 11.8, 0.0, 25.45, 13.1, 0.06, ('#5a4028', 0.3), 'earth')
with k.foliage('leaf'):
    for rr in (12.1, 12.5, 12.9):
        for xx in (24.92, 25.28):
            s_ = rng.uniform(0.09, 0.12)
            k.sphere(xx, rr, 0.12, s_, s_ * 0.85, (shade('#6aa04a', rng.uniform(0.9, 1.1)), 0.15), 'crop', segs=8)
k.solid(24.6, 11.7, 25.6, 13.25)
P.washing(k, 14.0, 16.4, 7.3)
P.cat(k, 19.0, 12.0)
# the chapel on the west head, a lantern in its little tower for the boats; three old stones in its yard
k.box(5.2, 10.2, 0.0, 8.8, 13.4, 0.3, ('#7a7a72', 0.2), 'chapel_footing')
k.box(5.3, 10.3, 0.3, 8.7, 13.3, 2.0, ('#ece6d8', 0.12), 'chapel_wall')
for wx in (5.8, 8.2):                                                 # tall arched windows, lit
    k.box(wx - 0.18, 13.3, 0.7, wx + 0.18, 13.36, 1.5, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.85))
    k.cyl_y(wx, 13.3, 13.36, 1.5, 0.18, 0.18, '#5a3a18', 'window_glass', emit=(W.GLOW, 0.85), verts=12)
    k.box(wx - 0.24, 13.3, 0.6, wx + 0.24, 13.42, 0.68, ('#a89c88', 0.1), 'sill')
    k.point_light(wx, 13.9, 1.1, '#ffc070', 6, radius=0.2, group='flicker')
W._gable_roof(k, 5.2, 8.8, 10.2, 13.4, 2.0, 1.3, '#4a4a52')
k.box(6.5, 9.9, 0.0, 7.5, 10.9, 3.6, ('#ece6d8', 0.12), 'chapel_tower')
W.pyramid(k, 6.4, 9.8, 7.6, 11.0, 3.6, 4.5, ('#4a4a52', 0.2), 'chapel_spire')
W.lantern(k, 7.0, 10.9, 2.9, 3.4, s=0.14, energy=18)
W.door(k, 7.0, 13.3, w=0.7, h=1.2)
k.box(6.55, 13.4, -0.02, 7.45, 13.75, 0.05, ('#9a9284', 0.14), 'step', bevel=0.02)
k.solid(5, 9, 9, 14)
for (hx, hr, kind) in ((4.4, 9.4, 0), (5.3, 8.6, 1), (8.6, 8.4, 0)):
    I.headstone(k, hx, hr, tone='#8a8a84', lean=rng.uniform(-6, 6), kind=kind)
    k.solid(hx - 0.25, hr - 0.2, hx + 0.25, hr + 0.3)
# the smokehouse east, weatherboarded, smoke out of its louvre; its woodpile
k.box(30.0, 9.6, 0.0, 33.0, 12.0, 0.25, ('#6a6a62', 0.2), 'footing')
k.box(30.05, 9.65, 0.25, 32.95, 11.95, 1.6, ('#3e3024', 0.2), 'smokehouse')
z = 0.27
while z < 1.58:
    k.box(30.0, 11.95, z, 33.0, 12.0, z + 0.13, (shade('#4a3a2a', rng.uniform(0.85, 1.12)), 0.2), 'boards')
    k.box(30.0, 11.99, z, 33.0, 12.02, z + 0.02, '#241a12', 'board_shadow')
    z += 0.14
k.box(31.1, 11.98, 0.25, 31.9, 12.06, 1.35, ('#2e2218', 0.15), 'door')
k.box(31.05, 11.98, 1.35, 31.95, 12.08, 1.42, A.WOOD_DD, 'door_frame')
W._gable_roof(k, 30.0, 33.0, 9.6, 12.0, 1.6, 1.0, '#3a3430')
k.box(31.3, 10.6, 2.5, 31.7, 11.0, 2.75, ('#3a3430', 0.2), 'louvre')
SMOKE.append([31.38, round(10.8 - 2.75 * C45, 3)])
k.solid(30, 9, 33, 12)
A.wood_pile(k, 33.35, 34.5, 10.9)
I.drying_rack(k, 29.0, 31.6, 14.2)
I.drying_rack(k, 8.6, 11.0, 15.4)
P.net_rack(k, 22.6, 25.0, 15.2)                                       # nets drying on their racks
P.net_rack(k, 13.4, 15.8, 15.2, col='#5a5a4a', float_col='#e05a30')
W.market_stall(k, 27.2, 29.0, 16.0, 16.7, awning=('#2a5a8a', '#f0ece0'), goods='fish')      # on the green above the beach, clear of every door
k.solid(29, 16, 30, 17)                           # Maud, beside her stall where you can see her
HK.pump(k, 16.0, 12.5)
for (x, r) in ((12.0, 13.6), (27.2, 13.6)):
    W.lantern_post(k, x, r, energy=20)
for (x, r) in ((4.0, 15.4), (33.6, 16.0), (9.8, 7.6), (28.6, 7.2), (31.6, 7.9)):
    W.pine(k, x, r, h=2.2)
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
W.tree(k, 15.2, 5.6, h=2.3, tone='#3a6034')
k.solid(14.85, 5.25, 15.55, 5.95)
W.bench(k, 20.2, 21.6, 6.9)                       # on the rise behind the inn, looking north
k.solid(20.2, 6.7, 21.6, 7.2)
# the slopes: gorse and heather, boulders, wildflowers
for (x, r, s) in ((5.0, 11.0, 0.3), (34.2, 13.0, 0.32), (12.6, 6.0, 0.3), (29.8, 6.3, 0.28), (3.8, 13.3, 0.26)):
    P.gorse(k, x, r, s=s)
    k.solid(x - 0.3, r - 0.25, x + 0.3, r + 0.25)
for (x, r) in ((10.6, 5.6), (18.2, 5.0), (33.0, 14.6), (6.0, 16.2), (27.0, 5.2)):
    P.heather(k, x, r)
for (x, r, s) in ((3.6, 16.6, 0.34), (34.6, 15.4, 0.3), (8.4, 6.6, 0.3), (22.0, 4.6, 0.26)):
    P.boulder(k, x, r, s=s)
for (x, r) in ((14.4, 9.8), (22.4, 8.6), (28.2, 12.8), (9.4, 13.0), (17.0, 13.4), (32.0, 13.2)):
    P.wildflowers(k, x, r)

busy = lambda x, r: pd(x, r) < 0.6 or shingle(x, r) > 0.2
I.tufts(k, [c for c in land if material(c[0] + 0.5, c[1] + 0.5) in ('grass', 'grass_dark')], '#567a4a', per_cell=1.0, avoid=busy)
I.pebbles(k, land, '#7a7a72', per_cell=0.3, avoid=lambda x, r: pd(x, r) < 0.6)

k.area_light(19.0, 12.0, 16.0, '#90a8c8', 2600, 40.0, rot=(math.radians(-35), 0, 0))
if PREVIEW:
    os.environ['SCENE_NOLIT'] = '1'
    k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}}, light_samples=int(os.environ.get('PREVIEW_SAMPLES', 12)),
             world_light=('#26384a', 0.8))
    sys.exit(0)
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=96, world_light=('#26384a', 0.8))


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
