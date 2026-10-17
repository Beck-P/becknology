"""The Sorceress's Tower, the second floor: the stillroom (world id "lumar-midnight-tower-2").

  BVENV/bin/python tools/bridge-art/scenes/lumar_midnight_tower_2.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-midnight-tower-2

Up the iron stair from Morwen's room: where she lives, rather than where she receives. Her bed under a canopy of
stars, the books she actually reads, the black mirror on the back wall, herbs drying on a rack, the copper still
ticking over its blue flame, a raven on its perch, books that have forgotten to stay on the shelf — and in a ward
circle of cold light in the middle of the floor, Master Idris Thorne, who drowned with Saltmere and was not let go.
The stair winds on up to the star chamber (lumar-midnight-tower-3); the well down goes back to her room.
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
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'lumar-midnight-tower-2'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
WARD = '#7ac8e8'

H = 2.6 / math.cos(THETA)
k = Kit(12, 13, margin_top=1.0, margin_bottom=0.5, seed=6102)
rng = k.rng
HOLE = (3.0, 7.4, 4.6, 9.0)
P, C = M.octagon_room(k, 2, 2, 10, 11, 2, H, door=(6.0, 6.0), floor_tone='#3e3a4c', holes=[HOLE])
A.stairwell_down(k, HOLE[0], HOLE[2], HOLE[1], HOLE[3])

# ---- the back wall: her books, the black mirror, the stair on up ------------------------------------------------------
A.bookshelf(k, 4.05, 5.45, 2.0, top=2.2, tone='#2a1e24')
k.solid(4.05, 2.0, 5.45, 2.5)
MX, MZ = 6.0, 1.75                     # the black mirror: an oval of dark glass in a frame of silver leaves
for i in range(28):
    a0, a1 = i * math.tau / 28, (i + 1) * math.tau / 28
    k.bar(MX + math.cos(a0) * 0.42, 2.02, MX + math.cos(a1) * 0.42, 2.02, MZ + math.sin(a0) * 0.62, MZ + math.sin(a1) * 0.62,
          0.08, ('#a8a8b8', 0.08), 'mirror_frame')
k.blob(MX, 2.04, MZ, 0.38, 0.015, 0.57, '#06040c', 'mirror_glass', emit=('#2a1a4a', 0.35), segs=16)
for (dx, dz) in ((-0.12, 0.25), (0.08, -0.15), (0.16, 0.3)):
    k.sphere(MX + dx, 2.06, MZ + dz, 0.025, 0.01, '#d8c8ff', 'mirror_glint', emit=('#b8a0ff', 1.0), segs=6)
for s in (-1, 1):                      # silver leaves at its crown and foot
    k.blob(MX + s * 0.18, 2.06, MZ + 0.62, 0.12, 0.03, 0.05, '#c8c8d8', 'mirror_frame', segs=8)
    k.blob(MX + s * 0.18, 2.06, MZ - 0.62, 0.12, 0.03, 0.05, '#c8c8d8', 'mirror_frame', segs=8)
k.point_light(MX, 2.6, MZ, '#5a3aa0', 3, radius=0.3, group='flicker')
SX, SR = 7.4, 3.05
top = L.spiral_stair(k, SX, SR, 0.95, tone='#4a4458')
k.box(SX - 0.46, 1.98, top, SX + 0.46, 2.06, top + 1.35, A.WOOD_DD, 'upstairs_frame')
k.box(SX - 0.38, 2.06, top, SX + 0.38, 2.065, top + 1.27, '#0a0c1e', 'upstairs_dark', emit=('#6a7ad8', 0.16))
k.point_light(SX, 2.4, top + 0.9, '#8a9ae8', 5, radius=0.2, group='flicker')
k.solid(SX - 0.95, SR - 0.95, SX + 0.4, SR + 0.9)

# ---- windows: the moon over the Midnight Sea --------------------------------------------------------------------------
M.angled_window(k, P[7], P[0], C, 0.3, 0.7, 1.15, 2.35, moon=True)
M.angled_window(k, P[1], P[2], C, 0.25, 0.6, 1.15, 2.35)
k.area_light(3.3, 3.3, 1.9, '#7890e0', 36, 1.0, rot=(math.radians(-70), 0, math.radians(45)))
k.area_light(8.7, 3.3, 1.9, '#7890e0', 26, 1.0, rot=(math.radians(-70), 0, math.radians(-45)))
M.star_banner(k, P[6], P[7], C, 0.5, 1.0, 2.1, w=0.6, col='#1a2448')

# ---- the left wall: her bed under its canopy of stars, a nightstand, a trunk ---------------------------------------------
BX0, BX1, BR0, BR1 = 2.2, 3.35, 4.3, 6.4
A.bed(k, BX0, BX1, BR0, BR1, quilt='#1e2450', quilt2='#b8b8d8', posts=True)
for (x, r) in ((BX0 + 0.06, BR0 + 0.06), (BX1 - 0.06, BR0 + 0.06), (BX0 + 0.06, BR1 - 0.06), (BX1 - 0.06, BR1 - 0.06)):
    k.cyl(x, r, 0.0, 2.05, 0.04, ('#2a1e30', 0.1), 'bed_post', verts=8)
for (a, b) in (((BX0, BR0), (BX1, BR0)), ((BX0, BR1), (BX1, BR1)), ((BX0, BR0), (BX0, BR1)), ((BX1, BR0), (BX1, BR1))):
    k.bar(a[0], a[1], b[0], b[1], 2.0, 2.06, 0.05, ('#2a1e30', 0.1), 'canopy_rail')
for _ in range(14):                                      # the canopy's stars, hanging on threads
    x, r = rng.uniform(BX0 + 0.15, BX1 - 0.15), rng.uniform(BR0 + 0.15, BR1 - 0.15)
    z = rng.uniform(1.75, 1.95)
    k.cyl(x, r, z, 2.02, 0.004, '#8a8aa0', 'thread', verts=3)
    k.sphere(x, r, z, 0.03, 0.03, '#e8e0a8', 'canopy_star', emit=('#e0d080', 1.0), segs=6)
for s in (BR0, BR1):                                     # curtains gathered at the head and foot posts
    k.blob(BX0 + 0.1, s, 1.2, 0.08, 0.14, 0.82, ('#2a2a5a', 0.1), 'curtain', segs=10)
A.nightstand(k, 2.55, 6.85)
k.solid(2.2, 6.6, 2.9, 7.1)
A.cat(k, 2.75, 5.0, z=0.62, col='#18141e')               # the familiar has followed you up, and taken the bed

# ---- the right side: the copper still, the herb rack, the raven ---------------------------------------------------------
STX, STR = 9.0, 5.0
k.box(STX - 0.55, STR - 0.4, 0.0, STX + 0.55, STR + 0.4, 0.7, (shade(M.STONE_PD, 1.0), 0.14), 'still_hearth', bevel=0.03)
k.cone(STX - 0.15, STR, 0.7, 0.8, 0.05, 0.004, '#80a0ff', 'still_flame', emit=('#6080ff', 3.0), verts=6)
k.sphere(STX - 0.15, STR, 1.02, 0.3, 0.26, ('#c87840', 0.06), 'still_pot', segs=14)
k.cone(STX - 0.15, STR, 1.24, 1.5, 0.14, 0.05, ('#c87840', 0.06), 'still_pot', verts=12)
k.tube((STX - 0.15, STR, 1.5), (STX + 0.2, STR - 0.05, 1.62), 0.035, '#d88a48', 'still_pipe', verts=8)
for i in range(4):                                       # the worm, coiling down into the flask
    a0, a1 = i * 1.6, (i + 1) * 1.6
    k.tube((STX + 0.3 + math.cos(a0) * 0.12, STR + math.sin(a0) * 0.12, 1.55 - i * 0.12),
           (STX + 0.3 + math.cos(a1) * 0.12, STR + math.sin(a1) * 0.12, 1.43 - i * 0.12), 0.025, '#d88a48', 'still_pipe', verts=6)
k.sphere(STX + 0.32, STR + 0.05, 0.86, 0.13, 0.13, '#205a40', 'flask', emit=('#40e090', 1.2), segs=10)
k.point_light(STX, STR + 0.5, 1.0, '#60d0a0', 4, radius=0.15, group='flicker')
k.point_light(STX - 0.15, STR + 0.3, 0.85, '#6080ff', 3, radius=0.08, group='flicker')
k.solid(STX - 0.55, STR - 0.4, STX + 0.55, STR + 0.4)
HX0, HX1, HR = 8.0, 9.6, 7.2                             # the drying rack: two posts, three poles, bundles hung upside down
for x in (HX0, HX1):
    k.cyl(x, HR, 0.0, 1.85, 0.04, (A.WOOD_D, 0.12), 'rack_post', verts=8)
for z in (1.1, 1.45, 1.8):
    k.cyl_x(HX0 - 0.05, HX1 + 0.05, HR, z, 0.025, 0.025, (A.WOOD, 0.12), 'rack_pole', verts=6)
    x = HX0 + 0.15
    while x < HX1 - 0.1:
        col = rng.choice(('#4a6a3a', '#6a5a8a', '#7a6a3a', '#3a5a4a', '#8a4a5a'))
        k.cyl(x, HR, z - 0.02, z, 0.008, '#c8b890', 'twine', verts=3)
        k.cone(x, HR, z - 0.34, z - 0.02, 0.02, 0.08, (col, 0.25), 'herb_bundle', verts=7)
        x += rng.uniform(0.18, 0.26)
k.solid(HX0, HR - 0.2, HX1, HR + 0.2)
RX, RR = 9.45, 8.9                                       # the raven on its perch, one eye on you
k.cyl(RX, RR, 0.0, 1.25, 0.03, A.WOOD_DD, 'perch', verts=6)
k.cyl_x(RX - 0.25, RX + 0.25, RR, 1.25, 0.025, 0.025, A.WOOD_DD, 'perch', verts=6)
k.blob(RX, RR, 1.4, 0.11, 0.09, 0.15, ('#14121a', 0.08), 'raven', segs=10)
k.sphere(RX + 0.03, RR + 0.05, 1.58, 0.075, 0.07, ('#18161e', 0.08), 'raven', segs=10)
k.cone(RX + 0.05, RR + 0.13, 1.57, 1.57, 0.03, 0.0, '#2a2830', 'raven_beak', verts=4)
k.tube((RX + 0.04, RR + 0.1, 1.57), (RX + 0.07, RR + 0.22, 1.55), 0.02, '#2a2830', 'raven_beak', rb=0.003, verts=4)
k.tube((RX - 0.05, RR - 0.06, 1.32), (RX - 0.1, RR - 0.2, 1.12), 0.04, '#14121a', 'raven', rb=0.01, verts=5)
k.sphere(RX + 0.07, RR + 0.1, 1.61, 0.014, 0.014, '#e8c040', 'raven_eye', emit=('#c0a020', 1.4), segs=5)
k.solid_post(RX, RR)

# ---- the middle: the ward circle and the drowned scholar in it ----------------------------------------------------------
WX, WR = 6.0, 6.2
M.spell_circle(k, WX, WR, 1.4, col=WARD, glyphs=16)
for i in range(6):                                       # six warding candles round its rim
    a = i * math.tau / 6 + 0.26
    x, r = WX + math.cos(a) * 1.55, WR + math.sin(a) * 1.3
    k.cyl(x, r, 0.0, 0.18, 0.045, '#d8e8f0', 'candle', verts=8)
    k.cone(x, r, 0.18, 0.28, 0.03, 0.002, '#c8f0ff', 'flame', emit=('#a8e8ff', 3.0), verts=6)
    k.point_light(x, r, 0.35, WARD, 1.2, radius=0.05, group='flicker')
k.point_light(WX, WR, 1.4, WARD, 10, radius=0.4, group='flicker')
k.solid(5, 5, 6, 6)                                      # where Idris stands, bound
for (x, r, z, a) in ((4.6, 5.3, 1.7, 20), (7.3, 5.6, 1.9, -35), (5.1, 7.4, 2.1, 50), (6.9, 7.2, 1.6, -10)):   # books in the air
    since = len(k.parts)
    k.box(x - 0.13, r - 0.09, z, x + 0.13, r + 0.09, z + 0.05, (rng.choice(('#5a1a2a', '#1a3a5a', '#3a2a5a', '#2a4a3a')), 0.1), 'book')
    k.box(x - 0.12, r - 0.08, z + 0.05, x + 0.12, r + 0.08, z + 0.06, '#e8dcc0', 'book_pages')
    k.cyl(x, r, z - 0.3, z - 0.29, 0.12, '#1a2a3a', 'book_glow', emit=('#5a8ab0', 0.25), verts=10)

# ---- the front: the lectern with the chained grimoire, a reading chair -----------------------------------------------------
LX, LR = 7.2, 9.3
k.cyl(LX, LR, 0.0, 0.06, 0.24, (M.STONE_PD, 0.12), 'lectern', verts=8)
k.cyl(LX, LR, 0.06, 0.95, 0.07, (A.WOOD_DD, 0.12), 'lectern', verts=8)
k.quads([((LX - 0.32, LR - 0.18, 1.08), (LX + 0.32, LR - 0.18, 1.08), (LX + 0.32, LR + 0.18, 0.94), (LX - 0.32, LR + 0.18, 0.94))],
        (A.WOOD_D, 0.12), 'lectern_top')
k.box(LX - 0.28, LR - 0.14, 1.02, LX - 0.01, LR + 0.14, 1.05, '#e4d8bc', 'grimoire')
k.box(LX + 0.01, LR - 0.14, 1.02, LX + 0.28, LR + 0.14, 1.05, '#ddd0b0', 'grimoire')
k.box(LX - 0.02, LR - 0.15, 1.0, LX + 0.02, LR + 0.15, 1.06, '#2a1a3a', 'grimoire_spine')
for i in range(6):                                       # its chain, down to a ring in the floor
    k.sphere(LX + 0.3 + i * 0.05, LR + 0.1 + i * 0.04, 0.95 - i * 0.16, 0.03, 0.03, '#5a5a66', 'chain', segs=6)
k.solid(LX - 0.35, LR - 0.3, LX + 0.35, LR + 0.3)
A.armchair(k, 5.6, 9.7, facing='up', tone='#3a2a4a')
A.book_stack(k, 4.95, 10.2, n=5)
A.rug(k, 5.0, 8.9, 8.2, 10.6, col='#2a2048', trim='#8a8ab0', pattern=True)

# ---- candles and the cold fill -----------------------------------------------------------------------------------------------
M.candelabra(k, 2.55, 8.2)
M.candelabra(k, 9.5, 4.0)
for (x, r, z) in ((4.6, 3.6, 2.2), (3.6, 7.0, 2.3), (8.4, 6.3, 2.4), (6.4, 9.0, 2.2)):
    M.floating_candle(k, x, r, z)
k.point_light(6.0, 8.6, 2.6, '#9090d8', 30, radius=0.6)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.72}}, light_samples=128, world_light=('#262244', 0.4))


def look(x, y, label, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
w.update({'name': 'The Stillroom', 'width': 12, 'height': 13, 'tileSize': 16, 'tileset': 'tower', 'spawns': {'player': [5, 8]},
          'shipExit': False, 'tiles': [[2] * 12 for _ in range(13)], 'collisions': [[0] * 12 for _ in range(13)]})
w['interactions'] = [
    {'x': x, 'y': 8, 'type': 'leave_world', 'leaveTo': 'lumar-midnight-tower', 'leaveSpawn': [6, 4], 'label': 'STAIRS DOWN',
     'prompt': 'PRESS E TO GO DOWN'} for x in (3, 4)] + [
    {'x': x, 'y': 3, 'type': 'enter_world', 'target': 'lumar-midnight-tower-3', 'spawn': [5, 8], 'label': 'STAIRS UP',
     'prompt': 'PRESS E TO CLIMB'} for x in (6, 7)] + [
    look(5, 5, 'IDRIS THORNE',
         "A MAN MADE OF COLD LIGHT, HIS ROBES MOVING IN A CURRENT THAT ISN'T THERE, WATER RUNNING FROM HIS SLEEVES AND "
         "NEVER REACHING THE FLOOR.\n\n\"AH. A VISITOR WITH A PULSE. SIT, IF YOU LIKE. I CAN'T.\"", 'PRESS E TO TALK'),
    look(6, 7, 'WARD CIRCLE',
         "A WARD OF PALE BLUE LIGHT, SIXTEEN GLYPHS ROUND ITS RIM, SIX CANDLES THAT BURN COLD.\n\nIT ISN'T KEEPING "
         "ANYTHING OUT. IT'S KEEPING SOMEONE IN - GENTLY, THE WAY YOU'D HOLD A CANDLE OUT OF THE WIND.", 'PRESS E TO STUDY'),
    look(6, 3, 'BLACK MIRROR',
         "AN OVAL OF GLASS SO DARK IT DRINKS THE CANDLELIGHT. IN IT THE ROOM IS THE SAME, EXCEPT THAT IT'S FULL OF WATER, "
         "AND SOMEONE IS STANDING BEHIND YOU.\n\nYOU DON'T TURN ROUND."),
    look(4, 3, 'BOOKSHELF',
         "THE BOOKS SHE READS, NOT THE ONES SHE SHOWS: 'TIDES OF THE WEAVE', 'ON BINDING THE DROWNED (AND WHY YOU "
         "SHOULDN'T)', 'SALTMERE: A PARISH HISTORY', AND A CHILDREN'S BOOK OF SEA SHANTIES, VERY WORN."),
    look(3, 5, 'BED',
         "A NARROW BED UNDER A CANOPY OF LITTLE HANGING STARS. THE BLACK CAT HAS TAKEN THE PILLOW AND WILL NOT BE "
         "DISCUSSING IT.", 'PRESS E TO LOOK'),
    look(9, 5, 'THE STILL',
         "A COPPER STILL TICKING OVER A BLUE FLAME. WHAT DRIPS INTO THE FLASK GLOWS GREEN.\n\nA LABEL IN HER HAND: "
         "'MOONWATER - FOR THE DROWNED, WHO ARE ALWAYS THIRSTY.'"),
    look(9, 7, 'DRYING HERBS',
         "BUNDLES HUNG UPSIDE DOWN TO DRY: SEA LAVENDER, WORMWOOD, BLACK SAMPHIRE, AND SOMETHING THAT HUMS WHEN YOU "
         "BREATHE ON IT."),
    look(9, 9, 'RAVEN',
         "A RAVEN ON A PERCH. IT LOOKS AT YOU WITH ONE GOLD EYE, THEN THE OTHER.\n\n\"SALTMERE,\" IT SAYS, QUITE "
         "CLEARLY, AND GOES BACK TO SLEEP.", 'PRESS E TO LOOK'),
    look(7, 9, 'GRIMOIRE',
         "A BOOK CHAINED TO ITS LECTERN, OPEN AT A PAGE OF TIDE TABLES THAT DON'T MATCH ANY TIDE YOU KNOW.\n\nIN THE "
         "MARGIN: 'THE BELL RINGS AT THE NEW MOON. THE SHIP COMES WHEN IT RINGS. - I.T.'", 'PRESS E TO READ'),
    look(3, 3, 'WINDOW', "THE MIDNIGHT SEA UNDER A WHITE MOON, MIST LYING ON IT LIKE A SHEET OVER FURNITURE.\n\nFAR OUT, "
         "A LIGHT THAT ISN'T A STAR MOVES AGAINST THE WIND."),
]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (2, 2, 9, 10), doors=[], scene_id=WID,
            actors=[{'sheet': 'npc-ghost-scholar', 'x': 5, 'y': 5, 'facing': 'down', 'ghost': True}])
print('stillroom done')
