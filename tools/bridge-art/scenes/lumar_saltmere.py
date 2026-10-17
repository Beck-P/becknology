"""Saltmere — the drowned village in the Midnight Sea (world id "lumar-saltmere").

  BVENV/bin/python tools/bridge-art/scenes/lumar_saltmere.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-saltmere

A fishing village on a low island south-west of Midnight Isle, drowned one night fifty years ago when the sea came up
and didn't go back down. What's left above the water: three humps of land — the chapel mound with its bell tower (the
bell still hangs there, and in the dark of the moon it rings itself), the graveyard on the west rise, the net loft on
the east — and the old stone quay where your boat ties up, with the harbour light on its end, dark. Between them the
village stands in the sea up to its windows: roofs and chimneys and the tops of doors, a street of water, weed in the
shutters. Plank walks on piles thread through it from the quay to the mounds. The people are still here, in a manner
of speaking: the drowned villagers walk their old ways, pale and see-through (`ghost`), and the drowned fishers who
lost their minds to the sea come up out of the water at you (js/combat.js). Midnight keeps no living people.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_coast as C               # noqa: E402
import assets_house as HK              # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'lumar-saltmere'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 46, 36
k = Kit(COLS, ROWS, margin_top=3.0, margin_bottom=1.0, margin_x=0.5, seed=6161)
rng = k.rng
C45 = math.cos(math.radians(45))
GHOST = '#7ad0c8'

# ---- the land left above the water: three humps and the quay -------------------------------------------------------------
LOBES = [(23, 9.5, 7.5, 4.8), (9.5, 13.5, 5.5, 4.6), (36.5, 12.5, 5.8, 4.4)]
land = I.mask(COLS, ROWS, LOBES, seed=61, amp=0.12)
QUAY = (15, 23, 29, 24)                             # the stone quay: cols 15..29, rows 23..24
land |= {(c, r) for c in range(QUAY[0], QUAY[2] + 1) for r in range(QUAY[1], QUAY[3] + 1)}
PX = 22
PIER = [(PX, r) for r in range(QUAY[3] + 1, QUAY[3] + 4)]
SHIP_R = QUAY[3] + 4
# the plank walks over the drowned streets: from the quay up to the chapel, out to the graveyard and the net loft
WALKS = set()
WALKS |= {(PX, r) for r in range(14, QUAY[1])}
WALKS |= {(c, 13) for c in range(13, 17)}
WALKS |= {(c, 12) for c in range(29, 33)}
WALKS |= {(13, r) for r in range(17, QUAY[1] + 1)} | {(c, 17) for c in range(13, 16)} | {(14, QUAY[1])}
WALKS -= land
walk = set(land)
FJ, FLEN = (29, 24), 4                              # the fishing jetty: east off the quay's end
FJET = I.jetty_cells(FJ, FLEN, 'e')

PATHS = [[(PX + 0.5, QUAY[1]), (PX + 0.5, 8.0)], [(17.0, 12.0), (10.0, 13.0), (7.0, 15.0)], [(29.0, 11.0), (36.0, 12.0), (39.0, 14.0)]]


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def material(x, r):
    if QUAY[1] - 0.2 <= r and QUAY[0] <= x <= QUAY[2] + 1:
        return 'quay'
    p = pd(x, r) + 0.2 * I.n2(x, r, 1.6, 3)
    if p < 0.45:
        return 'path'
    m = I.n2(x, r, 0.4, 41) + 0.4 * I.n2(x, r, 1.5, 42)
    return 'grass' if m > -0.2 else ('grass_dark' if m > -0.6 else 'mud')


ALB = {'quay': ('#4a4858', 0.3), 'path': ('#4a4652', 0.3), 'grass': ('#2e3a3a', 0.3), 'grass_dark': ('#263032', 0.3), 'mud': ('#2a2830', 0.3)}
I.ground(k, walk, material, ALB)
C.coast(k, land, ground=(material, ALB), palette='midnight', grass='#2e3a3a', rock='#3e3a4a', seed=63, beachiness=-0.1,
        keep_clear=[(PX - 0.6, QUAY[3], PX + 1.6, SHIP_R + 0.5), (PX - 4.0, SHIP_R - 0.4, PX + 5.0, SHIP_R + 2.0),
                    (FJ[0], FJ[1] - 0.6, FJ[0] + FLEN + 1.6, FJ[1] + 1.6)] + [(c - 0.3, r - 0.3, c + 1.3, r + 1.3) for (c, r) in WALKS],
        sheer=[(QUAY[0] - 0.2, QUAY[3] + 0.6, QUAY[2] + 1.2, QUAY[3] + 1.6, 1.2)], reach=(0.2, 0.6))
# the quay's face: dressed blocks, weed at the water
for x in [QUAY[0] + i * 0.62 for i in range(int((QUAY[2] + 1 - QUAY[0]) / 0.62))]:
    for zz in (-0.05, -0.28):
        k.box(x + 0.02, QUAY[3] + 0.98, zz - 0.21, x + 0.6, QUAY[3] + 1.04, zz, (shade('#4a4858', rng.uniform(0.8, 1.1)), 0.16), 'quay_wall')
    k.blob(x + 0.3, QUAY[3] + 1.06, C.WZ + 0.05, 0.2, 0.03, 0.05, ('#2a3a2a', 0.2), 'weed', segs=6)

# ---- the plank walks on piles over the drowned streets ------------------------------------------------------------------
for (c, r) in sorted(WALKS):
    k.box(c + 0.06, r + 0.02, -0.06, c + 0.94, r + 0.98, 0.02, ('#3e3428', 0.25), 'walk_plank')
    for i in range(4):
        k.box(c + 0.06, r + 0.04 + i * 0.24, 0.02, c + 0.94, r + 0.2 + i * 0.24, 0.025, shade('#4a3e30', rng.uniform(0.85, 1.15)), 'walk_board')
    for (dx, dr) in ((0.1, 0.5), (0.9, 0.5)):
        k.cyl(c + dx, r + dr, C.WZ - 0.6, -0.04, 0.05, ('#2a2018', 0.2), 'walk_pile', verts=6)
W.dock(k, PX + 0.05, PX + 0.95, QUAY[3] + 0.6, SHIP_R + 0.0, z=0.02)
I.fishing_jetty(k, FJ, FLEN, 'e', glow='#7ad0c8')

# ---- the drowned village: houses standing in the sea up to their windows -----------------------------------------------------
HK.install()
DROWNED = [  # x0, x1, r_back, r_front, how deep (z it's sunk by), door x
    (15.4, 18.6, 15.2, 17.4, -1.0, 17.0), (15.2, 18.0, 19.0, 21.2, -1.15, 16.6), (24.4, 27.6, 15.0, 17.2, -0.95, 26.0),
    (24.6, 27.8, 18.8, 21.0, -1.25, 26.2), (29.0, 31.8, 15.6, 17.8, -1.4, 30.4), (9.6, 12.4, 18.6, 20.8, -1.3, 11.0),
    (31.6, 34.4, 18.2, 20.2, -1.6, 33.0), (6.4, 9.0, 21.2, 23.0, -1.8, 7.7),
]
for i, (x0, x1, rb, rf, dz, dx) in enumerate(DROWNED):
    since, ls = len(k.parts), len(k.lights)
    W.house(k, x0, x1, rb, rf, wall_h=2.0, rise=1.1, roof=rng.choice(('#2a3a3a', '#3a3446', '#2e2e3a', '#3a3a32')), wall=rng.choice(('#8a948c', '#7a8484', '#9a9a8a')),
            door_x=dx, windows=[(x0 + 0.7, 0.85)], chimney=x1 - 0.6 if i % 2 else None)
    C.sink(k, since, dz, ls)
    for p in k.parts[since:]:                     # no warm windows: dark glass, or a cold green where somebody's home
        if p.get('emit'):
            p['emit'] = ('#7ad0c8', 0.3) if i % 3 == 0 else None
    for L in k.lights[ls:]:                       # their windows are dark now - or lit a cold green by whoever's home
        L['obj'].data.energy *= 0.0 if i % 3 else 0.6
        L['obj'].data.color = (0.45, 0.85, 0.8)
    for j in range(5):                            # weed hung on the walls at the waterline
        k.blob(rng.uniform(x0, x1), rf + 0.05, C.WZ + rng.uniform(0.0, 0.15), rng.uniform(0.08, 0.18), 0.03, rng.uniform(0.05, 0.12),
               ('#2a3a2a', 0.25), 'weed', segs=6)
for (x, r) in ((20.0, 18.3), (24.4, 22.0), (12.0, 22.6), (34.6, 16.5)):            # a chimney alone, a roof beam, a cart wheel
    k.box(x - 0.2, r - 0.2, C.WZ - 0.6, x + 0.2, r + 0.2, 0.7, ('#5a4e48', 0.2), 'lone_chimney')
k.tube((19.4, 19.6, C.WZ - 0.2), (20.4, 20.8, 0.6), 0.06, ('#2a2018', 0.2), 'beam', verts=6)
k.cyl_y(28.6, 21.4, 21.5, C.WZ + 0.1, 0.35, 0.35, ('#3a2a1e', 0.2), 'cart_wheel', verts=14)

# ---- the chapel mound: the chapel, its bell tower, the bell-ringer's grave ---------------------------------------------------
CH = (19.6, 26.4, 6.2, 9.2)                       # the nave: x0, x1, back, front
k.box(CH[0], CH[2], 0.0, CH[1], CH[3], 0.3, ('#3a3846', 0.2), 'chapel_footing')
k.box(CH[0] + 0.1, CH[2] + 0.1, 0.3, CH[1] - 0.1, CH[3] - 0.1, 2.1, ('#7a7a86', 0.14), 'chapel_wall')
W._gable_roof(k, CH[0], CH[1], CH[2], CH[3], 2.1, 1.4, '#2e2e3a')
W.door(k, 23.0, CH[3] - 0.08, w=0.8, h=1.3, col='#2a2420')
for wx in (21.0, 25.0):
    k.box(wx - 0.22, CH[3] - 0.08, 0.9, wx + 0.22, CH[3] - 0.04, 1.8, '#0e1a1e', 'chapel_window', emit=(GHOST, 0.35))
k.point_light(23.0, CH[3] + 0.6, 1.0, GHOST, 10, radius=0.2, group='flicker')
W.bell_tower(k, 18.6, CH[3], w=1.8, h=5.0)
k.point_light(18.6, CH[3] - 0.9, 3.95, GHOST, 3, radius=0.1, group='flicker')      # a cold light in the belfry
k.solid(CH[0], CH[2], CH[1], CH[3])
k.solid(17.6, CH[3] - 1.8, 19.6, CH[3])
I.headstone(k, 27.4, 9.6, kind=1)
k.solid(24, 10, 25, 11)                           # where Tobiah stands, his ghost, by the chapel door

# ---- the graveyard on the west rise; drowned trees; the net loft on the east ---------------------------------------------------
for i in range(14):
    x, r = 6.0 + (i % 5) * 1.3 + rng.uniform(-0.2, 0.2), 11.4 + (i // 5) * 1.5 + rng.uniform(-0.2, 0.2)
    if (int(x), int(r)) in walk and pd(x, r) > 0.8:
        I.headstone(k, x, r, kind=rng.choice((0, 0, 1, 2)), lean=rng.uniform(-0.2, 0.2))
for (x, r) in ((4.6, 13.5), (13.2, 10.6), (40.4, 10.4), (33.2, 9.6)):
    I.dead_tree(k, x, r, h=rng.uniform(1.6, 2.2), tone='#2a2a30')
    k.solid(x - 0.3, r - 0.3, x + 0.3, r + 0.3)
NL = (34.4, 38.6, 8.6, 11.2, 36.4)
W.house(k, NL[0], NL[1], NL[2], NL[3], wall_h=2.6, rise=1.3, roof='#2a2e36', wall='#6a6458', door_x=NL[4], windows=[(NL[0] + 0.8, 1.0)],
        windows_up=[(NL[1] - 0.9, 1.9)])
for (x0, x1, r) in ((37.4, 39.4, 13.6), (32.6, 34.6, 13.8)):        # nets still on their poles, rotted
    for x in (x0, x1):
        k.cyl(x, r, 0.0, 1.3, 0.04, ('#3a3028', 0.2), 'net_pole', verts=5)
    k.poly([(x0, r, 1.25), (x1, r, 1.25), (x1, r + 0.05, 0.5), (x0, r + 0.05, 0.5)], ('#3a4440', 0.35), 'net')
    k.solid(x0 - 0.1, r - 0.15, x1 + 0.1, r + 0.2)

# ---- the quay: the dark harbour light on its end, lobster pots, a boat sunk at its moorings ---------------------------------------
HL = (16.0, 23.4)
k.cyl(HL[0], HL[1], 0.0, 0.25, 0.3, ('#3a3846', 0.2), 'light_base', verts=10)
k.cyl(HL[0], HL[1], 0.25, 2.5, 0.07, ('#2a2a30', 0.12), 'light_post', verts=8)
k.box(HL[0] - 0.22, HL[1] - 0.22, 2.5, HL[0] + 0.22, HL[1] + 0.22, 2.95, ('#1a1e24', 0.1), 'light_cage')
k.box(HL[0] - 0.16, HL[1] - 0.16, 2.55, HL[0] + 0.16, HL[1] + 0.16, 2.9, '#0a0c10', 'light_glass')
W.pyramid(k, HL[0] - 0.28, HL[1] - 0.28, HL[0] + 0.28, HL[1] + 0.28, 2.95, 3.25, ('#2a2a30', 0.15), 'light_cap')
k.solid_post(HL[0], HL[1])
for (x, r) in ((26.4, 23.4), (27.0, 23.6)):
    k.box(x - 0.24, r - 0.16, 0.0, x + 0.24, r + 0.16, 0.05, (A.WOOD_D, 0.14), 'pot_base')
    k.cyl_x(x - 0.24, x + 0.24, r, 0.08, 0.16, 0.19, ('#4a4a3a', 0.3), 'lobster_pot', verts=10)
k.solid(26.0, 23.1, 27.4, 23.9)
since, ls = len(k.parts), len(k.lights)
W.rowboat(k, 17.6, 19.6, 26.0, beam=0.8, hull='#2a2a24')
C.sink(k, since, C.WZ - 0.2, ls)
for (x, r) in ((20.0, QUAY[1] + 0.3), (25.4, QUAY[1] + 0.3)):
    I.wisp_lantern(k, x, r, col=GHOST, h=1.5)

for i in range(160):                                # reeds in the shallows round the humps and along the walks
    x, r = rng.uniform(3, 43), rng.uniform(5, 27)
    c = (int(x), int(r))
    if c in walk or c in WALKS or c in PIER:
        continue
    if not any((c[0] + dc, c[1] + dr) in walk for dc in (-1, 0, 1) for dr in (-1, 0, 1)):
        continue
    for j in range(rng.randint(3, 6)):
        dx, dr = rng.uniform(-0.25, 0.25), rng.uniform(-0.2, 0.2)
        k.cone(x + dx, r + dr, C.WZ - 0.1, C.WZ + rng.uniform(0.35, 0.7), 0.018, 0.003, (rng.choice(('#3a4a3a', '#4a5a40', '#2e3a30')), 0.25),
               'reed', verts=4)
busy = lambda x, r: pd(x, r) < 0.6
I.tufts(k, [c for c in walk if material(c[0] + 0.5, c[1] + 0.5) in ('grass', 'grass_dark')], '#344444', per_cell=1.0, avoid=busy, flowers=0.1)
I.pebbles(k, walk, '#3a3846', per_cell=0.25, avoid=busy)

k.area_light(23.0, 14.0, 16.0, '#7078b8', 1800, 40.0, rot=(math.radians(-35), 0, 0))         # a thin moon
k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.7}}, light_samples=96, world_light=('#262838', 0.7))


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


w = {'name': 'Saltmere', 'sea': 'midnight', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [PX, QUAY[1]]}, 'moonColor': '#c8d0f0', 'shipExit': True,
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         {'x': PX, 'y': QUAY[3] + 2, 'type': 'go_sailing', 'label': 'DOCK', 'prompt': 'PRESS E TO GO SAILING'},
         {'x': int(HL[0]), 'y': int(HL[1]), 'type': 'dialog', 'label': 'HARBOUR LIGHT', 'prompt': 'PRESS E TO LOOK',
          'dialog': "SALTMERE'S HARBOUR LIGHT, ON THE END OF THE QUAY: AN IRON POST, A LANTERN CAGE AT THE TOP, EMPTY. NOBODY HAS LIT IT IN FIFTY YEARS.\n\nA HOOK INSIDE THE CAGE, WAITING FOR A LANTERN."},
         {'x': 23, 'y': 9, 'type': 'dialog', 'label': 'THE CHAPEL', 'prompt': 'PRESS E TO LOOK',
          'dialog': "SALTMERE'S CHAPEL ON ITS MOUND, THE ONE BUILDING THE SEA DIDN'T TAKE. THE DOOR IS SWOLLEN SHUT. INSIDE, A COLD GREEN LIGHT, AND SOMEONE SINGING VERY QUIETLY."},
         {'x': 18, 'y': 9, 'type': 'dialog', 'label': 'BELL TOWER', 'prompt': 'PRESS E TO LOOK',
          'dialog': "THE BELL STILL HANGS IN THE BELFRY, GREEN WITH AGE. ITS ROPE HAS ROTTED AWAY. IN THE DARK OF THE MOON IT RINGS ANYWAY."},
         {'x': 24, 'y': 10, 'type': 'dialog', 'label': 'TOBIAH', 'prompt': 'PRESS E TO TALK',
          'dialog': 'AN OLD MAN MADE OF COLD GREEN LIGHT, BAREFOOT, A BELL ROPE OVER HIS SHOULDER THAT ENDS IN NOTHING.'},
         {'x': 27, 'y': 10, 'type': 'dialog', 'label': "TOBIAH'S GRAVE", 'prompt': 'PRESS E TO READ',
          'dialog': "A CROSS BY THE CHAPEL DOOR: 'TOBIAH WREN, BELL-RINGER. HE RANG TILL THE WATER CAME UP THE TOWER STAIRS.'"},
         look('THE DROWNED STREET', 22, 19, "SALTMERE'S HIGH STREET, UNDER THE SEA TO THE WINDOWS. SHUTTERS HANG OPEN ON WEED. A DOOR KNOCKER "
              "SHAPED LIKE A FISH, JUST ABOVE THE WATER. IN ONE WINDOW, A GREEN LIGHT, AND A SHAPE THAT MIGHT BE SOMEONE SITTING AT "
              "A TABLE, WAITING FOR DINNER."),
         look('GRAVEYARD', 8, 14, "THE GRAVEYARD ON THE WEST RISE: NAMES OF FISHERFOLK, MOST OF THEM WREN OR SALLOW OR MARSH. THE NEWEST "
              "STONES ARE FIFTY YEARS OLD. NOBODY HAS BEEN BURIED HERE SINCE; NOBODY HAD TO BE."),
         look('NET LOFT', 36, 11, "THE NET LOFT ON THE EAST HUMP, ITS NETS STILL HANGING TO DRY ON THEIR POLES. THEY'LL NEVER BE DRY. "
              "THE DOOR IS OPEN AND THE LOFT IS FULL OF MOTH-EATEN NETS AND ONE GOOD OILSKIN, FOLDED, AS IF FOR SOMEONE COMING BACK."),
         look('SUNK BOAT', 18, 24, "A ROWING BOAT SUNK AT HER MOORING BY THE QUAY STEPS, HER PAINTER STILL TIED. ON HER BOW, IN FADED "
              "LETTERS: 'LITTLE GLOAMING'."),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER + FJET + sorted(WALKS), scene_id=WID,
            actors=[{'sheet': 'npc-ghost-ringer', 'x': 24, 'y': 10, 'facing': 'down', 'ghost': True}],
            scene_extra={'backdrop': True, 'mist': True})
w = json.load(open(WORLD))
for r in range(ROWS):
    for c in range(COLS):
        if (c, r) not in walk and (c, r) not in PIER and (c, r) not in FJET and (c, r) not in WALKS:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -3.0, COLS + 0.5, ROWS + 1.0]
w['onFaint'] = {'world': WID, 'spawn': [PX, QUAY[1]], 'who': 'TOBIAH',
                'line': "YOU COME ROUND ON THE QUAY, SOAKED, A COLD HAND ON YOUR SHOULDER THAT ISN'T THERE WHEN YOU LOOK.\n\n\"THE ONES "
                        "WHO LOST THEIR WITS DON'T KNOW WHAT THEY'RE DOING,\" SAYS THE BELL-RINGER. \"STEP ASIDE WHEN THEY RAISE THEIR "
                        "ARMS. WATCH THE GROUND.\""}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('saltmere done; walkable', len(walk) + len(WALKS))
