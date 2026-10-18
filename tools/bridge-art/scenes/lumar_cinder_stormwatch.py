"""The stormwatch on Cinder Key — Old Wick's tower on the east headland (world id "lumar-cinder-stormwatch").

  BVENV/bin/python tools/bridge-art/scenes/lumar_cinder_stormwatch.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-cinder-stormwatch

A round room of whitewashed stone (the octagon kit, rough and limed): the barometer board on the back wall — a tall
mercury glass, a dial, Wick's slate of chalk (`stormwatch`, js/crimson.js: the weather coming, the squalls on the
Crimson, the storm cones; he sells storm glasses) — a shelf of storm glasses clouding in a row, the logbooks of forty
years, a chart of the five seas with the squalls pencilled on it, the signal lamp and the flag locker, the ladder up
to the roof where the cups turn, a stove and a kettle, Wick's chair by the window with a spyglass on the sill.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, THETA, apply_world, shade  # noqa: E402
import assets_light as L                               # noqa: E402
import assets_lumar as A                               # noqa: E402
import assets_magic as M                               # noqa: E402

OUT = sys.argv[1]
WID = 'lumar-cinder-stormwatch'
WORLD = os.path.join(ROOT := os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')), 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
BRASS = '#c8a040'

H = 2.6 / math.cos(THETA)
k = Kit(12, 13, margin_top=1.0, margin_bottom=0.5, seed=9124)
rng = k.rng
P, C = M.octagon_room(k, 2, 2, 10, 11, 2, H, door=(5.0, 7.0), stone='#b8aca0', floor_tone='#5a5050')

# ---- the back wall: the barometer board -----------------------------------------------------------------------------------
BX = 6.0
k.box(BX - 1.3, 1.98, 0.7, BX + 1.3, 2.06, 2.55, ('#3a2416', 0.12), 'board')
k.box(BX - 1.22, 2.06, 0.78, BX + 1.22, 2.08, 2.47, ('#5a3a24', 0.14), 'board_face')
k.cyl(BX - 0.85, 2.12, 0.95, 2.35, 0.03, ('#d8e0e8', 0.05), 'barometer_tube', verts=8)     # the mercury glass
k.cyl(BX - 0.85, 2.12, 0.95, 1.78, 0.022, '#8a8a98', 'mercury', emit=('#b0b0c0', 0.3), verts=8)
k.cyl(BX - 0.85, 2.12, 0.86, 0.96, 0.07, (BRASS, 0.2), 'barometer_cistern', verts=10)
for i in range(8):
    z = 1.2 + i * 0.14
    k.box(BX - 0.78, 2.08, z, BX - 0.66 - (0.06 if i % 2 else 0), 2.09, z + 0.012, '#e8e0c8', 'scale_tick')
k.cyl_y(BX, 2.07, 2.12, 1.95, 0.32, 0.32, (BRASS, 0.2), 'dial_rim', verts=20)                # the dial: RAIN / CHANGE / FAIR
k.cyl_y(BX, 2.1, 2.13, 1.95, 0.27, 0.27, '#ece4cc', 'dial_face', verts=20)
k.tube((BX, 2.14, 1.95), (BX - 0.16, 2.14, 2.1), 0.012, '#1a1a1a', 'dial_needle', verts=4)
k.box(BX + 0.45, 2.08, 1.0, BX + 1.12, 2.1, 2.3, ('#2a2e2a', 0.12), 'slate')                 # Wick's slate, chalked
for i in range(7):
    z = 2.15 - i * 0.17
    k.box(BX + 0.52, 2.1, z, BX + 0.6 + rng.uniform(0.25, 0.45), 2.105, z + 0.025, '#e8e4d8', 'chalk')
k.box(BX - 1.2, 2.06, 2.62, BX + 1.2, 2.3, 2.68, ('#3a2416', 0.12), 'glass_shelf')          # storm glasses in a row
for i in range(6):
    x = BX - 1.0 + i * 0.4
    k.cyl(x, 2.18, 2.68, 3.0, 0.06, ('#c8d8e0', 0.04), 'storm_glass', verts=10)
    k.cyl(x, 2.18, 2.7, 2.7 + rng.uniform(0.06, 0.2), 0.05, '#7a8a98', 'storm_glass_cloud', verts=10)
    k.cyl(x, 2.18, 3.0, 3.04, 0.035, BRASS, 'storm_glass_cap', verts=8)
k.point_light(BX, 2.9, 1.9, '#ffd8a0', 14, radius=0.3, group='flicker')
k.solid(BX - 1.3, 2.0, BX + 1.3, 2.6)

# ---- the angled walls: windows on the sea, the chart, the logbooks ------------------------------------------------------------
M.angled_window(k, P[7], P[0], C, 0.3, 0.7, 1.05, 2.3, moon=True)
M.angled_window(k, P[1], P[2], C, 0.3, 0.7, 1.05, 2.3)
k.area_light(3.3, 3.3, 1.9, '#8090d0', 34, 1.0, rot=(math.radians(-70), 0, math.radians(45)))
k.area_light(8.7, 3.3, 1.9, '#8090d0', 28, 1.0, rot=(math.radians(-70), 0, math.radians(-45)))
M.star_banner(k, P[6], P[7], C, 0.5, 1.0, 2.1, w=0.75, col='#c8b48a')                      # the chart, squalls pencilled on it

# ---- the right: the ladder to the roof, the flag locker, the signal lamp ---------------------------------------------------------
LX, LR = 9.0, 4.2
for s in (-0.24, 0.24):
    k.tube((LX + s, LR + 0.3, 0.0), (LX + s, LR - 0.1, H + 0.2), 0.035, (A.WOOD, 0.14), 'ladder', verts=6)
z = 0.25
while z < H:
    t = z / H
    k.cyl_x(LX - 0.24, LX + 0.24, LR + 0.3 - 0.4 * t, z, 0.025, 0.025, A.WOOD_D, 'ladder_rung', verts=6)
    z += 0.3
k.box(LX - 0.5, LR - 0.5, H - 0.05, LX + 0.5, LR + 0.3, H + 0.02, '#14141c', 'hatch', emit=('#2a3050', 0.4))
k.solid(LX - 0.4, LR - 0.4, LX + 0.4, LR + 0.4)
FX0, FX1, FR = 8.6, 9.9, 6.8                                       # the flag locker: pigeonholes of rolled flags
k.box(FX0, FR - 0.25, 0.0, FX1, FR + 0.25, 1.5, ('#4a2e1c', 0.14), 'flag_locker')
for i in range(4):
    for j in range(3):
        x = FX0 + 0.12 + i * 0.3
        z = 0.2 + j * 0.42
        col = rng.choice(('#b02a22', '#e8d040', '#2a4a9a', '#e8e4d8', '#141014', '#3a8a3a'))
        k.cyl_y(x + 0.1, FR - 0.27, FR + 0.1, z + 0.15, 0.1, 0.1, (col, 0.2), 'rolled_flag', verts=8)
k.solid(FX0, FR - 0.25, FX1, FR + 0.25)
SLX, SLR = 8.9, 9.0                                                # the signal lamp on its stand
for i in range(3):
    a = math.radians(90 + i * 120)
    k.tube((SLX + math.cos(a) * 0.28, SLR + math.sin(a) * 0.28, 0.0), (SLX, SLR, 0.9), 0.025, '#2a2a30', 'lamp_leg', verts=5)
k.cyl_y(SLX, SLR - 0.25, SLR + 0.2, 1.08, 0.2, 0.2, (BRASS, 0.1), 'signal_drum', verts=14)
k.cyl_y(SLX, SLR - 0.29, SLR - 0.25, 1.08, 0.16, 0.16, '#401a10', 'signal_glass', emit=('#ff6030', 0.7), verts=14)
k.solid(SLX - 0.3, SLR - 0.3, SLX + 0.3, SLR + 0.3)

# ---- the left: the stove and kettle, Wick's chair by the window, the logbooks ----------------------------------------------------
L.iron_stove(k, 2.9, 4.9)
A.rocking_chair(k, 3.4, 6.6, tone=A.WOOD_D)
k.solid(3.0, 6.2, 3.8, 7.0)
k.solid(4, 6, 5, 7)                                  # where Wick stands
A.book_stack(k, 2.6, 7.6, n=6)
A.book_stack(k, 2.9, 8.2, n=4)
k.box(2.4, 3.3, 1.02, 3.1, 3.42, 1.06, ('#3a2416', 0.12), 'sill')
k.tube((2.5, 3.36, 1.1), (3.0, 3.36, 1.1), 0.035, (BRASS, 0.15), 'spyglass', verts=8)

# ---- the middle: Wick's table with this season's log, a lamp, a mug ------------------------------------------------------------
L.log_table(k, 5.6, 6.6)
A.stool(k, 5.6, 7.5)
k.solid(5.1, 6.1, 6.1, 7.1)
A.rug(k, 4.2, 8.2, 7.4, 10.0, col='#6a2a22', trim='#d8c8a0', pattern=True)
L.oilskins(k, 3.2, 9.0)                                            # his oilskin on its peg, rope, a barrel of lamp oil
L.oil_drums(k, 7.9, 8.9, n=2)
import assets_deck as D                                             # noqa: E402
D.coil_of_rope(k, 3.3, 9.9)
A.hanging_lamp(k, 6.0, 6.2, energy=120, visible=True)
k.point_light(6.0, 9.0, 2.4, '#c8b8e0', 22, radius=0.6)
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.74}}, light_samples=128, world_light=('#3a3448', 0.45))


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Stormwatch', 'width': 12, 'height': 13, 'tileSize': 16, 'tileset': 'lumar', 'spawns': {'player': [6, 10]},
          'shipExit': False, 'indoors': True, 'tiles': [[2] * 12 for _ in range(13)], 'collisions': [[0] * 12 for _ in range(13)]})
w['interactions'] = [
    {'x': x, 'y': 11, 'type': 'leave_world', 'leaveTo': 'lumar-cinder', 'leaveSpawn': [50, 17], 'label': 'DOOR', 'prompt': 'PRESS E TO GO OUT'}
    for x in (5, 6)] + [
    {'x': 6, 'y': 3, 'type': 'stormwatch', 'label': 'BAROMETER BOARD', 'prompt': 'PRESS E TO READ'},
    look(4, 6, 'OLD WICK', 'AN OLD MAN IN A YELLOW WAISTCOAT, A WOOLLEN CAP, A BEARD LIKE SEA FOAM. "GLASS IS FALLING. GLASS IS ALWAYS FALLING."',
         'PRESS E TO TALK'),
    look(5, 6, 'THE LOG', "THIS SEASON'S LOG, OPEN UNDER THE LAMP: THE GLASS EVERY HOUR, THE WIND, THE SQUALLS SEEN. ON EVERY THIRD "
         "PAGE: 'CRATER BRIGHT. GLASS DROPPED FOR NO REASON. SHE IS AWAKE.'", 'PRESS E TO READ'),
    look(9, 4, 'LADDER', "THE LADDER UP TO THE ROOF, WHERE THE CUPS SPIN AND THE CONES HANG. THE HATCH IS LOCKED: WICK DOESN'T LET "
         "ANYONE UP IN WEATHER. WICK DOESN'T LET ANYONE UP."),
    look(9, 6, 'FLAG LOCKER', "PIGEONHOLES OF ROLLED FLAGS FOR EVERY SIGNAL IN THE BOOK, AND A FEW THAT AREN'T: A BLACK ONE, A RED ONE, "
         "AND ONE WITH A DRAGON ON IT THAT WICK SAYS HE'S NEVER HAD TO FLY."),
    look(9, 8, 'SIGNAL LAMP', "A RED LAMP ON A STAND, AIMED OUT TO SEA. WHEN A SQUALL'S COMING HE FLASHES THE COVE. WHEN A NAVY SAIL'S "
         "COMING HE FLASHES IT TWICE, AND THE COVE GOES VERY QUIET."),
    look(3, 3, 'WINDOW', "THE CRIMSON SEA BY MOONLIGHT, AND OUT ON IT A DARK PATCH MOVING AGAINST THE WIND: A SQUALL, WALKING ON THE "
         "WATER ON LEGS OF RAIN."),
    look(2, 5, 'STOVE', "A LITTLE IRON STOVE AND A KETTLE THAT'S NEVER COLD. WICK OFFERS YOU TEA. IT TASTES OF TAR AND IS EXCELLENT."),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (2, 2, 9, 10), doors=[(5, 11), (6, 11)], scene_id=WID,
            actors=[{'sheet': 'npc-wick', 'x': 4, 'y': 6, 'facing': 'down'}])
print('stormwatch done')
