"""The Pit — fights and a bar in the Warrens (Blender scene).

  BVENV/bin/python tools/bridge-art/scenes/arcadia_pit.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/arcadia-pit

An old pump hall: in the middle the pit, a ring of sand inside a chain-link cage with a gate, lit hard from above by a
square of lamps; round it a rail the crowd leans on, steel bleachers up the sides, the bar along the back with fight
bills over it and the bell, Tally's book in a barred booth, a medic's corner with a stretcher and a bucket. Red, and a
hard white over the sand. World: arcadia-pit, 36 x 24. Its block `ring` tells js/undercity.js where the cage is.
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
WID = 'arcadia-pit'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 36, 24
R0, R1 = 3.0, 22.6
H = 4.6
RED = '#ff3040'
RING = (12.0, 9.0, 24.0, 17.0)          # the cage: x 12..24, rows 9..17 (inside walkable)

k = Kit(COLS, ROWS, margin_top=0.6, margin_bottom=0.5, seed=2525)
dr = U.Drips()
rng = k.rng
U.room(k, dr, 0.6, R0, COLS - 0.6, R1, H, door=(16.4, 19.6), floor='concrete', wall='#2a2222', clad='brick', rng=rng)

# ---- the bar along the back, the bell, the bills ------------------------------------------------------------------------------
k.box(4.0, R0 + 0.02, 1.0, 22.0, R0 + 0.35, 2.4, ('#1a1210', 0.06), 'bottle_wall')
for shelf in (1.35, 1.85):
    k.box(4.0, R0 + 0.05, shelf - 0.04, 22.0, R0 + 0.45, shelf, '#4a3020', 'shelf')
    for i in range(80):
        col = rng.choice(('#8a5a1a', '#5a2a1a', '#c8c8a0', '#3a6a3a'))
        k.cyl(4.15 + i * 0.22, R0 + 0.28, shelf, shelf + rng.uniform(0.2, 0.34), 0.05, shade(col, 0.55), 'bottle', emit=(col, 0.6), verts=6)
k.box(3.8, R0 + 1.3, 0.0, 22.2, R0 + 1.9, 1.0, ('#3a2a20', 0.12), 'bar_counter', bevel=0.02)
k.box(3.75, R0 + 1.25, 1.0, 22.25, R0 + 1.95, 1.06, ('#5a3a24', 0.15), 'bar_top')
k.box(3.8, R0 + 1.9, 0.08, 22.2, R0 + 1.92, 0.13, '#1a0606', 'bar_led', emit=(RED, 0.7))
for x in [4.6 + i * 1.2 for i in range(15)]:
    Y.neon_stool(k, x, R0 + 2.45, seat='#5a1a1a')
k.solid(3.8, R0, 22.2, R0 + 1.9)
k.box(12.6, R0 + 0.02, 2.55, 13.4, R0 + 0.2, 2.6, '#3a3a40', 'bell_bracket')                  # the bell
k.cyl(13.0, R0 + 0.35, 2.15, 2.55, 0.22, ('#c89030', 0.06), 'bell', verts=14)
for i, x in enumerate((5.0, 6.6, 8.2, 16.4, 18.0, 19.6)):                                   # fight bills
    col = ('#e8d8b8', '#c83030', '#e8c040')[i % 3]
    k.box(x, R0 + 0.01, 2.6, x + 1.2, R0 + 0.03, 3.6, (col, 0.25), 'poster')
    k.box(x + 0.1, R0 + 0.03, 3.3, x + 1.1, R0 + 0.04, 3.5, '#1a0a0a', 'poster_ink')
    k.box(x + 0.15, R0 + 0.03, 2.75, x + 0.55, R0 + 0.04, 3.2, shade(col, 0.5), 'poster_ink')
    k.box(x + 0.65, R0 + 0.03, 2.75, x + 1.05, R0 + 0.04, 3.2, shade(col, 0.5), 'poster_ink')
S.letters(k, 'THE PIT', 'Bungee', 13.0, R0 + 0.02, 3.75, size=0.55, col=RED, energy=14)

# ---- Tally's book: a barred booth in the corner, the chalkboard over it ---------------------------------------------------------
k.box(24.4, R0 + 0.02, 0.0, 29.0, R0 + 1.6, 2.4, ('#3a3036', 0.1), 'booth', bevel=0.02)
k.box(24.8, R0 + 1.6, 0.9, 28.6, R0 + 1.62, 1.8, shade('#ffd080', 0.35), 'booth_window', emit=('#ffd080', 0.6))
k.boxes([(24.9 + i * 0.14, R0 + 1.62, 0.9, 24.92 + i * 0.14, R0 + 1.66, 1.8) for i in range(27)], '#3a3842', 'window_bars')
k.box(24.6, R0 + 1.6, 0.85, 28.8, R0 + 2.0, 0.92, '#4a3a30', 'booth_sill')
k.box(24.6, R0 + 0.02, 2.5, 28.8, R0 + 0.1, 3.6, '#14201a', 'chalkboard')
for j in range(5):
    k.box(24.8, R0 + 0.1, 2.65 + j * 0.18, 24.8 + rng.uniform(2.0, 3.8), R0 + 0.11, 2.7 + j * 0.18, '#d8d8c8', 'chalk')
S.lightbox(k, 'BOOK', 'RussoOne', 26.7, R0 + 1.6, 1.95, 1.4, 0.3, bg='#ffe0a0', ink='#5a1010', size=0.22, energy=3)
k.solid(24.4, R0, 29.0, R0 + 2.0)

# ---- the pit: sand, the cage, the gate, the lamps over it -----------------------------------------------------------------------
x0, r0, x1, r1 = RING
k.box(x0, r0, -0.02, x1, r1, 0.01, ('#8a7a5a', 0.3), 'floor_sand')
for _ in range(14):                                                              # scuffs where they've fought
    cx, cr = rng.uniform(x0 + 1, x1 - 1), rng.uniform(r0 + 1, r1 - 1)
    k.cyl(cx, cr, 0.01, 0.012, rng.uniform(0.15, 0.4), ('#7e6e50', 0.3), 'floor_sand_dark', verts=12, ry=rng.uniform(0.08, 0.16))
for (a, b) in ((0, 1), (1, 2), (2, 3), (3, 0)):
    p = [(x0, r0), (x1, r0), (x1, r1), (x0, r1)]
    gap = (5.0, 7.0) if (a, b) == (2, 3) else None                               # the gate on the near side, toward the door
    if gap:
        U.chainlink(k, p[b][0], p[b][1], p[a][0], p[a][1], h=2.0, gap=(5.0, 7.0), wire=False, col='#9a9aa4')
    else:
        U.chainlink(k, p[a][0], p[a][1], p[b][0], p[b][1], h=2.0, wire=False, col='#9a9aa4')
k.box(x0 - 0.1, r0 - 0.1, 0.0, x1 + 0.1, r0 + 0.05, 0.18, '#3a3a40', 'cage_kerb')
k.box(x0 - 0.1, r1 - 0.05, 0.0, x0 + 5.0, r1 + 0.1, 0.18, '#3a3a40', 'cage_kerb')
k.box(x0 + 7.0, r1 - 0.05, 0.0, x1 + 0.1, r1 + 0.1, 0.18, '#3a3a40', 'cage_kerb')
for (a0, a1) in ((r0, r1),):
    k.box(x0 - 0.1, a0, 0.0, x0 + 0.05, a1, 0.18, '#3a3a40', 'cage_kerb')
    k.box(x1 - 0.05, a0, 0.0, x1 + 0.1, a1, 0.18, '#3a3a40', 'cage_kerb')
for c in range(int(x0), int(x1)):                                                # the cage walls block, the gate doesn't
    k.solid(c + 0.05, r0 - 0.2, c + 0.95, r0 + 0.1)
    if not (x0 + 5.0 <= c + 0.5 <= x0 + 7.0):
        k.solid(c + 0.05, r1 - 0.95, c + 0.95, r1 - 0.1)
for r in range(int(r0), int(r1)):
    k.solid(x0 - 0.1, r + 0.05, x0 + 0.1, r + 0.95)
    k.solid(x1 - 0.1, r + 0.05, x1 + 0.1, r + 0.95)
for (x, r) in ((x0 + 2, r0 + 2), (x1 - 2, r0 + 2), (x0 + 2, r1 - 2), (x1 - 2, r1 - 2)):             # the square of lamps over it
    k.tube((x, r, 3.5), (x, r, H + 1.0), 0.01, '#14121a', 'lamp_wire', verts=3)
    k.cyl(x, r, 3.42, 3.56, 0.2, '#8a8a92', 'lamp_shade', verts=12)
    k.cyl(x, r, 3.56, 3.58, 0.21, '#5a5a50', 'lamp_rim', emit=('#fff8e0', 0.8), verts=12)
    k.point_light(x, r, 3.1, '#fff4e0', 60, radius=0.4, group='flicker')
for (x, r) in ((x0 + 0.5, r0 + 0.3), (x1 - 0.5, r1 - 0.3)):                     # the corner stools and buckets
    k.cyl(x, r + (0.4 if r < 12 else -0.4), 0.0, 0.3, 0.16, ('#5a6a7a', 0.1), 'bucket', verts=10)

# ---- the rail round the pit, the bleachers up the sides -------------------------------------------------------------------------
def bleachers(xa, xb, ra, rb, steps=4):
    for i in range(steps):
        r = ra + i * (rb - ra) / steps
        z = 0.35 + i * 0.4
        k.box(xa, r, 0.0, xb, r + (rb - ra) / steps, z, ('#3a3a42', 0.08), 'bleacher')
        k.box(xa, r, z, xb, r + (rb - ra) / steps * 0.5, z + 0.04, ('#5a5a62', 0.08), 'bleacher_seat')
    k.solid(xa, ra, xb, rb)


bleachers(2.0, 9.4, 8.6, 12.2)          # west, rising toward the back wall... seen from the camera they step up away from you
bleachers(26.6, 34.0, 8.6, 12.2)
bleachers(2.0, 9.4, 14.4, 18.0)
bleachers(26.6, 34.0, 14.4, 18.0)
for (xa, xb, r) in ((x0 - 1.2, x1 + 1.2, r0 - 1.2), (x0 - 1.2, x0 + 4.0, r1 + 1.2), (x0 + 8.0, x1 + 1.2, r1 + 1.2)):
    k.tube((xa, r, 0.95), (xb, r, 0.95), 0.03, '#7a7a80', 'rail', verts=6)
    for x in [xa + i * 1.4 for i in range(int((xb - xa) / 1.4) + 1)]:
        k.cyl(x, r, 0.0, 0.95, 0.03, '#5a5a60', 'rail_post', verts=5)
        k.solid_post(x, r)

# ---- the medic's corner, crates, a drum fire by the door ------------------------------------------------------------------------
k.box(30.0, 18.6, 0.0, 33.6, 19.6, 0.55, ('#6a6a5a', 0.1), 'stretcher', bevel=0.02)
k.box(30.1, 18.7, 0.55, 33.5, 19.5, 0.6, ('#c8c8c0', 0.2), 'stretcher_canvas')
k.box(31.0, 18.8, 0.6, 32.0, 19.4, 0.66, '#8a2a2a', 'stain')
k.cyl(29.4, 19.0, 0.0, 0.35, 0.18, ('#5a6a7a', 0.1), 'bucket', verts=10)
k.box(33.0, 17.0, 0.0, 33.8, 17.6, 0.6, '#e8e8e0', 'first_aid')
k.box(33.25, 17.6, 0.2, 33.55, 17.61, 0.45, '#c83030', 'first_aid_cross')
k.solid(29.2, 17.0, 33.8, 19.6)
U.crates(k, 2.2, 19.6, n=3, rng=rng)
U.drum_fire(k, 14.0, 20.4, energy=18)
U.drum_fire(k, 22.0, 20.4, energy=18)
U.fluoro(k, dr, 5.0, 6.2, 3.2, w=1.4, hang=H + 0.4, energy=20)
U.fluoro(k, dr, 31.0, 6.2, 3.2, w=1.4, hang=H + 0.4, energy=20)
U.fluoro(k, dr, 6.0, 20.6, 3.0, w=1.2, hang=H + 0.4, energy=16, dead=True)
U.fluoro(k, dr, 30.0, 20.6, 3.0, w=1.2, hang=H + 0.4, energy=16)
dr.drip(28.0, 13.0, H + 1.0)
U.puddles(k, 27.5, 12.6, 28.5, 13.4, 1, ('#a0c0e0',), rng=rng)

k.area_light(18, 13, 6.0, '#c06050', 110, 26.0, rot=(math.radians(30), 0, 0))
for x in (6.0, 13.0, 20.0):                                                      # the bar's own light
    k.point_light(x, R0 + 2.2, 2.4, '#ffb070', 30, radius=0.5, group='flicker')
for (x, r) in ((5.7, 10.4), (30.3, 10.4), (5.7, 16.2), (30.3, 16.2)):           # and over the bleachers
    k.point_light(x, r, 3.4, '#ff8070', 22, radius=0.6, group='flicker')
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.8}}, light_samples=96, world_light=('#3a2a2c', 1.3))

w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Pit', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'arcadia',
          'spawns': {'player': [17, 22]}, 'shipExit': False, 'interior': True})


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w['interactions'] = [
    {'x': x, 'y': 23, 'type': 'leave_world', 'label': 'THE WARRENS', 'prompt': 'PRESS E TO GO OUT', 'leaveTo': 'arcadia-undercity', 'leaveSpawn': [59, 10]}
    for x in (16, 17, 18, 19)] + [
    {'x': 18, 'y': 18, 'type': 'under', 'act': 'ring', 'label': 'THE CAGE', 'prompt': 'PRESS E TO FIGHT'},
    {'x': 26, 'y': 5, 'type': 'under', 'act': 'bets', 'label': 'THE BOOK', 'prompt': 'PRESS E TO BET'},
    {'x': 27, 'y': 4, 'type': 'dialog', 'label': 'TALLY', 'prompt': 'PRESS E TO TALK', 'dialog': 'TALLY CHALKS UP THE ODDS.'},
    {'x': 9, 'y': 4, 'type': 'dialog', 'label': 'PIT BAR', 'prompt': 'PRESS E TO ORDER', 'dialog': 'DRINKS.'},
    look(14, 4, 'BELL', 'THE BELL THAT STARTS EVERY BOUT, DENTED WHERE THE HAMMER HITS IT. SOMEONE HAS SCRATCHED A NAME BESIDE EACH DENT.'),
    look(31, 18, 'STRETCHER', 'A STRETCHER WITH A STAIN ON IT, A BUCKET, A FIRST AID BOX. "IT\'S FOR AFTER," SAYS THE MAN BESIDE IT. "MOSTLY IT\'S FOR AFTER."'),
    look(6, 5, 'FIGHT BILLS', 'TONIGHT: IRON MAE v THE DEACON. RUST-EYE v WHOEVER\'S DAFT ENOUGH. AND IN SMALL LETTERS AT THE BOTTOM: OPEN CAGE - ANYONE - 20 TO GET IN.'),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
k.solid(27, 4, 28, 5)
apply_world(WORLD, k, (1, 4, COLS - 2, 22), doors=[(16, 23), (17, 23), (18, 23), (19, 23)], scene_id=WID,
            actors=[{'sheet': 'npc-bookie', 'x': 27, 'y': 4, 'facing': 'down'}, {'sheet': 'npc-bouncer', 'x': 10, 'y': 3, 'facing': 'down'}])
w = json.load(open(WORLD))
w['undercity'] = {'drips': dr.drips, 'tubes': dr.tubes, 'level': 'undercity',
                  'ring': {'rect': [int(x0), int(r0), int(x1) - 1, int(r1) - 1], 'spawn': [18, 16],
                           'foes': [[14, 10], [21, 10], [18, 10], [14, 13], [21, 13]]}}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('the pit done', len(k.parts), 'parts')
