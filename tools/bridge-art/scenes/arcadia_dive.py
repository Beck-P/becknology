"""The Drip — a dive bar in the Warrens (Blender scene).

  BVENV/bin/python tools/bridge-art/scenes/arcadia_dive.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-dive

Low, brown and blue: a long bar down the back under a lit wall of bottles, Nell behind it, stools with the stuffing
out, a pool table under a green lamp, booths in cracked red vinyl along the side, a jukebox glowing in the corner, a
dartboard, a bucket catching the drip that gives the place its name, beer signs in the window. World: arcadia-dive, 20 x 15.
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
WID = 'arcadia-dive'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 20, 15
R0, R1 = 2.6, 13.6
H = 3.4
BLUE = '#5aa0ff'

k = Kit(COLS, ROWS, margin_top=0.8, margin_bottom=0.5, seed=8181)
dr = U.Drips()
rng = k.rng
U.room(k, dr, 0.6, R0, COLS - 0.6, R1, H, door=(8.4, 10.6), floor='tile', wall='#2c2224', clad='brick', rng=rng,
       tones=('#3a2e28', '#2e2420'))

# ---- the bar along the back -------------------------------------------------------------------------------------------------
k.box(1.2, R0 + 0.05, 1.0, 12.8, R0 + 0.35, 2.6, ('#1a1210', 0.06), 'bottle_wall')
for shelf in (1.3, 1.75, 2.2):
    k.box(1.2, R0 + 0.05, shelf - 0.04, 12.8, R0 + 0.45, shelf, '#5a3a20', 'shelf')
    for i in range(54):
        x = 1.35 + i * 0.21
        col = rng.choice(('#3a8a3a', '#8a5a1a', '#c8c8a0', '#5a2a1a', '#2a5a8a', '#a03030'))
        hgt = rng.uniform(0.2, 0.36)
        k.cyl(x, R0 + 0.28, shelf, shelf + hgt, 0.05, shade(col, 0.55), 'bottle', emit=(col, 0.65), verts=6)
for shelf in (1.0, 1.45, 1.9):                                                  # light strips under each shelf
    k.box(1.2, R0 + 0.36, shelf - 0.06, 12.8, R0 + 0.38, shelf - 0.03, '#0a0a10', 'shelf_led', emit=(BLUE, 0.9))
k.point_light(7.0, R0 + 0.8, 1.6, BLUE, 40, radius=1.5, group='flicker')
k.tube((1.0, R0 + 1.6, 2.6), (13.0, R0 + 1.6, 2.6), 0.008, '#14121a', 'bulb_line', verts=3)
for x in [1.6 + i * 1.3 for i in range(9)]:
    U.caged_bulb(k, x, R0 + 1.6, 2.2, col='#ffc070', energy=10, wire_to=2.6)
k.box(4.6, R0 + 0.02, 2.62, 6.2, R0 + 0.12, 3.3, '#141418', 'tv')                       # a TV on the wall: the Pit, live
k.box(4.66, R0 + 0.12, 2.68, 6.14, R0 + 0.13, 3.24, '#2a0a0a', 'tv_screen', emit=('#ff8060', 0.7))
k.box(5.2, R0 + 0.131, 2.8, 5.6, R0 + 0.135, 3.1, '#e8d8b0', 'tv_fighter')
for i, x in enumerate((13.6, 14.6, 15.6, 17.0, 18.0)):                            # posters, bills and a dartboard league
    col = ('#e8d8b8', '#c83030', '#e8c040', '#3a6ad0', '#e8d8b8')[i]
    k.box(x, R0 + 0.01, 2.0 + (i % 2) * 0.3, x + 0.7, R0 + 0.02, 2.9 + (i % 2) * 0.3, (col, 0.25), 'poster')
    k.box(x + 0.1, R0 + 0.02, 2.5 + (i % 2) * 0.3, x + 0.6, R0 + 0.025, 2.75 + (i % 2) * 0.3, shade(col, 0.4), 'poster_ink')
k.box(13.0, R0 + 0.02, 0.0, 13.9, R0 + 0.6, 1.7, ('#7a1a1a', 0.1), 'cig_machine', bevel=0.02)       # a cigarette machine
k.box(13.08, R0 + 0.6, 0.9, 13.82, R0 + 0.61, 1.6, '#1a0a08', 'cig_machine_front', emit=('#ffd080', 0.45))
k.solid(13.0, R0, 13.9, R0 + 0.6)
k.box(1.0, R0 + 1.4, 0.0, 13.0, R0 + 2.0, 1.0, ('#4a2a18', 0.12), 'bar_counter', bevel=0.02)
k.box(0.95, R0 + 1.35, 1.0, 13.05, R0 + 2.05, 1.07, ('#6a4426', 0.15), 'bar_top')
k.box(1.0, R0 + 2.0, 0.1, 13.0, R0 + 2.02, 0.15, '#0a0a10', 'bar_rail', emit=(BLUE, 0.5))
for x in (2.2, 5.4, 9.0):                                                      # taps
    for j in range(3):
        k.cyl(x + j * 0.18, R0 + 1.55, 1.07, 1.4, 0.025, '#c8c8d0', 'tap', verts=6)
        k.box(x + j * 0.18 - 0.04, R0 + 1.5, 1.3, x + j * 0.18 + 0.04, R0 + 1.6, 1.46, rng.choice(('#c03030', '#e8c040', '#3a3a3a')), 'tap_handle')
for x in (3.0, 4.2, 7.2, 10.8, 12.2):
    k.cyl(x, R0 + 1.7, 1.07, 1.3, 0.06, '#c89030', 'pint', emit=('#e0a030', 0.15), verts=8)
k.box(11.6, R0 + 1.45, 1.07, 12.4, R0 + 1.9, 1.35, '#141418', 'till')
k.box(11.65, R0 + 1.9, 1.15, 12.35, R0 + 1.91, 1.32, '#0c1a10', 'till_screen', emit=('#60ff90', 0.6))
for i, x in enumerate([1.6 + j * 1.15 for j in range(10)]):                     # stools, some torn
    Y.neon_stool(k, x, R0 + 2.55, seat='#8a2a2a' if i % 3 else '#5a2a2a')
S.neon(k, 'THE DRIP', 'Righteous', 9.4, R0 + 0.02, 2.6, size=0.55, col=BLUE, board='#0a0a14', energy=16)
k.solid(1.0, R0, 13.0, R0 + 2.0)

# ---- booths along the right, the pool table, the jukebox, the dartboard ------------------------------------------------------
for i, r in enumerate((3.2, 6.0, 8.8)):
    rb = r
    k.box(14.6, rb, 0.0, 18.8, rb + 0.4, 1.1, ('#7a1a1a', 0.12), 'booth_back', bevel=0.04)
    k.box(14.6, rb + 0.4, 0.0, 18.8, rb + 0.9, 0.45, ('#8a2222', 0.15), 'booth_seat', bevel=0.04)
    for j in range(4):                                                          # buttoned cushions
        k.box(14.7 + j * 1.03, rb + 0.42, 0.45, 15.68 + j * 1.03, rb + 0.88, 0.5, ('#9a2828', 0.15), 'cushion', bevel=0.03)
        k.sphere(15.2 + j * 1.03, rb + 0.2, 0.75, 0.025, 0.025, '#4a0a0a', 'button', segs=5)
    k.box(15.2, rb + 1.1, 0.7, 18.2, rb + 1.7, 0.76, ('#3a2a20', 0.1), 'booth_table')
    k.box(16.6, rb + 1.3, 0.0, 16.8, rb + 1.5, 0.7, '#2a2a2e', 'table_post')
    k.cyl(15.8, rb + 1.4, 0.76, 0.98, 0.06, '#c89030', 'pint', verts=8)
    if i == 1:                                                                   # a split in the vinyl, stuffing showing
        k.box(16.0, rb + 0.88, 0.3, 16.6, rb + 0.91, 0.42, '#e8e0c8', 'stuffing')
    k.cyl(16.7, rb + 1.4, 2.4, 2.5, 0.14, '#1a1a20', 'lamp_shade', verts=10)
    k.tube((16.7, rb + 1.4, 2.5), (16.7, rb + 1.4, H), 0.008, '#14121a', 'lamp_wire', verts=3)
    k.sphere(16.7, rb + 1.4, 2.38, 0.05, 0.05, '#ffb050', 'bulb', emit=('#ffb050', 1.0), segs=6)
    k.point_light(16.7, rb + 1.5, 2.2, '#ffb060', 30, radius=0.12, group='flicker')
    k.solid(14.6, rb, 18.8, rb + 1.7)
# the pool table under its lamp
k.box(4.4, 7.0, 0.0, 8.8, 9.4, 0.7, ('#3a2416', 0.12), 'pool_table', bevel=0.03)
k.box(4.6, 7.2, 0.7, 8.6, 9.2, 0.74, ('#1e5a34', 0.25), 'baize')
k.box(4.4, 7.0, 0.7, 8.8, 7.2, 0.8, '#4a2a18', 'cushion'); k.box(4.4, 9.2, 0.7, 8.8, 9.4, 0.8, '#4a2a18', 'cushion')
k.box(4.4, 7.0, 0.7, 4.6, 9.4, 0.8, '#4a2a18', 'cushion'); k.box(8.6, 7.0, 0.7, 8.8, 9.4, 0.8, '#4a2a18', 'cushion')
for (x, r, c) in ((5.4, 7.8, '#e8e8e0'), (6.6, 8.4, '#c03030'), (6.9, 8.2, '#e8c040'), (7.1, 8.5, '#2a4ad0'), (7.0, 8.75, '#1a1a1a'), (7.8, 7.6, '#a040a0')):
    k.sphere(x, r, 0.79, 0.06, 0.06, c, 'pool_ball', segs=8)
k.tube((5.0, 9.0, 0.8), (7.4, 8.0, 0.86), 0.015, '#c8a060', 'cue', verts=4)
k.box(5.4, 7.9, 2.3, 7.8, 8.5, 2.45, ('#1a4a2a', 0.1), 'pool_lamp')
k.box(5.5, 8.0, 2.29, 7.7, 8.4, 2.3, '#3a2a10', 'pool_lamp_glow', emit=('#fff0c0', 0.9))
k.point_light(6.6, 8.2, 2.1, '#fff0c8', 40, radius=0.5, group='flicker')
k.solid(4.4, 7.0, 8.8, 9.4)
k.box(1.0, 10.6, 0.0, 2.0, 11.4, 1.7, ('#3a1a3a', 0.08), 'jukebox', bevel=0.08)       # the jukebox
k.box(1.1, 11.4, 0.4, 1.9, 11.42, 1.5, '#200818', 'jukebox_face', emit=('#ff60c0', 0.7))
k.cyl_y(1.5, 11.38, 11.44, 1.4, 0.38, 0.38, '#2a0a2a', 'jukebox_arch', emit=('#ffb040', 0.6), verts=16)
k.point_light(1.5, 11.9, 1.0, '#ff60c0', 14, radius=0.3, group='flicker')
k.solid(1.0, 10.6, 2.0, 11.4)
k.cyl_y(13.8, R0 - 0.02, R0 + 0.04, 1.75, 0.3, 0.3, '#1a1a14', 'dartboard', verts=16)
for rad, col in ((0.24, '#c83030'), (0.16, '#1a1a14'), (0.08, '#2a8a3a'), (0.03, '#c83030')):
    k.cyl_y(13.8, R0 + 0.04, R0 + 0.05, 1.75, rad, rad, col, 'dartboard', verts=16)
# the drip: a bucket under a leak in the corner, a wet patch, the stream from the dark
k.cyl(11.6, 11.6, 0.0, 0.32, 0.18, ('#5a6a7a', 0.1), 'bucket', verts=10)
k.cyl(11.6, 11.6, 0.3, 0.31, 0.16, '#0a1820', 'bucket_water', emit=('#4080c0', 0.25), verts=10)
k.solid(11.4, 11.4, 11.8, 11.8)
dr.drip(11.6, 11.6, H + 1.0)
U.puddles(k, 10.6, 11.0, 12.6, 12.6, 1, (BLUE,), rng=rng)
# beer signs in the front windows (seen from inside: their backs glow on the floor)
S.neon(k, 'OPEN', 'Bungee', 4.0, R1 - 0.1, 0.2, size=0.18, col='#ff4060', energy=4)

# ---- light: low and blue, warm over the tables ---------------------------------------------------------------------------------
for (x, r, z, col, e) in ((4.0, 4.6, 2.8, '#ffb060', 45), (10.0, 4.6, 2.8, '#ffb060', 45), (7.0, 3.2, 2.6, BLUE, 40), (10.0, 11.0, 2.8, '#8090c0', 35),
                          (3.0, 11.5, 2.6, '#ff60c0', 20)):
    k.point_light(x, r, z, col, e, radius=0.4, group='flicker')
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.8}}, light_samples=128, world_light=('#3a2a2c', 1.2))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Drip', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [9, 13]}, 'shipExit': False, 'interior': True})


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': x, 'y': 14, 'type': 'leave_world', 'label': 'THE WARRENS', 'prompt': 'PRESS E TO GO OUT', 'leaveTo': 'arcadia-undercity', 'leaveSpawn': [28, 10]}
    for x in (9, 10)] + [
    {'x': 4, 'y': 4, 'type': 'dialog', 'label': 'DRIP BAR', 'prompt': 'PRESS E TO ORDER', 'dialog': 'DRINKS.'},
    {'x': 12, 'y': 4, 'type': 'dialog', 'label': 'NELL', 'prompt': 'PRESS E TO TALK', 'dialog': 'NELL SLIDES YOU A COASTER.'},
    look(6, 8, 'POOL TABLE', 'THE BAIZE HAS A CIGARETTE BURN WHERE THE BLACK SHOULD GO AND A DIP THE BALLS ROLL INTO. EVERYONE WHO PLAYS HERE KNOWS ABOUT IT. YOU DON\'T.'),
    look(1, 10, 'JUKEBOX', 'A JUKEBOX FULL OF SONGS FROM UP TOP, TWENTY YEARS OUT OF DATE. SOMEONE HAS PUT ON THE SAME SAD ONE FOUR TIMES IN A ROW.'),
    look(13, 3, 'DARTBOARD', 'A DARTBOARD WITH A PHOTO PINNED TO THE BULL: A MAN IN A HALCYON SUIT. IT HAS TAKEN A LOT OF DARTS.'),
    look(11, 11, 'BUCKET', 'A BUCKET UNDER A LEAK IN THE CEILING, CATCHING THE DRIP THAT GIVES THE PLACE ITS NAME. NELL EMPTIES IT INTO THE MOP SINK EVERY HOUR. SOME SAY INTO THE LAGER.'),
    look(16, 5, 'BOOTH', 'TWO DOCKERS ARGUING ABOUT A FIGHT IN THE PIT LAST NIGHT. "HE WENT DOWN IN THE SECOND." "HE WAS PAID TO." "EVERYONE\'S PAID TO."'),
    look(16, 10, 'BOOTH', 'A WOMAN WITH A CHROME JAW ASLEEP IN THE BOOTH, A DRINK GOING WARM IN FRONT OF HER.'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
ACT = [{'sheet': 'npc-nell', 'x': 12, 'y': 3, 'facing': 'down'}]
apply_world(WORLD, k, (1, 3, COLS - 2, 13), doors=[(9, 14), (10, 14)], scene_id=WID, actors=ACT)
w = json.load(open(WORLD))
w['undercity'] = {'drips': dr.drips, 'tubes': dr.tubes, 'level': 'undercity'}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('the drip done', len(k.parts), 'parts')
