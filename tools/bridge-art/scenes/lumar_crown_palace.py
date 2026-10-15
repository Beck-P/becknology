"""The Palace of the Emerald Crown — the throne room (world id "lumar-crown-palace").
Usage: BVENV/bin/python lumar_crown_palace.py RENDER_DIR

The great hall behind the gatehouse: dark polished stone, a red carpet up the middle to a dais of three steps, and on it
the throne — high-backed, gilt, green velvet — under the royal arms. Tall windows on the harbour between green banners
with the gold crown; the Admiralty table on the left with the Crown's own chart of the seas and model ships on it; the
captains' bench on the right; candelabra, guards either side of the dais. The Queen-Regent gives audience to captains
with a fleet (js/crown.js: the royal commissions); her steward keeps the book.
"""
import json
import math
import os
import sys

from _lumar_room import A, ROOT, Kit, THETA, apply_world  # noqa: F401
from scenekit import shade
import assets_town as W

OUT = sys.argv[1]
WID = 'lumar-crown-palace'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 22, 15
H = 3.2 / math.cos(THETA)
FLOOR = (1, 2, 20, 12)
DOORS = [(10, 13), (11, 13)]
STONE = '#8a8478'
GOLD = '#d0a040'
GREEN = '#1e4a32'
CX = 11.0                                               # the hall's centre line

k = Kit(COLS, ROWS, margin_top=2.2, margin_bottom=0.5, seed=4431)

# ---- the shell: dark polished stone, tall pale walls ------------------------------------------------------------
k.box(0.4, 1.5, -0.12, 21.6, 13.0, -0.02, '#141416', 'subfloor')
for r in range(2, 13):
    for c in range(1, 21):
        tone = '#3a3c44' if (r + c) % 2 else '#33353c'
        k.box(c + 0.01, r + 0.01, -0.04, c + 0.99, r + 0.99, 0.0, (shade(tone, k.rng.uniform(0.94, 1.06)), 0.04), 'floor')
A.back_wall(k, 0.4, 21.6, 2.0, H, plaster=STONE, wainscot=1.1, wainscot_col='#3a2a1e', beams_every=0, stone=True)
for x in (1.6, 6.4, 15.6, 20.4):                        # pilasters with gilt capitals
    k.box(x - 0.24, 1.95, 0, x + 0.24, 2.14, H, (shade(STONE, 1.1), 0.1), 'pilaster')
    k.box(x - 0.32, 1.95, H - 0.32, x + 0.32, 2.2, H - 0.14, (GOLD, 0.25), 'pilaster_cap')
k.box(0.4, 1.9, H - 0.14, 21.6, 2.22, H + 0.05, (shade(STONE, 1.15), 0.1), 'cornice')
A.side_wall(k, 0.4, 1.0, 1.5, 13.0, H)
A.side_wall(k, 21.0, 21.6, 1.5, 13.0, H)
A.front_wall(k, 0.4, 21.6, 13.0, gaps=[(10.0, 12.0)])
A.door_frame(k, 10.0, 12.0, 13.0)

# ---- tall windows on the harbour, banners between ---------------------------------------------------------------


def tall_window(x, w=1.1, z0=1.25, z1=3.4):
    k.box(x - w / 2 - 0.14, 1.95, z0 - 0.14, x + w / 2 + 0.14, 2.04, z1 + 0.3, ('#5a5448', 0.12), 'window_frame')
    k.box(x - w / 2, 2.04, z0, x + w / 2, 2.06, z1, ('#1a2a4a', 0.05), 'window_glass', emit=('#2a4a7a', 0.9))
    k.box(x - w / 2 + 0.1, 2.06, z0 + 0.1, x + w / 2 - 0.1, 2.065, z0 + 0.5, ('#1a3040', 0.05), 'window_sea', emit=('#3a6a8a', 0.7))
    k.box(x - w / 2, 2.04, z1, x + w / 2, 2.06, z1 + 0.22, ('#3a2a5a', 0.05), 'window_head', emit=('#c8a040', 0.6))
    for i in range(1, 4):
        k.box(x - w / 2, 2.06, z0 + (z1 - z0) * i / 4 - 0.02, x + w / 2, 2.09, z0 + (z1 - z0) * i / 4 + 0.02, ('#4a4438', 0.12), 'window_bar')
    k.box(x - 0.025, 2.06, z0, x + 0.025, 2.09, z1, ('#4a4438', 0.12), 'window_bar')
    k.box(x - w / 2 - 0.2, 2.0, z0 - 0.2, x + w / 2 + 0.2, 2.3, z0 - 0.1, (shade(STONE, 1.1), 0.1), 'sill')
    k.area_light(x, 2.6, 2.0, '#8098d0', 30, 1.0, rot=(math.radians(-65), 0, 0))


