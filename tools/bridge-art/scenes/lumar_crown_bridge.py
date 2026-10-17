"""The Old Bridge over Crownhaven's harbour mouth, shops and houses all along it (world id "lumar-crown-bridge").

  BVENV/bin/python tools/bridge-art/scenes/lumar_crown_bridge.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-crown-bridge

The capital's Ponte Vecchio: a stone bridge of four great arches on cutwater piers across the harbour mouth, from the Old
Town's Bridge Gate in the west to the east headland. Along its north side a crowded row of shops and houses, two and three
storeys, their backs hung out over the harbour on timber brackets — goldsmiths, a pie shop, a lens grinder, a bookbinder,
a tea merchant; along its south side the parapet, a few little booths under lean-to roofs, and in the middle an open
loggia over the sea with a bench and the bronze of the bridge's builder. The open sea beyond, the harbour behind.

Ways out: WEST GATE (the Old Town) and EAST GATE (js/capital.js: the Arsenal once it's built, Crownhaven's east until
then). Kit: assets_capital.py.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_capital as CAP           # noqa: E402
import assets_coast as C               # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402
import assets_village as V             # noqa: E402
import assets_house as HK              # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-crown-bridge.json')
WID = 'lumar-crown-bridge'
COLS, ROWS = 60, 24
k = Kit(COLS, ROWS, margin_top=2.5, margin_bottom=1.0, margin_x=0.5, seed=5303)
rng = k.rng
C45 = math.cos(math.radians(45))

X0, X1 = 4.0, 56.0          # the bridge between its abutments
N_BACK = 5.4                # the shops' backs, out over the harbour
N_FRONT = 9.4               # their fronts on the street
ST = (9.4, 13.6)            # the street on the bridge
SOUTH = 14.2                # the south parapet's face
LOGGIA = (26.0, 34.0)       # the open loggia in the middle of the south side
DECK_Z = 0.0
PIERS = [4.0, 17.0, 30.0, 43.0, 56.0]

# ---- land at the ends ------------------------------------------------------------------------------------------------
LAND = {(c, r) for c in range(0, 5) for r in range(3, 20)} | {(c, r) for c in range(55, COLS) for r in range(3, 20)}
I.ground(k, LAND, lambda x, r: 'grass' if I.n2(x, r, 0.5, 4) > -0.2 else 'stone',
         {'grass': ('#3a5a3a', 0.3), 'stone': ('#6a6a62', 0.25)})
C.coast(k, LAND, palette='emerald', grass='#3a5a3a', rock='#5a5a54', seed=81, beachiness=-0.7,
        keep_clear=[(4.0, 3.0, 56.0, 21.0)])
k.water_z = C.WZ

# ---- the bridge's body: piers with cutwaters, four arches, the spandrels, the deck ------------------------------------
STONE = '#958e80'
for px in PIERS[1:-1]:
    k.box(px - 1.1, N_BACK - 0.4, C.WZ - 1.2, px + 1.1, SOUTH + 0.2, -0.3, (shade(STONE, 0.85), 0.14), 'pier')
    CAP.coursed(k, px - 1.1, px + 1.1, C.WZ - 0.8, -0.3, SOUTH + 0.2, STONE, part='wall_block', **CAP.BIG)
    k.cone(px, SOUTH + 0.2, C.WZ - 0.6, -0.3, 1.1, 0.25, (shade(STONE, 0.9), 0.14), 'cutwater', verts=4)     # the cutwater, pointing out to sea
    k.solid(px - 1.1, N_BACK, px + 1.1, SOUTH + 0.4)
# the arches' rings and the wall over them on the sea face
for a, b in zip(PIERS, PIERS[1:]):
    sa, sb = a + (1.1 if a != PIERS[0] else 0.0), b - (1.1 if b != PIERS[-1] else 0.0)
    cx_ = (sa + sb) / 2
    span = (sb - sa) / 2
    n = 16
    for i in range(n):
        a0, a1 = math.pi * i / n, math.pi * (i + 1) / n
        pts = [(cx_ - math.cos(t) * rr_, SOUTH + 0.22, C.WZ - 0.2 + math.sin(t) * rr_ * 0.22) for (t, rr_) in ((a0, span), (a1, span), (a1, span + 0.35), (a0, span + 0.35))]
        k.quads([tuple(pts)], (shade('#b0a898', rng.uniform(0.9, 1.06)), 0.1), 'voussoir')
    # the spandrel wall from the arch up to the deck
    k.box(sa - 0.05, SOUTH - 0.3, C.WZ - 0.2 + span * 0.22 * 0.5, sb + 0.05, SOUTH + 0.2, DECK_Z - 0.02, (shade(STONE, 0.86), 0.14), 'spandrel')
    CAP.coursed(k, sa, sb, C.WZ + span * 0.22 * 0.6, DECK_Z - 0.1, SOUTH + 0.21, STONE, part='wall_block', **CAP.BIG)
k.box(X0, N_BACK, DECK_Z - 0.4, X1, SOUTH + 0.2, DECK_Z - 0.03, (shade(STONE, 0.8), 0.12), 'deck_core')
# a string course along the sea face under the parapet
k.box(X0 - 0.1, SOUTH + 0.15, DECK_Z - 0.12, X1 + 0.1, SOUTH + 0.32, DECK_Z + 0.02, ('#b8b0a0', 0.1), 'string_course', bevel=0.02)

# the street on the bridge: worn setts, a kerbed pavement under the shop fronts
k.box(X0 - 4, ST[0], -0.07, X1 + 4, SOUTH, -0.012, ('#7a6e5c', 0.3), 'path_grit')
CAP.cobbles(k, X0 - 4, ST[0] + 0.5, X1 + 4, SOUTH - 0.05, tone='#9a9080', size=0.26)
CAP.flagged(k, X0 - 4, ST[0] - 0.05, X1 + 4, ST[0] + 0.5, tone='#a09684')

# the south parapet: a coped wall, piers over each cutwater with a lamp, the loggia's arcade in the middle
x = X0
while x < X1:
    if not (LOGGIA[0] < x + 0.3 < LOGGIA[1]):
        k.box(x, SOUTH - 0.2, 0.0, min(x + 0.7, X1), SOUTH + 0.18, 0.6, (shade('#a49c8c', rng.uniform(0.88, 1.05)), 0.12), 'parapet', bevel=0.02)
    x += 0.72
for px in PIERS:
    k.box(px - 0.3, SOUTH - 0.25, 0.0, px + 0.3, SOUTH + 0.22, 0.95, ('#b0a898', 0.1), 'parapet_pier', bevel=0.02)
    W.lantern_post(k, px, SOUTH - 0.05, h=1.9, energy=26)
k.solid(X0 - 4, SOUTH - 0.2, LOGGIA[0], SOUTH + 0.3)
k.solid(LOGGIA[1], SOUTH - 0.2, X1 + 4, SOUTH + 0.3)
# the loggia: a balustrade between columns carrying an open roof, a bench and the builder in bronze
CAP.balustrade(k, LOGGIA[0], LOGGIA[1], SOUTH + 0.05, h=0.75)
for cx_ in (LOGGIA[0] + 0.2, LOGGIA[0] + 2.7, LOGGIA[1] - 2.7, LOGGIA[1] - 0.2):
    k.cyl(cx_, SOUTH - 0.1, 0.0, 2.3, 0.14, ('#e0d8c8', 0.08), 'column', verts=12)
    k.box(cx_ - 0.2, SOUTH - 0.3, 2.3, cx_ + 0.2, SOUTH + 0.1, 2.42, ('#e8e0d0', 0.08), 'column_capital')
    k.solid_post(cx_, SOUTH - 0.1)
k.box(LOGGIA[0], SOUTH - 0.4, 2.42, LOGGIA[1], SOUTH + 0.15, 2.6, ('#e8e0d0', 0.08), 'entablature')
k.quads([((LOGGIA[0] - 0.2, SOUTH - 1.6, 3.2), (LOGGIA[1] + 0.2, SOUTH - 1.6, 3.2), (LOGGIA[1] + 0.2, SOUTH + 0.35, 2.6), (LOGGIA[0] - 0.2, SOUTH + 0.35, 2.6))],
        ('#8a3a28', 0.1), 'roof_loggia')
W.bench(k, 28.4, 31.6, SOUTH - 1.1)
k.solid(28.4, SOUTH - 1.3, 31.6, SOUTH - 0.85)
W.statue(k, 30.0, 11.4)
k.solid(29.4, 10.8, 30.6, 12.0)

# booths on the south side: little lean-tos against the parapet (a flower seller, a newsvendor, a fishing-tackle man)
for (bx0, bx1, col, goods) in ((9.5, 11.5, ('#3a6a3a', '#e8dcc0'), 'flowers'), (20.0, 22.0, ('#2e5a8a', '#e8e0d0'), 'papers'),
                               (38.0, 40.0, ('#b23a34', '#ece0c8'), 'tackle'), (48.5, 50.5, ('#c8a040', '#3a2414'), 'sweets')):
    k.box(bx0, SOUTH - 1.0, 0.0, bx1, SOUTH - 0.22, 0.85, (A.WOOD, 0.12), 'booth', bevel=0.02)
    k.box(bx0 + 0.08, SOUTH - 1.02, 0.6, bx1 - 0.08, SOUTH - 0.98, 0.8, ('#e8dcc0', 0.1), 'booth_counter')
    k.quads([((bx0 - 0.1, SOUTH - 1.35, 1.25), (bx1 + 0.1, SOUTH - 1.35, 1.25), (bx1 + 0.1, SOUTH - 0.2, 1.55), (bx0 - 0.1, SOUTH - 0.2, 1.55))],
            col[0], 'roof_booth')
    for i in range(6):
        a = bx0 + (bx1 - bx0) * i / 6
        k.box(a, SOUTH - 1.36, 1.18, a + (bx1 - bx0) / 12, SOUTH - 1.32, 1.26, col[1], 'awning')
    for j in range(7):
        gx = bx0 + 0.2 + j * (bx1 - bx0 - 0.4) / 6
        tone = {'flowers': rng.choice(('#e04060', '#f0d040', '#a060d0', '#f0f0f0')), 'papers': '#e8e4d8',
                'tackle': rng.choice(('#e05a30', '#3a5a3a', '#c8a040')), 'sweets': rng.choice(('#f080b0', '#e8c040', '#80c0e0'))}[goods]
        k.box(gx - 0.08, SOUTH - 0.95, 0.85, gx + 0.08, SOUTH - 0.7, 0.95, tone, 'goods')
    k.solid(bx0, SOUTH - 1.0, bx1, SOUTH - 0.2)

# ---- the shops along the north side -----------------------------------------------------------------------------------------
SMOKE = []
br_ = random.Random(77)
shops = CAP.row(k, X0 + 0.2, X1 - 0.2, N_BACK + 0.6, N_FRONT, seed=501, smoke=SMOKE, storeys=(2, 3, 3), shops=0.85,
                widths=(2.0, 3.0), gaps=[(16.4, 17.6), (42.4, 43.6)],
                signs=[(8.0, 'bread'), (14.0, 'compass'), (24.0, 'bottle'), (36.0, 'mug'), (47.0, 'fish')],
                walls=('#e6c8a0', '#e8c070', '#d8a878', '#e0c8b0', '#c89060', '#e8d0a8', '#d4b890'),
                roofs=(W.ROOF_RED, '#8a4a28', '#a05030', '#7a3a28', W.ROOF_RED, '#6a3a2a'))
# their backs out over the harbour: timber brackets under the overhang (the Ponte Vecchio's cantilevers)
for (xa, xb, _d, _r, _f) in shops:
    x = xa + 0.25
    while x < xb - 0.2:
        k.tube((x, N_BACK + 0.2, -0.9), (x, N_BACK + 0.7, -0.05), 0.05, A.WOOD_DD, 'bracket', verts=4)
        x += 0.55
k.box(X0, N_BACK - 0.6, -0.4, X1, N_BACK + 0.8, -0.05, (shade(STONE, 0.8), 0.12), 'deck_core')
# the passages through the row (two lanes out to the north-side landing stairs)
for (ga, gb) in ((16.4, 17.6), (42.4, 43.6)):
    CAP.flagged(k, ga, N_BACK - 0.6, gb, N_FRONT, tone='#8e8676')
    k.box(ga, N_BACK - 0.7, -0.3, gb, N_BACK - 0.5, 0.6, ('#a49c8c', 0.12), 'parapet', bevel=0.02)
# a few shops get a name board and goods in the window: the goldsmiths, the pie shop, the lens grinder
names = ['GOLDSMITH', 'PIES', 'LENSES', 'BOOKBINDER', 'TEA', 'GOLDSMITH', 'GLOVES', 'SPICES', 'CLOCKS', 'GOLDSMITH', 'SWEETS', 'HATS']
for i, (xa, xb, dx, _r, _f) in enumerate(shops):
    if xb - xa >= 2.2:
        V.board_sign(k, names[i % len(names)], 'IMFellEnglishSC-Regular', (xa + xb) / 2, N_FRONT - 0.36, 1.82, size=0.17,
                     board=br_.choice(('#2a3a2e', '#3a2414', '#2e2a4a', '#4a2a2a')))
for (xa, xb, dx, _r, _f) in shops:                                    # a pot, a crate or a chair on the pavement now and then
    if br_.random() < 0.4:
        HK.tub(k, xb - 0.35, N_FRONT + 0.4)

# ---- the gates at the ends ----------------------------------------------------------------------------------------------------
for (gx, label) in ((X0 - 0.2, 'WEST'), (X1 + 0.2, 'EAST')):
    for (r0, r1) in ((N_BACK - 0.8, ST[0] - 0.1), (SOUTH - 0.2, SOUTH + 0.6)):
        k.box(gx - 0.55, r0, -0.05, gx + 0.55, r1, 3.0, (shade(CAP.WALL_STONE, 0.9), 0.12), 'gate_pier')
        CAP.coursed(k, gx - 0.55, gx + 0.55, 0.0, 3.0, r1, '#8a8478', part='wall_block', **CAP.BIG)
        k.solid(gx - 0.55, r0, gx + 0.55, r1)
    k.box(gx - 0.6, N_BACK - 0.8, 3.0, gx + 0.6, SOUTH + 0.6, 3.6, (shade(CAP.WALL_STONE, 0.95), 0.12), 'gate_top')
    CAP.coursed(k, gx - 0.6, gx + 0.6, 3.0, 3.6, SOUTH + 0.6, '#8a8478', part='wall_block', **CAP.BIG)
    for rr in (N_BACK - 0.6, SOUTH + 0.1):
        k.box(gx - 0.55, rr, 3.6, gx + 0.55, rr + 0.4, 4.0, ('#8e877a', 0.12), 'merlon', bevel=0.015)
    W.wall_lantern(k, gx, SOUTH + 0.62, z=2.0, energy=16)

# ---- life on the bridge ------------------------------------------------------------------------------------------------------
for x in (12.0, 24.0, 36.5, 51.0):
    A.barrel(k, x, N_FRONT + 0.5, h=0.62, radius=0.23)
for x in (6.0, 46.0):
    A.crate(k, x, N_FRONT + 0.5, s=0.44)
for (gx, gr_) in ((15.0, SOUTH - 0.2), (33.5, SOUTH + 0.05), (44.0, SOUTH - 0.2)):          # gulls on the parapet
    k.blob(gx, gr_, 0.7, 0.1, 0.06, 0.07, '#f0f0ec', 'gull', segs=10)
    k.blob(gx + 0.08, gr_, 0.78, 0.05, 0.045, 0.05, '#f4f4f0', 'gull', segs=8)
# boats in the water: a fishing boat under sail heading out, a rowboat at the north stairs
for (bx, br, hull) in ((22.0, 17.6, '#2a4a6a'), (47.0, 3.6, '#6a3a2a')):
    since, ls = len(k.parts), len(k.lights)
    W.rowboat(k, bx - 1.0, bx + 1.0, br, beam=0.8, hull=hull)
    C.sink(k, since, C.WZ + 0.12, ls)
since, ls = len(k.parts), len(k.lights)
W.boat(k, 10.0, 18.8, length=2.6, sail='#e8dcc0')
C.sink(k, since, C.WZ + 0.12, ls)

# ---- light ----------------------------------------------------------------------------------------------------------------------
k.area_light(30.0, 10.0, 16.0, '#90a8c8', 2400, 40.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}},
         light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#26384a', 0.8))

# ---- the world -------------------------------------------------------------------------------------------------------------------


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


inters = [
    {'x': 2, 'y': 11, 'type': 'enter_world', 'target': 'lumar-crown-oldtown', 'spawn': [53, 33], 'label': 'WEST GATE', 'prompt': 'PRESS E TO GO THROUGH'},
    {'x': COLS - 3, 'y': 11, 'type': 'dialog', 'label': 'EAST GATE', 'prompt': 'PRESS E TO GO THROUGH',
     'dialog': 'THE EAST GATE, AND THE HEADLAND ROAD TO THE ARSENAL. THE WATCH IS CHANGING; THEY WAVE YOU BACK FOR NOW.'},
    look('THE BUILDER', 30, 12, 'MASTER AURELIO FENN, WHO BUILT THE OLD BRIDGE IN THE YEAR THE HARBOUR FROZE. HE IS HOLDING A PLUMB LINE AND LOOKING VERY PLEASED WITH HIMSELF. SOMEONE HAS PUT A FLOWER IN HIS BUTTONHOLE.'),
    look('THE LOGGIA', 30, 13, 'THE LOGGIA OVER THE HARBOUR MOUTH. THE OPEN SEA ON ONE SIDE, THE WHOLE HARBOUR ON THE OTHER, AND THE BOATS GOING OUT UNDER YOUR FEET.'),
    look('FLOWER BOOTH', 10, 13, 'SEA PINKS, THRIFT AND A BUCKET OF SOMETHING BLUE FROM THE SAPPHIRE ISLES.'),
    look('NEWSVENDOR', 21, 13, '"THE CROWN GAZETTE! PIRATES OFF THE CRIMSON SEAM! THE REGATTA ON FRIDAY! A COW ON THE ROOF OF THE EXCHANGE!" THE LAST ONE IS APPARENTLY TRUE.'),
    look('TACKLE BOOTH', 39, 13, 'HOOKS, FLOATS, LINE BY THE FATHOM. A HAND-LETTERED SIGN: "THE SILVERFIN ARE BITING OFF THE CUTWATERS AT DUSK."'),
    look('SWEET BOOTH', 49, 13, 'SPUN SUGAR, STICKY TOFFEE, LITTLE CANDY SHIPS IN THE COLOURS OF EVERY MERCHANT HOUSE.'),
]
w = {'name': 'The Old Bridge', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [4, 11]}, 'moonColor': '#d8f0e0', 'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': inters}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
STREET = [(c, r) for c in range(0, COLS) for r in range(int(ST[0]), int(SOUTH))]
apply_world(WORLD, k, (0, int(ST[0]), COLS - 1, int(SOUTH) - 1), doors=[], scene_id=WID,
            actors=[], scene_extra={'backdrop': True, 'smoke': SMOKE})
w = json.load(open(WORLD))
w['view'] = [-0.5, 0.0, COLS + 0.5, ROWS + 0.5]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('bridge done')
