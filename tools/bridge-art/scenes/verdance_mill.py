"""Wendmill — the mill hamlet on the river, on Verdance (world id "verdance-mill").

  BVENV/bin/python tools/bridge-art/scenes/verdance_mill.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/verdance-mill

Down the lane from the Downs, where the Wend widens into a mill pond: the big mill, three floors of honey stone with a
lucam jutting from the top for the sack hoist, its wheel turning in the race; the weir slanting across the river in a
white sheet of water, the trout pool below it; Tobias Ludd's house beside the mill, the bakehouse with its oven
chimney, a row of cottages, the old packhorse bridge to the water meadow where the cows graze, and the ferry's landing
at the west end. Old Ludd in Brambleford is the miller's father: bring your wheat here and the big stones grind it into
flour (js/makers.js) for the bakery and the café.

In the house style: the land falling to the river, the mill pond and the river still water named for the live light,
the weir's white water, layered trees and reeds, the richer house kit; Verdance's afternoon with live light.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_farm as F                # noqa: E402
import assets_house as HK              # noqa: E402
import assets_isle as I                # noqa: E402
import assets_town as W                # noqa: E402
import assets_verdance as G            # noqa: E402
import assets_village as V             # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'verdance-mill'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 42, 32
RZ = -0.42                                                            # the river below the weir
PZ = -0.2                                                             # the mill pond above it
WEIR = [(20.6, 19.6), (23.4, 27.6)]                                   # the weir's line across the river
BANK_N = 20.0                                                         # the north bank
STONE = G.HONEY
k = Kit(COLS, ROWS, margin_top=3.0, margin_bottom=0.6, seed=9150)
G.fast_top(k)
rng = k.rng
C = math.cos(math.radians(45))
SMOKE = []


def weir_x(r):
    (x0, r0), (x1, r1) = WEIR
    return x0 + (x1 - x0) * (r - r0) / (r1 - r0)


def north_bank(x):
    return BANK_N + 0.3 * math.sin(x * 0.4)


def south_bank(x):
    return 26.6 + 0.35 * math.sin(x * 0.33 + 1.0) + 1.2 * G.smooth(22.0, 30.0, x)


def height(x, r):
    z = 0.025 * I.n2(x, r, 1.2, 5)
    nb, sb = north_bank(x), south_bank(x)
    if nb - 0.8 < r < sb + 0.8:
        d = min(r - nb, sb - r)
        floor = -0.75 if x < weir_x(r) else -0.5
        z = floor * G.smooth(-0.8, 0.6, d) + z * (1 - G.smooth(-0.8, 0.0, d))
    if r > sb + 0.8:
        z += 0.08 * G.smooth(sb + 0.8, 31.0, r)
    if r < 2.0:
        z += 0.3 * G.smooth(2.0, -1.5, r)
    return z


LANE = [(24.4, -1.5), (24.2, 4.0), (23.4, 8.0), (22.6, 12.0)]
YARD = (12.0, 11.4, 36.0, 19.2)                                       # the hamlet's level: lane's end, the mill yard, the green
LANDING_PATH = [(12.6, 18.4), (8.0, 18.8), (5.0, 19.2)]


WHEAT = [(1.0, 0.6, 19.6, 9.6), (28.0, 0.6, 41.5, 9.0)]              # wheat fields above the hamlet, for the mill


def wheat(x, r):
    return any(x0 <= x <= x1 and r0 <= r <= r1 for (x0, r0, x1, r1) in WHEAT) and I.path_dist([LANE], x, r) > 1.6


def material(x, r):
    if wheat(x, r):
        return 'wheat' if I.n2(x, r, 1.4, 6) > -0.35 else 'wheat2'
    nb, sb = north_bank(x), south_bank(x)
    if nb < r < sb:
        return 'bed'
    if nb - 0.5 < r < nb + 0.0 or sb < r < sb + 0.5:
        return 'bank' if I.n2(x, r, 4.0, 8) > -0.3 else 'gravel'
    if I.path_dist([LANE, LANDING_PATH], x, r) < 0.75 + 0.08 * I.n2(x, r, 2.0, 7):
        return 'path'
    if YARD[0] + 8 < x < 32.0 and 12.6 < r < 19.4:
        return 'yard' if I.n2(x, r, 1.6, 3) > -0.3 else 'path'
    return 'grass'


ALB = {'grass': (G.GREEN, 0.12), 'path': (F.DIRT, 0.1), 'bank': ('#6a5638', 0.22), 'bed': ('#3e4a3a', 0.2), 'gravel': ('#8a8274', 0.25),
       'yard': ('#9a8460', 0.12), 'wheat': ('#d8b860', 0.12), 'wheat2': ('#c8a450', 0.12)}
CELLS = [(c, r) for c in range(-1, COLS + 1) for r in range(-4, ROWS + 2)]
I.ground(k, CELLS, material, ALB, height=height, bump=0.0, seed=91, dither=0.035, step=0.0625)


def water(x0, x1, z, part, above):
    q = []
    x = x0
    while x < x1:
        xb = min(x1, x + 0.25)
        def edges(xx):
            a, b = north_bank(xx) - 0.05, south_bank(xx) + 0.05
            return a, b
        a0, b0 = edges(x)
        a1, b1 = edges(xb)
        q.append(((x, a0, z), (xb, a1, z), (xb, b1, z), (x, b0, z)))
        x = xb
    k.quads(q, '#2a5a6a', part)


# the river below the weir and the mill pond above it (two still levels), the weir's white sheet between
water(-1.0, 21.0, RZ, 'stream_water', False)
q = []
for i in range(24):
    r0 = WEIR[0][1] - 0.6 + i * (WEIR[1][1] - WEIR[0][1] + 1.2) / 24
    r1 = r0 + (WEIR[1][1] - WEIR[0][1] + 1.2) / 24
    xa, xb = weir_x(r0), weir_x(r1)
    q.append(((xa, r0, PZ), (40.0, r0, PZ), (40.0, r1, PZ), (xb, r1, PZ)))
k.quads(q, '#2a5a6a', 'pond_water')
water(40.0, COLS + 1.0, PZ, 'pond_water', True)
TONES = ('#f4fbfd', '#cfe8f0', '#8cc4d4', '#e2f2f6', '#a6d2de')
r = WEIR[0][1] - 0.4
while r < WEIR[1][1] + 0.4:                                            # the weir: a stone sill, the water tipping over it
    xw = weir_x(r)
    k.box(xw - 0.1, r, RZ - 0.1, xw + 0.25, r + 0.2, PZ + 0.03, ('#a89c88', 0.18), 'weir_sill')
    k.quads([((xw, r, PZ), (xw, r + 0.2, PZ), (xw - 0.45, r + 0.2, RZ + 0.02), (xw - 0.45, r, RZ + 0.02))], rng.choice(TONES), 'waterfall')
    for _ in range(2):
        s = rng.uniform(0.06, 0.12)
        k.blob(xw - rng.uniform(0.5, 1.1), r + rng.uniform(0, 0.2), RZ + 0.02, s, s * 0.8, s * 0.45, rng.choice(('#f4fbfd', '#dceff4')), 'foam', segs=7)
    r += 0.2
for (x, z) in [(x, RZ) for x in range(0, 19, 2)] + [(x, PZ) for x in range(27, 41, 2)]:
    if 5 <= x <= 11:
        continue
    for rr in (north_bank(x + 0.5), south_bank(x + 0.5)):
        clump = {shade('#5a8a3a', 0.85): [], '#5a8a3a': [], shade('#6a9a44', 1.1): []}
        for j in range(rng.randint(8, 16)):
            clump[rng.choice(list(clump))].append((x + rng.uniform(0, 1.5), rr + rng.uniform(-0.15, 0.15), z, rng.uniform(0.35, 0.75), 0.028,
                                                   rng.uniform(-0.12, 0.12), rng.uniform(-0.04, 0.04)))
        with k.foliage('leaf'):
            for col, bl in clump.items():
                if bl:
                    k.blades(bl, (col, 0.2), 'reed')
for _ in range(10):
    x = rng.uniform(28.0, 40.0)
    rr = rng.uniform(north_bank(x) + 0.6, south_bank(x) - 0.6)
    s = rng.uniform(0.11, 0.16)
    k.cyl(x, rr, PZ, PZ + 0.012, s, ('#4a8a3a', 0.2), 'lily', verts=12, ry=s * 0.8)

# ---- the mill: three floors, the lucam, the wheel in its race ------------------------------------------------------------
rm, zr = HK.rich_house(k, 23.6, 30.4, 12.8, 18.6, wall_h=3.4, rise=1.7, roof='#8a8070', wall=STONE, door_x=27.0,
                       windows=[(24.6, 0.9), (29.4, 0.9)], windows_up=[(24.6, 2.3), (29.4, 2.3)], chimney=None, stone=True)
lx = 27.0                                                              # the lucam: the hoist's housing over the loading doors
k.box(lx - 0.55, 17.8, 3.1, lx + 0.55, 19.15, 4.0, (shade(STONE, 0.95), 0.14), 'lucam', bevel=0.02)
k.poly([(lx - 0.7, 19.25, 3.95), (lx + 0.7, 19.25, 3.95), (lx + 0.7, 17.8, 4.4), (lx - 0.7, 17.8, 4.4)], ('#8a8070', 0.12), 'roof_lucam')
k.box(lx - 0.35, 19.15, 3.15, lx + 0.35, 19.19, 3.85, ('#5a3e22', 0.14), 'lucam_door')
k.tube((lx, 19.18, 3.15), (lx, 19.18, 1.9), 0.012, '#c8b890', 'hoist_rope', verts=4)
k.box(lx - 0.18, 19.1, 1.6, lx + 0.18, 19.3, 1.9, ('#d8c8a0', 0.2), 'sack')
V.board_sign(k, 'WEND MILL', 'IMFellEnglishSC', 27.0, 18.63, 2.1, size=0.15, board='#e8dcc0', ink='#3a2414', trim='#6a4a2a', pad=0.08)
V.waterwheel(k, 31.6, 20.0, rad=1.25, width=0.55)
k.box(30.6, 19.2, -0.5, 32.6, 19.3, 0.3, ('#8a8274', 0.16), 'race_wall')
V.sacks(k, 31.4, 18.4, n=3)
k.solid(31.0, 18.0, 32.0, 18.9)
k.cyl_y(31.4, 17.4, 17.6, 0.55, 0.55, 0.55, ('#a8a090', 0.25), 'millstone', verts=20)
k.solid(30.8, 17.0, 32.0, 17.8)
W.cart(k, 18.4, 11.7)
k.solid(17.7, 11.2, 19.1, 12.2)
# Tobias Ludd's house, the bakehouse, the cottages
rm, zr = HK.rich_house(k, 32.2, 36.6, 13.8, 17.8, wall_h=2.0, rise=1.35, roof='#a85a3a', wall=STONE, door_x=34.4, windows=[(33.1, 0.85), (35.7, 0.85)],
                       chimney=36.1, stone=True)
SMOKE.append([35.98, round(rm - 0.15 - (zr + 1.05) * C, 3)])
HK.garden(k, 32.2, 36.6, 17.8, 19.2, tree=False)
rm, zr = HK.rich_house(k, 15.4, 20.4, 13.0, 16.8, wall_h=2.0, rise=1.3, roof='#8a8070', wall=shade(STONE, 1.05), door_x=17.9, windows=[(16.3, 0.85), (19.5, 0.85)],
                       chimney=19.8, stone=True)
SMOKE.append([19.68, round(rm - 0.15 - (zr + 1.05) * C, 3)])
V.board_sign(k, 'THE BAKEHOUSE', 'Rye', 17.9, 16.83, 1.7, size=0.12, board='#3a2414', ink='#f0d890', trim='#c8a050', pad=0.06)
W.hanging_sign(k, 20.55, 16.8, 1.9, icon='bread')
G.bistro(k, 16.0, 17.6, top='#3a2414')
for (x0, x1, door, roof) in ((2.6, 6.2, 4.4, '#c4a25a'), (7.0, 10.4, 8.7, '#8a8070'), (11.0, 14.4, 12.7, '#a85a3a')):
    rm, zr = HK.rich_house(k, x0, x1, 12.4, 15.8, wall_h=1.9, rise=1.3, roof=roof, wall=STONE, door_x=door, windows=[(x0 + 0.7, 0.85), (x1 - 0.7, 0.85)],
                           chimney=x0 + 0.4, stone=roof != '#c4a25a')
    SMOKE.append([x0 + 0.28, round(rm - 0.15 - (zr + 1.05) * C, 3)])
    V.flower_bed(k, x0 + 0.2, 15.9, x1 - 0.2, 16.3)
G.washing_line(k, (3.0, 17.4), (6.0, 17.6))
# the ferry landing, the packhorse bridge over to the water meadow
W.dock(k, 5.4, 6.8, north_bank(6.0) - 0.4, north_bank(6.0) + 2.4, z=0.04)
V.board_sign(k, 'FERRY', 'Rye', 7.4, 18.9, 0.85, size=0.1, board='#2e5a3e', ink='#f0e8c8', trim='#c8a050', pad=0.04)
k.box(7.35, 18.84, 0.0, 7.45, 18.9, 0.9, (G.WOOD_D, 0.15), 'sign_post')
G.arch_bridge(k, 9.2, 10.8, north_bank(10.0) - 0.8, south_bank(10.0) + 0.8, tone=STONE, z_top=0.4)
# the water meadow: cows grazing, willows, the trout pool's bench
for (x, r, f) in ((14.0, 29.6, 0.4), (18.6, 30.4, 2.6), (26.0, 30.0, 1.2)):
    c, s_ = math.cos(f), math.sin(f)
    k.blob(x, r, 0.55, 0.42, 0.26, 0.24, ('#f0ece4', 0.15), 'cow', rot=(0, 0, math.degrees(f)), segs=10)
    for (dx, dr) in ((0.1, 0.05), (-0.18, -0.08)):
        k.blob(x + dx * c - dr * s_, r + dx * s_ + dr * c, 0.62, 0.14, 0.12, 0.14, ('#2a2420', 0.15), 'cow_patch', segs=7)
    k.blob(x + 0.48 * c, r + 0.48 * s_ * 0.8, 0.42, 0.13, 0.11, 0.12, ('#f0ece4', 0.15), 'cow_head', segs=8)
    for (a, b) in ((0.25, 0.12), (0.25, -0.12), (-0.25, 0.12), (-0.25, -0.12)):
        k.cyl(x + a * c - b * s_, r + a * s_ * 0.8 + b * c, 0.0, 0.42, 0.04, '#2a2420', 'cow_leg', verts=5)
for (x, r) in ((3.0, 29.0), (21.8, 28.6), (34.0, 30.6), (8.0, 31.0)):
    G.on(k, height, G.willow, x, r, h=2.9)
W.bench(k, 12.6, 13.8, 28.2)
F.wildflowers(k, 0.5, 28.0, 41.0, 31.6, 80)
# around the hamlet: the lane's hedges, trees, the green with a horse chestnut
for (x, r) in ((1.0, 11.2), (20.6, 2.0), (27.2, 4.0), (40.6, 13.0), (0.8, 15.0), (36.0, 11.0)):
    (W.tree if rng.random() < 0.7 else W.pine)(k, x, r, h=rng.uniform(2.6, 3.3), tone=rng.choice(('#3a6a34', '#4a7a30', '#2e5a38')))
    k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)
G.hedge(k, (21.6, 0.0), (21.6, 10.6))
G.hedge(k, (26.0, 0.0), (26.0, 10.6))
W.tree(k, 38.6, 18.0, h=3.4, tone='#4a7a30')
k.solid(38.1, 17.5, 39.1, 18.5)
F.wildflowers(k, 0.5, 10.4, 21.0, 12.0, 30)
F.wildflowers(k, 27.0, 10.2, 41.0, 12.0, 30)
for (x, r) in ((14.6, 11.6), (31.6, 12.6), (6.8, 18.0)):
    W.lantern_post(k, x, r, h=2.1, energy=28)

for (x0, r0, x1, r1) in WHEAT:                                       # the ears, standing over the golden fields
    ears = {'#d8b860': [], '#e8c870': [], '#c8a048': []}
    for _ in range(int((x1 - x0) * (r1 - r0) * 26)):
        x, r = rng.uniform(x0, x1), rng.uniform(r0, r1)
        if wheat(x, r):
            ears[rng.choice(list(ears))].append((x, r, height(x, r), rng.uniform(0.22, 0.34), 0.03, rng.uniform(-0.04, 0.06), rng.uniform(-0.02, 0.02)))
    for col, bl in ears.items():
        k.blades(bl, (col, 0.2), 'wheat_ears')
    for (a, b) in (((x0, r1 + 0.3), (x1, r1 + 0.3)), ((x0, r0 - 0.2), (x1, r0 - 0.2))):
        G.hedge(k, a, b, h=0.6, flowers=0.3)
for (x, r) in ((5.0, 10.6), (9.0, 10.8), (13.0, 10.5), (31.0, 10.2), (35.6, 10.4), (39.0, 10.0)):
    G.stook(k, x, r)
F.barn(k, 33.0, 38.0, 1.4, 4.4, wall_h=2.0, rise=1.3)
k.later.append(lambda: W.meadow(k, G.GREEN, cells=CELLS, ok=('ground_grass',), density=0.9, flowers=0.8))


# ---- where you can walk ------------------------------------------------------------------------------------------------------
def walkable(c, r):
    x, y = c + 0.5, r + 0.5
    if I.path_dist([LANE, LANDING_PATH], x, y) < 0.9:
        return True
    if 1.0 <= x <= 38.0 and 16.0 <= y <= north_bank(x) - 0.05:
        return True                                                    # along the north bank
    if YARD[0] <= x <= YARD[2] and YARD[1] <= y <= YARD[3]:
        return True
    if 9.2 <= x <= 10.8 and north_bank(x) - 1.0 <= y <= south_bank(x) + 1.0:
        return True                                                    # the bridge
    if 5.4 <= x <= 6.8 and north_bank(6.0) - 1.0 <= y <= north_bank(6.0) + 2.4:
        return True                                                    # the landing
    if y >= south_bank(x) + 0.6 and 2.0 <= x <= 24.0 and y < 31.0:
        return True                                                    # the water meadow
    return False


for c in range(COLS):
    for r in range(ROWS):
        if not walkable(c, r):
            k.solid(c, r, c + 1, r + 1)

if os.environ.get('NOVAR'):
    k.variants = []
k.sun((0.62, 0.42, -0.62), '#ffe2b0', 4.2, angle=3.0)
k.render(OUT, cycle=None if os.environ.get('PREVIEW') else 'day', light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#a8c4e0', 0.85))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Wendmill', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'verdance',
          'spawns': {'player': [24, 1]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -2.0, COLS, ROWS]})


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': 24, 'y': 0, 'type': 'enter_world', 'label': 'THE DOWNS', 'prompt': 'PRESS E TO TAKE THE LANE UP', 'target': 'verdance-downs', 'spawn': [7, 38]},
    {'x': 6, 'y': 21, 'type': 'ferry', 'label': 'THE FERRY', 'prompt': 'PRESS E FOR THE FERRY'},
    {'x': 27, 'y': 19, 'type': 'mill', 'label': 'WEND MILL', 'prompt': 'PRESS E TO GO IN'},
    {'x': 18, 'y': 17, 'type': 'bakehouse', 'label': 'THE BAKEHOUSE', 'prompt': 'PRESS E TO GO IN'},
    {'x': 13, 'y': 27, 'type': 'fish', 'label': 'THE TROUT POOL', 'prompt': 'PRESS E TO FISH', 'pool': 'pond'},
    {'x': 18, 'y': 21, 'type': 'fish', 'label': 'BELOW THE WEIR', 'prompt': 'PRESS E TO FISH', 'pool': 'pond'},
    look('THE WEIR', 21, 20, 'THE WEND TIPS OVER THE WEIR IN A WHITE SHEET, ROARING SOFTLY. THE TROUT HANG IN THE POOL BELOW IT, NOSES UPSTREAM, WAITING FOR WHATEVER COMES OVER.'),
    look('THE WATERWHEEL', 32, 19, 'THE WHEEL TURNS IN ITS RACE, SLOW AND HEAVY, WATER SHEETING OFF THE PADDLES. INSIDE, YOU CAN FEEL THE STONES GOING THROUGH THE FLOOR.'),
    look('THE PACKHORSE BRIDGE', 10, 20, 'A NARROW HUMPED BRIDGE, JUST WIDE ENOUGH FOR A PONY AND ITS PANNIERS. THE PARAPETS ARE WORN SMOOTH WHERE FOUR HUNDRED YEARS OF ELBOWS HAVE LEANED.'),
    {'x': 23, 'y': 18, 'type': 'dialog', 'label': 'TOBIAS', 'prompt': 'PRESS E TO TALK', 'dialog': 'TOBIAS LUDD, FLOURY TO THE EYEBROWS, NODS.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
ACTORS = [{'sheet': 'npc-tobias', 'x': 23, 'y': 18, 'facing': 'down'}]
for a in ACTORS:
    k.solid(a['x'], a['y'], a['x'] + 1, a['y'] + 1)
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, actors=ACTORS, scene_extra={'smoke': SMOKE})
print('wendmill done')