for x in (3.9, 18.1):
    tall_window(x)


def banner(x, z1=3.5, w=0.8, l=1.9):
    k.cyl_x(x - w / 2 - 0.1, x + w / 2 + 0.1, 2.12, z1 + 0.05, 0.035, 0.035, ('#3a2a1a', 0.12), 'banner_pole', verts=8)
    k.box(x - w / 2, 2.1, z1 - l, x + w / 2, 2.14, z1, (GREEN, 0.12), 'banner')
    k.poly([(x - w / 2, 2.142, z1 - l), (x + w / 2, 2.142, z1 - l), (x, 2.142, z1 - l - 0.3)], (GREEN, 0.12), 'banner_tail')
    k.box(x - w / 2, 2.143, z1 - 0.12, x + w / 2, 2.15, z1 - 0.06, (GOLD, 0.25), 'banner_trim')
    zc = z1 - l * 0.42                                   # the gold crown on it
    k.box(x - 0.2, 2.145, zc - 0.08, x + 0.2, 2.152, zc + 0.04, (GOLD, 0.25), 'banner_crown')
    for dx in (-0.16, 0.0, 0.16):
        k.poly([(dx + x - 0.05, 2.152, zc + 0.04), (dx + x + 0.05, 2.152, zc + 0.04), (dx + x, 2.152, zc + 0.17)], (GOLD, 0.25), 'banner_crown')


for x in (5.3, 8.1, 13.9, 16.7):
    banner(x)

# ---- the dais, the throne, the royal arms -----------------------------------------------------------------------
for i, (x0, x1, r1, z) in enumerate(((7.4, 14.6, 5.0, 0.15), (8.0, 14.0, 4.4, 0.3), (8.6, 13.4, 3.8, 0.45))):
    k.box(x0, 2.0, z - 0.15, x1, r1, z, (shade('#5a5650', 1.0 + 0.05 * i), 0.1), 'dais', bevel=0.02)
    k.box(x0, r1 - 0.05, z - 0.02, x1, r1 + 0.01, z, (GOLD, 0.25), 'dais_edge')
A.rug(k, 9.8, 2.6, 12.2, 5.0, col='#7a1a1a', trim=GOLD)
TZ = 0.45
TR = 2.9                                               # the throne
k.box(CX - 0.55, TR - 0.4, TZ, CX + 0.55, TR - 0.02, TZ + 0.48, (GOLD, 0.25), 'throne_base', bevel=0.03)   # shallow: she sits in front of it
k.box(CX - 0.45, TR - 0.3, TZ + 0.48, CX + 0.45, TR - 0.04, TZ + 0.56, ('#2a6a46', 0.12), 'throne_seat', bevel=0.02)
k.box(CX - 0.55, TR - 0.48, TZ + 0.48, CX + 0.55, TR - 0.3, TZ + 2.0, (GOLD, 0.25), 'throne_back', bevel=0.03)
k.box(CX - 0.42, TR - 0.31, TZ + 0.6, CX + 0.42, TR - 0.29, TZ + 1.85, ('#2a6a46', 0.12), 'throne_velvet')
for dx in (-0.6, 0.6):
    k.box(CX + dx - 0.08, TR - 0.4, TZ + 0.48, CX + dx + 0.08, TR - 0.02, TZ + 0.85, (GOLD, 0.25), 'throne_arm', bevel=0.02)
    k.sphere(CX + dx, TR - 0.04, TZ + 0.88, 0.09, 0.09, (GOLD, 0.25), 'throne_knob', segs=8)
for dx in (-0.48, 0.0, 0.48):                           # the crown on the throne's back
    k.cone(CX + dx, TR - 0.4, TZ + 2.0, TZ + 2.35 if dx else TZ + 2.5, 0.1, 0.0, (GOLD, 0.25), 'throne_point', verts=6)
