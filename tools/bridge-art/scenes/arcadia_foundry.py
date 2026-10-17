"""The Foundry — the Undercity's industrial club, in an old smelting hall (Blender scene).

  BVENV/bin/python tools/bridge-art/scenes/arcadia_foundry.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-foundry

A smelting hall gone to the night: the dead furnace along the back glowing orange again from lamps put inside it,
Static on the decks on a steel gantry in front of it, speaker stacks built from old machinery, a dance floor of steel
grating with red light coming up through it, chains and hooks hanging from the dark, a ladle the size of a car hung
over the floor, the bar built from a conveyor, oil drums for tables, cages to dance in. Red and sodium. World:
arcadia-foundry, 32 x 22.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_under as U                    # noqa: E402
import assets_cyber as Y                    # noqa: E402
import assets_signs as S                    # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'arcadia-foundry'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 32, 22
R0, R1 = 3.0, 20.6
H = 5.0
RED = '#ff3a1a'
ORG = '#ff7a2a'

k = Kit(COLS, ROWS, margin_top=0.6, margin_bottom=0.5, seed=1313)
dr = U.Drips()
rng = k.rng
U.room(k, dr, 0.6, R0, COLS - 0.6, R1, H, door=(14.4, 17.6), floor='concrete', wall='#2a2224', clad='corrugated', rng=rng,
       tones=('#2e2a2a', '#322c2c', '#2a2626'))

# ---- the furnace along the back, glowing; the gantry and the decks in front --------------------------------------------------
k.box(6.0, R0 + 0.02, 0.0, 26.0, R0 + 1.4, 3.6, ('#3a2a24', 0.12), 'furnace', bevel=0.04)
for i in range(4):                                                              # its mouths, lit inside
    x = 7.5 + i * 4.8
    k.cyl_y(x + 1.0, R0 + 1.38, R0 + 1.44, 1.2, 0.95, 0.85, '#1a0a04', 'furnace_mouth', verts=16)
    k.cyl_y(x + 1.0, R0 + 1.3, R0 + 1.39, 1.2, 0.8, 0.7, '#5a1a04', 'furnace_fire', emit=(ORG, 1.0), verts=16)
    k.point_light(x + 1.0, R0 + 2.0, 1.2, ORG, 40, radius=0.6, group='flicker')
k.boxes([(6.0, R0 + 1.4, z, 26.0, R0 + 1.45, z + 0.08) for z in (0.3, 2.6, 3.5)], '#5a3a24', 'furnace_band')
k.boxes([(x, R0 + 1.42, 0.0, x + 0.1, R0 + 1.47, 3.6) for x in [6.4 + i * 1.2 for i in range(17)]], '#4a3026', 'furnace_rib')
for x in (8.0, 24.0):                                                           # flues going up into the dark
    k.cyl(x, R0 + 0.6, 3.6, H + 1.5, 0.5, ('#3a2a24', 0.1), 'flue', verts=14)
k.box(9.5, R0 + 1.6, 0.0, 22.5, R0 + 3.2, 0.45, ('#3a3a40', 0.08), 'gantry')            # the gantry: a steel riser
k.box(9.5, R0 + 3.15, 0.05, 22.5, R0 + 3.2, 0.4, '#1a0806', 'gantry_led', emit=(RED, 0.7))
k.boxes([(9.5, R0 + 1.6 + i * 0.4, 0.45, 22.5, R0 + 1.62 + i * 0.4, 0.46) for i in range(4)], '#5a5a60', 'gantry_plate')
k.box(13.5, R0 + 2.0, 0.45, 18.5, R0 + 2.7, 1.25, ('#1a1a1e', 0.06), 'deck_table', bevel=0.02)
for x in (14.6, 17.4):
    k.cyl(x, R0 + 2.3, 1.25, 1.29, 0.3, '#0e0e14', 'turntable', verts=16)
k.box(15.6, R0 + 2.1, 1.25, 16.4, R0 + 2.5, 1.3, '#2a2a34', 'mixer')
for i in range(6):
    k.box(15.65 + i * 0.12, R0 + 2.15, 1.3, 15.7 + i * 0.12, R0 + 2.45, 1.31, '#100808', 'fader', emit=((RED, ORG)[i % 2], 0.9))
k.box(13.5, R0 + 2.69, 0.55, 18.5, R0 + 2.71, 1.2, '#1a0806', 'deck_front', emit=(RED, 0.5))
for x0 in (3.0, 26.6):                                                          # speaker stacks out of old machinery
    for j in range(3):
        z = j * 1.15
        k.box(x0, R0 + 0.8, z, x0 + 2.2, R0 + 2.0, z + 1.1, ('#1a1818', 0.08), 'speaker', bevel=0.03)
        k.cyl_y(x0 + 1.1, R0 + 2.0, R0 + 2.04, z + 0.55, 0.42, 0.42, ('#2a2826', 0.05), 'cone', verts=16)
        k.cyl_y(x0 + 1.1, R0 + 2.04, R0 + 2.06, z + 0.55, 0.14, 0.14, '#4a4440', 'dust_cap', verts=10)
    k.solid(x0, R0 + 0.8, x0 + 2.2, R0 + 2.0)
k.solid(6.0, R0, 26.0, R0 + 3.2)
S.letters(k, 'FOUNDRY', 'RubikMonoOne', 16.0, R0 + 1.46, 3.8, size=0.8, col=ORG, energy=26)

# ---- the dance floor: steel grating with red light coming up through it -------------------------------------------------------
DF = (8, 9, 24, 15)                     # tiles x 8..23, rows 9..14
k.box(DF[0], DF[1], -0.3, DF[2], DF[3], -0.25, '#1a0402', 'grate_pit', emit=(RED, 0.8))
k.box(DF[0] - 0.1, DF[1] - 0.1, -0.02, DF[2] + 0.1, DF[3] + 0.1, 0.0, '#3a3a40', 'floor_frame')
bars = [(x, DF[1], -0.04, x + 0.05, DF[3], 0.0) for x in [DF[0] + i * 0.25 for i in range(int((DF[2] - DF[0]) / 0.25) + 1)]]
bars += [(DF[0], r, -0.03, DF[2], r + 0.04, 0.0) for r in [DF[1] + i * 0.5 for i in range(int((DF[3] - DF[1]) / 0.5) + 1)]]
k.boxes(bars, ('#4a4a50', 0.06), 'floor_grating')
k.point_light((DF[0] + DF[2]) / 2, (DF[1] + DF[3]) / 2, 0.4, RED, 70, radius=2.0, group='flicker')
# the ladle hung over the floor on chains, chains and hooks hanging from the dark
k.cyl(16.0, 11.6, 3.6, 4.4, 0.9, ('#3a3030', 0.1), 'ladle', verts=18)
k.cyl(16.0, 11.6, 4.35, 4.42, 0.8, '#5a1a04', 'ladle_glow', emit=(ORG, 0.9), verts=18)
for a in range(3):
    ax = 16.0 + math.cos(a * 2.1) * 0.8
    ar = 11.6 + math.sin(a * 2.1) * 0.5
    k.tube((ax, ar, 4.4), (16.0, 11.6, H + 1.2), 0.03, '#5a5a60', 'chain', verts=4)
for (x, r) in ((5.5, 8.0), (11.0, 16.4), (21.0, 16.4), (26.5, 8.0), (4.0, 15.0), (28.0, 15.0)):
    zb = rng.uniform(2.6, 3.4)
    k.tube((x, r, zb), (x, r, H + 1.2), 0.025, '#5a5a60', 'chain', verts=4)
    k.tube((x, r, zb), (x + 0.12, r, zb - 0.25), 0.03, '#7a7a80', 'hook', verts=4)
# dancing cages either side of the floor
for (x, r) in ((5.0, 11.6), (27.0, 11.6)):
    k.cyl(x, r, 0.0, 0.5, 0.75, ('#2a2a30', 0.08), 'cage_plinth', verts=16)
    for a in range(12):
        k.tube((x + math.cos(a * math.pi / 6) * 0.7, r + math.sin(a * math.pi / 6) * 0.7, 0.5),
               (x + math.cos(a * math.pi / 6) * 0.7, r + math.sin(a * math.pi / 6) * 0.7, 2.8), 0.02, '#7a7a80', 'cage_bar', verts=4)
    k.cyl(x, r, 2.8, 2.86, 0.75, '#5a5a60', 'cage_top', verts=16)
    k.point_light(x, r, 2.5, RED, 16, radius=0.3, group='flicker')
    k.solid(x - 0.8, r - 0.8, x + 0.8, r + 0.8)

# ---- the bar along the left, built from a conveyor; drums for tables -----------------------------------------------------------
k.box(1.0, 9.0, 0.0, 2.2, 19.0, 1.0, ('#3a3a40', 0.1), 'bar_counter', bevel=0.02)
k.box(0.95, 8.95, 1.0, 2.25, 19.05, 1.06, ('#1a1a1e', 0.1), 'conveyor_belt')
k.boxes([(0.95, r, 1.06, 2.25, r + 0.05, 1.07) for r in [9.0 + i * 0.25 for i in range(40)]], '#3a3a40', 'belt_slat')
for r in (10.0, 12.5, 15.0, 17.5):
    k.cyl(1.6, r, 1.07, 1.3, 0.06, shade(ORG, 0.5), 'glass', emit=(ORG, 0.6), verts=8)
k.box(1.02, 9.0, 0.1, 1.04, 19.0, 0.16, '#1a0806', 'bar_led', emit=(ORG, 0.8))
for r in [9.6 + i * 1.1 for i in range(9)]:
    Y.neon_stool(k, 2.8, r, seat='#3a3a40')
k.solid(1.0, 9.0, 2.2, 19.0)
for (x, r) in ((27.0, 16.6), (29.0, 18.2), (25.0, 18.6), (28.8, 14.8)):
    k.cyl(x, r, 0.0, 0.95, 0.3, (U.RUST, 0.2), 'drum', verts=14)
    k.cyl(x, r, 0.93, 0.97, 0.31, '#3a2014', 'drum_rim', verts=14)
    k.cyl(x, r, 0.97, 1.15, 0.05, shade(ORG, 0.5), 'glass', emit=(ORG, 0.5), verts=8)
    k.solid(x - 0.32, r - 0.32, x + 0.32, r + 0.32)
U.fluoro(k, dr, 6.0, 18.0, 3.0, w=1.2, col='#ff8060', hang=H + 0.5, energy=16)
U.fluoro(k, dr, 26.0, 18.0, 3.0, w=1.2, col='#ff8060', hang=H + 0.5, energy=16, dead=True)
for x in (14.0, 18.0):
    dr.vent(x, 9.2, 0.0)

# ---- light: red from the floor, orange from the furnace, a hard beam or two ----------------------------------------------------
k.area_light(16, 12, 6.0, '#a04020', 60, 20.0, rot=(math.radians(30), 0, 0))
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.6}}, light_samples=96, world_light=('#2a1414', 0.55))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Foundry', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [15, 20]}, 'shipExit': False, 'interior': True})


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': x, 'y': 21, 'type': 'leave_world', 'label': 'THE WARRENS', 'prompt': 'PRESS E TO GO OUT', 'leaveTo': 'arcadia-undercity', 'leaveSpawn': [45, 10]}
    for x in (14, 15, 16, 17)] + [
    {'x': 16, 'y': 12, 'type': 'under', 'act': 'dance', 'label': 'THE FLOOR', 'prompt': 'PRESS E TO DANCE',
     'dance': 'THE KICK HITS LIKE A DROP HAMMER AND THE GRATING SHAKES UNDER YOU. RED LIGHT COMES UP THROUGH THE FLOOR, THE LADLE GLOWS OVERHEAD, AND THE WHOLE HALL MOVES AS ONE MACHINE.'},
    {'x': 16, 'y': 5, 'type': 'dialog', 'label': 'STATIC', 'prompt': 'PRESS E TO TALK', 'dialog': 'STATIC DOESN\'T TAKE THE HEADPHONES OFF.'},
    {'x': 2, 'y': 13, 'type': 'dialog', 'label': 'FOUNDRY BAR', 'prompt': 'PRESS E TO ORDER', 'dialog': 'DRINKS.'},
    look(5, 11, 'CAGE', 'A DANCING CAGE ON A PLINTH. THE BARS ARE POLISHED BRIGHT AT HAND HEIGHT.'),
    look(27, 11, 'CAGE', 'A DANCING CAGE. SOMEONE HAS SCRATCHED A TALLY OF NIGHTS INTO THE PLINTH. IT GOES ROUND TWICE.'),
    look(11, 3, 'FURNACE', 'THE OLD FURNACE, COLD FOR FIFTY YEARS, LIT AGAIN FROM INSIDE WITH ORANGE LAMPS. WHEN THE BASS DROPS IT SEEMS TO BREATHE.'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
DANCERS = [('npc-patron-a', 10, 11, 'up'), ('npc-patron-b', 13, 10, 'down'), ('npc-passerby', 19, 13, 'left'), ('npc-shopper', 21, 10, 'down'),
           ('npc-courier', 12, 13, 'right'), ('npc-samurai', 18, 9, 'down')]
for (s_, x, y, f) in DANCERS:
    k.solid(x, y, x + 1, y + 1)
apply_world(WORLD, k, (1, 4, COLS - 2, 20), doors=[(14, 21), (15, 21), (16, 21), (17, 21)], scene_id=WID,
            actors=[{'sheet': 'npc-static', 'x': 16, 'y': 5, 'facing': 'down'}] +
                   [{'sheet': s_, 'x': x, 'y': y, 'facing': f, 'dance': True} for (s_, x, y, f) in DANCERS])
w = json.load(open(WORLD))
w['undercity'] = {'drips': dr.drips, 'tubes': dr.tubes, 'level': 'undercity', 'floor': list(DF)}
w['scene']['steam'] = dr.steam
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('foundry done', len(k.parts), 'parts')
