"""Rose Cove — the big rose island (world id "lumar-rose").

  BVENV/bin/python tools/bridge-art/scenes/lumar_rose.py RENDER_DIR
  python3 tools/bridge-art/scene_post.py RENDER_DIR apps/bridge/assets/scenes/lumar-rose

The island wraps round a sheltered cove: the galleon moors inside it at the
end of a long pier. North, roseite crystals are grown on terraces like vines,
the sprouter's workshop and a glasshouse glowing pink beside them. The west
arm is a meadow of glowing roses round a windmill hung with shell chimes,
and a memorial stone at its tip; the east arm steams with hot springs by a
bathhouse, and an old crystal mine runs into the rock at its end.
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
WORLD = os.path.join(ROOT, 'apps', 'bridge', 'assets', 'worlds', 'lumar-rose.json')
COLS, ROWS = 56, 42
k = Kit(COLS, ROWS, margin_top=1.5, margin_bottom=1.0, margin_x=0.5, seed=923)
CRYSTAL = ('#6a2a4a', '#f080b0')

# ---- shape: two arms round a cove ------------------------------------------------------------------------
LOBES = [(28, 13.5, 21, 9), (13, 25, 10.5, 13), (43, 25, 10.5, 13)]   # overlapping: cove() carves the bay
land = I.mask(COLS, ROWS, LOBES, seed=7, amp=0.15)
def cove(x, r):
    """< 1 inside the cove: a long bay with a crooked head and a side inlet, its shores ragged."""
    main = math.hypot((x - 28.0 - 1.0 * I.n2(0.0, r, 0.18, 8)) / 9.6, (r - 30.5) / 12.0)
    inlet = math.hypot((x - 21.2) / 2.6, (r - 25.5) / 1.7)
    return min(main, inlet) + 0.32 * I.n2(x, r, 0.3, 4) + 0.1 * I.n2(x, r, 0.9, 6)


land = {(c, r) for (c, r) in land if cove(c + 0.5, r + 0.5) > 1}
land = I.flood(land, (28, 12))

PX = 28
pier_top = max(r for (c, r) in land if c == PX and r < 25) + 1
PIER = [(PX, r) for r in range(pier_top, pier_top + 5)]
SHIP_R = pier_top + 5
SL = 6.5

POOLS = [(42.0, 22.0, 1.5, 1.1), (46.2, 24.6, 1.2, 0.9), (41.6, 26.4, 1.1, 0.8)]


def pool_d(x, r):
    return min(((x - cx) / rx) ** 2 + ((r - cr) / ry) ** 2 for (cx, cr, rx, ry) in POOLS)


POOL_CELLS = {(c, r) for (c, r) in land if any(((c + dx - cx) / (rx + 0.3)) ** 2 + ((r + dr - cr) / (ry + 0.3)) ** 2 < 1
                                               for (cx, cr, rx, ry) in POOLS for dx in (0.1, 0.9) for dr in (0.1, 0.9))}
walk = land - POOL_CELLS


def height(x, r):
    d = pool_d(x, r)
    return -0.8 * math.sqrt(max(0.0, 1 - d)) if d < 1 else 0.0


J = (28.5, 15.0)
WORKSHOP_DOOR = (11.75, 10.6)
GLASS_DOOR = (42.0, 10.2)
PATHS = [
    [(PX + 0.5, pier_top + 0.3), J, (28.0, 12.5), (28.0, 6.0)],
    [J, (20.0, 14.5), (14.0, 12.0), WORKSHOP_DOOR],
    [(14.0, 12.0), (12.5, 17.0), (11.2, 24.2), (9.5, 28.0), (8.0, 31.5)],
    [J, (36.0, 14.5), (40.5, 12.5), GLASS_DOOR],
    [(40.5, 12.5), (43.5, 17.0), (44.0, 20.5), (44.5, 28.0), (45.0, 31.6)],
]


def pd(x, r):
    return I.path_dist(PATHS, x, r)


def material(x, r):
    if pool_d(x, r) < 1.25:
        return 'pool_bed' if pool_d(x, r) < 1.0 else 'warm'
    p = pd(x, r) + 0.15 * I.n2(x, r, 1.6, 3)
    if p < 0.45:
        return 'path'
    if p < 0.65 and I.n2(x, r, 2.0, 5) > 0:
        return 'path_edge'
    if math.hypot((x - 28.0) / 10.6, (r - 8.9) / 4.6) + 0.16 * I.n2(x, r, 0.6, 14) < 1:
        return 'terrace'
    if x > 37 and 17 < r < 30 and pool_d(x, r) < 4:
        return 'warm'
    m = I.n2(x, r, 0.4, 11) + 0.4 * I.n2(x, r, 1.5, 12)
    if x + 2.5 * I.n2(x, r, 0.15, 15) < 20 and r + 2.0 * I.n2(x, r, 0.2, 16) > 14:
        return 'meadow' if m > -0.3 else 'meadow_dark'
    return 'grass' if m > -0.2 else ('grass_dark' if m > -0.55 else 'stone')


ALB = {'path': ('#8a7a72', 0.3), 'path_edge': ('#6e6058', 0.3), 'terrace': ('#5a4a48', 0.3),
       'meadow': ('#3e5236', 0.3), 'meadow_dark': ('#34452e', 0.3), 'grass': ('#40503a', 0.3), 'grass_dark': ('#36442f', 0.3),
       'stone': ('#7a6e70', 0.25), 'warm': ('#6a5a50', 0.3), 'pool_bed': ('#4a3e3e', 0.3)}
I.ground(k, land, material, ALB, height=height)

terrain = C.coast(k, land, ground=(material, ALB), palette='rose', grass='#40503a', rock='#5a5054', seed=31, beachiness=0.1,
                  beach_bias=lambda x, r: 0.8 * I.smooth(3.0, 0.0, abs(x - 28.0) - 6.5) * I.smooth(16.0, 20.0, r),
                  keep_clear=[(PX - 0.4, pier_top - 0.4, PX + 1.4, SHIP_R + 0.2),
                              (PX + 0.5 - 0.45 * SL - 0.8, SHIP_R - 0.2, PX + 0.5 + 0.55 * SL + 1.8, SHIP_R + 1.9)])

# ---- the pier into the cove and the galleon ----------------------------------------------------------------
W.dock(k, PX + 0.05, PX + 0.95, pier_top - 0.4, SHIP_R + 0.0, z=0.02)
n0, l0 = len(k.parts), len(k.lights)
W.galleon(k, PX + 0.5 - 0.45 * SL, PX + 0.5 + 0.55 * SL, SHIP_R + 0.75, beam=1.4, masts=0.8, waterline=False,
          paint='#5a2a40', flag='#c04070')
C.sink(k, n0, C.WZ, l0)
DECK = 0.95 + C.WZ
k.poly([(PX + 0.3, SHIP_R - 0.3, 0.03), (PX + 0.7, SHIP_R - 0.3, 0.03), (PX + 0.7, SHIP_R + 0.25, DECK),
        (PX + 0.3, SHIP_R + 0.25, DECK)], (A.WOOD, 0.14), 'gangplank')
for x in (PX - 0.15, PX + 1.15):
    W.silver_post(k, x, pier_top + 0.6)

# ---- north: the terraces, the workshop, the glasshouse ---------------------------------------------------------
for cr in (7.2, 9.0, 10.8):
    I.crystal_bed(k, 19.2, 26.6, cr, col=CRYSTAL)
    I.crystal_bed(k, 29.4, 36.8, cr, col=CRYSTAL)
W.workshop(k, 9.6, 13.9, 7.4, 10.0)
W.wind_chimes(k, 14.6, 10.6)
k.cyl(15.3, 10.0, 0.0, 0.12, 0.04, '#e8d0e0', 'vial', emit=('#f080b0', 0.4), verts=8)
I.glasshouse(k, 40.0, 44.0, 7.2, 9.8)
k.cyl(44.8, 10.6, 0.0, 0.12, 0.04, '#e8d0e0', 'vial', emit=('#f080b0', 0.4), verts=8)       # the abandoned vial
for (x, r) in ((27.0, 13.6), (30.2, 16.6), (20.4, 15.4), (36.4, 15.4), (13.2, 18.6), (44.6, 18.0)):
    W.lantern_post(k, x, r, energy=16)
    k.point_light(x + 0.3, r + 0.2, 1.9, '#ff70c0', 8, radius=0.1, group='flicker')
k.solid(24, 12, 25, 13)                                     # the harvester stands at the terrace foot
for (x, r) in ((17.5, 8.0), (38.6, 12.6), (16.0, 14.0), (39.5, 7.0), (8.4, 13.0), (47.5, 11.5)):
    W.tree(k, x, r, h=k.rng.uniform(2.2, 2.8), tone='#3e5a3a')
    k.solid(x - 0.35, r - 0.35, x + 0.35, r + 0.35)

# ---- west: the meadow, the windmill, the memorial, a jetty on the cove ---------------------------------------
MILL = (10.8, 22.4)
I.windmill(k, *MILL, h=3.4)
MEMO = (8.0, 32.6)
I.standing_stone(k, MEMO[0], MEMO[1], h=1.1, tone='#8a8088', glyph='#f080b0')
for i in range(5):
    a = i * math.tau / 5
    k.sphere(MEMO[0] + math.cos(a) * 0.5, MEMO[1] + 0.25 + math.sin(a) * 0.3, 0.08, 0.05, 0.04, CRYSTAL[0], 'rose',
             emit=(CRYSTAL[1], 0.7), segs=6)
JX = max(c for (c, r) in land if r == 26 and c < 26) + 1          # the west arm's cove shore
W.dock(k, JX + 0.05, JX + 1.6, 25.6, 26.4, z=0.02)
W.rowboat(k, JX + 1.7, JX + 3.5, 26.9)
I.crab_pots(k, JX - 0.9, 25.0)
k.solid(JX - 1.0, 24.8, JX, 25.4)
meadow = [c for c in walk if c[0] < 20 and c[1] > 14]
I.glow_roses(k, meadow, col=CRYSTAL, per_cell=0.45, avoid=lambda x, r: pd(x, r) < 0.8 or math.hypot(x - MILL[0], r - MILL[1]) < 1.3)

# ---- east: the hot springs, the bathhouse, the old mine --------------------------------------------------------
for (cx, cr, rx, ry) in POOLS:
    I.pool_rim(k, cx, cr, rx + 0.1, ry + 0.1)
I.bathhouse(k, 45.4, 48.6, 18.0, 20.0)
MINE = (45.0, 31.0)
I.mine_mouth(k, MINE[0], MINE[1])
for (x, r) in ((39.0, 20.0), (48.6, 22.6), (38.8, 28.6)):
    W.shore_crystals(k, x, r, col=CRYSTAL, s=0.8, energy=10)

# ---- scatter -----------------------------------------------------------------------------------------------
busy = lambda x, r: pd(x, r) < 0.6
I.tufts(k, [c for c in walk if material(c[0] + 0.5, c[1] + 0.5) in ('meadow', 'meadow_dark', 'grass', 'grass_dark')],
        '#4a6040', per_cell=1.0, avoid=busy)
I.pebbles(k, walk, '#7a6e70', per_cell=0.2, avoid=busy)
for (x, r) in ((7.4, 17.0), (17.2, 26.6), (35.0, 9.0), (21.4, 6.2), (47.6, 28.4), (38.8, 24.4)):
    W.shore_crystals(k, x, r, col=CRYSTAL, s=k.rng.uniform(0.6, 1.0), energy=8)

# ---- light -------------------------------------------------------------------------------------------------
k.area_light(28.0, 18.0, 16.0, '#9a90c8', 2600, 40.0, rot=(math.radians(-35), 0, 0))         # moonlight
k.point_light(28.0, 14.0, 4.0, '#ffd8e0', 60, radius=1.5)

k.render(OUT, light_states={'full': {'flicker': 1.0}, 'dim': {'flicker': 0.75}}, light_samples=96,
         world_light=('#3a2a40', 0.75))

# ---- the world ------------------------------------------------------------------------------------------------
old = json.load(open(WORLD))
byl = {i.get('label'): i for i in old['interactions']}
dock = dict(byl['DOCK'])
dock.update({'x': PX, 'y': pier_top + 1})


def keep(label, x, y):
    it = dict(byl[label])
    it.update({'x': x, 'y': y})
    return it


def look(label, x, y, text, prompt='PRESS E TO LOOK'):
    return {'x': x, 'y': y, 'type': 'dialog', 'label': label, 'prompt': prompt, 'dialog': text}


C45 = math.cos(math.radians(45))
w = {'name': 'Rose Cove', 'width': COLS, 'height': ROWS, 'tileSize': 16, 'tileset': 'lumar', 'fixedCamera': True,
     'spawns': {'player': [PX, pier_top - 1]}, 'moonColor': old.get('moonColor'), 'shipExit': old.get('shipExit', True),
     'tiles': [], 'collisions': [], 'tileNames': {}, 'interactions': [
         dock,
         keep('CRYSTAL HARVESTER', 24, 12),
         keep('WORKSHOP', 12, 10),
         keep('ROSE CRYSTAL', 23, 12),
         keep('ROSE LANTERN', 27, 14),
         keep('ABANDONED VIAL', 45, 10),
         keep('WIND CHIMES', 14, 11),
         look('TERRACES', 28, 9, 'ROSEITE GROWN IN ROWS LIKE VINES, WATERED A DROP AT A TIME.\n\nTHE BEDS HUM WHEN THE TIDE COMES IN, ALL OF THEM IN THE SAME NOTE.'),
         look('GLASSHOUSE', 42, 10, 'INSIDE, ROSEITE GROWS AS TALL AS YOU ARE, PINK LIGHT FOGGING THE GLASS.\n\nA SLATE BY THE DOOR: "DO NOT SING NEAR THE BIG ONES."'),
         look('WINDMILL', 11, 24, 'A STONE MILL WITH SAILS OF PATCHED CANVAS. SHELL CHIMES HANG FROM EVERY SAIL TIP.\n\nIT GRINDS NOTHING. IT ONLY TURNS, AND RINGS.'),
         look('MEMORIAL', 8, 33, 'A SMALL STONE AMONG THE ROSES. CARVED ON IT:\n\n"E.B. - PILOT. SHE LISTENED."\n\nTHE SHIP MARK BELOW THE NAME IS YOURS.'),
         look('CRAB POTS', JX - 1, 26, 'CRAB POTS, STILL WET. ONE HOLDS A CRAB THE COLOUR OF ROSEITE.\n\nIT HUMS.'),
         look('HOT SPRING', 42, 24, 'STEAMING WATER, PINK AT THE BOTTOM WHERE THE CRYSTALS GROW.\n\nIT SMELLS OF SALT AND IRON AND, FAINTLY, ROSES.'),
         look('BATHHOUSE', 47, 20, 'AN OPEN BATHHOUSE ON POSTS, TOWELS FOLDED ON A BENCH, TWO PAPER LANTERNS.\n\nA SIGN: "HARVESTERS FIRST. VISITORS AFTER DARK."'),
         look('OLD MINE', 45, 32, 'THE ROSE MINE. THE TIMBERS ARE OLD BUT SOUND, AND A CART OF ORE STILL GLOWS ON THE RAILS.\n\nSOMEWHERE DEEP INSIDE, SOMETHING IS SINGING.'),
     ]}
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
apply_world(WORLD, k, (0, 0, COLS - 1, ROWS - 1), doors=PIER + [(JX, 26)], scene_id='lumar-rose',
            actors=[{'sheet': 'npc-harvester', 'x': 24, 'y': 12, 'facing': 'down'}],
            scene_extra={'backdrop': True, 'steam': [[cx, round(cr - 0.1, 2)] for (cx, cr, rx, ry) in POOLS]})
w = json.load(open(WORLD))
for r in range(ROWS):                     # only the island is ground: no walking on the sea or in the springs
    for c in range(COLS):
        if (c, r) not in walk and (c, r) not in PIER and (c, r) != (JX, 26):
            w['collisions'][r][c] = 1
            w['tiles'][r][c] = 1
w['view'] = [-0.5, -1.5, COLS + 0.5, ROWS + 1.0]
open(WORLD, 'w').write(json.dumps(w, indent=2) + '\n')
print('rose done; pier', pier_top, 'ship row', SHIP_R, 'jetty', JX, 'walkable', len(walk))