k.sphere(CX, TR - 0.42, TZ + 2.55, 0.08, 0.08, '#40e080', 'throne_gem', emit=('#20c060', 1.2), segs=8)
k.solid(CX - 0.7, 2.0, CX + 0.7, TR + 0.4)
# the royal arms on the wall above: a green shield, a gold crown and anchor
AZ = H - 0.95
k.box(CX - 0.6, 1.98, AZ - 0.7, CX + 0.6, 2.06, AZ + 0.55, (GREEN, 0.12), 'arms_shield', bevel=0.04)
k.poly([(CX - 0.6, 2.06, AZ - 0.7), (CX + 0.6, 2.06, AZ - 0.7), (CX, 2.06, AZ - 1.1)], (GREEN, 0.12), 'arms_point')
k.box(CX - 0.66, 1.96, AZ + 0.55, CX + 0.66, 2.08, AZ + 0.64, (GOLD, 0.25), 'arms_rim')
k.tube((CX, 2.08, AZ - 0.55), (CX, 2.08, AZ + 0.15), 0.045, (GOLD, 0.25), 'arms_anchor', verts=6)
k.tube((CX - 0.3, 2.08, AZ - 0.4), (CX, 2.08, AZ - 0.62), 0.035, (GOLD, 0.25), 'arms_anchor', verts=6)
k.tube((CX + 0.3, 2.08, AZ - 0.4), (CX, 2.08, AZ - 0.62), 0.035, (GOLD, 0.25), 'arms_anchor', verts=6)
k.box(CX - 0.3, 2.07, AZ + 0.2, CX + 0.3, 2.09, AZ + 0.32, (GOLD, 0.25), 'arms_crown')
for dx in (-0.22, 0.0, 0.22):
    k.poly([(CX + dx - 0.07, 2.09, AZ + 0.32), (CX + dx + 0.07, 2.09, AZ + 0.32), (CX + dx, 2.09, AZ + 0.5)], (GOLD, 0.25), 'arms_crown')
k.point_light(CX, 3.4, 3.6, '#ffe0a0', 40, radius=0.4)
k.point_light(CX, 4.6, 2.2, '#ffd8a0', 45, radius=0.4)                 # lamplight on the throne
for x in (8.9, 13.1):                                   # candle stands on the dais
    k.cyl(x, 2.5, 0.45, 0.55, 0.16, (GOLD, 0.25), 'stand_foot', verts=10)
    k.cyl(x, 2.5, 0.55, 1.75, 0.035, (GOLD, 0.25), 'stand_shaft', verts=8)
    for dx in (-0.2, 0.0, 0.2):
        k.cyl(x + dx, 2.5, 1.72, 1.76, 0.05, (GOLD, 0.25), 'stand_cup', verts=8)
        A.candle(k, x + dx, 2.5, 1.76, energy=2.5)
k.solid(7.4, 2.0, 14.6, 5.0)                            # the dais: you stand at its foot, on the carpet

# ---- the long carpet down the hall --------------------------------------------------------------------------------
A.rug(k, 10.0, 5.0, 12.0, 13.0, col='#8a1e1e', trim=GOLD)

# ---- the Admiralty table (left): the Crown's chart, model ships, dividers -----------------------------------------
AT = (2.2, 6.6, 6.0, 8.0)
k.box(AT[0], AT[2], 0.75, AT[1], AT[3], 0.84, ('#5a3a1e', 0.12), 'adm_top', bevel=0.03)
for (x, r) in ((AT[0] + 0.2, AT[2] + 0.2), (AT[1] - 0.2, AT[2] + 0.2), (AT[0] + 0.2, AT[3] - 0.2), (AT[1] - 0.2, AT[3] - 0.2)):
    k.cyl(x, r, 0.0, 0.75, 0.08, ('#3e2414', 0.12), 'adm_leg', verts=8)
k.box(AT[0] + 0.2, AT[2] + 0.15, 0.84, AT[1] - 0.2, AT[3] - 0.15, 0.85, ('#d8c8a0', 0.08), 'adm_chart')
for (x, r, w, d, col) in ((2.6, 6.3, 1.2, 0.6, '#9ab08a'), (4.1, 6.3, 1.2, 0.6, '#b0a4b8'), (2.6, 7.0, 1.4, 0.6, '#c09a88'),
                          (4.3, 7.0, 1.3, 0.65, '#a8b4c4'), (3.4, 6.65, 1.0, 0.4, '#c8a8b0')):
    k.box(x, r, 0.85, x + w, r + d, 0.852, (col, 0.08), 'adm_sea')
for (x, r) in ((3.0, 6.5), (4.2, 6.9), (5.4, 6.4), (3.8, 7.4), (5.6, 7.3)):
    k.box(x - 0.12, r - 0.05, 0.852, x + 0.12, r + 0.05, 0.9, ('#4a2a1a', 0.12), 'adm_ship')
    k.box(x - 0.01, r - 0.01, 0.9, x + 0.01, r + 0.01, 1.05, ('#e8e0cc', 0.1), 'adm_mast')
