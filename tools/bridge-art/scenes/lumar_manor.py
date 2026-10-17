"""Ashcombe House — a captain's mansion on Crownhaven's waterfront, yours for 400,000 (world id "lumar-manor"; js/home.js,
js/legacy.js).
Usage: BVENV/bin/python lumar_manor.py RENDER_DIR

The great hall of the tall slate-roofed house beside the Crown & Anchor: polished boards under a long patterned carpet,
tall windows on the harbour between oak bookcases, a marble fireplace with a gilt mirror over it and a portrait of the
last Ashcombe, a grand staircase climbing to the gallery on the left, a grandfather clock, a globe, a chandelier. The
middle of the floor is bare for the furniture you buy (the furniture sheet from tools/bridge-art/furniture_sprites.py).
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade

OUT = sys.argv[1]
WID = 'lumar-manor'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 22, 14
H = 3.0 / math.cos(THETA)
FLOOR = (1, 2, 20, 11)
DOORS = [(10, 12), (11, 12)]
GOLD = '#d0a040'
MARBLE = '#e8e2d8'

k = Kit(COLS, ROWS, margin_top=1.8, margin_bottom=0.5, seed=4007)
A.room(k, 1, 2, 21, 12, H, door=(10.0, 12.0), floor_tone='#7a5232', plaster='#e6dccb', wainscot=1.05, wainscot_col='#2e4a36',
       beams_every=0)
k.box(0.4, 1.9, H - 0.14, 21.6, 2.18, H + 0.04, (shade('#e6dccb', 1.06), 0.1), 'cornice')

# ---- the back wall: tall windows between bookcases, the fireplace in the middle ------------------------------------------


def tall_window(x, w=1.0, z0=1.1, z1=3.0):
    k.box(x - w / 2 - 0.12, 1.95, z0 - 0.12, x + w / 2 + 0.12, 2.04, z1 + 0.22, ('#3e2a18', 0.12), 'window_frame')
    k.box(x - w / 2, 2.04, z0, x + w / 2, 2.06, z1, ('#1a2a4a', 0.05), 'window_glass', emit=('#2a4a7a', 0.9))
    for i in range(1, 4):
        k.box(x - w / 2, 2.06, z0 + (z1 - z0) * i / 4 - 0.02, x + w / 2, 2.09, z0 + (z1 - z0) * i / 4 + 0.02, ('#3e2a18', 0.12), 'window_bar')
    k.box(x - 0.025, 2.06, z0, x + 0.025, 2.09, z1, ('#3e2a18', 0.12), 'window_bar')
    for dx in (-1, 1):                                          # green velvet curtains, tied back
        k.box(x + dx * (w / 2 + 0.05) - 0.14, 2.06, z0 - 0.3, x + dx * (w / 2 + 0.05) + 0.14, 2.2, z1 + 0.25, ('#2a5a3e', 0.15), 'curtain', bevel=0.04)
    k.box(x - w / 2 - 0.35, 2.04, z1 + 0.2, x + w / 2 + 0.35, 2.2, z1 + 0.3, (GOLD, 0.25), 'curtain_rail')
    k.area_light(x, 2.6, 1.9, '#8098d0', 26, 1.0, rot=(math.radians(-65), 0, 0))


for x in (6.6, 15.4):
    tall_window(x)
A.bookshelf(k, 8.0, 9.4, 2.0, top=2.6)
A.bookshelf(k, 12.6, 14.0, 2.0, top=2.6)
A.bookshelf(k, 17.0, 18.4, 2.0, top=2.6)
# the marble fireplace, the gilt mirror, the portrait above
FX = 11.0
A.fireplace(k, FX, 2.0, H, width=2.2, height=1.35, energy=170)
k.box(FX - 1.25, 2.0, 0.0, FX + 1.25, 2.45, 1.45, (MARBLE, 0.18), 'mantel_surround', bevel=0.03)
k.box(FX - 0.75, 2.42, 0.1, FX + 0.75, 2.47, 1.05, '#1a0e08', 'firebox_mouth')
k.box(FX - 1.4, 1.98, 1.45, FX + 1.4, 2.6, 1.55, (MARBLE, 0.18), 'mantel_shelf', bevel=0.02)
F = 2.24                                                        # the chimney breast's face: the mirror and portrait hang on it
k.box(FX - 0.55, F, 1.7, FX + 0.55, F + 0.06, 2.55, (GOLD, 0.25), 'mirror_frame', bevel=0.02)
k.box(FX - 0.45, F + 0.06, 1.8, FX + 0.45, F + 0.08, 2.45, ('#9ab0c0', 0.02), 'mirror_glass', emit=('#4a5a6a', 0.3))
for dx in (-1.1, 1.1):                                          # candlesticks on the mantel
    k.cyl(FX + dx, 2.3, 1.55, 1.85, 0.03, (GOLD, 0.25), 'candlestick', verts=8)
    A.candle(k, FX + dx, 2.3, 1.85, energy=3.0)
k.box(FX - 0.55, F, 2.75, FX + 0.55, F + 0.06, 3.55, (GOLD, 0.25), 'portrait_frame', bevel=0.02)    # the last Ashcombe
k.box(FX - 0.45, F + 0.06, 2.85, FX + 0.45, F + 0.08, 3.45, '#2a3a2a', 'portrait')
k.sphere(FX, F + 0.085, 3.25, 0.11, 0.13, '#d8b898', 'portrait_face', ry=0.01)
k.box(FX - 0.22, F + 0.08, 2.85, FX + 0.22, F + 0.09, 3.1, '#1a2a4a', 'portrait_coat')
k.box(FX - 0.06, F + 0.09, 3.0, FX + 0.06, F + 0.095, 3.06, (GOLD, 0.25), 'portrait_medal')
k.solid(FX - 1.4, 2.0, FX + 1.4, 3.0)
A.wall_sconce(k, 5.0, 2.0, z=1.9, energy=9)
A.wall_sconce(k, 17.0 - 0.2, 2.0, z=2.9, energy=6)

# ---- the grand staircase to the gallery, left -------------------------------------------------------------------------
A.stairs_up(k, 1.2, 4.2, 2.0, H, n=7, rise=0.3, run=0.36)
A.potted_plant(k, 4.6, 3.0)
k.solid(1.0, 2.0, 4.4, 4.6)

# ---- the right: the clock, the globe, the captain's desk -----------------------------------------------------------------
A.grandfather_clock(k, 19.9, 2.0)
A.globe(k, 19.4, 4.2)
k.solid(19.4, 2.0, 20.4, 2.7)
k.solid(19.0, 3.8, 19.8, 4.6)
A.armchair(k, 3.0, 9.0, facing='down', tone='#2e5a3e')
k.solid(2.6, 8.6, 3.4, 9.4)
A.potted_plant(k, 1.6, 10.6)
A.potted_plant(k, 20.4, 10.6)

# ---- the long carpet, the chandelier --------------------------------------------------------------------------------------
A.rug(k, 7.0, 4.0, 15.0, 10.6, col='#6a1e22', trim=GOLD, pattern=True)
CX, CR, CZ = 11.0, 6.6, 3.0
k.cyl(CX, CR, CZ + 0.4, H + 0.3, 0.02, (GOLD, 0.25), 'chandelier_chain', verts=6)
k.cyl(CX, CR, CZ + 0.3, CZ + 0.42, 0.42, (GOLD, 0.25), 'chandelier_ring', verts=24)
for i in range(8):
    a = i * math.pi / 4
    x, r = CX + math.cos(a) * 0.4, CR + math.sin(a) * 0.4
    k.cyl(x, r, CZ + 0.42, CZ + 0.5, 0.04, (GOLD, 0.25), 'chandelier_cup', verts=8)
    A.candle(k, x, r, CZ + 0.5, energy=1.5)
k.point_light(CX, CR, CZ, '#ffd8a0', 140, radius=0.5)
k.point_light(5.0, 8.0, 2.4, '#ffd0a0', 50, radius=0.6)
k.point_light(17.0, 8.0, 2.4, '#ffd0a0', 50, radius=0.6)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.7}}, light_samples=128, world_light=('#38405a', 0.45))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'Ashcombe House', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar-home',
          'spawns': {'player': [10, 11]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-crown', 'leaveSpawn': [45, 30], 'label': 'THE WATERFRONT', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 11, 'y': 3, 'type': 'dialog', 'label': 'HEARTH', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A FIRE IN MARBLE, A GILT MIRROR, AND OVER IT THE LAST ASHCOMBE IN HIS ADMIRAL\'S COAT, LOOKING AS IF HE\'D LIKE A WORD ABOUT THE CARPET.'},
    {'x': 6, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK', 'action': 'view', 'view': 'sea', 'beam': True,
     'dialog': 'THE ROYAL PIER, THE FISHING JETTY, THE GREEN LIGHT ON THE WEST POINT. EVERY SHIP IN THE CAPITAL GOES PAST YOUR WINDOW.'},
    {'x': 15, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK', 'action': 'view', 'view': 'sea', 'roofs': True,
     'dialog': 'THE CROWN & ANCHOR\'S CHIMNEY NEXT DOOR, AND PAST IT THE ROYAL YARD, A HULL ON THE SLIP.'},
    {'x': 3, 'y': 5, 'type': 'dialog', 'label': 'STAIRCASE', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'UP TO THE GALLERY: BEDROOMS UNDER DUST SHEETS, A NURSERY NOBODY HAS USED IN FIFTY YEARS, A STUDY WITH A TELESCOPE POINTED AT THE PALACE.'},
    {'x': 19, 'y': 3, 'type': 'dialog', 'label': 'GRANDFATHER CLOCK', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'IT STRIKES WITH ST BRENDAN\'S BELLS, NEVER A MOMENT BEFORE OR AFTER. THE ASHCOMBES WOUND IT EVERY SUNDAY FOR TWO HUNDRED YEARS.'},
    {'x': 9, 'y': 2, 'type': 'dialog', 'label': 'BOOKCASE', 'prompt': 'PRESS E TO READ',
     'dialog': 'LOGBOOKS, THREE SHELVES OF THEM, EVERY VOYAGE AN ASHCOMBE EVER MADE. THE LAST ONE ENDS MID-SENTENCE.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID)
print('manor done')
