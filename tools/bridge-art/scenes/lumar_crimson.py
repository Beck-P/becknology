"""Crimson Reach — the big crimson island (world id "lumar-crimson").

  BVENV/bin/python tools/bridge-art/scenes/lumar_crimson.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-crimson

A whole island to walk, not a dock: your sloop ties up at a pier on the
south cove, where pirates camp on the crimson sand round a fire. A path
climbs north across a moor of red grass — past the Teeth, a ring of
standing stones, and a ruined watchtower — to the Ashen Ridge and the mouth
of the dragon's cave, the ground scorched and veined with embers, the ribs
of something huge in the ash. West, spore crystals grow in a glowing field
above the reef where the Gilded Heron broke her back; east, a wood of
wind-bent red pines hides a shrine, and a rope bridge runs out to a sea
stack with an X scratched on it.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scenekit import Kit, apply_world, shade  # noqa: E402
import assets_coast as C               # noqa: E402
import assets_isle as I                # noqa: E402
import assets_lumar as A               # noqa: E402
import assets_town as W                # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-crimson.json')
COLS, ROWS = 56, 42
k = Kit(COLS, ROWS, margin_top=2.0, margin_bottom=1.0, margin_x=0.5, seed=811)
CRYSTAL = ('#6a1a2a', '#e04060')

# ---- the island's shape -----------------------------------------------------------------------------
LOBES = [(28, 21, 20, 12), (12, 21, 7.5, 9), (44, 19, 8.5, 9.5), (29, 31, 9.5, 5.5), (29, 9.5, 17, 5.5)]
land = I.mask(COLS, ROWS, LOBES, seed=4, amp=0.16)
STACK = {(c, r) for c in range(50, 53) for r in range(26, 30) if math.hypot(c + 0.5 - 51.5, (r + 0.5 - 28.0) * 1.15) < 1.7}
land = I.flood(land, (28, 22)) | STACK


def ridge_south(x):
    """Row of the Ashen Ridge's foot; the cave mouth's stretch is straight."""
    if 27.5 <= x <= 32.5:
        return 10.0
    return 10.0 + 1.3 * I.n2(x, 0, 0.18, 9) + 0.6 * I.n2(x, 0, 0.5, 2)


RIDGE = {(c, r) for (c, r) in land if 13 <= c <= 45 and r + 0.5 < ridge_south(c + 0.5)}
walk = land - RIDGE
CAVE = (30.0, 10.0)                                   # the mouth, in the ridge's face
walk |= {(29, 9), (30, 9)}                            # the notch you step into

# the pier: down from the south shore to where your sloop ties up
PX = 28
pier_top = max(r for (c, r) in land if c == PX) + 1
PIER = [(PX, r) for r in range(pier_top, pier_top + 2)]
SHIP_R = pier_top + 2
FJ, FLEN = (36, 34), 6                     # the fishing jetty: east off the far end of the beach
FJET = I.jetty_cells(FJ, FLEN, 'e')
SL = 7.0

# paths (polylines through tile coordinates)
CAMP = (31.5, 29.5)
CROSS = (28.5, 23.5)
PATHS = [
    [(PX + 0.5, pier_top + 0.2), (28.7, 31.5), CAMP],
    [(28.7, 31.5), (28.2, 27.0), CROSS, (29.0, 18.5), (30.2, 14.0), (CAVE[0], CAVE[1] + 0.2)],
    [CROSS, (23.0, 21.5), (17.5, 21.0), (11.0, 22.5), (7.5, 24.5)],
    [CROSS, (34.5, 22.5), (41.0, 21.5), (45.5, 24.0), (48.4, 27.6)],
    [(23.0, 21.5), (22.0, 17.5)],
]


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def material(x, r):
    p = pd(x, r) + 0.18 * I.n2(x, r, 1.6, 3)
    if p < 0.42:
        return 'path'
    if p < 0.62 and I.n2(x, r, 2.2, 5) > 0:
        return 'path_edge'
    wob = 0.35 * I.n2(x, r, 0.5, 7) + 0.15 * I.n2(x, r, 1.7, 17)
    if math.hypot((x - CAVE[0]) / 7.5, (r - 11.0) / 4.2) + wob < 1.0:
        return 'ash'
    if math.hypot((x - 29.5) / 9.0, (r - 33.0) / 3.6) + wob < 1.0:
        return 'sand'
    m = I.n2(x, r, 0.35, 11) + 0.4 * I.n2(x, r, 1.4, 12)
    if math.hypot((x - 14.0) / 5.5, (r - 21.5) / 6.0) + wob < 1.0:
        return 'crystal_moss' if m > -0.25 else 'moor'
    if x > 38:
        return 'needles' if m > -0.2 else 'moor_dark'
    return 'moor' if m > -0.15 else ('moor_dark' if m > -0.5 else 'grass')


ALB = {'path': ('#6a5448', 0.3), 'path_edge': ('#5a4038', 0.3), 'ash': ('#2e2626', 0.35), 'sand': ('#8a7266', 0.25),
       'moor': ('#5a2a28', 0.3), 'moor_dark': ('#46221f', 0.3), 'grass': ('#3a3a28', 0.3),
       'crystal_moss': ('#5a2438', 0.3), 'needles': ('#3a2420', 0.3)}
I.ground(k, walk, material, ALB)
height = I.ridge(k, RIDGE, top=3.0, slope=1.15, seed=6, notches=[(28.6, 7.6, 31.4, 10.05)], foot=0.7, ground=(material, ALB))

terrain = C.coast(k, land, ground=(material, ALB), palette='crimson', grass='#4a2826', rock='#3a3034', seed=21, beachiness=-0.15,
                  beach_bias=lambda x, r: 0.9 * I.smooth(28.0, 34.0, r) * I.smooth(11.0, 6.0, abs(x - 29.5)) - 0.3 * I.smooth(14.0, 8.0, r),
                  keep_clear=[(PX - 0.4, pier_top - 0.4, PX + 1.4, SHIP_R + 0.2),
                              (PX + 0.5 - 0.45 * SL - 0.8, SHIP_R - 0.2, PX + 0.5 + 0.55 * SL + 1.8, SHIP_R + 1.9),
                              (44.0, 27.0, 50.2, 28.4), (1.0, 29.5, 10.0, 34.0),
                              (FJ[0] - 0.4, FJ[1] - 0.6, FJ[0] + FLEN + 1.4, FJ[1] + 1.6)])

# ---- the pier, your sloop's berth--------------------------------------------------------------------------
W.dock(k, PX + 0.05, PX + 0.95, pier_top - 0.4, SHIP_R + 0.0, z=0.02)
# no galleon at the pier any more: your own sloop ties up at its end (js/sloop.js draws it, MOORINGS)
for x in (PX - 0.15, PX + 1.15):
    W.silver_post(k, x, pier_top + 0.6)
I.fishing_jetty(k, FJ, FLEN, 'e', glow='#ff7040')

# ---- the camp on the cove ------------------------------------------------------------------------------------
I.campfire(k, *CAMP)
I.log_seat(k, CAMP[0] - 0.7, CAMP[0] + 0.7, CAMP[1] + 0.85)
k.solid(CAMP[0] - 0.7, CAMP[1] + 0.6, CAMP[0] + 0.7, CAMP[1] + 1.1)
k.solid(31, 28, 32, 29)                               # where the Crimson Watcher stands
I.tent(k, 34.4, 27.9, col='#7a2a26')
I.tent(k, 36.0, 30.4, w=1.2, col='#5a3a30')
I.tent(k, 24.8, 28.4, w=1.3, col='#6a2a36')
I.flagpole(k, 36.8, 32.2)
for (x, r) in ((25.4, 31.0), (26.0, 31.4), (25.7, 30.5)):
    A.barrel(k, x, r, h=0.7, radius=0.26)
k.solid(25.0, 30.1, 26.4, 31.8)
A.crate(k, 26.5, 30.1, s=0.55)
A.crate(k, 26.6, 30.15, s=0.42, z0=0.55, solid=False)
n1 = len(k.parts)
W.rowboat(k, 22.4, 24.6, 33.6)
k.solid(22.3, 33.2, 24.7, 34.0)
for (x, r) in ((33.0, 31.2), (27.2, 33.4)):
    W.lantern_post(k, x, r, energy=22)
k.point_light(33.3, 31.4, 1.9, '#ff4030', 8, radius=0.1, group='flicker')               # the pirate's red flame

# ---- the moor: the Teeth, the watchtower, the warning on the cave path ------------------------------------------------
TEETH = (35.0, 17.0)
for i in range(7):
    a = i * math.tau / 7 + 0.2
    I.standing_stone(k, TEETH[0] + math.cos(a) * 2.0, TEETH[1] + math.sin(a) * 1.6, h=k.rng.uniform(1.3, 2.0),
                     glyph=CRYSTAL[1] if i % 2 == 0 else None, lean=k.rng.uniform(-8, 8))
k.cyl(TEETH[0], TEETH[1], -0.005, 0.004, 0.5, ('#3a3236', 0.3), 'altar_slab', verts=10)
k.box(TEETH[0] - 0.4, TEETH[1] - 0.25, 0.0, TEETH[0] + 0.4, TEETH[1] + 0.25, 0.35, ('#4a4448', 0.22), 'altar_stone', bevel=0.03)
k.solid(TEETH[0] - 0.4, TEETH[1] - 0.25, TEETH[0] + 0.4, TEETH[1] + 0.25)
TOWER = (22.0, 15.5)
I.ruined_tower(k, *TOWER, rad=1.3, h=3.4)
k.solid(TOWER[0] - 1.4, TOWER[1] - 1.3, TOWER[0] + 1.4, TOWER[1] + 0.4)
W.wanted_poster(k, 31.4, 15.4)
W.lantern_post(k, 28.4, 16.2, energy=18)
for (x, r, h) in ((26.0, 25.5, 2.0), (19.5, 26.5, 1.8), (37.0, 25.0, 2.2), (24.5, 19.0, 1.6), (33.0, 21.0, 1.7)):
    I.dead_tree(k, x, r, h=h)

# ---- the Ashen Ridge and the cave -------------------------------------------------------------------------------
cx, cf = CAVE
k.box(cx - 0.95, 7.7, 0.0, cx + 0.95, 7.85, 1.7, '#050302', 'cave_dark')
k.cyl_y(cx, 7.7, 7.85, 1.7, 0.95, 0.5, '#050302', 'cave_dark', verts=16)
k.box(cx - 0.7, 7.85, 0.0, cx + 0.7, 7.9, 0.5, '#200804', 'cave_glow', emit=('#ff5020', 0.4))
k.point_light(cx, 8.3, 0.5, '#ff5020', 18, radius=0.2, group='flicker')
for i in range(9):                                    # the arch of boulders round the mouth
    a = i * math.pi / 8
    s = k.rng.uniform(0.32, 0.5)
    k.rock(cx + math.cos(a) * 1.25, 9.4 - math.sin(a) * 0.3, math.sin(a) * 1.9 + 0.1, s, s * 0.8, s, ('#3a3034', 0.22), part='cave_rock')
for (x, r) in ((27.2, 11.6), (33.4, 11.3), (26.0, 12.8), (34.5, 13.1), (24.5, 11.4), (36.0, 11.6)):
    s = k.rng.uniform(0.3, 0.55)
    k.rock(x, r, s * 0.3, s, s * 0.8, s * 0.7, ('#3a3034', 0.22), part='talus')
    k.solid(x - 0.4, r - 0.4, x + 0.4, r + 0.4)
for i in range(4):                                    # claw gouges beside the mouth
    x = cx + 1.7 + i * 0.16
    k.bar(x, 10.6, x + 0.25, 11.2, 0.0, 0.006, 0.05, '#120808', 'claw_mark')
I.lava_vein(k, [(28.4, 10.6), (27.6, 11.4), (27.9, 12.3), (26.8, 13.0)])
I.lava_vein(k, [(31.8, 10.5), (32.6, 11.0), (32.3, 12.0), (33.6, 12.7), (34.3, 14.1)])
I.lava_vein(k, [(30.6, 12.4), (31.2, 13.1)], w=0.04)
k.point_light(27.6, 11.8, 0.4, '#ff5020', 6, radius=0.2, group='flicker')
k.point_light(33.0, 12.4, 0.4, '#ff5020', 6, radius=0.2, group='flicker')
I.rib_cage(k, 24.0, 13.4, L=2.6, h=1.2)
I.bones(k, 33.6, 14.6)
I.bones(k, 26.6, 15.2, s=0.8)
k.rock(32.0, 11.0, 0.3, 0.5, 0.4, 0.45, ('#3a3034', 0.22), part='marked_rock')       # H.M.'s charcoal note
for i in range(6):
    a = i * math.pi / 3
    k.bar(32.0 + math.cos(a) * 0.22, 11.42, 32.0 + math.cos(a) * 0.32, 11.42, 0.35 + math.sin(a) * 0.15, 0.37 + math.sin(a) * 0.15, 0.04,
          '#100808', 'charcoal')
k.solid(31.5, 10.5, 32.5, 11.5)

# ---- west: the crystal field above the reef, the wreck of the Gilded Heron ---------------------------------------------
for (x, r, s) in ((13.5, 18.0, 1.0), (15.8, 17.4, 0.8), (12.2, 20.5, 1.2), (16.6, 23.4, 0.9), (14.0, 24.4, 1.1),
                  (11.0, 23.6, 0.7), (17.6, 19.4, 0.7), (9.4, 19.4, 0.9), (13.2, 26.6, 0.8)):
    W.shore_crystals(k, x, r, col=CRYSTAL, s=s, energy=10)
n0, l0 = len(k.parts), len(k.lights)
W.galleon(k, 2.0, 9.2, 31.6, beam=1.5, masts=0.85, waterline=False, hull='#2e1e14', paint='#4a1a1e', sail='#8a7a68',
          flag='#3a1a1a', wreck=True)
C.sink(k, n0, C.WZ - 0.32, l0)
I.tilt(k, n0, (5.6, 31.6, C.WZ - 0.3), roll=-16, pitch=7, lights_since=l0)
for (x, r) in ((4.0, 30.2), (7.5, 30.6), (9.6, 31.8), (2.6, 32.6)):
    k.rock(x, r, C.WZ, 0.5, 0.4, 0.4, ('#3a3034', 0.22), part='reef')
W.lantern_post(k, 9.0, 25.4, energy=16)

# ---- east: the red pines, the shrine, the bridge to the stack -------------------------------------------------------------
pines = []
for i in range(46):
    x, r = 37.5 + k.rng.random() * 13.0, 11.5 + k.rng.random() * 14.0
    if (x, r) and (int(x), int(r)) in walk and pd(x, r) > 1.1 and math.hypot(x - 44.0, (r - 16.5) * 1.2) > 2.0 \
            and all(math.hypot(x - a, r - b) > 1.1 for (a, b) in pines):
        pines.append((x, r))
        I.red_pine(k, x, r, h=k.rng.uniform(2.2, 3.2))
SHRINE = (44.0, 16.5)
k.box(SHRINE[0] - 0.5, SHRINE[1] - 0.4, 0.0, SHRINE[0] + 0.5, SHRINE[1] + 0.4, 0.5, ('#4a4448', 0.22), 'shrine_base', bevel=0.03)
k.cyl(SHRINE[0], SHRINE[1], 0.5, 0.62, 0.3, ('#2a2226', 0.2), 'shrine_bowl', verts=12)
W.shore_crystals(k, SHRINE[0], SHRINE[1], col=CRYSTAL, s=0.55, energy=12, z=0.62)
for (dx, dr) in ((-0.9, 0.0), (0.9, 0.0)):
    A.candle(k, SHRINE[0] + dx, SHRINE[1] + dr + 0.3, 0.0, energy=2.0)
k.solid(SHRINE[0] - 0.5, SHRINE[1] - 0.4, SHRINE[0] + 0.5, SHRINE[1] + 0.4)
EDGE = max(c for (c, r) in land - STACK if r == 27 and c > 40)      # the east shore, facing the stack
BR_A, BR_B = (EDGE + 0.85, 27.6), (50.3, 27.6)
I.rope_bridge(k, BR_A, BR_B)
BRIDGE_CELLS = [(c, 27) for c in range(EDGE + 1, 50)]
I.chest(k, 51.6, 27.6)
I.x_mark(k, 51.2, 28.6)
I.dead_tree(k, 52.3, 28.6, h=1.4, lean=-0.2)

# ---- scatter: tufts and pebbles over the open ground --------------------------------------------------------------------
busy = lambda x, r: pd(x, r) < 0.6
I.tufts(k, [c for c in walk if material(c[0] + 0.5, c[1] + 0.5) in ('moor', 'moor_dark', 'grass', 'crystal_moss')], '#6a3430',
        per_cell=1.1, avoid=busy, flowers=0.3)
I.pebbles(k, walk, '#4a4044', per_cell=0.25, avoid=busy)

# ---- light ---------------------------------------------------------------------------------------------------------------
k.area_light(28.0, 18.0, 16.0, '#8090c8', 2600, 40.0, rot=(math.radians(-35), 0, 0))       # moonlight
k.point_light(29.0, 24.0, 4.0, '#ffd8b0', 60, radius=1.5)

k.render(OUT, cycle='night', light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=96,
         world_light=('#3a2430', 0.75))

# ---- the world ----------------------------------------------------------------------------------------------------------
old = json.load(open(WORLD))
dock = next(i for i in old['interactions'] if i.get('label') == 'DOCK')
dock.update({'x': PX, 'y': pier_top})
spawn = [PX, pier_top - 1]
w = {'name': 'Crimson Reach', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': spawn}, 'moonColor': old.get('moonColor'), 'shipExit': old.get('shipExit', True),
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         dock,
         {'x': 30, 'y': 9, 'type': 'enter_world', 'target': 'lumar-crimson-cave', 'label': "DRAGON'S CAVE",
          'prompt': 'DESCEND INTO CAVE'},
         {'x': 29, 'y': 9, 'type': 'enter_world', 'target': 'lumar-crimson-cave', 'label': "DRAGON'S CAVE",
          'prompt': 'DESCEND INTO CAVE'},
         {'x': 31, 'y': 28, 'type': 'dialog', 'label': 'CRIMSON WATCHER', 'prompt': 'PRESS E TO TALK',
          'dialog': "YOU CAME BY THE GALLEON? THEN YOU'LL WANT THE PATH NORTH, PAST THE TEETH.\n\nDON'T GO DOWN THERE.\n\nTHE DRAGON DOESN'T MIND VISITORS, BUT IT'S NOT ALWAYS HUNGRY EITHER."},
         {'x': 31, 'y': 15, 'type': 'dialog', 'label': 'WARNING', 'prompt': 'PRESS E TO READ',
          'dialog': "WEATHERED SIGN:\n\n\"BEYOND THIS POINT - DRAGON'S CAVE.\nENTER WITH RESPECT.\""},
         {'x': 33, 'y': 31, 'type': 'dialog', 'label': "PIRATE'S LANTERN", 'prompt': 'PRESS E TO EXAMINE',
          'dialog': 'AN OLD LANTERN CARVED WITH SKULL MARKS, BURNING RED.\n\n"FOR THOSE WHO LIGHT THEIR OWN WAY HOME."'},
         {'x': 32, 'y': 12, 'type': 'dialog', 'label': 'CHARCOAL MARK', 'prompt': 'PRESS E TO READ',
          'dialog': 'CHARCOAL ON STONE:\n\n"DOWN THE STAIRS, BEAR LEFT, MIND THE LAVA.\n- H.M."'},
         {'x': 27, 'y': 33, 'type': 'dialog', 'label': 'OLD ROPE', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'FRAYED MOORING ROPE.\n\nSCORCH MARKS ALONG ONE END. SOMETHING BURNED IT.'},
         {'x': 30, 'y': 30, 'type': 'dialog', 'label': 'CAMPFIRE', 'prompt': 'PRESS E TO SIT',
          'dialog': 'DRIFTWOOD CRACKLES. SOMEONE HAS LEFT A POT OF SOMETHING THAT SMELLS LIKE RUM AND PEPPER.\n\nTHE SEA HUSHES BEHIND YOU.'},
         {'x': 34, 'y': 29, 'type': 'dialog', 'label': 'TENT', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'A HAMMOCK, A SEA CHEST, A CHART OF THE REEF WITH THE HERON\'S WRECK CIRCLED TWICE.'},
         {'x': 35, 'y': 18, 'type': 'dialog', 'label': 'THE TEETH', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'SEVEN STONES IN A RING, OLDER THAN THE PIRATES, OLDER THAN THE DRAGON.\n\nTHE RUNES ON EVERY OTHER STONE GLOW THE COLOUR OF THE CRYSTALS.'},
         {'x': 22, 'y': 17, 'type': 'dialog', 'label': 'WATCHTOWER', 'prompt': 'PRESS E TO CLIMB',
          'dialog': 'FROM THE BROKEN TOP YOU CAN SEE THE WHOLE REACH: THE CAMP, THE WRECK, THE PINES, THE STACK.\n\nAND SMOKE, RISING FROM THE RIDGE.'},
         {'x': 24, 'y': 14, 'type': 'dialog', 'label': 'GREAT RIBS', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'THE RIBS OF SOMETHING HUGE, BLEACHED WHITE.\n\nNOT THE DRAGON. SOMETHING IT ATE.'},
         {'x': 10, 'y': 27, 'type': 'dialog', 'label': 'GILDED HERON', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'A GALLEON BROKEN ON THE REEF, LISTING, HER SAILS ROTTED TO LACE.\n\nTHE NAME ON HER STERN, ONCE GILDED: THE HERON.\n\nHER HOLD STANDS OPEN TO THE SEA.'},
         {'x': 14, 'y': 21, 'type': 'dialog', 'label': 'CRYSTAL FIELD', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'SPORE CRYSTALS PUSH UP THROUGH THE MOSS, WARM TO THE TOUCH, HUMMING FAINTLY.\n\nTHEY ALL LEAN THE SAME WAY - TOWARD THE RIDGE.'},
         {'x': 44, 'y': 18, 'type': 'dialog', 'label': 'SHRINE', 'prompt': 'PRESS E TO LOOK',
          'dialog': 'A STONE BOWL IN A CLEARING OF RED PINES, A CRYSTAL GROWING FROM IT. TWO CANDLES, STILL BURNING.\n\nOFFERINGS LIE AROUND IT: A BRASS BUTTON, A FISH HOOK, A CHILD\'S DRAWING OF A DRAGON.'},
         {'x': 51, 'y': 28, 'type': 'dialog', 'label': 'SEA CHEST', 'prompt': 'PRESS E TO OPEN',
          'dialog': 'A CHEST UNDER AN X, SCRATCHED INTO THE ROCK.\n\nINSIDE: A CHART OF THE REEF, A COMPASS THAT POINTS AT THE RIDGE, AND A NOTE - "THE HERON\'S CARGO IS STILL ABOARD. - H.M."'},
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER + BRIDGE_CELLS + FJET, scene_id='lumar-crimson',
            actors=[{'sheet': 'npc-watcher', 'x': 31, 'y': 28, 'facing': 'down'}], scene_extra={'backdrop': True})
w = json.load(open(WORLD))
for r in range(ROWS):                     # only the island is ground: no walking on the sea
    for c in range(COLS):
        if (c, r) not in walk and (c, r) not in PIER and (c, r) not in BRIDGE_CELLS and (c, r) not in FJET:
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -2.0, COLS + 0.5, ROWS + 1.0]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('crimson done; pier', pier_top, 'ship row', SHIP_R, 'walkable', len(walk))