k.tube((5.9, 7.6, 0.86), (6.2, 7.3, 0.86), 0.01, (GOLD, 0.25), 'dividers', verts=4)
k.solid(AT[0], AT[2], AT[1], AT[3])
for x in (3.0, 4.4, 5.8):                               # chairs round it
    k.box(x - 0.22, 8.15, 0.0, x + 0.22, 8.55, 0.48, ('#3e2414', 0.12), 'adm_chair', bevel=0.02)
    k.box(x - 0.22, 8.45, 0.48, x + 0.22, 8.55, 1.05, ('#2a6a46', 0.12), 'adm_chair_back')
k.solid(2.6, 8.1, 6.2, 8.6)
A.globe(k, 1.7, 11.0)

# ---- the captains' bench (right), a fireplace on the side, guards' halberds ----------------------------------------
A.bench(k, 16.2, 19.6, 8.4)
A.bench(k, 16.2, 19.6, 10.4)
k.box(19.9, 5.3, 0.0, 20.6, 7.7, 0.95, ('#4a2e18', 0.12), 'side_dresser', bevel=0.02)
for i, x in enumerate((20.0, 20.25)):
    k.cyl(x + 0.1, 5.8 + i * 0.4, 0.95, 1.25, 0.08, (GOLD, 0.25), 'goblet', verts=8)
k.cyl(20.25, 6.9, 0.95, 1.3, 0.12, ('#3a6a8a', 0.05), 'decanter', verts=10)
k.solid(19.8, 5.2, 20.7, 7.8)
STEEL = ('#9a9aa6', 0.4)
for x in (8.2, 13.8):                                   # suits of armour by the dais, halberds in hand
    k.box(x - 0.3, 5.3, 0.0, x + 0.3, 5.9, 0.12, ('#3a3a40', 0.2), 'armour_plinth', bevel=0.02)
    for dx in (-0.09, 0.09):                            # legs, greaves, sabatons
        k.cyl(x + dx, 5.6, 0.12, 0.72, 0.065, STEEL, 'armour_leg', verts=8)
        k.box(x + dx - 0.07, 5.5, 0.12, x + dx + 0.07, 5.68, 0.2, STEEL, 'armour_foot')
    k.box(x - 0.2, 5.48, 0.7, x + 0.2, 5.72, 0.86, STEEL, 'armour_tasset', bevel=0.03)
    k.box(x - 0.19, 5.47, 0.86, x + 0.19, 5.73, 1.28, STEEL, 'armour_cuirass', bevel=0.06)
    k.box(x - 0.04, 5.46, 0.9, x + 0.04, 5.47, 1.24, ('#c8c8d4', 0.45), 'armour_ridge')
    for dx in (-0.25, 0.25):                            # pauldrons and arms
        k.sphere(x + dx, 5.6, 1.24, 0.1, 0.08, STEEL, 'armour_pauldron', segs=8)
        k.cyl(x + dx, 5.6, 0.86, 1.2, 0.05, STEEL, 'armour_arm', verts=8)
    k.cyl(x, 5.6, 1.28, 1.52, 0.11, STEEL, 'armour_helm', verts=12)
    k.sphere(x, 5.6, 1.52, 0.11, 0.06, STEEL, 'armour_helm', segs=10)
    k.box(x - 0.08, 5.48, 1.38, x + 0.08, 5.49, 1.41, ('#1a1a1a', 0.1), 'armour_slit')
    k.blob(x, 5.66, 1.66, 0.04, 0.12, 0.08, ('#2a7a4a', 0.15), 'armour_plume', segs=8)
    k.tube((x + 0.28, 5.55, 0.0), (x + 0.28, 5.55, 2.1), 0.025, ('#5a3a1e', 0.12), 'halberd', verts=6)
    k.cone(x + 0.28, 5.55, 2.1, 2.4, 0.06, 0.0, ('#b0b0b8', 0.35), 'halberd_head', verts=6)
    k.solid(x - 0.35, 5.25, x + 0.35, 5.95)
for (x, r) in ((1.8, 12.2), (20.2, 12.2)):
    A.potted_plant(k, x, r)
