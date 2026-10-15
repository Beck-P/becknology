"""Hoarfell — the Hollow behind the ice door. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/hoarfell_hollow.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/hoarfell-hollow

The end of the tale (js/expedition.js): a cave in the glacier under the foot
of the Last Ridge, its walls blue ice in great rounded blocks, a frozen
waterfall down the back, ice columns. In the middle, on a plinth of dark
stone, the Lantern Beyond — lit, and nothing feeding it — its warm light on
all that blue. Round the plinth, what people left: coins, a ribbon, a carved
bird, a pressed flower. A tin lantern on the step, left for the next one to
carry a flame home in. Three carvings in the back wall tell the tale.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_isle as I                       # noqa: E402
import assets_snow as N                       # noqa: E402
import assets_town as W                       # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'hoarfell-hollow'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 16, 14
k = Kit(COLS, ROWS, margin_top=1.6, margin_bottom=0.5, seed=8821)
ICE_T = ('#9cc8e4', '#86b6d8', '#b4d8ee', '#7aa8cc')
LX, LR = 8.0, 5.0                                           # the lantern


def ice_block(x, r, z, s, tone=None):
    k.rock(x, r, z, s, s * 0.8, s * 0.85, (tone or ICE_T[k.rng.randrange(4)], 0.06), part='ice_block', segs=7)


# ---- the floor: clear ice, frost, drifts of snow along the walls -------------------------------------------------------------
def material(x, r):
    if x < 2.4 or x > 13.6 or r < 3.2:
        return 'snow'
    if math.hypot(x - LX, (r - LR) * 1.3) < 2.2:
        return 'glass'                                       # polished by everyone who's stood here
    return 'frost' if I.n2(x, r, 0.9, 4) > 0.2 else 'ice'


ALB = {'snow': (N.SNOW, 0.03), 'frost': ('#c8e0f0', 0.03), 'ice': ('#a8d0ea', 0.05), 'glass': ('#b8dcf2', 0.02)}
I.ground(k, [(c, r) for c in range(0, COLS) for r in range(1, ROWS)], material, ALB, step=0.125, bump=0.006, seed=5)

# ---- the walls: great blocks of blue ice, the back wall high, a frozen fall down it ------------------------------------------------
k.box(0, 0.0, 0, COLS, 1.4, 3.6, ('#14283e', 0.2), 'ice_back')
x = 0.2
while x < COLS:
    s = k.rng.uniform(0.5, 0.8)
    z = s * 0.7
    while z < 3.5:
        if not (6.6 < x < 9.4 and z < 3.3):
            ice_block(x, 1.6 - s * 0.4 + k.rng.uniform(-0.1, 0.1), z, s)
        z += s * k.rng.uniform(1.0, 1.25)
        s *= k.rng.uniform(0.85, 1.0)
    x += k.rng.uniform(0.5, 0.7)
# the frozen fall behind the lantern: smooth columns of pale ice, the light in them
for i, (dx, rad) in enumerate(((-0.9, 0.34), (-0.4, 0.42), (0.15, 0.48), (0.7, 0.4), (1.15, 0.3))):
    k.tube((8.0 + dx, 1.5, 3.6), (8.0 + dx * 1.1, 1.75, 0.0), rad, ('#d4ecf8', 0.03), 'icefall', rb=rad * 1.25, verts=10)
k.box(6.4, 1.6, 0, 9.6, 2.3, 0.18, ('#cce6f4', 0.03), 'icefall_pool', bevel=0.05)
# the side walls
for (xs, sgn) in ((0.4, 1), (COLS - 0.4, -1)):
    r = 1.8
    while r < ROWS - 1.2:
        s = k.rng.uniform(0.45, 0.75)
        for zz in (s * 0.6, s * 1.7, s * 2.8):
            ice_block(xs + sgn * k.rng.uniform(0.1, 0.5), r, zz, s * k.rng.uniform(0.75, 1.0))
        r += k.rng.uniform(0.45, 0.65)
# the front: low blocks, a gap in the middle where the passage comes in
x = 0.6
while x < COLS - 0.4:
    s = k.rng.uniform(0.32, 0.5)
    if not (6.5 < x < 9.5):
        ice_block(x, ROWS - 0.6 + k.rng.uniform(-0.1, 0.1), 0.08, s)
    x += k.rng.uniform(0.4, 0.55)
k.box(6.7, ROWS - 0.4, -0.2, 9.3, ROWS + 0.4, 0.0, ('#3a5a7a', 0.1), 'passage')

# ---- the carvings: three panels cut in the back wall ------------------------------------------------------------------------------
def panel(cx, strokes):
    k.box(cx - 0.9, 1.72, 0.7, cx + 0.9, 1.86, 2.5, ('#bcdcf0', 0.04), 'panel', bevel=0.03)
    for (x0, z0, x1, z1) in strokes:
        k.tube((cx + x0, 1.88, z0), (cx + x1, 1.88, z1), 0.035, ('#3a5a80', 0.1), 'carving', verts=5)


# a ridge with a light past it / a line of small figures walking / a bird flying at a lantern
panel(3.4, [(-0.7, 1.0, -0.2, 1.9), (-0.2, 1.9, 0.3, 1.4), (0.3, 1.4, 0.7, 1.8), (0.5, 2.15, 0.55, 2.2), (0.42, 2.18, 0.62, 2.18)])
panel(12.6, [(-0.6, 1.0, -0.6, 1.4), (-0.25, 1.0, -0.25, 1.4), (0.1, 1.0, 0.1, 1.4), (0.45, 1.0, 0.45, 1.4),
             (-0.8, 0.9, 0.7, 1.2), (0.6, 1.6, 0.6, 2.2), (0.48, 2.0, 0.72, 2.0)])
k.box(3.4 + 0.5, 1.86, 2.1, 3.4 + 0.6, 1.9, 2.25, ('#3a2a10', 0.1), 'carving_light', emit=('#ffc860', 0.7))
k.box(12.6 + 0.55, 1.86, 2.1, 12.6 + 0.65, 1.9, 2.25, ('#3a2a10', 0.1), 'carving_light', emit=('#ffc860', 0.7))

# ---- ice columns ---------------------------------------------------------------------------------------------------------------
for (x, r, h, rad) in ((3.2, 5.2, 3.4, 0.36), (12.8, 5.6, 3.4, 0.4), (3.6, 10.2, 2.6, 0.3), (12.4, 10.4, 2.8, 0.32)):
    k.tube((x, r, 0.0), (x + 0.05, r - 0.1, h), rad, ('#c4e2f4', 0.03), 'ice_column', rb=rad * 0.55, verts=10)
    k.blob(x, r, 0.08, rad * 1.6, rad * 1.3, 0.16, (N.SNOW, 0.06), 'column_foot', segs=8)
    k.solid(math.floor(x), math.floor(r), math.floor(x) + 1, math.floor(r) + 1)

# ---- the plinth and the Lantern Beyond ------------------------------------------------------------------------------------------------
k.cyl(LX, LR, 0, 0.16, 0.8, ('#7a8090', 0.2), 'plinth_step', verts=20)
k.cyl(LX, LR, 0.16, 0.95, 0.3, ('#646a7a', 0.2), 'plinth', verts=12)
k.cyl(LX, LR, 0.95, 1.05, 0.44, ('#7a8090', 0.2), 'plinth_top', verts=14)
W.lantern(k, LX, LR, 1.1, 1.72, s=0.22)
k.point_light(LX, LR + 0.34, 1.4, '#ffbe60', 150, radius=0.15, group='flicker')
k.point_light(LX, LR - 2.6, 2.6, '#ffc880', 24, radius=0.5)          # warm in the fall behind it
# the tin lantern on the step, dark, waiting
k.cyl(LX + 0.62, LR + 0.42, 0.18, 0.42, 0.08, ('#8a8e98', 0.1), 'tin_lantern', verts=8)
k.cone(LX + 0.62, LR + 0.42, 0.42, 0.5, 0.09, 0.02, ('#6a6e78', 0.1), 'tin_cap', verts=8)
# what people left
for (dx, dr) in ((-0.7, 0.3), (-0.55, 0.55), (-0.82, 0.48), (0.2, 0.86), (0.35, 0.8)):
    k.cyl(LX + dx, LR + dr, 0.18, 0.2, 0.05, ('#d8b048', 0.1), 'coin', verts=8)
k.box(LX - 0.3, LR + 0.78, 0.18, LX - 0.05, LR + 0.86, 0.2, ('#c83a2e', 0.1), 'ribbon')
k.blob(LX + 0.75, LR - 0.1, 0.24, 0.1, 0.06, 0.06, ('#7a5a3a', 0.12), 'carved_bird', segs=6)
k.box(LX + 0.68, LR - 0.12, 0.26, LX + 0.9, LR - 0.08, 0.28, ('#5a3a22', 0.12), 'carved_wing')
k.blob(LX - 0.75, LR - 0.2, 0.2, 0.08, 0.08, 0.02, ('#f0ece0', 0.1), 'edelweiss', segs=6)
k.solid(7, 4, 9, 6)

# ---- the light: the lantern's warmth against the glacier's blue ---------------------------------------------------------------------------
k.point_light(4.0, 9.0, 2.4, '#7ab0e0', 18, radius=0.8)
k.point_light(12.0, 9.0, 2.4, '#7ab0e0', 18, radius=0.8)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.82}}, light_samples=128, world_light=('#2a4a70', 0.6))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Hollow', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'hoarfell',
          'spawns': {'player': [8, 12]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'cold': False, 'hollow': True})
w['interactions'] = [
    {'x': 8, 'y': 5, 'type': 'expedition', 'action': 'lantern', 'label': 'THE LANTERN BEYOND', 'prompt': 'PRESS E TO LOOK'},
    {'x': 3, 'y': 2, 'type': 'dialog', 'label': 'CARVING', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'CUT INTO THE ICE: A LINE OF PEAKS, AND PAST THE LAST OF THEM A SMALL LIGHT, PICKED OUT IN GOLD.\n\n'
               'UNDER IT, WORN NEARLY SMOOTH: IT WAS HERE BEFORE THE FIRST OF US. WE ONLY FOUND IT.'},
    {'x': 8, 'y': 2, 'type': 'dialog', 'label': 'FROZEN FALL', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A WATERFALL CAUGHT IN THE ACT, FLOOR TO ROOF. THE LANTERN\'S LIGHT GOES INTO THE ICE AND DOESN\'T COME OUT AGAIN, '
               'SO THE WHOLE FALL GLOWS FAINTLY GOLD FROM INSIDE.'},
    {'x': 13, 'y': 2, 'type': 'dialog', 'label': 'CARVING', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'FOUR SMALL FIGURES WALKING IN A LINE, AND A FIFTH STANDING APART UNDER A LIGHT.\n\n'
               'SOMEONE HAS SCRATCHED NAMES BENEATH THEM, YEARS APART, IN DIFFERENT HANDS. THE NEWEST IS A SMALL BIRD: THE WREN.'},
    {'x': 7, 'y': 6, 'type': 'dialog', 'label': 'OFFERINGS', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'ROUND THE PLINTH, THINGS PEOPLE LEFT: COINS FROM LUMAR AND ARCADIA, A RED RIBBON, A PRESSED EDELWEISS, '
               'A LITTLE WOODEN BIRD WITH ITS WINGS OUT. NOTHING HAS BEEN TAKEN.'},
    {'x': 8, 'y': 13, 'type': 'enter_world', 'label': 'THE WAY OUT', 'prompt': 'PRESS E TO LEAVE', 'target': 'hoarfell-ridge',
     'spawn': [41, 60]},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (2, 3, 13, 12), doors=[(8, 13), (7, 13)], scene_id=WID, scene_extra={'smoke': []})
print('hoarfell-hollow done')
