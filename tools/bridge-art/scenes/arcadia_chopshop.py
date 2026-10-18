"""Sallow's Chrome — back-alley implants in the Warrens (Blender scene).

  BVENV/bin/python tools/bridge-art/scenes/arcadia_chopshop.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-chopshop

A ripper's room, green-lit: the chair under a ring lamp in the middle, a tray of tools on a stand, a drip on a pole,
a wall of second-hand parts (arms on hooks, eyes in jars, spines in a rack), a workbench with a magnifier and a
soldering iron smoking, a sink, a curtain half drawn on a cot, a fridge with a biohazard sticker, Doc Sallow at the
chair. World: arcadia-chopshop, 16 x 13. Its CHAIR opens the street-chrome shop (js/implants.js).
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
WID = 'arcadia-chopshop'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 16, 13
R0, R1 = 2.6, 11.6
H = 3.2
GRN = '#70ffb0'

k = Kit(COLS, ROWS, margin_top=0.8, margin_bottom=0.5, seed=9191)
dr = U.Drips()
rng = k.rng
U.room(k, dr, 0.6, R0, COLS - 0.6, R1, H, door=(7.0, 9.0), floor='tile', wall='#2a3230', clad='tile', rng=rng,
       tones=('#c8ccc4', '#b8bcb4'))

# ---- the wall of parts ------------------------------------------------------------------------------------------------------
k.box(1.0, R0 + 0.02, 0.9, 9.0, R0 + 0.12, 2.8, ('#3a3a36', 0.1), 'pegboard')
k.boxes([(1.1 + i * 0.2, R0 + 0.12, 0.95 + j * 0.2, 1.13 + i * 0.2, R0 + 0.13, 0.98 + j * 0.2) for i in range(39) for j in range(9)], '#22221e', 'peg_hole')
for i in range(5):                                                             # arms on hooks
    x = 1.5 + i * 0.75
    k.box(x - 0.03, R0 + 0.12, 2.5, x + 0.03, R0 + 0.3, 2.55, '#5a5a60', 'hook')
    k.tube((x, R0 + 0.28, 2.45), (x + rng.uniform(-0.1, 0.1), R0 + 0.28, 1.6), 0.07, rng.choice(('#a8b0b8', '#8a8a90', '#c8a070', '#5a6068')), 'chrome_arm', verts=8)
    k.sphere(x, R0 + 0.28, 1.55, 0.08, 0.07, '#c8d0d8', 'chrome_hand', segs=8)
for j, shelf in enumerate((1.25, 2.0)):                                         # jars: eyes, a heart, fingers
    k.box(5.4, R0 + 0.12, shelf - 0.04, 8.8, R0 + 0.5, shelf, '#4a4a46', 'shelf')
    for i in range(7):
        x = 5.65 + i * 0.47
        k.cyl(x, R0 + 0.32, shelf, shelf + 0.34, 0.12, shade('#80ffc0', 0.3), 'jar', emit=('#80ffc0', 0.35), verts=10)
        k.cyl(x, R0 + 0.32, shelf + 0.34, shelf + 0.38, 0.12, '#5a5a60', 'jar_lid', verts=10)
        if (i + j) % 2 == 0:
            k.sphere(x, R0 + 0.4, shelf + 0.16, 0.06, 0.06, '#e8e8e0', 'eye', segs=8)
            k.sphere(x, R0 + 0.46, shelf + 0.16, 0.025, 0.025, rng.choice(('#3a8ad0', '#2a6a3a', '#7a4a1a')), 'iris', segs=6)
        else:
            k.box(x - 0.06, R0 + 0.28, shelf + 0.05, x + 0.06, R0 + 0.38, shelf + 0.2, rng.choice(('#a8b0b8', '#c84040')), 'specimen')
S.neon(k, "SALLOW'S", 'Audiowide', 12.0, R0 + 0.02, 2.4, size=0.32, col=GRN, energy=8)
k.box(9.4, R0 + 0.02, 0.0, 10.6, R0 + 0.7, 1.9, ('#d8d8d0', 0.06), 'fridge')
k.box(9.6, R0 + 0.7, 1.2, 10.4, R0 + 0.71, 1.5, '#e8c040', 'biohazard')
k.cyl_y(10.0, R0 + 0.71, R0 + 0.72, 1.35, 0.08, 0.08, '#1a1a1a', 'biohazard_mark', verts=8)
k.solid(9.4, R0, 10.6, R0 + 0.7)
k.box(11.0, R0 + 0.02, 0.0, 12.4, R0 + 0.6, 0.85, ('#c8c8d0', 0.06), 'sink_unit')
k.box(11.2, R0 + 0.1, 0.85, 12.2, R0 + 0.5, 0.9, '#5a6a7a', 'sink')
k.tube((11.7, R0 + 0.1, 0.9), (11.7, R0 + 0.35, 1.25), 0.02, '#c8c8d0', 'tap', verts=5)
k.solid(11.0, R0, 12.4, R0 + 0.6)

# ---- the chair, the lamp, the tray, the drip --------------------------------------------------------------------------------
CX, CR = 6.4, 7.0
k.box(CX - 0.4, CR - 0.35, 0.0, CX + 0.4, CR + 0.35, 0.35, '#3a3a40', 'chair_base')
k.box(CX - 0.45, CR - 0.9, 0.35, CX + 0.45, CR + 0.9, 0.55, ('#2a5a4a', 0.12), 'chair_seat', bevel=0.05)
k.box(CX - 0.42, CR - 1.1, 0.5, CX + 0.42, CR - 0.7, 1.2, ('#2a5a4a', 0.12), 'chair_back', bevel=0.05)
for s in (-1, 1):
    k.box(CX + s * 0.52 - 0.06, CR - 0.4, 0.55, CX + s * 0.52 + 0.06, CR + 0.4, 0.62, '#3a3a40', 'chair_arm')
    k.box(CX + s * 0.52 - 0.07, CR + 0.1, 0.62, CX + s * 0.52 + 0.07, CR + 0.2, 0.66, '#8a5a3a', 'strap')
k.cyl(CX - 0.9, CR - 0.6, 0.0, 1.9, 0.04, '#5a5a60', 'lamp_stand', verts=6)                  # the surgical lamp on its arm, beside the chair
k.solid_post(CX - 0.9, CR - 0.6)
k.tube((CX - 0.9, CR - 0.6, 1.9), (CX - 0.35, CR - 0.1, 1.75), 0.03, '#5a5a60', 'lamp_arm', verts=6)
k.cyl(CX - 0.3, CR - 0.05, 1.62, 1.76, 0.2, '#c8ccd0', 'lamp_head', verts=14)
k.cyl(CX - 0.3, CR - 0.05, 1.6, 1.62, 0.16, shade(GRN, 0.4), 'lamp_glass', emit=('#e8fff0', 1.0), verts=14)
k.point_light(CX - 0.1, CR + 0.1, 1.3, '#e8fff0', 32, radius=0.3, group='flicker')
k.solid(CX - 0.55, CR - 1.1, CX + 0.55, CR + 0.9)
k.cyl(8.2, 6.8, 0.0, 0.9, 0.03, '#8a8a90', 'tray_stand', verts=6)                           # the tools on a tray
k.box(7.8, 6.5, 0.9, 8.6, 7.1, 0.94, ('#b8c0c8', 0.06), 'tray')
for i in range(6):
    k.box(7.88 + i * 0.12, 6.6, 0.94, 7.92 + i * 0.12, 7.0, 0.96, rng.choice(('#e8e8f0', '#c8c8d0', '#5a5a60')), 'tool')
k.solid(7.8, 6.5, 8.6, 7.1)
k.cyl(5.0, 6.2, 0.0, 2.0, 0.025, '#8a8a90', 'drip_pole', verts=6)                            # the drip on its pole
k.box(4.88, 6.15, 1.6, 5.12, 6.25, 1.95, shade('#80c0ff', 0.6), 'drip_bag', emit=('#80c0ff', 0.25))
k.tube((5.0, 6.2, 1.6), (5.9, 6.8, 0.6), 0.008, '#c8e0ff', 'drip_line', verts=3)
k.solid_post(5.0, 6.2)
# a monitor on an arm, vitals green
k.cyl(4.6, 7.8, 0.0, 1.4, 0.03, '#5a5a60', 'monitor_stand', verts=6)
k.box(4.25, 7.75, 1.4, 4.95, 7.85, 1.85, '#141418', 'monitor')
k.box(4.3, 7.85, 1.45, 4.9, 7.86, 1.8, '#0a1a10', 'monitor_screen', emit=('#40ff80', 0.7))
k.solid_post(4.6, 7.8)

# ---- the workbench, the cot behind its curtain ----------------------------------------------------------------------------------
k.box(10.8, 5.2, 0.0, 14.6, 6.0, 0.85, ('#4a4a46', 0.12), 'bench', bevel=0.01)
k.box(10.75, 5.15, 0.85, 14.65, 6.05, 0.9, ('#6a5a40', 0.12), 'bench_top')
k.cyl(11.4, 5.5, 0.9, 1.3, 0.02, '#5a5a60', 'magnifier_arm', verts=5)
k.cyl(11.4, 5.7, 1.3, 1.33, 0.16, '#3a3a40', 'magnifier', verts=14)
k.cyl(11.4, 5.7, 1.29, 1.3, 0.13, '#5a8080', 'magnifier_glass', emit=('#c0fff0', 0.3), verts=14)
k.point_light(11.4, 5.9, 1.2, '#e8fff0', 8, radius=0.1, group='flicker')
k.box(12.2, 5.4, 0.9, 13.0, 5.8, 1.0, '#2a2a30', 'iron_stand')
k.tube((12.4, 5.6, 1.0), (12.9, 5.7, 1.1), 0.012, '#c8c8d0', 'soldering_iron', verts=4)
k.box(13.3, 5.3, 0.9, 14.4, 5.9, 1.02, ('#1e6a3a', 0.15), 'circuit')
dr.vent(12.9, 5.7, 1.15)
Y.work_lamp(k, 14.2, 5.2, z=0.9)
k.solid(10.8, 5.2, 14.6, 6.0)
k.box(11.0, 8.4, 0.0, 14.8, 9.6, 0.5, ('#4a5a5a', 0.1), 'cot', bevel=0.03)
k.box(11.1, 8.5, 0.5, 14.7, 9.5, 0.6, ('#c8c8c0', 0.2), 'cot_sheet', bevel=0.03)
Y.curtain(k, 10.6, 13.4, 8.2, h=2.0, col='#7aa898')
k.solid(10.6, 8.2, 14.8, 9.6)
# a mop, a bin of swabs, a stain on the tiles
k.cyl(1.8, 10.6, 0.0, 0.5, 0.2, ('#e8e8e0', 0.08), 'bin', verts=10)
k.solid(1.6, 10.4, 2.0, 10.8)
k.cyl(5.8, 8.6, 0.0, 0.002, 0.4, ('#5a2a24', 0.25), 'floor_stain', verts=12, ry=0.2)
U.fluoro(k, dr, 3.0, 4.6, 2.8, w=1.4, energy=20)
U.fluoro(k, dr, 12.6, 4.4, 2.8, w=1.4, energy=18, dead=True)

k.point_light(8.0, 9.0, 2.6, GRN, 20, radius=0.5, group='flicker')
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.78}}, light_samples=128, world_light=('#1e2a26', 0.6))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': "Sallow's Chrome", 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [8, 11]}, 'shipExit': False, 'interior': True})


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': x, 'y': 12, 'type': 'leave_world', 'label': 'THE WARRENS', 'prompt': 'PRESS E TO GO OUT', 'leaveTo': 'arcadia-undercity', 'leaveSpawn': [35, 10]}
    for x in (7, 8)] + [
    {'x': 6, 'y': 7, 'type': 'implants', 'shop': 'street', 'label': 'THE CHAIR', 'prompt': 'PRESS E FOR CHROME'},
    {'x': 7, 'y': 5, 'type': 'dialog', 'label': 'DOC SALLOW', 'prompt': 'PRESS E TO TALK', 'dialog': 'SALLOW LOOKS AT YOU OVER HIS GOGGLES.'},
    {'x': 12, 'y': 5, 'type': 'dialog', 'label': 'PARTS BIN', 'prompt': 'PRESS E TO BUY', 'dialog': 'PARTS.'},
    look(3, 3, 'WALL OF PARTS', 'ARMS ON HOOKS, LEGS IN A RACK, A SPINE IN A GLASS CASE. EVERY ONE HAS A TAG WITH A NUMBER AND NO NAME.'),
    look(7, 3, 'JARS', 'EYES IN JARS. BLUE, BROWN, GREEN, ONE THAT GLOWS. THEY ALL TURN, VERY SLIGHTLY, TO FOLLOW YOU.'),
    look(12, 8, 'COT', 'A COT BEHIND A CURTAIN, A BLANKET FOLDED ON IT. "FOR AFTERWARDS," SAYS SALLOW. "MOST PEOPLE NEED AN AFTERWARDS."'),
    look(10, 3, 'FRIDGE', 'A FRIDGE WITH A BIOHAZARD STICKER AND, UNDER IT, A SMALLER STICKER: "SALLOW\'S LUNCH. DO NOT."'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(7, 5, 8, 6)
apply_world(WORLD, k, (1, 3, COLS - 2, 11), doors=[(7, 12), (8, 12)], scene_id=WID,
            actors=[{'sheet': 'npc-sallow', 'x': 7, 'y': 5, 'facing': 'down'}])
w = json.load(open(WORLD))
w['undercity'] = {'drips': dr.drips, 'tubes': dr.tubes, 'level': 'undercity'}
w['scene']['steam'] = dr.steam
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('chop shop done', len(k.parts), 'parts')