for r in (8.0, 11.0):                                   # standing candelabra down the carpet
    for x in (9.1, 12.9):
        k.cyl(x, r, 0.0, 0.08, 0.2, (GOLD, 0.25), 'cand_foot', verts=10)
        k.cyl(x, r, 0.08, 1.5, 0.035, (GOLD, 0.25), 'cand_shaft', verts=8)
        k.tube((x - 0.22, r, 1.42), (x + 0.22, r, 1.42), 0.025, (GOLD, 0.25), 'cand_arm', verts=6)
        for dx in (-0.22, 0.0, 0.22):
            A.candle(k, x + dx, r, 1.45 if dx else 1.5, energy=1.8)
        k.solid(x - 0.25, r - 0.25, x + 0.25, r + 0.25)

# ---- light: chandeliers down the hall ----------------------------------------------------------------------------
for (x, r, e) in ((CX, 5.5, 160), (CX, 9.5, 140), (4.4, 7.0, 110), (17.8, 9.4, 100)):
    A.hanging_lamp(k, x, r, z=2.8, energy=e, visible=False)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.82}}, light_samples=128, world_light=('#3a4060', 0.5))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Palace of the Emerald Crown', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar',
          'spawns': {'player': [10, 12]}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'indoors': True})
w['interactions'] = [
    {'x': x, 'y': y, 'type': 'leave_world', 'leaveTo': 'lumar-crown', 'leaveSpawn': [32, 14], 'label': 'THE GATE', 'prompt': 'PRESS E TO GO OUT'}
    for (x, y) in DOORS] + [
    {'x': 11, 'y': 4, 'type': 'audience', 'label': 'THE QUEEN-REGENT', 'prompt': 'PRESS E TO BOW'},
    {'x': 9, 'y': 4, 'type': 'dialog', 'label': 'STEWARD', 'prompt': 'PRESS E TO TALK',
     'dialog': 'THE STEWARD CONSULTS HIS BOOK. "THE QUEEN-REGENT WILL HEAR YOU. KEEP IT SHORT AND DO NOT MENTION THE PAYROLL."'},
    {'x': 4, 'y': 6, 'type': 'commissions', 'label': 'ADMIRALTY TABLE', 'prompt': 'PRESS E TO LOOK'},
    {'x': 13, 'y': 4, 'type': 'dialog', 'label': 'ROYAL ARMS', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE ROYAL ARMS: A GOLD CROWN OVER A GOLD ANCHOR ON EMERALD GREEN. "BY SEA, OR NOT AT ALL."'},
    {'x': 4, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE WHOLE HARBOUR BELOW: THE QUAY\'S LANTERNS, THE ROYAL YARD\'S SHEER-LEGS, YOUR OWN MASTS AMONG THE REST.'},
    {'x': 18, 'y': 2, 'type': 'dialog', 'label': 'WINDOW', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE CROWN LIGHT ON THE POINT, GREEN ON THE WATER, AND BEYOND IT THE DARK WHERE THE EMERALD SEA BECOMES SOMETHING ELSE.'},
    {'x': 8, 'y': 5, 'type': 'dialog', 'label': 'ARMOUR', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'THE ARMOUR OF CAPTAIN MIRA LUMAR, WHO CHARTED THE FIVE SEAS. SMALLER THAN YOU\'D THINK. DENTED IN PLACES YOU\'D RATHER NOT.'},
    {'x': 1, 'y': 11, 'type': 'dialog', 'label': 'GLOBE', 'prompt': 'PRESS E TO SPIN',
     'dialog': 'THE CROWN\'S GLOBE. LUMAR\'S FIVE SEAS ON ONE SIDE. ON THE OTHER, SOMEONE HAS BEGUN TO DRAW A SIXTH, IN PENCIL, AND STOPPED.'},
    {'x': 15, 'y': 4, 'type': 'dialog', 'label': 'GUARD', 'prompt': 'PRESS E TO TALK',
     'dialog': 'A PALACE GUARD, STARING STRAIGHT AHEAD WITH GREAT CONCENTRATION.'},
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
for (x, y) in ((9, 3), (15, 4), (6, 4)):                # the steward, the guards
    k.solid(x, y, x + 1, y + 1)
apply_world(WORLD, k, FLOOR, doors=DOORS, scene_id=WID, actors=[
    {'sheet': 'npc-queen', 'x': 10.5, 'y': 2.38, 'facing': 'down', 'pose': 'sit', 'lift': TZ, 'light': [11, 5]},
    {'sheet': 'npc-steward', 'x': 9, 'y': 3, 'facing': 'down', 'lift': 0.38},
    {'sheet': 'npc-watcher', 'x': 15, 'y': 4, 'facing': 'down'},
    {'sheet': 'npc-watcher', 'x': 6, 'y': 4, 'facing': 'down'},
])
print('palace done')
