"""Sapphire Port — the trading town (world id "lumar-sapphire").

  BVENV/bin/python tools/bridge-art/scenes/lumar_sapphire.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-sapphire

The busiest island on the sea: your sloop ties up at the end of the quay,
fishing boats at the next pier along. Behind the quay a market square of
striped stalls round a well, blue-roofed houses with smoking chimneys, the
Zephyr trader's warehouse; up the west hill the Sapphire Light sweeps the
water with a cold blue beam; east, the potter's yard with its kiln, fish
drying on racks, and the morning-tide shrine on the rocks at the point.
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

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-sapphire.json')
COLS, ROWS = 58, 38
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=1.0, margin_x=0.5, seed=1301)
C45 = math.cos(math.radians(45))
CRYSTAL = ('#1a2a6a', '#4080f0')

LOBES = [(29, 16.5, 23, 9), (9, 18, 6.5, 8), (49, 19, 7.5, 7.5)]
land = I.mask(COLS, ROWS, LOBES, seed=13, amp=0.12)
land = I.flood(land, (29, 17))
QUAY = 24                                         # the quay's front row: everything south of it is the harbour
land = {(c, r) for (c, r) in land if r <= QUAY or not (12 <= c <= 44)}

PX, FX = 28, 38                                   # the sloop's pier, the fishing pier
PIER = [(PX, r) for r in range(QUAY + 1, QUAY + 4)]
FLEN = 6                                          # the fishing pier: a long jetty with a head to fish from
FPIER = I.jetty_cells((FX, QUAY + 1), FLEN, 's')
SHIP_R = QUAY + 4
SL = 7.0

# ---- ground: flagstone town, grass and paths beyond ------------------------------------------------------
TOWN = {(c, r) for (c, r) in land if 12 <= c <= 44 and 14 <= r <= QUAY}
PATHS = [[(9.0, 20.5), (12.0, 21.0), (14.0, 20.0)], [(8.6, 19.8), (8.6, 17.0)],
         [(44.0, 20.0), (47.0, 19.5), (52.5, 21.0)], [(29.5, 14.0), (29.5, 10.0)]]


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def material(x, r):
    p = pd(x, r) + 0.15 * I.n2(x, r, 1.6, 3)
    if p < 0.45:
        return 'path'
    m = I.n2(x, r, 0.4, 11) + 0.4 * I.n2(x, r, 1.5, 12)
    return 'grass' if m > -0.25 else ('grass_dark' if m > -0.6 else 'stone')


ALB = {'path': ('#7a7470', 0.3), 'grass': ('#3a5040', 0.3), 'grass_dark': ('#30443a', 0.3), 'stone': ('#6a6e78', 0.25)}
W.island_ground(k, TOWN, tone='#6a6e7a', grass='#3a5040', coast=True)
I.ground(k, land - TOWN, material, ALB)

terrain = C.coast(k, land, ground=(material, ALB), palette='sapphire', grass='#3a5040', rock='#4a5058', seed=41, beachiness=-0.1,
                  beach_bias=lambda x, r: 0.8 * I.smooth(46.0, 50.0, x) * I.smooth(20.0, 23.0, r),
                  keep_clear=[(11.5, QUAY + 0.6, 45.0, QUAY + 2.0),
                              (PX - 0.4, QUAY, PX + 1.4, SHIP_R + 0.2), (FX - 1.5, QUAY, FX + 2.4, QUAY + 3.6), (FX - 0.6, QUAY, FX + 1.6, QUAY + FLEN + 2.4),
                              (PX + 0.5 - 0.45 * SL - 0.8, SHIP_R - 0.2, PX + 0.5 + 0.55 * SL + 1.8, SHIP_R + 1.9)],
                  sheer=[(11.9, QUAY + 0.9, 44.1, QUAY + 6.0)])

# the quay wall: dressed stone dropping to the water along the town's front
k.box(11.8, QUAY + 0.95, C.WZ - 0.6, 44.2, QUAY + 1.1, 0.0, ('#5a5e68', 0.2), 'quay_wall')
x = 12.0
while x < 44.0:
    k.box(x + 0.02, QUAY + 1.08, C.WZ - 0.4, x + 0.48, QUAY + 1.12, -0.02, (shade('#5a5e68', k.rng.uniform(0.85, 1.1)), 0.2), 'quay_block')
    x += 0.5
for x in (13.5, 17.0, 21.0, 24.5, 32.5, 35.5, 41.0):
    k.cyl(x, QUAY + 0.75, 0.0, 0.35, 0.12, ('#2a2a30', 0.1), 'bollard', verts=10)
    k.cyl(x, QUAY + 0.75, 0.35, 0.4, 0.15, '#2a2a30', 'bollard_cap', verts=10)
    k.solid(x - 0.2, QUAY + 0.55, x + 0.2, QUAY + 0.95)

# ---- the piers, the fishing boats -----------------------------------------------------------------
W.dock(k, PX + 0.05, PX + 0.95, QUAY + 0.9, SHIP_R + 0.0, z=0.02)
# no galleon at the pier any more: your own sloop ties up at its end (js/sloop.js draws it, MOORINGS)
I.fishing_jetty(k, (FX, QUAY + 1), FLEN, 's', glow='#80b0ff')
for (bx, sail) in ((FX - 0.95, '#e8e4dc'), (FX + 1.95, None)):
    n0, l0 = len(k.parts), len(k.lights)
    W.boat(k, bx, QUAY + 2.2, length=2.4, sail=sail)
    C.sink(k, n0, C.WZ + 0.12, l0)

# ---- the town: houses and the warehouse along the north of the square ----------------------------------------------
SMOKE = []


def smoke(ridge, cx):
    rm, zr = ridge
    SMOKE.append([round(cx - 0.12, 3), round(rm - 0.15 - (zr + 0.65) * C45, 3)])


smoke(W.house(k, 13.2, 17.0, 10.6, 14.0, wall_h=2.0, roof=W.ROOF_SLATE, wall='#c8c4b8', door_x=15.1,
              windows=[(13.9, 0.85), (16.3, 0.85)], windows_up=[(15.1, 1.5)], chimney=13.8), 13.8)
smoke(W.house(k, 17.6, 21.6, 10.0, 14.0, wall_h=2.3, rise=1.4, roof='#2a4a7a', wall='#d8d0c0', door_x=19.6,
              windows=[(18.4, 0.9), (20.8, 0.9)], windows_up=[(18.4, 1.7), (20.8, 1.7)], chimney=21.0,
              sign=(21.45, 1.75, 'mug'), lanterns=(19.0, 20.2)), 21.0)
W.house(k, 22.4, 27.2, 9.6, 14.0, wall_h=2.6, rise=1.2, roof='#3a4a5a', wall='#8a8a90', door_x=24.8,
        windows=[(23.2, 1.0), (26.4, 1.0)], windows_up=[(24.8, 1.9)], stone=True, sign=(27.05, 1.9, 'compass'))
k.box(23.9, 14.0, 0.0, 25.7, 14.06, 1.6, ('#4a3420', 0.12), 'warehouse_doors')          # big doors on the warehouse
for xx in (24.25, 24.8, 25.35):
    k.box(xx - 0.02, 14.06, 0.0, xx + 0.02, 14.09, 1.6, '#2a1a10', 'warehouse_plank')
smoke(W.house(k, 31.8, 35.8, 10.0, 14.0, wall_h=2.2, rise=1.3, roof='#2a4a7a', wall='#c8c0b0', door_x=33.8,
              windows=[(32.6, 0.9), (35.0, 0.9)], windows_up=[(33.8, 1.6)], chimney=35.2), 35.2)
smoke(W.house(k, 36.4, 40.4, 10.6, 14.0, wall_h=2.0, roof=W.ROOF_SLATE, wall='#e0d8c8', door_x=38.4,
              windows=[(37.2, 0.85), (39.6, 0.85)], chimney=37.0, sign=(40.25, 1.6, 'bread')), 37.0)
W.house(k, 41.0, 44.0, 11.4, 14.4, wall_h=1.9, rise=1.0, roof='#2a4a7a', wall='#b8b0a0', door_x=42.5,
        windows=[(41.7, 0.8), (43.3, 0.8)])
for (x0, x1, r) in ((13.2, 17.0, 14.0), (17.6, 21.6, 14.0), (31.8, 35.8, 14.0), (36.4, 40.4, 14.0)):
    W.planter(k, x0 + 0.2, x0 + 1.2, r + 0.25)
k.solid(12, 9, 28, 14)                                    # behind the house rows, either side of the lane
k.solid(31.6, 9, 45, 14)
W.shore_crystals(k, 30.8, 9.2, col=CRYSTAL, s=1.0, energy=10)                               # the lookout up the lane
W.bench(k, 28.3, 29.7, 10.2)
k.solid(28.3, 10.0, 29.7, 10.5)

# ---- the market square ---------------------------------------------------------------------------------------------
W.market_stall(k, 19.6, 21.6, 16.4, 17.2, awning=('#2a4a9a', '#e8e8f0'), goods='produce')
W.market_stall(k, 23.4, 25.4, 16.4, 17.2, awning=('#e8e8f0', '#2a4a9a'), goods='fish')
W.market_stall(k, 32.6, 34.6, 16.4, 17.2, awning=('#c0a040', '#e8e8f0'), goods='produce')
W.market_stall(k, 36.4, 38.4, 16.4, 17.2, awning=('#e8e8f0', '#a03a2e'), goods='fish')
I.well(k, 29.5, 18.6)
for (x, r) in ((18.0, 15.6), (27.0, 21.6), (32.0, 21.6), (40.4, 15.6), (14.5, 22.4), (43.0, 22.4)):
    W.lantern_post(k, x, r, energy=18)
    k.point_light(x + 0.3, r + 0.2, 1.9, '#4080ff', 10, radius=0.1, group='flicker')          # blue flame
W.bunting(k, (18.0, 15.6, 2.0), (40.4, 15.6, 2.0), sag=0.5, cols=('#2a4a9a', '#e8e8f0', '#c0a040', '#4080f0'))
for (x, r) in ((18.9, 16.75), (39.0, 16.75), (26.2, 22.0)):          # stock beside the stalls, the square left open
    A.crate(k, x, r, s=0.6, tone=A.WOOD_L)
A.barrel(k, 22.5, 16.8, h=0.8, radius=0.3)                                  # in the gaps between the stalls
A.barrel(k, 35.5, 16.8, h=0.8, radius=0.3)
k.box(14.45, 16.45, 0.0, 14.55, 16.55, 1.3, A.WOOD_D, 'note_post')                           # the trader's note
k.box(14.3, 16.55, 0.85, 14.7, 16.58, 1.25, '#e8dcc0', 'note')
k.solid(14, 16, 15, 17)
W.bench(k, 21.0, 22.6, 20.6)
W.bench(k, 36.4, 38.0, 20.6)
W.wall_lantern(k, 24.8, 14.0, z=1.9, energy=8)

# ---- the west hill and the Sapphire Light ---------------------------------------------------------------------------
LH = (8.6, 15.6)
I.lighthouse(k, *LH)
k.box(7.2, 16.5, 0.0, 10.0, 17.4, 0.25, ('#7a7a86', 0.2), 'lh_step', bevel=0.03)
for (x, r) in ((5.8, 19.6), (11.4, 14.6), (6.2, 15.0)):
    W.pine(k, x, r, h=2.4)
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)

# ---- east: the potter's yard, drying racks, the morning-tide shrine ---------------------------------------------
KILN = (47.5, 16.8)
SMOKE.append([round(v, 3) for v in I.kiln(k, *KILN)])
W.potter_wheel(k, 45.4, 18.6)
I.drying_rack(k, 49.0, 51.6, 19.8)
I.drying_rack(k, 46.0, 48.2, 21.6)
SHRINE = (54.0, 21.2)
I.standing_stone(k, SHRINE[0], SHRINE[1], h=1.0, tone='#8a90a0', glyph=CRYSTAL[1])
for i in range(6):
    a = i * math.pi / 5
    k.cyl(SHRINE[0] + math.cos(a) * 0.6, SHRINE[1] + 0.3 + math.sin(a) * 0.3, 0.0, 0.05, 0.05, '#e8dcc0', 'shell', verts=6)
for (x, r, s) in ((51.0, 14.6, 0.9), (55.0, 18.4, 0.8), (6.0, 23.0, 0.8), (44.2, 11.0, 1.0), (10.8, 11.2, 0.9),
                  (52.6, 23.2, 0.7)):
    W.shore_crystals(k, x, r, col=CRYSTAL, s=s, energy=10, solid=s > 0.75)
for (x, r) in ((49.8, 13.6), (53.2, 16.4), (44.8, 24.0)):
    W.tree(k, x, r, h=2.4, tone='#2e4a44')
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)
k.solid(45, 18, 46, 19)                                   # the potter at the wheel
k.solid(25, 15, 26, 16)                                   # the trader at the warehouse door

# ---- scatter ------------------------------------------------------------------------------------------------------
busy = lambda x, r: pd(x, r) < 0.6
I.tufts(k, [c for c in land - TOWN if material(c[0] + 0.5, c[1] + 0.5) in ('grass', 'grass_dark')], '#4a6650', per_cell=1.0,
        avoid=busy)
I.pebbles(k, land - TOWN, '#6a6e78', per_cell=0.2, avoid=busy)

k.area_light(29.0, 16.0, 16.0, '#8a98d0', 2600, 40.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.point_light(29.0, 18.0, 4.0, '#d8e0ff', 50, radius=1.5)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=96,
         world_light=('#26344e', 0.8))

# ---- the world -----------------------------------------------------------------------------------------------------
old = json.load(open(WORLD))
byl = {}
for i in old['interactions']:
    byl.setdefault(i.get('label'), []).append(i)


def keep(label, x, y, n=0):
    it = dict(byl[label][n])
    it.update({'x': x, 'y': y})
    return it


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = {'name': 'Sapphire Port', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [PX, QUAY]}, 'moonColor': old.get('moonColor'), 'shipExit': old.get('shipExit', True),
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         keep('DOCK', PX, QUAY + 2),
         keep('ZEPHYR TRADER', 25, 15),
         keep('POTTER', 45, 18),
         keep('STALL', 20, 18, 0),
         keep('STALL', 33, 18, 1),
         keep('BLUE FLAME LANTERN', 18, 16),
         keep('SAPPHIRE CRYSTAL', 52, 15),
         keep('MORNING TIDE', 54, 22),
         keep("TRADER'S NOTE", 14, 17),
         look('FISH STALL', 24, 18, 'TODAY\'S CATCH ON ICE: SILVERFIN, REEF EEL, A BLUE CRAB THE SIZE OF A HAT.\n\n"ALL CAUGHT THIS MORNING. MOST OF IT ON PURPOSE."'),
         look('SPICE STALL', 37, 18, 'SACKS OF SALT IN SIX COLOURS, DRIED SPORE-PEPPER, SAPPHIRE SUGAR THAT GLOWS IN THE DARK.\n\nA SIGN: "TASTERS - ONE GRAIN ONLY."'),
         look('WELL', 29, 20, 'THE WATER AT THE BOTTOM GLOWS FAINTLY BLUE.\n\nCOINS GLINT DOWN THERE - WISHES FROM EVERY PORT ON THE SEA.'),
         look('WAREHOUSE', 24, 15, 'THE ZEPHYR TRADING CO. WAREHOUSE. THE DOORS ARE BARRED; SOMETHING INSIDE TICKS LIKE A COOLING KILN.\n\nCHALKED ON THE DOOR: "BLUE GLASS - ASK INSIDE".'),
         look('SAPPHIRE LIGHT', 9, 16, 'THE LIGHTHOUSE ON THE WEST HILL, BANDED BLUE AND WHITE.\n\nITS BEAM BURNS BLUE: A SAILOR\'S TRICK FOR SAPPHIRE WATERS. THE KEEPER HASN\'T BEEN SEEN IN WEEKS, BUT THE LAMP NEVER GOES OUT.\n\nTHE DOOR AT ITS FOOT IS ON THE LATCH.'),
         {'x': 8, 'y': 16, 'type': 'enter_world', 'target': 'lumar-sapphire-lighthouse', 'spawn': [6, 10], 'label': 'LIGHTHOUSE',
          'prompt': 'PRESS E TO ENTER'},
         look('KILN', 47, 18, 'A BEEHIVE KILN, ITS MOUTH GLOWING ORANGE. THE HEAT HITS YOU FROM THREE STEPS AWAY.\n\nSUNLIGHT SPORES, BURNING HOTTER THAN ANYTHING.'),
         look('DRYING RACKS', 50, 21, 'SILVERFIN DRYING IN THE SEA WIND. THE GULLS HAVE TAKEN EXACTLY ONE FROM EACH RACK, AS IF BY AGREEMENT.'),
         look('LOOKOUT', 29, 11, 'UP THE LANE BEHIND THE HOUSES, A BENCH FACING NORTH OVER THE OPEN SEA.\n\nON A CLEAR NIGHT YOU CAN SEE MIDNIGHT ISLE FROM HERE - AND, NOW AND THEN, A LIGHT MOVING ON IT.'),
         look('FISHING BOATS', FX, QUAY + 1, 'TWO BOATS AT THE FISHING PIER, NETS PILED IN THEIR BOWS.\n\nONE IS NAMED "MORNING TIDE II". THERE IS NO SIGN OF THE FIRST ONE.'),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER + FPIER, scene_id='lumar-sapphire',
            actors=[{'sheet': 'npc-trader', 'x': 25, 'y': 15, 'facing': 'down'},
                    {'sheet': 'npc-potter', 'x': 45, 'y': 18, 'facing': 'down'}],
            scene_extra={'backdrop': True, 'smoke': SMOKE, 'beacon': [LH[0], round(LH[1] - 5.6 * C45, 2)]})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in land and (c, r) not in PIER and (c, r) not in FPIER:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -2.0, COLS + 0.5, ROWS + 1.0]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('sapphire done; walkable', len(land))
