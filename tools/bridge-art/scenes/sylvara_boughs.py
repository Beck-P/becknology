"""Sylvara — the Boughs: the canopy tier of the wood elves' city, where most of them live. Blender scene.

  BVENV/bin/python tools/bridge-art/scenes/sylvara_boughs.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/sylvara-boughs

High in the old wood. Platforms of pale planks ring the giants' trunks, rope bridges sag between them, and the elves'
homes stand on them — round woven walls, round doors, roofs of leaf shingles with a curled tip, flower boxes. The
basket lift comes up from the Rootmarket at the greatest trunk; the stair arrives at another. North, a bough so great
it's a building: the Hollow Bough, the tavern, its door glowing. South-west the Queen's Stair winds up the trunk to the
Crown. Far below, the lower boughs fade into green gloom. Things for a bow (js/bows.js): five high lanterns out on thin
branches that went dark in the big wind (fire arrows light them), a leaf target on a rope over the tavern's walk that
lets a rope ladder down to a nook, and the Owl's Rest, a platform no bridge reaches — a rope arrow into its trunk's
ring rigs a zip line. The walkways are z = 0; everything walkable is a plank.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_sylvan as A                          # noqa: E402
import assets_town as W                            # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WID = 'sylvara-boughs'
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', WID + '.json')
COLS, ROWS = 48, 36
k = Kit(COLS, ROWS, margin_top=3.6, margin_bottom=0.6, seed=5117)
rng = k.rng
FLOOR = -15.0                                                   # the forest floor, far below

# ---- the plan: trunks and their platforms ------------------------------------------------------------------------------
# name: (x, r, trunk radius, platform outer radius or None)
T = {
    'lift':   (21.5, 21.0, 2.3, 5.2),
    'stair':  (32.0, 18.6, 1.8, 4.4),
    'homes':  (9.0, 20.0, 1.7, 4.8),
    'tavern': (40.0, 6.4, 2.0, None),
    'queen':  (11.6, 29.0, 2.4, 5.0),
    'owl':    (44.6, 18.6, 1.4, 3.6),
    'edge1':  (2.0, 33.0, 1.4, None),
    'edge2':  (25.0, 3.0, 1.8, None),
    'edge3':  (46.5, 31.0, 1.5, None),
}
# decks (x0, r0, x1, r1, rail sides)
DECKS = [
    (19.2, 25.0, 24.4, 27.8, 'se'),      # the lift's landing
    (29.6, 21.6, 33.6, 24.2, 'sew'),     # the stair head
    (20.0, 10.2, 38.8, 12.4, 's'),       # the walk along the Hollow Bough
    (24.0, 14.6, 27.4, 16.4, 'sew'),     # the nook under the tavern walk (the rope ladder's)
    (7.4, 11.4, 10.6, 13.6, 'nwe'),      # a lookout north of the homes
]
BRIDGES = [  # a, b, width — all straight across or straight down (you walk four ways)
    ((13.4, 20.6), (16.8, 20.6), 1.3),   # the homes → the lift
    ((26.2, 19.6), (28.2, 19.6), 1.3),   # the lift → the stair tree
    ((32.0, 12.2), (32.0, 14.9), 1.3),   # the tavern walk → the stair tree
    ((22.6, 12.2), (22.6, 16.6), 1.3),   # the tavern walk → the lift
    ((15.8, 27.0), (19.4, 27.0), 1.3),   # the queen's trunk → the lift's landing
    ((9.0, 13.4), (9.0, 15.8), 1.2),     # the homes → the lookout
]
ZIP = {'id': 'owl', 'from': [35, 18], 'to': [41, 18], 'anchor': [44, 18]}
LANTERNS = [  # x, r (the tile it hangs over), height of the glass above the walkways (tiles), the branch's angle
    (16.0, 24.0, 1.6, 0.6), (28.0, 26.0, 1.5, 0.2), (3.0, 24.0, 1.8, -0.4), (38.0, 14.0, 1.5, 2.6), (19.0, 33.0, 1.6, 0.4),
]
SWITCH = (25.5, 13.4)                                            # the leaf target, hung over the gap
LADDER = (25, 12, 2.0)                                           # the ladder: the first cell it opens, its length (tiles)

# ---- far below: the floor in the gloom, the lower boughs -----------------------------------------------------------------
k.box(-2, -6, FLOOR - 0.2, COLS + 2, ROWS + 22, FLOOR, ('#1e2a1a', 0.4), 'ground_gloom')
for _ in range(60):
    x, r = rng.uniform(-2, COLS + 2), rng.uniform(-4, ROWS + 20)
    s = rng.uniform(0.3, 0.9)
    k.blob(x, r, FLOOR, s, s * 0.8, 0.08, (shade('#2a3a24', rng.uniform(0.8, 1.2)), 0.4), 'ground_moss', segs=8)
for _ in range(14):                                              # the city's lanterns far below, tiny
    x, r = rng.uniform(0, COLS), rng.uniform(4, ROWS + 18)
    A.leaf_lantern(k, x, r, FLOOR + 1.5, s=0.12, energy=0.0)
A.lower_canopy(k, -2, 0, COLS + 2, ROWS + 14, z=-5.5, n=70)
A.lower_canopy(k, -2, 6, COLS + 2, ROWS + 18, z=-10.0, n=40)

# ---- the trunks, the platforms ----------------------------------------------------------------------------------------
for i, (name, (x, r, rad, ro)) in enumerate(T.items()):
    A.column_trunk(k, x, r, rad, FLOOR, 9.5, seed=60 + i)
def gap_toward(name, x, r):
    tx, tr, _rad, _ro = T[name]
    return math.atan2((r - tr) / 0.92, x - tx)


gaps = {
    'lift': [gap_toward('lift', 16.8, 20.6), gap_toward('lift', 26.2, 19.6), gap_toward('lift', 22.6, 16.6), math.pi / 2 - 0.3, math.pi / 2 + 0.3],
    'stair': [gap_toward('stair', 28.2, 19.6), -math.pi / 2, math.pi / 2, 0.0],
    'homes': [gap_toward('homes', 13.4, 20.6), -math.pi / 2],
    'queen': [gap_toward('queen', 15.8, 27.0)],
    'owl': [math.pi],
}
for name, (x, r, rad, ro) in T.items():
    if ro:
        A.ring_platform(k, x, r, rad + 0.05, ro, gaps=gaps.get(name, ()))
for (x0, r0, x1, r1, rails) in DECKS:
    A.deck(k, x0, r0, x1, r1, rail_sides=rails)
    for (px, pr) in ((x0 + 0.3, r1 - 0.2), (x1 - 0.3, r1 - 0.2)):     # posts down into the gloom holding it
        k.tube((px, pr, -0.2), (px + rng.uniform(-0.4, 0.4), pr - 0.3, -4.0), 0.07, (A.ELFWOOD_D, 0.3), 'strut', verts=6)
for (a, b, w) in BRIDGES:
    A.rope_bridge(k, a, b, width=w)

# ---- the Hollow Bough: the tavern, along the north ---------------------------------------------------------------------
TV = A.hollow_bough(k, 23.2, 38.6, 8.6, 0.95, 1.55, door_x=31.0)
TAVERN_DOOR = (31, 10)

# ---- homes on the platforms: each on its own little deck hung off a platform's outer edge, its door toward the trunk -----
HOMES = []
for (name, a, roof) in (('homes', -2.2, '#5a8a3a'), ('homes', -0.9, '#8a6a3a'), ('homes', math.pi, '#4a7a6a'), ('queen', math.pi, '#6a5690'),
                        ('queen', -2.3, '#a0703a'), ('lift', -2.45, '#5a8a3a'), ('stair', -0.7, '#4a7a6a')):
    tx, tr, rad, ro = T[name]
    px, pr = tx + math.cos(a) * (ro + 0.45), tr + math.sin(a) * (ro + 0.45) * 0.92
    A.deck(k, px - 1.0, pr - 0.9, px + 1.0, pr + 0.9)
    k.tube((px, pr + 0.6, -0.2), (tx + math.cos(a) * (ro - 1.0), tr + math.sin(a) * (ro - 1.0) * 0.92, -1.6), 0.06, (A.ELFWOOD_D, 0.3), 'strut', verts=6)
    dpos = A.pod_house(k, px, pr, rad=0.7, h=1.2, roof=roof, door_ang=a + math.pi)
    HOMES.append((tx + math.cos(a) * (ro - 0.55), tr + math.sin(a) * (ro - 0.55) * 0.92))     # where you stand to knock
lx, lr, lrad, lro = T['lift']
sx, sr, srad, sro = T['stair']
qx, qr, qrad, qro = T['queen']

# ---- the lift's top: a beam out over the landing with the pulley, the basket up, a winch -------------------------------------
LIFT_TOP = (21.6, 26.2)
k.tube((lx, lr + 1.6, 3.2), (LIFT_TOP[0], LIFT_TOP[1] + 0.2, 3.0), 0.12, (A.ELFWOOD_D, 0.3), 'beam', verts=8)
k.cyl_y(LIFT_TOP[0], LIFT_TOP[1] + 0.1, LIFT_TOP[1] + 0.3, 2.9, 0.22, 0.22, (A.GOLD, 0.25), 'pulley', verts=12)
k.tube((LIFT_TOP[0], LIFT_TOP[1] + 0.2, 2.9), (LIFT_TOP[0], LIFT_TOP[1] + 0.2, -6.0), 0.025, ('#c8b080', 0.25), 'rope', verts=5)
for i in range(6):                                               # the basket, come up, resting at the landing's edge
    k.cyl(LIFT_TOP[0], LIFT_TOP[1] + 0.9, -0.6 + i * 0.11, -0.5 + i * 0.11, 0.58 - 0.01 * i, (shade('#b08a50', 0.92 + 0.06 * (i % 2)), 0.3), 'basket', verts=20)
k.cyl(LIFT_TOP[0], LIFT_TOP[1] + 0.9, 0.06, 0.12, 0.6, ('#8a6a3a', 0.3), 'basket_rim', verts=20)
A.lantern_post(k, A.Land(k, lambda x, r: 0.0, lambda x, r: None), 19.6, 25.5, energy=10.0)

# ---- the Queen's Stair, winding up the queen's trunk to the Crown ------------------------------------------------------------
A.spiral_stair(k, qx, qr, qrad * 1.2, 0.05, 9.0, turns=1.1, a0=math.pi * 0.35)
QUEEN_FOOT = (int(qx + math.cos(math.pi * 0.35) * (qrad * 1.2 + 0.4)), int(qr + math.sin(math.pi * 0.35) * (qrad * 1.2 + 0.4) * 0.92))
for (dx, dz) in ((-0.35, 0.0), (0.35, 0.0)):                      # banners either side of its foot: a gold leaf on green
    bxp, brp = QUEEN_FOOT[0] + 0.5 + dx * 2.2, QUEEN_FOOT[1] + 0.6
    A.carved_post(k, bxp, brp, 0.0, 2.2)
    k.poly([(bxp - 0.25, brp + 0.05, 2.0), (bxp + 0.25, brp + 0.05, 2.0), (bxp + 0.25, brp + 0.06, 1.0), (bxp, brp + 0.07, 0.8), (bxp - 0.25, brp + 0.06, 1.0)],
           ('#2a5a2e', 0.3), 'banner')
    k.blob(bxp, brp + 0.08, 1.45, 0.1, 0.01, 0.15, (A.GOLD, 0.25), 'banner_leaf', segs=6)
    k.solid_post(bxp, brp)

# ---- for the bow: high lanterns, the switch and its ladder, the zip line's posts and anchor ------------------------------------
for (x, r, h, ang) in LANTERNS:
    A.branch_lantern(k, x, r, h, reach=1.4, ang=ang, lit=False)
A.leaf_target(k, SWITCH[0], SWITCH[1], 0.4, rope=1.6)
A.rope_ladder_rolled(k, LADDER[0] + 0.5, 12.35, -0.25)
A.zip_post(k, ZIP['from'][0] + 0.5, ZIP['from'][1] - 0.15)          # just behind where you stand to ride it
A.zip_post(k, ZIP['to'][0] + 0.5, ZIP['to'][1] - 0.15)
ox, orr, orad, oro = T['owl']
A.anchor_mark(k, ox, orr, orad, z=1.3)
# the Owl's Rest: a nest in a fork of the trunk, owlmoss growing, a carved box
k.cyl(ox - 0.9, orr + 1.0, 0.0, 0.25, 0.45, ('#7a5a38', 0.35), 'nest', verts=16)
for i in range(16):
    a = i / 16 * math.tau
    k.tube((ox - 0.9 + math.cos(a) * 0.45, orr + 1.0 + math.sin(a) * 0.4, 0.1), (ox - 0.9 + math.cos(a + 0.8) * 0.5, orr + 1.0 + math.sin(a + 0.8) * 0.42, 0.28),
           0.025, ('#5a4030', 0.3), 'twig', verts=4)
for _ in range(8):
    k.blob(ox + 0.6 + rng.uniform(-0.4, 0.4), orr + 1.6 + rng.uniform(-0.2, 0.2), 0.02, 0.14, 0.1, 0.04, ('#3a6a3a', 0.35), 'owlmoss', emit=('#a8f0c8', 0.35), segs=8)
k.box(ox + 1.2, orr - 0.4, 0.0, ox + 1.8, orr + 0.1, 0.4, (A.ELFWOOD, 0.25), 'chest')
k.box(ox + 1.18, orr - 0.42, 0.4, ox + 1.82, orr + 0.12, 0.46, (A.GOLD, 0.25), 'chest_lid')
k.solid(ox + 1.2, orr - 0.4, ox + 1.8, orr + 0.1)
# the nook's carved box (down the ladder)
k.box(25.0, 14.75, 0.0, 25.6, 15.15, 0.4, (A.ELFWOOD, 0.25), 'chest')
k.box(24.98, 14.73, 0.4, 25.62, 15.17, 0.46, (A.GOLD, 0.25), 'chest_lid')
A.bench(k, A.Land(k, lambda x, r: 0.0, lambda x, r: None), 26.0, 27.2, 16.1)

# ---- life on the walkways: lanterns, flower tubs, washing, a weaver's frame, crates -------------------------------------------
FLAT = A.Land(k, lambda x, r: 0.0, lambda x, r: None)
for (x, r) in ((12.4, 17.4), (5.0, 21.6), (25.4, 18.0), (18.0, 23.6), (33.4, 22.0), (35.4, 11.4), (27.4, 11.4), (15.0, 31.0), (8.4, 26.0), (42.8, 20.6)):
    A.lantern_post(k, FLAT, x, r, energy=9.0)
for (x, r) in ((6.0, 18.0), (19.4, 17.8), (30.6, 16.0), (14.2, 28.4), (36.8, 11.6), (24.4, 23.0)):
    k.cyl(x, r, 0.0, 0.3, 0.22, ('#8a5a3a', 0.3), 'tub', verts=12)
    A.flower_bed(k, FLAT, x, r, 0.24, 0.2, n=4)
A.cloth_line(k, (5.4, 22.4, 1.5), (8.0, 23.6, 1.5), n=3)
for (x, r) in ((5.4, 22.4), (8.0, 23.6)):
    A.carved_post(k, x, r, 0.0, 1.6, rad=0.04, leaf=False)
    k.solid_post(x, r)
for (x, r) in ((29.0, 11.0), (36.0, 10.8), (23.2, 26.4)):
    A.clutter(k, FLAT, x, r)
for (x0, x1, r) in ((25.2, 26.6, 11.9), (33.6, 35.0, 11.9)):
    A.bench(k, FLAT, x0, x1, r)

# ---- the canopy round it all: crowns of the giants above, boughs closing in at the edges -----------------------------------
with k.foliage('leaf'):
    for (x, r, z, s) in ((2.0, 4.0, 4.2, 1.4), (14.0, 1.0, 5.0, 1.3), (36.0, 1.5, 5.4, 1.4), (47.0, 12.0, 4.6, 1.3), (-0.5, 21.0, 3.6, 1.2),
                         (47.5, 26.0, 3.6, 1.2), (6.0, 36.5, 2.2, 1.3), (20.0, 37.0, 2.0, 1.2), (34.0, 36.5, 2.4, 1.3), (44.0, 37.5, 2.0, 1.1),
                         (17.5, 3.0, 4.4, 1.0), (30.0, 2.2, 4.8, 1.0)):
        A.crown(k, x, r, z, s * 0.75)
for name in ('edge1', 'edge2', 'edge3'):                        # the edge trunks carry a crown of their own, low
    x, r, rad, _ = T[name]
    A.crown(k, x, r, 5.2, 0.9)
# leaves on the trunks at walkway height and sprays out over the drop
with k.foliage('leaf'):
    for name, (x, r, rad, ro) in T.items():
        for _ in range(4):
            a = rng.uniform(math.pi * 0.1, math.pi * 0.9)
            d = (ro or rad) + rng.uniform(0.3, 1.0)
            W.leafy_crown(k, x + math.cos(a) * d, r + math.sin(a) * d * 0.92, rng.uniform(-1.6, -0.6), 0.6, 0.5, 0.35,
                          shade(A.LEAF, rng.uniform(0.85, 1.05)), n=24, part='canopy', sprigs=True)

# ---- what's walkable: the platforms, the decks, the bridges (everything else is a drop) ----------------------------------------
walk = set()


def seg_d(x, r, a, b):
    return A.seg_dist(x, r, a, b)


for c in range(COLS):
    for rr in range(ROWS):
        x, r = c + 0.5, rr + 0.7                                  # where your feet are in the cell
        ok = False
        for name, (tx, tr, rad, ro) in T.items():
            if ro:
                d = math.hypot(x - tx, (r - tr) / 0.92)
                if rad + 0.35 < d < ro - 0.2:
                    ok = True
        for (x0, r0, x1, r1, _rs) in DECKS:
            if x0 + 0.1 < x < x1 - 0.1 and r0 + 0.05 < r < r1 - 0.05:
                ok = True
        for (a, b, w) in BRIDGES:
            if seg_d(x, r, a, b) < w / 2 - 0.05:
                ok = True
        if ok:
            walk.add((c, rr))
for c in range(COLS):
    for rr in range(ROWS):
        if (c, rr) not in walk:
            k.solid(c, rr, c + 1, rr + 1)

# ---- the light: the sun high through the leaves by day; Sylvara's dusk; the lanterns at night -----------------------------------
k.sun((0.62, 0.42, -0.62), '#fff0c8', 3.4, angle=3.0)
k.render(OUT, cycle={'base': 'day', 'dusk_sun': ((0.78, 0.3, -0.36), '#ffb070', 1.8), 'dusk_sky': ('#3a5a7a', 0.55),
                     'night_sky': ('#1e3040', 0.55), 'lamps_day': 0.3},
         light_states={'full': {}}, light_samples=int(os.environ.get('SAMPLES', 96)), world_light=('#86aac0', 0.8))

# ---- the world -------------------------------------------------------------------------------------------------------
w = json.load(open(WORLD)) if os.path.exists(WORLD) else {}
SPAWN = [21, 26]
w.update({'name': 'the Boughs', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'sylvara',
          'spawns': {'player': SPAWN}, 'tiles': [[1] * COLS for _ in range(ROWS)], 'collisions': [[1] * COLS for _ in range(ROWS)],
          'shipExit': False, 'view': [0.0, -3.6, COLS, ROWS], 'crowd': 'sylvara', 'arrows': 'open'})
w['zips'] = [ZIP]
w['lanterns'] = [{'id': 'bough%d' % i, 'at': [int(x), int(r)], 'h': round(h * 22.6 + 4), 'group': 'boughs'} for i, (x, r, h, _a) in enumerate(LANTERNS)]
w['switches'] = [{'id': 'nook', 'at': [int(SWITCH[0]), int(SWITCH[1])], 'h': 24, 'opens': [[LADDER[0], LADDER[1]], [LADDER[0], LADDER[1] + 1]],
                  'ladder': [LADDER[0], 12.35, LADDER[2]], 'what': 'the ladder unrolls'}]
w['interactions'] = [
    {'x': 21, 'y': 26, 'type': 'sylvan', 'kind': 'lift', 'label': 'BASKET LIFT', 'prompt': 'PRESS E TO RIDE DOWN TO THE ROOTMARKET',
     'target': 'sylvara-roots', 'spawn': [21, 12]},
    {'x': 31, 'y': 22, 'type': 'enter_world', 'label': 'THE STAIR', 'prompt': 'PRESS E TO CLIMB DOWN', 'target': 'sylvara-roots', 'spawn': [29, 9]},
    {'x': QUEEN_FOOT[0], 'y': QUEEN_FOOT[1], 'type': 'enter_world', 'label': 'THE QUEEN\'S STAIR', 'prompt': 'PRESS E TO CLIMB TO THE CROWN',
     'target': 'sylvara-crown', 'spawn': [8, 22]},
    {'x': TAVERN_DOOR[0], 'y': TAVERN_DOOR[1] + 1, 'type': 'enter_world', 'label': 'THE HOLLOW BOUGH', 'prompt': 'PRESS E TO GO IN',
     'target': 'sylvara-tavern', 'spawn': [12, 14]},
    {'x': 25, 'y': 15, 'type': 'sylvan', 'kind': 'cache', 'cache': 'nook', 'label': 'CARVED BOX', 'prompt': 'PRESS E TO OPEN'},
    {'x': int(ox + 1.4), 'y': int(orr + 0.6), 'type': 'sylvan', 'kind': 'cache', 'cache': 'owl', 'label': 'CARVED BOX', 'prompt': 'PRESS E TO OPEN'},
    {'x': int(ox - 1), 'y': int(orr + 1.6), 'type': 'dialog', 'label': 'OWL\'S NEST', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'A GREAT NEST OF TWIGS IN THE FORK OF THE TRUNK, LINED WITH MOSS THAT GLOWS A LITTLE. TWO ENORMOUS EYES OPEN IN THE DARK OF IT, CONSIDER YOU, AND CLOSE AGAIN.'},
    {'x': 9, 'y': 11, 'type': 'dialog', 'label': 'LOOKOUT', 'prompt': 'PRESS E TO LOOK',
     'dialog': 'FROM THE LOOKOUT THE CANOPY RUNS AWAY IN EVERY DIRECTION, GREEN ON GREEN, AND FAR OFF TO THE SOUTH A SILVER LINE THROUGH IT: THE SILVERRUN, GOING DOWN TO THE LAKE.'},
]
for i, (dx, dr) in enumerate(HOMES):
    w['interactions'].append({'x': int(dx), 'y': int(dr - 0.2), 'type': 'dialog', 'label': 'ELVEN HOME', 'prompt': 'PRESS E TO KNOCK', 'home': i,
                              'dialog': ['SOMEONE CALLS "IT\'S OPEN!" AND THEN, AFTER A PAUSE, "IT ISN\'T, ACTUALLY. SORRY. WRONG DOOR."',
                                         'A CHILD\'S FACE AT THE ROUND WINDOW, A HAND WAVING. THEN A GROWN-UP\'S, AND THE CURTAIN.',
                                         'A SMELL OF BAKING. A VOICE: "IF THAT\'S PIP, THERE ARE NO MORE HONEY CAKES."',
                                         'THE DOOR\'S HUNG WITH A WREATH OF DRIED MOONPETALS. NOBODY\'S IN.',
                                         'SINGING INSIDE, TWO VOICES, ONE OF THEM VERY BAD. NEITHER STOPS.',
                                         'A NOTE ON THE DOOR: "GONE DOWN TO THE RIVER. CANOE\'S BORROWED. SORRY, TAMSIN."'][i % 6]})
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), scene_id=WID, actors=[], scene_extra={})
print('sylvara-boughs done', 'queen foot', QUEEN_FOOT, 'walkable', len(walk))
